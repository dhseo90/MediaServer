// 파일 요약: v3.0 Feature-only Retention의 FeatureSet revision 보존 계약을 구현한다.
// 동작 요약: raw prompt/response/provider material을 거부하고 구조화된 FeatureSet revision과 재분석 이력만 보존한다.
#include "analysis/vlm_feature_retention.h"

#include <algorithm>
#include <sstream>

namespace analysis {

namespace {

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

bool Contains(const std::string& text, const std::string& needle) {
    return text.find(needle) != std::string::npos;
}

int ExtractFeatureRevision(const std::string& json) {
    const std::string key = "\"featureRevision\":";
    const std::size_t pos = json.find(key);
    if (pos == std::string::npos) {
        return 0;
    }
    std::size_t cursor = pos + key.size();
    while (cursor < json.size() && json[cursor] == ' ') {
        ++cursor;
    }
    int value = 0;
    while (cursor < json.size() && json[cursor] >= '0' && json[cursor] <= '9') {
        value = (value * 10) + (json[cursor] - '0');
        ++cursor;
    }
    return value;
}

bool IsStructuredFeatureSet(const std::string& json, const std::string& event_id) {
    return Contains(json, "\"schema\":\"media-server.event-feature-set.v1\"") &&
           Contains(json, "\"eventId\":\"" + event_id + "\"") &&
           Contains(json, "\"featureRevision\":") &&
           Contains(json, "\"rawPromptStored\":false") &&
           Contains(json, "\"rawProviderResponseStored\":false") &&
           Contains(json, "\"identityFeaturesAllowed\":false") &&
           !HasRawRetentionMaterial(json);
}

VlmFeatureRetentionOutcome MakeOutcome(const VlmFeatureRetentionRequest& request,
                                       const std::string& status,
                                       const std::string& action,
                                       const std::string& failure_reason = "") {
    VlmFeatureRetentionOutcome outcome;
    outcome.event_id = request.event_id;
    outcome.feature_set_id = request.feature_set_id;
    outcome.status = status;
    outcome.retention_action = action;
    outcome.failure_reason = failure_reason;
    outcome.raw_prompt_stored = false;
    outcome.raw_provider_response_stored = false;
    outcome.provider_request_body_stored = false;
    outcome.credential_stored = false;
    outcome.source_url_stored = false;
    outcome.raw_frame_bytes_stored = false;
    outcome.runtime_provider_replay_performed = false;
    outcome.event_record_blocked = false;
    outcome.event_post_payload_changed = false;
    outcome.webrtc_data_channel_schema_changed = false;
    outcome.sse_ws_metadata_schema_changed = false;
    outcome.rtsp_webrtc_media_path_changed = false;
    outcome.viewer_client_exposure_added = false;
    return outcome;
}

std::string BuildRetentionRecordJson(const VlmFeatureRetentionOptions& options,
                                     const VlmFeatureRetentionRequest& request,
                                     const std::string& feature_set_json,
                                     int feature_revision,
                                     int previous_revision) {
    const std::string evidence_refs =
        request.source_evidence_refs_json.empty() ? "{}" : request.source_evidence_refs_json;
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.vlm-feature-retention-record.v1\","
        << "\"eventId\":\"" << JsonEscape(request.event_id) << "\","
        << "\"featureSetId\":\"" << JsonEscape(request.feature_set_id) << "\","
        << "\"featureRevision\":" << feature_revision << ","
        << "\"previousRevision\":" << previous_revision << ","
        << "\"retentionMode\":\"feature-only-structured-non-identifying\","
        << "\"retention\":{\"defaultDays\":" << options.default_retention_days
        << ",\"pinnedExcludesAutomaticCleanup\":"
        << (options.pinned_excludes_automatic_cleanup ? "true" : "false")
        << ",\"rawProviderReplayAllowed\":false},"
        << "\"sourceEvidenceRefs\":" << evidence_refs << ","
        << "\"reanalysis\":{\"requested\":"
        << (request.reanalysis_requested ? "true" : "false")
        << ",\"reason\":\"" << JsonEscape(request.reanalysis_reason) << "\","
        << "\"previousRevisionPreserved\":true,"
        << "\"runtimeProviderReplayPerformed\":false},"
        << "\"privacy\":{\"rawPromptStored\":false,"
        << "\"rawProviderResponseStored\":false,"
        << "\"providerRequestBodyStored\":false,"
        << "\"credentialStored\":false,"
        << "\"sourceUrlStored\":false,"
        << "\"rawFrameBytesStored\":false},"
        << "\"boundary\":{\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseWsMetadataSchemaChanged\":false,"
        << "\"rtspWebrtcMediaPathChanged\":false,"
        << "\"viewerClientExposureAdded\":false},"
        << "\"featureSet\":" << feature_set_json
        << "}";
    return out.str();
}

}  // namespace

VlmFeatureRetentionStore::VlmFeatureRetentionStore(VlmFeatureRetentionOptions options)
    : options_(options) {
    if (options_.default_retention_days <= 0) {
        options_.default_retention_days = 7;
    }
    if (options_.max_revisions_per_event == 0) {
        options_.max_revisions_per_event = 1;
    }
}

VlmFeatureRetentionOutcome VlmFeatureRetentionStore::StoreRevision(
    const VlmFeatureRetentionRequest& request,
    const std::string& feature_set_json) {
    if (request.event_id.empty()) {
        return MakeOutcome(request, "rejected", "reject-invalid-retention-request", "missing-event-id");
    }
    if (HasRawRetentionMaterial(feature_set_json)) {
        return MakeOutcome(request, "rejected", "reject-raw-provider-material", "raw-provider-material");
    }
    if (!IsStructuredFeatureSet(feature_set_json, request.event_id)) {
        return MakeOutcome(request, "rejected", "reject-invalid-feature-set", "invalid-feature-set");
    }
    if (RevisionCount(request.event_id) >= options_.max_revisions_per_event) {
        return MakeOutcome(request, "failed", "reject-feature-revision-limit", "feature-revision-limit");
    }

    const int parsed_revision = ExtractFeatureRevision(feature_set_json);
    const int feature_revision = std::max(1, parsed_revision > 0 ? parsed_revision : request.requested_revision);
    const int previous_revision = LatestRevision(request.event_id);

    VlmFeatureRetentionOutcome outcome =
        MakeOutcome(request,
                    "stored",
                    request.reanalysis_requested ? "store-reanalysis-revision" : "store-feature-revision");
    outcome.feature_set_stored = true;
    outcome.feature_revision = feature_revision;
    outcome.previous_revision = previous_revision;
    outcome.record_json =
        BuildRetentionRecordJson(options_, request, feature_set_json, feature_revision, previous_revision);
    records_.push_back(outcome);
    return outcome;
}

VlmFeatureRetentionOutcome VlmFeatureRetentionStore::RequestReanalysis(
    const VlmFeatureRetentionRequest& request,
    const std::string& feature_set_json) {
    VlmFeatureRetentionRequest reanalysis = request;
    reanalysis.reanalysis_requested = true;
    if (reanalysis.reanalysis_reason.empty()) {
        reanalysis.reanalysis_reason = "operator-requested-reanalysis";
    }
    if (LatestRevision(reanalysis.event_id) <= 0) {
        return MakeOutcome(reanalysis, "blocked", "reject-reanalysis-without-base", "missing-previous-revision");
    }
    return StoreRevision(reanalysis, feature_set_json);
}

std::size_t VlmFeatureRetentionStore::RevisionCount(const std::string& event_id) const {
    return static_cast<std::size_t>(std::count_if(records_.begin(), records_.end(), [&](const auto& item) {
        return item.event_id == event_id && item.feature_set_stored;
    }));
}

int VlmFeatureRetentionStore::LatestRevision(const std::string& event_id) const {
    int latest = 0;
    for (const auto& item : records_) {
        if (item.event_id == event_id && item.feature_set_stored) {
            latest = std::max(latest, item.feature_revision);
        }
    }
    return latest;
}

bool HasRawRetentionMaterial(const std::string& feature_set_json) {
    for (const std::string& snippet : {
             "\"rawPrompt\":",
             "\"rawProviderResponse\":",
             "\"rawResponse\":",
             "\"providerRequestBody\":",
             "\"credential\":",
             "\"credentialMaterial\":",
             "\"sourceUrl\":",
             "\"rawFrameBytes\":",
             "\"rawPromptStored\":true",
             "\"rawProviderResponseStored\":true",
             "\"providerRequestBodyStored\":true",
             "\"credentialStored\":true",
             "\"sourceUrlStored\":true",
             "\"rawFrameBytesStored\":true",
             "\"sourceFrameBytesInlined\":true",
         }) {
        if (Contains(feature_set_json, snippet)) {
            return true;
        }
    }
    return false;
}

std::string VlmFeatureRetentionOutcomeJson(const VlmFeatureRetentionOutcome& outcome) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"" << JsonEscape(outcome.schema) << "\","
        << "\"eventId\":\"" << JsonEscape(outcome.event_id) << "\","
        << "\"featureSetId\":\"" << JsonEscape(outcome.feature_set_id) << "\","
        << "\"status\":\"" << JsonEscape(outcome.status) << "\","
        << "\"retentionAction\":\"" << JsonEscape(outcome.retention_action) << "\","
        << "\"failureReason\":\"" << JsonEscape(outcome.failure_reason) << "\","
        << "\"featureSetStored\":" << (outcome.feature_set_stored ? "true" : "false") << ","
        << "\"featureRevision\":" << outcome.feature_revision << ","
        << "\"previousRevision\":" << outcome.previous_revision << ","
        << "\"contractInvariants\":{"
        << "\"rawPromptStored\":" << (outcome.raw_prompt_stored ? "true" : "false") << ","
        << "\"rawProviderResponseStored\":"
        << (outcome.raw_provider_response_stored ? "true" : "false") << ","
        << "\"providerRequestBodyStored\":"
        << (outcome.provider_request_body_stored ? "true" : "false") << ","
        << "\"credentialStored\":" << (outcome.credential_stored ? "true" : "false") << ","
        << "\"sourceUrlStored\":" << (outcome.source_url_stored ? "true" : "false") << ","
        << "\"runtimeProviderReplayPerformed\":"
        << (outcome.runtime_provider_replay_performed ? "true" : "false") << ","
        << "\"eventPostPayloadChanged\":"
        << (outcome.event_post_payload_changed ? "true" : "false") << ","
        << "\"webrtcDataChannelSchemaChanged\":"
        << (outcome.webrtc_data_channel_schema_changed ? "true" : "false") << ","
        << "\"sseWsMetadataSchemaChanged\":"
        << (outcome.sse_ws_metadata_schema_changed ? "true" : "false") << ","
        << "\"rtspWebrtcMediaPathChanged\":"
        << (outcome.rtsp_webrtc_media_path_changed ? "true" : "false")
        << "}"
        << "}";
    return out.str();
}

}  // namespace analysis
