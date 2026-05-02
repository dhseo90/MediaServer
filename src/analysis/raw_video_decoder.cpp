// 파일 요약: compressed video packet을 raw frame으로 변환하는 분석 전용 decoder 구현이다.
// 동작 요약: GStreamer appsrc/appsink pipeline으로 source packet을 디코딩하고 frame callback으로 전달한다.
// 동작 요약: analysis tap이 egress path와 분리된 raw frame 흐름을 갖도록 한다.
#include "analysis/raw_video_decoder.h"

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsink.h>
#include <gst/app/gstappsrc.h>
#include <gst/gst.h>
#endif

#include <algorithm>
#include <deque>
#include <iostream>
#include <limits>
#include <mutex>
#include <optional>

namespace analysis {

namespace {

#if MEDIA_SERVER_USE_GSTREAMER

constexpr std::int64_t kDefaultVideoFrameDurationNs = 33333333LL;
constexpr std::int64_t kMaxTimestampMappingDistanceNs = 500000000LL;
constexpr std::size_t kMaxTimestampMappings = 4096;

std::int64_t AbsDiff(std::int64_t lhs, std::int64_t rhs) {
    return lhs >= rhs ? lhs - rhs : rhs - lhs;
}

GstCaps* BuildCapsFromTrack(const media::TrackInfo& track) {
    if (!track.caps_string.empty()) {
        GstCaps* caps = gst_caps_from_string(track.caps_string.c_str());
        if (caps != nullptr) {
            return caps;
        }
    }

    switch (track.codec) {
        case media::CodecId::H264:
            return gst_caps_from_string("video/x-h264,stream-format=avc,alignment=au");
        case media::CodecId::H265:
            return gst_caps_from_string("video/x-h265,stream-format=hvc1,alignment=au");
        case media::CodecId::VP8:
            return gst_caps_from_string("video/x-vp8");
        case media::CodecId::Unknown:
        case media::CodecId::AAC:
        case media::CodecId::Opus:
        case media::CodecId::PCMU:
        case media::CodecId::PCMALaw:
            return nullptr;
    }
    return nullptr;
}

std::string BuildDecodeLaunch(media::CodecId codec) {
    const std::string appsrc =
        "appsrc name=video_src is-live=true format=time do-timestamp=false block=false ";
    const std::string queue =
        "! queue max-size-buffers=16 max-size-time=200000000 max-size-bytes=0 leaky=downstream ";
    const std::string sink =
        "! videoconvert ! video/x-raw,format=RGB "
        "! appsink name=raw_sink emit-signals=false sync=false max-buffers=2 drop=true";

    switch (codec) {
        case media::CodecId::H264:
            return appsrc + queue + "! h264parse ! avdec_h264 " + sink;
        case media::CodecId::H265:
            return appsrc + queue + "! h265parse ! avdec_h265 " + sink;
        case media::CodecId::VP8:
            return appsrc + queue + "! vp8dec " + sink;
        case media::CodecId::Unknown:
        case media::CodecId::AAC:
        case media::CodecId::Opus:
        case media::CodecId::PCMU:
        case media::CodecId::PCMALaw:
            return {};
    }
    return {};
}

PixelFormat PixelFormatFromCaps(const GstCaps* caps) {
    if (caps == nullptr || gst_caps_get_size(caps) == 0) {
        return PixelFormat::Unknown;
    }
    const GstStructure* structure = gst_caps_get_structure(caps, 0);
    const char* format = structure != nullptr ? gst_structure_get_string(structure, "format") : nullptr;
    if (format == nullptr) {
        return PixelFormat::Unknown;
    }
    const std::string format_text = format;
    if (format_text == "RGB") {
        return PixelFormat::RGB;
    }
    if (format_text == "BGR") {
        return PixelFormat::BGR;
    }
    if (format_text == "I420") {
        return PixelFormat::I420;
    }
    if (format_text == "GRAY8") {
        return PixelFormat::Gray8;
    }
    return PixelFormat::Unknown;
}

class GstRawVideoDecoder final : public RawVideoDecoder {
public:
    GstRawVideoDecoder(Config config, FrameCallback callback)
        : config_(std::move(config)), callback_(std::move(callback)) {}

    ~GstRawVideoDecoder() override {
        Stop();
    }

    bool Start(std::string* error_message) override {
        if (running_.load()) {
            return true;
        }

        gst_init(nullptr, nullptr);
        const std::string launch = BuildDecodeLaunch(config_.track.codec);
        if (launch.empty()) {
            if (error_message != nullptr) {
                *error_message = "unsupported analysis decoder codec: " + media::ToString(config_.track.codec);
            }
            return false;
        }

        GError* pipeline_error = nullptr;
        pipeline_ = gst_parse_launch(launch.c_str(), &pipeline_error);
        if (pipeline_ == nullptr) {
            if (error_message != nullptr) {
                *error_message = pipeline_error != nullptr ? pipeline_error->message : "failed to create analysis decoder";
            }
            if (pipeline_error != nullptr) {
                g_error_free(pipeline_error);
            }
            return false;
        }

        appsrc_ = gst_bin_get_by_name(GST_BIN(pipeline_), "video_src");
        appsink_ = gst_bin_get_by_name(GST_BIN(pipeline_), "raw_sink");
        if (appsrc_ == nullptr || appsink_ == nullptr) {
            if (error_message != nullptr) {
                *error_message = "analysis decoder is missing appsrc/appsink";
            }
            Stop();
            return false;
        }

        GstCaps* caps = BuildCapsFromTrack(config_.track);
        if (caps == nullptr) {
            if (error_message != nullptr) {
                *error_message = "failed to build analysis decoder caps";
            }
            Stop();
            return false;
        }
        gst_app_src_set_caps(GST_APP_SRC(appsrc_), caps);
        gst_caps_unref(caps);

        running_.store(true);
        sink_thread_ = std::thread([this] { PullLoop(); });
        if (gst_element_set_state(pipeline_, GST_STATE_PLAYING) == GST_STATE_CHANGE_FAILURE) {
            if (error_message != nullptr) {
                *error_message = "failed to start analysis decoder";
            }
            Stop();
            return false;
        }
        return true;
    }

    void Stop() override {
        const bool was_running = running_.exchange(false);
        if (appsrc_ != nullptr && was_running) {
            gst_app_src_end_of_stream(GST_APP_SRC(appsrc_));
        }
        if (pipeline_ != nullptr) {
            gst_element_set_state(pipeline_, GST_STATE_NULL);
        }
        if (sink_thread_.joinable()) {
            sink_thread_.join();
        }
        if (appsrc_ != nullptr) {
            gst_object_unref(appsrc_);
            appsrc_ = nullptr;
        }
        if (appsink_ != nullptr) {
            gst_object_unref(appsink_);
            appsink_ = nullptr;
        }
        if (pipeline_ != nullptr) {
            gst_object_unref(pipeline_);
            pipeline_ = nullptr;
        }
    }

    bool PushPacket(const media::Packet& packet, std::string* error_message) override {
        if (!running_.load() || appsrc_ == nullptr) {
            if (error_message != nullptr) {
                *error_message = "analysis decoder is not running";
            }
            return false;
        }
        if (packet.payload.empty()) {
            return true;
        }
        const media::Packet decoder_packet = NormalizePacketForDecoder(packet);

        GstBuffer* buffer = gst_buffer_new_allocate(nullptr, decoder_packet.payload.size(), nullptr);
        if (buffer == nullptr) {
            if (error_message != nullptr) {
                *error_message = "failed to allocate analysis decoder buffer";
            }
            return false;
        }
        gst_buffer_fill(buffer, 0, decoder_packet.payload.data(), decoder_packet.payload.size());
        GST_BUFFER_PTS(buffer) =
            decoder_packet.pts >= 0 ? static_cast<GstClockTime>(decoder_packet.pts) : GST_CLOCK_TIME_NONE;
        GST_BUFFER_DTS(buffer) =
            decoder_packet.dts >= 0 ? static_cast<GstClockTime>(decoder_packet.dts) : GST_CLOCK_TIME_NONE;
        if (decoder_packet.is_key_frame) {
            GST_BUFFER_FLAG_UNSET(buffer, GST_BUFFER_FLAG_DELTA_UNIT);
        } else {
            GST_BUFFER_FLAG_SET(buffer, GST_BUFFER_FLAG_DELTA_UNIT);
        }

        const GstFlowReturn flow = gst_app_src_push_buffer(GST_APP_SRC(appsrc_), buffer);
        if (flow != GST_FLOW_OK && flow != GST_FLOW_FLUSHING) {
            if (error_message != nullptr) {
                *error_message = "analysis decoder push failed: " + std::to_string(static_cast<int>(flow));
            }
            return false;
        }
        return true;
    }

    bool IsRunning() const override {
        return running_.load();
    }

private:
    struct TimestampMapping {
        std::int64_t decoder_pts{0};
        std::int64_t source_pts{0};
    };

    media::Packet NormalizePacketForDecoder(const media::Packet& packet) {
        media::Packet normalized = packet;
        if (packet.pts < 0 && packet.dts < 0) {
            return normalized;
        }

        std::lock_guard lock(timestamp_mu_);
        const std::int64_t source_reference =
            packet.pts >= 0 && packet.dts >= 0 ? std::min(packet.pts, packet.dts)
                                               : (packet.dts >= 0 ? packet.dts : packet.pts);
        if (!input_base_pts_.has_value()) {
            input_base_pts_ = source_reference >= 0 ? source_reference : 0;
        }

        const auto normalize = [this](std::int64_t value) {
            if (value < 0) {
                return std::int64_t{0};
            }
            return std::max<std::int64_t>(0, value - *input_base_pts_);
        };

        normalized.pts = packet.pts >= 0 ? normalize(packet.pts) : normalize(packet.dts);
        normalized.dts = packet.dts >= 0 ? normalize(packet.dts) : normalized.pts;

        if (last_input_dts_.has_value() && normalized.dts > *last_input_dts_) {
            last_input_frame_duration_ns_ = normalized.dts - *last_input_dts_;
        }
        if (last_input_dts_.has_value() && normalized.dts <= *last_input_dts_) {
            const std::int64_t frame_duration =
                last_input_frame_duration_ns_ > 0 ? last_input_frame_duration_ns_ : kDefaultVideoFrameDurationNs;
            const std::int64_t offset = *last_input_dts_ + frame_duration - normalized.dts;
            normalized.pts += offset;
            normalized.dts += offset;
        }
        last_input_dts_ = normalized.dts;

        const std::int64_t source_pts =
            packet.pts >= 0 ? packet.pts : (packet.dts >= 0 ? packet.dts : normalized.pts);
        timestamp_mappings_.push_back(TimestampMapping{.decoder_pts = normalized.pts, .source_pts = source_pts});
        while (timestamp_mappings_.size() > kMaxTimestampMappings) {
            timestamp_mappings_.pop_front();
        }
        return normalized;
    }

    std::int64_t ResolveSourcePts(std::int64_t decoder_pts) const {
        std::lock_guard lock(timestamp_mu_);
        if (timestamp_mappings_.empty()) {
            return decoder_pts;
        }

        std::int64_t best_source_pts = decoder_pts;
        std::int64_t best_diff = std::numeric_limits<std::int64_t>::max();
        for (auto it = timestamp_mappings_.rbegin(); it != timestamp_mappings_.rend(); ++it) {
            const std::int64_t diff = AbsDiff(it->decoder_pts, decoder_pts);
            if (diff >= best_diff) {
                continue;
            }
            best_diff = diff;
            best_source_pts = it->source_pts;
            if (diff == 0) {
                break;
            }
        }
        return best_diff <= kMaxTimestampMappingDistanceNs ? best_source_pts : decoder_pts;
    }

    void PullLoop() {
        auto* sink = GST_APP_SINK(appsink_);
        while (running_.load()) {
            GstSample* sample = gst_app_sink_try_pull_sample(sink, 200 * GST_MSECOND);
            if (sample == nullptr) {
                continue;
            }

            RawVideoFrame frame;
            frame.source_key = config_.source_key;
            frame.track_id = config_.track.track_id;

            GstCaps* caps = gst_sample_get_caps(sample);
            if (caps != nullptr && gst_caps_get_size(caps) > 0) {
                const GstStructure* structure = gst_caps_get_structure(caps, 0);
                gst_structure_get_int(structure, "width", &frame.width);
                gst_structure_get_int(structure, "height", &frame.height);
                frame.format = PixelFormatFromCaps(caps);
            }

            GstBuffer* buffer = gst_sample_get_buffer(sample);
            if (buffer != nullptr) {
                const std::int64_t decoder_pts =
                    GST_BUFFER_PTS_IS_VALID(buffer) ? static_cast<std::int64_t>(GST_BUFFER_PTS(buffer)) : 0;
                frame.pts = ResolveSourcePts(decoder_pts);
                GstMapInfo map;
                if (gst_buffer_map(buffer, &map, GST_MAP_READ) == TRUE) {
                    frame.data.assign(map.data, map.data + map.size);
                    gst_buffer_unmap(buffer, &map);
                }
            }

            if (callback_ != nullptr && !frame.data.empty()) {
                callback_(std::move(frame));
            }
            gst_sample_unref(sample);
        }
    }

    Config config_;
    FrameCallback callback_;
    std::atomic<bool> running_{false};
    GstElement* pipeline_{nullptr};
    GstElement* appsrc_{nullptr};
    GstElement* appsink_{nullptr};
    std::thread sink_thread_;
    mutable std::mutex timestamp_mu_;
    std::optional<std::int64_t> input_base_pts_;
    std::optional<std::int64_t> last_input_dts_;
    std::int64_t last_input_frame_duration_ns_{kDefaultVideoFrameDurationNs};
    std::deque<TimestampMapping> timestamp_mappings_;
};

#else

class StubRawVideoDecoder final : public RawVideoDecoder {
public:
    StubRawVideoDecoder(Config config, FrameCallback callback)
        : config_(std::move(config)), callback_(std::move(callback)) {}

    bool Start(std::string* error_message) override {
        if (error_message != nullptr) {
            *error_message = "analysis raw decoder requires MEDIA_SERVER_USE_GSTREAMER=ON";
        }
        return false;
    }

    void Stop() override {}

    bool PushPacket(const media::Packet& /*packet*/, std::string* error_message) override {
        if (error_message != nullptr) {
            *error_message = "analysis raw decoder is unavailable";
        }
        return false;
    }

    bool IsRunning() const override {
        return false;
    }

private:
    Config config_;
    FrameCallback callback_;
};

#endif

}  // namespace

std::unique_ptr<RawVideoDecoder> CreateRawVideoDecoder(RawVideoDecoder::Config config,
                                                       RawVideoDecoder::FrameCallback callback) {
#if MEDIA_SERVER_USE_GSTREAMER
    return std::make_unique<GstRawVideoDecoder>(std::move(config), std::move(callback));
#else
    return std::make_unique<StubRawVideoDecoder>(std::move(config), std::move(callback));
#endif
}

}  // namespace analysis
