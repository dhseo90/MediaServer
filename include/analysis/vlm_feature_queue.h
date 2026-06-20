// 파일 요약: v3.0 VLM feature queue의 bounded/lazy outcome 계약을 선언한다.
// 동작 요약: 실제 provider 호출 없이 evidence ref 기반 FeatureSet 산출과 VLM-only failure 상태를 검증 가능하게 모델링한다.
#pragma once

#include <cstddef>
#include <cstdint>
#include <deque>
#include <string>

namespace analysis {

struct VlmFeatureQueueOptions {
    bool background_enabled{false};
    bool lazy_trigger_enabled{false};
    bool operator_opt_in_acknowledged{false};
    bool runtime_available{false};
    std::size_t max_queue_size{4};
    int queue_timeout_ms{3000};
};

struct VlmFeatureQueueTask {
    std::string task_id;
    std::string event_id;
    std::string source_id;
    std::string channel_id;
    std::string trigger_mode{"background"};
    std::string input_evidence_refs_json{"{}"};
    int queue_wait_ms{0};
    std::int64_t created_at_ms{0};
};

struct VlmFeatureQueueOutcome {
    std::string schema{"media-server.vlm-feature-queue-outcome.v1"};
    std::string task_id;
    std::string event_id;
    std::string trigger_mode;
    std::string status;
    std::string queue_action;
    std::string failure_reason;
    bool feature_set_stored{false};
    int feature_revision{0};
    std::string feature_set_json;
    std::size_t queue_size{0};
    bool runtime_provider_call_performed{false};
    bool media_path_blocked{false};
    bool event_record_blocked{false};
    bool metadata_fanout_blocked{false};
    bool event_post_dispatch_blocked{false};
    bool event_post_payload_changed{false};
    bool webrtc_data_channel_schema_changed{false};
    bool sse_ws_metadata_schema_changed{false};
    bool rtsp_webrtc_media_path_changed{false};
    bool viewer_client_exposure_added{false};
    bool raw_prompt_stored{false};
    bool raw_provider_response_stored{false};
    bool credential_stored{false};
};

class VlmFeatureQueue final {
public:
    explicit VlmFeatureQueue(VlmFeatureQueueOptions options);

    VlmFeatureQueueOutcome EnqueueBackgroundTask(const VlmFeatureQueueTask& task);
    VlmFeatureQueueOutcome RunNext(const std::string& structured_output_json);
    VlmFeatureQueueOutcome RunLazyTask(const VlmFeatureQueueTask& task,
                                       const std::string& structured_output_json);
    std::size_t PendingSize() const;

private:
    VlmFeatureQueueOptions options_;
    std::deque<VlmFeatureQueueTask> queue_;
};

std::string BuildVlmFeatureSetFixtureJson(const VlmFeatureQueueTask& task, int feature_revision);
std::string VlmFeatureQueueOutcomeJson(const VlmFeatureQueueOutcome& outcome);

}  // namespace analysis
