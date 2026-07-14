// 파일 용도: Ops shell/dashboard/rules/events/home/VLM 제품 HTML renderer 공개 API를 선언한다.
#pragma once

#include <iosfwd>
#include <string>

namespace ingress {

namespace auth {
struct Principal;
}  // namespace auth

void AppendOpsShellStart(std::ostringstream& out,
                         const auth::Principal& principal,
                         const std::string& active,
                         const std::string& subtitle);
void AppendOpsShellEnd(std::ostringstream& out);
std::string OpsShellPageHtml(const std::string& stream_route,
                             int rtsp_listen_port,
                             const auth::Principal& principal,
                             const std::string& active);

}  // namespace ingress
