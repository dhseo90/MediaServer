# Development Guide

이 문서는 개발자가 바로 따라 실행할 수 있는 명령 중심 가이드입니다. 환경변수 전체 reference는 [config-reference.md](./config-reference.md), 스트림 검증 기준은 [stream-verification.md](./stream-verification.md), UI 사용법은 [ui-guide.md](./ui-guide.md)를 봅니다.

## 요구 환경

- OS: macOS 또는 Linux
- Language: C++17
- Build: CMake 3.16+
- Media framework: GStreamer 1.0
- Optional AI: ONNX Runtime + YOLO ONNX model
- Optional tooling: Node.js, Python 3, ffmpeg/ffprobe, curl

macOS/Homebrew에서 권장 패키지:

```bash
brew install cmake pkg-config ffmpeg node python \
  gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad \
  gst-rtsp-server libnice libnice-gstreamer onnxruntime
```

YouTube import 실험 기능을 다룰 때만 선택 도구를 추가로 설치합니다. 자세한 상태와 제약은 [youtube-import.md](./youtube-import.md)를 봅니다.

```bash
brew install yt-dlp deno
```

Debian/Ubuntu 계열:

```bash
sudo apt-get update
sudo apt-get install -y \
  build-essential cmake pkg-config curl python3 nodejs ffmpeg \
  libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev \
  gstreamer1.0-tools gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good gstreamer1.0-plugins-bad \
  gstreamer1.0-plugins-ugly gstreamer1.0-libav \
  libgstrtspserver-1.0-dev
```

## 설치

프로젝트 스크립트로 로컬 의존성, ONNX Runtime, YOLO 모델/라벨, 로컬 env 파일을 준비합니다.

```bash
./server.sh install
```

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
MEDIA_SERVER_ENABLE_AI=0 ./server.sh build
```

빌드 directory, binary path, ONNX Runtime root 등 build/script override는 [config-reference.md](./config-reference.md)의 `서버 기본 env`를 기준으로 확인합니다.

## 실행

개발 중에는 foreground 실행이 가장 재현성이 좋습니다.

```bash
./server.sh foreground
```

background 실행:

```bash
./server.sh start
```

background 실행은 기본적으로 `nohup`을 사용합니다. macOS 사용자 세션에 붙여 오래 유지해야 하는 경우에만 다음처럼 실행합니다.

```bash
MEDIA_SERVER_START_MODE=launchd ./server.sh start
```

대표 접속 URL은 실제 `./server.sh status` 또는 `./server.sh urls` 결과를 우선합니다.

```text
Lab:
http://127.0.0.1:8080/lab

영상 분석 관리:
http://127.0.0.1:8080/lab/rules

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

WHEP:

```bash
curl -fsS -X POST \
  'http://127.0.0.1:8080/whep?file=sample_h264.mp4'
```

위 직접 WebRTC/WHEP 생성 요청은 `MEDIA_SERVER_AUTH_MODE=off` 개발 모드 또는 auth on의 admin/operator `ops:read`, `lab:read` 권한에서 사용합니다. Auth on에서 answer/ICE/delete 후속 요청은 같은 생성 principal 또는 응답의 `sessionToken`을 `X-Session-Capability`로 보내야 합니다. `/ws/va-metadata` 직접 WebSocket metadata side-channel도 auth on에서는 admin/operator 또는 `lab:read` 권한에서만 사용합니다. Viewer/client 제품 흐름은 `/client/api/views/{viewId}/webrtc/session` 생성 wrapper와 같은 prefix의 client session answer/ICE/delete wrapper를 사용합니다.

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

기본 smoke:

```bash
./server.sh test
```

로컬 풀 검증:

```bash
./server.sh test --full
```

외부/LAN 선택 검증:

```bash
./server.sh test --external
```

주요 단독 검증:

```bash
./server.sh verify-codecs
./server.sh verify-webrtc-ice
./server.sh verify-multichannel
./server.sh verify-multichannel --include-va --repeat 2
./server.sh verify-uri-longrun
./server.sh verify-va
./server.sh verify-va-events
./server.sh verify-event-post
./server.sh verify-analysis-state
./server.sh verify-va-runtime-console
./server.sh verify-va-runtime-console-longrun --duration-minutes 30 --clients 1 --include-sidechannel --include-dashboard
./server.sh verify-va-runtime-console-longrun --duration-minutes 30 --clients 1 --include-sidechannel --include-dashboard --include-rtsp --idle-after-cleanup-minutes 15
./server.sh verify-va-runtime-console-cycles --cycles 10 --active-minutes 5 --idle-minutes 2 --clients 1 --include-sidechannel --include-dashboard --include-rtsp
./server.sh verify-va-metadata-sidechannel
./server.sh verify-webrtc-va-metadata
./server.sh verify-rtsp-va-overlay-policy
./server.sh replay-va-metadata --input test/fixtures/va_metadata_replay_basic.json --output /tmp/va_metadata_replay.json
./server.sh verify-va-replay
./server.sh verify-tracker-stability
./server.sh verify-adaptive
./server.sh verify-image-analysis
./server.sh verify-predev --quick
```

`verify-predev --quick`와 `./server.sh test*` 계열은 기본 추가 RTSP/WebRTC source 영상과 codec matrix를 사용하므로 느립니다. 문서/UI/Auth/권한만 바꾼 경우에는 이 묶음을 실행하지 않고 `build`, `git diff --check`, `verify-auth-routes`, `verify-ops-client-ui`, `verify-rule-ui`, `verify-lab-layout --no-screenshots`, `verify-analysis-state`로 확인합니다.

장시간 또는 다채널 검증 기준은 [stream-verification.md](./stream-verification.md)에 유지합니다.

VA Metadata Runtime Console 계열 검증은 선택 검증입니다.

- 기본 `./server.sh test`에는 포함하지 않습니다.
- WebRTC DataChannel, SSE side-channel, dashboard/state endpoint, RTSP overlay 정책을 수정했을 때 별도로 실행합니다.
- 단기 명령은 summary JSON 경로를 출력합니다.
- `verify-va-runtime-console-longrun`은 summary JSON과 Markdown report를 함께 생성합니다.

## Auth Bootstrap 개발 확인

기본 auth mode는 `auto`입니다. 최초 admin 비밀번호 설정 흐름을 확인할 때는 임시 users file을 사용합니다.

자동 smoke는 아래 세 명령을 우선 사용합니다.

```bash
./server.sh verify-auth-bootstrap
./server.sh verify-auth-users
./server.sh verify-auth-routes
```

```bash
MEDIA_SERVER_AUTH_MODE=auto \
MEDIA_SERVER_AUTH_USERS_FILE=/tmp/media-server-bootstrap-users.json \
  ./server.sh foreground
```

확인 항목:

- users file이 없으면 `/`가 `/setup`으로 이동
- 약한 비밀번호는 `/setup`에서 거부
- username 포함 비밀번호, 반복 문자, 연속 숫자, 키보드 배열, 흔한 비밀번호는 거부
- 강한 비밀번호 설정 후 users file에 `admin`, `passwordHash`, password history/audit/lockout field가 저장
- setup 완료 후 `/setup`은 `/login`으로 이동
- `/login`에서 admin 로그인 후 `/auth/whoami`에 `role=admin`, `setupRequired=false`
- 로그인 실패가 `MEDIA_SERVER_AUTH_LOGIN_MAX_FAILURES`에 도달하면 lockout 메시지가 표시되고 만료 전 정상 비밀번호도 거부
- `/password/change`에서 이전 비밀번호 재사용은 거부되고, 성공 후 기존 session은 폐기
- logout 후 `/ops`, `/client`, `/lab` 보호 route는 `/login` 요구
- admin 로그인 후 `/ops/users`에서 viewer/operator/integrator 계정을 생성/수정/비활성화하고, pending 접근 요청을 승인해 password setup invite를 발급하거나 거절합니다. Integrator는 UI shell 대신 `/client/api/views/{viewId}/events`와 `/client/api/views/{viewId}/metadata`를 scope 기반으로 사용합니다.
- CLI는 `./server.sh auth-user list`, `add`, `reset-password`, `disable`, `enable`을 사용하고 비밀번호는 기본 prompt로 입력

기존 Lab 레이아웃/자동화 검증은 명시적으로 auth off 서버에서 실행합니다.

```bash
MEDIA_SERVER_AUTH_MODE=off ./server.sh foreground
./server.sh verify-lab-layout
```

## UI 개발 시 검증 명령

Lab/영상 분석 UI를 수정한 뒤에는 최소한 아래 검증을 실행합니다.

```bash
./server.sh verify-rule-ui
./server.sh verify-lab-layout
```

이벤트 POST나 rule preview URL이 영향을 받으면:

```bash
./server.sh verify-event-post
```

브라우저로 직접 확인할 때는 서버를 foreground로 띄운 뒤 `/lab/rules`에서 다음을 확인합니다.

- 영상 분석 설정 탭: 룰 목록, 룰 추가/수정/삭제, 저장 전 검증
- 룰 편집 화면: 기본 정보, 영상 소스, Profile, 이벤트 방식, 영역/라인, 이벤트 동작
- 시나리오 템플릿: ReEntry와 IntrusionAfterLineCrossing은 룰 편집 UI에서 선택 가능, Loitering UI와 ZoneOccupancyScenario는 다음 작업
- 영상 분석 보기 탭: 실시간 스트리밍, VA 오버레이, VA 룰, 개발자 요청 URL 접힘 영역
- Runtime Dashboard 탭: active analysis tap, metadata/backpressure, scenario/event/debug 상태, EventRecord 수동 검색

UI 사용 흐름은 [ui-guide.md](./ui-guide.md)에 별도로 유지합니다.

## 코드 변경 전후 체크리스트

변경 전:

- 관련 문서를 먼저 확인합니다.
- pipeline/stream/session 변경은 [media-server-architecture.md](./media-server-architecture.md)를 확인합니다.
- VA rule/scenario/tracking 변경은 [video-analysis.md](./video-analysis.md)를 확인합니다.
- env 변경은 [config-reference.md](./config-reference.md)를 확인합니다.
- 테스트 기준 변경은 [stream-verification.md](./stream-verification.md)를 확인합니다.

변경 후:

```bash
./server.sh build
./server.sh test
```

변경 범위에 맞는 `verify-*`를 추가 실행하고, 문서나 backlog가 바뀌어야 하면 함께 정리합니다.

문서만 수정한 경우에는 최소한 markdown diff와 링크를 확인합니다.

```bash
git diff --check -- README.md docs
```

## git/commit 주의

현재 workspace에는 사용자가 만든 변경이 섞여 있을 수 있습니다. 커밋 전에는 항상 범위를 확인합니다.

```bash
git status --short
git diff --stat
git diff --check
```

커밋 시에는 작업한 파일만 stage합니다.

```bash
git add README.md docs/development-guide.md docs/config-reference.md
```

사용자가 명시적으로 승인하기 전에는 commit/push를 진행하지 않습니다. 이미 다른 사람이 수정한 파일은 되돌리지 말고, 필요한 경우 해당 변경 위에서 이어서 작업합니다.
