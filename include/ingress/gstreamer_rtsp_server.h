// 파일 요약: GStreamer RTSP server adapter를 선언한다.
// 동작 요약: start/stop과 listen port 조회 API로 main에서 RTSP server를 제어한다.
// 동작 요약: media-configure 시 SessionManager로 요청을 연결하는 구현 뒤의 인터페이스다.
#pragma once

#include <cstdint>

#include "core/media_analysis_port.h"
#include "core/session_manager.h"
#include "stdafx.h"

namespace ingress {

class GStreamerRtspServer {
public:
    GStreamerRtspServer(core::SessionManager& session_manager, core::MediaAnalysisPort& analysis_port);
    ~GStreamerRtspServer();

    bool Start(uint16_t port, std::string* error_message);
    void Stop();
    bool IsRunning() const;

private:
    core::SessionManager& session_manager_;
    core::MediaAnalysisPort& analysis_port_;
    std::atomic<bool> running_{false};

#if MEDIA_SERVER_USE_GSTREAMER
    struct Impl;
    std::unique_ptr<Impl> impl_;
#endif
};

}  // namespace ingress
