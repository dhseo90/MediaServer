#pragma once

#include "ingress/webrtc_http_server.h"

#include <arpa/inet.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <sys/stat.h>
#include <sys/ioctl.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <unistd.h>

#include <algorithm>
#include <array>
#include <atomic>
#include <cerrno>
#include <chrono>
#include <cstdlib>
#include <cctype>
#include <cstdint>
#include <cstring>
#include <ctime>
#include <fstream>
#include <filesystem>
#include <iomanip>
#include <iostream>
#include <initializer_list>
#include <limits>
#include <mutex>
#include <optional>
#include <set>
#include <sstream>
#include <stdexcept>
#include <string>
#include <thread>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

#include "analysis/appearance_extractor.h"
#include "analysis/analysis_session_service.h"
#include "analysis/category_tokens.h"
#include "analysis/detector.h"
#include "analysis/event_feature_search_index.h"
#include "analysis/event_post_dispatcher.h"
#include "analysis/event_rule_engine.h"
#include "analysis/event_storage.h"
#include "analysis/image_frame_loader.h"
#include "analysis/incident_memory.h"
#include "analysis/metadata_subscription_filter.h"
#include "analysis/object_tracker.h"
#include "analysis/overlay_renderer.h"
#include "analysis/snapshot_encoder.h"
#include "analysis/va_runtime_metadata.h"
#include "analysis/vlm_observation_store.h"
#include "analysis/analysis_query.h"
#include "ingress/analysis_overlay_probe.h"
#include "ingress/analysis_rule_registry.h"
#include "ingress/http_auth.h"
#include "ingress/onvif_live_import.h"
#include "ingress/ops_action_execution_deferral.h"
#include "ingress/ops_event_route_owner.h"
#include "ingress/product_ui_assets.h"
#include "ingress/product_ui_action_execution_deferral.h"
#include "ingress/product_ui_auth_pages.h"
#include "ingress/product_ui_components.h"
#include "ingress/product_ui_css.h"
#include "ingress/product_ui_js.h"
#include "ingress/product_ui_page_scripts.h"
#include "ingress/product_ui_server_pages.h"
#include "ingress/source_view_registry.h"
#include "domain/strict_json.h"
#include "ingress/vlm_evaluation_promotion.h"
#include "ingress/vlm_incident_rule_provenance.h"
#include "ingress/webrtc_egress_session.h"
#include "core/webrtc_source_registry.h"
#include "ingress/webrtc_source_session.h"


namespace ingress {

namespace webrtc_http_server_detail {

// WebRtcHttpServer 생성자가 Start 전에 단 한 번 획득하는 transport-private immutable process snapshot이다.
bool AcquireWebRtcHttpRuntimeConfig(const WebRtcHttpRuntimeConfig& config);
const WebRtcHttpRuntimeConfig& GetWebRtcHttpRuntimeConfig();

extern std::atomic<std::uint64_t> g_web_rtc_metadata_sequence;
extern std::atomic<std::uint64_t> g_ops_audit_sequence;
extern std::mutex g_ops_audit_mu;
extern std::mutex g_ops_event_review_mu;
extern std::mutex g_ops_alert_delivery_mu;
extern std::mutex g_client_live_preference_mu;
extern std::mutex g_source_health_audit_mu;
extern std::unordered_map<std::string, std::string> g_source_health_audit_state;
extern std::mutex g_source_health_warning_mu;
extern std::unordered_map<std::string, std::pair<std::string, int>> g_source_health_warning_state;

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 99 constant
constexpr std::size_t kMaxHttpHeaderBytes = 64 * 1024;

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 100 constant
constexpr std::size_t kMaxHttpBodyBytes = 2 * 1024 * 1024;

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 101 constant
constexpr int kHttpSocketTimeoutSeconds = 5;

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 102 constant
constexpr int kMaxActiveHttpConnections = 128;

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 103 constant
constexpr int kOpsSourceHealthHighReconnectThreshold = 3;

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 104 constant
constexpr int kOpsSourceHealthRepeatedStaleThreshold = 3;

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 106 prototype
std::string Trim(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 116 prototype
std::string UrlDecode(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 140 prototype
std::string UrlEncode(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 153 prototype
std::unordered_map<std::string, std::string> ParseQueryString(const std::string& raw);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 173 prototype
std::string JsonEscape(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 201 prototype
// HTML template 안의 고정 placeholder를 한 번에 치환한다.
void ReplaceAll(std::string* text, const std::string& needle, const std::string& replacement);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 213 prototype
std::string RefreshIconSvgHtml();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 217 prototype
std::string RefreshIconButtonHtml(const std::string& id,
                                  const std::string& classes,
                                  const std::string& label);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 227 prototype
bool ParseBoolQuery(const std::unordered_map<std::string, std::string>& query,
                    const std::string& key,
                    bool default_value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 238 prototype
int ParseClampedIntQuery(const std::unordered_map<std::string, std::string>& query,
                         const std::string& key,
                         int default_value,
                         int min_value,
                         int max_value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 255 prototype
std::optional<int> ParseIntField(const std::string& body, const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 279 prototype
std::optional<bool> ParseBoolField(const std::string& body, const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 308 prototype
std::optional<std::int64_t> ParseInt64Field(const std::string& body, const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 339 prototype
std::optional<std::string> ParseStringField(const std::string& body, const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 388 prototype
// JSON 문자열에서 지정 field의 중괄호/대괄호 범위를 문자열 리터럴을 피해 추출한다.
std::optional<std::string> ExtractDelimitedField(const std::string& body,
                                                 const std::string& field,
                                                 char open_ch,
                                                 char close_ch);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 440 prototype
// JSON 문자열에서 object field 본문을 추출한다.
std::optional<std::string> ExtractObjectField(const std::string& body, const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 445 prototype
std::size_t CountJsonFieldOccurrences(const std::string& body, const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 456 prototype
bool JsonFieldIsNull(const std::string& body, const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 478 prototype
bool ReplaceObjectField(std::string* body,
                        const std::string& field,
                        const std::string& replacement);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 505 prototype
// JSON 문자열에서 array field 본문을 추출한다.
std::optional<std::string> ExtractArrayField(const std::string& body, const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 510 prototype
std::optional<std::string> ExtractDelimitedValueAt(const std::string& body,
                                                   std::size_t start,
                                                   char open_ch,
                                                   char close_ch);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 549 prototype
std::optional<std::string> ExtractJsonValueField(const std::string& body, const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 597 prototype
// string array에 공백이 아닌 실제 값이 하나 이상 있는지 확인한다.
bool StringArrayHasNonEmptyValue(const std::string& array_body);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 632 prototype
std::vector<std::string> StringArrayValues(const std::string& array_body);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 668 prototype
std::vector<std::string> StringArrayFieldValues(const std::string& body, const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 673 prototype
bool StringArrayIncludesAll(const std::vector<std::string>& source,
                            const std::vector<std::string>& required);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 681 prototype
std::string JsonStringArray(const std::vector<std::string>& values);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 694 prototype
std::vector<std::string> AnalysisClassesFromDocument(const std::string& body);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 711 prototype
std::string NormalizeTrackingPolicyToken(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 726 prototype
std::string NormalizeReidPolicyToken(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 740 prototype
std::optional<std::string> FirstStringFieldValue(const std::string& body,
                                                 const std::vector<std::string>& fields);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 751 prototype
std::optional<std::string> TrackingPolicyObjectFromRuleDocument(const std::string& body,
                                                                const std::string& analysis);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 762 prototype
bool ValidateTrackingPolicyContract(const std::string& body,
                                    const std::string& analysis,
                                    const std::string& document_label,
                                    std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 802 prototype
// object 본문 안의 string array field가 비어 있지 않은지 확인한다.
bool HasNonEmptyStringArrayField(const std::string& body, const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 808 prototype
bool LooksLikeJsonObject(const std::string& body);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 813 prototype
bool IsBuiltInAnalysisProfileId(const std::string& id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 817 prototype
std::vector<std::string> ExtractJsonObjectArray(const std::string& body, const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 870 type
struct AnalysisRegistryWriteResult {
    bool ok{false};
    std::string stage;
    std::string detail;
    bool target_replaced{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 877 type
enum class AnalysisRegistryMutationFailure {
    None,
    InvalidRequest,
    NotFound,
    Persistence,
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 884 type
struct AnalysisRegistryMutationResult {
    bool ok{false};
    AnalysisRegistryMutationFailure failure{AnalysisRegistryMutationFailure::None};
    std::string response_body;
    std::string error_message;
    std::string persistence_stage;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 892 prototype
AnalysisRegistryMutationResult AnalysisRegistrySuccess(std::string response_body);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 900 prototype
AnalysisRegistryMutationResult AnalysisRegistryFailure(AnalysisRegistryMutationFailure failure,
                                                        std::string error_message,
                                                        std::string persistence_stage = {});

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 910 prototype
std::string AnalysisRegistryFaultStage();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 915 prototype
std::string AnalysisRegistryCrashStage();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 920 prototype
std::filesystem::path AnalysisRegistryTransactionPath(const std::filesystem::path& storage_path);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 924 prototype
std::filesystem::path AnalysisRegistryRollbackPath(const std::filesystem::path& storage_path);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 928 prototype
std::filesystem::path AnalysisRegistryRestorePath(const std::filesystem::path& storage_path);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 932 prototype
bool SyncAnalysisRegistryDirectory(int directory_fd, std::string* detail);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 946 prototype
bool WriteAnalysisRegistryTransactionMarker(const std::filesystem::path& storage_path,
                                            const std::string& state,
                                            bool previous_exists,
                                            int directory_fd,
                                            std::string* detail);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 1022 prototype
bool RestoreAnalysisRegistryPreviousState(const std::filesystem::path& storage_path,
                                          bool previous_exists,
                                          int directory_fd,
                                          std::string* detail);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 1055 prototype
bool CleanupAnalysisRegistryTransaction(const std::filesystem::path& storage_path,
                                        int directory_fd,
                                        std::string* detail);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 1076 prototype
void RecoverAnalysisRegistryTemporaryFiles(const std::filesystem::path& storage_path);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 1179 prototype
// V390-REVIEW4-54는 SAFE-217/OPS-184의 mode/file/parent durability와 failure atomicity를 고정한다.
AnalysisRegistryWriteResult WriteAnalysisRegistryFileAtomically(
    const std::filesystem::path& storage_path,
    const std::string& body);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 1421 type
class AnalysisDocumentRegistry {
public:
    std::string ProfilesJson() {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::ostringstream out;
        out << "{\"status\":\"registry\",\"defaultUrl\":\"?file=...&va=1\","
            << "\"storagePath\":\"" << JsonEscape(storage_path_.string()) << "\","
            << "\"builtInProfiles\":" << BuiltInProfilesArrayJson() << ","
            << "\"profiles\":";
        AppendDocumentsArray(out, profiles_);
        out << ",\"queryOverride\":\"va=1은 기본적으로 서버 기본 VA profile을 사용한다. "
               "URL에 profileId/profile을 명시하면 해당 profile을 우선 적용하고, "
               "명시하지 않으면 현재 sourceKind/route/clientId와 맞는 rule의 analysis.profileId를 1차 자동 적용한다. "
               "fps/maxQueue/adaptive bounds 같은 고급 query가 있으면 registry 자동 profile 선택은 건너뛴다.\"}";
        return out.str();
    }

    std::string VaRulesJson() {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::ostringstream out;
        out << "{\"status\":\"registry\",\"storagePath\":\"" << JsonEscape(storage_path_.string()) << "\","
            << "\"scope\":\"저장된 vaRule은 영상 소스, 분석 profile, 이벤트 rule, scenario, geometry를 하나의 ID로 묶는다.\","
            << "\"url\":\"?vaRule=<id>\","
            << "\"trackingPolicyContract\":{\"field\":\"analysis.trackingPolicy\","
            << "\"tracker\":[\"none\",\"lite\",\"kalman-lite\",\"bytetrack\"],"
            << "\"reid\":[\"off\",\"assist\"],"
            << "\"default\":{\"tracker\":\"lite\",\"reid\":\"off\"},"
            << "\"runtimeFallback\":\"kalman-lite and bytetrack run only as rule-level opt-in runtime trackers\"},"
            << "\"vaRules\":";
        AppendDocumentsArray(out, va_rules_);
        out << "}";
        return out.str();
    }

    std::string VlmProfilesJson() {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::ostringstream out;
        out << "{\"status\":\"registry\","
            << "\"schema\":\"media-server.vlm-profile-registry.v1\","
            << "\"storagePath\":\"" << JsonEscape(storage_path_.string()) << "\","
            << "\"quarantinedProfileCount\":" << vlm_profiles_quarantined_on_load_ << ","
            << "\"scope\":\"V200-S05 stores selected VLM provider/model/runtime/prompt/privacy/evaluation/activation metadata only; V200-S11 adds privacy transfer guard review; runtime calls and sidecar writes remain later steps.\","
            << "\"promptProfiles\":["
            << "{\"id\":\"event-review-default\",\"version\":\"v1\",\"language\":\"ko-en\"},"
            << "{\"id\":\"false-positive-review\",\"version\":\"v1\",\"language\":\"ko-en\"},"
            << "{\"id\":\"operator-question-review\",\"version\":\"v1\",\"language\":\"ko-en\"}"
            << "],"
            << "\"profiles\":";
        AppendDocumentsArray(out, vlm_profiles_);
        out << "}";
        return out.str();
    }

    std::string RulesJson() {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::ostringstream out;
        out << "{\"status\":\"registry\",\"storagePath\":\"" << JsonEscape(storage_path_.string()) << "\","
            << "\"scope\":\"저장된 rule은 va=1 overlay와 /lab/analysis/taps/{id}/events에서 런타임 판정에 사용한다. "
               "sourceKind/route/clientId match 조건이 있으면 해당 분석 결과에만 적용한다.\","
            << "\"plannedRuleShape\":{\"id\":\"string\",\"enabled\":\"bool\",\"priority\":\"number\","
            << "\"match\":{\"sourceKind\":\"file|rtsp|webrtc|whep|http|hls|youtube|*\",\"route\":\"http|rtsp|webrtc|*\","
            << "\"clientId\":\"optional\"},\"analysis\":{\"profileId\":\"string\",\"detector\":\"dummy|yolo\","
            << "\"fps\":\"number\",\"maxQueue\":\"number\",\"frameSampleInterval\":\"number\","
            << "\"maxFrameAgeMs\":\"number\","
            << "\"trackingPolicy\":{\"tracker\":\"none|lite|kalman-lite|bytetrack\","
            << "\"reid\":\"off|assist\"}},\"outputs\":{\"metadata\":\"bool\","
            << "\"snapshot\":\"bool\",\"overlay\":\"bool\",\"events\":\"bool\"},"
            << "\"eventActions\":{\"highlight\":{\"enabled\":\"bool\",\"mode\":\"blink\","
            << "\"durationMs\":\"number\",\"color\":\"fixed #ff0000\"},\"post\":{\"enabled\":\"bool\","
            << "\"method\":\"POST\",\"url\":\"string\",\"payloadFormat\":\"media-server.va.event.v1\"}}},"
            << "\"rules\":";
        AppendDocumentsArray(out, rules_);
        out << ",\"scopeDecisions\":{\"automaticNonVaRuleMatching\":\"excluded-by-design\","
               "\"longRunningRtspWebRtcRouteMatching\":\"RTSP/WebRTC validation transferred-to-test-condition\"}}";
        return out.str();
    }

    std::optional<std::string> ProfileJson(const std::string& id) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        return FindDocumentLocked(profiles_, id);
    }

    std::optional<std::string> RuleJson(const std::string& id) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        return FindDocumentLocked(rules_, id);
    }

    std::optional<std::string> VaRuleJson(const std::string& id) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        return FindDocumentLocked(va_rules_, id);
    }

    std::optional<std::string> VlmProfileJson(const std::string& id) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        return FindDocumentLocked(vlm_profiles_, id);
    }

    std::vector<std::string> RuleDocuments() {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::vector<std::string> out;
        out.reserve(rules_.size());
        for (const auto& rule : rules_) {
            out.push_back(rule.body);
        }
        return out;
    }

    std::vector<std::string> VaRuleDocuments() {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::vector<std::string> out;
        out.reserve(va_rules_.size());
        for (const auto& rule : va_rules_) {
            out.push_back(rule.body);
        }
        return out;
    }

    std::vector<std::string> ProfileDocuments() {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::vector<std::string> out;
        out.reserve(profiles_.size());
        for (const auto& profile : profiles_) {
            out.push_back(profile.body);
        }
        return out;
    }

    std::vector<std::string> VlmProfileDocuments() {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::vector<std::string> out;
        out.reserve(vlm_profiles_.size());
        for (const auto& profile : vlm_profiles_) {
            out.push_back(profile.body);
        }
        return out;
    }

    AnalysisRegistryMutationResult CreateProfile(const std::string& body) {
        return CreateDocument(true, body);
    }

    AnalysisRegistryMutationResult CreateRule(const std::string& body) {
        return CreateDocument(false, body);
    }

    AnalysisRegistryMutationResult CreateVaRule(const std::string& body) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::string error_message;
        const auto prepared = PrepareVaRuleDocumentLocked("", body, &error_message);
        if (!prepared.has_value()) {
            return AnalysisRegistryFailure(AnalysisRegistryMutationFailure::InvalidRequest,
                                           error_message);
        }
        if (FindDocumentLocked(va_rules_, prepared->id).has_value()) {
            return AnalysisRegistryFailure(AnalysisRegistryMutationFailure::InvalidRequest,
                                           "vaRule id already exists");
        }
        auto candidate = va_rules_;
        candidate.push_back(*prepared);
        return PersistAndPublishLocked(profiles_,
                                       rules_,
                                       std::move(candidate),
                                       vlm_profiles_,
                                       DocumentResponseJson("vaRule", *prepared));
    }

    AnalysisRegistryMutationResult CreateVlmProfile(const std::string& body) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::string error_message;
        const auto prepared = PrepareVlmProfileDocumentLocked("", body, &error_message);
        if (!prepared.has_value()) {
            return AnalysisRegistryFailure(AnalysisRegistryMutationFailure::InvalidRequest,
                                           error_message);
        }
        if (FindDocumentLocked(vlm_profiles_, prepared->id).has_value()) {
            return AnalysisRegistryFailure(AnalysisRegistryMutationFailure::InvalidRequest,
                                           "VLM profile id already exists");
        }
        auto candidate = vlm_profiles_;
        candidate.push_back(*prepared);
        return PersistAndPublishLocked(profiles_,
                                       rules_,
                                       va_rules_,
                                       std::move(candidate),
                                       DocumentResponseJson("vlmProfile", *prepared));
    }

    AnalysisRegistryMutationResult UpsertProfile(const std::string& id, const std::string& body) {
        return UpsertDocument(true, id, body);
    }

    AnalysisRegistryMutationResult UpsertRule(const std::string& id, const std::string& body) {
        return UpsertDocument(false, id, body);
    }

    AnalysisRegistryMutationResult UpsertVaRule(const std::string& id, const std::string& body) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::string error_message;
        const auto prepared = PrepareVaRuleDocumentLocked(id, body, &error_message);
        if (!prepared.has_value()) {
            return AnalysisRegistryFailure(AnalysisRegistryMutationFailure::InvalidRequest,
                                           error_message);
        }
        auto candidate = va_rules_;
        bool updated = false;
        for (auto& item : candidate) {
            if (item.id == prepared->id) {
                item = *prepared;
                updated = true;
                break;
            }
        }
        if (!updated) {
            candidate.push_back(*prepared);
        }
        return PersistAndPublishLocked(
            profiles_,
            rules_,
            std::move(candidate),
            vlm_profiles_,
            DocumentResponseJson("vaRule", *prepared, updated ? "updated" : "created"));
    }

    AnalysisRegistryMutationResult UpsertVlmProfile(const std::string& id,
                                                    const std::string& body) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::string error_message;
        const auto prepared = PrepareVlmProfileDocumentLocked(id, body, &error_message);
        if (!prepared.has_value()) {
            return AnalysisRegistryFailure(AnalysisRegistryMutationFailure::InvalidRequest,
                                           error_message);
        }
        auto candidate = vlm_profiles_;
        bool updated = false;
        for (auto& item : candidate) {
            if (item.id == prepared->id) {
                item = *prepared;
                updated = true;
                break;
            }
        }
        if (!updated) {
            candidate.push_back(*prepared);
        }
        return PersistAndPublishLocked(
            profiles_,
            rules_,
            va_rules_,
            std::move(candidate),
            DocumentResponseJson("vlmProfile", *prepared, updated ? "updated" : "created"));
    }

    AnalysisRegistryMutationResult DeleteProfile(const std::string& id) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        if (IsBuiltInAnalysisProfileId(id)) {
            return AnalysisRegistryFailure(AnalysisRegistryMutationFailure::NotFound,
                                           "analysis profile not found or built-in");
        }
        auto candidate = profiles_;
        if (!RemoveDocumentLocked(candidate, id)) {
            return AnalysisRegistryFailure(AnalysisRegistryMutationFailure::NotFound,
                                           "analysis profile not found or built-in");
        }
        return PersistAndPublishLocked(std::move(candidate),
                                       rules_,
                                       va_rules_,
                                       vlm_profiles_,
                                       DeletedResponseJson(id));
    }

    AnalysisRegistryMutationResult DeleteRule(const std::string& id) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        auto candidate = rules_;
        if (!RemoveDocumentLocked(candidate, id)) {
            return AnalysisRegistryFailure(AnalysisRegistryMutationFailure::NotFound,
                                           "analysis rule not found");
        }
        return PersistAndPublishLocked(profiles_,
                                       std::move(candidate),
                                       va_rules_,
                                       vlm_profiles_,
                                       DeletedResponseJson(id));
    }

    AnalysisRegistryMutationResult DeleteVaRule(const std::string& id) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        auto candidate = va_rules_;
        if (!RemoveDocumentLocked(candidate, id)) {
            return AnalysisRegistryFailure(AnalysisRegistryMutationFailure::NotFound,
                                           "vaRule not found");
        }
        return PersistAndPublishLocked(profiles_,
                                       rules_,
                                       std::move(candidate),
                                       vlm_profiles_,
                                       DeletedResponseJson(id));
    }

    AnalysisRegistryMutationResult DeleteVlmProfile(const std::string& id) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        auto candidate = vlm_profiles_;
        if (!RemoveDocumentLocked(candidate, id)) {
            return AnalysisRegistryFailure(AnalysisRegistryMutationFailure::NotFound,
                                           "VLM profile not found");
        }
        return PersistAndPublishLocked(profiles_,
                                       rules_,
                                       va_rules_,
                                       std::move(candidate),
                                       DeletedResponseJson(id));
    }

private:
    struct Document {
        std::string id;
        std::string body;
    };

    static std::string BuiltInProfilesArrayJson() {
        return R"([{"id":"1","detector":"server-config","adaptive":true,"trackingClasses":["person","vehicle"],"description":"URL에는 va=1만 두고 detector/model/labels/fps 기본값은 stdafx.h/env 설정을 따른다. tracker는 기본적으로 사람/차량 카테고리에만 ID를 붙인다."},{"id":"2","detector":"dummy","fps":5,"maxQueue":2,"trackingClasses":["person","vehicle"],"description":"raw decode/sampling lifecycle 확인용"},{"id":"3","detector":"yolo","fps":8,"maxQueue":1,"preprocess":"letterbox","inputWidth":640,"inputHeight":640,"confidence":0.25,"nms":0.45,"adaptive":true,"trackingClasses":["person","vehicle"],"description":"움직임이 큰 장면의 overlay 지연 최소화"},{"id":"4","detector":"yolo","fps":5,"maxQueue":2,"preprocess":"letterbox","inputWidth":640,"inputHeight":640,"confidence":0.35,"nms":0.45,"adaptive":true,"trackingClasses":["person","vehicle"],"description":"기본 객체 감지 균형값"},{"id":"5","detector":"yolo","fps":3,"maxQueue":2,"preprocess":"letterbox","inputWidth":960,"inputHeight":960,"confidence":0.35,"nms":0.45,"adaptive":true,"trackingClasses":["person","vehicle"],"description":"정확도 우선, CPU 비용 증가"}])";
    }

    static void AppendDocumentsArray(std::ostream& out, const std::vector<Document>& documents) {
        out << "[";
        for (std::size_t i = 0; i < documents.size(); ++i) {
            if (i != 0) {
                out << ",";
            }
            out << documents[i].body;
        }
        out << "]";
    }

    void EnsureLoadedLocked() {
        if (loaded_) {
            return;
        }
        storage_path_ = GetWebRtcHttpRuntimeConfig().analysis_registry_path;
        RecoverAnalysisRegistryTemporaryFiles(storage_path_);
        loaded_ = true;
        std::ifstream in(storage_path_);
        if (!in) {
            return;
        }
        std::ostringstream buffer;
        buffer << in.rdbuf();
        const std::string content = buffer.str();
        LoadDocumentsLocked("profiles", content, &profiles_);
        LoadDocumentsLocked("rules", content, &rules_);
        LoadDocumentsLocked("vaRules", content, &va_rules_);
        LoadDocumentsLocked("vlmProfiles", content, &vlm_profiles_);
        const std::size_t loaded_rules = rules_.size();
        std::vector<Document> validated_rules;
        validated_rules.reserve(rules_.size());
        for (const auto& document : rules_) {
            std::string validation_error;
            if (ValidateVlmIncidentRuleProvenanceContract(
                    document.body, document.id, &validation_error)) {
                validated_rules.push_back(document);
            } else {
                std::cerr << "[analysis-registry] rule provenance reload quarantine id="
                          << document.id << " reason=" << validation_error << "\n";
            }
        }
        rules_ = std::move(validated_rules);
        rules_quarantined_on_load_ = loaded_rules - rules_.size();
        const std::size_t loaded_vlm_profiles = vlm_profiles_.size();
        std::vector<Document> canonical_vlm_profiles;
        canonical_vlm_profiles.reserve(vlm_profiles_.size());
        for (const auto& document : vlm_profiles_) {
            if (const auto canonical = CanonicalizeStoredVlmProfileLocked(document);
                canonical.has_value()) {
                canonical_vlm_profiles.push_back(*canonical);
            }
        }
        vlm_profiles_ = std::move(canonical_vlm_profiles);
        vlm_profiles_quarantined_on_load_ = loaded_vlm_profiles - vlm_profiles_.size();
    }

    static void LoadDocumentsLocked(const std::string& field,
                                    const std::string& content,
                                    std::vector<Document>* documents) {
        if (documents == nullptr) {
            return;
        }
        for (const auto& raw : ExtractJsonObjectArray(content, field)) {
            const auto id = ParseStringField(raw, "id");
            if (!id.has_value() || id->empty()) {
                continue;
            }
            documents->push_back(Document{*id, Trim(raw)});
        }
    }

    AnalysisRegistryMutationResult CreateDocument(bool profile, const std::string& body) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        std::string error_message;
        const auto prepared = PrepareDocumentLocked(profile, "", body, &error_message);
        if (!prepared.has_value()) {
            return AnalysisRegistryFailure(AnalysisRegistryMutationFailure::InvalidRequest,
                                           error_message);
        }
        const auto& target = profile ? profiles_ : rules_;
        if (FindDocumentLocked(target, prepared->id).has_value() ||
            (profile && IsBuiltInAnalysisProfileId(prepared->id))) {
            return AnalysisRegistryFailure(AnalysisRegistryMutationFailure::InvalidRequest,
                                           "analysis document id already exists");
        }
        if (profile) {
            auto candidate = profiles_;
            candidate.push_back(*prepared);
            return PersistAndPublishLocked(std::move(candidate),
                                           rules_,
                                           va_rules_,
                                           vlm_profiles_,
                                           DocumentResponseJson("profile", *prepared));
        }
        auto candidate = rules_;
        candidate.push_back(*prepared);
        return PersistAndPublishLocked(profiles_,
                                       std::move(candidate),
                                       va_rules_,
                                       vlm_profiles_,
                                       DocumentResponseJson("rule", *prepared));
    }

    AnalysisRegistryMutationResult UpsertDocument(bool profile,
                                                  const std::string& id,
                                                  const std::string& body) {
        std::lock_guard lock(mu_);
        EnsureLoadedLocked();
        if (profile && IsBuiltInAnalysisProfileId(id)) {
            return AnalysisRegistryFailure(AnalysisRegistryMutationFailure::InvalidRequest,
                                           "built-in profile cannot be modified");
        }
        std::string error_message;
        const auto prepared = PrepareDocumentLocked(profile, id, body, &error_message);
        if (!prepared.has_value()) {
            return AnalysisRegistryFailure(AnalysisRegistryMutationFailure::InvalidRequest,
                                           error_message);
        }
        auto candidate = profile ? profiles_ : rules_;
        bool updated = false;
        for (auto& item : candidate) {
            if (item.id == prepared->id) {
                item = *prepared;
                updated = true;
                break;
            }
        }
        if (!updated) {
            candidate.push_back(*prepared);
        }
        const std::string response_body = DocumentResponseJson(
            profile ? "profile" : "rule", *prepared, updated ? "updated" : "created");
        if (profile) {
            return PersistAndPublishLocked(std::move(candidate),
                                           rules_,
                                           va_rules_,
                                           vlm_profiles_,
                                           response_body);
        }
        return PersistAndPublishLocked(profiles_,
                                       std::move(candidate),
                                       va_rules_,
                                       vlm_profiles_,
                                       response_body);
    }

    std::optional<Document> PrepareDocumentLocked(bool profile,
                                                  const std::string& path_id,
                                                  const std::string& body,
                                                  std::string* error_message) const {
        if (!LooksLikeJsonObject(body)) {
            SetRegistryError(error_message, "request body must be a JSON object");
            return std::nullopt;
        }
        const auto id = ParseStringField(body, "id");
        if (!id.has_value() || id->empty()) {
            SetRegistryError(error_message, "analysis document requires string field 'id'");
            return std::nullopt;
        }
        if (!path_id.empty() && *id != path_id) {
            SetRegistryError(error_message, "path id and body id must match");
            return std::nullopt;
        }
        if (!std::all_of(id->begin(), id->end(), [](unsigned char ch) {
                return std::isdigit(ch) != 0;
            })) {
            SetRegistryError(error_message, profile ? "profile id must be numeric" : "rule id must be numeric");
            return std::nullopt;
        }
        if (profile && IsBuiltInAnalysisProfileId(*id)) {
            SetRegistryError(error_message, "built-in profile id is reserved");
            return std::nullopt;
        }
        // UI/API 양쪽에서 빈 카테고리 저장을 막아, 룰이 의도 없이 전체 매칭처럼 동작하지 않게 한다.
        if (profile) {
            if (const auto tracking_classes = ExtractArrayField(body, "trackingClasses");
                tracking_classes.has_value() && !StringArrayHasNonEmptyValue(*tracking_classes)) {
                SetRegistryError(error_message, "profile trackingClasses must include at least one category");
                return std::nullopt;
            }
            if (const auto tracking_classes = ParseStringField(body, "trackingClasses");
                tracking_classes.has_value() && Trim(*tracking_classes).empty()) {
                SetRegistryError(error_message, "profile trackingClasses must include at least one category");
                return std::nullopt;
            }
        } else {
            const auto analysis = ExtractObjectField(body, "analysis");
            if (!analysis.has_value() || !HasNonEmptyStringArrayField(*analysis, "classes")) {
                SetRegistryError(error_message, "rule analysis.classes must include at least one category");
                return std::nullopt;
            }
            if (!ValidateTrackingPolicyContract(body, *analysis, "rule", error_message)) {
                return std::nullopt;
            }
            if (!ValidateVlmIncidentRuleProvenanceContract(body, *id, error_message)) {
                return std::nullopt;
            }
        }
        return Document{*id, Trim(body)};
    }

    std::optional<Document> PrepareVaRuleDocumentLocked(const std::string& path_id,
                                                        const std::string& body,
                                                        std::string* error_message) const {
        if (!LooksLikeJsonObject(body)) {
            SetRegistryError(error_message, "request body must be a JSON object");
            return std::nullopt;
        }
        std::string id = ParseStringField(body, "id").value_or("");
        if (id.empty()) {
            id = path_id.empty() ? NextVaRuleIdLocked() : path_id;
        }
        if (!path_id.empty() && id != path_id) {
            SetRegistryError(error_message, "path id and body id must match");
            return std::nullopt;
        }
        if (id.empty() || !std::all_of(id.begin(), id.end(), [](unsigned char ch) {
                return std::isdigit(ch) != 0;
            })) {
            SetRegistryError(error_message, "vaRule id must be numeric");
            return std::nullopt;
        }
        const auto source = ExtractObjectField(body, "source");
        if (!source.has_value()) {
            SetRegistryError(error_message, "vaRule requires object field 'source'");
            return std::nullopt;
        }
        const std::string source_kind = ParseStringField(*source, "kind").value_or("");
        if (source_kind.empty()) {
            SetRegistryError(error_message, "vaRule source.kind is required");
            return std::nullopt;
        }
        if (source_kind == "file") {
            if (!ParseStringField(*source, "file").has_value() ||
                Trim(*ParseStringField(*source, "file")).empty()) {
                SetRegistryError(error_message, "vaRule source.file is required for file source");
                return std::nullopt;
            }
        } else if (!ParseStringField(*source, "url").has_value() ||
                   Trim(*ParseStringField(*source, "url")).empty()) {
            SetRegistryError(error_message, "vaRule source.url is required for non-file source");
            return std::nullopt;
        }
        const auto analysis = ExtractObjectField(body, "analysis");
        if (!analysis.has_value() || !HasNonEmptyStringArrayField(*analysis, "classes")) {
            SetRegistryError(error_message, "vaRule analysis.classes must include at least one category");
            return std::nullopt;
        }
        if (!ValidateTrackingPolicyContract(body, *analysis, "vaRule", error_message)) {
            return std::nullopt;
        }
        const std::vector<std::string> va_rule_classes = StringArrayFieldValues(*analysis, "classes");
        const std::string profile_id = Trim(ParseStringField(*analysis, "profileId").value_or(""));
        if (profile_id.empty()) {
            SetRegistryError(error_message, "vaRule analysis.profileId is required");
            return std::nullopt;
        }
        if (!ProfileExistsLocked(profile_id)) {
            SetRegistryError(error_message, "vaRule analysis.profileId does not exist");
            return std::nullopt;
        }
        const auto profile_document = FindDocumentLocked(profiles_, profile_id);
        if (profile_document.has_value() &&
            ParseBoolField(*profile_document, "enabled").has_value() &&
            !ParseBoolField(*profile_document, "enabled").value()) {
            SetRegistryError(error_message, "vaRule analysis.profileId is inactive");
            return std::nullopt;
        }
        const auto template_start = ExtractObjectField(body, "templateStart");
        const std::string template_rule_id =
            template_start.has_value() ? Trim(ParseStringField(*template_start, "ruleId").value_or(""))
                                       : std::string();
        if (template_rule_id.empty()) {
            SetRegistryError(error_message, "vaRule requires templateStart.ruleId");
            return std::nullopt;
        }
        const auto template_document = FindDocumentLocked(rules_, template_rule_id);
        if (!template_document.has_value()) {
            SetRegistryError(error_message, "vaRule templateStart.ruleId does not exist");
            return std::nullopt;
        }
        if (ParseBoolField(*template_document, "enabled").has_value() &&
            !ParseBoolField(*template_document, "enabled").value()) {
            SetRegistryError(error_message, "vaRule templateStart.ruleId is inactive");
            return std::nullopt;
        }
        const std::vector<std::string> template_classes = AnalysisClassesFromDocument(*template_document);
        if (!template_classes.empty() && !StringArrayIncludesAll(va_rule_classes, template_classes)) {
            SetRegistryError(error_message,
                             "vaRule analysis.classes must include template analysis.classes");
            return std::nullopt;
        }
        if (profile_document.has_value()) {
            const std::vector<std::string> profile_classes = AnalysisClassesFromDocument(*profile_document);
            if (!profile_classes.empty() &&
                !StringArrayIncludesAll(profile_classes, template_classes)) {
                SetRegistryError(error_message,
                                 "vaRule profile classes must include template analysis.classes");
                return std::nullopt;
            }
        }
        const auto source_key_for = [](const std::string& source_json) {
            const std::string kind = Trim(ParseStringField(source_json, "kind").value_or(""));
            const std::string locator = kind == "file"
                                            ? Trim(ParseStringField(source_json, "file").value_or(""))
                                            : Trim(ParseStringField(source_json, "url").value_or(""));
            return kind + ":" + locator;
        };
        const std::string requested_source_key = source_key_for(*source);
        const int requested_priority = ParseIntField(body, "priority").value_or(0);
        for (const auto& existing_rule : va_rules_) {
            if (existing_rule.id == id) {
                continue;
            }
            if (ParseBoolField(existing_rule.body, "enabled").has_value() &&
                !ParseBoolField(existing_rule.body, "enabled").value()) {
                continue;
            }
            const auto existing_source = ExtractObjectField(existing_rule.body, "source");
            if (!existing_source.has_value() || source_key_for(*existing_source) != requested_source_key) {
                continue;
            }
            const int existing_priority = ParseIntField(existing_rule.body, "priority").value_or(0);
            if (existing_priority == requested_priority) {
                SetRegistryError(error_message, "vaRule priority conflicts with existing rule on same source");
                return std::nullopt;
            }
        }
        std::string normalized = Trim(body);
        if (!ParseStringField(normalized, "id").has_value()) {
            normalized.insert(normalized.find('{') + 1, "\"id\":\"" + JsonEscape(id) + "\",");
        }
        if (!ExtractObjectField(normalized, "match").has_value()) {
            normalized.insert(normalized.find('{') + 1,
                              "\"match\":{\"sourceKind\":\"*\",\"route\":\"*\",\"vaRule\":\"" +
                                  JsonEscape(id) + "\"},");
        }
        return Document{id, normalized};
    }

    std::optional<Document> PrepareVlmProfileDocumentLocked(const std::string& path_id,
                                                            const std::string& body,
                                                            std::string* error_message) const {
        StrictJsonObjectDocument profile_document;
        std::string parse_error;
        if (!ParseStrictJsonObjectDocument(body, &profile_document, &parse_error)) {
            SetRegistryError(error_message, "VLM profile JSON is invalid: " + parse_error);
            return std::nullopt;
        }
        bool contains_forbidden_field = false;
        for (const std::string& field :
             {"apiKey", "credential", "providerCredential", "prompt", "rawPrompt",
              "rawResponse", "sourceUrl", "sourceLocator", "imageData", "frameBytes"}) {
            if (StrictJsonContainsKey(profile_document, field)) {
                contains_forbidden_field = true;
                break;
            }
        }
        if (contains_forbidden_field) {
            SetRegistryError(error_message, "VLM profile must not include credentials, prompts, raw responses, source locators, or frame bytes");
            return std::nullopt;
        }
        if (StrictJsonStringField(profile_document, "schema").value_or("") != "media-server.vlm-profile.v1") {
            SetRegistryError(error_message, "VLM profile schema must be media-server.vlm-profile.v1");
            return std::nullopt;
        }
        const std::string id = Trim(StrictJsonStringField(profile_document, "id").value_or(""));
        if (id.empty() || !IsSafeVlmProfileId(id)) {
            SetRegistryError(error_message, "VLM profile id must use letters, numbers, dot, dash, or underscore");
            return std::nullopt;
        }
        if (!path_id.empty() && id != path_id) {
            SetRegistryError(error_message, "path id and body id must match");
            return std::nullopt;
        }
        const std::string selected_option_id = Trim(StrictJsonStringField(profile_document, "selectedOptionId").value_or(""));
        if (selected_option_id.empty() || !IsSafeVlmProfileId(selected_option_id)) {
            SetRegistryError(error_message, "VLM profile selectedOptionId is required");
            return std::nullopt;
        }
        const std::string provider = Trim(StrictJsonStringField(profile_document, "provider").value_or(""));
        const std::string model = Trim(StrictJsonStringField(profile_document, "model").value_or(""));
        const std::string runtime = Trim(StrictJsonStringField(profile_document, "runtime").value_or(""));
        const std::string privacy_mode = Trim(StrictJsonStringField(profile_document, "privacyMode").value_or(""));
        if (!IsOneOf(provider, {"user-supplied-local-runtime", "cloud-provider-api"})) {
            SetRegistryError(error_message, "VLM profile provider is not supported");
            return std::nullopt;
        }
        if (!IsOneOf(model,
                     {"Qwen/Qwen3-VL-4B-Instruct",
                      "Qwen/Qwen3-VL-8B-Instruct",
                      "Qwen/Qwen3-VL-30B-A3B-Instruct",
                      "gemini-2.5-flash"})) {
            SetRegistryError(error_message, "VLM profile model is not supported");
            return std::nullopt;
        }
        if (!IsOneOf(runtime, {"ollama", "vllm", "provider-api", "not-configured"})) {
            SetRegistryError(error_message, "VLM profile runtime is not supported");
            return std::nullopt;
        }
        if (!IsOneOf(privacy_mode, {"local-only", "cloud-disabled", "cloud-allowed"})) {
            SetRegistryError(error_message, "VLM profile privacyMode is not supported");
            return std::nullopt;
        }
        const bool cloud_opt_in_acknowledged = StrictJsonBoolField(profile_document, "cloudOptInAcknowledged").value_or(false);
        if (provider == "cloud-provider-api") {
            if (model != "gemini-2.5-flash" || runtime != "provider-api" ||
                privacy_mode != "cloud-allowed" || !cloud_opt_in_acknowledged) {
                SetRegistryError(error_message, "cloud VLM profile requires gemini-2.5-flash, provider-api runtime, cloud-allowed privacy, and opt-in acknowledgement");
                return std::nullopt;
            }
        } else if (model == "gemini-2.5-flash" || runtime == "provider-api") {
            SetRegistryError(error_message, "local VLM profile must not use cloud model or provider-api runtime");
            return std::nullopt;
        }
        if (!ValidateVlmPrivacyGuardContract(body, provider == "cloud-provider-api", error_message)) {
            return std::nullopt;
        }
        const auto prompt_profile = StrictJsonObjectField(profile_document, "promptProfile");
        StrictJsonObjectDocument prompt_profile_document;
        if (prompt_profile.has_value() &&
            !ParseStrictJsonObjectDocument(*prompt_profile, &prompt_profile_document, &parse_error)) {
            SetRegistryError(error_message, "VLM profile promptProfile JSON is invalid: " + parse_error);
            return std::nullopt;
        }
        const std::string prompt_profile_id =
            prompt_profile.has_value() ? Trim(StrictJsonStringField(prompt_profile_document, "id").value_or("")) : std::string();
        const std::string prompt_profile_version =
            prompt_profile.has_value() ? Trim(StrictJsonStringField(prompt_profile_document, "version").value_or("")) : std::string();
        const std::string prompt_profile_language =
            prompt_profile.has_value() ? Trim(StrictJsonStringField(prompt_profile_document, "language").value_or("")) : std::string();
        if (!prompt_profile.has_value() || prompt_profile_id.empty()) {
            SetRegistryError(error_message, "VLM profile promptProfile.id is required");
            return std::nullopt;
        }
        const auto evaluation = StrictJsonObjectField(profile_document, "evaluation");
        StrictJsonObjectDocument evaluation_document;
        if (!evaluation.has_value() ||
            !ParseStrictJsonObjectDocument(*evaluation, &evaluation_document, &parse_error) ||
            !StrictJsonHasTopLevelField(evaluation_document, "candidateId") ||
            !StrictJsonHasTopLevelField(evaluation_document, "expectedCatalogRevision") ||
            !StrictJsonHasTopLevelField(evaluation_document, "expectedProvenanceDigest")) {
            SetRegistryError(error_message,
                             "VLM profile evaluation requires candidateId, expectedCatalogRevision, and expectedProvenanceDigest");
            return std::nullopt;
        }
        bool client_declared_result_fields = false;
        for (const std::string& field :
             {"status", "source", "workflowSchema", "sourceReportSchema", "caseIds", "dimensions", "score", "provenance"}) {
            if (StrictJsonHasTopLevelField(evaluation_document, field)) {
                client_declared_result_fields = true;
                break;
            }
        }
        const VlmEvaluationPromotionResult evaluation_promotion = ValidateVlmEvaluationPromotion({
            Trim(StrictJsonStringField(evaluation_document, "candidateId").value_or("")),
            Trim(StrictJsonStringField(evaluation_document, "expectedCatalogRevision").value_or("")),
            Trim(StrictJsonStringField(evaluation_document, "expectedProvenanceDigest").value_or("")),
            selected_option_id,
            model,
            prompt_profile_id,
            prompt_profile_version,
            prompt_profile_language,
            client_declared_result_fields,
        });
        if (!evaluation_promotion.accepted) {
            SetRegistryError(error_message, evaluation_promotion.error);
            return std::nullopt;
        }
        const std::string evaluation_status = evaluation_promotion.evaluation_status;
        const auto activation = StrictJsonObjectField(profile_document, "activation");
        if (!activation.has_value()) {
            SetRegistryError(error_message, "VLM profile activation object is required");
            return std::nullopt;
        }
        StrictJsonObjectDocument activation_document;
        if (!ParseStrictJsonObjectDocument(*activation, &activation_document, &parse_error)) {
            SetRegistryError(error_message, "VLM profile activation JSON is invalid: " + parse_error);
            return std::nullopt;
        }
        const std::string activation_status = Trim(StrictJsonStringField(activation_document, "status").value_or(""));
        const bool activation_enabled = StrictJsonBoolField(activation_document, "enabled").value_or(false);
        const std::string fallback_profile_id =
            Trim(StrictJsonStringField(activation_document, "fallbackProfileId").value_or(""));
        const std::string disabled_reason =
            Trim(StrictJsonStringField(activation_document, "disabledReason").value_or(""));
        if (!IsOneOf(activation_status, {"pending-evaluation", "active", "disabled", "fallback"})) {
            SetRegistryError(error_message, "VLM profile activation.status is not supported");
            return std::nullopt;
        }
        if (activation_enabled && (evaluation_status != "passed" || activation_status != "active")) {
            SetRegistryError(error_message, "enabled VLM profile requires passed evaluation and active activation");
            return std::nullopt;
        }
        if (!activation_enabled && activation_status == "active") {
            SetRegistryError(error_message, "active VLM profile must be enabled");
            return std::nullopt;
        }
        if (activation_status == "disabled" && disabled_reason.empty()) {
            SetRegistryError(error_message, "disabled VLM profile requires disabledReason");
            return std::nullopt;
        }
        if (activation_status == "fallback") {
            if (fallback_profile_id.empty() || !IsSafeVlmProfileId(fallback_profile_id) ||
                fallback_profile_id == id) {
                SetRegistryError(error_message, "fallback VLM profile requires a different fallbackProfileId");
                return std::nullopt;
            }
        }
        if (!ValidateVlmRuntimeOptInContract(body,
                                             provider,
                                             runtime,
                                             activation_enabled,
                                             activation_status,
                                             error_message)) {
            return std::nullopt;
        }
        const auto invariants = StrictJsonObjectField(profile_document, "contractInvariants");
        if (!invariants.has_value()) {
            SetRegistryError(error_message, "VLM profile contractInvariants object is required");
            return std::nullopt;
        }
        StrictJsonObjectDocument invariants_document;
        if (!ParseStrictJsonObjectDocument(*invariants, &invariants_document, &parse_error)) {
            SetRegistryError(error_message, "VLM profile contractInvariants JSON is invalid: " + parse_error);
            return std::nullopt;
        }
        for (const std::string& field :
             {"runtimeVlmCallPerformed",
              "sidecarStored",
              "cloudProviderApiCalled",
              "credentialStored",
              "eventPostPayloadChanged",
              "webrtcDataChannelSchemaChanged",
              "sseMetadataSchemaChanged",
              "wsMetadataSchemaChanged",
              "rtspOrWebrtcMediaPathChanged",
              "viewerClientExposureAdded"}) {
            if (StrictJsonBoolField(invariants_document, field).value_or(true)) {
                SetRegistryError(error_message, "VLM profile invariant must be false: " + field);
                return std::nullopt;
            }
        }
        std::string normalized = Trim(body);
        if (!ReplaceObjectField(&normalized, "evaluation", evaluation_promotion.canonical_evaluation_json)) {
            SetRegistryError(error_message, "VLM profile evaluation canonicalization failed");
            return std::nullopt;
        }
        return ValidateCanonicalVlmProfileEnvelopeLocked(id, normalized, error_message) ? std::optional<Document>(Document{id, normalized}) : std::nullopt;
    }

    static bool IsSafeVlmProfileId(const std::string& value) {
        return !value.empty() &&
               std::all_of(value.begin(), value.end(), [](unsigned char ch) {
                   return std::isalnum(ch) != 0 || ch == '.' || ch == '-' || ch == '_';
               });
    }

    static bool IsOneOf(const std::string& value, std::initializer_list<const char*> allowed) {
        return std::any_of(allowed.begin(), allowed.end(), [&](const char* item) {
            return value == item;
        });
    }

    static bool ValidateVlmRuntimeOptInContract(const std::string& body,
                                                const std::string& provider,
                                                const std::string& runtime,
                                                bool activation_enabled,
                                                const std::string& activation_status,
                                                std::string* error_message) {
        StrictJsonObjectDocument profile_document;
        std::string parse_error;
        if (!ParseStrictJsonObjectDocument(body, &profile_document, &parse_error)) {
            SetRegistryError(error_message, "VLM profile JSON is invalid: " + parse_error);
            return false;
        }
        const auto contract = StrictJsonObjectField(profile_document, "runtimeContract");
        if (!contract.has_value()) {
            SetRegistryError(error_message, "VLM profile runtimeContract object is required");
            return false;
        }
        StrictJsonObjectDocument contract_document;
        if (!ParseStrictJsonObjectDocument(*contract, &contract_document, &parse_error)) {
            SetRegistryError(error_message, "VLM runtimeContract JSON is invalid: " + parse_error);
            return false;
        }
        if (StrictJsonStringField(contract_document, "schema").value_or("") !=
            "media-server.vlm-runtime-opt-in-contract.v1") {
            SetRegistryError(error_message,
                             "VLM runtimeContract schema must be media-server.vlm-runtime-opt-in-contract.v1");
            return false;
        }
        const std::string mode = Trim(StrictJsonStringField(contract_document, "mode").value_or(""));
        const std::string status = Trim(StrictJsonStringField(contract_document, "status").value_or(""));
        if (!IsOneOf(mode, {"disabled", "local-runtime", "cloud-provider"})) {
            SetRegistryError(error_message, "VLM runtimeContract mode is not supported");
            return false;
        }
        if (!IsOneOf(status,
                     {"disabled",
                      "local-runtime",
                      "cloud-provider",
                      "missing-model",
                      "invalid-output",
                      "timeout"})) {
            SetRegistryError(error_message, "VLM runtimeContract status is not supported");
            return false;
        }
        if (StrictJsonBoolField(contract_document, "defaultEnabled").value_or(true)) {
            SetRegistryError(error_message, "VLM runtimeContract defaultEnabled must be false");
            return false;
        }
        if (!StrictJsonBoolField(contract_document, "operatorOptInRequired").value_or(false)) {
            SetRegistryError(error_message, "VLM runtimeContract requires operator opt-in");
            return false;
        }
        if (StrictJsonBoolField(contract_document, "runtimeCallAllowed").value_or(true)) {
            SetRegistryError(error_message, "VLM runtimeContract runtimeCallAllowed must be false in V210-S01");
            return false;
        }
        if (StrictJsonBoolField(contract_document, "providerCallAllowed").value_or(true)) {
            SetRegistryError(error_message, "VLM runtimeContract providerCallAllowed must be false in V210-S01");
            return false;
        }
        const bool cloud_profile = provider == "cloud-provider-api";
        if (cloud_profile && mode != "cloud-provider") {
            SetRegistryError(error_message, "cloud VLM profile requires cloud-provider runtimeContract mode");
            return false;
        }
        if (!cloud_profile && mode == "cloud-provider") {
            SetRegistryError(error_message, "local VLM profile must not use cloud-provider runtimeContract mode");
            return false;
        }
        if (status == "cloud-provider" && !cloud_profile) {
            SetRegistryError(error_message, "cloud-provider runtimeContract status requires cloud provider profile");
            return false;
        }
        if (status == "local-runtime" && (cloud_profile || runtime == "provider-api" || runtime == "not-configured")) {
            SetRegistryError(error_message, "local-runtime status requires a configured local runtime");
            return false;
        }
        if (status == "missing-model" && cloud_profile) {
            SetRegistryError(error_message, "missing-model runtimeContract status is local-runtime only");
            return false;
        }
        if ((status == "disabled" || status == "missing-model" || status == "invalid-output" ||
             status == "timeout") &&
            activation_enabled) {
            SetRegistryError(error_message, "VLM runtimeContract failure or disabled status must not be enabled");
            return false;
        }
        if (status == "disabled" && activation_status == "active") {
            SetRegistryError(error_message, "disabled VLM runtimeContract must not have active activation");
            return false;
        }
        if (mode == "disabled" && status != "disabled") {
            SetRegistryError(error_message, "disabled VLM runtimeContract mode requires disabled status");
            return false;
        }
        const auto side_effects = StrictJsonObjectField(contract_document, "sideEffects");
        if (!side_effects.has_value()) {
            SetRegistryError(error_message, "VLM runtimeContract sideEffects object is required");
            return false;
        }
        StrictJsonObjectDocument side_effects_document;
        if (!ParseStrictJsonObjectDocument(*side_effects, &side_effects_document, &parse_error)) {
            SetRegistryError(error_message, "VLM runtimeContract sideEffects JSON is invalid: " + parse_error);
            return false;
        }
        for (const std::string& field :
             {"runtimeVlmCallPerformed",
              "cloudProviderApiCalled",
              "modelArtifactDownloaded",
              "modelArtifactBundled",
              "credentialStored",
              "sidecarStored",
              "eventPostPayloadChanged",
              "webrtcDataChannelSchemaChanged",
              "sseMetadataSchemaChanged",
              "wsMetadataSchemaChanged",
              "rtspOrWebrtcMediaPathChanged",
              "viewerClientExposureAdded"}) {
            if (StrictJsonBoolField(side_effects_document, field).value_or(true)) {
                SetRegistryError(error_message, "VLM runtimeContract side effect must be false: " + field);
                return false;
            }
        }
        return true;
    }

    static bool ValidateVlmPrivacyGuardContract(const std::string& body,
                                                bool cloud_profile,
                                                std::string* error_message) {
        StrictJsonObjectDocument profile_document;
        std::string parse_error;
        if (!ParseStrictJsonObjectDocument(body, &profile_document, &parse_error)) {
            SetRegistryError(error_message, "VLM profile JSON is invalid: " + parse_error);
            return false;
        }
        const auto guard = StrictJsonObjectField(profile_document, "privacyGuard");
        if (!guard.has_value()) {
            if (cloud_profile) {
                SetRegistryError(error_message, "cloud VLM profile requires privacyGuard review");
                return false;
            }
            return true;
        }
        StrictJsonObjectDocument guard_document;
        if (!ParseStrictJsonObjectDocument(*guard, &guard_document, &parse_error)) {
            SetRegistryError(error_message, "VLM privacyGuard JSON is invalid: " + parse_error);
            return false;
        }
        if (StrictJsonStringField(guard_document, "schema").value_or("") != "media-server.vlm-privacy-transfer-guard.v1") {
            SetRegistryError(error_message, "VLM privacyGuard schema must be media-server.vlm-privacy-transfer-guard.v1");
            return false;
        }
        const bool external_transfer = StrictJsonBoolField(guard_document, "externalTransfer").value_or(cloud_profile);
        if (external_transfer != cloud_profile) {
            SetRegistryError(error_message, "VLM privacyGuard externalTransfer must match provider type");
            return false;
        }
        if (cloud_profile && !StrictJsonBoolField(guard_document, "externalTransferWarningAcknowledged").value_or(false)) {
            SetRegistryError(error_message, "cloud VLM profile requires external transfer warning acknowledgement");
            return false;
        }
        const auto redaction = StrictJsonObjectField(guard_document, "redaction");
        if (!redaction.has_value()) {
            SetRegistryError(error_message, "VLM privacyGuard redaction object is required");
            return false;
        }
        StrictJsonObjectDocument redaction_document;
        if (!ParseStrictJsonObjectDocument(*redaction, &redaction_document, &parse_error)) {
            SetRegistryError(error_message, "VLM privacyGuard redaction JSON is invalid: " + parse_error);
            return false;
        }
        for (const std::string& field :
             {"credentialMaterialStored",
              "promptStored",
              "rawProviderResponseStored",
              "sourceUrlStored",
              "rawFrameBytesStored",
              "viewerClientExposureAdded"}) {
            if (StrictJsonBoolField(redaction_document, field).value_or(true)) {
                SetRegistryError(error_message, "VLM privacyGuard redaction field must be false: " + field);
                return false;
            }
        }
        const auto provider_logging = StrictJsonObjectField(guard_document, "providerLoggingPolicy");
        if (cloud_profile) {
            if (!provider_logging.has_value()) {
                SetRegistryError(error_message, "cloud VLM profile requires providerLoggingPolicy review");
                return false;
            }
            StrictJsonObjectDocument provider_logging_document;
            if (!ParseStrictJsonObjectDocument(*provider_logging, &provider_logging_document, &parse_error)) {
                SetRegistryError(error_message, "VLM providerLoggingPolicy JSON is invalid: " + parse_error);
                return false;
            }
            if (StrictJsonStringField(provider_logging_document, "reviewStatus").value_or("") != "accepted" ||
                !StrictJsonBoolField(provider_logging_document, "loggingAndRetentionReviewed").value_or(false) ||
                !StrictJsonBoolField(provider_logging_document, "termsReviewed").value_or(false)) {
                SetRegistryError(error_message, "cloud VLM profile requires accepted provider logging and retention review");
                return false;
            }
        }
        return true;
    }

    static bool ValidateCanonicalVlmProfileEnvelopeLocked(const std::string& expected_id, const std::string& body, std::string* error_message);
    static std::optional<Document> CanonicalizeStoredVlmProfileLocked(const Document& document) {
        StrictJsonObjectDocument profile_document;
        std::string parse_error;
        if (!ParseStrictJsonObjectDocument(document.body, &profile_document, &parse_error)) {
            std::cerr << "[vlm-profile-quarantine] id=" << document.id
                      << " validation=VLM profile JSON is invalid: " << parse_error << "\n";
            return std::nullopt;
        }
        const auto evaluation = StrictJsonObjectField(profile_document, "evaluation");
        const auto prompt_profile = StrictJsonObjectField(profile_document, "promptProfile");
        StrictJsonObjectDocument evaluation_document;
        StrictJsonObjectDocument prompt_profile_document;
        if (!evaluation.has_value() || !prompt_profile.has_value() ||
            !ParseStrictJsonObjectDocument(*evaluation, &evaluation_document, &parse_error) ||
            !ParseStrictJsonObjectDocument(*prompt_profile, &prompt_profile_document, &parse_error) ||
            StrictJsonStringField(evaluation_document, "source").value_or("") !=
                "server-verified-evaluation-catalog") {
            std::cerr << "[vlm-profile-quarantine] id=" << document.id
                      << " validation=missing server canonical evaluation\n";
            return std::nullopt;
        }
        const bool no_candidate = StrictJsonFieldIsNull(evaluation_document, "candidateId");
        const std::string candidate_id = no_candidate
                                             ? std::string()
                                             : Trim(StrictJsonStringField(evaluation_document, "candidateId").value_or(""));
        const auto provenance = StrictJsonObjectField(evaluation_document, "provenance");
        if (!provenance.has_value()) {
            std::cerr << "[vlm-profile-quarantine] id=" << document.id
                      << " validation=missing server provenance\n";
            return std::nullopt;
        }
        StrictJsonObjectDocument provenance_document;
        if (!ParseStrictJsonObjectDocument(*provenance, &provenance_document, &parse_error)) {
            std::cerr << "[vlm-profile-quarantine] id=" << document.id
                      << " validation=invalid server provenance JSON\n";
            return std::nullopt;
        }
        const VlmEvaluationPromotionResult validation = ValidateVlmEvaluationPromotion({
            candidate_id,
            candidate_id.empty()
                ? std::string()
                : Trim(StrictJsonStringField(provenance_document, "catalogRevision").value_or("")),
            candidate_id.empty()
                ? std::string()
                : Trim(StrictJsonStringField(provenance_document, "candidateDigest").value_or("")),
            Trim(StrictJsonStringField(profile_document, "selectedOptionId").value_or("")),
            Trim(StrictJsonStringField(profile_document, "model").value_or("")),
            Trim(StrictJsonStringField(prompt_profile_document, "id").value_or("")),
            Trim(StrictJsonStringField(prompt_profile_document, "version").value_or("")),
            Trim(StrictJsonStringField(prompt_profile_document, "language").value_or("")),
            false,
        });
        if (!validation.accepted) {
            std::cerr << "[vlm-profile-quarantine] id=" << document.id
                      << " validation=" << validation.error << "\n";
            return std::nullopt;
        }
        std::string canonical_body = document.body;
        if (!ReplaceObjectField(&canonical_body,
                                "evaluation",
                                validation.canonical_evaluation_json)) {
            std::cerr << "[vlm-profile-quarantine] id=" << document.id
                      << " validation=canonical replacement failed\n";
            return std::nullopt;
        }
        std::string envelope_error; if (!ValidateCanonicalVlmProfileEnvelopeLocked(document.id, canonical_body, &envelope_error)) { std::cerr << "[vlm-profile-quarantine] id=" << document.id << " reason=" << envelope_error << "\n"; return std::nullopt; } return Document{document.id, canonical_body};
    }

    std::string NextVaRuleIdLocked() const {
        std::uint64_t next_id = 1;
        for (const auto& item : va_rules_) {
            char* end = nullptr;
            const unsigned long long parsed = std::strtoull(item.id.c_str(), &end, 10);
            if (end != item.id.c_str() && *end == '\0') {
                next_id = std::max(next_id, static_cast<std::uint64_t>(parsed) + 1);
            }
        }
        return std::to_string(next_id);
    }

    static std::optional<std::string> FindDocumentLocked(const std::vector<Document>& documents,
                                                         const std::string& id) {
        for (const auto& item : documents) {
            if (item.id == id) {
                return item.body;
            }
        }
        return std::nullopt;
    }

    bool ProfileExistsLocked(const std::string& id) const {
        return IsBuiltInAnalysisProfileId(id) || FindDocumentLocked(profiles_, id).has_value();
    }

    static bool RemoveDocumentLocked(std::vector<Document>& documents, const std::string& id) {
        const auto old_size = documents.size();
        documents.erase(std::remove_if(documents.begin(),
                                       documents.end(),
                                       [&id](const Document& item) { return item.id == id; }),
                        documents.end());
        return documents.size() != old_size;
    }

    static std::string DocumentResponseJson(const std::string& key,
                                            const Document& document,
                                            const std::string& status = "created") {
        return "{\"ok\":true,\"status\":\"" + JsonEscape(status) + "\",\"" + key + "\":" + document.body + "}";
    }

    static std::string DeletedResponseJson(const std::string& id) {
        return "{\"ok\":true,\"deleted\":\"" + JsonEscape(id) + "\"}";
    }

    static void SetRegistryError(std::string* error_message, const std::string& message) {
        if (error_message != nullptr) {
            *error_message = message;
        }
    }

    static std::string SerializeRegistry(const std::vector<Document>& profiles,
                                         const std::vector<Document>& rules,
                                         const std::vector<Document>& va_rules,
                                         const std::vector<Document>& vlm_profiles) {
        std::ostringstream out;
        out << "{\n  \"profiles\": ";
        AppendDocumentsArray(out, profiles);
        out << ",\n  \"rules\": ";
        AppendDocumentsArray(out, rules);
        out << ",\n  \"vaRules\": ";
        AppendDocumentsArray(out, va_rules);
        out << ",\n  \"vlmProfiles\": ";
        AppendDocumentsArray(out, vlm_profiles);
        out << "\n}\n";
        return out.str();
    }

    AnalysisRegistryMutationResult PersistAndPublishLocked(
        std::vector<Document> candidate_profiles,
        std::vector<Document> candidate_rules,
        std::vector<Document> candidate_va_rules,
        std::vector<Document> candidate_vlm_profiles,
        std::string response_body) {
        const AnalysisRegistryWriteResult write_result = WriteAnalysisRegistryFileAtomically(
            storage_path_,
            SerializeRegistry(candidate_profiles,
                              candidate_rules,
                              candidate_va_rules,
                              candidate_vlm_profiles));
        if (!write_result.ok) {
            std::cerr << "[analysis-registry] persistence failure stage=" << write_result.stage
                      << " detail=" << write_result.detail << "\n";
            return AnalysisRegistryFailure(AnalysisRegistryMutationFailure::Persistence,
                                           "analysis registry persistence failed",
                                           write_result.stage);
        }
        profiles_ = std::move(candidate_profiles);
        rules_ = std::move(candidate_rules);
        va_rules_ = std::move(candidate_va_rules);
        vlm_profiles_ = std::move(candidate_vlm_profiles);
        return AnalysisRegistrySuccess(std::move(response_body));
    }

    mutable std::mutex mu_;
    bool loaded_{false};
    std::filesystem::path storage_path_;
    std::vector<Document> profiles_;
    std::vector<Document> rules_;
    std::vector<Document> va_rules_;
    std::vector<Document> vlm_profiles_;
    std::size_t rules_quarantined_on_load_{0};
    std::size_t vlm_profiles_quarantined_on_load_{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2707 prototype
AnalysisDocumentRegistry& AnalysisRegistry();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2712 type
struct HttpRequest {
    std::string method;
    std::string target;
    std::string path;
    std::string query;
    std::unordered_map<std::string, std::string> headers;
    std::string body;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2721 type
struct HttpResponse {
    int status{200};
    std::string status_text{"OK"};
    std::string content_type{"text/plain; charset=utf-8"};
    std::unordered_map<std::string, std::string> headers;
    std::string body;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2732 constant
constexpr const char* kCorsAllowHeaders = "Content-Type, Authorization, X-Session-Capability";

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2733 constant
constexpr const char* kCorsAllowMethods = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2735 prototype
void EraseHeaderCaseInsensitive(std::unordered_map<std::string, std::string>* headers,
                                const std::string& key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2750 prototype
std::string CorsRequestOrigin(const HttpRequest& request);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2758 prototype
std::string RequestHostForOriginCheck(const HttpRequest& request);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2770 prototype
bool IsCorsOriginAllowed(const HttpRequest& request);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2782 prototype
bool IsCorsOriginDenied(const HttpRequest& request);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2786 prototype
bool VaryHeaderHasOrigin(const std::string& vary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2797 prototype
void AddCorsHeadersForRequest(const HttpRequest* request, HttpResponse* response);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2819 prototype
void AppendCorsHeaderLines(std::ostringstream& out, const HttpRequest& request);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2830 prototype
HttpResponse CorsForbiddenResponse();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2838 prototype
HttpResponse CorsPreflightResponse(const HttpRequest& request);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2847 prototype
std::string BuildHttpResponse(const HttpResponse& response, const HttpRequest* request = nullptr);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2863 prototype
HttpResponse PlainTextResponse(int status, const std::string& status_text, const std::string& body);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2867 prototype
bool ParseHttpContentLength(std::string value, std::size_t* content_length);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2890 prototype
ssize_t RecvHttpBytes(int client_fd, char* buffer, std::size_t buffer_size);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2900 prototype
bool IsRecvTimeout();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2904 prototype
void SetHttpSocketTimeouts(int client_fd);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 2912 prototype
std::optional<HttpRequest> ReadHttpRequest(int client_fd, HttpResponse* error_response);

}  // namespace webrtc_http_server_detail

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3020 type
struct WebRtcHttpServer::Impl {
    struct SessionEntry {
        std::string session_id;
        std::string ingress_client_id;
        std::string analysis_tap_id;
        std::string session_capability;
        auth::Principal owner_principal;
        media::IngressRequest request;
        std::shared_ptr<WebRtcEgressSession> bridge;
    };

    struct SourceSessionEntry {
        std::string session_id;
        std::string source_id;
        std::string session_capability;
        auth::Principal owner_principal;
        std::shared_ptr<WebRtcSourceSession> bridge;
    };

    struct ClientSessionEntry {
        std::string client_session_id;
        std::string view_id;
        std::string session_id;
        auth::Principal owner_principal;
    };

    struct AuthSessionEntry {
        std::string session_id;
        auth::Principal principal;
        std::chrono::system_clock::time_point expires_at;
        std::chrono::system_clock::time_point last_seen_at;
    };

    struct PublicAccessRequestRateEntry {
        std::chrono::steady_clock::time_point window_started_at{};
        int attempts{0};
    };

    Impl(core::SessionManager& manager, analysis::AnalysisSessionService& analysis_service)
        : session_manager(manager), analysis_sessions(analysis_service) {}

    bool AllowPublicAccessRequestAttempt(const std::string& peer_key,
                                         int* retry_after_seconds) {
        static constexpr int kRateLimit = 5;
        static constexpr int kWindowSeconds = 300;
        const auto now = std::chrono::steady_clock::now();
        const auto window = std::chrono::seconds(kWindowSeconds);
        const std::string key = peer_key.empty() ? "unknown" : peer_key;
        std::lock_guard lock(public_access_request_rate_mu);
        for (auto it = public_access_request_rate.begin();
             it != public_access_request_rate.end();) {
            if (now - it->second.window_started_at >= window * 2) {
                it = public_access_request_rate.erase(it);
            } else {
                ++it;
            }
        }
        PublicAccessRequestRateEntry& entry = public_access_request_rate[key];
        if (entry.attempts == 0 || now - entry.window_started_at >= window) {
            entry.window_started_at = now;
            entry.attempts = 0;
        }
        if (entry.attempts >= kRateLimit) {
            if (retry_after_seconds != nullptr) {
                const auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(
                    now - entry.window_started_at);
                *retry_after_seconds = std::max(1, kWindowSeconds - static_cast<int>(elapsed.count()));
            }
            return false;
        }
        ++entry.attempts;
        if (retry_after_seconds != nullptr) {
            *retry_after_seconds = 0;
        }
        return true;
    }

    core::SessionManager& session_manager;
    analysis::AnalysisSessionService& analysis_sessions;
    std::string listen_address;
    std::uint16_t port{0};
    int listen_fd{-1};
    std::thread accept_thread;
    std::mutex mu;
    std::mutex auth_mu;
    std::unordered_map<std::string, SessionEntry> sessions;
    std::unordered_map<std::string, SourceSessionEntry> source_sessions;
    std::unordered_map<std::string, ClientSessionEntry> client_sessions;
    std::unordered_map<std::string, AuthSessionEntry> auth_sessions;
    std::mutex public_access_request_rate_mu;
    std::unordered_map<std::string, PublicAccessRequestRateEntry> public_access_request_rate;
    std::atomic<std::uint64_t> next_session_id{1};
    std::atomic<int> active_http_connections{0};
    std::atomic<int> active_sse_metadata_clients{0};
    std::atomic<int> active_ws_metadata_clients{0};
};

namespace webrtc_http_server_detail {

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3129 prototype
HttpResponse JsonResponse(int status, const std::string& status_text, const std::string& body);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3138 prototype
HttpResponse AnalysisRegistryMutationErrorResponse(
    const AnalysisRegistryMutationResult& result,
    int default_status,
    const std::string& default_status_text);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3155 prototype
HttpResponse RegistryHttpResponse(const RegistryResult& result);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3159 prototype
HttpResponse AuthUserHttpResponse(const auth::AuthUserResult& result);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3163 prototype
HttpResponse AuthErrorResponse(const std::string& error);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3171 prototype
std::string PrincipalJson(const auth::Principal& principal);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3193 prototype
std::string WhoamiJson(const auth::AuthResult& result,
                       const auth::BootstrapState& bootstrap_state,
                       const WebRtcHttpRuntimeConfig& config);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3233 prototype
std::string HtmlEscape(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3261 prototype
std::string DefaultHomePath(const WebRtcHttpRuntimeConfig& config);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3292 prototype
std::string RoleLandingPath(const auth::Principal& principal, const WebRtcHttpRuntimeConfig& config);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3308 prototype
ProductUiPrincipalView ProductUiPrincipalViewFromAuthPrincipal(const auth::Principal& principal);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3319 prototype
std::string JsonScriptContent(const std::string& json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3332 prototype
std::string AuthCookieHeader(const WebRtcHttpRuntimeConfig& config,
                             const std::string& session_id,
                             int max_age_seconds);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3344 prototype
std::string ExpiredAuthCookieHeader(const WebRtcHttpRuntimeConfig& config);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3354 prototype
std::string PeerAddress(int client_fd);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3375 prototype
HttpResponse RedirectResponse(const std::string& location);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3386 prototype
std::string StatusPageHtml(const std::string& title,
                           const std::string& message,
                           const std::string& action_href,
                           const std::string& action_label);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3420 prototype
HttpResponse HtmlPageResponse(std::string body,
                              int status = 200,
                              const std::string& status_text = "OK");

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3432 prototype
HttpResponse StatusPageResponse(int status,
                                const std::string& status_text,
                                const std::string& title,
                                const std::string& message,
                                const std::string& action_href,
                                const std::string& action_label);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3441 prototype
HttpResponse UnauthorizedPageResponse();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3450 prototype
HttpResponse ForbiddenPageResponse(const std::string& message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3459 prototype
void AppendProductAccountMenu(std::ostringstream& out,
                             const auth::Principal& principal,
                             const std::string& secondary_action_href = std::string(),
                             const std::string& secondary_action_label = std::string());

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3489 prototype
void AppendImageNavLink(std::ostringstream& out,
                        const std::string& href,
                        const std::string& key,
                        const std::string& label,
                        bool active,
                        const std::string& extra_attributes = "");

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3503 prototype
void AppendTableHead(std::ostringstream& out, const std::vector<std::string>& headers);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3516 constant
constexpr std::int64_t kClientDashboardStaleMs = 5000;

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3518 prototype
void AppendNullableInt64(std::ostringstream& out, std::optional<std::int64_t> value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3526 prototype
void AppendNullableUint64(std::ostringstream& out, std::optional<std::uint64_t> value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3534 prototype
bool ClientPrincipalCanAccessFeature(const auth::Principal& principal,
                                     const std::string& view_id,
                                     const std::string& scope_prefix);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3541 prototype
std::optional<media::SourceSpec::Kind> SourceKindForClientView(
    const SourceViewRegistry::SourceRecord& source);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3570 prototype
std::string SourceLocatorForClientView(const SourceViewRegistry::SourceRecord& source);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3589 prototype
void AddUniqueString(std::vector<std::string>* values, const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3598 prototype
std::vector<std::string> ClientStreamKeyCandidates(const SourceViewRegistry::SourceRecord& source);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3620 prototype
bool ClientTapMatchesSource(const analysis::AnalysisManager::TapSnapshot& tap,
                            const std::vector<std::string>& stream_key_candidates);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3626 prototype
bool ClientTapMatchesViewRule(const SourceViewRegistry::PublishedViewRecord& view,
                              const analysis::AnalysisManager::TapSnapshot& tap);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3636 prototype
const analysis::AnalysisManager::TapSnapshot* SelectClientDashboardTap(
    const SourceViewRegistry::ClientViewAccess& access,
    const std::vector<analysis::AnalysisManager::TapSnapshot>& taps,
    const std::vector<std::string>& stream_key_candidates);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3659 type
struct ClientEventItem {
    std::string event_id;
    std::string event_type;
    std::string status;
    std::string class_name;
    std::string zone_id;
    std::string line_id;
    std::string scenario_name;
    std::string scenario_phase;
    std::optional<std::uint64_t> track_id;
    std::optional<std::int64_t> start_time_ms;
    std::optional<std::int64_t> update_time_ms;
    std::optional<std::int64_t> end_time_ms;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3674 type
struct ClientEventTypeCount {
    std::string event_type;
    std::size_t count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3679 type
struct ClientEventSummary {
    bool provided{false};
    bool storage_enabled{false};
    bool has_more{false};
    bool warning{false};
    std::string error;
    std::vector<ClientEventItem> recent;
    std::vector<ClientEventTypeCount> counts_by_type;
    std::optional<std::int64_t> latest_event_time_ms;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3690 type
struct ClientSourceStatusDigest {
    bool provided{true};
    std::string source_status{"offline"};
    std::string connection_status{"disconnected"};
    std::string video_frame_status{"unavailable"};
    std::string metadata_status{"unavailable"};
    std::string summary_text{"source offline"};
    std::string severity{"attention"};
    std::string timeline_hint{"source unavailable"};
    std::optional<std::int64_t> last_frame_age_ms;
    std::optional<std::int64_t> metadata_age_ms;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3703 prototype
std::string ClientSafeDigestValue(const std::string& value, const std::string& fallback);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3711 prototype
bool ClientEventStatusIsActive(const std::string& status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3723 prototype
std::string ClientSourceStatusDigestSeverity(const std::string& source_status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3733 prototype
std::string ClientSourceStatusDigestSummaryText(const std::string& source_status,
                                                const std::string& connection_status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3751 prototype
std::string ClientSourceStatusDigestTimelineHint(const std::string& source_status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3764 prototype
ClientSourceStatusDigest ClientSourceStatusDigestFor(
    const SourceViewRegistry::ClientViewAccess& access,
    const auth::Principal& principal,
    const std::vector<analysis::AnalysisManager::TapSnapshot>& taps);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3814 prototype
void AppendClientSafeSourceStatusDigestJson(std::ostringstream& out,
                                            const ClientSourceStatusDigest& digest);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3857 prototype
std::string ClientSourceStatusDigestJson(
    const SourceViewRegistry::ClientViewAccess& access,
    const auth::Principal& principal,
    const std::vector<analysis::AnalysisManager::TapSnapshot>& taps);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3866 type
struct ClientMaintenanceDigest {
    bool provided{true};
    std::string maintenance_state{"unavailable"};
    std::string summary_text{"maintenance status unavailable"};
    std::string severity{"attention"};
    std::string timeline_hint{"source unavailable"};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3874 prototype
std::string ClientMaintenanceDigestStateFor(const ClientSourceStatusDigest& source_status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3884 prototype
std::string ClientMaintenanceDigestSummaryTextFor(const std::string& maintenance_state);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3894 prototype
std::string ClientMaintenanceDigestTimelineHintFor(const std::string& maintenance_state);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3904 prototype
ClientMaintenanceDigest ClientMaintenanceDigestFor(const ClientSourceStatusDigest& source_status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3913 prototype
void AppendClientSafeMaintenanceDigestJson(std::ostringstream& out,
                                           const ClientMaintenanceDigest& digest);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3951 prototype
std::string ClientMaintenanceDigestJson(const ClientSourceStatusDigest& source_status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3957 type
struct ClientImpactForecast {
    bool provided{true};
    std::string source_impact{"source impact unavailable"};
    std::string view_impact{"view impact unavailable"};
    std::string command_plan_impact{"command plan impact pending"};
    std::string live_impact{"client live unchanged"};
    std::string dashboard_impact{"dashboard digest unchanged"};
    std::string event_digest_impact{"event digest unchanged"};
    std::string summary_text{"viewer-safe client impact forecast"};
    std::string severity{"info"};
    std::string timeline_hint{"available"};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 3970 prototype
ClientImpactForecast ClientImpactForecastFor(
    const SourceViewRegistry::ClientViewAccess& access,
    const ClientSourceStatusDigest& source_status,
    const ClientMaintenanceDigest& maintenance_digest,
    const ClientEventSummary& event_summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4012 prototype
void AppendClientImpactForecastJson(std::ostringstream& out,
                                    const ClientImpactForecast& forecast);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4053 prototype
std::string ClientImpactForecastJson(
    const SourceViewRegistry::ClientViewAccess& access,
    const ClientSourceStatusDigest& source_status,
    const ClientMaintenanceDigest& maintenance_digest,
    const ClientEventSummary& event_summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4065 type
struct ClientOperationsNotice {
    bool provided{true};
    std::string operations_status{"degraded"};
    std::string timeline_hint{"status unavailable"};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4071 prototype
std::string ClientOperationsNoticeStatusFor(
    const SourceViewRegistry::ClientViewAccess& access,
    const ClientSourceStatusDigest& source_status,
    const ClientEventSummary& event_summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4090 prototype
std::string ClientOperationsNoticeTimelineHintFor(const std::string& operations_status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4103 prototype
ClientOperationsNotice ClientOperationsNoticeFor(
    const SourceViewRegistry::ClientViewAccess& access,
    const ClientSourceStatusDigest& source_status,
    const ClientMaintenanceDigest&,
    const ClientEventSummary& event_summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4115 prototype
void AppendClientOperationsNoticeJson(std::ostringstream& out,
                                      const ClientOperationsNotice& notice);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4150 prototype
std::string ClientOperationsNoticeJson(
    const SourceViewRegistry::ClientViewAccess& access,
    const ClientSourceStatusDigest& source_status,
    const ClientMaintenanceDigest& maintenance_digest,
    const ClientEventSummary& event_summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4162 type
struct ClientActionNoticePreview {
    bool provided{true};
    std::string notice_status{"degraded"};
    std::string viewer_safe_title{"Action notice preview"};
    std::string viewer_safe_body{"Service status is being reviewed."};
    std::string timeline_hint{"degraded"};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4170 prototype
std::string ClientActionNoticePreviewStatusFor(
    const SourceViewRegistry::ClientViewAccess& access,
    const ClientSourceStatusDigest& source_status,
    const ClientEventSummary& event_summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4189 prototype
std::string ClientActionNoticePreviewTitleFor(const std::string& notice_status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4202 prototype
std::string ClientActionNoticePreviewBodyFor(const std::string& notice_status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4215 prototype
std::string ClientActionNoticePreviewTimelineHintFor(const std::string& notice_status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4228 prototype
ClientActionNoticePreview ClientActionNoticePreviewFor(
    const SourceViewRegistry::ClientViewAccess& access,
    const ClientSourceStatusDigest& source_status,
    const ClientMaintenanceDigest&,
    const ClientEventSummary& event_summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4242 prototype
void AppendClientActionNoticePreviewJson(std::ostringstream& out,
                                         const ClientActionNoticePreview& preview);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4285 prototype
std::string ClientActionNoticePreviewJson(
    const SourceViewRegistry::ClientViewAccess& access,
    const ClientSourceStatusDigest& source_status,
    const ClientMaintenanceDigest& maintenance_digest,
    const ClientEventSummary& event_summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4297 prototype
ClientEventItem ParseClientEventItem(const std::string& raw);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4316 prototype
std::int64_t ClientEventSortTime(const ClientEventItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4320 prototype
void AddClientEventTypeCount(std::vector<ClientEventTypeCount>* counts, const std::string& event_type);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4333 prototype
ClientEventSummary LoadClientEventSummary(std::vector<std::string> stream_key_candidates,
                                          int limit);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4400 prototype
void AppendClientEventItemJson(std::ostringstream& out, const ClientEventItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4421 prototype
std::string ClientSafeIncidentDigestSeverity(const ClientEventItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4425 prototype
std::string ClientSafeIncidentDigestSummaryText(const ClientEventItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4441 prototype
void AppendClientSafeIncidentDigestJson(std::ostringstream& out,
                                        const ClientEventSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4474 prototype
std::string ClientSafeEventDigestTimelineHint(const ClientEventItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4488 prototype
std::string ClientSafeEventDigestSummaryText(const ClientEventItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4505 prototype
void AppendClientSafeEventDigestJson(std::ostringstream& out,
                                     const ClientEventSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4547 prototype
std::string ClientSafeFollowUpDigestStatus(const ClientEventItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4560 prototype
void AppendClientSafeFollowUpDigestJson(std::ostringstream& out,
                                        const ClientEventSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4596 prototype
std::string ClientSafeResolutionDigestStatus(const ClientEventItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4608 prototype
std::string ClientSafeResolutionDigestLabel(const std::string& resolution_status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4618 prototype
std::string ClientSafeResolutionDigestTimelineHint(const ClientEventItem& item,
                                                   const std::string& resolution_status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4632 prototype
std::string ClientSafeResolutionDigestSummaryText(const ClientEventItem& item,
                                                  const std::string& resolution_status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4648 prototype
void AppendClientSafeResolutionDigestJson(std::ostringstream& out,
                                          const ClientEventSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4695 prototype
void AppendClientEventSummaryJson(std::ostringstream& out,
                                  const ClientEventSummary& summary,
                                  const std::string& source_status_digest_json = "",
                                  const std::string& maintenance_digest_json = "",
                                  const std::string& client_impact_forecast_json = "",
                                  const std::string& client_operations_notice_json = "",
                                  const std::string& client_action_notice_preview_json = "");

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4754 prototype
void AppendClientViewIdentityJson(std::ostringstream& out,
                                  const SourceViewRegistry::ClientViewAccess& access);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4777 prototype
std::vector<std::string> ClientEventStreamCandidates(
    const SourceViewRegistry::SourceRecord& source,
    const analysis::AnalysisManager::TapSnapshot* tap);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4790 prototype
std::string ClientViewEventsJson(
    const SourceViewRegistry::ClientViewAccess& access,
    const auth::Principal& principal,
    const std::vector<analysis::AnalysisManager::TapSnapshot>& taps,
    int limit);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4823 prototype
std::string ClientViewMetadataJson(const SourceViewRegistry::ClientViewAccess& access,
                                   const std::vector<analysis::AnalysisManager::TapSnapshot>& taps);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 4877 prototype
std::string ClientViewDashboardJson(const SourceViewRegistry::ClientViewAccess& access,
                                    const auth::Principal& principal,
                                    const std::vector<analysis::AnalysisManager::TapSnapshot>& taps);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5018 prototype
std::string NormalizeClientOverlayMode(std::string mode);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5036 prototype
std::vector<std::string> ClientAllowedOverlayModes(
    const SourceViewRegistry::PublishedViewRecord& view);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5046 prototype
bool ClientViewAllowsOverlayMode(const SourceViewRegistry::PublishedViewRecord& view,
                                 const std::string& mode);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5052 prototype
std::string ClientDefaultOverlayMode(const SourceViewRegistry::PublishedViewRecord& view);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5063 prototype
bool AddClientSourceQuery(const SourceViewRegistry::SourceRecord& source,
                          std::unordered_map<std::string, std::string>* query,
                          std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5102 prototype
std::string ClientSourceQueryValue(const std::unordered_map<std::string, std::string>& query,
                                   const std::string& key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5108 prototype
bool AddVaRuleSourceQuery(const std::string& rule_id,
                          const std::string& source_document,
                          std::unordered_map<std::string, std::string>* query,
                          std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5149 prototype
bool ClientSourceQueriesMatch(const std::unordered_map<std::string, std::string>& view_query,
                              const std::unordered_map<std::string, std::string>& rule_query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5166 prototype
bool ClientVaRuleSourceMatchesView(const SourceViewRegistry::ClientViewAccess& access,
                                   const std::string& rule_id,
                                   std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5199 prototype
bool ClientLiveRequestHasSourceOverride(const std::string& body,
                                        const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5211 prototype
bool BuildClientLiveWebRtcQuery(const SourceViewRegistry::ClientViewAccess& access,
                                const std::string& raw_overlay_mode,
                                const std::string& requested_rule_id,
                                std::unordered_map<std::string, std::string>* query,
                                std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5271 prototype
SourceViewRegistry::ClientViewAccessAuthorizer MakeClientViewAccessAuthorizer(
    const auth::Principal& principal);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5279 prototype
std::string ClientShellPageHtml(const auth::Principal& principal, const std::string& active);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5352 prototype
bool IsOpsOverviewShellRoute(const std::string& path);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5357 prototype
std::string OpsOverviewActiveForPath(const std::string& path);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5370 prototype
bool IsClientShellRoute(const std::string& path);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5375 prototype
std::string ClientShellActiveForPath(const std::string& path);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5385 prototype
std::string BuildOpsSourcesPageHtml(const auth::Principal& principal);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5742 prototype
std::string BuildOpsUsersPageHtml(const auth::Principal& principal);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5971 prototype
media::IngressRequest BuildHttpIngressRequest(const std::string& path,
                                              const std::unordered_map<std::string, std::string>& query,
                                              const std::string& client_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5982 type
struct HttpSessionSecrets {
    std::string session_id;
    std::string session_capability;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 5987 prototype
std::optional<HttpSessionSecrets> GenerateHttpSessionSecrets(const std::string& prefix,
                                                             std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6003 prototype
std::optional<std::string> GeneratePrefixedRandomId(const std::string& prefix,
                                                    std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6012 prototype
std::string PrincipalOwnerKey(const auth::Principal& principal);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6023 prototype
bool SameSessionOwner(const auth::Principal& owner, const auth::Principal& current);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6028 prototype
bool ConstantTimeEquals(const std::string& left, const std::string& right);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6039 prototype
std::string RequestSessionCapability(const HttpRequest& request,
                                     const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6064 prototype
std::string SessionJson(const std::string& session_id,
                        const std::string& offer,
                        const std::string& session_capability);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6076 prototype
std::string ClientSessionJson(const std::string& client_session_id, const std::string& offer);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6086 prototype
std::string IceJson(const std::vector<WebRtcIceCandidate>& candidates);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6102 prototype
std::optional<std::uint32_t> ParseUnsignedIndexText(const std::string& raw);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6123 prototype
std::vector<WebRtcIceCandidate> ParseWhepSdpFragmentIceCandidates(const std::string& body);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6167 prototype
std::optional<HttpResponse> ApplyWhepSdpFragmentIce(
    const HttpRequest& request,
    const std::shared_ptr<WebRtcEgressSession>& bridge);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6183 prototype
std::string SourceJson(const std::string& session_id,
                       const std::string& source_id,
                       const std::string& answer,
                       const std::string& session_capability);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6197 prototype
std::string WebRtcMetadataChannelsJson(const std::vector<WebRtcMetadataChannelStats>& stats);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6256 prototype
// 다채널 검증과 수동 진단에서 WebRTC session 수와 dedup stream 수를 비교할 수 있게 JSON으로 직렬화한다.
std::string RuntimeStatusJson(const core::SessionManager::RuntimeStateSnapshot& snapshot,
                              std::size_t http_egress_sessions,
                              std::size_t whip_publish_sessions,
                              const std::vector<WebRtcMetadataChannelStats>& metadata_channel_stats,
                              int active_sse_metadata_clients,
                              int active_ws_metadata_clients,
                              const std::vector<PublishedWebRtcSource::Snapshot>& publish_sources,
                              const std::vector<analysis::AnalysisManager::TapSnapshot>& analysis_taps);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6419 type
struct BrowserIceServer {
    std::string urls;
    std::string username;
    std::string credential;
    bool has_credentials{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6426 prototype
// 설정 URI prefix를 브라우저 RTCIceServer urls 형식으로 바꾼다.
bool ConvertConfiguredIceUriToBrowserUrl(const std::string& configured_uri,
                                         const std::string& configured_prefix,
                                         const std::string& browser_prefix,
                                         std::string* rest);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6438 prototype
// turn://user:pass@host:port URI를 브라우저가 요구하는 urls/username/credential 필드로 분리한다.
BrowserIceServer BuildTurnIceServerForBrowser(const std::string& turn_uri);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6470 prototype
// 서버 WebRTC env 설정을 브라우저 RTCPeerConnection 생성 옵션 JSON으로 직렬화한다.
std::string WebRtcBrowserConfigJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6518 prototype
std::string DetectionJson(const analysis::Detection& detection);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6544 prototype
std::string DetectorDetectionJson(const analysis::Detection& detection);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6553 prototype
std::string CloseObjectAssociationDiagnosticJson(
    const analysis::CloseObjectAssociationDiagnostic& diagnostic);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6590 prototype
std::string CloseObjectGuardModeJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6610 prototype
std::string AnalysisDebugLineStateJson(const analysis::AnalysisDebugLineState& line);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6627 prototype
std::string AnalysisDebugTrackStateJson(const analysis::AnalysisDebugTrackState& track);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6693 prototype
void AppendNullableInt64Json(std::ostringstream& out, std::int64_t value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6701 prototype
std::string AnalysisDebugScenarioTimelineJson(
    const analysis::AnalysisDebugScenarioTimeline& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6748 prototype
std::string AnalysisDebugStateJson(const std::optional<analysis::AnalysisDebugState>& debug_state);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6788 prototype
std::string TrackHealthMetricsJson(const analysis::TrackHealthMetrics& metrics);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6803 prototype
std::string AnalysisChannelMetricsJson(const analysis::AnalysisChannelMetrics& channel);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6829 prototype
std::string AnalysisMetricsReportJson(const std::optional<analysis::AnalysisMetricsReport>& report);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6871 prototype
std::string TrackJson(const analysis::Track& track);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6905 prototype
std::string AnalysisResultJson(const analysis::AnalysisResult& result);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6944 prototype
std::string AnalysisTapSnapshotJson(const analysis::AnalysisManager::TapSnapshot& snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7100 prototype
std::string AnalysisMetadataJson(const std::string& tap_id,
                                 const std::optional<analysis::AnalysisResult>& result);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7116 prototype
std::string AnalysisBboxDiagnosticsJson(const std::string& tap_id,
                                        std::int64_t requested_pts_ms,
                                        std::int64_t tolerance_ms,
                                        const std::optional<analysis::AnalysisResult>& result);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7169 type
struct VaMetadataStreamOptions {
    int interval_ms{GetWebRtcHttpRuntimeConfig().webrtc_va_metadata_interval_ms};
    int stale_after_ms{5000};
    int stream_max_duration_ms{0};
    int stream_max_messages{0};
    std::size_t max_message_bytes{GetWebRtcHttpRuntimeConfig().webrtc_va_metadata_max_message_bytes};
    std::size_t max_tracks{128};
    std::size_t max_events{64};
    bool include_source{true};
    bool include_scenarios{true};
    bool include_metrics{true};
    bool include_tracking_issue_report{true};
    analysis::VaMetadataSubscriptionFilter subscription_filter;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7184 prototype
std::vector<std::string> ParseVaMetadataStringList(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7206 prototype
void AppendVaMetadataQueryList(const std::unordered_map<std::string, std::string>& query,
                               std::initializer_list<const char*> keys,
                               std::vector<std::string>* values);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7225 prototype
std::optional<std::uint64_t> ParseVaMetadataUint64Query(
    const std::unordered_map<std::string, std::string>& query,
    std::initializer_list<const char*> keys);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7249 prototype
std::optional<int> ParseVaMetadataIntQuery(const std::unordered_map<std::string, std::string>& query,
                                           std::initializer_list<const char*> keys);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7272 prototype
analysis::VaMetadataSubscriptionFilter BuildVaMetadataSubscriptionFilter(
    const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7287 prototype
void AppendVaMetadataFilterArrayJson(std::ostringstream& out,
                                     const std::string& key,
                                     const std::vector<std::string>& values);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7300 prototype
std::string VaMetadataSubscriptionFilterJson(const analysis::VaMetadataSubscriptionFilter& filter);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7332 prototype
VaMetadataStreamOptions BuildVaMetadataStreamOptions(const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7381 prototype
std::string VaMetadataSubscriptionControlJson(const std::string& action,
                                              bool subscribed,
                                              const VaMetadataStreamOptions& options,
                                              const std::string& error_message = {});

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7410 prototype
void ApplyVaMetadataCommandStringField(const std::string& body,
                                       const std::string& field,
                                       const std::string& query_key,
                                       std::unordered_map<std::string, std::string>* query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7422 prototype
void ApplyVaMetadataCommandIntField(const std::string& body,
                                    const std::string& field,
                                    const std::string& query_key,
                                    std::unordered_map<std::string, std::string>* query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7434 prototype
int ClampedMetadataCommandInt(const std::string& body,
                              const std::string& field,
                              int current_value,
                              int min_value,
                              int max_value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7446 prototype
VaMetadataStreamOptions ApplyVaMetadataSubscribeCommand(const std::string& body,
                                                        VaMetadataStreamOptions options);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7510 prototype
std::string BuildVaRuntimeMetadataJsonWithinBudget(const analysis::AnalysisResult& result,
                                                   const std::vector<analysis::AnalysisEvent>& events,
                                                   const std::string& tracking_issue_report_json,
                                                   const VaMetadataStreamOptions& stream_options);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7550 prototype
std::string LowerAscii(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7557 prototype
std::string HeaderValue(const HttpRequest& request, const std::string& key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7570 prototype
bool HeaderContainsToken(const std::string& header, const std::string& token);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7588 prototype
std::uint32_t Sha1RotateLeft(std::uint32_t value, int bits);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7592 prototype
std::array<unsigned char, 20> Sha1Digest(const std::string& input);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7670 prototype
std::string Base64Encode(const unsigned char* data, std::size_t size);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7688 prototype
std::string WebSocketAcceptKey(const std::string& client_key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7694 prototype
bool ValidateWebSocketUpgrade(const HttpRequest& request,
                              std::string* websocket_key,
                              std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7726 prototype
bool SendWebSocketHandshake(int fd, const std::string& client_key, const HttpRequest& request);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7737 prototype
bool SendWebSocketServerFrame(int fd, unsigned char opcode, const std::string& payload);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7757 prototype
bool SendWebSocketTextFrame(int fd, const std::string& payload);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7761 prototype
bool SendWebSocketPongFrame(int fd, const std::string& payload);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7765 prototype
bool SendWebSocketCloseFrame(int fd);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7769 type
struct WebSocketReadResult {
    bool has_frame{false};
    bool close_requested{false};
    bool protocol_error{false};
    unsigned char opcode{0};
    std::string payload;
    std::string error_message;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7778 prototype
WebSocketReadResult TryReadWebSocketClientFrame(int fd);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7877 prototype
bool SendSseHeaders(int fd, const HttpRequest& request);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7889 prototype
bool SendSseComment(int fd, const std::string& comment);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7893 prototype
bool SendSseEvent(int fd, const std::string& event_name, const std::string& data, std::uint64_t event_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7905 prototype
bool StreamVaMetadataSse(int client_fd,
                         const std::atomic<bool>& running,
                         analysis::AnalysisSessionService& analysis_sessions,
                         const std::string& tap_id,
                         const std::unordered_map<std::string, std::string>& query,
                         const HttpRequest& request);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8005 prototype
bool StreamVaMetadataWebSocket(int client_fd,
                               const std::atomic<bool>& running,
                               analysis::AnalysisSessionService& analysis_sessions,
                               const std::string& tap_id,
                               const std::unordered_map<std::string, std::string>& query,
                               const std::string& websocket_key,
                               const HttpRequest& request);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8167 prototype
std::string AnalysisStateDumpJson(const std::string& tap_id,
                                  const analysis::AnalysisManager::TapSnapshot& snapshot,
                                  const std::optional<analysis::EventRuleEvaluation>& evaluation);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8208 prototype
std::string AnalysisMetricsDumpJson(const std::string& tap_id,
                                    const analysis::AnalysisManager::TapSnapshot& snapshot,
                                    const std::optional<analysis::EventRuleEvaluation>& evaluation);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8319 prototype
std::string AnalysisTapCreatedJson(const analysis::AnalysisSessionService::AnalysisTapResult& result,
                                   std::size_t active_taps);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8334 prototype
std::string AnalysisTapListJson(const std::vector<analysis::AnalysisManager::TapSnapshot>& snapshots);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8347 prototype
std::string AnalysisGlobalMetadataJson(
    const std::vector<analysis::AnalysisManager::TapSnapshot>& snapshots);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8362 prototype
std::string AnalysisGlobalBboxDiagnosticsJson(
    const std::vector<analysis::AnalysisManager::TapSnapshot>& snapshots);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8381 prototype
std::string AnalysisGlobalStateDumpJson(
    const std::vector<analysis::AnalysisManager::TapSnapshot>& snapshots);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8396 prototype
std::string AnalysisGlobalMetricsDumpJson(
    const std::vector<analysis::AnalysisManager::TapSnapshot>& snapshots);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8411 type
struct StaticImageAnalysis {
    analysis::RawVideoFrame frame;
    analysis::AnalysisResult result;
    analysis::AnalysisProfile profile;
    std::string root_name;
    std::string token;
    double analysis_ms{0.0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8420 prototype
// 문자열 vector를 JSON array로 직렬화한다.
std::string StringVectorJson(const std::vector<std::string>& values);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8434 prototype
// Rule/Profile UI와 capabilities API가 공유하는 category catalog를 JSON으로 만든다.
std::string AnalysisCategoryCatalogJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8458 prototype
std::string AnalysisCapabilitiesJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8466 prototype
std::string AnalysisProfilesJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8470 prototype
std::string AnalysisRulesJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8474 prototype
std::string AnalysisVaRulesJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8478 prototype
std::string OpsVlmProfilesJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8482 prototype
void AppendJsonDocumentArray(std::ostream& out, const std::vector<std::string>& documents);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8493 prototype
std::string OpsRulesCatalogJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8508 prototype
bool IsSupportedImageFile(const std::filesystem::path& path);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8516 prototype
bool HasParentTraversal(const std::filesystem::path& path);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8525 prototype
std::filesystem::path ProjectRelativeRoot(const std::filesystem::path& root);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8532 prototype
bool ResolvePathUnderRoot(const std::filesystem::path& root,
                          const std::string& token,
                          std::filesystem::path* output,
                          std::string* normalized_token,
                          std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8595 prototype
bool ResolveImageRequestPath(const std::unordered_map<std::string, std::string>& query,
                             std::filesystem::path* output,
                             std::string* root_name,
                             std::string* normalized_token,
                             std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8644 prototype
bool QueryHasAny(const std::unordered_map<std::string, std::string>& query,
                 std::initializer_list<const char*> keys);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8651 prototype
bool AnalyzeStaticImage(const std::unordered_map<std::string, std::string>& query,
                        StaticImageAnalysis* output,
                        std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8752 prototype
std::string StaticImageAnalysisJson(const StaticImageAnalysis& analysis);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8768 prototype
std::mutex& EventRuleRuntimeMapMutex();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8773 prototype
std::unordered_map<std::string, std::shared_ptr<analysis::EventRuleRuntime>>& EventRuleRuntimeMap();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8778 prototype
std::shared_ptr<analysis::EventRuleRuntime> EventRuleRuntimeForKey(const std::string& key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8790 prototype
void ReleaseEventRuleRuntimeForKey(const std::string& key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8795 prototype
bool DetachAnalysisTapAndReleaseRuntimes(analysis::AnalysisSessionService& analysis_sessions,
                                         const std::string& tap_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8812 prototype
analysis::EventRuleEvaluation EvaluateStoredEventRules(
    const analysis::AnalysisResult& result,
    const std::shared_ptr<analysis::EventRuleRuntime>& runtime);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8818 prototype
std::string AnalysisEventJson(const analysis::AnalysisEvent& event);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8846 prototype
std::string AnalysisEventsJson(const std::string& tap_id,
                               const std::optional<analysis::AnalysisResult>& result,
                               const analysis::EventRuleEvaluation* evaluation);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8876 prototype
WebRtcMetadataChannelConfig BuildWebRtcMetadataChannelConfigFromQuery(
    const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8912 prototype
std::int64_t PtsNsToMs(std::int64_t pts_ns);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8916 prototype
std::int64_t NowUnixMs();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8922 prototype
std::string FormatUnixMsUtc(std::int64_t unix_ms);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8933 prototype
void AppendNullableJsonString(std::ostringstream& out, const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8941 prototype
std::string JsonBool(bool value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8945 prototype
std::string QueryValueOr(const std::unordered_map<std::string, std::string>& query,
                         const std::string& key,
                         const std::string& fallback);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8956 prototype
bool IsAllowedValue(const std::string& value, std::initializer_list<const char*> allowed);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8962 prototype
void AppendJsonStringArray(std::ostringstream& out, const std::vector<std::string>& values);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8973 type
struct OpsVlmModelPlan {
    std::string option_id;
    std::string model;
    std::string tier;
    std::string role;
    std::string deployment;
    int memory_gb{0};
    int disk_gb{0};
    int latency_p50_s{0};
    int latency_p95_s{0};
    bool high_candidate{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8986 prototype
std::string OpsVlmRuntimeStatusJson(const std::string& runtime_readiness);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8995 prototype
std::string OpsVlmNoSideEffectsJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8999 prototype
std::string OpsVlmEvaluationResultWorkflowJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9003 prototype
std::string OpsV390VlmEvaluationPromotionGuardJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9058 prototype
std::string OpsVlmPrivacyTransferGuardJson(bool external_transfer, bool external_acknowledged);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9091 prototype
void AppendOpsVlmModelEstimate(std::ostringstream& out, const OpsVlmModelPlan& plan);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9103 prototype
std::string OpsVlmInstallImpactSummary(const OpsVlmModelPlan& plan, bool requires_runtime_setup);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9116 prototype
void AppendOpsVlmOptionJson(std::ostringstream& out,
                            const OpsVlmModelPlan& plan,
                            std::size_t priority,
                            const std::string& runtime_readiness,
                            const std::string& cloud_opt_in,
                            std::vector<std::string>* selectable_ids);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9174 prototype
std::string OpsVlmInstallConnectionDryRunJson(
    const std::unordered_map<std::string, std::string>& query,
    std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9352 type
struct OpsSourceHealthItem {
    std::string source_id;
    std::string status{"unknown"};
    std::string reason{"not-checked"};
    std::string checked_at;
    std::optional<std::int64_t> last_frame_age_ms;
    std::optional<std::int64_t> last_metadata_age_ms;
    int reconnect_count{0};
    std::string last_reconnect_at;
    std::string codec_video;
    std::string codec_profile;
    std::optional<std::int64_t> codec_width;
    std::optional<std::int64_t> codec_height;
    std::optional<std::int64_t> codec_fps;
    std::vector<std::string> warnings;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9369 type
struct OpsSourceHealthSnapshot {
    bool ok{true};
    std::string error;
    std::string generated_at;
    std::vector<OpsSourceHealthItem> items;
    int live_count{0};
    int connecting_count{0};
    int stale_count{0};
    int offline_count{0};
    int unknown_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9381 prototype
void AppendOpsSourceHealthItemJson(std::ostringstream& out, const OpsSourceHealthItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9416 prototype
void AddOpsSourceHealthWarning(OpsSourceHealthItem* item, const std::string& warning);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9424 prototype
const SourceViewRegistry::PublishedViewRecord* OpsHealthViewForSource(
    const std::vector<SourceViewRegistry::PublishedViewRecord>& views,
    const std::string& source_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9439 prototype
const analysis::AnalysisManager::TapSnapshot* OpsHealthTapForSource(
    const SourceViewRegistry::SourceRecord& source,
    const std::vector<analysis::AnalysisManager::TapSnapshot>& analysis_taps);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9458 prototype
const PublishedWebRtcSource::Snapshot* OpsHealthPublishedSourceFor(
    const SourceViewRegistry::SourceRecord& source,
    const std::vector<PublishedWebRtcSource::Snapshot>& publish_sources);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9470 prototype
const core::SessionManager::SourceReconnectStats* OpsHealthReconnectStatsForSource(
    const SourceViewRegistry::SourceRecord& source,
    const std::vector<core::SessionManager::SourceReconnectStats>& reconnect_stats);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9480 prototype
const core::SessionManager::SourceEgressStats* OpsHealthEgressStatsForSource(
    const SourceViewRegistry::SourceRecord& source,
    const std::vector<core::SessionManager::SourceEgressStats>& egress_stats);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9490 prototype
const media::StreamDescriptor* OpsHealthDescriptorForSource(
    const SourceViewRegistry::SourceRecord& source,
    const std::vector<core::SessionManager::SourceDescriptorSnapshot>& descriptor_snapshots);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9500 prototype
std::optional<std::string> CapsFieldValue(const std::string& caps, const std::string& key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9539 prototype
std::optional<std::int64_t> ParsePositiveInt64Text(const std::string& raw);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9556 prototype
std::optional<std::int64_t> CapsIntField(const std::string& caps, const std::string& key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9564 prototype
std::optional<std::int64_t> CapsFpsField(const std::string& caps);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9584 prototype
const media::TrackInfo* OpsHealthVideoTrack(const media::StreamDescriptor& descriptor);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9591 prototype
std::string OpsHealthCodecVideoName(const media::TrackInfo& track);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9604 prototype
void ApplyOpsSourceHealthCodec(OpsSourceHealthItem* item, const media::StreamDescriptor* descriptor);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9634 prototype
void ClassifyOpsSourceHealth(OpsSourceHealthItem* item,
                             const SourceViewRegistry::SourceRecord& source,
                             const SourceViewRegistry::PublishedViewRecord* view,
                             const analysis::AnalysisManager::TapSnapshot* tap,
                             const PublishedWebRtcSource::Snapshot* published_source,
                             const media::StreamDescriptor* descriptor,
                             const core::SessionManager::SourceReconnectStats* reconnect_stats,
                             const core::SessionManager::SourceEgressStats* egress_stats,
                             const std::string& checked_at);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9736 prototype
bool OpsSourceHealthRepeatedStaleCandidate(const OpsSourceHealthItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9741 prototype
void ApplyOpsSourceHealthWarningThresholds(OpsSourceHealthSnapshot* snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9773 prototype
OpsSourceHealthSnapshot BuildOpsSourceHealthSnapshot(
    const std::vector<analysis::AnalysisManager::TapSnapshot>& analysis_taps,
    const std::vector<PublishedWebRtcSource::Snapshot>& publish_sources,
    const std::vector<core::SessionManager::SourceDescriptorSnapshot>& descriptor_snapshots,
    const std::vector<core::SessionManager::SourceReconnectStats>& reconnect_stats,
    const std::vector<core::SessionManager::SourceEgressStats>& egress_stats);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9829 prototype
void AppendOpsSourceHealthSummaryJson(std::ostringstream& out, const OpsSourceHealthSnapshot& snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9840 type
struct OpsV380ActionRouteBoundaryItem {
    std::string route;
    std::string family;
    std::string method;
    std::string owner;
    std::string stage;
    std::string description;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9849 prototype
std::vector<OpsV380ActionRouteBoundaryItem> BuildV380ActionRouteBoundaryItems();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9926 prototype
void AppendV380ActionRouteBoundaryItemJson(std::ostringstream& out,
                                           const OpsV380ActionRouteBoundaryItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 9940 prototype
std::string OpsV380ActionRouteBoundaryJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10003 prototype
std::string OpsV390OnvifLiveImportPersistDecisionJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10067 prototype
std::string OpsV390OnvifCredentialProviderStatusSummaryJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10132 type
struct OpsV380ActionCapabilityContractItem {
    std::string action_kind;
    std::string action_label;
    std::string capability;
    std::string required_role;
    std::vector<std::string> required_scopes;
    std::string idempotency_key_pattern;
    std::string status;
    std::string description;
    bool allowed{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10144 prototype
std::vector<OpsV380ActionCapabilityContractItem> BuildV380ActionCapabilityContractItems();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10221 prototype
void AppendV380ActionCapabilityContractItemJson(std::ostringstream& out,
                                                const OpsV380ActionCapabilityContractItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10237 prototype
std::string OpsV380ActionCapabilityContractJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10321 type
struct OpsV380ActionRequestLedgerContractItem {
    std::string field;
    std::string json_name;
    std::string type;
    std::string source;
    std::string description;
    bool required{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10330 prototype
std::vector<OpsV380ActionRequestLedgerContractItem> BuildV380ActionRequestLedgerContractItems();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10377 prototype
void AppendV380ActionRequestLedgerContractItemJson(
    std::ostringstream& out,
    const OpsV380ActionRequestLedgerContractItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10390 prototype
std::string OpsV380ActionRequestLedgerContractJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10464 type
struct OpsV380ApprovalDecisionGateItem {
    std::string decision;
    std::string label;
    std::string required_role;
    std::vector<std::string> allowed_next_statuses;
    std::string stale_after;
    std::string description;
    bool reason_required{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10474 prototype
std::vector<OpsV380ApprovalDecisionGateItem> BuildV380ApprovalDecisionGateItems();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10507 prototype
void AppendV380ApprovalDecisionGateItemJson(std::ostringstream& out,
                                            const OpsV380ApprovalDecisionGateItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10521 prototype
std::string OpsV380ApprovalDecisionGateJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10582 type
struct OpsV380ActionReadinessPreflightItem {
    std::string dimension;
    std::string field;
    std::string expected_state;
    std::string blocker;
    std::string source;
    std::string description;
    bool required{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10592 prototype
std::vector<OpsV380ActionReadinessPreflightItem> BuildV380ActionReadinessPreflightItems();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10639 prototype
void AppendV380ActionReadinessPreflightItemJson(
    std::ostringstream& out,
    const OpsV380ActionReadinessPreflightItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10653 prototype
std::string OpsV380ActionReadinessPreflightJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10724 type
struct OpsV380SourceRecheckActionPilotItem {
    std::string field;
    std::string state;
    std::string blocker;
    std::string source;
    std::string description;
    bool required{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10733 prototype
std::vector<OpsV380SourceRecheckActionPilotItem> BuildV380SourceRecheckActionPilotItems();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10768 prototype
void AppendV380SourceRecheckActionPilotItemJson(
    std::ostringstream& out,
    const OpsV380SourceRecheckActionPilotItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10781 prototype
std::string OpsV380SourceRecheckActionPilotJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10849 type
struct OpsV380ClientNoticeDraftQueueItem {
    std::string field;
    std::string state;
    std::string blocker;
    std::string audience;
    std::string description;
    bool required{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10858 prototype
std::vector<OpsV380ClientNoticeDraftQueueItem> BuildV380ClientNoticeDraftQueueItems();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10899 prototype
void AppendV380ClientNoticeDraftQueueItemJson(
    std::ostringstream& out,
    const OpsV380ClientNoticeDraftQueueItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10912 prototype
std::string OpsV380ClientNoticeDraftQueueJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 10991 type
struct OpsV380RuleDraftActionPackageItem {
    std::string field;
    std::string state;
    std::string blocker;
    std::string source;
    std::string description;
    bool required{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11000 prototype
std::vector<OpsV380RuleDraftActionPackageItem> BuildV380RuleDraftActionPackageItems();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11041 prototype
void AppendV380RuleDraftActionPackageItemJson(
    std::ostringstream& out,
    const OpsV380RuleDraftActionPackageItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11054 prototype
std::string OpsV380RuleDraftActionPackageJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11138 type
struct OpsV380OutcomeObserverReconciliationItem {
    std::string outcome_observer_id;
    std::string action_request_ref;
    std::string readiness_ref;
    std::string execution_candidate_ref;
    std::string observed_outcome_ref;
    std::string source_outcome_diff;
    std::string event_record_outcome_diff;
    std::string client_impact_outcome_diff;
    std::string rule_draft_outcome_diff;
    std::string reconciliation_status{"pending-observation"};
    std::string pending_reason{"actionExecutionPerformed=false; observedOutcomeRef=not-run"};
    std::vector<std::string> evidence_refs;
    std::vector<std::string> observer_signals;
    bool source_reconciled{false};
    bool event_record_reconciled{false};
    bool client_reconciled{false};
    bool rule_reconciled{false};
    bool execution_observed{false};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11160 type
struct OpsV380OutcomeObserverReconciliationSummary {
    int observer_count{0};
    int source_diff_count{0};
    int event_record_diff_count{0};
    int client_diff_count{0};
    int rule_diff_count{0};
    int pending_count{0};
    int execution_observed_count{0};
    int not_run_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11172 prototype
std::vector<OpsV380OutcomeObserverReconciliationItem>
BuildV380OutcomeObserverReconciliationItems();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11256 prototype
OpsV380OutcomeObserverReconciliationSummary
BuildV380OutcomeObserverReconciliationSummary(
    const std::vector<OpsV380OutcomeObserverReconciliationItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11293 prototype
void AppendV380OutcomeObserverReconciliationSummaryJson(
    std::ostringstream& out,
    const OpsV380OutcomeObserverReconciliationSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11310 prototype
void AppendV380OutcomeObserverReconciliationItemJson(
    std::ostringstream& out,
    const OpsV380OutcomeObserverReconciliationItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11338 prototype
std::string OpsV380OutcomeObserverReconciliationJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11403 type
struct OpsV380ActionReceiptBundleItem {
    std::string receipt_bundle_id;
    std::string action_request_ref;
    std::string approval_decision_ref;
    std::string readiness_ref;
    std::string execution_candidate_ref;
    std::string outcome_diff_ref;
    std::string redaction_summary;
    std::string handoff_map;
    std::string receipt_state{"redacted-release-safe"};
    std::string release_safe_label{"release-safe-read-model"};
    std::vector<std::string> bundle_signals;
    std::vector<std::string> handoff_refs;
    std::vector<std::string> redaction_review;
    bool release_safe{true};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11421 type
struct OpsV380ActionReceiptBundleSummary {
    int receipt_count{0};
    int release_safe_count{0};
    int redaction_review_count{0};
    int handoff_ref_count{0};
    int not_run_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11430 prototype
std::vector<OpsV380ActionReceiptBundleItem> BuildV380ActionReceiptBundleItems();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11524 prototype
OpsV380ActionReceiptBundleSummary BuildV380ActionReceiptBundleSummary(
    const std::vector<OpsV380ActionReceiptBundleItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11551 prototype
void AppendV380ActionReceiptBundleSummaryJson(
    std::ostringstream& out,
    const OpsV380ActionReceiptBundleSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11565 prototype
void AppendV380ActionReceiptBundleItemJson(
    std::ostringstream& out,
    const OpsV380ActionReceiptBundleItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11590 prototype
std::string OpsV380ActionReceiptBundleJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11659 type
struct OpsV370SiteSourceGroupContractItem {
    std::string field;
    std::string json_name;
    std::string source;
    std::string fallback;
    bool required{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11667 prototype
std::vector<OpsV370SiteSourceGroupContractItem> BuildV370SiteSourceGroupContractItems();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11676 prototype
void AppendV370SiteSourceGroupContractItemJson(std::ostringstream& out,
                                               const OpsV370SiteSourceGroupContractItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11687 prototype
std::string OpsV370SiteSourceGroupContractJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11737 type
struct OpsV370SiteAwareSourceRegistryProjectionItem {
    std::string site_id;
    std::string source_group;
    std::string zone;
    int source_count{0};
    int enabled_source_count{0};
    int disabled_source_count{0};
    int published_view_count{0};
    int enabled_published_view_count{0};
    std::vector<std::string> source_ids;
    std::vector<std::string> view_ids;
    std::vector<std::string> view_groups;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11751 type
struct OpsV370SiteAwareSourceRegistryProjectionSummary {
    int site_count{0};
    int source_group_count{0};
    int source_count{0};
    int enabled_source_count{0};
    int published_view_count{0};
    int sources_without_site{0};
    int sources_without_source_group{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11761 prototype
std::string V370SiteForSource(const SourceViewRegistry::SourceRecord& source);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11766 prototype
std::string V370SourceGroupForSource(const SourceViewRegistry::SourceRecord& source);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11775 prototype
std::string V370ZoneForSource(const SourceViewRegistry::SourceRecord& source);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11780 prototype
std::vector<std::string> V370ViewGroupsForView(const SourceViewRegistry::PublishedViewRecord& view);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11787 prototype
void AddV370UniqueString(std::vector<std::string>* values, const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11795 prototype
std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>
BuildV370SiteAwareSourceRegistryProjectionItems(
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    const std::vector<SourceViewRegistry::PublishedViewRecord>& views);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11839 prototype
OpsV370SiteAwareSourceRegistryProjectionSummary
BuildV370SiteAwareSourceRegistryProjectionSummary(
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    const std::vector<SourceViewRegistry::PublishedViewRecord>& views,
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11867 prototype
void AppendV370SiteAwareSourceRegistryProjectionSummaryJson(
    std::ostringstream& out,
    const OpsV370SiteAwareSourceRegistryProjectionSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11881 prototype
void AppendV370SiteAwareSourceRegistryProjectionItemJson(
    std::ostringstream& out,
    const OpsV370SiteAwareSourceRegistryProjectionItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11902 prototype
std::string OpsV370SiteAwareSourceRegistryProjectionJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11947 type
struct OpsV370SiteHealthRollupItem {
    std::string site_id;
    std::string source_group;
    std::string zone;
    std::string rollup_state{"healthy"};
    int source_count{0};
    int healthy_source_count{0};
    int offline_source_count{0};
    int degraded_source_count{0};
    int recovering_source_count{0};
    int field_needed_source_count{0};
    std::vector<std::string> source_ids;
    std::vector<std::string> reasons;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11962 type
struct OpsV370SiteHealthRollupSummary {
    int site_count{0};
    int source_group_count{0};
    int source_count{0};
    int healthy{0};
    int offline{0};
    int degraded{0};
    int recovering{0};
    int field_needed{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11973 prototype
const OpsSourceHealthItem* V370HealthForSource(const OpsSourceHealthSnapshot& snapshot,
                                               const std::string& source_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11981 prototype
bool V370HealthHasWarning(const OpsSourceHealthItem& item, const std::string& warning);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 11985 prototype
std::string V370SiteHealthSourceState(const SourceViewRegistry::SourceRecord& source,
                                      const OpsSourceHealthItem* health);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12010 prototype
std::string V370SiteHealthRollupState(const OpsV370SiteHealthRollupItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12026 prototype
std::vector<OpsV370SiteHealthRollupItem> BuildV370SiteHealthRollupItems(
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    const std::vector<SourceViewRegistry::PublishedViewRecord>& views,
    const OpsSourceHealthSnapshot& health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12072 prototype
OpsV370SiteHealthRollupSummary BuildV370SiteHealthRollupSummary(
    const std::vector<OpsV370SiteHealthRollupItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12096 prototype
void AppendV370SiteHealthRollupSummaryJson(std::ostringstream& out,
                                           const OpsV370SiteHealthRollupSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12110 prototype
void AppendV370SiteHealthRollupItemJson(std::ostringstream& out,
                                        const OpsV370SiteHealthRollupItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12130 prototype
std::string OpsV370SiteHealthRollupJson(const OpsSourceHealthSnapshot& health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12187 prototype
std::string OpsSourceHealthJson(const std::vector<analysis::AnalysisManager::TapSnapshot>& analysis_taps,
                                const std::vector<PublishedWebRtcSource::Snapshot>& publish_sources,
                                const std::vector<core::SessionManager::SourceDescriptorSnapshot>& descriptor_snapshots,
                                const std::vector<core::SessionManager::SourceReconnectStats>& reconnect_stats,
                                const std::vector<core::SessionManager::SourceEgressStats>& egress_stats,
                                const WebRtcHttpRuntimeConfig* audit_config,
                                const auth::Principal* audit_principal);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12223 prototype
bool OpsSourceHealthBulkRetryable(const OpsSourceHealthItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12231 prototype
std::string OpsSourceHealthBulkJson(
    const std::string& body,
    const std::vector<analysis::AnalysisManager::TapSnapshot>& analysis_taps,
    const std::vector<PublishedWebRtcSource::Snapshot>& publish_sources,
    const std::vector<core::SessionManager::SourceDescriptorSnapshot>& descriptor_snapshots,
    const std::vector<core::SessionManager::SourceReconnectStats>& reconnect_stats,
    const std::vector<core::SessionManager::SourceEgressStats>& egress_stats,
    const WebRtcHttpRuntimeConfig* audit_config,
    const auth::Principal* audit_principal);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12364 prototype
std::filesystem::path OpsAuditStoragePath(const WebRtcHttpRuntimeConfig& config);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12374 prototype
int OpsAuditRetentionDays();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12391 prototype
std::optional<std::int64_t> OpsAuditReceivedAtMs(const std::string& line);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12405 type
struct OpsAuditRetentionSummary {
    int retention_days{OpsAuditRetentionDays()};
    int retained{0};
    int removed{0};
    bool applied{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12412 prototype
OpsAuditRetentionSummary EnforceOpsAuditRetentionLocked(const std::filesystem::path& path,
                                                        std::int64_t now_ms,
                                                        std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12466 prototype
OpsAuditRetentionSummary EnforceOpsAuditRetention(const WebRtcHttpRuntimeConfig& config,
                                                  std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12473 prototype
bool AuditSensitiveKey(const std::string& key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12552 prototype
std::optional<std::pair<std::string, std::size_t>> AuditJsonStringLiteralAt(
    const std::string& json,
    std::size_t value_start);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12579 prototype
bool AuditSensitiveStringValue(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12623 prototype
std::string RedactAuditJsonFragment(std::string json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12713 prototype
std::string OpsAuditRecordJson(const std::string& body, const auth::Principal& principal);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12744 prototype
bool AppendOpsAuditRecord(const WebRtcHttpRuntimeConfig& config,
                          const std::string& record_json,
                          std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12777 type
struct OpsEventReviewState {
    bool present{false};
    std::string event_id;
    std::string review_status{"new"};
    std::string classification{"unclassified"};
    std::string incident_id;
    std::string incident_status{"new"};
    std::string action_target{"operator-triage"};
    std::string resolution_status{"open"};
    std::string resolution_reason{"unreviewed"};
    std::string resolution_note;
    std::string resolution_transition{"none"};
    std::int64_t resolution_closed_at_ms{0};
    std::int64_t resolution_reopened_at_ms{0};
    std::string note;
    std::string vlm_action{"not-reviewed"};
    std::string vlm_action_target{"eventExplanation"};
    std::string vlm_action_note;
    std::string corrected_feature_label;
    std::vector<std::string> feature_aliases;
    bool reanalysis_requested{false};
    std::string reanalysis_reason;
    std::int64_t updated_at_ms{0};
    std::string actor;
    std::string role;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12804 prototype
std::filesystem::path OpsEventReviewStoragePath(const WebRtcHttpRuntimeConfig& config);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12814 prototype
bool OpsEventReviewEventIdAllowed(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12827 prototype
bool OpsEventReviewStatusAllowed(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12838 prototype
bool OpsEventReviewClassificationAllowed(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12849 prototype
bool OpsVlmReviewActionAllowed(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12859 prototype
bool OpsVlmReviewActionTargetAllowed(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12869 prototype
bool OpsIncidentStatusAllowed(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12881 prototype
bool OpsResolutionStatusAllowed(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12893 prototype
bool OpsResolutionReasonAllowed(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12907 prototype
bool OpsResolutionTransitionAllowed(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12916 prototype
std::string NormalizeOpsEventReviewStatus(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12921 prototype
std::string NormalizeOpsEventReviewClassification(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12926 prototype
std::string NormalizeOpsVlmReviewAction(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12931 prototype
std::string NormalizeOpsVlmReviewActionTarget(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12936 prototype
std::string NormalizeOpsIncidentStatus(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12941 prototype
std::string NormalizeOpsResolutionStatus(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12946 prototype
std::string NormalizeOpsResolutionReason(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12951 prototype
std::string NormalizeOpsResolutionTransition(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12956 prototype
bool OpsResolutionStatusIsClosed(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12961 prototype
std::string NormalizeOpsIncidentId(std::string value, const std::string& event_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12972 prototype
std::string NormalizeOpsEventActionTarget(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12995 prototype
std::string NormalizeOpsResolutionNote(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13005 prototype
OpsEventReviewState OpsResolutionStateFromReview(OpsEventReviewState state);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13063 prototype
std::string OpsResolutionStateJson(const OpsEventReviewState& raw_state);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13104 prototype
bool OpsEventReviewNoteContainsSensitiveMaterial(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13141 prototype
std::string NormalizeOpsEventReviewNote(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13161 prototype
std::string NormalizeOpsFeatureCorrectionValue(std::string value,
                                               const std::string& fallback = "");

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13185 prototype
std::vector<std::string> NormalizeOpsFeatureAliases(std::vector<std::string> values);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13202 prototype
bool OpsFeatureCorrectionHasContent(const OpsEventReviewState& state);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13207 prototype
OpsEventReviewState OpsEventReviewStateFromJsonLine(const std::string& line);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13290 prototype
std::string OpsEventReviewStateJson(const OpsEventReviewState& state);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13389 prototype
OpsEventReviewState DefaultOpsEventReviewState(std::string event_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13404 prototype
bool LoadOpsEventReviewStatesLocked(const std::filesystem::path& path,
                                    std::unordered_map<std::string, OpsEventReviewState>* states,
                                    std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13438 prototype
bool LoadOpsEventReviewStates(const WebRtcHttpRuntimeConfig& config,
                              std::unordered_map<std::string, OpsEventReviewState>* states,
                              std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13446 prototype
bool UpsertOpsEventReviewState(const WebRtcHttpRuntimeConfig& config,
                               OpsEventReviewState next,
                               OpsEventReviewState* previous,
                               std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13524 prototype
std::string OpsEventReviewCatalogJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13539 prototype
bool OpsEventReviewMatchesFilters(const OpsEventReviewState& state,
                                  const std::string& review_status,
                                  const std::string& classification,
                                  const std::string& incident_status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13559 prototype
std::filesystem::path ClientLiveLayoutPreferenceStoragePath(const WebRtcHttpRuntimeConfig& config);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13569 prototype
std::string ClientLivePreferencePrincipalKey(const auth::Principal& principal);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13583 prototype
bool ClientLiveLayoutPreferenceContainsForbiddenMaterial(const std::string& body);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13611 prototype
bool NormalizeClientLiveLayoutPreferenceBody(const std::string& body,
                                             std::string* normalized,
                                             std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13664 prototype
std::string ClientLiveRoleLayoutPresetJson(const auth::Principal& principal);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13689 prototype
bool LoadClientLiveLayoutPreferenceLocked(const std::filesystem::path& path,
                                          const std::string& key,
                                          std::string* preference_json,
                                          std::int64_t* updated_at_ms,
                                          std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13730 prototype
bool LoadClientLiveLayoutPreference(const WebRtcHttpRuntimeConfig& config,
                                    const auth::Principal& principal,
                                    std::string* preference_json,
                                    std::int64_t* updated_at_ms,
                                    std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13742 prototype
std::string ClientLiveLayoutPreferenceRecordJson(const auth::Principal& principal,
                                                 const std::string& preference_json,
                                                 std::int64_t updated_at_ms);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13760 prototype
bool UpsertClientLiveLayoutPreference(const WebRtcHttpRuntimeConfig& config,
                                      const auth::Principal& principal,
                                      const std::string& body,
                                      std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13796 prototype
std::string ClientLiveLayoutPreferencesJson(const WebRtcHttpRuntimeConfig& config,
                                            const auth::Principal& principal,
                                            bool saved);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13829 type
struct OpsAlertDeliveryConfig {
    bool present{false};
    bool enabled{false};
    std::string id;
    std::string kind{"webhook"};
    std::string label;
    std::string endpoint;
    int retry_max{3};
    int retry_backoff_ms{2000};
    std::int64_t updated_at_ms{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13841 prototype
std::filesystem::path OpsAlertDeliveryStoragePath(const WebRtcHttpRuntimeConfig& config);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13851 prototype
std::filesystem::path OpsAlertDeliveryAttemptStoragePath(const WebRtcHttpRuntimeConfig& config);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13861 prototype
bool OpsAlertDeliveryIdAllowed(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13873 prototype
std::string NormalizeOpsAlertDeliveryKind(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13881 prototype
int ClampOpsAlertDeliveryInt(std::optional<std::int64_t> value, int fallback, int min_value, int max_value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13889 prototype
std::string OpsAlertDeliveryEndpointFromBody(const std::string& body, const std::string& kind);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13903 prototype
std::string OpsAlertDeliveryMaskedEndpoint(const OpsAlertDeliveryConfig& config);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13919 prototype
OpsAlertDeliveryConfig OpsAlertDeliveryConfigFromJsonLine(const std::string& line);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13934 prototype
std::string OpsAlertDeliveryConfigJson(const OpsAlertDeliveryConfig& config, bool redact_endpoint);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13957 prototype
bool LoadOpsAlertDeliveryConfigsLocked(const std::filesystem::path& path,
                                       std::unordered_map<std::string, OpsAlertDeliveryConfig>* configs,
                                       std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13991 prototype
bool LoadOpsAlertDeliveryConfigs(const WebRtcHttpRuntimeConfig& config,
                                 std::unordered_map<std::string, OpsAlertDeliveryConfig>* configs,
                                 std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13999 prototype
bool UpsertOpsAlertDeliveryConfig(const WebRtcHttpRuntimeConfig& config,
                                  const std::string& body,
                                  OpsAlertDeliveryConfig* saved,
                                  std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14058 prototype
std::string OpsAlertDeliveryAttemptJson(const OpsAlertDeliveryConfig& delivery,
                                        const std::string& event_id,
                                        const std::string& event_type,
                                        const std::string& source_id,
                                        const std::string& status,
                                        const std::string& transport,
                                        std::int64_t now_ms,
                                        bool dry_run = false,
                                        bool external_delivery_performed = false,
                                        const std::string& payload_preview_json = "");

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14094 prototype
bool AppendOpsAlertDeliveryAttempt(const WebRtcHttpRuntimeConfig& config,
                                   const std::string& attempt_json,
                                   std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14118 prototype
std::vector<std::string> LoadRecentOpsAlertDeliveryAttempts(const WebRtcHttpRuntimeConfig& config,
                                                           std::size_t limit);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14141 prototype
std::string OpsAlertDeliveryListJson(const WebRtcHttpRuntimeConfig& config);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14192 prototype
std::string OpsAlertDeliveryPayloadPreviewJson(const OpsAlertDeliveryConfig& delivery,
                                               const std::string& event_id,
                                               const std::string& event_type,
                                               const std::string& source_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14219 prototype
bool OpsAlertDeliveryBodyLooksLikeDraft(const std::string& body);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14228 prototype
bool OpsAlertDeliveryDraftFromBody(const std::string& body,
                                   OpsAlertDeliveryConfig* draft,
                                   std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14265 prototype
std::string DispatchOpsAlertDeliveryDryRun(const WebRtcHttpRuntimeConfig& config,
                                           const auth::Principal& principal,
                                           const std::string& body,
                                           std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14373 prototype
std::string DispatchOpsAlertDeliveryFixture(const WebRtcHttpRuntimeConfig& config,
                                            const auth::Principal& principal,
                                            const std::string& body,
                                            std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14433 prototype
void DispatchOpsAlertDeliveries(const WebRtcHttpRuntimeConfig& config,
                                const analysis::AnalysisResult& result,
                                const std::vector<analysis::AnalysisEvent>& events);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14466 prototype
std::pair<std::string, std::string> SourceHealthAuditStateParts(const std::string& state);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14474 prototype
std::string SourceHealthAuditStateValue(const OpsSourceHealthItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14478 prototype
std::string SourceHealthAuditRecordBody(const OpsSourceHealthItem& item,
                                        const std::string& before_status,
                                        const std::string& before_reason);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14506 prototype
void AppendOpsSourceHealthAuditChanges(const WebRtcHttpRuntimeConfig& config,
                                       const auth::Principal& principal,
                                       const OpsSourceHealthSnapshot& snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14538 prototype
bool OpsAuditLineMatches(const std::string& line,
                         const std::string& area,
                         const std::string& actor,
                         const std::string& action,
                         const std::string& target,
                         const std::string& user,
                         const std::string& query_text,
                         const std::optional<std::int64_t>& from_ms,
                         const std::optional<std::int64_t>& to_ms);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14586 type
struct OpsAuditQueryResult {
    std::filesystem::path storage_path;
    std::vector<std::string> entries;
    int offset{0};
    int limit{80};
    int total{0};
    int scanned{0};
    std::optional<std::int64_t> from_ms;
    std::optional<std::int64_t> to_ms;
    bool has_more{false};
    OpsAuditRetentionSummary retention;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14599 prototype
std::optional<std::int64_t> ParseOpsAuditTimeQuery(
    const std::unordered_map<std::string, std::string>& query,
    const std::string& key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14617 prototype
OpsAuditQueryResult QueryOpsAuditEntries(const WebRtcHttpRuntimeConfig& config,
                                         const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14671 prototype
std::string OpsV390StagingRestoreValidationHandoffJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14749 type
struct OpsV330ReliabilityTimelineEvent {
    std::string type;
    std::string at;
    std::string source_id;
    std::string status;
    std::string reason;
    std::string summary;
    std::string audit_id;
    std::string audit_target;
    std::vector<std::string> warnings;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14761 type
struct OpsV330ReliabilityTimelineItem {
    std::string source_id;
    std::string display_name;
    std::string source_kind;
    std::string current_health_status;
    std::string current_health_reason;
    std::string checked_at;
    int reconnect_count{0};
    std::string last_reconnect_at;
    int source_warning_count{0};
    int status_transition_count{0};
    std::string audit_route;
    std::vector<std::string> warnings;
    std::vector<OpsV330ReliabilityTimelineEvent> health_history;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14777 type
struct OpsV330ReliabilityTimelineSummary {
    int source_count{0};
    int live_count{0};
    int stale_count{0};
    int offline_count{0};
    int connecting_count{0};
    int warning_source_count{0};
    int status_transition_count{0};
    int reconnect_source_count{0};
    int health_history_event_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14789 prototype
OpsV330ReliabilityTimelineEvent OpsV330CurrentHealthEvent(const OpsSourceHealthItem& health);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14801 prototype
std::unordered_map<std::string, std::vector<OpsV330ReliabilityTimelineEvent>>
OpsV330SourceHealthAuditHistory(const WebRtcHttpRuntimeConfig& config);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14838 prototype
OpsV330ReliabilityTimelineSummary BuildV330ReliabilityTimelineHealthHistorySummary(
    const std::vector<OpsV330ReliabilityTimelineItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14864 prototype
std::vector<OpsV330ReliabilityTimelineItem> BuildV330ReliabilityTimelineHealthHistory(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14924 prototype
void AppendV330ReliabilityTimelineEventJson(std::ostringstream& out,
                                            const OpsV330ReliabilityTimelineEvent& event);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14943 prototype
void AppendV330ReliabilityTimelineItemJson(std::ostringstream& out,
                                           const OpsV330ReliabilityTimelineItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14971 prototype
void AppendV330ReliabilityTimelineSummaryJson(std::ostringstream& out,
                                              const OpsV330ReliabilityTimelineSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14986 prototype
std::string OpsV330ReliabilityTimelineHealthHistoryJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15035 type
struct OpsV330SourceReliabilitySearchMetricItem {
    std::string source_id;
    std::string display_name;
    std::string source_kind;
    std::string health_status;
    std::string health_reason;
    std::string checked_at;
    std::string filter_key;
    int reconnect_count{0};
    std::string last_reconnect_at;
    int source_warning_count{0};
    int status_transition_count{0};
    int attention_score{0};
    std::string audit_route;
    std::vector<std::string> warnings;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15052 type
struct OpsV330SourceReliabilitySavedView {
    std::string key;
    std::string label;
    std::string description;
    std::string filter_key;
    int matched_source_count{0};
    std::string route;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15061 type
struct OpsV330SourceReliabilitySearchMetricsSummary {
    int source_count{0};
    int matched_source_count{0};
    int live_count{0};
    int connecting_count{0};
    int stale_count{0};
    int offline_count{0};
    int warning_source_count{0};
    int reconnect_source_count{0};
    int reconnect_total{0};
    int high_reconnect_source_count{0};
    int repeated_stale_source_count{0};
    int status_transition_count{0};
    int saved_view_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15077 prototype
bool OpsV330SourceReliabilityHasWarning(const OpsV330SourceReliabilitySearchMetricItem& item,
                                        const std::string& warning);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15082 prototype
std::string OpsV330SourceReliabilityFilterKey(const OpsSourceHealthItem& health);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15101 prototype
int OpsV330SourceReliabilityAttentionScore(
    const OpsSourceHealthItem& health,
    int status_transition_count);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15118 prototype
std::vector<OpsV330SourceReliabilitySearchMetricItem> BuildV330SourceReliabilitySearchMetrics(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15174 prototype
OpsV330SourceReliabilitySearchMetricsSummary BuildV330SourceReliabilitySearchMetricsSummary(
    const std::vector<OpsV330SourceReliabilitySearchMetricItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15209 prototype
int OpsV330SourceReliabilitySavedViewMatchCount(
    const std::vector<OpsV330SourceReliabilitySearchMetricItem>& items,
    const std::string& filter_key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15227 prototype
std::vector<OpsV330SourceReliabilitySavedView> BuildV330SourceReliabilitySavedViews(
    const std::vector<OpsV330SourceReliabilitySearchMetricItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15247 prototype
void AppendV330SourceReliabilitySearchMetricItemJson(
    std::ostringstream& out,
    const OpsV330SourceReliabilitySearchMetricItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15271 prototype
void AppendV330SourceReliabilitySavedViewJson(
    std::ostringstream& out,
    const OpsV330SourceReliabilitySavedView& view);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15284 prototype
void AppendV330SourceReliabilitySearchMetricsSummaryJson(
    std::ostringstream& out,
    const OpsV330SourceReliabilitySearchMetricsSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15304 prototype
void AppendV330SourceReliabilityFilterJson(std::ostringstream& out,
                                           const std::string& key,
                                           const std::string& label,
                                           int count);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15315 prototype
void AppendV330SourceReliabilityFilterListJson(
    std::ostringstream& out,
    const OpsV330SourceReliabilitySearchMetricsSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15335 prototype
std::string OpsV330SourceReliabilitySearchMetricsJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15404 type
struct OpsV340SourceHealthReplayDriftItem {
    std::string source_id;
    std::string handoff_status{"unknown"};
    std::string fresh_status{"unknown"};
    int reconnect_delta{0};
    int warning_delta{0};
    int stale_delta{0};
    int offline_delta{0};
    std::string drift_status{"stable"};
    std::string summary;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15416 type
struct OpsV340SourceHealthReplayDriftSummary {
    int source_count{0};
    int changed_source_count{0};
    int stale_delta{0};
    int offline_delta{0};
    int reconnect_delta{0};
    int warning_delta{0};
    int blocked_count{0};
    int ready_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15427 prototype
int V340SourceHealthWarningCount(const OpsSourceHealthItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15431 prototype
OpsSourceHealthSnapshot BuildV340HandoffSourceHealthReplaySnapshot(
    const OpsSourceHealthSnapshot& fresh_source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15438 prototype
std::vector<OpsV340SourceHealthReplayDriftItem> BuildV340SourceHealthReplayDriftDiffItems(
    const OpsSourceHealthSnapshot& handoff_source_health_snapshot,
    const OpsSourceHealthSnapshot& fresh_source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15482 prototype
OpsV340SourceHealthReplayDriftSummary BuildV340SourceHealthReplayDriftSummary(
    const std::vector<OpsV340SourceHealthReplayDriftItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15503 prototype
void AppendV340SourceHealthReplayDriftItemJson(
    std::ostringstream& out,
    const OpsV340SourceHealthReplayDriftItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15519 prototype
void AppendV340SourceHealthReplayDriftSummaryJson(
    std::ostringstream& out,
    const OpsV340SourceHealthReplayDriftSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15534 prototype
std::string OpsV340SourceHealthReplayDriftDiffJson(
    const OpsSourceHealthSnapshot& fresh_source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15596 type
struct OpsV330BackupRecoverySourceHandoffInput {
    std::string key;
    std::string label;
    std::string source;
    std::string route;
    std::string validation_status;
    std::string validation_summary;
    int source_count{0};
    int published_view_count{0};
    int affected_source_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15608 type
struct OpsV330BackupRecoveryValidationPlanItem {
    std::string key;
    std::string label;
    std::string status;
    std::string summary;
    std::string route;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15616 type
struct OpsV330BackupRecoverySourceHandoffSummary {
    int source_count{0};
    int published_view_count{0};
    int source_health_snapshot_count{0};
    int stale_source_count{0};
    int offline_source_count{0};
    int recovery_validation_plan_count{0};
    int validation_ready_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15626 prototype
std::vector<OpsV330BackupRecoveryValidationPlanItem> BuildV330BackupRecoveryValidationPlan(
    const OpsSourceHealthSnapshot& source_health_snapshot,
    int source_count,
    int published_view_count);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15654 prototype
std::vector<OpsV330BackupRecoverySourceHandoffInput> BuildV330BackupRecoverySourceHandoffInputs(
    const OpsSourceHealthSnapshot& source_health_snapshot,
    int source_count,
    int published_view_count,
    int validation_plan_count);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15699 prototype
OpsV330BackupRecoverySourceHandoffSummary BuildV330BackupRecoverySourceHandoffSummary(
    const OpsSourceHealthSnapshot& source_health_snapshot,
    int source_count,
    int published_view_count,
    const std::vector<OpsV330BackupRecoveryValidationPlanItem>& validation_plan);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15719 prototype
void AppendV330BackupRecoverySourceHandoffInputJson(
    std::ostringstream& out,
    const OpsV330BackupRecoverySourceHandoffInput& input);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15735 prototype
void AppendV330BackupRecoveryValidationPlanJson(
    std::ostringstream& out,
    const OpsV330BackupRecoveryValidationPlanItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15747 prototype
void AppendV330BackupRecoverySourceHandoffSummaryJson(
    std::ostringstream& out,
    const OpsV330BackupRecoverySourceHandoffSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15761 prototype
std::string OpsV330BackupRecoverySourceHandoffJson(
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15843 type
struct OpsV340ContinuityDrillContractInput {
    std::string key;
    std::string label;
    std::string source;
    std::string route;
    std::string required_for;
    std::string boundary;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15852 prototype
std::vector<OpsV340ContinuityDrillContractInput> BuildV340ContinuityDrillContractInputs();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15887 prototype
void AppendV340ContinuityDrillContractInputJson(
    std::ostringstream& out,
    const OpsV340ContinuityDrillContractInput& input);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15900 prototype
std::string OpsV340ContinuityDrillContractJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15955 type
struct OpsV340RecoveryCandidateContext {
    std::unordered_map<std::string, std::vector<std::string>> view_ids_by_source;
    std::unordered_map<std::string, const OpsSourceHealthItem*> health_by_source;
    std::unordered_map<std::string, int> event_count_by_source;
    std::unordered_map<std::string, int> audit_count_by_source;
    std::vector<std::string> sample_event_ids;
    std::vector<std::string> sample_audit_actions;
    bool event_query_ok{true};
    bool audit_query_ok{true};
    std::string event_query_error;
    int event_record_matched_count{0};
    int audit_entry_total{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15969 type
struct OpsV340RecoveryCandidatePackageItem {
    std::string source_id;
    std::string display_name;
    std::string source_kind;
    bool source_enabled{true};
    std::vector<std::string> published_view_ids;
    std::string source_health_status{"unknown"};
    std::string source_health_reason{"not-checked"};
    int event_record_count{0};
    int audit_entry_count{0};
    std::string recovery_readiness{"ready"};
    std::vector<std::string> readiness_reasons;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15983 type
struct OpsV340RecoveryCandidatePackageSummary {
    int source_count{0};
    int published_view_count{0};
    int candidate_count{0};
    int ready_count{0};
    int degraded_count{0};
    int blocked_count{0};
    int event_record_count{0};
    int audit_entry_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 15994 prototype
OpsV340RecoveryCandidateContext BuildV340RecoveryCandidateContext(
    const std::vector<SourceViewRegistry::PublishedViewRecord>& views,
    const OpsSourceHealthSnapshot& source_health_snapshot,
    const WebRtcHttpRuntimeConfig& config);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16058 prototype
std::vector<OpsV340RecoveryCandidatePackageItem> BuildV340RecoveryCandidatePackages(
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    const OpsV340RecoveryCandidateContext& context);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16106 prototype
OpsV340RecoveryCandidatePackageSummary BuildV340RecoveryCandidatePackageSummary(
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    const std::vector<SourceViewRegistry::PublishedViewRecord>& views,
    const std::vector<OpsV340RecoveryCandidatePackageItem>& candidates,
    const OpsV340RecoveryCandidateContext& context);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16129 prototype
void AppendV340RecoveryCandidateStringListJson(std::ostringstream& out,
                                               const std::vector<std::string>& values);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16141 prototype
void AppendV340RecoveryCandidatePackageItemJson(
    std::ostringstream& out,
    const OpsV340RecoveryCandidatePackageItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16162 prototype
void AppendV340RecoveryCandidateEventAuditContextJson(
    std::ostringstream& out,
    const OpsV340RecoveryCandidateContext& context);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16179 prototype
void AppendV340RecoveryCandidatePackageSummaryJson(
    std::ostringstream& out,
    const OpsV340RecoveryCandidatePackageSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16194 prototype
std::string OpsV340RecoveryCandidatePackageJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16281 type
struct OpsV340ApprovalGatedRecoveryChecklistItem {
    std::string source_id;
    std::string display_name;
    std::string source_kind;
    std::string readiness_status{"not-run"};
    std::string operator_note;
    std::string dry_run_result;
    std::string audit_route;
    int audit_entry_count{0};
    bool field_smoke_required{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16293 type
struct OpsV340ApprovalGatedRecoveryChecklistSummary {
    int item_count{0};
    int ready_count{0};
    int blocked_count{0};
    int field_smoke_needed_count{0};
    int not_run_count{0};
    int audit_linked_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16302 prototype
std::string JoinV340ApprovalRecoveryStrings(const std::vector<std::string>& values,
                                            const std::string& delimiter);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16314 prototype
std::string V340ApprovalRecoveryStatusFor(const OpsV340RecoveryCandidatePackageItem& candidate);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16327 prototype
std::string V340ApprovalRecoveryDryRunResultFor(
    const OpsV340RecoveryCandidatePackageItem& candidate,
    const std::string& readiness_status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16342 prototype
std::vector<OpsV340ApprovalGatedRecoveryChecklistItem> BuildV340ApprovalGatedRecoveryChecklist(
    const std::vector<OpsV340RecoveryCandidatePackageItem>& candidates);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16365 prototype
OpsV340ApprovalGatedRecoveryChecklistSummary BuildV340ApprovalGatedRecoveryChecklistSummary(
    const std::vector<OpsV340ApprovalGatedRecoveryChecklistItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16386 prototype
void AppendV340ApprovalGatedRecoveryChecklistSummaryJson(
    std::ostringstream& out,
    const OpsV340ApprovalGatedRecoveryChecklistSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16399 prototype
void AppendV340ApprovalGatedRecoveryChecklistItemJson(
    std::ostringstream& out,
    const OpsV340ApprovalGatedRecoveryChecklistItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16421 prototype
std::string OpsV340ApprovalGatedRecoveryChecklistJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16495 type
struct OpsV340DrillEvidenceArtifact {
    std::string artifact_key;
    std::string label;
    std::string route;
    std::string retention_reason;
    bool retained{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16503 type
struct OpsV340DrillCleanupManifestItem {
    std::string cleanup_key;
    std::string label;
    std::string scope;
    std::string path_pattern;
    std::string status{"not-run"};
    std::string reason;
    bool cleanup_execution_performed{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16513 type
struct OpsV340DrillEvidenceExportCleanupSummary {
    int retained_evidence_count{0};
    int artifact_count{0};
    int cleanup_candidate_count{0};
    int sensitive_scan_pattern_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16520 prototype
std::vector<OpsV340DrillEvidenceArtifact> BuildV340DrillEvidenceArtifactManifest(
    const std::vector<OpsV340RecoveryCandidatePackageItem>& candidates,
    const std::vector<OpsV340ApprovalGatedRecoveryChecklistItem>& checklist_items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16556 prototype
std::vector<OpsV340DrillCleanupManifestItem> BuildV340DrillCleanupManifest();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16591 prototype
std::vector<std::string> BuildV340DrillSensitiveMaterialScanPatterns();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16602 prototype
OpsV340DrillEvidenceExportCleanupSummary BuildV340DrillEvidenceExportCleanupSummary(
    const std::vector<OpsV340DrillEvidenceArtifact>& artifacts,
    const std::vector<OpsV340DrillCleanupManifestItem>& cleanup_items,
    const std::vector<std::string>& scan_patterns);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16618 prototype
void AppendV340DrillEvidenceArtifactJson(std::ostringstream& out,
                                         const OpsV340DrillEvidenceArtifact& artifact);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16637 prototype
void AppendV340DrillCleanupManifestItemJson(std::ostringstream& out,
                                            const OpsV340DrillCleanupManifestItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16651 prototype
void AppendV340DrillEvidenceExportCleanupSummaryJson(
    std::ostringstream& out,
    const OpsV340DrillEvidenceExportCleanupSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16662 prototype
std::string OpsV340DrillEvidenceExportCleanupManifestJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16777 type
struct OpsV340FieldBridgeConditionGate {
    std::string gate_key;
    std::string bridge_kind;
    std::string label;
    std::string field_smoke_status{"field-smoke-needed"};
    std::string execution_status{"not-run"};
    std::string source_only_pass_result{"blocked"};
    std::string field_smoke_command;
    std::string condition_summary;
    bool endpoint_required{true};
    bool credential_required{true};
    bool operator_approval_required{true};
    bool source_only_pass_accepted{false};
    bool field_smoke_executed{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16793 type
struct OpsV340FieldBridgeConditionGateSummary {
    int gate_count{0};
    int field_smoke_needed_count{0};
    int blocked_count{0};
    int not_run_count{0};
    int endpoint_required_count{0};
    int credential_required_count{0};
    int approval_required_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16803 prototype
std::vector<OpsV340FieldBridgeConditionGate> BuildV340FieldBridgeConditionGates();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16847 prototype
OpsV340FieldBridgeConditionGateSummary BuildV340FieldBridgeConditionGateSummary(
    const std::vector<OpsV340FieldBridgeConditionGate>& gates);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16874 prototype
void AppendV340FieldBridgeConditionGateJson(std::ostringstream& out,
                                            const OpsV340FieldBridgeConditionGate& gate);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16902 prototype
void AppendV340FieldBridgeConditionGateSummaryJson(
    std::ostringstream& out,
    const OpsV340FieldBridgeConditionGateSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16916 prototype
std::string OpsV340FieldBridgeConditionGatesJson(
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 16999 type
struct OpsV350LiveOperationsGraphNode {
    std::string node_id;
    std::string node_type;
    std::string label;
    std::string status;
    std::string source_id;
    std::vector<std::string> published_view_ids;
    int event_record_count{0};
    std::string source_health_status{"unknown"};
    std::string continuity_drill_readiness{"unknown"};
    std::string client_impact{"none"};
    std::string viewer_safe_impact_summary{"No client-visible change is introduced by this read model."};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17013 type
struct OpsV350LiveOperationsGraphEdge {
    std::string edge_id;
    std::string from_node_id;
    std::string to_node_id;
    std::string edge_type;
    std::string status;
    std::string summary;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17022 type
struct OpsV350LiveOperationsGraphSummary {
    int source_count{0};
    int published_view_count{0};
    int event_record_count{0};
    int source_health_count{0};
    int continuity_drill_candidate_count{0};
    int client_impact_count{0};
    int degraded_source_count{0};
    int blocked_count{0};
    int edge_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17034 type
struct OpsV350LiveOperationsGraphContext {
    std::vector<SourceViewRegistry::SourceRecord> sources;
    std::vector<SourceViewRegistry::PublishedViewRecord> views;
    std::vector<OpsV340RecoveryCandidatePackageItem> recovery_candidates;
    std::vector<OpsV340SourceHealthReplayDriftItem> source_health_replay_drift_items;
    std::unordered_map<std::string, const OpsSourceHealthItem*> health_by_source;
    std::unordered_map<std::string, std::vector<std::string>> published_view_ids_by_source;
    std::unordered_map<std::string, int> event_record_count_by_source;
    std::unordered_map<std::string, std::string> source_health_status_by_source;
    bool ok{true};
    std::string error;
    int event_record_count{0};
    std::string client_impact{"viewer-safe"};
    std::string viewer_safe_impact_summary{
        "Ops graph is redacted and does not add viewer/client payload exposure."};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17051 prototype
OpsV350LiveOperationsGraphContext BuildV350LiveOperationsGraphContext(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17111 prototype
const OpsV340RecoveryCandidatePackageItem* V350RecoveryCandidateForSource(
    const std::vector<OpsV340RecoveryCandidatePackageItem>& candidates,
    const std::string& source_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17122 prototype
std::vector<OpsV350LiveOperationsGraphNode> BuildV350LiveOperationsGraphNodes(
    const OpsV350LiveOperationsGraphContext& context);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17225 prototype
std::vector<OpsV350LiveOperationsGraphEdge> BuildV350LiveOperationsGraphEdges(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV350LiveOperationsGraphNode>& graphNodes);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17277 prototype
OpsV350LiveOperationsGraphSummary BuildV350LiveOperationsGraphSummary(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV350LiveOperationsGraphEdge>& graphEdges);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17302 prototype
void AppendV350LiveOperationsGraphNodeJson(std::ostringstream& out,
                                           const OpsV350LiveOperationsGraphNode& node);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17322 prototype
void AppendV350LiveOperationsGraphEdgeJson(std::ostringstream& out,
                                           const OpsV350LiveOperationsGraphEdge& edge);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17334 prototype
void AppendV350LiveOperationsGraphSummaryJson(std::ostringstream& out,
                                              const OpsV350LiveOperationsGraphSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17349 prototype
std::string OpsV350LiveOperationsGraphJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17422 type
struct OpsV370SiteImpactGraphNode {
    std::string node_id;
    std::string node_type;
    std::string site_id;
    std::string source_group;
    std::string label;
    std::string status;
    std::string source_id;
    std::vector<std::string> published_view_ids;
    std::vector<std::string> refs;
    int event_record_count{0};
    std::string source_health_status{"unknown"};
    std::string client_impact{"viewer-safe-summary"};
    std::string viewer_safe_impact_summary{
        "Site impact graph is redacted and does not add viewer/client payload exposure."};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17439 type
struct OpsV370SiteImpactGraphEdge {
    std::string edge_id;
    std::string from_node_id;
    std::string to_node_id;
    std::string edge_type;
    std::string site_id;
    std::string source_group;
    std::string status;
    std::string summary;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17450 type
struct OpsV370SiteImpactGraphSummary {
    int site_count{0};
    int source_group_count{0};
    int source_count{0};
    int published_view_count{0};
    int event_record_count{0};
    int source_health_count{0};
    int client_impact_count{0};
    int field_needed_group_count{0};
    int node_count{0};
    int edge_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17464 prototype
const SourceViewRegistry::SourceRecord* V370SourceById(
    const std::vector<SourceViewRegistry::SourceRecord>& sources,
    const std::string& source_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17473 prototype
std::vector<std::string> V370PublishedViewIdsForSource(
    const OpsV350LiveOperationsGraphContext& context,
    const std::string& source_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17481 prototype
int V370EventRecordCountForSource(
    const OpsV350LiveOperationsGraphContext& context,
    const std::string& source_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17488 prototype
std::string V370SourceHealthStatusForSource(
    const OpsV350LiveOperationsGraphContext& context,
    const std::string& source_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17495 prototype
const OpsV370SiteHealthRollupItem* V370RollupForProjection(
    const std::vector<OpsV370SiteHealthRollupItem>& rollups,
    const OpsV370SiteAwareSourceRegistryProjectionItem& projected);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17506 prototype
std::vector<OpsV370SiteImpactGraphNode> BuildV370SiteImpactGraphNodes(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370SiteHealthRollupItem>& rollups);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17658 prototype
std::vector<OpsV370SiteImpactGraphEdge> BuildV370SiteImpactGraphEdges(
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17742 prototype
OpsV370SiteImpactGraphSummary BuildV370SiteImpactGraphSummary(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV370SiteHealthRollupItem>& rollups,
    const std::vector<OpsV370SiteImpactGraphNode>& nodes,
    const std::vector<OpsV370SiteImpactGraphEdge>& edges);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17779 prototype
void AppendV370SiteImpactGraphSummaryJson(
    std::ostringstream& out,
    const OpsV370SiteImpactGraphSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17798 prototype
void AppendV370SiteImpactGraphNodeJson(
    std::ostringstream& out,
    const OpsV370SiteImpactGraphNode& node);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17820 prototype
void AppendV370SiteImpactGraphEdgeJson(
    std::ostringstream& out,
    const OpsV370SiteImpactGraphEdge& edge);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17835 prototype
std::string OpsV370SiteImpactGraphJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17908 type
struct OpsV350CommandPlanCandidate {
    std::string candidate_id;
    std::string candidate_type;
    std::string source_id;
    std::string event_id{"not-selected"};
    std::string status{"draft"};
    std::string route;
    std::string summary;
    std::string blocked_reason{"operator-approval-required"};
    std::vector<std::string> related_node_ids;
    bool draft_only{true};
    bool operator_approval_required{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17922 type
struct OpsV350CommandPlanSummary {
    int candidate_count{0};
    int draft_count{0};
    int blocked_count{0};
    int source_recheck_count{0};
    int recovery_count{0};
    int maintenance_count{0};
    int client_notice_count{0};
    int rule_follow_up_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17933 prototype
std::vector<OpsV350CommandPlanCandidate> BuildV350CommandPlanCandidates(
    const OpsV350LiveOperationsGraphContext& context);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18019 prototype
OpsV350CommandPlanSummary BuildV350CommandPlanSummary(
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18046 prototype
void AppendV350CommandPlanCandidateJson(std::ostringstream& out,
                                        const OpsV350CommandPlanCandidate& candidate);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18070 prototype
void AppendV350CommandPlanSummaryJson(std::ostringstream& out,
                                      const OpsV350CommandPlanSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18084 prototype
std::string OpsV350CommandPlanJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18146 type
struct OpsV350IncidentCommandHandoff {
    std::string event_id{"unknown-event"};
    std::string source_id{"unknown-source"};
    std::string source_cause{"source-context-missing"};
    std::string source_cause_evidence{"source health and incident correlation context"};
    std::string continuity_drill_candidate{"drill-context-missing"};
    std::string command_plan_draft{"/ops/api/live-operations/command-plan"};
    std::string handoff_readiness{"blocked"};
    std::string operator_next_action{"review source cause and command plan draft"};
    std::vector<std::string> command_plan_candidate_ids;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18158 prototype
OpsV350IncidentCommandHandoff BuildV350IncidentCommandHandoff(
    const std::string& event_json,
    const std::string& incident_event_id,
    const std::string& source_id,
    const std::string& source_cause_category,
    const std::string& source_cause_summary,
    bool source_recheck_required,
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18202 prototype
void AppendV350IncidentCommandHandoffJson(std::ostringstream& out,
                                          const OpsV350IncidentCommandHandoff& handoff);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18248 prototype
std::string OpsV350IncidentCommandHandoffSummaryJson(
    const std::vector<OpsV350IncidentCommandHandoff>& handoffs);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18280 type
struct OpsV350ImpactPreview {
    int affected_source_count{0};
    int affected_published_view_count{0};
    int affected_rule_follow_up_count{0};
    std::string client_impact{"viewer-safe-summary"};
    std::string before_apply{"beforeApply"};
    std::string summary{"Impact preview is computed before apply."};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18289 type
struct OpsV350StagedChangePlan {
    std::string plan_id;
    std::string candidate_type;
    std::string source_id;
    std::string status{"staged"};
    std::string source_change_candidate{"not-required"};
    std::string published_view_change_candidate{"not-required"};
    std::string rule_follow_up_change_candidate{"not-required"};
    OpsV350ImpactPreview impact_preview;
    std::vector<std::string> blockers;
    bool staging_only{true};
    bool apply_blocked{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18303 type
struct OpsV350StagedChangePlanSummary {
    int plan_count{0};
    int blocked_count{0};
    int source_change_candidate_count{0};
    int published_view_change_candidate_count{0};
    int rule_follow_up_change_candidate_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18311 prototype
std::vector<OpsV350StagedChangePlan> BuildV350StagedChangePlans(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18365 prototype
OpsV350StagedChangePlanSummary BuildV350StagedChangePlanSummary(
    const std::vector<OpsV350StagedChangePlan>& stagedChangePlans);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18386 prototype
void AppendV350ImpactPreviewJson(std::ostringstream& out,
                                 const OpsV350ImpactPreview& impactPreview);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18400 prototype
void AppendV350StagedChangePlanJson(std::ostringstream& out,
                                    const OpsV350StagedChangePlan& plan);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18425 prototype
void AppendV350StagedChangePlanSummaryJson(
    std::ostringstream& out,
    const OpsV350StagedChangePlanSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18439 prototype
std::string OpsV350StagedChangePlanImpactPreviewJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18506 type
struct OpsV350DrillRunLedgerEntry {
    std::string drill_run_id;
    std::string source_id;
    std::string staged_plan_id;
    std::string command_plan_candidate_id;
    std::string status{"projected"};
    std::string operator_note{"operator-note-required"};
    std::string blocker{"operator-approval-required"};
    std::vector<std::string> evidence_refs;
    std::string previous_run_id;
    std::string compared_to_run_id;
    std::string plan_comparison{"planComparison pending"};
    std::string diff_from_previous_run{"baseline"};
    std::vector<std::string> changed_fields;
    int accumulated_run_count{1};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18523 type
struct OpsV350DrillRunLedgerSummary {
    int run_count{0};
    int blocked_count{0};
    int evidence_ref_count{0};
    int comparison_count{0};
    int changed_field_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18531 prototype
const OpsV350CommandPlanCandidate* V350CommandCandidateForStagedPlan(
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates,
    const OpsV350StagedChangePlan& plan);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18553 prototype
std::vector<OpsV350DrillRunLedgerEntry> BuildV350DrillRunLedgerEntries(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates,
    const std::vector<OpsV350StagedChangePlan>& stagedChangePlans);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18640 prototype
OpsV350DrillRunLedgerSummary BuildV350DrillRunLedgerSummary(
    const std::vector<OpsV350DrillRunLedgerEntry>& ledgerEntries);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18657 prototype
void AppendV350DrillRunLedgerSummaryJson(
    std::ostringstream& out,
    const OpsV350DrillRunLedgerSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18669 prototype
void AppendV350DrillRunLedgerEntryJson(
    std::ostringstream& out,
    const OpsV350DrillRunLedgerEntry& entry);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18693 prototype
std::string OpsV350DrillRunLedgerPlanComparisonJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18757 type
struct OpsV350OperationsExportBundleItem {
    std::string bundle_item_id;
    std::string item_type;
    std::string label;
    std::string status{"release-safe"};
    std::string route;
    std::string summary;
    std::string blocked_reason{"operator-review-required"};
    std::vector<std::string> command_plan_refs;
    std::vector<std::string> drill_ledger_refs;
    std::vector<std::string> field_evidence_refs;
    std::vector<std::string> client_impact_forecast_refs;
    std::vector<std::string> evidence_refs;
    bool release_safe{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18773 type
struct OpsV350HandoffMapEntry {
    std::string handoff_entry_id;
    std::string from_bundle_item_id;
    std::string to_bundle_item_id;
    std::string handoff_status{"blocked"};
    std::string next_operator_role{"ops-operator"};
    std::string blocked_reason{"operator-review-required"};
    std::vector<std::string> evidence_refs;
    bool release_safe{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18784 type
struct OpsV350OperationsExportBundleSummary {
    int bundle_item_count{0};
    int release_safe_count{0};
    int handoff_entry_count{0};
    int command_plan_ref_count{0};
    int drill_ledger_ref_count{0};
    int field_evidence_ref_count{0};
    int client_impact_forecast_ref_count{0};
    int blocked_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18795 prototype
std::vector<std::string> FirstV350CommandPlanRefs(
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18810 prototype
std::vector<std::string> FirstV350DrillLedgerRefs(
    const std::vector<OpsV350DrillRunLedgerEntry>& ledgerEntries);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18825 prototype
std::vector<std::string> V350FieldEvidenceRefs(
    const std::vector<OpsV340FieldBridgeConditionGate>& fieldBridgeConditionGates);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18837 prototype
std::vector<std::string> V350ClientImpactForecastRefs(
    const OpsV350LiveOperationsGraphContext& context);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18860 prototype
std::vector<OpsV350OperationsExportBundleItem> BuildV350OperationsExportBundleItems(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates,
    const std::vector<OpsV350DrillRunLedgerEntry>& ledgerEntries,
    const std::vector<OpsV340FieldBridgeConditionGate>& fieldBridgeConditionGates);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18927 prototype
std::vector<OpsV350HandoffMapEntry> BuildV350OperationsHandoffMapEntries(
    const std::vector<OpsV350OperationsExportBundleItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 18984 prototype
OpsV350OperationsExportBundleSummary BuildV350OperationsExportBundleSummary(
    const std::vector<OpsV350OperationsExportBundleItem>& items,
    const std::vector<OpsV350HandoffMapEntry>& handoffMapEntries);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19006 prototype
void AppendV350OperationsExportBundleItemJson(
    std::ostringstream& out,
    const OpsV350OperationsExportBundleItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19031 prototype
void AppendV350OperationsHandoffMapEntryJson(
    std::ostringstream& out,
    const OpsV350HandoffMapEntry& entry);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19047 prototype
void AppendV350OperationsExportBundleSummaryJson(
    std::ostringstream& out,
    const OpsV350OperationsExportBundleSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19063 prototype
std::string OpsV350OperationsExportBundleHandoffMapJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19157 type
struct OpsV350FieldEvidenceExecutionCondition {
    std::string condition_id;
    std::string evidence_id;
    std::string bridge_kind;
    std::string condition_kind;
    std::string condition_status{"missing"};
    std::string execution_status{"not-run"};
    std::string summary;
    bool endpoint_required{false};
    bool credential_required{false};
    bool operator_approval_required{false};
    bool field_smoke_executed{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19171 type
struct OpsV350FieldEvidenceIntakeRecord {
    std::string evidence_id;
    std::string bridge_kind;
    std::string label;
    std::string evidence_intake_status{"condition-gated"};
    std::string execution_status{"not-run"};
    std::string field_smoke_status{"field-smoke-needed"};
    std::string not_run_reason;
    std::string redacted_field_evidence;
    std::string result_summary;
    bool endpoint_required{true};
    bool credential_required{true};
    bool operator_approval_required{true};
    bool field_smoke_executed{false};
    std::vector<std::string> evidence_refs;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19188 type
struct OpsV350FieldEvidenceIntakeSummary {
    int evidence_record_count{0};
    int execution_condition_count{0};
    int not_run_count{0};
    int condition_gated_count{0};
    int redacted_count{0};
    int field_smoke_needed_count{0};
    int endpoint_required_count{0};
    int credential_required_count{0};
    int approval_required_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19200 prototype
std::string V350FieldEvidenceNotRunReason(
    const OpsV340FieldBridgeConditionGate& gate);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19214 prototype
std::vector<OpsV350FieldEvidenceIntakeRecord> BuildV350FieldEvidenceIntakeRecords(
    const std::vector<OpsV340FieldBridgeConditionGate>& fieldBridgeConditionGates);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19241 prototype
std::vector<OpsV350FieldEvidenceExecutionCondition> BuildV350FieldEvidenceExecutionConditions(
    const std::vector<OpsV350FieldEvidenceIntakeRecord>& fieldEvidenceIntakeRecords);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19282 prototype
OpsV350FieldEvidenceIntakeSummary BuildV350FieldEvidenceIntakeSummary(
    const std::vector<OpsV350FieldEvidenceIntakeRecord>& records,
    const std::vector<OpsV350FieldEvidenceExecutionCondition>& conditions);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19314 prototype
void AppendV350FieldEvidenceExecutionConditionJson(
    std::ostringstream& out,
    const OpsV350FieldEvidenceExecutionCondition& condition);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19334 prototype
void AppendV350FieldEvidenceIntakeRecordJson(
    std::ostringstream& out,
    const OpsV350FieldEvidenceIntakeRecord& record);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19370 prototype
void AppendV350FieldEvidenceIntakeSummaryJson(
    std::ostringstream& out,
    const OpsV350FieldEvidenceIntakeSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19386 prototype
std::string OpsV350FieldEvidenceIntakeJson(
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19475 type
struct OpsV350VlmAssistedOpsExplanationItem {
    std::string explanation_id;
    std::string explanation_type;
    std::string title;
    std::string command_plan_blocker_summary;
    std::string incident_source_relation_summary;
    std::string operator_review_hint;
    std::string source_id{"unknown-source"};
    std::string event_id{"eventRecord:recent"};
    std::string command_plan_ref{"/ops/api/live-operations/command-plan"};
    std::vector<std::string> evidence_refs;
    bool default_off{true};
    bool default_enabled{false};
    bool runtime_opt_in_required{true};
    bool vlm_provider_call_performed{false};
    bool vlm_runtime_call_performed{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19493 type
struct OpsV350VlmAssistedOpsExplanationSummary {
    int explanation_count{0};
    int command_plan_blocker_count{0};
    int incident_source_relation_count{0};
    int operator_review_hint_count{0};
    int default_off_count{0};
    int provider_call_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19502 prototype
std::string V350VlmExplanationSourceHealth(
    const OpsV350LiveOperationsGraphContext& context,
    const std::string& source_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19509 prototype
int V350VlmExplanationEventRecordCount(
    const OpsV350LiveOperationsGraphContext& context,
    const std::string& source_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19516 prototype
std::vector<OpsV350VlmAssistedOpsExplanationItem>
BuildV350VlmAssistedOpsExplanationItems(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19608 prototype
OpsV350VlmAssistedOpsExplanationSummary
BuildV350VlmAssistedOpsExplanationSummary(
    const std::vector<OpsV350VlmAssistedOpsExplanationItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19631 prototype
void AppendV350VlmAssistedOpsExplanationItemJson(
    std::ostringstream& out,
    const OpsV350VlmAssistedOpsExplanationItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19664 prototype
void AppendV350VlmAssistedOpsExplanationSummaryJson(
    std::ostringstream& out,
    const OpsV350VlmAssistedOpsExplanationSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19680 prototype
std::string OpsV350VlmAssistedOpsExplanationJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19751 type
struct OpsV360SimulationInputPackItem {
    std::string input_id;
    std::string input_type;
    std::string source_route;
    std::string snapshot_status{"available"};
    std::string write_guard{"read-only"};
    std::vector<std::string> included_fields;
    int record_count{0};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19762 type
struct OpsV360SimulationInputPackSummary {
    int input_count{0};
    int event_record_count{0};
    int source_registry_count{0};
    int published_view_count{0};
    int command_plan_candidate_count{0};
    int staged_plan_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19772 prototype
std::vector<OpsV360SimulationInputPackItem> BuildV360SimulationInputPackItems(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates,
    const std::vector<OpsV350StagedChangePlan>& stagedChangePlans);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19821 prototype
OpsV360SimulationInputPackSummary BuildV360SimulationInputPackSummary(
    const std::vector<OpsV360SimulationInputPackItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19846 prototype
void AppendV360SimulationInputPackItemJson(
    std::ostringstream& out,
    const OpsV360SimulationInputPackItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19862 prototype
void AppendV360SimulationInputPackSummaryJson(
    std::ostringstream& out,
    const OpsV360SimulationInputPackSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19877 prototype
std::string OpsV360SimulationInputPackJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19942 type
struct OpsV360SimulationRunContract {
    std::string simulation_run_id{"simulation-run:contract:v360"};
    std::vector<std::string> simulation_route_family;
    std::vector<std::string> allowed_readiness_states;
    std::string input_pack_route{"/ops/api/live-operations/simulation/input-pack"};
    std::string result_status{"not-run"};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19950 type
struct OpsV360SimulationResultEnvelope {
    std::string simulation_run_id{"simulation-run:contract:v360"};
    std::string result_status{"not-run"};
    std::string ready_status{"not-run"};
    std::string summary{"simulation result envelope is defined but not persisted"};
    std::vector<std::string> blockers;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19958 prototype
OpsV360SimulationRunContract BuildV360SimulationRunContract();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19983 prototype
OpsV360SimulationResultEnvelope BuildV360SimulationResultEnvelope(
    const OpsV360SimulationInputPackSummary& input_summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 19997 prototype
void AppendV360SimulationRunContractJson(
    std::ostringstream& out,
    const OpsV360SimulationRunContract& contract);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20011 prototype
void AppendV360SimulationResultEnvelopeJson(
    std::ostringstream& out,
    const OpsV360SimulationResultEnvelope& envelope);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20024 prototype
std::string OpsV360OperationsSimulationRunContractJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20079 type
struct OpsV370SiteSimulationInputPackItem {
    std::string pack_id;
    std::string input_type;
    std::string site_id;
    std::string source_group;
    std::string source_route;
    std::string snapshot_status{"available"};
    std::string write_guard{"read-only siteScopedInputPack; no simulation run"};
    std::vector<std::string> source_ids;
    std::vector<std::string> published_view_ids;
    std::vector<std::string> included_fields;
    std::vector<std::string> refs;
    int record_count{0};
    int event_record_count{0};
    int source_health_count{0};
    int impact_graph_node_count{0};
    int impact_graph_edge_count{0};
    bool site_scoped{true};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20100 type
struct OpsV370SiteSimulationInputPackSummary {
    int pack_count{0};
    int site_count{0};
    int source_group_count{0};
    int source_count{0};
    int published_view_count{0};
    int event_record_count{0};
    int source_health_count{0};
    int impact_graph_node_count{0};
    int impact_graph_edge_count{0};
    int v360_input_count{0};
    int v360_command_plan_candidate_count{0};
    int v360_staged_plan_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20116 prototype
int V370ImpactGraphNodeCountForScope(
    const std::vector<OpsV370SiteImpactGraphNode>& nodes,
    const OpsV370SiteAwareSourceRegistryProjectionItem& projected);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20125 prototype
int V370ImpactGraphEdgeCountForScope(
    const std::vector<OpsV370SiteImpactGraphEdge>& edges,
    const OpsV370SiteAwareSourceRegistryProjectionItem& projected);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20133 prototype
int V370SourceHealthCountForProjection(
    const OpsV350LiveOperationsGraphContext& context,
    const OpsV370SiteAwareSourceRegistryProjectionItem& projected);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20145 prototype
int V370EventRecordCountForProjection(
    const OpsV350LiveOperationsGraphContext& context,
    const OpsV370SiteAwareSourceRegistryProjectionItem& projected);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20155 prototype
std::vector<OpsV370SiteSimulationInputPackItem> BuildV370SiteSimulationInputPackItems(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370SiteHealthRollupItem>& rollups,
    const std::vector<OpsV370SiteImpactGraphNode>& impactGraphNodes,
    const std::vector<OpsV370SiteImpactGraphEdge>& impactGraphEdges,
    const std::vector<OpsV360SimulationInputPackItem>& v360InputPackItems);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20288 prototype
OpsV370SiteSimulationInputPackSummary BuildV370SiteSimulationInputPackSummary(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370SiteSimulationInputPackItem>& items,
    const OpsV360SimulationInputPackSummary& v360InputPackSummary,
    const std::vector<OpsV370SiteImpactGraphNode>& impactGraphNodes,
    const std::vector<OpsV370SiteImpactGraphEdge>& impactGraphEdges);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20327 prototype
void AppendV370SiteSimulationInputPackItemJson(
    std::ostringstream& out,
    const OpsV370SiteSimulationInputPackItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20356 prototype
void AppendV370SiteSimulationInputPackSummaryJson(
    std::ostringstream& out,
    const OpsV370SiteSimulationInputPackSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20377 prototype
std::string OpsV370SiteSimulationInputPackJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20476 type
struct OpsV360CommandPlanDryRunResult {
    std::string result_id;
    std::string candidate_id;
    std::string candidate_type;
    std::string source_id;
    std::string dry_run_status{"dryRunComputed"};
    std::string predicted_result{"no-write candidate result"};
    std::string write_plan{"writePlan: no write will be performed"};
    std::vector<std::string> blockers;
    bool dry_run_computed{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20488 type
struct OpsV360CommandPlanDryRunSummary {
    int result_count{0};
    int source_recheck_count{0};
    int recovery_count{0};
    int maintenance_count{0};
    int client_notice_count{0};
    int rule_follow_up_count{0};
    int blocked_count{0};
    std::string derivation_source{"BuildV350CommandPlanCandidates"};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20499 prototype
std::vector<OpsV360CommandPlanDryRunResult> BuildV360CommandPlanDryRunResults(
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20552 prototype
OpsV360CommandPlanDryRunSummary BuildV360CommandPlanDryRunSummary(
    const std::vector<OpsV360CommandPlanDryRunResult>& results);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20575 prototype
void AppendV360CommandPlanDryRunResultJson(
    std::ostringstream& out,
    const OpsV360CommandPlanDryRunResult& result);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20597 prototype
void AppendV360CommandPlanDryRunSummaryJson(
    std::ostringstream& out,
    const OpsV360CommandPlanDryRunSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20612 prototype
std::string OpsV360CommandPlanDryRunSimulatorJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20666 type
struct OpsV360SourceRuleImpactDiff {
    std::string diff_id;
    std::string source_id;
    std::string candidate_id;
    std::string candidate_type;
    std::string before_state{"beforeState: current"};
    std::string after_state{"afterState: simulated"};
    std::string source_health_diff{"sourceHealthDiff: no persisted change"};
    std::string event_risk_diff{"eventRiskDiff: no EventRecord mutation"};
    std::string client_impact_diff{"clientImpactDiff: viewer-safe summary only"};
    std::string source_change_candidate{"not-required"};
    std::string rule_change_candidate{"not-required"};
    std::vector<std::string> blockers;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20681 type
struct OpsV360SourceRuleImpactDiffSummary {
    int diff_count{0};
    int source_health_diff_count{0};
    int event_risk_diff_count{0};
    int client_impact_diff_count{0};
    int rule_change_candidate_count{0};
    int blocked_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20691 prototype
std::vector<OpsV360SourceRuleImpactDiff> BuildV360SourceRuleImpactDiffs(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates,
    const std::vector<OpsV350StagedChangePlan>& stagedChangePlans);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20739 prototype
OpsV360SourceRuleImpactDiffSummary BuildV360SourceRuleImpactDiffSummary(
    const std::vector<OpsV360SourceRuleImpactDiff>& diffs);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20768 prototype
void AppendV360SourceRuleImpactDiffJson(
    std::ostringstream& out,
    const OpsV360SourceRuleImpactDiff& diff);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20788 prototype
void AppendV360SourceRuleImpactDiffSummaryJson(
    std::ostringstream& out,
    const OpsV360SourceRuleImpactDiffSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20803 prototype
std::string OpsV360SourceRuleImpactDiffJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20863 type
struct OpsV360SafeApplyReadinessItem {
    std::string readiness_id;
    std::string candidate_id;
    std::string candidate_type;
    std::string source_id;
    std::string readiness_state{"not-run"};
    std::vector<std::string> blockers;
    bool operator_approval_required{true};
    bool field_evidence_required{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20874 type
struct OpsV360SafeApplyReadinessSummary {
    int item_count{0};
    int ready_count{0};
    int blocked_count{0};
    int approval_needed_count{0};
    int field_needed_count{0};
    int not_run_count{0};
    int blocker_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20885 prototype
std::vector<OpsV360SafeApplyReadinessItem> BuildV360SafeApplyReadinessItems(
    const std::vector<OpsV360CommandPlanDryRunResult>& dryRunResults,
    const std::vector<OpsV360SourceRuleImpactDiff>& diffs);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20927 prototype
OpsV360SafeApplyReadinessSummary BuildV360SafeApplyReadinessSummary(
    const std::vector<OpsV360SafeApplyReadinessItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20952 prototype
void AppendV360SafeApplyReadinessItemJson(
    std::ostringstream& out,
    const OpsV360SafeApplyReadinessItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20970 prototype
void AppendV360SafeApplyReadinessSummaryJson(
    std::ostringstream& out,
    const OpsV360SafeApplyReadinessSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 20986 prototype
std::string OpsV360SafeApplyReadinessGateJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21051 type
struct OpsV370CrossSiteSafeApplyReadinessItem {
    std::string readiness_id;
    std::string candidate_id;
    std::string candidate_type;
    std::string source_id;
    std::string site_id;
    std::string source_group;
    std::string readiness_state{"not-run"};
    std::string cross_site_impact{"site-scoped"};
    std::vector<std::string> affected_source_ids;
    std::vector<std::string> affected_client_refs;
    std::vector<std::string> blockers;
    std::vector<std::string> evidence_refs;
    bool operator_approval_required{true};
    bool field_evidence_required{false};
    bool cross_site_review_required{false};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21070 type
struct OpsV370CrossSiteSafeApplyReadinessSummary {
    int item_count{0};
    int ready_count{0};
    int blocked_count{0};
    int approval_needed_count{0};
    int field_needed_count{0};
    int not_run_count{0};
    int blocker_count{0};
    int affected_client_count{0};
    int cross_site_review_required_count{0};
    int source_group_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21084 prototype
const OpsV370SiteAwareSourceRegistryProjectionItem* V370ProjectionForSource(
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::string& source_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21096 prototype
std::vector<std::string> V370AffectedClientRefsForProjection(
    const OpsV370SiteAwareSourceRegistryProjectionItem* projected);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21108 prototype
const OpsV360SourceRuleImpactDiff* V370ImpactDiffForCandidate(
    const std::vector<OpsV360SourceRuleImpactDiff>& diffs,
    const std::string& candidate_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21117 prototype
int V370SiteSimulationPackCountForScope(
    const std::vector<OpsV370SiteSimulationInputPackItem>& siteSimulationInputPackItems,
    const std::string& site_id,
    const std::string& source_group);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21129 prototype
std::vector<OpsV370CrossSiteSafeApplyReadinessItem> BuildV370CrossSiteSafeApplyReadinessItems(
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370SiteSimulationInputPackItem>& siteSimulationInputPackItems,
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems,
    const std::vector<OpsV360SourceRuleImpactDiff>& diffs);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21196 prototype
OpsV370CrossSiteSafeApplyReadinessSummary BuildV370CrossSiteSafeApplyReadinessSummary(
    const std::vector<OpsV370CrossSiteSafeApplyReadinessItem>& items,
    const OpsV360SafeApplyReadinessSummary& v360ReadinessSummary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21234 prototype
void AppendV370CrossSiteSafeApplyReadinessItemJson(
    std::ostringstream& out,
    const OpsV370CrossSiteSafeApplyReadinessItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21264 prototype
void AppendV370CrossSiteSafeApplyReadinessSummaryJson(
    std::ostringstream& out,
    const OpsV370CrossSiteSafeApplyReadinessSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21283 prototype
std::string OpsV370CrossSiteSafeApplyReadinessJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21378 type
struct OpsV370RunbookTemplateContractItem {
    std::string runbook_template_id;
    std::string template_type;
    std::string candidate_id;
    std::string candidate_type;
    std::string site_id{"unassigned-site"};
    std::string source_group{"unassigned-source-group"};
    std::string review_policy{"approval-ticket-required"};
    std::vector<std::string> required_inputs;
    std::vector<std::string> approval_state_catalog;
    std::vector<std::string> output_refs;
    std::vector<std::string> evidence_refs;
    bool operator_approval_required{true};
    bool field_evidence_required{false};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21395 type
struct OpsV370RunbookTemplateContractSummary {
    int template_count{0};
    int source_recheck_count{0};
    int maintenance_count{0};
    int rule_draft_count{0};
    int client_notice_count{0};
    int approval_required_count{0};
    int field_required_count{0};
    int cross_site_readiness_ref_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21407 prototype
std::string V370RunbookTemplateTypeForCandidate(const std::string& candidate_type);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21423 prototype
const OpsV360SafeApplyReadinessItem* V370ReadinessForCandidate(
    const std::vector<OpsV360SafeApplyReadinessItem>& readiness_items,
    const std::string& candidate_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21432 prototype
const OpsV370CrossSiteSafeApplyReadinessItem* V370CrossSiteReadinessForCandidate(
    const std::vector<OpsV370CrossSiteSafeApplyReadinessItem>& readiness_items,
    const std::string& candidate_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21441 prototype
bool V370RunbookTemplateHasType(
    const std::vector<OpsV370RunbookTemplateContractItem>& items,
    const std::string& template_type);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21449 prototype
std::vector<OpsV370RunbookTemplateContractItem> BuildV370RunbookTemplateContractItems(
    const std::vector<OpsV350CommandPlanCandidate>& commandPlanCandidates,
    const std::vector<OpsV360CommandPlanDryRunResult>& dryRunResults,
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs,
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems,
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370SiteSimulationInputPackItem>& siteSimulationInputPackItems,
    const std::vector<OpsV370CrossSiteSafeApplyReadinessItem>& crossSiteReadinessItems);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21557 prototype
OpsV370RunbookTemplateContractSummary BuildV370RunbookTemplateContractSummary(
    const std::vector<OpsV370RunbookTemplateContractItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21596 prototype
void AppendV370RunbookTemplateContractSummaryJson(
    std::ostringstream& out,
    const OpsV370RunbookTemplateContractSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21613 prototype
void AppendV370RunbookTemplateContractItemJson(
    std::ostringstream& out,
    const OpsV370RunbookTemplateContractItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21640 prototype
std::string OpsV370RunbookTemplateContractJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21740 type
struct OpsV360SimulationRunLedgerEntry {
    std::string simulation_run_id;
    std::string input_ref;
    std::string source_id;
    std::string candidate_id;
    std::string readiness_state{"not-run"};
    std::string result_diff{"baseline"};
    std::string operator_note{"operator-note-required"};
    std::string blocker{"simulation-not-executed"};
    std::vector<std::string> evidence_refs;
    std::string previous_run_id;
    std::string compared_to_run_id;
    std::vector<std::string> changed_fields;
    int accumulated_run_count{1};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21757 type
struct OpsV360SimulationRunLedgerSummary {
    int run_count{0};
    int comparison_count{0};
    int blocker_count{0};
    int operator_note_count{0};
    int changed_field_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21765 prototype
std::vector<OpsV360SimulationRunLedgerEntry> BuildV360SimulationRunLedgerEntries(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV360SimulationInputPackItem>& inputPackItems,
    const OpsV360SimulationRunContract& simulationRunContract,
    const OpsV360SimulationResultEnvelope& simulationResultEnvelope,
    const std::vector<OpsV360CommandPlanDryRunResult>& dryRunResults,
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs,
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21886 prototype
OpsV360SimulationRunLedgerSummary BuildV360SimulationRunLedgerSummary(
    const std::vector<OpsV360SimulationRunLedgerEntry>& entries);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21905 prototype
void AppendV360SimulationRunLedgerSummaryJson(
    std::ostringstream& out,
    const OpsV360SimulationRunLedgerSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21917 prototype
void AppendV360SimulationRunLedgerEntryJson(
    std::ostringstream& out,
    const OpsV360SimulationRunLedgerEntry& entry);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 21940 prototype
std::string OpsV360SimulationRunLedgerComparisonJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22024 type
struct OpsV370RunbookInstanceLedgerEntry {
    std::string runbook_id;
    std::string runbook_template_id;
    std::string candidate_id;
    std::string site_id;
    std::string source_group;
    std::string status{"not-run"};
    std::string operator_note{"operator-note-required"};
    std::string previous_run_comparison{"previousRunComparison: no persisted previous run"};
    std::string previous_run_id;
    std::string compared_to_run_id;
    std::vector<std::string> status_history;
    std::vector<std::string> evidence_refs;
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22040 type
struct OpsV370RunbookInstanceLedgerSummary {
    int runbook_count{0};
    int approval_needed_count{0};
    int field_needed_count{0};
    int blocked_count{0};
    int previous_run_comparison_count{0};
    int operator_note_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22050 prototype
const OpsV360SimulationRunLedgerEntry* V370SimulationLedgerEntryForCandidate(
    const std::vector<OpsV360SimulationRunLedgerEntry>& simulationRunLedgerEntries,
    const std::string& candidate_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22064 prototype
std::string V370RunbookLedgerStatusFor(
    const OpsV370RunbookTemplateContractItem& item,
    const OpsV370CrossSiteSafeApplyReadinessItem* readiness);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22079 prototype
std::vector<OpsV370RunbookInstanceLedgerEntry> BuildV370RunbookInstanceLedgerEntries(
    const std::vector<OpsV370RunbookTemplateContractItem>& runbookTemplateContractItems,
    const std::vector<OpsV370CrossSiteSafeApplyReadinessItem>& crossSiteReadinessItems,
    const std::vector<OpsV360SimulationRunLedgerEntry>& simulationRunLedgerEntries);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22134 prototype
OpsV370RunbookInstanceLedgerSummary BuildV370RunbookInstanceLedgerSummary(
    const std::vector<OpsV370RunbookInstanceLedgerEntry>& entries);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22162 prototype
void AppendV370RunbookInstanceLedgerSummaryJson(
    std::ostringstream& out,
    const OpsV370RunbookInstanceLedgerSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22177 prototype
void AppendV370RunbookInstanceLedgerEntryJson(
    std::ostringstream& out,
    const OpsV370RunbookInstanceLedgerEntry& entry);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22199 prototype
std::string OpsV370RunbookInstanceLedgerJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22318 type
struct OpsV370ApprovalTicketWorkflowItem {
    std::string approval_ticket_id;
    std::string runbook_id;
    std::string runbook_template_id;
    std::string candidate_id;
    std::string site_id;
    std::string source_group;
    std::string status{"hold"};
    std::string reviewer{"ops-reviewer"};
    std::string reason{"approval review required"};
    std::string audit_link{"ops-audit:approval-ticket-workflow:read-only"};
    std::vector<std::string> approval_state_catalog{
        "approval",
        "hold",
        "reject",
        "field-needed",
    };
    std::vector<std::string> evidence_refs;
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22339 type
struct OpsV370ApprovalTicketWorkflowSummary {
    int approval_ticket_count{0};
    int approval_count{0};
    int hold_count{0};
    int reject_count{0};
    int field_needed_count{0};
    int reviewer_count{0};
    int audit_link_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22350 prototype
const OpsV370RunbookTemplateContractItem* V370RunbookTemplateForId(
    const std::vector<OpsV370RunbookTemplateContractItem>& runbookTemplateContractItems,
    const std::string& runbook_template_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22362 prototype
std::string V370ApprovalTicketStatusFor(
    const OpsV370RunbookInstanceLedgerEntry& ledger,
    const OpsV370CrossSiteSafeApplyReadinessItem* readiness);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22379 prototype
std::string V370ApprovalTicketReasonFor(
    const OpsV370RunbookInstanceLedgerEntry& ledger,
    const OpsV370RunbookTemplateContractItem* runbook_template,
    const OpsV370CrossSiteSafeApplyReadinessItem* readiness);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22398 prototype
std::vector<OpsV370ApprovalTicketWorkflowItem> BuildV370ApprovalTicketWorkflowItems(
    const std::vector<OpsV370RunbookTemplateContractItem>& runbookTemplateContractItems,
    const std::vector<OpsV370RunbookInstanceLedgerEntry>& runbookInstanceLedgerEntries,
    const std::vector<OpsV370CrossSiteSafeApplyReadinessItem>& crossSiteReadinessItems);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22444 prototype
OpsV370ApprovalTicketWorkflowSummary BuildV370ApprovalTicketWorkflowSummary(
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22474 prototype
void AppendV370ApprovalTicketWorkflowSummaryJson(
    std::ostringstream& out,
    const OpsV370ApprovalTicketWorkflowSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22490 prototype
void AppendV370ApprovalTicketWorkflowItemJson(
    std::ostringstream& out,
    const OpsV370ApprovalTicketWorkflowItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22512 prototype
std::string OpsV370ApprovalTicketWorkflowJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22637 type
struct OpsV360ClientNoticePreviewItem {
    std::string notice_preview_id;
    std::string candidate_id;
    std::string source_id;
    std::string notice_status{"degraded"};
    std::string viewer_safe_title{"Service status preview"};
    std::string viewer_safe_body{"Viewer-safe status preview only."};
    std::string timeline_hint{"No viewer action is required."};
    std::string delivery_state{"preview-only"};
    std::vector<std::string> evidence_refs;
    bool viewer_safe{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22650 type
struct OpsV360ClientNoticePreviewSummary {
    int preview_count{0};
    int maintenance_count{0};
    int degraded_count{0};
    int recovering_count{0};
    int evidence_ref_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22658 prototype
std::string V360ClientNoticePreviewStatusFor(const std::string& candidate_type);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22668 prototype
std::string V360ClientNoticePreviewTitleFor(const std::string& status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22678 prototype
std::string V360ClientNoticePreviewTimelineHintFor(const std::string& status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22688 prototype
std::vector<OpsV360ClientNoticePreviewItem> BuildV360ClientNoticePreviewItems(
    const std::vector<OpsV360CommandPlanDryRunResult>& dryRunResults,
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs,
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22767 prototype
OpsV360ClientNoticePreviewSummary BuildV360ClientNoticePreviewSummary(
    const std::vector<OpsV360ClientNoticePreviewItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22784 prototype
void AppendV360ClientNoticePreviewSummaryJson(
    std::ostringstream& out,
    const OpsV360ClientNoticePreviewSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22796 prototype
void AppendV360ClientNoticePreviewItemJson(
    std::ostringstream& out,
    const OpsV360ClientNoticePreviewItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22814 prototype
std::string OpsV360ClientNoticePreviewJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22885 type
struct OpsV370RuleVaWhatIfBySiteItem {
    std::string what_if_by_site_id;
    std::string site_id;
    std::string source_group;
    std::string source_id;
    std::string rule_candidate_id;
    std::string event_record_ref;
    std::string va_fixture_ref{"vaFixtureRef:manual_ui_fulltest_va_seed_matrix"};
    std::string rule_threshold_candidate{"thresholdCandidate:confidence+0.05"};
    std::string preset_candidate{"presetCandidate:site-default"};
    std::string scenario_candidate{"scenarioCandidate:site-risk-review"};
    std::string before_match_state{"beforeMatchState: current EventRecord/Rule projection"};
    std::string after_match_state{"afterMatchState: siteRuleVaWhatIfBySite projection"};
    std::string site_impact_summary{"siteImpactSummary: viewer-safe site impact"};
    std::string what_if_result_delta{"whatIfResultDelta: computed-only"};
    std::string readiness_state{"not-run"};
    std::vector<std::string> affected_client_refs;
    std::vector<std::string> changed_fields;
    std::vector<std::string> evidence_refs;
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22907 type
struct OpsV370RuleVaWhatIfBySiteSummary {
    int item_count{0};
    int site_count{0};
    int source_group_count{0};
    int threshold_candidate_count{0};
    int scenario_candidate_count{0};
    int event_record_ref_count{0};
    int va_fixture_ref_count{0};
    int affected_client_ref_count{0};
    int blocked_or_not_run_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22920 prototype
std::string V370SiteImpactSummaryForRuleWhatIf(
    const std::vector<OpsV370SiteImpactGraphNode>& impactGraphNodes,
    const std::string& site_id,
    const std::string& source_group,
    const std::string& source_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22941 prototype
std::string V370RuleVaThresholdCandidateForDryRun(
    const OpsV360CommandPlanDryRunResult& result);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22949 prototype
std::string V370RuleVaScenarioCandidateForDryRun(
    const OpsV360CommandPlanDryRunResult& result);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 22957 prototype
std::vector<OpsV370RuleVaWhatIfBySiteItem> BuildV370RuleVaWhatIfBySiteItems(
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370SiteImpactGraphNode>& impactGraphNodes,
    const std::vector<OpsV370SiteSimulationInputPackItem>& siteSimulationInputPackItems,
    const std::vector<OpsV370CrossSiteSafeApplyReadinessItem>& crossSiteReadinessItems,
    const std::vector<OpsV360CommandPlanDryRunResult>& dryRunResults,
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23073 prototype
OpsV370RuleVaWhatIfBySiteSummary BuildV370RuleVaWhatIfBySiteSummary(
    const std::vector<OpsV370RuleVaWhatIfBySiteItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23118 prototype
void AppendV370RuleVaWhatIfBySiteSummaryJson(
    std::ostringstream& out,
    const OpsV370RuleVaWhatIfBySiteSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23136 prototype
void AppendV370RuleVaWhatIfBySiteItemJson(
    std::ostringstream& out,
    const OpsV370RuleVaWhatIfBySiteItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23166 prototype
std::string OpsV370RuleVaWhatIfBySiteJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23274 type
struct OpsV370FieldEvidenceAttachmentItem {
    std::string field_evidence_attachment_id;
    std::string site_id;
    std::string source_group;
    std::string source_id;
    std::string runbook_id;
    std::string approval_ticket_id;
    std::string bridge_kind;
    std::string label;
    std::string site_runbook_evidence_ref;
    std::string conditional_not_run_evidence;
    std::string execution_status{"not-run"};
    std::string field_smoke_status{"field-smoke-not-run"};
    std::string not_run_reason;
    std::string redacted_field_evidence;
    std::string simulation_input_ref;
    std::string simulation_readiness_blocker_ref;
    std::string runbook_ledger_ref;
    std::string approval_ticket_ref;
    std::vector<std::string> condition_refs;
    std::vector<std::string> evidence_refs;
    bool endpoint_required{true};
    bool credential_required{true};
    bool operator_approval_required{true};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23301 type
struct OpsV370FieldEvidenceAttachmentSummary {
    int attachment_count{0};
    int onvif_condition_count{0};
    int external_whep_turn_condition_count{0};
    int cloud_vlm_provider_condition_count{0};
    int not_run_count{0};
    int endpoint_required_count{0};
    int credential_required_count{0};
    int approval_required_count{0};
    int runbook_ref_count{0};
    int approval_ref_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23315 prototype
const OpsV370RunbookInstanceLedgerEntry* V370RunbookLedgerForAttachment(
    const std::vector<OpsV370RunbookInstanceLedgerEntry>& runbookInstanceLedgerEntries,
    std::size_t index);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23335 prototype
const OpsV370ApprovalTicketWorkflowItem* V370ApprovalTicketForRunbook(
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvalTicketWorkflowItems,
    const std::string& runbook_id,
    std::size_t index);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23352 prototype
const OpsV370SiteSimulationInputPackItem* V370SiteSimulationInputPackForScope(
    const std::vector<OpsV370SiteSimulationInputPackItem>& siteSimulationInputPackItems,
    const std::string& site_id,
    const std::string& source_group);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23366 prototype
std::string V370FieldEvidenceAttachmentNotRunReason(
    const OpsV350FieldEvidenceIntakeRecord& record);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23383 prototype
std::vector<OpsV370FieldEvidenceAttachmentItem> BuildV370FieldEvidenceAttachmentItems(
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370SiteSimulationInputPackItem>& siteSimulationInputPackItems,
    const std::vector<OpsV370RunbookInstanceLedgerEntry>& runbookInstanceLedgerEntries,
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvalTicketWorkflowItems,
    const std::vector<OpsV350FieldEvidenceIntakeRecord>& fieldEvidenceIntakeRecords,
    const std::vector<OpsV350FieldEvidenceExecutionCondition>& fieldEvidenceExecutionConditions);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23522 prototype
OpsV370FieldEvidenceAttachmentSummary BuildV370FieldEvidenceAttachmentSummary(
    const std::vector<OpsV370FieldEvidenceAttachmentItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23566 prototype
void AppendV370FieldEvidenceAttachmentSummaryJson(
    std::ostringstream& out,
    const OpsV370FieldEvidenceAttachmentSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23587 prototype
void AppendV370FieldEvidenceAttachmentItemJson(
    std::ostringstream& out,
    const OpsV370FieldEvidenceAttachmentItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23626 prototype
std::string OpsV370FieldEvidenceAttachmentJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23770 type
struct OpsV380FieldConnectorEvidencePackageItem {
    std::string connector_evidence_package_id;
    std::string connector_kind;
    std::string action_request_ref;
    std::string readiness_ref;
    std::string source_recheck_ref;
    std::string outcome_ref;
    std::string receipt_bundle_ref;
    std::string field_attachment_ref;
    std::string endpoint_approval_ref;
    std::string credential_approval_ref;
    std::string connector_evidence_state{"conditional-not-run"};
    std::string field_smoke_status{"field-smoke-not-run"};
    std::string redacted_connector_evidence;
    std::vector<std::string> condition_refs;
    std::vector<std::string> evidence_refs;
    bool endpoint_required{true};
    bool credential_required{true};
    bool operator_approval_required{true};
    bool release_safe{true};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23793 type
struct OpsV380FieldConnectorEvidencePackageSummary {
    int connector_package_count{0};
    int onvif_connector_count{0};
    int external_whep_turn_connector_count{0};
    int cloud_provider_connector_count{0};
    int endpoint_approval_required_count{0};
    int credential_approval_required_count{0};
    int operator_approval_required_count{0};
    int not_run_count{0};
    int release_safe_count{0};
    int condition_ref_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23807 prototype
std::string V380FieldConnectorKindForBridge(const std::string& bridge_kind);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23820 prototype
std::vector<OpsV380FieldConnectorEvidencePackageItem>
BuildV380FieldConnectorEvidencePackageItems(
    const std::vector<OpsV380ActionReadinessPreflightItem>& readinessItems,
    const std::vector<OpsV380SourceRecheckActionPilotItem>& sourceRecheckItems,
    const std::vector<OpsV380OutcomeObserverReconciliationItem>& outcomeItems,
    const std::vector<OpsV380ActionReceiptBundleItem>& receiptItems,
    const std::vector<OpsV370FieldEvidenceAttachmentItem>& fieldAttachments);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23915 prototype
OpsV380FieldConnectorEvidencePackageSummary
BuildV380FieldConnectorEvidencePackageSummary(
    const std::vector<OpsV380FieldConnectorEvidencePackageItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23956 prototype
void AppendV380FieldConnectorEvidencePackageSummaryJson(
    std::ostringstream& out,
    const OpsV380FieldConnectorEvidencePackageSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 23980 prototype
void AppendV380FieldConnectorEvidencePackageItemJson(
    std::ostringstream& out,
    const OpsV380FieldConnectorEvidencePackageItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24013 prototype
std::string OpsV380FieldConnectorEvidencePackageJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24169 type
struct OpsV380DefaultOffActionExplanationItem {
    std::string default_off_action_explanation_id;
    std::string explanation_kind;
    std::string approval_blocker_summary;
    std::string readiness_reason_summary;
    std::string outcome_hint;
    std::string operator_review_hint;
    std::string action_request_ref;
    std::string approval_ref;
    std::string readiness_ref;
    std::string outcome_ref;
    std::string receipt_bundle_ref;
    std::string field_connector_ref;
    std::string redacted_explanation;
    std::vector<std::string> evidence_refs;
    bool default_enabled{false};
    bool default_off{true};
    bool runtime_opt_in_required{true};
    bool provider_opt_in_required{true};
    bool release_safe{true};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24192 type
struct OpsV380DefaultOffActionExplanationSummary {
    int explanation_count{0};
    int approval_blocker_count{0};
    int readiness_reason_count{0};
    int outcome_hint_count{0};
    int default_off_count{0};
    int provider_opt_in_required_count{0};
    int runtime_opt_in_required_count{0};
    int release_safe_count{0};
    int evidence_ref_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24205 prototype
std::vector<OpsV380DefaultOffActionExplanationItem>
BuildV380DefaultOffActionExplanationItems(
    const std::vector<OpsV380ApprovalDecisionGateItem>& approvalItems,
    const std::vector<OpsV380ActionReadinessPreflightItem>& readinessItems,
    const std::vector<OpsV380OutcomeObserverReconciliationItem>& outcomeItems,
    const std::vector<OpsV380ActionReceiptBundleItem>& receiptItems,
    const std::vector<OpsV380FieldConnectorEvidencePackageItem>& fieldConnectorItems);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24360 prototype
OpsV380DefaultOffActionExplanationSummary
BuildV380DefaultOffActionExplanationSummary(
    const std::vector<OpsV380DefaultOffActionExplanationItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24397 prototype
void AppendV380DefaultOffActionExplanationSummaryJson(
    std::ostringstream& out,
    const OpsV380DefaultOffActionExplanationSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24417 prototype
void AppendV380DefaultOffActionExplanationItemJson(
    std::ostringstream& out,
    const OpsV380DefaultOffActionExplanationItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24450 prototype
std::string OpsV390FieldEvidenceBridgeDecisionJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24542 prototype
std::string OpsV390ReidAssistDecisionJson(const WebRtcHttpRuntimeConfig& config);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24637 prototype
std::string OpsV380DefaultOffActionExplanationJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24797 type
struct OpsV370ClientNoticeBySiteViewGroupItem {
    std::string notice_preview_id;
    std::string site_id;
    std::string source_group;
    std::string view_group;
    std::string notice_status{"degraded"};
    std::string viewer_safe_title{"Site notice preview"};
    std::string viewer_safe_body{"viewerSafeClientNoticeBySiteViewGroup preview-only notice"};
    std::string timeline_hint{"operator review required"};
    std::string delivery_state{"preview-only"};
    std::string delivery_queue_state{"delivery-queue-preview"};
    std::vector<std::string> affected_view_ids;
    std::vector<std::string> affected_client_refs;
    std::vector<std::string> evidence_refs;
    bool viewer_safe{true};
    bool view_group_scoped{true};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24816 type
struct OpsV370ClientNoticeBySiteViewGroupSummary {
    int item_count{0};
    int view_group_count{0};
    int affected_view_count{0};
    int delivery_queue_count{0};
    int maintenance_count{0};
    int degraded_count{0};
    int recovering_count{0};
    int available_count{0};
    int field_needed_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24829 prototype
std::string V370ClientNoticeStatusFor(
    const OpsV370SiteHealthRollupItem* rollup,
    int approval_count,
    int field_needed_count);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24851 prototype
std::string V370ClientNoticeTitleFor(const std::string& status,
                                     const std::string& site_id,
                                     const std::string& view_group);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24869 prototype
std::string V370ClientNoticeTimelineHintFor(const std::string& status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24885 prototype
std::vector<std::string> V370ClientNoticeAffectedClientRefs(
    const OpsV370SiteAwareSourceRegistryProjectionItem& projected,
    const std::string& view_group);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24896 prototype
int V370ApprovalTicketCountForScope(
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvals,
    const std::string& site_id,
    const std::string& source_group);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24905 prototype
int V370ApprovalFieldNeededCountForScope(
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvals,
    const std::string& site_id,
    const std::string& source_group);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24915 prototype
std::vector<OpsV370ClientNoticeBySiteViewGroupItem>
BuildV370ClientNoticeBySiteViewGroupItems(
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370SiteHealthRollupItem>& rollups,
    const std::vector<OpsV370SiteImpactGraphNode>& impactGraphNodes,
    const std::vector<OpsV370RunbookInstanceLedgerEntry>& runbookInstanceLedgerEntries,
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvalTicketWorkflowItems);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 24979 prototype
OpsV370ClientNoticeBySiteViewGroupSummary
BuildV370ClientNoticeBySiteViewGroupSummary(
    const std::vector<OpsV370ClientNoticeBySiteViewGroupItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25013 prototype
void AppendV370ClientNoticeBySiteViewGroupSummaryJson(
    std::ostringstream& out,
    const OpsV370ClientNoticeBySiteViewGroupSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25031 prototype
void AppendV370ClientNoticeBySiteViewGroupItemJson(
    std::ostringstream& out,
    const OpsV370ClientNoticeBySiteViewGroupItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25057 prototype
std::string OpsV370ClientNoticeBySiteViewGroupJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25193 type
struct OpsV370LimitedSafeExecutionPilotAction {
    std::string pilot_action_id;
    std::string site_id;
    std::string source_group;
    std::string source_id;
    std::string action_kind;
    std::string action_label;
    std::string approval_ticket_id;
    std::string runbook_id;
    std::string source_recheck_ref;
    std::string notice_queue_ref;
    std::string pilot_execution_status{"approval-gated-not-run"};
    std::string approval_gate_state{"hold"};
    std::string execution_request_preview;
    std::string idempotency_key;
    std::string expected_outcome_ref;
    std::vector<std::string> blocker_refs;
    std::vector<std::string> evidence_refs;
    bool lowest_risk{true};
    bool approval_gated{true};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25216 type
struct OpsV370LimitedSafeExecutionPilotSummary {
    int action_count{0};
    int source_recheck_pilot_count{0};
    int notice_queue_pilot_count{0};
    int approval_gated_count{0};
    int ready_to_pilot_count{0};
    int not_run_count{0};
    int blocked_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25227 prototype
const OpsV370ApprovalTicketWorkflowItem* V370ApprovalTicketForPilot(
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvalTicketWorkflowItems,
    const std::string& runbook_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25240 prototype
const OpsV370ClientNoticeBySiteViewGroupItem* V370NoticeQueuePilotForScope(
    const std::vector<OpsV370ClientNoticeBySiteViewGroupItem>& noticeItems,
    const std::string& site_id,
    const std::string& source_group);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25253 prototype
const OpsV370FieldEvidenceAttachmentItem* V370FieldAttachmentForScope(
    const std::vector<OpsV370FieldEvidenceAttachmentItem>& attachments,
    const std::string& site_id,
    const std::string& source_group);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25266 prototype
std::string V370LimitedSafePilotGateState(
    const OpsV370ApprovalTicketWorkflowItem* approval,
    const OpsV370RunbookInstanceLedgerEntry& runbook);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25281 prototype
std::vector<OpsV370LimitedSafeExecutionPilotAction>
BuildV370LimitedSafeExecutionPilotActions(
    const std::vector<OpsV370RunbookInstanceLedgerEntry>& runbookInstanceLedgerEntries,
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvalTicketWorkflowItems,
    const std::vector<OpsV370FieldEvidenceAttachmentItem>& fieldEvidenceAttachments,
    const std::vector<OpsV370ClientNoticeBySiteViewGroupItem>& noticeItems);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25399 prototype
OpsV370LimitedSafeExecutionPilotSummary BuildV370LimitedSafeExecutionPilotSummary(
    const std::vector<OpsV370LimitedSafeExecutionPilotAction>& actions);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25431 prototype
void AppendV370LimitedSafeExecutionPilotSummaryJson(
    std::ostringstream& out,
    const OpsV370LimitedSafeExecutionPilotSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25447 prototype
void AppendV370LimitedSafeExecutionPilotActionJson(
    std::ostringstream& out,
    const OpsV370LimitedSafeExecutionPilotAction& action);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25476 prototype
std::string OpsV370LimitedSafeExecutionPilotJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25624 type
struct OpsV370OutcomeReconciliationItem {
    std::string reconciliation_id;
    std::string pilot_action_id;
    std::string site_id;
    std::string source_group;
    std::string action_kind;
    std::string pre_simulation_ref;
    std::string post_execution_ref;
    std::string source_impact_before_ref;
    std::string source_impact_after_ref;
    std::string source_impact_diff;
    std::string event_impact_before_ref;
    std::string event_impact_after_ref;
    std::string event_impact_diff;
    std::string client_impact_before_ref;
    std::string client_impact_after_ref;
    std::string client_impact_diff;
    std::string reconciliation_status{"pending-execution"};
    std::string pending_reason{
        "pilotExecutionStatus=approval-gated-not-run; executionObserved=false"};
    std::vector<std::string> evidence_refs;
    std::vector<std::string> drift_signals;
    bool source_reconciled{false};
    bool event_reconciled{false};
    bool client_reconciled{false};
    bool execution_observed{false};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25653 type
struct OpsV370OutcomeReconciliationSummary {
    int reconciliation_count{0};
    int source_diff_count{0};
    int event_diff_count{0};
    int client_diff_count{0};
    int pending_count{0};
    int execution_observed_count{0};
    int not_run_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25664 prototype
const OpsV360SourceRuleImpactDiff* V370ImpactDiffForOutcomeReconciliation(
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs,
    const OpsV370LimitedSafeExecutionPilotAction& action);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25690 prototype
const OpsV370SiteSimulationInputPackItem* V370SimulationPackForOutcomeReconciliation(
    const std::vector<OpsV370SiteSimulationInputPackItem>& siteSimulationInputPackItems,
    const std::string& site_id,
    const std::string& source_group,
    const std::string& input_type);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25706 prototype
const OpsV370SiteImpactGraphNode* V370ImpactGraphNodeForOutcomeReconciliation(
    const std::vector<OpsV370SiteImpactGraphNode>& impactGraphNodes,
    const OpsV370LimitedSafeExecutionPilotAction& action);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25725 prototype
const OpsV370ClientNoticeBySiteViewGroupItem* V370ClientNoticeForOutcomeReconciliation(
    const std::vector<OpsV370ClientNoticeBySiteViewGroupItem>& noticeItems,
    const OpsV370LimitedSafeExecutionPilotAction& action);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25735 prototype
std::vector<OpsV370OutcomeReconciliationItem> BuildV370OutcomeReconciliationItems(
    const std::vector<OpsV370LimitedSafeExecutionPilotAction>& actions,
    const std::vector<OpsV370SiteSimulationInputPackItem>& siteSimulationInputPackItems,
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs,
    const std::vector<OpsV370SiteImpactGraphNode>& impactGraphNodes,
    const std::vector<OpsV370ClientNoticeBySiteViewGroupItem>& noticeItems);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25885 prototype
OpsV370OutcomeReconciliationSummary BuildV370OutcomeReconciliationSummary(
    const std::vector<OpsV370OutcomeReconciliationItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25918 prototype
void AppendV370OutcomeReconciliationSummaryJson(
    std::ostringstream& out,
    const OpsV370OutcomeReconciliationSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25934 prototype
void AppendV370OutcomeReconciliationItemJson(
    std::ostringstream& out,
    const OpsV370OutcomeReconciliationItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 25968 prototype
std::string OpsV370OutcomeReconciliationJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26118 type
struct OpsV370ExportHandoffBundleItem {
    std::string bundle_id;
    std::string site_id;
    std::string source_group;
    std::string bundle_kind{"site-runbook-outcome-handoff"};
    std::string title{"Export / Handoff Bundle"};
    std::string handoff_status{"pending-handoff"};
    std::string next_operator_role{"ops-reviewer"};
    std::string blocked_reason{"outcome reconciliation pending"};
    std::string release_safe_label{"redacted-release-safe"};
    std::vector<std::string> site_refs;
    std::vector<std::string> runbook_refs;
    std::vector<std::string> evidence_refs;
    std::vector<std::string> approval_refs;
    std::vector<std::string> outcome_refs;
    std::vector<std::string> handoff_map_refs;
    std::vector<std::string> redaction_review{
        "rawLocatorIncluded=false",
        "rawEndpointIncluded=false",
        "credentialMaterialIncluded=false",
        "rawProviderResponseIncluded=false",
        "rawDiagnosticJsonIncluded=false",
        "clientViewerRawMaterialIncluded=false",
    };
    bool release_safe{true};
    bool handoff_ready{false};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26147 type
struct OpsV370ExportHandoffMapEntry {
    std::string handoff_id;
    std::string bundle_id;
    std::string site_id;
    std::string source_group;
    std::string handoff_status{"pending-handoff"};
    std::string next_operator_role{"ops-reviewer"};
    std::string blocked_reason{"outcome reconciliation pending"};
    std::vector<std::string> bundle_refs;
    std::vector<std::string> release_safety_refs;
    bool release_safe{true};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26161 type
struct OpsV370ExportHandoffBundleSummary {
    int bundle_count{0};
    int handoff_entry_count{0};
    int site_ref_count{0};
    int runbook_ref_count{0};
    int evidence_ref_count{0};
    int approval_ref_count{0};
    int outcome_ref_count{0};
    int release_safe_count{0};
    int blocked_count{0};
    std::vector<std::string> derivation_sources;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26174 prototype
const OpsV370SiteAwareSourceRegistryProjectionItem* V370ProjectionForExportHandoff(
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::string& site_id,
    const std::string& source_group);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26185 prototype
const OpsV370RunbookInstanceLedgerEntry* V370RunbookForExportHandoff(
    const std::vector<OpsV370RunbookInstanceLedgerEntry>& runbookInstanceLedgerEntries,
    const std::string& site_id,
    const std::string& source_group);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26199 prototype
const OpsV370ApprovalTicketWorkflowItem* V370ApprovalForExportHandoff(
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvalTicketWorkflowItems,
    const std::string& runbook_id,
    const std::string& site_id,
    const std::string& source_group);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26223 prototype
const OpsV370FieldEvidenceAttachmentItem* V370EvidenceForExportHandoff(
    const std::vector<OpsV370FieldEvidenceAttachmentItem>& fieldEvidenceAttachments,
    const std::string& site_id,
    const std::string& source_group);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26237 prototype
std::vector<OpsV370ExportHandoffBundleItem> BuildV370ExportHandoffBundleItems(
    const std::vector<OpsV370SiteAwareSourceRegistryProjectionItem>& projection,
    const std::vector<OpsV370RunbookInstanceLedgerEntry>& runbookInstanceLedgerEntries,
    const std::vector<OpsV370FieldEvidenceAttachmentItem>& fieldEvidenceAttachments,
    const std::vector<OpsV370ApprovalTicketWorkflowItem>& approvalTicketWorkflowItems,
    const std::vector<OpsV370OutcomeReconciliationItem>& outcomeReconciliationItems);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26386 prototype
std::vector<OpsV370ExportHandoffMapEntry> BuildV370ExportHandoffMapEntries(
    const std::vector<OpsV370ExportHandoffBundleItem>& bundleItems);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26416 prototype
OpsV370ExportHandoffBundleSummary BuildV370ExportHandoffBundleSummary(
    const std::vector<OpsV370ExportHandoffBundleItem>& bundleItems,
    const std::vector<OpsV370ExportHandoffMapEntry>& handoffMapEntries);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26445 prototype
void AppendV370ExportHandoffBundleSummaryJson(
    std::ostringstream& out,
    const OpsV370ExportHandoffBundleSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26463 prototype
void AppendV370ExportHandoffBundleItemJson(
    std::ostringstream& out,
    const OpsV370ExportHandoffBundleItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26496 prototype
void AppendV370ExportHandoffMapEntryJson(
    std::ostringstream& out,
    const OpsV370ExportHandoffMapEntry& entry);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26516 prototype
std::string OpsV370ExportHandoffBundleJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26695 type
struct OpsV360RuleVaWhatIfReplayCandidate {
    std::string what_if_replay_id;
    std::string event_record_ref;
    std::string va_fixture_ref{"vaFixtureRef:manual_ui_fulltest_va_seed_matrix"};
    std::string source_id;
    std::string rule_candidate_id;
    std::string rule_threshold_candidate{"thresholdCandidate:confidence+0.05"};
    std::string preset_candidate{"presetCandidate:default"};
    std::string scenario_candidate{"scenarioCandidate:baseline"};
    std::string before_match_state{"beforeMatchState: current EventRecord/Rule projection"};
    std::string after_match_state{"afterMatchState: what-if projection"};
    std::string what_if_result_delta{"whatIfResultDelta: pending"};
    std::vector<std::string> changed_fields;
    std::vector<std::string> evidence_refs;
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26712 type
struct OpsV360RuleVaWhatIfReplaySummary {
    int candidate_count{0};
    int threshold_candidate_count{0};
    int preset_candidate_count{0};
    int scenario_candidate_count{0};
    int event_record_ref_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26720 prototype
std::vector<OpsV360RuleVaWhatIfReplayCandidate> BuildV360RuleVaWhatIfReplayCandidates(
    const OpsV350LiveOperationsGraphContext& context,
    const std::vector<OpsV360CommandPlanDryRunResult>& dryRunResults,
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26784 prototype
OpsV360RuleVaWhatIfReplaySummary BuildV360RuleVaWhatIfReplaySummary(
    const std::vector<OpsV360RuleVaWhatIfReplayCandidate>& candidates);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26805 prototype
void AppendV360RuleVaWhatIfReplaySummaryJson(
    std::ostringstream& out,
    const OpsV360RuleVaWhatIfReplaySummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26817 prototype
void AppendV360RuleVaWhatIfReplayCandidateJson(
    std::ostringstream& out,
    const OpsV360RuleVaWhatIfReplayCandidate& candidate);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26840 prototype
std::string OpsV360RuleVaWhatIfReplayPackJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26902 type
struct OpsV360SimulationExportBundleItem {
    std::string bundle_item_id;
    std::string bundle_section;
    std::string summary;
    std::vector<std::string> simulation_input_refs;
    std::vector<std::string> simulation_output_refs;
    std::vector<std::string> readiness_blocker_refs;
    std::vector<std::string> handoff_map_refs;
    std::vector<std::string> evidence_refs;
    std::string redaction_policy{"redacted-release-safe"};
    bool release_safe{true};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26916 type
struct OpsV360SimulationHandoffMapEntry {
    std::string handoff_id;
    std::string candidate_id;
    std::string handoff_status{"operator-review-required"};
    std::string next_operator_role{"operator"};
    std::string blocked_reason{"simulation-not-executed"};
    std::vector<std::string> bundle_item_refs;
    std::vector<std::string> evidence_refs;
    bool release_safe{true};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26928 type
struct OpsV360SimulationExportBundleSummary {
    int bundle_item_count{0};
    int handoff_entry_count{0};
    int simulation_input_ref_count{0};
    int simulation_output_ref_count{0};
    int readiness_blocker_ref_count{0};
    int evidence_ref_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26937 prototype
std::vector<std::string> V360SimulationExportTakeRefs(
    const std::vector<std::string>& refs,
    std::size_t limit,
    const std::string& fallback);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 26956 prototype
std::vector<OpsV360SimulationExportBundleItem> BuildV360SimulationExportBundleItems(
    const std::vector<OpsV360SimulationInputPackItem>& inputPackItems,
    const OpsV360SimulationRunContract& simulationRunContract,
    const OpsV360SimulationResultEnvelope& simulationResultEnvelope,
    const std::vector<OpsV360SimulationRunLedgerEntry>& ledgerEntries,
    const std::vector<OpsV360CommandPlanDryRunResult>& dryRunResults,
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs,
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems,
    const std::vector<OpsV360RuleVaWhatIfReplayCandidate>& whatIfCandidates,
    const std::vector<OpsV360ClientNoticePreviewItem>& noticePreviewItems);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27091 prototype
std::vector<OpsV360SimulationHandoffMapEntry> BuildV360SimulationHandoffMapEntries(
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems,
    const std::vector<OpsV360SimulationExportBundleItem>& bundleItems);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27143 prototype
OpsV360SimulationExportBundleSummary BuildV360SimulationExportBundleSummary(
    const std::vector<OpsV360SimulationExportBundleItem>& items,
    const std::vector<OpsV360SimulationHandoffMapEntry>& handoffEntries);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27162 prototype
void AppendV360SimulationExportBundleSummaryJson(
    std::ostringstream& out,
    const OpsV360SimulationExportBundleSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27175 prototype
void AppendV360SimulationExportBundleItemJson(
    std::ostringstream& out,
    const OpsV360SimulationExportBundleItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27198 prototype
void AppendV360SimulationHandoffMapEntryJson(
    std::ostringstream& out,
    const OpsV360SimulationHandoffMapEntry& entry);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27216 prototype
std::string OpsV360SimulationExportBundleJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27322 type
struct OpsV360FieldEvidenceSimulationAdapterItem {
    std::string adapter_id;
    std::string bridge_kind;
    std::string label;
    std::string adapter_type{"fieldEvidenceAdapter"};
    std::string conditional_not_run_evidence{"conditional-not-run evidence"};
    std::string execution_status{"not-run"};
    std::string field_smoke_status{"field-smoke-needed"};
    std::string not_run_reason;
    std::string redacted_field_evidence;
    std::string simulation_input_ref{"/ops/api/live-operations/simulation/input-pack"};
    std::string simulation_readiness_blocker_ref{
        "/ops/api/live-operations/simulation/safe-apply-readiness"};
    std::vector<std::string> condition_refs;
    std::vector<std::string> evidence_refs;
    bool endpoint_required{true};
    bool credential_required{true};
    bool operator_approval_required{true};
    bool read_only{true};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27343 type
struct OpsV360FieldEvidenceSimulationAdapterSummary {
    int adapter_count{0};
    int onvif_condition_count{0};
    int external_whep_turn_condition_count{0};
    int cloud_vlm_provider_condition_count{0};
    int not_run_count{0};
    int endpoint_required_count{0};
    int credential_required_count{0};
    int approval_required_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27354 prototype
std::string V360FieldEvidenceSimulationReadinessRef(
    const OpsV350FieldEvidenceIntakeRecord& record,
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27365 prototype
std::vector<OpsV360FieldEvidenceSimulationAdapterItem>
BuildV360FieldEvidenceSimulationAdapterItems(
    const std::vector<OpsV350FieldEvidenceIntakeRecord>& fieldEvidenceIntakeRecords,
    const std::vector<OpsV350FieldEvidenceExecutionCondition>& fieldEvidenceExecutionConditions,
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27413 prototype
OpsV360FieldEvidenceSimulationAdapterSummary
BuildV360FieldEvidenceSimulationAdapterSummary(
    const std::vector<OpsV360FieldEvidenceSimulationAdapterItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27442 prototype
void AppendV360FieldEvidenceSimulationAdapterSummaryJson(
    std::ostringstream& out,
    const OpsV360FieldEvidenceSimulationAdapterSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27459 prototype
void AppendV360FieldEvidenceSimulationAdapterItemJson(
    std::ostringstream& out,
    const OpsV360FieldEvidenceSimulationAdapterItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27495 prototype
std::string OpsV360FieldEvidenceSimulationAdapterJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27585 type
struct OpsV360VlmAssistedSimulationExplanationItem {
    std::string explanation_id;
    std::string explanation_type;
    std::string title;
    std::string simulation_blocker_summary;
    std::string impact_diff_summary;
    std::string operator_review_hint;
    std::string source_id{"simulation"};
    std::vector<std::string> evidence_refs;
    bool default_enabled{false};
    bool default_off{true};
    bool runtime_opt_in_required{true};
    bool vlm_provider_call_performed{false};
    bool vlm_runtime_call_performed{false};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27601 type
struct OpsV360VlmAssistedSimulationExplanationSummary {
    int explanation_count{0};
    int blocker_summary_count{0};
    int impact_diff_summary_count{0};
    int operator_review_hint_count{0};
    int default_off_count{0};
    int provider_call_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27610 prototype
std::vector<OpsV360VlmAssistedSimulationExplanationItem>
BuildV360VlmAssistedSimulationExplanationItems(
    const std::vector<OpsV360CommandPlanDryRunResult>& dryRunResults,
    const std::vector<OpsV360SourceRuleImpactDiff>& impactDiffs,
    const std::vector<OpsV360SafeApplyReadinessItem>& readinessItems,
    const std::vector<OpsV360FieldEvidenceSimulationAdapterItem>& fieldEvidenceAdapters);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27695 prototype
OpsV360VlmAssistedSimulationExplanationSummary
BuildV360VlmAssistedSimulationExplanationSummary(
    const std::vector<OpsV360VlmAssistedSimulationExplanationItem>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27718 prototype
void AppendV360VlmAssistedSimulationExplanationItemJson(
    std::ostringstream& out,
    const OpsV360VlmAssistedSimulationExplanationItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27746 prototype
void AppendV360VlmAssistedSimulationExplanationSummaryJson(
    std::ostringstream& out,
    const OpsV360VlmAssistedSimulationExplanationSummary& summary);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27759 prototype
std::string OpsV360VlmAssistedSimulationExplanationJson(
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27845 prototype
std::string OpsAuditSearchIndexJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27854 prototype
std::string OpsAuditEntriesJson(const WebRtcHttpRuntimeConfig& config,
                                const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27883 prototype
std::string OpsAuditEntriesDiffJson(const WebRtcHttpRuntimeConfig& config,
                                    const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27916 prototype
std::string CsvCell(std::string value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27929 prototype
std::string OpsAuditEntriesCsv(const WebRtcHttpRuntimeConfig& config,
                               const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27950 prototype
std::string OpsDiagnosticLogTailJson(const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27978 prototype
std::string JsonStringArrayOrDefault(const std::string& body,
                                     const std::string& field,
                                     const std::string& fallback);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 27985 prototype
std::string SourceBulkPayload(const std::string& source_raw,
                              const std::string& source_id,
                              const std::string& display_name,
                              bool enabled,
                              bool allow_duplicate_source = false);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28019 prototype
std::string ViewBulkPayload(const std::string& view_raw,
                            const std::string& source_raw,
                            const std::string& view_id,
                            const std::string& source_id,
                            const std::string& display_name,
                            bool enabled);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28048 prototype
bool SourceHasPlayableLocator(const std::string& source_raw);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28058 prototype
std::string NextBulkChannelId(std::set<int>* used_ids);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28067 prototype
std::set<int> CurrentNumericSourceIds();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28081 prototype
std::string OpsChannelBulkJson(const std::string& body);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28226 prototype
std::string WebRtcSyncStatusForMatch(std::int64_t video_frame_pts_ns, std::int64_t analysis_pts_ns);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28230 prototype
analysis::VaRuntimeSyncInfo BuildWebRtcVaMetadataSyncInfo(std::int64_t video_frame_pts_ns,
                                                          std::int64_t analysis_pts_ns,
                                                          std::int64_t sync_tolerance_ns,
                                                          std::string sync_status,
                                                          int frame_width,
                                                          int frame_height);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28251 prototype
std::string WebRtcVaMetadataMessageJson(const analysis::AnalysisResult& result,
                                        const std::vector<analysis::AnalysisEvent>& events,
                                        const analysis::VaRuntimeSyncInfo& sync_info,
                                        const analysis::VaMetadataSubscriptionFilter& subscription_filter);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28269 prototype
std::string WebRtcVaMetadataMissingMessageJson(const std::string& stream_id,
                                               std::int64_t video_frame_pts_ns,
                                               std::int64_t sync_tolerance_ns);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28285 prototype
std::string AnalysisEventPostStatusJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28302 prototype
std::string AnalysisEventStorageStatusJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28395 prototype
bool ParseStrictInt64(const std::string& raw, std::int64_t* value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28412 prototype
bool ParseStrictUint64(const std::string& raw, std::uint64_t* value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28429 prototype
bool ApplyStringEventRecordFilter(const std::unordered_map<std::string, std::string>& query,
                                  const std::string& key,
                                  std::string* out);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28440 prototype
bool BuildEventRecordQueryOptions(const std::unordered_map<std::string, std::string>& query,
                                  analysis::EventRecordQueryOptions* options,
                                  std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28557 prototype
std::string AnalysisEventRecordsJson(const analysis::EventRecordQueryResult& result);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28610 prototype
std::string OpsVlmEventReviewJson(const std::string& event_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28710 prototype
std::string OpsV390VlmRuleSuggestionDraftBridgeJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28768 prototype
std::string OpsVlmRuleSuggestionDraftWorkflowJson(
    const std::unordered_map<std::string, std::string>& query,
    std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28826 prototype
std::string OpsJsonObjectOrNull(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28834 prototype
std::string OpsIncidentRuleSuggestionSourceId(const std::string& event_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28852 prototype
std::string OpsIncidentRuleSuggestionReviewJson(const std::string& event_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28937 prototype
std::string OpsIncidentTriageBoardSourceId(const std::string& event_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28941 prototype
std::string OpsIncidentTriageBoardScenario(const std::string& event_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28959 prototype
std::int64_t OpsIncidentTriageBoardEventTimeMs(const std::string& event_json,
                                               const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28969 prototype
std::string OpsIncidentTriageBoardLane(const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 28987 prototype
std::string OpsIncidentTriageBoardPriority(int score);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29000 prototype
std::string OpsIncidentTriageBoardVlmCandidateStatus(const std::string& rule_review_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29005 prototype
std::string OpsIncidentTriageBoardSimilarIncidentKey(const std::string& source_id,
                                                     const std::string& rule_id,
                                                     const std::string& scenario,
                                                     const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29013 prototype
std::string OpsIncidentTriageBoardCardJson(const std::string& event_json,
                                           const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29084 prototype
std::string OpsIncidentTriageBoardViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29133 prototype
std::string OpsIncidentDecisionScorecardReasonChipsJson(const std::vector<std::string>& reasons);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29154 prototype
std::string OpsIncidentDecisionScorecardJson(const std::string& event_json,
                                             const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29215 prototype
std::string OpsIncidentDecisionScorecardViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29263 prototype
std::string OpsOperationalActionPackActionsJson(const std::string& event_json,
                                                const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29330 prototype
std::string OpsOperationalActionPackItemJson(const std::string& event_json,
                                             const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29351 prototype
std::string OpsOperationalActionPackViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29400 prototype
std::string OpsIncidentActionReadinessFollowUpJson(const std::string& type,
                                                   const std::string& label,
                                                   const std::string& status,
                                                   const std::string& route,
                                                   bool field_smoke_required,
                                                   const std::string& blocker);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29421 prototype
std::string OpsIncidentActionReadinessStatus(const std::vector<std::string>& blockers,
                                             bool field_smoke_required);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29432 prototype
std::string OpsIncidentActionReadinessQueueItemJson(const std::string& event_json,
                                                    const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29531 prototype
std::string OpsIncidentActionReadinessQueueViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29604 prototype
std::string OpsEvidenceIntakeFieldPreconditionJson(const std::string& type,
                                                   const std::string& label,
                                                   const std::string& status,
                                                   const std::string& detail,
                                                   bool operator_follow_up_required);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29620 prototype
std::string OpsEvidenceIntakeFieldReadinessItemJson(const std::string& event_json,
                                                    const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29712 prototype
void OpsEvidenceIntakeFieldReadinessCountStatus(const std::string& status,
                                                int* passed_count,
                                                int* failed_count,
                                                int* blocked_count,
                                                int* not_run_count);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29728 prototype
std::string OpsEvidenceIntakeFieldReadinessViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29810 prototype
std::int64_t OpsRuntimeEvidenceWindowEventTimeMs(const std::string& event_json,
                                                 const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29816 prototype
std::string OpsRuntimeEvidenceWindowPacketJson(const std::string& event_json,
                                               const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29861 prototype
std::string OpsRuntimeEvidenceWindowItemJson(const std::string& event_json,
                                             const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29888 prototype
std::string OpsRuntimeEvidenceWindowViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29961 prototype
std::string OpsRuleWhatIfPreviewJsonArrayOrFallback(const std::string& value,
                                                    const std::string& fallback);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 29970 prototype
std::string OpsRuleWhatIfPreviewDraftJson(const std::string& event_json,
                                          const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30042 prototype
std::string OpsRuleWhatIfPreviewItemJson(const std::string& event_json,
                                         const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30055 prototype
std::string OpsRuleWhatIfPreviewViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30107 prototype
std::string OpsApprovalGatedRuleDraftIssuesJson(const std::vector<std::string>& issues);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30120 prototype
std::string OpsApprovalGatedRuleDraftValidationState(const std::string& event_json,
                                                     const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30134 prototype
std::string OpsApprovalGatedRuleDraftReadinessItemJson(const std::string& event_json,
                                                       const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30230 prototype
std::string OpsApprovalGatedRuleDraftReadinessViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30303 prototype
std::string OpsEventReviewInboxItemJson(const std::string& event_json,
                                        const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30320 prototype
std::string OpsIncidentMemoryStringArrayJson(const std::vector<std::string>& values);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30333 prototype
std::string OpsIncidentMemoryQueryValue(
    const std::unordered_map<std::string, std::string>& query,
    const std::string& key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30340 prototype
std::string OpsIncidentMemoryEventRuleId(const std::string& event_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30362 type
struct OpsOperatorOutcomeMemoryCounts {
    int accepted_count{0};
    int dismissed_count{0};
    int review_needed_count{0};
    int not_reviewed_count{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30369 prototype
std::string OpsOperatorOutcomeMemoryOutcome(const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30389 prototype
void OpsOperatorOutcomeMemoryAddCount(const std::string& outcome,
                                      OpsOperatorOutcomeMemoryCounts* counts);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30405 prototype
std::string OpsOperatorOutcomeMemoryCountsJson(
    const OpsOperatorOutcomeMemoryCounts& counts);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30417 prototype
OpsOperatorOutcomeMemoryCounts OpsOperatorOutcomeMemoryCountsForKey(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews,
    const std::string& wanted_key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30445 prototype
std::string OpsOperatorOutcomeMemoryHistoryHintText(
    const std::string& outcome,
    const OpsOperatorOutcomeMemoryCounts& counts);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30471 prototype
std::string OpsOperatorOutcomeMemoryHistoryHintJson(
    const std::string& outcome,
    const OpsOperatorOutcomeMemoryCounts& counts);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30485 prototype
std::string OpsOperatorOutcomeMemoryItemJson(
    const std::string& event_json,
    const OpsEventReviewState& review,
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30538 prototype
std::string OpsOperatorOutcomeMemoryViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30593 prototype
bool OpsIncidentMemoryRecordMatchesFilters(const std::string& event_json,
                                           const OpsEventReviewState& review,
                                           const std::string& rule_id,
                                           const std::string& source_id,
                                           const std::string& incident_status);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30617 prototype
std::string OpsIncidentReviewProjectionJson(const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30634 prototype
std::vector<std::string> OpsIncidentMemoryHighlightFragments(
    const analysis::IncidentProjectionDocument& document,
    const std::vector<std::string>& matched_terms);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30672 prototype
std::string OpsVlmSummaryCandidateReviewJson(const std::string& search_query,
                                             const std::string& source_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30714 prototype
std::string OpsIncidentMemorySearchViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews,
    const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30822 prototype
std::string OpsV300EventEvidenceSearchQueryValue(
    const std::unordered_map<std::string, std::string>& query,
    const std::string& primary_key,
    const std::string& fallback_key = "");

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30839 prototype
bool OpsV300EventEvidenceSearchBoolQuery(
    const std::unordered_map<std::string, std::string>& query,
    const std::string& key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30846 prototype
std::string OpsV300NestedRefPath(const std::string& object_json, const std::string& key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30853 prototype
std::string OpsV300EvidenceRefPath(const std::string& event_json, const std::string& key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30864 prototype
std::string OpsV310EncodedManifestPath(const std::string& clip_manifest_path);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30875 prototype
std::string OpsV310EncodedMediaPath(const std::string& clip_manifest_path);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30886 prototype
std::string OpsV310ArtifactJson(const std::string& role,
                                const std::string& status,
                                const std::string& storage_key,
                                const std::string& basis,
                                const bool selected = false);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30903 prototype
std::string OpsV310ReplayTimelinePointsJson(const std::string& event_frame,
                                            const std::string& representative_image,
                                            const std::string& frame_bundle,
                                            const std::string& encoded_manifest,
                                            const std::string& encoded_media);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30949 prototype
std::string OpsV310PlaybackSegmentsJson(const std::int64_t pre_event_ms,
                                        const std::int64_t post_event_ms,
                                        const bool encoded_clip_available);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30981 type
struct OpsV320EvidenceQualityInfo {
    bool snapshot_path_present = false;
    bool event_frame_present = false;
    bool evidence_manifest_present = false;
    bool frame_bundle_present = false;
    bool encoded_clip_present = false;
    bool bbox_crop_present = false;
    bool vlm_evidence_refs_present = false;
    std::string evidence_completeness = "missing";
    std::string evidence_confidence = "low";
    std::string replay_coverage = "missing";
    std::string replay_coverage_hint = "no event evidence reference is available";
    std::string operator_hint = "capture or attach event evidence before closing this incident";
    int completeness_score = 0;
    int confidence_score = 20;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 30998 prototype
OpsV320EvidenceQualityInfo OpsV320EvidenceQualityInfoFor(const std::string& event_json,
                                                         const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31060 prototype
std::string OpsV320EvidenceQualityJson(const OpsV320EvidenceQualityInfo& info);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31095 prototype
std::string OpsV320EvidenceQualitySummaryJson(const std::vector<OpsV320EvidenceQualityInfo>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31146 type
struct OpsV320SourceReliabilityInfo {
    std::string source_id{"unknown-source"};
    std::string source_health_status{"source-missing"};
    std::string source_health_reason{"source-id-missing"};
    std::string recent_failure_context{"source-id-missing"};
    std::string operator_recheck_hint{"link this event to a source before final closure"};
    std::string operator_recheck_route{"/ops/api/source-health"};
    std::string checked_at;
    std::optional<std::int64_t> last_frame_age_ms;
    std::optional<std::int64_t> last_metadata_age_ms;
    int reconnect_count{0};
    bool source_health_present{false};
    std::vector<std::string> warnings;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31161 prototype
const OpsSourceHealthItem* OpsV320SourceHealthForSource(const OpsSourceHealthSnapshot& snapshot,
                                                       const std::string& source_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31172 prototype
std::string OpsV320RecentFailureContext(const OpsSourceHealthItem& item);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31188 prototype
std::string OpsV320SourceReliabilityHint(const OpsV320SourceReliabilityInfo& info);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31204 prototype
OpsV320SourceReliabilityInfo OpsV320SourceReliabilityInfoFor(
    const std::string& event_json,
    const OpsSourceHealthSnapshot& source_health_snapshot);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31242 prototype
void AppendOpsV320SourceReliabilityWarningsJson(std::ostringstream& out,
                                                const std::vector<std::string>& warnings);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31254 prototype
std::string OpsV320SourceReliabilityContextJson(const OpsV320SourceReliabilityInfo& info);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31290 prototype
std::string OpsV320SourceReliabilitySummaryJson(
    const std::vector<OpsV320SourceReliabilityInfo>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31330 type
struct OpsV330IncidentSourceCorrelationInfo {
    std::string event_id{"unknown-event"};
    std::string source_id{"unknown-source"};
    std::string source_cause_category{"source-context-missing"};
    std::string source_cause_summary{"source reliability context is missing for this incident"};
    std::string resolution_closure_impact{"block-closure"};
    std::string source_health_status{"source-missing"};
    std::string source_health_reason{"source-id-missing"};
    std::string recent_failure_context{"source-id-missing"};
    std::string correlation_confidence{"low"};
    int reconnect_count{0};
    bool source_recheck_required{true};
    bool resolution_detail_attached{true};
    bool source_reliability_context_reused{true};
    bool source_health_audit_linked{true};
    std::vector<std::string> correlation_signals;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31348 prototype
OpsV330IncidentSourceCorrelationInfo OpsV330IncidentSourceCorrelationInfoFor(
    const std::string& event_json,
    const OpsEventReviewState& resolution_state,
    const OpsV320SourceReliabilityInfo& source_reliability);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31410 prototype
std::string OpsV330IncidentSourceCorrelationJson(
    const OpsV330IncidentSourceCorrelationInfo& info);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31455 prototype
std::string OpsV330IncidentSourceCorrelationSummaryJson(
    const std::vector<OpsV330IncidentSourceCorrelationInfo>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31506 type
struct OpsV330OperatorRecheckRecoveryQueueInfo {
    std::string event_id{"unknown-event"};
    std::string source_id{"unknown-source"};
    std::string queue_status{"queued-operator-note-required"};
    std::string recheck_status{"required"};
    std::string retry_candidate{"source-health-recheck"};
    std::string retry_candidate_reason{"source-recheck-required"};
    std::string dry_run_result_status{"blocked-not-run"};
    std::string dry_run_result_summary{"operator note required before retry dry-run"};
    std::string operator_note_status{"required"};
    std::string operator_note_route{"/ops/api/events/reviews/{eventId}"};
    std::string source_recheck_route{"/ops/api/source-health"};
    std::string recovery_queue_reason{"source reliability context requires operator recheck"};
    bool failed_only_recheck{true};
    bool retry_candidate_available{true};
    bool operator_note_linked{true};
    bool operator_note_present{false};
    bool recovery_queue_read_model_created{true};
    std::vector<std::string> recovery_checklist;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31527 prototype
OpsV330OperatorRecheckRecoveryQueueInfo OpsV330OperatorRecheckRecoveryQueueInfoFor(
    const std::string& event_json,
    const OpsEventReviewState& review,
    const OpsV320SourceReliabilityInfo& source_reliability,
    const OpsV330IncidentSourceCorrelationInfo& incident_source_correlation);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31584 prototype
std::string OpsV330OperatorRecheckRecoveryQueueJson(
    const OpsV330OperatorRecheckRecoveryQueueInfo& info);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31633 prototype
std::string OpsV330OperatorRecheckRecoveryQueueSummaryJson(
    const std::vector<OpsV330OperatorRecheckRecoveryQueueInfo>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31699 type
struct OpsV320AiReviewQualityInfo {
    std::string correction_review_signal{"pending-review"};
    std::string uncertainty_reason{"not-reviewed"};
    std::string quality_badge{"review-required"};
    std::string operator_hint{"review AI/operator quality context before final closure"};
    std::string review_status{"new"};
    std::string classification{"unclassified"};
    std::string vlm_action{"not-reviewed"};
    std::string reanalysis_reason;
    int quality_score{35};
    bool corrected_feature_label_present{false};
    int feature_alias_count{0};
    bool reanalysis_requested{false};
    std::vector<std::string> signals;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31715 prototype
OpsV320AiReviewQualityInfo OpsV320AiReviewQualityInfoFor(
    const OpsEventReviewState& review,
    const OpsV320EvidenceQualityInfo& evidence_quality,
    const OpsV320SourceReliabilityInfo& source_reliability);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31806 prototype
void AppendOpsV320AiReviewSignalsJson(std::ostringstream& out,
                                       const std::vector<std::string>& signals);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31818 prototype
std::string OpsV320AiReviewQualityContextJson(const OpsV320AiReviewQualityInfo& info);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31854 prototype
std::string OpsV320AiReviewQualitySummaryJson(
    const std::vector<OpsV320AiReviewQualityInfo>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31896 type
struct OpsV320OperatorResolutionFlowInfo {
    std::string assignment_target{"operator-triage"};
    std::string assignment_flow_status{"triage-lane"};
    std::string resolution_status{"open"};
    std::string resolution_reason{"unreviewed"};
    std::string resolution_transition{"none"};
    std::string operator_hint{"assign an operator lane, add review notes, then close or reopen with audit"};
    std::string actor;
    std::string role;
    std::int64_t updated_at_ms{0};
    bool operator_note_present{false};
    bool resolution_note_present{false};
    bool close_action_available{true};
    bool reopen_action_available{false};
    bool audit_trail_required{true};
    std::vector<std::string> audit_actions{
        "event-review-update",
        "incident-action-update",
        "resolution-state-update",
        "operator-resolution-flow-update",
    };
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31919 prototype
OpsV320OperatorResolutionFlowInfo OpsV320OperatorResolutionFlowInfoFor(
    const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31953 prototype
std::string OpsV320OperatorResolutionFlowJson(const OpsV320OperatorResolutionFlowInfo& info);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 31991 prototype
std::string OpsV320OperatorResolutionFlowSummaryJson(
    const std::vector<OpsV320OperatorResolutionFlowInfo>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32037 type
struct OpsV320ActionReadinessChecklistInfo {
    std::string readiness_status{"blocked"};
    std::string rule_draft_status{"blocked"};
    std::string evidence_bundle_status{"blocked"};
    std::string notification_status{"blocked"};
    std::string operator_hint{
        "complete the action readiness checklist before operator approval"};
    bool rule_draft_ready{false};
    bool evidence_bundle_ready{false};
    bool notification_ready{false};
    bool manual_approval_required{true};
    bool notification_dry_run_required{true};
    std::vector<std::string> readiness_blockers;
    std::vector<std::string> checklist_items;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32053 prototype
OpsV320ActionReadinessChecklistInfo OpsV320ActionReadinessChecklistInfoFor(
    const OpsV320EvidenceQualityInfo& evidence_quality,
    const OpsV320SourceReliabilityInfo& source_reliability,
    const OpsV320AiReviewQualityInfo& ai_review_quality,
    const OpsV320OperatorResolutionFlowInfo& operator_resolution_flow);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32128 prototype
std::string OpsV320ActionReadinessChecklistJson(
    const OpsV320ActionReadinessChecklistInfo& info);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32168 prototype
std::string OpsV320ActionReadinessChecklistSummaryJson(
    const std::vector<OpsV320ActionReadinessChecklistInfo>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32219 prototype
std::string OpsV320ResolutionQueueStatus(const OpsEventReviewState& review);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32239 type
struct OpsV320ResolutionSearchMetricsInfo {
    std::string event_id;
    std::string event_type{"event"};
    std::string source_id{"unknown-source"};
    std::string rule_id{"not-available"};
    std::string queue_status{"needs-resolution"};
    std::string resolution_status{"open"};
    std::string resolution_reason{"unreviewed"};
    std::string review_status{"new"};
    std::string classification{"unclassified"};
    std::string evidence_confidence{"low"};
    std::string source_health_status{"source-missing"};
    std::string ai_quality_badge{"review-required"};
    std::string action_readiness_status{"blocked"};
    std::int64_t event_time_ms{0};
    bool ready_for_approval{false};
    bool source_recheck_required{true};
    bool review_required{true};
    std::vector<std::string> filter_tokens;
    std::vector<std::string> saved_view_matches;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32261 prototype
OpsV320ResolutionSearchMetricsInfo OpsV320ResolutionSearchMetricsInfoFor(
    const std::string& event_json,
    const OpsEventReviewState& review,
    const OpsV320EvidenceQualityInfo& evidence_quality,
    const OpsV320SourceReliabilityInfo& source_reliability,
    const OpsV320AiReviewQualityInfo& ai_review_quality,
    const OpsV320ActionReadinessChecklistInfo& action_readiness_checklist);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32336 prototype
std::string OpsV320ResolutionSearchMetricsJson(
    const OpsV320ResolutionSearchMetricsInfo& info);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32377 prototype
std::string OpsV320ResolutionSearchFilterValue(
    const std::unordered_map<std::string, std::string>& query,
    const std::string& key);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32384 prototype
std::string OpsV320ActiveResolutionFiltersJson(
    const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32431 prototype
std::string OpsV320ResolutionSavedViewsJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32456 prototype
std::string OpsV320ResolutionOperationsMetricSummaryJson(
    const std::vector<OpsV320ResolutionSearchMetricsInfo>& items);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32498 prototype
std::string OpsV320ResolutionSearchMetricsSummaryJson(
    const std::vector<OpsV320ResolutionSearchMetricsInfo>& items,
    const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32528 prototype
std::string OpsV320TimelineMarkersJson(const std::string& event_json,
                                       const OpsEventReviewState& review,
                                       const OpsV320EvidenceQualityInfo& evidence_quality,
                                       const OpsV320SourceReliabilityInfo& source_reliability,
                                       const OpsV320AiReviewQualityInfo& ai_review_quality,
                                       const OpsV320OperatorResolutionFlowInfo& operator_resolution_flow,
                                       const OpsV320ActionReadinessChecklistInfo& action_readiness_checklist);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32619 prototype
std::string OpsV320DetailSectionsJson(const std::string& event_json,
                                      const OpsEventReviewState& review,
                                      const OpsV320EvidenceQualityInfo& evidence_quality,
                                      const OpsV320SourceReliabilityInfo& source_reliability,
                                      const OpsV330IncidentSourceCorrelationInfo& incident_source_correlation,
                                      const OpsV330OperatorRecheckRecoveryQueueInfo& operator_recheck_recovery_queue,
                                      const OpsV350IncidentCommandHandoff& incident_command_handoff,
                                      const OpsV320AiReviewQualityInfo& ai_review_quality,
                                      const OpsV320OperatorResolutionFlowInfo& operator_resolution_flow,
                                      const OpsV320ActionReadinessChecklistInfo& action_readiness_checklist);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32728 prototype
std::string OpsV320UnifiedResolutionWorkspaceItemJson(const std::string& event_json,
                                                      const OpsEventReviewState& review,
                                                      const std::size_t index,
                                                      const OpsV320EvidenceQualityInfo& evidence_quality,
                                                      const OpsV320SourceReliabilityInfo& source_reliability,
                                                      const OpsV330IncidentSourceCorrelationInfo& incident_source_correlation,
                                                      const OpsV330OperatorRecheckRecoveryQueueInfo& operator_recheck_recovery_queue,
                                                      const OpsV350IncidentCommandHandoff& incident_command_handoff,
                                                      const OpsV320AiReviewQualityInfo& ai_review_quality,
                                                      const OpsV320OperatorResolutionFlowInfo& operator_resolution_flow,
                                                      const OpsV320ActionReadinessChecklistInfo& action_readiness_checklist,
                                                      const OpsV320ResolutionSearchMetricsInfo& resolution_search_metrics);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32818 prototype
std::string OpsV320UnifiedOpsEventsWorkspaceJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews,
    const WebRtcHttpRuntimeConfig& config,
    const OpsSourceHealthSnapshot& source_health_snapshot,
    const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 32988 prototype
std::string OpsV310ReplayTimelineItemJson(const std::string& event_json,
                                          const OpsEventReviewState& review,
                                          const std::size_t index);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33081 prototype
std::string OpsV310ReplayTimelineUiJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33129 prototype
std::string OpsV310OperatorFeatureCorrectionItemJson(const std::string& event_json,
                                                     const OpsEventReviewState& review,
                                                     const std::size_t index);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33183 prototype
std::string OpsV310OperatorFeatureCorrectionViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33243 prototype
analysis::EventSearchIndexEventRecord OpsV300IndexEventRecordFromJson(
    const std::string& event_json,
    const std::size_t index);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33279 prototype
void OpsV300AddIndexFeature(analysis::EventSearchIndexFeatureSet* feature_set,
                            const std::string& namespace_name,
                            const std::string& name,
                            const std::string& value,
                            const std::string& evidence_ref);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33299 prototype
analysis::EventSearchIndexFeatureSet OpsV300IndexFeatureSetFromJson(
    const std::string& event_json,
    const OpsEventReviewState& review,
    const analysis::EventSearchIndexEventRecord& event_record);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33328 prototype
analysis::EventSearchIndexEvidenceManifest OpsV300IndexEvidenceManifestFromJson(
    const std::string& event_json,
    const std::string& event_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33350 prototype
analysis::EventSearchIndexReviewState OpsV300IndexReviewStateFromReview(
    const std::string& event_json,
    const OpsEventReviewState& review,
    const std::string& event_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33363 prototype
std::string OpsV300EntryFeatureValue(const analysis::EventSearchIndexEntry& entry,
                                     const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33373 prototype
bool OpsV300EntryHasFeature(const analysis::EventSearchIndexEntry& entry,
                            const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33378 prototype
std::string OpsV300EvidenceTimelineJson(const analysis::EventSearchIndexEntry& entry,
                                        const std::string& event_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33425 prototype
std::string OpsV300FeatureReasonsJson(const analysis::EventSearchIndexEntry& entry);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33451 prototype
bool OpsV300EntryRetryable(const analysis::EventSearchIndexEntry& entry);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33455 prototype
std::string OpsV300RetryActionsJson(const analysis::EventSearchIndexEntry& entry);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33469 prototype
std::string OpsV300PinStatusJson(const analysis::EventSearchIndexEntry& entry);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33481 prototype
std::string OpsV300RetentionStatusJson(const analysis::EventSearchIndexEntry& entry);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33494 prototype
std::string OpsV300EventEvidenceSearchItemJson(const analysis::EventSearchIndexEntry& entry,
                                               const std::string& event_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33522 prototype
std::string OpsV300EventEvidenceSearchUiJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews,
    const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33620 type
struct IntegratorScopedEventSearchSource {
    bool provided{false};
    bool storage_enabled{false};
    bool has_more{false};
    std::string error;
    std::vector<std::string> records_json;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33628 prototype
IntegratorScopedEventSearchSource LoadIntegratorScopedEventSearchSource(
    const SourceViewRegistry::ClientViewAccess& access,
    std::size_t read_limit);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33666 prototype
ClientEventItem IntegratorScopedEventItemFromEntry(const analysis::EventSearchIndexEntry& entry,
                                                   const std::string& event_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33690 prototype
std::string IntegratorScopedEventSearchItemJson(
    const SourceViewRegistry::ClientViewAccess& access,
    const analysis::EventSearchIndexEntry& entry,
    const std::string& event_json,
    std::size_t index);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33714 prototype
std::string IntegratorScopedEventSearchJson(
    const SourceViewRegistry::ClientViewAccess& access,
    const auth::Principal& principal,
    const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33814 prototype
std::string OpsSimilarIncidentSafeValue(const std::string& value, const std::string& fallback);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33823 prototype
std::string OpsSimilarIncidentSourceId(const std::string& event_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33833 prototype
std::string OpsSimilarIncidentScenario(const std::string& event_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33851 type
struct OpsSimilarIncidentCandidate {
    std::string event_id;
    std::string incident_id;
    std::string rule_id;
    std::string scenario;
    std::string source_id;
    std::string event_status;
    std::string incident_status;
    std::string action_target;
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33862 prototype
OpsSimilarIncidentCandidate OpsSimilarIncidentCandidateFromEvent(
    const std::string& event_json,
    const OpsEventReviewState& review,
    const std::size_t index);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33888 prototype
int OpsSimilarIncidentScore(const OpsSimilarIncidentCandidate& base,
                            const OpsSimilarIncidentCandidate& related,
                            std::vector<std::string>* explanation_terms);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 33923 prototype
std::string OpsSimilarIncidentLookupViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34035 prototype
std::string OpsIncidentTimelineGraphSourceId(const std::string& event_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34045 prototype
std::string OpsIncidentTimelineGraphEventStatus(const std::string& event_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34050 prototype
std::int64_t OpsIncidentTimelineGraphEventTimeMs(const std::string& event_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34059 prototype
std::string OpsIncidentTimelineGraphNodeJson(const std::string& id,
                                             const std::string& stage,
                                             const std::string& title,
                                             const std::string& detail,
                                             const std::string& status,
                                             std::int64_t time_ms);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34077 prototype
std::string OpsIncidentTimelineGraphEdgeJson(const std::string& from,
                                             const std::string& to,
                                             const std::string& label);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34089 prototype
std::string OpsIncidentTimelineGraphAlertAttempt(
    const std::vector<std::string>& attempts,
    const std::string& event_id,
    const std::string& source_id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34104 prototype
std::string OpsIncidentTimelineGraphViewJson(
    const WebRtcHttpRuntimeConfig& config,
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34242 prototype
std::string OpsExplainableIncidentBriefValueOrFallback(const std::string& value,
                                                       const std::string& fallback);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34251 prototype
std::string OpsExplainableIncidentBriefObjectSlot(const std::string& event_json);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34269 prototype
std::string OpsExplainableIncidentBriefSlotJson(const std::string& key,
                                                const std::string& label,
                                                const std::string& value,
                                                const std::string& evidence);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34283 prototype
std::string OpsExplainableIncidentBriefViewJson(
    const std::vector<std::string>& event_json_records,
    const std::unordered_map<std::string, OpsEventReviewState>& reviews);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34356 prototype
bool OpsEventReviewInboxJson(const WebRtcHttpRuntimeConfig& config,
                             const OpsSourceHealthSnapshot& source_health_snapshot,
                             const std::unordered_map<std::string, std::string>& query,
                             std::string* body,
                             std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34521 prototype
std::string AnalysisEventRecordCompactionJson(
    const analysis::EventRecordCompactionResult& result);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34548 prototype
std::string AnalysisEventRecordCompactedFilesJson(
    const analysis::EventRecordCompactedFileListResult& result);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34578 prototype
std::string AnalysisEventRecordCompactedFileDeletedJson(
    const analysis::EventRecordCompactedFileInfo& file);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34592 prototype
std::string AnalysisEventRecordCompactedFileCleanupJson(
    const analysis::EventRecordCompactedFileCleanupResult& result);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34611 prototype
// Lab 리포트 뷰어가 노출할 수 있는 검증 산출물 확장자만 허용한다.
bool IsLabReportExtension(const std::filesystem::path& path);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34620 prototype
// /tmp 아래 media_server_* 텍스트 산출물만 읽도록 제한해 임의 파일 노출을 막는다.
bool IsSafeLabReportPath(const std::filesystem::path& raw_path, std::filesystem::path* resolved_path);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34643 prototype
bool PathStartsWith(const std::filesystem::path& path, const std::filesystem::path& base);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34656 prototype
std::string EventEvidenceContentType(const std::filesystem::path& path);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34673 prototype
bool IsSafeEventEvidencePath(const std::filesystem::path& raw_path,
                             std::filesystem::path* resolved_path,
                             std::string* content_type);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34704 prototype
void AppendZipLe16(std::string* out, std::uint16_t value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34709 prototype
void AppendZipLe32(std::string* out, std::uint32_t value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34716 prototype
std::uint32_t ZipCrc32(const std::string& data);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34727 type
struct ZipCentralDirectoryEntry {
    std::string name;
    std::uint32_t crc{0};
    std::uint32_t size{0};
    std::uint32_t local_offset{0};
};

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34734 prototype
bool AppendZipEntry(std::string* zip,
                    std::vector<ZipCentralDirectoryEntry>* entries,
                    const std::string& name,
                    const std::string& data,
                    std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34774 prototype
bool ReadBinaryFile(const std::filesystem::path& path,
                    std::string* body,
                    std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34802 prototype
bool AppendEvidenceFileToZip(std::string* zip,
                             std::vector<ZipCentralDirectoryEntry>* entries,
                             const std::filesystem::path& resolved,
                             const std::string& entry_name,
                             std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34814 prototype
bool FinalizeZip(std::string* zip,
                 const std::vector<ZipCentralDirectoryEntry>& entries,
                 std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34874 prototype
bool AddOptionalEvidencePath(const std::unordered_map<std::string, std::string>& query,
                             const std::string& key,
                             std::filesystem::path* resolved,
                             std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34892 prototype
std::string EvidenceBundleEntryName(const std::filesystem::path& path, const std::string& prefix);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34900 constant
constexpr std::int64_t kEvidenceBundleMaxAgeMs = 24LL * 60LL * 60LL * 1000LL;

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34902 prototype
bool EvidenceBundleReleaseSafeRequested(const std::unordered_map<std::string, std::string>& query);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34907 prototype
bool ParseEvidenceBundleExpiresAtMs(const std::unordered_map<std::string, std::string>& query,
                                    std::int64_t now_ms,
                                    std::int64_t* expires_at_ms,
                                    std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34935 prototype
std::string EvidenceBundleTokenSecret();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34943 prototype
std::uint64_t EvidenceBundleFnv1a64(const std::string& value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34952 prototype
std::string EvidenceBundleTokenPayload(const std::string& event_id,
                                       const std::filesystem::path& snapshot_path,
                                       const std::filesystem::path& clip_path,
                                       std::int64_t expires_at_ms,
                                       bool release_safe);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34966 prototype
std::string EvidenceBundleTokenFor(const std::string& event_id,
                                   const std::filesystem::path& snapshot_path,
                                   const std::filesystem::path& clip_path,
                                   std::int64_t expires_at_ms,
                                   bool release_safe);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 34978 prototype
bool ExtractEvidenceBundleRequest(const std::unordered_map<std::string, std::string>& query,
                                  std::int64_t now_ms,
                                  std::string* event_id,
                                  std::filesystem::path* snapshot_path,
                                  std::filesystem::path* clip_path,
                                  std::int64_t* expires_at_ms,
                                  std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35011 prototype
bool ValidateEvidenceBundleToken(const std::unordered_map<std::string, std::string>& query,
                                 const std::string& event_id,
                                 const std::filesystem::path& snapshot_path,
                                 const std::filesystem::path& clip_path,
                                 std::int64_t expires_at_ms,
                                 bool release_safe,
                                 std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35035 prototype
std::string EventEvidenceBundleTokenJson(const std::unordered_map<std::string, std::string>& query,
                                         std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35078 prototype
std::string EvidenceBundleRedactedValue(const std::string& value, const std::string& fallback);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35086 prototype
std::string BuildReleaseSafeIncidentEvidenceBundleManifest(const std::string& event_id,
                                                           bool snapshot_requested,
                                                           bool clip_requested,
                                                           std::int64_t now_ms,
                                                           std::int64_t expires_at_ms);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35169 prototype
bool BuildEventEvidenceBundleZip(const std::unordered_map<std::string, std::string>& query,
                                 std::string* zip_body,
                                 std::string* download_name,
                                 std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35309 prototype
std::string BuildEvidenceBundleAuditJson(const std::string& event_id,
                                         const std::string& download_name,
                                         bool release_safe);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35338 prototype
// 파일명 규칙으로 검증 리포트 종류를 추정해 UI 필터 없이도 대략적인 맥락을 보여준다.
std::string LabReportKindFromName(const std::string& name);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35364 prototype
// /tmp에 남은 최신 검증 산출물을 개발/검증 API에서 선택할 수 있는 JSON 목록으로 만든다.
std::string LabReportsJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35407 prototype
// 큰 로그 응답은 앞부분만 읽고 truncation 여부를 같이 내려준다.
bool BuildLabReportContentJson(const std::string& requested_path,
                               std::string* response_body,
                               std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35453 prototype
bool IsSupportedMediaFile(const std::filesystem::path& path);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35461 prototype
// 지정한 root 아래에서 predicate를 만족하는 파일만 상대 경로로 모아 UI/API에 노출한다.
std::vector<std::string> CollectRelativeFiles(const std::filesystem::path& root,
                                              bool (*predicate)(const std::filesystem::path&));

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35484 prototype
// /lab/files 응답에서 재사용하는 문자열 배열 필드를 JSON으로 직렬화한다.
void AppendJsonStringArray(std::ostringstream& out, const std::string& name, const std::vector<std::string>& values);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35496 prototype
std::string LabFilesJson();

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35525 prototype
bool AttachWebRtcAnalysisOverlay(analysis::AnalysisSessionService& analysis_sessions,
                                 const media::IngressRequest& ingress_request,
                                 const std::unordered_map<std::string, std::string>& query,
                                 const std::shared_ptr<WebRtcEgressSession>& bridge,
                                 std::string* analysis_tap_id,
                                 std::string* error_message);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35657 prototype
bool SendAll(int fd, const std::string& data);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35673 prototype
void SuppressSocketSigPipe(int fd);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35687 prototype
std::string InsertObjectFieldIfMissing(std::string document,
                                       const std::string& field_name,
                                       const std::optional<std::string>& object_value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35710 prototype
std::optional<std::pair<std::size_t, std::size_t>> FindObjectFieldRangeByKey(
    const std::string& body,
    const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35779 prototype
std::optional<std::string> ExtractObjectFieldByKey(const std::string& body,
                                                   const std::string& field);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35788 prototype
std::optional<std::pair<std::size_t, std::size_t>> FindDelimitedFieldRange(const std::string& body,
                                                                           const std::string& field,
                                                                           char open_ch,
                                                                           char close_ch);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35839 prototype
std::string ReplaceObjectField(std::string document,
                               const std::string& field_name,
                               const std::optional<std::string>& object_value);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35853 prototype
std::optional<std::string> FindRuleDocumentById(const std::vector<std::string>& documents,
                                                const std::string& id);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35866 prototype
std::optional<std::string> EventObjectForVaRule(const std::string& va_rule_document,
                                                const std::string& template_document);

// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 35876 prototype
std::string ExpandVaRuleForEventEvaluation(const std::string& va_rule_document,
                                           const std::vector<std::string>& rule_documents);

}  // namespace webrtc_http_server_detail

}  // namespace ingress
