# Media Server

C++17 기반 미디어 서버입니다. `GStreamer`를 중심으로 `RTSP`, `WebRTC`, 파일 소스, RTSP pull 소스, 1차 VA(YOLO/ONNX) 분석을 같은 내부 스트림 구조 위에서 처리합니다.

목표 연결 모델:

```text
Client <-> (RTSP or WebRTC) <-> MediaServer <-> (File or RTSP or WebRTC) <-> Original Source
```

`Client -> MediaServer` 프로토콜과 `MediaServer -> Original Source` 프로토콜은 URL/endpoint와 query로 독립 선택합니다.

## 문서 지도

처음 보는 사람은 이 README만 보고 설치/실행/대표 URL을 확인하면 됩니다. 상세 설계와 긴 검증 이력은 아래 문서로 분리합니다.

| 문서 | 용도 |
| --- | --- |
| `README.md` | 빠른 설치, 실행, 대표 URL, 현재 지원 범위 |
| `docs/development-guide.md` | 긴 개발/운영 가이드, 전체 환경변수, 상세 URL/API, 라이선스 메모 |
| `docs/media-server-architecture.md` | 전체 구조, 동시성, source/egress/analysis 설계 |
| `docs/stream-verification.md` | 검증 기준, 통과/보류 항목, blocker와 테스트 이력 |

## 현재 지원 범위

안정 기준에 가까운 경로:

- `file -> RTSP`
- `file -> WebRTC(signaling/WHEP)`
- `RTSP pull -> RTSP`
- `RTSP pull -> WebRTC(signaling/WHEP)`
- `WebRTC publish(WHIP) -> RTSP/WebRTC` 1차 경로
- `va=1` 기반 YOLO/ONNX 객체 감지 overlay
- 정적 이미지 분석 API: metadata, snapshot JPEG, overlay JPEG

부분 지원/재확인 필요:

- `HTTP/HLS URI -> WebRTC`: 1차 동작 경로
- `HTTP/HLS URI -> RTSP`: 과거 통과 이력은 있으나 최신 blocker에서 `503` 재현, 재확인 필요
- YouTube source/import: 실험실 기능, 기본 운영 기능 아님
- 운영용 WebRTC auth/STUN/TURN/ICE policy: 미정리
- tracker 고도화(Kalman/ByteTrack): 보강 여부 검토 단계

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

macOS/Homebrew에서 수동 설치가 필요하면:

```bash
brew install cmake pkg-config ffmpeg node python yt-dlp deno \
  gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad \
  gst-rtsp-server libnice libnice-gstreamer onnxruntime
```

Linux 패키지 상세는 `docs/development-guide.md`의 개발 및 실행 환경 섹션을 봅니다.

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
- stable local stream 경로: file, local RTSP pull, local WebRTC publish
- 기본 YOLO/VA overlay 회귀

기본 제외:

- HTTP/HLS URI source의 RTSP 경로
- YouTube source/import
- 룰/이벤트/POST 장시간 검증
- adaptive tuner 장시간 검증
- 정적 이미지 분석 API

선택 검증:

```bash
./server.sh test --include-rules
./server.sh test --include-va-events
./server.sh test --include-image-analysis
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

## 다음 작업

현재 권장 순서:

1. 정적 이미지 분석 API를 `/lab` UI에 연결할지 결정
2. 이미지 업로드/임시파일 정책 설계
3. tracker 통계 기준으로 Kalman/ByteTrack 도입 여부 재판단
4. 외부 RTSP source별 timeout/profile 설정 확장
5. WebRTC 운영 설정(auth/STUN/TURN/ICE policy) 정리
6. HTTP/HLS URI source의 RTSP `503` blocker 재확인
