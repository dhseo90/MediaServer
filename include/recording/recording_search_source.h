// 파일 용도: 카탈로그가 잠금 안에서 내보내는 bounded 검색 값과 잠금 밖 원본 참조 해석 요청.
#pragma once
#include "recording/recording_contracts.h"
#include "recording/recording_search_model.h"

namespace recording {
struct SearchPendingReference {
    std::size_t document_index{0};
    RecordingConsumerReferenceV1 reference;
};
struct SearchSourceBatch {
    SearchModelResidency::Reservation memory;
    bool rebuild{true};
    std::uint64_t catalog_instance{0}, resolution_revision{0};
    SearchModelDelta delta;
    std::vector<SearchPendingReference> pending;
    SearchSourceBatch()=default;
    SearchSourceBatch(const SearchSourceBatch&)=default;
    SearchSourceBatch(SearchSourceBatch&&) noexcept=default;
    SearchSourceBatch& operator=(SearchSourceBatch other) noexcept {
        memory.swap(other.memory);std::swap(rebuild,other.rebuild);std::swap(catalog_instance,other.catalog_instance);std::swap(resolution_revision,other.resolution_revision);std::swap(delta,other.delta);std::swap(pending,other.pending);return *this;
    }
};
// 같은 채널 집합은 순서와 무관하게 같은 내부 모델 identity를 만든다. 공개 응답용 ID가 아니다.
std::string SearchSourceIdentity(std::uint64_t instance, std::vector<std::string> channels);
} // namespace recording
