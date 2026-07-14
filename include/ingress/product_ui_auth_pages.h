// 파일 용도: 인증/접근 요청 route HTML renderer 공개 API를 선언한다.
#pragma once

#include <string>

#include "ingress/product_ui_principal_view.h"

namespace ingress {

std::string LoginPageHtml(const std::string& message, bool failed);
std::string SetupPageHtml(const std::string& message, bool failed);
std::string InviteSetupPageHtml(const std::string& token,
                                const std::string& message,
                                bool failed);
std::string ClientAccessRequestPageHtml();
std::string PasswordChangePageHtml(const ProductUiPrincipalView& principal,
                                   const std::string& message,
                                   bool failed);
std::string AuthLandingPageHtml(const ProductUiPrincipalView& principal,
                                const std::string& title,
                                const std::string& body);

}  // namespace ingress
