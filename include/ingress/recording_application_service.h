// S06 HTTP adapter에 노출하는 경로 비노출 녹화 조회·응답 계약.
#pragma once

#include "ingress/application_service_result.h"
#include "recording/recording_read_service.h"
#include "recording/analysis_observation_projector.h"
#include <functional>
#include <unordered_map>

namespace ingress {

struct RecordingByteRange {
    std::uint64_t first{0};
    std::uint64_t length{0};
    bool partial{false};
};

std::optional<RecordingByteRange> ParseRecordingByteRange(const std::string& header,
                                                         std::uint64_t file_size);

struct RecordingChannelStatus {
    std::string channel_id;
    std::string display_name;
    bool enabled{false};
    bool active{false};
    bool storage_blocked{false};
    std::uint64_t continuous_bytes{0};
    std::uint64_t event_bytes{0};
    std::uint64_t continuous_max_bytes{0};
    std::uint64_t event_max_bytes{0};
};

class RecordingApplicationService {
public:
    using ChannelAuthorizer = std::function<bool(const std::string&)>;
    using StatusProvider = std::function<bool(std::vector<RecordingChannelStatus>*)>;
    using ObservationStatusProvider = std::function<recording::AnalysisObservationProjector::Status()>;
    RecordingApplicationService(recording::RecordingReadService& reader,
                                recording::RecordingCatalog& catalog,
                                bool enabled, StatusProvider status_provider,
                                ObservationStatusProvider observation_status_provider = {})
        : reader_(reader), catalog_(catalog), enabled_(enabled), status_provider_(std::move(status_provider)),
          observation_status_provider_(std::move(observation_status_provider)) {}
    ApplicationServiceResult Status(const ChannelAuthorizer& authorize, bool include_global_observations = false) const;
    ApplicationServiceResult Timeline(const std::unordered_map<std::string, std::string>& query,
                                      const ChannelAuthorizer& authorize) const;
    std::unique_ptr<recording::ResolvedRecordingMedia> Media(const std::string& opaque_id,
                                                           const ChannelAuthorizer& authorize) const;
private:
    recording::RecordingReadService& reader_;
    recording::RecordingCatalog& catalog_;
    bool enabled_;
    StatusProvider status_provider_;
    ObservationStatusProvider observation_status_provider_;
};
}  // namespace ingress
