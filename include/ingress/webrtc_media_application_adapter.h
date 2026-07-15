#pragma once

#include <memory>

#include "ingress/webrtc_media_application_service.h"

namespace core {
class SessionManager;
}

namespace ingress {

std::unique_ptr<WebRtcMediaApplicationService>
MakeWebRtcMediaApplicationAdapter(core::SessionManager& session_manager);

}  // namespace ingress
