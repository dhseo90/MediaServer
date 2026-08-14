#pragma once
// 파일 용도: 중복 키와 타입 경계를 엄격히 검사하는 JSON 파서 계약을 선언한다.
#include <optional>
#include <string>
#include <unordered_set>
#include <vector>

namespace ingress {

enum class StrictJsonType {
    Null,
    Bool,
    Number,
    String,
    Object,
    Array,
};

struct StrictJsonMember {
    std::string key;
    StrictJsonType type{StrictJsonType::Null};
    std::string raw;
    std::string string_value;
    bool bool_value{false};
};

struct StrictJsonObjectDocument {
    std::vector<StrictJsonMember> members;
    std::unordered_set<std::string> all_keys;

    const StrictJsonMember* Find(const std::string& key) const;
};

bool ParseStrictJsonObjectDocument(const std::string& json,
                                   StrictJsonObjectDocument* document,
                                   std::string* error_message);
std::optional<std::string> StrictJsonStringField(const StrictJsonObjectDocument& document,
                                                 const std::string& key);
std::optional<bool> StrictJsonBoolField(const StrictJsonObjectDocument& document,
                                        const std::string& key);
std::optional<std::string> StrictJsonObjectField(const StrictJsonObjectDocument& document,
                                                 const std::string& key);
bool StrictJsonFieldIsNull(const StrictJsonObjectDocument& document,
                           const std::string& key);
bool StrictJsonHasTopLevelField(const StrictJsonObjectDocument& document,
                                const std::string& key);
bool StrictJsonContainsKey(const StrictJsonObjectDocument& document,
                           const std::string& key);

}  // namespace ingress
