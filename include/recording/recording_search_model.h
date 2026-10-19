// 파일 용도: 녹화 검색의 재구축 가능한 불변 read model. 저장·미디어 실행에 의존하지 않는다.
#pragma once

#include "recording/recording_memory_reservation.h"
#include <cstddef>
#include <atomic>
#include <cstdint>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>
#include <iterator>
#include <stdexcept>

namespace recording {

enum class SearchDocumentKind { Recording, Observation };

// 관측의 event_ids와 확인된 EventRecord만 adapter가 결합한다. 이름과 ID를 혼용하지 않는다.
struct SearchEventFact {
    std::string event_id;
    std::string event_type;
    std::string scenario_name;
};

struct SearchDocument {
    std::string id;
    std::string channel_id;
    SearchDocumentKind kind{SearchDocumentKind::Recording};
    std::string segment_id;
    std::string source_id, store_id, media_epoch_id;
    std::string playback_segment_id, playback_event_id, playback_job_id;
    std::string observation_id;
    std::string reference_id;
    std::string analysis_namespace;
    std::string stream_epoch_id;
    std::string track_id;
    std::string object;
    // 시간 없는 관측을 UTC 0으로 대체하지 않는다. 점 관측은 [t,t+1ns)다.
    std::optional<std::int64_t> start_ns;
    std::optional<std::int64_t> end_ns;
    std::string time_provenance;
    std::optional<std::int64_t> uncertainty_ns;
    // 원본 segment 시간축. 파일 내 재생 offset은 별도 검증/변환한다.
    std::optional<std::int64_t> media_pts, media_end_pts;
    std::int32_t time_base_num{1}, time_base_den{1000000000};
    std::vector<std::string> event_ids;
    std::vector<std::string> zone_ids;
    std::vector<std::string> rule_ids;
    std::vector<SearchEventFact> event_facts;
    std::string unavailable_reason;
};

struct SearchModelLimits {
    std::size_t max_documents, max_bytes;
    std::shared_ptr<SearchModelResidency> residency;
    SearchModelLimits(std::size_t documents=100000,std::size_t bytes=64*1024*1024,
        std::shared_ptr<SearchModelResidency> owner={}):max_documents(documents),max_bytes(bytes),residency(std::move(owner)){}
};
// snapshot adapter가 복사 전에 같은 논리 admission을 적용한다. 미디어 건강도 검사는 아니다.
bool AccountSearchDocument(const SearchDocument&, std::size_t* bytes, std::size_t limit);
// 단일 소유 vector: DTO 본체·모든 문자열 capacity·하위 vector. 여유 capacity는 caller가 합산한다.
bool AccountOwnedSearchDocument(const SearchDocument&, std::size_t* bytes, std::size_t limit);
bool AppendOwnedSearchDocument(std::vector<SearchDocument>*,SearchDocument&&,std::size_t* bytes,SearchModelLimits);

// 성공한 source snapshot 사이의 변화분. 이력 유실/새 source instance는 Build로 재구축한다.
struct SearchModelDelta {
    std::string source_instance;
    std::uint64_t previous_revision{0}, revision{0};
    std::vector<SearchDocument> upserts;
    std::vector<std::string> removed_ids;
};

// HTTP 파싱 뒤의 값 계약. 시간은 UTC 밀리초이며 메타데이터 목록은 exact OR다.
struct RecordingSearchQuery {
    std::vector<std::string> channels, objects, tracks, events, zones, rules, behaviours;
    std::int64_t start_time_ms{0}, end_time_ms{0};
    bool include_unplaced{false};
    std::size_t limit{50};
};
bool NormalizeSearchQuery(const RecordingSearchQuery&, RecordingSearchQuery*, std::string* error);
struct RecordingSearchMatches {
    SearchModelResidency::Reservation memory;
    // 불변 모델 documents()의 위치다. 정렬 순서를 유지하고 관측을 합치지 않는다.
    std::vector<std::size_t> positions;
    std::size_t known_count{0}, unplaced_count{0};
    RecordingSearchMatches()=default;
    RecordingSearchMatches(const RecordingSearchMatches&)=default;
    RecordingSearchMatches(RecordingSearchMatches&&) noexcept=default;
    RecordingSearchMatches& operator=(RecordingSearchMatches other) noexcept {
        memory.swap(other.memory);std::swap(positions,other.positions);std::swap(known_count,other.known_count);std::swap(unplaced_count,other.unplaced_count);return *this;
    }
};

// 원본 snapshot의 일관성과 event 연결 검증은 adapter 책임이다. 이 모델은 파일 재생 증명이 아니다.
class RecordingSearchModel {
    friend class RecordingSearchReader;
    friend class RecordingCatalog;
public:
    RecordingSearchModel()=default;
    std::uint64_t diagnostic_identity() const noexcept{return memory_diagnostic::ModelIdentity(this);}
    RecordingSearchModel(const RecordingSearchModel&)=delete;
    RecordingSearchModel& operator=(const RecordingSearchModel&)=delete;
    static bool Build(const std::vector<SearchDocument>& documents,
                      const std::string& source_instance, std::uint64_t revision,
                      std::shared_ptr<const RecordingSearchModel>* output,
                      std::string* error, SearchModelLimits limits = {});
    // 인증된 준비 vector를 게시 모델로 이전한다. 실패 output 불변, 입력은 소비 가능하다.
    // caller의 준비 예약은 함수 반환까지 살아 있어야 한다. 게시 예약은 별도로 먼저 확보한다.
    static bool BuildOwned(std::vector<SearchDocument>&& documents,
                      const std::string& source_instance, std::uint64_t revision,
                      std::shared_ptr<const RecordingSearchModel>* output,
                      std::string* error, SearchModelLimits limits = {});
    // Full authenticated capture remains mandatory. The prior immutable model
    // supplies only an optional ordering hint; any incomplete proof uses full sort.
    static bool BuildOwnedAppend(std::vector<SearchDocument>&& documents,
                      const RecordingSearchModel& base,
                      const std::string& source_instance, std::uint64_t revision,
                      std::shared_ptr<const RecordingSearchModel>* output,
                      std::string* error, SearchModelLimits limits = {});
    // base와 caller output은 실패 시 불변이다. 보관 중인 검색 페이지의 base도 변경하지 않는다.
    static bool ApplyDelta(const RecordingSearchModel& base, const SearchModelDelta& delta,
                           std::shared_ptr<const RecordingSearchModel>* output,
                           std::string* error, SearchModelLimits limits = {});

    bool Query(const RecordingSearchQuery&, RecordingSearchMatches*, std::string* error) const;

    // 행동 근거 읽기의 대상만 좁힌다. 최종 Query/페이지 판정을 대체하지 않는다.
    bool BehaviourCandidates(const RecordingSearchQuery&, RecordingSearchMatches*, std::string* error) const;

    // Positions are model-local; payload need not be contiguous. No mutable
    // reference escapes a published model.
    class Documents {
        const RecordingSearchModel* model_;
    public:
        struct iterator {
            using iterator_category=std::forward_iterator_tag;
            using value_type=SearchDocument;using difference_type=std::ptrdiff_t;
            using pointer=const SearchDocument*;using reference=const SearchDocument&;
            const RecordingSearchModel* model=nullptr;std::size_t position=0;
            reference operator*()const{return model->Document(position);}
            pointer operator->()const{return &**this;}
            iterator& operator++(){++position;return *this;}
            iterator operator++(int){auto old=*this;++*this;return old;}
            bool operator==(const iterator& b)const{return model==b.model&&position==b.position;}
            bool operator!=(const iterator& b)const{return !(*this==b);}
        };
        explicit Documents(const RecordingSearchModel* model):model_(model){}
        std::size_t size()const{return model_->shared_documents_.empty()?model_->documents_.size():model_->shared_documents_.size();}
        bool empty()const{return size()==0;}
        const SearchDocument& operator[](std::size_t i)const{return model_->Document(i);}
        const SearchDocument& at(std::size_t i)const{if(i>=size())throw std::out_of_range("search position");return (*this)[i];}
        const SearchDocument& front()const{return (*this)[0];}
        const SearchDocument& back()const{return (*this)[size()-1];}
        iterator begin()const{return {model_,0};}iterator end()const{return {model_,size()};}
    };
    Documents documents() const { return Documents(this); }
    const std::vector<std::size_t>& Channel(const std::string& channel_id) const;
    const SearchDocument* Find(const std::string& id) const;
    std::optional<std::size_t> FindPosition(const std::string& id) const;
    const std::string& source_instance() const { return source_instance_; }
    std::uint64_t revision() const { return revision_; }
    std::size_t accounted_bytes() const { return accounted_bytes_; }
    const std::shared_ptr<SearchModelResidency>& residency()const{return residency_;}

private:
    struct DocumentBlock {
        SearchModelResidency::Reservation memory,overhead;
        std::vector<SearchDocument> documents;
    };
    const SearchDocument& Document(std::size_t i)const{return shared_documents_.empty()?documents_[i]:*shared_documents_[i];}
    std::shared_ptr<const SearchDocument> SharedDocument(const std::string& id)const {
        const auto it=ids_.find(id);return it==ids_.end()||shared_documents_.empty()?nullptr:shared_documents_[it->second];
    }
    void PromoteSourceStorage(SearchModelLimits) noexcept;
    static bool BuildShared(std::vector<SearchDocument>&,std::vector<std::shared_ptr<const SearchDocument>>&,
        const RecordingSearchModel*,const std::string&,std::uint64_t,
        std::shared_ptr<const RecordingSearchModel>*,std::string*,SearchModelLimits);
    static bool BuildOwnedImpl(std::vector<SearchDocument>&&, const std::string&, std::uint64_t,
        std::shared_ptr<const RecordingSearchModel>*, std::string*, SearchModelLimits,
        const RecordingSearchModel*);
    std::shared_ptr<SearchModelResidency> residency_;
    std::shared_ptr<void> residency_lease_;
    bool QueryImpl(const RecordingSearchQuery&, RecordingSearchMatches*, std::string*, bool skip_behaviour) const;
    std::string source_instance_;
    std::uint64_t revision_{0};
    std::size_t accounted_bytes_{0};
    std::vector<SearchDocument> documents_;
    SearchModelResidency::Reservation shared_index_memory_;
    std::vector<std::shared_ptr<const SearchDocument>> shared_documents_;
    std::unordered_map<std::string, std::vector<std::size_t>> channels_;
    std::unordered_map<std::string, std::size_t> ids_;
};

} // namespace recording
