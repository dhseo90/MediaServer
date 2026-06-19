# Stream Verification

이 문서는 현재 Media Server의 검증 명령 진입점과 테스트 영역 경계를 정리합니다.
내부 release evidence ledger와 수동 UI 결과 템플릿은 공개 첫 진입점에서 제외하며,
실제 PASS 보고는 실행한 명령 output과 별도 보존된 실행 기록으로만 판단합니다.

## 역할과 경계

- AGENTS.md가 테스트/보고/커밋/푸시 권한의 최상위 규칙입니다.
- 이 문서는 검증 명령 catalog입니다. PASS 보고는 실제 실행 output이 있을 때만 가능합니다.
- 기능별 테스트 영역과 coverage 기준은 [project-feature-test-inventory.md](./project-feature-test-inventory.md)가 관리합니다. 이 inventory는 실행 evidence가 아닙니다.
- 안정화, 30분, 120분, UI 풀테스트는 서로 대체하지 않습니다.
- 외부 source/TURN/장시간 테스트는 별도 gate로 분리합니다.
- external TURN/WHEP, ONVIF 실기기, real cloud/VLM provider는 endpoint/credential/승인 없이는 PASS 근거가 아닙니다.

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

## 현재 v2.9.0 verifier

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

## 장기 테스트 명령

장기 테스트는 명시 지시 또는 승인 없이 실행하지 않습니다.

| 명령 | 역할 |
| --- | --- |
| `./server.sh verify-predev --soak-minutes 30` | 30분 soak |
| `./server.sh verify-predev --soak-minutes 120` | 120분 soak |
| `./server.sh verify-uri-longrun` | URI source longrun |
| `./server.sh verify-event-post-longrun` | Event POST longrun |
| `./server.sh verify-va-runtime-console-longrun` | VA runtime console longrun |
| `./server.sh verify-va-runtime-console-cycles` | VA runtime cycle 검증 |
| `./server.sh verify-longrun-separation` | short/longrun 분리 guard |
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
