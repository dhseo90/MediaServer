// 파일 요약: VLM profile 계약 검증이 사용하는 JSON object 조회 경계를 선언한다.
// 동작 요약: transport가 domain strict JSON 구현 타입을 직접 소유하지 않도록 불투명 문서 view를 제공한다.
#pragma once

#include <memory>
#include <optional>
#include <string>

namespace ingress {

class VlmProfileJsonDocument {
public:
    VlmProfileJsonDocument();

    static bool Parse(const std::string& body,
                      VlmProfileJsonDocument* document,
                      std::string* error_message);

    bool ContainsKey(const std::string& key) const;
    bool HasTopLevelField(const std::string& key) const;
    bool FieldIsNull(const std::string& key) const;
    std::optional<std::string> StringField(const std::string& key) const;
    std::optional<bool> BoolField(const std::string& key) const;
    std::optional<std::string> ObjectField(const std::string& key) const;

private:
    struct State;
    explicit VlmProfileJsonDocument(std::shared_ptr<const State> state);

    std::shared_ptr<const State> state_;
};

}  // namespace ingress
