// 파일 요약: transport가 analysis 구현 타입 없이 category catalog를 조회하는 application 경계다.
#pragma once

#include <string>
#include <vector>

namespace ingress {

struct CategoryCatalogItemView {
    std::string token;
    std::string label_ko;
    std::string hint;
    std::string group;
    std::vector<std::string> aliases;
    std::vector<std::string> labels;
    std::vector<std::string> display_labels_ko;
};

std::vector<CategoryCatalogItemView> CategoryCatalog();
std::string CategoryCatalogJson();

}  // namespace ingress
