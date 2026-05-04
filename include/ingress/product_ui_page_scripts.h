#pragma once

#include <iosfwd>
#include <string>

namespace ingress {

void AppendClientAccessRequestScript(std::ostringstream& out);
void AppendClientShellScript(std::ostringstream& out);
void AppendOpsSourcesPageScript(std::ostringstream& out, const std::string& stream_route_json, int rtsp_port);
void AppendOpsUsersPageScript(std::ostringstream& out);

}  // namespace ingress
