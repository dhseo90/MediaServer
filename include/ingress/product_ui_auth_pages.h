// 파일 용도: 인증/접근 요청 route HTML renderer 공개 API를 선언한다.
#pragma once

#include <string>

namespace ingress {

namespace auth {
struct Principal;
}  // namespace auth

std::string LoginPageHtml(const std::string& message, bool failed);
std::string SetupPageHtml(const std::string& message, bool failed);
std::string InviteSetupPageHtml(const std::string& token,
                                const std::string& message,
                                bool failed);
std::string ClientAccessRequestPageHtml();
std::string PasswordChangePageHtml(const auth::Principal& principal,
                                   const std::string& message,
                                   bool failed);
std::string AuthLandingPageHtml(const auth::Principal& principal,
                                const std::string& title,
                                const std::string& body);

}  // namespace ingress
