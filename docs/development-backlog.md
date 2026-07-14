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

상태: Step 1~29 기능·결정·readiness local gate는 한 차례 닫혔으나, 2026-07-11 실제 구현
재검토에서 `V390-REVIEW2-19`~`V390-REVIEW2-35` 잔여가 확인되었습니다. 이후 구현됐다고
기록된 항목을 2026-07-12 다시 source-level로 감사한 결과 semantic closure, exact 424 UI
automation, Policy v4 actual evidence producer, acceptance 연결, durability, 구조 graph 검증에
잔여 결함이 확인되어 `V390-REVIEW3-36`~`V390-REVIEW3-49`로 재오픈했습니다. REVIEW3 구현 뒤
2026-07-12 source를 다시 직접 감사한 결과, semantic evidence와 exact UI/Policy v4 경로,
durability, one-command acceptance, 구조 실행 범위에 추가 결함이 확인되어
`V390-REVIEW4-50`~`V390-REVIEW4-65`로 다시 재오픈했습니다. 아래 과거 `완료` 행과
재검토 결과가 충돌하면 **2026-07-12 REVIEW4 섹션이 최우선**입니다. 여기서
`완료`라고 표시한 값은 각 step의 문서, read-only decision route, UI status, verifier,
release evidence boundary가 연결되었다는 뜻이며 제품 의미의 구현 완료와 같지 않습니다.
실제 30분/120분 runner, 무료 UI 자동화 runner, 구조 안정화 리팩토링, UI 풀테스트 직접 실행,
30분/120분 장시간 실행, published metadata, release action은 각 직접 evidence가 있을
때만 완료로 봅니다. 아래 REVIEW4 잔여 구현 목표는 다른 개발 채팅이 이 대화의
맥락 없이도 구현해야 할 실제 목표와 통과 조건을 이해하도록 남긴 source-of-truth입니다.
Candidate/structure 영역은 여전히 discovery 결과 승인 전 기능 개발 금지 경계를 따릅니다.

직접 답: v3.9.0의 1차 선택값은 `Feature Completion First with Dedicated Inventory`였으며,
REVIEW4-51의 최신 승인으로 REVIEW4-50~63을 먼저 닫은 뒤 실제 동작 보존 구조 안정화와
리팩토링을 같은 `v3.9.0` 브랜치의 REVIEW4-64에서 수행합니다. REVIEW4-65 독립
acceptance가 그 뒤를 따르며 실제 리팩토링을 v4.0.0으로 이관하지 않습니다.

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
| Post-review Test Closure | v3.9.0 (21) actual test acceptance bundle 실행 모드 | P0 | `verify-v390-test-acceptance-bundle`의 실제 실행 모드를 구현해 dry-run이 아니라 R1/R2 evidence 또는 새 실행 결과를 stop-on-first-fail summary/report로 묶음 |
| Post-review Test Closure | v3.9.0 (22) v3.9 UI automation case completeness | P0 | `UI-112` staging restore validation handoff 누락을 포함해 v3.9 신규 UI-108~UI-115 case manifest와 replay evidence를 완전하게 정렬 |
| Post-review Test Closure | v3.9.0 (23) native free UI automation adapter proof | P0 | Playwright/Selenium/SikuliX 중 실제 선택 adapter가 native로 실행되는지 증명하고, `chrome-cdp-fallback`은 fallback evidence로만 남김 |
| Post-review Test Closure | v3.9.0 (24) server longrun true first-fail case runner | P0 | `verify-predev` 누적형 의존을 줄이거나 `--stop-on-first-fail` opt-in을 추가해 실패 즉시 이후 case를 `not-run`으로 남기는 실제 case runner 구현 |
| Post-review UI Full Coverage | v3.9.0 (25) route/control/action automation coverage matrix | P0 | v1.0~v3.9 current UI 기능 ID를 manifest화하고 자동 runner가 각 route/control/action을 실행/반영/로그 단위로 검증하게 정렬 |
| Post-review Release Evidence | v3.9.0 (26) final evidence re-run and cleanup | P0 | post-review 잔여 구현 후 local gate, 30분, UI automation/full coverage, 조건부 120분 판정, cleanup/evidence 보존을 최종 release action 전 다시 실행 |
| Product Scope Lock | v3.9.0 (27) deferred product decision owner sign-off | P1 | action execution, persistent credential store, field smoke, provider call, model-backed Re-ID 등 의도적으로 defer된 기능을 v3.9 non-goal로 닫을지 실제 구현할지 owner decision으로 고정 |
| Structure | v3.9.0 (28) structure stabilization implementation readiness | P1 | Step 19 handoff가 실제 refactor가 아니므로 slice와 검증 순서를 확정. 실행 branch 결정은 REVIEW4-51이 current `v3.9.0`으로 supersede |
| Conditional Field | v3.9.0 (29) real external field smoke gate | P2 | ONVIF 실기기, external WHEP/TURN, cloud/VLM provider credential/endpoint가 제공되는 경우에만 real field smoke를 실행하고 기본 PASS와 분리 |

### v3.9.0 진행 상태

| 번호 | 제목 | 우선순위 | 상태 | 완료/잔여 내용 |
| --- | --- | --- | --- | --- |
| 1 | v3.9.0 (1) v3.9.0 baseline 정렬 | P0 | 완료 | VERSION/CMake/README/docs/backlog/source roadmap과 `verify-v390-entry-baseline` 기준 정렬 |
| 2 | v3.9.0 (2) Feature Completion Inventory/Discovery Gate | P0 | 완료 | `docs/v390-feature-completion-inventory.md`에 required/candidate/structure/excluded 항목과 checked source group 반영 |
| 3 | v3.9.0 (3) User Review Gate / 개발 순서 확정 | P0 | 완료/initial snapshot historical/current closed | initial review-ready·승인 전 차단 상태는 historical snapshot으로 보존하고, 후속 사용자 goal 승인으로 required/candidate 개발이 모두 `closed-with-evidence`, current active candidate가 없음으로 reconciliation |
| 4 | v3.9.0 (4) Manual UI 기준서 v3.9 current화 | P0 | 완료 | `V390-REQ-001`: `docs/manual-ui-fulltest.md`, `docs/manual-ui-checklist.md`, `docs/manual-ui-result-template.md`가 v3.9 current target과 historical v2.x/v3.x 기준을 분리하고 `verify-manual-ui-evidence`가 이를 확인 |
| 5 | v3.9.0 (5) 장시간/UI 테스트 시작 조건 v3.9화 | P0 | 완료 | `V390-REQ-002`: 긴 테스트 시작 조건을 v3.9 feature completion inventory, current project inventory, 사용자 승인/AGENTS 7.6.2 조건 기준으로 정렬 |
| 6 | v3.9.0 (6) v3.5-v3.8 UI coverage bridge | P0 | 완료 | `V390-REQ-003`: manual UI docs가 v3.5~v3.8 UI/control/action rows를 project feature inventory로 위임하고 실행 PASS와 coverage mapping을 분리 |
| 7 | v3.9.0 (7) UI wrapper/result schema 오판 방지 | P0 | 완료 | `V390-CAND-007`: `verify-ui-fulltest-one-shot` summary에 `wrapperResult`/`resultScope`/`uiFulltestEvidenceStatus`/`manualResultStatus`/`longrunStatus`/`evidenceBoundary`를 추가하고 `verify-v390-evidence-test-gate-prep`가 오판 방지 경계를 확인 |
| 8 | v3.9.0 (8) feature inventory coverage wording 오판 방지 | P0 | 완료 | `V390-CAND-008`: feature coverage report를 `coverageStatus: covered/missing`, `executionEvidenceStatus: not-execution-evidence` 중심으로 바꾸고 mapping coverage와 실행 PASS를 분리 |
| 9 | v3.9.0 (9) AI-minimized server longrun runner 기준 | P0 | 완료 | 30분/120분 script runner의 one command, fixed phase order, stop-on-first-fail, later phase `not-run`, failure evidence, cleanup/artifact policy 기준을 `stream-verification.md`와 verifier로 고정 |
| 10 | v3.9.0 (10) AI-minimized UI automation adapter 기준 | P0 | 완료 | Playwright 우선, Selenium fallback, SikuliX visual fallback과 route/viewport/theme/account-role/action/expected-actual/screenshot/trace-console/log/cleanup/manual-intervention failure report 기준을 `manual-ui-fulltest.md`와 verifier로 고정 |
| 11 | v3.9.0 (11) ONVIF credential/provider status summary | P1 | 완료 | `V390-CAND-001`: `/ops/api/onvif/credential-provider-status`와 `/ops/sources` ONVIF provider summary가 primary provider `none`, fallback `in-memory-fixture`, persistent/external secret store defer 결정을 secret/reference value 비노출 상태로 표시 |
| 12 | v3.9.0 (12) ONVIF live import persist decision | P1 | 완료 | `V390-CAND-002`: import draft `notSaved:true`와 one-shot persist disabled를 유지하고, explicit operator save는 `source:write` paired source/view route와 compensating rollback을 사용 |
| 13 | v3.9.0 (13) VLM rule suggestion draft bridge | P1 | 완료 | `V390-CAND-003`: `/ops/api/vlm/rule-suggestion-draft-bridge`와 `/ops/rules`가 incident review provenance를 기존 VLM rule suggestion draft-only/manual-save workflow로 연결하고 rule/profile write, auto-apply, provider/runtime call은 수행하지 않음 |
| 14 | v3.9.0 (14) VLM evaluation promotion guard | P1 | 완료 | `V390-CAND-004`/`V390-ADD1-03`: `/ops/api/vlm/evaluation-promotion-guard`와 `/ops/vlm`가 server-verified candidate promotion을 표시하고 profile save가 candidate/revision/digest/result/provenance 및 option/model/prompt binding을 검증함. runtime/provider call은 수행하지 않음 |
| 15 | v3.9.0 (15) backup/recovery handoff validation | P1 | 완료 | `V390-CAND-005`: `/ops/api/source-registry/staging-restore-validation-handoff`와 `/ops/sources`가 staging restore checklist/result artifact contract를 source registry, PublishedView, source health, viewer scope 기준으로 표시하고 production restore/write/recovery는 수행하지 않음 |
| 16 | v3.9.0 (16) action execution deferral decision | P1 | 완료 | `V390-CAND-006`: `/ops/api/actions/execution-deferral-decision`와 `/ops` Action Control Workspace가 `defer-all-action-writes`, source recheck/client notice/rule apply write deferred, approval-gated execution disabled를 표시하고 action execution/write/external delivery는 수행하지 않음 |
| 17 | v3.9.0 (17) field evidence bridge | P2 | 완료 | `V390-CAND-009`: `/ops/api/field-evidence/bridge-decision`와 `/ops` dashboard가 `approval-only-minimal-field-evidence-bridge`, ONVIF/external WHEP-TURN/cloud-VLM 승인 조건, minimal evidence contract, not-run/no-field-execution boundary를 표시하고 field smoke/provider call/write는 수행하지 않음 |
| 18 | v3.9.0 (18) Re-ID appearance assist model-backed path decision | P2 | 완료 | `V390-CAND-010`: `/ops/api/analysis/reid-assist-decision`와 `/ops` dashboard가 `explicit-opt-in-provenance-gated-assist`, model/checksum/provenance gate, no-op fallback, tracker-none forces off boundary를 표시하고 model-backed execution/embedding/crop serialization은 수행하지 않음 |
| 19 | v3.9.0 (19) structure stabilization handoff 상세계획 | P0 | 완료 | 인벤토리 `V390-STRUCT-001`~`V390-STRUCT-005`를 `docs/superpowers/plans/2026-07-08-v390-structure-stabilization-handoff.md`로 이관하고 `verify-v390-structure-stabilization-handoff` gate로 구조 변경 미실행 경계를 고정 |
| 20 | v3.9.0 (20) stabilization and release readiness | P0 | 보강 완료/current test pending | AGENTS 네 테스트 영역 판정과 release close-out evidence를 실제 실행/미실행으로 분리하고 Development 15~18 및 Review2-35 truthfulness verifier를 companion gate에 포함. current final close-out은 clean worktree에서 안정화→current feature gate→30분→exact 424 Policy v4 UI→AGENTS 7.6.2 120분 판정/조건부 실행→cleanup/final integrity 순서로 실행 대기 |
| 21 | v3.9.0 (21) actual test acceptance bundle 실행 모드 | P0 | historical PASS/current 재실행 대기 | V390-ADD1-06 historical actual mode는 build→기능→real 30분→UI automation/replay→conditional 120 decision→cleanup을 PASS했습니다. Current actual preflight는 clean worktree와 loopback UI server, role state, log, PID/HTTP·RTSP port, contained temp root를 요구합니다. 120분은 AGENTS 7.6.2 scope trigger와 실행 승인이 함께 있을 때만 `--run-120`으로 선택하며 flag-only는 거부합니다 |
| 22 | v3.9.0 (22) v3.9 UI automation case completeness | P0 | 완료 | V390-ADD1-07 case schema v2와 actual summary가 `UI-112` 포함 exact `UI-108`~`UI-115` 8개 route/control/action/state/failure/artifact를 검증하고 replay PASS |
| 23 | v3.9.0 (23) native free UI automation adapter proof | P0 | 완료 | bundled Playwright 1.61.1과 system Chrome을 선택해 standalone 7개 native action 및 UI-108~115의 native dispatch 8/8을 fallback 없이 실행하고 module/browser provenance를 보존 |
| 24 | v3.9.0 (24) server longrun true first-fail case runner | P0 | 완료 | V390-ADD1-10이 `verify-predev --fail-fast`의 duration case 사이를 즉시 중단하고 later case를 `not-run`으로 기록하며 runner console/summary/report에 context, 분리 stderr tail, 재현 명령을 보존 |
| 25 | v3.9.0 (25) route/control/action automation coverage matrix | P0 | historical source claim / REVIEW4-56~60 대기 | 986개 inventory와 exact `manualUiCaseId` 424개 선택 수치는 유지하지만, 기존 423+negative 1 readiness는 기능별 workflow·canonical schema·primary action oracle·visual matrix·Policy 독립성 완료 근거가 아닙니다. REVIEW4-56~60이 current workflow readiness를 다시 닫습니다 |
| 26 | v3.9.0 (26) final evidence re-run and cleanup | P0 | current 재실행 대기 | Evidence 14의 source `8fe583d8`·26-command·30분 118/0·UI 8/8·cleanup/integrity PASS는 historical evidence로 보존합니다. Current 986 inventory source에 대한 안정화, 실제 30분, exact 424 Policy v4 UI, AGENTS 7.6.2 판정상 필요한 120분, PID/port/artifact cleanup과 final integrity canonical 재실행은 미실행입니다 |
| 27 | v3.9.0 (27) deferred product decision owner sign-off | P1 | decision record | `decision-record`로 역할 기반 owner와 excluded/deferred 결정을 기록합니다. implementation은 `not-executed`이며 개인 이름, 실제 구현, field/release PASS를 주장하지 않습니다 |
| 28 | v3.9.0 (28) structure stabilization implementation readiness | P1 | historical readiness / REVIEW4-51 superseded | 당시 `gate-ready`는 dependency/contract/slice gate 정의만 뜻했습니다. 최신 결정은 50~63 완료 뒤 current `v3.9.0`에서 REVIEW4-64를 실행하는 것이며 implementation은 아직 `not-executed`입니다 |
| 29 | v3.9.0 (29) real external field smoke gate | P2 | 조건부 미실행 | TURN/WHEP, ONVIF 실기기, 외부 VLM/provider는 조건 부재로 `conditional-not-run`입니다. external contact 0, field/release claim false이며 실행 완료/PASS가 아닙니다 |

### v3.9.0 (17) Evidence/Closure 13~18 개발 기록

| 번호 | 구간 | 제목 | 우선순위 | 상태 | 구현/검증 위치 |
| --- | --- | --- | --- | --- | --- |
| 13 | Evidence | 최종 evidence 무결성 | P0 | 완료/커밋 `b6cac906` | `verify_v390_ui_automation.mjs`, `verify_v390_server_longrun.mjs`, `verify_v390_test_acceptance_bundle.mjs`, `verify-v390-final-evidence-integrity`에서 screenshot dedupe, video placeholder 금지, 실측 cleanup, source commit/command/first-failure 기록을 구현·검증. RED 3종과 actual UI 최초 환경 실패/재실행 8/8 이력을 `release-test-records.md`에 기록 |
| 14 | Evidence | 최종 전체 재실행·정리 | P0 | historical PASS/current 32-command 재실행 대기 | source `8fe583d8`의 974개/26-command 전체 재실행은 historical evidence입니다. Development 15~18 및 Review2-21/35 이후 current 986개/32-command source의 안정화·30분·120분·UI·cleanup은 미실행입니다 |
| 15 | Feature Closure | VLM incident-to-rule provenance | P1 | 완료/커밋 `260cbd9e` | `UI-110`/`RULE-112`/`LAB-126`/`SAFE-213`/`OPS-180`: event·candidate·evaluation source를 generated rule의 optional `vlmProvenance`와 `/lab/analysis/rules/{id}` save/readback까지 보존하고 ID/route mismatch는 no-write로 거부합니다. 실제 HTTP save/readback 1건과 negative no-write 2건, `/ops/rules` 인앱 focused smoke, rule/VA 회귀를 통과했습니다 |
| 16 | Product Decision | 보류 기능 소유자 승인 | P1 | decision record/커밋 `7a100f8f` | `decision-record`, implementation `not-executed`, decision-only evidence로 5개 owner 결정을 고정합니다 |
| 17 | Stabilization | 구조 안정화 착수 조건 | P1 | gate 준비/커밋 `fcfe9f0d` | `gate-ready`, implementation `not-executed`로 module graph/contract/slice gate를 고정합니다. branch/refactor는 미실행입니다 |
| 18 | Field Smoke | 외부 환경 검증 | P2 | 조건부 미실행/커밋 `6575e3b9` | 세 외부 target을 `conditional-not-run`으로 기록하고 external contact/field/release PASS claim 0을 검증합니다 |

완료 경계: Evidence 13의 contract PASS는 실제 30분/UI 자동화 재실행 evidence가 아닙니다.
Evidence 14는 실제 30분과 UI-108~115 자동화를 포함하지만 exact 424개 UI 풀테스트,
조건 미충족 120분, published metadata, release action PASS로 승격하지 않습니다.

완료 경계: v3.9 source baseline/inventory 준비는 실제 기능 개발, discovery 완료,
UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action evidence가
아닙니다. `v3.9.0` publish 완료는 tag, GitHub Release, published metadata 검증 evidence가
있을 때만 완료로 기록합니다. 현재 latest published release는 `v3.8.0`입니다.

## v3.9.0 (13) 추가 로드맵 (1)

이 섹션은 2026-07-10 요청으로 승인된 추가 로드맵의 source 개발 상태를 기록합니다.
각 단계의 `완료`는 해당 구현과 단계별 local verifier 통과만 뜻하며, UI 풀테스트,
30분/120분 장시간 실행, published metadata, release action 완료를 뜻하지 않습니다.
단계는 아래 순서대로만 진행합니다.

| 번호 | ID | 구간 | 제목 | 우선순위 | 상태 | 완료 조건 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | V390-ADD1-01 | Foundation | 미추적 파일 정리 | P0 | 완료 | 삭제 이력이 있는 미추적 파일 30개를 현재 참조·삭제 의도·blob 이력과 대조하고 복구 0, 삭제 30, 별도 보존 0으로 확정한 뒤 worktree에서 제거 |
| 2 | V390-ADD1-02 | Feature Closure | 전체 기능 인벤토리 확정 | P0 | 완료 | 974개 기능 행을 exact manifest로 실제 route/UI control/state/verifier와 1:1 대조하고 stale TODO/오류 문구 제거, negative fixture와 local gate 통과 |
| 3 | V390-ADD1-03 | Product Correctness | VLM 승격 신뢰 경계 | P0 | 완료 | 클라이언트 result/status 선언을 제거하고 shared server catalog가 후보 ID/revision/digest, 평가 결과/provenance, option/model/prompt binding을 검증·canonicalize한 뒤 저장하며 reload 불일치 profile을 quarantine |
| 4 | V390-ADD1-04 | Product Correctness | Re-ID 준비 상태 정합성 | P0 | 완료 | extractor factory와 Ops API가 공용 server-owned readiness를 사용해 regular file, SHA 형식·읽기·일치, trim provenance, OpenSSL·ONNX Runtime을 검사하고 preflight/session-load/execution을 분리 |
| 5 | V390-ADD1-05 | Product Correctness | ONVIF 저장 원자성 | P0 | 완료 | ONVIF form save/toggle의 source/view 연속 PUT을 single-lock paired route로 교체하고 두 번째 파일 실패 시 실제 교체된 파일을 pre-transaction snapshot으로 rollback |
| 6 | V390-ADD1-06 | Test Foundation | 실제 acceptance bundle | P0 | 완료 | dry-run 강제를 해제하고 build→현재 기능 gate→실제 30분→실제 UI automation→조건부 120분을 stop-on-first-fail 단일 진입점으로 실행하며 summary/report/cleanup을 보존 |
| 7 | V390-ADD1-07 | UI Test | UI 케이스 누락 보완 | P0 | 완료 | `UI-112`를 포함한 `UI-108`~`UI-115` 전 case의 실제 route/control/action/state/failure/artifact evidence를 검증 |
| 8 | V390-ADD1-08 | UI Test | 무료 네이티브 자동화 어댑터 | P0 | 완료 | bundled Playwright와 설치된 Chrome을 사용하는 독립 adapter가 실제 wait/click/fill/type/select/screenshot을 실행하고 UI 8-case도 `playwright-native` dispatch/provenance/fallback false로 검증 |
| 9 | V390-ADD1-09 | UI Test | 거짓 PASS 방지 | P0 | 완료 | case schema v3 exact-selector `visibleAssertions`와 trusted native action 뒤 computed visibility/visible innerText만 판정하며 source/script/outerHTML/whole-page marker PASS를 negative contract로 거부 |
| 10 | V390-ADD1-10 | Test Foundation | Longrun first-fail 진단 실행기 | P0 | 완료 | delegated duration case의 첫 실패 직후 후속 case를 실행하지 않고 `not-run`으로 남기며 console/summary/report에 context, 분리 stderr, 재현 명령을 출력 |
| 11 | V390-ADD1-11 | UI Test | route/control/action 자동화 coverage matrix | P0 | 완료/exact-ID 보정 | exact UI test ID 424개를 featureId/route/control-action/stability verifier/automation caseId에 직접 연결하고 prefix/range 판정 제거, cross-prefix 누락·중복·route/action drift·artifact 누락을 FAIL 처리 |
| 12 | V390-ADD1-12 | Test Policy | Policy v4 테스트 정책 전환 | P0 | 완료 | native visible-DOM 자동화가 exact case 단위로 direct evidence를 대체할 수 있는 동등성 조건과 전체 UI 풀테스트 PASS 경계를 Policy v4 fixture/evaluator/negative contract로 기계 검증하고, 현재 legacy 8/424 부분 자동화는 ineligible/FAIL로 유지 |

### V390-ADD1-12 Policy v4 테스트 정책 전환 — 실행 전 등록

구현 계획 source-of-truth는
`docs/superpowers/plans/2026-07-10-v390-test-policy-v4.md`입니다. Policy v4는
안정화/30분/120분/UI 네 테스트 영역을 유지하고, UI 영역 안에서만
`direct-browser`, `qualified-native-automation`, `hybrid` evidence mode를 구분합니다.
자동화 대체는 exact case 단위이며, suite PASS는 424개 exact UI test ID와
시각/반응형/role/security 교차 항목 전수가 닫힌 경우에만 허용합니다.

테스트 필요성 판정:

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | AGENTS/manual UI/release policy, policy fixture/evaluator/contract, dispatch/docs/inventory를 직접 변경 | `V390-ADD1-12`, `OPS-169`, `SAFE-202` | 최신 `/goal`의 12번 개발 승인 |
| 30분 테스트 | 미진행 | test policy와 evidence 판정만 변경하고 media/session/runtime path를 변경하지 않음 | AGENTS 7.6.2, `V390-ADD1-12` 변경 범위 | duration 실행 승인 없음 |
| 120분 테스트 | 미진행 | high-risk runtime/media trigger가 없고 명시 실행 지시도 없음 | AGENTS 7.6.2, `V390-ADD1-12` 변경 범위 | 조건·실행 승인 없음 |
| UI 풀테스트 | 미진행 | Policy v4 계약은 검증하지만 424개 전체 제품 UI를 새로 실행하는 요청은 아님 | exact UI test ID 424개, historical readiness claim 423+negative 1/unsupported 0, execution pass 0/not-run 424; REVIEW4-56~60 current closure 대기 | 전체 UI 실행 승인 없음 |

실행 전 개별 검증 항목은 policy schema/네 영역 고정/evidence mode, case 동등성 필수
필드, suite closure, current partial evidence 판정, forbidden fixture/static/screenshot-only
승격, 문서 정책 정렬, server dispatch, inventory/evidence 연결입니다.

### V390-ADD1-06 실제 acceptance bundle — 실행 전 등록

구현 계획 source-of-truth는
`docs/superpowers/plans/2026-07-10-v390-additional-roadmap-6-9.md`입니다. Step 6은
`scripts/internal/verify_v390_test_acceptance_bundle.mjs`의 non-dry mode가 기존 evidence를
읽기만 하지 않고 build, 현재 기능 gate, 실제 30분 server longrun, 실제 UI automation,
조건부 120분 판정, cleanup/report를 순서대로 직접 실행하는 것을 완료 조건으로 둡니다.

테스트 필요성 판정:

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | acceptance runner/contract/docs/inventory 변경 | `V390-ADD1-06`, `OPS-179`, `SAFE-212` | 최신 goal에서 6번 개발 승인 |
| 30분 테스트 | 진행 대상 | 사용자 제시 완료 조건이 build→기능→30분→UI 실제 실행을 명시 | `V390-ADD1-06`, R1 real-duration runner | 최신 goal에서 실제 acceptance 승인 |
| 120분 테스트 | 조건부 진행 | 사용자 문구가 조건부 120분이며 AGENTS 7.6.2 high-risk trigger 필요 | `V390-ADD1-06`, `SAFE-201` | 현재 trigger 없음; 새 signal 발생 시 실행 |
| UI 풀테스트 | 미진행 | bundle의 UI는 R2 actual automation이며 Codex 인앱 브라우저 전체 수동 UI와 구분 | `OPS-169`, `SAFE-202` | 직접 UI 풀테스트 승인 없음 |

Step 6 개별 검증 항목은 non-dry RED, actual-mode fixture pass/fail contract, build,
current feature command set, 실제 30분 summary, 실제 UI automation summary/replay,
conditional 120 decision, cleanup, docs/inventory/script gate, `git diff --check`입니다.

### V390-ADD1-06 실제 acceptance bundle — 개발 및 실행 결과

- `scripts/internal/verify_v390_test_acceptance_bundle.mjs`의 `runActualBundle`은
  preflight, build, 26개 current feature gate, real 30-minute server longrun,
  UI automation/replay, 120-minute decision/run, cleanup, report를 고정 순서로 직접
  실행합니다. 일반 단계는 첫 실패 뒤 `not-run`이고 cleanup/report는 항상 실행합니다.
- `scripts/internal/verify_v390_test_acceptance_bundle_contract.mjs`는 dry-run, actual
  fixture PASS, first-failure later `not-run`, explicit 120, cleanup failure를 검증합니다.
- `scripts/internal/verify_predev_stability.sh --fail-fast`와
  `scripts/internal/verify_v390_server_longrun.mjs` 연결은 하위 integrated smoke 실패 뒤
  soak/queue 일반 검증을 계속하지 않고 cleanup/report만 수행합니다.
- v3.9 단계 verifier 다섯 곳과 Step 20 verifier는 command 문자열 하드코딩 대신
  `verify_feature_inventory_coverage.mjs`의 exact implementation manifest gate를 확인합니다.
- 최종 증적은 `docs/release-artifacts/v3.9.0/test-acceptance-final/summary.json`과
  `report.md`, `runs/v390-test-acceptance-20260710083909-44592/`에 보존했습니다.
  최종 단일 run은 build/feature gates, real 30-minute `118 pass / 0 fail`, UI automation
  `7 pass / 0 fail`, replay, cleanup을 통과했습니다. 120분은 trigger가 없어
  `conditional-not-run`이며 PASS로 계산하지 않았습니다.
- 최종 summary의 `knownUiClosureBlockers`는 `UI-112` 누락, Chrome CDP fallback,
  whole-page marker 판정을 후속 7~9번 범위로 명시합니다. 따라서 Step 6의 자동
  acceptance 실행은 완료지만 UI 직접 조작 풀테스트 완료를 뜻하지 않습니다.

실패 후 수정 이력:

| 순서 | 실패 | 수정 | 재검증 |
| --- | --- | --- | --- |
| 1 | non-dry 구현 전 명령이 dry-run만 허용 | actual stage orchestrator와 summary validator 구현 | contract 6/0 |
| 2 | 기존 Step 20/11 verifier가 data-driven coverage verifier에 자기 command 문자열을 요구 | exact implementation manifest gate 확인으로 정렬 | 관련 v3.9 verifier PASS |
| 3 | 통합 smoke code-comment policy에서 신규 VLM header 용도 주석과 영문 주석 1개 실패 | 한글 파일 용도/설명 주석 추가 | `verify-code-comments` missing 0, english-only 0 |
| 4 | 하위 integrated smoke 실패 뒤 soak가 계속됨 | `verify-predev --fail-fast` 추가 및 longrun 연결 | longrun/acceptance contract PASS |
| 5 | 첫 actual UI run에서 UI-109의 과거 `compensating-rollback` marker 불일치 | 현재 표시 rollback model 문구로 fixture 정렬 | standalone UI 7/0, 최종 bundle UI 7/0 |

테스트 사용량: token start `0`, token end `901969`, token consumed `901969`,
elapsed 약 `6636초`, source `Codex goal usage`.

### V390-ADD1-07 UI 케이스 누락 보완 — 실행 전 등록

Step 7은 `test/fixtures/v390_ui_automation_cases.json`을 exact `UI-108`~`UI-115`
8개 집합으로 고정하고, 각 case가 manifest와 같은 route, 실제 refresh/inspect control,
action 전후 state, failure reason, screenshot/trace/console/server-log artifact를 기록하는지
runner/report/contract에서 검증합니다. 이 단계의 DOM action은 현재 adapter를 통해 실행하되,
native wait/click/type/select adapter 승격은 Step 8, whole-page marker 제거는 Step 9 범위입니다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | case manifest/runner/report/contract/docs 변경 | `V390-ADD1-07`, `UI-108`~`UI-115` | 최신 goal에서 7번 개발 승인 |
| 30분 테스트 | 미진행 | UI case coverage/evidence schema만 변경하고 runtime/media lifecycle은 변경하지 않음 | Step 7 변경 범위 | Step 6 final real 30분과 분리 |
| 120분 테스트 | 미진행 | AGENTS 7.6.2 trigger 없음 | Step 7 변경 범위 | 조건 미충족 |
| UI 풀테스트 | 미진행 | 8-case actual automation은 실행하지만 Codex 인앱 전체 UI 직접 조작 풀테스트와 구분 | `UI-108`~`UI-115` | 직접 UI 풀테스트 승인 없음 |

### V390-ADD1-07 UI 케이스 누락 보완 — 개발 및 실행 결과

- `test/fixtures/v390_ui_automation_cases.json`을
  `media-server.v390-ui-automation-cases.v2`로 올리고 exact ordered ID를
  `UI-108`~`UI-115` 8개로 고정했습니다. `UI-112` staging restore validation handoff를
  `/ops/sources`의 refresh, checklist, result artifact 상태와 함께 추가했습니다.
- UI-113~UI-115 route를 exact implementation manifest와 같은 `/ops/dashboard`로
  수정했습니다. UI-108/109는 채널 추가→ONVIF select→refresh, UI-110/111은 해당
  refresh control, UI-112는 source refresh, UI-113~115는 dashboard refresh를 실행합니다.
- `scripts/internal/verify_v390_ui_automation.mjs`는 case ID/route를 974행 implementation
  manifest와 대조하고 setup/primary interaction, target, before/after state,
  `failureEvidence`, screenshot/trace/video/console/server-log를 summary에 기록합니다.
- `scripts/internal/verify_v390_ui_automation_report.mjs`는 v2 summary의 exact 8-case,
  action 실행, visible target, non-empty state, failure reason, artifact를 replay합니다.
  `scripts/internal/verify_v390_ui_automation_runner_contract.mjs`는 UI-112 누락과
  UI-113 wrong route negative manifest를 반드시 거부합니다.
- 실제 실행 `docs/release-artifacts/v3.9.0/ui-automation-case-completeness-final/summary.json`은
  `caseCount=8`, `pass=8`, `fail=0`, `notRun=0`; replay는 `pass=7 fail=0`입니다.
  이 실행은 DOM-dispatch interaction evidence이며 native adapter 승격은 Step 8에서,
  whole-page marker 제거는 Step 9에서 닫습니다.

실패 후 수정 이력:

| 순서 | 실패 | 수정 | 재검증 |
| --- | --- | --- | --- |
| 1 | exact ID RED가 `false`로 종료: UI-112 누락 | UI-112와 exact 8-case/route manifest gate 추가 | contract exact set PASS |
| 2 | 첫 actual run UI-108 target hidden, 뒤 7 case not-run | 채널 추가와 ONVIF select setup action 추가 | failure evidence에 hidden target 보존 |
| 3 | setup click 직후 비동기 form reset 전에 select 실행되어 다시 hidden | setup interaction을 순차 await하도록 수정 | actual 8/0, replay 7/0 |

테스트 사용량: token start `901969`, token end `1080515`, token consumed `178546`,
elapsed 약 `547초`, source `Codex goal usage`.

### V390-ADD1-08 무료 네이티브 자동화 어댑터 — 실행 전 등록

Step 8은 `browserMode=playwright`라는 label과 실제 native engine을 분리합니다. 저장소
의존성 설치 없이 explicit env, workspace dependency, 현재 Node runtime 인접 bundled
module 순서로 Playwright를 찾고, 찾지 못하면 Chrome/CDP fallback을 primary PASS로 쓰지
않고 native preflight FAIL을 반환합니다. 독립 adapter는 wait, click, fill/type, select,
screenshot과 console/provenance를 제공하고 standalone reproduction이 실제 동작을 수행해야
합니다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | native adapter/module resolver/runner/dispatch/docs 추가 | `V390-ADD1-08`, `OPS-169`, `SAFE-202` | 최신 goal에서 8번 개발 승인 |
| 30분 테스트 | 미진행 | UI automation adapter만 변경하고 server runtime/media lifecycle은 변경하지 않음 | Step 8 변경 범위 | 장시간 trigger 없음 |
| 120분 테스트 | 미진행 | AGENTS 7.6.2 trigger 없음 | Step 8 변경 범위 | 조건 미충족 |
| UI 풀테스트 | 미진행 | native adapter actual 8-case는 실행하지만 Codex 인앱 전체 UI 직접 조작과 구분 | `UI-108`~`UI-115` | 직접 UI 풀테스트 승인 없음 |

### V390-ADD1-08 무료 네이티브 자동화 어댑터 — 개발 및 실행 결과

- `scripts/internal/v390_ui_native_adapter.mjs`가 explicit module/env/workspace/Node 인접/Codex bundled Playwright를 탐색하고 module realpath/version, system Chrome executable, capability를 기록합니다. Playwright 전용 browser가 없어도 설치된 Chrome을 `executablePath`로 직접 실행하며 CDP fallback은 사용하지 않습니다.
- `scripts/internal/verify_v390_ui_native_adapter.mjs`가 독립 로컬 페이지에서 wait, fill, type, select, click, state wait, screenshot을 실제 수행하고 `media-server.v390-ui-native-adapter.v1` summary/trace/report/PNG를 생성합니다.
- `scripts/internal/verify_v390_ui_automation.mjs`의 UI-108~115 setup/primary 동작을 page-context `element.click()`/event dispatch가 아니라 Playwright locator의 `waitFor`, `click`, `selectOption`으로 실행하며 각 trace에 `dispatch=playwright-native`를 기록합니다.
- `scripts/internal/verify_v390_ui_native_adapter_contract.mjs`와 `server.sh` dispatch가 module provenance, missing explicit module hard fail, capability, runner 연결, 문서/evidence와 preserved standalone PASS를 재현합니다.

실행 결과:

| 항목 | 명령/결과 | 판정 |
| --- | --- | --- |
| RED | Step 7 actual summary의 `selectedAdapter.engine=chrome-cdp-fallback`, `fallbackUsed=true`라 native 조건 `jq -e`가 false/exit 1 | 예상 실패 |
| 첫 standalone | bundled Playwright 1.61.1은 발견했으나 Playwright-managed Chromium 미설치로 launch FAIL | 수정 후 재실행 |
| standalone final | `./server.sh verify-v390-ui-native-adapter --output-dir docs/release-artifacts/v3.9.0/ui-native-adapter-final`: system Chrome, `engine=playwright-native`, fallback false, action 7/7, final state `native-adapter:ready:typed` | PASS |
| native UI 8-case final | `./server.sh verify-v390-ui-automation --browser-mode playwright --output-dir docs/release-artifacts/v3.9.0/ui-automation-native-final`: UI-108~115 8/8, setup/primary dispatch 전부 `playwright-native`, cleanup true | PASS |
| replay/contract | actual report replay 7/0, native adapter contract 7/0, runner contract 8/0 | PASS |
| UI 풀테스트 | Codex 인앱 전체 UI 직접 조작 풀테스트는 실행하지 않음 | 미실행 |

첫 실패는 native browser 탐색이 기존 CDP fallback permission helper에 묶여 system Chrome을
선택하지 못한 것이 원인이었습니다. native adapter 전용 executable resolver를 추가해 외부
다운로드 없이 해결했습니다. Step 9의 whole-page marker 제거는 아직 이 단계의 PASS에
포함하지 않습니다.

테스트 사용량: token start `1080515`, token end `1301950`, token consumed `221435`,
elapsed 약 `902초`, source `Codex goal usage`.

### V390-ADD1-09 거짓 PASS 방지 — 실행 전 등록

Step 9은 case manifest를 exact selector별 visible assertion schema로 바꾸고, runner가
`document.body.innerText`, `document.documentElement.outerHTML`, script/source marker를
성공 근거로 읽지 못하게 합니다. 실제 native action 뒤 exact state element가 존재하고
computed visible이며, 그 element의 visible `innerText`가 명시된 값을 포함할 때만 PASS입니다.
UI-113의 `defer-all-action-writes`처럼 source에는 있지만 실제 표시 텍스트에는 없는 값은
negative fixture에서 반드시 FAIL해야 합니다.

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | case schema/runner/report/negative contract/docs 변경 | `V390-ADD1-09`, `UI-108`~`UI-115`, `OPS-169`, `SAFE-202` | 최신 goal에서 9번 개발 승인 |
| 30분 테스트 | 미진행 | assertion/evidence 로직만 변경하며 server runtime/media lifecycle은 변경하지 않음 | Step 9 변경 범위 | 장시간 trigger 없음; 6~9 통합 후 별도 판정 |
| 120분 테스트 | 미진행 | AGENTS 7.6.2 high-risk trigger 없음 | Step 9 변경 범위 | 조건 미충족 |
| UI 풀테스트 | 미진행 | native 8-case visible assertion은 실행하지만 Codex 인앱 전체 UI 직접 조작과 구분 | `UI-108`~`UI-115` | 직접 UI 풀테스트 승인 없음 |

RED: runner source 검사에서 `document.documentElement.outerHTML`,
`document.body.innerText`, `expectedMarkers`가 모두 발견돼 exit 1로 실패했습니다. 또한
UI-113 actual visible state는 `all-action-writes-deferred`지만 기존 expected marker
`defer-all-action-writes`가 source/script 문자열만으로 통과한 것을 보존 summary로
재현했습니다.

### V390-ADD1-09 거짓 PASS 방지 — 개발 및 실행 결과

- `test/fixtures/v390_ui_automation_cases.json`을 schema v3로 올리고 각 `stateSelectors`와 exact 일치하는 `visibleAssertions`를 정의했습니다. UI-113은 source-only `defer-all-action-writes`가 아니라 실제 표시값 `all-action-writes-deferred`를 검증합니다.
- `scripts/internal/v390_visible_dom_assertions.mjs`가 exact selector snapshot의 `exists`, computed `visible`, visible `innerText`, `textIncludes`만 평가하고 `sourceBoundary=exact-selector-visible-innerText-only` evidence를 생성합니다.
- `scripts/internal/verify_v390_ui_automation.mjs`가 `document.body.innerText`, `outerHTML`, source marker, DOM-dispatch action을 제거했습니다. trusted adapter action이 없으면 FAIL하고, native action 뒤 selector별 snapshot을 Node-side evaluator에서 판정합니다.
- report/runner/native adapter/acceptance contract가 schema v3, `assertionModel=visible-dom-user-action-v1`, 모든 assertion PASS/visibility/source boundary와 fallback false를 replay합니다.
- acceptance dry-run의 stale 7-case preserved path를 `ui-automation-visible-dom-final`로 교체하고 acceptance/longrun contract fixture가 예외 종료에도 `/tmp` 산출물을 자동 제거하도록 process-exit cleanup을 추가했습니다.

실행 결과:

| 항목 | 결과 | 판정 |
| --- | --- | --- |
| source/hidden negative | whole-page/source assertion forbidden 4종 부재, script-only `defer-all-action-writes`와 hidden text FAIL, exact visible text PASS | PASS, contract 9/0 |
| visible DOM UI final | `docs/release-artifacts/v3.9.0/ui-automation-visible-dom-final`: UI-108~115 8/8, native dispatch, fallback false, 모든 assertion visible/missing 0 | PASS |
| visible DOM replay | schema v3/exact route/action/assertion/failure/artifact/cleanup | PASS 7/0 |
| acceptance first run | local HTTP H264/AAC `/opus` ffprobe 20초 timeout 1건으로 longrun FAIL; UI/replay/120 not-run, cleanup/report PASS | FAIL, 재시도 |
| acceptance retry final | run `v390-test-acceptance-20260710100233-58896`: build, 26 feature gates, 실제 30분 predev 118/0/2와 soak 22회, UI 8/8, replay 7/0, cleanup PASS | PASS |
| 120분 | runtime/media high-risk trigger 없음, decision `not-required`, pass substitution false | 조건부 미실행 |
| UI 풀테스트 | native exact-selector 자동 UI는 실행했지만 Codex 인앱 전체 UI 직접 조작은 실행하지 않음 | 미실행 |

첫 acceptance 실패는 같은 source의 `/default`, `/h264`, WebRTC와 다음 video-only case는
통과하고 `/opus` ffprobe만 timeout난 일시적 readiness 실패였습니다. 코드/timeout을
완화하지 않고 clean 재시도했으며 동일 `/opus` 경로와 전체 30분이 통과했습니다. 실패
run 608KB, 통합 로그 260KB, predev/contract fixture temp를 삭제했고 최종 acceptance
1.4MB와 visible-DOM UI 608KB만 보존했습니다.

테스트 사용량: token start `1301950`, token end `1902440`, token consumed `600490`,
elapsed 약 `4133초`, source `Codex goal usage`.

### V390-ADD1-01 미추적 파일 전수 판정

공통 판정 기준은 현재 tracked 참조, 삭제 커밋의 의도, 현재 blob과 삭제 직전 blob,
대체 route/verifier, Git history 보존 여부입니다. 아래 30개 외 ignored runtime/build
경로는 이번 단계에서 삭제하지 않았습니다.

| 경로 | 삭제 이력/현재 상태 | 판정 | 근거 |
| --- | --- | --- | --- |
| `docs/assets/diagrams/README.md` | `af15be8a`에서 placeholder 삭제, 삭제 직전 blob과 동일 | 삭제 | 현재 tracked 참조 0, 예정 이미지 placeholder는 Git history에 보존 |
| `docs/assets/ui/analysis-developer-url.png` | `8147b0c6`에서 legacy Lab 자산 퇴역, 삭제 직전보다 오래된 blob | 삭제 | 현재 tracked 참조 0, 현재 문서 자산 manifest 비대상 |
| `docs/assets/ui/analysis-preview.png` | `8147b0c6`에서 legacy Lab 자산 퇴역, 삭제 직전보다 오래된 blob | 삭제 | 현재 tracked 참조 0, 현재 문서 자산 manifest 비대상 |
| `docs/assets/ui/analysis-region-canvas.png` | `8147b0c6`에서 legacy Lab 자산 퇴역, 삭제 직전보다 오래된 blob | 삭제 | 현재 tracked 참조 0, 현재 문서 자산 manifest 비대상 |
| `docs/assets/ui/analysis-rule-editor-basic.png` | `8147b0c6`에서 legacy Lab 자산 퇴역, 삭제 직전보다 오래된 blob | 삭제 | 현재 tracked 참조 0, 제품 룰 UI는 `/ops/rules` |
| `docs/assets/ui/analysis-rule-editor-scenario.png` | `8147b0c6`에서 legacy Lab 자산 퇴역, 삭제 직전보다 오래된 blob | 삭제 | 현재 tracked 참조 0, 제품 룰 UI는 `/ops/rules` |
| `docs/assets/ui/analysis-rule-list.png` | `8147b0c6`에서 legacy Lab 자산 퇴역, 삭제 직전보다 오래된 blob | 삭제 | 현재 tracked 참조 0, 제품 룰 UI는 `/ops/rules` |
| `docs/assets/ui/analysis-runtime-dashboard-metadata.png` | `8147b0c6`에서 legacy Lab 자산 퇴역, 삭제 직전보다 오래된 blob | 삭제 | 현재 tracked 참조 0, 현재 문서 자산 manifest 비대상 |
| `docs/assets/ui/analysis-runtime-dashboard-records-issues.png` | `8147b0c6`에서 legacy Lab 자산 퇴역, 삭제 직전보다 오래된 blob | 삭제 | 현재 tracked 참조 0, 현재 문서 자산 manifest 비대상 |
| `docs/assets/ui/analysis-runtime-dashboard-records.png` | `8147b0c6`에서 legacy Lab 자산 퇴역, 삭제 직전보다 오래된 blob | 삭제 | 현재 tracked 참조 0, 현재 문서 자산 manifest 비대상 |
| `docs/assets/ui/analysis-runtime-dashboard-runtime.png` | `8147b0c6`에서 legacy Lab 자산 퇴역, 삭제 직전보다 오래된 blob | 삭제 | 현재 tracked 참조 0, 현재 문서 자산 manifest 비대상 |
| `docs/assets/ui/analysis-runtime-dashboard-scenarios.png` | `8147b0c6`에서 legacy Lab 자산 퇴역, 삭제 직전보다 오래된 blob | 삭제 | 현재 tracked 참조 0, 현재 문서 자산 manifest 비대상 |
| `docs/assets/ui/analysis-runtime-dashboard-tracking-issues.png` | `8147b0c6`에서 legacy Lab 자산 퇴역, 삭제 직전보다 오래된 blob | 삭제 | 현재 tracked 참조 0, 현재 문서 자산 manifest 비대상 |
| `docs/assets/ui/analysis-runtime-dashboard-tracks.png` | `8147b0c6`에서 legacy Lab 자산 퇴역, 삭제 직전보다 오래된 blob | 삭제 | 현재 tracked 참조 0, 현재 문서 자산 manifest 비대상 |
| `docs/assets/ui/analysis-runtime-dashboard-trend.png` | `8147b0c6`에서 legacy Lab 자산 퇴역, 삭제 직전보다 오래된 blob | 삭제 | 현재 tracked 참조 0, 현재 문서 자산 manifest 비대상 |
| `docs/assets/ui/analysis-runtime-dashboard.png` | `8147b0c6`에서 legacy Lab 자산 퇴역, 삭제 직전보다 오래된 blob | 삭제 | 현재 tracked 참조 0, 현재 문서 자산 manifest 비대상 |
| `docs/history/development-history.md` | `e351db0f`에서 backlog로 통합, 삭제 직전보다 오래된 구본 | 삭제 | 현재 tracked 참조 0, 후속 기록이 누락된 중복 history |
| `docs/history/verification-history.md` | `e351db0f`에서 backlog로 통합, 삭제 직전보다 오래된 구본 | 삭제 | 현재 tracked 참조 0, 후속 정정·검증 기록이 누락된 중복 history |
| `docs/manual-ui-result-2026-05-25-ui-fulltest-restart.md` | `bb7db525`에서 release ledger로 통합, 삭제 직전 blob과 동일 | 삭제 | 원문은 Git history, 요약은 release evidence/test records에 보존; verifier 참조는 존재 금지가 아니라 하드코딩 금지 검사 |
| `include/ingress/lab_import_manager.h` | `a74d9b81`에서 legacy `/lab/import` manager 제거, 삭제 직전 blob과 동일 | 삭제 | CMake/current code 참조 0, 제품 import 경계는 `/ops/sources` |
| `scripts/internal/auto_start_server.sh` | `1379aa31`에서 중복 lifecycle helper 제거, 삭제 직전 blob과 동일 | 삭제 | dispatch/current tracked 참조 0, `server.sh` lifecycle 명령이 대체 |
| `scripts/internal/browser_webrtc_publish_consume_check.mjs` | `ee36c323`에서 legacy browser harness 제거, 삭제 직전보다 오래된 active 구본 | 삭제 | current tracked 참조 0, `/client/live`와 current verifier가 대체 |
| `scripts/internal/rule_ui_smoke_check.mjs` | `a74d9b81`에서 `/lab/rules` smoke 제거, 삭제 직전보다 오래된 구본 | 삭제 | 미추적 wrapper 외 참조 0, Ops native rule verifier가 대체 |
| `scripts/internal/verify_lab_import_ui.sh` | `a74d9b81`에서 `/lab/import` UI verifier 제거, 삭제 직전 blob과 동일 | 삭제 | dispatch/current tracked 참조 0, `/ops/sources`가 제품 UI |
| `scripts/internal/verify_lab_layout.mjs` | `a74d9b81`에서 legacy Lab layout verifier 제거, 삭제 직전 blob과 동일 | 삭제 | dispatch/current tracked 참조 0, `/ops`·`/client` UI verifier가 대체 |
| `scripts/internal/verify_manual_ui_evidence_runner.mjs` | `ec511cdc`에서 오판 가능 runner 제거, 삭제 직전보다 오래된 구본 | 삭제 | current inventory와 고정 count 불일치, manual UI/v3.9 automation 기준이 대체 |
| `scripts/internal/verify_multichannel_webrtc.sh` | `ee36c323`에서 legacy `/webrtc/test` multichannel verifier 제거, 삭제 직전보다 오래된 구본 | 삭제 | 미추적 browser harness 외 참조 0, client workspace/tile verifier가 대체 |
| `scripts/internal/verify_rule_ui_smoke.sh` | `a74d9b81`에서 `/lab/rules` wrapper 제거, 삭제 직전 blob과 동일 | 삭제 | 미추적 구형 script 외 참조 0, `verify_ops_rules_embed_smoke.mjs`가 대체 |
| `scripts/internal/verify_webrtc_va_metadata_sync.mjs` | `a74d9b81`에서 Lab viewer 기반 verifier 통합 제거, 삭제 직전 blob과 동일 | 삭제 | dispatch/current tracked 참조 0, `verify_webrtc_va_metadata.mjs`가 대체 |
| `src/ingress/lab_import_manager.cpp` | `a74d9b81`에서 legacy `/lab/import` manager 제거, 삭제 직전 blob과 동일 | 삭제 | CMake/current code 참조 0, 제품 import 경계는 `/ops/sources` |

V390-ADD1-01 직접 결과:

- 복구: 0개
- 삭제: 30개, 총 약 4.2 MiB
- 별도 보존: 0개. 필요한 과거 원문은 기존 Git object와 통합 ledger에서 조회 가능
- 범위 밖 미삭제: ignored runtime/build 산출물과 이번 30개에 포함되지 않은 경로
- 제품/API/UI/media 동작 변경: 없음

테스트 필요성 판정:

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | Foundation 정리 후 tracked 문서, 문서 자산, script dispatch/inventory와 diff 무결성 확인이 단계 완료 조건 | `V390-ADD1-01`, AGENTS 3.5/7.1 | 단계 범위에서 실행 |
| 30분 테스트 | 미진행 | 문서 기록과 삭제된 미추적 legacy 파일 정리는 runtime/media lifecycle을 변경하지 않음 | `V390-ADD1-01` 변경 범위 | 장시간 실행 승인 없음 |
| 120분 테스트 | 미진행 | AGENTS 7.6.2의 media/lifecycle/high-risk trigger 없음 | `V390-ADD1-01` 변경 범위 | 장시간 실행 승인 없음 |
| UI 풀테스트 | 미진행 | 제품 UI 동작/자산을 변경하지 않고 이미 퇴역한 미추적 자산만 제거 | `V390-ADD1-01` 변경 범위 | 직접 실행 승인 없음 |

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| 미추적 경로 잔존 확인 | `git ls-files --others --exclude-standard`: 대상 30개 제거 후 출력 0개 | pass | ignored runtime/build 경로는 명령 대상과 판정에서 제외 |
| 문서 diff 무결성 | `git diff --check`: exit 0 | pass | 실패 이력 없음 |
| 문서 링크 | `./server.sh verify-docs-links`: Markdown 141, local links 776, images 22, anchors 99, failures 0 | pass | 실패 이력 없음 |
| 문서 UI 자산 | `./server.sh verify-docs-ui-assets`: pass 10, fail 0 | pass | legacy `analysis-*` 자산이 current manifest 비대상임을 확인 |
| script inventory | `./server.sh verify-script-inventory`: pass 11, fail 0 | pass | 삭제된 미추적 legacy verifier가 dispatch/inventory 비대상임을 확인 |

테스트 사용량: token start `169879`, token end `174558`, token consumed `4679`,
elapsed 약 `3초`, source `Codex goal usage`.

### V390-ADD1-02 전체 기능 인벤토리 exact-ID closure

기존 `verify-feature-inventory-coverage`는 ID prefix 하나에 같은 prefix의 verifier family
전체를 붙이고 target 하나만 있어도 `covered`로 판정했습니다. 이 방식은 잘못된 route,
scope, action 의미, 삭제된 owner를 행별로 검출하지 못하므로 exact-ID manifest 기준으로
교체했습니다.

- `test/fixtures/project_feature_implementation_evidence.json`:
  `media-server.feature-implementation-evidence.v1` schema로 inventory 974개 ID 각각에
  section/surface, tracked source file+anchor, UI 필요/간접 또는 absence boundary 440행의
  screen route와 product UI file+anchor, verifier file+asserted anchor+direct/transitive
  dispatch command, UI 테스트 영역 424행의 동일한 `manualUiCaseId`, canonical v3.9
  30/120분 runner를 고정했습니다.
- `scripts/internal/feature_implementation_manifest_lib.mjs`:
  manifest explicit refresh와 read-only validation, tracked file/anchor, exact ID set/hash,
  UI screen route, verifier dispatch, longrun mapping을 검증합니다.
- `scripts/internal/verify_feature_implementation_evidence.mjs`와
  `./server.sh verify-feature-implementation-evidence`:
  기본 read-only validator와 missing/duplicate/wrong-section ID, source/UI/verifier
  file·anchor, screen route, dispatch, legacy longrun, inventory hash drift negative fixture를
  제공합니다. `--refresh-manifest`는 명시적 source 변경으로만 사용합니다.
- `scripts/internal/verify_feature_inventory_coverage.mjs`:
  prefix fan-out을 제거하고 exact manifest item에서 implementation/UI/verifier/longrun
  target을 구성합니다. UI target report의 `undefined` 출력도 제거했습니다.
- `scripts/internal/verify_project_feature_test_inventory.mjs`:
  누락돼 있던 J section과 completed exact-ID section을 요구하고 manifest 974행을 직접
  검증합니다.
- `docs/project-feature-test-inventory.md`:
  잘못된 `970개`를 `974개`로 정정하고 `UI-001`~`UI-115` 범위를 복원했습니다.
  27개 dashboard 행을 실제 `/ops/dashboard`로 정렬하고, `AUTH-029`/`AUTH-032` scope,
  `SRC-010`/`SRC-019` soft-disable 의미, `EVT-055` 확정 route, `MEDIA-014` TCP config,
  `LAB-079`~`LAB-082` stale 후보 문구를 실제 source/verifier에 맞게 수정했습니다.
  `Coverage Review To Do`는 974/974 exact-ID 완료 결과로 교체했습니다.
- manual UI 기준 3문서는 manifest의 UI 테스트 영역 424개 `manualUiCaseId`, screen route,
  product UI anchor를 exact 실행/결과 집합으로 사용하고 prefix/range delegation으로
  누락 ID를 대체하지 않게 정렬했습니다.

이번 단계는 source/UI/verifier anchor 대조 완료이며, 해당 974개 기능의 제품 실행,
UI 직접 조작, 30분/120분 장시간 PASS를 새로 만들었다는 뜻이 아닙니다.

테스트 필요성 판정:

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | inventory/manifest/parser/dispatch/docs를 직접 변경해 구조·negative fixture·문서 연결 검증 필요 | `V390-ADD1-02`, 974 manifest rows | 단계 범위에서 실행 |
| 30분 테스트 | 미진행 | 구현/runtime/media path는 변경하지 않고 mapping source만 exact-ID로 교체 | `V390-ADD1-02` 변경 파일 | 장시간 실행 승인 없음 |
| 120분 테스트 | 미진행 | AGENTS 7.6.2 media/lifecycle/high-risk trigger 없음 | `V390-ADD1-02` 변경 파일 | 장시간 실행 승인 없음 |
| UI 풀테스트 | 미진행 | manual case source를 확정했지만 제품 UI 동작은 변경하지 않음 | manifest UI anchor 440, manual case 424 | 직접 실행 승인 없음 |

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| implementation manifest refresh | `./server.sh verify-feature-implementation-evidence --refresh-manifest`: inventory/manifest/source/verifier 974, UI anchor 440, manual case 424, negative fixture 11/11 | pass | explicit source refresh 후 default read-only 검증과 분리 |
| implementation evidence read-only | `./server.sh verify-feature-implementation-evidence`: validationErrors 0, negative fixture 11/11 | pass | 실패 이력 없음 |
| feature coverage | `./server.sh verify-feature-inventory-coverage`: featureRows 974, covered 974, missing 0, pass 6/fail 0 | pass | 최초 UI absence boundary가 null UI evidence를 역참조해 TypeError fail; UI area 424/manual case와 UI anchor 440을 분리하고 처음부터 재실행 pass |
| project inventory | `./server.sh verify-project-inventory`: featureRows 974, summary/manifest/current rows/seed, pass 14/fail 0 | pass | 최초 exact-ID 문구 교체 뒤 기존 `inventory 단독으로 UI PASS 판정 불가` boundary 문구 guard fail; 문구 복원 후 처음부터 재실행 pass |
| manual UI evidence criteria | `./server.sh verify-manual-ui-evidence`: template/checklist 기준 pass 24/fail 0 | pass | 실제 UI 풀테스트 결과 입력 없음, UI 직접 조작 PASS 아님 |
| script inventory | `./server.sh verify-script-inventory`: pass 11/fail 0 | pass | 새 dispatch/helper 추적·참조 확인 |
| docs links | `./server.sh verify-docs-links`: Markdown 141, links 776, images 22, anchors 99, failures 0 | pass | 실패 이력 없음 |
| unresolved closure wording | inventory/manifest의 `TODO`, `TBD`, `FIXME`, `review-required`, `not-approved`, 후속 API/검증 필요/후보 verifier 검색 결과 0 | pass | stale closure 문구 없음 |
| manifest cardinality audit | items 974, source 974, verifier 974, missing command 0, generic self owner 0, UI anchor 440, manual case 424, 30분 49, 120분 7 | pass | `jq` read-only audit |
| diff 무결성 | `git diff --check`: exit 0 | pass | 실패 이력 없음 |

테스트 사용량: token start `438676`, token end `494210`, token consumed `55534`,
elapsed 약 `226초`, source `Codex goal usage`. 최초 실패 2건은 같은 단계 안에서 원인과
수정 내용을 보존하고 전체 안정화 묶음을 처음부터 재실행했습니다.

### V390-ADD1-03 VLM 승격 신뢰 경계

직접 감사에서 `/ops/vlm`이 editable Evaluation select의 `passed`와
status/source/caseIds/dimensions/score를 PUT하고, `PrepareVlmProfileDocumentLocked`는
허용 status 문자열과 active/enabled 조합만 확인한다는 결함을 재현했습니다. 기존
`/ops/api/vlm/evaluation-promotion-guard`는 read-only 설명 route여서 profile 저장
경로의 candidate/result/provenance를 enforce하지 않았습니다.

개발 위치와 로직:

- `include/ingress/vlm_evaluation_promotion.h`,
  `src/ingress/vlm_evaluation_promotion.cpp`:
  평가 API와 저장 validator가 공유하는 immutable candidate catalog,
  `VlmEvaluationResultWorkflowJson`, `ValidateVlmEvaluationPromotion`을 추가했습니다.
  catalog revision, workflow/harness/evaluator/model-catalog SHA-256, candidate digest,
  option/model/prompt binding을 검증하고 server-canonical
  `media-server.vlm-evaluation-provenance.v1` JSON을 생성합니다.
- `src/ingress/webrtc_http_server.cpp`:
  `PrepareVlmProfileDocumentLocked`가 정확히 하나의 evaluation object와
  candidate ID/catalog revision/provenance digest만 받습니다. client-declared
  status/source/caseIds/dimensions/score/provenance와 duplicate evaluation/candidate
  field를 거부하고, 검증 뒤 request evaluation을 canonical server result로 교체합니다.
  active/enabled 판정은 이 서버 파생 status에만 의존합니다.
  registry reload 때 canonical evaluation/provenance를 다시 검증하고 불일치 profile은
  `quarantinedProfileCount`로 계수해 메모리 registry와 GET 결과에서 제외합니다.
- `src/ingress/product_ui_page_scripts.cpp`, `src/ingress/webrtc_http_server.cpp` Ops UI:
  editable passed select를 read-only `Evaluation (server verified)` input으로 교체했습니다.
  candidate 적용은 model 문자열 추정이 아니라 exact `selectedOptionId`를 사용하고,
  저장 payload는 candidate ID/revision/digest만 보냅니다. 저장 응답의 server status를
  readback message에 사용합니다.
- `test/fixtures/v390_vlm_promotion_trust_boundary/cases.json`,
  `scripts/internal/verify_v390_vlm_promotion_trust_boundary.mjs`,
  `./server.sh verify-v390-vlm-promotion-trust-boundary`:
  auth-off throwaway registry/server에서 valid passed/pending/non-passed/no-candidate,
  forged passed, unknown/stale candidate, option/model/prompt mismatch, failed/non-passed active,
  rejected update 원본 보존을 포함한 14개 실제 PUT/GET case와 변조 registry restart
  quarantine 1개 case를 정의했습니다.
- `UI-111`, `LAB-123`, `SAFE-206`, `OPS-173`은 신규 server-authoritative 기준과 실제
  HTTP verifier로 갱신했습니다. inventory 총 행 수는 974를 유지하고 manifest는
  명시적 refresh 대상으로 둡니다.

테스트 필요성 판정:

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | C++ profile 저장 validator, Ops UI payload, 실제 registry write/read, dispatch/docs/inventory를 변경 | `V390-ADD1-03`, `UI-111`, `LAB-123`, `SAFE-206`, `OPS-173` | 단계 범위에서 실행 |
| 30분 테스트 | 미진행 | runtime/provider/media lifecycle은 호출하지 않고 profile metadata validation만 변경 | `contractInvariants.*=false`, actual HTTP fixture | 장시간 실행 승인 없음 |
| 120분 테스트 | 미진행 | AGENTS 7.6.2의 media/lifecycle/high-risk trigger가 없고 실제 server run은 단기 throwaway matrix | V390-ADD1-03 변경 범위 | 장시간 실행 승인 없음 |
| UI 풀테스트 | 미진행 | UI control/payload를 변경했으므로 최종 release에는 직접 조작 evidence가 필요하지만 이번 최신 지시는 UI 풀테스트 실행 승인 아님 | `UI-111`, `/ops/vlm` | 직접 실행 승인 없음 |

안정화 실행 전 개별 항목:

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| C++ build | `./server.sh build`: shared catalog/profile validator compile/link, target 100% | pass | 최종 incremental clean gate 통과 |
| promotion HTTP trust matrix | `MEDIA_SERVER_SKIP_BUILD=1 ./server.sh verify-v390-vlm-promotion-trust-boundary`: HTTP 14, restart quarantine 1, failures 0 | pass | 최초 sandbox loopback `EPERM`; 권한 재실행 후 readback wrapper 경로 오류, reload raw formatting/null 처리 오류를 순차 수정하고 전체 재실행 pass |
| promotion guard regression | `./server.sh verify-v390-vlm-evaluation-promotion-guard`: pass 7, fail 0 | pass | 최초 exact manifest 전환 전 옛 coverage 문자열 요구로 pass 6/fail 1; manifest 기준으로 수정 후 pass |
| evaluation workflow regression | `./server.sh verify-vlm-evaluation-result-workflow`: pass 6, fail 0 | pass | client-owned status/result field 부재와 shared catalog 확인 |
| profile storage regression | `./server.sh verify-vlm-profile-storage`: pass 6, fail 0 | pass | 최초 옛 coverage 문자열 요구로 pass 5/fail 1; manifest 기준으로 수정 후 pass |
| inventory manifest refresh/read-only | explicit refresh 및 `./server.sh verify-feature-implementation-evidence`: rows 974, source/verifier 974, UI 440, manual 424, validation 0, negative 11/11 | pass | `UI-111`/`LAB-123`/`SAFE-206`/`OPS-173` existing rows만 갱신 |
| UI automation contract | `./server.sh verify-v390-ui-automation-runner-contract`: pass 6, fail 0 | pass | UI-111 current marker 갱신, 실제 UI 풀테스트 실행 아님 |
| project/feature/script/docs/release gate | project inventory 14/0, feature coverage 6/0(974/974), feature completion 13/0, script inventory 11/0, docs links failures 0, release evidence 8/0 | pass | 모두 최종 묶음 재실행 |
| auth route execution | `verify-auth-routes` | 미실행 | required password env 없음; static auth route/payload 연결은 profile verifier가 확인, 완료 evidence로 사용하지 않음 |
| diff 무결성 | `git diff --check`: 출력 없음 | pass | 실패 이력 없음 |

실패 이력과 수정:

1. sandbox loopback bind는 `listen EPERM`으로 실패해 승인된 권한 실행으로 재시도했습니다.
2. 첫 HTTP matrix는 GET wrapper `vlmProfile`을 검증기가 누락해 첫 readback에서 실패했고,
   wrapper 경로를 수정한 뒤 14/14가 통과했습니다.
3. 기존 promotion/profile verifier 2개는 Step 2 exact manifest 전환 뒤에도 옛 coverage
   script 문자열을 요구해 각각 6/1, 5/1로 실패했고 manifest evidence 기준으로 수정했습니다.
4. reload quarantine 추가 후 첫 실행은 valid profile까지 6개를 격리했고, 다음 실행은
   4개를 격리했습니다. 원인은 pretty JSON 공백의 raw 비교, `candidateId: null` 공백 탐지,
   `1.0` 숫자 표현 정규화였습니다. reload는 trusted revision/digest/binding을 검증한 뒤
   evaluation 전체를 server canonical JSON으로 재생성하도록 바꾸고 최종 14+1 전체를
   처음부터 재실행해 통과했습니다.

테스트 사용량: token start `494210`, token end `902804`, token consumed `408594`,
elapsed 약 `2500초`, source `Codex goal usage`/step boundary 추정.

### V390-ADD1-04 Re-ID 준비 상태 정합성

직접 감사에서 실제 `CreateAppearanceExtractorFromConfig`는 model path, SHA-256,
provenance, OpenSSL, ONNX Runtime, session start를 확인하지만
`OpsV390ReidAssistDecisionJson`은 설정 문자열 non-empty만 AND해
`modelBackedExecutionReady=true`를 만들고 있음을 확인했습니다. 따라서 missing/directory
model, invalid/mismatched SHA, whitespace provenance, OpenSSL/ONNX 미가용 상태에서 실제
factory는 NoOp인데 Ops가 ready라고 표시할 수 있었습니다.

개발 위치와 로직:

- `include/analysis/appearance_extractor.h`, `src/analysis/appearance_extractor.cpp`:
  raw path/SHA/provenance를 담지 않는 `AppearanceModelReadiness`와
  `InspectAppearanceModelReadiness`를 추가했습니다. enabled/extractor, path configured,
  exists/regular file, checksum configured/64-hex/readable/matches, trim provenance,
  OpenSSL SHA-256 runtime, ONNX Runtime API availability를 결정적 reason code로 판정합니다.
  factory도 이 판정기를 먼저 소비하고 PASS 뒤에만 기존 ONNX session `Start`를 최종
  gate로 수행합니다.
- `src/ingress/webrtc_http_server.cpp`:
  `/ops/api/analysis/reid-assist-decision`이 같은 inspector 결과를 사용합니다.
  `modelBackedPreflightReady`, `modelSessionLoadValidated=false`,
  `modelBackedExecutionReady=false`, safe `readinessReason`을 분리하여 decision route가
  실제 model load/execution을 증명하지 않게 했습니다. raw path/SHA/provenance는 반환하지
  않습니다.
- `src/ingress/product_ui_page_scripts.cpp`:
  `renderV390ReidAssistDecision`이 file, SHA format/read/match, provenance validation scope,
  OpenSSL, ONNX, reason, preflight/session boundary를 표시합니다. incomplete gate는 명시적
  NoOp 사유로 표시하고 실행 완료 badge로 승격하지 않습니다.
- `scripts/internal/reid_readiness_smoke.cpp`,
  `scripts/internal/verify_reid_readiness_smoke.sh`:
  OpenSSL/ONNX가 모두 없는 compile과 OpenSSL만 있는 compile을 각각 만들어 early gate,
  digest mismatch/대문자 digest match, capability reason, factory NoOp을 검사합니다.
- `test/fixtures/v390_reid_readiness_consistency/cases.json`,
  `scripts/internal/verify_v390_reid_readiness_consistency.mjs`,
  `./server.sh verify-v390-reid-readiness-consistency`:
  AI build의 auth-off throwaway server를 케이스별로 재시작해 disabled, wrong extractor,
  empty/missing/directory path, missing/invalid/mismatched SHA, whitespace provenance,
  complete preflight의 실제 HTTP 10개 행렬과 raw material 비노출을 검증합니다.
- `UI-115`, `LAB-125`, `SAFE-210`, `OPS-177` 네 기존 inventory 행을 공용 readiness와
  신규 verifier 기준으로 갱신했습니다. 총 feature row는 974를 유지합니다.

provenance 범위는 현재 계약에 맞춰 trim 후 non-empty operator assertion입니다. 별도
서명/URI/schema가 없는 상태에서 진위 인증으로 과장하지 않습니다. Ops GET은 최신 파일
변경을 즉시 반영하도록 매 요청에서 digest를 다시 검사하며, ops-only/no-store route이므로
이번 단계에서는 stale cache를 도입하지 않았습니다.

테스트 필요성 판정:

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | C++ factory gate, filesystem/hash/runtime probe, Ops API/UI, fixture/dispatch/docs/inventory를 변경 | `V390-ADD1-04`, `UI-115`, `LAB-125`, `SAFE-210`, `OPS-177` | 단계 범위에서 실행 |
| 30분 테스트 | 미진행 | media path나 지속 실행 lifecycle을 바꾸지 않고 config preflight와 단기 HTTP matrix만 변경 | V390-ADD1-04 변경 범위 | 장시간 실행 승인 없음 |
| 120분 테스트 | 미진행 | AGENTS 7.6.2의 media/lifecycle/high-risk trigger 없음 | V390-ADD1-04 변경 범위 | 장시간 실행 승인 없음 |
| UI 풀테스트 | 미진행 | Ops 표시 로직을 변경해 release 전 직접 UI evidence는 필요하지만 최신 지시는 UI 풀테스트 실행 승인이 아님 | `UI-115`, `/ops/dashboard` | 직접 실행 승인 없음 |

안정화 실행 결과:

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| C++ build | `./server.sh build`: 공용 inspector, OpenSSL/ONNX probe, Ops route/UI compile/link, target 100% | pass | 최초 빌드부터 통과 |
| readiness C++/HTTP matrix | `./server.sh verify-v390-reid-readiness-consistency`: capability compile 2종, actual HTTP 10개, failures 0 | pass | 첫 HTTP 실행은 5개 통과 뒤 verifier process 종료/port 회수 timeout; 종료를 await하고 HTTP/RTSP port 분리 후 전체 재실행 pass |
| Step 18/static privacy regression | `./server.sh verify-v390-conditional-field-ai-decisions`: pass 8/fail 0; `./server.sh verify-reid-advanced-tracking`: pass 12/fail 0 | pass | 새 preflight/session/raw-material 경계로 verifier와 문서 정렬 후 통과 |
| analysis state | `./server.sh verify-analysis-state`: pass 178/fail 0 | pass | 기존 factory NoOp/appearance/tracking/scenario/event 회귀 통과; 신규 capability matrix가 missing branches 보완 |
| implementation manifest | explicit refresh: inventory/source/verifier 974, UI 440, manual 424, validation 0, negative 11/11 | pass | 첫 refresh는 신규 verifier가 아직 index에 없어 tracked evidence 3건 fail; 단계 커밋 대상 신규 파일 stage 후 전체 재실행 pass |
| UI automation contract | `./server.sh verify-v390-ui-automation-runner-contract`: pass 6/fail 0 | pass | UI-115 marker source 갱신, 실제 UI 직접 조작 결과는 아님 |
| inventory/docs/release gates | feature completion 13/0, feature coverage 6/0(974/974), project inventory 14/0, script inventory 11/0, docs links failures 0, release evidence 8/0 | pass | 최종 inventory/manifest/docs 연결 뒤 재검증 |
| auth route verifier | `verify-auth-routes` | 미실행 | 필수 password env 5개 모두 absent. 실제 HTTP matrix는 auth-off throwaway server이고 auth/role/scope 구현은 변경하지 않음; 완료 evidence로 사용하지 않음 |
| 장시간/UI 직접 실행 | 30분, 120분, UI 풀테스트 | 미실행 | 사용자 별도 실행 승인 없음; 완료 evidence로 사용하지 않음 |
| diff 무결성 | `git diff --check`: 출력 없음 | pass | 최종 파일 상태 확인 |

실패 이력은 verifier lifecycle 1건과 manifest tracked-file 순서 1건이며 제품 readiness
판정의 false-positive case는 최종 행렬에서 모두 제거했습니다. 실제 ONNX graph/session
load와 inference 성공은 모델 artifact가 필요한 별도 실행 evidence이며 이번 preflight
PASS로 대체하지 않습니다.

테스트 사용량: token start `902804`, token end `1252561`, token consumed `349757`,
elapsed 약 `2161초`, source `Codex goal usage`/step boundary 추정.

### V390-ADD1-05 ONVIF source/view 저장 원자성

직접 감사에서 `/ops/sources` ONVIF form submit과 enable/disable toggle이 source PUT 성공
후 view PUT을 별도 요청으로 실행하고, 두 번째 요청 실패 시 catch가 오류만 표시해 첫 source
저장이 파일·메모리에 남는 것을 확인했습니다. `SourceViewRegistry`의 각 JSON 파일은
temp write/fsync/rename으로 개별 원자 교체되지만 두 API 호출 사이에는 공통 lock,
사전검증, transaction, rollback이 없었습니다.

개발 위치와 로직:

- `include/ingress/source_view_registry.h`, `src/ingress/source_view_registry.cpp`:
  `UpsertOnvifSourceView`를 추가했습니다. 한 mutex 구간에서 source/path ID와 canonical
  duplicate, `onvif`/`live` tag를 검증하고 candidate source set을 만든 뒤 그 set으로
  PublishedView의 path/view/source ID와 참조를 검증합니다. 검증이 모두 끝나기 전에는
  파일 write를 시작하지 않습니다.
- source 파일 저장 뒤 view 파일 저장이 실패하면 pre-transaction `sources_` snapshot을
  같은 atomic writer로 복구합니다. writer는 `target_replaced`를 반환하여 rename 전 실패와
  rename 후 parent fsync 실패를 구분하고, 실제 교체된 view만 추가 복구합니다. 두 파일이
  모두 성공한 뒤에만 in-memory source/view vector를 함께 교체합니다.
- 실패 응답은 `paired-write-with-compensating-rollback`, failed stage, source/view write,
  rollback attempted/succeeded, `partialSave`, consistency status를 안전한 boolean/token으로
  반환합니다. rollback 실패는 `manual-recovery-required`로 숨기지 않습니다. 이는 process
  crash journal까지 제공하는 cross-file atomic transaction이 아니라 검증 가능한 보상
  rollback입니다.
- `src/ingress/webrtc_http_server.cpp`:
  `PUT /ops/api/onvif/channels/{channelId}`를 추가했습니다. `ops` principal과
  `source:write`, 128 KiB body 상한, 정확히 하나의 `source`/`publishedView` object를
  요구하고 paired registry method만 호출합니다. 기존 개별 source/view API는 호환을 위해
  유지합니다.
- `src/ingress/product_ui_ops_sources_script.cpp`:
  `saveChannelSourceViewPair`가 ONVIF form save와 ONVIF toggle을 단일 paired route로
  전환했습니다. 비-ONVIF channel flow는 현재 단계 범위를 벗어나 기존 API를 유지합니다.
  import draft는 계속 `notSaved:true`, one-shot=false이며 저장 버튼을 누르기 전 write하지
  않습니다.
- `scripts/internal/verify_onvif_rtsp_downstream.mjs`의 기존 성공 경로도 연속 PUT 대신 paired
  route를 사용하도록 이관했습니다.
- `test/fixtures/v390_onvif_source_view_atomicity/cases.json`,
  `scripts/internal/verify_v390_onvif_source_view_atomicity.mjs`,
  `./server.sh verify-v390-onvif-source-view-atomicity`:
  committed create, missing pair/non-ONVIF/mismatched view prevalidation, view parent ENOTDIR
  second-write failure, exact source rollback, fault 제거 후 retry, concurrent pair no-mix,
  restart consistency를 actual auth-off HTTP 8개 case로 검증합니다. API memory와 source/view
  disk bytes, temp file 잔존도 함께 확인합니다.
- `UI-109`, `SRC-066`, `SAFE-204`, `OPS-171` 네 기존 inventory 행을 paired route와
  rollback verifier로 갱신했으며 전체 feature row 974개는 유지합니다.

테스트 필요성 판정:

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | SourceRegistry/PublishedView write semantics, Ops route/UI, actual disk failure/restart fixture, docs/inventory 변경 | `V390-ADD1-05`, `UI-109`, `SRC-066`, `SAFE-204`, `OPS-171` | 단계 범위에서 실행 |
| 30분 테스트 | 미진행 | registry save는 요청 단위이고 media streaming lifecycle을 변경하지 않음 | paired write/rollback 변경 범위 | 장시간 실행 승인 없음 |
| 120분 테스트 | 미진행 | AGENTS 7.6.2의 media/lifecycle/high-risk trigger 없음 | paired write/rollback 변경 범위 | 장시간 실행 승인 없음 |
| UI 풀테스트 | 미진행 | ONVIF form submit/toggle JS를 변경해 release 전 직접 UI evidence는 필요하지만 최신 지시는 UI 풀테스트 실행 승인이 아님 | `UI-109`, `/ops/sources` | 직접 실행 승인 없음 |

안정화 실행 결과:

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| C++ build | `./server.sh build`: paired registry method, route, Ops UI compile/link, target 100% | pass | 두 차례 incremental build 통과 |
| paired atomicity HTTP matrix | `./server.sh verify-v390-onvif-source-view-atomicity`: actual cases 8, injected failure partialSave=false, restartConsistency=true, failures 0 | pass | 최초 실행은 제품 요청 전 verifier C++ string escape 오판으로 정적 precheck fail; escape 수정 후 처음부터 재실행 pass |
| rollback disk evidence | source write 성공/view parent ENOTDIR 실패 뒤 source bytes 복구, view saved bytes 불변, API snapshot 불변, retry/restart pair 일치, `.tmp.*` 0 | pass | path component fault 제거와 temp workdir cleanup 완료 |
| 기존 ONVIF contract/HTTP 호환 | `verify-onvif-live-import-contract` 12/0, local auth-off `verify-onvif-import-draft-api` 22개 check/0 failure, `verify-onvif-rtsp-downstream` paired save/client redaction failures 0 | pass | 외부 ONVIF 실기기에 접속하지 않고 local fixture/RTSP locator로 검증 |
| UI/decision 정적 회귀 | `verify-v390-onvif-live-import-persist-decision` 6/0, `verify-v390-ui-automation-runner-contract` 6/0, `verify-ops-client-ui --browser-mode static` 28/0 | pass | static mode의 rendered leak/admin form 조작은 skip; UI 풀테스트 직접 evidence가 아님 |
| inventory/docs/script gate | implementation evidence 974행/validation 0/negative 11, feature coverage 974/974 및 6/0, project inventory 14/0, feature completion 13/0, script inventory 11/0, docs links 0, release evidence 8/0 | pass | manifest의 `UI-109`/`SRC-066`/`SAFE-204`/`OPS-171`를 실제 route/function/verifier anchor로 고정 |
| auth route matrix | `MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD`, `PREVIOUS_PASSWORD`, `SECOND_PREVIOUS_PASSWORD`, `WRONG_PASSWORD_ONE`, `WRONG_PASSWORD_TWO` | 미실행 | 필수 password env 5개가 모두 없어 AGENTS auth 조건에 따라 실행하지 않음 |
| 임시 산출물 cleanup | `/tmp/media_server_v390_add1_05_compat` 8KB와 verifier throwaway workdir | pass | source/view JSON 2개 삭제 후 경로 부재 및 atomicity workdir 0 확인; 보존 파일 없음 |
| 장시간/UI 직접 실행 | 30분, 120분, UI 풀테스트 | 미실행 | 사용자 별도 실행 승인 없음; 완료 evidence로 사용하지 않음 |

범위 밖 후속으로 DELETE의 view/source 병렬 disable과 multi-process file lock/journal은 이번
요청의 연속 PUT 결함에 포함하지 않았습니다. 이번 paired route의 product 후속 이슈는 관련
회귀·inventory·문서 gate까지 통과하면 남기지 않습니다.

테스트 사용량: token start `1252561`, token end `1526311`, token consumed `273750`,
elapsed 약 `1146초`, source `Codex goal usage`/step boundary 추정.

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
- Step 9와 Step 10은 먼저 `criteria complete`로 닫혔고, R1/R2/R5와
  V390-ADD1-06~10에서 actual bundle, `UI-112` case completeness, native free UI adapter,
  visible DOM assertion, true first-fail longrun loop가 `implementation complete`로 보강됐습니다.
  full route/control/action coverage는 아직 `implementation complete`가 아닙니다.

### v3.9.0 잔여 구현 순서

| 순서 | 우선순위 | 대상 | 현재 상태 | 반드시 구현할 내용 | 완료 evidence |
| --- | --- | --- | --- | --- | --- |
| R0 | P0 | `V390-CAND-001` inventory 상태 불일치 정리 | `docs/v390-feature-completion-inventory.md` 원 표 행과 Candidate/Closed 목록이 Step 11 evidence 기준 `closed-with-evidence`로 정리됨 | inventory 원 행을 Step 11 구현 상태와 맞춰 `closed-with-evidence`로 정리하고, Candidate/Closed 목록 문구가 서로 모순되지 않게 보정 | `./server.sh verify-v390-feature-completion-inventory`, `./server.sh verify-v390-onvif-credential-provider-status`, `git diff --check` |
| R1 | P0 | AI-minimized server longrun runner 실제 구현 | V390-ADD1-10까지 구현됨. `verify-v390-server-longrun`과 `verify-predev --fail-fast`가 phase/case first-fail, later `not-run`, context/stderr/reproduction을 보존합니다. 과거 사용자 승인 30분 evidence는 남아 있지만 새 code 기준 30분/120분은 미실행 | 30분/120분 서버 테스트를 하나의 명령으로 시작하고 첫 실패에서 즉시 중단하며 이후 phase/case를 `not-run`으로 기록. predev delegated summary의 내부 첫 실패와 진단 정보를 `failure`/`failedCase`/`delegatedFailure`로 보존 | `./server.sh verify-v390-server-longrun-runner-contract`, fast predev first-fail fixture, 새 code 기준 실제 30분/120분은 별도 승인 evidence |
| R2 | P0 | AI-minimized UI automation runner 실제 구현 | `verify-v390-ui-automation`/`verify-v390-ui-automation-report`/`verify-v390-ui-automation-runner-contract` 구현과 실제 Playwright-mode UI automation suite PASS evidence가 보존됨. 현재 환경에서는 Playwright package 부재로 `chrome-cdp-fallback` adapter를 명시 기록 | 무료 UI 자동화 도구 우선순위에 맞춘 runner를 구현하고 route/control/action 단위 실패 report, screenshot, trace/video, console, server log, cleanup evidence를 남김 | `./server.sh verify-v390-ui-automation-runner-contract`, `./server.sh verify-v390-ui-automation --browser-mode playwright --output-dir docs/release-artifacts/v3.9.0/ui-automation-playwright-final --allow-chrome-fallback=1`, `./server.sh verify-v390-ui-automation-report --summary docs/release-artifacts/v3.9.0/ui-automation-playwright-final/summary.json`, 실패 fixture에서 failure report PASS |
| R3 | P0 | 사용자가 재실행 가능한 v3.9 test acceptance bundle | `verify-v390-test-acceptance-bundle --dry-run`과 contract verifier가 구현되어 `finalAcceptanceCommandSet`, R1 30분 preserved evidence `pass-existing-evidence`, R2 UI automation preserved evidence `pass-existing-evidence`, 조건부 120분, published/release action not-run boundary를 한 summary/report로 고정함. 실제 acceptance bundle 실행은 사용자 승인 전 미실행 | R1/R2 산출물을 포함한 final acceptance command set을 문서와 script dispatch에 고정하고, 각 command의 summary/report 경로를 release evidence로 복사 가능하게 함 | `./server.sh verify-v390-test-acceptance-bundle --dry-run`, `./server.sh verify-v390-test-acceptance-bundle-contract`, `./server.sh verify-script-inventory`, `./server.sh verify-release-evidence-index` |
| R4 | P1 | legacy `verify-predev`와 새 runner 관계 정리 | R4 선택 option 3으로 정리됨. `verify-predev`는 legacy/compatibility cumulative predev runner, `verify-v390-server-longrun`은 release-grade first-fail runner이며 runtime/media trigger matrix row도 새 runner를 표준 trigger로 사용 | 기존 command를 유지할지, 새 command로 matrix를 바꿀지 결정하고 docs/project inventory/release policy가 같은 runner를 가리키게 정렬 | `./server.sh verify-v390-longrun-runner-role-alignment`, `./server.sh verify-runtime-media-longrun-trigger-matrix`, `./server.sh verify-longrun-separation`, `./server.sh verify-rc-release-gate` |
| R5 | P1 | UI result/release evidence replay guard | v3.9.0 R5 UI automation report replay guard 구현됨. `verify-v390-ui-automation-report --summary <summary.json>`가 progress output과 함께 PASS zero-fail/not-run/manual-intervention, screenshot/trace/video/browser-console/server-log artifact file existence, browserConsole warning/error 허용 사유, first-fail 이후 not-run 순서를 검증함. 실제 R2 suite 보존 summary replay도 PASS로 실행됨 | UI runner summary를 입력으로 받아 route/control/action 개별 행, manual intervention 없음, failed interaction 0, screenshot/trace/log 존재를 검증하는 replay verifier 구현 | `./server.sh verify-v390-ui-automation-report --summary docs/release-artifacts/v3.9.0/ui-automation-playwright-final/summary.json`, `./server.sh verify-v390-ui-automation-report-replay-guard` |

### v3.9.0 post-review 잔여 이슈: 테스트 철저화와 release 전 재확인

이 섹션은 2026-07-09 post-review에서 문서 완료 표기를 믿지 않고 실제 구현과 evidence를
다시 대조한 결과입니다. 아래 항목은 v3.9.0 이후 구현 내용을 다시 건드리지 않는다는
전제에서 release action 전에 닫아야 하는 테스트/증적 잔여 이슈입니다. 이 표는 이전
요청과 같은 `구간 | 제목 | 우선순위 | 개발 내용` 형식으로 유지합니다.

| 구간 | 제목 | 우선순위 | 개발 내용 |
| --- | --- | --- | --- |
| Test Closure | R6 actual acceptance bundle 실행 모드 | P0 | `verify-v390-test-acceptance-bundle`이 `--dry-run` 없이 실행될 때 local readiness, R1 30분, R2 UI automation, 조건부 120분 판정, cleanup/evidence copy를 stop-on-first-fail summary/report로 생성하게 구현. 현재 `release-test-records.md`의 `v390 R3 actual acceptance bundle`은 미실행/FAIL 경계이므로 완료 evidence로 사용 금지 |
| UI Automation | R7 `UI-112`와 v3.9 신규 UI case completeness | P0 | `test/fixtures/v390_ui_automation_cases.json`과 보존 summary가 `UI-112` staging restore validation handoff를 누락함. `UI-108`~`UI-115` 전 case를 manifest, actual run, replay guard, release evidence에 포함하고 누락 case가 있으면 PASS 불가 처리 |
| UI Automation | R8 native free UI automation adapter proof | P0 | 현재 R2 실제 run은 `browserMode=playwright`지만 Playwright package 부재로 `selectedAdapter.engine=chrome-cdp-fallback`을 사용함. Playwright/Selenium/SikuliX 중 하나를 native adapter evidence로 실행하거나, native adapter 부재 시 명확한 preflight FAIL과 설치/설정 안내를 남기고 fallback PASS를 primary PASS로 쓰지 않게 함 |
| Server Longrun | R9 true first-fail longrun loop | P0 | V390-ADD1-10 완료. `verify-predev --fail-fast`가 duration iteration의 각 case 뒤 실패를 확인해 같은 iteration의 later case와 future iteration을 `not-run`으로 남기며, `verify-v390-server-longrun`이 context/stderr/reproduction을 console/summary/report에 보존 |
| UI Full Coverage | R10 v1.0~v3.9 route/control/action automation coverage matrix | P0 | exact `manualUiCaseId` 424개 mapping은 유지합니다. stale historical 8-case는 current input에서 격리했고 current matrix는 native 423+negative 1/unsupported 0 readiness와 pass 0/not-run 424 execution을 분리합니다. Matrix PASS를 UI 풀테스트 PASS로 승격하지 않습니다 |
| Release Evidence | R11 post-review final evidence re-run and cleanup | P0 | R6~R10 수정 후 `verify-v390-stabilization-release-readiness`, Step 1~20 companion gates, actual 30분, UI automation/full coverage, 조건부 120분 판정, cleanup/evidence 보존을 다시 실행하고 release action 전 최신 evidence로 교체/추가 |
| Product Scope Lock | R12 deferred product decision owner sign-off | P1 | action execution, persistent credential store, field smoke, provider call, model-backed Re-ID는 현재 read-only/defer 상태임. v3.9에서 non-goal로 닫는지 실제 구현할지 owner decision을 문서/evidence에 명확히 남김. owner decision 없이 완료 주장 금지 |
| Structure | R13 structure stabilization implementation readiness | P1 | Step 19는 실제 route/API/UI extraction이 아니라 handoff임. v4.0 전/후 어느 branch에서 `webrtc_http_server.cpp`, product UI script, manual UI archive, VLM contract index를 slice별로 분리할지 실행 순서와 verifier를 확정 |
| Conditional Field | R14 real external field smoke gate | P2 | ONVIF 실기기, external WHEP/TURN, cloud/VLM provider endpoint/credential이 제공될 때만 real field smoke를 실행. 조건 미제공이면 `조건부 미실행`으로 남기고 local/UI/30분 PASS로 field PASS를 대체하지 않음 |

#### post-review 잔여 이슈 완료 evidence 기준

| 이슈 | 완료 evidence | 완료로 인정하지 않는 것 |
| --- | --- | --- |
| R6 | `./server.sh verify-v390-test-acceptance-bundle --output-dir docs/release-artifacts/v3.9.0/test-acceptance-final` actual summary/report와 contract PASS | `--dry-run` PASS, R1/R2 preserved evidence를 읽기만 한 summary |
| R7 | `UI-112` 포함 `UI-108`~`UI-115` 전 case actual UI automation PASS와 replay guard PASS | `UI-112`가 빠진 caseCount 7 summary |
| R8 | native Playwright/Selenium/SikuliX adapter selected evidence 또는 native 부재 시 preflight FAIL/설치 안내 | `chrome-cdp-fallback`을 primary Playwright PASS처럼 해석 |
| R9 | 실제 longrun case loop에서 fixture failure 이후 case가 `not-run`이고 cumulative `verify-predev`가 이후 case를 계속 실행하지 않았다는 evidence | delegated predev summary만 읽어 첫 실패 이름을 보존한 것 |
| R10 | exact UI test ID 424개 전수 집합과 featureId/route/control-action/stability verifier/automation caseId별 actualResult/artifact/log 개별 report, prefix/range 판정 제거 contract | 일부 prefix 행 또는 v3.9 신규 card marker만 확인한 자동화 |
| R11 | post-review 수정 이후 새 final evidence, cleanup 기록, `git diff --check` PASS | Step 20 이전 local readiness PASS 재사용 |
| R12 | owner decision이 `deferred-by-owner` 또는 `implement-before-release`로 명시되고 release notes/evidence에 반영 | read-only route 존재만으로 실제 실행 기능 완료 주장 |
| R13 | 구조 안정화 실행 branch/slice/verifier 순서가 확정되고 구현 대상과 비대상이 분리 | Step 19 handoff PASS를 실제 refactor 완료로 해석 |
| R14 | endpoint/credential/실기기/provider 조건이 주어진 실제 field smoke summary/report | 조건 미제공 상태의 local verifier PASS |

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
- `screenshotPath`, `tracePath`, `videoPath`, `browserConsolePath`, `serverLogReference`
  artifact path가 실제 존재. R5 replay guard에서는 보존하지 않은 사유를 누락 artifact
  대체 evidence로 인정하지 않음.
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
  `browserConsolePath`, `cleanupPortState`, `browserConsole`, `manualIntervention=false`를 확인하고,
  screenshot/trace/video/browser-console/server-log 파일이 실제 존재해야 통과합니다.
- `scripts/internal/verify_v390_ui_automation_report_replay_guard_contract.mjs`:
  missing artifact field, missing screenshot/trace/browser-console/server-log file,
  `browserConsole` warning/error 무허용, PASS summary의 not-run/manual intervention,
  failure 이후 계속 실행된 PASS case를 fixture로 검증합니다.
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

Foundation initial review-ready 상태(historical snapshot):

- 승인 상태: `pending-user-approval`
- 기능 개발 상태: `blocked-before-user-approval`
- 다음 개발 순서: `V390-REQ-001` -> `V390-REQ-002` -> `V390-REQ-003`, 이후 사용자
  승인 범위 안에서 `V390-CAND-*` 또는 `V390-STRUCT-*`로 이동합니다.
- 다음 개발 착수는 사용자가 v3.9 required/candidate list를 승인한 뒤에만 가능합니다.

Current user approval/closure reconciliation:

- current 승인 상태: `approved-through-recorded-user-goals`
- current 기능 개발 상태: `closed-with-evidence`
- current active required/candidate 개발: `없음`
- required `V390-REQ-001`~`003`과 candidate `V390-CAND-001`~`010`은 후속 사용자 goal 범위에서 모두 닫혔습니다.
- 이 current 승인/closure는 UI 풀테스트, 30분/120분, published metadata, release action PASS가 아닙니다.

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
- Step 14 `VLM evaluation promotion guard` (V390-ADD1-03에서 correctness 보강):
  - 1차 선택값: `server-verified-evaluation-promotion`을 선택합니다. 기존 evaluation result 후보를 새 저장/활성화 route로 자동 승격하지 않고, 클라이언트는 candidate ID/revision/digest reference만 제출합니다.
  - persistence 방식: promotion guard route는 read-only decision/evidence summary를 반환합니다. 실제 저장은 기존 `/ops/api/vlm/profiles`와 `rule:write` scope를 거치며, profile validator가 shared catalog의 result/provenance와 option/model/prompt binding을 확인한 뒤 canonical evaluation을 저장합니다.
  - boundary: Step 14 guard route 자체는 profile write, activation execution, VLM runtime/provider call, sidecar write, client/viewer exposure, Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media path 변경을 수행하지 않습니다.
  - `src/ingress/webrtc_http_server.cpp`에 `OpsV390VlmEvaluationPromotionGuardJson`과 GET `/ops/api/vlm/evaluation-promotion-guard` route를 추가했습니다. 이 route는 `require_ops_principal()`, `Cache-Control: no-store`, `media-server.ops.v390-vlm-evaluation-promotion-guard.v1` schema, `promotionFlow`, `activationGuard`, `workflowContract`를 반환합니다.
  - `src/ingress/product_ui_page_scripts.cpp`와 `/ops/vlm` Evaluation result workflow 영역은 `server-verified-evaluation-promotion`, `serverVerification=true`, `clientDeclaredEvaluationRejected=true`, `runtimeCall=false`, `providerCall=false`를 표시합니다.
  - `verify-v390-vlm-evaluation-promotion-guard`가 route/UI/docs 경계를, `verify-v390-vlm-promotion-trust-boundary`가 14개 실제 HTTP save/read/reject/no-write case를 검증합니다.
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
    | 120분 테스트 | 진행 대상 | 최신 사용자 지시가 v3.9.0 final close-out 테스트 순서에 120분 포함을 명시 | `v3.9.0 (20)`, 2026-07-11 current close-out decision | 실행 목록 포함 승인/현재 미실행 |
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
    ./server.sh verify-v390-vlm-incident-rule-provenance
    ./server.sh verify-v390-vlm-evaluation-promotion-guard
    ./server.sh verify-v390-backup-recovery-handoff-validation
    ./server.sh verify-v390-action-execution-deferral-decision
    ./server.sh verify-v390-deferred-product-owner-signoff
    ./server.sh verify-v390-conditional-field-ai-decisions
    ./server.sh verify-v390-structure-stabilization-handoff
    ./server.sh verify-v390-structure-stabilization-readiness
    ./server.sh verify-v390-external-field-smoke-no-device-closure
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

## v3.9.0 (14) 장시간 실행기 — V390-ADD1-10

이번 단계의 구현 계획 source-of-truth는
`docs/superpowers/plans/2026-07-10-v390-longrun-first-fail-diagnostics.md`입니다. 기존 R1
runner는 phase-level `stopOnFirstFail`과 delegated first failure 이름을 보존했지만,
`verify-predev` soak iteration 내부 case 사이의 즉시 중단과 context/stderr/재현 명령
출력 계약은 닫히지 않았습니다. 이번 변경은 product API/schema/media/auth를 변경하지 않고
longrun/predev orchestration과 failure evidence만 보강했습니다.

테스트 필요성 판정:

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | longrun runner, delegated predev fail-fast, contract, docs/inventory를 직접 변경 | `V390-ADD1-10`, `OPS-168`, `SAFE-201` | 최신 goal에서 10번 개발 승인 |
| 30분 테스트 | 미진행 | 최신 요청은 실행기 개발이며 실제 30분 duration 명령 실행을 명시하지 않음 | AGENTS 7.6.2/7.7, `V390-ADD1-10` | duration 실행 승인 없음 |
| 120분 테스트 | 미진행 | 실제 runtime/media path를 변경하지 않고 AGENTS 7.6.2 high-risk trigger와 명시 실행 지시가 없음 | `V390-ADD1-10` 변경 범위 | 조건·실행 승인 없음 |
| UI 풀테스트 | 미진행 | backend/test orchestration과 failure evidence만 변경하고 제품 UI route/control을 변경하지 않음 | `V390-ADD1-10`, `OPS-168`, `SAFE-201` | UI 실행 지시 없음 |

개발 위치와 로직:

- `scripts/internal/verify_predev_stability.sh`: `run_step`이 stdout/stderr를 별도 파일과
  tail로 보존하고 첫 실패 순간 context/stderr/reproduction을 출력합니다.
  real soak와 fast fixture가 같은 `run_ordered_case_sequence`를 사용하며, `run_soak_loop`는
  `--fail-fast`일 때 case 사이마다 실패를 확인하고 같은 iteration의
  later case, future iteration, 이후 main/queue case를 `not-run`으로 기록합니다.
  `run_failure_contract_fixture`는 두 번째 case 실패와 세 번째 case 미실행을 빠르게
  재현합니다. `--fail-fast`가 없는 legacy cumulative 동작은 계속 후속 case를 수행합니다.
- `scripts/internal/verify_v390_server_longrun.mjs`: `finishCommandPhase`,
  `readDelegatedFailure`, `printFirstFailure`가 phase/case/context/stderr/reproduction과
  delegated later-not-run/contract 상태를 summary `failure`, failed phase, Markdown report,
  console에 보존합니다.
- `scripts/internal/verify_v390_server_longrun_runner_contract.mjs`: phase failure/pass,
  delegated summary, executable predev first-fail fixture, 잘못된 duration, docs/evidence를
  7개 독립 check로 검증합니다.
- `docs/stream-verification.md`, `docs/project-feature-test-inventory.md`,
  `docs/release-test-records.md`, `docs/release-evidence-index.md`와 exact 974행 implementation
  manifest가 `V390-ADD1-10`, `OPS-168`, `SAFE-201`을 같은 경계로 연결합니다.

실패 후 수정 이력:

| 순서 | 최초 실패 | 원인 | 수정 | 재검증 |
| --- | --- | --- | --- | --- |
| 1 | first-fail contract `pass=3 fail=4` | 기존 summary/report에 context/stderr/reproduction이 없고 predev executable fixture가 없음 | 계약을 먼저 RED로 고정한 뒤 runner/predev 진단과 fixture 구현 | contract `pass=7 fail=0` |
| 2 | direct predev fixture exit 127, summary 없음 | `run_failure_contract_fixture`가 Python heredoc 안에 잘못 삽입됨 | Bash 함수 정의를 heredoc 밖으로 이동 | executable fixture가 fail 1/notRun 1과 분리 stderr를 기록, contract PASS |
| 3 | evidence/test gate `pass=8 fail=1` | 새 필드를 기존 문서 필드 사이에 넣어 verifier의 호환 문자열이 끊김 | 기존 `command...cleanup state` 순서를 보존하고 새 case/context/stderr/reproduction을 뒤에 추가 | gate `pass=9 fail=0` |
| 4 | manifest refresh가 관련 없는 valid anchor도 재선택 | generator의 현재 탐색 순서가 여러 valid anchor 중 다른 항목을 선택 | `SAFE-201`/`OPS-168`/inventory hash 외 unrelated anchor churn을 원래 값으로 복구 | implementation evidence 974/974, validation error 0, negative 11/11 |

안정화 실행 결과:

| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
| Bash syntax | `bash -n scripts/internal/verify_predev_stability.sh`, exit 0 | pass | fixture 함수 위치 수정 후 재확인 |
| Node runner syntax | `node --check scripts/internal/verify_v390_server_longrun.mjs`, exit 0 | pass | summary/failure helper syntax 확인 |
| Node contract syntax | `node --check scripts/internal/verify_v390_server_longrun_runner_contract.mjs`, exit 0 | pass | executable fixture helper syntax 확인 |
| first-fail contract RED | `./server.sh verify-v390-server-longrun-runner-contract`, pass 3/fail 4 | fail | context, delegated diagnostics, executable fixture, docs 계약 부재를 예상대로 재현 |
| first-fail contract final | 같은 명령, phase/delegated/predev fixture/duration/docs 7개 check | pass | 최종 pass 7/fail 0 |
| role alignment | `./server.sh verify-v390-longrun-runner-role-alignment` | pass | option 3, legacy cumulative와 release-grade first-fail 역할 5/0 |
| longrun separation | `./server.sh verify-longrun-separation` | pass | 기본 test와 explicit longrun 분리 7/0 |
| runtime/media trigger matrix | `./server.sh verify-runtime-media-longrun-trigger-matrix` | pass | 13행, 30분 7행, 120분 server 3행, runtime 4행, checks 8/0 |
| RC release gate | `./server.sh verify-rc-release-gate` | pass | RC-only/승인 경계 10/0 |
| acceptance compatibility | `./server.sh verify-v390-test-acceptance-bundle-contract` | pass | actual fixture order/first-fail/cleanup/report/120 조건 6/0 |
| implementation evidence | `./server.sh verify-feature-implementation-evidence` | pass | 974/974, validation 0, negative 11/11 |
| feature coverage | `./server.sh verify-feature-inventory-coverage` | pass | covered 974, missing 0, checks 6/0 |
| project inventory | `./server.sh verify-project-inventory` | pass | featureRows 974, checks 14/0 |
| script inventory | `./server.sh verify-script-inventory` | pass | dispatch/options/auth/default 경계 11/0 |
| docs links | `./server.sh verify-docs-links` | pass | Markdown 155, local links 788, failures 0 |
| release evidence index | `./server.sh verify-release-evidence-index` | pass | 상세 결과 source 분리 8/0 |
| evidence/test gate 최초 | `./server.sh verify-v390-evidence-test-gate-prep` | fail | 문서 호환 문자열 수정 전 8/1 |
| evidence/test gate 최종 | 같은 명령 | pass | 수정 후 9/0 |
| feature completion inventory | `./server.sh verify-v390-feature-completion-inventory` | pass | source-of-truth/review/test-area 경계 13/0 |
| stabilization readiness | `./server.sh verify-v390-stabilization-release-readiness` | pass | local readiness/not-run 경계 7/0 |
| diff hygiene | `git diff --check` | pass | 최종 실행 결과 출력 없음 |

장시간/UI 경계:

- 실제 30분: 미실행. 새 first-fail code의 duration PASS evidence로 사용하지 않습니다.
- 실제 120분: 미실행. 직접 trigger와 실행 승인이 없습니다.
- UI 풀테스트: 미실행. 제품 UI 변경이 없고 직접 실행 지시가 없습니다.
- 과거 30분/통합 acceptance PASS는 historical evidence로만 보존하며 이번 code의 duration
  PASS로 승격하지 않습니다.

임시 산출물 cleanup:

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| `/tmp/v390-debug-summary.json` | direct fixture summary | 4KB | 삭제 | 경로 없음 | final evidence가 아닌 재현용 임시 JSON |
| `/tmp/v390-debug-report.md` | direct fixture report | 4KB | 삭제 | 경로 없음 | final evidence가 아닌 재현용 임시 report |
| `/tmp/media_server_predev-1783682373-45267` | fixture stdout/stderr/log | 24KB | 삭제 | 경로 없음 | contract가 동일 정보를 재생성 가능 |
| `/private/tmp/media_server_predev-*` 이번 실행 잔여 3개 | 초기 실패/contract 빈 workdir | 0B | 삭제 | 최근 잔여 경로 0개 | 첫 fixture 함수 연결 실패와 contract 재실행 산출물 |
| contract output dirs/files | phase/predev fixture summary/report/log | 재현 가능 임시 산출물 | process-exit cleanup | glob 잔여 0개 | contract verifier cleanup과 후속 직접 확인 |

테스트 사용량: token start `159662`, token end `526159`, token consumed `366497`,
elapsed `1313초`, source `Codex goal usage` (실행 전 등록 snapshot과 최종 안정화 직후
snapshot 차이).

## v3.9.0 (25) route/control/action automation coverage matrix — V390-ADD1-11

구현 계획 source-of-truth는
`docs/superpowers/plans/2026-07-10-v390-ui-automation-coverage-matrix.md`입니다. 이 단계는
기존 v3.9 actual 8-case automation을 current UI 전체 PASS로 확대하지 않고, 974개 inventory의
reviewed implementation manifest에서 exact `manualUiCaseId` 424개를 선택해 실제 자동화/
미지원/manual/positive UI 제외로 분류하는 검증 가능한 matrix로 보정했습니다. feature ID
prefix/range 판정은 제거했고, testId/featureId/route/control-action anchor/stability verifier/
automation caseId를 독립 연결합니다. Product route/API/schema/media/auth 동작은 변경하지 않았습니다.

테스트 필요성 판정:

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | coverage verifier/contract/policy/docs와 exact-ID matrix를 변경 | `V390-ADD1-11`, exact UI test ID 424개, `OPS-169`, `SAFE-202` | 최신 `/goal`의 11번 개발 승인 |
| 30분 테스트 | 미진행 | test/docs coverage tooling만 변경하고 media/session/runtime path를 변경하지 않음 | AGENTS 7.6.2, V390-ADD1-11 변경 범위 | duration 실행 승인 없음 |
| 120분 테스트 | 미진행 | high-risk runtime/media trigger가 없고 명시 실행 지시도 없음 | AGENTS 7.6.2, V390-ADD1-11 변경 범위 | 조건·실행 승인 없음 |
| UI 풀테스트 | 미진행 | 보존된 actual 8-case summary는 재검증하지만 exact UI test ID 424개 전체 직접 조작은 최신 요청에서 승인되지 않음 | matrix unsupported 415개, `manualUiFulltestEvidence=false` | 직접 UI 풀테스트 승인 없음 |

개발 위치와 로직:

- `test/fixtures/v390_ui_automation_coverage_policy.json`: schema v2가 974/424/8/415/1
  count, automated exact case ID 8개, positive UI exclusion `UI-018`, required artifact
  종류만 고정하며 feature prefix와 numeric range로 unsupported 행을 판정하지 않습니다.
- `scripts/internal/verify_v390_ui_automation_coverage.mjs`: inventory, implementation evidence,
  case manifest, 보존 actual summary를 교차 검증하고 exact UI test ID 424행 summary/report를
  생성합니다. exact `manualUiCaseId`를 selection source로 쓰고 featureId, route,
  control/action source anchor, stability verifier command/assertion, automation caseId를
  연결합니다. Automated 행은 route/control/action, `automationStatus`, `actualResult`, screenshot,
  trace/video, browser console, server log를 보존합니다. 미지원 행은 `not-run`과 사유,
  `UI-018`은 `not-applicable`과 manual negative route 필요성을 남깁니다.
- `scripts/internal/verify_v390_ui_automation_coverage_contract.mjs`: exact ID/count/boundary,
  automated evidence, unsupported/excluded 사유, cross-prefix test ID 누락/중복,
  route/control-action drift, automation featureId→caseId drift, artifact 누락,
  prefix/range 판정 제거, reviewed manifest refresh 보존, durable docs/dispatch wiring을
  12개 check로 검증합니다.
- `scripts/internal/feature_implementation_manifest_lib.mjs`: 명시 refresh에서도 기존 reviewed
  UI route/control-action/verifier와 exact test ID를 보존합니다. Prefix별 route fallback은
  제거했으며 신규 UI mapping에 명시 route가 없으면 refresh를 실패 처리합니다.
- `docs/v390-ui-automation-coverage-matrix.md`: `mapped-with-explicit-gaps` 424행을 durable
  source-backed matrix로 보존합니다. `fullAutomationCoverage=false`,
  `manualUiFulltestEvidence=false`입니다.

실패 후 수정 이력:

| 순서 | 최초 실패 | 원인 | 수정 | 재검증 |
| --- | --- | --- | --- | --- |
| 1 | coverage contract `pass=0 fail=8` | verifier, durable matrix, dispatch/negative failure contract 구현 전 RED | policy/verifier/contract/dispatch/docs 구현 | contract `pass=8 fail=0` |
| 2 | 첫 matrix generation `UI-006 manualUiCaseId mismatch` | UI 계열 ID라는 이유로 안정화 전용 `UI-006`에도 manual case를 강제 | inventory `testAreas`에 UI가 있는 114개만 manual case를 요구하고 `UI-006`은 stability-only로 분리 | exact 115행 generation PASS |
| 3 | feature evidence/coverage/project inventory SHA drift | project inventory에 Step 25 mapping 행을 추가해 exact manifest 문서 SHA 변경 | 974개 ID/anchor는 그대로 두고 inventory SHA만 explicit refresh | 974/974 validation 0, coverage 6/0, project 14/0 |
| 4 | matrix review에서 automated `actualResult`가 단순 PASS로 축약 | status와 actual result를 한 필드로 사용 | `automationStatus=PASS`와 보존 summary 실제 결과 문장을 분리 | coverage와 contract 재실행 PASS |
| 5 | exact-ID correction contract `pass=1 fail=10` | 기존 matrix가 `UI-*` prefix/range 115행만 선택하고 타 prefix exact UI test ID 310개를 누락 | selection을 974개 manifest의 exact `manualUiCaseId` 424개로 바꾸고 schema/policy/contract를 v2로 보정 | 최종 contract 재검증 대상 |
| 6 | v2 첫 generation `UI-020 route/action source mapping invalid` | UI action anchor 소유 파일과 screen route 소유 파일이 분리되는데 같은 파일 포함을 강제 | action anchor는 지정 source file, route는 전체 product UI route source에서 각각 검증 | v2 generation 974/424/8/415/1 PASS |
| 7 | route source cache 초기화/파일 matcher 재실행 실패 | top-level 검증보다 뒤의 cache `let` TDZ와 `webrtc_http_server.cpp`를 누락한 filename regex | cache 선언을 검증 전으로 이동하고 exact product UI source filename matcher로 수정 | v2 generation PASS |
| 8 | exact 전용 verifier 최초 실행 6개 FAIL | feature coverage script 본문 command 문자열, 과거 UI range, 제거된 helper를 고정한 stale assertion | implementation manifest의 exact verifier command/file/anchor와 현재 upstream integration을 직접 확인하도록 UI-042/043/069/074/080/107 verifier 보정 | 6/0, 4/0, 8/0, 8/0, 9/0, 9/0 PASS; UI-110 6/0 유지 |
| 9 | feature implementation evidence SHA drift | project inventory의 Step 25 exact-ID mapping 행 변경으로 inventory SHA 불일치 | 974개 exact ID를 유지하고 이번 단계의 route/verifier mapping 8개를 직접 검토한 뒤 inventory SHA만 current 값으로 갱신 | 974/974, validation 0, negative 11/11 PASS |
| 10 | 후속 점검에서 manifest refresh prefix route 재도입 가능성 확인 | matrix runner는 exact ID를 사용하지만 upstream generator의 prefix별 screen route fallback이 남아 있었음 | reviewed UI evidence/verifier/manualUiCaseId를 exact 보존하고 신규 UI mapping의 명시 route 부재를 FAIL 처리하도록 fallback 제거 | contract refresh-preservation check 포함 12/0, feature evidence 974/974 validation 0 PASS |

안정화 실행 결과:

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| Node syntax | coverage/contract 두 `.mjs`의 `node --check` | pass | option/parser/module syntax 확인 |
| coverage generation | `verify-v390-ui-automation-coverage --output-dir /tmp/media_server_v390_ui_coverage_final_v2` | pass | schema v2, 974/424/8/415/1, exact-manual-ui-test-id, prefixRangeClassification removed |
| coverage contract | `verify-v390-ui-automation-coverage-contract` | pass | positive/cross-prefix/refresh/negative/docs 12/0 |
| exact mapped feature verifiers | UI-042/043/069/074/080/107/110 전용 command | pass | 각각 6/0, 4/0, 8/0, 8/0, 9/0, 9/0, 6/0 |
| existing UI runner contract | `verify-v390-ui-automation-runner-contract` | pass | exact visible-DOM runner 9/0 |
| replay guard | `verify-v390-ui-automation-report-replay-guard` | pass | summary/artifact false-PASS guard 8/0 |
| actual summary replay | `verify-v390-ui-automation-report --summary docs/release-artifacts/v3.9.0/ui-automation-visible-dom-final/summary.json` | pass | 보존 actual 8-case replay 7/0 |
| native adapter contract | `verify-v390-ui-native-adapter-contract` | pass | native Playwright/provenance 7/0 |
| implementation evidence | `verify-feature-implementation-evidence` | pass | 974/974, validation 0, negative 11/11 |
| feature/project/script inventory | coverage 6/0, project 14/0, script 11/0 | pass | exact mapping/dispatch/options 확인 |
| docs/release/evidence gate | docs links 0 failure, release evidence 8/0, evidence/test gate 9/0 | pass | 문서/오판 방지 경계 확인 |
| acceptance compatibility | `verify-v390-test-acceptance-bundle-contract` | pass | 기존 bundle orchestration 6/0 |
| diff hygiene | `git diff --check` | pass | 최종 출력 없음 |

완료 경계와 남은 gap:

- Matrix integrity와 actual 8-case artifact 재검증은 완료했습니다.
- `unsupported-manual` 415개는 exact test ID/route/control-action/verifier 연결과 미지원
  사유가 기록된 `not-run` gap이며 PASS가 아닙니다.
- `UI-018`은 positive product UI 자동화 비대상이지만 manual negative route 확인은 유지합니다.
- exact UI test ID 424개 전체 UI 풀테스트 직접 조작, 실제 30분/120분, published metadata, release action은
  미실행이며 이 단계 PASS로 대체하지 않습니다.

임시 산출물 cleanup:

| 경로 | 삭제 전 크기 | 조치 | 결과 |
| --- | ---: | --- | --- |
| `/tmp/media_server_v390_ui_coverage_dev` | 148KB | 초기/보강 matrix summary/report 삭제 | 경로 없음 |
| `/tmp/media_server_v390_ui_coverage_final` | 152KB | 최종 재현 가능 summary/report 삭제 | 경로 없음 |
| `/tmp/media_server_v390_ui_coverage_regenerate` | 152KB | EOF 형식 수정 후 재생성 산출물 삭제 | 사용자 명시 승인 후 경로 없음 |
| `/tmp/media_server_v390_ui_coverage_dev_v2` | 696KB | exact-ID v2 개발/문서 재생성 summary/report 삭제 | 경로 없음 |
| `/tmp/media_server_v390_ui_coverage_final_v2` | 696KB | exact-ID v2 최종 안정화 summary/report 삭제 | 경로 없음 |
| `/tmp/media_server_v390_ui_coverage_final_exact` | 696KB | manifest refresh 보정 후 최종 exact-ID summary/report 삭제 | 경로 없음 |
| contract `/tmp` workdir | process-exit cleanup | positive/negative fixture 자동 삭제 | `media_server_v390_ui_coverage_contract_*` glob 0개 |
| 8081/8555 listener | 없음 | 직접 확인 | listener 0개 |

테스트 사용량: token start `526159`, token end `1079640`, token consumed `553481`,
elapsed `796초`, source `Codex goal usage` (V390-ADD1-10 최종 snapshot과 Step 25
cleanup blocker 기록 직후 최종 goal snapshot 차이).

exact-ID correction 안정화 사용량: token start `313188`, token end `496236`,
token consumed `183048`, elapsed `931초`, source `Codex goal usage` (최종 안정화 시작 전과
manifest refresh 회귀 보정·전체 companion gate·cleanup 완료 직후 snapshot 차이). 이 값은 UI 풀테스트/30분/120분 실행
사용량이 아닙니다.

## V390-ADD1-12 Policy v4 테스트 정책 전환 개발 기록

- `AGENTS.md` 7.6.3: UI 풀테스트를 다섯 번째 영역으로 늘리지 않고 UI 영역 안에서
  `direct-browser`, `qualified-native-automation`, `hybrid` evidence mode를 정의했습니다.
  exact case 동등성과 전체 suite PASS를 분리하고 fixture/wrapper/static/API/screenshot-only/
  legacy replay/부분 coverage의 승격을 금지합니다.
- `test/fixtures/ui_fulltest_evidence_policy_v4.json`: 네 영역, 세 evidence mode, allowed
  completion oracle, exact-selector boundary, source/build/policy/manifest/runner fingerprint,
  artifact/redaction/visual/suite closure를 `media-server.ui-fulltest-evidence-policy.v4`로
  고정했습니다.
- `scripts/internal/ui_fulltest_evidence_policy_v4_lib.mjs`: case별 role·viewport·theme,
  trusted interaction, completion oracle, assertion, actual PNG/JSON/log hash/type/realpath containment,
  symlink escape, redaction, visual baseline, replay, cleanup, current source binding을 판정합니다.
- `scripts/internal/verify_ui_fulltest_evidence_policy_v4.mjs`: policy validation과 actual evidence
  qualification을 분리합니다. 현재 legacy v1 summary와 424/8/415/1 coverage를 읽어
  `partial-automation-evidence`, `evidenceEligibility=ineligible`, `uiFulltestPass=false`를
  출력합니다. `--require-eligible`일 때만 미적격 evidence를 command FAIL로 처리합니다.
- `scripts/internal/verify_ui_fulltest_evidence_policy_v4_contract.mjs`: contract-only scoped case와
  exact 424 suite 알고리즘을 검증하고 legacy/fixture/fallback/manual intervention/partial coverage/
  동일 pre-existing state/role-theme-viewport drift/path escape/symlink/hash/fake PNG/redaction/
  visual/replay/cleanup negative를 거부합니다. Contract fixture는 실행 evidence가 아닙니다.
- `server.sh`, manual UI 기준서/checklist/result template, release policy, stream verification,
  project inventory `OPS-169`/`SAFE-202`, release records/evidence index, implementation manifest를
  Policy v4 vocabulary와 command로 연결했습니다. Historical evidence는 소급 변경하지 않았습니다.

실패와 수정 이력:

| 순서 | 최초 실패 | 원인 | 수정 | 재검증 |
| --- | --- | --- | --- | --- |
| 1 | `verify-ui-fulltest-evidence-policy-v4` exit 1, unknown command | Policy v4 evaluator/dispatch 구현 전 RED | policy fixture/lib/evaluator/contract와 `server.sh` dispatch 추가 | evaluator PASS, contract 10/0 |
| 2 | `verify-manual-ui-evidence` 20/4, `verify-v390-evidence-test-gate-prep` 8/1 | 기존 verifier가 인앱/직접-only pre-v4 정확 문구를 고정 | verifier를 evidence-mode/qualifier/completion-oracle 기준으로 정렬 | manual 24/0, evidence/test 9/0 |
| 3 | manifest refresh 후 현재 스텝 외 source anchor 6개 churn | heuristic refresh가 기존 reviewed owner보다 route/verifier anchor를 재선택 | inventory SHA와 OPS-169/SAFE-202만 남기고 unrelated anchor 복원 | feature evidence 974/974 validation 0, negative 11/11 |
| 4 | feature evidence에서 `SAFE-202` source anchor missing | 새 contract source anchor 문자열 선택 오류 | 실제 보존 output boundary 문자열로 exact anchor 수정 | feature coverage 6/0, project inventory 14/0 |
| 5 | 후속 감사에서 artifact symlink escape와 current source/build binding 보강 필요 | lexical containment와 hash 형식만으로 realpath/current revision을 증명할 수 없음 | realpath containment, symlink negative, version/commit/worktree patch/build path+hash 비교 추가 | Policy v4 contract 10/0 재통과 |

안정화 실행 결과:

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| Policy v4 evaluator | `./server.sh verify-ui-fulltest-evidence-policy-v4` | pass | policy PASS; current evidence partial/ineligible, `uiFulltestPass=false` |
| Policy v4 negative contract | `./server.sh verify-ui-fulltest-evidence-policy-v4-contract` | pass | 10/0, contract fixture는 실행 evidence 아님 |
| manual/evidence policy gates | `verify-manual-ui-evidence`, `verify-v390-evidence-test-gate-prep` | pass | 24/0, 9/0 |
| implementation/inventory | feature implementation, feature coverage, project inventory, script inventory | pass | 974/974 validation 0 negative 11/11; 6/0; 14/0; 11/0 |
| existing UI compatibility | coverage contract, runner contract, replay guard, actual summary replay, native adapter contract | pass | 12/0, 9/0, 8/0, 7/0, 7/0 |
| release compatibility | acceptance contract, stabilization readiness, feature completion, release evidence | pass | 6/0, 7/0, 13/0, 8/0 |
| docs/diff | `verify-docs-links`, `git diff --check` | pass | link failures 0, diff 출력 없음 |

완료 경계:

- Policy v4 기준과 qualifier 구현은 완료했습니다.
- 현재 v3.9 보존 automation은 legacy schema v1, exact 8/424, unsupported 415,
  positive UI 제외 1이므로 Policy v4 대체 적격 0, 전체 UI 결과 FAIL입니다.
- 424-case actual UI 풀테스트, 30분/120분, published metadata, release action은 이번 단계에서
  실행하지 않았고 Policy v4 gate PASS로 대체하지 않습니다.
- 제품 C++/API/schema/Event payload/WebRTC/SSE/WS/RTSP/WebRTC media path/Auth/Role/Scope는
  변경하지 않았습니다.

임시 산출물 cleanup:

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
| `/tmp/media_server_policy_v4_debug` | evaluator debug JSON/Markdown | 8KB | 결과 수치 확인 후 삭제 | 경로 없음 | `test ! -e` PASS |
| `/tmp`/`/private/tmp` `media_server_ui_policy_v4_contract_*` | contract positive/negative fixture | process-exit cleanup | contract `finally` 삭제 | glob 0개 | 최종 `find` 출력 없음 |
| 8081/8555 listener | 없음 | 0 | 확인 | listener 0개 | `lsof -nP ... -sTCP:LISTEN` 출력 없음 |

후속 이슈: 없음. 추천 분석 모델: GPT-5.5 높음. 선정 근거: Policy v4 계약, verifier,
문서 source-of-truth, false-PASS negative와 historical evidence 경계를 교차 검증한 뒤 현재
스텝 내부 결함을 모두 수정했습니다.

## v3.9.0 (18) 실제 구현 재검토 잔여 로드맵 19~35

이 섹션은 2026-07-11 전체 정적 재검토에서 문서의 `완료` 표기를 evidence로 사용하지 않고
실제 C++/JavaScript/shell route, 저장 경계, UI action, verifier 제어 흐름을 직접 대조한
결과입니다. 테스트 실행은 재검토 범위에서 제외했습니다. 따라서 아래 항목은 테스트 FAIL이
아니라 **source 구현 자체에서 직접 확인된 미완성, 오판 가능성, 계약 불일치**입니다.

이 섹션은 기존 `V390-ADD1-01`~`V390-ADD1-12`와 Evidence/Closure 13~18 뒤에 이어지는
현재 active roadmap입니다. 19~35가 닫히기 전에는 `v3.9.0 테스트 제외 개발 전체 완료`,
`전 기능 exact closure`, `Policy v4 UI 자동화 완료`, `final evidence eligible`을 보고하지 않습니다.

| 번호 | ID | 구간 | 제목 | 우선순위 | 상태 | 개발 내용 | 추천 모델 | 추론 수준 | 선정 근거 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 19 | V390-REVIEW2-19 | Foundation | current entry baseline gate 정렬 | P0 | 완료 | `v390_entry_baseline_state_lib.mjs`와 단일 expectation fixture가 backlog Step 1~3 상태를 구조적으로 읽고, 독립 contract가 current positive·historical wording·missing·duplicate를 판정하며 acceptance가 동일 entry command를 사용함 | 5.6 Sol | 높음 (high) | 영향도 2, 불확실성 0, 검증 난이도 0, 변경 범위 0, 총 2점이나 release correctness 직접 영향으로 Sol/high 상향 |
| 20 | V390-REVIEW2-20 | Feature Closure | 984행 semantic implementation closure | P0 | 완료 | v2 manifest가 984행 exact handler/route/control/action/state/assertion locator와 reviewer-bound unique digest를 검증하고, 자동 closure·generic-alone·wrong/unrelated/drift/ID-only/unapproved를 거부 | 5.6 Sol | 매우 높음 (xhigh) | 2+2+2+2=8점, 전 기능 정확도·동등성 상향 적용 |
| 21 | V390-REVIEW2-21 | Product Correctness | Analysis Registry durable write contract | P0 | 완료 | profile/rule/VA rule/VLM profile create·update·delete가 atomic persist-before-publish를 사용하고 parent/open/write/flush/rename 실패를 HTTP 5xx로 전파하며 memory/file/restart no-change를 보장 | 5.6 Sol | 매우 높음 (xhigh) | 2+1+2+2=7점, 데이터 손상·거짓 성공 위험 상향 적용 |
| 22 | V390-REVIEW2-22 | UI Policy | Policy v4 canonical 424 exact-ID binding | P0 | 완료 | canonical v1 manifest 424행을 implementation evidence hash·ordered test/feature ID·route·selector/action anchor에 묶고 evidence requested/observed role·viewport·theme까지 exact 대조하며 합성 424개와 hash-valid drift를 거부 | 5.6 Sol | 매우 높음 (xhigh) | 2+1+2+1=6점, 거짓 UI fulltest PASS 위험 상향 적용 |
| 23 | V390-REVIEW2-23 | UI Policy | Policy v4 evidence attestation 강화 | P0 | 완료 | evidenceRef v1이 completion/visual/cross-cutting/redaction 실파일의 contained path·bytes·SHA-256·type·case/correlation을 대조하고 PNG CRC/IDAT decode, trace/payload schema, 독립 secret scan으로 자기선언 PASS를 거부 | 5.6 Sol | 매우 높음 (xhigh) | 2+2+2+2=8점, 정확도·보안·false-PASS 상향 적용 |
| 24 | V390-REVIEW2-24 | UI Automation | exact 424 native automation case 구현 | P0 | 완료 | `v390_ui_native_exact_cases.json`이 canonical ordered 424개를 423 native-executable+UI-018 negative-route로 고정하고 unsupported 0, raw API→product screen 정규화, Playwright-native action/oracle seed/artifact plan과 외부 role-state actual runner를 제공. actual 424 UI 실행과 Step 26 eligibility는 미실행 | 5.6 Sol | 매우 높음 (xhigh) | 2+2+2+2=8점, 대량 cross-version UI 구현 |
| 25 | V390-REVIEW2-25 | UI Automation | no-op action false-PASS 차단 | P0 | 완료 | 공용 completion evaluator가 action별 before/after DOM digest, expected endpoint-correlated network+DOM, persisted readback, EventRecord, server-log를 판정하고 pre-existing visible text/no-op/unrelated response/action 미실행을 거부. Exact 424 pending 0, legacy UI-108~115 actual 8/8과 replay guard 재검증 | 5.6 Sol | 매우 높음 (xhigh) | 2+1+2+1=6점, 거짓 PASS 위험 상향 적용 |
| 26 | V390-REVIEW2-26 | Acceptance | Policy v4 full-suite eligibility 통합 | P0 | 완료 | 공용 evaluator가 actual acceptance PASS, canonical ordered 424, fail/not-run/unsupported/unapproved exclusions/manual intervention 0, Policy v4 source summary hash와 `uiFulltestPass=true`를 독립 요구하고 8-case·plan-only·fixture·forged evaluation을 ineligible로 유지 | 5.6 Sol | 매우 높음 (xhigh) | 2+1+2+1=6점, release false-PASS 상향 적용 |
| 27 | V390-REVIEW2-27 | Evidence | stale placeholder artifact 제거·재바인딩 | P0 | 완료 | tracked placeholder 39개/1,443B를 제거하고 6개 stale root를 audit-only historical로 격리했습니다. REVIEW3-47에서 current 기본 입력을 native 423+negative 1/unsupported 0 readiness와 pass 0/not-run 424 execution으로 교정했습니다 | 5.6 Sol | 높음 (high) | 2+0+1+1=4점, evidence 정확도 상향 적용 |
| 28 | V390-REVIEW2-28 | Product Correctness | VLM reload full-contract quarantine | P0 | 완료 | save/reload가 공용 canonical envelope validator를 사용하고 restart에서 digest·activation·privacy·forbidden field·runtime side effect·invariant·schema·provider/model·unsafe ID 9종 변조를 reason과 함께 quarantine | 5.6 Sol | 매우 높음 (xhigh) | 2+2+2+2=8점, 보안·데이터 무결성 상향 적용 |
| 29 | V390-REVIEW2-29 | Product Correctness | VLM incident provenance server canonicalization | P0 | 완료 | rule save 전에 active/archive EventRecord와 observation sidecar/ruleSuggestion을 조회해 event/source/observation/candidate/evaluation provenance를 exact 대조하고 forged·duplicate·deleted record를 persist 전 no-write 거부 | 5.6 Sol | 매우 높음 (xhigh) | 2+2+2+2=8점, provenance 정확도·보안 상향 적용 |
| 30 | V390-REVIEW2-30 | Product Correctness | ONVIF byte-exact transaction rollback | P0 | 완료 | source/view paired save 전 존재·raw bytes·mode snapshot을 캡처하고 교체된 파일만 atomic restore/remove하여 unknown extension/format과 source-only/view-only 존재 상태를 보존하며 rollback failure를 partialSave로 정확히 보고 | 5.6 Sol | 매우 높음 (xhigh) | 2+2+2+2=8점, 데이터 손상 위험 상향 적용 |
| 31 | V390-REVIEW2-31 | Long-run | parent/delegated phase ledger 정합성 | P0 | 완료 | parent runner가 `server-start-queue-256`/`integrated-smoke`/soak cases/`main-runtime-idle` 이후 runtime steps를 nested summary에서 exact projection하며 실행 전 synthetic PASS를 남기지 않고 첫 delegated 실패를 해당 parent phase FAIL로 기록 | 5.6 Sol | 높음 (high) | 2+1+2+1=6점, 테스트 결과 정확도 상향 적용 |
| 32 | V390-REVIEW2-32 | Re-ID | NoOp fallback runtime state 정합성 | P1 | 완료 | NoOp이 `Enabled=false`와 disabled/noop/zero stats를 일관되게 반환하고 TrackStateManager의 Enabled guard가 readiness fallback의 worker start, crop/update, async queue를 차단하며 runtime smoke가 모든 counter 0을 확인 | 5.6 Terra | 높음 (high) | 1+1+1+1=4점, 단일 subsystem runtime 정합성 |
| 33 | V390-REVIEW2-33 | Structure | readiness dependency graph 검증 | P1 | gate 준비 완료 | fixture의 mayDependOn/allowed direction을 exact 상호 검증하고 실제 146개 src/include graph·73개 CMake cpp, legacy core→ingress 3-edge/SCC baseline, new forbidden edge/cycle negative, slice dependency를 검사. 실제 legacy 제거/refactor는 미실행 | 5.6 Sol | 높음 (high) | 1+2+2+1=6점, 구조 전면 리팩토링 진입 gate |
| 34 | V390-REVIEW2-34 | Inventory | bridge·count·anchor reconciliation | P1 | 완료 | v3.5~v3.8 `UI-080`~`UI-107`+CLIENT 8개 총 36개 route/control/action/state 전수 대조와 middle omission negative, current manifest 산출 30분 50/50·120분 7/7, 986/986 semantic reviewed unique digest와 12개 current locator review를 완료 | 5.6 Terra | 중간 (medium) | 1+1+1+1=4점, 문서·manifest 정합성 작업 |
| 35 | V390-REVIEW2-35 | Truthfulness | owner/field/structure 상태 표현 정정 | P1 | 완료 | owner=`decision-record`/implementation not-executed, field=`conditional-not-run`/PASS false, structure=`gate-ready`/refactor not-executed를 machine-readable fixture·roadmap·evidence에서 통일하고 overclaim negative 3종으로 검증 | 5.6 Terra | 중간 (medium) | 1+1+1+0=3점, 상태·evidence 진실성 정리 |

### 19~35 상세 구현 계약

#### V390-REVIEW2-19 current entry baseline gate 정렬

- 직접 문제: `verify_v390_entry_baseline.mjs`가 과거 Step 3 exact 문장을 요구했지만 현재 backlog는
  `완료/initial snapshot historical/current closed` 상태여서 current acceptance bundle의 필수
  feature gate가 실행 전부터 결정적으로 실패했습니다.
- 구현 위치:
  - `test/fixtures/v390_entry_baseline_steps.json`: Step 1~3의 ID, 제목, priority, current status,
    historical/current detail boundary를 단일 expected state로 고정했습니다.
  - `scripts/internal/v390_entry_baseline_state_lib.mjs`의 `parseV390ProgressTable()`과
    `validateV390EntryBaselineSteps()`: `### v3.9.0 진행 상태` 표를 column/row 구조로 parse하고
    누락·중복·status/detail drift를 판정합니다.
  - `scripts/internal/verify_v390_entry_baseline.mjs`: 과거 Step 3 전체 문자열 고정을 제거하고
    공용 validator를 호출하며 `verify_v390_test_acceptance_bundle.mjs`가 같은
    `verify-v390-entry-baseline` command를 사용하는지 확인합니다.
  - `scripts/internal/verify_v390_entry_baseline_contract.mjs`, `server.sh`: current backlog positive,
    과거 exact wording, 누락 Step, 중복 Step negative 4개와 독립 dispatch를 추가했습니다.
- RED/검증: 최초 contract는 공용 library 미구현으로 `ERR_MODULE_NOT_FOUND` exit 1이었고,
  구현 후 contract 4/0과 entry baseline 13/0을 통과했습니다. 최종 companion 안정화 결과는
  `docs/release-test-records.md`에 보존합니다.
- 경계: C++ 제품 동작, API/schema/Event payload/WebRTC/SSE/WS/RTSP/WebRTC media path,
  Auth/Role/Scope를 변경하지 않았습니다. 30분/120분/UI 풀테스트/published metadata/release
  action은 실행하지 않았습니다.

#### V390-REVIEW2-20 984행 semantic implementation closure

- 직접 문제: 기존 generator가 검색 점수가 높은 substring을 owner로 선택하고 모든 item에
  `status=closed-with-evidence`를 자동 부여했으며, validator는 tracked file 안 `includes(anchor)`만
  확인했습니다. 실제 `UI-002 /setup`은 `/password`로 오매핑됐고 generic/shared anchor가 반복됐습니다.
- 구현 위치:
  - `scripts/internal/feature_semantic_evidence_lib.mjs`: exact file/symbol/line/context hash locator,
    route dispatch, product control selector 또는 비대상 사유, action handler, state oracle,
    handler→action→state relation, semantic verifier assertion, 행별 digest와 explicit reviewer approval을
    생성·검증합니다. include/comment anchor와 manifest 자기 참조를 owner로 사용하지 않습니다.
  - `scripts/internal/feature_implementation_manifest_lib.mjs`: schema를
    `media-server.feature-implementation-evidence.v2`로 전환하고 일반 refresh는 신규/변경 행을
    `review-required`로 유지합니다. 이미 승인된 동일 row/digest는 보존하지만 source context drift는
    read-only validator에서 FAIL합니다.
  - `scripts/internal/verify_feature_implementation_evidence.mjs`: reviewer/date/reason을 모두 요구하는
    명시 approval flow와 semantic reviewed/unique digest summary를 추가했습니다.
  - `scripts/internal/verify_feature_semantic_closure_contract.mjs`, `server.sh`: 984행 positive와
    `UI-002 /setup` 교정, wrong handler, same-file unrelated anchor, route/action/state drift,
    generic-alone, ID-only assertion, unapproved review negative 10개를 독립 검증합니다.
  - `verify_feature_inventory_coverage.mjs`, `verify_v390_ui_automation_coverage.mjs`와 contract,
    project inventory, stream verification, durable UI coverage matrix가 v2 semantic source를 소비합니다.
- 직접 결과: 984/984 `semantic-reviewed`, unique semantic digest 984/984, validation error 0,
  legacy negative 11/11, semantic contract 10/10입니다. `UI-002`는
  `WebRtcHttpServer::Start`의 `/setup` dispatch, `SetupPageHtml`,
  `[data-testid="auth-setup-form"]`로 연결됩니다. feature coverage는 984/984, UI matrix는
  exact 424개·automated 8·unsupported 415·positive exclusion 1 경계를 유지합니다.
- 실패/수정: 최초 RED는 semantic library 부재로 `ERR_MODULE_NOT_FOUND`였고, 첫 approval validation은
  UI 간접 8행의 backend file이 product UI owner로 남아 error 8이었습니다. UI 직접/간접 owner를
  함께 보정하고 route-owner mismatch를 재감사한 뒤 validation 0으로 재승인했습니다.
- 경계: `coverageStatus=covered`와 semantic closure는 실행 evidence가 아닙니다. UI 풀테스트,
  30분/120분, published metadata, release action은 실행하지 않았고 제품 C++/API/schema/media path를
  변경하지 않았습니다.

#### V390-REVIEW2-21 Analysis Registry durable write contract

- 직접 문제: `UpsertVlmProfile`, `UpsertRule` 등은 메모리를 변경한 뒤 반환값 없는
  `SaveLocked()`를 호출합니다. open/write/flush 실패는 stderr만 남기고 API 성공을 반환합니다.
- 구현: `src/ingress/webrtc_http_server.cpp`의 `WriteAnalysisRegistryFileAtomically`이 same-directory
  temp file 전체 write, file `fsync`, `rename`과 실패 temp cleanup을 담당합니다.
  `AnalysisDocumentRegistry::PersistAndPublishLocked`는 profile/rule/VA rule/VLM profile의 candidate
  snapshot을 durable 저장한 뒤에만 vector를 publish합니다. create/update/delete 전 경로가
  `AnalysisRegistryMutationResult`를 반환하며 `AnalysisRegistryMutationErrorResponse`가 persistence
  failure를 HTTP 500, code `analysis-registry-persistence-failed`, safe stage로 매핑합니다.
- 전용 검증: `./server.sh verify-v390-analysis-registry-durable-write`가 profile/rule/VA rule/VLM profile의
  create/update/delete와 parent/open/short-write/flush/rename 장애 주입을 actual HTTP로 실행합니다.
- route 범위: `/lab/analysis/profiles/{id}`, `/lab/analysis/rules/{id}`,
  `/lab/analysis/va-rules/{id}`, `/ops/api/vlm/profiles/{id}`의 mutation failure path를 변경했고
  기존 validation 400, not-found 404 경계는 유지했습니다.
- 직접 결과: 전용 verifier mutation 12개, failure stage parent/open/write/flush/rename, HTTP 5xx,
  memory/file/restart no-change, temp 0, failures 0. `verify-analysis-state` 178/0,
  `verify-ops-rules-roundtrip` 전체 PASS, VA replay 15개 baseline, VA events 31/0,
  focused in-app `verify-rule-ui` PASS를 확인했습니다.
- 후속 보정: current inventory를 986개, UI 비대상 550개, 안정화 대상 976개로 정렬하고
  semantic manifest 986/986 재승인, project inventory 14/0, feature coverage 986/986,
  UI coverage contract 12/0, acceptance contract 8/0, stabilization readiness 7/0으로 닫았습니다.
- 경계: focused rule UI smoke는 Policy v4 424 exact-ID 전체 UI 풀테스트 PASS가 아닙니다.
  30분/120분 longrun, published metadata, release action, external field smoke는 실행하지 않았습니다.

#### V390-REVIEW2-22 Policy v4 canonical 424 exact-ID binding

- 직접 문제: 기존 contract의 full-suite candidate는 `CONTRACT-001`~`CONTRACT-424` 합성 ID와
  `{count: 424}`만 든 hash 대상 manifest로 `uiFulltestPass=true`가 됐습니다. evaluator는 manifest
  내용을 파싱하지 않아 reviewed 424 exact UI ID와 route/action/variant를 대조하지 않았습니다.
- 구현 위치:
  - `test/fixtures/ui_fulltest_case_manifest_policy_v4.json`: implementation evidence의 exact
    `manualUiCaseId` 424개를 ordered `testId`/`featureId`/route/control selector/action anchor에 묶고
    case별 canonical role/390x844 viewport/light theme를 보존합니다.
  - `ui_fulltest_evidence_policy_v4_lib.mjs`의 `loadCanonicalCaseBinding()`은 summary가 hash로 제시한
    manifest 경로·schema·count·implementation evidence 실파일/hash를 확인하고 424개 source row를
    직접 다시 파싱해 ID/feature/route/control-action drift를 거부합니다.
  - 각 evidence case는 canonical feature ID와 requested route/role/viewport/theme/control-action이
    같아야 하며 requested/observed도 기존 계약대로 같아야 합니다. full-suite는 canonical ordered
    ID 전수와 exact count가 모두 일치해야 합니다.
- RED/검증: 새 negative contract의 최초 실행은 합성 ID suite가 PASS해 `pass=10 fail=1`이었습니다.
  구현 후 canonical full-suite positive와 합성 ID, field drift 6종, hash-valid manifest drift를 포함해
  Policy v4 contract `14/0`, implementation evidence `986/986` validation 0·negative `11/11`, UI coverage
  contract `12/0`, project inventory `14/0`, feature coverage `986/986`·`6/0`을 통과했습니다.
- 실패/수정: 테스트 정의 행 추가 뒤 implementation manifest의 inventory hash가 stale해 첫 companion
  실행이 validation error 1로 중단됐습니다. feature/semantic row 변경 없이 inventory hash와 canonical
  manifest의 implementation hash만 갱신하고 실패 경계부터 재실행해 validation error 0으로 닫았습니다.
- 경계: contract fixture의 canonical 424 PASS는 실제 브라우저 실행 evidence가 아닙니다. current 실제
  summary는 legacy v1, automated 8/unsupported 415/excluded 1이므로 `uiFulltestPass=false`입니다.
  30분/120분, published metadata, release action은 실행하지 않았습니다.

#### V390-REVIEW2-23 Policy v4 evidence attestation 강화

- 직접 문제: completion/visual/cross-cutting `evidenceRef`는 문자열 존재만 검사했고 case/suite
  redaction은 `PASS`와 findings 0 자기선언을 신뢰했습니다. Screenshot은 PNG signature 8 bytes만,
  trace/browser console은 임의 JSON이면 통과해 artifact와 case/correlation의 실질 연결이 없었습니다.
- 구현 위치:
  - `ui_fulltest_evidence_policy_v4.json`은 case 필수 artifact에 visual diff/redaction scan을 추가하고
    evidence ref, interaction trace, browser console, cross-cutting, redaction scan schema와 16MiB 한계,
    authorization/bearer/secret/RTSP/raw-debug forbidden pattern을 고정합니다.
  - `ui_fulltest_evidence_policy_v4_lib.mjs`의 `validateEvidenceRef()`는 artifact root containment,
    bytes/SHA-256/content type/case/correlation과 max size를 실파일에서 검증합니다. Completion ref는
    trace artifact, visual ref는 visual diff, case redaction ref는 redaction scan artifact와 exact 연결됩니다.
  - PNG validator는 IHDR/IDAT/IEND chunk 경계와 CRC를 확인하고 IDAT를 inflate해 scanline/filter와
    decoded size를 검증합니다. Trace는 trusted interaction, completion oracle, network response correlation,
    visual/cross-cutting/redaction은 payload schema와 screenshot/case-set/artifact hash를 대조합니다.
  - evaluator는 scan JSON과 별도로 case artifact 및 모든 attested ref 파일을 forbidden pattern으로
    재스캔해 summary `PASS/0`이 실제 secret material을 가리지 못하게 합니다.
- RED/검증: 기존 문자열 ref/자기선언 candidate가 attested failure reason 없이 통과해 최초 contract가
  `14/1`로 실패했습니다. 구현 후 canonical positive와 문자열 ref, PNG header-only, forged trace,
  case correlation drift, hash-valid visual/cross-cutting payload, 실제 bearer/authorization 삽입, forged
  redaction output과 attested server-log oracle positive를 포함한 contract `17/0`을 통과했습니다.
- 실패/수정: 첫 companion은 build 100% 뒤 manual result template의 기존 exact wording이 바뀌어
  `policyValidationResult=FAIL`로 중단됐습니다. 새 attestation wording에 기존 verifier anchor를 함께
  보존하고 실패 경계부터 재실행해 Policy v4 PASS, manual UI `24/0`, evidence prep `9/0`으로 닫았습니다.
- 직접 결과: implementation evidence `986/986` validation 0·negative `11/11`, UI coverage contract
  `12/0`, project inventory `14/0`, feature coverage `986/986`·`6/0`, script `11/0`, release evidence
  `8/0`, docs links failures 0, build 100%, JS syntax와 `git diff --check`를 통과했습니다.
- 경계: contract의 실제 decode/attestation fixture는 제품 브라우저 실행이 아닙니다. current summary는
  legacy v1, automated 8/unsupported 415/excluded 1이라 `uiFulltestPass=false`이며 30분/120분,
  published metadata, release action은 실행하지 않았습니다.

#### V390-REVIEW2-24 exact 424 native automation case 구현

- 직접 문제: legacy runner와 coverage policy는 `UI-108`~`UI-115` 8건만 native case로 허용하고
  exact 424개 중 415건을 `unsupported-manual`, `UI-018`을 positive UI exclusion으로 고정했습니다.
  Canonical manifest의 38건은 `/ops/api/*`·`/client/api/*` raw endpoint를 screen route처럼 가리켜
  그대로 browser navigation을 허용하면 raw JSON/API-only false-PASS가 될 수 있었습니다.
- 구현 위치:
  - `v390_ui_native_exact_cases_lib.mjs`가 Policy v4 canonical manifest와 reviewed semantic
    implementation evidence를 exact ordered ID로 결합합니다. `/ops/api/events/reviews`→`/ops/events`,
    source/onvif API→`/ops/sources`, client events API→`/client/events`, audit API→`/ops/users`로
    product screen을 정규화하며 prefix/range selection을 사용하지 않습니다.
  - `v390_ui_native_exact_cases.json`은 424개 각 case의 feature ID, canonical/product route,
    requested role/viewport/theme, Playwright-native navigate/wait/interact plan, semantic state-oracle seed,
    screenshot/trace/browser-console/server-log artifact plan을 명시합니다. 결과는 423 native-executable,
    `UI-018` negative-route 1, unsupported 0입니다.
  - `run_v390_ui_native_exact_cases.mjs`는 actual mode에서 native Playwright, role별 storage state,
    first-fail/later not-run, case artifact를 사용합니다. `--plan-only`는 실행 계획만 검증하고
    `actualBrowserExecution=false`, `uiFulltestPass=false`를 보존합니다.
  - `verify_v390_ui_native_exact_cases.mjs`와 contract, `server.sh`가 deterministic generation,
    exact order/count, API route, negative route, unsupported, role/viewport/theme/oracle/artifact drift를 검증합니다.
- RED/검증: 테스트 정의 후 첫 contract는 library 부재 `ERR_MODULE_NOT_FOUND` exit 1로 실패했습니다.
  구현 후 첫 contract는 raw API negative가 기대 문구보다 앞선 product-route drift로 거부돼 `6/1`이었고,
  raw API 거부 순서를 명시한 뒤 `7/0`으로 통과했습니다. 커밋 전 후속 점검에서 `SAFE-017`의
  `/lab` 404 동작이 `/ops` 정규화 뒤 사라진 결함을 찾아 product screen 진입 후 native
  `navigate-negative`/404 oracle을 추가했고 최종 contract `8/0`으로 닫았습니다. Plan-only runner는
  424/unsupported 0과 `uiFulltestPass=false`를 기록했습니다.
- companion 실패/수정: Step 24 inventory mapping 추가로 implementation manifest source hash가 stale해
  첫 `verify-project-inventory`가 `13/1`로 중단됐습니다. 986개 semantic row/digest/review는 그대로 두고
  inventory hash, canonical implementation hash, exact native manifest source binding만 갱신한 뒤
  project inventory `14/0`으로 재통과했습니다.
- 경계: historical 8-case actual evidence, coverage policy `8/415/1`, Policy v4 current ineligible 결과,
  acceptance/final integrity는 Step 26 전까지 변경하지 않습니다. Actual exact 424 UI 풀테스트,
  30분/120분, published metadata, release action은 실행하지 않았습니다.

#### V390-REVIEW2-25 no-op action false-PASS 차단

- 직접 문제: Step 24 runner는 action 실행과 visible target만 확인해 click이 실제로 상태를 바꾸지 않아도
  pre-existing text로 PASS할 수 있었습니다. 첫 보강은 action 이후 모든 network response를 같은
  correlation ID로 묶어 dashboard background fetch 51개 중 unrelated response도 completion이 될 수 있었습니다.
- 구현 위치:
  - `v390_ui_completion_oracle_lib.mjs`의 `domSnapshotDigest()`와 `evaluateCompletionOracle()`이
    native action 실행 여부/dispatch, before/after digest, expected endpoint pattern과 일치하는 2xx/3xx
    action-window response+visible DOM, persisted digest change, EventRecord, server-log correlation을 판정합니다.
    동일 digest+기존 visible text, wrong URL/correlation, action 미실행은 `no-correlated-completion` 또는
    `action-not-executed`로 FAIL합니다.
  - `v390_ui_native_adapter.mjs`는 navigation response, response method/status/URL, exact selector의
    visible text/value/checked/selected/url snapshot을 제공합니다.
  - Exact runner는 각 action trace에 beforeDigest/afterDigest/networkResponses/completion source를 기록하고
    case manifest가 허용한 source가 하나도 없으면 실패합니다. Exact 424 oracle은 201 correlated-action,
    221 navigation-network-DOM, UI-018 negative 1, SAFE-017 cross-route negative 1이며 pending 0입니다.
  - Legacy `verify_v390_ui_automation.mjs`와 8-case manifest는 UI-108~115 각각의 기대 endpoint를 고정하고
    visible assertion과 별도로 completion PASS를 요구합니다. Report verifier/replay guard도 oracle field,
    digest 변화, endpoint/correlation을 다시 읽어 누락·no-op·wrong URL summary를 거부합니다.
- RED/검증: 테스트 정의 후 첫 contract는 library 부재 `ERR_MODULE_NOT_FOUND` exit 1이었습니다.
  첫 구현 contract는 runner source에 completion digest field 보장 검사가 없어 `8/1`이었고, 두 runner가
  before/after/network fields를 실제 assert하도록 보강해 최종 completion contract `9/0`을 통과했습니다.
- 실제 targeted 자동화: sandbox 실행은 loopback port 18239~18438 bind 불가로 browser/server 시작 전에
  실패했습니다. 승인된 로컬 loopback 재실행은 native Playwright 1.61.1, fallback=false, UI-108~115
  8/8, cleanup/ports PASS였습니다. Broad temporal network 결함을 찾아 case별 endpoint pattern으로 보강한
  뒤 다시 8/8 PASS했고 각 case는 기대 endpoint 1개만 `network-dom` completion으로 보존했습니다.
- replay/inventory 후속: actual summary report `7/0`, replay negative contract `9/0`을 통과했습니다.
  Step 25 inventory mapping 추가로 첫 project inventory는 hash drift `13/1`이었고 986 semantic row/digest/review를
  유지한 채 inventory/canonical/native source binding만 갱신해 재검증합니다.
- 경계: targeted UI-108~115 8건은 exact 424 UI 풀테스트가 아닙니다. Actual exact 424, 30분/120분,
  published metadata, release action과 Step 26 full-suite eligibility는 실행하지 않았습니다.

#### V390-REVIEW2-26 Policy v4 full-suite eligibility 통합

- `scripts/internal/v390_full_suite_eligibility_lib.mjs`가 acceptance execution mode/result와
  canonical manifest의 ordered 424 IDs, Policy v4 qualification count/ID, actual browser execution,
  pass 424, fail/not-run/unsupported/unapproved exclusions/manual intervention 0, source summary SHA-256,
  `policyValidationResult=PASS`, `evidenceEligibility=eligible`, `uiFulltestPass=true`를 단일 판정합니다.
- `verify_v390_test_acceptance_bundle.mjs`는 legacy UI replay 뒤 `ui-fulltest-qualification` fixed phase에서
  `verify-ui-fulltest-evidence-policy-v4 --require-eligible`를 실행하며 targeted 8-case가 PASS해도
  `automatedAcceptanceStatus=executed-with-known-ui-closure-blockers`, `finalEvidenceEligible=false`입니다.
- `verify_v390_final_evidence_integrity.mjs`는 summary boolean을 신뢰하지 않고 공용 evaluator를 다시 호출하고,
  Policy v4 source summary의 repository-contained path와 실제 SHA-256을 대조합니다. 기존 stale
  `test-acceptance-final`의 8-case `eligible` summary는 final integrity에서 거부됩니다.
- `verify-v390-full-suite-eligibility-contract`는 canonical positive 알고리즘과 8-case, plan-only/fixture,
  zero-count 5종, Policy-only PASS, duplicate/noncanonical ID, missing source hash negative를 7/0으로
  검증합니다. Contract positive는 actual 424 UI 실행 evidence가 아닙니다.

#### V390-REVIEW2-27 stale artifact cleanup

- `docs/release-artifacts/v3.9.0/historical-invalid-ui-evidence.json`이 placeholder/source drift/duplicate
  screenshot/legacy eligible false-PASS가 있는 6개 root를 audit-only `historical-invalid`로 고정합니다.
  Summary/report/trace는 historical 원문을 다시 쓰지 않았습니다.
- tracked `*.video.txt` fixture placeholder 39개, 1,443B를 삭제했습니다. Current source-of-truth는
  `test/fixtures/v390_ui_current_evidence_state.json`의 `status=not-run`, actual browser false,
  UI fulltest false, native 423+negative 1/unsupported 0 readiness와 pass 0/not-run 424 execution입니다.
- coverage policy/runner/durable matrix, Policy v4 default, acceptance dry-run, native adapter contract가
  current state를 사용합니다. Stale legacy summary override는 missing provenance/current commit/integrity
  검증에서 거부됩니다.
- `verify-v390-current-ui-evidence-contract` 6/0과 coverage contract 12/0이 tracked placeholder 0,
  historical root 전수, active stale binding 0, current readiness/execution 분리를 검증합니다. 실제 UI 재실행은
  승인되지 않아 수행하지 않았고 not-run은 PASS가 아닙니다.

#### V390-REVIEW2-28 VLM reload full-contract quarantine

- 직접 문제: reload canonicalization은 candidate/revision/digest/option/model/prompt binding만 재검증합니다.
  정상 save에서 검사하는 activation, runtime/privacy, forbidden material, contract invariant는 생략됩니다.
- 구현: `src/ingress/webrtc_http_server.cpp`의 `ValidateCanonicalVlmProfileEnvelopeLocked`를 save와
  reload가 공유합니다. Exact top-level schema/ID/object count, safe ID, selected option/provider/model/runtime/privacy,
  cloud/local 조합, privacy guard, server canonical evaluation/provenance, activation, runtime opt-in side effect,
  contract invariant와 forbidden material을 함께 검사한 뒤 실패 profile을 사유와 함께 quarantine합니다.
- 검증: `verify-v390-vlm-promotion-trust-boundary`가 14개 HTTP case와 restart 변조 9종(digest,
  activation, privacy, forbidden field, runtime side effect, invariant, schema, provider/model, unsafe ID)을
  모두 격리하고 정상 profile readback을 보존했습니다. 연관 privacy/runtime 검증기는 event 저장소의
  `rawProviderResponseStored:false` 비저장 증명을 leak로 오판하지 않고 SAFE-024/025 manifest verifier
  binding을 직접 확인하도록 정정했으며 각각 5/0으로 통과했습니다.
- 경계: runtime/provider/sidecar 호출, client/viewer/Event POST/WebRTC/SSE/WS/media schema 변경은 없고,
  UI 풀테스트·30분·120분은 이 항목에서 실행하지 않았습니다.

#### V390-REVIEW2-29 VLM incident provenance canonicalization

- 직접 문제: 현재 rule validator는 provenance field 존재와 몇 개 boolean만 확인하고 실제 observation,
  event, candidate와 대조하지 않습니다.
- 구현: `VlmIncidentProvenanceMatchesServerRecords`가 rule PUT의 persist-before-publish 이전에
  `QueryEventRecords(include_archives=true)`와 `QueryVlmObservations`를 호출합니다. EventRecord의
  event/source, observation의 observation/event/source/original rule/scenario, ruleSuggestion의
  candidate/kind/route/manual-review/no-auto-apply, observation metadata의 provider/model/prompt/privacy를
  server-owned record와 exact 대조하며 relevant field duplicate도 거부합니다.
- 검증: 정상 save/readback/restart 3건, field 변조 15건, duplicate-key 2건, observation/EventRecord 삭제
  2건, generated rule ID/route 2건을 HTTP로 실행해 모든 invalid case의 400/no-write/404를 확인했습니다.
- 경계: 저장 schema와 UI payload를 바꾸지 않았고 auto-save/apply, provider/runtime 호출,
  EventRecord/Event POST/WebRTC/SSE/WS/media schema 변경은 없습니다. `verify-rule-ui`는 in-app browser
  evidence 요구에서 실행 전 중단되어 UI 풀테스트 PASS로 사용하지 않습니다.

#### V390-REVIEW2-30 ONVIF byte-exact rollback

- 직접 문제: second-file 실패 rollback은 transaction 전 file bytes가 아니라 파싱된 `sources_`/`views_`를
  재직렬화합니다. parser가 모르는 확장 필드와 원본 파일 표현은 소실될 수 있습니다.
- 구현: `RegistryFileSnapshot`, `CaptureRegistryFileSnapshot`, `RestoreRegistryFileSnapshot`이 양쪽
  선검증 뒤 첫 write 전에 source/view 실제 파일의 존재 여부, binary bytes, mode를 캡처합니다. 교체 성공한
  파일만 snapshot bytes로 atomic replace한 뒤 mode/file/parent를 fsync하고, 원래 없던 파일은 삭제해
  pre-transaction 존재 상태를 복원합니다. In-memory vectors는 양쪽 commit 뒤에만 publish합니다.
- 검증: actual HTTP/file/restart 13-case가 custom unknown root/item extension, 비정규 whitespace/newline,
  source 0600/view 0640 mode, source-only/view-only, first/second before-replace failure, source rollback
  failure, retry/concurrency/restart/temp cleanup을 확인했습니다. 성공 rollback은 bytes/existence/mode exact,
  주입 rollback 실패는 `rollback-failed`/`manual-recovery-required`/`partialSave=true`로 보고합니다.
- 경계: 기존 paired-save response schema/storageMode는 유지했습니다. Test failure injection은
  `MEDIA_SERVER_ENABLE_TEST_FAILURE_INJECTION=1`일 때만 활성화되며 ONVIF 실기기, UI 풀테스트,
  30분/120분 evidence가 아닙니다.

#### V390-REVIEW2-31 longrun phase ledger

- 직접 문제: parent runner가 nested `verify-predev`를 실행하기 전에 start-server와 integrated-smoke를
  PASS로 기록합니다. delegated failure가 나중에 보존돼도 parent phase 표에는 실행 전 PASS가 남습니다.
- 구현: `verify_v390_server_longrun.mjs`가 delegated 실행 전 `start-server`, `integrated-smoke`,
  `runtime-idle` PASS row를 만들지 않고, predev summary가 생성된 뒤 `server-start-queue-256`을
  `start-server`, exact `integrated-smoke`를 같은 parent phase, `soak-N-*`을 `soak-case-loop`,
  `main-runtime-idle`부터 후속 runtime checks를 `runtime-idle`로 투영합니다. 누락/실패는 PASS가
  아니라 해당 parent FAIL이며 이후 ordinary phase는 `not-run`, cleanup/report만 계속됩니다.
- 검증: `verify-v390-server-longrun-runner-contract` 8/0이 delegated start/smoke/runtime 실패와
  성공 summary를 실행 fixture로 대조해 exact parent FAIL/PASS, later not-run, summary provenance,
  synthetic PASS 부재를 확인했습니다. 실제 30분/120분은 이번 항목에서 실행하지 않았습니다.

#### V390-REVIEW2-32~35 readiness와 상태 정합성

- Re-ID NoOp fallback은 `Enabled()`, `Stats().enabled`, worker start, crop/job enqueue 의미를 하나로 맞춥니다.
  model readiness 실패 상태에서 실제 inference worker와 queue가 활성화되지 않아야 합니다.
- structure readiness verifier는 fixture 배열 길이가 아니라 `mayDependOn`과 allowed direction의 일치,
  실제 include graph forbidden edge, cycle, slice entry/exit gate를 검사합니다.
- v3.5~v3.8 bridge는 범위 양 끝 ID가 아니라 각 UI ID의 route/control/action을 전수 대조합니다.
  inventory summary의 30분 대상 50과 49/49 stale 표를 current manifest에서 자동 산출합니다.
- owner role fixture는 `decision record`, external field는 `조건부 미실행`, structure는 `gate 준비 완료`로
  표기합니다. 실제 구현, field PASS, refactor 완료와 같은 상태값을 사용하지 않습니다.
- 완료 조건: NoOp worker 미기동, forbidden dependency/cycle negative, bridge 중간 ID 누락 negative,
  count 자동 일치, 상태 vocabulary verifier가 각각 독립적으로 PASS해야 합니다.

#### V390-REVIEW2-32 NoOp fallback runtime state

- `NoOpAppearanceExtractor::Enabled()`는 stats의 `enabled=false`와 같은 비활성 의미를 반환합니다.
  readiness 실패 factory가 NoOp을 반환하면 TrackStateManager의 기존 Enabled guard가 worker start,
  appearance input/crop build, async enqueue 전에 종료합니다.
- `analysis_state_smoke.cpp`는 유효 RGB frame과 appearance policy enabled 상태에서도 NoOp manager의
  request/queued/completed/dropped/missing-crop가 모두 0이고 profile이 없음을 실행 검증합니다.
  readiness capability smoke도 no-ONNX factory fallback의 Enabled/stats/counter/Extract를 독립 확인합니다.
- 검증: `verify-v390-reid-readiness-consistency` capability 2 + HTTP 10/failures 0,
  `verify-reid-advanced-tracking` 12/0, `verify-analysis-state` 179/0. 실제 model session,
  identity search, UI 풀테스트, 30분/120분은 미실행이며 이 결과로 대체하지 않습니다.

#### V390-REVIEW2-33 readiness dependency graph

- fixture의 `stable-contract-dtos`/`core-utilities`를 실제 module node로 보강하고 모든
  `mayDependOn` edge와 `allowedDependencyDirections`가 양방향 exact set인지 검증합니다. 각 slice는
  직전 slice ID를 `dependsOnSlice`로 명시해 entry/exit 순서가 문구 해석에 의존하지 않습니다.
- verifier는 `src`/`include` 146개 C++ 파일의 include를 실제 resolve하고, CMake의 production cpp
  73개가 source tree와 정확히 일치하며 test/docs가 target에 들어오지 않는지 검사합니다. 현재 refactor 전
  core→ingress 3-edge와 analysis/core/ingress SCC는 명시적 legacy baseline으로만 허용하며 새 forbidden
  edge와 cycle은 synthetic negative에서 거부합니다.
- 검증: `verify-v390-structure-stabilization-readiness` 7/0. 이는 dependency gate 준비 완료 evidence이고
  legacy edge/cycle 제거, v4.0.0 branch 생성, route/API/UI refactor 완료 또는 UI/longrun PASS가 아닙니다.

#### V390-REVIEW2-34 bridge, count, anchor reconciliation

- `verify-manual-ui-evidence`가 v3.5~v3.8 UI 28개와 관련 CLIENT 8개 총 36개 exact ID를
  current implementation manifest의 handler/route/control/action/state/reviewer digest에 결합합니다.
  범위 양 끝 문자열만 확인하지 않고 `UI-094` 중간 누락 negative를 실행합니다.
- 30분/120분 mapping 표는 current 986-row manifest의 non-null longrun mapping을 산출해 각각
  50/50, 7/7과 inventory summary가 일치해야 합니다. 오래된 49/49 표를 제거했습니다.
- refresh에서 review-required가 된 12개 행을 직접 대조했습니다. `SRC-017`은 generic `client`/
  `PublishedViewJson` 후보를 거부하고 exact `SourceViewRegistry::CreateView`/`PublishedView` occurrence로
  재바인딩했습니다. 나머지는 transaction owner line/occurrence, Policy/VLM/ONVIF contract text,
  manual/structure verifier locator의 current 변동을 확인했습니다. Approval은 pending 12개만 갱신하고
  기존 974개 reviewer provenance를 보존합니다.
- 검증: implementation evidence 986/986, validation 0, negative 11/11; manual bridge 26/0;
  project inventory 14/0; feature coverage 986/986; native exact 424/unsupported 0; Policy v4는
  current actual UI `ineligible`, `uiFulltestPass=false`입니다.

#### V390-REVIEW2-35 truthful status vocabulary

- owner fixture는 `recordKind=decision-record`, `implementationStatus=not-executed`,
  `evidenceStatus=decision-only-not-implementation-evidence`를 사용합니다.
- field fixture와 세 target은 `conditional-not-run`, `condition-record-not-field-pass`이며
  network/endpoint/credential/device/provider/artifact와 field/release PASS claim은 모두 false입니다.
- structure fixture는 `status=gate-ready`, `implementationStatus=not-executed`,
  `gate-contract-not-refactor-evidence`, `refactorEntryReady=false`를 사용합니다.
- `verify-v390-truthfulness-status-vocabulary`는 위 세 상태와 roadmap/evidence wording을 대조하고
  owner implementation `complete`, field `PASS`, structure `refactor-complete` negative를 거부합니다.

### 재검토 등록 시점 경계 (historical)

- 초기 19~35 등록은 개발 완료가 아니라 잔여 이슈의 source roadmap 등록이었습니다.
- 테스트, verifier, build, UI 실행은 이 초기 등록 단계에서는 수행하지 않았습니다.
- 기존 historical PASS와 문서 `완료` 표기는 19~35의 직접 구현 결함을 덮어쓰지 않습니다.
- 각 항목 개발 시 AGENTS 단계 규칙에 따라 구현, 관련 개별 테스트 등록·실행, evidence 기록,
  `git diff --check`, 사용자 커밋 승인을 독립적으로 닫아야 합니다.
- 19~35 전체가 닫히기 전에는 v3.9.0 개발 전체 완료 또는 release readiness를 보고하지 않습니다.

### V390-REVIEW2-26~35 current closure

- 26~35의 구현, 개별 검증, roadmap/evidence 연결과 같은 스텝 후속 감사를 완료했습니다.
- current Policy v4 UI evidence는 `ineligible`, qualified 0, `uiFulltestPass=false`입니다. 실제 UI
  풀테스트와 30분/120분 실행은 이번 goal에서 수행하지 않았으며 contract/fixture PASS로 대체하지 않습니다.
- owner/field/structure의 decision-record, conditional-not-run, gate-ready 상태도 구현/PASS/complete가 아닙니다.
- 2026-07-12 source-level 재감사에서 26~35 일부의 구현 범위가 문서 표현보다 좁음이 확인됐습니다.
  따라서 `추가 구현 후속 이슈 없음`은 historical 판단이며 아래 REVIEW3이 현재 상태를 대체합니다.

## v3.9.0 (19) 2026-07-12 실제 구현 3차 감사와 잔여 로드맵 36~49

이 섹션은 통합 v3.9 순번 `V390-ADD1-01`~`V390-ADD1-12`, Evidence/Closure 13~18,
`V390-REVIEW2-19`~`V390-REVIEW2-35`를 문서의 완료 표기나 과거 verifier PASS를 evidence로
사용하지 않고 source, function, route, UI control, runner, fixture, schema 소비 경로를 직접 대조한
결과입니다. 이번 감사에서는 테스트, build, server, browser, 30분/120분을 실행하지 않았습니다.
따라서 아래 판정은 runtime PASS/FAIL이 아니라 **현재 source 구현의 충분성 판정**입니다.

### 통합 순번 1~35 직접 판정

| 번호 | ID/구간 | 문서상 상태 | 2026-07-12 직접 판정 | 직접 확인 결과/잔여 경계 |
| ---: | --- | --- | --- | --- |
| 1 | V390-ADD1-01 | 완료 | 구현 확인 | 삭제 대상 부재와 current untracked 0 확인. 과거 blob byte 동일성은 현 worktree만으로 재구성 불가 |
| 2 | V390-ADD1-02 | 완료 | 미완성 | 986행 locator/digest는 존재하지만 무관 symbol/control 연결이 있어 전 기능 1:1 의미 closure가 아님 |
| 3 | V390-ADD1-03 | 완료 | 구현 확인 | VLM candidate revision/digest/result/provenance와 option/model/prompt server-owned 검증·저장 경로 존재 |
| 4 | V390-ADD1-04 | 완료 | 구현 확인 | Re-ID 공용 readiness와 NoOp fallback 경계 존재. 실제 model session/inference는 의도적 비범위 |
| 5 | V390-ADD1-05 | 완료 | 구현 확인 | ONVIF paired source/view save와 process 내 보상 rollback 존재. crash journal은 비범위 |
| 6 | V390-ADD1-06 | 완료 | 부분 구현 | acceptance orchestrator는 있으나 기본 8-case summary를 424 gate에 넣고 v4 producer도 없어 current canonical PASS 불가 |
| 7 | V390-ADD1-07 | 완료 | 구현 확인/8-case 한정 | UI-108~UI-115 route/control/artifact case는 존재하나 exact 424 전체 UI 구현이 아님 |
| 8 | V390-ADD1-08 | 완료 | 구현 확인/adapter 한정 | Playwright native wait/click/fill/type/select/screenshot adapter 존재. 전체 기능 workflow와 별개 |
| 9 | V390-ADD1-09 | 완료 | 부분 구현 | source/outerHTML marker는 거부하지만 visibility와 사후 network correlation false-PASS가 남음 |
| 10 | V390-ADD1-10 | 완료 | 구현 확인 | delegated duration case 첫 실패 후 later case not-run과 stderr/context/reproduction 보존 경로 존재 |
| 11 | V390-ADD1-11 | 완료 | 부분 구현 | exact ID 424 집합은 있으나 route/action anchor가 실제 handler/action 결합을 증명하지 못함 |
| 12 | V390-ADD1-12 | 완료 | 부분 구현 | Policy v4 evaluator/contract는 있으나 actual evidence v4 producer와 responsive/theme actual source가 없음 |
| 13 | Evidence integrity | 완료 | 부분 구현 | dedupe/placeholder/first-failure 검사는 있으나 current HEAD 직접 결속과 child path containment가 불충분 |
| 14 | Final re-run/cleanup | historical PASS | current 미완료 | source `8fe583d8` historical run만 있고 current 986/32-command source 재실행은 미실행 |
| 15 | VLM provenance | 완료 | 부분 구현 | observation/EventRecord 대조는 있으나 observation-context-only evaluation과 duplicate JSON key 위험 존재 |
| 16 | Owner sign-off | decision record | 결정 기록 | role 기반 decision만 존재하고 implementation과 실제 개인 owner 승인 evidence는 없음 |
| 17 | Structure readiness | gate 준비 | gate 준비 | `refactorEntryReady=false`, implementation not-executed. 실제 구조 안정화가 아님 |
| 18 | External field | 조건부 미실행 | 조건부 미실행 | endpoint/credential/device/provider contact와 field PASS evidence 없음 |
| 19 | V390-REVIEW2-19 | 완료 | 구현 확인 | backlog Step parser와 missing/duplicate/state drift gate 존재 |
| 20 | V390-REVIEW2-20 | 완료 | 미완성 | 986행 다수가 declaration/shared context locator이며 일괄 reviewer approval로 의미 closure를 대체함 |
| 21 | V390-REVIEW2-21 | 완료 | 부분 구현 | persist-before-publish와 file fsync/rename/HTTP 500은 있으나 rename 후 parent directory fsync 없음 |
| 22 | V390-REVIEW2-22 | 완료 | 부분 구현 | ordered 424/hash binding은 구현됐지만 binding source인 semantic manifest가 신뢰되지 않음 |
| 23 | V390-REVIEW2-23 | 완료 | 부분 구현 | artifact path/hash/type/correlation은 검사하지만 visual PASS는 실제 pixel/baseline 계산이 아님 |
| 24 | V390-REVIEW2-24 | 완료 | 미완성 | 223개 navigation-only, 201개 generic tag action이며 기능별 입력·조작·readback을 구현하지 않음 |
| 25 | V390-REVIEW2-25 | 완료 | 부분 구현 | before/after 동일은 거부하지만 임의 DOM 변화만으로 expected behavior와 무관하게 PASS 가능 |
| 26 | V390-REVIEW2-26 | 완료 | end-to-end 미완성 | exact runner v1 output과 Policy v4 required schema가 달라 native run→qualification→eligible 경로가 끊김 |
| 27 | V390-REVIEW2-27 | 완료 | REVIEW3-47에서 보강 완료 | placeholder 삭제와 historical 격리를 유지하면서 coverage를 native 423+negative 1/unsupported 0 readiness와 pass 0/not-run 424 execution으로 교정하고 current consumer의 audit-only source 사용을 차단 |
| 28 | V390-REVIEW2-28 | 완료 | 부분 구현 | save/reload 공용 validator는 있으나 non-structural first-field parser와 duplicate-key 우회 가능성 존재 |
| 29 | V390-REVIEW2-29 | 완료 | 구현 확인/save-time 한정 | EventRecord/observation provenance 대조와 no-write 존재. restart 시 저장 rule provenance 재대조는 없음 |
| 30 | V390-REVIEW2-30 | 완료 | 구현 확인 | bytes/existence/mode snapshot과 atomic restore/remove 존재. process crash journal은 비범위 |
| 31 | V390-REVIEW2-31 | 완료 | 부분 구현 | synthetic parent PASS는 제거했으나 delegated expected case 전수·중복·순서 검증이 부족 |
| 32 | V390-REVIEW2-32 | 완료 | 구현 확인 | NoOp Enabled/stats/worker/crop/queue disabled 의미가 일치함 |
| 33 | V390-REVIEW2-33 | gate 준비 완료 | gate 준비/부분 구현 | 미래 9-module model이 actual file classifier와 연결되지 않고 실제 graph는 4분류와 일부 edge만 검사 |
| 34 | V390-REVIEW2-34 | 완료 | 부분 구현 | 986/50/7 count와 36개 bridge ID는 맞지만 locator 존재를 의미상 route/control/action closure로 과장 |
| 35 | V390-REVIEW2-35 | 완료 | 부분 구현 | fixture status vocabulary는 맞지만 문서별 독립 위치/claim과 top-level field flag를 전수 검사하지 않음 |

집계: 구현 확인 11, 부분 구현 16, 미완성 4, 결정/gate/조건부 4입니다. `구현 확인`도 이번
정적 감사에서 source 경로가 확인됐다는 뜻이며, 실행하지 않은 테스트 PASS를 뜻하지 않습니다.

위 표는 REVIEW3 구현 전 historical 감사 snapshot입니다. REVIEW3 행의 `완료`도 당시 source
implementation claim일 뿐 current 제품 의미 완료가 아닙니다. REVIEW4-50이 다시 대조한 current
판정의 machine-readable source는 `test/fixtures/v390_review4_truth_reset.json`이며 다음과 같습니다.

- source 구현 확인 18: 1, 2, 3, 4, 7, 8, 13, 15, 19, 20, 27, 28, 29, 30, 31, 32, 33, 35
- source 부분 구현 13: 5, 6, 9, 10, 11, 12, 21, 22, 23, 24, 25, 26, 34
- source 미완성 4: 14, 16, 17, 18

집계: source 구현 확인 18, source 부분 구현 13, source 미완성 4입니다. source 구현 확인은 runtime, UI, 30분, 120분 PASS가 아닙니다. Discovery source 606개는 REVIEW4-50 시점 snapshot이며,
`webrtc_http_server.cpp` 42,897줄, `product_ui_page_scripts.cpp` 10,217줄입니다.

### REVIEW3 잔여 구현 순서

| 번호 | ID | 구간 | 제목 | 우선순위 | 상태 | 개발 내용 | 추천 모델 | 추론 수준 | 선정 근거 |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 36 | V390-REVIEW3-36 | Discovery | 누락 기능과 전체 문서 ledger | P0 | historical source claim / REVIEW4 재검증 | `AGENTS.md` 별도 전문 감사와 tracked Markdown 173개 파일별 full-read SHA-256/classification/status marker/duplicate/action ledger, 606개 source/tooling file marker 분류를 구현했습니다. RulesJson 두 항목은 non-VA 분석 자동부착 `excluded-by-design`, RTSP/WebRTC 장시간 검증 `transferred-to-test-condition`으로 inventory에 등록하고 `notImplementedYet` 응답을 제거했습니다. | 5.6 Sol | 높음 (high) | 영향도 2, 불확실성 2, 검증 난이도 1, 변경 범위 1, 총 6점. 기능 누락 정확도 상향 적용 |
| 37 | V390-REVIEW3-37 | Feature Closure | 986행 semantic closure 전면 재감사 | P0 | 완료 | 자동 token 최고점과 bulk approval API를 제거하고 986개 기능 각각을 content-addressed owner→route/control→action→state→readback→verifier 5-edge chain, 986개 고유 review reason/digest로 재작성했습니다. `SAFE-140`은 v3.5 command workspace owner로, `RULE-017`은 hidden/generated ID save/readback owner와 `verify-ops-client-ui`로 교정했습니다. | 5.6 Sol | 매우 높음 (xhigh) | 2+2+2+2=8점. 전 기능 정확도 직접 영향 |
| 38 | V390-REVIEW3-38 | Persistence | Analysis Registry crash durability | P0 | 완료 | 기존 mode를 temp에 복원하고 file fsync/close→parent directory open→rename→directory fsync 뒤에만 성공합니다. 12 success, 12 mutation×9 fault=108, 12×3 crash=36 actual HTTP/restart matrix와 startup stale-temp recovery를 구현했습니다. | 5.6 Sol | 매우 높음 (xhigh) | 2+1+2+2=7점. 데이터 손상 위험 상향 적용 |
| 39 | V390-REVIEW3-39 | VLM Integrity | 구조적 JSON과 provenance 재검증 | P0 | 완료 | 공용 strict JSON parser로 모든 object scope의 decoded duplicate key와 malformed/trailing JSON을 거부하고 profile/rule의 top-level/nested type을 exact 조회합니다. Profile reload 13종과 rule provenance reload의 forged/duplicate/nested/deleted server-record를 quarantine합니다. | 5.6 Sol | 매우 높음 (xhigh) | 2+2+2+2=8점. provenance·보안·데이터 무결성 상향 적용 |
| 40 | V390-REVIEW3-40 | Long-run | delegated exact phase ledger | P0 | 완료 | expected case ID/order/uniqueness/count를 parent가 검증하고 누락·중복·부분 summary를 PASS로 투영하지 않음 | 5.6 Sol | 높음 (high) | 2+1+2+1=6점. 테스트 결과 정확도 상향 적용 |
| 41 | V390-REVIEW3-41 | UI Automation | exact 424 기능별 native workflow | P0 | 완료 | 424개 각각에 unique workflow와 role/semantic seed, input, explicit control sequence, reviewed state/readback 결과, reversible cleanup을 고정하고 runtime tag 추측을 제거했습니다. Hidden 10개와 disabled/non-action/read-model을 actionable control과 분리합니다. | 5.6 Sol | 매우 높음 (xhigh) | 2+2+2+2=8점. 대량 UI 동등성과 false-PASS 상향 적용 |
| 42 | V390-REVIEW3-42 | UI Correctness | semantic completion oracle | P0 | 완료 | Exact 424의 848 action plan이 request-header에서 실제 관측된 request ID/method/path/status와 case별 exact semantic readback identity를 함께 요구합니다. DOM digest-only와 사후 correlation 부착을 차단하고 persisted/EventRecord/server-log 대안은 attested schema만 허용합니다. | 5.6 Sol | 매우 높음 (xhigh) | 2+2+2+1=7점. 거짓 PASS 정확도 상향 적용 |
| 43 | V390-REVIEW3-43 | UI Policy | Policy v4 actual evidence producer | P0 | 완료 | exact runner actual mode가 `media-server.ui-automation-evidence.v4` summary와 case trace/console/server-log/visual/redaction, suite cross-cutting/redaction attestation을 실행 root에서 직접 생성합니다. 44번 visual 측정과 45번 acceptance-owned cleanup 전에는 `uiFulltestPass=false`입니다 | 5.6 Sol | 매우 높음 (xhigh) | 2+2+2+2=8점. release correctness와 evidence 보안 상향 적용 |
| 44 | V390-REVIEW3-44 | Visual Evidence | responsive/theme/visual 실제 판정 | P0 | 완료 | actual PNG dimension/hash와 browser DOM geometry/computed-style/focus/video-overlay 측정에서 case visual 및 320/390/760/1180×light/dark cross-cutting status를 계산하고 Policy qualifier가 attested input을 재계산합니다 | 5.6 Sol | 매우 높음 (xhigh) | 2+2+2+1=7점. 시각 동등성과 false-PASS 상향 적용 |
| 45 | V390-REVIEW3-45 | Acceptance | canonical one-command 실행 경로 | P0 | 완료 | canonical bundle이 30분→exact 424 v4 producer→throwaway server cleanup→Policy qualification→AGENTS 7.6.2 조건부 120분→cleanup→final integrity를 연결하며 legacy 8-case와 외부 summary 주입을 제거했습니다 | 5.6 Sol | 매우 높음 (xhigh) | 2+1+2+2=7점. release correctness 상향 적용 |
| 46 | V390-REVIEW3-46 | Evidence | current HEAD와 artifact containment | P0 | 완료 | acceptance가 실행 시작/종료 provenance와 canonical command-set hash를 기록하고 final integrity가 이를 현재 HEAD·branch, source-clean state, approved artifact root의 realpath containment, Policy v4 source/build binding과 독립 대조합니다 | 5.6 Sol | 높음 (high) | 2+1+2+1=6점. release correctness 상향 적용 |
| 47 | V390-REVIEW3-47 | Evidence | stale policy/historical artifact 정리 | P1 | historical source claim / REVIEW4 재검증 | coverage policy v4가 exact native manifest의 positive 423+negative route 1/unsupported 0 readiness와 pass 0/not-run 424 execution을 분리하고, current state v2와 Policy/coverage consumer가 `audit-only-historical` source kind/root를 거부합니다 | 5.6 Sol | 높음 (high) | 1+1+1+1=4점이나 evidence 정확도 상향 적용 |
| 48 | V390-REVIEW3-48 | Structure | actual module dependency graph | P1 | 완료 | actual C++ 148개/CMake cpp declared 74·default active 73를 9 owner와 single `media_server` target에 연결하고 32 include direction witness hash, external link, target 위반 25 direction, legacy core 역의존 3 edge, 8-owner SCC, mixed ownership과 6 slice entry/exit를 검증합니다 | 5.6 Sol | 높음 (high) | 1+2+2+1=6점. 구조 전면 안정화 진입 정확도 상향 적용 |
| 49 | V390-REVIEW3-49 | Structure Decision | 구조 안정화 실행 범위 확정 | P1 | 완료 decision / 구현 미실행 | 48번 actual graph의 25 target 위반, 8-owner SCC, single target, 42,897-line HTTP server와 10,217-line UI script를 근거로 v3.9는 graph/guard/decision-only, 실제 refactor는 explicit 승인 뒤 v4.0.0 ordered slice로 이관합니다 | 5.6 Sol | 높음 (high) | 2+2+1+1=6점. 광범위 구조 변경과 release 경계 상향 적용 |

### REVIEW3 상세 구현 계약

#### V390-REVIEW3-36 discovery prerequisite

- strict `모든 문서 파악` evidence는 저장소의 Markdown 173개 각각에 분류, 전문 확인 여부,
  current logic 불일치, 중복/복잡도, 조치를 기록하는 ledger입니다. 8개 source group의 `checked` 문구나
  파일 glob만으로 전수 검토를 완료 처리하지 않습니다.
- `AnalysisDocumentRegistry::RulesJson()`이 노출하는 `automatic rule matching for non-VA streams`와
  `long-running RTSP/WebRTC route matching validation`을 completion inventory에 등록하고 v3.9 구현,
  구조 단계 이관, excluded 중 하나로 사용자 승인받습니다.
- 완료 조건: 문서와 source incomplete marker 전수 ledger에서 미분류 항목이 0이고, 확정된 기능 수와
  project inventory/semantic manifest expected row 수가 일치해야 37번으로 넘어갑니다.

구현 기록(2026-07-12):

- `scripts/internal/verify_v390_review3_discovery_ledger.mjs`가 `AGENTS.md`와 나머지 tracked
  Markdown 173개를 각각 끝까지 읽고 byte count/SHA-256/classification/status marker/exact
  paragraph duplicate/action을 `test/fixtures/v390_review3_discovery_ledger.json`에 고정합니다.
- 동일 verifier가 `src`, `include`, `scripts/internal`, `server.sh` 604개 파일의 explicit
  incomplete marker를 파일/행/context hash/disposition으로 기록하고 미분류 0을 강제합니다.
- `AnalysisDocumentRegistry::RulesJson()`의 non-VA 자동 분석 부착은 제품 분석 경계를 유지하기
  위해 제외했고, RTSP/WebRTC 장시간 route matching은 기능이 아니라 AGENTS 7.6.2 조건부 120분
  검증으로 이관했습니다. 두 결정은 feature row delta 0이며 inventory/semantic manifest는 986행을
  유지합니다. 이번 단계에서 장시간 실행 PASS를 주장하지 않습니다.

#### V390-REVIEW3-37 semantic closure

- 현재 결함 예시: `SAFE-140`의 v3.5 command workspace action owner가 무관한
  `OpsV380ClientNoticeDraftQueueJson`으로 연결되고, `RULE-017` state owner가 일반
  `ExtractObjectField`로 연결됩니다. locator/hash가 맞아도 기능 의미가 맞지 않습니다.
- generator는 신규/변경 행을 자동 approve하지 않습니다. reviewed owner symbol과 실제 call/dispatch/data-flow
  관계를 machine-readable edge로 기록하고, verifier는 그 edge를 source에서 확인합니다.
- 완료 조건: 986행 개별 reviewer reason이 기능별로 구체적이고, generic/shared/unrelated owner,
  same-file token, bulk approval, ID-only verifier가 모두 negative fixture에서 FAIL합니다.

구현 기록(2026-07-12):

- `scripts/internal/feature_semantic_evidence_lib.mjs`의 closure schema v2가 986행 각각에
  content-addressed `owner`, `routeControl`, `action`, `state`, `readback` role과 고정된 5개
  edge, 기능/기대 동작/role symbol/chain digest를 포함한 고유 review reason을 요구합니다.
- `scripts/internal/feature_implementation_manifest_lib.mjs`에서 token score/owner score 기반
  `bestEvidence` 경로를 제거했습니다. Refresh는 승인된 call-chain이 source와 일치하면 보존하고,
  drift가 있으면 해당 행만 `review-required`로 남기며 새 행을 자동 선택하지 않습니다. 동일
  reason을 전체 행에 넣는 bulk approval API/CLI도 제거했습니다. 과거 자동 selector의 공개
  entry도 명시 오류로 봉쇄해 개별 검토 v2 chain 외 생성 경로를 허용하지 않습니다.
- `SAFE-140`은 `AppendOpsDashboardPage` → `/ops` dispatch → `OpsV350CommandPlanJson` →
  `OpsV350StagedChangePlanImpactPreviewJson` → command workspace verifier로 교정했습니다.
  `RULE-017`은 hidden `opsEventRuleIdInput` → `opsRulesSaveNativeRecord` → `setOpsGeneratedId` →
  `opsRulesGeneratedIdExpression`과 `verify-ops-client-ui` readback으로 교정했습니다.
- `verify-feature-implementation-evidence`는 986/986 call-chain, 986 unique digest/reason,
  missing chain, duplicate reason, unrelated SAFE-140, generic RULE-017 negative를 검사합니다.
  `verify-feature-semantic-closure-contract`는 19개 positive/negative contract를 독립 확인합니다.
- semantic manifest 변경에 종속된 Policy v4 canonical/native 424 binding은
  `verify-v390-ui-native-exact-cases --update-canonical-binding`으로 implementation hash와 exact
  route/control을 동기화합니다. Source line 전체를 실행 artifact에 복제하지 않고 API anchor 또는
  검토 action symbol만 사용하며 Policy v4 contract 17/0, native contract 8/0으로 재검증했습니다.
  이 결과는 semantic source closure이며 제품 실행/UI 풀테스트/30분/120분 PASS가 아닙니다.

#### V390-REVIEW3-38 Analysis Registry crash durability

- Analysis Registry atomic replace는 file fsync 뒤 rename뿐 아니라 parent directory fsync까지 완료한 뒤
  success를 publish합니다. 기존 mode를 보존하고 crash point별 recovery contract를 둡니다.

구현 기록(2026-07-12):

- `WriteAnalysisRegistryFileAtomically`은 기존 target의 regular-file mode를 `lstat`으로 읽고 새 temp에
  `fchmod`합니다. Temp 전체 write/file fsync/close 뒤 parent를 `O_DIRECTORY`로 열고, rename 뒤
  `fsync(directory_fd)`까지 성공해야 HTTP 성공과 in-memory candidate publish가 가능합니다.
- rename 이전 `parent/open/mode/write/flush/close/directory-open/rename` 실패는 target bytes,
  memory GET, restart state와 mode를 보존합니다. Rename 뒤 `directory-flush` 실패는 durable 여부가
  불확정이므로 HTTP 500을 반환하되 이미 교체된 candidate를 memory와 맞춰 process 내 불일치를 막습니다.
- `EnsureLoadedLocked`는 target filename의 `.tmp.<pid>.<attempt>` stale regular file/symlink만 시작 시
  제거합니다. `after-temp-fsync` crash는 이전 target을 복구하고 stale temp를 제거하며,
  `after-rename`/`after-directory-fsync` crash는 완전한 candidate를 reload합니다.
- `test/fixtures/v390_analysis_registry_durable_write/cases.json` v2와 actual HTTP verifier가 profile/rule/
  VA rule/VLM profile create·update·delete 12개를 9개 fault stage 전체와 3개 crash point 전체에 교차해
  정상 성공 12개와 fault/crash 각각 108/36개를 검사하고 mode `0640`, valid JSON,
  unrelated collection 불변, temp 0을 확인합니다.
- Inventory 갱신 뒤 semantic refresh가 `SAFE-217`/`OPS-184` 두 행만 `review-required`로 만든 것을
  확인하고, targeted `--migrate-review3 --review-ids SAFE-217,OPS-184`로 실제
  `PersistAndPublishLocked`/HTTP error route/writer/recovery/readback chain과 새 기대 동작만 명시
  재검토했습니다. 나머지 984개 reviewed chain은 변경하지 않았습니다.
  실제 UI 풀테스트와 30분/120분은 이번 단계에서 실행하지 않습니다.

#### V390-REVIEW3-39 structural JSON and reload provenance

- VLM profile/rule parser는 구조화된 JSON parser로 exact top-level/object scope와 duplicate key를 거부합니다.
  저장 시뿐 아니라 reload 시 canonical provenance가 현재 EventRecord/observation과 일치하는지 검증합니다.

구현 기록(2026-07-12):

- `include/ingress/strict_json.h`, `src/ingress/strict_json.cpp`에 C++17 strict object parser를 추가했습니다.
  문서 전체 소비, 최대 depth, JSON number/string escape/Unicode surrogate, trailing byte를 검증하고 decoded
  key 기준으로 각 object scope의 duplicate를 거부하며 exact top-level string/bool/object/null 조회를 제공합니다.
- VLM profile save/reload의 schema/id/provider/model/runtime/privacy/prompt/evaluation/activation/runtimeContract/
  privacyGuard/invariants 조회를 structural field API로 교체했습니다. Forbidden material도 문자열 포함이 아니라
  실제 JSON key로 판정하며 nested shadow가 top-level authority를 대체할 수 없습니다.
- VLM provenance rule save는 전체 rule JSON을 strict parse하고 `vlmProvenance`가 top-level object일 때만
  event/candidate/evaluation/generatedRule scope를 exact type으로 읽습니다. Duplicate key와 nested-only
  provenance는 400/no-write로 거부합니다.
- `AnalysisDocumentRegistry::EnsureLoadedLocked`는 저장된 provenance rule 각각을 현재 active/archive
  EventRecord와 VLM observation/ruleSuggestion에 다시 대조하고 forged/duplicate/nested scope 또는 삭제된
  observation/EventRecord에 의존한 rule을 memory GET에서 quarantine합니다. 외부 API schema는 변경하지 않았습니다.
- `verify-v390-vlm-promotion-trust-boundary` v2는 기존 14 HTTP, structural save 7, reload quarantine 13을,
  `verify-v390-vlm-incident-rule-provenance`는 정상 3, forged 15, duplicate 3, nested-only 1,
  reload valid/invalid 5, reload deleted-record 2, 기존 deleted/binding 4를 actual HTTP로 검증했습니다.
- Inventory refresh에서 drift가 드러난 `UI-018`, `AUTH-041`, `MEDIA-005`, `LAB-126`, `SAFE-017`,
  `SAFE-213`, `OPS-173`, `OPS-180` 8개 행은 자동 승인하지 않고 actual negative route/auth scope/WebRTC
  offer/strict VLM save·reload chain으로 개별 재검토했습니다. 986개 unique call-chain/digest/reason과
  semantic contract 27/0을 확인했습니다.
  UI 풀테스트·30분·120분·provider/runtime field 실행은 미실행입니다.

#### V390-REVIEW3-40 delegated exact phase ledger

- longrun parent는 expected delegated case manifest와 summary를 ID/order/count/uniqueness로 대조합니다.
  한 개 soak row 또는 일부 runtime row만 존재하는 summary는 PASS가 아닙니다.
- `verify_v390_server_longrun.mjs`는 `media-server.v390-delegated-phase-ledger.v1`을 parent summary와
  Markdown report에 기록합니다. Fixed `build`/start/smoke/external gate, iteration 1부터 연속하는 soak
  5-case(`va-events`→`event-post-schema`→`event-post-recovery`→`redaction`→`runtime-idle`), main/queue
  runtime, ports cleanup, report의 전역 순서와 global unique ID를 검증합니다.
- 각 parent phase는 expected/observed ID와 count, valid/error를 별도 보존합니다. Predev summary의
  pass/fail/skip/notRun counter와 실제 step 결과를 다시 계산하고, 성공 ledger의 required case는
  pass(비활성 build/external/redaction은 skip), 첫 실패 뒤 ordinary case는 not-run이어야 합니다.
- Contract RED에서 event-post case가 빠진 partial summary가 parent PASS로 투영되는 기존 결함을 8/1로
  재현했습니다. 최종 9/0은 2개 완전 soak iteration과 complete failed-soak ledger를 positive로,
  partial/missing/duplicate/reordered/unknown/result/notRun/counter mismatch를 negative로 확인합니다.
- 실제 30분/120분 longrun은 이 단계에서 실행하지 않았으며 fixture/contract PASS로 duration evidence를
  대체하지 않습니다.
- 완료 조건: 38~40 각각의 failure matrix와 negative contract가 독립적으로 닫힌 뒤 UI/acceptance 구현으로
  넘어갑니다. 세 항목은 병렬 개발 가능하지만 각 항목은 별도 완료 evidence를 가집니다.

#### V390-REVIEW3-41~45 exact UI와 Policy v4

41번 구현 기록(2026-07-12):

- `verify-v390-ui-native-exact-cases-contract`는 424개 각각의 unique workflow ID, role/seed setup,
  case input, explicit control sequence, expected result, persisted/local cleanup을 검증합니다.
- runner와 manifest의 `runtime-control`/generic `interact`를 금지하고, hidden control은 hidden assertion,
  disabled/non-action element는 명시적 상태/read-model assertion으로만 처리합니다.
- exact contract와 plan-only runner만 실행하며 실제 Policy v4 exact 424 browser fulltest, 30분, 120분은
  별도 실행 승인 전 미실행입니다.
- v2 manifest는 424 navigate와 `route-read-model` 220, visible read-model 130, form contract 16,
  hidden 10, explicit fill/select/toggle 38, details 2, enabled/disabled/seeded/link 9,
  SAFE-017 cross-route negative 1을 exact count로 고정합니다. UI-018은 독립 negative route입니다.
- Contract RED는 v1 manifest의 workflow 부재를 `8/1`로 재현했습니다. 최종 `10/0`은 workflow
  누락·중복, generic action, 미분류 selector를 거부합니다. Plan-only는 424 not-run과
  `uiFulltestPass=false`를 유지했고 native adapter는 sandbox bind EPERM 최초 실패 뒤 동일 명령 외부
  재시도에서 7/7 PASS였습니다.

- 현재 exact manifest는 424개 모두 390x844/light이며 223개가 route-root navigation-only입니다.
  201개 interaction 중 대부분은 case별 endpoint가 없고 runtime element tag에 따라 임의 동작합니다.
- 각 case는 필요한 seed/account/role/scope, 입력값, control sequence, expected endpoint/status,
  persisted cleanup을 명시합니다. 예를 들어 hidden `#opsEventRuleIdInput`은 visible action control로
  사용하지 않고 hidden 상태 자체를 geometry/visibility assertion으로 확인합니다.
- actual runner는 requested 값을 observed로 복사하지 않고 browser URL, role session, viewport,
  media query/theme, control visibility와 action 결과를 실제 관측합니다.
- `media-server.ui-automation-evidence.v4` summary, screenshot/trace/console/server log, visual diff,
  redaction scan, cross-cutting evidence를 한 실행 root에 생성합니다. 1x1 PNG와 fixture status PASS는
  actual evidence가 될 수 없습니다.
- completion oracle은 단순 input value 변화가 아니라 case가 선언한 제품 결과를 확인합니다.
  request correlation은 action request에 연결된 URL/method/request ID 또는 readback identity를 사용합니다.
- 완료 조건: repo-native one command가 exact 424와 cross-cutting을 실행하고 Policy v4 eligible summary를
  생성해 acceptance가 외부 수작업 summary 없이 소비할 수 있어야 합니다. 첫 실패 뒤 later case는
  not-run이며 재현 command와 cleanup을 남깁니다.

42번 구현 기록(2026-07-12):

- Exact manifest의 424 navigate와 primary/negative action을 합한 848개 action plan에
  `media-server.v390-ui-semantic-completion.v1` request/readback contract를 고정했습니다.
- Native adapter는 `x-media-server-correlation-id`를 request header로 전송하고 response에서 생성한
  request ID, header correlation source, method, URL, status를 기록합니다. Runner는 수집 뒤 correlation
  ID를 덧붙이지 않으며 exact path/status와 readback identity/value가 함께 맞아야 `endpoint-dom`입니다.
- Exact 424 runner뿐 아니라 targeted `UI-108`~`UI-115` actual 경로도 action 직전에 같은 header를
  설정하고 exact API path+visible assertion readback을 결합합니다. Fixture-only synthetic summary는
  actual evidence가 아니며 실제 8-case UI 자동화 실행은 별도 승인 전 미실행입니다.
- Persisted readback, EventRecord, server log 대안은 각각 schema, correlation source/ID, identity,
  request/record/log 위치와 digest를 검증합니다. Exact manifest는 `dom-transition`과 legacy
  `network-dom`을 allowed source로 사용하지 않습니다.
- 최초 RED는 arbitrary DOM 변화만으로 semantic action이 PASS하는 결함을 `9/1`로 재현했습니다.
  최종 contract 13/0은 header correlation/readback positive와 synthetic correlation, request ID,
  method/path, readback ID/value, weak attestation negative 및 848개 action plan을 검증했습니다.
- Native adapter actual 단기 실행은 correlation request `GET /` 200과 7/7 action을 확인했습니다.
  Plan-only는 424 not-run과 `uiFulltestPass=false`를 유지합니다. 실제 exact 424 UI 풀테스트·30분·120분은
  별도 실행 승인 전 미실행입니다.

43번 구현 기록(2026-07-12):

- `v390_ui_policy_v4_evidence_producer.mjs`가 actual exact result와 source binding을 입력받아
  `media-server.ui-automation-evidence.v4` summary를 직접 작성합니다. Case screenshot은 actual runner
  artifact를 그대로 참조하고 trace, browser console, server-log slice, visual 상태, redaction scan을
  attested ref/hash/type/path로 묶습니다. Suite redaction과 7개 cross-cutting payload도 같은 run root에
  생성합니다.
- Producer는 artifact root 밖 absolute/relative/symlink 경로를 거부하고 forbidden-material scan 결과를
  case/suite security에 기록합니다. Native adapter는 Policy v4가 요구하는 실제 `snapshot`/assertion
  경계를 `query`/`assert` capability로 명시합니다.
- Standalone exact runner는 외부에서 공급된 server lifecycle을 소유하지 않으므로
  `serversStopped=false`, `portsClean=false`를 정직하게 기록합니다. 44번 actual pixel/geometry 전에는
  visual/cross-cutting을 `FAIL`, `reviewRequired=true`로 남기며 `uiFulltestPass=false`입니다.
- 테스트 정의 등록 뒤 최초 `./server.sh verify-v390-ui-policy-v4-producer-contract`는 command 부재로
  `알 수 없는 명령` RED였습니다. 구현 뒤 contract 5/0이 v4 schema/source binding, case/suite attestation,
  visual/cleanup 비승격, contract fixture 비승격, artifact path escape 거부를 확인했습니다.
- 실제 exact 424 browser UI 풀테스트, 30분, 120분은 실행하지 않았으며 contract PASS로 대체하지 않습니다.

44번 구현 기록(2026-07-12):

- Native adapter가 actual browser의 viewport/device pixel ratio/theme, document overflow, target rect,
  effective foreground/background, visible video/overlay bounds와 8-step keyboard focus order/indicator를
  `media-server.ui-browser-visual-measurement.v1`로 수집합니다.
- `v390_ui_visual_evidence.mjs`는 PNG IHDR dimension/hash와 measurement hash를 결속하고 horizontal
  overflow·target clipping, WCAG contrast threshold, focus indicator/order, ready video와 overlay containment를
  계산해 `media-server.ui-visual-baseline-diff.v2` PASS/FAIL을 만듭니다. 입력 status 문자열은 받지 않습니다.
- Exact runner는 case마다 measurement를 생성하고, 별도 320/390/760/1180×light/dark actual browser matrix를
  실행하도록 연결했습니다. Producer는 matrix screenshot/measurement/visual 24개 attested ref에서 7개
  cross-cutting payload를 산출합니다.
- Policy v4 verifier는 visual payload의 PASS를 신뢰하지 않고 case 및 cross-cutting attested screenshot,
  measurement, visual payload를 다시 읽어 status/geometry/contrast/focus/video-overlay/matrix를 재계산합니다.
- 테스트 정의 등록 뒤 최초 visual contract는 command 부재로 `알 수 없는 명령` RED였습니다. 최종 visual
  contract 5/0은 8개 viewport/theme variant와 clipping·저대비·focus·overlay·dimension negative를 확인했고,
  Policy v4 contract 18/0은 low-contrast visual과 measurement-ref 없는 cross-cutting 자기선언 PASS를 거부했습니다.
- 실제 exact 424 browser UI 풀테스트, 30분, 120분은 실행하지 않았으며 fixture/contract PASS로 대체하지 않습니다.

45번 구현 기록(2026-07-12):

- `verify-v390-test-acceptance-bundle`의 canonical stage를 preflight→build→feature gates→30분→
  exact 424 native runner→explicit throwaway UI server/PID/HTTP·RTSP cleanup→Policy v4 qualification→
  AGENTS 7.6.2 조건부 120분 decision/run→cleanup→final integrity→report로 교체했습니다.
- Canonical 경로에서 legacy `verify-v390-ui-automation` 8-case/replay와 `--ui-fulltest-summary` 외부 주입을
  제거했습니다. Exact child summary를 qualifier가 직접 소비하고 final integrity도 같은 command 안에서
  provisional/final summary를 독립 재검증합니다.
- 120분은 더 이상 actual preflight의 무조건 조건이 아니며 AGENTS 7.6.2 직접 trigger와 실행 승인이
  함께 있을 때만 `--run-120`으로 선택합니다. Flag 자체는 trigger가 아니며 trigger 없는 flag는 거부합니다.
  Actual exact UI는 loopback throwaway URL, role-state map, server log, 명시 PID와 HTTP/RTSP port,
  contained temp root를 요구하고 media_server identity·port ownership을 확인한 뒤 종료/port/artifact
  before/after cleanup을 attestation에 반영합니다.
- Screenshot content dedupe를 exact case/matrix artifact 생성 전에 적용해 final artifact duplicate를 막고,
  final integrity는 v4 exact child의 424 coverage와 visual measurement/diff artifact를 인식합니다.
- 강화한 acceptance contract 최초 실행은 old 8-case/외부 summary/120 강제/stage mismatch로 4/5 RED였습니다.
  구현 뒤 9/0이 canonical source, fixed order, first-fail, conditional 120, cleanup/final-integrity fixture를
  확인했습니다. Fixture/dry-run은 실제 30분, exact 424 UI, 120분 evidence가 아닙니다.

#### V390-REVIEW3-46~47 final evidence integrity

- final evidence는 summary 안 commit 형식만 확인하지 않고 실행 직전/직후 `HEAD`, dirty state,
  command set과 source binding을 직접 기록합니다. child artifact는 approved run root 밖을 참조할 수 없습니다.
- current coverage/evidence policy는 actual manifest 존재와 not-run 상태를 모순 없이 표현하고 historical
  artifact는 audit-only path로만 접근합니다.
- 46번은 current HEAD/run root 검증을 구현하고, 47번이 stale policy/historical binding을 정리한 뒤
  두 항목을 함께 재검증합니다. 이 단계 전 historical PASS를 current final evidence로 사용하지 않습니다.

46번 구현 기록(2026-07-12):

- `collectSourceProvenanceWithAllowedArtifacts`가 실행 종료/current 상태의 HEAD·branch, 전체 status hash,
  approved artifact root 내부 path와 source tree의 unapproved dirty path를 분리합니다. Actual acceptance는
  시작 clean뿐 아니라 종료/current 시점에도 artifact root 밖 변경이 0이어야 합니다.
- Acceptance summary는 9개 canonical command의 순서·명령·status와 SHA-256을 기록합니다. Final integrity는
  exact 30분, exact 424 native, throwaway server cleanup, Policy v4, 조건부 120분, final integrity command를
  자체 expected set과 대조해 legacy command 치환이나 summary 안 hash 동시 위조를 허용하지 않습니다.
- Acceptance summary/run root, 30분·UI·120분 child summary, Policy v4 source summary와 UI artifact root는
  존재하는 실제 파일/디렉터리의 realpath로 approved output root 안에 있어야 합니다. UI evidence의
  `gitCommit`도 current HEAD와 같아야 하며 path traversal/symlink escape를 허용하지 않습니다.
- 강화 계약의 최초 실행은 HEAD drift/unapproved dirty, canonical command 대체/hash mismatch, child path
  escape 3건이 검출되지 않아 6/3 RED였습니다. 구현 후 final integrity contract 9/0과 acceptance contract
  9/0이 통과했습니다. 실제 30분, exact 424 browser UI 풀테스트, 120분은 실행하지 않았습니다.

47번 구현 기록(2026-07-12):

- Coverage policy/summary를 v3으로 올리고 `v390_ui_native_exact_cases.json`의 424개를 implementation 및
  Policy v4 canonical manifest와 exact ID/feature/canonical route/role/viewport/theme로 대조합니다. Positive
  native-executable 423개와 `UI-018` negative-route 1개가 모두 workflow를 가지며 unsupported는 0입니다.
- Current state v2는 readiness 423+1/unsupported 0과 execution pass 0/fail 0/not-run 424/unsupported 0을
  별도 필드로 기록하고 두 canonical manifest의 SHA-256을 결속합니다. Readiness PASS를 actual UI PASS로
  승격하지 않으며 current UI fulltest는 계속 `not-run`/false입니다.
- Historical manifest v2는 `sourceKind=audit-only-historical`, `consumerPolicy=deny-current-evidence`입니다.
  Coverage runner는 realpath가 6개 historical root 아래면 schema보다 먼저 거부하고 Policy qualifier는
  `audit-only-historical-denied`/`uiFulltestPass=false`와 denial reason을 기록합니다.
- 강화 current contract의 최초 실행은 state/historical schema 두 건이 없어 3/2 RED였습니다. 최종 current
  contract 6/0, coverage contract 12/0, Policy v4 contract 18/0이 통과했습니다. `SAFE-212`/`OPS-169`/
  `OPS-179` source drift도 targeted review로 986개 semantic-reviewed 상태를 복구했습니다. 실제 exact 424
  browser UI 풀테스트, 30분, 120분은 실행하지 않았습니다.

#### V390-REVIEW3-48~49 structure entry decision

- structure verifier는 미래 module fixture와 실제 파일 graph를 같은 node identity로 연결합니다.
- 구조 안정화는 현재 readiness 문서만 있고 실제 source extraction은 없습니다. 현재
  `src/ingress/webrtc_http_server.cpp` 42,897줄과 `product_ui_page_scripts.cpp` 10,217줄 상태를 기준으로
  48번 actual dependency graph를 먼저 확정한 뒤 v3.9 안정화에서 수행할지 v4.0에서 수행할지 결정합니다.
  결정 전 `구조 안정화 완료`를 보고하지 않습니다.

48번 구현 기록(2026-07-12):

- `v390_actual_module_dependency_graph.json`은 `src`/`include`의 `.cpp`/`.h` 148개를 9개 declared
  owner에 ordered exact/container rule로 분류합니다. Owner별 file/cpp count와 전체 ownership SHA-256을
  고정하고 unclassified file, exact owner precedence, count/hash drift를 거부합니다.
- CMake production cpp는 declared 74/default YouTube OFF active 73이고 단일 `media_server` executable에 들어가며 internal module target
  separation은 false입니다. 8개 optional external link edge와 9 owner target membership을 검사합니다.
- Actual cross-module include direction은 32개이며 각 direction의 witness count/hash를 고정했습니다.
  목표 mayDependOn 밖 direction 25개, legacy core→transport/application/domain exact edge 3개와 8-owner
  SCC 1개를 current debt로 기록합니다. 새 target-violation/link edge와 SCC drift negative를 거부합니다.
- `webrtc_http_server.cpp` 42,897줄, `product_ui_page_scripts.cpp` 10,217줄, composition root의 mixed
  responsibility를 primary owner와 별도 debt로 기록하고 6개 refactor slice의 actual entry owner/exit rule을
  결속했습니다. 최초 schema 강화는 6/1 RED, 최종 readiness는 7/0입니다. 실제 refactor는 미실행입니다.

49번 결정 기록(2026-07-12):

- `v390_structure_execution_scope_decision.json`은 issue 48 actual graph 파일의 schema/SHA-256과
  148 file, declared 74/default active 73 cpp, 9 owner, target 1, target 위반 25, largest SCC 8,
  42,897/10,217 line mixed-owner 값을 직접 결속합니다.
- Release line refactor threshold는 target 위반 0, SCC owner 1, mixed file 15,000줄 이하, separated
  internal target 필요입니다. 네 factor가 모두 `defer`이므로 decision은
  `defer-actual-refactor-to-v4.0.0`, v3.9 mode는 `graph-guard-decision-only`입니다.
- v3.9에서는 production source extraction/ownership move, CMake target split, legacy edge removal,
  route/API/UI handler relocation, 승인 없는 v4 branch 생성을 금지합니다. v4.0.0 실행은 explicit start와
  branch 승인, release correctness base, clean worktree, baseline gates 뒤 기존 6개 slice 순서로만 허용합니다.
- Decision fixture 부재 상태의 최초 readiness는 7/1 RED였고, 구현 후 8/0입니다. Decision 완료는
  branch/refactor/UI/30분/120분 실행 완료가 아니며 실제 structure implementation은 미실행입니다.

### REVIEW3 완료 경계

- REVIEW3 등록은 개발 완료가 아니라 source-level 결함과 구현 계약의 등록입니다.
- 36~49가 닫히기 전 `전 기능 exact closure`, `AI-minimized 전체 UI 자동화 구현 완료`,
  `Policy v4 end-to-end 준비 완료`, `v3.9 테스트 제외 개발 전체 완료`를 보고하지 않습니다.
- 14번 current final rerun, 30분, 120분, UI 풀테스트, published metadata, release action은 별도 실행
  evidence이며 이번 문서 반영에서 실행하지 않았습니다.
- 각 항목은 구현, 개별 테스트 등록, 승인된 테스트 실행, roadmap/evidence, `git diff --check`, 사용자
  커밋 승인을 독립적으로 닫습니다.

### REVIEW4 직접 감사 후 잔여 개발 순서

2026-07-12 `bf327888b0b87b4dc2fe6479d9df14358ab22271`을 기준으로 문서의 완료 표기를
신뢰하지 않고 source, consumer, runner, evidence producer, qualifier를 다시 대조했습니다.
그 결과 REVIEW3의 파일과 verifier는 존재하지만 일부 완료 조건이 제품 의미로 닫히지 않았습니다.
REVIEW4는 아래 순서를 고정합니다. 앞 단계가 FAIL이면 뒤 단계는 시작하지 않으며, 50~64 개발이
닫히기 전 65번 current final test를 실행하거나 `v3.9.0 테스트 제외 개발 완료`를 주장하지 않습니다.

| 순서 | ID | 구간 | 제목 | 우선순위 | 상태 | 개발 내용 | 추천 모델 | 추론 수준 | 선정 근거 |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | V390-REVIEW4-50 | Foundation | roadmap truth reset과 current 기준 정렬 | P0 | 완료 | REVIEW3 완료 표기를 historical source claim으로 낮추고, 통합 순번 1~35를 source 구현 확인 18, 부분 13, 미완성 4로 고정했습니다. readiness와 actual execution 필드를 분리했으며 source 606은 REVIEW4-50 audit snapshot, HTTP server 42,897와 UI script 10,217은 보존 source line 기준입니다. REVIEW4-52 의미 감사에서 workflow readiness는 56~60 전 `false`로 재정렬했습니다. | 5.6 Terra | 중간 (medium) | 영향도 1, 불확실성 1, 검증 난이도 1, 변경 범위 1, 총 4점. 문서와 상태 schema 정렬이며 상향 규칙 없음 |
| 51 | V390-REVIEW4-51 | Scope Gate | 구조 안정화 버전 범위 재확정 | P0 | 완료 decision / 64 미실행 | 최신 사용자 지시로 50~63 완료 뒤 64번 actual refactor를 current `v3.9.0` branch에서 실행하고 v4.0.0 이관을 취소했습니다. Base `027678ba`, branch 비생성, 9 preserved contract, 6 ordered slice, 64 뒤 65 acceptance를 machine-readable decision v2에 고정했습니다. | 5.6 Sol | 매우 높음 (xhigh) | 영향도 2, 불확실성 2, 검증 난이도 2, 변경 범위 2, 총 8점. 전면 구조 변경과 release 경계 상향 적용 |
| 52 | V390-REVIEW4-52 | Discovery | 문서와 source 의미 전수 감사 | P0 | 완료 | AGENTS와 분리한 tracked Markdown 176개 각각에 semantic role, lifecycle/alignment, decision, actual owner, source-backed evidence와 semantic digest를 기록했습니다. Release artifact 36개를 wrapper/predev aggregate/release-note/acceptance/UI producer/adapter subtype으로 분리하고 source marker 38개를 occurrence/column identity와 exact disposition 15종으로 닫았습니다. current 문서 32개를 실제 v3.9 refactor 결정, HTTP 8080, historical lifecycle, 986/424 pending 의미로 교정했으며 generic/self-owner/stale claim/missing evidence negative를 거부합니다. UI coverage는 56~60 전 `REVIEW_REQUIRED`, readiness false, pass 0/not-run 424입니다. | 5.6 Sol | 매우 높음 (xhigh) | 영향도 2, 불확실성 2, 검증 난이도 2, 변경 범위 1, 총 7점. 기능 누락 정확도 상향 적용 |
| 53 | V390-REVIEW4-53 | Feature Closure | 986행 semantic call-chain 독립 재구축 | P0 | 완료 | 2026-07-13 사용자가 53번 잔여 169건과 canonical manifest 반영을 명시 승인했습니다. UI/AUTH/SRC/RULE, EVT/CLIENT/MEDIA/LAB, SAFE/OPS proof fixture를 실제 owner→dispatch→action→state→independent readback에 source-first로 재결속해 frozen auditor 최종 `986 resolved / 0 unresolved`, family 10개 전부 FAIL 0을 확인했습니다. Earlier 53 scope의 실제 구현 gap인 LAB-028~031은 `webrtc_http_server.cpp`의 `AnalysisGlobalMetadataJson`/`AnalysisGlobalBboxDiagnosticsJson`/`AnalysisGlobalStateDumpJson`/`AnalysisGlobalMetricsDumpJson`과 `/lab/analysis/{metadata,bbox-diagnostics,state[-dump],metrics[-dump]}` GET route로 구현하고 canonical LAB core verifier의 throwaway HTTP 실행으로 확인했습니다. External reviewer decision을 canonical approval ledger 986건으로 정규화하고, 승인된 proof만 `project_feature_implementation_evidence.json`에 투영했습니다. 적용기의 inventory hash/readback file 결속, REVIEW4 compatibility validator, semantic closure negative, exact UI 424 action-count ledger 결함을 수정해 implementation evidence 986/986·negative 15/15, semantic closure 31/31, exact UI contract 10/10, Policy v4 18/18, project inventory와 coverage를 통과했습니다. 임시 work JSON 7개와 대체 OPS/SAFE scaffold 15개 및 dispatch는 제거했고 신규 LAB core runtime verifier 38건은 canonical dispatch/proof owner로 보존했습니다. 55번은 시작하지 않습니다. | 5.6 Sol | 매우 높음 (xhigh) | 영향도 2, 불확실성 2, 검증 난이도 2, 변경 범위 2, 총 8점. 전 기능 정확도와 거짓 closure 위험 상향 적용 |
| 54 | V390-REVIEW4-54 | Persistence | Analysis Registry 실패 원자성 복구 | P0 | 완료 | 신규 target은 `0640`, 기존 target은 exact mode를 보존합니다. Same-directory rollback snapshot과 durable prepared/committed marker를 두어 rename 뒤 directory fsync 실패도 API 500, memory·file·restart 이전 상태로 통일하고, crash recovery가 prepared는 rollback·committed는 candidate를 선택합니다. `WriteAnalysisRegistryFileAtomically`/`RecoverAnalysisRegistryTemporaryFiles`와 v3 fixture/verifier가 profile/rule/VA rule/VLM profile create·update·delete success 12, 9-stage failure 108, fault-cleared single retry 108, 4-point crash/restart 48, artifact 0을 actual HTTP로 검증했습니다. `verify-analysis-state`는 181/0, build와 관련 diff 검사는 통과했습니다. Auth 전용 회귀는 operator secret 5종 미제공으로 미실행이며 Auth/Role/Scope·API/schema/event/media 계약은 변경하지 않았습니다. 55번은 시작하지 않습니다. | 5.6 Sol | 매우 높음 (xhigh) | 영향도 2, 불확실성 1, 검증 난이도 2, 변경 범위 2, 총 7점. 운영 데이터 손상 위험 상향 적용 |
| 55 | V390-REVIEW4-55 | Persistence | ONVIF source/view crash transaction 완성 | P0 | 완료 | 기존 v1 route/response token을 유지하면서 source 경로의 private rollback snapshot과 durable prepared/committed marker를 commit point로 추가했습니다. `EnsureLoadedLocked`가 registry parse 전에 prepared는 양쪽 bytes/existence/mode를 이전 pair로 복구하고 committed는 새 pair를 유지하며 orphan/temp를 정리합니다. Writer는 기존 mode를 candidate temp에 적용합니다. Actual 19-case가 first/second failure, rollback-fault restart, prepared/source/view/committed crash, retry, concurrent no-mix, artifact 0을 통과했습니다. multi-process writer coordination·ONVIF 실기기·UI 풀테스트·30분/120분은 이 PASS에 포함하지 않습니다. | 5.6 Sol | 매우 높음 (xhigh) | 영향도 2, 불확실성 1, 검증 난이도 2, 변경 범위 2, 총 7점. source/view 데이터 정합성 상향 적용 |
| 56 | V390-REVIEW4-56 | UI Case Design | exact 424 기능별 workflow 재작성 | P0 | 완료 | `review4Proof.flowKind/operation/expectation`과 case별 실제 product action을 함께 대조해 exact 424를 read-only 287, form-submit 15, persisted-mutation 32, actionable 43, hidden-disabled 45, negative-route 2로 분류했습니다. 각 case는 actual value 또는 seed ref, tracked source anchor/file digest가 있는 exact control 또는 명시적 not-applicable proof, endpoint(method/path/status) 또는 local action(type/target/effect), 서로 다른 state/readback identity·locator와 명시적 runtime readback step, mutation inverse cleanup 또는 `persistedMutation:false` no-op cleanup을 가집니다. AUTH-005/007/014/015와 RULE-007/011/012/025/030/101의 잘못된 form·hidden/disabled action을 실제 setup/user/invite/rule workflow로 교정했고, class 이름만으로 일반 div/list/link를 disabled로 판정하지 않습니다. Cross-route action role과 redacted `secretRef`를 고정했습니다. Contract와 424 plan-only는 actual browser 424·Policy v4·30분·120분 PASS가 아니며 current readiness는 57~60 대기로 false입니다. | 5.6 Sol | 매우 높음 (xhigh) | 영향도 2, 불확실성 2, 검증 난이도 2, 변경 범위 2, 총 8점. 대량 UI 동등성과 false-PASS 상향 적용 |
| 57 | V390-REVIEW4-57 | UI Runner | canonical requested/observed schema 일치 | P0 | 완료 | `v390_ui_requested_observed_schema.mjs`가 canonical requested(`route/accountRole/viewport/theme/controlAction`)와 runtime observed(`screenRoute/accountRole/viewport/theme/controlAction/provenance`)의 서로 다른 exact projection을 정의합니다. Runner는 browser URL, `/auth/whoami`, 실제 viewport, media query, DOM selector state를 수집하며 producer/qualifier는 공통 envelope를 독립 검증합니다. Legacy `role`/observed `route`, 누락·추가 field, requested control 복사, API route의 screen route 혼용, adapter tool/engine drift를 거부합니다. Exact 424 actual browser, completion oracle, visual matrix, Policy 독립성은 58~60 대기입니다. | 5.6 Sol | 매우 높음 (xhigh) | 영향도 2, 불확실성 1, 검증 난이도 2, 변경 범위 2, 총 7점. Policy v4 release eligibility 상향 적용 |
| 58 | V390-REVIEW4-58 | UI Oracle | 실제 action 결속 completion oracle | P0 | 완료 | `media-server.v390-ui-action-completion.v2`가 exact 424 primary action의 action ID/correlation ID/exact selector/expected-behavior digest/독립 readback identity를 고정합니다. Endpoint 384개는 workflow fixture로 치환된 concrete path와 실제 request ID/method/status를 unique 1건으로 잠그고, local 40개는 handler별 DOM postcondition·필수/금지 request를 사용합니다. V1 expected/observed 복사 대신 V2 raw runtime observation+digest를 evaluator가 직접 판정하고, runner는 primary action을 pending으로 둔 뒤 별도 `verify-independent-readback`에서 fresh DOM/readback을 결속해야만 exact primary completion 1건을 생성합니다. 독립 검토에서 드러난 10개 generic `activate-control`을 교정해 RULE-016/073/075는 persisted PUT transaction, RULE-101은 UI no-dispatch와 별도 API 400, RULE-102는 review-loop select, UI-036/SRC-024/CLIENT-002/005/SAFE-038은 실제 postcondition·seed·request 계약으로 바꿨습니다. Local postcondition은 action 전 불일치→action 후 일치 전이를 최소 1개 요구하고, adapter request-start 원장과 correlation별 network quiet 구간으로 느리거나 응답 전인 금지 dispatch도 거부합니다. Producer는 evaluator가 고정한 `completionRequest`만 보존합니다. Contract는 completion 21/0, native exact 12/0, adapter 7/0, producer 8/0, Policy 20/0이며 actual exact 424 browser 실행과 runtime mutation seed/secret/readback/cleanup은 미실행·fail-closed로 60/62/65 경계에 남깁니다. | 5.6 Sol | 매우 높음 (xhigh) | 영향도 2, 불확실성 2, 검증 난이도 2, 변경 범위 1, 총 7점. 거짓 PASS 정확도 상향 적용 |
| 59 | V390-REVIEW4-59 | Visual Evidence | viewport/theme/video-overlay 실제 matrix | P0 | 완료 / actual 실행 대기 | `v390_ui_visual_matrix_plan.json`이 실제 대표 화면 10개(`/ops/home|dashboard|sources|rules|users|events|vlm`, `/client/live|dashboard|events`)를 canonical/native case와 고정하고 320/390/760/1180×light/dark 80개 고유 조합을 만듭니다. Measurement/diff v2/v3는 case/route/role/target selector, 실제 `data-theme`, viewport, screenshot pixel 정보량, overflow/geometry/contrast/focus를 재계산하며 빈 PNG와 legacy 8-probe를 거부합니다. `/client/live` 8개는 동일 tile의 VA mode, correlated `overlayMode=va-overlay` session/answer, live track, ready/intrinsic/frame progress, `object-fit:contain` content rect, placeholder와 control containment를 모두 요구하고 일반 info overlay/canvas는 인정하지 않습니다. 독립 검토에서 다른 view의 session URL을 현재 tile identity로 포장할 수 있던 false PASS를 발견해 request/answer URL `viewId`, tile `data-view-id`, session 생성 응답 `sessionId`, answer URL `sessionId`의 exact equality를 추가했습니다. Current state는 canonical/native/visual 세 manifest의 exact path와 실파일 SHA-256을 모두 재검증해 stale binding을 거부합니다. Runner/adapter/producer/Policy consumer가 80-probe plan을 공유하며 contract 6/0, adapter 8/0, producer 8/0, Policy 20/0, current hygiene 7/0을 통과했습니다. 실제 80개 browser screenshot/trace는 62/65 self-contained acceptance까지 `not-run`이고 source readiness와 실제 UI PASS는 분리합니다. | 5.6 Sol | 높음 (high) | 영향도 2, 불확실성 1, 검증 난이도 2, 변경 범위 1, 총 6점. 시각 동등성과 영상 UI 검증 상향 적용 |
| 60 | V390-REVIEW4-60 | UI Policy | Policy v4 producer와 qualifier 독립성 | P0 | 완료 / actual 실행 대기 | Producer는 runner PASS를 trust/completion/visual PASS로 승격하지 않고 raw v2 trace, raw action/network/readback, screenshot/measurement와 fingerprint만 보존합니다. 별도 `v390_ui_policy_v4_independent_qualifier.mjs`가 exact primary action 수·순서·ID·selector·correlation, unique request-start/response method/path/status/request ID, fresh semantic readback identity/selector/behavior digest, requested/observed projection과 visual measurement를 독립 재계산합니다. Policy consumer와 coverage consumer는 producer의 `currentSourceVerified`, result/replay/completion/visual boolean을 신뢰하지 않고 current source hash와 qualification을 재검증합니다. 56 empty workflow/body selector, 57 requested/observed drift, 58 wrong/duplicate request와 stale/wrong readback, 59 producer visual PASS fixture가 모두 거부됐습니다. Independence 10/0, producer 8/0, Policy 20/0, native exact 12/0이며 readiness는 `exact-native-ready-current-not-run`, actual exact 424/80 browser 실행은 62/65까지 pass 0/not-run 424입니다. | 5.6 Sol | 매우 높음 (xhigh) | 영향도 2, 불확실성 2, 검증 난이도 2, 변경 범위 2, 총 8점. release correctness와 순환 신뢰 위험 상향 적용 |
| 61 | V390-REVIEW4-61 | Long-run/Evidence | duration, 120분 판정, cleanup 실측 | P0 | 완료 / actual 장시간 미실행 | Predev는 Bash `SECONDS` monotonic 시작/종료/경과와 exact ordered soak iteration/case ledger, 서버 PID command/port lifecycle ledger를 기록합니다. Longrun v2는 별도 `process.hrtime.bigint` 경과와 delegated duration·step ledger를 함께 검증해 requested minutes 또는 최대 iteration 역산을 거부합니다. 120분 정책 필요성은 AGENTS 7.6.2 base..HEAD change scope와 upstream drift에서 계산하며 `--run-120`은 독립 trigger가 아닙니다. Longrun/UI cleanup은 PID identity·listener owner 전후·bindability·contained artifact 존재와 before/after bytes를 raw schema로 기록하고 acceptance/final integrity가 재검증합니다. Contract/fixture만 실행했으며 실제 30분/120분/UI는 미실행입니다. | 5.6 Sol | 높음 (high) | 영향도 2, 불확실성 1, 검증 난이도 2, 변경 범위 1, 총 6점. 장시간 및 release evidence 정확도 상향 적용 |
| 62 | V390-REVIEW4-62 | Acceptance | self-contained one-command 실행 환경 | P0 | 완료 / actual 장시간·UI 미실행 | Canonical command는 output root만 받아 acceptance-owned throwaway HTTP/RTSP server, bounded port retry, admin/operator/viewer/integrator account와 0600 storage-state, Playwright/browser provenance, server log/PID/listener/artifact ownership과 cleanup을 직접 준비합니다. Exact runner는 contained runtime descriptor를 받아 case별 fresh role session, typed form 15건과 persisted mutation 35건의 실제 entry/field/identity/request lifecycle, cross-role action session, runtime-only secret resolver, collection/item authoritative readback과 aggregate cleanup을 수행합니다. Source/view는 ordered pair, ONVIF는 atomic pair로 결속하고 신규 pair는 isolated server teardown 전 양쪽 disabled 상태까지 확인합니다. `/ops/users` product case 20건과 관련 cross-role action은 admin으로 교정했으며 canonical role 분포는 admin 20/anonymous 16/operator 346/viewer 42입니다. SRC-018의 allowedRuleIds/clientGroups 편집 control도 제품 UI에 추가했습니다. 외부 HTTP/PID/log/role-state/port/temp-root option은 거부하며 첫 실패 뒤 later stage/case는 `not-run`입니다. Acceptance contract 10/0, exact runtime 15/0, adapter 8/0, final integrity 9/0, longrun measurement 12/0을 통과했지만 실제 30분·exact 424 browser·80 visual·120분은 실행하지 않았습니다. | 5.6 Sol | 매우 높음 (xhigh) | 영향도 2, 불확실성 2, 검증 난이도 2, 변경 범위 2, 총 8점. 복합 실행 경계와 release correctness 상향 적용 |
| 63 | V390-REVIEW4-63 | Product Scope | deferred 기능 실제 owner 확정 | P1 | 완료 | `.github/CODEOWNERS`의 effective rule에 따라 실제 책임자 `@dhseo90`를 `repository-code-owner`/`repository-scoped-product-scope-attestation`으로 결속하고 기능 역할과 조직 권한 추론을 분리했습니다. Exact 5개는 action write, persistent credential store, production restore, external provider call, model-backed Re-ID이며 외부 field smoke는 별도 조건부입니다. Production restore의 runbook/staging 구현과 product automation 미구현, external provider의 product runtime 금지와 conditional harness 구현, Re-ID의 `implemented-opt-in-experimental` source와 supported release 제외를 구분합니다. 모든 후속은 `post-v3.9-unassigned`, scheduled=false이며 구조화 dependency 승인 전 target version을 예약하지 않습니다. Current release execution/UI/30분/120분/field/release PASS는 주장하지 않습니다. | 5.6 Terra | 중간 (medium) | 영향도 1, 불확실성 1, 검증 난이도 1, 변경 범위 1, 총 4점. 제품 범위 결정 기록이며 상향 규칙 없음 |
| 64 | V390-REVIEW4-64 | Structure | 승인된 구조 안정화 slice 실행 | P0 | 진행 중 / current continuation Slice 9 완료 | Historical ordered Slice 1~5와 current continuation 1~9를 완료했습니다. Slice 9는 public presentation/application contract surface를 implementation owner와 분리해 분류하고 strict JSON을 실제 domain 경로로 물리 이동했습니다. Strict JSON header는 byte-identical, parser는 include-path 정규화 기준 rollback-equivalent입니다. Focused 6/0·격리 mutation 7건, build 100%, stable/analysis predecessor 6/0·5/0·5/0, VLM actual HTTP/reload/no-write, ONVIF/action/UI/frozen contract 회귀를 통과했습니다. Actual graph는 production 163/C++ 80, edge 20, Policy v1 위반 6, SCC 0, target 2/internal separation true, server 40,840줄입니다. 10→6은 하나의 physical domain path와 classifier 정렬의 합이며 broad source dependency 감소 주장이 아닙니다. 나머지 위반 direction, 15,000줄 초과 server, parked evidence는 open이며 REVIEW4-64/65 완료가 아닙니다. | 5.6 Sol | 최대 (max) | 영향도 2, 불확실성 2, 검증 난이도 2, 변경 범위 2, 총 8점. 40,840-line server와 남은 dependency 위반을 포함한 전면 구조 변경으로 xhigh보다 추가 탐색과 회귀 검증이 필요한 최난도 작업 |
| 65 | V390-REVIEW4-65 | Final Test | current HEAD 독립 acceptance와 evidence | P0 | 64 완료 후 실행 승인됨 | 50~64가 닫힌 clean HEAD에서 정적/빌드 gate, 30분, exact 424 Policy v4 UI, AGENTS 7.6.2 판정에 따른 120분, cleanup, final integrity를 승인된 canonical command로 수행합니다. current commit, 명령, 첫 실패 위치, 재현 명령, 미실행/조건부 항목을 보존하며 historical PASS를 재사용하지 않습니다. | 5.6 Sol | 높음 (high) | 영향도 2, 불확실성 1, 검증 난이도 2, 변경 범위 1, 총 6점. release correctness 검증 상향 적용 |

#### REVIEW4 단계 의존성과 중단 조건

1. 50번이 current source-of-truth를 교정해야 51~53의 입력 집합이 확정됩니다.
2. 51번은 구조 구현의 버전 범위만 결정합니다. 64번 실제 refactor는 기능, persistence, UI/test
   implementation인 52~63이 닫힌 뒤 시작합니다.
3. 52번 전수 감사 결과로 기능 수나 scope가 바뀌면 53번 semantic manifest와 56번 UI case set을
   먼저 갱신합니다. 숫자를 기존 986/424에 강제로 맞추지 않습니다.
4. 54~55 persistence는 독립 개발할 수 있지만 두 항목 모두 성공/실패/restart contract가 닫혀야
   mutation을 포함하는 UI case를 final로 고정합니다.
5. UI 경로는 56 case design -> 57 schema -> 58 oracle -> 59 visual -> 60 Policy 순서를 바꾸지 않습니다.
6. 61번 duration/cleanup contract가 닫혀야 62번 acceptance가 이를 canonical child로 소비합니다.
7. 63번에서 구현하기로 승인된 deferred 기능이 있으면 해당 구현과 case를 64번 또는 65번 앞으로
   삽입하고, 제외된 기능은 제외 근거만 남깁니다.
8. 64번을 v3.9에서 실행하면 구조 변경 뒤 모든 기능 verifier와 UI case binding을 다시 생성하고
   직접 검토합니다. 64번을 제외하기로 결정하면 `not-executed`를 완료로 바꾸지 않습니다.
9. 65번은 테스트 실행 단계입니다. 사용자 명시 승인 전 실행하지 않으며, FAIL 시 release action으로
   넘어가지 않습니다.

#### REVIEW4 공통 완료 조건

- 각 개발 항목은 actual source/consumer 경로, negative contract, 관련 개별 테스트 ID, 변경 파일,
  회귀 범위와 roadmap 기록이 모두 있어야 완료입니다.
- manifest/fixture/verifier가 서로 같은 값을 생성하고 비교하는 순환 검증은 독립 evidence가 아닙니다.
- `covered`, `ready`, `gate-ready`, `decision-record`, `not-run`, `conditional-not-run`은 실행 PASS와
  구분합니다.
- 현재 HEAD의 30분, 120분, exact 424, Policy v4 evidence가 없으면 current release PASS가 아닙니다.
- REVIEW4 등록과 문서 수정 자체는 기능 구현, 테스트 실행, 구조 안정화 또는 release 완료 evidence가
  아닙니다.

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

### V220-S06 Rules workspace redesign 종료 기준

- `/ops/rules`의 readiness/assist/catalog/detail renderer와 기존 rule/profile/template control은
  `./server.sh verify-v220-rules-workspace-redesign`로 정적 회귀 확인합니다.
- 이 historical compatibility gate는 현재 source owner 이동 뒤에도 DOM hook과 저장 roundtrip
  기준이 남아 있는지 확인할 뿐, v3.9.0 UI 풀테스트 직접 조작이나 release PASS가 아닙니다.

### V220-F04 Ops VLM UI containment 정리

- `/ops/vlm`의 Ops 보조 작업, default-off, privacy, profile 상태, raw debug containment는
  `./server.sh verify-v220-ops-vlm-containment`로 current source owner를 정적 확인합니다.
- 이 historical compatibility gate는 runtime/provider 호출, UI 직접 조작, 장시간 또는 release
  PASS를 대체하지 않습니다.

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
| V240-S06 | 완료 | UI/API decomposition | `verify-v240-ops-event-route-owner-decomposition` local gate; 과거 baseline, 현재 구조 완료 근거 아님 |
| V240-S08 | 완료 | release readiness gate | `verify-v240-release-readiness-gate` local readiness이며 publish evidence가 아님 |

V240-S06의 historical 범위는 Ops Events, event review/action API, client summary route,
alert dry-run route owner입니다. 이 owner 분해는 Event POST/WebRTC DataChannel/SSE/WS
metadata schema와 RTSP/WebRTC media path를 바꾸지 않았습니다.

## V390-REVIEW4-64 current continuation Slice 2 완료

`product-ui-principal-view-boundary`를 완료했습니다. `include/ingress/product_ui_principal_view.h`가
display identity, role/auth label, scopes, admin/operator UI capability만 가진 stable-contract DTO를 소유하고,
`src/ingress/webrtc_http_server.cpp`의 transport adapter만 `auth::Principal`을 이 DTO로 변환합니다.
`product_ui_auth_pages`와 `product_ui_server_pages`의 Auth transport type·helper 의존은 제거했으며
password/landing/Ops/source/users/rules/dashboard/events/home/VLM HTML·DOM과 role/scope 의미는 유지했습니다.

검증은 focused boundary 4/0, build 100%, Auth bootstrap/users/routes 19/0·72/0·146/0,
Ops renderer 5/0, v2.3 renderer decomposition 8/0, loopback static UI 28/0을 통과했습니다.
Auth 비밀번호는 실행 환경에만 주입했고 저장소나 증적에 기록하지 않았으며, 실제 사용자 registry는
각 Auth 실행 전후 동일했습니다. Current graph는 production 159/C++ 79, target 위반 20, SCC 8,
transport 40,833줄, CMake target 1/internal separation false입니다. 따라서 Slice 2는 완료지만
REVIEW4-64 전체와 REVIEW4-65 acceptance는 아직 완료가 아닙니다.

## V390-REVIEW4-64 current continuation Slice 3 완료

`source-request-parser-owner-boundary`를 완료했습니다. 기존 `include/ingress/request_parser.h`와
`src/ingress/request_parser.cpp`를 제거하고 동일 API/구현을 `include/core/source_request_parser.h`와
`src/core/source_request_parser.cpp`의 `core` namespace로 이동했습니다. SessionManager의 create/attach 두 지점과
RTSP media configure 한 지점만 새 owner를 호출하고 WebRTC HTTP server의 미사용 parser include는 제거했습니다.
File root traversal, route, file/url exclusivity, WHEP http(s), source kind, YouTube default-off, exact error와
Event POST/WebRTC/SSE/WS/RTSP media 계약은 바꾸지 않았습니다.

Focused verifier는 구현 전 0/5 RED였고 최종 5/0, build 100%, codec fresh full rerun 67/0/3,
route profile 8/0, analysis state 181/0, v2.9 freeze 10/0, Event POST 9/0, WebRTC metadata 8/0,
SSE 5/0, WS 9/0을 통과했습니다. Event POST 재검증에서 드러난 verifier 들여쓰기·import·고정 해시 결함은
canonical sample/JSON Schema/actual payload 모양에 맞게 보정했으며 제품 serializer나 payload는 변경하지 않았습니다.
Current graph는 target 위반 20→19, SCC 8→6, transport 40,833→40,832줄이고 production 159/C++ 79,
CMake target 1/internal separation false는 유지됩니다. 따라서 Slice 3는 완료지만 남은 architecture debt와 parked
generated evidence 때문에 REVIEW4-64 전체와 REVIEW4-65 acceptance는 아직 완료가 아닙니다.

## V390-REVIEW4-64 current continuation Slice 4 완료

`cmake-internal-target-separation`을 완료했습니다. `media_server` executable은 `src/main.cpp`와
`src/application/media_server_application.cpp`만 소유하고, `media_server_runtime` STATIC library는 나머지
production source 77개와 optional YouTube source를 소유합니다. Runtime을 컴파일하는 target에 include,
feature definition, GStreamer/Pango/SQLite/libsodium/OpenSSL/ONNX link 설정을 보존하고 executable은 runtime만
단방향 link합니다. Production source 중복·누락은 0이며 source include edge와 Policy v1은 변경하지 않았습니다.

Focused gate는 구현 전 1/4 RED, 구현 뒤 5/0입니다. Build 100%, server start mode 10/0, fresh codec
67/0/3, route profile 8/0, analysis state 181/0을 통과했습니다. 첫 codec 시도는 Auth-on 401 때문에 중단했고
Auth-off 재실행의 cold HLS timeout 뒤 완전히 새 서버에서 전체 행렬을 통과했습니다. Current graph는 production
159/C++ 79, target 위반 19, SCC 6, transport 40,832줄을 유지하고 CMake target 1→2/internal separation
false→true로 바뀌었습니다. 남은 dependency/SCC/server debt와 parked generated evidence 때문에 REVIEW4-64 전체와
REVIEW4-65 acceptance는 아직 완료가 아닙니다.

## V390-REVIEW4-64 current continuation Slice 5 완료

`stable-contract-leaf-boundary`를 완료했습니다. `analysis_types.h`, `media_types.h`,
`rtsp_request_context.h`는 `stdafx` 대신 필요한 표준 header를 직접 include합니다. `AnalysisEvent`는 이름,
namespace, 23개 field의 순서·type·default를 그대로 `analysis_types` contract로 이동했고,
`va_runtime_metadata.h`는 analysis service인 `event_rule_engine.h`를 더 이상 include하지 않습니다.
Object tracker·appearance extractor의 AppConfig와 raw decoder의 functional/memory/thread도 실제 소비자가 직접 선언합니다.

Focused gate는 구현 전 1/4 RED, mutation 보정 뒤 5/0입니다. Build는 전이 include 두 묶음을 드러낸 뒤 세 번째
실행에서 100%, analysis 181/0, loopback Event POST 9/0, WebRTC 8/0, SSE 5/0, WS 9/0입니다.
Current graph는 stable→analysis/core 두 direction을 제거해 target 위반 19→17, 최대 SCC 6→3이며 production
159/C++ 79, transport 40,832줄, CMake target 2/internal separation true를 유지합니다. 남은 architecture debt와
parked generated evidence 때문에 REVIEW4-64 전체와 REVIEW4-65 acceptance는 아직 완료가 아닙니다.

## V390-REVIEW4-64 current continuation Slice 8 완료

`stable-contract-owner-realignment`를 완료했습니다. Stable owner에는 dependency-free
`ProductUiPrincipalView`만 남기고 analysis contract, `media_types`, RTSP request context는 각각 analysis,
core utility, core-media owner로 재정렬했습니다. Public contract bytes는 바꾸지 않았고
`RawVideoDecoder`만 신규 `core/media_packet_contract.h` facade를 통해 media primitive를 소비합니다.

Focused gate는 구현 전 1/5 RED, 최종 6/0이며 격리 mutation 6건을 거부했습니다. Predecessor gate는
successor-safe frontier로 보정한 뒤 5/0·11/0, build 100%, analysis 181/0, final contract 10/0,
Event POST/RTSP/WebRTC/SSE/WS 9/0·6/0·8/0·5/0·9/0입니다. Current graph는 production 163/C++ 80,
위반 14→10, SCC 0, target 2/internal separation true, server 40,840줄입니다. 남은 dependency/server debt와
parked generated evidence 때문에 REVIEW4-64 전체와 REVIEW4-65 acceptance는 아직 완료가 아닙니다.

## V390-REVIEW4-64 current continuation Slice 9 완료

`public-contract-interface-owner-realignment`를 완료했습니다. Stable owner ID는 historical Policy v1 이름을
유지하지만 실제 범위는 DTO만이 아니라 dependency-neutral public product UI presentation contract/interface
9개입니다. ONVIF/Ops/VLM public contract surface는 application owner로 분류하되 ONVIF header의 concrete
in-memory fixture 선언까지 implementation 분리됐다고 주장하지 않습니다. Product UI implementation 12개와
Ops implementation 4개는 기존 owner에 남았습니다.

`strict_json`은 분류만 바꾸지 않고 `include/core`/`src/core`에서 `include/domain`/`src/domain`으로 물리
이동했습니다. Header raw SHA는 동일하고 parser source는 include 경로를 정규화하면 rollback과 동일합니다.
VLM provenance와 HTTP transport consumer 두 곳, CMake source 경로만 새 domain owner를 사용합니다.
Focused gate는 물리 경계 선등록 뒤 2/4 expected RED, 최종 6/0이며 contract/classifier/direction/header/
consumer/CMake 격리 mutation 7건을 거부했습니다. Build 100%, VLM promotion 14 HTTP·7 structural·13 reload,
VLM provenance positive 3/forged 15/duplicate 3/reload 5/deletion 4/binding 2, profile 6/0,
ONVIF/action/S06/Ops renderer/principal/v2.3/freeze 회귀를 통과했습니다.

Current graph SHA `33f72bd4...a271a9d3`, ownership SHA `77485b7b...bf6875`, production 163/C++ 80,
edge 20, Policy v1 위반 10→6, SCC 0, target 2/internal separation true, server 40,840줄입니다.
이 감소는 하나의 physical domain 경로와 public interface classifier 정렬을 합친 정책 수치이며 source include
전체가 4방향 줄었다는 뜻이 아닙니다. 남은 6 direction, server split, parked evidence finalization 때문에
REVIEW4-64 전체와 REVIEW4-65 acceptance는 아직 완료가 아닙니다.

## 후속 이슈 추천 규칙

### Historical v1.8 tracker research verifier boundary

아래 문구는 기존 tracker research verifier가 보존하는 과거 제품 범위이며 current v3.9 구조 Slice의
새 기능 승인이 아닙니다.

- BoT-SORT/DeepSORT research boundary: BoT-SORT/botsort/DeepSORT/deepsort token을 제품 tracker로 받지 않습니다.
- BoT-SORT/DeepSORT dependency/privacy threat model과 runtime/model bundle RC policy는 별도 Phase 후보로 기록합니다.
- OC-SORT 후순위 benchmark는 `analysis.trackingPolicy.tracker` 허용값에 추가하지 않습니다.
- OC-SORT는 ByteTrack/Kalman-lite 이후 비교 후보일 뿐이며 제품 tracker 교체 근거로 과장하지 않습니다.
- 미분류 P0~P1 후속 이슈: 없음.
- 실제 tracker 연구 구현은 별도 Phase 후보로 기록합니다.

후속 이슈는 현재 source tree와 현재 v3.9 스텝 범위 안에서 실제로 처리 가능한 항목만
기록합니다. 다음 버전 후보, 별도 Phase 후보, 사용자 승인이 필요한 새 제품 범위는 이
문서에 추천하지 않습니다.
