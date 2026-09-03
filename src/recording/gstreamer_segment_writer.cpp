// 파일 요약: GStreamer appsrc/parser/muxer로 녹화 segment를 작성한다.
// 동작 요약: partial 파일을 EOS까지 닫은 뒤 rename하고 finalized metadata를 callback한다.
#include "recording/gstreamer_segment_writer.h"
#include "recording/retention_coordinator.h"

#include <chrono>
#include <algorithm>
#include <cctype>
#include <fstream>
#include <iomanip>
#include <limits>
#include <mutex>
#include <sstream>

#ifndef MEDIA_SERVER_USE_GSTREAMER
#define MEDIA_SERVER_USE_GSTREAMER 0
#endif

#if MEDIA_SERVER_USE_GSTREAMER
#include <gst/app/gstappsrc.h>
#include <gst/gst.h>
#include <glib.h>
#endif

namespace recording {
namespace {

#if MEDIA_SERVER_USE_GSTREAMER
std::int64_t NowMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::system_clock::now().time_since_epoch())
        .count();
}

std::string SafeToken(std::string value) {
    for (char& ch : value) {
        const unsigned char byte = static_cast<unsigned char>(ch);
        if (!std::isalnum(byte) && ch != '-' && ch != '_') ch = '_';
    }
    return value.empty() ? "unknown" : value;
}

std::string FileSha256(const std::filesystem::path& path) {
    std::ifstream input(path, std::ios::binary);
    GChecksum* checksum = g_checksum_new(G_CHECKSUM_SHA256);
    char buffer[64 * 1024];
    while (input.good()) {
        input.read(buffer, sizeof(buffer));
        const auto count = input.gcount();
        if (count > 0) {
            g_checksum_update(checksum,
                              reinterpret_cast<const guchar*>(buffer),
                              static_cast<gssize>(count));
        }
    }
    const char* digest = g_checksum_get_string(checksum);
    const std::string result = digest != nullptr ? digest : std::string(64, '0');
    g_checksum_free(checksum);
    return result;
}

bool WriteCleanupMarkerDurably(const std::filesystem::path& storage_root,
                               const std::filesystem::path& path) {
    std::string error;
    return WriteContainedFileDurably(
        storage_root, path, "recording-cleanup-pending-v1\n", &error);
}
#endif

}  // namespace

class GStreamerSegmentWriter::Impl {
public:
    explicit Impl(Options input) : options(std::move(input)) {}

    bool Start(const std::string& input_channel_id,
               const std::string& input_epoch_id,
               const media::StreamDescriptor& input_descriptor,
               FinalizedCallback input_callback,
               std::string* error) {
        std::lock_guard lock(mu);
        if (started) return Fail(error, "segment writer가 이미 시작됨");
        if (options.segment_duration_ms <= 0) return Fail(error, "segment duration은 양수여야 함");
        if (input_channel_id.empty() || input_epoch_id.empty()) return Fail(error, "channel/epoch ID가 비어 있음");
        for (const auto& track : input_descriptor.tracks) {
            if (track.kind == media::MediaKind::Video &&
                (track.codec == media::CodecId::H264 || track.codec == media::CodecId::VP8)) {
                video_track = track;
                break;
            }
        }
        if (video_track.codec != media::CodecId::H264 && video_track.codec != media::CodecId::VP8) {
            return Fail(error, "녹화 지원 video codec(H264/VP8)가 없음");
        }
#if !MEDIA_SERVER_USE_GSTREAMER
        (void)input_callback;
        return Fail(error, "GStreamer 녹화 지원이 빌드되지 않음");
#else
        static std::once_flag gst_once;
        std::call_once(gst_once, [] { gst_init(nullptr, nullptr); });
        std::error_code fs_error;
        std::filesystem::create_directories(options.storage_root / SafeToken(input_channel_id), fs_error);
        if (fs_error) return Fail(error, "녹화 root 생성 실패: " + fs_error.message());
        const auto probe = options.storage_root / SafeToken(input_channel_id) / ".write-probe";
        {
            std::ofstream output(probe, std::ios::binary | std::ios::trunc);
            if (!output) return Fail(error, "녹화 root에 쓸 수 없음");
        }
        std::filesystem::remove(probe, fs_error);
        channel_id = input_channel_id;
        base_epoch_id = input_epoch_id;
        epoch_id = input_epoch_id;
        descriptor = input_descriptor;
        callback = std::move(input_callback);
        started = true;
        if (error != nullptr) error->clear();
        return true;
#endif
    }

    void Push(const media::Packet& packet, std::int64_t utc_ms) {
        std::lock_guard lock(mu);
        if (!started || packet.kind != media::MediaKind::Video || packet.codec != video_track.codec) return;
#if MEDIA_SERVER_USE_GSTREAMER
        if (has_last_pts && packet.pts < last_pts) {
            FinalizeLocked();
            ++epoch_revision;
            epoch_id = base_epoch_id + "-r" + std::to_string(epoch_revision);
            segment_open = false;
        }
        has_last_pts = true;
        last_pts = packet.pts;

        if (!segment_open) {
            if (!packet.is_key_frame || !OpenLocked(packet, utc_ms)) return;
        } else if (packet.is_key_frame && utc_ms - segment_start_utc_ms >= options.segment_duration_ms) {
            FinalizeLocked();
            if (!OpenLocked(packet, utc_ms)) return;
        }
        const std::uint64_t payload_budget =
            current_reserved_bytes > options.container_overhead_reservation_bytes
                ? current_reserved_bytes - options.container_overhead_reservation_bytes
                : 0;
        if (segment_open && current_reserved_bytes > 0 &&
            (packet.payload.size() >
             payload_budget - std::min(current_payload_bytes, payload_budget))) {
            const bool can_restart = packet.is_key_frame;
            FinalizeLocked();
            admission_blocked = true;
            if (!can_restart || !OpenLocked(packet, utc_ms)) return;
        }
        PushBufferLocked(packet, utc_ms);
#else
        (void)utc_ms;
#endif
    }

    void Stop() {
        std::lock_guard lock(mu);
#if MEDIA_SERVER_USE_GSTREAMER
        FinalizeLocked();
#endif
        started = false;
    }

private:
    bool Fail(std::string* error, const std::string& message) {
        if (error != nullptr) *error = message;
        return false;
    }

#if MEDIA_SERVER_USE_GSTREAMER
    bool OpenLocked(const media::Packet& first, std::int64_t utc_ms) {
        if (options.admit_segment) {
            SegmentAdmissionDecision decision;
            const std::uint64_t minimum_segment_bytes =
                first.payload.size() >
                        std::numeric_limits<std::uint64_t>::max() -
                            options.container_overhead_reservation_bytes
                    ? std::numeric_limits<std::uint64_t>::max()
                    : first.payload.size() + options.container_overhead_reservation_bytes;
            try {
                decision = options.admit_segment(channel_id, minimum_segment_bytes);
            } catch (...) {
                decision.allowed = false;
            }
            if (decision.allowed && decision.reserved_bytes < minimum_segment_bytes) {
                decision.allowed = false;
            }
            if (!decision.allowed) {
                admission_blocked = true;
                return false;
            }
            reservation_active = true;
            current_reserved_bytes = decision.reserved_bytes;
            if (admission_blocked || decision.start_new_epoch) {
                ++epoch_revision;
                epoch_id = base_epoch_id + "-r" + std::to_string(epoch_revision);
            }
            admission_blocked = false;
        }
        const std::string extension = video_track.codec == media::CodecId::H264 ? ".mp4" : ".webm";
        const std::string id = "seg-" + SafeToken(channel_id) + "-" +
                               std::to_string(utc_ms) + "-" + std::to_string(++sequence);
        final_path = options.storage_root / SafeToken(channel_id) / (id + extension);
        partial_path = final_path;
        partial_path += ".partial";
        cleanup_marker_path = final_path;
        cleanup_marker_path += ".cleanup-pending";
        if (!WriteCleanupMarkerDurably(options.storage_root, cleanup_marker_path)) {
            AbortSegmentFileLocked(final_path, 0);
            return false;
        }

        pipeline = gst_pipeline_new(nullptr);
        appsrc = gst_element_factory_make("appsrc", nullptr);
        parser = gst_element_factory_make(
            video_track.codec == media::CodecId::H264 ? "h264parse" : "identity", nullptr);
        muxer = gst_element_factory_make(
            video_track.codec == media::CodecId::H264 ? "mp4mux" : "webmmux", nullptr);
        sink = gst_element_factory_make("filesink", nullptr);
        if (pipeline == nullptr || appsrc == nullptr || parser == nullptr || muxer == nullptr || sink == nullptr) {
            ResetPipelineLocked();
            AbortSegmentFileLocked(partial_path, 0);
            return false;
        }
        g_object_set(appsrc, "is-live", TRUE, "format", GST_FORMAT_TIME, "block", TRUE, nullptr);
        g_object_set(sink, "location", partial_path.string().c_str(), "sync", FALSE, nullptr);
        GstCaps* caps = nullptr;
        if (!video_track.caps_string.empty()) caps = gst_caps_from_string(video_track.caps_string.c_str());
        if (caps == nullptr) {
            caps = gst_caps_from_string(video_track.codec == media::CodecId::H264
                                            ? "video/x-h264,stream-format=byte-stream,alignment=au"
                                            : "video/x-vp8");
        }
        gst_app_src_set_caps(GST_APP_SRC(appsrc), caps);
        gst_caps_unref(caps);
        gst_bin_add_many(GST_BIN(pipeline), appsrc, parser, muxer, sink, nullptr);
        if (!gst_element_link_many(appsrc, parser, muxer, sink, nullptr) ||
            gst_element_set_state(pipeline, GST_STATE_PLAYING) == GST_STATE_CHANGE_FAILURE) {
            ResetPipelineLocked();
            AbortSegmentFileLocked(partial_path, 0);
            return false;
        }
        current = RecordingSegmentV1{};
        current.segment_id = id;
        current.source_id = channel_id;
        current.channel_id = channel_id;
        current.stream_epoch_id = epoch_id;
        current.start.utc_ms = utc_ms;
        current.start.pts = first.pts;
        current.start.time_base_num = 1;
        current.start.time_base_den = 1000000000;
        current.end = current.start;
        current.container = video_track.codec == media::CodecId::H264 ? "mp4" : "webm";
        current.video_codecs = {media::ToString(video_track.codec)};
        current.audio_omitted_reason = "source-no-audio";
        current.retention_class = RecordingRetentionClass::Continuous;
        current.lifecycle = RecordingLifecycle::Writing;
        current.created_at_ms = NowMs();
        current_payload_bytes = 0;
        reported_on_disk_bytes = 0;
        segment_start_utc_ms = utc_ms;
        first_pts = first.pts;
        segment_open = true;
        return true;
    }

    void PushBufferLocked(const media::Packet& packet, std::int64_t utc_ms) {
        if (!segment_open || appsrc == nullptr || packet.payload.empty()) return;
        GstBuffer* buffer = gst_buffer_new_allocate(nullptr, packet.payload.size(), nullptr);
        gst_buffer_fill(buffer, 0, packet.payload.data(), packet.payload.size());
        const auto normalized_pts = static_cast<GstClockTime>(std::max<std::int64_t>(0, packet.pts - first_pts));
        GST_BUFFER_PTS(buffer) = normalized_pts;
        GST_BUFFER_DTS(buffer) = packet.dts >= first_pts
                                     ? static_cast<GstClockTime>(packet.dts - first_pts)
                                     : GST_CLOCK_TIME_NONE;
        if (!packet.is_key_frame) GST_BUFFER_FLAG_SET(buffer, GST_BUFFER_FLAG_DELTA_UNIT);
        if (gst_app_src_push_buffer(GST_APP_SRC(appsrc), buffer) != GST_FLOW_OK) return;
        current_payload_bytes = packet.payload.size() >
                                        std::numeric_limits<std::uint64_t>::max() -
                                            current_payload_bytes
                                    ? std::numeric_limits<std::uint64_t>::max()
                                    : current_payload_bytes + packet.payload.size();
        if (options.report_segment_progress && reservation_active) {
            std::error_code size_error;
            const std::uint64_t on_disk_bytes =
                std::filesystem::file_size(partial_path, size_error);
            if (!size_error && on_disk_bytes > reported_on_disk_bytes) {
                reported_on_disk_bytes = on_disk_bytes;
                try {
                    options.report_segment_progress(channel_id, reported_on_disk_bytes);
                } catch (...) {
                }
            }
        }
        current.end.utc_ms = utc_ms;
        current.end.pts = packet.pts;
        current.end.time_base_num = 1;
        current.end.time_base_den = 1000000000;
    }

    void FinalizeLocked() {
        if (!segment_open) return;
        if (appsrc != nullptr) gst_app_src_end_of_stream(GST_APP_SRC(appsrc));
        bool eos = false;
        if (pipeline != nullptr) {
            GstBus* bus = gst_element_get_bus(pipeline);
            GstMessage* message = gst_bus_timed_pop_filtered(
                bus, 5 * GST_SECOND, static_cast<GstMessageType>(GST_MESSAGE_EOS | GST_MESSAGE_ERROR));
            eos = message != nullptr && GST_MESSAGE_TYPE(message) == GST_MESSAGE_EOS;
            if (message != nullptr) gst_message_unref(message);
            gst_object_unref(bus);
            gst_element_set_state(pipeline, GST_STATE_NULL);
        }
        ResetPipelineLocked();
        if (!eos) {
            AbortSegmentFileLocked(partial_path, 0);
            return;
        }
        std::error_code fs_error;
        std::filesystem::rename(partial_path, final_path, fs_error);
        if (fs_error) {
            AbortSegmentFileLocked(partial_path, 0);
            return;
        }
        current.size_bytes = std::filesystem::file_size(final_path, fs_error);
        if (fs_error) {
            AbortSegmentFileLocked(final_path, 0);
            return;
        }
        if (reservation_active && current_reserved_bytes > 0 &&
            current.size_bytes > current_reserved_bytes) {
            AbortSegmentFileLocked(final_path, current.size_bytes);
            return;
        }
        if (options.report_segment_progress && reservation_active &&
            current.size_bytes > reported_on_disk_bytes) {
            reported_on_disk_bytes = current.size_bytes;
            try {
                options.report_segment_progress(channel_id, reported_on_disk_bytes);
            } catch (...) {
            }
        }
        current.checksum_sha256 = FileSha256(final_path);
        current.lifecycle = RecordingLifecycle::Finalized;
        current.finalized_at_ms = NowMs();
        bool finalized = true;
        if (callback) {
            std::string callback_error;
            try {
                finalized = callback(current, final_path.string(), &callback_error);
            } catch (...) {
                finalized = false;
            }
        }
        if (!finalized) {
            AbortSegmentFileLocked(final_path, current.size_bytes);
            return;
        }
        if (!ClearCleanupMarkerLocked()) {
            admission_blocked = true;
            segment_open = false;
            return;
        }
        ReleaseReservationLocked(current.size_bytes);
        segment_open = false;
    }

    bool ClearCleanupMarkerLocked() {
        std::string marker_error;
        return RemoveContainedMediaFile(
            options.storage_root, cleanup_marker_path, &marker_error);
    }

    void AbortSegmentFileLocked(const std::filesystem::path& path,
                                std::uint64_t observed_bytes) {
        std::string cleanup_error;
        const bool removed = RemoveContainedMediaFile(
            options.storage_root, path, &cleanup_error);
        admission_blocked = true;
        segment_open = false;
        if (removed) {
            if (ClearCleanupMarkerLocked()) ReleaseReservationLocked(observed_bytes);
            return;
        }
        if (TruncateContainedMediaFile(options.storage_root, path, &cleanup_error)) {
            if (ClearCleanupMarkerLocked()) ReleaseReservationLocked(observed_bytes);
        }
    }

    void ReleaseReservationLocked(std::uint64_t actual_segment_bytes) {
        if (!reservation_active) return;
        reservation_active = false;
        current_reserved_bytes = 0;
        current_payload_bytes = 0;
        reported_on_disk_bytes = 0;
        if (options.complete_segment) {
            try {
                options.complete_segment(channel_id, actual_segment_bytes);
            } catch (...) {
            }
        }
    }

    void ResetPipelineLocked() {
        if (pipeline != nullptr) {
            gst_element_set_state(pipeline, GST_STATE_NULL);
            gst_object_unref(pipeline);
        }
        pipeline = nullptr;
        appsrc = nullptr;
        parser = nullptr;
        muxer = nullptr;
        sink = nullptr;
    }
#endif

    Options options;
    std::mutex mu;
    bool started{false};
    [[maybe_unused]] bool segment_open{false};
    [[maybe_unused]] bool has_last_pts{false};
    [[maybe_unused]] bool admission_blocked{false};
    [[maybe_unused]] bool reservation_active{false};
    [[maybe_unused]] std::uint64_t sequence{0};
    [[maybe_unused]] std::uint64_t epoch_revision{0};
    [[maybe_unused]] std::uint64_t current_reserved_bytes{0};
    [[maybe_unused]] std::uint64_t current_payload_bytes{0};
    [[maybe_unused]] std::uint64_t reported_on_disk_bytes{0};
    [[maybe_unused]] std::int64_t last_pts{0};
    [[maybe_unused]] std::int64_t first_pts{0};
    [[maybe_unused]] std::int64_t segment_start_utc_ms{0};
    std::string channel_id;
    std::string base_epoch_id;
    std::string epoch_id;
    media::TrackInfo video_track;
    media::StreamDescriptor descriptor;
    FinalizedCallback callback;
    RecordingSegmentV1 current;
    std::filesystem::path partial_path;
    std::filesystem::path final_path;
    std::filesystem::path cleanup_marker_path;
#if MEDIA_SERVER_USE_GSTREAMER
    GstElement* pipeline{nullptr};
    GstElement* appsrc{nullptr};
    GstElement* parser{nullptr};
    GstElement* muxer{nullptr};
    GstElement* sink{nullptr};
#endif
};

GStreamerSegmentWriter::GStreamerSegmentWriter(Options options)
    : impl_(std::make_unique<Impl>(std::move(options))) {}

GStreamerSegmentWriter::~GStreamerSegmentWriter() { Stop(); }

bool GStreamerSegmentWriter::Start(const std::string& channel_id,
                                   const std::string& stream_epoch_id,
                                   const media::StreamDescriptor& descriptor,
                                   FinalizedCallback on_finalized,
                                   std::string* error) {
    return impl_->Start(channel_id, stream_epoch_id, descriptor, std::move(on_finalized), error);
}

void GStreamerSegmentWriter::Push(const media::Packet& packet, std::int64_t observed_utc_ms) {
    impl_->Push(packet, observed_utc_ms);
}

void GStreamerSegmentWriter::Stop() { impl_->Stop(); }

}  // namespace recording
