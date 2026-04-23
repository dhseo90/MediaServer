// 파일 용도: 외부 명령을 timeout과 stdout/stderr 캡처와 함께 실행하는 공용 helper를 선언한다.
#pragma once

#include <string>
#include <vector>

namespace core {

struct CommandResult {
    int exit_code{-1};
    bool timed_out{false};
    std::string stdout_text;
    std::string stderr_text;
    std::string error_message;
};

CommandResult RunCommandCapture(const std::vector<std::string>& args, int timeout_ms);

}  // namespace core
