# v3.9.0 Acceptance First Failure

schema: media-server.v390-acceptance-first-failure.v1
recordedAt: 2026-07-16T05:49:17.760Z
sourceCommitSha: 53d7fbc9bf2c8fc0004215efb56b3ba1f29db578
failedStage: server-longrun-30
failedCommand: ./server.sh verify-v390-server-longrun --duration-minutes 30 --output-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30
reproductionCommand: ./server.sh verify-v390-server-longrun --duration-minutes 30 --output-dir /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30
context: [progress] (9/9) report test; remaining=0 | == v3.9.0 server longrun runner summary == | - schema: media-server.v390-server-longrun.v2 | - result: FAIL | - durationMinutes: 30 | - stopOnFirstFail: true | - failedPhase: integrated-smoke | - failedCase: integrated-smoke | - delegatedPhaseLedgerValid: true | - longrunEvidenceStatus: real-duration-failed-no-pass-evidence | - summaryPath: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/summary.json | - reportPath: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/report.md
childFailurePhase: integrated-smoke
childFailureCase: integrated-smoke
childCleanupStatus: PASS

## Diagnostic artifact snapshots

### /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30.log

bytes: 9247
sha256: 88c2dbc84d3237aa7c02d09aedf56c678317cd013e4e34624612be1315dc4753

```text
[progress] (1/9) preflight test; remaining=8
[progress] (2/9) build test; remaining=7
[env] loaded override: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/scripts/.media_server.env
[1/2] configure: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/build-gst-onnx (ai=1, youtube=0)
-- Configuring done (0.1s)
-- Generating done (0.0s)
-- Build files have been written to: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/build-gst-onnx
[2/2] build
[ 98%] Built target media_server_runtime
[100%] Built target media_server
[done] build=/Users/dhseo/Desktop/workspace/codexTest/mediaServer/build-gst-onnx/media_server
[progress] (3/9) seed test; remaining=6
[progress] (4/9) start-server test; remaining=5
[progress] (4/9) start-server test; remaining=5
[progress] (5/9) integrated-smoke test; remaining=4
[progress] (5/9) integrated-smoke test; remaining=4
[progress] (6/9) soak-case-loop test; remaining=3
[info] Codex 인앱 브라우저 환경: predev integrated smoke의 Chrome Rule UI 자동화를 제외하고, UI 풀테스트는 인앱 브라우저 evidence로 분리합니다.
[skip] build: --skip-build
[info] server 시작: rtsp=8555 http=8081 eventPostQueue=256 authMode=off
[pass] server 시작 pid=18934
[info] integrated-smoke 시작
[info] integrated-smoke 진행 중 (30s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [9] codec matrix: file H264/AAC -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (60s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [10] codec matrix: file H265/AAC -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (90s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [11] codec matrix: local RTSP H265/Opus -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (120s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [11] codec matrix: local RTSP H265/Opus -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (150s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [11] codec matrix: local RTSP H265/Opus -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (180s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [12] codec matrix: local RTSP H264/PCMU -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (210s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [12] codec matrix: local RTSP H264/PCMU -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (240s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [12] codec matrix: local RTSP H264/PCMU -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (270s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [13] codec matrix: local RTSP H264/PCMA -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (300s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [13] codec matrix: local RTSP H264/PCMA -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (330s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [13] codec matrix: local RTSP H264/PCMA -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (360s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [14] codec matrix: local WHIP publish -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (391s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [16] codec matrix: local HTTP URI video-only -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (421s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [17] YOLO/VA overlay 검증
[info] integrated-smoke 진행 중 (451s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [18] 선택 검증: 사람 객체 자동 모자이크 image/live
[info] integrated-smoke 진행 중 (481s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [18] 선택 검증: 사람 객체 자동 모자이크 image/live
[info] integrated-smoke 진행 중 (511s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [20] 선택 검증: VA tracking 이벤트
[fail] integrated-smoke (529s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[first-fail] context: case=integrated-smoke; rtspPort=8555; httpPort=8081; httpBase=http://127.0.0.1:8081; authMode=off; workDir=/tmp/media_server_predev-1784165264-18895
[first-fail] stderr:
(empty)
[first-fail] reproduce: MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_AUTH_MODE=off ./server.sh test --no-start --skip-external --include-rules  --include-va-events --include-image-analysis --include-redaction
[not-run] external-turn-hard-gate: first failure=integrated-smoke
[not-run] soak-case-loop: first failure=integrated-smoke
[not-run] main-runtime-idle: first failure=integrated-smoke
[not-run] server-start-queue-2: first failure=integrated-smoke
[not-run] event-post-queue: first failure=integrated-smoke
[not-run] queue-runtime-idle: first failure=integrated-smoke
[pass] ports-clean
[info] predev summary=/Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/predev-summary.json
[info] summary-report 시작
[pass] summary-report (1s)
[info] predev summary=/Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/predev-summary.json
[info] summary-report refreshed log=/tmp/media_server_predev-1784165264-18895/summary_report_refresh.log
[info] predev summary=/Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/predev-summary.json
== predev 안정화 검증 요약 ==
- 통과: 3
- 실패: 1
- 건너뜀: 1
- summary: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/predev-summary.json
- report: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/predev-report.md
- report html: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/predev-report.html
- logs: /tmp/media_server_predev-1784165264-18895
[first-fail] phase: soak-case-loop
[first-fail] case: integrated-smoke
[first-fail] context: case=integrated-smoke; rtspPort=8555; httpPort=8081; httpBase=http://127.0.0.1:8081; authMode=off; workDir=/tmp/media_server_predev-1784165264-18895
[first-fail] stderr: (empty)
[first-fail] reproduce: MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_AUTH_MODE=off ./server.sh test --no-start --skip-external --include-rules  --include-va-events --include-image-analysis --include-redaction
[first-fail] phase: integrated-smoke
[first-fail] case: integrated-smoke
[first-fail] context: case=integrated-smoke; rtspPort=8555; httpPort=8081; httpBase=http://127.0.0.1:8081; authMode=off; workDir=/tmp/media_server_predev-1784165264-18895
[first-fail] stderr: (empty)
[first-fail] reproduce: MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_AUTH_MODE=off ./server.sh test --no-start --skip-external --include-rules  --include-va-events --include-image-analysis --include-redaction
[progress] (7/9) runtime-idle not-run; remaining=2
[progress] (8/9) cleanup test; remaining=1
[progress] (9/9) report test; remaining=0
== v3.9.0 server longrun runner summary ==
- schema: media-server.v390-server-longrun.v2
- result: FAIL
- durationMinutes: 30
- stopOnFirstFail: true
- failedPhase: integrated-smoke
- failedCase: integrated-smoke
- delegatedPhaseLedgerValid: true
- longrunEvidenceStatus: real-duration-failed-no-pass-evidence
- summaryPath: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/summary.json
- reportPath: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/report.md
```

### /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/soak-case-loop.log

bytes: 6225
sha256: e942c7da0941233d932bff4fb3492dac969f8f42e927db6afe98b85d42ab5d3f

```text
[info] Codex 인앱 브라우저 환경: predev integrated smoke의 Chrome Rule UI 자동화를 제외하고, UI 풀테스트는 인앱 브라우저 evidence로 분리합니다.
[skip] build: --skip-build
[info] server 시작: rtsp=8555 http=8081 eventPostQueue=256 authMode=off
[pass] server 시작 pid=18934
[info] integrated-smoke 시작
[info] integrated-smoke 진행 중 (30s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [9] codec matrix: file H264/AAC -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (60s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [10] codec matrix: file H265/AAC -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (90s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [11] codec matrix: local RTSP H265/Opus -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (120s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [11] codec matrix: local RTSP H265/Opus -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (150s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [11] codec matrix: local RTSP H265/Opus -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (180s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [12] codec matrix: local RTSP H264/PCMU -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (210s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [12] codec matrix: local RTSP H264/PCMU -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (240s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [12] codec matrix: local RTSP H264/PCMU -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (270s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [13] codec matrix: local RTSP H264/PCMA -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (300s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [13] codec matrix: local RTSP H264/PCMA -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (330s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [13] codec matrix: local RTSP H264/PCMA -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (360s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [14] codec matrix: local WHIP publish -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (391s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [16] codec matrix: local HTTP URI video-only -> RTSP/WebRTC
[info] integrated-smoke 진행 중 (421s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [17] YOLO/VA overlay 검증
[info] integrated-smoke 진행 중 (451s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [18] 선택 검증: 사람 객체 자동 모자이크 image/live
[info] integrated-smoke 진행 중 (481s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [18] 선택 검증: 사람 객체 자동 모자이크 image/live
[info] integrated-smoke 진행 중 (511s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[stdout-tail]
[stdout-tail] == [20] 선택 검증: VA tracking 이벤트
[fail] integrated-smoke (529s) log=/tmp/media_server_predev-1784165264-18895/integrated_smoke.log
[first-fail] context: case=integrated-smoke; rtspPort=8555; httpPort=8081; httpBase=http://127.0.0.1:8081; authMode=off; workDir=/tmp/media_server_predev-1784165264-18895
[first-fail] stderr:
(empty)
[first-fail] reproduce: MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_AUTH_MODE=off ./server.sh test --no-start --skip-external --include-rules  --include-va-events --include-image-analysis --include-redaction
[not-run] external-turn-hard-gate: first failure=integrated-smoke
[not-run] soak-case-loop: first failure=integrated-smoke
[not-run] main-runtime-idle: first failure=integrated-smoke
[not-run] server-start-queue-2: first failure=integrated-smoke
[not-run] event-post-queue: first failure=integrated-smoke
[not-run] queue-runtime-idle: first failure=integrated-smoke
[pass] ports-clean
[info] predev summary=/Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/predev-summary.json
[info] summary-report 시작
[pass] summary-report (1s)
[info] predev summary=/Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/predev-summary.json
[info] summary-report refreshed log=/tmp/media_server_predev-1784165264-18895/summary_report_refresh.log
[info] predev summary=/Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/predev-summary.json
== predev 안정화 검증 요약 ==
- 통과: 3
- 실패: 1
- 건너뜀: 1
- summary: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/predev-summary.json
- report: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/predev-report.md
- report html: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/predev-report.html
- logs: /tmp/media_server_predev-1784165264-18895
```

### /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/failure-artifacts/integrated-smoke-logFile-integrated_smoke.log

bytes: 13060
sha256: 3ab93ae0972a90d93dcac8b4ddd48a2171891bfaba5f2a5332128a2e8b813138

```text
[stdout]
[env] skipped local override: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/scripts/.media_server.env
MediaServer 통합 테스트 시작
- 모드: basic
- FFmpeg-free: 0
- 로그: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/.media_server.test/20260716-102745
- 기준:
  1. 코드/스크립트 기본 구조가 깨지지 않아야 함
  2. 서버가 RTSP/HTTP 포트를 열고 /health에 응답해야 함
  3. basic/full 모드는 외부망/LAN probe를 제외하고 로컬 재현성을 우선함
  4. stable/external 모드는 LAN IP 외부 클라이언트 접근성과 제3자 RTSP upstream advisory를 확인함
  5. basic/stable/full/external 모드는 안정화된 로컬 source(file/RTSP/WebRTC publish/HTTP URI)를 RTSP/WebRTC 기본 경로로 소비해야 함
  6. basic/stable/full/external 모드는 기본 설치 범위인 YOLO/VA overlay가 lab API와 RTSP에서 동작해야 함
  7. full/external 모드는 Product UI smoke, VA event, image analysis, event POST smoke, redaction까지 확인함
- 제외:
  YouTube, adaptive tuner, 외부 TURN relay
  룰 registry는 --include-rules, Rule UI는 --include-rule-ui, 이동 이벤트는 --include-va-events,
  이미지 분석은 --include-image-analysis, WebRTC ICE는 --include-webrtc-ice,
  URI 장기 검증은 --include-uri-longrun, event POST smoke는 --include-event-post,
  사람 모자이크는 --include-redaction으로 선택 실행 가능
== [1] 스크립트 문법 검사
[통과] 스크립트 문법 검사
== [2] server.sh 명령/script inventory 검사
[통과] server.sh 명령/script inventory 검사
== [3] 코드 주석 정책 검사
[실패] 코드 주석 정책 검사
[원인] 파일 상단 용도 주석 또는 한글 설명 주석 정책이 깨졌습니다.
[로그] /Users/dhseo/Desktop/workspace/codexTest/mediaServer/.media_server.test/20260716-102745/3-code-comments.log
---- 실패 로그 tail (/Users/dhseo/Desktop/workspace/codexTest/mediaServer/.media_server.test/20260716-102745/3-code-comments.log) ----
    - src/ingress/webrtc_http_server.cpp:5243:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6553 function
    - src/ingress/webrtc_http_server.cpp:5291:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6590 function
    - src/ingress/webrtc_http_server.cpp:5305:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6610 function
    - src/ingress/webrtc_http_server.cpp:5332:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6627 function
    - src/ingress/webrtc_http_server.cpp:5408:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6693 function
    - src/ingress/webrtc_http_server.cpp:5417:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6701 function
    - src/ingress/webrtc_http_server.cpp:5475:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6748 function
    - src/ingress/webrtc_http_server.cpp:5526:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6788 function
    - src/ingress/webrtc_http_server.cpp:5551:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6803 function
    - src/ingress/webrtc_http_server.cpp:5587:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6829 function
    - src/ingress/webrtc_http_server.cpp:5640:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6871 function
    - src/ingress/webrtc_http_server.cpp:5684:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6905 function
    - src/ingress/webrtc_http_server.cpp:5734:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6944 function
    - src/ingress/webrtc_http_server.cpp:5891:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7100 function
    - src/ingress/webrtc_http_server.cpp:5920:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7116 function
    - src/ingress/webrtc_http_server.cpp:5986:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7184 function
    - src/ingress/webrtc_http_server.cpp:6009:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7206 function
    - src/ingress/webrtc_http_server.cpp:6029:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7225 function
    - src/ingress/webrtc_http_server.cpp:6054:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7249 function
    - src/ingress/webrtc_http_server.cpp:6078:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7272 function
    - src/ingress/webrtc_http_server.cpp:6094:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7287 function
    - src/ingress/webrtc_http_server.cpp:6108:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7300 function
    - src/ingress/webrtc_http_server.cpp:6141:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7332 function
    - src/ingress/webrtc_http_server.cpp:6191:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7381 function
    - src/ingress/webrtc_http_server.cpp:6221:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7410 function
    - src/ingress/webrtc_http_server.cpp:6234:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7422 function
    - src/ingress/webrtc_http_server.cpp:6247:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7434 function
    - src/ingress/webrtc_http_server.cpp:6260:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7446 function
    - src/ingress/webrtc_http_server.cpp:6325:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7510 function
    - src/ingress/webrtc_http_server.cpp:6361:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7550 function
    - src/ingress/webrtc_http_server.cpp:6369:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7557 function
    - src/ingress/webrtc_http_server.cpp:6383:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7570 function
    - src/ingress/webrtc_http_server.cpp:6402:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7588 function
    - src/ingress/webrtc_http_server.cpp:6407:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7592 function
    - src/ingress/webrtc_http_server.cpp:6486:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7670 function
    - src/ingress/webrtc_http_server.cpp:6505:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7688 function
    - src/ingress/webrtc_http_server.cpp:6512:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7694 function
    - src/ingress/webrtc_http_server.cpp:6545:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7726 function
    - src/ingress/webrtc_http_server.cpp:6557:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7737 function
    - src/ingress/webrtc_http_server.cpp:6578:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7757 function
    - src/ingress/webrtc_http_server.cpp:6583:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7761 function
    - src/ingress/webrtc_http_server.cpp:6588:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7765 function
    - src/ingress/webrtc_http_server.cpp:6594:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7778 function
    - src/ingress/webrtc_http_server.cpp:6694:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7877 function
    - src/ingress/webrtc_http_server.cpp:6707:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7889 function
    - src/ingress/webrtc_http_server.cpp:6712:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7893 function
    - src/ingress/webrtc_http_server.cpp:6725:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7905 function
    - src/ingress/webrtc_http_server.cpp:6826:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8005 function
    - src/ingress/webrtc_http_server.cpp:6989:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8167 function
    - src/ingress/webrtc_http_server.cpp:7031:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8208 function
    - src/ingress/webrtc_http_server.cpp:7146:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8319 function
    - src/ingress/webrtc_http_server.cpp:7183:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8334 function
    - src/ingress/webrtc_http_server.cpp:7197:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8347 function
    - src/ingress/webrtc_http_server.cpp:7213:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8362 function
    - src/ingress/webrtc_http_server.cpp:7233:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8381 function
    - src/ingress/webrtc_http_server.cpp:7249:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8396 function
    - src/ingress/webrtc_http_server.cpp:7266:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8458 function
    - src/ingress/webrtc_http_server.cpp:7275:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8466 function
    - src/ingress/webrtc_http_server.cpp:7280:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8470 function
    - src/ingress/webrtc_http_server.cpp:7285:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8474 function
    - src/ingress/webrtc_http_server.cpp:7290:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8478 function
    - src/ingress/webrtc_http_server.cpp:7295:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8482 function
    - src/ingress/webrtc_http_server.cpp:7307:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8493 function
    - src/ingress/webrtc_http_server.cpp:7323:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8508 function
    - src/ingress/webrtc_http_server.cpp:7332:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8516 function
    - src/ingress/webrtc_http_server.cpp:7342:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8525 function
    - src/ingress/webrtc_http_server.cpp:7350:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8532 function
    - src/ingress/webrtc_http_server.cpp:7414:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8595 function
    - src/ingress/webrtc_http_server.cpp:7464:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8644 function
    - src/ingress/webrtc_http_server.cpp:7528:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8651 function
    - src/ingress/webrtc_http_server.cpp:7603:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8752 function
    - src/ingress/webrtc_http_server.cpp:7620:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8795 function
    - src/ingress/webrtc_http_server.cpp:7639:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8818 function
    - src/ingress/webrtc_http_server.cpp:7677:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8846 function
    - src/ingress/webrtc_http_server.cpp:7738:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8876 function
  == Code comment policy summary ==
  - files: 734
  - missing headers: 44
  - english-only comments: 2178
---- 실패 로그 tail 끝 ----
== [4] 문서 링크/이미지 참조 검사
[통과] 문서 링크/이미지 참조 검사
== [5] codec test config JSON 검사
[통과] codec test config JSON 검사
== [6] 검증 summary Markdown/HTML 생성 smoke
[통과] 검증 summary Markdown/HTML 생성 smoke
[건너뜀] 서버 자동 시작
[사유] --no-start 옵션이 지정되어 이미 실행 중인 서버만 검사합니다.
== [7] 서버 상태 확인
[통과] 서버 상태 확인
== [8] 실행환경 진단
[통과] 실행환경 진단
[건너뜀] LAN IP 외부 클라이언트 접근성
[사유] --skip-external 옵션으로 생략했습니다.
[건너뜀] 외부 RTSP upstream reachability
[사유] --skip-external 또는 --quick 옵션으로 생략했습니다.
== [9] codec matrix: file H264/AAC -> RTSP/WebRTC
[통과] codec matrix: file H264/AAC -> RTSP/WebRTC
== [10] codec matrix: file H265/AAC -> RTSP/WebRTC
[통과] codec matrix: file H265/AAC -> RTSP/WebRTC
== [11] codec matrix: local RTSP H265/Opus -> RTSP/WebRTC
[통과] codec matrix: local RTSP H265/Opus -> RTSP/WebRTC
== [12] codec matrix: local RTSP H264/PCMU -> RTSP/WebRTC
[통과] codec matrix: local RTSP H264/PCMU -> RTSP/WebRTC
== [13] codec matrix: local RTSP H264/PCMA -> RTSP/WebRTC
[통과] codec matrix: local RTSP H264/PCMA -> RTSP/WebRTC
== [14] codec matrix: local WHIP publish -> RTSP/WebRTC
[통과] codec matrix: local WHIP publish -> RTSP/WebRTC
== [15] codec matrix: local HTTP URI H264/AAC -> RTSP/WebRTC
[통과] codec matrix: local HTTP URI H264/AAC -> RTSP/WebRTC
== [16] codec matrix: local HTTP URI video-only -> RTSP/WebRTC
[통과] codec matrix: local HTTP URI video-only -> RTSP/WebRTC
[건너뜀] HLS/외부 HTTP URI source
[사유] 네트워크와 upstream 상태 영향이 큰 항목이라 기본 안정 테스트에서 제외합니다.
[건너뜀] HTTP/HLS URI 장기 검증 선택 검증
[사유] HLS/외부 HTTP URI는 환경 영향이 커 기본 테스트에서 제외합니다. 필요하면 --include-uri-longrun을 사용하세요.
== [17] YOLO/VA overlay 검증
[통과] YOLO/VA overlay 검증
[건너뜀] event POST 선택 검증
[사유] event POST worker smoke는 full/predev 기준입니다. 장기 반복은 전용 longrun 명령으로 분리합니다.
== [18] 선택 검증: 사람 객체 자동 모자이크 image/live
[통과] 선택 검증: 사람 객체 자동 모자이크 image/live
[건너뜀] WebRTC ICE 선택 검증
[사유] 실제 TURN/auth/ICE policy 검증은 환경 의존 항목이라 기본 테스트에서 제외합니다. 필요하면 --include-webrtc-ice를 사용하세요.
== [19] 선택 검증: profile/rule registry API
[통과] 선택 검증: profile/rule registry API
[건너뜀] Rule/Profile UI 선택 검증
[사유] 브라우저 자동화가 필요한 항목이라 기본 테스트에서 제외합니다. 필요하면 --include-rule-ui를 사용하세요.
[건너뜀] Product UI smoke 선택 검증
[사유] release 전 UI smoke 기준입니다. full/external 또는 --include-product-ui-smoke에서 실행합니다.
== [20] 선택 검증: VA tracking 이벤트
[통과] 선택 검증: VA tracking 이벤트
== [21] 선택 검증: 정적 이미지 분석 API + tracking category
[통과] 선택 검증: 정적 이미지 분석 API + tracking category
== 통합 테스트 요약 ==
- 통과: 20
- 실패: 1
- 건너뜀: 9
- 소요 시간: 528s (8.8m)
- 상세 로그: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/.media_server.test/20260716-102745
[결론] 실패 항목이 있습니다. 위 한글 원인과 개별 로그를 기준으로 수정하세요.
[stderr]
```

### /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/failure-artifacts/integrated-smoke-stdoutFile-integrated_smoke.stdout.log

bytes: 13042
sha256: 99b5bed3b8ef6c076046468fbc944f8295a7f75936dafe5e00ed3a190386ec9a

```text
[env] skipped local override: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/scripts/.media_server.env
MediaServer 통합 테스트 시작
- 모드: basic
- FFmpeg-free: 0
- 로그: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/.media_server.test/20260716-102745
- 기준:
  1. 코드/스크립트 기본 구조가 깨지지 않아야 함
  2. 서버가 RTSP/HTTP 포트를 열고 /health에 응답해야 함
  3. basic/full 모드는 외부망/LAN probe를 제외하고 로컬 재현성을 우선함
  4. stable/external 모드는 LAN IP 외부 클라이언트 접근성과 제3자 RTSP upstream advisory를 확인함
  5. basic/stable/full/external 모드는 안정화된 로컬 source(file/RTSP/WebRTC publish/HTTP URI)를 RTSP/WebRTC 기본 경로로 소비해야 함
  6. basic/stable/full/external 모드는 기본 설치 범위인 YOLO/VA overlay가 lab API와 RTSP에서 동작해야 함
  7. full/external 모드는 Product UI smoke, VA event, image analysis, event POST smoke, redaction까지 확인함
- 제외:
  YouTube, adaptive tuner, 외부 TURN relay
  룰 registry는 --include-rules, Rule UI는 --include-rule-ui, 이동 이벤트는 --include-va-events,
  이미지 분석은 --include-image-analysis, WebRTC ICE는 --include-webrtc-ice,
  URI 장기 검증은 --include-uri-longrun, event POST smoke는 --include-event-post,
  사람 모자이크는 --include-redaction으로 선택 실행 가능
== [1] 스크립트 문법 검사
[통과] 스크립트 문법 검사
== [2] server.sh 명령/script inventory 검사
[통과] server.sh 명령/script inventory 검사
== [3] 코드 주석 정책 검사
[실패] 코드 주석 정책 검사
[원인] 파일 상단 용도 주석 또는 한글 설명 주석 정책이 깨졌습니다.
[로그] /Users/dhseo/Desktop/workspace/codexTest/mediaServer/.media_server.test/20260716-102745/3-code-comments.log
---- 실패 로그 tail (/Users/dhseo/Desktop/workspace/codexTest/mediaServer/.media_server.test/20260716-102745/3-code-comments.log) ----
    - src/ingress/webrtc_http_server.cpp:5243:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6553 function
    - src/ingress/webrtc_http_server.cpp:5291:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6590 function
    - src/ingress/webrtc_http_server.cpp:5305:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6610 function
    - src/ingress/webrtc_http_server.cpp:5332:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6627 function
    - src/ingress/webrtc_http_server.cpp:5408:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6693 function
    - src/ingress/webrtc_http_server.cpp:5417:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6701 function
    - src/ingress/webrtc_http_server.cpp:5475:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6748 function
    - src/ingress/webrtc_http_server.cpp:5526:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6788 function
    - src/ingress/webrtc_http_server.cpp:5551:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6803 function
    - src/ingress/webrtc_http_server.cpp:5587:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6829 function
    - src/ingress/webrtc_http_server.cpp:5640:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6871 function
    - src/ingress/webrtc_http_server.cpp:5684:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6905 function
    - src/ingress/webrtc_http_server.cpp:5734:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 6944 function
    - src/ingress/webrtc_http_server.cpp:5891:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7100 function
    - src/ingress/webrtc_http_server.cpp:5920:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7116 function
    - src/ingress/webrtc_http_server.cpp:5986:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7184 function
    - src/ingress/webrtc_http_server.cpp:6009:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7206 function
    - src/ingress/webrtc_http_server.cpp:6029:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7225 function
    - src/ingress/webrtc_http_server.cpp:6054:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7249 function
    - src/ingress/webrtc_http_server.cpp:6078:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7272 function
    - src/ingress/webrtc_http_server.cpp:6094:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7287 function
    - src/ingress/webrtc_http_server.cpp:6108:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7300 function
    - src/ingress/webrtc_http_server.cpp:6141:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7332 function
    - src/ingress/webrtc_http_server.cpp:6191:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7381 function
    - src/ingress/webrtc_http_server.cpp:6221:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7410 function
    - src/ingress/webrtc_http_server.cpp:6234:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7422 function
    - src/ingress/webrtc_http_server.cpp:6247:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7434 function
    - src/ingress/webrtc_http_server.cpp:6260:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7446 function
    - src/ingress/webrtc_http_server.cpp:6325:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7510 function
    - src/ingress/webrtc_http_server.cpp:6361:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7550 function
    - src/ingress/webrtc_http_server.cpp:6369:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7557 function
    - src/ingress/webrtc_http_server.cpp:6383:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7570 function
    - src/ingress/webrtc_http_server.cpp:6402:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7588 function
    - src/ingress/webrtc_http_server.cpp:6407:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7592 function
    - src/ingress/webrtc_http_server.cpp:6486:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7670 function
    - src/ingress/webrtc_http_server.cpp:6505:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7688 function
    - src/ingress/webrtc_http_server.cpp:6512:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7694 function
    - src/ingress/webrtc_http_server.cpp:6545:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7726 function
    - src/ingress/webrtc_http_server.cpp:6557:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7737 function
    - src/ingress/webrtc_http_server.cpp:6578:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7757 function
    - src/ingress/webrtc_http_server.cpp:6583:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7761 function
    - src/ingress/webrtc_http_server.cpp:6588:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7765 function
    - src/ingress/webrtc_http_server.cpp:6594:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7778 function
    - src/ingress/webrtc_http_server.cpp:6694:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7877 function
    - src/ingress/webrtc_http_server.cpp:6707:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7889 function
    - src/ingress/webrtc_http_server.cpp:6712:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7893 function
    - src/ingress/webrtc_http_server.cpp:6725:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 7905 function
    - src/ingress/webrtc_http_server.cpp:6826:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8005 function
    - src/ingress/webrtc_http_server.cpp:6989:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8167 function
    - src/ingress/webrtc_http_server.cpp:7031:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8208 function
    - src/ingress/webrtc_http_server.cpp:7146:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8319 function
    - src/ingress/webrtc_http_server.cpp:7183:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8334 function
    - src/ingress/webrtc_http_server.cpp:7197:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8347 function
    - src/ingress/webrtc_http_server.cpp:7213:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8362 function
    - src/ingress/webrtc_http_server.cpp:7233:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8381 function
    - src/ingress/webrtc_http_server.cpp:7249:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8396 function
    - src/ingress/webrtc_http_server.cpp:7266:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8458 function
    - src/ingress/webrtc_http_server.cpp:7275:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8466 function
    - src/ingress/webrtc_http_server.cpp:7280:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8470 function
    - src/ingress/webrtc_http_server.cpp:7285:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8474 function
    - src/ingress/webrtc_http_server.cpp:7290:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8478 function
    - src/ingress/webrtc_http_server.cpp:7295:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8482 function
    - src/ingress/webrtc_http_server.cpp:7307:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8493 function
    - src/ingress/webrtc_http_server.cpp:7323:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8508 function
    - src/ingress/webrtc_http_server.cpp:7332:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8516 function
    - src/ingress/webrtc_http_server.cpp:7342:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8525 function
    - src/ingress/webrtc_http_server.cpp:7350:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8532 function
    - src/ingress/webrtc_http_server.cpp:7414:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8595 function
    - src/ingress/webrtc_http_server.cpp:7464:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8644 function
    - src/ingress/webrtc_http_server.cpp:7528:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8651 function
    - src/ingress/webrtc_http_server.cpp:7603:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8752 function
    - src/ingress/webrtc_http_server.cpp:7620:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8795 function
    - src/ingress/webrtc_http_server.cpp:7639:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8818 function
    - src/ingress/webrtc_http_server.cpp:7677:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8846 function
    - src/ingress/webrtc_http_server.cpp:7738:// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 8876 function
  == Code comment policy summary ==
  - files: 734
  - missing headers: 44
  - english-only comments: 2178
---- 실패 로그 tail 끝 ----
== [4] 문서 링크/이미지 참조 검사
[통과] 문서 링크/이미지 참조 검사
== [5] codec test config JSON 검사
[통과] codec test config JSON 검사
== [6] 검증 summary Markdown/HTML 생성 smoke
[통과] 검증 summary Markdown/HTML 생성 smoke
[건너뜀] 서버 자동 시작
[사유] --no-start 옵션이 지정되어 이미 실행 중인 서버만 검사합니다.
== [7] 서버 상태 확인
[통과] 서버 상태 확인
== [8] 실행환경 진단
[통과] 실행환경 진단
[건너뜀] LAN IP 외부 클라이언트 접근성
[사유] --skip-external 옵션으로 생략했습니다.
[건너뜀] 외부 RTSP upstream reachability
[사유] --skip-external 또는 --quick 옵션으로 생략했습니다.
== [9] codec matrix: file H264/AAC -> RTSP/WebRTC
[통과] codec matrix: file H264/AAC -> RTSP/WebRTC
== [10] codec matrix: file H265/AAC -> RTSP/WebRTC
[통과] codec matrix: file H265/AAC -> RTSP/WebRTC
== [11] codec matrix: local RTSP H265/Opus -> RTSP/WebRTC
[통과] codec matrix: local RTSP H265/Opus -> RTSP/WebRTC
== [12] codec matrix: local RTSP H264/PCMU -> RTSP/WebRTC
[통과] codec matrix: local RTSP H264/PCMU -> RTSP/WebRTC
== [13] codec matrix: local RTSP H264/PCMA -> RTSP/WebRTC
[통과] codec matrix: local RTSP H264/PCMA -> RTSP/WebRTC
== [14] codec matrix: local WHIP publish -> RTSP/WebRTC
[통과] codec matrix: local WHIP publish -> RTSP/WebRTC
== [15] codec matrix: local HTTP URI H264/AAC -> RTSP/WebRTC
[통과] codec matrix: local HTTP URI H264/AAC -> RTSP/WebRTC
== [16] codec matrix: local HTTP URI video-only -> RTSP/WebRTC
[통과] codec matrix: local HTTP URI video-only -> RTSP/WebRTC
[건너뜀] HLS/외부 HTTP URI source
[사유] 네트워크와 upstream 상태 영향이 큰 항목이라 기본 안정 테스트에서 제외합니다.
[건너뜀] HTTP/HLS URI 장기 검증 선택 검증
[사유] HLS/외부 HTTP URI는 환경 영향이 커 기본 테스트에서 제외합니다. 필요하면 --include-uri-longrun을 사용하세요.
== [17] YOLO/VA overlay 검증
[통과] YOLO/VA overlay 검증
[건너뜀] event POST 선택 검증
[사유] event POST worker smoke는 full/predev 기준입니다. 장기 반복은 전용 longrun 명령으로 분리합니다.
== [18] 선택 검증: 사람 객체 자동 모자이크 image/live
[통과] 선택 검증: 사람 객체 자동 모자이크 image/live
[건너뜀] WebRTC ICE 선택 검증
[사유] 실제 TURN/auth/ICE policy 검증은 환경 의존 항목이라 기본 테스트에서 제외합니다. 필요하면 --include-webrtc-ice를 사용하세요.
== [19] 선택 검증: profile/rule registry API
[통과] 선택 검증: profile/rule registry API
[건너뜀] Rule/Profile UI 선택 검증
[사유] 브라우저 자동화가 필요한 항목이라 기본 테스트에서 제외합니다. 필요하면 --include-rule-ui를 사용하세요.
[건너뜀] Product UI smoke 선택 검증
[사유] release 전 UI smoke 기준입니다. full/external 또는 --include-product-ui-smoke에서 실행합니다.
== [20] 선택 검증: VA tracking 이벤트
[통과] 선택 검증: VA tracking 이벤트
== [21] 선택 검증: 정적 이미지 분석 API + tracking category
[통과] 선택 검증: 정적 이미지 분석 API + tracking category
== 통합 테스트 요약 ==
- 통과: 20
- 실패: 1
- 건너뜀: 9
- 소요 시간: 528s (8.8m)
- 상세 로그: /Users/dhseo/Desktop/workspace/codexTest/mediaServer/.media_server.test/20260716-102745
[결론] 실패 항목이 있습니다. 위 한글 원인과 개별 로그를 기준으로 수정하세요.
```

### /Users/dhseo/Desktop/workspace/codexTest/mediaServer/docs/release-artifacts/v3.9.0/test-acceptance-current-final/runs/v390-test-acceptance-20260716011558-9052/server-longrun-30/failure-artifacts/integrated-smoke-stderrFile-integrated_smoke.stderr.log

bytes: 1
sha256: 01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b

```text
```
