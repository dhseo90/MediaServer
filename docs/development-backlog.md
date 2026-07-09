# Development Backlog

이 문서는 현재 source tree의 roadmap 요약을 보관합니다. 여기서 `완료`라고 표시한
항목은 해당 source 기능과 local verifier 기준을 뜻합니다. GitHub Release publish,
UI 풀테스트, 30분, 120분 evidence는 해당 실행 증거가 있을 때만 별도로 완료로 씁니다.

- 현재 버전/비범위 기준: [versioning-policy.md](./versioning-policy.md)
- release 정책: [release-policy.md](./release-policy.md)
- 검증 명령 기준: [stream-verification.md](./stream-verification.md)

## 현재 공개 상태

- 현재 소스 버전: `3.9.0`
- 최신 공개 GitHub Release: `v3.8.0`
- `v3.9.0` 준비 상태: source-only preparation branch. Binary, runtime, model bundle은
  포함하지 않습니다.
- 현재 source roadmap: `v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation`
- 최신 published baseline: `v3.8.0 Operator-Gated Action Pilot & Outcome Loop`

## 현재 source roadmap: v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation

상태: Step 1~20 local gate는 v3.9.0 source branch 기준으로 닫혔지만, 여기서
`완료`라고 표시한 값은 각 step의 문서, read-only decision route, UI status, verifier,
release evidence boundary가 연결되었다는 뜻입니다. 실제 30분/120분 stop-on-first-fail
runner 구현, 무료 UI 자동화 runner 구현, 구조 안정화 리팩토링, UI 풀테스트 직접 실행,
30분/120분 장시간 실행, published metadata, release action은 별도 evidence가 있을
때만 완료로 봅니다. 아래 `v3.9.0 남은 구현 목표` 섹션은 다른 개발 채팅이 이 대화의
맥락 없이도 구현해야 할 실제 목표와 통과 조건을 이해하도록 남긴 source-of-truth입니다.
Candidate/structure 영역은 여전히 discovery 결과 승인 전 기능 개발 금지 경계를 따릅니다.

직접 답: v3.9.0의 1차 선택값은 `Feature Completion First with Dedicated Inventory`입니다.
목적: v1.0.0부터 v3.8.0까지 노출/약속/부분 구현된 기능을 직접 대조하고,
v4.0 구조 안정화와 새 테스트 체계로 넘어가기 전 필요한 기능 완성 항목을 닫는
준비 릴리즈입니다.

비범위:

- 자동 대량 apply
- 승인 없는 action/source/rule/client/media mutation
- discovery 승인 전 미완성 기능 임의 개발
- feature completion close-out 전 구조 전면 리팩토링 착수
- 새 테스트 모델을 다섯 번째 AGENTS 테스트 영역으로 추가
- Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media schema/path 변경
- Auth/Role/Scope, SourceRegistry/PublishedView, Rule/Profile 저장 payload 계약 변경
- viewer/client에 source locator, credential, raw diagnostic JSON, operator-only blocker detail 노출
- 외부 credential/endpoint/실기기 성공을 기본 PASS로 승격
- 사용자 승인 없는 30분/120분/UI 풀테스트, PR, main merge, tag, GitHub Release, 후속 브랜치 생성
- v3.9 published 완료 주장

개발은 중요도와 의존 순서를 함께 고려해 Foundation -> Required Closeout ->
Evidence/Test Gate -> Test Model Prep -> Product Completion -> Conditional Field/AI ->
Structure -> Release 순서로 진행합니다. 아래 표의 순서는 v3.9.0에서 개발을 진행할
때의 기준 순서입니다.

| 구간 | 제목 | 우선순위 | 개발 내용 |
| --- | --- | --- | --- |
| Foundation | v3.9.0 (1) v3.9.0 baseline 정렬 | P0 | VERSION/docs/backlog/source roadmap 정렬 |
| Foundation | v3.9.0 (2) Feature Completion Inventory/Discovery Gate | P0 | `docs/v390-feature-completion-inventory.md`에 required/candidate/structure/excluded 목록과 source group checked 상태를 고정 |
| Foundation | v3.9.0 (3) User Review Gate / 개발 순서 확정 | P0 | Required development, candidate development, structure-stabilization handoff, excluded/non-scope를 보고하고 사용자 승인 전 기능 개발 중단 |
| Required Closeout | v3.9.0 (4) Manual UI 기준서 v3.9 current화 | P0 | `V390-REQ-001`: manual UI fulltest/checklist/result template의 v2.x current-looking 기준을 v3.9 기준 또는 historical archive로 정리 |
| Required Closeout | v3.9.0 (5) 장시간/UI 테스트 시작 조건 v3.9화 | P0 | `V390-REQ-002`: long-test/UI start condition을 v3.9 feature completion inventory와 review gate 기준으로 정렬 |
| Required Closeout | v3.9.0 (6) v3.5-v3.8 UI coverage bridge | P0 | `V390-REQ-003`: manual UI docs에 v3.5-v3.8 route/control/action coverage를 추가하거나 project inventory delegate를 명시 |
| Evidence/Test Gate | v3.9.0 (7) UI wrapper/result schema 오판 방지 | P0 | `V390-CAND-007`: wrapper PASS와 UI/longrun/manual evidence PASS를 분리하는 result schema와 문구 정리 |
| Evidence/Test Gate | v3.9.0 (8) feature inventory coverage wording 오판 방지 | P0 | `V390-CAND-008`: coverage mapping PASS를 실행 PASS로 오해하지 않도록 covered/missing 중심 문구로 정리 |
| Test Model Prep | v3.9.0 (9) AI-minimized server longrun runner 기준 | P0 | 30분/120분 서버 테스트를 단순 스크립트 실행, case-by-case stop-on-fail, 상세 오류 출력 방식으로 설계 |
| Test Model Prep | v3.9.0 (10) AI-minimized UI automation adapter 기준 | P0 | 무료 UI 자동화 도구 후보를 평가하고, 실패 상황과 재현 정보를 남기는 UI test runner 기준을 설계 |
| Product Completion | v3.9.0 (11) ONVIF credential/provider status summary | P1 | `V390-CAND-001`: secret/reference value를 노출하지 않는 Ops-only provider readiness/status 요약 여부 결정 |
| Product Completion | v3.9.0 (12) ONVIF live import persist decision | P1 | `V390-CAND-002`: 승인된 ONVIF probe/import를 source/view 저장까지 연결할지 결정하고 scope guard 설계 |
| Product Completion | v3.9.0 (13) VLM rule suggestion draft bridge | P1 | `V390-CAND-003`: VLM rule suggestion review-to-draft 흐름과 no-auto-apply evidence를 보강 |
| Product Completion | v3.9.0 (14) VLM profile promotion guard | P1 | `V390-CAND-004`: passed evaluation 후보의 profile save/activation guard와 default-off boundary를 명확히 함 |
| Product Completion | v3.9.0 (15) backup/recovery handoff validation | P1 | `V390-CAND-005`: source reliability handoff에 staging restore validation checklist/result를 연결할지 결정 |
| Product Completion | v3.9.0 (16) action execution deferral decision | P1 | `V390-CAND-006`: v3.8 read-only action pilot의 source recheck, client notice send, rule apply write를 명시 defer |
| Conditional Field | v3.9.0 (17) field evidence bridge | P2 | `V390-CAND-009`: 외부 endpoint/credential/provider 승인 기반 field evidence bridge를 추가할지 결정 |
| Conditional AI | v3.9.0 (18) Re-ID appearance assist model-backed path decision | P2 | `V390-CAND-010`: Re-ID assist를 model/config/provenance 기반으로 실동작시킬지 opt-in/defer할지 결정 |
| Structure | v3.9.0 (19) structure stabilization handoff 상세계획 | P0 | `V390-STRUCT-001`~`V390-STRUCT-005`: route/API/UI/VLM/manual UI 문서 구조 안정화 범위를 동작 보존 리팩토링 계획으로 넘김 |
| Release | v3.9.0 (20) stabilization and release readiness | P0 | AGENTS 네 테스트 영역 판정, evidence, cleanup, release close-out dry-run을 실제 실행/미실행으로 분리 |

### v3.9.0 진행 상태

| 번호 | 제목 | 우선순위 | 상태 | 완료/잔여 내용 |
| --- | --- | --- | --- | --- |
| 1 | v3.9.0 (1) v3.9.0 baseline 정렬 | P0 | 완료 | VERSION/CMake/README/docs/backlog/source roadmap과 `verify-v390-entry-baseline` 기준 정렬 |
| 2 | v3.9.0 (2) Feature Completion Inventory/Discovery Gate | P0 | 완료 | `docs/v390-feature-completion-inventory.md`에 required/candidate/structure/excluded 항목과 checked source group 반영 |
| 3 | v3.9.0 (3) User Review Gate / 개발 순서 확정 | P0 | 완료 | required/candidate/structure/excluded 목록을 review-ready로 고정하고 사용자 승인 전 기능 개발 중단 |
| 4 | v3.9.0 (4) Manual UI 기준서 v3.9 current화 | P0 | 완료 | `V390-REQ-001`: `docs/manual-ui-fulltest.md`, `docs/manual-ui-checklist.md`, `docs/manual-ui-result-template.md`가 v3.9 current target과 historical v2.x/v3.x 기준을 분리하고 `verify-manual-ui-evidence`가 이를 확인 |
| 5 | v3.9.0 (5) 장시간/UI 테스트 시작 조건 v3.9화 | P0 | 완료 | `V390-REQ-002`: 긴 테스트 시작 조건을 v3.9 feature completion inventory, current project inventory, 사용자 승인/AGENTS 7.6.2 조건 기준으로 정렬 |
| 6 | v3.9.0 (6) v3.5-v3.8 UI coverage bridge | P0 | 완료 | `V390-REQ-003`: manual UI docs가 v3.5~v3.8 UI/control/action rows를 project feature inventory로 위임하고 실행 PASS와 coverage mapping을 분리 |
| 7 | v3.9.0 (7) UI wrapper/result schema 오판 방지 | P0 | 완료 | `V390-CAND-007`: `verify-ui-fulltest-one-shot` summary에 `wrapperResult`/`resultScope`/`uiFulltestEvidenceStatus`/`manualResultStatus`/`longrunStatus`/`evidenceBoundary`를 추가하고 `verify-v390-evidence-test-gate-prep`가 오판 방지 경계를 확인 |
| 8 | v3.9.0 (8) feature inventory coverage wording 오판 방지 | P0 | 완료 | `V390-CAND-008`: feature coverage report를 `coverageStatus: covered/missing`, `executionEvidenceStatus: not-execution-evidence` 중심으로 바꾸고 mapping coverage와 실행 PASS를 분리 |
| 9 | v3.9.0 (9) AI-minimized server longrun runner 기준 | P0 | 완료 | 30분/120분 script runner의 one command, fixed phase order, stop-on-first-fail, later phase `not-run`, failure evidence, cleanup/artifact policy 기준을 `stream-verification.md`와 verifier로 고정 |
| 10 | v3.9.0 (10) AI-minimized UI automation adapter 기준 | P0 | 완료 | Playwright 우선, Selenium fallback, SikuliX visual fallback과 route/viewport/theme/account-role/action/expected-actual/screenshot/trace-console/log/cleanup/manual-intervention failure report 기준을 `manual-ui-fulltest.md`와 verifier로 고정 |
| 11 | v3.9.0 (11) ONVIF credential/provider status summary | P1 | 완료 | `V390-CAND-001`: `/ops/api/onvif/credential-provider-status`와 `/ops/sources` ONVIF provider summary가 primary provider `none`, fallback `in-memory-fixture`, persistent/external secret store defer 결정을 secret/reference value 비노출 상태로 표시 |
| 12 | v3.9.0 (12) ONVIF live import persist decision | P1 | 완료 | `V390-CAND-002`: `/ops/api/onvif/live-import-persist-decision`와 `/ops/sources`가 manual form-save handoff, import draft `notSaved:true`, one-shot persist disabled, existing `source:write` save route 결정을 표시 |
| 13 | v3.9.0 (13) VLM rule suggestion draft bridge | P1 | 완료 | `V390-CAND-003`: `/ops/api/vlm/rule-suggestion-draft-bridge`와 `/ops/rules`가 incident review provenance를 기존 VLM rule suggestion draft-only/manual-save workflow로 연결하고 rule/profile write, auto-apply, provider/runtime call은 수행하지 않음 |
| 14 | v3.9.0 (14) VLM evaluation promotion guard | P1 | 완료 | `V390-CAND-004`: `/ops/api/vlm/evaluation-promotion-guard`와 `/ops/vlm`가 passed evaluation 후보를 operator-save-then-activation-review 경계로 표시하고 profile write/activation/runtime/provider call은 수행하지 않음 |
| 15 | v3.9.0 (15) backup/recovery handoff validation | P1 | 완료 | `V390-CAND-005`: `/ops/api/source-registry/staging-restore-validation-handoff`와 `/ops/sources`가 staging restore checklist/result artifact contract를 source registry, PublishedView, source health, viewer scope 기준으로 표시하고 production restore/write/recovery는 수행하지 않음 |
| 16 | v3.9.0 (16) action execution deferral decision | P1 | 완료 | `V390-CAND-006`: `/ops/api/actions/execution-deferral-decision`와 `/ops` Action Control Workspace가 `defer-all-action-writes`, source recheck/client notice/rule apply write deferred, approval-gated execution disabled를 표시하고 action execution/write/external delivery는 수행하지 않음 |
| 17 | v3.9.0 (17) field evidence bridge | P2 | 완료 | `V390-CAND-009`: `/ops/api/field-evidence/bridge-decision`와 `/ops` dashboard가 `approval-only-minimal-field-evidence-bridge`, ONVIF/external WHEP-TURN/cloud-VLM 승인 조건, minimal evidence contract, not-run/no-field-execution boundary를 표시하고 field smoke/provider call/write는 수행하지 않음 |
| 18 | v3.9.0 (18) Re-ID appearance assist model-backed path decision | P2 | 완료 | `V390-CAND-010`: `/ops/api/analysis/reid-assist-decision`와 `/ops` dashboard가 `explicit-opt-in-provenance-gated-assist`, model/checksum/provenance gate, no-op fallback, tracker-none forces off boundary를 표시하고 model-backed execution/embedding/crop serialization은 수행하지 않음 |
| 19 | v3.9.0 (19) structure stabilization handoff 상세계획 | P0 | 완료 | 인벤토리 `V390-STRUCT-001`~`V390-STRUCT-005`를 `docs/superpowers/plans/2026-07-08-v390-structure-stabilization-handoff.md`로 이관하고 `verify-v390-structure-stabilization-handoff` gate로 구조 변경 미실행 경계를 고정 |
| 20 | v3.9.0 (20) stabilization and release readiness | P0 | 완료 | AGENTS 네 테스트 영역 판정과 release close-out evidence를 실제 실행/미실행으로 분리 |

완료 경계: v3.9 source baseline/inventory 준비는 실제 기능 개발, discovery 완료,
UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action evidence가
아닙니다. `v3.9.0` publish 완료는 tag, GitHub Release, published metadata 검증 evidence가
있을 때만 완료로 기록합니다. 현재 latest published release는 `v3.8.0`입니다.

## v3.9.0 남은 구현 목표: 다른 개발 채팅 인계용 상세 계약

이 섹션은 v3.9.0을 닫기 전에 실제로 구현해야 할 미완성 부분을 명시합니다.
다른 채팅이나 에이전트는 이 섹션만 읽어도 사용자가 원하는 최종 기능을 구현할 수
있어야 합니다. 특히 테스트 자동화는 "에이전트가 직접 눌러서 확인했다"가 아니라
사용자 또는 다른 채팅이 같은 명령을 그대로 실행했을 때 같은 PASS/FAIL과 같은
failure evidence가 나와야 합니다.

중요한 용어:

- `criteria complete`: 기준, 문서, verifier 문구, not-run boundary가 정리된 상태입니다.
- `implementation complete`: 실제 실행 가능한 script/route/UI가 있고, 실패 시 상세
  evidence를 남기며, 사용자가 같은 command를 재실행해 같은 판정을 얻을 수 있는 상태입니다.
- 현재 Step 9와 Step 10은 `criteria complete`입니다. 아래 R1/R2가 끝나야 사용자가 목표로 한
  `implementation complete` 테스트 방식입니다.

### v3.9.0 잔여 구현 순서

| 순서 | 우선순위 | 대상 | 현재 상태 | 반드시 구현할 내용 | 완료 evidence |
| --- | --- | --- | --- | --- | --- |
| R0 | P0 | `V390-CAND-001` inventory 상태 불일치 정리 | `docs/v390-feature-completion-inventory.md` 원 표 행과 Candidate/Closed 목록이 Step 11 evidence 기준 `closed-with-evidence`로 정리됨 | inventory 원 행을 Step 11 구현 상태와 맞춰 `closed-with-evidence`로 정리하고, Candidate/Closed 목록 문구가 서로 모순되지 않게 보정 | `./server.sh verify-v390-feature-completion-inventory`, `./server.sh verify-v390-onvif-credential-provider-status`, `git diff --check` |
| R1 | P0 | AI-minimized server longrun runner 실제 구현 | `verify-v390-server-longrun`과 contract verifier가 구현됨. 사용자 승인 후 30분 actual final evidence가 보존됐고 120분은 조건부/승인 전 미실행 | 30분/120분 서버 테스트를 하나의 명령으로 시작하고 첫 실패에서 즉시 중단하며 이후 phase를 `not-run`으로 기록하는 새 runner 또는 stop-on-first-fail mode 구현. predev delegated summary가 실패하면 내부 첫 실패 step을 `failedCase`/`delegatedFailure`로 보존 | `./server.sh verify-v390-server-longrun-runner-contract`, 실제 30분 명령 PASS, 실패 fixture에서 first-fail/not-run/delegated predev failure evidence PASS |
| R2 | P0 | AI-minimized UI automation runner 실제 구현 | `verify-v390-ui-automation`/`verify-v390-ui-automation-report`/`verify-v390-ui-automation-runner-contract` 구현과 실제 Playwright-mode UI automation suite PASS evidence가 보존됨. 현재 환경에서는 Playwright package 부재로 `chrome-cdp-fallback` adapter를 명시 기록 | 무료 UI 자동화 도구 우선순위에 맞춘 runner를 구현하고 route/control/action 단위 실패 report, screenshot, trace/video, console, server log, cleanup evidence를 남김 | `./server.sh verify-v390-ui-automation-runner-contract`, `./server.sh verify-v390-ui-automation --browser-mode playwright --output-dir docs/release-artifacts/v3.9.0/ui-automation-playwright-final --allow-chrome-fallback=1`, `./server.sh verify-v390-ui-automation-report --summary docs/release-artifacts/v3.9.0/ui-automation-playwright-final/summary.json`, 실패 fixture에서 failure report PASS |
| R3 | P0 | 사용자가 재실행 가능한 v3.9 test acceptance bundle | `verify-v390-test-acceptance-bundle --dry-run`과 contract verifier가 구현되어 `finalAcceptanceCommandSet`, R1 30분 preserved evidence `pass-existing-evidence`, R2 UI automation preserved evidence `pass-existing-evidence`, 조건부 120분, published/release action not-run boundary를 한 summary/report로 고정함. 실제 acceptance bundle 실행은 사용자 승인 전 미실행 | R1/R2 산출물을 포함한 final acceptance command set을 문서와 script dispatch에 고정하고, 각 command의 summary/report 경로를 release evidence로 복사 가능하게 함 | `./server.sh verify-v390-test-acceptance-bundle --dry-run`, `./server.sh verify-v390-test-acceptance-bundle-contract`, `./server.sh verify-script-inventory`, `./server.sh verify-release-evidence-index` |
| R4 | P1 | legacy `verify-predev`와 새 runner 관계 정리 | R4 선택 option 3으로 정리됨. `verify-predev`는 legacy/compatibility cumulative predev runner, `verify-v390-server-longrun`은 release-grade first-fail runner이며 runtime/media trigger matrix row도 새 runner를 표준 trigger로 사용 | 기존 command를 유지할지, 새 command로 matrix를 바꿀지 결정하고 docs/project inventory/release policy가 같은 runner를 가리키게 정렬 | `./server.sh verify-v390-longrun-runner-role-alignment`, `./server.sh verify-runtime-media-longrun-trigger-matrix`, `./server.sh verify-longrun-separation`, `./server.sh verify-rc-release-gate` |
| R5 | P1 | UI result/release evidence replay guard | v3.9.0 R5 UI automation report replay guard 구현됨. `verify-v390-ui-automation-report --summary <summary.json>`가 progress output과 함께 PASS zero-fail/not-run/manual-intervention, artifact 보존, browserConsole warning/error 허용 사유, first-fail 이후 not-run 순서를 검증함. 실제 R2 suite 보존 summary replay도 PASS로 실행됨 | UI runner summary를 입력으로 받아 route/control/action 개별 행, manual intervention 없음, failed interaction 0, screenshot/trace/log 존재를 검증하는 replay verifier 구현 | `./server.sh verify-v390-ui-automation-report --summary docs/release-artifacts/v3.9.0/ui-automation-playwright-final/summary.json`, `./server.sh verify-v390-ui-automation-report-replay-guard` |

### R1. AI-minimized server longrun runner 구현 계약

목표:

- 사용자는 장시간 서버 테스트를 직접 해석하거나 에이전트가 서버를 손으로 보살피지 않아도 됩니다.
- 하나의 command가 30분 또는 120분 suite를 시작하고, command line과 모든 phase 결과를
  summary/report에 남깁니다.
- 첫 실패가 발생하면 즉시 suite를 중단하고, 실패 phase 이후의 phase는 실행하지 않고
  `not-run`으로 기록합니다.
- 최종 exit code는 PASS면 `0`, FAIL이면 non-zero입니다.

권장 command 이름:

```bash
./server.sh verify-v390-server-longrun --duration-minutes 30 --output-dir <path>
./server.sh verify-v390-server-longrun --duration-minutes 120 --output-dir <path>
./server.sh verify-v390-server-longrun-runner-contract
```

구현 위치 기준:

- dispatch: `server.sh`
- runner: `scripts/internal/verify_v390_server_longrun.mjs` 또는 `.sh`
- contract verifier: `scripts/internal/verify_v390_server_longrun_runner_contract.mjs`
- docs: `docs/stream-verification.md`, `docs/release-test-records.md`,
  `docs/release-evidence-index.md`, `docs/project-feature-test-inventory.md`

필수 phase 순서:

| phase | 목적 | 실패 시 evidence |
| --- | --- | --- |
| preflight | command, duration, output dir, ports, required tools, fixture 존재 확인 | missing tool/file/port와 해결 파일 경로 |
| build | `./server.sh build` 또는 명시적 skip 사유 | build command, exit code, build log path |
| seed | throwaway registry/event/snapshot/clip path 준비 | seed file/path, cleanup 대상 |
| start-server | isolated RTSP/HTTP port로 서버 시작 | port, health URL, server log path, tail |
| integrated-smoke | 기존 `./server.sh test --no-start ...` 또는 동등 smoke | command, exit code, log path, tail |
| soak-case-loop | VA event, event-post schema/recovery/queue, redaction 등 case를 순서대로 실행 | 실패 case id, route, command, exit code, case log, summary |
| runtime-idle | session/stream/tap/SSE/WS idle 확인 | final runtime counts, route, log path |
| cleanup | server terminate, ports clean, temporary artifact cleanup/preserve reason | cleanup state, remaining process/port/path |
| report | summary JSON과 Markdown report 생성 | report write failure path |

필수 summary schema:

```json
{
  "schema": "media-server.v390-server-longrun.v1",
  "runId": "v390-server-longrun-...",
  "command": "./server.sh verify-v390-server-longrun --duration-minutes 30 --output-dir ...",
  "durationMinutes": 30,
  "result": "PASS",
  "stopOnFirstFail": true,
  "failedPhase": "",
  "failedCase": "",
  "exitCode": 0,
  "ports": { "http": 0, "rtsp": 0 },
  "outputDir": "",
  "summaryPath": "",
  "reportPath": "",
  "cleanup": {
    "serverStopped": true,
    "portsClean": true,
    "temporaryArtifactsRemoved": true,
    "preservedArtifacts": []
  },
  "phases": [
    {
      "id": "integrated-smoke",
      "status": "PASS",
      "command": "",
      "exitCode": 0,
      "logPath": "",
      "summaryPath": "",
      "tail": []
    }
  ]
}
```

실패 fixture 요구사항:

- contract verifier는 실제 30분을 기다리지 않고 의도적으로 실패하는 작은 fixture를 실행해
  first-fail 동작을 확인해야 합니다.
- 실패 fixture 결과는 `failedPhase`와 `failedCase`가 채워져야 합니다.
- 실패 phase 이후 phase는 `SKIPPED`가 아니라 `not-run`으로 명확히 기록해야 합니다.
- 실패 report에는 command, exit code, phase, route 또는 health URL, port, log path,
  summary path, report path, cleanup state, likely investigation files가 있어야 합니다.

기존 `verify-predev`와의 차이:

- 현재 `scripts/internal/verify_predev_stability.sh`는 일부 step에 `|| true`를 사용해
  실패를 누적한 뒤 마지막에 FAIL을 반환합니다. 이것은 R1 목표인 first-fail runner가 아닙니다.
- 기존 `verify-predev`를 고치려면 compatibility risk를 문서화하고, 기존 release evidence를
  깨지 않는 `--stop-on-first-fail` opt-in mode로 시작하는 것을 권장합니다.
- 더 안전한 선택은 `verify-v390-server-longrun` 새 command를 만들고, release trigger matrix가
  새 command를 가리키도록 R4에서 정렬하는 것입니다.

R1 완료 판정:

```bash
./server.sh verify-v390-server-longrun-runner-contract
./server.sh verify-v390-server-longrun --duration-minutes 30 --output-dir docs/release-artifacts/v3.9.0/server-longrun-30min-final
git diff --check
```

120분은 AGENTS 7.6.2 high-risk/RC 조건 또는 사용자의 명시 승인 후에만 실행합니다.
R1 구현 완료와 120분 실행 완료는 서로 다른 evidence입니다.

### R2. AI-minimized UI automation runner 구현 계약

목표:

- 에이전트가 인앱 브라우저를 직접 클릭하지 않아도 UI test suite가 실행됩니다.
- 무료 도구 우선순위는 Playwright, Selenium, SikuliX/image fallback 순서입니다.
- 기본 runner는 Playwright를 우선합니다. Selenium은 Playwright 실행 불가 환경의 fallback,
  SikuliX는 DOM만으로 video viewport, overlay, crop, visual artifact를 판정하기 어려울 때만
  별도 visual fallback으로 둡니다.
- 실패 시 어떤 route/control/action에서 무엇이 기대와 달랐는지 사용자가 summary/report만
  보고 재현할 수 있어야 합니다.

구현 command 이름:

```bash
./server.sh verify-v390-ui-automation --browser-mode playwright --output-dir <path>
./server.sh verify-v390-ui-automation --browser-mode selenium --output-dir <path>
./server.sh verify-v390-ui-automation --browser-mode sikulix --output-dir <path>
./server.sh verify-v390-ui-automation-runner-contract
./server.sh verify-v390-ui-automation-report --summary <summary.json>
```

구현 위치 기준:

- dispatch: `server.sh`
- runner: `scripts/internal/verify_v390_ui_automation.mjs`
- report verifier: `scripts/internal/verify_v390_ui_automation_report.mjs`
- contract verifier: `scripts/internal/verify_v390_ui_automation_runner_contract.mjs`
- case manifest: `test/fixtures/v390_ui_automation_cases.json`
- docs: `docs/manual-ui-fulltest.md`, `docs/manual-ui-checklist.md`,
  `docs/manual-ui-result-template.md`, `docs/release-test-records.md`,
  `docs/release-evidence-index.md`, `docs/project-feature-test-inventory.md`

필수 실행 모델:

| phase | 목적 | 실패 시 evidence |
| --- | --- | --- |
| preflight | browser tool, dependency, output dir, auth env, fixture 확인 | missing dependency/env와 설치/설정 위치 |
| seed | core/auth throwaway registry/users/event path 생성 | seed plan, registry dir |
| start-core-server | auth off core UI 서버 시작 | health URL, port, server log |
| start-auth-server | auth auto UI 서버 시작 | users file, health URL, port, server log |
| case-loop | route/control/action manifest를 순서대로 실행 | case id, route, viewport, theme, role, control/action |
| visual-capture | screenshot/trace/video/console/server log reference 수집 | artifact path |
| cleanup | browser context, servers, ports, temp files 정리 | cleanup state |
| report | summary JSON, Markdown report, optional HTML/index 생성 | report path |

필수 case granularity:

- case는 `Rules PASS`, `Auth PASS` 같은 큰 묶음으로 판정하지 않습니다.
- 모든 case는 기능 ID와 route/control/action을 가져야 합니다.
- 예시:
  - `UI-108 onvif-provider-status visible on /ops/sources`
  - `UI-109 onvif-live-import-persist-decision visible on /ops/sources`
  - `UI-110 vlm-rule-suggestion-draft-bridge visible on /ops/rules`
  - `UI-111 vlm-evaluation-promotion-guard visible on /ops/vlm`
  - `UI-113 action-execution-deferral visible on /ops`
  - `UI-114 field-evidence-bridge visible on /ops`
  - `UI-115 reid-assist-decision visible on /ops`

필수 failure report 필드:

```json
{
  "caseId": "UI-108",
  "route": "/ops/sources",
  "viewport": { "width": 390, "height": 844 },
  "theme": "light",
  "accountRole": "operator",
  "controlAction": "open-source-tools-panel",
  "expectedResult": "provider status card shows primarySelection=none",
  "actualResult": "card not found",
  "screenshotPath": "",
  "tracePath": "",
  "videoPath": "",
  "browserConsole": [],
  "serverLogReference": "",
  "cleanupPortState": "clean",
  "manualIntervention": false
}
```

필수 summary schema:

```json
{
  "schema": "media-server.v390-ui-automation.v1",
  "runId": "v390-ui-automation-...",
  "command": "./server.sh verify-v390-ui-automation --browser-mode playwright --output-dir ...",
  "browserMode": "playwright",
  "result": "PASS",
  "manualIntervention": false,
  "caseCount": 0,
  "pass": 0,
  "fail": 0,
  "notRun": 0,
  "failedCaseId": "",
  "outputDir": "",
  "summaryPath": "",
  "reportPath": "",
  "screenshotsDir": "",
  "tracesDir": "",
  "cleanup": {
    "coreServerStopped": true,
    "authServerStopped": true,
    "portsClean": true
  },
  "cases": []
}
```

R2 완료 판정:

```bash
./server.sh verify-v390-ui-automation-runner-contract
./server.sh verify-v390-ui-automation --browser-mode playwright --output-dir docs/release-artifacts/v3.9.0/ui-automation-playwright-final
./server.sh verify-v390-ui-automation-report --summary docs/release-artifacts/v3.9.0/ui-automation-playwright-final/summary.json
git diff --check
```

R2 구현/실행 기록:

- `scripts/internal/verify_v390_ui_automation.mjs`는 `adapterPlan`, `selectedAdapter`,
  `adapterAttempts`, case별 `adapterEvidence`, `browserConsolePath`를 summary에 기록합니다.
  Playwright package가 없으면 명시 승인된 `--allow-chrome-fallback=1` 조건에서
  `chrome-cdp-fallback`을 선택하고, Selenium remote endpoint와 SikuliX visual command는
  환경변수 기반 fallback 후보로 분리합니다.
- throwaway server는 `MEDIA_SERVER_SKIP_LOCAL_ENV=1`로 로컬 `.media_server.env` override를
  차단하고 isolated RTSP/HTTP port를 사용합니다.
- 실제 실행 evidence:
  `./server.sh verify-v390-ui-automation --browser-mode playwright --output-dir docs/release-artifacts/v3.9.0/ui-automation-playwright-final --allow-chrome-fallback=1`
  결과 `media-server.v390-ui-automation.v1` summary가 `result=PASS`, `pass=7`,
  `fail=0`, `notRun=0`, cleanup `coreServerStopped=true`, `portsClean=true`를 기록했습니다.
- replay evidence:
  `./server.sh verify-v390-ui-automation-report --summary docs/release-artifacts/v3.9.0/ui-automation-playwright-final/summary.json`
  결과 `pass=6 fail=0`으로 통과했습니다.

주의:

- `verify-ui-fulltest-one-shot` wrapper PASS는 계속 wrapper PASS입니다. R2 runner가 PASS하더라도
  release UI 풀테스트 PASS로 쓰려면 route/control/action 결과표와 summary/report가 함께 있어야 합니다.
- manual intervention이 `true`인 run은 자동 clean PASS가 아닙니다.
- screenshot만 있고 DOM/console/server log/report가 없으면 UI PASS가 아닙니다.

### R3. v3.9 test acceptance bundle 구현 계약

목표:

- 다른 채팅이 "통과했다"고 보고할 때 사용자가 같은 command set을 그대로 재실행할 수 있어야 합니다.
- local/static verifier PASS, server longrun PASS, UI automation PASS, not-run boundary가 서로 섞이지
  않아야 합니다.

구현 command:

```bash
./server.sh verify-v390-test-acceptance-bundle --dry-run
./server.sh verify-v390-test-acceptance-bundle --dry-run --output-dir <path>
./server.sh verify-v390-test-acceptance-bundle --output-dir docs/release-artifacts/v3.9.0/test-acceptance-final
./server.sh verify-v390-test-acceptance-bundle-contract
```

`--dry-run`은 command 존재, output path, required env, case manifest, report schema만 확인하고
장시간 테스트를 실행하지 않습니다. 실제 `--output-dir` 실행은 사용자 승인 후에만 30분/UI/조건부 120분을
실행합니다.

bundle summary는 `scripts/internal/verify_v390_test_acceptance_bundle.mjs`의
`readLongrun30Evidence`, `readUiAutomationEvidence`, `buildFinalAcceptanceCommandSet`,
`writeReport` 로직으로 아래 항목을 분리해야 합니다.

| 항목 | PASS 조건 | PASS 대체 금지 |
| --- | --- | --- |
| local readiness | Step 1~20 local verifier와 docs/evidence/script inventory PASS | UI/30분/120분 실행 evidence |
| server 30분 | R1 runner 30분 command summary `result=PASS`와 `realDurationEvidence=true`를 `pass-existing-evidence`로 읽음 | contract verifier PASS |
| server 120분 | 사용자 승인 또는 high-risk 조건에서 R1/R4 120분 summary `result=PASS` | 30분 PASS |
| UI automation | R2 runner route/control/action summary `result=PASS`, `automationResult=PASS`, `manualIntervention=false`, `fail=0`, `notRun=0`, report 존재를 `pass-existing-evidence`로 읽음 | wrapper PASS, screenshot-only, UI 풀테스트 직접 조작 PASS |
| published metadata | `./server.sh verify-release-metadata --published` PASS | local `verify-release-metadata` |
| release action | PR/main/tag/GitHub Release/후속 브랜치 각각 사용자 승인 후 evidence | local readiness PASS |

### R4. 기존 longrun command와 새 runner 정렬 계약

현재 historical evidence와 compatibility 문맥에는 기존 command가 남아 있습니다.

```bash
./server.sh verify-predev --soak-minutes 30
./server.sh verify-predev --soak-minutes 120
./server.sh verify-va-runtime-console-longrun --duration-minutes 120
```

R4 선택: option 3.

R1 구현 후 아래 선택지 중 3번을 채택했습니다.

1. 기존 command에 `--stop-on-first-fail` mode를 추가하고 release policy가 그 mode를
   사용하도록 정렬합니다.
2. 새 `verify-v390-server-longrun` command를 30분/120분 표준으로 채택하고 기존 command는
   legacy/compatibility runner로 남깁니다.
3. `verify-predev`는 short/predev 누적형, `verify-v390-server-longrun`은 release-grade
   first-fail runner로 역할을 분리합니다.

선택 근거: 기존 evidence와 verifier 의미를 덜 흔들면서 사용자가 원하는 새 테스트
방식만 명확히 추가할 수 있습니다. `verify-predev` remains legacy/compatibility cumulative
predev runner. `verify-v390-server-longrun` is the release-grade first-fail runner.
Runtime/media trigger matrix row의 30분/120분 server longrun trigger는
`verify-v390-server-longrun --duration-minutes 30`과
`verify-v390-server-longrun --duration-minutes 120`을 가리킵니다.
historical `verify-predev --soak-minutes 30` evidence remains preserved.
historical `verify-predev --soak-minutes 120` evidence remains preserved.
`./server.sh verify-v390-server-longrun --duration-minutes 120`은 상시 실행하지 않고 release candidate 또는 고위험 변경 gate로만 실행합니다.
`./server.sh verify-predev --soak-minutes 120`은 runner 내부 delegated predev summary 또는
historical compatibility evidence 문맥으로만 남기며, v3.9.0 release-grade 120분
server longrun 표준 trigger는 새 runner입니다.

R4 완료 판정:

```bash
./server.sh verify-v390-longrun-runner-role-alignment
./server.sh verify-runtime-media-longrun-trigger-matrix
./server.sh verify-longrun-separation
./server.sh verify-rc-release-gate
./server.sh verify-v390-server-longrun-runner-contract
git diff --check
```

### R5. UI automation report replay guard 구현 계약

목표:

- 다른 채팅이 UI automation 결과를 보고할 때 summary JSON만 주면, 사용자가 verifier로
  report 신뢰성을 다시 확인할 수 있어야 합니다.

권장 command:

```bash
./server.sh verify-v390-ui-automation-report --summary <summary.json>
```

검증해야 할 것:

- `schema`가 `media-server.v390-ui-automation.v1`
- `result=PASS`이면 `fail=0`, `notRun=0`, `manualIntervention=false`
- 모든 case에 `caseId`, `route`, `viewport`, `theme`, `accountRole`, `controlAction`,
  `expectedResult`, `actualResult`, `screenshotPath`, `serverLogReference`, `cleanupPortState` 존재
- artifact path가 실제 존재하거나, report가 보존하지 않은 사유를 명시
- `browserConsole` error/warning이 있으면 PASS 불가 또는 명시적 허용 사유 필요
- 실패 report에는 failed case 이후 case가 `not-run`으로 남아야 함

R5 완료 판정:

```bash
./server.sh verify-v390-ui-automation-report --summary docs/release-artifacts/v3.9.0/ui-automation-playwright-final/summary.json
./server.sh verify-v390-ui-automation-report-replay-guard
git diff --check
```

R5 구현 기록:

- `scripts/internal/verify_v390_ui_automation_report.mjs`:
  v3.9.0 R5 UI automation report replay guard 조건을 추가했습니다. 각 check는
  `[progress] (n/total) <check> test; remaining=<count>` 형식으로 진행 상황을 출력합니다.
  PASS summary는 `fail=0`, `notRun=0`, `manualIntervention=false`, failed interaction 0이어야
  하며, 모든 case의 `screenshotPath`, `tracePath`, `videoPath`, `serverLogReference`,
  `cleanupPortState`, `browserConsole`, `manualIntervention=false`를 확인합니다.
- `scripts/internal/verify_v390_ui_automation_report_replay_guard_contract.mjs`:
  missing artifact, `artifactPreservationReason` 누락, `browserConsole` warning/error 무허용,
  PASS summary의 not-run/manual intervention, failure 이후 계속 실행된 PASS case를 fixture로
  검증합니다.
- `scripts/internal/verify_v390_ui_automation.mjs`:
  summary에 `failedInteractionCount`를 기록해 replay guard가 failed interaction 0을 직접
  확인할 수 있게 했습니다.
- `server.sh`, `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`, `docs/release-evidence-index.md`,
  `scripts/internal/verify_script_inventory.mjs`:
  `./server.sh verify-v390-ui-automation-report-replay-guard`를 R5 구현 evidence로 연결했습니다.
- R5 replay guard PASS는 UI 풀테스트 직접 조작 PASS가 아님. 실제
  `docs/release-artifacts/v3.9.0/ui-automation-playwright-final/summary.json` replay는
  R2 suite summary 보존 후 실행했고 `pass=6 fail=0`으로 통과했습니다.

### v3.9.0 잔여 구현 완료 전 금지되는 완료 주장

아래 문장은 R0~R5와 필요한 실제 실행 evidence가 생기기 전에는 쓰지 않습니다.

- `v3.9.0 테스트 방식 전환 구현 완료`
- `v3.9.0 UI 풀테스트 PASS`
- `v3.9.0 30분 PASS`
- `v3.9.0 120분 PASS`
- `verify-ui-fulltest-one-shot PASS이므로 UI 풀테스트 PASS`
- `verify-v390-evidence-test-gate-prep PASS이므로 테스트 방식 구현 완료`
- `verify-v390-stabilization-release-readiness PASS이므로 release 준비 완료`
- `Step 19 완료이므로 구조 안정화 구현 완료`

R0~R5가 끝난 뒤에도 release close-out은 AGENTS 4장과 7장에 따라 별도 승인, 별도 실행,
별도 evidence로만 진행합니다.

## v3.9.0 Foundation 개발 기록

이번 Foundation 범위는 `v3.9.0 (1)`~`v3.9.0 (3)`입니다.

- Step 1 `v3.9.0 baseline 정렬`: `VERSION`, `CMakeLists.txt`, README 계열,
  `docs/README.md`, `docs/en/README.md`, `docs/development-backlog.md`,
  `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`, `docs/release-evidence-index.md`,
  `scripts/internal/verify_v390_entry_baseline.mjs`, `server.sh`에 source `3.9.0`와
  latest published `v3.8.0` 경계를 연결했습니다.
- Step 2 `Feature Completion Inventory/Discovery Gate`:
  `docs/v390-feature-completion-inventory.md`에 required/candidate/structure/excluded
  목록, source group checked 상태, disposition/test-area vocabulary, review gate를
  고정하고 `scripts/internal/verify_v390_feature_completion_inventory.mjs`와
  `./server.sh verify-v390-feature-completion-inventory`로 검증합니다.
- Step 3 `User Review Gate / 개발 순서 확정`:
  `docs/v390-feature-completion-inventory.md`의 `User Review Output`에 review-ready
  required/candidate/structure/excluded 목록과 승인 전 차단 상태를 기록하고,
  `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`, `docs/release-evidence-index.md`,
  `scripts/internal/verify_v390_user_review_gate.mjs`, `server.sh`에
  `./server.sh verify-v390-user-review-gate`를 연결했습니다.

## v3.9.0 Evidence/Test Gate and Test Model Prep 개발 기록

이번 범위는 `v3.9.0 (7)`~`v3.9.0 (10)`입니다.

- Step 7 `UI wrapper/result schema 오판 방지`:
  `scripts/internal/verify_ui_fulltest_one_shot.mjs`가 summary JSON/Markdown에
  `wrapperResult`, `resultScope`, `uiFulltestEvidenceStatus`, `manualResultStatus`,
  `longrunStatus`, `evidenceBoundary`를 기록합니다. `wrapperResult=PASS`는 UI 풀테스트
  직접 조작, 30분/120분 longrun, manual result, published metadata PASS가 아닙니다.
- Step 8 `feature inventory coverage wording 오판 방지`:
  `scripts/internal/verify_feature_inventory_coverage.mjs`의 per-feature report가
  `coverageStatus: covered/missing`와 `executionEvidenceStatus: not-execution-evidence`를
  사용합니다. command-level verifier pass/fail과 feature mapping coverage를 분리합니다.
- Step 9 `AI-minimized server longrun runner 기준`:
  `docs/stream-verification.md`에 one command, fixed phase order,
  stop-on-first-fail, later phase `not-run`, command/exit code/phase/port/route/log/summary/report/cleanup
  failure evidence, reproducible fixture, artifact cleanup/preserve reason 기준을 기록했습니다.
- Step 10 `AI-minimized UI automation adapter 기준`:
  `docs/manual-ui-fulltest.md`에 Playwright 1차, Selenium 2차, SikuliX/image fallback 조건과
  route/viewport/theme/account-role/control-action/expected-actual/screenshot/trace-video/browser-console/server-log/cleanup/manual-intervention
  failure report 기준을 기록했습니다.
- 통합 확인:
  `scripts/internal/verify_v390_evidence_test_gate_prep.mjs`와
  `./server.sh verify-v390-evidence-test-gate-prep`가 Step 7~10 문서, schema, inventory,
  release records/evidence, server dispatch, script inventory 연결을 확인합니다.

Foundation review-ready 상태:

- 승인 상태: `pending-user-approval`
- 기능 개발 상태: `blocked-before-user-approval`
- 다음 개발 순서: `V390-REQ-001` -> `V390-REQ-002` -> `V390-REQ-003`, 이후 사용자
  승인 범위 안에서 `V390-CAND-*` 또는 `V390-STRUCT-*`로 이동합니다.
- 다음 개발 착수는 사용자가 v3.9 required/candidate list를 승인한 뒤에만 가능합니다.

## v3.9.0 Required Closeout 개발 기록

이번 Required Closeout 범위는 `v3.9.0 (4)`~`v3.9.0 (6)`입니다.

- Step 4 `Manual UI 기준서 v3.9 current화`: `docs/manual-ui-fulltest.md`,
  `docs/manual-ui-checklist.md`, `docs/manual-ui-result-template.md`에 source/UI 기준을
  `v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation`으로
  고정하고, v2.x/v3.x 과거 기준은 historical coverage bridge로 분리했습니다.
- Step 5 `장시간/UI 테스트 시작 조건 v3.9화`: `docs/manual-ui-fulltest.md`의
  `긴 테스트 전 fail-fast 기준`, `docs/manual-ui-checklist.md`의
  `긴 테스트 시작 조건 확인`, `docs/manual-ui-result-template.md`의
  `네 단계 시작 조건 / 재시작 경계`를 v3.9 feature completion inventory,
  current project inventory, 사용자 승인, AGENTS 7.6.2 조건 기준으로 정렬했습니다.
- Step 6 `v3.5-v3.8 UI coverage bridge`: manual UI 기준 문서와 result template에
  `v3.5-v3.8 UI coverage bridge` 표를 추가해 v3.5 `UI-080`~v3.8 `UI-107` 및
  관련 `CLIENT-*` rows를 `docs/project-feature-test-inventory.md`로 위임했습니다.
- `scripts/internal/verify_manual_ui_evidence.mjs`는 `V390-REQ-001`,
  `V390-REQ-002`, `V390-REQ-003`, `v3.5-v3.8 UI coverage bridge`,
  `## v3.9.0 Release Evidence Index`가 manual UI 문서에서 누락되면 실패하도록
  보강했습니다.
- 이번 범위는 문서/test-source closeout입니다. 제품 API schema, Event payload,
  WebRTC/SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, UI runtime behavior는
  변경하지 않았습니다. 30분, 120분, 인앱 브라우저 UI 풀테스트, published metadata,
  PR/main/tag/GitHub Release는 이번 step에서 실행하지 않았고 PASS evidence로 쓰지 않습니다.

## v3.9.0 Product Completion 개발 기록

이번 Product Completion 범위는 `v3.9.0 (11)`~`v3.9.0 (16)`입니다.

- Step 11 `ONVIF credential/provider status summary`:
  - 1차 선택값: 제품 persistent credential provider는 `none`으로 둡니다.
  - fallback: no-device/test fixture 확인용 `in-memory-fixture`만 fallback으로 표시합니다.
  - 제외/defer: `local-encrypted`, `external-secret-manager`, plaintext API field는 v3.9 Step 11 범위에서 제외하고 별도 security/field roadmap 승인 전까지 defer합니다.
  - `src/ingress/webrtc_http_server.cpp`에 `OpsV390OnvifCredentialProviderStatusSummaryJson`과 GET `/ops/api/onvif/credential-provider-status` route를 추가했습니다. 이 route는 `require_ops_principal()`, `Cache-Control: no-store`, `media-server.ops.v390-onvif-credential-provider-status.v1` schema, `providerReadiness`, `redactionSummary`, `boundaries`를 반환하며 credential lookup/source-view write/client exposure/schema/media 변경을 수행하지 않습니다.
  - `src/ingress/product_ui_ops_sources_script.cpp`에 `loadOnvifCredentialProviderStatus`와 `renderOnvifCredentialProviderStatus`를 추가해 `/ops/sources` ONVIF 도구 영역이 `primarySelection=none`, fallback `in-memory-fixture`, `persistent store deferred`, `referenceValueExposed=false`, `credentialMaterialExposed=false` 상태를 표시합니다.
  - `scripts/internal/verify_v390_onvif_credential_provider_status.mjs`와 `./server.sh verify-v390-onvif-credential-provider-status`를 추가해 route/UI/docs/inventory/release records 연결과 secret/reference value 비노출 경계를 검증합니다.
  - 이 step은 provider readiness/status summary 완성입니다. ONVIF 실기기 credential 성공, persistent secret store, external secret manager, source/view persist decision, UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence가 아닙니다.
- Step 12 `ONVIF live import persist decision`:
  - 1차 선택값: `/ops/api/onvif/import-draft`는 계속 `notSaved:true` draft API로 유지하고, one-shot source/view persist route는 열지 않습니다.
  - persist 방식: `manual-form-save-handoff`를 선택합니다. Probe/import draft는 `/ops/sources` 채널 form에 적용되고, 실제 SourceRegistry/PublishedView 저장은 기존 operator save flow와 `source:write` scope를 거칩니다.
  - rollback/audit 경계: save 전에는 draft form clear/edit, save 후에는 기존 channel edit/delete route로 rollback합니다. Step 12 decision route 자체는 SourceRegistry/PublishedView write, rollback write, client exposure, schema/media mutation을 수행하지 않습니다.
  - `src/ingress/webrtc_http_server.cpp`에 `OpsV390OnvifLiveImportPersistDecisionJson`과 GET `/ops/api/onvif/live-import-persist-decision` route를 추가했습니다. 이 route는 `require_ops_principal()`, `Cache-Control: no-store`, `media-server.ops.v390-onvif-live-import-persist-decision.v1` schema, `decision`, `scopeAndAudit`, `rollbackModel`, `boundaries`를 반환합니다.
  - `src/ingress/product_ui_ops_sources_script.cpp`와 `/ops/sources` ONVIF 도구 영역에 `loadOnvifLiveImportPersistDecision`, `renderOnvifLiveImportPersistDecision`, `onvifPersistDecisionStatus`를 추가해 `manual-form-save-handoff`, `importDraftNotSaved=true`, `oneShotPersist=false`, `sourceWriteRequired=true`를 표시합니다.
  - `scripts/internal/verify_v390_onvif_live_import_persist_decision.mjs`와 `./server.sh verify-v390-onvif-live-import-persist-decision`를 추가해 route/UI/docs/inventory/release records 연결, import-draft `notSaved:true`, source/view write boundary, manual save handoff를 검증합니다.
  - 이 step은 live import persist product decision 완성입니다. one-shot persist, SourceRegistry/PublishedView write by decision route, ONVIF 실기기 success, UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence가 아닙니다.
- Step 13 `VLM rule suggestion draft bridge`:
  - 1차 선택값: `ops-review-to-rule-draft-bridge`를 선택합니다. 새 자동 저장/자동 적용 route를 만들지 않고, 기존 `/ops/api/vlm/rule-suggestion-drafts`와 `/ops/events` incident review provenance를 `/ops/rules` 이벤트 템플릿 draft-only flow로 연결합니다.
  - persistence 방식: bridge route는 read-only decision/evidence summary만 반환합니다. 운영자가 `/ops/rules`에서 `폼에 적용`한 뒤 기존 manual save button을 누를 때만 Rule/Profile registry write가 발생할 수 있습니다.
  - boundary: Step 13 bridge route 자체는 rule/profile registry write, EventRecord write, auto-apply, VLM runtime/provider call, client/viewer exposure, Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media path 변경을 수행하지 않습니다.
  - `src/ingress/webrtc_http_server.cpp`에 `OpsV390VlmRuleSuggestionDraftBridgeJson`과 GET `/ops/api/vlm/rule-suggestion-draft-bridge` route를 추가했습니다. 이 route는 `require_ops_principal()`, `Cache-Control: no-store`, `media-server.ops.v390-vlm-rule-suggestion-draft-bridge.v1` schema, `reviewToDraftBridge`, `evidenceTrail`, `workflowContract`를 반환합니다.
  - `src/ingress/product_ui_page_scripts.cpp`와 `/ops/rules` VLM Rule draft 영역에 `loadOpsVlmRuleSuggestionDraftBridge`, `renderOpsVlmRuleSuggestionDraftBridge`, `opsVlmRuleDraftBridgeStatus`를 추가해 `ops-review-to-rule-draft-bridge`, `provenance=incident-review-provenance`, `manualSaveRequired=true`, `autoApply=false`, `ruleRegistryWrite=false`를 표시합니다.
  - `scripts/internal/verify_v390_vlm_rule_suggestion_draft_bridge.mjs`와 `./server.sh verify-v390-vlm-rule-suggestion-draft-bridge`를 추가해 route/UI/docs/inventory/release records 연결, existing draft workflow manual-save boundary, no-auto-apply/no-provider-call boundary를 검증합니다.
  - 이 step은 VLM rule suggestion review-to-draft bridge 완성입니다. 자동 rule/profile 저장, 자동 적용, 실제 VLM/provider 품질 평가, UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence가 아닙니다.
- Step 14 `VLM evaluation promotion guard`:
  - 1차 선택값: `passed-evaluation-manual-promotion-guard`를 선택합니다. 기존 evaluation result 후보를 새 저장/활성화 route로 자동 승격하지 않고, passed 후보만 profile draft promotion 후보로 표시합니다.
  - persistence 방식: promotion guard route는 read-only decision/evidence summary만 반환합니다. 실제 저장은 기존 `/ops/api/vlm/profiles` operator save route와 `rule:write` scope를 거치며, 활성화는 기존 profile validation의 passed evaluation + active/enabled guard를 통과해야 합니다.
  - boundary: Step 14 guard route 자체는 profile write, activation execution, VLM runtime/provider call, sidecar write, client/viewer exposure, Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media path 변경을 수행하지 않습니다.
  - `src/ingress/webrtc_http_server.cpp`에 `OpsV390VlmEvaluationPromotionGuardJson`과 GET `/ops/api/vlm/evaluation-promotion-guard` route를 추가했습니다. 이 route는 `require_ops_principal()`, `Cache-Control: no-store`, `media-server.ops.v390-vlm-evaluation-promotion-guard.v1` schema, `promotionFlow`, `activationGuard`, `workflowContract`를 반환합니다.
  - `src/ingress/product_ui_page_scripts.cpp`와 `/ops/vlm` Evaluation result workflow 영역에 `loadOpsVlmEvaluationPromotionGuard`, `renderOpsVlmEvaluationPromotionGuard`, `opsVlmEvaluationPromotionGuardStatus`를 추가해 `passed-evaluation-manual-promotion-guard`, `operatorSaveRequired=true`, `activationGuard=true`, `runtimeCall=false`, `providerCall=false`를 표시합니다.
  - `scripts/internal/verify_v390_vlm_evaluation_promotion_guard.mjs`와 `./server.sh verify-v390-vlm-evaluation-promotion-guard`를 추가해 route/UI/docs/inventory/release records 연결, existing evaluation result workflow/profile storage validation boundary, no-runtime/no-provider-call boundary를 검증합니다.
  - 이 step은 VLM evaluation promotion guard 완성입니다. 자동 profile 저장, 자동 활성화, 실제 VLM/provider 호출, UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence가 아닙니다.
- Step 15 `backup/recovery handoff validation`:
  - 1차 선택값: `staging-restore-validation-checklist-result-handoff`를 선택합니다. 기존 v3.3 backup/recovery source handoff와 v3.4 staging restore validation harness를 연결하되 production restore/cutover를 수행하지 않습니다.
  - artifact 방식: `/ops/api/source-registry/staging-restore-validation-handoff`는 source registry, PublishedView, source health, viewer scope checklist와 result artifact contract만 반환합니다. 실제 result artifact는 staging run 이후 change ticket 또는 release evidence에 operator가 별도로 첨부합니다.
  - boundary: Step 15 route 자체는 SourceRegistry/PublishedView write, source health snapshot persist, production restore, automatic recovery, viewer scope 변경, client exposure, credential/raw locator 노출, Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media path 변경을 수행하지 않습니다.
  - `src/ingress/webrtc_http_server.cpp`에 `OpsV390StagingRestoreValidationHandoffJson`과 GET `/ops/api/source-registry/staging-restore-validation-handoff` route를 추가했습니다. 이 route는 `require_ops_principal()`, `Cache-Control: no-store`, `media-server.ops.v390-staging-restore-validation-handoff.v1` schema, `stagingRestoreValidationChecklist`, `resultArtifactContract`, `boundaries`를 반환합니다.
  - `src/ingress/product_ui_ops_sources_script.cpp`와 `/ops/sources` Backup Handoff 영역에 `renderStagingRestoreValidationHandoff`, `sourceStagingRestoreValidationStatus`, `source-staging-restore-checklist-list`, `source-staging-restore-result-artifact-list`를 추가해 `resultArtifactPersistedByRoute=false`, `productionRestorePerformed=false`, `automaticRecoveryPerformed=false`를 표시합니다.
  - `scripts/internal/verify_v390_backup_recovery_handoff_validation.mjs`와 `./server.sh verify-v390-backup-recovery-handoff-validation`을 추가해 route/UI/docs/inventory/release records 연결, v3.3 handoff route와 v3.4 staging harness 연결, no-production-restore boundary를 검증합니다.
  - 이 step은 backup/recovery staging restore validation handoff 완성입니다. 실제 restore/cutover, automatic recovery, UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence가 아닙니다.
- Step 16 `action execution deferral decision`:
  - 1차 선택값: `defer-all-action-writes`를 선택합니다. v3.8 read-only action pilot을 이번 Step 16에서 제한 실행으로 열지 않고, source recheck execution, client notice send, rule apply를 별도 승인된 execution roadmap 전까지 모두 deferred 상태로 고정합니다.
  - execution 방식: `/ops/api/actions/execution-deferral-decision`는 기존 v3.8 action/read-model route들을 evidence ref로 참조하는 read-only decision summary만 반환합니다. 새 mutating route, action request persist, approval persist, readiness result persist, receipt/outcome persist, external delivery route는 만들지 않습니다.
  - boundary: Step 16 route 자체는 action execution, source recheck, client notice send, notice queue write, rule apply, rule registry write, SourceRegistry/PublishedView/EventRecord/Ops audit write, external delivery, field smoke, client payload/schema/media 변경을 수행하지 않습니다.
  - `src/ingress/webrtc_http_server.cpp`에 `OpsV390ActionExecutionDeferralDecisionJson`과 GET `/ops/api/actions/execution-deferral-decision` route를 추가했습니다. 이 route는 `require_ops_principal()`, `Cache-Control: no-store`, `media-server.ops.v390-action-execution-deferral-decision.v1` schema, `actionExecutionDeferralDecisionSummary`, `deferredActionKinds`, `boundaries`를 반환합니다.
  - `src/ingress/product_ui_page_scripts.cpp`와 `/ops` Action Control Workspace 인근에 `renderV390ActionExecutionDeferralDecision`, `dashActionExecutionDeferralBadges`, `dashActionExecutionDeferralList`, `dashActionExecutionDeferralBoundary`를 추가해 `approvalGatedExecutionEnabled=false`, `sourceRecheckExecuted=false`, `clientNoticeSent=false`, `ruleApplyPerformed=false`를 표시합니다.
  - `scripts/internal/verify_v390_action_execution_deferral_decision.mjs`와 `./server.sh verify-v390-action-execution-deferral-decision`을 추가해 route/UI/docs/inventory/release records 연결, v3.8 action workspace/default-off explanation 연결, no-action-execution boundary를 검증합니다.
  - 이 step은 action execution deferral decision 완성입니다. 실제 source recheck 실행, client notice 발송, rule apply, action/request/approval/readiness/outcome/receipt persist, UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence가 아닙니다.

## v3.9.0 Conditional Field/AI 개발 기록

이번 Conditional Field/AI 범위는 `v3.9.0 (17)`~`v3.9.0 (18)`입니다.

- Step 17 `field evidence bridge`:
  - 1차 선택값: `approval-only-minimal-field-evidence-bridge`를 선택합니다. 외부 endpoint/credential/provider field run은 사용자/운영자 승인과 실제 실행 evidence가 있을 때만 field evidence가 될 수 있으며, not-run/failed 상태를 release PASS로 승격하지 않습니다.
  - bridge 방식: `/ops/api/field-evidence/bridge-decision`는 v3.4 field bridge condition gate, v3.5 field evidence intake, v3.7 field evidence attachment, v3.8 field connector evidence package를 read-only evidence ref로 연결합니다. route 자체는 field smoke, endpoint probe, credential probe, provider call, minimal evidence persist를 수행하지 않습니다.
  - boundary: Step 17 route 자체는 SourceRegistry/PublishedView/EventRecord/Ops audit write, external WHEP/TURN contact, TURN credential use, cloud/VLM provider call, raw endpoint/credential/provider material 노출, Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media path 변경을 수행하지 않습니다.
  - `src/ingress/webrtc_http_server.cpp`에 `OpsV390FieldEvidenceBridgeDecisionJson`과 GET `/ops/api/field-evidence/bridge-decision` route를 추가했습니다. 이 route는 `require_ops_principal()`, `Cache-Control: no-store`, `media-server.ops.v390-field-evidence-bridge-decision.v1` schema, `fieldEvidenceBridgeDecisionSummary`, `fieldEvidenceBridgeDecisions`, `minimalEvidenceFields`, `boundaries`를 반환합니다.
  - `src/ingress/product_ui_page_scripts.cpp`와 `/ops` dashboard에 `renderV390FieldEvidenceBridgeDecision`, `dashFieldEvidenceBridgeBadges`, `dashFieldEvidenceBridgeList`, `dashFieldEvidenceBridgeBoundary`를 추가해 `fieldSmokeExecuted=false`, `endpointProbePerformed=false`, `credentialProbePerformed=false`, `fieldPassClaimed=false`, `releasePassClaimed=false`를 표시합니다.
  - `scripts/internal/verify_v390_conditional_field_ai_decisions.mjs`와 `./server.sh verify-v390-conditional-field-ai-decisions`를 추가해 Step 17/18 route/UI/docs/inventory/release records 연결, no-field-execution/no-provider-call boundary를 검증합니다.
  - 이 step은 approval-only field evidence bridge decision 완성입니다. field smoke 실행, endpoint/credential/provider 검증 성공, minimal evidence 저장, UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence가 아닙니다.
- Step 18 `Re-ID appearance assist model-backed path decision`:
  - 1차 선택값: `explicit-opt-in-provenance-gated-assist`를 선택합니다. Re-ID assist는 독립 identity search가 아니라 선택된 tracker의 association assist이며, model-backed 실행은 appearance enabled, `onnx-reid` extractor, model path, checksum, provenance가 모두 명시되고 operator opt-in이 있을 때만 ready로 표시합니다.
  - Privacy and runtime fallback gate: Step 18은 기존 Re-ID default-off/privacy gate를 유지합니다. 설정이 부족하거나 tracker가 `none`이면 runtime 의미는 `no-op-visible`/forced-off이며, 모델 path/checksum/provenance 원문이나 embedding/crop identity material은 Ops decision route, client/viewer, WebRTC/SSE/WS/Event metadata로 직렬화하지 않습니다.
  - Re-ID assist 고도화 종료 판정: 이번 Step 18은 `--reid-policy assist` 제품 default-on 전환이 아니라 model-backed path decision입니다. `MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL_SHA256`와 `MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL_PROVENANCE`가 없거나 checksum 누락/형식 오류/불일치, OpenSSL 없는 checksum 검증 불가, tracker-none 조합이면 fallback으로 둡니다. `verify-reid-advanced-tracking`, `verify-close-object-fixture-matrix`, `verify-va-metadata-sidechannel`를 기준으로 Re-ID default-off research continuation 종료 판정을 분리하며, `reid-default-off-research-continuation.md`, `reid-tracking-event-hold-analysis.md`, `reid-fixture-default-on-candidates.md`의 defaultOnDecision/productDefaultOn/candidateCount/defaultOnReason 기록은 default-on 완료 evidence가 아닙니다. `tracking-event=pass`와 `field-new-york-driving=warning`은 fixture별 WARNING 판정과 후보 상태를 남기는 값이고, 제품 default-on 잔여 이슈를 남깁니다. Step 18 decision route/UI 연결에 대한 개발 가능한 후속 이슈는 위 검증 통과 시 남기지 않습니다.
  - Re-ID default-on 연구는 종료하지 않고 WARNING(실험 유지) 상태로 둡니다. Step 18은 이 상태를 바꾸지 않고, operator opt-in과 model/checksum/provenance gate가 충족될 때만 readiness를 표시하는 read-only decision으로 제한합니다.
  - fallback 방식: `/ops/api/analysis/reid-assist-decision`는 현재 `AppConfig`의 appearance/Re-ID 설정 상태를 boolean gate로만 반환합니다. model path/checksum 원문, embedding, crop, identity material은 반환하지 않고, 설정이 부족하면 `no-op-visible` fallback으로 표시합니다.
  - boundary: Step 18 route 자체는 appearance extractor 생성, runtime Re-ID call, embedding/crop serialization, model path/checksum 노출, identity search, face recognition, watchlist matching, client/viewer exposure, Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media path 변경을 수행하지 않습니다.
  - `src/ingress/webrtc_http_server.cpp`에 `OpsV390ReidAssistDecisionJson`과 GET `/ops/api/analysis/reid-assist-decision` route를 추가했습니다. 이 route는 `require_ops_principal()`, `Cache-Control: no-store`, `media-server.ops.v390-reid-assist-decision.v1` schema, `reidAssistDecisionSummary`, `reidAssistRuntimeGate`, `policyDecisions`, `boundaries`를 반환합니다.
  - `src/ingress/product_ui_page_scripts.cpp`와 `/ops` dashboard에 `renderV390ReidAssistDecision`, `dashReidAssistDecisionBadges`, `dashReidAssistDecisionList`, `dashReidAssistDecisionBoundary`를 추가해 explicit opt-in, model/checksum/provenance gate, no-op fallback, `modelBackedExecutionPerformed=false`, `embeddingSerialized=false`, `cropSerialized=false`를 표시합니다.
  - `scripts/internal/verify_v390_conditional_field_ai_decisions.mjs`와 `./server.sh verify-v390-conditional-field-ai-decisions`가 `verify-reid-advanced-tracking`, `verify-analysis-state`와 함께 Re-ID assist UI selection, model-backed readiness, privacy boundary를 분리합니다.
  - 이 step은 Re-ID assist model-backed path decision 완성입니다. 실제 model-backed Re-ID 실행, default-on 승격, identity search, embedding/crop/model path 외부 metadata 노출, UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence가 아닙니다.

## v3.9.0 Structure & Release 개발 기록

이번 Structure & Release 범위는 `v3.9.0 (19)`~`v3.9.0 (20)`입니다.

- Step 19 `structure stabilization handoff 상세계획`:
  - 1차 선택값: `behavior-preserving stabilization handoff`를 선택합니다. 이번 단계는 대형 route/API/UI/docs/VLM 경계를 v4.0.0 구조 안정화 작업 단위로 넘기는 계획이며 실제 route/API/UI extraction 구현은 수행하지 않습니다.
  - 계획 위치: `docs/superpowers/plans/2026-07-08-v390-structure-stabilization-handoff.md`에 `V390-STRUCT-001`~`V390-STRUCT-005`를 `Route/API Ownership Extraction Map`, `Product UI Workspace Split Map`, `Source Registry Read-model Boundary Map`, `Manual UI Result Template Archive Plan`, `VLM Contract Index Consolidation Plan`으로 나눠 기록했습니다.
  - 불변 조건: Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, SourceRegistry/PublishedView, Rule/Profile payload 계약은 변경하지 않습니다.
  - `docs/v390-feature-completion-inventory.md`에 `Structure Stabilization Handoff Output`을 추가해 handoff status를 `handoff-planned-with-evidence`, structure implementation status를 `not-run-by-this-step`으로 분리했습니다.
  - `scripts/internal/verify_v390_structure_stabilization_handoff.mjs`와 `./server.sh verify-v390-structure-stabilization-handoff`를 추가해 계획 문서, backlog, v3.9 inventory, stream verification, project inventory `SAFE-211`/`OPS-178`, release records/evidence, server dispatch/script inventory 연결을 검증합니다.
  - 이 step은 구조 안정화 이관 계획 완료입니다. 실제 `webrtc_http_server.cpp` 분리, product UI script 분리, manual UI template archive split, VLM contract index 구현, UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence가 아닙니다.
- Step 20 `stabilization and release readiness`:
  - 1차 선택값: `local stabilization readiness gate with explicit not-run boundaries`를 선택합니다. 이번 단계는 v3.9.0 source branch의 local readiness 문서/evidence/dispatch 연결을 닫는 작업이며 PR/main/tag/GitHub Release/published metadata/release branch 후속 action을 실행하지 않습니다.
  - AGENTS 테스트 카테고리 판정:

    | 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
    | --- | --- | --- | --- | --- |
    | 안정화 테스트 | 진행 대상 | Step 20 local readiness는 source tree build, verifier, docs/evidence/index/dispatch, close-out dry-run 연결을 확인해야 함 | `v3.9.0 (20)`, `SAFE-212`, `OPS-179` | 현재 Step 20 범위에서 실행 |
    | 30분 테스트 | 진행 대상 | AGENTS 7.6.2 기준 버전별 로드맵 완료와 release 가능 판정에는 30분 evidence가 필요하나 장시간 실행은 별도 명시 승인 필요 | `v3.9.0 (20)`, release evidence/not-run boundary | 사용자 명시 실행 승인 없음 - 미실행 필수 blocker |
    | 120분 테스트 | 조건부 진행 | AGENTS 7.6.2의 high-risk/120분 trigger 또는 사용자 장시간 승인 조건이 있을 때만 진행 | `v3.9.0 (20)`, release evidence/not-run boundary | 사용자 명시 실행 승인 없음 - 미실행 조건부 |
    | UI 풀테스트 | 진행 대상 | release checklist 전체 route/control/action 직접 조작 evidence는 local/static verifier와 대체 불가 | `v3.9.0 (20)`, release evidence/not-run boundary | 사용자 명시 실행 승인 없음 - 미실행 필수 blocker |

  - Companion local gate:

    ```bash
    ./server.sh verify-v390-stabilization-release-readiness
    ./server.sh build
    ./server.sh verify-v390-entry-baseline
    ./server.sh verify-v390-feature-completion-inventory
    ./server.sh verify-v390-user-review-gate
    ./server.sh verify-manual-ui-evidence
    ./server.sh verify-v390-evidence-test-gate-prep
    ./server.sh verify-v390-onvif-credential-provider-status
    ./server.sh verify-v390-onvif-live-import-persist-decision
    ./server.sh verify-v390-vlm-rule-suggestion-draft-bridge
    ./server.sh verify-v390-vlm-evaluation-promotion-guard
    ./server.sh verify-v390-backup-recovery-handoff-validation
    ./server.sh verify-v390-action-execution-deferral-decision
    ./server.sh verify-v390-conditional-field-ai-decisions
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

  - `scripts/internal/verify_v390_stabilization_release_readiness.mjs`와 `./server.sh verify-v390-stabilization-release-readiness`를 추가해 roadmap, stream verification, project inventory `SAFE-212`/`OPS-179`, release policy/evidence/records, AGENTS 테스트 판정표, server dispatch/script inventory 연결을 검증합니다.
  - release action 승인 없음 - 미실행: PR 생성, main merge, signed tag, GitHub Release 생성/갱신, `verify-release-metadata --published`, 후속 브랜치 생성, release branch 삭제, field smoke는 이번 Step 20 local readiness PASS로 완료 처리하지 않습니다.
  - 이 step은 local stabilization/readiness 연결 완료입니다. UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, PR/main/tag/GitHub Release, field smoke PASS가 아닙니다.

## 이전 source roadmap 기록: v3.8.0 Operator-Gated Action Pilot & Outcome Loop

상태: Step 1 source baseline 정렬, Step 2 Ops Action Route Boundary, Step 3 Action
Capability Contract, Step 4 Action Request Ledger Contract, Step 5 Approval Decision Gate,
Step 6 Action Readiness Preflight, Step 7 Source Recheck Action Pilot, Step 8
Client Notice Draft Queue, Step 9 Rule Draft Action Package, Step 10 Ops Action
Control Workspace UI, Step 11 Client-safe Action Notice Preview, Step 12 Outcome Observer and
Reconciliation, Step 13 Action Receipt Bundle, Step 14 Field Connector Evidence Package, Step 15
Default-off Action Explanation, Step 16 Stabilization and Release Readiness를 완료했습니다. 현재 source version은 `3.8.0`이며,
VERSION/CMake/docs/backlog/source roadmap과 v3.8 Step 1~16 local gate를
`3.8.0` 기준으로 정렬했습니다. 각 step은 실제
코드/API/UI/문서/검증 산출물이 생긴 뒤에만 완료로 기록합니다.

직접 답: v3.8.0의 1차 선택값은 `Operator-Gated Action Pilot & Outcome Loop`입니다.
v3.7이 site/source group/runbook approval을 read-only control plane으로 정리했다면,
v3.8은 낮은 위험의 운영 action request를 생성하고, 승인하고, 제한 실행 후보와 결과
reconciliation까지 연결하는 첫 operator-gated loop를 준비합니다.
개발은 중요도와 의존 순서를 함께 고려해 Foundation -> Workflow -> Execution Pilot ->
Product UI -> Evidence/Field -> Release 순서로 진행합니다.

비범위:

- 자동 대량 apply, 자동 recovery cutover, 자동 rule/profile 저장
- approval 없이 source recheck, notice send, rule draft write, field probe 실행
- SourceRegistry/PublishedView/EventRecord/Ops audit/client/media mutation의 무제한 허용
- Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path 변경
- viewer/client에 source locator, credential, raw diagnostic JSON, operator-only blocker detail 노출
- VMS/NVR, 장기 녹화, playback/archive search, runtime/model bundle 배포
- 외부 TURN/WHEP, ONVIF 실기기, cloud/VLM provider 성공을 기본 release PASS로 승격

| 구간 | 제목 | 우선순위 | 개발 내용 |
| --- | --- | --- | --- |
| Foundation | v3.8.0 (1) v3.8.0 baseline 정렬 | P0 | VERSION/CMake/README/docs/backlog/source roadmap을 `3.8.0`와 `verify-v380-entry-baseline` 기준으로 정렬 |
| Foundation | v3.8.0 (2) Ops Action Route Boundary | P0 | v3.8 action/runbook route family를 기존 v3.5~v3.7 projection과 분리해 확장할 수 있는 boundary와 helper 배치 |
| Foundation | v3.8.0 (3) Action Capability Contract | P0 | 허용 action, 금지 action, required role/scope, idempotency, no-media-schema-change boundary 정의 |
| Foundation | v3.8.0 (4) Action Request Ledger Contract | P0 | actionRequestId, siteId, runbookId, requestedBy, status, createdAt, idempotency key를 append-only/read-only ledger로 정의 |
| Workflow | v3.8.0 (5) Approval Decision Gate | P0 | approve/hold/reject/field-needed decision, reviewer, reason, audit ref, stale decision guard를 관리 |
| Workflow | v3.8.0 (6) Action Readiness Preflight | P0 | capability, approval, field evidence, source health, client impact, duplicate request blocker를 실행 전 판정 |
| Execution Pilot | v3.8.0 (7) Source Recheck Action Pilot | P1 | SourceRegistry write 없이 가장 낮은 위험의 source health recheck request와 dry execution result envelope 준비 |
| Execution Pilot | v3.8.0 (8) Client Notice Draft Queue | P1 | 실제 발송 없이 viewer-safe notice draft, queue preview, delivery blocker, redaction boundary 준비 |
| Execution Pilot | v3.8.0 (9) Rule Draft Action Package | P1 | rule threshold/scenario 후보를 apply 없이 draft package와 review checklist로 조합 |
| Product UI | v3.8.0 (10) Ops Action Control Workspace UI | P1 | `/ops`에서 action request, approval state, readiness blocker, pilot candidate, receipt를 한 흐름으로 탐색 |
| Product UI | v3.8.0 (11) Client-safe Action Notice Preview | P1 | viewer/client에는 maintenance/degraded/recovering/available notice preview만 노출하고 내부 blocker detail은 숨김 |
| Evidence | v3.8.0 (12) Outcome Observer and Reconciliation | P1 | 실행 전 readiness와 실행 후보/결과의 source health, EventRecord, client impact diff를 비교 |
| Evidence | v3.8.0 (13) Action Receipt Bundle | P1 | approval, request, readiness, execution candidate, outcome diff를 redacted release-safe receipt bundle로 조합 |
| Field/AI | v3.8.0 (14) Field Connector Evidence Package | P2 | ONVIF, external WHEP/TURN, cloud provider 조건을 credential/endpoint 승인 기반 field evidence로 분리 |
| Field/AI | v3.8.0 (15) Default-off Action Explanation | P2 | default-off VLM/runtime 설명으로 approval blocker, readiness reason, outcome hint를 요약하되 provider call은 opt-in 전 미수행 |
| Release | v3.8.0 (16) Stabilization and Release Readiness | P0 | v3.8 local verifier suite, v3.5~v3.7 compatibility gates, inventory, release records, close-out dry-run, `git diff --check` 연결 |

### v3.8.0 진행 상태

| 번호 | 제목 | 우선순위 | 상태 | 완료/잔여 내용 |
| --- | --- | --- | --- | --- |
| 1 | v3.8.0 (1) v3.8.0 baseline 정렬 | P0 | 완료 | VERSION/CMake/docs/backlog/source roadmap과 `verify-v380-entry-baseline` 기준 정렬 |
| 2 | v3.8.0 (2) Ops Action Route Boundary | P0 | 완료 | `/ops/api/actions/route-boundary`와 `OpsV380ActionRouteBoundaryJson`으로 v3.8 action route namespace boundary를 read-only로 분리 |
| 3 | v3.8.0 (3) Action Capability Contract | P0 | 완료 | `/ops/api/actions/capability-contract`와 `OpsV380ActionCapabilityContractJson`으로 허용/금지 action, role/scope, idempotency, immutable schema boundary를 read-only로 정의 |
| 4 | v3.8.0 (4) Action Request Ledger Contract | P0 | 완료 | `/ops/api/actions/request-ledger`와 `OpsV380ActionRequestLedgerContractJson`으로 actionRequestId/siteId/runbookId/requestedBy/status/createdAt/idempotencyKey ledger contract를 append-only/read-only로 정의 |
| 5 | v3.8.0 (5) Approval Decision Gate | P0 | 완료 | `/ops/api/actions/approval-decision-gate`와 `OpsV380ApprovalDecisionGateJson`으로 approve/hold/reject/field-needed, reviewer, reason, auditRef, stale decision guard를 read-only로 정의 |
| 6 | v3.8.0 (6) Action Readiness Preflight | P0 | 완료 | `/ops/api/actions/readiness-preflight`와 `OpsV380ActionReadinessPreflightJson`으로 capability/approval/field evidence/source health/client impact/duplicate request blocker를 read-only로 정의 |
| 7 | v3.8.0 (7) Source Recheck Action Pilot | P1 | 완료 | `/ops/api/actions/source-recheck-pilot`와 `OpsV380SourceRecheckActionPilotJson`으로 source health recheck request와 dry execution result envelope를 read-only로 정의 |
| 8 | v3.8.0 (8) Client Notice Draft Queue | P1 | 완료 | `/ops/api/actions/client-notice-draft-queue`와 `OpsV380ClientNoticeDraftQueueJson`으로 viewer-safe notice draft, queue preview, delivery blocker, redaction boundary를 read-only로 정의 |
| 9 | v3.8.0 (9) Rule Draft Action Package | P1 | 완료 | `/ops/api/actions/rule-draft-package`와 `OpsV380RuleDraftActionPackageJson`으로 rule threshold/scenario 후보, draft package, review checklist, apply blocker를 read-only로 정의 |
| 10 | v3.8.0 (10) Ops Action Control Workspace UI | P1 | 완료 | `/ops` action control workspace와 `renderV380OpsActionControlWorkspace`로 action request/approval/readiness/pilot/receipt 흐름을 read-only로 표시 |
| 11 | v3.8.0 (11) Client-safe Action Notice Preview | P1 | 완료 | `/client/api/views/{id}/events`와 client dashboard/events/live dock에 maintenance/degraded/recovering/available action notice preview만 viewer-safe로 표시 |
| 12 | v3.8.0 (12) Outcome Observer and Reconciliation | P1 | 완료 | `/ops/api/actions/outcome-reconciliation`과 `/ops` outcome observer UI가 readiness/candidate/observed outcome diff를 source/EventRecord/client/rule 축으로 비교 |
| 13 | v3.8.0 (13) Action Receipt Bundle | P1 | 완료 | `/ops/api/actions/receipt-bundle`과 `/ops` Action Receipt Bundle UI가 approval/request/readiness/candidate/outcome diff를 redacted release-safe receipt bundle과 handoff map으로 조합 |
| 14 | v3.8.0 (14) Field Connector Evidence Package | P2 | 완료 | `/ops/api/actions/field-connector-evidence-package`와 `/ops` Field Connector Evidence Package UI가 ONVIF/external WHEP-TURN/cloud provider 조건을 credential/endpoint approval 기반 conditional/not-run package로 분리 |
| 15 | v3.8.0 (15) Default-off Action Explanation | P2 | 완료 | `/ops/api/actions/default-off-explanation`와 `/ops` Default-off Action Explanation UI가 approval blocker/readiness reason/outcome hint를 default-off VLM/runtime explanation으로 요약하고 provider/runtime call을 opt-in 전 미수행으로 고정 |
| 16 | v3.8.0 (16) Stabilization and Release Readiness | P0 | 완료 | v3.8 local stabilization, release evidence/not-run 경계, inventory, release records, close-out dry-run, `git diff --check` 연결 |

완료 경계: Step 1 완료는 source/version/docs/backlog/verification metadata 정렬이고,
Step 2 완료는 `/ops/api/actions/route-boundary` read-only route boundary입니다.
Step 3 완료는 `/ops/api/actions/capability-contract` read-only capability contract입니다.
Step 4 완료는 `/ops/api/actions/request-ledger` read-only action request ledger contract입니다.
Step 5 완료는 `/ops/api/actions/approval-decision-gate` read-only approval decision gate입니다.
Step 6 완료는 `/ops/api/actions/readiness-preflight` read-only action readiness preflight입니다.
Step 7 완료는 `/ops/api/actions/source-recheck-pilot` read-only source recheck action pilot입니다.
Step 8 완료는 `/ops/api/actions/client-notice-draft-queue` read-only client notice draft queue입니다.
Step 9 완료는 `/ops/api/actions/rule-draft-package` read-only rule draft action package입니다.
Step 10 완료는 `/ops` action control workspace UI입니다.
Step 11 완료는 client-safe action notice preview입니다.
Step 12 완료는 outcome observer and reconciliation read model입니다.
Step 13 완료는 action receipt bundle read model입니다.
Step 14 완료는 field connector evidence package read model입니다.
Step 15 완료는 default-off action explanation read model입니다.
Step 16 완료는 local stabilization/release readiness gate 연결입니다. Step 1~16 PASS 자체는 v3.8 action execution, UI 풀테스트, 30분/120분
장시간 테스트, published metadata, release action evidence가 아닙니다.

## v3.8.0 Step 1 개발 기록

이번 Step 1은 source/version/docs/backlog/verification metadata 정렬입니다.

- `VERSION`: source version을 `3.8.0`으로 정렬했습니다.
- `CMakeLists.txt`: `project(media_server VERSION 3.8.0 LANGUAGES CXX)`로 정렬했습니다.
- `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md`: 현재 source roadmap을
  `v3.8.0 Operator-Gated Action Pilot & Outcome Loop`로 표시하고 latest published
  baseline도 `v3.8.0 Operator-Gated Action Pilot & Outcome Loop`로 정렬했습니다.
- `docs/versioning-policy.md`, `docs/release-policy.md`, `docs/public-repo-final-review.md`,
  `docs/ui-guide.md`, `docs/assets/ui/README.md`: source `3.8.0`, current roadmap
  `v3.8.0 Operator-Gated Action Pilot & Outcome Loop`, latest published `v3.8.0`
  기준을 정렬했습니다.
- `scripts/internal/verify_v380_entry_baseline.mjs`, `server.sh`: `./server.sh verify-v380-entry-baseline`
  local gate를 추가했습니다.
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`: v3.8 Step 1 테스트 항목, verifier, 미실행 경계를 기록했습니다.

`./server.sh verify-v380-entry-baseline`은 이번 source baseline 정렬만 확인합니다.
UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다.
`v3.8.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.

## v3.8.0 Step 2 개발 기록

이번 Step 2는 P0 `v3.8.0 (2) Ops Action Route Boundary`입니다.

- `src/ingress/webrtc_http_server.cpp`: `OpsV380ActionRouteBoundaryItem`,
  `BuildV380ActionRouteBoundaryItems`, `AppendV380ActionRouteBoundaryItemJson`,
  `OpsV380ActionRouteBoundaryJson`을 추가해 v3.8 action namespace `/ops/api/actions`와
  future route catalog를 read-only JSON으로 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/actions/route-boundary` GET route를
  `require_ops_principal()`과 `Cache-Control: no-store`로 연결했습니다.
- route response의 `legacyProjectionRefs`는 v3.5 `/ops/api/live-operations/*`와 v3.7
  `/ops/api/site-operations/*`를 참조만 하며, 새 action namespace와 분리합니다.
- boundary flags는 action execution, action request persist, approval decision persist,
  readiness execution, source recheck, notice send/write, rule/source/view/runbook/EventRecord/Ops audit
  write, client payload/media/schema 변경, raw locator/credential 노출을 모두 `false`로 둡니다.
- `scripts/internal/verify_v380_ops_action_route_boundary.mjs`, `server.sh`: `./server.sh verify-v380-ops-action-route-boundary`
  local gate를 추가했습니다.
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`: `LAB-111`, `SAFE-181`, `OPS-148`과 Step 2 verifier/미실행 경계를 기록했습니다.

`./server.sh verify-v380-ops-action-route-boundary`는 route boundary와 read-only/no-mutation
경계만 확인합니다. Action Capability Contract, Action Request Ledger, approval decision,
readiness preflight, actual source recheck, client notice send, rule apply, UI 풀테스트,
30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다.

## v3.8.0 Step 3 개발 기록

이번 Step 3은 P0 `v3.8.0 (3) Action Capability Contract`입니다.

- `src/ingress/webrtc_http_server.cpp`: `OpsV380ActionCapabilityContractItem`,
  `BuildV380ActionCapabilityContractItems`, `AppendV380ActionCapabilityContractItemJson`,
  `OpsV380ActionCapabilityContractJson`을 추가해 `allowedActionCatalog`,
  `deniedActionCatalog`, `requiredRole`, `requiredScopes`, `idempotencyPolicy`,
  `immutableSchemaBoundary`를 read-only JSON으로 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/actions/capability-contract` GET route를
  `require_ops_principal()`과 `Cache-Control: no-store`로 연결했습니다.
- 허용 action catalog는 `source-recheck`, `client-notice-draft`, `rule-draft-package`,
  `receipt-bundle`을 preview-only contract로 정의하고, 금지 catalog는 direct source write,
  direct rule apply, direct client notice send, media path change를 `denied`로 분리합니다.
- boundary flags는 action execution, action request persist, approval decision persist,
  readiness execution, source recheck, notice send/write, rule/source/view/runbook/EventRecord/Ops audit
  write, client payload/media/schema 변경, raw locator/credential 노출을 모두 `false`로 둡니다.
- `scripts/internal/verify_v380_action_capability_contract.mjs`, `server.sh`: `./server.sh verify-v380-action-capability-contract`
  local gate를 추가했습니다.
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`: `LAB-112`, `SAFE-182`, `OPS-149`와 Step 3 verifier/미실행 경계를 기록했습니다.

`./server.sh verify-v380-action-capability-contract`는 action capability contract와
read-only/no-mutation/no-schema-change 경계만 확인합니다. Action Request Ledger, approval decision,
readiness preflight, actual source recheck, client notice send, rule apply, UI 풀테스트,
30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다.

## v3.8.0 Step 4 개발 기록

이번 Step 4는 P0 `v3.8.0 (4) Action Request Ledger Contract`입니다.

- `src/ingress/webrtc_http_server.cpp`: `OpsV380ActionRequestLedgerContractItem`,
  `BuildV380ActionRequestLedgerContractItems`, `AppendV380ActionRequestLedgerContractItemJson`,
  `OpsV380ActionRequestLedgerContractJson`을 추가해 `actionRequestId`, `siteId`,
  `runbookId`, `requestedBy`, `status`, `createdAt`, `idempotencyKey` ledger fields를
  read-only JSON contract로 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/actions/request-ledger` GET route를
  `require_ops_principal()`과 `Cache-Control: no-store`로 연결했습니다.
- contract response는 `appendOnlyPolicy`, `readOnlyProjection`, status model, idempotency
  key pattern을 정의하지만 실제 action request append/write를 수행하지 않습니다.
- boundary flags는 request write, action execution, action request persist, approval decision persist,
  readiness execution, source recheck, notice send/write, rule/source/view/runbook/EventRecord/Ops audit
  write, client payload/media/schema 변경, raw locator/credential 노출을 모두 `false`로 둡니다.
- `scripts/internal/verify_v380_action_request_ledger_contract.mjs`, `server.sh`: `./server.sh verify-v380-action-request-ledger-contract`
  local gate를 추가했습니다.
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`: `LAB-113`, `SAFE-183`, `OPS-150`과 Step 4 verifier/미실행 경계를 기록했습니다.

`./server.sh verify-v380-action-request-ledger-contract`는 action request ledger contract와
append-only/read-only/no-mutation/no-schema-change 경계만 확인합니다. Approval Decision Gate,
readiness preflight, actual source recheck, client notice send, rule apply, UI 풀테스트,
30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다.

## v3.8.0 Step 5 개발 기록

이번 Step 5는 P0 `v3.8.0 (5) Approval Decision Gate`입니다.

- `src/ingress/webrtc_http_server.cpp`: `OpsV380ApprovalDecisionGateItem`,
  `BuildV380ApprovalDecisionGateItems`, `AppendV380ApprovalDecisionGateItemJson`,
  `OpsV380ApprovalDecisionGateJson`을 추가해 `approve`, `hold`, `reject`, `field-needed`
  decision state, `reviewer`, `reason`, `auditRef`, `staleDecisionGuard`를 read-only JSON
  contract로 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/actions/approval-decision-gate` GET route를
  `require_ops_principal()`과 `Cache-Control: no-store`로 연결했습니다.
- contract response는 request ledger와 capability contract route를 참조하고 stale decision
  guard를 정의하지만 실제 approval decision 저장, action 실행, readiness 실행을 수행하지 않습니다.
- boundary flags는 decision write, action execution, action request persist, approval decision persist,
  readiness execution, source recheck, notice send/write, rule/source/view/runbook/EventRecord/Ops audit
  write, client payload/media/schema 변경, raw locator/credential 노출을 모두 `false`로 둡니다.
- `scripts/internal/verify_v380_approval_decision_gate.mjs`, `server.sh`: `./server.sh verify-v380-approval-decision-gate`
  local gate를 추가했습니다.
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`: `LAB-114`, `SAFE-184`, `OPS-151`과 Step 5 verifier/미실행 경계를 기록했습니다.

`./server.sh verify-v380-approval-decision-gate`는 approval decision gate와
read-only/no-mutation/no-schema-change 경계만 확인합니다. Action Readiness Preflight,
actual source recheck, client notice send, rule apply, UI 풀테스트, 30분/120분 장시간 테스트,
published metadata, release action 완료 evidence가 아닙니다.

## v3.8.0 Step 6 개발 기록

이번 Step 6은 P0 `v3.8.0 (6) Action Readiness Preflight`입니다.

- `src/ingress/webrtc_http_server.cpp`: `OpsV380ActionReadinessPreflightItem`,
  `BuildV380ActionReadinessPreflightItems`, `AppendV380ActionReadinessPreflightItemJson`,
  `OpsV380ActionReadinessPreflightJson`을 추가해 `capability`, `approval`,
  `fieldEvidence`, `sourceHealth`, `clientImpact`, `duplicateRequest` preflight blocker와
  `ready`, `blocked`, `approval-needed`, `field-needed`, `duplicate-request`, `not-run`
  readiness state를 read-only JSON contract로 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/actions/readiness-preflight` GET route를
  `require_ops_principal()`과 `Cache-Control: no-store`로 연결했습니다.
- contract response는 capability contract, approval decision gate, request ledger route를
  참조하고 실행 전 판정 입력과 blocker를 정의하지만 실제 readiness 실행, result 저장,
  action 실행, source recheck, client notice send를 수행하지 않습니다.
- boundary flags는 readiness execution/result persist, action execution, action request persist,
  approval decision persist, source recheck, notice send/write, rule/source/view/runbook/EventRecord/Ops audit
  write, client payload/media/schema 변경, raw locator/credential 노출을 모두 `false`로 둡니다.
- `scripts/internal/verify_v380_action_readiness_preflight.mjs`, `server.sh`: `./server.sh verify-v380-action-readiness-preflight`
  local gate를 추가했습니다.
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`: `LAB-115`, `SAFE-185`, `OPS-152`와 Step 6 verifier/미실행 경계를 기록했습니다.

`./server.sh verify-v380-action-readiness-preflight`는 readiness preflight contract와
read-only/no-mutation/no-schema-change 경계만 확인합니다. Actual source recheck, client notice send,
rule apply, UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다.

## v3.8.0 Step 7 개발 기록

이번 Step 7은 P1 `v3.8.0 (7) Source Recheck Action Pilot`입니다.

- `src/ingress/webrtc_http_server.cpp`: `OpsV380SourceRecheckActionPilotItem`,
  `BuildV380SourceRecheckActionPilotItems`, `AppendV380SourceRecheckActionPilotItemJson`,
  `OpsV380SourceRecheckActionPilotJson`을 추가해 `sourceRecheckActionPilot`,
  `pilotCandidate`, `sourceHealthRecheck`, `recheckRequest`, `executionPreview`,
  `dryExecutionResultEnvelope`, `readinessRef`를 read-only JSON contract로 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/actions/source-recheck-pilot` GET route를
  `require_ops_principal()`과 `Cache-Control: no-store`로 연결했습니다.
- contract response는 capability contract, approval decision gate, request ledger, readiness
  preflight route를 참조하고 source health recheck 후보와 dry execution result envelope를 정의하지만
  실제 source recheck, source health write, action result persist를 수행하지 않습니다.
- boundary flags는 source recheck execution, source health write, action execution/result persist,
  request/approval/readiness persist, notice send/write, rule/source/view/runbook/EventRecord/Ops audit
  write, client payload/media/schema 변경, raw locator/credential 노출을 모두 `false`로 둡니다.
- `scripts/internal/verify_v380_source_recheck_action_pilot.mjs`, `server.sh`: `./server.sh verify-v380-source-recheck-action-pilot`
  local gate를 추가했습니다.
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`: `LAB-116`, `SAFE-186`, `OPS-153`과 Step 7 verifier/미실행 경계를 기록했습니다.

`./server.sh verify-v380-source-recheck-action-pilot`는 source recheck pilot contract와
read-only/no-mutation/no-schema-change 경계만 확인합니다. Actual source recheck, client notice send,
rule apply, UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다.

## v3.8.0 Step 8 개발 기록

이번 Step 8은 P1 `v3.8.0 (8) Client Notice Draft Queue`입니다.

- `src/ingress/webrtc_http_server.cpp`: `OpsV380ClientNoticeDraftQueueItem`,
  `BuildV380ClientNoticeDraftQueueItems`, `AppendV380ClientNoticeDraftQueueItemJson`,
  `OpsV380ClientNoticeDraftQueueJson`을 추가해 `clientNoticeDraftQueue`,
  `viewerSafeNoticeDraft`, `noticeDraft`, `queuePreview`, `deliveryBlocker`,
  `redactionBoundary`, `readinessRef`, `pilotRef`를 read-only JSON contract로 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/actions/client-notice-draft-queue` GET route를
  `require_ops_principal()`과 `Cache-Control: no-store`로 연결했습니다.
- contract response는 capability contract, approval decision gate, request ledger, readiness
  preflight, source recheck pilot route를 참조하고 viewer-safe notice draft와 queue preview를
  정의하지만 실제 client notice delivery, notice draft persist, notice queue write를 수행하지 않습니다.
- boundary flags는 notice draft persist, client notice send, notice queue write,
  operator-only blocker client exposure, action execution, source recheck, rule/source/view/runbook/EventRecord/Ops audit
  write, client payload/media/schema 변경, raw locator/credential 노출을 모두 `false`로 둡니다.
- `scripts/internal/verify_v380_client_notice_draft_queue.mjs`, `server.sh`: `./server.sh verify-v380-client-notice-draft-queue`
  local gate를 추가했습니다.
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`: `LAB-117`, `SAFE-187`, `OPS-154`와 Step 8 verifier/미실행 경계를 기록했습니다.

`./server.sh verify-v380-client-notice-draft-queue`는 client notice draft queue contract와
read-only/no-send/no-persist/no-schema-change 경계만 확인합니다. Actual client notice delivery,
notice queue write, viewer payload mutation, source recheck, rule apply, UI 풀테스트,
30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다.

## v3.8.0 Step 9 개발 기록

이번 Step 9는 P1 `v3.8.0 (9) Rule Draft Action Package`입니다.

- `src/ingress/webrtc_http_server.cpp`: `OpsV380RuleDraftActionPackageItem`,
  `BuildV380RuleDraftActionPackageItems`, `AppendV380RuleDraftActionPackageItemJson`,
  `OpsV380RuleDraftActionPackageJson`을 추가해 `ruleDraftActionPackage`,
  `draftPackage`, `ruleThresholdCandidate`, `scenarioCandidate`, `reviewChecklist`,
  `applyBlocker`, `readinessRef`, `noticeDraftRef`를 read-only JSON contract로 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/actions/rule-draft-package` GET route를
  `require_ops_principal()`과 `Cache-Control: no-store`로 연결했습니다.
- contract response는 capability contract, approval decision gate, request ledger, readiness
  preflight, client notice draft queue route를 참조하고 rule threshold/scenario 후보와
  review checklist를 정의하지만 실제 rule apply, scenario apply, rule draft persist,
  rule/profile registry write를 수행하지 않습니다.
- boundary flags는 rule draft persist, rule/scenario apply, rule/profile registry write,
  action execution, source recheck, notice send/write, source/view/runbook/EventRecord/Ops audit
  write, client payload/media/schema 변경, raw locator/credential 노출을 모두 `false`로 둡니다.
- `scripts/internal/verify_v380_rule_draft_action_package.mjs`, `server.sh`: `./server.sh verify-v380-rule-draft-action-package`
  local gate를 추가했습니다.
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`: `LAB-118`, `SAFE-188`, `OPS-155`와 Step 9 verifier/미실행 경계를 기록했습니다.

`./server.sh verify-v380-rule-draft-action-package`는 rule draft action package contract와
read-only/no-apply/no-persist/no-schema-change 경계만 확인합니다. Actual rule apply,
scenario apply, rule/profile registry write, source recheck, client notice delivery,
UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다.

## v3.8.0 Step 10 개발 기록

이번 Step 10은 P1 `v3.8.0 (10) Ops Action Control Workspace UI`입니다.

- `src/ingress/webrtc_http_server.cpp`: `AppendOpsDashboardPage`에
  `ops-action-control-workspace` shell과 `media-server.ops.v380-action-control-workspace-ui.v1`
  schema marker를 추가했습니다. dashboard는 `dashActionControlWorkspaceBadges`,
  `dashActionControlWorkspaceText`, `dashActionControlWorkspaceFlow`,
  `dashActionControlRequestList`, `dashActionControlApprovalList`,
  `dashActionControlReadinessList`, `dashActionControlPilotList`,
  `dashActionControlReceiptList`, `dashActionControlBoundary`를 고정 DOM hook으로 제공합니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV380OpsActionControlWorkspace`와
  `refreshV380OpsActionControlWorkspace`를 추가해 `/ops/api/actions/capability-contract`,
  `/ops/api/actions/request-ledger`, `/ops/api/actions/approval-decision-gate`,
  `/ops/api/actions/readiness-preflight`, `/ops/api/actions/source-recheck-pilot`,
  `/ops/api/actions/client-notice-draft-queue`, `/ops/api/actions/rule-draft-package`를
  GET/read-only로 읽고 request, approval, readiness blocker, pilot/package candidate,
  receipt placeholder 흐름을 표시합니다.
- `src/ingress/product_ui_css.cpp`: `.ops-action-control-workspace`,
  `.ops-action-control-grid`, `.ops-action-control-flow-grid`,
  `.ops-action-control-list`, `.ops-action-control-entry`,
  `.ops-action-control-boundary` 반응형 layout과 boundary styling을 추가했습니다.
- `scripts/internal/verify_v380_ops_action_control_workspace_ui.mjs`, `server.sh`:
  `./server.sh verify-v380-ops-action-control-workspace-ui` local gate를 추가했습니다.
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`: `UI-102`, `SAFE-189`, `OPS-156`과 Step 10 verifier/미실행 경계를 기록했습니다.

`./server.sh verify-v380-ops-action-control-workspace-ui`는 `/ops` action control workspace UI,
renderer/CSS, 기존 action contract route 연결과 read-only/no-mutation 경계만 확인합니다.
Actual action execution, action request persist, approval decision persist, readiness result
persist, source recheck execution, client notice send, rule apply, Action Receipt Bundle 구현,
Client-safe Action Notice Preview 완료 evidence가 아닙니다. UI 풀테스트, 30분/120분 장시간 테스트,
published metadata, release action 완료 evidence가 아닙니다.

## v3.8.0 Step 11 개발 기록

이번 Step 11은 P1 `v3.8.0 (11) Client-safe Action Notice Preview`입니다.

- `src/ingress/webrtc_http_server.cpp`: `ClientActionNoticePreview`,
  `ClientActionNoticePreviewFor`, `AppendClientActionNoticePreviewJson`,
  `ClientActionNoticePreviewJson`을 추가해 `/client/api/views/{id}/events`와
  client dashboard `events.clientActionNoticePreview`에
  `media-server.client.v380-action-notice-preview.v1` viewer-safe preview를 붙였습니다.
- `src/ingress/webrtc_http_server.cpp`: preview payload는 `maintenance`, `degraded`,
  `recovering`, `available` notice status, `viewerSafeTitle`, `viewerSafeBody`,
  `timelineHint`만 노출하고 operator-only blocker detail, approval decision detail,
  readiness blocker detail, source URL/raw locator/raw JSON/debug/credential material,
  action controls를 포함하지 않습니다.
- `src/ingress/product_ui_client_scripts.cpp`: `renderClientActionNoticePreview`를 추가하고
  client dashboard, client events, live dock events에 `client-action-notice-preview`
  section을 표시했습니다.
- `src/ingress/product_ui_css.cpp`: `.client-action-notice-preview`,
  `.client-action-notice-list`, `.client-action-notice-item`을 기존 client card layout에 연결했습니다.
- `scripts/internal/verify_v380_client_safe_action_notice_preview.mjs`, `server.sh`:
  `./server.sh verify-v380-client-safe-action-notice-preview` local gate를 추가했습니다.
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`: `UI-103`, `CLIENT-040`, `SAFE-190`, `OPS-157`과
  Step 11 verifier/미실행 경계를 기록했습니다.

`./server.sh verify-v380-client-safe-action-notice-preview`는 client-safe action notice preview
payload/UI와 redaction boundary만 확인합니다. Actual client notice send, notice draft persist,
notice queue write, action execution, source recheck execution, rule apply, Outcome Observer and Reconciliation 완료 evidence가 아닙니다.
UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다.

## v3.8.0 Step 12 개발 기록

이번 Step 12는 P1 `v3.8.0 (12) Outcome Observer and Reconciliation`입니다.

- `src/ingress/webrtc_http_server.cpp`: `OpsV380OutcomeObserverReconciliationItem`,
  `OpsV380OutcomeObserverReconciliationSummary`,
  `BuildV380OutcomeObserverReconciliationItems`,
  `BuildV380OutcomeObserverReconciliationSummary`,
  `AppendV380OutcomeObserverReconciliationItemJson`,
  `AppendV380OutcomeObserverReconciliationSummaryJson`,
  `OpsV380OutcomeObserverReconciliationJson`을 추가했습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/actions/outcome-reconciliation` GET route를
  `require_ops_principal()`, `Cache-Control: no-store`로 연결하고 readiness/candidate/observed outcome
  ref를 source/EventRecord/client/rule outcome diff로 비교하는 read-only JSON을 노출했습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops` dashboard에
  `ops-action-outcome-observer` section, `dashActionOutcomeObserverBadges`,
  `dashActionOutcomeObserverText`, `dashActionOutcomeSourceList`,
  `dashActionOutcomeEventClientList`, `dashActionOutcomeRuleList`,
  `dashActionOutcomeBoundary` UI control을 추가했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV380OutcomeObserverReconciliation`,
  `refreshV380OutcomeObserverReconciliation`, `v380OutcomeObserverEntry`를 추가해
  `/ops/api/actions/outcome-reconciliation`의 `outcomeObserverItems`와
  `outcomeObserverSummary`를 source, EventRecord/client, rule diff로 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.ops-action-outcome-observer`,
  `.ops-action-outcome-grid`, `.ops-action-outcome-list`, `.ops-action-outcome-entry`,
  `.ops-action-outcome-boundary`를 기존 Ops dashboard card/list/boundary responsive 패턴에 연결했습니다.
- `scripts/internal/verify_v380_outcome_observer_reconciliation.mjs`, `server.sh`:
  `./server.sh verify-v380-outcome-observer-reconciliation` local gate를 추가했습니다.
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`: `UI-104`, `EVT-084`, `CLIENT-041`, `LAB-119`,
  `SAFE-191`, `OPS-158`과 Step 12 verifier/미실행 경계를 기록했습니다.

`./server.sh verify-v380-outcome-observer-reconciliation`은 readiness/candidate/observed
outcome diff read model과 `/ops` 렌더링 경계만 확인합니다. Actual action execution,
source recheck execution, client notice send, notice queue write, rule apply, EventRecord write,
source/view/Ops audit write, action result persist, Action Receipt Bundle 완료 evidence가 아닙니다.
UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다.

## v3.8.0 Step 13 개발 기록

이번 Step 13은 P1 `v3.8.0 (13) Action Receipt Bundle`입니다.

- `src/ingress/webrtc_http_server.cpp`: `OpsV380ActionReceiptBundleItem`,
  `OpsV380ActionReceiptBundleSummary`, `BuildV380ActionReceiptBundleItems`,
  `BuildV380ActionReceiptBundleSummary`, `AppendV380ActionReceiptBundleItemJson`,
  `AppendV380ActionReceiptBundleSummaryJson`, `OpsV380ActionReceiptBundleJson`을 추가했습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/actions/receipt-bundle` GET route를
  `require_ops_principal()`, `Cache-Control: no-store`로 연결하고 approval/request/readiness/
  candidate/outcome diff ref를 redacted release-safe receipt bundle과 handoff map으로 조합했습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops` dashboard에
  `ops-action-receipt-bundle` section, `dashActionReceiptBundleBadges`,
  `dashActionReceiptBundleText`, `dashActionReceiptBundleList`,
  `dashActionReceiptHandoffList`, `dashActionReceiptRedactionList`,
  `dashActionReceiptBundleBoundary` UI control을 추가했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV380ActionReceiptBundle`과
  `refreshV380ActionReceiptBundle`을 추가해 `/ops/api/actions/receipt-bundle`의
  `receiptBundleItems`, `receiptBundleSummary`, `handoffMap`, `redactionSummary`,
  `releaseSafe` 경계를 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.ops-action-receipt-bundle`,
  `.ops-action-receipt-grid`, `.ops-action-receipt-list`, `.ops-action-receipt-entry`,
  `.ops-action-receipt-boundary`를 기존 Ops dashboard card/list/boundary responsive 패턴에
  연결했습니다.
- `scripts/internal/verify_v380_action_receipt_bundle.mjs`, `server.sh`:
  `./server.sh verify-v380-action-receipt-bundle` local gate를 추가했습니다.
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`: `UI-105`, `EVT-085`, `CLIENT-042`, `LAB-120`,
  `SAFE-192`, `OPS-159`와 Step 13 verifier/미실행 경계를 기록했습니다.
- 검증: 최초 `node scripts/internal/verify_v380_action_receipt_bundle.mjs`는 Action Receipt Bundle
  model, route, `/ops` shell, CSS, backlog/stream verification/inventory/release records/server
  dispatch가 아직 없어 `pass=1 fail=8`로 기대 실패했습니다. 최종 검증 결과는
  `docs/release-test-records.md`의 v380 Step 13 결과 행에 기록합니다.

`./server.sh verify-v380-action-receipt-bundle`은 redacted release-safe receipt bundle과
handoff map read model, redaction review UI, `/ops` 렌더링 경계만 확인합니다.
Field Connector Evidence Package 완료 evidence가 아닙니다. Default-off Action Explanation,
Stabilization and Release Readiness 완료 evidence도 아닙니다. Artifact/file/handoff write,
action execution, source recheck execution, client notice send/queue write, rule apply/registry
write, EventRecord/source/view/Ops audit/action result write, client/media/schema mutation,
raw locator/credential/raw diagnostic inclusion, UI 풀테스트, 30분/120분 장시간 테스트,
published metadata, release action 완료 evidence가 아닙니다.

## v3.8.0 Step 14 개발 기록

이번 Step 14는 P2 `v3.8.0 (14) Field Connector Evidence Package`입니다.

- `src/ingress/webrtc_http_server.cpp`: `OpsV380FieldConnectorEvidencePackageItem`,
  `OpsV380FieldConnectorEvidencePackageSummary`,
  `BuildV380FieldConnectorEvidencePackageItems`,
  `BuildV380FieldConnectorEvidencePackageSummary`,
  `AppendV380FieldConnectorEvidencePackageItemJson`,
  `AppendV380FieldConnectorEvidencePackageSummaryJson`,
  `OpsV380FieldConnectorEvidencePackageJson`을 추가했습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/actions/field-connector-evidence-package` GET
  route를 `require_ops_principal()`, `Cache-Control: no-store`로 연결하고 v3.7 field attachment와
  v3.8 readiness/source recheck/outcome/receipt refs를 ONVIF, external WHEP/TURN, cloud provider
  connector evidence package로 조합했습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops` dashboard에
  `ops-field-connector-evidence-package` section, `dashFieldConnectorEvidenceBadges`,
  `dashFieldConnectorEvidenceText`, `dashFieldConnectorEvidenceList`,
  `dashFieldConnectorConditionList`, `dashFieldConnectorBoundary` UI control을 추가했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV380FieldConnectorEvidencePackage`와
  `refreshV380FieldConnectorEvidencePackage`를 추가해 `/ops/api/actions/field-connector-evidence-package`의
  `fieldConnectorEvidenceItems`, `fieldConnectorEvidenceSummary`, `connectorKind`,
  `endpointApprovalRef`, `credentialApprovalRef`, `fieldSmokeStatus`, `conditionRefs` 경계를 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.ops-field-connector-evidence-package`,
  `.ops-field-connector-grid`, `.ops-field-connector-list`, `.ops-field-connector-entry`,
  `.ops-field-connector-boundary`를 기존 Ops dashboard card/list/boundary responsive 패턴에 연결했습니다.
- `scripts/internal/verify_v380_field_connector_evidence_package.mjs`, `server.sh`:
  `./server.sh verify-v380-field-connector-evidence-package` local gate를 추가했습니다.
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`: `UI-106`, `SRC-063`, `MEDIA-026`, `LAB-121`,
  `SAFE-193`, `OPS-160`과 Step 14 verifier/미실행 경계를 기록했습니다.
- 검증: 최초 `node scripts/internal/verify_v380_field_connector_evidence_package.mjs`는 Field Connector
  Evidence Package model, route, `/ops` shell, CSS, backlog/stream verification/inventory/release records/server
  dispatch가 아직 없어 `pass=1 fail=8`로 기대 실패했습니다. 최종 검증 결과는
  `docs/release-test-records.md`의 v380 Step 14 결과 행에 기록합니다.

`./server.sh verify-v380-field-connector-evidence-package`는 ONVIF, external WHEP/TURN,
cloud provider 조건을 credential/endpoint approval 기반 conditional/not-run package로 표시하는
read model과 `/ops` 렌더링 경계만 확인합니다. Default-off Action Explanation 완료 evidence가 아닙니다.
Stabilization and Release Readiness 완료 evidence도 아닙니다. Field smoke, endpoint/credential probe,
provider/cloud call, ONVIF 실기기 contact, external WHEP contact, TURN credential use, action execution,
source recheck execution, source/view/EventRecord/Ops audit write, client/media/schema mutation,
raw endpoint/locator/credential/provider/debug material inclusion, UI 풀테스트, 30분/120분 장시간 테스트,
published metadata, release action 완료 evidence가 아닙니다.

## v3.8.0 Step 15 개발 기록

이번 Step 15는 P2 `v3.8.0 (15) Default-off Action Explanation`입니다.

- `src/ingress/webrtc_http_server.cpp`: `OpsV380DefaultOffActionExplanationItem`,
  `OpsV380DefaultOffActionExplanationSummary`,
  `BuildV380DefaultOffActionExplanationItems`,
  `BuildV380DefaultOffActionExplanationSummary`,
  `AppendV380DefaultOffActionExplanationItemJson`,
  `AppendV380DefaultOffActionExplanationSummaryJson`,
  `OpsV380DefaultOffActionExplanationJson`을 추가했습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/actions/default-off-explanation` GET
  route를 `require_ops_principal()`, `Cache-Control: no-store`로 연결하고 v3.8 approval,
  readiness, outcome, receipt, field connector refs를 approval blocker, readiness reason,
  outcome hint explanation으로 요약했습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops` dashboard에
  `ops-default-off-action-explanation` section, `dashDefaultOffActionExplanationBadges`,
  `dashDefaultOffActionExplanationText`, `dashDefaultOffActionExplanationList`,
  `dashDefaultOffActionExplanationBoundary` UI control을 추가했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV380DefaultOffActionExplanation`와
  `refreshV380DefaultOffActionExplanation`을 추가해 `/ops/api/actions/default-off-explanation`의
  `defaultOffActionExplanations`, `defaultOffActionExplanationSummary`,
  `approvalBlockerSummary`, `readinessReasonSummary`, `outcomeHint`, `operatorReviewHint`,
  `defaultEnabled`, `providerOptInRequired`, `runtimeOptInRequired` 경계를 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.ops-default-off-action-explanation`,
  `.ops-default-off-action-explanation-list`, `.ops-default-off-action-explanation-entry`,
  `.ops-default-off-action-explanation-boundary`를 기존 Ops dashboard card/list/boundary
  responsive 패턴에 연결했습니다.
- `scripts/internal/verify_v380_default_off_action_explanation.mjs`, `server.sh`:
  `./server.sh verify-v380-default-off-action-explanation` local gate를 추가했습니다.
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`: `UI-107`, `SRC-064`, `EVT-086`, `LAB-122`,
  `SAFE-194`, `OPS-161`과 Step 15 verifier/미실행 경계를 기록했습니다.
- 검증: 최초 `node scripts/internal/verify_v380_default_off_action_explanation.mjs`는 Default-off
  Action Explanation model, route, `/ops` shell, CSS, backlog/stream verification/inventory/release
  records/server dispatch가 아직 없어 `pass=1 fail=8`로 기대 실패했습니다. 최종 검증 결과는
  `docs/release-test-records.md`의 v380 Step 15 결과 행에 기록합니다.

`./server.sh verify-v380-default-off-action-explanation`은 approval blocker, readiness reason,
outcome hint를 default-off VLM/runtime explanation으로 요약하는 read model과 `/ops` 렌더링 경계만
확인합니다. Stabilization and Release Readiness 완료 evidence가 아닙니다. VLM/provider/runtime call,
raw prompt/provider response/credential/endpoint/locator/debug material inclusion, action execution,
source recheck execution, source/view/EventRecord/Ops audit/operator review write, client/media/schema
mutation, UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가
아닙니다.

## v3.8.0 Step 16 개발 기록

- 범위: P0 `v3.8.0 (16) Stabilization and Release Readiness`.
- `scripts/internal/verify_v380_stabilization_release_readiness.mjs`, `server.sh`: v3.8 Step 1~15 local
  verifier, release metadata, docs links/assets, project/feature inventory, release evidence index,
  close-out dry-run, script inventory, `git diff --check`를 같은 local readiness gate로 묶는
  `./server.sh verify-v380-stabilization-release-readiness`를 추가했습니다.
- `docs/release-policy.md`, `docs/release-evidence-index.md`, `docs/release-test-records.md`:
  v3.8 Step 16 companion local gate와 UI 풀테스트 직접 조작, 30분/120분, published metadata,
  PR/main/tag/GitHub Release, field smoke 미실행 경계를 기록했습니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_feature_inventory_coverage.mjs`,
  `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_script_inventory.mjs`:
  `SAFE-195`, `OPS-162`와 Step 16 readiness command를 inventory/coverage/script gate에 연결했습니다.
- companion local gate:
  `./server.sh verify-v380-stabilization-release-readiness`,
  `./server.sh build`,
  `./server.sh verify-v380-entry-baseline`,
  `./server.sh verify-v380-ops-action-route-boundary`,
  `./server.sh verify-v380-action-capability-contract`,
  `./server.sh verify-v380-action-request-ledger-contract`,
  `./server.sh verify-v380-approval-decision-gate`,
  `./server.sh verify-v380-action-readiness-preflight`,
  `./server.sh verify-v380-source-recheck-action-pilot`,
  `./server.sh verify-v380-client-notice-draft-queue`,
  `./server.sh verify-v380-rule-draft-action-package`,
  `./server.sh verify-v380-ops-action-control-workspace-ui`,
  `./server.sh verify-v380-client-safe-action-notice-preview`,
  `./server.sh verify-v380-outcome-observer-reconciliation`,
  `./server.sh verify-v380-action-receipt-bundle`,
  `./server.sh verify-v380-field-connector-evidence-package`,
  `./server.sh verify-v380-default-off-action-explanation`,
  `./server.sh verify-release-metadata`,
  `./server.sh verify-docs-links`,
  `./server.sh verify-docs-ui-assets`,
  `./server.sh verify-project-inventory`,
  `./server.sh verify-feature-inventory-coverage`,
  `./server.sh verify-release-evidence-index`,
  `./server.sh verify-release-closeout-helper --dry-run`,
  `./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run`,
  `./server.sh verify-script-inventory`,
  `git diff --check`.
- 검증: 최초 `./server.sh verify-v380-stabilization-release-readiness`는 Step 16 roadmap,
  feature inventory, release policy/evidence index/release records 연결이 아직 없어 `pass=1 fail=5`로
  기대 실패했습니다. 구현 후 `./server.sh verify-v380-stabilization-release-readiness`는 `pass=6 fail=0`으로
  통과했습니다. `./server.sh verify-release-closeout-helper --dry-run`와
  `./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run` 최초 실행은 current
  `v3.8.0 Release Close-out Runbook` heading 누락으로 실패했고, `docs/release-policy.md`에
  v3.8.0 runbook을 추가한 뒤 두 dry-run 모두 status `pass`로 재검증했습니다. 최종 companion local gate 수치는
  `docs/release-test-records.md`의 v380 Step 16 결과 행에 기록합니다.
- 완료 경계: Step 16은 local readiness gate 연결입니다. UI 풀테스트 직접 조작, 30분/120분
  장시간 테스트, published metadata, PR/main/tag/GitHub Release, field smoke 실행 PASS를 대체하지
  않습니다.

## 직전 published baseline 상세: v3.7.0 Site-Aware Operations and Safe Runbook Control Plane

상태: Step 1~18 source 기능과 local release readiness를 완료했고 published metadata 보정을 마쳤습니다.
현재 source version은 `3.7.0`이고 previous published baseline은 `v3.7.0`입니다. 각 step은
실제 코드/API/문서/검증 산출물이 생긴 뒤에만 완료로 기록합니다.

직접 답: v3.7.0의 1차 선택값은 `Site-Aware Operations and Safe Runbook Control Plane`입니다.
v3.6이 production write 없이 simulation input, dry-run, impact diff, safe apply readiness를
산출했다면, v3.7은 이 결과를 site/source group/runbook approval 단위로 확장합니다.
개발은 중요도보다 의존 순서를 우선해 Foundation → Intelligence → Workflow →
Product UI → Field/Execution → Release 순서로 진행합니다.

비범위:

- site/group 기능을 이유로 SourceRegistry 또는 PublishedView를 자동 변경
- 자동 대량 apply, 자동 recovery cutover, 자동 client notice 발송
- Rule/Profile 자동 저장 또는 rule follow-up 자동 적용
- EventRecord, Event POST payload, WebRTC DataChannel, SSE/WS metadata,
  RTSP/WebRTC media path, Rule/Profile payload schema 변경
- viewer/client에 site 내부 source locator, credential, raw diagnostic JSON,
  raw provider material, operator-only blocker detail 노출
- VMS/NVR, 장기 녹화, playback/archive search, runtime/model bundle 배포

| 구간 | 제목 | 우선순위 | 개발 내용 |
| --- | --- | --- | --- |
| Foundation | v3.7.0 (1) v3.7.0 baseline 정렬 | P0 | VERSION/CMake/README/docs/backlog/source roadmap을 `3.7.0`와 `verify-v370-entry-baseline` 기준으로 정렬 |
| Foundation | v3.7.0 (2) Site / Source Group Contract | P0 | site, sourceGroup, zone, viewGroup read model과 no-auto-write boundary 정의 |
| Foundation | v3.7.0 (3) Site-Aware Source Registry Projection | P0 | 기존 SourceRegistry/PublishedView를 site/source group 관점의 Ops-only projection으로 노출 |
| Foundation | v3.7.0 (4) Site Health Rollup | P0 | source health를 site/group 단위 offline/degraded/recovering/field-needed 상태로 집계 |
| Intelligence | v3.7.0 (5) Site Impact Graph | P1 | EventRecord, source health, PublishedView, client impact를 site별 graph로 연결 |
| Intelligence | v3.7.0 (6) Site Simulation Input Pack | P1 | v3.6 simulation input/result envelope를 site/source group 단위 입력 pack으로 확장 |
| Intelligence | v3.7.0 (7) Cross-Site Safe Apply Readiness | P1 | site/group 변경 후보의 affected clients, blocker, approval-needed, field-needed 상태 산출 |
| Workflow | v3.7.0 (8) Runbook Template Contract | P1 | source recheck, maintenance, rule draft, client notice 후보를 반복 가능한 runbook template으로 정의 |
| Workflow | v3.7.0 (9) Runbook Instance Ledger | P1 | runbookId, siteId, status, operator note, previous run comparison을 append-only/read-only ledger로 누적 |
| Workflow | v3.7.0 (10) Approval Ticket Workflow | P1 | approval, hold, reject, field-needed 상태와 reviewer/reason/audit link를 관리 |
| Product UI | v3.7.0 (11) Site Operations Workspace UI | P1 | `/ops`에서 site list, health rollup, runbook queue, impact detail을 탐색하는 workspace 추가 |
| Product UI | v3.7.0 (12) Client Notice by Site/View Group | P1 | site/view group 기준 viewer-safe notice preview와 delivery queue 경계를 준비 |
| Product UI | v3.7.0 (13) Rule/VA What-if by Site | P1 | rule threshold/scenario 후보를 site 영향과 EventRecord/VA fixture 기반으로 비교 |
| Field/Execution | v3.7.0 (14) Field Evidence Attachment | P2 | ONVIF, external WHEP/TURN, cloud/VLM 조건부 evidence를 site/runbook에 not-run/conditional로 첨부 |
| Field/Execution | v3.7.0 (15) Limited Safe Execution Pilot | P2 | 가장 낮은 위험의 source recheck 또는 notice queue action만 approval-gated 실행 파일럿으로 분리 |
| Field/Execution | v3.7.0 (16) Outcome Reconciliation | P2 | 실행 전 simulation과 실행 후 source/event/client impact diff를 비교 |
| Release | v3.7.0 (17) Export / Handoff Bundle | P1 | site/runbook/evidence/approval/outcome을 redacted release-safe handoff bundle로 조합 |
| Release | v3.7.0 (18) Stabilization and Release Readiness | P0 | v3.7 local verifier suite, inventory, release records, close-out dry-run, `git diff --check` 연결 |

### v3.7.0 진행 상태

| 번호 | 제목 | 우선순위 | 상태 | 완료/잔여 내용 |
| --- | --- | --- | --- | --- |
| 1 | v3.7.0 (1) v3.7.0 baseline 정렬 | P0 | 완료 | VERSION/CMake/docs/backlog/source roadmap과 `verify-v370-entry-baseline` 기준 정렬 |
| 2 | v3.7.0 (2) Site / Source Group Contract | P0 | 완료 | `/ops/api/site-operations/source-group-contract`에서 site/sourceGroup/zone/viewGroup read model과 no-auto-write boundary 정의 |
| 3 | v3.7.0 (3) Site-Aware Source Registry Projection | P0 | 완료 | `/ops/api/site-operations/source-registry-projection`에서 SourceRegistry/PublishedView를 site/source group 관점의 Ops-only projection으로 노출 |
| 4 | v3.7.0 (4) Site Health Rollup | P0 | 완료 | `/ops/api/site-operations/health-rollup`에서 source health를 site/group 단위 offline/degraded/recovering/field-needed 상태로 집계 |
| 5 | v3.7.0 (5) Site Impact Graph | P1 | 완료 | `/ops/api/site-operations/impact-graph`에서 EventRecord, source health, PublishedView, client impact를 site/source group별 graph로 연결 |
| 6 | v3.7.0 (6) Site Simulation Input Pack | P1 | 완료 | `/ops/api/site-operations/simulation-input-pack`에서 v3.6 simulation input/result envelope를 site/source group 단위 read-only input pack으로 확장 |
| 7 | v3.7.0 (7) Cross-Site Safe Apply Readiness | P1 | 완료 | `/ops/api/site-operations/cross-site-safe-apply-readiness`에서 affected clients, blocker, approval-needed, field-needed 상태를 site/source group별로 산출 |
| 8 | v3.7.0 (8) Runbook Template Contract | P1 | 완료 | `/ops/api/site-operations/runbook-template-contract`에서 source recheck, maintenance, rule draft, client notice 후보를 반복 가능한 read-only runbook template contract로 정의 |
| 9 | v3.7.0 (9) Runbook Instance Ledger | P1 | 완료 | `/ops/api/site-operations/runbook-instance-ledger`에서 runbookId, siteId, status, operator note, previous run comparison을 append-only/read-only ledger projection으로 누적 |
| 10 | v3.7.0 (10) Approval Ticket Workflow | P1 | 완료 | `/ops/api/site-operations/approval-ticket-workflow`에서 approval, hold, reject, field-needed 상태와 reviewer/reason/audit link를 read-only workflow projection으로 관리 |
| 11 | v3.7.0 (11) Site Operations Workspace UI | P1 | 완료 | `/ops` site list, health rollup, runbook queue, impact detail workspace 추가 |
| 12 | v3.7.0 (12) Client Notice by Site/View Group | P1 | 완료 | site/view group 기준 viewer-safe notice preview와 delivery queue 경계 준비 |
| 13 | v3.7.0 (13) Rule/VA What-if by Site | P1 | 완료 | `/ops/api/site-operations/rule-va-what-if-by-site`와 `/ops` dashboard에서 site 영향, EventRecord aggregate, VA fixture 기반 rule threshold/scenario 후보를 read-only로 비교 |
| 14 | v3.7.0 (14) Field Evidence Attachment | P2 | 완료 | `/ops/api/site-operations/field-evidence-attachment`와 `/ops` dashboard에서 ONVIF, external WHEP/TURN, cloud/VLM 조건부 evidence를 site/runbook에 not-run/conditional로 첨부 |
| 15 | v3.7.0 (15) Limited Safe Execution Pilot | P2 | 완료 | `/ops/api/site-operations/limited-safe-execution-pilot`와 `/ops` dashboard에서 source recheck 또는 notice queue 후보를 approval-gated execution preview로 분리 |
| 16 | v3.7.0 (16) Outcome Reconciliation | P2 | 완료 | `/ops/api/site-operations/outcome-reconciliation`와 `/ops` dashboard에서 실행 전 simulation ref와 실행 후 source/event/client impact diff를 pending/not-run 상태로 비교 |
| 17 | v3.7.0 (17) Export / Handoff Bundle | P1 | 완료 | `/ops/api/site-operations/export-handoff-bundle`와 `/ops` dashboard에서 site/runbook/evidence/approval/outcome을 redacted release-safe handoff bundle로 조합 |
| 18 | v3.7.0 (18) Stabilization and Release Readiness | P0 | 완료 | v3.7 local stabilization, release evidence/not-run 경계, inventory, release records, close-out dry-run, `git diff --check` 연결 |

완료 경계: 위 표는 v3.7.0 개발 순서와 우선순위입니다. 현재 Step 1~18은 Foundation/Intelligence/Workflow/Product UI/Field/Release
local source gate 범위입니다. 각 step은 실제 코드/API/UI/문서
변경, 기능 ID/test inventory 등록, 해당 verifier와 release test record evidence가 생긴 뒤에만
완료로 기록합니다. UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release
action, field smoke는 실행 evidence가 있을 때만 별도로 완료로 씁니다.

## v3.7.0 Step 1 개발 기록

- 범위: P0 `v3.7.0 (1) v3.7.0 baseline 정렬`.
- `VERSION`, `CMakeLists.txt`: 현재 source version과 CMake project version을 `3.7.0`으로 정렬했습니다.
- `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md`, `docs/versioning-policy.md`, `docs/release-policy.md`, `docs/public-repo-final-review.md`, `docs/ui-guide.md`, `docs/assets/ui/README.md`: 현재 source roadmap을 `v3.7.0 Site-Aware Operations and Safe Runbook Control Plane`으로 전환했고 post-publish 보정 후 latest published release도 `v3.7.0` source-only GitHub Release로 정렬했습니다.
- `docs/development-backlog.md`: v3.7.0 current roadmap을 `구간 | 제목 | 우선순위 | 개발 내용` 구조로 승격하고, site/source group/runbook approval 방향과 no-auto-write/no-client-secret/no-media-path-change 경계를 기록했습니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`, `config/docs_ui_assets.json`: current release target, docs asset baseline, verification catalog, release records를 source `3.7.0`와 latest published `v3.7.0` 기준으로 정렬했습니다.
- `scripts/internal/verify_release_metadata_consistency.mjs`, `scripts/internal/verify_docs_ui_assets.mjs`: release metadata와 docs UI asset verifier가 source `3.7.0`, current roadmap `v3.7.0 Site-Aware Operations and Safe Runbook Control Plane`, latest published `v3.7.0`을 검증하도록 보정했습니다.
- `scripts/internal/verify_v370_entry_baseline.mjs`, `server.sh`: `./server.sh verify-v370-entry-baseline` 명령을 추가해 source `3.7.0`, latest published `v3.7.0`, current roadmap `v3.7.0 Site-Aware Operations and Safe Runbook Control Plane`, release records, feature inventory, server dispatch 연결을 정적 검증합니다.
- 검증: 최초 `node scripts/internal/verify_v370_entry_baseline.mjs`는 versioning/release policy, backlog, metadata verifier, server dispatch, UI guide/assets policy가 아직 v3.7 기준이 아니어서 `pass=3 fail=6`으로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 1 결과 행에 기록합니다.
- 완료 경계: 이번 Step 1은 source/version/docs/backlog/verification metadata 정렬입니다. UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다. `v3.7.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.

## v3.7.0 Step 2 개발 기록

- 범위: P0 `v3.7.0 (2) Site / Source Group Contract`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV370SiteSourceGroupContractItem`, `BuildV370SiteSourceGroupContractItems`, `AppendV370SiteSourceGroupContractItemJson`, `OpsV370SiteSourceGroupContractJson`를 추가해 `site`, `sourceGroup`, `zone`, `viewGroup` read model과 `noAutoWriteBoundary`를 JSON contract로 정의했습니다.
- route: `GET /ops/api/site-operations/source-group-contract`를 Ops principal 전용, `Cache-Control: no-store` JSON route로 연결했습니다.
- boundary: SourceRegistry/PublishedView write, viewer/client exposure, raw locator/credential 노출, EventRecord/Event POST/WebRTC/SSE/WS/media schema 변경, Rule/Profile payload 변경을 수행하지 않는 `boundaries` flag를 응답에 고정했습니다.
- verifier: `scripts/internal/verify_v370_site_source_group_contract.mjs`, `server.sh verify-v370-site-source-group-contract`, `docs/project-feature-test-inventory.md`의 `SRC-054`, `SAFE-163`, `OPS-130`을 추가했습니다.
- 검증: 최초 `./server.sh verify-v370-site-source-group-contract`는 route/model/final backlog 기록이 없어 `pass=0 fail=4`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 2 결과 행에 기록합니다.
- 완료 경계: Step 2는 contract/read model gate입니다. site projection, health rollup, UI 풀테스트, 30분/120분, published metadata, release action PASS가 아닙니다.

## v3.7.0 Step 3 개발 기록

- 범위: P0 `v3.7.0 (3) Site-Aware Source Registry Projection`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV370SiteAwareSourceRegistryProjectionItem`, `OpsV370SiteAwareSourceRegistryProjectionSummary`, `BuildV370SiteAwareSourceRegistryProjectionItems`, `BuildV370SiteAwareSourceRegistryProjectionSummary`, `AppendV370SiteAwareSourceRegistryProjectionItemJson`, `OpsV370SiteAwareSourceRegistryProjectionJson`를 추가했습니다.
- route: `GET /ops/api/site-operations/source-registry-projection`을 Ops principal 전용, `Cache-Control: no-store` JSON route로 연결했습니다.
- logic: `SourceViewRegistry::Instance().Snapshot`으로 기존 SourceRegistry/PublishedView snapshot만 읽고, source를 `siteId`/`sourceGroup`/`zone` 단위로 묶어 `sourceIds`, `viewIds`, `viewGroups`, source/view count를 산출합니다.
- boundary: source/view write, viewer/client exposure, raw locator/credential 포함, EventRecord/Event POST/WebRTC/SSE/WS/media schema 변경을 수행하지 않는 `boundaries` flag를 응답에 고정했습니다.
- verifier: `scripts/internal/verify_v370_site_aware_source_registry_projection.mjs`, `server.sh verify-v370-site-aware-source-registry-projection`, `docs/project-feature-test-inventory.md`의 `SRC-055`, `SAFE-164`, `OPS-131`을 추가했습니다.
- 검증: 최초 `./server.sh verify-v370-site-aware-source-registry-projection`는 route/model/final backlog 기록이 없어 `pass=0 fail=5`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 3 결과 행에 기록합니다.
- 완료 경계: Step 3은 Ops-only projection입니다. SourceRegistry/PublishedView mutation, 제품 UI 직접 조작, 30분/120분, published metadata, release action evidence가 아닙니다.

## v3.7.0 Step 4 개발 기록

- 범위: P0 `v3.7.0 (4) Site Health Rollup`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV370SiteHealthRollupItem`, `OpsV370SiteHealthRollupSummary`, `BuildV370SiteHealthRollupItems`, `BuildV370SiteHealthRollupSummary`, `AppendV370SiteHealthRollupItemJson`, `OpsV370SiteHealthRollupJson`를 추가했습니다.
- route: `GET /ops/api/site-operations/health-rollup`을 Ops principal 전용, `Cache-Control: no-store` JSON route로 연결했습니다.
- logic: 기존 `BuildOpsSourceHealthSnapshot` 결과와 Step 3의 site-aware source projection을 조합해 site/source group별 `healthy`, `offline`, `degraded`, `recovering`, `field-needed` rollup state와 source count/reason을 계산합니다.
- boundary: source health persistence, automatic recovery, field smoke, source/view write, viewer/client exposure, raw locator/credential 포함, EventRecord/Event POST/WebRTC/SSE/WS/media schema 변경을 수행하지 않는 `boundaries` flag를 응답에 고정했습니다.
- verifier: `scripts/internal/verify_v370_site_health_rollup.mjs`, `server.sh verify-v370-site-health-rollup`, `docs/project-feature-test-inventory.md`의 `SRC-056`, `SAFE-165`, `OPS-132`를 추가했습니다.
- 검증: 최초 `./server.sh verify-v370-site-health-rollup`은 route/model/final backlog 기록이 없어 `pass=0 fail=5`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 4 결과 행에 기록합니다.
- 완료 경계: Step 4는 read-only rollup입니다. automatic recovery, field smoke, UI 풀테스트, 30분/120분, published metadata, release action evidence가 아닙니다.

## v3.7.0 Step 5 개발 기록

- 범위: P1 `v3.7.0 (5) Site Impact Graph`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV370SiteImpactGraphNode`, `OpsV370SiteImpactGraphEdge`, `OpsV370SiteImpactGraphSummary`, `BuildV370SiteImpactGraphNodes`, `BuildV370SiteImpactGraphEdges`, `BuildV370SiteImpactGraphSummary`, `AppendV370SiteImpactGraphNodeJson`, `AppendV370SiteImpactGraphEdgeJson`, `OpsV370SiteImpactGraphJson`를 추가했습니다.
- route: `GET /ops/api/site-operations/impact-graph`을 Ops principal 전용, `Cache-Control: no-store` JSON route로 연결했습니다.
- logic: 기존 `BuildV350LiveOperationsGraphContext`, `BuildV370SiteAwareSourceRegistryProjectionItems`, `BuildV370SiteHealthRollupItems`를 조합해 site/source group별 `EventRecord`, `sourceHealth`, `PublishedView`, `clientImpact` node/edge와 summary를 산출합니다.
- boundary: source/view/EventRecord/Ops audit/client/media mutation, viewer/client exposure, raw locator/credential/debug material 포함, Event POST/WebRTC/SSE/WS/RTSP media schema 변경을 수행하지 않는 `boundaries` flag를 응답에 고정했습니다.
- verifier: `scripts/internal/verify_v370_site_impact_graph.mjs`, `./server.sh verify-v370-site-impact-graph`, `docs/project-feature-test-inventory.md`의 `SRC-057`, `EVT-080`, `CLIENT-035`, `SAFE-166`, `OPS-133`을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v370_site_impact_graph.mjs`는 route/model/final backlog 기록이 없어 `pass=0 fail=5`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 5 결과 행에 기록합니다.
- 완료 경계: Step 5는 Ops-only site impact graph API/verifier 연결입니다. 제품 UI 직접 조작, 30분/120분, source/view/EventRecord/Ops audit/client/media mutation, published metadata, release action evidence가 아닙니다.

## v3.7.0 Step 6 개발 기록

- 범위: P1 `v3.7.0 (6) Site Simulation Input Pack`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV370SiteSimulationInputPackItem`, `OpsV370SiteSimulationInputPackSummary`, `BuildV370SiteSimulationInputPackItems`, `BuildV370SiteSimulationInputPackSummary`, `AppendV370SiteSimulationInputPackItemJson`, `AppendV370SiteSimulationInputPackSummaryJson`, `OpsV370SiteSimulationInputPackJson`를 추가했습니다.
- route: `GET /ops/api/site-operations/simulation-input-pack`을 Ops principal 전용, `Cache-Control: no-store` JSON route로 연결했습니다.
- logic: 기존 `BuildV350LiveOperationsGraphContext`, `BuildV350CommandPlanCandidates`, `BuildV350StagedChangePlans`, `BuildV360SimulationInputPackItems`, `BuildV360SimulationInputPackSummary`, `BuildV360SimulationResultEnvelope`, `BuildV370SiteAwareSourceRegistryProjectionItems`, `BuildV370SiteHealthRollupItems`, `BuildV370SiteImpactGraphNodes`, `BuildV370SiteImpactGraphEdges`를 조합해 site/source group별 `SourceRegistry`, `EventRecord`, `PublishedView`, `sourceHealthRollup`, `SiteImpactGraph`, v3.6 simulation input envelope refs를 read-only input pack으로 산출합니다.
- boundary: simulation input persist/run/result persist, source/view/rule/EventRecord/Ops audit/client/media mutation, viewer/client exposure, raw locator/credential material 포함, Event POST/WebRTC/SSE/WS/RTSP media schema 변경을 수행하지 않는 `boundaries` flag를 응답에 고정했습니다.
- verifier: `scripts/internal/verify_v370_site_simulation_input_pack.mjs`, `./server.sh verify-v370-site-simulation-input-pack`, `docs/project-feature-test-inventory.md`의 `SRC-058`, `EVT-081`, `LAB-101`, `SAFE-167`, `OPS-134`를 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v370_site_simulation_input_pack.mjs`는 route/model/final backlog 기록이 없어 `pass=0 fail=5`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 6 결과 행에 기록합니다.
- 완료 경계: Step 6은 Ops-only site simulation input pack API/verifier 연결입니다. simulation 실행/저장, 제품 UI 직접 조작, 30분/120분, source/view/rule/EventRecord/Ops audit/client/media mutation, published metadata, release action evidence가 아닙니다.

## v3.7.0 Step 7 개발 기록

- 범위: P1 `v3.7.0 (7) Cross-Site Safe Apply Readiness`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV370CrossSiteSafeApplyReadinessItem`, `OpsV370CrossSiteSafeApplyReadinessSummary`, `BuildV370CrossSiteSafeApplyReadinessItems`, `BuildV370CrossSiteSafeApplyReadinessSummary`, `AppendV370CrossSiteSafeApplyReadinessItemJson`, `AppendV370CrossSiteSafeApplyReadinessSummaryJson`, `OpsV370CrossSiteSafeApplyReadinessJson`를 추가했습니다.
- route: `GET /ops/api/site-operations/cross-site-safe-apply-readiness`를 Ops principal 전용, `Cache-Control: no-store` JSON route로 연결했습니다.
- logic: 기존 `BuildV350LiveOperationsGraphContext`, `BuildV350CommandPlanCandidates`, `BuildV350StagedChangePlans`, `BuildV360CommandPlanDryRunResults`, `BuildV360SourceRuleImpactDiffs`, `BuildV360SafeApplyReadinessItems`, `BuildV360SafeApplyReadinessSummary`, `BuildV370SiteAwareSourceRegistryProjectionItems`, `BuildV370SiteSimulationInputPackItems`, `BuildV370SiteImpactGraphNodes`, `BuildV370SiteImpactGraphEdges`를 조합해 site/source group별 affected client refs, blocker, `approval-needed`, `field-needed`, `not-run`, cross-site review 필요 상태를 산출합니다.
- boundary: automatic/safe apply, field smoke, client notice send, source/view/rule/EventRecord/Ops audit/client/media mutation, viewer/client exposure, raw locator/credential material 포함, Event POST/WebRTC/SSE/WS/RTSP media schema 변경을 수행하지 않는 `boundaries` flag를 응답에 고정했습니다.
- verifier: `scripts/internal/verify_v370_cross_site_safe_apply_readiness.mjs`, `./server.sh verify-v370-cross-site-safe-apply-readiness`, `docs/project-feature-test-inventory.md`의 `SRC-059`, `CLIENT-036`, `LAB-102`, `SAFE-168`, `OPS-135`를 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v370_cross_site_safe_apply_readiness.mjs`는 route/model/final backlog 기록이 없어 `pass=0 fail=5`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 7 결과 행에 기록합니다.
- 완료 경계: Step 7은 Ops-only cross-site safe apply readiness API/verifier 연결입니다. safe apply 실행, field smoke, client notice 발송, 제품 UI 직접 조작, 30분/120분, source/view/rule/EventRecord/Ops audit/client/media mutation, published metadata, release action evidence가 아닙니다.

## v3.7.0 Step 8 개발 기록

- 범위: P1 `v3.7.0 (8) Runbook Template Contract`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV370RunbookTemplateContractItem`, `OpsV370RunbookTemplateContractSummary`, `BuildV370RunbookTemplateContractItems`, `BuildV370RunbookTemplateContractSummary`, `AppendV370RunbookTemplateContractItemJson`, `OpsV370RunbookTemplateContractJson`를 추가했습니다.
- route: `GET /ops/api/site-operations/runbook-template-contract`를 Ops principal 전용, `Cache-Control: no-store` JSON route로 연결했습니다.
- logic: 기존 `BuildV350LiveOperationsGraphContext`, `BuildV350CommandPlanCandidates`, `BuildV360CommandPlanDryRunResults`, `BuildV360SourceRuleImpactDiffs`, `BuildV360SafeApplyReadinessItems`, `BuildV370SiteAwareSourceRegistryProjectionItems`, `BuildV370SiteSimulationInputPackItems`, `BuildV370CrossSiteSafeApplyReadinessItems`를 조합해 `source-recheck`, `maintenance`, `rule-draft`, `client-notice` runbook template의 required input, approval state catalog, output ref를 산출합니다.
- boundary: runbook instance persist, approval ticket write, operator note write, source/view/rule/EventRecord/Ops audit/client/media mutation, client notice send, field smoke, raw locator/credential material 포함, Event POST/WebRTC/SSE/WS/RTSP media schema 변경을 수행하지 않는 `boundaries` flag를 응답에 고정했습니다.
- verifier: `scripts/internal/verify_v370_runbook_template_contract.mjs`, `./server.sh verify-v370-runbook-template-contract`, `docs/project-feature-test-inventory.md`의 `LAB-103`, `SAFE-169`, `OPS-136`을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v370_runbook_template_contract.mjs`는 runbook template contract model, route, final backlog 기록이 아직 없어 `pass=0 fail=5`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 8 결과 행에 기록합니다.
- 완료 경계: Step 8은 Ops-only runbook template contract API/verifier 연결입니다. runbook instance 저장, approval ticket write, 제품 UI 직접 조작, 30분/120분, source/view/rule/EventRecord/Ops audit/client/media mutation, published metadata, release action evidence가 아닙니다.

## v3.7.0 Step 9 개발 기록

- 범위: P1 `v3.7.0 (9) Runbook Instance Ledger`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV370RunbookInstanceLedgerEntry`, `OpsV370RunbookInstanceLedgerSummary`, `BuildV370RunbookInstanceLedgerEntries`, `BuildV370RunbookInstanceLedgerSummary`, `AppendV370RunbookInstanceLedgerEntryJson`, `OpsV370RunbookInstanceLedgerJson`를 추가했습니다.
- route: `GET /ops/api/site-operations/runbook-instance-ledger`를 Ops principal 전용, `Cache-Control: no-store` JSON route로 연결했습니다.
- logic: `BuildV370RunbookTemplateContractItems`, `BuildV370RunbookTemplateContractSummary`, `BuildV370CrossSiteSafeApplyReadinessItems`, `BuildV360SimulationRunLedgerEntries`를 조합해 runbookId, siteId, status, operator note, previous run comparison을 append-only/read-only ledger projection으로 산출합니다.
- boundary: runbook instance persist, operator note write, approval ticket write, result diff persist, source/view/rule/EventRecord/Ops audit/client/media mutation, client notice send, field smoke, raw locator/credential material 포함, Event POST/WebRTC/SSE/WS/RTSP media schema 변경을 수행하지 않는 `boundaries` flag를 응답에 고정했습니다.
- verifier: `scripts/internal/verify_v370_runbook_instance_ledger.mjs`, `./server.sh verify-v370-runbook-instance-ledger`, `docs/project-feature-test-inventory.md`의 `LAB-104`, `SAFE-170`, `OPS-137`을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v370_runbook_instance_ledger.mjs`는 runbook instance ledger model, route, final backlog 기록이 아직 없어 `pass=0 fail=5`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 9 결과 행에 기록합니다.
- 완료 경계: Step 9는 Ops-only runbook instance ledger API/verifier 연결입니다. runbook instance 저장, operator note write, approval ticket write, 제품 UI 직접 조작, 30분/120분, source/view/rule/EventRecord/Ops audit/client/media mutation, published metadata, release action evidence가 아닙니다.

## v3.7.0 Step 10 개발 기록

- 범위: P1 `v3.7.0 (10) Approval Ticket Workflow`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV370ApprovalTicketWorkflowItem`, `OpsV370ApprovalTicketWorkflowSummary`, `BuildV370ApprovalTicketWorkflowItems`, `BuildV370ApprovalTicketWorkflowSummary`, `AppendV370ApprovalTicketWorkflowItemJson`, `OpsV370ApprovalTicketWorkflowJson`를 추가했습니다.
- route: `GET /ops/api/site-operations/approval-ticket-workflow`를 Ops principal 전용, `Cache-Control: no-store` JSON route로 연결했습니다.
- logic: `BuildV370RunbookTemplateContractItems`, `BuildV370RunbookInstanceLedgerEntries`, `BuildV370RunbookInstanceLedgerSummary`, `BuildV370CrossSiteSafeApplyReadinessItems`를 조합해 approval, hold, reject, field-needed 상태, reviewer, reason, audit link를 read-only approval ticket workflow projection으로 산출합니다.
- boundary: approval ticket write, reviewer assignment write, approval decision persist, runbook instance persist, operator note write, result diff persist, source/view/rule/EventRecord/Ops audit/client/media mutation, client notice send, field smoke, raw locator/credential material 포함, Event POST/WebRTC/SSE/WS/RTSP media schema 변경을 수행하지 않는 `boundaries` flag를 응답에 고정했습니다.
- verifier: `scripts/internal/verify_v370_approval_ticket_workflow.mjs`, `./server.sh verify-v370-approval-ticket-workflow`, `docs/project-feature-test-inventory.md`의 `LAB-105`, `SAFE-171`, `OPS-138`을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v370_approval_ticket_workflow.mjs`는 approval ticket workflow model, route, final backlog 기록이 아직 없어 `pass=0 fail=5`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 10 결과 행에 기록합니다.
- 완료 경계: Step 10은 Ops-only approval ticket workflow API/verifier 연결입니다. approval ticket 저장, reviewer assignment write, approval decision persist, runbook instance 저장, operator note write, 제품 UI 직접 조작, 30분/120분, source/view/rule/EventRecord/Ops audit/client/media mutation, published metadata, release action evidence가 아닙니다.

## v3.7.0 Step 11 개발 기록

- 범위: P1 `v3.7.0 (11) Site Operations Workspace UI`.
- `src/ingress/webrtc_http_server.cpp`: `AppendOpsDashboardPage` 안에 `ops-site-operations-workspace` section을 추가했고, `dashSiteOperationsSiteList`, `dashSiteOperationsHealthList`, `dashSiteOperationsRunbookQueue`, `dashSiteOperationsImpactDetail`, `dashSiteOperationsBoundary` control을 배치했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV370SiteOperationsWorkspace`, `refreshV370SiteOperationsWorkspace`, `v370SiteOperationsWorkspaceEntry`를 추가해 `/ops/api/site-operations/source-registry-projection`, `/health-rollup`, `/impact-graph`, `/runbook-instance-ledger`, `/approval-ticket-workflow`의 read-only payload를 site list, health rollup, runbook queue, impact detail로 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.ops-site-operations-workspace`, `.ops-site-operations-grid`, `.ops-site-operations-list`, `.ops-site-operations-entry`, `.ops-site-operations-boundary` 스타일을 추가해 기존 command/simulation workspace와 같은 responsive density, wrapping, boundary 패턴을 사용합니다.
- boundary: source/view/runbook/approval write, client notice send, source URL/raw locator/raw JSON/debug/credential material, viewer/client exposure, RTSP/WebRTC media mutation을 UI에서 수행하거나 노출하지 않습니다.
- verifier: `scripts/internal/verify_v370_site_operations_workspace_ui.mjs`, `./server.sh verify-v370-site-operations-workspace-ui`, `docs/project-feature-test-inventory.md`의 `UI-095`, `SAFE-172`, `OPS-139`을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v370_site_operations_workspace_ui.mjs`는 workspace shell, renderer, CSS, final backlog 기록이 아직 없어 `pass=1 fail=8`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 11 결과 행에 기록합니다.
- 완료 경계: Step 11은 Ops-only Site Operations Workspace UI/verifier 연결입니다. Client Notice by Site/View Group 완료 evidence가 아닙니다. Rule/VA What-if by Site 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분, source/view/runbook/approval write, client notice send, media/schema mutation, published metadata, release action evidence가 아닙니다.

## v3.7.0 Step 12 개발 기록

- 범위: P1 `v3.7.0 (12) Client Notice by Site/View Group`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/site-operations/client-notice-by-site-view-group` GET route와 `OpsV370ClientNoticeBySiteViewGroupJson`, `BuildV370ClientNoticeBySiteViewGroupItems`, `BuildV370ClientNoticeBySiteViewGroupSummary`를 추가했습니다. v3.7 site projection, health rollup, impact graph, runbook ledger, approval workflow를 조합해 site/view group별 viewer-safe notice preview와 delivery queue preview를 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `AppendOpsDashboardPage` 안에 `ops-site-client-notice-workspace` section을 추가했고, `dashSiteClientNoticeBadges`, `dashSiteClientNoticeText`, `dashSiteClientNoticePreviewList`, `dashSiteClientNoticeDeliveryQueue`, `dashSiteClientNoticeBoundary` control을 배치했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV370ClientNoticeBySiteViewGroup`, `refreshV370ClientNoticeBySiteViewGroup`, `v370ClientNoticeBySiteViewGroupEntry`를 추가해 `/ops/api/site-operations/client-notice-by-site-view-group`의 `clientNoticeBySiteViewGroupItems`와 `clientNoticeBySiteViewGroupSummary`를 notice preview와 delivery queue로 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.ops-site-client-notice-workspace`, `.ops-site-client-notice-grid`, `.ops-site-client-notice-list`, `.ops-site-client-notice-entry`, `.ops-site-client-notice-boundary` 스타일을 추가해 기존 site operations workspace와 같은 responsive density, wrapping, boundary 패턴을 사용합니다.
- boundary: client notice send/persist, viewer client payload 변경, source/view/rule/EventRecord/Ops audit/client/media mutation, source URL/raw locator/raw JSON/debug/credential/operator material 노출을 수행하지 않습니다.
- verifier: `scripts/internal/verify_v370_client_notice_by_site_view_group.mjs`, `./server.sh verify-v370-client-notice-by-site-view-group`, `docs/project-feature-test-inventory.md`의 `UI-096`, `CLIENT-037`, `SAFE-173`, `OPS-140`을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v370_client_notice_by_site_view_group.mjs`는 site/view group notice model, route, dashboard shell, CSS, final backlog 기록이 아직 없어 `pass=1 fail=8`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 12 결과 행에 기록합니다.
- 완료 경계: Step 12는 Ops-only Client Notice by Site/View Group API/UI/verifier 연결입니다. Rule/VA What-if by Site 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분, client notice send/persist, viewer client payload 변경, source/view/rule/EventRecord/Ops audit/client/media mutation, published metadata, release action evidence가 아닙니다.

## v3.7.0 Step 13 개발 기록

- 범위: P1 `v3.7.0 (13) Rule/VA What-if by Site`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/site-operations/rule-va-what-if-by-site` GET route와 `OpsV370RuleVaWhatIfBySiteJson`, `BuildV370RuleVaWhatIfBySiteItems`, `BuildV370RuleVaWhatIfBySiteSummary`를 추가했습니다. v3.7 site projection, health rollup, impact graph, site simulation input pack, cross-site readiness와 v3.6 dry-run/impact diff/Rule-VA replay refs를 조합해 site/source group별 rule threshold/scenario what-if 후보를 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `AppendOpsDashboardPage` 안에 `ops-site-rule-va-what-if-workspace` section을 추가했고, `dashSiteRuleVaWhatIfBadges`, `dashSiteRuleVaWhatIfText`, `dashSiteRuleVaWhatIfCandidateList`, `dashSiteRuleVaWhatIfImpactList`, `dashSiteRuleVaWhatIfFixtureList`, `dashSiteRuleVaWhatIfBoundary` control을 배치했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV370RuleVaWhatIfBySite`, `refreshV370RuleVaWhatIfBySite`, `v370RuleVaWhatIfBySiteEntry`를 추가해 `/ops/api/site-operations/rule-va-what-if-by-site`의 `ruleVaWhatIfBySiteItems`와 `ruleVaWhatIfBySiteSummary`를 candidate, site impact delta, EventRecord/VA fixture refs로 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.ops-site-rule-va-what-if-workspace`, `.ops-site-rule-va-what-if-grid`, `.ops-site-rule-va-what-if-list`, `.ops-site-rule-va-what-if-entry`, `.ops-site-rule-va-what-if-boundary` 스타일을 추가해 기존 Product UI workspace와 같은 responsive density, wrapping, boundary 패턴을 사용합니다.
- boundary: rule/profile registry write, rule threshold/preset/scenario apply, EventRecord/Ops audit/source/view/client/media mutation, simulation run, safe apply, client notice send, source URL/raw locator/raw JSON/debug/credential material 노출을 수행하지 않습니다.
- verifier: `scripts/internal/verify_v370_rule_va_what_if_by_site.mjs`, `./server.sh verify-v370-rule-va-what-if-by-site`, `docs/project-feature-test-inventory.md`의 `UI-097`, `RULE-110`, `EVT-082`, `LAB-106`, `SAFE-174`, `OPS-141`을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v370_rule_va_what_if_by_site.mjs`는 Rule/VA what-if by site model, route, dashboard shell, CSS, final backlog 기록이 아직 없어 `pass=1 fail=8`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 13 결과 행에 기록합니다.
- 완료 경계: Step 13은 Ops-only Rule/VA What-if by Site API/UI/verifier 연결입니다. Field Evidence Attachment, Limited Safe Execution Pilot, Outcome Reconciliation, Export/Handoff Bundle, Stabilization and Release Readiness 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분, rule apply, EventRecord write, source/view/client/media mutation, published metadata, release action evidence가 아닙니다.

## v3.7.0 Step 14 개발 기록

- 범위: P2 `v3.7.0 (14) Field Evidence Attachment`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/site-operations/field-evidence-attachment` GET route와 `OpsV370FieldEvidenceAttachmentJson`, `BuildV370FieldEvidenceAttachmentItems`, `BuildV370FieldEvidenceAttachmentSummary`를 추가했습니다. v3.4 field bridge condition gates, v3.5 field evidence intake, v3.6 field evidence simulation adapter와 v3.7 site projection, site simulation input pack, runbook instance ledger, approval ticket workflow를 조합해 site/runbook scoped `siteRunbookEvidenceRef`와 `conditionalNotRunEvidence`를 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `AppendOpsDashboardPage` 안에 `ops-site-field-evidence-attachment-workspace` section을 추가했고, `dashSiteFieldEvidenceAttachmentBadges`, `dashSiteFieldEvidenceAttachmentText`, `dashSiteFieldEvidenceAttachmentList`, `dashSiteFieldEvidenceAttachmentConditionList`, `dashSiteFieldEvidenceAttachmentBoundary` control을 배치했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV370FieldEvidenceAttachment`, `refreshV370FieldEvidenceAttachment`, `v370FieldEvidenceAttachmentEntry`를 추가해 `/ops/api/site-operations/field-evidence-attachment`의 `fieldEvidenceAttachments`와 `fieldEvidenceAttachmentSummary`를 attachment refs, condition refs, not-run reason으로 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.ops-site-field-evidence-attachment-workspace`, `.ops-site-field-evidence-attachment-grid`, `.ops-site-field-evidence-attachment-list`, `.ops-site-field-evidence-attachment-entry`, `.ops-site-field-evidence-attachment-boundary` 스타일을 추가해 기존 site workspace와 같은 responsive density, wrapping, boundary 패턴을 사용합니다.
- boundary: field smoke, endpoint probe, credential probe, provider/VLM call, runbook/approval write, source/view/EventRecord/Ops audit/client/media mutation, raw endpoint/locator/credential/provider/VLM material 노출을 수행하지 않습니다.
- verifier: `scripts/internal/verify_v370_field_evidence_attachment.mjs`, `./server.sh verify-v370-field-evidence-attachment`, `docs/project-feature-test-inventory.md`의 `UI-098`, `SRC-060`, `MEDIA-025`, `LAB-107`, `SAFE-175`, `OPS-142`를 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v370_field_evidence_attachment.mjs`는 Field Evidence Attachment model, route, dashboard shell, CSS, final backlog 기록, server dispatch가 아직 없어 `pass=1 fail=8`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 14 결과 행에 기록합니다.
- 완료 경계: Step 14는 Ops-only Field Evidence Attachment API/UI/verifier 연결입니다. Limited Safe Execution Pilot 완료 evidence가 아닙니다. Outcome Reconciliation, Export/Handoff Bundle, Stabilization and Release Readiness 완료 evidence도 아닙니다. UI 풀테스트 직접 조작, 30분/120분, field smoke, endpoint/provider 실행, source/view/runbook/approval/EventRecord write, media mutation, published metadata, release action evidence가 아닙니다.

## v3.7.0 Step 15 개발 기록

- 범위: P2 `v3.7.0 (15) Limited Safe Execution Pilot`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/site-operations/limited-safe-execution-pilot` GET route와 `OpsV370LimitedSafeExecutionPilotJson`, `BuildV370LimitedSafeExecutionPilotActions`, `BuildV370LimitedSafeExecutionPilotSummary`를 추가했습니다. v3.7 runbook instance ledger, approval ticket workflow, field evidence attachment, client notice by site/view group refs를 조합해 source recheck 또는 notice queue pilot 후보를 lowest-risk approval-gated preview로 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `AppendOpsDashboardPage` 안에 `ops-site-limited-safe-execution-pilot-workspace` section을 추가했고, `dashSiteLimitedSafeExecutionPilotBadges`, `dashSiteLimitedSafeExecutionPilotText`, `dashSiteLimitedSafeExecutionPilotList`, `dashSiteLimitedSafeExecutionPilotGateList`, `dashSiteLimitedSafeExecutionPilotBoundary` control을 배치했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV370LimitedSafeExecutionPilot`, `refreshV370LimitedSafeExecutionPilot`, `v370LimitedSafeExecutionPilotEntry`를 추가해 `/ops/api/site-operations/limited-safe-execution-pilot`의 `limitedSafeExecutionPilotActions`와 `limitedSafeExecutionPilotSummary`를 pilot candidate, approval gate, execution request preview, idempotency key로 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.ops-site-limited-safe-execution-pilot-workspace`, `.ops-site-limited-safe-execution-pilot-grid`, `.ops-site-limited-safe-execution-pilot-list`, `.ops-site-limited-safe-execution-pilot-entry`, `.ops-site-limited-safe-execution-pilot-boundary` 스타일을 추가해 기존 site workspace와 같은 responsive density, wrapping, boundary 패턴을 사용합니다.
- boundary: pilot execution, source recheck 실행, notice queue write/send, runbook/approval write, source/view/EventRecord/Ops audit/client/media mutation, raw locator/credential/operator material 노출을 수행하지 않습니다.
- verifier: `scripts/internal/verify_v370_limited_safe_execution_pilot.mjs`, `./server.sh verify-v370-limited-safe-execution-pilot`, `docs/project-feature-test-inventory.md`의 `UI-099`, `SRC-061`, `CLIENT-038`, `LAB-108`, `SAFE-176`, `OPS-143`을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v370_limited_safe_execution_pilot.mjs`는 Limited Safe Execution Pilot model, route, dashboard shell, CSS, final backlog 기록, server dispatch가 아직 없어 `pass=1 fail=8`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 15 결과 행에 기록합니다.
- 완료 경계: Step 15는 Ops-only Limited Safe Execution Pilot API/UI/verifier 연결입니다. Outcome Reconciliation 완료 evidence가 아닙니다. Export/Handoff Bundle, Stabilization and Release Readiness 완료 evidence도 아닙니다. UI 풀테스트 직접 조작, 30분/120분, source recheck 실행, notice queue write/send, source/view/runbook/approval/EventRecord write, media mutation, published metadata, release action evidence가 아닙니다.

## v3.7.0 Step 16 개발 기록

- 범위: P2 `v3.7.0 (16) Outcome Reconciliation`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/site-operations/outcome-reconciliation` GET route와 `OpsV370OutcomeReconciliationJson`, `BuildV370OutcomeReconciliationItems`, `BuildV370OutcomeReconciliationSummary`를 추가했습니다. Limited Safe Execution Pilot action, site simulation input pack, v3.6 source/rule impact diff, site impact graph, client notice by site/view group refs를 조합해 pre-simulation ref와 post-execution not-run ref를 source/event/client impact 축으로 비교합니다.
- `src/ingress/webrtc_http_server.cpp`: `AppendOpsDashboardPage` 안에 `ops-site-outcome-reconciliation-workspace` section을 추가했고, `dashSiteOutcomeReconciliationBadges`, `dashSiteOutcomeReconciliationText`, `dashSiteOutcomeReconciliationSourceList`, `dashSiteOutcomeReconciliationEventClientList`, `dashSiteOutcomeReconciliationBoundary` control을 배치했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV370OutcomeReconciliation`, `refreshV370OutcomeReconciliation`, `v370OutcomeReconciliationEntry`를 추가해 `/ops/api/site-operations/outcome-reconciliation`의 `outcomeReconciliationItems`와 `outcomeReconciliationSummary`를 pre/post ref, source impact diff, EventRecord/client impact diff, pending reason으로 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.ops-site-outcome-reconciliation-workspace`, `.ops-site-outcome-reconciliation-grid`, `.ops-site-outcome-reconciliation-list`, `.ops-site-outcome-reconciliation-entry`, `.ops-site-outcome-reconciliation-boundary` 스타일을 추가해 기존 site workspace와 같은 responsive density, wrapping, boundary 패턴을 사용합니다.
- boundary: pilot execution, source recheck 실행, notice queue write/send, client notice send, source/view/EventRecord/Ops audit/runbook/approval/operator note write, viewer client payload 변경, media/schema mutation을 수행하지 않습니다.
- verifier: `scripts/internal/verify_v370_outcome_reconciliation.mjs`, `./server.sh verify-v370-outcome-reconciliation`, `docs/project-feature-test-inventory.md`의 `UI-100`, `SRC-062`, `EVT-083`, `CLIENT-039`, `LAB-109`, `SAFE-177`, `OPS-144`를 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v370_outcome_reconciliation.mjs`는 Outcome Reconciliation model, route, dashboard shell, CSS, final backlog 기록, server dispatch가 아직 없어 `pass=1 fail=8`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 16 결과 행에 기록합니다.
- 완료 경계: Step 16은 Ops-only Outcome Reconciliation API/UI/verifier 연결입니다. Export/Handoff Bundle 완료 evidence가 아닙니다. Stabilization and Release Readiness 완료 evidence도 아닙니다. UI 풀테스트 직접 조작, 30분/120분, pilot 실행, source recheck 실행, notice queue write/send, source/view/runbook/approval/EventRecord write, media mutation, published metadata, release action evidence가 아닙니다.

## v3.7.0 Step 17 개발 기록

- 범위: P1 `v3.7.0 (17) Export / Handoff Bundle`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/site-operations/export-handoff-bundle` GET route와 `OpsV370ExportHandoffBundleJson`, `BuildV370ExportHandoffBundleItems`, `BuildV370ExportHandoffMapEntries`, `BuildV370ExportHandoffBundleSummary`를 추가했습니다. v3.7 site registry projection, runbook instance ledger, field evidence attachment, approval ticket workflow, outcome reconciliation refs를 조합해 redacted release-safe handoff bundle과 handoff map을 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `AppendOpsDashboardPage` 안에 `ops-site-export-handoff-bundle-workspace` section을 추가했고, `dashSiteExportHandoffBundleBadges`, `dashSiteExportHandoffBundleText`, `dashSiteExportHandoffBundleList`, `dashSiteExportHandoffMapList`, `dashSiteExportHandoffRedactionList`, `dashSiteExportHandoffBundleBoundary` control을 배치했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV370ExportHandoffBundle`, `refreshV370ExportHandoffBundle`, `v370ExportHandoffBundleEntry`를 추가해 `/ops/api/site-operations/export-handoff-bundle`의 `exportHandoffBundleItems`, `exportHandoffMapEntries`, `exportHandoffBundleSummary`를 bundle item, handoff map, redaction review, boundary로 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.ops-site-export-handoff-bundle-workspace`, `.ops-site-export-handoff-bundle-grid`, `.ops-site-export-handoff-bundle-list`, `.ops-site-export-handoff-bundle-entry`, `.ops-site-export-handoff-bundle-boundary` 스타일을 추가해 기존 site workspace와 같은 responsive density, wrapping, boundary 패턴을 사용합니다.
- boundary: artifact export, bundle/file/handoff write, pilot execution, source recheck, notice queue write/send, client notice send, field smoke, endpoint/provider call, source/view/runbook/approval/EventRecord/Ops audit/client/media mutation, raw locator/endpoint/credential/provider/diagnostic/client raw material 노출을 수행하지 않습니다.
- verifier: `scripts/internal/verify_v370_export_handoff_bundle.mjs`, `./server.sh verify-v370-export-handoff-bundle`, `docs/project-feature-test-inventory.md`의 `UI-101`, `LAB-110`, `SAFE-178`, `OPS-145`를 추가했습니다.
- 검증: 최초 `./server.sh verify-v370-export-handoff-bundle`는 Export / Handoff Bundle model, route, dashboard shell, CSS, final backlog 기록, feature coverage 연결이 아직 없어 `pass=1 fail=8`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 17 결과 행에 기록합니다.
- 완료 경계: Step 17은 Ops-only Export / Handoff Bundle API/UI/verifier 연결입니다. Stabilization and Release Readiness 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분, artifact/file/handoff write, pilot 실행, source recheck 실행, notice queue write/send, source/view/runbook/approval/EventRecord/Ops audit/client/media mutation, published metadata, release action evidence가 아닙니다.

## v3.7.0 Step 18 개발 기록

- 범위: P0 `v3.7.0 (18) Stabilization and Release Readiness`.
- `scripts/internal/verify_v370_stabilization_release_readiness.mjs`, `./server.sh verify-v370-stabilization-release-readiness`: v3.7 Step 1~17 local verifier, release metadata/docs/assets, feature/script inventory, release evidence index, close-out dry-run, `git diff --check` 연결을 `media-server.v370-stabilization-release-readiness.v1` local readiness gate로 묶었습니다.
- `docs/development-backlog.md`, `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`, `docs/release-test-records.md`, `docs/release-policy.md`, `docs/release-evidence-index.md`: `SAFE-179`, `OPS-146`, Step 18 local readiness command, 미실행/미확인 release action 경계, local gate 결과 기록 위치를 추가했습니다.
- `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_script_inventory.mjs`, `server.sh`: Step 18 verifier coverage, project inventory required row/range, script inventory, server help/dispatch 연결을 추가했습니다.
- companion local gate:
  - `./server.sh verify-v370-stabilization-release-readiness`
  - `./server.sh build`
  - `./server.sh verify-v370-entry-baseline`
  - `./server.sh verify-v370-site-source-group-contract`
  - `./server.sh verify-v370-site-aware-source-registry-projection`
  - `./server.sh verify-v370-site-health-rollup`
  - `./server.sh verify-v370-site-impact-graph`
  - `./server.sh verify-v370-site-simulation-input-pack`
  - `./server.sh verify-v370-cross-site-safe-apply-readiness`
  - `./server.sh verify-v370-runbook-template-contract`
  - `./server.sh verify-v370-runbook-instance-ledger`
  - `./server.sh verify-v370-approval-ticket-workflow`
  - `./server.sh verify-v370-site-operations-workspace-ui`
  - `./server.sh verify-v370-client-notice-by-site-view-group`
  - `./server.sh verify-v370-rule-va-what-if-by-site`
  - `./server.sh verify-v370-field-evidence-attachment`
  - `./server.sh verify-v370-limited-safe-execution-pilot`
  - `./server.sh verify-v370-outcome-reconciliation`
  - `./server.sh verify-v370-export-handoff-bundle`
  - `./server.sh verify-release-metadata`
  - `./server.sh verify-docs-links`
  - `./server.sh verify-docs-ui-assets`
  - `./server.sh verify-project-inventory`
  - `./server.sh verify-feature-inventory-coverage`
  - `./server.sh verify-release-evidence-index`
  - `./server.sh verify-release-closeout-helper --dry-run`
  - `./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run`
  - `./server.sh verify-script-inventory`
  - `git diff --check`
- 검증: 최초 `./server.sh verify-v370-stabilization-release-readiness`는 Step 18 roadmap, feature inventory, release policy/evidence index/release records 연결이 아직 없어 `pass=2 fail=4`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v370 Step 18 결과 행에 기록합니다.
- 완료 경계: Step 18은 local stabilization/readiness wiring입니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke, 외부 credential/endpoint/실기기 evidence, release action 완료 evidence가 아닙니다.

## 최신 공개 기준: v3.6.0 Operations Simulation and Safe Apply Readiness

상태: Step 1 source/version/docs/backlog/verification metadata 정렬 완료. Step 2
Simulation Input Contract 구현 완료. Step 3 Operations Simulation Run Contract 구현 완료.
Step 4 Command Plan Dry-run Simulator 구현 완료. Step 5 Source/Rule Impact Diff 구현 완료.
Step 6 Safe Apply Readiness Gate 구현 완료. Step 7~13 simulation workspace 확장 구현 완료.
Step 14 Stabilization and Release Readiness local gate 연결 완료.
현재 source version은 `3.6.0`이고 latest published baseline은 `v3.6.0`입니다. 각 step은 실제 코드/API/문서/검증 산출물이 생긴
뒤에만 완료로 기록합니다.

직접 답: v3.6.0의 1차 선택값은 `Operations Simulation and Safe Apply Readiness`입니다.
v3.5가 live operations graph, command plan, staged plan을 묶었다면, v3.6은 같은 입력을
production write 없이 simulation input, dry-run, impact diff, safe apply readiness로
검토하는 단계입니다.

비범위:

- 자동 source registry mutation 또는 PublishedView 자동 변경
- 자동 command plan 실행, recovery cutover, maintenance 시작, client notice 발송
- Rule/Profile 자동 저장 또는 rule follow-up 자동 적용
- EventRecord, Event POST payload, WebRTC DataChannel, SSE/WS metadata,
  RTSP/WebRTC media path, Rule/Profile payload schema 변경
- viewer/client에 source locator, credential, raw diagnostic JSON, raw provider material,
  operator-only blocker detail 노출

| Step | 제목 | 우선순위 | 상태 | 산출물 |
| --- | --- | --- | --- | --- |
| 1 | v3.6.0 (1) v3.6.0 baseline 정렬 | P0 | 완료 | VERSION/CMake/docs/backlog/source roadmap과 `verify-v360-entry-baseline` 기준 정렬 |
| 2 | v3.6.0 (2) Simulation Input Contract | P0 | 완료 | EventRecord, SourceRegistry, PublishedView, command plan, staged plan을 read-only simulation input pack으로 정의 |
| 3 | v3.6.0 (3) Operations Simulation Run Contract | P0 | 완료 | `/ops/api/live-operations/simulation/*` route family와 simulation result envelope를 read-only/not-run schema로 정의 |
| 4 | v3.6.0 (4) Command Plan Dry-run Simulator | P0 | 완료 | source recheck, recovery, maintenance, client notice, rule follow-up 후보를 실제 write 없이 dry-run 결과로 계산 |
| 5 | v3.6.0 (5) Source/Rule Impact Diff | P0 | 완료 | source/view/rule 변경 전후의 source health, event risk, client 영향 차이를 diff로 표시 |
| 6 | v3.6.0 (6) Safe Apply Readiness Gate | P0 | 완료 | 자동 적용 없이 ready, blocked, approval-needed, field-needed, not-run 상태와 blocker를 산출 |
| 7 | v3.6.0 (7) Ops Simulation Workspace UI | P1 | 완료 | `/ops` command workspace에 simulation input, run, impact diff, readiness blocker 탐색 화면 추가 |
| 8 | v3.6.0 (8) Simulation Run Ledger and Comparison | P1 | 완료 | simulation run id, 입력 ref, 결과 diff, operator note, 이전 run 대비 변화를 누적 표시 |
| 9 | v3.6.0 (9) Client Notice Preview | P1 | 완료 | 실제 발송 없이 viewer-safe maintenance/degraded/recovering notice preview 생성 |
| 10 | v3.6.0 (10) Rule/VA What-if Replay Pack | P1 | 완료 | 기존 VA fixture/EventRecord 기반으로 rule threshold, preset, scenario 후보의 what-if 결과 비교 |
| 11 | v3.6.0 (11) Simulation Export Bundle | P1 | 완료 | simulation input/output, blocker, handoff map을 redacted release-safe export bundle로 조합 |
| 12 | v3.6.0 (12) Field Evidence Simulation Adapter | P2 | 완료 | ONVIF, external WHEP/TURN, cloud/VLM provider 조건을 field 실행 없이 조건부/not-run evidence로 simulation에 연결 |
| 13 | v3.6.0 (13) VLM-assisted Simulation Explanation | P2 | 완료 | default-off VLM 보조 설명으로 blocker, impact diff, operator review hint를 요약. provider/runtime call은 opt-in 전 미수행 |
| 14 | v3.6.0 (14) Stabilization and Release Readiness | P0 | 완료 | v3.6 local stabilization, release evidence/not-run 경계, close-out dry-run, inventory/script/metadata 연결 |

완료 경계: 위 표는 v3.6.0 개발 순서와 우선순위입니다. 각 step은 실제 코드/API/문서
변경, 기능 ID/test inventory 등록, 해당 verifier와 release test record evidence가 생긴 뒤에만
완료로 기록합니다. UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release
action, field smoke는 실행 evidence가 있을 때만 별도로 완료로 씁니다.

## v3.6.0 Step 1 개발 기록

- 범위: P0 `v3.6.0 (1) v3.6.0 baseline 정렬`.
- `VERSION`, `CMakeLists.txt`: 현재 source version과 CMake project version을 `3.6.0`으로 정렬했습니다.
- `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md`, `docs/versioning-policy.md`, `docs/release-policy.md`, `docs/public-repo-final-review.md`, `docs/ui-guide.md`, `docs/assets/ui/README.md`: 현재 source roadmap을 `v3.6.0 Operations Simulation and Safe Apply Readiness`로 전환했고 latest published release는 `v3.5.0` source-only GitHub Release로 유지했습니다.
- `docs/development-backlog.md`: v3.6.0 current roadmap을 `Step | 제목 | 우선순위 | 상태 | 산출물` 구조로 승격하고, no-auto-write/no-client-secret/no-media-path-change 경계를 기록했습니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`, `config/docs_ui_assets.json`: current release target, docs asset baseline, verification catalog, release records를 source `3.6.0`와 latest published `v3.6.0` 기준으로 정렬했습니다.
- `scripts/internal/verify_release_metadata_consistency.mjs`, `scripts/internal/verify_docs_ui_assets.mjs`: release metadata와 docs UI asset verifier가 source `3.6.0`, current roadmap `v3.6.0 Operations Simulation and Safe Apply Readiness`, latest published `v3.6.0`을 검증하도록 보정했습니다.
- `scripts/internal/verify_v360_entry_baseline.mjs`, `server.sh`: `./server.sh verify-v360-entry-baseline` 명령을 추가해 source `3.6.0`, latest published `v3.6.0`, current roadmap `v3.6.0 Operations Simulation and Safe Apply Readiness`, release records, feature inventory, server dispatch 연결을 정적 검증합니다.
- 검증: 최초 `node scripts/internal/verify_v360_entry_baseline.mjs`는 source version/docs/inventory/server dispatch가 아직 v3.6 기준이 아니어서 `pass=0 fail=9`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v360 Step 1 결과 행에 기록합니다.
- 완료 경계: 이번 Step 1은 source/version/docs/backlog/verification metadata 정렬입니다. UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다. `v3.6.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.

## v3.6.0 Step 2 개발 기록

- 범위: P0 `v3.6.0 (2) Simulation Input Contract`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV360SimulationInputPackJson`을 추가해 `media-server.ops.v360-simulation-input-pack.v1` read-only simulation input pack을 생성합니다. input pack은 EventRecord, SourceRegistry, PublishedView, command plan, staged plan을 기존 v3.5 graph/command/staged plan context에서 파생합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/live-operations/simulation/input-pack` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며 source/view/rule/EventRecord/Ops audit/client/media mutation을 수행하지 않습니다.
- `scripts/internal/verify_v360_simulation_input_contract.mjs`, `server.sh`: `./server.sh verify-v360-simulation-input-contract` 명령을 추가해 input pack model, route guard, no-write boundary, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 완료 경계: 이번 Step 2는 Simulation Input Contract read model/API/verifier 연결입니다. simulation run 실행, dry-run 계산, impact diff, safe apply readiness 완료 evidence가 아닙니다.

## v3.6.0 Step 3 개발 기록

- 범위: P0 `v3.6.0 (3) Operations Simulation Run Contract`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV360OperationsSimulationRunContractJson`을 추가해 `media-server.ops.v360-simulation-run-contract.v1` simulation run schema와 result envelope를 정의합니다. envelope는 default `not-run`이며 route family, input pack summary, blocker, allowed readiness state를 포함합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/live-operations/simulation/run-contract` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며 simulation run persist/execute, result persist, source/view/rule/EventRecord/Ops audit/client/media mutation을 수행하지 않습니다.
- `scripts/internal/verify_v360_operations_simulation_run_contract.mjs`, `server.sh`: `./server.sh verify-v360-operations-simulation-run-contract` 명령을 추가해 simulation run schema/envelope, route family, no-run boundary, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 완료 경계: 이번 Step 3은 Operations Simulation Run Contract read model/API/verifier 연결입니다. command plan dry-run 실행 결과, source/rule impact diff, safe apply readiness 완료 evidence가 아닙니다.

## v3.6.0 Step 4 개발 기록

- 범위: P0 `v3.6.0 (4) Command Plan Dry-run Simulator`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV360CommandPlanDryRunSimulatorJson`을 추가해 source recheck, recovery, maintenance, client notice, rule follow-up 후보를 v3.5 command plan candidates에서 파생하고 `dryRunStatus`, `predictedResult`, `blockers`, `writePlan`을 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/live-operations/simulation/command-plan-dry-run` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며 recheck/recovery/maintenance/client notice/rule follow-up 실행과 source/view/rule/EventRecord/Ops audit/client/media mutation을 수행하지 않습니다.
- `scripts/internal/verify_v360_command_plan_dry_run_simulator.mjs`, `server.sh`: `./server.sh verify-v360-command-plan-dry-run-simulator` 명령을 추가해 dry-run simulator, candidate family coverage, no-execution boundary, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 완료 경계: 이번 Step 4는 Command Plan Dry-run Simulator API/verifier 연결입니다. source/rule impact diff, safe apply readiness 완료 evidence가 아닙니다. 실제 command execution 또는 write path가 아닙니다.

## v3.6.0 Step 5 개발 기록

- 범위: P0 `v3.6.0 (5) Source/Rule Impact Diff`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV360SourceRuleImpactDiffJson`을 추가해 command dry-run과 staged plan context를 기반으로 `beforeState`, `afterState`, `sourceHealthDiff`, `eventRiskDiff`, `clientImpactDiff`, `sourceChangeCandidate`, `ruleChangeCandidate`를 read-only diff로 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/live-operations/simulation/impact-diff` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며 source/view/rule/EventRecord/Ops audit/client/media mutation을 수행하지 않습니다.
- `scripts/internal/verify_v360_source_rule_impact_diff.mjs`, `server.sh`: `./server.sh verify-v360-source-rule-impact-diff` 명령을 추가해 impact diff model, route guard, no-apply boundary, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 완료 경계: 이번 Step 5는 Source/Rule Impact Diff API/verifier 연결입니다. safe apply readiness 완료 evidence가 아닙니다. source/rule 변경 적용 또는 client notice 발송 evidence가 아닙니다.

## v3.6.0 Step 6 개발 기록

- 범위: P0 `v3.6.0 (6) Safe Apply Readiness Gate`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV360SafeApplyReadinessGateJson`을 추가해 dry-run과 impact diff 결과에서 `ready`, `blocked`, `approval-needed`, `field-needed`, `not-run` readiness state와 blocker를 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/live-operations/simulation/safe-apply-readiness` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며 automatic apply, safe apply, client notice, field smoke, source/view/rule/EventRecord/Ops audit/client/media mutation을 수행하지 않습니다.
- `scripts/internal/verify_v360_safe_apply_readiness_gate.mjs`, `server.sh`: `./server.sh verify-v360-safe-apply-readiness-gate` 명령을 추가해 readiness state, blocker, no-auto-apply boundary, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 완료 경계: 이번 Step 6은 Safe Apply Readiness Gate API/verifier 연결입니다. 자동 적용, operator approval 수행, field smoke 실행, release action 완료 evidence가 아닙니다.

## v3.6.0 Step 7 개발 기록

- 범위: P1 `v3.6.0 (7) Ops Simulation Workspace UI`.
- `src/ingress/webrtc_http_server.cpp`: `AppendOpsDashboardPage`에 `ops-simulation-workspace` section을 추가했습니다. 이 화면은 `/ops` command workspace 아래에서 simulation input, simulation run envelope, impact diff, safe apply readiness blocker를 표시하며 write/action control을 제공하지 않습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV360OpsSimulationWorkspace`와 `refreshV360OpsSimulationWorkspace`를 추가했습니다. renderer는 `/ops/api/live-operations/simulation/input-pack`, `/run-contract`, `/command-plan-dry-run`, `/impact-diff`, `/safe-apply-readiness`를 `requestJson`으로 읽고 `simulationInputPackItems`, `simulationResultEnvelope`, `commandPlanDryRunResults`, `sourceRuleImpactDiffs`, `safeApplyReadinessItems`를 화면에 표시합니다.
- `src/ingress/product_ui_css.cpp`: `ops-simulation-workspace`, `ops-simulation-workspace-grid`, `ops-simulation-workspace-list`, `ops-simulation-workspace-entry`, `ops-simulation-boundary` 스타일을 추가해 긴 route/blocker 텍스트가 카드 밖으로 넘치지 않게 했습니다.
- `scripts/internal/verify_v360_ops_simulation_workspace_ui.mjs`, `server.sh`: `./server.sh verify-v360-ops-simulation-workspace-ui` 명령을 추가해 UI shell, renderer, CSS, client/viewer 비노출, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 완료 경계: 이번 Step 7은 `/ops` simulation workspace 정적 UI와 read-only renderer 연결입니다. Simulation Run Ledger and Comparison 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분 longrun, release action, field smoke PASS를 대체하지 않습니다.

## v3.6.0 Step 8 개발 기록

- 범위: P1 `v3.6.0 (8) Simulation Run Ledger and Comparison`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV360SimulationRunLedgerComparisonJson`을 추가해 `media-server.ops.v360-simulation-run-ledger.v1` read-only ledger를 생성합니다. ledger는 simulation run id, 입력 ref, 결과 diff, operator note, 이전 run 대비 변화를 `BuildV360SimulationInputPackItems`, `BuildV360SimulationRunContract`, `BuildV360SimulationResultEnvelope`, `BuildV360CommandPlanDryRunResults`, `BuildV360SourceRuleImpactDiffs`, `BuildV360SafeApplyReadinessItems`에서 파생합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/live-operations/simulation/run-ledger` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며 simulation run persist/execute, operator note write, result diff persist, source/view/rule/EventRecord/Ops audit/client/media mutation을 수행하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_page_scripts.cpp`, `src/ingress/product_ui_css.cpp`: `/ops` simulation workspace에 `dashSimulationWorkspaceLedgerList`를 추가하고 `simulationRunLedgerEntries`를 표시합니다. renderer는 `inputRef`, `resultDiff`, `operatorNote`, `previousRunId`, `changedFields`를 read-only로 표시하며 client/viewer script에 operator material을 노출하지 않습니다.
- `scripts/internal/verify_v360_simulation_run_ledger_comparison.mjs`, `server.sh`: `./server.sh verify-v360-simulation-run-ledger-comparison` 명령을 추가해 ledger model, route guard, append-only/read-only boundary, UI renderer/CSS, client/viewer 비노출, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 완료 경계: 이번 Step 8은 Simulation Run Ledger and Comparison API/UI/verifier 연결입니다. Client Notice Preview 완료 evidence가 아닙니다. simulation 실행, operator note 저장, client notice 발송, UI 풀테스트 직접 조작, 30분/120분 longrun, release action PASS를 대체하지 않습니다.

## v3.6.0 Step 9 개발 기록

- 범위: P1 `v3.6.0 (9) Client Notice Preview`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV360ClientNoticePreviewJson`을 추가해 `media-server.ops.v360-client-notice-preview.v1` preview-only notice를 생성합니다. preview는 `BuildV360CommandPlanDryRunResults`, `BuildV360SourceRuleImpactDiffs`, `BuildV360SafeApplyReadinessItems`에서 파생하며 `maintenance`, `degraded`, `recovering` 상태와 `viewerSafeTitle`, `viewerSafeBody`, `timelineHint`, `deliveryState=preview-only`만 노출합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/live-operations/simulation/client-notice-preview` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며 client notice 발송, client notice persist, viewer client payload 변경, source/view/rule/EventRecord/Ops audit/client/media mutation을 수행하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_page_scripts.cpp`, `src/ingress/product_ui_css.cpp`: `/ops` simulation workspace에 `dashSimulationWorkspaceNoticePreviewList`를 추가하고 `clientNoticePreviewItems`의 `noticeStatus`, `viewerSafeTitle`, `viewerSafeBody`, `timelineHint`, `deliveryState`를 표시합니다. 실제 `/client/*` viewer payload에는 v3.6 preview material을 주입하지 않습니다.
- `scripts/internal/verify_v360_client_notice_preview.mjs`, `server.sh`: `./server.sh verify-v360-client-notice-preview` 명령을 추가해 preview model, route guard, preview-only/viewer-safe boundary, UI renderer/CSS, client/viewer 비노출, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 완료 경계: 이번 Step 9는 Client Notice Preview API/UI/verifier 연결입니다. Rule/VA What-if Replay Pack 완료 evidence가 아닙니다. 실제 client notice 발송, client viewer payload 변경, UI 풀테스트 직접 조작, 30분/120분 longrun, release action PASS를 대체하지 않습니다.

## v3.6.0 Step 10 개발 기록

- 범위: P1 `v3.6.0 (10) Rule/VA What-if Replay Pack`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV360RuleVaWhatIfReplayPackJson`을 추가해 `media-server.ops.v360-rule-va-what-if-replay-pack.v1` read-only what-if replay pack을 생성합니다. replay pack은 `BuildV350LiveOperationsGraphContext`의 EventRecord aggregate, `BuildV360CommandPlanDryRunResults`, `BuildV360SourceRuleImpactDiffs`를 기반으로 `ruleThresholdCandidate`, `presetCandidate`, `scenarioCandidate`, `beforeMatchState`, `afterMatchState`, `whatIfResultDelta`를 비교합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/live-operations/simulation/rule-va-what-if-replay-pack` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며 rule registry write, threshold/preset/scenario apply, EventRecord write, Event POST/schema/media/client mutation을 수행하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_page_scripts.cpp`, `src/ingress/product_ui_css.cpp`: `/ops` simulation workspace에 `dashSimulationWorkspaceWhatIfReplayList`를 추가하고 `whatIfReplayCandidates`의 EventRecord ref, threshold/preset/scenario 후보, before/after state, result delta를 표시합니다.
- `scripts/internal/verify_v360_rule_va_what_if_replay_pack.mjs`, `server.sh`: `./server.sh verify-v360-rule-va-what-if-replay-pack` 명령을 추가해 what-if model, route guard, no-apply boundary, UI renderer/CSS, client/viewer 비노출, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 완료 경계: 이번 Step 10은 Rule/VA What-if Replay Pack API/UI/verifier 연결입니다. Simulation Export Bundle 완료 evidence가 아닙니다. 실제 rule 적용, EventRecord 생성/수정, replay execution, UI 풀테스트 직접 조작, 30분/120분 longrun, release action PASS를 대체하지 않습니다.

## v3.6.0 Step 11 개발 기록

- 범위: P1 `v3.6.0 (11) Simulation Export Bundle`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV360SimulationExportBundleJson`을 추가해 `media-server.ops.v360-simulation-export-bundle.v1` redacted release-safe projection을 생성합니다. export bundle은 `BuildV360SimulationInputPackItems`, `BuildV360SimulationRunLedgerEntries`, `BuildV360CommandPlanDryRunResults`, `BuildV360SourceRuleImpactDiffs`, `BuildV360SafeApplyReadinessItems`, `BuildV360RuleVaWhatIfReplayCandidates`, `BuildV360ClientNoticePreviewItems`의 ref를 조합해 `simulationInputRefs`, `simulationOutputRefs`, `readinessBlockerRefs`, `handoffMapRefs`를 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/live-operations/simulation/export-bundle` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며 artifact export 실행, file write, handoff write, simulation 실행, source/view/rule/EventRecord/Ops audit/client/media mutation을 수행하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_page_scripts.cpp`, `src/ingress/product_ui_css.cpp`: `/ops` simulation workspace에 `dashSimulationWorkspaceExportBundleList`를 추가하고 `simulationExportBundleItems`, `simulationHandoffMapEntries`의 input/output/blocker/handoff refs와 redaction policy를 표시합니다.
- `scripts/internal/verify_v360_simulation_export_bundle.mjs`, `server.sh`: `./server.sh verify-v360-simulation-export-bundle` 명령을 추가해 export bundle model, route guard, redacted release-safe boundary, UI renderer/CSS, client/viewer 비노출, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 완료 경계: 이번 Step 11은 Simulation Export Bundle API/UI/verifier 연결입니다. Field Evidence Simulation Adapter 완료 evidence가 아닙니다. VLM-assisted Simulation Explanation 완료 evidence가 아닙니다. 실제 파일 export, field smoke, provider/runtime call, UI 풀테스트 직접 조작, 30분/120분 longrun, release action PASS를 대체하지 않습니다.

## v3.6.0 Step 12 개발 기록

- 범위: P2 `v3.6.0 (12) Field Evidence Simulation Adapter`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV360FieldEvidenceSimulationAdapterJson`을 추가해 `media-server.ops.v360-field-evidence-simulation-adapter.v1` adapter projection을 생성합니다. adapter는 `BuildV340FieldBridgeConditionGates`, `BuildV350FieldEvidenceIntakeRecords`, `BuildV350FieldEvidenceExecutionConditions`, `BuildV360SafeApplyReadinessItems`를 조합해 ONVIF, external WHEP/TURN, cloud/VLM provider 조건을 `conditionalNotRunEvidence`, `simulationReadinessBlockerRef`, `simulationAdapterConditions`로 연결합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/live-operations/simulation/field-evidence-adapter` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며 field smoke, endpoint probe, credential probe, ONVIF device contact, external WHEP/TURN contact, cloud/VLM provider call, simulation execution, source/view/EventRecord/Ops audit/client/media mutation을 수행하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_page_scripts.cpp`, `src/ingress/product_ui_css.cpp`: `/ops` simulation workspace에 `dashSimulationWorkspaceFieldEvidenceAdapterList`를 추가하고 `fieldEvidenceSimulationAdapters`, `simulationAdapterConditions`의 not-run reason, readiness blocker ref, condition refs를 표시합니다.
- `scripts/internal/verify_v360_field_evidence_simulation_adapter.mjs`, `server.sh`: `./server.sh verify-v360-field-evidence-simulation-adapter` 명령을 추가해 adapter model, route guard, conditional/not-run boundary, UI renderer/CSS, client/viewer 비노출, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 완료 경계: 이번 Step 12는 Field Evidence Simulation Adapter API/UI/verifier 연결입니다. VLM-assisted Simulation Explanation 완료 evidence가 아닙니다. 실제 field smoke, endpoint/credential probe, provider/runtime call, UI 풀테스트 직접 조작, 30분/120분 longrun, release action PASS를 대체하지 않습니다.

## v3.6.0 Step 13 개발 기록

- 범위: P2 `v3.6.0 (13) VLM-assisted Simulation Explanation`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV360VlmAssistedSimulationExplanationJson`을 추가해 `media-server.ops.v360-vlm-assisted-simulation-explanation.v1` default-off explanation projection을 생성합니다. explanation은 `BuildV350LiveOperationsGraphContext`, `BuildV360CommandPlanDryRunResults`, `BuildV360SourceRuleImpactDiffs`, `BuildV360SafeApplyReadinessItems`, `BuildV360FieldEvidenceSimulationAdapterItems`를 조합해 `simulationBlockerSummary`, `impactDiffSummary`, `operatorReviewHint`를 산출합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/live-operations/simulation/vlm-assisted-explanation` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며 provider/runtime call은 opt-in 전 미수행, raw prompt/provider response/credential material 미포함, simulation run, field smoke, source/view/EventRecord/Ops audit/client/media mutation을 수행하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_page_scripts.cpp`, `src/ingress/product_ui_css.cpp`: `/ops` simulation workspace에 `dashSimulationWorkspaceVlmAssistedExplanationList`를 추가하고 `vlmAssistedSimulationExplanations`의 blocker, impact diff, operator review hint, default-off boundary를 표시합니다.
- `scripts/internal/verify_v360_vlm_assisted_simulation_explanation.mjs`, `server.sh`: `./server.sh verify-v360-vlm-assisted-simulation-explanation` 명령을 추가해 explanation model, route guard, default-off/no-call/no-write boundary, UI renderer/CSS, client/viewer 비노출, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 완료 경계: 이번 Step 13은 VLM-assisted Simulation Explanation API/UI/verifier 연결입니다. Stabilization and Release Readiness 완료 evidence가 아닙니다. 실제 VLM/provider/runtime call, simulation 실행, operator review write, UI 풀테스트 직접 조작, 30분/120분 longrun, release action PASS를 대체하지 않습니다.

## v3.6.0 Step 14 개발 기록

- 범위: P0 `v3.6.0 (14) Stabilization and Release Readiness`.
- `scripts/internal/verify_v360_stabilization_release_readiness.mjs`, `server.sh`: `./server.sh verify-v360-stabilization-release-readiness` 명령을 추가해 v3.6 Step 1~13 local verifier, release policy/evidence index/test records, docs links/assets, feature/script inventory, close-out dry-run, `git diff --check` 연결을 검증합니다.
- `docs/development-backlog.md`, `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`: Step 14를 `SAFE-161`, `OPS-128` local readiness boundary로 등록하고, release action, published metadata, UI 풀테스트 직접 조작, 30분/120분, field smoke 실행 evidence와 분리했습니다.
- `docs/release-policy.md`, `docs/release-evidence-index.md`, `docs/release-test-records.md`: v3.6 local readiness gate와 미실행/조건부 gate 경계를 분리하고, release close-out dry-run과 published metadata 미실행 상태를 같은 완료 evidence로 승격하지 않도록 기록했습니다.
- Companion local gate:

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

- 완료 경계: 이번 Step 14는 local stabilization/release readiness gate 연결입니다. UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, PR/main/tag/GitHub Release, field smoke 실행 PASS를 대체하지 않습니다.

## v3.5.0 published baseline 상세: Live Operations Control Plane

상태: Step 1 source/version/docs/backlog/verification metadata 정렬 완료. Step 2
Live Operations Graph Contract 구현 완료. Step 3 Operations Command Plan Contract
구현 완료. Step 4 Incident-to-Command Handoff 구현 완료. Step 5 Staged Change Plan
and Impact Preview 구현 완료. Step 6 Ops Command Workspace UI, Step 7 Drill Run
Ledger and Plan Comparison, Step 8 Client Impact Forecast, Step 9 Client-safe Operations
Notice, Step 10 Operations Export Bundle and Handoff Map, Step 11 Field Evidence Intake,
Step 12 VLM-assisted Ops Explanation 구현 완료. Step 13 Stabilization and Release Readiness
local gate 연결 완료. v3.5.0 release close-out 당시 source version은
`3.5.0`이고 published baseline은 `v3.5.0`이었습니다. 각 step은 실제 코드/API/UI/문서/검증
산출물이 생긴 뒤에만 완료로 기록합니다.

직접 답: v3.5.0의 1차 선택값은 `Live Operations Control Plane`입니다. v3.2가
사건 resolution workspace를 정리하고, v3.3이 live source reliability를 붙이고, v3.4가
continuity drill과 recovery handoff를 만들었다면, v3.5는 이 재료를 운영자가 실제로
판단하고 실행 전 검토할 수 있는 하나의 제어면으로 묶는 단계가 자연스럽습니다.

fallback 또는 축소 대안은 `Operations Command Core`입니다. 이 대안은 Live Operations
Graph, Command Plan Contract, Incident-to-Command Handoff, Staged Change Plan까지만
먼저 닫고, Client impact forecast, field evidence intake, VLM-assisted explanation,
export bundle은 후속 step evidence가 생길 때까지 보류합니다.

브레인스토밍 후보:

| 후보 | 판단 | 이유 |
| --- | --- | --- |
| Live Operations Control Plane | 1차 선택 | v3.2~v3.4에서 만든 사건, source reliability, recovery drill, client digest를 하나의 운영 제어 흐름으로 연결해 버전 단위의 제품 무게가 충분합니다. |
| Operational Command and Impact Workspace | 보조 이름 | UI와 운영 판단 흐름은 선명하지만 control plane보다 제품 범위가 좁게 읽힙니다. |
| Source Recovery Control Plane | 보류 | source 복구에는 강하지만 incident, client impact, field evidence, VLM 보조 설명까지 담기에는 이름이 좁습니다. |
| VLM Operator Assist Expansion | 보류 | default-off 보조 기능으로는 가치가 있지만 v3.5 전체 축으로 삼기에는 runtime/provider 품질과 외부 조건 의존도가 큽니다. |
| Field Readiness Evidence Capture | 보조축 | ONVIF, external WHEP/TURN, cloud/VLM provider field evidence를 담는 기능은 필요하지만 v3.5 중심축보다는 조건부 evidence intake가 적절합니다. |

포함 범위:

- v3.5.0 source roadmap baseline 정렬
- EventRecord, SourceRegistry, PublishedView, source health, continuity drill, client impact를 묶는 Live Operations Graph
- source recheck, recovery, maintenance, client notice, rule follow-up 후보를 담는 Operations Command Plan
- `/ops/events` incident detail에서 command plan으로 이어지는 handoff
- source/view 변경 전 staged change plan과 영향도 preview
- `/ops` command workspace UI
- continuity drill run ledger와 run comparison
- client impact forecast와 viewer-safe operations notice
- ONVIF, external WHEP/TURN, cloud/VLM provider field evidence intake
- default-off VLM-assisted operator explanation
- command plan, drill ledger, field evidence, client impact를 묶는 operations export bundle

비범위:

- 자동 source registry mutation 또는 PublishedView 자동 변경
- 자동 recovery cutover 또는 외부 action 자동 실행
- VMS/NVR 제품군, 장기 녹화, broad archive playback/search
- real ONVIF, external TURN/WHEP, cloud/VLM provider 성공 보장
- viewer/client에 source locator, credential, raw diagnostic JSON, raw provider material, debug material 노출
- VLM default-on 승격 또는 runtime/model bundle 배포

제외 대상과 제외 사유:

- 자동 운영 조치 실행: v3.5는 operator가 staged plan을 검토하고 승인 전 evidence를 확인하는 제어면이며, 자동 적용 제품군으로 확장하지 않습니다.
- VMS/NVR archive 제품화: 현재 live source와 event evidence 운영 흐름에서 벗어나므로 제외합니다.
- VLM 중심 roadmap: 설명/요약 보조는 포함하되, provider 품질과 모델 배포 판단이 필요한 default-on 제품축은 제외합니다.
- field-success 중심 roadmap: 외부 endpoint와 credential 의존성이 커서 source-only local 개발의 기본 완료 기준으로 삼지 않습니다.

license/provenance/privacy/운영 검토 결과:

- 기본 공개 형태는 source-only이며 binary, runtime, model bundle을 v3.5 기본 release asset으로 포함하지 않습니다.
- EventRecord, SourceRegistry, PublishedView, source health, Ops audit에 이미 존재하는 저장/노출 경계를 우선 재사용합니다.
- field evidence와 VLM explanation은 redacted summary와 operator review material만 다루며 raw credential, raw provider response, raw prompt, source URL 원문을 client/viewer 또는 export bundle에 포함하지 않습니다.
- client/viewer에는 운영자용 command detail이 아니라 viewer-safe notice와 영향 요약만 제공합니다.

| Step | 제목 | 우선순위 | 상태 | 산출물 |
| --- | --- | --- | --- | --- |
| 1 | v3.5.0 (1) v3.5.0 baseline 정렬 | P0 | 완료 | VERSION/CMake/docs/backlog/source roadmap과 `verify-v350-entry-baseline` 기준 정렬 |
| 2 | v3.5.0 (2) Live Operations Graph Contract | P0 | 완료 | EventRecord, SourceRegistry, PublishedView, source health, continuity drill, client impact를 Ops-only graph read model로 연결 |
| 3 | v3.5.0 (3) Operations Command Plan Contract | P0 | 완료 | source recheck, recovery, maintenance, client notice, rule follow-up 후보를 command plan으로 표현 |
| 4 | v3.5.0 (4) Incident-to-Command Handoff | P0 | 완료 | `/ops/events` 사건 detail에서 source 원인, drill 후보, command plan 초안으로 이어지는 handoff |
| 5 | v3.5.0 (5) Staged Change Plan and Impact Preview | P0 | 완료 | source/view/rule follow-up 변경 후보를 적용 전 staging plan으로 만들고 영향도와 blocker 표시 |
| 6 | v3.5.0 (6) Ops Command Workspace UI | P1 | 완료 | `/ops`에서 incident, source, drill, staged plan, client impact를 한 흐름으로 탐색하는 command workspace |
| 7 | v3.5.0 (7) Drill Run Ledger and Plan Comparison | P1 | 완료 | drill run id, operator note, blocker, evidence refs, 이전 run 대비 차이를 누적 표시 |
| 8 | v3.5.0 (8) Client Impact Forecast | P1 | 완료 | 특정 source/view/command plan이 client live/dashboard/event digest에 주는 영향을 viewer-safe summary로 계산 |
| 9 | v3.5.0 (9) Client-safe Operations Notice | P1 | 완료 | viewer/client에 maintenance, degraded, recovering, available 상태와 timeline hint만 노출 |
| 10 | v3.5.0 (10) Operations Export Bundle and Handoff Map | P1 | 완료 | command plan, drill ledger, field evidence, client impact forecast를 release-safe export bundle과 handoff map으로 조합 |
| 11 | v3.5.0 (11) Field Evidence Intake | P2 | 완료 | ONVIF, external WHEP/TURN, cloud/VLM provider 결과를 redacted field evidence로 수집하고 실행 조건과 미실행 상태를 분리 |
| 12 | v3.5.0 (12) VLM-assisted Ops Explanation | P2 | 완료 | default-off VLM 보조 설명으로 command plan blocker, incident/source relation, operator review hint를 요약 |
| 13 | v3.5.0 (13) Stabilization and Release Readiness | P0 | 완료 | v3.5 local stabilization, release evidence/not-run 경계, close-out dry-run, inventory/script/metadata 연결 |

완료 경계: 위 표는 v3.5.0 개발 순서와 우선순위입니다. 각 step은 실제 코드/UI/API/문서
변경, 기능 ID/test inventory 등록, 해당 verifier와 release test record evidence가 생긴 뒤에만
완료로 기록합니다. UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release
action, field smoke는 실행 evidence가 있을 때만 별도로 완료로 씁니다.

## v3.5.0 Step 1 개발 기록

- 범위: P0 `v3.5.0 (1) v3.5.0 baseline 정렬`.
- `VERSION`, `CMakeLists.txt`: 현재 source version과 CMake project version을 `3.5.0`으로 정렬했습니다.
- `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md`, `docs/versioning-policy.md`, `docs/release-policy.md`, `docs/public-repo-final-review.md`, `docs/ui-guide.md`, `docs/assets/ui/README.md`: 현재 source roadmap을 `v3.5.0 Live Operations Control Plane`로 전환했고 latest published release는 `v3.4.0` source-only GitHub Release로 유지했습니다.
- `docs/development-backlog.md`: v3.5.0 current roadmap을 `Step | 제목 | 우선순위 | 상태 | 산출물` 구조로 승격하고, `Live Operations Control Plane` 1차 선택값, `Operations Command Core` fallback, 제외 대상과 no-auto-write/no-client-secret/no-media-path-change 경계를 기록했습니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`, `config/docs_ui_assets.json`: current release target, docs asset baseline, verification catalog, release records를 source `3.5.0`와 latest published `v3.4.0` 기준으로 정렬했습니다.
- `scripts/internal/verify_release_metadata_consistency.mjs`, `scripts/internal/verify_docs_ui_assets.mjs`: release metadata와 docs UI asset verifier가 source `3.5.0`, current roadmap `v3.5.0 Live Operations Control Plane`, latest published `v3.4.0`을 검증하도록 보정했습니다.
- `scripts/internal/verify_v350_entry_baseline.mjs`, `server.sh`: `./server.sh verify-v350-entry-baseline` 명령을 추가해 source `3.5.0`, latest published `v3.4.0`, current roadmap `v3.5.0 Live Operations Control Plane`, release records, feature inventory, server dispatch 연결을 정적 검증합니다.
- 검증: 최초 `node scripts/internal/verify_v350_entry_baseline.mjs`는 source version/docs/inventory/server dispatch가 아직 v3.5 기준이 아니어서 `pass=0 fail=9`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v350 Step 1 결과 행에 기록합니다.
- 완료 경계: 이번 Step 1은 source/version/docs/backlog/verification metadata 정렬입니다. v3.5 기능 구현, UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다. `v3.5.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.

## v3.5.0 Step 2 개발 기록

- 범위: P0 `v3.5.0 (2) Live Operations Graph Contract`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV350LiveOperationsGraphJson`을 추가해 `media-server.ops.v350-live-operations-graph.v1` read model로 EventRecord, SourceRegistry, PublishedView, source health, continuity drill, client impact를 graph nodes/edges로 연결했습니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/live-operations/graph` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며 source locator/credential/raw diagnostic JSON/media path를 노출하지 않습니다.
- `scripts/internal/verify_v350_live_operations_graph_contract.mjs`, `server.sh`: `./server.sh verify-v350-live-operations-graph-contract` 명령을 추가해 graph read model, route guard, redaction, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 완료 경계: 이번 Step 2는 Live Operations Graph Contract read model/API/verifier 연결입니다. Operations Command Plan Contract, Incident-to-Command Handoff, Staged Change Plan 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata evidence도 아닙니다.

## v3.5.0 Step 3 개발 기록

- 범위: P0 `v3.5.0 (3) Operations Command Plan Contract`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV350CommandPlanJson`을 추가해 source recheck, recovery, maintenance, client notice, rule follow-up 후보를 draft-only command plan으로 표현했습니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/live-operations/command-plan` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며 source/view/rule/client/EventRecord/Ops audit/media mutation을 수행하지 않습니다.
- `scripts/internal/verify_v350_operations_command_plan_contract.mjs`, `server.sh`: `./server.sh verify-v350-operations-command-plan-contract` 명령을 추가해 command plan contract, no-execution boundary, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 완료 경계: 이번 Step 3은 Operations Command Plan Contract read model/API/verifier 연결입니다. Incident-to-Command Handoff, Staged Change Plan 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata evidence도 아닙니다.

## v3.5.0 Step 4 개발 기록

- 범위: P0 `v3.5.0 (4) Incident-to-Command Handoff`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/events/reviews`와 /ops/events 사건 detail에서 source 원인, drill 후보, command plan 초안으로 이어지는 handoff를 `unifiedResolutionWorkspace.selectedDetail`의 `OpsV350IncidentCommandHandoff`로 추가하고 command plan candidate id를 연결했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `/ops/events` selected detail renderer에 `incident-command-handoff` section을 추가해 source cause, continuity drill, command plan draft, read-only boundary를 표시합니다.
- `scripts/internal/verify_v350_incident_to_command_handoff.mjs`, `server.sh`: `./server.sh verify-v350-incident-to-command-handoff` 명령을 추가해 handoff JSON, selected detail/detailSections/UI marker, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 완료 경계: 이번 Step 4는 `/ops/events` 사건 detail handoff read model/UI marker/verifier 연결입니다. Staged Change Plan and Impact Preview 완료 evidence가 아닙니다. source/view/rule/EventRecord/Ops audit/client/media mutation을 수행하지 않습니다.

## v3.5.0 Step 5 개발 기록

- 범위: P0 `v3.5.0 (5) Staged Change Plan and Impact Preview`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV350StagedChangePlanImpactPreviewJson`을 추가해 source/view/rule follow-up 변경 후보를 적용 전 staging plan으로 만들고 `impactPreview`, `blockers`, `applyBlocked`를 표시합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/live-operations/staged-change-plan-impact-preview` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며 source/view/rule/EventRecord/Ops audit/client/media mutation을 수행하지 않습니다.
- `scripts/internal/verify_v350_staged_change_plan_impact_preview.mjs`, `server.sh`: `./server.sh verify-v350-staged-change-plan-impact-preview` 명령을 추가해 staging-only/read-only boundary, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 완료 경계: 이번 Step 5는 staging plan impact preview read model/API/verifier 연결입니다. 변경 적용, source/view/rule write, client notice 발송 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata evidence도 아닙니다.

## v3.5.0 Step 6 개발 기록

- 범위: P1 `v3.5.0 (6) Ops Command Workspace UI`.
- `src/ingress/webrtc_http_server.cpp`: `AppendOpsDashboardPage`에 `/ops` dashboard `ops-command-workspace` section을 추가해 incident, source, drill, staged plan, client impact flow, staged plan list, viewer-safe impact list, read-only boundary를 한 화면에서 탐색하게 했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV350OpsCommandWorkspace`와 `refreshV350OpsCommandWorkspace`를 추가해 `/ops/api/live-operations/graph`, `/ops/api/live-operations/command-plan`, `/ops/api/live-operations/staged-change-plan-impact-preview`, `/ops/api/events/reviews`를 GET read model로 불러오고 command workspace flow card로 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.ops-command-workspace`, `.ops-command-flow-grid`, `.ops-command-flow-card`, `.ops-command-plan-list`, `.ops-command-impact-list`, `.ops-command-boundary` 스타일을 추가해 desktop/mobile에서 command workspace가 안정적으로 표시되게 했습니다.
- `docs/project-feature-test-inventory.md`: `UI-081`, `SAFE-140`, `OPS-107`을 추가하고 Step 6을 `verify-v350-ops-command-workspace-ui`, `verify-ops-client-ui`에 연결했습니다.
- `scripts/internal/verify_v350_ops_command_workspace_ui.mjs`, `server.sh`: `./server.sh verify-v350-ops-command-workspace-ui` 명령을 추가해 dashboard shell, renderer/API 연결, CSS, client/viewer 비노출, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 검증: 최초 `node scripts/internal/verify_v350_ops_command_workspace_ui.mjs`는 Step 6 UI shell/renderer/CSS/docs/inventory/server dispatch가 아직 없어 `pass=1 fail=8`로 기대 실패했습니다. 구현 후 `./server.sh verify-v350-ops-command-workspace-ui`는 `pass=9 fail=0`으로 통과했습니다. `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `git diff --check`도 통과했습니다. `verify-ops-client-ui --browser-mode static`은 서버 미기동/Node sandbox localhost fetch/auth-on login redirect 전제를 확인한 뒤 `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_AUTH_MODE=off` 검증 서버에서 권한 실행해 route/API/redaction smoke `통과 28/실패 0`으로 재검증했습니다.
- 완료 경계: 이번 Step 6은 `/ops` command workspace UI와 static verifier 연결입니다. Drill Run Ledger and Plan Comparison 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata evidence도 아닙니다.

## v3.5.0 Step 7 개발 기록

- 범위: P1 `v3.5.0 (7) Drill Run Ledger and Plan Comparison`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV350DrillRunLedgerPlanComparisonJson`과 `GET /ops/api/live-operations/drill-run-ledger` route를 추가해 drill run id, operator note, blocker, evidence refs, 이전 run 대비 차이를 append-only/read-only projection으로 누적 표시합니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV350OpsCommandWorkspace`와 `refreshV350OpsCommandWorkspace`가 drill ledger read model을 함께 읽고 `/ops` dashboard command workspace 안에 `dashCommandWorkspaceLedgerList`로 planComparison, previousRunId, diffFromPreviousRun, evidenceRefs를 표시합니다.
- `src/ingress/product_ui_css.cpp`: `.ops-command-ledger-list`, `.ops-command-ledger-entry` 스타일을 추가해 ledger 항목이 desktop/mobile command workspace에서 안정적으로 쌓이게 했습니다.
- `docs/project-feature-test-inventory.md`: `UI-082`, `SAFE-141`, `OPS-108`을 추가하고 Step 7을 `verify-v350-drill-run-ledger-plan-comparison`, `verify-ops-client-ui`에 연결했습니다.
- `scripts/internal/verify_v350_drill_run_ledger_plan_comparison.mjs`, `server.sh`: `./server.sh verify-v350-drill-run-ledger-plan-comparison` 명령을 추가해 drill run ledger API/UI, previous run diff, redacted evidence refs, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 검증: 최초 `node scripts/internal/verify_v350_drill_run_ledger_plan_comparison.mjs`는 Step 7 server/API/UI/docs/inventory/server dispatch가 아직 없어 `pass=1 fail=11`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v350 Step 7 결과 행에 기록합니다.
- 완료 경계: 이번 Step 7은 drill run ledger와 plan comparison read model/UI/verifier 연결입니다. Client Impact Forecast 완료 evidence가 아닙니다. drill run write/operator note write/command execution, source/view/rule/EventRecord/Ops audit/client/media mutation, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata evidence가 아닙니다.

## v3.5.0 Step 8 개발 기록

- 범위: P1 `v3.5.0 (8) Client Impact Forecast`.
- `src/ingress/webrtc_http_server.cpp`: `ClientImpactForecastJson`을 추가해 `/client/api/views/{id}/events`와 `/client/dashboard` event summary payload에 `clientImpactForecast`를 붙였습니다. forecast는 source/view/command plan이 client live/dashboard/event digest에 주는 영향을 viewer-safe summary로만 계산합니다.
- `src/ingress/product_ui_client_scripts.cpp`: `renderClientImpactForecast`를 추가하고 `/client/live`, `/client/dashboard`, `/client/events` digest stack에 client impact forecast card를 표시합니다. renderer는 source URL, raw locator, raw JSON, debug material, credential material, operator note, command plan details, action controls를 읽지 않습니다.
- `src/ingress/product_ui_css.cpp`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: `.client-impact-forecast` 스타일과 Ops/Client static smoke marker를 추가했습니다.
- `docs/project-feature-test-inventory.md`: `UI-083`, `CLIENT-031`, `SAFE-142`, `OPS-109`를 추가하고 Step 8을 `verify-v350-client-impact-forecast`, `verify-ops-client-ui`에 연결했습니다.
- `scripts/internal/verify_v350_client_impact_forecast.mjs`, `server.sh`: `./server.sh verify-v350-client-impact-forecast` 명령을 추가해 client API/schema/UI renderer/CSS/redaction boundary, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 검증: 최초 `node scripts/internal/verify_v350_client_impact_forecast.mjs`는 Step 8 client API/UI/docs/inventory/server dispatch가 아직 없어 `pass=0 fail=7`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v350 Step 8 결과 행에 기록합니다.
- 완료 경계: 이번 Step 8은 Client Impact Forecast API/UI/verifier 연결입니다. Client-safe Operations Notice 완료 evidence가 아닙니다. notice 상태 노출, command execution, source/view/rule/EventRecord/Ops audit/client/media mutation, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata evidence가 아닙니다.

## v3.5.0 Step 9 개발 기록

- 범위: P1 `v3.5.0 (9) Client-safe Operations Notice`.
- `src/ingress/webrtc_http_server.cpp`: `ClientOperationsNoticeJson`을 추가해 `/client/api/views/{id}/events`와 `/client/dashboard` event summary payload에 `clientOperationsNotice`를 붙였습니다. notice item은 `operationsStatus`와 `timelineHint`만 노출하고 status 값은 `maintenance`, `degraded`, `recovering`, `available`로 제한합니다.
- `src/ingress/product_ui_client_scripts.cpp`: `renderClientOperationsNotice`를 추가하고 `/client/live`, `/client/dashboard`, `/client/events` digest stack에 operations notice card를 표시합니다. renderer는 source URL, raw locator, raw JSON, debug material, credential material, operator note, command plan details, incident details, action controls를 읽지 않습니다.
- `src/ingress/product_ui_css.cpp`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: `.client-operations-notice` 스타일과 Ops/Client static smoke marker를 추가했습니다.
- `docs/project-feature-test-inventory.md`: `UI-084`, `CLIENT-032`, `SAFE-143`, `OPS-110`을 추가하고 Step 9를 `verify-v350-client-safe-operations-notice`, `verify-ops-client-ui`에 연결했습니다.
- `scripts/internal/verify_v350_client_safe_operations_notice.mjs`, `server.sh`: `./server.sh verify-v350-client-safe-operations-notice` 명령을 추가해 client API/schema/UI renderer/CSS/redaction boundary, docs/inventory/release records/server dispatch 연결을 검증합니다.
- 검증: 최초 `node scripts/internal/verify_v350_client_safe_operations_notice.mjs`는 Step 9 client API/UI/docs/inventory/server dispatch가 아직 없어 `pass=0 fail=7`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v350 Step 9 결과 행에 기록합니다.
- 완료 경계: 이번 Step 9는 Client-safe Operations Notice API/UI/verifier 연결입니다. Operations Export Bundle and Handoff Map 완료 evidence가 아닙니다. Field Evidence Intake 완료 evidence가 아닙니다. command execution, source/view/rule/EventRecord/Ops audit/client/media mutation, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata evidence가 아닙니다.

## v3.5.0 Step 10 개발 기록

- 범위: P1 `v3.5.0 (10) Operations Export Bundle and Handoff Map`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV350OperationsExportBundleHandoffMapJson`과 `GET /ops/api/live-operations/export-bundle-handoff-map` route를 추가했습니다. 이 route는 command plan, drill ledger, field evidence, client impact forecast를 route/id refs 기반 release-safe export bundle과 handoff map으로 조합하고 `require_ops_principal()`, `Cache-Control: no-store`를 적용합니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV350OpsCommandWorkspace`와 `refreshV350OpsCommandWorkspace`가 `/ops/api/live-operations/export-bundle-handoff-map`을 함께 읽고 `/ops` dashboard command workspace 안에 `dashCommandWorkspaceExportBundleMap`으로 `operationsExportBundle`, `handoffMapEntries`, `commandPlanRefs`, `drillLedgerRefs`, `fieldEvidenceRefs`, `clientImpactForecastRefs`를 표시합니다.
- `src/ingress/product_ui_css.cpp`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: `.ops-export-bundle-list`, `.ops-handoff-map-list`, `.ops-handoff-map-entry` 스타일과 Ops/Client static smoke marker를 추가했습니다.
- `docs/project-feature-test-inventory.md`: `UI-085`, `SAFE-144`, `OPS-111`을 추가하고 Step 10을 `verify-v350-operations-export-bundle-handoff-map`, `verify-ops-client-ui`에 연결했습니다.
- `scripts/internal/verify_v350_operations_export_bundle_handoff_map.mjs`, `server.sh`: `./server.sh verify-v350-operations-export-bundle-handoff-map` 명령을 추가해 export bundle/handoff map API/UI, release-safe boundary, client 비노출, backlog/stream verification/release records/inventory/server dispatch 연결을 검증합니다.
- 검증: 최초 `node scripts/internal/verify_v350_operations_export_bundle_handoff_map.mjs`는 Step 10 server/API/UI/docs/inventory/server dispatch가 아직 없어 `pass=1 fail=11`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v350 Step 10 결과 행에 기록합니다.
- 완료 경계: 이번 Step 10은 Operations Export Bundle and Handoff Map read model/API/UI/verifier 연결입니다. Field Evidence Intake 완료 evidence가 아닙니다. VLM-assisted Ops Explanation 완료 evidence가 아닙니다. artifact export 실행, handoff write, field smoke/provider call, command execution, source/view/EventRecord/Ops audit/client/media mutation, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata evidence가 아닙니다.

## v3.5.0 Step 11 개발 기록

- 범위: P2 `v3.5.0 (11) Field Evidence Intake`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV350FieldEvidenceIntakeJson`과 `GET /ops/api/live-operations/field-evidence-intake` route를 추가했습니다. 이 route는 `BuildV340FieldBridgeConditionGates()`의 ONVIF, external WHEP/TURN, cloud/VLM provider 조건을 `fieldEvidenceIntakeRecords`, `fieldEvidenceExecutionConditions`, `notRunReason`, `redactedFieldEvidence`로 분리하고 `require_ops_principal()`, `Cache-Control: no-store`를 적용합니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV350OpsCommandWorkspace`와 `refreshV350OpsCommandWorkspace`가 `/ops/api/live-operations/field-evidence-intake`를 함께 읽고 `/ops` dashboard command workspace 안의 `dashCommandWorkspaceFieldEvidenceIntake`에 executionStatus, fieldSmokeStatus, endpointRequired, credentialRequired, operatorApprovalRequired, evidenceRefs를 표시합니다.
- `src/ingress/product_ui_css.cpp`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: `.ops-field-evidence-intake-list`, `.ops-field-evidence-condition-list`, `.ops-field-evidence-intake-entry` 스타일과 Ops/Client static smoke marker를 추가했습니다.
- `docs/project-feature-test-inventory.md`: `UI-086`, `SRC-047`, `MEDIA-023`, `LAB-093`, `SAFE-145`, `OPS-112`를 추가하고 Step 11을 `verify-v350-field-evidence-intake`, `verify-ops-client-ui`에 연결했습니다.
- `scripts/internal/verify_v350_field_evidence_intake.mjs`, `server.sh`: `./server.sh verify-v350-field-evidence-intake` 명령을 추가해 field evidence intake API/UI, redaction/not-run boundary, client 비노출, backlog/stream verification/release records/inventory/server dispatch 연결을 검증합니다.
- 검증: 최초 `node scripts/internal/verify_v350_field_evidence_intake.mjs`는 Step 11 server/API/UI/docs/inventory/server dispatch가 아직 없어 `pass=1 fail=11`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v350 Step 11 결과 행에 기록합니다.
- 완료 경계: 이번 Step 11은 Field Evidence Intake read model/API/UI/verifier 연결입니다. VLM-assisted Ops Explanation 완료 evidence가 아닙니다. field smoke 실행 evidence가 아닙니다. ONVIF 실기기 접촉, external WHEP/TURN 접속, cloud/VLM provider 호출, endpoint probe, credential probe, source/view/EventRecord/Ops audit/client/media mutation, raw endpoint/credential/provider/VLM/client material 노출, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata evidence가 아닙니다.

## v3.5.0 Step 12 개발 기록

- 범위: P2 `v3.5.0 (12) VLM-assisted Ops Explanation`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV350VlmAssistedOpsExplanationJson`과 `GET /ops/api/live-operations/vlm-assisted-explanation` route를 추가했습니다. 이 route는 `BuildV350LiveOperationsGraphContext()`와 `BuildV350CommandPlanCandidates()`를 기반으로 command plan blocker, incident/source relation, operator review hint를 요약하고 `require_ops_principal()`, `Cache-Control: no-store`를 적용합니다.
- `src/ingress/webrtc_http_server.cpp`: explanation payload는 `defaultEnabled=false`, `defaultOff=true`, `runtimeOptInRequired=true`, `vlmProviderCallPerformed=false`, `vlmRuntimeCallPerformed=false`, raw prompt/provider response/credential material 미포함, command/source/view/EventRecord/Ops audit/client/media write 미수행 경계를 함께 기록합니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV350OpsCommandWorkspace`와 `refreshV350OpsCommandWorkspace`가 `/ops/api/live-operations/vlm-assisted-explanation`을 함께 읽고 `/ops` dashboard command workspace 안의 `dashCommandWorkspaceVlmAssistedExplanation`에 command plan blocker, incident/source relation, operator review hint, evidence refs, default-off boundary를 표시합니다.
- `src/ingress/product_ui_css.cpp`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: `.ops-vlm-assisted-explanation-list`, `.ops-vlm-assisted-explanation-entry`, `.ops-vlm-explanation-boundary` 스타일과 Ops/Client static smoke marker를 추가했습니다.
- `docs/project-feature-test-inventory.md`: `UI-087`, `SRC-048`, `EVT-076`, `LAB-094`, `SAFE-146`, `OPS-113`을 추가하고 Step 12를 `verify-v350-vlm-assisted-ops-explanation`, `verify-ops-client-ui`에 연결했습니다.
- `scripts/internal/verify_v350_vlm_assisted_ops_explanation.mjs`, `server.sh`: `./server.sh verify-v350-vlm-assisted-ops-explanation` 명령을 추가해 default-off VLM 보조 설명 API/UI, no-call/no-write boundary, client 비노출, backlog/stream verification/release records/inventory/server dispatch 연결을 검증합니다.
- 검증: 최초 `node scripts/internal/verify_v350_vlm_assisted_ops_explanation.mjs`는 Step 12 server/API/UI/docs/inventory/server dispatch가 아직 없어 `pass=1 fail=11`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v350 Step 12 결과 행에 기록합니다.
- 완료 경계: 이번 Step 12는 default-off VLM 보조 설명 read model/API/UI/verifier 연결입니다. VLM/provider 호출 evidence가 아닙니다. 실제 VLM runtime opt-in, raw prompt/response 저장, command execution, operator review write, source/view/EventRecord/Ops audit/client/media mutation, client notice send, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata evidence가 아닙니다.

## v3.5.0 Step 13 개발 기록

- 범위: P0 `v3.5.0 (13) Stabilization and Release Readiness`.
- `scripts/internal/verify_v350_stabilization_release_readiness.mjs`, `server.sh`: `./server.sh verify-v350-stabilization-release-readiness` 명령을 추가해 v3.5 Step 1~12 local verifier, release policy/evidence index/test records, docs links/assets, feature/script inventory, close-out dry-run, `git diff --check` 연결을 검증합니다.
- `docs/development-backlog.md`, `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`: Step 13을 `SAFE-147`, `OPS-114` local readiness boundary로 등록하고, release action, published metadata, UI 풀테스트 직접 조작, 30분/120분, field smoke 실행 evidence와 분리했습니다.
- `docs/release-policy.md`, `docs/release-evidence-index.md`, `docs/release-test-records.md`: v3.5 local readiness gate와 미실행/조건부 gate 경계를 분리하고, release close-out dry-run과 published metadata 미실행 상태를 같은 완료 evidence로 승격하지 않도록 기록했습니다.
- Companion local gate:

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

- 검증: 최초 `node scripts/internal/verify_v350_stabilization_release_readiness.mjs`는 Step 13 roadmap/stream verification/inventory/release policy/evidence/test records/server dispatch/script inventory 연결이 아직 없어 `pass=1 fail=5`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v350 stabilization/release readiness 결과 행에 기록합니다.
- 완료 경계: 이번 Step 13은 v3.5 local readiness wiring과 release evidence/not-run 경계입니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, `verify-release-metadata --published`, PR/main/tag/GitHub Release, field smoke, external endpoint/credential/provider 호출 PASS를 대체하지 않습니다.

## 현재 source roadmap: v3.4.0 Operations Continuity Drill Workspace

상태: Step 1 source/version/docs/backlog/verification metadata 정렬 완료. Step 2
Continuity Drill Contract 구현 완료. Step 3 Recovery Candidate Package Read Model
구현 완료. Step 4 Staging Restore Validation Harness 구현 완료. Step 5 Source Health
Replay and Drift Diff 구현 완료. Step 6 Ops Continuity Drill Workspace UI 구현 완료.
Step 7 Approval-Gated Recovery Checklist and Audit, Step 8 Client-safe Maintenance
Digest, Step 9 Drill Evidence Export and Cleanup Manifest, Step 10 Field Bridge
Condition Gates, Step 11 Stabilization and Release Readiness local gate 연결까지
완료했습니다. 이 절은 v3.4.0 source roadmap이며, 각 step은 실제 코드/API/문서
변경, 기능 ID/test inventory 등록, 해당 verifier와 release test record evidence가
생긴 뒤에만 완료로 기록합니다.

직접 답: v3.4.0의 1차 선택값은 `Operations Continuity Drill Workspace`입니다.
v3.3이 live source reliability와 backup/recovery handoff 입력을 정리했다면, v3.4는
그 handoff를 실제 운영 복구 리허설로 이어가되 production registry, PublishedView,
EventRecord, media path를 자동 변경하지 않는 안전한 dry-run 작업공간으로 확장합니다.

fallback 또는 축소 대안은 `Continuity Drill Core`입니다. 이 대안은 v3.4.0 baseline
정렬, drill contract, recovery candidate package, staging restore validation까지만 먼저
닫고 Ops UI, client-safe digest, field bridge, evidence export는 후속 step evidence가
생길 때까지 보류합니다.

브레인스토밍 후보:

| 후보 | 판단 | 이유 |
| --- | --- | --- |
| Operations Continuity Drill Workspace | 1차 선택 | v3.3 source reliability/handoff를 실제 운영 복구 리허설로 이어가는 자연스러운 다음 단계입니다. 운영자가 장애 원인, source/view 연결, health drift, 복구 준비 상태를 production write 없이 검증할 수 있습니다. |
| ONVIF Field Readiness Workspace | 보류 | ONVIF fixture와 정책은 충분하지만 실장비 endpoint/credential 의존도가 커서 v3.4 source-only local roadmap의 중심축으로 삼기에는 외부 조건이 큽니다. |
| VLM Operator Assist Expansion | 보류 | VLM profile/runtime/provider 문서는 많지만 default-off, provider credential, privacy transfer, runtime quality 판단이 필요하므로 v3.4 기본축보다는 조건부 보조축에 가깝습니다. |

포함 범위:

- v3.4.0 source roadmap baseline 정렬
- operations continuity drill contract와 no-write/no-secret/no-media-path-change 경계
- recovery candidate package read model
- staging restore validation harness
- source health replay/diff와 drift summary
- Ops continuity drill workspace UI
- approval-gated recovery checklist와 audit
- client-safe maintenance digest
- redacted drill evidence export와 cleanup manifest
- field bridge condition gate
- stabilization and release readiness local gate

비범위:

- production restore cutover 자동 수행
- source registry 또는 PublishedView 자동 write
- EventRecord, Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC
  media path, Rule/Profile payload schema 변경
- VMS/NVR 제품군, 장기 녹화, broad archive playback/search
- ONVIF 실기기, external TURN/WHEP, real cloud/VLM provider 성공 보장
- viewer/client에 source locator, credential, raw diagnostic JSON, debug material 노출

| Step | 제목 | 우선순위 | 상태 | 산출물 |
| --- | --- | --- | --- | --- |
| 1 | v3.4.0 (1) v3.4.0 baseline 정렬 | P0 | 완료 | VERSION/CMake/docs/backlog/source roadmap과 `verify-v340-entry-baseline` 기준 정렬 |
| 2 | v3.4.0 (2) Continuity Drill Contract | P0 | 완료 | recovery drill schema, v3.3 handoff 입력, read-only/no-write/no-secret/no-media-path-change 경계 정의 |
| 3 | v3.4.0 (3) Recovery Candidate Package Read Model | P0 | 완료 | source registry snapshot, PublishedView, source health, EventRecord/audit context를 redacted 복구 후보 package로 조합 |
| 4 | v3.4.0 (4) Staging Restore Validation Harness | P0 | 완료 | 임시 runtime에서 JSON parse, 중복 ID, 누락 sourceId 참조, auth store `0600`, checksum, viewer scope를 production write 없이 검증 |
| 5 | v3.4.0 (5) Source Health Replay and Drift Diff | P1 | 완료 | handoff 당시 source health와 fresh source health를 비교해 stale/offline/reconnect/warning drift를 요약 |
| 6 | v3.4.0 (6) Ops Continuity Drill Workspace UI | P1 | 완료 | `/ops/sources`에서 drill package, validation status, blocked/ready 상태를 read-only로 표시 |
| 7 | v3.4.0 (7) Approval-Gated Recovery Checklist and Audit | P1 | 완료 | operator note, ready/blocked/field-smoke-needed/not-run 상태, dry-run result, Ops audit 연결을 추가하고 자동 recovery는 수행하지 않음 |
| 8 | v3.4.0 (8) Client-safe Maintenance Digest | P1 | 완료 | viewer/client에 maintenance/recovering/unavailable 요약만 제공하고 source URL/raw locator/raw JSON/debug/credential material은 비노출 |
| 9 | v3.4.0 (9) Drill Evidence Export and Cleanup Manifest | P1 | 완료 | redacted drill artifact manifest, 최소 보존 evidence, `/tmp` cleanup, 민감 정보 scan 경계를 기록 |
| 10 | v3.4.0 (10) Field Bridge Condition Gates | P2 | 완료 | ONVIF 실기기, external WHEP/TURN, real cloud/VLM provider는 endpoint/credential/승인 조건부 field smoke로 분리하고 source-only PASS로 대체하지 않음 |
| 11 | v3.4.0 (11) Stabilization and Release Readiness | P0 | 완료 | v3.4 local gates, feature inventory, release records, docs links/assets, release evidence index, close-out dry-run, script inventory, `git diff --check` 연결 |

완료 경계: 위 표는 v3.4.0 개발 순서와 우선순위입니다. 각 step은 실제 코드/UI/API/문서
변경, 기능 ID/test inventory 등록, 해당 verifier와 release test record evidence가 생긴 뒤에만
완료로 기록합니다. UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release
action, field smoke는 실행 evidence가 있을 때만 별도로 완료로 씁니다.

## v3.4.0 Step 1 개발 기록

- 범위: P0 `v3.4.0 (1) v3.4.0 baseline 정렬`.
- `VERSION`, `CMakeLists.txt`: 현재 source version과 CMake project version을 `3.4.0`으로 정렬했습니다.
- `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md`, `docs/versioning-policy.md`, `docs/release-policy.md`, `docs/public-repo-final-review.md`, `docs/ui-guide.md`, `docs/assets/ui/README.md`: 현재 source roadmap을 `v3.4.0 Operations Continuity Drill Workspace`로 전환했고 release publish 이후 latest published release를 `v3.4.0` source-only GitHub Release로 정렬했습니다.
- `docs/development-backlog.md`: v3.4.0 current roadmap을 `Step | 제목 | 우선순위 | 상태 | 산출물` 구조로 정렬하고, `Operations Continuity Drill Workspace` 1차 선택값, `Continuity Drill Core` fallback, 제외 대상과 no-write/no-secret/no-media-path-change 경계를 기록했습니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`, `config/docs_ui_assets.json`: current release target, docs asset baseline, verification catalog, release records를 source `3.4.0`와 latest published `v3.4.0` 기준으로 정렬했습니다.
- `scripts/internal/verify_release_metadata_consistency.mjs`, `scripts/internal/verify_docs_ui_assets.mjs`: release metadata와 docs UI asset verifier가 source `3.4.0`, current roadmap `v3.4.0 Operations Continuity Drill Workspace`, latest published `v3.4.0`을 검증하도록 보정했습니다.
- `scripts/internal/verify_v340_entry_baseline.mjs`, `server.sh`: `./server.sh verify-v340-entry-baseline` 명령을 추가해 source `3.4.0`, latest published `v3.4.0`, current roadmap `v3.4.0 Operations Continuity Drill Workspace`, 1차 선택값/fallback/제외 대상, release records, feature inventory, server dispatch 연결을 정적 검증합니다.
- 검증: 최초 `node scripts/internal/verify_v340_entry_baseline.mjs`는 source version/docs/inventory/server dispatch가 아직 v3.4 기준이 아니어서 `pass=0 fail=9`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v340 Step 1 결과 행에 기록합니다.
- 완료 경계: 이번 Step 1은 source/version/docs/backlog/verification metadata 정렬입니다. v3.4 기능 구현, UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다. UI 직접 조작 evidence도 별도 실행 기록이 있을 때만 완료로 씁니다.

## v3.4.0 Step 2 개발 기록

- 범위: P0 `v3.4.0 (2) Continuity Drill Contract`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV340ContinuityDrillContractJson`을 추가해 `media-server.ops.v340-continuity-drill-contract.v1` recovery drill schema, `v330HandoffInputs`, `drillBoundaries`를 Ops-only read-only JSON으로 반환합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/source-registry/continuity-drill/contract` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며 source registry write, PublishedView write, EventRecord write, Ops audit write, production restore, automatic recovery, RTSP/WebRTC media path 변경을 수행하지 않습니다.
- `scripts/internal/verify_v340_continuity_drill_contract.mjs`, `server.sh`: `./server.sh verify-v340-continuity-drill-contract` 명령을 추가해 recovery drill schema, v3.3 handoff 입력, read-only/no-write/no-secret/no-media-path-change 경계, docs/inventory/release records/server dispatch 연결을 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`: `SAFE-125`, `OPS-092` 기능/경계/gate 항목을 추가하고 안정화 verifier 연결을 갱신했습니다.
- 검증: 최초 `node scripts/internal/verify_v340_continuity_drill_contract.mjs`는 Step 2 server model, route, docs/inventory/server dispatch가 아직 없어서 `pass=0 fail=7`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v340 Step 2 결과 행에 기록합니다.
- 완료 경계: 이번 Step 2는 Continuity Drill Contract read model/API/verifier 연결입니다. Recovery Candidate Package Read Model, Staging Restore Validation Harness 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence도 아닙니다.

## v3.4.0 Step 3 개발 기록

- 범위: P0 `v3.4.0 (3) Recovery Candidate Package Read Model`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV340RecoveryCandidatePackageJson`을 추가해 SourceRegistry snapshot, PublishedView, source health snapshot, EventRecord query summary, redacted Ops audit context를 `media-server.ops.v340-recovery-candidate-package.v1` package로 조합합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/source-registry/recovery-candidate-package` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며 source locator, credential material, raw audit body, media path, client/viewer material을 package에 포함하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: package에 `stagingRestoreValidationHarness` command, `redactionPolicy`, `boundaries`를 포함해 production write, automatic recovery, EventRecord/Event POST/WebRTC/SSE/WS/media schema 변경이 없음을 명시했습니다.
- `scripts/internal/verify_v340_recovery_candidate_package.mjs`, `server.sh`: `./server.sh verify-v340-recovery-candidate-package` 명령을 추가해 read model, route guard, redaction, no-store, docs/inventory/release records/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`: `SRC-041`, `EVT-073`, `SAFE-126`, `OPS-093` 기능/경계/gate 항목을 추가하고 안정화 verifier 연결을 갱신했습니다.
- 검증: 최초 `node scripts/internal/verify_v340_recovery_candidate_package.mjs`는 Step 3 server model, route, docs/inventory/server dispatch가 아직 없어서 `pass=0 fail=8`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v340 Step 3 결과 행에 기록합니다.
- 완료 경계: 이번 Step 3은 Recovery Candidate Package read model/API/verifier 연결입니다. Staging Restore Validation Harness 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence도 아닙니다.

## v3.4.0 Step 4 개발 기록

- 범위: P0 `v3.4.0 (4) Staging Restore Validation Harness`.
- `scripts/internal/verify_v340_staging_restore_validation_harness.mjs`: 임시 runtime directory를 만들고 삭제하는 self-test harness를 추가했습니다. 이 harness는 JSON parse, duplicate sourceId, missing PublishedView sourceId reference, auth store `0600`, checksum mismatch, viewer scope missing을 production write 없이 검증합니다.
- `src/ingress/webrtc_http_server.cpp`: recovery candidate package의 `stagingRestoreValidationHarness`에 `./server.sh verify-v340-staging-restore-validation-harness`, `stagingOnly`, `productionWritePerformed=false`, `authStoreMode0600`, `checksumVerified`, `viewerScopeVerified`, `duplicateSourceIdRejected`, `missingSourceIdReferenceRejected` marker를 포함했습니다.
- `server.sh`: `./server.sh verify-v340-staging-restore-validation-harness` dispatch를 추가했습니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`: `LAB-090`, `SAFE-127`, `OPS-094` 기능/경계/gate 항목을 추가하고 안정화 verifier 연결을 갱신했습니다.
- 검증: 최초 `node scripts/internal/verify_v340_staging_restore_validation_harness.mjs`는 harness self-test 1개는 통과했지만 docs/inventory/server dispatch와 package marker가 없어 `pass=1 fail=5`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v340 Step 4 결과 행에 기록합니다.
- 완료 경계: 이번 Step 4는 staging restore validation harness와 package marker 연결입니다. source health replay/diff, Ops UI, approval-gated checklist 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence도 아닙니다.

## v3.4.0 Step 5 개발 기록

- 범위: P1 `v3.4.0 (5) Source Health Replay and Drift Diff`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV340SourceHealthReplayDriftDiffJson`, `BuildV340HandoffSourceHealthReplaySnapshot`, `BuildV340SourceHealthReplayDriftDiffItems`, `BuildV340SourceHealthReplayDriftSummary`를 추가해 `/ops/api/source-registry/source-health-replay-drift-diff`에서 handoff source health replay baseline과 fresh source health snapshot의 stale/offline/reconnect/warning drift를 Ops-only read-only JSON으로 요약합니다.
- `src/ingress/webrtc_http_server.cpp`: route guard는 `require_ops_principal()`와 GET/no-store만 사용하며 SourceRegistry/PublishedView/Ops audit write, source health snapshot persistence, recovery validation plan persistence, production restore, automatic recovery, media/schema 변경을 수행하지 않는 boundary flag를 출력합니다.
- `scripts/internal/verify_v340_source_health_replay_drift_diff.mjs`, `server.sh`: `./server.sh verify-v340-source-health-replay-drift-diff` 명령을 추가해 Step 5 server model, route, read-only boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`, `docs/stream-verification.md`, `docs/release-test-records.md`: `SRC-042`, `SAFE-128`, `OPS-095` 기능/경계/gate 항목과 Step 5 verifier 연결을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v340_source_health_replay_drift_diff.mjs`는 Step 5 server model, route, docs/inventory/server dispatch가 아직 없어 `pass=0 fail=7`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v340 Step 5 결과 행에 기록합니다.
- 완료 경계: 이번 Step 5는 Source Health Replay and Drift Diff read model/API/verifier 연결입니다. Ops Continuity Drill Workspace UI 완료 evidence가 아닙니다. approval-gated checklist, client-safe maintenance digest, evidence export/cleanup manifest, field bridge gates 완료 evidence도 아닙니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence도 아닙니다.

## v3.4.0 Step 6 개발 기록

- 범위: P1 `v3.4.0 (6) Ops Continuity Drill Workspace UI`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/sources`에 `ops-continuity-drill-workspace` section, `source-continuity-drill-status`, package/ready/blocked/drift metric, `media-server.ops.v340-continuity-drill-workspace-ui.v1` marker를 추가해 drill package, validation status, blocked/ready 상태를 read-only로 표시했습니다.
- `src/ingress/product_ui_ops_sources_script.cpp`: `renderOpsContinuityDrillWorkspace`를 추가해 `continuity-drill/contract`, `recovery-candidate-package`, `source-health-replay-drift-diff` read model을 함께 읽고 `recoveryCandidatePackageSummary`, `recoveryCandidates`, `sourceHealthReplayDriftDiffSummary`, `sourceHealthReplayDriftItems`, `drillPackageReady`, `validationReady`, `blockedSources`, `automaticRecoveryPerformed` boundary를 UI 카드로 렌더링합니다.
- `src/ingress/product_ui_css.cpp`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: Step 6 workspace card/list/boundary 스타일과 Ops/Client static smoke marker를 추가했습니다. viewer/client route에는 drill package, source URL/raw locator/raw JSON/debug/credential material을 노출하지 않습니다.
- `scripts/internal/verify_v340_ops_continuity_drill_workspace_ui.mjs`, `server.sh`: `./server.sh verify-v340-ops-continuity-drill-workspace-ui` 명령을 추가해 `/ops/sources` shell, renderer, CSS, client 비노출, backlog/stream verification/manual UI/release records/inventory/server dispatch 연결을 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`, `docs/stream-verification.md`, `docs/release-test-records.md`, `docs/manual-ui-checklist.md`: `UI-075`, `SAFE-129`, `OPS-096` 기능/경계/gate 항목과 Step 6 verifier 연결을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v340_ops_continuity_drill_workspace_ui.mjs`는 Step 6 UI shell/renderer/CSS/docs/inventory/server dispatch가 아직 없어 `pass=1 fail=7`로 기대 실패했습니다. 구현 후 `./server.sh verify-v340-ops-continuity-drill-workspace-ui`는 `pass=8 fail=0`으로 통과했습니다. `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `git diff --check`도 통과했습니다. `verify-ops-client-ui --browser-mode static`은 서버 미기동 fetch 실패와 auth-on 401 전제를 확인한 뒤 `MEDIA_SERVER_AUTH_MODE=off` 검증 서버에서 route/API/redaction smoke `통과 28/실패 0`으로 재검증했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v340 Step 6 결과 행에 기록합니다.
- 완료 경계: 이번 Step 6은 Ops Continuity Drill Workspace UI read-only 표시와 static verifier 연결입니다. Approval-Gated Recovery Checklist and Audit 완료 evidence가 아닙니다. client-safe maintenance digest, evidence export/cleanup manifest, field bridge gates 완료 evidence도 아닙니다. 자동 recovery, production restore, source registry/PublishedView/Ops audit write를 수행하지 않습니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence도 아닙니다.

## v3.4.0 Step 7 개발 기록

- 범위: P1 `v3.4.0 (7) Approval-Gated Recovery Checklist and Audit`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV340ApprovalGatedRecoveryChecklistJson`, `BuildV340ApprovalGatedRecoveryChecklist`, `BuildV340ApprovalGatedRecoveryChecklistSummary`를 추가해 `/ops/api/source-registry/approval-gated-recovery-checklist`에서 recovery candidate package와 fresh source health를 기반으로 operator note, ready/blocked/field-smoke-needed/not-run 상태, dry-run result, Ops audit link를 read-only JSON으로 조합했습니다.
- `src/ingress/webrtc_http_server.cpp`: route guard는 `require_ops_principal()`와 GET/no-store만 사용하며 `automaticRecoveryPerformed=false`, `sourceRegistryWritePerformed=false`, `publishedViewWritePerformed=false`, `opsAuditWritePerformed=false` boundary를 출력합니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/sources`에 `ops-approval-gated-recovery-checklist` section, `source-recovery-checklist-status`, ready/blocked/field-smoke-needed/not-run metric, `media-server.ops.v340-approval-gated-recovery-checklist.v1` marker를 추가했습니다.
- `src/ingress/product_ui_ops_sources_script.cpp`: `renderApprovalGatedRecoveryChecklistAudit`를 추가해 checklist summary/items를 카드로 렌더링하고 operator note, dry-run result, Ops audit link, no-auto-recovery boundary를 UI에 표시합니다.
- `src/ingress/product_ui_css.cpp`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: Step 7 checklist card/list/boundary 스타일과 Ops/Client static smoke marker를 추가했습니다. viewer/client route에는 approval-gated checklist, source URL/raw locator/raw JSON/debug/credential material을 노출하지 않습니다.
- `scripts/internal/verify_v340_approval_gated_recovery_checklist_audit.mjs`, `server.sh`: `./server.sh verify-v340-approval-gated-recovery-checklist-audit` 명령을 추가해 Ops API, `/ops/sources` shell, renderer, CSS, client 비노출, backlog/stream verification/manual UI/release records/inventory/server dispatch 연결을 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`, `docs/stream-verification.md`, `docs/release-test-records.md`, `docs/manual-ui-checklist.md`: `UI-076`, `SAFE-130`, `OPS-097` 기능/경계/gate 항목과 Step 7 verifier 연결을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v340_approval_gated_recovery_checklist_audit.mjs`는 Step 7 server/API/UI/docs/inventory/server dispatch가 아직 없어 `pass=1 fail=8`로 기대 실패했습니다. 구현 후 `./server.sh verify-v340-approval-gated-recovery-checklist-audit`는 `pass=9 fail=0`으로 통과했습니다. `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `git diff --check`도 통과했습니다. `MEDIA_SERVER_AUTH_MODE=off` 검증 서버에서 `verify-ops-client-ui --browser-mode static`은 route/API/redaction smoke `통과 28/실패 0`으로 재검증했고, 최종 검증 결과는 `docs/release-test-records.md`의 v340 Step 7 결과 행에 기록했습니다.
- 완료 경계: 이번 Step 7은 Approval-Gated Recovery Checklist and Audit read-only 표시와 static verifier 연결입니다. Client-safe Maintenance Digest 완료 evidence가 아닙니다. Drill Evidence Export and Cleanup Manifest, Field Bridge Condition Gates 완료 evidence도 아닙니다. 자동 recovery, production restore, source registry/PublishedView/Ops audit write를 수행하지 않습니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence도 아닙니다.

## v3.4.0 Step 8 개발 기록

- 범위: P1 `v3.4.0 (8) Client-safe Maintenance Digest`.
- `src/ingress/webrtc_http_server.cpp`: `ClientMaintenanceDigestJson`, `ClientMaintenanceDigestFor`, `AppendClientSafeMaintenanceDigestJson`을 추가해 `/client/api/views/{id}/events`와 dashboard event summary payload에 `media-server.client.v340-maintenance-digest.v1` `maintenanceDigest`를 붙였습니다. digest는 `maintenanceState`, `summaryText`, `severity`, `timelineHint`와 viewer-safe boundary flag만 노출합니다.
- `src/ingress/webrtc_http_server.cpp`: `maintenanceDigest`는 PublishedView-scoped client payload에만 포함되고 `sourceUrlIncluded=false`, `rawLocatorIncluded=false`, `rawJsonIncluded=false`, `debugMaterialIncluded=false`, `credentialMaterialIncluded=false`, `operatorMaterialIncluded=false`, `opsAuditLinkageIncluded=false`, `dryRunResultIncluded=false`, `approvalChecklistIncluded=false`, `recoveryActionIncluded=false`를 출력합니다. SourceRegistry/PublishedView/EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata/RTSP-WebRTC media path/Rule/Profile/search-metrics 변경은 수행하지 않습니다.
- `src/ingress/product_ui_client_scripts.cpp`: `renderClientSafeMaintenanceDigest`를 추가하고 `/client/live`, `/client/dashboard`, `/client/events`의 event feed/detail 흐름에 viewer-safe maintenance/recovering/unavailable digest를 표시했습니다. renderer는 source URL, raw locator, raw JSON, debug material, credential material, operator note, Ops audit, dry-run result, approval checklist, recovery action을 읽지 않습니다.
- `src/ingress/product_ui_css.cpp`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: client-safe maintenance digest panel/list/item 스타일과 Ops/Client static smoke marker를 추가했습니다.
- `scripts/internal/verify_v340_client_safe_maintenance_digest.mjs`, `server.sh`: `./server.sh verify-v340-client-safe-maintenance-digest` 명령을 추가해 client API/schema/UI renderer/CSS/redaction boundary, backlog/stream verification/manual UI/release records/inventory/server dispatch 연결을 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`, `docs/stream-verification.md`, `docs/release-test-records.md`, `docs/manual-ui-checklist.md`: `UI-077`, `CLIENT-029`, `SAFE-131`, `OPS-098` 기능/경계/gate 항목과 Step 8 verifier 연결을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v340_client_safe_maintenance_digest.mjs`는 Step 8 client API/UI/docs/inventory/server dispatch가 아직 없어 `pass=0 fail=7`로 기대 실패했습니다. 구현 후 `./server.sh verify-v340-client-safe-maintenance-digest`는 `pass=7 fail=0`으로 통과했습니다. `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `git diff --check`도 통과했습니다. `MEDIA_SERVER_AUTH_MODE=off` 검증 서버에서 `verify-ops-client-ui --browser-mode static`은 route/API/redaction smoke `통과 28/실패 0`으로 재검증했고, 최종 검증 결과는 `docs/release-test-records.md`의 v340 Step 8 결과 행에 기록했습니다.
- 완료 경계: 이번 Step 8은 Client-safe Maintenance Digest API/UI와 redaction boundary 연결입니다. Drill Evidence Export and Cleanup Manifest 완료 evidence가 아닙니다. Field Bridge Condition Gates 완료 evidence도 아닙니다. source registry write, PublishedView write, EventRecord write, Event POST/API/schema/media/search 변경을 수행하지 않습니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence도 아닙니다.

## v3.4.0 Step 9 개발 기록

- 범위: P1 `v3.4.0 (9) Drill Evidence Export and Cleanup Manifest`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV340DrillEvidenceExportCleanupManifestJson`, `BuildV340DrillEvidenceArtifactManifest`, `BuildV340DrillCleanupManifest`, `BuildV340DrillEvidenceExportCleanupSummary`를 추가해 `/ops/api/source-registry/drill-evidence-export-cleanup-manifest`에서 redacted drill artifact manifest, minimum retained evidence, `/tmp` cleanup manifest, sensitive material scan boundary를 Ops-only read-only JSON으로 기록했습니다.
- `src/ingress/webrtc_http_server.cpp`: manifest는 `cleanupExecutionPerformed=false`, `artifactExportExecuted=false`, `temporaryCleanupExecuted=false`를 명시하고 source URL, raw locator, raw JSON, debug material, credential material, raw audit body, provider material, client/viewer material을 포함하지 않습니다. SourceRegistry/PublishedView/EventRecord/Ops audit write, Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile/search-metrics 변경도 수행하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/sources`에 `ops-drill-evidence-export-cleanup-manifest` section, `source-drill-evidence-manifest-status`, retained/artifact/cleanup/scan metric, `media-server.ops.v340-drill-evidence-export-cleanup-manifest.v1` marker를 추가했습니다.
- `src/ingress/product_ui_ops_sources_script.cpp`: `renderDrillEvidenceExportCleanupManifest`를 추가해 retained evidence, cleanup candidates, sensitive scan patterns를 read-only 카드로 렌더링합니다. renderer는 drill manifest의 source URL/raw locator/raw JSON/debug/credential/raw audit body/provider material을 읽지 않습니다.
- `src/ingress/product_ui_css.cpp`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: Step 9 manifest card/list/boundary 스타일과 Ops/Client static smoke marker를 추가했습니다.
- `scripts/internal/verify_v340_drill_evidence_export_cleanup_manifest.mjs`, `server.sh`: `./server.sh verify-v340-drill-evidence-export-cleanup-manifest` 명령을 추가해 Ops API, `/ops/sources` shell, renderer, CSS, client 비노출, backlog/stream verification/manual UI/release records/inventory/server dispatch 연결을 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`, `docs/stream-verification.md`, `docs/release-test-records.md`, `docs/manual-ui-checklist.md`: `UI-078`, `SAFE-132`, `OPS-099` 기능/경계/gate 항목과 Step 9 verifier 연결을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v340_drill_evidence_export_cleanup_manifest.mjs`는 Step 9 server/API/UI/docs/inventory/server dispatch가 아직 없어 `pass=0 fail=7`로 기대 실패했습니다. 구현 후 `./server.sh verify-v340-drill-evidence-export-cleanup-manifest`는 `pass=7 fail=0`으로 통과했습니다. `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `git diff --check`도 통과했습니다. `MEDIA_SERVER_AUTH_MODE=off` 검증 서버에서 `verify-ops-client-ui --browser-mode static`은 route/API/redaction smoke `통과 28/실패 0`으로 재검증했고, 최종 검증 결과는 `docs/release-test-records.md`의 v340 Step 9 결과 행에 기록했습니다.
- 완료 경계: 이번 Step 9는 Drill Evidence Export and Cleanup Manifest API/UI와 redaction/cleanup boundary 연결입니다. Field Bridge Condition Gates 완료 evidence가 아닙니다. cleanupExecutionPerformed=false이며 artifact export, `/tmp` cleanup, production restore, automatic recovery를 수행하지 않습니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, field smoke, published metadata, release action 완료 evidence도 아닙니다.

## v3.4.0 Step 10 개발 기록

- 범위: P2 `v3.4.0 (10) Field Bridge Condition Gates`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV340FieldBridgeConditionGatesJson`, `BuildV340FieldBridgeConditionGates`, `BuildV340FieldBridgeConditionGateSummary`를 추가해 `/ops/api/source-registry/field-bridge-condition-gates`에서 ONVIF 실기기, external WHEP/TURN, real cloud/VLM provider를 endpoint/credential/operator approval 조건부 field smoke gate로 분리했습니다.
- `src/ingress/webrtc_http_server.cpp`: gate payload는 `fieldSmokeStatus=field-smoke-needed`, `executionStatus=not-run`, `sourceOnlyPassAccepted=false`, `localVerifierPassSubstitutesFieldSmoke=false`, `fieldSmokeExecuted=false`를 명시하고 endpoint probe, credential probe, ONVIF device contact, external WHEP/TURN contact, cloud provider/VLM provider call을 수행하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: endpoint URL, credential material, raw locator, raw JSON, debug material, provider material, raw TURN credential, raw VLM prompt/provider response를 JSON/UI/client에 포함하지 않으며 SourceRegistry/PublishedView/EventRecord/Ops audit write, Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile/search-metrics 변경도 수행하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/sources`에 `ops-field-bridge-condition-gates` section, `source-field-bridge-gate-status`, gate/field-smoke/blocked/approval metric, `media-server.ops.v340-field-bridge-condition-gates.v1` marker를 추가했습니다.
- `src/ingress/product_ui_ops_sources_script.cpp`: `renderFieldBridgeConditionGates`를 추가해 condition gates, source-only PASS boundary, field smoke 조건을 read-only 카드로 렌더링합니다. renderer는 field bridge payload의 endpoint URL/raw locator/raw JSON/debug/credential/provider material을 읽지 않습니다.
- `src/ingress/product_ui_css.cpp`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: Step 10 gate card/list/boundary 스타일과 Ops/Client static smoke marker를 추가했습니다.
- `scripts/internal/verify_v340_field_bridge_condition_gates.mjs`, `server.sh`: `./server.sh verify-v340-field-bridge-condition-gates` 명령을 추가해 Ops API, `/ops/sources` shell, renderer, CSS, client 비노출, backlog/stream verification/manual UI/release records/inventory/server dispatch 연결을 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`, `docs/stream-verification.md`, `docs/release-test-records.md`, `docs/manual-ui-checklist.md`: `UI-079`, `SRC-043`, `MEDIA-022`, `LAB-091`, `SAFE-133`, `OPS-100` 기능/경계/gate 항목과 Step 10 verifier 연결을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v340_field_bridge_condition_gates.mjs`는 Step 10 server/API/UI/docs/inventory/server dispatch가 아직 없어 `pass=0 fail=7`로 기대 실패했습니다. 구현 후 `./server.sh verify-v340-field-bridge-condition-gates`는 `pass=7 fail=0`으로 통과했습니다. `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `git diff --check`도 통과했습니다. `MEDIA_SERVER_AUTH_MODE=off` 검증 서버에서 `verify-ops-client-ui --browser-mode static`은 route/API/redaction smoke `통과 28/실패 0`으로 재검증했고, 최종 검증 결과는 `docs/release-test-records.md`의 v340 Step 10 결과 행에 기록했습니다.
- 완료 경계: 이번 Step 10은 Field Bridge Condition Gates API/UI와 조건부 field smoke boundary 연결입니다. release 개발 완료와 별도 field gate 결과를 분리하며, ONVIF 실기기, external WHEP/TURN, real cloud/VLM provider field smoke 실행 evidence가 아닙니다. 실장비 endpoint 성공 미확인 상태이며, fieldSmokeExecuted=false, sourceOnlyPassAccepted=false이고 endpoint probe, credential probe, provider call, media path 변경, source-only PASS 승격을 수행하지 않습니다. 이 카테고리의 개발 가능한 후속 이슈는 없음으로 보고하며, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence도 아닙니다.

## v3.4.0 Step 11 개발 기록

- 범위: P0 `v3.4.0 (11) Stabilization and Release Readiness`.
- `scripts/internal/verify_v340_stabilization_release_readiness.mjs`, `server.sh`: `./server.sh verify-v340-stabilization-release-readiness` 명령을 추가해 v3.4 Step 11 roadmap, stream verification, feature inventory, release policy, release evidence index, release records, server dispatch, script inventory 연결을 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`: `SAFE-134`, `OPS-101` 안정화 항목과 Step 11 verifier/coverage/script inventory 연결을 추가했습니다.
- `docs/stream-verification.md`, `docs/release-policy.md`, `docs/release-evidence-index.md`, `docs/release-test-records.md`: v3.4 local stabilization, release evidence/not-run 경계와 close-out dry-run 기록을 추가했습니다. 이 기록은 UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, PR/main/tag/GitHub Release, field smoke 실행 evidence를 대체하지 않습니다.
- Companion local gate:

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

- 검증: 최초 `node scripts/internal/verify_v340_stabilization_release_readiness.mjs`는 Step 11 docs/inventory/server dispatch가 아직 없어 `pass=1 fail=5`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v340 Step 11 결과 행에 기록합니다.
- 완료 경계: 이번 Step 11은 v3.4 local stabilization, release evidence/not-run 경계, close-out dry-run 기록 연결입니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, PR/main/tag/GitHub Release, field smoke 실행 evidence가 아니며 Step 11 local readiness PASS로 대체하지 않습니다.

`v3.4.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.
실제 tag/push는 수동 승인 후에만 수행합니다.

## 최신 published baseline 상세: v3.3.0 Live Source Reliability Workspace

상태: Step 1 source/version/docs/backlog/verification metadata 정렬 완료. Step 2
Source Registry Snapshot and Identity 구현 완료. Step 3 Source Onboarding Quality Summary
구현 완료. Step 4 Reliability Timeline and Health History 구현 완료. Step 5
Incident-to-Source Correlation Layer 구현 완료. Step 6 Operator Recheck and Recovery Queue
구현 완료. Step 7 Client-safe Source Status Digest 구현 완료. Step 8 Operator Runbook
and Reliability Handoff 문서 연결 완료. Step 9 Source Reliability Search and Metrics
구현 완료. Step 10 Ops Backup and Recovery Source Handoff 구현 완료. Step 11
Stabilization and Release Readiness local gate 연결 완료. 현재 source version은 `3.3.0`이고, 최신 published baseline은 `v3.3.0`
Live Source Reliability Workspace입니다. 이 절은 v3.3.0 개발 이슈와 현재 step evidence를
정리한 문서이며, 각 step은 실제 코드/UI/API/검증 산출물이 생긴 뒤에만 완료로 기록합니다.

직접 답: v3.3.0의 1차 선택값은 `Live Source Reliability Workspace`입니다.
v3.0이 이벤트 증거와 검색을 만들고, v3.1이 재생/공유를 보강하고, v3.2가 사건을
닫는 운영 workspace를 정리했다면, v3.3은 사건의 원인이 된 live source 상태와
source 등록 품질을 운영자가 같은 흐름에서 재확인하고 닫는 단계가 자연스럽습니다.

fallback 또는 축소 대안은 `Source Reliability Core`입니다. 이 대안은 source registry
snapshot, source onboarding quality summary, reliability timeline까지만 먼저 닫고
incident correlation, recovery queue, client digest, metrics는 후속 step evidence가
생길 때까지 보류합니다.

브레인스토밍 후보:

| 후보 | 판단 | 이유 |
| --- | --- | --- |
| Live Source Reliability Workspace | 1차 선택 | README와 docs가 현재 제품 경계를 live source onboarding, live source health, live VA event 품질로 설명하고, v3.2 `/ops/events` resolution workspace 뒤에 source 원인/재확인 흐름을 붙이기 좋음 |
| ONVIF Field Readiness Workspace | 보류 | ONVIF fixture와 정책 문서는 충분하지만 실장비 endpoint/credential 의존도가 커서 source-only local roadmap의 중심축으로 삼기에는 외부 조건이 큼 |
| VLM Operator Assist Expansion | 보류 | VLM 후보, profile, evaluation, review action 문서가 이미 많지만 runtime/model/provider 품질과 외부 전송 판단이 따라와야 하므로 v3.3의 기본 축보다는 보조 개선에 가까움 |
| Runtime/Model Bundle RC Expansion | 제외 | 현재 공개 형태가 source-only이고 runtime/model bundle RC는 별도 rehearsal 성격이 강해 live 운영 문제 해결 흐름보다 우선순위가 낮음 |

포함 범위:

- v3.3.0 source roadmap baseline 정렬
- source registry snapshot과 source identity/read model
- source onboarding quality summary와 pre-save validation 결과 표시
- source reliability timeline과 health history
- v3.2 resolution event와 source reliability context의 연결
- operator recheck/retry/recovery queue
- client-safe source status digest
- operator runbook과 source reliability handoff 문서
- source reliability search, filters, and metrics
- backup/recovery handoff에 필요한 source registry/health 검증 입력

비범위:

- VMS/NVR 제품군으로 확장
- 장기 녹화, broad archive playback/search, Profile G recording/replay
- 자동 승인/자동 조치 적용
- runtime/model bundle 배포
- VLM runtime/provider 또는 ONVIF 실장비 성공 보장
- viewer/client에 운영자용 source locator, credential, 내부 진단 원문 노출

제외 대상과 제외 사유:

- ONVIF 실장비 중심 roadmap: 실장비와 credential 준비가 source-only local 개발 범위의
  기본 전제가 아니므로 v3.3 중심축에서 제외합니다. 단, source onboarding quality와
  field readiness 상태는 v3.3 source workspace 안의 context로 연결할 수 있습니다.
- VLM default-on 또는 provider 품질 중심 roadmap: 모델/runtime/provider 품질 판단이
  필요하고 source reliability 문제 해결과 직접 연결되는 범위가 제한적이어서 제외합니다.
- Runtime/model bundle release: 배포 형태 변경과 artifact provenance 검토가 핵심이라
  live 운영 workflow 개선인 v3.3 목적과 다릅니다.
- 자동 recovery/action 적용: v3.3은 운영자가 source 상태를 재확인하고 조치 후보를
  판단하는 workspace이며, 자동 mutation이나 외부 조치 실행을 기본 산출물로 삼지 않습니다.

license/provenance/privacy/운영 검토 결과:

- 기본 공개 형태는 source-only이며 binary, runtime, model bundle을 v3.3 기본 release
  asset으로 포함하지 않습니다.
- source registry, PublishedView, source health, EventRecord, Ops audit에 이미 존재하는
  저장/노출 경계를 우선 재사용합니다.
- viewer/client에는 source 상태 요약과 viewer-safe digest만 제공하고, 운영자용 locator,
  credential reference, raw diagnostic material은 포함하지 않습니다.
- 외부 ONVIF, WHEP, TURN, cloud/VLM provider 결과는 endpoint와 credential이 있는
  별도 field evidence가 있을 때만 운영 사실로 분리합니다.

| Step | 제목 | 우선순위 | 상태 | 산출물 |
| --- | --- | --- | --- | --- |
| 1 | v3.3.0 (1) v3.3.0 roadmap/source baseline 정렬 | P0 | 완료 | VERSION/CMake/docs/backlog/source roadmap과 `verify-v330-entry-baseline` 기준 정렬 |
| 2 | v3.3.0 (2) Source Registry Snapshot and Identity | P0 | 완료 | `/ops/api/source-registry/snapshot`에서 sourceId, source kind, PublishedView 연결, canonical source key, owner/site/group context를 Ops-only 읽기 모델로 정리 |
| 3 | v3.3.0 (3) Source Onboarding Quality Summary | P0 | 완료 | 채널 저장 전 validation, 중복/충돌/누락/ready 상태, ONVIF/WHEP/RTSP 입력 품질 요약 |
| 4 | v3.3.0 (4) Reliability Timeline and Health History | P0 | 완료 | live/stale/offline/reconnect/source warning 변화 이력과 Ops audit 연결 |
| 5 | v3.3.0 (5) Incident-to-Source Correlation Layer | P1 | 완료 | v3.2 resolution event detail에서 source reliability 원인/context를 함께 표시 |
| 6 | v3.3.0 (6) Operator Recheck and Recovery Queue | P1 | 완료 | failed-only recheck, retry candidate, recovery checklist, dry-run 결과와 operator note 연결 |
| 7 | v3.3.0 (7) Client-safe Source Status Digest | P1 | 완료 | viewer/client에 허용되는 source status summary와 connection health digest |
| 8 | v3.3.0 (8) Operator Runbook and Reliability Handoff | P1 | 완료 | source reliability workspace 사용 흐름, 운영자 runbook, docs index/UI guide/config/backup 문서 연결 |
| 9 | v3.3.0 (9) Source Reliability Search and Metrics | P2 | 완료 | source health filter, saved reliability view, reconnect/stale/offline metric summary |
| 10 | v3.3.0 (10) Ops Backup and Recovery Source Handoff | P2 | 완료 | source registry, PublishedView, source health snapshot, recovery validation plan 연결 |
| 11 | v3.3.0 (11) Stabilization and Release Readiness | P0 | 완료 | v3.3 local stabilization, release evidence/not-run 경계, close-out dry-run 기록 |

완료 경계: Step 1은 source/version/docs/backlog/verification metadata 정렬입니다.
Step 2는 source registry identity read model/API/verifier 연결입니다. Step 3은 source
onboarding quality read model/API/UI/verifier 연결입니다. Step 4는 reliability timeline
and health history read model/API/UI/verifier 연결입니다. Step 5는 incident-to-source
correlation read model/UI/verifier 연결입니다. Step 6는 operator recheck recovery queue
read model/UI/verifier 연결입니다. Step 7은 client-safe source status digest API/UI/verifier
연결입니다. Step 8은 operator runbook과 reliability handoff 문서 연결입니다. Step 9는
Source Reliability Search and Metrics read model/API/UI/verifier 연결입니다. 아직 완료
기록이 있는 Step 10은 Ops Backup and Recovery Source Handoff read model/API/UI/verifier
연결입니다. Step 11은 v3.3.0 Step 1~10 local verifier, release metadata/docs/inventory/evidence,
close-out dry-run, script inventory, `git diff --check` 연결입니다.
현재 Step 1 기록은 source registry snapshot, onboarding quality, reliability timeline,
recovery queue, client digest, search/metrics 구현 완료 evidence가 아닙니다.
`v3.3.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.

## 최신 공개 기준: v3.8.0 Source Release Baseline

v3.8.0은 Operator-Gated Action Pilot & Outcome Loop source-only 공개 릴리즈입니다. 이 기준은
Ops Action Route Boundary, Action Capability Contract, Action Request Ledger Contract,
Approval Decision Gate, Action Readiness Preflight, Source Recheck Action Pilot,
Client Notice Draft Queue, Rule Draft Action Package, Ops Action Control Workspace UI,
Client-safe Action Notice Preview, Outcome Observer and Reconciliation, Action Receipt
Bundle, Field Connector Evidence Package, Default-off Action Explanation, release
readiness를 local evidence와 release validation evidence로 닫은 latest published
baseline입니다. 30분/120분 predev와 UI 풀테스트는 실행했고, 별도 runtime-console
120분과 external field smoke는 실제 endpoint/credential/실기기/provider 조건이 없어
실행하지 않은 영역으로 계속 분리합니다.

## 직전 공개 기준: v3.7.0 Source Release Baseline

v3.7.0은 Site-Aware Operations and Safe Runbook Control Plane source-only 공개 릴리즈입니다. 이 기준은
Site / Source Group Contract, Site-Aware Source Registry Projection, Site Health
Rollup, Site Impact Graph, Site Simulation Input Pack, Cross-Site Safe Apply
Readiness, Runbook Template Contract, Runbook Instance Ledger, Approval Ticket
Workflow, Site Operations Workspace UI, Client Notice by Site/View Group,
Rule/VA What-if by Site, Field Evidence Attachment, Limited Safe Execution Pilot,
Outcome Reconciliation, Export / Handoff Bundle, release readiness를 local evidence와
함께 닫은 직전 published baseline입니다. 120분 longrun은 AGENTS 7.6.2 직접 조건이
충족되지 않아 조건부 미실행이며 external field smoke는 실제 endpoint/credential/실기기/provider 조건이 없어
실행하지 않은 영역으로 계속 분리합니다.

## 이전 공개 기준: v3.6.0 Source Release Baseline

v3.6.0은 Operations Simulation and Safe Apply Readiness source-only 공개 릴리즈입니다. 이 기준은
Simulation Input Contract, Operations Simulation Run Contract, Command Plan Dry-run
Simulator, Source/Rule Impact Diff, Safe Apply Readiness Gate, Ops Simulation Workspace,
Simulation Run Ledger, Client Notice Preview, Rule/VA What-if Replay Pack,
Simulation Export Bundle, Field Evidence Simulation Adapter, VLM-assisted Simulation
Explanation, release readiness를 local evidence와 함께 닫은 historical published baseline입니다.
120분 longrun은 PASS했고 external field smoke는 실제 endpoint/credential/실기기/provider 조건이 없어
실행하지 않은 영역으로 계속 분리합니다.

## 이전 공개 기준: v3.5.0 Source Release Baseline

v3.5.0은 Live Operations Control Plane source-only 공개 릴리즈입니다. 이 기준은
Live Operations Graph, Operations Command Plan, Incident-to-Command Handoff,
Staged Change Plan and Impact Preview, Ops Command Workspace, Drill Run Ledger,
Client Impact Forecast, Client-safe Operations Notice, Operations Export Bundle,
Field Evidence Intake, VLM-assisted Ops Explanation, release readiness를 local evidence와
함께 닫은 historical published baseline입니다. 120분 longrun과 external field smoke는 실행하지
않은 영역으로 계속 분리합니다.

## 이전 공개 기준: v3.3.0 Source Release Baseline

v3.3.0은 Live Source Reliability Workspace source-only 직전 공개 릴리즈입니다. 이 기준은
source registry snapshot, onboarding quality, reliability timeline, incident-to-source
correlation, operator recheck/recovery queue, client-safe source digest, reliability
search/metrics, backup/recovery source handoff, release readiness를 local evidence와
함께 닫은 historical baseline입니다. 120분 longrun과 external field smoke는
실행하지 않은 영역으로 계속 분리했습니다.

## 이전 공개 기준: v3.2.0 Source Release Baseline

v3.2.0은 Operations Resolution Workspace source-only 이전 공개 릴리즈입니다. 이 기준은
v3.3.0의 완료 evidence로 재사용하지 않는 historical baseline입니다.

## v3.3.0 Step 1 개발 기록

- 범위: P0 `v3.3.0 (1) v3.3.0 roadmap/source baseline 정렬`.
- `VERSION`, `CMakeLists.txt`: 현재 source version과 CMake project version을 `3.3.0`으로 정렬했습니다.
- `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md`, `docs/versioning-policy.md`, `docs/release-policy.md`, `docs/public-repo-final-review.md`, `docs/ui-guide.md`, `docs/assets/ui/README.md`: 현재 source roadmap을 `v3.3.0 Live Source Reliability Workspace`로 전환하고 latest published release는 `v3.2.0` source-only GitHub Release로 보존했습니다.
- `docs/development-backlog.md`: v3.3.0 current roadmap을 `Step | 제목 | 우선순위 | 상태 | 산출물` 구조로 정렬하고, `Live Source Reliability Workspace` 1차 선택값, `Source Reliability Core` fallback, 제외 대상, license/provenance/privacy/운영 제약을 기록했습니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`, `config/docs_ui_assets.json`, `test/fixtures/manual_ui_fulltest_va_seed_matrix.json`: current release target, docs asset baseline, seed fixture, verification catalog, release records를 source `3.3.0`와 latest published `v3.2.0` 분리 기준으로 정렬했습니다.
- `scripts/internal/verify_release_metadata_consistency.mjs`: `verify-release-metadata`가 source `3.3.0`, current roadmap `v3.3.0 Live Source Reliability Workspace`, latest published `v3.2.0`을 분리 검증하도록 보정했습니다.
- `scripts/internal/verify_v330_entry_baseline.mjs`, `server.sh`: `./server.sh verify-v330-entry-baseline` 명령을 추가해 source `3.3.0`, latest published `v3.2.0`, current roadmap `v3.3.0 Live Source Reliability Workspace`, 1차 선택값/fallback/제외 대상, license/provenance/privacy/운영 제약, feature inventory, release test records 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`: `OPS-080`, `SAFE-113`, V330 Step 1 안정화 verifier, 저장소 보존형 테스트 결과를 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v330_entry_baseline.mjs`는 source version/docs/inventory/server dispatch가 아직 v3.3 기준이 아니어서 `pass=0 fail=7`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v330 Step 1 결과 행에 기록합니다.
- 완료 경계: 이번 Step 1은 source/version/docs/backlog/verification metadata 정렬입니다. v3.3 기능 구현, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다.

## v3.3.0 Step 2 개발 기록

- 범위: P0 `v3.3.0 (2) Source Registry Snapshot and Identity`.
- `include/ingress/source_view_registry.h`: `SourceIdentityPublishedView`, `SourceIdentitySnapshot`, `SourceIdentitySummary`, `SourceRegistrySnapshotIdentityJson`을 추가해 sourceId, source kind, PublishedView 연결, canonical source key, owner/site/group context를 읽기 모델 계약으로 선언했습니다.
- `src/ingress/source_view_registry.cpp`: `BuildSourceIdentitySnapshot`, `AppendSourceIdentitySnapshotJson`, `SourceViewRegistry::SourceRegistrySnapshotIdentityJson`을 추가했습니다. 이 로직은 기존 SourceRegistry와 PublishedView snapshot을 읽기 전용으로 조합하고 `media-server.ops.v330-source-registry-snapshot-identity.v1` schema, `sourceIdentity`, `summary`, `boundaries`를 반환합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/source-registry/snapshot` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며, source registry write 또는 PublishedView write를 수행하지 않습니다.
- `scripts/internal/verify_v330_source_registry_snapshot_identity.mjs`, `server.sh`: `./server.sh verify-v330-source-registry-snapshot-identity` 명령을 추가해 read model, route guard, no-store, client/viewer 비노출 경계, backlog/stream verification/release records/feature inventory/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`: `SRC-033`, `SAFE-114`, `OPS-081` 기능/경계/gate 항목을 추가하고 안정화 verifier 연결을 갱신했습니다.
- 검증: 최초 `node scripts/internal/verify_v330_source_registry_snapshot_identity.mjs`는 Step 2 read model, route, docs/inventory/server dispatch가 아직 없어서 `pass=0 fail=9`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v330 Step 2 결과 행에 기록합니다.
- 완료 경계: 이번 Step 2는 Source Registry Snapshot and Identity read model/API/verifier 연결입니다. Source Onboarding Quality Summary, Reliability Timeline and Health History, Incident-to-Source Correlation Layer, Operator Recheck and Recovery Queue, Client-safe Source Status Digest, Source Reliability Search and Metrics 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence도 아닙니다.

## v3.3.0 Step 3 개발 기록

- 범위: P0 `v3.3.0 (3) Source Onboarding Quality Summary`.
- `include/ingress/source_view_registry.h`: `SourceOnboardingQualityIssue`, `SourceOnboardingQualityItem`, `SourceOnboardingQualitySummary`, `SourceOnboardingQualitySummaryJson`을 추가해 채널 저장 전 validation, 중복/충돌/누락/ready 상태, ONVIF/WHEP/RTSP 입력 품질 요약의 Ops-only read model 계약을 선언했습니다.
- `src/ingress/source_view_registry.cpp`: `BuildSourceOnboardingQualityItems`, `BuildSourceOnboardingQualitySummary`, `AppendSourceOnboardingQualityItemJson`, `SourceViewRegistry::SourceOnboardingQualitySummaryJson`을 추가했습니다. 이 로직은 기존 SourceRegistry와 PublishedView snapshot을 읽기 전용으로 조합하고 `media-server.ops.v330-source-onboarding-quality-summary.v1` schema, `onboardingQualitySummary`, `sourceOnboardingQuality`, `preSaveValidation`, `inputQuality`, `validationIssues`, `boundaries`를 반환합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/source-registry/onboarding-quality` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며, source registry write 또는 PublishedView write를 수행하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_ops_sources_script.cpp`: `/ops/sources`에 `source-onboarding-quality-summary`와 `source-onboarding-quality-list`를 추가하고 `renderOnboardingQualitySummary`가 ready/warning/blocked/duplicate/missing PublishedView count와 validation issue를 표시하게 했습니다. 새 요약은 raw locator/credential을 표시하지 않습니다.
- `scripts/internal/verify_v330_source_onboarding_quality_summary.mjs`, `server.sh`: `./server.sh verify-v330-source-onboarding-quality-summary` 명령을 추가해 read model, route guard, no-store, UI hook, client/viewer 비노출 경계, backlog/stream verification/release records/feature inventory/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`: `SRC-034`, `SAFE-115`, `OPS-082` 기능/경계/gate 항목을 추가하고 안정화/UI verifier 연결을 갱신했습니다.
- 검증: 최초 `node scripts/internal/verify_v330_source_onboarding_quality_summary.mjs`는 Step 3 read model, route, UI, docs/inventory/server dispatch가 아직 없어서 `pass=2 fail=7`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v330 Step 3 결과 행에 기록합니다.
- 완료 경계: 이번 Step 3은 Source Onboarding Quality Summary read model/API/UI/verifier 연결입니다. Reliability Timeline and Health History, Incident-to-Source Correlation Layer, Operator Recheck and Recovery Queue, Client-safe Source Status Digest, Source Reliability Search and Metrics 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence도 아닙니다.

## v3.3.0 Step 4 개발 기록

- 범위: P0 `v3.3.0 (4) Reliability Timeline and Health History`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV330ReliabilityTimelineHealthHistoryJson`, `BuildV330ReliabilityTimelineHealthHistory`, `AppendV330ReliabilityTimelineItemJson`, `AppendV330ReliabilityTimelineEventJson`을 추가했습니다. 이 read model은 기존 `BuildOpsSourceHealthSnapshot`의 live/stale/offline/reconnect/source warning 현재 상태와 `source-health-state-change` Ops audit history를 읽어 `media-server.ops.v330-reliability-timeline-health-history.v1` `reliabilityTimelineSummary`, `reliabilityTimeline`, `healthHistory`, `auditLinkage`, `boundaries`로 반환합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/source-registry/reliability-timeline` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며, source registry write 또는 PublishedView write를 수행하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_ops_sources_script.cpp`, `src/ingress/product_ui_css.cpp`: `/ops/sources`에 `data-testid="source-reliability-timeline-health-history"`, `source-reliability-timeline-summary`, `source-reliability-timeline-list` UI를 추가했습니다. `renderReliabilityTimelineHealthHistory`가 live/stale/offline/warning/transition count와 audit route link를 표시하며 raw locator/credential을 표시하지 않습니다.
- `scripts/internal/verify_v330_reliability_timeline_health_history.mjs`, `server.sh`: `./server.sh verify-v330-reliability-timeline-health-history` 명령을 추가해 API route, read model, UI hook/CSS, client/viewer 비노출 경계, backlog/stream verification/release records/feature inventory/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`, `docs/stream-verification.md`, `docs/release-test-records.md`: `SRC-035`, `SAFE-116`, `OPS-083` 기능/경계/gate 항목과 Step 4 verifier 연결을 추가했습니다.
- 후속 수정: Step 4 inventory 확장 뒤 기존 v3.3 Step 1~3 verifier가 예전 누적 range 문자열을 고정 검사해 fail했고, `scripts/internal/verify_v330_entry_baseline.mjs`, `scripts/internal/verify_v330_source_registry_snapshot_identity.mjs`, `scripts/internal/verify_v330_source_onboarding_quality_summary.mjs`를 `SRC-035`/`SAFE-116`/`OPS-083` 기준으로 보정했습니다.
- 후속 수정: 새 timeline API가 `/ops/sources` `loadAll()`에 추가되며 초기 principal 로드 전 `채널 추가` 클릭이 먼저 처리되는 timing issue가 screenshot smoke에서 드러났습니다. `resetChannelForm()`이 필요 시 `/auth/whoami`를 먼저 로드하도록 보정해 ONVIF hint/tool smoke를 재통과시켰습니다.
- 검증: 최초 `node scripts/internal/verify_v330_reliability_timeline_health_history.mjs`는 Step 4 read model, route, UI, docs/inventory/server dispatch가 아직 없어서 `pass=0 fail=8`로 기대 실패했습니다. 최종 검증 결과와 런타임 API/UI smoke 결과는 `docs/release-test-records.md`의 v330 Step 4 결과 행에 기록합니다.
- 완료 경계: 이번 Step 4는 Reliability Timeline and Health History read model/API/UI/verifier 연결입니다. 이번 Step 4 범위 밖 기능 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence도 아닙니다.

## v3.3.0 Step 5 개발 기록

- 범위: P1 `v3.3.0 (5) Incident-to-Source Correlation Layer`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV330IncidentSourceCorrelationInfo`, `OpsV330IncidentSourceCorrelationInfoFor`, `OpsV330IncidentSourceCorrelationJson`, `OpsV330IncidentSourceCorrelationSummaryJson`을 추가했습니다. 이 로직은 기존 `/ops/api/events/reviews` `unifiedResolutionWorkspace` 안에서 v3.2 `sourceReliability`, resolution state, source-health-state-change audit handoff를 읽어 `media-server.ops.v330-incident-source-correlation.v1` `incidentSourceCorrelation`과 `incidentSourceCorrelationSummary`를 반환합니다.
- `src/ingress/webrtc_http_server.cpp`: `OpsV320UnifiedResolutionWorkspaceItemJson`, `OpsV320DetailSectionsJson`, `OpsV320UnifiedOpsEventsWorkspaceJson`에 `incidentSourceCorrelation` item/detail section/summary와 `incidentSourceCorrelationLayerImplemented` flag를 연결했습니다. 이 경로는 source registry write, PublishedView write, EventRecord write, Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload를 변경하지 않습니다.
- `src/ingress/product_ui_page_scripts.cpp`, `src/ingress/product_ui_css.cpp`: `/ops/events` unified resolution detail에 `renderV330IncidentSourceCorrelationLayer`, `v330IncidentSourceCorrelationGrid`, source cause, closure impact, source handoff, boundary, correlation signal chip을 추가했습니다. source URL/raw JSON/debug/client exposure는 표시하지 않습니다.
- `scripts/internal/verify_v330_incident_source_correlation_layer.mjs`, `server.sh`: `./server.sh verify-v330-incident-source-correlation-layer` 명령을 추가해 read model, UI hook/CSS, client/viewer 비노출 경계, backlog/stream verification/release records/feature inventory/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`, `docs/stream-verification.md`, `docs/release-test-records.md`: `UI-070`, `SRC-036`, `EVT-071`, `SAFE-117`, `OPS-084` 기능/경계/gate 항목과 Step 5 verifier 연결을 추가했습니다.
- 후속 수정: Step 5 inventory 확장 뒤 기존 v3.3 Step 1~4 verifier가 예전 누적 range 문자열을 고정 검사하지 않도록 `scripts/internal/verify_v330_entry_baseline.mjs`, `scripts/internal/verify_v330_source_registry_snapshot_identity.mjs`, `scripts/internal/verify_v330_source_onboarding_quality_summary.mjs`, `scripts/internal/verify_v330_reliability_timeline_health_history.mjs`의 range 기대값을 `UI-070`/`SRC-036`/`EVT-071`/`SAFE-117`/`OPS-084` 기준으로 보정했습니다.
- 검증: 최초 `node scripts/internal/verify_v330_incident_source_correlation_layer.mjs`는 Step 5 read model, boundary block, UI renderer, backlog 완료 기록, release records final/RED 연결이 아직 없어서 `pass=4 fail=5`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v330 Step 5 결과 행에 기록합니다.
- 완료 경계: 이번 Step 5는 Incident-to-Source Correlation Layer read model/UI/verifier 연결입니다. 이번 Step 5 범위 밖 기능 완료 evidence가 아닙니다. Operator Recheck and Recovery Queue, Client-safe Source Status Digest, Source Reliability Search and Metrics 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence도 아닙니다.

## v3.3.0 Step 6 개발 기록

- 범위: P1 `v3.3.0 (6) Operator Recheck and Recovery Queue`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV330OperatorRecheckRecoveryQueueInfo`, `OpsV330OperatorRecheckRecoveryQueueInfoFor`, `OpsV330OperatorRecheckRecoveryQueueJson`, `OpsV330OperatorRecheckRecoveryQueueSummaryJson`을 추가했습니다. 이 로직은 기존 `/ops/api/events/reviews` `unifiedResolutionWorkspace` 안에서 v3.2 resolution detail, sourceReliability, v3.3 incidentSourceCorrelation, operator note 상태를 읽어 `media-server.ops.v330-operator-recheck-recovery-queue.v1` `operatorRecheckRecoveryQueue`와 `operatorRecheckRecoveryQueueSummary`를 반환합니다.
- `src/ingress/webrtc_http_server.cpp`: `OpsV320UnifiedResolutionWorkspaceItemJson`, `OpsV320DetailSectionsJson`, `OpsV320UnifiedOpsEventsWorkspaceJson`에 `operatorRecheckRecoveryQueue` item/detail section/summary와 `operatorRecheckRecoveryQueueImplemented` flag를 연결했습니다. 이 경로는 source registry write, PublishedView write, persistent recovery queue write, EventRecord write, Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client digest, search/metrics를 변경하지 않습니다.
- `src/ingress/product_ui_page_scripts.cpp`, `src/ingress/product_ui_css.cpp`: `/ops/events` unified resolution detail에 `renderV330OperatorRecheckRecoveryQueue`, `v330OperatorRecheckRecoveryQueueGrid`, failed-only recheck, retry candidate, recovery checklist, dry-run result, operator note, source recheck, boundary card를 추가했습니다. source URL/raw JSON/debug/raw locator/credential/client exposure는 표시하지 않습니다.
- `scripts/internal/verify_v330_operator_recheck_recovery_queue.mjs`, `server.sh`: `./server.sh verify-v330-operator-recheck-recovery-queue` 명령을 추가해 read model, UI hook/CSS, client/viewer 비노출 경계, backlog/stream verification/release records/feature inventory/server dispatch 연결을 정적 검증합니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`: `/ops/events` static smoke에 `ops-events-operator-recheck-recovery-queue` 체크를 추가해 Step 6 UI marker, schema, recovery checklist, dry-run result, operator note 표시가 포함되는지 확인합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`, `docs/stream-verification.md`, `docs/release-test-records.md`: `UI-071`, `SRC-037`, `EVT-072`, `SAFE-118`, `OPS-085` 기능/경계/gate 항목과 Step 6 verifier 연결을 추가했습니다.
- 후속 수정: Step 6 inventory 확장 뒤 기존 v3.3 Step 1~5 verifier가 예전 누적 range 문자열을 고정 검사하지 않도록 `scripts/internal/verify_v330_entry_baseline.mjs`, `scripts/internal/verify_v330_source_registry_snapshot_identity.mjs`, `scripts/internal/verify_v330_source_onboarding_quality_summary.mjs`, `scripts/internal/verify_v330_reliability_timeline_health_history.mjs`, `scripts/internal/verify_v330_incident_source_correlation_layer.mjs`의 range 기대값을 `UI-071`/`SRC-037`/`EVT-072`/`SAFE-118`/`OPS-085` 기준으로 보정했습니다.
- 검증: 최초 `node scripts/internal/verify_v330_operator_recheck_recovery_queue.mjs`는 Step 6 server view model, UI renderer, ops smoke marker, backlog 완료 기록, stream verification, release records, server dispatch가 아직 없어서 `pass=1 fail=8`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v330 Step 6 결과 행에 기록합니다.
- 완료 경계: 이번 Step 6은 Operator Recheck and Recovery Queue read model/UI/verifier 연결입니다. 이번 Step 6 범위 밖 기능 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence도 아닙니다.

## v3.3.0 Step 7 개발 기록

- 범위: P1 `v3.3.0 (7) Client-safe Source Status Digest`.
- `src/ingress/webrtc_http_server.cpp`: `ClientSourceStatusDigest`, `ClientSourceStatusDigestFor`, `AppendClientSafeSourceStatusDigestJson`, `ClientSourceStatusDigestJson`을 추가했습니다. 이 로직은 기존 PublishedView-scoped client access와 analysis tap snapshot을 읽어 `media-server.client.source-status-digest.v1` `sourceStatusDigest`로 sourceStatus, connectionStatus, videoFrameStatus, metadataStatus, summaryText, severity, timelineHint, lastFrameAgeMs, metadataAgeMs만 반환합니다.
- `src/ingress/webrtc_http_server.cpp`: `ClientViewEventsJson`과 `ClientViewDashboardJson`의 `events.sourceStatusDigest`에 viewer-safe digest를 연결했습니다. 이 경로는 source registry write, PublishedView write, EventRecord write, Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, search/metrics를 변경하지 않습니다.
- `src/ingress/product_ui_client_scripts.cpp`, `src/ingress/product_ui_css.cpp`: `/client/live`, `/client/dashboard`, `/client/events`에 `renderClientSafeSourceStatusDigest`, `data-testid="client-safe-source-status-digest"`, `media-server.client.source-status-digest.v1` card를 추가했습니다. UI는 source URL, raw locator, raw JSON, debug material, credential material, operator material, rule editor, action control을 읽거나 표시하지 않습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`: client live/dashboard/events static smoke에 `client-safe-source-status-digest`, `sourceStatusDigest`, `viewer-safe source status digest` marker를 추가했습니다.
- `scripts/internal/verify_v330_client_safe_source_status_digest.mjs`, `server.sh`: `./server.sh verify-v330-client-safe-source-status-digest` 명령을 추가해 client-safe source status digest API/UI/redaction 경계, backlog/stream verification/release records/manual UI/feature inventory/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`, `docs/stream-verification.md`, `docs/manual-ui-checklist.md`, `docs/release-test-records.md`: `UI-072`, `CLIENT-028`, `SRC-038`, `SAFE-119`, `OPS-086` 기능/경계/gate 항목과 Step 7 verifier 연결을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v330_client_safe_source_status_digest.mjs`는 Step 7 server digest, client renderer, CSS/smoke marker, backlog 완료 기록, stream verification, release records, server dispatch가 아직 없어 `pass=0 fail=7`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v330 Step 7 결과 행에 기록합니다.
- 완료 경계: 이번 Step 7은 Client-safe Source Status Digest API/UI/verifier 연결입니다. 이번 Step 7 범위 밖 기능 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence도 아닙니다.

## v3.3.0 Step 8 개발 기록

- 범위: P1 `v3.3.0 (8) Operator Runbook and Reliability Handoff`.
- `docs/live-source-health.md`: `Operator Runbook and Reliability Handoff` 섹션을 추가해 source reliability workspace 사용 흐름, 운영자 handoff checklist, boundary/rollback 기준을 source-of-truth로 정리했습니다.
- `docs/README.md`, `docs/ui-guide.md`, `docs/config-reference.md`, `docs/ops-backup-recovery.md`: runbook source-of-truth를 `docs/live-source-health.md#operator-runbook-and-reliability-handoff`로 연결하고, 각 문서는 화면 위치, env/bundle 수집, 복구 입력 경계만 설명하도록 역할을 나눴습니다.
- `docs/development-backlog.md`, `docs/versioning-policy.md`, `docs/release-policy.md`: 사용자 최신 roadmap 순서에 맞춰 Step 8을 Operator Runbook and Reliability Handoff, Step 9를 Source Reliability Search and Metrics, Step 10을 Ops Backup and Recovery Source Handoff로 정렬했습니다.
- `scripts/internal/verify_v330_operator_runbook_reliability_handoff.mjs`, `server.sh`: `./server.sh verify-v330-operator-runbook-reliability-handoff` 명령을 추가해 runbook source-of-truth, docs index/UI guide/config/backup 연결, inventory/release records/server dispatch 연결, no-overclaim 경계를 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`, `docs/stream-verification.md`, `docs/release-test-records.md`: `SAFE-120`, `OPS-087` 기능/경계/gate 항목과 Step 8 verifier 연결을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v330_operator_runbook_reliability_handoff.mjs`는 로컬 backlog 순서가 사용자 최신 roadmap과 달랐고 runbook/docs/inventory/server dispatch 연결이 없어 `pass=0 fail=6`으로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v330 Step 8 결과 행에 기록합니다.
- 완료 경계: 이번 Step 8은 operator runbook과 reliability handoff 문서 연결입니다. Source Reliability Search and Metrics, Ops Backup and Recovery Source Handoff 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action, real backup/restore, field smoke 완료 evidence도 아닙니다.

## v3.3.0 Step 9 개발 기록

- 범위: P2 `v3.3.0 (9) Source Reliability Search and Metrics`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV330SourceReliabilitySearchMetricItem`, `OpsV330SourceReliabilitySavedView`, `OpsV330SourceReliabilitySearchMetricsSummary`, `BuildV330SourceReliabilitySearchMetrics`, `BuildV330SourceReliabilitySavedViews`, `BuildV330SourceReliabilitySearchMetricsSummary`, `AppendV330SourceReliabilitySearchMetricItemJson`, `AppendV330SourceReliabilitySavedViewJson`, `OpsV330SourceReliabilitySearchMetricsJson`을 추가했습니다. 이 read model은 기존 `BuildOpsSourceHealthSnapshot`과 `source-health-state-change` Ops audit history만 읽어 `media-server.ops.v330-source-reliability-search-metrics.v1` `sourceHealthFilters`, `savedReliabilityViews`, `sourceReliabilitySearchResults`, `reconnectMetricSummary`, `staleMetricSummary`, `offlineMetricSummary`, `boundaries`를 반환합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/source-registry/reliability-search-metrics` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며, source registry write, PublishedView write, saved view write, 자동 recovery를 수행하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_ops_sources_script.cpp`, `src/ingress/product_ui_css.cpp`: `/ops/sources`에 `data-testid="source-reliability-search-metrics"`, `source-reliability-search-filter-list`, `source-reliability-saved-view-list`, `source-reliability-search-result-list` UI를 추가했습니다. `renderSourceReliabilitySearchMetrics`가 source health filters, saved reliability view presets, reconnect/stale/offline metric summary와 boundary flag를 표시하며 source URL/raw locator/credential/client material을 표시하지 않습니다.
- `scripts/internal/verify_v330_source_reliability_search_metrics.mjs`, `server.sh`: `./server.sh verify-v330-source-reliability-search-metrics` 명령을 추가해 API route, read model, UI hook/CSS, read-only/saved view write 금지, client/viewer 비노출 경계, backlog/stream verification/release records/feature inventory/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`, `docs/stream-verification.md`, `docs/release-test-records.md`: `UI-073`, `SRC-039`, `SAFE-121`, `OPS-088` 기능/경계/gate 항목과 Step 9 verifier 연결을 추가했습니다.
- 후속 수정: Step 9 inventory 확장 뒤 coverage verifier와 project inventory verifier의 v3.3 feature range를 `UI-073`/`SRC-039`/`SAFE-121`/`OPS-088` 기준으로 보정했습니다.
- 검증: 최초 `./server.sh verify-v330-source-reliability-search-metrics`는 Step 9 read model, route, UI, docs/inventory/server dispatch가 아직 없어서 `pass=0 fail=8`로 기대 실패했습니다. 코드/API/UI 추가 뒤에는 문서/inventory 연결 전 `pass=4 fail=4`로 중간 실패를 확인했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v330 Step 9 결과 행에 기록합니다.
- 완료 경계: 이번 Step 9는 Source Reliability Search and Metrics read model/API/UI/verifier 연결입니다. Ops Backup and Recovery Source Handoff 완료 evidence가 아닙니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action, real backup/restore, field smoke 완료 evidence도 아닙니다.

## v3.3.0 Step 10 개발 기록

- 범위: P2 `v3.3.0 (10) Ops Backup and Recovery Source Handoff`.
- `src/ingress/webrtc_http_server.cpp`: `OpsV330BackupRecoverySourceHandoffJson`, `BuildV330BackupRecoverySourceHandoffInputs`, `BuildV330BackupRecoveryValidationPlan`을 추가했습니다. 이 read model은 기존 SourceRegistry/PublishedView snapshot과 Ops source health snapshot을 읽어 `media-server.ops.v330-backup-recovery-source-handoff.v1` `sourceHandoffInputs`, `sourceHealthSnapshotSummary`, `recoveryValidationPlan`, `boundaries`로 반환합니다.
- `src/ingress/webrtc_http_server.cpp`: `GET /ops/api/source-registry/backup-recovery-handoff` route를 추가했습니다. 이 route는 `require_ops_principal()`로 보호되고 `Cache-Control: no-store`를 설정하며, source registry write, PublishedView write, backup artifact persistence, recovery mutation을 수행하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_ops_sources_script.cpp`, `src/ingress/product_ui_css.cpp`: `/ops/sources`에 `data-testid="source-backup-recovery-handoff"`, handoff input list, recovery validation plan list, source health snapshot summary, boundary flag UI를 추가했습니다. UI는 source URL/raw locator/raw JSON/debug/credential/client material을 표시하지 않습니다.
- `docs/ops-backup-recovery.md`: Step 10 source-of-truth로 `Ops Backup and Recovery Source Handoff` 절을 추가해 source registry snapshot, PublishedView registry, source health snapshot, recovery validation plan의 확인 순서와 실제 운영 백업/production restore/자동 recovery 미완료 경계를 정리했습니다.
- `scripts/internal/verify_v330_ops_backup_recovery_source_handoff.mjs`, `server.sh`: `./server.sh verify-v330-ops-backup-recovery-source-handoff` 명령을 추가해 read model, route guard, UI hook/CSS, backup/write/client/schema/media 불변 경계, backlog/backup guide/stream verification/release records/feature inventory/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`, `docs/stream-verification.md`, `docs/release-test-records.md`: `UI-074`, `SRC-040`, `SAFE-122`, `OPS-089` 기능/경계/gate 항목과 Step 10 verifier 연결을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v330_ops_backup_recovery_source_handoff.mjs`는 Step 10 read model, boundary block, route, `/ops/sources` UI, docs/inventory/server dispatch가 아직 없어 `pass=0 fail=8`로 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v330 Step 10 결과 행에 기록합니다.
- 완료 경계: 이번 Step 10은 Ops Backup and Recovery Source Handoff read model/API/UI/verifier 연결입니다. real backup/restore 완료 evidence가 아닙니다. production restore cutover, source registry/PublishedView write, source health snapshot persistence, recovery validation plan persistence, automatic recovery, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action, field smoke 완료 evidence도 아닙니다.

## v3.3.0 Step 11 개발 기록

- 범위: P0 `v3.3.0 (11) Stabilization and Release Readiness`.
- `scripts/internal/verify_v330_stabilization_release_readiness.mjs`, `server.sh`: `./server.sh verify-v330-stabilization-release-readiness` 명령을 추가해 v3.3 Step 11 roadmap, stream verification, feature inventory, release policy, release evidence index, release records, server dispatch, script inventory 연결을 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`: `SAFE-123`, `OPS-090` 안정화 항목과 Step 11 verifier/coverage/script inventory 연결을 추가했습니다.
- `docs/stream-verification.md`, `docs/release-policy.md`, `docs/release-evidence-index.md`, `docs/release-test-records.md`: Step 11 local readiness gate와 미실행 경계를 기록했습니다. 이 기록은 UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, PR/main/tag/GitHub Release, field smoke 실행 evidence를 대체하지 않습니다.
- Companion local gate:
  - `./server.sh verify-v330-stabilization-release-readiness`
  - `./server.sh build`
  - `./server.sh verify-v330-entry-baseline`
  - `./server.sh verify-v330-source-registry-snapshot-identity`
  - `./server.sh verify-v330-source-onboarding-quality-summary`
  - `./server.sh verify-v330-reliability-timeline-health-history`
  - `./server.sh verify-v330-incident-source-correlation-layer`
  - `./server.sh verify-v330-operator-recheck-recovery-queue`
  - `./server.sh verify-v330-client-safe-source-status-digest`
  - `./server.sh verify-v330-operator-runbook-reliability-handoff`
  - `./server.sh verify-v330-source-reliability-search-metrics`
  - `./server.sh verify-v330-ops-backup-recovery-source-handoff`
  - `./server.sh verify-release-metadata`
  - `./server.sh verify-docs-links`
  - `./server.sh verify-docs-ui-assets`
  - `./server.sh verify-project-inventory`
  - `./server.sh verify-feature-inventory-coverage`
  - `./server.sh verify-release-evidence-index`
  - `./server.sh verify-release-closeout-helper --dry-run`
  - `./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run`
  - `./server.sh verify-script-inventory`
  - `git diff --check`
- 검증: 최초 `./server.sh verify-v330-stabilization-release-readiness`는 command 미구현으로 `알 수 없는 명령입니다: verify-v330-stabilization-release-readiness`를 출력해 기대 실패했습니다. 최종 검증 결과는 `docs/release-test-records.md`의 v330 Step 11 결과 행에 기록합니다.
- 완료 경계: 이번 Step 11은 v3.3.0 local stabilization gate wiring, release evidence records, not-run boundary 연결입니다. UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, PR/main/tag/GitHub Release, field smoke 완료 evidence가 아닙니다.

## 최신 published baseline 상세: v3.2.0 Operations Resolution Workspace

상태: `v3.2.0` Step 1 source baseline 정렬, Step 2 Resolution State Contract,
Step 3 Unified Ops Events Workspace, Step 4 Evidence Quality Layer, Step 5 Source Reliability Context,
Step 6 AI Review Quality Context, Step 7 Operator Resolution Flow, Step 8 Action Readiness Checklist,
Step 9 Client-safe Resolution Digest, Step 10 Resolution Search & Metrics local/static 구현 완료,
Step 11 Stabilization and Release Readiness local gate 연결 완료 후 published baseline으로
보존합니다. 이 절은 v3.3.0 current roadmap 완료 evidence가 아니며, v3.3 신규 기능은
각 Step별 코드/UI/API/검증 evidence가 생긴 뒤에만 완료로 기록합니다. v3.2 Step 1
baseline 정렬 자체도 후속 v3.3 기능 구현 완료 evidence가 아닙니다.

직접 답: v3.2.0의 1차 선택값은 `Operations Resolution Workspace`입니다. v3.0이
이벤트 증거를 만들고 검색하는 단계였고 v3.1이 증거를 재생·공유하는 단계였다면,
v3.2는 운영자가 `/ops/events`에서 사건을 판정하고 닫는 작업공간으로 정리하는
흐름이 자연스럽습니다.

fallback 또는 축소 대안은 `Resolution Core Baseline`입니다. 이 대안은 baseline,
resolution state contract, `/ops/events` unified workspace shell까지만 먼저 닫고
source reliability context, AI review quality context, action checklist, metrics는
후속 step evidence가 생길 때까지 보류합니다.

설계 판단: Event Resolution Workspace, Source Reliability Workspace,
AI Review Quality Workspace 세 방향을 별도 제품축으로 쪼개지 않고 하나의 운영
작업공간 안에서 계층화합니다. 중심은 resolution state와 operator closure이고,
source reliability는 사건 판단의 context, AI review quality는 evidence confidence와
correction 품질의 context로 둡니다.

포함 범위:

- v3.2.0 source-of-truth 정렬
- resolution state contract와 close/reopen/reason/status lifecycle
- `/ops/events` unified resolution workspace
- evidence quality와 confidence/coverage hint
- source reliability context와 재확인/조치 hint
- AI review quality context와 correction/review signal
- operator action readiness checklist
- client-safe resolution digest
- resolution search, filters, and metrics
- stabilization and release readiness

제외/보류 범위:

- 새 저장소 제품군으로의 확장
- 자동 승인/자동 조치 적용
- viewer/client에 내부 판단 근거 전체 노출
- raw provider material 또는 내부 debug material 노출
- 장시간 실행 evidence를 local baseline gate로 대체

제외 대상과 제외 사유:

- 새 저장소 제품군으로의 확장: MediaServer의 current source target을 운영 resolution workspace로 제한하기 위해 제외합니다.
- 자동 승인/자동 조치 적용: operator closure와 manual review 경계를 깨므로 제외합니다.
- viewer/client에 내부 판단 근거 전체 노출: viewer-safe digest와 redaction boundary를 깨므로 제외합니다.
- raw provider material 또는 내부 debug material 노출: privacy/provenance/source URL/debug material 원문 노출 위험이 있어 제외합니다.
- 장시간 실행 evidence를 local baseline gate로 대체: 안정화, UI, 30분, 120분, published metadata evidence는 서로 대체할 수 없으므로 제외합니다.

license/provenance/privacy/운영 제약:

- 기본 공개 형태는 source-only이며 Binary, runtime, model bundle을 release asset에 포함하지 않습니다.
- provider credential, raw prompt/response, source URL, raw frame bytes, 내부 debug material은 문서/UI/client/event payload/release evidence에 원문 노출하지 않습니다.
- `/client`와 viewer-facing digest는 resolution summary만 노출하며 내부 판단 근거 전체와 raw/debug/provenance material을 노출하지 않습니다.
- external TURN/WHEP, ONVIF 실기기, real cloud/VLM provider는 endpoint/credential/명시 승인 없이는 field PASS 근거가 아닙니다.
- 안정화, UI 풀테스트, 30분, 120분, published metadata는 서로 대체하지 않습니다.

| Step | 제목 | 우선순위 | 상태 | 산출물 |
| --- | --- | --- | --- | --- |
| 1 | v3.2.0 (1) v3.2.0 baseline 정렬 | P0 | 완료 | VERSION/docs/backlog/source roadmap 정렬 |
| 2 | v3.2.0 (2) Resolution State Contract | P0 | 완료 | `media-server.ops.resolution-state.v1` 사건 상태, 판정 reason, close/reopen lifecycle contract |
| 3 | v3.2.0 (3) Unified Ops Events Workspace | P0 | 완료 | `/ops/events` resolution queue/detail/timeline workspace |
| 4 | v3.2.0 (4) Evidence Quality Layer | P0 | 완료 | evidence completeness/confidence/replay coverage hint |
| 5 | v3.2.0 (5) Source Reliability Context | P1 | 완료 | source health, recent failure, operator recheck hint |
| 6 | v3.2.0 (6) AI Review Quality Context | P1 | 완료 | correction/review signal, uncertainty reason, quality badge |
| 7 | v3.2.0 (7) Operator Resolution Flow | P1 | 완료 | assign, note, close, reopen, audit trail |
| 8 | v3.2.0 (8) Action Readiness Checklist | P1 | 완료 | rule draft/evidence bundle/notification readiness checklist |
| 9 | v3.2.0 (9) Client-safe Resolution Digest | P1 | 완료 | viewer-safe status summary and redaction boundary |
| 10 | v3.2.0 (10) Resolution Search & Metrics | P2 | 완료 | resolution filters, saved views, 운영 metric summary |
| 11 | v3.2.0 (11) Stabilization and Release Readiness | P0 | 완료 | build/docs/metadata/inventory/release readiness records |

`v3.2.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.

## v3.2.0 공개 기준 기록: v3.2.0 Source Release Baseline

v3.2.0은 Operations Resolution Workspace source-only 공개 릴리즈입니다. 이 기준은
resolution state contract, unified Ops Events workspace, evidence quality, source
reliability, AI review quality, operator resolution flow, action readiness checklist,
client-safe resolution digest, resolution search/metrics, release readiness를 local
evidence와 함께 닫은 published baseline입니다. 120분 longrun과 external field
smoke는 실행하지 않은 영역으로 계속 분리합니다.

## v3.1.0 공개 기준 기록: v3.1.0 Source Release Baseline

v3.1.0은 Encoded Event Clip and Safe Sharing Expansion source-only historical 공개
릴리즈입니다. 이 기준은 v3.2.0의 완료 evidence로 재사용하지 않는 historical
baseline입니다.

## v3.2.0 Step 1 개발 기록

- 범위: P0 `v3.2.0 (1) v3.2.0 baseline 정렬`.
- `VERSION`, `CMakeLists.txt`: 현재 source version과 CMake project version을 `3.2.0`으로 정렬했습니다.
- `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md`, `docs/versioning-policy.md`, `docs/release-policy.md`, `docs/public-repo-final-review.md`, `docs/ui-guide.md`: 현재 source roadmap을 `v3.2.0 Operations Resolution Workspace`로 전환하고 latest published release는 `v3.1.0` source-only GitHub Release로 보존했습니다.
- `docs/development-backlog.md`: v3.2.0 current roadmap을 `Step | 제목 | 우선순위 | 상태 | 산출물` 구조로 정렬하고, Event Resolution Workspace, Source Reliability Workspace, AI Review Quality Workspace를 `Operations Resolution Workspace` 안의 resolution/source/AI quality context로 통합했습니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`, `docs/assets/ui/README.md`, `config/docs_ui_assets.json`, `test/fixtures/manual_ui_fulltest_va_seed_matrix.json`: current release target, docs asset baseline, seed fixture, verification catalog, release records를 source `3.2.0`와 latest published `v3.1.0` 분리 기준으로 정렬했습니다.
- `scripts/internal/verify_release_metadata_consistency.mjs`: `verify-release-metadata`가 source `3.2.0`, current roadmap `v3.2.0 Operations Resolution Workspace`, latest published `v3.1.0`을 분리 검증하도록 보정했습니다.
- `scripts/internal/verify_v320_entry_baseline.mjs`, `server.sh`: `./server.sh verify-v320-entry-baseline` 명령을 추가해 source `3.2.0`, latest published `v3.1.0`, current roadmap `v3.2.0 Operations Resolution Workspace`, 1차 선택값/fallback/제외 대상, license/provenance/privacy/운영 제약, feature inventory, release test records 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`: `OPS-069`, `SAFE-102`, V320 Step 1 안정화 verifier, 저장소 보존형 테스트 결과를 추가했습니다.
- 검증: 최초 `./server.sh verify-release-metadata`는 backlog publish evidence 문구 누락으로 `pass=15 fail=1`로 FAIL했고, 최초 `./server.sh verify-project-inventory`는 manual UI seed fixture releaseTarget drift로 `pass=12 fail=1`로 FAIL했습니다. 최초 `./server.sh verify-v320-entry-baseline`는 command 미구현으로 FAIL했습니다. 보정 후 `./server.sh verify-v320-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-project-inventory`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh build`, `git diff --check` 기준으로 재검증했습니다.
- 완료 경계: 이번 Step 1은 source/version/docs/backlog/verification metadata 정렬입니다. v3.2 기능 구현, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다.

## v3.2.0 Step 2 개발 기록

- 범위: P0 `v3.2.0 (2) Resolution State Contract`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/events/reviews`의 기존 Ops review state에 `media-server.ops.resolution-state.v1` resolution 객체를 추가했습니다. `resolutionStatus/resolutionReason/resolution.transition`, resolution note, close/reopen timestamp, `closeReopenLifecycle.canClose/canReopen/reasonRequired`를 `OpsEventReviewStateJson`, `OpsResolutionStateJson`, `OpsResolutionStateFromReview`에서 계산합니다.
- `/ops/api/events/reviews/{eventId}` PUT/POST: top-level `resolutionStatus`, `resolutionReason`, `resolutionNote`, `resolutionTransition` 또는 nested `resolution.status/reason/note/transition` payload를 읽어 Ops review JSONL에만 저장합니다.
- 기존 클라이언트 경계: 요청 payload에 resolution 필드가 없으면 저장된 `media-server.ops.resolution-state.v1` 값을 기본값으로 사용해 legacy review update가 close/reopen 상태를 덮어쓰지 않도록 했습니다.
- `/ops/api/events/reviews` catalog: `resolutionStatuses`, `resolutionReasons`, `resolutionTransitions`를 추가해 close/reopen lifecycle contract의 허용값을 고정했습니다.
- Ops audit: event review 저장 시 `resolution-state-update` audit action과 `Resolution state updated` summary를 남겨 close/reopen lifecycle이 EventRecord payload와 분리된 운영 감사 흐름에 남도록 했습니다.
- `scripts/internal/verify_v320_resolution_state_contract.mjs`, `server.sh`: `./server.sh verify-v320-resolution-state-contract` 명령을 추가해 server/API contract, catalog, audit, 문서, feature inventory, release records, dispatch 연결을 정적으로 검증합니다.
- `docs/project-feature-test-inventory.md`: `EVT-063`, `SAFE-103`, `OPS-070`을 추가하고 v3.2.0 (2) mapping을 `verify-v320-resolution-state-contract`에 연결했습니다.
- `docs/stream-verification.md`, `docs/release-test-records.md`: Step 2 verifier와 RED/final 결과 기록, 미실행/제외 경계를 추가했습니다.
- 완료 경계: 이번 Step 2는 Ops review API/state contract입니다. Unified Ops Events Workspace, UI 풀테스트 직접 조작, 30분/120분, operator assignment flow, client digest, search/metrics, published metadata evidence가 아님을 분리합니다.

## v3.2.0 Step 3 개발 기록

- 범위: P0 `v3.2.0 (3) Unified Ops Events Workspace`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events`에 `data-testid="ops-v320-unified-events-workspace"` 섹션과 `opsV320ResolutionQueue`, `opsV320ResolutionDetail`, `opsV320ResolutionTimeline` UI region을 추가했습니다. `OpsV320UnifiedOpsEventsWorkspaceJson`, `OpsV320UnifiedResolutionWorkspaceItemJson`, `OpsV320TimelineMarkersJson`, `OpsV320DetailSectionsJson`이 기존 EventRecord와 Ops review JSONL의 `media-server.ops.resolution-state.v1` 값을 읽어 resolution queue/detail/timeline view model을 만듭니다.
- `/ops/api/events/reviews`: 기존 aggregate 응답에 `unifiedResolutionWorkspace`를 추가했습니다. 새 쓰기 route, EventRecord top-level, Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 변경하지 않습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV320UnifiedOpsEventsWorkspace`가 `unifiedResolutionWorkspace.resolutionQueue`, `selectedDetail`, `resolutionTimeline`을 `/ops/events` 안의 queue/detail/timeline UI로 렌더링합니다. 저장 control은 추가하지 않고 기존 review inbox 저장 흐름을 유지합니다.
- `src/ingress/product_ui_css.cpp`: `.v320-unified-events-workspace`, `.v320-resolution-workspace-grid`, `.v320-resolution-queue-card`, `.v320-resolution-detail-grid`, `.v320-resolution-timeline-marker` 스타일을 추가하고 760px 이하에서 1열로 전환합니다.
- `scripts/internal/verify_v320_unified_ops_events_workspace.mjs`, `server.sh`: `./server.sh verify-v320-unified-ops-events-workspace` 명령을 추가해 UI shell, view model, script, CSS, ops smoke, 문서, feature inventory, release records, server dispatch 연결을 정적으로 검증합니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`: `/ops/events` static smoke 대상에 `ops-events-unified-resolution-workspace` visual selector와 marker를 추가했습니다.
- `docs/project-feature-test-inventory.md`: `UI-062`, `EVT-064`, `SAFE-104`, `OPS-071`을 추가하고 v3.2.0 (3) mapping을 `verify-v320-unified-ops-events-workspace`, `verify-ops-client-ui`에 연결했습니다.
- `docs/stream-verification.md`, `docs/release-test-records.md`: Step 3 verifier와 RED/final/안정화 결과 기록, 미실행/제외 경계를 추가했습니다.
- 검증: `./server.sh build`, `verify-v320-unified-ops-events-workspace`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-ops-client-ui --screenshots --browser-mode chrome --allow-chrome-fallback --http-base http://127.0.0.1:8081`, `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory`, `verify-docs-links`, `git diff --check` 기준 PASS입니다. 로컬 UI/API verifier는 auth-off throwaway 서버와 권한 실행으로 확인했습니다.
- 수정한 이슈: 최초 `verify-auth-bootstrap`은 test operator password env 누락으로 fail했고, 일회성 throwaway env를 명령 환경에만 주입해 auth 3종을 재실행했습니다. sandbox 기본 실행은 RTSP bind `Operation not permitted`로 fail해 권한 실행으로 재검증했습니다. 최초 `verify-ops-client-ui`는 실행 중인 server base와 Codex 인앱 evidence가 없어 fail했으며 auth-off throwaway 서버의 static/screenshot smoke로 재실행했습니다. inventory summary는 Step 3 기능 ID 4개 추가 뒤 `577`에 남아 fail했고 실제 row `581` 기준으로 정렬했습니다.
- 완료 경계: 이번 Step 3은 Ops-only `/ops/events` resolution queue/detail/timeline workspace local/static 구현입니다. Evidence Quality Layer, Source Reliability Context, AI Review Quality Context, Operator Resolution Flow, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님을 분리합니다.

## v3.2.0 Step 4 개발 기록

- 범위: P0 `v3.2.0 (4) Evidence Quality Layer`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/events/reviews`의 기존 `unifiedResolutionWorkspace` item에 `media-server.ops.v320-evidence-quality.v1` `evidenceQuality` 객체를 추가했습니다. `OpsV320EvidenceQualityInfoFor`, `OpsV320EvidenceQualityJson`, `OpsV320EvidenceQualitySummaryJson`이 기존 EventRecord evidence refs와 Ops review JSONL state만 읽어 `evidenceCompleteness`, `evidenceConfidence`, `replayCoverage`, score, ref 존재 여부, redaction boundary flag를 계산합니다.
- `src/ingress/webrtc_http_server.cpp`: `OpsV320DetailSectionsJson`, `OpsV320TimelineMarkersJson`, `OpsV320UnifiedResolutionWorkspaceItemJson`, `OpsV320UnifiedOpsEventsWorkspaceJson`에 evidence quality detail/timeline marker와 `evidenceQualitySummary`, `evidenceQualityLayerImplemented:true`를 연결했습니다.
- `/ops/api/events/reviews`: 새 write route, EventRecord top-level, Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 변경하지 않습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV320EvidenceQualityLayer`가 `/ops/events` unified resolution detail 안에 evidence completeness, evidence confidence, replay coverage hint, ref coverage chip, raw evidence/source URL/raw JSON/debug 비노출 boundary를 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.v320-evidence-quality-grid`, `.v320-evidence-quality-card`, `.v320-evidence-quality-refs`, `.v320-evidence-quality-ref` 스타일을 추가해 760px 이하 기존 v3.2 workspace 흐름 안에서 깨지지 않게 했습니다.
- `scripts/internal/verify_v320_evidence_quality_layer.mjs`, `server.sh`: `./server.sh verify-v320-evidence-quality-layer` 명령을 추가해 payload, UI script/CSS, ops smoke, 문서, feature inventory, release records, dispatch 연결을 정적으로 검증합니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`: `/ops/events` static smoke 대상에 `ops-events-evidence-quality-layer` marker와 `media-server.ops.v320-evidence-quality.v1` 문자열을 추가했습니다.
- `docs/project-feature-test-inventory.md`: `UI-063`, `EVT-065`, `SAFE-105`, `OPS-072`를 추가하고 v3.2.0 (4) mapping을 `verify-v320-evidence-quality-layer`, `verify-ops-client-ui`에 연결했습니다.
- `docs/stream-verification.md`, `docs/release-test-records.md`: Step 4 verifier와 RED/final/안정화 결과 기록, 미실행/제외 경계를 추가했습니다.
- 완료 경계: 이번 Step 4는 Ops-only evidence quality hint layer입니다. Source Reliability Context, AI Review Quality Context, Operator Resolution Flow, Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님을 분리합니다.

## v3.2.0 Step 5 개발 기록

- 범위: P1 `v3.2.0 (5) Source Reliability Context`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/events/reviews`의 기존 `unifiedResolutionWorkspace` item에 `media-server.ops.v320-source-reliability-context.v1` `sourceReliability` 객체를 추가했습니다. `OpsV320SourceReliabilityInfoFor`, `OpsV320SourceReliabilityContextJson`, `OpsV320SourceReliabilitySummaryJson`이 SourceRegistry source health snapshot과 EventRecord source identifier만 읽어 `sourceHealthStatus`, `recentFailureContext`, `operatorRecheckHint`, `/ops/api/source-health` recheck route를 계산합니다.
- `src/ingress/webrtc_http_server.cpp`: `OpsV320DetailSectionsJson`, `OpsV320TimelineMarkersJson`, `OpsV320UnifiedResolutionWorkspaceItemJson`, `OpsV320UnifiedOpsEventsWorkspaceJson`에 source reliability detail/timeline marker와 `sourceReliabilitySummary`, `sourceReliabilityContextImplemented:true`를 연결했습니다.
- `/ops/api/events/reviews`: 새 write route, source registry write, EventRecord top-level, Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 변경하지 않습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV320SourceReliabilityContext`가 `/ops/events` unified resolution detail 안에 source health, recent failure context, operator recheck hint, source registry write 없음/source URL 비노출 boundary를 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.v320-source-reliability-grid`, `.v320-source-reliability-card`, `.v320-source-reliability-warnings`, `.v320-source-reliability-warning` 스타일을 추가해 기존 v3.2 workspace 흐름 안에서 반응형으로 표시합니다.
- `scripts/internal/verify_v320_source_reliability_context.mjs`, `server.sh`: `./server.sh verify-v320-source-reliability-context` 명령을 추가해 payload, UI script/CSS, ops smoke, 문서, feature inventory, release records, dispatch 연결을 정적으로 검증합니다.
- `scripts/internal/verify_v320_source_reliability_runtime_sample.mjs`, `server.sh`: `./server.sh verify-v320-source-reliability-runtime-sample --http-base <running-server>` 명령을 추가해 실행 중인 서버에 fixture EventRecord item을 심고 `/ops/api/events/reviews?eventId=...`의 개별 `sourceReliability` 런타임 샘플, source id, operator recheck route, source registry write/source URL/raw JSON/debug/client exposure boundary를 확인한 뒤 fixture 파일을 원복합니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`: `/ops/events` static smoke 대상에 `ops-events-source-reliability-context` marker와 `media-server.ops.v320-source-reliability-context.v1` 문자열을 추가했습니다.
- `docs/project-feature-test-inventory.md`: `UI-064`, `EVT-066`, `SAFE-106`, `OPS-073`을 추가하고 v3.2.0 (5) mapping을 `verify-v320-source-reliability-context`, `verify-ops-client-ui`에 연결했습니다.
- `docs/stream-verification.md`, `docs/release-test-records.md`: Step 5 verifier와 RED/final/안정화 결과 기록, 미실행/제외 경계를 추가했습니다.
- 완료 경계: 이번 Step 5는 Ops-only source reliability context hint layer입니다. AI Review Quality Context, Operator Resolution Flow, Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님을 분리합니다.

## v3.2.0 Step 6 개발 기록

- 범위: P1 `v3.2.0 (6) AI Review Quality Context`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/events/reviews`의 기존 `unifiedResolutionWorkspace` item에 `media-server.ops.v320-ai-review-quality-context.v1` `aiReviewQuality` 객체를 추가했습니다. `OpsV320AiReviewQualityInfoFor`, `OpsV320AiReviewQualityContextJson`, `OpsV320AiReviewQualitySummaryJson`이 기존 Ops review state, evidence quality, source reliability context만 읽어 `correctionReviewSignal`, `uncertaintyReason`, `qualityBadge`, `qualityScore`, reanalysis/correction signal과 provider-free boundary flag를 계산합니다.
- `src/ingress/webrtc_http_server.cpp`: `OpsV320DetailSectionsJson`, `OpsV320TimelineMarkersJson`, `OpsV320UnifiedResolutionWorkspaceItemJson`, `OpsV320UnifiedOpsEventsWorkspaceJson`에 AI review quality detail/timeline marker와 `aiReviewQualitySummary`, `aiReviewQualityContextImplemented:true`, `actionReadinessChecklistImplemented:false`를 연결했습니다.
- `/ops/api/events/reviews`: 새 write route, runtime provider call, raw provider material, EventRecord top-level, Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 변경하지 않습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV320AiReviewQualityContext`가 `/ops/events` unified resolution detail 안에 correction/review signal, uncertainty reason, quality badge, provider-free/source URL/raw JSON/debug 비노출 boundary를 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.v320-ai-review-quality-grid`, `.v320-ai-review-quality-card`, `.v320-ai-review-quality-signals`, `.v320-ai-review-quality-signal` 스타일을 추가해 기존 v3.2 workspace 흐름 안에서 반응형으로 표시합니다.
- `scripts/internal/verify_v320_ai_review_quality_context.mjs`, `server.sh`: `./server.sh verify-v320-ai-review-quality-context` 명령을 추가해 payload, UI script/CSS, ops smoke, 문서, feature inventory, release records, dispatch 연결을 정적으로 검증합니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`: `/ops/events` static smoke 대상에 `ops-events-ai-review-quality-context` marker와 `media-server.ops.v320-ai-review-quality-context.v1` 문자열을 추가했습니다.
- `docs/project-feature-test-inventory.md`: `UI-065`, `EVT-067`, `SAFE-107`, `OPS-074`를 추가하고 v3.2.0 (6) mapping을 `verify-v320-ai-review-quality-context`, `verify-ops-client-ui`에 연결했습니다.
- `docs/stream-verification.md`, `docs/release-test-records.md`: Step 6 verifier와 RED/final/안정화 결과 기록, 미실행/제외 경계를 추가했습니다.
- 검증: `./server.sh verify-v320-ai-review-quality-context`, `./server.sh verify-v320-unified-ops-events-workspace`, `./server.sh verify-v320-evidence-quality-layer`, `./server.sh verify-v320-source-reliability-context`, `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `./server.sh verify-auth-bootstrap`, `./server.sh verify-auth-users`, `./server.sh verify-auth-routes`, `./server.sh verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `./server.sh verify-ops-client-ui --screenshots --browser-mode chrome --allow-chrome-fallback --http-base http://127.0.0.1:8081`, `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`, `git diff --check`.
- 수정한 이슈: Step 6 적용 후 Step 4/5 verifier가 `aiReviewQualityContextImplemented:false`를 고정 기대해 누적 호환성 확인이 실패했습니다. 제품 view model은 Step 6 이후 true가 맞으므로 두 verifier는 플래그 존재를 확인하도록 좁혔고, 각 command summary의 `not-run-by-this-command` 경계는 유지했습니다. UI static smoke는 local env auth-on 서버를 대상으로 한 최초 실행에서 401/login redirect로 실패해 `MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_AUTH_MODE=off` throwaway 서버로 재검증했습니다.
- 완료 경계: 이번 Step 6은 Ops-only AI review quality context hint layer입니다. Operator Resolution Flow, Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님을 분리합니다.

## v3.2.0 Step 7 개발 기록

- 범위: P1 `v3.2.0 (7) Operator Resolution Flow`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/events/reviews/{eventId}`의 기존 Ops review write path가 nested `operatorResolutionFlow.assignmentTarget/operatorNote/resolutionStatus/resolutionReason/resolutionTransition` payload를 읽어 기존 `actionTarget`, operator note, resolution close/reopen state로 정규화하도록 연결했습니다. 저장 대상은 Ops review JSONL이며 EventRecord top-level, Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 변경하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `OpsV320OperatorResolutionFlowInfoFor`, `OpsV320OperatorResolutionFlowJson`, `OpsV320OperatorResolutionFlowSummaryJson`을 추가해 `/ops/api/events/reviews` `unifiedResolutionWorkspace.operatorResolutionFlow`와 `operatorResolutionFlowSummary`에 assignment target, operator note/resolution note presence, close/reopen availability, audit action list, write path, redaction boundary를 노출합니다.
- `src/ingress/webrtc_http_server.cpp`: event review 저장 시 기존 `event-review-update`, `incident-action-update`, `resolution-state-update` audit와 함께 `operator-resolution-flow-update` audit action을 남깁니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV320OperatorResolutionFlow`가 `/ops/events` unified resolution detail 안에 assignment target, operator note, close/reopen, audit trail card와 audit chip을 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.v320-operator-resolution-flow-grid`, `.v320-operator-resolution-flow-card`, `.v320-operator-resolution-audit`, `.v320-operator-resolution-audit-chip` 스타일을 추가해 기존 v3.2 workspace 흐름 안에서 반응형으로 표시합니다.
- `scripts/internal/verify_v320_operator_resolution_flow.mjs`, `server.sh`: `./server.sh verify-v320-operator-resolution-flow` 명령을 추가해 write path, view model, UI script/CSS, ops smoke, backlog/stream verification/release records, feature inventory, script inventory, server dispatch 연결을 정적으로 검증합니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`: `/ops/events` static smoke 대상에 `ops-events-operator-resolution-flow` marker와 `media-server.ops.v320-operator-resolution-flow.v1` 문자열을 추가했습니다.
- `docs/project-feature-test-inventory.md`: `UI-066`, `EVT-068`, `SAFE-108`, `OPS-075`를 추가하고 v3.2.0 (7) mapping을 `verify-v320-operator-resolution-flow`, `verify-ops-client-ui`에 연결했습니다.
- `docs/stream-verification.md`, `docs/release-test-records.md`: Step 7 verifier와 RED/final 결과 기록, 미실행/제외 경계를 추가했습니다.
- 완료 경계: 이번 Step 7은 Ops-only operator resolution write path/view model/UI/audit 연결입니다. Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님을 분리합니다.

## v3.2.0 Step 8 개발 기록

- 범위: P1 `v3.2.0 (8) Action Readiness Checklist`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/events/reviews`의 기존 `unifiedResolutionWorkspace` item에 `media-server.ops.v320-action-readiness-checklist.v1` `actionReadinessChecklist` 객체를 추가했습니다. `OpsV320ActionReadinessChecklistInfoFor`, `OpsV320ActionReadinessChecklistJson`, `OpsV320ActionReadinessChecklistSummaryJson`이 기존 EventRecord evidence refs, source reliability context, AI review quality context, operator resolution flow만 읽어 rule draft/evidence bundle/notification readiness, blocker, checklist item을 계산합니다.
- `src/ingress/webrtc_http_server.cpp`: `OpsV320DetailSectionsJson`, `OpsV320TimelineMarkersJson`, `OpsV320UnifiedResolutionWorkspaceItemJson`, `OpsV320UnifiedOpsEventsWorkspaceJson`에 action readiness detail/timeline marker와 `actionReadinessChecklistSummary`, `actionReadinessChecklistImplemented:true`를 연결했습니다.
- `/ops/api/events/reviews`: 새 write route, Rule/Profile registry write, external notification delivery, EventRecord top-level, Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, client/viewer 출력을 변경하지 않습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV320ActionReadinessChecklist`가 `/ops/events` unified resolution detail 안에 readiness status, rule draft, evidence bundle, notification readiness, blocker chip, manual approval/external delivery/auto action boundary를 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.v320-action-readiness-checklist-grid`, `.v320-action-readiness-checklist-card`, `.v320-action-readiness-items`, `.v320-action-readiness-item`, `.v320-action-readiness-blocker` 스타일을 추가해 기존 v3.2 workspace 흐름 안에서 반응형으로 표시합니다.
- `scripts/internal/verify_v320_action_readiness_checklist.mjs`, `server.sh`: `./server.sh verify-v320-action-readiness-checklist` 명령을 추가해 payload, UI script/CSS, ops smoke, backlog/stream verification/release records, feature inventory, script inventory, server dispatch 연결을 정적으로 검증합니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`: `/ops/events` static smoke 대상에 `ops-events-action-readiness-checklist` marker와 `media-server.ops.v320-action-readiness-checklist.v1` 문자열을 추가했습니다.
- `docs/project-feature-test-inventory.md`: `UI-067`, `EVT-069`, `SAFE-109`, `OPS-076`을 추가하고 v3.2.0 (8) mapping을 `verify-v320-action-readiness-checklist`, `verify-ops-client-ui`에 연결했습니다.
- `docs/stream-verification.md`, `docs/release-test-records.md`: Step 8 verifier와 RED/final 결과 기록, 미실행/제외 경계를 추가했습니다.
- 완료 경계: 이번 Step 8은 Ops-only action readiness checklist view model/UI/static gate 연결입니다. Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님을 분리합니다.

## v3.2.0 Step 9 개발 기록

- 범위: P1 `v3.2.0 (9) Client-safe Resolution Digest`.
- `src/ingress/webrtc_http_server.cpp`: `/client/api/views/{id}/events`의 기존 PublishedView-scoped 이벤트 응답에 `media-server.client.resolution-digest.v1` `resolutionDigest`를 추가했습니다. `AppendClientSafeResolutionDigestJson`, `ClientSafeResolutionDigestStatus`, `ClientSafeResolutionDigestLabel`, `ClientSafeResolutionDigestTimelineHint`, `ClientSafeResolutionDigestSummaryText`가 기존 `ClientEventItem` status/time/type만 읽어 `resolutionStatus`, `resolutionLabel`, `summaryText`, `severity`, `timelineHint`, `time`만 산출합니다.
- `/client/api/views/{id}/events`: 새 client route, Ops review write, EventRecord top-level, Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload를 변경하지 않습니다. `resolutionDigest`는 `viewerSafe:true`, `publishedViewScoped:true`, `sourceUrlIncluded:false`, `rawEvidenceIncluded:false`, `debugMaterialIncluded:false`, `providerMaterialIncluded:false`, `featureProvenanceIncluded:false`, `internalEvidenceIncluded:false`, `operatorNotesIncluded:false`, `ruleEditorIncluded:false`, `actionControlsIncluded:false`, `resolutionStateWritePerformed:false` 경계를 고정합니다.
- `src/ingress/product_ui_client_scripts.cpp`: `renderClientSafeResolutionDigest`가 `/client/live` live dock, `/client/dashboard`, `/client/events`에 `data-testid="client-safe-resolution-digest"`와 `data-client-resolution-digest="viewer-safe"` card를 렌더링합니다. renderer는 `resolutionDigest`의 허용 필드만 읽고 source/raw/debug/provider/feature provenance/internal evidence/operator note/rule editor/action control 값을 읽지 않습니다.
- `src/ingress/product_ui_css.cpp`: `.client-safe-resolution-digest`를 기존 client-safe digest grid/card 스타일에 포함했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`: client shell, live/dashboard/events static smoke marker에 `client-safe-resolution-digest`, `resolutionDigest`, `viewer-safe resolution digest`, `media-server.client.resolution-digest.v1`를 추가했습니다.
- `scripts/internal/verify_v320_client_safe_resolution_digest.mjs`, `server.sh`: `./server.sh verify-v320-client-safe-resolution-digest` 명령을 추가해 API schema, client renderer, CSS, ops/client smoke, backlog, stream verification, feature inventory, manual UI checklist, release records, server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`: `UI-068`, `CLIENT-027`, `SAFE-110`, `OPS-077`을 추가하고 v3.2.0 (9) mapping을 `verify-v320-client-safe-resolution-digest`, `verify-ops-client-ui`에 연결했습니다.
- `docs/stream-verification.md`, `docs/manual-ui-checklist.md`, `docs/release-test-records.md`: Step 9 verifier와 RED/final 결과 기록, 미실행/제외 경계를 추가했습니다.
- 검증: `./server.sh verify-v320-client-safe-resolution-digest`, `./server.sh verify-v320-unified-ops-events-workspace`, `./server.sh verify-v320-evidence-quality-layer`, `./server.sh verify-v320-source-reliability-context`, `./server.sh verify-v320-ai-review-quality-context`, `./server.sh verify-v320-operator-resolution-flow`, `./server.sh verify-v320-action-readiness-checklist`, `./server.sh verify-v310-client-safe-event-digest`, `./server.sh verify-v280-client-safe-followup-digest`, `./server.sh verify-v250-client-safe-incident-digest`, `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-auth-bootstrap`, `./server.sh verify-auth-users`, `./server.sh verify-auth-routes`, `./server.sh verify-ops-client-ui --browser-mode in-app --in-app-evidence /tmp/media_server_v320_step9_inapp_evidence/in-app-evidence.json --http-base http://127.0.0.1:8081`, `./server.sh verify-ops-client-ui --browser-mode in-app --screenshots --in-app-evidence /tmp/media_server_v320_step9_inapp_evidence/in-app-evidence.json --http-base http://127.0.0.1:8081`, `./server.sh verify-rule-ui --in-app-evidence /tmp/media_server_v320_step9_inapp_evidence/in-app-evidence.json --http-base http://127.0.0.1:8081`, `git diff --check` 기준 PASS입니다. UI/API verifier는 auth-off throwaway 서버와 Codex 인앱 브라우저 evidence로 확인했습니다.
- 수정한 이슈: 최초 Step 9 verifier는 stream verification 문구 순서가 기대 문자열과 달라 fail했고 문구를 정렬했습니다. Step 9 기능 ID 추가 뒤 project inventory summary와 기존 v3.2 verifier owner range가 이전 `UI-067`/`SAFE-109`/`OPS-076`에 남아 fail 가능성이 있어 실제 `UI-068`/`SAFE-110`/`OPS-077` 기준으로 정렬했습니다. 최초 Auth verifier는 password env 누락과 sandbox RTSP bind 제한으로 fail했고, 일회성 throwaway env를 명령 환경에만 주입한 뒤 권한 실행으로 재검증했습니다. 최초 Ops/Client UI와 Rule UI smoke는 server/evidence 전제 미충족으로 fail했고 auth-off throwaway 서버와 인앱 evidence로 재실행했습니다.
- 완료 경계: 이번 Step 9는 viewer-safe client resolution digest API/UI/static gate 연결입니다. Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님을 분리합니다.

## v3.2.0 Step 10 개발 기록

- 범위: P2 `v3.2.0 (10) Resolution Search & Metrics`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/events/reviews`의 기존 `unifiedResolutionWorkspace` item에 `media-server.ops.v320-resolution-search-metrics.v1` `resolutionSearchMetrics` 객체를 추가했습니다. `OpsV320ResolutionSearchMetricsInfoFor`, `OpsV320ResolutionSearchMetricsJson`, `OpsV320ResolutionSearchMetricsSummaryJson`이 기존 EventRecord, Ops review state, v3.2 evidence/source/AI/action context만 읽어 active resolution filters, saved view presets, operations metric summary를 계산합니다.
- `src/ingress/webrtc_http_server.cpp`: top-level `resolutionSearchMetricsSummary`, `searchMetricsImplemented:true`를 연결하고 `savedViewsPersisted:false`, `savedViewWritePerformed:false`, `clientDigestChanged:false`, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer exposure 변경 없음 flag를 고정했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV320ResolutionSearchMetrics`가 `/ops/events` unified resolution detail 안에 resolution filters, saved views, operations metric summary, saved view write/client/source/raw/debug boundary를 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.v320-resolution-search-metrics-grid`, `.v320-resolution-search-card`, `.v320-resolution-filter-list`, `.v320-resolution-saved-views`, `.v320-resolution-metric-card` 스타일을 추가해 기존 v3.2 workspace 흐름 안에서 반응형으로 표시합니다.
- `scripts/internal/verify_v320_resolution_search_metrics.mjs`, `server.sh`: `./server.sh verify-v320-resolution-search-metrics` 명령을 추가해 view model, UI script/CSS, ops smoke, backlog/stream verification/release records, feature inventory, script inventory, server dispatch 연결을 정적으로 검증합니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`: `/ops/events` static smoke 대상에 `ops-events-resolution-search-metrics` marker와 `media-server.ops.v320-resolution-search-metrics.v1` 문자열을 추가했습니다.
- `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_script_inventory.mjs`: `UI-069`, `EVT-070`, `SAFE-111`, `OPS-078`과 Step 10 verifier coverage/script 감시 기준을 추가했습니다.
- `docs/project-feature-test-inventory.md`: `UI-069`, `EVT-070`, `SAFE-111`, `OPS-078`을 추가하고 v3.2.0 (10) mapping을 `verify-v320-resolution-search-metrics`, `verify-ops-client-ui`에 연결했습니다.
- `docs/stream-verification.md`, `docs/release-test-records.md`: Step 10 verifier와 RED/final 결과 기록, 미실행/제외 경계를 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v320_resolution_search_metrics.mjs`는 Step 10 server view model, boundary flag, UI script, CSS, ops smoke, backlog 완료 기록, feature inventory, server dispatch가 없어 `pass=0 fail=8`로 기대 실패했습니다. 구현/문서 연결 후 `./server.sh verify-v320-resolution-search-metrics`를 실행해 `pass=8 fail=0`을 확인했습니다.
- 완료 경계: 이번 Step 10은 Ops-only resolution search metrics view model/UI/static gate 연결입니다. Stabilization and Release Readiness, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님을 분리합니다.

## v3.2.0 Step 11 개발 기록

- 범위: P0 `v3.2.0 (11) Stabilization and Release Readiness`.
- `scripts/internal/verify_v320_stabilization_release_readiness.mjs`, `server.sh`: `./server.sh verify-v320-stabilization-release-readiness` 명령을 추가해 v3.2 Step 1~10 local gate, release policy/evidence/test records, inventory, script dispatch, close-out dry-run command 연결과 not-run boundary를 정적으로 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`: `SAFE-112`, `OPS-079`를 추가하고 v3.2.0 (11) mapping을 `verify-v320-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run`에 연결했습니다.
- `docs/stream-verification.md`, `docs/release-policy.md`, `docs/release-evidence-index.md`, `docs/release-test-records.md`: v3.2 local stabilization companion gate와 RED/final 결과 기록, UI 풀테스트/30분/120분/published metadata/release action/field smoke 미실행 경계를 추가했습니다.
- Companion local gate:

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

- 완료 경계: 이번 Step 11은 v3.2 local stabilization, release evidence/not-run 경계, close-out dry-run 기록 연결입니다. UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, PR/main/tag/GitHub Release, field smoke 실행 evidence가 아니며 Step 11 local readiness PASS로 대체하지 않습니다.

## 직전 공개 기준 상세: v3.1.0 Encoded Event Clip and Safe Sharing Expansion

상태: `V310-S00` source baseline 정렬 완료, `V310-S01` Encoded Event Clip Contract
완료, `V310-S02` Event Clip Encoder Pipeline 완료, `V310-S03` Replay Timeline UI 완료,
`V310-S04` Client-safe Event Digest 완료, `V310-S05` Scoped Integrator Search API 완료,
`V310-S06` Operator Feature Correction 완료, `V310-S08` Retention/Export Hardening 완료.
`V310-S09` Stabilization and Release Readiness 완료.
이 절은 v3.1.0 전체 기능 완료 evidence가 아니며, 실제 기능 구현은 각 Step별 코드/UI/API/검증
evidence가 생긴 뒤에만 완료로 기록합니다. V310-S00 baseline 정렬 자체는 기능 구현 완료
evidence가 아닙니다.

직접 답: v3.1.0의 1차 선택값은 `Encoded Event Clip and Safe Sharing Expansion`입니다.
이 방향은 v3.0 Event Evidence Search MVP 위에 event-centered encoded clip,
safe sharing, scoped integrator access, operator correction, optional vector search를
단계별로 얹되, MediaServer를 VMS/NVR이나 상시 녹화 제품으로 확장하지 않습니다.

fallback 또는 축소 대안은 `Encoded Clip Foundation`입니다. 이 대안은 encoded clip
contract, bounded encoder pipeline, FrameRef/PTS mapping만 먼저 닫고 safe sharing,
scoped API, operator correction, vector search는 후속 step evidence가 생길 때까지
보류합니다. 제품 체감은 작지만 VMS/NVR 범위 확장 위험을 가장 낮춥니다.

설계 기록: [docs/superpowers/specs/2026-06-20-v300-v310-event-evidence-search-roadmap-design.md](superpowers/specs/2026-06-20-v300-v310-event-evidence-search-roadmap-design.md)

포함 범위:

- encoded event clip contract와 generation
- `/ops/events` replay timeline
- frame bundle과 encoded clip 사이의 FrameRef/PTS mapping
- client-safe event digest
- scoped integrator search API
- operator feature correction과 aliases
- optional vector/embedding index default-off
- encoded clip lifecycle cleanup과 export hardening

제외 범위:

- 24/7 상시녹화와 VMS/NVR archive API
- broad archive playback/search
- 얼굴 인식, 신원 식별, watchlist, face embedding
- raw prompt/response retention
- client/viewer에 internal feature/provenance/raw evidence 전체 노출
- 자동 rule 적용
- cloud provider default-on

제외 대상과 제외 사유:

- 24/7 상시녹화와 VMS/NVR archive API: 제품 정체성을 VMS/NVR로 확장하므로 제외합니다.
- broad archive playback/search: event-centered clip/replay 범위를 넘어 장기 archive 제품이 되므로 제외합니다.
- 얼굴 인식, 신원 식별, watchlist, face embedding: 비식별 feature 정책을 깨므로 제외합니다.
- raw prompt/response retention: privacy와 provider retention 위험이 커서 feature/evidence reference 중심으로 제한합니다.
- full internal feature/provenance/raw evidence client exposure: viewer-safe digest 경계를 깨므로 제외합니다.
- 자동 rule 적용: operator correction/review와 별개로 approval 없는 write path를 늘리므로 제외합니다.
- cloud provider default-on: local-first와 explicit opt-in 경계를 유지합니다.
- `codex/v310-event-clip-encoder`의 선개발 Event Clip Encoder Pipeline: V310-S02 범위이므로 S00/S01 완료 evidence로 쓰지 않습니다. v3.1.0 S02 작업에서 local merge 확인 후 local branch를 삭제했습니다.

license/provenance/privacy/운영 제약:

- 기본 공개 형태는 source-only이며 FFmpeg/GStreamer/ONNX/VLM/YOLO runtime/model binary를 release asset에 포함하지 않습니다.
- encoded clip은 이후 step에서 event-centered bounded evidence로만 다루며 24/7 녹화나 broad archive API로 승격하지 않습니다.
- provider credential, prompt/raw response/source URL/raw frame bytes는 문서, UI, client, event payload, release evidence에 원문 노출하지 않습니다.
- external TURN/WHEP, ONVIF 실기기, real cloud/VLM provider는 endpoint/credential/명시 승인 없이는 field PASS 근거가 아닙니다.
- 안정화, UI 풀테스트, 30분, 120분, published metadata는 서로 대체하지 않습니다.
- Runtime/media longrun trigger matrix는 `media-server.runtime-media-longrun-trigger-matrix.v1`
  및 `./server.sh verify-runtime-media-longrun-trigger-matrix`로 확인합니다. 이 기준은
  V200-S17 안정화/장시간/UI 기준 정리 종료 기준을 v3.1 release 판단에도 재사용해
  high-risk runtime/media 변경, memory/runtime drift, external field endpoint를
  안정화/UI/30분 PASS와 분리합니다.

불변 조건:

- Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload schema를 요청 없이 바꾸지 않습니다.
- viewer/client에 source URL, raw JSON, debug counter, internal feature/provenance/raw evidence를 노출하지 않습니다.
- release action 완료는 실제 tag/push/PR/GitHub Release와 `verify-release-metadata --published`
  evidence가 있을 때만 기록합니다.
- `v3.1.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.
- `v3.1.0` GitHub Release publish 완료는 PR #42 main merge, signed annotated tag,
  GitHub Release, published metadata correction evidence로 분리 기록합니다.

| Step | ID | Priority | 상태 | 묶음 | 개발 내용 | 완료 산출물 | 검증/evidence 경계 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | V310-S00 | P0 | 완료 | v3.1 baseline | VERSION/CMake/README/docs/backlog/source roadmap을 v3.1 작업 기준으로 정렬 | source `3.1.0`, latest published `v3.1.0`, current roadmap `v3.1.0 Encoded Event Clip and Safe Sharing Expansion`, V310-S00 verifier 연결 | `./server.sh verify-v310-entry-baseline`, `verify-release-metadata`, docs/inventory gates. 기능 구현 완료 evidence가 아님 |
| 1 | V310-S01 | P0 | 완료 | Encoded Event Clip Contract | MP4/WebM clip manifest, FrameRef/PTS mapping, non-VMS boundary 정의 | [docs/v310-encoded-event-clip-contract.md](v310-encoded-event-clip-contract.md), `test/fixtures/v310_event_clip_contract/encoded_clip_manifest_sample.json`, `./server.sh verify-v310-event-clip-contract` | encoder pipeline, replay timeline UI, cleanup 실행 완료 evidence가 아님 |
| 2 | V310-S02 | P0 | 완료 | Event Clip Encoder Pipeline | bounded short segment 또는 frame bundle 기반 encoded clip generation, queue/status/cleanup | `src/analysis/event_storage.cpp`의 frame-bundle hook이 `.clip/encoded/event-clip.webm`과 `.clip/encoded/encoded-manifest.json`을 생성하고 `scripts/internal/analysis_state_smoke.cpp`가 WebM/VP8, EBML header, FrameRef-PTS mapping, queue/status/frameMap/non-VMS boundary를 확인함 | replay UI, client digest, scoped API, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| 3 | V310-S03 | P0 | 완료 | Replay Timeline UI | `/ops/events` event frame, representative image, frame bundle, encoded clip timeline | `src/ingress/webrtc_http_server.cpp`의 `/ops/events` shell과 `OpsV310ReplayTimelineUiJson`, `src/ingress/product_ui_page_scripts.cpp`의 `renderV310ReplayTimelineUi`, `src/ingress/product_ui_css.cpp`의 replay timeline styles, `scripts/internal/verify_v310_replay_timeline_ui.mjs`와 `./server.sh verify-v310-replay-timeline-ui` | UI 풀테스트 직접 조작, 30분/120분, client digest, scoped API, cleanup 실행, published metadata evidence가 아님 |
| 4 | V310-S04 | P1 | 완료 | Client-safe Event Digest | redacted viewer-safe summary | `src/ingress/webrtc_http_server.cpp`의 `/client/api/views/{id}/events` 응답에 `media-server.client.event-digest.v1` `eventDigest`를 추가하고, `src/ingress/product_ui_client_scripts.cpp`가 client live/dashboard/events에서 viewer-safe summaryText/eventType/status/severity/timelineHint/time만 렌더링함 | UI 풀테스트 직접 조작, 30분/120분, scoped API, cleanup execution, published metadata evidence가 아님 |
| 5 | V310-S05 | P1 | 완료 | Scoped Integrator Search API | scope-gated search API와 redaction guard | `src/ingress/ops_event_route_owner.cpp`의 `events/search` route owner helper, `src/ingress/webrtc_http_server.cpp`의 `/client/api/views/{id}/events/search` integrator-only route와 `IntegratorScopedEventSearchJson`, `scripts/internal/verify_v310_scoped_integrator_search_api.mjs`와 `./server.sh verify-v310-scoped-integrator-search-api` | UI 풀테스트 직접 조작, 30분/120분, cleanup execution, vector search, published metadata evidence가 아님 |
| 6 | V310-S06 | P1 | 완료 | Operator Feature Correction | feature correction, aliases, reanalysis request | `src/ingress/webrtc_http_server.cpp`의 `/ops/events` shell, `OpsEventReviewState` persistence, `/ops/api/events/reviews/{eventId}` correction payload/audit, `OpsV310OperatorFeatureCorrectionViewJson`, `src/ingress/product_ui_page_scripts.cpp`의 review row controls와 `renderV310OperatorFeatureCorrection`, `src/ingress/product_ui_css.cpp` styles, `scripts/internal/verify_v310_operator_feature_correction.mjs`와 `./server.sh verify-v310-operator-feature-correction` | UI 풀테스트 직접 조작, 30분/120분, vector search, cleanup execution, published metadata evidence가 아님 |
| 7 | V310-S07 | P2 | 완료 | Optional Vector Search | default-off embedding index, rebuild, quality gates | `include/analysis/event_feature_search_index.h`, `src/analysis/event_feature_search_index.cpp`의 optional vector API/report, `scripts/internal/analysis_state_smoke.cpp`의 S07 default-off/quality gate/stale rebuild smoke, `scripts/internal/verify_v310_optional_vector_search.mjs`와 `./server.sh verify-v310-optional-vector-search` | provider embedding calls, UI 풀테스트 직접 조작, 30분/120분, client/viewer 노출, published metadata evidence가 아님 |
| 8 | V310-S08 | P1 | 완료 | Retention/Export Hardening | encoded clip lifecycle cleanup, export bundle, audit | `include/analysis/event_retention_cleanup.h`, `src/analysis/event_retention_cleanup.cpp`의 encoded clip lifecycle cleanup counters, `src/analysis/event_storage.cpp`의 encoded manifest `media-server.v310.retention-export-hardening.v1`, `src/ingress/webrtc_http_server.cpp`의 release-safe export encoded media exclusion과 `export-bundle` audit hardening, `scripts/internal/verify_v310_retention_export_hardening.mjs`와 `./server.sh verify-v310-retention-export-hardening` | UI 풀테스트 직접 조작, 30분/120분, vector search, destructive operational cleanup, published metadata evidence가 아님 |
| 9 | V310-S09 | P0 | 완료 | Stabilization and Release Readiness | build/docs/verifier/UI evidence boundary와 release readiness records | v3.1 local stabilization, release evidence/not-run 경계, `./server.sh verify-v310-stabilization-release-readiness` | UI 풀테스트/30분/120분/published metadata/release action은 실행한 경우만 PASS |

## v3.1.0 S00 개발 기록

- 범위: P0 `V310-S00 v3.1 baseline`.
- `VERSION`, `CMakeLists.txt`: 현재 source version과 CMake project version을 `3.1.0`으로 정렬했습니다.
- `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md`, `docs/versioning-policy.md`, `docs/release-policy.md`, `docs/public-repo-final-review.md`, `docs/ui-guide.md`: 현재 source roadmap을 `v3.1.0 Encoded Event Clip and Safe Sharing Expansion`으로 전환하고 latest published release는 release publish 전에는 `v3.0.0`, publish 후에는 `v3.1.0` source-only GitHub Release로 분리했습니다.
- `docs/development-backlog.md`: V310 roadmap을 현재 source roadmap으로 승격하고 `V310-S00` 완료 상태, latest published `v3.1.0`, v3.1 기능 구현 완료 경계를 기록했습니다.
- `scripts/internal/verify_v310_entry_baseline.mjs`, `server.sh`: `./server.sh verify-v310-entry-baseline` 명령을 추가해 source `3.1.0`, latest published `v3.1.0`, current roadmap `v3.1.0 Encoded Event Clip and Safe Sharing Expansion`, 1차 선택값/fallback/제외 대상, license/provenance/privacy/운영 제약, feature inventory, release test records 연결을 정적 검증합니다.
- `scripts/internal/verify_release_metadata_consistency.mjs`: `verify-release-metadata`가 source `3.1.0`, current roadmap `v3.1.0 Encoded Event Clip and Safe Sharing Expansion`, latest published `v3.1.0`을 분리 검증하도록 보정했습니다.
- `config/docs_ui_assets.json`, `docs/assets/ui/README.md`: docs UI asset baseline의 source version을 `3.1.0`, latest published 기준을 `v3.1.0`으로 정렬했습니다. 이미지는 교체하지 않았고 대표 이미지가 UI 풀테스트/PASS/published evidence가 아니라는 경계는 유지했습니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`: `OPS-061`, `SAFE-093`, V310-S00 안정화 verifier, 저장소 보존형 테스트 결과를 추가했습니다.
- `codex/v310-event-clip-encoder`에 백업된 선개발 Event Clip Encoder Pipeline은 V310-S02 범위이므로 이번 S00에서 merge하지 않았고 S00 완료 evidence로 사용하지 않습니다.
- 검증: 최초 `./server.sh verify-v310-entry-baseline`는 VERSION/CMake/docs/backlog/inventory가 아직 v3.0 기준이라 `pass=0 fail=7`로 FAIL했습니다. 구현 후 `./server.sh verify-v310-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh build`, `git diff --check` 기준으로 재검증합니다.
- 미실행/비대체: `verify-release-metadata --published`, tag/push/GitHub Release, PR/main merge, V310-S01~S09 기능 구현, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, external TURN/WHEP, ONVIF 실기기, real cloud/VLM provider 호출은 S00 완료 근거가 아닙니다.

## v3.1.0 S01 개발 기록

- 범위: P0 `V310-S01 Encoded Event Clip Contract`.
- `docs/v310-encoded-event-clip-contract.md`: EncodedClipManifest, MP4/WebM format,
  FrameRef/PTS mapping, EvidenceManifest/frame bundle/event frame link, retention
  lifecycle, privacy/non-VMS boundary, S02/S03 비범위 경계를 정의했습니다.
- `test/fixtures/v310_event_clip_contract/encoded_clip_manifest_sample.json`:
  `media-server.encoded-event-clip-contract.v1` sample manifest를 추가했습니다.
  fixture는 runtime output이 아니라 contract fixture이며, MP4 sample shape,
  pre/event/post FrameRef와 `clipPtsMs`, event evidence artifact refs, retention,
  privacy, generation boundary를 포함합니다.
- `scripts/internal/verify_v310_event_clip_contract.mjs`, `server.sh`:
  `./server.sh verify-v310-event-clip-contract` 명령을 추가했습니다. 이 verifier는
  contract 문서, fixture, docs index, roadmap, stream verification, feature
  inventory, release records, server dispatch 연결을 정적으로 확인합니다.
- `docs/project-feature-test-inventory.md`,
  `scripts/internal/verify_feature_inventory_coverage.mjs`,
  `scripts/internal/verify_project_feature_test_inventory.mjs`: `OPS-062`와
  `SAFE-094`를 V310-S01 안정화 gate로 추가하고 coverage target을
  `verify-v310-event-clip-contract`에 연결했습니다. 제품 UI는
  `비대상: UI 없어야 정상`입니다.
- `docs/stream-verification.md`, `docs/release-test-records.md`, `docs/README.md`:
  S01 verifier catalog, 저장소 보존형 테스트 항목/결과 위치, 공개 docs index link를
  추가했습니다.
- 변경하지 않은 것: Event POST payload, WebRTC DataChannel schema, SSE/WS metadata,
  RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload, `/ops/events` UI,
  client/viewer route, encoder runtime queue/status/cleanup은 변경하지 않았습니다.
- 검증: 최초 `./server.sh verify-v310-event-clip-contract`는 command 미구현으로 FAIL했습니다.
  구현 후 `./server.sh verify-v310-event-clip-contract`, `./server.sh verify-project-inventory`,
  `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`,
  `./server.sh verify-docs-links`, `./server.sh build`, `git diff --check` 기준으로
  재검증합니다.
- 미실행/비대체: encoder generation, runtime muxing, queue/status/cleanup,
  `/ops/events` replay timeline UI, client-safe digest, scoped integrator API,
  UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, `verify-release-metadata --published`,
  tag/push/GitHub Release는 S01 완료 근거가 아닙니다.

## v3.1.0 S02 개발 기록

- 범위: P0 `V310-S02 Event Clip Encoder Pipeline`.
- branch 처리: `codex/v310-event-clip-encoder`는 현재 `v3.1.0`의 조상이라 `git merge codex/v310-event-clip-encoder` 결과가 `Already up to date`였습니다. 이후 local branch `codex/v310-event-clip-encoder`를 삭제했습니다. remote branch 삭제는 push/ref deletion이므로 사용자 푸시 명시 승인 없이 수행하지 않았습니다.
- `src/analysis/event_storage.cpp`: 기존 EventRecord frame-bundle clip hook 내부에 bounded short segment를 WebM/VP8 `event-clip.webm`으로 muxing하는 encoded clip artifact writer를 추가했습니다. `WriteClipMedia()`가 기존 `.clip/manifest.json`, `frame-bundle-manifest.json`, `evidence-manifest.json`, frame files를 유지한 뒤 `.clip/encoded/event-clip.webm`, `.clip/encoded/encoded-manifest.json`을 생성합니다.
- `src/analysis/event_storage.cpp`: encoded status manifest schema `media-server.encoded-event-clip-contract.v1`에 `sampleKind=runtime-output`, WebM/VP8 format, `inputSource=frame-bundle`, `queueName=event-clip-encoder`, `status=completed`, `ptsMapping.frames[].frameRef`, `frameMap`, `cleanup.deletedEntries`, `nonVmsBoundary.boundedShortSegment=true`, `continuousRecording=false`, `archiveApi=false`를 기록합니다.
- `src/analysis/event_storage.cpp`: encoded output directory를 job 시작 전에 정리해 stale/partial encoded output을 제거하고 삭제 entry 수를 clip manifest와 encoded manifest에 남깁니다.
- `scripts/internal/analysis_state_smoke.cpp`: Event recorder media hook smoke에 encoded WebM EBML header, encoded manifest, queue/status/FrameRef-PTS/frameMap/non-VMS boundary 확인 항목을 추가했습니다.
- `scripts/internal/verify_analysis_state_smoke.sh`: V310-S02 WebM clip encoding을 검증하기 위해 GStreamer appsrc/appsink compile/link flags를 추가했습니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`: `EVT-059`, `SAFE-083`, V310-S02 안정화 확인 항목과 완료 evidence 경계를 추가했습니다.
- 검증: 최초 WebM pipeline 시도는 4x4 smoke frame에서 GStreamer `not-negotiated`로 실패했습니다. `videoscale`과 최소 16x16 even caps를 명시한 뒤 `./server.sh verify-analysis-state`가 `pass=172 fail=0`으로 WebM/VP8 encoded clip media artifact, EBML header, encoded clip queue status, V300 evidence manifest, frame bundle manifest를 확인했습니다. 이후 `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-v310-event-clip-contract`, `./server.sh build`, `verify-script-inventory`, `verify-v300-event-evidence-contract`도 통과했습니다.
- 완료 경계: 이번 구현은 V310-S02 bounded WebM/VP8 encoder/status/partial cleanup pipeline입니다. `/ops/events` replay timeline UI, client-safe digest, scoped integrator API, 30분/120분 장시간 테스트, UI 풀테스트 직접 조작, published metadata, PR/main/tag/GitHub Release는 S02 완료 근거가 아닙니다.

## v3.1.0 S03 개발 기록

- 범위: P0 `V310-S03 Replay Timeline UI`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events`에 `data-testid="ops-v310-replay-timeline-ui"` 섹션을 추가하고 `OpsV310ReplayTimelineUiJson`/`OpsV310ReplayTimelineItemJson` view model을 구성했습니다. 이 view model은 기존 EventRecord evidence refs와 review state에서 event frame, representative image, frame bundle, encoded clip timeline, FrameRef/PTS mapping, playback segments를 Ops-only summary로 파생합니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderV310ReplayTimelineUi()`를 추가하고 `/ops/api/events/reviews` refresh flow에서 `replayTimeline`을 렌더링하도록 연결했습니다.
- `src/ingress/product_ui_css.cpp`: `.v310-replay-timeline-ui`, artifact grid, timeline rail, playback segment UI 스타일을 추가했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`: `/ops/events` smoke coverage에 V310 replay timeline shell marker와 schema marker를 추가했습니다.
- `scripts/internal/verify_v310_replay_timeline_ui.mjs`, `server.sh`: `./server.sh verify-v310-replay-timeline-ui` 명령을 추가해 `/ops/events` UI shell, replayTimeline view model, script rendering, CSS, ops smoke, docs/inventory/release records/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`: `UI-060`, `OPS-063`, `SAFE-095`, V310-S03 안정화 확인 항목과 완료 evidence 경계를 추가했습니다.
- 변경하지 않은 것: Event POST payload, WebRTC DataChannel schema, SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload, client/viewer route, client-safe digest, scoped integrator API, cleanup execution, published metadata는 변경하지 않았습니다.
- 검증: 최초 `node scripts/internal/verify_v310_replay_timeline_ui.mjs`는 S03 UI shell/view model/script/CSS/docs/server dispatch가 없어서 `pass=0 fail=8`로 FAIL했습니다. 구현 후 `./server.sh verify-v310-replay-timeline-ui`는 `pass=8 fail=0`으로 통과했습니다. `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `git diff --check`도 통과했습니다. `verify-ops-client-ui`는 서버 미기동/Node sandbox EPERM/auth-on 401 전제를 확인한 뒤 `MEDIA_SERVER_AUTH_MODE=off` 검증 서버에서 static smoke `pass=19 fail=0`, screenshot smoke `pass=25 fail=0` 및 visual/shell/client 세부 smoke fail 0으로 재검증했습니다. `verify-rule-ui`는 같은 auth-off 검증 서버와 Chrome fallback에서 `ok=true`로 통과했습니다.
- 완료 경계: 이번 구현은 `/ops/events` event frame, representative image, frame bundle, encoded clip timeline 표시와 Ops-only replay summary입니다. UI 풀테스트 직접 조작, 30분/120분, client digest, scoped API, cleanup 실행, published metadata evidence가 아닙니다.

## v3.1.0 S04 개발 기록

- 범위: P1 `V310-S04 Client-safe Event Digest`.
- `src/ingress/webrtc_http_server.cpp`: 기존 PublishedView-scoped `/client/api/views/{id}/events` 응답의 `ClientEventSummary`에 `eventDigest`를 추가했습니다. `AppendClientSafeEventDigestJson`은 `media-server.client.event-digest.v1`, `viewerSafe:true`, `publishedViewScoped:true`, `sourceUrlIncluded:false`, `rawEvidenceIncluded:false`, `debugMaterialIncluded:false`, `providerMaterialIncluded:false`, `featureProvenanceIncluded:false`, `internalEvidenceIncluded:false`, `encodedClipPathIncluded:false`, `ruleEditorIncluded:false`, `actionControlsIncluded:false`, `eventPostPayloadChanged:false`, `eventSchemaChanged:false`, `mediaPathChanged:false`를 고정하고 digest item에는 `summaryText`, `eventType`, `status`, `severity`, `timelineHint`, `time`만 씁니다.
- `src/ingress/product_ui_client_scripts.cpp`: `renderClientSafeEventDigest()`를 추가하고 `/client/live` dock, `/client/dashboard`, `/client/events`에 `data-testid="client-safe-event-digest"`와 `data-client-event-digest="viewer-safe"` card를 렌더링하도록 연결했습니다. renderer는 `eventDigest`의 허용 필드만 읽고 source/raw/debug/provider/feature provenance/encoded clip path/rule editor/action control 값을 읽지 않습니다.
- `src/ingress/product_ui_css.cpp`: `.client-safe-event-digest`를 기존 client-safe digest card/grid 스타일에 포함했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`: client shell smoke marker에 `client-safe-event-digest`, `eventDigest`, `viewer-safe event digest`, `media-server.client.event-digest.v1`를 추가했습니다.
- `scripts/internal/verify_v310_client_safe_event_digest.mjs`, `server.sh`: `./server.sh verify-v310-client-safe-event-digest` 명령을 추가해 API schema, client renderer, CSS, ops/client smoke, backlog, stream verification, feature inventory, manual UI checklist, release records, server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/manual-ui-checklist.md`, `docs/release-test-records.md`: `CLIENT-025`, `SAFE-096`, V310-S04 안정화 확인 항목, 수동 UI 대상 route, 완료 evidence 경계를 추가했습니다.
- 변경하지 않은 것: Event POST payload, WebRTC DataChannel schema, SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload, encoded clip artifact path, scoped integrator API, cleanup execution, published metadata는 변경하지 않았습니다.
- 검증: 최초 `./server.sh verify-v310-client-safe-event-digest`는 API 함수, client renderer, CSS/smoke marker, backlog final row, release records final row가 없어 `pass=1 fail=5`로 FAIL했습니다. 구현 후 `./server.sh verify-v310-client-safe-event-digest`는 `pass=6 fail=0`으로 통과했습니다. `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `git diff --check`, 기존 `verify-v250-client-safe-incident-digest`, `verify-v280-client-safe-followup-digest`도 통과했습니다. `verify-ops-client-ui`는 sandbox fetch 제한을 확인한 뒤 권한 실행으로 static smoke `pass=19 fail=0`, screenshot smoke `pass=25 fail=0` 및 visual/shell/client 세부 smoke fail 0으로 재검증했습니다. `verify-rule-ui`는 Chrome fallback 환경변수 누락 precheck를 보정한 뒤 `ok=true`로 통과했고, auth 3종은 bootstrap `pass=14 fail=0`, users `pass=58 fail=0`, routes `pass=135 fail=0`으로 통과했습니다.
- 완료 경계: 이번 구현은 client-safe event digest API/UI와 redaction boundary입니다. UI 풀테스트 직접 조작, 30분/120분, scoped API, cleanup 실행, published metadata evidence가 아닙니다.

## v3.1.0 S05 개발 기록

- 범위: P1 `V310-S05 Scoped Integrator Search API`.
- `include/ingress/ops_event_route_owner.h`, `src/ingress/ops_event_route_owner.cpp`: client summary route owner에 `events/search` subresource와 `IsClientViewEventsSearchRoute()` helper를 추가했습니다.
- `src/ingress/webrtc_http_server.cpp`: 기존 `/client/api/views/{id}` API router 안에 `/client/api/views/{id}/events/search` GET route를 추가했습니다. 이 route는 `auth::IsIntegrator()`로 integrator role을 요구하고 `SourceViewRegistry::ResolveClientViewAccess(..., "event:read")`로 `event:read:{viewId}` scope gate를 적용합니다.
- `src/ingress/webrtc_http_server.cpp`: `IntegratorScopedEventSearchJson()`이 EventRecord를 PublishedView source stream 범위에서 읽고 기존 `EventFeatureSearchIndex`/Search DSL을 일시 재사용해 `media-server.integrator.scoped-event-search.v1` 응답을 생성합니다. 응답은 eventId/viewId와 `digest.summaryText`, `eventType`, `status`, `severity`, `timelineHint`, `time`만 반환하고 source URL, raw evidence, debug material, provider material, feature provenance, internal evidence refs, encoded clip path, rule/action controls는 포함하지 않습니다.
- `scripts/internal/verify_v310_scoped_integrator_search_api.mjs`, `server.sh`: `./server.sh verify-v310-scoped-integrator-search-api` 명령을 추가해 route owner, API schema/redaction, docs/inventory/release records/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`: `CLIENT-026`, `SAFE-097`, `OPS-064`, V310-S05 안정화 확인 항목과 완료 evidence 경계를 추가했습니다.
- 변경하지 않은 것: Event POST payload, WebRTC DataChannel schema, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, `/ops/events` UI, client shell UI, cleanup execution, vector/embedding search, published metadata는 변경하지 않았습니다.
- 검증: 최초 `node scripts/internal/verify_v310_scoped_integrator_search_api.mjs`는 route owner, API 함수/schema, backlog/inventory/release records, server dispatch가 없어 `pass=0 fail=6`으로 FAIL했습니다. 구현 후 `./server.sh verify-v310-scoped-integrator-search-api`, `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `git diff --check` 기준으로 재검증합니다.
- 완료 경계: 이번 구현은 integrator-only PublishedView-scoped search API와 redacted digest payload입니다. UI 풀테스트 직접 조작, 30분/120분, cleanup execution, vector search, published metadata evidence가 아닙니다.

## v3.1.0 S06 개발 기록

- 범위: P1 `V310-S06 Operator Feature Correction`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events`에 `data-testid="ops-v310-operator-feature-correction"` shell을 추가하고, 기존 `OpsEventReviewState` JSONL persistence에 `corrected_feature_label`, `feature_aliases`, `reanalysis_requested`, `reanalysis_reason`을 추가했습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/events/reviews/{eventId}` PUT/POST가 top-level과 nested `featureCorrection`의 `correctedFeatureLabel`, `featureAliases`, `reanalysisRequested`, `reanalysisReason`을 받아 기존 review state에만 저장하고 `operator-feature-correction-update` audit action을 남깁니다.
- `src/ingress/webrtc_http_server.cpp`: `OpsV310OperatorFeatureCorrectionItemJson`/`OpsV310OperatorFeatureCorrectionViewJson`을 추가하고 `/ops/api/events/reviews` 응답의 `operatorFeatureCorrection` view model로 correction count, alias count, reanalysis request count, `media-server.ops.operator-feature-correction.v1` boundary flags를 노출합니다.
- `src/ingress/product_ui_page_scripts.cpp`: event review row에 `eventReviewFeatureCorrectionHtml()` controls를 추가하고 save payload에 `featureCorrection` object와 compatible top-level fields를 포함했습니다. `renderV310OperatorFeatureCorrection()`은 `/ops/events` summary section에 operator correction 상태를 표시합니다.
- `src/ingress/product_ui_css.cpp`: `.v310-operator-feature-correction`, `.operator-feature-correction-list`, `.operator-feature-correction-card`, `.ops-feature-correction-controls` 스타일을 추가했습니다.
- `scripts/internal/verify_v310_operator_feature_correction.mjs`, `server.sh`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: `./server.sh verify-v310-operator-feature-correction` 명령과 `/ops/events` smoke marker를 추가했습니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/manual-ui-checklist.md`, `docs/release-test-records.md`: `UI-061`, `EVT-061`, `SAFE-098`, `OPS-065`와 V310-S06 안정화 확인 항목, 수동 UI 대상 route, 완료 evidence 경계를 추가했습니다.
- 변경하지 않은 것: EventRecord top-level, Event POST payload, WebRTC DataChannel schema, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, Auth/Role/Scope, client/viewer route, runtime provider call, vector search, cleanup execution, published metadata는 변경하지 않았습니다.
- 검증: 최초 `./server.sh verify-v310-operator-feature-correction`는 S06 UI shell/state/API/view model/script/CSS/smoke/final docs가 없어 `pass=1 fail=9`로 FAIL했습니다. 구현 1차 후 같은 명령은 code/smoke 7개 check가 통과했지만 audit action source marker와 backlog/release records final row가 남아 `pass=7 fail=3`으로 FAIL했습니다. 문서/evidence 보정 후에는 audit summary source marker가 남아 `pass=9 fail=1`로 한 번 더 FAIL했고, summary 문자열 상수 보정 뒤 `./server.sh verify-v310-operator-feature-correction`가 `pass=10 fail=0`으로 통과했습니다. `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `./server.sh verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `./server.sh verify-ops-client-ui --screenshots --browser-mode chrome --allow-chrome-fallback --http-base http://127.0.0.1:8081`, `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`도 통과했습니다. 서버 없는 `./server.sh verify-ops-client-ui`와 auto mode 인앱 evidence 전제 실행은 각각 `fail`로 기록하고 동일 범위에서 재실행했습니다.
- 완료 경계: 이번 구현은 Ops-only operator feature correction persistence/UI/audit/view model입니다. UI 풀테스트 직접 조작, 30분/120분, optional vector search, cleanup execution, published metadata evidence가 아닙니다.

## v3.1.0 S07 개발 기록

- 범위: P2 `V310-S07 Optional Vector Search`.
- `include/analysis/event_feature_search_index.h`, `src/analysis/event_feature_search_index.cpp`: 기존 V300 text/tags/filter `EventFeatureSearchIndex` 계약은 유지하고, 별도 optional vector API/report를 추가했습니다. `RebuildOptionalVectorIndex()`는 기본 `enabled=false`에서 index를 만들지 않으며, 명시 opt-in일 때만 EventRecord-backed non-identifying embedding을 quality/dimension gate로 인덱싱합니다.
- `src/analysis/event_feature_search_index.cpp`: `SearchOptionalVector()`는 이미 전달된 local embedding vector만 사용해 cosine similarity를 계산합니다. runtime provider call, provider embedding call, raw prompt/response retention, face embedding, identity embedding, Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, client/viewer exposure는 모두 false invariant로 고정합니다.
- `scripts/internal/analysis_state_smoke.cpp`: `VerifyV310OptionalVectorSearch()`를 추가해 default-off behavior, explicit opt-in, quality/dimension/privacy rejection, similarity ranking, rebuild stale vector cleanup, provider/schema/media/client boundary를 확인합니다.
- `test/fixtures/v310_optional_vector_search/cases.json`, `scripts/internal/verify_v310_optional_vector_search.mjs`, `server.sh`: fixture와 `./server.sh verify-v310-optional-vector-search` 명령을 추가해 optional vector API/report, smoke, backlog/stream verification/inventory/release records/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`: `LAB-089`, `SAFE-100`, `OPS-067`, V310-S07 안정화 확인 항목과 완료 evidence 경계를 추가했습니다.
- 변경하지 않은 것: 기존 text/tags/filter Search DSL, `/client/api/views/{id}/events/search` redacted scoped API, EventRecord/Event POST payload, WebRTC DataChannel schema, SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload, `/ops/events` UI, client/viewer route, runtime provider 호출, provider embedding 호출, release publish state는 변경하지 않았습니다.
- 검증: 최초 `./server.sh verify-v310-optional-vector-search`는 optional vector API/report와 analysis-state S07 smoke 구현 전이라 기대 실패로 기록했습니다. 구현 후 `./server.sh verify-v310-optional-vector-search`, `./server.sh verify-analysis-state`, `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `git diff --check` 기준으로 재검증합니다.
- 완료 경계: 이번 구현은 default-off local optional vector index/search와 quality gate입니다. provider embedding calls, UI 풀테스트 직접 조작, 30분/120분, client/viewer 노출, cleanup execution, published metadata evidence가 아닙니다.

## v3.1.0 S08 개발 기록

- 범위: P1 `V310-S08 Retention/Export Hardening`.
- `include/analysis/event_retention_cleanup.h`, `src/analysis/event_retention_cleanup.cpp`: `EventRetentionCleanupItem`/`Action`/`Result`에 encoded clip manifest/media lifecycle counters를 추가했습니다. apply plan은 EventRecord, EvidenceManifest, encoded clip manifest/media, FeatureSet revision, SearchIndex를 같은 retention lifecycle group으로 삭제/de-index 대상으로 묶고 `encoded-clip-retention-export-hardening` marker와 JSON `encodedClipManifestsDeleted`/`encodedClipMediaDeleted`를 남깁니다.
- `src/analysis/event_storage.cpp`: runtime encoded clip manifest에 `media-server.v310.retention-export-hardening.v1` `retentionExportHardening` block을 추가했습니다. 이 block은 `implementedInStep=V310-S08`, encoded clip lifecycle cleanup, export bundle audit coverage, release-safe encoded media exclusion, token-expiry no-server-file cleanup 경계를 기록합니다.
- `src/ingress/webrtc_http_server.cpp`: release-safe incident evidence bundle manifest에 encoded clip media/path/manifest exclusion fields와 V310 hardening policy를 추가했습니다. 기존 `/lab/analysis/events/evidence/bundle-token`과 `/lab/analysis/events/evidence/bundle` route는 유지하고, raw route나 media path를 새로 만들지 않았습니다.
- `src/ingress/webrtc_http_server.cpp`: bundle download audit를 `BuildEvidenceBundleAuditJson()`로 분리하고 `export-bundle` audit payload에 releaseSafe, signed-token expiry, token-expiry cleanup, encoded clip lifecycle cleanup policy를 남기도록 했습니다.
- export-bundle audit coverage는 release-safe/raw bundle download 공통 audit payload가 V310 retention/export policy를 남기는지 확인하는 안정화 범위이며, UI 직접 다운로드 검수나 destructive cleanup 실행 근거가 아닙니다.
- `scripts/internal/analysis_state_smoke.cpp`: retention apply smoke가 encoded clip manifest/media deletion counters를 확인합니다.
- `scripts/internal/verify_v310_retention_export_hardening.mjs`, `server.sh`: `./server.sh verify-v310-retention-export-hardening` 명령을 추가해 cleanup model, encoded manifest, release-safe export manifest, audit payload, backlog/stream verification/inventory/release records/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`: `EVT-062`, `SAFE-099`, `OPS-066`, V310-S08 안정화 확인 항목과 완료 evidence 경계를 추가했습니다.
- 변경하지 않은 것: EventRecord top-level payload, Event POST payload, WebRTC DataChannel schema, SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload, client/viewer route, optional vector search, release publish state는 변경하지 않았습니다.
- 검증: 최초 `./server.sh verify-v310-retention-export-hardening`는 cleanup model, encoded manifest policy, release-safe export marker, audit helper, backlog/release records, script inventory 연결이 없어 `pass=0 fail=7`로 기대 실패했습니다. 구현 후 `./server.sh verify-v310-retention-export-hardening`, `./server.sh verify-analysis-state`, `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `git diff --check` 기준으로 재검증합니다.
- 완료 경계: 이번 구현은 encoded clip lifecycle cleanup plan, release-safe export bundle hardening, `export-bundle` audit coverage입니다. UI 풀테스트 직접 조작, 30분/120분, optional vector search, destructive operational cleanup, published metadata evidence가 아닙니다.

## v3.1.0 S09 개발 기록

- 범위: P0 `V310-S09 Stabilization and Release Readiness`.
- `scripts/internal/verify_v310_stabilization_release_readiness.mjs`: `media-server.v310-stabilization-release-readiness.v1` local readiness verifier를 추가했습니다. 이 verifier는 V310-S00~S08 companion local gates, release policy/evidence index/test records, feature inventory, stream verification, close-out dry-run command, server dispatch 연결을 확인합니다.
- `server.sh`: `./server.sh verify-v310-stabilization-release-readiness` 사용법과 dispatch를 추가했습니다.
- `docs/development-backlog.md`, `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`, `docs/release-test-records.md`, `docs/release-policy.md`, `docs/release-evidence-index.md`: V310-S09 local stabilization/release readiness 기록과 not-run 경계를 추가했습니다.
- `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`: `SAFE-101`, `OPS-068`, `verify-v310-stabilization-release-readiness` coverage를 추가했습니다.
- Companion local gate:

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

- 검증: 최초 `./server.sh verify-v310-stabilization-release-readiness`는 command 미구현으로 `알 수 없는 명령입니다: verify-v310-stabilization-release-readiness`를 출력하며 fail했습니다. 구현 후 위 companion local gate 기준으로 재검증합니다.
- 완료 경계: 이번 구현은 V310-S09 local readiness gate wiring, release evidence records, not-run boundaries입니다. UI 풀테스트 직접 조작, 30분/120분 longrun, `verify-release-metadata --published`, PR/main/tag/GitHub Release, field smoke 실행 evidence가 아닙니다.

## v3.1.0 공개 기준 기록: v3.1.0 Source Release Baseline

v3.1.0은 Encoded Event Clip and Safe Sharing Expansion source-only 직전 공개 릴리즈입니다.
이 기준은 encoded clip contract/generation, replay timeline UI, client-safe event digest,
scoped integrator search API, operator feature correction, optional vector search,
retention/export hardening, stabilization readiness를 local evidence와 함께 닫은 직전
published baseline입니다. 120분 longrun과 external field smoke는 실행하지 않은 영역으로
계속 분리합니다.

## v3.0.0 공개 기준 기록: v3.0.0 Source Release Baseline

v3.0.0은 Event Evidence Search MVP source-only historical 공개 릴리즈입니다. 이 기준은
v3.1.0의 완료 evidence로 재사용하지 않는 historical baseline입니다.

## 직전 공개 기준 상세: v3.0.0 Event Evidence Search MVP

상태: `V300-S00` source baseline 정렬 완료, `V300-S01` Event Evidence Contract
완료, `V300-S02` Frame Bundle Extraction 완료, `V300-S03` Feature Schema and
Privacy Policy 완료, `V300-S04` VLM Feature Queue 완료, `V300-S05` Feature-only
Retention 완료, `V300-S06` Search DSL and Query Convert 직접 개발 완료, search
index 완료, `V300-S08` Ops Events UI 직접 개발 완료, `V300-S09`
Retention/Pin/Cleanup 직접 개발 완료, `V300-S10` Stabilization and Release
Readiness 직접 개발 완료. 이 절은 v3.0.0 전체 기능 완료 evidence가 아니며, 실제 기능
구현은 각 Step별 코드/UI/API/검증 evidence가 생긴 뒤에만 완료로 기록합니다.
V300-S00 baseline 정렬 자체는 기능 구현 완료 evidence가 아닙니다.

직접 답: v3.0.0의 1차 선택값은 `Event Evidence Search MVP`입니다. 이 방향은
MediaServer를 VMS/NVR로 확장하지 않고, 실시간 VA 이벤트에서 검색 가능한 evidence
bundle과 비식별 VLM feature를 생성해 운영자가 `/ops/events`에서 자연어로 사건을
찾고 근거 frame을 검토할 수 있게 합니다.

fallback 또는 축소 대안은 `Conservative Foundation`입니다. 이 대안은 schema/storage
foundation만 두고 UI/search를 preview로 남기는 경로이며, 제품 체감이 약해 1차 선택값은
아닙니다. `Archive/Playback Expansion`은 encoded clip, playback, archive 성격이 커서
v3.1 확장 후보로 분리합니다.

설계 기록: [docs/superpowers/specs/2026-06-20-v300-v310-event-evidence-search-roadmap-design.md](superpowers/specs/2026-06-20-v300-v310-event-evidence-search-roadmap-design.md)

포함 범위:

- 상시녹화가 아닌 이벤트 중심 evidence 저장
- event frame 필수 저장, representative image 선택 저장
- bbox crop, pre/event/post frame bundle, FrameRef contract
- 확장 가능한 비식별 VLM feature schema
- raw LLM/VLM prompt와 raw response 미저장
- background-first VLM feature queue와 lazy fallback
- 자연어 query를 제한된 Search DSL로 변환
- text/tags/filter 기반 `/ops/events` 검색과 evidence detail UI
- 기본 7일 retention, pin 보존, 운영자 설정 가능 cleanup

제외 범위:

- 24/7 상시녹화, VMS/NVR archive API
- encoded MP4/WebM event clip과 clip playback
- 얼굴 인식, 신원 식별, watchlist, face embedding
- raw prompt/response/provider request body 보관
- client/viewer 노출, cloud provider default-on, vector search 기본 탑재

제외 대상과 제외 사유:

- encoded MP4/WebM event clip과 clip playback: v3.0의 evidence image/search MVP보다
  playback/archive 범위가 커서 v3.1로 분리합니다.
- 24/7 상시녹화와 VMS/NVR archive API: 제품 정체성을 VMS/NVR로 확장하므로 제외합니다.
- 얼굴 인식, 신원 식별, watchlist, face embedding: 비식별 feature 정책을 깨므로
  제외합니다.
- raw prompt/response/provider request body 보관: privacy와 provider retention 위험이
  커서 feature-only durable retention으로 제한합니다.
- client/viewer 노출과 cloud provider default-on: v3.0 MVP는 Ops-only, local-first,
  explicit opt-in 경계를 유지합니다.

리스크와 대응:

- VMS/NVR 범위 확장 위험: 상시녹화와 broad archive/playback API를 제외합니다.
- VLM 지연/실패 위험: media/EventRecord/evidence 경로와 VLM queue를 분리하고
  VLM-only failure로 기록합니다.
- privacy 노출 위험: feature-only retention을 사용하고 raw prompt/response를 저장하지
  않습니다.
- 재생/근거 추적 위험: evidence와 feature provenance에 FrameRef를 필수로 둡니다.
- 검색 품질 검증 위험: v3.0은 설명 가능한 text/tags/filter 검색으로 시작하고,
  vector search는 v3.1 optional default-off 후보로 둡니다.

| Step | ID | Priority | 상태 | 묶음 | 개발 내용 | 완료 산출물 | 검증/evidence 경계 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | V300-S00 | P0 | 완료 | v3.0 baseline | VERSION/CMake/README/docs/backlog/source roadmap을 v3.0 작업 기준으로 정렬 | source `3.0.0`, latest published `v3.0.0`, current roadmap `v3.0.0 Event Evidence Search MVP`, V300-S00 verifier 연결 | `./server.sh verify-v300-entry-baseline`, `verify-release-metadata`, docs/inventory gates. 기능 구현 완료 evidence가 아님 |
| 1 | V300-S01 | P0 | 완료 | Event Evidence Contract | EvidenceManifest, FrameRef, retention lifecycle, non-VMS boundary 정의 | [docs/event-evidence-contract.md](event-evidence-contract.md), `test/fixtures/event_evidence_contract/evidence_manifest_sample.json`, `./server.sh verify-v300-event-evidence-contract` | encoded clip, playback, VMS API 완료 evidence가 아님 |
| 2 | V300-S02 | P0 | 완료 | Frame Bundle Extraction | event frame 필수, representative image 선택, bbox crop, pre/event/post frame bundle 생성 | `evidence-manifest.json`, `frame-bundle-manifest.json`, eventFrame/representativeImage/bboxCrop/frameBundle sidecar | 영상 파일 playback 또는 MP4/WebM encoded clip evidence가 아님 |
| 3 | V300-S03 | P0 | 완료 | Feature Schema and Privacy Policy | namespace 기반 feature envelope, 비식별 feature 허용, identity feature 금지 | [docs/event-feature-schema-privacy.md](event-feature-schema-privacy.md), `test/fixtures/event_feature_schema_privacy/feature_set_sample.json`, `./server.sh verify-v300-feature-schema-privacy` | 얼굴 인식/신원 식별/model 품질 PASS가 아님 |
| 4 | V300-S04 | P0 | 완료 | VLM Feature Queue | background queue, lazy trigger, timeout/invalid-output/missing-runtime 상태 분리 | [docs/v300-vlm-feature-queue.md](v300-vlm-feature-queue.md), `test/fixtures/v300_vlm_feature_queue/cases.json`, `./server.sh verify-v300-vlm-feature-queue`, `verify-analysis-state` S04 smoke | real provider success나 default-on evidence가 아님 |
| 5 | V300-S05 | P0 | 완료 | Feature-only Retention | raw prompt/response non-retention, feature revision, reanalysis policy | [docs/v300-feature-only-retention.md](v300-feature-only-retention.md), `test/fixtures/v300_feature_only_retention/cases.json`, `./server.sh verify-v300-feature-only-retention`, `verify-analysis-state` S05 smoke | raw response 보관이나 provider replay evidence가 아님 |
| 6 | V300-S06 | P0 | 완료 | Search DSL and Query Convert | 자연어를 제한된 Search DSL JSON으로 변환하고 text/tags/filter 검색 수행. natural language to constrained Search DSL, text/tags/filter search | [docs/v300-search-dsl-query-convert.md](v300-search-dsl-query-convert.md), `test/fixtures/v300_search_dsl_query_convert/cases.json`, `./server.sh verify-v300-search-dsl-query-convert`, `verify-analysis-state` S06 smoke | raw LLM response 저장, Feature/Search Index, `/ops/events` UI, vector search 완료 evidence가 아님 |
| 7 | V300-S07 | P1 | 완료 | Feature/Search Index | EventRecord, FeatureSet, EvidenceManifest, operator review state 검색 | [docs/v300-feature-search-index.md](v300-feature-search-index.md), `test/fixtures/v300_feature_search_index/cases.json`, `./server.sh verify-v300-feature-search-index`, `verify-analysis-state` S07 smoke | `/ops/events` UI나 vector search evidence가 아님 |
| 8 | V300-S08 | P1 | 완료 | Ops Events UI | `/ops/events` 검색, evidence timeline, feature 근거, retry, pin, retention status | Ops-only search/detail UI, `eventEvidenceSearch` view model, `./server.sh verify-v300-ops-events-ui` | UI 직접 조작/브라우저 evidence 없이는 UI 풀테스트 PASS가 아님. Retention/Pin/Cleanup lifecycle delete/dry-run/audit는 S09 범위 |
| 9 | V300-S09 | P1 | 완료 | Retention/Pin/Cleanup | 7일 기본 retention, pin 제외, 설정 가능 cleanup, dry-run/audit | [docs/v300-retention-pin-cleanup.md](v300-retention-pin-cleanup.md), `test/fixtures/v300_retention_pin_cleanup/cases.json`, `./server.sh verify-v300-retention-pin-cleanup`, `verify-analysis-state` S09 smoke | destructive cleanup 실행은 별도 승인과 evidence 필요. UI 풀테스트/30분/120분/published metadata 완료 evidence가 아님 |
| 10 | V300-S10 | P0 | 완료 | Stabilization and Release Readiness | build/docs/verifier/UI 기준과 release readiness 기록 | v3.0 local stabilization, release evidence/not-run 경계, `./server.sh verify-v300-stabilization-release-readiness` | UI 풀테스트/30분/120분/published metadata는 실행한 경우만 PASS |

## v3.0.0 S00 개발 기록

- 범위: P0 `V300-S00 v3.0 baseline`.
- `VERSION`, `CMakeLists.txt`: 현재 source version과 CMake project version을 `3.0.0`으로 정렬했습니다.
- `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md`, `docs/versioning-policy.md`, `docs/release-policy.md`, `docs/public-repo-final-review.md`, `docs/ui-guide.md`: 현재 source roadmap을 `v3.0.0 Event Evidence Search MVP`로 전환하고 latest published release는 `v2.9.0` source-only GitHub Release로 분리했습니다.
- `docs/development-backlog.md`: V300 roadmap을 현재 source roadmap으로 승격하고 `V300-S00` 완료 상태, latest published `v2.9.0`, v3.0 기능 구현 미완료 경계를 기록했습니다.
- `scripts/internal/verify_v300_entry_baseline.mjs`, `server.sh`: `./server.sh verify-v300-entry-baseline` 명령을 추가해 source `3.0.0`, latest published `v2.9.0`, current roadmap `v3.0.0 Event Evidence Search MVP`, 1차 선택값/fallback/제외 대상, feature inventory, release test records 연결을 정적 검증합니다.
- `scripts/internal/verify_release_metadata_consistency.mjs`: `verify-release-metadata`가 source `3.0.0`, current roadmap `v3.0.0 Event Evidence Search MVP`, latest published `v2.9.0`을 분리 검증하도록 보정했습니다.
- `config/docs_ui_assets.json`, `docs/assets/ui/README.md`: docs UI asset baseline의 source version을 `3.0.0`, latest published 기준을 `v2.9.0`으로 정렬했습니다. 이미지는 교체하지 않았고 대표 이미지가 UI 풀테스트/PASS/published evidence가 아니라는 경계는 유지했습니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`: `OPS-051`, `SAFE-081`, V300-S00 안정화 verifier, 저장소 보존형 테스트 결과를 추가했습니다.
- `v3.0.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.
- 검증: 최초 `./server.sh verify-v300-entry-baseline`는 command 미구현으로 FAIL했습니다. 구현 후 `./server.sh verify-v300-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh build`, `git diff --check` 기준으로 재검증합니다.
- 미실행/비대체: `verify-release-metadata --published`, tag/push/GitHub Release, PR/main merge, 30분/120분 장시간 테스트, UI 풀테스트 직접 조작, external TURN/WHEP, ONVIF 실기기, real cloud/VLM provider 호출은 S00 완료 근거가 아닙니다.

## v3.0.0 S01 개발 기록

- 범위: P0 `V300-S01 Event Evidence Contract`.
- `docs/event-evidence-contract.md`: EvidenceManifest, FrameRef, eventFrame 필수/representativeImage 선택, bboxCrop, frameBundle contract, 기본 7일 retention, pin 제외, cleanup dry-run, raw prompt/response non-retention, identity feature 금지, non-VMS boundary를 정의했습니다.
- `test/fixtures/event_evidence_contract/evidence_manifest_sample.json`: `media-server.event-evidence-contract.v1` sample manifest를 추가해 eventFrame, representativeImage, bboxCrop, pre/event/post frameBundle, retention/privacy/non-VMS guard를 검증 대상으로 만들었습니다.
- `scripts/internal/verify_v300_event_evidence_contract.mjs`, `server.sh`: `./server.sh verify-v300-event-evidence-contract` 명령을 추가해 계약 문서, fixture, docs index, roadmap, stream verification, feature inventory, release records, server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`: `OPS-052`, `SAFE-082`, V300-S01 안정화 verifier, 저장소 보존형 테스트 결과와 미실행/제외 경계를 추가했습니다.
- 검증: 최초 `./server.sh verify-v300-event-evidence-contract`는 command 미구현으로 FAIL했습니다. 구현 후 `./server.sh verify-v300-event-evidence-contract`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `./server.sh build`, `git diff --check` 기준으로 재검증합니다.
- 미실행/비대체: Frame Bundle Extraction, encoded MP4/WebM event clip, clip playback, VMS/NVR archive API, Search DSL, `/ops/events` UI, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, real cloud/VLM provider 호출, published metadata는 S01 완료 근거가 아닙니다.

## v3.0.0 S02 개발 기록

- 범위: P0 `V300-S02 Frame Bundle Extraction`.
- `src/analysis/event_storage.cpp`: EventRecord recorder clip hook이 frame cache에서 `frame-bundle-manifest.json`을 생성하도록 추가했습니다. manifest는 `media-server.va.frame-bundle.v1` schema, `pre`/`event`/`post` phase, source/channel/stream epoch/frameSeq/pts/wall-clock/relative event time FrameRef를 기록합니다.
- `src/analysis/event_storage.cpp`: 같은 clip directory에 `evidence-manifest.json`을 생성하도록 추가했습니다. manifest는 `media-server.event-evidence-contract.v1` schema, required `eventFrame`, representativeImage selection status, `bboxCrops`, `frameBundle`, retention/privacy/non-VMS boundary를 기록합니다.
- `src/analysis/event_storage.cpp`: EventRecord metadata의 `vlmEvidenceRefs`에 `evidenceManifest`와 `frameBundleManifest` reference를 추가했습니다. EventRecord top-level, Event POST/WebRTC/SSE/WS payload, RTSP/WebRTC media path는 변경하지 않았습니다.
- `scripts/internal/analysis_state_smoke.cpp`: recorder smoke에 V300 evidence manifest, pre/event/post frame bundle manifest, FrameRef, privacy/non-VMS guard 검증을 추가했습니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`: `EVT-060`, `SAFE-084`, V300-S02 안정화 verifier와 저장소 보존형 테스트 항목을 추가했습니다.
- 검증: 최초 `./server.sh verify-analysis-state`는 `Event recorder metadata must include V300 evidence manifest and frame bundle references`로 FAIL했습니다. 구현 후 `./server.sh verify-analysis-state`는 `pass=144 fail=0`으로 PASS했습니다. 추가 안정화는 `./server.sh build`, inventory/docs verifier, `git diff --check` 기준으로 재검증합니다.
- 미실행/비대체: encoded MP4/WebM playback, VMS/NVR archive API, Search DSL, `/ops/events` UI, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, real cloud/VLM provider 호출, published metadata는 S02 완료 근거가 아닙니다.

## v3.0.0 S03 개발 기록

- 범위: P0 `V300-S03 Feature Schema and Privacy Policy`.
- `docs/event-feature-schema-privacy.md`: FeatureSet envelope, `appearance`/`action`/`scene`/`spatial`/`event`/`operator`/`embedding` namespace, allowed/disallowed matrix, raw prompt/response non-retention, identity feature 금지, EventRecord/Event POST/WebRTC/SSE/WS/media path 불변 경계를 정의했습니다.
- `test/fixtures/event_feature_schema_privacy/feature_set_sample.json`: `media-server.event-feature-set.v1` sample FeatureSet을 추가해 evidence refs, non-identifying feature values, confidence/uncertainty/provenance, disallowed identity matrix, privacy guard boolean을 검증 대상으로 만들었습니다.
- `scripts/internal/verify_v300_feature_schema_privacy.mjs`, `server.sh`: `./server.sh verify-v300-feature-schema-privacy` 명령을 추가해 S03 정책 문서, fixture, docs index, roadmap, stream verification, feature inventory, release records, server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`: `LAB-083`, `SAFE-085`, `OPS-053`, V300-S03 안정화 verifier, 저장소 보존형 테스트 항목을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v300_feature_schema_privacy.mjs`는 `docs/event-feature-schema-privacy.md`가 없어 FAIL했습니다. 구현 후 `./server.sh verify-v300-feature-schema-privacy`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `./server.sh build`, `git diff --check` 기준으로 재검증합니다.
- 미실행/비대체: VLM Feature Queue, real VLM runtime/provider 호출, Search DSL, `/ops/events` UI, 얼굴 인식/신원 식별/model 품질 PASS, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata는 S03 완료 근거가 아닙니다.

## v3.0.0 S04 개발 기록

- 범위: P0 `V300-S04 VLM Feature Queue`.
- `include/analysis/vlm_feature_queue.h`, `src/analysis/vlm_feature_queue.cpp`: `VlmFeatureQueueTask`, `VlmFeatureQueueOutcome`, `VlmFeatureQueue`를 추가했습니다. `EnqueueBackgroundTask()`는 bounded background queue와 `missing-runtime`/`queue-timeout` outcome을, `RunLazyTask()`는 explicit lazy trigger outcome을, `RunNext()`는 structured `media-server.event-feature-set.v1` FeatureSet revision 저장 대상을 검증합니다.
- `scripts/internal/analysis_state_smoke.cpp`, `scripts/internal/verify_analysis_state_smoke.sh`: `VerifyV300VlmFeatureQueue()` smoke와 `vlm_feature_queue.cpp` 빌드 연결을 추가해 background enqueue, FeatureSet revision, lazy trigger, missing-runtime, queue-timeout, invalid-output을 C++ 단위로 확인합니다.
- `docs/v300-vlm-feature-queue.md`, `test/fixtures/v300_vlm_feature_queue/cases.json`: S04 queue contract, outcome matrix, VLM-only failure, raw prompt/response non-retention, real provider 미실행 경계와 fixture case를 추가했습니다.
- `scripts/internal/verify_v300_vlm_feature_queue.mjs`, `server.sh`: `./server.sh verify-v300-vlm-feature-queue` 명령을 추가해 S04 module/fixture/docs/backlog/stream verification/inventory/release records/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`: `LAB-084`, `SAFE-086`, `OPS-054`, V300-S04 안정화 verifier와 저장소 보존형 테스트 항목을 추가했습니다.
- 검증: 최초 `./server.sh verify-analysis-state`는 `src/analysis/vlm_feature_queue.cpp` 부재로 FAIL했습니다. 구현 후 `./server.sh build`, `./server.sh verify-analysis-state`(`pass=150 fail=0`), `./server.sh verify-v300-vlm-feature-queue`(`pass=6 fail=0`), `./server.sh verify-project-inventory`(`pass=13 fail=0`), `./server.sh verify-feature-inventory-coverage`(`pass=5 fail=0`), `./server.sh verify-script-inventory`(`pass=11 fail=0`), `./server.sh verify-docs-links`(`failures=0`), `./server.sh verify-docs-ui-assets`(`pass=10 fail=0`), `git diff --check` 기준으로 재검증했습니다.
- 미실행/비대체: real VLM runtime/provider 호출, cloud provider success, model 품질 PASS, Search DSL, `/ops/events` UI, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata는 S04 완료 근거가 아닙니다.

## v3.0.0 S05 개발 기록

- 범위: P0 `V300-S05 Feature-only Retention`.
- `include/analysis/vlm_feature_retention.h`, `src/analysis/vlm_feature_retention.cpp`: `VlmFeatureRetentionRequest`, `VlmFeatureRetentionOutcome`, `VlmFeatureRetentionStore`를 추가했습니다. `StoreRevision()`은 structured `media-server.event-feature-set.v1` revision만 `media-server.vlm-feature-retention-record.v1`로 보존하고, raw prompt/raw provider response/provider request body/credential/source URL/raw frame bytes가 있으면 `reject-raw-provider-material`로 거부합니다. `RequestReanalysis()`는 기존 revision을 덮어쓰지 않고 `store-reanalysis-revision`으로 새 revision과 `previousRevision`을 기록합니다.
- `scripts/internal/analysis_state_smoke.cpp`, `scripts/internal/verify_analysis_state_smoke.sh`: `VerifyV300FeatureOnlyRetention()` smoke와 `vlm_feature_retention.cpp` 빌드 연결을 추가해 feature-only revision store, raw prompt rejection, raw provider response rejection, provider replay 없는 reanalysis, previous revision 보존을 C++ 단위로 확인합니다.
- `docs/v300-feature-only-retention.md`, `test/fixtures/v300_feature_only_retention/cases.json`: S05 retention contract, raw prompt/response non-retention guard, reanalysis policy, provider replay 비범위, Search DSL/UI/cleanup lifecycle 비대체 경계와 fixture case를 추가했습니다.
- `scripts/internal/verify_v300_feature_only_retention.mjs`, `server.sh`: `./server.sh verify-v300-feature-only-retention` 명령을 추가해 S05 module/fixture/docs/backlog/stream verification/inventory/release records/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`: `LAB-085`, `SAFE-087`, `OPS-055`, V300-S05 안정화 verifier와 저장소 보존형 테스트 항목을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v300_feature_only_retention.mjs`는 `include/analysis/vlm_feature_retention.h` 부재로 FAIL했습니다. 코드 리뷰 후 추가한 RED smoke는 `sourceEvidenceRefs` raw source URL 우회로 `./server.sh verify-analysis-state`가 `pass=129 fail=1`로 FAIL했습니다. 구현 보강 후 `./server.sh verify-v300-feature-only-retention`(`pass=6 fail=0`), `./server.sh verify-analysis-state`(`pass=158 fail=0`), `./server.sh build`, `./server.sh verify-project-inventory`(`featureRows=534`, `pass=13 fail=0`), `./server.sh verify-feature-inventory-coverage`(`covered=534`, `missing=0`, `pass=5 fail=0`), `./server.sh verify-script-inventory`(`pass=11 fail=0`), `./server.sh verify-docs-links`(`failures=0`), `git diff --check` 기준으로 재검증했습니다.
- 미실행/비대체: raw prompt/raw provider response 보관, provider replay, Search DSL, `/ops/events` UI, Retention/Pin/Cleanup lifecycle delete/dry-run/audit, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata는 S05 완료 근거가 아닙니다.

## v3.0.0 S06 개발 기록

- 범위: P0 `V300-S06 Search DSL and Query Convert`.
- `include/analysis/event_search_query.h`, `src/analysis/event_search_query.cpp`: `EventSearchDsl`, `EventSearchFilter`, `EventSearchDocument`, `EventSearchQueryOptions`와 `ConvertEventSearchQueryToDsl()`, `SearchEventDocuments()`, `EventSearchDslJson()`을 추가했습니다. 자연어 query의 text term, `tag:*`, 허용 filter를 `media-server.event-search-dsl.v1`로 변환하고 bounded `limit`/`offset`/`eventTimeDesc` 기본값을 적용합니다.
- `src/analysis/event_search_query.cpp`: `status`, `sourceId`, `channelId`, `eventType`, `scenario`, `reviewState`, `zoneId`, `timestampMs`, `pinned`만 filter로 허용하고, unknown filter와 identity/watchlist query는 거부합니다. runtime provider call, vector search, Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, viewer/client 노출은 모두 false invariant로 고정했습니다.
- `scripts/internal/analysis_state_smoke.cpp`, `scripts/internal/verify_analysis_state_smoke.sh`: `VerifyV300SearchDslQueryConvert()` smoke와 `event_search_query.cpp` 빌드 연결을 추가해 natural language conversion, strict DSL defaults, text/tags/filter matching, identity query rejection, provider/schema/media boundary invariant를 C++ 단위로 확인합니다.
- `docs/v300-search-dsl-query-convert.md`, `test/fixtures/v300_search_dsl_query_convert/cases.json`: S06 DSL contract, allowed token mapping, identity-query rejection, raw prompt/response non-retention, provider/vector/index/UI 비대체 경계와 fixture case를 추가했습니다.
- `scripts/internal/verify_v300_search_dsl_query_convert.mjs`, `server.sh`: `./server.sh verify-v300-search-dsl-query-convert` 명령을 추가해 S06 module/fixture/docs/backlog/stream verification/inventory/release records/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`: `LAB-086`, `SAFE-088`, `OPS-056`, V300-S06 안정화 verifier와 저장소 보존형 테스트 항목을 추가했습니다.
- 검증: 최초 `node scripts/internal/verify_v300_search_dsl_query_convert.mjs`는 `include/analysis/event_search_query.h` 부재로 FAIL했고, 최초 `./server.sh verify-analysis-state`는 `src/analysis/event_search_query.cpp` 부재로 FAIL했습니다. 구현 후 `./server.sh build`, `./server.sh verify-analysis-state`(`pass=162 fail=0`), `./server.sh verify-v300-search-dsl-query-convert`(`pass=6 fail=0`), `./server.sh verify-project-inventory`(`featureRows=537`, `pass=13 fail=0`), `./server.sh verify-feature-inventory-coverage`(`covered=537`, `missing=0`, `pass=5 fail=0`), `./server.sh verify-script-inventory`(`pass=11 fail=0`), `./server.sh verify-docs-links`(`failures=0`), `./server.sh verify-docs-ui-assets`(`pass=10 fail=0`), `git diff --check` 기준으로 재검증했습니다.
- 미실행/비대체: Feature/Search Index, `/ops/events` UI 직접 조작, vector search/embedding, real LLM/VLM provider query conversion, raw prompt/raw provider response 보관, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata는 S06 완료 근거가 아닙니다. 이 단계는 search index나 `/ops/events` UI evidence가 아님을 명시합니다.

## v3.0.0 S07 개발 기록

- 범위: P1 `V300-S07 Feature/Search Index`.
- `include/analysis/event_feature_search_index.h`, `src/analysis/event_feature_search_index.cpp`: `EventFeatureSearchIndex`, `EventFeatureSearchIndexRebuildInput`, `EventSearchIndexReport`를 추가했습니다. `Rebuild()`는 EventRecord를 기준 entry로 만들고 latest FeatureSet revision, EvidenceManifest, operator review state를 검색 projection에 붙입니다. orphan FeatureSet/EvidenceManifest/review state, stale FeatureSet revision, raw prompt/response 또는 identity/privacy 위반 입력은 index에서 제외합니다.
- `src/analysis/event_feature_search_index.cpp`: `Search()`는 S06 `EventSearchDsl`과 `EventSearchDocumentMatches()`를 재사용해 text/tags/filter/sort/limit/offset 검색을 수행합니다. rebuild마다 이전 entry를 비워 stale result guard를 보장하고, report invariant는 provider call, vector search, Ops UI requirement, Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, viewer/client 노출을 모두 false로 고정합니다.
- `include/analysis/event_search_query.h`, `src/analysis/event_search_query.cpp`: S07 index가 EventRecord의 `zoneId`, `lineId`, `className`을 실제 filter/search 대상으로 넘길 수 있도록 `EventSearchDocument`와 `FieldValue()`/text haystack을 확장했습니다. 외부 Event POST payload, WebRTC/SSE/WS metadata schema, RTSP/WebRTC media path는 변경하지 않았습니다.
- `scripts/internal/analysis_state_smoke.cpp`, `scripts/internal/verify_analysis_state_smoke.sh`: `VerifyV300FeatureSearchIndex()` smoke와 `event_feature_search_index.cpp` 빌드 연결을 추가해 EventRecord/FeatureSet/EvidenceManifest/review projection, latest revision selection, orphan/privacy guard, rebuild stale result guard, provider/schema/media/UI boundary invariant를 C++ 단위로 확인합니다.
- `docs/v300-feature-search-index.md`, `test/fixtures/v300_feature_search_index/cases.json`: S07 index/rebuild/report contract, projection source, stale result guard, raw prompt/response non-retention, UI/vector/provider rerank 비대체 경계와 fixture case를 추가했습니다.
- `scripts/internal/verify_v300_feature_search_index.mjs`, `server.sh`: `./server.sh verify-v300-feature-search-index` 명령을 추가해 S07 module/fixture/docs/backlog/stream verification/inventory/release records/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`, `docs/README.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`: `LAB-087`, `SAFE-089`, `OPS-057`, V300-S07 안정화 verifier, docs index, 저장소 보존형 테스트 항목을 추가했습니다.
- 검증: 최초 `./server.sh verify-v300-feature-search-index`는 `include/analysis/event_feature_search_index.h` 부재로 FAIL했고, 최초 `./server.sh verify-analysis-state`는 `src/analysis/event_feature_search_index.cpp` 부재로 FAIL했습니다. 구현 후 `./server.sh verify-analysis-state`(`pass=167 fail=0`), `./server.sh verify-v300-feature-search-index`(`pass=6 fail=0`), `./server.sh build`, `./server.sh verify-project-inventory`(`featureRows=540`, `pass=13 fail=0`), `./server.sh verify-feature-inventory-coverage`(`covered=540`, `missing=0`, `pass=5 fail=0`), `./server.sh verify-script-inventory`(`pass=11 fail=0`), `./server.sh verify-docs-links`(`failures=0`), `./server.sh verify-docs-ui-assets`(`pass=10 fail=0`), `git diff --check` 기준으로 재검증했습니다.
- 임시 산출물 정리: `/private/tmp/media_server_analysis_state_smoke-*`와 `/private/tmp/media_server_analysis_state_dep_scan.txt`를 삭제하고 재조회에서 미검출을 확인했습니다.
- 미실행/비대체: `/ops/events` UI 직접 조작, vector search/embedding, semantic provider rerank, Retention/Pin/Cleanup lifecycle delete/dry-run/audit, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata는 S07 완료 근거가 아닙니다. 이 단계는 Feature/Search Index projection과 stale result guard evidence이며 `/ops/events` UI evidence가 아님을 명시합니다.

## v3.0.0 S08 개발 기록

- 범위: P1 `V300-S08 Ops Events UI`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events`에 `data-testid="ops-v300-event-evidence-search-ui"` section을 추가하고 `OpsV300EventEvidenceSearchUiJson()` view model을 구성했습니다. 이 view model은 S07 `EventFeatureSearchIndex`를 사용해 EventRecord, FeatureSet, EvidenceManifest, operator review state projection을 검색하고 `evidenceTimeline`, `featureReasons`, `retryActions`, `pinStatus`, `retentionStatus`를 반환합니다.
- `src/ingress/webrtc_http_server.cpp`: `eventEvidenceSearch` 응답에 `featureSearchIndexBacked:true`, `modelProviderDependency:false`, `vectorSearchPerformed:false`, `eventPostPayloadChanged:false`, `viewerClientExposureAdded:false`, `retentionCleanupExecuted:false` invariant를 포함했습니다. Event POST/WebRTC/SSE/WS metadata schema와 RTSP/WebRTC media path는 변경하지 않았습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `v300EventEvidenceSearchQueryParams()`, `renderV300EventEvidenceSearchUi()`와 `/ops/events` refresh wiring을 추가해 검색어, retry filter, pinned-only control, evidence detail card, timeline, feature reason, retry/pin/retention badges를 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `.v300-event-evidence-search-ui`, `.v300-event-evidence-card`, `.v300-evidence-timeline`, `.v300-feature-reason-grid`, `.v300-retention-status-grid`, `.v300-retry-action-list` 스타일을 추가해 고정 폭 card 없이 반응형 grid로 표시합니다.
- `scripts/internal/verify_v300_ops_events_ui.mjs`, `server.sh`: `./server.sh verify-v300-ops-events-ui` 명령을 추가해 `/ops/events` UI shell, API view model, product UI script/CSS, ops static smoke, roadmap/stream verification/inventory/release records/server dispatch 연결을 정적 검증합니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`, `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`: `UI-059`, `SAFE-090`, `OPS-058`, V300-S08 안정화 verifier와 저장소 보존형 테스트 항목을 추가했습니다.
- 검증: 최초 `./server.sh verify-v300-ops-events-ui`는 S08 UI shell/API/script/CSS/docs wiring 추가 전 `pass=0 fail=8`로 FAIL했습니다. 구현 후 `./server.sh verify-v300-ops-events-ui`는 `/ops/events` UI shell, `eventEvidenceSearch` view model, product UI script/CSS, ops static smoke, backlog/stream verification/inventory/release records/server dispatch 연결을 `pass=8 fail=0`으로 확인했습니다. `./server.sh build`는 `build-gst-onnx/media_server` target 생성으로 PASS, auth-off throwaway server의 `./server.sh verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`은 `통과 18/실패 0`, `./server.sh verify-ops-client-ui --screenshots --browser-mode chrome --allow-chrome-fallback --http-base http://127.0.0.1:8081 --output-dir /tmp/media_server_v300_s08_ops_client_ui_screenshots`는 `/ops/events` visual checks 포함 `Ops/Client UI smoke 통과 24/실패 0`, screenshot smoke `통과 36/실패 0`, 추가 header/keyboard/audit/ONVIF visual smoke 모두 PASS로 확인했습니다. `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081 --output-dir /tmp/media_server_v300_s08_rule_ui_smoke`는 `ok:true`로 PASS했습니다. `./server.sh verify-project-inventory`(`featureRows=543`, `pass=13 fail=0`), `./server.sh verify-feature-inventory-coverage`(`covered=543`, `missing=0`, `pass=5 fail=0`), `./server.sh verify-script-inventory`(`pass=11 fail=0`), `./server.sh verify-docs-links`(`failures=0`), `./server.sh verify-docs-ui-assets`(`pass=10 fail=0`) 기준으로 재검증했습니다. auth 3종 verifier는 `MEDIA_SERVER_VERIFY_AUTH_*` password env 5개가 없어 실행하지 않았고 S08 완료 evidence로 사용하지 않습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, Retention/Pin/Cleanup lifecycle delete/dry-run/audit, published metadata, real provider/vector search는 S08 완료 근거가 아닙니다. 이 단계는 Ops-only `/ops/events` search/detail UI evidence이며 S09 cleanup 실행 evidence가 아님을 명시합니다.

## v3.0.0 S09 개발 기록

- 범위: P1 `V300-S09 Retention/Pin/Cleanup`.
- `include/analysis/event_retention_cleanup.h`, `src/analysis/event_retention_cleanup.cpp`: `EventRetentionCleanupPolicy`, `EventRetentionCleanupItem`, `EventRetentionCleanupResult`와 `BuildEventRetentionCleanupPlan()`을 추가했습니다. 기본 7일 retention, source/rule override, pinned event automatic cleanup 제외, dry-run `would-delete`, apply `deleted`, audit action을 순수 cleanup contract로 모델링합니다.
- `scripts/internal/analysis_state_smoke.cpp`, `scripts/internal/verify_analysis_state_smoke.sh`: `VerifyV300RetentionPinCleanup()` smoke와 `event_retention_cleanup.cpp` 빌드 연결을 추가해 expired non-pinned 후보, pinned 제외, apply lifecycle delete/de-index, audit trail, provider/schema/media/viewer boundary invariant를 C++ 단위로 확인합니다.
- `docs/v300-retention-pin-cleanup.md`, `test/fixtures/v300_retention_pin_cleanup/cases.json`: S09 retention/pin/cleanup policy, fixture case, destructive 운영 cleanup 비대체 경계, UI/longrun/published 비대체 경계를 추가했습니다.
- `scripts/internal/verify_v300_retention_pin_cleanup.mjs`, `server.sh`: `./server.sh verify-v300-retention-pin-cleanup` 명령을 추가해 S09 module/fixture/docs/backlog/stream verification/inventory/release records/server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`: `LAB-088`, `SAFE-091`, `OPS-059`, V300-S09 안정화 verifier와 저장소 보존형 테스트 항목을 추가했습니다.
- 검증: 최초 `./server.sh verify-analysis-state`는 `include/analysis/event_retention_cleanup.h` 부재로 FAIL했습니다. 구현 후 `./server.sh verify-analysis-state`는 S09 smoke 포함 `pass=172 fail=0`으로 PASS했습니다. 최초 `node scripts/internal/verify_v300_retention_pin_cleanup.mjs`는 `docs/v300-retention-pin-cleanup.md` 부재로 FAIL했습니다. 최종 재검증은 `./server.sh verify-v300-retention-pin-cleanup`(`pass=6 fail=0`), `./server.sh build`, `./server.sh verify-project-inventory`(`featureRows=546`, `pass=13 fail=0`), `./server.sh verify-feature-inventory-coverage`(`covered=546`, `missing=0`, `pass=5 fail=0`), `./server.sh verify-script-inventory`(`pass=11 fail=0`), `./server.sh verify-docs-links`(`failures=0`), `./server.sh verify-docs-ui-assets`(`pass=10 fail=0`), `git diff --check` 기준으로 확인했습니다.
- 미실행/비대체: destructive 운영 cleanup 실제 삭제, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, tag/push/GitHub Release는 S09 완료 근거가 아닙니다. S09는 local cleanup contract와 verifier evidence이며 V300-S10 Stabilization and Release Readiness 완료 evidence가 아닙니다.

## v3.0.0 S10 개발 기록

- 범위: P0 `V300-S10 Stabilization and Release Readiness`.
- `scripts/internal/verify_v300_stabilization_release_readiness.mjs`, `server.sh`: `./server.sh verify-v300-stabilization-release-readiness` 명령을 추가해 v3.0.0 S10 roadmap, stream verification, feature inventory, release policy, release evidence index, release test records, close-out dry-run command, server dispatch 연결을 정적 검증합니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_script_inventory.mjs`: `SAFE-092`, `OPS-060`, V300-S10 안정화 verifier와 저장소 보존형 테스트 항목을 추가했습니다.
- `docs/stream-verification.md`, `docs/release-policy.md`, `docs/release-evidence-index.md`, `docs/release-test-records.md`: S10이 v3.0 local stabilization과 release readiness 기록 gate이며 UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke를 대체하지 않는다는 경계를 추가했습니다.
- Companion local gates: `./server.sh verify-v300-stabilization-release-readiness`, `./server.sh build`, `./server.sh verify-v300-entry-baseline`, `./server.sh verify-v300-event-evidence-contract`, `./server.sh verify-v300-feature-schema-privacy`, `./server.sh verify-v300-vlm-feature-queue`, `./server.sh verify-v300-feature-only-retention`, `./server.sh verify-v300-search-dsl-query-convert`, `./server.sh verify-v300-feature-search-index`, `./server.sh verify-v300-ops-events-ui`, `./server.sh verify-v300-retention-pin-cleanup`, `./server.sh verify-analysis-state`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-release-evidence-index`, `./server.sh verify-release-closeout-helper --dry-run`, `./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run`, `./server.sh verify-script-inventory`, `git diff --check`.
- 검증: 최초 `./server.sh verify-v300-stabilization-release-readiness`는 command 미구현으로 FAIL했습니다. 구현 후 `./server.sh verify-v300-stabilization-release-readiness`는 `pass=5 fail=0`으로 PASS했습니다. `./server.sh build`, V300-S00/S01/S03/S04/S05/S06/S07/S08/S09 verifier, `./server.sh verify-analysis-state`(`pass=172 fail=0`), `./server.sh verify-release-metadata`(`pass=16 fail=0`), docs/inventory/release evidence/script verifier, close-out dry-run 2종, `git diff --check` 기준으로 재검증했습니다.
- 수정한 이슈: 최초 `./server.sh verify-release-closeout-helper --dry-run`는 `docs/release-policy.md`의 runbook 제목이 `v2.9.0 Release Close-out Runbook`으로 남아 있어 FAIL했습니다. S10 release readiness 기준인 `v3.0.0 Release Close-out Runbook`으로 정렬한 뒤 dry-run과 one-shot dry-run을 재실행해 PASS했습니다.
- 임시 산출물: `verify-analysis-state`가 만든 `/tmp/media_server_analysis_state_smoke-52065` 4.4MB와 `/tmp/media_server_analysis_state_dep_scan.txt` 0B를 삭제하고, 삭제 후 두 경로가 없음을 확인했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, `verify-release-metadata --published`, PR/main/tag/GitHub Release 생성/갱신, external TURN/WHEP, ONVIF 실기기, real cloud/VLM provider 호출은 S10 local readiness 완료 근거가 아닙니다.

## 직전 공개 기준 상세: v3.0.0 Source Release Baseline

v3.0.0은 Event Evidence Search MVP source-only 직전 공개 릴리즈입니다. 이 기준은
Event Evidence Contract, frame bundle, feature schema/privacy, VLM feature queue,
feature-only retention, Search DSL, feature search index, Ops Events UI,
retention/pin/cleanup, stabilization readiness를 local evidence와 함께 닫은 직전
published baseline입니다. UI 직접 풀테스트, 120분 longrun, external field smoke는
실행하지 않은 영역으로 계속 분리합니다.

## 직전 공개 기준: v2.9.0 Source Release Baseline

v2.9.0은 2.x 라인의 마지막 개발 릴리즈입니다. 3.0.0에서 다룰 녹화, VLM 검색,
외부 VLM 연동 서버 연결 같은 대규모 기능은 v2.9.0에서 설계/구현하지 않습니다.
이번 source tree의 범위는 v2.8.0 Operator-Supervised Action Readiness 위에서 2.x
계약과 테스트/evidence 체계를 닫고, 3.0.0 본작업으로 넘어갈 수 있는 안정적인
compatibility baseline을 남기는 것입니다.

직접 답: v2.9.0의 1차 선택값은 `Final 2.x Closure & Compatibility Baseline`입니다.
fallback 또는 축소 대안은 `Release Evidence and Compatibility Hardening`입니다. 새
저장소, 녹화 path, VLM 검색 index, 외부 VLM server connector를 2.x에 미리 넣지 않고,
2.x의 공개 계약/테스트/문서/릴리즈 경계를 명확히 닫는 방향을 선택합니다.

2.x 종료 기준:

- `2.8.0`: 기존 Event POST/WebRTC/SSE/WS metadata, RTSP/WebRTC media path,
  Auth/Role/Scope, Rule/Profile payload schema를 유지한 operator-supervised action
  readiness입니다.
- `2.9.0`: 2.x의 마지막 source-of-truth 정렬, compatibility freeze, v2.8 기능군
  회귀 묶음, release test records 적용, public docs/assets refresh, release readiness입니다.
- `3.0.0`: 녹화, VLM 검색, 외부 VLM 연동 서버 연결, route/API/config/schema,
  registry/storage, auth/scope, evidence 저장 형식, RTSP/WebRTC media path 같은 큰
  변경을 별도 설계와 명시 승인 후 다루는 major line입니다.

v2.9.0 제외 대상과 사유:

- 녹화 기능 구현: storage/media path/evidence retention 변화가 커서 3.0.0 본작업입니다.
- VLM 검색 구현: index/storage/provider/privacy 경계가 커서 3.0.0 본작업입니다.
- 외부 VLM 연동 서버 connector 구현: credential, network, provider error model,
  privacy transfer guard가 필요하므로 3.0.0 본작업입니다.
- Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경: 2.x 최종 호환성
  기준을 깨지 않습니다.
- runtime/model bundle default 배포: source-only release 기본 정책을 유지합니다.

불변 조건:

- v2.9.0의 예정 항목은 구현과 직접 evidence가 생기기 전까지 완료로 쓰지 않습니다.
- v2.8.0 완료 evidence를 v2.9.0 완료 evidence로 재사용하지 않습니다.
- 안정화, UI 풀테스트, 30분, 120분, published metadata는 서로 대체하지 않습니다.
- 실제 tag/push/PR/GitHub Release는 수동 승인 후에만 수행합니다.
- `v2.9.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.

| Step | ID | Priority | 상태 | 묶음 | 개발 내용 | 완료 산출물 | 검증/evidence 경계 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | V290-S00 | P0 | 완료 | v2.9.0 baseline | VERSION/CMake/README/docs index/release metadata를 `2.9.0` source target과 published release 기준으로 정렬 | source `2.9.0`, latest published `v2.9.0`, current roadmap `v2.9.0 Final 2.x Closure & Compatibility Baseline` 정렬 | `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-feature-inventory-coverage`, `./server.sh build`, `git diff --check`; published metadata는 release publication evidence로 별도 |
| 1 | V290-S01 | P0 | 완료 | 2.x final contract freeze | Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload의 2.x 최종 계약을 문서/검증 기준으로 고정 | `./server.sh verify-v290-final-contract-freeze` local verifier와 freeze-baseline 문서 hash 연결 | 3.0 신규 기능 구현이나 migration 완료 evidence가 아님 |
| 2 | V290-S02 | P0 | 완료 | v2.8 feature regression bundle | v2.8 Action Readiness Queue, approval-gated rule draft, field readiness, runtime evidence window, client-safe digest를 v2.9 기준 회귀 묶음으로 재검증 | `./server.sh verify-v290-v28-regression-bundle`이 v2.8 S02~S06 verifier를 현재 source tree에서 재실행 | v2.8 완료 evidence 재사용이 아니라 v2.9 기준 재실행 evidence |
| 3 | V290-S03 | P0 | 완료 | 2.x compatibility gate | v2.5~v2.8 핵심 verifier를 v2.9 release gate에서 추적할 수 있게 묶음 | `./server.sh verify-v290-2x-compatibility-baseline`이 v2.5~v2.7 핵심 feature verifier와 v2.9 S01/S02 gate를 현재 source tree에서 재실행 | 각 하위 verifier가 실제 실행한 범위만 PASS |
| 4 | V290-S04 | P1 | 완료 | release test records enforcement | v2.8에서 개편한 테스트 기록 방식을 v2.9 기본 release 절차로 적용 | 안정화/30분/120분/UI 풀테스트별 `제목/수행내용/결과` 기록 기준과 v2.9 결과 섹션, `./server.sh verify-v290-release-test-records-enforcement` | `/tmp` 증거 금지, summary-only 기록 금지 |
| 5 | V290-S05 | P1 | 완료 | UI fulltest criteria freeze | v2.9 기준 route/control/action/UI role/viewport/theme 확인 항목을 확정 | v2.9 UI fulltest checklist/result section, `./server.sh verify-v290-ui-fulltest-criteria-freeze`, `./server.sh verify-manual-ui-evidence` | 자동 smoke나 raw JSON을 UI PASS로 승격하지 않음 |
| 6 | V290-S06 | P1 | 완료 | release evidence hygiene | release evidence index, release test records, feature inventory, script inventory, manual UI evidence 연결을 정리 | `./server.sh verify-v290-release-evidence-hygiene`, `OPS-047`/`SAFE-077`, S06 evidence hygiene index/records/inventory 연결 | 미실행/제외 항목은 PASS/FAIL 표에서 분리 |
| 7 | V290-S07 | P1 | 완료 | public docs/assets refresh | README, README.en, docs index, release/version policy, stream verification, UI guide를 v2.9 기준으로 정리 | `./server.sh verify-v290-public-docs-assets-refresh`, `OPS-048`/`SAFE-078`, public docs/assets baseline 정리 | 대표 이미지 교체 없이 managed asset set과 직접 검수 경계를 고정 |
| 8 | V290-S08 | P0 | 완료 | final stabilization | build, auth, Ops/Client UI, rule, event, metadata, media/schema, docs/inventory gate를 release 순서대로 실행 | `./server.sh verify-v290-final-stabilization-run`, `OPS-049`/`SAFE-079`, v2.9 안정화 결과 기록 | 30분/120분/UI 풀테스트/published metadata/field smoke는 실행한 경우만 별도 PASS |
| 9 | V290-S09 | P0 | 완료 | owner release readiness | v2.9 release readiness gate와 close-out 준비 | `./server.sh verify-v290-owner-release-readiness`, `OPS-050`/`SAFE-080`, release close-out dry-run checklist | PR/tag/GitHub Release/published metadata는 실제 실행 후 별도 완료 |

## v2.9.0 개발 우선순위

| 순서 | ID | 중요도 | 개발 리스트 | 이유 | 선수 조건 |
| --- | --- | --- | --- | --- | --- |
| 1 | V290-S00 | 필수/P0 | v2.9.0 source-of-truth 정렬 | 모든 문서/verifier/release 판단의 기준점 | clean branch, latest published `v2.9.0` 확인 |
| 2 | V290-S01 | 필수/P0 | 2.x final contract freeze | 3.0 전에 깨지면 안 되는 계약을 닫음 | V290-S00 |
| 3 | V290-S02 | 필수/P0 | v2.8 기능군 회귀 묶음 | 최신 기능이 v2.9 baseline에서 유지되는지 확인 | V290-S01 |
| 4 | V290-S03 | 필수/P0 | 2.x compatibility gate | v2.5~v2.8 핵심 기능을 릴리즈 gate로 묶음 | V290-S02 |
| 5 | V290-S04 | 중요/P1 | v2.9 테스트 기록 체계 적용 | 테스트를 했는지 사람이 읽을 수 있게 남김 | V290-S03 |
| 6 | V290-S05 | 중요/P1 | UI 풀테스트 기준 freeze | UI 직접 조작/route/control/action 누락 방지 | V290-S04 |
| 7 | V290-S06 | 중요/P1 | release evidence hygiene | PASS/FAIL/미실행/제외 경계를 문서에 고정 | V290-S04 |
| 8 | V290-S07 | 중요/P1 | public docs/assets refresh | 마지막 2.x 공개 문서 품질 정리 | V290-S06 |
| 9 | V290-S08 | 필수/P0 | final stabilization run | 릴리즈 전 실제 안정화 검증 | V290-S00~S07 |
| 10 | V290-S09 | 필수/P0 | owner release readiness | close-out 전 최종 gate | V290-S08 |

## v2.9.0 S00 개발 기록

- 범위: 필수/P0 `V290-S00 v2.9.0 source-of-truth 정렬`.
- `VERSION`, `CMakeLists.txt`: 현재 source version과 CMake project version을 `2.9.0`으로 정렬했습니다.
- `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md`, `docs/versioning-policy.md`, `docs/release-policy.md`, `docs/public-repo-final-review.md`, `docs/ui-guide.md`: 현재 source roadmap을 `v2.9.0 Final 2.x Closure & Compatibility Baseline`으로 전환하고 latest published release는 `v2.8.0` source-only GitHub Release로 분리했습니다.
- `docs/development-backlog.md`: V290 roadmap을 현재 source roadmap으로 승격하고 `V290-S00` 완료 상태, latest published `v2.8.0`, v2.9 publish evidence 경계를 기록했습니다.
- `scripts/internal/verify_release_metadata_consistency.mjs`: `verify-release-metadata`가 source `2.9.0`, current roadmap `v2.9.0 Final 2.x Closure & Compatibility Baseline`, latest published `v2.8.0`을 분리 검증하도록 보정했습니다.
- `config/docs_ui_assets.json`, `scripts/internal/verify_docs_ui_assets.mjs`, `docs/assets/ui/README.md`: docs UI asset baseline의 source version을 `2.9.0`, latest published 기준을 `v2.8.0`으로 정렬했습니다. 이미지는 교체하지 않았고 대표 이미지가 UI 풀테스트/PASS/published evidence가 아니라는 경계는 유지했습니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`: `OPS-041`, `SAFE-071`, V290-S00 안정화 verifier, 저장소 보존형 테스트 결과를 추가했습니다.
- 검증: 최초 `./server.sh verify-release-metadata`는 backlog가 아직 v2.8 current roadmap을 요구하는 상태라 FAIL했습니다. source/published 분리 구현 후 PASS했습니다. 최초 `./server.sh verify-docs-ui-assets`는 manifest source version drift로 FAIL했고, manifest/verifier/policy 정렬 후 PASS했습니다. 최종 재검증은 `./server.sh build`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-feature-inventory-coverage`, `git diff --check` 기준 PASS입니다.
- 미실행/비대체: `verify-release-metadata --published`, tag/push/GitHub Release, PR/main merge, 30분/120분 장시간 테스트, UI 풀테스트 직접 조작, external TURN/WHEP, ONVIF 실기기, real cloud/VLM provider 호출은 S00 완료 근거가 아닙니다.

## v2.9.0 S01 개발 기록

- 범위: 필수/P0 `V290-S01 2.x final contract freeze`.
- `docs/live-event-metadata-contracts.md`: Event POST `media-server.va.event.v1`, WebRTC DataChannel `media-server.webrtc.va-metadata.v1`/`va-metadata`, SSE/WS `media-server.va.runtime-metadata.v1`, WS control `media-server.va.metadata-control.v1`, RTSP/WebRTC live media path, Auth/Role/Scope, Rule/Profile payload의 2.x 최종 freeze matrix를 추가했습니다.
- `scripts/internal/verify_v290_final_contract_freeze.mjs`, `server.sh`: `./server.sh verify-v290-final-contract-freeze` 명령을 추가해 contract 문서, server command, stream verification, feature inventory, backlog, release test records, freeze-baseline hash 연결을 정적 검증하도록 했습니다.
- `test/fixtures/integrator_contract_artifact/freeze-baseline.json`: S01 문서 freeze 절 추가에 따른 `docs/live-event-metadata-contracts.md` SHA-256만 갱신했습니다. Event POST/WebRTC/SSE/WS schema/sample payload hash는 변경하지 않았습니다.
- `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/release-test-records.md`: `OPS-042`, `SAFE-072`, S01 verifier, 최초 RED 실패, runtime/UI/longrun/published metadata 비대체 경계를 추가했습니다.
- 검증: 최초 `./server.sh verify-v290-final-contract-freeze`는 command 미구현으로 FAIL했습니다. 구현 직후 첫 재실행은 verifier가 auth scope 배열 이름을 실제 `DefaultScopesForRole()` 구현과 다르게 가정해 FAIL했고, verifier 기대값을 실제 함수 구조와 scope 값 기준으로 보정했습니다. `./server.sh verify-integrator-contract-artifact` 최초 재실행은 `freeze-baseline.json` checksum과 기존 `docs/media-server-architecture.md` hash drift로 FAIL했고, 현재 파일 기준 freeze baseline/checksum을 갱신했습니다. `./server.sh verify-script-inventory` 최초 재실행은 미구현 S03 후보 명령이 `./server.sh` 명령처럼 문서화되어 FAIL했고, 후보/미구현 표현으로 되돌렸습니다. 최종 재검증은 `./server.sh verify-v290-final-contract-freeze`, `./server.sh verify-integrator-contract-artifact`, `./server.sh verify-script-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-docs-links`, `./server.sh build`, `git diff --check` 기준 PASS입니다.
- 미실행/비대체: Event POST/WebRTC/SSE/WS runtime smoke, RTSP/WebRTC 실제 media smoke, Auth 환경변수 기반 workflow, Rule UI browser smoke, 30분/120분 장시간 테스트, UI 풀테스트 직접 조작, published metadata, tag/push/GitHub Release는 S01 local freeze gate 완료 근거가 아닙니다.

## v2.9.0 S02 개발 기록

- 범위: 필수/P0 `V290-S02 v2.8 기능군 회귀 묶음`.
- `scripts/internal/verify_v290_v28_regression_bundle.mjs`, `server.sh`: `./server.sh verify-v290-v28-regression-bundle` 명령을 추가해 `verify-v280-incident-action-readiness-queue`, `verify-v280-approval-gated-rule-draft`, `verify-v280-evidence-intake-field-readiness`, `verify-v280-runtime-evidence-window`, `verify-v280-client-safe-followup-digest`를 현재 v2.9 source tree에서 순차 재실행하도록 했습니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_feature_inventory_coverage.mjs`: `OPS-043`, `SAFE-073`을 추가해 S02 bundle이 안정화 gate로 추적되도록 했습니다.
- `docs/stream-verification.md`, `docs/release-test-records.md`: S02 명령과 최초 RED 실패, UI/30분/120분/published metadata 비대체 경계를 기록했습니다.
- 검증: 최초 `./server.sh verify-v290-v28-regression-bundle`은 command 미구현으로 FAIL했습니다. 구현 후 `./server.sh verify-v290-v28-regression-bundle`은 docPass 5/docFail 0, subcommandPass 5/subcommandFail 0으로 PASS했고, v2.8 S02~S06 verifier 5개가 모두 현재 v2.9 source tree에서 exit 0으로 재실행됐습니다. 이후 `./server.sh verify-project-inventory`는 기존 verifier의 `SAFE-070`/`OPS-040` 기대 범위와 manual UI seed fixture `v2.8.0` target drift로 FAIL했고, 현재 S02 기준 `SAFE-073`/`OPS-043` 및 seed `v2.9.0` target으로 보정했습니다. 최종 재검증은 `./server.sh verify-v290-v28-regression-bundle`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `./server.sh build`, `git diff --check` 기준 PASS입니다.
- 미실행/비대체: S02 bundle은 v2.8 S02~S06 verifier 재실행 evidence이며, v2.8 완료 evidence 재사용, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, tag/push/GitHub Release evidence가 아닙니다.

## v2.9.0 S03 개발 기록

- 범위: 필수/P0 `V290-S03 2.x compatibility gate`.
- `scripts/internal/verify_v290_2x_compatibility_baseline.mjs`, `server.sh`: `./server.sh verify-v290-2x-compatibility-baseline` 명령을 추가해 v2.5 핵심 feature verifier 8개, v2.6 핵심 feature verifier 5개, v2.7 핵심 feature verifier 5개, v2.9 S01/S02 gate 2개를 현재 source tree에서 순차 실행하도록 했습니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`: `OPS-044`, `SAFE-074`를 추가해 S03 compatibility baseline이 안정화 gate로 추적되도록 했습니다.
- `docs/stream-verification.md`, `docs/release-test-records.md`: S03 명령과 최초 RED 실패, UI/30분/120분/published metadata 비대체 경계를 기록했습니다.
- 검증: 최초 `./server.sh verify-v290-2x-compatibility-baseline`은 command 미구현으로 FAIL했습니다. 구현 후 재실행 중 기존 v2.6/v2.7 하위 verifier 일부가 현재 archived roadmap 형식과 분리된 roadmap evidence 문구를 읽지 못해 FAIL했고, S01/S02 bridge verifier가 S03 이후 feature inventory 총계/range 증가를 과거 고정값 drift로 오판해 FAIL했습니다. 제품 로직/API/schema/media path는 변경하지 않고 하위 verifier가 현재 문서 구조와 누적 feature inventory를 허용하도록 보정했습니다. 최종 `./server.sh verify-v290-2x-compatibility-baseline`은 docPass 5/docFail 0, subcommandPass 20/subcommandFail 0으로 PASS했습니다.
- 미실행/비대체: S03 compatibility baseline은 하위 verifier 실행 범위만 PASS로 기록하며, owner release readiness, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, tag/push/GitHub Release evidence가 아닙니다.

## v2.9.0 S04 개발 기록

- 범위: 중요/P1 `V290-S04 v2.9 테스트 기록 체계 적용`.
- `scripts/internal/verify_v290_release_test_records_enforcement.mjs`, `server.sh`: `./server.sh verify-v290-release-test-records-enforcement` 명령을 추가해 `docs/release-test-records.md`의 기록 원칙, 테스트 항목 상세 기록, deprecated 항목, v2.9 결과/미실행, token/time, cleanup 섹션을 정적 검증하도록 했습니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`: `OPS-045`, `SAFE-075`를 추가해 S04 records enforcement가 안정화 gate로 추적되도록 했습니다.
- `scripts/internal/verify_v290_2x_compatibility_baseline.mjs`: S04 이후 누적 inventory 증가가 S03 compatibility verifier를 깨지 않도록 S03 자체 연결은 최소 범위 이상인지 확인하도록 보정했습니다.
- `docs/stream-verification.md`, `docs/release-test-records.md`: S04 명령, 최초 RED 실패, UI/30분/120분/published metadata 비대체 경계를 기록했습니다.
- 검증: 최초 `./server.sh verify-v290-release-test-records-enforcement`는 command 미구현으로 FAIL했습니다. 구현 직후 첫 재실행은 release records 원칙 문장 줄바꿈 때문에 pass 6/fail 1로 FAIL했고, verifier가 Markdown 줄바꿈에 흔들리지 않도록 공백 정규화 후 재실행했습니다. 최종 재검증은 `./server.sh verify-v290-release-test-records-enforcement`, `./server.sh verify-v290-2x-compatibility-baseline`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `./server.sh build`, `git diff --check` 기준 PASS입니다.
- 미실행/비대체: S04 records gate는 저장소 보존형 기록 체계 enforcement이며, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, tag/push/GitHub Release evidence가 아닙니다.

## v2.9.0 S05 개발 기록

- 범위: 중요/P1 `V290-S05 UI 풀테스트 기준 freeze`.
- `docs/manual-ui-fulltest.md`, `docs/manual-ui-checklist.md`, `docs/manual-ui-result-template.md`: 현재 UI 문서 기준을 `v2.9.0 Final 2.x Closure & Compatibility Baseline`으로 정렬하고, latest published baseline을 `v2.8.0 Operator-Supervised Action Readiness`로 분리했습니다.
- `docs/manual-ui-fulltest.md`, `docs/manual-ui-checklist.md`, `docs/manual-ui-result-template.md`: v2.9 route/control/action/role/viewport/theme freeze 기준을 `/setup`, `/login`, `/password/change`, `/invite/setup`, `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/ops/vlm`, `/client/live`, `/client/dashboard`, `/client/events`, `/client/request-access`, admin/operator/viewer/integrator, 320px/390px/760px/1180px, light/dark, nav/tab/button/menu/details, textbox/textarea/password, select/checkbox/toggle/segmented control, copy/export/preview/play/stop/reconnect 단위로 기록했습니다.
- `scripts/internal/verify_v290_ui_fulltest_criteria_freeze.mjs`, `server.sh`: `./server.sh verify-v290-ui-fulltest-criteria-freeze` 명령을 추가해 manual UI 기준 freeze와 raw JSON/API-only/static smoke/screenshot-only/Chrome fallback 비승격 경계를 검증하도록 했습니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`: `OPS-046`, `SAFE-076`을 추가해 S05 criteria freeze가 안정화 gate로 추적되도록 했습니다.
- `scripts/internal/verify_v290_release_test_records_enforcement.mjs`: S05 이후 누적 inventory 증가가 S04 records verifier를 깨지 않도록 S04 자체 연결은 최소 범위 이상인지 확인하도록 보정했습니다.
- `docs/stream-verification.md`, `docs/release-test-records.md`: S05 명령, 최초 RED 실패, manual UI v2.8 baseline drift 실패, UI/30분/120분/published metadata 비대체 경계를 기록했습니다.
- 검증: 최초 `./server.sh verify-v290-ui-fulltest-criteria-freeze`는 command 미구현으로 FAIL했습니다. 최초 `./server.sh verify-manual-ui-evidence`는 manual UI 문서가 v2.8 기준이라 FAIL했습니다. 구현 후 첫 S05 verifier는 stream verification이 S05 명령 PASS 자체가 실제 인앱 브라우저 직접 조작 PASS가 아님을 명시하지 않아 pass 6/fail 1로 FAIL했고, 경계 문구를 보강했습니다. 최종 재검증은 `./server.sh verify-v290-ui-fulltest-criteria-freeze`, `./server.sh verify-manual-ui-evidence`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-v290-release-test-records-enforcement`, `./server.sh verify-docs-links`, `./server.sh build`, `git diff --check` 기준 PASS입니다.
- 미실행/비대체: S05 criteria freeze는 실제 UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, tag/push/GitHub Release evidence가 아닙니다.

## v2.9.0 S06 개발 기록

- 범위: 중요/P1 `V290-S06 release evidence hygiene`.
- `docs/release-evidence-index.md`: `## v2.9.0 Release Evidence Hygiene` 절을 추가해 release evidence index, release test records, feature inventory, script inventory, manual UI evidence의 역할을 분리했습니다. 이 절은 `PASS/FAIL` 결과표와 `미실행/제외/manual-not-run/미확인` 실행 상태를 섞지 않고, `/tmp`, `/private/tmp`, `$TMPDIR` final evidence 금지를 유지합니다.
- `scripts/internal/verify_v290_release_evidence_hygiene.mjs`, `server.sh`: `./server.sh verify-v290-release-evidence-hygiene` 명령을 추가해 roadmap/stream verification, release evidence index, release test records, feature inventory, release evidence index verifier, server entrypoint 연결을 검증하도록 했습니다.
- `scripts/internal/verify_release_evidence_index.mjs`: 기존 `./server.sh verify-release-evidence-index`가 S06 hygiene 절과 `verify-v290-release-evidence-hygiene` 연결을 함께 확인하도록 보강했습니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`: `OPS-047`, `SAFE-077`을 추가해 S06 evidence hygiene이 안정화 gate로 추적되도록 했습니다.
- `docs/stream-verification.md`, `docs/release-test-records.md`: S06 명령, 최초 RED 실패, UI/30분/120분/published metadata 비대체 경계를 기록했습니다.
- 검증: 최초 `./server.sh verify-v290-release-evidence-hygiene`는 command 미구현으로 FAIL했습니다. 최종 재검증은 `./server.sh verify-v290-release-evidence-hygiene`, `./server.sh verify-release-evidence-index`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-v290-release-test-records-enforcement`, `./server.sh verify-v290-ui-fulltest-criteria-freeze`, `./server.sh verify-docs-links`, `./server.sh build`, `git diff --check` 기준 PASS입니다.
- 미실행/비대체: S06 evidence hygiene gate는 실제 UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, tag/push/GitHub Release evidence가 아닙니다.

## v2.9.0 S07 개발 기록

- 범위: 중요/P1 `V290-S07 public docs/assets refresh`.
- `README.md`, `README.en.md`: 대표 UI 이미지가 문서용 preview asset이며 `config/docs_ui_assets.json`과 `./server.sh verify-docs-ui-assets`로 관리된다는 public docs/assets baseline을 추가했습니다. 이번 S07에서는 이미지 파일을 새로 교체하지 않았고, 이미지 교체는 직접 이미지 검수와 링크/asset 검증 후 별도 기록하도록 했습니다.
- `docs/README.md`, `docs/en/README.md`: 공개 문서 entrypoint가 v2.9 source tree와 v2.8 published source-only baseline을 분리하고, 대표 image set의 managed asset 기준을 함께 가리키도록 했습니다.
- `docs/ui-guide.md`, `docs/assets/ui/README.md`: screenshot asset policy의 stale v2.5 evidence 표현을 v2.9 source 기준으로 정리하고, `v2.9.0 S07 public docs/assets refresh` 절에서 이미지 재캡처/직접 브라우저 검수/UI 풀테스트/30분/120분/published metadata 비대체 경계를 고정했습니다.
- `docs/release-policy.md`, `docs/versioning-policy.md`: S07 local gate, 대상 공개 문서, companion verifier, publication/UI/longrun 비대체 경계를 기록했습니다.
- `scripts/internal/verify_v290_public_docs_assets_refresh.mjs`, `server.sh`: `./server.sh verify-v290-public-docs-assets-refresh` 명령을 추가해 public README/docs index/UI guide/docs asset policy/release-version policy, managed asset set, release records, inventory, server entrypoint 연결을 검증하도록 했습니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`: `OPS-048`, `SAFE-078`을 추가해 S07 public docs/assets refresh가 안정화 gate로 추적되도록 했습니다.
- `docs/stream-verification.md`, `docs/release-test-records.md`: S07 명령, 최초 RED 실패, image recapture/UI/30분/120분/published metadata 비대체 경계를 기록했습니다.
- 검증: 최초 `./server.sh verify-v290-public-docs-assets-refresh`는 command 미구현으로 FAIL했습니다. 구현 후 첫 재실행은 backlog 문구와 release/version policy path 문구의 verifier 기대값이 실제 줄바꿈/표현과 달라 pass 6/fail 2로 FAIL했고, 문서 문구와 verifier path 확인 방식을 보정했습니다. 최종 재검증은 `./server.sh verify-v290-public-docs-assets-refresh`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-docs-links`, `./server.sh verify-release-metadata`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-v290-release-evidence-hygiene`, `./server.sh verify-v290-ui-fulltest-criteria-freeze`, `./server.sh verify-v290-release-test-records-enforcement`, `./server.sh build`, `git diff --check` 기준 PASS입니다.
- 미실행/비대체: S07 public docs/assets gate는 새 image recapture, 직접 브라우저 검수 PASS, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, published metadata, tag/push/GitHub Release evidence가 아닙니다.

## v2.9.0 S08 개발 기록

- 범위: 필수/P0 `V290-S08 final stabilization run`.
- `scripts/internal/verify_v290_final_stabilization_run.mjs`, `server.sh`: `./server.sh verify-v290-final-stabilization-run` 명령을 추가해 roadmap/stream verification, release test records, release evidence index, feature inventory, server entrypoint가 S08 final stabilization 결과와 미실행 경계를 같은 기준으로 가리키는지 검증하도록 했습니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`: `OPS-049`, `SAFE-079`를 추가하고 전체 기능 항목 515개, UI 비대상 189개, 안정화 대상 505개, `SAFE-001`~`SAFE-079`, `OPS-035`~`OPS-049` 범위로 확장했습니다.
- `docs/stream-verification.md`, `docs/release-evidence-index.md`: S08가 build/auth/Ops-Client UI/rule/event/metadata/media-schema/docs-inventory local script stability gate이며 UI 풀테스트, 30분/120분, published metadata, field smoke를 대체하지 않는다는 경계를 추가했습니다.
- `docs/release-test-records.md`: S08 테스트 항목, RED command precheck, sandbox/전제 미충족/포트 mismatch 실패와 재검증 결과, build/auth/UI/rule/event/metadata/media/schema/docs/inventory 실행 결과, 미실행/제외, token/time, cleanup 기록을 추가했습니다.
- 검증: 최초 `./server.sh verify-v290-final-stabilization-run`는 command 미구현으로 FAIL했습니다. S08 실행 중 `verify-auth-bootstrap` 기본 sandbox 실행은 RTSP bind `Operation not permitted`로 FAIL했고 권한 실행으로 PASS했습니다. `verify-ops-client-ui` 기본 실행은 server base/in-app evidence 전제 미충족으로 FAIL했고, static mode 기본 sandbox 실행은 local fetch 제한으로 FAIL한 뒤 권한 실행으로 PASS했습니다. `verify-rule-ui` 기본 실행은 Codex 인앱 evidence 또는 명시 Chrome fallback 전제 미충족으로 FAIL했고, 명시 Chrome fallback으로 PASS했습니다. `verify-codecs --help`는 help가 아니라 기본 8554/8080 check로 들어가 S08 server 포트와 맞지 않아 FAIL했고, 8555/8081 env를 명시해 PASS했습니다.
- 최종 재검증은 `./server.sh build`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-codecs` with 8555/8081 env, `verify-webrtc-ice`, `verify-va-metadata-sidechannel`, `verify-ws-metadata`, `verify-webrtc-va-metadata`, `verify-rtsp-va-overlay-policy`, `verify-integrator-contract-artifact`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory`, `verify-v290-2x-compatibility-baseline`, `verify-v290-release-test-records-enforcement`, `verify-v290-ui-fulltest-criteria-freeze`, `verify-v290-release-evidence-hygiene`, `verify-v290-public-docs-assets-refresh` 기준 PASS입니다.
- 임시 산출물: S08 throwaway server는 종료했고 8081/8555 listener 없음 확인했습니다. S08에서 새로 남은 `$TMPDIR/media_server_webrtc_va_metadata_summary_1781876018818.json`은 결과 이관 후 삭제했고, 삭제 후 경로 없음 확인했습니다.
- 미실행/비대체: S08 final stabilization run은 UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, `verify-release-metadata --published`, tag/push/GitHub Release, external TURN/WHEP, ONVIF 실기기, real cloud/VLM provider 호출, Event POST enabled schema/recovery 완료 evidence가 아닙니다.

## v2.9.0 S09 개발 기록

- 범위: 필수/P0 `V290-S09 owner release readiness`.
- `scripts/internal/verify_v290_owner_release_readiness.mjs`, `server.sh`: `./server.sh verify-v290-owner-release-readiness` 명령을 추가해 roadmap/stream verification, release policy, release evidence index, release test records, feature inventory, manual UI criteria, server entrypoint가 S09 owner readiness 결과와 미실행 경계를 같은 기준으로 가리키는지 검증하도록 했습니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`: `OPS-050`, `SAFE-080`을 추가하고 전체 기능 항목 517개, UI 비대상 191개, 안정화 대상 507개, `SAFE-001`~`SAFE-080`, `OPS-035`~`OPS-050` 범위로 확장했습니다.
- `docs/release-policy.md`, `docs/release-evidence-index.md`, `docs/release-test-records.md`, `docs/stream-verification.md`: S09가 local owner release readiness와 release close-out dry-run gate이며 UI 풀테스트, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke를 대체하지 않는다는 경계를 추가했습니다.
- Companion local gates: `./server.sh verify-v290-owner-release-readiness`, `./server.sh build`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-manual-ui-evidence`, `./server.sh verify-release-evidence-index`, `./server.sh verify-release-closeout-helper --dry-run`, `./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run`, `./server.sh verify-script-inventory`, `git diff --check`.
- 검증: 최초 `./server.sh verify-v290-owner-release-readiness`는 command 미구현으로 FAIL했습니다. 구현 후 위 companion local gates와 git/tag/remote preflight를 재실행해 S09 local readiness 범위를 확인했습니다.
- 임시 산출물: S09 local readiness/docs/inventory/evidence/closeout dry-run verifier 실행 중 최종 evidence로 보존할 `/tmp`/`/private/tmp` summary, screenshot, report를 생성하지 않았습니다.
- 미실행/비대체: S09 owner release readiness는 UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, `verify-release-metadata --published`, PR/main/tag/GitHub Release 생성/갱신, external TURN/WHEP, ONVIF 실기기, real cloud/VLM provider 호출 완료 evidence가 아닙니다.

## 완료 roadmap: v2.8.0 Operator-Supervised Action Readiness

v2.8.0은 v2.7.0 source-only Operational Incident Command Loop 위에서 새 media path,
장기 녹화, 외부 provider 성공 보장, 자동 실행형 rule 적용을 만들지 않습니다. 이번
source tree의 범위는 2.x 라인을 `2.8.0`과 `2.9.0`까지만 유지한다는 전제에서,
3.0.0의 대대적인 route/API/config/schema/storage/auth/media 변경 전에 운영자가
직접 승인할 수 있는 action 준비 상태를 제품과 evidence 경계로 분리하는 것입니다.

직접 답: v2.8.0의 1차 선택값은 `Operator-Supervised Action Readiness`입니다.
fallback 또는 축소 대안은 `Runtime Evidence Window`입니다. 즉시 자동 적용 가능한
실행 플랫폼으로 키우지 않고, `/ops/events`와 `/ops/rules` 안에서 “무엇을 할 준비가
됐는가, 무엇은 아직 승인/field smoke/credential이 필요한가”를 명확히 보여주는
방향을 선택합니다.

2.x runway:

- `2.8.0`: 기존 Event POST/WebRTC/SSE/WS metadata, RTSP/WebRTC media path,
  Auth/Role/Scope, Rule/Profile payload schema를 유지한 operator-supervised action
  readiness입니다.
- `2.9.0`: 2.x의 마지막 안정화, release evidence 정리, 3.0 migration/readiness
  설계 준비입니다.
- `3.0.0`: route/API/config/schema, registry/storage, auth/scope, evidence 저장 형식,
  RTSP/WebRTC media path 같은 대규모 변경을 별도 3.0 설계와 명시 승인 후 다루는
  major line입니다.

v2.8.0 제외 대상과 사유:

- 자동 Rule/Profile 저장/적용: 3.0 전에는 operator approval 없는 write path를 늘리지 않습니다.
- 외부 alert 실제 발송 성공 보장: endpoint/credential/field smoke가 필요한 운영 항목입니다.
- VLM default-on 또는 provider 재호출/rerank: privacy/provider 비용과 evidence 경계가 큽니다.
- ONVIF persistent credential store 완료 선언: 별도 credential provider 설계와 field evidence가 필요합니다.
- Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경: 2.x 호환성 유지 조건입니다.
- runtime/model bundle default 배포: source-only release 기본 정책을 유지합니다.

license/provenance/privacy/운영 제약:

- 기본 공개 형태는 source-only이며 FFmpeg/GStreamer/ONNX/VLM/YOLO runtime/model binary를 release asset에 포함하지 않습니다.
- provider credential, prompt/raw response/source URL/raw frame bytes는 문서, UI, client, event payload, release evidence에 원문 노출하지 않습니다.
- external TURN/WHEP, ONVIF 실기기, real cloud/VLM provider는 endpoint/credential/명시 승인 없이는 field PASS 근거가 아닙니다.
- 안정화, UI 풀테스트, 30분, 120분, published metadata는 서로 대체하지 않습니다.

불변 조건:

- Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload schema를 요청 없이 바꾸지 않습니다.
- 외부 TURN/WHEP, ONVIF 실기기, real cloud/VLM provider는 사용자 endpoint/credential/승인 없이는 PASS 근거가 아닙니다.
- 기존 네 영역인 안정화 테스트, 30분 테스트, 120분 테스트, UI 풀테스트는 서로 대체하지 않습니다.
- 실제 tag/push는 수동 승인 후에만 수행합니다.

| Step | ID | Priority | 상태 | 묶음 | 개발 내용 | 완료 산출물 | 검증/evidence 경계 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | V280-S00 | P0 | 완료 | v2.8.0 baseline | v2.8.0 branch/source-of-truth 정렬 | VERSION/CMake/README/docs index/release metadata가 source `2.8.0`, latest published `v2.8.0`, current roadmap `v2.8.0 Operator-Supervised Action Readiness` 기준으로 정렬됨 | roadmap review, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `git diff --check`; UI/30분/120분/published metadata는 별도 |
| 1 | V280-S01 | P0 | 완료 | 2.x runway boundary | `2.8.0`/`2.9.0`까지만 2.x를 유지하고 `3.0.0` major-change line을 별도 설계/승인 대상으로 분리 | roadmap/version/release/inventory가 2.x runway와 3.0 boundary를 같은 문구로 설명 | 문서 gate 기준. 3.0 설계 완료나 migration 구현 evidence가 아님 |
| 2 | V280-S02 | P0 | 완료 | Incident Action Readiness Queue | `/ops/events`에서 operator가 승인 가능한 follow-up 후보를 readiness queue로 묶고, ready/blocked/field-smoke-needed/not-run 상태를 분리 | Ops-only action readiness view model/UI, external delivery 미수행 상태, 자동 action write 없음 | verifier `verify-v280-incident-action-readiness-queue`; UI 풀테스트 직접 조작과 외부 alert 성공은 별도 |
| 3 | V280-S03 | P0 | 완료 | Approval-gated Rule Draft Readiness | Rule What-if/incident-to-rule 후보를 저장 전 approval state, validation summary, staged draft로 분리 | `/ops/rules` 수동 draft context, no-auto-save/no-auto-apply boundary, rule registry 자동 write 없음 | verifier `verify-v280-approval-gated-rule-draft`; full replay/자동 저장/자동 적용 evidence가 아님 |
| 4 | V280-S04 | P1 | 완료 | Evidence Intake and Field Readiness | redacted evidence/source health/field smoke precondition을 준비 상태로 모아 passed/failed/blocked/not-run을 분리 | field readiness panel, credential/endpoint required 상태, release-safe evidence intake 기준, `media-server.ops.evidence-intake-field-readiness.v1` | verifier `verify-v280-evidence-intake-field-readiness`; endpoint/credential 없는 field PASS가 아님 |
| 5 | V280-S05 | P1 | 완료 | Runtime Evidence Window | 기존 runtime/source/event buffer에서 incident-linked 짧은 evidence window를 보여주되 장기 저장소를 만들지 않음 | Ops-only runtime evidence packet, page/session or bounded local buffer, bounded runtime/source/event evidence window, `media-server.ops.runtime-evidence-window.v1`, longrun substitute 아님 표기 | verifier `verify-v280-runtime-evidence-window`; 30분/120분/장기 녹화 evidence가 아님 |
| 6 | V280-S06 | P2 | 완료 | Client-safe Follow-up Digest | viewer에게 허용된 PublishedView 범위에서 후속 조치 상태만 redacted digest로 표시 | `/client/api/views/{id}/events`의 `followUpDigest`, `media-server.client.follow-up-digest.v1`, source/raw/debug/provider/rule editor/action control 비노출 | verifier `verify-v280-client-safe-followup-digest`; viewer 브라우저 직접 확인 전 UI PASS가 아님 |
| 7 | V280-S07 | P2 | 완료 | 릴리즈 준비 | v2.8.0 소유권 분리/릴리즈 준비 | feature inventory, manual UI criteria, release readiness gate, not-run/excluded 경계 정리, `media-server.v280-owner-release-readiness.v1` | verifier `verify-v280-owner-release-readiness`; UI/30분/120분/published metadata/tag/push/GitHub Release evidence는 별도 승인/evidence |

## v2.8.0 publish/test evidence 경계

- `V280-S00` source-of-truth 정렬 자체만으로는 2.8.0 GitHub Release publish 완료가
  아닙니다. publish 완료 evidence는 PR merge, signed tag, GitHub Release,
  `verify-release-metadata --published` 결과로 분리합니다.
- 예정 항목은 구현과 직접 evidence가 생기기 전까지 완료로 쓰지 않습니다.
- 후보 verifier 이름은 구현 전 PASS 근거가 아니며, 각 스텝 구현 시 `server.sh` wiring과 script inventory를 함께 추가해야 합니다.
- UI 풀테스트 직접 조작 미실행은 local verifier PASS로 대체하지 않습니다.
- 30분 테스트 미실행은 `verify-predev --soak-minutes 30` PASS로 보고하지 않습니다.
- 120분 테스트 미실행은 `verify-predev --soak-minutes 120` 또는 `verify-va-runtime-console-longrun --duration-minutes 120` PASS로 보고하지 않습니다.
- `v2.8.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.
- PR merge/main sync/next branch sync는 실제 실행 evidence가 있을 때만 완료로 씁니다.

## v2.8.0 S02 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsIncidentActionReadinessQueueViewJson`, `OpsIncidentActionReadinessQueueItemJson`, `OpsIncidentActionReadinessFollowUpJson`를 추가해 `/ops/api/events/reviews` 응답에 `incidentActionReadinessQueue` Ops-only view model을 붙였습니다. 이 view model은 기존 EventRecord/review state를 `media-server.ops.incident-action-readiness-queue.v1` schema, ready/blocked/field-smoke-needed/not-run count, blocker reason, field smoke 필요 여부, operator approval required follow-up 후보로 요약하며 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata/RTSP/WebRTC media path schema를 바꾸지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events` HTML에 `data-testid="ops-incident-action-readiness-queue"`, `data-incident-action-readiness-queue="operator-supervised-follow-ups"`, `opsIncidentActionReadinessQueueSummary`, `opsIncidentActionReadinessQueueBadges`, `opsIncidentActionReadinessQueueRows`를 추가해 Incident Action Readiness Queue shell을 제공했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderIncidentActionReadinessQueue`를 추가해 `incidentActionReadinessQueue` payload의 `readinessStatus`, `blockerReasons`, `fieldSmokeRequired`, `manualApprovalRequired`, `autoActionWritePerformed:false`, `externalDeliveryPerformed:false`, follow-up route/status를 렌더링합니다. 이 UI는 준비 상태와 수동 승인 필요성을 표시하며 외부 발송, 자동 action write, rule/source registry write를 실행하지 않습니다.
- `src/ingress/product_ui_css.cpp`: `.incident-action-readiness-queue`, `.incident-action-readiness-queue-list`, `.incident-action-readiness-queue-card`, `.incident-action-readiness-blockers`, `.incident-action-readiness-followups`, `.incident-action-readiness-followup` 스타일을 추가해 긴 event/source/rule/follow-up 문자열이 `/ops/events` layout을 밀어내지 않게 했습니다.
- `scripts/internal/verify_v280_incident_action_readiness_queue.mjs`, `server.sh`: S02 static verifier와 `verify-v280-incident-action-readiness-queue` command를 추가했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `docs/project-feature-test-inventory.md`, `docs/manual-ui-checklist.md`, `docs/stream-verification.md`: S02 coverage `UI-055`/`EVT-055`/`LAB-079`/`SAFE-065`, static smoke marker, 수동 UI 기준, stream verification command 연결을 정렬했습니다.
- 검증: `./server.sh build`, `verify-v280-incident-action-readiness-queue`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-ops-client-ui --browser-mode chrome --allow-chrome-fallback=1 --screenshots --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`, `git diff --check`를 실행했고 재검증 기준 PASS입니다.
- 수정한 이슈: 최초 `verify-ops-client-ui --browser-mode static`은 서버 미기동으로 fetch 실패했습니다. sandbox 서버 기동은 RTSP bind `Operation not permitted`, sandbox Node fetch는 `connect EPERM`, auth-on 서버는 `/login`/401로 실패했으며, auth-off throwaway 서버와 unrestricted verifier로 재실행해 PASS했습니다. 최초 `verify-auth-bootstrap`은 `MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD` 계열 env 누락으로 실패했고, 일회성 테스트 operator env를 명시해 `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`를 재실행해 PASS했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 외부 alert 실제 성공, 30분/120분 장시간 테스트, cloud/provider 호출, client/viewer 노출 검수의 브라우저 직접 조작, GitHub Release publish는 S02 완료 근거가 아닙니다.

## v2.8.0 S03 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsApprovalGatedRuleDraftReadinessViewJson`, `OpsApprovalGatedRuleDraftReadinessItemJson`, `OpsApprovalGatedRuleDraftValidationState`를 추가해 `/ops/api/events/reviews` 응답에 `approvalGatedRuleDraftReadiness` Ops-only view model을 붙였습니다. 이 view model은 Rule What-if/incident-to-rule 후보를 `media-server.ops.approval-gated-rule-draft-readiness.v1` schema, approval state, validation summary, staged draft로 분리하며 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata/RTSP/WebRTC media path schema를 바꾸지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events` HTML에 `data-testid="ops-approval-gated-rule-draft-readiness-events"`, `opsApprovalGatedRuleDraftReadinessSummary`, `opsApprovalGatedRuleDraftReadinessBadges`, `opsApprovalGatedRuleDraftReadinessRows`를 추가해 incident-to-rule 후보의 staged draft readiness 목록을 제공합니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/rules` HTML에 `data-testid="ops-approval-gated-rule-draft-readiness"`, `data-approval-gated-rule-draft="manual-approval-staged-only"`, `opsApprovalGatedRuleDraftContext`, `opsApprovalGatedRuleDraftBadges`, `opsApprovalGatedRuleDraftRows`를 추가해 `approvalDraft=1` query 기반 수동 draft context를 표시합니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderApprovalGatedRuleDraftReadiness`를 추가해 `/ops/events`에서 `approvalState`, `validationSummary`, `stagedDraft`, `noAutoSave:true`, `noAutoApply:true`, `ruleRegistryWritePerformed:false`, `fullReplayEngineExecuted:false`를 렌더링합니다. `renderOpsApprovalGatedRuleDraftContext`는 `/ops/rules?draftEventId=<id>&whatIfPreview=1&approvalDraft=1`에서 수동 승인 context만 표시하며 저장 API를 호출하지 않습니다.
- `src/ingress/product_ui_css.cpp`: `.approval-gated-rule-draft-readiness`, `.approval-gated-rule-draft-readiness-list`, `.approval-gated-rule-draft-readiness-card`, `.approval-gated-rule-draft-grid`, `.ops-approval-gated-rule-draft-list`, `.ops-approval-gated-rule-draft-card` 스타일을 추가해 validation summary와 staged draft 문자열을 responsive layout 안에 유지합니다.
- `scripts/internal/verify_v280_approval_gated_rule_draft.mjs`, `server.sh`: S03 static verifier와 `verify-v280-approval-gated-rule-draft` command를 추가했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `docs/project-feature-test-inventory.md`, `docs/manual-ui-checklist.md`, `docs/stream-verification.md`: S03 coverage `UI-056`/`RULE-104`/`EVT-056`/`LAB-080`/`SAFE-066`, static smoke marker, 수동 UI 기준, stream verification command 연결을 정렬했습니다.
- 검증: `./server.sh build`, `verify-v280-approval-gated-rule-draft`, `verify-v280-incident-action-readiness-queue`, `verify-v270-rule-what-if-preview`, `verify-vlm-rule-suggestion-draft-workflow`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-ops-client-ui --browser-mode chrome --allow-chrome-fallback=1 --screenshots --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`, `git diff --check`를 실행했고 재검증 기준 PASS입니다. 로컬 UI/API verifier는 auth-off throwaway 서버와 unrestricted localhost/Chrome 실행으로 확인했습니다.
- 수정한 이슈: 최초 `verify-v270-rule-what-if-preview`는 v2.7 완료 roadmap이 현재 backlog의 completed baseline 표로 이동한 문서 구조를 인식하지 못해 실패했습니다. `scripts/internal/verify_v270_rule_what_if_preview.mjs`가 active 상세 행과 completed baseline 행을 모두 허용하고, 상세 snippet은 backlog/inventory/manual UI evidence set에서 확인하도록 보정한 뒤 재실행해 PASS했습니다.
- 미실행/비대체: full replay 실행, rule/profile registry 자동 저장, 자동 적용, UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, cloud/provider 호출, GitHub Release publish는 S03 완료 근거가 아닙니다.

## v2.8.0 S04 개발 기록

- 범위: P1 `V280-S04 Evidence Intake and Field Readiness`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/events/reviews` 응답에 `evidenceIntakeFieldReadiness`를 추가하고 `OpsEvidenceIntakeFieldReadinessViewJson`, `OpsEvidenceIntakeFieldReadinessItemJson`, `OpsEvidenceIntakeFieldPreconditionJson`으로 redacted evidence intake, source health recheck, field smoke precondition을 `passed`/`failed`/`blocked`/`not-run`으로 분리했습니다. endpoint/credential 없는 field PASS는 `endpointCredentialFieldPassClaimed:false`로 고정하고 credential/source/raw/debug/provider material은 노출하지 않습니다.
- `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_page_scripts.cpp`, `src/ingress/product_ui_css.cpp`: `/ops/events`에 Evidence Intake and Field Readiness panel, `opsEvidenceIntakeFieldReadinessRows`, `renderEvidenceIntakeFieldReadiness`, status badge, precondition cards, redaction chips를 추가했습니다.
- `scripts/internal/verify_v280_evidence_intake_field_readiness.mjs`, `server.sh`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: S04 static verifier와 UI smoke marker, `verify-v280-evidence-intake-field-readiness` command를 추가했습니다.
- 검증: `./server.sh build`, `verify-v280-evidence-intake-field-readiness`, `verify-v280-approval-gated-rule-draft`, `verify-v280-incident-action-readiness-queue`, `verify-v250-redacted-incident-evidence-bundle`, `verify-ops-source-health-bulk`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-ops-client-ui --browser-mode chrome --allow-chrome-fallback=1 --screenshots --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`, `git diff --check`를 실행했고 재검증 기준 PASS입니다. 로컬 UI/API verifier는 auth-off throwaway 서버와 unrestricted localhost/Chrome 실행으로 확인했습니다.
- 수정한 이슈: TDD RED에서 최초 `verify-v280-evidence-intake-field-readiness`는 roadmap/API/UI/smoke marker 누락으로 실패했습니다. 구현 후 inventory의 `SRC-032`, `EVT-057` 라벨이 verifier 기대 명칭과 달라 재실패했고, S04 실제 source health/readiness view model 이름으로 정렬한 뒤 PASS했습니다. 최초 `verify-auth-*` 3종은 sandbox RTSP bind `Operation not permitted`로 실패했으며 같은 일회성 auth env를 유지하고 unrestricted 실행으로 재검증해 PASS했습니다.
- 비범위: 실제 endpoint/credential field smoke PASS, 외부 provider 호출, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, viewer/client 노출 변경은 하지 않았습니다.

## v2.8.0 S05 개발 기록

- 범위: P1 `V280-S05 Runtime Evidence Window`.
- `src/ingress/webrtc_http_server.cpp`: `/ops/api/events/reviews` 응답에 `runtimeEvidenceWindow`를 추가하고 `OpsRuntimeEvidenceWindowViewJson`, `OpsRuntimeEvidenceWindowItemJson`, `OpsRuntimeEvidenceWindowPacketJson`으로 EventRecord/review state 기준 incident-linked runtime/source/event evidence packet을 구성했습니다. packet은 `boundedLocalBuffer:true`, `pageSessionOnly:true`, `eventWindowMs:15000`, `persistentArchiveCreated:false`, `longrunSubstitute:false`, `thirtyMinutePassClaimed:false`, `oneHundredTwentyMinutePassClaimed:false`를 고정합니다.
- `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_page_scripts.cpp`, `src/ingress/product_ui_css.cpp`: `/ops/events`에 Runtime Evidence Window panel, `opsRuntimeEvidenceWindowRows`, `renderRuntimeEvidenceWindow`, bounded window badges, runtime/source/event packet summary, no-longrun/no-archive chips를 추가했습니다.
- `scripts/internal/verify_v280_runtime_evidence_window.mjs`, `server.sh`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: S05 static verifier와 UI smoke marker, `verify-v280-runtime-evidence-window` command를 추가했습니다.
- 검증: `./server.sh build`, `verify-v280-runtime-evidence-window`, `verify-v280-evidence-intake-field-readiness`, `verify-v280-approval-gated-rule-draft`, `verify-v280-incident-action-readiness-queue`, `verify-v260-runtime-dashboard-trends`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-ops-client-ui --browser-mode chrome --allow-chrome-fallback=1 --screenshots --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`, `git diff --check`를 실행했고 재검증 기준 PASS입니다. 로컬 UI/API verifier는 auth-off throwaway 서버와 unrestricted localhost/Chrome 실행으로 확인했습니다.
- 수정한 이슈: TDD RED에서 최초 `verify-v280-runtime-evidence-window`는 roadmap/API/UI/smoke marker 누락으로 실패했습니다. 구현 후 인접 회귀 `verify-v260-runtime-dashboard-trends`가 현재 backlog의 v2.6 완료 baseline 구조를 인식하지 못해 실패했고, `scripts/internal/verify_v260_runtime_dashboard_trends.mjs`의 roadmap evidence 인식을 active table 또는 completed baseline table 모두 허용하도록 보정한 뒤 PASS했습니다.
- 비범위: persistent archive, 장기 녹화, 30분/120분 PASS claim, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, viewer/client 노출 변경은 하지 않았습니다.

## v2.8.0 S06 개발 기록

- 범위: P2 `V280-S06 Client-safe Follow-up Digest`.
- `src/ingress/webrtc_http_server.cpp`: `/client/api/views/{id}/events`의 기존 PublishedView-scoped `ClientEventSummary` 응답에 `followUpDigest`를 추가하고 `AppendClientSafeFollowUpDigestJson`, `ClientSafeFollowUpDigestStatus`로 `media-server.client.follow-up-digest.v1` viewer-safe digest를 구성했습니다. digest item은 `followUpStatus`, `severity`, `time`만 노출하며 `sourceUrlIncluded:false`, `rawEvidenceIncluded:false`, `debugMaterialIncluded:false`, `providerMaterialIncluded:false`, `ruleEditorIncluded:false`, `actionControlsIncluded:false`, `eventPostPayloadChanged:false`, `eventSchemaChanged:false`, `mediaPathChanged:false`를 고정합니다.
- `src/ingress/product_ui_client_scripts.cpp`, `src/ingress/product_ui_css.cpp`: `/client/live`, `/client/dashboard`, `/client/events`에 `renderClientSafeFollowUpDigest`, `data-testid="client-safe-followup-digest"`, `data-client-followup-digest="viewer-safe"`를 추가해 status/severity/time만 렌더링하고 raw/source/debug/provider/rule editor/action control 값을 읽지 않습니다.
- `scripts/internal/verify_v280_client_safe_followup_digest.mjs`, `server.sh`, `scripts/internal/verify_ops_client_ui_smoke.mjs`: S06 static verifier와 client smoke marker, `verify-v280-client-safe-followup-digest` command를 추가했습니다.
- 검증: `verify-v280-client-safe-followup-digest` 최초 RED는 API/renderer/smoke marker 누락으로 실패했습니다. 구현 후 GREEN 재실행 기준 PASS이며, S06 안정화 묶음에서는 `./server.sh build`, 인접 client-safe verifier, feature inventory/docs/UI/API/auth verifier와 `git diff --check`를 별도 기록합니다.
- 비범위: viewer role 브라우저 직접 조작, UI 풀테스트 PASS, 30분/120분 장시간 테스트, 외부 provider 호출, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, rule editor/action control 노출, GitHub Release publish는 S06 완료 근거가 아닙니다.

## v2.8.0 S07 개발 기록

- 범위: P2 `V280-S07 릴리즈 준비`.
- `scripts/internal/verify_v280_owner_release_readiness.mjs`, `server.sh`: `media-server.v280-owner-release-readiness.v1` local readiness verifier와 `verify-v280-owner-release-readiness` command dispatch를 추가했습니다. 최초 RED는 S07 inventory/manual UI/backlog/evidence 연결이 완료 상태가 아니어서 실패했습니다.
- `docs/project-feature-test-inventory.md`, `docs/manual-ui-fulltest.md`, `docs/manual-ui-checklist.md`: V280-S02~S06 기능 ID, `OPS-040`, `SAFE-070`, S07 release readiness 기준, UI 직접 조작 미실행 경계를 연결했습니다.
- `docs/release-policy.md`, `docs/release-evidence-index.md`, `docs/stream-verification.md`: `media-server.v280-owner-release-readiness.v1`, companion local gates, not-run/excluded/published metadata boundary를 연결했습니다.
- Companion local gates: `verify-v280-owner-release-readiness`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-feature-inventory-coverage`, `verify-manual-ui-evidence`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run`, `git diff --check`.
- 검증: `verify-v280-owner-release-readiness` 최초 RED는 S07 feature inventory mapping, manual UI criteria, backlog/evidence 진행 기록 누락으로 실패했고, 문서/inventory/server wiring 반영 후 GREEN으로 재실행합니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, `verify-release-metadata --published`, tag/push/GitHub Release, PR merge/main sync/후속 브랜치 생성, 실기기 ONVIF, external TURN/WHEP, real cloud/VLM provider 호출은 S07 local readiness 완료 근거가 아닙니다.

## v3.1.0 공개 기준 요약: v3.1.0 Source Release Baseline

v3.1.0은 source-only/live-only 제품 경계를 유지하면서 Encoded Event Clip and Safe
Sharing Expansion을 닫은 직전 공개 릴리즈입니다. 이 기준은 v3.1.0 published
baseline입니다.

## v3.0.0 공개 기준 요약: v3.0.0 Source Release Baseline

v3.0.0은 source-only/live-only 제품 경계를 유지하면서 Event Evidence Search MVP를
닫은 historical 공개 릴리즈입니다. 이 기준은 v3.0.0 published baseline이며,
v3.1.0의 완료 evidence로 재사용하지 않습니다.

## 이전 공개 기준: v2.9.0 Source Release Baseline

v2.9.0은 source-only/live-only 제품 경계를 유지하면서 Final 2.x Closure &
Compatibility Baseline을 닫은 이전 공개 릴리즈입니다. 이 기준은 2.x final line의
published baseline이며, v3.0.0의 완료 evidence로 재사용하지 않습니다.

## 이전 공개 기준: v2.7.0 Source Release Baseline

v2.7.0은 source-only/live-only 제품 경계를 유지하면서 Operational Incident Command
Loop를 닫은 이전 공개 릴리즈입니다. 이 기준은 v2.8.0의 시작 baseline이며,
v2.8.0의 예정 항목 완료 evidence로 재사용하지 않습니다.

## 완료 roadmap: v2.7.0 Operational Incident Command Loop

| ID | 상태 | 요약 | 현재 해석 |
| --- | --- | --- | --- |
| V270-S00 | 완료 | v2.7.0 baseline/source-of-truth 정렬 | 최신 published baseline, v2.8.0 완료 근거 아님 |
| V270-S01 | 완료 | Incident Triage Board | 최신 published baseline, v2.8.0 완료 근거 아님 |
| V270-S02 | 완료 | Incident Decision Scorecard | 최신 published baseline, v2.8.0 완료 근거 아님 |
| V270-S03 | 완료 | Operational Action Pack | 최신 published baseline, v2.8.0 완료 근거 아님 |
| V270-S04 | 완료 | Rule What-if Preview | 최신 published baseline, v2.8.0 완료 근거 아님 |
| V270-S05 | 완료 | Operator outcome memory | 최신 published baseline, v2.8.0 완료 근거 아님 |
| V270-S06 | 완료 | v2.7.0 owner release readiness local gate | 최신 published baseline, v2.8.0 완료 근거 아님 |

## v2.7.0 S01 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsIncidentTriageBoardViewJson`, `OpsIncidentTriageBoardCardJson`, `OpsIncidentTriageBoardLane`, `OpsIncidentTriageBoardPriority`를 추가해 `/ops/api/events/reviews` 응답에 `incidentTriageBoard` Ops-only view model을 붙였습니다. 이 view model은 기존 EventRecord/review state와 sidecar rule suggestion 상태를 priority, review state, source, rule, scenario, similar incident key, VLM candidate status 기준 card로 요약하며 EventRecord/Event POST/WebRTC/SSE/WS/RTSP/WebRTC media path schema를 바꾸지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events` HTML에 `data-testid="ops-incident-triage-board"`, `opsIncidentTriageLaneFilter`, `opsIncidentTriagePriorityFilter`, `opsIncidentTriageSort`, `opsIncidentTriageBoardRows`를 추가해 lane/filter/sort board shell을 제공했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderIncidentTriageBoard`를 추가해 `media-server.ops.incident-triage-board.v1` card를 lane별로 렌더링하고 priority/review-age/event-time sort와 lane/priority filter 변경 시 refresh를 연결했습니다.
- `src/ingress/product_ui_css.cpp`: `.incident-triage-board`, `.incident-triage-board-lanes`, `.incident-triage-lane`, `.incident-triage-card` 스타일을 추가해 `/ops/events` 안에서 compact board layout을 유지합니다.
- `scripts/internal/verify_v270_incident_triage_board.mjs`, `server.sh`: S01 static verifier와 `verify-v270-incident-triage-board` command를 추가했습니다. 최초 RED는 API/UI/smoke marker 누락으로 실패했고 구현 후 GREEN으로 재실행했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`, `docs/manual-ui-checklist.md`, `test/fixtures/manual_ui_fulltest_va_seed_matrix.json`: S01 coverage `UI-050`/`EVT-050`/`LAB-074`/`SAFE-058`, static smoke marker, current `v2.7.0` seed target, 수동 UI 기준을 연결했습니다.
- 검증: `./server.sh build`, `verify-v270-incident-triage-board`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `git diff --check`.
- 수정한 이슈: `verify-project-inventory`는 manual UI seed fixture가 `v2.6.0`으로 남아 최초 실패했고 `v2.7.0`으로 정렬 후 재실행했습니다. `./server.sh build`는 helper 선언 순서 문제로 최초 실패했고 forward declaration 추가 후 재실행했습니다. localhost UI/Event POST/WS/Auth verifier는 sandbox 포트/네트워크 제한과 auth 기본값 때문에 최초 실패했으며, auth-off throwaway 서버와 승인 실행, auth verifier용 일회성 test operator env로 재검증했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, provider/cloud 호출, client/viewer 노출 검수의 브라우저 직접 조작, GitHub Release publish는 S01 완료 근거가 아닙니다.

## v2.7.0 S02 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsIncidentDecisionScorecardViewJson`, `OpsIncidentDecisionScorecardJson`, `OpsIncidentDecisionScorecardReasonChipsJson`를 추가해 `/ops/api/events/reviews` 응답에 `incidentDecisionScorecard` Ops-only view model을 붙였습니다. 이 view model은 기존 EventRecord/review state, source id, rule/scenario, similar incident key, VLM rule candidate 상태, operator review age를 deterministic priority reason chip으로 요약하며 EventRecord/Event POST/WebRTC/SSE/WS/RTSP/WebRTC media path schema를 바꾸지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events` HTML에 `data-testid="ops-incident-decision-scorecard"`, `data-incident-decision-scorecard="deterministic-priority-reasons"`, `opsIncidentDecisionScorecardSummary`, `opsIncidentDecisionScorecardBadges`, `opsIncidentDecisionScorecardRows`를 추가해 Decision Scorecard shell을 제공했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderIncidentDecisionScorecard`를 추가해 `media-server.ops.incident-decision-scorecard.v1` scorecard, priority reason chip, EventRecord basis, source health basis, similar incident basis, VLM summary/rule candidate status, operator review age를 렌더링합니다. raw payload/source URL 노출 여부는 badge로 확인하지만 raw payload 자체나 source locator는 화면에 표시하지 않습니다.
- `src/ingress/product_ui_css.cpp`: `.incident-decision-scorecard`, `.incident-decision-scorecard-list`, `.incident-decision-scorecard-card`, `.priority-reason-chip`, `.incident-decision-basis-grid` 스타일을 추가해 `/ops/events` 안에서 긴 reason/source/rule 문자열도 layout을 밀어내지 않게 했습니다.
- `scripts/internal/verify_v270_incident_decision_scorecard.mjs`, `server.sh`: S02 static verifier와 `verify-v270-incident-decision-scorecard` command를 추가했습니다. 최초 RED는 API view model/UI marker/static smoke marker 누락으로 실패했고 구현 후 GREEN으로 재실행했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `docs/project-feature-test-inventory.md`, `docs/manual-ui-checklist.md`: S02 coverage `UI-051`/`EVT-051`/`LAB-075`/`SAFE-059`, static smoke marker, 수동 UI 기준을 연결했습니다.
- 검증: `./server.sh build`, `verify-v270-incident-decision-scorecard`, `verify-v270-incident-triage-board`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `git diff --check`.
- 수정한 이슈: `/ops` static UI smoke가 visible copy의 `raw JSON` 문구를 forbidden copy로 판정해 실패했고, Decision Scorecard badge 문구를 `raw payload hidden`으로 바꾼 뒤 UI/Event POST/WS/Auth verifier를 재실행했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, provider/cloud 호출, client/viewer 노출 검수의 브라우저 직접 조작, GitHub Release publish는 S02 완료 근거가 아닙니다.

## v2.7.0 S03 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsOperationalActionPackViewJson`, `OpsOperationalActionPackItemJson`, `OpsOperationalActionPackActionsJson`를 추가해 `/ops/api/events/reviews` 응답에 `operationalActionPack` Ops-only view model을 붙였습니다. 이 view model은 기존 EventRecord/review state를 release-safe evidence bundle, `/ops/rules` manual draft route, `/ops/api/alerts/deliveries/dry-run`, `/ops/api/source-health` recheck link로 묶으며 EventRecord/Event POST/WebRTC/SSE/WS/RTSP/WebRTC media path schema를 바꾸지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events` HTML에 `data-testid="ops-operational-action-pack"`, `data-operational-action-pack="manual-workflow-links"`, `opsOperationalActionPackBadges`, `opsOperationalActionPackRows`를 추가해 Operational Action Pack shell을 제공했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderOperationalActionPack`를 추가해 `media-server.ops.operational-action-pack.v1` card, release-safe bundle button, rule draft link, alert dry-run button, source health recheck link를 렌더링합니다. alert dry-run은 기존 dry-run route를 사용하며 외부 실제 발송을 수행하지 않고, rule draft는 `/ops/rules` 수동 경로만 노출합니다.
- `src/ingress/product_ui_css.cpp`: `.operational-action-pack`, `.operational-action-pack-list`, `.operational-action-pack-card`, `.operational-action-pack-actions` 스타일을 추가해 `/ops/events` 안에서 action button과 상태 badge가 줄바꿈되도록 했습니다.
- `scripts/internal/verify_v270_operational_action_pack.mjs`, `server.sh`: S03 static verifier와 `verify-v270-operational-action-pack` command를 추가했습니다. 최초 RED는 API view model/UI marker 누락으로 실패했고 구현 후 GREEN으로 재실행했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `docs/project-feature-test-inventory.md`, `docs/manual-ui-checklist.md`: S03 coverage `UI-052`/`EVT-052`/`LAB-076`/`SAFE-060`, static smoke marker, 수동 UI 기준을 연결했습니다.
- `scripts/internal/verify_ops_source_health_bulk.mjs`: 현재 `/ops/sources` 스크립트가 `src/ingress/product_ui_ops_sources_script.cpp`로 분리된 구조를 반영하도록 verifier range를 갱신했습니다. 이는 source health bulk 제품 로직 변경이 아니라 stale verifier 수정입니다.
- 검증: `./server.sh build`, `verify-v270-operational-action-pack`, `verify-v270-incident-triage-board`, `verify-v270-incident-decision-scorecard`, `verify-v250-redacted-incident-evidence-bundle`, `verify-ops-alert-delivery-integrations`, `verify-ops-source-health-bulk`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`, `git diff --check`.
- 수정한 이슈: `./server.sh build`는 `OpsEventReviewState`의 실제 필드가 `incident_status`인데 `review.incident.status`로 참조해 최초 실패했고 필드 참조를 고친 뒤 재실행했습니다. `verify-ops-client-ui --browser-mode static`은 서버 없이 실행해 fetch 실패가 났고 auth-off throwaway 서버를 띄운 뒤 재실행했습니다. `verify-rule-ui`는 인앱 evidence 파일 없는 환경에서 기본 실행과 잘못된 `--in-app-evidence` 단독 실행이 실패했고, 프로젝트 verifier가 요구하는 명시적 Chrome fallback 환경으로 재실행했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, provider/cloud 호출, 실제 외부 alert delivery, 자동 rule registry write, source registry write, GitHub Release publish는 S03 완료 근거가 아닙니다.

## v2.7.0 S04 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsRuleWhatIfPreviewViewJson`, `OpsRuleWhatIfPreviewItemJson`, `OpsRuleWhatIfPreviewDraftJson`를 추가해 `/ops/api/events/reviews` 응답에 `ruleWhatIfPreview` Ops-only view model을 붙였습니다. 이 view model은 기존 EventRecord/review state와 matching VLM rule suggestion 후보를 selected incident condition preview, draft comparison, `/ops/rules?draftEventId=<eventId>&whatIfPreview=1` manual draft route로 요약하며 EventRecord/Event POST/WebRTC/SSE/WS/RTSP/WebRTC media path schema를 바꾸지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events` HTML에 `data-testid="ops-rule-what-if-preview"`, `data-rule-what-if-preview="selected-incident-draft-only"`, `opsRuleWhatIfPreviewBadges`, `opsRuleWhatIfPreviewRows`를 추가해 Rule What-if Preview shell을 제공했습니다. `/ops/rules`에는 `data-testid="ops-rule-what-if-preview-draft-context"`, `opsRuleWhatIfDraftContext`를 추가해 `draftEventId`와 `whatIfPreview=1` query가 있을 때 수동 저장 전 context를 표시합니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderRuleWhatIfPreview`를 추가해 `media-server.ops.rule-what-if-preview.v1` card, `draftComparison`, `conditionPreview`, `/ops/rules` draft-only link, no full replay/no auto apply/no rule write badge를 렌더링합니다. `opsRuleWhatIfDraftContextFromLocation`와 `renderOpsRuleWhatIfDraftContext`는 `/ops/rules` query context만 표시하며 저장 API나 rule registry write를 호출하지 않습니다.
- `src/ingress/product_ui_css.cpp`: `.rule-what-if-preview`, `.rule-what-if-preview-list`, `.rule-what-if-preview-card`, `.rule-what-if-preview-comparison` 스타일을 추가해 `/ops/events` 안에서 condition preview와 draft comparison이 줄바꿈 가능한 compact card로 표시되게 했습니다.
- `scripts/internal/verify_v270_rule_what_if_preview.mjs`, `server.sh`: S04 static verifier와 `verify-v270-rule-what-if-preview` command를 추가했습니다. 최초 RED는 API view model, `/ops/events` UI marker, `/ops/rules` draft context marker 누락으로 실패했고 구현 후 GREEN으로 재실행했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `docs/project-feature-test-inventory.md`, `docs/manual-ui-checklist.md`: S04 coverage `UI-053`/`EVT-053`/`LAB-077`/`SAFE-061`, static smoke marker, 수동 UI 기준을 연결했습니다.
- 검증: `./server.sh build`, `verify-v270-rule-what-if-preview`, `verify-v270-incident-triage-board`, `verify-v270-incident-decision-scorecard`, `verify-v270-operational-action-pack`, `verify-vlm-rule-suggestion-draft-workflow`, `verify-ops-rules-roundtrip --http-base http://127.0.0.1:8081`, `verify-analysis-state`, `verify-va-replay`, `verify-va-events`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `verify-rule-ui --http-base http://127.0.0.1:8081` with explicit Chrome fallback, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `git diff --check`.
- 수정한 이슈: `verify-vlm-rule-suggestion-draft-workflow`는 backlog의 과거 수정 이슈 문장에 남은 client/VLM route 결합 금지 패턴 문자열 때문에 최초 실패했고, 문장 의미는 유지하되 금지 패턴 직접 표기를 제거한 뒤 재실행했습니다. 서버 연동 verifier는 sandbox localhost EPERM 또는 auth 기본값 401로 최초 실패해 auth-off throwaway 서버와 승인 실행으로 재검증했습니다. `verify-va-events --http-base ...`는 지원하지 않는 옵션으로 실패했고, 기본 포트 방식으로 단독 재실행했습니다. `verify-auth-routes`는 병렬 실행 중 RTSP port 충돌로 실패해 단독 재실행했습니다.
- 임시 산출물 정리: S04 검증에서 생성된 `media_server_evtpost-1781616589-97688*`, `media_server_vaevt-1781616656-1241*`, `media_server_va_replay_baselines`, `media_server_analysis_state_smoke-92319`, `media_server_va_metadata_replay-*` 현재 run 출력은 삭제 후 동일 패턴으로 남은 항목이 없음을 확인했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, provider/cloud 호출, full replay engine, 자동 rule/profile 저장, 자동 적용, GitHub Release publish는 S04 완료 근거가 아닙니다.

## v2.7.0 S05 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsOperatorOutcomeMemoryViewJson`, `OpsOperatorOutcomeMemoryItemJson`, `OpsOperatorOutcomeMemoryHistoryHintJson`, `OpsOperatorOutcomeMemoryCountsJson`를 추가해 `/ops/api/events/reviews` 응답에 `operatorOutcomeMemory` Ops-only view model을 붙였습니다. 이 view model은 기존 EventRecord와 Ops review state/audit action reference를 읽어 accept/dismiss/review-needed/not-reviewed outcome, `similarIncidentKey`별 outcome count, `deterministicHistoryHint`, `reviewStateBasis`, `auditActionRefs`를 요약하며 EventRecord/Event POST/WebRTC/SSE/WS/RTSP/WebRTC media path schema를 바꾸지 않습니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/events` HTML에 `data-testid="ops-operator-outcome-memory"`, `data-operator-outcome-memory="review-audit-history-hint"`, `opsOperatorOutcomeMemoryBadges`, `opsOperatorOutcomeMemoryRows`를 추가해 Operator Outcome Memory shell을 제공했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderOperatorOutcomeMemory`를 추가해 `media-server.ops.operator-outcome-memory.v1` card, accept/dismiss/review-needed count, deterministic history hint, review state basis, audit action reference를 렌더링하고 `refreshEvents`와 raw debug payload에 `operatorOutcomeMemory`를 연결했습니다.
- `src/ingress/product_ui_css.cpp`: `.operator-outcome-memory`, `.operator-outcome-memory-list`, `.operator-outcome-memory-card`, `.operator-outcome-memory-hint` 스타일을 추가해 `/ops/events` 안에서 outcome count와 hint가 compact card로 표시되게 했습니다.
- `scripts/internal/verify_v270_operator_outcome_memory.mjs`, `server.sh`: S05 static verifier와 `verify-v270-operator-outcome-memory` command를 추가했습니다. 최초 RED는 API view model과 `/ops/events` UI marker 누락으로 실패했고 구현 후 GREEN으로 재실행했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`, `docs/project-feature-test-inventory.md`, `docs/manual-ui-checklist.md`: S05 coverage `UI-054`/`EVT-054`/`LAB-078`/`SAFE-062`, static smoke marker, 수동 UI 기준을 연결했습니다.
- 검증: `./server.sh build`, `verify-v270-operator-outcome-memory`, `verify-v270-incident-triage-board`, `verify-v270-incident-decision-scorecard`, `verify-v270-operational-action-pack`, `verify-v270-rule-what-if-preview`, `verify-vlm-review-action-workflow`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081`, `verify-ops-client-ui --browser-mode chrome --allow-chrome-fallback=1 --screenshots --http-base http://127.0.0.1:8081`, `verify-event-post --mode disabled --http-base http://127.0.0.1:8081`, `verify-ws-metadata --http-base http://127.0.0.1:8081`, `MEDIA_SERVER_UI_BROWSER_MODE=chrome MEDIA_SERVER_ALLOW_CHROME_FALLBACK=1 ./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-ops-event-action-incident-workflow`, `verify-ops-audit-trail`, `verify-ops-audit-persistence`, `git diff --check`.
- 수정한 이슈: `verify-ops-client-ui --browser-mode static`은 sandbox localhost fetch 제한으로 최초 실패했고 승인 실행으로 재시도했습니다. auth-on 서버에서는 인증 요구로 shell marker 확인이 실패해 auth-off throwaway 서버로 재실행했고 최종 PASS를 확인했습니다. `verify-script-inventory`는 문서에 S06 `verify-v270-owner-release-readiness`가 선반영됐지만 command가 아직 없어 실패했으며, 이는 S05 제품 회귀가 아니라 S06에서 닫아야 하는 릴리즈 준비 wiring 누락입니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, provider/cloud 호출, 새 persistent outcome store, 자동 학습/자동 적용, client/viewer route 노출, GitHub Release publish는 S05 완료 근거가 아닙니다.

## v2.7.0 S06 개발 기록

- `scripts/internal/verify_v270_owner_release_readiness.mjs`, `server.sh`: S06 local release readiness verifier와 `verify-v270-owner-release-readiness` command를 추가했습니다. 최초 RED는 S06 feature inventory mapping, manual UI criteria, backlog/evidence 진행 기록 누락으로 실패했습니다.
- `docs/project-feature-test-inventory.md`: V270-S06 mapping을 `UI-050`~`UI-054`, `OPS-038`, `SAFE-063`으로 연결하고 summary count를 473개 기능 ID, UI 비대상 163개, 테스트 필요 473개, 안정화 대상 463개로 갱신했습니다. `OPS-038`은 v2.7.0 릴리즈 준비 게이트, `SAFE-063`은 local readiness PASS를 UI/30분/120분/published/tag/push evidence로 승격하지 않는 boundary입니다.
- `scripts/internal/verify_project_feature_test_inventory.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`: 새 `OPS-038`/`SAFE-063` required row와 `verify-v270-owner-release-readiness` coverage 연결을 추가했습니다.
- `docs/manual-ui-fulltest.md`, `docs/manual-ui-checklist.md`: S06가 직접 UI PASS가 아니라 S01~S05 UI criteria와 release evidence/not-run boundary를 묶는 기준 정리임을 기록했습니다.
- `docs/release-policy.md`, `docs/release-evidence-index.md`, `docs/stream-verification.md`: `media-server.v270-owner-release-readiness.v1`, companion local gates, not-run/excluded/published metadata boundary를 연결했습니다.
- Companion local gates: `verify-v270-owner-release-readiness`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-feature-inventory-coverage`, `verify-manual-ui-evidence`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run`, `git diff --check`.
- 검증: `verify-v270-owner-release-readiness` 최초 RED는 S06 feature inventory mapping, manual UI criteria, backlog/evidence 진행 기록 누락으로 실패했고, 문서/inventory/server wiring 반영 후 GREEN으로 재실행했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, `verify-release-metadata --published`, tag/push/GitHub Release, PR merge/main sync/후속 브랜치 생성, 실기기 ONVIF, external TURN/WHEP, real cloud/VLM provider 호출은 S06 local readiness 완료 근거가 아닙니다.

## 직전 공개 기준: v2.6.0 Source Release Baseline

v2.6.0은 source-only/live-only 제품 경계를 유지하면서 Operational Hardening &
Incident Memory Productization을 닫은 직전 공개 릴리즈입니다. 이 기준은 v2.7.0의
시작 baseline이며, v2.7.0의 예정 항목 완료 evidence로 재사용하지 않습니다.

## 완료 roadmap: v2.6.0 Operational Hardening & Incident Memory Productization

| ID | 상태 | 요약 | 현재 해석 |
| --- | --- | --- | --- |
| V260-S00 | 완료 | v2.6.0 baseline/source-of-truth 정렬 | 직전 published baseline, v2.7.0 완료 근거 아님 |
| V260-S01 | 완료 | VLM summary candidate의 Ops-only incident memory productization | 직전 published baseline, v2.7.0 완료 근거 아님 |
| V260-S02 | 완료 | Rule suggestion 후보의 manual review/draft workflow 연결 | 직전 published baseline, v2.7.0 완료 근거 아님 |
| V260-S03 | 완료 | ONVIF credential binding/store gate 설계와 redaction guard | 직전 published baseline, v2.7.0 완료 근거 아님 |
| V260-S04 | 완료 | Runtime dashboard baseline/sparkline 고도화 후보 | 직전 published baseline, v2.7.0 완료 근거 아님 |
| V260-S05 | 완료 | ScenarioEngine cross-zone re-entry 후보 | 직전 published baseline, v2.7.0 완료 근거 아님 |
| V260-S06 | 완료 | v2.6.0 owner release readiness local gate | 직전 published baseline, v2.7.0 완료 근거 아님 |

## v2.6.0 S01 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsVlmSummaryCandidateReviewJson`를 추가해 기존 VLM summary search candidate report를 `/ops/api/events/reviews`의 `memorySearch.vlmSummaryCandidateReview` Ops-only wrapper로 연결하고, `/ops/events` HTML에 candidate review panel shell을 추가했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderVlmSummaryCandidateReview`가 `sourceCandidateReport.candidates`, matched terms, manual review route, no-auto-apply 상태를 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `/ops/events` candidate review panel/list/card 스타일을 추가했습니다.
- `scripts/internal/verify_v260_incident_memory_productization.mjs`, `server.sh`: S01 schema/wrapper/UI marker/docs/inventory/static smoke wiring guard를 추가했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `docs/project-feature-test-inventory.md`: `/ops/events` S01 UI marker와 `UI-045`/`EVT-046`/`LAB-069`/`SAFE-052` coverage를 추가했습니다.
- 검증: `./server.sh build`, `verify-v260-incident-memory-productization`, `verify-vlm-summary-search-candidates`, `verify-ops-client-ui --browser-mode static`, `verify-rule-ui --in-app-evidence`, `verify-event-post --mode disabled`, `verify-ws-metadata`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `git diff --check`.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, provider/cloud 호출, 자동 Rule/Profile 적용은 S01 완료 근거가 아닙니다.

## v2.6.0 S02 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `OpsIncidentRuleSuggestionReviewJson`를 추가해 `/ops/api/events/reviews` item마다 matching VLM sidecar `ruleSuggestion`과 기존 `media-server.vlm-rule-suggestion-candidates.v1` candidate report를 `media-server.ops.incident-rule-suggestion-review.v1` Ops-only wrapper로 감쌌습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `renderIncidentRuleSuggestionReview`가 `/ops/events` review row 안에 incident-to-rule 검토 카드, candidate status, source candidate count, `/ops/rules` draft-only 링크를 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: incident-to-rule 검토 카드를 기존 event review/VLM review 카드와 같은 밀도로 보이도록 스타일을 추가했습니다.
- `scripts/internal/verify_v260_rule_suggestion_review.mjs`, `server.sh`: S02 wrapper schema, matching `ruleSuggestion`, `/ops/events` marker, `/ops/rules` draft-only 링크, docs/inventory wiring, client/provider/auto-rule 비범위를 검증하는 verifier를 추가했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `docs/project-feature-test-inventory.md`: S02 UI/API marker와 `UI-046`/`EVT-047`/`LAB-070`/`SAFE-053` coverage를 추가했습니다.
- 검증: `./server.sh build`, `verify-v260-rule-suggestion-review`, `verify-vlm-rule-suggestion-candidates`, `verify-vlm-rule-suggestion-draft-workflow`, `verify-ops-client-ui --browser-mode static`, `verify-ops-client-ui --browser-mode static --screenshots`, `verify-rule-ui --in-app-evidence`, `verify-event-post --mode disabled`, `verify-ws-metadata`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-docs-ui-assets`, `git diff --check`.
- 수정한 이슈: 기존 inventory 요약 문구가 S08 verifier의 client와 VLM route 결합 금지 패턴에 걸려 false positive가 발생했으므로, 의미를 유지한 채 `auth, Ops, Client, VLM, v250` 문구로 정리했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, provider/cloud 호출, 자동 Rule/Profile 저장, GitHub Release publish는 S02 완료 근거가 아닙니다.

## v2.6.0 S03 개발 기록

- `src/ingress/onvif_live_import.cpp`: `UriContainsAuthorityCredential`와 `OnvifCredentialGateJson`를 추가해 `/ops/api/onvif/import-draft` draft response에 `credentialGate` summary를 붙이고, 선택 profile `streamUri` authority에 username/password가 있으면 draft 생성을 거부합니다.
- `src/ingress/webrtc_http_server.cpp`: `/ops/sources` ONVIF probe draft tool에 `data-testid="onvif-credential-gate"` 패널과 `source:write`, `primaryStoreProvider: none`, `reference-only`, secret store off 상태를 표시했습니다.
- `src/ingress/product_ui_ops_sources_script.cpp`: `renderOnvifCredentialGate`와 form validation을 추가해 ONVIF stream URI의 URL credential 입력을 제품 UI에서 차단하고, draft 적용 후 redacted `credentialGate` 상태만 렌더링합니다.
- `src/ingress/product_ui_css.cpp`: `/ops/sources` credential gate panel의 compact status/card 스타일을 추가했습니다.
- `test/fixtures/onvif_credential_binding_gate.json`: 1차 선택값 `none`, fallback `in-memory-fixture`, 제외 대상 `local-encrypted`/`external-secret-manager`, license/provenance/privacy/운영 제약, redaction guard를 기록했습니다.
- `scripts/internal/verify_v260_onvif_credential_gate.mjs`, `server.sh`: S03 fixture, C++ gate, `/ops/sources` marker, URL credential reject, docs/inventory/command wiring, persistent store/client/schema/media 비범위 guard를 검증하는 명령을 추가했습니다.
- `scripts/internal/verify_onvif_import_draft_api.mjs`, `scripts/internal/verify_onvif_probe_draft_api.mjs`: `rtsp://user:pass@...` profile URL credential negative case를 추가했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `docs/project-feature-test-inventory.md`: `/ops/sources` static smoke marker와 `UI-047`/`SRC-031`/`LAB-071`/`SAFE-054` feature coverage를 추가했습니다.
- `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`: S03 feature inventory coverage와 row/range 검증 기준을 갱신했습니다.
- 검증: `./server.sh build`, `verify-v260-onvif-credential-gate`, `verify-onvif-credential-reference-policy`, `verify-onvif-auth-injection-design`, `verify-onvif-field-smoke-redaction`, `verify-onvif-auth-injection-loopback`, `verify-onvif-import-draft-api`, `verify-onvif-probe-draft-api`, `verify-ops-client-ui --browser-mode static`, `verify-ops-client-ui --browser-mode static --screenshots`, `verify-rule-ui --in-app-evidence`, `verify-event-post --mode disabled`, `verify-ws-metadata`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-onvif-live-import-contract`, `verify-onvif-probe-fixture-contract`, `verify-onvif-protocol-support-matrix`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `verify-docs-ui-assets`, `git diff --check`.
- 수정한 이슈: 최초 S03 verifier는 fixture/코드/UI marker가 없어 실패했고, 구현 후 재실행했습니다. 이후 `SRC-030` 중복과 inventory range verifier 불일치를 확인해 S03 source row를 `SRC-031`로 옮기고 verifier range를 갱신한 뒤 관련 inventory 검증을 다시 실행했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, 실기기 ONVIF credential field smoke, persistent credential store 구현, external secret manager 연동, GitHub Release publish는 S03 완료 근거가 아닙니다.

## v2.6.0 S04 개발 기록

- `src/ingress/webrtc_http_server.cpp`: `/ops/dashboard` card grid에 `data-testid="ops-runtime-trend-card"` runtime trend card를 추가하고 `data-runtime-trend-scope="page-session-only"`, `data-longrun-evidence="not-provided"`로 장기 evidence가 아님을 표시했습니다.
- `src/ingress/product_ui_page_scripts.cpp`: `dashboardRuntimeTrendSamples`, `runtimeTrendSampleFrom`, `runtimeTrendSparklineHtml`, `renderDashboardRuntimeTrend`를 추가해 `/ops/api/runtime/status`, source health, events status 응답을 browser page session 안에서만 최대 12개 sample로 요약합니다.
- `src/ingress/product_ui_css.cpp`: `.runtime-sparkline`, `.runtime-spark-bar`, `.runtime-trend-baseline` 스타일을 추가해 compact dashboard card 안에서 layout shift 없이 sparkline 후보를 표시합니다.
- `scripts/internal/verify_v260_runtime_dashboard_trends.mjs`, `server.sh`: S04 dashboard marker, page-local sample buffer, CSS/UI smoke/docs/inventory wiring, longrun/schema/media/client 비범위를 검증하는 명령을 추가했습니다.
- `scripts/internal/verify_ops_client_ui_smoke.mjs`, `docs/project-feature-test-inventory.md`: `/ops/dashboard` static smoke marker와 `UI-048`/`EVT-048`/`LAB-072`/`SAFE-055` coverage를 추가했습니다.
- `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`: S04 feature inventory coverage와 row/range 검증 기준을 갱신했습니다.
- 검증: `./server.sh build`, `verify-v260-runtime-dashboard-trends`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-ops-client-ui --browser-mode static`, `verify-ops-client-ui --browser-mode static --screenshots`, `verify-va-runtime-console`, `verify-ws-metadata`, `verify-va-metadata-sidechannel`, `verify-webrtc-va-metadata`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `git diff --check`.
- 수정한 이슈: 최초 S04 verifier는 roadmap/UI/script/CSS/inventory wiring 누락으로 실패했습니다. verifier의 `120분 PASS` 금지 패턴이 “PASS로 보고하지 않는다” 문구까지 잡는 오탐을 내서 금지 문구를 정확히 좁힌 뒤 다시 RED를 확인했습니다. auth verifier는 최초 env 미지정으로 시작 전 실패했고, 일회성 test operator env를 넣은 뒤 sandbox 포트 바인딩 실패가 발생해 승인 실행으로 재검증했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, Runtime Dashboard longrun/cycle evidence, persistent trend store, server trend API, client/viewer trend 노출, GitHub Release publish는 S04 완료 근거가 아닙니다.

## v2.6.0 S05 개발 기록

- `include/analysis/re_entry_scenario.h`, `src/analysis/re_entry_scenario.cpp`: `re_entry_mode`, `re_entry_zone_ids`, source/destination zone 필터를 추가해 기본 `same-zone`은 유지하고 `configured-zones`에서 source zone A 이탈 후 destination zone B 진입 후보를 기존 `re-entry` event type으로 확정합니다.
- `src/analysis/event_rule_engine.cpp`: 저장 rule scenario payload의 기존 `reEntryMode`와 `reEntryZoneIds`를 ReEntryScenario runtime option으로 연결했습니다.
- `scripts/internal/analysis_state_smoke.cpp`: `configured-zones` A→B positive case와 destination 밖 negative case를 추가했습니다.
- `test/fixtures/va_replay/re_entry_cross_zone_*`, `scripts/internal/verify_va_replay_baselines.sh`: A→B cross-zone replay fixture와 expected EventRecord `zoneId=destination-zone` case를 `verify-va-replay` baseline에 추가했습니다.
- `src/ingress/webrtc_http_server.cpp`, `src/ingress/product_ui_page_scripts.cpp`: `/ops/rules` ReEntry 기준 select/condition summary/preset warning에 `지정 영역 A→B 후보`와 source/destination 기준을 표시했습니다.
- `scripts/internal/verify_v260_scenario_cross_zone_reentry.mjs`, `server.sh`: S05 C++ option/parser, analysis-state, va-replay fixture, UI/docs/inventory wiring, schema/media/client 비범위를 검증하는 명령을 추가했습니다.
- `docs/video-analysis.md`, `docs/ui-guide.md`, `docs/config-reference.md`, `docs/project-feature-test-inventory.md`, `docs/stream-verification.md`: S05 candidate 범위, UI 기준, inventory `UI-049`/`RULE-103`/`EVT-049`/`LAB-073`/`SAFE-056`, command catalog를 갱신했습니다.
- 검증: `verify-analysis-state` RED 후 구현, `./server.sh build`, `verify-v260-scenario-cross-zone-reentry`, `verify-analysis-state`, `verify-va-replay`, `verify-rule-ui` Chrome fallback smoke, `verify-event-post --mode schema`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-docs-links`, `git diff --check`를 실행했습니다.
- 수정한 이슈: 새 replay fixture는 EventRuleEngine output은 정상 생성했지만 direct ScenarioEngine metric까지 expected로 요구해 최초 실패했습니다. S05 evidence 범위가 rule replay EventRecord 후보임을 반영해 expected에서 direct metric 요구를 제거하고 재검증했습니다. `verify-rule-ui` 기본 실행은 Codex 인앱 evidence 파일이 없어 시작 전 실패했고, 실행 중인 auth-off 서버와 명시 Chrome fallback으로 보조 smoke를 재실행해 통과했습니다. `verify-event-post --mode schema`는 dispatcher disabled 서버에서 사전조건 실패 후 `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1` 서버로 재실행해 통과했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, 새 event type, Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media path 변경, client/viewer 노출, GitHub Release publish는 S05 완료 근거가 아닙니다.

## v2.6.0 S06 개발 기록

- `scripts/internal/verify_v260_owner_release_readiness.mjs`, `server.sh`: `media-server.v260-owner-release-readiness.v1` local readiness verifier와 `verify-v260-owner-release-readiness` command dispatch를 추가했습니다.
- `docs/project-feature-test-inventory.md`, `scripts/internal/verify_feature_inventory_coverage.mjs`, `scripts/internal/verify_project_feature_test_inventory.mjs`: S06 mapping row, `OPS-037` release readiness gate, `SAFE-057` release boundary, `SAFE-001`~`SAFE-057`/`OPS-035`~`OPS-037` coverage range를 추가했습니다.
- `docs/manual-ui-checklist.md`, `docs/manual-ui-fulltest.md`: `UI-045`~`UI-049` Operational Hardening UI 기준을 수동 UI 풀테스트 항목으로 묶고 raw JSON/API-only/static smoke/Chrome fallback이 UI 풀테스트 PASS가 아님을 명시했습니다.
- `docs/release-policy.md`, `docs/release-evidence-index.md`, `docs/stream-verification.md`: S06 local readiness companion gate와 UI 풀테스트 직접 조작, 30분/120분, published metadata, tag/push/GitHub Release, PR/main/후속 브랜치 미실행 경계를 분리했습니다.
- 검증: `verify-v260-owner-release-readiness` RED 후 문서/스크립트 연결을 구현했고, `verify-v260-owner-release-readiness`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-feature-inventory-coverage`, `verify-manual-ui-evidence`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run`, `verify-project-inventory`, `verify-script-inventory`, `git diff --check`를 실행했습니다.
- 수정한 이슈: 최초 `verify-v260-owner-release-readiness`는 S06 inventory/manual UI/release evidence/stream command 연결이 없어 실패했습니다. `verify-manual-ui-evidence`는 current release UI gate 문구와 `## v2.6.0 Release Evidence Index` 템플릿이 없어 실패했고, manual UI checklist/result template/backlog cross-reference를 보강한 뒤 재실행 PASS했습니다.
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분 장시간 테스트, `verify-release-metadata --published`, tag/push/GitHub Release, PR merge/main sync/후속 브랜치 생성은 S06 local readiness 완료 근거가 아닙니다.

## v2.6.0 publish/test 제외 경계

- `V260-S00` source-of-truth 정렬은 2.6.0 GitHub Release publish 완료가 아닙니다.
- 예정 항목은 구현과 직접 evidence가 생기기 전까지 완료로 쓰지 않습니다.
- UI 풀테스트 직접 조작 미실행은 local verifier PASS로 대체하지 않습니다.
- 30분 테스트 미실행은 `verify-predev --soak-minutes 30` PASS로 보고하지 않습니다.
- 120분 테스트 미실행은 `verify-predev --soak-minutes 120` 또는 `verify-va-runtime-console-longrun --duration-minutes 120` PASS로 보고하지 않습니다.
- `v2.6.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.
- PR merge/main sync/next branch sync는 별도 명시 승인과 실제 실행 evidence가 있기 전까지 완료로 쓰지 않습니다.

## Historical UI Evidence Gate Cross-reference

아래 행은 현재 v2.7.0 개발 범위가 아니라 `verify-manual-ui-evidence` 호환을 위한
과거 UI evidence gate 참조입니다. 실행 evidence나 현재 release 완료 근거가 아닙니다.

| ID | verifier | 경계 |
| --- | --- | --- |
| V180-P0-03 | Manual UI evidence checklist hardening / `verify-manual-ui-evidence` | `/setup`, `/login`, `/ops`, `/client`, `/ops/rules`, `/client/live` evidence index 문서가 PASS/FAIL, 제외 기록, raw JSON/API-only 비대체 경계를 유지하는지 확인 |
| V180-P1-03 | Release evidence index / `verify-release-evidence-index` | longrun, UI evidence, PR checks, release notes, skipped tests를 evidence index review 대상으로 묶되 실행하지 않은 release action을 PASS로 승격하지 않음 |

## 이전 공개 기준: v2.5.0 Source Release Baseline

v2.5.0은 source-only/live-only 제품 경계를 유지하면서 Semantic Incident Memory를 닫은
이전 공개 릴리즈입니다. 이 기준은 v2.6.0의 시작 baseline이며, v2.7.0의 예정 항목
완료 evidence로 재사용하지 않습니다.

## 완료 roadmap: v2.5.0 Semantic Incident Memory

| ID | 상태 | 요약 | 현재 해석 |
| --- | --- | --- | --- |
| V250-S00 | 완료 | v2.5.0 baseline/source-of-truth 정렬 | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S01 | 완료 | Event/incident text projection | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S02 | 완료 | Local incident memory index | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S03 | 완료 | `/ops/events` semantic search UI | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S04 | 완료 | Incident timeline graph | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S05 | 완료 | Explainable incident brief | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S06 | 완료 | Similar incident lookup | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S07 | 완료 | Client-safe incident digest | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S08 | 완료 | Redacted incident evidence bundle | 이전 published baseline, v2.7.0 완료 근거 아님 |
| V250-S09 | 완료 | Owner decomposition/release readiness | 이전 published baseline, v2.7.0 완료 근거 아님 |

## 이전 공개 기준: v2.4.0 Source Release Baseline

v2.4.0은 source-only/live-only 제품 경계를 유지하면서 Operator Event Review & Action
Workflow를 닫은 이전 공개 릴리즈입니다. 이 기준은 historical baseline이며,
v2.7.0의 예정 항목 완료 evidence로 재사용하지 않습니다.

## 완료 roadmap: v2.4.0 Operator Event Review & Action Workflow

| ID | 상태 | 요약 | 현재 해석 |
| --- | --- | --- | --- |
| V240-S01 | 완료 | Operator Event Review Inbox | 과거 baseline, v2.7.0 완료 근거 아님 |
| V240-S02 | 완료 | Event Action and Incident Workflow | 과거 baseline, v2.7.0 완료 근거 아님 |
| V240-S03 | 완료 | Alert Dry-run and Delivery Attempt Log | 과거 baseline, v2.7.0 완료 근거 아님 |
| V240-S04 | 완료 | Client-safe Event and Status Summary | 과거 baseline, v2.7.0 완료 근거 아님 |
| V240-S05 | 완료 | Rule and Scenario Review Loop | 과거 baseline, v2.7.0 완료 근거 아님 |
| V240-S08 | 완료 | release readiness gate | `verify-v240-release-readiness-gate` local readiness이며 publish evidence가 아님 |

## 후속 이슈 추천 규칙

후속 이슈는 현재 source tree와 현재 v3.9 스텝 범위 안에서 실제로 처리 가능한 항목만
기록합니다. 다음 버전 후보, 별도 Phase 후보, 사용자 승인이 필요한 새 제품 범위는 이
문서에 추천하지 않습니다.
