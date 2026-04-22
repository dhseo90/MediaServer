// 파일 용도: 동시 세션/스트림 수 제한을 관리하는 ResourceGuard를 선언한다.
#pragma once

#include "stdafx.h"

namespace core {

class ResourceGuard {
public:
    ResourceGuard(std::size_t max_sessions, std::size_t max_streams);

    bool AdmitSession();
    void ReleaseSession();

    bool AdmitStream();
    void ReleaseStream();

    std::size_t ActiveSessions() const;
    std::size_t ActiveStreams() const;

private:
    const std::size_t max_sessions_;
    const std::size_t max_streams_;
    std::atomic<std::size_t> active_sessions_{0};
    std::atomic<std::size_t> active_streams_{0};
};

}  // namespace core

