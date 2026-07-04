# Stream Verification

이 문서는 현재 Media Server의 검증 명령 진입점과 테스트 영역 경계를 정리합니다.
내부 release evidence ledger와 수동 UI 결과 템플릿은 공개 첫 진입점에서 제외하며,
실제 PASS 보고는 실행한 명령 output과 별도 보존된 실행 기록으로만 판단합니다.

## 역할과 경계

- AGENTS.md가 테스트/보고/커밋/푸시 권한의 최상위 규칙입니다.
- 이 문서는 검증 명령 catalog입니다. PASS 보고는 실제 실행 output이 있을 때만 가능합니다.
- 기능별 테스트 영역과 coverage 기준은 [project-feature-test-inventory.md](./project-feature-test-inventory.md)가 관리합니다. 이 inventory는 실행 evidence가 아닙니다.
- 안정화, 30분, 120분, UI 풀테스트는 서로 대체하지 않습니다.
- 외부 조건이 필요한 테스트와 장시간 테스트는 별도 gate로 분리합니다.
- endpoint, credential, runtime 승인 같은 사전 조건이 필요한 항목은 조건과 실행 evidence가 있을 때만 PASS 근거가 됩니다.

## 빠른 실행 경계

| 명령 | 범위 |
| --- | --- |
| `./server.sh test --basic` | build/정적 smoke 중심. longrun과 external ICE를 실행하지 않음 |
| `./server.sh test --full` | Product UI smoke, Rule/Profile UI, VA event, image analysis, event POST smoke, redaction 포함 |
| `./server.sh verify-docs-links` | Markdown link/index guard |
| `./server.sh verify-docs-ui-assets` | README/UI screenshot asset guard |
| `./server.sh verify-project-inventory` | feature/test inventory 구조 guard |
| `./server.sh verify-feature-inventory-coverage` | `media-server.feature-inventory-coverage.v1`, `missing coverage target`, 누락 ID는 release gate에서 FAIL |
| `./server.sh verify-release-metadata` | VERSION/CMake/release docs consistency guard |
| `./server.sh verify-release-closeout-helper --dry-run --report <report.md> --json-report <report.json>` | release close-out dry-run. tag/push/GitHub Release 생성 없음 |

## 과거 v2.5.0 verifier

| Step | Command | Scope |
| --- | --- | --- |
| V250-S01 | `./server.sh verify-v250-incident-text-projection` | Event/incident text projection fixture smoke |
| V250-S02 | `./server.sh verify-v250-incident-memory-index` | SQLite FTS5 primary와 JSONL+BM25 fallback parity |
| V250-S03 | `./server.sh verify-v250-ops-events-semantic-search-ui` | Ops-only search UI view model/static guard |
| V250-S04 | `./server.sh verify-v250-incident-timeline-graph` | timeline graph node/edge/audit linkage guard |
| V250-S05 | `./server.sh verify-v250-explainable-incident-brief` | explainable brief/no-provider-default guard |
| V250-S06 | `./server.sh verify-v250-similar-incident-lookup` | deterministic similar incident scoring guard |
| V250-S07 | `./server.sh verify-v250-client-safe-incident-digest` | viewer-safe digest/redaction guard |
| V250-S08 | `./server.sh verify-v250-redacted-incident-evidence-bundle` | release-safe manifest-only evidence bundle guard |
| V250-S09 | `./server.sh verify-v250-owner-release-readiness` | owner decomposition/release readiness local gate |

## 현재 v3.7.0 verifier

아래 명령은 v3.7.0 Site-Aware Operations and Safe Runbook Control Plane의 현재 source gate입니다.
UI 풀테스트, 30분/120분, published metadata, release action, field smoke는 실행 evidence가
있을 때만 별도로 PASS 근거가 됩니다.

| Step | Command | Scope |
| --- | --- | --- |
| v3.7.0 (1) | `./server.sh verify-v370-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` | source `3.7.0`, latest published `v3.6.0`, current roadmap `v3.7.0 Site-Aware Operations and Safe Runbook Control Plane` 정렬. v3.7 기능 구현, UI 풀테스트, 30분/120분, tag, push, GitHub Release evidence와는 별도 gate입니다 |

## 최신 published baseline v3.6.0 verifier

아래 명령은 v3.6.0 Operations Simulation and Safe Apply Readiness의 latest published baseline source gate입니다.
UI 풀테스트, 30분/120분, published metadata, release action, field smoke는 실행 evidence가
있을 때만 별도로 PASS 근거가 됩니다.

| Step | Command | Scope |
| --- | --- | --- |
| v3.6.0 (1) | `./server.sh verify-v360-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` | source `3.6.0`, latest published `v3.6.0`, current roadmap `v3.6.0 Operations Simulation and Safe Apply Readiness` 정렬. v3.6 기능 구현, UI 풀테스트, 30분/120분, tag, push, GitHub Release evidence와는 별도 gate입니다 |
| v3.6.0 (2) | `./server.sh verify-v360-simulation-input-contract` | Simulation Input Contract. `/ops/api/live-operations/simulation/input-pack`가 EventRecord, SourceRegistry, PublishedView, command plan, staged plan을 read-only simulation input pack으로 묶고 source/view/rule/EventRecord/Ops audit/client/media mutation 미수행 경계를 확인합니다 |
| v3.6.0 (3) | `./server.sh verify-v360-operations-simulation-run-contract` | Operations Simulation Run Contract. `/ops/api/live-operations/simulation/run-contract`가 simulation route family, run schema, result envelope, not-run 상태와 no-run/no-persist boundary를 확인합니다 |
| v3.6.0 (4) | `./server.sh verify-v360-command-plan-dry-run-simulator` | Command Plan Dry-run Simulator. `/ops/api/live-operations/simulation/command-plan-dry-run`이 source recheck, recovery, maintenance, client notice, rule follow-up 후보를 실제 write 없이 dry-run 결과로 계산하고 command execution 미수행 경계를 확인합니다 |
| v3.6.0 (5) | `./server.sh verify-v360-source-rule-impact-diff` | Source/Rule Impact Diff. `/ops/api/live-operations/simulation/impact-diff`가 source/view/rule 변경 전후의 source health, event risk, client impact diff를 read-only로 표시하고 source/rule apply 미수행 경계를 확인합니다 |
| v3.6.0 (6) | `./server.sh verify-v360-safe-apply-readiness-gate` | Safe Apply Readiness Gate. `/ops/api/live-operations/simulation/safe-apply-readiness`가 ready, blocked, approval-needed, field-needed, not-run 상태와 blocker를 산출하고 automatic apply/client notice/field smoke 미수행 경계를 확인합니다 |
| v3.6.0 (7) | `./server.sh verify-v360-ops-simulation-workspace-ui` | Ops Simulation Workspace UI. `/ops`가 simulation input, run, impact diff, readiness blocker를 read-only command workspace 화면으로 표시하고 source URL/raw locator/raw JSON/debug/credential material, command execution, source/view/rule/EventRecord/Ops audit/client/media mutation 비노출/미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release action evidence를 대체하지 않음 |
| v3.6.0 (8) | `./server.sh verify-v360-simulation-run-ledger-comparison` | Simulation Run Ledger and Comparison. `/ops/api/live-operations/simulation/run-ledger`와 `/ops` simulation workspace가 simulation run id, 입력 ref, 결과 diff, operator note, 이전 run 대비 변화를 append-only/read-only projection으로 누적 표시하고 simulation run persist/execute/operator note write/client notice 미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release action evidence를 대체하지 않음 |
| v3.6.0 (9) | `./server.sh verify-v360-client-notice-preview` | Client Notice Preview. `/ops/api/live-operations/simulation/client-notice-preview`와 `/ops` simulation workspace가 실제 발송 없이 viewer-safe maintenance/degraded/recovering notice preview를 표시하고 client notice send/persist, viewer client payload 변경, source/view/rule/EventRecord/Ops audit/client/media mutation 미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release action evidence를 대체하지 않음 |
| v3.6.0 (10) | `./server.sh verify-v360-rule-va-what-if-replay-pack` | Rule/VA What-if Replay Pack. `/ops/api/live-operations/simulation/rule-va-what-if-replay-pack`와 `/ops` simulation workspace가 EventRecord/VA fixture 기반 rule threshold, preset, scenario 후보의 what-if 결과를 비교하고 rule apply/EventRecord write/Event POST/schema/media/client mutation 미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release action evidence를 대체하지 않음 |
| v3.6.0 (11) | `./server.sh verify-v360-simulation-export-bundle` | Simulation Export Bundle. `/ops/api/live-operations/simulation/export-bundle`와 `/ops` simulation workspace가 simulation input/output, blocker, handoff map을 redacted release-safe export bundle로 조합하고 artifact export/file write/handoff write/simulation execution/provider call/schema/media/client mutation 미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release action evidence를 대체하지 않음 |
| v3.6.0 (12) | `./server.sh verify-v360-field-evidence-simulation-adapter` | Field Evidence Simulation Adapter. `/ops/api/live-operations/simulation/field-evidence-adapter`와 `/ops` simulation workspace가 ONVIF, external WHEP/TURN, cloud/VLM provider 조건을 field 실행 없이 조건부/not-run evidence로 simulation에 연결하고 field smoke/endpoint probe/credential probe/provider call/media mutation 미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release action evidence를 대체하지 않음 |
| v3.6.0 (13) | `./server.sh verify-v360-vlm-assisted-simulation-explanation` | VLM-assisted Simulation Explanation. `/ops/api/live-operations/simulation/vlm-assisted-explanation`와 `/ops` simulation workspace가 default-off VLM 보조 설명으로 blocker, impact diff, operator review hint를 요약하고 provider/runtime call, raw prompt/provider response/credential material, simulation execution, operator review write, schema/media/client mutation 미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release action evidence를 대체하지 않음 |
| v3.6.0 (14) | `./server.sh verify-v360-stabilization-release-readiness` | v3.6.0 local stabilization and release readiness. v3.6 Step 1~13 local gates, release policy/evidence index/test records, docs links/assets, feature/script inventory, close-out dry-run, git diff --check 연결을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, release action evidence를 대체하지 않음 |

## 직전 published baseline v3.5.0 verifier

아래 명령은 v3.5.0 Live Operations Control Plane의 published baseline source gate입니다.
UI 풀테스트, 30분/120분, published metadata, release action, field smoke는 실행 evidence가
있을 때만 별도로 PASS 근거가 됩니다.

| Step | Command | Scope |
| --- | --- | --- |
| v3.5.0 (1) | `./server.sh verify-v350-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` | source `3.5.0`, latest published `v3.5.0`, current roadmap `v3.5.0 Live Operations Control Plane` 정렬. v3.5 기능 구현, UI 풀테스트, 30분/120분, tag, push, GitHub Release evidence와는 별도 gate입니다 |
| v3.5.0 (2) | `./server.sh verify-v350-live-operations-graph-contract` | Live Operations Graph Contract. `/ops/api/live-operations/graph`가 EventRecord, SourceRegistry, PublishedView, source health, continuity drill, client impact를 하나의 Ops-only graph read model로 연결하고 source locator/credential/raw diagnostic JSON/media path 비노출 경계를 확인합니다. Operations Command Plan Contract, Incident-to-Command Handoff, Staged Change Plan, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (3) | `./server.sh verify-v350-operations-command-plan-contract` | Operations Command Plan Contract. `/ops/api/live-operations/command-plan`이 source recheck, recovery, maintenance, client notice, rule follow-up 후보를 draft-only command plan으로 정의하고 source/view/rule/client/EventRecord/Ops audit/media mutation 미수행 경계를 확인합니다. Incident-to-Command Handoff, Staged Change Plan, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (4) | `./server.sh verify-v350-incident-to-command-handoff` | Incident-to-Command Handoff. `/ops/api/events/reviews`와 `/ops/events` selected detail handoff가 source 원인, continuity drill 후보, command plan 초안으로 이어지는지 확인하고 source/view/rule/EventRecord/Ops audit/client/media mutation 미수행 경계를 확인합니다. Staged Change Plan, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (5) | `./server.sh verify-v350-staged-change-plan-impact-preview` | Staged Change Plan and Impact Preview. `/ops/api/live-operations/staged-change-plan-impact-preview`가 source/view/rule follow-up 변경 후보를 before-apply impact preview로 만들고 blocker를 staging-only/read-only로 표시하며 source/view/rule/EventRecord/Ops audit/client/media mutation 미수행 경계를 확인합니다. 실제 apply, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (6) | `./server.sh verify-v350-ops-command-workspace-ui` | Ops Command Workspace UI. `/ops` dashboard가 incident, source, drill, staged plan, client impact를 하나의 read-only command workspace 흐름으로 표시하고 source URL/raw locator/raw JSON/debug/credential material, command execution, source/view/rule/EventRecord/Ops audit/client/media mutation 비노출/미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (7) | `./server.sh verify-v350-drill-run-ledger-plan-comparison` | Drill Run Ledger and Plan Comparison. `/ops/api/live-operations/drill-run-ledger`와 `/ops` dashboard가 drill run id, operator note, blocker, evidence refs, 이전 run 대비 차이를 누적 표시하고 drill run write/operator note write/command execution 미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (8) | `./server.sh verify-v350-client-impact-forecast` | Client Impact Forecast. `/client/api/views/{id}/events`와 client live/dashboard/events가 source/view/command plan이 client live/dashboard/event digest에 주는 영향을 `clientImpactForecast` viewer-safe summary로 표시하고 source URL/raw locator/raw JSON/debug/credential/operator material과 command plan detail을 노출하지 않는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (9) | `./server.sh verify-v350-client-safe-operations-notice` | Client-safe Operations Notice. `/client/api/views/{id}/events`와 client live/dashboard/events가 `clientOperationsNotice`로 maintenance/degraded/recovering/available 상태와 timeline hint만 표시하고 source URL/raw locator/raw JSON/debug/credential/operator material, command plan detail, incident detail을 노출하지 않는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (10) | `./server.sh verify-v350-operations-export-bundle-handoff-map` | Operations Export Bundle and Handoff Map. `/ops/api/live-operations/export-bundle-handoff-map`와 `/ops` dashboard가 command plan, drill ledger, field evidence, client impact forecast refs를 release-safe export bundle과 handoff map으로 조합하고 artifact export/write/field smoke/provider call 미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (11) | `./server.sh verify-v350-field-evidence-intake` | Field Evidence Intake. `/ops/api/live-operations/field-evidence-intake`와 `/ops` dashboard가 ONVIF, external WHEP/TURN, cloud/VLM provider 결과를 redacted field evidence와 execution conditions/not-run 상태로 분리하고 field smoke/provider call 미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (12) | `./server.sh verify-v350-vlm-assisted-ops-explanation` | VLM-assisted Ops Explanation. `/ops/api/live-operations/vlm-assisted-explanation`와 `/ops` dashboard가 default-off VLM 보조 설명으로 command plan blocker, incident/source relation, operator review hint를 요약하고 VLM/provider call 미수행, raw prompt/provider response/credential material 미포함, command execution/operator review write/source/view/EventRecord/Ops audit/client/media mutation 미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (13) | `./server.sh verify-v350-stabilization-release-readiness` | v3.5.0 local stabilization and release readiness. v3.5 Step 1~12 local gates, release policy/evidence index/test records, docs links/assets, feature/script inventory, close-out dry-run, git diff --check 연결을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, release action evidence를 대체하지 않음 |

## 직전 published baseline v3.4.0 verifier

아래 명령은 v3.4.0 Operations Continuity Drill Workspace의 현재 source gate입니다.
UI 풀테스트, 30분/120분, published metadata, release action, field smoke는 실행 evidence가
있을 때만 별도로 PASS 근거가 됩니다.

| Step | Command | Scope |
| --- | --- | --- |
| v3.4.0 (1) | `./server.sh verify-v340-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` | source `3.4.0`, latest published `v3.4.0`, current roadmap `v3.4.0 Operations Continuity Drill Workspace` 정렬. v3.4 기능 구현, UI 풀테스트, 30분/120분, tag, push, GitHub Release evidence와는 별도 gate입니다 |
| v3.4.0 (2) | `./server.sh verify-v340-continuity-drill-contract` | Continuity Drill Contract. `/ops/api/source-registry/continuity-drill/contract`가 recovery drill schema, v3.3 handoff 입력, read-only/no-write/no-secret/no-media-path-change 경계를 Ops-only contract로 노출하는지 확인합니다. Recovery Candidate Package, Staging Restore Validation Harness, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (3) | `./server.sh verify-v340-recovery-candidate-package` | Recovery Candidate Package Read Model. `/ops/api/source-registry/recovery-candidate-package`가 SourceRegistry snapshot, PublishedView, source health, EventRecord/audit context를 redacted recovery candidate package로 조합하고 source locator/credential/raw audit body/media path 비노출 경계를 지키는지 확인합니다. Staging Restore Validation Harness 실행, production restore, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (4) | `./server.sh verify-v340-staging-restore-validation-harness` | Staging Restore Validation Harness. temporary staging runtime에서 JSON parse, duplicate sourceId, missing sourceId reference, auth store `0600`, checksum, viewer scope를 production write 없이 검증합니다. source health replay/diff, Ops UI, approval-gated checklist, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (5) | `./server.sh verify-v340-source-health-replay-drift-diff` | Source Health Replay and Drift Diff. `/ops/api/source-registry/source-health-replay-drift-diff`가 handoff source health와 fresh source health를 비교해 stale/offline/reconnect/warning drift를 요약하는지 확인합니다. source registry write, PublishedView write, Ops audit write, automatic recovery, Ops UI, client digest, evidence export, field smoke, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (6) | `./server.sh verify-v340-ops-continuity-drill-workspace-ui` | Ops Continuity Drill Workspace UI. `/ops/sources`에서 drill package, validation status, blocked/ready 상태, source health drift를 read-only로 표시하는지 확인합니다. source URL/raw locator/raw JSON/debug/credential material, source registry write, PublishedView write, Ops audit write, automatic recovery, approval-gated checklist, client digest, evidence export, field smoke, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (7) | `./server.sh verify-v340-approval-gated-recovery-checklist-audit` | Approval-Gated Recovery Checklist and Audit. `/ops/sources`에서 operator note, ready/blocked/field-smoke-needed/not-run 상태, dry-run result, Ops audit link를 read-only로 표시하는지 확인합니다. automatic recovery, source registry write, PublishedView write, Ops audit write, source URL/raw locator/raw JSON/debug/credential material, client digest, evidence export, field bridge, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (8) | `./server.sh verify-v340-client-safe-maintenance-digest` | Client-safe Maintenance Digest. `/client/api/views/{id}/events`와 client live/dashboard/events가 maintenance/recovering/unavailable viewer-safe digest만 표시하는지 확인합니다. source URL/raw locator/raw JSON/debug/credential material, operator note/Ops audit/dry-run/recovery action 비노출, source registry write, PublishedView write, EventRecord/Event POST/API/schema/media/search 변경, evidence export, field bridge, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (9) | `./server.sh verify-v340-drill-evidence-export-cleanup-manifest` | Drill Evidence Export and Cleanup Manifest. `/ops/api/source-registry/drill-evidence-export-cleanup-manifest`와 `/ops/sources`가 redacted drill artifact manifest, minimum retained evidence, /tmp cleanup manifest, sensitive material scan boundary를 read-only로 기록하는지 확인합니다. cleanupExecutionPerformed=false, artifact export 실행, source URL/raw locator/raw JSON/debug/credential material/raw audit body 노출, field bridge, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (10) | `./server.sh verify-v340-field-bridge-condition-gates` | Field Bridge Condition Gates. `/ops/api/source-registry/field-bridge-condition-gates`와 `/ops/sources`가 ONVIF 실기기, external WHEP/TURN, real cloud/VLM provider를 endpoint/credential/approval 조건부 field smoke로 분리하고 source-only PASS를 field bridge PASS로 대체하지 않는지 확인합니다. fieldSmokeExecuted=false, endpoint probe/provider call/media path 변경, source URL/raw locator/raw JSON/debug/credential/provider material 노출, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (11) | `./server.sh verify-v340-stabilization-release-readiness` | v3.4.0 local stabilization and release readiness. v3.4 Step 1~10 local gates, release policy/evidence index/test records, docs links/assets, feature/script inventory, close-out dry-run, git diff --check 연결을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, release action evidence를 대체하지 않음 |

## 직전 published baseline v3.3.0 verifier

아래 명령은 v3.3.0 roadmap의 현재 문서/source baseline gate입니다. 후속 항목은
각 step 구현 때 실제 command, route/control/action, script inventory를 연결한 뒤에만
PASS 근거로 사용합니다.

| Step | Command | Scope |
| --- | --- | --- |
| v3.3.0 (1) | `./server.sh verify-v330-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` | source `3.3.0`, latest published `v3.3.0`, current roadmap `v3.3.0 Live Source Reliability Workspace` 정렬. v3.3 기능 구현, UI 풀테스트, 30분/120분, published metadata, tag, push, GitHub Release evidence가 아님 |
| v3.3.0 (2) | `./server.sh verify-v330-source-registry-snapshot-identity` | Source Registry Snapshot and Identity. `/ops/api/source-registry/snapshot` Ops-only read model이 sourceId, source kind, canonical source key, PublishedView 연결, owner/site/group context를 조합하는지 확인합니다. viewer/client 노출, source registry write, onboarding quality, reliability timeline, incident correlation, recovery queue, client digest, search/metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (3) | `./server.sh verify-v330-source-onboarding-quality-summary` | Source Onboarding Quality Summary. `/ops/api/source-registry/onboarding-quality`와 `/ops/sources`가 pre-save validation, duplicate/conflict/missing/ready, ONVIF/WHEP/RTSP input quality를 Ops-only로 요약하는지 확인합니다. viewer/client 노출, source registry write, reliability timeline, incident correlation, recovery queue, client digest, search/metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (4) | `./server.sh verify-v330-reliability-timeline-health-history` | Reliability Timeline and Health History. `/ops/api/source-registry/reliability-timeline`와 `/ops/sources`가 live/stale/offline/reconnect/source warning 변화 이력과 Ops audit 연결을 Ops-only로 요약하는지 확인합니다. source registry write, PublishedView write, viewer/client 노출, API/schema/media 변경, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (5) | `./server.sh verify-v330-incident-source-correlation-layer` | Incident-to-Source Correlation Layer. `/ops/api/events/reviews`와 `/ops/events`가 v3.2 resolution event detail에 `incidentSourceCorrelation` source reliability 원인/context, closure impact, source audit/recheck handoff를 Ops-only로 표시하는지 확인합니다. source registry write, PublishedView write, viewer/client 노출, EventRecord/Event POST/API/schema/media 변경, recovery queue, client digest, search/metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (6) | `./server.sh verify-v330-operator-recheck-recovery-queue` | Operator Recheck and Recovery Queue. `/ops/api/events/reviews`와 `/ops/events`가 `operatorRecheckRecoveryQueue` failed-only recheck, retry candidate, recovery checklist, dry-run 결과, operator note 연결을 Ops-only로 표시하는지 확인합니다. source registry write, PublishedView write, viewer/client 노출, EventRecord/Event POST/API/schema/media 변경, persistent recovery queue write, client digest, search/metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (7) | `./server.sh verify-v330-client-safe-source-status-digest` | Client-safe Source Status Digest. `/client/api/views/{id}/events`와 client live/dashboard/events가 `sourceStatusDigest` sourceStatus, connectionStatus, videoFrameStatus, metadataStatus, summaryText, severity, timelineHint를 viewer-safe로 표시하는지 확인합니다. source URL/raw locator/raw JSON/debug/credential/operator material 비노출, source registry write, PublishedView write, EventRecord/Event POST/API/schema/media 변경, search/metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (8) | `./server.sh verify-v330-operator-runbook-reliability-handoff` | Operator Runbook and Reliability Handoff. source reliability workspace 사용 흐름, operator runbook, docs index/UI guide/config/backup 문서 연결을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, real backup/restore, search/metrics PASS로 대체하지 않음 |
| v3.3.0 (9) | `./server.sh verify-v330-source-reliability-search-metrics` | Source Reliability Search and Metrics. `/ops/api/source-registry/reliability-search-metrics`와 `/ops/sources`가 source health filters, saved reliability view presets, reconnect/stale/offline metric summary를 Ops-only로 요약하는지 확인합니다. source registry write, PublishedView write, saved view write, viewer/client 노출, API/schema/media 변경, Ops Backup and Recovery Source Handoff, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (10) | `./server.sh verify-v330-ops-backup-recovery-source-handoff` | Ops Backup and Recovery Source Handoff. `/ops/api/source-registry/backup-recovery-handoff`와 `/ops/sources`가 source registry snapshot, PublishedView registry, source health snapshot, recovery validation plan을 Ops-only handoff 입력으로 연결하는지 확인합니다. source registry write, PublishedView write, real backup/restore, automatic recovery, viewer/client 노출, API/schema/media 변경, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (11) | `./server.sh verify-v330-stabilization-release-readiness` | v3.3.0 local stabilization and release readiness. v3.3 Step 1~10 local gates, release policy/evidence index/test records, close-out dry-run, script inventory 연결을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, release action evidence를 대체하지 않음 |

## 직전 published baseline v3.2.0 verifier

아래 명령은 v3.2.0 published baseline 구현 단계에서 추가된 verifier입니다. v3.3.0
완료 evidence로 재사용하지 않습니다.

| Step | Command | Scope |
| --- | --- | --- |
| v3.2.0 (1) | `./server.sh verify-v320-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` | source `3.2.0`, latest published `v3.2.0`, current roadmap `v3.2.0 Operations Resolution Workspace` 정렬. v3.2 기능 구현, UI 풀테스트, 30분/120분, published metadata, tag, push, GitHub Release evidence가 아님 |
| v3.2.0 (2) | `./server.sh verify-v320-resolution-state-contract` | Resolution State Contract. `/ops/api/events/reviews`의 `media-server.ops.resolution-state.v1` status/reason/close-reopen lifecycle, Ops review JSONL persistence, resolution audit, EventRecord/Event POST/WebRTC/SSE/WS/media path 불변 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, operator assignment flow, client digest, search/metrics, published metadata evidence가 아님 |
| v3.2.0 (3) | `./server.sh verify-v320-unified-ops-events-workspace` | Unified Ops Events Workspace. `/ops/events` resolution queue/detail/timeline workspace UI shell, `unifiedResolutionWorkspace` view model, script/CSS, ops smoke, inventory/release record 연결을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, evidence quality, source reliability, AI review quality, operator assignment flow, client digest, search/metrics, published metadata evidence가 아님 |
| v3.2.0 (4) | `./server.sh verify-v320-evidence-quality-layer` | Evidence Quality Layer. `/ops/api/events/reviews` `unifiedResolutionWorkspace.evidenceQuality`와 `/ops/events` UI가 evidence completeness/confidence/replay coverage hint를 Ops-only로 표시하는지 확인합니다. full replay engine, source reliability, AI review quality, operator assignment flow, client digest, search/metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (5) | `./server.sh verify-v320-source-reliability-context`; 실행 중인 서버 대상 `./server.sh verify-v320-source-reliability-runtime-sample --http-base <running-server>` | Source Reliability Context. `/ops/api/events/reviews` `unifiedResolutionWorkspace.sourceReliability`와 `/ops/events` UI가 source health와 recent failure context, operator recheck hint를 Ops-only로 표시하는지 확인합니다. runtime sample은 fixture EventRecord item을 심고 복원해 개별 item `sourceReliability`가 source id, recheck route, source registry write/source URL/raw JSON/debug/client exposure boundary를 지키는지 확인합니다. source registry write, AI review quality, operator assignment flow, client digest, search/metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (6) | `./server.sh verify-v320-ai-review-quality-context` | AI Review Quality Context. `/ops/api/events/reviews` `unifiedResolutionWorkspace.aiReviewQuality`와 `/ops/events` UI가 correction/review signal, uncertainty reason, quality badge를 Ops-only로 표시하는지 확인합니다. provider call, raw provider material, operator assignment flow, action readiness checklist, client digest, search/metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (7) | `./server.sh verify-v320-operator-resolution-flow` | Operator Resolution Flow. `/ops/api/events/reviews/{eventId}` write path, `unifiedResolutionWorkspace.operatorResolutionFlow`, `/ops/events` assign, note, close, reopen, audit trail UI, `operator-resolution-flow-update` audit를 확인합니다. action checklist, client digest, search/metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (8) | `./server.sh verify-v320-action-readiness-checklist` | Action Readiness Checklist. `/ops/api/events/reviews` `unifiedResolutionWorkspace.actionReadinessChecklist`와 `/ops/events` UI가 rule draft, evidence bundle, notification readiness checklist를 Ops-only로 표시하는지 확인합니다. auto action, external delivery, client digest, search/metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (9) | `./server.sh verify-v320-client-safe-resolution-digest` | Client-safe Resolution Digest. `/client/api/views/{id}/events` `resolutionDigest`와 client live/dashboard/events UI가 resolutionStatus/resolutionLabel/summaryText/severity/timelineHint/time만 viewer-safe로 표시하는지 확인합니다. source/raw/debug/provider/operator material, action controls, UI 풀테스트 직접 조작, 30분/120분, search/metrics, published metadata evidence가 아님 |
| v3.2.0 (10) | `./server.sh verify-v320-resolution-search-metrics` | Resolution Search & Metrics. `/ops/api/events/reviews` `unifiedResolutionWorkspace.resolutionSearchMetrics`와 `/ops/events` UI가 active resolution filters, saved view presets, operations metric summary를 Ops-only로 표시하는지 확인합니다. saved view write, client digest, EventRecord/Event POST/WebRTC/SSE/WS/media path/Rule/Profile payload 변경, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (11) | `./server.sh verify-v320-stabilization-release-readiness` | v3.2.0 local stabilization and release readiness. Step 1~10 local gate, release evidence records, inventory, script dispatch, close-out dry-run command 연결을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release release action evidence를 대체하지 않음 |

## 직전 published baseline v3.1.0 verifier

아래 명령은 v3.1.0 roadmap 구현 단계에서 추가되는 verifier입니다. 아직 구현되지 않은
항목은 문서 gate 또는 후보로만 남기며 PASS 근거가 아닙니다. 실제 실행 가능 여부는 각 스텝 구현 때
`server.sh` wiring과 script inventory로 확인합니다.

| Step | Command | Scope |
| --- | --- | --- |
| V310-S00 | `./server.sh verify-v310-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` | source `3.1.0`, latest published `v3.1.0`, current roadmap `v3.1.0 Encoded Event Clip and Safe Sharing Expansion` 정렬. v3.1 기능 구현, UI 풀테스트, 30분/120분, published metadata, tag, push, GitHub Release evidence가 아님 |
| V310-S01 | `./server.sh verify-v310-event-clip-contract` | EncodedClipManifest, MP4/WebM format, FrameRef/PTS mapping, evidence links, retention/privacy/non-VMS boundary, fixture, inventory, release records 연결 확인. encoder generation, replay UI, cleanup execution, client digest, scoped API, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V310-S02 | `./server.sh verify-analysis-state`, `./server.sh build`, `git diff --check` | EventRecord frame-bundle clip hook이 bounded WebM/VP8 encoded clip artifact, FrameRef-PTS mapping, queue/status manifest, frameMap, partial cleanup, non-VMS boundary를 생성하는지 확인합니다. replay UI, client digest, scoped API, VMS/NVR archive API, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V310-S03 | `./server.sh verify-v310-replay-timeline-ui` | Ops-only /ops/events replay timeline UI가 event frame, representative image, frame bundle, encoded clip timeline, FrameRef/PTS mapping을 표시하는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, client digest, scoped API, cleanup execution, published metadata evidence가 아님 |
| V310-S04 | `./server.sh verify-v310-client-safe-event-digest` | `/client/api/views/{id}/events`와 client live/dashboard/events의 viewer-safe client event digest가 source/raw/debug/provider/feature provenance/encoded clip path/rule action material 없이 summaryText/eventType/status/severity/timelineHint/time만 표시하는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, scoped API, cleanup execution, published metadata evidence가 아님 |
| V310-S05 | `./server.sh verify-v310-scoped-integrator-search-api` | `/client/api/views/{id}/events/search`가 integrator-only PublishedView-scoped event search API로 `event:read:{viewId}`를 요구하고 source/raw/debug/provider/feature provenance/encoded clip path 없이 digest summary만 반환하는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, cleanup execution, vector search, published metadata evidence가 아님 |
| V310-S06 | `./server.sh verify-v310-operator-feature-correction` | `/ops/events` operator feature correction UI와 review API가 correctedFeatureLabel, aliases, reanalysis request를 Ops review state와 audit에만 저장하고 EventRecord/Event POST/WebRTC/SSE/WS/media path, Rule/Profile payload, client/viewer exposure를 변경하지 않는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, vector search, cleanup execution, published metadata evidence가 아님 |
| V310-S07 | `./server.sh verify-v310-optional-vector-search` | default-off optional embedding index가 명시 opt-in일 때만 non-identifying embedding을 quality gate와 dimension gate로 인덱싱하고 rebuild stale vector entry를 제거하는지 확인합니다. provider embedding calls, UI 풀테스트 직접 조작, 30분/120분, client/viewer 노출, published metadata evidence가 아님 |
| V310-S08 | `./server.sh verify-v310-retention-export-hardening` | encoded clip lifecycle cleanup이 EventRecord/EvidenceManifest/FeatureSet/SearchIndex cleanup 계획에 묶이고 release-safe export bundle이 encoded media/path/material을 제외하며 export-bundle audit coverage를 남기는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, vector search, destructive operational cleanup, published metadata evidence가 아님 |
| V310-S09 | `./server.sh verify-v310-stabilization-release-readiness` | v3.1.0 local stabilization and release readiness records, companion gate wiring, release evidence/not-run boundary, close-out dry-run 연결을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release release action evidence를 대체하지 않음 |

## 직전 published baseline v3.0.0 verifier

아래 명령은 v3.0.0 roadmap 구현 단계에서 추가되는 verifier입니다. 아직 구현되지 않은
항목은 문서 gate 또는 후보로만 남기며 PASS 근거가 아닙니다. 실제 실행 가능 여부는 각 스텝 구현 때
`server.sh` wiring과 script inventory로 확인합니다.

| Step | Command | Scope |
| --- | --- | --- |
| V300-S00 | `./server.sh verify-v300-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` | source `3.0.0`, latest published `v3.0.0`, current roadmap `v3.0.0 Event Evidence Search MVP` 정렬. v3.0 기능 구현, UI 풀테스트, 30분/120분, published metadata, tag, push, GitHub Release evidence가 아님 |
| V300-S01 | `./server.sh verify-v300-event-evidence-contract` | EvidenceManifest, FrameRef, retention lifecycle, privacy/non-VMS boundary, fixture, inventory, release records 연결 확인. frame extraction, encoded clip, playback, VMS API, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S02 | `./server.sh verify-analysis-state` | Event recorder media hook이 eventFrame, representativeImage selection, bboxCrop, pre/event/post frameBundle manifest, V300 EvidenceManifest sidecar와 FrameRef를 생성하는지 확인합니다. encoded clip/playback, VMS/NVR archive API, Search DSL, `/ops/events` UI, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S03 | `./server.sh verify-v300-feature-schema-privacy` | FeatureSet envelope, allowed/disallowed matrix, privacy guard, fixture, inventory, release records 연결 확인. VLM queue/runtime/provider success, Search DSL, `/ops/events` UI, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S04 | `./server.sh verify-v300-vlm-feature-queue` | Background feature queue, lazy trigger, missing-runtime/timeout/invalid-output VLM-only failure, FeatureSet revision, inventory, release records 연결 확인. real provider success, Search DSL, `/ops/events` UI, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S05 | `./server.sh verify-v300-feature-only-retention` | Feature-only durable retention, raw prompt/response rejection, FeatureSet revision store, reanalysis revision policy, inventory, release records 연결 확인. Search DSL, Retention/Pin/Cleanup, `/ops/events` UI, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S06 | `./server.sh verify-v300-search-dsl-query-convert` | Natural-language query conversion to constrained Search DSL, strict structured output, text/tags/filter matching, identity-query rejection, inventory, release records 연결 확인. Feature/Search Index, `/ops/events` UI, vector search, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S07 | `./server.sh verify-v300-feature-search-index` | Search across EventRecord, FeatureSet, EvidenceManifest, and operator review state with index/rebuild/report and stale result guard. `/ops/events` UI, vector search, semantic provider rerank, retention cleanup execution, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S08 | `./server.sh verify-v300-ops-events-ui` | Ops-only /ops/events search/detail UI with evidence timeline, feature reasons, retry, pin, retention status and local EventFeatureSearchIndex-backed view model. UI 풀테스트 직접 조작, 30분/120분, retention cleanup execution, published metadata evidence가 아님 |
| V300-S09 | `./server.sh verify-v300-retention-pin-cleanup` | Configurable retention, pin exclusion, dry-run/apply lifecycle cleanup, and audit trail. destructive operational cleanup, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S10 | `./server.sh verify-v300-stabilization-release-readiness` | v3.0.0 local stabilization and release readiness records, companion gate wiring, release evidence/not-run boundary, close-out dry-run 연결을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, release action evidence를 대체하지 않음 |

## 직전 published baseline v2.9.0 verifier

아래 명령은 v2.9.0 roadmap 구현 단계에서 추가되는 verifier입니다. 아직 구현되지 않은
항목은 문서 gate 또는 후보로만 남기며 PASS 근거가 아닙니다. 실제 실행 가능 여부는 각 스텝 구현 때
`server.sh` wiring과 script inventory로 확인합니다.

| Step | Command | Scope |
| --- | --- | --- |
| V290-S00 | `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` | source `2.9.0`, latest published `v2.8.0`, current roadmap `v2.9.0 Final 2.x Closure & Compatibility Baseline` 정렬. published metadata, tag, push, GitHub Release evidence가 아님 |
| V290-S01 | `./server.sh verify-v290-final-contract-freeze` | 2.x final contract freeze 문서/검증 기준. Event POST/WebRTC/SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload의 static freeze gate이며 3.0 신규 기능 구현이나 migration 완료 evidence가 아님 |
| V290-S02 | `./server.sh verify-v290-v28-regression-bundle` | v2.8 기능군 regression gate. v2.8 S02~S06 verifier를 현재 v2.9 source tree에서 재실행하며 v2.8 완료 evidence 재사용이 아니라 v2.9 기준 재실행 evidence |
| V290-S03 | `./server.sh verify-v290-2x-compatibility-baseline` | v2.5~v2.8 핵심 verifier를 v2.9 release gate에서 추적. v2.5~v2.7 핵심 feature verifier와 v2.9 S01/S02 gate를 현재 source tree에서 실행하며 각 하위 verifier가 실제 실행한 범위만 PASS |
| V290-S04 | `./server.sh verify-v290-release-test-records-enforcement` | `docs/release-test-records.md` 저장소 보존형 테스트 기록 체계 적용. 테스트 항목/결과/deprecated/미실행/cleanup/token 섹션을 분리하고 미실행/제외 항목을 PASS/FAIL 표에 섞지 않음 |
| V290-S05 | `./server.sh verify-v290-ui-fulltest-criteria-freeze`, `./server.sh verify-manual-ui-evidence` | v2.9 UI 풀테스트 route/control/action/role/viewport/theme 기준 freeze. 이 명령 PASS는 실제 인앱 브라우저 직접 조작 PASS가 아님. 자동 smoke/raw JSON/screenshot-only/Chrome fallback을 UI 풀테스트 PASS로 승격하지 않음 |
| V290-S06 | `./server.sh verify-v290-release-evidence-hygiene` | release evidence index, release test records, feature inventory, script inventory, manual UI evidence 연결을 확인합니다. 미실행/제외/manual-not-run/미확인은 PASS가 아님. UI 풀테스트 직접 조작, 30분/120분, published metadata 실행 evidence를 대체하지 않음 |
| V290-S07 | `./server.sh verify-v290-public-docs-assets-refresh`, `./server.sh verify-docs-ui-assets` | public README/docs index/UI guide/docs asset policy refresh. 대표 이미지 직접 재캡처/브라우저 검수 PASS가 아님. UI 풀테스트, 30분/120분, published metadata 실행 evidence를 대체하지 않음 |
| V290-S08 | `./server.sh verify-v290-final-stabilization-run` | build/auth/Ops-Client UI/rule/event/metadata/media-schema/docs-inventory final stabilization run 기록을 확인합니다. 30분/120분/UI 풀테스트/published metadata 실행 evidence를 대체하지 않음 |
| V290-S09 | `./server.sh verify-v290-owner-release-readiness` | v2.9.0 local owner release readiness, release close-out dry-run, evidence/records/policy 경계를 확인합니다. PR/tag/GitHub Release/published metadata 실행 evidence를 대체하지 않음 |

## 최신 published baseline v2.8.0 verifier

아래 명령은 v2.8.0 roadmap 구현 단계에서 추가된 verifier입니다. v2.9.0 완료
evidence로 재사용하지 않습니다.

| Step | Command | Scope |
| --- | --- | --- |
| V280-S01 | 문서 gate, command 미구현 | `2.8.0`/`2.9.0`/`3.0.0` 경계, source-only/latest published/source tag 정렬, 3.0 migration 구현 비범위 |
| V280-S02 | `./server.sh verify-v280-incident-action-readiness-queue` | `/ops/events` action readiness queue, ready/blocked/field-smoke-needed/not-run 상태, external delivery/auto write 비범위 |
| V280-S03 | `./server.sh verify-v280-approval-gated-rule-draft` | approval state, staged rule draft, validation summary, no-auto-save/no-auto-apply/full replay 비범위 |
| V280-S04 | `./server.sh verify-v280-evidence-intake-field-readiness` | redacted evidence intake, source health recheck, field smoke precondition, endpoint/credential 없는 field PASS 금지 |
| V280-S05 | `./server.sh verify-v280-runtime-evidence-window` | bounded runtime/source/event evidence window, no longrun substitute, no persistent archive |
| V280-S06 | `./server.sh verify-v280-client-safe-followup-digest` | viewer-safe follow-up digest, source/raw/debug/provider/rule editor 비노출 |
| V280-S07 | `./server.sh verify-v280-owner-release-readiness` | v2.8.0 local release readiness, feature inventory, UI criteria, not-run/published boundary |

## 직전 v2.7.0 verifier

아래 명령은 최신 published baseline인 v2.7.0 verifier입니다. v2.8.0 예정 항목의
완료 evidence로 재사용하지 않습니다.

| Step | Command | Scope |
| --- | --- | --- |
| V270-S01 | `./server.sh verify-v270-incident-triage-board` | `/ops/events` Incident Triage Board view model/UI marker, lane/filter/sort, client/viewer 비노출, provider/auto-action 비범위 |
| V270-S02 | `./server.sh verify-v270-incident-decision-scorecard` | deterministic priority reason, source health/similar incident/VLM candidate 연결, raw JSON/source URL 비노출 |
| V270-S03 | `./server.sh verify-v270-operational-action-pack` | evidence bundle/rule draft/alert dry-run/source health recheck 연결과 외부 실제 발송/자동 rule write 비범위 |
| V270-S04 | `./server.sh verify-v270-rule-what-if-preview` | selected incident/rule suggestion preview, `/ops/rules` draft-only 연결, full replay engine/auto apply 비범위 |
| V270-S05 | `./server.sh verify-v270-operator-outcome-memory` | 기존 Ops review state/audit 기반 history hint, EventRecord top-level/client viewer 비노출 |
| V270-S06 | `./server.sh verify-v270-owner-release-readiness` | v2.7.0 local release readiness, feature inventory, UI criteria, not-run/published boundary |

## 직전 v2.6.0 verifier

| Step | Command | Scope |
| --- | --- | --- |
| V260-S01 | `./server.sh verify-v260-incident-memory-productization` | VLM summary candidate를 `/ops/events` Ops-only incident memory manual review view model/UI에 연결하고 client/viewer/provider/auto-rule 비범위를 확인 |
| V260-S02 | `./server.sh verify-v260-rule-suggestion-review` | rule suggestion 후보를 `/ops/events` incident-to-rule manual review 카드와 `/ops/rules` draft-only workflow로 연결하고 자동 저장/schema/media/client 비범위를 확인 |
| V260-S03 | `./server.sh verify-v260-onvif-credential-gate` | ONVIF credential binding/store 선택값, source:write gate, URL credential reject, draft redaction guard, persistent store 비범위를 확인 |
| V260-S04 | `./server.sh verify-v260-runtime-dashboard-trends` | `/ops/dashboard` runtime baseline/sparkline 후보를 page-session-only sample로 표시하고 longrun/schema/media/client 비범위를 확인 |
| V260-S05 | `./server.sh verify-v260-scenario-cross-zone-reentry` | ReEntry `configured-zones` A→B 후보, rule payload parser, analysis-state/replay fixture, UI marker, schema/media/client 비범위를 확인 |
| V260-S06 | `./server.sh verify-v260-owner-release-readiness` | v2.6.0 local release readiness gate, feature inventory, UI criteria, evidence index, not-run/published boundary를 확인 |

## Runtime/media longrun trigger matrix

장기 테스트 실행 여부는 `media-server.runtime-media-longrun-trigger-matrix.v1` 기준으로
short stability, 30분 soak, 120분 predev, 120분 runtime console, UI 풀테스트를
분리해 판단합니다. `docs-policy-only`, `rtsp-gstreamer-webrtc-session-lifecycle`,
`runtime-dashboard-metadata-fanout`, `VLM longrun trigger matrix`,
`vlm-queue-timeout-nonblocking`, `vlm-memory-runtime-cache`,
`vlm-provider-timeout-cloud`, `vlm-model-install-state`는 trigger matrix의 대표
분류입니다. 30분 soak는 120분 longrun PASS를 대체하지 않습니다.

## 장기 테스트 명령

장기 테스트는 명시 지시 또는 승인 없이 실행하지 않습니다.

| 명령 | 역할 |
| --- | --- |
| `./server.sh verify-predev --soak-minutes 30` | 30분 soak |
| `./server.sh verify-predev --soak-minutes 120` | 120분 soak |
| `./server.sh verify-uri-longrun` | URI source longrun |
| `./server.sh verify-event-post-longrun` | Event POST longrun |
| `./server.sh verify-va-runtime-console-longrun` | VA runtime console longrun |
| `./server.sh verify-va-runtime-console-longrun --duration-minutes 120` | VA runtime console 120분 longrun |
| `./server.sh verify-va-runtime-console-cycles` | VA runtime cycle 검증 |
| `./server.sh verify-longrun-separation` | short/longrun 분리 guard |
| `./server.sh verify-runtime-dashboard-longrun-template` | runtime dashboard 120분 longrun template guard |
| `./server.sh verify-runtime-media-longrun-trigger-matrix` | `media-server.runtime-media-longrun-trigger-matrix.v1` trigger matrix |
| `./server.sh verify-rc-release-gate` | RC release gate summary |

## Runtime Dashboard Longrun Evidence

- longrun template이나 sample fixture는 실행 증거가 아니며, 실행 report가 없으면 PASS evidence가 아닙니다.
- 120분 미실행 기록은 30분 또는 short smoke PASS로 대체하지 않습니다.
- 30분 longrun, cycle 검증, sample fixture를 120분 PASS evidence로 쓰지 않음.
- RC artifact 또는 외부 archive 보존 위치와 retention days를 기록합니다.

## EventRecord Dispatch Verification

- `verify-va-events --dispatch-records`는 모든 poll을 dispatch 대상으로 삼습니다.
- storage가 꺼져 있으면 긴 polling 전에 실패합니다.
- EventRecord storage enabled와 disabled 상태를 분리해서 기록합니다.
- EventRecord storage is disabled / EventRecord storage disabled during dispatch verification 문구는 제품 회귀와 환경 문제를 분리하기 위한 guard입니다.

## Auth / UI / Rule / Media Commands

| 묶음 | Commands |
| --- | --- |
| Auth | `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-auth-regression-matrix`, `verify-auth-ui-smoke`, `verify-auth-scope-picker` |
| Product UI | `verify-ops-client-ui`, `verify-ops-client-ui --screenshots`, `verify-ops-click-e2e`, `verify-ops-route-boundaries`, `verify-product-ui-no-native-dialogs`, `verify-ui-blocking-dialog-policy` |
| Rules/VA | `verify-rule-ui`, `verify-ops-rules-roundtrip`, `verify-ops-rule-validation-matrix`, `verify-va-replay`, `verify-va-events`, `verify-va-event-coverage-report`, `verify-analysis-state` |
| Media/metadata | `verify-codecs`, `verify-webrtc-ice`, `verify-webrtc-va-metadata`, `verify-va-metadata-sidechannel`, `verify-ws-metadata`, `verify-event-post`, `verify-event-post --mode schema`, `verify-event-post --mode recovery` |
| Release/docs | `verify-release-metadata`, `verify-release-closeout-helper`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-script-inventory` |

Auth verifier는 고정 기본 비밀번호를 문서나 스크립트에 두지 않습니다. 테스트 실행자가 아래 env를 모두 제공하지 않으면 auth 테스트를 시작하지 않고 실패로 기록합니다.

| Env | 용도 |
| --- | --- |
| `MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD` | 테스트용 현재 비밀번호 |
| `MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD` | 비밀번호 history 검증용 이전 비밀번호 |
| `MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD` | 비밀번호 history 검증용 두 번째 이전 비밀번호 |
| `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE` | 실패 로그인 검증용 오입력값 1 |
| `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO` | 실패 로그인 검증용 오입력값 2 |

## Conditional Field / Provider Gates

| Gate | Command | Boundary |
| --- | --- | --- |
| ONVIF field smoke | `verify-onvif-field-smoke-gate`, `verify-onvif-no-device-suite` | no-device suite is not field smoke PASS |
| External TURN/WHEP | `verify-external-turn-whep-field-gate` | endpoint/credential 없는 default PASS 금지 |
| VLM cloud provider | `verify-vlm-cloud-provider-field-smoke-gate` | provider call 미실행은 PASS가 아님 |
| VLM local runtime | `verify-vlm-local-runtime-smoke` | loopback local runtime smoke이며 cloud/provider/model 품질 evidence가 아님 |

## VLM / Runtime Boundary Commands

핵심 VLM/runtime verifier는 아래처럼 범위별로 나눠 실행합니다.

- 선택/추천: `./server.sh verify-vlm-boundary`,
  `./server.sh verify-vlm-selection-decision`,
  `./server.sh verify-vlm-pc-capability`,
  `./server.sh verify-vlm-recommendation-engine`
- 설치/연결: `./server.sh verify-vlm-install-connection-dry-run`,
  `./server.sh verify-vlm-install-connection-ui`,
  `./server.sh verify-vlm-install-connection-scope-gate`
- profile/runtime: `./server.sh verify-vlm-profile-storage`,
  `./server.sh verify-vlm-runtime-opt-in-contract`,
  `./server.sh verify-vlm-runtime-status-ui`
- 평가/workflow: `./server.sh verify-vlm-evaluation-harness`,
  `./server.sh verify-vlm-evaluation-result-workflow`,
  `./server.sh verify-vlm-review-action-workflow`,
  `./server.sh verify-vlm-rule-suggestion-draft-workflow`
- sidecar/evidence: `./server.sh verify-vlm-observation-sidecar`,
  `./server.sh verify-vlm-event-evidence-extraction`,
  `./server.sh verify-vlm-event-explanation-hints`
- privacy/search/stability: `./server.sh verify-vlm-privacy-transfer-guard`,
  `./server.sh verify-vlm-summary-search-candidates`,
  `./server.sh verify-vlm-rule-suggestion-candidates`,
  `./server.sh verify-vlm-test-rehearsal`,
  `./server.sh verify-vlm-queue-backpressure-stability`,
  `./server.sh verify-v300-vlm-feature-queue`,
  `./server.sh verify-runtime-model-bundle-rc-rehearsal`

모델 선택 결정 자체는 `verify-vlm-selection-decision`의 범위이며, runtime/model bundle 생성이나 provider 품질 PASS가 아닙니다.

## UI Visual / Release Artifact Commands

Release / Visual Baseline Readiness는 release 준비에서 screenshot artifact와 release dry-run을 분리하는 기준입니다.

- `media-server.release-visual-baseline-automation.v1`
- `media-server-release-closeout-helper-dry-run`
- `verify-docs-ui-assets`
- `verify-ui-visual-artifact-index`
- `verify-ui-release-baseline-approval-log`
- `write-ui-visual-baseline-comment`
- `write-ui-visual-qa-issue-links`
- `ui-visual-artifact-maintenance`

## Historical Verifier Boundary

과거 버전 verifier는 내부 호환성 확인에만 사용합니다. 공개 release PASS, UI 풀테스트
PASS, 장시간 테스트 PASS로 재사용하지 않습니다.
