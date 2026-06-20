// 파일 요약: v3.0 Retention/Pin/Cleanup의 순수 cleanup 계획 계약을 구현한다.
// 동작 요약: pinned event를 자동 cleanup에서 제외하고 dry-run/apply lifecycle action과 audit를 산출한다.
#include "analysis/event_retention_cleanup.h"

#include <algorithm>
#include <sstream>

namespace analysis {

namespace {

constexpr std::int64_t kMsPerDay = 24LL * 60LL * 60LL * 1000LL;

std::string JsonEscape(const std::string& value) {
    std::string out;
    out.reserve(value.size() + 8);
    for (const char ch : value) {
        switch (ch) {
            case '\\':
                out += "\\\\";
                break;
            case '"':
                out += "\\\"";
                break;
            case '\n':
                out += "\\n";
                break;
            case '\r':
                out += "\\r";
                break;
            case '\t':
                out += "\\t";
                break;
            default:
                out.push_back(ch);
                break;
        }
    }
    return out;
}

int NormalizeRetentionDays(int days) {
    return days <= 0 ? 7 : days;
}

int RetentionDaysFor(const EventRetentionCleanupPolicy& policy,
                     const EventRetentionCleanupItem& item) {
    const auto rule = policy.rule_retention_days.find(item.rule_id);
    if (rule != policy.rule_retention_days.end()) {
        return NormalizeRetentionDays(rule->second);
    }
    const auto source = policy.source_retention_days.find(item.source_id);
    if (source != policy.source_retention_days.end()) {
        return NormalizeRetentionDays(source->second);
    }
    return NormalizeRetentionDays(policy.default_retention_days);
}

bool HasBoundaryViolation(const EventRetentionCleanupItem& item) {
    return item.raw_prompt_stored || item.raw_provider_response_stored ||
           item.event_post_payload_changed || item.webrtc_data_channel_schema_changed ||
           item.sse_ws_metadata_schema_changed || item.rtsp_webrtc_media_path_changed ||
           item.viewer_client_exposure_added;
}

EventRetentionCleanupAuditEntry MakeAuditEntry(const EventRetentionCleanupResult& result,
                                               std::size_t action_count) {
    EventRetentionCleanupAuditEntry entry;
    entry.action = result.audit_action;
    entry.mode = result.dry_run ? "dry-run" : "apply";
    entry.event_id = "retention-cleanup-summary";
    entry.reason = "expiredCandidates=" + std::to_string(action_count);
    return entry;
}

}  // namespace

EventRetentionCleanupItem MakeRetentionCleanupItem(const std::string& event_id,
                                                   const std::string& source_id,
                                                   const std::string& channel_id,
                                                   const std::string& rule_id,
                                                   std::int64_t event_time_ms,
                                                   bool pinned) {
    EventRetentionCleanupItem item;
    item.event_id = event_id;
    item.source_id = source_id;
    item.channel_id = channel_id;
    item.rule_id = rule_id;
    item.event_time_ms = event_time_ms;
    item.pinned = pinned;
    item.evidence_manifest_count = 1;
    item.feature_revision_count = 2;
    item.search_indexed = true;
    return item;
}

EventRetentionCleanupResult BuildEventRetentionCleanupPlan(
    const EventRetentionCleanupRequest& request) {
    EventRetentionCleanupResult result;
    result.dry_run = request.dry_run;
    result.destructive_cleanup_executed = !request.dry_run;
    result.default_retention_days = NormalizeRetentionDays(request.policy.default_retention_days);
    result.audit_action = request.dry_run ? "retention-cleanup-dry-run"
                                          : "retention-cleanup-apply";

    for (const auto& item : request.items) {
        if (HasBoundaryViolation(item)) {
            result.raw_prompt_stored = result.raw_prompt_stored || item.raw_prompt_stored;
            result.raw_provider_response_stored =
                result.raw_provider_response_stored || item.raw_provider_response_stored;
            result.event_post_payload_changed =
                result.event_post_payload_changed || item.event_post_payload_changed;
            result.webrtc_data_channel_schema_changed =
                result.webrtc_data_channel_schema_changed || item.webrtc_data_channel_schema_changed;
            result.sse_ws_metadata_schema_changed =
                result.sse_ws_metadata_schema_changed || item.sse_ws_metadata_schema_changed;
            result.rtsp_webrtc_media_path_changed =
                result.rtsp_webrtc_media_path_changed || item.rtsp_webrtc_media_path_changed;
            result.viewer_client_exposure_added =
                result.viewer_client_exposure_added || item.viewer_client_exposure_added;
            continue;
        }

        EventRetentionCleanupAction action;
        action.event_id = item.event_id;
        action.retention_days = RetentionDaysFor(request.policy, item);
        action.age_ms = std::max<std::int64_t>(0, request.now_ms - item.event_time_ms);
        action.pinned = item.pinned;

        const std::int64_t retention_ms = static_cast<std::int64_t>(action.retention_days) * kMsPerDay;
        const bool expired = action.age_ms > retention_ms;
        if (item.pinned && request.policy.pinned_excludes_automatic_cleanup) {
            action.action = "retain-pinned";
            action.reason = "pinned-excluded-from-automatic-cleanup";
            ++result.retained_count;
            ++result.pinned_retained;
        } else if (!expired) {
            action.action = "retain-active-window";
            action.reason = "within-retention-window";
            ++result.retained_count;
        } else {
            action.action = request.dry_run ? "would-delete" : "deleted";
            action.reason = request.dry_run ? "dry-run-expired-retention"
                                            : "apply-expired-retention";
            ++result.expired_candidates;
            if (!request.dry_run) {
                action.event_record_deleted = true;
                action.evidence_manifests_deleted = item.evidence_manifest_count;
                action.feature_revisions_deleted = item.feature_revision_count;
                action.search_index_deindexed = item.search_indexed;
                ++result.deleted_event_records;
                result.deleted_evidence_manifests += item.evidence_manifest_count;
                result.deleted_feature_revisions += item.feature_revision_count;
                if (item.search_indexed) {
                    ++result.deindexed_search_entries;
                }
            }
        }
        result.actions.push_back(action);
    }

    if (result.expired_candidates > 0 || !request.items.empty()) {
        result.audit_entries.push_back(MakeAuditEntry(result, result.expired_candidates));
    }
    return result;
}

bool HasRetentionCleanupAction(const EventRetentionCleanupResult& result,
                               const std::string& event_id,
                               const std::string& action) {
    return std::any_of(result.actions.begin(), result.actions.end(), [&](const auto& item) {
        return item.event_id == event_id && item.action == action;
    });
}

bool EventRetentionCleanupResultContainsForbiddenMaterial(
    const EventRetentionCleanupResult& result) {
    return result.raw_prompt_stored || result.raw_provider_response_stored ||
           result.event_post_payload_changed || result.webrtc_data_channel_schema_changed ||
           result.sse_ws_metadata_schema_changed || result.rtsp_webrtc_media_path_changed ||
           result.viewer_client_exposure_added;
}

std::string EventRetentionCleanupResultJson(const EventRetentionCleanupResult& result) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"" << JsonEscape(result.schema) << "\","
        << "\"dryRun\":" << (result.dry_run ? "true" : "false") << ","
        << "\"destructiveCleanupExecuted\":"
        << (result.destructive_cleanup_executed ? "true" : "false") << ","
        << "\"defaultRetentionDays\":" << result.default_retention_days << ","
        << "\"expiredCandidates\":" << result.expired_candidates << ","
        << "\"retainedCount\":" << result.retained_count << ","
        << "\"pinnedRetained\":" << result.pinned_retained << ","
        << "\"deletedEventRecords\":" << result.deleted_event_records << ","
        << "\"deletedEvidenceManifests\":" << result.deleted_evidence_manifests << ","
        << "\"deletedFeatureRevisions\":" << result.deleted_feature_revisions << ","
        << "\"deindexedSearchEntries\":" << result.deindexed_search_entries << ","
        << "\"auditAction\":\"" << JsonEscape(result.audit_action) << "\","
        << "\"contractInvariants\":{"
        << "\"rawPromptStored\":" << (result.raw_prompt_stored ? "true" : "false") << ","
        << "\"rawProviderResponseStored\":"
        << (result.raw_provider_response_stored ? "true" : "false") << ","
        << "\"eventPostPayloadChanged\":"
        << (result.event_post_payload_changed ? "true" : "false") << ","
        << "\"webrtcDataChannelSchemaChanged\":"
        << (result.webrtc_data_channel_schema_changed ? "true" : "false") << ","
        << "\"sseWsMetadataSchemaChanged\":"
        << (result.sse_ws_metadata_schema_changed ? "true" : "false") << ","
        << "\"rtspWebrtcMediaPathChanged\":"
        << (result.rtsp_webrtc_media_path_changed ? "true" : "false") << ","
        << "\"viewerClientExposureAdded\":"
        << (result.viewer_client_exposure_added ? "true" : "false")
        << "},"
        << "\"actions\":[";
    for (std::size_t i = 0; i < result.actions.size(); ++i) {
        const auto& action = result.actions[i];
        if (i != 0) {
            out << ",";
        }
        out << "{"
            << "\"eventId\":\"" << JsonEscape(action.event_id) << "\","
            << "\"action\":\"" << JsonEscape(action.action) << "\","
            << "\"reason\":\"" << JsonEscape(action.reason) << "\","
            << "\"retentionDays\":" << action.retention_days << ","
            << "\"pinned\":" << (action.pinned ? "true" : "false")
            << "}";
    }
    out << "]}";
    return out.str();
}

}  // namespace analysis
