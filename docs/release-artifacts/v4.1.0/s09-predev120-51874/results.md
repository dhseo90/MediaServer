# S09 predev120 51874 실패 결과

독자: 개발·테스트 증적 검토자. lifecycle: 2026-09-11 실패 실행 원결과 보존. 중앙 release-test-records가 실행 기록 source-of-truth이며 이 파일은 전수 결과 artifact다. 제품 정책이나 120분 완료 증거가 아니다.

메인 명령 `./server.sh verify-predev --soak-minutes 120 --fail-fast`, session51874 exit1/signal null. startedAt=1789085881272, endedAt=1789085993472, elapsed112200ms. runner111초, integrated95초, child94초. token start/end/consumed 미집계(도구 미제공). soak7200초 요청이지만 observedIterations=0, 실제 soak0분/미진입.

outer4pass1fail0skip6notRun. summary-report PASS도 이 집계에 포함되며 steps 실행행은4pass1fail 총5행이다. child10pass1fail3skip. 하위 상세 결과는 서로 다른 계층이므로 합쳐 테스트수를 만들지 않는다.

## Outer 실행 결과

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| build | `cmake --build build-gst-onnx`; 11s | pass | 실제 summary steps |
| server-start-queue-256 | `run_server_foreground`; 0s | pass | 실제 summary steps |
| integrated-smoke | `MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_AUTH_MODE=off ./server.sh test --no-start --fail-fast --skip-external --include-rules  --include-va-events --include-image-analysis --include-redaction`; 95s | fail | 실제 summary steps |
| ports-clean | `lsof predev ports`; 0s | pass | 실제 summary steps |
| summary-report | `./server.sh summarize-reports /private/tmp/s09-predev120-9moPak/predev-summary.json --output /private/tmp/s09-predev120-9moPak/predev-report.md --html-output /private/tmp/s09-predev120-9moPak/predev-report.html `; 1s | pass | 실제 summary steps |

## Outer 미실행

| 제목 | 수행내용 | 사유 |
| --- | --- | --- |
| external-turn-hard-gate | `./server.sh verify-webrtc-ice --external-turn` | not run after first failure integrated-smoke: integrated smoke failure; PASS 아님 |
| soak-case-loop | `duration soak case loop` | not run after first failure integrated-smoke: pre-soak failure; PASS 아님 |
| main-runtime-idle | `curl -fsS http://127.0.0.1:8081/lab/runtime/status` | not run after first failure integrated-smoke: pre-runtime-idle failure; PASS 아님 |
| server-start-queue-2 | `run_server_foreground` | not run after first failure integrated-smoke: earlier first failure; PASS 아님 |
| event-post-queue | `./server.sh verify-event-post --mode queue` | not run after first failure integrated-smoke: earlier first failure; PASS 아님 |
| queue-runtime-idle | `curl -fsS http://127.0.0.1:8081/lab/runtime/status` | not run after first failure integrated-smoke: earlier first failure; PASS 아님 |

externalTurn=false이며 원 출력의 미실행 행을 그대로 보존했다.

## Child direct 결과 전수

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| [통과] 스크립트 문법 검사 | [통과] 스크립트 문법 검사 | pass | 실제 integrated 원출력 |
| [통과] server.sh 명령/script inventory 검사 | [통과] server.sh 명령/script inventory 검사 | pass | 실제 integrated 원출력 |
| [통과] 코드 주석 정책 검사 | [통과] 코드 주석 정책 검사 | pass | 실제 integrated 원출력 |
| [통과] 문서 링크/이미지 참조 검사 | [통과] 문서 링크/이미지 참조 검사 | pass | 실제 integrated 원출력 |
| [통과] codec test config JSON 검사 | [통과] codec test config JSON 검사 | pass | 실제 integrated 원출력 |
| [통과] 진행 중 부분 summary 렌더 smoke | [통과] 진행 중 부분 summary 렌더 smoke | pass | 실제 integrated 원출력 |
| [통과] 서버 상태 확인 | [통과] 서버 상태 확인 | pass | 실제 integrated 원출력 |
| [통과] 실행환경 진단 | [통과] 실행환경 진단 | pass | 실제 integrated 원출력 |
| [통과] codec matrix: file H264/AAC -> RTSP/WebRTC | [통과] codec matrix: file H264/AAC -> RTSP/WebRTC | pass | 실제 integrated 원출력 |
| [통과] codec matrix: file H265/AAC -> RTSP/WebRTC | [통과] codec matrix: file H265/AAC -> RTSP/WebRTC | pass | 실제 integrated 원출력 |
| [실패] codec matrix: local RTSP H265/Opus -> RTSP/WebRTC | [실패] codec matrix: local RTSP H265/Opus -> RTSP/WebRTC | fail | 실제 integrated 원출력 |

### Child 제외/skip 원출력

```text
[건너뜀] 서버 자동 시작
[건너뜀] LAN IP 외부 클라이언트 접근성
[건너뜀] 외부 RTSP upstream reachability
```

### Child 실행 명령 전수

- 1-static-scripts.log: `bash -n server.sh scripts/internal/*.sh`
- 2-script-inventory.log: `./server.sh verify-script-inventory`
- 3-code-comments.log: `./server.sh verify-code-comments`
- 4-docs-links.log: `./server.sh verify-docs-links`
- 5-config-json.log: `python3 -m json.tool config/codec_test_sources.json >/dev/null`
- 6-report-summary.log: `./server.sh summarize-reports /Users/dhseo/Workspace/mediaServer/.media_server.test/20260911-091814/test-summary.json --output /Users/dhseo/Workspace/mediaServer/.media_server.test/20260911-091814/verification_report.md --html-output /Users/dhseo/Workspace/mediaServer/.media_server.test/20260911-091814/verification_report.html `
- 7-status.log: `./server.sh status`
- 8-diagnose.log: `./server.sh diagnose`
- 9-codec-file_local_h264_aac.log: `MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=0 MEDIA_SERVER_VERIFY_SOURCE_FILTER='file_local_h264_aac' ./server.sh verify-codecs`
- 10-codec-file_local_h265_aac.log: `MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=0 MEDIA_SERVER_VERIFY_SOURCE_FILTER='file_local_h265_aac' ./server.sh verify-codecs`
- 11-codec-rtsp_local_h265_opus.log: `MEDIA_SERVER_VERIFY_INCLUDE_EXTERNAL=0 MEDIA_SERVER_VERIFY_SOURCE_FILTER='rtsp_local_h265_opus' ./server.sh verify-codecs`

### 하위 상세 PASS/FAIL 전수

| 번호 | 로그 | 원출력 | pass/fail |
| --- | --- | --- | --- |
| 1 | 2-script-inventory.log | [pass] dispatch parser recognizes explicit bash and node interpreters | pass |
| 2 | 2-script-inventory.log | [pass] server.sh dispatch targets exist and are executable | pass |
| 3 | 2-script-inventory.log | [pass] documented server.sh commands resolve to dispatch table | pass |
| 4 | 2-script-inventory.log | [pass] tracked scripts are classified and referenced | pass |
| 5 | 2-script-inventory.log | [pass] project inventory delegates script file inventory to this verifier | pass |
| 6 | 2-script-inventory.log | [pass] project inventory maps verifier families without duplicating dispatch details | pass |
| 7 | 2-script-inventory.log | [pass] CMake does not define a separate untracked CTest registry | pass |
| 8 | 2-script-inventory.log | [pass] test entry scripts are reachable from test_all | pass |
| 9 | 2-script-inventory.log | [pass] auth verifier has no hardcoded test password defaults | pass |
| 10 | 2-script-inventory.log | [pass] VA EventRecord dispatch verifier fails early and dispatches every poll by default | pass |
| 11 | 2-script-inventory.log | [pass] critical verifier pass output avoids grouped feature-result wording | pass |
| 12 | 2-script-inventory.log | [pass] user-facing JS option parsers reject unknown options | pass |
| 13 | 8-diagnose.log | [PASS] default sample exists | pass |
| 14 | 8-diagnose.log | [PASS] sample_h264.mp4 exists | pass |
| 15 | 8-diagnose.log | [PASS] sample_h265.mp4 exists | pass |
| 16 | 8-diagnose.log | [PASS] TCP 8555 is listening | pass |
| 17 | 8-diagnose.log | [PASS] HTTP 8081 is listening | pass |
| 18 | 8-diagnose.log | [PASS] HTTP health check passed (/health) | pass |
| 19 | 8-diagnose.log | [PASS] h264 RTSP probe success | pass |
| 20 | 8-diagnose.log | [PASS] h265 RTSP probe success | pass |
| 21 | 8-diagnose.log | [PASS] diagnosis: service looks healthy | pass |
| 22 | 9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /default -> h264/aac | pass |
| 23 | 9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /h264 -> h264/aac | pass |
| 24 | 9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /h265 -> hevc/aac | pass |
| 25 | 9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /opus -> h264/opus | pass |
| 26 | 9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /h265/opus -> hevc/opus | pass |
| 27 | 9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /pcmu -> h264/pcm_mulaw | pass |
| 28 | 9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /h265/pcmu -> hevc/pcm_mulaw | pass |
| 29 | 9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /pcma -> h264/pcm_alaw | pass |
| 30 | 9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: RTSP /h265/pcma -> hevc/pcm_alaw | pass |
| 31 | 9-codec-file_local_h264_aac.log | [pass] file_local_h264_aac: WebRTC signaling session created ([세션 식별자 가림]) | pass |
| 32 | 10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /default -> h264/aac | pass |
| 33 | 10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /h264 -> h264/aac | pass |
| 34 | 10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /h265 -> hevc/aac | pass |
| 35 | 10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /opus -> h264/opus | pass |
| 36 | 10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /h265/opus -> hevc/opus | pass |
| 37 | 10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /pcmu -> h264/pcm_mulaw | pass |
| 38 | 10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /h265/pcmu -> hevc/pcm_mulaw | pass |
| 39 | 10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /pcma -> h264/pcm_alaw | pass |
| 40 | 10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: RTSP /h265/pcma -> hevc/pcm_alaw | pass |
| 41 | 10-codec-file_local_h265_aac.log | [pass] file_local_h265_aac: WebRTC signaling session created ([세션 식별자 가림]) | pass |
| 42 | 11-codec-rtsp_local_h265_opus.log | [fail] rtsp_local_h265_opus: local launcher exited early | fail |

### 하위 filter/disabled skip 전수 (PASS 아님)

| 번호 | 로그 | 원출력 |
| --- | --- | --- |
| 1 | 9-codec-file_local_h264_aac.log | [skip] file_local_h265_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h264_aac |
| 2 | 9-codec-file_local_h264_aac.log | [skip] http_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h264_aac |
| 3 | 9-codec-file_local_h264_aac.log | [skip] http_local_h264_video_only: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h264_aac |
| 4 | 9-codec-file_local_h264_aac.log | [skip] hls_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h264_aac |
| 5 | 9-codec-file_local_h264_aac.log | [skip] youtube_upload_h264_aac: disabled in config |
| 6 | 9-codec-file_local_h264_aac.log | [skip] youtube_live_h264_aac: disabled in config |
| 7 | 9-codec-file_local_h264_aac.log | [skip] rtsp_local_h265_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h264_aac |
| 8 | 9-codec-file_local_h264_aac.log | [skip] rtsp_local_h264_pcmu: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h264_aac |
| 9 | 9-codec-file_local_h264_aac.log | [skip] rtsp_local_h264_pcma: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h264_aac |
| 10 | 9-codec-file_local_h264_aac.log | [skip] webrtc_local_publish_h264_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h264_aac |
| 11 | 9-codec-file_local_h264_aac.log | [skip] rtsp_external_wowza_h264_aac: disabled in config |
| 12 | 10-codec-file_local_h265_aac.log | [skip] file_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h265_aac |
| 13 | 10-codec-file_local_h265_aac.log | [skip] http_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h265_aac |
| 14 | 10-codec-file_local_h265_aac.log | [skip] http_local_h264_video_only: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h265_aac |
| 15 | 10-codec-file_local_h265_aac.log | [skip] hls_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h265_aac |
| 16 | 10-codec-file_local_h265_aac.log | [skip] youtube_upload_h264_aac: disabled in config |
| 17 | 10-codec-file_local_h265_aac.log | [skip] youtube_live_h264_aac: disabled in config |
| 18 | 10-codec-file_local_h265_aac.log | [skip] rtsp_local_h265_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h265_aac |
| 19 | 10-codec-file_local_h265_aac.log | [skip] rtsp_local_h264_pcmu: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h265_aac |
| 20 | 10-codec-file_local_h265_aac.log | [skip] rtsp_local_h264_pcma: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h265_aac |
| 21 | 10-codec-file_local_h265_aac.log | [skip] webrtc_local_publish_h264_opus: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=file_local_h265_aac |
| 22 | 10-codec-file_local_h265_aac.log | [skip] rtsp_external_wowza_h264_aac: disabled in config |
| 23 | 11-codec-rtsp_local_h265_opus.log | [skip] file_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus |
| 24 | 11-codec-rtsp_local_h265_opus.log | [skip] file_local_h265_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus |
| 25 | 11-codec-rtsp_local_h265_opus.log | [skip] http_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus |
| 26 | 11-codec-rtsp_local_h265_opus.log | [skip] http_local_h264_video_only: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus |
| 27 | 11-codec-rtsp_local_h265_opus.log | [skip] hls_local_h264_aac: filtered by MEDIA_SERVER_VERIFY_SOURCE_FILTER=rtsp_local_h265_opus |
| 28 | 11-codec-rtsp_local_h265_opus.log | [skip] youtube_upload_h264_aac: disabled in config |
| 29 | 11-codec-rtsp_local_h265_opus.log | [skip] youtube_live_h264_aac: disabled in config |

### 집계 및 관측 경계

script inventory12/0. code-comments927files/0missing/0English. docs-links229markdown/1055localLinks/22images/103anchors/76indexed/142excluded/0failures. 두 file codec은 각각10pass0fail11skip. 실패 RTSP codec은 launcher 초기 종료로 summary 미출력이며 그 전 filter/disabled7행과 fail1행만 관측했다. WebRTC 행은 signaling session 생성 검사이며 영상/장시간/UI 검증으로 확대하지 않는다. 세션 식별자2개는 가림 처리했다.

status의 TCP8555/HTTP8081 LISTEN 및 /health 성공, 두 RTSP ffprobe 성공이 관측됐다. pid file missing, log file missing 경고가 있었으며 foreground 격리 실행과 별도로 보존한다. diagnose의 외부 RTSP preflight는 제외됐다. raw sourceURL·상세debug·auth material은 이관하지 않았다.

## 최초 실패 근거

```text
[fail] rtsp_local_h265_opus: local launcher exited early
Traceback (most recent call last):
  File "/Users/dhseo/Workspace/mediaServer/scripts/internal/serve_test_rtsp_source.py", line 8, in <module>
    import gi
ModuleNotFoundError: No module named 'gi'
```

확인된 실패는 실행된 Python의 gi import 부재다. 어떤 Python이 왜 선택되었는지는 메인 독립 조사 대상이며 이 기록에서 제품 미디어 회귀 또는 단일 원인 해결을 단정하지 않는다. 이전89034 주석 gate 실패는 이번에 통과했지만 새로운 launcher 오류로 중단됐다.

## 이후 미실행 direct 항목

| 제목 | 수행내용 | 사유 |
| --- | --- | --- |
| rtsp_local_h264_pcmu | PD120 사전등록 integrated 항목 | 첫 실패 뒤 미실행; PASS 아님 |
| rtsp_local_h264_pcma | PD120 사전등록 integrated 항목 | 첫 실패 뒤 미실행; PASS 아님 |
| webrtc_local_publish_h264_opus | PD120 사전등록 integrated 항목 | 첫 실패 뒤 미실행; PASS 아님 |
| http_local_h264_aac | PD120 사전등록 integrated 항목 | 첫 실패 뒤 미실행; PASS 아님 |
| http_local_h264_video_only | PD120 사전등록 integrated 항목 | 첫 실패 뒤 미실행; PASS 아님 |
| va-overlay | PD120 사전등록 integrated 항목 | 첫 실패 뒤 미실행; PASS 아님 |
| redaction | PD120 사전등록 integrated 항목 | 첫 실패 뒤 미실행; PASS 아님 |
| rules-registry | PD120 사전등록 integrated 항목 | 첫 실패 뒤 미실행; PASS 아님 |
| va-tracking-events | PD120 사전등록 integrated 항목 | 첫 실패 뒤 미실행; PASS 아님 |
| image-analysis | PD120 사전등록 integrated 항목 | 첫 실패 뒤 미실행; PASS 아님 |

소크 반복 VA/schema/recovery/redaction/runtimeidle 모두0회, queue2/event-post/queueidle 미실행. 30분/UI/녹화 직접120분/자원추세 완료를 대체하지 않는다.

## 정리 인계

binary PID39749 aliveBefore=true/aliveAfter=false, ownedPorts8555/8081, ports-clean PASS. 아래 크기는 읽기 시점 recursive lstat 합계다. 삭제는 메인 담당이므로 이관 시점에는 원본을 유지했다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 결과 |
| --- | --- | ---: | --- | --- |
| /private/tmp/s09-predev120-9moPak | 격리 실행 root | 1732282 bytes | 메인 삭제 대기 | child 삭제 안 함 |
| /private/tmp/media_server_predev-1789085881-39615 | runner log | 28143 bytes | 메인 삭제 대기 | child 삭제 안 함 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/20260911-091814 | child log/summary/report | 12478 bytes | 메인 삭제 대기 | child 삭제 안 함 |

별도 검증/재실행/서버/코드 수정/커밋/푸시 없음. 원본 로그는 최종 evidence가 아니며 필요한 값은 이 파일로 이관했다. cleanup 완료는 메인 후속 기록으로 확인한다.
