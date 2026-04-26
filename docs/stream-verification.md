# Stream Verification

## 목적
- 현재 지원 중인 source/egress 조합을 반복 검증한다.
- 로컬 샘플 파일, 로컬 RTSP test source, LAN IP 외부 클라이언트 접근성, 제3자 RTSP upstream advisory를 함께 사용한다.

## 현재 기준 요약
- 최신 기준으로 기본 안정 기준은 `file`, 로컬 `RTSP pull`, 로컬 `WebRTC publish`, 로컬 `HTTP URI`, LAN IP 기준 외부 클라이언트 접근성, 제3자 RTSP upstream advisory, 기본 YOLO/VA overlay다.
- 과거 blocker였던 `HTTP URI -> RTSP 503`은 URI/VOD source pacing 보정 후 로컬 HTTP MP4 matrix에서 통과했다.
- 아래 문서에는 과거 통과/실패 이력도 남아 있다. 과거 이력은 회귀 추적용이며, 현재 작업 우선순위는 최신 검증 결과를 기준으로 판단한다.
- 로컬 HLS VOD는 codec matrix 선택 검증에서 통과했다. 외부 HLS/HTTP URI는 네트워크/upstream 상태 영향이 있으므로 기본 안정 테스트가 아닌 선택 검증으로 남긴다.

최신 후속 검증 결과:
- `2026-04-26`: `./server.sh test --no-start` stable 기준 통과 `15/0/5`.
- `2026-04-26`: `--include-rules --include-va-events` 선택 검증 통과 `6/0/6`.
- `2026-04-26`: `./server.sh verify-route-profiles` RTSP/WebRTC overlay route profile matching 통과 `6/0/0`.
- `2026-04-26`: `./server.sh verify-tracker-stability --long` 120초 x 3회 반복 통과, `fragmentationRatio avg=1.7`, `stalePtsRatio max=0.0`.

## 지원 대상
- `file -> RTSP`
- `file -> WebRTC(signaling)`
- `RTSP -> RTSP`
- `RTSP -> WebRTC(signaling)`
- `HTTP URI(local MP4) -> RTSP`
- `HTTP URI(local MP4) -> WebRTC(signaling)`
- `HLS/외부 HTTP URI -> RTSP/WebRTC` (선택 검증)
- `WebRTC publish(local WHIP test publisher) -> RTSP`
- `WebRTC publish(local WHIP test publisher) -> WebRTC(signaling)`
- `WebRTC publish(browser publisher) -> WebRTC(WHEP)`

현재 추가로 확인된 범위:
- `WebRTC publish(local WHIP test publisher) -> RTSP` route subset 자동 검증 통과
- `WebRTC publish(local WHIP test publisher) -> WebRTC(signaling)` 자동 검증 통과
- browser publisher / 실제 media playback 기준 `WebRTC publish -> WebRTC(simple signaling) consume` 검증 통과
- browser publisher / 실제 media playback 기준 `WebRTC publish -> WebRTC(WHEP) consume` 검증 통과

`WebRTC source`는 WHIP publish 기반 1차 ingest를 사용한다. STUN/TURN 서버는 env로 설정할 수 있고, 운영용 auth/강제 ICE policy는 아직 별도 설계가 필요하다.

실험실 기능 정책:
- `source=youtube`는 코드에 남아 있지만 기본 test scope에는 포함하지 않는다.
- `/lab`를 통합 진입점으로 두고 안정 테스트, VA 분석, 룰 편집, 실험실 가져오기 기능을 같은 화면으로 접는 구조로 정리했다.
- `/lab`는 light/dark theme toggle, 반응형 card layout을 제공하며 룰 편집기와 가져오기 도구는 iframe 대신 Shadow DOM 컴포넌트로 로드한다.
- `/webrtc/test`, `/lab/rules`, `/lab/import`는 자동화와 기존 bookmark 호환 route로 유지하지만, 일반 수동 테스트 진입점은 `/lab` 하나로 둔다.
- YouTube 직접 표출(`source=youtube`)은 `MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE=1`일 때만 `/lab`과 helper script에 노출한다.
- YouTube 파일 다운로드(`/lab/import`)는 개발용 샘플 생성 도구로 기본 표시하며 `MEDIA_SERVER_ENABLE_LAB_YOUTUBE_IMPORT=0`으로 끌 수 있다.
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
  - 로컬 HTTP MP4 matrix에서 default/h264/opus route 통과.
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

## 선택/보류 테스트 범위
1. 외부 RTSP source 심화 재검증
   - `./server.sh test` 기본 기준에는 LAN IP 외부 클라이언트 접근성을 hard gate로 포함한다.
   - 제3자 RTSP upstream 후보는 remote 응답 지연과 upstream 상태 영향이 커서 기본 stable에서는 advisory로 본다.
   - 신뢰 가능한 카메라/테스트 RTSP URL을 `MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS`로 지정하면 hard gate로 검증한다.
2. WebRTC 운영 환경 테스트
   - STUN/TURN env 적용 상태에서 로컬 WebRTC egress/WHIP ingest signaling 재검증은 통과했다.
   - 실제 외부 TURN relay, auth, 강제 ICE policy는 별도 설계 후 검증한다.
3. audio-only input 정책 확정
   - 현재는 video relay/analysis 기준으로 설계되어 있어 audio-only는 정식 지원 범위 밖
4. 영상분석 선택 테스트
   - 1차 analysis tap, raw decode hub, drop/frame-sampling, YOLO/ONNX, RTSP/WebRTC overlay는 로컬 smoke test 완료
   - adaptive tuner 1차 smoke test는 완료했으며, rule event engine은 presence/enter/exit/line-crossing 1차 구현 후 build 검증 완료
5. 실험실 YouTube 회귀 검증
   - 기본 scope는 아니며, 명시적으로 opt-in 했을 때만 별도 확인
6. `/lab/import` 외부 네트워크 재검증
   - `2026-04-24` 공개 VOD `aqz-KE-bpKQ` 기준으로 성공/실패가 모두 재현됐다.
   - 현재는 성공 시 import 결과를 `ffmpeg`로 `h264 + aac stereo + mp4`로 정규화한 뒤 `file=` relay/analysis 경로에 바로 재사용하도록 수정했다.

## 영상분석 착수 전 blocker 체크리스트와 완료 이력
- 목적
  - 스트리밍 기반이 흔들리는 상태에서 분석 계층을 얹지 않도록, 분석 브랜치 분기 전에 최소 기준선을 확인한다.
  - `2026-04-24` 기준 아래 로컬 core 경로는 분석 1차 구현에 충분한 기준선으로 판단했다.
- 통과 기준
  - 로컬 `file -> RTSP`, `file -> WebRTC(signaling)`이 계속 재생 가능해야 한다.
  - 로컬 `RTSP pull -> RTSP/WebRTC(signaling)`이 codec matrix 기준으로 재현 가능해야 한다.
  - 로컬 `WebRTC publish -> RTSP/WebRTC(signaling)`이 source 재사용과 함께 동작해야 한다.
  - 동일 source 다중 세션에서 `SharedStream` 재사용이 유지되어 upstream 연결이 중복 생성되지 않아야 한다.
  - `start/stop/restart/check/diagnose` 스크립트가 기본 동작을 깨지 않고 수행되어야 한다.
  - source descriptor/audio-video track discovery가 로컬 검증 범위에서 일관되어야 한다.
  - 서버 중지 후 listen port와 잔여 foreground process가 남지 않아야 한다.
- 이번 체크에서 우선 보는 범위
  - LAN IP 기준 외부 클라이언트 접근성은 모든 `./server.sh test` 모드에서 확인한다.
  - 제3자 RTSP upstream reachability는 stable `./server.sh test`에서 advisory로 확인한다.
  - 신뢰 가능한 외부 RTSP URL을 명시한 경우에는 hard gate로 검증한다.
  - 로컬 HTTP URI source는 기본 matrix에 포함한다. 로컬 HLS VOD는 선택 matrix로 검증하며, 외부 HLS/HTTP URI, 실험실 YouTube, 운영용 TURN relay/auth 검증은 선택 테스트로 남긴다.
  - YOLO/VA overlay는 기본 설치/기본 실행 범위이므로 `./server.sh test` 기본 기준에 포함한다.
  - profile/rule/event, adaptive tuner는 선택 테스트로 유지하고 기본 안정 기준에는 넣지 않는다.
- 권장 실행 순서
  1. `./server.sh install`
  2. `./server.sh test`
  3. 필요 시 `./server.sh test --include-rules`
  4. 필요 시 `./server.sh test --include-va-events`
  5. 필요 시 `./server.sh verify-route-profiles`
  6. 필요 시 `./server.sh verify-tracker-stability`
  7. 필요 시 `./server.sh verify-yolo-layouts`
  8. 필요 시 `./server.sh verify-adaptive`
  9. `./server.sh stop`
- 판단 규칙
  - 위 stable 기준이 깨지면 분석 관련 변경보다 스트리밍 안정화 수정을 먼저 한다.
  - profile/rule/event 같은 분석 관련 기능은 선택 테스트로 검증하되, 안정 기능으로 승격 전까지 기본 `./server.sh test`에는 넣지 않는다.
  - 새 기능을 추가하면 먼저 선택 테스트(`--include-*`)로 묶고, 반복 검증 후 안정 기능으로 판단될 때만 기본 `./server.sh test` 기준에 승격한다.

## 분석 1차 구현 이후 보류 테스트 이력
- 분석 1차 구현은 file/RTSP/WebRTC local core 경로 중심으로 진행했다. 아래 항목은 main 기준 선택 테스트로 기록한다.
  - `HTTP URI -> RTSP` 최신 `503` 재확인 및 수정 완료. 로컬 HLS VOD 선택 검증 통과, 외부 HLS/HTTP URI는 선택 검증으로 유지
  - 외부 RTSP source 장시간/codec 심화 재검증
  - WebRTC 운영 환경 테스트(실제 외부 TURN relay/auth/ICE policy)
  - audio-only input 정책 확정
  - 실험실 YouTube 회귀 검증
  - `/lab/import` 외부 네트워크 재검증

## 영상분석 skeleton 검증 기준
- 1차 skeleton 검증
  - `./server.sh start`로 AI 포함 기본 빌드(`build-gst-onnx`)와 analysis module 포함 여부를 확인한다.
  - 기존 `file -> RTSP`, `file -> WebRTC(signaling)` smoke test가 그대로 동작해야 한다.
  - analysis tap이 붙어도 `SharedStream::RefCount()`는 relay client 수만 세되, source 제거는 `TotalSubscriberCount()` 기준으로 analysis tap까지 빠진 뒤에만 수행해야 한다.
  - 개발용 HTTP endpoint:
    - `POST /lab/analysis/taps?file=sample_h264.mp4&profileId=debug&fps=5`
    - `GET /lab/analysis/taps/{tapId}`
    - `DELETE /lab/analysis/taps/{tapId}`
  - dummy detector 단계에서는 `latestResult.detections=[]`가 정상이다. 이 단계의 목적은 source dedup, tap 수명, packet 관찰 여부 확인이다.
- 2차 decode hub 검증
  - H264/H265/VP8 compressed packet을 raw RGB frame으로 변환하고 dummy detector로 넘긴다.
  - `GET /lab/analysis/taps/{tapId}`에서 `decodedFrames`, `analyzedPackets`, `decoderErrors`를 확인한다.
- 3차 sampling/drop-oldest queue 검증
  - `fps`는 wall-clock 기준 detector 입력 frame rate를 제한한다.
  - `maxQueue`는 detector worker 앞 bounded queue 크기를 제한한다.
  - `detectorDelayMs`는 lab 전용 slow detector 시뮬레이션 옵션이다.
  - `GET /lab/analysis/taps/{tapId}`에서 `sampledFrames`, `sampleDroppedFrames`, `queueDroppedFrames`, `pendingFrames`를 확인한다.
- 4차 YOLO/ONNX 검증
  - 기본 빌드는 ONNX Runtime 없이도 통과해야 한다.
  - `MEDIA_SERVER_USE_ONNXRUNTIME=ON`은 ONNX Runtime 개발 파일이 있을 때만 구성한다.
  - ONNX Runtime 미포함 빌드에서 `detector=yolo`는 명확한 400 오류를 반환해야 한다.
  - 작은 모델부터 붙여 CPU/Mac GPU 환경별 처리 지연과 frame drop 비율을 측정한다.
  - detection metadata, snapshot, overlay 중 어떤 출력이 안정적인지 분리 테스트한다.

## 2026-04-24 blocker 체크 결과
- 실행한 항목
  - `./server.sh install`
  - `./server.sh start`
  - `./server.sh status`
  - `./server.sh verify-codecs`
  - `./server.sh diagnose`
  - `./server.sh restart`
  - `./server.sh stop`
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
  - 이 시점의 `source=http` RTSP 503은 후속 `2026-04-26` 점검에서 URI/VOD source pacing 보정으로 정리했다.
  - HLS/외부 HTTP URI source는 여전히 네트워크/upstream 상태 영향이 커서 선택 검증으로 둔다.
  - detached lifecycle 스크립트의 Codex 환경 특이점은 분석 blocker라기보다 main 안정화 이력의 별도 항목으로 둔다.

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
- `./server.sh verify-codecs`

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
  - `2026-04-24 blocker 체크 결과`에서는 같은 계열 `HTTP URI -> RTSP`가 `503`으로 재현되었고, `2026-04-26` URI/VOD pacing 보정 후 다시 통과했다.
- 외부 wowza source는 기본 설정에서 `RTSP preflight failed for wowzaec2demo.streamlock.net:554 within 1500ms (connection timed out)`로 실패했다.
- 같은 wowza source를 `MEDIA_SERVER_RTSP_SOURCE_PREFLIGHT_TIMEOUT_MS=0`으로 다시 확인하면 `timed out waiting for RTSP source samples`로 실패했다.
- local `WHIP publish(sourceId=publisher-demo2) -> RTSP`는 `h264 + aac`로 확인됐다.
- browser `WHIP publish -> WHEP consume`은 audio/video track 연결과 decoded video frame을 확인했다.
- browser `WHIP publish -> simple signaling consume`은 audio/video track 연결과 decoded video frame을 확인했다.

## 외부 RTSP source 진단용 환경변수
- `MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS`
  - 쉼표/세미콜론으로 구분한 외부 RTSP URL 후보 목록이다.
  - `./server.sh test`에서 이 값을 명시하면 hard gate로 처리한다.
- `MEDIA_SERVER_TEST_REQUIRE_EXTERNAL_SOURCE`
  - `1`이면 기본 후보 실패도 hard fail 처리한다.
  - 기본값은 advisory다. public RTSP endpoint는 upstream 상태와 outbound 554/tcp 정책에 크게 흔들리기 때문이다.
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
./server.sh foreground
```

## 실행 예시
```bash
./server.sh verify-codecs
```

같은 LAN의 다른 PC에서 수동으로 확인할 URL을 출력하려면:
```bash
./server.sh urls
```

출력 결과에는 현재 LAN IP가 포함될 수 있으므로, 결과물을 그대로 커밋하거나 문서에 붙이지 않는다.

외부 수동 검증 전에는 서버를 전체 인터페이스에 bind한다.
```bash
MEDIA_SERVER_LISTEN_ADDRESS=0.0.0.0 \
MEDIA_SERVER_HTTP_LISTEN_ADDRESS=0.0.0.0 \
MEDIA_SERVER_FORCE_RTSP_TCP=1 \
./server.sh restart
```

다른 PC에서 먼저 확인할 URL:
```text
http://{media-server-host}:8080/health
http://{media-server-host}:8080/lab
```

필요시 직접 열 수 있는 호환 route:
```text
http://{media-server-host}:8080/webrtc/test
http://{media-server-host}:8080/lab/rules
http://{media-server-host}:8080/lab/import
```

`/health`는 `{"status":"ok"}`를 반환하는 readiness check다.
위 두 URL이 열리지 않으면 player 문제가 아니라 macOS 방화벽, bind address, 공유기 WiFi/LAN isolation 문제를 먼저 확인한다.

외부 RTSP URL을 codec matrix까지 포함하려면:
```bash
MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=1 ./server.sh verify-codecs
```

외부 RTSP reachability만 빠르게 진단하려면:
```bash
./scripts/internal/test_external_source_reachability.sh
```

특정 외부 RTSP URL을 hard gate로 직접 진단하려면:
```bash
MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS='rtsp://camera-or-test-host/live' \
./server.sh test
```

로컬 WebRTC publish smoke test:
```bash
source ./scripts/internal/env_common.sh
media_server_apply_homebrew_gst_env
python3 -u ./scripts/internal/whip_publish_test.py --http-base http://127.0.0.1:8081 --source-id publisher-demo --duration 0
```

RTSP만 확인하려면:
```bash
MEDIA_SERVER_VERIFY_SKIP_WEBRTC=1 ./server.sh verify-codecs
```

WebRTC signaling만 확인하려면:
```bash
MEDIA_SERVER_VERIFY_SKIP_RTSP=1 ./server.sh verify-codecs
```

특정 source만 빠르게 보려면:
```bash
MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus ./server.sh verify-codecs
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
- live source(`RTSP`, `WebRTC`)는 마지막 subscriber가 빠지면 즉시 cleanup 하도록 변경했다.
- `SourceWorker` liveness를 체크해서 죽은 worker를 재사용하지 않도록 보강했다.
- 이 변경 후 `RTSP(h265+opus)`와 `RTSP(h264+pcmu)`의 연속 요청/transform route 재검증이 통과했다.
- `source=http` RTSP `503` 원인을 수정했다.
  - 세션 생성 시 source보다 subscriber를 먼저 등록해 초기 샘플 손실을 줄였다.
  - RTSP egress에 start 전 pending packet queue와 timestamp normalization을 추가했다.
  - H264 transcode route의 `1000h` timestamp offset을 `identity ts-offset=-3600000000000000`으로 보정했다.
  - pending queue가 video keyframe에서 audio priming packet까지 지우지 않도록 수정했다.
- 당시 전체 로컬 matrix는 `pass=63 fail=0 skip=3`로 통과했다.
- 이후 `2026-04-24` blocker 체크에서는 `source=http` RTSP route에서 `503`이 다시 관찰되었고, `2026-04-26` URI/VOD appsink pacing(`sync=true`) 보정 후 로컬 HTTP MP4 matrix가 다시 통과했다.

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
  - 이후 `imports/lab_test.mp4`는 `sample_h264.mp4`와 동일한 중복 파일이라 정리했다.
- `2026-04-24` 실제 외부 네트워크 재검증을 추가했다.
  - shell에서 만든 `import-1`은 `failed`로 종료됐고, 로그에는 `Sign in to confirm you're not a bot`가 기록됐다.
  - 같은 URL에 대해 `yt-dlp --skip-download -g` resolver 경로도 동일한 bot check 오류로 실패했다.
  - 하지만 Chrome `/lab/import`에서 다시 만든 `import-2`는 `ready`로 완료됐다.
  - `import-2` 로그에는 `[jsc:deno] Solving JS challenges using deno`가 포함됐다.
  - 초기 결과 파일은 `av1 + aac(6ch)`로 저장되어, 기존 relay 경로에서 `stream descriptor not available or not yet supported`로 실패했다. 이 실패 산출물은 현재 정리했다.
  - 이후 `/lab/import`에 `yt-dlp` format selector 적용과 `ffmpeg` 기반 `h264 + aac stereo + mp4` 정규화 단계를 추가했다.
  - 새 코드로 다시 만든 `import-1`은 `storedFileToken=imports/normalized_import_test.mp4`로 `ready`까지 완료됐고, `ffprobe` 기준 `h264 1280x720 + aac 48000Hz stereo`로 확인됐다.
  - 같은 파일에 대해 `POST /webrtc/session?file=imports/normalized_import_test.mp4`가 `200 OK`로 통과해, import 결과를 기존 `file=` relay 경로에 바로 재사용할 수 있음을 확인했다.
- 외부 수동 검증 URL 출력 스크립트를 추가했다.
  - `./server.sh urls`
  - LAN IP, RTSP route URL, WebRTC test page/manual case를 한 번에 출력한다.
- `2026-04-24` 영상분석 skeleton local smoke test를 추가했다.
  - 임시 포트 `RTSP 8555`, `HTTP 8081`에서 foreground 서버를 실행했다.
  - `POST /lab/analysis/taps?file=sample_h264.mp4&profileId=debug&fps=5`가 `analysis-tap-1`을 반환했다.
  - `GET /lab/analysis/taps/analysis-tap-1`에서 `receivedVideoPackets > 0`, `analyzedPackets > 0`, `droppedPackets=0`, `hasResult=true`를 확인했다.
  - dummy detector 단계라 `latestResult.detections=[]`는 정상이다.
  - `DELETE /lab/analysis/taps/analysis-tap-1` 후 `GET /lab/analysis/taps`가 `activeTaps=0`을 반환했다.
- `2026-04-24` 영상분석 raw decode hub local smoke test를 추가했다.
  - 같은 임시 포트에서 `POST /lab/analysis/taps?file=sample_h264.mp4&profileId=raw-debug&fps=5`를 실행했다.
  - `GET /lab/analysis/taps/analysis-tap-1`에서 `receivedVideoPackets=645`, `decodedFrames=643`, `analyzedPackets=643`, `droppedPackets=0`, `decoderErrors=0`, `hasResult=true`를 확인했다.
  - raw decode hub는 `appsrc -> h264parse/h265parse/vp8dec -> decoder -> videoconvert -> RGB appsink` 구조로 동작한다.
  - 테스트 종료 후 tap 삭제와 임시 서버 종료를 확인했다.
- `2026-04-24` 영상분석 sampling/drop-oldest queue local smoke test를 추가했다.
  - wall-clock sampling 확인:
    - `POST /lab/analysis/taps?file=sample_h264.mp4&profileId=sample-debug&fps=5&maxQueue=2`
    - 1초 후 `targetFps=5`, `decodedFrames=31`, `sampledFrames=5`, `analyzedPackets=5`, `sampleDroppedFrames=26`, `decoderErrors=0`을 확인했다.
  - slow detector/drop-oldest 확인:
    - `POST /lab/analysis/taps?file=sample_h264.mp4&profileId=slow-debug&fps=30&maxQueue=2&detectorDelayMs=200`
    - 1초 후 `debugDetectorDelayMs=200`, `sampledFrames=19`, `analyzedPackets=4`, `queueDroppedFrames=12`, `pendingFrames=2`, `decoderErrors=0`을 확인했다.
  - 테스트 종료 후 tap 삭제와 임시 서버 종료를 확인했다.
- `2026-04-24` YOLO/ONNX detector optional build smoke test를 추가했다.
  - 초기 미설치 상태에서는 ONNX Runtime 개발 헤더/라이브러리가 없어 `MEDIA_SERVER_USE_ONNXRUNTIME=ON` 구성이 실패함을 확인했다.
  - 기본 `build-gst`는 `MEDIA_SERVER_USE_ONNXRUNTIME=OFF`로 빌드가 통과했다.
  - `MEDIA_SERVER_USE_ONNXRUNTIME=ON` 구성은 `ONNX Runtime not found. Set MEDIA_SERVER_ONNXRUNTIME_ROOT...` 메시지로 실패함을 확인했다.
  - `detector=dummy` analysis tap은 기존과 같이 동작했다.
  - ONNX Runtime 미포함 빌드에서 `detector=yolo&model=models/missing.onnx` 요청은 HTTP 400과 `YOLO detector requires MEDIA_SERVER_USE_ONNXRUNTIME=ON...` 오류를 반환했다.
- `2026-04-24` YOLO/ONNX detector actual inference smoke test를 추가했다.
  - `brew install onnxruntime`로 ONNX Runtime `1.25.0`을 설치했다.
  - Homebrew layout 보정을 위해 CMake ONNX include 탐색에 `onnxruntime` suffix를 추가했다.
  - `build-gst-onnx`를 `MEDIA_SERVER_USE_ONNXRUNTIME=ON`, `MEDIA_SERVER_ONNXRUNTIME_ROOT=/opt/homebrew/opt/onnxruntime`로 구성했고 빌드가 통과했다.
  - 검증용 모델은 Ultralytics assets `v8.4.0`의 `yolo11n.onnx`를 `models/` 아래에 로컬로만 내려받았다.
  - 검증용 label은 `models/coco.names`의 COCO 80개 class다. 현재 overlay에 표출 가능한 class 목록은 `docs/video-analysis.md`의 YOLO/COCO 기준 섹션에 명시했다.
  - 당시 검증용 영상은 Ultralytics `bus.jpg`를 `video/imports/yolo_bus_test.mp4`로 변환해 사용했다.
  - `POST /lab/analysis/taps?file=imports/yolo_bus_test.mp4&profileId=yolo-bus-smoke&detector=yolo&model=models/yolo11n.onnx&labels=models/coco.names&fps=2&maxQueue=2&inputWidth=640&inputHeight=640&confidence=0.25&nms=0.45`가 성공했다.
  - 2초 후 status에서 `detectorType=yolo`, `analyzedPackets=87`, `decoderErrors=0`, `detections`에 `person`, `bus`가 포함됨을 확인했다.
  - 테스트 종료 후 tap 삭제와 임시 서버 종료를 확인했다.
- `2026-04-24` analysis metadata/snapshot API smoke test를 추가했다.
  - ONNX build 서버에서 `metadata-snapshot-smoke` YOLO analysis tap을 생성했다.
  - `GET /lab/analysis/taps/analysis-tap-1/metadata`가 `hasResult=true`와 `person`, `bus` detection JSON을 반환했다.
  - `GET /lab/analysis/taps/analysis-tap-1/snapshot.jpg?quality=80`이 JPEG를 반환했다.
  - 저장한 snapshot은 `file` 기준 `JPEG image data, baseline, precision 8, 640x480, components 3`, 크기 약 `214KB`로 확인했다.
  - 테스트 종료 후 tap 삭제와 임시 서버 종료를 확인했다.
- `2026-04-24` analysis overlay snapshot API smoke test를 추가했다.
  - ONNX build 서버에서 `overlay-smoke` YOLO analysis tap을 생성했다.
  - `GET /lab/analysis/taps/analysis-tap-1`에서 `hasLatestFrame=true`, `latestFrameWidth=640`, `latestFrameHeight=480`, `hasResult=true`를 확인했다.
  - `GET /lab/analysis/taps/analysis-tap-1/overlay.jpg?quality=80&thickness=4&drawLabels=1`이 JPEG를 반환했다.
  - 저장한 overlay snapshot은 `file` 기준 `JPEG image data, baseline, precision 8, 640x480, components 3`, 크기 약 `222KB`로 확인했다.
  - 육안 확인 기준 `person`, `bus` detection box와 label이 이미지 위에 그려졌다.
- `2026-04-24` RTSP/WebRTC overlay stream smoke test를 추가했다.
  - RTSP consume URL에 `va=1`을 붙이면 서버 기본 VA profile로 analysis tap이 자동 생성되고 media unprepare 시 자동 detach됨을 확인했다.
  - RTSP stream 시작 직후 첫 frame은 detector 결과가 아직 없어 원본 frame으로 나올 수 있음을 확인했다.
  - 같은 RTSP 세션에서 5초 뒤 frame을 캡처하면 `person`, `bus` detection box와 label이 포함된 `640x480` JPEG가 저장됨을 확인했다.
  - WebRTC simple signaling은 `va=1` session 생성과 SDP offer 생성 smoke가 통과했다.
  - 이후 simple signaling/WHEP 브라우저 playback 육안 검증까지 완료했다.
- `2026-04-24` RTSP overlay PTS sync smoke test를 추가했다.
  - 수정 전 overlay는 egress 현재 frame에 최신 detection result를 그대로 합성해, 움직임이 큰 영상에서 box가 뒤따라오는 현상이 있었다.
  - analysis result history를 PTS 기준으로 보관하고, RTSP/WebRTC egress의 normalized PTS를 source PTS로 역매핑해 가까운 result만 합성하도록 수정했다.
  - `overlayWaitMs`와 `overlaySyncToleranceMs` query를 추가했고, URL 기본 사용값에서는 제외했다.
  - `NewYorkDriving.mp4` 기준 서버 기본값 `fps=8`, `maxQueue=1`, `overlayWaitMs=180`, `overlaySyncToleranceMs=400`으로 10초 RTSP frame capture를 수행했고, bus/car/person box가 객체 위치에서 크게 뒤처지지 않음을 확인했다.
  - 기존 계열인 `fps=2&maxQueue=2`에서도 10초 capture 기준 큰 박스 밀림은 보이지 않았다. 다만 빠른 움직임에서는 현재 서버 기본 VA profile처럼 짧은 queue를 권장한다.
- `2026-04-24` WebRTC overlay browser playback 검증을 추가했다.
  - `/lab` 페이지에 “VA 분석” 옵션을 추가하고 `file=imports/yolo_bus_test.mp4`, `va=1`로 확인했다.
  - simple signaling 경로에서 브라우저 video가 재생되고 `person`, `bus` overlay box가 보였다.
  - WHEP 경로에서도 ICE/connection connected와 브라우저 video 재생, overlay box 표시를 확인했다.
  - WHEP는 raw buffer PTS가 packet PTS mapping과 어긋날 수 있어 near-PTS result가 없으면 최신 result로 fallback한다.
- `2026-04-24` YOLO letterbox 좌표 보정을 추가했다.
  - 기본 `preprocess=letterbox`에서 114 gray padding, 원본 종횡비 유지 resize, output box의 padding/scale 역보정을 적용한다.
  - 기존 강제 resize 경로는 `preprocess=stretch`로 남겨 두었다.
- `2026-04-24` detector metrics와 profile/rule 설계 API smoke test를 추가했다.
  - analysis tap snapshot에 `lastAnalysisMs`, `averageAnalysisMs`, `maxAnalysisMs`가 포함됨을 확인했다.
  - `GET /lab/analysis/capabilities`, `GET /lab/analysis/profiles`, `GET /lab/analysis/rules`가 JSON을 반환한다.
- `2026-04-24` VA URL 단순화와 lab 파일 dropdown을 추가했다.
  - RTSP/WebRTC consume URL은 기본적으로 `?file=...&va=1`만 사용한다.
  - detector/model/labels/confidence/nms/fps/queue/overlay sync 기본값은 `include/stdafx.h`와 `MEDIA_SERVER_ANALYSIS_*` 환경변수로 관리한다.
  - `/lab/files`가 `MEDIA_SERVER_FILE_ROOT` 아래 지원 미디어 파일 목록을 JSON으로 반환하고, `/lab` 파일 입력은 dropdown으로 표시한다.
- `2026-04-25` overlay label score percentage 표기와 adaptive tuner smoke test를 추가했다.
  - overlay label은 `0.xx` 대신 `xx%` 형태로 표기한다.
  - Pango/Cairo가 빌드에 잡히면 실제 영상 overlay는 기본 `labelLang=ko`로 `차량(자동차)`, `사람`, `동물(강아지)`, `도로(신호등)`, `기기(노트북)` 같은 10개 일반 시각 카테고리 묶음으로 표기한다.
  - `labelLang=en`을 지정하면 `Vehicle(car)`, `Person`, `Animal(dog)`, `Road(traffic light)`, `Device(laptop)`처럼 첫 글자만 대문자인 짧은 영문 표기로 전환한다.
  - 일반 분석 색상은 `사람=진한 파랑`, `차량=초록`, `도로=노랑`, `동물=진한 보라`, `운동=청록`, `음식=주황`, `가구=갈색`, `기기=마젠타`, `식기=하늘색`, `잡화=회색`을 사용하고 빨간색은 이벤트/위험 강조용으로 남긴다.
  - Pango/Cairo가 없는 환경에서는 ASCII renderer 제약 때문에 영문 fallback으로 표기한다.
  - `adaptive=0&fps=5&adaptiveMinFps=10`으로 adaptive bounds가 들어와도 비활성 상태에서는 `targetFps=5`가 유지되는 것을 확인했다.
  - `detector=dummy&fps=8&maxQueue=1&adaptive=1&adaptiveMinFps=2&adaptiveCooldownMs=300&detectorDelayMs=400`으로 과부하를 만들었고, `targetFps=2`, `adaptiveDownshiftCount=6`을 확인했다.
  - `adaptiveInputSize=1&adaptiveMinFps=8&adaptiveInputStep=160&detectorDelayMs=500`으로 input-size 조절을 만들었고, `modelInputWidth=320`, `modelInputHeight=320`, `adaptiveState=downshift-input`을 확인했다.
  - 임시 서버는 `RTSP 8555`, `HTTP 8081`에서 실행했고 smoke test 후 종료했다.
- `2026-04-25` YOLO/VA overlay 회귀 스크립트 `./server.sh verify-va`를 추가했다.
  - ONNX build 서버에서 기본 `va_four_scene_sample.mp4` 기준 lab YOLO status, overlay JPEG, RTSP overlay decode, WebRTC simple playback, WHEP playback을 확인한다.
  - 짧은 smoke 기준 `MEDIA_SERVER_VERIFY_VA_DURATION_S=4`, `MEDIA_SERVER_VERIFY_VA_SKIP_WEBRTC=1`에서 lab+RTSP가 통과했다.
  - 이어 `MEDIA_SERVER_VERIFY_VA_DURATION_S=2`, `MEDIA_SERVER_VERIFY_VA_WEBRTC_HOLD_MS=1000`, `MEDIA_SERVER_VERIFY_VA_SKIP_LAB=1`, `MEDIA_SERVER_VERIFY_VA_SKIP_RTSP=1`에서 WebRTC simple/WHEP playback이 통과했다.
  - RTSP decode 중 `non monotonically increasing dts` 경고가 1회 관찰됐지만 decode 자체는 성공했다. 장시간 회귀에서 반복성 여부를 추가 확인한다.
- `2026-04-25` `imports/NewYorkDriving.mp4` 기준 45초 lab+RTSP VA 회귀를 실행했다.
  - `decodedFrames`, `analyzedPackets`, detection label이 지속 증가했고 `car`, `person`, `truck`, `bus`, `traffic light` 등이 검출됐다.
  - `targetFps=8`, `adaptiveState=steady`, 평균 분석 시간 약 `88ms` 수준으로 유지됐다.
  - RTSP VA overlay decode가 통과했고, 이전 짧은 파일에서 보였던 DTS 경고는 재현되지 않았다.
- `2026-04-25` profile/rule persistent registry 1차 smoke test를 추가했다.
  - `MEDIA_SERVER_ANALYSIS_REGISTRY=.media_server_analysis_registry_smoke.json`로 프로젝트 루트 기준 임시 저장 파일을 지정했다.
  - `POST/GET/PUT/DELETE /lab/analysis/profiles/{id}`와 `POST/GET/DELETE /lab/analysis/rules/{id}`가 통과했다.
  - 삭제 후 저장 파일이 `{"profiles":[],"rules":[]}` 형태로 정리됨을 확인했다.
  - 별도 임시 파일 기준으로 서버 재시작 후 `GET /lab/analysis/profiles/persist-profile`, `GET /lab/analysis/rules/persist-rule`이 저장된 JSON을 다시 반환함을 확인했다.
- `2026-04-25` `/lab/rules` 시각적 profile/rule 편집 UI 1차 smoke test를 추가했다.
  - `/lab`에는 시각적 룰 편집 페이지 링크만 남기고 JSON 직접 편집 블록은 제거했다.
  - `/lab/rules` HTML에 `VA 룰 편집기`, `이벤트 판단 영역`, `분석할 객체 타입`, `Profile 저장` 요소가 포함됨을 확인했다.
  - 인앱 브라우저에서 `http://127.0.0.1:8081/lab/rules`가 렌더링되는 것을 확인했다.
  - UI는 profile 성능값을 slider/dropdown으로 조정하고, rule은 source/route/profile/event type/class와 16:9 polygon 영역을 저장한다.
  - polygon 영역은 최대 12점까지 지정하고, 기존 점 근처 drag/drop으로 점 위치를 이동한다.
  - `line-crossing`은 polygon 대신 2점 선분으로 전환하며, 현재 방향은 `any` 양방향으로 저장한다.
  - 이벤트 발생 시 matched object 깜빡임 강조와 POST URL 설정을 `eventActions`로 저장한다. POST payload는 `media-server.va.event.v1` 고정 format preview만 보여주고 사용자가 수정할 수 없다.
  - 저장은 기존 `PUT /lab/analysis/profiles/{id}`와 `PUT /lab/analysis/rules/{id}` API를 사용한다. 저장된 rule은 이후 rule event engine에서 `va=1` overlay와 events API에 적용한다.
- `2026-04-25` `/lab/rules` 룰 편집 전체 테스트를 임시 registry로 실행했다.
  - `MEDIA_SERVER_ANALYSIS_REGISTRY=.media_server_rule_ui_full_test.json` 서버에서 profile 저장, polygon rule 저장, line-crossing rule 저장을 확인했다.
  - polygon rule은 12개 점까지 추가된 뒤 13번째 클릭에서 최대 12개 제한 메시지를 표시했다.
  - polygon 기존 점 drag/drop 후 점 개수는 12개로 유지되고 좌표만 변경되는 것을 브라우저에서 확인했다.
  - line-crossing rule은 UI가 `이벤트 판단 선`으로 전환되고, 기존 점 drag/drop 뒤 `region.type=line`, `direction=any`, 2개 point로 저장됐다.
  - 서버 재시작 후 같은 임시 registry에서 저장된 profile/rule 3건이 다시 조회되어 persistence를 확인했다.
- `2026-04-25` `/lab/rules` event action UI smoke test를 추가했다.
  - matched object 깜빡임 강조 설정을 `eventActions.highlight`로 저장했다.
  - 사용자는 POST URL만 입력하고, payload는 `media-server.va.event.v1` 고정 preview로만 표시한다.
  - `ui-event-action-test` rule 저장 후 `eventActions.highlight.mode=blink`, `target=matched-object`, `eventActions.post.method=POST`, `payloadFormat=media-server.va.event.v1`이 registry에 저장됨을 확인했다.
  - 이 시점에는 실제 POST 전송은 수행하지 않았다. 전송 실행은 이후 POST delivery worker 구현에서 연결했다.
- `2026-04-25` rule event engine 1차 구현을 추가했다.
  - 저장된 rule JSON을 detection 결과에 적용하는 `src/analysis/event_rule_engine.cpp`를 추가했다.
  - 지원 이벤트는 `presence`, `enter`, `exit`, `line-crossing(any)`다.
  - `va=1` RTSP/WebRTC overlay와 `/lab/analysis/taps/{tapId}/overlay.jpg`는 저장된 rule snapshot을 평가해 이벤트 객체를 `이벤트`/`Event` label과 blink highlight로 표시한다.
  - `/lab/analysis/taps/{tapId}/events`는 최신 result에 rule을 적용한 event JSON을 반환한다.
  - 이 시점에는 `eventActions.post`가 저장/응답에만 포함됐고 실제 HTTP POST 전송은 아직 수행하지 않았다.
  - 당시에는 tracker가 없어서 다중 동일 class 객체의 `enter/exit/line-crossing`은 detection index 기준 상태 추적으로만 동작했다. 이후 `2026-04-25` lightweight tracker 1차 구현에서 `trackId` 기준 상태 추적으로 변경했다.
  - `./server.sh start` 기준 AI 포함 기본 빌드가 통과했다.
  - ONNX build 서버에서 `imports/yolo_bus_test.mp4`와 전체 화면 polygon `presence` rule을 사용해 `/lab/analysis/taps/analysis-tap-1/events`가 `person`, `bus` 이벤트 5건과 `event.triggered=true` detection metadata를 반환함을 확인했다.
  - 같은 tap의 `/overlay.jpg`는 `JPEG 640x480`으로 생성됐고, 이벤트 객체가 `이벤트`/`Event` label과 highlight color로 표시됨을 이미지로 확인했다.
  - 합성 detection 기반 단위 smoke에서 `presence_events=1`, `enter_events=1`, `exit_events=1`, `line_events=1`을 확인했다.
- `2026-04-25` event POST delivery worker 1차 구현을 추가했다.
  - `src/analysis/event_post_dispatcher.cpp`가 이벤트 POST를 bounded queue에 넣고 background worker에서 `curl`로 전송한다.
  - `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED`, `MEDIA_SERVER_ANALYSIS_EVENT_POST_TIMEOUT_MS`, `MEDIA_SERVER_ANALYSIS_EVENT_POST_MAX_QUEUE`, `MEDIA_SERVER_ANALYSIS_EVENT_POST_COOLDOWN_MS`로 동작을 조절한다.
  - 안전한 기본값을 위해 `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=0`이 기본이며, 외부 POST 전송 검증 또는 운영 전송이 필요할 때만 명시적으로 켠다.
  - worker가 켜진 운영 stream에서는 RTSP/WebRTC `va=1` overlay 경로에서 event POST가 enqueue된다.
  - 개발 검증용으로 `/lab/analysis/taps/{tapId}/events?dispatch=1`를 추가했고, worker 상태는 `/lab/analysis/event-post/status`에서 확인한다.
  - localhost 임시 수신 서버 `http://127.0.0.1:19090/event`를 두고 `imports/yolo_bus_test.mp4` + 전체 화면 polygon `presence` rule을 검증했다.
  - `/events?dispatch=1` 호출 후 `enqueuedCount=5`, `sentCount=5`, `failedCount=0`, `droppedCount=0`을 확인했고, 수신 payload는 `schema=media-server.va.event.v1`, `rule.id=event-post-smoke`, `object.class=person`, `path=/event`로 도착했다.
  - 연속 dispatch 호출에서 중복 이벤트가 cooldown으로 억제되어 `suppressedCount=5`가 증가함을 확인했다.
  - 테스트 tap, ONNX foreground 서버, 임시 POST 수신 서버를 종료해 잔여 listen port가 없음을 확인했다.
- `2026-04-25` lightweight tracker 1차 구현 smoke test를 추가했다.
  - `src/analysis/object_tracker.cpp`에서 IoU와 중심점 거리 기반 track matching을 추가했다.
  - 기본 `va=1` profile은 `MEDIA_SERVER_ANALYSIS_TRACKING=1` 기본값으로 tracker를 켠다. query `tracking=0`으로 디버그 비활성화할 수 있다.
  - detection metadata는 `trackId`를 포함하고, `latestResult.tracks[]`는 `trackId`, `age`, `hits`, `missed`, `state`, 최근 box, 중심점 `trail[]`을 반환한다.
  - overlay snapshot/debug URL에 `trackIds=1`을 붙이면 label에 `#trackId`가 함께 표시되고, `trackTrails=1`을 붙이면 최근 이동 궤적이 표시된다.
  - `imports/yolo11n_object_detection_slideshow_1280x720_30fps_h264.mp4` 기준 smoke에서 사람 장면 `trackId=1,2`가 여러 poll 동안 유지되고 `trackingEnabled=true`, `state=confirmed`를 확인했다.
  - 임시 전체 화면 `presence` rule을 등록해 `/lab/analysis/taps/{tapId}/events`가 `trackIds=1,2`를 포함한 이벤트 2건을 반환함을 확인했다.
  - rule `match.sourceKind=file`, `match.route=http`와 반대 조건 `match.route=rtsp`를 함께 등록해 HTTP 분석 tap에서 route matching을 확인했다. 결과 context는 `sourceKind=file`, `route=http`, `clientId=analysis-http-1`이고, active rule은 HTTP rule 1개만 남았다.
  - 같은 smoke에서 `trackTrails=1` overlay를 생성했고 `latestResult.tracks[].trail` 길이 30을 확인했다. 정지 슬라이드 영상이라 육안상 궤적은 짧게 보이므로 실제 이동 영상으로 별도 검증이 필요하다.
- `2026-04-26` rule context 기반 profile 자동 선택 1차 smoke test를 추가했다.
  - 임시 registry `/tmp/media_server_profile_override_registry.json`에 `profiles[].id=auto-http-profile`, `rules[].match={sourceKind:file,route:http}`, `rules[].analysis.profileId=auto-http-profile`을 저장했다.
  - `POST /lab/analysis/taps?file=va_four_scene_sample.mp4&va=1`에서 URL에 profile 값을 주지 않아도 snapshot `profileKey=auto-http-profile...`, `detectorType=dummy`, `targetFps=3`, `maxQueueSize=1`, `modelInput=320x320`, `trackingEnabled=false`가 적용됨을 확인했다.
  - `POST /lab/analysis/taps?file=va_four_scene_sample.mp4&va=1&fps=9`처럼 세부 튜닝 query가 있으면 registry 자동 profile 선택을 건너뛰고 서버 기본 YOLO profile이 유지됨을 확인했다. 테스트 중 adaptive tuner가 9fps에서 8fps로 즉시 downshift했다.
  - 검증 후 임시 tap을 삭제하고 foreground 서버를 종료해 8081/8555 listen port가 남지 않음을 확인했다.
- `2026-04-26` profile 자동 선택 우선순위와 active tap 목록 smoke test를 `./server.sh test --include-rules`에 추가했다.
  - `priority=50`, `match={sourceKind:file,route:*}` rule과 `priority=0`, `match={sourceKind:file,route:http}` rule을 동시에 저장했다.
  - HTTP analysis tap에서 더 구체적인 route rule보다 높은 priority rule의 profile이 선택됨을 확인했다.
  - `/lab/analysis/taps/{tapId}`와 `/lab/analysis/taps`가 `profileSelection.source=rule`, `profileSelection.ruleId`, `priority`, `context`를 반환함을 확인했다.
  - `./server.sh test --quick --include-rules --stop-after` 결과 `pass=8 fail=0 skip=3`을 확인했다.
- `2026-04-26` 실제 이동 영상 기반 tracker/event 검증을 `./server.sh verify-va-events`와 `./server.sh test --include-va-events`에 추가했다.
  - 기본 검증 파일은 `imports/va_tracking_event_1280x720_30fps_h264.mp4`다.
  - 임시 rule로 `presence`, 좌/우 `line-crossing`, 중앙 영역 `enter`, 중앙 영역 `exit`를 등록하고 `/lab/analysis/taps/{tapId}/events`를 polling한다.
  - 이벤트 payload의 `trackId`, active tap snapshot의 `latestResult.tracks[]`, overlay snapshot 생성을 함께 확인한다.
  - 수동 검증 기준 30초 이동 영상에서 `presence=672`, `line-crossing=5`, `enter=3`, `exit=2`, snapshot `trackCount=4`, 평균 분석 시간 약 `87ms`를 확인했다.
  - 자동 검증 기준 `./server.sh verify-va-events`는 `pass=9 fail=0 skip=0`으로 통과했다.
- `2026-04-26` 실제 RTSP/WebRTC overlay route별 profile/rule matching 검증을 `./server.sh verify-route-profiles`에 추가했다.
  - 임시 profile/rule을 `route=rtsp`, `route=webrtc`로 각각 등록하고, URL에는 `va=1`만 둔 상태에서 저장 rule의 `analysis.profileId`가 자동 선택되는지 확인한다.
  - RTSP는 실제 `ffmpeg` RTSP consumer를 띄운 뒤 active tap snapshot에서 `context.route=rtsp`, `profileSelection.source=rule`, `ruleId`, `profileKey`, `detectorType=dummy`를 확인한다.
  - WebRTC는 headless browser playback을 띄운 뒤 active tap snapshot에서 `context.route=webrtc`와 route별 profile 선택을 확인한다.
- `2026-04-26` tracker ID 유지/분절 통계 수집을 `./server.sh verify-tracker-stability`에 추가했다.
  - 기본 이동 영상 `imports/va_tracking_event_1280x720_30fps_h264.mp4`로 analysis tap을 만들고 active tap snapshot을 polling한다.
  - `unique_tracks`, `max_simultaneous_tracks`, `fragmentation_ratio`, track별 관측 sample 수, 평균 분석 시간을 출력한다.
  - 이 값은 ground truth 기반 ID switch count는 아니며, Kalman/ByteTrack류 보강 필요성을 판단하기 위한 1차 proxy다.
  - `--duration`, `--repeat`, `--interval`, `--long` 옵션으로 반복/장시간 측정이 가능하다.
  - `--long`은 30초 기본 이동 영상을 5배 슬로우모션으로 늘린 150초 장기 샘플 `imports/va_tracking_event_slow_long_1280x720_30fps_h264.mp4`를 로컬에 자동 생성해 서버 loop/편집 컷 경계 영향을 줄인다.
  - `--long` 반복 검증은 기본적으로 iteration 사이에 source idle cleanup을 기다려 같은 파일을 처음부터 다시 분석한다. 연속 source 동작을 보고 싶으면 `--continuous-source`를 사용한다.
  - 장시간 통계는 기본적으로 `person` class만 포함하고, 3회 미만 관측 track은 제외한다. `--class-whitelist`, `--min-track-samples`로 조정할 수 있다.
  - PTS 역행/중복 PTS는 segment-aware 모드에서 반복/정지 경계로 분리한다. 중복 PTS 비율이 기본 `0.3`을 넘으면 source 정지/EOF 가능성이 있어 실패로 처리한다.
  - long 검증의 fragmentation ratio는 전체 반복 횟수 누적값이 아니라 segment별 ratio의 최댓값으로 판단한다.
- `2026-04-26` YOLO output layout 옵션을 명시적으로 선택할 수 있게 정리했다.
  - `outputLayout=auto|channels-first|channels-last`, `boxFormat=cxcywh|xyxy`, `scoreMode=auto|class-only|objectness-class|score-class|class-score`를 query/profile 문서에서 받을 수 있다.
  - 기본값은 기존 `YOLOv8/YOLO11` 검증 모델과 호환되는 `auto + cxcywh + auto`다.
  - `./server.sh verify-yolo-layouts`로 기본 `yolo11n.onnx`, 실제 `YOLOv5n` fp16 모델, end2end xyxy 모델의 parser 조합을 검증한다. score/class 순서가 반대인 모델은 `scoreMode=class-score`로 분리한다.
- `2026-04-26` adaptive tuner 장시간 회귀 검증을 `./server.sh verify-adaptive`에 추가했다.
  - dummy detector delay로 과부하를 만들어 `targetFps` downshift를 확인한다.
  - delay 없는 저부하 tap으로 `targetFps` upshift를 확인한다.
- `2026-04-26` 정적 이미지 분석 API와 선택 검증 `./server.sh verify-image-analysis`를 추가했다.
  - `/lab/analysis/image?asset=va-four-scene-sample.png`는 docs/assets의 샘플 이미지를 decode하고 YOLO metadata JSON을 반환한다.
  - `/lab/analysis/image/snapshot.jpg`, `/lab/analysis/image/overlay.jpg`는 각각 원본 snapshot과 detection overlay JPEG를 반환한다.
  - `asset`은 `docs/assets`, `file`/`image`는 video root 기준 상대경로만 허용하며 절대경로와 `..` 경로 이탈은 400으로 거부한다.
  - 기본 `./server.sh test`에는 아직 넣지 않고 `./server.sh test --include-image-analysis` 선택 검증으로 연결했다.

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
