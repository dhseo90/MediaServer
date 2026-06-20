// 파일 요약: v3.0 Retention/Pin/Cleanup의 순수 cleanup 계획 계약을 선언한다.
// 동작 요약: EventRecord, EvidenceManifest, FeatureSet, SearchIndex lifecycle 삭제/보존 결정을 모델링한다.
#pragma once

#include <cstdint>
#include <map>
#include <string>
#include <vector>

namespace analysis {

struct EventRetentionCleanupPolicy {
    int default_retention_days{7};
    std::map<std::string, int> source_retention_days;
    std::map<std::string, int> rule_retention_days;
    bool pinned_excludes_automatic_cleanup{true};
    bool cleanup_requires_dry_run{true};
};

struct EventRetentionCleanupItem {
    std::string event_id;
    std::string source_id;
    std::string channel_id;
    std::string rule_id;
    std::int64_t event_time_ms{0};
    bool pinned{false};
    std::size_t evidence_manifest_count{1};
    std::size_t feature_revision_count{2};
    bool search_indexed{true};
    bool raw_prompt_stored{false};
    bool raw_provider_response_stored{false};
    bool event_post_payload_changed{false};
    bool webrtc_data_channel_schema_changed{false};
    bool sse_ws_metadata_schema_changed{false};
    bool rtsp_webrtc_media_path_changed{false};
    bool viewer_client_exposure_added{false};
};

struct EventRetentionCleanupAction {
    std::string event_id;
    std::string action;
    std::string reason;
    int retention_days{7};
    std::int64_t age_ms{0};
    bool pinned{false};
    bool event_record_deleted{false};
    std::size_t evidence_manifests_deleted{0};
    std::size_t feature_revisions_deleted{0};
    bool search_index_deindexed{false};
};

struct EventRetentionCleanupAuditEntry {
    std::string action;
    std::string event_id;
    std::string mode;
    std::string reason;
};

struct EventRetentionCleanupRequest {
    std::int64_t now_ms{0};
    bool dry_run{true};
    EventRetentionCleanupPolicy policy;
    std::vector<EventRetentionCleanupItem> items;
};

struct EventRetentionCleanupResult {
    std::string schema{"media-server.v300-retention-cleanup-report.v1"};
    bool dry_run{true};
    bool destructive_cleanup_executed{false};
    int default_retention_days{7};
    std::size_t expired_candidates{0};
    std::size_t retained_count{0};
    std::size_t pinned_retained{0};
    std::size_t deleted_event_records{0};
    std::size_t deleted_evidence_manifests{0};
    std::size_t deleted_feature_revisions{0};
    std::size_t deindexed_search_entries{0};
    std::string audit_action{"retention-cleanup-dry-run"};
    std::vector<EventRetentionCleanupAction> actions;
    std::vector<EventRetentionCleanupAuditEntry> audit_entries;
    bool raw_prompt_stored{false};
    bool raw_provider_response_stored{false};
    bool event_post_payload_changed{false};
    bool webrtc_data_channel_schema_changed{false};
    bool sse_ws_metadata_schema_changed{false};
    bool rtsp_webrtc_media_path_changed{false};
    bool viewer_client_exposure_added{false};
};

EventRetentionCleanupItem MakeRetentionCleanupItem(const std::string& event_id,
                                                   const std::string& source_id,
                                                   const std::string& channel_id,
                                                   const std::string& rule_id,
                                                   std::int64_t event_time_ms,
                                                   bool pinned);

EventRetentionCleanupResult BuildEventRetentionCleanupPlan(
    const EventRetentionCleanupRequest& request);
bool HasRetentionCleanupAction(const EventRetentionCleanupResult& result,
                               const std::string& event_id,
                               const std::string& action);
bool EventRetentionCleanupResultContainsForbiddenMaterial(
    const EventRetentionCleanupResult& result);
std::string EventRetentionCleanupResultJson(const EventRetentionCleanupResult& result);

}  // namespace analysis
