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
| `./server.sh verify-feature-inventory-coverage` | `media-server.feature-inventory-coverage.v1`, `coverageStatus: covered/missing`, `executionEvidenceStatus: not-execution-evidence`, `missing coverage target`, 누락 ID는 release gate에서 FAIL |
| `./server.sh verify-feature-implementation-evidence` | `media-server.feature-implementation-evidence.v2` manifest의 986개 ID별 closure schema v2 content-addressed owner→route/control→action→state→readback→verifier 5-edge, 고유 review reason/digest, canonical 30/120분 mapping을 검증. Refresh는 reviewed map만 보존하고 drift 행을 review-required로 남기며 token scoring/bulk approval을 사용하지 않음. 실행 PASS가 아님 |
| `./server.sh verify-v390-review4-feature-semantic-source-audit` | 986개 actual source-flow proof와 frozen trust rule, candidate digest, external approval ledger를 대조하며 family/ID 범위 실행과 승인 manifest 적용을 분리함. 제품/UI/장시간 실행 PASS가 아님 |
| `./server.sh verify-v390-review4-feature-semantic-source-approvals` | 사용자 reviewer decision artifact를 current candidate/inventory/generation boundary와 결속해 exact ordered 986 approval ledger로 정규화하고 no-write readback을 검증함. Candidate generator 자체 승인이 아님 |
| `./server.sh verify-v390-review4-feature-semantic-source-approval-selftest` | generator spoof, mixed candidate/date, reviewer actor mismatch, decision/approval tamper를 거부하는 non-gate negative contract. 실제 986행 승인이나 제품 실행을 대체하지 않음 |
| `./server.sh verify-feature-semantic-closure-contract` | 986행/986 unique call-chain과 `UI-002`, 교정된 `SAFE-140`/`RULE-017` positive, wrong/unrelated/same-file/generic/ID-only/missing-edge/digest/bulk-review negative 19개를 검증. 실행 테스트 PASS가 아님 |
| `./server.sh verify-v390-review3-discovery-ledger` | V390-REVIEW3-36의 `AGENTS.md` 별도 전문 감사, 나머지 tracked Markdown 173개 파일별 full-read SHA-256/classification/status marker/duplicate/action, source/tooling explicit incomplete marker disposition, RulesJson 두 scope decision과 986-row 불변을 검증. 문서/source 정적 coverage이며 UI/30분/120분 실행 PASS가 아님 |
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

## 현재 v3.9.0 verifier

아래 명령은 v3.9.0 Feature Completion, Structure Stabilization, and Test Model
Preparation의 source baseline, feature completion inventory, user review gate 준비
gate입니다. 실제 feature development, UI 풀테스트, 30분/120분 longrun,
published metadata, release action evidence가 아닙니다.

| Step | Command | Scope |
| --- | --- | --- |
| v3.9.0 (1) | `./server.sh verify-v390-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` | source `3.9.0`, latest published `v3.8.0`, current roadmap `v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation` 정렬. v3.9 기능 discovery/dev, UI 풀테스트, 30분/120분, tag, push, GitHub Release evidence와는 별도 gate입니다 |
| v3.9.0 (2) | `./server.sh verify-v390-feature-completion-inventory` | v3.9 feature completion inventory scaffold, discovery source groups, disposition/test-area vocabulary, user review gate 경계를 확인합니다. 실제 feature discovery 완료, 기능 구현, 구조 안정화 구현, 테스트 방식 전환 구현, UI 풀테스트, 30분/120분, published metadata, release action evidence가 아닙니다 |
| v3.9.0 (3) | `./server.sh verify-v390-user-review-gate` | initial historical review-ready snapshot의 승인 전 개발 중단 경계와 후속 사용자 goal 이후 current `approved-through-recorded-user-goals`/`closed-with-evidence` 상태를 함께 검증합니다. current review closure도 UI 풀테스트, 30분/120분, published metadata, release action evidence가 아닙니다 |
| v3.9.0 (4)~(6) | `./server.sh verify-manual-ui-evidence`, `./server.sh verify-v390-feature-completion-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-project-inventory` | Required Closeout `V390-REQ-001`~`V390-REQ-003` 문서/test-source gate입니다. manual UI 기준서 v3.9 current화, 장시간/UI 테스트 시작 조건 v3.9화, `v3.5-v3.8 UI coverage bridge`를 확인합니다. UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence가 아닙니다 |
| v3.9.0 (7)~(10) | `./server.sh verify-v390-evidence-test-gate-prep`, `./server.sh verify-ui-fulltest-one-shot`, `./server.sh verify-feature-inventory-coverage` | Evidence/Test Gate와 Test Model Prep 문서/test-source gate입니다. UI wrapper `wrapperResult`/`uiFulltestEvidenceStatus`/`manualResultStatus`/`longrunStatus`, feature coverage `covered/missing` wording, AI-minimized 30분/120분 stop-on-fail runner 기준, 무료 UI automation adapter failure report 기준을 확인합니다. UI 풀테스트 직접 조작, 30분/120분 longrun 실행, published metadata, release action evidence가 아닙니다 |
| v3.9.0 (11) | `./server.sh verify-v390-onvif-credential-provider-status` | ONVIF credential/provider status summary. `/ops/api/onvif/credential-provider-status`와 `/ops/sources`가 primary provider `none`, fallback `in-memory-fixture`, persistent/external secret store defer, secret/reference value 비노출 상태를 Ops-only read-only summary로 표시하는지 확인합니다. credential lookup, credential material/reference value exposure, source/view write, Auth/Role/Scope/schema/media 변경, UI 풀테스트 직접 조작, 30분/120분 longrun, field credential success evidence가 아닙니다 |
| v3.9.0 (12) / V390-ADD1-05 + V390-REVIEW4-55 | `./server.sh verify-v390-onvif-source-view-atomicity`, `./server.sh verify-v390-onvif-live-import-persist-decision` | ONVIF import draft는 `notSaved:true`, `oneShotPersist=false`를 유지합니다. 명시적 form save/toggle은 `/ops/api/onvif/channels/{channelId}` paired route를 사용하며 양쪽 선검증, private rollback snapshot, durable prepared/committed marker, first/second-write rollback, prepared/source/view/committed crash restart recovery, bytes/existence/mode, retry, concurrent pair no-mix, transaction artifact cleanup을 actual HTTP/file 19개 case로 확인합니다. multi-process writer coordination, ONVIF 실기기, UI 풀테스트 직접 조작, 30분/120분 longrun, field success evidence가 아닙니다 |
| v3.9.0 (21) / V390-REVIEW3-38 | `./server.sh verify-v390-analysis-registry-durable-write` | Analysis Registry의 12개 create·update·delete를 mode-preserving temp write/file fsync/close→rename→parent directory fsync로 저장합니다. 12개 정상 성공, 9-stage fault 108개와 3-point crash/restart 36개가 typed HTTP 500, pre-rename no-change, post-rename candidate consistency, stale-temp recovery, mode/cleanup을 확인하며 UI 풀테스트, 30분/120분 longrun, release action evidence가 아닙니다 |
| V390-REVIEW4-54 | `./server.sh verify-v390-analysis-registry-durable-write`, `./server.sh verify-analysis-state` | REVIEW3-38의 post-rename failure 의미를 supersede합니다. Prepared/committed transaction marker와 rollback snapshot으로 HTTP 500은 memory·file·restart 모두 이전 상태, success는 parent-directory fsync와 committed marker 뒤 candidate 상태입니다. 신규 mode `0640`, 기존 mode 보존, success 12/failure 108/retry 108/crash 48/artifact 0과 analysis state 181/0을 확인하며 Auth 전용/UI/30분/120분/release action evidence가 아닙니다 |
| V390-REVIEW4-57 | `./server.sh verify-v390-ui-native-exact-cases-contract`, `./server.sh verify-v390-ui-policy-v4-producer-contract`, `./server.sh verify-ui-fulltest-evidence-policy-v4-contract` | Requested canonical `route/accountRole/viewport/theme/controlAction`과 runtime observed `screenRoute/accountRole/viewport/theme/controlAction/provenance`를 서로 다른 exact projection으로 검증합니다. Runner는 browser URL, `/auth/whoami`, 실제 viewport, media-query theme, DOM control state를 수집하고 legacy alias/requested 복사/누락·추가 field/adapter tool-engine drift를 거부합니다. Contract와 plan-only는 actual exact 424 UI, 58 completion, 59 visual, 60 Policy 독립성, 30분/120분 evidence가 아닙니다 |
| V390-REVIEW4-59 | `./server.sh verify-v390-ui-visual-evidence-contract`, `./server.sh verify-v390-ui-native-adapter-contract`, `./server.sh verify-v390-ui-policy-v4-producer-contract`, `./server.sh verify-ui-fulltest-evidence-policy-v4-contract` | Canonical/native-bound 대표 route 10개를 320/390/760/1180×light/dark로 확장한 exact 80-probe v2 plan을 검증합니다. 실제 `data-theme`, screenshot pixel 정보량, geometry/contrast/focus/overflow를 재계산하고 `/client/live`는 tile `data-view-id`와 session/answer URL `viewId`, session 응답과 answer URL `sessionId`가 모두 같은 VA session, live track/frame progress, contain content rect, placeholder/control containment을 요구합니다. 합성 contract와 424 plan-only는 actual browser capture나 exact 424 UI/30분/120분 PASS가 아닙니다 |
| V390-REVIEW4-60 | `./server.sh verify-v390-ui-policy-v4-independence-contract`, `./server.sh verify-v390-ui-policy-v4-producer-contract`, `./server.sh verify-ui-fulltest-evidence-policy-v4-contract` | Producer는 raw trace/action/network/readback/visual capture만 보존하고 qualifier는 별도 모듈에서 exact action·selector·request/response·fresh semantic readback·requested/observed·visual을 재계산합니다. Producer의 result/replay/completion/visual/current-source self-claim은 PASS 입력이 아닙니다. Contract 10/0·8/0·20/0은 source readiness이며 actual exact 424 browser와 80-probe capture, 30분/120분 PASS가 아닙니다 |
| V390-REVIEW4-61 | `./server.sh verify-v390-longrun-evidence-measurement-contract`, `./server.sh verify-v390-server-longrun-runner-contract`, `./server.sh verify-v390-test-acceptance-bundle-contract`, `./server.sh verify-v390-final-evidence-integrity-contract` | Longrun v2 summary는 runner `process.hrtime.bigint`와 delegated Bash `SECONDS` monotonic 시작/종료/경과시간, requested duration, exact ordered iteration ledger와 delegated step ledger를 함께 검증합니다. 120분 정책 필요성은 AGENTS 7.6.2 change-scope trigger에서 계산하고 `--run-120`은 trigger 생성이 아닌 실행 승인만 표현합니다. Cleanup은 허용된 command identity/PID, listener owner 전후, bindable port, contained artifact의 `bytesBefore`/`bytesAfter`를 raw measurement로 기록하고 acceptance/final integrity가 독립 재검증합니다. Contract/fixture는 실제 30분/120분 또는 UI 실행 evidence가 아닙니다 |
| V390-REVIEW4-62 | `./server.sh verify-v390-test-acceptance-bundle-contract`, `./server.sh verify-v390-ui-native-exact-cases-contract`, `./server.sh verify-v390-ui-native-adapter-contract` | Canonical acceptance가 임시 HTTP/RTSP server, bounded port 재시도, admin/operator/viewer/integrator 계정, 0600 storage-state, Playwright/browser provenance, PID·listener·artifact ownership과 cleanup을 직접 소유합니다. Exact runner는 acceptance runtime descriptor 안에서 case별 fresh role session, persisted state snapshot/restore, cross-role action 전환, runtime-only secret resolver와 cleanup readback을 수행합니다. `/ops/users` product case는 admin role로 실행합니다. Contract/fixture/plan-only는 실제 30분·exact 424 browser·80 visual·120분 PASS가 아닙니다 |
| v3.9.0 (13) | `./server.sh verify-v390-vlm-rule-suggestion-draft-bridge` | VLM rule suggestion draft bridge. `/ops/api/vlm/rule-suggestion-draft-bridge`와 `/ops/rules`가 review-to-draft bridge, incident review provenance, manual-save-only boundary를 표시하고 기존 `/ops/api/vlm/rule-suggestion-drafts` workflow를 유지하는지 확인합니다. rule/profile registry write, auto-apply, provider/runtime call, client/viewer exposure, EventRecord/Event POST/WebRTC/SSE/WS/schema/media 변경, UI 풀테스트 직접 조작, 30분/120분 longrun evidence가 아닙니다 |
| v3.9.0 (14) | `./server.sh verify-v390-vlm-evaluation-promotion-guard` | VLM evaluation promotion guard. `/ops/api/vlm/evaluation-promotion-guard`와 `/ops/vlm`가 `server-verified-evaluation-promotion`, `operator-select-candidate-then-server-verify-save`, candidate-reference-only boundary를 표시하는지 확인합니다. 실제 forged request HTTP matrix는 V390-ADD1-03 verifier가 담당하며 UI 풀테스트·장시간 evidence가 아닙니다 |
| V390-REVIEW3-39 profile JSON | `./server.sh verify-v390-vlm-promotion-trust-boundary` | 14개 PUT/GET promotion, exact/escaped duplicate·nested-shadow·malformed·trailing structural save 7개, restart full-contract/structure quarantine 13개를 실행합니다. Strict parser는 exact top-level/object scope와 decoded key type을 사용합니다. runtime/provider/sidecar 호출, client/viewer payload, Event POST/WebRTC/SSE/WS/media/API schema 변경, UI 풀테스트 직접 조작, 30분/120분 evidence가 아닙니다 |
| V390-REVIEW3-39 rule provenance | `./server.sh verify-v390-vlm-incident-rule-provenance` | 실제 EventRecord와 VLM observation/ruleSuggestion을 준비해 정상 save/readback/restart, forged/duplicate/nested-only/stale/deleted no-write, restart forged/duplicate/nested/deleted-record quarantine를 실행합니다. Auto-save/apply, provider/runtime 호출, EventRecord/Event POST/WebRTC/SSE/WS/media/API schema 변경, UI 풀테스트 직접 조작, 30분/120분 evidence가 아닙니다 |
| V390-REVIEW2-30 | `./server.sh verify-v390-onvif-source-view-atomicity` | Pre-transaction source/view file snapshot의 existence/raw bytes/mode를 기준으로 unknown extension/format, create/update, source-only/view-only, first/second replace failure, rollback failure를 검증합니다. HTTP/API schema, ONVIF 실기기, UI 풀테스트, 30분/120분 evidence가 아닙니다 |
| v3.9.0 (15) | `./server.sh verify-v390-backup-recovery-handoff-validation` | Backup/recovery handoff validation. `/ops/api/source-registry/staging-restore-validation-handoff`와 `/ops/sources`가 `staging-restore-validation-checklist-result-handoff`, source registry, PublishedView, source health, viewer scope checklist/result artifact contract를 표시하고 기존 `/ops/api/source-registry/backup-recovery-handoff`와 `verify-v340-staging-restore-validation-harness` 경계를 유지하는지 확인합니다. production restore cutover, SourceRegistry/PublishedView write, automatic recovery, client/viewer exposure, EventRecord/Event POST/WebRTC/SSE/WS/schema/media 변경, UI 풀테스트 직접 조작, 30분/120분 longrun evidence가 아닙니다 |
| v3.9.0 (16) | `./server.sh verify-v390-action-execution-deferral-decision` | Action execution deferral decision. `/ops/api/actions/execution-deferral-decision`와 `/ops` Action Control Workspace가 `defer-all-action-writes`, source recheck, client notice send, rule apply deferred 상태를 표시하고 기존 v3.8 action pilot/default-off explanation 경계를 유지하는지 확인합니다. action execution, request/approval/readiness/outcome/receipt persist, source recheck, client notice send, rule apply, external delivery, EventRecord/Event POST/WebRTC/SSE/WS/schema/media 변경, UI 풀테스트 직접 조작, 30분/120분 longrun evidence가 아닙니다 |
| v3.9.0 (17) | `./server.sh verify-v390-conditional-field-ai-decisions` | Field evidence bridge decision. `/ops/api/field-evidence/bridge-decision`와 `/ops` dashboard가 `approval-only-minimal-field-evidence-bridge`, ONVIF/external WHEP-TURN/cloud-VLM 승인 조건, minimal evidence contract, not-run boundary를 표시하는지 확인합니다. field smoke, endpoint/credential probe, provider call, source/view/EventRecord/Ops audit write, raw endpoint/credential/provider material, media/schema 변경, UI 풀테스트 직접 조작, 30분/120분 longrun evidence가 아닙니다 |
| v3.9.0 (18) / V390-ADD1-04 | `./server.sh verify-v390-reid-readiness-consistency`, `./server.sh verify-v390-conditional-field-ai-decisions` | Re-ID readiness consistency. `explicit-opt-in-provenance-gated-assist`를 유지하면서 extractor factory와 `/ops/api/analysis/reid-assist-decision`가 공용 `InspectAppearanceModelReadiness`를 사용하고 regular file, SHA format/read/match, trim provenance, OpenSSL·ONNX Runtime을 확인하는지 no-crypto/no-ONNX C++ 2종과 실제 HTTP 10개 case로 검증합니다. Ops UI는 preflight와 session load/execution을 분리하며 raw path/SHA/provenance를 노출하지 않습니다. 실제 ONNX session 성공, identity search, UI 풀테스트 직접 조작, 30분/120분 longrun evidence가 아닙니다 |
| v3.9.0 (17) Evidence 13~14 | `./server.sh verify-v390-final-evidence-integrity --summary <acceptance-summary.json>`, `./server.sh verify-v390-test-acceptance-bundle --output-dir docs/release-artifacts/v3.9.0/test-acceptance-final` | Final evidence integrity와 독립 acceptance 재실행입니다. canonical root 교체 전 기존 screenshot/video placeholder 수와 크기를 기록하고, 새 bundle은 screenshot content dedupe, placeholder video 부재, source commit SHA·명령·first failure, child/filesystem/port 실측 cleanup을 보존합니다. 실제 bundle의 30분/UI-108~115 자동화는 exact 424개 UI 풀테스트, 조건 미충족 120분, published metadata, release action PASS가 아닙니다 |
| v3.9.0 (17) Development 15 | `./server.sh verify-v390-vlm-incident-rule-provenance` | VLM sidecar candidate의 event/observation/source, candidate/kind, observation-context-only evaluation metadata가 optional `vlmProvenance`를 통해 `/ops/rules` 수동 draft와 `/lab/analysis/rules/{id}` PUT/save/readback까지 보존되는지 실제 HTTP로 확인합니다. generated rule ID 또는 save route mismatch는 no-write로 거부하며 auto-save/apply, 실제 provider evaluation, EventRecord/Event POST/WebRTC/SSE/WS/media 변경, UI 풀테스트, 30분/120분 PASS가 아닙니다 |
| v3.9.0 (17) Development 16 / REVIEW4-63 | `./server.sh verify-v390-deferred-product-owner-signoff`, `./server.sh verify-v390-truthfulness-status-vocabulary` | `.github/CODEOWNERS` effective rule의 `@dhseo90`를 `repository-code-owner`로 결속한 `accountable-owner-decision-record`입니다. Exact 5개에 production restore를 포함하고 field smoke를 별도 `conditional-not-run`으로 유지하며, mixed capability truth와 `post-v3.9-unassigned` dependency를 검증합니다. 현재 실행/field/UI/longrun/release PASS가 아닙니다 |
| v3.9.0 (17) Development 17 | `./server.sh verify-v390-structure-stabilization-readiness`, `./server.sh verify-v390-truthfulness-status-vocabulary` | structure output은 `approved-scheduled-after-review4-50-63`, implementation `not-executed`, `approved-decision-contract-not-refactor-evidence`입니다. REVIEW4-64 refactor나 65 acceptance 완료/PASS가 아닙니다 |
| V390-REVIEW3-48 actual module graph | `./server.sh verify-v390-structure-stabilization-readiness` | actual C++ 148개/CMake cpp declared 74·default active 73를 9 owner와 single target/link에 묶고 32 include direction, 25 target violation, legacy 3 edge, 8-owner SCC, 6 slice binding을 검사합니다. PASS는 current debt baseline이며 refactor 완료가 아닙니다 |
| V390-REVIEW3-49 superseded historical structure execution scope decision | `./server.sh verify-v390-structure-stabilization-readiness` | 당시 graph/guard-only와 v4.0.0 이관 결정을 보존합니다. REVIEW4-51이 이를 supersede해 50~63 뒤 current v3.9.0에서 64를 실행하며, 어느 decision PASS도 refactor 실행 PASS가 아닙니다 |
| V390-REVIEW4-51 v3.9 actual refactor scope decision | `./server.sh verify-v390-review4-structure-scope-decision` | 최신 사용자 지시가 50~63 완료 뒤 64번 actual refactor를 current `v3.9.0` branch에서 실행하고 v4.0.0 이관을 금지한 결정을 `approved-actual-refactor-after-review4-50-63` mode, base `027678ba`, 9 preserved contract, 6 slice, 64 뒤 `V390-REVIEW4-65` acceptance와 결속합니다. Decision PASS는 refactor/acceptance 실행 PASS가 아닙니다 |
| V390-REVIEW4-64 Slice 1 composition root | `./server.sh verify-v390-review4-structure-stabilization-execution` | Historical REVIEW4-51 승인 SHA와 current execution graph를 분리합니다. `main.cpp`는 application composition root에 위임하고 shared SessionManager, RTSP→HTTP start, HTTP→RTSP→EventStorage cleanup, auth-user CLI를 보존합니다. Current target 위반 direction 22/최대 SCC 8이며 Slice 2~6과 REVIEW4-65 actual acceptance는 미실행입니다 |
| V390-REVIEW4-64 Slice 2 route/API handler | `./server.sh verify-v390-action-execution-deferral-decision`, `./server.sh verify-v390-review4-structure-stabilization-execution` | Action deferral exact JSON/method/path/status/cache owner를 transport-neutral module로 이동하고 outer Ops auth guard와 non-GET fallback을 보존합니다. Actual HTTP auth 401/auth-off GET 200 no-store/POST 404, target 위반 21/SCC 8입니다. Slice 3~6과 REVIEW4-65는 미실행입니다 |
| V390-REVIEW4-64 Slice 3 registry/domain | `./server.sh verify-ops-source-registry-api`, `./server.sh verify-v390-onvif-source-view-atomicity`, `./server.sh verify-v390-review4-structure-stabilization-execution` | SourceRegistry가 transport-neutral authorizer만 소비하고 HTTP adapter가 기존 operator/RequireScope wildcard 판정을 소유합니다. Actual SRC-001~068, lifecycle, crash/restart 19 cases, companion 25/25, target 위반 20/SCC 8을 확인했습니다. Feature evidence 8,752 drift는 Slice 6 blocker이며 Slice 4~6/REVIEW4-65는 미실행입니다 |
| V390-REVIEW4-64 Slice 4 UI script/CSS | `./server.sh verify-v390-action-execution-deferral-decision`, `./server.sh verify-v380-ops-action-control-workspace-ui`, `./server.sh verify-v390-ui-native-exact-cases`, `./server.sh verify-ui-fulltest-evidence-policy-v4-contract`, `./server.sh verify-v390-review4-structure-stabilization-execution` | Action deferral HTML/renderer exact bytes와 shared CSS SHA를 보존해 focused UI owner로 이동했습니다. Loopback-only auth-off static smoke 28/0, exact 424 contract, Policy v4 20/0, target 위반 19/SCC 8을 확인했지만 실제 browser 424/visual/rule smoke, feature evidence 재결속, Slice 5~6/REVIEW4-65는 미실행입니다 |
| V390-REVIEW4-64 Slice 5 VLM parser | `./server.sh verify-v390-vlm-incident-rule-provenance`, `./server.sh verify-v390-vlm-promotion-trust-boundary`, `./server.sh verify-vlm-profile-storage`, `./server.sh verify-v390-review4-structure-stabilization-execution` | Strict JSON core utility와 provenance application-service owner를 분리해 actual save/readback/restart/no-write, trust HTTP 14/structural 7/reload 13, profile 6/0, target 위반 18/SCC 8을 확인했습니다. SAFE-025 evidence binding과 8,752 current evidence drift, provider/runtime/UI/longrun, Slice 6/REVIEW4-65는 미완료입니다 |
| V390-REVIEW4-64 continuation Slice 2 principal view boundary | `./server.sh verify-v390-product-ui-principal-view-boundary`, `./server.sh verify-auth-bootstrap`, `./server.sh verify-auth-users`, `./server.sh verify-auth-routes`, `./server.sh verify-v390-review4-structure-stabilization-execution` | Stable-contract `ProductUiPrincipalView`와 transport-only adapter로 product UI→transport/Auth 방향을 제거합니다. HTML 15개 byte baseline, Auth 19/0·72/0·146/0, static UI 28/0, target 위반 21→20을 확인했지만 SCC 8·single target·40,833줄 transport debt가 남아 REVIEW4-64/65 완료 evidence가 아닙니다 |
| V390-REVIEW4-64 continuation Slice 3 source request parser owner | `./server.sh verify-v390-source-request-parser-owner`, `./server.sh verify-codecs`, `./server.sh verify-route-profiles`, `./server.sh verify-event-post --mode schema`, `./server.sh verify-webrtc-va-metadata`, `./server.sh verify-sse-metadata`, `./server.sh verify-ws-metadata`, `./server.sh verify-v390-review4-structure-stabilization-execution` | Parser bytes와 route/file/source-kind/error matrix를 보존한 core owner 이동입니다. Fresh full codec 67/0/3, route 8/0, Event POST 9/0, WebRTC 8/0, SSE 5/0, WS 9/0, target 위반 20→19/SCC 8→6을 확인했습니다. Disabled external YouTube/Wowza 3건은 제품 PASS가 아니며 single target·40,832줄 debt와 parked evidence가 남아 REVIEW4-64/65 완료 evidence가 아닙니다 |
| V390-REVIEW4-64 continuation Slice 4 CMake internal target separation | `./server.sh verify-v390-cmake-internal-target-separation`, `./server.sh build`, `./server.sh verify-server-start-modes`, `./server.sh verify-codecs`, `./server.sh verify-route-profiles`, `./server.sh verify-analysis-state`, `./server.sh verify-v390-review4-structure-stabilization-execution` | `media_server` composition source 2개와 `media_server_runtime` 77개(기본 76개)를 실제 CMake target으로 분리합니다. Focused 5/0, build 100%, start 10/0, fresh codec 67/0/3, route 8/0, analysis 181/0, target 2/internal separation true를 확인했지만 위반 19/SCC 6/40,832줄 debt와 parked evidence가 남아 REVIEW4-64/65 완료 evidence가 아닙니다 |
| V390-REVIEW4-64 continuation Slice 5 stable contract leaf | `./server.sh verify-v390-stable-contract-leaf-boundary`, `./server.sh build`, `./server.sh verify-analysis-state`, `./server.sh verify-event-post --mode schema`, `./server.sh verify-webrtc-va-metadata`, `./server.sh verify-sse-metadata`, `./server.sh verify-ws-metadata`, `./server.sh verify-v390-review4-structure-stabilization-execution` | Stable DTO가 stdafx와 event rule service를 역참조하지 않도록 하고 `AnalysisEvent` 23개 field/order/default를 유지합니다. Focused 5/0, build 100%, analysis 181/0, Event/WebRTC/SSE/WS 9/0·8/0·5/0·9/0, 위반 17/SCC 3을 확인했지만 40,832줄 server와 parked evidence가 남아 REVIEW4-64/65 완료 evidence가 아닙니다 |
| V390-REVIEW4-64 continuation Slice 6 analysis query owner | `./server.sh verify-v390-analysis-query-owner-boundary`, `./server.sh build`, `./server.sh verify-route-profiles`, `./server.sh verify-analysis-state`, `./server.sh verify-rtsp-va-overlay-policy`, `./server.sh verify-webrtc-va-metadata`, tracker/discovery/structure verifier | Query/profile/overlay 해석기 5개 public API와 namespace를 유지한 채 analysis owner로 이동했습니다. Focused 5/0, route 8/0, analysis 181/0, RTSP/WebRTC 6/0·8/0이며 위반 15/SCC 2는 final architecture나 actual UI/30분/120분/field/release PASS가 아닙니다 |
| V390-REVIEW4-64 continuation Slice 7 core-media analysis port | `./server.sh verify-v390-core-media-analysis-port-inversion`, build/start/source parser/LAB core/source lifecycle/codec/route/analysis/Event POST/RTSP overlay/WebRTC/SSE/WS/CMake/structure | Core→analysis inversion, 통합 registry lease, reused ref drain, provider wait, final-lease file cleanup을 결속해 focused 11/0, 실제 source mutation 24건 rejection, build/runtime/media/metadata 회귀를 통과했습니다. Actual graph는 production 162/C++ 80, 위반 14/SCC 0입니다. 이는 Slice 7 결과이며 남은 direction/server/evidence/UI/장시간/field/release PASS가 아닙니다 |
| V390-REVIEW4-64 continuation Slice 8 stable contract owner | `./server.sh verify-v390-stable-contract-owner-realignment`, stable leaf/core-media predecessor, build/analysis/final-contract/Event POST/RTSP overlay/WebRTC/SSE/WS/structure | Byte-stable analysis/media/RTSP contract를 target owner에 정렬하고 decoder가 core-media facade를 소비하도록 했습니다. Focused 6/0, predecessor 5/0·11/0, build 100%, runtime/schema 회귀를 통과했고 graph는 production 163/C++ 80, 위반 10/SCC 0입니다. 이는 Slice 8 결과이며 남은 direction/server/evidence/UI/장시간/field/release PASS가 아닙니다 |
| V390-REVIEW4-64 continuation Slice 9 public contract/interface owner | `./server.sh verify-v390-public-contract-interface-owner`, build, stable/analysis predecessor, VLM promotion/profile/provenance, ONVIF/action/S06/UI/freeze/structure | Strict JSON을 실제 domain path로 이동하고 public presentation/application contract classifier를 implementation과 분리합니다. Focused 6/0·mutation 7건, build 100%, actual VLM save/reload/no-write를 통과했고 graph는 163/C++80, edge20, 위반6/SCC0입니다. 위반 10→6은 physical path와 classifier 정렬의 합이며 broad source dependency 감소나 전체 완료 PASS가 아닙니다 |
| V390-REVIEW4-64 continuation Slice 10 core-media registry/rule port | `./server.sh verify-v390-core-media-registry-rule-port`, build, core/public predecessor, analysis, codec, route, RTSP overlay, WebRTC metadata, freeze, structure | WebRTC registry의 byte-stable physical core 이동과 RTSP vaRule injected-port 순서를 확인합니다. Focused 5/0, build 100%, codec 67/0/3, route 8/0, analysis 181/0, overlay/WebRTC 6/0·8/0이며 graph는 163/C++80, edge19, 위반5/SCC0입니다. Server split·parked evidence·REVIEW4-65를 대체하지 않습니다 |
| V390-REVIEW4-64 continuation Slice 11 source bundle | `./server.sh verify-v390-webrtc-http-server-source-bundle`, consumer syntax, build, public/core/action/Ops/live/VLM/structure | 170 verifier/188 direct read를 fixture-aware ordered bundle로 바꾸고 현재 single source의 SHA/bytes/lines를 보존합니다. Focused 6/0, syntax 170/0, build와 등록 회귀를 통과했으며 production graph는 정확히 불변입니다. 이후 physical server split 준비일 뿐 runtime/media/UI/REVIEW4-65 PASS가 아닙니다 |
| V390-REVIEW4-64 continuation Slice 12 physical server split | `./server.sh verify-v390-webrtc-http-server-physical-split`, source bundle, build, public/core/action/UI/VLM/analysis/codec/route/overlay/WebRTC metadata/freeze/structure | Implementation 5 TU와 private detail header가 15,000줄 이하이며 1,151 type/enum·1,000 function/default/constexpr, ODR singleton, exact `media_server_runtime` source digest를 보존합니다. Original-line logical bundle이 170 consumer 순서를 복원합니다. Focused/bundle 6/0, build, analysis 181/0입니다. Stale listener evidence를 폐기한 뒤 fresh current binary에서 authenticated codec 67/0/3, route/VA/RTSP overlay/metadata 8/0·4/0·6/0·8/0을 재실행했고 2.1 MiB run artifact와 listener를 정리했습니다. 위반 5와 parked evidence가 남아 REVIEW4-64/65 최종 PASS는 아닙니다 |
| V390-REVIEW4-64 continuation Slice 13 analysis runtime port | `./server.sh verify-v390-analysis-runtime-port-boundary`, build, core/public owner, analysis-state, ReID, replay, VA events, freeze, structure | Analysis owner의 AppConfig/utility include와 `app_config::` symbol 참조를 모두 제거합니다. Dependency-free default 계약, exact 148-field manifest, AppConfig shadow 0, 전 diagnostic/command/config delegation과 current graph 설명·수치를 mutation으로 결속합니다. Focused5, core/public11/6, analysis181, ReID12/actual10, replay15, VA event31, freeze10 통과이며 graph 위반 4와 parked evidence가 남아 REVIEW4-64/65 최종 PASS는 아닙니다 |
| V390-REVIEW4-64 continuation Slice 14 transport runtime config | `./server.sh verify-v390-transport-runtime-config-boundary`, build, source bundle/physical split, auth routes, ReID, analysis state, freeze, structure | Exact 68-field dependency-free snapshot과 composition 1:1 mapping/DI/callback을 검증하고 transport의 AppConfig/GetAppConfig/core utility direct·transitive·alias 의존을 거부합니다. Focused5, bundle/physical6/6, Auth146, ReID12/actual10, analysis181, freeze10 통과이며 graph 173/85/17/위반3/SCC0입니다. 남은 세 transport 방향과 parked evidence 때문에 REVIEW4-64/65 최종 PASS는 아닙니다 |
| V390-REVIEW4-64 continuation Slice 15 VLM profile JSON boundary | `./server.sh verify-v390-strict-json-service-boundary`, profile/privacy/runtime companion, build, structure | Opaque application document가 strict parser 의미를 보존하며 transport→domain witness를 3→2로 줄입니다. Focused5/profile6/privacy6/build/structure는 PASS이고 SAFE-025 generated evidence binding은 final evidence까지 deferred입니다 |
| V390-REVIEW4-64 continuation Slice 16 Source/View application boundary | `./server.sh verify-v390-source-view-application-boundary`, `./server.sh verify-ops-source-registry-api`, ONVIF/lifecycle/WebRTC teardown/public/transport/bundle/physical/structure gates | Dependency-free Source/View DTO 28필드와 15 operation, null/failure output 불변을 compiled harness로 검증합니다. Local-description ICE teardown은 GStreamer 1.28+ close reply, weak callback/active drain, external signaling 직렬화로 수정했습니다. Non-REPLIED cleanup은 process-lifetime quarantine으로 이전하고 이후 Start를 restart-required로 차단합니다. MEDIA-026 4×8 accepted ICE/DELETE race와 SRC-001~068 전체 actual 명령 5회로 검증합니다. Graph 178/C++87, edge17, 위반3/SCC0, transport→domain witness2→1이며 남은 방향과 parked evidence 때문에 REVIEW4-64/65 최종 PASS는 아닙니다 |
| V390-REVIEW4-64 continuation Slice 17 Appearance readiness application boundary | `./server.sh verify-v390-appearance-readiness-application-boundary`, `./server.sh verify-v390-reid-readiness-consistency`, Re-ID/analysis/conditional/transport/bundle/physical/contract/structure gates | Raw 14-input과 redacted 14-output DTO, service-owned lower/trim/min normalization, canonical analysis inspector delegation을 검증합니다. Compiled2와 actual HTTP10이 schema/authority/privacy/no-execution 불변을 확인합니다. Graph 180/C++88, edge17, 위반3/SCC0, transport→analysis witness18→17이며 방향과 parked evidence 때문에 REVIEW4-64/65 최종 PASS는 아닙니다 |
| V390-REVIEW4-64 continuation Slice 18 Category catalog application boundary | `./server.sh verify-v390-category-catalog-application-boundary`, `./server.sh verify-v390-review4-lab-core-api`, predecessor appearance/analysis/transport/bundle/physical/structure gates | Canonical 10-entry catalog의 7-field mapping, JSON key/order/escaping/final UTF-8 SHA와 actual capabilities readback을 검증합니다. Transport 10파일 direct analysis 재도입을 거부합니다. Graph 182/C++89, edge17, 위반3/SCC0, transport→analysis witness17→16이며 나머지 방향과 parked evidence 때문에 REVIEW4-64/65 최종 PASS는 아닙니다 |
| V390-REVIEW4-64 continuation Slice 19 VLM observation application boundary | `./server.sh verify-v390-vlm-observation-application-boundary`, actual LAB/provenance/analysis, sidecar/Ops review/draft/v260 review, predecessor/bundle/physical/structure gates | Observation query/result pagination·corrupt-line, raw JSON, summary/rule candidate bytes와 manual-only privacy 경계를 검증합니다. Graph184/C++90, edge17, 위반3/SCC0, transport→analysis16→15이며 parked manifest와 나머지 방향 때문에 최종 PASS는 아닙니다 |
| V390-REVIEW4-64 continuation Slice 20 Incident memory application boundary | `./server.sh verify-v390-incident-memory-application-boundary`, v250 projection/index/semantic/similar/owner, v260 productization, predecessor/bundle/physical/structure gates | Canonical projection, forbidden-material 차단, empty-path forced local fallback, fail-soft search, deterministic UTF-8/escaped highlight와 release-safe projection을 검증합니다. Graph186/C++91, edge17, 위반3/SCC0, transport→analysis15→14이며 parked evidence와 나머지 방향 때문에 최종 PASS는 아닙니다 |
| V390-REVIEW4-64 continuation Slice 21 Event POST application boundary | `./server.sh verify-v390-event-post-application-boundary`, actual `verify-event-post --mode disabled|schema|queue|recovery`, core-port, WebRTC metadata, RTSP overlay, final contract, predecessor/bundle/physical/structure gates | Canonical dispatcher source bytes, dependency-free request/status 전필드, ordered two-event mapping, status JSON key/escape bytes, Record→Post→Ops alert/metadata order를 검증합니다. Graph188/C++92, edge17, 위반3/SCC0, transport→analysis14→13이며 parked evidence와 나머지 방향 때문에 최종 PASS는 아닙니다 |
| V390-REVIEW4-64 continuation Slice 22 image codec application boundary | `./server.sh verify-v390-image-codec-application-boundary`, actual `verify-image-analysis`, lab core API, `verify-redaction`, analysis/final-contract/predecessor/bundle/physical/structure gates | Pixel format 5종과 frame metadata/raw bytes/JPEG MIME·NUL byte, null/error semantics, decode1/encode4 transport mapping, path/HTTP rollback parity를 검증합니다. Graph190/C++93, edge17, 위반3/SCC0, transport→analysis13→11이며 parked evidence와 나머지 방향 때문에 최종 PASS는 아닙니다 |
| v3.9.0 (17) Development 18 | `./server.sh verify-v390-external-field-smoke-no-device-closure`, `./server.sh verify-v390-truthfulness-status-vocabulary` | 세 external target은 `conditional-not-run`, `condition-record-not-field-pass`입니다. 외부 contact/artifact/PASS claim은 0이며 실제 field/release PASS가 아닙니다 |

Re-ID privacy/default-off gate는 Step 18에서도 유지합니다. `--reid-policy assist`는 selected tracker의 association assist decision일 뿐이며, `verify-reid-advanced-tracking`와 `verify-close-object-fixture-matrix --modes off,diagnostic,enforce`는 `default-on candidate=False`와 별도 review 상태를 확인합니다. Matrix gate 상태 정의: `warning`은 안정적이라는 뜻이 아니며, `matrix-ok`는 명령/gate 결과입니다. `[matrix-default-on-decision]`과 `[matrix-product-default-on]`은 fixture별 후보로만 기록하고, `field-driving-live`, observed issue counter, trackingIssueObservationCounts, defaultOnDecision, productDefaultOn, candidateCount, defaultOnReason, reid-fixture-default-on-candidates.md를 함께 확인해야 합니다.

### v3.9.0 AI-minimized server longrun runner 기준

이 절은 roadmap의 `v3.9.0 (9) AI-minimized server longrun runner 기준` 항목입니다.

v3.9.0 Test Model Prep의 서버 longrun runner는 30분/120분을 새 테스트 영역으로
만들지 않고 AGENTS의 `30분`과 `120분` 영역 안에 남깁니다. runner 기준은 아래와
같습니다.

| 기준 | 요구사항 |
| --- | --- |
| one command | 하나의 명령이 suite를 시작하고 command line을 summary/report에 남깁니다. |
| fixed phase order | build/preflight/seed/start/integrated smoke/soak iteration/cleanup/report 같은 phase 순서가 고정됩니다. |
| stop-on-first-fail | 첫 실패에서 suite와 delegated duration case loop를 즉시 중단하고 이후 phase/case는 `not-run`으로 남깁니다. |
| delegated exact ledger | V390-REVIEW3-40 parent는 start/smoke/runtime fixed ID와 각 soak iteration의 `va-events`→`event-post-schema`→`event-post-recovery`→`redaction`→`runtime-idle`를 exact ID/order/uniqueness/count로 검증하며 partial·duplicate·reordered·unknown summary를 PASS로 투영하지 않습니다. |
| exact case-native UI workflow | V390-REVIEW3-41의 workflow는 historical source claim으로 남습니다. REVIEW4-56 최초 분류 뒤 REVIEW4-58 handler 대조로 RULE-016/073/075를 persisted transaction으로 교정해 current exact 424는 read-only 287/form 15/persisted 35/actionable 40/hidden 45/negative 2입니다. Actual input, tracked control proof, endpoint/local action, 독립 state/readback/runtime-required step, inverse/no-op cleanup을 요구합니다. Runner plan compatibility는 모든 kind를 검증하며 runtime adapter 부재를 명시 실패시킵니다. REVIEW4-60까지 source readiness를 닫았지만 contract/plan-only를 actual UI PASS로 승격하지 않습니다. |
| semantic completion oracle | V390-REVIEW3-42는 historical source claim으로 유지합니다. REVIEW4-58의 `media-server.v390-ui-action-completion.v2`가 exact primary action ID/correlation/exact selector에 unique concrete product request 또는 handler별 local transition/postcondition과 별도 fresh runtime readback을 결속합니다. V2 raw observation을 evaluator가 재계산해 initial navigation, wrong fixture/selector/request, duplicate request, manifest expected/observed self-comparison을 거부합니다. Contract/plan-only PASS는 actual exact 424 browser 실행이나 REVIEW4-59 visual/60 Policy independence PASS가 아닙니다. |
| Policy v4 raw evidence producer | V390-REVIEW3-43의 self-qualified producer는 historical source claim입니다. REVIEW4-60 producer는 raw v2 trace와 capture/fingerprint만 기록하고 별도 qualifier가 action/request/readback/visual/current source를 재계산합니다. Source readiness는 완료됐지만 raw capture 또는 qualifier contract만으로 actual UI PASS가 아닙니다. |
| actual responsive/theme/visual evidence | V390-REVIEW3-44의 visual contract는 historical source claim입니다. REVIEW4-59의 exact 80-probe source contract는 완료됐지만 대표 route, 320/390/760/1180×light/dark, `/client/live` ready video/VA session/crop/control matrix를 실제 실행하기 전 actual visual PASS가 아닙니다. |
| current HEAD/artifact containment | V390-REVIEW3-46 acceptance는 start/end provenance와 canonical command-set hash를 기록하고 final integrity는 current HEAD·branch·source-clean 및 output/run/child/Policy/UI artifact의 realpath containment를 독립 재검증합니다. `./server.sh verify-v390-final-evidence-integrity-contract`의 9/0은 변조 거부 계약이며 실제 30분/424 UI/120분 실행 evidence가 아닙니다. |
| historical exact readiness/current isolation | V390-REVIEW3-47의 positive 423+negative 1/unsupported 0은 historical source classification입니다. REVIEW4-56~60 source readiness는 `exact-native-ready-current-not-run`으로 닫혔지만 pass 0/not-run 424 실행 상태와 audit-only historical root 거부 경계를 보존합니다. |
| failure evidence | command, exit code, phase, port, route, log path, summary path, report path, cleanup state, case, context, separated stderr tail, reproduction command, stdout/stderr path, delegated predev first failed step, likely investigation files를 포함합니다. |
| reproducible inputs | 같은 command와 fixture로 재현할 수 있어야 합니다. |
| artifact policy | 임시 artifact는 cleanup하거나 보존 이유를 명시합니다. `/tmp` 경로를 최종 evidence로 쓰지 않습니다. |
| category boundary | wrapper, preflight, dry-run, field smoke, no-device는 다섯 번째 테스트 영역이 아니며 안정화/30분/120분/UI 중 해당 위치에만 기록합니다. |

v3.9.0 R1 implementation command:

- `./server.sh verify-v390-server-longrun --duration-minutes 30 --output-dir <path>`
- `./server.sh verify-v390-server-longrun --duration-minutes 120 --output-dir <path>`
- `./server.sh verify-v390-server-longrun-runner-contract`

R1 summary schema is `media-server.v390-server-longrun.v1`. The contract verifier checks
`stop-on-first-fail`, later phase/case `not-run`, cleanup fields, delegated predev first-failure
preservation via `failedCase`/`delegatedFailure`, context, separated stderr tail, reproduction
command, and `fixture-only-not-real-duration` fixture output. `V390-ADD1-10`부터
`verify-predev --fail-fast`의 soak case 사이에도 fail-fast 경계를 두며, contract 전용
`--fixture-first-fail`이 두 번째 case 실패 뒤 세 번째 case `not-run`과 분리 stdout/stderr를
실행 검증합니다. 같은 ordered-case helper를 사용하는 `--fixture-cumulative-fail`은 legacy
mode가 실패를 기록한 뒤 세 번째 case를 계속 실행하는 역할 분리를 검증합니다. Fixture
output은 implementation/contract evidence일 뿐 실제 30분/120분 duration evidence가
아닙니다.

`V390-REVIEW2-31`부터 real/delegated summary 경로는 `start-server`, `integrated-smoke`,
`runtime-idle`을 실행 전에 PASS로 기록하지 않습니다. Child summary의
`server-start-queue-256`, exact `integrated-smoke`, `soak-N-*`, `main-runtime-idle` 이후 runtime
steps를 parent ledger로 투영하고, delegated failure가 발생한 parent phase를 FAIL로 바꾼 뒤
later ordinary phase를 `not-run`으로 유지합니다. Cleanup/report는 first-fail 뒤에도 실행됩니다.
Contract fixture의 이 projection PASS는 실제 duration evidence가 아닙니다.

`V390-REVIEW2-33` structure readiness는 선언 배열 수만 세지 않습니다. Complete module
`mayDependOn` graph와 allowed directions, 실제 `src`/`include` include resolution, CMake production
source coverage, forbidden edge와 cycle negative, slice dependency를 검사합니다. 현재 core→ingress
3-edge와 analysis/core/ingress SCC는 refactor 전 legacy baseline으로 명시되며 gate PASS는 해당
dependency 제거나 structure refactor 완료를 뜻하지 않습니다.

Console progress output:

- The runner prints top-level phase progress as `[progress] (1/9) preflight test; remaining=8`.
- Child command output is streamed to the console while also being written to the phase log, so
  delegated `verify-predev` heartbeat lines such as soak iteration progress remain visible during
  long runs.

Approved real-duration R1 evidence:

- 30분: `./server.sh verify-v390-server-longrun --duration-minutes 30 --output-dir docs/release-artifacts/v3.9.0/server-longrun-30min-final`
  produced `longrunEvidenceStatus=real-duration-evidence`, runner `result=PASS`, and delegated
  predev `status=pass`, `pass=118`, `fail=0`, `skip=2`, `durationSec=2341`.
- 120분: not run. The 30분 PASS does not become 120분, UI fulltest, published metadata,
  release action, or field smoke evidence.

V390-ADD1-10 진단 출력은 첫 실패 시점에 `[first-fail] phase`, `case`, `context`,
각 stderr tail 행, `reproduce`를 console에 출력하고 같은 값을 summary `failure`, failed
phase, Markdown report에 보존합니다. Delegated predev summary는 첫 failed step 뒤의
일반 case가 모두 `not-run`인지 확인하며 cleanup/report case만 실패 뒤 실행할 수 있습니다.

### v3.9.0 R2 AI-minimized UI automation runner 실제 구현

이 절은 roadmap의 `AI-minimized UI automation runner 실제 구현` 항목입니다.

v3.9.0 R2 runner는 무료 UI automation 도구 우선순위를 Playwright, Selenium,
SikuliX/image fallback 순서로 고정하고, auth-off throwaway server를 직접 시작한 뒤
case manifest의 `route/control/action` 단위로 summary/report를 남깁니다. 콘솔에는 각 case가 시작될 때
`[progress] (n/total) <case> <route> <controlAction> test; remaining=<count>` 형식의
진행 상태가 출력됩니다.

v3.9.0 R2 implementation command:

- `./server.sh verify-v390-ui-automation --browser-mode playwright --output-dir <path>`
- `./server.sh verify-v390-ui-automation --browser-mode selenium --output-dir <path>`
- `./server.sh verify-v390-ui-automation --browser-mode sikulix --output-dir <path>`
- `./server.sh verify-v390-ui-automation-report --summary <summary.json>`
- `./server.sh verify-v390-ui-automation-runner-contract`
- `./server.sh verify-v390-ui-automation-report-replay-guard`

R2 summary schema is `media-server.v390-ui-automation.v1`. The report verifier checks
case counts, `route/control/action` granularity, failure investigation fields,
cleanup fields, exact-selector `visibleAssertions`, and `manualIntervention=false`. Real mode does not delegate
to `verify-ui-fulltest-one-shot`; it starts the throwaway server, opens the target route, checks
visible state after a trusted native action, and stores screenshot/trace/server-log references per case.
The summary also records `adapterPlan`, `selectedAdapter`, `adapterAttempts`, and per-case
`adapterEvidence`/`browserConsolePath`. In Codex sessions without a local Playwright package,
`--allow-chrome-fallback=1` records the explicit `chrome-cdp-fallback` selection instead of
pretending native Playwright ran. The throwaway server sets `MEDIA_SERVER_SKIP_LOCAL_ENV=1` so
local `.media_server.env` defaults cannot override the isolated R2 HTTP/RTSP ports.

### V390-ADD1-11 full-feature exact-ID UI automation coverage matrix

Step 25/R10은 R2의 8개 historical automation case를 current UI 전체 자동화 PASS로 확대
해석하지 않습니다. `./server.sh verify-v390-ui-automation-coverage --output-dir <path>`는
986개 feature inventory와 reviewed implementation evidence를 source로, feature ID prefix나
숫자 range가 아니라 exact `manualUiCaseId`가 있는 424개 테스트를 선택합니다. 각 행은
`testId`, `featureId`, route, source-backed control/action anchor, stability verifier command/
assertion anchor, automation `caseId`를 독립 연결합니다. 기존 matrix는 positive 423개와
제품 UI 미제공 negative route `UI-018` 1개,
unsupported 0으로 분류했습니다. REVIEW4-56은 여기에 기능별 exact workflow 287/15/32/43/45/2와
input/control/action/state/readback/cleanup을 결속했습니다. 다만 REVIEW4-57~60 전 current full readiness는
아니며 상태는 `review4-57-60-pending`이고
current 실행은 pass 0/not-run 424이고
historical 8개와 과거 acceptance root는 `audit-only-historical`로 격리합니다.

검증 명령:

- `./server.sh verify-v390-ui-automation-coverage --output-dir <path>`
- `./server.sh verify-v390-ui-automation-coverage-contract`

Coverage verifier는 actual 실행 행의 screenshot, trace, browser console, server log, visual measurement/diff
파일을 모두 확인하고, cross-prefix exact test ID 누락/중복, route/control/action source
drift, automation featureId→caseId drift, artifact 누락을 실패 처리합니다. prefix/range 판정 제거
상태도 contract로 고정합니다. 고정 matrix는
`docs/v390-ui-automation-coverage-matrix.md`에 보존합니다. Current matrix는 REVIEW4-56~60의 source contract를 닫아
`exactNativeWorkflowReadinessComplete=true`, `policyQualifierIndependenceComplete=true`,
`actualAutomationExecutionComplete=false`, `manualUiFulltestEvidence=false`,
`executionEvidenceStatus=current-not-run`, `coverageStatus=exact-native-ready-current-not-run`입니다. 이 source readiness는 Policy v4-qualified UI 풀테스트 실행,
30분/120분, published metadata, release action PASS가 아닙니다.

### V390-ADD1-12 Policy v4 UI evidence qualification

Policy v4는 새 테스트 영역이 아닙니다. 안정화/30분/120분/UI 네 영역을 유지하고,
UI 영역의 실행 evidence mode만 `direct-browser`, `qualified-native-automation`,
`hybrid`로 구분합니다.

- `./server.sh verify-ui-fulltest-evidence-policy-v4 --summary <summary.json> --output-dir <path>`
- `./server.sh verify-ui-fulltest-evidence-policy-v4-contract`

native automation은 exact case별 actual-browser provenance, fallback/manual intervention
부재, route/control/action, requested/observed role·viewport·theme, pre/action/post 또는
network/persisted/EventRecord·log completion oracle, exact visible assertion, 실제 artifact
hash/type/path containment, redaction, visual evidence, replay, cleanup을 모두 만족한 경우에만
`automation-equivalent-pass`가 될 수 있습니다. wrapper/static/API/screenshot-only/fixture와
legacy v1 replay는 보조 evidence입니다.

V390-REVIEW4-57부터 requested는 canonical API ownership `route`와 requested control을 보존하고,
observed는 browser `screenRoute`, `/auth/whoami` role, 실제 viewport, media-query theme, DOM control
state와 field별 provenance만 허용합니다. 두 projection의 field set은 의도적으로 다르며 legacy
`role`, observed `route`, requested control 복사, adapter tool/engine drift는 contract FAIL입니다.

`V390-REVIEW2-23`부터 completion/visual/cross-cutting/redaction `evidenceRef`는 문자열이나
summary의 PASS boolean이 아니라 `media-server.ui-evidence-ref.v1` metadata로 기록합니다.
각 ref의 contained path, bytes, SHA-256, content type, case/correlation ID를 실파일과 대조하고,
PNG는 chunk CRC와 IDAT inflate까지 decode합니다. Interaction trace는 trusted action과
completion/network correlation event schema를, visual/cross-cutting/redaction JSON은 각각의
payload schema와 case set/hash를 검증합니다. Evaluator는 scan output과 별도로 보존 artifact의
authorization/bearer/secret assignment/viewer RTSP URL/raw debug material을 직접 재스캔합니다.

`V390-REVIEW2-24`의 exact native 실행 구현은 아래 명령으로 검증합니다.

- `./server.sh verify-v390-ui-native-exact-cases`
- `./server.sh verify-v390-ui-native-exact-cases --update-canonical-binding`
- `./server.sh verify-v390-ui-native-exact-cases-contract`
- `./server.sh run-v390-ui-native-exact-cases --output-dir <path> --plan-only`

실제 실행은 `--http-base`, role별 Playwright storage state map, server log를 별도로 제공해야 하며
first failure 뒤 case는 `not-run`입니다. Plan-only/contract는 canonical 424개, product-screen route,
native action/oracle seed/artifact plan, unsupported 0을 검증하지만 actual UI execution이 아니고
`uiFulltestPass=false`입니다. Historical 8-case summary와 Policy v4 current `8/415/1` 판정은
Step 26 eligibility 통합 전까지 별도 evidence로 유지합니다.

semantic implementation manifest가 변경되면 `--update-canonical-binding`이 canonical 424개의
implementation SHA와 exact route/control/action symbol을 동기화하고 native manifest도 함께
재생성합니다. 일반 검증은 read-only이며 stale hash/control은 FAIL합니다. 이 source binding 갱신은
Policy v4 actual execution evidence가 아닙니다.

`V390-REVIEW2-25`부터 trusted click/select/fill/type은 동작 전후의 동일 visible text만으로 PASS하지
않습니다. `./server.sh verify-v390-ui-completion-oracle-contract`가 DOM transition, case가 명시한
endpoint와 일치하는 action-window network+DOM, persisted readback, EventRecord, server-log correlation
positive와 no-op/pre-existing text/wrong URL·correlation/action 미실행 negative를 검증합니다. Actual
UI-108~115 summary는 `verify-v390-ui-automation-report`와 replay guard가 completion digest/source/
endpoint를 다시 읽습니다. Contract fixture와 targeted 8-case PASS는 exact 424 UI 풀테스트가 아닙니다.

`V390-REVIEW2-26`의 `./server.sh verify-v390-full-suite-eligibility-contract`는 acceptance와
final integrity가 execution PASS, exact 424 closure, unsupported 0, Policy v4
`policyValidationResult`, `evidenceEligibility`, `uiFulltestPass`를 독립 입력으로 소비하는지
검증합니다. Targeted 8-case·plan-only·fixture·누락/변조 qualification은 `eligible` 또는
`finalEvidenceEligible`이 될 수 없습니다. Contract positive는 알고리즘 fixture이며 actual
Policy v4 UI 풀테스트 실행 evidence가 아닙니다.

`V390-REVIEW2-27`의 `./server.sh verify-v390-current-ui-evidence-contract`는 current coverage와
Policy 기본 입력이 `v390_ui_current_evidence_state.json`의 `not-run` 상태를 사용하고, tracked
`*.video.txt` placeholder가 0이며 과거 summary root가 historical-invalid manifest에만 존재하는지
검증합니다. `verify-v390-ui-automation-coverage`의 native 423+negative 1/unsupported 0 readiness PASS는
current pass 0/not-run 424 실행 상태와 분리되며 UI 기능 실행 PASS가 아닙니다.

전체 UI PASS는 exact UI test ID 전수가 `direct-pass` 또는
`automation-equivalent-pass`이고 fail/not-run/unsupported/unapproved exclusion이 0이며
시각 품질, 반응형, role guard, client redaction, video/overlay 등 교차 의무가 닫힌
경우에만 가능합니다. 현재 matrix의 exact native readiness와 pass 0/not-run 424 실행 상태는
`current-not-run`이며 Policy v4 verifier 자체가 PASS해도 UI 풀테스트는
`FAIL/not-qualified`입니다.

### v3.9.0 R5 UI automation report replay guard

R5는 UI automation suite 자체를 실행하는 gate가 아니라, 이미 생성된
`media-server.v390-ui-automation.v1` summary를 다시 읽어 release evidence로 사용할 수
있는 최소 조건을 확인하는 replay guard입니다. `./server.sh verify-v390-ui-automation-report
--summary <summary.json>`는 각 check를 `[progress] (n/total) <check> test; remaining=<count>`
형식으로 출력합니다.

R5 replay guard 조건:

- case manifest v3 summary는 implementation manifest와 같은 exact ordered
  `UI-108`~`UI-115` 8개 ID/route여야 하며 `UI-112` 누락이나 `/ops`/`/ops/dashboard`
  route drift를 허용하지 않습니다.
- PASS summary는 `fail=0`, `notRun=0`, `manualIntervention=false`, failed interaction 0이어야 합니다.
- 모든 v3 case는 `route/control/action`, setup/primary `interactionEvidence`, visible target,
  before/after `stateEvidence`, exact-selector `visibleAssertions`, `failureEvidence`, `screenshotPath`, `tracePath`,
  `videoPath`, `browserConsolePath`, `serverLogReference`, `cleanupPortState`,
  `browserConsole`, `manualIntervention=false`를 기록해야 합니다.
- `screenshotPath`, `tracePath`, `videoPath`, `browserConsolePath`,
  `serverLogReference`는 replay 시점에 실제 파일로 존재해야 합니다. R5에서는
  `artifactPreservationReason`을 누락 artifact 대체 evidence로 인정하지 않습니다
  (`artifact files exist`).
- `browserConsole` warning/error가 있으면 PASS가 아니거나
  `browserConsoleAllowReason`을 남겨야 합니다.
- 첫 `FAIL` 이후 case는 모두 `not-run`이어야 하며 계속 실행한 PASS case를 허용하지 않습니다.
- 이 replay PASS만으로는 Policy v4-qualified UI 풀테스트 PASS가 아님. 30분/120분, published metadata,
  release action evidence로도 승격하지 않습니다.

Legacy boundary: `automationResult is not manual UI fulltest, 30-minute, 120-minute,
published, or release-action evidence`. Fixture output and report replay are
implementation/contract evidence only. Policy v4에서는 actual UI summary를 qualifier에
입력해 case 단위 적격성을 별도 판정하며, replay/partial runner PASS 자체는 suite PASS가
아닙니다.

V390-ADD1-07 actual case completeness evidence는
`docs/release-artifacts/v3.9.0/ui-automation-case-completeness-final/summary.json`에
보존합니다. 결과는 exact 8 case `pass=8 fail=0 notRun=0`, report replay
`pass=7 fail=0`이며 UI-112 staging restore checklist/result artifact가 포함됩니다.
이 historical 실행의 interaction dispatch는 DOM 기반입니다. V390-ADD1-08 native final과
V390-ADD1-09 exact-selector visible DOM final evidence로 교체했습니다.

### V390-ADD1-08 native free UI adapter

`scripts/internal/v390_ui_native_adapter.mjs`는 explicit
`MEDIA_SERVER_PLAYWRIGHT_MODULE_PATH`, workspace/current Node 인접 module, Codex primary
runtime bundled module 순서로 무료 Playwright를 탐색합니다. 선택된 adapter는
`engine=playwright-native`, `fallbackUsed=false`, module path/version, browser executable,
`wait/click/fill/select/screenshot` capability를 기록합니다. native module이 없으면
preflight FAIL이며 `chrome-cdp-fallback`을 Playwright PASS로 승격하지 않습니다.

- `./server.sh verify-v390-ui-native-adapter --output-dir docs/release-artifacts/v3.9.0/ui-native-adapter-final`
- `./server.sh verify-v390-ui-native-adapter --output-dir <path> --playwright-module-path <package-dir>`
- `./server.sh verify-v390-ui-native-adapter-contract`
- `./server.sh verify-v390-ui-automation --browser-mode playwright --output-dir <path>`

Standalone verifier는 로컬 reproduction page에서 wait→fill→type→select→click→state
wait→screenshot을 실제 실행합니다. UI runner도 같은 native module을 사용하며 module
부재 시 명확한 preflight failure reason과 discovery attempts를 summary에 보존합니다.

보존 evidence:

- `docs/release-artifacts/v3.9.0/ui-native-adapter-final/summary.json`: Playwright 1.61.1, system Chrome, action 7/7, fallback false
- `docs/release-artifacts/v3.9.0/ui-automation-native-final/summary.json`: UI-108~115 8/8, setup/primary `dispatch=playwright-native`, cleanup true

### V390-ADD1-09 exact-selector visible DOM assertion

case manifest v3의 `visibleAssertions`는 각 `stateSelectors`와 정확히 일치합니다.
runner는 trusted Playwright setup/primary action 뒤 exact selector element의 computed
visibility와 visible `innerText`만 snapshot으로 만들고 Node-side evaluator에서 포함 값을
검사합니다. `document.body.innerText`, `document.documentElement.outerHTML`, script/source
문자열, whole-page marker는 PASS 계산에 사용하지 않습니다.

- `./server.sh verify-v390-ui-automation --browser-mode playwright --output-dir docs/release-artifacts/v3.9.0/ui-automation-visible-dom-final`
- `./server.sh verify-v390-ui-automation-report --summary docs/release-artifacts/v3.9.0/ui-automation-visible-dom-final/summary.json`
- `./server.sh verify-v390-ui-automation-runner-contract`

보존 summary는 `assertionModel=visible-dom-user-action-v1`, exact UI-108~115 8/8,
`engine=playwright-native`, fallback false, 모든 assertion `visible=true`/`missingText=[]`/
`sourceBoundary=exact-selector-visible-innerText-only`를 기록합니다. contract negative는
UI-113의 source-only `defer-all-action-writes`와 hidden element text가 PASS하지 못하고 실제
표시값 `all-action-writes-deferred`만 통과함을 검증합니다.

이 historical automation PASS는 current evidence에서 격리됐으므로 Policy v4-qualified 전체 UI
풀테스트, 30분/120분, published metadata, release action PASS가 아닙니다.

### v3.9.0 R3 test acceptance bundle

이 절은 roadmap의 `사용자가 재실행 가능한 v3.9 test acceptance bundle` 항목입니다.

v3.9.0 R3 dry-run command는 `finalAcceptanceCommandSet`과 evidence boundary를 같은
summary/report schema로 고정합니다. V390-ADD1-06 non-dry command는 preserved evidence를
PASS로 재사용하지 않고 preflight→build→current feature command→실제 30분
server longrun→exact 424 Policy v4 producer→throwaway server cleanup→Policy v4 qualification→
조건부 120분 decision/run→cleanup→final integrity→report를 순서대로 직접 실행합니다.
첫 실패 뒤 일반 stage는 `not-run`이고 UI server cleanup/cleanup/report만 항상
실행합니다.

- `./server.sh verify-v390-test-acceptance-bundle --dry-run`
- `./server.sh verify-v390-test-acceptance-bundle --dry-run --output-dir <path>`
- `./server.sh verify-v390-test-acceptance-bundle --output-dir docs/release-artifacts/v3.9.0/test-acceptance-current-final`
- 위 canonical command에 AGENTS 7.6.2 trigger와 실행 승인이 모두 있으면 `--run-120` 추가. Flag만으로 trigger를 만들 수 없습니다.
- `./server.sh verify-v390-test-acceptance-bundle-contract`

R3 summary schema is `media-server.v390-test-acceptance-bundle.v1`. Dry-run은 command/schema
경계를 확인하되 Evidence 13 이전 R1/R2 보존본을 measured-cleanup/placeholder/dedupe 정책의
final evidence로 재사용하지 않습니다. 해당 보존본은 `invalid-existing-evidence`, 전체 상태는
`historical-evidence-requires-final-rerun`으로 기록합니다. 120분은 `conditional-not-run`,
published metadata/release action은 `not-run-by-dry-run`입니다.

Boundary: dry-run does not execute build, feature gates, 30-minute, exact 424 UI, 120-minute,
published metadata, or release-action suites. Actual mode의 `result=PASS`는 명령이 실행한
자동 acceptance stage와 cleanup PASS입니다. `knownUiClosureBlockers`가 남으면
`automatedAcceptanceStatus=executed-with-known-ui-closure-blockers`로 분리하며 UI 풀테스트
직접 조작, published metadata, release action PASS가 아닙니다. 120분은 AGENTS 7.6.2 직접 trigger와
실행 승인이 함께 있을 때만 `--run-120`으로 선택합니다.

6~9 통합 후 final run `v390-test-acceptance-20260710100233-58896`은 build, 26개
current feature gate, 실제 30분 server longrun(`predev pass=118 fail=0 skip=2`, soak
22회, main/queue idle, ports clean), native visible-DOM UI 8/8, replay 7/0,
conditional 120 decision, cleanup/report를 PASS했습니다. `knownUiClosureBlockers=[]`,
`automatedAcceptanceStatus=eligible`이며 120분은 trigger가 없어 `not-required`/
`not-run`으로 남겼습니다. 첫 시도의 local HTTP H264/AAC `/opus` 20초 timeout은 상위
fail-fast로 뒤 UI/replay를 중단했고 clean 재시도에서 동일 경로와 전체 묶음이 통과했습니다.

Evidence 14 canonical 첫 실행은 source `b6cac906`에서 build와 26개 feature gate를
통과한 뒤 30분 runner의 통합 smoke 선행 `verify-code-comments`가 Policy v4 library의
상단 용도 주석 누락 1건을 검출해 중단했습니다. UI/replay/120분은 `not-run`이며 child
longrun의 server/port/predev temp cleanup은 실측 PASS였습니다. 복구 runner는 실패 child
summary도 cleanup 근거로 읽고, 재시도 전 최초 실패 command/context/reproduction 및 진단
artifact hash/tail을 canonical root의 `first-failure.json`/`first-failure.md`로 보존합니다.
이 기록은 재시도 PASS를 최초 실행 PASS로 바꾸지 않습니다.

복구 source `8fe583d815ce31628cbb8d1f4188b3e6455b396a`의 final run
`v390-test-acceptance-20260710160754-54907`은 build, 26개 feature gate, 실제 30분
`118/0/2`, soak 22회, main/queue idle, ports-clean, UI-108~115 `8/8`, replay `7/0`,
cleanup/report를 PASS했습니다. screenshot 참조 8개는 물리 PNG 4개로 canonicalize했고
최종 hash 중복과 placeholder video는 0입니다. 120분은 media/session/runtime high-risk
signal이 없어 `not-required`/`not-run`이며 PASS로 대체하지 않습니다. final integrity는
`7/0`, canonical은 76 files/1,315,746 bytes이고 최초 실패 요약 2개를 보존합니다.

### v3.9.0 R4 longrun runner role alignment

R4 선택: option 3.

- `verify-predev` remains legacy/compatibility cumulative predev runner.
- `verify-v390-server-longrun` is the release-grade first-fail runner.
- `verify-v390-server-longrun --duration-minutes 30` is the v3.9.0 release-grade longrun runner
  for 30분 evidence.
- `verify-v390-server-longrun --duration-minutes 120` is the v3.9.0 release-grade longrun runner
  for approval-gated or high-risk 120분 evidence.
- historical `verify-predev --soak-minutes 30` evidence remains preserved.
- historical `verify-predev --soak-minutes 120` evidence remains preserved.

R4 verifier:

- `./server.sh verify-v390-longrun-runner-role-alignment`

This role split does not rewrite historical evidence. Existing `verify-predev` rows remain
compatibility/predev evidence, while v3.9.0 R1/R4 release-grade evidence uses
`verify-v390-server-longrun` summary/report and stop-on-first-fail semantics.

## 현재 v3.9.0 verifier

아래 명령은 v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation의 현재 source gate입니다.
UI 풀테스트, 30분/120분, published metadata, release action, field smoke는 실행 evidence가
있을 때만 별도로 PASS 근거가 됩니다.

| Step | Command | Scope |
| --- | --- | --- |
| v3.9.0 (19) | `./server.sh verify-v390-structure-stabilization-handoff` | v3.9.0 structure stabilization handoff. `V390-STRUCT-001`~`V390-STRUCT-005`를 behavior-preserving extraction plan으로 이관하고 route/API/UI extraction implementation, UI 풀테스트, 30분/120분, published metadata evidence를 대체하지 않음 |
| v3.9.0 (20) | `./server.sh verify-v390-stabilization-release-readiness` | v3.9.0 local stabilization and release readiness. Step 1~19, Development 15~18, Review2-21 verifier, current inventory 986개, release metadata/docs/assets/inventory/evidence/script, close-out dry-run, `git diff --check` companion gate 연결을 확인합니다. current final은 clean worktree에서 stabilization→current feature gate→30분→exact 424 Policy v4 UI→AGENTS 7.6.2 판정상 필요한 120분→PID/port/artifact cleanup/final integrity 순서이며 실제 실행 evidence를 대체하지 않음 |

## 현재 v3.8.0 verifier

아래 명령은 v3.8.0 Operator-Gated Action Pilot & Outcome Loop의 현재 source gate입니다.
UI 풀테스트, 30분/120분, published metadata, release action, field smoke는 실행 evidence가
있을 때만 별도로 PASS 근거가 됩니다.

| Step | Command | Scope |
| --- | --- | --- |
| v3.8.0 (1) | `./server.sh verify-v380-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` | source `3.8.0`, latest published `v3.8.0`, current roadmap `v3.8.0 Operator-Gated Action Pilot & Outcome Loop` 정렬. v3.8 기능 구현, UI 풀테스트, 30분/120분, tag, push, GitHub Release evidence와는 별도 gate입니다 |
| v3.8.0 (2) | `./server.sh verify-v380-ops-action-route-boundary` | Ops Action Route Boundary. `/ops/api/actions/route-boundary`가 v3.8 action route namespace와 future action route catalog를 v3.5 live-operations/v3.7 site-operations projection과 분리하고 action execution, action request persist, approval/readiness execution, source recheck, notice send, rule/source/view/runbook/EventRecord/Ops audit write, client/media/schema mutation을 수행하지 않는지 확인합니다 |
| v3.8.0 (3) | `./server.sh verify-v380-action-capability-contract` | Action Capability Contract. `/ops/api/actions/capability-contract`가 허용/금지 action catalog, required role/scope, idempotency policy, immutable schema boundary를 Ops-only read-only contract로 정의하고 action execution, request/approval/readiness persist, source recheck, notice send, rule/source/view/runbook/EventRecord/Ops audit write, client/media/schema mutation을 수행하지 않는지 확인합니다 |
| v3.8.0 (4) | `./server.sh verify-v380-action-request-ledger-contract` | Action Request Ledger Contract. `/ops/api/actions/request-ledger`가 actionRequestId, siteId, runbookId, requestedBy, status, createdAt, idempotencyKey ledger fields와 append-only/read-only policy를 Ops-only contract로 정의하고 request write, action execution, request/approval/readiness persist, source recheck, notice send, rule/source/view/runbook/EventRecord/Ops audit write, client/media/schema mutation을 수행하지 않는지 확인합니다 |
| v3.8.0 (5) | `./server.sh verify-v380-approval-decision-gate` | Approval Decision Gate. `/ops/api/actions/approval-decision-gate`가 approve/hold/reject/field-needed, reviewer, reason, auditRef, stale decision guard를 Ops-only read-only contract로 정의하고 decision write, action execution, request/approval/readiness persist, source recheck, notice send, rule/source/view/runbook/EventRecord/Ops audit write, client/media/schema mutation을 수행하지 않는지 확인합니다 |
| v3.8.0 (6) | `./server.sh verify-v380-action-readiness-preflight` | Action Readiness Preflight. `/ops/api/actions/readiness-preflight`가 capability, approval, field evidence, source health, client impact, duplicate request blocker와 ready/blocked/approval-needed/field-needed/duplicate-request/not-run state를 Ops-only read-only contract로 정의하고 readiness execution/result persist, action execution, request/approval persist, source recheck, notice send, rule/source/view/runbook/EventRecord/Ops audit write, client/media/schema mutation을 수행하지 않는지 확인합니다 |
| v3.8.0 (7) | `./server.sh verify-v380-source-recheck-action-pilot` | Source Recheck Action Pilot. `/ops/api/actions/source-recheck-pilot`가 source health recheck request, dry execution result envelope, readiness refs, pilot blocker state를 Ops-only read-only contract로 정의하고 source recheck execution, source health write, action result persist, request/approval/readiness persist, notice send, rule/source/view/runbook/EventRecord/Ops audit write, client/media/schema mutation을 수행하지 않는지 확인합니다 |
| v3.8.0 (8) | `./server.sh verify-v380-client-notice-draft-queue` | Client Notice Draft Queue. `/ops/api/actions/client-notice-draft-queue`가 viewer-safe notice draft, queue preview, delivery blocker, redaction boundary, readiness/pilot refs를 Ops-only read-only contract로 정의하고 client notice delivery, notice draft persist, notice queue write, operator-only blocker client exposure, source/rule/view/runbook/EventRecord/Ops audit write, client/media/schema mutation을 수행하지 않는지 확인합니다 |
| v3.8.0 (9) | `./server.sh verify-v380-rule-draft-action-package` | Rule Draft Action Package. `/ops/api/actions/rule-draft-package`가 rule threshold/scenario 후보, draft package, review checklist, apply blocker, readiness/notice refs를 Ops-only read-only contract로 정의하고 rule/scenario apply, rule draft persist, rule/profile registry write, source/view/runbook/EventRecord/Ops audit write, client/media/schema mutation을 수행하지 않는지 확인합니다 |
| v3.8.0 (10) | `./server.sh verify-v380-ops-action-control-workspace-ui` | Ops Action Control Workspace UI. `/ops` dashboard가 action request, approval state, readiness blocker, source recheck/notice/rule draft 후보, receipt placeholder를 기존 `/ops/api/actions/*` read-only contract에서 한 흐름으로 표시하고 action execution, request persist, approval persist, readiness persist, source recheck, notice send, rule apply, client/media/schema mutation을 수행하지 않는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않습니다 |
| v3.8.0 (11) | `./server.sh verify-v380-client-safe-action-notice-preview` | Client-safe Action Notice Preview. `/client/api/views/{id}/events`와 client dashboard/events/live dock이 maintenance/degraded/recovering/available action notice preview만 viewer-safe로 표시하고 internal blocker, approval/readiness detail, source locator, credential, raw diagnostic, Ops-only action material을 노출하지 않으며 client notice send/persist/queue write, action execution, source recheck, rule apply, media/event schema mutation을 수행하지 않는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않습니다 |
| v3.8.0 (12) | `./server.sh verify-v380-outcome-observer-reconciliation` | Outcome Observer and Reconciliation. `/ops/api/actions/outcome-reconciliation`과 `/ops` dashboard가 readiness/outcome diff, source/EventRecord/client/rule outcome diff, observed outcome not-run ref를 Ops-only read-only model로 표시하고 action execution, source recheck execution, client notice send/queue write, rule apply, EventRecord/source/view/Ops audit write, client/media/schema mutation을 수행하지 않는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않습니다 |
| v3.8.0 (13) | `./server.sh verify-v380-action-receipt-bundle` | Action Receipt Bundle. `/ops/api/actions/receipt-bundle`과 `/ops` dashboard가 approval/request/readiness/candidate/outcome diff를 redacted release-safe receipt bundle과 handoff map으로 표시하고 artifact/file/handoff write, action execution, source recheck execution, client notice send/queue write, rule apply, EventRecord/source/view/Ops audit write, raw locator/credential/raw diagnostic inclusion, client/media/schema mutation을 수행하지 않는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않습니다 |
| v3.8.0 (14) | `./server.sh verify-v380-field-connector-evidence-package` | Field Connector Evidence Package. `/ops/api/actions/field-connector-evidence-package`와 `/ops` dashboard가 ONVIF, external WHEP/TURN, cloud provider 조건을 credential/endpoint 승인 기반 field evidence package로 표시하고 field smoke, endpoint/credential probe, provider/cloud call, ONVIF 실기기 contact, WHEP/TURN credential 사용, source/view/EventRecord/Ops audit write, raw endpoint/locator/credential/provider/debug material inclusion, client/media/schema mutation을 수행하지 않는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않습니다 |
| v3.8.0 (15) | `./server.sh verify-v380-default-off-action-explanation` | Default-off Action Explanation. `/ops/api/actions/default-off-explanation`와 `/ops` dashboard가 approval blocker, readiness reason, outcome hint를 default-off VLM/runtime explanation hint로 표시하고 provider/runtime call은 opt-in 전 미수행, raw prompt/provider response/credential/locator/debug material, action execution, source/view/EventRecord/Ops audit write, client/media/schema mutation을 수행하지 않는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않습니다 |
| v3.8.0 (16) | `./server.sh verify-v380-stabilization-release-readiness` | v3.8.0 local stabilization and release readiness. v3.8 Step 1~15 verifier, release metadata/docs/assets/inventory/evidence/script, close-out dry-run, `git diff --check` companion gate 연결을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, release action evidence를 대체하지 않음 |

## 최신 published baseline v3.7.0 verifier

아래 명령은 v3.7.0 Site-Aware Operations and Safe Runbook Control Plane의 previous published baseline source gate입니다.
UI 풀테스트, 30분/120분, published metadata, release action, field smoke는 실행 evidence가
있을 때만 별도로 PASS 근거가 됩니다.

| Step | Command | Scope |
| --- | --- | --- |
| v3.7.0 (1) | `./server.sh verify-v370-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` | source `3.7.0`, latest published `v3.7.0`, current roadmap `v3.7.0 Site-Aware Operations and Safe Runbook Control Plane` 정렬. v3.7 기능 구현, UI 풀테스트, 30분/120분, tag, push, GitHub Release evidence와는 별도 gate입니다 |
| v3.7.0 (2) | `./server.sh verify-v370-site-source-group-contract` | Site / Source Group Contract. `/ops/api/site-operations/source-group-contract`가 site, sourceGroup, zone, viewGroup read model과 no-auto-write boundary를 Ops-only contract로 정의하고 source/view write, viewer/client exposure, raw locator/credential, EventRecord/Event POST/WebRTC/SSE/WS/media schema 변경 미수행 경계를 확인합니다 |
| v3.7.0 (3) | `./server.sh verify-v370-site-aware-source-registry-projection` | Site-Aware Source Registry Projection. `/ops/api/site-operations/source-registry-projection`이 SourceRegistry/PublishedView snapshot을 site/source group 단위 projection으로 묶고 raw locator/credential/client material 없이 read-only로 노출하는지 확인합니다 |
| v3.7.0 (4) | `./server.sh verify-v370-site-health-rollup` | Site Health Rollup. `/ops/api/site-operations/health-rollup`이 source health snapshot을 site/source group 단위 `offline`/`degraded`/`recovering`/`field-needed` 상태로 집계하고 source health persistence, automatic recovery, field smoke, source/view write 미수행 경계를 확인합니다 |
| v3.7.0 (5) | `./server.sh verify-v370-site-impact-graph` | Site Impact Graph. `/ops/api/site-operations/impact-graph`가 EventRecord, source health, PublishedView, client impact를 site/source group별 node/edge graph로 연결하고 source/view/EventRecord/Ops audit/client/media mutation, viewer/client exposure, raw locator/credential/debug material 미수행 경계를 확인합니다 |
| v3.7.0 (6) | `./server.sh verify-v370-site-simulation-input-pack` | Site Simulation Input Pack. `/ops/api/site-operations/simulation-input-pack`이 v3.6 simulation input/result envelope와 v3.7 site projection/impact graph를 site/source group별 read-only input pack으로 연결하고 simulation persist/run/result persist, source/view/rule/EventRecord/Ops audit/client/media mutation, viewer/client exposure, raw locator/credential material 미수행 경계를 확인합니다 |
| v3.7.0 (7) | `./server.sh verify-v370-cross-site-safe-apply-readiness` | Cross-Site Safe Apply Readiness. `/ops/api/site-operations/cross-site-safe-apply-readiness`가 affected clients, blockers, approval-needed, field-needed 상태를 site/source group별로 계산하고 automatic/safe apply, field smoke, client notice send, source/view/rule/EventRecord/Ops audit/client/media mutation, viewer/client exposure 미수행 경계를 확인합니다 |
| v3.7.0 (8) | `./server.sh verify-v370-runbook-template-contract` | Runbook Template Contract. `/ops/api/site-operations/runbook-template-contract`가 source recheck, maintenance, rule draft, client notice 후보를 반복 가능한 runbook template contract로 정의하고 runbook instance persist, approval ticket write, source/view/rule/EventRecord/Ops audit/client/media mutation, viewer/client exposure 미수행 경계를 확인합니다 |
| v3.7.0 (9) | `./server.sh verify-v370-runbook-instance-ledger` | Runbook Instance Ledger. `/ops/api/site-operations/runbook-instance-ledger`가 runbookId, siteId, status, operator note, previous run comparison을 append-only/read-only ledger projection으로 누적하고 runbook instance persist, operator note write, approval ticket write, source/view/rule/EventRecord/Ops audit/client/media mutation 미수행 경계를 확인합니다 |
| v3.7.0 (10) | `./server.sh verify-v370-approval-ticket-workflow` | Approval Ticket Workflow. `/ops/api/site-operations/approval-ticket-workflow`가 approval, hold, reject, field-needed 상태와 reviewer/reason/audit link를 read-only workflow projection으로 관리하고 approval ticket write, reviewer assignment write, approval decision persist, runbook instance persist, operator note write, source/view/rule/EventRecord/Ops audit/client/media mutation 미수행 경계를 확인합니다 |
| v3.7.0 (11) | `./server.sh verify-v370-site-operations-workspace-ui` | Site Operations Workspace UI. `/ops` dashboard가 site list, health rollup, runbook queue, impact detail을 read-only로 표시하고 source URL/raw locator/raw JSON/debug/credential material, source/view/runbook/approval write, client notice send 미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않습니다 |
| v3.7.0 (12) | `./server.sh verify-v370-client-notice-by-site-view-group` | Client Notice by Site/View Group. `/ops/api/site-operations/client-notice-by-site-view-group`와 `/ops` dashboard가 site/view group 기준 viewer-safe notice preview와 delivery queue를 실제 발송 없이 preview-only로 표시하고 client notice send/persist, viewer client payload 변경, source/view/rule/EventRecord/Ops audit/client/media mutation 미수행 경계를 확인합니다 |
| v3.7.0 (13) | `./server.sh verify-v370-rule-va-what-if-by-site` | Rule/VA What-if by Site. `/ops/api/site-operations/rule-va-what-if-by-site`와 `/ops` dashboard가 site 영향과 EventRecord/VA fixture 기반 rule threshold/scenario 후보를 rule apply 없이 비교하고 rule/profile registry write, EventRecord/Ops audit/source/view/client/media mutation 미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않습니다 |
| v3.7.0 (14) | `./server.sh verify-v370-field-evidence-attachment` | Field Evidence Attachment. `/ops/api/site-operations/field-evidence-attachment`와 `/ops` dashboard가 ONVIF, external WHEP/TURN, cloud/VLM 조건부 evidence를 site/runbook에 not-run/conditional로 첨부하고 field smoke, endpoint/credential probe, provider/VLM call, runbook/approval/source/view/EventRecord/Ops audit/client/media mutation 미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않습니다 |
| v3.7.0 (15) | `./server.sh verify-v370-limited-safe-execution-pilot` | Limited Safe Execution Pilot. `/ops/api/site-operations/limited-safe-execution-pilot`와 `/ops` dashboard가 source recheck 또는 notice queue action 후보를 approval-gated preview로 분리하고 source recheck 실행, notice queue write/send, runbook/approval/source/view/EventRecord/Ops audit/client/media mutation 미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않습니다 |
| v3.7.0 (16) | `./server.sh verify-v370-outcome-reconciliation` | Outcome Reconciliation. `/ops/api/site-operations/outcome-reconciliation`와 `/ops` dashboard가 pre-simulation ref와 post-execution ref를 source/event/client impact diff 축으로 비교하고 pilot execution, source recheck, notice queue write/send, source/view/EventRecord/Ops audit/client/media mutation 미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않습니다 |
| v3.7.0 (17) | `./server.sh verify-v370-export-handoff-bundle` | Export / Handoff Bundle. `/ops/api/site-operations/export-handoff-bundle`와 `/ops` dashboard가 site/runbook/evidence/approval/outcome refs를 redacted release-safe handoff bundle과 handoff map으로 조합하고 artifact export/file write/handoff write, pilot/source recheck/notice queue write/send, source/view/runbook/approval/EventRecord/Ops audit/client/media mutation 미수행 경계를 확인합니다. UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않습니다 |
| v3.7.0 (18) | `./server.sh verify-v370-stabilization-release-readiness` | v3.7.0 local stabilization and release readiness. v3.7 Step 1~17 local gates, release policy/evidence index/test records, docs links/assets, feature/script inventory, close-out dry-run, git diff --check 연결을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, release action evidence를 대체하지 않음 |

## 직전 published baseline v3.6.0 verifier

아래 명령은 v3.6.0 Operations Simulation and Safe Apply Readiness의 previous published baseline source gate입니다.
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

## historical published baseline v3.5.0 verifier

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
short stability, v3.9.0 release-grade longrun runner, 120분 runtime console,
UI 풀테스트를 분리해 판단합니다. `docs-policy-only`, `rtsp-gstreamer-webrtc-session-lifecycle`,
`runtime-dashboard-metadata-fanout`, `VLM longrun trigger matrix`,
`vlm-queue-timeout-nonblocking`, `vlm-memory-runtime-cache`,
`vlm-provider-timeout-cloud`, `vlm-model-install-state`는 trigger matrix의 대표
분류입니다. 30분 soak는 120분 longrun PASS를 대체하지 않습니다.
v3.9.0 release-grade matrix row는 `verify-v390-server-longrun --duration-minutes 30`과
`verify-v390-server-longrun --duration-minutes 120`을 표준 trigger로 사용하고,
historical `verify-predev --soak-minutes 30/120` evidence는 legacy/compatibility
evidence로만 보존합니다.
외부 source/TURN/장시간 테스트는 별도 gate로 분리합니다.

## 장기 테스트 명령

장기 테스트는 명시 지시 또는 승인 없이 실행하지 않습니다.

| 명령 | 역할 |
| --- | --- |
| `./server.sh verify-v390-server-longrun --duration-minutes 30` | v3.9.0 release-grade 30분 first-fail server longrun |
| `./server.sh verify-v390-server-longrun --duration-minutes 120` | v3.9.0 release-grade 120분 first-fail server longrun |
| `./server.sh verify-predev --soak-minutes 30` | legacy/compatibility cumulative 30분 predev soak |
| `./server.sh verify-predev --soak-minutes 120` | legacy/compatibility cumulative 120분 predev soak |
| `./server.sh verify-uri-longrun` | URI source longrun |
| `./server.sh verify-event-post-longrun` | Event POST longrun |
| `./server.sh verify-va-runtime-console-longrun` | VA runtime console longrun |
| `./server.sh verify-va-runtime-console-longrun --duration-minutes 120` | VA runtime console 120분 longrun |
| `./server.sh verify-va-runtime-console-cycles` | VA runtime cycle 검증 |
| `./server.sh verify-longrun-separation` | short/longrun 분리 guard |
| `./server.sh verify-runtime-dashboard-longrun-template` | runtime dashboard 120분 longrun template guard |
| `./server.sh verify-runtime-media-longrun-trigger-matrix` | `media-server.runtime-media-longrun-trigger-matrix.v1` trigger matrix |
| `./server.sh verify-rc-release-gate` | RC release gate summary |

### RC 전용 Release Gate

RC 전용 Release Gate는 상시 실행하지 않습니다. release candidate 또는 AGENTS 기준
고위험 runtime/media 변경에서만 사용자 승인 후 실행합니다.

RC command set:

- `./server.sh verify-v390-server-longrun --duration-minutes 120`
- historical compatibility: `./server.sh verify-predev --soak-minutes 120`
- `./server.sh verify-va-runtime-console-longrun --duration-minutes 120`
- `--include-sidechannel`
- `--include-dashboard`
- `--include-rtsp`
- `--idle-after-cleanup-minutes 30`
- `./server.sh rc-release-checklist`
- `--history-dir`
- `index.md`

보존 위치 정책:

- `/tmp` 경로는 local-only staging evidence입니다.
- `artifacts/rc-gate/`는 CI run 내부 staging 위치입니다.
- `media-server-rc-gate` GitHub Actions artifact로 release-grade 보존 완료 상태를 확인합니다.
- `rc-artifact-archive`는 외부 archive 이관 명령입니다.
- `external-artifact-manifest.json`, `SHA256SUMS`, `NOT PRESERVED` 상태를 기록해
  외부 보존 여부와 미보존 사유를 분리합니다.

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

- `./server.sh verify-bot-sort-deepsort-research-boundary`는 BoT-SORT/DeepSORT research boundary를
  고정하며 Re-ID/model/privacy/bundle 검토가 후속 Phase 후보라는 과거 경계를 보존합니다.
- `./server.sh verify-oc-sort-benchmark-boundary`는 OC-SORT 후순위 benchmark boundary를 고정하며
  실제 OC-SORT algorithm 구현이나 제품 tracker 승격 evidence가 아닙니다.

| historical scope | command | boundary |
| --- | --- | --- |
| V220-S06 Rules workspace redesign | `./server.sh verify-v220-rules-workspace-redesign` | `/ops/rules` renderer source owner 이동 뒤 readiness/assist/catalog/detail DOM과 기존 hook을 정적으로 확인합니다. 브라우저 직접 조작, 저장 roundtrip 실행, 현재 release PASS가 아닙니다 |
| V220-F04 Ops VLM UI containment | `./server.sh verify-v220-ops-vlm-containment` | `/ops/vlm`의 Ops 보조 작업/default-off/privacy/profile/raw-debug containment를 정적으로 확인합니다. runtime/provider 호출, 브라우저 직접 조작, 장시간 또는 현재 release PASS가 아닙니다 |

## V390-REVIEW4-64 Slice 15 VLM profile JSON boundary

`./server.sh verify-v390-strict-json-service-boundary`는 transport가 opaque VLM profile document API만
소비하고 concrete domain strict parser를 application-service 구현이 소유하는지 검증합니다. 이 명령은
strict parser 의미와 graph witness 감소를 확인하지만 SAFE-025 generated evidence, 실제 VLM provider 호출,
브라우저 UI, 장시간 또는 REVIEW4-65 acceptance를 대체하지 않습니다.
