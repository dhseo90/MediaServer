// 파일 요약: v3.0 Feature-only Retention의 FeatureSet revision 보존 계약을 선언한다.
// 동작 요약: raw prompt/response/provider material 없이 구조화된 FeatureSet revision과 재분석 이력을 모델링한다.
#pragma once

#include <cstddef>
#include <string>
#include <vector>

namespace analysis {

struct VlmFeatureRetentionOptions {
    int default_retention_days{7};
    std::size_t max_revisions_per_event{8};
    bool pinned_excludes_automatic_cleanup{true};
};

struct VlmFeatureRetentionRequest {
    std::string event_id;
    std::string feature_set_id;
    std::string source_evidence_refs_json{"{}"};
    std::string reanalysis_reason;
    int requested_revision{1};
    bool reanalysis_requested{false};
};

struct VlmFeatureRetentionOutcome {
    std::string schema{"media-server.vlm-feature-retention-outcome.v1"};
    std::string event_id;
    std::string feature_set_id;
    std::string status;
    std::string retention_action;
    std::string failure_reason;
    bool feature_set_stored{false};
    int feature_revision{0};
    int previous_revision{0};
    std::string record_json;
    bool raw_prompt_stored{false};
    bool raw_provider_response_stored{false};
    bool provider_request_body_stored{false};
    bool credential_stored{false};
    bool source_url_stored{false};
    bool raw_frame_bytes_stored{false};
    bool runtime_provider_replay_performed{false};
    bool event_record_blocked{false};
    bool event_post_payload_changed{false};
    bool webrtc_data_channel_schema_changed{false};
    bool sse_ws_metadata_schema_changed{false};
    bool rtsp_webrtc_media_path_changed{false};
    bool viewer_client_exposure_added{false};
};

class VlmFeatureRetentionStore final {
public:
    explicit VlmFeatureRetentionStore(VlmFeatureRetentionOptions options = {});

    VlmFeatureRetentionOutcome StoreRevision(const VlmFeatureRetentionRequest& request,
                                             const std::string& feature_set_json);
    VlmFeatureRetentionOutcome RequestReanalysis(const VlmFeatureRetentionRequest& request,
                                                 const std::string& feature_set_json);
    std::size_t RevisionCount(const std::string& event_id) const;
    int LatestRevision(const std::string& event_id) const;

private:
    VlmFeatureRetentionOptions options_;
    std::vector<VlmFeatureRetentionOutcome> records_;
};

bool HasRawRetentionMaterial(const std::string& feature_set_json);
std::string VlmFeatureRetentionOutcomeJson(const VlmFeatureRetentionOutcome& outcome);

}  // namespace analysis
