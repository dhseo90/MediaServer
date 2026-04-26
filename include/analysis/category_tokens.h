// 파일 용도: VA tracker와 event rule engine이 공유하는 객체 카테고리 토큰 해석 함수를 선언한다.
#pragma once

#include <string>
#include <vector>

namespace analysis {

struct CategoryTokenInfo {
    std::string token;
    std::string label_ko;
    std::string hint;
    std::string group;
    std::vector<std::string> aliases;
    std::vector<std::string> labels;
    std::vector<std::string> display_labels_ko;
};

// class label/id 비교가 대소문자와 공백 표기에 흔들리지 않도록 정규화한다.
std::string NormalizeClassToken(std::string value);

// JSON/API에서 전체 class를 뜻하는 토큰인지 확인한다.
bool IsAllClassesToken(const std::string& value);

// Rule UI, capabilities API, tracker/rule engine이 공유하는 카테고리 목록을 반환한다.
const std::vector<CategoryTokenInfo>& CategoryTokenCatalog();

// Rule UI와 tracker가 공유하는 큰 카테고리 토큰을 실제 COCO label 묶음으로 확장한다.
bool MatchesCategoryToken(const std::string& wanted, const std::string& label);

}  // namespace analysis
