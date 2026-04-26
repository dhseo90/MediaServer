// 파일 요약: 빌드 옵션 차이를 숨기는 RTSP adapter factory를 선언한다.
// 동작 요약: GStreamer 사용 빌드와 stub 빌드가 같은 생성 API를 공유한다.
// 동작 요약: main이 조건부 컴파일 세부사항에 덜 의존하게 한다.
#pragma once

#include "core/session_manager.h"
#include "media_types.h"
#include "stdafx.h"

namespace ingress {

class RtspAdapter {
public:
    explicit RtspAdapter(core::SessionManager& session_manager);

    bool HandlePlay(const media::IngressRequest& request, std::string* error_message);
    bool HandleTeardown(const std::string& session_id, std::string* error_message);

private:
    core::SessionManager& session_manager_;
};

}  // namespace ingress

