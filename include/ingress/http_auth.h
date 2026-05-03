// 파일 요약: HTTP auth MVP의 principal, role, scope, account helper를 선언한다.
// 동작 요약: Bearer/query token과 account password hash를 Principal로 변환하고 guard helper가 role/scope를 판정한다.
#pragma once

#include <initializer_list>
#include <optional>
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

struct UserRecord {
    std::string username;
    std::string display_name;
    std::string role;
    std::vector<std::string> scopes;
    std::string password_hash;
    std::string token_hash;
    bool enabled{true};
};

using HeaderMap = std::unordered_map<std::string, std::string>;
using QueryMap = std::unordered_map<std::string, std::string>;

const char* AuthModeName(app::AuthMode mode);
std::vector<std::string> DefaultScopesForRole(const std::string& role);
Principal MakePrincipalForRole(const std::string& role,
                               const std::vector<std::string>& scopes,
                               const std::string& display_name,
                               app::AuthMode auth_mode);

AuthResult BuildPrincipalFromRequest(const app::AppConfig& config,
                                     const HeaderMap& headers,
                                     const QueryMap& query);
AuthResult AuthenticateUserPassword(const app::AppConfig& config,
                                    const std::string& username,
                                    const std::string& password);

bool PasswordHashingAvailable();
const char* PasswordHashingScheme();
std::optional<std::string> GeneratePasswordHash(const std::string& password,
                                                std::string* error_message);
std::optional<std::string> GenerateSessionId(std::string* error_message);
std::optional<std::string> ExtractSessionCookie(const HeaderMap& headers,
                                                const std::string& cookie_name);

bool IsAdmin(const Principal& principal);
bool IsOperator(const Principal& principal);
bool IsViewer(const Principal& principal);
bool IsIntegrator(const Principal& principal);
bool RequireRole(const Principal& principal, const std::string& role);
bool RequireRole(const Principal& principal, std::initializer_list<std::string> roles);
bool RequireScope(const Principal& principal, const std::string& scope);

}  // namespace ingress::auth
