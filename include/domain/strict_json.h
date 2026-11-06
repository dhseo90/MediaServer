#pragma once
// 파일 용도: 중복 키와 타입 경계를 엄격히 검사하는 JSON 파서 계약을 선언한다.
#include <optional>
#include <functional>
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
    // borrowed-array API만 이 값을 채우며 입력이 살아 있는 동안만 유효하다.
    std::string_view array_view;
};

struct StrictJsonObjectDocument {
    std::vector<StrictJsonMember> members;
    std::unordered_set<std::string> all_keys;

    const StrictJsonMember* Find(const std::string& key) const;
};

// 호출자의 할당 전 허용 검사를 위해 할당 없이 어휘적 저장 형태를 센다.
// JSON 유효성 검사가 아니므로 이후에도 strict parser를 반드시 실행한다.
struct StrictJsonStorageShape {
    std::size_t strings{0}, string_bytes{0}, array_elements{0}, top_members{0};
    std::size_t total_keys{0}, max_live_keys{0}, max_live_key_bytes{0}, max_depth{0};
    std::size_t value_strings{0}, value_string_bytes{0}, largest_string_bytes{0};
    std::size_t top_string_bytes{0}, top_object_bytes{0}, max_array_element_bytes{0};
};
StrictJsonStorageShape InspectStrictJsonStorageShape(std::string_view json);
// 호출자는 동시에 소유하는 raw 사본 수와 가장 큰 typed array 원소 크기를 제공한다.
// 해당하는 경우 직렬화 사본도 포함하며 여기서 새 한도나 parsing을 추가하지 않는다.
std::size_t StrictJsonWorkspaceBytes(std::string_view json,std::size_t raw_copy_layers,
                                   std::size_t largest_typed_array_element,bool collect_all_keys=true);
bool ParseStrictJsonObjectDocumentWithoutKeyIndex(const std::string& json,
                                                  StrictJsonObjectDocument* document,
                                                  std::string* error_message);
bool ParseStrictJsonObjectDocument(const std::string& json,
                                   StrictJsonObjectDocument* document,
                                   std::string* error_message);
// 동일한 구문·중복·깊이 검증을 사용하며 array payload는 빌려 쓴다.
// all_keys는 의도적으로 채우지 않지만 Find는 계속 사용할 수 있다.
bool ParseStrictJsonObjectDocumentArrayViews(const std::string& json,
                                             StrictJsonObjectDocument* document,
                                             std::string* error_message);
// 같은 strict 순회에서 선택한 최상위 array 하나의 객체 원소를 소비한다.
// 모든 구문·중복·깊이 검사를 유지하며 소비자는 호출 종료 뒤 parser 참조를 보유하지 않는다.
// 호출자는 전체 처리 성공 뒤에만 결과를 공개해야 한다.
// 선택한 member는 Array 유형으로 표현하며 소유하는 raw payload는 없다.
bool ParseStrictJsonObjectDocumentObjectArray(const std::string& json,
    const std::string& array_key, StrictJsonObjectDocument* document,
    const std::function<bool(const StrictJsonObjectDocument&)>& consumer,
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
