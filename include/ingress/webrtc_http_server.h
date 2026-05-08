// 파일 요약: 내장 HTTP/WebRTC API 서버를 선언한다.
// 동작 요약: simple signaling, WHEP, WHIP, 제품 UI, analysis API를 한 서버에서 제공한다.
// 동작 요약: SessionManager와 WebRtcSourceRegistry를 HTTP handler로 연결한다.
#pragma once

#include <atomic>
#include <cstdint>
#include <memory>
#include <string>

#include "core/session_manager.h"

namespace ingress {

class WebRtcHttpServer {
public:
    explicit WebRtcHttpServer(core::SessionManager& session_manager);
    ~WebRtcHttpServer();

    bool Start(const std::string& listen_address, std::uint16_t port, std::string* error_message);
    void Stop();
    bool IsRunning() const;

private:
    struct Impl;

    core::SessionManager& session_manager_;
    std::atomic<bool> running_{false};
    std::unique_ptr<Impl> impl_;
};

}  // namespace ingress
