// 파일 요약: 내장 HTTP/WebRTC API 서버를 선언한다.
// 동작 요약: simple signaling, WHEP, WHIP, 제품 UI, analysis API를 한 서버에서 제공한다.
// 동작 요약: SessionManager와 WebRtcSourceRegistry를 HTTP handler로 연결한다.
#pragma once

#include <atomic>
#include <cstdint>
#include <memory>
#include <string>

#include "ingress/analysis_session_lifecycle_application_service.h"
#include "ingress/analysis_session_read_application_service.h"
#include "ingress/webrtc_media_application_service.h"
#include "ingress/webrtc_http_runtime_config.h"

namespace ingress {

class WebRtcHttpServer {
public:
    WebRtcHttpServer(WebRtcMediaApplicationService& media_sessions,
                     AnalysisSessionLifecycleApplicationService& analysis_session_lifecycle,
                     AnalysisSessionReadApplicationService& analysis_session_reads,
                     const WebRtcHttpRuntimeConfig& runtime_config);
    ~WebRtcHttpServer();

    bool Start(const std::string& listen_address, std::uint16_t port, std::string* error_message);
    void Stop();
    bool IsRunning() const;

private:
    struct Impl;

    WebRtcMediaApplicationService& media_sessions_;
    AnalysisSessionLifecycleApplicationService& analysis_session_lifecycle_;
    AnalysisSessionReadApplicationService& analysis_session_reads_;
    WebRtcHttpRuntimeConfig runtime_config_;
    std::atomic<bool> running_{false};
    std::unique_ptr<Impl> impl_;
};

}  // namespace ingress
