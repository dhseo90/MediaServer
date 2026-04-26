// 파일 요약: 원본 source를 읽어 SharedStream에 packet을 공급하는 worker 인터페이스를 선언한다.
// 동작 요약: File/RTSP/WebRTC/URI/YouTube worker가 같은 start/stop 계약을 구현한다.
// 동작 요약: SessionManager가 source 종류와 무관하게 worker를 제어하게 한다.
#pragma once

#include <memory>

#include "media_types.h"

namespace core {

class SharedStream;

class SourceWorker {
public:
    virtual ~SourceWorker() = default;

    virtual const media::SourceSpec& source_spec() const = 0;
    virtual bool Start(const std::shared_ptr<SharedStream>& stream, std::string* error_message) = 0;
    virtual bool IsRunning() const = 0;
    virtual void Stop() = 0;
};

}  // namespace core
