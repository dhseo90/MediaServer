// 파일 요약: HTTP auth MVP의 principal 생성, account password 검증, guard helper를 구현한다.
// 동작 요약: auth off는 dev admin principal, token/session mode는 env token 또는 users file account를 사용한다.
#include "ingress/http_auth.h"

#include <algorithm>
#include <array>
#include <chrono>
#include <cctype>
#include <ctime>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <optional>
#include <sstream>
#include <utility>

#ifndef MEDIA_SERVER_USE_LIBSODIUM
#define MEDIA_SERVER_USE_LIBSODIUM 0
#endif

#if MEDIA_SERVER_USE_LIBSODIUM
#include <sodium.h>
#endif

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

std::optional<std::string> ParseStringField(const std::string& body, const std::string& field) {
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(':', pos + needle.size());
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find('"', pos);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    ++pos;
    std::string out;
    bool escaped = false;
    for (; pos < body.size(); ++pos) {
        const char ch = body[pos];
        if (escaped) {
            switch (ch) {
                case 'n':
                    out.push_back('\n');
                    break;
                case 'r':
                    out.push_back('\r');
                    break;
                case 't':
                    out.push_back('\t');
                    break;
                default:
                    out.push_back(ch);
                    break;
            }
            escaped = false;
            continue;
        }
        if (ch == '\\') {
            escaped = true;
            continue;
        }
        if (ch == '"') {
            return out;
        }
        out.push_back(ch);
    }
    return std::nullopt;
}

std::optional<std::string> ExtractArrayField(const std::string& body, const std::string& field) {
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(':', pos + needle.size());
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find('[', pos);
    if (pos == std::string::npos) {
        return std::nullopt;
    }

    bool in_string = false;
    bool escaped = false;
    int depth = 0;
    const std::size_t start = pos;
    for (; pos < body.size(); ++pos) {
        const char ch = body[pos];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch == '\\' && in_string) {
            escaped = true;
            continue;
        }
        if (ch == '"') {
            in_string = !in_string;
            continue;
        }
        if (in_string) {
            continue;
        }
        if (ch == '[') {
            ++depth;
        } else if (ch == ']') {
            --depth;
            if (depth == 0) {
                return body.substr(start, pos - start + 1);
            }
        }
    }
    return std::nullopt;
}

std::vector<std::string> ParseStringArray(const std::string& array_body) {
    std::vector<std::string> values;
    bool in_string = false;
    bool escaped = false;
    std::string current;
    for (std::size_t pos = 1; pos + 1 < array_body.size(); ++pos) {
        const char ch = array_body[pos];
        if (!in_string) {
            if (ch == '"') {
                in_string = true;
                current.clear();
            }
            continue;
        }
        if (escaped) {
            current.push_back(ch);
            escaped = false;
            continue;
        }
        if (ch == '\\') {
            escaped = true;
            continue;
        }
        if (ch == '"') {
            current = Trim(current);
            if (!current.empty()) {
                values.push_back(current);
            }
            in_string = false;
            continue;
        }
        current.push_back(ch);
    }
    return values;
}

std::optional<bool> ParseBoolField(const std::string& body, const std::string& field) {
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    pos = body.find(':', pos + needle.size());
    if (pos == std::string::npos) {
        return std::nullopt;
    }
    ++pos;
    while (pos < body.size() && std::isspace(static_cast<unsigned char>(body[pos])) != 0) {
        ++pos;
    }
    if (body.compare(pos, 4, "true") == 0) {
        return true;
    }
    if (body.compare(pos, 5, "false") == 0) {
        return false;
    }
    return std::nullopt;
}

std::vector<std::string> ExtractJsonObjectArray(const std::string& body, const std::string& field) {
    std::vector<std::string> objects;
    const std::string needle = "\"" + field + "\"";
    std::size_t pos = body.find(needle);
    if (pos == std::string::npos) {
        return objects;
    }
    pos = body.find('[', pos + needle.size());
    if (pos == std::string::npos) {
        return objects;
    }

    bool in_string = false;
    bool escaped = false;
    int object_depth = 0;
    std::size_t object_start = std::string::npos;
    for (; pos < body.size(); ++pos) {
        const char ch = body[pos];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch == '\\' && in_string) {
            escaped = true;
            continue;
        }
        if (ch == '"') {
            in_string = !in_string;
            continue;
        }
        if (in_string) {
            continue;
        }
        if (ch == '{') {
            if (object_depth == 0) {
                object_start = pos;
            }
            ++object_depth;
        } else if (ch == '}') {
            if (object_depth > 0) {
                --object_depth;
                if (object_depth == 0 && object_start != std::string::npos) {
                    objects.push_back(body.substr(object_start, pos - object_start + 1));
                    object_start = std::string::npos;
                }
            }
        } else if (ch == ']' && object_depth == 0) {
            break;
        }
    }
    return objects;
}

bool IsKnownRole(const std::string& role) {
    return role == "admin" || role == "operator" || role == "viewer" || role == "integrator";
}

std::optional<std::vector<UserRecord>> LoadUsers(const std::string& path, std::string* error_message) {
    std::ifstream in(path);
    if (!in) {
        if (error_message != nullptr) {
            *error_message = "auth users file not found: " + path;
        }
        return std::nullopt;
    }
    std::ostringstream buffer;
    buffer << in.rdbuf();
    const std::string content = buffer.str();
    std::vector<UserRecord> users;
    for (const std::string& raw : ExtractJsonObjectArray(content, "users")) {
        UserRecord user;
        user.username = Trim(ParseStringField(raw, "username").value_or(""));
        user.display_name = Trim(ParseStringField(raw, "displayName").value_or(user.username));
        user.role = ToLower(Trim(ParseStringField(raw, "role").value_or("viewer")));
        if (const auto scopes = ExtractArrayField(raw, "scopes"); scopes.has_value()) {
            user.scopes = ParseStringArray(*scopes);
        }
        if (user.scopes.empty()) {
            user.scopes = DefaultScopesForRole(user.role);
        }
        user.password_hash = Trim(ParseStringField(raw, "passwordHash").value_or(""));
        user.token_hash = Trim(ParseStringField(raw, "tokenHash").value_or(""));
        user.enabled = ParseBoolField(raw, "enabled").value_or(true);
        user.must_change_password = ParseBoolField(raw, "mustChangePassword").value_or(false);
        user.created_at = Trim(ParseStringField(raw, "createdAt").value_or(""));
        user.password_updated_at = Trim(ParseStringField(raw, "passwordUpdatedAt").value_or(""));
        if (user.username.empty() || !IsKnownRole(user.role)) {
            continue;
        }
        users.push_back(std::move(user));
    }
    return users;
}

std::string JsonEscapeLocal(const std::string& value) {
    std::string out;
    out.reserve(value.size() + 8);
    for (const char ch : value) {
        switch (ch) {
            case '\\':
                out += "\\\\";
                break;
            case '"':
                out += "\\\"";
                break;
            case '\n':
                out += "\\n";
                break;
            case '\r':
                out += "\\r";
                break;
            case '\t':
                out += "\\t";
                break;
            default:
                out.push_back(ch);
                break;
        }
    }
    return out;
}

std::string IsoUtcNow() {
    const auto now = std::chrono::system_clock::now();
    const std::time_t now_time = std::chrono::system_clock::to_time_t(now);
    std::tm tm{};
#if defined(_WIN32)
    gmtime_s(&tm, &now_time);
#else
    gmtime_r(&now_time, &tm);
#endif
    std::ostringstream out;
    out << std::put_time(&tm, "%Y-%m-%dT%H:%M:%SZ");
    return out.str();
}

void WriteStringArray(std::ostringstream& out, const std::vector<std::string>& values) {
    out << "[";
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i != 0) {
            out << ", ";
        }
        out << "\"" << JsonEscapeLocal(values[i]) << "\"";
    }
    out << "]";
}

bool SaveUsersFile(const std::string& path,
                   const std::vector<UserRecord>& users,
                   std::string* error_message) {
    if (path.empty()) {
        if (error_message != nullptr) {
            *error_message = "auth users file path is empty";
        }
        return false;
    }
    const std::filesystem::path file_path(path);
    std::error_code ec;
    const auto parent = file_path.parent_path();
    if (!parent.empty()) {
        std::filesystem::create_directories(parent, ec);
        if (ec) {
            if (error_message != nullptr) {
                *error_message = "failed to create auth users directory: " + ec.message();
            }
            return false;
        }
    }

    std::ostringstream body;
    body << "{\n  \"users\": [\n";
    for (std::size_t i = 0; i < users.size(); ++i) {
        const UserRecord& user = users[i];
        body << "    {\n"
             << "      \"username\": \"" << JsonEscapeLocal(user.username) << "\",\n"
             << "      \"displayName\": \"" << JsonEscapeLocal(user.display_name) << "\",\n"
             << "      \"role\": \"" << JsonEscapeLocal(user.role) << "\",\n"
             << "      \"scopes\": ";
        WriteStringArray(body, user.scopes);
        body << ",\n"
             << "      \"passwordHash\": \"" << JsonEscapeLocal(user.password_hash) << "\",\n";
        if (!user.token_hash.empty()) {
            body << "      \"tokenHash\": \"" << JsonEscapeLocal(user.token_hash) << "\",\n";
        }
        body << "      \"enabled\": " << (user.enabled ? "true" : "false") << ",\n"
             << "      \"mustChangePassword\": " << (user.must_change_password ? "true" : "false") << ",\n"
             << "      \"createdAt\": \"" << JsonEscapeLocal(user.created_at) << "\",\n"
             << "      \"passwordUpdatedAt\": \"" << JsonEscapeLocal(user.password_updated_at) << "\"\n"
             << "    }";
        if (i + 1 < users.size()) {
            body << ",";
        }
        body << "\n";
    }
    body << "  ]\n}\n";

    const std::filesystem::path tmp_path = file_path.string() + ".tmp";
    {
        std::ofstream out(tmp_path, std::ios::trunc);
        if (!out) {
            if (error_message != nullptr) {
                *error_message = "failed to open temporary auth users file";
            }
            return false;
        }
        out << body.str();
        if (!out) {
            if (error_message != nullptr) {
                *error_message = "failed to write auth users file";
            }
            return false;
        }
    }
    std::filesystem::rename(tmp_path, file_path, ec);
    if (ec) {
        std::filesystem::remove(tmp_path);
        if (error_message != nullptr) {
            *error_message = "failed to replace auth users file: " + ec.message();
        }
        return false;
    }
    return true;
}

#if MEDIA_SERVER_USE_LIBSODIUM
bool SodiumReady() {
    static const bool ready = sodium_init() >= 0;
    return ready;
}
#endif

bool VerifySecretHash(const std::string& secret, const std::string& hash, std::string* error_message) {
    if (hash.empty()) {
        if (error_message != nullptr) {
            *error_message = "stored auth hash is empty";
        }
        return false;
    }
#if MEDIA_SERVER_USE_LIBSODIUM
    if (!SodiumReady()) {
        if (error_message != nullptr) {
            *error_message = "libsodium initialization failed";
        }
        return false;
    }
    const int result = crypto_pwhash_str_verify(hash.c_str(), secret.c_str(), secret.size());
    return result == 0;
#else
    if (error_message != nullptr) {
        *error_message = "safe password hashing is unavailable; build with libsodium";
    }
    return false;
#endif
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

std::optional<Principal> PrincipalFromUserToken(const app::AppConfig& config,
                                                const std::string& token,
                                                std::string* error_message) {
    const auto users = LoadUsers(config.auth_users_file, error_message);
    if (!users.has_value()) {
        return std::nullopt;
    }
    for (const UserRecord& user : *users) {
        if (!user.enabled || user.token_hash.empty()) {
            continue;
        }
        if (VerifySecretHash(token, user.token_hash, nullptr)) {
            return MakePrincipalForRole(user.role, user.scopes, user.display_name, config.auth_mode);
        }
    }
    return std::nullopt;
}

bool ScopeMatches(const std::string& granted, const std::string& requested) {
    if (granted == "*") {
        return true;
    }
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
        case app::AuthMode::Auto:
            return "auto";
        case app::AuthMode::Off:
            return "off";
        case app::AuthMode::Token:
            return "token";
        case app::AuthMode::Session:
            return "session";
    }
    return "off";
}

std::vector<std::string> DefaultScopesForRole(const std::string& role) {
    if (role == "admin" || role == "operator") {
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
    if (role == "viewer") {
        return {
            "view:read:*",
            "event:read:*",
            "metadata:read:*",
            "dashboard:read:*",
        };
    }
    if (role == "integrator") {
        return {
            "event:read:*",
            "metadata:read:*",
        };
    }
    return {};
}

Principal MakePrincipalForRole(const std::string& role,
                               const std::vector<std::string>& scopes,
                               const std::string& display_name,
                               app::AuthMode auth_mode) {
    return Principal{
        .role = role,
        .scopes = scopes.empty() ? DefaultScopesForRole(role) : scopes,
        .display_name = display_name.empty() ? role : display_name,
        .auth_mode = AuthModeName(auth_mode),
        .is_authenticated = true,
    };
}

AuthResult BuildPrincipalFromRequest(const app::AppConfig& config,
                                     const HeaderMap& headers,
                                     const QueryMap& query) {
    if (config.auth_mode == app::AuthMode::Off) {
        return Authenticated(MakePrincipalForRole(
            "admin", DefaultScopesForRole("admin"), "Development Admin", config.auth_mode));
    }

    const std::optional<std::string> token = ExtractRequestToken(headers, query);
    if (!token.has_value()) {
        return Unauthorized(config.auth_mode == app::AuthMode::Session ||
                                    config.auth_mode == app::AuthMode::Auto
                                ? "authentication session is required"
                                : "authentication token is required");
    }
    if (TokenMatches(token, config.auth_admin_token)) {
        return Authenticated(MakePrincipalForRole(
            "admin", DefaultScopesForRole("admin"), "Admin Token", config.auth_mode));
    }
    if (TokenMatches(token, config.auth_operator_token)) {
        return Authenticated(MakePrincipalForRole(
            "operator", DefaultScopesForRole("operator"), "Operator Token", config.auth_mode));
    }
    if (TokenMatches(token, config.auth_viewer_token)) {
        return Authenticated(MakePrincipalForRole(
            "viewer", DefaultScopesForRole("viewer"), "Viewer Token", config.auth_mode));
    }
    if (TokenMatches(token, config.auth_integrator_token)) {
        return Authenticated(MakePrincipalForRole(
            "integrator", DefaultScopesForRole("integrator"), "Integrator Token", config.auth_mode));
    }
    if (const auto principal = PrincipalFromUserToken(config, *token, nullptr); principal.has_value()) {
        return Authenticated(*principal);
    }
    return Unauthorized("invalid authentication token");
}

AuthResult AuthenticateUserPassword(const app::AppConfig& config,
                                    const std::string& username,
                                    const std::string& password) {
    if (!PasswordHashingAvailable()) {
        return Unauthorized("safe password hashing is unavailable; build with libsodium");
    }

    std::string load_error;
    const auto users = LoadUsers(config.auth_users_file, &load_error);
    if (!users.has_value()) {
        return Unauthorized(load_error);
    }
    for (const UserRecord& user : *users) {
        if (!user.enabled || user.username != username) {
            continue;
        }
        if (user.password_hash.empty()) {
            return Unauthorized("user has no passwordHash");
        }
        std::string verify_error;
        if (!VerifySecretHash(password, user.password_hash, &verify_error)) {
            return Unauthorized(verify_error.empty() ? "invalid username or password" : verify_error);
        }
        return Authenticated(MakePrincipalForRole(
            user.role, user.scopes, user.display_name, config.auth_mode));
    }
    return Unauthorized("invalid username or password");
}

bool PasswordHashingAvailable() {
#if MEDIA_SERVER_USE_LIBSODIUM
    return SodiumReady();
#else
    return false;
#endif
}

const char* PasswordHashingScheme() {
#if MEDIA_SERVER_USE_LIBSODIUM
    return "libsodium crypto_pwhash_str";
#else
    return "unavailable";
#endif
}

std::optional<std::string> GeneratePasswordHash(const std::string& password,
                                                std::string* error_message) {
#if MEDIA_SERVER_USE_LIBSODIUM
    if (!SodiumReady()) {
        if (error_message != nullptr) {
            *error_message = "libsodium initialization failed";
        }
        return std::nullopt;
    }
    std::array<char, crypto_pwhash_STRBYTES> out{};
    if (crypto_pwhash_str(out.data(),
                          password.c_str(),
                          password.size(),
                          crypto_pwhash_OPSLIMIT_INTERACTIVE,
                          crypto_pwhash_MEMLIMIT_INTERACTIVE) != 0) {
        if (error_message != nullptr) {
            *error_message = "failed to generate password hash";
        }
        return std::nullopt;
    }
    return std::string(out.data());
#else
    if (error_message != nullptr) {
        *error_message = "safe password hashing is unavailable; build with libsodium";
    }
    return std::nullopt;
#endif
}

BootstrapState InspectBootstrapState(const app::AppConfig& config) {
    BootstrapState state;
    state.users_file_exists = std::filesystem::exists(config.auth_users_file);
    std::string load_error;
    const auto users = LoadUsers(config.auth_users_file, &load_error);
    if (!users.has_value()) {
        state.setup_required = true;
        state.reason = state.users_file_exists ? load_error : "auth users file is missing";
        return state;
    }
    state.users_empty = users->empty();
    if (state.users_empty) {
        state.setup_required = true;
        state.reason = "auth users file has no users";
        return state;
    }
    for (const UserRecord& user : *users) {
        if (user.username != "admin") {
            continue;
        }
        state.admin_exists = true;
        state.admin_enabled = user.enabled;
        state.admin_has_password = !user.password_hash.empty();
        state.password_change_required = user.must_change_password;
        if (!user.enabled) {
            state.setup_required = true;
            state.reason = "admin user is disabled";
        } else if (user.password_hash.empty()) {
            state.setup_required = true;
            state.reason = "admin user has no passwordHash";
        } else {
            state.setup_required = false;
            state.reason = "admin user is ready";
        }
        return state;
    }
    state.setup_required = true;
    state.reason = "admin user is missing";
    return state;
}

bool SaveBootstrapAdmin(const app::AppConfig& config,
                        const std::string& password,
                        std::string* error_message) {
    auto password_hash = GeneratePasswordHash(password, error_message);
    if (!password_hash.has_value()) {
        return false;
    }
    std::vector<UserRecord> users;
    if (std::filesystem::exists(config.auth_users_file)) {
        std::string load_error;
        const auto loaded = LoadUsers(config.auth_users_file, &load_error);
        if (!loaded.has_value()) {
            if (error_message != nullptr) {
                *error_message = load_error;
            }
            return false;
        }
        users = *loaded;
    }

    const std::string now = IsoUtcNow();
    bool updated = false;
    for (UserRecord& user : users) {
        if (user.username != "admin") {
            continue;
        }
        user.display_name = user.display_name.empty() ? "Admin" : user.display_name;
        user.role = "admin";
        user.scopes = {"*"};
        user.password_hash = *password_hash;
        user.enabled = true;
        user.must_change_password = false;
        if (user.created_at.empty()) {
            user.created_at = now;
        }
        user.password_updated_at = now;
        updated = true;
        break;
    }
    if (!updated) {
        users.insert(users.begin(),
                     UserRecord{
                         .username = "admin",
                         .display_name = "Admin",
                         .role = "admin",
                         .scopes = {"*"},
                         .password_hash = *password_hash,
                         .token_hash = "",
                         .enabled = true,
                         .must_change_password = false,
                         .created_at = now,
                         .password_updated_at = now,
                     });
    }
    return SaveUsersFile(config.auth_users_file, users, error_message);
}

std::optional<std::string> GenerateSessionId(std::string* error_message) {
#if MEDIA_SERVER_USE_LIBSODIUM
    if (!SodiumReady()) {
        if (error_message != nullptr) {
            *error_message = "libsodium initialization failed";
        }
        return std::nullopt;
    }
    std::array<unsigned char, 32> bytes{};
    std::array<char, bytes.size() * 2 + 1> hex{};
    randombytes_buf(bytes.data(), bytes.size());
    sodium_bin2hex(hex.data(), hex.size(), bytes.data(), bytes.size());
    return std::string(hex.data());
#else
    if (error_message != nullptr) {
        *error_message = "secure random session id generation is unavailable; build with libsodium";
    }
    return std::nullopt;
#endif
}

std::optional<std::string> ExtractSessionCookie(const HeaderMap& headers,
                                                const std::string& cookie_name) {
    if (cookie_name.empty()) {
        return std::nullopt;
    }
    const auto cookie_header = HeaderValue(headers, "Cookie");
    if (!cookie_header.has_value()) {
        return std::nullopt;
    }
    std::size_t from = 0;
    while (from < cookie_header->size()) {
        std::size_t semi = cookie_header->find(';', from);
        std::string pair = cookie_header->substr(
            from, semi == std::string::npos ? std::string::npos : semi - from);
        pair = Trim(pair);
        const std::size_t eq = pair.find('=');
        if (eq != std::string::npos) {
            const std::string key = Trim(pair.substr(0, eq));
            const std::string value = Trim(pair.substr(eq + 1));
            if (key == cookie_name && !value.empty()) {
                return value;
            }
        }
        if (semi == std::string::npos) {
            break;
        }
        from = semi + 1;
    }
    return std::nullopt;
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
