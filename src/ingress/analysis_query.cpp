// 파일 요약: RTSP/WebRTC/HTTP query에서 영상분석 profile과 overlay 옵션을 공통으로 만든다.
// 동작 요약: 등록된 profile/rule을 요청 context에 맞춰 선택하고, query override를 적용한다.
// 동작 요약: YOLO parser 옵션, tracking category, adaptive tuner 옵션을 AnalysisProfile로 정규화한다.
#include "ingress/analysis_query.h"

#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <optional>
#include <string>
#include <vector>

#include "app_config.h"
#include "ingress/analysis_rule_registry.h"

namespace ingress {

namespace {

bool ParseBoolQuery(const std::unordered_map<std::string, std::string>& query,
                    const std::string& key,
                    bool default_value) {
    const auto it = query.find(key);
    if (it == query.end()) {
        return default_value;
    }
    const std::string& value = it->second;
    return value == "1" || value == "true" || value == "yes" || value == "on";
}

int ParseClampedIntQuery(const std::unordered_map<std::string, std::string>& query,
                         const std::string& key,
                         int default_value,
                         int min_value,
                         int max_value) {
    const auto it = query.find(key);
    if (it == query.end()) {
        return default_value;
    }
    try {
        const int parsed = std::stoi(it->second);
        return std::max(min_value, std::min(max_value, parsed));
    } catch (...) {
        return default_value;
    }
}

float ParseClampedFloatQuery(const std::unordered_map<std::string, std::string>& query,
                             const std::string& key,
                             float default_value,
                             float min_value,
                             float max_value) {
    const auto it = query.find(key);
    if (it == query.end()) {
        return default_value;
    }
    try {
        const float parsed = std::stof(it->second);
        return std::max(min_value, std::min(max_value, parsed));
    } catch (...) {
        return default_value;
    }
}

std::string ToLower(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return value;
}

std::string TrimToken(std::string value) {
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.front())) != 0) {
        value.erase(value.begin());
    }
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.back())) != 0) {
        value.pop_back();
    }
    return value;
}

bool HasAnyQueryKey(const std::unordered_map<std::string, std::string>& query,
                    const std::vector<std::string>& keys) {
    return std::any_of(keys.begin(), keys.end(), [&query](const std::string& key) {
        return query.find(key) != query.end();
    });
}

// 여러 alias key 중 먼저 등장한 query 값을 반환해 URL 호환성을 유지한다.
std::string FindStringQuery(const std::unordered_map<std::string, std::string>& query,
                            const std::vector<std::string>& keys,
                            std::string default_value = {}) {
    for (const auto& key : keys) {
        const auto it = query.find(key);
        if (it != query.end()) {
            return it->second;
        }
    }
    return default_value;
}

bool HasProfileTuningQuery(const std::unordered_map<std::string, std::string>& query) {
    return HasAnyQueryKey(query,
                          {"detector",
                           "model",
                           "labels",
                           "fps",
                           "maxQueue",
                           "frameSampleInterval",
                           "sampleEveryNFrames",
                           "maxFrameAgeMs",
                           "analysisMaxFrameAgeMs",
                           "inputWidth",
                           "inputHeight",
                           "maxDetections",
                           "confidence",
                           "nms",
                           "objectness",
                           "preprocess",
                           "yoloPreprocess",
                           "outputLayout",
                           "yoloOutputLayout",
                           "boxFormat",
                           "yoloBoxFormat",
                           "scoreMode",
                           "yoloScoreMode",
                           "detect",
                           "tracking",
                           "trackingClasses",
                           "trackClasses",
                           "pose",
                           "detectorDelayMs",
                           "adaptive",
                           "adaptiveTuner",
                           "adaptiveInputSize",
                           "adaptiveInput",
                           "adaptiveMinFps",
                           "adaptiveMaxFps",
                           "adaptiveMinInputWidth",
                           "adaptiveMinInputHeight",
                           "adaptiveMaxInputWidth",
                           "adaptiveMaxInputHeight",
                           "adaptiveInputStep",
                           "adaptiveCooldownMs",
                           "adaptiveHighLatencyRatio",
                           "adaptiveLowLatencyRatio"});
}

std::optional<std::string> ExtractDelimitedField(const std::string& body,
                                                 const std::string& field,
                                                 char open_ch,
                                                 char close_ch) {
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(':', pos + needle.size());
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(open_ch, pos);
    if (pos == std::string::npos) {
        return std::nullopt;
    }

    bool in_string = false;
    bool escaped = false;
    int depth = 0;
    const std::size_t start = pos;
    for (; pos < body.size(); ++pos) {
        const char ch = body[pos];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch == '\\' && in_string) {
            escaped = true;
            continue;
        }
        if (ch == '"') {
            in_string = !in_string;
            continue;
        }
        if (in_string) {
            continue;
        }
        if (ch == open_ch) {
            ++depth;
        } else if (ch == close_ch) {
            --depth;
            if (depth == 0) {
                return body.substr(start, pos - start + 1);
            }
        }
    }
    return std::nullopt;
}

std::optional<std::string> ExtractObjectField(const std::string& body, const std::string& field) {
    return ExtractDelimitedField(body, field, '{', '}');
}

std::optional<std::string> ExtractArrayField(const std::string& body, const std::string& field) {
    return ExtractDelimitedField(body, field, '[', ']');
}

// JSON string array 필드를 profile의 class 목록 옵션으로 파싱한다.
std::vector<std::string> ParseStringArrayField(const std::string& body, const std::string& field) {
    std::vector<std::string> values;
    const auto array = ExtractArrayField(body, field);
    if (!array.has_value()) {
        return values;
    }

    bool in_string = false;
    bool escaped = false;
    std::string current;
    for (std::size_t i = 1; i + 1 < array->size(); ++i) {
        const char ch = (*array)[i];
        if (!in_string) {
            if (ch == '"') {
                in_string = true;
                current.clear();
            }
            continue;
        }
        if (escaped) {
            current.push_back(ch);
            escaped = false;
            continue;
        }
        if (ch == '\\') {
            escaped = true;
            continue;
        }
        if (ch == '"') {
            values.push_back(current);
            in_string = false;
            continue;
        }
        current.push_back(ch);
    }
    return values;
}

// query string의 comma/semicolon 구분 class 목록을 vector로 바꾼다. label 내부 공백은 유지한다.
std::vector<std::string> ParseStringList(std::string value) {
    std::vector<std::string> values;
    std::string current;
    for (const char ch : value) {
        if (ch == ',' || ch == ';') {
            current = TrimToken(current);
            if (!current.empty()) {
                values.push_back(std::move(current));
                current.clear();
            }
            continue;
        }
        current.push_back(ch);
    }
    current = TrimToken(current);
    if (!current.empty()) {
        values.push_back(std::move(current));
    }
    return values;
}

std::optional<std::string> ParseStringField(const std::string& body, const std::string& field) {
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(':', pos + needle.size());
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find('"', pos);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    ++pos;

    std::string out;
    bool escaped = false;
    for (; pos < body.size(); ++pos) {
        const char ch = body[pos];
        if (escaped) {
            switch (ch) {
                case 'n':
                    out.push_back('\n');
                    break;
                case 'r':
                    out.push_back('\r');
                    break;
                case 't':
                    out.push_back('\t');
                    break;
                default:
                    out.push_back(ch);
                    break;
            }
            escaped = false;
            continue;
        }
        if (ch == '\\') {
            escaped = true;
            continue;
        }
        if (ch == '"') {
            return out;
        }
        out.push_back(ch);
    }
    return std::nullopt;
}

std::optional<bool> ParseBoolField(const std::string& body, const std::string& field) {
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(':', pos + needle.size());
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    ++pos;
    while (pos < body.size() && std::isspace(static_cast<unsigned char>(body[pos])) != 0) {
        ++pos;
    }
    if (body.compare(pos, 4, "true") == 0) {
        return true;
    }
    if (body.compare(pos, 5, "false") == 0) {
        return false;
    }
    return std::nullopt;
}

std::optional<double> ParseNumberField(const std::string& body, const std::string& field) {
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(':', pos + needle.size());
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    ++pos;
    while (pos < body.size() && std::isspace(static_cast<unsigned char>(body[pos])) != 0) {
        ++pos;
    }
    const char* start = body.c_str() + pos;
    char* end = nullptr;
    const double parsed = std::strtod(start, &end);
    if (end == start) {
        return std::nullopt;
    }
    return parsed;
}

int NumberFieldAsInt(const std::string& body, const std::string& field, int default_value, int min_value, int max_value) {
    const auto value = ParseNumberField(body, field);
    if (!value.has_value()) {
        return default_value;
    }
    const int parsed = static_cast<int>(*value);
    return std::max(min_value, std::min(max_value, parsed));
}

float NumberFieldAsFloat(const std::string& body,
                         const std::string& field,
                         float default_value,
                         float min_value,
                         float max_value) {
    const auto value = ParseNumberField(body, field);
    if (!value.has_value()) {
        return default_value;
    }
    const float parsed = static_cast<float>(*value);
    return std::max(min_value, std::min(max_value, parsed));
}

bool ContextValueMatches(const std::string& expected, const std::string& actual) {
    const std::string normalized = ToLower(expected);
    return normalized.empty() || normalized == "*" || normalized == ToLower(actual);
}

bool ContextClientMatches(const std::string& expected, const std::string& actual) {
    return expected.empty() || expected == "*" || expected == actual;
}

bool IsBuiltInAnalysisProfileId(const std::string& id) {
    return id == "1" || id == "2" || id == "3" || id == "4" || id == "5";
}

std::string NormalizeYoloOutputLayout(std::string value) {
    value = ToLower(value);
    if (value == "channels-first" || value == "attrs-first" || value == "nchw" || value == "bcn") {
        return "channels-first";
    }
    if (value == "channels-last" || value == "attrs-last" || value == "nhwc" || value == "bnc") {
        return "channels-last";
    }
    return "auto";
}

std::string NormalizeYoloBoxFormat(std::string value) {
    value = ToLower(value);
    if (value == "xyxy" || value == "corners") {
        return "xyxy";
    }
    return "cxcywh";
}

std::string NormalizeYoloScoreMode(std::string value) {
    value = ToLower(value);
    if (value == "class" || value == "class-only" || value == "no-objectness") {
        return "class-only";
    }
    if (value == "objectness" || value == "objectness-class" || value == "obj-class") {
        return "objectness-class";
    }
    if (value == "score-class" || value == "score-label" || value == "end2end") {
        return "score-class";
    }
    if (value == "class-score" || value == "label-score") {
        return "class-score";
    }
    return "auto";
}

std::string NormalizeTrackerPolicy(std::string value) {
    value = ToLower(TrimToken(std::move(value)));
    if (value.empty() || value == "default" || value == "lite" || value == "lite/default" ||
        value == "lightweight" || value == "direction-based") {
        return "lite";
    }
    if (value == "none" || value == "kalman-lite" || value == "bytetrack") {
        return value;
    }
    return {};
}

std::string NormalizeReidPolicy(std::string value) {
    value = ToLower(TrimToken(std::move(value)));
    if (value.empty() || value == "off" || value == "none" || value == "disabled") {
        return "off";
    }
    if (value == "assist" || value == "association-assist" || value == "reid-assist") {
        return "assist";
    }
    return {};
}

std::optional<std::string> TrackingPolicyObjectFromDocument(const std::string& document,
                                                            const std::string& analysis) {
    if (const auto policy = ExtractObjectField(analysis, "trackingPolicy"); policy.has_value()) {
        return policy;
    }
    if (const auto policy = ExtractObjectField(document, "trackingPolicy"); policy.has_value()) {
        return policy;
    }
    return std::nullopt;
}

std::optional<std::string> FirstStringField(const std::string& document,
                                            const std::vector<std::string>& fields) {
    for (const auto& field : fields) {
        const auto value = ParseStringField(document, field);
        if (value.has_value()) {
            return value;
        }
    }
    return std::nullopt;
}

void ApplyBuiltInProfile(const std::string& id, analysis::AnalysisProfile* profile) {
    if (profile == nullptr || !IsBuiltInAnalysisProfileId(id)) {
        return;
    }
    profile->profile_id = id;
    if (id == "1") {
        return;
    }
    if (id == "2") {
        profile->detector_type = "dummy";
        profile->target_fps = 5;
        profile->max_queue_size = 2;
        return;
    }
    profile->detector_type = "yolo";
    profile->yolo_preprocess_mode = "letterbox";
    profile->adaptive_tuning_enabled = true;
    profile->model_input_width = id == "5" ? 960 : 640;
    profile->model_input_height = id == "5" ? 960 : 640;
    profile->target_fps = id == "3" ? 8 : (id == "5" ? 3 : 5);
    profile->max_queue_size = id == "3" ? 1U : 2U;
    profile->confidence_threshold = id == "3" ? 0.25F : 0.35F;
    profile->nms_threshold = 0.45F;
}

void ApplyProfileDocument(const std::string& document, analysis::AnalysisProfile* profile) {
    if (profile == nullptr) {
        return;
    }
    if (const auto id = ParseStringField(document, "id"); id.has_value() && !id->empty()) {
        profile->profile_id = *id;
    }
    if (const auto detector = ParseStringField(document, "detector"); detector.has_value() && !detector->empty()) {
        profile->detector_type = *detector;
    }
    if (const auto model = ParseStringField(document, "model"); model.has_value()) {
        profile->model_path = *model;
    }
    if (const auto labels = ParseStringField(document, "labels"); labels.has_value()) {
        profile->labels_path = *labels;
    }
    if (const auto preprocess = ParseStringField(document, "preprocess"); preprocess.has_value()) {
        profile->yolo_preprocess_mode = *preprocess == "stretch" ? "stretch" : "letterbox";
    } else if (const auto preprocess = ParseStringField(document, "yoloPreprocess"); preprocess.has_value()) {
        profile->yolo_preprocess_mode = *preprocess == "stretch" ? "stretch" : "letterbox";
    }
    if (const auto layout = ParseStringField(document, "outputLayout"); layout.has_value()) {
        profile->yolo_output_layout = NormalizeYoloOutputLayout(*layout);
    } else if (const auto layout = ParseStringField(document, "yoloOutputLayout"); layout.has_value()) {
        profile->yolo_output_layout = NormalizeYoloOutputLayout(*layout);
    }
    if (const auto box_format = ParseStringField(document, "boxFormat"); box_format.has_value()) {
        profile->yolo_box_format = NormalizeYoloBoxFormat(*box_format);
    } else if (const auto box_format = ParseStringField(document, "yoloBoxFormat"); box_format.has_value()) {
        profile->yolo_box_format = NormalizeYoloBoxFormat(*box_format);
    }
    if (const auto score_mode = ParseStringField(document, "scoreMode"); score_mode.has_value()) {
        profile->yolo_score_mode = NormalizeYoloScoreMode(*score_mode);
    } else if (const auto score_mode = ParseStringField(document, "yoloScoreMode"); score_mode.has_value()) {
        profile->yolo_score_mode = NormalizeYoloScoreMode(*score_mode);
    }
    profile->target_fps = NumberFieldAsInt(document, "fps", profile->target_fps, 1, 60);
    profile->target_fps = NumberFieldAsInt(document, "targetFps", profile->target_fps, 1, 60);
    profile->max_queue_size =
        static_cast<std::size_t>(NumberFieldAsInt(document,
                                                  "maxQueue",
                                                  static_cast<int>(profile->max_queue_size),
                                                  1,
                                                  128));
    profile->max_queue_size =
        static_cast<std::size_t>(NumberFieldAsInt(document,
                                                  "maxQueueSize",
                                                  static_cast<int>(profile->max_queue_size),
                                                  1,
                                                  128));
    profile->frame_sample_interval =
        NumberFieldAsInt(document, "frameSampleInterval", profile->frame_sample_interval, 1, 300);
    profile->frame_sample_interval =
        NumberFieldAsInt(document, "sampleEveryNFrames", profile->frame_sample_interval, 1, 300);
    profile->max_frame_age_ms =
        NumberFieldAsInt(document, "maxFrameAgeMs", profile->max_frame_age_ms, 0, 600000);
    profile->max_frame_age_ms =
        NumberFieldAsInt(document, "analysisMaxFrameAgeMs", profile->max_frame_age_ms, 0, 600000);
    profile->model_input_width = NumberFieldAsInt(document, "inputWidth", profile->model_input_width, 32, 4096);
    profile->model_input_width = NumberFieldAsInt(document, "modelInputWidth", profile->model_input_width, 32, 4096);
    profile->model_input_height = NumberFieldAsInt(document, "inputHeight", profile->model_input_height, 32, 4096);
    profile->model_input_height = NumberFieldAsInt(document, "modelInputHeight", profile->model_input_height, 32, 4096);
    profile->max_detections = NumberFieldAsInt(document, "maxDetections", profile->max_detections, 1, 1000);
    profile->confidence_threshold =
        NumberFieldAsFloat(document, "confidence", profile->confidence_threshold, 0.0F, 1.0F);
    profile->confidence_threshold =
        NumberFieldAsFloat(document, "confidenceThreshold", profile->confidence_threshold, 0.0F, 1.0F);
    profile->nms_threshold = NumberFieldAsFloat(document, "nms", profile->nms_threshold, 0.0F, 1.0F);
    profile->nms_threshold = NumberFieldAsFloat(document, "nmsThreshold", profile->nms_threshold, 0.0F, 1.0F);
    profile->yolo_has_objectness = ParseBoolField(document, "objectness").value_or(profile->yolo_has_objectness);
    profile->enable_object_detection = ParseBoolField(document, "detect").value_or(profile->enable_object_detection);
    profile->enable_tracking = ParseBoolField(document, "tracking").value_or(profile->enable_tracking);
    if (ExtractArrayField(document, "trackingClasses").has_value()) {
        profile->tracking_classes_specified = true;
        profile->tracking_class_labels = ParseStringArrayField(document, "trackingClasses");
    } else if (ExtractArrayField(document, "trackClasses").has_value()) {
        profile->tracking_classes_specified = true;
        profile->tracking_class_labels = ParseStringArrayField(document, "trackClasses");
    } else if (const auto classes = ParseStringField(document, "trackingClasses"); classes.has_value()) {
        profile->tracking_classes_specified = true;
        profile->tracking_class_labels = ParseStringList(*classes);
    } else if (const auto classes = ParseStringField(document, "trackClasses"); classes.has_value()) {
        profile->tracking_classes_specified = true;
        profile->tracking_class_labels = ParseStringList(*classes);
    }
    profile->enable_pose = ParseBoolField(document, "pose").value_or(profile->enable_pose);
    profile->enable_overlay = ParseBoolField(document, "overlay").value_or(profile->enable_overlay);
    profile->enable_debug_state =
        ParseBoolField(document, "debugState")
            .value_or(ParseBoolField(document, "debugOverlay").value_or(profile->enable_debug_state));
    profile->adaptive_tuning_enabled =
        ParseBoolField(document, "adaptive").value_or(profile->adaptive_tuning_enabled);
    profile->adaptive_input_size_enabled =
        ParseBoolField(document, "adaptiveInputSize")
            .value_or(ParseBoolField(document, "adaptiveInput").value_or(profile->adaptive_input_size_enabled));
    profile->adaptive_min_fps = NumberFieldAsInt(document, "adaptiveMinFps", profile->adaptive_min_fps, 1, 60);
    profile->adaptive_max_fps = NumberFieldAsInt(document, "adaptiveMaxFps", profile->adaptive_max_fps, 0, 60);
    profile->adaptive_min_input_width =
        NumberFieldAsInt(document, "adaptiveMinInputWidth", profile->adaptive_min_input_width, 32, 4096);
    profile->adaptive_min_input_height =
        NumberFieldAsInt(document, "adaptiveMinInputHeight", profile->adaptive_min_input_height, 32, 4096);
    profile->adaptive_max_input_width =
        NumberFieldAsInt(document, "adaptiveMaxInputWidth", profile->adaptive_max_input_width, 0, 4096);
    profile->adaptive_max_input_height =
        NumberFieldAsInt(document, "adaptiveMaxInputHeight", profile->adaptive_max_input_height, 0, 4096);
    profile->adaptive_input_step =
        NumberFieldAsInt(document, "adaptiveInputStep", profile->adaptive_input_step, 16, 2048);
    profile->adaptive_cooldown_ms =
        NumberFieldAsInt(document, "adaptiveCooldownMs", profile->adaptive_cooldown_ms, 250, 60000);
    profile->adaptive_high_latency_ratio =
        NumberFieldAsFloat(document, "adaptiveHighLatencyRatio", profile->adaptive_high_latency_ratio, 0.1F, 10.0F);
    profile->adaptive_low_latency_ratio =
        NumberFieldAsFloat(document, "adaptiveLowLatencyRatio", profile->adaptive_low_latency_ratio, 0.01F, 10.0F);
}

bool ApplyRegisteredProfileById(const std::string& id, analysis::AnalysisProfile* profile) {
    if (id.empty() || profile == nullptr) {
        return false;
    }
    if (IsBuiltInAnalysisProfileId(id)) {
        ApplyBuiltInProfile(id, profile);
        return true;
    }
    for (const auto& document : AnalysisProfileDocumentsSnapshot()) {
        if (ParseStringField(document, "id").value_or("") != id) {
            continue;
        }
        ApplyProfileDocument(document, profile);
        return true;
    }
    return false;
}

struct MatchingProfileRule {
    std::string rule_id;
    std::string profile_id;
    std::string tracker_policy{"lite"};
    std::string reid_policy{"off"};
    bool has_tracking_policy{false};
    int priority{0};
    int specificity{0};
};

bool IsBetterProfileRule(const MatchingProfileRule& candidate, const MatchingProfileRule& current) {
    if (candidate.priority != current.priority) {
        return candidate.priority > current.priority;
    }
    return candidate.specificity > current.specificity;
}

bool ContextVaRuleMatches(const std::string& expected, const analysis::AnalysisContext& context) {
    if (!context.va_rule_ids.empty()) {
        return std::find(context.va_rule_ids.begin(), context.va_rule_ids.end(), expected) !=
               context.va_rule_ids.end();
    }
    if (!context.va_rule_id.empty()) {
        return expected == context.va_rule_id;
    }
    return expected.empty();
}

std::optional<MatchingProfileRule> FindMatchingRuleProfile(const analysis::AnalysisContext& context) {
    std::optional<MatchingProfileRule> best;
    for (const auto& document : AnalysisRuleDocumentsSnapshot()) {
        const std::string rule_id = ParseStringField(document, "id").value_or("");
        if (!ParseBoolField(document, "enabled").value_or(true)) {
            continue;
        }
        const auto analysis = ExtractObjectField(document, "analysis");
        if (!analysis.has_value()) {
            continue;
        }
        const std::string profile_id = ParseStringField(*analysis, "profileId").value_or("");
        std::string tracker_policy = "lite";
        std::string reid_policy = "off";
        bool has_tracking_policy = false;
        if (const auto policy = TrackingPolicyObjectFromDocument(document, *analysis); policy.has_value()) {
            tracker_policy =
                NormalizeTrackerPolicy(FirstStringField(*policy, {"tracker", "trackerPolicy"}).value_or(""));
            reid_policy = NormalizeReidPolicy(
                FirstStringField(*policy, {"reid", "reId", "reID", "reidPolicy"}).value_or("off"));
            has_tracking_policy = !tracker_policy.empty() && !reid_policy.empty();
        }
        if (profile_id.empty() && !has_tracking_policy) {
            continue;
        }

        std::string source_kind = "*";
        std::string route = "*";
        std::string client_id;
        std::string va_rule_id;
        if (const auto match = ExtractObjectField(document, "match"); match.has_value()) {
            source_kind = ParseStringField(*match, "sourceKind").value_or(source_kind);
            route = ParseStringField(*match, "route").value_or(route);
            client_id = ParseStringField(*match, "clientId").value_or(client_id);
            va_rule_id =
                ParseStringField(*match, "vaRule").value_or(ParseStringField(*match, "vaRuleId").value_or(""));
        }
        if (va_rule_id.empty() && ExtractObjectField(document, "source").has_value() &&
            ExtractObjectField(document, "templateStart").has_value()) {
            va_rule_id = rule_id;
        }
        if (!ContextVaRuleMatches(va_rule_id, context) ||
            !ContextValueMatches(source_kind, context.source_kind) ||
            !ContextValueMatches(route, context.route) ||
            !ContextClientMatches(client_id, context.client_id)) {
            continue;
        }

        int priority = static_cast<int>(ParseNumberField(document, "priority").value_or(0.0));
        if (const auto match = ExtractObjectField(document, "match"); match.has_value()) {
            priority = static_cast<int>(ParseNumberField(*match, "priority").value_or(priority));
        }
        int specificity = 0;
        if (!source_kind.empty() && source_kind != "*") {
            specificity += 2;
        }
        if (!route.empty() && route != "*") {
            specificity += 2;
        }
        if (!client_id.empty() && client_id != "*") {
            specificity += 4;
        }
        if (!va_rule_id.empty()) {
            specificity += 8;
        }
        const MatchingProfileRule candidate{rule_id,
                                            profile_id,
                                            tracker_policy.empty() ? "lite" : tracker_policy,
                                            reid_policy.empty() ? "off" : reid_policy,
                                            has_tracking_policy,
                                            priority,
                                            specificity};
        if (!best.has_value() || IsBetterProfileRule(candidate, *best)) {
            best = candidate;
        }
    }
    return best;
}

void ApplyRuleTrackingPolicy(const MatchingProfileRule& matched, analysis::AnalysisProfile* profile) {
    if (profile == nullptr) {
        return;
    }
    profile->tracking_policy_specified = matched.has_tracking_policy;
    profile->tracking_policy_source = matched.has_tracking_policy ? "rule" : "rule-default";
    profile->tracking_policy_rule_id = matched.rule_id;
    profile->tracking_policy_tracker =
        matched.tracker_policy.empty() ? std::string("lite") : matched.tracker_policy;
    profile->tracking_policy_reid = matched.reid_policy.empty() ? std::string("off") : matched.reid_policy;
    profile->tracking_policy_fallback_reason.clear();

    if (profile->tracking_policy_tracker == "none") {
        profile->enable_tracking = false;
        profile->tracking_policy_effective_tracker = "none";
        if (profile->tracking_policy_reid != "off") {
            profile->tracking_policy_reid = "off";
            profile->tracking_policy_fallback_reason = "tracker-none-forces-reid-off";
        }
        return;
    }

    if (profile->tracking_policy_tracker == "kalman-lite") {
        profile->enable_tracking = true;
        profile->tracking_policy_effective_tracker = "kalman-lite";
        return;
    }

    if (profile->tracking_policy_tracker == "bytetrack") {
        profile->enable_tracking = true;
        profile->tracking_policy_effective_tracker = "lite";
        profile->tracking_policy_fallback_reason =
            profile->tracking_policy_tracker + "-runtime-pending";
        return;
    }

    profile->enable_tracking = true;
    profile->tracking_policy_effective_tracker = "lite";
}

}  // namespace

analysis::AnalysisProfile BuildAnalysisProfileFromQuery(const std::unordered_map<std::string, std::string>& query) {
    analysis::AnalysisProfile profile;
    const bool va_requested = ParseBoolQuery(query, "overlay", false) ||
                              ParseBoolQuery(query, "analysisOverlay", false) ||
                              ParseBoolQuery(query, "va", false) ||
                              ParseBoolQuery(query, "analysis", false);
    if (va_requested) {
        const auto& config = app::GetAppConfig();
        profile.detector_type = config.default_analysis_detector;
        profile.model_path = config.default_analysis_model_path;
        profile.labels_path = config.default_analysis_labels_path;
        profile.target_fps = config.default_analysis_fps;
        profile.max_queue_size = config.default_analysis_max_queue;
        profile.frame_sample_interval = config.default_analysis_frame_sample_interval;
        profile.max_frame_age_ms = config.default_analysis_max_frame_age_ms;
        profile.model_input_width = config.default_analysis_input_width;
        profile.model_input_height = config.default_analysis_input_height;
        profile.confidence_threshold = config.default_analysis_confidence;
        profile.nms_threshold = config.default_analysis_nms;
        profile.yolo_preprocess_mode = config.default_analysis_preprocess;
        profile.enable_overlay = true;
        profile.enable_tracking = config.default_analysis_tracking_enabled;
        profile.tracking_class_labels = config.default_analysis_tracking_classes;
        profile.adaptive_tuning_enabled = config.default_analysis_adaptive_enabled;
        profile.adaptive_input_size_enabled = config.default_analysis_adaptive_input_enabled;
        profile.adaptive_min_fps = config.default_analysis_adaptive_min_fps;
        profile.adaptive_max_fps = 0;
        profile.adaptive_min_input_width = config.default_analysis_adaptive_min_input_width;
        profile.adaptive_min_input_height = config.default_analysis_adaptive_min_input_height;
        profile.adaptive_max_input_width = 0;
        profile.adaptive_max_input_height = 0;
        profile.adaptive_input_step = config.default_analysis_adaptive_input_step;
        profile.adaptive_cooldown_ms = config.default_analysis_adaptive_cooldown_ms;
        profile.adaptive_high_latency_ratio = config.default_analysis_adaptive_high_latency_ratio;
        profile.adaptive_low_latency_ratio = config.default_analysis_adaptive_low_latency_ratio;
    }

    bool explicit_profile_requested = false;
    if (const auto it = query.find("profileId"); it != query.end() && !it->second.empty()) {
        profile.profile_id = it->second;
        explicit_profile_requested = true;
    } else if (const auto it = query.find("profile"); it != query.end() && !it->second.empty()) {
        profile.profile_id = it->second;
        explicit_profile_requested = true;
    }
    profile.explicit_profile_requested = explicit_profile_requested;
    profile.allow_rule_profile_override = !explicit_profile_requested && !HasProfileTuningQuery(query);
    if (explicit_profile_requested) {
        ApplyRegisteredProfileById(profile.profile_id, &profile);
        profile.profile_selection_source = "query";
    }
    if (const auto it = query.find("detector"); it != query.end() && !it->second.empty()) {
        profile.detector_type = it->second;
    }
    if (const auto it = query.find("model"); it != query.end() && !it->second.empty()) {
        profile.model_path = it->second;
    }
    if (const auto it = query.find("labels"); it != query.end() && !it->second.empty()) {
        profile.labels_path = it->second;
    }
    profile.target_fps = ParseClampedIntQuery(query, "fps", profile.target_fps, 1, 60);
    profile.max_queue_size =
        static_cast<std::size_t>(ParseClampedIntQuery(query, "maxQueue", static_cast<int>(profile.max_queue_size), 1, 128));
    profile.frame_sample_interval =
        ParseClampedIntQuery(query, "frameSampleInterval", profile.frame_sample_interval, 1, 300);
    profile.frame_sample_interval =
        ParseClampedIntQuery(query, "sampleEveryNFrames", profile.frame_sample_interval, 1, 300);
    profile.max_frame_age_ms =
        ParseClampedIntQuery(query, "maxFrameAgeMs", profile.max_frame_age_ms, 0, 600000);
    profile.max_frame_age_ms =
        ParseClampedIntQuery(query, "analysisMaxFrameAgeMs", profile.max_frame_age_ms, 0, 600000);
    profile.model_input_width = ParseClampedIntQuery(query, "inputWidth", profile.model_input_width, 32, 4096);
    profile.model_input_height = ParseClampedIntQuery(query, "inputHeight", profile.model_input_height, 32, 4096);
    profile.max_detections = ParseClampedIntQuery(query, "maxDetections", profile.max_detections, 1, 1000);
    profile.confidence_threshold =
        ParseClampedFloatQuery(query, "confidence", profile.confidence_threshold, 0.0F, 1.0F);
    profile.nms_threshold = ParseClampedFloatQuery(query, "nms", profile.nms_threshold, 0.0F, 1.0F);
    profile.yolo_has_objectness = ParseBoolQuery(query, "objectness", profile.yolo_has_objectness);
    if (const auto it = query.find("preprocess"); it != query.end() && !it->second.empty()) {
        profile.yolo_preprocess_mode = it->second == "stretch" ? "stretch" : "letterbox";
    } else if (const auto it = query.find("yoloPreprocess"); it != query.end() && !it->second.empty()) {
        profile.yolo_preprocess_mode = it->second == "stretch" ? "stretch" : "letterbox";
    }
    if (const auto it = query.find("outputLayout"); it != query.end() && !it->second.empty()) {
        profile.yolo_output_layout = NormalizeYoloOutputLayout(it->second);
    } else if (const auto it = query.find("yoloOutputLayout"); it != query.end() && !it->second.empty()) {
        profile.yolo_output_layout = NormalizeYoloOutputLayout(it->second);
    }
    if (const auto it = query.find("boxFormat"); it != query.end() && !it->second.empty()) {
        profile.yolo_box_format = NormalizeYoloBoxFormat(it->second);
    } else if (const auto it = query.find("yoloBoxFormat"); it != query.end() && !it->second.empty()) {
        profile.yolo_box_format = NormalizeYoloBoxFormat(it->second);
    }
    if (const auto it = query.find("scoreMode"); it != query.end() && !it->second.empty()) {
        profile.yolo_score_mode = NormalizeYoloScoreMode(it->second);
    } else if (const auto it = query.find("yoloScoreMode"); it != query.end() && !it->second.empty()) {
        profile.yolo_score_mode = NormalizeYoloScoreMode(it->second);
    }
    profile.enable_object_detection = ParseBoolQuery(query, "detect", profile.enable_object_detection);
    profile.enable_tracking = ParseBoolQuery(query, "tracking", profile.enable_tracking);
    if (const auto it = query.find("trackingClasses"); it != query.end()) {
        profile.tracking_classes_specified = true;
        profile.tracking_class_labels = ParseStringList(it->second);
    } else if (const auto it = query.find("trackClasses"); it != query.end()) {
        profile.tracking_classes_specified = true;
        profile.tracking_class_labels = ParseStringList(it->second);
    }
    profile.enable_pose = ParseBoolQuery(query, "pose", profile.enable_pose);
    profile.enable_overlay = ParseBoolQuery(query, "overlay", profile.enable_overlay);
    profile.enable_debug_state =
        ParseBoolQuery(query,
                       "debugState",
                       ParseBoolQuery(query,
                                      "debugOverlay",
                                      ParseBoolQuery(query, "vaDebug", app::GetAppConfig().default_analysis_debug_overlay_enabled)));
    profile.debug_detector_delay_ms =
        ParseClampedIntQuery(query, "detectorDelayMs", profile.debug_detector_delay_ms, 0, 5000);
    profile.adaptive_tuning_enabled =
        ParseBoolQuery(query, "adaptive", ParseBoolQuery(query, "adaptiveTuner", profile.adaptive_tuning_enabled));
    profile.adaptive_input_size_enabled =
        ParseBoolQuery(query,
                       "adaptiveInputSize",
                       ParseBoolQuery(query, "adaptiveInput", profile.adaptive_input_size_enabled));
    profile.adaptive_min_fps = ParseClampedIntQuery(query, "adaptiveMinFps", profile.adaptive_min_fps, 1, 60);
    profile.adaptive_max_fps = ParseClampedIntQuery(query,
                                                    "adaptiveMaxFps",
                                                    profile.adaptive_max_fps > 0 ? profile.adaptive_max_fps
                                                                                 : profile.target_fps,
                                                    1,
                                                    60);
    profile.adaptive_min_input_width =
        ParseClampedIntQuery(query, "adaptiveMinInputWidth", profile.adaptive_min_input_width, 32, 4096);
    profile.adaptive_min_input_height =
        ParseClampedIntQuery(query, "adaptiveMinInputHeight", profile.adaptive_min_input_height, 32, 4096);
    profile.adaptive_max_input_width =
        ParseClampedIntQuery(query,
                             "adaptiveMaxInputWidth",
                             profile.adaptive_max_input_width > 0 ? profile.adaptive_max_input_width
                                                                  : profile.model_input_width,
                             32,
                             4096);
    profile.adaptive_max_input_height =
        ParseClampedIntQuery(query,
                             "adaptiveMaxInputHeight",
                             profile.adaptive_max_input_height > 0 ? profile.adaptive_max_input_height
                                                                   : profile.model_input_height,
                             32,
                             4096);
    profile.adaptive_input_step =
        ParseClampedIntQuery(query, "adaptiveInputStep", profile.adaptive_input_step, 16, 2048);
    profile.adaptive_cooldown_ms =
        ParseClampedIntQuery(query, "adaptiveCooldownMs", profile.adaptive_cooldown_ms, 250, 60000);
    profile.adaptive_high_latency_ratio =
        ParseClampedFloatQuery(query, "adaptiveHighLatencyRatio", profile.adaptive_high_latency_ratio, 0.1F, 10.0F);
    profile.adaptive_low_latency_ratio =
        ParseClampedFloatQuery(query, "adaptiveLowLatencyRatio", profile.adaptive_low_latency_ratio, 0.01F, 10.0F);
    return profile;
}

analysis::AnalysisProfile ResolveAnalysisProfileForContext(analysis::AnalysisProfile profile,
                                                           const analysis::AnalysisContext& context) {
    const auto matched = FindMatchingRuleProfile(context);
    if (!matched.has_value()) {
        return profile;
    }
    analysis::AnalysisProfile resolved = profile;
    const bool va_rule_context = !context.va_rule_id.empty() || !context.va_rule_ids.empty();
    const bool can_apply_rule_profile = profile.allow_rule_profile_override &&
                                        !profile.explicit_profile_requested &&
                                        !matched->profile_id.empty();
    if (can_apply_rule_profile && !ApplyRegisteredProfileById(matched->profile_id, &resolved)) {
        return profile;
    }
    if (can_apply_rule_profile) {
        resolved.allow_rule_profile_override = false;
        resolved.profile_selection_source = "rule";
    } else if (!va_rule_context && (!profile.allow_rule_profile_override || profile.explicit_profile_requested)) {
        return profile;
    }
    resolved.selected_by_rule_id = matched->rule_id;
    resolved.selected_rule_priority = matched->priority;
    resolved.selected_rule_specificity = matched->specificity;
    ApplyRuleTrackingPolicy(*matched, &resolved);
    return resolved;
}

analysis::OverlayRenderOptions BuildOverlayRenderOptionsFromQuery(
    const std::unordered_map<std::string, std::string>& query) {
    analysis::OverlayRenderOptions options;
    options.line_thickness = app::GetAppConfig().default_analysis_overlay_thickness;
    options.line_thickness = ParseClampedIntQuery(query, "thickness", options.line_thickness, 1, 16);
    options.draw_labels = ParseBoolQuery(query, "drawLabels", options.draw_labels);
    options.draw_track_ids =
        ParseBoolQuery(query, "trackIds", ParseBoolQuery(query, "drawTrackIds", options.draw_track_ids));
    options.draw_track_trails =
        ParseBoolQuery(query, "trackTrails", ParseBoolQuery(query, "drawTrackTrails", options.draw_track_trails));
    options.draw_debug_overlay =
        ParseBoolQuery(query,
                       "debugOverlay",
                       ParseBoolQuery(query,
                                      "debugState",
                                      ParseBoolQuery(query,
                                                     "vaDebug",
                                                     app::GetAppConfig().default_analysis_debug_overlay_enabled)));
    if (options.draw_debug_overlay) {
        options.draw_track_ids = true;
    }
    if (const auto it = query.find("labelLang"); it != query.end() && !it->second.empty()) {
        options.label_language = it->second == "en" || it->second == "english"
                                     ? analysis::OverlayLabelLanguage::English
                                     : analysis::OverlayLabelLanguage::Korean;
    } else if (const auto it = query.find("labelLanguage"); it != query.end() && !it->second.empty()) {
        options.label_language = it->second == "en" || it->second == "english"
                                     ? analysis::OverlayLabelLanguage::English
                                     : analysis::OverlayLabelLanguage::Korean;
    }

    const std::string redaction = ToLower(TrimToken(FindStringQuery(query, {"redaction", "redactionMode"})));
    if (redaction == "person-mosaic" || redaction == "mosaic" || redaction == "1" || redaction == "true" ||
        redaction == "yes" || redaction == "on") {
        options.redaction_mode = analysis::OverlayRedactionMode::Mosaic;
    } else if (redaction == "none" || redaction == "0" || redaction == "false" || redaction == "off") {
        options.redaction_mode = analysis::OverlayRedactionMode::None;
    }
    const std::string redaction_classes = FindStringQuery(query, {"redactionClasses", "redactClasses"});
    if (!redaction_classes.empty()) {
        options.redaction_class_labels = ParseStringList(redaction_classes);
    }
    options.redaction_block_size =
        ParseClampedIntQuery(query,
                             "redactionBlockSize",
                             ParseClampedIntQuery(query, "mosaicBlockSize", options.redaction_block_size, 4, 128),
                             4,
                             128);
    options.redaction_margin_ratio =
        ParseClampedFloatQuery(query, "redactionMarginRatio", options.redaction_margin_ratio, 0.0F, 0.5F);
    return options;
}

AnalysisOverlayTimingOptions BuildAnalysisOverlayTimingOptionsFromQuery(
    const std::unordered_map<std::string, std::string>& query) {
    AnalysisOverlayTimingOptions options;
    const auto& config = app::GetAppConfig();
    options.sync_tolerance_ms = config.default_analysis_overlay_sync_tolerance_ms;
    options.wait_timeout_ms = config.default_analysis_overlay_wait_ms;
    options.sync_tolerance_ms = ParseClampedIntQuery(query, "overlaySyncToleranceMs", options.sync_tolerance_ms, 0, 5000);
    options.wait_timeout_ms = ParseClampedIntQuery(query, "overlayWaitMs", options.wait_timeout_ms, 0, 2000);
    return options;
}

bool IsAnalysisOverlayRequested(const std::unordered_map<std::string, std::string>& query) {
    return ParseBoolQuery(query, "overlay", false) ||
           ParseBoolQuery(query, "analysisOverlay", false) ||
           ParseBoolQuery(query, "va", false) ||
           ParseBoolQuery(query, "analysis", false);
}

}  // namespace ingress
