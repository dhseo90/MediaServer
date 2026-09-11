# S09 predev120 89034 실행 기록

개발·테스트 증적 독자용 보존 기록이다. 실행 lifecycle은 2026-09-11의 실패 1회이며, 결과 source-of-truth는 원로그에서 이관한 아래 전수표와 중앙 release-test-records다. 제품/정책 설명 또는 120분 완료 증거가 아니다.

명령: `./server.sh verify-predev --soak-minutes 120 --fail-fast`. 메인 실행 session 89034, exit 1/signal null, startedAt 1789084830723, endedAt 1789084856731, elapsed 26008ms. runner monotonic 25초, integrated 19초, child 17초. token start/end/consumed 미집계: 실행 도구가 토큰 계수를 제공하지 않음. source: execution.log/exit.json/predev-summary.json 및 child 원로그.

Soak 요청 7200초이나 실제 진입 0회/0분이다. predev summary 4 pass/1 fail/0 skip/6 notRun; child 2 pass/1 fail/0 skip. summary-report는 집계 제외 후처리 PASS라 steps의 실행 행은 5 pass/1 fail이다. 카운트 차이를 누락 또는 soak PASS로 해석하지 않는다.

## 외부 runner 실행 행 전수

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| build | `cmake --build build-gst-onnx`; 1s | pass | 원 summary steps |
| server-start-queue-256 | `run_server_foreground`; 0s | pass | 원 summary steps |
| integrated-smoke | `MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_AUTH_MODE=off ./server.sh test --no-start --fail-fast --skip-external --include-rules  --include-va-events --include-image-analysis --include-redaction`; 19s | fail | 원 summary steps |
| ports-clean | `lsof predev ports`; 0s | pass | 원 summary steps |
| summary-report | `./server.sh summarize-reports /private/tmp/s09-predev120-j832NR/predev-summary.json --output /private/tmp/s09-predev120-j832NR/predev-report.md --html-output /private/tmp/s09-predev120-j832NR/predev-report.html `; 1s | pass | 후처리이며 summary 집계에서 제외 |

## 외부 runner 미실행 행 전수

| 제목 | 수행내용 | 사유·완료 evidence 경계 |
| --- | --- | --- |
| external-turn-hard-gate | `./server.sh verify-webrtc-ice --external-turn` | not run after first failure integrated-smoke: integrated smoke failure; 미실행, PASS 아님 |
| soak-case-loop | `duration soak case loop` | not run after first failure integrated-smoke: pre-soak failure; 미실행, PASS 아님 |
| main-runtime-idle | `curl -fsS http://127.0.0.1:8081/lab/runtime/status` | not run after first failure integrated-smoke: pre-runtime-idle failure; 미실행, PASS 아님 |
| server-start-queue-2 | `run_server_foreground` | not run after first failure integrated-smoke: earlier first failure; 미실행, PASS 아님 |
| event-post-queue | `./server.sh verify-event-post --mode queue` | not run after first failure integrated-smoke: earlier first failure; 미실행, PASS 아님 |
| queue-runtime-idle | `curl -fsS http://127.0.0.1:8081/lab/runtime/status` | not run after first failure integrated-smoke: earlier first failure; 미실행, PASS 아님 |

external-turn은 원래 includeExternalTurn=false이며 출력의 not-run 행을 그대로 보존했다. 30분/UI/녹화 직접 120분/자원 누수 판정은 이 실행으로 대체하지 않는다.

## child 실행 command 전수

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 스크립트 문법 검사 | 1-static-scripts.log 원출력 | pass | 첫 command |
| server.sh 명령/script inventory 검사 | 2-script-inventory.log, 아래 12개 | pass | 둘째 command |
| 코드 주석 정책 검사 | 3-code-comments.log, 926 files/71 missing headers/1 English-only | fail | 첫 실패 후 fail-fast 중단 |

### child 개별 원출력 전수

#### 1-static-scripts.log

```text
명령: bash -n server.sh scripts/internal/*.sh
```

#### 2-script-inventory.log

```text
명령: ./server.sh verify-script-inventory

[pass] dispatch parser recognizes explicit bash and node interpreters
[pass] server.sh dispatch targets exist and are executable
[pass] documented server.sh commands resolve to dispatch table
[pass] tracked scripts are classified and referenced
[pass] project inventory delegates script file inventory to this verifier
[pass] project inventory maps verifier families without duplicating dispatch details
[pass] CMake does not define a separate untracked CTest registry
[pass] test entry scripts are reachable from test_all
[pass] auth verifier has no hardcoded test password defaults
[pass] VA EventRecord dispatch verifier fails early and dispatches every poll by default
[pass] critical verifier pass output avoids grouped feature-result wording
[pass] user-facing JS option parsers reject unknown options

== Script inventory verification summary ==
- pass: 12
- fail: 0
```

#### 3-code-comments.log

```text
명령: ./server.sh verify-code-comments

[fail] 상단 용도 주석 누락
  - docs/release-artifacts/v4.1.0/20260904-s05-identity-fix/resume-verification.mjs
  - docs/release-artifacts/v4.1.0/20260904-s05-identity-fix/verify-actual-link-reader.mjs
  - docs/release-artifacts/v4.1.0/20260904-s05-identity-fix/verify-actual-link-reader.test.mjs
  - docs/release-artifacts/v4.1.0/20260904-s05-identity-fix/verify-actual.mjs
  - docs/release-artifacts/v4.1.0/20260904-s05-identity-red/reproduce.mjs
  - docs/release-artifacts/v4.1.0/20260905-s05-identity-actual-rerun/verify-actual-rerun.mjs
  - include/ingress/recording_application_service.h
  - include/ingress/recording_request_gate.h
  - include/recording/analysis_observation_projector.h
  - include/recording/recording_finalize_recovery.h
  - include/recording/recording_media_inspector.h
  - include/recording/recording_read_service.h
  - include/recording/recording_startup_recovery.h
  - include/recording/recording_time_snapshot.h
  - scripts/internal/gst_environment_test.py
  - scripts/internal/gst_plugin_cache.py
  - scripts/internal/recording_corruption_smoke.cpp
  - scripts/internal/recording_fallback_binding_smoke.cpp
  - scripts/internal/recording_finalize_integration_smoke.cpp
  - scripts/internal/recording_finalize_recovery_smoke.cpp
  - scripts/internal/recording_foundation_auth_helpers.mjs
  - scripts/internal/recording_foundation_auth_helpers.test.mjs
  - scripts/internal/recording_foundation_observer.mjs
  - scripts/internal/recording_foundation_observer.test.mjs
  - scripts/internal/recording_foundation_runtime_smoke.cpp
  - scripts/internal/recording_foundation_source_scope.test.mjs
  - scripts/internal/recording_foundation_suite.mjs
  - scripts/internal/recording_foundation_suite.test.mjs
  - scripts/internal/recording_journal_reader.mjs
  - scripts/internal/recording_journal_reader.test.mjs
  - scripts/internal/recording_longrun_progress.mjs
  - scripts/internal/recording_longrun_progress.test.mjs
  - scripts/internal/recording_longrun_summary.mjs
  - scripts/internal/recording_longrun_summary.test.mjs
  - scripts/internal/recording_media_inspector_limits_smoke.cpp
  - scripts/internal/recording_media_inspector_smoke.cpp
  - scripts/internal/recording_observation_runtime_smoke.cpp
  - scripts/internal/recording_observation_smoke.cpp
  - scripts/internal/recording_process_metrics_fixture.cpp
  - scripts/internal/recording_process_metrics.cpp
  - scripts/internal/recording_process_metrics.test.mjs
  - scripts/internal/recording_recovery_smoke.cpp
  - scripts/internal/recording_startup_smoke.cpp
  - scripts/internal/recording_time_snapshot_smoke.cpp
  - scripts/internal/recording_timeline_smoke.cpp
  - scripts/internal/script_dispatch_parser.mjs
  - scripts/internal/script_dispatch_parser.test.mjs
  - scripts/internal/server_state_isolation_test.py
  - scripts/internal/verify_v410_recording_corruption.sh
  - scripts/internal/verify_v410_recording_fallback_binding.sh
  - scripts/internal/verify_v410_recording_finalize_recovery.sh
  - scripts/internal/verify_v410_recording_fixture_compatibility.mjs
  - scripts/internal/verify_v410_recording_fixture_compatibility.test.mjs
  - scripts/internal/verify_v410_recording_foundation_runtime.sh
  - scripts/internal/verify_v410_recording_foundation.mjs
  - scripts/internal/verify_v410_recording_foundation.sh
  - scripts/internal/verify_v410_recording_longrun.sh
  - scripts/internal/verify_v410_recording_media_inspector.sh
  - scripts/internal/verify_v410_recording_observation_runtime.sh
  - scripts/internal/verify_v410_recording_observations.sh
  - scripts/internal/verify_v410_recording_recovery.sh
  - scripts/internal/verify_v410_recording_startup.mjs
  - scripts/internal/verify_v410_recording_startup.sh
  - scripts/internal/verify_v410_recording_timeline.sh
  - scripts/internal/verify_v410_recording_ui_contract.mjs
  - src/ingress/recording_application_service.cpp
  - src/recording/analysis_observation_projector.cpp
  - src/recording/recording_finalize_recovery.cpp
  - src/recording/recording_media_inspector.cpp
  - src/recording/recording_read_service.cpp
  - src/recording/recording_startup_recovery.cpp
[fail] 한글 설명이 없는 주석
  - src/recording/analysis_observation_projector.cpp:22:    // stable bounded token; catalog independently rejects any differing identity sharing a token.

== Code comment policy summary ==
- files: 926
- missing headers: 71
- english-only comments: 1
```

### 주석 오류별 전수 목록 / 최소 수정 후보

상단 8줄 내 `파일 용도`, `파일 요약`, `동작 요약` 중 정책 표식이 필요하다(`verify_code_comments.mjs:33–41`, `config/code_comment_policy.json`). 한글 설명이 이미 있어도 이 표식이 없으면 실패한다. 아래는 원출력 순서이며 아직 파일을 수정하지 않았다. 기존 설명 앞 표식 추가 또는 짧은 용도 주석 추가만 제안한다. 보존 artifact 6개는 역사 증거 변경 판단이 별도로 필요하다.

| 번호 | 실패 대상 원문 | pass/fail | 최소 수정 후보 |
| --- | --- | --- | --- |
| 1 | `docs/release-artifacts/v4.1.0/20260904-s05-identity-fix/resume-verification.mjs` | fail | 역사 artifact: 수정 금지, 메인 별도 정책 판단 |
| 2 | `docs/release-artifacts/v4.1.0/20260904-s05-identity-fix/verify-actual-link-reader.mjs` | fail | 역사 artifact: 수정 금지, 메인 별도 정책 판단 |
| 3 | `docs/release-artifacts/v4.1.0/20260904-s05-identity-fix/verify-actual-link-reader.test.mjs` | fail | 역사 artifact: 수정 금지, 메인 별도 정책 판단 |
| 4 | `docs/release-artifacts/v4.1.0/20260904-s05-identity-fix/verify-actual.mjs` | fail | 역사 artifact: 수정 금지, 메인 별도 정책 판단 |
| 5 | `docs/release-artifacts/v4.1.0/20260904-s05-identity-red/reproduce.mjs` | fail | 역사 artifact: 수정 금지, 메인 별도 정책 판단 |
| 6 | `docs/release-artifacts/v4.1.0/20260905-s05-identity-actual-rerun/verify-actual-rerun.mjs` | fail | 역사 artifact: 수정 금지, 메인 별도 정책 판단 |
| 7 | `include/ingress/recording_application_service.h` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 8 | `include/ingress/recording_request_gate.h` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 9 | `include/recording/analysis_observation_projector.h` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 10 | `include/recording/recording_finalize_recovery.h` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 11 | `include/recording/recording_media_inspector.h` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 12 | `include/recording/recording_read_service.h` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 13 | `include/recording/recording_startup_recovery.h` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 14 | `include/recording/recording_time_snapshot.h` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 15 | `scripts/internal/gst_environment_test.py` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 16 | `scripts/internal/gst_plugin_cache.py` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 17 | `scripts/internal/recording_corruption_smoke.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 18 | `scripts/internal/recording_fallback_binding_smoke.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 19 | `scripts/internal/recording_finalize_integration_smoke.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 20 | `scripts/internal/recording_finalize_recovery_smoke.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 21 | `scripts/internal/recording_foundation_auth_helpers.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 22 | `scripts/internal/recording_foundation_auth_helpers.test.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 23 | `scripts/internal/recording_foundation_observer.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 24 | `scripts/internal/recording_foundation_observer.test.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 25 | `scripts/internal/recording_foundation_runtime_smoke.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 26 | `scripts/internal/recording_foundation_source_scope.test.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 27 | `scripts/internal/recording_foundation_suite.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 28 | `scripts/internal/recording_foundation_suite.test.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 29 | `scripts/internal/recording_journal_reader.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 30 | `scripts/internal/recording_journal_reader.test.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 31 | `scripts/internal/recording_longrun_progress.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 32 | `scripts/internal/recording_longrun_progress.test.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 33 | `scripts/internal/recording_longrun_summary.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 34 | `scripts/internal/recording_longrun_summary.test.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 35 | `scripts/internal/recording_media_inspector_limits_smoke.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 36 | `scripts/internal/recording_media_inspector_smoke.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 37 | `scripts/internal/recording_observation_runtime_smoke.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 38 | `scripts/internal/recording_observation_smoke.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 39 | `scripts/internal/recording_process_metrics_fixture.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 40 | `scripts/internal/recording_process_metrics.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 41 | `scripts/internal/recording_process_metrics.test.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 42 | `scripts/internal/recording_recovery_smoke.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 43 | `scripts/internal/recording_startup_smoke.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 44 | `scripts/internal/recording_time_snapshot_smoke.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 45 | `scripts/internal/recording_timeline_smoke.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 46 | `scripts/internal/script_dispatch_parser.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 47 | `scripts/internal/script_dispatch_parser.test.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 48 | `scripts/internal/server_state_isolation_test.py` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 49 | `scripts/internal/verify_v410_recording_corruption.sh` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 50 | `scripts/internal/verify_v410_recording_fallback_binding.sh` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 51 | `scripts/internal/verify_v410_recording_finalize_recovery.sh` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 52 | `scripts/internal/verify_v410_recording_fixture_compatibility.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 53 | `scripts/internal/verify_v410_recording_fixture_compatibility.test.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 54 | `scripts/internal/verify_v410_recording_foundation_runtime.sh` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 55 | `scripts/internal/verify_v410_recording_foundation.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 56 | `scripts/internal/verify_v410_recording_foundation.sh` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 57 | `scripts/internal/verify_v410_recording_longrun.sh` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 58 | `scripts/internal/verify_v410_recording_media_inspector.sh` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 59 | `scripts/internal/verify_v410_recording_observation_runtime.sh` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 60 | `scripts/internal/verify_v410_recording_observations.sh` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 61 | `scripts/internal/verify_v410_recording_recovery.sh` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 62 | `scripts/internal/verify_v410_recording_startup.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 63 | `scripts/internal/verify_v410_recording_startup.sh` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 64 | `scripts/internal/verify_v410_recording_timeline.sh` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 65 | `scripts/internal/verify_v410_recording_ui_contract.mjs` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 66 | `src/ingress/recording_application_service.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 67 | `src/recording/analysis_observation_projector.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 68 | `src/recording/recording_finalize_recovery.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 69 | `src/recording/recording_media_inspector.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 70 | `src/recording/recording_read_service.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 71 | `src/recording/recording_startup_recovery.cpp` | fail | 상단 8줄 내 용도 표식 추가 후보, 실행 코드 불변 |
| 72 | `src/recording/analysis_observation_projector.cpp:22:    // stable bounded token; catalog independently rejects any differing identity sharing a token.` | fail | 영어 주석의 같은 의미 한글 번역 후보 |

## fail-fast 뒤 child 미실행

다음은 이번 사전등록의 후속 direct command이며 실행 결과가 없다. 원 child skipCount=0은 이 목록의 PASS를 뜻하지 않는다.

| 제목 | 수행내용 | 사유 |
| --- | --- | --- |
| docs-links | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| config-json | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| report-summary | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| status | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| diagnose | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| file_local_h264_aac | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| file_local_h265_aac | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| rtsp_local_h265_opus | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| rtsp_local_h264_pcmu | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| rtsp_local_h264_pcma | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| webrtc_local_publish_h264_opus | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| http_local_h264_aac | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| http_local_h264_video_only | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| va-overlay | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| redaction | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| rules-registry | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| va-tracking-events | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |
| image-analysis | PD120 integrated 사전등록 항목 | code-comments 첫 실패 후 미실행; PASS 아님 |

## 프로세스·포트·보존 및 cleanup 인계

wrapper 시작 출력 PID 37841, binary ledger PID 37842 (`build-gst-onnx/media_server`), aliveBefore=true/aliveAfter=false, ownedPorts=8555/8081. ports-clean PASS. 메인은 lsof 4개 포트 부재를 직접 확인했다(추가 2개 번호는 이 원로그에서 미확인).

| 경로 | 종류 | 삭제 전 크기 | 조치 | 결과·근거 |
| --- | --- | ---: | --- | --- |
| /private/tmp/s09-predev120-j832NR | 격리 root/실행·요약·report·상태 | 1731334 bytes | 메인 삭제 대기 | 메인 크기 확인, child 삭제 안 함 |
| /tmp/media_server_predev-1789084830-37793 | runner 상세 log | 21708 bytes | 메인 삭제 대기 | 메인 크기 확인, child 삭제 안 함 |
| /Users/dhseo/Workspace/mediaServer/.media_server.test/20260911-090034 | child 3개 log/summary | 5776 bytes | 메인 삭제 대기 | 메인 크기 확인, child 삭제 안 함 |

원 execution.log 2109 bytes, predev-summary.json 8777, exit.json 92, child static 49/inventory 919/comments 4469/summary 339 bytes를 읽었다. 원로그 전부를 공개하는 대신 결과 원문·실패 경로만 이관했으며, 서버 raw log/source URL/auth 값은 보존하지 않았다. 임시 경로는 재현 출처일 뿐 최종 evidence 링크가 아니다. cleanup 완료 판정은 메인 삭제 후 기록해야 한다.
