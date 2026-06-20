// 파일 요약: v3.0 Feature/Search Index의 로컬 projection 계약을 구현한다.
// 동작 요약: provider/vector/UI 호출 없이 EventRecord, FeatureSet, EvidenceManifest, review state를 검색 문서로 묶는다.
#include "analysis/event_feature_search_index.h"

#include <algorithm>
#include <cctype>
#include <sstream>
#include <unordered_map>

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

std::string LowerAscii(std::string value) {
    for (char& ch : value) {
        ch = static_cast<char>(std::tolower(static_cast<unsigned char>(ch)));
    }
    return value;
}

void AddUnique(std::vector<std::string>* values, const std::string& value) {
    if (values == nullptr || value.empty()) {
        return;
    }
    if (std::find(values->begin(), values->end(), value) == values->end()) {
        values->push_back(value);
    }
}

void AppendText(std::string* text, const std::string& value) {
    if (text == nullptr || value.empty()) {
        return;
    }
    if (!text->empty()) {
        *text += " ";
    }
    *text += value;
}

std::string FeatureFieldName(const EventSearchIndexFeature& feature) {
    if (feature.namespace_name.empty()) {
        return feature.name;
    }
    if (feature.name.empty()) {
        return feature.namespace_name;
    }
    return feature.namespace_name + "." + feature.name;
}

bool HasBoundaryViolation(const EventSearchIndexEventRecord& event) {
    return event.event_post_payload_changed || event.webrtc_data_channel_schema_changed ||
           event.sse_ws_metadata_schema_changed || event.rtsp_webrtc_media_path_changed ||
           event.viewer_client_exposure_added;
}

bool HasPrivacyViolation(const EventSearchIndexFeatureSet& feature_set) {
    if (feature_set.raw_prompt_stored || feature_set.raw_provider_response_stored ||
        feature_set.provider_request_body_stored || feature_set.credential_stored ||
        feature_set.source_url_stored || feature_set.raw_frame_bytes_stored ||
        feature_set.identity_features_allowed) {
        return true;
    }
    for (const auto& feature : feature_set.features) {
        if (feature.identity_feature || feature.raw_prompt_fragment_stored ||
            feature.raw_provider_response_fragment_stored) {
            return true;
        }
    }
    return false;
}

bool HasPrivacyViolation(const EventSearchIndexEvidenceManifest& evidence) {
    return evidence.raw_prompt_stored || evidence.raw_provider_response_stored ||
           evidence.identity_features_allowed || evidence.archive_api;
}

EventSearchIndexReport MakeEmptyReport(std::uint64_t generation,
                                       const EventFeatureSearchIndexRebuildInput& input) {
    EventSearchIndexReport report;
    report.generation = generation;
    report.events_seen = input.events.size();
    report.feature_sets_seen = input.feature_sets.size();
    report.evidence_manifests_seen = input.evidence_manifests.size();
    report.review_states_seen = input.review_states.size();
    report.stale_result_guard_active = true;
    report.raw_prompt_stored = false;
    report.raw_provider_response_stored = false;
    report.runtime_provider_call_performed = false;
    report.vector_search_performed = false;
    report.ops_events_ui_required = false;
    report.event_post_payload_changed = false;
    report.webrtc_data_channel_schema_changed = false;
    report.sse_ws_metadata_schema_changed = false;
    report.rtsp_webrtc_media_path_changed = false;
    report.viewer_client_exposure_added = false;
    return report;
}

EventSearchIndexEntry MakeEntry(const EventSearchIndexEventRecord& event) {
    EventSearchIndexEntry entry;
    entry.event_id = event.event_id;
    entry.has_event_record = true;
    entry.document.event_id = event.event_id;
    entry.document.source_id = event.source_id;
    entry.document.channel_id = event.channel_id;
    entry.document.event_type = event.event_type;
    entry.document.scenario = event.scenario;
    entry.document.status = event.status;
    entry.document.zone_id = event.zone_id;
    entry.document.line_id = event.line_id;
    entry.document.class_name = event.class_name;
    entry.document.timestamp_ms = event.timestamp_ms;
    entry.document.review_state = "new";
    AppendText(&entry.document.searchable_text, event.event_id);
    AppendText(&entry.document.searchable_text, event.source_id);
    AppendText(&entry.document.searchable_text, event.channel_id);
    AppendText(&entry.document.searchable_text, event.event_type);
    AppendText(&entry.document.searchable_text, event.scenario);
    AppendText(&entry.document.searchable_text, event.status);
    AppendText(&entry.document.searchable_text, event.zone_id);
    AppendText(&entry.document.searchable_text, event.line_id);
    AppendText(&entry.document.searchable_text, event.class_name);
    AddUnique(&entry.document.tags, "event:" + LowerAscii(event.event_type));
    AddUnique(&entry.document.tags, "scenario:" + LowerAscii(event.scenario));
    AddUnique(&entry.document.tags, "source:" + LowerAscii(event.source_id));
    return entry;
}

void AttachEvidence(const EventSearchIndexEvidenceManifest& evidence, EventSearchIndexEntry* entry) {
    if (entry == nullptr) {
        return;
    }
    entry->has_evidence_manifest = true;
    if (!evidence.manifest_path.empty()) {
        AddUnique(&entry->evidence_refs, evidence.manifest_path);
        entry->document.features.push_back({"evidenceManifest", evidence.manifest_path});
        AppendText(&entry->document.searchable_text, evidence.manifest_path);
    }
    if (evidence.event_frame_present) {
        AddUnique(&entry->document.tags, "evidence:eventframe");
        entry->document.features.push_back({"evidence.eventFrame", "present"});
    }
    if (evidence.representative_image_present) {
        AddUnique(&entry->document.tags, "evidence:representativeimage");
        entry->document.features.push_back({"evidence.representativeImage", "present"});
    }
    if (evidence.bbox_crop_count > 0) {
        AddUnique(&entry->document.tags, "evidence:bboxcrop");
        entry->document.features.push_back({"evidence.bboxCrop", std::to_string(evidence.bbox_crop_count)});
    }
    if (evidence.frame_bundle_present) {
        AddUnique(&entry->document.tags, "evidence:framebundle");
        entry->document.features.push_back({"evidence.frameBundle", "present"});
    }
}

void AttachFeatureSet(const EventSearchIndexFeatureSet& feature_set, EventSearchIndexEntry* entry) {
    if (entry == nullptr) {
        return;
    }
    entry->has_feature_set = true;
    entry->feature_revision = feature_set.feature_revision;
    entry->document.features.push_back({"featureSetId", feature_set.feature_set_id});
    entry->document.features.push_back({"featureRevision", std::to_string(feature_set.feature_revision)});
    AppendText(&entry->document.searchable_text, feature_set.feature_set_id);
    for (const auto& feature : feature_set.features) {
        if (!feature.searchable) {
            continue;
        }
        const std::string field = FeatureFieldName(feature);
        entry->document.features.push_back({field, feature.value});
        AppendText(&entry->document.searchable_text, feature.namespace_name);
        AppendText(&entry->document.searchable_text, feature.name);
        AppendText(&entry->document.searchable_text, feature.value);
        AddUnique(&entry->document.tags, "feature:" + LowerAscii(feature.namespace_name));
        AddUnique(&entry->document.tags, "feature:" + LowerAscii(feature.name));
        if (!feature.evidence_ref.empty()) {
            AddUnique(&entry->document.tags, "evidence:" + LowerAscii(feature.evidence_ref));
        }
    }
}

void AttachReview(const EventSearchIndexReviewState& review, EventSearchIndexEntry* entry) {
    if (entry == nullptr) {
        return;
    }
    entry->has_review_state = true;
    if (!review.review_state.empty()) {
        entry->document.review_state = review.review_state;
    }
    entry->document.pinned = review.pinned;
    entry->document.features.push_back({"classification", review.classification});
    entry->document.features.push_back({"incidentStatus", review.incident_status});
    AppendText(&entry->document.searchable_text, review.review_state);
    AppendText(&entry->document.searchable_text, review.classification);
    AppendText(&entry->document.searchable_text, review.incident_status);
    AddUnique(&entry->document.tags, "review:" + LowerAscii(review.review_state));
    AddUnique(&entry->document.tags, "classification:" + LowerAscii(review.classification));
    AddUnique(&entry->document.tags, "incident:" + LowerAscii(review.incident_status));
}

}  // namespace

EventSearchIndexReport EventFeatureSearchIndex::Rebuild(
    const EventFeatureSearchIndexRebuildInput& input) {
    ++generation_;
    entries_.clear();
    report_ = MakeEmptyReport(generation_, input);

    std::unordered_map<std::string, std::size_t> entry_by_event_id;
    for (const auto& event : input.events) {
        if (event.event_id.empty() || HasBoundaryViolation(event)) {
            ++report_.privacy_rejected_records;
            continue;
        }
        entry_by_event_id[event.event_id] = entries_.size();
        entries_.push_back(MakeEntry(event));
    }

    for (const auto& evidence : input.evidence_manifests) {
        const auto found = entry_by_event_id.find(evidence.event_id);
        if (found == entry_by_event_id.end()) {
            ++report_.orphan_evidence_manifests_skipped;
            continue;
        }
        if (HasPrivacyViolation(evidence)) {
            ++report_.privacy_rejected_records;
            continue;
        }
        if (!evidence.event_frame_present) {
            ++report_.stale_evidence_manifests_skipped;
            continue;
        }
        AttachEvidence(evidence, &entries_[found->second]);
        ++report_.evidence_manifests_indexed;
    }

    std::unordered_map<std::string, int> latest_revision_by_event_id;
    std::vector<bool> usable_feature_set(input.feature_sets.size(), false);
    for (std::size_t index = 0; index < input.feature_sets.size(); ++index) {
        const auto& feature_set = input.feature_sets[index];
        if (entry_by_event_id.find(feature_set.event_id) == entry_by_event_id.end()) {
            ++report_.orphan_feature_sets_skipped;
            continue;
        }
        if (HasPrivacyViolation(feature_set)) {
            ++report_.privacy_rejected_records;
            continue;
        }
        usable_feature_set[index] = true;
        const int revision = std::max(1, feature_set.feature_revision);
        auto& latest = latest_revision_by_event_id[feature_set.event_id];
        latest = std::max(latest, revision);
    }

    for (std::size_t index = 0; index < input.feature_sets.size(); ++index) {
        if (!usable_feature_set[index]) {
            continue;
        }
        const auto& feature_set = input.feature_sets[index];
        const int revision = std::max(1, feature_set.feature_revision);
        if (revision < latest_revision_by_event_id[feature_set.event_id]) {
            ++report_.stale_feature_sets_skipped;
            continue;
        }
        const auto found = entry_by_event_id.find(feature_set.event_id);
        if (found == entry_by_event_id.end()) {
            continue;
        }
        AttachFeatureSet(feature_set, &entries_[found->second]);
        ++report_.latest_feature_sets_indexed;
    }

    for (const auto& review : input.review_states) {
        const auto found = entry_by_event_id.find(review.event_id);
        if (found == entry_by_event_id.end()) {
            ++report_.orphan_review_states_skipped;
            continue;
        }
        AttachReview(review, &entries_[found->second]);
        ++report_.review_states_indexed;
    }

    report_.indexed_entries = entries_.size();
    return report_;
}

std::vector<EventSearchIndexEntry> EventFeatureSearchIndex::Search(const EventSearchDsl& dsl) const {
    std::vector<EventSearchIndexEntry> matches;
    if (!dsl.valid) {
        return matches;
    }
    for (const auto& entry : entries_) {
        if (EventSearchDocumentMatches(entry.document, dsl)) {
            matches.push_back(entry);
        }
    }
    std::sort(matches.begin(), matches.end(), [&](const auto& left, const auto& right) {
        if (dsl.sort == "eventTimeAsc") {
            return left.document.timestamp_ms < right.document.timestamp_ms;
        }
        return left.document.timestamp_ms > right.document.timestamp_ms;
    });
    if (dsl.offset >= matches.size()) {
        return {};
    }
    const std::size_t end = std::min(matches.size(), dsl.offset + dsl.limit);
    return std::vector<EventSearchIndexEntry>(
        matches.begin() + static_cast<std::ptrdiff_t>(dsl.offset),
        matches.begin() + static_cast<std::ptrdiff_t>(end));
}

const EventSearchIndexReport& EventFeatureSearchIndex::Report() const {
    return report_;
}

const std::vector<EventSearchIndexEntry>& EventFeatureSearchIndex::Entries() const {
    return entries_;
}

std::string EventFeatureSearchIndexReportJson(const EventSearchIndexReport& report) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"" << JsonEscape(report.schema) << "\","
        << "\"generation\":" << report.generation << ","
        << "\"eventsSeen\":" << report.events_seen << ","
        << "\"indexedEntries\":" << report.indexed_entries << ","
        << "\"featureSetsSeen\":" << report.feature_sets_seen << ","
        << "\"latestFeatureSetsIndexed\":" << report.latest_feature_sets_indexed << ","
        << "\"staleFeatureSetsSkipped\":" << report.stale_feature_sets_skipped << ","
        << "\"orphanFeatureSetsSkipped\":" << report.orphan_feature_sets_skipped << ","
        << "\"evidenceManifestsSeen\":" << report.evidence_manifests_seen << ","
        << "\"evidenceManifestsIndexed\":" << report.evidence_manifests_indexed << ","
        << "\"staleEvidenceManifestsSkipped\":" << report.stale_evidence_manifests_skipped << ","
        << "\"orphanEvidenceManifestsSkipped\":" << report.orphan_evidence_manifests_skipped << ","
        << "\"reviewStatesSeen\":" << report.review_states_seen << ","
        << "\"reviewStatesIndexed\":" << report.review_states_indexed << ","
        << "\"orphanReviewStatesSkipped\":" << report.orphan_review_states_skipped << ","
        << "\"privacyRejectedRecords\":" << report.privacy_rejected_records << ","
        << "\"staleResultGuardActive\":"
        << (report.stale_result_guard_active ? "true" : "false") << ","
        << "\"contractInvariants\":{"
        << "\"rawPromptStored\":" << (report.raw_prompt_stored ? "true" : "false") << ","
        << "\"rawProviderResponseStored\":"
        << (report.raw_provider_response_stored ? "true" : "false") << ","
        << "\"runtimeProviderCallPerformed\":"
        << (report.runtime_provider_call_performed ? "true" : "false") << ","
        << "\"vectorSearchPerformed\":"
        << (report.vector_search_performed ? "true" : "false") << ","
        << "\"opsEventsUiRequired\":"
        << (report.ops_events_ui_required ? "true" : "false") << ","
        << "\"eventPostPayloadChanged\":"
        << (report.event_post_payload_changed ? "true" : "false") << ","
        << "\"webrtcDataChannelSchemaChanged\":"
        << (report.webrtc_data_channel_schema_changed ? "true" : "false") << ","
        << "\"sseWsMetadataSchemaChanged\":"
        << (report.sse_ws_metadata_schema_changed ? "true" : "false") << ","
        << "\"rtspWebrtcMediaPathChanged\":"
        << (report.rtsp_webrtc_media_path_changed ? "true" : "false") << ","
        << "\"viewerClientExposureAdded\":"
        << (report.viewer_client_exposure_added ? "true" : "false")
        << "}"
        << "}";
    return out.str();
}

bool EventFeatureSearchIndexReportContainsForbiddenMaterial(const EventSearchIndexReport& report) {
    return report.raw_prompt_stored || report.raw_provider_response_stored ||
           report.runtime_provider_call_performed || report.vector_search_performed ||
           report.ops_events_ui_required || report.event_post_payload_changed ||
           report.webrtc_data_channel_schema_changed || report.sse_ws_metadata_schema_changed ||
           report.rtsp_webrtc_media_path_changed || report.viewer_client_exposure_added;
}

}  // namespace analysis
