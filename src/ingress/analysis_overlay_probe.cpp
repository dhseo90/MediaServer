// 파일 요약: GStreamer raw video buffer에 분석 overlay를 합성하는 probe 구현이다.
// 동작 요약: buffer PTS를 source PTS로 매핑하고 최신 AnalysisResult를 찾아 box/label/event highlight를 그린다.
// 동작 요약: overlay 실패가 송출 pipeline을 깨지 않도록 방어적으로 동작한다.
#include "ingress/analysis_overlay_probe.h"

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/gst.h>
#endif

#include <cstring>

#include "analysis/overlay_renderer.h"

namespace ingress {

#if MEDIA_SERVER_USE_GSTREAMER
namespace {

struct ProbeState {
    AnalysisOverlayConfig config;
};

void SetError(std::string* error_message, std::string message) {
    if (error_message != nullptr) {
        *error_message = std::move(message);
    }
}

analysis::PixelFormat PixelFormatFromCaps(const GstCaps* caps) {
    if (caps == nullptr || gst_caps_get_size(caps) == 0) {
        return analysis::PixelFormat::Unknown;
    }
    const GstStructure* structure = gst_caps_get_structure(caps, 0);
    const char* format = structure != nullptr ? gst_structure_get_string(structure, "format") : nullptr;
    if (format == nullptr) {
        return analysis::PixelFormat::Unknown;
    }
    const std::string value = format;
    if (value == "RGB") {
        return analysis::PixelFormat::RGB;
    }
    if (value == "BGR") {
        return analysis::PixelFormat::BGR;
    }
    return analysis::PixelFormat::Unknown;
}

bool ReadFrameInfo(GstPad* pad, int* width, int* height, analysis::PixelFormat* format) {
    if (pad == nullptr || width == nullptr || height == nullptr || format == nullptr) {
        return false;
    }

    GstCaps* caps = gst_pad_get_current_caps(pad);
    if (caps == nullptr) {
        caps = gst_pad_query_caps(pad, nullptr);
    }
    if (caps == nullptr || gst_caps_get_size(caps) == 0) {
        if (caps != nullptr) {
            gst_caps_unref(caps);
        }
        return false;
    }

    const GstStructure* structure = gst_caps_get_structure(caps, 0);
    const bool ok = structure != nullptr &&
                    gst_structure_get_int(structure, "width", width) &&
                    gst_structure_get_int(structure, "height", height);
    *format = PixelFormatFromCaps(caps);
    gst_caps_unref(caps);
    return ok && *width > 0 && *height > 0 && *format != analysis::PixelFormat::Unknown;
}

GstPadProbeReturn OnOverlayBuffer(GstPad* pad, GstPadProbeInfo* info, gpointer user_data) {
    auto* state = static_cast<ProbeState*>(user_data);
    if (state == nullptr || !state->config.enabled || state->config.result_provider == nullptr) {
        return GST_PAD_PROBE_OK;
    }

    GstBuffer* buffer = gst_pad_probe_info_get_buffer(info);
    if (buffer == nullptr) {
        return GST_PAD_PROBE_OK;
    }
    const std::int64_t frame_pts =
        GST_BUFFER_PTS_IS_VALID(buffer) ? static_cast<std::int64_t>(GST_BUFFER_PTS(buffer)) : 0;

    const auto result = state->config.result_provider(frame_pts);
    if (!result.has_value() || result->detections.empty()) {
        return GST_PAD_PROBE_OK;
    }

    int width = 0;
    int height = 0;
    analysis::PixelFormat format = analysis::PixelFormat::Unknown;
    if (!ReadFrameInfo(pad, &width, &height, &format)) {
        return GST_PAD_PROBE_OK;
    }

    GstBuffer* writable = gst_buffer_make_writable(buffer);
    if (writable == nullptr) {
        return GST_PAD_PROBE_OK;
    }
    if (writable != buffer) {
        GST_PAD_PROBE_INFO_DATA(info) = writable;
    }

    GstMapInfo map;
    if (gst_buffer_map(writable, &map, GST_MAP_READWRITE) != TRUE) {
        return GST_PAD_PROBE_OK;
    }

    const std::size_t expected_size = static_cast<std::size_t>(width) * static_cast<std::size_t>(height) * 3U;
    if (map.size >= expected_size) {
        analysis::RawVideoFrame frame;
        frame.width = width;
        frame.height = height;
        frame.format = format;
        frame.pts = frame_pts;
        frame.data.assign(map.data, map.data + expected_size);

        analysis::RawVideoFrame overlay_frame;
        std::string error_message;
        if (analysis::RenderDetectionOverlay(
                frame, *result, state->config.render_options, &overlay_frame, &error_message) &&
            overlay_frame.data.size() == expected_size) {
            std::memcpy(map.data, overlay_frame.data.data(), expected_size);
        }
    }

    gst_buffer_unmap(writable, &map);
    return GST_PAD_PROBE_OK;
}

void DestroyProbeState(gpointer data) {
    delete static_cast<ProbeState*>(data);
}

}  // namespace

bool AttachAnalysisOverlayProbe(GstElement* root, AnalysisOverlayConfig config, std::string* error_message) {
    if (!config.enabled) {
        return true;
    }
    if (root == nullptr) {
        SetError(error_message, "missing GStreamer root for analysis overlay probe");
        return false;
    }
    if (config.result_provider == nullptr) {
        SetError(error_message, "missing analysis result provider for overlay probe");
        return false;
    }

    GstElement* overlay = gst_bin_get_by_name_recurse_up(GST_BIN(root), "analysis_overlay");
    if (overlay == nullptr) {
        SetError(error_message, "analysis overlay element not found in egress pipeline");
        return false;
    }

    GstPad* pad = gst_element_get_static_pad(overlay, "src");
    if (pad == nullptr) {
        gst_object_unref(overlay);
        SetError(error_message, "analysis overlay element has no src pad");
        return false;
    }

    auto* state = new ProbeState{.config = std::move(config)};
    gst_pad_add_probe(pad, GST_PAD_PROBE_TYPE_BUFFER, OnOverlayBuffer, state, DestroyProbeState);
    gst_object_unref(pad);
    gst_object_unref(overlay);
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}
#endif

}  // namespace ingress
