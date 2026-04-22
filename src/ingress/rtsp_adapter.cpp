// 파일 용도: 빌드 옵션에 따라 실제 GStreamer RTSP server 또는 stub 어댑터를 생성한다.
#include "ingress/rtsp_adapter.h"

namespace ingress {

RtspAdapter::RtspAdapter(core::SessionManager& session_manager) : session_manager_(session_manager) {}

bool RtspAdapter::HandlePlay(const media::IngressRequest& request, std::string* error_message) {
    auto result = session_manager_.CreateSession(request, [](const media::Packet&) {});
    if (!result.ok) {
        if (error_message != nullptr) {
            *error_message = result.message;
        }
        return false;
    }
    return true;
}

bool RtspAdapter::HandleTeardown(const std::string& session_id, std::string* error_message) {
    if (!session_manager_.CloseSession(session_id)) {
        if (error_message != nullptr) {
            *error_message = "unknown session";
        }
        return false;
    }
    return true;
}

}  // namespace ingress

