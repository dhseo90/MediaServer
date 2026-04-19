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

