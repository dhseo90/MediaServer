// 파일 용도: 원본 소스를 읽어 SharedStream으로 패킷을 공급하는 SourceWorker 인터페이스를 선언한다.
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
