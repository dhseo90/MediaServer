// 파일 용도: 서버가 선택한 검색 hit를 증거 패키지로 확정하는 application-independent 연결.
#pragma once
#include "recording/evidence_package_store.h"
#include "recording/recording_search_model.h"

namespace recording {
class EvidencePackageBuilder {
public:
    EvidencePackageBuilder(RecordingCatalog& catalog, RecordingReadService& reader, EvidencePackageStore& store)
        : catalog_(catalog), reader_(reader), store_(store) {}
    bool Create(const SearchDocument& hit, const std::string& query_kind,
        const std::string& expected_media_sha256, std::string* id, EvidencePackageV1*, std::string* error,
        std::chrono::steady_clock::time_point deadline, const std::function<bool()>& cancelled = {}) const;
    static bool SelectSamples(const SearchDocument&, const RecordingSourceBindingV1&,
        std::vector<std::int64_t>*, std::string* error);
private:
    RecordingCatalog& catalog_;
    RecordingReadService& reader_;
    EvidencePackageStore& store_;
};
} // namespace recording
