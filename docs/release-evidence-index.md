# Release Evidence Index

이 문서는 v1.8.0 release trust hardening 이후 release close-out evidence를 한곳에서
찾기 위한 색인입니다. README 첫 화면에는 세부 evidence 목록을 반복하지 않고,
이 문서와 [release-policy.md](./release-policy.md), [development-backlog.md](./development-backlog.md)로
연결합니다.

## 기록 원칙

- 상세 테스트 항목과 버전별 결과의 source-of-truth는
  [release-test-records.md](./release-test-records.md)입니다. 이 문서는 색인입니다.
- `v2.8.0`부터 `/tmp`, `/private/tmp`, `$TMPDIR` 경로는 최종 evidence로 링크하지
  않습니다. 임시 summary/report/log/screenshot/evidence JSON의 필요한 값은
  [release-test-records.md](./release-test-records.md) 또는 저장소 보존 artifact로
  이관하고, 임시 파일은 cleanup 대상에 넣습니다.
- 기존 historical row에 남아 있는 임시 경로는 당시 실행 provenance일 뿐 현재
  최종 evidence가 아닙니다. 현재 비교와 릴리즈 테스트 결과 판단에는
  [release-test-records.md](./release-test-records.md)의 보존형 표를 사용합니다.
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
| Release notes | source-only scope, non-goals, verification, not-run/unverified | [release-policy.md](./release-policy.md), current draft [release-notes-draft.md](./release-artifacts/v3.3.0/release-notes-draft.md) | 검토 행은 `PASS` 또는 `FAIL`; 실행하지 않은 gate는 별도 `미실행` |
| VLM close-out readiness | `media-server.vlm-close-out-readiness.v1` report, script/UI/30분/120분/provider/publish gate 분리, V200-S18 boundary | [vlm-close-out-readiness.md](./vlm-close-out-readiness.md), `./server.sh verify-vlm-closeout-readiness` | report/verifier는 `PASS` 또는 `FAIL`; UI/30분/120분 미실행은 별도 실행 상태 |
| Script smoke/stability | build/static/auth/API/media verifier, short smoke, skip reason | `./server.sh build`, 범위별 `verify-*` 명령 | 실행한 테스트 행은 `PASS` 또는 `FAIL`; 실행하지 않은 명령은 별도 `미실행` |
| 30분 soak | 사용자 명시 요청 시 30분 안정성 테스트 | `./server.sh verify-predev --soak-minutes 30` | 실행한 테스트 행은 `PASS` 또는 `FAIL`; 요청이 없으면 별도 `미실행` |
| 장시간/외부 gate | 120분 longrun, real ONVIF, external TURN/WHEP, YouTube real URL | release runbook/manual report | 실행한 테스트 행은 `PASS` 또는 `FAIL`; 제외/미실행/미확인은 별도 기록 |

## v2.9.0 Release Evidence Hygiene

S06은 index hygiene gate이며 실제 안정화/UI/30분/120분/published metadata 실행 evidence가 아닙니다.
이 절은 release evidence 색인, 상세 테스트 기록, 기능 inventory, script inventory, manual UI
evidence 기준이 서로 다른 역할을 갖는다는 점만 고정합니다.

| 대상 | 연결 | PASS/FAIL 결과표 위치 | 미실행/제외/manual-not-run/미확인 위치 | 대체 금지 |
| --- | --- | --- | --- | --- |
| release evidence index | 이 문서와 `./server.sh verify-v290-release-evidence-hygiene` | release cut에서 실제 실행한 색인/게이트 행만 `PASS` 또는 `FAIL` | 실행하지 않은 publish/UI/longrun/field 상태는 이 문서의 실행 상태 또는 제외 기록 | UI 풀테스트 직접 조작, 30분/120분, published metadata 실행 evidence |
| release test records | [release-test-records.md](./release-test-records.md) | 상세 테스트 항목과 버전별 결과 행 | S06 not-run row와 cleanup/token 기록 | summary-only, 임시 파일 링크, 이전 release evidence 재사용 |
| feature inventory | [project-feature-test-inventory.md](./project-feature-test-inventory.md) | 기능 ID별 PASS 기준이 아니라 테스트 영역/owner 기준표 | inventory 단독으로 실행 결과를 만들지 않음 | 기능 ID 존재를 기능 완료나 UI PASS로 승격 |
| script inventory | `./server.sh verify-script-inventory` | server command/dispatch/script 옵션 검증 실행 결과 | 문서에만 있는 미구현 command는 FAIL | command 존재를 실제 제품/UI/media 실행으로 승격 |
| manual UI evidence | [manual-ui-fulltest.md](./manual-ui-fulltest.md), [manual-ui-checklist.md](./manual-ui-checklist.md), `./server.sh verify-manual-ui-evidence` | 직접 브라우저 조작 결과가 있는 UI 풀테스트 행만 `PASS` 또는 `FAIL` | 직접 열지 않은 화면, screenshot 미확인, auth env 미충족은 미실행/미확인/FAIL로 분리 | raw JSON/API-only/static smoke/screenshot-only/Chrome fallback을 UI PASS로 승격 |

- `verify-release-evidence-index`, `verify-script-inventory`, `verify-manual-ui-evidence`,
  `verify-v290-release-evidence-hygiene`는 서로 다른 문서/명령 연결을 확인합니다.
  이 명령들의 PASS는 `미실행/제외/manual-not-run/미확인`을 PASS로 바꾸지 않습니다.
- `/tmp`, `/private/tmp`, `$TMPDIR` 경로는 최종 evidence로 링크하지 않고,
  필요한 값만 저장소 보존형 기록에 이관합니다.
- S06 이후 release evidence를 작성할 때 `PASS`/`FAIL` 결과표와
  미실행/제외/manual-not-run/미확인 실행 상태를 같은 행의 같은 판정값처럼 섞지 않습니다.

## v2.9.0 S08 final stabilization run

S08 final stabilization run은 local script stability gate입니다. build, auth,
Ops/Client UI smoke, rule UI, Event POST, SSE/WS metadata, media/schema, docs/inventory
명령을 release 순서대로 실행하고 [release-test-records.md](./release-test-records.md)에
결과를 남깁니다. UI 풀테스트/30분/120분/published metadata 실행 evidence가 아닙니다.

- `./server.sh verify-v290-final-stabilization-run`은 S08 결과 기록과 경계 문구가
  존재하는지만 확인합니다.
- S08 PASS는 UI 풀테스트 직접 조작, 30분 soak, 120분 longrun, published metadata,
  external TURN/WHEP, ONVIF 실기기, real cloud/VLM provider field smoke를 PASS로
  승격하지 않습니다.
- 실행하지 않은 field/publish/longrun/UI 항목은 S08 PASS/FAIL 표가 아니라
  미실행/제외 기록으로 남깁니다.

## v3.1.0 S09 local readiness gate records

V310-S09 stabilization/release readiness는
`media-server.v310-stabilization-release-readiness.v1` 기준으로 v3.1.0 S00~S08
local verifier와 release records를 묶는 색인입니다. 이 섹션은 release action을
승인하거나 실행하지 않고, UI 풀테스트 직접 조작, 30분/120분 longrun, published
metadata, release action evidence를 대체하지 않습니다.

Companion local gate:

```bash
./server.sh verify-v310-stabilization-release-readiness
./server.sh build
./server.sh verify-v310-entry-baseline
./server.sh verify-v310-event-clip-contract
./server.sh verify-analysis-state
./server.sh verify-v310-replay-timeline-ui
./server.sh verify-v310-client-safe-event-digest
./server.sh verify-v310-scoped-integrator-search-api
./server.sh verify-v310-operator-feature-correction
./server.sh verify-v310-optional-vector-search
./server.sh verify-v310-retention-export-hardening
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-project-inventory
./server.sh verify-feature-inventory-coverage
./server.sh verify-release-evidence-index
./server.sh verify-release-closeout-helper --dry-run
./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run
./server.sh verify-script-inventory
git diff --check
```

V310-S09 stabilization/release readiness local gate는 UI 풀테스트 직접 조작, 30분/120분
longrun, published metadata, release action evidence를 대체하지 않습니다.

## v3.1.0 release publication evidence

v3.1.0 publication evidence는 [release-test-records.md](./release-test-records.md)의
`v310 release PR/main/ruleset/tag/GitHub Release`, `v310 release published metadata initial`,
`v310 release published metadata correction` 행에서 관리합니다. PR #42 main merge,
ruleset required checks 임시 제거/복구, SSH-signed annotated tag, GitHub Release,
published metadata 재검증은 local readiness gate와 분리합니다.

## v3.2.0 release publication evidence

v3.2.0 publication evidence는 [release-test-records.md](./release-test-records.md)의
`v320 release PR/main/ruleset/tag/GitHub Release`, `v320 release published metadata initial`,
`v320 release published metadata correction` 행에서 관리합니다. PR #45 main merge,
ruleset required checks 임시 제거/복구, SSH-signed annotated tag, GitHub Release,
published metadata 재검증은 Step 11 local readiness gate와 분리합니다. Release branch
삭제는 별도 승인되지 않아 수행하지 않았습니다.

## v3.3.0 release publication evidence

v3.3.0 publication evidence는 [release-test-records.md](./release-test-records.md)의
`v330 release PR/main/ruleset/tag/GitHub Release`, `v330 release published metadata initial`,
`v330 release published metadata correction` 행에서 관리합니다. PR #47 main merge,
PR #48 published metadata correction merge, ruleset required checks 임시 제거/복구,
annotated tag, GitHub Release, published metadata 재검증은 Step 11 local readiness gate와
분리합니다. Release branch 삭제와 v3.4.0 branch creation은 문서 보정 후 별도 action으로
분리합니다.

## v3.5.0 release publication evidence

v3.5.0 publication evidence는 [release-test-records.md](./release-test-records.md)의
`v350 release PR/main/tag/GitHub Release`, `v350 release published metadata initial`,
`v350 release published metadata correction`, `v350 release verified tag correction` 행에서
관리합니다. PR #51은 Actions를 2026-07-01 기본값 `enabled=true`, `allowed_actions=all`로
재개한 뒤 v3.5.0 기준 close/reopen을 한 번만 수행해 `guardrails`/`static-gates`
required checks를 생성했고, 두 check가 SUCCESS인 상태에서 main에 merge했습니다.
최초 unsigned annotated tag는 signed tag policy 보정에 따라 같은 target commit의
SSH-signed annotated tag로 교체했고 GitHub API verification `verified=true`/`reason=valid`를
확인했습니다. Annotated/signed tag, GitHub Release, published metadata 재검증은 Step 13
local readiness, 30분 soak, UI 풀테스트 evidence와 분리합니다. Release branch 삭제는
사용자 승인 후 수행했고 후속 브랜치 생성은 명시 승인 전 수행하지 않습니다.

## v3.6.0 Step 14 local readiness gate records

v3.6.0 Step 14 stabilization/release readiness는
`media-server.v360-stabilization-release-readiness.v1` 기준으로 v3.6.0 Step 1~13
local verifier와 release records를 묶는 색인입니다. 이 섹션은 release action을
승인하거나 실행하지 않고, UI 풀테스트 직접 조작, 30분/120분 longrun, published
metadata, release action evidence를 대체하지 않습니다.

v3.6.0 Step 14 local readiness gate는 v3.6.0 stabilization/release readiness 문서/명령
연결을 확인할 뿐, UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata,
release action evidence를 대체하지 않습니다.

v3.6.0 release run evidence는 local readiness gate와 분리해 관리합니다.

- 30분 soak: 최종 비샌드박스 `./server.sh verify-predev --soak-minutes 30` run은
  `status=pass`, `pass=119`, `fail=0`, `skip=1`, `durationSec=2356`,
  `soakMinutes=30`, `steps=120`입니다. 최초 sandbox bind failure와 최초
  비샌드박스 code comment policy failure는 각각 실패 evidence로 분리했고, 최종
  PASS evidence에는 포함하지 않습니다. External TURN hard gate는 요청하지 않아
  skip이며 PASS로 대체하지 않습니다. Summary/report/html은
  [predev-1783153043-79079](./release-artifacts/v3.6.0/predev-1783153043-79079/media_server_predev-1783153043-79079_summary.json)에
  보존했습니다.
- UI 풀테스트: 2026-07-04 승인 범위에서 Codex 인앱 브라우저 직접 검수로
  route 15개, screenshot 40장, interaction 16개를 확인했습니다. One-shot wrapper는
  runId `ui-fulltest-one-shot-1783164060346-62410`으로 PASS했고
  [in-app evidence](./release-artifacts/v3.6.0/ui-fulltest-20260704/in-app-evidence.json)와
  [one-shot summary](./release-artifacts/v3.6.0/ui-fulltest-20260704/one-shot/summary.json)를
  보존했습니다. 30분 soak와 UI 풀테스트는 서로 대체하지 않습니다.
- 120분 longrun: 승인된 비샌드박스 `./server.sh verify-predev --soak-minutes 120`
  run은 `status=pass`, `pass=444`, `fail=0`, `skip=1`, `durationSec=7745`,
  `soakMinutes=120`, `steps=445`입니다. integrated-smoke PASS 뒤 87회 soak
  iteration, main-runtime-idle, event-post-queue, queue-runtime-idle, ports-clean,
  summary-report가 PASS했습니다. External TURN hard gate는 요청하지 않아 skip이며
  PASS로 대체하지 않습니다. Summary/report/html은
  [predev-1783164699-79436-120min](./release-artifacts/v3.6.0/predev-1783164699-79436-120min/media_server_predev-1783164699-79436_summary.json)에
  보존했습니다.
- Field smoke: 승인 후 실행 가능 범위를 판정했고 `verify-external-turn-whep-field-gate`,
  `verify-vlm-cloud-provider-field-smoke-gate`, `verify-onvif-field-smoke-gate`,
  `verify-onvif-field-smoke-redaction` 절차 gate는 PASS했습니다. 다만 실제 ONVIF
  실기기, external TURN/WHEP, cloud/VLM provider field smoke는 endpoint/credential/
  실기기/provider 조건이 없어 `not-run`이며 local/30분/120분/UI PASS로 대체하지 않습니다.
- Release action: PR #55 `v3.6.0 -> main`은 `guardrails`와 `static-gates` PASS 뒤
  merge commit `858cc61e05a6155df8ba3ccfce12765610b728d8`로 병합했습니다.
  초기 SSH-signed annotated tag `v3.6.0`은 target commit
  `858cc61e05a6155df8ba3ccfce12765610b728d8`, tag object
  `67fbb47be4b042074d6d28117e9d77301624b771`로 생성되었고 GitHub Release도
  [v3.6.0](https://github.com/dhseo90/MediaServer/releases/tag/v3.6.0)로 생성했습니다.
  다만 이후 `v3.6.0` published metadata 보정 커밋이 발생했으므로 이 초기 tag는
  최종 v3.6.0 closure evidence로 인정하지 않습니다. 최종 `v3.6.0` tag는
  PR #56 published metadata correction과 tag closure policy/evidence correction을 포함하는
  최신 main close-out commit을 대상으로 signed annotated tag를 재생성한 뒤 GitHub API
  verification으로 확인합니다. 최종 tag object hash는 signing 이후 생성되는 live GitHub
  evidence이므로 repo 문서에 선기록하지 않습니다.
- Published metadata: GitHub Release 생성 직후 최초 `verify-release-metadata --published`는
  GitHub latest가 `v3.6.0`인데 local docs/verifier latest published 기준이 `v3.5.0`이라
  `pass=18 fail=3`으로 실패했습니다. README/docs/policy/backlog/UI asset manifest/verifier
  기준을 `v3.6.0`으로 정렬한 뒤 최종 `./server.sh verify-release-metadata --published`는
  `pass=21 fail=0`으로 통과했습니다.

Companion local gate:

```bash
./server.sh verify-v360-stabilization-release-readiness
./server.sh build
./server.sh verify-v360-entry-baseline
./server.sh verify-v360-simulation-input-contract
./server.sh verify-v360-operations-simulation-run-contract
./server.sh verify-v360-command-plan-dry-run-simulator
./server.sh verify-v360-source-rule-impact-diff
./server.sh verify-v360-safe-apply-readiness-gate
./server.sh verify-v360-ops-simulation-workspace-ui
./server.sh verify-v360-simulation-run-ledger-comparison
./server.sh verify-v360-client-notice-preview
./server.sh verify-v360-rule-va-what-if-replay-pack
./server.sh verify-v360-simulation-export-bundle
./server.sh verify-v360-field-evidence-simulation-adapter
./server.sh verify-v360-vlm-assisted-simulation-explanation
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-project-inventory
./server.sh verify-feature-inventory-coverage
./server.sh verify-release-evidence-index
./server.sh verify-release-closeout-helper --dry-run
./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run
./server.sh verify-script-inventory
git diff --check
```

## v3.9.0 source baseline, feature completion inventory, and user review gate records

v3.9.0 Foundation evidence index는 source baseline, feature completion inventory,
user review gate follow-up을 stream verification, project inventory, release test records,
release metadata verifier에 연결하는 색인입니다. 이 섹션은 사용자 approval, 실제 UI
풀테스트 직접 조작, published metadata, PR/main/tag/GitHub Release, field smoke evidence가
아닙니다. 단, R1 server longrun runner의 사용자 승인 실제 30분 실행은 아래 R1 행에서
별도 PASS evidence로 분리해 연결합니다.

| Evidence | 연결 | PASS/FAIL 결과표 위치 | 미실행/제외 위치 | 대체 금지 |
| --- | --- | --- | --- | --- |
| v3.9.0 source baseline | `./server.sh verify-v390-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, [stream-verification.md](./stream-verification.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md) `OPS-163`/`SAFE-196` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 Step 1 entry baseline final` | [release-test-records.md](./release-test-records.md) v3.9.0 미실행/제외 | feature discovery/dev, UI 풀테스트, 30분/120분, published metadata, release action evidence |
| v3.9.0 feature completion inventory | `./server.sh verify-v390-feature-completion-inventory`, [v390-feature-completion-inventory.md](./v390-feature-completion-inventory.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md) `OPS-164`/`SAFE-197` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 Step 2 feature completion inventory final` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 discovery user review gate`와 미실행/제외 | 실제 discovery 완료, 기능 구현, 구조 안정화 구현, 테스트 방식 전환 구현, UI 풀테스트, 30분/120분, published metadata, release action evidence |
| v3.9.0 user review gate | `./server.sh verify-v390-user-review-gate`, [v390-feature-completion-inventory.md](./v390-feature-completion-inventory.md) User Review Output, [project-feature-test-inventory.md](./project-feature-test-inventory.md) `OPS-165`/`SAFE-198` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 Step 3 user review gate final` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 사용자 review approval`와 미실행/제외 | 사용자 승인, 기능 구현, 구조 안정화 구현, 테스트 방식 전환 구현, UI 풀테스트, 30분/120분, published metadata, release action evidence |
| v3.9.0 Required Closeout manual UI evidence | `./server.sh verify-manual-ui-evidence`, [manual-ui-fulltest.md](./manual-ui-fulltest.md), [manual-ui-checklist.md](./manual-ui-checklist.md), [manual-ui-result-template.md](./manual-ui-result-template.md), [v390-feature-completion-inventory.md](./v390-feature-completion-inventory.md) `V390-REQ-001`~`V390-REQ-003` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 Required Closeout manual UI evidence final` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 30분 longrun`, `v390 120분 longrun`, `v390 UI 풀테스트`, `v390 published metadata` | UI 풀테스트 직접 조작, 30분/120분, published metadata, release action evidence |
| v3.9.0 Evidence/Test Gate and Test Model Prep | `./server.sh verify-v390-evidence-test-gate-prep`, [manual-ui-fulltest.md](./manual-ui-fulltest.md), [stream-verification.md](./stream-verification.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md) `OPS-166`~`OPS-169`/`SAFE-199`~`SAFE-202`, [v390-feature-completion-inventory.md](./v390-feature-completion-inventory.md) `V390-CAND-007`/`V390-CAND-008`/`V390-CLOSED-003`/`V390-CLOSED-004` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 Evidence/Test Gate and Test Model Prep final` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 30분 longrun`, `v390 120분 longrun`, `v390 UI 풀테스트`, `v390 published metadata` | UI 풀테스트 직접 조작, 30분/120분 longrun 실행, published metadata, release action evidence |
| v3.9.0 R1 server longrun runner | `./server.sh verify-v390-server-longrun`, `./server.sh verify-v390-server-longrun-runner-contract`, [stream-verification.md](./stream-verification.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md) `OPS-168`/`SAFE-201` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 R1 server longrun runner final`, `v390 30분 longrun R1 runner actual final` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 R1 실제 120분 longrun` | real 120-minute duration evidence, UI 풀테스트 직접 조작, published metadata, release action evidence. Contract fixture PASS includes delegated predev first failure preservation but remains non-duration evidence |
| v3.9.0 R2 UI automation runner | `./server.sh verify-v390-ui-automation`, `./server.sh verify-v390-ui-automation-report`, `./server.sh verify-v390-ui-automation-runner-contract`, [stream-verification.md](./stream-verification.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md) `OPS-169`/`SAFE-202` and `UI-108`~`UI-115` route/control/action cases | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 R2 UI automation runner final`, `v390 R2 실제 UI automation suite`, `v390 R5 actual UI automation summary replay` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 UI 풀테스트`, `v390 30분 longrun`, `v390 120분 longrun`, `v390 published metadata` | UI 풀테스트 직접 조작 evidence, 30분/120분, published metadata, release action evidence |
| v3.9.0 R3 / V390-ADD1-06 actual test acceptance bundle | `./server.sh verify-v390-test-acceptance-bundle --output-dir docs/release-artifacts/v3.9.0/test-acceptance-final`, `./server.sh verify-v390-test-acceptance-bundle-contract`, [stream-verification.md](./stream-verification.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md) `OPS-179`/`SAFE-212` plus current feature, R1, R2 commands | [release-test-records.md](./release-test-records.md) `V390-ADD1-06 actual acceptance bundle final`, `V390-ADD1-06 fixture orchestration contract final` | [release-test-records.md](./release-test-records.md) `V390-ADD1-06 UI 풀테스트`, `V390-ADD1-06 120분 conditional decision` | fixture/dry-run PASS, Codex 인앱 UI 풀테스트 직접 조작 PASS, 조건 미충족 120분 PASS, published metadata, release action evidence |
| v3.9.0 R4 longrun runner role alignment | `./server.sh verify-v390-longrun-runner-role-alignment`, `./server.sh verify-runtime-media-longrun-trigger-matrix`, `./server.sh verify-longrun-separation`, `./server.sh verify-rc-release-gate`, [release-policy.md](./release-policy.md), [stream-verification.md](./stream-verification.md) | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 R4 longrun runner role alignment final` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 R1 실제 120분 longrun`, `v390 R3 actual acceptance bundle` | 30분/120분 execution PASS, UI 풀테스트 직접 조작 evidence, published metadata, release action evidence. R4는 runtime/media trigger matrix row가 `verify-v390-server-longrun --duration-minutes 30/120`을 표준 trigger로 가리키고 historical `verify-predev --soak-minutes 30/120` evidence를 legacy/compatibility로 보존하는 역할 정렬 gate입니다 |
| v3.9.0 R5 UI automation report replay guard | `./server.sh verify-v390-ui-automation-report --summary <summary.json>`, `./server.sh verify-v390-ui-automation-report-replay-guard`, [stream-verification.md](./stream-verification.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md) `OPS-169`/`SAFE-202` and `UI-108`~`UI-115` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 R5 UI automation report replay guard final`, `v390 R5 actual UI automation summary replay` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 UI 풀테스트`, `v390 30분 longrun`, `v390 120분 longrun`, `v390 published metadata` | UI 풀테스트 직접 조작 evidence, 30분/120분, published metadata, release action evidence |
| V390-ADD1-04 Re-ID readiness consistency | `./server.sh verify-v390-reid-readiness-consistency`, `./server.sh verify-v390-conditional-field-ai-decisions`, `./server.sh verify-reid-advanced-tracking`, `./server.sh verify-analysis-state`, [stream-verification.md](./stream-verification.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md) `UI-115`/`LAB-125`/`SAFE-210`/`OPS-177` | [release-test-records.md](./release-test-records.md) `V390-ADD1-04 Re-ID readiness consistency final` | [release-test-records.md](./release-test-records.md) `V390-ADD1-04 UI 풀테스트`, `V390-ADD1-04 30분/120분 longrun` | 실제 ONNX session/inference 성공, UI 직접 조작, 30분/120분, published metadata, release action evidence |
| V390-ADD1-05 ONVIF source/view atomicity | `./server.sh verify-v390-onvif-source-view-atomicity`, `./server.sh verify-v390-onvif-live-import-persist-decision`, `./server.sh verify-onvif-import-draft-api --http-base <local-auth-off-server>`, `./server.sh verify-onvif-rtsp-downstream --http-base <local-auth-off-server> --source-id <throwaway-id> --rtsp-url <fixture-url>`, [stream-verification.md](./stream-verification.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md) `UI-109`/`SRC-066`/`SAFE-204`/`OPS-171` | [release-test-records.md](./release-test-records.md) `V390-ADD1-05 ONVIF source/view atomicity final`, `V390-ADD1-05 companion gates final`, `V390-ADD1-05 temporary artifact cleanup` | [release-test-records.md](./release-test-records.md) `V390-ADD1-05 UI 풀테스트`, `V390-ADD1-05 30분/120분 longrun` | process crash/multi-process atomicity, ONVIF 실기기 success, UI 직접 조작, 30분/120분, published metadata, release action evidence |
| v3.9.0 Structure Stabilization Handoff | `./server.sh verify-v390-structure-stabilization-handoff`, [v390-feature-completion-inventory.md](./v390-feature-completion-inventory.md) `V390-STRUCT-001`~`V390-STRUCT-005`, [project-feature-test-inventory.md](./project-feature-test-inventory.md) `OPS-178`/`SAFE-211`, [2026-07-08-v390-structure-stabilization-handoff.md](./superpowers/plans/2026-07-08-v390-structure-stabilization-handoff.md) | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 Step 19 structure stabilization handoff final` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 구조 안정화 구현`, `v390 UI 풀테스트`, `v390 30분 longrun`, `v390 120분 longrun`, `v390 published metadata` | 실제 route/API/UI extraction 구현, manual UI archive split, VLM contract index implementation, UI 풀테스트, 30분/120분 longrun, published metadata, release action evidence |
| v3.9.0 Stabilization and Release Readiness | `./server.sh verify-v390-stabilization-release-readiness`, `./server.sh build`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-release-evidence-index`, `./server.sh verify-release-closeout-helper --dry-run`, `./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run`, [project-feature-test-inventory.md](./project-feature-test-inventory.md) `OPS-179`/`SAFE-212` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 Step 20 stabilization/release readiness final` | [release-test-records.md](./release-test-records.md) v3.9.0 `v390 Step 20 UI 풀테스트`, `v390 Step 20 30분 longrun`, `v390 Step 20 120분 longrun`, `v390 Step 20 published metadata`, `v390 Step 20 PR/main/tag/GitHub Release` | UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence, field smoke |

Companion local gate:

```bash
./server.sh verify-v390-entry-baseline
./server.sh verify-v390-feature-completion-inventory
./server.sh verify-v390-user-review-gate
./server.sh verify-manual-ui-evidence
./server.sh verify-v390-evidence-test-gate-prep
./server.sh verify-v390-onvif-credential-provider-status
./server.sh verify-v390-onvif-source-view-atomicity
./server.sh verify-v390-onvif-live-import-persist-decision
./server.sh verify-v390-vlm-rule-suggestion-draft-bridge
./server.sh verify-v390-vlm-evaluation-promotion-guard
./server.sh verify-v390-vlm-promotion-trust-boundary
./server.sh verify-v390-backup-recovery-handoff-validation
./server.sh verify-v390-action-execution-deferral-decision
./server.sh verify-v390-conditional-field-ai-decisions
./server.sh verify-v390-reid-readiness-consistency
./server.sh verify-v390-structure-stabilization-handoff
./server.sh verify-v390-stabilization-release-readiness
./server.sh build
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-project-inventory
./server.sh verify-feature-inventory-coverage
./server.sh verify-release-evidence-index
./server.sh verify-release-closeout-helper --dry-run
./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run
./server.sh verify-script-inventory
git diff --check
```

## v3.9.0 Step 20 local readiness gate records

v3.9.0 Step 20 stabilization/release readiness는
`media-server.v390-stabilization-release-readiness.v1` 기준으로 v3.9.0 Step 1~19
local verifier와 release records를 묶는 색인입니다. 이 섹션은 release action을
승인하거나 실행하지 않고, UI 풀테스트 직접 조작, 30분/120분 longrun, published
metadata, release action evidence를 대체하지 않습니다.

v3.9.0 Step 20 local readiness gate는 v3.9.0 stabilization/release readiness
문서/명령 연결을 확인할 뿐, UI 풀테스트 직접 조작, 30분/120분 longrun, published
metadata, release action evidence를 대체하지 않습니다.

Companion local gate:

```bash
./server.sh verify-v390-stabilization-release-readiness
./server.sh build
./server.sh verify-v390-entry-baseline
./server.sh verify-v390-feature-completion-inventory
./server.sh verify-v390-user-review-gate
./server.sh verify-manual-ui-evidence
./server.sh verify-v390-evidence-test-gate-prep
./server.sh verify-v390-onvif-credential-provider-status
./server.sh verify-v390-onvif-source-view-atomicity
./server.sh verify-v390-onvif-live-import-persist-decision
./server.sh verify-v390-vlm-rule-suggestion-draft-bridge
./server.sh verify-v390-vlm-evaluation-promotion-guard
./server.sh verify-v390-vlm-promotion-trust-boundary
./server.sh verify-v390-backup-recovery-handoff-validation
./server.sh verify-v390-action-execution-deferral-decision
./server.sh verify-v390-conditional-field-ai-decisions
./server.sh verify-v390-reid-readiness-consistency
./server.sh verify-v390-structure-stabilization-handoff
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-project-inventory
./server.sh verify-feature-inventory-coverage
./server.sh verify-release-evidence-index
./server.sh verify-release-closeout-helper --dry-run
./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run
./server.sh verify-script-inventory
git diff --check
```

## v3.8.0 Step 16 local readiness gate records

v3.8.0 Step 16 stabilization/release readiness는
`media-server.v380-stabilization-release-readiness.v1` 기준으로 v3.8.0 Step 1~15
local verifier와 release records를 묶는 색인입니다. 이 섹션은 release action을
승인하거나 실행하지 않고, UI 풀테스트 직접 조작, 30분/120분 longrun, published
metadata, release action evidence를 대체하지 않습니다.

v3.8.0 Step 16 local readiness gate는 v3.8.0 stabilization/release readiness
문서/명령 연결을 확인할 뿐, UI 풀테스트 직접 조작, 30분/120분 longrun, published
metadata, release action evidence를 대체하지 않습니다.

Companion local gate:

```bash
./server.sh verify-v380-stabilization-release-readiness
./server.sh build
./server.sh verify-v380-entry-baseline
./server.sh verify-v380-ops-action-route-boundary
./server.sh verify-v380-action-capability-contract
./server.sh verify-v380-action-request-ledger-contract
./server.sh verify-v380-approval-decision-gate
./server.sh verify-v380-action-readiness-preflight
./server.sh verify-v380-source-recheck-action-pilot
./server.sh verify-v380-client-notice-draft-queue
./server.sh verify-v380-rule-draft-action-package
./server.sh verify-v380-ops-action-control-workspace-ui
./server.sh verify-v380-client-safe-action-notice-preview
./server.sh verify-v380-outcome-observer-reconciliation
./server.sh verify-v380-action-receipt-bundle
./server.sh verify-v380-field-connector-evidence-package
./server.sh verify-v380-default-off-action-explanation
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-project-inventory
./server.sh verify-feature-inventory-coverage
./server.sh verify-release-evidence-index
./server.sh verify-release-closeout-helper --dry-run
./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run
./server.sh verify-script-inventory
git diff --check
```

## v3.8.0 release run records

v3.8.0 release run은 Step 16 local readiness와 별개로 사용자가 승인한
30분/120분/UI 풀테스트 및 cleanup evidence를 보존합니다. 아래 PASS는 해당 run
범위에만 적용하며, external TURN/WHEP, ONVIF 실기기, cloud/VLM provider field
smoke 또는 별도 runtime-console 120분 PASS로 확대하지 않습니다.

- 30분 predev: [summary](./release-artifacts/v3.8.0/predev-30min-20260706/summary.json),
  [report](./release-artifacts/v3.8.0/predev-30min-20260706/report.md),
  [html](./release-artifacts/v3.8.0/predev-30min-20260706/report.html). Summary
  `status=pass`, `pass=119`, `fail=0`, `skip=1`, `durationSec=2369`,
  `soakMinutes=30`, `steps=120`. External TURN hard gate는 요청하지 않아 skip이며
  PASS가 아닙니다.
- 120분 predev: [summary](./release-artifacts/v3.8.0/predev-120min-20260706/summary.json),
  [report](./release-artifacts/v3.8.0/predev-120min-20260706/report.md),
  [html](./release-artifacts/v3.8.0/predev-120min-20260706/report.html). Summary
  `status=pass`, `pass=444`, `fail=0`, `skip=1`, `durationSec=7753`,
  `soakMinutes=120`, `steps=445`. External TURN hard gate는 요청하지 않아 skip이며
  PASS가 아닙니다.
- UI 풀테스트: [in-app evidence](./release-artifacts/v3.8.0/ui-fulltest-20260706/in-app-evidence.json),
  [one-shot summary](./release-artifacts/v3.8.0/ui-fulltest-20260706/one-shot-inapp-final/summary.json).
  Codex 인앱 브라우저 evidence schema
  `media-server.in-app-browser-ui-evidence.v1`, route `10`, screenshot `40`,
  interaction `16`, failed interaction `0`, routeIssues `[]`. One-shot wrapper
  runId `ui-fulltest-one-shot-1783362652122-25088`, `20 PASS`/`5 SKIPPED`/`0 FAIL`.
  Wrapper에서 build/manual/predev/runtime-console 단계는 skip했고 별도 evidence 또는
  미실행 경계로 분리합니다.
- Cleanup: UI raw `manual-servers`, one-shot raw registry/log/ports/seed plan과
  `/tmp/media_server_predev-1783351738-67055`,
  `/tmp/media_server_predev-1783354136-2074`는 삭제했습니다. 보존 evidence는
  30분/120분 summary/report/html, 인앱 evidence JSON, PNG screenshot 40장,
  one-shot summary JSON/MD입니다. Cleanup 후 UI artifact dir `2.0M`, one-shot
  final `20K`, 30분 artifact `220K`, 120분 artifact `632K`, throwaway listener
  없음, 보존 evidence 민감 문자열 스캔 hit 없음.
- 미실행 경계: 별도 runtime-console 120분과 실제 ONVIF 실기기/external
  TURN-WHEP/cloud provider field smoke는 실행하지 않았습니다. 30분/120분 predev와
  UI 풀테스트 PASS로 이 항목들을 완료 처리하지 않습니다.

## v3.7.0 Step 18 local readiness gate records

v3.7.0 Step 18 stabilization/release readiness는
`media-server.v370-stabilization-release-readiness.v1` 기준으로 v3.7.0 Step 1~17
local verifier와 release records를 묶는 색인입니다. 이 섹션은 release action을
승인하거나 실행하지 않고, UI 풀테스트 직접 조작, 30분/120분 longrun, published
metadata, release action evidence를 대체하지 않습니다.

v3.7.0 Step 18 local readiness gate는 v3.7.0 stabilization/release readiness
문서/명령 연결을 확인할 뿐, UI 풀테스트 직접 조작, 30분/120분 longrun, published
metadata, release action evidence를 대체하지 않습니다.

Companion local gate:

```bash
./server.sh verify-v370-stabilization-release-readiness
./server.sh build
./server.sh verify-v370-entry-baseline
./server.sh verify-v370-site-source-group-contract
./server.sh verify-v370-site-aware-source-registry-projection
./server.sh verify-v370-site-health-rollup
./server.sh verify-v370-site-impact-graph
./server.sh verify-v370-site-simulation-input-pack
./server.sh verify-v370-cross-site-safe-apply-readiness
./server.sh verify-v370-runbook-template-contract
./server.sh verify-v370-runbook-instance-ledger
./server.sh verify-v370-approval-ticket-workflow
./server.sh verify-v370-site-operations-workspace-ui
./server.sh verify-v370-client-notice-by-site-view-group
./server.sh verify-v370-rule-va-what-if-by-site
./server.sh verify-v370-field-evidence-attachment
./server.sh verify-v370-limited-safe-execution-pilot
./server.sh verify-v370-outcome-reconciliation
./server.sh verify-v370-export-handoff-bundle
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-project-inventory
./server.sh verify-feature-inventory-coverage
./server.sh verify-release-evidence-index
./server.sh verify-release-closeout-helper --dry-run
./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run
./server.sh verify-script-inventory
git diff --check
```

## v3.7.0 release run records

v3.7.0 release run evidence는 Step 18 local readiness gate와 분리해 관리합니다.
30분 soak와 Codex 인앱 UI 풀테스트는 2026-07-05 승인 범위에서 최종 PASS로
실행했습니다. Chrome fallback one-shot과 pre-final partial 인앱 route evidence는
최종 UI PASS 이전의 보조/실패 경계 기록으로만 남기며, 인앱 UI PASS evidence로
승격하지 않습니다.

- 30분 soak: 최종 `./server.sh verify-predev --soak-minutes 30` run은 `status=pass`,
  `pass=119`, `fail=0`, `skip=1`, `durationSec=2361`, `soakMinutes=30`입니다.
  summary/report/html은
  [predev-30min-20260705-final](./release-artifacts/v3.7.0/predev-30min-20260705-final/)
  에 보존했습니다. External TURN hard gate는 요청하지 않아 skip이며 PASS가 아닙니다.
- UI wrapper: `verify-ui-fulltest-one-shot --browser-mode chrome --allow-chrome-fallback`
  결과는 `PASS`, runId `ui-fulltest-one-shot-1783239016082-59069`입니다. Chrome fallback
  자동 wrapper PASS이며 인앱 UI 풀테스트 PASS로 승격하지 않습니다.
- 인앱 partial evidence: pre-final 단계에서 route `18`, overflowIssues `[]`를 생성해
  dashboard marker false positive까지 검토했지만 최종 in-app evidence
  schema/interaction gate가 없어 최종 PASS 이전 blocker 기록으로만 분리합니다.
  최종 PASS evidence 보존 후 raw partial JSON/screenshot/diagnostic JSON은 cleanup했고,
  삭제된 partial 산출물을 최종 evidence 링크로 사용하지 않습니다.
- UI 풀테스트: Codex 인앱 브라우저 직접 evidence는
  [in-app-evidence.json](./release-artifacts/v3.7.0/ui-fulltest-20260705/in-app-evidence.json)
  기준 route `10`, screenshot `40`, interaction `16`, failed interaction `0`,
  routeIssues `[]`입니다. `verify-ui-fulltest-one-shot --browser-mode in-app
  --in-app-evidence docs/release-artifacts/v3.7.0/ui-fulltest-20260705/in-app-evidence.json
  --skip-build --skip-manual-result` 결과는 `PASS`, runId
  `ui-fulltest-one-shot-1783244324767-83262`, step `20 PASS`/`5 SKIPPED`입니다.
  summary는
  [one-shot-inapp-final/summary.json](./release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/summary.json)
  에 보존했습니다. SKIPPED된 build/30분/120분/runtime-console longrun은 각각 별도
  evidence 또는 조건부 미실행으로 분리하며 UI PASS로 대체하지 않습니다.
- 120분 longrun: AGENTS 7.6.2의 직접 진행 조건이 충족되지 않아 조건부 미실행입니다.
  이 항목은 120분 PASS evidence가 아닙니다.
- Release action: PR #58 `v3.7.0 -> main`은 `guardrails`와 `static-gates` PASS 뒤
  merge commit `09f074c8a69585020d6d03dbd3d048c16957fdac`로 main에 병합했습니다.
  초기 SSH-signed annotated tag `v3.7.0`은 tag object
  `3802d41f7f3979556f637251bd6718774659d7c3`, target commit
  `09f074c8a69585020d6d03dbd3d048c16957fdac`였고 GitHub API tag verification은
  `verified=true`/`reason=valid`였습니다. GitHub Release는
  [v3.7.0](https://github.com/dhseo90/MediaServer/releases/tag/v3.7.0)로 생성했습니다.
  다만 이후 `v3.7.0` published metadata 보정 커밋이 발생하므로 이 초기 tag는 최종
  v3.7.0 closure evidence가 아니라 initial publication evidence로 보존합니다.
- Published metadata initial: GitHub Release 생성 직후 `./server.sh verify-release-metadata --published`는
  GitHub latest/list/view가 실제 `v3.7.0`을 가리키지만 local docs/verifier latest
  published 기준이 아직 `v3.6.0`이라 `pass=18 fail=3`으로 실패했습니다.
  제품 runtime/media 회귀가 아니라 publish 이후 metadata 기준 drift입니다.
- Published metadata correction: README/docs/policy/backlog/UI asset manifest/verifier
  latest published 기준을 `v3.7.0`으로 정렬했습니다. `./server.sh verify-release-metadata`,
  `./server.sh verify-docs-ui-assets`, `./server.sh verify-v370-entry-baseline`,
  `./server.sh verify-release-evidence-index`, `git diff --check`는 PASS했고, 최종
  `./server.sh verify-release-metadata --published --release-branch main`은 `pass=21 fail=0`으로
  통과했습니다. 이 보정 전 initial tag/Release는 final closure evidence로 쓰지 않습니다.
- Field smoke는 이 release run에서 실행하지 않았고 endpoint/credential/실기기/provider 조건이
  없는 not-run 항목입니다.

## v3.5.0 local readiness gate records

v3.5.0 stabilization/release readiness는
`media-server.v350-stabilization-release-readiness.v1` 기준으로 v3.5.0 Step 1~12
local verifier와 release records를 묶는 색인입니다. 이 섹션은 release action을
승인하거나 실행하지 않고, UI 풀테스트 직접 조작, 30분/120분 longrun, published
metadata, release action evidence를 대체하지 않습니다.

v3.5.0 local readiness gate는 v3.5.0 stabilization/release readiness 문서/명령 연결을
확인할 뿐, UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence를 대체하지 않습니다.

Companion local gate:

```bash
./server.sh verify-v350-stabilization-release-readiness
./server.sh build
./server.sh verify-v350-entry-baseline
./server.sh verify-v350-live-operations-graph-contract
./server.sh verify-v350-operations-command-plan-contract
./server.sh verify-v350-incident-to-command-handoff
./server.sh verify-v350-staged-change-plan-impact-preview
./server.sh verify-v350-ops-command-workspace-ui
./server.sh verify-v350-drill-run-ledger-plan-comparison
./server.sh verify-v350-client-impact-forecast
./server.sh verify-v350-client-safe-operations-notice
./server.sh verify-v350-operations-export-bundle-handoff-map
./server.sh verify-v350-field-evidence-intake
./server.sh verify-v350-vlm-assisted-ops-explanation
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-project-inventory
./server.sh verify-feature-inventory-coverage
./server.sh verify-release-evidence-index
./server.sh verify-release-closeout-helper --dry-run
./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run
./server.sh verify-script-inventory
git diff --check
```

## v3.5.0 release run evidence

v3.5.0 release run evidence는 local readiness gate와 분리해 관리합니다. 30분 soak와
UI 풀테스트는 2026-06-30 승인 범위에서 실행했고, PR/main/tag/GitHub Release,
`verify-release-metadata --published`, 120분 longrun, field smoke는 이 run에서
실행하지 않았습니다.

- 30분 soak: 최종 `./server.sh verify-predev --soak-minutes 30` run은 `status=pass`,
  `pass=119`, `fail=0`, `skip=1`, `durationSec=2365`, `soakMinutes=30`입니다.
  Summary/report/html은 [predev-1782831234-48352](./release-artifacts/v3.5.0/predev-1782831234-48352/summary.json)에
  보존했고 `/tmp` 원본과 `.media_server.test` transient output은 cleanup 완료했습니다.
- UI 풀테스트: Codex 인앱 브라우저 직접 검수로 route 15개, screenshot 40장,
  interaction 16개, failed interaction 0, failures 0을 확인했습니다.
  One-shot wrapper는 runId `ui-fulltest-one-shot-1782834626846-95806`으로 PASS했고
  [in-app evidence](./release-artifacts/v3.5.0/ui-fulltest-20260630/in-app-evidence.json)와
  [one-shot summary](./release-artifacts/v3.5.0/ui-fulltest-20260630/one-shot/summary.json)를
  보존했습니다.

## v3.4.0 release publication evidence

v3.4.0 publication evidence는 [release-test-records.md](./release-test-records.md)의
`v340 release PR/main/tag/GitHub Release`, `v340 release published metadata initial`,
`v340 release published metadata correction` 행에서 관리합니다. PR #49 main merge,
annotated tag, GitHub Release, published metadata 재검증은 Step 11 local readiness,
30분 soak, UI 풀테스트 evidence와 분리합니다. Release branch 삭제와 후속 브랜치 생성은
명시 승인 전 수행하지 않습니다.

## v3.4.0 Step 11 local readiness gate records

v3.4.0 Step 11 stabilization/release readiness는
`media-server.v340-stabilization-release-readiness.v1` 기준으로 v3.4.0 Step 1~10
local verifier와 release records를 묶는 색인입니다. 이 섹션은 release action을
승인하거나 실행하지 않고, UI 풀테스트 직접 조작, 30분/120분 longrun, published
metadata, release action evidence를 대체하지 않습니다.

Companion local gate:

```bash
./server.sh verify-v340-stabilization-release-readiness
./server.sh build
./server.sh verify-v340-entry-baseline
./server.sh verify-v340-continuity-drill-contract
./server.sh verify-v340-recovery-candidate-package
./server.sh verify-v340-staging-restore-validation-harness
./server.sh verify-v340-source-health-replay-drift-diff
./server.sh verify-v340-ops-continuity-drill-workspace-ui
./server.sh verify-v340-approval-gated-recovery-checklist-audit
./server.sh verify-v340-client-safe-maintenance-digest
./server.sh verify-v340-drill-evidence-export-cleanup-manifest
./server.sh verify-v340-field-bridge-condition-gates
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-project-inventory
./server.sh verify-feature-inventory-coverage
./server.sh verify-release-evidence-index
./server.sh verify-release-closeout-helper --dry-run
./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run
./server.sh verify-script-inventory
git diff --check
```

v3.4.0 Step 11 stabilization/release readiness local gate는 UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence를 대체하지 않습니다.

## v3.3.0 Step 11 local readiness gate records

v3.3.0 Step 11 stabilization/release readiness는
`media-server.v330-stabilization-release-readiness.v1` 기준으로 v3.3.0 Step 1~10
local verifier와 release records를 묶는 색인입니다. 이 섹션은 release action을
승인하거나 실행하지 않고, UI 풀테스트 직접 조작, 30분/120분 longrun, published
metadata, release action evidence를 대체하지 않습니다.

Companion local gate:

```bash
./server.sh verify-v330-stabilization-release-readiness
./server.sh build
./server.sh verify-v330-entry-baseline
./server.sh verify-v330-source-registry-snapshot-identity
./server.sh verify-v330-source-onboarding-quality-summary
./server.sh verify-v330-reliability-timeline-health-history
./server.sh verify-v330-incident-source-correlation-layer
./server.sh verify-v330-operator-recheck-recovery-queue
./server.sh verify-v330-client-safe-source-status-digest
./server.sh verify-v330-operator-runbook-reliability-handoff
./server.sh verify-v330-source-reliability-search-metrics
./server.sh verify-v330-ops-backup-recovery-source-handoff
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-project-inventory
./server.sh verify-feature-inventory-coverage
./server.sh verify-release-evidence-index
./server.sh verify-release-closeout-helper --dry-run
./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run
./server.sh verify-script-inventory
git diff --check
```

v3.3.0 Step 11 stabilization/release readiness local gate는 UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence를 대체하지 않습니다.

## v3.2.0 Step 11 local readiness gate records

v3.2.0 Step 11 stabilization/release readiness는
`media-server.v320-stabilization-release-readiness.v1` 기준으로 v3.2.0 Step 1~10
local verifier와 release records를 묶는 색인입니다. 이 섹션은 release action을
승인하거나 실행하지 않고, UI 풀테스트 직접 조작, 30분/120분 longrun, published
metadata, release action evidence를 대체하지 않습니다.

Companion local gate:

```bash
./server.sh verify-v320-stabilization-release-readiness
./server.sh build
./server.sh verify-v320-entry-baseline
./server.sh verify-v320-resolution-state-contract
./server.sh verify-v320-unified-ops-events-workspace
./server.sh verify-v320-evidence-quality-layer
./server.sh verify-v320-source-reliability-context
./server.sh verify-v320-source-reliability-runtime-sample
./server.sh verify-v320-ai-review-quality-context
./server.sh verify-v320-operator-resolution-flow
./server.sh verify-v320-action-readiness-checklist
./server.sh verify-v320-client-safe-resolution-digest
./server.sh verify-v320-resolution-search-metrics
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-project-inventory
./server.sh verify-feature-inventory-coverage
./server.sh verify-release-evidence-index
./server.sh verify-release-closeout-helper --dry-run
./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run
./server.sh verify-script-inventory
git diff --check
```

v3.2.0 Step 11 stabilization/release readiness local gate는 UI 풀테스트 직접 조작,
30분/120분 longrun, published metadata, release action evidence를 대체하지 않습니다.

## Test Token Usage Ledger

테스트 실행 기록은 평균 비용 산출을 위해 아래 형식으로 누적합니다. 테스트 결과와
토큰 사용량은 서로 다른 값입니다. 토큰 사용량이 적거나 많다는 이유로 PASS/FAIL을
바꾸지 않습니다.

| date | run id | test area | scope | verdict | token start | token end | token consumed | elapsed | token usage source | evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-07-08 | v390-server-longrun-20260708133759-79962 | 30분 테스트 | 사용자 승인 후 `./server.sh verify-v390-server-longrun --duration-minutes 30 --output-dir docs/release-artifacts/v3.9.0/server-longrun-30min-final` final run. Runner summary `result=PASS`, `longrunEvidenceStatus=real-duration-evidence`, `realDurationEvidence=true`; delegated predev summary `status=pass`, `pass=118`, `fail=0`, `skip=2`, `durationSec=2341`, `soakMinutes=30`. External TURN hard gate는 요청하지 않아 skip이며 PASS가 아님. 120분/UI/published/release action/field smoke는 별도 미실행 경계로 분리 | PASS | 미집계 | 미집계 | 미집계 | durationSec 2341 | command summary/report; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.9.0 section, [runner summary](./release-artifacts/v3.9.0/server-longrun-30min-final/summary.json), [runner report](./release-artifacts/v3.9.0/server-longrun-30min-final/report.md), [predev summary](./release-artifacts/v3.9.0/server-longrun-30min-final/predev-summary.json), [predev report](./release-artifacts/v3.9.0/server-longrun-30min-final/predev-report.md) |
| 2026-07-06 | v380-release-30min-20260706 | 30분 테스트 | 승인된 `./server.sh verify-predev --soak-minutes 30 --rtsp-port 18798 --http-port 18298 ...` final run. Summary `status=pass`, `pass=119`, `fail=0`, `skip=1`, `durationSec=2369`, `soakMinutes=30`, `steps=120`. integrated smoke PASS, 22회 soak iteration, ports-clean PASS. External TURN hard gate는 요청하지 않아 skip이며 PASS가 아님 | PASS | 미집계 | 미집계 | 미집계 | durationSec 2369 | command summary/report; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.8.0 section, [predev summary](./release-artifacts/v3.8.0/predev-30min-20260706/summary.json), [predev report](./release-artifacts/v3.8.0/predev-30min-20260706/report.md) |
| 2026-07-06 | v380-release-120min-20260706 | 120분 longrun | 승인된 `./server.sh verify-predev --soak-minutes 120 --rtsp-port 18898 --http-port 18398 ...` final run. Summary `status=pass`, `pass=444`, `fail=0`, `skip=1`, `durationSec=7753`, `soakMinutes=120`, `steps=445`. integrated smoke PASS 뒤 87회 soak iteration, ports-clean PASS. External TURN hard gate는 요청하지 않아 skip이며 PASS가 아님 | PASS | 미집계 | 미집계 | 미집계 | durationSec 7753 | command summary/report; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.8.0 section, [predev summary](./release-artifacts/v3.8.0/predev-120min-20260706/summary.json), [predev report](./release-artifacts/v3.8.0/predev-120min-20260706/report.md) |
| 2026-07-06 | v380-release-ui-fulltest-inapp-20260706 | UI 풀테스트 | Codex 인앱 브라우저 직접 evidence route `10`, screenshot `40`, interaction `16`, failed interaction `0`, routeIssues `[]`. `verify-ui-fulltest-one-shot --browser-mode in-app --in-app-evidence docs/release-artifacts/v3.8.0/ui-fulltest-20260706/in-app-evidence.json --skip-build --skip-manual-result`는 `result=PASS`, runId `ui-fulltest-one-shot-1783362652122-25088`, step `20 PASS`/`5 SKIPPED`/`0 FAIL`입니다. build/manual/predev/runtime-console은 wrapper에서 skip했고 별도 evidence/boundary로 분리합니다 | PASS | 미집계 | 미집계 | 미집계 | one-shot runId `ui-fulltest-one-shot-1783362652122-25088` | Codex in-app evidence and one-shot wrapper output; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.8.0 section, [ui evidence](./release-artifacts/v3.8.0/ui-fulltest-20260706/in-app-evidence.json), [one-shot summary](./release-artifacts/v3.8.0/ui-fulltest-20260706/one-shot-inapp-final/summary.json) |
| 2026-07-06 | v380-release-runtime-console-120min-not-run-20260706 | 120분 runtime console | `verify-predev --soak-minutes 120`은 완료했지만 별도 runtime-console 120분은 실행하지 않았습니다. 이 행은 predev 120분 PASS를 runtime-console 120분 PASS로 승격하지 않기 위한 blocker/boundary 기록입니다 | FAIL | 미집계 | 미집계 | 미집계 | 미실행 | release-test-records boundary; command-level token split 없음 | [release-test-records.md](./release-test-records.md) v3.8.0 section |
| 2026-07-06 | v380-release-field-smoke-not-run-20260706 | field smoke | ONVIF 실기기, external TURN/WHEP, cloud/VLM provider endpoint/credential/실기기 조건이 없어 실제 field smoke는 실행하지 않았습니다. Local readiness, 30분/120분 predev, UI fulltest PASS로 field smoke PASS를 대체하지 않습니다 | FAIL | 미집계 | 미집계 | 미집계 | 조건부 미실행 | release-test-records boundary; command-level token split 없음 | [release-test-records.md](./release-test-records.md) v3.8.0 section |
| 2026-07-05 | v370-release-ui-wrapper-partial-inapp-20260705 | UI 자동 smoke + 인앱 partial evidence | `verify-ui-fulltest-one-shot --browser-mode chrome --allow-chrome-fallback --skip-manual-result`는 `result=PASS`, runId `ui-fulltest-one-shot-1783239016082-59069`, widths `390,1180`, visualWidths `320,390,760,1180`입니다. Codex 인앱 route partial evidence는 pre-final 단계에서 route `18`, overflowIssues `[]`까지 생성/검토했지만 최종 in-app schema/interaction gate가 없어 AGENTS 기준 UI 풀테스트 PASS가 아닙니다. 이 행은 release blocker를 숨기지 않기 위한 기록이며 Chrome wrapper PASS를 인앱 UI PASS로 승격하지 않습니다 | FAIL | 미집계 | 미집계 | 미집계 | one-shot runId `ui-fulltest-one-shot-1783239016082-59069` | Chrome fallback one-shot summary와 pre-final partial in-app route evidence 기록; raw partial files는 최종 PASS 이후 cleanup했고 command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.7.0 section, [one-shot summary](./release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-rerun/summary.json) |
| 2026-07-05 | v370-release-ui-fulltest-inapp-20260705 | UI 풀테스트 | Codex 인앱 브라우저 직접 evidence route `10`, screenshot `40`, interaction `16`, failed interaction `0`, routeIssues `[]`. `verify-ui-fulltest-one-shot --browser-mode in-app --in-app-evidence docs/release-artifacts/v3.7.0/ui-fulltest-20260705/in-app-evidence.json --skip-build --skip-manual-result`는 `result=PASS`, runId `ui-fulltest-one-shot-1783244324767-83262`, step `20 PASS`/`5 SKIPPED`, widths `390,1180`, visualWidths `320,390,760,1180`입니다. build는 wrapper에서 skip했고 30분은 별도 PASS row, 120분/runtime-console은 조건부 미실행/별도 미실행으로 분리합니다 | PASS | 미집계 | 미집계 | 미집계 | one-shot runId `ui-fulltest-one-shot-1783244324767-83262` | Codex in-app evidence and one-shot wrapper output; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.7.0 section, [ui evidence](./release-artifacts/v3.7.0/ui-fulltest-20260705/in-app-evidence.json), [one-shot summary](./release-artifacts/v3.7.0/ui-fulltest-20260705/one-shot-inapp-final/summary.json) |
| 2026-07-05 | v370-release-30min-code-comment-precheck-20260705 | 30분 테스트 | 최초 승인 run은 integrated-smoke `verify-code-comments`가 v3.7 verifier 5개 영어-only 상단 용도 주석을 잡아 실패가 확정됐고 중단했습니다. 해당 5개 파일의 헤더를 한글 `파일 용도` 주석으로 보정한 뒤 `./server.sh verify-code-comments`가 files `529`, missing headers `0`, english-only comments `0`으로 통과했습니다. 이 행은 최종 30분 PASS evidence가 아닙니다 | FAIL | 미집계 | 미집계 | 미집계 | interrupted after code-comment failure diagnosis | command output and release-test-records migration; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.7.0 section |
| 2026-07-05 | v370-release-30min-20260705 | 30분 테스트 | code comment policy 보정 후 승인된 `MEDIA_SERVER_SKIP_LOCAL_ENV=1 ./server.sh verify-predev --soak-minutes 30 --rtsp-port 18698 --http-port 18198 ...` 최종 run. summary `status=pass`, `pass=119`, `fail=0`, `skip=1`, `durationSec=2361`, `soakMinutes=30`, `steps=120`. integrated-smoke PASS, 22회 soak iteration, main-runtime-idle, event-post-queue, queue-runtime-idle, ports-clean, summary-report PASS. External TURN hard gate는 요청하지 않아 skip이며 PASS가 아님 | PASS | 미집계 | 미집계 | 미집계 | durationSec 2361 | command summary and preserved report; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.7.0 section, [predev summary](./release-artifacts/v3.7.0/predev-30min-20260705-final/summary.json), [predev report](./release-artifacts/v3.7.0/predev-30min-20260705-final/report.md) |
| 2026-07-05 | v370-release-120min-conditional-20260705 | 120분 longrun | AGENTS 7.6.2 기준 최신 사용자 지시, v3.7 release policy/roadmap/evidence, 변경 기능 ID, media/runtime/cleanup 변경, 30분 결과 high-risk signal 중 120분을 `진행 대상`으로 끌어오는 직접 근거가 없습니다. 최종 30분은 `fail=0`이고 memory/runtime/cleanup/media-session drift signal을 남기지 않았습니다. 조건부 미실행이며 120분 PASS evidence가 아닙니다 | FAIL | 미집계 | 미집계 | 미집계 | 조건부 미실행 | AGENTS 7.6.2 판정과 project feature inventory/release summary 직접 확인; command-level token split 없음 | [release-test-records.md](./release-test-records.md) v3.7.0 section, [project feature inventory](./project-feature-test-inventory.md) |
| 2026-07-05 | v370-release-initial-publication-20260705 | release action | PR #58 `v3.7.0 -> main` merge commit `09f074c8a69585020d6d03dbd3d048c16957fdac`, initial signed tag object `3802d41f7f3979556f637251bd6718774659d7c3`, GitHub API verification `verified=true`/`reason=valid`, GitHub Release `https://github.com/dhseo90/MediaServer/releases/tag/v3.7.0`. 이후 published metadata 보정 커밋을 포함하도록 tag target을 corrected commit으로 옮겨야 하므로 이 row는 initial publication evidence입니다 | PASS | 미집계 | 미집계 | 미집계 | GitHub PR/check/tag/release command output 기준 | initial publication evidence; final closure는 보정 PR/main merge, signed tag force-update, published metadata final PASS에서 분리 기록 | [release-test-records.md](./release-test-records.md) v3.7.0 section |
| 2026-07-05 | v370-published-metadata-initial-20260705 | published metadata | GitHub Release 생성 직후 `./server.sh verify-release-metadata --published` 최초 실행. GitHub latest/list/view가 실제 `v3.7.0`을 가리키지만 local docs/verifier latest published 기준이 `v3.6.0`이라 `pass=18 fail=3`으로 실패했습니다. 제품 runtime/media 회귀가 아니라 publish 이후 metadata 기준 drift입니다 | FAIL | 미집계 | 미집계 | 미집계 | command output 기준 | initial published metadata failure; final correction PASS는 보정 merge/tag 후 분리 기록 | [release-test-records.md](./release-test-records.md) v3.7.0 section |
| 2026-07-05 | v370-published-metadata-correction-20260705 | published metadata | README/docs/policy/backlog/UI asset manifest/verifier latest published 기준을 `v3.7.0`으로 정렬한 뒤 `./server.sh verify-release-metadata`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-v370-entry-baseline`, `./server.sh verify-release-evidence-index`, `git diff --check`, `./server.sh verify-release-metadata --published --release-branch main`를 재실행했습니다. 최종 published metadata는 `pass=21 fail=0`으로 통과했습니다 | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | published metadata PASS is after post-publish metadata correction; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.7.0 section |
| 2026-07-04 | v360-release-local-gates-rerun-20260704 | 안정화 테스트 | v3.6.0 Step 14 local readiness gate와 Step 1~13 companion verifiers, release metadata/docs/assets/inventory/evidence/script/closeout dry-run, `git diff --check` 재실행. UI 풀테스트/30분/120분/published metadata/release actions/field smoke는 이 PASS로 대체하지 않음 | PASS | 미집계 | 미집계 | 미집계 | command summaries only | command-level token split 미집계; same goal turn later captured for failed 30분 row | [release-test-records.md](./release-test-records.md) v3.6.0 section |
| 2026-07-04 | v360-release-30min-sandbox-failure-20260704 | 30분 테스트 | `./server.sh verify-predev --soak-minutes 30` 실행. build PASS 후 `server-start-queue-256`/`server-start-queue-2`가 RTSP `127.0.0.1:8555` bind `Operation not permitted`로 FAIL. summary `status=fail`, `pass=3`, `fail=2`, `skip=0`, `durationSec=8`, `soakMinutes=30`. `lsof`에서 포트 점유 없음. 비샌드박스 재실행 요청은 승인되지 않아 최종 30분 PASS evidence가 아님. `/tmp/media_server_predev-1783095006-82341*` 값은 release records로 이관 후 cleanup 완료 | FAIL | 141330 | 208059 | 66729 | goal snapshot 230s to failure diagnosis | Codex goal snapshot; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.6.0 section |
| 2026-07-04 | v360-release-30min-code-comment-failure-20260704 | 30분 테스트 | 승인된 비샌드박스 `./server.sh verify-predev --soak-minutes 30` 최초 run. integrated-smoke의 `verify-code-comments`가 v3.6 verifier 6개 영어-only 상단 용도 주석을 잡아 summary `status=fail`, `pass=118`, `fail=1`, `skip=1`, `durationSec=2364`, `soakMinutes=30`으로 종료. 헤더를 한글 `파일 용도` 주석으로 보정한 뒤 `./server.sh verify-code-comments`가 `missing headers=0`, `english-only comments=0`으로 통과. 이 FAIL은 최종 30분 PASS evidence가 아님 | FAIL | 미집계 | 미집계 | 미집계 | durationSec 2364 | command summary and preserved failure report; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.6.0 section, [failure summary](./release-artifacts/v3.6.0/predev-1783150577-40687-fail-code-comments/media_server_predev-1783150577-40687_summary.json), [failure report](./release-artifacts/v3.6.0/predev-1783150577-40687-fail-code-comments/media_server_predev-1783150577-40687_report.md) |
| 2026-07-04 | v360-release-30min-20260704 | 30분 테스트 | code comment policy 보정 후 승인된 비샌드박스 `./server.sh verify-predev --soak-minutes 30` 최종 run. summary `status=pass`, `pass=119`, `fail=0`, `skip=1`, `durationSec=2356`, `soakMinutes=30`, `steps=120`. integrated-smoke PASS, 22회 soak iteration, main-runtime-idle, event-post-queue, queue-runtime-idle, ports-clean, summary-report PASS. External TURN hard gate는 요청하지 않아 skip이며 PASS가 아님. UI 풀테스트/120분/published/release actions/field smoke는 별도 | PASS | 미집계 | 미집계 | 미집계 | durationSec 2356 | command summary and preserved report; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.6.0 section, [predev summary](./release-artifacts/v3.6.0/predev-1783153043-79079/media_server_predev-1783153043-79079_summary.json), [predev report](./release-artifacts/v3.6.0/predev-1783153043-79079/media_server_predev-1783153043-79079_report.md) |
| 2026-07-04 | v360-release-ui-fulltest-20260704 | UI 풀테스트 | Codex 인앱 브라우저 직접 검수. route 15개, screenshot 40개, interaction 16개, failed interaction 0. `verify-ui-fulltest-one-shot --browser-mode in-app --in-app-evidence docs/release-artifacts/v3.6.0/ui-fulltest-20260704/in-app-evidence.json --skip-build --skip-manual-result` result PASS, runId `ui-fulltest-one-shot-1783164060346-62410`, 20 PASS steps, 5 SKIPPED boundary steps. raw auth/registry/log/ports/seed plan은 cleanup 완료. 30분 soak는 별도 PASS row, 120분/field/published/release actions는 본 run에서 실행하지 않음 | PASS | 미집계 | 미집계 | 미집계 | one-shot runId `ui-fulltest-one-shot-1783164060346-62410` | Codex in-app evidence and one-shot wrapper output; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.6.0 section, [ui evidence](./release-artifacts/v3.6.0/ui-fulltest-20260704/in-app-evidence.json), [one-shot summary](./release-artifacts/v3.6.0/ui-fulltest-20260704/one-shot/summary.json) |
| 2026-07-04 | v360-release-120min-20260704 | 120분 longrun | 승인된 비샌드박스 `./server.sh verify-predev --soak-minutes 120` run. summary `status=pass`, `pass=444`, `fail=0`, `skip=1`, `durationSec=7745`, `soakMinutes=120`, `steps=445`. integrated-smoke PASS 뒤 87회 soak iteration, main-runtime-idle, event-post-queue, queue-runtime-idle, ports-clean, summary-report PASS. External TURN hard gate는 요청하지 않아 skip이며 PASS가 아님 | PASS | 미집계 | 미집계 | 미집계 | durationSec 7745 | command summary and preserved report; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.6.0 section, [120min summary](./release-artifacts/v3.6.0/predev-1783164699-79436-120min/media_server_predev-1783164699-79436_summary.json), [120min report](./release-artifacts/v3.6.0/predev-1783164699-79436-120min/media_server_predev-1783164699-79436_report.md) |
| 2026-07-04 | v360-release-field-smoke-procedure-gates-20260704 | field smoke gate | `verify-external-turn-whep-field-gate`, `verify-vlm-cloud-provider-field-smoke-gate`, `verify-onvif-field-smoke-gate`, `verify-onvif-field-smoke-redaction` 절차 gate PASS. 실제 ONVIF 실기기, external TURN/WHEP, cloud/VLM provider field smoke는 endpoint/credential/실기기/provider 조건이 없어 `not-run`이며 local/30분/120분/UI PASS로 대체하지 않음 | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | field smoke procedure command outputs; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.6.0 section |
| 2026-07-04 | v360-release-initial-publication-20260704 | release publication | PR #55 `v3.6.0 -> main` checks `guardrails`/`static-gates` PASS 후 merge commit `858cc61e05a6155df8ba3ccfce12765610b728d8`로 병합. 초기 SSH-signed annotated tag `v3.6.0`은 tag object `67fbb47be4b042074d6d28117e9d77301624b771`, target `858cc61e05a6155df8ba3ccfce12765610b728d8`, GitHub API verification `verified=true`/`reason=valid`였고 GitHub Release `https://github.com/dhseo90/MediaServer/releases/tag/v3.6.0`를 생성했습니다. 이후 published metadata correction이 발생했으므로 이 초기 tag는 최종 v3.6.0 closure evidence가 아니라 initial publication evidence로만 보존합니다. 최종 tag closure는 PR #56 correction과 tag closure policy/evidence correction을 포함하는 최신 main close-out commit에 signed tag를 재생성/force-update하고 live GitHub API verification으로 확인합니다. | PASS | 미집계 | 미집계 | 미집계 | GitHub PR/check/tag/release command output 기준 | initial publication command output; final corrected tag object는 signing 이후 live GitHub evidence로 확인 | [release-test-records.md](./release-test-records.md) v3.6.0 section, [GitHub Release v3.6.0](https://github.com/dhseo90/MediaServer/releases/tag/v3.6.0), [PR #55](https://github.com/dhseo90/MediaServer/pull/55) |
| 2026-07-04 | v360-published-metadata-initial-20260704 | published metadata | GitHub Release 생성 직후 `./server.sh verify-release-metadata --published` 최초 실행. GitHub latest/list/view가 실제 `v3.6.0`을 가리키지만 local docs/verifier latest published 기준이 `v3.5.0`이라 `pass=18 fail=3`으로 실패했습니다. 제품 runtime/media 회귀가 아니라 publish 이후 metadata 기준 drift입니다. | FAIL | 미집계 | 미집계 | 미집계 | command output 기준 | initial published metadata failure; final correction PASS는 다음 행에서 분리 기록 | [release-test-records.md](./release-test-records.md) v3.6.0 section |
| 2026-07-04 | v360-published-metadata-correction-20260704 | published metadata | README/docs/policy/backlog/UI asset manifest/verifier latest published 기준을 `v3.6.0`으로 정렬한 뒤 `./server.sh verify-release-metadata`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-v360-entry-baseline`, `git diff --check`, `./server.sh verify-release-metadata --published`를 재실행했습니다. 최종 published metadata는 `pass=21 fail=0`으로 통과했습니다. | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | published metadata PASS is after post-publish metadata correction; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.6.0 section |
| 2026-06-21 | v310-s09-stabilization-release-readiness-20260621 | 안정화 테스트 | V310-S09 local readiness gate, S00~S08 companion verifiers, release metadata/docs/assets/inventory/evidence/script/closeout dry-run, temp cleanup, `git diff --check`. UI 풀테스트/30분/120분/published metadata/release actions/field smoke는 미실행 | PASS | 미집계 | 미집계 | 미집계 | command summaries only | manual-not-available; final goal snapshot은 최종 보고에서 별도 확인 | [release-test-records.md](./release-test-records.md) v3.1.0 section |
| 2026-06-30 | v350-step13-stabilization-release-readiness-20260630 | 안정화 테스트 | v3.5.0 Step 13 local readiness gate, Step 1~12 companion verifiers, release metadata/docs/assets/inventory/evidence/script/closeout dry-run, `git diff --check`. 30분 predev와 UI 풀테스트는 각각 별도 `v350-release-30min-20260630`, `v350-release-ui-fulltest-20260630` 행에서 release run evidence로 분리. 120분/published metadata/release actions/field smoke는 미실행 | PASS | 미집계 | 미집계 | 미집계 | command summaries only | command-level usage 미집계; local gate evidence only | [release-test-records.md](./release-test-records.md) v3.5.0 section |
| 2026-06-30 | v350-release-30min-20260630 | 30분 soak | 최종 권한 상승 `./server.sh verify-predev --soak-minutes 30` 실행. status pass, pass 119, fail 0, skip 1, durationSec 2365, soakMinutes 30, steps 120. integrated-smoke PASS, 22회 soak iteration의 VA events/Event POST schema/recovery/redaction/runtime idle 반복 PASS, main-runtime-idle/event-post-queue/queue-runtime-idle/ports-clean/summary-report PASS. 최초 sandbox bind failure와 최초 approved code comment failure는 원인 보정 후 재검증했고 최종 PASS evidence에는 포함하지 않음. External TURN hard gate는 요청하지 않아 skip이며 PASS로 대체하지 않음. Summary/report/html은 `docs/release-artifacts/v3.5.0/predev-1782831234-48352/`에 보존했고 `/tmp` 원본과 transient output은 cleanup 완료 | PASS | 미집계 | 미집계 | 미집계 | durationSec 2365 | command summary and preserved report; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.5.0 section, [predev summary](./release-artifacts/v3.5.0/predev-1782831234-48352/summary.json), [predev report](./release-artifacts/v3.5.0/predev-1782831234-48352/report.md) |
| 2026-06-30 | v350-release-ui-fulltest-20260630 | UI 풀테스트 | Codex 인앱 브라우저 직접 검수. route 15개, screenshot 40개, interaction 16개, failed interaction 0, failures 0. `verify-ui-fulltest-one-shot --browser-mode in-app --in-app-evidence docs/release-artifacts/v3.5.0/ui-fulltest-20260630/in-app-evidence.json --skip-build --skip-manual-result` result PASS, runId `ui-fulltest-one-shot-1782834626846-95806`, 20 PASS steps, 5 SKIPPED boundary steps. raw auth/registry/log/ports/seed plan은 cleanup 완료. 30분 soak는 별도 PASS row, 120분/field/published/release actions는 본 run에서 실행하지 않음 | PASS | 미집계 | 미집계 | 미집계 | one-shot runId `ui-fulltest-one-shot-1782834626846-95806` | Codex in-app evidence and one-shot wrapper output; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.5.0 section, [ui evidence](./release-artifacts/v3.5.0/ui-fulltest-20260630/in-app-evidence.json), [one-shot summary](./release-artifacts/v3.5.0/ui-fulltest-20260630/one-shot/summary.json) |
| 2026-07-01 | v350-release-publication-20260701 | release publication | PR #51 `v3.5.0 -> main`은 GitHub Actions를 July 기본값 `enabled=true`, `allowed_actions=all`로 재개한 뒤 v3.5.0 기준 close/reopen을 한 번만 수행해 `guardrails`/`static-gates` required checks를 생성했습니다. `guardrails` run `28511931938` SUCCESS, `static-gates` run `28511931972` SUCCESS 확인 뒤 merge commit `d8473cad4897b90d6dc18aac883bc76bb06cc199`로 병합했습니다. 최초 unsigned annotated tag `v3.5.0` tag object는 `7d6e3ab955799f20c977581dfe792ad0ac342458`였고, signed tag policy 보정 뒤 같은 target commit의 SSH-signed annotated tag object `882a277f20a1d50dcbac53463ebe088d3c9938fa`로 교체했습니다. GitHub Release `https://github.com/dhseo90/MediaServer/releases/tag/v3.5.0`을 생성했습니다. Release branch 삭제는 사용자 승인 후 수행했고 후속 브랜치 생성은 수행하지 않음 | PASS | 미집계 | 미집계 | 미집계 | GitHub PR/check/tag/release command output 기준 | PR/check/tag/release command output; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.5.0 section, [GitHub Release v3.5.0](https://github.com/dhseo90/MediaServer/releases/tag/v3.5.0), [PR #51](https://github.com/dhseo90/MediaServer/pull/51) |
| 2026-07-01 | v350-published-metadata-initial-20260701 | published metadata | GitHub Release 생성 직후 `./server.sh verify-release-metadata --published` 최초 실행. GitHub latest/list/view가 실제 `v3.5.0`을 가리키지만 local docs/verifier latest published 기준이 `v3.4.0`이라 `pass=18 fail=3`으로 실패했습니다. 제품 runtime/media 회귀가 아니라 publish 이후 metadata 기준 drift로 분리했고, 보정 변경에서 최신 공개 기준을 `v3.5.0`으로 정렬했습니다. | FAIL | 미집계 | 미집계 | 미집계 | command output 기준 | initial published metadata failure; final correction PASS는 다음 행에서 분리 기록 | [release-test-records.md](./release-test-records.md) v3.5.0 section |
| 2026-07-01 | v350-published-metadata-correction-20260701 | published metadata | README/docs/policy/backlog/UI asset manifest/verifier latest published 기준을 `v3.5.0`으로 정렬한 뒤 `./server.sh verify-release-metadata --published`를 재실행했습니다. 최신 공개 GitHub Release, release URL, remote tag, release branch, public entry docs, policy docs, backlog/docs index/UI guide 기준이 `v3.5.0`으로 정렬되어 `pass=21 fail=0`으로 통과했습니다. Direct main push는 required check ruleset 때문에 거절되어 metadata 보정은 PR #52 required-check 경로로 반영합니다. | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | published metadata PASS is after post-publish metadata correction; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.5.0 section |
| 2026-07-01 | v350-verified-tag-correction-20260701 | release publication | `AGENTS.md` tag 생성 규칙을 signed annotated/Verified evidence 기준으로 보강하는 PR #53을 required checks PASS 후 merge했습니다. GitHub 등록 SSH signing key `MacDog release signing 2026-06-27`와 로컬 signing public key 일치를 확인했고, local `git tag -v v3.5.0`가 `Good "git" signature`로 통과했습니다. remote `v3.5.0` tag는 initial unsigned tag object `7d6e3ab955799f20c977581dfe792ad0ac342458`에서 SSH-signed tag object `882a277f20a1d50dcbac53463ebe088d3c9938fa`로 force update했으며, target commit은 `d8473cad4897b90d6dc18aac883bc76bb06cc199`로 유지했습니다. GitHub API tag verification은 `verified=true`/`reason=valid`, verified_at `2026-07-01T12:29:58Z`입니다. | PASS | 미집계 | 미집계 | 미집계 | command/API output 기준 | signed tag correction evidence; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.5.0 section, [GitHub Release v3.5.0](https://github.com/dhseo90/MediaServer/releases/tag/v3.5.0), [PR #53](https://github.com/dhseo90/MediaServer/pull/53) |
| 2026-06-28 | v340-step11-stabilization-release-readiness-20260628 | 안정화 테스트 | v3.4.0 Step 11 local readiness gate, Step 1~10 companion verifiers, release metadata/docs/assets/inventory/evidence/script/closeout dry-run, temp cleanup, `git diff --check`. 30분 predev와 UI 풀테스트는 각각 별도 `v340-release-30min-20260628`, `v340-release-ui-fulltest-20260628` 행에서 release run evidence로 분리. 120분/published metadata/release actions/field smoke는 미실행 | PASS | 미집계 | 미집계 | 미집계 | command summaries only | command-level usage 미집계; local gate evidence only | [release-test-records.md](./release-test-records.md) v3.4.0 section |
| 2026-06-28 | v340-release-30min-20260628 | 30분 soak | 최종 `./server.sh verify-predev --soak-minutes 30` 실행. status pass, pass 119, fail 0, skip 1, durationSec 2355, soakMinutes 30, quickMode false, includeExternalTurn false. integrated-smoke PASS, 22회 soak iteration의 VA events/Event POST schema/recovery/redaction/runtime idle 반복 PASS, main-runtime-idle/event-post-queue/queue-runtime-idle/ports-clean/summary-report PASS. 최초 integrated-smoke code comment failure와 두 번째 VA events hang은 verifier 보정 후 재검증했고 최종 PASS evidence에는 포함하지 않음. External TURN hard gate는 요청하지 않아 skip이며 PASS로 대체하지 않음. Summary/report/html은 `docs/release-artifacts/v3.4.0/predev-1782641604-69187/`에 보존했고 `/tmp` 원본과 transient logs는 cleanup 완료 | PASS | 미집계 | 미집계 | 미집계 | durationSec 2355 | command summary and preserved report; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.4.0 section, [predev summary](./release-artifacts/v3.4.0/predev-1782641604-69187/summary.json), [predev report](./release-artifacts/v3.4.0/predev-1782641604-69187/report.md) |
| 2026-06-28 | v340-release-ui-fulltest-20260628 | UI 풀테스트 | Codex 인앱 브라우저 직접 검수. route 15개, screenshot 40개, interaction 16개, failed interaction 0, failures 0. `verify-ui-fulltest-one-shot --browser-mode in-app --in-app-evidence docs/release-artifacts/v3.4.0/ui-fulltest-20260628/in-app-evidence.json --skip-build --skip-manual-result` result PASS, runId `ui-fulltest-one-shot-1782645170399-38578`, 20 PASS steps, 5 SKIPPED boundary steps. raw auth/registry/log/ports/seed plan은 cleanup 완료. 30분 soak는 별도 PASS row, 120분/field/published/release actions는 본 run에서 실행하지 않음 | PASS | 미집계 | 미집계 | 미집계 | one-shot runId `ui-fulltest-one-shot-1782645170399-38578` | Codex in-app evidence and one-shot wrapper output; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.4.0 section, [ui evidence](./release-artifacts/v3.4.0/ui-fulltest-20260628/in-app-evidence.json), [one-shot summary](./release-artifacts/v3.4.0/ui-fulltest-20260628/one-shot/summary.json) |
| 2026-06-28 | v340-release-publication-20260628 | release publication | PR #49 `v3.4.0 -> main`은 Actions 일회성 selected 모드 재개 후 close/reopen으로 guardrails/static-gates를 재실행했고 두 required check가 PASS한 뒤 merge commit `973ee46e2c11e35b3e88c1ef46c6dcbac72565ed`로 병합했습니다. annotated tag `v3.4.0`은 main merge commit을 대상으로 생성/푸시했고 tag object는 `0c023401b6aa6d073d232cb599972cb903b3e238`입니다. GitHub Release `https://github.com/dhseo90/MediaServer/releases/tag/v3.4.0`을 생성했습니다. Release branch 삭제와 후속 브랜치 생성은 수행하지 않음 | PASS | 미집계 | 미집계 | 미집계 | GitHub PR/tag/release command output 기준 | PR/check/tag/release command output; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.4.0 section, [GitHub Release v3.4.0](https://github.com/dhseo90/MediaServer/releases/tag/v3.4.0), [PR #49](https://github.com/dhseo90/MediaServer/pull/49) |
| 2026-06-28 | v340-published-metadata-initial-20260628 | published metadata | GitHub Release 생성 직후 `./server.sh verify-release-metadata --published` 최초 실행. GitHub latest/list/view가 실제 `v3.4.0`을 가리키지만 local docs/verifier latest published 기준이 `v3.3.0`이라 `pass=18 fail=3`으로 실패했습니다. 제품 runtime/media 회귀가 아니라 publish 이후 metadata 기준 drift로 분리했고, 보정 변경에서 최신 공개 기준을 `v3.4.0`으로 정렬했습니다. | FAIL | 미집계 | 미집계 | 미집계 | command output 기준 | initial published metadata failure; final correction PASS는 다음 행에서 분리 기록 | [release-test-records.md](./release-test-records.md) v3.4.0 section |
| 2026-06-28 | v340-published-metadata-correction-20260628 | published metadata | README/docs/policy/backlog/inventory/verifier latest published 기준을 `v3.4.0`으로 정렬한 뒤 `./server.sh verify-release-metadata --published`를 재실행했습니다. 최신 공개 GitHub Release, release URL, remote tag, release branch, public entry docs, policy docs, backlog/docs index/UI guide 기준이 `v3.4.0`으로 정렬되어 `pass=21 fail=0`으로 통과했습니다. | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | published metadata PASS is after post-publish metadata correction; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.4.0 section |
| 2026-06-27 | v330-step11-stabilization-release-readiness-20260627 | 안정화 테스트 | v3.3.0 Step 11 local readiness gate, Step 1~10 companion verifiers, release metadata/docs/assets/inventory/evidence/script/closeout dry-run, temp cleanup, `git diff --check`. UI 풀테스트/30분/120분/published metadata/release actions/field smoke는 미실행 | PASS | 212,259 | 448,622 | 236,363 | goal snapshot delta 869s | Codex goal usage snapshot after v3.3 Step 11 local readiness gates; command-level token/elapsed split 미집계 | [release-test-records.md](./release-test-records.md) v3.3.0 section |
| 2026-06-27 | v330-release-30min-sandbox-precheck-20260627 | 30분 soak | `./server.sh verify-predev --soak-minutes 30` sandbox precheck. RTSP bind `127.0.0.1:8555`가 `Operation not permitted`로 실패했고, 권한 상승 재실행은 최신 명시 테스트 실행 승인 부족으로 거절. 30분 soak는 미완료 release blocker이며 임시 summary/report/log는 cleanup 필요 | FAIL | 448,622 | 480,994 | 32,372 | goal snapshot delta 185s | Local readiness record finalization through failed sandbox precheck and escalation rejection; command-level token/elapsed split 미집계 | [release-test-records.md](./release-test-records.md) v3.3.0 section |
| 2026-06-27 | v330-release-30min-20260627 | 30분 soak | 권한 상승 `./server.sh verify-predev --soak-minutes 30` 최종 run. status pass, pass 119, fail 0, skip 1, durationSec 2363, soakMinutes 30, includeRedaction true. External TURN hard gate는 요청하지 않아 skip이며 PASS로 대체하지 않음. Summary/report/html은 `docs/release-artifacts/v3.3.0/predev-1782548179-72502/`에 보존했고 `/tmp` 원본과 최초 실패 산출물은 cleanup 완료 | PASS | 480,994 | 1,150,237 | 669,243 | durationSec 2363; goal snapshot delta 2662s | command summary and preserved report; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.3.0 section, [predev summary](./release-artifacts/v3.3.0/predev-1782548179-72502/summary.json), [predev report](./release-artifacts/v3.3.0/predev-1782548179-72502/report.md) |
| 2026-06-27 | v330-release-ui-fulltest-20260627 | UI 풀테스트 | Codex 인앱 브라우저 직접 검수. route 15개, screenshot 40개, interaction 16개, failed interaction 0, failures 0. `verify-ui-fulltest-one-shot --browser-mode in-app --in-app-evidence docs/release-artifacts/v3.3.0/ui-fulltest-20260627/in-app-evidence.json --skip-build --skip-manual-result` result PASS, runId `ui-fulltest-one-shot-1782551961234-500`, 20 PASS steps, 5 SKIPPED boundary steps. raw auth/registry/log/ports/seed plan/partial evidence는 cleanup 완료. 30분 soak는 별도 PASS row, 120분/field/published/release actions는 본 run에서 실행하지 않음 | PASS | 1,150,237 | 1,485,343 | 335,106 | one-shot runId `ui-fulltest-one-shot-1782551961234-500`; goal snapshot delta 1434s | Codex goal usage snapshot after v3.3 UI fulltest evidence preservation/cleanup plus in-app evidence and one-shot wrapper output; command-level token split 미집계 | [release-test-records.md](./release-test-records.md) v3.3.0 section, [ui evidence](./release-artifacts/v3.3.0/ui-fulltest-20260627/in-app-evidence.json), [one-shot summary](./release-artifacts/v3.3.0/ui-fulltest-20260627/one-shot/summary.json) |
| 2026-06-27 | v330-release-publication-20260627 | release publication | PR #47 `v3.3.0 -> main` merge, main sync, annotated tag `v3.3.0`, GitHub Release `https://github.com/dhseo90/MediaServer/releases/tag/v3.3.0` 생성. GitHub Actions disabled 상태에서 사용자 승인에 따라 main ruleset required checks를 임시 제거하고 merge 후 복구했습니다. tag object `db4a27e608113e727f931df8c8396c0477102dbe`, tag target/merge commit `9a579689b65ed97f6edc720e28f4b3c8f18de811`. Release branch 삭제는 수행하지 않음 | PASS | 미집계 | 미집계 | 미집계 | GitHub PR/tag/release command output 기준 | PR/tag/release command output; token start/end snapshot not captured for this individual run | [release-test-records.md](./release-test-records.md) v3.3.0 section, [GitHub Release v3.3.0](https://github.com/dhseo90/MediaServer/releases/tag/v3.3.0), [PR #47](https://github.com/dhseo90/MediaServer/pull/47) |
| 2026-06-27 | v330-published-metadata-initial-20260627 | published metadata | GitHub Release 생성 직후 `./server.sh verify-release-metadata --published --release-branch main` 최초 실행. GitHub latest/list/view가 실제 `v3.3.0`을 가리키지만 local docs/verifier latest published 기준이 `v3.2.0`이라 `pass=18 fail=3`으로 실패했습니다. 제품 runtime/media 회귀가 아니라 publish 이후 metadata 기준 drift로 분리했고, 보정 브랜치에서 최신 공개 기준을 `v3.3.0`으로 정렬했습니다. | FAIL | 미집계 | 미집계 | 미집계 | command output 기준 | initial published metadata failure; final correction PASS는 다음 행에서 분리 기록 | [release-test-records.md](./release-test-records.md) v3.3.0 section |
| 2026-06-27 | v330-published-metadata-correction-20260627 | published metadata | PR #48 `codex/v3.3.0-published-metadata -> main` merge 후 `./server.sh verify-release-metadata --published --release-branch main`을 재실행했습니다. 최신 공개 GitHub Release, release URL, remote tag, release branch, public entry docs, policy docs, backlog/docs index/UI guide 기준이 `v3.3.0`으로 정렬되어 `pass=21 fail=0`으로 통과했습니다. | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | published metadata PASS is after PR #48 correction merge; merge commit `b332c6bc7e7420d04d58967145fcc753ea73e9f4` | [release-test-records.md](./release-test-records.md) v3.3.0 section |
| 2026-06-23 | v320-step11-stabilization-release-readiness-20260623 | 안정화 테스트 | v3.2.0 Step 11 local readiness gate, Step 1~10 companion verifiers, release metadata/docs/assets/inventory/evidence/script/closeout dry-run, temp cleanup, `git diff --check`. UI 풀테스트/30분/120분/published metadata/release actions/field smoke는 미실행 | PASS | 미집계 | 미집계 | 미집계 | command summaries only | command-level token/elapsed split 미집계; final goal snapshot은 최종 보고에서 별도 확인 | [release-test-records.md](./release-test-records.md) v3.2.0 section |
| 2026-06-23 | v320-release-30min-20260623 | 30분 soak | `./server.sh verify-predev --soak-minutes 30` v3.2.0 release required run. 최종 status pass, pass 119, fail 0, skip 1, durationSec 2379, soakMinutes 30, steps 120. External TURN hard gate는 요청하지 않아 skip이며 PASS로 대체하지 않음. Summary/report는 `docs/release-artifacts/v3.2.0/predev-1782224337-10773/summary.json`와 `docs/release-artifacts/v3.2.0/predev-1782224337-10773/report.md`로 보존 | PASS | 미집계 | 미집계 | 미집계 | durationSec 2379 | command summary and preserved report; token start/end snapshot not captured for this individual run | [release-test-records.md](./release-test-records.md) v3.2.0 section, [predev summary](./release-artifacts/v3.2.0/predev-1782224337-10773/summary.json), [predev report](./release-artifacts/v3.2.0/predev-1782224337-10773/report.md) |
| 2026-06-23 | v320-release-ui-fulltest-20260623 | UI 풀테스트 | Codex 인앱 브라우저 직접 검수. route 15개, screenshot 40개, interaction 16개, failed interaction 0, failures 0. `verify-ui-fulltest-one-shot --browser-mode in-app --in-app-evidence docs/release-artifacts/v3.2.0/ui-fulltest-20260623/in-app-evidence.json --skip-build --skip-manual-result` result PASS, 20 PASS steps, 5 SKIPPED boundary steps. `/ops/users` screenshot 4장은 auth material 최소화를 위해 상단 1000px evidence로 교체했고 raw auth/log/registry 산출물은 cleanup 완료. 30분/120분 longrun은 wrapper 범위가 아니며 별도 실행/조건부 판단 결과와 분리 | PASS | 미집계 | 미집계 | 미집계 | one-shot runId `ui-fulltest-one-shot-1782227752861-9595` | in-app evidence plus one-shot output; token start/end snapshot not captured for this individual run | [release-test-records.md](./release-test-records.md) v3.2.0 section, [ui evidence](./release-artifacts/v3.2.0/ui-fulltest-20260623/in-app-evidence.json), [one-shot summary](./release-artifacts/v3.2.0/ui-fulltest-20260623/one-shot/summary.json) |
| 2026-06-23 | v320-release-publication-20260623 | release publication | PR #45 `v3.2.0 -> main` merge, main sync, SSH-signed annotated tag `v3.2.0`, GitHub Release `https://github.com/dhseo90/MediaServer/releases/tag/v3.2.0` 생성. GitHub Actions disabled 상태에서 사용자 승인에 따라 main ruleset required checks를 임시 제거하고 merge 후 복구했습니다. tag object `affa4d80f79637cda42ab7d21190b06a72574d37`, merge commit `710dc24e594c421ab8c7af4af135f5235b96faeb`, GitHub tag verification `verified=true`/`reason=valid`. Release branch 삭제는 수행하지 않음 | PASS | 미집계 | 미집계 | 미집계 | GitHub PR/tag/release command output 기준 | PR/tag/release command output; token start/end snapshot not captured for this individual run | [release-test-records.md](./release-test-records.md) v3.2.0 section, [GitHub Release v3.2.0](https://github.com/dhseo90/MediaServer/releases/tag/v3.2.0), [PR #45](https://github.com/dhseo90/MediaServer/pull/45) |
| 2026-06-24 | v320-published-metadata-correction-20260624 | published metadata | 최초 published metadata는 GitHub Latest가 `v3.2.0`인데 local docs/verifier latest published 기준이 `v3.1.0`이라 `pass=18 fail=3`으로 실패했습니다. latest published 기준을 `v3.2.0`으로 보정한 뒤 network-approved `./server.sh verify-release-metadata --published --release-branch main` 재실행에서 `pass=21 fail=0`으로 통과했습니다. sandbox DNS/API 재시도 `pass=15 fail=6`은 external-network failure로 분리했습니다. | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | published metadata PASS is after local metadata correction; report values migrated to release-test-records.md | [release-test-records.md](./release-test-records.md) v3.2.0 section |
| 2026-06-21 | v310-release-30min-20260621 | 30분 soak | `./server.sh verify-predev --soak-minutes 30` release residual run. 최초 code comment policy gate 실패 후 주석 보정, `verify-code-comments`, build, `git diff --check` 확인 뒤 30분 run 재시작. 최종 status pass, pass 119, fail 0, skip 1, durationSec 2367, soakMinutes 30, includeRedaction true. External TURN hard gate는 요청하지 않아 skip이며 PASS로 대체하지 않음 | PASS | 미집계 | 미집계 | 미집계 | durationSec 2367 | command summary; token start/end snapshot not captured for this individual run | [release-test-records.md](./release-test-records.md) v3.1.0 section |
| 2026-06-21 | v310-release-ui-fulltest-20260621 | UI 풀테스트 | Codex 인앱 브라우저 직접 검수. route 15개, screenshot 51개, interaction 16개 전부 PASS, failures 0. `verify-ui-fulltest-one-shot --browser-mode in-app --in-app-evidence docs/release-artifacts/v3.1.0/ui-fulltest-20260621/in-app-evidence.json --skip-build --skip-manual-result` result PASS, 20 PASS steps, 5 SKIPPED boundary steps. 30분/120분 longrun은 wrapper 범위가 아니며 별도 실행 결과와 분리 | PASS | 미집계 | 미집계 | 미집계 | one-shot runId `ui-fulltest-one-shot-1782053671415-84029` | in-app evidence plus one-shot output; token start/end snapshot not captured for this individual run | [release-test-records.md](./release-test-records.md) v3.1.0 section, [ui-fulltest-20260621](./release-artifacts/v3.1.0/ui-fulltest-20260621/in-app-evidence.json) |
| 2026-06-21 | v310-release-longrun-trigger-matrix-20260621 | 안정화 테스트 | `./server.sh verify-runtime-media-longrun-trigger-matrix` 문서 drift 보정 후 schema `media-server.runtime-media-longrun-trigger-matrix.v1`, rows 13, 30m rows 7, 120m predev rows 3, 120m runtime rows 4, pass 8, fail 0. 이 행은 120분 longrun 실행 PASS가 아니라 120분 조건 분류 verifier PASS | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | token start/end snapshot not captured for this individual run | [release-test-records.md](./release-test-records.md) v3.1.0 section |
| 2026-05-25 | stability-script-smoke-20260525 | 안정화 테스트 | build, manual UI seed dry-run, auth bootstrap/users/routes, ops/client UI smoke+screenshot, rule UI, rules roundtrip, analysis state, VA replay, VA events, runtime console, SSE/WS/WebRTC metadata, `git diff --check` | PASS | 0 | 147,501 | 147,501 | 10m 5s | Codex goal usage | [release-test-records.md](./release-test-records.md) pre-v2.0 historical imported runs section |
| 2026-05-25 | predev-30min-20260525 | 30분 soak | `./server.sh verify-predev --soak-minutes 30 --rtsp-port 8568 --http-port 8094`; integrated smoke, 22 soak iterations of VA events/Event POST schema/Event POST recovery/redaction/runtime idle, queue mode, port cleanup | PASS | 0 | 86,657 | 86,657 | 39m 29s test / 41m 42s goal snapshot | Codex goal usage snapshot after evidence verification before closeout | [release-test-records.md](./release-test-records.md) pre-v2.0 historical imported runs section |
| 2026-05-25 | ui-fulltest-restart-20260525-oehkFG | UI 풀테스트 | 새 throwaway data로 `/setup`, `/login`, `/ops/*`, `/client/*` 브라우저 조작, 56개 responsive/theme screenshot, EventRecord sample 대조, UI 대상 기능 ID 220개 PASS. UI 비대상 간접 안정화 행 `RULE-099` 포함 결과표 221 PASS / 0 FAIL. `/ops/events` rule/scenario별 EventRecord history coverage 390px/1180px 대조, WHEP/source/rule/client/auth scope 보강, native dialog guard와 `SAFE-021` blocking dialog policy 확인 | PASS | 916,832 | 2,608,727 | 1,691,895 | goal continuation; 후속 30분 predev durationSec=2399 | Codex goal usage | [release-test-records.md](./release-test-records.md) pre-v2.0 historical imported runs section |
| 2026-05-31 | v200-vlm-closeout-readiness-20260531 | VLM close-out readiness | `media-server.vlm-close-out-readiness.v1` report, S15 rehearsal, S16 side-effect record, S17 longrun/UI criteria, release evidence/metadata/docs static verifier. UI 풀테스트 미실행, 30분 soak 미실행, 120분 longrun 미실행, provider field smoke 미실행, GitHub Release publish manual-not-run을 PASS로 대체하지 않음 | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | manual-not-available | [vlm-close-out-readiness.md](./vlm-close-out-readiness.md) |
| 2026-05-31 | v200-restart-stability-20260531 | 안정화 테스트 | v2.0.0 재시작 안정성 묶음: build, project/feature inventory, VLM S00~S18 verifier, release metadata/docs/script inventory, auth bootstrap/users/routes, Ops/Client static smoke, Rule UI headless smoke, rules roundtrip, analysis state, VA replay/events/runtime console, WebRTC/sidechannel/WS metadata, Event POST disabled/enabled schema, `git diff --check`. UI 풀테스트와 30분/120분 longrun은 별도 | PASS | 미집계 | 미집계 | 미집계 | command output/log files 기준 | manual-not-available | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-05-31 | v200-restart-30min-20260531 | 30분 soak | `./server.sh verify-predev --soak-minutes 30 --rtsp-port 8568 --http-port 8094`; integrated smoke `[20] 선택 검증: Rule/Profile 카테고리 UI`에서 `Chrome executable not found`로 FAIL. summary/report/html은 생성 전 실패/중단. 실패 뒤 남은 process는 종료했고 8094/8568 listener 없음 확인 | FAIL | 미집계 | 미집계 | 미집계 | command output/log files 기준 | manual-not-available | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-05-31 | v200-restart-30min-retry-20260531 | 30분 soak | Chrome path propagation, Event POST schema payload selection, code comment policy를 수정한 뒤 `./server.sh verify-predev --soak-minutes 30 --rtsp-port 8568 --http-port 8094` 재실행. build, integrated smoke, 22 soak iterations of VA events/Event POST schema/Event POST recovery/redaction/runtime idle, queue mode, ports-clean, summary-report PASS | PASS | 미집계 | 624,960 | 미집계 | command summary 2378s; goal snapshot 4095s | Codex goal usage end snapshot plus command summary. token start was not captured, so consumed remains 미집계 | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-06-01 | v200-inapp-policy-stability-20260601 | 안정화 테스트 | Codex 실행 시 인앱 브라우저 직접 evidence 정책 변경 후 재안정성 묶음: build, static/VLM/auth gates, `test --basic --skip-external --fail-fast`, Ops/Client static contract smoke, rules roundtrip, analysis state, VA replay/events, runtime console, WebRTC/SSE/WS metadata, Event POST disabled/schema/recovery, `git diff --check`. Chrome/Rule UI headless smoke는 최종 UI evidence로 사용하지 않고 UI 풀테스트는 별도 진행 중 | PASS | 0 | 294,042 | 294,042 | goal snapshot 1131s; basic command 466s | Codex goal usage snapshot at stability step end | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-06-01 | v200-inapp-policy-30min-20260601 | 30분 soak | Codex 실행 시 인앱 브라우저 직접 evidence 정책 변경 후 `./server.sh verify-predev --soak-minutes 30 --rtsp-port 8568 --http-port 8094` 재실행. build, integrated smoke, 22회 soak iterations of VA events/Event POST schema/Event POST recovery/redaction/runtime idle, queue mode, ports-clean, summary-report PASS. Chrome Rule UI 자동화는 기본 제외했고 UI 풀테스트 PASS로 계산하지 않음 | PASS | 334,637 | 492,353 | 157,716 | command durationSec 2365; goal snapshot delta 2385s | Codex goal usage snapshot before/after 30분 step | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-06-01 | v200-inapp-policy-ui-fulltest-20260601 | UI 풀테스트 | Codex 인앱 브라우저 직접 evidence로 `/setup`, `/login`, `/ops/*`, `/client/*`, `/ops/vlm` route/action/responsive/theme를 직접 확인하고, 인앱 evidence를 one-shot wrapper에 연결. 인앱 모드가 없는 legacy click/EventRecord verifier는 `MEDIA_SERVER_UI_BROWSER_MODE=chrome` + `MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1` 예외로 보조 실행. UI 대상 기능 ID 238개, RULE rows, VA seed matrix, 12개 EventRecord event/scenario key 구조 검증 PASS. 실제 VA EventRecord dispatch도 records-only 저장소에서 PASS | PASS | 492,353 | 1,404,241 | 911,888 | goal snapshot delta after 30분 step through UI close-out | Codex goal usage snapshot before/after UI step | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-06-01 | v200-inapp-policy-120min-20260601 | 120분 longrun | `/goal 120분 테스트` 지시 후 `./server.sh verify-predev --soak-minutes 120 --rtsp-port 8568 --http-port 8094` 재실행. build, integrated smoke, 87회 soak iterations of VA events/Event POST schema/Event POST recovery/redaction/runtime idle, main runtime idle, Event POST queue mode, ports-clean, summary-report PASS. 최초 sandbox RTSP bind 실패와 docs index 누락 실패는 수정/재실행했고 최종 retry2 PASS | PASS | 96,618 | 296,735 | 200,117 | command durationSec 7758; successful-run goal snapshot delta 7779s; whole 120분 goal snapshot 8262s | Codex goal usage snapshot before successful retry and after evidence verification. 이슈 처리 포함 goal total은 0 -> 296,735 | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-06-01 | v200-release-publication-20260601 | release publication | Initial PR #19 release publish plus follow-up README/VLM documentation sync. `v2.0.0` annotated tag now points at the current published `main` release commit after protected-branch PR checks, GitHub Release publish, `verify-release-metadata --published --release-branch main`, remote `v2.0.0` branch deletion, and `v2.1.0` branch creation. GitHub PR checks `guardrails`/`static-gates` PASS, check-run blocking annotations 0 | PASS | 0 | 379,651 | 379,651 | goal elapsed 24m 24s plus README/tag follow-up command evidence | Codex goal usage plus GitHub/command output | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-06-02 | v200-signed-tag-verification-20260602 | release publication | Signed tag follow-up: PR #22 merged the signed release tag policy, GitHub SSH signing key `dhseo_mac_pro_m5_signing` was registered for the release signer, `v2.0.0` was recreated as a signed annotated tag on published `main`, GitHub API tag verification returned `verified=true` and `reason=valid`, published metadata verifier returned 21 PASS / 0 FAIL, `v2.1.0` was synced to `main`, and the temporary PR branch was deleted. | PASS | 미집계 | 미집계 | 미집계 | command/API output 기준 | manual-not-available | [GitHub Release v2.0.0](https://github.com/dhseo90/MediaServer/releases/tag/v2.0.0), [PR #22](https://github.com/dhseo90/MediaServer/pull/22), `git -c gpg.format=ssh ... tag -v v2.0.0`, GitHub API `/git/tags/<tag-object>`, `./server.sh verify-release-metadata --published` |
| 2026-06-03 | v210-inapp-ui-fulltest-20260603 | UI 풀테스트 | v2.1.0 Codex 인앱 브라우저 UI 풀테스트. `/setup`, `/login`, `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/ops/vlm`, `/client/live`, `/client/dashboard`, `/client/events`, role guard, responsive/theme, VLM opt-in UI, rule/source/client reflection을 기능 ID 단위로 확인. Runner 결과 UI targets 244, PASS 244, FAIL 0, exclusions 0, manualSpotReviews 1. SRC-022 allowed rule reflection, AUTH-029 operator guard, RULE/SAFE boundary rows는 수정/재검수 후 PASS | PASS | 0 | 1,676,250 | 1,676,250 | goal elapsed 6170s | Codex goal usage plus runner output | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-06-04 | v220-inapp-ui-fulltest-20260604 | UI 풀테스트 | v2.2.0 F02~F06 Codex 인앱 브라우저 UI 직접 검수. `/setup`, `/login`, `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/ops/vlm`, `/client/live`, `/client/dashboard`, `/client/events`, `/client/request-access`, `/invite/setup` route/control/action, role guard, responsive/theme, VLM privacy/default-off/profile containment, client/viewer redaction, presence EventRecord UI 반영을 확인. one-shot wrapper final PASS. 30분/120분, real provider/external endpoint, full 12-key VA occurrence, legacy 244 UI-target full inventory result gate는 별도 미실행/미확인으로 분리 | PASS | 108,429 | 508,127 | 399,698 | goal snapshot 1967s | Codex goal usage plus in-app evidence and one-shot output | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-06-05 | v230-s01-eventrecord-matrix-20260605 | UI 풀테스트 | v2.3.0 S01 Full VA EventRecord occurrence matrix. Codex 인앱 브라우저로 `/ops/events`를 390px/1180px에서 직접 열어 12개 `v230-s01-ui-history-*` row와 10개 event type을 확인하고, clean `event-history-coverage.json`으로 exact 12-key occurrence matrix를 `--require-occurrence-matrix`에서 닫음. `verify-va-events --dispatch-records`는 records-only retry에서 stored=2026, failed=0, dropped=0 PASS, `verify-va-replay`는 14 cases PASS. 30분/120분과 실장비/외부 endpoint는 미실행 | PASS | 0 | 895,242 | 895,242 | goal snapshot 2396s | Codex goal usage plus in-app evidence and verifier output | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-06-05 | v230-s02-four-test-evidence-consistency-20260605 | 안정화 테스트 | v2.3.0 S02 4대 테스트 evidence 정합성. `./server.sh verify-v230-test-evidence-consistency`의 `media-server.v230-test-evidence-consistency.v1` report로 release evidence index, feature inventory coverage, longrun separation, manual UI evidence 기준이 안정화/30분/120분/UI 풀테스트 네 영역만 쓰는지 확인했습니다. `verify-release-evidence-index`, `verify-feature-inventory-coverage`, `verify-longrun-separation`, `verify-manual-ui-evidence`, `git diff --check`를 companion gate로 둡니다. 이 항목은 V230-S02 evidence 정합성 gate이며, 30분/120분/UI 풀테스트 실행 evidence를 대체하지 않습니다. | PASS | 24,603 | 190,554 | 165,951 | goal snapshot 472s | Codex goal usage snapshot at S02 evidence update | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-06-05 | v230-s03-ui-renderer-module-decomposition-20260605 | 안정화 테스트 | v2.3.0 S03 UI renderer/module decomposition. `product_ui_auth_pages.*`, `product_ui_client_css.cpp`, `product_ui_client_scripts.cpp`, `product_ui_ops_sources_script.cpp`, `product_ui_ops_users_script.cpp`로 route renderer/CSS module/JS controller 경계를 분해하고, `verify-v230-ui-renderer-module-decomposition`, build, `verify-ops-client-ui` static route smoke, `verify-ops-client-ui --screenshots` Chrome fallback smoke, `verify-rule-ui` Chrome fallback smoke, docs/feature inventory gate를 재검증했습니다. 최초 build는 auth renderer include 누락으로 실패 후 같은 S03 범위에서 수정해 PASS. 최초 UI smoke는 서버/auth/in-app evidence 전제 실패였고 auth-off 127.0.0.1 서버와 명시 Chrome fallback으로 보정 PASS. 이 항목은 module/source ownership 안정화 evidence이며 인앱 브라우저 UI 풀테스트 직접 조작 PASS나 30분/120분 longrun을 대체하지 않습니다. | PASS | 238,904 | 287,022 | 48,118 | goal snapshot delta 355s | Codex goal usage snapshot at S03 evidence update | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-06-05 | v230-s04-conditional-field-evidence-20260605 | 안정화 테스트 | v2.3.0 S04 조건부 ONVIF/external TURN/WHEP evidence. `./server.sh verify-v230-conditional-field-evidence`의 `media-server.v230-conditional-field-evidence.v1` report로 ONVIF field smoke gate와 external TURN/WHEP field gate를 approved environment only, redacted field report, not-run is not PASS 기준에 연결했습니다. real ONVIF device, external TURN/WHEP credential operation, external WHEP playback 성공은 실행하지 않았고 default release PASS로 쓰지 않습니다. | PASS | 217,343 | 274,119 | 56,776 | 279s | Codex goal usage snapshot at S04 start/end plus command output | `./server.sh verify-v230-conditional-field-evidence`, `./server.sh verify-onvif-field-smoke-gate`, `./server.sh verify-external-turn-whep-field-gate`, `./server.sh verify-project-inventory` |
| 2026-06-05 | v230-s05-vlm-opt-in-operational-evidence-20260605 | 안정화 테스트 | v2.3.0 S05 VLM opt-in operational evidence. `./server.sh verify-v230-vlm-opt-in-operational-evidence`의 `media-server.v230-vlm-opt-in-operational-evidence.v1` report로 runtime opt-in contract default-off, local runtime loopback smoke, cloud provider field gate 기본 not-run, privacy/default-off evidence를 연결했습니다. `operator-approved profile promotion`과 `local/provider smoke intake`는 운영 증적 기준이며 real cloud provider call, provider credential 저장, model/runtime bundle, VLM default-on, Sidecar write는 완료로 보고하지 않습니다. | PASS | 295,763 | 490,164 | 194,401 | 715s | Codex goal usage snapshot at S05 start/end plus command output | `./server.sh verify-v230-vlm-opt-in-operational-evidence`, `./server.sh verify-vlm-runtime-opt-in-contract`, `./server.sh verify-vlm-local-runtime-smoke`, `./server.sh verify-vlm-cloud-provider-field-smoke-gate`, `./server.sh verify-vlm-privacy-transfer-guard` |
| 2026-06-05 | v230-s06-ops-backup-recovery-lifecycle-20260605 | 안정화 테스트 | v2.3.0 S06 Ops backup/recovery evidence lifecycle. `./server.sh verify-v230-ops-backup-recovery-lifecycle`의 `media-server.v230-ops-backup-recovery-lifecycle.v1` report로 `verify-ops-backup-restore-dry-run` staging drill manifest/checksum/restore-validation-plan과 `verify-ops-evidence-retention-cleanup` dry-run/apply/audit retention cleanup을 한 gate에 연결했습니다. redacted evidence bundle shape는 auth/source/view/analysis/event/snapshot/clip/env-summary와 checksum으로 확인했고, real operational backup, production restore cutover, 장기 영상 녹화 백업, external storage replication은 완료로 보고하지 않습니다. | PASS | 96,792 | 183,079 | 86,287 | 434s | Codex goal usage snapshot at S06 start/end plus command output | `./server.sh verify-v230-ops-backup-recovery-lifecycle`, `./server.sh verify-ops-backup-restore-dry-run`, `./server.sh verify-ops-evidence-retention-cleanup`, `./server.sh verify-project-inventory` |
| 2026-06-05 | v230-s07-integrator-contract-conformance-20260605 | 안정화 테스트 | v2.3.0 S07 Integrator contract conformance. `v230-conformance.json`과 `checksums.json`으로 integrator contract artifact checksum/runtime/client-redaction reporting boundary를 보강하고, Event POST/WebRTC/SSE/WS runtime delivery smoke를 127.0.0.1:8081 보정 서버에서 재검증했습니다. 최초 `verify-event-post`는 서버 미기동, Node 기반 WebRTC/WS verifier는 sandbox local fetch 제한으로 실패 후 같은 S07 범위에서 보정/권한 승인 재실행 PASS. `verify-ops-client-ui`는 `--in-app-evidence` 부재로 실패했고 PASS evidence에서 제외했습니다. | PASS | 97,176 | 199,847 | 102,671 | goal snapshot delta 501s | Codex goal usage snapshot at S07 evidence update | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-06-10 | v240-s07-evidence-inventory-mapping-20260610 | 안정화 테스트 | v2.4.0 S07 Evidence and Inventory Mapping. `media-server.v240-evidence-inventory-mapping.v1` 기준으로 Event review inbox, incident action, alert dry-run, client-safe summary, rule review loop을 feature inventory, manual UI checklist, release evidence row에 연결했습니다. `verify-v240-evidence-inventory-mapping`, `verify-feature-inventory-coverage`, `verify-manual-ui-evidence`, `verify-release-evidence-index`, `verify-project-inventory`를 companion gate로 둡니다. 이 행은 UI 풀테스트 직접 조작 PASS를 대체하지 않음. 30분/120분 longrun 미실행은 PASS가 아니며 별도 미실행 기록으로 남깁니다. | PASS | 448,644 | 581,086 | 132,442 | goal snapshot delta 292s | Codex goal usage snapshot at S07 close-out update | [project-feature-test-inventory.md](./project-feature-test-inventory.md), [manual-ui-checklist.md](./manual-ui-checklist.md), [release-evidence-index.md](./release-evidence-index.md) |
| 2026-06-10 | v240-s08-release-readiness-gate-20260610 | 안정화 테스트 | v2.4.0 S08 Release Readiness Gate. `media-server.v240-release-readiness-gate.v1` 기준으로 문서 링크/assets, release metadata, CI/local parity, close-out dry-run, 미실행/제외 테스트 기록을 정리했습니다. `verify-v240-release-readiness-gate`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-ci-local-gate-parity`, `verify-release-closeout-helper --dry-run`, `git diff --check`를 companion gate로 둡니다. tag/push/GitHub Release manual-not-run, verify-release-metadata --published 미실행, UI 풀테스트 직접 조작 미실행, 30분 테스트 미실행, 120분 테스트 미실행은 PASS가 아니며 별도 release close-out/published/UI/longrun evidence로 분리합니다. | PASS | 657,863 | 699,640 | 41,777 | goal snapshot delta 184s | Codex goal usage snapshot at S08 close-out update | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-06-11 | v240-release-30min-20260611 | 30분 soak | v2.4.0 release 후보 30분 predev 재실행. `./server.sh verify-predev --soak-minutes 30 --summary-file /tmp/media_server_v240_goal_ui.ESI8Az/predev-30-rerun-summary.json --report-file /tmp/media_server_v240_goal_ui.ESI8Az/predev-30-rerun-report.md --report-html-file /tmp/media_server_v240_goal_ui.ESI8Az/predev-30-rerun-report.html` 결과 status pass, pass 119, fail 0, skip 1, durationSec 2380, includeRedaction true. External TURN hard gate는 요청하지 않아 skip이며 PASS로 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | command durationSec 2380; token start/end snapshot not captured for this standalone row | manual-not-available for token snapshot; summary values migrated to release-test-records.md | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-06-11 | v240-release-ui-fulltest-20260611 | UI 풀테스트 | v2.4.0 Codex 인앱 브라우저 UI 직접 검수. `/setup`, `/login`, `/password/change`, `/invite/setup`, `/client/request-access`, `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/ops/vlm`, `/client/live`, `/client/dashboard`, `/client/events` route/control/action을 확인했습니다. In-app evidence는 10개 route screenshot pair, 19개 interaction PASS, 0 failure를 기록합니다. EventRecord history file은 1668 rows이고, `/ops/events` EventRecord review/incident UI는 별도 seeded screenshot으로 확인했습니다. Throwaway evidence의 빈-row note와 외부 delivery 미수행은 PASS로 확대하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | UI run elapsed not separately captured in ledger; release test goal total was recorded separately | manual-not-available for token snapshot; in-app evidence and screenshot values are migrated to release-test-records.md | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-06-11 | v240-release-120min-20260611 | 120분 longrun | v2.4.0 release 후보 120분 장시간 검증. `./server.sh verify-predev --soak-minutes 120 --summary-file /tmp/media_server_v240_goal_ui.ESI8Az/predev-120-summary.json --report-file /tmp/media_server_v240_goal_ui.ESI8Az/predev-120-report.md --report-html-file /tmp/media_server_v240_goal_ui.ESI8Az/predev-120-report.html` 결과 status pass, pass 444, fail 0, skip 1, durationSec 7788. 이어서 `./server.sh verify-va-runtime-console-longrun --duration-minutes 120 --include-rtsp --summary-file /tmp/media_server_v240_goal_ui.ESI8Az/va-runtime-console-longrun-120-summary.json --report-file /tmp/media_server_v240_goal_ui.ESI8Az/va-runtime-console-longrun-120-report.md --work-dir /tmp/media_server_v240_goal_ui.ESI8Az/va-runtime-console-longrun-120-work` 결과 ok true, pass 11, fail 0, durationSec 7200, cleanup portsClean true, runtimeIdle true. | PASS | 240,956 | 1,350,676 | 1,109,720 | predev durationSec 7788; runtime-console durationSec 7200; goal elapsed 15,300s | Codex goal usage plus command summaries | [release-test-records.md](./release-test-records.md) v2.0.0~v2.4.0 historical imported runs section |
| 2026-06-11 | v250-s01-incident-text-projection-20260611 | 안정화 테스트 | v2.5.0 S01 Event/incident text projection. `media-server.incident-text-projection.v1` 기준으로 EventRecord, Ops audit, source health, alert dry-run fixture를 searchable text/terms 문서로 투영하고 source URL, Developer URL, raw/debug, auth, model/provider material redaction을 검증했습니다. `verify-v250-incident-text-projection`, `verify-feature-inventory-coverage`, `verify-project-inventory`, `verify-script-inventory`, `verify-docs-links`, `verify-code-comments`, `./server.sh build`를 companion gate로 둡니다. 이 행은 `/ops/events` 검색 UI, SQLite/FTS index, embedding/provider 호출, UI 풀테스트 직접 조작, 30분/120분 longrun PASS를 대체하지 않습니다. | PASS | 119,137 | 463,049 | 343,912 | goal snapshot delta 933s | Codex goal usage snapshot after S00 commit to S01 evidence update plus command output | [development-backlog.md](./development-backlog.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md), [stream-verification.md](./stream-verification.md) |
| 2026-06-11 | v250-s02-incident-memory-index-20260611 | 안정화 테스트 | v2.5.0 S02 Local incident memory index. `media-server.incident-memory-index.v1` 기준으로 SQLite FTS5 primary backend, forced JSONL+BM25 fallback backend, fallback JSONL materialization, deterministic query ordering, primary/fallback parity, model/provider dependency false를 검증했습니다. `verify-v250-incident-memory-index`, `verify-v250-incident-text-projection`, `verify-feature-inventory-coverage`, `verify-project-inventory`, `verify-script-inventory`, `verify-docs-links`, `verify-code-comments`, `./server.sh build`를 companion gate로 둡니다. 이 행은 `/ops/events` 검색 UI/API, similarity/timeline/brief, external embedding/provider 호출, UI 풀테스트 직접 조작, 30분/120분 longrun PASS를 대체하지 않습니다. | PASS | 463,049 | 654,982 | 191,933 | goal snapshot delta 625s | Codex goal usage snapshot after S01 evidence update to S02 evidence update plus command output | [development-backlog.md](./development-backlog.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md), [stream-verification.md](./stream-verification.md) |
| 2026-06-12 | v250-s03-ops-events-semantic-search-ui-20260612 | 안정화 테스트 | v2.5.0 S03 `/ops/events` semantic search UI. `verify-v250-ops-events-semantic-search-ui` 기준으로 semantic incident search controls, Ops-only `memorySearch` view model, query/filter/highlight rendering, responsive highlight styling, ops smoke/inventory coverage, server command 등록을 검증했습니다. 이 행은 브라우저 UI 직접 조작, 검색 결과 운영 데이터 판독, external embedding/provider 호출, 30분/120분 longrun PASS를 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | manual-not-available for token snapshot; verifier output is retained command evidence | [development-backlog.md](./development-backlog.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md), [manual-ui-checklist.md](./manual-ui-checklist.md) |
| 2026-06-12 | v250-s04-incident-timeline-graph-20260612 | 안정화 테스트 | v2.5.0 S04 Incident timeline graph. `verify-v250-incident-timeline-graph` 기준으로 `/ops/events` timeline graph shell, Ops-only `timelineGraph` view model, graph node/edge/linkage label rendering, responsive graph rail styling, ops smoke/inventory coverage, server command 등록을 검증했습니다. 이 행은 브라우저 UI 직접 조작, 실제 운영 데이터 graph 판독, Event POST/WebRTC/SSE/WS/media path schema 변경 evidence, 30분/120분 longrun PASS를 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | manual-not-available for token snapshot; verifier output is retained command evidence | [development-backlog.md](./development-backlog.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md), [manual-ui-checklist.md](./manual-ui-checklist.md) |
| 2026-06-12 | v250-s05-explainable-incident-brief-20260612 | 안정화 테스트 | v2.5.0 S05 Explainable incident brief. `verify-v250-explainable-incident-brief` 기준으로 `/ops/events` incident brief shell, deterministic `incidentBrief` view model, action/object/context/environment slot rendering, VLM default-off state, responsive slot styling, ops smoke/inventory coverage, server command 등록을 검증했습니다. 이 행은 실제 provider 호출 성공, VLM default-on, 브라우저 UI 직접 조작, 30분/120분 longrun PASS를 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | manual-not-available for token snapshot; verifier output is retained command evidence | [development-backlog.md](./development-backlog.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md), [manual-ui-checklist.md](./manual-ui-checklist.md) |
| 2026-06-13 | v250-s06-similar-incident-lookup-20260613 | 안정화 테스트 | v2.5.0 S06 Similar incident lookup. `verify-v250-similar-incident-lookup` 기준으로 rule/scenario/source/status/action target 기반 deterministic score와 explanation terms, provider dependency false, Event POST/WebRTC/SSE/WS/media path schema 변경 없음, feature inventory/server command wiring을 검증했습니다. 이 행은 UI 풀테스트 직접 조작이나 external embedding/provider 실행 evidence가 아닙니다. | PASS | 미집계 | 미집계 | 미집계 | v2.5.0 release stability goal command output; per-step token split not captured | combined release-test goal total was recorded separately; verifier output is retained command evidence | `./server.sh verify-v250-similar-incident-lookup`, [development-backlog.md](./development-backlog.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md), [manual-ui-checklist.md](./manual-ui-checklist.md) |
| 2026-06-13 | v250-s07-client-safe-incident-digest-20260613 | 안정화 테스트 | v2.5.0 S07 Client-safe incident digest. `verify-v250-client-safe-incident-digest` 기준으로 `/client/api/views/{id}/events`와 client live/dashboard/events digest가 viewer-safe summary만 노출하고 source locator, raw evidence, debug material, provider material, auth material을 포함하지 않는 redaction boundary를 검증했습니다. 이 행은 viewer role UI 직접 검수나 30분/120분 longrun evidence를 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | v2.5.0 release stability goal command output; per-step token split not captured | combined release-test goal total was recorded separately; verifier output is retained command evidence | `./server.sh verify-v250-client-safe-incident-digest`, [development-backlog.md](./development-backlog.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md), [manual-ui-checklist.md](./manual-ui-checklist.md) |
| 2026-06-13 | v250-s08-redacted-incident-evidence-bundle-20260613 | 안정화 테스트 | v2.5.0 S08 Redacted incident evidence bundle. `verify-v250-redacted-incident-evidence-bundle` 기준으로 release-safe manifest schema, token releaseSafe binding, raw evidence file exclusion, searchResults/timelineSummary redaction policy, source locator/provider/debug/credential material exclusion을 검증했습니다. 이 행은 브라우저에서 실제 다운로드 이벤트를 관측했다는 뜻이 아니며, UI 풀테스트에서 버튼과 manifest 정책을 별도로 확인합니다. | PASS | 미집계 | 미집계 | 미집계 | v2.5.0 release stability goal command output; per-step token split not captured | combined release-test goal total was recorded separately; verifier output is retained command evidence | `./server.sh verify-v250-redacted-incident-evidence-bundle`, [development-backlog.md](./development-backlog.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md), [manual-ui-checklist.md](./manual-ui-checklist.md) |
| 2026-06-11 | v250-s09-owner-release-readiness-20260611 | 안정화 테스트 | v2.5.0 S09 소유권 분리 / 릴리즈 준비. `media-server.v250-owner-release-readiness.v1` 기준으로 event memory/search route owner catalog, release-safe evidence bundle route matcher, feature inventory, manual UI criteria, release evidence index, release policy를 연결합니다. `verify-v250-owner-release-readiness`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-feature-inventory-coverage`, `verify-manual-ui-evidence`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run`, `git diff --check`를 companion gate로 둡니다. 이 행은 UI 풀테스트 직접 조작, 30분/120분 longrun, tag/push/GitHub Release, published metadata PASS를 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | manual-not-available for token snapshot; S09 local gate command output is retained command evidence | [release-policy.md](./release-policy.md), [development-backlog.md](./development-backlog.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md), [manual-ui-checklist.md](./manual-ui-checklist.md) |
| 2026-06-15 | v260-s06-owner-release-readiness-20260615 | 안정화 테스트 | v2.6.0 S06 소유권 분리 / 릴리즈 준비. `media-server.v260-owner-release-readiness.v1` 기준으로 v2.6.0 Operational Hardening Coverage Mapping, feature inventory, manual UI criteria, release evidence index, release policy를 연결합니다. `verify-v260-owner-release-readiness`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-feature-inventory-coverage`, `verify-manual-ui-evidence`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run`, `git diff --check`를 companion gate로 둡니다. 이 행은 UI 풀테스트 직접 조작, 30분/120분 longrun, tag/push/GitHub Release, published metadata PASS를 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | manual-not-available for token snapshot; S06 local gate command output is retained command evidence | [release-policy.md](./release-policy.md), [development-backlog.md](./development-backlog.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md), [manual-ui-checklist.md](./manual-ui-checklist.md) |
| 2026-06-16 | v270-s06-owner-release-readiness-20260616 | 안정화 테스트 | v2.7.0 S06 소유권 분리 / 릴리즈 준비. `media-server.v270-owner-release-readiness.v1` 기준으로 v2.7.0 Operational Incident Command Loop Coverage Mapping, feature inventory, manual UI criteria, release evidence index, release policy를 연결합니다. `verify-v270-owner-release-readiness`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-feature-inventory-coverage`, `verify-manual-ui-evidence`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run`, `git diff --check`를 companion gate로 둡니다. 이 행은 UI 풀테스트 직접 조작, 30분/120분 longrun, tag/push/GitHub Release, published metadata PASS를 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | manual-not-available for token snapshot; S06 local gate command output is retained command evidence | [release-policy.md](./release-policy.md), [development-backlog.md](./development-backlog.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md), [manual-ui-checklist.md](./manual-ui-checklist.md) |
| 2026-06-18 | v280-s07-owner-release-readiness-20260618 | 안정화 테스트 | v2.8.0 S07 소유권 분리 / 릴리즈 준비. `media-server.v280-owner-release-readiness.v1` 기준으로 v2.8.0 Operator-Supervised Action Readiness Coverage Mapping, feature inventory, manual UI criteria, release evidence index, release policy를 연결합니다. `verify-v280-owner-release-readiness`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-feature-inventory-coverage`, `verify-manual-ui-evidence`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run`, `git diff --check`를 companion gate로 둡니다. 이 행은 UI 풀테스트 직접 조작, 30분/120분 longrun, tag/push/GitHub Release, published metadata PASS를 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | manual-not-available for token snapshot; S07 local gate command output is retained command evidence | [release-policy.md](./release-policy.md), [development-backlog.md](./development-backlog.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md), [manual-ui-checklist.md](./manual-ui-checklist.md) |
| 2026-06-18 | v280-release-local-gates-20260618 | 안정화 테스트 | v2.8.0 release local gate 실행. `./server.sh build`, `./server.sh verify-release-metadata`, `./server.sh verify-v280-owner-release-readiness`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-manual-ui-evidence`, `./server.sh verify-release-evidence-index`, `./server.sh verify-release-closeout-helper --dry-run`, `./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run`, `./server.sh verify-script-inventory`, `git diff --check`, `git status --short --branch`, `git branch -vv`, `git tag --list 'v2.8.0'`, `git ls-remote --tags origin v2.8.0`, `git ls-remote --heads origin main v2.8.0`, `rg --files -g 'CHANGELOG*' -g 'NEWS*'`를 실행했습니다. `verify-manual-ui-evidence`는 result 미지정으로 template/checklist 범위 PASS이며 UI 직접 조작 PASS가 아닙니다. 시작 git 상태는 `v2.8.0...origin/v2.8.0` clean, 기록 후 상태는 `docs/development-backlog.md`와 `docs/release-evidence-index.md` 미커밋 변경입니다. one-shot dry-run은 status pass, dryRun true, localCommands 5, manualActions 10, gitStatusLines 2, tag not created, push not performed입니다. 원격 `main` head는 `8c6a6a2cfd10d2066c52f585bfe04708260e57ba`, 원격 `v2.8.0` head는 `3be5beaafd27225a98b21cef245a850397dc250e`, local/remote `v2.8.0` tag는 아직 없습니다. 프로젝트 루트 `CHANGELOG`/`NEWS`는 없고 fixture 전용 `test/fixtures/integrator_contract_artifact/CHANGELOG.md`만 있습니다. | PASS | 미집계 | 320,781 | 미집계 | goal snapshot 683s after local gates and release preflight checks; per-command duration not captured | Codex goal usage end snapshot; token start was not captured before first gate | [release-test-records.md](./release-test-records.md) v2.8.0 section |
| 2026-06-19 | v290-s09-owner-release-readiness-20260619 | 안정화 테스트 | v2.9.0 S09 owner release readiness. `media-server.v290-owner-release-readiness.v1` 기준으로 v2.9.0 Final 2.x Closure & Compatibility Baseline Coverage Mapping, feature inventory, manual UI criteria, release evidence index, release policy, release test records, close-out dry-run command를 연결합니다. `./server.sh verify-v290-owner-release-readiness`, `./server.sh build`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-manual-ui-evidence`, `./server.sh verify-release-evidence-index`, `./server.sh verify-release-closeout-helper --dry-run`, `./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run`, `./server.sh verify-script-inventory`, `git diff --check`를 companion gate로 둡니다. 이 행은 UI 풀테스트 직접 조작, 30분/120분 longrun, PR/main/tag/GitHub Release, published metadata, field smoke PASS를 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | manual-not-available for token snapshot; S09 local gate command output is retained command evidence | [release-policy.md](./release-policy.md), [development-backlog.md](./development-backlog.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md), [release-test-records.md](./release-test-records.md) |
| 2026-06-20 | v300-s10-stabilization-release-readiness-20260620 | 안정화 테스트 | V300-S10 stabilization/release readiness. `media-server.v300-stabilization-release-readiness.v1` 기준으로 v3.0.0 Event Evidence Search MVP S00~S09 local gates, release policy, release evidence index, release test records, close-out dry-run command를 연결합니다. `./server.sh verify-v300-stabilization-release-readiness`, `./server.sh build`, `./server.sh verify-v300-entry-baseline`, `./server.sh verify-v300-event-evidence-contract`, `./server.sh verify-v300-feature-schema-privacy`, `./server.sh verify-v300-vlm-feature-queue`, `./server.sh verify-v300-feature-only-retention`, `./server.sh verify-v300-search-dsl-query-convert`, `./server.sh verify-v300-feature-search-index`, `./server.sh verify-v300-ops-events-ui`, `./server.sh verify-v300-retention-pin-cleanup`, `./server.sh verify-analysis-state`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-release-evidence-index`, `./server.sh verify-release-closeout-helper --dry-run`, `./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run`, `./server.sh verify-script-inventory`, `git diff --check`를 companion gate로 둡니다. UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence를 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | manual-not-available for token snapshot; S10 local gate command output is retained command evidence | [release-policy.md](./release-policy.md), [development-backlog.md](./development-backlog.md), [project-feature-test-inventory.md](./project-feature-test-inventory.md), [release-test-records.md](./release-test-records.md) |
| 2026-06-19 | v290-release-ui-fulltest-20260619 | UI 풀테스트 | v2.9.0 Codex 인앱 브라우저 UI 풀테스트. Core/auth route/control/action 직접 evidence route 16개, interaction 17개, failingInteractions 0입니다. `verify-ui-fulltest-one-shot` wrapper는 in-app evidence를 입력으로 받아 result PASS, widths 390/1180, visualWidths 320/390/760/1180, Chrome fallback 미사용, core/auth click E2E required steps PASS를 확인했습니다. `manual-ui-result-structure`와 장시간 run은 wrapper 범위 밖으로 skip/not-run입니다. 임시 `/tmp` outputs는 수치 이관 후 삭제했습니다. | PASS | 183,063 | 400,310 | 217,247 | goal snapshot delta 1284s | Codex goal usage snapshots plus in-app evidence and one-shot wrapper output | [release-test-records.md](./release-test-records.md) v2.9.0 section |
| 2026-06-19 | v290-release-30min-20260619 | 30분 soak | v2.9.0 release 후보 30분 predev 실행. `verify-predev --soak-minutes 30 --rtsp-port 18693 --http-port 18193` 결과 status pass, pass 119, fail 0, skip 1, durationSec 2363, soakMinutes 30, includeRedaction true, ports clean입니다. External TURN hard gate는 요청하지 않아 skip이며 PASS로 대체하지 않습니다. 임시 summary/report/html/work dir은 수치 이관 후 삭제했습니다. | PASS | 400,310 | 450,665 | 50,355 | durationSec 2363 | command summary plus Codex goal usage snapshots around the 30분 run | [release-test-records.md](./release-test-records.md) v2.9.0 section |
| 2026-06-19 | v290-release-120min-predev-20260619 | 120분 longrun | v2.9.0 release 후보 120분 predev 실행. `verify-predev --soak-minutes 120 --rtsp-port 18694 --http-port 18194` 결과 status pass, pass 444, fail 0, skip 1, durationSec 7773, soakMinutes 120, 87회 soak iteration, main-runtime-idle/event-post-queue/queue-runtime-idle/ports-clean/report generation PASS입니다. External TURN hard gate는 요청하지 않아 skip이며 PASS로 대체하지 않습니다. 임시 summary/report/html/work dir은 수치 이관 후 삭제했습니다. | PASS | 450,665 | 691,961 | 241,296 | durationSec 7773 | command summary plus Codex goal usage snapshots around the 120분 predev run | [release-test-records.md](./release-test-records.md) v2.9.0 section |
| 2026-06-19 | v290-release-runtime-console-120min-20260619 | 120분 runtime console | v2.9.0 release 후보 VA runtime console 120분 실행. `verify-va-runtime-console-longrun --duration-minutes 120 --include-sidechannel --include-dashboard --rtsp-port 18695 --http-port 18195` 결과 status pass, pass 9, fail 0, skip 1, durationSec 7200입니다. dashboard/sidechannel included, WebRTC metadata 57,204 messages, SSE 14,203 messages, runtimeIdle true, portsClean true, maxRssKb 457856입니다. RTSP overlay는 resource 관리상 포함하지 않아 skip이며 PASS로 대체하지 않습니다. 임시 summary/report/work dir은 수치 이관 후 삭제했습니다. | PASS | 691,961 | 882,689 | 190,728 | durationSec 7200 | command summary plus Codex goal usage snapshots around the runtime console run | [release-test-records.md](./release-test-records.md) v2.9.0 section |
| 2026-06-19 | v290-release-publication-20260619 | release publication | v2.9.0 release publication. PR #37 (`v2.9.0` -> `main`)은 guardrails/static-gates PASS와 annotation 0 검증 후 merge commit `f538b9f6d4878978da63dd4ece7a40c9ffabd34a`로 병합했습니다. SSH signed annotated tag `v2.9.0`을 main merge commit에 생성/푸시하고 GitHub Release `https://github.com/dhseo90/MediaServer/releases/tag/v2.9.0`를 생성했습니다. 첫 `verify-release-metadata --published --release-branch main`은 GitHub Latest가 `v2.9.0`인데 문서/verifier latest published 기준이 `v2.8.0`이라 pass 18/fail 3으로 실패했고, PR #38 post-publish metadata correction merge commit `614799151a06ab4315ee93e4eda666d8e46804dd` 후 재실행해 pass 21/fail 0으로 통과했습니다. PR #37/#38 annotation JSON과 published metadata report/json 임시 파일은 값 이관 후 삭제했습니다. Release branch 삭제는 승인되지 않아 수행하지 않았습니다. | PASS | 미집계 | 미집계 | 미집계 | PR/GitHub/command output 기준 | published metadata PASS is after PR #38 correction; tag was not force-updated or rewritten | [release-test-records.md](./release-test-records.md) v2.9.0 section |
| 2026-06-18 | v280-release-ui-fulltest-20260618 | UI 풀테스트 | v2.8.0 Codex 인앱 브라우저 UI 풀테스트. `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/ops/vlm`, `/client/live`, `/client/dashboard`, `/client/events` route와 `/setup`, `/login`, `/password/change`, `/client/request-access`, `/invite/setup` auth flow를 직접 확인했습니다. In-app evidence는 route 10개, screenshot 32개, core/auth interaction 16개 PASS입니다. 최초 wrapper는 `ops-tables-layout`에서 evidence의 `noHorizontalOverflow` 누락으로 FAIL했고, `/ops/sources`, `/ops/rules`, `/ops/users`를 320/390/760/1180 폭에서 직접 재계산해 overflow 0을 확인한 뒤 `verify-ops-tables-layout` 단독 PASS 및 `verify-ui-fulltest-one-shot` 재실행 PASS했습니다. `manual-ui-result-structure`는 `--skip-manual-result`로 SKIPPED이며 30분/120분 longrun은 wrapper 범위가 아닙니다. | PASS | 320,781 | 649,423 | 328,642 | goal snapshot delta 1216s from local gates record to UI fulltest close | Codex goal usage snapshots plus in-app evidence and wrapper output | [release-test-records.md](./release-test-records.md) v2.8.0 section |
| 2026-06-16 | v270-release-stability-20260616 | 안정화 테스트 | v2.7.0 release 안정화 테스트. `./server.sh build`, release metadata/evidence, docs links/assets, script/project/feature inventory, V270-S01~S06 verifier, auth bootstrap/users/routes, Ops/Client UI smoke+screenshot, Event POST/WebRTC/SSE/WS metadata, Rule UI/rules roundtrip/tables layout/event review/incident workflow/alert/VLM workflow, analysis state, VA replay/events/dispatch records, `verify-predev --quick`, `git diff --check`를 실행했습니다. 최종 quick summary는 status pass, pass 14, fail 0, skip 1, durationSec 616, quickMode true, soakMinutes 1입니다. 최초 sandbox RTSP bind/local fetch, 너무 짧은 VA event duration, stale verifier source scan/selector는 테스트 절차 또는 verifier 보정 이슈로 재실행했고 최종 PASS입니다. External TURN hard gate는 요청하지 않아 skip이며 PASS로 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | v2.7.0 release 진행 goal command output 기준; per-area token split not captured | summary values migrated to release-test-records.md; token snapshot unavailable for this individual run | [release-test-records.md](./release-test-records.md) v2.7.0 section |
| 2026-06-16 | v270-release-ui-one-shot-20260616 | UI 자동 smoke | v2.7.0 release UI one-shot 보조 검증. `verify-ui-fulltest-one-shot --browser-mode chrome --allow-chrome-fallback=1 --output-dir /tmp/media_server_v270_ui_fulltest_20260616/one-shot` 결과 PASS입니다. build, manual UI seed dry-run, core/auth UI server health, native/blocking dialog guards, feature inventory coverage, Ops/Client UI smoke+screenshot, Rule UI, route boundaries, rules roundtrip, tables layout, ops click E2E core/auth를 실행했습니다. `browserMode`는 chrome, `inAppEvidence`와 `manualResult`는 not-provided이므로 이 행은 Codex 인앱 브라우저 또는 수동 UI 직접 풀테스트 PASS가 아니라 자동 UI smoke evidence입니다. | PASS | 미집계 | 미집계 | 미집계 | command output 기준 | one-shot summary values migrated to release-test-records.md; manual/in-app UI evidence was not provided | [release-test-records.md](./release-test-records.md) v2.7.0 section |
| 2026-06-16 | v270-release-30min-20260616 | 30분 soak | v2.7.0 release 후보 30분 predev 실행. `./server.sh verify-predev --soak-minutes 30 --rtsp-port 18577 --http-port 18103 --summary-file /tmp/media_server_v270_release_30min_20260616_summary.json --report-file /tmp/media_server_v270_release_30min_20260616_report.md --report-html-file /tmp/media_server_v270_release_30min_20260616_report.html --heartbeat-interval 120` 결과 status pass, pass 119, fail 0, skip 1, durationSec 2366, soakMinutes 30, includeRedaction true입니다. 22회 soak iteration에서 VA events, Event POST schema/recovery, redaction, runtime idle check가 반복 실행됐고 event-post-queue, ports-clean, report generation까지 완료했습니다. External TURN hard gate는 요청하지 않아 skip이며 PASS로 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | command summary/report 기준 | summary values migrated to release-test-records.md; token snapshot unavailable for this individual run | [release-test-records.md](./release-test-records.md) v2.7.0 section |
| 2026-06-16 | v270-release-120min-20260616 | 120분 longrun | v2.7.0 release 후보 120분 predev 실행. `./server.sh verify-predev --soak-minutes 120 --rtsp-port 18578 --http-port 18104 --summary-file /tmp/media_server_v270_release_120min_20260616_summary.json --report-file /tmp/media_server_v270_release_120min_20260616_report.md --report-html-file /tmp/media_server_v270_release_120min_20260616_report.html --heartbeat-interval 300` 결과 status pass, pass 444, fail 0, skip 1, durationSec 7749, soakMinutes 120, includeRedaction true입니다. 87회 soak iteration에서 VA events, Event POST schema/recovery, redaction, runtime idle check가 반복 실행됐고 main-runtime-idle, event-post-queue, queue-runtime-idle, ports-clean, report generation까지 완료했습니다. External TURN hard gate는 요청하지 않아 skip이며 PASS로 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | command summary/report 기준 | summary values migrated to release-test-records.md; token snapshot unavailable for this individual run | [release-test-records.md](./release-test-records.md) v2.7.0 section |
| 2026-06-16 | v270-release-runtime-console-120min-20260616 | 120분 runtime console | v2.7.0 release 후보 VA runtime console 120분 실행. `./server.sh verify-va-runtime-console-longrun --duration-minutes 120 --include-rtsp --rtsp-port 18579 --http-port 18105 --summary-file /tmp/media_server_v270_release_runtime_console_120min_20260616_summary.json --report-file /tmp/media_server_v270_release_runtime_console_120min_20260616_report.md --work-dir /tmp/media_server_v270_release_runtime_console_120min_20260616_work` 결과 status pass, pass 11, fail 0, skip 0, durationSec 7200입니다. WebRTC client, SSE sidechannel, RTSP overlay, runtime cleanup, ports-clean이 PASS했고 maxRssKb 509744, runtimeIdle true, portsClean true입니다. Report에는 bus watch/probe attach-remove mismatch warning이 남지만 verifier 판정은 PASS이며, 이 경고는 후속 관찰 대상으로 분리합니다. | PASS | 미집계 | 미집계 | 미집계 | command summary/report 기준 | summary and work-log values migrated to release-test-records.md; token snapshot unavailable for this individual run | [release-test-records.md](./release-test-records.md) v2.7.0 section |
| 2026-06-16 | v260-release-stability-20260616 | 안정화 테스트 | v2.6.0 release 안정화 테스트. `./server.sh build`, release metadata/evidence, docs links/assets, script/project/feature inventory, V260-S01~S06 verifier, auth bootstrap/users/routes, Ops/Client static smoke, release closeout dry-run, `verify-predev --quick`, `git diff --check`를 실행했습니다. 최종 quick summary는 status pass, pass 14, fail 0, skip 1, durationSec 610, quickMode true, soakMinutes 1입니다. 최초 auth test password policy 위반, sandbox local fetch/RTSP bind, static UI 서버 미기동은 테스트 절차/환경 이슈로 재실행했고 최종 PASS입니다. External TURN hard gate는 요청하지 않아 skip이며 PASS로 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | combined v2.6.0 release-test goal elapsed 86m 19s; per-area token split not captured | Codex goal total 465,623 tokens for stability+30분+UI goal; summary values migrated to release-test-records.md | [release-test-records.md](./release-test-records.md) v2.6.0 section |
| 2026-06-16 | v260-release-30min-20260616 | 30분 soak | v2.6.0 release 후보 30분 predev 실행. `./server.sh verify-predev --soak-minutes 30 --rtsp-port 18566 --http-port 18092 --summary-file /tmp/media_server_v260_release_30min_20260615_summary.json --report-file /tmp/media_server_v260_release_30min_20260615_report.md --report-html-file /tmp/media_server_v260_release_30min_20260615_report.html --heartbeat-interval 120` 결과 status pass, pass 119, fail 0, skip 1, durationSec 2370, soakMinutes 30, includeRedaction true입니다. 22회 soak iteration에서 VA events, Event POST schema/recovery, redaction, runtime idle check가 반복 실행됐고 ports-clean/report generation까지 완료했습니다. External TURN hard gate는 요청하지 않아 skip이며 PASS로 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | combined v2.6.0 release-test goal elapsed 86m 19s; per-area token split not captured | Codex goal total 465,623 tokens for stability+30분+UI goal; summary values migrated to release-test-records.md | [release-test-records.md](./release-test-records.md) v2.6.0 section |
| 2026-06-16 | v260-release-ui-fulltest-20260616 | UI 풀테스트 | v2.6.0 Codex 인앱 브라우저 UI 직접 검수. `/setup`, `/login`, `/password/change`, `/invite/setup`, `/client/request-access`, `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/ops/vlm`, `/client/live`, `/client/dashboard`, `/client/events` route/control/action을 확인했습니다. In-app evidence는 route 10개, auth route 1개, interaction 16개 PASS, 0 failure를 기록하고 `verify-ui-fulltest-one-shot --browser-mode in-app --in-app-evidence ...`가 PASS했습니다. UI evidence script의 DOM click/value setter 제약, verifier option 오입력, viewer denied 판정식 대소문자 문제는 제품 회귀가 아니라 테스트 절차 보정으로 재실행했습니다. 120분 longrun, external endpoint/field smoke, GitHub Release publish는 이 UI 풀테스트 run에서 실행하지 않았고 PASS로 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | combined v2.6.0 release-test goal elapsed 86m 19s; per-area token split not captured | Codex goal total 465,623 tokens for stability+30분+UI goal; in-app and one-shot values migrated to release-test-records.md | [release-test-records.md](./release-test-records.md) v2.6.0 section |
| 2026-06-13 | v250-release-stability-20260613 | 안정화 테스트 | v2.5.0 release stability run. `./server.sh build`, release metadata/evidence, docs links/assets, script/project/feature inventory, manual UI seed dry-run, native dialog/blocking dialog guards, auth bootstrap/users/routes, V250-S01~S09 verifier, manual UI evidence, release closeout dry-run, `verify-predev --quick`, `git diff --check`를 실행했습니다. 최초 `verify-ui-blocking-dialog-policy`는 release docs wiring 누락으로 FAIL했고 [project-feature-test-inventory.md](./project-feature-test-inventory.md)를 수정한 뒤 재실행 PASS했습니다. sandbox RTSP bind 실패는 escalation 재실행으로 확인했고 제품 회귀로 보지 않습니다. 최종 predev quick summary는 status pass, pass 14, fail 0, skip 1, durationSec 632, quickMode true, soakMinutes 1입니다. | PASS | 미집계 | 미집계 | 미집계 | combined v2.5.0 release-test goal elapsed 81m 14s; per-area token split not captured | Codex goal total 736,103 tokens for stability+30분+UI goal; summary values migrated to release-test-records.md | [release-test-records.md](./release-test-records.md) v2.5.0 section |
| 2026-06-13 | v250-release-30min-20260613 | 30분 soak | v2.5.0 release 후보 30분 predev 실행. `./server.sh verify-predev --soak-minutes 30 --rtsp-port 18556 --http-port 18082 --summary-file /tmp/media_server_v250_release_30min_20260613_summary.json --report-file /tmp/media_server_v250_release_30min_20260613_report.md --report-html-file /tmp/media_server_v250_release_30min_20260613_report.html --heartbeat-interval 120` 결과 status pass, pass 119, fail 0, skip 1, durationSec 2370, soakMinutes 30, includeRedaction true. External TURN hard gate는 요청하지 않아 skip이며 PASS로 대체하지 않습니다. | PASS | 미집계 | 미집계 | 미집계 | combined v2.5.0 release-test goal elapsed 81m 14s; per-area token split not captured | Codex goal total 736,103 tokens for stability+30분+UI goal; summary values migrated to release-test-records.md | [release-test-records.md](./release-test-records.md) v2.5.0 section |
| 2026-06-13 | v250-release-ui-fulltest-20260613 | UI 풀테스트 | v2.5.0 Codex 인앱 브라우저 UI 직접 검수. `/setup`, `/login`, `/password/change`, `/invite/setup`, `/client/request-access`, `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/ops/vlm`, `/client/live`, `/client/dashboard`, `/client/events` route/control/action을 확인했습니다. In-app evidence는 14개 route, 25개 interaction PASS, 0 failure를 기록하고 `verify-ui-fulltest-one-shot`이 PASS했습니다. `/ops/events` semantic search, incident timeline action save, explainable brief, similar incident lookup, evidence filter, release-safe bundle control/manifest policy를 확인했습니다. release-safe bundle OS/browser download event는 Codex 인앱 브라우저 downloads 미지원으로 관측 대상에서 제외했고, 후속 targeted check에서 동일 UI payload의 token/download route가 HTTP 200 `application/zip`과 `Content-Disposition: attachment` 및 redacted manifest를 반환하는 것을 확인했습니다. | PASS | 미집계 | 미집계 | 미집계 | combined v2.5.0 release-test goal elapsed 81m 14s; per-area token split not captured | Codex goal total 736,103 tokens for stability+30분+UI goal; in-app, one-shot, and targeted attachment values migrated to release-test-records.md | [release-test-records.md](./release-test-records.md) v2.5.0 section |
| 2026-06-13 | v250-release-safe-bundle-download-followup-20260613 | UI 풀테스트 | v2.5.0 release-safe bundle download follow-up. Codex 인앱 브라우저에서는 download event가 지원되지 않아 제품 실패로 판정하지 않았고, Chrome 스킬로 같은 `/ops/events` 화면을 다시 열어 `evt-v250-ui-001` row의 `release-safe bundle` 버튼 payload가 정확히 1개로 좁혀지는 것을 확인한 뒤 `tab.playwright.waitForEvent("download")`가 실제 browser download event를 관측했습니다. 동일 UI payload로 `/lab/analysis/events/evidence/bundle-token?releaseSafe=1`과 반환된 bundle URL도 호출해 HTTP 200, `Content-Type: application/zip`, `Content-Disposition: attachment; filename="redacted-incident-evidence-evt-v250-ui-001.zip"`, zip `manifest.json` schema `media-server.v250.redacted-incident-evidence-bundle.v1`, `releaseSafe: true`, raw/source/credential/provider/debug material excluded를 확인했습니다. | PASS | 미집계 | 미집계 | 미집계 | command/browser follow-up output 기준 | manual-not-available for token snapshot; targeted Chrome download event, browser locator, and curl response values migrated to release-test-records.md | [release-test-records.md](./release-test-records.md) v2.5.0 section |
| 2026-06-13 | v250-release-publication-20260613 | release publication | v2.5.0 release publication. PR #28 (`v2.5.0` -> `main`)은 Preflight/static-gates와 Licensing and Artifact Guardrails/guardrails PASS 및 check-run blocking annotations 0 확인 뒤 merge commit `4240509336983f4061a073a73040345dcbc2067c`로 병합했습니다. CI 실패 1회는 `verify-ui-visual-artifact-index`의 `artifact download` 문구 gate였고 [ui-guide.md](./ui-guide.md) 문서 줄바꿈을 수정한 뒤 local verifier와 PR checks 재실행 PASS했습니다. `v2.5.0` tag는 SSH signed annotated tag로 생성/푸시했고 GitHub Release는 source-only notes로 publish했습니다. Published metadata는 최초 `--release-branch v2.5.0` 오지정으로 branch head mismatch FAIL 후, merge된 `main` 기준 재실행에서 PASS 21 / FAIL 0입니다. | PASS | 미집계 | 미집계 | 미집계 | GitHub PR/check/tag/release command output 기준 | manual-not-available for token snapshot; GitHub PR/check/tag/release links are retained evidence and report values are migrated to release-test-records.md | [release-test-records.md](./release-test-records.md) v2.5.0 section |

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
Not run for `v230-s07-integrator-contract-conformance-20260605`: UI 풀테스트 직접 조작, 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, real ONVIF device, external WHEP/WHIP/TURN endpoint, real cloud provider call, main merge, release tag, GitHub Release 생성, push. `verify-ops-client-ui`는 in-app evidence 부재로 실패했으며 S07 PASS evidence에서 제외했습니다.
Not run for `v230-s02-four-test-evidence-consistency-20260605`: 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, UI 풀테스트 직접 조작, real ONVIF device, external WHEP/WHIP/TURN endpoint, real cloud provider call, main merge, release tag, GitHub Release 생성, push. 이 항목은 V230-S02 evidence 정합성 gate이며, 30분/120분/UI 풀테스트 실행 evidence를 대체하지 않습니다.
Not run for `v230-s03-ui-renderer-module-decomposition-20260605`: `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`는 필수 auth password env 미설정으로 시작하지 않음. 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, 인앱 브라우저 UI 풀테스트 직접 조작 PASS 판정, real ONVIF device, external WHEP/WHIP/TURN endpoint, real cloud provider call, main merge, release tag, GitHub Release 생성, push. 이 항목은 V230-S03 module/source ownership 안정화 evidence이며, 장시간/UI 풀테스트 evidence를 대체하지 않습니다.
Not run for `v230-s04-conditional-field-evidence-20260605`: real ONVIF device, 실장비 ONVIF endpoint/credential handshake, 실제 RTSP/RTSPS playback field smoke, external TURN/WHEP credential operation, external WHEP playback endpoint, UI 풀테스트 직접 조작, 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, real cloud provider call, main merge, release tag, GitHub Release 생성, push. 이 항목은 V230-S04 conditional field gate이며, not-run is not PASS이고 실제 field success evidence를 대체하지 않습니다.
Not run for `v230-s05-vlm-opt-in-operational-evidence-20260605`: UI 풀테스트 직접 조작, 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, 실제 VLM runtime call, real cloud provider call, provider credential 저장, provider logging/retention 최신 정책 수동 승인, model/runtime download 또는 bundle, VLM default-on, Sidecar write, real ONVIF device, external WHEP/WHIP/TURN endpoint, main merge, release tag, GitHub Release 생성, push. 이 항목은 V230-S05 VLM opt-in operational evidence gate이며, default not-run provider gate와 local loopback smoke를 실제 provider/model 품질 PASS로 대체하지 않습니다.
Not run for `v230-s06-ops-backup-recovery-lifecycle-20260605`: UI 풀테스트 직접 조작, 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, real operational backup, production restore cutover, 장기 영상 녹화 백업, external storage replication, real ONVIF device, external WHEP/WHIP/TURN endpoint, real cloud provider call, main merge, release tag, GitHub Release 생성, push. 이 항목은 V230-S06 lifecycle gate이며, 실제 운영 백업 완료나 UI 직접 확인 evidence를 대체하지 않습니다.
Not run for `v240-s08-release-readiness-gate-20260610`: UI 풀테스트 직접 조작 미실행, 30분 테스트 미실행, 120분 테스트 미실행, `verify-va-runtime-console-longrun --duration-minutes 120` 미실행, verify-release-metadata --published 미실행, tag/push/GitHub Release manual-not-run, PR merge/main sync/next branch sync manual-not-run, real ONVIF, external TURN/WHEP, real cloud provider call. 이 항목은 V240-S08 local readiness gate이며, release publish나 장시간/UI/field evidence를 대체하지 않습니다.
Not run for `v240-release-30min-20260611`: 120분 longrun은 별도 `v240-release-120min-20260611`에서 실행, UI 풀테스트는 별도 `v240-release-ui-fulltest-20260611`에서 실행. External TURN hard gate, real ONVIF, external WHEP/WHIP/TURN endpoint, real cloud provider call, PR merge, main sync, tag, GitHub Release, published metadata 재검증, release branch 삭제, next branch sync는 이 30분 soak run에서 실행하지 않았습니다.
Not run for `v240-release-ui-fulltest-20260611`: 30분 soak와 120분 longrun은 별도 행에서 실행. 실기기 ONVIF, external WHEP/WHIP/TURN endpoint, real cloud provider call, 실제 외부 alert delivery, PR merge, main sync, tag, GitHub Release, published metadata 재검증, release branch 삭제, next branch sync는 UI 풀테스트 run에서 실행하지 않았습니다.
Not run for `v240-release-120min-20260611`: External TURN hard gate는 요청하지 않아 skip, real ONVIF, external WHEP/WHIP/TURN endpoint, real cloud provider call, UI 직접 조작, PR merge, main sync, tag, GitHub Release, published metadata 재검증, release branch 삭제, next branch sync는 이 120분 longrun run에서 실행하지 않았습니다. UI 직접 조작은 별도 `v240-release-ui-fulltest-20260611`에서 실행했습니다.
Not run for `v250-s01-incident-text-projection-20260611`: `/ops/events` 검색 UI, SQLite/FTS index, local memory index persistence/search API, similarity lookup, timeline graph, explainable brief, client-safe digest, UI 풀테스트 직접 조작, 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, external embedding/provider call, real ONVIF, external WHEP/WHIP/TURN endpoint, PR merge, main sync, tag, GitHub Release 생성, push. 이 항목은 V250-S01 projection 안정화 evidence이며, V250-S02 이후 index/search/UI evidence를 대체하지 않습니다.
Not run for `v250-s02-incident-memory-index-20260611`: `/ops/events` 검색 UI, HTTP 검색 API, similarity lookup, timeline graph, explainable brief, client-safe digest, UI 풀테스트 직접 조작, 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, external embedding/provider call, real ONVIF, external WHEP/WHIP/TURN endpoint, PR merge, main sync, tag, GitHub Release 생성, push. 이 항목은 V250-S02 local index 안정화 evidence이며, V250-S03 이후 UI/API/search experience evidence를 대체하지 않습니다.
Not run for `v250-s03-ops-events-semantic-search-ui-20260612`: UI 풀테스트 직접 조작, 운영 데이터 검색 결과 육안 판독, 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, external embedding/provider call, real ONVIF, external WHEP/WHIP/TURN endpoint, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증. 이 항목은 S03 안정화 verifier evidence이며, UI 풀테스트나 release publish evidence를 대체하지 않습니다.
Not run for `v250-s04-incident-timeline-graph-20260612`: UI 풀테스트 직접 조작, 실제 운영 데이터 graph 판독, 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, Event POST/WebRTC/SSE/WS/media path 변경 검증 확대, real ONVIF, external WHEP/WHIP/TURN endpoint, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증. 이 항목은 S04 안정화 verifier evidence이며, UI 풀테스트나 release publish evidence를 대체하지 않습니다.
Not run for `v250-s05-explainable-incident-brief-20260612`: UI 풀테스트 직접 조작, 실제 provider 호출, VLM runtime/model bundle, VLM default-on, 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, real ONVIF, external WHEP/WHIP/TURN endpoint, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증. 이 항목은 S05 안정화 verifier evidence이며, UI 풀테스트나 provider 운영 evidence를 대체하지 않습니다.
Not run for `v250-s06-similar-incident-lookup-20260613`: UI 풀테스트 직접 조작, 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, external embedding/provider call, real ONVIF, external WHEP/WHIP/TURN endpoint, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증. 이 항목은 S06 안정화 verifier evidence이며, UI 풀테스트나 provider/search 운영 evidence를 대체하지 않습니다.
Not run for `v250-s07-client-safe-incident-digest-20260613`: viewer role UI 직접 조작, 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, real ONVIF, external WHEP/WHIP/TURN endpoint, real cloud provider call, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증. 이 항목은 S07 안정화 verifier evidence이며, UI 풀테스트와 viewer role 직접 확인은 별도 `v250-release-ui-fulltest-20260613`에서 실행한 범위로만 기록합니다.
Not run for `v250-s08-redacted-incident-evidence-bundle-20260613`: 실제 OS/browser download event 관측, 30분 soak, 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, real ONVIF, external WHEP/WHIP/TURN endpoint, real cloud provider call, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증. 이 항목은 S08 안정화 verifier evidence이며, release-safe UI control/manifest 확인은 별도 `v250-release-ui-fulltest-20260613`, HTTP attachment follow-up은 `v250-release-safe-bundle-download-followup-20260613` 범위로만 기록합니다.
Not run for `v250-s09-owner-release-readiness-20260611`: UI 풀테스트 직접 조작 미실행, 30분 테스트 미실행, 120분 테스트 미실행, `verify-va-runtime-console-longrun --duration-minutes 120` 미실행, verify-release-metadata --published 미실행, tag/push/GitHub Release manual-not-run, PR merge/main sync/next branch sync manual-not-run, real ONVIF, external TURN/WHEP, real cloud provider call. 이 항목은 V250-S09 local readiness gate이며, 이후 실행된 `v250-release-30min-20260613`과 `v250-release-ui-fulltest-20260613` evidence를 대체하지 않습니다.
Not run for `v260-s06-owner-release-readiness-20260615`: UI 풀테스트 직접 조작 미실행, 30분 테스트 미실행, 120분 테스트 미실행, `verify-va-runtime-console-longrun --duration-minutes 120` 미실행, `verify-release-metadata --published` 미실행, tag/push/GitHub Release manual-not-run, PR merge/main sync/next branch sync manual-not-run, real ONVIF, external TURN/WHEP, real cloud provider call. 이 항목은 V260-S06 local readiness gate이며, release publish나 장시간/UI/field evidence를 대체하지 않습니다.
Not run for `v270-s06-owner-release-readiness-20260616`: UI 풀테스트 직접 조작 미실행, 30분 테스트 미실행, 120분 테스트 미실행, `verify-va-runtime-console-longrun --duration-minutes 120` 미실행, `verify-release-metadata --published` 미실행, tag/push/GitHub Release manual-not-run, PR merge/main sync/next branch sync manual-not-run, real ONVIF, external TURN/WHEP, real cloud/VLM provider call. 이 항목은 V270-S06 local readiness gate이며, release publish나 장시간/UI/field evidence를 대체하지 않습니다.
Not run for `v280-s07-owner-release-readiness-20260618`: UI 풀테스트 직접 조작 미실행, 30분 테스트 미실행, 120분 테스트 미실행, `verify-va-runtime-console-longrun --duration-minutes 120` 미실행, `verify-release-metadata --published` 미실행, tag/push/GitHub Release manual-not-run, PR merge/main sync/next branch sync manual-not-run, real ONVIF, external TURN/WHEP, real cloud/VLM provider call. 이 항목은 V280-S07 local readiness gate이며, release publish나 장시간/UI/field evidence를 대체하지 않습니다.
Not run for `v290-s09-owner-release-readiness-20260619`: S09 local readiness gate 자체에서는 UI 풀테스트 직접 조작, 30분 테스트, 120분 predev, `verify-va-runtime-console-longrun --duration-minutes 120`, `verify-release-metadata --published`, PR merge/main sync/tag/push/GitHub Release, real ONVIF, external TURN/WHEP, real cloud/VLM provider call을 실행하지 않았습니다. 이번 release cut에서 실행한 UI/장시간 evidence는 별도 `v290-release-*` 행에 기록했으며, S09 local readiness gate와 서로 대체하지 않습니다.
Not run for `v290-release-ui-fulltest-20260619`: 30분 soak, 120분 predev, 120분 runtime console은 별도 `v290-release-30min-20260619`, `v290-release-120min-predev-20260619`, `v290-release-runtime-console-120min-20260619`에서 실행했습니다. manual UI result file, real ONVIF, external TURN/WHEP, real cloud/VLM provider call, YouTube real URL relay, external alert delivery, PR/main sync, release tag, GitHub Release 생성, published metadata 재검증은 이 UI fulltest run에서 실행하지 않았습니다.
Not run for `v290-release-30min-20260619`: UI fulltest, 120분 predev, 120분 runtime console은 별도 행에서 실행했습니다. External TURN hard gate는 요청하지 않아 skip이며 PASS가 아닙니다. real ONVIF, external WHEP/WHIP/TURN endpoint, real cloud/VLM provider call, YouTube real URL relay, external alert delivery, PR/main sync, release tag, GitHub Release 생성, published metadata 재검증은 이 30분 soak run에서 실행하지 않았습니다.
Not run for `v290-release-120min-predev-20260619`: UI fulltest, 30분 soak, 120분 runtime console은 별도 행에서 실행했습니다. External TURN hard gate는 요청하지 않아 skip이며 PASS가 아닙니다. real ONVIF, external WHEP/WHIP/TURN endpoint, real cloud/VLM provider call, YouTube real URL relay, external alert delivery, PR/main sync, release tag, GitHub Release 생성, published metadata 재검증은 이 120분 predev run에서 실행하지 않았습니다.
Not run for `v290-release-runtime-console-120min-20260619`: UI fulltest, 30분 soak, 120분 predev는 별도 행에서 실행했습니다. RTSP overlay는 resource 관리상 포함하지 않아 skip이며 PASS가 아닙니다. real ONVIF, external WHEP/WHIP/TURN endpoint, real cloud/VLM provider call, YouTube real URL relay, external alert delivery, PR/main sync, release tag, GitHub Release 생성, published metadata 재검증은 이 runtime console run에서 실행하지 않았습니다.
Not run for `v280-release-local-gates-20260618`: 30분 soak, Codex 인앱 브라우저 UI 풀테스트, PR/main sync, release tag, GitHub Release 생성, published metadata 재검증은 이 local gate run에서 실행하지 않았습니다. 120분 longrun은 v2.8.0 신규 기능 ID의 120분 직접 매핑이나 local gate high-risk signal이 확인되지 않아 현재 진행 대상으로 판정하지 않았습니다.
Not run for `v280-release-ui-fulltest-20260618`: 30분 soak, 120분 predev, `verify-va-runtime-console-longrun --duration-minutes 120`, real ONVIF, external TURN/WHEP, real cloud/VLM provider call, 실제 외부 alert delivery, PR/main sync, release tag, GitHub Release 생성, published metadata 재검증은 이 UI 풀테스트 run에서 실행하지 않았습니다.
Not run for `v270-release-stability-20260616`: 30분 soak, 120분 predev, 120분 runtime console은 별도 `v270-release-30min-20260616`, `v270-release-120min-20260616`, `v270-release-runtime-console-120min-20260616`에서 실행. 인앱 브라우저/수동 UI 직접 풀테스트, external TURN hard gate, real ONVIF, external WHEP/WHIP/TURN endpoint, real cloud/VLM provider call, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증은 이 안정화 run에서 실행하지 않았습니다.
Not run for `v270-release-ui-one-shot-20260616`: manual UI result, Codex 인앱 브라우저 UI 직접 evidence, 30분 soak, 120분 predev, 120분 runtime console, 실기기 ONVIF, external WHEP/WHIP/TURN endpoint, real cloud/VLM provider call, 실제 외부 alert delivery, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증은 이 UI one-shot run에서 실행하지 않았습니다. 30분/120분/120분 runtime console은 별도 행에서 실행했습니다.
Not run for `v270-release-30min-20260616`: 안정화 테스트, UI one-shot, 120분 predev, 120분 runtime console은 별도 행에서 실행. External TURN hard gate는 요청하지 않아 skip이며 PASS가 아닙니다. 인앱 브라우저/수동 UI 직접 풀테스트, real ONVIF, external WHEP/WHIP/TURN endpoint, real cloud/VLM provider call, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증은 이 30분 soak run에서 실행하지 않았습니다.
Not run for `v270-release-120min-20260616`: 안정화 테스트, UI one-shot, 30분 soak, 120분 runtime console은 별도 행에서 실행. External TURN hard gate는 요청하지 않아 skip이며 PASS가 아닙니다. 인앱 브라우저/수동 UI 직접 풀테스트, real ONVIF, external WHEP/WHIP/TURN endpoint, real cloud/VLM provider call, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증은 이 120분 predev run에서 실행하지 않았습니다.
Not run for `v270-release-runtime-console-120min-20260616`: 안정화 테스트, UI one-shot, 30분 soak, 120분 predev는 별도 행에서 실행. 인앱 브라우저/수동 UI 직접 풀테스트, external TURN hard gate, real ONVIF, external WHEP/WHIP/TURN endpoint, real cloud/VLM provider call, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증은 이 runtime console run에서 실행하지 않았습니다.
Not run for `v260-release-stability-20260616`: 30분 soak와 UI 풀테스트는 별도 `v260-release-30min-20260616`, `v260-release-ui-fulltest-20260616`에서 실행. 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, external TURN/WHEP hard gate, real ONVIF, real cloud/VLM provider call, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증은 이 안정화 run에서 실행하지 않았습니다.
Not run for `v260-release-30min-20260616`: 안정화 테스트와 UI 풀테스트는 별도 `v260-release-stability-20260616`, `v260-release-ui-fulltest-20260616`에서 실행. External TURN hard gate는 요청하지 않아 skip이며 PASS가 아닙니다. 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, real ONVIF, external WHEP/WHIP/TURN endpoint, real cloud/VLM provider call, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증은 이 30분 soak run에서 실행하지 않았습니다.
Not run for `v260-release-ui-fulltest-20260616`: 안정화 테스트와 30분 soak는 별도 `v260-release-stability-20260616`, `v260-release-30min-20260616`에서 실행. 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, 실기기 ONVIF, external WHEP/WHIP/TURN endpoint, real cloud/VLM provider call, 실제 외부 alert delivery, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증은 UI 풀테스트 run에서 실행하지 않았습니다.
Not run for `v250-release-stability-20260613`: 30분 soak와 UI 풀테스트는 별도 `v250-release-30min-20260613`, `v250-release-ui-fulltest-20260613`에서 실행. 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, external TURN/WHEP hard gate, real ONVIF, real cloud provider call, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증은 이 안정성 run에서 실행하지 않았습니다.
Not run for `v250-release-30min-20260613`: 안정성 테스트와 UI 풀테스트는 별도 `v250-release-stability-20260613`, `v250-release-ui-fulltest-20260613`에서 실행. External TURN hard gate는 요청하지 않아 skip이며 PASS가 아닙니다. 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, real ONVIF, external WHEP/WHIP/TURN endpoint, real cloud provider call, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증은 이 30분 soak run에서 실행하지 않았습니다.
Not run for `v250-release-ui-fulltest-20260613`: 안정성 테스트와 30분 soak는 별도 `v250-release-stability-20260613`, `v250-release-30min-20260613`에서 실행. release-safe bundle 실제 OS/browser download event는 Codex 인앱 브라우저 downloads 미지원으로 본 UI 풀테스트 run 안에서는 관측하지 않았고, Chrome 실제 download event와 동일 UI payload의 HTTP attachment/zip manifest는 별도 `v250-release-safe-bundle-download-followup-20260613`에서 확인했습니다. 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, 실기기 ONVIF, external WHEP/WHIP/TURN endpoint, real cloud provider call, 실제 외부 alert delivery, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증은 UI 풀테스트 run에서 실행하지 않았습니다.
Not run for `v250-release-safe-bundle-download-followup-20260613`: 120분 longrun, `verify-va-runtime-console-longrun --duration-minutes 120`, 실기기 ONVIF, external WHEP/WHIP/TURN endpoint, real cloud provider call, 실제 외부 alert delivery, PR merge, main sync, tag, GitHub Release 생성, published metadata 재검증. 이 follow-up은 Chrome 실제 download event 관측과 HTTP attachment/manifest 검증만 수행했습니다.

## v3.3.0 Release Test Category Judgment 2026-06-27

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | v3.3.0 Step 11 local readiness gate와 v3.3.0 Live Source Reliability Workspace Step 1~10 companion verifier가 release prep 범위에 직접 해당합니다. | `v330-step11-stabilization-release-readiness-20260627`, `V330 Step 1`~`V330 Step 11`, `OPS-080`~`OPS-090`, `SAFE-113`~`SAFE-123` | 실행 완료. 결과는 [release-test-records.md](./release-test-records.md) v3.3.0 section에 기록했습니다. |
| 30분 테스트 | 진행 대상 | AGENTS.md에서 30분 soak는 릴리즈 완료/출시 가능 판정의 필수 장시간 항목이며, 이번 release cut에서 `verify-predev --soak-minutes 30`을 실행했습니다. External TURN hard gate는 요청하지 않아 skip이며 PASS가 아닙니다. | `v330-release-30min-20260627`; [predev summary](./release-artifacts/v3.3.0/predev-1782548179-72502/summary.json) | 실행 완료. 결과는 [release-test-records.md](./release-test-records.md) v3.3.0 section에 기록했습니다. |
| UI 풀테스트 | 진행 대상 | AGENTS.md의 UI 직접 확인 경계를 만족하도록 Codex 인앱 브라우저 route/control/action evidence와 one-shot wrapper를 함께 실행했습니다. | `v330-release-ui-fulltest-20260627`; [ui evidence](./release-artifacts/v3.3.0/ui-fulltest-20260627/in-app-evidence.json), [one-shot summary](./release-artifacts/v3.3.0/ui-fulltest-20260627/one-shot/summary.json) | 실행 완료. 결과는 [release-test-records.md](./release-test-records.md) v3.3.0 section에 기록했습니다. |
| 120분 테스트 | 미진행 | 최신 지시가 120분 실행을 명시하지 않았고, 현재 v3.3.0 release policy/roadmap/evidence가 120분을 이번 cut 필수 gate로 명시하지 않았습니다. 이번 변경은 RTSP/WebRTC/WHEP/WHIP media path, source worker lifecycle, shared stream reuse, runtime/metadata fanout, cleanup/port lifecycle을 직접 변경하지 않았고 30분/UI 결과에서 memory/runtime/session drift high-risk signal도 확인되지 않았습니다. | `v330-release-30min-20260627`, `v330-release-ui-fulltest-20260627`, `v330 Step 11 local readiness gate records` | 실행 대상 아님. 30분/UI PASS를 120분 PASS로 대체하지 않음. |
| Field smoke | 조건부/미진행 | real ONVIF, external TURN/WHEP, external WHEP playback, real cloud/VLM provider, YouTube real URL relay, external alert delivery는 endpoint/credential/실기기 조건이 필요합니다. | `v330 release field smoke` not-run row | 조건 미제공으로 미실행. PASS로 대체하지 않음. |
| Release publication | 실행 완료/후속 브랜치 미진행 | PR #47 main merge, annotated tag `v3.3.0`, GitHub Release 생성, PR #48 published metadata correction merge, `./server.sh verify-release-metadata --published --release-branch main` 최종 `pass=21 fail=0`을 release action evidence로 분리 기록했습니다. Release branch 삭제와 v3.4.0 branch creation은 최신 요청의 문서 보정/재검증 범위 밖이므로 아직 실행하지 않았습니다. | `v330 release PR/main/ruleset/tag/GitHub Release`, `v330 release published metadata initial`, `v330 release published metadata correction` | release publication 완료. 후속 branch cleanup/create는 별도 action으로 남김. |

## v2.9.0 Release Test Category Judgment 2026-06-19

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | v2.9.0 S09 local release gate와 v2.9.0 Final 2.x Closure & Compatibility Baseline source scope가 release prep 범위에 직접 해당합니다. | `v290-s09-owner-release-readiness-20260619`, `V290-S00`~`V290-S09`, `OPS-050`, `SAFE-080` | 실행 완료. 결과는 [release-test-records.md](./release-test-records.md) v2.9.0 section에 기록했습니다. |
| 30분 테스트 | 진행 대상 | 릴리즈 cut 안정화 evidence로 30분 predev를 실행했습니다. External TURN hard gate는 요청하지 않아 skip이며 PASS가 아닙니다. | `v290-release-30min-20260619` | 실행 완료. 결과는 [release-test-records.md](./release-test-records.md) v2.9.0 section에 기록했습니다. |
| UI 풀테스트 | 진행 대상 | AGENTS.md의 UI 직접 확인 경계를 만족하도록 Codex 인앱 브라우저 evidence와 one-shot wrapper를 함께 실행했습니다. | `v290-release-ui-fulltest-20260619`; [manual-ui-checklist.md](./manual-ui-checklist.md) V290 table | 실행 완료. 결과는 [release-test-records.md](./release-test-records.md) v2.9.0 section에 기록했습니다. |
| 120분 테스트 | 진행 대상 | 릴리즈 cut 장시간 evidence로 `verify-predev --soak-minutes 120`와 `verify-va-runtime-console-longrun --duration-minutes 120`를 실행했습니다. RTSP overlay는 runtime console run에서 resource 관리상 포함하지 않아 skip이며 PASS가 아닙니다. | `v290-release-120min-predev-20260619`, `v290-release-runtime-console-120min-20260619` | 실행 완료. 결과는 [release-test-records.md](./release-test-records.md) v2.9.0 section에 기록했습니다. |
| Field smoke | 조건부/미진행 | real ONVIF, external TURN/WHEP, external WHEP playback, real cloud/VLM provider, YouTube real URL relay, external alert delivery는 endpoint/credential/실기기 조건이 필요합니다. | `v290 release field smoke` not-run row | 조건 미제공으로 미실행. PASS로 대체하지 않음. |
| Release publication | 완료 | PR/main/tag/GitHub Release/published metadata는 local evidence와 별도 release action입니다. PR #37 release merge/tag/GitHub Release 후 published metadata가 최초 fail했고, PR #38 correction 후 `verify-release-metadata --published --release-branch main` pass 21/fail 0으로 통과했습니다. | `v290-release-publication-20260619` | 실행 완료. 결과는 [release-test-records.md](./release-test-records.md) v2.9.0 section에 기록했습니다. |

## v2.8.0 Release Test Category Judgment 2026-06-18

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | v2.8.0 release local gate와 V280-S00~S07 문서/inventory/verifier 연결이 이번 release prep 범위에 직접 해당합니다. | `v280-release-local-gates-20260618`, `V280-S00`~`V280-S07`, `OPS-039`, `OPS-040`, `SAFE-064`, `SAFE-070` | 실행 완료. 결과는 [release-test-records.md](./release-test-records.md) v2.8.0 section에 기록했습니다. |
| 30분 테스트 | 조건부 진행 | v2.8.0 신규 기능 ID는 30분 영역에 직접 매핑되지 않았습니다. 장기간 soak 실행은 별도 실행 승인 또는 high-risk signal이 있을 때 진행합니다. | `UI-055`~`UI-058`, `CLIENT-024`, `EVT-055`~`EVT-058`, `LAB-079`~`LAB-082`, `SAFE-065`~`SAFE-070` | 미승인/미실행. |
| UI 풀테스트 | 진행 대상 | V280-S02~S06이 UI 영역에 직접 매핑되어 있고 manual UI checklist가 인앱 브라우저 직접 조작 기준을 요구합니다. | `UI-055`, `UI-056`, `UI-057`, `UI-058`, `CLIENT-024`; [manual-ui-checklist.md](./manual-ui-checklist.md) V280 table; `v280-release-ui-fulltest-20260618` | 실행 완료. 결과는 [release-test-records.md](./release-test-records.md) v2.8.0 section에 기록했습니다. |
| 120분 테스트 | 미진행 | v2.8.0 신규 기능 ID의 120분 직접 매핑, RTSP/WebRTC/WHEP/WHIP media path 변경, source worker/shared stream/runtime fanout/cleanup 변경, local gate high-risk signal이 확인되지 않았습니다. | `V280-S02`~`V280-S07`, `SAFE-065`~`SAFE-070`, `v280-release-local-gates-20260618` | 실행 대상 아님. |

v2.0.0 release publication was later completed by `v200-release-publication-20260601`.
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
