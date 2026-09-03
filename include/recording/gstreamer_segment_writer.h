// 파일 요약: H.264/VP8 encoded packet을 MP4/WebM segment로 finalize하는 writer를 선언한다.
// 동작 요약: 첫 keyframe 시작, keyframe 기반 분할, PTS rollback epoch 전환과 atomic rename을 제공한다.
#pragma once

#include <filesystem>
#include <memory>
#include <utility>

#include "recording/segment_writer.h"

namespace recording {

class GStreamerSegmentWriter final : public SegmentWriter {
public:
    struct Options {
        std::filesystem::path storage_root;
        std::int64_t segment_duration_ms{10000};
        std::uint64_t container_overhead_reservation_bytes{1024ULL * 1024ULL};
        AdmissionCallback admit_segment;
        SegmentProgressCallback report_segment_progress;
        SegmentCompletionCallback complete_segment;

        Options() = default;
        Options(std::filesystem::path root, std::int64_t duration_ms)
            : storage_root(std::move(root)), segment_duration_ms(duration_ms) {}
    };

    explicit GStreamerSegmentWriter(Options options);
    ~GStreamerSegmentWriter() override;
    GStreamerSegmentWriter(const GStreamerSegmentWriter&) = delete;
    GStreamerSegmentWriter& operator=(const GStreamerSegmentWriter&) = delete;

    bool Start(const std::string& channel_id,
               const std::string& stream_epoch_id,
               const media::StreamDescriptor& descriptor,
               FinalizedCallback on_finalized,
               std::string* error) override;
    void Push(const media::Packet& packet, std::int64_t observed_utc_ms) override;
    void Stop() override;

private:
    class Impl;
    std::unique_ptr<Impl> impl_;
};

}  // namespace recording
