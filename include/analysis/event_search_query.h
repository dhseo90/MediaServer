// 파일 요약: v3.0 Search DSL and Query Convert의 순수 계약을 선언한다.
// 동작 요약: 자연어 query를 제한된 Search DSL로 변환하고 text/tags/filter 검색을 수행한다.
#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace analysis {

struct EventSearchFilter {
    std::string field;
    std::string op;
    std::string value;
};

struct EventSearchFieldValue {
    std::string field;
    std::string value;
};

struct EventSearchDsl {
    std::string schema{"media-server.event-search-dsl.v1"};
    bool valid{true};
    std::string rejection_reason;
    std::vector<std::string> text_terms;
    std::vector<std::string> tags;
    std::vector<EventSearchFilter> filters;
    std::string sort{"eventTimeDesc"};
    std::size_t limit{50};
    std::size_t offset{0};
    bool strict_structured_output{true};
    bool raw_llm_prompt_stored{false};
    bool raw_provider_response_stored{false};
    bool runtime_provider_call_performed{false};
    bool vector_search_performed{false};
    bool search_index_required{false};
    bool ops_events_ui_required{false};
    bool event_post_payload_changed{false};
    bool webrtc_data_channel_schema_changed{false};
    bool sse_ws_metadata_schema_changed{false};
    bool rtsp_webrtc_media_path_changed{false};
    bool viewer_client_exposure_added{false};
};

struct EventSearchQueryOptions {
    std::size_t default_limit{50};
    std::size_t max_limit{100};
    std::size_t max_offset{10000};
    std::string default_sort{"eventTimeDesc"};
};

struct EventSearchDocument {
    std::string event_id;
    std::string source_id;
    std::string channel_id;
    std::string event_type;
    std::string scenario;
    std::string status;
    std::string zone_id;
    std::string line_id;
    std::string class_name;
    std::string review_state;
    std::int64_t timestamp_ms{0};
    bool pinned{false};
    std::string searchable_text;
    std::vector<std::string> tags;
    std::vector<EventSearchFieldValue> features;
};

EventSearchDsl ConvertEventSearchQueryToDsl(const std::string& query,
                                            const EventSearchQueryOptions& options = {});
bool EventSearchDocumentMatches(const EventSearchDocument& document, const EventSearchDsl& dsl);
std::vector<EventSearchDocument> SearchEventDocuments(const std::vector<EventSearchDocument>& documents,
                                                      const EventSearchDsl& dsl);
std::string EventSearchDslJson(const EventSearchDsl& dsl);
bool EventSearchDslContainsForbiddenMaterial(const EventSearchDsl& dsl);

}  // namespace analysis
