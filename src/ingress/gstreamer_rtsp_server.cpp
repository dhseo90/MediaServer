// 파일 용도: GStreamer RTSP server를 띄우고 media-configure 시 SessionManager와 RTSP egress bridge를 연결한다.
#include "ingress/gstreamer_rtsp_server.h"

#include <chrono>
#include <iostream>
#include <sstream>

#include "app_config.h"
#include "ingress/analysis_query.h"
#include "ingress/gst_pipeline_builder.h"
#include "ingress/request_parser.h"
#include "ingress/rtsp_egress_session.h"
#include "ingress/rtsp_request_context.h"
#include "stdafx.h"

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsrc.h>
#include <gst/gst.h>
#include <gst/rtsp/gstrtsptransport.h>
#include <gst/rtsp-server/rtsp-server.h>
#endif

namespace ingress {

#if MEDIA_SERVER_USE_GSTREAMER
namespace {

bool ShouldUseDefaultContext() {
    const std::string& mode = app::GetAppConfig().gst_attach_context;
    return mode == "default" || mode == "1";
}

bool ShouldForceTcpTransport() {
    return app::GetAppConfig().force_rtsp_tcp;
}

struct RuntimeContext {
    explicit RuntimeContext(core::SessionManager& manager) : session_manager(manager) {}

    core::SessionManager& session_manager;
    std::atomic<std::uint64_t> next_session_id{1};
};

struct BusWatchData {
    GstElement* media_element{nullptr};
    bool loop_on_eos{false};
    guint source_id{0};
};

void DestroyRtspEgressSessionHolder(gpointer data) {
    auto* holder = static_cast<std::shared_ptr<RtspEgressSession>*>(data);
    delete holder;
}


bool AttachServerToContext(const GstRTSPServer* server, GMainContext* context, const char* label, guint* source_id) {
    // RTSP server는 GLib main context에 attach되어야 실제 socket accept와 client 처리가 시작된다.
    GError* source_error = nullptr;
    GSource* source = gst_rtsp_server_create_source(const_cast<GstRTSPServer*>(server), nullptr, &source_error);
    if (source == nullptr) {
        if (label != nullptr) {
            std::cerr << "[gst] failed to create RTSP source for context '" << label << "'";
            if (source_error != nullptr && source_error->message != nullptr) {
                std::cerr << ": " << source_error->message;
            }
            std::cerr << "\n";
        }
        if (source_error != nullptr) {
            g_error_free(source_error);
        }
        return false;
    }

    *source_id = g_source_attach(source, context);
    g_source_unref(source);
    if (*source_id == 0) {
        if (label != nullptr) {
            std::cerr << "[gst] rtsp attach failed for context: " << label << "\n";
        }
        return false;
    }
    return true;
}

void DestroyBusWatchData(gpointer data) {
    auto* watch = static_cast<BusWatchData*>(data);
    if (watch == nullptr) {
        return;
    }
    watch->source_id = 0;
    if (watch->media_element != nullptr) {
        gst_object_unref(watch->media_element);
        watch->media_element = nullptr;
    }
    delete watch;
}

gboolean OnBusMessage(GstBus* /*bus*/, GstMessage* message, gpointer user_data) {
    auto* watch = static_cast<BusWatchData*>(user_data);
    if (watch == nullptr) {
        return G_SOURCE_CONTINUE;
    }

    switch (GST_MESSAGE_TYPE(message)) {
        case GST_MESSAGE_ERROR: {
            GError* err = nullptr;
            gchar* dbg = nullptr;
            gst_message_parse_error(message, &err, &dbg);
            if (err != nullptr) {
                std::cerr << "[gst] pipeline error: " << err->message << "\n";
                g_error_free(err);
            }
            if (dbg != nullptr) {
                g_free(dbg);
            }
            break;
        }
        default:
            break;
    }

    return G_SOURCE_CONTINUE;
}

void OnMediaUnprepared(GstRTSPMedia* media, gpointer user_data) {
    auto* runtime = static_cast<RuntimeContext*>(user_data);
    gpointer sid_ptr = g_object_get_data(G_OBJECT(media), "session-id");
    gpointer tap_ptr = g_object_get_data(G_OBJECT(media), "analysis-tap-id");
    const char* sid = sid_ptr != nullptr ? static_cast<const char*>(sid_ptr) : nullptr;
    const char* tap_id = tap_ptr != nullptr ? static_cast<const char*>(tap_ptr) : nullptr;
    if (tap_id != nullptr) {
        std::cerr << "[gst] media unprepared; detach analysis tap " << tap_id << "\n";
        runtime->session_manager.DetachAnalysisTap(tap_id);
    }
    if (sid != nullptr) {
        std::cerr << "[gst] media unprepared; close session " << sid << "\n";
        // GStreamer media teardown과 내부 SessionManager 세션 생명주기를 맞춘다.
        runtime->session_manager.CloseSession(sid);
    }
}

void OnMediaConfigure(GstRTSPMediaFactory* /*factory*/, GstRTSPMedia* media, gpointer user_data) {
    // DESCRIBE/SETUP 시점마다 실제 query를 파싱해 source와 route codec을 동적으로 결정한다.
    auto* runtime = static_cast<RuntimeContext*>(user_data);
    GstRTSPContext* context = gst_rtsp_context_get_current();
    if (context == nullptr || context->uri == nullptr) {
        std::cerr << "[gst] missing RTSP context/URI\n";
        return;
    }

    const auto& config = app::GetAppConfig();
    auto request_opt = BuildRequestFromRtspUrl(context->uri, config.stream_route);
    if (!request_opt.has_value()) {
        std::cerr << "[gst] failed to parse RTSP URL\n";
        return;
    }

    media::IngressRequest request = *request_opt;
    request.client_id = "gst-session-" + std::to_string(runtime->next_session_id.fetch_add(1));
    const VideoCodec video_codec = CodecFromPath(request.path, config.stream_route);
    const media::CodecId audio_codec = AudioCodecFromPath(request.path, config.stream_route);

    std::string parse_error;
    const auto source_spec = ParseSourceSpec(request, &parse_error);
    if (!source_spec.has_value()) {
        std::cerr << "[gst] invalid request query: "
                  << (parse_error.empty() ? "expected ?url=... or ?file=..." : parse_error) << "\n";
        return;
    }

    GstElement* media_element = gst_rtsp_media_get_element(media);
    if (media_element == nullptr) {
        std::cerr << "[gst] media element is null\n";
        return;
    }

    std::string analysis_tap_id;
    if (IsAnalysisOverlayRequested(request.query)) {
        media::IngressRequest analysis_request = request;
        analysis_request.client_id = request.client_id + "-analysis";
        auto attach_result = runtime->session_manager.AttachAnalysisTap(
            analysis_request, BuildAnalysisProfileFromQuery(request.query));
        if (!attach_result.ok) {
            std::cerr << "[gst] failed to attach analysis overlay tap: " << attach_result.message << "\n";
            gst_object_unref(media_element);
            return;
        }
        analysis_tap_id = attach_result.tap_id;
    }

    auto bridge = std::make_shared<RtspEgressSession>(media_element, video_codec, audio_codec);
    if (!analysis_tap_id.empty()) {
        const auto timing_options = BuildAnalysisOverlayTimingOptionsFromQuery(request.query);
        std::weak_ptr<RtspEgressSession> weak_bridge = bridge;
        AnalysisOverlayConfig overlay_config;
        overlay_config.enabled = true;
        overlay_config.render_options = BuildOverlayRenderOptionsFromQuery(request.query);
        overlay_config.sync_tolerance_ns = static_cast<std::int64_t>(timing_options.sync_tolerance_ms) * 1000000LL;
        overlay_config.wait_timeout_ms = timing_options.wait_timeout_ms;
        overlay_config.result_provider =
            [manager = &runtime->session_manager,
             analysis_tap_id,
             weak_bridge,
             tolerance_ns = overlay_config.sync_tolerance_ns,
             wait_timeout_ms = overlay_config.wait_timeout_ms](std::int64_t frame_pts) {
                const auto bridge_lock = weak_bridge.lock();
                const std::int64_t source_pts =
                    bridge_lock != nullptr ? bridge_lock->ResolveOverlaySourcePts(frame_pts) : frame_pts;
                auto result = manager->WaitAnalysisResultNearPts(
                    analysis_tap_id, source_pts, tolerance_ns, std::chrono::milliseconds(wait_timeout_ms));
                if (result.has_value()) {
                    return result;
                }
                const auto snapshot = manager->AnalysisTapSnapshot(analysis_tap_id);
                return snapshot.has_value() ? snapshot->latest_result : std::optional<analysis::AnalysisResult>{};
            };
        bridge->SetAnalysisOverlay(std::move(overlay_config));
    }

    auto create_result = runtime->session_manager.CreateSession(
        request,
        [bridge](const media::Packet& packet) {
            bridge->HandleSample(packet);
        });
    if (!create_result.ok) {
        std::cerr << "[gst] session admission failed: " << create_result.message << "\n";
        if (!analysis_tap_id.empty()) {
            runtime->session_manager.DetachAnalysisTap(analysis_tap_id);
        }
        gst_object_unref(media_element);
        return;
    }

    std::string bridge_error;
    // RTSP factory pipeline의 appsrc caps는 source descriptor가 준비된 뒤 설정해야 한다.
    if (!bridge->Start(request.client_id, create_result.stream, &bridge_error)) {
        std::cerr << "[gst] failed to start RTSP egress bridge: " << bridge_error << "\n";
        if (!analysis_tap_id.empty()) {
            runtime->session_manager.DetachAnalysisTap(analysis_tap_id);
        }
        runtime->session_manager.CloseSession(request.client_id);
        gst_object_unref(media_element);
        return;
    }

    std::cerr << "[gst] configure media codec=" << CodecName(video_codec)
              << " audio=" << media::ToString(audio_codec)
              << " source=" << media::ToString(source_spec->kind)
              << " uri=" << source_spec->uri << "\n";
    g_object_set_data_full(G_OBJECT(media), "session-id", g_strdup(request.client_id.c_str()), g_free);
    if (!analysis_tap_id.empty()) {
        g_object_set_data_full(G_OBJECT(media), "analysis-tap-id", g_strdup(analysis_tap_id.c_str()), g_free);
    }
    g_object_set_data_full(
        G_OBJECT(media),
        "rtsp-egress-session",
        new std::shared_ptr<RtspEgressSession>(bridge),
        DestroyRtspEgressSessionHolder);

    GstBus* bus = gst_element_get_bus(media_element);
    if (bus != nullptr) {
        auto* watch = new BusWatchData{
            .media_element = GST_ELEMENT(gst_object_ref(media_element)),
            .loop_on_eos = false,
            .source_id = 0,
        };
        watch->source_id = gst_bus_add_watch(bus, OnBusMessage, watch);
        g_object_set_data_full(G_OBJECT(media), "bus-watch", watch, DestroyBusWatchData);
        gst_object_unref(bus);
    }

    g_signal_connect(media, "unprepared", G_CALLBACK(OnMediaUnprepared), user_data);

    gst_object_unref(media_element);
}

void ConfigureFactory(GstRTSPMediaFactory* factory, RuntimeContext* runtime, VideoCodec video_codec, media::CodecId audio_codec) {
    gst_rtsp_media_factory_set_shared(factory, FALSE);
    gst_rtsp_media_factory_set_eos_shutdown(factory, FALSE);
    // mount path별 factory는 같은 handler를 쓰되 launch 문자열만 codec route에 맞게 다르게 둔다.
    const std::string launch = BuildFactoryLaunch(video_codec, audio_codec);
    gst_rtsp_media_factory_set_launch(factory, launch.c_str());
    if (ShouldForceTcpTransport()) {
        std::cerr << "[gst] forcing RTSP lower transport to TCP only\n";
        gst_rtsp_media_factory_set_protocols(factory, GST_RTSP_LOWER_TRANS_TCP);
    }
    g_signal_connect(factory, "media-configure", G_CALLBACK(OnMediaConfigure), runtime);
}

}  // namespace

struct GStreamerRtspServer::Impl {
    GstRTSPServer* server{nullptr};
    GMainLoop* loop{nullptr};
    GMainContext* loop_context{nullptr};
    guint source_id{0};
    RuntimeContext runtime_context;
    std::thread loop_thread;

    explicit Impl(core::SessionManager& manager) : runtime_context(manager) {}
};
#endif

GStreamerRtspServer::GStreamerRtspServer(core::SessionManager& session_manager) : session_manager_(session_manager) {
#if MEDIA_SERVER_USE_GSTREAMER
    impl_ = std::make_unique<Impl>(session_manager);
#endif
}

GStreamerRtspServer::~GStreamerRtspServer() {
    Stop();
}

bool GStreamerRtspServer::Start(uint16_t port, std::string* error_message) {
    if (running_.load()) {
        return true;
    }

#if MEDIA_SERVER_USE_GSTREAMER
    gst_init(nullptr, nullptr);
    impl_->server = gst_rtsp_server_new();
    if (impl_->server == nullptr) {
        if (error_message != nullptr) {
            *error_message = "failed to create GstRTSPServer";
        }
        return false;
    }

    const auto& config = app::GetAppConfig();
    const std::uint16_t listen_port = port;
    const std::string& listen_address = config.rtsp_listen_address;

    std::ostringstream port_stream;
    port_stream << listen_port;
    g_object_set(impl_->server, "service", port_stream.str().c_str(), nullptr);
    g_object_set(impl_->server, "address", listen_address.c_str(), nullptr);

    GstRTSPMountPoints* mounts = gst_rtsp_server_get_mount_points(impl_->server);
    const std::string base_route = "/" + config.stream_route;
    struct RouteConfig {
        std::string path;
        VideoCodec video_codec;
        media::CodecId audio_codec;
    };
    // 한 route tree 아래에 video/audio codec 변환 조합을 각각 mount한다.
    const std::vector<RouteConfig> routes = {
        {base_route, VideoCodec::H264, media::CodecId::AAC},
        {base_route + "/h264", VideoCodec::H264, media::CodecId::AAC},
        {base_route + "/h265", VideoCodec::H265, media::CodecId::AAC},
        {base_route + "/opus", VideoCodec::H264, media::CodecId::Opus},
        {base_route + "/h265/opus", VideoCodec::H265, media::CodecId::Opus},
        {base_route + "/pcmu", VideoCodec::H264, media::CodecId::PCMU},
        {base_route + "/h265/pcmu", VideoCodec::H265, media::CodecId::PCMU},
        {base_route + "/pcma", VideoCodec::H264, media::CodecId::PCMALaw},
        {base_route + "/h265/pcma", VideoCodec::H265, media::CodecId::PCMALaw},
    };

    for (const auto& route : routes) {
        GstRTSPMediaFactory* factory = gst_rtsp_media_factory_new();
        ConfigureFactory(factory, &impl_->runtime_context, route.video_codec, route.audio_codec);
        gst_rtsp_mount_points_add_factory(mounts, route.path.c_str(), factory);
    }
    g_object_unref(mounts);

    if (!ShouldUseDefaultContext()) {
        impl_->loop_context = g_main_context_new();
        if (impl_->loop_context == nullptr) {
            if (error_message != nullptr) {
                *error_message = "failed to create custom GMainContext";
            }
            g_object_unref(impl_->server);
            impl_->server = nullptr;
            return false;
        }

        impl_->loop = g_main_loop_new(impl_->loop_context, FALSE);
        if (impl_->loop == nullptr) {
            if (error_message != nullptr) {
                *error_message = "failed to create custom GMainLoop";
            }
            g_main_context_unref(impl_->loop_context);
            impl_->loop_context = nullptr;
            g_object_unref(impl_->server);
            impl_->server = nullptr;
            return false;
        }

        if (!AttachServerToContext(impl_->server, impl_->loop_context, "custom", &impl_->source_id)) {
            std::cerr << "[gst] fallback to default context for attachment\n";
            g_main_loop_unref(impl_->loop);
            impl_->loop = nullptr;
            g_main_context_unref(impl_->loop_context);
            impl_->loop_context = nullptr;

            impl_->loop = g_main_loop_new(nullptr, FALSE);
            if (impl_->loop == nullptr) {
                if (error_message != nullptr) {
                    *error_message = "failed to create default GMainLoop";
                }
                g_object_unref(impl_->server);
                impl_->server = nullptr;
                return false;
            }
            if (!AttachServerToContext(impl_->server, nullptr, "default", &impl_->source_id)) {
                if (error_message != nullptr) {
                    *error_message = "failed to attach RTSP server to any context";
                }
                g_main_loop_unref(impl_->loop);
                impl_->loop = nullptr;
                g_object_unref(impl_->server);
                impl_->server = nullptr;
                return false;
            }
        }
    } else {
        std::cerr << "[gst] MEDIA_SERVER_GST_ATTACH_CONTEXT=default forced by environment\n";
        impl_->loop = g_main_loop_new(nullptr, FALSE);
        if (impl_->loop == nullptr) {
            if (error_message != nullptr) {
                *error_message = "failed to create default GMainLoop";
            }
            g_object_unref(impl_->server);
            impl_->server = nullptr;
            return false;
        }
        if (!AttachServerToContext(impl_->server, nullptr, "default", &impl_->source_id)) {
            if (error_message != nullptr) {
                *error_message = "failed to attach RTSP server to default context";
            }
            g_main_loop_unref(impl_->loop);
            impl_->loop = nullptr;
            g_object_unref(impl_->server);
            impl_->server = nullptr;
            return false;
        }
    }

    running_.store(true);
    if (impl_->loop_context != nullptr) {
        impl_->loop_thread = std::thread([this] {
            g_main_context_push_thread_default(impl_->loop_context);
            g_main_loop_run(impl_->loop);
            g_main_context_pop_thread_default(impl_->loop_context);
        });
    } else {
        impl_->loop_thread = std::thread([this] { g_main_loop_run(impl_->loop); });
    }
    return true;
#else
    (void)port;
    (void)session_manager_;
    if (error_message != nullptr) {
        *error_message = "built without GStreamer support. Configure with -DMEDIA_SERVER_USE_GSTREAMER=ON";
    }
    return false;
#endif
}

void GStreamerRtspServer::Stop() {
    if (!running_.exchange(false)) {
        return;
    }

#if MEDIA_SERVER_USE_GSTREAMER
    if (impl_->loop != nullptr) {
        g_main_loop_quit(impl_->loop);
    }
    if (impl_->loop_thread.joinable()) {
        impl_->loop_thread.join();
    }
    if (impl_->source_id != 0) {
        GMainContext* context_for_source = impl_->loop_context != nullptr ? impl_->loop_context : g_main_context_default();
        GSource* source = g_main_context_find_source_by_id(context_for_source, impl_->source_id);
        if (source != nullptr) {
            g_source_destroy(source);
        }
        impl_->source_id = 0;
    }
    if (impl_->loop_context != nullptr) {
        g_main_context_unref(impl_->loop_context);
        impl_->loop_context = nullptr;
    }
    if (impl_->loop != nullptr) {
        g_main_loop_unref(impl_->loop);
        impl_->loop = nullptr;
    }
    if (impl_->server != nullptr) {
        g_object_unref(impl_->server);
        impl_->server = nullptr;
    }
#endif
}

bool GStreamerRtspServer::IsRunning() const {
    return running_.load();
}

}  // namespace ingress
