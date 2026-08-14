// 파일 요약: MediaServer의 최소 process entrypoint다.
// 동작 요약: 모든 구성·CLI·lifecycle 소유권을 composition root에 위임한다.

#include "application/media_server_application.h"

int main(int argc, char** argv) {
    return media_server::application::RunMediaServerApplication(argc, argv);
}
