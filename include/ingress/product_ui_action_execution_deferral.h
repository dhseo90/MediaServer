// 파일 용도: Action Execution Deferral dashboard HTML과 renderer script fragment를 선언한다.
// 동작 요약: transport/auth/write owner 없이 기존 DOM/test-ID와 read-only refresh script를 byte-exact 제공한다.
#pragma once

#include <iosfwd>
#include <string>

namespace ingress {

std::string OpsActionExecutionDeferralWorkspaceHtml();
void AppendOpsActionExecutionDeferralWorkspaceScript(std::ostringstream& out);

}  // namespace ingress
