# 설치·개발 가이드

이 문서는 macOS/Linux에서 의존성을 설치하고 서버를 빌드·실행하는 방법을 설명합니다.
제품 개요는 [README](../README.md), 환경변수는 [설정 참조](config-reference.md),
UI 사용법은 [UI 가이드](ui-guide.md)를 봅니다. 변경별 검증 기준은
[검증 정책과 명령](stream-verification.md), 기여 절차는 [CONTRIBUTING](../CONTRIBUTING.md)에 유지합니다.

## 목차

| 섹션 | 내용 |
| --- | --- |
| [요구 환경](#요구-환경) | OS, build, media runtime |
| [설치](#설치) | install script |
| [빌드](#빌드) | CMake build |
| [실행](#실행) | server start/foreground |
| [중지/재시작/status/diagnose](#중지재시작statusdiagnose) | 운영 command |
| [로그 확인](#로그-확인) | log 확인 |
| [기본 테스트](#기본-테스트) | smoke와 verifier |
| [Auth Bootstrap 개발 확인](#auth-bootstrap-개발-확인) | auth bootstrap 검증 |
| [UI 개발 시 검증 명령](#ui-개발-시-검증-명령) | UI 변경 시 verifier |
| [코드 변경 전후 체크리스트](#코드-변경-전후-체크리스트) | 변경 전후 확인 |
| [git/commit 주의](#gitcommit-주의) | commit 관련 주의 |

## 요구 환경

- OS: macOS 또는 Linux
- 언어·빌드: C++17 컴파일러, CMake 3.16+, pkg-config
- 미디어: GStreamer 1.28+와 RTSP/WebRTC 플러그인. API/pkg-config 이름은 `gstreamer-1.0`을 사용합니다.
  빌드 최소 버전과 정확한 파일 증거 생성 조건은 별개입니다. 파일 증거는 core/parser/mux가
  모두 정확한1.28.1이거나 Linux arm64에서 모두 정확한1.28.7이고,
  `h264parse/videoparsersbad`와 `mp4mux/isomp4`인 조합만 선택합니다.
  실제 확인 범위는 macOS arm64/Homebrew1.28.1과 Debian forky/sid arm64/rc58의1.28.7입니다.
  다른1.28.x·nano 개발 버전·혼합 조합은 허용하지 않습니다. 개별 파일의 시간·sample·hash
  검증도 필수이며 이 버전 선택만으로 모든 입력이 지원되지는 않습니다.
  새 프로그램은 기존 `gst-qtmux-1.28.1-default-v1`을 그대로 읽고, 새 조합은
  `gst-qtmux-1.28.7-default-v1`로 구분합니다. 이전 바이너리는 새 profile을 거부하므로
  새 자료 생성 후 구버전으로 되돌리는 읽기 호환성은 보장하지 않습니다.
  기존 자료 읽기 지원은 오래된 runtime의 보안 승인을 뜻하지 않습니다.
- 영상 분석: ONNX Runtime, YOLO ONNX 모델과 라벨. 기본 스크립트 빌드는 AI를 포함합니다.
- 개발·검증 도구: Node.js, Python 3, curl, 검사에 따라 ffmpeg/ffprobe

플랫폼별 패키지 목록은 [설치 스크립트](../scripts/internal/install_deps.sh)가 관리합니다.
macOS는 Homebrew, 지원 Linux 배포판은 apt/dnf/pacman을 사용합니다.
패키지 이름의 `1.0`은 최소 지원 버전을 뜻하지 않습니다. 배포판 저장소의 패키지가
GStreamer 1.28+를 제공하는지 확인해야 하며, 설치 명령 성공만으로 빌드 호환성을 보장하지 않습니다.
선택 의존성과 모델·런타임의 별도 조건은 [외부 의존성 안내](../THIRD_PARTY_NOTICES.md)를 따릅니다.

## 설치

프로젝트 스크립트로 패키지와 ONNX Runtime, YOLO 모델·라벨을 설치·다운로드하고
`scripts/.media_server.env`를 준비합니다. 기존 env 파일은 유지합니다.
기본 생성값은 LAN 바인딩을 포함하므로 실행 전에 [서버 기본 설정](config-reference.md#서버-기본-env)을 확인하세요.

```bash
./server.sh install
```

AI 없이 설치하려면 `./server.sh install --basic`을 사용합니다.
YouTube import/source는 기본 설치·빌드에서 제외된 lab 전용 실험입니다.
정책 검토 후 선택 도구가 필요할 때만 `./server.sh install --with-youtube`를 사용하며,
실험 빌드와 사용 제약은 [YouTube 안내](youtube-import.md)를 따릅니다.
로컬에 설치한 모델·런타임이 기본 소스 배포에 포함되는 것은 아닙니다.

설치 후 현재 실행 가능한 URL과 포트 후보를 확인합니다.

```bash
./server.sh urls
./server.sh diagnose
```

## 빌드

일반 빌드:

```bash
./server.sh build
```

Release + GStreamer + ONNX Runtime 예시:

```bash
cmake -S . -B build-release-gst-onnx \
  -DCMAKE_BUILD_TYPE=Release \
  -DMEDIA_SERVER_USE_GSTREAMER=ON \
  -DMEDIA_SERVER_USE_ONNXRUNTIME=ON \
  -DMEDIA_SERVER_ONNXRUNTIME_ROOT=/opt/homebrew/opt/onnxruntime

cmake --build build-release-gst-onnx
```

ONNX Runtime 없이 GStreamer 경로만 빌드:

```bash
./server.sh build --basic
```

`build`는 서버를 시작하지 않습니다. 기본 빌드 디렉터리는 AI 포함 시 `build-gst-onnx`,
`--basic`에서는 `build-gst`이며 로컬 env의 경로 설정이 있으면 그 값을 사용합니다.
위 직접 CMake 예제의 ONNX Runtime 경로는 설치 위치에 맞게 바꿉니다.

`build`·`start`·`foreground`는 기본적으로 `scripts/.media_server.env`를 읽습니다.
이 파일의 대입값은 셸에서 전달한 같은 이름의 값을 덮어쓸 수 있습니다.
격리 실행에서 로컬 설정을 읽지 않으려면 `MEDIA_SERVER_SKIP_LOCAL_ENV=1`을 사용하고
필요한 빌드·입력·저장 경로를 직접 지정합니다. 전체 옵션은 [설정 참조](config-reference.md#개발script-보조값)를 봅니다.

## 실행

`foreground`는 터미널에서 빌드·실행하며 `Ctrl-C`로 종료합니다.

```bash
./server.sh foreground
```

background 실행:

```bash
./server.sh start
```

기본 인증은 `auto`입니다. 첫 실행에서 계정/관리자 hash가 없으면 `/setup`으로 이동하며
기본 비밀번호는 없습니다. 로그인과 역할별 화면은 [UI 가이드](ui-guide.md)를 따릅니다.

background 실행은 기본적으로 `nohup`을 사용합니다. macOS 사용자 세션에 붙여 오래 유지해야 하는 경우에만 다음처럼 실행합니다.

```bash
MEDIA_SERVER_START_MODE=launchd ./server.sh start
```

다른 실행과 상태·종료 범위를 분리해야 하면 같은 셸에서 전용 상태 디렉터리와 고유
launchd label을 start/restart/stop/status/diagnose에 동일하게 전달합니다. 상태 디렉터리는
미리 만들고 현재 사용자가 소유해야 하며, 상대경로·상태 디렉터리 symlink·내부 상태
파일 symlink는 거부됩니다.

```bash
mkdir -p /tmp/media-server-my-run/state
MEDIA_SERVER_STATE_DIR=/tmp/media-server-my-run/state \
MEDIA_SERVER_LAUNCHD_LABEL=com.dhseo.mediaserver.my-run \
MEDIA_SERVER_START_MODE=launchd ./server.sh start
```

전용 상태 디렉터리를 지정한 stop은 그 label과 명시·기록 포트의 `media_server` listener만
대상으로 삼습니다. 저장소 기본 포트나 기본 label을 fallback으로 탐색하지 않으며, PID
파일이 다른 프로세스를 가리키면 signal하지 않습니다. start 시 같은 exact label이 이미
등록돼 있으면 기존 job을 내리지 않고 실패하므로 실행마다 고유 label을 사용해야 합니다.
기본값을 사용한 기존 실행의 종료 동작은 호환성을 위해 유지됩니다.

상태 디렉터리는 PID·포트·로그 관리 범위만 분리합니다. 검증 서버를 띄울 때는
인증·source/view/analysis registry·이벤트·audit·녹화 저장 경로와 포트도 별도로 격리해야 합니다.
특히 `MEDIA_SERVER_RECORDING_ENABLED=0`이어도 시작 복구는 실행되므로
`MEDIA_SERVER_RECORDING_STORAGE_ROOT`를 운영 원본과 다른 검증용 경로로 지정합니다.
검증 준비와 정리는 [검증 정책](stream-verification.md#검증-정책)을 따릅니다.

대표 접속 URL은 실제 `./server.sh status` 또는 `./server.sh urls` 결과를 우선합니다.

```text
운영 콘솔:
http://127.0.0.1:8080/ops/home

룰 설정:
http://127.0.0.1:8080/ops/rules

RTSP:
rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4

RTSP + VA overlay:
rtsp://127.0.0.1:8554/dhseo?file=va_four_scene_sample.mp4&va=1

RTSP + 저장 rule:
rtsp://127.0.0.1:8554/dhseo?vaRule=1
```

WebRTC simple signaling:

```bash
curl -fsS -X POST \
  'http://127.0.0.1:8080/webrtc/session?file=sample_h264.mp4'
```

WHEP는 클라이언트가 만든 유효한 SDP offer를 본문에 보냅니다.
아래 `offer.sdp`는 실제 클라이언트의 offer 파일이며 빈 POST로 대체할 수 없습니다.

```bash
curl -fsS -X POST \
  -H 'Content-Type: application/sdp' \
  --data-binary @offer.sdp \
  'http://127.0.0.1:8080/whep?file=sample_h264.mp4'
```

위 생성 요청만으로 영상 재생까지 완료되지는 않습니다. 클라이언트는 응답 SDP와
ICE 협상을 처리하고, 사용 후 응답 `Location`의 세션을 종료해야 합니다.

외부 WHEP playback endpoint를 source로 pull할 때는 `source=whep`을 사용합니다.
`source=webrtc`는 `/whip/publish`로 등록된 내부 sourceId 소비 경로입니다.

```bash
curl -fsS -X POST \
  'http://127.0.0.1:8080/webrtc/session?source=whep&url=https%3A%2F%2Fexample.com%2Fwhep%2Fstream'
```

위 URL은 placeholder입니다. 실제 WHEP endpoint와 네트워크/ICE/TURN 상태는 환경별로 별도 확인합니다.

위 직접 WebRTC/WHEP 생성 요청은 개발/운영자 권한에서만 사용합니다.
인증 사용 시 operator 역할 이상과 `ops:read`, 또는 `lab:read` scope가 필요합니다.
위 curl 예제에는 인증정보를 넣지 않았습니다. 인증 사용 시 해당 권한의 세션을 전달하며,
`MEDIA_SERVER_AUTH_MODE=off`를 선택하는 경우에는 명시적으로 준비한 격리 개발 서버에서만 사용합니다.

Auth on에서 answer/ICE/delete 후속 요청은 같은 생성 principal로 보냅니다.
또는 simple signaling의 JSON `sessionToken`, WHEP의 응답 헤더 `X-Session-Capability`로 받은
세션 capability를 후속 요청의 `X-Session-Capability` 헤더에 보냅니다.
인증 토큰이 필요한 외부 WHEP endpoint의 credential 저장/주입은 아직 별도 운영 정책 대상입니다.

`/ws/va-metadata` 직접 WebSocket metadata side-channel도 auth on에서는 admin/operator 또는 `lab:read` 권한에서만 사용합니다.
Viewer/client 제품 흐름은 client wrapper만 사용합니다.
생성 wrapper는 `/client/api/views/{viewId}/webrtc/session`입니다.
후속 answer/ICE/delete도 같은 prefix의 client session wrapper를 사용합니다.

## 중지/재시작/status/diagnose

```bash
./server.sh stop
./server.sh restart
./server.sh status
./server.sh diagnose
./server.sh urls
```

포트가 남아 있는지 확인:

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
lsof -nP -iTCP:8554 -sTCP:LISTEN
```

## 로그 확인

foreground 실행은 터미널에 로그가 바로 출력됩니다.

```bash
./server.sh foreground
```

background 실행 로그:

```bash
tail -n 200 .media_server.log
tail -f .media_server.log
```

위 경로는 기본 상태 디렉터리 기준입니다. `MEDIA_SERVER_STATE_DIR`을 지정한 실행은
그 디렉터리의 로그를 확인합니다. 공유할 로그에서 인증정보·원본 URL·운영 데이터를 제거합니다.

macOS/Homebrew prefix가 다르면:

```bash
HOMEBREW_PREFIX=/usr/local ./server.sh foreground
```

WebRTC 상세 로그:

```bash
MEDIA_SERVER_WEBRTC_TRACE=1 ./server.sh foreground
```

sample/pad/caps/SDP detail까지 필요할 때만:

```bash
MEDIA_SERVER_WEBRTC_TRACE=1 MEDIA_SERVER_WEBRTC_TRACE_VERBOSE=1 ./server.sh foreground
```

GStreamer plugin 확인:

```bash
gst-inspect-1.0 webrtcbin nicesrc nicesink
gst-inspect-1.0 rtph264pay rtph264depay h264parse
gst-inspect-1.0 uridecodebin
```

## 기본 테스트

변경한 기능과 영향을 받는 소비자에 맞춰 검사를 선택합니다. 기능별 기대값과 실행 영역은
[기능별 테스트 정의](project-feature-test-inventory.md), 승인·실행·판정 기준은
[검증 정책](stream-verification.md#검증-정책)에 있습니다. 아래 명령은 운영 환경에서 실행하지 않습니다.

| 명령 | 실행 범위 |
| --- | --- |
| `./server.sh test` 또는 `test --basic` | 로컬 기본 회귀. 서버 시작, RTSP/HTTP, source·codec·VA 등 실제 실행 포함 |
| `./server.sh test --full` | basic에 제품 UI smoke, 룰·이벤트·이미지 분석·Event POST·redaction 등 추가 |
| `./server.sh test --external` | full에 LAN·외부 RTSP·ICE·외부 URI 등 외부 의존 검사 추가 |
| `./server.sh test --basic --ffmpeg-free` | FFmpeg/ffprobe CLI가 없는 환경에서 해당 CLI 의존 검사를 분리한 기본 모드 |

`--full` 성공은 실제 UI 풀테스트나 30분·120분 통과를 뜻하지 않습니다.
문서 전용 수정에는 빌드와 위 통합 묶음을 자동으로 추가하지 않습니다.
`verify-predev`는 `--quick`을 포함해 별도 실행 승인이 필요하며, 장시간·실제 UI 풀테스트도
각각 승인을 확인합니다. 이미 승인된 범위는 철회나 변경이 없는 한 유지합니다.

단독 `verify-*`, Runtime Console·metadata 검사, 장시간·다채널 명령과 결과 형식은
[검증 명령 안내](stream-verification.md)에 모읍니다. 실행 전 대상 서버·포트·계정·저장 경로와
정리 방법을 확인하고, 실패·미실행·부분 실행을 PASS와 구분합니다.
fixture 정리의 정적 계약은 `verify-fixture-cleanup-contracts`로 확인할 수 있지만
실제 실행 후 프로세스·포트·자료 정리 확인을 대신하지 않습니다.

## Auth Bootstrap 개발 확인

기본 auth mode는 `auto`입니다. 최초 admin 비밀번호 설정은 기존 운영 users file을
사용하지 않는 격리 환경에서 확인합니다. 사용자 파일 하나만 바꿔서는 다른 저장 경로까지 격리되지 않습니다.

인증 변경의 자동 smoke 후보는 다음과 같습니다. 격리 경로와 임시 자격증명의 준비는
[격리 인증 기준](stream-verification.md#네-영역과-격리-인증)을 따릅니다.

```bash
./server.sh verify-auth-bootstrap
./server.sh verify-auth-users
./server.sh verify-auth-routes
```

수동 확인도 `MEDIA_SERVER_AUTH_USERS_FILE`을 포함한 실행 전용 설정을 사용합니다.
확인 대상은 첫 `/setup`, 로그인·잠금, 비밀번호 변경과 세션 폐기,
admin 전용 사용자 관리, 초대·접근 요청, role/scope 경계입니다.
상세 조작과 기대값은 [UI 가이드](ui-guide.md)와 현행 테스트 정의를 따릅니다.
비밀번호나 hash·session/token을 화면·로그·실행 기록에 복사하지 않습니다.

`off`는 명시적인 개발·검증 모드입니다. 일부 UI/API smoke의 전제일 수 있지만
인증·역할·scope 검증을 대체하지 않습니다. 인증을 사용하는 검사와 인증을 끈 검사를 구분합니다.

## UI 개발 시 검증 명령

Ops/영상 분석 UI 변경의 검사 후보입니다. 실제 변경 경로와
[검증 정책의 UI/Auth 영향 기준](stream-verification.md#검증-정책)에 맞춰 선택합니다.

```bash
./server.sh verify-rule-ui
./server.sh verify-ops-rules-roundtrip
./server.sh verify-ops-client-ui
./server.sh verify-ops-client-ui --screenshots
./server.sh verify-ops-click-e2e
./server.sh verify-ops-tables-layout
```

위 명령은 대상 HTTP 서버를 검사하므로 운영 서버가 아닌 격리 서버와 필요한 인증 상태를
먼저 준비합니다. 포트가 다르면 각 명령의 `--http-base`를 지정합니다.
정적/API 검사나 `--screenshots` 결과만으로 실제 UI 풀테스트를 통과했다고 보고하지 않습니다.

이벤트 POST나 rule preview URL이 영향을 받으면:

```bash
./server.sh verify-event-post
```

실제 브라우저 검사는 승인된 범위에서 [UI 풀테스트 기준](manual-ui-fulltest.md)을 따릅니다.
변경에 따른 확인 대상의 예시는 다음과 같습니다.

- 채널 분석 설정: 채널, 이벤트 템플릿, 분석 프로파일, 영역/라인, 활성 상태, 출력 URL 복사
- 이벤트 템플릿: 기본 이벤트와 시나리오를 구분해 추가/수정/삭제
- 분석 프로파일: detector, fps, queue, 입력 해상도 저장과 채널 분석 설정의 선택 가능 여부
- 운영 출력: `/ops/rules`의 허용된 RTSP/WHEP·VA URL 복사 동작
- 클라이언트 미리보기: `/client/live`의 권한 내 영상·VA 오버레이와 viewer의 source/Developer URL 비노출
- `/ops/dashboard`: source lifecycle, stale tap, reconnect/cleanup, auth/config 문제 원인과 다음 조치 버튼
- 공통 테이블: 채널/룰/사용자 table row/action/detail 영역이 320/390/760px Chrome DevTools와 desktop resize에서 칸을 침범하지 않는지 확인
- 수동 시각 리뷰: nav/account, 허용된 URL copy, 변경 이력 입력과 dashboard 카드의 겹침·잘림 확인

결과는 해당 실행 자료에 보존하고 테스트 정의 문서에 반복해서 복사하지 않습니다.
Codex 인앱 환경의 `Browser Use virtual clipboard is not installed`는
[클립보드 진단 기준](browser-use-clipboard-diagnostics.md)에 따라 제품 결함과 구분합니다.
UI 사용 흐름은 [UI 가이드](ui-guide.md)에 유지합니다.

## 코드 변경 전후 체크리스트

변경 전:

- 관련 문서를 먼저 확인합니다.
- pipeline/stream/session 변경은 [media-server-architecture.md](./media-server-architecture.md)를 확인합니다.
- VA rule/scenario/tracking 변경은 [video-analysis.md](./video-analysis.md)를 확인합니다.
- env 변경은 [config-reference.md](./config-reference.md)를 확인합니다.
- 테스트 기준 변경은 [stream-verification.md](./stream-verification.md)를 확인합니다.

변경 후에는 승인된 focused 검사와 영향 회귀를 수행하고 실제 결과와 정리 상태를 기록합니다.
스크립트 연결을 변경했다면 `verify-script-inventory`, workflow 변경이면 `verify-actions-security`를 확인합니다.
문서만 수정한 경우에는 최소한 diff와 영향받는 링크를 확인합니다.

```bash
git diff --check
./server.sh verify-docs-links
```

이미지·metadata·검증기 변경에는 해당 자체검사를 추가합니다.
실행 결과와 현재 테스트 정의는 분리하고, 실패 원출력·수정 후 재검증·미실행·cleanup을 추적합니다.
자료의 보존·정리는 [AGENTS 기록 수명 정책](../AGENTS.md#6-기록-수명과-정리)에 따릅니다.

## git/commit 주의

현재 workspace에는 사용자가 만든 변경이 섞여 있을 수 있습니다. 커밋 전에는 항상 범위를 확인합니다.

```bash
git status --short
git diff --stat
git diff --check
```

stage/commit, push, PR, 병합, tag, 공개와 브랜치 작업은 각각 승인된 범위를 확인합니다.
기존 명시 승인은 철회·대체·범위 변경이 없는 한 유지하며 상태 질문만으로 취소되지 않습니다.
승인된 파일과 변경만 stage하고 사용자 변경을 섞거나 되돌리지 않습니다.
상세 승인 경계와 공개 순서는 [AGENTS](../AGENTS.md)와 [릴리즈 정책](release-policy.md)을 따릅니다.
