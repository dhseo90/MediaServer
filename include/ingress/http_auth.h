// 파일 요약: HTTP auth principal, role, scope, account helper를 선언한다.
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
    std::string username;
    std::string role;
    std::vector<std::string> scopes;
    std::string display_name;
    std::string auth_mode;
    bool is_authenticated{false};
    bool password_change_required{false};
};

struct AuthResult {
    bool ok{false};
    Principal principal;
    std::string error;
};

struct AuthUserResult {
    int status{500};
    std::string status_text{"Internal Server Error"};
    std::string body;
    std::string username;
};

struct UserRecord {
    std::string username;
    std::string display_name;
    std::string role;
    std::vector<std::string> scopes;
    std::string password_hash;
    std::vector<std::string> password_history;
    std::string token_hash;
    bool enabled{true};
    bool must_change_password{false};
    int failed_login_count{0};
    std::string locked_until;
    std::string last_failed_login_at;
    std::string created_at;
    std::string password_updated_at;
    std::string last_login_at;
    std::string last_login_ip;
    std::string disabled_at;
};

struct PasswordPolicyResult {
    bool ok{false};
    std::vector<std::string> errors;
    std::string message;
};

struct UserMutation {
    std::string username;
    std::string display_name;
    std::string role;
    std::string view_id;
    std::vector<std::string> scopes;
    std::string password;
    bool has_password{false};
    bool enabled{true};
    bool has_enabled{false};
    bool must_change_password{true};
    bool has_must_change_password{false};
};

struct BootstrapState {
    bool setup_required{false};
    bool users_file_exists{false};
    bool users_empty{true};
    bool admin_exists{false};
    bool admin_enabled{false};
    bool admin_has_password{false};
    bool password_change_required{false};
    std::string reason;
};

using HeaderMap = std::unordered_map<std::string, std::string>;
using QueryMap = std::unordered_map<std::string, std::string>;

const char* AuthModeName(app::AuthMode mode);
std::vector<std::string> DefaultScopesForRole(const std::string& role);
Principal MakePrincipalForRole(const std::string& role,
                               const std::vector<std::string>& scopes,
                               const std::string& display_name,
                               app::AuthMode auth_mode,
                               const std::string& username = "",
                               bool password_change_required = false);

AuthResult BuildPrincipalFromRequest(const app::AppConfig& config,
                                     const HeaderMap& headers,
                                     const QueryMap& query);
AuthResult RefreshPrincipalFromUser(const app::AppConfig& config,
                                    const Principal& principal);
AuthResult AuthenticateUserPassword(const app::AppConfig& config,
                                    const std::string& username,
                                    const std::string& password,
                                    const std::string& remote_ip = "");

PasswordPolicyResult ValidatePasswordPolicy(const app::AppConfig& config,
                                            const std::string& username,
                                            const std::string& password,
                                            const std::string& confirm,
                                            const UserRecord* existing_user);
bool ChangeUserPassword(const app::AppConfig& config,
                        const std::string& username,
                        const std::string& current_password,
                        const std::string& new_password,
                        const std::string& confirm,
                        bool require_current_password,
                        std::string* error_message);
std::vector<std::string> ScopeTemplateForRole(const std::string& role,
                                              const std::string& view_id);
AuthUserResult ListAuthUsers(const app::AppConfig& config);
AuthUserResult CreateAuthUser(const app::AppConfig& config,
                              const UserMutation& mutation);
AuthUserResult UpdateAuthUser(const app::AppConfig& config,
                              const std::string& username,
                              const UserMutation& mutation);
AuthUserResult ResetAuthUserPassword(const app::AppConfig& config,
                                     const std::string& username,
                                     const std::string& password);
AuthUserResult SetAuthUserEnabled(const app::AppConfig& config,
                                  const std::string& username,
                                  bool enabled);
AuthUserResult CreateAuthUserFromJson(const app::AppConfig& config,
                                      const std::string& body);
AuthUserResult UpdateAuthUserFromJson(const app::AppConfig& config,
                                      const std::string& username,
                                      const std::string& body);
AuthUserResult ResetAuthUserPasswordFromJson(const app::AppConfig& config,
                                             const std::string& username,
                                             const std::string& body);
AuthUserResult CreateInviteFromJson(const app::AppConfig& config,
                                    const std::string& body);
AuthUserResult ListInvites(const app::AppConfig& config);
AuthUserResult CompleteInvitePasswordSetup(const app::AppConfig& config,
                                           const std::string& token,
                                           const std::string& password,
                                           const std::string& confirm);
AuthUserResult ListAccessRequests(const app::AppConfig& config);
AuthUserResult CreateAccessRequestFromJson(const app::AppConfig& config,
                                           const std::string& body);
AuthUserResult ApproveAccessRequestFromJson(const app::AppConfig& config,
                                            const std::string& request_id,
                                            const std::string& body);
AuthUserResult RejectAccessRequest(const app::AppConfig& config,
                                   const std::string& request_id);

bool PasswordHashingAvailable();
const char* PasswordHashingScheme();
std::optional<std::string> GeneratePasswordHash(const std::string& password,
                                                std::string* error_message);
BootstrapState InspectBootstrapState(const app::AppConfig& config);
bool SaveBootstrapAdmin(const app::AppConfig& config,
                        const std::string& password,
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
