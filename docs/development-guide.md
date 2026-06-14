# Development Guide

이 문서는 개발자가 바로 따라 실행할 수 있는 명령 중심 가이드입니다.
환경변수 전체 reference는 [config-reference.md](./config-reference.md)를 봅니다.
스트림 검증 기준은 [stream-verification.md](./stream-verification.md),
UI 사용법은 [ui-guide.md](./ui-guide.md)를 봅니다.

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

YouTube import/source 실험 기능은 기본 빌드와 기본 설치에서 제외합니다.
정책 검토가 끝난 lab-only 실험 빌드가 필요할 때만 선택 도구를 추가로 설치합니다.
자세한 상태와 제약은 [youtube-import.md](./youtube-import.md)를 봅니다.

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

WHEP:

```bash
curl -fsS -X POST \
  'http://127.0.0.1:8080/whep?file=sample_h264.mp4'
```

외부 WHEP playback endpoint를 source로 pull할 때는 `source=whep`을 사용합니다.
`source=webrtc`는 `/whip/publish`로 등록된 내부 sourceId 소비 경로입니다.

```bash
curl -fsS -X POST \
  'http://127.0.0.1:8080/webrtc/session?source=whep&url=https%3A%2F%2Fexample.com%2Fwhep%2Fstream'
```

위 URL은 placeholder입니다. 실제 WHEP endpoint와 네트워크/ICE/TURN 상태는 환경별로 별도 확인합니다.

위 직접 WebRTC/WHEP 생성 요청은 개발/운영자 권한에서만 사용합니다.
허용 조건은 `MEDIA_SERVER_AUTH_MODE=off` 개발 모드 또는 auth on의 admin/operator `ops:read`, `lab:read` 권한입니다.

Auth on에서 answer/ICE/delete 후속 요청은 같은 생성 principal로 보냅니다.
또는 응답의 `sessionToken`을 `X-Session-Capability`로 보냅니다.
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

`verify-predev --quick`와 `./server.sh test*` 계열은 느립니다.
기본 추가 RTSP/WebRTC source 영상과 codec matrix를 사용하기 때문입니다.

문서/UI/Auth/권한만 바꾼 경우에는 이 묶음을 실행하지 않습니다.
대신 `build`, `git diff --check`, `verify-script-inventory`, `verify-auth-routes`,
`verify-ops-client-ui`, `verify-rule-ui`, `verify-ops-rules-roundtrip`,
`verify-analysis-state`로 확인합니다.

테이블, 탭 이동, 직접 클릭 흐름을 건드린 경우에는 `verify-ops-click-e2e`와
`verify-ops-tables-layout`도 추가합니다.

`verify-auth-routes`는 격리 서버를 자동으로 띄웁니다.
`verify-ops-client-ui`, `verify-rule-ui`, `verify-ops-click-e2e`,
`verify-ops-tables-layout`, `verify-ops-rules-roundtrip`은 이미 떠 있는 HTTP 서버를 검사합니다.
검증 fixture가 auth store, EventStorage, evidence, audit 파일을 남기지 않는지
보는 정적 계약은 `./server.sh verify-fixture-cleanup-contracts`로 확인합니다.

UI/API smoke 전에는 `MEDIA_SERVER_AUTH_MODE=off ./server.sh foreground`로 서버를 띄웁니다.
포트가 다르면 각 명령에 `--http-base`를 지정합니다.
Codex 인앱 Browser Use 환경에서 `Browser Use virtual clipboard is not installed`가
나오면 제품 clipboard 회귀로 단정하지 않습니다. 세부 진단과 보고 기준은
[browser-use-clipboard-diagnostics.md](./browser-use-clipboard-diagnostics.md)를
따릅니다.

장시간 또는 다채널 검증 기준은 [stream-verification.md](./stream-verification.md)에 유지합니다.

VA Metadata Runtime Console 계열 검증은 선택 검증입니다.

- 기본 `./server.sh test`에는 포함하지 않습니다.
- WebRTC DataChannel, SSE side-channel, dashboard/state endpoint, RTSP overlay 정책을 수정했을 때 별도로 실행합니다.
- 단기 명령은 summary JSON 경로를 출력합니다.
- `verify-va-runtime-console-longrun`은 summary JSON과 Markdown report를 함께 생성합니다.
- 120분 Runtime Console longrun은 release candidate, 사용자 명시 요청, 또는 Runtime Console/VA metadata fanout/media path 고위험 변경에서만 실행합니다.
- 문서/checklist/template 정리만 했으면 120분 longrun은 테스트 결과 행을 만들지 않고
  별도 `미실행`으로만 기록하며, 30분 longrun이나 sample fixture를 120분 PASS
  evidence로 대체하지 않습니다.

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
- logout 후 `/ops`, `/client`, `/lab/analysis/*` 보호 route는 `/login` 요구
- admin 로그인 후 `/ops/users`에서 viewer/operator/integrator 계정을 생성/수정/비활성화/복구하고,
  상세 패널에서 임시 비밀번호 초기화를 수행합니다.
- pending 접근 요청은 승인해 password setup invite를 발급하거나 거절합니다.
- invite는 기본 24시간 후 만료되며 만료 후에는 새 초대를 발급합니다.
- 사용자 변경 이력은 `/ops/users` 하단 audit 패널에서 JSON/CSV/Diff JSON으로 export할 수 있습니다.
- Integrator는 UI shell 대신 client events/metadata API를 scope 기반으로 사용합니다.
- 대상 API는 `/client/api/views/{viewId}/events`와 `/client/api/views/{viewId}/metadata`입니다.
- CLI는 `./server.sh auth-user list`, `add`, `reset-password`, `disable`, `enable`을 사용하고 비밀번호는 기본 prompt로 입력

제품 UI 검증은 명시적으로 auth off 서버에서 실행합니다.
새 검증은 Ops/Client 화면과 현재 `/lab/analysis/*` API 경계를 기준으로 합니다.

```bash
MEDIA_SERVER_AUTH_MODE=off ./server.sh foreground
./server.sh verify-ops-client-ui
./server.sh verify-ops-rules-roundtrip
```

## UI 개발 시 검증 명령

Ops/영상 분석 UI를 수정한 뒤에는 최소한 아래 검증을 실행합니다.

```bash
./server.sh verify-rule-ui
./server.sh verify-ops-rules-roundtrip
./server.sh verify-ops-client-ui
./server.sh verify-ops-client-ui --screenshots
./server.sh verify-ops-click-e2e
./server.sh verify-ops-tables-layout
```

이벤트 POST나 rule preview URL이 영향을 받으면:

```bash
./server.sh verify-event-post
```

브라우저로 직접 확인할 때는 서버를 foreground로 띄운 뒤 `/ops/rules`에서 다음을 확인합니다.

- 채널 분석 설정: 채널, 이벤트 템플릿, 분석 프로파일, 영역/라인, 활성 상태, 출력 URL 복사
- 이벤트 템플릿: 기본 이벤트와 시나리오를 구분해 추가/수정/삭제
- 분석 프로파일: detector, fps, queue, 입력 해상도 저장과 채널 분석 설정의 선택 가능 여부
- 운영 미리보기: `/client/live`의 실시간 스트리밍, VA 오버레이, VA 룰 URL 복사/보기 동작
- `/ops/dashboard`: source lifecycle, stale tap, reconnect/cleanup, auth/config 문제 원인과 다음 조치 버튼
- 공통 테이블: 채널/룰/사용자 table row/action/detail 영역이 320/390/760px Chrome DevTools와 desktop resize에서 칸을 침범하지 않는지 확인
- 수동 시각 리뷰: Chrome DevTools device toolbar에서 320/390/760px을 차례로 열고
  nav/account, URL copy, 변경 이력 시작/종료 입력, dashboard 카드가 서로 겹치지 않는지
  [stream-verification.md](./stream-verification.md)의 체크박스로 기록합니다.

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
./server.sh verify-script-inventory
./server.sh verify-actions-security
./server.sh test
```

변경 범위에 맞는 `verify-*`를 추가 실행하고, 문서나 backlog가 바뀌어야 하면 함께 정리합니다.
FFmpeg/ffprobe CLI가 없는 공개/CI 환경에서는 `./server.sh test --basic --ffmpeg-free`로
codec/RTSP decode 의존 검증을 분리합니다.

문서만 수정한 경우에는 최소한 markdown diff와 링크를 확인합니다.

```bash
git diff --check -- README.md docs
./server.sh verify-script-inventory
```

## git/commit 주의

현재 workspace에는 사용자가 만든 변경이 섞여 있을 수 있습니다. 커밋 전에는 항상 범위를 확인합니다.

```bash
git status --short
git diff --stat
git diff --check
```

사용자가 최신 요청에서 커밋을 명시 승인한 경우에만, 승인된 작업 파일만 stage합니다.

```bash
git add README.md docs/development-guide.md docs/config-reference.md
```

사용자가 명시적으로 승인하기 전에는 commit/push를 진행하지 않습니다.
이미 다른 사람이 수정한 파일은 되돌리지 않습니다.
필요한 경우 해당 변경 위에서 이어서 작업합니다.
