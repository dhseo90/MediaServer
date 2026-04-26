# Media Server

C++17 기반 미디어 서버입니다. `GStreamer`를 중심으로 `RTSP`, `WebRTC`, 파일 소스, RTSP pull 소스, 1차 VA(YOLO/ONNX) 분석을 같은 내부 스트림 구조 위에서 처리합니다.

목표 연결 모델:

```text
Client <-> (RTSP or WebRTC) <-> MediaServer <-> (File or RTSP or WebRTC or HTTP/HLS URI) <-> Original Source
```

`Client -> MediaServer` 프로토콜과 `MediaServer -> Original Source` 프로토콜은 URL/endpoint와 query로 독립 선택합니다.

## 문서 지도

처음 보는 사람은 이 README만 보고 설치/실행/대표 URL을 확인하면 됩니다. 상세 설계와 긴 검증 이력은 아래 문서로 분리합니다.

| 문서 | 용도 |
| --- | --- |
| [README.md](README.md) | 빠른 설치, 실행, 대표 URL, 현재 지원 범위 |
| [docs/development-guide.md](docs/development-guide.md) | 긴 개발/운영 가이드, 전체 환경변수, 상세 URL/API, 라이선스 메모 |
| [docs/video-analysis.md](docs/video-analysis.md) | VA/YOLO 분석, overlay 샘플, rule/event, 정적 이미지 분석 API |
| [docs/media-server-architecture.md](docs/media-server-architecture.md) | 전체 구조, 동시성, source/egress/analysis 설계 |
| [docs/stream-verification.md](docs/stream-verification.md) | 검증 기준, 통과/보류 항목, blocker와 테스트 이력 |

## 현재 지원 범위

안정 기준에 가까운 경로:

- `file -> RTSP`
- `file -> WebRTC(signaling/WHEP)`
- `RTSP pull -> RTSP`
- `RTSP pull -> WebRTC(signaling/WHEP)`
- `WebRTC publish(WHIP) -> RTSP/WebRTC` 1차 경로
- `HTTP URI(local MP4) -> RTSP/WebRTC`
- `va=1` 기반 YOLO/ONNX 객체 감지 overlay
- 정적 이미지 분석 API: metadata, snapshot JPEG, overlay JPEG

부분 지원/재확인 필요:

- `HLS/외부 HTTP URI -> RTSP/WebRTC`: 로컬 HLS VOD와 공개 HLS 후보(Mux/Apple) advisory 검증은 통과했다. 외부 URL은 upstream/CDN 상태 영향이 있어 기본 안정 테스트가 아닌 선택 검증으로 유지
- YouTube source/import: 실험실 기능, 기본 운영 기능 아님
- 운영용 WebRTC: Google STUN 기본값, TURN env opt-in, ICE transport policy 설정 경로가 추가됨. Mac 로컬 coturn 기준 relay candidate, 브라우저 playback, WHIP publish 검증은 통과했다. 외부 운영 TURN 서버 relay/auth end-to-end 테스트는 진행하지 않았고, Windows WSL2 TURN은 환경 제약으로 별도 보류했다.

## 설치 및 실행 환경

지원 목표:

- OS: `macOS`, `Linux`
- Language: `C++17`
- Build: `CMake 3.16+`
- Media framework: `GStreamer 1.0`
- AI detector: `ONNX Runtime` + YOLO model, 기본 설치 흐름에 포함

필수 도구:

- `cmake`
- `pkg-config`
- C++17 compiler
- `gst-inspect-1.0`
- `ffmpeg` / `ffprobe`
- `curl`
- `python3`
- `node`
- `ONNX Runtime` 개발 파일
- 선택: `yt-dlp`, `deno`는 실험실 YouTube import/source용

새 환경 권장 순서:

```bash
./server.sh install
./server.sh build
./server.sh start
./server.sh status
```

종료:

```bash
./server.sh stop
```

개발 중 로그를 바로 보려면:

```bash
./server.sh foreground
```

상세 진단:

```bash
./server.sh diagnose
```

같은 LAN의 다른 PC에서 테스트할 URL 출력:

```bash
./server.sh urls
```

`./server.sh start`는 새 환경에서 외부 PC 접근 테스트가 가능하도록 RTSP/HTTP를 기본적으로 `0.0.0.0`에 bind합니다. 실제 포트와 URL은 환경변수/포트 충돌에 따라 달라질 수 있으므로 항상 `./server.sh status` 또는 `./server.sh urls` 출력값을 우선합니다.

기본 background 실행 방식은 `nohup`입니다. macOS에서 시스템 사용자 세션에 붙여 더 오래 유지하고 싶으면 선택적으로 `MEDIA_SERVER_START_MODE=launchd ./server.sh start`를 사용할 수 있습니다. Codex 같은 샌드박스형 실행환경에서는 background child process 정리 정책이 섞일 수 있으므로, 자동 검증 중에는 `./server.sh foreground`가 더 재현성이 좋습니다.

macOS/Homebrew에서 수동 설치가 필요하면:

```bash
brew install cmake pkg-config ffmpeg node python yt-dlp deno \
  gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad \
  gst-rtsp-server libnice libnice-gstreamer onnxruntime
```

Linux/Debian 계열에서 수동 설치가 필요하면:

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

macOS/Homebrew 환경에서 GStreamer plugin scanner 또는 `libglib`, `libgobject` 탐색 문제가 나면 `./server.sh`가 아래 계열 환경변수를 자동 보정합니다.

- `PATH`
- `PKG_CONFIG_PATH`
- `GI_TYPELIB_PATH`
- `GST_PLUGIN_SCANNER`
- `DYLD_FALLBACK_LIBRARY_PATH`

설치/환경 세부 설명은 [docs/development-guide.md](docs/development-guide.md)를 봅니다.

## 기본 명령

| 명령 | 용도 |
| --- | --- |
| `./server.sh install` | 의존성, ONNX Runtime, YOLO 모델/라벨, 로컬 env 준비 |
| `./server.sh build` | AI 포함 기본 빌드 |
| `./server.sh start` | background 서버 실행 |
| `./server.sh foreground` | foreground 서버 실행 |
| `./server.sh stop` | 서버 종료 |
| `./server.sh restart` | 서버 재시작 후 진단 |
| `./server.sh status` | 프로세스/포트/로그 상태 확인 |
| `./server.sh diagnose` | 실행환경/포트/source 진단 |
| `./server.sh urls` | 다른 PC에서 복사해 쓸 테스트 URL 출력 |
| `./server.sh test` | 안정 기능 기준 통합 테스트 |

선택 검증:

```bash
./server.sh verify-codecs
./server.sh verify-webrtc-ice
./server.sh verify-uri-longrun
./server.sh verify-uri-longrun --include-external --external-urls https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
./server.sh verify-uri-longrun --include-external --external-rtsp-routes default,h264,opus --external-urls https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
./server.sh verify-va
./server.sh verify-va-events
./server.sh verify-route-profiles
./server.sh verify-tracker-stability
./server.sh verify-yolo-layouts
./server.sh verify-adaptive
./server.sh verify-image-analysis
```

## 대표 접속 주소

기본 코드값 기준:

- RTSP: `rtsp://127.0.0.1:8554/dhseo`
- 통합 Lab UI: `http://127.0.0.1:8080/lab`
- WebRTC 브라우저 ICE 설정: `GET http://127.0.0.1:8080/webrtc/config`
- WebRTC simple signaling: `POST http://127.0.0.1:8080/webrtc/session?...`
- WHEP consume: `POST http://127.0.0.1:8080/whep?...`
- WHIP publish: `POST http://127.0.0.1:8080/whip/publish?sourceId=...`

실행 스크립트가 다른 포트를 선택할 수 있으므로 실제 테스트 전에는:

```bash
./server.sh status
./server.sh urls
```

## 대표 URL 예시

파일을 RTSP로 재생:

```text
rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4
```

H265 route로 파일을 RTSP 재생:

```text
rtsp://127.0.0.1:8554/dhseo/h265?file=sample_h264.mp4
```

RTSP 카메라/source를 pull해서 RTSP로 재송출:

```text
rtsp://127.0.0.1:8554/dhseo?url=rtsp%3A%2F%2Fcamera-host%3A554%2Flive
```

파일을 WebRTC simple signaling으로 consume:

```text
POST http://127.0.0.1:8080/webrtc/session?file=sample_h264.mp4
```

파일을 WHEP로 consume:

```text
POST http://127.0.0.1:8080/whep?file=sample_h264.mp4
```

WebRTC publish source를 RTSP로 consume:

```text
rtsp://127.0.0.1:8554/dhseo?source=webrtc&url={source_id}
```

상세 URL matrix와 codec route는 `docs/development-guide.md`를 봅니다.

## VA / 이미지 분석 빠른 예시

상세한 VA/YOLO 모델 기준, 객체 카테고리, rule/event, 정적 이미지 분석 API는 [docs/video-analysis.md](docs/video-analysis.md)를 봅니다.

기본 tracker는 사람/차량 계열(`person,bicycle,car,motorcycle,bus,truck`)에만 `trackId`/trail을 붙이고, 그 외 객체는 detection/overlay만 유지합니다. 시간 기반 이벤트가 필요한 객체는 `trackingClasses=<label-list>` 또는 `MEDIA_SERVER_ANALYSIS_TRACKING_CLASSES`로 opt-in합니다.

VA overlay 샘플:

![VA overlay 한글 라벨 샘플](docs/assets/va-four-scene-overlay-ko.jpg)

RTSP overlay stream:

```text
rtsp://127.0.0.1:8554/dhseo?file=va_four_scene_sample.mp4&va=1
```

WebRTC overlay consume:

```text
POST http://127.0.0.1:8080/webrtc/session?file=va_four_scene_sample.mp4&va=1
```

정적 이미지 metadata 분석:

```bash
curl -fsS 'http://127.0.0.1:8080/lab/analysis/image?asset=va-four-scene-sample.png'
```

정적 이미지 overlay JPEG:

```bash
curl -fsS -o overlay.jpg \
  'http://127.0.0.1:8080/lab/analysis/image/overlay.jpg?asset=va-four-scene-sample.png&labelLang=ko&quality=88'
```

정적 이미지 분석은 서버에 overlay 파일을 저장하지 않고 요청 시 즉석에서 JPEG 응답을 생성합니다.

## 테스트 기준

기본 통합 테스트:

```bash
./server.sh test
```

기본 포함:

- 스크립트/JSON 정적 검사
- 서버 start/status/diagnose
- LAN IP 기준 외부 클라이언트 접근성
- stable local stream 경로: file, local RTSP pull, local WebRTC publish, local HTTP URI
- 기본 YOLO/VA overlay 회귀

기본 제외:

- HLS/외부 HTTP URI source
- YouTube source/import
- 룰/이벤트/POST 장시간 검증
- adaptive tuner 장시간 검증
- 정적 이미지 분석 API
- 외부 운영 TURN 서버 relay/auth 검증 및 별도 호스트 TURN 재검증

선택 검증:

```bash
./server.sh test --include-rules
./server.sh test --include-va-events
./server.sh test --include-image-analysis
./server.sh test --include-webrtc-ice
./server.sh test --include-uri-longrun
```

상세 검증 기준과 과거 통과/보류 이력은 `docs/stream-verification.md`를 봅니다.

## 중요한 경로 정책

문서와 URL 예시는 프로젝트 기준 상대경로를 사용합니다.

- `?file=`은 `MEDIA_SERVER_FILE_ROOT` 기준 token입니다. 기본 root는 `video`입니다.
- 예: `sample_h264.mp4`, `imports/NewYorkDriving.mp4`
- `model`, `labels`도 디버그 query에서는 `models/yolo11n.onnx`, `models/coco.names`처럼 상대경로를 씁니다.
- 개인 홈 디렉터리나 LAN IP 같은 환경 의존 값은 문서/커밋에 남기지 않습니다.
- 정적 이미지 API도 절대경로와 `..` 경로 이탈을 거부합니다.

## 라이선스/배포 주의

현재 저장소에는 아직 프로젝트 자체 `LICENSE`가 없습니다. 공개/상용 배포 전에는 별도 라이선스 결정을 해야 합니다.

주의할 점:

- GStreamer 자체는 LGPL 계열이지만 plugin/codec 조합에 따라 조건이 달라질 수 있습니다.
- `x264enc`, `x265enc`, H264/H265/HEVC route는 GPL/특허/로열티 검토 대상이 될 수 있습니다.
- `yt-dlp`, `deno`, `ffmpeg`는 실험실 기능 또는 외부 binary 경로로 쓰입니다.
- 바이너리 배포 전에는 `NOTICE` 또는 third-party license 문서가 필요합니다.

상세 메모는 `docs/development-guide.md`의 라이선스/배포 주의사항을 봅니다.
