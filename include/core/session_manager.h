// 파일 용도: 요청을 SharedStream과 SourceWorker에 연결하고 세션 생명주기를 관리하는 SessionManager를 선언한다.
#pragma once

#include "core/resource_guard.h"
#include "core/source_factory.h"
#include "core/stream_registry.h"
#include "ingress/request_parser.h"
#include "media_types.h"
#include "stdafx.h"

namespace core {

class SessionManager {
public:
    struct CreateResult {
        bool ok{false};
        std::string message;
        StreamKey stream_key;
        std::shared_ptr<SharedStream> stream;
        bool stream_created{false};
    };

    SessionManager(StreamRegistry& registry, ResourceGuard& resource_guard);
    ~SessionManager() = default;

    CreateResult CreateSession(const media::IngressRequest& request, SharedStream::SubscriberCallback callback);
    bool CloseSession(const std::string& session_id);
    std::size_t ActiveSessionCount() const;

private:
    struct SessionEntry {
        StreamKey stream_key;
        std::shared_ptr<SharedStream> stream;
    };

    void ScheduleIdleCleanup(StreamKey stream_key) const;

    StreamRegistry& registry_;
    ResourceGuard& resource_guard_;
    mutable std::mutex mu_;
    std::unordered_map<std::string, SessionEntry> sessions_;
};

}  // namespace core
