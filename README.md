# Media Server

C++ 기반 미디어 서버입니다. 현재는 `GStreamer`를 중심으로 동작하며, `RTSP`와 `WebRTC(signaling)` 경로를 같은 내부 스트림 구조 위에서 처리하도록 구성되어 있습니다.

목표 구조:

```text
Player (RTSP / WebRTC)
        |
        v
Ingress / Egress Adapter
        |
        v
SessionManager
        |
        v
StreamRegistry
        |
        v
SharedStream
        |
        v
SourceWorker (File / RTSP Pull / WebRTC / HTTP-HLS URI)
```

이 프로젝트가 의도하는 실제 연결 모델은 아래와 같습니다.

```text
Client <-> (RTSP or WebRTC) <-> MediaServer <-> (File or RTSP or WebRTC) <-> Original Source
```

즉 `Client -> MediaServer` 구간과 `MediaServer -> Original Source` 구간은 서로 독립적으로 선택됩니다.

## 프로토콜 선택 규칙

핵심 원칙:
- `Client <-> MediaServer` 프로토콜은 클라이언트가 어떤 endpoint로 접속하는지로 결정됩니다.
- `MediaServer <-> Original Source` 프로토콜은 요청 파라미터(`file`, `url`, `source`)로 결정됩니다.
- 하나의 요청 안에서 앞단과 뒷단 프로토콜을 서로 다르게 조합할 수 있습니다.

| 구간 | 결정 방식 | 현재 선택 가능 값 |
| --- | --- | --- |
| `Client -> MediaServer` | 접속 URL / HTTP endpoint | `RTSP`, `WebRTC` |
| `MediaServer -> Original Source` | query/source 파라미터 | `file`, `RTSP`, `WebRTC`, `HTTP/HLS URI` |

조합 예시:

| Client 구간 | Source 구간 | 예시 |
| --- | --- | --- |
| `RTSP` | `file` | `rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4` |
| `RTSP` | `RTSP` | `rtsp://127.0.0.1:8554/dhseo?url=rtsp%3A%2F%2Fcamera-host%3A554%2Flive` |
| `RTSP` | `WebRTC` | `rtsp://127.0.0.1:8554/dhseo?source=webrtc&url=publisher-demo` |
| `RTSP` | `HTTP/HLS URI` | `rtsp://127.0.0.1:8554/dhseo?source=http&url={urlencoded_http_media_url}` (현재 재확인 필요) |
| `WebRTC` | `file` | `POST /webrtc/session?file=sample_h264.mp4` |
| `WebRTC` | `RTSP` | `POST /webrtc/session?url=rtsp%3A%2F%2Fcamera-host%3A554%2Flive` |
| `WebRTC` | `WebRTC` | `POST /webrtc/session?source=webrtc&url=publisher-demo` |
| `WebRTC` | `HTTP/HLS URI` | `POST /webrtc/session?source=http&url={urlencoded_http_media_url}` |

## 현재 구현 상태

### 구현 완료
- `file -> RTSP`
- `file -> WebRTC(signaling)`
- `RTSP pull -> RTSP`
- `RTSP pull -> WebRTC(signaling)`
- `HTTP media URL -> WebRTC(signaling)` 1차 안정 경로
  - `source=http` WebRTC signaling은 최신 blocker 체크에서도 세션 생성이 성공했다.
- 동일 source 요청에 대한 `StreamRegistry` 기반 dedup 구조
- `SharedStream` 기반 video/audio fan-out
- route별 video/audio codec 변환
  - video: `H264`, `H265`
  - audio: `AAC`, `Opus`, `PCMU`, `PCMA`
- 외부 RTSP source용 preflight + timeout 분리 진단

### 부분 구현
- `HTTP/HLS URI source -> RTSP`
  - route/pipeline 구현은 존재하고 과거 통과 이력도 있다.
  - 최신 blocker 체크에서 `source=http` RTSP route의 `503 Service Unavailable`이 다시 관찰되어 현재는 재확인 필요 상태로 둔다.
- `WebRTC egress`
  - HTTP signaling / WHEP endpoint 존재
  - 브라우저 연결용 코어 파이프라인 존재
  - simple signaling 기준 browser consume의 실제 audio/video playback 검증 완료
  - WHEP 기준 browser consume의 실제 audio/video playback 검증 완료
- `WebRTC source ingest`
  - `WHIP publish` endpoint 1차 구현
  - published source id를 `source=webrtc&url={source_id}`로 소비 가능하도록 구조 연결
  - local WHIP test publisher 기준 `publish -> RTSP` route subset 자동 검증 통과
  - local WHIP test publisher 기준 `publish -> WebRTC(signaling)` 자동 검증 통과
  - browser publisher 기준 `publish -> WebRTC(simple signaling) consume`의 실제 audio/video playback 검증 완료
  - browser publisher 기준 `publish -> WHEP consume`의 실제 audio/video playback 검증 완료
- 영상분석/VA 1차 경로
  - `va=1` 요청으로 file/RTSP/WebRTC source에 YOLO/ONNX 객체 감지 tap을 붙일 수 있다.
  - RTSP/WebRTC egress raw video 구간에 detection box/label overlay를 합성한다.
  - metadata, snapshot, overlay snapshot 개발용 API를 제공한다.
  - adaptive tuner는 detector 부하에 따라 런타임 `fps`를 먼저 낮추고, 가능한 경우 input size까지 낮춘다.
  - lightweight tracker가 detection box를 frame 간 연결해 `trackId`를 붙이고, 이벤트 룰은 기본적으로 이 객체 ID 기준으로 상태를 추적한다.
  - profile/rule registry는 1차 저장/조회/수정/삭제를 제공한다.
  - `/lab/rules`는 숫자/JSON 직접 입력 대신 한글 UI로 profile 값, 이벤트 판단 영역, 분석 객체 타입을 저장한다.
  - 저장된 rule은 `va=1` overlay와 `/lab/analysis/taps/{tapId}/events`에서 1차 event engine으로 판정한다.
  - 이벤트 발생 객체는 overlay에서 `이벤트`/`Event` label과 깜빡임 강조 색상으로 표시한다.
  - `eventActions.post`가 켜진 rule은 `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1`일 때 bounded queue 기반 POST worker가 `media-server.va.event.v1` payload로 비동기 전송한다.
- 실험실 기능
  - `source=youtube` resolver 경로는 코드에 남아 있지만 기본값으로는 비활성화되어 있다.
  - `/lab`를 통합 진입점으로 두고 안정 테스트, VA 분석, 룰 편집, 실험실 가져오기 기능을 같은 화면에서 접고 펼치는 구조로 정리했다.
  - `/lab` UI는 반응형 card layout과 light/dark theme toggle을 제공하며, 룰 편집기와 가져오기 도구는 iframe 대신 Shadow DOM 컴포넌트로 같은 페이지에 로드한다.
  - `/webrtc/test`, `/lab/rules`, `/lab/import`는 자동화와 기존 bookmark 호환 route로 유지하지만, 일반 사용 진입점은 `/lab` 하나로 둔다.
  - YouTube 직접 표출(`source=youtube`)은 `MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1`일 때만 노출된다.
  - YouTube 파일 다운로드(`/lab/import`)는 개발용 샘플 생성 도구로 기본 표시하며 `MEDIA_SERVER_ENABLE_LAB_YOUTUBE_IMPORT=0`으로 끌 수 있다.
  - `yt-dlp -> HTTP/HLS URL -> UriSourceWorker` 구조이며 로그인, 지역 제한, bot check가 걸리면 우회하지 않고 실패시킨다.
  - 공개 repo와 기본 운영 흐름에서는 YouTube direct source를 기본으로 쓰지 않는다.
  - 권한 문제가 없는 HTTP/HLS playable URI는 WebRTC 경로 중심으로 먼저 사용하고, RTSP 경로는 위 blocker를 재확인한 뒤 안정 지원으로 승격한다.

### 아직 미구현 또는 placeholder
- 운영용 WebRTC auth / STUN / TURN / ICE policy 설정
- 운영용 metrics / admin API
- 외부 RTSP source별 세밀한 reconnect 정책
- 영상분석 운영용 rule/profile matching 우선순위 고도화, tracker 고도화/Kalman 예측
- adaptive tuner 운영 기준값과 장시간 회귀 검증

### 최근 정리
- WebRTC egress/source 양쪽에 중복되어 있던 GStreamer RTCP workaround, SDP sanitize, pipeline clock/latency 설정을 `ingress/webrtc_gst_utils`로 공통화했습니다.
- `MEDIA_SERVER_WEBRTC_TRACE`는 협상/상태 중심 로그만 출력하고, sample/pad/caps/SDP detail은 `MEDIA_SERVER_WEBRTC_TRACE_VERBOSE=1`로 분리했습니다.
- 최근 검증:
  - `WebRTC browser publish -> WHEP consume`: audio/video track 연결 및 playback 확인
  - `WebRTC browser publish -> simple signaling consume`: audio/video track 연결 및 playback 확인

## 디렉터리

- `src`
  - 실제 서버 구현
- `include`
  - 헤더 및 기본 설정
- `server.sh`
  - 설치, 실행, 중지, 상태 확인, 진단, 검증을 묶은 사용자용 단일 진입점
- `scripts`
  - `scripts/internal`에 내부 실행, 진단, 검증 구현 스크립트를 둔다.
  - 일반 사용자는 직접 실행하지 않고 `./server.sh <command>`를 사용한다.
- `config`
  - codec/source 검증 설정
- `docs`
  - 구조/검증 상세 문서
- `video`
  - 테스트용 샘플 미디어

## 개발 및 실행 환경

### 지원 목표
- OS: `macOS`, `Linux`
- 언어: `C++17`
- 빌드: `CMake 3.16+`
- 미디어 프레임워크: `GStreamer 1.0`
- RTSP server/client, codec 변환, WebRTC, WHIP/WHEP 실험 경로는 모두 GStreamer 기반이다.

### 필수 개발 도구
- `cmake`
- `pkg-config`
- C++17 compiler
  - macOS: Apple Clang / Xcode Command Line Tools
  - Linux: `g++` 또는 `clang++`
- `gst-inspect-1.0`
- `ffprobe`
  - 검증 스크립트에서 RTSP output codec 확인에 사용한다.
- `curl`
  - health check, lab 검증 API, event POST delivery worker에서 사용한다.
- `python3`
  - 로컬 RTSP/HTTP source launcher와 일부 검증 스크립트에 사용한다.
- `node`
  - 브라우저 WebRTC end-to-end 검증 스크립트에 사용한다.
- `yt-dlp` (선택)
  - 실험실 기능인 `source=youtube` 또는 `/lab/import` YouTube 파일 다운로드를 사용할 때 필요하다.
- `deno` (선택)
  - 일부 YouTube URL은 `yt-dlp`가 `jsc:deno`로 JS challenge를 풀 때만 통과한다.
  - 실험실 YouTube import/source를 쓸 때만 의미가 있으며, 별도 C++ 링크 라이브러리를 추가한 것은 아니다.
- `ONNX Runtime` 개발 파일 (선택)
  - `detector=yolo` 분석 경로를 실제 YOLO ONNX 모델로 실행할 때만 필요하다.
  - 기본 빌드는 ONNX Runtime 없이도 동작하며, 이 경우 `detector=dummy`만 사용 가능하다.

### GStreamer 필수 모듈
CMake가 `pkg-config`로 아래 모듈을 찾는다.

```text
gstreamer-1.0
gstreamer-rtsp-server-1.0
gstreamer-pbutils-1.0
gstreamer-app-1.0
gstreamer-webrtc-1.0
gstreamer-sdp-1.0
```

실행 시에는 아래 plugin도 필요하다.
- `webrtcbin`
- `nicesrc`
- `nicesink`
- H264/H265 parser/payloader/depayloader/encoder
- AAC/Opus/PCMU/PCMA parser/payloader/depayloader/encoder
- `uridecodebin`, HTTP/HLS 관련 source plugin

설치 확인:

```bash
pkg-config --modversion gstreamer-1.0
pkg-config --modversion gstreamer-rtsp-server-1.0
gst-inspect-1.0 webrtcbin nicesrc nicesink
gst-inspect-1.0 x264enc x265enc h264parse h265parse rtph264pay rtph265pay
gst-inspect-1.0 rtpmp4gpay rtpopuspay rtppcmupay rtppcmapay uridecodebin
```

### macOS/Homebrew 환경
기본 Homebrew prefix는 Apple Silicon 기준 `/opt/homebrew`를 우선 사용한다.
`./server.sh`는 내부 공통 스크립트의 `media_server_apply_homebrew_gst_env`를 통해 아래 환경변수를 자동 보정한다.

```bash
export HOMEBREW_PREFIX=/opt/homebrew
export PATH="$HOMEBREW_PREFIX/bin:$PATH"
export PKG_CONFIG_PATH="$HOMEBREW_PREFIX/lib/pkgconfig:$HOMEBREW_PREFIX/share/pkgconfig"
export GI_TYPELIB_PATH="$HOMEBREW_PREFIX/lib/girepository-1.0"
export GST_PLUGIN_SCANNER="$HOMEBREW_PREFIX/libexec/gstreamer-1.0/gst-plugin-scanner"
export GST_PLUGIN_PATH="$HOMEBREW_PREFIX/lib/gstreamer-1.0:$HOMEBREW_PREFIX/opt/libnice-gstreamer/libexec/gstreamer-1.0"
export DYLD_FALLBACK_LIBRARY_PATH="$HOMEBREW_PREFIX/lib:/usr/local/lib:/usr/lib"
```

Homebrew prefix가 다르면 실행 전에 지정한다.

```bash
HOMEBREW_PREFIX=/usr/local ./server.sh foreground
```

수동 설치가 필요하면 아래 패키지를 설치한다.

```bash
brew install cmake pkg-config ffmpeg node python yt-dlp deno \
  gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad \
  gst-rtsp-server libnice libnice-gstreamer
```

실험실 YouTube import를 쓸 때는 `deno`가 있으면 `yt-dlp`의 일부 JS challenge 해결에 도움이 된다. 현재 `./server.sh install`은 macOS/Homebrew 경로에서는 `deno`를 같이 설치하고, Linux 배포판은 패키지 구성이 달라 별도 설치 안내로 본다.

### Linux 환경
Linux에서는 `pkg-config`가 GStreamer 개발 패키지를 찾을 수 있어야 한다.

Debian/Ubuntu 계열:

```bash
sudo apt update
sudo apt install -y \
  build-essential cmake pkg-config curl ffmpeg python3 nodejs yt-dlp \
  libgstreamer1.0-dev libgstrtspserver-1.0-dev libnice-dev \
  gstreamer1.0-tools gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good gstreamer1.0-plugins-bad
```

Fedora 계열:

```bash
sudo dnf install -y \
  gcc-c++ cmake pkgconf-pkg-config curl ffmpeg python3 nodejs yt-dlp \
  libnice libnice-devel \
  gstreamer1-devel gstreamer1-rtsp-server-devel \
  gstreamer1-plugins-base-tools gstreamer1-plugins-base \
  gstreamer1-plugins-good gstreamer1-plugins-bad-free
```

Arch 계열:

```bash
sudo pacman -S --needed \
  base-devel cmake pkgconf curl ffmpeg python nodejs yt-dlp \
  gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad \
  gst-rtsp-server libnice
```

프로젝트 스크립트로도 설치를 시도할 수 있다.

```bash
./server.sh install
```

### 런타임 포트와 기본 경로
코드 레벨 기본값은 `include/stdafx.h`에 있다. 다만 `./server.sh start`의 실행 기본값은 새 환경에서 바로 LAN 테스트가 가능하도록 RTSP/HTTP address를 `0.0.0.0`로 덮어쓴다.
아래 표는 코드 기본값이다. 실제 실행 포트는 포트 충돌 회피나 `scripts/.media_server.env` 값 때문에 달라질 수 있으므로, 테스트 URL은 항상 `./server.sh status` 또는 `./server.sh urls` 출력값을 우선 사용한다.

| 항목 | 기본값 | 설명 |
| --- | --- | --- |
| RTSP listen address | `127.0.0.1` | RTSP server bind address |
| RTSP listen port | `8554` | RTSP server port |
| HTTP listen address | `127.0.0.1` | WebRTC signaling/WHEP/WHIP HTTP bind address |
| HTTP listen port | `8080` | WebRTC HTTP server port |
| route | `dhseo` | RTSP path prefix |
| file root | `video` | `?file=` 접근 가능 root. 실행 시 project root 기준 절대 경로로 정규화 |
| default file | `video/sample_h264.mp4` | 기본 테스트 파일. 실행 시 project root 기준 절대 경로로 정규화 |

### 경로 표기 정책
레포에 남는 문서/예시와 URL query에는 프로젝트 루트 기준 상대경로를 사용한다.

- `?file=` 값은 `MEDIA_SERVER_FILE_ROOT` 기준 token이다. 기본 file root가 `video`이므로 `sample_h264.mp4`, `imports/NewYorkDriving.mp4`처럼 쓴다.
- `model`, `labels`를 디버그 query로 직접 넘겨야 할 때도 `models/yolo11n.onnx`, `models/coco.names`처럼 프로젝트 루트 기준 상대경로를 쓴다.
- 일반 VA 사용 URL은 `?file=...&va=1`만 권장한다. detector/model/labels 기본값은 `include/stdafx.h`, `scripts/.media_server.env`, `MEDIA_SERVER_ANALYSIS_*` 환경변수로 관리한다.
- 런타임 내부에서는 상대경로를 절대경로로 정규화할 수 있지만, 문서와 커밋 대상 설정에는 개인 홈 디렉터리 같은 절대경로를 남기지 않는다.
- 예외적으로 Homebrew prefix, ONNX Runtime 설치 root, 임시 디렉터리처럼 프로젝트 밖 시스템 위치를 지정해야 하는 값은 절대경로를 사용할 수 있다.

테스트 중 포트 충돌을 피하려면 env로 덮어쓴다.

```bash
MEDIA_SERVER_LISTEN_PORT=8555 \
MEDIA_SERVER_HTTP_LISTEN_PORT=8081 \
./server.sh foreground
```

### 런타임 환경변수
환경변수는 `src/app_config.cpp`에서 읽고, 기본값은 `include/app_config.h`와 `include/stdafx.h`에 있다.

| env | 기본값/의미 |
| --- | --- |
| `MEDIA_SERVER_ROUTE` | RTSP route prefix. 기본 `dhseo` |
| `MEDIA_SERVER_LISTEN_ADDRESS` | RTSP bind address |
| `MEDIA_SERVER_LISTEN_PORT` | RTSP bind port |
| `MEDIA_SERVER_HTTP_LISTEN_ADDRESS` | WebRTC HTTP bind address |
| `MEDIA_SERVER_HTTP_LISTEN_PORT` | WebRTC HTTP bind port |
| `MEDIA_SERVER_FILE_ROOT` | `?file=` 접근 가능 root |
| `MEDIA_SERVER_DEFAULT_FILE` | 기본 sample file |
| `MEDIA_SERVER_ANALYSIS_DETECTOR` | `va=1` 기본 detector. 기본 `yolo` |
| `MEDIA_SERVER_ANALYSIS_MODEL` | `va=1` 기본 model 경로. 기본 `models/yolo11n.onnx` |
| `MEDIA_SERVER_ANALYSIS_LABELS` | `va=1` 기본 label 경로. 기본 `models/coco.names` |
| `MEDIA_SERVER_ANALYSIS_FPS` | `va=1` 기본 sampling fps. 기본 `8` |
| `MEDIA_SERVER_ANALYSIS_MAX_QUEUE` | `va=1` 기본 detector queue. 기본 `1` |
| `MEDIA_SERVER_ANALYSIS_INPUT_WIDTH` | `va=1` 기본 model input width. 기본 `640` |
| `MEDIA_SERVER_ANALYSIS_INPUT_HEIGHT` | `va=1` 기본 model input height. 기본 `640` |
| `MEDIA_SERVER_ANALYSIS_CONFIDENCE` | `va=1` 기본 confidence threshold. 기본 `0.25` |
| `MEDIA_SERVER_ANALYSIS_NMS` | `va=1` 기본 NMS threshold. 기본 `0.45` |
| `MEDIA_SERVER_ANALYSIS_PREPROCESS` | `va=1` 기본 YOLO 전처리. 기본 `letterbox` |
| `MEDIA_SERVER_ANALYSIS_TRACKING` | `1`이면 `va=1` 기본 tracker 사용. 기본 `1` |
| `MEDIA_SERVER_ANALYSIS_OVERLAY_WAIT_MS` | `va=1` 기본 overlay result 대기 시간. 기본 `180` |
| `MEDIA_SERVER_ANALYSIS_OVERLAY_SYNC_TOLERANCE_MS` | `va=1` 기본 PTS 매칭 허용 범위. 기본 `400` |
| `MEDIA_SERVER_ANALYSIS_OVERLAY_THICKNESS` | `va=1` 기본 detection box 두께. 기본 `3` |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE` | `1`이면 VA adaptive tuner 사용. 기본 `1` |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE_INPUT_SIZE` | `1`이면 fps 하한 이후 input size도 조절. 기본 `1` |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE_MIN_FPS` | adaptive fps 하한. 기본 `2` |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE_COOLDOWN_MS` | adaptive 조절 간 최소 대기 시간. 기본 `3000` |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE_INPUT_STEP` | input size 조절 단위. 기본 `128` |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE_MIN_INPUT_WIDTH` | adaptive input width 하한. 기본 `320` |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE_MIN_INPUT_HEIGHT` | adaptive input height 하한. 기본 `320` |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE_HIGH_LATENCY_RATIO` | 분석 시간이 frame budget 대비 이 비율을 넘으면 과부하로 본다. 기본 `0.85` |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE_LOW_LATENCY_RATIO` | 분석 시간이 frame budget 대비 이 비율보다 낮은 상태가 지속되면 복구 후보로 본다. 기본 `0.35` |
| `MEDIA_SERVER_ANALYSIS_REGISTRY` | lab profile/rule registry 저장 파일. 기본 `.media_server.analysis_registry.json` |
| `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED` | `1`이면 rule event POST worker 사용. 기본 `0` |
| `MEDIA_SERVER_ANALYSIS_EVENT_POST_TIMEOUT_MS` | event POST 1건의 curl timeout. 기본 `3000` |
| `MEDIA_SERVER_ANALYSIS_EVENT_POST_MAX_QUEUE` | event POST worker queue 상한. 기본 `256` |
| `MEDIA_SERVER_ANALYSIS_EVENT_POST_COOLDOWN_MS` | 같은 이벤트 dedupe key 재전송 억제 시간. 기본 `2000` |
| `MEDIA_SERVER_FORCE_RTSP_TCP` | `1`이면 RTSP transport를 TCP 위주로 강제 |
| `MEDIA_SERVER_SESSION_TRACE` | `1`이면 SessionManager acquire/cleanup 로그 출력 |
| `MEDIA_SERVER_WEBRTC_TRACE` | `1`이면 WebRTC 협상/상태 로그 출력 |
| `MEDIA_SERVER_WEBRTC_TRACE_VERBOSE` | `1`이면 sample/pad/caps/SDP 상세 로그 추가 |
| `MEDIA_SERVER_WEBRTC_SOURCE_READY_TIMEOUT_MS` | WHIP publish source track 준비 대기 시간 |
| `MEDIA_SERVER_WEBRTC_VIDEO_WIDTH` | WebRTC 송출 video 정규화 width. 기본 `1280` |
| `MEDIA_SERVER_WEBRTC_VIDEO_HEIGHT` | WebRTC 송출 video 정규화 height. 기본 `720` |
| `MEDIA_SERVER_WEBRTC_VIDEO_FPS` | WebRTC 송출 video 정규화 fps. 기본 `30` |
| `MEDIA_SERVER_WEBRTC_VIDEO_BITRATE_KBPS` | WebRTC H264 송출 bitrate. 기본 `6000` |
| `MEDIA_SERVER_WEBRTC_VIDEO_KEYFRAME_INTERVAL` | WebRTC H264 keyframe interval. 기본 `30` |
| `MEDIA_SERVER_WEBRTC_X264_PRESET` | WebRTC H264 encoder preset. 기본 `superfast` |
| `MEDIA_SERVER_URI_VIDEO_WIDTH` | HTTP/HLS/YouTube URI source 내부 H264 width. 기본 `1280` |
| `MEDIA_SERVER_URI_VIDEO_HEIGHT` | HTTP/HLS/YouTube URI source 내부 H264 height. 기본 `720` |
| `MEDIA_SERVER_URI_VIDEO_FPS` | HTTP/HLS/YouTube URI source 내부 H264 fps. 기본 `30` |
| `MEDIA_SERVER_URI_VIDEO_BITRATE_KBPS` | HTTP/HLS/YouTube URI source를 내부 H264로 만들 때 쓰는 bitrate. 기본 `6000` |
| `MEDIA_SERVER_URI_X264_PRESET` | HTTP/HLS/YouTube URI source 내부 H264 encoder preset. 기본 `superfast` |
| `MEDIA_SERVER_URI_TRACK_SETTLE_QUIET_PERIOD_MS` | URI source에서 첫 track 이후 audio/video 추가 발견을 기다리는 quiet period. 기본 `800` |
| `MEDIA_SERVER_URI_TRACK_SETTLE_MAX_MS` | URI source track discovery 전체 상한. 기본 `2500` |
| `MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS` | `./server.sh test`에서 hard gate로 볼 외부 RTSP URL 후보 목록. 쉼표/세미콜론 구분 |
| `MEDIA_SERVER_TEST_REQUIRE_EXTERNAL_SOURCE` | `1`이면 기본 외부 RTSP 후보 실패도 hard fail 처리 |
| `MEDIA_SERVER_RTSP_SOURCE_PREFLIGHT_TIMEOUT_MS` | 외부 RTSP host:port 사전 연결성 검사 timeout |
| `MEDIA_SERVER_RTSP_SOURCE_START_TIMEOUT_MS` | RTSP/URI source 첫 sample 대기 timeout |
| `MEDIA_SERVER_RTSP_TRACK_SETTLE_QUIET_PERIOD_MS` | 첫 track 이후 추가 track discovery quiet period |
| `MEDIA_SERVER_RTSP_TRACK_SETTLE_MAX_MS` | track discovery 전체 상한 |
| `MEDIA_SERVER_START_STABILITY_WAIT_S` | `./server.sh start`가 listen 확인 후 프로세스 생존을 추가 확인하는 시간. 기본 `1` |
| `MEDIA_SERVER_GST_ATTACH_CONTEXT` | GStreamer RTSP server main context 강제 설정 |
| `MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE` | `1`이면 숨겨진 실험실 `source=youtube` 경로를 노출. 기본 `0` |
| `MEDIA_SERVER_ENABLE_LAB_YOUTUBE_IMPORT` | `1`이면 `/lab/import` YouTube 파일 다운로드 UI/API 사용. 기본 `1` |
| `MEDIA_SERVER_YOUTUBE_RESOLVER_BIN` | YouTube URL 해석에 사용할 resolver binary. 기본 `yt-dlp` |
| `MEDIA_SERVER_YOUTUBE_FORMAT` | `yt-dlp -f` format selector. 기본은 720p 이하 progressive HTTP muxed 우선, live/HTTP 불가 시 HLS fallback |
| `MEDIA_SERVER_YOUTUBE_RESOLVE_TIMEOUT_MS` | YouTube URL 해석 timeout. 기본 `15000` |
| `MEDIA_SERVER_YOUTUBE_RECONNECT_DELAY_MS` | YouTube delegate가 중단된 뒤 재해석/재연결을 시도하기 전 대기 시간. 기본 `2000` |

로컬 실행용 env 파일은 아래 예시를 복사해서 만든다.

```bash
cp scripts/.media_server.env.example scripts/.media_server.env
```

`./server.sh start`, `./server.sh restart`, `./server.sh foreground`는 이 파일이 있으면 읽어서 적용한다.

### 실행 스크립트 역할
일반 사용자는 루트의 `server.sh`만 사용한다. 세부 구현은 `scripts/internal/` 아래에 숨겨져 있으며, 직접 실행은 디버깅이 필요할 때만 권장한다.

| 명령 | 용도 |
| --- | --- |
| `./server.sh install` | macOS/Linux 의존성, ONNX Runtime, YOLO 모델/라벨, 로컬 env 준비 |
| `./server.sh build` | 서버를 실행하지 않고 AI 포함 기본 빌드 수행 |
| `./server.sh start` | AI 포함 기본 빌드 후 background 실행 |
| `./server.sh stop` | 서버 종료. stale pid가 있어도 기록/후보 포트의 `media_server` listener를 추가 정리 |
| `./server.sh restart` | 서버 재시작 후 진단 |
| `./server.sh status` | 프로세스/포트/로그 상태 확인 |
| `./server.sh diagnose` | 실행환경, 포트, source 접근성 진단 |
| `./server.sh urls` | 같은 LAN의 다른 PC에서 복사해 테스트할 URL 출력 |
| `./server.sh foreground` | foreground 실행. 개발/디버깅 권장 |
| `./server.sh test` | 안정 기능 기준 통합 테스트. 한글 원인 리포트와 `.media_server.test/` 로그 생성 |
| `./server.sh verify-codecs` | source/route codec matrix 자동 검증 |
| `./server.sh verify-va` | YOLO/VA overlay lab, RTSP, WebRTC 회귀 검증 |
| `./server.sh verify-va-events` | 실제 이동 영상 기준 tracker, line-crossing, enter, exit 이벤트 검증 |
| `./server.sh verify-route-profiles` | 실제 RTSP/WebRTC overlay 세션 기준 route별 profile/rule matching 검증 |
| `./server.sh verify-tracker-stability` | 이동 영상 기준 track ID 유지/분절 통계 수집 |
| `./server.sh verify-yolo-layouts` | YOLO 모델별 output layout/box/score 조합 회귀 검증 |
| `./server.sh verify-adaptive` | adaptive tuner의 과부하 downshift와 저부하 upshift 회귀 검증 |

### 권장 개발 흐름
처음 환경 구성:

```bash
./server.sh install
./server.sh build
pkg-config --modversion gstreamer-1.0
gst-inspect-1.0 webrtcbin nicesrc nicesink
yt-dlp --version
deno --version   # optional, helps yt-dlp solve some YouTube JS challenges
```

AI 포함 기본 빌드와 실행:

```bash
./server.sh start
```

수동으로 YOLO/ONNX detector를 켜서 빌드할 때:

```bash
cmake -S . -B build-gst-onnx \
  -DMEDIA_SERVER_USE_GSTREAMER=ON \
  -DMEDIA_SERVER_USE_ONNXRUNTIME=ON \
  -DMEDIA_SERVER_ONNXRUNTIME_ROOT=<onnxruntime-install-root>
cmake --build build-gst-onnx
```

macOS/Homebrew에서는 아래처럼 설치하고 root를 지정할 수 있다.

```bash
brew install onnxruntime
cmake -S . -B build-gst-onnx \
  -DMEDIA_SERVER_USE_GSTREAMER=ON \
  -DMEDIA_SERVER_USE_ONNXRUNTIME=ON \
  -DMEDIA_SERVER_ONNXRUNTIME_ROOT=/opt/homebrew/opt/onnxruntime
cmake --build build-gst-onnx
```

ONNX Runtime 개발 파일이 없으면 `MEDIA_SERVER_USE_ONNXRUNTIME=ON` 구성은 실패한다. 일반 사용 흐름에서는 `./server.sh install`이 ONNX Runtime/YOLO 자산을 준비하고, `./server.sh build` 또는 `./server.sh start`가 `build-gst-onnx`를 기본 빌드로 사용한다.

개발 실행:

```bash
./server.sh foreground
```

상태 확인:

```bash
./server.sh status
./server.sh diagnose
```

자동 검증:

```bash
./server.sh test
./server.sh verify-codecs
./server.sh verify-va
./server.sh verify-va-events
./server.sh verify-route-profiles
./server.sh verify-tracker-stability
./server.sh verify-yolo-layouts
./server.sh verify-adaptive
./server.sh verify-image-analysis
```

`./server.sh test`의 기본 기준은 안정 기능으로 승격한 스트리밍 + 기본 VA 기능을 포함한다.
- 모든 test 모드 포함: 스크립트/JSON 정적 검사, 서버 start/status/diagnose, LAN IP 기준 외부 클라이언트 접근성.
- stable 포함: 제3자 RTSP upstream reachability advisory, 로컬 file source, 로컬 RTSP pull source, 로컬 WebRTC publish source의 RTSP/WebRTC 소비, YOLO/VA overlay 회귀 검증.
- 제외: HTTP/HLS URI source, YouTube source/import, `/lab` UI, 룰/이벤트/POST, adaptive tuner.
- 선택 검증: `./server.sh test --include-rules`는 profile/rule registry CRUD와 rule match 기반 profile 자동 선택을 추가 확인한다.
- 선택 검증: `./server.sh test --include-va-events`는 실제 이동 영상 기반 tracker/event 판정을 추가 확인한다.
- 선택 검증: `./server.sh test --include-image-analysis`는 개발용 정적 이미지 분석 API를 추가 확인한다.
- 예외 생략: `./server.sh test --skip-va`는 ONNX/브라우저 자동화가 불가능한 환경에서만 사용한다.
- 외부 네트워크 또는 LAN IP probe가 막힌 격리 환경에서만 `./server.sh test --skip-external`로 LAN IP 외부 접근성과 제3자 RTSP upstream 확인을 생략한다.
- 신뢰 가능한 카메라/테스트 RTSP URL이 있으면 `MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS='rtsp://...' ./server.sh test`로 hard gate 검증한다.
- 실패 시 `.media_server.test/<timestamp>/` 아래에 원본 로그를 남기고, 콘솔에는 한글 원인 추정을 출력한다.
- 앞으로 기능을 추가할 때는 안정 기능으로 승격한 항목만 `./server.sh test` 기본 기준에 넣고, 아직 실험/불안정한 항목은 `--include-*` 선택 검증으로 먼저 둔다.

tracker 장시간 검증:

```bash
./server.sh verify-tracker-stability --long
```

`--long`은 기본 120초 x 3회 반복으로 동작한다. 기본 파일을 따로 지정하지 않으면 `video/imports/va_tracking_event_1280x720_30fps_h264.mp4`에서 2분 이상 장기 샘플 `video/imports/va_tracking_event_slow_long_1280x720_30fps_h264.mp4`를 자동 생성해 사용한다. 장기 샘플은 원본 이동 영상을 5배 슬로우모션으로 늘려 서버 EOF loop와 편집 컷 경계를 피한다. 이 장기 샘플은 로컬 검증 산출물이며 git에는 포함하지 않는다.

반복 검증은 기본적으로 각 iteration 사이에 source idle cleanup을 기다려 같은 파일을 처음부터 다시 분석한다. 이렇게 해야 2회차가 1회차 재생이 끝난 파일 source의 중간/끝부분에 붙어서 stale PTS가 누적되는 오판을 피할 수 있다. 연속 스트림처럼 source를 재시작하지 않고 보고 싶다면 `--continuous-source`를 사용한다.

tracker fragmentation 계산은 기본적으로 다음 안정화 필터를 적용한다.
- `segmentAware=1`: PTS 역행/중복 PTS를 감지해 파일 반복/정지 경계를 segment로 분리한다.
- `classWhitelist=person`: 테스트 목적상 사람 track만 fragmentation 계산에 포함한다.
- `minTrackSamples=3`: 1~2회만 보인 짧은 오검출 track은 제외한다.
- `maxStaleRatio=0.3`: 같은 PTS가 과도하게 반복되면 분석 source가 멈춘 것으로 보고 실패시킨다.
- 필요하면 `--class-whitelist '*'`, `--min-track-samples 1`, `--max-stale-ratio 1.0`, `--no-segment-aware`, `--no-long-sample`로 원시 계산에 가깝게 바꿀 수 있다.

변경 전후 최소 확인:

```bash
cmake --build build-gst-onnx
bash -n server.sh scripts/internal/*.sh
python3 -m json.tool config/codec_test_sources.json >/tmp/codec_test_sources.json.check
git diff --check
```

### 실행 환경 이슈 체크
macOS/Homebrew에서 GStreamer plugin scanner 또는 `libglib`, `libgobject` 탐색 문제가 나면 아래를 먼저 확인한다.

```bash
source ./scripts/internal/env_common.sh
media_server_apply_homebrew_gst_env
gst-inspect-1.0 --version
gst-inspect-1.0 webrtcbin
gst-inspect-1.0 nicesrc
gst-inspect-1.0 nicesink
```

서버가 실행 중인데 접속이 안 되면 아래 순서로 본다.

```bash
./server.sh status
lsof -nP -iTCP:8554 -iTCP:8080 -sTCP:LISTEN
./server.sh diagnose
```

샌드박스/CI/컨테이너 환경에서는 socket bind 자체가 막힐 수 있다. 이 경우 코드는 정상이어도 local runtime 검증이 실패할 수 있으므로 `./server.sh diagnose`에서 bind 가능 여부를 먼저 확인한다.

## 주요 설정 위치

### 기본 상수
- `include/stdafx.h`
  - `kStreamRoute`
  - `kRtspListenAddress`
  - `kRtspListenPort`
  - `kHttpListenAddress`
  - `kHttpListenPort`
  - `kFileRootPath`
  - `kDefaultFilePath`

`kFileRootPath`, `kDefaultFilePath`의 기본값은 repo 기준 상대 경로이며, 실행 시 `AppConfig`에서 절대 경로로 정규화된다. 배포/테스트 환경이 다르면 `MEDIA_SERVER_FILE_ROOT`, `MEDIA_SERVER_DEFAULT_FILE`로 override한다.

### 런타임 환경변수
- `include/app_config.h`
- `src/app_config.cpp`

주요 env:
- `MEDIA_SERVER_ROUTE`
- `MEDIA_SERVER_LISTEN_ADDRESS`
- `MEDIA_SERVER_LISTEN_PORT`
- `MEDIA_SERVER_HTTP_LISTEN_ADDRESS`
- `MEDIA_SERVER_HTTP_LISTEN_PORT`
- `MEDIA_SERVER_FILE_ROOT`
- `MEDIA_SERVER_DEFAULT_FILE`
- `MEDIA_SERVER_FORCE_RTSP_TCP`
- `MEDIA_SERVER_SESSION_TRACE`
- `MEDIA_SERVER_WEBRTC_TRACE`
- `MEDIA_SERVER_WEBRTC_TRACE_VERBOSE` (sample/pad/SDP detail logs)
- `MEDIA_SERVER_RTSP_SOURCE_PREFLIGHT_TIMEOUT_MS`
- `MEDIA_SERVER_RTSP_SOURCE_START_TIMEOUT_MS`
- `MEDIA_SERVER_RTSP_TRACK_SETTLE_QUIET_PERIOD_MS`
- `MEDIA_SERVER_RTSP_TRACK_SETTLE_MAX_MS`
- `MEDIA_SERVER_YOUTUBE_RESOLVER_BIN`
- `MEDIA_SERVER_YOUTUBE_FORMAT`
- `MEDIA_SERVER_YOUTUBE_RESOLVE_TIMEOUT_MS`
- `MEDIA_SERVER_YOUTUBE_RECONNECT_DELAY_MS`

예제 env 파일:
- `scripts/.media_server.env.example`

## 의존성 설치

개발 환경 상세는 위의 `개발 및 실행 환경` 섹션을 우선 참고한다.

```bash
./server.sh install
```

macOS/Homebrew 기준으로는 `gstreamer`, `gst-plugins-*`, `gstreamer-rtsp-server`, `libnice-gstreamer`, `ffmpeg`, `node`, `yt-dlp` 계열이 필요합니다.

## 빌드

```bash
./server.sh start
```

## 실행

### foreground
개발/디버깅 시 가장 권장됩니다.

```bash
./server.sh foreground
```

### background
```bash
./server.sh start
```

### 중지 / 재시작 / 상태 확인
```bash
./server.sh stop
./server.sh restart
./server.sh status
./server.sh diagnose
```

## 기본 접속 주소

기본값 기준:
- RTSP: `rtsp://127.0.0.1:8554/dhseo`
- lab 통합 page: `http://127.0.0.1:8080/lab`
- stable test 호환 page: `http://127.0.0.1:8080/webrtc/test`
- lab rule editor 호환 page: `http://127.0.0.1:8080/lab/rules`
- lab import 호환 page: `http://127.0.0.1:8080/lab/import`

일반 수동 테스트와 개발 UI는 `/lab`를 기준으로 사용한다. `/webrtc/test`, `/lab/rules`, `/lab/import`는 자동화, 기존 링크, 직접 디버깅을 위한 호환 route다.

실행 로그에 실제 listen 주소와 포트가 출력됩니다.

## URL 형식

### 1. file -> RTSP

기본:
```text
rtsp://{address}:{port}/{route}?file={filename}
```

예시:
```text
rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4
rtsp://127.0.0.1:8554/dhseo/h265?file=sample_h264.mp4
rtsp://127.0.0.1:8554/dhseo/opus?file=sample_h264.mp4
rtsp://127.0.0.1:8554/dhseo/h265/pcmu?file=sample_h264.mp4
```

### 2. RTSP pull -> RTSP

기본:
```text
rtsp://{address}:{port}/{route}?url={urlencoded_rtsp_url}
```

예시:
```text
rtsp://127.0.0.1:8554/dhseo?url=rtsp%3A%2F%2Fcamera-host%3A554%2Flive
rtsp://127.0.0.1:8554/dhseo/h265/opus?url=rtsp%3A%2F%2Fcamera-host%3A554%2Flive
```

### 3. file -> WebRTC(signaling)

simple signaling:
```text
POST http://127.0.0.1:8080/webrtc/session?file=sample_h264.mp4
```

WHEP:
```text
POST http://127.0.0.1:8080/whep?file=sample_h264.mp4
```

### 4. RTSP pull -> WebRTC(signaling)

simple signaling:
```text
POST http://127.0.0.1:8080/webrtc/session?url=rtsp%3A%2F%2Fcamera-host%3A554%2Flive
```

WHEP:
```text
POST http://127.0.0.1:8080/whep?url=rtsp%3A%2F%2Fcamera-host%3A554%2Flive
```

### 5. WebRTC publish -> RTSP / WebRTC

WHIP-style publish:
```text
POST http://127.0.0.1:8080/whip/publish?sourceId={source_id}
Content-Type: application/sdp
Body: publisher offer SDP
```

로컬 테스트 publisher:
```bash
source ./scripts/internal/env_common.sh
media_server_apply_homebrew_gst_env
python3 -u ./scripts/internal/whip_publish_test.py --http-base http://127.0.0.1:8080 --source-id publisher-demo --duration 0
```

`--duration 0`은 명시적으로 중지할 때까지 계속 publish한다.

publish 후 RTSP에서 소비:
```text
rtsp://127.0.0.1:8554/dhseo?source=webrtc&url={source_id}
```

publish 후 WebRTC egress에서 소비:
```text
POST http://127.0.0.1:8080/webrtc/session?source=webrtc&url={source_id}
POST http://127.0.0.1:8080/whep?source=webrtc&url={source_id}
```

### 6. HTTP/HLS URL -> RTSP / WebRTC

HTTP/HLS playable URL은 기존 URI source 경로로 소비한다. 현재 안정 기준은 WebRTC consume 쪽이며, RTSP consume 쪽은 과거 통과 이력은 있으나 최신 blocker 체크에서 `503 Service Unavailable`이 재현되어 재확인 대상으로 둔다.

```text
rtsp://127.0.0.1:8554/dhseo?source=http&url={urlencoded_http_media_url}
rtsp://127.0.0.1:8554/dhseo?source=hls&url={urlencoded_m3u8_url}
POST http://127.0.0.1:8080/webrtc/session?source=http&url={urlencoded_http_media_url}
POST http://127.0.0.1:8080/whep?source=hls&url={urlencoded_m3u8_url}
```

주의:
- `source=http|hls -> WebRTC`는 1차 지원 경로로 본다. 최신 blocker 체크에서 signaling/session 생성은 통과했다.
- `source=http|hls -> RTSP`는 부분 구현/재검증 필요 상태다.
- 짧은 VOD 반복, video-only 입력, late joiner 검증은 현재 WebRTC 중심으로 문서화한다.

### 7. Experimental: YouTube watch/live URL -> RTSP / WebRTC

`source=youtube`는 코드에 남아 있는 실험실 기능이며 기본값으로는 숨김/비활성화 상태다.
서버를 아래처럼 시작한 경우에만 test page와 helper script에 노출된다.

```bash
MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1 ./server.sh foreground
```

활성화되면 서버는 `yt-dlp`를 실행해 실제 HTTP/HLS URL로 해석한 뒤, 기존 `source=http|hls` URI source worker에 위임한다.

```text
rtsp://127.0.0.1:8554/dhseo?source=youtube&url={urlencoded_youtube_watch_or_live_url}
POST http://127.0.0.1:8080/webrtc/session?source=youtube&url={urlencoded_youtube_watch_or_live_url}
POST http://127.0.0.1:8080/whep?source=youtube&url={urlencoded_youtube_watch_or_live_url}
```

주의:
- `source=youtube`는 기본값으로 비활성화되어 있고, 명시적으로 켰을 때만 사용한다.
- `source=youtube`는 `yt-dlp`가 설치되어 있어야 동작한다.
- YouTube URL은 권한, 지역 제한, 로그인 필요 여부, URL 만료 정책에 영향을 받는다.
- 비공개, 로그인 필요, 지역 제한, 접근권한이 필요한 URL은 MediaServer에서 우회하지 않고 실패로 처리한다.
- resolver 결과는 서명된 임시 URL일 수 있으므로 stream key는 원본 YouTube URL 기준으로 묶고, 실제 media URL은 worker 내부에서만 사용한다.
- 동일 YouTube URL을 여러 클라이언트가 동시에 요청하면 원본 YouTube URL 기준으로 dedup되어 resolver/source worker는 1개만 시작된다.
- 실행 중 HLS/HTTP delegate가 중단되면 `MEDIA_SERVER_YOUTUBE_RECONNECT_DELAY_MS` 이후 원본 YouTube URL을 다시 resolve해서 재연결을 시도한다.

- YouTube/HTTP/HLS는 `URI source 1차 H264 인코딩`과 `WebRTC egress H264 인코딩`을 모두 거칠 수 있다. 기본값은 두 단계 모두 720p/30fps, 6000kbps로 맞춰 불필요한 1080p 중간 인코딩 비용과 블록 artifact를 줄인다. 고화질/복잡한 장면에서 블록 깨짐이 보이면 bitrate를 먼저 올리고, 지연이 커지면 fps/해상도 또는 preset을 조정한다.
- YouTube 기본 format selector는 업로드/VOD에서 720p 이하 progressive HTTP muxed URL을 먼저 고른다. 이 경로는 `source=http`로 들어가 EOF 시 처음으로 되감아 짧은 영상 반복/late joiner 테스트가 안정적이다.
- YouTube live이거나 progressive HTTP muxed URL이 없으면 720p 이하 HLS로 fallback한다. 필요하면 `MEDIA_SERVER_YOUTUBE_FORMAT`으로 더 높은 화질이나 HLS 우선을 명시한다.

실패 메시지 기준:
- `invalid YouTube URL host`
  - `source=youtube`에 YouTube 계열 host가 아닌 URL이 들어온 경우다.
- `source=youtube is disabled by default`
  - 실험실 기능을 켜지 않은 상태에서 `source=youtube`를 요청한 경우다.
- `resolver binary ... was not found`
  - `yt-dlp`가 설치되어 있지 않거나 `MEDIA_SERVER_YOUTUBE_RESOLVER_BIN` 경로가 틀린 경우다.
- `private video`, `authentication required`, `region restricted`
  - 공개 접근이 불가능한 URL이다. 현재 정책은 cookies/login 연동 없이 명확히 실패시키는 것이다.
- `live archive unavailable`
  - 종료된 라이브의 archive가 아직 제공되지 않거나 접근 불가능한 상태다.
- `format unavailable`
  - 현재 `MEDIA_SERVER_YOUTUBE_FORMAT` selector로 재생 가능한 HLS/HTTP URL을 얻지 못한 경우다.
- `resolver output appears to contain separate media URLs`
  - `yt-dlp`가 video/audio 분리 URL을 반환한 경우다. 현재 서버는 단일 HLS 또는 muxed HTTP URL을 URI source에 위임하는 구조이므로 format selector를 HLS 또는 muxed format 우선으로 조정해야 한다.
- `YouTube resolver timed out`
  - 네트워크 지연 또는 resolver 응답 지연이다. 필요하면 `MEDIA_SERVER_YOUTUBE_RESOLVE_TIMEOUT_MS`를 늘린다.

### 8. Lab Import: YouTube URL -> local file

`/lab/import`는 YouTube URL을 개발용 샘플 파일로 내려받아 `video/imports` 아래에 저장한다.
이 경로는 `source=youtube` 직접 표출과 분리되어 있으며 기본값으로 UI/API가 보인다.
저장된 파일 token은 기존 file source와 동일하게 사용한다.

```text
file=imports/{downloaded_file}.mp4
rtsp://127.0.0.1:8554/dhseo?file=imports/{downloaded_file}.mp4
POST http://127.0.0.1:8080/webrtc/session?file=imports/{downloaded_file}.mp4
```

주의:
- `yt-dlp`와 `ffmpeg`가 필요하다.
- `MEDIA_SERVER_ENABLE_LAB_YOUTUBE_IMPORT=0`으로 끌 수 있다.
- 로그인, 지역 제한, bot check, 비공개 URL은 우회하지 않는다.
- 다운로드 완료 후 `ffmpeg`로 `h264 + aac stereo + mp4` 형태로 정규화해서 기존 relay/analysis 입력으로 재사용하기 쉽게 만든다.

## 앞으로 붙일 영상 분석 계층

WebRTC까지 안정화한 이후에는, MediaServer가 원본 video/audio를 받아서 `객체 감지`, `추적`, `이벤트 추출`, `스냅샷 생성` 같은 분석을 수행할 수 있도록 확장할 예정입니다.

권장 구조는 아래와 같습니다.

```text
Original Source
    |
    v
SourceWorker
    |
    v
SharedStream
    | \
    |  \-> Analysis Pipeline
    |       - object detection
    |       - event extraction
    |       - snapshot / thumbnail
    |
    +----> RTSP Egress
    |
    +----> WebRTC Egress
```

핵심 원칙:
- 분석 로직은 `SourceWorker` 안에 섞지 않고 `SharedStream`을 구독하는 별도 계층으로 둡니다.
- 원본 전송 경로와 분석 파이프라인을 분리해서, 분석 기능 추가가 기본 스트리밍 안정성을 깨지 않게 합니다.
- `SharedStream`은 client subscriber와 analysis subscriber를 분리해서 센다. 분석 tap은 relay client ref-count를 증가시키지 않지만, source 제거는 전체 subscriber가 빠진 뒤에만 수행해 분석 중 cleanup race를 피한다.
- 분석 결과는 최소 세 가지 타입으로 나눠 다룹니다.
  - `metadata`: box, label, score, timestamp
  - `derived image`: JPEG snapshot, thumbnail, crop image
  - `rendered stream`: bounding box overlay가 들어간 2차 스트림

현재 구현 상태:
- `include/analysis/analysis_types.h`: 분석 profile, raw frame, detection/track/pose/result 타입 skeleton
- `include/analysis/detector.h`: YOLO/ONNX detector를 교체할 수 있는 공통 인터페이스
- `include/analysis/analysis_manager.h`: `SharedStream`에 analysis tap을 붙이고 최신 결과를 보관하는 manager skeleton
- `include/analysis/raw_video_decoder.h`: compressed video packet을 raw frame으로 바꾸는 decoder hub 인터페이스
- `src/analysis/dummy_detector.cpp`: 실제 검출 없이 lifecycle만 확인하는 dummy detector
- `src/analysis/yolo_onnx_detector.cpp`: ONNX Runtime 기반 YOLO detector. `MEDIA_SERVER_USE_ONNXRUNTIME=ON` 빌드에서만 실제 추론 가능
- `src/analysis/raw_video_decoder.cpp`: GStreamer `appsrc -> parser/decoder -> videoconvert -> appsink` 기반 raw RGB decode hub
- `src/analysis/event_rule_engine.cpp`: 저장된 rule JSON을 detection 결과에 적용해 presence, enter, exit, line-crossing 이벤트를 판정하는 1차 engine
- `src/analysis/event_post_dispatcher.cpp`: 이벤트 POST를 bounded queue에 넣고 background worker에서 `curl`로 전송하는 dispatcher
- `src/analysis/overlay_renderer.cpp`: OpenCV 없이 최신 raw frame 위에 detection box/label을 그리는 overlay renderer
- `src/analysis/snapshot_encoder.cpp`: 최신 raw frame을 JPEG snapshot으로 인코딩하는 helper
- `src/ingress/analysis_overlay_probe.cpp`: RTSP/WebRTC egress raw video 구간에서 frame PTS와 가까운 detection result를 overlay로 합성하는 GStreamer probe
- `/lab/analysis/taps`: 개발용 analysis tap attach/status/detach HTTP endpoint
- `/lab/analysis/taps/{tapId}/metadata`: 최신 detection metadata JSON endpoint
- `/lab/analysis/taps/{tapId}/events`: 저장된 rule을 최신 detection result에 적용한 event JSON endpoint
- `/lab/analysis/taps/{tapId}/events?dispatch=1`: 최신 event JSON을 반환하면서 POST worker에도 enqueue하는 개발/검증용 endpoint
- `/lab/analysis/event-post/status`: event POST worker queue와 성공/실패 카운터 확인 endpoint
- `/lab/analysis/taps/{tapId}/snapshot.jpg`: 최신 분석 frame JPEG snapshot endpoint
- `/lab/analysis/taps/{tapId}/overlay.jpg`: 최신 분석 frame에 detection box/label을 그린 JPEG endpoint
- analysis tap은 profile의 `fps`로 wall-clock 기준 frame sampling을 수행하고, `maxQueue`를 넘으면 오래된 raw frame부터 버린다.
- RTSP/WebRTC consume 요청에 `va=1`을 붙이면 서버 기본 VA profile을 사용해 같은 source에 analysis tap을 자동으로 붙이고, egress raw video 구간에 detection box/label을 합성한다.
- 저장된 rule은 `va=1` overlay 합성 시 매 frame 평가된다. 영상 재생 중 `/lab/rules`에서 rule을 바꾸면 다음 overlay frame부터 새 rule snapshot이 적용된다.
- 기본 `va=1` profile은 lightweight tracker를 켜고, detection metadata와 event payload에 `trackId`를 포함한다.
- rule event engine 1차 범위는 `presence`, `enter`, `exit`, `line-crossing(any)`다. tracker가 켜진 profile은 `trackId` 기준으로 객체 상태를 유지하고, tracker를 끈 profile은 호환성 때문에 detection index 기준으로 fallback한다.
- 이벤트로 판정된 detection은 `event.triggered=true` metadata를 갖고, overlay에서는 `이벤트 {label} {score%}` 또는 `Event {label} {score%}`와 rule highlight color로 깜빡인다.
- `eventActions.post.enabled=true`이고 URL이 있으면 overlay stream 또는 `/events?dispatch=1` 경로에서 POST worker에 enqueue할 수 있다. 실제 외부 전송은 `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1`로 명시적으로 켠 경우에만 수행한다.
- POST worker는 `curl`을 background thread에서 실행하므로 overlay 처리 thread를 직접 막지 않는다. 기본값은 안전하게 꺼져 있으며, 켠 경우 queue 초과 시 오래된 요청을 버리고 같은 이벤트는 cooldown 동안 재전송을 억제한다.
- `detector`, `model`, `labels`, `confidence`, `nms` 같은 세부값은 URL 기본 사용값에서 제외했다. 개발자가 바꿀 값은 `include/stdafx.h` 또는 `MEDIA_SERVER_ANALYSIS_*` 환경변수로 관리한다.
- adaptive tuner는 detector 처리시간, pending queue, queue drop을 보고 런타임 `fps`를 먼저 낮춘다. fps가 하한에 닿은 뒤에도 과부하가 지속되면 ONNX model이 dynamic input을 받을 수 있는 경우 `inputWidth/inputHeight`를 단계적으로 낮춘다.
- 고정 input ONNX model에서 input size 변경으로 inference가 실패하면 기본 input size로 되돌리고 input-size adaptive만 비활성화한다. fps adaptive는 계속 유지한다.
- detection label은 기본적으로 `차량(자동차) 88%`, `사람 91%`처럼 한글 카테고리 묶음과 percentage로 표기한다.
- `labelLang=en`을 지정하면 `Vehicle(car) 88%`, `Person 91%`처럼 첫 글자만 대문자인 짧은 영문 카테고리 묶음으로 표시한다.
- overlay snapshot/debug URL에 `trackIds=1` 또는 `drawTrackIds=1`을 붙이면 `사람 #1 91%`처럼 객체 ID를 label에 함께 표시한다.
- `trackTrails=1` 또는 `drawTrackTrails=1`을 붙이면 tracker가 유지한 최근 중심점 궤적을 객체 카테고리 색상으로 함께 그린다.
- overlay renderer는 Pango/Cairo가 빌드에 잡히면 한글/Unicode label을 직접 렌더링하고, Pango/Cairo가 없는 환경에서는 영문 ASCII fallback으로 표시한다.
- 이전 실험용 query인 `overlay=1`, `analysis=1`, `analysisOverlay=1`과 세부 override query는 호환성/디버그 목적으로만 남겨 둔다.
- overlay stream은 egress가 재작성한 normalized PTS를 원본 source PTS로 되돌려 analysis result history와 매칭한다. 이 덕분에 loop/replay 또는 B-frame reorder가 있어도 단순 최신 결과를 덮어쓰는 것보다 박스 밀림이 줄어든다.
- PTS 매칭이 실패하면 최신 result로 fallback한다. WHEP처럼 raw buffer PTS가 egress packet PTS mapping과 어긋나는 경로에서도 overlay가 아예 사라지지 않게 하기 위한 안전장치다.
- `overlaySyncToleranceMs`는 합성에 사용할 detection result의 PTS 허용 범위다. 기본값은 `400`ms다.
- `overlayWaitMs`는 현재 frame에 가까운 analysis result가 아직 도착하지 않았을 때 overlay probe가 기다리는 최대 시간이다. 기본값은 `180`ms다. 값을 키우면 박스 정합성은 좋아질 수 있지만 송출 지연이 늘 수 있다.
- YOLO 전처리는 기본 `letterbox`다. 기존 강제 resize 동작이 필요하면 `preprocess=stretch`를 지정한다.
- `/lab` 페이지의 “VA 분석”에서 WebRTC simple signaling과 WHEP overlay 재생을 브라우저로 직접 확인할 수 있다. 파일 소스는 `MEDIA_SERVER_FILE_ROOT` 아래의 지원 미디어 파일 목록을 dropdown으로 제공한다.
- RTSP overlay stream은 로컬 frame capture로 1차 검증했다. WebRTC overlay stream은 simple signaling과 WHEP 브라우저 playback까지 육안 검증했다.

개발용 analysis tap 예시:

```bash
curl -fsS -X POST 'http://127.0.0.1:8080/lab/analysis/taps?file=sample_h264.mp4&profileId=debug&fps=5'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/metadata'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/events'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/events?dispatch=1'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/event-post/status'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/snapshot.jpg?quality=85' -o snapshot.jpg
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/overlay.jpg?quality=85&thickness=3&drawLabels=1' -o overlay.jpg
curl -fsS -X DELETE 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}'
```

느린 detector 상황을 흉내내 drop-oldest queue를 확인할 때는 lab 전용 `detectorDelayMs`를 사용할 수 있습니다.

```bash
curl -fsS -X POST 'http://127.0.0.1:8080/lab/analysis/taps?file=sample_h264.mp4&profileId=slow-debug&fps=30&maxQueue=2&detectorDelayMs=200'
```

이 endpoint는 지금 단계에서 raw decode hub, sampling queue, dummy detector lifecycle 확인용입니다. `decodedFrames`, `sampledFrames`, `analyzedPackets`가 증가하면 compressed packet이 raw frame으로 변환되고 sampling queue를 거쳐 detector까지 전달된 것입니다. `latestResult.detections`가 비어 있는 것은 정상이며, 실제 객체 검출은 YOLO/ONNX detector를 붙인 뒤 채워집니다.

YOLO/ONNX detector 예시:

```bash
curl -fsS -X POST 'http://127.0.0.1:8080/lab/analysis/taps?file=sample_h264.mp4&profileId=yolo-debug&detector=yolo&model=models/yolo11n.onnx&labels=models/coco.names&fps=5&maxQueue=2&inputWidth=640&inputHeight=640&confidence=0.35&nms=0.45'
```

현재 기본 YOLO/ONNX 기준:
- 기본 detector는 `yolo`이고, 기본 모델 경로는 `models/yolo11n.onnx`다.
- 현재 검증한 모델 파일은 Ultralytics assets `v8.4.0`의 `yolo11n.onnx`다.
- 기본 label 경로는 `models/coco.names`이며 COCO 80개 class 기준이다.
- 모델/label 파일은 repo에 커밋하지 않고 로컬 `models/` 아래에 둔다.

현재 COCO label 기준으로 overlay에 표출 가능한 객체:

```text
person, bicycle, car, motorcycle, airplane, bus, train, truck, boat, traffic light,
fire hydrant, stop sign, parking meter, bench, bird, cat, dog, horse, sheep, cow,
elephant, bear, zebra, giraffe, backpack, umbrella, handbag, tie, suitcase, frisbee,
skis, snowboard, sports ball, kite, baseball bat, baseball glove, skateboard, surfboard,
tennis racket, bottle, wine glass, cup, fork, knife, spoon, bowl, banana, apple,
sandwich, orange, broccoli, carrot, hot dog, pizza, donut, cake, chair, couch,
potted plant, bed, dining table, toilet, tv, laptop, mouse, remote, keyboard,
cell phone, microwave, oven, toaster, sink, refrigerator, book, clock, vase,
scissors, teddy bear, hair drier, toothbrush
```

VA overlay 샘플:

아래 이미지는 외부 영상 캡처가 아니라 문서/테스트용으로 생성한 license-safe 4분할 샘플을
YOLO/ONNX detector로 분석한 결과다. 일반 분석 색상은 `사람=진한 파랑`, `차량=초록`,
`도로=노랑`, `동물=진한 보라`, `운동=청록`, `음식=주황`, `가구=갈색`, `기기=마젠타`,
`식기=하늘색`, `잡화=회색`을 사용한다.
빨간색 계열은 이벤트/위험 강조용으로 남겨두고 일반 분석에는 사용하지 않는다.

![VA overlay 한글 라벨 샘플](docs/assets/va-four-scene-overlay-ko.jpg)

원본 샘플 이미지는 다음 파일에 보관한다.

![VA 원본 샘플](docs/assets/va-four-scene-sample.png)

RTSP VA overlay stream 예시:

```bash
rtsp://127.0.0.1:8554/dhseo?file=va_four_scene_sample.mp4&va=1
```

동일 샘플을 영상 테스트에도 사용할 수 있도록 `video/va_four_scene_sample.mp4`를 기본 `video` 경로에 포함한다. 이 파일은 프로젝트에서 생성한 license-safe 샘플이므로 레포에 포함한다.

움직임이 큰 영상도 기본값 기준으로는 짧은 queue와 PTS 매칭 fallback을 사용한다.
필요할 때만 `MEDIA_SERVER_ANALYSIS_FPS`, `MEDIA_SERVER_ANALYSIS_MAX_QUEUE`,
`MEDIA_SERVER_ANALYSIS_OVERLAY_WAIT_MS`, `MEDIA_SERVER_ANALYSIS_OVERLAY_SYNC_TOLERANCE_MS`를 조정한다.

```text
rtsp://127.0.0.1:8554/dhseo?file=imports/NewYorkDriving.mp4&va=1
```

WebRTC VA overlay consume 예시:

```bash
POST /webrtc/session?file=va_four_scene_sample.mp4&va=1
```

overlay stream은 detector가 첫 결과를 만들기 전까지 원본 frame만 송출할 수 있다. 따라서 stream 시작 직후 몇 프레임은 box 없이 보이는 것이 정상이다.

VA overlay 회귀 검증:

```bash
# ONNX Runtime 포함 빌드 서버를 먼저 실행한 뒤 수행한다.
MEDIA_SERVER_LISTEN_PORT=8555 \
MEDIA_SERVER_HTTP_LISTEN_PORT=8081 \
MEDIA_SERVER_VERIFY_VA_DURATION_S=30 \
./server.sh verify-va
```

`./server.sh verify-va`는 다음을 한 번에 확인한다.
- `/lab/analysis/taps`로 YOLO tap을 만들고 `decodedFrames`, `analyzedPackets`, detection label, adaptive 상태를 확인한다.
- `/lab/analysis/taps/{tapId}/overlay.jpg`가 JPEG로 생성되는지 확인한다.
- `rtsp://.../dhseo?file=...&va=1`을 `ffmpeg`로 decode해 RTSP overlay egress가 열리는지 확인한다.
- `/lab`의 VA 옵션을 켠 상태로 WebRTC simple signaling과 WHEP 브라우저 재생을 확인한다.

자주 쓰는 옵션:
- `MEDIA_SERVER_VERIFY_VA_FILE=imports/NewYorkDriving.mp4`: 로컬에 큰 움직임 영상이 있을 때 변경
- `MEDIA_SERVER_VERIFY_VA_DURATION_S=120`: 회귀 시간을 늘림
- `MEDIA_SERVER_VERIFY_VA_SKIP_WEBRTC=1`: 브라우저 검증 제외
- `MEDIA_SERVER_VERIFY_VA_SKIP_RTSP=1`: RTSP 검증 제외
- `MEDIA_SERVER_VERIFY_VA_EXTRA_QUERY='overlayWaitMs=180&overlaySyncToleranceMs=400'`: 추가 query 적용

1차 YOLO parser는 `YOLOv8/YOLO11` 계열의 `[1, 84, N]` 또는 `[1, N, 84]` 출력과 `YOLOv5` 계열의 objectness 포함 `[1, N, 85]` 출력을 대상으로 한다. fp32/fp16 NCHW 입력 모델과 fp32/fp16 단일 output tensor를 지원한다. 기본 전처리는 YOLO 계열에 맞춘 letterbox이며, 모델 출력 좌표에서 padding과 scale을 역보정해 원본 frame 기준 normalized box로 변환한다.

모델 output layout 옵션:
- `outputLayout=auto|channels-first|channels-last`: 기본 `auto`. `[1, 84, N]`는 channels-first, `[1, N, 84]`는 channels-last로 해석한다.
- `boxFormat=cxcywh|xyxy`: 기본 `cxcywh`. corner 좌표 모델은 `xyxy`로 지정한다.
- `scoreMode=auto|class-only|objectness-class|score-class|class-score`: 기본 `auto`. YOLOv5류 objectness 포함 모델은 `objectness=1` 또는 `scoreMode=objectness-class`로 명시할 수 있다. NMS/end2end 모델처럼 `[x1,y1,x2,y2,score,class]` 후보를 직접 내는 모델은 `boxFormat=xyxy&scoreMode=score-class`로 검증하고, class/score 순서가 반대인 모델은 `class-score`를 사용한다.

YOLO parser 조합 검증:

```bash
./server.sh verify-yolo-layouts
./server.sh verify-yolo-layouts --long
```

`./server.sh verify-yolo-layouts`는 기본 `yolo11n.onnx`의 `channels-first + cxcywh + class-only`, 실제 `YOLOv5n` 모델의 `channels-last + cxcywh + objectness-class + fp16`, end2end xyxy 모델의 `uint8 HWC input + channels-last + xyxy + score-class` 경로를 확인한다. 선택 모델을 쓰려면 `MEDIA_SERVER_VERIFY_YOLO_XYXY_MODEL` 또는 `--xyxy-model`로 바꿀 수 있다.

분석 API 설계/상태 확인 endpoint:

```bash
curl -fsS 'http://127.0.0.1:8080/lab/analysis/capabilities'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/profiles'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/rules'
```

`/lab/analysis/profiles`와 `/lab/analysis/rules`는 1차 persistent registry를 제공한다. 기본 저장 파일은 `.media_server.analysis_registry.json`이며 `.gitignore`에 포함되어 있다. 현재 단계에서는 등록한 rule을 `va=1` overlay와 `/lab/analysis/taps/{tapId}/events`에 적용한다. rule의 `match.sourceKind`, `match.route`, `match.clientId`는 분석 결과 context와 비교해 적용 여부를 결정한다. URL에 `profileId/profile` 또는 `fps/maxQueue` 같은 세부 튜닝값이 없으면, 현재 context와 맞는 rule의 `analysis.profileId`가 profile 자동 선택에 사용된다. 여러 rule이 동시에 맞는 경우는 `priority`가 높은 rule을 우선하고, priority가 같으면 sourceKind/route/clientId가 더 구체적인 rule을 우선한다. `/lab/analysis/taps`는 active tap 목록과 각 tap의 context/profileSelection을 반환한다.

웹에서 등록하려면 `/lab/rules`의 시각적 룰 편집기를 사용한다.
- profile은 `fps`, `queue`, `confidence`, `nms`, `input size`, adaptive 여부를 slider/dropdown으로 조정한다.
- rule은 대상 source/route, 사용할 profile, 이벤트 타입, 분석 객체 타입을 선택한다.
- 이벤트 판단 영역은 16:9 캔버스에서 다각형 꼭짓점을 찍어 지정한다. polygon 영역은 최대 12개 점까지 지정할 수 있다.
- 이미 지정된 점 근처를 드래그하면 새 점을 추가하지 않고 기존 점 위치를 이동한다.
- `line-crossing` 룰은 polygon 영역 대신 2개 점짜리 선분으로 저장한다. 현재 방향은 `any`로 저장하며 양방향 통과를 같은 이벤트로 본다.
- 객체 타입 UI는 COCO 80개 class를 10개 일반 시각 카테고리와 이벤트 전용 강조 카테고리로 묶어 표시한다. 예: `사람`, `차량(자동차)`, `도로(신호등)`, `동물(강아지)`, `운동(공)`, `음식(피자)`, `가구(의자)`, `기기(노트북)`, `식기(컵)`, `잡화(우산)`.
- 내부 rule 값과 YOLO label은 COCO 영문 label을 유지한다. 예: `person`, `car`, `bus`, `traffic light`, `dog`.
- 실제 RTSP/WebRTC overlay label은 기본 `labelLang=ko` 기준 `사람`, `차량(자동차)`, `도로(신호등)`, `동물(강아지)`, `기기(노트북)`처럼 표시한다.
- `labelLang=en`을 붙이면 `Person`, `Vehicle(car)`, `Road(traffic light)`, `Animal(dog)`, `Device(laptop)`처럼 표시한다.
- 일반 분석 색상은 10개 일반 시각 카테고리 기준으로 고정한다. 빨간색 계열은 이벤트/위험 강조용으로 남겨두고 일반 분석에는 사용하지 않는다.
- 이벤트 발생 시 동작은 `eventActions`로 저장한다. 현재 UI는 matched object 깜빡임 강조 설정과 POST URL을 지원한다.
- POST 전송 payload는 `media-server.va.event.v1` 고정 format이며 UI에서는 preview만 보여주고 수정할 수 없다. 사용자는 POST URL만 입력한다.
- 실제 event highlight는 `va=1` overlay와 `/lab/analysis/taps/{tapId}/overlay.jpg`에 적용된다.
- POST 전송은 비동기 worker가 처리한다. 기본값은 opt-in이며 `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1`일 때만 실제 전송한다. 운영 stream에서는 `va=1` overlay 경로에서 enqueue되고, 개발 검증은 `/lab/analysis/taps/{tapId}/events?dispatch=1`로 강제로 enqueue할 수 있다.
- POST worker 상태는 `/lab/analysis/event-post/status`에서 `queueSize`, `sentCount`, `failedCount`, `droppedCount`, `suppressedCount`로 확인한다.
- 영상 기동 중 rule을 수정하면 overlay/evaluate 경로는 저장소 snapshot을 다시 읽어 다음 frame부터 새 설정을 사용한다.
- profile 자동 선택은 analysis tap 생성 시점에 결정된다. 이미 떠 있는 tap의 profile을 바꾸려면 tap 또는 stream session을 재시작한다.
- 저장 버튼은 같은 `/lab/analysis/profiles`와 `/lab/analysis/rules` API를 호출한다.
- 생성되는 JSON preview는 디버그/검토용이며, 일반 사용 흐름에서는 직접 JSON을 편집하지 않는다.
- 기본 profile은 조회용이며 수정/삭제 대상이 아니다.

profile/rule registry 예시:

```bash
curl -fsS -X POST 'http://127.0.0.1:8080/lab/analysis/profiles' \
  -H 'Content-Type: application/json' \
  --data '{"id":"fast-local","detector":"yolo","fps":6,"maxQueue":1,"adaptive":true}'

curl -fsS 'http://127.0.0.1:8080/lab/analysis/profiles/fast-local'

curl -fsS -X PUT 'http://127.0.0.1:8080/lab/analysis/profiles/fast-local' \
  -H 'Content-Type: application/json' \
  --data '{"id":"fast-local","detector":"yolo","fps":4,"maxQueue":1,"adaptive":true}'

curl -fsS -X POST 'http://127.0.0.1:8080/lab/analysis/rules' \
  -H 'Content-Type: application/json' \
  --data '{"id":"file-overlay","priority":10,"enabled":true,"match":{"sourceKind":"file","route":"http"},"analysis":{"profileId":"fast-local"},"outputs":{"overlay":true}}'

curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps'

curl -fsS -X DELETE 'http://127.0.0.1:8080/lab/analysis/rules/file-overlay'
curl -fsS -X DELETE 'http://127.0.0.1:8080/lab/analysis/profiles/fast-local'
```

adaptive tuner 상태는 `/lab/analysis/taps/{tapId}`에서 확인한다.

주요 필드:
- `targetFps`: 현재 런타임 sampling fps
- `modelInputWidth`, `modelInputHeight`: 현재 detector input size
- `adaptiveState`: `steady`, `downshift-fps`, `downshift-input`, `upshift-fps`, `upshift-input`, `input-size-disabled` 등
- `adaptiveDownshiftCount`, `adaptiveUpshiftCount`: 자동 하향/복구 횟수
- `adaptiveInputSizeDisabled`: 고정 input model 등의 이유로 input size adaptive가 꺼졌는지 여부

검증용 모델과 외부에서 내려받은 영상은 repo에 커밋하지 않고 `models/`, `video/imports/` 아래에 둔다. 이 경로들은 `.gitignore`에 포함되어 있다. 단, 프로젝트에서 직접 만든 license-safe 기본 샘플 영상 `video/va_four_scene_sample.mp4`는 예외적으로 repo에 포함한다.

클라이언트 전달 방식 후보:
- RTSP/WebRTC 본 스트림 위에 overlay된 영상으로 전달
- 별도 HTTP API로 원본 snapshot과 overlay snapshot 이미지를 전달
- 정적 이미지 입력을 받아 detection metadata와 overlay 이미지를 반환하는 개발용 API 제공
- WebRTC data channel 또는 별도 API로 detection metadata를 전달

즉 미래 구조는 단순한 `stream relay`를 넘어 아래처럼 확장됩니다.

```text
Client <-> (RTSP or WebRTC) <-> MediaServer
                                   |
                                   +-> Relay Path
                                   +-> Analysis Path
                                   +-> Snapshot / Metadata Path
```

정적 이미지 분석 API:

```bash
# docs/assets 기본 샘플 이미지를 YOLO로 분석하고 metadata를 JSON으로 반환
curl -fsS 'http://127.0.0.1:8081/lab/analysis/image?asset=va-four-scene-sample.png'

# 원본 이미지를 JPEG snapshot으로 반환
curl -fsS -o snapshot.jpg \
  'http://127.0.0.1:8081/lab/analysis/image/snapshot.jpg?asset=va-four-scene-sample.png&quality=80'

# detection overlay가 합성된 JPEG 반환
curl -fsS -o overlay.jpg \
  'http://127.0.0.1:8081/lab/analysis/image/overlay.jpg?asset=va-four-scene-sample.png&labelLang=ko&quality=88'
```

이미지 입력은 기본적으로 `asset=<docs/assets 파일명>` 또는 `file=<video root 기준 상대경로>`를 받는다. 절대경로와 `..` 경로 이탈은 거부한다. 기본 profile query가 없으면 `va=1`과 동일하게 서버 기본 YOLO profile을 사용하고, 필요하면 `detector`, `profile`, `confidence`, `inputWidth`, `outputLayout`, `boxFormat`, `scoreMode` 같은 기존 VA query를 그대로 붙일 수 있다.

## 현재 지원 codec route

RTSP egress 기준:
- `/dhseo` -> `H264 + AAC`
- `/dhseo/h264` -> `H264 + AAC`
- `/dhseo/h265` -> `H265 + AAC`
- `/dhseo/opus` -> `H264 + Opus`
- `/dhseo/h265/opus` -> `H265 + Opus`
- `/dhseo/pcmu` -> `H264 + PCMU`
- `/dhseo/h265/pcmu` -> `H265 + PCMU`
- `/dhseo/pcma` -> `H264 + PCMA`
- `/dhseo/h265/pcma` -> `H265 + PCMA`

현재 route mismatch 시 RTSP egress에서 자동 transcoding이 적용됩니다.

## 라이선스/배포 주의사항

이 내용은 개발 단계의 기술 점검이며 법률 자문은 아니다. 공개 배포, 바이너리 배포, 상용 사용 전에는 별도 법률/라이선스 검토가 필요하다.

현재 repo 상태:
- 현재 저장소에는 `LICENSE` 파일이 없다.
- 별도 `LICENSE`를 추가하기 전까지는 이 repo가 오픈소스 라이선스로 배포된다고 해석하면 안 된다.
- 코드 안에 외부 프로젝트 소스 코드를 vendoring 하지는 않는다.
- 주요 미디어 기능은 로컬에 설치된 GStreamer/FFmpeg/codec plugin/binary를 런타임 또는 링크 의존성으로 사용한다.

주요 의존성 기준:
- GStreamer core/framework는 LGPL 계열이다. 다만 GStreamer는 plugin 기반이고, codec/plugin 조합에 따라 추가 라이선스 및 특허 이슈가 생길 수 있다.
- 현재 C++ 서버는 GStreamer 개발 라이브러리에 링크한다.
- `x264enc`, `x265enc`를 사용하는 route/transcode 경로는 GPL 계열 encoder 또는 상용 라이선스 검토 대상이다.
- `H264`, `H265/HEVC` codec은 소프트웨어 라이선스와 별개로 특허/로열티 이슈가 있을 수 있다.
- `/lab/import`는 외부 `ffmpeg` binary를 실행한다. Homebrew 등 배포판의 FFmpeg build 옵션에 따라 LGPL/GPL 적용 범위가 달라질 수 있다.
- `yt-dlp`, `deno`는 실험실 YouTube 기능에서만 선택적으로 사용한다. `yt-dlp` release 형태에 따라 포함된 제3자 라이선스가 달라질 수 있으므로 binary를 함께 배포하지 않는 방향이 안전하다.

공개/배포 전 권장:
- 프로젝트 자체 라이선스를 먼저 결정하고 `LICENSE` 파일을 추가한다.
- GPL encoder/plugin을 기본 필수 경로로 둘지, opt-in feature로 둘지 결정한다.
- 바이너리 패키지를 배포한다면 GStreamer/FFmpeg/x264/x265/libnice/yt-dlp/Deno에 대한 `NOTICE` 또는 third-party license 문서를 별도로 만든다.
- 상용 배포 가능성을 열어둘 경우 H265 route와 x264/x265 기반 transcoding은 별도 feature flag 또는 빌드 옵션으로 분리한다.

## 테스트 방식

### 0. 통합 테스트 기준
사용자가 “테스트 진행”을 요청했을 때의 기본 기준은 아래 명령입니다.

```bash
./server.sh test
```

기본 포함 항목:
- 정적 검사: `server.sh`, `scripts/internal/*.sh`, `config/codec_test_sources.json`
- 서버 readiness: start/status/diagnose, RTSP/HTTP listen, `/health`
- LAN IP 기준 외부 클라이언트 접근성: `http://{LAN_IP}:{HTTP_PORT}/health`, `/lab`, `rtsp://{LAN_IP}:{RTSP_PORT}/...`
- 제3자 RTSP upstream reachability: stable 기준에서 advisory로 확인. 명시 URL을 주면 hard gate
- 안정화된 local core stream: `file`, 로컬 `RTSP pull`, 로컬 `WebRTC publish`
- 기본 VA: YOLO/ONNX 분석, overlay snapshot, RTSP overlay, WebRTC simple/WHEP overlay

기본 제외 항목:
- `HTTP/HLS URI source`: 최신 blocker 기준 RTSP 503 재확인 필요
- `YouTube source/import`: 실험실 기능
- `/lab` UI, 룰/이벤트/POST, adaptive tuner: 아직 안정 기능으로 승격하지 않음

선택 검증:
```bash
./server.sh test --include-rules
./server.sh test --include-va-events
./server.sh test --include-rules --include-va-events
```
`--include-rules`는 profile/rule registry CRUD와 rule match 기반 profile 자동 선택을 확인한다. `--include-va-events`는 레포에 포함한 `video/imports/va_tracking_event_1280x720_30fps_h264.mp4` 이동 영상으로 presence, line-crossing, enter, exit 이벤트와 track ID 포함 여부를 확인한다. 이벤트/룰 POST 연동은 아직 운영 안정 기능으로 승격하지 않았으므로 별도 장시간 검증 후 기본 테스트 편입을 판단한다.

### 1. 서버 상태 진단
```bash
./server.sh status
./server.sh diagnose
```

외부 클라이언트 접근성은 `./server.sh test --quick`을 포함한 모든 test 모드에서 hard gate로 확인한다. 제3자 RTSP upstream은 stable 기준에서 advisory로 확인하고, 명시 URL을 주면 hard gate로 본다. 진단만 따로 보려면:
```bash
./scripts/internal/test_external_access.sh
./scripts/internal/test_external_source_reachability.sh
```

특정 외부 RTSP URL을 직접 보려면:
```bash
MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS='rtsp://camera-or-test-host/live' \
./server.sh test
```

### 2. RTSP 재생 확인
`ffprobe`, `VLC`, `IINA`로 확인할 수 있습니다.

예:
```bash
ffprobe -v error -rtsp_transport tcp -show_streams \
  'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4'
```

### 3. codec matrix 자동 검증
```bash
./server.sh verify-codecs
```

외부 RTSP source도 포함:
```bash
MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=1 ./server.sh verify-codecs
```

세션 재사용/cleanup 흐름을 자세히 보려면:
```bash
MEDIA_SERVER_SESSION_TRACE=1 ./server.sh foreground
```

특정 source만:
```bash
MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus ./server.sh verify-codecs
```

검증 설정:
- `config/codec_test_sources.json`

각 source에는 선택적으로 `verify_profile`을 줄 수 있습니다.
- `rtsp_preflight_timeout_ms`
- `ffprobe_timeout_us`
- `webrtc_http_timeout_s`
- `server_env_hint`

이 값들은 `verify_codec_matrix.sh`에서 source별로 다르게 적용됩니다.

로컬 WebRTC publish source도 검증 설정에 포함되어 있습니다.
- source name: `webrtc_local_publish_h264_opus`
- launcher: `whip_publish`
- source id: `publisher-verify`

### 4. 다른 PC에서 외부 연결 수동 검증

같은 LAN의 데스크탑, 다른 노트북, 휴대폰에서 MediaServer 접근성을 확인하려면 맥북 서버를 loopback이 아닌 전체 인터페이스에 bind한다.

```bash
MEDIA_SERVER_LISTEN_ADDRESS=0.0.0.0 \
MEDIA_SERVER_HTTP_LISTEN_ADDRESS=0.0.0.0 \
MEDIA_SERVER_FORCE_RTSP_TCP=1 \
./server.sh restart
```

복사 가능한 URL 목록은 아래 스크립트가 현재 LAN IP와 포트 기준으로 출력한다.

```bash
./server.sh urls
```

IP를 직접 지정하려면:

```bash
MEDIA_SERVER_EXTERNAL_HOST=<MACBOOK_LAN_IP> ./server.sh urls
```

먼저 다른 PC 브라우저에서 `/health`, `/lab`가 열리는지 확인한다. 필요하면 호환 route인 `/webrtc/test`, `/lab/rules`, `/lab/import`도 직접 열 수 있다. `/health`는 `{"status":"ok"}`를 반환하는 가장 단순한 readiness check다.
여기서 실패하면 RTSP/WebRTC 문제가 아니라 macOS 방화벽, bind address, 공유기 WiFi/LAN isolation 문제를 먼저 봐야 한다.
이 스크립트 출력에는 현재 LAN IP가 포함될 수 있으므로, 출력 결과를 그대로 문서나 커밋에 붙이지 않는다.

상세 결과 문서:
- `docs/stream-verification.md`

## 현재까지 통과된 검증

- `file(sample_h264.mp4) -> RTSP`
- `file(sample_h264.mp4) -> WebRTC(signaling)`
- `file(sample_h265.mp4) -> RTSP`
- `file(sample_h265.mp4) -> WebRTC(signaling)`
- `RTSP(h265 + opus local source) -> RTSP`
- `RTSP(h265 + opus local source) -> WebRTC(signaling)`
- `RTSP(h264 + pcmu local source) -> RTSP`
- `RTSP(h264 + pcmu local source) -> WebRTC(signaling)`
- `RTSP(h264 + pcma local source) -> RTSP`
- `RTSP(h264 + pcma local source) -> WebRTC(signaling)`
- `HTTP video-only MP4 -> RTSP` (과거 통과, 현재 재확인 필요)
  - 입력 파일: `sample_h264_video_only.mp4`
  - 결과: `h264/hevc video + route silent audio`
  - 최신 blocker 체크에서는 `source=http` RTSP route에서 `503`이 재현되어 현재 완료 상태가 아니라 재확인 대상으로 본다.
- `HTTP video-only MP4 -> WebRTC(simple signaling/playback)`
  - browser consumer 기준 video-only track 및 `decoded video frame` 확인
- `WebRTC publish(publisher-demo2 local WHIP test) -> RTSP`
  - `rtsp://127.0.0.1:8555/dhseo?source=webrtc&url=publisher-demo2`
  - 결과: `h264 + aac`
- `WebRTC publish(local WHIP test publisher) -> WebRTC(simple signaling)`
  - browser consumer 기준 `decoded video frame` 확인
- `WebRTC publish(browser publisher) -> WebRTC(simple signaling)`
  - browser consumer 기준 `decoded video frame` 확인
- `WebRTC publish(browser publisher) -> WebRTC(WHEP)`
  - browser consumer 기준 audio/video track 및 `decoded video frame` 확인
- 로컬 전체 matrix 과거 결과
  - 당시 결과: `pass=63 fail=0 skip=3`
  - 최신 blocker 체크 결과: `pass=57 fail=6 skip=3`
  - 최신 실패 6건은 `source=http` RTSP route probe에서 발생했으므로, 분석 1차 범위에서는 `HTTP/HLS URI`를 제외한다.

실험실 기능 검증 이력:
- `YouTube resolver(fake yt-dlp -> local HTTP MP4) -> RTSP`
  - 결과: `h264 + aac`
- `YouTube uploaded/VOD URL -> RTSP / WebRTC(simple) / WebRTC(WHEP)`
  - 결과: `h264 + aac`, browser consume `1280x720`
- `YouTube live URL -> RTSP / WebRTC(simple) / WebRTC(WHEP)`
  - 결과: `h264 + aac`, browser consume `1280x720`
- `YouTube 동일 URL 5개 동시 요청 -> WebRTC session`
  - 결과: resolver 1회, source worker start 1회, stream created 1회, 나머지 4개 요청은 동일 `SharedStream` 재사용
- `YouTube fake HLS/EOS -> delegate reconnect`
  - 결과: `delegate stopped -> resolved -> reconnected` 반복 확인

실험실 YouTube 개발이 기본 기능 승격 전에 멈춘 이유:
- 외부 요인이 커서 회귀 테스트가 안정적이지 않다.
- `yt-dlp` 결과가 YouTube bot check, 로그인 요구, 지역 제한, 서명 URL 만료 정책에 영향을 받는다.
- `2026-04-24` 같은 공개 VOD `https://www.youtube.com/watch?v=aqz-KE-bpKQ`도 시점에 따라 결과가 갈렸다.
  - shell에서 바로 실행한 `/lab/import`와 resolver 단독 실행은 `Sign in to confirm you're not a bot`으로 실패했다.
  - 같은 날 Chrome `/lab/import` UI에서 재시도한 `import-2`는 `yt-dlp`가 `[jsc:deno]`로 challenge를 푼 뒤 `ready`까지 완료됐다.
- 그래서 현재는 `/lab`에서만 보이는 개발용 기능으로 유지하고, 기본 relay/analysis 경로는 `file`, `rtsp`, `webrtc`, `http/hls` 중심으로 진행한다.

현재 미확인 사항:
- YouTube URL 장기 회귀 안정성
- login/region/private/live archive 전환 실패 패턴의 일관성
- cookie 없이 접근 가능한 공개 URL이 현재 시점에도 안정적으로 남아 있는지
- YouTube import 성공/실패가 시점에 따라 왜 갈리는지
- 실패/성공이 섞일 때 UI와 문서가 현재 상태를 충분히 설명하는지

실험실 import 현재 상태:
- `/lab/import` 페이지와 `/lab/import/jobs` API를 추가했다.
- `/lab/import`는 `source=youtube` 직접 표출 opt-in과 분리되어 기본 표시한다.
- fake downloader를 이용한 local smoke test는 통과했고, 당시 중복 산출물은 정리했다.
- `2026-04-24` 직접 재검증에서는 동일 YouTube VOD에 대해 성공/실패가 모두 재현됐다. shell 기반 job은 bot check로 실패했고, Chrome `/lab/import`에서는 deno 기반 JS challenge 처리 후 download 성공 사례가 있었다.
- 이후 `/lab/import`는 `yt-dlp` download 뒤 `ffmpeg`로 `h264 + aac stereo + mp4` 정규화를 수행하도록 바꿨다.
- 정규화된 import 결과는 기존 `file=` relay/WebRTC 경로에서 재사용 가능함을 확인했다.
- 현재 import 경로는 "다운로드 성공"만 보는 것이 아니라, "기존 `file=` relay/analysis 입력으로 바로 재사용 가능한 포맷"까지 맞추는 단계로 바뀌었다.

## 외부 RTSP source 관련 주의

외부 RTSP source는 로컬 샘플과 다르게 네트워크 상태 영향을 크게 받습니다.

기본 `./server.sh test`는 config에 남아 있는 제3자 RTSP 후보를 advisory로 확인합니다.
후보가 실패해도 코드 회귀 실패로 단정하지 않고, 신뢰 가능한 카메라/테스트 서버 URL을 명시했을 때만 hard gate로 봅니다.

```bash
MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS='rtsp://camera-or-test-host/live' ./server.sh test
```

현재 wowza demo는 이 환경에서 아래 두 형태로 확인됐습니다.
- 기본값: `RTSP preflight failed ... connection timed out`
- preflight 비활성화 후: `timed out waiting for RTSP source samples`

즉, 현재 wowza 실패는 codec 처리보다 외부 RTSP 연결성 또는 upstream 응답 지연 쪽으로 보는 것이 맞습니다.

## 관련 문서

- 구조 설명: `docs/media-server-architecture.md`
- 검증 결과: `docs/stream-verification.md`

## 다음에 이어서 하기 좋은 작업

1. 영상분석 후속 안정화
   - 분석 착수 전 blocker 체크리스트와 1차 smoke test는 `docs/stream-verification.md`에 문서화되어 있다.
   - 현재 relay 안정화 기준으로 file, RTSP pull, WebRTC publish source의 주요 경로를 분석 1차 범위로 검증했다.
   - HTTP/HLS는 코드 경로가 있지만 최신 `source=http -> RTSP` 503 재현 때문에 분석 1차 범위에서 제외하고 후속 안정화에서 다시 확인한다.
   - 송신 경로(RTSP/WebRTC egress)는 직접 막지 않는다.
   - tracker 기반 이벤트 실제 이동 영상 검증과 rule/profile matching 우선순위 1차 smoke는 완료했다.
   - route별 profile/rule matching 장시간 검증, tracker ID switch 통계, 정적 이미지 분석 API 1차 구현은 완료했다.
   - 다음 개발은 Kalman/ByteTrack류 tracker 보강 필요성 재판단, 이미지 분석 UI 연결, 외부 RTSP/WebRTC 운영 설정 정리 순서로 진행한다.
   - 외부 RTSP, WebRTC 운영 설정, 실험실 YouTube, `/lab/import` 외부 네트워크 재검증 같은 보류 항목은 후속 안정화에서 다시 main 기준으로 확인한다.
2. 운영 안정화 후속
   - 외부 RTSP source별 timeout/profile 설정 확장
   - WebRTC 운영 설정(auth/STUN/TURN/ICE policy) 정리
   - audio-only input은 현재 video relay/analysis 준비 범위 밖이다. RTSP/WebRTC egress는 video track을 기준으로 동작한다.
   - WebRTC end-to-end 브라우저 검증 자동화 범위 확장
3. 실험실 기능 유지보수
   - `source=youtube`는 숨김/비활성화 기본값을 유지한다.
   - `/lab/import` 파일 다운로드는 개발용 샘플 생성 도구로 기본 표시하되, 필요하면 `MEDIA_SERVER_ENABLE_LAB_YOUTUBE_IMPORT=0`으로 끈다.
   - 공개 repo 기본 흐름에서는 `source=http|hls`를 사용하고, 실험실 검증은 명시적인 opt-in에서만 수행한다.
   - 지역 제한/로그인 필요/비공개 URL은 우회하지 않고 실패시키는 정책을 유지한다.
   - 정적 이미지 분석은 현재 `asset`/`file` query 기반이다. 업로드 UI/임시파일 정책은 추후 별도 검토한다.
