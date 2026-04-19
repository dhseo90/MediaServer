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
