# Release Evidence Index

이 문서는 v1.8.0 release trust hardening 이후 release close-out evidence를 한곳에서
찾기 위한 색인입니다. README 첫 화면에는 세부 evidence 목록을 반복하지 않고,
이 문서와 [release-policy.md](./release-policy.md), [development-backlog.md](./development-backlog.md)로
연결합니다.

## 기록 원칙

- 기능별 테스트 결과 행은 `PASS` 또는 `FAIL`만 기록합니다.
- UI 풀테스트 대상인데 열지 않은 화면, 직접 클릭하지 않은 기능, 확인하지 않은 screenshot은
  해당 기능 결과를 `FAIL`로 기록합니다.
- 사용자가 실기기/외부 credential 같은 이유로 명시 제외한 항목은 기능 결과 행에서 빼고
  별도 `제외 기록`에만 남깁니다.
- 실행하지 않은 스크립트/수동 승인 gate는 기능 결과 행을 만들지 않고 release evidence
  실행 상태에 `미실행` 또는 `manual-not-run`으로만 기록합니다.
- 자동 smoke, raw JSON, API 응답만으로 manual UI evidence를 완료했다고 쓰지 않습니다.
- 30분 soak와 120분 longrun은 서로 대체하지 않습니다.
- 스크립트 테스트와 UI 풀테스트는 별도 evidence 영역입니다. 30분/120분 안정화 PASS는
  UI 풀테스트 PASS가 아니고, UI 풀테스트 PASS도 30분/120분 안정화 PASS가 아닙니다.
- 모든 안정화/30분/120분/UI 테스트 기록에는 토큰 사용량을 함께 남깁니다. 최소
  기록 필드는 `token start`, `token end`, `token consumed`, `elapsed`, `source`
  입니다. Codex goal usage처럼 자동 집계값이 있으면 그 값을 우선하고, 없으면
  `source: manual-not-available`과 함께 미집계 사유를 적습니다.
- tag, push, GitHub Release 생성은 사용자 명시 승인 전에는 완료로 기록하지 않습니다.

## Evidence Matrix

| 영역 | Evidence | 대표 명령/출처 | 테스트 판정 / 실행 상태 기록 |
| --- | --- | --- | --- |
| GitHub Latest Release | GitHub Releases latest/list/view, `/releases/latest`, repository page Releases/Latest link, remote tag/branch, `media-server.published-release-evidence.v1` report, `media-server.github-metadata-fallback-policy.v1` failure class | `./server.sh verify-release-metadata --published --report <report.md> --json-report <report.json>`, `./server.sh verify-release-metadata --self-test-fallback-policy` | `PASS` 또는 `FAIL` |
| Release metadata/docs drift | VERSION, CMake, README, docs index, release policy, backlog | `./server.sh verify-release-metadata`, `./server.sh verify-docs-links` | `PASS` 또는 `FAIL` |
| Docs UI assets | managed screenshot manifest, capture script ownership, direct image review checklist | `./server.sh verify-docs-ui-assets` | 실행한 테스트 행은 `PASS` 또는 `FAIL`; 열지 않은 이미지는 별도 `미확인` |
| Manual UI evidence | `/setup`, `/login`, `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/client/live`, `/client/dashboard` direct click index | `./server.sh verify-manual-ui-evidence`, manual browser review | `PASS` 또는 `FAIL` |
| Feature test inventory | 기능별 UI 필요 여부, 테스트 필요 여부, 테스트 영역, PASS 판정 기준 | [project-feature-test-inventory.md](./project-feature-test-inventory.md) | 기준표, 실행 evidence 아님 |
| English UI visual copy QA | English capture path, nav/card/table wrapping, Korean residue review | `./server.sh verify-ui-copy-i18n-parity`, `./server.sh verify-ops-client-ui --screenshots` | 실행한 테스트 행은 `PASS` 또는 `FAIL`; 열지 않은 화면은 별도 `미확인` |
| Release close-out runbook | branch close, PR merge, main sync, tag, GitHub Release, Latest 확인, release branch 삭제, next branch sync, `media-server.release-closeout-one-shot-gate.v1` fail-stop rehearsal | `./server.sh verify-release-closeout-helper --dry-run`, `./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run` | dry-run은 planned/manual-not-run, 실제 publish 결과는 release publication evidence row로 분리 |
| Feature scope decision gate | 새 기능 후보를 v1.8 안정화 gate 안에서 구현으로 승격하지 않는 절차 | `./server.sh verify-feature-scope-gate` | `PASS` 또는 `FAIL` |
| PR checks | Preflight, licensing/artifact guardrails, required checks | GitHub Actions UI/API | 실행 확인 시 `PASS` 또는 `FAIL`; 열지 않은 Actions는 별도 `미확인` |
| Release notes | source-only scope, non-goals, verification, not-run/unverified | [release-policy.md](./release-policy.md) | 검토 행은 `PASS` 또는 `FAIL`; 실행하지 않은 gate는 별도 `미실행` |
| VLM close-out readiness | `media-server.vlm-close-out-readiness.v1` report, script/UI/30분/120분/provider/publish gate 분리, V200-S18 boundary | [vlm-close-out-readiness.md](./vlm-close-out-readiness.md), `./server.sh verify-vlm-closeout-readiness` | report/verifier는 `PASS` 또는 `FAIL`; UI/30분/120분 미실행은 별도 실행 상태 |
| Script smoke/stability | build/static/auth/API/media verifier, short smoke, skip reason | `./server.sh build`, 범위별 `verify-*` 명령 | 실행한 테스트 행은 `PASS` 또는 `FAIL`; 실행하지 않은 명령은 별도 `미실행` |
| 30분 soak | 사용자 명시 요청 시 30분 안정성 테스트 | `./server.sh verify-predev --soak-minutes 30` | 실행한 테스트 행은 `PASS` 또는 `FAIL`; 요청이 없으면 별도 `미실행` |
| 장시간/외부 gate | 120분 longrun, real ONVIF, external TURN/WHEP, YouTube real URL | release runbook/manual report | 실행한 테스트 행은 `PASS` 또는 `FAIL`; 제외/미실행/미확인은 별도 기록 |

## Test Token Usage Ledger

테스트 실행 기록은 평균 비용 산출을 위해 아래 형식으로 누적합니다. 테스트 결과와
토큰 사용량은 서로 다른 값입니다. 토큰 사용량이 적거나 많다는 이유로 PASS/FAIL을
바꾸지 않습니다.

| date | run id | test area | scope | verdict | token start | token end | token consumed | elapsed | token usage source | evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-05-25 | stability-script-smoke-20260525 | 안정화 테스트 | build, manual UI seed dry-run, auth bootstrap/users/routes, ops/client UI smoke+screenshot, rule UI, rules roundtrip, analysis state, VA replay, VA events, runtime console, SSE/WS/WebRTC metadata, `git diff --check` | PASS | 0 | 147,501 | 147,501 | 10m 5s | Codex goal usage | `/private/tmp/media_server_stability_20260525_ops_client_ui_screens`, `/private/tmp/media_server_stability_20260525_va_runtime_console_summary.json`, `/private/tmp/media_server_stability_20260525_va_metadata_sidechannel_summary.json`, `/private/tmp/media_server_stability_20260525_webrtc_va_metadata_summary.json` |
| 2026-05-25 | predev-30min-20260525 | 30분 soak | `./server.sh verify-predev --soak-minutes 30 --rtsp-port 8568 --http-port 8094`; integrated smoke, 22 soak iterations of VA events/Event POST schema/Event POST recovery/redaction/runtime idle, queue mode, port cleanup | PASS | 0 | 86,657 | 86,657 | 39m 29s test / 41m 42s goal snapshot | Codex goal usage snapshot after evidence verification before closeout | `/private/tmp/media_server_30min_20260525_summary.json`, `/private/tmp/media_server_30min_20260525_report.md`, `/private/tmp/media_server_30min_20260525_report.html`, `/tmp/media_server_predev-1779637404-28970` |
| 2026-05-25 | ui-fulltest-restart-20260525-oehkFG | UI 풀테스트 | 새 throwaway data로 `/setup`, `/login`, `/ops/*`, `/client/*` 브라우저 조작, 56개 responsive/theme screenshot, EventRecord sample 대조, UI 대상 기능 ID 220개 PASS. UI 비대상 간접 안정화 행 `RULE-099` 포함 결과표 221 PASS / 0 FAIL. `/ops/events` rule/scenario별 EventRecord history coverage 390px/1180px 대조, WHEP/source/rule/client/auth scope 보강, native dialog guard와 `SAFE-021` blocking dialog policy 확인 | PASS | 916,832 | 2,608,727 | 1,691,895 | goal continuation; 후속 30분 predev durationSec=2399 | Codex goal usage | historical standalone result merged into this ledger row, `/private/tmp/media_server_iab_auth_VuKUEe/browser`, `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json`, `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json`, `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` |
| 2026-05-31 | v200-vlm-closeout-readiness-20260531 | VLM close-out readiness | `media-server.vlm-close-out-readiness.v1` report, S15 rehearsal, S16 side-effect record, S17 longrun/UI criteria, release evidence/metadata/docs static verifier. UI 풀테스트 미실행, 30분 soak 미실행, 120분 longrun 미실행, provider field smoke 미실행, GitHub Release publish manual-not-run을 PASS로 대체하지 않음 | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | manual-not-available | [vlm-close-out-readiness.md](./vlm-close-out-readiness.md) |
| 2026-05-31 | v200-restart-stability-20260531 | 안정화 테스트 | v2.0.0 재시작 안정성 묶음: build, project/feature inventory, VLM S00~S18 verifier, release metadata/docs/script inventory, auth bootstrap/users/routes, Ops/Client static smoke, Rule UI headless smoke, rules roundtrip, analysis state, VA replay/events/runtime console, WebRTC/sidechannel/WS metadata, Event POST disabled/enabled schema, `git diff --check`. UI 풀테스트와 30분/120분 longrun은 별도 | PASS | 미집계 | 미집계 | 미집계 | command output/log files 기준 | manual-not-available | historical v2.0.0 standalone test record merged into this ledger row, `/private/tmp/media_server_v200_restart_20260531_*.log`, `/private/tmp/media_server_v200_restart_20260531_rule_ui_artifacts` |
| 2026-05-31 | v200-restart-30min-20260531 | 30분 soak | `./server.sh verify-predev --soak-minutes 30 --rtsp-port 8568 --http-port 8094`; integrated smoke `[20] 선택 검증: Rule/Profile 카테고리 UI`에서 `Chrome executable not found`로 FAIL. summary/report/html은 생성 전 실패/중단. 실패 뒤 남은 process는 종료했고 8094/8568 listener 없음 확인 | FAIL | 미집계 | 미집계 | 미집계 | command output/log files 기준 | manual-not-available | historical v2.0.0 standalone test record merged into this ledger row, `/private/tmp/media_server_v200_restart_30min_20260531_run.log`, `.media_server.test/20260531-212512/20-rule-ui-smoke.log` |
| 2026-05-31 | v200-restart-30min-retry-20260531 | 30분 soak | Chrome path propagation, Event POST schema payload selection, code comment policy를 수정한 뒤 `./server.sh verify-predev --soak-minutes 30 --rtsp-port 8568 --http-port 8094` 재실행. build, integrated smoke, 22 soak iterations of VA events/Event POST schema/Event POST recovery/redaction/runtime idle, queue mode, ports-clean, summary-report PASS | PASS | 미집계 | 624,960 | 미집계 | command summary 2378s; goal snapshot 4095s | Codex goal usage end snapshot plus command summary. token start was not captured, so consumed remains 미집계 | historical v2.0.0 standalone test record merged into this ledger row, `/private/tmp/media_server_v200_restart_30min_20260531_summary.json`, `/private/tmp/media_server_v200_restart_30min_20260531_report.md`, `/private/tmp/media_server_v200_restart_30min_20260531_report.html`, `/tmp/media_server_predev-1780233647-89718`, `/private/tmp/media_server_v200_restart_30min_20260531_run.log` |
| 2026-06-01 | v200-inapp-policy-stability-20260601 | 안정화 테스트 | Codex 실행 시 인앱 브라우저 primary evidence 정책 변경 후 재안정성 묶음: build, static/VLM/auth gates, `test --basic --skip-external --fail-fast`, Ops/Client static contract smoke, rules roundtrip, analysis state, VA replay/events, runtime console, WebRTC/SSE/WS metadata, Event POST disabled/schema/recovery, `git diff --check`. Chrome/Rule UI headless smoke는 primary evidence로 사용하지 않고 UI 풀테스트는 별도 진행 중 | PASS | 0 | 294,042 | 294,042 | goal snapshot 1131s; basic command 466s | Codex goal usage snapshot at stability step end | historical v2.0.0 standalone test record merged into this ledger row, `/private/tmp/media_server_v200_inapp_stability_*.log`, `.media_server.test/20260601-000215`, `/private/tmp/media_server_v200_inapp_stability_event_post_*_summary.json` |
| 2026-06-01 | v200-inapp-policy-30min-20260601 | 30분 soak | Codex 실행 시 인앱 브라우저 primary evidence 정책 변경 후 `./server.sh verify-predev --soak-minutes 30 --rtsp-port 8568 --http-port 8094` 재실행. build, integrated smoke, 22회 soak iterations of VA events/Event POST schema/Event POST recovery/redaction/runtime idle, queue mode, ports-clean, summary-report PASS. Chrome Rule UI 자동화는 기본 제외했고 UI 풀테스트 PASS로 계산하지 않음 | PASS | 334,637 | 492,353 | 157,716 | command durationSec 2365; goal snapshot delta 2385s | Codex goal usage snapshot before/after 30분 step | historical v2.0.0 standalone test record merged into this ledger row, `/private/tmp/media_server_v200_inapp_30min_20260601_summary.json`, `/private/tmp/media_server_v200_inapp_30min_20260601_report.md`, `/private/tmp/media_server_v200_inapp_30min_20260601_report.html`, `/private/tmp/media_server_v200_inapp_30min_20260601_run.log`, `/tmp/media_server_predev-1780240771-16862` |
| 2026-06-01 | v200-inapp-policy-ui-fulltest-20260601 | UI 풀테스트 | Codex 인앱 브라우저 primary evidence로 `/setup`, `/login`, `/ops/*`, `/client/*`, `/ops/vlm` route/action/responsive/theme를 직접 확인하고, 인앱 evidence를 one-shot wrapper에 연결. 인앱 모드가 없는 legacy click/EventRecord verifier는 `MEDIA_SERVER_UI_BROWSER_MODE=chrome` + `MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1` 예외로 보조 실행. UI 대상 기능 ID 238개, RULE rows, VA seed matrix, 12개 EventRecord event/scenario key 구조 검증 PASS. 실제 VA EventRecord dispatch도 records-only 저장소에서 PASS | PASS | 492,353 | 1,404,241 | 911,888 | goal snapshot delta after 30분 step through UI close-out | Codex goal usage snapshot before/after UI step | historical standalone result merged into this ledger row, `/private/tmp/media_server_v200_iab_ui_fulltest_20260601/in-app-browser-ui-evidence.json`, `/private/tmp/media_server_v200_ui_one_shot_20260601_retry2/summary.json`, `/private/tmp/media_server_v200_ui_event_records_history_scope_390_20260601/event-history-coverage.json`, `/private/tmp/media_server_v200_ui_event_records_dispatch_records_only_20260601.log` |
| 2026-06-01 | v200-inapp-policy-120min-20260601 | 120분 longrun | `/goal 120분 테스트` 지시 후 `./server.sh verify-predev --soak-minutes 120 --rtsp-port 8568 --http-port 8094` 재실행. build, integrated smoke, 87회 soak iterations of VA events/Event POST schema/Event POST recovery/redaction/runtime idle, main runtime idle, Event POST queue mode, ports-clean, summary-report PASS. 최초 sandbox RTSP bind 실패와 docs index 누락 실패는 수정/재실행했고 최종 retry2 PASS | PASS | 96,618 | 296,735 | 200,117 | command durationSec 7758; successful-run goal snapshot delta 7779s; whole 120분 goal snapshot 8262s | Codex goal usage snapshot before successful retry and after evidence verification. 이슈 처리 포함 goal total은 0 -> 296,735 | historical v2.0.0 standalone test record merged into this ledger row, `/private/tmp/media_server_v200_120min_20260601_retry2_summary.json`, `/private/tmp/media_server_v200_120min_20260601_retry2_report.md`, `/private/tmp/media_server_v200_120min_20260601_retry2_report.html`, `/private/tmp/media_server_v200_120min_20260601_retry2_run.log`, `/tmp/media_server_predev-1780269327-81605` |
| 2026-06-01 | v200-release-publication-20260601 | release publication | Initial PR #19 release publish plus follow-up README/VLM documentation sync. `v2.0.0` annotated tag now points at the current published `main` release commit after protected-branch PR checks, GitHub Release publish, `verify-release-metadata --published --release-branch main`, remote `v2.0.0` branch deletion, and `v2.1.0` branch creation. GitHub PR checks `guardrails`/`static-gates` PASS, check-run blocking annotations 0 | PASS | 0 | 379,651 | 379,651 | goal elapsed 24m 24s plus README/tag follow-up command evidence | Codex goal usage plus GitHub/command output | [GitHub Release v2.0.0](https://github.com/dhseo90/MediaServer/releases/tag/v2.0.0), [PR #19](https://github.com/dhseo90/MediaServer/pull/19), [PR #20](https://github.com/dhseo90/MediaServer/pull/20), `/tmp/media_server_v200_published_metadata.md`, `/tmp/media_server_v200_published_metadata_after_readme.md`, `/tmp/media_server_pr19_annotations.json` |
| 2026-06-02 | v200-signed-tag-verification-20260602 | release publication | Signed tag follow-up: PR #22 merged the signed release tag policy, GitHub SSH signing key `dhseo_mac_pro_m5_signing` was registered for the release signer, `v2.0.0` was recreated as a signed annotated tag on published `main`, GitHub API tag verification returned `verified=true` and `reason=valid`, published metadata verifier returned 21 PASS / 0 FAIL, `v2.1.0` was synced to `main`, and the temporary PR branch was deleted. | PASS | 미집계 | 미집계 | 미집계 | command/API output 기준 | manual-not-available | [GitHub Release v2.0.0](https://github.com/dhseo90/MediaServer/releases/tag/v2.0.0), [PR #22](https://github.com/dhseo90/MediaServer/pull/22), `git -c gpg.format=ssh ... tag -v v2.0.0`, GitHub API `/git/tags/<tag-object>`, `./server.sh verify-release-metadata --published` |
| 2026-06-03 | v210-inapp-ui-fulltest-20260603 | UI 풀테스트 | v2.1.0 Codex 인앱 브라우저 UI 풀테스트. `/setup`, `/login`, `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/ops/vlm`, `/client/live`, `/client/dashboard`, `/client/events`, role guard, responsive/theme, VLM opt-in UI, rule/source/client reflection을 기능 ID 단위로 확인. Runner 결과 UI targets 244, PASS 244, FAIL 0, exclusions 0, manualSpotReviews 1. SRC-022 allowed rule reflection, AUTH-029 operator guard, RULE/SAFE boundary rows는 수정/재검수 후 PASS | PASS | 0 | 1,676,250 | 1,676,250 | goal elapsed 6170s | Codex goal usage plus runner output | historical standalone result merged into this ledger row, `/private/tmp/media_server_ui_fulltest_20260603_codex/manual-ui-evidence.normalized.json`, `/private/tmp/media_server_ui_fulltest_20260603_codex/manual-ui-evidence.runner.md`, `/private/tmp/media_server_ui_fulltest_20260603_codex/manual-ui-evidence.runner.json` |
| 2026-06-04 | v220-inapp-ui-fulltest-20260604 | UI 풀테스트 | v2.2.0 F02~F06 Codex 인앱 브라우저 UI 직접 검수. `/setup`, `/login`, `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/ops/vlm`, `/client/live`, `/client/dashboard`, `/client/events`, `/client/request-access`, `/invite/setup` route/control/action, role guard, responsive/theme, VLM privacy/default-off/profile containment, client/viewer redaction, presence EventRecord UI 반영을 확인. one-shot wrapper final PASS. 30분/120분, real provider/external endpoint, full 12-key VA occurrence, legacy 244 UI-target full inventory result gate는 별도 미실행/미확인으로 분리 | PASS | 108,429 | 508,127 | 399,698 | goal snapshot 1967s | Codex goal usage plus in-app evidence and one-shot output | historical standalone result merged into this ledger row, `/tmp/media_server_v220_inapp_evidence/v220-inapp-evidence.json`, `/tmp/media_server_v220_ui_fulltest_one_shot_final/summary.json`, `/tmp/media_server_v220_ui_fulltest_one_shot_final/summary.md` |
| 2026-06-05 | v230-s01-eventrecord-matrix-20260605 | UI 풀테스트 | v2.3.0 S01 Full VA EventRecord occurrence matrix. Codex 인앱 브라우저로 `/ops/events`를 390px/1180px에서 직접 열어 12개 `v230-s01-ui-history-*` row와 10개 event type을 확인하고, clean `event-history-coverage.json`으로 exact 12-key occurrence matrix를 `--require-occurrence-matrix`에서 닫음. `verify-va-events --dispatch-records`는 records-only retry에서 stored=2026, failed=0, dropped=0 PASS, `verify-va-replay`는 14 cases PASS. 30분/120분과 실장비/외부 endpoint는 미실행 | PASS | 0 | 895,242 | 895,242 | goal snapshot 2396s | Codex goal usage plus in-app evidence and verifier output | [manual-ui-result-2026-06-05-v230-s01-eventrecord-matrix.md](./manual-ui-result-2026-06-05-v230-s01-eventrecord-matrix.md), `/tmp/media_server_v230_s01_inapp_events_evidence_20260605_203256/in-app-ops-events-evidence.json`, `/tmp/media_server_v230_s01_event_history_scope_clean_20260605_203256/event-history-coverage.json`, `/tmp/media_server_v230_s01_va_eventrecord_matrix_clean_20260605_203256.json` |
| 2026-06-05 | v230-s02-four-test-evidence-consistency-20260605 | 안정화 테스트 | v2.3.0 S02 4대 테스트 evidence 정합성. `./server.sh verify-v230-test-evidence-consistency`의 `media-server.v230-test-evidence-consistency.v1` report로 release evidence index, feature inventory coverage, longrun separation, manual UI evidence 기준이 안정화/30분/120분/UI 풀테스트 네 영역만 쓰는지 확인했습니다. `verify-release-evidence-index`, `verify-feature-inventory-coverage`, `verify-longrun-separation`, `verify-manual-ui-evidence`, `git diff --check`를 companion gate로 둡니다. 이 항목은 V230-S02 evidence 정합성 gate이며, 30분/120분/UI 풀테스트 실행 evidence를 대체하지 않습니다. | PASS | 24,603 | 190,554 | 165,951 | goal snapshot 472s | Codex goal usage snapshot at S02 evidence update | `/tmp/media_server_v230_s02_evidence_consistency.md`, `/tmp/media_server_v230_s02_evidence_consistency.json` |

Not run for `stability-script-smoke-20260525`: 30분 soak, 120분 longrun, manual UI 풀테스트.
Not run for `predev-30min-20260525`: 120분 longrun, manual UI 풀테스트.
Not run for `ui-fulltest-restart-20260525-oehkFG`: 120분 longrun, main merge, release tag, GitHub Release 생성, publish 후 `verify-release-metadata --published` 재확인.
Not run for `v200-vlm-closeout-readiness-20260531`: UI 풀테스트, 30분 soak, 120분 longrun, cloud provider field smoke, main merge, release tag, GitHub Release 생성, publish 후 `verify-release-metadata --published` 재확인.
Not run for `v200-restart-stability-20260531`: 30분 soak, 120분 longrun, UI 풀테스트, cloud provider field smoke, main merge, release tag, GitHub Release 생성, push.
Not run for `v200-restart-30min-20260531`: 120분 longrun, UI 풀테스트, cloud provider field smoke, main merge, release tag, GitHub Release 생성, push.
Not run for `v200-restart-30min-retry-20260531`: 120분 longrun, UI 풀테스트, cloud provider field smoke, main merge, release tag, GitHub Release 생성, push.
Not run for `v200-inapp-policy-stability-20260601`: 30분 soak was run separately as `v200-inapp-policy-30min-20260601`; 인앱 브라우저 UI 풀테스트는 별도 `v200-inapp-policy-ui-fulltest-20260601`, 120분 longrun은 별도 `v200-inapp-policy-120min-20260601`에서 실행. cloud provider field smoke, main merge, release tag, GitHub Release 생성, push were not run in that stability step.
Not run for `v200-inapp-policy-30min-20260601`: cloud provider field smoke, main merge, release tag, GitHub Release 생성, push. UI 풀테스트는 별도 `v200-inapp-policy-ui-fulltest-20260601`, 120분 longrun은 별도 `v200-inapp-policy-120min-20260601`에서 실행.
Not run for `v200-inapp-policy-ui-fulltest-20260601`: real cloud provider call, credential 저장, external TURN field gate, main merge, release tag, GitHub Release 생성, push. 120분 longrun은 별도 `v200-inapp-policy-120min-20260601`에서 실행.
Not run for `v200-inapp-policy-120min-20260601`: `verify-va-runtime-console-longrun --duration-minutes 120`, real cloud provider call, credential 저장, external TURN field gate, main merge, release tag, GitHub Release 생성, push.
Not run for `v210-inapp-ui-fulltest-20260603`: 안정화/build release gate, 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, real cloud provider call, credential 저장, external TURN/WHEP field gate, main merge, release tag, GitHub Release 생성, push. 이 항목은 UI 풀테스트 evidence이며, release close-out 스크립트/게시 evidence는 별도 단계에서 실행/기록합니다.
Not run for `v220-inapp-ui-fulltest-20260604`: 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, real cloud provider call, credential 저장, real ONVIF device, external WHEP/WHIP/TURN endpoint, full 12-key VA EventRecord occurrence matrix, legacy 244 UI-target full inventory result gate, main merge, release tag, GitHub Release 생성, push. 이 항목은 F02~F06 UI 직접 검수 evidence이며, release close-out 스크립트/게시 evidence는 별도 단계에서 실행/기록합니다.
Not run for `v230-s01-eventrecord-matrix-20260605`: 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, real ONVIF device, external WHEP/WHIP/TURN endpoint, real cloud provider call, main merge, release tag, GitHub Release 생성, push. 이 항목은 V230-S01 exact 12-key EventRecord occurrence matrix evidence이며, 다른 v2.3.0 roadmap category evidence를 대체하지 않습니다.
Not run for `v230-s02-four-test-evidence-consistency-20260605`: 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, UI 풀테스트 직접 조작, real ONVIF device, external WHEP/WHIP/TURN endpoint, real cloud provider call, main merge, release tag, GitHub Release 생성, push. 이 항목은 V230-S02 evidence 정합성 gate이며, 30분/120분/UI 풀테스트 실행 evidence를 대체하지 않습니다.

Release publication was later completed by `v200-release-publication-20260601`.
Per-test "not run" rows above remain scoped to the individual test run that did
not perform publication actions.

## v2.3.0 Entry Baseline Report

v2.3.0 개발 진입 전에는 `media-server.v230-entry-baseline-report.v1` report로
v2.2.0 source-only/live-only release baseline, active `v2.3.0` branch, 그리고
Event POST/WebRTC/SSE/WS/Auth/Rule/media path freeze를 분리해 기록합니다. 이
report는 v2.3.0 active roadmap을 열지만, UI 풀테스트, 30분 soak, 120분 longrun,
field smoke, published GitHub metadata를 자동 실행하거나 PASS로 대체하지 않습니다.

```bash
./server.sh verify-v230-entry-baseline \
  --report /tmp/media_server_v230_entry_baseline.md \
  --json-report /tmp/media_server_v230_entry_baseline.json
```

- 기준 release: `v2.2.0`; 기준 branch: `v2.3.0`.
- baseline primary: v2.2.0 source-only/live-only release baseline, v2.2.0 F02~F06
  인앱 브라우저 UI evidence, `verify-integrator-contract-artifact` freeze artifact.
- baseline fallback: live GitHub published state나 field endpoint를 현재 환경에서 확인하지
  못하면 해당 상태는 `미확인` 또는 `manual-not-run`으로 남기고, recorded/local evidence만
  baseline으로 사용합니다.
- 제외: UI 구현, full 12-key VA occurrence 실행, VLM runtime/provider 호출,
  provider credential 저장, Event POST/WebRTC/SSE/WS payload 변경, Auth/session/scope
  변경, Rule/Profile payload 변경, RTSP/WebRTC media path 변경.
- current-run companion gates: `verify-release-metadata`,
  `verify-release-evidence-index`, `verify-integrator-contract-artifact`,
  `verify-event-post --mode schema --http-base <enabled auth-off server>`,
  `verify-auth-routes`, `verify-webrtc-va-metadata`, `verify-va-metadata-sidechannel`,
  `verify-ws-metadata`, `git diff --check`.
- 안정화/UI/30분/120분/field/published metadata 상태를 서로 대체하지 않습니다.

## v2.0.0 Test Restart 2026-05-31

사용자 지시 범위는 `기존 테스트 기록 리스트 삭제 후 다시 만들기`,
`안정성 테스트 진행`, `30분 테스트 진행`입니다. 이전 실행은 채팅방 깜빡임 이슈로
중단했고, 이번 절은 재작성한 테스트 기록 리스트만 가리킵니다. 120분 longrun과
UI 풀테스트는 별도 지시 전까지 미실행으로 둡니다.

- 상세 기록: 위 Test Token Usage Ledger의 `v200-restart-*`와
  `v200-inapp-policy-*` 행
- 실행 순서: 테스트 기록 리스트 재작성 -> 안정성 테스트 -> 30분 테스트
- 제외: 120분 longrun, UI 풀테스트, cloud provider field smoke, main merge,
  release tag, GitHub Release, push
- 판정 경계: 안정성/30분 PASS는 UI 풀테스트 PASS가 아닙니다.

## v2.0.0 Entry Baseline Report

v1.9.0 종료 후 v2.0.0 신규 기능으로 들어가기 전에는
`media-server.v190-entry-baseline-report.v1` report로 release close-out evidence를
한 번에 모읍니다. 이 report는 안정화, 30분, UI 풀테스트, 120분 longrun, CI 상태,
release metadata, published metadata, v2.0.0 entry freeze gate를 같은 표에 두되
서로 대체하지 않습니다.

```bash
./server.sh verify-v190-entry-baseline \
  --report /tmp/media_server_v190_entry_baseline.md \
  --json-report /tmp/media_server_v190_entry_baseline.json
```

- 30분, UI 풀테스트, 120분 longrun은 이 명령에서 실행하지 않습니다. 사용자 명시
  승인 전에는 각각 `미실행`으로만 기록합니다.
- CI 상태는 GitHub Actions UI/API를 실제 확인하기 전까지 `미확인`으로 기록합니다.
- `verify-release-metadata`, `verify-release-evidence-index`,
  `verify-post-release-reconciliation`, `verify-release-closeout-helper --dry-run --one-shot-dry-run`,
  `verify-integrator-contract-artifact` 결과를 close-out 시점에 report evidence로
  연결합니다.
- v2.0.0 release publication is now recorded separately as
  `v200-release-publication-20260601`; this historical entry-baseline command
  still does not execute tag, push, GitHub Release, branch deletion, or next
  branch sync by itself.

## v2.1.0 Entry Baseline Report

v2.1.0 개발 진입 전에는 `media-server.v210-entry-baseline-report.v1` report로
v2.0.0 published release/tag/evidence, active `v2.1.0` branch, 그리고
WebRTC/SSE/WS/Event POST/Auth/media path freeze gate를 분리해 기록합니다. 이
report는 v2.0.0 published evidence를 v2.1.0 시작 기준으로 고정하지만, live GitHub
published metadata 재확인, UI 풀테스트, 30분 soak, 120분 longrun을 자동으로
실행하거나 PASS로 대체하지 않습니다.

```bash
./server.sh verify-v210-entry-baseline \
  --report /tmp/media_server_v210_entry_baseline.md \
  --json-report /tmp/media_server_v210_entry_baseline.json
```

- 기준 release: `v2.0.0`; 기준 branch: `v2.1.0`.
- baseline primary: `v200-release-publication-20260601`,
  `v200-signed-tag-verification-20260602`, `verify-integrator-contract-artifact`
  freeze artifact.
- baseline fallback: live GitHub 상태를 현재 환경에서 확인하지 못하면 recorded
  release evidence만 사용하고 live published state는 `미확인`으로 기록합니다.
- 제외: VLM runtime/provider 호출, model/runtime bundle, provider credential 저장,
  Event POST/WebRTC/SSE/WS payload 변경, RTSP/WebRTC media path 변경.
- current-run companion gates: `verify-release-metadata`,
  `verify-release-evidence-index`, `verify-integrator-contract-artifact`,
  `verify-event-post`, `verify-auth-routes`, `verify-codecs`, `verify-webrtc-ice`,
  `verify-webrtc-va-metadata`, `verify-va-metadata-sidechannel`,
  `verify-ws-metadata`, `git diff --check`.

## Skipped / Not-run Wording

보고서와 release note에서는 아래 문구를 구분합니다. `미실행`, `manual-not-run`,
`미확인`, `제외`는 release evidence 실행 상태 또는 별도 제외/미확인 기록에만 쓰고,
기능별 테스트 결과 행에는 쓰지 않습니다.

| 상태 | 의미 |
| --- | --- |
| `PASS` | 해당 release cut에서 실제 실행했고 통과 |
| `FAIL` | 해당 release cut에서 실제 실행했고 실패 |
| `미실행` | 실행 조건이 아니거나 명시 요청이 없어 실행하지 않음 |
| `manual-not-run` | tag, push, PR merge, GitHub Release처럼 수동 승인 전이라 실행하지 않음 |
| `미확인` | 화면, screenshot, 외부 UI/API를 직접 열어 확인하지 않음 |
| `제외` | 사용자 지시 또는 실기기/외부 credential 조건 때문에 테스트 기준에서 뺌 |

`미실행`, `manual-not-run`, `미확인`, `제외`는 PASS가 아닙니다. UI 풀테스트 대상
기능이 이 상태라면 기능별 결과 행에서는 `FAIL`입니다.

## Verification

```bash
./server.sh verify-release-evidence-index
./server.sh verify-feature-scope-gate
./server.sh verify-docs-links
./server.sh verify-release-metadata
./server.sh verify-release-metadata --self-test-fallback-policy
./server.sh verify-release-metadata --published
```

release prep branch에서 tag/GitHub Release가 아직 수동 생성 전이면
`verify-release-metadata`만 브랜치 기준 PASS evidence로 씁니다.
publish 후에는 `verify-release-metadata --published`로 GitHub Latest Release와
repository page의 Releases/Latest link, remote tag/branch를 닫습니다. Markdown/JSON
report의 `Published Release Evidence` 섹션은
`media-server.published-release-evidence.v1` schema로 GitHub API/list/view,
repository page, remote refs 결과를 함께 보존합니다.
`media-server.github-metadata-fallback-policy.v1`은 `gh` 인증/도구 실패를 curl
GitHub REST API fallback으로, SSH origin refs 실패를 GitHub HTTPS refs fallback으로
재시도한 뒤 `failure-class=external-auth-or-permission`,
`failure-class=external-network`, `failure-class=tool-unavailable`,
`failure-class=external-github-access`를 분리해 남깁니다. 이 분류는 release metadata
환경/접근 실패를 제품 runtime/media 회귀로 축소하거나 과장하지 않기 위한 기준입니다.
