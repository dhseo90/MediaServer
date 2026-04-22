// 파일 용도: GStreamer RTSP server 어댑터와 SessionManager 연결 지점을 선언한다.
#pragma once

#include <cstdint>

#include "core/session_manager.h"
#include "stdafx.h"

namespace ingress {

class GStreamerRtspServer {
public:
    explicit GStreamerRtspServer(core::SessionManager& session_manager);
    ~GStreamerRtspServer();

    bool Start(uint16_t port, std::string* error_message);
    void Stop();
    bool IsRunning() const;

private:
    core::SessionManager& session_manager_;
    std::atomic<bool> running_{false};

#if MEDIA_SERVER_USE_GSTREAMER
    struct Impl;
    std::unique_ptr<Impl> impl_;
#endif
};

}  // namespace ingress

