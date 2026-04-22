// 파일 용도: GStreamer WebRTC의 SDP sanitize, RTCP feedback 제거, pipeline clock 보정 유틸리티를 구현한다.
#include "ingress/webrtc_gst_utils.h"

#if MEDIA_SERVER_USE_GSTREAMER
#include <sstream>
#include <string>

namespace ingress::webrtc_gst {
namespace {

constexpr GstClockTime kWebRtcPipelineLatency = 0;

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

bool SetRtcpFeedbackRetentionWindow(GObject* object) {
    if (object == nullptr) {
        return false;
    }

    GParamSpec* pspec = g_object_class_find_property(G_OBJECT_GET_CLASS(object), "rtcp-feedback-retention-window");
    if (pspec == nullptr || (pspec->flags & G_PARAM_WRITABLE) == 0) {
        return false;
    }

    // This relay does not implement RTX/NACK replay yet, so retaining browser
    // RTCP feedback packets only adds noise and can hit GStreamer assertions.
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

}  // namespace

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

RtcpWorkaroundStats ApplyRtcpWorkarounds(GstElement* root, GstElement* pipeline) {
    return RtcpWorkaroundStats{
        ConfigureRtcpFeedbackRetentionForElementTree(root),
        AttachRtcpTimestampProbesForElementTree(root, pipeline),
    };
}

void OnDeepElementAdded(GstBin* /*bin*/, GstBin* /*sub_bin*/, GstElement* element, gpointer user_data) {
    auto* pipeline = static_cast<GstElement*>(user_data);
    ApplyRtcpWorkarounds(element, pipeline);
}

}  // namespace ingress::webrtc_gst
#endif
