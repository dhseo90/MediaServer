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

// 원본 snapshot의 일관성과 event 연결 검증은 adapter 책임이다. 이 모델은 파일 재생 증명이 아니다.
class RecordingSearchModel {
public:
    static bool Build(const std::vector<SearchDocument>& documents,
                      const std::string& source_instance, std::uint64_t revision,
                      std::shared_ptr<const RecordingSearchModel>* output,
                      std::string* error, SearchModelLimits limits = {});

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
