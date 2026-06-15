# Development Backlog

이 문서는 현재 source tree의 roadmap 요약을 보관합니다. 여기서 `완료`라고 표시한
항목은 해당 source 기능과 local verifier 기준을 뜻합니다. GitHub Release publish,
UI 풀테스트, 30분, 120분 evidence는 해당 실행 증거가 있을 때만 별도로 완료로 씁니다.

- 현재 버전/비범위 기준: [versioning-policy.md](./versioning-policy.md)
- release 정책: [release-policy.md](./release-policy.md)
- 검증 명령 기준: [stream-verification.md](./stream-verification.md)

## 현재 공개 상태

- 현재 소스 버전: `2.6.0`
- 최신 공개 GitHub Release: `v2.5.0`
- `v2.5.0` 공개 상태: source-only GitHub Release. Binary, runtime, model bundle은
  포함하지 않습니다.
- 현재 source roadmap: `v2.6.0 Operational Hardening & Incident Memory Productization`
- `v2.6.0`은 아직 GitHub Release로 publish되지 않았습니다.

## 현재 source roadmap: v2.6.0 Operational Hardening & Incident Memory Productization

v2.6.0은 v2.5.0 source-only/live-only incident memory baseline 위에서 새 media path나
장기 녹화 범위를 만들지 않습니다. 이번 source tree의 범위는 `/ops/events` incident
memory를 운영 workflow로 더 안전하게 productize하고, ONVIF credential gate, runtime
dashboard trend, ScenarioEngine cross-zone 후보를 검증 가능한 작은 단계로 나누는
것입니다.

직접 답: v2.6.0의 1차 선택값은 v2.5.0의 local incident memory를 유지하면서
VLM summary/rule suggestion 후보를 Ops-only manual review 흐름으로 승격할지 검증하는
것입니다. external embedding/provider 호출, 자동 Rule/Profile 적용, VLM default-on은
기본값이 아닙니다.

불변 조건:

- Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload schema를 요청 없이 바꾸지 않습니다.
- 외부 TURN/WHEP, ONVIF 실기기, real cloud/VLM provider는 사용자 endpoint/credential/승인 없이는 PASS 근거가 아닙니다.
- 기존 네 영역인 안정화 테스트, 30분 테스트, 120분 테스트, UI 풀테스트는 서로 대체하지 않습니다.
- 실제 tag/push는 수동 승인 후에만 수행합니다.

| Step | ID | Priority | 상태 | 묶음 | 개발 내용 | 완료 산출물 | 검증/evidence 경계 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | V260-S00 | P0 | 완료 | v2.6.0 baseline | v2.6.0 branch/source-of-truth 정렬 | VERSION/CMake/README/docs index/release metadata가 source `2.6.0`, latest published `v2.5.0`을 분리함 | roadmap review, `verify-release-metadata`, `verify-docs-links`, `git diff --check` |
| 1 | V260-S01 | P0 | 예정 | Incident memory productization | VLM summary candidate를 `/ops/events` incident memory에 Ops-only 검색/검토 흐름으로 연결 | candidate-only `media-server.vlm-summary-search-candidates.v1`를 제품 검색으로 승격할지 명시하고 viewer/client 비노출 유지 | `verify-vlm-summary-search-candidates`, 신규 v2.6 verifier, Ops UI 직접 확인 필요 |
| 2 | V260-S02 | P1 | 예정 | Rule suggestion review | Rule suggestion 후보를 incident-to-rule manual review/draft workflow로 연결 | 자동 Rule/Profile 적용 없이 `/ops/rules` 수동 저장 draft와 audit/redaction 경계 정리 | `verify-vlm-rule-suggestion-candidates`, `verify-vlm-rule-suggestion-draft-workflow`, `verify-rule-ui` |
| 3 | V260-S03 | P1 | 예정 | ONVIF credential gate | ONVIF credential binding/store gate 설계와 redaction guard | `source:write` guard, encrypted/local 또는 external secret manager 선택, rotation/expiry/audit 기준 | `verify-onvif-credential-reference-policy`, auth/scope verifier, redaction fixture |
| 4 | V260-S04 | P2 | 예정 | Runtime dashboard trends | Runtime dashboard baseline/sparkline 고도화 후보 | 장기 녹화 없이 runtime/VA 상태 추세를 운영 card로 요약 | `verify-va-runtime-console`, dashboard UI smoke, 장시간 테스트는 별도 승인 |
| 5 | V260-S05 | P2 | 예정 | Scenario extension | ScenarioEngine cross-zone re-entry 후보 | 기존 event/schema를 유지하면서 A→B 재진입 판단 후보와 rule UI 기준 정리 | `verify-analysis-state`, `verify-va-replay`, `verify-rule-ui`, schema guard |
| 6 | V260-S06 | P2 | 예정 | 릴리즈 준비 | v2.6.0 소유권 분리/릴리즈 준비 | feature inventory, UI criteria, release readiness gate, not-run/excluded 경계 정리 | local readiness verifier, `verify-release-metadata`, docs links/assets, UI/longrun은 별도 evidence |

## v2.6.0 publish/test 제외 경계

- `V260-S00` source-of-truth 정렬은 2.6.0 GitHub Release publish 완료가 아닙니다.
- 예정 항목은 구현과 직접 evidence가 생기기 전까지 완료로 쓰지 않습니다.
- UI 풀테스트 직접 조작 미실행은 local verifier PASS로 대체하지 않습니다.
- 30분 테스트 미실행은 `verify-predev --soak-minutes 30` PASS로 보고하지 않습니다.
- 120분 테스트 미실행은 `verify-predev --soak-minutes 120` 또는 `verify-va-runtime-console-longrun --duration-minutes 120` PASS로 보고하지 않습니다.
- `v2.6.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.
- PR merge/main sync/next branch sync는 별도 명시 승인과 실제 실행 evidence가 있기 전까지 완료로 쓰지 않습니다.

## 직전 공개 기준: v2.5.0 Source Release Baseline

v2.5.0은 source-only/live-only 제품 경계를 유지하면서 Semantic Incident Memory를 닫은
최신 공개 릴리즈입니다. 이 기준은 v2.6.0의 시작 baseline이며, v2.6.0의 예정 항목
완료 evidence로 재사용하지 않습니다.

## 완료 roadmap: v2.5.0 Semantic Incident Memory

| ID | 상태 | 요약 | 현재 해석 |
| --- | --- | --- | --- |
| V250-S00 | 완료 | v2.5.0 baseline/source-of-truth 정렬 | 최신 published baseline, v2.6.0 완료 근거 아님 |
| V250-S01 | 완료 | Event/incident text projection | 최신 published baseline, v2.6.0 완료 근거 아님 |
| V250-S02 | 완료 | Local incident memory index | 최신 published baseline, v2.6.0 완료 근거 아님 |
| V250-S03 | 완료 | `/ops/events` semantic search UI | 최신 published baseline, v2.6.0 완료 근거 아님 |
| V250-S04 | 완료 | Incident timeline graph | 최신 published baseline, v2.6.0 완료 근거 아님 |
| V250-S05 | 완료 | Explainable incident brief | 최신 published baseline, v2.6.0 완료 근거 아님 |
| V250-S06 | 완료 | Similar incident lookup | 최신 published baseline, v2.6.0 완료 근거 아님 |
| V250-S07 | 완료 | Client-safe incident digest | 최신 published baseline, v2.6.0 완료 근거 아님 |
| V250-S08 | 완료 | Redacted incident evidence bundle | 최신 published baseline, v2.6.0 완료 근거 아님 |
| V250-S09 | 완료 | Owner decomposition/release readiness | 최신 published baseline, v2.6.0 완료 근거 아님 |

## 이전 공개 기준: v2.4.0 Source Release Baseline

v2.4.0은 source-only/live-only 제품 경계를 유지하면서 Operator Event Review & Action
Workflow를 닫은 이전 공개 릴리즈입니다. 이 기준은 historical baseline이며,
v2.6.0의 예정 항목 완료 evidence로 재사용하지 않습니다.

## 완료 roadmap: v2.4.0 Operator Event Review & Action Workflow

| ID | 상태 | 요약 | 현재 해석 |
| --- | --- | --- | --- |
| V240-S01 | 완료 | Operator Event Review Inbox | 과거 baseline, v2.6.0 완료 근거 아님 |
| V240-S02 | 완료 | Event Action and Incident Workflow | 과거 baseline, v2.6.0 완료 근거 아님 |
| V240-S03 | 완료 | Alert Dry-run and Delivery Attempt Log | 과거 baseline, v2.6.0 완료 근거 아님 |
| V240-S04 | 완료 | Client-safe Event and Status Summary | 과거 baseline, v2.6.0 완료 근거 아님 |
| V240-S05 | 완료 | Rule and Scenario Review Loop | 과거 baseline, v2.6.0 완료 근거 아님 |
| V240-S08 | 완료 | release readiness gate | `verify-v240-release-readiness-gate` local readiness이며 publish evidence가 아님 |

## 후속 이슈 추천 규칙

후속 이슈는 현재 `2.6.0` source tree와 현재 스텝 범위 안에서 실제로 처리 가능한 항목만
기록합니다. 다음 버전 후보, 별도 Phase 후보, 사용자 승인이 필요한 새 제품 범위는 이
문서에 추천하지 않습니다.
