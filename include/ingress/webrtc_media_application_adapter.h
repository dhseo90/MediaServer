#pragma once
// 파일 용도: WebRTC media runtime을 application port에 연결하는 adapter를 선언한다.
#include <memory>

#include "ingress/webrtc_media_application_service.h"

namespace core {
class SessionManager;
}

namespace ingress {

std::unique_ptr<WebRtcMediaApplicationService>
MakeWebRtcMediaApplicationAdapter(core::SessionManager& session_manager);

}  // namespace ingress
