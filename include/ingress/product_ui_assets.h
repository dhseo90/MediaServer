#pragma once

#include <iosfwd>
#include <string>

namespace ingress {

std::string ProductThemeBootScript();
std::string ProductSharedUiScript();
std::string ProductThemeToggleButtonHtml();
void AppendProductThemeScript(std::ostringstream& out);
std::string ProductNavIconSvg(const std::string& key);
std::string ProductAccountAvatarSvg();

}  // namespace ingress
