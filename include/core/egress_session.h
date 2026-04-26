// 파일 요약: RTSP/WebRTC 송출 세션의 공통 인터페이스를 선언한다.
// 동작 요약: start/stop/id 같은 lifecycle API로 SessionManager가 egress 구현을 다룬다.
// 동작 요약: 구체적인 프로토콜별 세션은 이 인터페이스 뒤에 숨는다.
#pragma once

#include <memory>

namespace core {

class SharedStream;

class EgressSession {
public:
    virtual ~EgressSession() = default;

    virtual bool Start(const std::string& session_id,
                       const std::shared_ptr<SharedStream>& stream,
                       std::string* error_message) = 0;
    virtual void Stop() = 0;
};

}  // namespace core
