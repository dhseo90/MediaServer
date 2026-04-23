// 파일 용도: SharedStream 패킷을 WebRTC RTP 송출 pipeline에 넣고 signaling offer/answer/ICE를 처리한다.
#include "ingress/webrtc_egress_session.h"

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsrc.h>
#include <gst/gst.h>
#include <gst/sdp/sdp.h>
#include <gst/webrtc/webrtc.h>
#endif

#include <algorithm>
#include <chrono>
#include <cstdlib>
#include <iostream>
#include <optional>
#include <sstream>
#include <thread>

#include "app_config.h"
#include "core/shared_stream.h"
#include "ingress/webrtc_gst_utils.h"

namespace ingress {

#if MEDIA_SERVER_USE_GSTREAMER
namespace {

std::string BuildLaunch(const media::StreamDescriptor& descriptor);

constexpr std::int64_t kWebRtcVideoFrameDurationNs = 33333333;

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
    // WebRTC H264 offer는 브라우저 호환성이 높은 720p/30fps baseline 계열로 정규화한다.
    switch (track.codec) {
        case media::CodecId::VP8:
            return "appsrc name=video_src is-live=true format=time do-timestamp=false block=false "
                   "! queue name=video_in_q ! vp8dec name=video_decoder ! queue "
                   "! videoconvert ! videoscale ! videorate ! video/x-raw,format=I420,width=1280,height=720,framerate=30/1 ";
        case media::CodecId::H264:
            return "appsrc name=video_src is-live=true format=time do-timestamp=false block=false "
                   "! queue name=video_in_q ! h264parse name=video_input_parse ! avdec_h264 name=video_decoder "
                   "! queue ! videoconvert ! videoscale ! videorate "
                   "! video/x-raw,format=I420,width=1280,height=720,framerate=30/1 ";
        case media::CodecId::H265:
            return "appsrc name=video_src is-live=true format=time do-timestamp=false block=false "
                   "! queue name=video_in_q ! h265parse name=video_input_parse ! avdec_h265 name=video_decoder "
                   "! queue ! videoconvert ! videoscale ! videorate ! video/x-raw,format=I420,width=1280,height=720,framerate=30/1 ";
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
        case media::CodecId::VP8:
        case media::CodecId::H264:
        case media::CodecId::H265:
            return {};
    }
    return {};
}

std::string BuildLaunch(const media::StreamDescriptor& descriptor) {
    const media::TrackInfo* video_track = FindTrack(descriptor, media::MediaKind::Video);
    const media::TrackInfo* audio_track = FindTrack(descriptor, media::MediaKind::Audio);
    if (video_track == nullptr) {
        return {};
    }

    const std::string video_input = BuildVideoInputChain(*video_track);
    const std::string audio_input = audio_track != nullptr ? BuildAudioInputChain(*audio_track) : std::string();
    if (video_input.empty() || (audio_track != nullptr && audio_input.empty())) {
        return {};
    }

    const std::string video_output =
        "! x264enc name=video_encoder tune=zerolatency speed-preset=ultrafast bitrate=2048 key-int-max=30 bframes=0 byte-stream=true aud=true "
        "! video/x-h264,stream-format=byte-stream,alignment=au "
        "! rtph264pay name=video_pay pt=96 config-interval=1 aggregate-mode=zero-latency ";

    const std::string audio_output =
        audio_track == nullptr
            ? std::string()
            : (audio_track->codec == media::CodecId::Opus
                   ? "! rtpopuspay name=audio_pay pt=111 "
                   : "! opusenc bitrate=64000 "
                     "! rtpopuspay name=audio_pay pt=111 ");
    const std::string audio_branch =
        audio_track == nullptr
            ? std::string()
            : audio_input + audio_output +
                  "! capsfilter name=audio_rtp caps=\"application/x-rtp,media=audio,encoding-name=OPUS,payload=111,clock-rate=48000,encoding-params=(string)2\" ";

    return "( "
           "webrtcbin name=webrtc bundle-policy=max-bundle "
           + video_input +
           video_output +
           "! capsfilter name=video_rtp caps=\"application/x-rtp,media=video,encoding-name=H264,payload=96,clock-rate=90000\" "
           + audio_branch +
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

void ApplyRtpPayloadCaps(GstElement* payloader,
                         GstElement* capsfilter,
                         int payload_type,
                         const char* caps_string) {
    if (payload_type < 0) {
        return;
    }

    if (payloader != nullptr) {
        g_object_set(payloader, "pt", payload_type, nullptr);
    }
    if (capsfilter == nullptr || caps_string == nullptr) {
        return;
    }

    GstCaps* caps = gst_caps_from_string(caps_string);
    if (caps == nullptr) {
        return;
    }
    g_object_set(capsfilter, "caps", caps, nullptr);
    gst_caps_unref(caps);
}

gboolean OnBusMessage(GstBus* /*bus*/, GstMessage* message, gpointer user_data) {
    auto* session = static_cast<WebRtcEgressSession*>(user_data);
    if (session == nullptr) {
        return G_SOURCE_CONTINUE;
    }

    if (GST_MESSAGE_TYPE(message) == GST_MESSAGE_LATENCY) {
        session->RecalculateLatency();
    } else if (GST_MESSAGE_TYPE(message) == GST_MESSAGE_ERROR) {
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

bool ConfigureSinkPadTransceiver(GstPad* pad,
                                 GstWebRTCRTPTransceiverDirection direction,
                                 GstCaps* codec_preferences,
                                 WebRtcEgressSession* session,
                                 const char* label) {
    if (pad == nullptr) {
        return false;
    }

    GstWebRTCRTPTransceiver* transceiver = nullptr;
    g_object_get(pad, "transceiver", &transceiver, nullptr);
    if (transceiver == nullptr) {
        return false;
    }

    g_object_set(transceiver, "direction", direction, nullptr);
    if (codec_preferences != nullptr) {
        g_object_set(transceiver, "codec-preferences", codec_preferences, nullptr);
    }
    if (session != nullptr) {
        session->TraceTransceiver(label != nullptr ? label : "configured-pad-transceiver", transceiver);
    }
    gst_object_unref(transceiver);
    return true;
}

void TracePadCaps(const char* label, GstPad* pad, const std::string& session_id) {
    const auto& config = app::GetAppConfig();
    if (!config.webrtc_trace || !config.webrtc_trace_verbose || label == nullptr || pad == nullptr) {
        return;
    }

    GstCaps* current_caps = gst_pad_get_current_caps(pad);
    GstCaps* query_caps = gst_pad_query_caps(pad, nullptr);
    gchar* current_caps_text = current_caps != nullptr ? gst_caps_to_string(current_caps) : nullptr;
    gchar* query_caps_text = query_caps != nullptr ? gst_caps_to_string(query_caps) : nullptr;
    std::cerr << "[webrtc-egress] pad caps session=" << session_id
              << " label=" << label
              << " current=" << (current_caps_text != nullptr ? current_caps_text : "<null>")
              << " query=" << (query_caps_text != nullptr ? query_caps_text : "<null>")
              << "\n";
    if (current_caps_text != nullptr) {
        g_free(current_caps_text);
    }
    if (query_caps_text != nullptr) {
        g_free(query_caps_text);
    }
    if (current_caps != nullptr) {
        gst_caps_unref(current_caps);
    }
    if (query_caps != nullptr) {
        gst_caps_unref(query_caps);
    }
}

std::optional<int> ExtractPrimaryPayloadType(const std::string& sdp_text, const char* media_name) {
    std::istringstream input(sdp_text);
    std::string line;
    const std::string prefix = std::string("m=") + (media_name != nullptr ? media_name : "");
    while (std::getline(input, line)) {
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        if (line.rfind(prefix, 0) != 0) {
            continue;
        }
        std::istringstream media_line(line);
        std::string token;
        media_line >> token;  // m=<media>
        media_line >> token;  // port
        media_line >> token;  // proto
        if (!(media_line >> token)) {
            return std::nullopt;
        }
        try {
            return std::stoi(token);
        } catch (...) {
            return std::nullopt;
        }
    }
    return std::nullopt;
}

std::optional<int> FindPayloadTypeForEncoding(const GstSDPMedia* media, const char* encoding_name) {
    if (media == nullptr || encoding_name == nullptr) {
        return std::nullopt;
    }

    const guint attribute_count = gst_sdp_media_attributes_len(media);
    for (guint index = 0; index < attribute_count; ++index) {
        const GstSDPAttribute* attribute = gst_sdp_media_get_attribute(media, index);
        if (attribute == nullptr || attribute->key == nullptr || attribute->value == nullptr ||
            g_ascii_strcasecmp(attribute->key, "rtpmap") != 0) {
            continue;
        }

        const std::string value = attribute->value;
        const auto space_pos = value.find(' ');
        if (space_pos == std::string::npos) {
            continue;
        }

        std::string codec_name = value.substr(space_pos + 1);
        const auto slash_pos = codec_name.find('/');
        if (slash_pos != std::string::npos) {
            codec_name = codec_name.substr(0, slash_pos);
        }
        if (g_ascii_strcasecmp(codec_name.c_str(), encoding_name) != 0) {
            continue;
        }

        try {
            return std::stoi(value.substr(0, space_pos));
        } catch (...) {
            return std::nullopt;
        }
    }

    return std::nullopt;
}

std::string FindFmtpForPayloadType(const GstSDPMedia* media, int payload_type) {
    if (media == nullptr || payload_type < 0) {
        return {};
    }

    const std::string prefix = std::to_string(payload_type) + " ";
    const guint attribute_count = gst_sdp_media_attributes_len(media);
    for (guint index = 0; index < attribute_count; ++index) {
        const GstSDPAttribute* attribute = gst_sdp_media_get_attribute(media, index);
        if (attribute == nullptr || attribute->key == nullptr || attribute->value == nullptr ||
            g_ascii_strcasecmp(attribute->key, "fmtp") != 0) {
            continue;
        }

        const std::string value = attribute->value;
        if (value.rfind(prefix, 0) == 0) {
            return value.substr(prefix.size());
        }
    }
    return {};
}

std::optional<int> FindPreferredH264PayloadType(const GstSDPMedia* media) {
    if (media == nullptr) {
        return std::nullopt;
    }

    std::optional<int> best_payload_type;
    int best_score = -1;
    const guint attribute_count = gst_sdp_media_attributes_len(media);
    for (guint index = 0; index < attribute_count; ++index) {
        const GstSDPAttribute* attribute = gst_sdp_media_get_attribute(media, index);
        if (attribute == nullptr || attribute->key == nullptr || attribute->value == nullptr ||
            g_ascii_strcasecmp(attribute->key, "rtpmap") != 0) {
            continue;
        }

        const std::string value = attribute->value;
        const auto space_pos = value.find(' ');
        if (space_pos == std::string::npos) {
            continue;
        }

        std::string codec_name = value.substr(space_pos + 1);
        const auto slash_pos = codec_name.find('/');
        if (slash_pos != std::string::npos) {
            codec_name = codec_name.substr(0, slash_pos);
        }
        if (g_ascii_strcasecmp(codec_name.c_str(), "H264") != 0) {
            continue;
        }

        int payload_type = -1;
        try {
            payload_type = std::stoi(value.substr(0, space_pos));
        } catch (...) {
            continue;
        }

        const std::string fmtp = FindFmtpForPayloadType(media, payload_type);
        int score = 0;
        if (fmtp.find("packetization-mode=1") != std::string::npos) {
            score += 4;
        }
        if (fmtp.find("profile-level-id=42e01f") != std::string::npos) {
            score += 3;
        }
        if (fmtp.find("level-asymmetry-allowed=1") != std::string::npos) {
            score += 1;
        }
        if (score > best_score) {
            best_score = score;
            best_payload_type = payload_type;
        }
    }

    return best_payload_type;
}

const char* ToString(GstWebRTCRTPTransceiverDirection direction) {
    switch (direction) {
        case GST_WEBRTC_RTP_TRANSCEIVER_DIRECTION_NONE:
            return "none";
        case GST_WEBRTC_RTP_TRANSCEIVER_DIRECTION_INACTIVE:
            return "inactive";
        case GST_WEBRTC_RTP_TRANSCEIVER_DIRECTION_SENDONLY:
            return "sendonly";
        case GST_WEBRTC_RTP_TRANSCEIVER_DIRECTION_RECVONLY:
            return "recvonly";
        case GST_WEBRTC_RTP_TRANSCEIVER_DIRECTION_SENDRECV:
            return "sendrecv";
    }
    return "unknown";
}

const char* ToString(GstWebRTCKind kind) {
    switch (kind) {
        case GST_WEBRTC_KIND_AUDIO:
            return "audio";
        case GST_WEBRTC_KIND_VIDEO:
            return "video";
        case GST_WEBRTC_KIND_UNKNOWN:
            return "unknown";
    }
    return "unknown";
}

void OnNewTransceiver(GstElement* /*webrtcbin*/, GstWebRTCRTPTransceiver* transceiver, gpointer user_data) {
    auto* session = static_cast<WebRtcEgressSession*>(user_data);
    if (session == nullptr || transceiver == nullptr) {
        return;
    }
    session->TraceTransceiver("on-new-transceiver", transceiver);
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

    GstWebRTCSessionDescription* sanitized_offer =
        webrtc_gst::BuildSessionDescriptionWithoutRtcpFeedback(offer);
    if (sanitized_offer == nullptr) {
        session->HandleOfferCreated("", "failed to sanitize local WebRTC offer");
        gst_webrtc_session_description_free(offer);
        gst_promise_unref(promise);
        return;
    }

    GstPromise* local_desc_promise = gst_promise_new();
    g_signal_emit_by_name(session->webrtcbin(), "set-local-description", sanitized_offer, local_desc_promise);
    gst_promise_interrupt(local_desc_promise);
    gst_promise_unref(local_desc_promise);

    gchar* sdp_text = gst_sdp_message_as_text(sanitized_offer->sdp);
    session->HandleOfferCreated(sdp_text != nullptr ? sdp_text : "", "");
    if (sdp_text != nullptr) {
        g_free(sdp_text);
    }

    gst_webrtc_session_description_free(sanitized_offer);
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

    GstWebRTCSessionDescription* sanitized_answer =
        webrtc_gst::BuildSessionDescriptionWithoutRtcpFeedback(answer);
    if (sanitized_answer == nullptr) {
        session->HandleOfferCreated("", "failed to sanitize local WebRTC answer");
        gst_webrtc_session_description_free(answer);
        gst_promise_unref(promise);
        return;
    }

    GstPromise* local_desc_promise = gst_promise_new();
    g_signal_emit_by_name(session->webrtcbin(), "set-local-description", sanitized_answer, local_desc_promise);
    gst_promise_interrupt(local_desc_promise);
    gst_promise_unref(local_desc_promise);

    gchar* sdp_text = gst_sdp_message_as_text(sanitized_answer->sdp);
    session->HandleOfferCreated(sdp_text != nullptr ? sdp_text : "", "");
    if (sdp_text != nullptr) {
        g_free(sdp_text);
    }

    gst_webrtc_session_description_free(sanitized_answer);
    gst_webrtc_session_description_free(answer);
    gst_promise_unref(promise);
}

}  // namespace
#endif

WebRtcEgressSession::WebRtcEgressSession() = default;

WebRtcEgressSession::~WebRtcEgressSession() {
    Stop();
}

void WebRtcEgressSession::QueuePendingPacket(const media::Packet& packet) {
    std::lock_guard lock(pending_mu_);
    if (packet.kind == media::MediaKind::Video && packet.is_key_frame) {
        // WebRTC 협상/transport link가 끝나기 전 들어온 최신 keyframe을 보관해 첫 화면을 빠르게 띄운다.
        last_video_keyframe_ = packet;
        pending_packets_.erase(
            std::remove_if(
                pending_packets_.begin(),
                pending_packets_.end(),
                [](const media::Packet& item) { return item.kind == media::MediaKind::Video; }),
            pending_packets_.end());
    }
    pending_packets_.push_back(packet);
    TrimPendingPackets(&pending_packets_);
}

bool WebRtcEgressSession::Start(const std::string& session_id,
                                const std::shared_ptr<core::SharedStream>& stream,
                                std::string* error_message) {
    session_id_ = session_id;
    media_output_ready_ = false;

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

    // SourceWorker가 descriptor를 갱신하는 타이밍과 signaling 시작 타이밍이 다르므로 지원 가능한 descriptor를 기다린다.
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
    GstElement* parsed_pipeline = gst_parse_launch(launch.c_str(), &parse_error);
    if (parsed_pipeline == nullptr) {
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

    if (GST_IS_PIPELINE(parsed_pipeline)) {
        pipeline_ = parsed_pipeline;
    } else {
        pipeline_ = gst_pipeline_new(nullptr);
        if (pipeline_ == nullptr || gst_bin_add(GST_BIN(pipeline_), parsed_pipeline) == FALSE) {
            if (error_message != nullptr) {
                *error_message = "failed to wrap WebRTC bin in a pipeline";
            }
            if (parsed_pipeline != nullptr) {
                gst_object_unref(parsed_pipeline);
            }
            Stop();
            return false;
        }
    }
    webrtc_gst::ConfigurePipelineClockAndLatency(pipeline_);

    g_signal_connect(pipeline_, "deep-element-added", G_CALLBACK(webrtc_gst::OnDeepElementAdded), pipeline_);
    video_appsrc_ = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "video_src");
    audio_appsrc_ = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "audio_src");
    webrtcbin_ = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "webrtc");
    if (video_appsrc_ == nullptr || webrtcbin_ == nullptr) {
        if (error_message != nullptr) {
            *error_message = "missing WebRTC pipeline elements";
        }
        Stop();
        return false;
    }

    g_object_set(video_appsrc_, "is-live", TRUE, "format", GST_FORMAT_TIME, "block", FALSE, nullptr);
    if (audio_appsrc_ != nullptr) {
        g_object_set(audio_appsrc_, "is-live", TRUE, "format", GST_FORMAT_TIME, "block", FALSE, nullptr);
    }
    g_signal_connect(webrtcbin_, "on-ice-candidate", G_CALLBACK(OnLocalIceCandidate), this);
    g_signal_connect(webrtcbin_, "on-new-transceiver", G_CALLBACK(OnNewTransceiver), this);
    ConfigureRtcpFeedbackRetention();

    // appsrc caps는 source descriptor 기반으로 고정하고, 이후 SDP 협상에서 payload type만 맞춘다.
    if (!ConfigureAppSrcCaps(*descriptor, error_message)) {
        Stop();
        return false;
    }

    if (app::GetAppConfig().webrtc_trace) {
        std::cerr << "[webrtc-egress] start session=" << session_id_
                  << " video_track=" << video_track_id_
                  << " audio_track=" << audio_track_id_
                  << " video_codec=" << media::ToString(FindTrack(*descriptor, media::MediaKind::Video)->codec)
                  << " audio_codec="
                  << (FindTrack(*descriptor, media::MediaKind::Audio) != nullptr
                          ? media::ToString(FindTrack(*descriptor, media::MediaKind::Audio)->codec)
                          : "none")
                  << "\n";
    }
    transport_pads_linked_ = false;
    remote_video_mline_index_ = -1;
    remote_audio_mline_index_ = -1;

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

#else
    (void)stream;
    (void)error_message;
#endif

    started_ = true;
    return true;
}

void WebRtcEgressSession::Stop() {
    started_ = false;
    media_output_ready_ = false;

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
        QueuePendingPacket(packet);
        return;
    }

#if MEDIA_SERVER_USE_GSTREAMER
    if (!media_output_ready_) {
        // SDP offer/answer와 RTP transport pad link가 끝나기 전에는 appsrc로 바로 밀지 않는다.
        QueuePendingPacket(packet);
        return;
    }
#endif

    if (packet.kind == media::MediaKind::Video && packet.is_key_frame) {
        std::lock_guard lock(pending_mu_);
        last_video_keyframe_ = packet;
    }

#if MEDIA_SERVER_USE_GSTREAMER
    switch (packet.kind) {
        case media::MediaKind::Video:
            if (video_track_id_.empty() || packet.track_id == video_track_id_) {
                const auto normalized = NormalizeTimestamps(packet);
                const bool ok = PushToAppSrc(video_appsrc_,
                                             normalized,
                                             static_cast<GstClockTime>(kWebRtcVideoFrameDurationNs));
                const auto& config = app::GetAppConfig();
                if (config.webrtc_trace && config.webrtc_trace_verbose && traced_video_samples_ < 8) {
                    ++traced_video_samples_;
                    std::cerr << "[webrtc-egress] video sample session=" << session_id_
                              << " track=" << normalized.track_id
                              << " codec=" << media::ToString(normalized.codec)
                              << " bytes=" << normalized.payload.size()
                              << " pts=" << normalized.pts
                              << " dts=" << normalized.dts
                              << " src_pts=" << packet.pts
                              << " src_dts=" << packet.dts
                              << " key=" << (normalized.is_key_frame ? "yes" : "no")
                              << " push=" << (ok ? "ok" : "fail")
                              << "\n";
                }
            }
            break;
        case media::MediaKind::Audio:
            if (!audio_track_id_.empty() && packet.track_id == audio_track_id_) {
                const auto normalized = NormalizeTimestamps(packet);
                const bool ok = PushToAppSrc(audio_appsrc_, normalized);
                const auto& config = app::GetAppConfig();
                if (config.webrtc_trace && config.webrtc_trace_verbose && traced_audio_samples_ < 8) {
                    ++traced_audio_samples_;
                    std::cerr << "[webrtc-egress] audio sample session=" << session_id_
                              << " track=" << normalized.track_id
                              << " codec=" << media::ToString(normalized.codec)
                              << " bytes=" << normalized.payload.size()
                              << " pts=" << normalized.pts
                              << " dts=" << normalized.dts
                              << " src_pts=" << packet.pts
                              << " src_dts=" << packet.dts
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

bool WebRtcEgressSession::EnsureTransportPadsLinked(bool answerer_mode, std::string* error_message) {
#if MEDIA_SERVER_USE_GSTREAMER
    if (transport_pads_linked_) {
        return true;
    }
    if (pipeline_ == nullptr || webrtcbin_ == nullptr) {
        if (error_message != nullptr) {
            *error_message = "WebRTC pipeline is not initialized";
        }
        return false;
    }

    const bool has_audio = !audio_track_id_.empty();
    if (answerer_mode && (remote_video_mline_index_ < 0 || (has_audio && remote_audio_mline_index_ < 0))) {
        if (error_message != nullptr) {
            *error_message = has_audio ? "remote SDP did not provide video/audio m-line indices"
                                       : "remote SDP did not provide video m-line index";
        }
        return false;
    }

    // GStreamer webrtcbin의 request pad와 RTP branch를 명시적으로 연결해 sendonly media를 만든다.
    GstElement* video_pay = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "video_pay");
    GstElement* audio_pay = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "audio_pay");
    GstElement* video_rtp = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "video_rtp");
    GstElement* audio_rtp = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "audio_rtp");
    GstElement* video_in_q = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "video_in_q");
    GstElement* video_input_parse = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "video_input_parse");
    GstElement* video_decoder = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "video_decoder");
    GstElement* video_encoder = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "video_encoder");
    GstElement* video_parse = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "video_parse");
    if (video_pay == nullptr || video_rtp == nullptr ||
        (has_audio && (audio_pay == nullptr || audio_rtp == nullptr))) {
        if (error_message != nullptr) {
            *error_message = "missing WebRTC payload elements";
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
        if (video_parse != nullptr) {
            gst_object_unref(video_parse);
        }
        if (video_in_q != nullptr) {
            gst_object_unref(video_in_q);
        }
        if (video_input_parse != nullptr) {
            gst_object_unref(video_input_parse);
        }
        if (video_decoder != nullptr) {
            gst_object_unref(video_decoder);
        }
        if (video_encoder != nullptr) {
            gst_object_unref(video_encoder);
        }
        return false;
    }

    if (answerer_mode) {
        // answerer 모드에서는 브라우저 offer의 payload type/m-line 순서에 맞춰 caps를 덮어쓴다.
        const int answer_video_pt = remote_video_payload_type_ >= 0 ? remote_video_payload_type_ : 96;
        const int answer_audio_pt = remote_audio_payload_type_ >= 0 ? remote_audio_payload_type_ : 111;
        ApplyRtpPayloadCaps(
            video_pay,
            video_rtp,
            answer_video_pt,
            ("application/x-rtp,media=video,encoding-name=H264,payload=(int)" + std::to_string(answer_video_pt) +
             ",clock-rate=(int)90000,packetization-mode=(string)1,profile-level-id=(string)42e01f,"
             "level-asymmetry-allowed=(string)1")
                .c_str());
        if (has_audio) {
            ApplyRtpPayloadCaps(
                audio_pay,
                audio_rtp,
                answer_audio_pt,
                ("application/x-rtp,media=audio,encoding-name=OPUS,payload=(int)" + std::to_string(answer_audio_pt) +
                 ",clock-rate=(int)48000,encoding-params=(string)2")
                    .c_str());
        }
    }

    GstPad* video_pay_sink_pad = gst_element_get_static_pad(video_pay, "sink");
    GstPad* video_pay_src_pad = gst_element_get_static_pad(video_pay, "src");
    GstPad* audio_pay_sink_pad = has_audio && audio_pay != nullptr ? gst_element_get_static_pad(audio_pay, "sink") : nullptr;
    GstPad* audio_pay_src_pad = has_audio && audio_pay != nullptr ? gst_element_get_static_pad(audio_pay, "src") : nullptr;
    GstPad* video_appsrc_src_pad = video_appsrc_ != nullptr ? gst_element_get_static_pad(video_appsrc_, "src") : nullptr;
    GstPad* video_in_q_src_pad = video_in_q != nullptr ? gst_element_get_static_pad(video_in_q, "src") : nullptr;
    GstPad* video_input_parse_src_pad =
        video_input_parse != nullptr ? gst_element_get_static_pad(video_input_parse, "src") : nullptr;
    GstPad* video_decoder_src_pad = video_decoder != nullptr ? gst_element_get_static_pad(video_decoder, "src") : nullptr;
    GstPad* video_encoder_sink_pad =
        video_encoder != nullptr ? gst_element_get_static_pad(video_encoder, "sink") : nullptr;
    GstPad* video_encoder_src_pad =
        video_encoder != nullptr ? gst_element_get_static_pad(video_encoder, "src") : nullptr;
    GstPad* video_parse_src_pad = video_parse != nullptr ? gst_element_get_static_pad(video_parse, "src") : nullptr;
    GstPad* video_src_pad = gst_element_get_static_pad(video_rtp, "src");
    GstPad* audio_src_pad = has_audio && audio_rtp != nullptr ? gst_element_get_static_pad(audio_rtp, "src") : nullptr;

    const std::string video_pad_name =
        answerer_mode ? "sink_" + std::to_string(remote_video_mline_index_) : "sink_%u";
    const std::string audio_pad_name =
        has_audio ? (answerer_mode ? "sink_" + std::to_string(remote_audio_mline_index_) : "sink_%u") : std::string();

    GstPad* video_sink_pad = gst_element_request_pad_simple(webrtcbin_, video_pad_name.c_str());
    GstPad* audio_sink_pad = has_audio ? gst_element_request_pad_simple(webrtcbin_, audio_pad_name.c_str()) : nullptr;

    GstCaps* video_rtp_caps = gst_caps_from_string(
        "application/x-rtp,media=video,encoding-name=H264,clock-rate=90000,"
        "packetization-mode=(string)1,profile-level-id=(string)42e01f,level-asymmetry-allowed=(string)1");
    GstCaps* audio_rtp_caps = has_audio
                                  ? gst_caps_from_string("application/x-rtp,media=audio,encoding-name=OPUS,clock-rate=48000")
                                  : nullptr;

    const bool configured_video_transceiver =
        ConfigureSinkPadTransceiver(video_sink_pad,
                                    GST_WEBRTC_RTP_TRANSCEIVER_DIRECTION_SENDONLY,
                                    video_rtp_caps,
                                    this,
                                    answerer_mode ? "configured-video-answerer-pad-transceiver"
                                                  : "configured-video-offerer-pad-transceiver");
    const bool configured_audio_transceiver =
        !has_audio ||
        ConfigureSinkPadTransceiver(audio_sink_pad,
                                    GST_WEBRTC_RTP_TRANSCEIVER_DIRECTION_SENDONLY,
                                    audio_rtp_caps,
                                    this,
                                    answerer_mode ? "configured-audio-answerer-pad-transceiver"
                                                  : "configured-audio-offerer-pad-transceiver");

    GstPadLinkReturn video_link_result = GST_PAD_LINK_REFUSED;
    GstPadLinkReturn audio_link_result = GST_PAD_LINK_REFUSED;
    if (video_src_pad != nullptr && video_sink_pad != nullptr) {
        video_link_result = gst_pad_link(video_src_pad, video_sink_pad);
    }
    if (has_audio && audio_src_pad != nullptr && audio_sink_pad != nullptr) {
        audio_link_result = gst_pad_link(audio_src_pad, audio_sink_pad);
    }
    const bool linked = video_src_pad != nullptr && video_sink_pad != nullptr &&
                        video_link_result == GST_PAD_LINK_OK &&
                        (!has_audio ||
                         (audio_src_pad != nullptr && audio_sink_pad != nullptr && audio_link_result == GST_PAD_LINK_OK));
    if (linked) {
        TracePadCaps("video_rtp:src", video_src_pad, session_id_);
        TracePadCaps("video_rtp:src-after-caps", video_src_pad, session_id_);
        if (has_audio) {
            TracePadCaps("audio_rtp:src", audio_src_pad, session_id_);
            TracePadCaps("audio_rtp:src-after-caps", audio_src_pad, session_id_);
        }
        const auto& config = app::GetAppConfig();
        if (config.webrtc_trace && config.webrtc_trace_verbose) {
            if (video_parse_src_pad != nullptr) {
                gst_pad_add_probe(video_parse_src_pad, GST_PAD_PROBE_TYPE_BUFFER, OnElementPadProbe, this, nullptr);
            }
            if (video_appsrc_src_pad != nullptr) {
                gst_pad_add_probe(video_appsrc_src_pad, GST_PAD_PROBE_TYPE_BUFFER, OnElementPadProbe, this, nullptr);
            }
            if (video_in_q_src_pad != nullptr) {
                gst_pad_add_probe(video_in_q_src_pad, GST_PAD_PROBE_TYPE_BUFFER, OnElementPadProbe, this, nullptr);
            }
            if (video_input_parse_src_pad != nullptr) {
                gst_pad_add_probe(video_input_parse_src_pad, GST_PAD_PROBE_TYPE_BUFFER, OnElementPadProbe, this, nullptr);
            }
            if (video_decoder_src_pad != nullptr) {
                gst_pad_add_probe(video_decoder_src_pad, GST_PAD_PROBE_TYPE_BUFFER, OnElementPadProbe, this, nullptr);
            }
            if (video_encoder_sink_pad != nullptr) {
                gst_pad_add_probe(video_encoder_sink_pad, GST_PAD_PROBE_TYPE_BUFFER, OnElementPadProbe, this, nullptr);
            }
            if (video_encoder_src_pad != nullptr) {
                gst_pad_add_probe(video_encoder_src_pad, GST_PAD_PROBE_TYPE_BUFFER, OnElementPadProbe, this, nullptr);
            }
            gst_pad_add_probe(video_pay_sink_pad, GST_PAD_PROBE_TYPE_BUFFER, OnElementPadProbe, this, nullptr);
            gst_pad_add_probe(video_pay_src_pad, GST_PAD_PROBE_TYPE_BUFFER, OnElementPadProbe, this, nullptr);
            gst_pad_add_probe(video_src_pad, GST_PAD_PROBE_TYPE_BUFFER, OnRtpProbe, this, nullptr);
            if (has_audio) {
                gst_pad_add_probe(audio_pay_sink_pad, GST_PAD_PROBE_TYPE_BUFFER, OnElementPadProbe, this, nullptr);
                gst_pad_add_probe(audio_pay_src_pad, GST_PAD_PROBE_TYPE_BUFFER, OnElementPadProbe, this, nullptr);
                gst_pad_add_probe(audio_src_pad, GST_PAD_PROBE_TYPE_BUFFER, OnRtpProbe, this, nullptr);
            }
        }
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
    if (video_appsrc_src_pad != nullptr) {
        gst_object_unref(video_appsrc_src_pad);
    }
    if (video_in_q_src_pad != nullptr) {
        gst_object_unref(video_in_q_src_pad);
    }
    if (video_input_parse_src_pad != nullptr) {
        gst_object_unref(video_input_parse_src_pad);
    }
    if (video_decoder_src_pad != nullptr) {
        gst_object_unref(video_decoder_src_pad);
    }
    if (video_encoder_sink_pad != nullptr) {
        gst_object_unref(video_encoder_sink_pad);
    }
    if (video_encoder_src_pad != nullptr) {
        gst_object_unref(video_encoder_src_pad);
    }
    if (video_parse_src_pad != nullptr) {
        gst_object_unref(video_parse_src_pad);
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
    if (audio_pay != nullptr) {
        gst_object_unref(audio_pay);
    }
    gst_object_unref(video_rtp);
    if (audio_rtp != nullptr) {
        gst_object_unref(audio_rtp);
    }
    if (video_parse != nullptr) {
        gst_object_unref(video_parse);
    }
    if (video_in_q != nullptr) {
        gst_object_unref(video_in_q);
    }
    if (video_input_parse != nullptr) {
        gst_object_unref(video_input_parse);
    }
    if (video_decoder != nullptr) {
        gst_object_unref(video_decoder);
    }
    if (video_encoder != nullptr) {
        gst_object_unref(video_encoder);
    }
    if (video_rtp_caps != nullptr) {
        gst_caps_unref(video_rtp_caps);
    }
    if (audio_rtp_caps != nullptr) {
        gst_caps_unref(audio_rtp_caps);
    }

    if (!configured_video_transceiver || !configured_audio_transceiver || !linked) {
        if (app::GetAppConfig().webrtc_trace) {
            std::cerr << "[webrtc-egress] link-debug session=" << session_id_
                      << " answerer=" << (answerer_mode ? "yes" : "no")
                      << " video_pad=" << (video_sink_pad != nullptr ? GST_PAD_NAME(video_sink_pad) : "<null>")
                      << " audio_pad=" << (audio_sink_pad != nullptr ? GST_PAD_NAME(audio_sink_pad) : "<null>")
                      << " video_link=" << video_link_result
                      << " audio_link=" << audio_link_result
                      << "\n";
        }
        if (error_message != nullptr) {
            *error_message = !configured_video_transceiver || !configured_audio_transceiver
                                 ? "failed to configure WebRTC sink pad transceivers"
                                 : "failed to link RTP payloaders to webrtcbin";
        }
        return false;
    }

    transport_pads_linked_ = true;
    ConfigureRtcpFeedbackRetention();
    TraceTransceivers(answerer_mode ? "after-answerer-link" : "after-offerer-link");
    return true;
#else
    (void)answerer_mode;
    if (error_message != nullptr) {
        *error_message = "GStreamer WebRTC disabled";
    }
    return false;
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
    if (!EnsureTransportPadsLinked(false, error_message)) {
        return false;
    }
    TraceTransceivers("before-create-offer");

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
    TraceSdpSummary("local-offer", *local_offer_);
    TraceTransceivers("after-create-offer");
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
    if (!EnsureTransportPadsLinked(true, error_message)) {
        return false;
    }
    TraceTransceivers("before-create-answer");

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
    ApplyNegotiatedPayloadTypes(*local_offer_);
    TraceSdpSummary("local-answer", *local_offer_);
    TraceTransceivers("after-create-answer");
    ConfigureRtcpFeedbackRetention();
    media_output_ready_ = true;
    FlushPendingPackets();
    ReplayCachedVideoKeyframe();
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

    remote_video_mline_index_ = -1;
    remote_audio_mline_index_ = -1;
    remote_video_payload_type_ = -1;
    remote_audio_payload_type_ = -1;
    // remote SDP에서 실제 media index와 payload type을 먼저 읽어야 webrtcbin request pad 연결이 안정적이다.
    const guint media_count = gst_sdp_message_medias_len(sdp);
    for (guint index = 0; index < media_count; ++index) {
        const GstSDPMedia* media = gst_sdp_message_get_media(sdp, index);
        if (media == nullptr) {
            continue;
        }
        const gchar* media_name = gst_sdp_media_get_media(media);
        if (media_name == nullptr) {
            continue;
        }
        if (g_strcmp0(media_name, "video") == 0 && remote_video_mline_index_ < 0) {
            remote_video_mline_index_ = static_cast<int>(index);
            remote_video_payload_type_ = FindPreferredH264PayloadType(media).value_or(-1);
            if (remote_video_payload_type_ < 0 && gst_sdp_media_formats_len(media) > 0) {
                remote_video_payload_type_ = std::atoi(gst_sdp_media_get_format(media, 0));
            }
        } else if (g_strcmp0(media_name, "audio") == 0 && remote_audio_mline_index_ < 0) {
            remote_audio_mline_index_ = static_cast<int>(index);
            remote_audio_payload_type_ = FindPayloadTypeForEncoding(media, "opus").value_or(-1);
            if (remote_audio_payload_type_ < 0 && gst_sdp_media_formats_len(media) > 0) {
                remote_audio_payload_type_ = std::atoi(gst_sdp_media_get_format(media, 0));
            }
        }
    }
    if (app::GetAppConfig().webrtc_trace) {
        std::cerr << "[webrtc-egress] remote-selected-pt session=" << session_id_
                  << " video=" << remote_video_payload_type_
                  << " audio=" << remote_audio_payload_type_
                  << "\n";
    }

    if (!EnsureTransportPadsLinked(true, error_message)) {
        gst_sdp_message_free(sdp);
        return false;
    }

    GstWebRTCSessionDescription* offer =
        gst_webrtc_session_description_new(GST_WEBRTC_SDP_TYPE_OFFER, sdp);
    GstPromise* promise = gst_promise_new();
    g_signal_emit_by_name(webrtcbin_, "set-remote-description", offer, promise);
    gst_promise_wait(promise);
    gst_promise_unref(promise);
    TraceSdpSummary("remote-offer", sdp_offer);
    TraceTransceivers("after-set-remote-offer");
    ConfigureRtcpFeedbackRetention();
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
    gst_promise_wait(promise);
    gst_promise_unref(promise);
    ApplyNegotiatedPayloadTypes(sdp_answer);
    TraceSdpSummary("remote-answer", sdp_answer);
    TraceTransceivers("after-set-remote-answer");
    ConfigureRtcpFeedbackRetention();
    media_output_ready_ = true;
    FlushPendingPackets();
    ReplayCachedVideoKeyframe();
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
        ConfigureRtcpFeedbackRetention();
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
    const auto& config = app::GetAppConfig();
    if (!config.webrtc_trace || !config.webrtc_trace_verbose) {
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

void WebRtcEgressSession::RecalculateLatency() {
    if (pipeline_ == nullptr) {
        return;
    }

    const gboolean ok = gst_bin_recalculate_latency(GST_BIN(pipeline_));
    if (!app::GetAppConfig().webrtc_trace) {
        return;
    }

    std::cerr << "[webrtc-egress] latency session=" << session_id_
              << " recalculate=" << (ok ? "ok" : "fail")
              << "\n";
}

void WebRtcEgressSession::ConfigureRtcpFeedbackRetention() {
    if (pipeline_ == nullptr) {
        return;
    }

    const auto stats = webrtc_gst::ApplyRtcpWorkarounds(pipeline_, pipeline_);
    if (!app::GetAppConfig().webrtc_trace ||
        (stats.retention_count == 0 && stats.timestamp_probe_count == 0) ||
        traced_rtcp_retention_ >= 4) {
        return;
    }

    ++traced_rtcp_retention_;
    std::cerr << "[webrtc-egress] rtcp-feedback-retention session=" << session_id_
              << " disabled=" << stats.retention_count
              << " timestamp_probes=" << stats.timestamp_probe_count
              << "\n";
}

void WebRtcEgressSession::TracePadBuffer(const std::string& label, std::size_t bytes) {
    const auto& config = app::GetAppConfig();
    if (!config.webrtc_trace || !config.webrtc_trace_verbose) {
        return;
    }

    std::size_t* dedicated_counter = nullptr;
    constexpr std::size_t kDedicatedLimit = 32;
    if (label == "video_parse:src") {
        dedicated_counter = &traced_video_parse_src_;
    } else if (label == "video_pay:sink") {
        dedicated_counter = &traced_video_pay_sink_;
    } else if (label == "video_pay:src") {
        dedicated_counter = &traced_video_pay_src_;
    } else if (label == "video_rtp:src") {
        dedicated_counter = &traced_video_rtp_src_;
    } else if (label.rfind("video_", 0) == 0) {
        dedicated_counter = &traced_video_branch_buffers_;
    }

    if (dedicated_counter != nullptr) {
        if (*dedicated_counter >= kDedicatedLimit) {
            return;
        }
        ++(*dedicated_counter);
    } else {
        if (traced_pad_buffers_ >= 24) {
            return;
        }
        ++traced_pad_buffers_;
    }

    std::cerr << "[webrtc-egress] pad buffer session=" << session_id_
              << " label=" << label
              << " bytes=" << bytes
              << "\n";
}

void WebRtcEgressSession::TraceSdpSummary(const char* label, const std::string& sdp_text) const {
    if (!app::GetAppConfig().webrtc_trace || label == nullptr || sdp_text.empty()) {
        return;
    }

    std::istringstream input(sdp_text);
    std::ostringstream summary;
    std::ostringstream details;
    std::string line;
    bool first = true;
    std::string current_media;
    bool detail_first = true;
    while (std::getline(input, line)) {
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        if (line.rfind("m=", 0) == 0) {
            current_media = line;
        }

        const bool include_summary = line.rfind("m=", 0) == 0 || line.rfind("a=send", 0) == 0 ||
                                     line.rfind("a=recv", 0) == 0 || line.rfind("a=inactive", 0) == 0 ||
                                     line.rfind("a=mid:", 0) == 0;
        if (!include_summary) {
            const bool include_detail = line.rfind("a=rtpmap:", 0) == 0 || line.rfind("a=fmtp:", 0) == 0 ||
                                        line.rfind("a=rtcp-fb:", 0) == 0;
            if (include_detail && !current_media.empty() && details.tellp() < 1400) {
                if (!detail_first) {
                    details << " | ";
                }
                detail_first = false;
                details << current_media << " -> " << line;
            }
            continue;
        }
        if (!first) {
            summary << " | ";
        }
        first = false;
        summary << line;
    }

    std::cerr << "[webrtc-egress] sdp session=" << session_id_
              << " label=" << label
              << " summary=" << (first ? "<empty>" : summary.str())
              << "\n";
    const auto& config = app::GetAppConfig();
    if (config.webrtc_trace_verbose && !detail_first) {
        std::cerr << "[webrtc-egress] sdp-details session=" << session_id_
                  << " label=" << label
                  << " detail=" << details.str()
                  << "\n";
    }
}

void WebRtcEgressSession::TraceTransceivers(const char* label) const {
    if (!app::GetAppConfig().webrtc_trace || label == nullptr || webrtcbin_ == nullptr) {
        return;
    }

    GArray* transceivers = nullptr;
    g_signal_emit_by_name(webrtcbin_, "get-transceivers", &transceivers);
    if (transceivers == nullptr) {
        std::cerr << "[webrtc-egress] transceivers session=" << session_id_
                  << " label=" << label
                  << " count=0\n";
        return;
    }

    std::cerr << "[webrtc-egress] transceivers session=" << session_id_
              << " label=" << label
              << " count=" << transceivers->len
              << "\n";
    for (guint index = 0; index < transceivers->len; ++index) {
        auto* transceiver = static_cast<GstWebRTCRTPTransceiver*>(g_array_index(transceivers, gpointer, index));
        TraceTransceiver(label, transceiver);
    }
    g_array_unref(transceivers);
}

void WebRtcEgressSession::TraceTransceiver(const char* label, GstWebRTCRTPTransceiver* transceiver) const {
    if (!app::GetAppConfig().webrtc_trace || label == nullptr || transceiver == nullptr) {
        return;
    }

    GstWebRTCKind kind = GST_WEBRTC_KIND_UNKNOWN;
    GstWebRTCRTPTransceiverDirection direction = GST_WEBRTC_RTP_TRANSCEIVER_DIRECTION_NONE;
    GstWebRTCRTPTransceiverDirection current_direction = GST_WEBRTC_RTP_TRANSCEIVER_DIRECTION_NONE;
    gchar* mid = nullptr;
    g_object_get(transceiver,
                 "kind",
                 &kind,
                 "direction",
                 &direction,
                 "current-direction",
                 &current_direction,
                 "mid",
                 &mid,
                 nullptr);

    std::cerr << "[webrtc-egress] transceiver session=" << session_id_
              << " label=" << label
              << " ptr=" << transceiver
              << " kind=" << ToString(kind)
              << " direction=" << ToString(direction)
              << " current=" << ToString(current_direction)
              << " mid=" << (mid != nullptr ? mid : "<null>")
              << "\n";

    if (mid != nullptr) {
        g_free(mid);
    }
}

media::Packet WebRtcEgressSession::NormalizeTimestamps(const media::Packet& packet) {
    media::Packet normalized = packet;
    if (packet.kind == media::MediaKind::Data) {
        return normalized;
    }

    std::lock_guard lock(pending_mu_);
    auto& base_pts = packet.kind == media::MediaKind::Video ? video_base_pts_ : audio_base_pts_;
    const std::int64_t source_reference = packet.pts >= 0 ? packet.pts : packet.dts;
    if (!base_pts.has_value()) {
        // source PTS를 WebRTC 세션 시작 기준 0부터 흐르도록 변환한다.
        base_pts = source_reference >= 0 ? source_reference : 0;
    }

    const auto normalize = [&base_pts](std::int64_t value) {
        if (value < 0) {
            return std::int64_t{0};
        }
        return std::max<std::int64_t>(0, value - *base_pts);
    };

    if (packet.pts >= 0) {
        normalized.pts = normalize(packet.pts);
    } else if (packet.dts >= 0) {
        normalized.pts = normalize(packet.dts);
    } else {
        normalized.pts = 0;
    }
    normalized.dts = packet.dts >= 0 ? normalize(packet.dts) : normalized.pts;

    if (packet.kind == media::MediaKind::Video) {
        if (last_video_pts_.has_value() && normalized.pts <= *last_video_pts_) {
            // loop/replay 상황에서도 video RTP timestamp는 단조 증가해야 한다.
            normalized.pts = *last_video_pts_ + kWebRtcVideoFrameDurationNs;
            if (normalized.dts < normalized.pts) {
                normalized.dts = normalized.pts;
            }
        }
        last_video_pts_ = normalized.pts;
    }

    return normalized;
}

media::Packet WebRtcEgressSession::NormalizeReplayVideoKeyframe(const media::Packet& packet) {
    media::Packet normalized = packet;
    std::lock_guard lock(pending_mu_);

    std::int64_t next_pts = 0;
    if (last_video_pts_.has_value()) {
        // negotiation 완료 직후 keyframe을 재전송할 때 기존 RTP timeline 뒤에 붙인다.
        next_pts = *last_video_pts_ + kWebRtcVideoFrameDurationNs;
    } else {
        const std::int64_t source_reference = packet.pts >= 0 ? packet.pts : packet.dts;
        if (!video_base_pts_.has_value()) {
            video_base_pts_ = source_reference >= 0 ? source_reference : 0;
        }
        if (source_reference >= 0) {
            next_pts = std::max<std::int64_t>(0, source_reference - *video_base_pts_);
        }
    }

    normalized.pts = next_pts;
    normalized.dts = next_pts;
    normalized.is_key_frame = true;
    last_video_pts_ = next_pts;
    return normalized;
}

void WebRtcEgressSession::ApplyNegotiatedPayloadTypes(const std::string& sdp_text) {
    if (!started_ || pipeline_ == nullptr || sdp_text.empty()) {
        return;
    }

    const auto video_pt = ExtractPrimaryPayloadType(sdp_text, "video");
    const auto audio_pt = ExtractPrimaryPayloadType(sdp_text, "audio");
    if (!video_pt.has_value() && !audio_pt.has_value()) {
        return;
    }

    GstElement* video_pay = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "video_pay");
    GstElement* audio_pay = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "audio_pay");
    GstElement* video_rtp = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "video_rtp");
    GstElement* audio_rtp = gst_bin_get_by_name_recurse_up(GST_BIN(pipeline_), "audio_rtp");

    if (video_pt.has_value()) {
        if (video_pay != nullptr) {
            g_object_set(video_pay, "pt", *video_pt, nullptr);
        }
        if (video_rtp != nullptr) {
            GstCaps* caps = gst_caps_from_string(
                ("application/x-rtp,media=video,encoding-name=H264,payload=(int)" + std::to_string(*video_pt) +
                 ",clock-rate=(int)90000,packetization-mode=(string)1,profile-level-id=(string)42e01f,"
                 "level-asymmetry-allowed=(string)1")
                    .c_str());
            if (caps != nullptr) {
                g_object_set(video_rtp, "caps", caps, nullptr);
                gst_caps_unref(caps);
            }
        }
    }

    if (audio_pt.has_value()) {
        if (audio_pay != nullptr) {
            g_object_set(audio_pay, "pt", *audio_pt, nullptr);
        }
        if (audio_rtp != nullptr) {
            GstCaps* caps = gst_caps_from_string(
                ("application/x-rtp,media=audio,encoding-name=OPUS,payload=(int)" + std::to_string(*audio_pt) +
                 ",clock-rate=(int)48000,encoding-params=(string)2")
                    .c_str());
            if (caps != nullptr) {
                g_object_set(audio_rtp, "caps", caps, nullptr);
                gst_caps_unref(caps);
            }
        }
    }

    if (app::GetAppConfig().webrtc_trace) {
        std::cerr << "[webrtc-egress] negotiated-pt session=" << session_id_
                  << " video=" << (video_pt.has_value() ? std::to_string(*video_pt) : "<none>")
                  << " audio=" << (audio_pt.has_value() ? std::to_string(*audio_pt) : "<none>")
                  << "\n";
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
}

void WebRtcEgressSession::FlushPendingPackets() {
    if (!started_ || !media_output_ready_) {
        return;
    }

    std::deque<media::Packet> pending;
    {
        std::lock_guard lock(pending_mu_);
        pending.swap(pending_packets_);
    }

    // pending packet도 일반 HandleSample 경로를 다시 태워 timestamp/payload filtering을 동일하게 적용한다.
    for (const auto& packet : pending) {
        HandleSample(packet);
    }
}

void WebRtcEgressSession::ReplayCachedVideoKeyframe() {
    if (!started_ || video_appsrc_ == nullptr || video_track_id_.empty()) {
        return;
    }

    std::optional<media::Packet> cached_keyframe;
    {
        std::lock_guard lock(pending_mu_);
        cached_keyframe = last_video_keyframe_;
    }
    if (!cached_keyframe.has_value()) {
        return;
    }

    if (cached_keyframe->track_id != video_track_id_) {
        return;
    }

    const auto packet = NormalizeReplayVideoKeyframe(*cached_keyframe);
    const bool ok = PushToAppSrc(video_appsrc_, packet, static_cast<GstClockTime>(kWebRtcVideoFrameDurationNs));
    if (app::GetAppConfig().webrtc_trace) {
        std::cerr << "[webrtc-egress] replay-keyframe session=" << session_id_
                  << " track=" << packet.track_id
                  << " codec=" << media::ToString(packet.codec)
                  << " bytes=" << packet.payload.size()
                  << " pts=" << packet.pts
                  << " dts=" << packet.dts
                  << " push=" << (ok ? "ok" : "fail")
                  << "\n";
    }
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
    video_base_pts_.reset();
    audio_base_pts_.reset();
    last_video_pts_.reset();
    traced_video_samples_ = 0;
    traced_video_rtp_ = 0;
    traced_pad_buffers_ = 0;
    traced_video_parse_src_ = 0;
    traced_video_pay_sink_ = 0;
    traced_video_pay_src_ = 0;
    traced_video_rtp_src_ = 0;
    traced_video_branch_buffers_ = 0;

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
        audio_track_id_.clear();
        return true;
    }
    audio_track_id_ = audio_track->track_id;
    traced_audio_samples_ = 0;
    traced_audio_rtp_ = 0;

    if (audio_appsrc_ == nullptr) {
        if (error_message != nullptr) {
            *error_message = "audio appsrc is missing for audio track";
        }
        return false;
    }

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
