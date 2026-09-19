#pragma once
// 파일 용도: 실제 writer 파일의 encoded AU 시각과 원본 결박을 측정한다.
// 측정 성공은 시간 동일성/파생 계약의 PASS가 아니다. decode-order 대응은 관찰 가설로 출력한다.
#include "recording/gstreamer_segment_writer.h"
#include "recording/recording_catalog.h"
#include <gst/app/gstappsink.h>
#include <gst/gst.h>
#include <algorithm>
#include <iostream>
#include <limits>
#include <map>
#include <stdexcept>

namespace {
struct Pipeline {
    GstElement* pipeline{nullptr};
    GstElement* sink{nullptr};
    explicit Pipeline(const std::string& launch) {
        GError* error = nullptr;
        pipeline = gst_parse_launch(launch.c_str(), &error);
        if (error || !pipeline) {
            if (error) g_error_free(error);
            if (pipeline) gst_object_unref(pipeline);
            throw std::runtime_error("pipeline-parse");
        }
        sink = gst_bin_get_by_name(GST_BIN(pipeline), "out");
        if (!sink) { gst_object_unref(pipeline); throw std::runtime_error("appsink-missing"); }
        if (gst_element_set_state(pipeline, GST_STATE_PLAYING) == GST_STATE_CHANGE_FAILURE) {
            gst_element_set_state(pipeline, GST_STATE_NULL);
            gst_object_unref(sink); gst_object_unref(pipeline);
            throw std::runtime_error("pipeline-start");
        }
    }
    ~Pipeline() {
        gst_element_set_state(pipeline, GST_STATE_NULL);
        gst_object_unref(sink); gst_object_unref(pipeline);
    }
    Pipeline(const Pipeline&) = delete;
};
struct Encoded {
    media::StreamDescriptor descriptor;
    std::vector<media::Packet> packets;
};
Encoded Encode(int frames, bool bframes, bool fractional,int width=160,int height=90,int fps=10,int key_interval=10,const std::string& stream_format="byte-stream") {
    if(stream_format!="byte-stream"&&stream_format!="avc")throw std::runtime_error("fixture-stream-format");
    const std::string rate = fractional ? "30000/1001" : std::to_string(fps)+"/1";
    const std::string encoder = bframes ?
        "x264enc speed-preset=medium bframes=2 key-int-max=10 rc-lookahead=5" :
        "x264enc tune=zerolatency speed-preset=ultrafast key-int-max=10";
    std::string configured_encoder=encoder;
    configured_encoder.replace(configured_encoder.find("key-int-max=10"),14,"key-int-max="+std::to_string(key_interval));
    Pipeline pipe("videotestsrc num-buffers=" + std::to_string(frames) +
        " pattern=ball ! video/x-raw,width="+std::to_string(width)+",height="+std::to_string(height)+",framerate=" + rate + " ! " + configured_encoder +
        " ! video/x-h264,stream-format="+stream_format+",alignment=au ! appsink name=out sync=false");
    Encoded result;
    GstClockTime origin = 0;
    for (int i = 0; i < frames; ++i) {
        GstSample* sample = gst_app_sink_try_pull_sample(GST_APP_SINK(pipe.sink), 3 * GST_SECOND);
        if (!sample) throw std::runtime_error("encode-sample-missing");
        GstBuffer* buffer = gst_sample_get_buffer(sample);
        if (!GST_BUFFER_PTS_IS_VALID(buffer) || !GST_BUFFER_DTS_IS_VALID(buffer)) {
            gst_sample_unref(sample); throw std::runtime_error("encode-timestamp-missing");
        }
        if (!i) origin = std::min(GST_BUFFER_PTS(buffer), GST_BUFFER_DTS(buffer));
        if (GST_BUFFER_PTS(buffer) < origin || GST_BUFFER_DTS(buffer) < origin) {
            gst_sample_unref(sample); throw std::runtime_error("encode-origin-underflow");
        }
        media::Packet packet;
        packet.kind = media::MediaKind::Video; packet.codec = media::CodecId::H264; packet.track_id = "video-0";
        packet.is_key_frame = !GST_BUFFER_FLAG_IS_SET(buffer, GST_BUFFER_FLAG_DELTA_UNIT);
        packet.pts = static_cast<std::int64_t>(GST_BUFFER_PTS(buffer) - origin);
        packet.dts = static_cast<std::int64_t>(GST_BUFFER_DTS(buffer) - origin);
        packet.payload.resize(gst_buffer_get_size(buffer));
        gst_buffer_extract(buffer, 0, packet.payload.data(), packet.payload.size());
        media::SampleObservation observation;
        observation.source_generation = "probe-generation-a"; observation.generation_order = 1;
        observation.ordinal = static_cast<std::uint64_t>(i + 1);
        observation.pts_ns = packet.pts; observation.dts_ns = packet.dts;
        if (GST_BUFFER_DURATION_IS_VALID(buffer)) observation.duration_ns = GST_BUFFER_DURATION(buffer);
        observation.clock_process_id = "probe-clock";
        observation.mono_before_ns = 1000000000LL + packet.pts;
        observation.mono_after_ns = observation.mono_before_ns + 1000;
        observation.observed_utc_ns = 1789200000000000000LL + packet.pts;
        packet.observation = observation;
        if (result.descriptor.tracks.empty()) {
            gchar* caps = gst_caps_to_string(gst_sample_get_caps(sample));
            result.descriptor.tracks.push_back({"video-0", media::MediaKind::Video, media::CodecId::H264, "h264", caps, 0, 0});
            g_free(caps);
        }
        result.packets.push_back(std::move(packet));
        gst_sample_unref(sample);
    }
    return result;
}
struct Store {
    std::filesystem::path root;
    recording::RecordingJournal journal;
    recording::RecordingCatalog catalog;
    static recording::RecordingCatalog::Options Options(const std::filesystem::path& root) {
        recording::RecordingCatalog::Options options(root / "recording-catalog.sqlite3", root, true);
        options.enable_v2_storage = true; return options;
    }
    explicit Store(std::filesystem::path path) : root(std::move(path)),
        journal(recording::RecordingJournal::ManagedOptions{root, "probe-store"}), catalog(journal, Options(root)) {
        std::string error;
        if (!journal.Open(&error) || !catalog.Open(&error)) throw std::runtime_error("store-open:" + error);
    }
    std::vector<recording::RecordingSegmentV2> Segments() {
        std::vector<recording::RecordingSegmentV2> result;
        for (const auto& mutation : journal.Replay().mutations) {
            if (mutation.mutation_type != recording::RecordingMutationType::SegmentV2BoundFinalized) continue;
            const auto segment = catalog.FindSegmentV2ById(mutation.entity_id);
            if (segment) result.push_back(*segment);
        }
        return result;
    }
};
void Shift(Encoded& input, std::uint64_t offset) {
    for (auto& packet : input.packets) {
        packet.pts += offset; packet.dts += offset;
        *packet.observation->pts_ns += offset; *packet.observation->dts_ns += offset;
    }
}
} // namespace
