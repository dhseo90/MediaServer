// 파일 요약: v3.0 Feature/Search Index의 로컬 projection 계약을 구현한다.
// 동작 요약: provider/vector/UI 호출 없이 EventRecord, FeatureSet, EvidenceManifest, review state를 검색 문서로 묶는다.
#include "analysis/event_feature_search_index.h"

#include <algorithm>
#include <cctype>
#include <cmath>
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

bool HasPrivacyViolation(const EventOptionalVectorEmbedding& embedding) {
    return embedding.face_embedding || embedding.identity_embedding || embedding.raw_prompt_stored ||
           embedding.raw_provider_response_stored || embedding.provider_request_body_stored ||
           embedding.provider_embedding_call_performed || embedding.credential_stored ||
           embedding.source_url_stored || embedding.raw_frame_bytes_stored;
}

bool HasFiniteVector(const std::vector<float>& values) {
    if (values.empty()) {
        return false;
    }
    for (const float value : values) {
        if (!std::isfinite(value)) {
            return false;
        }
    }
    return true;
}

bool DimensionsMatch(const std::vector<float>& values, std::size_t expected_dimensions) {
    if (!HasFiniteVector(values)) {
        return false;
    }
    return expected_dimensions == 0 || values.size() == expected_dimensions;
}

float CosineSimilarity(const std::vector<float>& left, const std::vector<float>& right) {
    if (left.empty() || left.size() != right.size()) {
        return 0.0F;
    }
    double dot = 0.0;
    double left_norm = 0.0;
    double right_norm = 0.0;
    for (std::size_t i = 0; i < left.size(); ++i) {
        dot += static_cast<double>(left[i]) * static_cast<double>(right[i]);
        left_norm += static_cast<double>(left[i]) * static_cast<double>(left[i]);
        right_norm += static_cast<double>(right[i]) * static_cast<double>(right[i]);
    }
    if (left_norm <= 0.0 || right_norm <= 0.0) {
        return 0.0F;
    }
    return static_cast<float>(dot / (std::sqrt(left_norm) * std::sqrt(right_norm)));
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

EventOptionalVectorIndexReport MakeOptionalVectorReport(std::uint64_t generation) {
    EventOptionalVectorIndexReport report;
    report.generation = generation;
    report.default_off = true;
    report.vector_index_enabled = false;
    report.rebuild_performed = false;
    report.vector_search_performed = false;
    report.quality_gate_active = true;
    report.dimension_gate_active = true;
    report.identity_embeddings_rejected = true;
    report.face_embeddings_rejected = true;
    report.raw_prompt_stored = false;
    report.raw_provider_response_stored = false;
    report.runtime_provider_call_performed = false;
    report.provider_embedding_call_performed = false;
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

EventOptionalVectorIndexReport EventFeatureSearchIndex::RebuildOptionalVectorIndex(
    const std::vector<EventOptionalVectorEmbedding>& embeddings,
    const EventOptionalVectorIndexOptions& options) {
    ++vector_generation_;
    vector_entries_.clear();
    vector_report_ = MakeOptionalVectorReport(vector_generation_);
    vector_report_.embeddings_seen = embeddings.size();
    vector_report_.vector_index_enabled = options.enabled;
    if (!options.enabled) {
        vector_report_.rejection_reason = "optional-vector-index-disabled-default-off";
        return vector_report_;
    }

    vector_report_.rebuild_performed = true;
    std::unordered_map<std::string, const EventSearchIndexEntry*> entry_by_event_id;
    for (const auto& entry : entries_) {
        entry_by_event_id[entry.event_id] = &entry;
    }

    for (const auto& embedding : embeddings) {
        const auto found = entry_by_event_id.find(embedding.event_id);
        if (found == entry_by_event_id.end()) {
            ++vector_report_.orphan_embeddings_skipped;
            continue;
        }
        if (!embedding.searchable || HasPrivacyViolation(embedding)) {
            ++vector_report_.privacy_rejected_embeddings;
            continue;
        }
        if (embedding.quality < options.min_quality) {
            ++vector_report_.quality_rejected_embeddings;
            continue;
        }
        if (!DimensionsMatch(embedding.values, options.expected_dimensions)) {
            ++vector_report_.dimension_rejected_embeddings;
            continue;
        }

        OptionalVectorIndexEntry vector_entry;
        vector_entry.event_id = embedding.event_id;
        vector_entry.embedding_id = embedding.embedding_id;
        vector_entry.values = embedding.values;
        vector_entry.quality = embedding.quality;
        vector_entry.document = found->second->document;
        vector_entries_.push_back(vector_entry);
        ++vector_report_.indexed_embeddings;
    }
    return vector_report_;
}

EventOptionalVectorSearchOutput EventFeatureSearchIndex::SearchOptionalVector(
    const EventOptionalVectorSearchQuery& query) const {
    EventOptionalVectorSearchOutput output;
    output.report = vector_report_;
    output.report.vector_search_performed = false;
    if (!query.enabled) {
        output.report.rejection_reason = "optional-vector-query-disabled";
        return output;
    }
    if (!vector_report_.vector_index_enabled || vector_entries_.empty()) {
        output.report.rejection_reason = "optional-vector-index-disabled-or-empty";
        return output;
    }
    if (!HasFiniteVector(query.values)) {
        output.report.rejection_reason = "invalid-query-vector";
        return output;
    }

    output.report.vector_search_performed = true;
    const std::size_t limit = query.limit == 0 ? 10 : query.limit;
    for (const auto& entry : vector_entries_) {
        if (entry.values.size() != query.values.size()) {
            continue;
        }
        const float score = CosineSimilarity(query.values, entry.values);
        if (score <= query.min_score) {
            continue;
        }
        EventOptionalVectorSearchResult result;
        result.event_id = entry.event_id;
        result.embedding_id = entry.embedding_id;
        result.score = score;
        result.document = entry.document;
        output.results.push_back(result);
    }
    std::sort(output.results.begin(), output.results.end(), [](const auto& left, const auto& right) {
        if (left.score != right.score) {
            return left.score > right.score;
        }
        return left.document.timestamp_ms > right.document.timestamp_ms;
    });
    if (output.results.size() > limit) {
        output.results.resize(limit);
    }
    for (std::size_t i = 0; i < output.results.size(); ++i) {
        output.results[i].rank = i + 1;
    }
    return output;
}

const EventSearchIndexReport& EventFeatureSearchIndex::Report() const {
    return report_;
}

const EventOptionalVectorIndexReport& EventFeatureSearchIndex::OptionalVectorReport() const {
    return vector_report_;
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

std::string EventOptionalVectorIndexReportJson(const EventOptionalVectorIndexReport& report) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"" << JsonEscape(report.schema) << "\","
        << "\"generation\":" << report.generation << ","
        << "\"defaultOff\":" << (report.default_off ? "true" : "false") << ","
        << "\"vectorIndexEnabled\":" << (report.vector_index_enabled ? "true" : "false") << ","
        << "\"rebuildPerformed\":" << (report.rebuild_performed ? "true" : "false") << ","
        << "\"vectorSearchPerformed\":" << (report.vector_search_performed ? "true" : "false") << ","
        << "\"embeddingsSeen\":" << report.embeddings_seen << ","
        << "\"indexedEmbeddings\":" << report.indexed_embeddings << ","
        << "\"qualityRejectedEmbeddings\":" << report.quality_rejected_embeddings << ","
        << "\"dimensionRejectedEmbeddings\":" << report.dimension_rejected_embeddings << ","
        << "\"privacyRejectedEmbeddings\":" << report.privacy_rejected_embeddings << ","
        << "\"orphanEmbeddingsSkipped\":" << report.orphan_embeddings_skipped << ","
        << "\"qualityGateActive\":" << (report.quality_gate_active ? "true" : "false") << ","
        << "\"dimensionGateActive\":" << (report.dimension_gate_active ? "true" : "false") << ","
        << "\"identityEmbeddingsRejected\":"
        << (report.identity_embeddings_rejected ? "true" : "false") << ","
        << "\"faceEmbeddingsRejected\":" << (report.face_embeddings_rejected ? "true" : "false") << ","
        << "\"rejectionReason\":\"" << JsonEscape(report.rejection_reason) << "\","
        << "\"contractInvariants\":{"
        << "\"rawPromptStored\":" << (report.raw_prompt_stored ? "true" : "false") << ","
        << "\"rawProviderResponseStored\":"
        << (report.raw_provider_response_stored ? "true" : "false") << ","
        << "\"runtimeProviderCallPerformed\":"
        << (report.runtime_provider_call_performed ? "true" : "false") << ","
        << "\"providerEmbeddingCallPerformed\":"
        << (report.provider_embedding_call_performed ? "true" : "false") << ","
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

bool EventOptionalVectorIndexReportContainsForbiddenMaterial(
    const EventOptionalVectorIndexReport& report) {
    return report.raw_prompt_stored || report.raw_provider_response_stored ||
           report.runtime_provider_call_performed || report.provider_embedding_call_performed ||
           !report.identity_embeddings_rejected || !report.face_embeddings_rejected ||
           report.event_post_payload_changed || report.webrtc_data_channel_schema_changed ||
           report.sse_ws_metadata_schema_changed || report.rtsp_webrtc_media_path_changed ||
           report.viewer_client_exposure_added;
}

}  // namespace analysis
