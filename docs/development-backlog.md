# Development Backlog

이 문서는 현재 release target과 완료 roadmap 요약만 보관합니다. 세부 정책은 전용 문서로 분리합니다.

- 현재 버전/비범위 기준: [versioning-policy.md](./versioning-policy.md)
- release 실행/미실행 증적: [release-evidence-index.md](./release-evidence-index.md)
- 기능별 테스트 inventory: [project-feature-test-inventory.md](./project-feature-test-inventory.md)
- UI 풀테스트 기준: [manual-ui-fulltest.md](./manual-ui-fulltest.md), [manual-ui-checklist.md](./manual-ui-checklist.md), [manual-ui-result-template.md](./manual-ui-result-template.md)
- 검증 명령 기준: [stream-verification.md](./stream-verification.md)

## 활성 roadmap: v2.5.0 Semantic Incident Memory

v2.5.0은 v2.4.0 source-only/live-only baseline 위에서 새 media path나 장기 녹화 범위를 만들지 않고, EventRecord/audit/source health/alert dry-run을 검색 가능한 local incident memory로 정리합니다.

직접 답: v2.5.0의 1차 선택값은 `/ops/events`를 단순 review inbox에서 검색 가능한 운영 incident memory 화면으로 확장하는 것입니다. local index는 SQLite FTS5 primary, JSONL+BM25 fallback이며 model/provider 의존성은 기본값이 아닙니다.

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
| 9 | V250-S09 | P2 | 완료 | 릴리즈 준비 | 소유권 분리/릴리즈 준비 | event memory/search route owner catalog, UI criteria, release readiness gate | `verify-v250-owner-release-readiness`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-feature-inventory-coverage`, `verify-manual-ui-evidence`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run`, `git diff --check` |

## v2.5.0 릴리즈 준비 미실행/제외 경계

- UI 풀테스트 직접 조작 미실행은 owner/readiness gate PASS로 대체하지 않습니다.
- 30분 테스트 미실행은 `verify-predev --soak-minutes 30` PASS로 보고하지 않습니다.
- 120분 테스트 미실행은 `verify-predev --soak-minutes 120` 또는 `verify-va-runtime-console-longrun --duration-minutes 120` PASS로 보고하지 않습니다.
- tag/push/GitHub Release manual-not-run, PR merge/main sync/next branch sync 미수행, `verify-release-metadata --published` 미실행은 release evidence index에 별도 기록합니다.

## 현재 기준: v2.4.0 Source Release Baseline

v2.4.0은 직전 v2.3.0 source-only/live-only 제품 경계를 유지하면서 Operator Event Review & Action Workflow를 닫은 source-only release입니다. 이 기준은 v2.5.0의 시작 baseline이며, v2.5.0의 incident memory 기능 완료 evidence로 재사용하지 않습니다.

## 완료 roadmap: v2.4.0 Operator Event Review & Action Workflow

| ID | 상태 | 요약 | 현재 해석 |
| --- | --- | --- | --- |
| V240-S01 | 완료 | Operator Event Review Inbox | 현재 baseline, v2.5.0 완료 근거 아님 |
| V240-S02 | 완료 | Event Action and Incident Workflow | 현재 baseline, v2.5.0 완료 근거 아님 |
| V240-S03 | 완료 | Alert Dry-run and Delivery Attempt Log | 현재 baseline, v2.5.0 완료 근거 아님 |
| V240-S04 | 완료 | Client-safe Event and Status Summary | 현재 baseline, v2.5.0 완료 근거 아님 |
| V240-S05 | 완료 | Rule and Scenario Review Loop | 현재 baseline, v2.5.0 완료 근거 아님 |
| V240-S08 | 완료 | release readiness gate | `verify-v240-release-readiness-gate` local readiness이며 publish evidence가 아님 |

## 완료 roadmap: v2.3.0 Operational Evidence & Contract Baseline

| ID | 상태 | 요약 | 현재 해석 |
| --- | --- | --- | --- |
| V230-S00 | 완료 | v2.3.0 entry baseline | `verify-v230-entry-baseline`은 historical entry gate |
| V230-S02 | 완료 | 4대 테스트 evidence 정합성 | 안정화/30분/120분/UI evidence 분리 기준을 남김 |
| V230-S03 | 완료 | UI renderer/module decomposition | source ownership 안정화 gate |
| V230-S04 | 완료 | 조건부 ONVIF/external TURN/WHEP evidence | not-run is not PASS 경계 |
| V230-S05 | 완료 | VLM opt-in operational evidence | default-off/provider-not-run boundary |
| V230-S06 | 완료 | Ops backup/recovery evidence lifecycle | staging drill/evidence lifecycle gate |
| V230-S07 | 완료 | Integrator contract conformance | contract artifact conformance gate |

## v2.3.0 Release Close-out

실제 tag/push는 이 release close-out 지시에 한해 수행합니다. 이 문장은 historical close-out archive 문구이며, 현재 작업의 커밋/푸시 권한은 AGENTS.md와 최신 사용자 지시가 우선합니다.

## 이전 완료/증적 요약

이 절은 verifier 호환을 위한 보존 요약입니다. 현재 v2.5.0의 완료 근거가 아닙니다.

| 항목 | 보존 문구 | 현재 해석 |
| --- | --- | --- |
| V180-P0-03 | Manual UI evidence checklist hardening, `/setup`, `/login`, `/ops`, `/client`, `/ops/rules`, `/client/live`, evidence index, verify-manual-ui-evidence | manual UI evidence 구조 보존 |
| V220-F06 | UI Evidence Close-out 준비, 기능 inventory, manual UI checklist, UI 풀테스트 결과 기록 기준, verify-v220-ui-evidence-closeout, 상태 `완료`는 각 follow-up 산출물과 정적/스크립트 verifier, 인앱 브라우저 UI 풀테스트, 30분 soak, 120분 longrun은 아직 | historical UI close-out 기준 |
| V200-S00 | VLM 도입 경계, VLM을 감지기가 아니라 이벤트 해석/리뷰 보조 계층으로 정의 | VLM default-off boundary |
| V210-S00 | v2.1.0 entry baseline, verify-v210-entry-baseline | historical entry baseline |
| Runtime Dashboard long-run evidence template | Runtime Dashboard long-run evidence template, Runtime longrun evidence sample fixture | template 존재 기준 |
| Release gate | verify-runtime-media-longrun-trigger-matrix, media-server.runtime-media-longrun-trigger-matrix.v1, V200-S17 안정화/장시간/UI 기준 정리 종료 기준, verify-rc-release-gate | longrun/RC gate boundary |
| Research boundary | Re-ID WARNING(실험 유지), OC-SORT/BoT-SORT/DeepSORT planning-only | default-on 승격 아님 |

Historical verifier compatibility row:

| 순서 | ID | 우선순위 | 상태 | 항목 | 산출물 | verifier | 경계 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | V220-F06 | P1 | 완료 | UI Evidence Close-out 준비 | 기능 inventory, manual UI checklist, UI 풀테스트 결과 기록 기준 | `verify-v220-ui-evidence-closeout` | 상태 `완료`는 각 follow-up 산출물과 정적/스크립트 verifier 기준입니다. 인앱 브라우저 UI 풀테스트, 30분 soak, 120분 longrun은 아직 |

## 후속 이슈 추천 규칙

후속 이슈는 현재 v2.5.0와 현재 스텝 범위 안에서 실제로 처리 가능한 항목만 기록합니다. 다음 버전 후보, 별도 Phase 후보, 사용자 승인이 필요한 새 제품 범위는 이 문서에 추천하지 않습니다.
