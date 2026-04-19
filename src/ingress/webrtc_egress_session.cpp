#include "ingress/webrtc_egress_session.h"

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsrc.h>
#include <gst/gst.h>
#include <gst/sdp/sdp.h>
#include <gst/webrtc/webrtc.h>
#endif

#include <chrono>
#include <iostream>
#include <thread>

#include "app_config.h"
#include "core/shared_stream.h"

namespace ingress {

#if MEDIA_SERVER_USE_GSTREAMER
namespace {

std::string BuildLaunch(const media::StreamDescriptor& descriptor);

std::optional<media::StreamDescriptor> WaitForSupportedDescriptor(const std::shared_ptr<core::SharedStream>& stream) {
    if (stream == nullptr) {
        return std::nullopt;
    }

    constexpr auto kDescriptorWaitTimeout = std::chrono::seconds(3);
    constexpr auto kDescriptorPollInterval = std::chrono::milliseconds(50);
    const auto deadline = std::chrono::steady_clock::now() + kDescriptorWaitTimeout;
    while (std::chrono::steady_clock::now() < deadline) {
        const auto descriptor = stream->descriptor();
        if (descriptor.has_value() && !BuildLaunch(*descriptor).empty()) {
            return descriptor;
        }
        std::this_thread::sleep_for(kDescriptorPollInterval);
    }

    const auto descriptor = stream->descriptor();
    if (descriptor.has_value() && !BuildLaunch(*descriptor).empty()) {
        return descriptor;
    }
    return std::nullopt;
}

const media::TrackInfo* FindTrack(const media::StreamDescriptor& descriptor, media::MediaKind kind) {
    for (const auto& track : descriptor.tracks) {
        if (track.kind == kind) {
            return &track;
        }
    }
    return nullptr;
}

GstCaps* BuildCapsFromTrack(const media::TrackInfo& track) {
    if (!track.caps_string.empty()) {
        GstCaps* caps = gst_caps_from_string(track.caps_string.c_str());
        if (caps != nullptr) {
            return caps;
        }
    }

    switch (track.kind) {
        case media::MediaKind::Video:
            if (track.codec == media::CodecId::VP8) {
                return gst_caps_from_string("video/x-vp8");
            }
            if (track.codec == media::CodecId::H265) {
                return gst_caps_from_string("video/x-h265,stream-format=hvc1,alignment=au");
            }
            return gst_caps_from_string("video/x-h264,stream-format=avc,alignment=au");
        case media::MediaKind::Audio:
            switch (track.codec) {
                case media::CodecId::AAC:
                    return gst_caps_new_simple("audio/mpeg",
                                               "mpegversion",
                                               G_TYPE_INT,
                                               4,
                                               "stream-format",
                                               G_TYPE_STRING,
                                               "raw",
                                               "rate",
                                               G_TYPE_INT,
                                               track.clock_rate > 0 ? track.clock_rate : 48000,
                                               "channels",
                                               G_TYPE_INT,
                                               track.channels > 0 ? track.channels : 1,
                                               nullptr);
                case media::CodecId::Opus:
                    return gst_caps_new_simple("audio/x-opus",
                                               "channel-mapping-family",
                                               G_TYPE_INT,
                                               0,
                                               "rate",
                                               G_TYPE_INT,
                                               track.clock_rate > 0 ? track.clock_rate : 48000,
                                               "channels",
                                               G_TYPE_INT,
                                               track.channels > 0 ? track.channels : 2,
                                               nullptr);
                case media::CodecId::PCMU:
                    return gst_caps_new_simple("audio/x-mulaw",
                                               "rate",
                                               G_TYPE_INT,
                                               track.clock_rate > 0 ? track.clock_rate : 8000,
                                               "channels",
                                               G_TYPE_INT,
                                               track.channels > 0 ? track.channels : 1,
                                               nullptr);
                case media::CodecId::PCMALaw:
                    return gst_caps_new_simple("audio/x-alaw",
                                               "rate",
                                               G_TYPE_INT,
                                               track.clock_rate > 0 ? track.clock_rate : 8000,
                                               "channels",
                                               G_TYPE_INT,
                                               track.channels > 0 ? track.channels : 1,
                                               nullptr);
                case media::CodecId::Unknown:
                case media::CodecId::VP8:
                case media::CodecId::H264:
                case media::CodecId::H265:
                    return nullptr;
            }
        case media::MediaKind::Data:
            return nullptr;
    }

    return nullptr;
}

std::string BuildVideoInputChain(const media::TrackInfo& track) {
    switch (track.codec) {
        case media::CodecId::VP8:
            return "appsrc name=video_src is-live=true format=time do-timestamp=false block=false "
                   "! queue ! vp8dec ! queue ! videoconvert ! videorate ! video/x-raw,format=I420,framerate=30/1 ";
        case media::CodecId::H264:
            return "appsrc name=video_src is-live=true format=time do-timestamp=false block=false "
                   "! queue ! h264parse name=video_parse config-interval=-1 ";
        case media::CodecId::H265:
            return "appsrc name=video_src is-live=true format=time do-timestamp=false block=false "
                   "! queue ! h265parse ! avdec_h265 ! queue ! videoconvert ! videorate ! video/x-raw,format=I420,framerate=30/1 ";
        case media::CodecId::Unknown:
        case media::CodecId::AAC:
        case media::CodecId::Opus:
        case media::CodecId::PCMU:
        case media::CodecId::PCMALaw:
            return {};
    }
    return {};
}

std::string BuildAudioInputChain(const media::TrackInfo& track) {
    switch (track.codec) {
        case media::CodecId::AAC:
            return "appsrc name=audio_src is-live=true format=time do-timestamp=false block=false "
                   "! queue ! aacparse ! avdec_aac ! queue ! audioconvert ! audioresample ! audio/x-raw,rate=48000 ";
        case media::CodecId::Opus:
            return "appsrc name=audio_src is-live=true format=time do-timestamp=false block=false "
                   "! queue ! opusparse ";
        case media::CodecId::PCMU:
            return "appsrc name=audio_src is-live=true format=time do-timestamp=false block=false "
                   "! queue ! mulawdec ! queue ! audioconvert ! audioresample ! audio/x-raw,rate=48000 ";
        case media::CodecId::PCMALaw:
            return "appsrc name=audio_src is-live=true format=time do-timestamp=false block=false "
                   "! queue ! alawdec ! queue ! audioconvert ! audioresample ! audio/x-raw,rate=48000 ";
        case media::CodecId::Unknown:
        case media::CodecId::H264:
        case media::CodecId::H265:
            return {};
    }
    return {};
}

std::string BuildLaunch(const media::StreamDescriptor& descriptor) {
    const media::TrackInfo* video_track = FindTrack(descriptor, media::MediaKind::Video);
    const media::TrackInfo* audio_track = FindTrack(descriptor, media::MediaKind::Audio);
    if (video_track == nullptr || audio_track == nullptr) {
        return {};
    }

    const std::string video_input = BuildVideoInputChain(*video_track);
    const std::string audio_input = BuildAudioInputChain(*audio_track);
    if (video_input.empty() || audio_input.empty()) {
        return {};
    }

    const std::string video_output =
        video_track->codec == media::CodecId::H264
            ? "! rtph264pay name=video_pay pt=96 config-interval=1 aggregate-mode=zero-latency "
            : "! x264enc tune=zerolatency speed-preset=ultrafast bitrate=2048 key-int-max=30 bframes=0 byte-stream=true aud=true "
              "! video/x-h264,profile=constrained-baseline,stream-format=byte-stream,alignment=au "
              "! h264parse name=video_parse config-interval=-1 "
              "! rtph264pay name=video_pay pt=96 config-interval=1 aggregate-mode=zero-latency ";

    const std::string audio_output =
        audio_track->codec == media::CodecId::Opus
            ? "! rtpopuspay name=audio_pay pt=111 "
            : "! opusenc bitrate=64000 "
              "! rtpopuspay name=audio_pay pt=111 ";

    return "( "
           "webrtcbin name=webrtc bundle-policy=max-bundle "
           + video_input +
           video_output +
           "! capsfilter name=video_rtp caps=\"application/x-rtp,media=video,encoding-name=H264,payload=96,clock-rate=90000\" "
           + audio_input +
           audio_output +
           "! capsfilter name=audio_rtp caps=\"application/x-rtp,media=audio,encoding-name=OPUS,payload=111,clock-rate=48000,encoding-params=(string)2\" "
           ")";
}

bool PushToAppSrc(GstElement* element, const media::Packet& packet, GstClockTime duration = GST_CLOCK_TIME_NONE) {
    if (element == nullptr || packet.payload.empty()) {
        return false;
    }

    GstBuffer* buffer = gst_buffer_new_allocate(nullptr, packet.payload.size(), nullptr);
    if (buffer == nullptr) {
        return false;
    }

    gst_buffer_fill(buffer, 0, packet.payload.data(), packet.payload.size());
    GST_BUFFER_PTS(buffer) = packet.pts >= 0 ? static_cast<GstClockTime>(packet.pts) : GST_CLOCK_TIME_NONE;
    GST_BUFFER_DTS(buffer) = packet.dts >= 0 ? static_cast<GstClockTime>(packet.dts) : GST_CLOCK_TIME_NONE;
    GST_BUFFER_DURATION(buffer) = duration;
    if (!packet.is_key_frame) {
        GST_BUFFER_FLAG_SET(buffer, GST_BUFFER_FLAG_DELTA_UNIT);
    }

    return gst_app_src_push_buffer(GST_APP_SRC(element), buffer) == GST_FLOW_OK;
}

void TrimPendingPackets(std::deque<media::Packet>* packets) {
    if (packets == nullptr) {
        return;
    }
    constexpr std::size_t kMaxPendingPackets = 24;
    while (packets->size() > kMaxPendingPackets) {
        packets->pop_front();
    }
}

gboolean OnBusMessage(GstBus* /*bus*/, GstMessage* message, gpointer user_data) {
    auto* session = static_cast<WebRtcEgressSession*>(user_data);
    if (session == nullptr) {
        return G_SOURCE_CONTINUE;
    }

    if (GST_MESSAGE_TYPE(message) == GST_MESSAGE_ERROR) {
        GError* err = nullptr;
        gchar* dbg = nullptr;
        gst_message_parse_error(message, &err, &dbg);
        std::cerr << "[webrtc] pipeline error: " << (err != nullptr ? err->message : "unknown") << "\n";
        if (err != nullptr) {
            g_error_free(err);
        }
        if (dbg != nullptr) {
            g_free(dbg);
        }
    }

    return G_SOURCE_CONTINUE;
}

GstPadProbeReturn OnRtpProbe(GstPad* pad, GstPadProbeInfo* info, gpointer user_data) {
    auto* session = static_cast<WebRtcEgressSession*>(user_data);
    if (session == nullptr || info == nullptr || !(info->type & GST_PAD_PROBE_TYPE_BUFFER)) {
        return GST_PAD_PROBE_OK;
    }

    GstBuffer* buffer = gst_pad_probe_info_get_buffer(info);
    if (buffer == nullptr) {
        return GST_PAD_PROBE_OK;
    }

    const char* kind = "unknown";
    GstObject* parent = gst_pad_get_parent(pad);
    if (parent != nullptr) {
        const gchar* name = gst_object_get_name(parent);
        if (name != nullptr) {
            if (g_str_has_prefix(name, "video")) {
                kind = "video";
            } else if (g_str_has_prefix(name, "audio")) {
                kind = "audio";
            }
        }
        gst_object_unref(parent);
    }

    session->TraceRtpOut(kind, gst_buffer_get_size(buffer));
    return GST_PAD_PROBE_OK;
}

GstPadProbeReturn OnElementPadProbe(GstPad* pad, GstPadProbeInfo* info, gpointer user_data) {
    auto* session = static_cast<WebRtcEgressSession*>(user_data);
    if (session == nullptr || info == nullptr || !(info->type & GST_PAD_PROBE_TYPE_BUFFER)) {
        return GST_PAD_PROBE_OK;
    }

    GstBuffer* buffer = gst_pad_probe_info_get_buffer(info);
    if (buffer == nullptr) {
        return GST_PAD_PROBE_OK;
    }

    std::string label = "unknown";
    GstObject* parent = gst_pad_get_parent(pad);
    if (parent != nullptr) {
        const gchar* parent_name = gst_object_get_name(parent);
        const gchar* pad_name = gst_object_get_name(GST_OBJECT(pad));
        if (parent_name != nullptr && pad_name != nullptr) {
            label = std::string(parent_name) + ":" + pad_name;
        } else if (parent_name != nullptr) {
            label = parent_name;
        }
        gst_object_unref(parent);
    }

    session->TracePadBuffer(label, gst_buffer_get_size(buffer));
    return GST_PAD_PROBE_OK;
}

void OnLocalIceCandidate(GstElement* /*webrtcbin*/,
                         guint sdp_mline_index,
                         gchar* candidate,
                         gpointer user_data) {
    auto* session = static_cast<WebRtcEgressSession*>(user_data);
    if (session == nullptr || candidate == nullptr) {
        return;
    }
    session->HandleLocalIceCandidate(static_cast<std::uint32_t>(sdp_mline_index), candidate);
}

void OnOfferCreated(GstPromise* promise, gpointer user_data) {
    auto* session = static_cast<WebRtcEgressSession*>(user_data);
    if (session == nullptr) {
        gst_promise_unref(promise);
        return;
    }

    const GstStructure* reply = gst_promise_get_reply(promise);
    GstWebRTCSessionDescription* offer = nullptr;
    if (reply == nullptr || !gst_structure_get(reply, "offer", GST_TYPE_WEBRTC_SESSION_DESCRIPTION, &offer, nullptr)) {
        session->HandleOfferCreated("", "failed to create local WebRTC offer");
        gst_promise_unref(promise);
        return;
    }

    GstPromise* local_desc_promise = gst_promise_new();
    g_signal_emit_by_name(session->webrtcbin(), "set-local-description", offer, local_desc_promise);
    gst_promise_interrupt(local_desc_promise);
    gst_promise_unref(local_desc_promise);

    gchar* sdp_text = gst_sdp_message_as_text(offer->sdp);
    session->HandleOfferCreated(sdp_text != nullptr ? sdp_text : "", "");
    if (sdp_text != nullptr) {
        g_free(sdp_text);
    }

    gst_webrtc_session_description_free(offer);
    gst_promise_unref(promise);
}

void OnAnswerCreated(GstPromise* promise, gpointer user_data) {
    auto* session = static_cast<WebRtcEgressSession*>(user_data);
    if (session == nullptr) {
        gst_promise_unref(promise);
        return;
    }

    const GstStructure* reply = gst_promise_get_reply(promise);
    GstWebRTCSessionDescription* answer = nullptr;
    if (reply == nullptr || !gst_structure_get(reply, "answer", GST_TYPE_WEBRTC_SESSION_DESCRIPTION, &answer, nullptr)) {
        session->HandleOfferCreated("", "failed to create local WebRTC answer");
        gst_promise_unref(promise);
        return;
    }

    GstPromise* local_desc_promise = gst_promise_new();
    g_signal_emit_by_name(session->webrtcbin(), "set-local-description", answer, local_desc_promise);
    gst_promise_interrupt(local_desc_promise);
    gst_promise_unref(local_desc_promise);

    gchar* sdp_text = gst_sdp_message_as_text(answer->sdp);
    session->HandleOfferCreated(sdp_text != nullptr ? sdp_text : "", "");
    if (sdp_text != nullptr) {
        g_free(sdp_text);
    }

    gst_webrtc_session_description_free(answer);
    gst_promise_unref(promise);
}

}  // namespace
#endif

WebRtcEgressSession::WebRtcEgressSession() = default;

WebRtcEgressSession::~WebRtcEgressSession() {
    Stop();
}

bool WebRtcEgressSession::Start(const std::string& session_id,
                                const std::shared_ptr<core::SharedStream>& stream,
                                std::string* error_message) {
    session_id_ = session_id;

#if MEDIA_SERVER_USE_GSTREAMER
    gst_init(nullptr, nullptr);

    if (GstElementFactory* factory = gst_element_factory_find("nicesrc"); factory != nullptr) {
        gst_object_unref(factory);
    } else {
        if (error_message != nullptr) {
            *error_message = "missing GStreamer WebRTC transport plugin: nicesrc (install libnice / gst-plugins-bad)";
        }
        return false;
    }
    if (GstElementFactory* factory = gst_element_factory_find("nicesink"); factory != nullptr) {
        gst_object_unref(factory);
    } else {
        if (error_message != nullptr) {
            *error_message = "missing GStreamer WebRTC transport plugin: nicesink (install libnice / gst-plugins-bad)";
        }
        return false;
    }

    const auto descriptor = WaitForSupportedDescriptor(stream);
    if (!descriptor.has_value()) {
        if (error_message != nullptr) {
            *error_message = "stream descriptor not available or not yet supported";
        }
        return false;
    }

    GError* parse_error = nullptr;
    const std::string launch = BuildLaunch(*descriptor);
    if (launch.empty()) {
        if (error_message != nullptr) {
            *error_message = "unsupported source descriptor for WebRTC egress";
        }
        return false;
    }
    pipeline_ = gst_parse_launch(launch.c_str(), &parse_error);
    if (pipeline_ == nullptr) {
        if (error_message != nullptr) {
            *error_message = parse_error != nullptr ? parse_error->message : "failed to create WebRTC pipeline";
        }
        if (parse_error != nullptr) {
            g_error_free(parse_error);
        }
        return false;
    }
    if (parse_error != nullptr) {
        g_error_free(parse_error);
    }

    video_appsrc_ = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "video_src");
    audio_appsrc_ = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "audio_src");
    webrtcbin_ = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "webrtc");
    GstElement* video_pay = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "video_pay");
    GstElement* audio_pay = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "audio_pay");
    GstElement* video_rtp = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "video_rtp");
    GstElement* audio_rtp = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "audio_rtp");
    if (video_appsrc_ == nullptr || audio_appsrc_ == nullptr || webrtcbin_ == nullptr ||
        video_pay == nullptr || audio_pay == nullptr || video_rtp == nullptr || audio_rtp == nullptr) {
        if (error_message != nullptr) {
            *error_message = "missing WebRTC pipeline elements";
        }
        if (video_pay != nullptr) {
            gst_object_unref(video_pay);
        }
        if (audio_pay != nullptr) {
            gst_object_unref(audio_pay);
        }
        if (video_rtp != nullptr) {
            gst_object_unref(video_rtp);
        }
        if (audio_rtp != nullptr) {
            gst_object_unref(audio_rtp);
        }
        Stop();
        return false;
    }

    GstPad* video_pay_sink_pad = gst_element_get_static_pad(video_pay, "sink");
    GstPad* video_pay_src_pad = gst_element_get_static_pad(video_pay, "src");
    GstPad* audio_pay_sink_pad = gst_element_get_static_pad(audio_pay, "sink");
    GstPad* audio_pay_src_pad = gst_element_get_static_pad(audio_pay, "src");
    GstPad* video_src_pad = gst_element_get_static_pad(video_rtp, "src");
    GstPad* audio_src_pad = gst_element_get_static_pad(audio_rtp, "src");
    GstPad* video_sink_pad = gst_element_request_pad_simple(webrtcbin_, "sink_%u");
    GstPad* audio_sink_pad = gst_element_request_pad_simple(webrtcbin_, "sink_%u");
    bool linked = video_src_pad != nullptr && audio_src_pad != nullptr &&
                  video_sink_pad != nullptr && audio_sink_pad != nullptr &&
                  gst_pad_link(video_src_pad, video_sink_pad) == GST_PAD_LINK_OK &&
                  gst_pad_link(audio_src_pad, audio_sink_pad) == GST_PAD_LINK_OK;
    if (linked) {
        gst_pad_add_probe(video_pay_sink_pad, GST_PAD_PROBE_TYPE_BUFFER, OnElementPadProbe, this, nullptr);
        gst_pad_add_probe(video_pay_src_pad, GST_PAD_PROBE_TYPE_BUFFER, OnElementPadProbe, this, nullptr);
        gst_pad_add_probe(audio_pay_sink_pad, GST_PAD_PROBE_TYPE_BUFFER, OnElementPadProbe, this, nullptr);
        gst_pad_add_probe(audio_pay_src_pad, GST_PAD_PROBE_TYPE_BUFFER, OnElementPadProbe, this, nullptr);
        gst_pad_add_probe(video_src_pad, GST_PAD_PROBE_TYPE_BUFFER, OnRtpProbe, this, nullptr);
        gst_pad_add_probe(audio_src_pad, GST_PAD_PROBE_TYPE_BUFFER, OnRtpProbe, this, nullptr);
    }
    if (video_pay_sink_pad != nullptr) {
        gst_object_unref(video_pay_sink_pad);
    }
    if (video_pay_src_pad != nullptr) {
        gst_object_unref(video_pay_src_pad);
    }
    if (audio_pay_sink_pad != nullptr) {
        gst_object_unref(audio_pay_sink_pad);
    }
    if (audio_pay_src_pad != nullptr) {
        gst_object_unref(audio_pay_src_pad);
    }
    if (video_src_pad != nullptr) {
        gst_object_unref(video_src_pad);
    }
    if (audio_src_pad != nullptr) {
        gst_object_unref(audio_src_pad);
    }
    if (video_sink_pad != nullptr) {
        gst_object_unref(video_sink_pad);
    }
    if (audio_sink_pad != nullptr) {
        gst_object_unref(audio_sink_pad);
    }
    gst_object_unref(video_pay);
    gst_object_unref(audio_pay);
    gst_object_unref(video_rtp);
    gst_object_unref(audio_rtp);
    if (!linked) {
        if (error_message != nullptr) {
            *error_message = "failed to link RTP payloaders to webrtcbin";
        }
        Stop();
        return false;
    }

    g_object_set(video_appsrc_, "is-live", TRUE, "format", GST_FORMAT_TIME, "block", FALSE, nullptr);
    g_object_set(audio_appsrc_, "is-live", TRUE, "format", GST_FORMAT_TIME, "block", FALSE, nullptr);
    g_signal_connect(webrtcbin_, "on-ice-candidate", G_CALLBACK(OnLocalIceCandidate), this);

    if (!ConfigureAppSrcCaps(*descriptor, error_message)) {
        Stop();
        return false;
    }

    if (app::GetAppConfig().webrtc_trace) {
        std::cerr << "[webrtc-egress] start session=" << session_id_
                  << " video_track=" << video_track_id_
                  << " audio_track=" << audio_track_id_
                  << " video_codec=" << media::ToString(FindTrack(*descriptor, media::MediaKind::Video)->codec)
                  << " audio_codec=" << media::ToString(FindTrack(*descriptor, media::MediaKind::Audio)->codec)
                  << "\n";
    }

    GstBus* bus = gst_element_get_bus(pipeline_);
    if (bus != nullptr) {
        bus_watch_id_ = gst_bus_add_watch(bus, OnBusMessage, this);
        gst_object_unref(bus);
    }

    if (gst_element_set_state(pipeline_, GST_STATE_PLAYING) == GST_STATE_CHANGE_FAILURE) {
        if (error_message != nullptr) {
            *error_message = "failed to start WebRTC pipeline";
        }
        Stop();
        return false;
    }

    std::deque<media::Packet> pending;
    {
        std::lock_guard lock(pending_mu_);
        pending.swap(pending_packets_);
    }
#else
    (void)stream;
    (void)error_message;
#endif

    started_ = true;

#if MEDIA_SERVER_USE_GSTREAMER
    for (const auto& packet : pending) {
        HandleSample(packet);
    }
#endif
    return true;
}

void WebRtcEgressSession::Stop() {
    started_ = false;

#if MEDIA_SERVER_USE_GSTREAMER
    if (bus_watch_id_ != 0) {
        g_source_remove(bus_watch_id_);
        bus_watch_id_ = 0;
    }
    if (pipeline_ != nullptr) {
        gst_element_set_state(pipeline_, GST_STATE_NULL);
    }
    if (video_appsrc_ != nullptr) {
        gst_object_unref(video_appsrc_);
        video_appsrc_ = nullptr;
    }
    if (audio_appsrc_ != nullptr) {
        gst_object_unref(audio_appsrc_);
        audio_appsrc_ = nullptr;
    }
    if (webrtcbin_ != nullptr) {
        gst_object_unref(webrtcbin_);
        webrtcbin_ = nullptr;
    }
    if (pipeline_ != nullptr) {
        gst_object_unref(pipeline_);
        pipeline_ = nullptr;
    }
#endif
}

void WebRtcEgressSession::HandleSample(const media::Packet& packet) {
    if (!started_) {
        std::lock_guard lock(pending_mu_);
        if (packet.kind == media::MediaKind::Video && packet.is_key_frame) {
            pending_packets_.erase(
                std::remove_if(
                    pending_packets_.begin(),
                    pending_packets_.end(),
                    [](const media::Packet& item) { return item.kind == media::MediaKind::Video; }),
                pending_packets_.end());
        }
        pending_packets_.push_back(packet);
        TrimPendingPackets(&pending_packets_);
        return;
    }

#if MEDIA_SERVER_USE_GSTREAMER
    switch (packet.kind) {
        case media::MediaKind::Video:
            if (video_track_id_.empty() || packet.track_id == video_track_id_) {
                const bool ok = PushToAppSrc(video_appsrc_, packet, gst_util_uint64_scale_int(1, GST_SECOND, 30));
                if (app::GetAppConfig().webrtc_trace && traced_video_samples_ < 8) {
                    ++traced_video_samples_;
                    std::cerr << "[webrtc-egress] video sample session=" << session_id_
                              << " track=" << packet.track_id
                              << " codec=" << media::ToString(packet.codec)
                              << " bytes=" << packet.payload.size()
                              << " pts=" << packet.pts
                              << " dts=" << packet.dts
                              << " key=" << (packet.is_key_frame ? "yes" : "no")
                              << " push=" << (ok ? "ok" : "fail")
                              << "\n";
                }
            }
            break;
        case media::MediaKind::Audio:
            if (!audio_track_id_.empty() && packet.track_id == audio_track_id_) {
                const bool ok = PushToAppSrc(audio_appsrc_, packet);
                if (app::GetAppConfig().webrtc_trace && traced_audio_samples_ < 8) {
                    ++traced_audio_samples_;
                    std::cerr << "[webrtc-egress] audio sample session=" << session_id_
                              << " track=" << packet.track_id
                              << " codec=" << media::ToString(packet.codec)
                              << " bytes=" << packet.payload.size()
                              << " pts=" << packet.pts
                              << " dts=" << packet.dts
                              << " push=" << (ok ? "ok" : "fail")
                              << "\n";
                }
            }
            break;
        case media::MediaKind::Data:
            break;
    }
#else
    (void)packet;
#endif
}

bool WebRtcEgressSession::CreateOffer(std::string* sdp_offer, std::string* error_message) {
#if MEDIA_SERVER_USE_GSTREAMER
    if (!started_ || webrtcbin_ == nullptr) {
        if (error_message != nullptr) {
            *error_message = "WebRTC egress session not started";
        }
        return false;
    }
    {
        std::lock_guard lock(signal_mu_);
        local_offer_.reset();
        negotiation_error_.clear();
    }

    GstPromise* promise = gst_promise_new_with_change_func(OnOfferCreated, this, nullptr);
    g_signal_emit_by_name(webrtcbin_, "create-offer", nullptr, promise);

    std::unique_lock lock(signal_mu_);
    const bool ready = signal_cv_.wait_for(lock, std::chrono::seconds(5), [this] {
        return local_offer_.has_value() || !negotiation_error_.empty();
    });
    if (!ready || !local_offer_.has_value()) {
        if (error_message != nullptr) {
            *error_message = negotiation_error_.empty() ? "timed out waiting for WebRTC offer" : negotiation_error_;
        }
        return false;
    }

    if (sdp_offer != nullptr) {
        *sdp_offer = *local_offer_;
    }
    return true;
#else
    (void)sdp_offer;
    if (error_message != nullptr) {
        *error_message = "GStreamer WebRTC disabled";
    }
    return false;
#endif
}

bool WebRtcEgressSession::CreateAnswer(std::string* sdp_answer, std::string* error_message) {
#if MEDIA_SERVER_USE_GSTREAMER
    if (!started_ || webrtcbin_ == nullptr) {
        if (error_message != nullptr) {
            *error_message = "WebRTC egress session not started";
        }
        return false;
    }
    {
        std::lock_guard lock(signal_mu_);
        local_offer_.reset();
        negotiation_error_.clear();
    }

    GstPromise* promise = gst_promise_new_with_change_func(OnAnswerCreated, this, nullptr);
    g_signal_emit_by_name(webrtcbin_, "create-answer", nullptr, promise);

    std::unique_lock lock(signal_mu_);
    const bool ready = signal_cv_.wait_for(lock, std::chrono::seconds(5), [this] {
        return local_offer_.has_value() || !negotiation_error_.empty();
    });
    if (!ready || !local_offer_.has_value()) {
        if (error_message != nullptr) {
            *error_message = negotiation_error_.empty() ? "timed out waiting for WebRTC answer" : negotiation_error_;
        }
        return false;
    }

    if (sdp_answer != nullptr) {
        *sdp_answer = *local_offer_;
    }
    return true;
#else
    (void)sdp_answer;
    if (error_message != nullptr) {
        *error_message = "GStreamer WebRTC disabled";
    }
    return false;
#endif
}

bool WebRtcEgressSession::SetRemoteOffer(const std::string& sdp_offer, std::string* error_message) {
#if MEDIA_SERVER_USE_GSTREAMER
    if (!started_ || webrtcbin_ == nullptr) {
        if (error_message != nullptr) {
            *error_message = "WebRTC egress session not started";
        }
        return false;
    }
    if (sdp_offer.empty()) {
        if (error_message != nullptr) {
            *error_message = "failed to parse remote SDP offer";
        }
        return false;
    }

    GstSDPMessage* sdp = nullptr;
    if (gst_sdp_message_new(&sdp) != GST_SDP_OK) {
        if (error_message != nullptr) {
            *error_message = "failed to allocate remote SDP";
        }
        return false;
    }
    if (gst_sdp_message_parse_buffer(reinterpret_cast<const guint8*>(sdp_offer.data()),
                                     sdp_offer.size(),
                                     sdp) != GST_SDP_OK) {
        gst_sdp_message_free(sdp);
        if (error_message != nullptr) {
            *error_message = "failed to parse remote SDP offer";
        }
        return false;
    }

    GstWebRTCSessionDescription* offer =
        gst_webrtc_session_description_new(GST_WEBRTC_SDP_TYPE_OFFER, sdp);
    GstPromise* promise = gst_promise_new();
    g_signal_emit_by_name(webrtcbin_, "set-remote-description", offer, promise);
    gst_promise_interrupt(promise);
    gst_promise_unref(promise);
    gst_webrtc_session_description_free(offer);
    return true;
#else
    (void)sdp_offer;
    if (error_message != nullptr) {
        *error_message = "GStreamer WebRTC disabled";
    }
    return false;
#endif
}

bool WebRtcEgressSession::SetRemoteAnswer(const std::string& sdp_answer, std::string* error_message) {
#if MEDIA_SERVER_USE_GSTREAMER
    if (!started_ || webrtcbin_ == nullptr) {
        if (error_message != nullptr) {
            *error_message = "WebRTC egress session not started";
        }
        return false;
    }
    if (sdp_answer.empty()) {
        if (error_message != nullptr) {
            *error_message = "failed to parse remote SDP answer";
        }
        return false;
    }

    GstSDPMessage* sdp = nullptr;
    if (gst_sdp_message_new(&sdp) != GST_SDP_OK) {
        if (error_message != nullptr) {
            *error_message = "failed to allocate remote SDP";
        }
        return false;
    }
    if (gst_sdp_message_parse_buffer(reinterpret_cast<const guint8*>(sdp_answer.data()),
                                     sdp_answer.size(),
                                     sdp) != GST_SDP_OK) {
        gst_sdp_message_free(sdp);
        if (error_message != nullptr) {
            *error_message = "failed to parse remote SDP answer";
        }
        return false;
    }

    GstWebRTCSessionDescription* answer =
        gst_webrtc_session_description_new(GST_WEBRTC_SDP_TYPE_ANSWER, sdp);
    GstPromise* promise = gst_promise_new();
    g_signal_emit_by_name(webrtcbin_, "set-remote-description", answer, promise);
    gst_promise_interrupt(promise);
    gst_promise_unref(promise);
    gst_webrtc_session_description_free(answer);
    return true;
#else
    (void)sdp_answer;
    if (error_message != nullptr) {
        *error_message = "GStreamer WebRTC disabled";
    }
    return false;
#endif
}

void WebRtcEgressSession::AddRemoteIceCandidate(std::uint32_t sdp_mline_index, const std::string& candidate) {
#if MEDIA_SERVER_USE_GSTREAMER
    if (webrtcbin_ != nullptr) {
        g_signal_emit_by_name(webrtcbin_, "add-ice-candidate", sdp_mline_index, candidate.c_str());
    }
#else
    (void)sdp_mline_index;
    (void)candidate;
#endif
}

std::optional<std::string> WebRtcEgressSession::local_offer() const {
    std::lock_guard lock(signal_mu_);
    return local_offer_;
}

std::vector<WebRtcIceCandidate> WebRtcEgressSession::TakePendingLocalIceCandidates() {
    std::lock_guard lock(signal_mu_);
    auto out = std::move(pending_local_ice_candidates_);
    pending_local_ice_candidates_.clear();
    return out;
}

#if MEDIA_SERVER_USE_GSTREAMER
void WebRtcEgressSession::HandleLocalIceCandidate(std::uint32_t sdp_mline_index, const std::string& candidate) {
    std::lock_guard lock(signal_mu_);
    pending_local_ice_candidates_.push_back(WebRtcIceCandidate{sdp_mline_index, candidate});
}

void WebRtcEgressSession::HandleOfferCreated(const std::string& sdp_offer, const std::string& error_message) {
    {
        std::lock_guard lock(signal_mu_);
        if (!error_message.empty()) {
            negotiation_error_ = error_message;
            local_offer_.reset();
        } else {
            local_offer_ = sdp_offer;
            negotiation_error_.clear();
        }
    }
    signal_cv_.notify_all();
}

void WebRtcEgressSession::TraceRtpOut(const char* kind, std::size_t bytes) {
    if (!app::GetAppConfig().webrtc_trace) {
        return;
    }

    std::size_t* counter = nullptr;
    if (std::string(kind) == "video") {
        counter = &traced_video_rtp_;
    } else if (std::string(kind) == "audio") {
        counter = &traced_audio_rtp_;
    }
    if (counter == nullptr || *counter >= 8) {
        return;
    }
    ++(*counter);
    std::cerr << "[webrtc-egress] rtp out session=" << session_id_
              << " kind=" << kind
              << " bytes=" << bytes
              << "\n";
}

void WebRtcEgressSession::TracePadBuffer(const std::string& label, std::size_t bytes) {
    if (!app::GetAppConfig().webrtc_trace || traced_pad_buffers_ >= 24) {
        return;
    }
    ++traced_pad_buffers_;
    std::cerr << "[webrtc-egress] pad buffer session=" << session_id_
              << " label=" << label
              << " bytes=" << bytes
              << "\n";
}

bool WebRtcEgressSession::ConfigureAppSrcCaps(const media::StreamDescriptor& descriptor, std::string* error_message) {
    const media::TrackInfo* video_track = FindTrack(descriptor, media::MediaKind::Video);
    if (video_track == nullptr) {
        if (error_message != nullptr) {
            *error_message = "descriptor does not contain video track";
        }
        return false;
    }
    video_track_id_ = video_track->track_id;
    traced_video_samples_ = 0;
    traced_video_rtp_ = 0;
    traced_pad_buffers_ = 0;

    GstCaps* video_caps = BuildCapsFromTrack(*video_track);
    if (video_caps == nullptr) {
        if (error_message != nullptr) {
            *error_message = "failed to build video caps for WebRTC egress";
        }
        return false;
    }
    gst_app_src_set_caps(GST_APP_SRC(video_appsrc_), video_caps);
    gst_caps_unref(video_caps);

    const media::TrackInfo* audio_track = FindTrack(descriptor, media::MediaKind::Audio);
    if (audio_track == nullptr) {
        if (error_message != nullptr) {
            *error_message = "descriptor does not contain audio track";
        }
        return false;
    }
    audio_track_id_ = audio_track->track_id;
    traced_audio_samples_ = 0;
    traced_audio_rtp_ = 0;

    GstCaps* audio_caps = BuildCapsFromTrack(*audio_track);
    if (audio_caps == nullptr) {
        if (error_message != nullptr) {
            *error_message = "failed to build audio caps for WebRTC egress";
        }
        return false;
    }
    gst_app_src_set_caps(GST_APP_SRC(audio_appsrc_), audio_caps);
    gst_caps_unref(audio_caps);
    return true;
}
#endif

}  // namespace ingress
