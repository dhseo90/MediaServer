// 파일 용도: 제품 UI에서 모든 화면이 공유하는 테마 부트스트랩과 공통 JavaScript 생성 함수를 선언한다.
#pragma once

#include <iosfwd>
#include <string>

namespace ingress {

std::string ProductThemeBootScript();
std::string ProductSharedUiScript();
void AppendProductThemeScript(std::ostringstream& out);

}  // namespace ingress
