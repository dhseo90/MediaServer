// 파일 용도: 제품 UI에서 공통으로 쓰는 아이콘과 테마 버튼 HTML 생성 함수를 선언한다.
#pragma once

#include <string>

namespace ingress {

std::string ProductThemeToggleButtonHtml();
std::string ProductNavIconSvg(const std::string& key);
std::string ProductAccountAvatarSvg();

}  // namespace ingress
