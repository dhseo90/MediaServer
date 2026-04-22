// 파일 용도: RTSP/WebRTC 등 클라이언트 송출 세션이 구현해야 하는 공통 인터페이스를 선언한다.
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
