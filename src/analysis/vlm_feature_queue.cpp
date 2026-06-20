// 파일 요약: v3.0 VLM feature queue의 bounded/lazy outcome 계약을 구현한다.
// 동작 요약: provider 호출을 수행하지 않고 FeatureSet structured output과 VLM-only failure 격리를 검증한다.
#include "analysis/vlm_feature_queue.h"

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

VlmFeatureQueueOutcome MakeOutcome(const VlmFeatureQueueTask& task,
                                   std::size_t queue_size,
                                   const std::string& status,
                                   const std::string& action,
                                   const std::string& failure_reason = "") {
    VlmFeatureQueueOutcome outcome;
    outcome.task_id = task.task_id;
    outcome.event_id = task.event_id;
    outcome.trigger_mode = task.trigger_mode;
    outcome.status = status;
    outcome.queue_action = action;
    outcome.failure_reason = failure_reason;
    outcome.queue_size = queue_size;
    outcome.runtime_provider_call_performed = false;
    outcome.media_path_blocked = false;
    outcome.event_record_blocked = false;
    outcome.metadata_fanout_blocked = false;
    outcome.event_post_dispatch_blocked = false;
    outcome.event_post_payload_changed = false;
    outcome.webrtc_data_channel_schema_changed = false;
    outcome.sse_ws_metadata_schema_changed = false;
    outcome.rtsp_webrtc_media_path_changed = false;
    outcome.viewer_client_exposure_added = false;
    outcome.raw_prompt_stored = false;
    outcome.raw_provider_response_stored = false;
    outcome.credential_stored = false;
    return outcome;
}

bool IsStructuredFeatureSetOutput(const std::string& output, const std::string& event_id) {
    if (!Contains(output, "\"schema\":\"media-server.event-feature-set.v1\"") ||
        !Contains(output, "\"eventId\":\"" + event_id + "\"") ||
        !Contains(output, "\"featureRevision\":") ||
        !Contains(output, "\"rawPromptStored\":false") ||
        !Contains(output, "\"rawProviderResponseStored\":false") ||
        !Contains(output, "\"identityFeaturesAllowed\":false")) {
        return false;
    }
    return !Contains(output, "\"rawPrompt\":") &&
           !Contains(output, "\"rawResponse\":") &&
           !Contains(output, "\"providerRequestBody\":") &&
           !Contains(output, "\"credential\":");
}

int ExtractFeatureRevision(const std::string& output) {
    const std::string key = "\"featureRevision\":";
    const std::size_t pos = output.find(key);
    if (pos == std::string::npos) {
        return 0;
    }
    std::size_t cursor = pos + key.size();
    while (cursor < output.size() && output[cursor] == ' ') {
        ++cursor;
    }
    int value = 0;
    while (cursor < output.size() && output[cursor] >= '0' && output[cursor] <= '9') {
        value = (value * 10) + (output[cursor] - '0');
        ++cursor;
    }
    return value;
}

VlmFeatureQueueOutcome CompleteTask(const VlmFeatureQueueTask& task,
                                    std::size_t queue_size,
                                    const std::string& action,
                                    const std::string& structured_output_json) {
    if (!IsStructuredFeatureSetOutput(structured_output_json, task.event_id)) {
        return MakeOutcome(task, queue_size, "failed", "discard-invalid-output", "invalid-output");
    }
    VlmFeatureQueueOutcome outcome = MakeOutcome(task, queue_size, "completed", action);
    outcome.feature_set_stored = true;
    outcome.feature_revision = ExtractFeatureRevision(structured_output_json);
    outcome.feature_set_json = structured_output_json;
    return outcome;
}

}  // namespace

VlmFeatureQueue::VlmFeatureQueue(VlmFeatureQueueOptions options) : options_(options) {
    if (options_.max_queue_size == 0) {
        options_.max_queue_size = 1;
    }
    if (options_.queue_timeout_ms <= 0) {
        options_.queue_timeout_ms = 1;
    }
}

VlmFeatureQueueOutcome VlmFeatureQueue::EnqueueBackgroundTask(const VlmFeatureQueueTask& task) {
    if (!options_.operator_opt_in_acknowledged) {
        return MakeOutcome(task, queue_.size(), "blocked", "do-not-enqueue", "operator-opt-in-required");
    }
    if (!options_.background_enabled) {
        return MakeOutcome(task, queue_.size(), "skipped", "background-disabled", "background-disabled");
    }
    if (!options_.runtime_available) {
        return MakeOutcome(task, queue_.size(), "blocked", "do-not-enqueue", "missing-runtime");
    }
    if (queue_.size() >= options_.max_queue_size) {
        if (task.queue_wait_ms > options_.queue_timeout_ms) {
            return MakeOutcome(task, queue_.size(), "failed", "drop-vlm-task", "queue-timeout");
        }
        return MakeOutcome(task, queue_.size(), "failed", "drop-vlm-task", "queue-full");
    }
    queue_.push_back(task);
    return MakeOutcome(task, queue_.size(), "queued", "enqueue-background");
}

VlmFeatureQueueOutcome VlmFeatureQueue::RunNext(const std::string& structured_output_json) {
    if (queue_.empty()) {
        VlmFeatureQueueTask empty;
        empty.task_id = "no-pending-vlm-feature-task";
        empty.trigger_mode = "background";
        return MakeOutcome(empty, 0, "failed", "no-pending-task", "empty-queue");
    }
    VlmFeatureQueueTask task = queue_.front();
    queue_.pop_front();
    return CompleteTask(task, queue_.size(), "store-feature-set", structured_output_json);
}

VlmFeatureQueueOutcome VlmFeatureQueue::RunLazyTask(const VlmFeatureQueueTask& task,
                                                    const std::string& structured_output_json) {
    if (!options_.operator_opt_in_acknowledged) {
        return MakeOutcome(task, queue_.size(), "blocked", "do-not-enqueue", "operator-opt-in-required");
    }
    if (!options_.lazy_trigger_enabled) {
        return MakeOutcome(task, queue_.size(), "skipped", "lazy-trigger-disabled", "lazy-trigger-disabled");
    }
    if (!options_.runtime_available) {
        return MakeOutcome(task, queue_.size(), "blocked", "do-not-enqueue", "missing-runtime");
    }
    return CompleteTask(task, queue_.size(), "run-lazy-trigger", structured_output_json);
}

std::size_t VlmFeatureQueue::PendingSize() const {
    return queue_.size();
}

std::string BuildVlmFeatureSetFixtureJson(const VlmFeatureQueueTask& task, int feature_revision) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"media-server.event-feature-set.v1\","
        << "\"policyVersion\":1,"
        << "\"featureSetId\":\"features-" << JsonEscape(task.event_id) << "-r" << feature_revision << "\","
        << "\"eventId\":\"" << JsonEscape(task.event_id) << "\","
        << "\"sourceId\":\"" << JsonEscape(task.source_id) << "\","
        << "\"channelId\":\"" << JsonEscape(task.channel_id) << "\","
        << "\"featureRevision\":" << std::max(1, feature_revision) << ","
        << "\"triggerMode\":\"" << JsonEscape(task.trigger_mode) << "\","
        << "\"evidenceRefs\":" << (task.input_evidence_refs_json.empty() ? "{}" : task.input_evidence_refs_json) << ","
        << "\"provenance\":{"
        << "\"runtimeMode\":\"fixture-only-no-provider-call\","
        << "\"runtimeProviderCallPerformed\":false,"
        << "\"rawPromptStored\":false,"
        << "\"rawProviderResponseStored\":false,"
        << "\"sourceFrameBytesInlined\":false"
        << "},"
        << "\"features\":[{"
        << "\"featureId\":\"event-action-context\","
        << "\"namespace\":\"event\","
        << "\"name\":\"eventActionContext\","
        << "\"valueType\":\"enum\","
        << "\"value\":\"vlm-feature-queue-fixture\","
        << "\"confidence\":1,"
        << "\"uncertainty\":\"fixture-structured-output\","
        << "\"evidenceRef\":\"eventFrame\","
        << "\"identityRisk\":\"non-identifying\","
        << "\"searchable\":true,"
        << "\"rawPromptFragmentStored\":false,"
        << "\"rawProviderResponseFragmentStored\":false"
        << "}],"
        << "\"privacy\":{"
        << "\"durableRetentionMode\":\"feature-only-structured-non-identifying\","
        << "\"identityFeaturesAllowed\":false,"
        << "\"faceRecognitionAllowed\":false,"
        << "\"watchlistAllowed\":false,"
        << "\"faceEmbeddingStored\":false,"
        << "\"rawPromptStored\":false,"
        << "\"rawProviderResponseStored\":false,"
        << "\"sourceUrlStored\":false,"
        << "\"credentialStored\":false,"
        << "\"rawFrameBytesInlined\":false"
        << "}"
        << "}";
    return out.str();
}

std::string VlmFeatureQueueOutcomeJson(const VlmFeatureQueueOutcome& outcome) {
    std::ostringstream out;
    out << "{"
        << "\"schema\":\"" << JsonEscape(outcome.schema) << "\","
        << "\"taskId\":\"" << JsonEscape(outcome.task_id) << "\","
        << "\"eventId\":\"" << JsonEscape(outcome.event_id) << "\","
        << "\"triggerMode\":\"" << JsonEscape(outcome.trigger_mode) << "\","
        << "\"status\":\"" << JsonEscape(outcome.status) << "\","
        << "\"queueAction\":\"" << JsonEscape(outcome.queue_action) << "\","
        << "\"failureReason\":\"" << JsonEscape(outcome.failure_reason) << "\","
        << "\"featureSetStored\":" << (outcome.feature_set_stored ? "true" : "false") << ","
        << "\"featureRevision\":" << outcome.feature_revision << ","
        << "\"queueSize\":" << outcome.queue_size << ","
        << "\"contractInvariants\":{"
        << "\"runtimeProviderCallPerformed\":" << (outcome.runtime_provider_call_performed ? "true" : "false") << ","
        << "\"mediaPathBlocked\":" << (outcome.media_path_blocked ? "true" : "false") << ","
        << "\"eventRecordBlocked\":" << (outcome.event_record_blocked ? "true" : "false") << ","
        << "\"metadataFanoutBlocked\":" << (outcome.metadata_fanout_blocked ? "true" : "false") << ","
        << "\"eventPostDispatchBlocked\":" << (outcome.event_post_dispatch_blocked ? "true" : "false") << ","
        << "\"eventPostPayloadChanged\":" << (outcome.event_post_payload_changed ? "true" : "false") << ","
        << "\"webrtcDataChannelSchemaChanged\":" << (outcome.webrtc_data_channel_schema_changed ? "true" : "false") << ","
        << "\"sseWsMetadataSchemaChanged\":" << (outcome.sse_ws_metadata_schema_changed ? "true" : "false") << ","
        << "\"rtspWebrtcMediaPathChanged\":" << (outcome.rtsp_webrtc_media_path_changed ? "true" : "false") << ","
        << "\"viewerClientExposureAdded\":" << (outcome.viewer_client_exposure_added ? "true" : "false") << ","
        << "\"rawPromptStored\":" << (outcome.raw_prompt_stored ? "true" : "false") << ","
        << "\"rawProviderResponseStored\":" << (outcome.raw_provider_response_stored ? "true" : "false") << ","
        << "\"credentialStored\":" << (outcome.credential_stored ? "true" : "false")
        << "}"
        << "}";
    return out.str();
}

}  // namespace analysis
