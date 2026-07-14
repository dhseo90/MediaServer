#pragma once

// 파일 요약: MediaServer 프로세스의 composition-root 진입 계약이다.
// 동작 요약: CLI 또는 서버 실행을 선택하고 런타임 의존성의 생성·시작·정리 순서를 소유한다.

namespace media_server::application {

int RunMediaServerApplication(int argc, char** argv);

}  // namespace media_server::application
