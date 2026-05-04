#pragma once

#include <iosfwd>
#include <string>

namespace ingress {

std::string ProductThemeBootScript();
std::string ProductSharedUiScript();
void AppendProductThemeScript(std::ostringstream& out);

}  // namespace ingress
