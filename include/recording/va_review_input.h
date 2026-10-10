// 파일 용도: 검증된 불변 패키지에서 VA 검토 입력과 재현용 metadata를 구성한다.
#pragma once
#include "recording/evidence_package_store.h"

namespace recording {
struct VaReviewInputFields {
    std::string package_id, manifest_sha256, question;
    EvidencePackageV1 manifest;
    std::vector<std::size_t> asset_indices;
    // 실행 중에만 보유하며 입력 metadata나 검토 결과에 직렬화하지 않는다.
    std::vector<std::vector<std::uint8_t>> pngs;
};
using VaReviewInput=RecordingMemoryValue<VaReviewInputFields>;
constexpr std::size_t kVaReviewInputBytes = 12ULL * 1024 * 1024;
bool VaReviewText(const std::string&, std::size_t limit = 512);
bool LoadVaReviewInput(const EvidencePackageStore&, const std::string& id,
    const std::string& question, const std::function<bool(const std::string&)>& authorize,
    VaReviewInput*, std::string* error, const std::function<bool()>& cancelled = {});
std::string SerializeVaReviewInput(const VaReviewInput&);
bool ParseVaReviewInput(const std::string&, VaReviewInput*, std::string* error);
} // namespace recording
