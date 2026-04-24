# Stream Verification

## 목적
- 현재 지원 중인 source/egress 조합을 반복 검증한다.
- 로컬 샘플 파일과 로컬 RTSP test source, 선택적 외부 RTSP URL을 함께 사용한다.

## 현재 기준 요약
- 최신 blocker 체크 기준으로 분석 1차 개발의 안정 기준은 `file`, 로컬 `RTSP pull`, 로컬 `WebRTC publish` 경로다.
- `HTTP/HLS URI -> WebRTC(signaling)`은 같은 체크에서 세션 생성이 성공했지만, `HTTP URI -> RTSP`는 `503 Service Unavailable`이 다시 관찰되어 재확인이 필요하다.
- 아래 문서에는 과거 통과 이력도 남아 있다. 과거 이력은 회귀 추적용이며, 현재 작업 우선순위는 최신 blocker 체크 결과를 기준으로 판단한다.
- 따라서 영상분석 1차 범위에는 `HTTP/HLS URI`를 넣지 않고, 분석 skeleton과 로컬 core 경로 검증 이후 main 후속 안정화에서 다시 확인한다.

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
- 기본 검증 UI는 `/webrtc/test`, 개발용 실험 UI는 `/lab`로 분리했다.
- 개발용 import UI는 `/lab/import`에서 별도로 제공한다.
- 서버를 `MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1`로 시작한 경우에만 `/lab`과 helper script에 YouTube 옵션을 노출한다.
- YouTube 관련 검증 이력은 이 문서 하단의 "실험실 기능 검증 이력"에 분리해 둔다.

## 기본 테스트 예시
- file -> RTSP
  - `rtsp://{media-server-host}:8554/dhseo?file=sample_h264.mp4`
- file -> WebRTC(simple signaling)
  - `POST http://{media-server-host}:8080/webrtc/session?file=sample_h264.mp4`
- file(video-only) -> RTSP
  - `rtsp://{media-server-host}:8554/dhseo?file=sample_h264_video_only.mp4`
- HTTP MP4 -> RTSP
  - `rtsp://{media-server-host}:8554/dhseo?source=http&url={urlencoded_http_media_url}`
  - 최신 blocker 체크에서는 `503 Service Unavailable`이 재현되어 현재 완료 항목이 아니라 재확인 항목으로 본다.
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
   - relay 경로는 유지하고 `SharedStream` analysis tap을 붙인 뒤 client ref-count와 analysis tap 수명 분리 검증
   - raw decode hub가 붙으면 drop/frame-sampling 정책 검증
5. 실험실 YouTube 회귀 검증
   - 기본 scope는 아니며, 명시적으로 opt-in 했을 때만 별도 확인
6. `/lab/import` 외부 네트워크 재검증
   - `2026-04-24` 공개 VOD `aqz-KE-bpKQ` 기준으로 성공/실패가 모두 재현됐다.
   - 현재는 성공 시 import 결과를 `ffmpeg`로 `h264 + aac stereo + mp4`로 정규화한 뒤 `file=` relay/analysis 경로에 바로 재사용하도록 수정했다.

## 영상분석 브랜치 착수 전 blocker 체크리스트
- 목적
  - 스트리밍 기반이 흔들리는 상태에서 분석 계층을 얹지 않도록, 분석 브랜치 분기 전에 최소 기준선을 확인한다.
- 통과 기준
  - 로컬 `file -> RTSP`, `file -> WebRTC(signaling)`이 계속 재생 가능해야 한다.
  - 로컬 `RTSP pull -> RTSP/WebRTC(signaling)`이 codec matrix 기준으로 재현 가능해야 한다.
  - 로컬 `WebRTC publish -> RTSP/WebRTC(signaling)`이 source 재사용과 함께 동작해야 한다.
  - 동일 source 다중 세션에서 `SharedStream` 재사용이 유지되어 upstream 연결이 중복 생성되지 않아야 한다.
  - `start/stop/restart/check/diagnose` 스크립트가 기본 동작을 깨지 않고 수행되어야 한다.
  - source descriptor/audio-video track discovery가 로컬 검증 범위에서 일관되어야 한다.
  - 서버 중지 후 listen port와 잔여 foreground process가 남지 않아야 한다.
- 이번 체크에서 우선 보는 범위
  - 외부 RTSP, 실험실 YouTube, 운영용 STUN/TURN/auth는 blocker가 아니라 후속 테스트로 남긴다.
- 권장 실행 순서
  1. `cmake --build build-gst`
  2. `./scripts/start_server.sh`
  3. `./scripts/check_server.sh`
  4. `./scripts/verify_codec_matrix.sh`
  5. `./scripts/diagnose_media_server.sh`
  6. `./scripts/stop_server.sh`
- 판단 규칙
  - 위 로컬 core 경로가 통과하면 분석 전용 브랜치로 분기해도 된다.
  - core 경로가 깨지면 분석 착수보다 스트리밍 안정화 수정을 먼저 한다.

## 분석 브랜치 진행 중 보류할 테스트와 복귀 계획
- 분석 브랜치(`Perception/RuleEngine/Overlay`) 작업 중에는 아래 항목을 main 기준 후속 테스트로 보류한다.
  - `HTTP/HLS URI -> RTSP` 최신 `503` 재확인 및 수정
  - 외부 RTSP source 재검증
  - WebRTC 운영 환경 테스트(auth/STUN/TURN/ICE)
  - audio-only input 정책 확정
  - 실험실 YouTube 회귀 검증
  - `/lab/import` 외부 네트워크 재검증
- 분석 기능 1차 구현과 로컬 회귀가 끝나면, 이 문서의 `남은 테스트 스텝` 순서로 다시 돌아와 보류 항목을 재개한다.
- 즉 현재 계획은 `로컬 core 경로 안정화 확인 -> 분석 브랜치 개발(file/RTSP/WebRTC만) -> main으로 복귀 후 HTTP/HLS와 운영 테스트 재개` 순서다.

## 영상분석 skeleton 검증 계획
- 1차 skeleton 검증
  - `cmake --build build-gst`로 analysis module이 기존 GStreamer build에 포함되는지 확인한다.
  - 기존 `file -> RTSP`, `file -> WebRTC(signaling)` smoke test가 그대로 동작해야 한다.
  - analysis tap이 붙어도 `SharedStream::RefCount()`는 relay client 수만 세야 한다.
  - 개발용 HTTP endpoint:
    - `POST /lab/analysis/taps?file=sample_h264.mp4&profileId=debug&fps=5`
    - `GET /lab/analysis/taps/{tapId}`
    - `DELETE /lab/analysis/taps/{tapId}`
  - dummy detector 단계에서는 `latestResult.detections=[]`가 정상이다. 이 단계의 목적은 source dedup, tap 수명, packet 관찰 여부 확인이다.
- 2차 decode hub 검증
  - H264/H265 compressed packet을 raw frame으로 변환하고, source/profile별 target fps만 detector로 넘긴다.
  - detector가 느릴 때 오래된 frame을 버리고 relay path 지연을 만들지 않는지 확인한다.
- 3차 YOLO/ONNX 검증
  - 작은 모델부터 붙여 CPU/Mac GPU 환경별 처리 지연과 frame drop 비율을 측정한다.
  - detection metadata, snapshot, overlay 중 어떤 출력이 안정적인지 분리 테스트한다.

## 2026-04-24 blocker 체크 결과
- 실행한 항목
  - `cmake --build build-gst`
  - `./scripts/start_server.sh`
  - `./scripts/check_server.sh`
  - `./scripts/verify_codec_matrix.sh`
  - `./scripts/diagnose_media_server.sh`
  - `./scripts/restart_server.sh`
  - `./scripts/stop_server.sh`
- 확인된 통과 범위
  - 빌드 성공
  - detached/foreground 여부와 별개로 로컬 `file -> RTSP` probe는 `h264`, `h265` 모두 성공
  - `verify_codec_matrix.sh` 기준 `file`, 로컬 `RTSP pull`, 로컬 `WebRTC publish` 경로는 통과
  - `verify_codec_matrix.sh` 요약: `pass=57 fail=6 skip=3`
- 이번 실행에서 드러난 이슈
  - 실패 6건은 모두 `source=http` RTSP route probe에서 발생했다.
    - 증상: `503 Service Unavailable`
    - 범위: `http_local_h264_aac`, `http_local_h264_video_only`
    - 참고: 같은 source의 WebRTC signaling session 생성은 성공했다.
  - `start/check/diagnose/stop` 스크립트는 Codex 실행환경의 socket policy 영향도 함께 받았다.
    - sandbox에서는 local bind/connect self-test가 `Operation not permitted`로 보일 수 있었다.
    - escalated detached start/restart는 실제로 `LISTEN`과 RTSP probe success가 나온 경우가 있었다.
    - 반대로 pid file만 남고 process/lsof 상태가 일치하지 않는 stale 상황도 한 번 관찰됐다.
- 현재 판단
  - `file`, `RTSP pull`, `WebRTC publish`를 대상으로 한 분석 1차 브랜치는 진행 가능하다.
  - 다만 `HTTP/HLS URI source`를 분석 1차 범위에 포함하면, 이번에 재현된 `source=http` RTSP 503을 먼저 정리해야 한다.
  - detached lifecycle 스크립트의 Codex 환경 특이점은 분석 blocker라기보다 main 후속 안정화 항목으로 둔다.

## 실험실 YouTube 개발 중단 사유
- 현재 `source=youtube` 경로는 코드 수준 1차 연결과 일부 재생 검증까지는 끝났지만, 기본 기능으로 승격할 정도의 안정성은 확보하지 못했다.
- 중단 사유는 서버 내부 codec/route 구조보다 외부 요인 비중이 크다.
  - `yt-dlp` 해석 성공 여부가 YouTube 측 bot check, 로그인 요구, 지역 제한, 일시적인 정책 변화에 영향을 받는다.
  - resolver가 반환하는 URL이 서명된 임시 URL이라 재현성과 회귀 테스트 안정성이 낮다.
  - 같은 URL도 시점에 따라 progressive HTTP, HLS fallback, 접근 거부가 섞일 수 있다.
- `2026-04-24` 실제 재검증에서는 공개 VOD `https://www.youtube.com/watch?v=aqz-KE-bpKQ`에 대해 서로 다른 결과가 나왔다.
  - shell 기반 `/lab/import` job과 `yt-dlp --skip-download -g` resolver 경로는 bot check 오류로 실패했다.
  - Chrome `/lab/import` UI에서 다시 만든 job은 `yt-dlp`가 `[jsc:deno]`로 challenge를 푼 뒤 `ready`까지 완료됐다.
- 따라서 현재는 기본 기능이 아니라 `/lab` 기반 실험실 기능으로만 유지하고, 회귀 검증도 opt-in 상황에서만 수행한다.

## 실험실 YouTube 현재 미확인 사항
- 동일 URL이 장기간 반복 테스트에서 계속 재생 가능한지
- YouTube 측 bot check가 발생한 이후 자동 복구가 가능한지
- 로그인 필요, 연령 제한, 지역 제한, 비공개/멤버십 영상에 대해 어떤 실패 패턴이 안정적으로 나오는지
- live 종료 직후 archive 전환 시 resolver와 delegate reconnect가 안정적으로 동작하는지
- cookie 없이 접근 가능한 공개 URL이 현재 시점에도 안정적으로 남아 있는지
- import 성공/실패가 시점에 따라 왜 갈리는지
- `/lab/import` UI와 실제 외부 네트워크 download workflow의 성공/실패 표기가 충분히 설명적인지

## 설정 파일
- `config/codec_test_sources.json`

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
- `scripts/verify_codec_matrix.sh`

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
  - 단, 최신 `2026-04-24 blocker 체크 결과`에서는 같은 계열 `HTTP URI -> RTSP`가 `503`으로 재현되었다. 이 항목은 과거 통과 이력으로 남기고 현재 상태는 재확인 필요로 본다.
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
http://{media-server-host}:8080/lab
http://{media-server-host}:8080/lab/import
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

## 과거 라운드 수정 사항
- live source(`RTSP`, 향후 `WebRTC`)는 마지막 subscriber가 빠지면 즉시 cleanup 하도록 변경했다.
- `SourceWorker` liveness를 체크해서 죽은 worker를 재사용하지 않도록 보강했다.
- 이 변경 후 `RTSP(h265+opus)`와 `RTSP(h264+pcmu)`의 연속 요청/transform route 재검증이 통과했다.
- `source=http` RTSP `503` 원인을 수정했다.
  - 세션 생성 시 source보다 subscriber를 먼저 등록해 초기 샘플 손실을 줄였다.
  - RTSP egress에 start 전 pending packet queue와 timestamp normalization을 추가했다.
  - H264 transcode route의 `1000h` timestamp offset을 `identity ts-offset=-3600000000000000`으로 보정했다.
  - pending queue가 video keyframe에서 audio priming packet까지 지우지 않도록 수정했다.
- 당시 전체 로컬 matrix는 `pass=63 fail=0 skip=3`로 통과했다.
- 이후 최신 blocker 체크에서는 `source=http` RTSP route에서 `503`이 다시 관찰되었으므로, 이 과거 결과를 현재 완료 상태로 간주하지 않는다.

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
- `/lab/import` 1차 smoke test를 추가했다.
  - fake downloader가 `sample_h264.mp4`를 복사하도록 한 상태에서 job이 `ready`로 완료됐다.
  - 결과 파일 token은 `imports/lab_test.mp4`로 기록됐고, import manager/job API가 기본 동작함을 확인했다.
- `2026-04-24` 실제 외부 네트워크 재검증을 추가했다.
  - shell에서 만든 `import-1`은 `failed`로 종료됐고, 로그에는 `Sign in to confirm you're not a bot`가 기록됐다.
  - 같은 URL에 대해 `yt-dlp --skip-download -g` resolver 경로도 동일한 bot check 오류로 실패했다.
  - 하지만 Chrome `/lab/import`에서 다시 만든 `import-2`는 `ready`로 완료됐고 `storedFileToken=imports/ui_yt_import_test.mp4`가 생성됐다.
  - `import-2` 로그에는 `[jsc:deno] Solving JS challenges using deno`가 포함됐다.
  - 초기 결과 파일은 `av1 + aac(6ch)`로 저장되어, `POST /webrtc/session?file=imports/ui_yt_import_test.mp4`가 `stream descriptor not available or not yet supported`로 실패했다.
  - 이후 `/lab/import`에 `yt-dlp` format selector 적용과 `ffmpeg` 기반 `h264 + aac stereo + mp4` 정규화 단계를 추가했다.
  - 새 코드로 다시 만든 `import-1`은 `storedFileToken=imports/normalized_import_test.mp4`로 `ready`까지 완료됐고, `ffprobe` 기준 `h264 1280x720 + aac 48000Hz stereo`로 확인됐다.
  - 같은 파일에 대해 `POST /webrtc/session?file=imports/normalized_import_test.mp4`가 `200 OK`로 통과해, import 결과를 기존 `file=` relay 경로에 바로 재사용할 수 있음을 확인했다.
- 외부 수동 검증 URL 출력 스크립트를 추가했다.
  - `scripts/print_external_test_urls.sh`
  - LAN IP, RTSP route URL, WebRTC test page/manual case를 한 번에 출력한다.
- `2026-04-24` 영상분석 skeleton local smoke test를 추가했다.
  - 임시 포트 `RTSP 8555`, `HTTP 8081`에서 foreground 서버를 실행했다.
  - `POST /lab/analysis/taps?file=sample_h264.mp4&profileId=debug&fps=5`가 `analysis-tap-1`을 반환했다.
  - `GET /lab/analysis/taps/analysis-tap-1`에서 `receivedVideoPackets > 0`, `analyzedPackets > 0`, `droppedPackets=0`, `hasResult=true`를 확인했다.
  - dummy detector 단계라 `latestResult.detections=[]`는 정상이다.
  - `DELETE /lab/analysis/taps/analysis-tap-1` 후 `GET /lab/analysis/taps`가 `activeTaps=0`을 반환했다.

## 남은 확인 항목
- 다음 구현 순서
  - 1차: raw decode hub 추가
  - 2차: frame sampling/drop-oldest queue 추가
  - 3차: YOLO/ONNX Runtime detector 연동
  - 4차: 분석 metadata/snapshot API 또는 overlay stream 설계
- `HTTP/HLS URI -> RTSP` 최신 `503` 재확인 및 수정
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
