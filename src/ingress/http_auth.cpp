// 파일 요약: HTTP auth principal 생성, account password 검증, guard helper를 구현한다.
// 동작 요약: auth off는 dev admin principal, token/session mode는 env token 또는 users file account를 사용한다.
#include "ingress/http_auth.h"

#include <algorithm>
#include <array>
#include <cerrno>
#include <chrono>
#include <cctype>
#include <cstring>
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

#if !defined(_WIN32)
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#endif

namespace ingress::auth {

namespace {

bool VerifySecretHash(const std::string& secret, const std::string& hash, std::string* error_message);
bool HardenExistingAuthStorePermissions(const std::filesystem::path& file_path,
                                        std::string* error_message);
bool WriteOwnerOnlyFileAtomically(const std::filesystem::path& file_path,
                                  const std::string& body,
                                  std::string* error_message);

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

std::optional<int> ParseIntField(const std::string& body, const std::string& field) {
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
    const std::size_t start = pos;
    if (pos < body.size() && body[pos] == '-') {
        ++pos;
    }
    while (pos < body.size() && std::isdigit(static_cast<unsigned char>(body[pos])) != 0) {
        ++pos;
    }
    if (pos == start || (pos == start + 1 && body[start] == '-')) {
        return std::nullopt;
    }
    try {
        return std::stoi(body.substr(start, pos - start));
    } catch (...) {
        return std::nullopt;
    }
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

bool IsKnownAccessRequestStatus(const std::string& status) {
    return status == "pending" || status == "approved" || status == "rejected";
}

constexpr std::size_t kAccessRequestMaxBodyBytes = 4 * 1024;
constexpr std::size_t kAccessRequestMaxDisplayNameBytes = 96;
constexpr std::size_t kAccessRequestMaxContactBytes = 160;
constexpr std::size_t kAccessRequestMaxReasonBytes = 500;
constexpr std::size_t kAccessRequestMaxViewIdBytes = 64;
constexpr std::size_t kAccessRequestMaxPendingRecords = 100;

struct InviteRecord {
    std::string invite_id;
    std::string username;
    std::string display_name;
    std::string role{"viewer"};
    std::string view_id;
    std::vector<std::string> scopes;
    std::string token_hash;
    std::string expires_at;
    bool used{false};
    std::string used_at;
    std::string created_at;
    std::string created_by;
};

struct AccessRequestRecord {
    std::string request_id;
    std::string username;
    std::string display_name;
    std::string contact;
    std::string reason;
    std::string view_id;
    std::string status{"pending"};
    std::string created_at;
    std::string decided_at;
    std::string decided_by;
    std::string invite_id;
};

struct AuthStore {
    std::vector<UserRecord> users;
    std::vector<InviteRecord> invites;
    std::vector<AccessRequestRecord> access_requests;
};

std::optional<UserRecord> ParseUserRecord(const std::string& raw) {
    UserRecord user;
    user.username = Trim(ParseStringField(raw, "username").value_or(""));
    user.display_name = Trim(ParseStringField(raw, "displayName").value_or(user.username));
    user.role = ToLower(Trim(ParseStringField(raw, "role").value_or("viewer")));
    if (const auto scopes = ExtractArrayField(raw, "scopes"); scopes.has_value()) {
        user.scopes = ParseStringArray(*scopes);
    }
    if (user.scopes.empty()) {
        user.scopes = ScopeTemplateForRole(user.role, "");
    }
    user.password_hash = Trim(ParseStringField(raw, "passwordHash").value_or(""));
    if (const auto password_history = ExtractArrayField(raw, "passwordHistory");
        password_history.has_value()) {
        user.password_history = ParseStringArray(*password_history);
    }
    user.token_hash = Trim(ParseStringField(raw, "tokenHash").value_or(""));
    user.enabled = ParseBoolField(raw, "enabled").value_or(true);
    user.must_change_password = ParseBoolField(raw, "mustChangePassword").value_or(false);
    user.failed_login_count = ParseIntField(raw, "failedLoginCount").value_or(0);
    user.locked_until = Trim(ParseStringField(raw, "lockedUntil").value_or(""));
    user.last_failed_login_at = Trim(ParseStringField(raw, "lastFailedLoginAt").value_or(""));
    user.created_at = Trim(ParseStringField(raw, "createdAt").value_or(""));
    user.password_updated_at = Trim(ParseStringField(raw, "passwordUpdatedAt").value_or(""));
    user.last_login_at = Trim(ParseStringField(raw, "lastLoginAt").value_or(""));
    user.last_login_ip = Trim(ParseStringField(raw, "lastLoginIp").value_or(""));
    user.disabled_at = Trim(ParseStringField(raw, "disabledAt").value_or(""));
    if (user.username.empty() || !IsKnownRole(user.role)) {
        return std::nullopt;
    }
    return user;
}

std::optional<InviteRecord> ParseInviteRecord(const std::string& raw) {
    InviteRecord invite;
    invite.invite_id = Trim(ParseStringField(raw, "inviteId").value_or(
        ParseStringField(raw, "id").value_or("")));
    invite.username = Trim(ParseStringField(raw, "username").value_or(""));
    invite.display_name = Trim(ParseStringField(raw, "displayName").value_or(invite.username));
    invite.role = ToLower(Trim(ParseStringField(raw, "role").value_or("viewer")));
    invite.view_id = Trim(ParseStringField(raw, "viewId").value_or(""));
    if (const auto scopes = ExtractArrayField(raw, "scopes"); scopes.has_value()) {
        invite.scopes = ParseStringArray(*scopes);
    }
    if (invite.scopes.empty()) {
        invite.scopes = ScopeTemplateForRole(invite.role, invite.view_id);
    }
    invite.token_hash = Trim(ParseStringField(raw, "tokenHash").value_or(""));
    invite.expires_at = Trim(ParseStringField(raw, "expiresAt").value_or(""));
    invite.used = ParseBoolField(raw, "used").value_or(false);
    invite.used_at = Trim(ParseStringField(raw, "usedAt").value_or(""));
    invite.created_at = Trim(ParseStringField(raw, "createdAt").value_or(""));
    invite.created_by = Trim(ParseStringField(raw, "createdBy").value_or(""));
    if (invite.invite_id.empty() || invite.username.empty() || !IsKnownRole(invite.role)) {
        return std::nullopt;
    }
    return invite;
}

std::optional<AccessRequestRecord> ParseAccessRequestRecord(const std::string& raw) {
    AccessRequestRecord request;
    request.request_id = Trim(ParseStringField(raw, "requestId").value_or(
        ParseStringField(raw, "id").value_or("")));
    request.username = Trim(ParseStringField(raw, "username").value_or(""));
    request.display_name = Trim(ParseStringField(raw, "displayName").value_or(request.username));
    request.contact = Trim(ParseStringField(raw, "contact").value_or(""));
    request.reason = Trim(ParseStringField(raw, "reason").value_or(""));
    request.view_id = Trim(ParseStringField(raw, "viewId").value_or(""));
    request.status = ToLower(Trim(ParseStringField(raw, "status").value_or("pending")));
    request.created_at = Trim(ParseStringField(raw, "createdAt").value_or(""));
    request.decided_at = Trim(ParseStringField(raw, "decidedAt").value_or(""));
    request.decided_by = Trim(ParseStringField(raw, "decidedBy").value_or(""));
    request.invite_id = Trim(ParseStringField(raw, "inviteId").value_or(""));
    if (request.request_id.empty() || request.username.empty() ||
        !IsKnownAccessRequestStatus(request.status)) {
        return std::nullopt;
    }
    return request;
}

std::optional<AuthStore> LoadAuthStore(const std::string& path, std::string* error_message) {
    const std::filesystem::path file_path(path);
    if (!HardenExistingAuthStorePermissions(file_path, error_message)) {
        return std::nullopt;
    }
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

    AuthStore store;
    const std::vector<std::string> raw_users = ExtractJsonObjectArray(content, "users");
    for (std::size_t i = 0; i < raw_users.size(); ++i) {
        if (auto user = ParseUserRecord(raw_users[i]); user.has_value()) {
            store.users.push_back(std::move(*user));
        } else {
            if (error_message != nullptr) {
                *error_message = "invalid user record in auth users file at index " +
                                 std::to_string(i) + ": " + path;
            }
            return std::nullopt;
        }
    }
    const std::vector<std::string> raw_invites = ExtractJsonObjectArray(content, "invites");
    for (std::size_t i = 0; i < raw_invites.size(); ++i) {
        if (auto invite = ParseInviteRecord(raw_invites[i]); invite.has_value()) {
            store.invites.push_back(std::move(*invite));
        } else {
            if (error_message != nullptr) {
                *error_message = "invalid invite record in auth users file at index " +
                                 std::to_string(i) + ": " + path;
            }
            return std::nullopt;
        }
    }
    const std::vector<std::string> raw_requests =
        ExtractJsonObjectArray(content, "accessRequests");
    for (std::size_t i = 0; i < raw_requests.size(); ++i) {
        if (auto request = ParseAccessRequestRecord(raw_requests[i]); request.has_value()) {
            store.access_requests.push_back(std::move(*request));
        } else {
            if (error_message != nullptr) {
                *error_message = "invalid access request record in auth users file at index " +
                                 std::to_string(i) + ": " + path;
            }
            return std::nullopt;
        }
    }
    return store;
}

AuthStore LoadAuthStoreOrEmpty(const std::string& path, std::string* error_message) {
    std::error_code exists_ec;
    const bool exists = std::filesystem::exists(path, exists_ec);
    if (exists_ec) {
        if (error_message != nullptr) {
            *error_message = "failed to inspect auth users file: " + exists_ec.message();
        }
        return AuthStore{};
    }
    if (exists) {
        if (auto store = LoadAuthStore(path, error_message); store.has_value()) {
            return *store;
        }
        return AuthStore{};
    }
    if (error_message != nullptr) {
        error_message->clear();
    }
    return AuthStore{};
}

std::optional<std::vector<UserRecord>> LoadUsers(const std::string& path, std::string* error_message) {
    auto store = LoadAuthStore(path, error_message);
    if (!store.has_value()) {
        return std::nullopt;
    }
    return store->users;
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

std::string IsoUtcAfterSeconds(int seconds) {
    const auto target = std::chrono::system_clock::now() + std::chrono::seconds(seconds);
    const std::time_t target_time = std::chrono::system_clock::to_time_t(target);
    std::tm tm{};
#if defined(_WIN32)
    gmtime_s(&tm, &target_time);
#else
    gmtime_r(&target_time, &tm);
#endif
    std::ostringstream out;
    out << std::put_time(&tm, "%Y-%m-%dT%H:%M:%SZ");
    return out.str();
}

std::string IsoUtcDaysAgo(int days) {
    const auto target = std::chrono::system_clock::now() - std::chrono::hours(24 * days);
    const std::time_t target_time = std::chrono::system_clock::to_time_t(target);
    std::tm tm{};
#if defined(_WIN32)
    gmtime_s(&tm, &target_time);
#else
    gmtime_r(&target_time, &tm);
#endif
    std::ostringstream out;
    out << std::put_time(&tm, "%Y-%m-%dT%H:%M:%SZ");
    return out.str();
}

bool IsoUtcInFuture(const std::string& value) {
    return !value.empty() && value > IsoUtcNow();
}

void AddPolicyError(std::vector<std::string>* errors, std::string error) {
    if (errors == nullptr || error.empty()) {
        return;
    }
    errors->push_back(std::move(error));
}

int PasswordCharacterClassCount(const std::string& password) {
    bool has_lower = false;
    bool has_upper = false;
    bool has_digit = false;
    bool has_symbol = false;
    for (const unsigned char ch : password) {
        has_lower = has_lower || std::islower(ch) != 0;
        has_upper = has_upper || std::isupper(ch) != 0;
        has_digit = has_digit || std::isdigit(ch) != 0;
        has_symbol = has_symbol || (!std::isalnum(ch) && !std::isspace(ch));
    }
    return (has_lower ? 1 : 0) + (has_upper ? 1 : 0) + (has_digit ? 1 : 0) +
           (has_symbol ? 1 : 0);
}

bool ContainsRepeatedCharacterRun(const std::string& password) {
    int run = 0;
    char previous = '\0';
    for (const char ch : password) {
        if (ch == previous) {
            ++run;
        } else {
            previous = ch;
            run = 1;
        }
        if (run >= 3) {
            return true;
        }
    }
    return false;
}

bool ContainsSequentialNumberRun(const std::string& password) {
    for (std::size_t i = 0; i + 3 < password.size(); ++i) {
        bool ascending = true;
        bool descending = true;
        for (std::size_t j = 0; j < 4; ++j) {
            if (std::isdigit(static_cast<unsigned char>(password[i + j])) == 0) {
                ascending = false;
                descending = false;
                break;
            }
            if (j == 0) {
                continue;
            }
            ascending = ascending && password[i + j] == password[i] + static_cast<char>(j);
            descending = descending && password[i + j] == password[i] - static_cast<char>(j);
        }
        if (ascending || descending) {
            return true;
        }
    }
    return false;
}

bool ContainsKeyboardPattern(const std::string& password) {
    const std::string lower = ToLower(password);
    const std::array<std::string, 6> rows = {
        "qwertyuiop",
        "poiuytrewq",
        "asdfghjkl",
        "lkjhgfdsa",
        "zxcvbnm",
        "mnbvcxz",
    };
    for (const std::string& row : rows) {
        for (std::size_t i = 0; i + 3 < row.size(); ++i) {
            if (lower.find(row.substr(i, 4)) != std::string::npos) {
                return true;
            }
        }
    }
    return false;
}

bool IsCommonPassword(const std::string& password) {
    const std::string lower = ToLower(password);
    static const std::array<std::string, 18> common = {
        "password",
        "password1",
        "password123",
        "admin",
        "admin1234",
        "administrator",
        "qwer1234",
        "qwerty123",
        "12345678",
        "123456789",
        "11111111",
        "00000000",
        "letmein",
        "welcome",
        "iloveyou",
        "mediaserver",
        "media1234",
        "changeme",
    };
    return std::find(common.begin(), common.end(), lower) != common.end();
}

bool PasswordWasUsedBefore(const std::string& password, const UserRecord& user) {
    std::vector<std::string> hashes;
    if (!user.password_hash.empty()) {
        hashes.push_back(user.password_hash);
    }
    hashes.insert(hashes.end(), user.password_history.begin(), user.password_history.end());
    for (const std::string& hash : hashes) {
        if (!hash.empty() && VerifySecretHash(password, hash, nullptr)) {
            return true;
        }
    }
    return false;
}

bool IsSafeUsername(const std::string& username) {
    if (username.empty() || username.size() > 64) {
        return false;
    }
    return std::all_of(username.begin(), username.end(), [](unsigned char ch) {
        return std::isalnum(ch) != 0 || ch == '_' || ch == '-' || ch == '.' || ch == '@';
    });
}

bool LooksLikeJsonObject(const std::string& body) {
    const std::string trimmed = Trim(body);
    return trimmed.size() >= 2 && trimmed.front() == '{' && trimmed.back() == '}';
}

bool HasUnsafeTextCharacter(const std::string& value) {
    return std::any_of(value.begin(), value.end(), [](unsigned char ch) {
        return ch < 0x20 || ch == 0x7f;
    });
}

bool IsNumericViewId(const std::string& view_id) {
    if (view_id.empty()) {
        return true;
    }
    if (view_id.size() > kAccessRequestMaxViewIdBytes) {
        return false;
    }
    return std::all_of(view_id.begin(), view_id.end(), [](unsigned char ch) {
        return std::isdigit(ch) != 0;
    });
}

bool EqualsCaseInsensitive(const std::string& lhs, const std::string& rhs) {
    return ToLower(lhs) == ToLower(rhs);
}

std::optional<std::string> ValidateAccessRequestPayload(const std::string& body,
                                                        const AccessRequestRecord& request) {
    if (body.size() > kAccessRequestMaxBodyBytes) {
        return "access request body is too large";
    }
    if (!LooksLikeJsonObject(body)) {
        return "JSON object body is required";
    }
    if (!IsSafeUsername(request.username)) {
        return "username은 1~64자의 영문/숫자/._-@ 조합이어야 합니다.";
    }
    if (request.display_name.size() > kAccessRequestMaxDisplayNameBytes ||
        request.contact.size() > kAccessRequestMaxContactBytes ||
        request.reason.size() > kAccessRequestMaxReasonBytes) {
        return "access request fields exceed length limits";
    }
    if (HasUnsafeTextCharacter(request.display_name) ||
        HasUnsafeTextCharacter(request.contact) ||
        HasUnsafeTextCharacter(request.reason)) {
        return "access request fields must not contain control characters";
    }
    if (!IsNumericViewId(request.view_id)) {
        return "viewId must be numeric";
    }
    if (request.contact.empty() && request.reason.empty()) {
        return "contact or reason is required";
    }
    return std::nullopt;
}

AuthUserResult UserJsonResult(int status,
                              std::string status_text,
                              std::string body,
                              std::string username = "") {
    return AuthUserResult{.status = status,
                          .status_text = std::move(status_text),
                          .body = std::move(body),
                          .username = std::move(username)};
}

AuthUserResult UserError(int status, std::string status_text, std::string error) {
    return UserJsonResult(status,
                          std::move(status_text),
                          "{\"error\":\"" + JsonEscapeLocal(error) + "\"}");
}

void AppendJsonStringArray(std::ostringstream& out, const std::vector<std::string>& values) {
    out << "[";
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        out << "\"" << JsonEscapeLocal(values[i]) << "\"";
    }
    out << "]";
}

void AppendPublicUserJson(std::ostringstream& out, const UserRecord& user) {
    out << "{"
        << "\"username\":\"" << JsonEscapeLocal(user.username) << "\","
        << "\"displayName\":\"" << JsonEscapeLocal(user.display_name) << "\","
        << "\"role\":\"" << JsonEscapeLocal(user.role) << "\","
        << "\"enabled\":" << (user.enabled ? "true" : "false") << ","
        << "\"scopesCount\":" << user.scopes.size() << ","
        << "\"scopes\":";
    AppendJsonStringArray(out, user.scopes);
    out << ","
        << "\"mustChangePassword\":" << (user.must_change_password ? "true" : "false") << ","
        << "\"failedLoginCount\":" << user.failed_login_count << ","
        << "\"lockedUntil\":\"" << JsonEscapeLocal(user.locked_until) << "\","
        << "\"lastFailedLoginAt\":\"" << JsonEscapeLocal(user.last_failed_login_at) << "\","
        << "\"lastLoginAt\":\"" << JsonEscapeLocal(user.last_login_at) << "\","
        << "\"lastLoginIp\":\"" << JsonEscapeLocal(user.last_login_ip) << "\","
        << "\"createdAt\":\"" << JsonEscapeLocal(user.created_at) << "\","
        << "\"passwordUpdatedAt\":\"" << JsonEscapeLocal(user.password_updated_at) << "\","
        << "\"disabledAt\":\"" << JsonEscapeLocal(user.disabled_at) << "\""
        << "}";
}

void AppendPublicInviteJson(std::ostringstream& out,
                            const InviteRecord& invite,
                            const std::string& raw_token = "") {
    out << "{"
        << "\"inviteId\":\"" << JsonEscapeLocal(invite.invite_id) << "\","
        << "\"username\":\"" << JsonEscapeLocal(invite.username) << "\","
        << "\"displayName\":\"" << JsonEscapeLocal(invite.display_name) << "\","
        << "\"role\":\"" << JsonEscapeLocal(invite.role) << "\","
        << "\"viewId\":\"" << JsonEscapeLocal(invite.view_id) << "\","
        << "\"scopes\":";
    AppendJsonStringArray(out, invite.scopes);
    out << ","
        << "\"expiresAt\":\"" << JsonEscapeLocal(invite.expires_at) << "\","
        << "\"used\":" << (invite.used ? "true" : "false") << ","
        << "\"usedAt\":\"" << JsonEscapeLocal(invite.used_at) << "\","
        << "\"createdAt\":\"" << JsonEscapeLocal(invite.created_at) << "\","
        << "\"createdBy\":\"" << JsonEscapeLocal(invite.created_by) << "\","
        << "\"setupUrl\":\"/invite/setup?token=" << JsonEscapeLocal(raw_token) << "\"";
    if (!raw_token.empty()) {
        out << ",\"token\":\"" << JsonEscapeLocal(raw_token) << "\"";
    }
    out << "}";
}

void AppendPublicAccessRequestJson(std::ostringstream& out, const AccessRequestRecord& request) {
    out << "{"
        << "\"requestId\":\"" << JsonEscapeLocal(request.request_id) << "\","
        << "\"username\":\"" << JsonEscapeLocal(request.username) << "\","
        << "\"displayName\":\"" << JsonEscapeLocal(request.display_name) << "\","
        << "\"contact\":\"" << JsonEscapeLocal(request.contact) << "\","
        << "\"reason\":\"" << JsonEscapeLocal(request.reason) << "\","
        << "\"viewId\":\"" << JsonEscapeLocal(request.view_id) << "\","
        << "\"status\":\"" << JsonEscapeLocal(request.status) << "\","
        << "\"createdAt\":\"" << JsonEscapeLocal(request.created_at) << "\","
        << "\"decidedAt\":\"" << JsonEscapeLocal(request.decided_at) << "\","
        << "\"decidedBy\":\"" << JsonEscapeLocal(request.decided_by) << "\","
        << "\"inviteId\":\"" << JsonEscapeLocal(request.invite_id) << "\""
        << "}";
}

std::string UsersJson(const std::vector<UserRecord>& users) {
    std::ostringstream out;
    out << "{\"users\":[";
    for (std::size_t i = 0; i < users.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendPublicUserJson(out, users[i]);
    }
    out << "]}";
    return out.str();
}

std::string AccessRequestsJson(const std::vector<AccessRequestRecord>& requests) {
    std::ostringstream out;
    out << "{\"accessRequests\":[";
    for (std::size_t i = 0; i < requests.size(); ++i) {
        if (i != 0) {
            out << ",";
        }
        AppendPublicAccessRequestJson(out, requests[i]);
    }
    out << "]}";
    return out.str();
}

bool HasAnotherEnabledAdmin(const std::vector<UserRecord>& users, const std::string& username) {
    return std::any_of(users.begin(), users.end(), [&](const UserRecord& user) {
        return user.username != username && user.enabled && user.role == "admin";
    });
}

std::optional<std::size_t> FindUserIndex(const std::vector<UserRecord>& users,
                                         const std::string& username) {
    for (std::size_t i = 0; i < users.size(); ++i) {
        if (users[i].username == username) {
            return i;
        }
    }
    return std::nullopt;
}

std::optional<std::size_t> FindAccessRequestIndex(const std::vector<AccessRequestRecord>& requests,
                                                  const std::string& request_id) {
    for (std::size_t i = 0; i < requests.size(); ++i) {
        if (requests[i].request_id == request_id) {
            return i;
        }
    }
    return std::nullopt;
}

std::vector<std::string> ScopesFromMutation(const UserMutation& mutation) {
    if (!mutation.scopes.empty()) {
        return mutation.scopes;
    }
    return ScopeTemplateForRole(mutation.role, mutation.view_id);
}

UserMutation UserMutationFromJson(const std::string& body) {
    UserMutation mutation;
    mutation.username = Trim(ParseStringField(body, "username").value_or(""));
    mutation.display_name = Trim(ParseStringField(body, "displayName").value_or(""));
    mutation.role = ToLower(Trim(ParseStringField(body, "role").value_or("")));
    mutation.view_id = Trim(ParseStringField(body, "viewId").value_or(""));
    if (const auto scopes = ExtractArrayField(body, "scopes"); scopes.has_value()) {
        mutation.scopes = ParseStringArray(*scopes);
    } else if (const auto scopes_csv = ParseStringField(body, "scopes"); scopes_csv.has_value()) {
        std::stringstream ss(*scopes_csv);
        std::string token;
        while (std::getline(ss, token, ',')) {
            token = Trim(token);
            if (!token.empty()) {
                mutation.scopes.push_back(token);
            }
        }
    }
    mutation.password = ParseStringField(body, "password").value_or("");
    mutation.has_password = ParseStringField(body, "password").has_value();
    if (const auto enabled = ParseBoolField(body, "enabled"); enabled.has_value()) {
        mutation.enabled = *enabled;
        mutation.has_enabled = true;
    }
    if (const auto must_change = ParseBoolField(body, "mustChangePassword");
        must_change.has_value()) {
        mutation.must_change_password = *must_change;
        mutation.has_must_change_password = true;
    }
    return mutation;
}

std::optional<std::string> ValidateUserMutation(const UserMutation& mutation, bool require_password) {
    if (!IsSafeUsername(mutation.username)) {
        return "username은 1~64자의 영문/숫자/._-@ 조합이어야 합니다.";
    }
    if (!IsKnownRole(mutation.role)) {
        return "role은 admin/operator/viewer/integrator 중 하나여야 합니다.";
    }
    if (!IsNumericViewId(mutation.view_id)) {
        return "viewId must be numeric";
    }
    if (require_password && (!mutation.has_password || mutation.password.empty())) {
        return "password is required";
    }
    return std::nullopt;
}

bool StartsWith(const std::string& value, const std::string& prefix) {
    return value.size() >= prefix.size() && value.compare(0, prefix.size(), prefix) == 0;
}

bool ScopeAllowedForRole(const std::string& role, const std::string& scope) {
    if (scope.empty()) {
        return false;
    }
    if (role == "admin" || role == "operator") {
        return true;
    }
    if (role == "viewer") {
        return StartsWith(scope, "view:read:") ||
               StartsWith(scope, "dashboard:read:") ||
               StartsWith(scope, "event:read:") ||
               StartsWith(scope, "metadata:read:");
    }
    if (role == "integrator") {
        return StartsWith(scope, "event:read:") || StartsWith(scope, "metadata:read:");
    }
    return false;
}

std::optional<std::string> ValidateScopesForRole(const std::string& role,
                                                 const std::vector<std::string>& scopes) {
    for (const std::string& scope : scopes) {
        if (!ScopeAllowedForRole(role, scope)) {
            return "role " + role + " cannot be assigned scope: " + scope;
        }
    }
    return std::nullopt;
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

void WriteUserRecordJson(std::ostringstream& body, const UserRecord& user, const std::string& indent) {
    body << indent << "{\n"
         << indent << "  \"username\": \"" << JsonEscapeLocal(user.username) << "\",\n"
         << indent << "  \"displayName\": \"" << JsonEscapeLocal(user.display_name) << "\",\n"
         << indent << "  \"role\": \"" << JsonEscapeLocal(user.role) << "\",\n"
         << indent << "  \"scopes\": ";
    WriteStringArray(body, user.scopes);
    body << ",\n"
         << indent << "  \"passwordHash\": \"" << JsonEscapeLocal(user.password_hash) << "\",\n";
    if (!user.password_history.empty()) {
        body << indent << "  \"passwordHistory\": ";
        WriteStringArray(body, user.password_history);
        body << ",\n";
    }
    if (!user.token_hash.empty()) {
        body << indent << "  \"tokenHash\": \"" << JsonEscapeLocal(user.token_hash) << "\",\n";
    }
    body << indent << "  \"enabled\": " << (user.enabled ? "true" : "false") << ",\n"
         << indent << "  \"mustChangePassword\": " << (user.must_change_password ? "true" : "false") << ",\n"
         << indent << "  \"failedLoginCount\": " << user.failed_login_count << ",\n"
         << indent << "  \"lockedUntil\": \"" << JsonEscapeLocal(user.locked_until) << "\",\n"
         << indent << "  \"lastFailedLoginAt\": \"" << JsonEscapeLocal(user.last_failed_login_at) << "\",\n"
         << indent << "  \"createdAt\": \"" << JsonEscapeLocal(user.created_at) << "\",\n"
         << indent << "  \"passwordUpdatedAt\": \"" << JsonEscapeLocal(user.password_updated_at) << "\",\n"
         << indent << "  \"lastLoginAt\": \"" << JsonEscapeLocal(user.last_login_at) << "\",\n"
         << indent << "  \"lastLoginIp\": \"" << JsonEscapeLocal(user.last_login_ip) << "\",\n"
         << indent << "  \"disabledAt\": \"" << JsonEscapeLocal(user.disabled_at) << "\"\n"
         << indent << "}";
}

void WriteInviteRecordJson(std::ostringstream& body, const InviteRecord& invite, const std::string& indent) {
    body << indent << "{\n"
         << indent << "  \"inviteId\": \"" << JsonEscapeLocal(invite.invite_id) << "\",\n"
         << indent << "  \"username\": \"" << JsonEscapeLocal(invite.username) << "\",\n"
         << indent << "  \"displayName\": \"" << JsonEscapeLocal(invite.display_name) << "\",\n"
         << indent << "  \"role\": \"" << JsonEscapeLocal(invite.role) << "\",\n"
         << indent << "  \"viewId\": \"" << JsonEscapeLocal(invite.view_id) << "\",\n"
         << indent << "  \"scopes\": ";
    WriteStringArray(body, invite.scopes);
    body << ",\n"
         << indent << "  \"tokenHash\": \"" << JsonEscapeLocal(invite.token_hash) << "\",\n"
         << indent << "  \"expiresAt\": \"" << JsonEscapeLocal(invite.expires_at) << "\",\n"
         << indent << "  \"used\": " << (invite.used ? "true" : "false") << ",\n"
         << indent << "  \"usedAt\": \"" << JsonEscapeLocal(invite.used_at) << "\",\n"
         << indent << "  \"createdAt\": \"" << JsonEscapeLocal(invite.created_at) << "\",\n"
         << indent << "  \"createdBy\": \"" << JsonEscapeLocal(invite.created_by) << "\"\n"
         << indent << "}";
}

void WriteAccessRequestRecordJson(std::ostringstream& body,
                                  const AccessRequestRecord& request,
                                  const std::string& indent) {
    body << indent << "{\n"
         << indent << "  \"requestId\": \"" << JsonEscapeLocal(request.request_id) << "\",\n"
         << indent << "  \"username\": \"" << JsonEscapeLocal(request.username) << "\",\n"
         << indent << "  \"displayName\": \"" << JsonEscapeLocal(request.display_name) << "\",\n"
         << indent << "  \"contact\": \"" << JsonEscapeLocal(request.contact) << "\",\n"
         << indent << "  \"reason\": \"" << JsonEscapeLocal(request.reason) << "\",\n"
         << indent << "  \"viewId\": \"" << JsonEscapeLocal(request.view_id) << "\",\n"
         << indent << "  \"status\": \"" << JsonEscapeLocal(request.status) << "\",\n"
         << indent << "  \"createdAt\": \"" << JsonEscapeLocal(request.created_at) << "\",\n"
         << indent << "  \"decidedAt\": \"" << JsonEscapeLocal(request.decided_at) << "\",\n"
         << indent << "  \"decidedBy\": \"" << JsonEscapeLocal(request.decided_by) << "\",\n"
         << indent << "  \"inviteId\": \"" << JsonEscapeLocal(request.invite_id) << "\"\n"
         << indent << "}";
}

bool SetError(std::string* error_message, const std::string& message) {
    if (error_message != nullptr) {
        *error_message = message;
    }
    return false;
}

#if !defined(_WIN32)

constexpr mode_t kAuthStoreFileMode = S_IRUSR | S_IWUSR;

std::string ErrnoMessage(const std::string& action) {
    return action + ": " + std::strerror(errno);
}

bool CloseFdChecked(int fd, const std::string& label, std::string* error_message) {
    if (::close(fd) != 0) {
        return SetError(error_message, ErrnoMessage("failed to close " + label));
    }
    return true;
}

bool WriteAll(int fd, const std::string& data, std::string* error_message) {
    const char* cursor = data.data();
    std::size_t remaining = data.size();
    while (remaining > 0) {
        const ssize_t written = ::write(fd, cursor, remaining);
        if (written < 0) {
            if (errno == EINTR) {
                continue;
            }
            return SetError(error_message, ErrnoMessage("failed to write auth users file"));
        }
        if (written == 0) {
            return SetError(error_message, "failed to write auth users file: short write");
        }
        cursor += written;
        remaining -= static_cast<std::size_t>(written);
    }
    return true;
}

bool FsyncFd(int fd, const std::string& label, std::string* error_message) {
    while (::fsync(fd) != 0) {
        if (errno == EINTR) {
            continue;
        }
        return SetError(error_message, ErrnoMessage("failed to fsync " + label));
    }
    return true;
}

bool ChmodOwnerOnly(const std::filesystem::path& path, std::string* error_message) {
    if (::chmod(path.c_str(), kAuthStoreFileMode) != 0) {
        return SetError(error_message, ErrnoMessage("failed to chmod auth users file"));
    }
    return true;
}

bool FsyncParentDirectory(const std::filesystem::path& file_path, std::string* error_message) {
    std::filesystem::path parent = file_path.parent_path();
    if (parent.empty()) {
        parent = ".";
    }
    int flags = O_RDONLY;
#if defined(O_CLOEXEC)
    flags |= O_CLOEXEC;
#endif
    const int dir_fd = ::open(parent.c_str(), flags);
    if (dir_fd < 0) {
        return SetError(error_message, ErrnoMessage("failed to open auth users directory"));
    }
    if (!FsyncFd(dir_fd, "auth users directory", error_message)) {
        (void)::close(dir_fd);
        return false;
    }
    return CloseFdChecked(dir_fd, "auth users directory", error_message);
}

std::filesystem::path AuthStoreTempPath(const std::filesystem::path& file_path, int attempt) {
    const auto nonce = std::chrono::steady_clock::now().time_since_epoch().count();
    std::ostringstream suffix;
    suffix << ".tmp." << static_cast<long long>(::getpid()) << "." << nonce << "." << attempt;
    return std::filesystem::path(file_path.string() + suffix.str());
}

bool WriteOwnerOnlyFileAtomically(const std::filesystem::path& file_path,
                                  const std::string& body,
                                  std::string* error_message) {
    int flags = O_WRONLY | O_CREAT | O_TRUNC;
#if defined(O_EXCL)
    flags |= O_EXCL;
#endif
#if defined(O_CLOEXEC)
    flags |= O_CLOEXEC;
#endif
#if defined(O_NOFOLLOW)
    flags |= O_NOFOLLOW;
#endif
    std::filesystem::path tmp_path;
    int fd = -1;
    for (int attempt = 0; attempt < 100; ++attempt) {
        tmp_path = AuthStoreTempPath(file_path, attempt);
        fd = ::open(tmp_path.c_str(), flags, kAuthStoreFileMode);
        if (fd >= 0) {
            break;
        }
        if (errno == EEXIST) {
            continue;
        }
        return SetError(error_message, ErrnoMessage("failed to open temporary auth users file"));
    }
    if (fd < 0) {
        return SetError(error_message, "failed to open unique temporary auth users file");
    }
    auto cleanup_tmp = [&]() {
        if (fd >= 0) {
            (void)::close(fd);
            fd = -1;
        }
        std::error_code remove_ec;
        std::filesystem::remove(tmp_path, remove_ec);
    };
    if (::fchmod(fd, kAuthStoreFileMode) != 0) {
        const std::string message = ErrnoMessage("failed to chmod temporary auth users file");
        cleanup_tmp();
        return SetError(error_message, message);
    }
    if (!WriteAll(fd, body, error_message)) {
        cleanup_tmp();
        return false;
    }
    if (!FsyncFd(fd, "temporary auth users file", error_message)) {
        cleanup_tmp();
        return false;
    }
    if (!CloseFdChecked(fd, "temporary auth users file", error_message)) {
        fd = -1;
        std::error_code remove_ec;
        std::filesystem::remove(tmp_path, remove_ec);
        return false;
    }
    fd = -1;
    if (::rename(tmp_path.c_str(), file_path.c_str()) != 0) {
        const std::string message = ErrnoMessage("failed to replace auth users file");
        std::error_code remove_ec;
        std::filesystem::remove(tmp_path, remove_ec);
        return SetError(error_message, message);
    }
    if (!ChmodOwnerOnly(file_path, error_message)) {
        return false;
    }
    return FsyncParentDirectory(file_path, error_message);
}

bool HardenExistingAuthStorePermissions(const std::filesystem::path& file_path,
                                        std::string* error_message) {
    std::error_code exists_ec;
    if (!std::filesystem::exists(file_path, exists_ec)) {
        return true;
    }
    if (exists_ec) {
        return SetError(error_message, "failed to inspect auth users file: " + exists_ec.message());
    }
    return ChmodOwnerOnly(file_path, error_message);
}

#else

bool WriteOwnerOnlyFileAtomically(const std::filesystem::path& file_path,
                                  const std::string& body,
                                  std::string* error_message) {
    const std::filesystem::path tmp_path = file_path.string() + ".tmp";
    {
        std::ofstream out(tmp_path, std::ios::trunc);
        if (!out) {
            return SetError(error_message, "failed to open temporary auth users file");
        }
        out << body;
        if (!out) {
            return SetError(error_message, "failed to write auth users file");
        }
    }
    std::error_code ec;
    std::filesystem::permissions(tmp_path,
                                 std::filesystem::perms::owner_read |
                                     std::filesystem::perms::owner_write,
                                 std::filesystem::perm_options::replace,
                                 ec);
    if (ec) {
        std::filesystem::remove(tmp_path);
        return SetError(error_message, "failed to chmod temporary auth users file: " + ec.message());
    }
    std::filesystem::rename(tmp_path, file_path, ec);
    if (ec) {
        std::filesystem::remove(tmp_path);
        return SetError(error_message, "failed to replace auth users file: " + ec.message());
    }
    return true;
}

bool HardenExistingAuthStorePermissions(const std::filesystem::path& file_path,
                                        std::string* error_message) {
    std::error_code exists_ec;
    if (!std::filesystem::exists(file_path, exists_ec)) {
        return true;
    }
    if (exists_ec) {
        return SetError(error_message, "failed to inspect auth users file: " + exists_ec.message());
    }
    std::error_code ec;
    std::filesystem::permissions(file_path,
                                 std::filesystem::perms::owner_read |
                                     std::filesystem::perms::owner_write,
                                 std::filesystem::perm_options::replace,
                                 ec);
    if (ec) {
        return SetError(error_message, "failed to chmod auth users file: " + ec.message());
    }
    return true;
}

#endif

bool SaveAuthStore(const std::string& path, const AuthStore& store, std::string* error_message) {
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
    for (std::size_t i = 0; i < store.users.size(); ++i) {
        WriteUserRecordJson(body, store.users[i], "    ");
        if (i + 1 < store.users.size()) {
            body << ",";
        }
        body << "\n";
    }
    body << "  ],\n  \"invites\": [\n";
    for (std::size_t i = 0; i < store.invites.size(); ++i) {
        WriteInviteRecordJson(body, store.invites[i], "    ");
        if (i + 1 < store.invites.size()) {
            body << ",";
        }
        body << "\n";
    }
    body << "  ],\n  \"accessRequests\": [\n";
    for (std::size_t i = 0; i < store.access_requests.size(); ++i) {
        WriteAccessRequestRecordJson(body, store.access_requests[i], "    ");
        if (i + 1 < store.access_requests.size()) {
            body << ",";
        }
        body << "\n";
    }
    body << "  ]\n}\n";

    return WriteOwnerOnlyFileAtomically(file_path, body.str(), error_message);
}

bool SaveUsersFile(const std::string& path,
                   const std::vector<UserRecord>& users,
                   std::string* error_message) {
    std::error_code exists_ec;
    const bool exists = std::filesystem::exists(path, exists_ec);
    if (exists_ec) {
        if (error_message != nullptr) {
            *error_message = "failed to inspect auth users file: " + exists_ec.message();
        }
        return false;
    }
    if (!exists) {
        if (error_message != nullptr) {
            *error_message = "auth users file disappeared before preserving invite/request state: " + path;
        }
        return false;
    }
    std::string load_error;
    auto loaded = LoadAuthStore(path, &load_error);
    if (!loaded.has_value()) {
        if (error_message != nullptr) {
            *error_message = load_error.empty()
                                 ? "failed to load auth users file before preserving invite/request state"
                                 : load_error;
        }
        return false;
    }
    AuthStore store = std::move(*loaded);
    store.users = users;
    return SaveAuthStore(path, store, error_message);
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
            return MakePrincipalForRole(user.role,
                                        user.scopes,
                                        user.display_name,
                                        config.auth_mode,
                                        user.username,
                                        user.must_change_password);
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
                               app::AuthMode auth_mode,
                               const std::string& username,
                               bool password_change_required) {
    return Principal{
        .username = username,
        .role = role,
        .scopes = scopes.empty() ? DefaultScopesForRole(role) : scopes,
        .display_name = display_name.empty() ? role : display_name,
        .auth_mode = AuthModeName(auth_mode),
        .is_authenticated = true,
        .password_change_required = password_change_required,
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

AuthResult RefreshPrincipalFromUser(const app::AppConfig& config,
                                    const Principal& principal) {
    if (!principal.is_authenticated || principal.username.empty()) {
        return Authenticated(principal);
    }
    std::string load_error;
    const auto users = LoadUsers(config.auth_users_file, &load_error);
    if (!users.has_value()) {
        return Unauthorized(load_error);
    }
    for (const UserRecord& user : *users) {
        if (user.username != principal.username) {
            continue;
        }
        if (!user.enabled) {
            return Unauthorized("user is disabled");
        }
        if (user.must_change_password && !principal.password_change_required) {
            return Unauthorized("password reset requires login");
        }
        return Authenticated(MakePrincipalForRole(user.role,
                                                  user.scopes,
                                                  user.display_name,
                                                  config.auth_mode,
                                                  user.username,
                                                  user.must_change_password));
    }
    return Unauthorized("user not found");
}

PasswordPolicyResult ValidatePasswordPolicy(const app::AppConfig& config,
                                            const std::string& username,
                                            const std::string& password,
                                            const std::string& confirm,
                                            const UserRecord* existing_user) {
    PasswordPolicyResult result;
    if (password != confirm) {
        AddPolicyError(&result.errors, "비밀번호 확인이 일치하지 않습니다.");
    }
    const std::string policy = ToLower(config.auth_password_policy.empty()
                                           ? std::string("kr-privacy")
                                           : config.auth_password_policy);
    const int classes = PasswordCharacterClassCount(password);
    int min_length = config.auth_password_min_length > 0 ? config.auth_password_min_length : 0;
    if (policy == "strict") {
        min_length = std::max(min_length, 12);
        if (classes < 3) {
            AddPolicyError(&result.errors,
                           "strict 정책은 대문자, 소문자, 숫자, 특수문자 중 3종류 이상을 요구합니다.");
        }
    } else if (policy == "custom") {
        min_length = std::max(min_length, 8);
    } else {
        if (classes >= 3) {
            min_length = std::max(min_length, 8);
        } else if (classes >= 2) {
            min_length = std::max(min_length, 10);
        } else {
            min_length = std::max(min_length, 10);
            AddPolicyError(&result.errors,
                           "비밀번호는 문자 종류를 2종류 이상 조합해야 합니다.");
        }
    }
    if (static_cast<int>(password.size()) < min_length) {
        AddPolicyError(&result.errors,
                       "비밀번호 길이가 정책 기준보다 짧습니다.");
    }
    if (!username.empty() && ToLower(password).find(ToLower(username)) != std::string::npos) {
        AddPolicyError(&result.errors, "비밀번호에 username을 포함할 수 없습니다.");
    }
    if (ContainsRepeatedCharacterRun(password)) {
        AddPolicyError(&result.errors, "같은 문자를 3회 이상 연속 사용할 수 없습니다.");
    }
    if (ContainsSequentialNumberRun(password)) {
        AddPolicyError(&result.errors, "4자리 이상 연속된 숫자 배열을 사용할 수 없습니다.");
    }
    if (ContainsKeyboardPattern(password)) {
        AddPolicyError(&result.errors, "키보드 배열과 같은 예측 가능한 패턴을 사용할 수 없습니다.");
    }
    if (IsCommonPassword(password)) {
        AddPolicyError(&result.errors, "흔한 비밀번호는 사용할 수 없습니다.");
    }
    if (existing_user != nullptr && config.auth_password_history_count > 0 &&
        PasswordWasUsedBefore(password, *existing_user)) {
        AddPolicyError(&result.errors, "이전에 사용한 비밀번호는 재사용할 수 없습니다.");
    }
    result.ok = result.errors.empty();
    if (!result.ok) {
        std::ostringstream message;
        for (std::size_t i = 0; i < result.errors.size(); ++i) {
            if (i != 0) {
                message << " ";
            }
            message << result.errors[i];
        }
        result.message = message.str();
    }
    return result;
}

AuthResult AuthenticateUserPassword(const app::AppConfig& config,
                                    const std::string& username,
                                    const std::string& password,
                                    const std::string& remote_ip) {
    if (!PasswordHashingAvailable()) {
        return Unauthorized("safe password hashing is unavailable; build with libsodium");
    }

    std::string load_error;
    auto users = LoadUsers(config.auth_users_file, &load_error);
    if (!users.has_value()) {
        return Unauthorized(load_error);
    }
    for (UserRecord& user : *users) {
        if (user.username != username) {
            continue;
        }
        if (!user.enabled || user.password_hash.empty()) {
            return Unauthorized("invalid username or password");
        }
        if (IsoUtcInFuture(user.locked_until)) {
            return Unauthorized("account is temporarily locked");
        }
        if (!user.locked_until.empty()) {
            user.locked_until.clear();
            user.failed_login_count = 0;
        }
        std::string verify_error;
        if (!VerifySecretHash(password, user.password_hash, &verify_error)) {
            user.failed_login_count += 1;
            user.last_failed_login_at = IsoUtcNow();
            if (config.auth_login_max_failures > 0 &&
                user.failed_login_count >= config.auth_login_max_failures &&
                config.auth_login_lockout_seconds > 0) {
                user.locked_until = IsoUtcAfterSeconds(config.auth_login_lockout_seconds);
            }
            std::string save_error;
            (void)SaveUsersFile(config.auth_users_file, *users, &save_error);
            return Unauthorized(user.locked_until.empty()
                                    ? "invalid username or password"
                                    : "account is temporarily locked");
        }

        user.failed_login_count = 0;
        user.locked_until.clear();
        user.last_failed_login_at.clear();
        user.last_login_at = IsoUtcNow();
        user.last_login_ip = remote_ip;
        if (config.auth_password_max_age_days > 0 &&
            !user.password_updated_at.empty() &&
            user.password_updated_at < IsoUtcDaysAgo(config.auth_password_max_age_days)) {
            user.must_change_password = true;
        }
        std::string save_error;
        (void)SaveUsersFile(config.auth_users_file, *users, &save_error);
        return Authenticated(MakePrincipalForRole(user.role,
                                                  user.scopes,
                                                  user.display_name,
                                                  config.auth_mode,
                                                  user.username,
                                                  user.must_change_password));
    }
    return Unauthorized("invalid username or password");
}

bool ChangeUserPassword(const app::AppConfig& config,
                        const std::string& username,
                        const std::string& current_password,
                        const std::string& new_password,
                        const std::string& confirm,
                        bool require_current_password,
                        std::string* error_message) {
    if (!PasswordHashingAvailable()) {
        if (error_message != nullptr) {
            *error_message = "safe password hashing is unavailable; build with libsodium";
        }
        return false;
    }
    std::string load_error;
    auto users = LoadUsers(config.auth_users_file, &load_error);
    if (!users.has_value()) {
        if (error_message != nullptr) {
            *error_message = load_error;
        }
        return false;
    }
    for (UserRecord& user : *users) {
        if (user.username != username) {
            continue;
        }
        if (!user.enabled || user.password_hash.empty()) {
            if (error_message != nullptr) {
                *error_message = "invalid username or password";
            }
            return false;
        }
        if (require_current_password && !VerifySecretHash(current_password, user.password_hash, nullptr)) {
            if (error_message != nullptr) {
                *error_message = "현재 비밀번호가 올바르지 않습니다.";
            }
            return false;
        }
        const PasswordPolicyResult policy =
            ValidatePasswordPolicy(config, user.username, new_password, confirm, &user);
        if (!policy.ok) {
            if (error_message != nullptr) {
                *error_message = policy.message;
            }
            return false;
        }
        auto password_hash = GeneratePasswordHash(new_password, error_message);
        if (!password_hash.has_value()) {
            return false;
        }
        std::vector<std::string> history;
        history.push_back(*password_hash);
        if (!user.password_hash.empty()) {
            history.push_back(user.password_hash);
        }
        for (const std::string& hash : user.password_history) {
            if (std::find(history.begin(), history.end(), hash) == history.end()) {
                history.push_back(hash);
            }
        }
        if (config.auth_password_history_count >= 0 &&
            static_cast<int>(history.size()) > config.auth_password_history_count) {
            history.resize(static_cast<std::size_t>(config.auth_password_history_count));
        }
        user.password_hash = *password_hash;
        user.password_history = std::move(history);
        user.must_change_password = false;
        user.failed_login_count = 0;
        user.locked_until.clear();
        user.last_failed_login_at.clear();
        user.password_updated_at = IsoUtcNow();
        return SaveUsersFile(config.auth_users_file, *users, error_message);
    }
    if (error_message != nullptr) {
        *error_message = "invalid username or password";
    }
    return false;
}

std::vector<std::string> ScopeTemplateForRole(const std::string& role,
                                              const std::string& view_id) {
    const std::string normalized_role = ToLower(Trim(role));
    const std::string normalized_view = Trim(view_id);
    if (normalized_role == "admin") {
        return {"*"};
    }
    if (normalized_role == "operator") {
        return {"ops:read", "rule:write", "source:write", "dashboard:read:*", "event:read:*"};
    }
    if (normalized_role == "viewer") {
        if (!normalized_view.empty()) {
            return {"view:read:" + normalized_view,
                    "dashboard:read:" + normalized_view,
                    "event:read:" + normalized_view,
                    "metadata:read:" + normalized_view};
        }
        return {"view:read:__unassigned__",
                "dashboard:read:__unassigned__",
                "event:read:__unassigned__",
                "metadata:read:__unassigned__"};
    }
    if (normalized_role == "integrator") {
        if (!normalized_view.empty()) {
            return {"metadata:read:" + normalized_view, "event:read:" + normalized_view};
        }
        return {"metadata:read:__unassigned__", "event:read:__unassigned__"};
    }
    return {};
}

AuthUserResult ListAuthUsers(const app::AppConfig& config) {
    std::string load_error;
    const auto users = LoadUsers(config.auth_users_file, &load_error);
    if (!users.has_value()) {
        return UserError(404, "Not Found", load_error);
    }
    return UserJsonResult(200, "OK", UsersJson(*users));
}

AuthUserResult CreateAuthUser(const app::AppConfig& config,
                              const UserMutation& mutation) {
    if (!PasswordHashingAvailable()) {
        return UserError(503, "Service Unavailable", "safe password hashing is unavailable; build with libsodium");
    }
    UserMutation normalized = mutation;
    if (normalized.role.empty()) {
        normalized.role = "viewer";
    }
    if (const auto validation = ValidateUserMutation(normalized, true); validation.has_value()) {
        return UserError(400, "Bad Request", *validation);
    }
    std::string load_error;
    auto users = LoadUsers(config.auth_users_file, &load_error);
    if (!users.has_value()) {
        return UserError(404, "Not Found", load_error);
    }
    if (FindUserIndex(*users, normalized.username).has_value()) {
        return UserError(409, "Conflict", "user already exists");
    }
    UserRecord candidate;
    candidate.username = normalized.username;
    candidate.display_name =
        normalized.display_name.empty() ? normalized.username : normalized.display_name;
    candidate.role = normalized.role;
    candidate.scopes = ScopesFromMutation(normalized);
    if (const auto scope_error = ValidateScopesForRole(candidate.role, candidate.scopes);
        scope_error.has_value()) {
        return UserError(400, "Bad Request", *scope_error);
    }
    candidate.enabled = normalized.has_enabled ? normalized.enabled : true;
    candidate.must_change_password =
        normalized.has_must_change_password ? normalized.must_change_password : true;
    const PasswordPolicyResult policy =
        ValidatePasswordPolicy(config, candidate.username, normalized.password, normalized.password, nullptr);
    if (!policy.ok) {
        return UserError(400, "Bad Request", policy.message);
    }
    std::string hash_error;
    auto password_hash = GeneratePasswordHash(normalized.password, &hash_error);
    if (!password_hash.has_value()) {
        return UserError(500, "Internal Server Error", hash_error);
    }
    const std::string now = IsoUtcNow();
    candidate.password_hash = *password_hash;
    candidate.password_history = {*password_hash};
    candidate.created_at = now;
    candidate.password_updated_at = now;
    if (!candidate.enabled) {
        candidate.disabled_at = now;
    }
    users->push_back(candidate);
    std::string save_error;
    if (!SaveUsersFile(config.auth_users_file, *users, &save_error)) {
        return UserError(500, "Internal Server Error", save_error);
    }
    std::ostringstream body;
    body << "{\"status\":\"created\",\"user\":";
    AppendPublicUserJson(body, candidate);
    body << "}";
    return UserJsonResult(201, "Created", body.str(), candidate.username);
}

AuthUserResult UpdateAuthUser(const app::AppConfig& config,
                              const std::string& username,
                              const UserMutation& mutation) {
    std::string load_error;
    auto users = LoadUsers(config.auth_users_file, &load_error);
    if (!users.has_value()) {
        return UserError(404, "Not Found", load_error);
    }
    const auto index = FindUserIndex(*users, username);
    if (!index.has_value()) {
        return UserError(404, "Not Found", "user not found");
    }
    UserRecord& user = (*users)[*index];
    const std::string next_role = mutation.role.empty() ? user.role : mutation.role;
    if (!IsKnownRole(next_role)) {
        return UserError(400, "Bad Request", "role은 admin/operator/viewer/integrator 중 하나여야 합니다.");
    }
    const bool next_enabled = mutation.has_enabled ? mutation.enabled : user.enabled;
    if (user.enabled && user.role == "admin" &&
        (!next_enabled || next_role != "admin") &&
        !HasAnotherEnabledAdmin(*users, user.username)) {
        return UserError(409, "Conflict", "마지막 활성 admin 계정은 비활성화하거나 role을 변경할 수 없습니다.");
    }
    if (!mutation.display_name.empty()) {
        user.display_name = mutation.display_name;
    }
    user.role = next_role;
    if (!mutation.scopes.empty() || !mutation.view_id.empty() || user.scopes.empty()) {
        user.scopes = ScopesFromMutation(UserMutation{.role = user.role,
                                                      .view_id = mutation.view_id,
                                                      .scopes = mutation.scopes});
    }
    if (const auto scope_error = ValidateScopesForRole(user.role, user.scopes);
        scope_error.has_value()) {
        return UserError(400, "Bad Request", *scope_error);
    }
    if (mutation.has_must_change_password) {
        user.must_change_password = mutation.must_change_password;
    }
    if (mutation.has_enabled) {
        user.enabled = mutation.enabled;
        if (user.enabled) {
            user.disabled_at.clear();
        } else if (user.disabled_at.empty()) {
            user.disabled_at = IsoUtcNow();
        }
    }
    std::string save_error;
    if (!SaveUsersFile(config.auth_users_file, *users, &save_error)) {
        return UserError(500, "Internal Server Error", save_error);
    }
    std::ostringstream body;
    body << "{\"status\":\"updated\",\"user\":";
    AppendPublicUserJson(body, user);
    body << "}";
    return UserJsonResult(200, "OK", body.str(), user.username);
}

AuthUserResult ResetAuthUserPassword(const app::AppConfig& config,
                                     const std::string& username,
                                     const std::string& password) {
    if (!PasswordHashingAvailable()) {
        return UserError(503, "Service Unavailable", "safe password hashing is unavailable; build with libsodium");
    }
    if (password.empty()) {
        return UserError(400, "Bad Request", "password is required");
    }
    std::string load_error;
    auto users = LoadUsers(config.auth_users_file, &load_error);
    if (!users.has_value()) {
        return UserError(404, "Not Found", load_error);
    }
    const auto index = FindUserIndex(*users, username);
    if (!index.has_value()) {
        return UserError(404, "Not Found", "user not found");
    }
    UserRecord& user = (*users)[*index];
    const PasswordPolicyResult policy =
        ValidatePasswordPolicy(config, user.username, password, password, &user);
    if (!policy.ok) {
        return UserError(400, "Bad Request", policy.message);
    }
    std::string hash_error;
    auto password_hash = GeneratePasswordHash(password, &hash_error);
    if (!password_hash.has_value()) {
        return UserError(500, "Internal Server Error", hash_error);
    }
    std::vector<std::string> history;
    history.push_back(*password_hash);
    if (!user.password_hash.empty()) {
        history.push_back(user.password_hash);
    }
    for (const std::string& hash : user.password_history) {
        if (std::find(history.begin(), history.end(), hash) == history.end()) {
            history.push_back(hash);
        }
    }
    if (config.auth_password_history_count >= 0 &&
        static_cast<int>(history.size()) > config.auth_password_history_count) {
        history.resize(static_cast<std::size_t>(config.auth_password_history_count));
    }
    user.password_hash = *password_hash;
    user.password_history = std::move(history);
    user.password_updated_at = IsoUtcNow();
    user.must_change_password = true;
    user.failed_login_count = 0;
    user.locked_until.clear();
    user.last_failed_login_at.clear();
    std::string save_error;
    if (!SaveUsersFile(config.auth_users_file, *users, &save_error)) {
        return UserError(500, "Internal Server Error", save_error);
    }
    std::ostringstream body;
    body << "{\"status\":\"passwordReset\",\"user\":";
    AppendPublicUserJson(body, user);
    body << "}";
    return UserJsonResult(200, "OK", body.str(), user.username);
}

AuthUserResult SetAuthUserEnabled(const app::AppConfig& config,
                                  const std::string& username,
                                  bool enabled) {
    std::string load_error;
    auto users = LoadUsers(config.auth_users_file, &load_error);
    if (!users.has_value()) {
        return UserError(404, "Not Found", load_error);
    }
    const auto index = FindUserIndex(*users, username);
    if (!index.has_value()) {
        return UserError(404, "Not Found", "user not found");
    }
    UserRecord& user = (*users)[*index];
    if (!enabled && user.enabled && user.role == "admin" &&
        !HasAnotherEnabledAdmin(*users, user.username)) {
        return UserError(409, "Conflict", "마지막 활성 admin 계정은 비활성화할 수 없습니다.");
    }
    user.enabled = enabled;
    if (enabled) {
        user.disabled_at.clear();
        user.failed_login_count = 0;
        user.locked_until.clear();
        user.last_failed_login_at.clear();
    } else if (user.disabled_at.empty()) {
        user.disabled_at = IsoUtcNow();
    }
    std::string save_error;
    if (!SaveUsersFile(config.auth_users_file, *users, &save_error)) {
        return UserError(500, "Internal Server Error", save_error);
    }
    std::ostringstream body;
    body << "{\"status\":\"" << (enabled ? "enabled" : "disabled") << "\",\"user\":";
    AppendPublicUserJson(body, user);
    body << "}";
    return UserJsonResult(200, "OK", body.str(), user.username);
}

AuthUserResult CreateAuthUserFromJson(const app::AppConfig& config,
                                      const std::string& body) {
    return CreateAuthUser(config, UserMutationFromJson(body));
}

AuthUserResult UpdateAuthUserFromJson(const app::AppConfig& config,
                                      const std::string& username,
                                      const std::string& body) {
    UserMutation mutation = UserMutationFromJson(body);
    if (!mutation.username.empty() && mutation.username != username) {
        return UserError(400, "Bad Request", "path username and body username do not match");
    }
    mutation.username = username;
    return UpdateAuthUser(config, username, mutation);
}

AuthUserResult ResetAuthUserPasswordFromJson(const app::AppConfig& config,
                                             const std::string& username,
                                             const std::string& body) {
    const std::string password = ParseStringField(body, "password").value_or("");
    return ResetAuthUserPassword(config, username, password);
}

AuthUserResult CreateInviteFromJson(const app::AppConfig& config,
                                    const std::string& body) {
    if (!PasswordHashingAvailable()) {
        return UserError(503, "Service Unavailable", "safe password hashing is unavailable; build with libsodium");
    }
    UserMutation mutation = UserMutationFromJson(body);
    if (mutation.role.empty()) {
        mutation.role = "viewer";
    }
    if (const auto validation = ValidateUserMutation(mutation, false); validation.has_value()) {
        return UserError(400, "Bad Request", *validation);
    }
    std::vector<std::string> scopes = ScopesFromMutation(mutation);
    if (const auto scope_error = ValidateScopesForRole(mutation.role, scopes); scope_error.has_value()) {
        return UserError(400, "Bad Request", *scope_error);
    }

    std::string load_error;
    AuthStore store = LoadAuthStoreOrEmpty(config.auth_users_file, &load_error);
    if (!load_error.empty()) {
        return UserError(500, "Internal Server Error", load_error);
    }
    const std::string now = IsoUtcNow();
    const auto user_index = FindUserIndex(store.users, mutation.username);
    UserRecord user_preview;
    if (user_index.has_value()) {
        const UserRecord& existing_user = store.users[*user_index];
        if (existing_user.enabled && existing_user.role == "admin" && mutation.role != "admin" &&
            !HasAnotherEnabledAdmin(store.users, existing_user.username)) {
            return UserError(409, "Conflict", "마지막 활성 admin 계정은 invite로 role을 변경할 수 없습니다.");
        }
        user_preview = existing_user;
    } else {
        user_preview.username = mutation.username;
        user_preview.display_name =
            mutation.display_name.empty() ? mutation.username : mutation.display_name;
        user_preview.role = mutation.role;
        user_preview.scopes = scopes;
        user_preview.enabled = false;
        user_preview.must_change_password = true;
        user_preview.created_at = now;
        user_preview.disabled_at = now;
    }

    std::string token_error;
    const auto raw_token = GenerateSessionId(&token_error);
    if (!raw_token.has_value()) {
        return UserError(503, "Service Unavailable", token_error);
    }
    const auto token_hash = GeneratePasswordHash(*raw_token, &token_error);
    if (!token_hash.has_value()) {
        return UserError(500, "Internal Server Error", token_error);
    }
    const int ttl_seconds = std::max(60, ParseIntField(body, "ttlSeconds").value_or(86400));
    InviteRecord invite;
    invite.invite_id = "invite-" + raw_token->substr(0, 16);
    invite.username = mutation.username;
    invite.display_name =
        mutation.display_name.empty() ? user_preview.display_name : mutation.display_name;
    invite.role = mutation.role;
    invite.view_id = mutation.view_id;
    invite.scopes = scopes;
    invite.token_hash = *token_hash;
    invite.expires_at = IsoUtcAfterSeconds(ttl_seconds);
    invite.created_at = now;
    invite.created_by = "admin";
    store.invites.push_back(invite);

    std::string save_error;
    if (!SaveAuthStore(config.auth_users_file, store, &save_error)) {
        return UserError(500, "Internal Server Error", save_error);
    }
    std::ostringstream out;
    out << "{\"status\":\"inviteCreated\",\"user\":";
    AppendPublicUserJson(out, user_preview);
    out << ",\"invite\":";
    AppendPublicInviteJson(out, invite, *raw_token);
    out << "}";
    return UserJsonResult(201, "Created", out.str());
}

AuthUserResult CompleteInvitePasswordSetup(const app::AppConfig& config,
                                           const std::string& token,
                                           const std::string& password,
                                           const std::string& confirm) {
    if (!PasswordHashingAvailable()) {
        return UserError(503, "Service Unavailable", "safe password hashing is unavailable; build with libsodium");
    }
    if (Trim(token).empty()) {
        return UserError(400, "Bad Request", "invite token is required");
    }
    std::string load_error;
    auto store = LoadAuthStore(config.auth_users_file, &load_error);
    if (!store.has_value()) {
        return UserError(404, "Not Found", load_error);
    }

    for (InviteRecord& invite : store->invites) {
        if (invite.used || invite.token_hash.empty() ||
            !VerifySecretHash(token, invite.token_hash, nullptr)) {
            continue;
        }
        if (!IsoUtcInFuture(invite.expires_at)) {
            return UserError(410, "Gone", "invite token expired");
        }
        const auto index = FindUserIndex(store->users, invite.username);
        UserRecord* user = nullptr;
        if (index.has_value()) {
            user = &store->users[*index];
            if (user->enabled && user->role == "admin" && invite.role != "admin" &&
                !HasAnotherEnabledAdmin(store->users, user->username)) {
                return UserError(409, "Conflict", "마지막 활성 admin 계정은 invite로 role을 변경할 수 없습니다.");
            }
        } else {
            UserRecord candidate;
            candidate.username = invite.username;
            candidate.display_name =
                invite.display_name.empty() ? invite.username : invite.display_name;
            candidate.role = invite.role;
            candidate.scopes = invite.scopes.empty()
                                   ? ScopeTemplateForRole(invite.role, invite.view_id)
                                   : invite.scopes;
            candidate.enabled = false;
            candidate.must_change_password = true;
            candidate.created_at = IsoUtcNow();
            store->users.push_back(candidate);
            user = &store->users.back();
        }

        user->display_name = invite.display_name.empty() ? user->display_name : invite.display_name;
        user->role = invite.role;
        user->scopes = invite.scopes.empty()
                           ? ScopeTemplateForRole(invite.role, invite.view_id)
                           : invite.scopes;
        if (const auto scope_error = ValidateScopesForRole(user->role, user->scopes);
            scope_error.has_value()) {
            return UserError(400, "Bad Request", *scope_error);
        }
        const PasswordPolicyResult policy =
            ValidatePasswordPolicy(config, user->username, password, confirm, user);
        if (!policy.ok) {
            return UserError(400, "Bad Request", policy.message);
        }
        std::string hash_error;
        const auto password_hash = GeneratePasswordHash(password, &hash_error);
        if (!password_hash.has_value()) {
            return UserError(500, "Internal Server Error", hash_error);
        }
        std::vector<std::string> history;
        history.push_back(*password_hash);
        if (!user->password_hash.empty()) {
            history.push_back(user->password_hash);
        }
        for (const std::string& hash : user->password_history) {
            if (std::find(history.begin(), history.end(), hash) == history.end()) {
                history.push_back(hash);
            }
        }
        if (config.auth_password_history_count >= 0 &&
            static_cast<int>(history.size()) > config.auth_password_history_count) {
            history.resize(static_cast<std::size_t>(config.auth_password_history_count));
        }
        const std::string now = IsoUtcNow();
        user->password_hash = *password_hash;
        user->password_history = std::move(history);
        user->password_updated_at = now;
        user->must_change_password = false;
        user->enabled = true;
        user->disabled_at.clear();
        user->failed_login_count = 0;
        user->locked_until.clear();
        user->last_failed_login_at.clear();
        if (user->created_at.empty()) {
            user->created_at = now;
        }
        invite.used = true;
        invite.used_at = now;
        invite.token_hash.clear();

        std::string save_error;
        if (!SaveAuthStore(config.auth_users_file, *store, &save_error)) {
            return UserError(500, "Internal Server Error", save_error);
        }
        std::ostringstream out;
        out << "{\"status\":\"inviteAccepted\",\"user\":";
        AppendPublicUserJson(out, *user);
        out << "}";
        return UserJsonResult(200, "OK", out.str(), user->username);
    }
    return UserError(401, "Unauthorized", "invalid invite token");
}

AuthUserResult ListAccessRequests(const app::AppConfig& config) {
    std::string load_error;
    AuthStore store = LoadAuthStoreOrEmpty(config.auth_users_file, &load_error);
    if (!load_error.empty()) {
        return UserError(500, "Internal Server Error", load_error);
    }
    return UserJsonResult(200, "OK", AccessRequestsJson(store.access_requests));
}

AuthUserResult CreateAccessRequestFromJson(const app::AppConfig& config,
                                           const std::string& body) {
    AccessRequestRecord request;
    request.username = Trim(ParseStringField(body, "username").value_or(""));
    request.display_name = Trim(ParseStringField(body, "displayName").value_or(request.username));
    request.contact = Trim(ParseStringField(body, "contact").value_or(""));
    request.reason = Trim(ParseStringField(body, "reason").value_or(""));
    request.view_id = Trim(ParseStringField(body, "viewId").value_or(""));
    if (const auto validation_error = ValidateAccessRequestPayload(body, request);
        validation_error.has_value()) {
        const bool oversized = *validation_error == "access request body is too large";
        return UserError(oversized ? 413 : 400,
                         oversized ? "Payload Too Large" : "Bad Request",
                         *validation_error);
    }

    std::string load_error;
    AuthStore store = LoadAuthStoreOrEmpty(config.auth_users_file, &load_error);
    if (!load_error.empty()) {
        return UserError(500, "Internal Server Error", load_error);
    }
    if (std::any_of(store.users.begin(), store.users.end(), [&](const UserRecord& user) {
            return EqualsCaseInsensitive(user.username, request.username);
        })) {
        return UserError(409, "Conflict", "user already exists");
    }
    std::size_t pending_count = 0;
    for (const AccessRequestRecord& existing : store.access_requests) {
        if (existing.status != "pending") {
            continue;
        }
        ++pending_count;
        const bool same_username = EqualsCaseInsensitive(existing.username, request.username);
        const bool same_contact = !request.contact.empty() &&
                                  !existing.contact.empty() &&
                                  EqualsCaseInsensitive(existing.contact, request.contact);
        if (same_username || same_contact) {
            return UserError(409, "Conflict", "matching access request is already pending");
        }
    }
    if (pending_count >= kAccessRequestMaxPendingRecords) {
        return UserError(429, "Too Many Requests", "too many pending access requests");
    }

    std::string token_error;
    const auto request_token = GenerateSessionId(&token_error);
    if (!request_token.has_value()) {
        return UserError(503, "Service Unavailable", token_error);
    }
    request.request_id = "request-" + request_token->substr(0, 16);
    request.status = "pending";
    request.created_at = IsoUtcNow();

    store.access_requests.push_back(request);
    std::string save_error;
    if (!SaveAuthStore(config.auth_users_file, store, &save_error)) {
        return UserError(500, "Internal Server Error", save_error);
    }
    std::ostringstream out;
    out << "{\"status\":\"pending\",\"accessRequest\":";
    AppendPublicAccessRequestJson(out, request);
    out << "}";
    return UserJsonResult(201, "Created", out.str());
}

AuthUserResult ApproveAccessRequestFromJson(const app::AppConfig& config,
                                            const std::string& request_id,
                                            const std::string& body) {
    if (!PasswordHashingAvailable()) {
        return UserError(503, "Service Unavailable", "safe password hashing is unavailable; build with libsodium");
    }
    std::string load_error;
    auto store = LoadAuthStore(config.auth_users_file, &load_error);
    if (!store.has_value()) {
        return UserError(404, "Not Found", load_error);
    }
    const auto request_index = FindAccessRequestIndex(store->access_requests, request_id);
    if (!request_index.has_value()) {
        return UserError(404, "Not Found", "access request not found");
    }
    AccessRequestRecord& request = store->access_requests[*request_index];
    if (request.status != "pending") {
        return UserError(409, "Conflict", "access request is not pending");
    }
    const std::string view_id =
        Trim(ParseStringField(body, "viewId").value_or(request.view_id));
    std::vector<std::string> scopes;
    if (const auto array = ExtractArrayField(body, "scopes"); array.has_value()) {
        scopes = ParseStringArray(*array);
    }
    if (scopes.empty()) {
        scopes = ScopeTemplateForRole("viewer", view_id);
    }
    if (const auto scope_error = ValidateScopesForRole("viewer", scopes); scope_error.has_value()) {
        return UserError(400, "Bad Request", *scope_error);
    }

    const std::string now = IsoUtcNow();
    UserRecord user_preview;
    const auto user_index = FindUserIndex(store->users, request.username);
    if (user_index.has_value()) {
        const UserRecord& existing_user = store->users[*user_index];
        if (existing_user.role != "viewer") {
            return UserError(409, "Conflict", "existing user is not a viewer account");
        }
        user_preview = existing_user;
    } else {
        user_preview.username = request.username;
        user_preview.display_name =
            request.display_name.empty() ? request.username : request.display_name;
        user_preview.role = "viewer";
        user_preview.scopes = scopes;
        user_preview.enabled = false;
        user_preview.must_change_password = true;
        user_preview.created_at = now;
        user_preview.disabled_at = now;
    }

    std::string token_error;
    const auto raw_token = GenerateSessionId(&token_error);
    if (!raw_token.has_value()) {
        return UserError(503, "Service Unavailable", token_error);
    }
    const auto token_hash = GeneratePasswordHash(*raw_token, &token_error);
    if (!token_hash.has_value()) {
        return UserError(500, "Internal Server Error", token_error);
    }
    const int ttl_seconds = std::max(60, ParseIntField(body, "ttlSeconds").value_or(86400));
    InviteRecord invite;
    invite.invite_id = "invite-" + raw_token->substr(0, 16);
    invite.username = request.username;
    invite.display_name =
        request.display_name.empty() ? user_preview.display_name : request.display_name;
    invite.role = "viewer";
    invite.view_id = view_id;
    invite.scopes = scopes;
    invite.token_hash = *token_hash;
    invite.expires_at = IsoUtcAfterSeconds(ttl_seconds);
    invite.created_at = now;
    invite.created_by = "admin";
    store->invites.push_back(invite);

    request.status = "approved";
    request.decided_at = now;
    request.decided_by = "admin";
    request.invite_id = invite.invite_id;
    std::string save_error;
    if (!SaveAuthStore(config.auth_users_file, *store, &save_error)) {
        return UserError(500, "Internal Server Error", save_error);
    }
    std::ostringstream out;
    out << "{\"status\":\"approved\",\"accessRequest\":";
    AppendPublicAccessRequestJson(out, request);
    out << ",\"user\":";
    AppendPublicUserJson(out, user_preview);
    out << ",\"invite\":";
    AppendPublicInviteJson(out, invite, *raw_token);
    out << "}";
    return UserJsonResult(200, "OK", out.str());
}

AuthUserResult RejectAccessRequest(const app::AppConfig& config,
                                   const std::string& request_id) {
    std::string load_error;
    auto store = LoadAuthStore(config.auth_users_file, &load_error);
    if (!store.has_value()) {
        return UserError(404, "Not Found", load_error);
    }
    const auto request_index = FindAccessRequestIndex(store->access_requests, request_id);
    if (!request_index.has_value()) {
        return UserError(404, "Not Found", "access request not found");
    }
    AccessRequestRecord& request = store->access_requests[*request_index];
    if (request.status != "pending") {
        return UserError(409, "Conflict", "access request is not pending");
    }
    request.status = "rejected";
    request.decided_at = IsoUtcNow();
    request.decided_by = "admin";
    std::string save_error;
    if (!SaveAuthStore(config.auth_users_file, *store, &save_error)) {
        return UserError(500, "Internal Server Error", save_error);
    }
    std::ostringstream out;
    out << "{\"status\":\"rejected\",\"accessRequest\":";
    AppendPublicAccessRequestJson(out, request);
    out << "}";
    return UserJsonResult(200, "OK", out.str());
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
    AuthStore store;
    std::error_code exists_ec;
    const bool exists = std::filesystem::exists(config.auth_users_file, exists_ec);
    if (exists_ec) {
        if (error_message != nullptr) {
            *error_message = "failed to inspect auth users file: " + exists_ec.message();
        }
        return false;
    }
    if (exists) {
        std::string load_error;
        const auto loaded = LoadAuthStore(config.auth_users_file, &load_error);
        if (!loaded.has_value()) {
            if (error_message != nullptr) {
                *error_message = load_error;
            }
            return false;
        }
        store = *loaded;
    }

    const std::string now = IsoUtcNow();
    bool updated = false;
    for (UserRecord& user : store.users) {
        if (user.username != "admin") {
            continue;
        }
        user.display_name = user.display_name.empty() ? "Admin" : user.display_name;
        user.role = "admin";
        user.scopes = {"*"};
        user.password_hash = *password_hash;
        user.password_history = {*password_hash};
        user.enabled = true;
        user.must_change_password = false;
        user.failed_login_count = 0;
        user.locked_until.clear();
        user.last_failed_login_at.clear();
        if (user.created_at.empty()) {
            user.created_at = now;
        }
        user.password_updated_at = now;
        user.disabled_at.clear();
        updated = true;
        break;
    }
    if (!updated) {
        store.users.insert(store.users.begin(),
                           UserRecord{
                               .username = "admin",
                               .display_name = "Admin",
                               .role = "admin",
                               .scopes = {"*"},
                               .password_hash = *password_hash,
                               .password_history = {*password_hash},
                               .token_hash = "",
                               .enabled = true,
                               .must_change_password = false,
                               .failed_login_count = 0,
                               .locked_until = "",
                               .last_failed_login_at = "",
                               .created_at = now,
                               .password_updated_at = now,
                               .last_login_at = "",
                               .last_login_ip = "",
                               .disabled_at = "",
                           });
    }
    return SaveAuthStore(config.auth_users_file, store, error_message);
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
