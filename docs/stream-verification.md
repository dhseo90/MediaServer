# Stream Verification

## 목적
- 현재 지원 중인 source/egress 조합을 반복 검증한다.
- 로컬 샘플 파일과 로컬 RTSP test source, 선택적 외부 RTSP URL을 함께 사용한다.

## 지원 대상
- `file -> RTSP`
- `file -> WebRTC(signaling)`
- `RTSP -> RTSP`
- `RTSP -> WebRTC(signaling)`
- `HTTP/HLS URI -> RTSP`
- `HTTP/HLS URI -> WebRTC(signaling)`
- `WebRTC publish(local WHIP test publisher) -> RTSP`
- `WebRTC publish(local WHIP test publisher) -> WebRTC(signaling)`
- `WebRTC publish(browser publisher) -> WebRTC(WHEP)`

현재 추가로 확인된 범위:
- `WebRTC publish(local WHIP test publisher) -> RTSP` route subset 자동 검증 통과
- `WebRTC publish(local WHIP test publisher) -> WebRTC(signaling)` 자동 검증 통과
- browser publisher / 실제 media playback 기준 `WebRTC publish -> WebRTC(simple signaling) consume` 검증 통과
- browser publisher / 실제 media playback 기준 `WebRTC publish -> WebRTC(WHEP) consume` 검증 통과

`WebRTC source`는 WHIP publish 기반 1차 ingest를 사용한다. 운영용 auth/STUN/TURN/ICE policy는 아직 별도 정리가 필요하다.

실험실 기능 정책:
- `source=youtube`는 코드에 남아 있지만 기본 test scope에는 포함하지 않는다.
- 서버를 `MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1`로 시작한 경우에만 test page/helper script에 노출한다.
- YouTube 관련 검증 이력은 이 문서 하단의 "실험실 기능 검증 이력"에 분리해 둔다.

## 완료된 기본 테스트 예시
- file -> RTSP
  - `rtsp://{media-server-host}:8554/dhseo?file=sample_h264.mp4`
- file -> WebRTC(simple signaling)
  - `POST http://{media-server-host}:8080/webrtc/session?file=sample_h264.mp4`
- file(video-only) -> RTSP
  - `rtsp://{media-server-host}:8554/dhseo?file=sample_h264_video_only.mp4`
- HTTP MP4 -> RTSP
  - `rtsp://{media-server-host}:8554/dhseo?source=http&url={urlencoded_http_media_url}`
- HTTP MP4 -> WebRTC(simple signaling)
  - `POST http://{media-server-host}:8080/webrtc/session?source=http&url={urlencoded_http_media_url}`
- RTSP pull -> RTSP
  - `rtsp://{media-server-host}:8554/dhseo?url={urlencoded_rtsp_source}`
- RTSP pull -> WebRTC(simple signaling)
  - `POST http://{media-server-host}:8080/webrtc/session?url={urlencoded_rtsp_source}`
- WebRTC publish -> RTSP
  - publish 후 `rtsp://{media-server-host}:8554/dhseo?source=webrtc&url={source_id}`
- WebRTC publish -> WebRTC(simple / WHEP)
  - `POST http://{media-server-host}:8080/webrtc/session?source=webrtc&url={source_id}`
  - `POST http://{media-server-host}:8080/whep?source=webrtc&url={source_id}`

## 남은 테스트 스텝
1. 외부 RTSP source 재검증
   - wowza 같은 외부 upstream이 현재 환경에서 timeout인지, remote 응답 지연인지 분리 확인
2. WebRTC 운영 환경 테스트
   - auth, STUN/TURN, ICE policy를 붙인 상태에서 브라우저 간 consume/publish 재검증
3. audio-only input 정책 확정
   - 현재는 video relay/analysis 기준으로 설계되어 있어 audio-only는 정식 지원 범위 밖
4. 영상분석 branch 테스트 추가
   - relay 경로는 유지하고 `SharedStream` analysis tap을 붙인 뒤 drop/frame-sampling 정책 검증
5. 실험실 YouTube 회귀 검증
   - 기본 scope는 아니며, 명시적으로 opt-in 했을 때만 별도 확인

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
- 로컬 HTTP media source
  - `http_local_h264_aac`
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
- `skip_rtsp` / `skip_webrtc`
  - source별로 아직 안정화되지 않은 egress 검증을 명시적으로 건너뛴다.
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
- local `HTTP MP4(sample_h264.mp4)` source는 `source=http` URI source 경로 검증 대상으로 추가했다.
  - RTSP route subset(`default`, `h264`, `opus`) 검증이 통과했다.
  - WebRTC signaling 검증이 통과했다.
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

같은 LAN의 다른 PC에서 수동으로 확인할 URL을 출력하려면:
```bash
./scripts/print_external_test_urls.sh
```

출력 결과에는 현재 LAN IP가 포함될 수 있으므로, 결과물을 그대로 커밋하거나 문서에 붙이지 않는다.

외부 수동 검증 전에는 서버를 전체 인터페이스에 bind한다.
```bash
MEDIA_SERVER_LISTEN_ADDRESS=0.0.0.0 \
MEDIA_SERVER_HTTP_LISTEN_ADDRESS=0.0.0.0 \
MEDIA_SERVER_FORCE_RTSP_TCP=1 \
./scripts/restart_server.sh
```

다른 PC에서 먼저 확인할 URL:
```text
http://{media-server-host}:8080/health
http://{media-server-host}:8080/webrtc/test
```

`/health`는 `{"status":"ok"}`를 반환하는 readiness check다.
위 두 URL이 열리지 않으면 player 문제가 아니라 macOS 방화벽, bind address, 공유기 WiFi/LAN isolation 문제를 먼저 확인한다.

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
- `HTTP MP4(sample_h264.mp4) -> RTSP`
  - `/dhseo`
  - `/dhseo/h264`
  - `/dhseo/opus`
- `HTTP MP4(sample_h264.mp4) -> WebRTC(signaling)`
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
- `source=http` RTSP `503` 원인을 수정했다.
  - 세션 생성 시 source보다 subscriber를 먼저 등록해 초기 샘플 손실을 줄였다.
  - RTSP egress에 start 전 pending packet queue와 timestamp normalization을 추가했다.
  - H264 transcode route의 `1000h` timestamp offset을 `identity ts-offset=-3600000000000000`으로 보정했다.
  - pending queue가 video keyframe에서 audio priming packet까지 지우지 않도록 수정했다.
- 전체 로컬 matrix는 `pass=63 fail=0 skip=3`로 통과했다.

## 실험실 기능 검증 이력

- 실험실 기능인 `source=youtube` 1차 resolver 경로를 추가했다.
  - `yt-dlp`로 YouTube watch/live URL을 HTTP/HLS playable URL로 해석한다.
  - 해석 결과는 기존 `UriSourceWorker`에 위임한다.
  - fake `yt-dlp`가 로컬 HTTP MP4 URL을 반환하는 조건에서 `source=youtube -> RTSP` 경로가 `h264 + aac`로 통과했다.
  - 실제 YouTube uploaded/VOD URL `https://www.youtube.com/watch?v=aqz-KE-bpKQ` 기준 `RTSP`, `WebRTC(simple signaling)`, `WebRTC(WHEP)`가 통과했다.
  - 실제 YouTube live URL `https://www.youtube.com/watch?v=iYmvCUonukw` 기준 `RTSP`, `WebRTC(simple signaling)`, `WebRTC(WHEP)`가 통과했다.
  - YouTube 기본 format selector는 업로드/VOD에서 720p 이하 progressive HTTP muxed URL을 우선 선택하고, live/HTTP 불가 시 HLS로 fallback한다.
  - progressive HTTP YouTube URL은 `source=http` URI worker에 위임되므로 EOF 시 처음으로 seek해서 짧은 영상 반복/late joiner 테스트가 HLS보다 안정적이다.
  - 고화질/고디테일 YouTube 영상에서 2Mbps ultrafast H264 재인코딩 artifact가 보여, URI/WebRTC H264 기본 bitrate를 6000kbps로 올리고 encoder preset/해상도/fps를 env로 조정 가능하게 했다.
  - URI source track settle 기본값은 RTSP와 분리해 `quiet=800ms`, `max=2500ms`로 낮췄다. YouTube/HLS 초기 재생 지연을 줄이기 위한 값이며, audio/video track 누락이 보이면 env로 늘린다.
  - 브라우저 자동 검증 스크립트는 `--post-playback-hold-ms` 옵션으로 첫 재생 확인 후 추가 대기한 뒤 stats를 다시 수집할 수 있다. audio RTP처럼 첫 video frame보다 늦게 잡히는 지표 확인에 사용한다.
- 실험실 `source=youtube` 동일 URL 동시 요청 dedup을 확인했다.
  - `POST /webrtc/session?source=youtube&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Daqz-KE-bpKQ` 5개 동시 요청이 모두 성공했다.
  - 서버 trace 기준 `youtube resolve=1회`, `source worker start=1회`, `stream created=yes=1회`, `created=no=4회`로 확인했다.
  - `SessionManager` trace는 실제 `SharedStream::StartSource()` 결과 기준으로 `started/reused`를 기록하도록 정리했다.
- 실험실 `source=youtube` delegate 재연결 구조를 추가했다.
  - initial resolve/start 이후 `UriSourceWorker`가 중단되면 원본 YouTube URL을 다시 resolve해서 새 delegate를 시작한다.
  - 정상 동시 요청 테스트에서는 `reconnect=0회`로 유지되어 불필요한 재해석은 발생하지 않았다.
  - fake resolver + 2초짜리 로컬 HLS/EOS source로 강제 재연결을 유발했고, `delegate stopped -> resolved -> reconnected` 반복을 확인했다.
- 실험실 `source=youtube` resolver 실패 케이스 1차 분리를 추가했다.
  - invalid host, missing resolver binary, private video, live archive unavailable, resolver timeout, separate media URL output을 명확한 400 응답 메시지로 구분했다.
  - 300ms 같은 과도하게 짧은 timeout은 fork/exec 비용까지 timeout으로 잡을 수 있으므로 운영 기본값은 15000ms 이상을 유지한다.
- video-only URI source edge case를 분리했다.
  - `sample_h264_video_only.mp4`를 추가하고 `source=http` matrix에 포함했다.
  - RTSP egress는 route audio branch 계약을 유지하기 위해 source audio가 없으면 silent audio priming을 합성한다.
  - WebRTC egress는 video-only track으로 simple signaling/playback이 통과했다.
- 브라우저 playback smoke test를 추가 확인했다.
  - `file -> WebRTC(simple/WHEP)`: audio/video track 및 decoded video frame 확인
  - `HTTP video-only -> WebRTC(simple)`: video-only track 및 decoded video frame 확인
  - `YouTube uploaded/VOD -> WebRTC(simple/WHEP)`: audio/video track 및 decoded video frame 확인
  - `WebRTC browser publish -> WebRTC(simple/WHEP)`: publisher/consumer 연결 및 decoded video frame 확인
- 외부 수동 검증 URL 출력 스크립트를 추가했다.
  - `scripts/print_external_test_urls.sh`
  - LAN IP, RTSP route URL, WebRTC test page/manual case를 한 번에 출력한다.

## 남은 확인 항목
- 다음 구현 순서
  - 1차: 영상분석 branch 검증 추가
  - 2차: 분석 metadata/snapshot API 설계
- audio-only input은 현재 video relay/analysis 준비 범위 밖이다. RTSP/WebRTC egress는 video track을 기준으로 동작한다.
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
  - `rtsp://{media-server-host}:8554/dhseo?file=sample_h264.mp4`
- file -> WebRTC
  - `POST http://{media-server-host}:8080/webrtc/session?file=sample_h264.mp4`
- RTSP -> RTSP
  - `rtsp://{media-server-host}:8554/dhseo?url=rtsp%3A%2F%2Fwowzaec2demo.streamlock.net%2Fvod%2Fmp4%3ABigBuckBunny_115k.mov`
- RTSP -> WebRTC
  - `POST http://{media-server-host}:8080/webrtc/session?url=rtsp%3A%2F%2Fwowzaec2demo.streamlock.net%2Fvod%2Fmp4%3ABigBuckBunny_115k.mov`
- HTTP MP4 -> RTSP
  - `rtsp://{media-server-host}:8554/dhseo?source=http&url={urlencoded_http_media_url}`
- HTTP MP4 -> WebRTC
  - `POST http://{media-server-host}:8080/webrtc/session?source=http&url={urlencoded_http_media_url}`
