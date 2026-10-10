// 파일 용도: 원본 증명과 정확한 미디어 좌표에 결박된 증거 프레임 추출.
#pragma once
#include "recording/recording_read_service.h"
#include <chrono>
#include <functional>

namespace recording {
struct EvidenceFrameV1Fields {
    std::string segment_id, media_sha256, sample_sha256, rgb_sha256, png_sha256;
    std::string source_generation, media_epoch_id, track_id;
    std::uint64_t generation_order{0}, sample_ordinal{0};
    std::int64_t pts_ns{0}, presentation_ns{0};
    std::optional<std::int64_t> utc_ns;
    std::string time_provenance;
    std::optional<std::int64_t> uncertainty_ns;
    // 기존 V1의 UTC는 ms다. unknown에 0을 넣지 않고 null로 둔다.
    std::optional<FrameLocatorV1> locator;
    int width{0}, height{0};
    std::vector<std::uint8_t> png;
};
using EvidenceFrameV1=RecordingMemoryValue<EvidenceFrameV1Fields>;
std::string EvidenceSha256(const void* bytes, std::size_t size);
bool EvidenceIsSha256(const std::string&);
class EvidenceFrameExtractor {
public:
    EvidenceFrameExtractor(RecordingCatalog& catalog, RecordingReadService& reader)
        : catalog_(catalog), reader_(reader) {}
    bool Extract(const std::string& channel, const FrameLocatorV1& locator,
        const std::string& expected_media_sha256, EvidenceFrameV1*, std::string* error,
        std::chrono::steady_clock::time_point deadline, const std::function<bool()>& cancelled = {}) const;
    bool ExtractMedia(const std::string& channel, const std::string& segment, std::int64_t pts_ns,
        const std::string& expected_media_sha256, EvidenceFrameV1*, std::string* error,
        std::chrono::steady_clock::time_point deadline, const std::function<bool()>& cancelled = {}) const;
private:
    RecordingCatalog& catalog_;
    RecordingReadService& reader_;
};
} // namespace recording
