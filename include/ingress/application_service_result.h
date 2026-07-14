// 파일 요약: transport와 application service가 공유하는 dependency-free 응답 값을 선언한다.
// 동작 요약: 기존 registry 응답의 status/status_text/body를 의미 변경 없이 전달한다.
#pragma once

#include <string>

namespace ingress {

struct ApplicationServiceResult {
    int status{200};
    std::string status_text{"OK"};
    std::string body;
};

}  // namespace ingress
