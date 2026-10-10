#pragma once
// 파일 용도: 중복 키와 타입 경계를 엄격히 검사하는 JSON 파서 계약을 선언한다.
#include <optional>
#include <string>
#include <string_view>
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
    // Populated only by the borrowed-array API; valid while its input lives.
    std::string_view array_view;
};

struct StrictJsonObjectDocument {
    std::vector<StrictJsonMember> members;
    std::unordered_set<std::string> all_keys;

    const StrictJsonMember* Find(const std::string& key) const;
};

// Allocation-free lexical census for caller-specific pre-allocation admission.
// It does not validate JSON. The strict parser must still run afterwards.
struct StrictJsonStorageShape {
    std::size_t strings{0}, string_bytes{0}, array_elements{0}, top_members{0};
    std::size_t total_keys{0}, max_live_keys{0}, max_live_key_bytes{0}, max_depth{0};
    std::size_t value_strings{0}, value_string_bytes{0}, largest_string_bytes{0};
    std::size_t top_string_bytes{0}, top_object_bytes{0}, max_array_element_bytes{0};
};
StrictJsonStorageShape InspectStrictJsonStorageShape(std::string_view json);
// Caller supplies simultaneous owning raw copies (including serialization, if
// applicable) and its largest typed array element. No limit or parsing is added.
std::size_t StrictJsonWorkspaceBytes(std::string_view json,std::size_t raw_copy_layers,
                                   std::size_t largest_typed_array_element,bool collect_all_keys=true);
bool ParseStrictJsonObjectDocumentWithoutKeyIndex(const std::string& json,
                                                  StrictJsonObjectDocument* document,
                                                  std::string* error_message);
bool ParseStrictJsonObjectDocument(const std::string& json,
                                   StrictJsonObjectDocument* document,
                                   std::string* error_message);
// Uses exactly the same syntax/duplicate/depth validation. Array payloads are
// borrowed and all_keys is intentionally not populated; Find remains available.
bool ParseStrictJsonObjectDocumentArrayViews(const std::string& json,
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
