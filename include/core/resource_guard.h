// 파일 요약: 동시 세션/stream admission guard를 선언한다.
// 동작 요약: tryAcquire/release와 현재 카운터 snapshot으로 resource limit을 적용한다.
// 동작 요약: 과도한 요청을 일관된 방식으로 거부하기 위한 공통 도구다.
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

