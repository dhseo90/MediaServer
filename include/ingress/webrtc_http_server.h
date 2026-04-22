// 파일 용도: WebRTC signaling, WHEP, WHIP HTTP endpoint 서버를 선언한다.
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
