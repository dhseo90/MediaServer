// 파일 용도: 브라우저/테스트 publisher의 WebRTC RTP 입력을 appsink로 받아 SharedStream 패킷으로 변환한다.
#include "ingress/webrtc_source_session.h"

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsink.h>
#include <gst/gst.h>
#include <gst/sdp/sdp.h>
#include <gst/webrtc/webrtc.h>
#endif

#include <iostream>

#include "app_config.h"
#include "ingress/webrtc_gst_utils.h"
namespace ingress {

#if MEDIA_SERVER_USE_GSTREAMER
namespace {

media::CodecId CodecFromRtpEncoding(const std::string& encoding_name) {
    if (encoding_name == "VP8") {
        return media::CodecId::VP8;
    }
    if (encoding_name == "H264") {
        return media::CodecId::H264;
    }
    if (encoding_name == "H265" || encoding_name == "HEVC") {
        return media::CodecId::H265;
    }
    if (encoding_name == "MPEG4-GENERIC") {
        return media::CodecId::AAC;
    }
    if (encoding_name == "OPUS") {
        return media::CodecId::Opus;
    }
    if (encoding_name == "PCMU") {
        return media::CodecId::PCMU;
    }
    if (encoding_name == "PCMA") {
        return media::CodecId::PCMALaw;
    }
    return media::CodecId::Unknown;
}

std::string DefaultCapsStringForTrack(const media::TrackInfo& track) {
    switch (track.codec) {
        case media::CodecId::VP8:
            return "video/x-vp8";
        case media::CodecId::H264:
            return "video/x-h264,stream-format=avc,alignment=au";
        case media::CodecId::H265:
            return "video/x-h265,stream-format=hvc1,alignment=au";
        case media::CodecId::AAC:
            return "audio/mpeg,mpegversion=4,stream-format=raw,channels=1,rate=48000";
        case media::CodecId::Opus:
            return "audio/x-opus";
        case media::CodecId::PCMU:
            return "audio/x-mulaw,rate=8000,channels=1";
        case media::CodecId::PCMALaw:
            return "audio/x-alaw,rate=8000,channels=1";
        case media::CodecId::Unknown:
            return {};
    }
    return {};
}

bool IsVideoRandomAccessNal(media::CodecId codec, const unsigned char nal_header) {
    if (codec == media::CodecId::H264) {
        const unsigned char nal_type = nal_header & 0x1f;
        return nal_type == 5;
    }
    if (codec == media::CodecId::H265) {
        const unsigned char nal_type = (nal_header >> 1) & 0x3f;
        return nal_type >= 16 && nal_type <= 21;
    }
    return false;
}

bool HasRandomAccessNalLengthPrefixed(media::CodecId codec, const unsigned char* data, std::size_t size) {
    std::size_t offset = 0;
    while (offset + 5 <= size) {
        const std::uint32_t nal_size =
            (static_cast<std::uint32_t>(data[offset]) << 24) |
            (static_cast<std::uint32_t>(data[offset + 1]) << 16) |
            (static_cast<std::uint32_t>(data[offset + 2]) << 8) |
            static_cast<std::uint32_t>(data[offset + 3]);
        offset += 4;
        if (nal_size == 0 || offset + nal_size > size) {
            break;
        }
        if (IsVideoRandomAccessNal(codec, data[offset])) {
            return true;
        }
        offset += nal_size;
    }
    return false;
}

bool HasRandomAccessNalAnnexB(media::CodecId codec, const unsigned char* data, std::size_t size) {
    for (std::size_t offset = 0; offset + 4 < size; ++offset) {
        std::size_t nal_offset = 0;
        if (data[offset] == 0 && data[offset + 1] == 0 && data[offset + 2] == 1) {
            nal_offset = offset + 3;
        } else if (offset + 4 < size && data[offset] == 0 && data[offset + 1] == 0 &&
                   data[offset + 2] == 0 && data[offset + 3] == 1) {
            nal_offset = offset + 4;
        }
        if (nal_offset > 0 && nal_offset < size && IsVideoRandomAccessNal(codec, data[nal_offset])) {
            return true;
        }
    }
    return false;
}

bool HasVideoRandomAccessNal(media::CodecId codec, const unsigned char* data, std::size_t size) {
    if (codec != media::CodecId::H264 && codec != media::CodecId::H265) {
        return false;
    }
    return HasRandomAccessNalLengthPrefixed(codec, data, size) || HasRandomAccessNalAnnexB(codec, data, size);
}

media::MediaSample BuildSampleFromGst(const GstSample* sample, const media::TrackInfo& track) {
    media::MediaSample out;
    out.kind = track.kind;
    out.codec = track.codec;
    out.track_id = track.track_id;

    GstBuffer* buffer = gst_sample_get_buffer(const_cast<GstSample*>(sample));
    if (buffer == nullptr) {
        return out;
    }

    out.pts = GST_BUFFER_PTS_IS_VALID(buffer) ? static_cast<std::int64_t>(GST_BUFFER_PTS(buffer)) : 0;
    out.dts = GST_BUFFER_DTS_IS_VALID(buffer) ? static_cast<std::int64_t>(GST_BUFFER_DTS(buffer)) : out.pts;
    out.is_key_frame = track.kind != media::MediaKind::Video || !GST_BUFFER_FLAG_IS_SET(buffer, GST_BUFFER_FLAG_DELTA_UNIT);

    GstMapInfo map;
    if (gst_buffer_map(buffer, &map, GST_MAP_READ) == TRUE) {
        out.payload.assign(map.data, map.data + map.size);
        if (track.kind == media::MediaKind::Video) {
            if (track.codec == media::CodecId::H264 || track.codec == media::CodecId::H265) {
                // parameter set만 있는 buffer는 늦게 붙은 subscriber의 시작점으로 사용할 수 없다.
                out.is_key_frame = HasVideoRandomAccessNal(track.codec, map.data, map.size);
            } else if (track.codec == media::CodecId::VP8 && map.size > 0) {
                out.is_key_frame = (map.data[0] & 0x01) == 0;
            }
        }
        gst_buffer_unmap(buffer, &map);
    }
    return out;
}

void OnLocalIceCandidate(GstElement* /*webrtcbin*/,
                         guint sdp_mline_index,
                         gchar* candidate,
                         gpointer user_data) {
    auto* session = static_cast<WebRtcSourceSession*>(user_data);
    if (session == nullptr || candidate == nullptr) {
        return;
    }
    session->HandleLocalIceCandidate(static_cast<std::uint32_t>(sdp_mline_index), candidate);
}

void OnAnswerCreated(GstPromise* promise, gpointer user_data) {
    auto* session = static_cast<WebRtcSourceSession*>(user_data);
    if (session == nullptr) {
        gst_promise_unref(promise);
        return;
    }

    const GstStructure* reply = gst_promise_get_reply(promise);
    GstWebRTCSessionDescription* answer = nullptr;
    if (reply == nullptr || !gst_structure_get(reply, "answer", GST_TYPE_WEBRTC_SESSION_DESCRIPTION, &answer, nullptr)) {
        session->HandleAnswerCreated("", "failed to create local WebRTC answer");
        gst_promise_unref(promise);
        return;
    }

    GstWebRTCSessionDescription* sanitized_answer =
        webrtc_gst::BuildSessionDescriptionWithoutRtcpFeedback(answer);
    if (sanitized_answer == nullptr) {
        session->HandleAnswerCreated("", "failed to sanitize local WebRTC answer");
        gst_webrtc_session_description_free(answer);
        gst_promise_unref(promise);
        return;
    }

    GstPromise* local_desc_promise = gst_promise_new();
    g_signal_emit_by_name(session->webrtcbin(), "set-local-description", sanitized_answer, local_desc_promise);
    gst_promise_interrupt(local_desc_promise);
    gst_promise_unref(local_desc_promise);

    gchar* sdp_text = gst_sdp_message_as_text(sanitized_answer->sdp);
    session->HandleAnswerCreated(sdp_text != nullptr ? sdp_text : "", "");
    if (sdp_text != nullptr) {
        g_free(sdp_text);
    }

    gst_webrtc_session_description_free(sanitized_answer);
    gst_webrtc_session_description_free(answer);
    gst_promise_unref(promise);
}

void OnPadAdded(GstElement* /*src*/, GstPad* pad, gpointer user_data) {
    auto* session = static_cast<WebRtcSourceSession*>(user_data);
    if (session != nullptr) {
        session->HandlePadAdded(pad);
    }
}

}  // namespace

struct WebRtcSourceSession::SinkBranch {
    media::TrackInfo track;
    GstElement* queue{nullptr};
    GstElement* depay{nullptr};
    GstElement* parser{nullptr};
    GstElement* sink{nullptr};
    bool announced_ready{false};
    std::thread sample_thread;
};
#endif

WebRtcSourceSession::WebRtcSourceSession() = default;

WebRtcSourceSession::~WebRtcSourceSession() {
    Stop();
}

bool WebRtcSourceSession::Start(const std::string& session_id, const std::string& source_id, std::string* error_message) {
    session_id_ = session_id;
    source_id_ = source_id;

    if (source_id_.empty()) {
        if (error_message != nullptr) {
            *error_message = "missing WebRTC sourceId";
        }
        return false;
    }

    published_source_ = std::make_shared<PublishedWebRtcSource>(source_id_);
    // WHIP publisher는 sourceId로 registry에 먼저 등록되어야 consumer가 source=webrtc로 찾아올 수 있다.
    if (!WebRtcSourceRegistry::Instance().Register(published_source_)) {
        if (error_message != nullptr) {
            *error_message = "WebRTC sourceId already exists: " + source_id_;
        }
        published_source_.reset();
        return false;
    }

#if MEDIA_SERVER_USE_GSTREAMER
    gst_init(nullptr, nullptr);

    if (GstElementFactory* factory = gst_element_factory_find("nicesrc"); factory != nullptr) {
        gst_object_unref(factory);
    } else {
        if (error_message != nullptr) {
            *error_message = "missing GStreamer WebRTC transport plugin: nicesrc (install libnice / gst-plugins-bad)";
        }
        WebRtcSourceRegistry::Instance().Remove(source_id_);
        published_source_.reset();
        return false;
    }
    if (GstElementFactory* factory = gst_element_factory_find("nicesink"); factory != nullptr) {
        gst_object_unref(factory);
    } else {
        if (error_message != nullptr) {
            *error_message = "missing GStreamer WebRTC transport plugin: nicesink (install libnice / gst-plugins-bad)";
        }
        WebRtcSourceRegistry::Instance().Remove(source_id_);
        published_source_.reset();
        return false;
    }

    pipeline_ = gst_pipeline_new(nullptr);
    webrtcbin_ = gst_element_factory_make("webrtcbin", "webrtc");
    if (pipeline_ == nullptr || webrtcbin_ == nullptr) {
        if (error_message != nullptr) {
            *error_message = "failed to create WebRTC source pipeline";
        }
        Stop();
        return false;
    }

    gst_bin_add(GST_BIN(pipeline_), webrtcbin_);
    webrtc_gst::ConfigurePipelineClockAndLatency(pipeline_);
    g_signal_connect(pipeline_, "deep-element-added", G_CALLBACK(webrtc_gst::OnDeepElementAdded), pipeline_);
    g_object_set(webrtcbin_, "bundle-policy", GST_WEBRTC_BUNDLE_POLICY_MAX_BUNDLE, nullptr);
    g_signal_connect(webrtcbin_, "on-ice-candidate", G_CALLBACK(OnLocalIceCandidate), this);
    g_signal_connect(webrtcbin_, "pad-added", G_CALLBACK(OnPadAdded), this);
    // macOS/Homebrew 환경에서 관찰된 RTCP/clock 이슈를 source pipeline에도 동일하게 적용한다.
    ConfigureWebRtcSessionWorkarounds();
    descriptor_.is_live = true;
    started_ = true;

    GstBus* bus = gst_element_get_bus(pipeline_);
    if (bus != nullptr) {
        gst_object_unref(bus);
    }
    bus_thread_ = std::thread([this] { BusLoop(); });

    if (gst_element_set_state(pipeline_, GST_STATE_PLAYING) == GST_STATE_CHANGE_FAILURE) {
        if (error_message != nullptr) {
            *error_message = "failed to start WebRTC source pipeline";
        }
        Stop();
        return false;
    }
#else
    (void)error_message;
#endif
    return true;
}

void WebRtcSourceSession::Stop() {
    started_ = false;

#if MEDIA_SERVER_USE_GSTREAMER
    if (pipeline_ != nullptr) {
        gst_element_set_state(pipeline_, GST_STATE_NULL);
    }
    for (auto& branch : branches_) {
        if (branch->sample_thread.joinable()) {
            branch->sample_thread.join();
        }
    }
    branches_.clear();
    if (bus_thread_.joinable()) {
        bus_thread_.join();
    }
    if (webrtcbin_ != nullptr) {
        webrtcbin_ = nullptr;
    }
    if (pipeline_ != nullptr) {
        gst_object_unref(pipeline_);
        pipeline_ = nullptr;
    }
#endif

    if (published_source_ != nullptr) {
        WebRtcSourceRegistry::Instance().Remove(source_id_);
        published_source_.reset();
    }
}

bool WebRtcSourceSession::SetRemoteOffer(const std::string& sdp_offer, std::string* error_message) {
#if MEDIA_SERVER_USE_GSTREAMER
    if (!started_ || webrtcbin_ == nullptr) {
        if (error_message != nullptr) {
            *error_message = "WebRTC source session not started";
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
    ConfigureWebRtcSessionWorkarounds();
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

bool WebRtcSourceSession::CreateAnswer(std::string* sdp_answer, std::string* error_message) {
#if MEDIA_SERVER_USE_GSTREAMER
    if (!started_ || webrtcbin_ == nullptr) {
        if (error_message != nullptr) {
            *error_message = "WebRTC source session not started";
        }
        return false;
    }

    {
        std::lock_guard lock(signal_mu_);
        local_answer_.reset();
        negotiation_error_.clear();
    }

    GstPromise* promise = gst_promise_new_with_change_func(OnAnswerCreated, this, nullptr);
    g_signal_emit_by_name(webrtcbin_, "create-answer", nullptr, promise);

    std::unique_lock lock(signal_mu_);
    const bool ready = signal_cv_.wait_for(lock, std::chrono::seconds(5), [this] {
        return local_answer_.has_value() || !negotiation_error_.empty();
    });
    if (!ready || !local_answer_.has_value()) {
        if (error_message != nullptr) {
            *error_message = negotiation_error_.empty() ? "timed out waiting for WebRTC answer" : negotiation_error_;
        }
        return false;
    }

    if (sdp_answer != nullptr) {
        *sdp_answer = *local_answer_;
    }
    ConfigureWebRtcSessionWorkarounds();
    return true;
#else
    (void)sdp_answer;
    if (error_message != nullptr) {
        *error_message = "GStreamer WebRTC disabled";
    }
    return false;
#endif
}

void WebRtcSourceSession::AddRemoteIceCandidate(std::uint32_t sdp_mline_index, const std::string& candidate) {
#if MEDIA_SERVER_USE_GSTREAMER
    if (webrtcbin_ != nullptr) {
        g_signal_emit_by_name(webrtcbin_, "add-ice-candidate", sdp_mline_index, candidate.c_str());
        ConfigureWebRtcSessionWorkarounds();
    }
#else
    (void)sdp_mline_index;
    (void)candidate;
#endif
}

std::vector<WebRtcIceCandidate> WebRtcSourceSession::TakePendingLocalIceCandidates() {
    std::lock_guard lock(signal_mu_);
    auto out = std::move(pending_local_ice_candidates_);
    pending_local_ice_candidates_.clear();
    return out;
}

const std::string& WebRtcSourceSession::source_id() const {
    return source_id_;
}

#if MEDIA_SERVER_USE_GSTREAMER
void WebRtcSourceSession::HandleLocalIceCandidate(std::uint32_t sdp_mline_index, const std::string& candidate) {
    std::lock_guard lock(signal_mu_);
    pending_local_ice_candidates_.push_back(WebRtcIceCandidate{sdp_mline_index, candidate});
}

void WebRtcSourceSession::HandleAnswerCreated(const std::string& sdp_answer, const std::string& error_message) {
    {
        std::lock_guard lock(signal_mu_);
        if (!error_message.empty()) {
            negotiation_error_ = error_message;
            local_answer_.reset();
        } else {
            local_answer_ = sdp_answer;
            negotiation_error_.clear();
        }
    }
    signal_cv_.notify_all();
}

void WebRtcSourceSession::ConfigureWebRtcSessionWorkarounds() {
    if (pipeline_ == nullptr) {
        return;
    }

    const auto stats = webrtc_gst::ApplyRtcpWorkarounds(pipeline_, pipeline_);
    if (!app::GetAppConfig().webrtc_trace ||
        (stats.retention_count == 0 && stats.timestamp_probe_count == 0) ||
        traced_rtcp_workarounds_ >= 4) {
        return;
    }

    ++traced_rtcp_workarounds_;
    std::cerr << "[webrtc-source] rtcp-workaround session=" << session_id_
              << " source=" << source_id_
              << " retention=" << stats.retention_count
              << " timestamp_probes=" << stats.timestamp_probe_count
              << "\n";
}

void WebRtcSourceSession::HandlePadAdded(GstPad* pad) {
    // publisher가 보내는 RTP pad마다 depay/parser/appsink branch를 동적으로 붙인다.
    GstCaps* caps = gst_pad_get_current_caps(pad);
    if (caps == nullptr) {
        caps = gst_pad_query_caps(pad, nullptr);
    }
    if (caps == nullptr) {
        return;
    }

    const GstStructure* structure = gst_caps_get_structure(caps, 0);
    const char* caps_name = structure != nullptr ? gst_structure_get_name(structure) : nullptr;
    if (caps_name == nullptr || std::string(caps_name) != "application/x-rtp") {
        gst_caps_unref(caps);
        return;
    }

    const char* media_name = gst_structure_get_string(structure, "media");
    const char* encoding_name = gst_structure_get_string(structure, "encoding-name");
    if (media_name == nullptr || encoding_name == nullptr) {
        gst_caps_unref(caps);
        return;
    }

    media::TrackInfo track;
    track.kind = std::string(media_name) == "audio" ? media::MediaKind::Audio : media::MediaKind::Video;
    track.codec = CodecFromRtpEncoding(encoding_name);
    track.codec_name = encoding_name;
    track.track_id = track.kind == media::MediaKind::Audio ? "audio-0" : "video-0";
    gst_structure_get_int(structure, "clock-rate", &track.clock_rate);
    gst_structure_get_int(structure, "channels", &track.channels);
    track.caps_string = DefaultCapsStringForTrack(track);

    auto branch = CreateBranch(track);
    if (branch == nullptr) {
        std::cerr << "[webrtc-source] unsupported RTP track encoding=" << encoding_name << "\n";
        gst_caps_unref(caps);
        return;
    }

    gst_bin_add(GST_BIN(pipeline_), branch->queue);
    gst_bin_add(GST_BIN(pipeline_), branch->depay);
    if (branch->parser != nullptr) {
        gst_bin_add(GST_BIN(pipeline_), branch->parser);
    }
    gst_bin_add(GST_BIN(pipeline_), branch->sink);

    bool linked = gst_element_link(branch->queue, branch->depay);
    if (linked && branch->parser != nullptr) {
        linked = gst_element_link(branch->depay, branch->parser) && gst_element_link(branch->parser, branch->sink);
    } else if (linked) {
        linked = gst_element_link(branch->depay, branch->sink);
    }

    GstPad* queue_sink_pad = gst_element_get_static_pad(branch->queue, "sink");
    if (!linked || queue_sink_pad == nullptr || gst_pad_link(pad, queue_sink_pad) != GST_PAD_LINK_OK) {
        if (queue_sink_pad != nullptr) {
            gst_object_unref(queue_sink_pad);
        }
        if (branch->sink != nullptr) {
            gst_bin_remove(GST_BIN(pipeline_), branch->sink);
        }
        if (branch->parser != nullptr) {
            gst_bin_remove(GST_BIN(pipeline_), branch->parser);
        }
        if (branch->depay != nullptr) {
            gst_bin_remove(GST_BIN(pipeline_), branch->depay);
        }
        if (branch->queue != nullptr) {
            gst_bin_remove(GST_BIN(pipeline_), branch->queue);
        }
        gst_caps_unref(caps);
        return;
    }
    gst_object_unref(queue_sink_pad);

    gst_element_sync_state_with_parent(branch->queue);
    gst_element_sync_state_with_parent(branch->depay);
    if (branch->parser != nullptr) {
        gst_element_sync_state_with_parent(branch->parser);
    }
    gst_element_sync_state_with_parent(branch->sink);

    branch->sample_thread = std::thread([this, branch_ptr = branch.get()] { SampleLoop(branch_ptr); });

    {
      std::lock_guard lock(source_mu_);
      descriptor_.tracks.push_back(branch->track);
      if (published_source_ != nullptr) {
          // consumer가 이미 대기 중일 수 있으므로 pad 발견 즉시 descriptor를 공유한다.
          published_source_->SetDescriptor(descriptor_);
      }
      branches_.push_back(std::move(branch));
    }

    gst_caps_unref(caps);
}

std::unique_ptr<WebRtcSourceSession::SinkBranch> WebRtcSourceSession::CreateBranch(const media::TrackInfo& track) {
    auto branch = std::make_unique<SinkBranch>();
    branch->track = track;
    branch->queue = gst_element_factory_make("queue", nullptr);

        switch (track.codec) {
        case media::CodecId::VP8:
            branch->depay = gst_element_factory_make("rtpvp8depay", nullptr);
            break;
        case media::CodecId::H264:
            branch->depay = gst_element_factory_make("rtph264depay", nullptr);
            branch->parser = gst_element_factory_make("h264parse", nullptr);
            break;
        case media::CodecId::H265:
            branch->depay = gst_element_factory_make("rtph265depay", nullptr);
            branch->parser = gst_element_factory_make("h265parse", nullptr);
            break;
        case media::CodecId::AAC:
            branch->depay = gst_element_factory_make("rtpmp4gdepay", nullptr);
            branch->parser = gst_element_factory_make("aacparse", nullptr);
            break;
        case media::CodecId::Opus:
            branch->depay = gst_element_factory_make("rtpopusdepay", nullptr);
            branch->parser = gst_element_factory_make("opusparse", nullptr);
            break;
        case media::CodecId::PCMU:
            branch->depay = gst_element_factory_make("rtppcmudepay", nullptr);
            break;
        case media::CodecId::PCMALaw:
            branch->depay = gst_element_factory_make("rtppcmadepay", nullptr);
            break;
        case media::CodecId::Unknown:
            return nullptr;
    }

    branch->sink = gst_element_factory_make("appsink", nullptr);
    if (branch->queue == nullptr || branch->depay == nullptr || branch->sink == nullptr ||
        ((track.codec != media::CodecId::VP8 && track.codec != media::CodecId::PCMU && track.codec != media::CodecId::PCMALaw) &&
         branch->parser == nullptr)) {
        return nullptr;
    }

    g_object_set(branch->sink, "emit-signals", FALSE, "sync", FALSE, "max-buffers", 16, "drop", TRUE, nullptr);
    return branch;
}

void WebRtcSourceSession::SampleLoop(SinkBranch* branch) {
    if (branch == nullptr || branch->sink == nullptr) {
        return;
    }

    auto* appsink = GST_APP_SINK(branch->sink);
    std::size_t traced_samples = 0;
    while (started_) {
        GstSample* sample = gst_app_sink_try_pull_sample(appsink, 200 * GST_MSECOND);
        if (sample == nullptr) {
            continue;
        }

        if (!branch->announced_ready) {
            // 첫 sample caps를 기준으로 descriptor를 보정해 downstream egress caps mismatch를 줄인다.
            GstCaps* sample_caps = gst_sample_get_caps(sample);
            if (sample_caps != nullptr) {
                gchar* caps_text = gst_caps_to_string(sample_caps);
                if (caps_text != nullptr) {
                    branch->track.caps_string = caps_text;
                    g_free(caps_text);
                }
            }
            {
                std::lock_guard lock(source_mu_);
                for (auto& track : descriptor_.tracks) {
                    if (track.track_id == branch->track.track_id) {
                        track.caps_string = branch->track.caps_string;
                        track.clock_rate = branch->track.clock_rate;
                        track.channels = branch->track.channels;
                        break;
                    }
                }
                ++ready_sample_count_;
                if (published_source_ != nullptr) {
                    published_source_->SetDescriptor(descriptor_);
                }
            }
            branch->announced_ready = true;
            const auto& config = app::GetAppConfig();
            if (config.webrtc_trace) {
                std::cerr << "[webrtc-source] ready source=" << source_id_
                          << " track=" << branch->track.track_id
                          << " codec=" << media::ToString(branch->track.codec)
                          << "\n";
            }
            if (config.webrtc_trace && config.webrtc_trace_verbose) {
                std::cerr << "[webrtc-source] ready-caps source=" << source_id_
                          << " track=" << branch->track.track_id
                          << " caps=" << branch->track.caps_string
                          << "\n";
            }
        }

        if (published_source_ != nullptr) {
            auto packet = BuildSampleFromGst(sample, branch->track);
            // PublishedWebRtcSource는 SharedStream SourceWorker처럼 패킷 fan-out의 upstream 역할을 한다.
            published_source_->Publish(packet);
            const auto& config = app::GetAppConfig();
            if (config.webrtc_trace && config.webrtc_trace_verbose && traced_samples < 8) {
                ++traced_samples;
                std::cerr << "[webrtc-source] publish source=" << source_id_
                          << " track=" << branch->track.track_id
                          << " codec=" << media::ToString(branch->track.codec)
                          << " bytes=" << packet.payload.size()
                          << " pts=" << packet.pts
                          << " dts=" << packet.dts
                          << " key=" << (packet.is_key_frame ? "yes" : "no")
                          << "\n";
            }
        }
        gst_sample_unref(sample);
    }
}

void WebRtcSourceSession::BusLoop() {
    GstBus* bus = pipeline_ != nullptr ? gst_element_get_bus(pipeline_) : nullptr;
    if (bus == nullptr) {
        return;
    }

    while (started_) {
        GstMessage* message = gst_bus_timed_pop_filtered(
            bus,
            200 * GST_MSECOND,
            static_cast<GstMessageType>(GST_MESSAGE_ERROR | GST_MESSAGE_EOS));
        if (message == nullptr) {
            continue;
        }

        gst_message_unref(message);
    }

    gst_object_unref(bus);
}
#endif

}  // namespace ingress
