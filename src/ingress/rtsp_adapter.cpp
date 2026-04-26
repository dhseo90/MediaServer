// 파일 요약: 빌드 옵션에 맞는 RTSP server adapter 생성 지점이다.
// 동작 요약: GStreamer가 켜진 빌드는 실제 RTSP server를 만들고, 꺼진 빌드는 stub을 반환한다.
// 동작 요약: 상위 main 코드는 빌드 옵션 차이를 의식하지 않고 같은 factory를 호출한다.
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

