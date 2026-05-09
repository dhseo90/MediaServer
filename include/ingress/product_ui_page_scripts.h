// 파일 용도: 운영자/클라이언트 각 페이지에 삽입되는 화면별 JavaScript 생성 함수를 선언한다.
#pragma once

#include <iosfwd>
#include <string>

namespace ingress {

void AppendClientAccessRequestScript(std::ostringstream& out);
void AppendClientShellScript(std::ostringstream& out);
void AppendOpsShellScript(std::ostringstream& out,
                          const std::string& active,
                          const std::string& stream_route,
                          int rtsp_port);
void AppendOpsSourcesPageScript(std::ostringstream& out, const std::string& stream_route_json, int rtsp_port);
void AppendOpsUsersPageScript(std::ostringstream& out);

}  // namespace ingress
