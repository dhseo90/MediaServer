// 파일 요약: VLM profile JSON 문서 경계를 domain strict parser에 결속한다.
// 동작 요약: strict duplicate-key/type 검사를 보존하면서 transport에는 불투명 조회 API만 반환한다.
#include "ingress/vlm_profile_json_document.h"

#include <utility>

#include "domain/strict_json.h"

namespace ingress {

struct VlmProfileJsonDocument::State {
    StrictJsonObjectDocument document;
};

VlmProfileJsonDocument::VlmProfileJsonDocument() = default;

VlmProfileJsonDocument::VlmProfileJsonDocument(std::shared_ptr<const State> state)
    : state_(std::move(state)) {}

bool VlmProfileJsonDocument::Parse(const std::string& body,
                                   VlmProfileJsonDocument* document,
                                   std::string* error_message) {
    if (document == nullptr) {
        if (error_message != nullptr) {
            *error_message = "VLM profile JSON output document is required";
        }
        return false;
    }
    auto state = std::make_shared<State>();
    if (!ParseStrictJsonObjectDocument(body, &state->document, error_message)) {
        *document = VlmProfileJsonDocument();
        return false;
    }
    *document = VlmProfileJsonDocument(std::move(state));
    return true;
}

bool VlmProfileJsonDocument::ContainsKey(const std::string& key) const {
    return state_ != nullptr && StrictJsonContainsKey(state_->document, key);
}

bool VlmProfileJsonDocument::HasTopLevelField(const std::string& key) const {
    return state_ != nullptr && StrictJsonHasTopLevelField(state_->document, key);
}

bool VlmProfileJsonDocument::FieldIsNull(const std::string& key) const {
    return state_ != nullptr && StrictJsonFieldIsNull(state_->document, key);
}

std::optional<std::string> VlmProfileJsonDocument::StringField(const std::string& key) const {
    if (state_ == nullptr) {
        return std::nullopt;
    }
    return StrictJsonStringField(state_->document, key);
}

std::optional<bool> VlmProfileJsonDocument::BoolField(const std::string& key) const {
    if (state_ == nullptr) {
        return std::nullopt;
    }
    return StrictJsonBoolField(state_->document, key);
}

std::optional<std::string> VlmProfileJsonDocument::ObjectField(const std::string& key) const {
    if (state_ == nullptr) {
        return std::nullopt;
    }
    return StrictJsonObjectField(state_->document, key);
}

}  // namespace ingress
