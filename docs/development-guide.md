# Media Server Development Guide

이 문서는 기존 장문 README 내용을 보존한 상세 개발/운영 가이드입니다.
빠른 설치와 대표 URL은 `../README.md`를 먼저 보고, 세부 환경변수/API/검증 이력이 필요할 때 이 문서를 참고합니다.

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
Client <-> (RTSP or WebRTC) <-> MediaServer <-> (File or RTSP or WebRTC or HTTP/HLS URI) <-> Original Source
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
| `RTSP` | `HTTP/HLS URI` | `rtsp://127.0.0.1:8554/dhseo?source=http&url={urlencoded_http_media_url}` |
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
  - `source=http` 로컬 HTTP MP4는 RTSP/WebRTC 기본 matrix에서 통과했다.
- 동일 source 요청에 대한 `StreamRegistry` 기반 dedup 구조
- `SharedStream` 기반 video/audio fan-out
- route별 video/audio codec 변환
  - video: `H264`, `H265`
  - audio: `AAC`, `Opus`, `PCMU`, `PCMA`
- 외부 RTSP source용 preflight + timeout 분리 진단

### 부분 구현
- `HLS/외부 HTTP URI source -> RTSP/WebRTC`
  - 로컬 HTTP MP4, 로컬 HLS VOD, Mux/Apple 공개 HLS advisory는 통과했다. 외부 HTTP/HLS URI는 네트워크/upstream 상태 영향이 커서 선택 검증으로 둔다.
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
  - `/lab/rules`는 숫자/JSON 직접 입력 대신 한글 UI로 profile 값, 이벤트 판단 영역, 분석 객체 카테고리를 저장한다.
  - 저장된 rule은 `va=1` overlay와 `/lab/analysis/taps/{tapId}/events`에서 1차 event engine으로 판정한다.
  - 이벤트 발생 객체는 overlay에서 `이벤트`/`Event` label과 카테고리 기본색/빨간색 깜빡임으로 표시한다.
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
  - 권한 문제가 없는 로컬 HTTP playable URI는 RTSP/WebRTC 경로를 기본 matrix에 포함한다. HLS/외부 HTTP URI는 선택 검증으로 둔다.

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
| `MEDIA_SERVER_SKIP_LOCAL_ENV` | `1`이면 `./server.sh foreground`가 `scripts/.media_server.env`를 source하지 않음. 자동 검증에서 호출자가 지정한 bind/port를 보존할 때 사용 |
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
| `MEDIA_SERVER_ANALYSIS_TRACKING_CLASSES` | tracker가 ID/trail을 붙일 카테고리/class 목록. 기본 `person,vehicle`; 추가 카테고리는 `road`, `animal`, `sports`, `tableware`, `food`, `furniture`, `device`, `object`, 전체는 `*` |
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
| `MEDIA_SERVER_WEBRTC_STUN_SERVER` | WebRTC egress/WHIP ingest에 적용할 STUN 서버. 기본 `stun://stun.l.google.com:19302` |
| `MEDIA_SERVER_WEBRTC_TURN_SERVER` | WebRTC egress/WHIP ingest에 적용할 TURN 서버. 예: `turn://user:pass@turn.example.com:3478` |
| `MEDIA_SERVER_WEBRTC_ICE_TRANSPORT_POLICY` | WebRTC ICE candidate 정책. `all` 또는 `relay`. `relay`는 TURN server가 없으면 `all`로 fallback |
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
| `MEDIA_SERVER_VERIFY_URI_EXTERNAL_URLS` | `./server.sh verify-uri-longrun --include-external`에서 검증할 외부 HTTP/HLS URL 목록. 쉼표/세미콜론 구분 |
| `MEDIA_SERVER_VERIFY_URI_EXTERNAL_RTSP_ROUTE_KEYS` | 외부 HTTP/HLS advisory에서 검증할 RTSP route key 목록. 기본 `default` |
| `MEDIA_SERVER_RTSP_SOURCE_PREFLIGHT_TIMEOUT_MS` | 외부 RTSP host:port 사전 연결성 검사 timeout |
| `MEDIA_SERVER_RTSP_SOURCE_START_TIMEOUT_MS` | RTSP/URI source 첫 sample 대기 timeout |
| `MEDIA_SERVER_RTSP_TRACK_SETTLE_QUIET_PERIOD_MS` | 첫 track 이후 추가 track discovery quiet period |
| `MEDIA_SERVER_RTSP_TRACK_SETTLE_MAX_MS` | track discovery 전체 상한 |
| `MEDIA_SERVER_START_MODE` | `./server.sh start` background 실행 방식. 기본 `nohup`, macOS 선택값 `launchd` |
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

WebRTC STUN/TURN 검증 상태:

- STUN은 `stun://stun.l.google.com:19302`로 검증했다.
- TURN 설정 경로와 `verify-webrtc-ice`는 Mac 로컬 coturn 기준으로 relay candidate 수집, 브라우저 WebRTC file consume playback, WHIP publish -> WebRTC signaling까지 통과했다.
- `GET /webrtc/config`는 서버 STUN/TURN env와 ICE transport policy를 브라우저 `RTCPeerConnection` 설정으로 내려준다. `/lab`과 `/webrtc/test`의 simple/WHEP/WHIP peer는 이 설정을 사용하며, candidate type(host/srflx/relay) 수와 policy를 화면에 표시한다. `relay` 요청인데 TURN이 없으면 서버는 실제 policy를 `all`로 fallback하고 UI는 경고를 표시한다.
- `MEDIA_SERVER_WEBRTC_TURN_SERVER`는 브라우저에서도 접근 가능한 주소여야 한다. 로컬 relay 강제 검증에서는 `turn://test:testpass@<mac-lan-ip>:3478`처럼 Mac LAN IP를 쓰는 것을 권장한다.
- Mac 로컬 단일 머신 검증에서는 coturn을 `--allow-loopback-peers`와 함께 실행해야 한다. 이 옵션은 loopback peer 허용 때문에 로컬 개발 검증에만 사용하고 운영 TURN에는 사용하지 않는다.
- Windows WSL2 coturn은 서버 실행과 Windows localhost 접근까지 확인했지만, Mac -> Windows LAN inbound가 `No route to host`로 막혀 보류했다.
- 외부 운영 TURN 서버 relay/auth end-to-end 테스트는 진행하지 않았다.
- 다음 작업은 정상 inbound가 가능한 별도 호스트 또는 운영 TURN 계정이 준비됐을 때 운영형 end-to-end 검증을 추가하는 것이다.

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
| `./server.sh test` | 안정 기능 기준 통합 테스트. 무옵션은 `--basic`이며 한글 원인 리포트와 `.media_server.test/` 로그 생성 |
| `./server.sh verify-codecs` | source/route codec matrix 자동 검증 |
| `./server.sh verify-webrtc-ice` | STUN/TURN/ICE transport policy와 candidate 수집 상태 검증 |
| `./server.sh verify-multichannel` | 같은 영상/여러 영상 기준 다중 WebRTC client fan-out 검증 |
| `./server.sh verify-uri-longrun` | HTTP/HLS URI source 로컬 반복 검증과 선택 외부 URL 반복 확인 |
| `./server.sh verify-va` | YOLO/VA overlay lab, RTSP, WebRTC 검증 |
| `./server.sh verify-va-events` | 실제 이동 영상 기준 tracker, line-crossing 방향, enter, exit 이벤트 검증 |
| `./server.sh verify-va-category-samples` | 실제 영상 샘플과 sports 전용 샘플 기준 VA 카테고리, 직접 class, alias presence 이벤트 검증 |
| `./server.sh verify-route-profiles` | 실제 RTSP/WebRTC overlay 세션 기준 route별 profile/rule matching 검증 |
| `./server.sh verify-rule-ui` | `/lab/rules` Rule/Profile 카테고리 버튼, category catalog 순서/스키마, 저장 payload round-trip 검증 |
| `./server.sh verify-event-post` | VA event POST payload schema, 실패/cooldown/queue/recovery counter 검증 |
| `./server.sh verify-event-post-longrun` | event POST schema/recovery/선택 queue 검증 반복 실행 |
| `./server.sh verify-lab-import-ui` | `/lab/import` 실험실 import UI와 jobs API smoke 검증 |
| `./server.sh verify-tracker-stability` | 이동 영상 기준 track ID 유지/분절 통계와 stress preset 수집 |
| `./server.sh verify-yolo-layouts` | YOLO 모델별 output layout/box/score 조합 검증 |
| `./server.sh verify-adaptive` | adaptive tuner의 과부하 downshift와 저부하 upshift 검증 |
| `./server.sh verify-predev` | 기능 개발 재개 전 smoke, 다채널, VA event, event POST, cleanup, report 묶음 검증. `--include-external-turn`은 credential이 있을 때만 hard gate |
| `./server.sh summarize-reports` | `/tmp/media_server_*summary*.json` 검증 결과를 Markdown/HTML 상세 리포트로 요약 |

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
./server.sh test --basic
./server.sh test --full
./server.sh test --external
./server.sh test --stable
./server.sh verify-codecs
./server.sh verify-va
./server.sh verify-va-events
./server.sh verify-va-category-samples
./server.sh verify-route-profiles
./server.sh verify-rule-ui
./server.sh verify-tracker-stability
./server.sh verify-yolo-layouts
./server.sh verify-adaptive
./server.sh verify-image-analysis
```

`./server.sh test`는 무옵션일 때 `--basic`과 동일하게 실행한다. 새 작업에서는 목적에 따라 `--basic`, `--full`, `--external`, `--stable`을 명시해도 된다.
- `./server.sh test` 또는 `--basic`: 스크립트/JSON 정적 검사, summary report smoke, 서버 start/status/diagnose, 로컬 file/RTSP/WebRTC publish/HTTP URI source의 RTSP/WebRTC 소비, YOLO/VA overlay 검증. LAN IP/외부망 probe는 제외한다.
- `--full`: `--basic`에 profile/rule registry, Rule/Profile UI, VA tracking event, 정적 이미지 분석, event POST schema/recovery, 일반/VA WebRTC 다채널 fan-out을 추가한다.
- `--external`: `--full`에 LAN IP 외부 클라이언트 접근성, 제3자 RTSP upstream advisory, WebRTC ICE, 외부 HTTP/HLS URI longrun을 추가한다.
- `--stable`: 기존 stable 호환 기준으로, 로컬 stream/VA 검증과 LAN IP 외부 클라이언트 접근성, 제3자 RTSP upstream advisory를 포함한다.
- 제외: YouTube source/import, adaptive tuner 장시간 검증, 외부 운영 TURN relay/auth. 로컬 HLS VOD는 `verify-codecs` 선택 matrix에서 검증 가능하다.
- 선택 검증: `./server.sh test --include-rules`는 profile/rule registry CRUD와 rule match 기반 profile 자동 선택을 추가 확인한다.
- 선택 검증: `./server.sh test --include-rule-ui`는 Rule/Profile 카테고리 UI와 저장 payload를 추가 확인한다.
- 선택 검증: `./server.sh test --include-va-events`는 실제 이동 영상 기반 tracker/event 판정을 추가 확인한다.
- 선택 검증: `./server.sh test --include-image-analysis`는 개발용 정적 이미지 분석 API와 tracking category/all 정책을 추가 확인한다.
- 선택 검증: `./server.sh test --include-webrtc-ice`는 WebRTC STUN/TURN/ICE candidate 수집을 추가 확인한다.
- 선택 검증: `./server.sh test --include-uri-longrun`은 HTTP/HLS URI source 반복 검증을 추가 확인한다.
- 선택 검증: `./server.sh test --include-event-post`는 event POST schema/recovery smoke를 추가 확인한다.
- 선택 검증: `./server.sh test --include-multichannel`은 일반/VA WebRTC 다채널 fan-out과 cleanup을 추가 확인한다.
- 선택 검증: `./server.sh test --include-report-summary`는 `/tmp/media_server_*summary*.json` Markdown/HTML report 생성을 추가 확인한다.
- 외부 운영 TURN은 credential이 있어야 hard gate로 검증할 수 있다. 서버를 `MEDIA_SERVER_WEBRTC_TURN_SERVER=turn://user:pass@host:3478 MEDIA_SERVER_WEBRTC_ICE_TRANSPORT_POLICY=relay`로 띄운 뒤 `./server.sh verify-webrtc-ice --external-turn`을 실행한다. credential이 없으면 이 검증은 skip으로 남긴다.
- 외부 HLS advisory는 `./server.sh verify-uri-longrun --include-external --use-default-external`로 Mux/Apple 공개 HLS 후보 2개를 반복 확인한다.
- 예외 생략: `./server.sh test --skip-va`는 ONNX/브라우저 자동화가 불가능한 환경에서만 사용한다.
- 외부 네트워크 또는 LAN IP probe가 막힌 격리 환경에서 `--stable` 또는 `--external`을 돌릴 때만 `./server.sh test --skip-external`로 LAN IP 외부 접근성과 제3자 RTSP upstream 확인을 생략한다.
- 신뢰 가능한 카메라/테스트 RTSP URL이 있으면 `MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS='rtsp://...' ./server.sh test`로 hard gate 검증한다.
- 실패 시 `.media_server.test/<timestamp>/` 아래에 원본 로그를 남기고, 콘솔에는 한글 원인 추정을 출력한다.
- 새 기능을 추가할 때는 안정 기능으로 승격한 항목만 `./server.sh test` 기본 기준에 넣고, 아직 실험/불안정한 항목은 `--include-*` 선택 검증으로 먼저 둔다.

tracker 장시간 검증:

```bash
./server.sh verify-tracker-stability --long
```

`--long`은 기본 120초 x 3회 반복으로 동작한다. 기본 파일을 따로 지정하지 않으면 `video/imports/va_tracking_event_1280x720_30fps_h264.mp4`에서 2분 이상 장기 샘플 `video/imports/va_tracking_event_slow_long_1280x720_30fps_h264.mp4`를 자동 생성해 사용한다. 장기 샘플은 원본 이동 영상을 5배 슬로우모션으로 늘려 서버 EOF loop와 편집 컷 경계를 피한다. 이 장기 샘플은 로컬 검증 산출물이며 git에는 포함하지 않는다. 결과 summary에는 fragmentation ratio, overlap fragmentation ratio, stale PTS ratio, class/category별 track/sample count가 포함된다. stale PTS ratio 기본 허용치는 `0.3`이며 반복 PTS가 많으면 동일 frame 재사용이나 loop 경계 영향을 먼저 의심한다.

반복 검증은 기본적으로 각 iteration 사이에 source idle cleanup을 기다려 같은 파일을 처음부터 다시 분석한다. 이렇게 해야 2회차가 1회차 재생이 끝난 파일 source의 중간/끝부분에 붙어서 stale PTS가 누적되는 오판을 피할 수 있다. 연속 스트림처럼 source를 재시작하지 않고 보고 싶다면 `--continuous-source`를 사용한다.

tracker fragmentation 계산은 기본적으로 다음 안정화 필터를 적용한다.
- `segmentAware=1`: PTS 역행/중복 PTS를 감지해 파일 반복/정지 경계를 segment로 분리한다.
- `classWhitelist=person`: 테스트 목적상 사람 track만 fragmentation 계산에 포함한다. 런타임 tracker 기본 대상은 `person,vehicle` 카테고리다.
- `minTrackSamples=3`: 1~2회만 보인 짧은 오검출 track은 제외한다.
- `maxStaleRatio=0.3`: 같은 PTS가 과도하게 반복되면 분석 source가 멈춘 것으로 보고 실패시킨다.
- `overlapFocus=0`: 기본 fragmentation 검증은 전체 person track 기준이다. 겹침/교차 장면만 강하게 보고 싶으면 `--overlap-focus`를 사용한다.
- 필요하면 `--class-whitelist '*'`, `--min-track-samples 1`, `--max-stale-ratio 1.0`, `--no-segment-aware`, `--no-long-sample`로 원시 계산에 가깝게 바꿀 수 있다.

겹침 장면 중심 tracker 검증:

```bash
./server.sh verify-tracker-stability --long --overlap-focus
```

`--overlap-focus`는 동시에 보이는 객체 수가 `--overlap-min` 이상인 구간의 track fragmentation을 따로 계산한다. 현재 lightweight tracker의 한계를 장기적으로 Kalman/ByteTrack 도입 여부 판단 자료로 남기기 위한 옵션이다.

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

HTTP/HLS playable URL은 기존 URI source 경로로 소비한다. 로컬 HTTP MP4, 로컬 HLS VOD, Mux/Apple 공개 HLS advisory는 RTSP/WebRTC matrix를 통과했으며, 외부 HTTP/HLS URI는 네트워크/upstream 상태 영향 때문에 선택 검증으로 둔다.

```text
rtsp://127.0.0.1:8554/dhseo?source=http&url={urlencoded_http_media_url}
rtsp://127.0.0.1:8554/dhseo?source=hls&url={urlencoded_m3u8_url}
POST http://127.0.0.1:8080/webrtc/session?source=http&url={urlencoded_http_media_url}
POST http://127.0.0.1:8080/whep?source=hls&url={urlencoded_m3u8_url}
```

주의:
- `source=http -> RTSP/WebRTC`는 로컬 HTTP MP4 기준 통과했다.
- `source=hls`는 로컬 HLS VOD와 Mux/Apple 공개 HLS advisory 기준 통과했다. 단 외부 URL은 선택 검증으로 둔다.
- ABR HLS에서 선택하지 않는 alternate/duplicate pad는 URI source 내부에서 `queue ! fakesink`로 배수해 upstream not-linked 오류를 막는다.
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
실험 기능 상태와 실패 유형은 `docs/youtube-import.md`에 별도로 정리한다.
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

## 영상 분석 / VA

VA 사용법, YOLO/COCO 라벨, overlay 샘플, rule/event, 정적 이미지 분석 API는 `video-analysis.md`로 분리했다.

이 문서에서는 개발/운영 세부 환경과 전체 서버 사용법만 유지한다.

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
- 검증 summary Markdown/HTML report smoke
- 안정화된 local core stream: `file`, 로컬 `RTSP pull`, 로컬 `WebRTC publish`
- 로컬 HTTP URI source
- 기본 VA: YOLO/ONNX 분석, overlay snapshot, RTSP overlay, WebRTC simple/WHEP overlay

기본 제외 항목:
- `HLS/외부 HTTP URI source`: 공개 HLS advisory는 통과했지만 네트워크와 upstream 상태 영향이 커서 선택 검증
- LAN IP 기준 외부 클라이언트 접근성, 제3자 RTSP upstream reachability, WebRTC ICE, 외부 TURN relay/auth
- `YouTube source/import`: 실험실 기능
- Rule/Profile UI, 룰/이벤트/POST, 정적 이미지 분석 API, WebRTC 다채널 fan-out은 `--full` 또는 선택 검증에서 실행
- adaptive tuner 장시간 검증

선택 검증:
```bash
./server.sh test --include-rules
./server.sh test --include-rule-ui
./server.sh test --include-va-events
./server.sh test --include-image-analysis
./server.sh test --include-webrtc-ice
./server.sh test --include-uri-longrun
./server.sh test --include-event-post
./server.sh test --include-multichannel
./server.sh test --include-report-summary
```
`--include-rules`는 profile/rule registry CRUD와 rule match 기반 profile 자동 선택을 확인한다. `--include-va-events`는 레포에 포함한 `video/imports/va_tracking_event_1280x720_30fps_h264.mp4` 이동 영상으로 presence, line-crossing, enter, exit 이벤트와 track ID 포함 여부를 확인한다. `--full`은 Rule/Profile UI, VA event, image analysis, event POST, multichannel, report summary를 한 번에 포함한다. `--external`은 `--full`에 LAN IP 외부 접근성, 외부 RTSP advisory, WebRTC ICE, 외부 HTTP/HLS URI longrun을 추가한다. 기존 LAN/외부 RTSP 포함 기준이 필요하면 `--stable`을 사용한다.

YOLO/adaptive/WebRTC/URI 선택 검증은 `/tmp/media_server_*_summary.*` 파일을 함께 남긴다. `verify-yolo-layouts`는 parser 조합별 마지막 tap 상태, `verify-adaptive`는 downshift/input-size/upshift 상태 전환, `verify-webrtc-ice`는 requested/effective ICE policy와 relay fallback, `verify-multichannel`은 일반/VA overlay 다중 client session, stream fan-out, analysis tap cleanup 상태, `verify-uri-longrun`은 외부 URL advisory 결과와 실패 시 DNS/HTTP status/playlist/pad-not-linked/timeout 분류를 요약한다. 외부 URI는 `config/external_uri_sources.example.json` 형식으로 별도 config를 관리하고 `./server.sh verify-uri-longrun --external-config <path>`로 실행할 수 있다. 여러 summary를 한 번에 훑을 때는 `./server.sh summarize-reports /tmp/media_server_*summary*.json --output /tmp/media_server_verification_report.md --html-output /tmp/media_server_verification_report.html`를 사용한다. Lab에서는 `/lab/reports`와 `/lab/reports/content?path=...`가 `/tmp/media_server_*` 텍스트 산출물만 노출하므로 최근 리포트를 브라우저에서 바로 확인할 수 있다.

기능 개발을 다시 시작하기 전 안정화 기준은 `./server.sh verify-predev --soak-minutes 30`으로 확인한다. 이 명령은 서버를 직접 시작한 뒤 통합 smoke, 다채널 WebRTC/VA, VA event, event POST schema/recovery/queue, summary report, runtime idle, 대표 port cleanup을 한 번에 확인한다. 기본 predev는 샌드박스/로컬 개발 환경 재현성을 위해 loopback bind와 `--skip-external` 통합 smoke를 사용한다. LAN IP 외부 클라이언트 접근성까지 hard gate로 보려면 `./server.sh verify-predev --include-external-client`를 사용한다. 외부 운영 TURN credential과 `MEDIA_SERVER_WEBRTC_ICE_TRANSPORT_POLICY=relay`가 준비된 경우에만 `./server.sh verify-predev --include-external-turn`을 사용해 relay/auth를 hard gate로 올린다. 개발 중 빠른 확인은 `./server.sh verify-predev --quick`을 사용한다.

### 1. 서버 상태 진단
```bash
./server.sh status
./server.sh diagnose
```

외부 클라이언트 접근성은 `--quick`, `--stable`, `--external`에서 hard gate로 확인한다. 제3자 RTSP upstream은 `--stable`, `--external` 기준에서 advisory로 확인하고, 명시 URL을 주면 hard gate로 본다. 진단만 따로 보려면:
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

source/session lifecycle trace는 역할을 나눠 사용한다. `MEDIA_SERVER_SESSION_TRACE=1`은 StreamRegistry acquire/reuse/idle cleanup 중심 로그이고, `MEDIA_SERVER_WEBRTC_TRACE=1`은 WebRTC 협상/상태 로그, `MEDIA_SERVER_WEBRTC_TRACE_VERBOSE=1`은 sample/pad/SDP 같은 고빈도 detail 로그다. StreamRegistry idle cleanup 검증은 `verify-tracker-stability --restart-between-iterations`처럼 iteration 사이에 idle grace보다 길게 대기하는 검증으로 확인한다.

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
- `HTTP video-only MP4 -> RTSP`
  - 입력 파일: `sample_h264_video_only.mp4`
  - 결과: `h264/hevc video + route silent audio`
  - URI/VOD source pacing 보정 후 로컬 HTTP matrix에서 통과했다.
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
- `file -> WebRTC 다채널 consume`
  - 같은 영상 다중 client는 dedup stream `1`, 여러 영상 다중 client는 source 수와 같은 stream 수를 확인
  - `--include-va` 기준 VA overlay 다중 client는 session 수와 analysis tap 수가 일치하고 종료 후 cleanup되는지 확인
- 로컬 전체 matrix 과거 결과
  - 당시 결과: `pass=63 fail=0 skip=3`
  - `2026-04-24` blocker 체크 결과: `pass=57 fail=6 skip=3`
  - 실패 6건은 `source=http` RTSP route probe에서 발생했다.
  - `2026-04-26` URI/VOD source pacing 보정 후 로컬 HTTP MP4 matrix가 다시 통과했고, 기본 테스트 범위에 포함했다.

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
- 외부 요인이 커서 장기 검증이 안정적이지 않다.
- `yt-dlp` 결과가 YouTube bot check, 로그인 요구, 지역 제한, 서명 URL 만료 정책에 영향을 받는다.
- `2026-04-24` 같은 공개 VOD `https://www.youtube.com/watch?v=aqz-KE-bpKQ`도 시점에 따라 결과가 갈렸다.
  - shell에서 바로 실행한 `/lab/import`와 resolver 단독 실행은 `Sign in to confirm you're not a bot`으로 실패했다.
  - 같은 날 Chrome `/lab/import` UI에서 재시도한 `import-2`는 `yt-dlp`가 `[jsc:deno]`로 challenge를 푼 뒤 `ready`까지 완료됐다.
- 그래서 현재는 `/lab`에서만 보이는 개발용 기능으로 유지하고, 기본 relay/analysis 경로는 `file`, `rtsp`, `webrtc`, `http/hls` 중심으로 진행한다.

현재 미확인 사항:
- YouTube URL 장기 검증 안정성
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

제3자 RTSP 후보 advisory는 `./server.sh test --stable` 또는 `./server.sh test --external`에서 확인합니다.
후보가 실패해도 코드 변경으로 인한 실패로 단정하지 않고, 신뢰 가능한 카메라/테스트 서버 URL을 명시했을 때만 hard gate로 봅니다.

```bash
MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS='rtsp://camera-or-test-host/live' ./server.sh test
```

현재 wowza demo는 이 환경에서 아래 두 형태로 확인됐습니다.
- 기본값: `RTSP preflight failed ... connection timed out`
- preflight 비활성화 후: `timed out waiting for RTSP source samples`

즉, 현재 wowza 실패는 codec 처리보다 외부 RTSP 연결성 또는 upstream 응답 지연 쪽으로 보는 것이 맞습니다.

## 관련 문서

- VA/YOLO 분석: `video-analysis.md`
- 구조 설명: `media-server-architecture.md`
- 검증 결과: `stream-verification.md`
