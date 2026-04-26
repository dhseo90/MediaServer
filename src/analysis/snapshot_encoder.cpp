// 파일 요약: 분석 raw frame을 JPEG snapshot으로 인코딩한다.
// 동작 요약: GStreamer appsrc/jpegenc/appsink pipeline을 사용해 HTTP 응답용 JPEG bytes를 생성한다.
// 동작 요약: snapshot/overlay API가 원본 frame과 합성 frame을 같은 방식으로 내려보내게 한다.
#include "analysis/snapshot_encoder.h"

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsink.h>
#include <gst/app/gstappsrc.h>
#include <gst/gst.h>
#endif

#include <algorithm>

namespace analysis {

namespace {

void SetError(std::string* error_message, std::string message) {
    if (error_message != nullptr) {
        *error_message = std::move(message);
    }
}

#if MEDIA_SERVER_USE_GSTREAMER

std::string CapsFormat(PixelFormat format) {
    switch (format) {
        case PixelFormat::RGB:
            return "RGB";
        case PixelFormat::BGR:
            return "BGR";
        case PixelFormat::I420:
            return "I420";
        case PixelFormat::Gray8:
            return "GRAY8";
        case PixelFormat::Unknown:
            return {};
    }
    return {};
}

#endif

}  // namespace

bool EncodeJpeg(const RawVideoFrame& frame, int quality, EncodedImage* output, std::string* error_message) {
    if (output == nullptr) {
        SetError(error_message, "missing encoded image output");
        return false;
    }
    output->content_type.clear();
    output->data.clear();

    if (frame.width <= 0 || frame.height <= 0 || frame.data.empty()) {
        SetError(error_message, "missing raw frame data");
        return false;
    }

#if MEDIA_SERVER_USE_GSTREAMER
    const std::string format = CapsFormat(frame.format);
    if (format.empty()) {
        SetError(error_message, "unsupported raw frame pixel format for JPEG snapshot");
        return false;
    }

    gst_init(nullptr, nullptr);
    const int clamped_quality = std::max(1, std::min(100, quality));
    const std::string launch =
        "appsrc name=src is-live=false format=time block=true "
        "! queue max-size-buffers=1 max-size-time=0 max-size-bytes=0 "
        "! videoconvert ! jpegenc quality=" +
        std::to_string(clamped_quality) +
        " ! appsink name=sink emit-signals=false sync=false max-buffers=1 drop=false";

    GError* pipeline_error = nullptr;
    GstElement* pipeline = gst_parse_launch(launch.c_str(), &pipeline_error);
    if (pipeline == nullptr) {
        SetError(error_message,
                 pipeline_error != nullptr ? pipeline_error->message : "failed to create JPEG snapshot pipeline");
        if (pipeline_error != nullptr) {
            g_error_free(pipeline_error);
        }
        return false;
    }

    GstElement* appsrc = gst_bin_get_by_name(GST_BIN(pipeline), "src");
    GstElement* appsink = gst_bin_get_by_name(GST_BIN(pipeline), "sink");
    if (appsrc == nullptr || appsink == nullptr) {
        if (appsrc != nullptr) {
            gst_object_unref(appsrc);
        }
        if (appsink != nullptr) {
            gst_object_unref(appsink);
        }
        gst_object_unref(pipeline);
        SetError(error_message, "JPEG snapshot pipeline missing appsrc/appsink");
        return false;
    }

    GstCaps* caps = gst_caps_new_simple("video/x-raw",
                                        "format",
                                        G_TYPE_STRING,
                                        format.c_str(),
                                        "width",
                                        G_TYPE_INT,
                                        frame.width,
                                        "height",
                                        G_TYPE_INT,
                                        frame.height,
                                        "framerate",
                                        GST_TYPE_FRACTION,
                                        1,
                                        1,
                                        nullptr);
    gst_app_src_set_caps(GST_APP_SRC(appsrc), caps);
    gst_caps_unref(caps);

    bool ok = true;
    std::string local_error;
    if (gst_element_set_state(pipeline, GST_STATE_PLAYING) == GST_STATE_CHANGE_FAILURE) {
        ok = false;
        local_error = "failed to start JPEG snapshot pipeline";
    }

    if (ok) {
        GstBuffer* buffer = gst_buffer_new_allocate(nullptr, frame.data.size(), nullptr);
        if (buffer == nullptr) {
            ok = false;
            local_error = "failed to allocate JPEG snapshot input buffer";
        } else {
            gst_buffer_fill(buffer, 0, frame.data.data(), frame.data.size());
            GST_BUFFER_PTS(buffer) = frame.pts >= 0 ? static_cast<GstClockTime>(frame.pts) : GST_CLOCK_TIME_NONE;
            const GstFlowReturn flow = gst_app_src_push_buffer(GST_APP_SRC(appsrc), buffer);
            if (flow != GST_FLOW_OK) {
                ok = false;
                local_error = "failed to push JPEG snapshot input buffer";
            }
        }
    }

    if (ok) {
        gst_app_src_end_of_stream(GST_APP_SRC(appsrc));
        GstSample* sample = gst_app_sink_try_pull_sample(GST_APP_SINK(appsink), 2 * GST_SECOND);
        if (sample == nullptr) {
            ok = false;
            local_error = "timed out waiting for JPEG snapshot output";
        } else {
            GstBuffer* out_buffer = gst_sample_get_buffer(sample);
            GstMapInfo map;
            if (out_buffer == nullptr || gst_buffer_map(out_buffer, &map, GST_MAP_READ) != TRUE) {
                ok = false;
                local_error = "failed to map JPEG snapshot output";
            } else {
                output->content_type = "image/jpeg";
                output->data.assign(map.data, map.data + map.size);
                gst_buffer_unmap(out_buffer, &map);
            }
            gst_sample_unref(sample);
        }
    }

    gst_element_set_state(pipeline, GST_STATE_NULL);
    gst_object_unref(appsrc);
    gst_object_unref(appsink);
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
    (void)quality;
    SetError(error_message, "JPEG snapshot requires MEDIA_SERVER_USE_GSTREAMER=ON");
    return false;
#endif
}

}  // namespace analysis
