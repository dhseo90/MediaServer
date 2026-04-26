// 파일 요약: 로컬 이미지 파일을 분석 가능한 raw frame으로 디코딩한다.
// 동작 요약: GStreamer decodebin/appsink를 사용해 JPEG/PNG/WebP 등을 RGB frame으로 변환한다.
// 동작 요약: 정적 이미지 분석 API가 영상 분석 pipeline과 같은 detector 입력을 쓰게 한다.
#include "analysis/image_frame_loader.h"

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsink.h>
#include <gst/gst.h>
#endif

namespace analysis {

namespace {

void SetError(std::string* error_message, std::string message) {
    if (error_message != nullptr) {
        *error_message = std::move(message);
    }
}

#if MEDIA_SERVER_USE_GSTREAMER

PixelFormat PixelFormatFromCaps(const GstCaps* caps) {
    if (caps == nullptr || gst_caps_get_size(caps) == 0) {
        return PixelFormat::Unknown;
    }
    const GstStructure* structure = gst_caps_get_structure(caps, 0);
    const char* format = structure != nullptr ? gst_structure_get_string(structure, "format") : nullptr;
    if (format == nullptr) {
        return PixelFormat::Unknown;
    }
    const std::string text = format;
    if (text == "RGB") {
        return PixelFormat::RGB;
    }
    if (text == "BGR") {
        return PixelFormat::BGR;
    }
    if (text == "I420") {
        return PixelFormat::I420;
    }
    if (text == "GRAY8") {
        return PixelFormat::Gray8;
    }
    return PixelFormat::Unknown;
}

struct DecodeLinkState {
    GstElement* convert{nullptr};
};

void OnDecodePadAdded(GstElement* /*decodebin*/, GstPad* pad, gpointer user_data) {
    auto* state = static_cast<DecodeLinkState*>(user_data);
    if (state == nullptr || state->convert == nullptr) {
        return;
    }

    GstPad* sink_pad = gst_element_get_static_pad(state->convert, "sink");
    if (sink_pad == nullptr) {
        return;
    }
    if (!gst_pad_is_linked(sink_pad)) {
        gst_pad_link(pad, sink_pad);
    }
    gst_object_unref(sink_pad);
}

#endif

}  // namespace

bool DecodeImageFileToRawFrame(const std::filesystem::path& image_path,
                               RawVideoFrame* output,
                               std::string* error_message) {
    if (output == nullptr) {
        SetError(error_message, "missing raw image output");
        return false;
    }
    *output = RawVideoFrame{};

#if MEDIA_SERVER_USE_GSTREAMER
    gst_init(nullptr, nullptr);

    GstElement* pipeline = gst_pipeline_new("media-server-image-decode");
    GstElement* filesrc = gst_element_factory_make("filesrc", "src");
    GstElement* decodebin = gst_element_factory_make("decodebin", "decode");
    GstElement* convert = gst_element_factory_make("videoconvert", "convert");
    GstElement* capsfilter = gst_element_factory_make("capsfilter", "caps");
    GstElement* appsink = gst_element_factory_make("appsink", "sink");
    if (pipeline == nullptr || filesrc == nullptr || decodebin == nullptr || convert == nullptr ||
        capsfilter == nullptr || appsink == nullptr) {
        if (pipeline != nullptr) {
            gst_object_unref(pipeline);
        }
        SetError(error_message, "failed to create image decode pipeline elements");
        return false;
    }

    g_object_set(filesrc, "location", image_path.string().c_str(), nullptr);
    GstCaps* caps = gst_caps_from_string("video/x-raw,format=RGB");
    g_object_set(capsfilter, "caps", caps, nullptr);
    gst_caps_unref(caps);
    g_object_set(appsink, "emit-signals", FALSE, "sync", FALSE, "max-buffers", 1, "drop", FALSE, nullptr);

    gst_bin_add_many(GST_BIN(pipeline), filesrc, decodebin, convert, capsfilter, appsink, nullptr);
    bool ok = true;
    std::string local_error;
    if (gst_element_link(filesrc, decodebin) != TRUE ||
        gst_element_link_many(convert, capsfilter, appsink, nullptr) != TRUE) {
        ok = false;
        local_error = "failed to link image decode pipeline";
    }

    DecodeLinkState link_state{convert};
    g_signal_connect(decodebin, "pad-added", G_CALLBACK(OnDecodePadAdded), &link_state);

    if (ok && gst_element_set_state(pipeline, GST_STATE_PLAYING) == GST_STATE_CHANGE_FAILURE) {
        ok = false;
        local_error = "failed to start image decode pipeline";
    }

    GstSample* sample = nullptr;
    if (ok) {
        sample = gst_app_sink_try_pull_sample(GST_APP_SINK(appsink), 5 * GST_SECOND);
        if (sample == nullptr) {
            ok = false;
            local_error = "timed out waiting for decoded image frame";
        }
    }

    if (ok && sample != nullptr) {
        RawVideoFrame frame;
        frame.source_key = image_path.filename().string();
        frame.track_id = "image";
        GstCaps* sample_caps = gst_sample_get_caps(sample);
        if (sample_caps != nullptr && gst_caps_get_size(sample_caps) > 0) {
            const GstStructure* structure = gst_caps_get_structure(sample_caps, 0);
            gst_structure_get_int(structure, "width", &frame.width);
            gst_structure_get_int(structure, "height", &frame.height);
            frame.format = PixelFormatFromCaps(sample_caps);
        }

        GstBuffer* buffer = gst_sample_get_buffer(sample);
        if (buffer != nullptr) {
            frame.pts = GST_BUFFER_PTS_IS_VALID(buffer) ? static_cast<std::int64_t>(GST_BUFFER_PTS(buffer)) : 0;
            GstMapInfo map;
            if (gst_buffer_map(buffer, &map, GST_MAP_READ) == TRUE) {
                frame.data.assign(map.data, map.data + map.size);
                gst_buffer_unmap(buffer, &map);
            }
        }

        if (frame.width <= 0 || frame.height <= 0 || frame.format != PixelFormat::RGB || frame.data.empty()) {
            ok = false;
            local_error = "decoded image frame is invalid";
        } else {
            *output = std::move(frame);
        }
    }

    if (sample != nullptr) {
        gst_sample_unref(sample);
    }
    gst_element_set_state(pipeline, GST_STATE_NULL);
    gst_object_unref(pipeline);

    if (!ok) {
        SetError(error_message, std::move(local_error));
        return false;
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
#else
    (void)image_path;
    SetError(error_message, "image decode requires MEDIA_SERVER_USE_GSTREAMER=ON");
    return false;
#endif
}

}  // namespace analysis
