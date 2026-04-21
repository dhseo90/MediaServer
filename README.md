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
SourceWorker (File / RTSP Pull / future WebRTC)
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
| `MediaServer -> Original Source` | query/source 파라미터 | `file`, `RTSP`, `WebRTC` |

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

예제 env 파일:
- `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/scripts/.media_server.env.example`

## 의존성 설치

```bash
./scripts/install_deps.sh
```

macOS/Homebrew 기준으로는 `gstreamer`, `gst-plugins-*`, `gstreamer-rtsp-server`, `libnice-gstreamer` 계열이 필요합니다.

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
- `WebRTC publish(publisher-demo2 local WHIP test) -> RTSP`
  - `rtsp://127.0.0.1:8555/dhseo?source=webrtc&url=publisher-demo2`
  - 결과: `h264 + aac`
- `WebRTC publish(local WHIP test publisher) -> WebRTC(simple signaling)`
  - browser consumer 기준 `decoded video frame` 확인
- `WebRTC publish(browser publisher) -> WebRTC(simple signaling)`
  - browser consumer 기준 `decoded video frame` 확인
- `WebRTC publish(browser publisher) -> WebRTC(WHEP)`
  - browser consumer 기준 audio/video track 및 `decoded video frame` 확인

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

1. YouTube URL source 검토/구현
   - 먼저 `source=hls|http` 형태의 `HLS/HTTP SourceWorker`를 추가한다.
   - YouTube watch/live URL은 직접 media URL이 아니므로 `YouTubeResolver -> HLS/HTTP URL -> SourceWorker` 구조로 격리한다.
   - 라이브와 업로드된 영상 모두 고려하되, 약관/권한 문제 때문에 기본 source 기능은 `youtube`가 아니라 `hls/http`로 둔다.
   - 구현 전 `video-only` source 허용 여부를 점검한다.
2. 영상분석 branch 추가
   - 송신 경로(RTSP/WebRTC egress)는 직접 막지 않는다.
   - `SharedStream`에 별도 analysis subscriber/tap을 붙이고, 분석 branch는 drop-oldest 및 frame sampling을 사용한다.
   - 첫 단계는 metadata/snapshot API로 시작하고, overlay stream은 이후 별도 단계로 분리한다.
3. 운영 안정화 후속
   - `SessionManager` trace 로그 정리
   - 외부 RTSP source별 timeout/profile 설정 확장
   - WebRTC 운영 설정(auth/STUN/TURN/ICE policy) 정리
   - WebRTC end-to-end 브라우저 검증 자동화 범위 확장
