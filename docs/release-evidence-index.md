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
| GitHub Latest Release | GitHub Releases latest/list/view, `/releases/latest`, repository page Releases/Latest link, remote tag/branch, `media-server.published-release-evidence.v1` report | `./server.sh verify-release-metadata --published --report <report.md> --json-report <report.json>` | `PASS` 또는 `FAIL` |
| Release metadata/docs drift | VERSION, CMake, README, docs index, release policy, backlog | `./server.sh verify-release-metadata`, `./server.sh verify-docs-links` | `PASS` 또는 `FAIL` |
| Docs UI assets | managed screenshot manifest, capture script ownership, direct image review checklist | `./server.sh verify-docs-ui-assets` | 실행한 테스트 행은 `PASS` 또는 `FAIL`; 열지 않은 이미지는 별도 `미확인` |
| Manual UI evidence | `/setup`, `/login`, `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/client/live`, `/client/dashboard` direct click index | `./server.sh verify-manual-ui-evidence`, manual browser review | `PASS` 또는 `FAIL` |
| Feature test inventory | 기능별 UI 필요 여부, 테스트 필요 여부, 테스트 영역, PASS 판정 기준 | [project-feature-test-inventory.md](./project-feature-test-inventory.md) | 기준표, 실행 evidence 아님 |
| English UI visual copy QA | English capture path, nav/card/table wrapping, Korean residue review | `./server.sh verify-ui-copy-i18n-parity`, `./server.sh verify-ops-client-ui --screenshots` | 실행한 테스트 행은 `PASS` 또는 `FAIL`; 열지 않은 화면은 별도 `미확인` |
| Release close-out runbook | branch close, PR merge, main sync, tag, GitHub Release, Latest 확인, next branch sync | `./server.sh verify-release-closeout-helper --dry-run` | planned-local/planned-published/manual-not-run |
| Feature scope decision gate | 새 기능 후보를 v1.8 안정화 gate 안에서 구현으로 승격하지 않는 절차 | `./server.sh verify-feature-scope-gate` | `PASS` 또는 `FAIL` |
| PR checks | Preflight, licensing/artifact guardrails, required checks | GitHub Actions UI/API | 실행 확인 시 `PASS` 또는 `FAIL`; 열지 않은 Actions는 별도 `미확인` |
| Release notes | source-only scope, non-goals, verification, not-run/unverified | [release-policy.md](./release-policy.md) | 검토 행은 `PASS` 또는 `FAIL`; 실행하지 않은 gate는 별도 `미실행` |
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
| 2026-05-25 | ui-fulltest-restart-20260525-oehkFG | UI 풀테스트 | 새 throwaway data로 `/setup`, `/login`, `/ops/*`, `/client/*` 브라우저 조작, 56개 responsive/theme screenshot, EventRecord sample 대조, UI 대상 기능 ID 219개 PASS. UI 비대상 간접 안정화 행 `RULE-099` 포함 결과표 220 PASS / 0 FAIL. `/ops/events` rule/scenario별 EventRecord history coverage 390px/1180px 대조, WHEP/source/rule/client/auth scope 보강, native dialog guard 확인 | PASS | 916,832 | 2,608,727 | 1,691,895 | goal continuation; 후속 30분 predev durationSec=2399 | Codex goal usage | [manual-ui-result-2026-05-25-ui-fulltest-restart.md](./manual-ui-result-2026-05-25-ui-fulltest-restart.md), `/private/tmp/media_server_iab_auth_VuKUEe/browser`, `/private/tmp/media_server_rule_basic_templates_390/ops-click-e2e-summary.json`, `/private/tmp/media_server_rule_basic_templates_1180/ops-click-e2e-summary.json`, `/private/tmp/media_server_event_records_scope_history_390/event-history-coverage.json`, `/private/tmp/media_server_event_records_scope_history_1180/event-history-coverage.json` |

Not run for `stability-script-smoke-20260525`: 30분 soak, 120분 longrun, manual UI 풀테스트.
Not run for `predev-30min-20260525`: 120분 longrun, manual UI 풀테스트.
Not run for `ui-fulltest-restart-20260525-oehkFG`: 120분 longrun, main merge, release tag, GitHub Release 생성, publish 후 `verify-release-metadata --published` 재확인.

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
./server.sh verify-release-metadata --published
```

release prep branch에서 tag/GitHub Release가 아직 수동 생성 전이면
`verify-release-metadata`만 브랜치 기준 PASS evidence로 씁니다.
publish 후에는 `verify-release-metadata --published`로 GitHub Latest Release와
repository page의 Releases/Latest link, remote tag/branch를 닫습니다. Markdown/JSON
report의 `Published Release Evidence` 섹션은
`media-server.published-release-evidence.v1` schema로 GitHub API/list/view,
repository page, remote refs 결과를 함께 보존합니다.
