// 파일 용도: transport auth 타입과 분리된 제품 UI 계정 표시·capability DTO를 선언한다.
#pragma once

#include <string>
#include <vector>

namespace ingress {

struct ProductUiPrincipalView {
    std::string display_name;
    std::string role;
    std::string auth_mode;
    std::vector<std::string> scopes;
    bool is_admin{false};
    bool can_access_ops_sources{false};
};

}  // namespace ingress
