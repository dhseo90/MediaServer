// 파일 용도: 카탈로그가 잠금 안에서 내보내는 bounded 검색 값과 잠금 밖 원본 참조 해석 요청.
#pragma once
#include "recording/recording_contracts.h"
#include "recording/recording_search_model.h"
#include <array>
#include <map>

namespace recording {
struct SearchPendingReference {
    std::size_t document_index{0};
    RecordingConsumerReferenceV1 reference;
};
struct SearchSourceBatch {
    SearchModelResidency::Reservation memory;
    bool rebuild{true};
    std::uint64_t catalog_instance{0}, resolution_revision{0};
    std::vector<std::string> channels;
    SearchModelDelta delta;
    std::vector<SearchPendingReference> pending;
private:
    friend class RecordingCatalog;
    friend struct RecordingSearchRetryTestProbe;
    friend class RecordingSearchReader;
    struct SegmentSpan {
        std::array<unsigned char,32> digest{};
        std::size_t raw_bytes=0,begin=0,count=0;
        RecordingLifecycle lifecycle{RecordingLifecycle::Unknown};
    };
    // A single HTTP retry owns this evidence, never a published/cache model.
    std::map<std::string,SegmentSpan> segment_spans_;
    const SearchModelResidency* residency_=nullptr;
    std::size_t max_documents_=0,max_bytes_=0,reused_segments_=0;
public:
    SearchSourceBatch()=default;
    SearchSourceBatch(const SearchSourceBatch&)=default;
    SearchSourceBatch(SearchSourceBatch&&) noexcept=default;
    SearchSourceBatch& operator=(SearchSourceBatch other) noexcept {
        memory.swap(other.memory);std::swap(rebuild,other.rebuild);std::swap(catalog_instance,other.catalog_instance);std::swap(resolution_revision,other.resolution_revision);std::swap(channels,other.channels);std::swap(delta,other.delta);std::swap(pending,other.pending);segment_spans_.swap(other.segment_spans_);std::swap(residency_,other.residency_);std::swap(max_documents_,other.max_documents_);std::swap(max_bytes_,other.max_bytes_);std::swap(reused_segments_,other.reused_segments_);return *this;
    }
};
// 같은 채널 집합은 순서와 무관하게 같은 내부 모델 identity를 만든다. 공개 응답용 ID가 아니다.
std::string SearchSourceIdentity(std::uint64_t instance, std::vector<std::string> channels);
} // namespace recording
