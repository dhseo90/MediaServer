// 파일 요약: GStreamer appsrc/parser/muxer로 녹화 segment를 작성한다.
// 동작 요약: partial 파일을 EOS까지 닫은 뒤 rename하고 finalized metadata를 callback한다.
#include "recording/gstreamer_segment_writer.h"
#include "recording/retention_coordinator.h"
#include "recording/recording_finalize_recovery.h"
#include "recording/recording_catalog.h"
#include "recording/recording_writer_time_state.h"
#include "recording/recording_write_boundaries.h"
#include <iostream>

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
#include <fcntl.h>
#include <gst/app/gstappsrc.h>
#include <gst/gst.h>
#include <glib.h>
#include <sys/stat.h>
#include <unistd.h>
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
    const int fd=::open(path.c_str(),O_RDONLY|O_NOFOLLOW|O_CLOEXEC);
    struct stat before{},after{};
    if(fd<0)return {};
    if(::fstat(fd,&before)!=0||!S_ISREG(before.st_mode)||before.st_nlink!=1){::close(fd);return {};}
    GChecksum* checksum = g_checksum_new(G_CHECKSUM_SHA256);
    char buffer[64 * 1024];
    bool ok=true;
    for (;;) {
        const auto count=::read(fd,buffer,sizeof(buffer));
        if(count<0&&errno==EINTR)continue;
        if(count<0){ok=false;break;}
        if(count==0)break;
        if (count > 0) {
            g_checksum_update(checksum,
                              reinterpret_cast<const guchar*>(buffer),
                              static_cast<gssize>(count));
        }
    }
    ok=ok&&::fstat(fd,&after)==0&&before.st_dev==after.st_dev&&before.st_ino==after.st_ino&&before.st_size==after.st_size;
    ::close(fd);
    const char* digest = g_checksum_get_string(checksum);
    const std::string result = digest != nullptr ? digest : std::string(64, '0');
    g_checksum_free(checksum);
    return ok?result:std::string();
}

bool WriteCleanupMarkerDurably(const std::filesystem::path& storage_root,
                               const std::filesystem::path& path,
                               const std::filesystem::path& partial_path) {
    std::string error;
    const std::string contents =
        "recording-cleanup-pending-v2\npartial=" +
        partial_path.filename().string() + "\n";
    return WriteContainedFileDurably(
        storage_root, path, contents, &error);
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
        v2_mode=options.managed_journal || options.managed_catalog || !options.managed_store_id.empty();
        if(v2_mode && (!options.managed_journal || !options.managed_catalog ||
            !options.managed_catalog->ValidateManagedWriterBinding(*options.managed_journal,options.storage_root,options.managed_store_id,error)))
            return Fail(error,"V2 writer 관리 저장소 결박 오류");
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
        if (recovery_pending) return;
        if (!started || packet.kind != media::MediaKind::Video || packet.codec != video_track.codec) return;
#if MEDIA_SERVER_USE_GSTREAMER
        if(v2_mode) {PushV2Locked(packet);return;}
        if (has_last_pts && packet.pts < last_pts) {
            time_snapshot.Invalidate();
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
        time_snapshot.Invalidate();
#if MEDIA_SERVER_USE_GSTREAMER
        FinalizeLocked();
#endif
        started = false;
    }

    std::shared_ptr<const RecordingTimeSnapshot> TimeSnapshot() const {
        return time_snapshot.Get();
    }

private:
    bool Fail(std::string* error, const std::string& message) {
        if (error != nullptr) *error = message;
        return false;
    }

#if MEDIA_SERVER_USE_GSTREAMER
    static std::string NewId() {
        gchar* value=g_uuid_string_random();if(!value)return {};std::string out(value);g_free(value);return out;
    }
    void InputFailureLocked(const char* reason) {
        if(!input_failed)std::cerr<<"[recording-v2] input rejected reason="<<reason<<'\n';
        input_failed=true;
    }
    void PushV2Locked(const media::Packet& packet) {
        if(input_failed || packet.track_id!=video_track.track_id || packet.payload.empty())return;
        if(!packet.observation || packet.observation->source_generation.empty() || packet.observation->generation_order==0 || packet.observation->ordinal==0 ||
           !RecordingWriterTimeState::Signed(packet.observation->pts_ns) ||
           (packet.observation->dts_ns && !RecordingWriterTimeState::Signed(packet.observation->dts_ns))) {
            InputFailureLocked("original-timestamp-unavailable");return;
        }
        const auto& o=*packet.observation;
        const auto pts=static_cast<std::int64_t>(*o.pts_ns);
        const auto progress=static_cast<std::int64_t>(o.dts_ns.value_or(*o.pts_ns));
        const bool same=o.source_generation==source_generation;
        if(o.generation_order<generation_order)return;
        if((same && o.generation_order!=generation_order) ||
           (!same && !source_generation.empty() && o.generation_order==generation_order)) {
            InputFailureLocked("source-identity-conflict");return;
        }
        if(same && o.ordinal<=last_ordinal)return;
        if(!same) {
            FinalizeLocked();if(recovery_pending)return;
            source_generation=o.source_generation;generation_order=o.generation_order;last_ordinal=0;has_v2_progress=false;epoch_id=NewId();
        }
        if(has_v2_progress && progress<=v2_last_progress) {
            InputFailureLocked("decode-order-unavailable");return;
        }
        last_ordinal=o.ordinal;
        if(!segment_open) {
            if(!packet.is_key_frame)return;
            v2_origin=std::min(pts,progress);v2_segment_progress=progress;
            if(!OpenLocked(packet,0))return;
        } else if(packet.is_key_frame && static_cast<__int128>(progress)-v2_segment_progress>=
                  static_cast<__int128>(options.segment_duration_ms)*1000000) {
            FinalizeLocked();if(recovery_pending)return;
            v2_origin=std::min(pts,progress);v2_segment_progress=progress;
            if(!OpenLocked(packet,0))return;
        }
        if(pts<v2_origin || progress<v2_origin){InputFailureLocked("mux-origin-underflow");return;}
        const auto budget=current_reserved_bytes>options.container_overhead_reservation_bytes?
            current_reserved_bytes-options.container_overhead_reservation_bytes:0;
        if(reservation_active && (packet.payload.size()>budget-std::min(current_payload_bytes,budget))) {
            FinalizeLocked();admission_blocked=true;if(!packet.is_key_frame || recovery_pending)return;
            v2_origin=std::min(pts,progress);v2_segment_progress=progress;if(!OpenLocked(packet,0))return;
        }
        PushBufferLocked(packet,0);
        if(!input_failed) {v2_last_progress=progress;has_v2_progress=true;}
    }
    bool OpenLocked(const media::Packet& first, std::int64_t utc_ms) {
        if (recovery_pending) return false;
        std::string managed_id;
        if(v2_mode) {
            std::string error;managed_id=NewId();const auto request=NewId();
            if(managed_id.empty() || request.empty() ||
               !options.managed_catalog->ValidateManagedWriterBinding(*options.managed_journal,options.storage_root,options.managed_store_id,&error) ||
               !options.managed_journal->ReserveRecordingOrder(options.managed_store_id,request,managed_id,channel_id,&current_order,&error)) {
                InputFailureLocked("durable-order-reservation");return false;
            }
        }
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
            if (!v2_mode && (admission_blocked || decision.start_new_epoch)) {
                ++epoch_revision;
                epoch_id = base_epoch_id + "-r" + std::to_string(epoch_revision);
            }
            admission_blocked = false;
        }
        const std::string extension = video_track.codec == media::CodecId::H264 ? ".mp4" : ".webm";
        const std::string id = v2_mode?managed_id:"seg-" + SafeToken(channel_id) + "-" +
                               std::to_string(utc_ms) + "-" + std::to_string(++sequence);
        final_path = options.storage_root / SafeToken(channel_id) / (id + extension);
        partial_path = final_path;
        gchar* partial_nonce_raw = g_uuid_string_random();
        const std::string partial_nonce =
            partial_nonce_raw == nullptr ? std::string() : partial_nonce_raw;
        g_free(partial_nonce_raw);
        if (partial_nonce.empty()) {
            admission_blocked = true;
            segment_open = false;
            ReleaseReservationLocked(0);
            return false;
        }
        partial_path += ".partial." + partial_nonce;
        cleanup_marker_path = final_path;
        cleanup_marker_path += ".cleanup-pending";
        if (!WriteCleanupMarkerDurably(
                options.storage_root, cleanup_marker_path, partial_path)) {
            admission_blocked = true;
            segment_open = false;
            ReleaseReservationLocked(0);
            return false;
        }
        partial_fd = ::open(partial_path.c_str(),
                            O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW,
                            0600);
        if (partial_fd < 0) {
            admission_blocked = true;
            segment_open = false;
            if (ClearCleanupMarkerLocked()) ReleaseReservationLocked(0);
            return false;
        }

        pipeline = gst_pipeline_new(nullptr);
        appsrc = gst_element_factory_make("appsrc", nullptr);
        parser = gst_element_factory_make(
            video_track.codec == media::CodecId::H264 ? "h264parse" : "identity", nullptr);
        muxer = gst_element_factory_make(
            video_track.codec == media::CodecId::H264 ? "mp4mux" : "webmmux", nullptr);
        sink = gst_element_factory_make("fdsink", nullptr);
        if (pipeline == nullptr || appsrc == nullptr || parser == nullptr || muxer == nullptr || sink == nullptr) {
            ResetPipelineLocked();
            AbortSegmentFileLocked(partial_path, 0);
            return false;
        }
        g_object_set(appsrc, "is-live", TRUE, "format", GST_FORMAT_TIME, "block", TRUE, nullptr);
        g_object_set(sink, "fd", partial_fd, "sync", FALSE, nullptr);
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
        if(v2_mode) {
            current_v2=RecordingSegmentV2{};current_v2.segment_id=id;current_v2.source_id=channel_id;current_v2.channel_id=channel_id;
            current_v2.store_id=options.managed_store_id;current_v2.order_request_id=current_order.request_id;
            current_v2.order_sequence=current_order.sequence;current_v2.media_epoch_id=epoch_id;
            current_v2.container=video_track.codec==media::CodecId::H264?"mp4":"webm";
            current_v2.video_codecs={media::ToString(video_track.codec)};current_v2.audio_omitted_reason="source-no-audio";
            current_v2.created_at_ms=NowMs();v2_time.Start(v2_origin,id);
            current_source=RecordingSourceBindingV1{};
            current_source.segment_id=id;current_source.source_id=channel_id;current_source.channel_id=channel_id;
            current_source.store_id=current_v2.store_id;current_source.media_epoch_id=epoch_id;
            current_source.source_generation=source_generation;current_source.generation_order=generation_order;
            current_source.track_id=video_track.track_id;current_source.samples.reserve(4096);
        } else {
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
        }
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
        if(v2_mode) {
            const auto& o=*packet.observation;
            GST_BUFFER_PTS(buffer)=*o.pts_ns-static_cast<std::uint64_t>(v2_origin);
            GST_BUFFER_DTS(buffer)=o.dts_ns?*o.dts_ns-static_cast<std::uint64_t>(v2_origin):GST_CLOCK_TIME_NONE;
            if(o.duration_ns && *o.duration_ns>0 && *o.duration_ns<=static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max()))
                GST_BUFFER_DURATION(buffer)=*o.duration_ns;
        } else {
        GST_BUFFER_PTS(buffer) = static_cast<GstClockTime>(std::max<std::int64_t>(0, packet.pts - first_pts));
        GST_BUFFER_DTS(buffer) = packet.dts >= first_pts
                                     ? static_cast<GstClockTime>(packet.dts - first_pts)
                                     : GST_CLOCK_TIME_NONE;
        }
        if (!packet.is_key_frame) GST_BUFFER_FLAG_SET(buffer, GST_BUFFER_FLAG_DELTA_UNIT);
        bool accepted=gst_app_src_push_buffer(GST_APP_SRC(appsrc), buffer)==GST_FLOW_OK;
        if(v2_mode)accepted=detail::AcceptSourceSample(accepted,current_source,
            {packet.observation->ordinal,*packet.observation->pts_ns});
        if (!accepted) {
            if(v2_mode)InputFailureLocked("mux-push");return;
        }
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
        if(v2_mode) {
            const auto& observation=*packet.observation;
            v2_time.Accept(observation);return;
        }
        current.end.utc_ms = utc_ms;
        current.end.pts = packet.pts;
        current.end.time_base_num = 1;
        current.end.time_base_den = 1000000000;
        // appsrc가 수락한 실제 packet만 게시한다. finalize mutex를 조회자가 기다리지 않는다.
        time_snapshot.Publish(channel_id, epoch_id, packet.pts, utc_ms);
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
        struct stat output_status {};
        struct stat path_status {};
        const bool output_binding_ok = eos && partial_fd >= 0 &&
            ::fsync(partial_fd) == 0 && ::fstat(partial_fd, &output_status) == 0 &&
            ::lstat(partial_path.c_str(), &path_status) == 0 &&
            S_ISREG(output_status.st_mode) && S_ISREG(path_status.st_mode) &&
            output_status.st_nlink == 1 && path_status.st_nlink == 1 &&
            output_status.st_dev == path_status.st_dev &&
            output_status.st_ino == path_status.st_ino;
        ResetPipelineLocked();
        if (!output_binding_ok) {
            AbortSegmentFileLocked(partial_path, 0);
            return;
        }
        current.size_bytes = static_cast<std::uint64_t>(output_status.st_size);
        if (reservation_active && current_reserved_bytes > 0 &&
            current.size_bytes > current_reserved_bytes) {
            AbortSegmentFileLocked(partial_path, current.size_bytes);
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
        current.checksum_sha256 = FileSha256(partial_path);
        current.lifecycle = RecordingLifecycle::Finalized;
        current.finalized_at_ms = NowMs();
        if(current.checksum_sha256.size()!=64){AbortSegmentFileLocked(partial_path,current.size_bytes);return;}
        if(v2_mode) {
            current_v2.size_bytes=current.size_bytes;current_v2.checksum_sha256=current.checksum_sha256;
            current_v2.finalized_at_ms=current.finalized_at_ms;v2_time.Finish(&current_v2);
            std::string error;
            if(!ValidateRecordingSegmentV2(current_v2,&error)) {
                InputFailureLocked("final-metadata-invalid");BlockForRecoveryLocked();return;
            }
            FinalizeReadyTicket ready;ready.segment_v2=current_v2;ready.source_binding=current_source;
            ready.partial_relative=partial_path.lexically_relative(options.storage_root);
            ready.final_relative=final_path.lexically_relative(options.storage_root);
            if(!WriteFinalizeReadyTicket(options.storage_root,ready,&error) ||
               !CommitFinalizeReadyV2(*options.managed_catalog,options.storage_root,ready,&error)) {
                BlockForRecoveryLocked();return;
            }
            ReleaseReservationLocked(current_v2.size_bytes);segment_open=false;return;
        }
        // 양수 시간구간이 없는 단일 packet은 ready 작성 전의 미완결 출력이다.
        // ticket 작성을 시도한 이후의 불확실 보존/차단 경계와 구분한다.
        if (!ValidateRecordingSegmentV1(current, nullptr)) {
            AbortSegmentFileLocked(partial_path, current.size_bytes);
            return;
        }
        FinalizeReadyTicket ready{current,partial_path.lexically_relative(options.storage_root),final_path.lexically_relative(options.storage_root),std::nullopt,std::nullopt};
        std::string ready_error;
        if(!WriteFinalizeReadyTicket(options.storage_root,ready,&ready_error)||
           !PublishFinalizeReady(options.storage_root,ready,&ready_error)){
            BlockForRecoveryLocked();
            return;
        }
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
            BlockForRecoveryLocked();
            return;
        }
        if (!ClearFinalizeReady(options.storage_root,ready,&ready_error)) {
            BlockForRecoveryLocked();
            return;
        }
        ReleaseReservationLocked(current.size_bytes);
        segment_open = false;
    }

    void BlockForRecoveryLocked() {
        recovery_pending=true;
        admission_blocked=true;
        segment_open=false;
        std::cerr<<"[recording] finalize recovery pending; writer admission blocked until restart\n";
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
        if (partial_fd >= 0) {
            ::close(partial_fd);
            partial_fd = -1;
        }
    }
#endif

    Options options;
    RecordingTimeSnapshotPublisher time_snapshot;
    std::mutex mu;
    bool started{false};
    bool v2_mode{false};
    [[maybe_unused]] bool segment_open{false};
    [[maybe_unused]] bool has_last_pts{false};
    [[maybe_unused]] bool admission_blocked{false};
    [[maybe_unused]] bool recovery_pending{false};
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
    bool input_failed{false},has_v2_progress{false};
    std::int64_t v2_origin{0},v2_segment_progress{0},v2_last_progress{0};
    std::uint64_t last_ordinal{0},generation_order{0};
    std::string source_generation;
    RecordingOrderReservationV1 current_order;
    RecordingSegmentV2 current_v2;
    RecordingSourceBindingV1 current_source;
    RecordingWriterTimeState v2_time;
    int partial_fd{-1};
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

std::shared_ptr<const RecordingTimeSnapshot> GStreamerSegmentWriter::TimeSnapshot() const {
    return impl_->TimeSnapshot();
}

}  // namespace recording
