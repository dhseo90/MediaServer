// 파일 요약: HTTP token auth MVP의 principal 생성과 guard helper를 구현한다.
// 동작 요약: auth off는 dev admin principal, token mode는 role별 env token principal을 반환한다.
#include "ingress/http_auth.h"

#include <algorithm>
#include <cctype>
#include <optional>

namespace ingress::auth {

namespace {

std::string Trim(std::string value) {
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.front())) != 0) {
        value.erase(value.begin());
    }
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.back())) != 0) {
        value.pop_back();
    }
    return value;
}

std::string ToLower(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return value;
}

bool StartsWithCaseInsensitive(const std::string& value, const std::string& prefix) {
    if (value.size() < prefix.size()) {
        return false;
    }
    return ToLower(value.substr(0, prefix.size())) == ToLower(prefix);
}

std::optional<std::string> HeaderValue(const HeaderMap& headers, const std::string& key) {
    const std::string wanted = ToLower(key);
    for (const auto& [header_key, value] : headers) {
        if (ToLower(header_key) == wanted) {
            return value;
        }
    }
    return std::nullopt;
}

std::optional<std::string> ExtractRequestToken(const HeaderMap& headers, const QueryMap& query) {
    if (const auto authorization = HeaderValue(headers, "Authorization"); authorization.has_value()) {
        const std::string value = Trim(*authorization);
        constexpr const char* kBearerPrefix = "Bearer ";
        if (StartsWithCaseInsensitive(value, kBearerPrefix)) {
            const std::string token = Trim(value.substr(std::string(kBearerPrefix).size()));
            if (!token.empty()) {
                return token;
            }
        }
    }

    if (const auto it = query.find("token"); it != query.end()) {
        const std::string token = Trim(it->second);
        if (!token.empty()) {
            return token;
        }
    }
    return std::nullopt;
}

std::vector<std::string> AdminScopes() {
    return {
        "view:read:*",
        "source:read:*",
        "rule:read:*",
        "event:read:*",
        "metadata:read:*",
        "dashboard:read:*",
        "debug:read",
        "rule:write",
        "source:write",
        "ops:read",
        "lab:read",
    };
}

std::vector<std::string> OperatorScopes() {
    return {
        "view:read:*",
        "source:read:*",
        "rule:read:*",
        "event:read:*",
        "metadata:read:*",
        "dashboard:read:*",
        "debug:read",
        "rule:write",
        "source:write",
        "ops:read",
        "lab:read",
    };
}

std::vector<std::string> ViewerScopes() {
    return {
        "view:read:*",
        "event:read:*",
        "metadata:read:*",
        "dashboard:read:*",
    };
}

std::vector<std::string> IntegratorScopes() {
    return {
        "event:read:*",
        "metadata:read:*",
    };
}

Principal MakePrincipal(std::string role,
                        std::vector<std::string> scopes,
                        std::string display_name,
                        app::AuthMode auth_mode) {
    return Principal{
        .role = std::move(role),
        .scopes = std::move(scopes),
        .display_name = std::move(display_name),
        .auth_mode = AuthModeName(auth_mode),
        .is_authenticated = true,
    };
}

AuthResult Authenticated(Principal principal) {
    return AuthResult{.ok = true, .principal = std::move(principal), .error = ""};
}

AuthResult Unauthorized(std::string error) {
    return AuthResult{.ok = false, .principal = Principal{}, .error = std::move(error)};
}

bool TokenMatches(const std::optional<std::string>& request_token, const std::string& configured_token) {
    return request_token.has_value() && !configured_token.empty() && *request_token == configured_token;
}

bool ScopeMatches(const std::string& granted, const std::string& requested) {
    if (granted == requested) {
        return true;
    }
    constexpr const char* kWildcardSuffix = ":*";
    if (granted.size() <= std::string(kWildcardSuffix).size()) {
        return false;
    }
    if (granted.compare(granted.size() - std::string(kWildcardSuffix).size(),
                        std::string(kWildcardSuffix).size(),
                        kWildcardSuffix) != 0) {
        return false;
    }
    const std::string prefix = granted.substr(0, granted.size() - 1);
    return requested.compare(0, prefix.size(), prefix) == 0;
}

}  // namespace

const char* AuthModeName(app::AuthMode mode) {
    switch (mode) {
        case app::AuthMode::Off:
            return "off";
        case app::AuthMode::Token:
            return "token";
    }
    return "off";
}

AuthResult BuildPrincipalFromRequest(const app::AppConfig& config,
                                     const HeaderMap& headers,
                                     const QueryMap& query) {
    if (config.auth_mode == app::AuthMode::Off) {
        return Authenticated(MakePrincipal("admin", AdminScopes(), "Development Admin", config.auth_mode));
    }

    const std::optional<std::string> token = ExtractRequestToken(headers, query);
    if (!token.has_value()) {
        return Unauthorized("authentication token is required");
    }
    if (TokenMatches(token, config.auth_admin_token)) {
        return Authenticated(MakePrincipal("admin", AdminScopes(), "Admin Token", config.auth_mode));
    }
    if (TokenMatches(token, config.auth_operator_token)) {
        return Authenticated(MakePrincipal("operator", OperatorScopes(), "Operator Token", config.auth_mode));
    }
    if (TokenMatches(token, config.auth_viewer_token)) {
        return Authenticated(MakePrincipal("viewer", ViewerScopes(), "Viewer Token", config.auth_mode));
    }
    if (TokenMatches(token, config.auth_integrator_token)) {
        return Authenticated(MakePrincipal("integrator", IntegratorScopes(), "Integrator Token", config.auth_mode));
    }
    return Unauthorized("invalid authentication token");
}

bool IsAdmin(const Principal& principal) {
    return principal.is_authenticated && principal.role == "admin";
}

bool IsOperator(const Principal& principal) {
    return principal.is_authenticated && principal.role == "operator";
}

bool IsViewer(const Principal& principal) {
    return principal.is_authenticated && principal.role == "viewer";
}

bool IsIntegrator(const Principal& principal) {
    return principal.is_authenticated && principal.role == "integrator";
}

bool RequireRole(const Principal& principal, const std::string& role) {
    return IsAdmin(principal) || (principal.is_authenticated && principal.role == role);
}

bool RequireRole(const Principal& principal, std::initializer_list<std::string> roles) {
    if (IsAdmin(principal)) {
        return true;
    }
    return std::any_of(roles.begin(), roles.end(), [&](const std::string& role) {
        return principal.is_authenticated && principal.role == role;
    });
}

bool RequireScope(const Principal& principal, const std::string& scope) {
    if (IsAdmin(principal)) {
        return true;
    }
    return principal.is_authenticated &&
           std::any_of(principal.scopes.begin(), principal.scopes.end(), [&](const std::string& granted) {
               return ScopeMatches(granted, scope);
           });
}

}  // namespace ingress::auth
