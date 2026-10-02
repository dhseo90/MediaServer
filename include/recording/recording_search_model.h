// 파일 용도: 녹화 검색의 재구축 가능한 불변 read model. 저장·미디어 실행에 의존하지 않는다.
#pragma once

#include <cstddef>
#include <cstdint>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

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
    std::optional<std::int64_t> media_pts;
    std::int32_t time_base_num{1}, time_base_den{1000000000};
    std::vector<std::string> event_ids;
    std::vector<std::string> zone_ids;
    std::vector<std::string> rule_ids;
    std::vector<SearchEventFact> event_facts;
    std::string unavailable_reason;
};

struct SearchModelLimits {
    std::size_t max_documents{100000};
    std::size_t max_bytes{64 * 1024 * 1024};
};
// snapshot adapter가 복사 전에 같은 논리 admission을 적용한다. 미디어 건강도 검사는 아니다.
bool AccountSearchDocument(const SearchDocument&, std::size_t* bytes, std::size_t limit);

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
    // 불변 모델 documents()의 위치다. 정렬 순서를 유지하고 관측을 합치지 않는다.
    std::vector<std::size_t> positions;
    std::size_t known_count{0}, unplaced_count{0};
};

// 원본 snapshot의 일관성과 event 연결 검증은 adapter 책임이다. 이 모델은 파일 재생 증명이 아니다.
class RecordingSearchModel {
public:
    static bool Build(const std::vector<SearchDocument>& documents,
                      const std::string& source_instance, std::uint64_t revision,
                      std::shared_ptr<const RecordingSearchModel>* output,
                      std::string* error, SearchModelLimits limits = {});
    // base와 caller output은 실패 시 불변이다. 보관 중인 검색 페이지의 base도 변경하지 않는다.
    static bool ApplyDelta(const RecordingSearchModel& base, const SearchModelDelta& delta,
                           std::shared_ptr<const RecordingSearchModel>* output,
                           std::string* error, SearchModelLimits limits = {});

    bool Query(const RecordingSearchQuery&, RecordingSearchMatches*, std::string* error) const;

    const std::vector<SearchDocument>& documents() const { return documents_; }
    const std::vector<std::size_t>& Channel(const std::string& channel_id) const;
    const SearchDocument* Find(const std::string& id) const;
    const std::string& source_instance() const { return source_instance_; }
    std::uint64_t revision() const { return revision_; }
    std::size_t accounted_bytes() const { return accounted_bytes_; }

private:
    std::string source_instance_;
    std::uint64_t revision_{0};
    std::size_t accounted_bytes_{0};
    std::vector<SearchDocument> documents_;
    std::unordered_map<std::string, std::vector<std::size_t>> channels_;
    std::unordered_map<std::string, std::size_t> ids_;
};

} // namespace recording
