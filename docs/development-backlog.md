# Development Backlog

이 문서는 현재 source tree의 roadmap 요약을 보관합니다. 여기서 `완료`라고 표시한
항목은 해당 source 기능과 local verifier 기준을 뜻합니다. GitHub Release publish,
UI 풀테스트, 30분, 120분 evidence는 해당 실행 증거가 있을 때만 별도로 완료로 씁니다.

- 현재 버전/비범위 기준: [versioning-policy.md](./versioning-policy.md)
- release 정책: [release-policy.md](./release-policy.md)
- 검증 명령 기준: [stream-verification.md](./stream-verification.md)

## 현재 공개 상태

- 현재 소스 버전: `2.5.0`
- 최신 공개 GitHub Release: `v2.5.0`
- `v2.5.0` 공개 상태: source-only GitHub Release. Binary, runtime, model bundle은
  포함하지 않습니다.
- 이 문서의 `v2.5.0` 항목은 source-only release 범위와 local verifier 기준입니다.

## 현재 source roadmap: v2.5.0 Semantic Incident Memory

v2.5.0은 v2.4.0 source-only/live-only baseline 위에서 새 media path나 장기 녹화
범위를 만들지 않습니다. 이번 source tree의 범위는 EventRecord, audit, source health,
alert dry-run을 검색 가능한 local incident memory로 정리하는 것입니다.

직접 답: v2.5.0의 1차 선택값은 `/ops/events`를 단순 review inbox에서 검색 가능한
운영 incident memory 화면으로 확장하는 것입니다. local index는 SQLite FTS5 primary,
JSONL+BM25 fallback이며 model/provider 의존성은 기본값이 아닙니다.

불변 조건:

- Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload schema를 요청 없이 바꾸지 않습니다.
- 외부 TURN/WHEP, ONVIF 실기기, real cloud/VLM provider는 사용자 endpoint/credential/승인 없이는 PASS 근거가 아닙니다.
- 기존 네 영역인 안정화 테스트, 30분 테스트, 120분 테스트, UI 풀테스트는 서로 대체하지 않습니다.
- 실제 tag/push는 수동 승인 후에만 수행합니다.

| Step | ID | Priority | 상태 | 묶음 | 개발 내용 | 완료 산출물 | 검증/evidence 경계 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | V250-S00 | P0 | 완료 | v2.5.0 baseline | v2.5.0 baseline/source-of-truth 정렬 | VERSION/CMake/README/docs index/release metadata가 v2.5.0 Semantic Incident Memory를 가리킴 | roadmap review, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-project-inventory`, `git diff --check` |
| 1 | V250-S01 | P0 | 완료 | Event text projection | Event/incident text projection | EventRecord, audit, source health, alert dry-run을 redacted searchable document로 투영 | `verify-v250-incident-text-projection`; 검색 UI/index/provider evidence 아님 |
| 2 | V250-S02 | P0 | 완료 | Local memory index | Local incident memory index | SQLite FTS5 primary, JSONL+BM25 fallback local index | `verify-v250-incident-memory-index`; external embedding/provider evidence 아님 |
| 3 | V250-S03 | P0 | 완료 | Ops search UI | `/ops/events` semantic search UI | search/filter/highlight view model과 Ops-only UI control | `verify-v250-ops-events-semantic-search-ui`; UI 풀테스트 직접 조작은 별도 |
| 4 | V250-S04 | P1 | 완료 | Timeline graph | Incident timeline graph | source state → event → operator action → alert dry-run → close state graph | `verify-v250-incident-timeline-graph`; UI 풀테스트 직접 조작은 별도 |
| 5 | V250-S05 | P1 | 완료 | Explainability | Explainable incident brief | action/object/context/environment slot brief, VLM default-off guard | `verify-v250-explainable-incident-brief`; provider call evidence 아님 |
| 6 | V250-S06 | P1 | 완료 | Similarity | Similar incident lookup | deterministic similar incident scoring and explanation terms | `verify-v250-similar-incident-lookup`, `verify-feature-inventory-coverage`; UI 풀테스트 직접 조작은 별도 |
| 7 | V250-S07 | P1 | 완료 | Client-safe digest | Client-safe incident digest | viewer-safe incident summary and redaction boundary | `verify-v250-client-safe-incident-digest`; viewer role UI 직접 검수는 별도 |
| 8 | V250-S08 | P2 | 완료 | Evidence export | Redacted incident evidence bundle | release-safe manifest-only bundle, raw/source/provider exclusion | `verify-v250-redacted-incident-evidence-bundle`; 실제 다운로드 육안 검수는 UI 풀테스트 별도 |
| 9 | V250-S09 | P2 | 완료 | 릴리즈 준비 | 소유권 분리/릴리즈 준비 | event memory/search route owner catalog, UI criteria, release readiness gate | local readiness verifier와 문서 gate 기준. UI 직접 조작, 장시간 테스트, published metadata는 별도 실행 전까지 완료 근거가 아님 |

## v2.5.0 publish/test 제외 경계

- UI 풀테스트 직접 조작 미실행은 owner/readiness gate PASS로 대체하지 않습니다.
- 30분 테스트 미실행은 `verify-predev --soak-minutes 30` PASS로 보고하지 않습니다.
- 120분 테스트 미실행은 `verify-predev --soak-minutes 120` 또는 `verify-va-runtime-console-longrun --duration-minutes 120` PASS로 보고하지 않습니다.
- `v2.5.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.
- PR merge/main sync/next branch sync는 별도 명시 승인과 실제 실행 evidence가 있기 전까지 완료로 쓰지 않습니다.

## 직전 공개 기준: v2.4.0 Source Release Baseline

v2.4.0은 source-only/live-only 제품 경계를 유지하면서 Operator Event Review & Action
Workflow를 닫은 직전 공개 릴리즈입니다. 이 기준은 v2.5.0의 시작 baseline이며,
v2.5.0의 incident memory 기능 완료 evidence로 재사용하지 않습니다.

## 완료 roadmap: v2.4.0 Operator Event Review & Action Workflow

| ID | 상태 | 요약 | 현재 해석 |
| --- | --- | --- | --- |
| V240-S01 | 완료 | Operator Event Review Inbox | 현재 baseline, v2.5.0 완료 근거 아님 |
| V240-S02 | 완료 | Event Action and Incident Workflow | 현재 baseline, v2.5.0 완료 근거 아님 |
| V240-S03 | 완료 | Alert Dry-run and Delivery Attempt Log | 현재 baseline, v2.5.0 완료 근거 아님 |
| V240-S04 | 완료 | Client-safe Event and Status Summary | 현재 baseline, v2.5.0 완료 근거 아님 |
| V240-S05 | 완료 | Rule and Scenario Review Loop | 현재 baseline, v2.5.0 완료 근거 아님 |
| V240-S08 | 완료 | release readiness gate | `verify-v240-release-readiness-gate` local readiness이며 publish evidence가 아님 |

## 후속 이슈 추천 규칙

후속 이슈는 현재 `2.5.0` source tree와 현재 스텝 범위 안에서 실제로 처리 가능한 항목만
기록합니다. 다음 버전 후보, 별도 Phase 후보, 사용자 승인이 필요한 새 제품 범위는 이
문서에 추천하지 않습니다.
