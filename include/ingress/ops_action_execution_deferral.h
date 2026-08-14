#pragma once

// 파일 요약: Action execution deferral GET route의 transport-neutral 응답 계약이다.
// 동작 요약: HTTP auth/소켓 타입을 소유하지 않고 exact path/method를 read-only JSON 응답으로 변환한다.

#include <optional>
#include <string>

namespace ingress::ops_actions {

struct ActionExecutionDeferralDecisionResponse {
    int status{200};
    std::string reason{"OK"};
    std::string body;
    std::string cache_control{"no-store"};
};

std::optional<ActionExecutionDeferralDecisionResponse>
TryHandleActionExecutionDeferralDecision(const std::string& method,
                                         const std::string& path);

}  // namespace ingress::ops_actions
