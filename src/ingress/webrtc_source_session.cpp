#include "ingress/webrtc_source_session.h"

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsink.h>
#include <gst/gst.h>
#include <gst/sdp/sdp.h>
#include <gst/webrtc/webrtc.h>
#endif

#include <iostream>
#include <sstream>

#include "app_config.h"
namespace ingress {

#if MEDIA_SERVER_USE_GSTREAMER
namespace {

constexpr GstClockTime kWebRtcPipelineLatency = 0;

void ConfigurePipelineClockAndLatency(GstElement* element) {
    if (element == nullptr || !GST_IS_PIPELINE(element)) {
        return;
    }

    GstClock* clock = gst_system_clock_obtain();
    if (clock != nullptr) {
        gst_pipeline_use_clock(GST_PIPELINE(element), clock);
        gst_object_unref(clock);
    }
    gst_pipeline_set_latency(GST_PIPELINE(element), kWebRtcPipelineLatency);
}

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

std::string StripRtcpFeedbackLines(const std::string& sdp_text) {
    std::istringstream input(sdp_text);
    std::ostringstream output;
    std::string line;
    while (std::getline(input, line)) {
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        if (line.rfind("a=rtcp-fb:", 0) == 0) {
            continue;
        }
        output << line << "\r\n";
    }
    return output.str();
}

GstWebRTCSessionDescription* BuildSessionDescriptionWithoutRtcpFeedback(
    const GstWebRTCSessionDescription* description) {
    if (description == nullptr || description->sdp == nullptr) {
        return nullptr;
    }

    gchar* original_text = gst_sdp_message_as_text(description->sdp);
    if (original_text == nullptr) {
        return nullptr;
    }

    const std::string sanitized_text = StripRtcpFeedbackLines(original_text);
    g_free(original_text);

    GstSDPMessage* sanitized_sdp = nullptr;
    if (gst_sdp_message_new(&sanitized_sdp) != GST_SDP_OK) {
        return nullptr;
    }
    if (gst_sdp_message_parse_buffer(reinterpret_cast<const guint8*>(sanitized_text.data()),
                                     sanitized_text.size(),
                                     sanitized_sdp) != GST_SDP_OK) {
        gst_sdp_message_free(sanitized_sdp);
        return nullptr;
    }

    return gst_webrtc_session_description_new(description->type, sanitized_sdp);
}

bool SetRtcpFeedbackRetentionWindow(GObject* object) {
    if (object == nullptr) {
        return false;
    }

    GParamSpec* pspec = g_object_class_find_property(G_OBJECT_GET_CLASS(object), "rtcp-feedback-retention-window");
    if (pspec == nullptr || (pspec->flags & G_PARAM_WRITABLE) == 0) {
        return false;
    }

    g_object_set(object, "rtcp-feedback-retention-window", static_cast<guint64>(0), nullptr);
    return true;
}

guint ConfigureRtcpFeedbackRetentionForObject(GObject* object) {
    if (object == nullptr) {
        return 0;
    }

    guint configured = SetRtcpFeedbackRetentionWindow(object) ? 1 : 0;
    GParamSpec* internal_session =
        g_object_class_find_property(G_OBJECT_GET_CLASS(object), "internal-session");
    if (internal_session == nullptr || (internal_session->flags & G_PARAM_READABLE) == 0) {
        return configured;
    }

    GObject* session = nullptr;
    g_object_get(object, "internal-session", &session, nullptr);
    if (session != nullptr) {
        configured += SetRtcpFeedbackRetentionWindow(session) ? 1 : 0;
        g_object_unref(session);
    }
    return configured;
}

guint ConfigureRtcpFeedbackRetentionForElementTree(GstElement* root) {
    if (root == nullptr) {
        return 0;
    }

    guint configured = ConfigureRtcpFeedbackRetentionForObject(G_OBJECT(root));
    if (!GST_IS_BIN(root)) {
        return configured;
    }

    GstIterator* iterator = gst_bin_iterate_recurse(GST_BIN(root));
    if (iterator == nullptr) {
        return configured;
    }

    GValue item = G_VALUE_INIT;
    bool done = false;
    while (!done) {
        switch (gst_iterator_next(iterator, &item)) {
            case GST_ITERATOR_OK: {
                GObject* object = G_OBJECT(g_value_get_object(&item));
                configured += ConfigureRtcpFeedbackRetentionForObject(object);
                g_value_reset(&item);
                break;
            }
            case GST_ITERATOR_RESYNC:
                gst_iterator_resync(iterator);
                break;
            case GST_ITERATOR_ERROR:
            case GST_ITERATOR_DONE:
                done = true;
                break;
        }
    }
    g_value_unset(&item);
    gst_iterator_free(iterator);
    return configured;
}

GQuark RtcpTimestampProbeQuark() {
    return g_quark_from_static_string("media-server-rtcp-timestamp-probe");
}

GstClockTime GetPipelineRunningTime(GstElement* pipeline) {
    if (pipeline == nullptr) {
        return GST_CLOCK_TIME_NONE;
    }

    GstClock* clock = gst_element_get_clock(pipeline);
    if (clock == nullptr) {
        return GST_CLOCK_TIME_NONE;
    }

    const GstClockTime now = gst_clock_get_time(clock);
    gst_object_unref(clock);

    const GstClockTime base_time = gst_element_get_base_time(pipeline);
    if (!GST_CLOCK_TIME_IS_VALID(now) || !GST_CLOCK_TIME_IS_VALID(base_time) || now < base_time) {
        return GST_CLOCK_TIME_NONE;
    }
    return now - base_time;
}

GstPadProbeReturn OnRtcpTimestampProbe(GstPad* /*pad*/, GstPadProbeInfo* info, gpointer user_data) {
    if (info == nullptr || (info->type & GST_PAD_PROBE_TYPE_BUFFER) == 0) {
        return GST_PAD_PROBE_OK;
    }

    GstBuffer* buffer = gst_pad_probe_info_get_buffer(info);
    if (buffer == nullptr || GST_CLOCK_TIME_IS_VALID(GST_BUFFER_PTS(buffer))) {
        return GST_PAD_PROBE_OK;
    }

    const GstClockTime running_time = GetPipelineRunningTime(static_cast<GstElement*>(user_data));
    if (!GST_CLOCK_TIME_IS_VALID(running_time)) {
        return GST_PAD_PROBE_OK;
    }

    GstBuffer* writable = gst_buffer_make_writable(buffer);
    GST_BUFFER_PTS(writable) = running_time;
    GST_BUFFER_DTS(writable) = running_time;
    GST_PAD_PROBE_INFO_DATA(info) = writable;
    return GST_PAD_PROBE_OK;
}

bool PadCapsLookLikeRtcp(GstPad* pad) {
    GstCaps* caps = gst_pad_query_caps(pad, nullptr);
    if (caps == nullptr) {
        return false;
    }

    bool is_rtcp = false;
    const guint size = gst_caps_get_size(caps);
    for (guint index = 0; index < size; ++index) {
        const GstStructure* structure = gst_caps_get_structure(caps, index);
        if (structure != nullptr && g_strcmp0(gst_structure_get_name(structure), "application/x-rtcp") == 0) {
            is_rtcp = true;
            break;
        }
    }
    gst_caps_unref(caps);
    return is_rtcp;
}

guint AttachRtcpTimestampProbeForPad(GstPad* pad, GstElement* pipeline) {
    if (pad == nullptr || pipeline == nullptr || GST_PAD_DIRECTION(pad) != GST_PAD_SINK) {
        return 0;
    }

    const gchar* pad_name = GST_PAD_NAME(pad);
    const bool name_matches = pad_name != nullptr && g_strrstr(pad_name, "rtcp") != nullptr;
    if (!name_matches && !PadCapsLookLikeRtcp(pad)) {
        return 0;
    }

    const GQuark quark = RtcpTimestampProbeQuark();
    if (g_object_get_qdata(G_OBJECT(pad), quark) != nullptr) {
        return 0;
    }

    gst_pad_add_probe(pad, GST_PAD_PROBE_TYPE_BUFFER, OnRtcpTimestampProbe, pipeline, nullptr);
    g_object_set_qdata(G_OBJECT(pad), quark, GUINT_TO_POINTER(1));
    return 1;
}

guint AttachRtcpTimestampProbesForElement(GstElement* element, GstElement* pipeline) {
    if (element == nullptr || pipeline == nullptr) {
        return 0;
    }

    GstIterator* iterator = gst_element_iterate_sink_pads(element);
    if (iterator == nullptr) {
        return 0;
    }

    guint attached = 0;
    GValue item = G_VALUE_INIT;
    bool done = false;
    while (!done) {
        switch (gst_iterator_next(iterator, &item)) {
            case GST_ITERATOR_OK: {
                GstPad* pad = GST_PAD(g_value_get_object(&item));
                attached += AttachRtcpTimestampProbeForPad(pad, pipeline);
                g_value_reset(&item);
                break;
            }
            case GST_ITERATOR_RESYNC:
                gst_iterator_resync(iterator);
                break;
            case GST_ITERATOR_ERROR:
            case GST_ITERATOR_DONE:
                done = true;
                break;
        }
    }
    g_value_unset(&item);
    gst_iterator_free(iterator);
    return attached;
}

guint AttachRtcpTimestampProbesForElementTree(GstElement* root, GstElement* pipeline) {
    if (root == nullptr || pipeline == nullptr) {
        return 0;
    }

    guint attached = AttachRtcpTimestampProbesForElement(root, pipeline);
    if (!GST_IS_BIN(root)) {
        return attached;
    }

    GstIterator* iterator = gst_bin_iterate_recurse(GST_BIN(root));
    if (iterator == nullptr) {
        return attached;
    }

    GValue item = G_VALUE_INIT;
    bool done = false;
    while (!done) {
        switch (gst_iterator_next(iterator, &item)) {
            case GST_ITERATOR_OK: {
                GstElement* element = GST_ELEMENT(g_value_get_object(&item));
                attached += AttachRtcpTimestampProbesForElement(element, pipeline);
                g_value_reset(&item);
                break;
            }
            case GST_ITERATOR_RESYNC:
                gst_iterator_resync(iterator);
                break;
            case GST_ITERATOR_ERROR:
            case GST_ITERATOR_DONE:
                done = true;
                break;
        }
    }
    g_value_unset(&item);
    gst_iterator_free(iterator);
    return attached;
}

void OnDeepElementAdded(GstBin* /*bin*/, GstBin* /*sub_bin*/, GstElement* element, gpointer user_data) {
    auto* pipeline = static_cast<GstElement*>(user_data);
    ConfigureRtcpFeedbackRetentionForElementTree(element);
    AttachRtcpTimestampProbesForElementTree(element, pipeline);
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
            if (track.codec == media::CodecId::H264 && map.size >= 5) {
                std::size_t offset = 0;
                while (offset + 5 <= map.size) {
                    const std::uint32_t nal_size =
                        (static_cast<std::uint32_t>(map.data[offset]) << 24) |
                        (static_cast<std::uint32_t>(map.data[offset + 1]) << 16) |
                        (static_cast<std::uint32_t>(map.data[offset + 2]) << 8) |
                        static_cast<std::uint32_t>(map.data[offset + 3]);
                    offset += 4;
                    if (nal_size == 0 || offset + nal_size > map.size) {
                        break;
                    }
                    const unsigned char nal_type = map.data[offset] & 0x1f;
                    if (nal_type == 5 || nal_type == 7 || nal_type == 8) {
                        out.is_key_frame = true;
                        break;
                    }
                    offset += nal_size;
                }
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

    GstWebRTCSessionDescription* sanitized_answer = BuildSessionDescriptionWithoutRtcpFeedback(answer);
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
    ConfigurePipelineClockAndLatency(pipeline_);
    g_signal_connect(pipeline_, "deep-element-added", G_CALLBACK(OnDeepElementAdded), pipeline_);
    g_object_set(webrtcbin_, "bundle-policy", GST_WEBRTC_BUNDLE_POLICY_MAX_BUNDLE, nullptr);
    g_signal_connect(webrtcbin_, "on-ice-candidate", G_CALLBACK(OnLocalIceCandidate), this);
    g_signal_connect(webrtcbin_, "pad-added", G_CALLBACK(OnPadAdded), this);
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

    const guint retention_count = ConfigureRtcpFeedbackRetentionForElementTree(pipeline_);
    const guint timestamp_probes = AttachRtcpTimestampProbesForElementTree(pipeline_, pipeline_);
    if (!app::GetAppConfig().webrtc_trace || (retention_count == 0 && timestamp_probes == 0) ||
        traced_rtcp_workarounds_ >= 4) {
        return;
    }

    ++traced_rtcp_workarounds_;
    std::cerr << "[webrtc-source] rtcp-workaround session=" << session_id_
              << " source=" << source_id_
              << " retention=" << retention_count
              << " timestamp_probes=" << timestamp_probes
              << "\n";
}

void WebRtcSourceSession::HandlePadAdded(GstPad* pad) {
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
            if (app::GetAppConfig().webrtc_trace) {
                std::cerr << "[webrtc-source] ready source=" << source_id_
                          << " track=" << branch->track.track_id
                          << " codec=" << media::ToString(branch->track.codec)
                          << " caps=" << branch->track.caps_string
                          << "\n";
            }
        }

        if (published_source_ != nullptr) {
            auto packet = BuildSampleFromGst(sample, branch->track);
            published_source_->Publish(packet);
            if (app::GetAppConfig().webrtc_trace && traced_samples < 8) {
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
