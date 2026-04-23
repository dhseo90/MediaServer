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
| `WebRTC` | `file` | `POST /webrtc/session?file=sample_h264.mp4` |
| `WebRTC` | `RTSP` | `POST /webrtc/session?url=rtsp%3A%2F%2Fcamera-host%3A554%2Flive` |
| `WebRTC` | `WebRTC` | `POST /webrtc/session?source=webrtc&url=publisher-demo` |

## 현재 구현 상태

### 구현 완료
- `file -> RTSP`
- `file -> WebRTC(signaling)`
- `RTSP pull -> RTSP`
- `RTSP pull -> WebRTC(signaling)`
- `HTTP media URL -> RTSP/WebRTC` 1차 경로
  - 현재 `source=http` RTSP route subset(`default`, `h264`, `opus`) 통과
  - 현재 `source=http` WebRTC signaling 통과
- `YouTube watch/live URL -> RTSP/WebRTC` 1차 resolver 경로
  - `source=youtube` 요청을 `yt-dlp -> HTTP/HLS URL -> UriSourceWorker`로 연결
  - fake resolver가 로컬 HTTP MP4 URL을 반환하는 조건에서 `source=youtube -> RTSP(h264+aac)` 통과
  - 실제 YouTube 업로드 URL 기준 RTSP, WebRTC simple signaling, WHEP playback 통과
  - 실제 YouTube 라이브 URL 기준 RTSP, WebRTC simple signaling, WHEP playback 통과
  - WebRTC egress video는 브라우저 H264 협상 호환성을 위해 720p/30fps로 정규화
- 동일 source 요청에 대한 `StreamRegistry` 기반 dedup 구조
- `SharedStream` 기반 video/audio fan-out
- route별 video/audio codec 변환
  - video: `H264`, `H265`
  - audio: `AAC`, `Opus`, `PCMU`, `PCMA`
- 외부 RTSP source용 preflight + timeout 분리 진단

### 부분 구현
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

### 아직 미구현 또는 placeholder
- 운영용 WebRTC auth / STUN / TURN / ICE policy 설정
- 운영용 metrics / admin API
- 외부 RTSP source별 세밀한 reconnect 정책

### 최근 정리
- WebRTC egress/source 양쪽에 중복되어 있던 GStreamer RTCP workaround, SDP sanitize, pipeline clock/latency 설정을 `ingress/webrtc_gst_utils`로 공통화했습니다.
- `MEDIA_SERVER_WEBRTC_TRACE`는 협상/상태 중심 로그만 출력하고, sample/pad/caps/SDP detail은 `MEDIA_SERVER_WEBRTC_TRACE_VERBOSE=1`로 분리했습니다.
- 최근 검증:
  - `WebRTC browser publish -> WHEP consume`: audio/video track 연결 및 playback 확인
  - `WebRTC browser publish -> simple signaling consume`: audio/video track 연결 및 playback 확인

## 디렉터리

- `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/src`
  - 실제 서버 구현
- `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/include`
  - 헤더 및 기본 설정
- `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/scripts`
  - 실행, 중지, 진단, 검증 스크립트
- `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/config`
  - codec/source 검증 설정
- `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs`
  - 구조/검증 상세 문서
- `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/video`
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
- `python3`
  - 로컬 RTSP/HTTP source launcher와 일부 검증 스크립트에 사용한다.
- `node`
  - 브라우저 WebRTC end-to-end 검증 스크립트에 사용한다.
- `yt-dlp`
  - `source=youtube` 요청에서 YouTube watch/live URL을 HTTP/HLS playable URL로 해석할 때 사용한다.

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
스크립트는 `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/scripts/env_common.sh`의 `media_server_apply_homebrew_gst_env`를 통해 아래 환경변수를 자동 보정한다.

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
HOMEBREW_PREFIX=/usr/local ./scripts/run_server_foreground.sh
```

수동 설치가 필요하면 아래 패키지를 설치한다.

```bash
brew install cmake pkg-config ffmpeg node python yt-dlp \
  gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad \
  gst-rtsp-server libnice libnice-gstreamer
```

### Linux 환경
Linux에서는 `pkg-config`가 GStreamer 개발 패키지를 찾을 수 있어야 한다.

Debian/Ubuntu 계열:

```bash
sudo apt update
sudo apt install -y \
  build-essential cmake pkg-config ffmpeg python3 nodejs yt-dlp \
  libgstreamer1.0-dev libgstrtspserver-1.0-dev libnice-dev \
  gstreamer1.0-tools gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good gstreamer1.0-plugins-bad
```

Fedora 계열:

```bash
sudo dnf install -y \
  gcc-c++ cmake pkgconf-pkg-config ffmpeg python3 nodejs yt-dlp \
  libnice libnice-devel \
  gstreamer1-devel gstreamer1-rtsp-server-devel \
  gstreamer1-plugins-base-tools gstreamer1-plugins-base \
  gstreamer1-plugins-good gstreamer1-plugins-bad-free
```

Arch 계열:

```bash
sudo pacman -S --needed \
  base-devel cmake pkgconf ffmpeg python nodejs yt-dlp \
  gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad \
  gst-rtsp-server libnice
```

프로젝트 스크립트로도 설치를 시도할 수 있다.

```bash
./scripts/install_deps.sh
```

### 런타임 포트와 기본 경로
기본값은 `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/include/stdafx.h`에 있다.

| 항목 | 기본값 | 설명 |
| --- | --- | --- |
| RTSP listen address | `127.0.0.1` | RTSP server bind address |
| RTSP listen port | `8554` | RTSP server port |
| HTTP listen address | `127.0.0.1` | WebRTC signaling/WHEP/WHIP HTTP bind address |
| HTTP listen port | `8080` | WebRTC HTTP server port |
| route | `dhseo` | RTSP path prefix |
| file root | `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/video` | `?file=` 접근 가능 root |
| default file | `sample_h264.mp4` | 기본 테스트 파일 |

테스트 중 포트 충돌을 피하려면 env로 덮어쓴다.

```bash
MEDIA_SERVER_LISTEN_PORT=8555 \
MEDIA_SERVER_HTTP_LISTEN_PORT=8081 \
./scripts/run_server_foreground.sh
```

### 런타임 환경변수
환경변수는 `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/src/app_config.cpp`에서 읽고, 기본값은 `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/include/app_config.h`와 `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/include/stdafx.h`에 있다.

| env | 기본값/의미 |
| --- | --- |
| `MEDIA_SERVER_ROUTE` | RTSP route prefix. 기본 `dhseo` |
| `MEDIA_SERVER_LISTEN_ADDRESS` | RTSP bind address |
| `MEDIA_SERVER_LISTEN_PORT` | RTSP bind port |
| `MEDIA_SERVER_HTTP_LISTEN_ADDRESS` | WebRTC HTTP bind address |
| `MEDIA_SERVER_HTTP_LISTEN_PORT` | WebRTC HTTP bind port |
| `MEDIA_SERVER_FILE_ROOT` | `?file=` 접근 가능 root |
| `MEDIA_SERVER_DEFAULT_FILE` | 기본 sample file |
| `MEDIA_SERVER_FORCE_RTSP_TCP` | `1`이면 RTSP transport를 TCP 위주로 강제 |
| `MEDIA_SERVER_SESSION_TRACE` | `1`이면 SessionManager acquire/cleanup 로그 출력 |
| `MEDIA_SERVER_WEBRTC_TRACE` | `1`이면 WebRTC 협상/상태 로그 출력 |
| `MEDIA_SERVER_WEBRTC_TRACE_VERBOSE` | `1`이면 sample/pad/caps/SDP 상세 로그 추가 |
| `MEDIA_SERVER_WEBRTC_SOURCE_READY_TIMEOUT_MS` | WHIP publish source track 준비 대기 시간 |
| `MEDIA_SERVER_RTSP_SOURCE_PREFLIGHT_TIMEOUT_MS` | 외부 RTSP host:port 사전 연결성 검사 timeout |
| `MEDIA_SERVER_RTSP_SOURCE_START_TIMEOUT_MS` | RTSP/URI source 첫 sample 대기 timeout |
| `MEDIA_SERVER_RTSP_TRACK_SETTLE_QUIET_PERIOD_MS` | 첫 track 이후 추가 track discovery quiet period |
| `MEDIA_SERVER_RTSP_TRACK_SETTLE_MAX_MS` | track discovery 전체 상한 |
| `MEDIA_SERVER_GST_ATTACH_CONTEXT` | GStreamer RTSP server main context 강제 설정 |
| `MEDIA_SERVER_YOUTUBE_RESOLVER_BIN` | YouTube URL 해석에 사용할 resolver binary. 기본 `yt-dlp` |
| `MEDIA_SERVER_YOUTUBE_FORMAT` | `yt-dlp -f` format selector. 기본은 HLS 우선, 그 다음 audio/video 포함 HTTP 포맷 |
| `MEDIA_SERVER_YOUTUBE_RESOLVE_TIMEOUT_MS` | YouTube URL 해석 timeout. 기본 `15000` |
| `MEDIA_SERVER_YOUTUBE_RECONNECT_DELAY_MS` | YouTube delegate가 중단된 뒤 재해석/재연결을 시도하기 전 대기 시간. 기본 `2000` |

로컬 실행용 env 파일은 아래 예시를 복사해서 만든다.

```bash
cp scripts/.media_server.env.example scripts/.media_server.env
```

`start_server.sh`, `restart_server.sh`, `run_server_foreground.sh`는 이 파일이 있으면 읽어서 적용한다.

### 실행 스크립트 역할
| 스크립트 | 용도 |
| --- | --- |
| `scripts/install_deps.sh` | macOS/Linux 의존성 설치 |
| `scripts/run_server_foreground.sh` | foreground 실행. 개발/디버깅 권장 |
| `scripts/start_server.sh` | background 실행 |
| `scripts/stop_server.sh` | 서버 종료 |
| `scripts/restart_server.sh` | 서버 재시작 |
| `scripts/check_server.sh` | 프로세스/포트/로그 상태 확인 |
| `scripts/diagnose_media_server.sh` | 실행환경, 포트, source 접근성 진단 |
| `scripts/print_external_test_urls.sh` | 같은 LAN의 다른 PC에서 복사해 테스트할 URL 출력 |
| `scripts/verify_codec_matrix.sh` | source/route codec matrix 자동 검증 |
| `scripts/serve_test_rtsp_source.py` | 로컬 샘플 파일을 RTSP source로 제공 |
| `scripts/whip_publish_test.py` | 로컬 WebRTC WHIP publisher |
| `scripts/browser_webrtc_publish_consume_check.mjs` | 브라우저 기반 publish/consume 검증 |

### 권장 개발 흐름
처음 환경 구성:

```bash
./scripts/install_deps.sh
pkg-config --modversion gstreamer-1.0
gst-inspect-1.0 webrtcbin nicesrc nicesink
yt-dlp --version
```

빌드:

```bash
cmake -S . -B build-gst -DMEDIA_SERVER_USE_GSTREAMER=ON
cmake --build build-gst
```

개발 실행:

```bash
./scripts/run_server_foreground.sh
```

상태 확인:

```bash
./scripts/check_server.sh
./scripts/diagnose_media_server.sh
```

자동 검증:

```bash
./scripts/verify_codec_matrix.sh
```

변경 전후 최소 확인:

```bash
cmake --build build-gst
bash -n scripts/verify_codec_matrix.sh
python3 -m json.tool config/codec_test_sources.json >/tmp/codec_test_sources.json.check
git diff --check
```

### 실행 환경 이슈 체크
macOS/Homebrew에서 GStreamer plugin scanner 또는 `libglib`, `libgobject` 탐색 문제가 나면 아래를 먼저 확인한다.

```bash
source ./scripts/env_common.sh
media_server_apply_homebrew_gst_env
gst-inspect-1.0 --version
gst-inspect-1.0 webrtcbin
gst-inspect-1.0 nicesrc
gst-inspect-1.0 nicesink
```

서버가 실행 중인데 접속이 안 되면 아래 순서로 본다.

```bash
./scripts/check_server.sh
lsof -nP -iTCP:8554 -iTCP:8080 -sTCP:LISTEN
./scripts/diagnose_media_server.sh
```

샌드박스/CI/컨테이너 환경에서는 socket bind 자체가 막힐 수 있다. 이 경우 코드는 정상이어도 local runtime 검증이 실패할 수 있으므로 `diagnose_media_server.sh`에서 bind 가능 여부를 먼저 확인한다.

## 주요 설정 위치

### 기본 상수
- `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/include/stdafx.h`
  - `kStreamRoute`
  - `kRtspListenAddress`
  - `kRtspListenPort`
  - `kHttpListenAddress`
  - `kHttpListenPort`
  - `kFileRootPath`
  - `kDefaultFilePath`

### 런타임 환경변수
- `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/include/app_config.h`
- `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/src/app_config.cpp`

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
- `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/scripts/.media_server.env.example`

## 의존성 설치

개발 환경 상세는 위의 `개발 및 실행 환경` 섹션을 우선 참고한다.

```bash
./scripts/install_deps.sh
```

macOS/Homebrew 기준으로는 `gstreamer`, `gst-plugins-*`, `gstreamer-rtsp-server`, `libnice-gstreamer`, `ffmpeg`, `node`, `yt-dlp` 계열이 필요합니다.

## 빌드

```bash
cmake -S . -B build-gst -DMEDIA_SERVER_USE_GSTREAMER=ON
cmake --build build-gst
```

## 실행

### foreground
개발/디버깅 시 가장 권장됩니다.

```bash
./scripts/run_server_foreground.sh
```

### background
```bash
./scripts/start_server.sh
```

### 중지 / 재시작 / 상태 확인
```bash
./scripts/stop_server.sh
./scripts/restart_server.sh
./scripts/check_server.sh
./scripts/diagnose_media_server.sh
```

## 기본 접속 주소

기본값 기준:
- RTSP: `rtsp://127.0.0.1:8554/dhseo`
- WebRTC test page: `http://127.0.0.1:8080/webrtc/test`

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
source ./scripts/env_common.sh
media_server_apply_homebrew_gst_env
python3 -u ./scripts/whip_publish_test.py --http-base http://127.0.0.1:8080 --source-id publisher-demo --duration 0
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

### 6. HTTP/HLS/YouTube URL -> RTSP / WebRTC

HTTP/HLS playable URL은 기존 URI source 경로로 바로 소비한다.

```text
rtsp://127.0.0.1:8554/dhseo?source=http&url={urlencoded_http_media_url}
rtsp://127.0.0.1:8554/dhseo?source=hls&url={urlencoded_m3u8_url}
POST http://127.0.0.1:8080/webrtc/session?source=http&url={urlencoded_http_media_url}
POST http://127.0.0.1:8080/whep?source=hls&url={urlencoded_m3u8_url}
```

YouTube watch/live URL은 `source=youtube`로 요청한다.
서버는 `yt-dlp`를 실행해 실제 HTTP/HLS URL로 해석한 뒤, 기존 `source=http|hls` URI source worker에 위임한다.

```text
rtsp://127.0.0.1:8554/dhseo?source=youtube&url={urlencoded_youtube_watch_or_live_url}
POST http://127.0.0.1:8080/webrtc/session?source=youtube&url={urlencoded_youtube_watch_or_live_url}
POST http://127.0.0.1:8080/whep?source=youtube&url={urlencoded_youtube_watch_or_live_url}
```

주의:
- `source=youtube`는 `yt-dlp`가 설치되어 있어야 동작한다.
- YouTube URL은 권한, 지역 제한, 로그인 필요 여부, URL 만료 정책에 영향을 받는다.
- 비공개, 로그인 필요, 지역 제한, 접근권한이 필요한 URL은 MediaServer에서 우회하지 않고 실패로 처리한다.
- resolver 결과는 서명된 임시 URL일 수 있으므로 stream key는 원본 YouTube URL 기준으로 묶고, 실제 media URL은 worker 내부에서만 사용한다.
- 동일 YouTube URL을 여러 클라이언트가 동시에 요청하면 원본 YouTube URL 기준으로 dedup되어 resolver/source worker는 1개만 시작된다.
- 실행 중 HLS/HTTP delegate가 중단되면 `MEDIA_SERVER_YOUTUBE_RECONNECT_DELAY_MS` 이후 원본 YouTube URL을 다시 resolve해서 재연결을 시도한다.

실패 메시지 기준:
- `invalid YouTube URL host`
  - `source=youtube`에 YouTube 계열 host가 아닌 URL이 들어온 경우다.
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
- 분석 결과는 최소 세 가지 타입으로 나눠 다룹니다.
  - `metadata`: box, label, score, timestamp
  - `derived image`: JPEG snapshot, thumbnail, crop image
  - `rendered stream`: bounding box overlay가 들어간 2차 스트림

클라이언트 전달 방식 후보:
- RTSP/WebRTC 본 스트림 위에 overlay된 영상으로 전달
- 별도 HTTP API로 snapshot 이미지를 전달
- WebRTC data channel 또는 별도 API로 detection metadata를 전달

즉 미래 구조는 단순한 `stream relay`를 넘어 아래처럼 확장됩니다.

```text
Client <-> (RTSP or WebRTC) <-> MediaServer
                                   |
                                   +-> Relay Path
                                   +-> Analysis Path
                                   +-> Snapshot / Metadata Path
```

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

## 테스트 방식

### 1. 서버 상태 진단
```bash
./scripts/check_server.sh
./scripts/diagnose_media_server.sh
```

외부 RTSP reachability도 보려면:
```bash
MEDIA_SERVER_DIAG_INCLUDE_EXTERNAL=1 ./scripts/diagnose_media_server.sh
```

특정 외부 RTSP URL을 직접 보려면:
```bash
MEDIA_SERVER_DIAG_RTSP_URL='rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov' \
./scripts/diagnose_media_server.sh
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
./scripts/verify_codec_matrix.sh
```

외부 RTSP source도 포함:
```bash
MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=1 ./scripts/verify_codec_matrix.sh
```

세션 재사용/cleanup 흐름을 자세히 보려면:
```bash
MEDIA_SERVER_SESSION_TRACE=1 ./scripts/run_server_foreground.sh
```

특정 source만:
```bash
MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus ./scripts/verify_codec_matrix.sh
```

검증 설정:
- `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/config/codec_test_sources.json`

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
./scripts/restart_server.sh
```

복사 가능한 URL 목록은 아래 스크립트가 현재 LAN IP와 포트 기준으로 출력한다.

```bash
./scripts/print_external_test_urls.sh
```

IP를 직접 지정하려면:

```bash
MEDIA_SERVER_EXTERNAL_HOST=<MACBOOK_LAN_IP> ./scripts/print_external_test_urls.sh
```

먼저 다른 PC 브라우저에서 `/health`와 `/webrtc/test`가 열리는지 확인한다. 여기서 실패하면 RTSP/WebRTC 문제가 아니라 macOS 방화벽, bind address, 공유기 WiFi/LAN isolation 문제를 먼저 봐야 한다.
이 스크립트 출력에는 현재 LAN IP가 포함될 수 있으므로, 출력 결과를 그대로 문서나 커밋에 붙이지 않는다.

상세 결과 문서:
- `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/stream-verification.md`

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
- `YouTube resolver(fake yt-dlp -> local HTTP MP4) -> RTSP`
  - 결과: `h264 + aac`
- `YouTube uploaded/VOD URL -> RTSP`
  - test URL: `https://www.youtube.com/watch?v=aqz-KE-bpKQ`
  - 결과: `h264 + aac`
- `YouTube uploaded/VOD URL -> WebRTC(simple signaling)`
  - browser consumer 기준 audio/video track 및 `decoded video frame` 확인
  - 결과 해상도: `1280x720`
- `YouTube uploaded/VOD URL -> WebRTC(WHEP)`
  - browser consumer 기준 audio/video track 및 `decoded video frame` 확인
  - 결과 해상도: `1280x720`
- `YouTube live URL -> RTSP`
  - test URL: `https://www.youtube.com/watch?v=iYmvCUonukw`
  - 결과: `h264 + aac`
- `YouTube live URL -> WebRTC(simple signaling)`
  - browser consumer 기준 audio/video track 및 `decoded video frame` 확인
  - 결과 해상도: `1280x720`
- `YouTube live URL -> WebRTC(WHEP)`
  - browser consumer 기준 audio/video track 및 `decoded video frame` 확인
  - 결과 해상도: `1280x720`
- `YouTube 동일 URL 5개 동시 요청 -> WebRTC session`
  - 결과: resolver 1회, source worker start 1회, stream created 1회, 나머지 4개 요청은 동일 `SharedStream` 재사용
- `YouTube fake HLS/EOS -> delegate reconnect`
  - 결과: `delegate stopped -> resolved -> reconnected` 반복 확인
- 로컬 전체 matrix
  - 결과: `pass=63 fail=0 skip=3`

## 외부 RTSP source 관련 주의

외부 RTSP source는 로컬 샘플과 다르게 네트워크 상태 영향을 크게 받습니다.

현재 wowza demo는 이 환경에서 아래 두 형태로 확인됐습니다.
- 기본값: `RTSP preflight failed ... connection timed out`
- preflight 비활성화 후: `timed out waiting for RTSP source samples`

즉, 현재 wowza 실패는 codec 처리보다 외부 RTSP 연결성 또는 upstream 응답 지연 쪽으로 보는 것이 맞습니다.

## 관련 문서

- 구조 설명: `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/media-server-architecture.md`
- 검증 결과: `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/stream-verification.md`

## 다음에 이어서 하기 좋은 작업

1. 영상분석 branch 추가
   - 현재 relay 안정화 기준으로 file, HTTP/HLS, YouTube, RTSP pull, WebRTC publish source의 주요 경로를 검증했다.
   - 송신 경로(RTSP/WebRTC egress)는 직접 막지 않는다.
   - `SharedStream`에 별도 analysis subscriber/tap을 붙이고, 분석 branch는 drop-oldest 및 frame sampling을 사용한다.
   - 첫 단계는 metadata/snapshot API로 시작하고, overlay stream은 이후 별도 단계로 분리한다.
2. YouTube URL source 유지보수
   - `source=hls|http` 형태의 `HLS/HTTP SourceWorker` 1차 경로를 추가했고, 로컬 HTTP MP4 기준 RTSP/WebRTC 검증이 통과했다.
   - `source=youtube` 1차 경로는 `yt-dlp` 기반 `YouTubeResolver -> HLS/HTTP URL -> UriSourceWorker` 구조로 연결했다.
   - 라이브와 업로드된 영상 모두 고려하되, 약관/권한 문제 때문에 기본 source 기능은 `youtube`가 아니라 `hls/http`로 둔다.
   - video-only source를 막던 RTSP/WebRTC egress의 대표 실패 지점을 완화했다.
   - 실제 업로드/라이브 URL 각각 1개씩 RTSP/WebRTC 검증이 통과했다.
   - 지역 제한/로그인 필요/비공개 URL은 우회하지 않고 실패시키는 정책으로 둔다.
   - fake HLS/EOS source 기준 재연결 동작까지 확인했다.
3. 운영 안정화 후속
   - 외부 RTSP source별 timeout/profile 설정 확장
   - WebRTC 운영 설정(auth/STUN/TURN/ICE policy) 정리
   - audio-only input은 현재 video relay/analysis 준비 범위 밖이다. RTSP/WebRTC egress는 video track을 기준으로 동작한다.
   - WebRTC end-to-end 브라우저 검증 자동화 범위 확장
