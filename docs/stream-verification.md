# Stream Verification

## 목적
- 현재 지원 중인 source/egress 조합을 반복 검증한다.
- 로컬 샘플 파일과 로컬 RTSP test source, 선택적 외부 RTSP URL을 함께 사용한다.

## 지원 대상
- `file -> RTSP`
- `file -> WebRTC(signaling)`
- `RTSP -> RTSP`
- `RTSP -> WebRTC(signaling)`
- `WebRTC publish(local WHIP test publisher) -> RTSP`
- `WebRTC publish(local WHIP test publisher) -> WebRTC(signaling)`
- `WebRTC publish(browser publisher) -> WebRTC(WHEP)`

현재 추가로 확인된 범위:
- `WebRTC publish(local WHIP test publisher) -> RTSP` route subset 자동 검증 통과
- `WebRTC publish(local WHIP test publisher) -> WebRTC(signaling)` 자동 검증 통과
- browser publisher / 실제 media playback 기준 `WebRTC publish -> WebRTC(simple signaling) consume` 검증 통과
- browser publisher / 실제 media playback 기준 `WebRTC publish -> WebRTC(WHEP) consume` 검증 통과

`WebRTC source`는 WHIP publish 기반 1차 ingest를 사용한다. 운영용 auth/STUN/TURN/ICE policy는 아직 별도 정리가 필요하다.

## 설정 파일
- `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/config/codec_test_sources.json`

기본 구성:
- 로컬 file source
  - `sample_h264.mp4`
  - `sample_h265.mp4`
- 로컬 RTSP source
  - `h265 + opus`
  - `h264 + pcmu`
  - `h264 + pcma`
- 로컬 WebRTC publish source
  - `webrtc_local_publish_h264_opus`
- 선택적 외부 RTSP source
  - wowza demo (`h264 + aac` 예상)

각 source는 선택적으로 `verify_profile`을 가질 수 있다.
- `label`
  - 사람이 보기 위한 profile 이름
- `rtsp_preflight_timeout_ms`
  - 해당 source의 RTSP host:port reachability 검사 timeout
- `ffprobe_timeout_us`
  - RTSP route 검증 시 `ffprobe` timeout
- `webrtc_http_timeout_s`
  - WebRTC signaling session 생성 요청 timeout
- `server_env_hint`
  - 외부 source가 느릴 때 권장하는 서버 실행 env 예시
- `run_webrtc_first`
  - 해당 source는 WebRTC signaling 검증을 RTSP보다 먼저 수행한다.
- `rtsp_route_keys`
  - 해당 source에서 실제로 검증할 RTSP route subset
  - 지원 키: `default`, `h264`, `h265`, `opus`, `h265_opus`, `pcmu`, `h265_pcmu`, `pcma`, `h265_pcma`

## 검증 스크립트
- `/Users/dhseo/Desktop/workspace/codexTest/mediaServer/scripts/verify_codec_matrix.sh`

기본 동작:
- 현재 실행 중인 media server의 RTSP/HTTP 포트를 읽는다.
- 필요한 로컬 RTSP source를 자동으로 띄운다.
- source별 `verify_profile`이 있으면 preflight/ffprobe/WebRTC timeout에 반영한다.
- RTSP route별 `ffprobe`로 실제 codec을 확인한다.
- WebRTC는 simple signaling 세션 생성 여부를 확인한다.

현재까지 관찰된 상태:
- local `file` source는 전체 RTSP route와 WebRTC signaling 검증이 통과했다.
- local `RTSP(h265+opus)` source는 전체 RTSP route와 WebRTC signaling 검증이 통과했다.
- local `RTSP(h264+pcmu)` source는 전체 RTSP route와 WebRTC signaling 검증이 통과했다.
- local `RTSP(h264+pcma)` source는 전체 RTSP route와 WebRTC signaling 검증이 통과했다.
- local `WebRTC publish(sourceId=publisher-verify)` source는 route subset(`default`, `h264`, `h265`, `opus`)과 WebRTC signaling 검증이 통과했다.
- 외부 wowza source는 기본 설정에서 `RTSP preflight failed for wowzaec2demo.streamlock.net:554 within 1500ms (connection timed out)`로 실패했다.
- 같은 wowza source를 `MEDIA_SERVER_RTSP_SOURCE_PREFLIGHT_TIMEOUT_MS=0`으로 다시 확인하면 `timed out waiting for RTSP source samples`로 실패했다.
- local `WHIP publish(sourceId=publisher-demo2) -> RTSP`는 `h264 + aac`로 확인됐다.
- browser `WHIP publish -> WHEP consume`은 audio/video track 연결과 decoded video frame을 확인했다.
- browser `WHIP publish -> simple signaling consume`은 audio/video track 연결과 decoded video frame을 확인했다.

## 외부 RTSP source 진단용 환경변수
- `MEDIA_SERVER_RTSP_SOURCE_PREFLIGHT_TIMEOUT_MS`
  - 기본값: `1500`
  - RTSP source 시작 전에 `host:port` TCP reachability를 확인한다.
  - `0`이면 preflight를 끈다.
- `MEDIA_SERVER_RTSP_SOURCE_START_TIMEOUT_MS`
  - 기본값: `3000`
  - 첫 RTSP sample을 기다리는 시간이다.
- `MEDIA_SERVER_RTSP_TRACK_SETTLE_QUIET_PERIOD_MS`
  - 기본값: `1500`
  - 첫 sample 이후 추가 track discovery를 기다리는 quiet period다.
- `MEDIA_SERVER_RTSP_TRACK_SETTLE_MAX_MS`
  - 기본값: `4000`
  - track settle 전체 상한이다.

외부 RTSP source를 느슨하게 보려면 예를 들어:
```bash
MEDIA_SERVER_RTSP_SOURCE_PREFLIGHT_TIMEOUT_MS=5000 \
MEDIA_SERVER_RTSP_SOURCE_START_TIMEOUT_MS=12000 \
MEDIA_SERVER_RTSP_TRACK_SETTLE_QUIET_PERIOD_MS=2500 \
MEDIA_SERVER_RTSP_TRACK_SETTLE_MAX_MS=12000 \
./scripts/run_server_foreground.sh
```

## 실행 예시
```bash
./scripts/verify_codec_matrix.sh
```

외부 RTSP URL도 포함하려면:
```bash
MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=1 ./scripts/verify_codec_matrix.sh
```

외부 RTSP reachability만 빠르게 진단하려면:
```bash
MEDIA_SERVER_DIAG_INCLUDE_EXTERNAL=1 ./scripts/diagnose_media_server.sh
```

특정 외부 RTSP URL을 직접 진단하려면:
```bash
MEDIA_SERVER_DIAG_RTSP_URL='rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov' \
./scripts/diagnose_media_server.sh
```

로컬 WebRTC publish smoke test:
```bash
source ./scripts/env_common.sh
media_server_apply_homebrew_gst_env
python3 -u ./scripts/whip_publish_test.py --http-base http://127.0.0.1:8081 --source-id publisher-demo --duration 0
```

RTSP만 확인하려면:
```bash
MEDIA_SERVER_VERIFY_SKIP_WEBRTC=1 ./scripts/verify_codec_matrix.sh
```

WebRTC signaling만 확인하려면:
```bash
MEDIA_SERVER_VERIFY_SKIP_RTSP=1 ./scripts/verify_codec_matrix.sh
```

특정 source만 빠르게 보려면:
```bash
MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus ./scripts/verify_codec_matrix.sh
```

## 현재 RTSP route 기대 출력
- `/dhseo` -> `h264 + aac`
- `/dhseo/h264` -> `h264 + aac`
- `/dhseo/h265` -> `h265 + aac`
- `/dhseo/opus` -> `h264 + opus`
- `/dhseo/h265/opus` -> `h265 + opus`
- `/dhseo/pcmu` -> `h264 + pcmu`
- `/dhseo/h265/pcmu` -> `h265 + pcmu`
- `/dhseo/pcma` -> `h264 + pcma`
- `/dhseo/h265/pcma` -> `h265 + pcma`

`ffprobe` 기준 codec 이름은 아래처럼 보인다.
- `h265` -> `hevc`
- `pcmu` -> `pcm_mulaw`
- `pcma` -> `pcm_alaw`

## 현재까지 실제 통과된 스펙
- `file(sample_h264.mp4) -> RTSP`
  - `/dhseo`
  - `/dhseo/h264`
  - `/dhseo/h265`
  - `/dhseo/opus`
  - `/dhseo/h265/opus`
  - `/dhseo/pcmu`
  - `/dhseo/h265/pcmu`
  - `/dhseo/pcma`
  - `/dhseo/h265/pcma`
- `file(sample_h264.mp4) -> WebRTC(signaling)`
- `file(sample_h265.mp4) -> RTSP`
  - `/dhseo`
  - `/dhseo/h264`
  - `/dhseo/h265`
  - `/dhseo/opus`
  - `/dhseo/h265/opus`
  - `/dhseo/pcmu`
  - `/dhseo/h265/pcmu`
  - `/dhseo/pcma`
  - `/dhseo/h265/pcma`
- `file(sample_h265.mp4) -> WebRTC(signaling)`
- `RTSP(h265+opus local test source) -> RTSP`
  - `/dhseo`
  - `/dhseo/h264`
  - `/dhseo/h265`
  - `/dhseo/opus`
  - `/dhseo/h265/opus`
  - `/dhseo/pcmu`
  - `/dhseo/h265/pcmu`
  - `/dhseo/pcma`
  - `/dhseo/h265/pcma`
- `RTSP(h265+opus local test source) -> WebRTC(signaling)`
- `RTSP(h264+pcmu local test source) -> RTSP`
  - `/dhseo`
  - `/dhseo/h264`
  - `/dhseo/h265`
  - `/dhseo/opus`
  - `/dhseo/h265/opus`
  - `/dhseo/pcmu`
  - `/dhseo/h265/pcmu`
  - `/dhseo/pcma`
  - `/dhseo/h265/pcma`
- `RTSP(h264+pcmu local test source) -> WebRTC(signaling)`
- `RTSP(h264+pcma local test source) -> RTSP`
  - `/dhseo`
  - `/dhseo/h264`
  - `/dhseo/h265`
  - `/dhseo/opus`
  - `/dhseo/h265/opus`
  - `/dhseo/pcmu`
  - `/dhseo/h265/pcmu`
  - `/dhseo/pcma`
  - `/dhseo/h265/pcma`
- `RTSP(h264+pcma local test source) -> WebRTC(signaling)`
- `WebRTC publish(local WHIP test publisher: webrtc_local_publish_h264_opus) -> RTSP`
  - `/dhseo`
  - `/dhseo/h264`
  - `/dhseo/h265`
  - `/dhseo/opus`
- `WebRTC publish(local WHIP test publisher: webrtc_local_publish_h264_opus) -> WebRTC(signaling)`
- `WebRTC publish(local WHIP test publisher: whip-probe4) -> WebRTC(simple signaling)`
  - browser consumer 기준 `consumerVideoWidth=640`, `consumerVideoHeight=360`
  - `inboundVideoBytes > 0`, `inboundVideoFramesDecoded > 0`
- `WebRTC publish(browser publisher) -> WebRTC(simple signaling)`
  - browser publisher session id: `whip-publish-3`
  - browser consumer session id: `webrtc-http-4`
  - `consumerVideoWidth=640`, `consumerVideoHeight=480`
  - `inboundVideoBytes > 0`, `inboundVideoFramesDecoded > 0`

## 이번 라운드 핵심 확인
- `WebRTC egress`의 H264 video branch에 대해 pad/RTP trace를 추가한 뒤 재검증했다.
- local WHIP source와 browser publisher source 모두에서 아래 흐름이 확인됐다.
  - `video_pay:sink` 버퍼 유입
  - `video_pay:src` RTP payload 생성
  - `video_rtp`에서 실제 video RTP 출력
- browser consumer 기준으로 `decoded video frame`이 확인돼, 이전의 `audio만 재생되고 video는 0 bytes` 상태는 해소됐다.

## 이번 라운드 수정 사항
- live source(`RTSP`, 향후 `WebRTC`)는 마지막 subscriber가 빠지면 즉시 cleanup 하도록 변경했다.
- `SourceWorker` liveness를 체크해서 죽은 worker를 재사용하지 않도록 보강했다.
- 이 변경 후 `RTSP(h265+opus)`와 `RTSP(h264+pcmu)`의 연속 요청/transform route 재검증이 통과했다.

## 남은 확인 항목
- 외부 wowza source 재검증
- 외부 RTSP source timeout 원인 분리
  - 실제 remote server 응답 지연인지
  - 현재 네트워크 환경 제약인지
  - RTSP source timeout 설정이 너무 짧은지

현재 wowza에 대해서는 아래처럼 해석한다.
- `RTSP preflight failed ...`이면 네트워크 또는 remote port reachability 문제 쪽이 먼저다.
- `timed out waiting for RTSP source samples`이면 TCP 연결 이후 RTSP setup/SDP/sample 수신이 지연되거나 upstream 응답이 늦은 쪽이다.

실제 관찰 결과는 다음과 같다.
- 기본값(`MEDIA_SERVER_RTSP_SOURCE_PREFLIGHT_TIMEOUT_MS=1500`)에서는 `wowzaec2demo.streamlock.net:554`에 대해 `connection timed out`가 먼저 난다.
- preflight를 끄고 `MEDIA_SERVER_RTSP_SOURCE_START_TIMEOUT_MS=8000`으로 늘리면, 연결 이후 단계에서 여전히 sample이 들어오지 않아 `timed out waiting for RTSP source samples`가 난다.
- 따라서 현재 wowza 실패는 `source codec` 문제가 아니라, 현재 환경 기준 외부 RTSP reachability 또는 upstream 응답 지연 쪽으로 보는 것이 맞다.

## 예시 주소
- file -> RTSP
  - `rtsp://127.0.0.1:8555/dhseo?file=sample_h264.mp4`
- file -> WebRTC
  - `POST http://127.0.0.1:8081/webrtc/session?file=sample_h264.mp4`
- RTSP -> RTSP
  - `rtsp://127.0.0.1:8555/dhseo?url=rtsp%3A%2F%2Fwowzaec2demo.streamlock.net%2Fvod%2Fmp4%3ABigBuckBunny_115k.mov`
- RTSP -> WebRTC
  - `POST http://127.0.0.1:8081/webrtc/session?url=rtsp%3A%2F%2Fwowzaec2demo.streamlock.net%2Fvod%2Fmp4%3ABigBuckBunny_115k.mov`
