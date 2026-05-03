// 파일 요약: HTTP token auth MVP의 principal, role, scope helper를 선언한다.
// 동작 요약: Bearer/query token을 Principal로 변환하고 guard helper가 role/scope를 판정한다.
#pragma once

#include <initializer_list>
#include <string>
#include <unordered_map>
#include <vector>

#include "app_config.h"

namespace ingress::auth {

struct Principal {
    std::string role;
    std::vector<std::string> scopes;
    std::string display_name;
    std::string auth_mode;
    bool is_authenticated{false};
};

struct AuthResult {
    bool ok{false};
    Principal principal;
    std::string error;
};

using HeaderMap = std::unordered_map<std::string, std::string>;
using QueryMap = std::unordered_map<std::string, std::string>;

const char* AuthModeName(app::AuthMode mode);

AuthResult BuildPrincipalFromRequest(const app::AppConfig& config,
                                     const HeaderMap& headers,
                                     const QueryMap& query);

bool IsAdmin(const Principal& principal);
bool IsOperator(const Principal& principal);
bool IsViewer(const Principal& principal);
bool IsIntegrator(const Principal& principal);
bool RequireRole(const Principal& principal, const std::string& role);
bool RequireRole(const Principal& principal, std::initializer_list<std::string> roles);
bool RequireScope(const Principal& principal, const std::string& scope);

}  // namespace ingress::auth
