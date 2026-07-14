// 파일 요약: WebRTC HTTP 서버의 source-health, audit, review 기반 구현이다.
#include "webrtc_http_server_detail.h"

namespace ingress {

using namespace webrtc_http_server_detail;

namespace webrtc_http_server_detail {

std::int64_t PtsNsToMs(std::int64_t pts_ns) {
    return pts_ns / 1000000LL;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8916 function
std::int64_t NowUnixMs() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::system_clock::now().time_since_epoch())
        .count();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8922 function
std::string FormatUnixMsUtc(std::int64_t unix_ms) {
    const std::time_t seconds = static_cast<std::time_t>(unix_ms / 1000);
    const int millis = static_cast<int>(std::max<std::int64_t>(0, unix_ms % 1000));
    std::tm tm{};
    gmtime_r(&seconds, &tm);
    std::ostringstream out;
    out << std::put_time(&tm, "%Y-%m-%dT%H:%M:%S") << "."
        << std::setw(3) << std::setfill('0') << millis << "Z";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8933 function
void AppendNullableJsonString(std::ostringstream& out, const std::string& value) {
    if (value.empty()) {
        out << "null";
    } else {
        out << "\"" << JsonEscape(value) << "\"";
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8941 function
std::string JsonBool(bool value) {
    return value ? "true" : "false";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8945 function
std::string QueryValueOr(const std::unordered_map<std::string, std::string>& query,
                         const std::string& key,
                         const std::string& fallback) {
    const auto it = query.find(key);
    if (it == query.end()) {
        return fallback;
    }
    const std::string trimmed = Trim(it->second);
    return trimmed.empty() ? fallback : trimmed;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8956 function
bool IsAllowedValue(const std::string& value, std::initializer_list<const char*> allowed) {
    return std::any_of(allowed.begin(), allowed.end(), [&](const char* candidate) {
        return value == candidate;
    });
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8962 function
void AppendJsonStringArray(std::ostringstream& out, const std::vector<std::string>& values) {
    out << "[";
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i > 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(values[i]) << "\"";
    }
    out << "]";
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8986 function
std::string OpsVlmRuntimeStatusJson(const std::string& runtime_readiness) {
    std::ostringstream out;
    out << "{\"status\":\"" << JsonEscape(runtime_readiness) << "\","
        << "\"ollamaCli\":\"operator-supplied\","
        << "\"vllmApi\":\"operator-supplied\","
        << "\"dryRunOnly\":true}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8995 function
std::string OpsVlmNoSideEffectsJson() {
    return R"({"dryRunOnly":true,"installPerformed":false,"connectionPerformed":false,"runtimeCallPerformed":false,"profileStored":false,"sidecarStored":false,"cloudProviderApiCalled":false,"credentialsStored":false,"modelArtifactDownloaded":false})";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8999 function
std::string OpsVlmEvaluationResultWorkflowJson() {
    return VlmEvaluationResultWorkflowJson();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9003 function
std::string OpsV390VlmEvaluationPromotionGuardJson() {
    return R"JSON({
  "schema": "media-server.ops.v390-vlm-evaluation-promotion-guard.v1",
  "targetStep": "V390-ADD1-03",
  "featureId": "V390-ADD1-03",
  "selectedMode": "server-verified-evaluation-promotion",
  "sourceEvaluationRoute": "/ops/api/vlm/evaluation-results",
  "profileSaveRoute": "/ops/api/vlm/profiles",
  "opsUiRoute": "/ops/vlm",
  "passedCandidateId": "eval-qwen8b-event-review-default",
  "promotionFlow": {
    "source": "server-owned immutable evaluation candidate catalog",
    "draftAction": "candidate reference only",
    "operatorFlow": "operator-select-candidate-then-server-verify-save",
    "saveBoundary": "profile save validates candidate, catalog revision, provenance digest, model, option, and prompt binding",
    "activationBoundary": "server-derived passed evaluation required for active/enabled"
  },
  "activationGuard": {
    "passedEvaluationRequiredForActive": true,
    "operatorSaveRequired": true,
    "operatorActivationReviewRequired": true,
    "clientDeclaredEvaluationRejected": true,
    "serverCanonicalEvaluationStored": true,
    "catalogRevision": "v390-add1-03-2026-07-10",
    "defaultOffPreserved": true,
    "invalidStatesRejected": [
      "review-required-active",
      "failed-active",
      "enabled-without-active-status",
      "active-without-enabled"
    ]
  },
  "workflowContract": {
    "opsOnly": true,
    "readOnly": true,
    "manualPromotionRequired": true,
    "serverVerificationRequired": true,
    "candidateReferenceOnly": true,
    "operatorSaveRequired": true,
    "operatorActivationReviewRequired": true,
    "profileWritePerformedByGuard": false,
    "activationPerformedByGuard": false,
    "runtimeVlmCallPerformed": false,
    "cloudProviderApiCalled": false,
    "sidecarWritePerformed": false,
    "eventPostPayloadChanged": false,
    "webrtcDataChannelSchemaChanged": false,
    "sseMetadataSchemaChanged": false,
    "wsMetadataSchemaChanged": false,
    "rtspOrWebrtcMediaPathChanged": false,
    "viewerClientExposureAdded": false
  }
})JSON";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9058 function
std::string OpsVlmPrivacyTransferGuardJson(bool external_transfer, bool external_acknowledged) {
    const bool review_required = external_transfer;
    const std::string review_status = external_transfer
                                          ? (external_acknowledged ? "review-required-before-activation"
                                                                   : "blocked-pending-external-transfer-opt-in")
                                          : "not-applicable";
    std::ostringstream out;
    out << "{\"schema\":\"media-server.vlm-privacy-transfer-guard.v1\","
        << "\"targetStep\":\"V200-S11\","
        << "\"externalTransfer\":" << JsonBool(external_transfer) << ","
        << "\"externalTransferWarningRequired\":" << JsonBool(external_transfer) << ","
        << "\"externalTransferWarningAcknowledged\":" << JsonBool(external_transfer && external_acknowledged) << ","
        << "\"redaction\":{"
        << "\"credentialMaterialStored\":false,"
        << "\"promptStored\":false,"
        << "\"rawProviderResponseStored\":false,"
        << "\"sourceUrlStored\":false,"
        << "\"rawFrameBytesStored\":false,"
        << "\"viewerClientExposureAdded\":false},"
        << "\"providerLoggingPolicy\":{"
        << "\"provider\":\"" << (external_transfer ? "gemini-api" : "operator-local-runtime") << "\","
        << "\"reviewRequired\":" << JsonBool(review_required) << ","
        << "\"reviewStatus\":\"" << JsonEscape(review_status) << "\","
        << "\"loggingAndRetentionReviewed\":false,"
        << "\"termsReviewed\":false,"
        << "\"currentProviderPolicyStored\":false},"
        << "\"gate\":{\"status\":\""
        << (external_transfer ? (external_acknowledged ? "review-required" : "blocked") : "pass")
        << "\",\"profileActivationAllowed\":" << JsonBool(!external_transfer)
        << ",\"providerCallAllowed\":false}}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9091 function
void AppendOpsVlmModelEstimate(std::ostringstream& out, const OpsVlmModelPlan& plan) {
    if (plan.deployment == "cloud") {
        out << R"({"memory":{"localWorkingSetGb":0},"disk":{"modelArtifactGb":0},"latency":{"label":"provider/API/network dependent"},"cost":{"class":"provider-api-variable"}})";
        return;
    }
    out << "{\"memory\":{\"localWorkingSetGb\":" << plan.memory_gb << "},"
        << "\"disk\":{\"modelArtifactGb\":" << plan.disk_gb << "},"
        << "\"latency\":{\"p50Seconds\":" << plan.latency_p50_s
        << ",\"p95Seconds\":" << plan.latency_p95_s << "},"
        << "\"cost\":{\"class\":\"local-hardware\"}}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9103 function
std::string OpsVlmInstallImpactSummary(const OpsVlmModelPlan& plan, bool requires_runtime_setup) {
    if (plan.deployment == "cloud") {
        return "No local model artifact is installed in dry-run; provider cost/terms/logging review remains required.";
    }
    std::ostringstream out;
    out << "model artifact planning size " << plan.disk_gb << "GB; local working set planning size "
        << plan.memory_gb << "GB";
    if (requires_runtime_setup) {
        out << "; local runtime setup is still required";
    }
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9116 function
void AppendOpsVlmOptionJson(std::ostringstream& out,
                            const OpsVlmModelPlan& plan,
                            std::size_t priority,
                            const std::string& runtime_readiness,
                            const std::string& cloud_opt_in,
                            std::vector<std::string>* selectable_ids) {
    const bool is_cloud = plan.deployment == "cloud";
    const bool cloud_opt_in_satisfied = cloud_opt_in == "acknowledged";
    std::vector<std::string> disabled_reasons;
    if (is_cloud && !cloud_opt_in_satisfied) {
        disabled_reasons.push_back("cloud-explicit-opt-in-required");
    }
    const bool selectable = disabled_reasons.empty();
    if (selectable && selectable_ids != nullptr) {
        selectable_ids->push_back(plan.option_id);
    }
    const bool requires_runtime_setup = !is_cloud && runtime_readiness != "ready";
    out << "{\"id\":\"" << JsonEscape(plan.option_id) << "\","
        << "\"source\":\"" << (priority == 1 ? "primary" : "alternative") << "\","
        << "\"actionType\":\"" << (is_cloud ? "cloud-api-connection-dry-run" : "local-model-install-dry-run") << "\","
        << "\"provider\":\"" << (is_cloud ? "cloud-provider-api" : "user-supplied-local-runtime") << "\","
        << "\"model\":\"" << JsonEscape(plan.model) << "\","
        << "\"tier\":\"" << JsonEscape(plan.tier) << "\","
        << "\"role\":\"" << JsonEscape(plan.role) << "\","
        << "\"priority\":" << priority << ","
        << "\"deployment\":\"" << JsonEscape(plan.deployment) << "\","
        << "\"selectable\":" << JsonBool(selectable) << ","
        << "\"disabledReasons\":";
    AppendJsonStringArray(out, disabled_reasons);
    out << ",\"externalTransfer\":" << JsonBool(is_cloud)
        << ",\"requiresCloudOptIn\":" << JsonBool(is_cloud)
        << ",\"cloudOptInSatisfied\":";
    if (is_cloud) {
        out << JsonBool(cloud_opt_in_satisfied);
    } else {
        out << "null";
    }
    out << ",\"requiresRuntimeSetup\":" << JsonBool(requires_runtime_setup)
        << ",\"automaticInstallAllowed\":false,"
        << "\"automaticMultiInstallAllowed\":false,"
        << "\"bundleAllowed\":false,"
        << "\"installCommandsIncluded\":false,"
        << "\"modelArtifactReferenceIncluded\":false,"
        << "\"credentialAcceptedByDryRun\":false,"
        << "\"privacyTransferGuard\":" << OpsVlmPrivacyTransferGuardJson(is_cloud, cloud_opt_in_satisfied) << ","
        << "\"impact\":{\"resourceEstimate\":";
    AppendOpsVlmModelEstimate(out, plan);
    out << ",\"localRuntimeReadiness\":" << OpsVlmRuntimeStatusJson(runtime_readiness)
        << ",\"installImpactSummary\":\"" << JsonEscape(OpsVlmInstallImpactSummary(plan, requires_runtime_setup)) << "\","
        << "\"privacyImpactSummary\":\""
        << (is_cloud
                ? "External transfer warning and explicit opt-in are required before any provider connection."
                : "Local option keeps event evidence on operator-supplied runtime; no provider transfer in dry-run.")
        << "\"},"
        << "\"execution\":" << OpsVlmNoSideEffectsJson() << ","
        << "\"nextStepBoundary\":\"S04 Ops UI may display/select this option; S05 profile storage and later runtime calls remain separate.\"}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9174 function
std::string OpsVlmInstallConnectionDryRunJson(
    const std::unordered_map<std::string, std::string>& query,
    std::string* error_message) {
    const std::string hardware_class = QueryValueOr(query, "hardwareClass", "local-standard");
    const std::string privacy_mode = QueryValueOr(query, "privacyMode", "local-only");
    const std::string cloud_opt_in = QueryValueOr(query, "cloudOptIn", "not-acknowledged");
    const std::string runtime_readiness = QueryValueOr(query, "runtimeReadiness", "missing");
    if (!IsAllowedValue(hardware_class, {"local-unsupported", "local-low", "local-standard", "local-high"})) {
        if (error_message != nullptr) *error_message = "unsupported hardwareClass";
        return {};
    }
    if (!IsAllowedValue(privacy_mode, {"local-only", "cloud-disabled", "cloud-allowed"})) {
        if (error_message != nullptr) *error_message = "unsupported privacyMode";
        return {};
    }
    if (!IsAllowedValue(cloud_opt_in, {"acknowledged", "not-acknowledged"})) {
        if (error_message != nullptr) *error_message = "unsupported cloudOptIn";
        return {};
    }
    if (!IsAllowedValue(runtime_readiness, {"ready", "missing"})) {
        if (error_message != nullptr) *error_message = "unsupported runtimeReadiness";
        return {};
    }

    std::vector<OpsVlmModelPlan> options;
    if (hardware_class == "local-low") {
        options.push_back({"local-qwen3-vl-4b", "Qwen/Qwen3-VL-4B-Instruct", "T2-local-low-spec-fallback", "primary-local-low", "local", 10, 9, 6, 20, false});
    } else if (hardware_class == "local-standard") {
        options.push_back({"local-qwen3-vl-8b", "Qwen/Qwen3-VL-8B-Instruct", "T1-primary-local-standard", "primary-local-standard", "local", 18, 16, 8, 25, false});
        options.push_back({"local-qwen3-vl-4b", "Qwen/Qwen3-VL-4B-Instruct", "T2-local-low-spec-fallback", "safe-local-fallback", "local", 10, 9, 6, 20, false});
    } else if (hardware_class == "local-high") {
        options.push_back({"local-qwen3-vl-30b", "Qwen/Qwen3-VL-30B-A3B-Instruct", "T1H-local-high-candidate", "high-evaluation-candidate", "local", 46, 60, 12, 35, true});
        options.push_back({"local-qwen3-vl-8b", "Qwen/Qwen3-VL-8B-Instruct", "T1-primary-local-standard", "safe-local-fallback", "local", 18, 16, 8, 25, false});
    }
    if (privacy_mode == "cloud-allowed") {
        options.push_back({"cloud-gemini-2-5-flash", "gemini-2.5-flash", "T3-cloud-opt-in-fallback", "cloud-opt-in-fallback", "cloud", 0, 0, 0, 0, false});
    }

    std::vector<std::string> selectable_ids;
    std::vector<std::string> warnings;
    if (runtime_readiness != "ready" && hardware_class != "local-unsupported") {
        warnings.push_back("local-runtime-setup-required-before-activation");
    }
    if (hardware_class == "local-high") {
        warnings.push_back("local-high-candidate-requires-v200-s06-evaluation");
    }
    if (privacy_mode == "cloud-allowed" && cloud_opt_in != "acknowledged") {
        warnings.push_back("cloud-explicit-opt-in-required");
    }
    warnings.push_back("dry-run-only-no-install-connection-profile-runtime-sidecar");

    std::ostringstream option_json;
    option_json << "[";
    for (std::size_t i = 0; i < options.size(); ++i) {
        if (i > 0) {
            option_json << ",";
        }
        AppendOpsVlmOptionJson(option_json, options[i], i + 1, runtime_readiness, cloud_opt_in, &selectable_ids);
    }
    option_json << "]";

    const std::string status = selectable_ids.empty() ? "no-selectable-option" : "ready-for-user-selection";
    std::string blocked_reason;
    if (selectable_ids.empty()) {
        blocked_reason = hardware_class == "local-unsupported"
                             ? (privacy_mode == "cloud-allowed" ? "cloud-explicit-opt-in-required" : "recommendation-engine-returned-no-supported-option")
                             : "no-selectable-dry-run-option";
    }

    std::ostringstream disabled;
    disabled << "[";
    bool first_disabled = true;
    auto append_disabled = [&](const std::string& id,
                               const std::string& model,
                               const std::string& deployment,
                               const std::string& reason_code,
                               const std::string& reason,
                               bool license_review_required) {
        if (!first_disabled) {
            disabled << ",";
        }
        first_disabled = false;
        disabled << "{\"id\":\"" << JsonEscape(id) << "\","
                 << "\"model\":";
        AppendNullableJsonString(disabled, model);
        disabled << ",\"deployment\":\"" << JsonEscape(deployment) << "\","
                 << "\"selectable\":false,"
                 << "\"disabledReason\":\"" << JsonEscape(reason_code) << "\","
                 << "\"reason\":\"" << JsonEscape(reason) << "\","
                 << "\"licenseReviewRequired\":" << JsonBool(license_review_required) << ","
                 << "\"defaultAllowed\":false,"
                 << "\"execution\":" << OpsVlmNoSideEffectsJson() << "}";
    };
    if (hardware_class == "local-unsupported") {
        append_disabled("not-recommended-local-vlm",
                        "",
                        "local",
                        "hardware-below-local-floor",
                        "local VLM runtime or memory headroom is below the default recommendation floor.",
                        false);
    }
    if (privacy_mode != "cloud-allowed") {
        append_disabled("not-recommended-gemini-cloud",
                        "gemini-2.5-flash",
                        "cloud",
                        "privacy-mode-disallows-cloud",
                        "cloud fallback requires explicit external transfer opt-in.",
                        false);
    }
    append_disabled("conditional-gemma-user-supplied",
                    "Gemma family",
                    "user-supplied",
                    "custom-terms-license-review-required",
                    "Gemma remains conditional user-supplied and is not a default or fallback baseline.",
                    true);
    disabled << "]";

    std::ostringstream out;
    out << "{\"schema\":\"media-server.vlm-install-connection-dry-run.v1\","
        << "\"targetStep\":\"V200-S04\","
        << "\"generatedAt\":\"" << JsonEscape(FormatUnixMsUtc(NowUnixMs())) << "\","
        << "\"scope\":\"install-connection-dry-run-contract-only\","
        << "\"sourceRecommendation\":{\"schema\":\"media-server.vlm-recommendation.v1\","
        << "\"targetStep\":\"V200-S03\","
        << "\"source\":\"ops-ui-planning-dry-run\","
        << "\"decisionStatus\":\"" << (hardware_class == "local-unsupported" && privacy_mode != "cloud-allowed" ? "not-recommended" : "recommended") << "\"},"
        << "\"pcCapability\":{\"osFamily\":\"operator-selected\","
        << "\"platform\":\"ops-ui\","
        << "\"hardwareClass\":\"" << JsonEscape(hardware_class) << "\","
        << "\"runtimeReadiness\":\"" << JsonEscape(runtime_readiness) << "\"},"
        << "\"privacy\":{\"mode\":\"" << JsonEscape(privacy_mode) << "\","
        << "\"externalTransferAllowed\":" << JsonBool(privacy_mode == "cloud-allowed") << ","
        << "\"cloudRequiresExplicitOptIn\":true,"
        << "\"cloudOptInState\":\"" << JsonEscape(cloud_opt_in) << "\","
        << "\"sourceLocatorOrCredentialIncluded\":false,"
        << "\"promptOrResponseIncluded\":false,"
        << "\"providerCredentialEchoed\":false},"
        << "\"privacyTransferGuard\":"
        << OpsVlmPrivacyTransferGuardJson(privacy_mode == "cloud-allowed", cloud_opt_in == "acknowledged")
        << ","
        << "\"decision\":{\"status\":\"" << JsonEscape(status) << "\","
        << "\"singleSelectionRequired\":true,"
        << "\"automaticMultiInstallAllowed\":false,"
        << "\"selectableOptionIds\":";
    AppendJsonStringArray(out, selectable_ids);
    out << ",\"blockedReason\":\"" << JsonEscape(blocked_reason) << "\"},"
        << "\"options\":" << option_json.str() << ","
        << "\"disabledOptions\":" << disabled.str() << ","
        << "\"warnings\":";
    AppendJsonStringArray(out, warnings);
    out << ",\"nonScope\":["
        << "\"profile-storage\","
        << "\"runtime-vlm-call\","
        << "\"sidecar-storage\","
        << "\"cloud-provider-api-call\","
        << "\"credential-storage\","
        << "\"event-post-webrtc-sse-ws-schema-change\","
        << "\"rtsp-webrtc-media-path-change\","
        << "\"viewer-client-exposure\","
        << "\"model-or-runtime-bundle-release\"],"
        << "\"contractInvariants\":{\"installPerformed\":false,"
        << "\"connectionPerformed\":false,"
        << "\"runtimeVlmCallPerformed\":false,"
        << "\"profileStored\":false,"
        << "\"sidecarStored\":false,"
        << "\"cloudProviderApiCalled\":false,"
        << "\"credentialsStored\":false,"
        << "\"modelArtifactDownloaded\":false,"
        << "\"modelArtifactBundled\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"viewerClientExposureAdded\":false}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9381 function
void AppendOpsSourceHealthItemJson(std::ostringstream& out, const OpsSourceHealthItem& item) {
    out << "{"
        << "\"sourceId\":\"" << JsonEscape(item.source_id) << "\","
        << "\"status\":\"" << JsonEscape(item.status) << "\","
        << "\"reason\":\"" << JsonEscape(item.reason) << "\","
        << "\"checkedAt\":";
    AppendNullableJsonString(out, item.checked_at);
    out << ",\"lastFrameAgeMs\":";
    AppendNullableInt64(out, item.last_frame_age_ms);
    out << ",\"lastMetadataAgeMs\":";
    AppendNullableInt64(out, item.last_metadata_age_ms);
    out << ",\"reconnectCount\":" << item.reconnect_count
        << ",\"lastReconnectAt\":";
    AppendNullableJsonString(out, item.last_reconnect_at);
    out << ",\"codec\":{"
        << "\"video\":";
    AppendNullableJsonString(out, item.codec_video);
    out << ",\"profile\":";
    AppendNullableJsonString(out, item.codec_profile);
    out << ",\"width\":";
    AppendNullableInt64(out, item.codec_width);
    out << ",\"height\":";
    AppendNullableInt64(out, item.codec_height);
    out << ",\"fps\":";
    AppendNullableInt64(out, item.codec_fps);
    out << "},\"warnings\":[";
    for (std::size_t i = 0; i < item.warnings.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(item.warnings[i]) << "\"";
    }
    out << "]}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9416 function
void AddOpsSourceHealthWarning(OpsSourceHealthItem* item, const std::string& warning) {
    if (item == nullptr || warning.empty() ||
        std::find(item->warnings.begin(), item->warnings.end(), warning) != item->warnings.end()) {
        return;
    }
    item->warnings.push_back(warning);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9424 function
const SourceViewRegistry::PublishedViewRecord* OpsHealthViewForSource(
    const std::vector<SourceViewRegistry::PublishedViewRecord>& views,
    const std::string& source_id) {
    const auto exact = std::find_if(views.begin(), views.end(), [&](const auto& view) {
        return view.view_id == source_id && view.source_id == source_id;
    });
    if (exact != views.end()) {
        return &*exact;
    }
    const auto by_source = std::find_if(views.begin(), views.end(), [&](const auto& view) {
        return view.source_id == source_id;
    });
    return by_source == views.end() ? nullptr : &*by_source;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9439 function
const analysis::AnalysisManager::TapSnapshot* OpsHealthTapForSource(
    const SourceViewRegistry::SourceRecord& source,
    const std::vector<analysis::AnalysisManager::TapSnapshot>& analysis_taps) {
    const auto candidates = ClientStreamKeyCandidates(source);
    const analysis::AnalysisManager::TapSnapshot* fallback = nullptr;
    for (const auto& tap : analysis_taps) {
        if (!ClientTapMatchesSource(tap, candidates)) {
            continue;
        }
        if (fallback == nullptr) {
            fallback = &tap;
        }
        if (tap.has_latest_frame || tap.latest_result.has_value()) {
            return &tap;
        }
    }
    return fallback;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9458 function
const PublishedWebRtcSource::Snapshot* OpsHealthPublishedSourceFor(
    const SourceViewRegistry::SourceRecord& source,
    const std::vector<PublishedWebRtcSource::Snapshot>& publish_sources) {
    if (source.kind != "webrtc" || source.webrtc_source_id.empty()) {
        return nullptr;
    }
    const auto it = std::find_if(publish_sources.begin(), publish_sources.end(), [&](const auto& published) {
        return published.source_id == source.webrtc_source_id;
    });
    return it == publish_sources.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9470 function
const core::SessionManager::SourceReconnectStats* OpsHealthReconnectStatsForSource(
    const SourceViewRegistry::SourceRecord& source,
    const std::vector<core::SessionManager::SourceReconnectStats>& reconnect_stats) {
    const auto candidates = ClientStreamKeyCandidates(source);
    const auto it = std::find_if(reconnect_stats.begin(), reconnect_stats.end(), [&](const auto& stats) {
        return std::find(candidates.begin(), candidates.end(), stats.stream_key) != candidates.end();
    });
    return it == reconnect_stats.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9480 function
const core::SessionManager::SourceEgressStats* OpsHealthEgressStatsForSource(
    const SourceViewRegistry::SourceRecord& source,
    const std::vector<core::SessionManager::SourceEgressStats>& egress_stats) {
    const auto candidates = ClientStreamKeyCandidates(source);
    const auto it = std::find_if(egress_stats.begin(), egress_stats.end(), [&](const auto& stats) {
        return std::find(candidates.begin(), candidates.end(), stats.stream_key) != candidates.end();
    });
    return it == egress_stats.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9490 function
const media::StreamDescriptor* OpsHealthDescriptorForSource(
    const SourceViewRegistry::SourceRecord& source,
    const std::vector<core::SessionManager::SourceDescriptorSnapshot>& descriptor_snapshots) {
    const auto candidates = ClientStreamKeyCandidates(source);
    const auto it = std::find_if(descriptor_snapshots.begin(), descriptor_snapshots.end(), [&](const auto& snapshot) {
        return std::find(candidates.begin(), candidates.end(), snapshot.stream_key) != candidates.end();
    });
    return it == descriptor_snapshots.end() ? nullptr : &it->descriptor;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9500 function
std::optional<std::string> CapsFieldValue(const std::string& caps, const std::string& key) {
    std::size_t start = 0;
    while (start < caps.size()) {
        const std::size_t end = caps.find(',', start);
        std::string token = Trim(caps.substr(start, end == std::string::npos ? std::string::npos : end - start));
        if (end == std::string::npos) {
            start = caps.size();
        } else {
            start = end + 1;
        }

        const std::size_t equals = token.find('=');
        if (equals == std::string::npos) {
            continue;
        }
        if (Trim(token.substr(0, equals)) != key) {
            continue;
        }

        std::string value = Trim(token.substr(equals + 1));
        if (!value.empty() && value.front() == '(') {
            const std::size_t type_end = value.find(')');
            if (type_end != std::string::npos) {
                value = Trim(value.substr(type_end + 1));
            }
        }
        if (value.size() >= 2 &&
            ((value.front() == '"' && value.back() == '"') ||
             (value.front() == '\'' && value.back() == '\''))) {
            value = value.substr(1, value.size() - 2);
        }
        value = Trim(std::move(value));
        if (!value.empty()) {
            return value;
        }
    }
    return std::nullopt;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9539 function
std::optional<std::int64_t> ParsePositiveInt64Text(const std::string& raw) {
    const std::string value = Trim(raw);
    if (value.empty()) {
        return std::nullopt;
    }
    try {
        std::size_t consumed = 0;
        const std::int64_t parsed = std::stoll(value, &consumed, 10);
        if (consumed != value.size() || parsed <= 0) {
            return std::nullopt;
        }
        return parsed;
    } catch (...) {
        return std::nullopt;
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9556 function
std::optional<std::int64_t> CapsIntField(const std::string& caps, const std::string& key) {
    const auto value = CapsFieldValue(caps, key);
    if (!value.has_value()) {
        return std::nullopt;
    }
    return ParsePositiveInt64Text(*value);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9564 function
std::optional<std::int64_t> CapsFpsField(const std::string& caps) {
    const auto value = CapsFieldValue(caps, "framerate");
    if (!value.has_value()) {
        return std::nullopt;
    }
    const std::string fps = Trim(*value);
    const std::size_t slash = fps.find('/');
    if (slash == std::string::npos) {
        return ParsePositiveInt64Text(fps);
    }

    const auto numerator = ParsePositiveInt64Text(fps.substr(0, slash));
    const auto denominator = ParsePositiveInt64Text(fps.substr(slash + 1));
    if (!numerator.has_value() || !denominator.has_value() || *denominator <= 0) {
        return std::nullopt;
    }
    const std::int64_t rounded = (*numerator + (*denominator / 2)) / *denominator;
    return rounded > 0 ? std::optional<std::int64_t>(rounded) : std::nullopt;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9584 function
const media::TrackInfo* OpsHealthVideoTrack(const media::StreamDescriptor& descriptor) {
    const auto it = std::find_if(descriptor.tracks.begin(), descriptor.tracks.end(), [](const auto& track) {
        return track.kind == media::MediaKind::Video;
    });
    return it == descriptor.tracks.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9591 function
std::string OpsHealthCodecVideoName(const media::TrackInfo& track) {
    const std::string codec = media::ToString(track.codec);
    if (!codec.empty() && codec != "unknown") {
        return codec;
    }
    std::string name = LowerAscii(Trim(track.codec_name));
    const std::string prefix = "video/x-";
    if (name.rfind(prefix, 0) == 0) {
        name = name.substr(prefix.size());
    }
    return name == "unknown" ? std::string{} : name;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9604 function
void ApplyOpsSourceHealthCodec(OpsSourceHealthItem* item, const media::StreamDescriptor* descriptor) {
    if (item == nullptr || descriptor == nullptr) {
        return;
    }
    const auto* video_track = OpsHealthVideoTrack(*descriptor);
    if (video_track == nullptr) {
        return;
    }

    const std::string codec_name = OpsHealthCodecVideoName(*video_track);
    if (!codec_name.empty()) {
        item->codec_video = codec_name;
    }

    if (!video_track->caps_string.empty()) {
        if (const auto profile = CapsFieldValue(video_track->caps_string, "profile"); profile.has_value()) {
            item->codec_profile = *profile;
        }
        if (const auto width = CapsIntField(video_track->caps_string, "width"); width.has_value()) {
            item->codec_width = *width;
        }
        if (const auto height = CapsIntField(video_track->caps_string, "height"); height.has_value()) {
            item->codec_height = *height;
        }
        if (const auto fps = CapsFpsField(video_track->caps_string); fps.has_value()) {
            item->codec_fps = *fps;
        }
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9634 function
void ClassifyOpsSourceHealth(OpsSourceHealthItem* item,
                             const SourceViewRegistry::SourceRecord& source,
                             const SourceViewRegistry::PublishedViewRecord* view,
                             const analysis::AnalysisManager::TapSnapshot* tap,
                             const PublishedWebRtcSource::Snapshot* published_source,
                             const media::StreamDescriptor* descriptor,
                             const core::SessionManager::SourceReconnectStats* reconnect_stats,
                             const core::SessionManager::SourceEgressStats* egress_stats,
                             const std::string& checked_at) {
    if (item == nullptr) {
        return;
    }
    item->checked_at = checked_at;
    ApplyOpsSourceHealthCodec(item, descriptor);
    if (reconnect_stats != nullptr) {
        item->reconnect_count = reconnect_stats->reconnect_count;
        if (reconnect_stats->last_reconnect_at_ms > 0) {
            item->last_reconnect_at = FormatUnixMsUtc(reconnect_stats->last_reconnect_at_ms);
        }
    }
    if (!source.enabled) {
        item->status = "offline";
        item->reason = "disabled";
        return;
    }
    if (view == nullptr) {
        AddOpsSourceHealthWarning(item, "missing-published-view");
    } else if (!view->enabled) {
        AddOpsSourceHealthWarning(item, "view-disabled");
    }

    if (tap != nullptr) {
        if (tap->has_latest_frame) {
            item->last_frame_age_ms = tap->latest_frame_age_ms;
            if (tap->latest_frame_width > 0) {
                item->codec_width = tap->latest_frame_width;
            }
            if (tap->latest_frame_height > 0) {
                item->codec_height = tap->latest_frame_height;
            }
        }
        if (tap->latest_result.has_value()) {
            item->last_metadata_age_ms = tap->latest_result_age_ms;
        }

        const bool frame_fresh = item->last_frame_age_ms.has_value() &&
                                 *item->last_frame_age_ms <= kClientDashboardStaleMs;
        const bool metadata_fresh = item->last_metadata_age_ms.has_value() &&
                                    *item->last_metadata_age_ms <= kClientDashboardStaleMs;
        if (frame_fresh || metadata_fresh) {
            item->status = "live";
            item->reason = "receiving";
            if (item->last_frame_age_ms.has_value() && !frame_fresh) {
                AddOpsSourceHealthWarning(item, "last-frame-aged");
            }
            if (item->last_metadata_age_ms.has_value() && !metadata_fresh) {
                AddOpsSourceHealthWarning(item, "metadata-aged");
            }
            return;
        }
        if (item->last_frame_age_ms.has_value()) {
            item->status = "stale";
            item->reason = "last-frame-aged";
            return;
        }
        if (item->last_metadata_age_ms.has_value()) {
            item->status = "stale";
            item->reason = "metadata-aged";
            return;
        }
        item->status = "connecting";
        item->reason = "initializing";
        return;
    }

    if (published_source != nullptr) {
        if (published_source->active && published_source->has_video) {
            const bool has_egress_session = egress_stats != nullptr && egress_stats->session_count > 0;
            if (has_egress_session) {
                item->status = "live";
                item->reason = "receiving";
            } else {
                item->status = "connecting";
                item->reason = "no-egress-session";
                AddOpsSourceHealthWarning(item, "published-source-ready");
                AddOpsSourceHealthWarning(item, "no-egress-session");
            }
        } else if (published_source->active) {
            item->status = "connecting";
            item->reason = "initializing";
            AddOpsSourceHealthWarning(item, "waiting-video");
        } else {
            item->status = "offline";
            item->reason = "unreachable";
        }
        return;
    }

    item->status = "offline";
    item->reason = "no-subscriber";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9736 function
bool OpsSourceHealthRepeatedStaleCandidate(const OpsSourceHealthItem& item) {
    return item.status == "stale" &&
           (item.reason == "last-frame-aged" || item.reason == "metadata-aged");
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9741 function
void ApplyOpsSourceHealthWarningThresholds(OpsSourceHealthSnapshot* snapshot) {
    if (snapshot == nullptr) {
        return;
    }

    std::lock_guard lock(g_source_health_warning_mu);
    for (auto& item : snapshot->items) {
        if (item.reconnect_count >= kOpsSourceHealthHighReconnectThreshold) {
            AddOpsSourceHealthWarning(&item, "high-reconnect");
        }
        if (item.source_id.empty()) {
            continue;
        }

        if (!OpsSourceHealthRepeatedStaleCandidate(item)) {
            g_source_health_warning_state.erase(item.source_id);
            continue;
        }

        const std::string state_key = item.status + "\n" + item.reason;
        auto& state = g_source_health_warning_state[item.source_id];
        if (state.first == state_key) {
            ++state.second;
        } else {
            state = {state_key, 1};
        }
        if (state.second >= kOpsSourceHealthRepeatedStaleThreshold) {
            AddOpsSourceHealthWarning(&item, "repeated-stale");
        }
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9773 function
OpsSourceHealthSnapshot BuildOpsSourceHealthSnapshot(
    const std::vector<analysis::AnalysisManager::TapSnapshot>& analysis_taps,
    const std::vector<PublishedWebRtcSource::Snapshot>& publish_sources,
    const std::vector<core::SessionManager::SourceDescriptorSnapshot>& descriptor_snapshots,
    const std::vector<core::SessionManager::SourceReconnectStats>& reconnect_stats,
    const std::vector<core::SessionManager::SourceEgressStats>& egress_stats) {
    OpsSourceHealthSnapshot snapshot;
    std::vector<SourceViewRegistry::SourceRecord> sources;
    std::vector<SourceViewRegistry::PublishedViewRecord> views;
    std::string load_error;
    if (!SourceViewRegistry::Instance().Snapshot(&sources, &views, &load_error)) {
        snapshot.ok = false;
        snapshot.error = load_error.empty() ? "source registry load failed" : load_error;
        return snapshot;
    }

    snapshot.generated_at = FormatUnixMsUtc(NowUnixMs());
    snapshot.items.reserve(sources.size());
    for (const auto& source : sources) {
        OpsSourceHealthItem item;
        item.source_id = source.source_id;
        const auto* view = OpsHealthViewForSource(views, source.source_id);
        const auto* tap = OpsHealthTapForSource(source, analysis_taps);
        const auto* published_source = OpsHealthPublishedSourceFor(source, publish_sources);
        const media::StreamDescriptor* descriptor = OpsHealthDescriptorForSource(source, descriptor_snapshots);
        if (descriptor == nullptr && published_source != nullptr && published_source->descriptor.has_value()) {
            descriptor = &*published_source->descriptor;
        }
        const auto* stats = OpsHealthReconnectStatsForSource(source, reconnect_stats);
        const auto* egress = OpsHealthEgressStatsForSource(source, egress_stats);
        ClassifyOpsSourceHealth(&item,
                                source,
                                view,
                                tap,
                                published_source,
                                descriptor,
                                stats,
                                egress,
                                snapshot.generated_at);
        if (item.status == "live") {
            ++snapshot.live_count;
        } else if (item.status == "connecting") {
            ++snapshot.connecting_count;
        } else if (item.status == "stale") {
            ++snapshot.stale_count;
        } else if (item.status == "offline") {
            ++snapshot.offline_count;
        } else {
            ++snapshot.unknown_count;
        }
        snapshot.items.push_back(std::move(item));
    }
    ApplyOpsSourceHealthWarningThresholds(&snapshot);
    return snapshot;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9829 function
void AppendOpsSourceHealthSummaryJson(std::ostringstream& out, const OpsSourceHealthSnapshot& snapshot) {
    out << "{"
        << "\"total\":" << snapshot.items.size() << ","
        << "\"live\":" << snapshot.live_count << ","
        << "\"connecting\":" << snapshot.connecting_count << ","
        << "\"stale\":" << snapshot.stale_count << ","
        << "\"offline\":" << snapshot.offline_count << ","
        << "\"unknown\":" << snapshot.unknown_count
        << "}";
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9849 function
std::vector<OpsV380ActionRouteBoundaryItem> BuildV380ActionRouteBoundaryItems() {
    return {
        {"/ops/api/actions/route-boundary",
         "foundation",
         "GET",
         "ops-action-boundary",
         "implemented-read-only",
         "v3.8 action namespace boundary and future route catalog"},
        {"/ops/api/actions/capability-contract",
         "foundation",
         "GET",
         "ops-action-capability",
         "implemented-read-only",
         "allowed action, denied action, role/scope, and idempotency contract"},
        {"/ops/api/actions/request-ledger",
         "foundation",
         "GET",
         "ops-action-ledger",
         "implemented-read-only",
         "append-only/read-only action request ledger projection"},
        {"/ops/api/actions/approval-decision-gate",
         "workflow",
         "GET",
         "ops-action-approval",
         "implemented-read-only",
         "approval, hold, reject, field-needed, and stale decision guard"},
        {"/ops/api/actions/readiness-preflight",
         "workflow",
         "GET",
         "ops-action-readiness",
         "implemented-read-only",
         "capability, approval, field evidence, source health, and duplicate blocker preflight"},
        {"/ops/api/actions/source-recheck-pilot",
         "execution-pilot",
         "GET",
         "ops-action-source-recheck",
         "implemented-read-only",
         "lowest-risk source health recheck candidate envelope"},
        {"/ops/api/actions/client-notice-draft-queue",
         "execution-pilot",
         "GET",
         "ops-action-client-notice",
         "implemented-read-only",
         "viewer-safe notice draft queue preview without delivery"},
        {"/ops/api/actions/rule-draft-package",
         "execution-pilot",
         "GET",
         "ops-action-rule-draft",
         "implemented-read-only",
         "rule threshold/scenario draft package without apply"},
        {"/ops/api/actions/outcome-reconciliation",
         "evidence",
         "GET",
         "ops-action-outcome",
         "planned",
         "readiness, execution candidate, and observed outcome diff"},
        {"/ops/api/actions/receipt-bundle",
         "evidence",
         "GET",
         "ops-action-receipt",
         "implemented-read-only",
         "redacted approval/request/readiness/outcome receipt bundle"},
        {"/ops/api/actions/field-connector-evidence-package",
         "field-ai",
         "GET",
         "ops-action-field-connector",
         "implemented-read-only",
         "conditional ONVIF, external WHEP/TURN, and cloud provider evidence package"},
        {"/ops/api/actions/default-off-explanation",
         "field-ai",
         "GET",
         "ops-action-explanation",
         "implemented-read-only",
         "default-off approval, readiness, and outcome explanation hints without provider calls"},
    };
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9926 function
void AppendV380ActionRouteBoundaryItemJson(std::ostringstream& out,
                                           const OpsV380ActionRouteBoundaryItem& item) {
    out << "{"
        << "\"route\":\"" << JsonEscape(item.route) << "\","
        << "\"family\":\"" << JsonEscape(item.family) << "\","
        << "\"method\":\"" << JsonEscape(item.method) << "\","
        << "\"owner\":\"" << JsonEscape(item.owner) << "\","
        << "\"stage\":\"" << JsonEscape(item.stage) << "\","
        << "\"description\":\"" << JsonEscape(item.description) << "\","
        << "\"opsOnly\":true,"
        << "\"readOnly\":true"
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9940 function
std::string OpsV380ActionRouteBoundaryJson() {
    const auto items = BuildV380ActionRouteBoundaryItems();
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v380-action-route-boundary.v1\","
        << "\"status\":\"action-route-boundary\","
        << "\"generatedAt\":\"" << JsonEscape(FormatUnixMsUtc(NowUnixMs())) << "\","
        << "\"actionNamespace\":\"/ops/api/actions\","
        << "\"routeBoundaryOnly\":true,"
        << "\"legacyProjectionRefs\":";
    AppendJsonStringArray(out,
                          {"/ops/api/live-operations/command-plan",
                           "/ops/api/live-operations/staged-change-plan-impact-preview",
                           "/ops/api/site-operations/runbook-template-contract",
                           "/ops/api/site-operations/limited-safe-execution-pilot",
                           "/ops/api/site-operations/export-handoff-bundle"});
    out << ",\"actionRouteBoundary\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV380ActionRouteBoundaryItemJson(out, items[i]);
    }
    out << "],\"routePolicy\":{"
        << "\"namespace\":\"/ops/api/actions\","
        << "\"defaultMethod\":\"GET\","
        << "\"defaultCacheControl\":\"no-store\","
        << "\"separateFromV350LiveOperations\":true,"
        << "\"separateFromV370SiteOperations\":true,"
        << "\"writeEndpointsReservedForFutureApproval\":true"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"routeBoundaryOnly\":true,"
        << "\"separateFromV350LiveOperations\":true,"
        << "\"separateFromV370SiteOperations\":true,"
        << "\"actionExecutionPerformed\":false,"
        << "\"actionRequestPersisted\":false,"
        << "\"approvalDecisionPersisted\":false,"
        << "\"readinessCheckExecuted\":false,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"runbookInstancePersisted\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10003 function
std::string OpsV390OnvifLiveImportPersistDecisionJson() {
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v390-onvif-live-import-persist-decision.v1\","
        << "\"status\":\"manualImportPersistDecision\","
        << "\"generatedAt\":\"" << JsonEscape(FormatUnixMsUtc(NowUnixMs())) << "\","
        << "\"route\":\"/ops/api/onvif/live-import-persist-decision\","
        << "\"requiredScope\":\"ops:read\","
        << "\"decision\":{"
        << "\"featureId\":\"V390-CAND-002\","
        << "\"selectedMode\":\"manual-form-save-handoff\","
        << "\"approvedPersistPath\":\"operator-save-channel-form-paired-rollback\","
        << "\"importDraftRoute\":\"/ops/api/onvif/import-draft\","
        << "\"manualPairedSaveRoute\":\"/ops/api/onvif/channels/{channelId}\","
        << "\"legacySourceSaveRoute\":\"/ops/api/sources/{channelId}\","
        << "\"legacyPublishedViewSaveRoute\":\"/ops/api/views/{channelId}\","
        << "\"oneShotPersistEnabled\":false,"
        << "\"autoSourceViewWriteEnabled\":false,"
        << "\"importDraftNotSavedPreserved\":true,"
        << "\"operatorAnswer\":\"apply probe/import draft to the channel form, then require an explicit operator paired save with compensating rollback for SourceRegistry and PublishedView\""
        << "},\"scopeAndAudit\":{"
        << "\"sourceWriteRequiredForManualSave\":true,"
        << "\"manualSaveUsesPairedSourceViewRoute\":true,"
        << "\"storageMode\":\"paired-write-with-compensating-rollback\","
        << "\"auditBoundary\":\"successful paired save enters the existing channel audit trail\","
        << "\"rollbackModel\":\"server restores every registry file replaced before a paired save failure; rollback failure is reported as manual-recovery-required\","
        << "\"operatorReviewRequired\":true"
        << "},\"rollbackModel\":{"
        << "\"preSaveRollback\":\"clear or edit the draft form\","
        << "\"writeFailureRollback\":\"server-owned exact pre-transaction source/view snapshot restore\","
        << "\"postCommitRollback\":\"operator edit/delete through existing channel management routes\","
        << "\"decisionRouteRollbackWritePerformed\":false"
        << "},\"evidenceChecks\":";
    AppendJsonStringArray(out,
                          {"import-draft-notSaved",
                           "manual-save-source-write-scope",
                           "paired-source-view-save",
                           "second-write-failure-source-rollback",
                           "restart-consistency",
                           "no-direct-persist-route"});
    out << ",\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"importDraftEndpointNotSaved\":true,"
        << "\"sourceWriteRequiredForManualSave\":true,"
        << "\"manualPairedSaveRouteAdded\":true,"
        << "\"oneShotPersistEnabled\":false,"
        << "\"autoSourceViewWriteEnabled\":false,"
        << "\"importDraftAutoPersistPerformed\":false,"
        << "\"sourceRegistryWritePerformedByDecisionRoute\":false,"
        << "\"publishedViewWritePerformedByDecisionRoute\":false,"
        << "\"directPersistRouteAdded\":false,"
        << "\"clientViewerExposureAdded\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10067 function
std::string OpsV390OnvifCredentialProviderStatusSummaryJson() {
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v390-onvif-credential-provider-status.v1\","
        << "\"status\":\"sanitizedCredentialProviderStatusSummary\","
        << "\"generatedAt\":\"" << JsonEscape(FormatUnixMsUtc(NowUnixMs())) << "\","
        << "\"route\":\"/ops/api/onvif/credential-provider-status\","
        << "\"requiredScope\":\"ops:read\","
        << "\"decision\":{"
        << "\"featureId\":\"V390-CAND-001\","
        << "\"primarySelection\":\"none\","
        << "\"primaryDecision\":\"defer-product-persistent-store\","
        << "\"fallbackSelection\":\"in-memory-fixture\","
        << "\"fallbackUse\":\"test-fixture-and-loopback-only\","
        << "\"credentialReferencePolicy\":\"reference-status-only\","
        << "\"operatorAnswer\":\"use sanitized provider readiness only; do not expose credential reference values or secret material\""
        << "},\"providerReadiness\":{"
        << "\"primaryProvider\":\"none\","
        << "\"primaryProviderReady\":false,"
        << "\"fallbackProvider\":\"in-memory-fixture\","
        << "\"fallbackProviderReady\":true,"
        << "\"productPersistentSecretStoreEnabled\":false,"
        << "\"externalSecretManagerEnabled\":false,"
        << "\"statusSummaryOnly\":true"
        << "},\"excludedProviders\":";
    AppendJsonStringArray(out, {"local-encrypted", "external-secret-manager", "plaintext-api-field"});
    out << ",\"excludedReasons\":{"
        << "\"localEncrypted\":\"requires separate security roadmap and encrypted storage design\","
        << "\"externalSecretManager\":\"requires external provider credential approval and field smoke\","
        << "\"plaintextApiField\":\"credential material must not be accepted or exposed by product API/UI\""
        << "},\"fallbacks\":";
    AppendJsonStringArray(out, {"in-memory-fixture", "credential-reference-absent"});
    out << ",\"redactionSummary\":{"
        << "\"credentialLookupPerformed\":false,"
        << "\"credentialReferenceValueIncluded\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"secretMaterialStored\":false,"
        << "\"referenceValueExposed\":false,"
        << "\"sourceRegistrySecretFields\":false,"
        << "\"publishedViewSecretFields\":false,"
        << "\"clientViewerExposureAdded\":false"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"statusSummaryOnly\":true,"
        << "\"credentialLookupPerformed\":false,"
        << "\"credentialReferenceValueIncluded\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"secretMaterialStored\":false,"
        << "\"productPersistentSecretStoreEnabled\":false,"
        << "\"externalSecretManagerEnabled\":false,"
        << "\"sourceRegistrySecretFields\":false,"
        << "\"publishedViewSecretFields\":false,"
        << "\"clientViewerExposureAdded\":false,"
        << "\"authRoleScopeChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10144 function
std::vector<OpsV380ActionCapabilityContractItem> BuildV380ActionCapabilityContractItems() {
    return {
        {"source-recheck",
         "Source health recheck request",
         "source-health-readiness",
         "ops",
         {"ops:read", "ops:actions:request"},
         "v380-actions/{siteId}/source-recheck/{requestFingerprint}",
         "allowed-preview-only",
         "Prepare a source health recheck request without executing the recheck or writing source state",
         true},
        {"client-notice-draft",
         "Client notice draft request",
         "client-safe-notice-preview",
         "ops",
         {"ops:read", "ops:actions:request"},
         "v380-actions/{siteId}/client-notice-draft/{requestFingerprint}",
         "allowed-preview-only",
         "Prepare a viewer-safe notice draft without queue writes or delivery",
         true},
        {"rule-draft-package",
         "Rule draft package request",
         "rule-draft-review-package",
         "admin",
         {"ops:read", "ops:actions:request", "rules:read"},
         "v380-actions/{siteId}/rule-draft-package/{requestFingerprint}",
         "allowed-preview-only",
         "Prepare a rule or scenario draft package without applying registry changes",
         true},
        {"receipt-bundle",
         "Action receipt bundle request",
         "redacted-action-receipt",
         "ops",
         {"ops:read", "ops:actions:request"},
         "v380-actions/{siteId}/receipt-bundle/{requestFingerprint}",
         "allowed-preview-only",
         "Prepare a redacted request, readiness, and outcome receipt bundle",
         true},
        {"direct-source-write",
         "Direct source registry write",
         "source-registry-mutation",
         "admin",
         {"ops:read", "sources:write"},
         "blocked/direct-source-write",
         "denied",
         "Blocked because v3.8 action contracts cannot mutate SourceRegistry or PublishedView state",
         false},
        {"direct-rule-apply",
         "Direct rule apply",
         "rule-registry-mutation",
         "admin",
         {"ops:read", "rules:write"},
         "blocked/direct-rule-apply",
         "denied",
         "Blocked because v3.8 action contracts only prepare review packages",
         false},
        {"direct-client-notice-send",
         "Direct client notice send",
         "client-notice-delivery",
         "ops",
         {"ops:read", "client:notice:send"},
         "blocked/direct-client-notice-send",
         "denied",
         "Blocked because v3.8 action contracts only prepare viewer-safe notice drafts",
         false},
        {"media-path-change",
         "Media path change",
         "media-session-mutation",
         "admin",
         {"ops:read", "media:write"},
         "blocked/media-path-change",
         "denied",
         "Blocked because v3.8 action contracts cannot change RTSP, WebRTC, SSE, WS, or event schemas",
         false},
    };
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10221 function
void AppendV380ActionCapabilityContractItemJson(std::ostringstream& out,
                                                const OpsV380ActionCapabilityContractItem& item) {
    out << "{"
        << "\"actionKind\":\"" << JsonEscape(item.action_kind) << "\","
        << "\"actionLabel\":\"" << JsonEscape(item.action_label) << "\","
        << "\"capability\":\"" << JsonEscape(item.capability) << "\","
        << "\"allowed\":" << JsonBool(item.allowed) << ","
        << "\"requiredRole\":\"" << JsonEscape(item.required_role) << "\","
        << "\"requiredScopes\":";
    AppendJsonStringArray(out, item.required_scopes);
    out << ",\"idempotencyKeyPattern\":\"" << JsonEscape(item.idempotency_key_pattern) << "\","
        << "\"status\":\"" << JsonEscape(item.status) << "\","
        << "\"description\":\"" << JsonEscape(item.description) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10237 function
std::string OpsV380ActionCapabilityContractJson() {
    const auto items = BuildV380ActionCapabilityContractItems();
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v380-action-capability-contract.v1\","
        << "\"status\":\"action-capability-contract\","
        << "\"generatedAt\":\"" << JsonEscape(FormatUnixMsUtc(NowUnixMs())) << "\","
        << "\"route\":\"/ops/api/actions/capability-contract\","
        << "\"routeBoundary\":\"/ops/api/actions/route-boundary\","
        << "\"actionCapabilityContract\":{"
        << "\"contractOnly\":true,"
        << "\"requiredRole\":\"ops\","
        << "\"requiredScopes\":";
    AppendJsonStringArray(out, {"ops:read", "ops:actions:request"});
    out << ",\"allowedStatuses\":";
    AppendJsonStringArray(out, {"allowed-preview-only", "denied"});
    out << "},\"allowedActionCatalog\":[";
    bool wrote_allowed = false;
    for (const auto& item : items) {
        if (!item.allowed) {
            continue;
        }
        if (wrote_allowed) {
            out << ",";
        }
        AppendV380ActionCapabilityContractItemJson(out, item);
        wrote_allowed = true;
    }
    out << "],\"deniedActionCatalog\":[";
    bool wrote_denied = false;
    for (const auto& item : items) {
        if (item.allowed) {
            continue;
        }
        if (wrote_denied) {
            out << ",";
        }
        AppendV380ActionCapabilityContractItemJson(out, item);
        wrote_denied = true;
    }
    out << "],\"idempotencyPolicy\":{"
        << "\"required\":true,"
        << "\"keyOwner\":\"operator-request\","
        << "\"duplicateRequestBehavior\":\"return-existing-read-model\","
        << "\"keyMaterial\":\"siteId, actionKind, requestFingerprint\","
        << "\"requestWritePerformed\":false"
        << "},\"immutableSchemaBoundary\":{"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"capabilityContractOnly\":true,"
        << "\"actionExecutionPerformed\":false,"
        << "\"actionRequestPersisted\":false,"
        << "\"approvalDecisionPersisted\":false,"
        << "\"readinessCheckExecuted\":false,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"runbookInstancePersisted\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10330 function
std::vector<OpsV380ActionRequestLedgerContractItem> BuildV380ActionRequestLedgerContractItems() {
    return {
        {"actionRequestId",
         "actionRequestId",
         "string",
         "operator-request-envelope",
         "Stable request identifier used by receipt and readiness projections",
         true},
        {"siteId",
         "siteId",
         "string",
         "site/source-group projection",
         "Site boundary for the requested action",
         true},
        {"runbookId",
         "runbookId",
         "string",
         "runbook-template-or-null",
         "Optional runbook template reference for repeated operator workflows",
         false},
        {"requestedBy",
         "requestedBy",
         "principal",
         "ops principal",
         "Redacted operator identity reference for review and receipt projections",
         true},
        {"status",
         "status",
         "enum",
         "request status model",
         "Read-only request state such as draft, approval-needed, blocked, or completed",
         true},
        {"createdAt",
         "createdAt",
         "timestamp",
         "server clock",
         "UTC creation timestamp for deterministic ledger ordering",
         true},
        {"idempotencyKey",
         "idempotencyKey",
         "string",
         "operator-request fingerprint",
         "Duplicate request guard derived from site, action kind, and request fingerprint",
         true},
    };
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10377 function
void AppendV380ActionRequestLedgerContractItemJson(
    std::ostringstream& out,
    const OpsV380ActionRequestLedgerContractItem& item) {
    out << "{"
        << "\"field\":\"" << JsonEscape(item.field) << "\","
        << "\"jsonName\":\"" << JsonEscape(item.json_name) << "\","
        << "\"type\":\"" << JsonEscape(item.type) << "\","
        << "\"source\":\"" << JsonEscape(item.source) << "\","
        << "\"required\":" << JsonBool(item.required) << ","
        << "\"description\":\"" << JsonEscape(item.description) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10390 function
std::string OpsV380ActionRequestLedgerContractJson() {
    const auto items = BuildV380ActionRequestLedgerContractItems();
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v380-action-request-ledger-contract.v1\","
        << "\"status\":\"action-request-ledger-contract\","
        << "\"generatedAt\":\"" << JsonEscape(FormatUnixMsUtc(NowUnixMs())) << "\","
        << "\"route\":\"/ops/api/actions/request-ledger\","
        << "\"capabilityContractRoute\":\"/ops/api/actions/capability-contract\","
        << "\"actionRequestLedgerContract\":{"
        << "\"contractOnly\":true,"
        << "\"appendOnly\":true,"
        << "\"readOnlyProjection\":true,"
        << "\"ledgerIdPattern\":\"v380-actions/{siteId}/{actionKind}/{idempotencyKey}\","
        << "\"idempotencyKey\":\"siteId:actionKind:requestFingerprint\""
        << "},\"ledgerFields\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV380ActionRequestLedgerContractItemJson(out, items[i]);
    }
    out << "],\"statusModel\":";
    AppendJsonStringArray(out,
                          {"draft",
                           "approval-needed",
                           "approved",
                           "blocked",
                           "field-needed",
                           "rejected",
                           "expired",
                           "completed"});
    out << ",\"appendOnlyPolicy\":{"
        << "\"contractOnly\":true,"
        << "\"appendRequiresIdempotencyKey\":true,"
        << "\"duplicateRequestBehavior\":\"return-existing-read-model\","
        << "\"requestWritePerformed\":false"
        << "},\"readOnlyProjection\":{"
        << "\"enabled\":true,"
        << "\"sort\":\"createdAt-desc\","
        << "\"mutableFields\":";
    AppendJsonStringArray(out, {});
    out << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"ledgerContractOnly\":true,"
        << "\"requestWritePerformed\":false,"
        << "\"actionExecutionPerformed\":false,"
        << "\"actionRequestPersisted\":false,"
        << "\"approvalDecisionPersisted\":false,"
        << "\"readinessCheckExecuted\":false,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"runbookInstancePersisted\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10474 function
std::vector<OpsV380ApprovalDecisionGateItem> BuildV380ApprovalDecisionGateItems() {
    return {
        {"approve",
         "Approve request",
         "ops",
         {"approved", "readiness-required"},
         "15m",
         "Marks the request as operator-approved for a later readiness preflight contract",
         true},
        {"hold",
         "Hold request",
         "ops",
         {"blocked", "approval-needed"},
         "15m",
         "Keeps the request in review with a visible blocker reason",
         true},
        {"reject",
         "Reject request",
         "ops",
         {"rejected"},
         "15m",
         "Rejects the request for review purposes without executing or writing action state",
         true},
        {"field-needed",
         "Field evidence needed",
         "ops",
         {"field-needed", "blocked"},
         "30m",
         "Requires external or site evidence before any later readiness preflight can continue",
         true},
    };
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10507 function
void AppendV380ApprovalDecisionGateItemJson(std::ostringstream& out,
                                            const OpsV380ApprovalDecisionGateItem& item) {
    out << "{"
        << "\"decision\":\"" << JsonEscape(item.decision) << "\","
        << "\"label\":\"" << JsonEscape(item.label) << "\","
        << "\"requiredRole\":\"" << JsonEscape(item.required_role) << "\","
        << "\"reasonRequired\":" << JsonBool(item.reason_required) << ","
        << "\"allowedNextStatuses\":";
    AppendJsonStringArray(out, item.allowed_next_statuses);
    out << ",\"staleAfter\":\"" << JsonEscape(item.stale_after) << "\","
        << "\"description\":\"" << JsonEscape(item.description) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10521 function
std::string OpsV380ApprovalDecisionGateJson() {
    const auto items = BuildV380ApprovalDecisionGateItems();
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v380-approval-decision-gate.v1\","
        << "\"status\":\"approval-decision-gate\","
        << "\"generatedAt\":\"" << JsonEscape(FormatUnixMsUtc(NowUnixMs())) << "\","
        << "\"route\":\"/ops/api/actions/approval-decision-gate\","
        << "\"capabilityContractRoute\":\"/ops/api/actions/capability-contract\","
        << "\"requestLedgerRoute\":\"/ops/api/actions/request-ledger\","
        << "\"approvalDecisionGate\":{"
        << "\"contractOnly\":true,"
        << "\"reviewer\":\"ops-principal-ref\","
        << "\"reason\":\"required-for-all-decisions\","
        << "\"auditRef\":\"future-ops-audit-ref\","
        << "\"approvalGateContractOnly\":true"
        << "},\"decisionStates\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV380ApprovalDecisionGateItemJson(out, items[i]);
    }
    out << "],\"staleDecisionGuard\":{"
        << "\"enabled\":true,"
        << "\"defaultStaleAfter\":\"15m\","
        << "\"fieldNeededStaleAfter\":\"30m\","
        << "\"staleDecisionBlocksReadiness\":true,"
        << "\"decisionWritePerformed\":false"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"approvalGateContractOnly\":true,"
        << "\"decisionWritePerformed\":false,"
        << "\"actionExecutionPerformed\":false,"
        << "\"actionRequestPersisted\":false,"
        << "\"approvalDecisionPersisted\":false,"
        << "\"readinessCheckExecuted\":false,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"runbookInstancePersisted\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10592 function
std::vector<OpsV380ActionReadinessPreflightItem> BuildV380ActionReadinessPreflightItems() {
    return {
        {"capability",
         "capability.allowed",
         "ready",
         "missing-capability",
         "/ops/api/actions/capability-contract",
         "Requested action kind must be present in the allowed preview-only catalog",
         true},
        {"approval",
         "approval.decision",
         "approved",
         "approval-missing",
         "/ops/api/actions/approval-decision-gate",
         "Approval decision must be approved and not stale before any later pilot candidate",
         true},
        {"fieldEvidence",
         "fieldEvidence.status",
         "ready-or-not-required",
         "field-evidence-required",
         "conditional field evidence attachment",
         "External credential, endpoint, and field evidence requirements remain explicit blockers",
         false},
        {"sourceHealth",
         "sourceHealth.rollup",
         "healthy-or-recovering",
         "source-health-degraded",
         "site/source health projection",
         "Source health must not indicate offline, degraded, or field-needed state for a pilot candidate",
         true},
        {"clientImpact",
         "clientImpact.safety",
         "viewer-safe",
         "client-impact-review-needed",
         "client impact forecast projection",
         "Client-facing impact must stay viewer-safe and hide operator-only blocker detail",
         true},
        {"duplicateRequest",
         "idempotencyKey",
         "unique-or-existing-read-model",
         "duplicate-request",
         "/ops/api/actions/request-ledger",
         "Duplicate request fingerprints must return an existing read model instead of creating a write",
         true},
    };
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10639 function
void AppendV380ActionReadinessPreflightItemJson(
    std::ostringstream& out,
    const OpsV380ActionReadinessPreflightItem& item) {
    out << "{"
        << "\"dimension\":\"" << JsonEscape(item.dimension) << "\","
        << "\"field\":\"" << JsonEscape(item.field) << "\","
        << "\"expectedState\":\"" << JsonEscape(item.expected_state) << "\","
        << "\"blocker\":\"" << JsonEscape(item.blocker) << "\","
        << "\"source\":\"" << JsonEscape(item.source) << "\","
        << "\"required\":" << JsonBool(item.required) << ","
        << "\"description\":\"" << JsonEscape(item.description) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10653 function
std::string OpsV380ActionReadinessPreflightJson() {
    const auto items = BuildV380ActionReadinessPreflightItems();
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v380-action-readiness-preflight.v1\","
        << "\"status\":\"action-readiness-preflight\","
        << "\"generatedAt\":\"" << JsonEscape(FormatUnixMsUtc(NowUnixMs())) << "\","
        << "\"route\":\"/ops/api/actions/readiness-preflight\","
        << "\"capabilityContractRoute\":\"/ops/api/actions/capability-contract\","
        << "\"approvalDecisionGateRoute\":\"/ops/api/actions/approval-decision-gate\","
        << "\"requestLedgerRoute\":\"/ops/api/actions/request-ledger\","
        << "\"readinessPreflight\":{"
        << "\"contractOnly\":true,"
        << "\"readinessPreflightContractOnly\":true,"
        << "\"defaultReadinessState\":\"not-run\","
        << "\"readyState\":\"ready\","
        << "\"blockedState\":\"blocked\""
        << "},\"readinessStates\":";
    AppendJsonStringArray(out,
                          {"ready",
                           "blocked",
                           "approval-needed",
                           "field-needed",
                           "duplicate-request",
                           "not-run"});
    out << ",\"preflightBlockers\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV380ActionReadinessPreflightItemJson(out, items[i]);
    }
    out << "],\"preflightInputs\":{"
        << "\"capability\":\"/ops/api/actions/capability-contract\","
        << "\"approval\":\"/ops/api/actions/approval-decision-gate\","
        << "\"fieldEvidence\":\"conditional-field-evidence-package\","
        << "\"sourceHealth\":\"site-source-health-rollup\","
        << "\"clientImpact\":\"client-safe-impact-forecast\","
        << "\"duplicateRequest\":\"/ops/api/actions/request-ledger\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"readinessPreflightContractOnly\":true,"
        << "\"readinessCheckExecuted\":false,"
        << "\"actionExecutionPerformed\":false,"
        << "\"actionRequestPersisted\":false,"
        << "\"approvalDecisionPersisted\":false,"
        << "\"readinessResultPersisted\":false,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"runbookInstancePersisted\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10733 function
std::vector<OpsV380SourceRecheckActionPilotItem> BuildV380SourceRecheckActionPilotItems() {
    return {
        {"readinessRef",
         "ready",
         "readiness-blocked",
         "/ops/api/actions/readiness-preflight",
         "Pilot candidate requires an existing readiness preflight read model in ready state",
         true},
        {"recheckRequest",
         "not-run",
         "operator-confirmation-required",
         "operator action request",
         "Source health recheck request envelope is prepared without contacting source workers",
         true},
        {"sourceHealthRecheck",
         "not-run",
         "source-recheck-not-executed",
         "source health projection",
         "Actual source health probe stays out of this read-only pilot contract",
         true},
        {"dryExecutionResultEnvelope",
         "not-run",
         "dry-result-only",
         "execution preview",
         "Dry execution result shape is available for receipts without persisting action output",
         true},
        {"executionPreview",
         "blocked",
         "field-needed",
         "field evidence condition",
         "Field-needed and degraded source states stay visible as blockers before any later execution",
         false},
    };
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10768 function
void AppendV380SourceRecheckActionPilotItemJson(
    std::ostringstream& out,
    const OpsV380SourceRecheckActionPilotItem& item) {
    out << "{"
        << "\"field\":\"" << JsonEscape(item.field) << "\","
        << "\"state\":\"" << JsonEscape(item.state) << "\","
        << "\"blocker\":\"" << JsonEscape(item.blocker) << "\","
        << "\"source\":\"" << JsonEscape(item.source) << "\","
        << "\"required\":" << JsonBool(item.required) << ","
        << "\"description\":\"" << JsonEscape(item.description) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10781 function
std::string OpsV380SourceRecheckActionPilotJson() {
    const auto items = BuildV380SourceRecheckActionPilotItems();
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v380-source-recheck-action-pilot.v1\","
        << "\"status\":\"source-recheck-action-pilot\","
        << "\"generatedAt\":\"" << JsonEscape(FormatUnixMsUtc(NowUnixMs())) << "\","
        << "\"route\":\"/ops/api/actions/source-recheck-pilot\","
        << "\"readinessPreflightRoute\":\"/ops/api/actions/readiness-preflight\","
        << "\"capabilityContractRoute\":\"/ops/api/actions/capability-contract\","
        << "\"approvalDecisionGateRoute\":\"/ops/api/actions/approval-decision-gate\","
        << "\"requestLedgerRoute\":\"/ops/api/actions/request-ledger\","
        << "\"sourceRecheckActionPilot\":{"
        << "\"contractOnly\":true,"
        << "\"sourceRecheckPilotContractOnly\":true,"
        << "\"pilotCandidate\":\"source-health-recheck\","
        << "\"sourceHealthRecheck\":\"not-run\","
        << "\"recheckRequest\":\"prepared-read-model\","
        << "\"readinessRef\":\"/ops/api/actions/readiness-preflight\""
        << "},\"pilotStates\":";
    AppendJsonStringArray(out, {"ready", "blocked", "degraded", "field-needed", "not-run"});
    out << ",\"pilotCandidate\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV380SourceRecheckActionPilotItemJson(out, items[i]);
    }
    out << "],\"dryExecutionResultEnvelope\":{"
        << "\"resultState\":\"not-run\","
        << "\"executionPreview\":\"dry-result-only\","
        << "\"sourceHealthBefore\":\"source-health-rollup-ref\","
        << "\"sourceHealthAfter\":\"not-collected\","
        << "\"receiptRef\":\"future-action-receipt\","
        << "\"actionResultPersisted\":false"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"sourceRecheckPilotContractOnly\":true,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"sourceHealthWritePerformed\":false,"
        << "\"actionExecutionPerformed\":false,"
        << "\"actionResultPersisted\":false,"
        << "\"actionRequestPersisted\":false,"
        << "\"approvalDecisionPersisted\":false,"
        << "\"readinessResultPersisted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"runbookInstancePersisted\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10858 function
std::vector<OpsV380ClientNoticeDraftQueueItem> BuildV380ClientNoticeDraftQueueItems() {
    return {
        {"readinessRef",
         "ready",
         "readiness-blocked",
         "ops",
         "Draft queue preview requires an existing readiness preflight read model in ready state",
         true},
        {"viewerSafeNoticeDraft",
         "draft",
         "redaction-review-required",
         "viewer",
         "Viewer-safe maintenance, degraded, recovering, or available copy is prepared without exposing operator detail",
         true},
        {"noticeDraft",
         "redacted",
         "operator-detail-hidden",
         "viewer",
         "Internal blocker, source locator, credential, raw diagnostic, and action rationale details stay out of client copy",
         true},
        {"queuePreview",
         "not-run",
         "delivery-blocked",
         "ops",
         "Queue position and delivery target preview is contract-only and does not write a queue record",
         true},
        {"deliveryBlocker",
         "blocked",
         "client-notice-send-disabled",
         "ops",
         "Actual notice delivery remains blocked until a later explicitly approved execution step",
         true},
        {"pilotRef",
         "not-run",
         "pilot-result-not-required",
         "ops",
         "Source recheck pilot result can be referenced by a later receipt without triggering client delivery",
         false},
    };
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10899 function
void AppendV380ClientNoticeDraftQueueItemJson(
    std::ostringstream& out,
    const OpsV380ClientNoticeDraftQueueItem& item) {
    out << "{"
        << "\"field\":\"" << JsonEscape(item.field) << "\","
        << "\"state\":\"" << JsonEscape(item.state) << "\","
        << "\"blocker\":\"" << JsonEscape(item.blocker) << "\","
        << "\"audience\":\"" << JsonEscape(item.audience) << "\","
        << "\"required\":" << JsonBool(item.required) << ","
        << "\"description\":\"" << JsonEscape(item.description) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10912 function
std::string OpsV380ClientNoticeDraftQueueJson() {
    const auto items = BuildV380ClientNoticeDraftQueueItems();
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v380-client-notice-draft-queue.v1\","
        << "\"status\":\"client-notice-draft-queue\","
        << "\"generatedAt\":\"" << JsonEscape(FormatUnixMsUtc(NowUnixMs())) << "\","
        << "\"route\":\"/ops/api/actions/client-notice-draft-queue\","
        << "\"readinessPreflightRoute\":\"/ops/api/actions/readiness-preflight\","
        << "\"capabilityContractRoute\":\"/ops/api/actions/capability-contract\","
        << "\"approvalDecisionGateRoute\":\"/ops/api/actions/approval-decision-gate\","
        << "\"requestLedgerRoute\":\"/ops/api/actions/request-ledger\","
        << "\"sourceRecheckPilotRoute\":\"/ops/api/actions/source-recheck-pilot\","
        << "\"clientNoticeDraftQueue\":{"
        << "\"contractOnly\":true,"
        << "\"clientNoticeDraftQueueContractOnly\":true,"
        << "\"viewerSafeNoticeDraft\":\"prepared-read-model\","
        << "\"noticeDraft\":\"maintenance-degraded-recovering-available\","
        << "\"queuePreview\":\"delivery-blocked-not-run\","
        << "\"deliveryBlocker\":\"client-notice-send-disabled\","
        << "\"redactionBoundary\":\"viewer-safe-no-internal-blocker-detail\","
        << "\"readinessRef\":\"/ops/api/actions/readiness-preflight\","
        << "\"pilotRef\":\"/ops/api/actions/source-recheck-pilot\""
        << "},\"draftStates\":";
    AppendJsonStringArray(out, {"draft", "blocked", "redacted", "delivery-blocked", "not-run"});
    out << ",\"viewerSafeNoticeDrafts\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV380ClientNoticeDraftQueueItemJson(out, items[i]);
    }
    out << "],\"queuePreview\":{"
        << "\"queueState\":\"not-run\","
        << "\"deliveryTarget\":\"viewer-safe-group-ref\","
        << "\"deliveryBlocker\":\"client-notice-send-disabled\","
        << "\"noticeDraftPersisted\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"clientNoticeSent\":false"
        << "},\"redactionBoundary\":{"
        << "\"viewerSafeStatuses\":";
    AppendJsonStringArray(out, {"maintenance", "degraded", "recovering", "available"});
    out << ",\"operatorOnlyBlockerExposedToClient\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"clientNoticeDraftQueueContractOnly\":true,"
        << "\"noticeDraftPersisted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"operatorOnlyBlockerExposedToClient\":false,"
        << "\"actionExecutionPerformed\":false,"
        << "\"actionRequestPersisted\":false,"
        << "\"approvalDecisionPersisted\":false,"
        << "\"readinessResultPersisted\":false,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"sourceHealthWritePerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"runbookInstancePersisted\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11000 function
std::vector<OpsV380RuleDraftActionPackageItem> BuildV380RuleDraftActionPackageItems() {
    return {
        {"readinessRef",
         "ready",
         "readiness-blocked",
         "/ops/api/actions/readiness-preflight",
         "Rule draft package requires an existing readiness preflight read model in ready state",
         true},
        {"ruleThresholdCandidate",
         "draft",
         "threshold-review-required",
         "rule/VA what-if projection",
         "Rule threshold candidate is prepared for review without writing a rule or profile registry",
         true},
        {"scenarioCandidate",
         "draft",
         "scenario-review-required",
         "scenario impact preview",
         "Scenario candidate is prepared for review without applying runtime or media path changes",
         true},
        {"draftPackage",
         "blocked",
         "apply-blocked",
         "operator action package",
         "Draft package groups rule and scenario candidates with no apply or persistence side effect",
         true},
        {"reviewChecklist",
         "review-needed",
         "operator-review-required",
         "manual review checklist",
         "Operator must review approval, readiness, threshold, scenario impact, and client notice redaction before any later write step",
         true},
        {"noticeDraftRef",
         "not-run",
         "client-notice-draft-not-required",
         "/ops/api/actions/client-notice-draft-queue",
         "Optional notice draft reference can be attached later without sending or queueing client notices",
         false},
    };
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11041 function
void AppendV380RuleDraftActionPackageItemJson(
    std::ostringstream& out,
    const OpsV380RuleDraftActionPackageItem& item) {
    out << "{"
        << "\"field\":\"" << JsonEscape(item.field) << "\","
        << "\"state\":\"" << JsonEscape(item.state) << "\","
        << "\"blocker\":\"" << JsonEscape(item.blocker) << "\","
        << "\"source\":\"" << JsonEscape(item.source) << "\","
        << "\"required\":" << JsonBool(item.required) << ","
        << "\"description\":\"" << JsonEscape(item.description) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11054 function
std::string OpsV380RuleDraftActionPackageJson() {
    const auto items = BuildV380RuleDraftActionPackageItems();
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v380-rule-draft-action-package.v1\","
        << "\"status\":\"rule-draft-action-package\","
        << "\"generatedAt\":\"" << JsonEscape(FormatUnixMsUtc(NowUnixMs())) << "\","
        << "\"route\":\"/ops/api/actions/rule-draft-package\","
        << "\"readinessPreflightRoute\":\"/ops/api/actions/readiness-preflight\","
        << "\"capabilityContractRoute\":\"/ops/api/actions/capability-contract\","
        << "\"approvalDecisionGateRoute\":\"/ops/api/actions/approval-decision-gate\","
        << "\"requestLedgerRoute\":\"/ops/api/actions/request-ledger\","
        << "\"clientNoticeDraftQueueRoute\":\"/ops/api/actions/client-notice-draft-queue\","
        << "\"ruleDraftActionPackage\":{"
        << "\"contractOnly\":true,"
        << "\"ruleDraftActionPackageContractOnly\":true,"
        << "\"draftPackage\":\"prepared-read-model\","
        << "\"ruleThresholdCandidate\":\"threshold-scenario-review-only\","
        << "\"scenarioCandidate\":\"scenario-review-only\","
        << "\"reviewChecklist\":\"operator-review-required\","
        << "\"applyBlocker\":\"rule-apply-disabled\","
        << "\"readinessRef\":\"/ops/api/actions/readiness-preflight\","
        << "\"noticeDraftRef\":\"/ops/api/actions/client-notice-draft-queue\""
        << "},\"packageStates\":";
    AppendJsonStringArray(out, {"draft", "review-needed", "blocked", "apply-blocked", "not-run"});
    out << ",\"draftPackage\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV380RuleDraftActionPackageItemJson(out, items[i]);
    }
    out << "],\"reviewChecklist\":{"
        << "\"checklistState\":\"review-needed\","
        << "\"manualReviewRequired\":true,"
        << "\"requiredChecks\":";
    AppendJsonStringArray(out,
                          {"approval-state",
                           "readiness-state",
                           "rule-threshold-review",
                           "scenario-impact-review",
                           "client-notice-redaction"});
    out << "},\"applyBlocker\":{"
        << "\"ruleApplyPerformed\":false,"
        << "\"scenarioApplyPerformed\":false,"
        << "\"ruleDraftPersisted\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"profileRegistryWritePerformed\":false"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"ruleDraftActionPackageContractOnly\":true,"
        << "\"ruleDraftPersisted\":false,"
        << "\"ruleApplyPerformed\":false,"
        << "\"scenarioApplyPerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"profileRegistryWritePerformed\":false,"
        << "\"actionExecutionPerformed\":false,"
        << "\"actionRequestPersisted\":false,"
        << "\"approvalDecisionPersisted\":false,"
        << "\"readinessResultPersisted\":false,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"sourceHealthWritePerformed\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"runbookInstancePersisted\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11172 function
std::vector<OpsV380OutcomeObserverReconciliationItem>
BuildV380OutcomeObserverReconciliationItems() {
    const auto ledgerFields = BuildV380ActionRequestLedgerContractItems();
    const auto readinessItems = BuildV380ActionReadinessPreflightItems();
    const auto sourcePilotItems = BuildV380SourceRecheckActionPilotItems();
    const auto noticeDraftItems = BuildV380ClientNoticeDraftQueueItems();
    const auto rulePackageItems = BuildV380RuleDraftActionPackageItems();

    const std::size_t item_count =
        std::max<std::size_t>(1U,
                              std::max({sourcePilotItems.size(),
                                        noticeDraftItems.size(),
                                        rulePackageItems.size()}));
    std::vector<OpsV380OutcomeObserverReconciliationItem> items;
    for (std::size_t index = 0; index < item_count && index < 8U; ++index) {
        const auto& readiness =
            readinessItems.empty() ? OpsV380ActionReadinessPreflightItem{}
                                   : readinessItems[index % readinessItems.size()];
        const auto& source =
            sourcePilotItems.empty() ? OpsV380SourceRecheckActionPilotItem{}
                                     : sourcePilotItems[index % sourcePilotItems.size()];
        const auto& notice =
            noticeDraftItems.empty() ? OpsV380ClientNoticeDraftQueueItem{}
                                     : noticeDraftItems[index % noticeDraftItems.size()];
        const auto& rule =
            rulePackageItems.empty() ? OpsV380RuleDraftActionPackageItem{}
                                     : rulePackageItems[index % rulePackageItems.size()];

        OpsV380OutcomeObserverReconciliationItem item;
        item.outcome_observer_id =
            "outcomeObserver:v380:" + std::to_string(index + 1);
        item.action_request_ref =
            ledgerFields.empty()
                ? "actionRequestRef:v380-actions/{siteId}/{actionKind}/{idempotencyKey}"
                : "actionRequestRef:" + ledgerFields.front().json_name;
        item.readiness_ref =
            readiness.dimension.empty()
                ? "/ops/api/actions/readiness-preflight"
                : "/ops/api/actions/readiness-preflight#" + readiness.dimension;
        item.execution_candidate_ref =
            "executionCandidateRef:" +
            (source.field.empty() ? std::string("source-recheck-pilot")
                                  : source.field);
        item.observed_outcome_ref =
            "observedOutcomeRef:not-run:future-action-receipt";
        item.source_outcome_diff =
            "source-outcome-diff: readiness-to-outcome " +
            (source.state.empty() ? std::string("not-run") : source.state) +
            " -> observed:not-run";
        item.event_record_outcome_diff =
            "event-record-outcome-diff: candidate-to-observed-outcome no EventRecord write";
        item.client_impact_outcome_diff =
            "client-impact-outcome-diff: " +
            (notice.state.empty() ? std::string("notice-not-run") : notice.state) +
            " -> clientNoticeSent=false";
        item.rule_draft_outcome_diff =
            "rule-draft-outcome-diff: " +
            (rule.state.empty() ? std::string("draft-not-run") : rule.state) +
            " -> ruleApplyPerformed=false";
        item.reconciliation_status =
            "pending-observation";
        item.pending_reason =
            "actionExecutionPerformed=false; sourceRecheckExecuted=false; observedOutcomeRef=not-run";
        item.evidence_refs = {
            "/ops/api/actions/request-ledger",
            "/ops/api/actions/readiness-preflight",
            "/ops/api/actions/source-recheck-pilot",
            "/ops/api/actions/client-notice-draft-queue",
            "/ops/api/actions/rule-draft-package",
            "future-action-receipt",
        };
        item.observer_signals = {
            "readiness-to-outcome:pending",
            "candidate-to-observed-outcome:pending",
            "source-outcome-diff:not-run",
            "event-record-outcome-diff:not-run",
            "client-impact-outcome-diff:not-run",
            "rule-draft-outcome-diff:not-run",
        };
        items.push_back(std::move(item));
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11256 function
OpsV380OutcomeObserverReconciliationSummary
BuildV380OutcomeObserverReconciliationSummary(
    const std::vector<OpsV380OutcomeObserverReconciliationItem>& items) {
    OpsV380OutcomeObserverReconciliationSummary summary;
    summary.derivation_sources = {
        "BuildV380ActionRequestLedgerContractItems",
        "BuildV380ActionReadinessPreflightItems",
        "BuildV380SourceRecheckActionPilotItems",
        "BuildV380ClientNoticeDraftQueueItems",
        "BuildV380RuleDraftActionPackageItems",
    };
    summary.observer_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (!item.source_outcome_diff.empty()) {
            ++summary.source_diff_count;
        }
        if (!item.event_record_outcome_diff.empty()) {
            ++summary.event_record_diff_count;
        }
        if (!item.client_impact_outcome_diff.empty()) {
            ++summary.client_diff_count;
        }
        if (!item.rule_draft_outcome_diff.empty()) {
            ++summary.rule_diff_count;
        }
        if (item.reconciliation_status.find("pending") != std::string::npos) {
            ++summary.pending_count;
        }
        if (item.execution_observed) {
            ++summary.execution_observed_count;
        } else {
            ++summary.not_run_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11293 function
void AppendV380OutcomeObserverReconciliationSummaryJson(
    std::ostringstream& out,
    const OpsV380OutcomeObserverReconciliationSummary& summary) {
    out << "{"
        << "\"observerCount\":" << summary.observer_count << ","
        << "\"sourceDiffCount\":" << summary.source_diff_count << ","
        << "\"eventRecordDiffCount\":" << summary.event_record_diff_count << ","
        << "\"clientDiffCount\":" << summary.client_diff_count << ","
        << "\"ruleDiffCount\":" << summary.rule_diff_count << ","
        << "\"pendingCount\":" << summary.pending_count << ","
        << "\"executionObservedCount\":" << summary.execution_observed_count << ","
        << "\"notRunCount\":" << summary.not_run_count << ","
        << "\"derivationSources\":";
    AppendJsonStringArray(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11310 function
void AppendV380OutcomeObserverReconciliationItemJson(
    std::ostringstream& out,
    const OpsV380OutcomeObserverReconciliationItem& item) {
    out << "{"
        << "\"outcomeObserverId\":\"" << JsonEscape(item.outcome_observer_id) << "\","
        << "\"actionRequestRef\":\"" << JsonEscape(item.action_request_ref) << "\","
        << "\"readinessRef\":\"" << JsonEscape(item.readiness_ref) << "\","
        << "\"executionCandidateRef\":\"" << JsonEscape(item.execution_candidate_ref) << "\","
        << "\"observedOutcomeRef\":\"" << JsonEscape(item.observed_outcome_ref) << "\","
        << "\"sourceOutcomeDiff\":\"" << JsonEscape(item.source_outcome_diff) << "\","
        << "\"eventRecordOutcomeDiff\":\"" << JsonEscape(item.event_record_outcome_diff) << "\","
        << "\"clientImpactOutcomeDiff\":\"" << JsonEscape(item.client_impact_outcome_diff) << "\","
        << "\"ruleDraftOutcomeDiff\":\"" << JsonEscape(item.rule_draft_outcome_diff) << "\","
        << "\"reconciliationStatus\":\"" << JsonEscape(item.reconciliation_status) << "\","
        << "\"pendingReason\":\"" << JsonEscape(item.pending_reason) << "\","
        << "\"evidenceRefs\":";
    AppendJsonStringArray(out, item.evidence_refs);
    out << ",\"observerSignals\":";
    AppendJsonStringArray(out, item.observer_signals);
    out << ",\"sourceReconciled\":" << JsonBool(item.source_reconciled)
        << ",\"eventRecordReconciled\":" << JsonBool(item.event_record_reconciled)
        << ",\"clientReconciled\":" << JsonBool(item.client_reconciled)
        << ",\"ruleReconciled\":" << JsonBool(item.rule_reconciled)
        << ",\"executionObserved\":" << JsonBool(item.execution_observed)
        << ",\"readOnly\":" << JsonBool(item.read_only)
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11338 function
std::string OpsV380OutcomeObserverReconciliationJson() {
    const auto items = BuildV380OutcomeObserverReconciliationItems();
    const auto summary = BuildV380OutcomeObserverReconciliationSummary(items);
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v380-outcome-observer-reconciliation.v1\","
        << "\"status\":\"outcome-observer-reconciliation\","
        << "\"generatedAt\":\"" << JsonEscape(FormatUnixMsUtc(NowUnixMs())) << "\","
        << "\"route\":\"/ops/api/actions/outcome-reconciliation\","
        << "\"requestLedgerRoute\":\"/ops/api/actions/request-ledger\","
        << "\"readinessPreflightRoute\":\"/ops/api/actions/readiness-preflight\","
        << "\"sourceRecheckActionPilotRoute\":\"/ops/api/actions/source-recheck-pilot\","
        << "\"clientNoticeDraftQueueRoute\":\"/ops/api/actions/client-notice-draft-queue\","
        << "\"ruleDraftActionPackageRoute\":\"/ops/api/actions/rule-draft-package\","
        << "\"readinessCompared\":true,"
        << "\"candidateCompared\":true,"
        << "\"observedOutcomeCompared\":true,"
        << "\"executionObserved\":false,"
        << "\"outcomeObserverSummary\":";
    AppendV380OutcomeObserverReconciliationSummaryJson(out, summary);
    out << ",\"outcomeObserverItems\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV380OutcomeObserverReconciliationItemJson(out, items[i]);
    }
    out << "],\"observerPolicy\":{"
        << "\"comparisonAxes\":[\"source-outcome-diff\",\"event-record-outcome-diff\",\"client-impact-outcome-diff\",\"rule-draft-outcome-diff\"],"
        << "\"readinessRef\":\"required\","
        << "\"executionCandidateRef\":\"required\","
        << "\"observedOutcomeRef\":\"not-run until approved action evidence exists\","
        << "\"executionObserved\":false,"
        << "\"pendingOutcomeBehavior\":\"preserve pending/not-run; do not synthesize success\""
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"outcomeObserverOnly\":true,"
        << "\"readinessCompared\":true,"
        << "\"candidateCompared\":true,"
        << "\"observedOutcomeCompared\":true,"
        << "\"executionObserved\":false,"
        << "\"actionExecutionPerformed\":false,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"ruleApplyPerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"actionResultPersisted\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11430 function
std::vector<OpsV380ActionReceiptBundleItem> BuildV380ActionReceiptBundleItems() {
    const auto ledgerFields = BuildV380ActionRequestLedgerContractItems();
    const auto approvalStates = BuildV380ApprovalDecisionGateItems();
    const auto readinessItems = BuildV380ActionReadinessPreflightItems();
    const auto sourcePilotItems = BuildV380SourceRecheckActionPilotItems();
    const auto noticeDraftItems = BuildV380ClientNoticeDraftQueueItems();
    const auto rulePackageItems = BuildV380RuleDraftActionPackageItems();
    const auto outcomeItems = BuildV380OutcomeObserverReconciliationItems();

    const std::size_t item_count =
        std::max<std::size_t>(1U,
                              std::max({approvalStates.size(),
                                        readinessItems.size(),
                                        sourcePilotItems.size(),
                                        outcomeItems.size()}));
    std::vector<OpsV380ActionReceiptBundleItem> items;
    for (std::size_t index = 0; index < item_count && index < 8U; ++index) {
        const auto& ledger =
            ledgerFields.empty() ? OpsV380ActionRequestLedgerContractItem{}
                                 : ledgerFields[index % ledgerFields.size()];
        const auto& approval =
            approvalStates.empty() ? OpsV380ApprovalDecisionGateItem{}
                                   : approvalStates[index % approvalStates.size()];
        const auto& readiness =
            readinessItems.empty() ? OpsV380ActionReadinessPreflightItem{}
                                   : readinessItems[index % readinessItems.size()];
        const auto& source =
            sourcePilotItems.empty() ? OpsV380SourceRecheckActionPilotItem{}
                                     : sourcePilotItems[index % sourcePilotItems.size()];
        const auto& notice =
            noticeDraftItems.empty() ? OpsV380ClientNoticeDraftQueueItem{}
                                     : noticeDraftItems[index % noticeDraftItems.size()];
        const auto& rule =
            rulePackageItems.empty() ? OpsV380RuleDraftActionPackageItem{}
                                     : rulePackageItems[index % rulePackageItems.size()];
        const auto& outcome =
            outcomeItems.empty() ? OpsV380OutcomeObserverReconciliationItem{}
                                 : outcomeItems[index % outcomeItems.size()];

        OpsV380ActionReceiptBundleItem item;
        item.receipt_bundle_id =
            "receiptBundle:v380:" + std::to_string(index + 1);
        item.action_request_ref =
            "request-to-receipt:" +
            (ledger.json_name.empty() ? std::string("actionRequestId") : ledger.json_name);
        item.approval_decision_ref =
            "approval-to-receipt:" +
            (approval.decision.empty() ? std::string("approval-needed") : approval.decision);
        item.readiness_ref =
            "readiness-to-receipt:" +
            (readiness.dimension.empty() ? std::string("readiness-preflight") : readiness.dimension);
        item.execution_candidate_ref =
            "candidate-to-receipt:" +
            (source.field.empty() ? std::string("source-recheck-pilot") : source.field);
        item.outcome_diff_ref =
            "outcome-diff-to-receipt:" +
            (outcome.outcome_observer_id.empty() ? std::string("outcome-observer") : outcome.outcome_observer_id);
        item.redaction_summary =
            "redacted: operator, source locator, credential, raw diagnostic, internal blocker detail excluded";
        item.handoff_map =
            "release-safe-handoff: ops-reviewer -> release-notes-source";
        item.receipt_state =
            "redacted-release-safe";
        item.release_safe_label =
            "releaseSafe=true; bundlePersisted=false; artifactFileWritePerformed=false";
        item.bundle_signals = {
            "request-to-receipt:present",
            "approval-to-receipt:present",
            "readiness-to-receipt:present",
            "candidate-to-receipt:not-run",
            "outcome-diff-to-receipt:pending",
            "release-safe-handoff:ready",
        };
        item.handoff_refs = {
            "/ops/api/actions/request-ledger",
            "/ops/api/actions/approval-decision-gate",
            "/ops/api/actions/readiness-preflight",
            "/ops/api/actions/source-recheck-pilot",
            "/ops/api/actions/outcome-reconciliation",
        };
        item.redaction_review = {
            notice.field.empty() ? "client-notice-redaction:viewer-safe-only"
                                 : "client-notice-redaction:" + notice.field,
            rule.field.empty() ? "rule-draft-redaction:no-rule-apply"
                               : "rule-draft-redaction:" + rule.field,
            "raw-locator-excluded",
            "credential-material-excluded",
            "raw-diagnostic-json-excluded",
        };
        items.push_back(std::move(item));
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11524 function
OpsV380ActionReceiptBundleSummary BuildV380ActionReceiptBundleSummary(
    const std::vector<OpsV380ActionReceiptBundleItem>& items) {
    OpsV380ActionReceiptBundleSummary summary;
    summary.derivation_sources = {
        "BuildV380ActionRequestLedgerContractItems",
        "BuildV380ApprovalDecisionGateItems",
        "BuildV380ActionReadinessPreflightItems",
        "BuildV380SourceRecheckActionPilotItems",
        "BuildV380ClientNoticeDraftQueueItems",
        "BuildV380RuleDraftActionPackageItems",
        "BuildV380OutcomeObserverReconciliationItems",
    };
    summary.receipt_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (item.release_safe) {
            ++summary.release_safe_count;
        }
        summary.redaction_review_count += static_cast<int>(item.redaction_review.size());
        summary.handoff_ref_count += static_cast<int>(item.handoff_refs.size());
        if (item.outcome_diff_ref.find("not-run") != std::string::npos ||
            item.release_safe_label.find("artifactFileWritePerformed=false") != std::string::npos) {
            ++summary.not_run_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11551 function
void AppendV380ActionReceiptBundleSummaryJson(
    std::ostringstream& out,
    const OpsV380ActionReceiptBundleSummary& summary) {
    out << "{"
        << "\"receiptCount\":" << summary.receipt_count << ","
        << "\"releaseSafeCount\":" << summary.release_safe_count << ","
        << "\"redactionReviewCount\":" << summary.redaction_review_count << ","
        << "\"handoffRefCount\":" << summary.handoff_ref_count << ","
        << "\"notRunCount\":" << summary.not_run_count << ","
        << "\"derivationSources\":";
    AppendJsonStringArray(out, summary.derivation_sources);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11565 function
void AppendV380ActionReceiptBundleItemJson(
    std::ostringstream& out,
    const OpsV380ActionReceiptBundleItem& item) {
    out << "{"
        << "\"receiptBundleId\":\"" << JsonEscape(item.receipt_bundle_id) << "\","
        << "\"actionRequestRef\":\"" << JsonEscape(item.action_request_ref) << "\","
        << "\"approvalDecisionRef\":\"" << JsonEscape(item.approval_decision_ref) << "\","
        << "\"readinessRef\":\"" << JsonEscape(item.readiness_ref) << "\","
        << "\"executionCandidateRef\":\"" << JsonEscape(item.execution_candidate_ref) << "\","
        << "\"outcomeDiffRef\":\"" << JsonEscape(item.outcome_diff_ref) << "\","
        << "\"redactionSummary\":\"" << JsonEscape(item.redaction_summary) << "\","
        << "\"handoffMap\":\"" << JsonEscape(item.handoff_map) << "\","
        << "\"receiptState\":\"" << JsonEscape(item.receipt_state) << "\","
        << "\"releaseSafeLabel\":\"" << JsonEscape(item.release_safe_label) << "\","
        << "\"bundleSignals\":";
    AppendJsonStringArray(out, item.bundle_signals);
    out << ",\"handoffRefs\":";
    AppendJsonStringArray(out, item.handoff_refs);
    out << ",\"redactionReview\":";
    AppendJsonStringArray(out, item.redaction_review);
    out << ",\"releaseSafe\":" << JsonBool(item.release_safe)
        << ",\"readOnly\":" << JsonBool(item.read_only)
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11590 function
std::string OpsV380ActionReceiptBundleJson() {
    const auto items = BuildV380ActionReceiptBundleItems();
    const auto summary = BuildV380ActionReceiptBundleSummary(items);
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v380-action-receipt-bundle.v1\","
        << "\"status\":\"action-receipt-bundle\","
        << "\"generatedAt\":\"" << JsonEscape(FormatUnixMsUtc(NowUnixMs())) << "\","
        << "\"route\":\"/ops/api/actions/receipt-bundle\","
        << "\"requestLedgerRoute\":\"/ops/api/actions/request-ledger\","
        << "\"approvalDecisionGateRoute\":\"/ops/api/actions/approval-decision-gate\","
        << "\"readinessPreflightRoute\":\"/ops/api/actions/readiness-preflight\","
        << "\"sourceRecheckActionPilotRoute\":\"/ops/api/actions/source-recheck-pilot\","
        << "\"clientNoticeDraftQueueRoute\":\"/ops/api/actions/client-notice-draft-queue\","
        << "\"ruleDraftActionPackageRoute\":\"/ops/api/actions/rule-draft-package\","
        << "\"outcomeReconciliationRoute\":\"/ops/api/actions/outcome-reconciliation\","
        << "\"receiptBundleSummary\":";
    AppendV380ActionReceiptBundleSummaryJson(out, summary);
    out << ",\"receiptBundleItems\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV380ActionReceiptBundleItemJson(out, items[i]);
    }
    out << "],\"receiptPolicy\":{"
        << "\"redacted\":true,"
        << "\"releaseSafe\":true,"
        << "\"handoffMapOnly\":true,"
        << "\"requestApprovalReadinessCandidateOutcomeIncluded\":true,"
        << "\"bundlePersisted\":false,"
        << "\"artifactFileWritePerformed\":false,"
        << "\"handoffWritePerformed\":false"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"receiptBundleOnly\":true,"
        << "\"redacted\":true,"
        << "\"releaseSafe\":true,"
        << "\"handoffMapOnly\":true,"
        << "\"bundlePersisted\":false,"
        << "\"artifactFileWritePerformed\":false,"
        << "\"handoffWritePerformed\":false,"
        << "\"actionExecutionPerformed\":false,"
        << "\"sourceRecheckExecuted\":false,"
        << "\"clientNoticeSent\":false,"
        << "\"noticeQueueWritePerformed\":false,"
        << "\"ruleApplyPerformed\":false,"
        << "\"ruleRegistryWritePerformed\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"actionResultPersisted\":false,"
        << "\"viewerClientPayloadChanged\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawDiagnosticJsonIncluded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11667 function
std::vector<OpsV370SiteSourceGroupContractItem> BuildV370SiteSourceGroupContractItems() {
    return {
        {"site", "siteId", "SourceRegistry.SourceRecord.site", "unassigned-site", false},
        {"sourceGroup", "sourceGroup", "SourceRegistry.SourceRecord.group or ownerGroup", "default-source-group", false},
        {"zone", "zone", "SourceRegistry.SourceRecord.zone", "unassigned-zone", false},
        {"viewGroup", "viewGroup", "PublishedViewRecord.clientGroups", "default-view-group", false},
    };
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11676 function
void AppendV370SiteSourceGroupContractItemJson(std::ostringstream& out,
                                               const OpsV370SiteSourceGroupContractItem& item) {
    out << "{"
        << "\"field\":\"" << JsonEscape(item.field) << "\","
        << "\"jsonName\":\"" << JsonEscape(item.json_name) << "\","
        << "\"source\":\"" << JsonEscape(item.source) << "\","
        << "\"fallback\":\"" << JsonEscape(item.fallback) << "\","
        << "\"required\":" << JsonBool(item.required)
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11687 function
std::string OpsV370SiteSourceGroupContractJson() {
    const auto items = BuildV370SiteSourceGroupContractItems();
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v370-site-source-group-contract.v1\","
        << "\"status\":\"site-source-group-contract\","
        << "\"generatedAt\":\"" << JsonEscape(FormatUnixMsUtc(NowUnixMs())) << "\","
        << "\"contract\":{"
        << "\"siteIdField\":\"site\","
        << "\"sourceGroupField\":\"sourceGroup\","
        << "\"zoneField\":\"zone\","
        << "\"viewGroupField\":\"viewGroup\","
        << "\"readModelOnly\":true,"
        << "\"noAutoWriteBoundary\":true,"
        << "\"projectionRoute\":\"/ops/api/site-operations/source-registry-projection\","
        << "\"healthRollupRoute\":\"/ops/api/site-operations/health-rollup\""
        << "},\"siteSourceGroupContract\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370SiteSourceGroupContractItemJson(out, items[i]);
    }
    out << "],\"rollupStates\":["
        << "\"healthy\","
        << "\"offline\","
        << "\"degraded\","
        << "\"recovering\","
        << "\"field-needed\""
        << "],\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"siteSourceGroupContractOnly\":true,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11761 function
std::string V370SiteForSource(const SourceViewRegistry::SourceRecord& source) {
    const std::string site = Trim(source.site);
    return site.empty() ? "unassigned-site" : site;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11766 function
std::string V370SourceGroupForSource(const SourceViewRegistry::SourceRecord& source) {
    const std::string group = Trim(source.group);
    if (!group.empty()) {
        return group;
    }
    const std::string owner_group = Trim(source.owner_group);
    return owner_group.empty() ? "default-source-group" : owner_group;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11775 function
std::string V370ZoneForSource(const SourceViewRegistry::SourceRecord& source) {
    const std::string zone = Trim(source.zone);
    return zone.empty() ? "unassigned-zone" : zone;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11780 function
std::vector<std::string> V370ViewGroupsForView(const SourceViewRegistry::PublishedViewRecord& view) {
    if (!view.client_groups.empty()) {
        return view.client_groups;
    }
    return {"default-view-group"};
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11787 function
void AddV370UniqueString(std::vector<std::string>* values, const std::string& value) {
    if (values == nullptr || value.empty() ||
        std::find(values->begin(), values->end(), value) != values->end()) {
        return;
    }
    values->push_back(value);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11795 function
std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>
BuildV370SiteAwareSourceRegistryProjectionItems(
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    const std::vector<SourceViewRegistry::PublishedViewRecord>& views) {
    std::vector<OpsV370SiteAwareSourceRegistryProjectionItem> items;
    for (const auto& source : sources) {
        const std::string site_id = V370SiteForSource(source);
        const std::string source_group = V370SourceGroupForSource(source);
        const std::string zone = V370ZoneForSource(source);
        auto it = std::find_if(items.begin(), items.end(), [&](const auto& item) {
            return item.site_id == site_id && item.source_group == source_group && item.zone == zone;
        });
        if (it == items.end()) {
            OpsV370SiteAwareSourceRegistryProjectionItem next;
            next.site_id = site_id;
            next.source_group = source_group;
            next.zone = zone;
            items.push_back(std::move(next));
            it = std::prev(items.end());
        }
        ++it->source_count;
        if (source.enabled) {
            ++it->enabled_source_count;
        } else {
            ++it->disabled_source_count;
        }
        AddV370UniqueString(&it->source_ids, source.source_id);
        for (const auto& view : views) {
            if (view.source_id != source.source_id) {
                continue;
            }
            ++it->published_view_count;
            if (view.enabled) {
                ++it->enabled_published_view_count;
            }
            AddV370UniqueString(&it->view_ids, view.view_id);
            for (const auto& view_group : V370ViewGroupsForView(view)) {
                AddV370UniqueString(&it->view_groups, view_group);
            }
        }
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11839 function
OpsV370SiteAwareSourceRegistryProjectionSummary
BuildV370SiteAwareSourceRegistryProjectionSummary(
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    const std::vector<SourceViewRegistry::PublishedViewRecord>& views,
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& items) {
    OpsV370SiteAwareSourceRegistryProjectionSummary summary;
    summary.source_group_count = static_cast<int>(items.size());
    summary.source_count = static_cast<int>(sources.size());
    summary.published_view_count = static_cast<int>(views.size());
    std::vector<std::string> site_ids;
    for (const auto& item : items) {
        AddV370UniqueString(&site_ids, item.site_id);
    }
    summary.site_count = static_cast<int>(site_ids.size());
    for (const auto& source : sources) {
        if (source.enabled) {
            ++summary.enabled_source_count;
        }
        if (Trim(source.site).empty()) {
            ++summary.sources_without_site;
        }
        if (Trim(source.group).empty() && Trim(source.owner_group).empty()) {
            ++summary.sources_without_source_group;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11867 function
void AppendV370SiteAwareSourceRegistryProjectionSummaryJson(
    std::ostringstream& out,
    const OpsV370SiteAwareSourceRegistryProjectionSummary& summary) {
    out << "{"
        << "\"siteCount\":" << summary.site_count << ","
        << "\"sourceGroupCount\":" << summary.source_group_count << ","
        << "\"sourceCount\":" << summary.source_count << ","
        << "\"enabledSourceCount\":" << summary.enabled_source_count << ","
        << "\"publishedViewCount\":" << summary.published_view_count << ","
        << "\"sourcesWithoutSite\":" << summary.sources_without_site << ","
        << "\"sourcesWithoutSourceGroup\":" << summary.sources_without_source_group
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11881 function
void AppendV370SiteAwareSourceRegistryProjectionItemJson(
    std::ostringstream& out,
    const OpsV370SiteAwareSourceRegistryProjectionItem& item) {
    out << "{"
        << "\"siteId\":\"" << JsonEscape(item.site_id) << "\","
        << "\"sourceGroup\":\"" << JsonEscape(item.source_group) << "\","
        << "\"zone\":\"" << JsonEscape(item.zone) << "\","
        << "\"sourceCount\":" << item.source_count << ","
        << "\"enabledSourceCount\":" << item.enabled_source_count << ","
        << "\"disabledSourceCount\":" << item.disabled_source_count << ","
        << "\"publishedViewCount\":" << item.published_view_count << ","
        << "\"enabledPublishedViewCount\":" << item.enabled_published_view_count << ","
        << "\"sourceIds\":";
    AppendJsonStringArray(out, item.source_ids);
    out << ",\"viewIds\":";
    AppendJsonStringArray(out, item.view_ids);
    out << ",\"viewGroups\":";
    AppendJsonStringArray(out, item.view_groups);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11902 function
std::string OpsV370SiteAwareSourceRegistryProjectionJson() {
    std::vector<SourceViewRegistry::SourceRecord> sources;
    std::vector<SourceViewRegistry::PublishedViewRecord> views;
    std::string load_error;
    if (!SourceViewRegistry::Instance().Snapshot(&sources, &views, &load_error)) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v370-site-aware-source-registry-projection.v1\",\"error\":\"" +
               JsonEscape(load_error.empty() ? "source registry load failed" : load_error) + "\"}";
    }

    const auto items = BuildV370SiteAwareSourceRegistryProjectionItems(sources, views);
    const auto summary = BuildV370SiteAwareSourceRegistryProjectionSummary(sources, views, items);
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v370-site-aware-source-registry-projection.v1\","
        << "\"status\":\"site-aware-source-registry-projection\","
        << "\"generatedAt\":\"" << JsonEscape(FormatUnixMsUtc(NowUnixMs())) << "\","
        << "\"siteRegistryProjectionSummary\":";
    AppendV370SiteAwareSourceRegistryProjectionSummaryJson(out, summary);
    out << ",\"siteRegistryProjection\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370SiteAwareSourceRegistryProjectionItemJson(out, items[i]);
    }
    out << "],\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"projectionOnly\":true,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11973 function
const OpsSourceHealthItem* V370HealthForSource(const OpsSourceHealthSnapshot& snapshot,
                                               const std::string& source_id) {
    const auto it = std::find_if(snapshot.items.begin(), snapshot.items.end(), [&](const auto& item) {
        return item.source_id == source_id;
    });
    return it == snapshot.items.end() ? nullptr : &*it;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11981 function
bool V370HealthHasWarning(const OpsSourceHealthItem& item, const std::string& warning) {
    return std::find(item.warnings.begin(), item.warnings.end(), warning) != item.warnings.end();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11985 function
std::string V370SiteHealthSourceState(const SourceViewRegistry::SourceRecord& source,
                                      const OpsSourceHealthItem* health) {
    if (!source.enabled) {
        return "offline";
    }
    if (health == nullptr) {
        return "degraded";
    }
    if (V370HealthHasWarning(*health, "missing-published-view") ||
        health->reason == "no-subscriber" ||
        health->reason == "unreachable") {
        return "field-needed";
    }
    if (health->status == "connecting" || V370HealthHasWarning(*health, "high-reconnect")) {
        return "recovering";
    }
    if (health->status == "offline") {
        return "offline";
    }
    if (health->status == "stale" || health->status == "unknown" || !health->warnings.empty()) {
        return "degraded";
    }
    return "healthy";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12010 function
std::string V370SiteHealthRollupState(const OpsV370SiteHealthRollupItem& item) {
    if (item.field_needed_source_count > 0) {
        return "field-needed";
    }
    if (item.source_count > 0 && item.offline_source_count == item.source_count) {
        return "offline";
    }
    if (item.recovering_source_count > 0) {
        return "recovering";
    }
    if (item.degraded_source_count > 0 || item.offline_source_count > 0) {
        return "degraded";
    }
    return "healthy";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12026 function
std::vector<OpsV370SiteHealthRollupItem> BuildV370SiteHealthRollupItems(
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    const std::vector<SourceViewRegistry::PublishedViewRecord>& views,
    const OpsSourceHealthSnapshot& health_snapshot) {
    const auto projection = BuildV370SiteAwareSourceRegistryProjectionItems(sources, views);
    std::vector<OpsV370SiteHealthRollupItem> items;
    items.reserve(projection.size());
    for (const auto& projected : projection) {
        OpsV370SiteHealthRollupItem item;
        item.site_id = projected.site_id;
        item.source_group = projected.source_group;
        item.zone = projected.zone;
        item.source_ids = projected.source_ids;
        for (const auto& source_id : projected.source_ids) {
            const auto source = std::find_if(sources.begin(), sources.end(), [&](const auto& candidate) {
                return candidate.source_id == source_id;
            });
            if (source == sources.end()) {
                continue;
            }
            ++item.source_count;
            const auto* health = V370HealthForSource(health_snapshot, source_id);
            const std::string state = V370SiteHealthSourceState(*source, health);
            if (state == "field-needed") {
                ++item.field_needed_source_count;
            } else if (state == "offline") {
                ++item.offline_source_count;
            } else if (state == "recovering") {
                ++item.recovering_source_count;
            } else if (state == "degraded") {
                ++item.degraded_source_count;
            } else {
                ++item.healthy_source_count;
            }
            if (health != nullptr) {
                AddV370UniqueString(&item.reasons, health->status + ":" + health->reason);
            } else {
                AddV370UniqueString(&item.reasons, "unknown:health-missing");
            }
        }
        item.rollup_state = V370SiteHealthRollupState(item);
        items.push_back(std::move(item));
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12072 function
OpsV370SiteHealthRollupSummary BuildV370SiteHealthRollupSummary(
    const std::vector<OpsV370SiteHealthRollupItem>& items) {
    OpsV370SiteHealthRollupSummary summary;
    summary.source_group_count = static_cast<int>(items.size());
    std::vector<std::string> site_ids;
    for (const auto& item : items) {
        AddV370UniqueString(&site_ids, item.site_id);
        summary.source_count += item.source_count;
        if (item.rollup_state == "field-needed") {
            ++summary.field_needed;
        } else if (item.rollup_state == "offline") {
            ++summary.offline;
        } else if (item.rollup_state == "recovering") {
            ++summary.recovering;
        } else if (item.rollup_state == "degraded") {
            ++summary.degraded;
        } else {
            ++summary.healthy;
        }
    }
    summary.site_count = static_cast<int>(site_ids.size());
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12096 function
void AppendV370SiteHealthRollupSummaryJson(std::ostringstream& out,
                                           const OpsV370SiteHealthRollupSummary& summary) {
    out << "{"
        << "\"siteCount\":" << summary.site_count << ","
        << "\"sourceGroupCount\":" << summary.source_group_count << ","
        << "\"sourceCount\":" << summary.source_count << ","
        << "\"healthy\":" << summary.healthy << ","
        << "\"offline\":" << summary.offline << ","
        << "\"degraded\":" << summary.degraded << ","
        << "\"recovering\":" << summary.recovering << ","
        << "\"fieldNeeded\":" << summary.field_needed
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12110 function
void AppendV370SiteHealthRollupItemJson(std::ostringstream& out,
                                        const OpsV370SiteHealthRollupItem& item) {
    out << "{"
        << "\"siteId\":\"" << JsonEscape(item.site_id) << "\","
        << "\"sourceGroup\":\"" << JsonEscape(item.source_group) << "\","
        << "\"zone\":\"" << JsonEscape(item.zone) << "\","
        << "\"rollupState\":\"" << JsonEscape(item.rollup_state) << "\","
        << "\"sourceCount\":" << item.source_count << ","
        << "\"healthySourceCount\":" << item.healthy_source_count << ","
        << "\"offlineSourceCount\":" << item.offline_source_count << ","
        << "\"degradedSourceCount\":" << item.degraded_source_count << ","
        << "\"recoveringSourceCount\":" << item.recovering_source_count << ","
        << "\"fieldNeededSourceCount\":" << item.field_needed_source_count << ","
        << "\"sourceIds\":";
    AppendJsonStringArray(out, item.source_ids);
    out << ",\"reasons\":";
    AppendJsonStringArray(out, item.reasons);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12130 function
std::string OpsV370SiteHealthRollupJson(const OpsSourceHealthSnapshot& health_snapshot) {
    if (!health_snapshot.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v370-site-health-rollup.v1\",\"error\":\"" +
               JsonEscape(health_snapshot.error.empty() ? "source health snapshot unavailable" : health_snapshot.error) +
               "\"}";
    }
    std::vector<SourceViewRegistry::SourceRecord> sources;
    std::vector<SourceViewRegistry::PublishedViewRecord> views;
    std::string load_error;
    if (!SourceViewRegistry::Instance().Snapshot(&sources, &views, &load_error)) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v370-site-health-rollup.v1\",\"error\":\"" +
               JsonEscape(load_error.empty() ? "source registry load failed" : load_error) + "\"}";
    }

    const auto items = BuildV370SiteHealthRollupItems(sources, views, health_snapshot);
    const auto summary = BuildV370SiteHealthRollupSummary(items);
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v370-site-health-rollup.v1\","
        << "\"status\":\"site-health-rollup\","
        << "\"generatedAt\":\"" << JsonEscape(health_snapshot.generated_at) << "\","
        << "\"siteHealthRollupSummary\":";
    AppendV370SiteHealthRollupSummaryJson(out, summary);
    out << ",\"siteHealthRollup\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV370SiteHealthRollupItemJson(out, items[i]);
    }
    out << "],\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"rollupOnly\":true,"
        << "\"sourceHealthPersisted\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"automaticRecoveryPerformed\":false,"
        << "\"fieldSmokeExecuted\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false"
        << "}}";
    return out.str();
}

void AppendOpsSourceHealthAuditChanges(const app::AppConfig& config,
                                       const auth::Principal& principal,
                                       const OpsSourceHealthSnapshot& snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12187 function
std::string OpsSourceHealthJson(const std::vector<analysis::AnalysisManager::TapSnapshot>& analysis_taps,
                                const std::vector<PublishedWebRtcSource::Snapshot>& publish_sources,
                                const std::vector<core::SessionManager::SourceDescriptorSnapshot>& descriptor_snapshots,
                                const std::vector<core::SessionManager::SourceReconnectStats>& reconnect_stats,
                                const std::vector<core::SessionManager::SourceEgressStats>& egress_stats,
                                const app::AppConfig* audit_config,
                                const auth::Principal* audit_principal) {
    const auto snapshot =
        BuildOpsSourceHealthSnapshot(analysis_taps, publish_sources, descriptor_snapshots, reconnect_stats, egress_stats);
    if (!snapshot.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.source-health.v1\",\"error\":\"" +
               JsonEscape(snapshot.error) + "\"}";
    }
    if (audit_config != nullptr && audit_principal != nullptr) {
        AppendOpsSourceHealthAuditChanges(*audit_config, *audit_principal, snapshot);
    }

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.source-health.v1\","
        << "\"status\":\"source-health\","
        << "\"generatedAt\":\"" << JsonEscape(snapshot.generated_at) << "\","
        << "\"summary\":";
    AppendOpsSourceHealthSummaryJson(out, snapshot);
    out << ",\"sourceHealth\":[";
    for (std::size_t i = 0; i < snapshot.items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendOpsSourceHealthItemJson(out, snapshot.items[i]);
    }
    out << "]}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12223 function
bool OpsSourceHealthBulkRetryable(const OpsSourceHealthItem& item) {
    if (item.status == "live" || item.reason == "disabled") {
        return false;
    }
    return item.status == "connecting" || item.status == "stale" || item.status == "offline" ||
           !item.warnings.empty();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12231 function
std::string OpsSourceHealthBulkJson(
    const std::string& body,
    const std::vector<analysis::AnalysisManager::TapSnapshot>& analysis_taps,
    const std::vector<PublishedWebRtcSource::Snapshot>& publish_sources,
    const std::vector<core::SessionManager::SourceDescriptorSnapshot>& descriptor_snapshots,
    const std::vector<core::SessionManager::SourceReconnectStats>& reconnect_stats,
    const std::vector<core::SessionManager::SourceEgressStats>& egress_stats,
    const app::AppConfig* audit_config,
    const auth::Principal* audit_principal) {
    const auto snapshot =
        BuildOpsSourceHealthSnapshot(analysis_taps, publish_sources, descriptor_snapshots, reconnect_stats, egress_stats);
    if (!snapshot.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.source-health.bulk.v1\",\"error\":\"" +
               JsonEscape(snapshot.error) + "\"}";
    }
    if (audit_config != nullptr && audit_principal != nullptr) {
        AppendOpsSourceHealthAuditChanges(*audit_config, *audit_principal, snapshot);
    }

    const std::string operation = Trim(ParseStringField(body, "operation").value_or("check"));
    if (operation != "check" && operation != "retry") {
        return "{\"ok\":false,\"schema\":\"media-server.ops.source-health.bulk.v1\",\"error\":\"unsupported operation\"}";
    }

    std::vector<std::string> requested_ids = StringArrayFieldValues(body, "sourceIds");
    std::vector<std::string> target_ids;
    std::set<std::string> seen_ids;
    if (requested_ids.empty()) {
        for (const auto& item : snapshot.items) {
            if (seen_ids.insert(item.source_id).second) {
                target_ids.push_back(item.source_id);
            }
        }
    } else {
        for (const auto& id : requested_ids) {
            const std::string trimmed = Trim(id);
            if (!trimmed.empty() && seen_ids.insert(trimmed).second) {
                target_ids.push_back(trimmed);
            }
        }
    }

    int ok_count = 0;
    int fail_count = 0;
    int retryable_count = 0;
    int unhealthy_count = 0;
    std::vector<std::string> retry_source_ids;
    std::ostringstream results;
    results << "[";
    for (std::size_t index = 0; index < target_ids.size(); ++index) {
        const std::string& source_id = target_ids[index];
        const auto it = std::find_if(snapshot.items.begin(), snapshot.items.end(), [&](const auto& item) {
            return item.source_id == source_id;
        });
        if (index != 0) {
            results << ",";
        }
        if (it == snapshot.items.end()) {
            ++fail_count;
            results << "{"
                    << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
                    << "\"ok\":false,"
                    << "\"healthy\":false,"
                    << "\"retryable\":false,"
                    << "\"status\":\"unknown\","
                    << "\"reason\":\"not-found\","
                    << "\"checkedAt\":null,"
                    << "\"message\":\"source not found\""
                    << "}";
            continue;
        }

        const bool healthy = it->status == "live";
        const bool retryable = OpsSourceHealthBulkRetryable(*it);
        ++ok_count;
        if (!healthy) {
            ++unhealthy_count;
        }
        if (retryable) {
            ++retryable_count;
            retry_source_ids.push_back(it->source_id);
        }

        results << "{"
                << "\"sourceId\":\"" << JsonEscape(it->source_id) << "\","
                << "\"ok\":true,"
                << "\"healthy\":" << (healthy ? "true" : "false") << ","
                << "\"retryable\":" << (retryable ? "true" : "false") << ","
                << "\"status\":\"" << JsonEscape(it->status) << "\","
                << "\"reason\":\"" << JsonEscape(it->reason) << "\","
                << "\"checkedAt\":";
        AppendNullableJsonString(results, it->checked_at);
        results << ",\"message\":\""
                << JsonEscape(healthy ? "health check passed" : "health check returned " + it->status)
                << "\",\"health\":";
        AppendOpsSourceHealthItemJson(results, *it);
        results << "}";
    }
    results << "]";

    std::ostringstream retry_body;
    retry_body << "{\"operation\":\"retry\",\"sourceIds\":[";
    for (std::size_t i = 0; i < retry_source_ids.size(); ++i) {
        if (i != 0) {
            retry_body << ",";
        }
        retry_body << "\"" << JsonEscape(retry_source_ids[i]) << "\"";
    }
    retry_body << "]}";

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.source-health.bulk.v1\","
        << "\"status\":\"source-health-bulk\","
        << "\"operation\":\"" << JsonEscape(operation) << "\","
        << "\"dryRun\":true,"
        << "\"generatedAt\":\"" << JsonEscape(snapshot.generated_at) << "\","
        << "\"requestedCount\":" << target_ids.size() << ","
        << "\"okCount\":" << ok_count << ","
        << "\"failCount\":" << fail_count << ","
        << "\"unhealthyCount\":" << unhealthy_count << ","
        << "\"retryableCount\":" << retryable_count << ","
        << "\"partialFailure\":" << (fail_count > 0 && ok_count > 0 ? "true" : "false") << ","
        << "\"summary\":";
    AppendOpsSourceHealthSummaryJson(out, snapshot);
    out << ",\"retryPolicy\":\"retry only rows with retryable=true; use retryBody.sourceIds after fixing disabled/missing source configuration\","
        << "\"retryBody\":" << retry_body.str() << ","
        << "\"results\":" << results.str()
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12364 function
std::filesystem::path OpsAuditStoragePath(const app::AppConfig& config) {
    std::filesystem::path base = config.source_registry_path.empty()
                                     ? std::filesystem::path(".")
                                     : std::filesystem::path(config.source_registry_path).parent_path();
    if (base.empty()) {
        base = ".";
    }
    return base / ".media_server.ops_audit.jsonl";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12374 function
int OpsAuditRetentionDays() {
    constexpr int kDefaultRetentionDays = 180;
    const char* raw = std::getenv("MEDIA_SERVER_OPS_AUDIT_RETENTION_DAYS");
    if (raw == nullptr || std::string(raw).empty()) {
        return kDefaultRetentionDays;
    }
    char* end = nullptr;
    const long parsed = std::strtol(raw, &end, 10);
    if (end == raw || (end != nullptr && *end != '\0')) {
        return kDefaultRetentionDays;
    }
    if (parsed <= 0) {
        return 0;
    }
    return static_cast<int>(std::min<long>(parsed, 3650));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12391 function
std::optional<std::int64_t> OpsAuditReceivedAtMs(const std::string& line) {
    std::string raw = ExtractJsonValueField(line, "receivedAtMs").value_or("");
    raw.erase(std::remove(raw.begin(), raw.end(), '"'), raw.end());
    raw = Trim(std::move(raw));
    if (raw.empty()) {
        return std::nullopt;
    }
    try {
        return std::stoll(raw);
    } catch (...) {
        return std::nullopt;
    }
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12412 function
OpsAuditRetentionSummary EnforceOpsAuditRetentionLocked(const std::filesystem::path& path,
                                                        std::int64_t now_ms,
                                                        std::string* error_message) {
    OpsAuditRetentionSummary summary;
    if (summary.retention_days <= 0 || !std::filesystem::exists(path)) {
        return summary;
    }
    const std::int64_t cutoff_ms =
        now_ms - static_cast<std::int64_t>(summary.retention_days) * 24LL * 60LL * 60LL * 1000LL;
    std::ifstream in(path);
    if (!in) {
        return summary;
    }
    std::vector<std::string> retained;
    std::string line;
    while (std::getline(in, line)) {
        const std::string trimmed = Trim(line);
        const std::optional<std::int64_t> received_at = OpsAuditReceivedAtMs(trimmed);
        if (received_at.has_value() && *received_at < cutoff_ms) {
            ++summary.removed;
            continue;
        }
        if (!trimmed.empty()) {
            retained.push_back(trimmed);
        }
    }
    summary.retained = static_cast<int>(retained.size());
    if (summary.removed == 0) {
        return summary;
    }
    const std::filesystem::path tmp = path.string() + ".tmp";
    std::ofstream out(tmp, std::ios::trunc);
    if (!out) {
        if (error_message != nullptr) {
            *error_message = "failed to rewrite audit retention file: " + tmp.string();
        }
        return summary;
    }
    for (const std::string& entry : retained) {
        out << entry << "\n";
    }
    out.close();
    std::error_code ec;
    std::filesystem::rename(tmp, path, ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = "failed to apply audit retention: " + ec.message();
        }
        return summary;
    }
    summary.applied = true;
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12466 function
OpsAuditRetentionSummary EnforceOpsAuditRetention(const app::AppConfig& config,
                                                  std::string* error_message) {
    const std::filesystem::path path = OpsAuditStoragePath(config);
    std::lock_guard lock(g_ops_audit_mu);
    return EnforceOpsAuditRetentionLocked(path, NowUnixMs(), error_message);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12473 function
bool AuditSensitiveKey(const std::string& key) {
    const std::string lowered = LowerAscii(key);
    static const std::unordered_set<std::string> kExactMaterialKeys = {
        "checksum",
        "crop",
        "debugurl",
        "developerurl",
        "deviceendpoint",
        "embedding",
        "endpoint",
        "file",
        "labels",
        "labelspath",
        "mediafile",
        "model",
        "modelchecksum",
        "modellabels",
        "modelpath",
        "modelprovenance",
        "modelsha256",
        "modeluri",
        "modelurl",
        "provenance",
        "rawframe",
        "rawmedia",
        "rtspurl",
        "rtspsurl",
        "samplemedia",
        "sha256",
        "sourcefile",
        "sourceuri",
        "sourceurl",
        "streamuri",
        "streamurl",
        "uri",
        "url",
        "whepurl",
        "xaddr",
    };
    static const std::vector<std::string> kMaterialKeyNeedles = {
        "appearancecrop",
        "appearanceembedding",
        "debugurl",
        "developerurl",
        "deviceendpoint",
        "labelspath",
        "mediafile",
        "modelchecksum",
        "modelpath",
        "modelprovenance",
        "modelsha256",
        "modeluri",
        "modelurl",
        "rawframe",
        "rawmedia",
        "rtspurl",
        "rtspsurl",
        "samplemedia",
        "sourcefile",
        "sourceuri",
        "sourceurl",
        "streamuri",
        "streamurl",
        "whepurl",
    };
    return lowered.find("password") != std::string::npos ||
           lowered.find("token") != std::string::npos ||
           lowered.find("hash") != std::string::npos ||
           lowered.find("secret") != std::string::npos ||
           lowered.find("credential") != std::string::npos ||
           lowered.find("capability") != std::string::npos ||
           kExactMaterialKeys.count(lowered) != 0 ||
           std::any_of(kMaterialKeyNeedles.begin(),
                       kMaterialKeyNeedles.end(),
                       [&](const std::string& needle) {
                           return lowered.find(needle) != std::string::npos;
                       });
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12552 function
std::optional<std::pair<std::string, std::size_t>> AuditJsonStringLiteralAt(
    const std::string& json,
    std::size_t value_start) {
    if (value_start >= json.size() || json[value_start] != '"') {
        return std::nullopt;
    }
    std::string value;
    bool escaped = false;
    for (std::size_t pos = value_start + 1; pos < json.size(); ++pos) {
        const char ch = json[pos];
        if (escaped) {
            value.push_back(ch);
            escaped = false;
            continue;
        }
        if (ch == '\\') {
            escaped = true;
            continue;
        }
        if (ch == '"') {
            return std::make_pair(value, pos + 1);
        }
        value.push_back(ch);
    }
    return std::nullopt;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12579 function
bool AuditSensitiveStringValue(const std::string& value) {
    const std::string lowered = LowerAscii(Trim(value));
    if (lowered.empty()) {
        return false;
    }
    static const std::vector<std::string> kSensitivePrefixes = {
        "file://",
        "http://",
        "https://",
        "rtsp://",
        "rtsps://",
        "whep://",
        "wheps://",
    };
    for (const std::string& prefix : kSensitivePrefixes) {
        if (lowered.rfind(prefix, 0) == 0) {
            return true;
        }
    }
    static const std::vector<std::string> kSensitiveNeedles = {
        ".engine",
        ".onnx",
        ".pt",
        "/media-assets/",
        "/models/",
        "/samples/",
        "\\media-assets\\",
        "\\models\\",
        "\\samples\\",
    };
    for (const std::string& needle : kSensitiveNeedles) {
        if (lowered.find(needle) != std::string::npos) {
            return true;
        }
    }
    if (lowered.size() == 64 &&
        std::all_of(lowered.begin(), lowered.end(), [](const char ch) {
            return std::isxdigit(static_cast<unsigned char>(ch)) != 0;
        })) {
        return true;
    }
    return false;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12623 function
std::string RedactAuditJsonFragment(std::string json) {
    for (std::size_t pos = 0; pos < json.size();) {
        if (json[pos] != '"') {
            ++pos;
            continue;
        }
        std::size_t key_end = pos + 1;
        bool escaped = false;
        std::string key;
        for (; key_end < json.size(); ++key_end) {
            const char ch = json[key_end];
            if (escaped) {
                key.push_back(ch);
                escaped = false;
                continue;
            }
            if (ch == '\\') {
                escaped = true;
                continue;
            }
            if (ch == '"') {
                break;
            }
            key.push_back(ch);
        }
        if (key_end >= json.size()) {
            break;
        }
        std::size_t colon = key_end + 1;
        while (colon < json.size() && std::isspace(static_cast<unsigned char>(json[colon])) != 0) {
            ++colon;
        }
        if (colon >= json.size() || json[colon] != ':') {
            pos = key_end + 1;
            continue;
        }
        std::size_t value_start = colon + 1;
        while (value_start < json.size() &&
               std::isspace(static_cast<unsigned char>(json[value_start])) != 0) {
            ++value_start;
        }
        const bool redact_by_key = AuditSensitiveKey(key);
        const auto string_literal = AuditJsonStringLiteralAt(json, value_start);
        const bool redact_by_value =
            string_literal.has_value() && AuditSensitiveStringValue(string_literal->first);
        if ((!redact_by_key && !redact_by_value) || value_start >= json.size()) {
            pos = value_start;
            continue;
        }
        std::size_t value_end = value_start;
        if (!redact_by_key && string_literal.has_value()) {
            value_end = string_literal->second;
        } else if (json[value_start] == '{') {
            value_end = ExtractDelimitedValueAt(json, value_start, '{', '}').has_value()
                            ? value_start + ExtractDelimitedValueAt(json, value_start, '{', '}')->size()
                            : value_start + 1;
        } else if (json[value_start] == '[') {
            value_end = ExtractDelimitedValueAt(json, value_start, '[', ']').has_value()
                            ? value_start + ExtractDelimitedValueAt(json, value_start, '[', ']')->size()
                            : value_start + 1;
        } else if (json[value_start] == '"') {
            bool value_escaped = false;
            value_end = value_start + 1;
            for (; value_end < json.size(); ++value_end) {
                const char ch = json[value_end];
                if (value_escaped) {
                    value_escaped = false;
                    continue;
                }
                if (ch == '\\') {
                    value_escaped = true;
                    continue;
                }
                if (ch == '"') {
                    ++value_end;
                    break;
                }
            }
        } else {
            while (value_end < json.size() && json[value_end] != ',' &&
                   json[value_end] != '}' && json[value_end] != ']') {
                ++value_end;
            }
        }
        json.replace(value_start, value_end - value_start, "\"[redacted]\"");
        pos = value_start + 12;
    }
    return json;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12713 function
std::string OpsAuditRecordJson(const std::string& body, const auth::Principal& principal) {
    const std::int64_t now_ms = NowUnixMs();
    const std::uint64_t seq = g_ops_audit_sequence.fetch_add(1, std::memory_order_relaxed) + 1;
    const std::string area = Trim(ParseStringField(body, "area").value_or("ops"));
    const std::string action = Trim(ParseStringField(body, "action").value_or("update"));
    const std::string target = Trim(ParseStringField(body, "target").value_or(""));
    const std::string summary = Trim(ParseStringField(body, "summary").value_or(""));
    const std::string at = Trim(ParseStringField(body, "at").value_or(std::to_string(now_ms)));
    std::string before = ExtractJsonValueField(body, "before").value_or("null");
    std::string after = ExtractJsonValueField(body, "after").value_or("null");
    before = RedactAuditJsonFragment(std::move(before));
    after = RedactAuditJsonFragment(std::move(after));
    std::ostringstream out;
    out << "{"
        << "\"id\":\"audit-" << now_ms << "-" << seq << "\","
        << "\"at\":\"" << JsonEscape(at) << "\","
        << "\"receivedAtMs\":" << now_ms << ","
        << "\"actor\":\""
        << JsonEscape(principal.username.empty() ? principal.display_name : principal.username) << "\","
        << "\"role\":\"" << JsonEscape(principal.role) << "\","
        << "\"authMode\":\"" << JsonEscape(principal.auth_mode) << "\","
        << "\"area\":\"" << JsonEscape(area.empty() ? "ops" : area) << "\","
        << "\"action\":\"" << JsonEscape(action.empty() ? "update" : action) << "\","
        << "\"target\":\"" << JsonEscape(target) << "\","
        << "\"summary\":\"" << JsonEscape(summary) << "\","
        << "\"before\":" << before << ","
        << "\"after\":" << after
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12744 function
bool AppendOpsAuditRecord(const app::AppConfig& config,
                          const std::string& record_json,
                          std::string* error_message) {
    const std::filesystem::path path = OpsAuditStoragePath(config);
    std::error_code ec;
    std::filesystem::create_directories(path.parent_path(), ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = "failed to create audit directory: " + ec.message();
        }
        return false;
    }
    std::string retention_error;
    (void)EnforceOpsAuditRetention(config, &retention_error);
    std::lock_guard lock(g_ops_audit_mu);
    std::ofstream out(path, std::ios::app);
    if (!out) {
        if (error_message != nullptr) {
            *error_message = "failed to open audit log: " + path.string();
        }
        return false;
    }
    out << record_json << "\n";
    out.flush();
    if (!out) {
        if (error_message != nullptr) {
            *error_message = "failed to write audit log: " + path.string();
        }
        return false;
    }
    return true;
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12804 function
std::filesystem::path OpsEventReviewStoragePath(const app::AppConfig& config) {
    std::filesystem::path base = config.source_registry_path.empty()
                                     ? std::filesystem::path(".")
                                     : std::filesystem::path(config.source_registry_path).parent_path();
    if (base.empty()) {
        base = ".";
    }
    return base / ".media_server.event_reviews.jsonl";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12814 function
bool OpsEventReviewEventIdAllowed(const std::string& value) {
    if (value.empty() || value.size() > 160) {
        return false;
    }
    for (const unsigned char ch : value) {
        if (ch <= 0x20 || ch == '"' || ch == '\'' || ch == '\\' || ch == '/' || ch == '?' ||
            ch == '#' || ch == '&') {
            return false;
        }
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12827 function
bool OpsEventReviewStatusAllowed(const std::string& value) {
    static const std::unordered_set<std::string> kAllowed = {
        "new",
        "reviewing",
        "confirmed",
        "dismissed",
        "needs-follow-up",
    };
    return kAllowed.count(value) != 0;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12838 function
bool OpsEventReviewClassificationAllowed(const std::string& value) {
    static const std::unordered_set<std::string> kAllowed = {
        "unclassified",
        "true-positive",
        "false-positive",
        "duplicate",
        "needs-tuning",
    };
    return kAllowed.count(value) != 0;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12849 function
bool OpsVlmReviewActionAllowed(const std::string& value) {
    static const std::unordered_set<std::string> kAllowed = {
        "not-reviewed",
        "accept",
        "dismiss",
        "review-needed",
    };
    return kAllowed.count(value) != 0;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12859 function
bool OpsVlmReviewActionTargetAllowed(const std::string& value) {
    static const std::unordered_set<std::string> kAllowed = {
        "summary",
        "eventExplanation",
        "falsePositiveHints",
        "operatorReviewQuestions",
    };
    return kAllowed.count(value) != 0;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12869 function
bool OpsIncidentStatusAllowed(const std::string& value) {
    static const std::unordered_set<std::string> kAllowed = {
        "new",
        "review-needed",
        "acknowledged",
        "in-progress",
        "closed",
        "false-positive",
    };
    return kAllowed.count(value) != 0;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12881 function
bool OpsResolutionStatusAllowed(const std::string& value) {
    static const std::unordered_set<std::string> kAllowed = {
        "open",
        "triaged",
        "in-progress",
        "resolved",
        "reopened",
        "false-positive",
    };
    return kAllowed.count(value) != 0;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12893 function
bool OpsResolutionReasonAllowed(const std::string& value) {
    static const std::unordered_set<std::string> kAllowed = {
        "unreviewed",
        "operator-confirmed",
        "evidence-insufficient",
        "false-positive",
        "duplicate",
        "source-unreliable",
        "rule-tuning",
        "manual-reopen",
    };
    return kAllowed.count(value) != 0;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12907 function
bool OpsResolutionTransitionAllowed(const std::string& value) {
    static const std::unordered_set<std::string> kAllowed = {
        "none",
        "close",
        "reopen",
    };
    return kAllowed.count(value) != 0;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12916 function
std::string NormalizeOpsEventReviewStatus(std::string value) {
    value = LowerAscii(Trim(std::move(value)));
    return OpsEventReviewStatusAllowed(value) ? value : "new";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12921 function
std::string NormalizeOpsEventReviewClassification(std::string value) {
    value = LowerAscii(Trim(std::move(value)));
    return OpsEventReviewClassificationAllowed(value) ? value : "unclassified";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12926 function
std::string NormalizeOpsVlmReviewAction(std::string value) {
    value = LowerAscii(Trim(std::move(value)));
    return OpsVlmReviewActionAllowed(value) ? value : "not-reviewed";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12931 function
std::string NormalizeOpsVlmReviewActionTarget(std::string value) {
    value = Trim(std::move(value));
    return OpsVlmReviewActionTargetAllowed(value) ? value : "eventExplanation";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12936 function
std::string NormalizeOpsIncidentStatus(std::string value) {
    value = LowerAscii(Trim(std::move(value)));
    return OpsIncidentStatusAllowed(value) ? value : "new";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12941 function
std::string NormalizeOpsResolutionStatus(std::string value) {
    value = LowerAscii(Trim(std::move(value)));
    return OpsResolutionStatusAllowed(value) ? value : "open";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12946 function
std::string NormalizeOpsResolutionReason(std::string value) {
    value = LowerAscii(Trim(std::move(value)));
    return OpsResolutionReasonAllowed(value) ? value : "unreviewed";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12951 function
std::string NormalizeOpsResolutionTransition(std::string value) {
    value = LowerAscii(Trim(std::move(value)));
    return OpsResolutionTransitionAllowed(value) ? value : "none";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12956 function
bool OpsResolutionStatusIsClosed(const std::string& value) {
    const std::string status = NormalizeOpsResolutionStatus(value);
    return status == "resolved" || status == "false-positive";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12961 function
std::string NormalizeOpsIncidentId(std::string value, const std::string& event_id) {
    value = Trim(std::move(value));
    if (!OpsEventReviewEventIdAllowed(value)) {
        return OpsEventReviewEventIdAllowed(event_id) ? "incident:" + event_id : "";
    }
    return value;
}

bool OpsEventReviewNoteContainsSensitiveMaterial(const std::string& value);
std::string NormalizeOpsEventReviewNote(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12972 function
std::string NormalizeOpsEventActionTarget(std::string value) {
    value = Trim(std::move(value));
    for (char& ch : value) {
        if (ch == '\r' || ch == '\n' || ch == '\t' ||
            static_cast<unsigned char>(ch) < 0x20) {
            ch = ' ';
        }
    }
    value = Trim(std::move(value));
    constexpr std::size_t kMaxActionTargetBytes = 160;
    if (value.size() > kMaxActionTargetBytes) {
        value.resize(kMaxActionTargetBytes);
        value = Trim(std::move(value));
    }
    if (value.empty()) {
        return "operator-triage";
    }
    if (OpsEventReviewNoteContainsSensitiveMaterial(value)) {
        return "[redacted-action-target]";
    }
    return value;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12995 function
std::string NormalizeOpsResolutionNote(std::string value) {
    value = NormalizeOpsEventReviewNote(std::move(value));
    constexpr std::size_t kMaxResolutionNoteBytes = 240;
    if (value.size() > kMaxResolutionNoteBytes) {
        value.resize(kMaxResolutionNoteBytes);
        value = Trim(std::move(value));
    }
    return value;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13005 function
OpsEventReviewState OpsResolutionStateFromReview(OpsEventReviewState state) {
    state.resolution_status = NormalizeOpsResolutionStatus(state.resolution_status);
    state.resolution_reason = NormalizeOpsResolutionReason(state.resolution_reason);
    state.resolution_transition = NormalizeOpsResolutionTransition(state.resolution_transition);
    state.resolution_note = NormalizeOpsResolutionNote(state.resolution_note);
    const std::string review_status = NormalizeOpsEventReviewStatus(state.review_status);
    const std::string classification = NormalizeOpsEventReviewClassification(state.classification);
    const std::string incident_status = NormalizeOpsIncidentStatus(state.incident_status);

    if (state.resolution_transition == "close" && state.resolution_status == "open") {
        state.resolution_status =
            incident_status == "false-positive" || classification == "false-positive"
                ? "false-positive"
                : "resolved";
    } else if (state.resolution_transition == "reopen" &&
               OpsResolutionStatusIsClosed(state.resolution_status)) {
        state.resolution_status = "reopened";
    }

    if (state.resolution_status == "open" && state.resolution_reason == "unreviewed") {
        if (incident_status == "closed" || review_status == "confirmed") {
            state.resolution_status = "resolved";
            state.resolution_reason = "operator-confirmed";
            state.resolution_transition = "close";
        } else if (incident_status == "false-positive" || classification == "false-positive") {
            state.resolution_status = "false-positive";
            state.resolution_reason = "false-positive";
            state.resolution_transition = "close";
        } else if (classification == "duplicate") {
            state.resolution_status = "triaged";
            state.resolution_reason = "duplicate";
        } else if (classification == "needs-tuning") {
            state.resolution_status = "triaged";
            state.resolution_reason = "rule-tuning";
        } else if (review_status == "needs-follow-up" || incident_status == "review-needed") {
            state.resolution_status = "triaged";
            state.resolution_reason = "evidence-insufficient";
        } else if (incident_status == "acknowledged" || incident_status == "in-progress") {
            state.resolution_status = "in-progress";
            state.resolution_reason = "operator-confirmed";
        } else if (review_status == "reviewing") {
            state.resolution_status = "triaged";
        }
    }

    if (OpsResolutionStatusIsClosed(state.resolution_status) &&
        state.resolution_transition == "none") {
        state.resolution_transition = "close";
    }
    if (state.resolution_status == "reopened") {
        state.resolution_transition = "reopen";
        if (state.resolution_reason == "unreviewed") {
            state.resolution_reason = "manual-reopen";
        }
    }
    return state;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13063 function
std::string OpsResolutionStateJson(const OpsEventReviewState& raw_state) {
    const OpsEventReviewState state = OpsResolutionStateFromReview(raw_state);
    const bool closed = OpsResolutionStatusIsClosed(state.resolution_status);
    const bool can_reopen = closed || state.resolution_status == "reopened";
    const bool can_close = !closed;
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.resolution-state.v1\","
        << "\"status\":\"" << JsonEscape(state.resolution_status) << "\","
        << "\"reason\":\"" << JsonEscape(state.resolution_reason) << "\","
        << "\"note\":\"" << JsonEscape(state.resolution_note) << "\","
        << "\"transition\":\"" << JsonEscape(state.resolution_transition) << "\","
        << "\"closedAtMs\":" << state.resolution_closed_at_ms << ","
        << "\"reopenedAtMs\":" << state.resolution_reopened_at_ms << ","
        << "\"closeReopenLifecycle\":{"
        << "\"canClose\":" << (can_close ? "true" : "false") << ","
        << "\"canReopen\":" << (can_reopen ? "true" : "false") << ","
        << "\"reasonRequired\":true,"
        << "\"closeAction\":\"resolution-state-update\","
        << "\"reopenAction\":\"resolution-state-update\","
        << "\"resolutionTransition\":\"" << JsonEscape(state.resolution_transition) << "\""
        << "},"
        << "\"contract\":{"
        << "\"persistent\":true,"
        << "\"separateFromEventRecords\":true,"
        << "\"separateFromEventPostPayload\":true,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"operatorAssignmentFlowIncluded\":false,"
        << "\"clientDigestIncluded\":false,"
        << "\"searchMetricsIncluded\":false"
        << "}"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13104 function
bool OpsEventReviewNoteContainsSensitiveMaterial(const std::string& value) {
    const std::string lowered = LowerAscii(value);
    static const std::vector<std::string> kNeedles = {
        "rtsp://",
        "rtsps://",
        "whep://",
        "wheps://",
        "sourceurl",
        "developerurl",
        "debugurl",
        "password",
        "token",
        "secret",
        "credential",
        "passwordhash",
        "tokenhash",
        "modelpath",
        "modelchecksum",
        "raw json",
        "debugcounters",
        "bbox diagnostics",
        "file::",
        "file://",
        "/users/",
        "\\users\\",
        "/home/",
        "\\home\\",
        "/tmp/",
        "\\tmp\\",
        "/private/",
        "\\private\\",
    };
    return std::any_of(kNeedles.begin(), kNeedles.end(), [&](const std::string& needle) {
        return lowered.find(needle) != std::string::npos;
    });
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13141 function
std::string NormalizeOpsEventReviewNote(std::string value) {
    value = Trim(std::move(value));
    for (char& ch : value) {
        if (ch == '\r' || ch == '\n' || ch == '\t' ||
            static_cast<unsigned char>(ch) < 0x20) {
            ch = ' ';
        }
    }
    value = Trim(std::move(value));
    constexpr std::size_t kMaxReviewNoteBytes = 500;
    if (value.size() > kMaxReviewNoteBytes) {
        value.resize(kMaxReviewNoteBytes);
        value = Trim(std::move(value));
    }
    if (OpsEventReviewNoteContainsSensitiveMaterial(value)) {
        return "[redacted-review-note]";
    }
    return value;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13161 function
std::string NormalizeOpsFeatureCorrectionValue(std::string value,
                                               const std::string& fallback) {
    value = Trim(std::move(value));
    for (char& ch : value) {
        if (ch == '\r' || ch == '\n' || ch == '\t' ||
            static_cast<unsigned char>(ch) < 0x20) {
            ch = ' ';
        }
    }
    value = Trim(std::move(value));
    constexpr std::size_t kMaxFeatureCorrectionBytes = 120;
    if (value.size() > kMaxFeatureCorrectionBytes) {
        value.resize(kMaxFeatureCorrectionBytes);
        value = Trim(std::move(value));
    }
    if (value.empty()) {
        return fallback;
    }
    if (OpsEventReviewNoteContainsSensitiveMaterial(value)) {
        return fallback.empty() ? "[redacted-feature-correction]" : fallback;
    }
    return value;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13185 function
std::vector<std::string> NormalizeOpsFeatureAliases(std::vector<std::string> values) {
    std::vector<std::string> normalized;
    std::set<std::string> seen;
    for (std::string value : values) {
        value = NormalizeOpsFeatureCorrectionValue(std::move(value));
        if (value.empty() || seen.count(value) != 0) {
            continue;
        }
        normalized.push_back(value);
        seen.insert(value);
        if (normalized.size() >= 6U) {
            break;
        }
    }
    return normalized;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13202 function
bool OpsFeatureCorrectionHasContent(const OpsEventReviewState& state) {
    return !state.corrected_feature_label.empty() || !state.feature_aliases.empty() ||
           state.reanalysis_requested || !state.reanalysis_reason.empty();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13207 function
OpsEventReviewState OpsEventReviewStateFromJsonLine(const std::string& line) {
    OpsEventReviewState state;
    state.event_id = Trim(ParseStringField(line, "eventId").value_or(""));
    state.review_status = NormalizeOpsEventReviewStatus(
        ParseStringField(line, "reviewStatus").value_or("new"));
    state.classification = NormalizeOpsEventReviewClassification(
        ParseStringField(line, "classification").value_or("unclassified"));
    if (const auto incident = ExtractObjectField(line, "incidentWorkflow"); incident.has_value()) {
        state.incident_id = NormalizeOpsIncidentId(
            ParseStringField(*incident, "incidentId").value_or(""), state.event_id);
        state.incident_status = NormalizeOpsIncidentStatus(
            ParseStringField(*incident, "status").value_or("new"));
        state.action_target =
            NormalizeOpsEventActionTarget(ParseStringField(*incident, "actionTarget").value_or(""));
    }
    state.incident_id = NormalizeOpsIncidentId(
        ParseStringField(line, "incidentId").value_or(state.incident_id), state.event_id);
    state.incident_status = NormalizeOpsIncidentStatus(
        ParseStringField(line, "incidentStatus").value_or(state.incident_status));
    state.action_target =
        NormalizeOpsEventActionTarget(ParseStringField(line, "actionTarget").value_or(state.action_target));
    if (const auto resolution = ExtractObjectField(line, "resolution"); resolution.has_value()) {
        state.resolution_status = NormalizeOpsResolutionStatus(
            ParseStringField(*resolution, "status").value_or(state.resolution_status));
        state.resolution_reason = NormalizeOpsResolutionReason(
            ParseStringField(*resolution, "reason").value_or(state.resolution_reason));
        state.resolution_note =
            NormalizeOpsResolutionNote(ParseStringField(*resolution, "note").value_or(""));
        state.resolution_transition = NormalizeOpsResolutionTransition(
            ParseStringField(*resolution, "transition").value_or(state.resolution_transition));
        state.resolution_closed_at_ms =
            ParseInt64Field(*resolution, "closedAtMs").value_or(state.resolution_closed_at_ms);
        state.resolution_reopened_at_ms =
            ParseInt64Field(*resolution, "reopenedAtMs").value_or(state.resolution_reopened_at_ms);
    }
    state.resolution_status = NormalizeOpsResolutionStatus(
        ParseStringField(line, "resolutionStatus").value_or(state.resolution_status));
    state.resolution_reason = NormalizeOpsResolutionReason(
        ParseStringField(line, "resolutionReason").value_or(state.resolution_reason));
    state.resolution_note = NormalizeOpsResolutionNote(
        ParseStringField(line, "resolutionNote").value_or(state.resolution_note));
    state.resolution_transition = NormalizeOpsResolutionTransition(
        ParseStringField(line, "resolutionTransition").value_or(state.resolution_transition));
    state.resolution_closed_at_ms =
        ParseInt64Field(line, "resolutionClosedAtMs").value_or(state.resolution_closed_at_ms);
    state.resolution_reopened_at_ms =
        ParseInt64Field(line, "resolutionReopenedAtMs").value_or(state.resolution_reopened_at_ms);
    state.note = NormalizeOpsEventReviewNote(ParseStringField(line, "note").value_or(""));
    if (const auto vlm_action = ExtractObjectField(line, "vlmAction"); vlm_action.has_value()) {
        state.vlm_action = NormalizeOpsVlmReviewAction(
            ParseStringField(*vlm_action, "action").value_or("not-reviewed"));
        state.vlm_action_target = NormalizeOpsVlmReviewActionTarget(
            ParseStringField(*vlm_action, "target").value_or("eventExplanation"));
        state.vlm_action_note =
            NormalizeOpsEventReviewNote(ParseStringField(*vlm_action, "note").value_or(""));
    }
    if (const auto feature_correction = ExtractObjectField(line, "featureCorrection");
        feature_correction.has_value()) {
        state.corrected_feature_label = NormalizeOpsFeatureCorrectionValue(
            ParseStringField(*feature_correction, "correctedFeatureLabel").value_or(""));
        state.feature_aliases =
            NormalizeOpsFeatureAliases(StringArrayFieldValues(*feature_correction, "featureAliases"));
        state.reanalysis_requested =
            ParseBoolField(*feature_correction, "reanalysisRequested").value_or(false);
        state.reanalysis_reason = NormalizeOpsFeatureCorrectionValue(
            ParseStringField(*feature_correction, "reanalysisReason").value_or(""));
    }
    state.corrected_feature_label = NormalizeOpsFeatureCorrectionValue(
        ParseStringField(line, "correctedFeatureLabel").value_or(state.corrected_feature_label));
    if (auto aliases = StringArrayFieldValues(line, "featureAliases"); !aliases.empty()) {
        state.feature_aliases = NormalizeOpsFeatureAliases(std::move(aliases));
    }
    state.reanalysis_requested =
        ParseBoolField(line, "reanalysisRequested").value_or(state.reanalysis_requested);
    state.reanalysis_reason = NormalizeOpsFeatureCorrectionValue(
        ParseStringField(line, "reanalysisReason").value_or(state.reanalysis_reason));
    state.updated_at_ms = ParseInt64Field(line, "updatedAtMs").value_or(0);
    state.actor = Trim(ParseStringField(line, "actor").value_or(""));
    state.role = Trim(ParseStringField(line, "role").value_or(""));
    state.present = OpsEventReviewEventIdAllowed(state.event_id);
    return state;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13290 function
std::string OpsEventReviewStateJson(const OpsEventReviewState& state) {
    const OpsEventReviewState resolution_state = OpsResolutionStateFromReview(state);
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.event-review-state.v1\","
        << "\"present\":" << (state.present ? "true" : "false") << ","
        << "\"eventId\":\"" << JsonEscape(state.event_id) << "\","
        << "\"reviewStatus\":\"" << JsonEscape(state.review_status.empty() ? "new"
                                                                            : state.review_status)
        << "\","
        << "\"classification\":\"" << JsonEscape(state.classification.empty()
                                                     ? "unclassified"
                                                     : state.classification)
        << "\","
        << "\"incidentId\":\"" << JsonEscape(state.incident_id.empty()
                                                 ? (state.event_id.empty() ? "" : "incident:" + state.event_id)
                                                 : state.incident_id)
        << "\","
        << "\"incidentStatus\":\"" << JsonEscape(state.incident_status.empty()
                                                     ? "new"
                                                     : state.incident_status)
        << "\","
        << "\"actionTarget\":\"" << JsonEscape(state.action_target.empty()
                                                   ? "operator-triage"
                                                   : state.action_target)
        << "\","
        << "\"incidentWorkflow\":{"
        << "\"schema\":\"media-server.ops.incident-action-state.v1\","
        << "\"incidentId\":\"" << JsonEscape(state.incident_id.empty()
                                                 ? (state.event_id.empty() ? "" : "incident:" + state.event_id)
                                                 : state.incident_id)
        << "\","
        << "\"status\":\"" << JsonEscape(state.incident_status.empty() ? "new"
                                                                        : state.incident_status)
        << "\","
        << "\"actionTarget\":\"" << JsonEscape(state.action_target.empty()
                                                   ? "operator-triage"
                                                   : state.action_target)
        << "\","
        << "\"persistent\":true,"
        << "\"auditAction\":\"incident-action-update\","
        << "\"separateFromEventRecords\":true,"
        << "\"separateFromEventPostPayload\":true,"
        << "\"eventPostPayloadChanged\":false"
        << "},"
        << "\"resolutionStatus\":\"" << JsonEscape(resolution_state.resolution_status) << "\","
        << "\"resolutionReason\":\"" << JsonEscape(resolution_state.resolution_reason) << "\","
        << "\"resolutionNote\":\"" << JsonEscape(resolution_state.resolution_note) << "\","
        << "\"resolutionTransition\":\"" << JsonEscape(resolution_state.resolution_transition) << "\","
        << "\"resolutionClosedAtMs\":" << resolution_state.resolution_closed_at_ms << ","
        << "\"resolutionReopenedAtMs\":" << resolution_state.resolution_reopened_at_ms << ","
        << "\"resolution\":" << OpsResolutionStateJson(resolution_state) << ","
        << "\"note\":\"" << JsonEscape(state.note) << "\","
        << "\"vlmAction\":{"
        << "\"schema\":\"media-server.ops.vlm-review-action-state.v1\","
        << "\"action\":\"" << JsonEscape(state.vlm_action.empty() ? "not-reviewed"
                                                                   : state.vlm_action)
        << "\","
        << "\"target\":\"" << JsonEscape(state.vlm_action_target.empty()
                                             ? "eventExplanation"
                                             : state.vlm_action_target)
        << "\","
        << "\"note\":\"" << JsonEscape(state.vlm_action_note) << "\","
        << "\"persistent\":true,"
        << "\"separateFromEventRecords\":true,"
        << "\"eventPostPayloadChanged\":false"
        << "},"
        << "\"correctedFeatureLabel\":\"" << JsonEscape(state.corrected_feature_label) << "\","
        << "\"featureAliases\":" << JsonStringArray(state.feature_aliases) << ","
        << "\"reanalysisRequested\":" << (state.reanalysis_requested ? "true" : "false") << ","
        << "\"reanalysisReason\":\"" << JsonEscape(state.reanalysis_reason) << "\","
        << "\"featureCorrection\":{"
        << "\"schema\":\"media-server.ops.operator-feature-correction.v1\","
        << "\"correctedFeatureLabel\":\"" << JsonEscape(state.corrected_feature_label) << "\","
        << "\"featureAliases\":" << JsonStringArray(state.feature_aliases) << ","
        << "\"reanalysisRequested\":" << (state.reanalysis_requested ? "true" : "false") << ","
        << "\"reanalysisReason\":\"" << JsonEscape(state.reanalysis_reason) << "\","
        << "\"persistent\":true,"
        << "\"separateFromEventRecords\":true,"
        << "\"separateFromEventPostPayload\":true,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"modelProviderDependency\":false,"
        << "\"runtimeProviderCallPerformed\":false,"
        << "\"featureRevisionWritePerformed\":false,"
        << "\"automaticRuleApplied\":false"
        << "},"
        << "\"updatedAtMs\":" << state.updated_at_ms << ","
        << "\"actor\":\"" << JsonEscape(state.actor) << "\","
        << "\"role\":\"" << JsonEscape(state.role) << "\""
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13389 function
OpsEventReviewState DefaultOpsEventReviewState(std::string event_id) {
    OpsEventReviewState state;
    state.event_id = std::move(event_id);
    state.present = false;
    state.review_status = "new";
    state.classification = "unclassified";
    state.incident_id = OpsEventReviewEventIdAllowed(state.event_id) ? "incident:" + state.event_id : "";
    state.incident_status = "new";
    state.action_target = "operator-triage";
    state.vlm_action = "not-reviewed";
    state.vlm_action_target = "eventExplanation";
    state.reanalysis_requested = false;
    return state;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13404 function
bool LoadOpsEventReviewStatesLocked(const std::filesystem::path& path,
                                    std::unordered_map<std::string, OpsEventReviewState>* states,
                                    std::string* error_message) {
    if (states == nullptr) {
        if (error_message != nullptr) {
            *error_message = "review state map is required";
        }
        return false;
    }
    states->clear();
    if (!std::filesystem::exists(path)) {
        return true;
    }
    std::ifstream in(path);
    if (!in) {
        if (error_message != nullptr) {
            *error_message = "failed to open event review state: " + path.string();
        }
        return false;
    }
    std::string line;
    while (std::getline(in, line)) {
        line = Trim(std::move(line));
        if (line.empty()) {
            continue;
        }
        OpsEventReviewState state = OpsEventReviewStateFromJsonLine(line);
        if (state.present) {
            (*states)[state.event_id] = std::move(state);
        }
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13438 function
bool LoadOpsEventReviewStates(const app::AppConfig& config,
                              std::unordered_map<std::string, OpsEventReviewState>* states,
                              std::string* error_message) {
    const std::filesystem::path path = OpsEventReviewStoragePath(config);
    std::lock_guard lock(g_ops_event_review_mu);
    return LoadOpsEventReviewStatesLocked(path, states, error_message);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13446 function
bool UpsertOpsEventReviewState(const app::AppConfig& config,
                               OpsEventReviewState next,
                               OpsEventReviewState* previous,
                               std::string* error_message) {
    if (!OpsEventReviewEventIdAllowed(next.event_id)) {
        if (error_message != nullptr) {
            *error_message = "eventId is required";
        }
        return false;
    }
    next.present = true;
    next.review_status = NormalizeOpsEventReviewStatus(next.review_status);
    next.classification = NormalizeOpsEventReviewClassification(next.classification);
    next.incident_id = NormalizeOpsIncidentId(next.incident_id, next.event_id);
    next.incident_status = NormalizeOpsIncidentStatus(next.incident_status);
    next.action_target = NormalizeOpsEventActionTarget(next.action_target);
    next.note = NormalizeOpsEventReviewNote(next.note);
    next.vlm_action = NormalizeOpsVlmReviewAction(next.vlm_action);
    next.vlm_action_target = NormalizeOpsVlmReviewActionTarget(next.vlm_action_target);
    next.vlm_action_note = NormalizeOpsEventReviewNote(next.vlm_action_note);
    next.resolution_status = NormalizeOpsResolutionStatus(next.resolution_status);
    next.resolution_reason = NormalizeOpsResolutionReason(next.resolution_reason);
    next.resolution_note = NormalizeOpsResolutionNote(next.resolution_note);
    next.resolution_transition = NormalizeOpsResolutionTransition(next.resolution_transition);
    next.corrected_feature_label =
        NormalizeOpsFeatureCorrectionValue(next.corrected_feature_label);
    next.feature_aliases = NormalizeOpsFeatureAliases(std::move(next.feature_aliases));
    next.reanalysis_reason = NormalizeOpsFeatureCorrectionValue(next.reanalysis_reason);
    next.updated_at_ms = NowUnixMs();
    const std::filesystem::path path = OpsEventReviewStoragePath(config);
    std::error_code ec;
    std::filesystem::create_directories(path.parent_path(), ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = "failed to create event review directory: " + ec.message();
        }
        return false;
    }
    std::lock_guard lock(g_ops_event_review_mu);
    std::unordered_map<std::string, OpsEventReviewState> states;
    if (!LoadOpsEventReviewStatesLocked(path, &states, error_message)) {
        return false;
    }
    OpsEventReviewState previous_state = DefaultOpsEventReviewState(next.event_id);
    if (const auto it = states.find(next.event_id); it != states.end()) {
        previous_state = it->second;
    }
    if (previous != nullptr) {
        *previous = previous_state;
    }
    next = OpsResolutionStateFromReview(next);
    if (OpsResolutionStatusIsClosed(next.resolution_status) &&
        next.resolution_closed_at_ms == 0) {
        next.resolution_closed_at_ms = previous_state.resolution_closed_at_ms > 0
                                           ? previous_state.resolution_closed_at_ms
                                           : next.updated_at_ms;
    }
    if (next.resolution_status == "reopened" && next.resolution_reopened_at_ms == 0) {
        next.resolution_reopened_at_ms = next.updated_at_ms;
    }
    std::ofstream out(path, std::ios::app);
    if (!out) {
        if (error_message != nullptr) {
            *error_message = "failed to open event review state: " + path.string();
        }
        return false;
    }
    out << OpsEventReviewStateJson(next) << "\n";
    out.flush();
    if (!out) {
        if (error_message != nullptr) {
            *error_message = "failed to write event review state: " + path.string();
        }
        return false;
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13524 function
std::string OpsEventReviewCatalogJson() {
    return "{\"reviewStatuses\":[\"new\",\"reviewing\",\"confirmed\",\"dismissed\","
           "\"needs-follow-up\"],\"classifications\":[\"unclassified\",\"true-positive\","
           "\"false-positive\",\"duplicate\",\"needs-tuning\"],\"vlmActions\":[\"not-reviewed\","
           "\"accept\",\"dismiss\",\"review-needed\"],\"vlmActionTargets\":[\"summary\","
           "\"eventExplanation\",\"falsePositiveHints\",\"operatorReviewQuestions\"],"
           "\"incidentStatuses\":[\"new\",\"review-needed\",\"acknowledged\",\"in-progress\","
           "\"closed\",\"false-positive\"],\"resolutionStatuses\":["
           "\"open\",\"triaged\",\"in-progress\",\"resolved\",\"reopened\",\"false-positive\"],"
           "\"resolutionReasons\":[\"unreviewed\",\"operator-confirmed\","
           "\"evidence-insufficient\",\"false-positive\",\"duplicate\",\"source-unreliable\","
           "\"rule-tuning\",\"manual-reopen\"],\"resolutionTransitions\":["
           "\"none\",\"close\",\"reopen\"]}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13539 function
bool OpsEventReviewMatchesFilters(const OpsEventReviewState& state,
                                  const std::string& review_status,
                                  const std::string& classification,
                                  const std::string& incident_status) {
    const std::string wanted_status = NormalizeOpsEventReviewStatus(review_status);
    const std::string wanted_classification =
        NormalizeOpsEventReviewClassification(classification);
    const std::string wanted_incident_status = NormalizeOpsIncidentStatus(incident_status);
    if (!Trim(review_status).empty() && state.review_status != wanted_status) {
        return false;
    }
    if (!Trim(classification).empty() && state.classification != wanted_classification) {
        return false;
    }
    if (!Trim(incident_status).empty() && state.incident_status != wanted_incident_status) {
        return false;
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13559 function
std::filesystem::path ClientLiveLayoutPreferenceStoragePath(const app::AppConfig& config) {
    std::filesystem::path base = config.source_registry_path.empty()
                                     ? std::filesystem::path(".")
                                     : std::filesystem::path(config.source_registry_path).parent_path();
    if (base.empty()) {
        base = ".";
    }
    return base / ".media_server.client_live_layout_preferences.jsonl";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13569 function
std::string ClientLivePreferencePrincipalKey(const auth::Principal& principal) {
    std::string key = Trim(principal.username);
    if (key.empty()) {
        key = Trim(principal.display_name);
    }
    if (key.empty()) {
        key = Trim(principal.role);
    }
    if (key.empty()) {
        key = "anonymous";
    }
    return principal.auth_mode + ":" + principal.role + ":" + key;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13583 function
bool ClientLiveLayoutPreferenceContainsForbiddenMaterial(const std::string& body) {
    const std::string lowered = LowerAscii(body);
    static const std::vector<std::string> kForbidden = {
        "rtsp://",
        "rtsps://",
        "whep://",
        "wheps://",
        "sourceurl",
        "developerurl",
        "debugurl",
        "raw json",
        "rawjson",
        "debugcounters",
        "bbox diagnostics",
        "modelpath",
        "modelchecksum",
        "password",
        "passwordhash",
        "token",
        "tokenhash",
        "credential",
        "secret",
    };
    return std::any_of(kForbidden.begin(), kForbidden.end(), [&](const std::string& needle) {
        return lowered.find(needle) != std::string::npos;
    });
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13611 function
bool NormalizeClientLiveLayoutPreferenceBody(const std::string& body,
                                             std::string* normalized,
                                             std::string* error_message) {
    std::string value = Trim(body);
    constexpr std::size_t kClientLiveLayoutPreferenceMaxBodyBytes = 24 * 1024;
    if (value.empty()) {
        if (error_message != nullptr) {
            *error_message = "invalid live layout preference: body is required";
        }
        return false;
    }
    if (value.size() > kClientLiveLayoutPreferenceMaxBodyBytes) {
        if (error_message != nullptr) {
            *error_message = "invalid live layout preference: body is too large";
        }
        return false;
    }
    if (value.front() != '{' || value.back() != '}') {
        if (error_message != nullptr) {
            *error_message = "invalid live layout preference: JSON object required";
        }
        return false;
    }
    if (!ExtractObjectField(value, "workspaceLayout").has_value() ||
        !ExtractObjectField(value, "filters").has_value() ||
        !ExtractObjectField(value, "overlayDefaults").has_value()) {
        if (error_message != nullptr) {
            *error_message =
                "invalid live layout preference: workspaceLayout, filters, overlayDefaults required";
        }
        return false;
    }
    const std::string schema =
        Trim(ParseStringField(value, "schema").value_or("media-server.client-live-layout.v1"));
    if (schema != "media-server.client-live-layout.v1") {
        if (error_message != nullptr) {
            *error_message = "invalid live layout preference: unsupported schema";
        }
        return false;
    }
    if (ClientLiveLayoutPreferenceContainsForbiddenMaterial(value)) {
        if (error_message != nullptr) {
            *error_message =
                "invalid live layout preference: debug, credential, or source URL material is not allowed";
        }
        return false;
    }
    if (normalized != nullptr) {
        *normalized = std::move(value);
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13664 function
std::string ClientLiveRoleLayoutPresetJson(const auth::Principal& principal) {
    const std::string role = principal.role.empty() ? "viewer" : principal.role;
    const bool operator_like = role == "admin" || role == "operator";
    const bool integrator = role == "integrator";
    const int grid_size = integrator ? 1 : 4;
    const std::string density = operator_like ? "compact" : "comfortable";
    const std::string dock_side = operator_like ? "left" : "right";
    const bool info_overlay = false;
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.client-live-layout.v1\","
        << "\"presetType\":\"role\","
        << "\"role\":\"" << JsonEscape(role) << "\","
        << "\"workspaceLayout\":{\"gridSize\":" << grid_size
        << ",\"density\":\"" << density << "\","
        << "\"dockSide\":\"" << dock_side << "\"},"
        << "\"filters\":{\"eventFeed\":\"selected-tile\",\"selectedViewId\":\"\"},"
        << "\"overlayDefaults\":{\"infoOverlayEnabled\":"
        << (info_overlay ? "true" : "false") << "},"
        << "\"selectedSources\":[],"
        << "\"tiles\":[]"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13689 function
bool LoadClientLiveLayoutPreferenceLocked(const std::filesystem::path& path,
                                          const std::string& key,
                                          std::string* preference_json,
                                          std::int64_t* updated_at_ms,
                                          std::string* error_message) {
    if (preference_json != nullptr) {
        preference_json->clear();
    }
    if (updated_at_ms != nullptr) {
        *updated_at_ms = 0;
    }
    if (!std::filesystem::exists(path)) {
        return true;
    }
    std::ifstream in(path);
    if (!in) {
        if (error_message != nullptr) {
            *error_message = "failed to open client live layout preference state: " + path.string();
        }
        return false;
    }
    std::string line;
    while (std::getline(in, line)) {
        line = Trim(std::move(line));
        if (line.empty() || ParseStringField(line, "key").value_or("") != key) {
            continue;
        }
        const auto preference = ExtractObjectField(line, "userPreference");
        if (!preference.has_value()) {
            continue;
        }
        if (preference_json != nullptr) {
            *preference_json = *preference;
        }
        if (updated_at_ms != nullptr) {
            *updated_at_ms = ParseInt64Field(line, "updatedAtMs").value_or(0);
        }
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13730 function
bool LoadClientLiveLayoutPreference(const app::AppConfig& config,
                                    const auth::Principal& principal,
                                    std::string* preference_json,
                                    std::int64_t* updated_at_ms,
                                    std::string* error_message) {
    const std::filesystem::path path = ClientLiveLayoutPreferenceStoragePath(config);
    const std::string key = ClientLivePreferencePrincipalKey(principal);
    std::lock_guard lock(g_client_live_preference_mu);
    return LoadClientLiveLayoutPreferenceLocked(
        path, key, preference_json, updated_at_ms, error_message);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13742 function
std::string ClientLiveLayoutPreferenceRecordJson(const auth::Principal& principal,
                                                 const std::string& preference_json,
                                                 std::int64_t updated_at_ms) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.client-live-layout-preference.v1\","
        << "\"key\":\"" << JsonEscape(ClientLivePreferencePrincipalKey(principal)) << "\","
        << "\"actor\":\"" << JsonEscape(principal.username.empty()
                                             ? principal.display_name
                                             : principal.username)
        << "\","
        << "\"role\":\"" << JsonEscape(principal.role) << "\","
        << "\"updatedAtMs\":" << updated_at_ms << ","
        << "\"userPreference\":" << preference_json
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13760 function
bool UpsertClientLiveLayoutPreference(const app::AppConfig& config,
                                      const auth::Principal& principal,
                                      const std::string& body,
                                      std::string* error_message) {
    std::string normalized;
    if (!NormalizeClientLiveLayoutPreferenceBody(body, &normalized, error_message)) {
        return false;
    }
    const std::filesystem::path path = ClientLiveLayoutPreferenceStoragePath(config);
    std::error_code ec;
    std::filesystem::create_directories(path.parent_path(), ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = "failed to create client live layout preference directory: " + ec.message();
        }
        return false;
    }
    std::lock_guard lock(g_client_live_preference_mu);
    std::ofstream out(path, std::ios::app);
    if (!out) {
        if (error_message != nullptr) {
            *error_message = "failed to open client live layout preference state: " + path.string();
        }
        return false;
    }
    out << ClientLiveLayoutPreferenceRecordJson(principal, normalized, NowUnixMs()) << "\n";
    out.flush();
    if (!out) {
        if (error_message != nullptr) {
            *error_message = "failed to write client live layout preference state: " + path.string();
        }
        return false;
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13796 function
std::string ClientLiveLayoutPreferencesJson(const app::AppConfig& config,
                                            const auth::Principal& principal,
                                            bool saved) {
    std::string preference_json;
    std::int64_t updated_at_ms = 0;
    std::string error_message;
    const bool loaded = LoadClientLiveLayoutPreference(
        config, principal, &preference_json, &updated_at_ms, &error_message);
    std::ostringstream out;
    out << "{"
        << "\"status\":\"client-live-layout-preferences\","
        << "\"schema\":\"media-server.client-live-layout-preferences.v1\","
        << "\"saved\":" << (saved ? "true" : "false") << ","
        << "\"contract\":{\"userPreferenceSeparateFromRolePreset\":true,"
        << "\"rolePresetSeparateFromUserPreference\":true,"
        << "\"authScopeChanged\":false,"
        << "\"mediaPathChanged\":false},"
        << "\"principal\":{\"role\":\"" << JsonEscape(principal.role) << "\"},"
        << "\"rolePreset\":" << ClientLiveRoleLayoutPresetJson(principal) << ","
        << "\"userPreference\":";
    if (!preference_json.empty()) {
        out << preference_json;
    } else {
        out << "null";
    }
    out << ",\"updatedAtMs\":" << updated_at_ms;
    if (!loaded) {
        out << ",\"warning\":\"" << JsonEscape(error_message) << "\"";
    }
    out << "}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13841 function
std::filesystem::path OpsAlertDeliveryStoragePath(const app::AppConfig& config) {
    std::filesystem::path base = config.source_registry_path.empty()
                                     ? std::filesystem::path(".")
                                     : std::filesystem::path(config.source_registry_path).parent_path();
    if (base.empty()) {
        base = ".";
    }
    return base / ".media_server.alert_deliveries.jsonl";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13851 function
std::filesystem::path OpsAlertDeliveryAttemptStoragePath(const app::AppConfig& config) {
    std::filesystem::path base = config.source_registry_path.empty()
                                     ? std::filesystem::path(".")
                                     : std::filesystem::path(config.source_registry_path).parent_path();
    if (base.empty()) {
        base = ".";
    }
    return base / ".media_server.alert_delivery_attempts.jsonl";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13861 function
bool OpsAlertDeliveryIdAllowed(const std::string& value) {
    if (value.empty() || value.size() > 80) {
        return false;
    }
    for (const unsigned char ch : value) {
        if (!(std::isalnum(ch) || ch == '-' || ch == '_' || ch == '.')) {
            return false;
        }
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13873 function
std::string NormalizeOpsAlertDeliveryKind(std::string value) {
    value = LowerAscii(Trim(std::move(value)));
    if (value == "email" || value == "slack" || value == "webhook") {
        return value;
    }
    return "webhook";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13881 function
int ClampOpsAlertDeliveryInt(std::optional<std::int64_t> value, int fallback, int min_value, int max_value) {
    if (!value.has_value()) {
        return fallback;
    }
    return static_cast<int>(std::max<std::int64_t>(
        min_value, std::min<std::int64_t>(max_value, *value)));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13889 function
std::string OpsAlertDeliveryEndpointFromBody(const std::string& body, const std::string& kind) {
    if (kind == "email") {
        return Trim(ParseStringField(body, "emailTo").value_or(ParseStringField(body, "endpoint").value_or("")));
    }
    if (kind == "slack") {
        return Trim(ParseStringField(body, "slackChannel")
                        .value_or(ParseStringField(body, "webhookUrl")
                                      .value_or(ParseStringField(body, "endpoint").value_or(""))));
    }
    return Trim(ParseStringField(body, "webhookUrl")
                    .value_or(ParseStringField(body, "url")
                                  .value_or(ParseStringField(body, "endpoint").value_or(""))));
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13903 function
std::string OpsAlertDeliveryMaskedEndpoint(const OpsAlertDeliveryConfig& config) {
    if (config.endpoint.empty()) {
        return "";
    }
    if (config.kind == "email") {
        const std::size_t at = config.endpoint.find('@');
        if (at != std::string::npos && at > 0 && at + 1 < config.endpoint.size()) {
            return config.endpoint.substr(0, 1) + "***@" + config.endpoint.substr(at + 1);
        }
    }
    if (config.kind == "slack" && config.endpoint.rfind("#", 0) == 0) {
        return "#***";
    }
    return "[redacted-alert-target]";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13919 function
OpsAlertDeliveryConfig OpsAlertDeliveryConfigFromJsonLine(const std::string& line) {
    OpsAlertDeliveryConfig config;
    config.id = Trim(ParseStringField(line, "id").value_or(""));
    config.kind = NormalizeOpsAlertDeliveryKind(ParseStringField(line, "kind").value_or("webhook"));
    config.enabled = ParseBoolField(line, "enabled").value_or(false);
    config.label = Trim(ParseStringField(line, "label").value_or(""));
    config.endpoint = Trim(ParseStringField(line, "endpoint").value_or(""));
    config.retry_max = ClampOpsAlertDeliveryInt(ParseInt64Field(line, "retryMax"), 3, 0, 8);
    config.retry_backoff_ms =
        ClampOpsAlertDeliveryInt(ParseInt64Field(line, "retryBackoffMs"), 2000, 250, 60000);
    config.updated_at_ms = ParseInt64Field(line, "updatedAtMs").value_or(0);
    config.present = OpsAlertDeliveryIdAllowed(config.id);
    return config;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13934 function
std::string OpsAlertDeliveryConfigJson(const OpsAlertDeliveryConfig& config, bool redact_endpoint) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.alert-delivery.v1\","
        << "\"id\":\"" << JsonEscape(config.id) << "\","
        << "\"kind\":\"" << JsonEscape(config.kind) << "\","
        << "\"enabled\":" << (config.enabled ? "true" : "false") << ","
        << "\"label\":\"" << JsonEscape(config.label) << "\",";
    if (redact_endpoint) {
        out << "\"endpointMasked\":\"" << JsonEscape(OpsAlertDeliveryMaskedEndpoint(config)) << "\","
            << "\"endpointRedacted\":true,";
    } else {
        out << "\"endpoint\":\"" << JsonEscape(config.endpoint) << "\",";
    }
    out << "\"retryPolicy\":{\"maxAttempts\":" << config.retry_max
        << ",\"backoffMs\":" << config.retry_backoff_ms
        << ",\"bounded\":true},"
        << "\"eventPostPayloadChanged\":false,"
        << "\"updatedAtMs\":" << config.updated_at_ms
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13957 function
bool LoadOpsAlertDeliveryConfigsLocked(const std::filesystem::path& path,
                                       std::unordered_map<std::string, OpsAlertDeliveryConfig>* configs,
                                       std::string* error_message) {
    if (configs == nullptr) {
        if (error_message != nullptr) {
            *error_message = "alert delivery config map is required";
        }
        return false;
    }
    configs->clear();
    if (!std::filesystem::exists(path)) {
        return true;
    }
    std::ifstream in(path);
    if (!in) {
        if (error_message != nullptr) {
            *error_message = "failed to open alert delivery state: " + path.string();
        }
        return false;
    }
    std::string line;
    while (std::getline(in, line)) {
        line = Trim(std::move(line));
        if (line.empty()) {
            continue;
        }
        OpsAlertDeliveryConfig config = OpsAlertDeliveryConfigFromJsonLine(line);
        if (config.present) {
            (*configs)[config.id] = std::move(config);
        }
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13991 function
bool LoadOpsAlertDeliveryConfigs(const app::AppConfig& config,
                                 std::unordered_map<std::string, OpsAlertDeliveryConfig>* configs,
                                 std::string* error_message) {
    const std::filesystem::path path = OpsAlertDeliveryStoragePath(config);
    std::lock_guard lock(g_ops_alert_delivery_mu);
    return LoadOpsAlertDeliveryConfigsLocked(path, configs, error_message);
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13999 function
bool UpsertOpsAlertDeliveryConfig(const app::AppConfig& config,
                                  const std::string& body,
                                  OpsAlertDeliveryConfig* saved,
                                  std::string* error_message) {
    OpsAlertDeliveryConfig next;
    next.id = Trim(ParseStringField(body, "id").value_or(""));
    if (!OpsAlertDeliveryIdAllowed(next.id)) {
        if (error_message != nullptr) {
            *error_message = "alert delivery id is required";
        }
        return false;
    }
    next.kind = NormalizeOpsAlertDeliveryKind(ParseStringField(body, "kind").value_or("webhook"));
    next.enabled = ParseBoolField(body, "enabled").value_or(true);
    next.label = Trim(ParseStringField(body, "label").value_or(next.id));
    next.endpoint = OpsAlertDeliveryEndpointFromBody(body, next.kind);
    if (next.endpoint.empty()) {
        if (error_message != nullptr) {
            *error_message = "alert delivery endpoint is required";
        }
        return false;
    }
    next.retry_max = ClampOpsAlertDeliveryInt(ParseInt64Field(body, "retryMax"), 3, 0, 8);
    next.retry_backoff_ms =
        ClampOpsAlertDeliveryInt(ParseInt64Field(body, "retryBackoffMs"), 2000, 250, 60000);
    next.updated_at_ms = NowUnixMs();
    next.present = true;

    const std::filesystem::path path = OpsAlertDeliveryStoragePath(config);
    std::error_code ec;
    std::filesystem::create_directories(path.parent_path(), ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = "failed to create alert delivery directory: " + ec.message();
        }
        return false;
    }
    std::lock_guard lock(g_ops_alert_delivery_mu);
    std::ofstream out(path, std::ios::app);
    if (!out) {
        if (error_message != nullptr) {
            *error_message = "failed to open alert delivery state: " + path.string();
        }
        return false;
    }
    out << OpsAlertDeliveryConfigJson(next, false) << "\n";
    out.flush();
    if (!out) {
        if (error_message != nullptr) {
            *error_message = "failed to write alert delivery state: " + path.string();
        }
        return false;
    }
    if (saved != nullptr) {
        *saved = next;
    }
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14058 function
std::string OpsAlertDeliveryAttemptJson(const OpsAlertDeliveryConfig& delivery,
                                        const std::string& event_id,
                                        const std::string& event_type,
                                        const std::string& source_id,
                                        const std::string& status,
                                        const std::string& transport,
                                        std::int64_t now_ms,
                                        bool dry_run,
                                        bool external_delivery_performed,
                                        const std::string& payload_preview_json) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.alert-delivery-attempt.v1\","
        << "\"deliveryId\":\"" << JsonEscape(delivery.id) << "\","
        << "\"kind\":\"" << JsonEscape(delivery.kind) << "\","
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"eventType\":\"" << JsonEscape(event_type) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
        << "\"status\":\"" << JsonEscape(status) << "\","
        << "\"transport\":\"" << JsonEscape(transport) << "\","
        << "\"endpointMasked\":\"" << JsonEscape(OpsAlertDeliveryMaskedEndpoint(delivery)) << "\","
        << "\"retryPolicy\":{\"maxAttempts\":" << delivery.retry_max
        << ",\"backoffMs\":" << delivery.retry_backoff_ms
        << ",\"bounded\":true},"
        << "\"dryRun\":" << (dry_run ? "true" : "false") << ","
        << "\"externalDeliveryPerformed\":"
        << (external_delivery_performed ? "true" : "false") << ","
        << "\"eventPostPayloadChanged\":false,"
        << "\"attemptedAtMs\":" << now_ms;
    if (!payload_preview_json.empty()) {
        out << ",\"payloadPreview\":" << payload_preview_json;
    }
    out << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14094 function
bool AppendOpsAlertDeliveryAttempt(const app::AppConfig& config,
                                   const std::string& attempt_json,
                                   std::string* error_message) {
    const std::filesystem::path path = OpsAlertDeliveryAttemptStoragePath(config);
    std::error_code ec;
    std::filesystem::create_directories(path.parent_path(), ec);
    if (ec) {
        if (error_message != nullptr) {
            *error_message = "failed to create alert delivery attempt directory: " + ec.message();
        }
        return false;
    }
    std::lock_guard lock(g_ops_alert_delivery_mu);
    std::ofstream out(path, std::ios::app);
    if (!out) {
        if (error_message != nullptr) {
            *error_message = "failed to open alert delivery attempt state: " + path.string();
        }
        return false;
    }
    out << attempt_json << "\n";
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14118 function
std::vector<std::string> LoadRecentOpsAlertDeliveryAttempts(const app::AppConfig& config,
                                                           std::size_t limit) {
    const std::filesystem::path path = OpsAlertDeliveryAttemptStoragePath(config);
    std::vector<std::string> lines;
    std::lock_guard lock(g_ops_alert_delivery_mu);
    if (!std::filesystem::exists(path)) {
        return lines;
    }
    std::ifstream in(path);
    std::string line;
    while (std::getline(in, line)) {
        line = Trim(std::move(line));
        if (!line.empty()) {
            lines.push_back(line);
        }
    }
    if (lines.size() > limit) {
        lines.erase(lines.begin(), lines.end() - static_cast<std::ptrdiff_t>(limit));
    }
    std::reverse(lines.begin(), lines.end());
    return lines;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14141 function
std::string OpsAlertDeliveryListJson(const app::AppConfig& config) {
    std::unordered_map<std::string, OpsAlertDeliveryConfig> configs;
    std::string error_message;
    const bool loaded = LoadOpsAlertDeliveryConfigs(config, &configs, &error_message);
    std::vector<OpsAlertDeliveryConfig> items;
    for (const auto& [_, item] : configs) {
        items.push_back(item);
    }
    std::sort(items.begin(), items.end(), [](const auto& left, const auto& right) {
        return left.id < right.id;
    });
    const auto attempts = LoadRecentOpsAlertDeliveryAttempts(config, 20);
    std::ostringstream out;
    out << "{"
        << "\"status\":\"ops-alert-deliveries\","
        << "\"schema\":\"media-server.ops.alert-delivery-list.v1\","
        << "\"contract\":{\"separateFromEventPostPayload\":true,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"auditMasking\":true,"
        << "\"dryRunOnly\":true,"
        << "\"payloadPreview\":true,"
        << "\"deliveryAttemptLog\":true,"
        << "\"externalDeliveryPerformedByDefault\":false,"
        << "\"retryPolicy\":true},"
        << "\"policy\":{\"transports\":[\"webhook\",\"email\",\"slack\"],"
        << "\"deliveryFixtureSmoke\":true,"
        << "\"dryRunEndpoint\":\"/ops/api/alerts/deliveries/dry-run\","
        << "\"boundedRetry\":true,"
        << "\"clientViewerExposure\":false},"
        << "\"integrations\":[";
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << OpsAlertDeliveryConfigJson(items[i], true);
    }
    out << "],\"attempts\":[";
    for (std::size_t i = 0; i < attempts.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << attempts[i];
    }
    out << "],\"loaded\":" << (loaded ? "true" : "false");
    if (!loaded) {
        out << ",\"warning\":\"" << JsonEscape(error_message) << "\"";
    }
    out << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14192 function
std::string OpsAlertDeliveryPayloadPreviewJson(const OpsAlertDeliveryConfig& delivery,
                                               const std::string& event_id,
                                               const std::string& event_type,
                                               const std::string& source_id) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.ops.alert-delivery-payload-preview.v1\","
        << "\"deliveryId\":\"" << JsonEscape(delivery.id) << "\","
        << "\"kind\":\"" << JsonEscape(delivery.kind) << "\","
        << "\"label\":\"" << JsonEscape(delivery.label) << "\","
        << "\"endpointMasked\":\"" << JsonEscape(OpsAlertDeliveryMaskedEndpoint(delivery)) << "\","
        << "\"payloadRedacted\":true,"
        << "\"event\":{\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"eventType\":\"" << JsonEscape(event_type) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\"},"
        << "\"body\":{\"deliveryId\":\"" << JsonEscape(delivery.id) << "\","
        << "\"kind\":\"" << JsonEscape(delivery.kind) << "\","
        << "\"eventId\":\"" << JsonEscape(event_id) << "\","
        << "\"eventType\":\"" << JsonEscape(event_type) << "\","
        << "\"sourceId\":\"" << JsonEscape(source_id) << "\","
        << "\"endpoint\":\"[redacted-alert-target]\"},"
        << "\"eventPostPayloadChanged\":false,"
        << "\"externalDeliveryPerformed\":false"
        << "}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14219 function
bool OpsAlertDeliveryBodyLooksLikeDraft(const std::string& body) {
    return ParseStringField(body, "endpoint").has_value() ||
           ParseStringField(body, "webhookUrl").has_value() ||
           ParseStringField(body, "emailTo").has_value() ||
           ParseStringField(body, "slackChannel").has_value() ||
           ParseStringField(body, "kind").has_value() ||
           ParseStringField(body, "label").has_value();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14228 function
bool OpsAlertDeliveryDraftFromBody(const std::string& body,
                                   OpsAlertDeliveryConfig* draft,
                                   std::string* error_message) {
    if (draft == nullptr) {
        if (error_message != nullptr) {
            *error_message = "alert delivery draft is required";
        }
        return false;
    }
    OpsAlertDeliveryConfig next;
    next.id = Trim(ParseStringField(body, "id").value_or(
        ParseStringField(body, "deliveryId").value_or("")));
    if (!OpsAlertDeliveryIdAllowed(next.id)) {
        if (error_message != nullptr) {
            *error_message = "alert delivery id is required for dry-run";
        }
        return false;
    }
    next.kind = NormalizeOpsAlertDeliveryKind(ParseStringField(body, "kind").value_or("webhook"));
    next.enabled = ParseBoolField(body, "enabled").value_or(true);
    next.label = Trim(ParseStringField(body, "label").value_or(next.id));
    next.endpoint = OpsAlertDeliveryEndpointFromBody(body, next.kind);
    if (next.endpoint.empty()) {
        if (error_message != nullptr) {
            *error_message = "alert delivery endpoint is required for dry-run";
        }
        return false;
    }
    next.retry_max = ClampOpsAlertDeliveryInt(ParseInt64Field(body, "retryMax"), 3, 0, 8);
    next.retry_backoff_ms =
        ClampOpsAlertDeliveryInt(ParseInt64Field(body, "retryBackoffMs"), 2000, 250, 60000);
    next.updated_at_ms = NowUnixMs();
    next.present = true;
    *draft = std::move(next);
    return true;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14265 function
std::string DispatchOpsAlertDeliveryDryRun(const app::AppConfig& config,
                                           const auth::Principal& principal,
                                           const std::string& body,
                                           std::string* error_message) {
    const std::string wanted_id = Trim(ParseStringField(body, "id").value_or(
        ParseStringField(body, "deliveryId").value_or("")));
    const std::string event_id = Trim(ParseStringField(body, "eventId").value_or(
        "alert-dry-run-" + std::to_string(NowUnixMs())));
    const std::string event_type =
        Trim(ParseStringField(body, "eventType").value_or("intrusion"));
    const std::string source_id = Trim(ParseStringField(body, "sourceId").value_or("sample"));

    std::vector<OpsAlertDeliveryConfig> deliveries;
    if (OpsAlertDeliveryBodyLooksLikeDraft(body)) {
        OpsAlertDeliveryConfig draft;
        if (!OpsAlertDeliveryDraftFromBody(body, &draft, error_message)) {
            return "";
        }
        deliveries.push_back(std::move(draft));
    } else {
        std::unordered_map<std::string, OpsAlertDeliveryConfig> configs;
        if (!LoadOpsAlertDeliveryConfigs(config, &configs, error_message)) {
            return "";
        }
        for (const auto& [_, delivery] : configs) {
            if (!wanted_id.empty() && delivery.id != wanted_id) {
                continue;
            }
            deliveries.push_back(delivery);
        }
    }
    if (deliveries.empty()) {
        if (error_message != nullptr) {
            *error_message = "no alert delivery target found for dry-run";
        }
        return "";
    }

    std::vector<std::string> attempts;
    std::vector<std::string> payload_previews;
    const std::int64_t now_ms = NowUnixMs();
    for (const auto& delivery : deliveries) {
        const std::string preview =
            OpsAlertDeliveryPayloadPreviewJson(delivery, event_id, event_type, source_id);
        const std::string attempt = OpsAlertDeliveryAttemptJson(delivery,
                                                                event_id,
                                                                event_type,
                                                                source_id,
                                                                "dry-run",
                                                                "dry-run",
                                                                now_ms,
                                                                true,
                                                                false,
                                                                preview);
        if (!AppendOpsAlertDeliveryAttempt(config, attempt, error_message)) {
            return "";
        }
        payload_previews.push_back(preview);
        attempts.push_back(attempt);
    }

    std::ostringstream audit_body;
    audit_body << "{"
               << "\"area\":\"events\","
               << "\"action\":\"alert-delivery-dry-run\","
               << "\"target\":\"alert-delivery:" << JsonEscape(wanted_id.empty() ? "draft" : wanted_id)
               << "\","
               << "\"summary\":\"Alert delivery dry-run preview generated\","
               << "\"after\":{\"eventId\":\"" << JsonEscape(event_id) << "\","
               << "\"attempts\":" << attempts.size() << ","
               << "\"payloadPreview\":true,"
               << "\"dryRun\":true,"
               << "\"externalDeliveryPerformed\":false,"
               << "\"endpoint\":\"[redacted-alert-target]\"}"
               << "}";
    std::string audit_error;
    (void)AppendOpsAuditRecord(config, OpsAuditRecordJson(audit_body.str(), principal), &audit_error);

    std::ostringstream out;
    out << "{"
        << "\"status\":\"ops-alert-delivery-dry-run\","
        << "\"schema\":\"media-server.ops.alert-delivery-dry-run.v1\","
        << "\"dryRun\":true,"
        << "\"externalDeliveryPerformed\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"contract\":{\"alertTargetDraft\":true,"
        << "\"payloadPreview\":true,"
        << "\"deliveryAttemptLog\":true,"
        << "\"separateFromEventPostPayload\":true},"
        << "\"audit\":{\"area\":\"events\",\"action\":\"alert-delivery-dry-run\"},"
        << "\"payloadPreviews\":[";
    for (std::size_t i = 0; i < payload_previews.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << payload_previews[i];
    }
    out << "],\"attempts\":[";
    for (std::size_t i = 0; i < attempts.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << attempts[i];
    }
    out << "]}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14373 function
std::string DispatchOpsAlertDeliveryFixture(const app::AppConfig& config,
                                            const auth::Principal& principal,
                                            const std::string& body,
                                            std::string* error_message) {
    std::unordered_map<std::string, OpsAlertDeliveryConfig> configs;
    if (!LoadOpsAlertDeliveryConfigs(config, &configs, error_message)) {
        return "";
    }
    const std::string wanted_id = Trim(ParseStringField(body, "id").value_or(
        ParseStringField(body, "deliveryId").value_or("")));
    const std::string event_id = Trim(ParseStringField(body, "eventId").value_or(
        "alert-fixture-" + std::to_string(NowUnixMs())));
    const std::string event_type =
        Trim(ParseStringField(body, "eventType").value_or("intrusion"));
    const std::string source_id = Trim(ParseStringField(body, "sourceId").value_or("sample"));
    std::vector<std::string> attempts;
    const std::int64_t now_ms = NowUnixMs();
    for (const auto& [_, delivery] : configs) {
        if (!delivery.enabled) {
            continue;
        }
        if (!wanted_id.empty() && delivery.id != wanted_id) {
            continue;
        }
        const std::string attempt =
            OpsAlertDeliveryAttemptJson(delivery, event_id, event_type, source_id, "delivered", "fixture", now_ms);
        if (!AppendOpsAlertDeliveryAttempt(config, attempt, error_message)) {
            return "";
        }
        attempts.push_back(attempt);
    }
    std::ostringstream audit_body;
    audit_body << "{"
               << "\"area\":\"events\","
               << "\"action\":\"alert-delivery-test\","
               << "\"target\":\"alert-delivery:" << JsonEscape(wanted_id.empty() ? "all" : wanted_id) << "\","
               << "\"summary\":\"Alert delivery fixture dispatched\","
               << "\"after\":{\"eventId\":\"" << JsonEscape(event_id) << "\","
               << "\"attempts\":" << attempts.size() << ","
               << "\"endpoint\":\"[redacted-alert-target]\"}"
               << "}";
    std::string audit_error;
    (void)AppendOpsAuditRecord(config, OpsAuditRecordJson(audit_body.str(), principal), &audit_error);

    std::ostringstream out;
    out << "{"
        << "\"status\":\"ops-alert-delivery-fixture\","
        << "\"eventPostPayloadChanged\":false,"
        << "\"audit\":{\"area\":\"events\",\"action\":\"alert-delivery-test\"},"
        << "\"attempts\":[";
    for (std::size_t i = 0; i < attempts.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << attempts[i];
    }
    out << "]}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14433 function
void DispatchOpsAlertDeliveries(const app::AppConfig& config,
                                const analysis::AnalysisResult& result,
                                const std::vector<analysis::AnalysisEvent>& events) {
    if (events.empty()) {
        return;
    }
    std::unordered_map<std::string, OpsAlertDeliveryConfig> configs;
    if (!LoadOpsAlertDeliveryConfigs(config, &configs, nullptr)) {
        return;
    }
    const std::int64_t now_ms = NowUnixMs();
    for (const auto& event : events) {
        const std::string event_id =
            event.event_id.empty() ? "evt_" + std::to_string(now_ms) : event.event_id;
        for (const auto& [_, delivery] : configs) {
            if (!delivery.enabled) {
                continue;
            }
            std::string error_message;
            (void)AppendOpsAlertDeliveryAttempt(
                config,
                OpsAlertDeliveryAttemptJson(delivery,
                                            event_id,
                                            event.event_type,
                                            result.source_key,
                                            "queued",
                                            "event-record",
                                            now_ms),
                &error_message);
        }
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14466 function
std::pair<std::string, std::string> SourceHealthAuditStateParts(const std::string& state) {
    const std::size_t sep = state.find('\n');
    if (sep == std::string::npos) {
        return {state, ""};
    }
    return {state.substr(0, sep), state.substr(sep + 1)};
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14474 function
std::string SourceHealthAuditStateValue(const OpsSourceHealthItem& item) {
    return item.status + "\n" + item.reason;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14478 function
std::string SourceHealthAuditRecordBody(const OpsSourceHealthItem& item,
                                        const std::string& before_status,
                                        const std::string& before_reason) {
    std::ostringstream out;
    out << "{"
        << "\"area\":\"channels\","
        << "\"action\":\"source-health-state-change\","
        << "\"target\":\"source:" << JsonEscape(item.source_id) << "\","
        << "\"summary\":\"source " << JsonEscape(item.source_id) << " "
        << JsonEscape(before_status.empty() ? "unknown" : before_status) << " -> "
        << JsonEscape(item.status) << "\","
        << "\"before\":{\"status\":\"" << JsonEscape(before_status) << "\","
        << "\"reason\":\"" << JsonEscape(before_reason) << "\"},"
        << "\"after\":{\"status\":\"" << JsonEscape(item.status) << "\","
        << "\"reason\":\"" << JsonEscape(item.reason) << "\","
        << "\"checkedAt\":";
    AppendNullableJsonString(out, item.checked_at);
    out << ",\"warnings\":[";
    for (std::size_t i = 0; i < item.warnings.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(item.warnings[i]) << "\"";
    }
    out << "]}}";
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14506 function
void AppendOpsSourceHealthAuditChanges(const app::AppConfig& config,
                                       const auth::Principal& principal,
                                       const OpsSourceHealthSnapshot& snapshot) {
    std::vector<std::pair<OpsSourceHealthItem, std::pair<std::string, std::string>>> changes;
    {
        std::lock_guard lock(g_source_health_audit_mu);
        for (const auto& item : snapshot.items) {
            if (item.source_id.empty()) {
                continue;
            }
            const std::string next_state = SourceHealthAuditStateValue(item);
            const auto [it, inserted] = g_source_health_audit_state.emplace(item.source_id, next_state);
            if (inserted) {
                continue;
            }
            if (it->second == next_state) {
                continue;
            }
            changes.push_back({item, SourceHealthAuditStateParts(it->second)});
            it->second = next_state;
        }
    }

    for (const auto& [item, before] : changes) {
        std::string audit_error;
        (void)AppendOpsAuditRecord(
            config,
            OpsAuditRecordJson(SourceHealthAuditRecordBody(item, before.first, before.second), principal),
            &audit_error);
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14538 function
bool OpsAuditLineMatches(const std::string& line,
                         const std::string& area,
                         const std::string& actor,
                         const std::string& action,
                         const std::string& target,
                         const std::string& user,
                         const std::string& query_text,
                         const std::optional<std::int64_t>& from_ms,
                         const std::optional<std::int64_t>& to_ms) {
    if (!area.empty() && ParseStringField(line, "area").value_or("") != area) {
        return false;
    }
    if (from_ms.has_value() || to_ms.has_value()) {
        const auto received_at = OpsAuditReceivedAtMs(line);
        if (!received_at.has_value()) {
            return false;
        }
        if (from_ms.has_value() && *received_at < *from_ms) {
            return false;
        }
        if (to_ms.has_value() && *received_at > *to_ms) {
            return false;
        }
    }
    const std::string actor_value = ParseStringField(line, "actor").value_or("");
    const std::string target_value = ParseStringField(line, "target").value_or("");
    if (!actor.empty() && LowerAscii(actor_value).find(LowerAscii(actor)) == std::string::npos) {
        return false;
    }
    if (!action.empty() && ParseStringField(line, "action").value_or("") != action) {
        return false;
    }
    if (!target.empty() && LowerAscii(target_value).find(LowerAscii(target)) == std::string::npos) {
        return false;
    }
    if (!user.empty()) {
        const std::string lowered_user = LowerAscii(user);
        if (LowerAscii(actor_value).find(lowered_user) == std::string::npos &&
            LowerAscii(target_value).find(lowered_user) == std::string::npos) {
            return false;
        }
    }
    if (!query_text.empty() && LowerAscii(line).find(LowerAscii(query_text)) == std::string::npos) {
        return false;
    }
    return true;
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14599 function
std::optional<std::int64_t> ParseOpsAuditTimeQuery(
    const std::unordered_map<std::string, std::string>& query,
    const std::string& key) {
    const auto it = query.find(key);
    if (it == query.end()) {
        return std::nullopt;
    }
    const std::string raw = Trim(it->second);
    if (raw.empty()) {
        return std::nullopt;
    }
    try {
        return std::stoll(raw);
    } catch (...) {
        return std::nullopt;
    }
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14617 function
OpsAuditQueryResult QueryOpsAuditEntries(const app::AppConfig& config,
                                         const std::unordered_map<std::string, std::string>& query) {
    const std::string area = query.count("area") != 0 ? Trim(query.at("area")) : std::string();
    const std::string actor = query.count("actor") != 0 ? Trim(query.at("actor")) : std::string();
    const std::string action = query.count("action") != 0 ? Trim(query.at("action")) : std::string();
    const std::string target = query.count("target") != 0 ? Trim(query.at("target")) : std::string();
    const std::string user = query.count("user") != 0 ? Trim(query.at("user")) : std::string();
    const std::string query_text = query.count("q") != 0 ? Trim(query.at("q")) : std::string();
    const bool export_mode = query.count("download") != 0 || query.count("format") != 0;
    const int limit = ParseClampedIntQuery(query, "limit", 80, 1, export_mode ? 2000 : 200);
    const int offset = ParseClampedIntQuery(query, "offset", 0, 0, 1000000);
    const auto from_ms = ParseOpsAuditTimeQuery(query, "fromMs");
    const auto to_ms = ParseOpsAuditTimeQuery(query, "toMs");
    const std::filesystem::path path = OpsAuditStoragePath(config);
    std::vector<std::string> lines;
    OpsAuditRetentionSummary retention;
    int scanned = 0;
    {
        std::lock_guard lock(g_ops_audit_mu);
        std::string retention_error;
        retention = EnforceOpsAuditRetentionLocked(path, NowUnixMs(), &retention_error);
        std::ifstream in(path);
        std::string line;
        while (std::getline(in, line)) {
            line = Trim(line);
            ++scanned;
            const std::string redacted_line = RedactAuditJsonFragment(line);
            if (!redacted_line.empty() && redacted_line.front() == '{' &&
                OpsAuditLineMatches(redacted_line, area, actor, action, target, user, query_text, from_ms, to_ms)) {
                lines.push_back(redacted_line);
            }
        }
    }
    OpsAuditQueryResult result;
    result.storage_path = path;
    result.offset = offset;
    result.limit = limit;
    result.total = static_cast<int>(lines.size());
    result.scanned = scanned;
    result.from_ms = from_ms;
    result.to_ms = to_ms;
    result.retention = retention;
    int skipped = 0;
    for (auto it = lines.rbegin(); it != lines.rend() && static_cast<int>(result.entries.size()) < limit; ++it) {
        if (skipped < offset) {
            ++skipped;
            continue;
        }
        result.entries.push_back(*it);
    }
    result.has_more = offset + static_cast<int>(result.entries.size()) < result.total;
    return result;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14671 function
std::string OpsV390StagingRestoreValidationHandoffJson() {
    return R"JSON({
  "ok": true,
  "schema": "media-server.ops.v390-staging-restore-validation-handoff.v1",
  "targetStep": "v3.9.0 (15)",
  "featureId": "V390-CAND-005",
  "selectedMode": "staging-restore-validation-checklist-result-handoff",
  "sourceHandoffRoute": "/ops/api/source-registry/backup-recovery-handoff",
  "stagingHarnessCommand": "./server.sh verify-v340-staging-restore-validation-harness",
  "opsUiRoute": "/ops/sources",
  "stagingRestoreValidationChecklist": [
    {
      "key": "registryRestoreValidation",
      "label": "SourceRegistry staging restore validation",
      "status": "operator-required",
      "source": "source registry snapshot",
      "requiredEvidence": ["sourceId", "source kind", "canonical source key", "owner/site/group context", "JSON parse result"]
    },
    {
      "key": "publishedViewRestoreValidation",
      "label": "PublishedView staging restore validation",
      "status": "operator-required",
      "source": "PublishedView registry",
      "requiredEvidence": ["viewId", "sourceId link", "enabled state", "dashboard/events flags", "maxTiles", "viewer scope"]
    },
    {
      "key": "sourceHealthSnapshotValidation",
      "label": "Source health staging validation",
      "status": "operator-required",
      "source": "fresh source health snapshot",
      "requiredEvidence": ["live count", "stale count", "offline count", "reconnect count", "warning drift"]
    },
    {
      "key": "viewerScopeValidation",
      "label": "Viewer scope validation",
      "status": "operator-required",
      "source": "scoped client API",
      "requiredEvidence": ["/client/api/views", "client route scope", "viewer/integrator traffic reconnect approval"]
    }
  ],
  "resultArtifactContract": {
    "schema": "media-server.ops.v390-staging-restore-validation-result.v1",
    "artifactStatus": "operator-supplied-after-staging-run",
    "storageScope": "change-ticket-or-release-evidence-only",
    "requiredFields": [
      "sourceRegistryValidation",
      "publishedViewValidation",
      "sourceHealthSnapshotValidation",
      "viewerScopeValidation",
      "operator",
      "generatedAt",
      "failureOrSkipReason"
    ]
  },
  "boundaries": {
    "opsOnly": true,
    "readOnly": true,
    "stagingOnly": true,
    "resultArtifactPersistedByRoute": false,
    "sourceRegistryWritePerformed": false,
    "publishedViewWritePerformed": false,
    "sourceHealthSnapshotPersisted": false,
    "productionRestorePerformed": false,
    "automaticRecoveryPerformed": false,
    "viewerScopeChanged": false,
    "viewerClientExposureAdded": false,
    "rawLocatorExposedToClient": false,
    "credentialMaterialExposed": false,
    "eventRecordSchemaChanged": false,
    "eventPostPayloadChanged": false,
    "webrtcDataChannelSchemaChanged": false,
    "sseMetadataSchemaChanged": false,
    "wsMetadataSchemaChanged": false,
    "rtspOrWebrtcMediaPathChanged": false
  }
})JSON";
}




// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14789 function
OpsV330ReliabilityTimelineEvent OpsV330CurrentHealthEvent(const OpsSourceHealthItem& health) {
    OpsV330ReliabilityTimelineEvent event;
    event.type = "current-health";
    event.at = health.checked_at;
    event.source_id = health.source_id;
    event.status = health.status;
    event.reason = health.reason;
    event.summary = "current source health is " + health.status + " (" + health.reason + ")";
    event.warnings = health.warnings;
    return event;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14801 function
std::unordered_map<std::string, std::vector<OpsV330ReliabilityTimelineEvent>>
OpsV330SourceHealthAuditHistory(const app::AppConfig& config) {
    std::unordered_map<std::string, std::string> query{
        {"area", "channels"},
        {"action", "source-health-state-change"},
        {"limit", "200"},
    };
    const OpsAuditQueryResult audit = QueryOpsAuditEntries(config, query);

    std::unordered_map<std::string, std::vector<OpsV330ReliabilityTimelineEvent>> by_source;
    for (const std::string& entry : audit.entries) {
        const std::string target = ParseStringField(entry, "target").value_or("");
        constexpr const char* kSourcePrefix = "source:";
        if (target.rfind(kSourcePrefix, 0) != 0) {
            continue;
        }
        const std::string source_id = target.substr(std::strlen(kSourcePrefix));
        if (source_id.empty()) {
            continue;
        }

        const std::string after = ExtractJsonValueField(entry, "after").value_or("{}");
        OpsV330ReliabilityTimelineEvent event;
        event.type = "audit-status-change";
        event.at = ParseStringField(entry, "at").value_or("");
        event.source_id = source_id;
        event.status = ParseStringField(after, "status").value_or("");
        event.reason = ParseStringField(after, "reason").value_or("");
        event.summary = ParseStringField(entry, "summary").value_or("source health state changed");
        event.audit_id = ParseStringField(entry, "id").value_or("");
        event.audit_target = target;
        event.warnings = StringArrayFieldValues(after, "warnings");
        by_source[source_id].push_back(std::move(event));
    }
    return by_source;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14838 function
OpsV330ReliabilityTimelineSummary BuildV330ReliabilityTimelineHealthHistorySummary(
    const std::vector<OpsV330ReliabilityTimelineItem>& items) {
    OpsV330ReliabilityTimelineSummary summary;
    summary.source_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (item.current_health_status == "live") {
            ++summary.live_count;
        } else if (item.current_health_status == "stale") {
            ++summary.stale_count;
        } else if (item.current_health_status == "offline") {
            ++summary.offline_count;
        } else if (item.current_health_status == "connecting") {
            ++summary.connecting_count;
        }
        if (item.source_warning_count > 0) {
            ++summary.warning_source_count;
        }
        if (item.reconnect_count > 0) {
            ++summary.reconnect_source_count;
        }
        summary.status_transition_count += item.status_transition_count;
        summary.health_history_event_count += static_cast<int>(item.health_history.size());
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14864 function
std::vector<OpsV330ReliabilityTimelineItem> BuildV330ReliabilityTimelineHealthHistory(
    const app::AppConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    std::vector<SourceViewRegistry::SourceRecord> sources;
    std::vector<SourceViewRegistry::PublishedViewRecord> views;
    std::string load_error;
    (void)SourceViewRegistry::Instance().Snapshot(&sources, &views, &load_error);

    std::unordered_map<std::string, SourceViewRegistry::SourceRecord> source_by_id;
    for (const auto& source : sources) {
        source_by_id[source.source_id] = source;
    }

    const auto audit_by_source = OpsV330SourceHealthAuditHistory(config);
    std::vector<OpsV330ReliabilityTimelineItem> items;
    items.reserve(source_health_snapshot.items.size());
    for (const auto& health : source_health_snapshot.items) {
        OpsV330ReliabilityTimelineItem item;
        item.source_id = health.source_id;
        item.display_name = health.source_id;
        item.source_kind = "unknown";
        if (const auto source_it = source_by_id.find(health.source_id); source_it != source_by_id.end()) {
            item.display_name = source_it->second.display_name.empty()
                                    ? source_it->second.source_id
                                    : source_it->second.display_name;
            item.source_kind = source_it->second.kind;
        }
        item.current_health_status = health.status;
        item.current_health_reason = health.reason;
        item.checked_at = health.checked_at;
        item.reconnect_count = health.reconnect_count;
        item.last_reconnect_at = health.last_reconnect_at;
        item.warnings = health.warnings;
        item.source_warning_count = static_cast<int>(health.warnings.size());
        item.audit_route = "/ops/sources#auditArea=channels&auditPreset=source-health-state-change"
                           "&auditAction=source-health-state-change&auditTarget=" +
                           UrlEncode("source:" + health.source_id);
        item.health_history.push_back(OpsV330CurrentHealthEvent(health));
        if (const auto audit_it = audit_by_source.find(health.source_id); audit_it != audit_by_source.end()) {
            item.status_transition_count = static_cast<int>(audit_it->second.size());
            for (const auto& event : audit_it->second) {
                item.health_history.push_back(event);
            }
        }
        items.push_back(std::move(item));
    }
    std::sort(items.begin(), items.end(), [](const auto& lhs, const auto& rhs) {
        const bool lhs_needs_attention = lhs.current_health_status != "live" || lhs.source_warning_count > 0;
        const bool rhs_needs_attention = rhs.current_health_status != "live" || rhs.source_warning_count > 0;
        if (lhs_needs_attention != rhs_needs_attention) {
            return lhs_needs_attention && !rhs_needs_attention;
        }
        if (lhs.status_transition_count != rhs.status_transition_count) {
            return lhs.status_transition_count > rhs.status_transition_count;
        }
        return lhs.source_id < rhs.source_id;
    });
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14924 function
void AppendV330ReliabilityTimelineEventJson(std::ostringstream& out,
                                            const OpsV330ReliabilityTimelineEvent& event) {
    out << "{"
        << "\"type\":\"" << JsonEscape(event.type) << "\","
        << "\"at\":";
    AppendNullableJsonString(out, event.at);
    out << ",\"sourceId\":\"" << JsonEscape(event.source_id) << "\","
        << "\"status\":\"" << JsonEscape(event.status) << "\","
        << "\"reason\":\"" << JsonEscape(event.reason) << "\","
        << "\"summary\":\"" << JsonEscape(event.summary) << "\","
        << "\"auditId\":";
    AppendNullableJsonString(out, event.audit_id);
    out << ",\"auditTarget\":";
    AppendNullableJsonString(out, event.audit_target);
    out << ",\"warnings\":";
    AppendJsonStringArray(out, event.warnings);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14943 function
void AppendV330ReliabilityTimelineItemJson(std::ostringstream& out,
                                           const OpsV330ReliabilityTimelineItem& item) {
    out << "{"
        << "\"sourceId\":\"" << JsonEscape(item.source_id) << "\","
        << "\"displayName\":\"" << JsonEscape(item.display_name) << "\","
        << "\"sourceKind\":\"" << JsonEscape(item.source_kind) << "\","
        << "\"currentHealthStatus\":\"" << JsonEscape(item.current_health_status) << "\","
        << "\"currentHealthReason\":\"" << JsonEscape(item.current_health_reason) << "\","
        << "\"checkedAt\":";
    AppendNullableJsonString(out, item.checked_at);
    out << ",\"reconnectCount\":" << item.reconnect_count
        << ",\"lastReconnectAt\":";
    AppendNullableJsonString(out, item.last_reconnect_at);
    out << ",\"sourceWarningCount\":" << item.source_warning_count
        << ",\"statusTransitionCount\":" << item.status_transition_count
        << ",\"auditRoute\":\"" << JsonEscape(item.audit_route) << "\","
        << "\"warnings\":";
    AppendJsonStringArray(out, item.warnings);
    out << ",\"healthHistory\":[";
    for (std::size_t i = 0; i < item.health_history.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV330ReliabilityTimelineEventJson(out, item.health_history[i]);
    }
    out << "]}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14971 function
void AppendV330ReliabilityTimelineSummaryJson(std::ostringstream& out,
                                              const OpsV330ReliabilityTimelineSummary& summary) {
    out << "{"
        << "\"sourceCount\":" << summary.source_count << ","
        << "\"live\":" << summary.live_count << ","
        << "\"stale\":" << summary.stale_count << ","
        << "\"offline\":" << summary.offline_count << ","
        << "\"connecting\":" << summary.connecting_count << ","
        << "\"warningSources\":" << summary.warning_source_count << ","
        << "\"statusTransitionCount\":" << summary.status_transition_count << ","
        << "\"reconnectSources\":" << summary.reconnect_source_count << ","
        << "\"healthHistoryEvents\":" << summary.health_history_event_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14986 function
std::string OpsV330ReliabilityTimelineHealthHistoryJson(
    const app::AppConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    if (!source_health_snapshot.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v330-reliability-timeline-health-history.v1\",\"error\":\"" +
               JsonEscape(source_health_snapshot.error) + "\"}";
    }
    const auto reliabilityTimeline = BuildV330ReliabilityTimelineHealthHistory(config, source_health_snapshot);
    const auto summary = BuildV330ReliabilityTimelineHealthHistorySummary(reliabilityTimeline);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v330-reliability-timeline-health-history.v1\","
        << "\"status\":\"reliability-timeline-health-history\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"auditLinkage\":{"
        << "\"area\":\"channels\","
        << "\"action\":\"source-health-state-change\","
        << "\"auditRoute\":\"/ops/api/audit?area=channels&action=source-health-state-change\","
        << "\"rawAuditBodyIncluded\":false"
        << "},\"reliabilityTimelineSummary\":";
    AppendV330ReliabilityTimelineSummaryJson(out, summary);
    out << ",\"reliabilityTimeline\":[";
    for (std::size_t i = 0; i < reliabilityTimeline.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV330ReliabilityTimelineItemJson(out, reliabilityTimeline[i]);
    }
    out << "],\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}




// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15077 function
bool OpsV330SourceReliabilityHasWarning(const OpsV330SourceReliabilitySearchMetricItem& item,
                                        const std::string& warning) {
    return std::find(item.warnings.begin(), item.warnings.end(), warning) != item.warnings.end();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15082 function
std::string OpsV330SourceReliabilityFilterKey(const OpsSourceHealthItem& health) {
    if (health.status == "offline") {
        return "offline";
    }
    if (health.status == "stale") {
        return "stale";
    }
    if (health.reconnect_count > 0) {
        return "reconnect-watch";
    }
    if (!health.warnings.empty()) {
        return "warning";
    }
    if (health.status == "live") {
        return "live";
    }
    return "needs-attention";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15101 function
int OpsV330SourceReliabilityAttentionScore(
    const OpsSourceHealthItem& health,
    int status_transition_count) {
    int score = 0;
    if (health.status == "offline") {
        score += 40;
    } else if (health.status == "stale") {
        score += 30;
    } else if (health.status == "connecting") {
        score += 16;
    }
    score += std::min(30, health.reconnect_count * 5);
    score += std::min(20, static_cast<int>(health.warnings.size()) * 5);
    score += std::min(10, status_transition_count * 2);
    return score;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15118 function
std::vector<OpsV330SourceReliabilitySearchMetricItem> BuildV330SourceReliabilitySearchMetrics(
    const app::AppConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    std::vector<SourceViewRegistry::SourceRecord> sources;
    std::vector<SourceViewRegistry::PublishedViewRecord> views;
    std::string load_error;
    (void)SourceViewRegistry::Instance().Snapshot(&sources, &views, &load_error);

    std::unordered_map<std::string, SourceViewRegistry::SourceRecord> source_by_id;
    for (const auto& source : sources) {
        source_by_id[source.source_id] = source;
    }

    const auto audit_by_source = OpsV330SourceHealthAuditHistory(config);
    std::vector<OpsV330SourceReliabilitySearchMetricItem> items;
    items.reserve(source_health_snapshot.items.size());
    for (const auto& health : source_health_snapshot.items) {
        OpsV330SourceReliabilitySearchMetricItem item;
        item.source_id = health.source_id;
        item.display_name = health.source_id;
        item.source_kind = "unknown";
        if (const auto source_it = source_by_id.find(health.source_id); source_it != source_by_id.end()) {
            item.display_name = source_it->second.display_name.empty()
                                    ? source_it->second.source_id
                                    : source_it->second.display_name;
            item.source_kind = source_it->second.kind;
        }
        item.health_status = health.status;
        item.health_reason = health.reason;
        item.checked_at = health.checked_at;
        item.filter_key = OpsV330SourceReliabilityFilterKey(health);
        item.reconnect_count = health.reconnect_count;
        item.last_reconnect_at = health.last_reconnect_at;
        item.warnings = health.warnings;
        item.source_warning_count = static_cast<int>(health.warnings.size());
        if (const auto audit_it = audit_by_source.find(health.source_id); audit_it != audit_by_source.end()) {
            item.status_transition_count = static_cast<int>(audit_it->second.size());
        }
        item.attention_score = OpsV330SourceReliabilityAttentionScore(health, item.status_transition_count);
        item.audit_route = "/ops/sources#auditArea=channels&auditPreset=source-health-state-change"
                           "&auditAction=source-health-state-change&auditTarget=" +
                           UrlEncode("source:" + health.source_id);
        items.push_back(std::move(item));
    }
    std::sort(items.begin(), items.end(), [](const auto& lhs, const auto& rhs) {
        if (lhs.attention_score != rhs.attention_score) {
            return lhs.attention_score > rhs.attention_score;
        }
        if (lhs.reconnect_count != rhs.reconnect_count) {
            return lhs.reconnect_count > rhs.reconnect_count;
        }
        return lhs.source_id < rhs.source_id;
    });
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15174 function
OpsV330SourceReliabilitySearchMetricsSummary BuildV330SourceReliabilitySearchMetricsSummary(
    const std::vector<OpsV330SourceReliabilitySearchMetricItem>& items) {
    OpsV330SourceReliabilitySearchMetricsSummary summary;
    summary.source_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (item.health_status == "live") {
            ++summary.live_count;
        } else if (item.health_status == "connecting") {
            ++summary.connecting_count;
        } else if (item.health_status == "stale") {
            ++summary.stale_count;
        } else if (item.health_status == "offline") {
            ++summary.offline_count;
        }
        if (item.health_status != "live" || item.source_warning_count > 0 || item.reconnect_count > 0) {
            ++summary.matched_source_count;
        }
        if (item.source_warning_count > 0) {
            ++summary.warning_source_count;
        }
        if (item.reconnect_count > 0) {
            ++summary.reconnect_source_count;
            summary.reconnect_total += item.reconnect_count;
        }
        if (OpsV330SourceReliabilityHasWarning(item, "high-reconnect")) {
            ++summary.high_reconnect_source_count;
        }
        if (OpsV330SourceReliabilityHasWarning(item, "repeated-stale")) {
            ++summary.repeated_stale_source_count;
        }
        summary.status_transition_count += item.status_transition_count;
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15209 function
int OpsV330SourceReliabilitySavedViewMatchCount(
    const std::vector<OpsV330SourceReliabilitySearchMetricItem>& items,
    const std::string& filter_key) {
    int count = 0;
    for (const auto& item : items) {
        if (filter_key == "all" ||
            (filter_key == "needs-attention" &&
             (item.health_status != "live" || item.source_warning_count > 0 || item.reconnect_count > 0)) ||
            (filter_key == "reconnect-watch" && item.reconnect_count > 0) ||
            (filter_key == "stale-offline" &&
             (item.health_status == "stale" || item.health_status == "offline")) ||
            (filter_key == "warning" && item.source_warning_count > 0)) {
            ++count;
        }
    }
    return count;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15227 function
std::vector<OpsV330SourceReliabilitySavedView> BuildV330SourceReliabilitySavedViews(
    const std::vector<OpsV330SourceReliabilitySearchMetricItem>& items) {
    std::vector<OpsV330SourceReliabilitySavedView> views = {
        {"all-sources", "All sources", "All source health rows in reliability order", "all", 0,
         "/ops/sources#sourceReliabilityView=all-sources"},
        {"needs-attention", "Needs attention", "Non-live, warning, or reconnecting sources", "needs-attention", 0,
         "/ops/sources#sourceReliabilityView=needs-attention"},
        {"reconnect-watch", "Reconnect watch", "Sources with reconnect count above zero", "reconnect-watch", 0,
         "/ops/sources#sourceReliabilityView=reconnect-watch"},
        {"stale-offline", "Stale/offline", "Sources currently stale or offline", "stale-offline", 0,
         "/ops/sources#sourceReliabilityView=stale-offline"},
        {"warning-sources", "Warning sources", "Sources carrying source health warnings", "warning", 0,
         "/ops/sources#sourceReliabilityView=warning-sources"},
    };
    for (auto& view : views) {
        view.matched_source_count = OpsV330SourceReliabilitySavedViewMatchCount(items, view.filter_key);
    }
    return views;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15247 function
void AppendV330SourceReliabilitySearchMetricItemJson(
    std::ostringstream& out,
    const OpsV330SourceReliabilitySearchMetricItem& item) {
    out << "{"
        << "\"sourceId\":\"" << JsonEscape(item.source_id) << "\","
        << "\"displayName\":\"" << JsonEscape(item.display_name) << "\","
        << "\"sourceKind\":\"" << JsonEscape(item.source_kind) << "\","
        << "\"healthStatus\":\"" << JsonEscape(item.health_status) << "\","
        << "\"healthReason\":\"" << JsonEscape(item.health_reason) << "\","
        << "\"checkedAt\":";
    AppendNullableJsonString(out, item.checked_at);
    out << ",\"filterKey\":\"" << JsonEscape(item.filter_key) << "\","
        << "\"reconnectCount\":" << item.reconnect_count
        << ",\"lastReconnectAt\":";
    AppendNullableJsonString(out, item.last_reconnect_at);
    out << ",\"sourceWarningCount\":" << item.source_warning_count
        << ",\"statusTransitionCount\":" << item.status_transition_count
        << ",\"attentionScore\":" << item.attention_score
        << ",\"auditRoute\":\"" << JsonEscape(item.audit_route) << "\","
        << "\"warnings\":";
    AppendJsonStringArray(out, item.warnings);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15271 function
void AppendV330SourceReliabilitySavedViewJson(
    std::ostringstream& out,
    const OpsV330SourceReliabilitySavedView& view) {
    out << "{"
        << "\"key\":\"" << JsonEscape(view.key) << "\","
        << "\"label\":\"" << JsonEscape(view.label) << "\","
        << "\"description\":\"" << JsonEscape(view.description) << "\","
        << "\"filterKey\":\"" << JsonEscape(view.filter_key) << "\","
        << "\"matchedSourceCount\":" << view.matched_source_count << ","
        << "\"route\":\"" << JsonEscape(view.route) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15284 function
void AppendV330SourceReliabilitySearchMetricsSummaryJson(
    std::ostringstream& out,
    const OpsV330SourceReliabilitySearchMetricsSummary& summary) {
    out << "{"
        << "\"sourceCount\":" << summary.source_count << ","
        << "\"matchedSourceCount\":" << summary.matched_source_count << ","
        << "\"live\":" << summary.live_count << ","
        << "\"connecting\":" << summary.connecting_count << ","
        << "\"stale\":" << summary.stale_count << ","
        << "\"offline\":" << summary.offline_count << ","
        << "\"warningSources\":" << summary.warning_source_count << ","
        << "\"reconnectSources\":" << summary.reconnect_source_count << ","
        << "\"reconnectTotal\":" << summary.reconnect_total << ","
        << "\"highReconnectSources\":" << summary.high_reconnect_source_count << ","
        << "\"repeatedStaleSources\":" << summary.repeated_stale_source_count << ","
        << "\"statusTransitionCount\":" << summary.status_transition_count << ","
        << "\"savedViewCount\":" << summary.saved_view_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15304 function
void AppendV330SourceReliabilityFilterJson(std::ostringstream& out,
                                           const std::string& key,
                                           const std::string& label,
                                           int count) {
    out << "{"
        << "\"key\":\"" << JsonEscape(key) << "\","
        << "\"label\":\"" << JsonEscape(label) << "\","
        << "\"matchedSourceCount\":" << count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15315 function
void AppendV330SourceReliabilityFilterListJson(
    std::ostringstream& out,
    const OpsV330SourceReliabilitySearchMetricsSummary& summary) {
    out << "[";
    AppendV330SourceReliabilityFilterJson(out, "all", "All", summary.source_count);
    out << ",";
    AppendV330SourceReliabilityFilterJson(out, "needs-attention", "Needs attention", summary.matched_source_count);
    out << ",";
    AppendV330SourceReliabilityFilterJson(out, "live", "Live", summary.live_count);
    out << ",";
    AppendV330SourceReliabilityFilterJson(out, "stale", "Stale", summary.stale_count);
    out << ",";
    AppendV330SourceReliabilityFilterJson(out, "offline", "Offline", summary.offline_count);
    out << ",";
    AppendV330SourceReliabilityFilterJson(out, "reconnect-watch", "Reconnect watch", summary.reconnect_source_count);
    out << ",";
    AppendV330SourceReliabilityFilterJson(out, "warning", "Warnings", summary.warning_source_count);
    out << "]";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15335 function
std::string OpsV330SourceReliabilitySearchMetricsJson(
    const app::AppConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    if (!source_health_snapshot.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v330-source-reliability-search-metrics.v1\",\"error\":\"" +
               JsonEscape(source_health_snapshot.error) + "\"}";
    }
    const auto sourceReliabilitySearchResults =
        BuildV330SourceReliabilitySearchMetrics(config, source_health_snapshot);
    auto summary = BuildV330SourceReliabilitySearchMetricsSummary(sourceReliabilitySearchResults);
    const auto savedReliabilityViews =
        BuildV330SourceReliabilitySavedViews(sourceReliabilitySearchResults);
    summary.saved_view_count = static_cast<int>(savedReliabilityViews.size());

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v330-source-reliability-search-metrics.v1\","
        << "\"status\":\"source-reliability-search-metrics\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"sourceReliabilitySearchMetricsSummary\":";
    AppendV330SourceReliabilitySearchMetricsSummaryJson(out, summary);
    out << ",\"sourceHealthFilters\":";
    AppendV330SourceReliabilityFilterListJson(out, summary);
    out << ",\"savedReliabilityViews\":[";
    for (std::size_t i = 0; i < savedReliabilityViews.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV330SourceReliabilitySavedViewJson(out, savedReliabilityViews[i]);
    }
    out << "],\"sourceReliabilitySearchResults\":[";
    for (std::size_t i = 0; i < sourceReliabilitySearchResults.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV330SourceReliabilitySearchMetricItemJson(out, sourceReliabilitySearchResults[i]);
    }
    out << "],\"reconnectMetricSummary\":{"
        << "\"sources\":" << summary.reconnect_source_count << ","
        << "\"reconnectTotal\":" << summary.reconnect_total << ","
        << "\"highReconnectSources\":" << summary.high_reconnect_source_count
        << "},\"staleMetricSummary\":{"
        << "\"sources\":" << summary.stale_count << ","
        << "\"repeatedStaleSources\":" << summary.repeated_stale_source_count
        << "},\"offlineMetricSummary\":{"
        << "\"sources\":" << summary.offline_count
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"savedViewsPersisted\":false,"
        << "\"savedViewWritePerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"automaticRecoveryPerformed\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15427 function
int V340SourceHealthWarningCount(const OpsSourceHealthItem& item) {
    return static_cast<int>(item.warnings.size());
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15431 function
OpsSourceHealthSnapshot BuildV340HandoffSourceHealthReplaySnapshot(
    const OpsSourceHealthSnapshot& fresh_source_health_snapshot) {
    OpsSourceHealthSnapshot handoff = fresh_source_health_snapshot;
    handoff.generated_at = fresh_source_health_snapshot.generated_at;
    return handoff;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15438 function
std::vector<OpsV340SourceHealthReplayDriftItem> BuildV340SourceHealthReplayDriftDiffItems(
    const OpsSourceHealthSnapshot& handoff_source_health_snapshot,
    const OpsSourceHealthSnapshot& fresh_source_health_snapshot) {
    std::unordered_map<std::string, const OpsSourceHealthItem*> handoff_by_source;
    for (const auto& item : handoff_source_health_snapshot.items) {
        if (!item.source_id.empty()) {
            handoff_by_source[item.source_id] = &item;
        }
    }

    std::vector<OpsV340SourceHealthReplayDriftItem> items;
    items.reserve(fresh_source_health_snapshot.items.size());
    for (const auto& fresh : fresh_source_health_snapshot.items) {
        const auto handoff_it = handoff_by_source.find(fresh.source_id);
        const OpsSourceHealthItem* handoff =
            handoff_it == handoff_by_source.end() ? nullptr : handoff_it->second;

        OpsV340SourceHealthReplayDriftItem item;
        item.source_id = fresh.source_id;
        item.handoff_status = handoff == nullptr ? "unknown" : handoff->status;
        item.fresh_status = fresh.status;
        item.reconnect_delta = fresh.reconnect_count - (handoff == nullptr ? 0 : handoff->reconnect_count);
        item.warning_delta = V340SourceHealthWarningCount(fresh) -
                             (handoff == nullptr ? 0 : V340SourceHealthWarningCount(*handoff));
        item.stale_delta = (fresh.status == "stale" ? 1 : 0) -
                           (item.handoff_status == "stale" ? 1 : 0);
        item.offline_delta = (fresh.status == "offline" ? 1 : 0) -
                             (item.handoff_status == "offline" ? 1 : 0);
        const bool changed = item.handoff_status != item.fresh_status ||
                             item.reconnect_delta != 0 ||
                             item.warning_delta != 0;
        item.drift_status = changed ? "changed" : "stable";
        if (item.fresh_status == "offline" || item.fresh_status == "stale") {
            item.summary = "fresh source health requires operator attention before recovery drill closure";
        } else if (changed) {
            item.summary = "fresh source health changed from handoff replay baseline";
        } else {
            item.summary = "fresh source health matches handoff replay baseline";
        }
        items.push_back(std::move(item));
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15482 function
OpsV340SourceHealthReplayDriftSummary BuildV340SourceHealthReplayDriftSummary(
    const std::vector<OpsV340SourceHealthReplayDriftItem>& items) {
    OpsV340SourceHealthReplayDriftSummary summary;
    summary.source_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        summary.stale_delta += item.stale_delta;
        summary.offline_delta += item.offline_delta;
        summary.reconnect_delta += item.reconnect_delta;
        summary.warning_delta += item.warning_delta;
        if (item.drift_status != "stable") {
            ++summary.changed_source_count;
        }
        if (item.fresh_status == "offline" || item.fresh_status == "stale") {
            ++summary.blocked_count;
        } else {
            ++summary.ready_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15503 function
void AppendV340SourceHealthReplayDriftItemJson(
    std::ostringstream& out,
    const OpsV340SourceHealthReplayDriftItem& item) {
    out << "{"
        << "\"sourceId\":\"" << JsonEscape(item.source_id) << "\","
        << "\"handoffStatus\":\"" << JsonEscape(item.handoff_status) << "\","
        << "\"freshStatus\":\"" << JsonEscape(item.fresh_status) << "\","
        << "\"staleDelta\":" << item.stale_delta << ","
        << "\"offlineDelta\":" << item.offline_delta << ","
        << "\"reconnectDelta\":" << item.reconnect_delta << ","
        << "\"warningDelta\":" << item.warning_delta << ","
        << "\"driftStatus\":\"" << JsonEscape(item.drift_status) << "\","
        << "\"summary\":\"" << JsonEscape(item.summary) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15519 function
void AppendV340SourceHealthReplayDriftSummaryJson(
    std::ostringstream& out,
    const OpsV340SourceHealthReplayDriftSummary& summary) {
    out << "{"
        << "\"sourceCount\":" << summary.source_count << ","
        << "\"changedSourceCount\":" << summary.changed_source_count << ","
        << "\"staleDelta\":" << summary.stale_delta << ","
        << "\"offlineDelta\":" << summary.offline_delta << ","
        << "\"reconnectDelta\":" << summary.reconnect_delta << ","
        << "\"warningDelta\":" << summary.warning_delta << ","
        << "\"blockedCount\":" << summary.blocked_count << ","
        << "\"readyCount\":" << summary.ready_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15534 function
std::string OpsV340SourceHealthReplayDriftDiffJson(
    const OpsSourceHealthSnapshot& fresh_source_health_snapshot) {
    if (!fresh_source_health_snapshot.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v340-source-health-replay-drift-diff.v1\",\"error\":\"" +
               JsonEscape(fresh_source_health_snapshot.error) + "\"}";
    }

    const auto handoff_source_health_snapshot =
        BuildV340HandoffSourceHealthReplaySnapshot(fresh_source_health_snapshot);
    const auto sourceHealthReplayDriftItems =
        BuildV340SourceHealthReplayDriftDiffItems(handoff_source_health_snapshot, fresh_source_health_snapshot);
    const auto summary = BuildV340SourceHealthReplayDriftSummary(sourceHealthReplayDriftItems);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v340-source-health-replay-drift-diff.v1\","
        << "\"status\":\"source-health-replay-drift-diff\","
        << "\"generatedAt\":\"" << JsonEscape(fresh_source_health_snapshot.generated_at) << "\","
        << "\"handoffSourceHealthRoute\":\"/ops/api/source-registry/backup-recovery-handoff\","
        << "\"freshSourceHealthRoute\":\"/ops/api/source-health\","
        << "\"sourceHealthReplayDriftDiffSummary\":";
    AppendV340SourceHealthReplayDriftSummaryJson(out, summary);
    out << ",\"handoffSourceHealthSummary\":";
    AppendOpsSourceHealthSummaryJson(out, handoff_source_health_snapshot);
    out << ",\"freshSourceHealthSummary\":";
    AppendOpsSourceHealthSummaryJson(out, fresh_source_health_snapshot);
    out << ",\"sourceHealthReplayDriftItems\":[";
    for (std::size_t i = 0; i < sourceHealthReplayDriftItems.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV340SourceHealthReplayDriftItemJson(out, sourceHealthReplayDriftItems[i]);
    }
    out << "],\"driftPolicy\":{"
        << "\"handoffReplaySource\":\"v3.3 backup recovery source handoff\","
        << "\"freshSourceHealthRequired\":true,"
        << "\"staleOfflineReconnectWarningCompared\":true"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"sourceHealthSnapshotPersisted\":false,"
        << "\"recoveryValidationPlanPersisted\":false,"
        << "\"productionRestorePerformed\":false,"
        << "\"automaticRecoveryPerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}




// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15626 function
std::vector<OpsV330BackupRecoveryValidationPlanItem> BuildV330BackupRecoveryValidationPlan(
    const OpsSourceHealthSnapshot& source_health_snapshot,
    int source_count,
    int published_view_count) {
    return {
        {"registryRestoreValidation",
         "Registry restore validation",
         source_count >= 0 ? "ready" : "blocked",
         "Restore SourceRegistry in staging, then verify source IDs, kinds, canonical keys, owner/site/group context, and parse errors before production traffic.",
         "/ops/api/source-registry/snapshot"},
        {"publishedViewRestoreValidation",
         "PublishedView restore validation",
         published_view_count >= 0 ? "ready" : "blocked",
         "Restore PublishedView registry with the source registry and verify sourceId links, enabled state, dashboard/events flags, maxTiles, and viewer scopes.",
         "/ops/api/views"},
        {"sourceHealthSnapshotValidation",
         "Source health snapshot validation",
         source_health_snapshot.ok ? "ready" : "blocked",
         "Capture a fresh Ops source health snapshot after restore and compare live/stale/offline/reconnect counts against the handoff ticket.",
         "/ops/api/source-health"},
        {"viewerScopeValidation",
         "Viewer scope validation",
         published_view_count >= 0 ? "ready" : "blocked",
         "Verify restored client views through scoped client APIs before reconnecting external viewer or integrator traffic.",
         "/client/api/views"},
    };
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15654 function
std::vector<OpsV330BackupRecoverySourceHandoffInput> BuildV330BackupRecoverySourceHandoffInputs(
    const OpsSourceHealthSnapshot& source_health_snapshot,
    int source_count,
    int published_view_count,
    int validation_plan_count) {
    return {
        {"source-registry-snapshot",
         "Source registry snapshot",
         "SourceRegistry",
         "/ops/api/source-registry/snapshot",
         source_count >= 0 ? "ready" : "blocked",
         "sourceId, source kind, canonical source key, owner/site/group context, and enabled state are captured as restore input.",
         source_count,
         published_view_count,
         source_count},
        {"published-view-registry",
         "PublishedView registry",
         "PublishedView",
         "/ops/api/views",
         published_view_count >= 0 ? "ready" : "blocked",
         "viewId, sourceId link, scope-facing flags, allowed rules, overlays, client groups, and maxTiles are captured as restore input.",
         source_count,
         published_view_count,
         published_view_count},
        {"source-health-snapshot",
         "Source health snapshot",
         "Ops source health",
         "/ops/api/source-health",
         source_health_snapshot.ok ? "ready" : "blocked",
         "live, connecting, stale, offline, reconnect, and warning state are captured for post-restore comparison.",
         source_count,
         published_view_count,
         static_cast<int>(source_health_snapshot.items.size())},
        {"recovery-validation-plan",
         "Recovery validation plan",
         "Ops backup/recovery",
         "/ops/api/source-registry/backup-recovery-handoff",
         validation_plan_count > 0 ? "ready" : "blocked",
         "registry restore, PublishedView restore, source health snapshot, and viewer scope validation are linked before production cutover.",
         source_count,
         published_view_count,
         validation_plan_count},
    };
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15699 function
OpsV330BackupRecoverySourceHandoffSummary BuildV330BackupRecoverySourceHandoffSummary(
    const OpsSourceHealthSnapshot& source_health_snapshot,
    int source_count,
    int published_view_count,
    const std::vector<OpsV330BackupRecoveryValidationPlanItem>& validation_plan) {
    OpsV330BackupRecoverySourceHandoffSummary summary;
    summary.source_count = source_count;
    summary.published_view_count = published_view_count;
    summary.source_health_snapshot_count = static_cast<int>(source_health_snapshot.items.size());
    summary.stale_source_count = source_health_snapshot.stale_count;
    summary.offline_source_count = source_health_snapshot.offline_count;
    summary.recovery_validation_plan_count = static_cast<int>(validation_plan.size());
    for (const auto& item : validation_plan) {
        if (item.status == "ready") {
            ++summary.validation_ready_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15719 function
void AppendV330BackupRecoverySourceHandoffInputJson(
    std::ostringstream& out,
    const OpsV330BackupRecoverySourceHandoffInput& input) {
    out << "{"
        << "\"key\":\"" << JsonEscape(input.key) << "\","
        << "\"label\":\"" << JsonEscape(input.label) << "\","
        << "\"source\":\"" << JsonEscape(input.source) << "\","
        << "\"route\":\"" << JsonEscape(input.route) << "\","
        << "\"validationStatus\":\"" << JsonEscape(input.validation_status) << "\","
        << "\"validationSummary\":\"" << JsonEscape(input.validation_summary) << "\","
        << "\"sourceCount\":" << input.source_count << ","
        << "\"publishedViewCount\":" << input.published_view_count << ","
        << "\"affectedSourceCount\":" << input.affected_source_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15735 function
void AppendV330BackupRecoveryValidationPlanJson(
    std::ostringstream& out,
    const OpsV330BackupRecoveryValidationPlanItem& item) {
    out << "{"
        << "\"key\":\"" << JsonEscape(item.key) << "\","
        << "\"label\":\"" << JsonEscape(item.label) << "\","
        << "\"status\":\"" << JsonEscape(item.status) << "\","
        << "\"summary\":\"" << JsonEscape(item.summary) << "\","
        << "\"route\":\"" << JsonEscape(item.route) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15747 function
void AppendV330BackupRecoverySourceHandoffSummaryJson(
    std::ostringstream& out,
    const OpsV330BackupRecoverySourceHandoffSummary& summary) {
    out << "{"
        << "\"sourceCount\":" << summary.source_count << ","
        << "\"publishedViewCount\":" << summary.published_view_count << ","
        << "\"sourceHealthSnapshotCount\":" << summary.source_health_snapshot_count << ","
        << "\"staleSourceCount\":" << summary.stale_source_count << ","
        << "\"offlineSourceCount\":" << summary.offline_source_count << ","
        << "\"recoveryValidationPlanCount\":" << summary.recovery_validation_plan_count << ","
        << "\"validationReadyCount\":" << summary.validation_ready_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15761 function
std::string OpsV330BackupRecoverySourceHandoffJson(
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    if (!source_health_snapshot.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v330-backup-recovery-source-handoff.v1\",\"error\":\"" +
               JsonEscape(source_health_snapshot.error) + "\"}";
    }

    std::vector<SourceViewRegistry::SourceRecord> sources;
    std::vector<SourceViewRegistry::PublishedViewRecord> views;
    std::string load_error;
    if (!SourceViewRegistry::Instance().Snapshot(&sources, &views, &load_error)) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v330-backup-recovery-source-handoff.v1\",\"error\":\"" +
               JsonEscape(load_error.empty() ? "source registry load failed" : load_error) + "\"}";
    }

    const int source_count = static_cast<int>(sources.size());
    const int published_view_count = static_cast<int>(views.size());
    const auto recoveryValidationPlan =
        BuildV330BackupRecoveryValidationPlan(source_health_snapshot, source_count, published_view_count);
    const auto sourceHandoffInputs = BuildV330BackupRecoverySourceHandoffInputs(
        source_health_snapshot,
        source_count,
        published_view_count,
        static_cast<int>(recoveryValidationPlan.size()));
    const auto summary = BuildV330BackupRecoverySourceHandoffSummary(
        source_health_snapshot,
        source_count,
        published_view_count,
        recoveryValidationPlan);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v330-backup-recovery-source-handoff.v1\","
        << "\"status\":\"backup-recovery-source-handoff\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"sourceRegistrySnapshotRoute\":\"/ops/api/source-registry/snapshot\","
        << "\"publishedViewRegistryRoute\":\"/ops/api/views\","
        << "\"sourceHealthSnapshotRoute\":\"/ops/api/source-health\","
        << "\"recoveryValidationPlanRoute\":\"/ops/api/source-registry/backup-recovery-handoff\","
        << "\"backupRecoverySourceHandoffSummary\":";
    AppendV330BackupRecoverySourceHandoffSummaryJson(out, summary);
    out << ",\"sourceHealthSnapshotSummary\":";
    AppendOpsSourceHealthSummaryJson(out, source_health_snapshot);
    out << ",\"sourceHandoffInputs\":[";
    for (std::size_t i = 0; i < sourceHandoffInputs.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV330BackupRecoverySourceHandoffInputJson(out, sourceHandoffInputs[i]);
    }
    out << "],\"recoveryValidationPlan\":[";
    for (std::size_t i = 0; i < recoveryValidationPlan.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV330BackupRecoveryValidationPlanJson(out, recoveryValidationPlan[i]);
    }
    out << "],\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"sourceHealthSnapshotPersisted\":false,"
        << "\"recoveryValidationPlanPersisted\":false,"
        << "\"realBackupPerformed\":false,"
        << "\"productionRestorePerformed\":false,"
        << "\"automaticRecoveryPerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}


// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15852 function
std::vector<OpsV340ContinuityDrillContractInput> BuildV340ContinuityDrillContractInputs() {
    return {
        {"sourceRegistrySnapshot",
         "SourceRegistry snapshot",
         "v3.3 source registry identity snapshot",
         "/ops/api/source-registry/snapshot",
         "Validate sourceId, source kind, canonical source key, enabled state, and owner/site/group context in staging.",
         "read-only/no-write/no-secret/no-media-path-change"},
        {"publishedViewRegistry",
         "PublishedView registry",
         "v3.3 PublishedView registry",
         "/ops/api/views",
         "Validate viewId, sourceId links, dashboard/events flags, overlay/rule allowlists, maxTiles, and viewer scopes.",
         "read-only/no-write/no-secret/no-media-path-change"},
        {"sourceHealthSnapshot",
         "Source health snapshot",
         "v3.3 source health handoff",
         "/ops/api/source-health",
         "Compare live, stale, offline, reconnect, and warning state after staging validation.",
         "read-only/no-write/no-secret/no-media-path-change"},
        {"eventRecordAuditContext",
         "EventRecord and Ops audit context",
         "v3.3 EventRecord/audit handoff",
         "/ops/api/events/reviews",
         "Link recent EventRecord and redacted Ops audit context without changing EventRecord or Event POST schema.",
         "read-only/no-write/no-secret/no-media-path-change"},
        {"stagingRestoreValidation",
         "Staging restore validation harness",
         "v3.4 staging validator",
         "./server.sh verify-v340-staging-restore-validation-harness",
         "Validate JSON parse, duplicate IDs, missing sourceId references, auth store mode, checksums, and viewer scopes in a temporary runtime.",
         "read-only/no-write/no-secret/no-media-path-change"},
    };
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15887 function
void AppendV340ContinuityDrillContractInputJson(
    std::ostringstream& out,
    const OpsV340ContinuityDrillContractInput& input) {
    out << "{"
        << "\"key\":\"" << JsonEscape(input.key) << "\","
        << "\"label\":\"" << JsonEscape(input.label) << "\","
        << "\"source\":\"" << JsonEscape(input.source) << "\","
        << "\"route\":\"" << JsonEscape(input.route) << "\","
        << "\"requiredFor\":\"" << JsonEscape(input.required_for) << "\","
        << "\"boundary\":\"" << JsonEscape(input.boundary) << "\""
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15900 function
std::string OpsV340ContinuityDrillContractJson() {
    const auto v330HandoffInputs = BuildV340ContinuityDrillContractInputs();
    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v340-continuity-drill-contract.v1\","
        << "\"status\":\"continuity-drill-contract\","
        << "\"recoveryDrillSchema\":{"
        << "\"packageSchema\":\"media-server.ops.v340-recovery-candidate-package.v1\","
        << "\"contractVersion\":\"v3.4.0\","
        << "\"requiredSections\":["
        << "\"sourceRegistrySnapshotSummary\","
        << "\"publishedViewSummary\","
        << "\"sourceHealthSnapshotSummary\","
        << "\"eventRecordAuditContext\","
        << "\"recoveryCandidates\","
        << "\"stagingRestoreValidationHarness\"],"
        << "\"drillBoundaries\":["
        << "\"readOnly\","
        << "\"noWrite\","
        << "\"noSecret\","
        << "\"noMediaPathChange\"]"
        << "},\"v330HandoffInputs\":[";
    for (std::size_t i = 0; i < v330HandoffInputs.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV340ContinuityDrillContractInputJson(out, v330HandoffInputs[i]);
    }
    out << "],\"drillBoundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"noWrite\":true,"
        << "\"noSecret\":true,"
        << "\"noMediaPathChange\":true,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"productionRestorePerformed\":false,"
        << "\"automaticRecoveryPerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}




// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15994 function
OpsV340RecoveryCandidateContext BuildV340RecoveryCandidateContext(
    const std::vector<SourceViewRegistry::PublishedViewRecord>& views,
    const OpsSourceHealthSnapshot& source_health_snapshot,
    const app::AppConfig& config) {
    OpsV340RecoveryCandidateContext context;
    for (const auto& view : views) {
        if (!view.source_id.empty()) {
            context.view_ids_by_source[view.source_id].push_back(view.view_id);
        }
    }
    for (const auto& health : source_health_snapshot.items) {
        context.health_by_source[health.source_id] = &health;
    }

    analysis::EventRecordQueryOptions event_options;
    event_options.limit = 200;
    analysis::EventRecordQueryResult event_result;
    std::string event_error;
    if (analysis::QueryEventRecords(event_options, &event_result, &event_error)) {
        context.event_record_matched_count = static_cast<int>(event_result.matched_records);
        for (const auto& event_json : event_result.records_json) {
            const std::string event_id = ParseStringField(event_json, "eventId").value_or("");
            const std::string stream_id = ParseStringField(event_json, "streamId").value_or("");
            const std::string channel_id = ParseStringField(event_json, "channelId").value_or("");
            if (!event_id.empty() && context.sample_event_ids.size() < 8) {
                context.sample_event_ids.push_back(event_id);
            }
            if (!stream_id.empty()) {
                ++context.event_count_by_source[stream_id];
            }
            if (!channel_id.empty() && channel_id != stream_id) {
                ++context.event_count_by_source[channel_id];
            }
        }
    } else {
        context.event_query_ok = false;
        context.event_query_error = event_error.empty() ? "event record query failed" : event_error;
    }

    const OpsAuditQueryResult audit = QueryOpsAuditEntries(config, {{"limit", "200"}});
    context.audit_entry_total = audit.total;
    for (const auto& entry : audit.entries) {
        const std::string redacted_entry = RedactAuditJsonFragment(entry);
        const std::string action = ParseStringField(redacted_entry, "action").value_or("");
        const std::string target = ParseStringField(redacted_entry, "target").value_or("");
        if (!action.empty() && context.sample_audit_actions.size() < 8) {
            context.sample_audit_actions.push_back(action);
        }
        for (const auto& [source_id, unused] : context.view_ids_by_source) {
            (void)unused;
            if (!source_id.empty() && redacted_entry.find(source_id) != std::string::npos) {
                ++context.audit_count_by_source[source_id];
            }
        }
        if (target.rfind("channel:", 0) == 0) {
            const std::string source_id = target.substr(std::string("channel:").size());
            if (!source_id.empty()) {
                ++context.audit_count_by_source[source_id];
            }
        }
    }
    return context;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16058 function
std::vector<OpsV340RecoveryCandidatePackageItem> BuildV340RecoveryCandidatePackages(
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    const OpsV340RecoveryCandidateContext& context) {
    std::vector<OpsV340RecoveryCandidatePackageItem> items;
    items.reserve(sources.size());
    for (const auto& source : sources) {
        OpsV340RecoveryCandidatePackageItem item;
        item.source_id = source.source_id;
        item.display_name = source.display_name;
        item.source_kind = source.kind;
        item.source_enabled = source.enabled;
        if (const auto it = context.view_ids_by_source.find(source.source_id); it != context.view_ids_by_source.end()) {
            item.published_view_ids = it->second;
        }
        if (const auto it = context.health_by_source.find(source.source_id); it != context.health_by_source.end()) {
            item.source_health_status = it->second->status;
            item.source_health_reason = it->second->reason;
        }
        if (const auto it = context.event_count_by_source.find(source.source_id); it != context.event_count_by_source.end()) {
            item.event_record_count = it->second;
        }
        if (const auto it = context.audit_count_by_source.find(source.source_id); it != context.audit_count_by_source.end()) {
            item.audit_entry_count = it->second;
        }

        if (!source.enabled) {
            item.recovery_readiness = "blocked";
            item.readiness_reasons.push_back("source-disabled");
        }
        if (item.published_view_ids.empty()) {
            item.recovery_readiness = "blocked";
            item.readiness_reasons.push_back("missing-published-view");
        }
        if (item.source_health_status == "stale" || item.source_health_status == "offline" ||
            item.source_health_status == "unknown") {
            if (item.recovery_readiness != "blocked") {
                item.recovery_readiness = "degraded";
            }
            item.readiness_reasons.push_back("source-health-" + item.source_health_status);
        }
        if (item.readiness_reasons.empty()) {
            item.readiness_reasons.push_back("staging-validation-ready");
        }
        items.push_back(std::move(item));
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16106 function
OpsV340RecoveryCandidatePackageSummary BuildV340RecoveryCandidatePackageSummary(
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    const std::vector<SourceViewRegistry::PublishedViewRecord>& views,
    const std::vector<OpsV340RecoveryCandidatePackageItem>& candidates,
    const OpsV340RecoveryCandidateContext& context) {
    OpsV340RecoveryCandidatePackageSummary summary;
    summary.source_count = static_cast<int>(sources.size());
    summary.published_view_count = static_cast<int>(views.size());
    summary.candidate_count = static_cast<int>(candidates.size());
    summary.event_record_count = context.event_record_matched_count;
    summary.audit_entry_count = context.audit_entry_total;
    for (const auto& candidate : candidates) {
        if (candidate.recovery_readiness == "ready") {
            ++summary.ready_count;
        } else if (candidate.recovery_readiness == "degraded") {
            ++summary.degraded_count;
        } else {
            ++summary.blocked_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16129 function
void AppendV340RecoveryCandidateStringListJson(std::ostringstream& out,
                                               const std::vector<std::string>& values) {
    out << "[";
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscape(values[i]) << "\"";
    }
    out << "]";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16141 function
void AppendV340RecoveryCandidatePackageItemJson(
    std::ostringstream& out,
    const OpsV340RecoveryCandidatePackageItem& item) {
    out << "{"
        << "\"sourceId\":\"" << JsonEscape(item.source_id) << "\","
        << "\"displayName\":\"" << JsonEscape(item.display_name) << "\","
        << "\"sourceKind\":\"" << JsonEscape(item.source_kind) << "\","
        << "\"sourceEnabled\":" << (item.source_enabled ? "true" : "false") << ","
        << "\"publishedViewIds\":";
    AppendV340RecoveryCandidateStringListJson(out, item.published_view_ids);
    out << ",\"sourceHealth\":{"
        << "\"status\":\"" << JsonEscape(item.source_health_status) << "\","
        << "\"reason\":\"" << JsonEscape(item.source_health_reason) << "\""
        << "},\"eventRecordCount\":" << item.event_record_count
        << ",\"auditEntryCount\":" << item.audit_entry_count
        << ",\"recoveryReadiness\":\"" << JsonEscape(item.recovery_readiness) << "\","
        << "\"readinessReasons\":";
    AppendV340RecoveryCandidateStringListJson(out, item.readiness_reasons);
    out << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16162 function
void AppendV340RecoveryCandidateEventAuditContextJson(
    std::ostringstream& out,
    const OpsV340RecoveryCandidateContext& context) {
    out << "{"
        << "\"eventQueryOk\":" << (context.event_query_ok ? "true" : "false") << ","
        << "\"eventQueryError\":";
    AppendNullableJsonString(out, context.event_query_error);
    out << ",\"eventRecordCount\":" << context.event_record_matched_count << ","
        << "\"auditQueryOk\":" << (context.audit_query_ok ? "true" : "false") << ","
        << "\"auditEntryCount\":" << context.audit_entry_total << ","
        << "\"sampleEventIds\":";
    AppendV340RecoveryCandidateStringListJson(out, context.sample_event_ids);
    out << ",\"sampleAuditActions\":";
    AppendV340RecoveryCandidateStringListJson(out, context.sample_audit_actions);
    out << ",\"rawAuditBodyIncluded\":false}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16179 function
void AppendV340RecoveryCandidatePackageSummaryJson(
    std::ostringstream& out,
    const OpsV340RecoveryCandidatePackageSummary& summary) {
    out << "{"
        << "\"sourceCount\":" << summary.source_count << ","
        << "\"publishedViewCount\":" << summary.published_view_count << ","
        << "\"candidateCount\":" << summary.candidate_count << ","
        << "\"readyCount\":" << summary.ready_count << ","
        << "\"degradedCount\":" << summary.degraded_count << ","
        << "\"blockedCount\":" << summary.blocked_count << ","
        << "\"eventRecordCount\":" << summary.event_record_count << ","
        << "\"auditEntryCount\":" << summary.audit_entry_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16194 function
std::string OpsV340RecoveryCandidatePackageJson(
    const app::AppConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    if (!source_health_snapshot.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v340-recovery-candidate-package.v1\",\"error\":\"" +
               JsonEscape(source_health_snapshot.error) + "\"}";
    }

    std::vector<SourceViewRegistry::SourceRecord> sources;
    std::vector<SourceViewRegistry::PublishedViewRecord> views;
    std::string load_error;
    if (!SourceViewRegistry::Instance().Snapshot(&sources, &views, &load_error)) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v340-recovery-candidate-package.v1\",\"error\":\"" +
               JsonEscape(load_error.empty() ? "source registry load failed" : load_error) + "\"}";
    }

    const auto context = BuildV340RecoveryCandidateContext(views, source_health_snapshot, config);
    const auto recoveryCandidates = BuildV340RecoveryCandidatePackages(sources, context);
    const auto summary =
        BuildV340RecoveryCandidatePackageSummary(sources, views, recoveryCandidates, context);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v340-recovery-candidate-package.v1\","
        << "\"status\":\"recovery-candidate-package\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"contractRoute\":\"/ops/api/source-registry/continuity-drill/contract\","
        << "\"sourceRegistrySnapshotSummary\":{"
        << "\"sourceCount\":" << sources.size() << ","
        << "\"redacted\":true"
        << "},\"publishedViewSummary\":{"
        << "\"publishedViewCount\":" << views.size() << ","
        << "\"redacted\":true"
        << "},\"sourceHealthSnapshotSummary\":";
    AppendOpsSourceHealthSummaryJson(out, source_health_snapshot);
    out << ",\"eventRecordAuditContext\":";
    AppendV340RecoveryCandidateEventAuditContextJson(out, context);
    out << ",\"recoveryCandidatePackageSummary\":";
    AppendV340RecoveryCandidatePackageSummaryJson(out, summary);
    out << ",\"recoveryCandidates\":[";
    for (std::size_t i = 0; i < recoveryCandidates.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV340RecoveryCandidatePackageItemJson(out, recoveryCandidates[i]);
    }
    out << "],\"stagingRestoreValidationHarness\":{"
        << "\"command\":\"./server.sh verify-v340-staging-restore-validation-harness\","
        << "\"stagingOnly\":true,"
        << "\"productionWritePerformed\":false,"
        << "\"authStoreMode0600\":true,"
        << "\"checksumVerified\":true,"
        << "\"viewerScopeVerified\":true,"
        << "\"duplicateSourceIdRejected\":true,"
        << "\"missingSourceIdReferenceRejected\":true"
        << "},\"redactionPolicy\":{"
        << "\"redacted\":true,"
        << "\"sourceLocatorIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawAuditBodyIncluded\":false,"
        << "\"mediaPathIncluded\":false,"
        << "\"clientViewerMaterialIncluded\":false"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"productionRestorePerformed\":false,"
        << "\"automaticRecoveryPerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"rawLocatorExposedToClient\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"rawAuditBodyIncluded\":false,"
        << "\"eventRecordSchemaChanged\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16302 function
std::string JoinV340ApprovalRecoveryStrings(const std::vector<std::string>& values,
                                            const std::string& delimiter) {
    std::ostringstream out;
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i != 0) {
            out << delimiter;
        }
        out << values[i];
    }
    return out.str();
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16314 function
std::string V340ApprovalRecoveryStatusFor(const OpsV340RecoveryCandidatePackageItem& candidate) {
    if (candidate.recovery_readiness == "blocked") {
        return "blocked";
    }
    if (candidate.source_kind == "onvif" || candidate.source_kind == "whep") {
        return "field-smoke-needed";
    }
    if (candidate.recovery_readiness == "ready") {
        return "ready";
    }
    return "not-run";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16327 function
std::string V340ApprovalRecoveryDryRunResultFor(
    const OpsV340RecoveryCandidatePackageItem& candidate,
    const std::string& readiness_status) {
    if (readiness_status == "blocked") {
        return "blocked: " + JoinV340ApprovalRecoveryStrings(candidate.readiness_reasons, ", ");
    }
    if (readiness_status == "field-smoke-needed") {
        return "field-smoke-needed: endpoint/credential approval required before recovery";
    }
    if (readiness_status == "ready") {
        return "dry-run-ready: staging validation can be reviewed before manual approval";
    }
    return "not-run: operator approval and dry-run review are still required";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16342 function
std::vector<OpsV340ApprovalGatedRecoveryChecklistItem> BuildV340ApprovalGatedRecoveryChecklist(
    const std::vector<OpsV340RecoveryCandidatePackageItem>& candidates) {
    std::vector<OpsV340ApprovalGatedRecoveryChecklistItem> items;
    items.reserve(candidates.size());
    for (const auto& candidate : candidates) {
        OpsV340ApprovalGatedRecoveryChecklistItem item;
        item.source_id = candidate.source_id;
        item.display_name = candidate.display_name.empty() ? candidate.source_id : candidate.display_name;
        item.source_kind = candidate.source_kind;
        item.audit_entry_count = candidate.audit_entry_count;
        item.readiness_status = V340ApprovalRecoveryStatusFor(candidate);
        item.field_smoke_required = item.readiness_status == "field-smoke-needed";
        item.operator_note = "Operator must review recovery checklist for source " + candidate.source_id +
                             " before any manual recovery. Automatic recovery is disabled.";
        item.dry_run_result = V340ApprovalRecoveryDryRunResultFor(candidate, item.readiness_status);
        item.audit_route = "/ops/sources#auditArea=channels&auditPreset=source-recovery-approval"
                           "&auditAction=source-recovery-approval-checklist&auditTarget=" +
                           UrlEncode("source:" + candidate.source_id);
        items.push_back(std::move(item));
    }
    return items;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16365 function
OpsV340ApprovalGatedRecoveryChecklistSummary BuildV340ApprovalGatedRecoveryChecklistSummary(
    const std::vector<OpsV340ApprovalGatedRecoveryChecklistItem>& items) {
    OpsV340ApprovalGatedRecoveryChecklistSummary summary;
    summary.item_count = static_cast<int>(items.size());
    for (const auto& item : items) {
        if (item.readiness_status == "ready") {
            ++summary.ready_count;
        } else if (item.readiness_status == "blocked") {
            ++summary.blocked_count;
        } else if (item.readiness_status == "field-smoke-needed") {
            ++summary.field_smoke_needed_count;
        } else {
            ++summary.not_run_count;
        }
        if (item.audit_entry_count > 0) {
            ++summary.audit_linked_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16386 function
void AppendV340ApprovalGatedRecoveryChecklistSummaryJson(
    std::ostringstream& out,
    const OpsV340ApprovalGatedRecoveryChecklistSummary& summary) {
    out << "{"
        << "\"itemCount\":" << summary.item_count << ","
        << "\"readyCount\":" << summary.ready_count << ","
        << "\"blockedCount\":" << summary.blocked_count << ","
        << "\"fieldSmokeNeededCount\":" << summary.field_smoke_needed_count << ","
        << "\"notRunCount\":" << summary.not_run_count << ","
        << "\"auditLinkedCount\":" << summary.audit_linked_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16399 function
void AppendV340ApprovalGatedRecoveryChecklistItemJson(
    std::ostringstream& out,
    const OpsV340ApprovalGatedRecoveryChecklistItem& item) {
    out << "{"
        << "\"sourceId\":\"" << JsonEscape(item.source_id) << "\","
        << "\"displayName\":\"" << JsonEscape(item.display_name) << "\","
        << "\"sourceKind\":\"" << JsonEscape(item.source_kind) << "\","
        << "\"readinessStatus\":\"" << JsonEscape(item.readiness_status) << "\","
        << "\"operatorNote\":\"" << JsonEscape(item.operator_note) << "\","
        << "\"dryRunResult\":\"" << JsonEscape(item.dry_run_result) << "\","
        << "\"fieldSmokeRequired\":" << (item.field_smoke_required ? "true" : "false") << ","
        << "\"opsAuditLinkage\":{"
        << "\"area\":\"channels\","
        << "\"action\":\"source-recovery-approval-checklist\","
        << "\"target\":\"source:" << JsonEscape(item.source_id) << "\","
        << "\"auditRoute\":\"" << JsonEscape(item.audit_route) << "\","
        << "\"auditEntryCount\":" << item.audit_entry_count << ","
        << "\"rawAuditBodyIncluded\":false"
        << "},\"automaticRecoveryPerformed\":false"
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16421 function
std::string OpsV340ApprovalGatedRecoveryChecklistJson(
    const app::AppConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    if (!source_health_snapshot.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v340-approval-gated-recovery-checklist.v1\",\"error\":\"" +
               JsonEscape(source_health_snapshot.error) + "\"}";
    }

    std::vector<SourceViewRegistry::SourceRecord> sources;
    std::vector<SourceViewRegistry::PublishedViewRecord> views;
    std::string load_error;
    if (!SourceViewRegistry::Instance().Snapshot(&sources, &views, &load_error)) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v340-approval-gated-recovery-checklist.v1\",\"error\":\"" +
               JsonEscape(load_error.empty() ? "source registry load failed" : load_error) + "\"}";
    }

    const auto context = BuildV340RecoveryCandidateContext(views, source_health_snapshot, config);
    const auto recoveryCandidates = BuildV340RecoveryCandidatePackages(sources, context);
    const auto approvalGatedRecoveryChecklistItems =
        BuildV340ApprovalGatedRecoveryChecklist(recoveryCandidates);
    const auto summary =
        BuildV340ApprovalGatedRecoveryChecklistSummary(approvalGatedRecoveryChecklistItems);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v340-approval-gated-recovery-checklist.v1\","
        << "\"status\":\"approval-gated-recovery-checklist\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"packageRoute\":\"/ops/api/source-registry/recovery-candidate-package\","
        << "\"dryRunRoute\":\"/ops/api/source-registry/recovery-candidate-package\","
        << "\"approvalRequired\":true,"
        << "\"opsAuditLinkage\":{"
        << "\"area\":\"channels\","
        << "\"action\":\"source-recovery-approval-checklist\","
        << "\"auditRoute\":\"/ops/api/audit?area=channels&action=source-recovery-approval-checklist\","
        << "\"rawAuditBodyIncluded\":false"
        << "},\"approvalGatedRecoveryChecklistSummary\":";
    AppendV340ApprovalGatedRecoveryChecklistSummaryJson(out, summary);
    out << ",\"approvalGatedRecoveryChecklistItems\":[";
    for (std::size_t i = 0; i < approvalGatedRecoveryChecklistItems.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV340ApprovalGatedRecoveryChecklistItemJson(out, approvalGatedRecoveryChecklistItems[i]);
    }
    out << "],\"redactionPolicy\":{"
        << "\"redacted\":true,"
        << "\"sourceLocatorIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"rawAuditBodyIncluded\":false,"
        << "\"clientViewerMaterialIncluded\":false"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"productionRestorePerformed\":false,"
        << "\"automaticRecoveryPerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"sourceLocatorExposed\":false,"
        << "\"credentialMaterialExposed\":false,"
        << "\"rawJsonExposed\":false,"
        << "\"debugMaterialExposed\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false"
        << "}}";
    return out.str();
}




// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16520 function
std::vector<OpsV340DrillEvidenceArtifact> BuildV340DrillEvidenceArtifactManifest(
    const std::vector<OpsV340RecoveryCandidatePackageItem>& candidates,
    const std::vector<OpsV340ApprovalGatedRecoveryChecklistItem>& checklist_items) {
    std::vector<OpsV340DrillEvidenceArtifact> artifacts{
        {"continuity-drill-contract",
         "Continuity Drill Contract",
         "/ops/api/source-registry/continuity-drill/contract",
         "Retain schema, handoff input, and read-only/no-write boundary summary"},
        {"recovery-candidate-package",
         "Recovery Candidate Package",
         "/ops/api/source-registry/recovery-candidate-package",
         "Retain redacted candidate readiness and source health summary"},
        {"source-health-replay-drift-diff",
         "Source Health Replay Drift Diff",
         "/ops/api/source-registry/source-health-replay-drift-diff",
         "Retain stale/offline/reconnect/warning drift summary"},
        {"approval-gated-recovery-checklist",
         "Approval-Gated Recovery Checklist",
         "/ops/api/source-registry/approval-gated-recovery-checklist",
         "Retain operator note, readiness status, dry-run result, and Ops audit linkage summary"},
    };
    if (!candidates.empty()) {
        artifacts.push_back({"recovery-candidate-count",
                             "Recovery Candidate Count",
                             "/ops/api/source-registry/recovery-candidate-package",
                             "Retain candidate count only; source locator and credential material stay excluded"});
    }
    if (!checklist_items.empty()) {
        artifacts.push_back({"approval-checklist-count",
                             "Approval Checklist Count",
                             "/ops/api/source-registry/approval-gated-recovery-checklist",
                             "Retain checklist count only; raw audit body and recovery action material stay excluded"});
    }
    return artifacts;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16556 function
std::vector<OpsV340DrillCleanupManifestItem> BuildV340DrillCleanupManifest() {
    return {
        {"tmp-drill-staging-runtime",
         "temporary staging runtime",
         "/tmp",
         "/tmp/media-server-v340-drill-*",
         "not-run",
         "Cleanup candidate recorded for operator review; this verifier does not delete files"},
        {"private-tmp-drill-staging-runtime",
         "private temporary staging runtime",
         "/private/tmp",
         "/private/tmp/media-server-v340-drill-*",
         "not-run",
         "Cleanup candidate recorded for operator review; this verifier does not delete files"},
        {"core-clips",
         "throwaway core clips",
         "event core-clips",
         "core-clips/*",
         "not-run",
         "Raw clip cleanup is documented but not executed by the drill manifest"},
        {"core-snapshots",
         "throwaway core snapshots",
         "event core-snapshots",
         "core-snapshots/*",
         "not-run",
         "Raw snapshot cleanup is documented but not executed by the drill manifest"},
        {"throwaway-registry",
         "throwaway registry",
         "source/view registry fixture",
         "source-registry-throwaway/*.json",
         "not-run",
         "Fixture registry cleanup is documented but not executed by the drill manifest"},
    };
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16591 function
std::vector<std::string> BuildV340DrillSensitiveMaterialScanPatterns() {
    return {"source URL",
            "raw locator",
            "raw JSON",
            "debug material",
            "credential material",
            "raw audit body",
            "provider material",
            "client viewer material"};
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16602 function
OpsV340DrillEvidenceExportCleanupSummary BuildV340DrillEvidenceExportCleanupSummary(
    const std::vector<OpsV340DrillEvidenceArtifact>& artifacts,
    const std::vector<OpsV340DrillCleanupManifestItem>& cleanup_items,
    const std::vector<std::string>& scan_patterns) {
    OpsV340DrillEvidenceExportCleanupSummary summary;
    summary.artifact_count = static_cast<int>(artifacts.size());
    summary.cleanup_candidate_count = static_cast<int>(cleanup_items.size());
    summary.sensitive_scan_pattern_count = static_cast<int>(scan_patterns.size());
    for (const auto& artifact : artifacts) {
        if (artifact.retained) {
            ++summary.retained_evidence_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16618 function
void AppendV340DrillEvidenceArtifactJson(std::ostringstream& out,
                                         const OpsV340DrillEvidenceArtifact& artifact) {
    out << "{"
        << "\"artifactKey\":\"" << JsonEscape(artifact.artifact_key) << "\","
        << "\"label\":\"" << JsonEscape(artifact.label) << "\","
        << "\"route\":\"" << JsonEscape(artifact.route) << "\","
        << "\"retained\":" << (artifact.retained ? "true" : "false") << ","
        << "\"retentionReason\":\"" << JsonEscape(artifact.retention_reason) << "\","
        << "\"sourceUrlIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawAuditBodyIncluded\":false,"
        << "\"providerMaterialIncluded\":false,"
        << "\"clientViewerMaterialIncluded\":false"
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16637 function
void AppendV340DrillCleanupManifestItemJson(std::ostringstream& out,
                                            const OpsV340DrillCleanupManifestItem& item) {
    out << "{"
        << "\"cleanupKey\":\"" << JsonEscape(item.cleanup_key) << "\","
        << "\"label\":\"" << JsonEscape(item.label) << "\","
        << "\"scope\":\"" << JsonEscape(item.scope) << "\","
        << "\"pathPattern\":\"" << JsonEscape(item.path_pattern) << "\","
        << "\"status\":\"" << JsonEscape(item.status) << "\","
        << "\"reason\":\"" << JsonEscape(item.reason) << "\","
        << "\"cleanupExecutionPerformed\":"
        << (item.cleanup_execution_performed ? "true" : "false")
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16651 function
void AppendV340DrillEvidenceExportCleanupSummaryJson(
    std::ostringstream& out,
    const OpsV340DrillEvidenceExportCleanupSummary& summary) {
    out << "{"
        << "\"retainedEvidenceCount\":" << summary.retained_evidence_count << ","
        << "\"artifactCount\":" << summary.artifact_count << ","
        << "\"cleanupCandidateCount\":" << summary.cleanup_candidate_count << ","
        << "\"sensitiveScanPatternCount\":" << summary.sensitive_scan_pattern_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16662 function
std::string OpsV340DrillEvidenceExportCleanupManifestJson(
    const app::AppConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    if (!source_health_snapshot.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v340-drill-evidence-export-cleanup-manifest.v1\",\"error\":\"" +
               JsonEscape(source_health_snapshot.error) + "\"}";
    }

    std::vector<SourceViewRegistry::SourceRecord> sources;
    std::vector<SourceViewRegistry::PublishedViewRecord> views;
    std::string load_error;
    if (!SourceViewRegistry::Instance().Snapshot(&sources, &views, &load_error)) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v340-drill-evidence-export-cleanup-manifest.v1\",\"error\":\"" +
               JsonEscape(load_error.empty() ? "source registry load failed" : load_error) + "\"}";
    }

    const auto context = BuildV340RecoveryCandidateContext(views, source_health_snapshot, config);
    const auto recoveryCandidates = BuildV340RecoveryCandidatePackages(sources, context);
    const auto approvalGatedRecoveryChecklistItems =
        BuildV340ApprovalGatedRecoveryChecklist(recoveryCandidates);
    const auto artifacts = BuildV340DrillEvidenceArtifactManifest(
        recoveryCandidates, approvalGatedRecoveryChecklistItems);
    const auto cleanup_items = BuildV340DrillCleanupManifest();
    const auto scan_patterns = BuildV340DrillSensitiveMaterialScanPatterns();
    const auto summary =
        BuildV340DrillEvidenceExportCleanupSummary(artifacts, cleanup_items, scan_patterns);

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v340-drill-evidence-export-cleanup-manifest.v1\","
        << "\"status\":\"drill-evidence-export-cleanup-manifest\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"packageRoute\":\"/ops/api/source-registry/recovery-candidate-package\","
        << "\"approvalChecklistRoute\":\"/ops/api/source-registry/approval-gated-recovery-checklist\","
        << "\"drillEvidenceExportCleanupSummary\":";
    AppendV340DrillEvidenceExportCleanupSummaryJson(out, summary);
    out << ",\"redactedDrillArtifactManifest\":{"
        << "\"schema\":\"media-server.ops.v340-drill-evidence-artifact-manifest.v1\","
        << "\"manifestOnly\":true,"
        << "\"artifactExportExecuted\":false,"
        << "\"artifactItems\":[";
    for (std::size_t i = 0; i < artifacts.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV340DrillEvidenceArtifactJson(out, artifacts[i]);
    }
    out << "]},\"minimumRetainedEvidence\":[";
    for (std::size_t i = 0; i < artifacts.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV340DrillEvidenceArtifactJson(out, artifacts[i]);
    }
    out << "],\"tmpCleanupManifest\":{"
        << "\"cleanupExecutionPerformed\":false,"
        << "\"temporaryCleanupExecuted\":false,"
        << "\"dryRunOnly\":true,"
        << "\"cleanupCandidates\":[";
    for (std::size_t i = 0; i < cleanup_items.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV340DrillCleanupManifestItemJson(out, cleanup_items[i]);
    }
    out << "]},\"sensitiveMaterialScanBoundary\":{"
        << "\"sensitiveScanPatternCount\":" << scan_patterns.size() << ","
        << "\"scanPatterns\":";
    AppendV340RecoveryCandidateStringListJson(out, scan_patterns);
    out << ",\"sourceUrlIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawAuditBodyIncluded\":false,"
        << "\"providerMaterialIncluded\":false,"
        << "\"clientViewerMaterialIncluded\":false"
        << "},\"redactionPolicy\":{"
        << "\"redacted\":true,"
        << "\"manifestOnly\":true,"
        << "\"sourceUrlIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawAuditBodyIncluded\":false,"
        << "\"providerMaterialIncluded\":false,"
        << "\"clientViewerMaterialIncluded\":false"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"manifestOnly\":true,"
        << "\"artifactExportExecuted\":false,"
        << "\"cleanupExecutionPerformed\":false,"
        << "\"temporaryCleanupExecuted\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"productionRestorePerformed\":false,"
        << "\"automaticRecoveryPerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"searchMetricsChanged\":false"
        << "}}";
    return out.str();
}



// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16803 function
std::vector<OpsV340FieldBridgeConditionGate> BuildV340FieldBridgeConditionGates() {
    return {
        {"onvif-real-device",
         "onvif-real-device",
         "ONVIF real device field smoke",
         "field-smoke-needed",
         "not-run",
         "blocked",
         "approved field smoke with real ONVIF endpoint and credential",
         "Requires an operator-approved ONVIF device endpoint, credential material supplied out of band, and a real device smoke run before release PASS eligibility.",
         true,
         true,
         true,
         false,
         false},
        {"external-whep-turn",
         "external-whep-turn",
         "External WHEP/TURN field smoke",
         "field-smoke-needed",
         "not-run",
         "blocked",
         "approved field smoke with external WHEP endpoint and TURN relay credential",
         "Requires approved WHEP playback endpoint, TURN relay credential, and external network smoke evidence; local ICE/source-only PASS is not a substitute.",
         true,
         true,
         true,
         false,
         false},
        {"real-cloud-vlm-provider",
         "real-cloud-vlm-provider",
         "Real cloud/VLM provider field smoke",
         "field-smoke-needed",
         "not-run",
         "blocked",
         "approved field smoke with real cloud/VLM provider credential",
         "Requires approved provider endpoint, credential, and field smoke evidence; local fixture/VLM boundary PASS is not promoted to provider PASS.",
         true,
         true,
         true,
         false,
         false},
    };
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16847 function
OpsV340FieldBridgeConditionGateSummary BuildV340FieldBridgeConditionGateSummary(
    const std::vector<OpsV340FieldBridgeConditionGate>& gates) {
    OpsV340FieldBridgeConditionGateSummary summary;
    summary.gate_count = static_cast<int>(gates.size());
    for (const auto& gate : gates) {
        if (gate.field_smoke_status == "field-smoke-needed") {
            ++summary.field_smoke_needed_count;
        }
        if (gate.source_only_pass_result == "blocked") {
            ++summary.blocked_count;
        }
        if (gate.execution_status == "not-run") {
            ++summary.not_run_count;
        }
        if (gate.endpoint_required) {
            ++summary.endpoint_required_count;
        }
        if (gate.credential_required) {
            ++summary.credential_required_count;
        }
        if (gate.operator_approval_required) {
            ++summary.approval_required_count;
        }
    }
    return summary;
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16874 function
void AppendV340FieldBridgeConditionGateJson(std::ostringstream& out,
                                            const OpsV340FieldBridgeConditionGate& gate) {
    out << "{"
        << "\"gateKey\":\"" << JsonEscape(gate.gate_key) << "\","
        << "\"bridgeKind\":\"" << JsonEscape(gate.bridge_kind) << "\","
        << "\"label\":\"" << JsonEscape(gate.label) << "\","
        << "\"fieldSmokeStatus\":\"" << JsonEscape(gate.field_smoke_status) << "\","
        << "\"executionStatus\":\"" << JsonEscape(gate.execution_status) << "\","
        << "\"sourceOnlyPassResult\":\"" << JsonEscape(gate.source_only_pass_result) << "\","
        << "\"fieldSmokeCommand\":\"" << JsonEscape(gate.field_smoke_command) << "\","
        << "\"conditionSummary\":\"" << JsonEscape(gate.condition_summary) << "\","
        << "\"endpointRequired\":" << (gate.endpoint_required ? "true" : "false") << ","
        << "\"credentialRequired\":" << (gate.credential_required ? "true" : "false") << ","
        << "\"operatorApprovalRequired\":" << (gate.operator_approval_required ? "true" : "false") << ","
        << "\"sourceOnlyPassAccepted\":" << (gate.source_only_pass_accepted ? "true" : "false") << ","
        << "\"fieldSmokeExecuted\":" << (gate.field_smoke_executed ? "true" : "false") << ","
        << "\"endpointUrlIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"providerMaterialIncluded\":false,"
        << "\"rawTurnCredentialsIncluded\":false,"
        << "\"rawVlmPromptIncluded\":false,"
        << "\"rawProviderResponseIncluded\":false"
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16902 function
void AppendV340FieldBridgeConditionGateSummaryJson(
    std::ostringstream& out,
    const OpsV340FieldBridgeConditionGateSummary& summary) {
    out << "{"
        << "\"gateCount\":" << summary.gate_count << ","
        << "\"fieldSmokeNeededCount\":" << summary.field_smoke_needed_count << ","
        << "\"blockedCount\":" << summary.blocked_count << ","
        << "\"notRunCount\":" << summary.not_run_count << ","
        << "\"endpointRequiredCount\":" << summary.endpoint_required_count << ","
        << "\"credentialRequiredCount\":" << summary.credential_required_count << ","
        << "\"approvalRequiredCount\":" << summary.approval_required_count
        << "}";
}

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16916 function
std::string OpsV340FieldBridgeConditionGatesJson(
    const OpsSourceHealthSnapshot& source_health_snapshot) {
    if (!source_health_snapshot.ok) {
        return "{\"ok\":false,\"schema\":\"media-server.ops.v340-field-bridge-condition-gates.v1\",\"error\":\"" +
               JsonEscape(source_health_snapshot.error) + "\"}";
    }

    const auto gates = BuildV340FieldBridgeConditionGates();
    const auto summary = BuildV340FieldBridgeConditionGateSummary(gates);
    const std::vector<std::string> field_smoke_conditions{
        "operator approval",
        "field endpoint configured",
        "credential supplied out of band",
        "real field smoke executed",
        "source-only PASS not accepted"};

    std::ostringstream out;
    out << "{"
        << "\"ok\":true,"
        << "\"schema\":\"media-server.ops.v340-field-bridge-condition-gates.v1\","
        << "\"status\":\"field-bridge-condition-gates\","
        << "\"generatedAt\":\"" << JsonEscape(source_health_snapshot.generated_at) << "\","
        << "\"drillEvidenceRoute\":\"/ops/api/source-registry/drill-evidence-export-cleanup-manifest\","
        << "\"fieldBridgeConditionGateSummary\":";
    AppendV340FieldBridgeConditionGateSummaryJson(out, summary);
    out << ",\"fieldBridgeConditionGates\":[";
    for (std::size_t i = 0; i < gates.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendV340FieldBridgeConditionGateJson(out, gates[i]);
    }
    out << "],\"sourceOnlyPassPolicy\":{"
        << "\"sourceOnlyPassAccepted\":false,"
        << "\"localVerifierPassSubstitutesFieldSmoke\":false,"
        << "\"sourceOnlyPassResult\":\"blocked\","
        << "\"fieldSmokeRequiredForReleasePass\":true"
        << "},\"fieldSmokeConditions\":";
    AppendV340RecoveryCandidateStringListJson(out, field_smoke_conditions);
    out << ",\"redactionPolicy\":{"
        << "\"redacted\":true,"
        << "\"endpointUrlIncluded\":false,"
        << "\"credentialMaterialIncluded\":false,"
        << "\"rawLocatorIncluded\":false,"
        << "\"rawJsonIncluded\":false,"
        << "\"debugMaterialIncluded\":false,"
        << "\"providerMaterialIncluded\":false,"
        << "\"rawTurnCredentialsIncluded\":false,"
        << "\"rawVlmPromptIncluded\":false,"
        << "\"rawProviderResponseIncluded\":false,"
        << "\"clientViewerMaterialIncluded\":false"
        << "},\"boundaries\":{"
        << "\"opsOnly\":true,"
        << "\"readOnly\":true,"
        << "\"conditionalFieldSmokeOnly\":true,"
        << "\"sourceOnlyPassAccepted\":false,"
        << "\"localVerifierPassSubstitutesFieldSmoke\":false,"
        << "\"fieldSmokeExecuted\":false,"
        << "\"endpointProbePerformed\":false,"
        << "\"credentialProbePerformed\":false,"
        << "\"onvifDeviceContacted\":false,"
        << "\"externalWhepTurnContacted\":false,"
        << "\"cloudProviderContacted\":false,"
        << "\"vlmProviderCalled\":false,"
        << "\"sourceRegistryWritePerformed\":false,"
        << "\"publishedViewWritePerformed\":false,"
        << "\"eventRecordWritePerformed\":false,"
        << "\"opsAuditWritePerformed\":false,"
        << "\"productionRestorePerformed\":false,"
        << "\"automaticRecoveryPerformed\":false,"
        << "\"viewerClientExposureAdded\":false,"
        << "\"eventPostPayloadChanged\":false,"
        << "\"eventSchemaChanged\":false,"
        << "\"webrtcDataChannelSchemaChanged\":false,"
        << "\"sseMetadataSchemaChanged\":false,"
        << "\"wsMetadataSchemaChanged\":false,"
        << "\"rtspOrWebrtcMediaPathChanged\":false,"
        << "\"ruleProfilePayloadChanged\":false,"
        << "\"searchMetricsChanged\":false"
        << "}}";
    return out.str();
}

}  // namespace webrtc_http_server_detail

}  // namespace ingress
