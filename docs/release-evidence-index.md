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
| Release close-out runbook | branch close, PR merge, main sync, tag, GitHub Release, Latest 확인, release branch 삭제, next branch sync, `media-server.release-closeout-one-shot-gate.v1` fail-stop rehearsal | `./server.sh verify-release-closeout-helper --dry-run`, `./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run` | planned-local/planned-published/manual-not-run |
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
| 2026-05-25 | ui-fulltest-restart-20260525-oehkFG | UI 풀테스트 | 새 throwaway data로 `/setup`, `/login`, `/ops/*`, `/client/*` 브라우저 조작, 56개 responsive/theme screenshot, EventRecord sample 대조, UI 대상 기능 ID 220개 PASS. UI 비대상 간접 안정화 행 `RULE-099` 포함 결과표 221 PASS / 0 FAIL. `/ops/events` rule/scenario별 EventRecord history coverage 390px/1180px 대조, WHEP/source/rule/client/auth scope 보강, native dialog guard와 `SAFE-021` blocking dialog policy 확인 | PASS | 916,832 | 2,608,727 | 1,691,895 | goal continuation; 후속 30분 predev durationSec=2399 | Codex goal usage | [manual-ui-result-2026-05-25-ui-fulltest-restart.md](./manual-ui-result-2026-05-25-ui-fulltest-restart.md), `/private/tmp/media_server_iab_auth_VuKUEe/browser`, `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json`, `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json`, `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` |
| 2026-05-31 | v200-vlm-closeout-readiness-20260531 | VLM close-out readiness | `media-server.vlm-close-out-readiness.v1` report, S15 rehearsal, S16 side-effect record, S17 longrun/UI criteria, release evidence/metadata/docs static verifier. UI 풀테스트 미실행, 30분 soak 미실행, 120분 longrun 미실행, provider field smoke 미실행, GitHub Release publish manual-not-run을 PASS로 대체하지 않음 | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | manual-not-available | [vlm-close-out-readiness.md](./vlm-close-out-readiness.md) |

Not run for `stability-script-smoke-20260525`: 30분 soak, 120분 longrun, manual UI 풀테스트.
Not run for `predev-30min-20260525`: 120분 longrun, manual UI 풀테스트.
Not run for `ui-fulltest-restart-20260525-oehkFG`: 120분 longrun, main merge, release tag, GitHub Release 생성, publish 후 `verify-release-metadata --published` 재확인.
Not run for `v200-vlm-closeout-readiness-20260531`: UI 풀테스트, 30분 soak, 120분 longrun, cloud provider field smoke, main merge, release tag, GitHub Release 생성, publish 후 `verify-release-metadata --published` 재확인.

## v2.0.0 Test Restart 2026-05-31

사용자 지시 범위는 `기존 테스트 기록 리스트 삭제 후 다시 만들기`,
`안정성 테스트 진행`, `30분 테스트 진행`입니다. 이전 실행은 채팅방 깜빡임 이슈로
중단했고, 이번 절은 재작성한 테스트 기록 리스트만 가리킵니다. 120분 longrun과
UI 풀테스트는 별도 지시 전까지 미실행으로 둡니다.

- 상세 기록: [v200-test-record-2026-05-31.md](./v200-test-record-2026-05-31.md)
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
- publish 전 `verify-release-metadata --published`, tag, push, GitHub Release 생성,
  release branch 삭제, next branch sync는 `manual-not-run`입니다.

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
