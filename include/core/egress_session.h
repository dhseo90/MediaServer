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
