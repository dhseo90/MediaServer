// 파일 요약: 외부 command 실행 helper를 선언한다.
// 동작 요약: timeout, stdout/stderr 캡처, exit code를 담는 결과 타입을 제공한다.
// 동작 요약: yt-dlp/ffmpeg 같은 보조 도구 호출을 안전하게 감싼다.
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
