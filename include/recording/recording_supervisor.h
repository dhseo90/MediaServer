// 파일 요약: source registry 녹화 정책을 runtime recorder와 일치시키는 supervisor를 선언한다.
// 동작 요약: 시작 snapshot, 저장 callback, 5초 safety reconcile과 revision idempotency를 제공한다.
#pragma once

#include <condition_variable>
#include <cstdint>
#include <mutex>
#include <string>
#include <thread>
#include <unordered_map>

#include "core/recording_runtime_config_data.h"
#include "ingress/source_view_application_service.h"
#include "recording/recording_session_service.h"
#include "recording/retention_coordinator.h"

namespace recording {

class RecordingSupervisor {
public:
    RecordingSupervisor(const core::RecordingRuntimeConfigData& config,
                        ingress::SourceViewApplicationService& sources,
                        RecordingSessionService& sessions,
                        RetentionCoordinator& retention);
    ~RecordingSupervisor();
    bool Start(std::string* error);
    void Stop();
    void ReconcileNow();

private:
    struct RuntimeState {
        std::uint64_t revision{0};
        bool active{false};
        std::string last_error;
    };

    void ReconcileSource(const ingress::SourceViewApplicationService::SourceRecord& source);
    media::IngressRequest BuildRequest(
        const ingress::SourceViewApplicationService::SourceRecord& source) const;
    void SafetyLoop();

    core::RecordingRuntimeConfigData config_;
    ingress::SourceViewApplicationService& sources_;
    RecordingSessionService& sessions_;
    RetentionCoordinator& retention_;
    std::mutex reconcile_mu_;
    std::mutex wait_mu_;
    std::condition_variable wait_cv_;
    bool running_{false};
    bool stop_requested_{false};
    std::thread safety_thread_;
    std::unordered_map<std::string, RuntimeState> runtime_;
};

}  // namespace recording
