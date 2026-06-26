# Project Feature Test Inventory

이 문서는 현재 release 목표 `v3.3.0` 기준의 기능별 테스트 분류 기준표입니다.
독자는 개발/테스트 에이전트이며, lifecycle은 active release target 동안 유지되는 test inventory입니다.
AGENTS.md가 개발/테스트/보고/커밋 권한의 최상위 규칙이고, 이 문서는 기능 ID와 테스트 영역만 관리합니다.

중요한 경계:

- 이 문서는 **테스트 실행 결과 문서가 아닙니다**.
- 이 문서는 **현재 테스트가 존재한다는 증거가 아닙니다**.
- coverage 대조 전에는 `테스트 있음`, `UI 있음`, `완료`라고 보고하지 않습니다.
- raw JSON/API-only 확인은 UI 풀테스트 evidence가 아닙니다.
- 테스트 영역은 `안정화`, `30분`, `120분`, `UI` 네 가지만 사용합니다.
- 실기기/외부 endpoint/credential 조건은 별도 영역이 아니라 안정화 조건 또는 UI 제외 기록에 편입합니다.

## Test Area Roles

| 영역 | 역할 | PASS evidence | 대체 불가 |
| --- | --- | --- | --- |
| 안정화 | build, static, API/schema, auth route, media path, verifier 중심 선수 테스트 | 실제 명령, exit code 0, summary/report fail 0, 실패/skip 사유 | 30분/120분 장시간 PASS, UI 직접 조작 evidence |
| 30분 | 장기간 테스트 지시 시 기본 soak | `verify-predev --soak-minutes 30` 또는 해당 long session report | 안정화, 120분, UI 풀테스트 |
| 120분 | 메모리 릭, 장시간 누수, runtime drift 감시 | 사용자 승인 후 120분 longrun report | 안정화, 30분, UI 풀테스트 |
| UI | 인앱 브라우저 직접 클릭/타이핑/선택/반응형/시각 품질/role guard 확인 | route, 계정/권한, viewport/theme, 직접 조작, screenshot/artifact, 재검수 결과 | 스크립트 smoke, raw JSON/API-only 확인 |

## Summary

| 항목 | 수 |
| --- | ---: |
| 전체 기능 항목 | 639 |
| UI 직접 필요 | 339 |
| UI 간접 필요 | 31 |
| UI 비대상 | 269 |
| 테스트 필요 | 639 |
| 안정화 대상 | 629 |
| UI 풀테스트 대상 | 359 |
| 30분 soak 대상 | 49 |
| 120분 대상 | 7 |

## Current Coverage Status

이 절은 inventory 문서 자체의 coverage 상태입니다. 실제 안정화 테스트, 30분 soak, 120분 longrun, UI 풀테스트를 실행했다는 뜻이 아닙니다.

| 항목 | 현재 상태 | 결론 |
| --- | --- | --- |
| 기능 ID 목록 | 639개 기능 ID를 `UI-*`, `AUTH-*`, `SRC-*`, `RULE-*`, `EVT-*`, `CLIENT-*`, `MEDIA-*`, `LAB-*`, `SAFE-*`, `OPS-*`로 분리 | 기준표 작성 완료 |
| 코드 로직 위치 | ID prefix별 owner source를 지정 | 실행 증거 아님 |
| 제품 UI 위치 | UI 필요/간접/비대상을 분리 | inventory 단독으로 UI PASS 판정 불가 |
| 안정화 테스트 매핑 | verifier family를 ID prefix별로 지정 | 기준표 작성 완료 |
| 30분 테스트 매핑 | 30분 대상 기능을 media/session/runtime 중심으로 분리 | 기준표 작성 완료 |
| 120분 테스트 매핑 | memory leak/runtime drift 조건부 대상 분리 | 기준표 작성 완료 |
| VA seed 데이터 | `test/fixtures/manual_ui_fulltest_va_seed_matrix.json`로 numeric ID/API payload 기준 full UI seed matrix를 고정 | 준비 기준일 뿐 실행 증거 아님 |
| UI 풀테스트 결과 | 기능 ID별 result template 기록란은 별도 문서가 관리 | 결과 문서 없이 inventory만으로 UI PASS 판정 불가 |
| Coverage gate | `./server.sh verify-feature-inventory-coverage`가 `media-server.feature-inventory-coverage.v1` report로 기능 ID별 연결을 점검 | `missing coverage target` 누락 ID는 release gate에서 FAIL |
| VLM current expansion | VLM route, control, action, runtime state, sidecar, privacy guard, feature-only retention을 현재 기능 ID에 연결 | 실행 증거 아님 |

## v3.3.0 Live Source Reliability Workspace Coverage Mapping

이 절은 현재 active target의 계획 단계 연결만 남깁니다. 아래 행은 실행 evidence가
아니며, 기능 구현 전에는 실제 기능 ID, route/control/action, verifier command를
추가해야 합니다. 신규 기능 ID가 예약되어 있어도 안정화/UI 테스트를 PASS로 보고하지
않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| v3.3.0 (1) v3.3.0 roadmap/source baseline 정렬 | `OPS-080`, `SAFE-113` | `verify-v330-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `3.3.0`, latest published `v3.2.0`, current roadmap `v3.3.0 Live Source Reliability Workspace` 정렬 기준. v3.3 기능 구현, UI 풀테스트, 30분/120분, GitHub Release publish evidence가 아님 |
| v3.3.0 (2) Source Registry Snapshot and Identity | `SRC-033`, `SAFE-114`, `OPS-081` | `verify-v330-source-registry-snapshot-identity` | `/ops/api/source-registry/snapshot`의 Ops-only read model이 sourceId, source kind, PublishedView 연결, canonical source key, owner/site/group context를 조합하는지 확인합니다. source registry write, PublishedView write, viewer/client 노출, onboarding quality, reliability timeline, incident correlation, recovery queue, client digest, search/metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (3) Source Onboarding Quality Summary | `SRC-034`, `SAFE-115`, `OPS-082` | `verify-v330-source-onboarding-quality-summary` | `/ops/api/source-registry/onboarding-quality`과 `/ops/sources`가 채널 저장 전 validation, 중복/충돌/누락/ready 상태, ONVIF/WHEP/RTSP 입력 품질 요약을 Ops-only로 표시하는지 확인합니다. source registry write, PublishedView write, viewer/client 노출, reliability timeline, incident correlation, recovery queue, client digest, search/metrics, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (4) Reliability Timeline and Health History | `SRC-035`, `SAFE-116`, `OPS-083` | `verify-v330-reliability-timeline-health-history` | `/ops/api/source-registry/reliability-timeline`과 `/ops/sources`가 live/stale/offline/reconnect/source warning 변화 이력과 Ops audit 연결을 Ops-only로 표시하는지 확인합니다. source registry write, PublishedView write, viewer/client 노출, API/schema/media 변경, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (5) Incident-to-Source Correlation Layer | `UI-070`, `SRC-036`, `EVT-071`, `SAFE-117`, `OPS-084` | `verify-v330-incident-source-correlation-layer`, `verify-ops-client-ui` | `/ops/api/events/reviews`와 `/ops/events`가 v3.2 resolution detail에 source reliability 원인/context, closure impact, source audit/recheck handoff를 Ops-only로 연결하는지 확인합니다. source registry write, PublishedView write, viewer/client 노출, EventRecord/Event POST/API/schema/media 변경, recovery queue, client digest, search/metrics, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (6) Operator Recheck and Recovery Queue | `UI-071`, `SRC-037`, `EVT-072`, `SAFE-118`, `OPS-085` | `verify-v330-operator-recheck-recovery-queue`, `verify-ops-client-ui` | `/ops/api/events/reviews`와 `/ops/events`가 failed-only recheck, retry candidate, recovery checklist, dry-run 결과, operator note link를 Ops-only로 연결하는지 확인합니다. source registry write, PublishedView write, viewer/client 노출, EventRecord/Event POST/API/schema/media 변경, persistent recovery queue write, client digest, search/metrics, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (7) Client-safe Source Status Digest | `UI-072`, `CLIENT-028`, `SRC-038`, `SAFE-119`, `OPS-086` | `verify-v330-client-safe-source-status-digest`, `verify-ops-client-ui` | `/client/api/views/{id}/events`와 client live/dashboard/events가 viewer-safe source status와 connection health digest를 표시하는지 확인합니다. source URL/raw locator/raw JSON/debug/credential/operator material, source registry write, PublishedView write, EventRecord/Event POST/API/schema/media 변경, search/metrics, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (8) Operator Runbook and Reliability Handoff | `SAFE-120`, `OPS-087` | `verify-v330-operator-runbook-reliability-handoff`, `verify-docs-links` | `docs/live-source-health.md`의 operator runbook source-of-truth와 docs index/UI guide/config/backup 문서 연결을 확인합니다. 제품 API/UI schema, source registry write, PublishedView write, real backup/restore, search/metrics, 30분/120분, published metadata evidence가 아님 |

## v3.2.0 Operations Resolution Workspace Coverage Mapping

이 절은 최신 published baseline의 기능 ID 연결입니다. 아래 행은 실행 evidence가
아니며, v3.3.0 완료 근거 또는 UI 풀테스트/30분/120분 PASS로 대체하지 않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| v3.2.0 (1) v3.2.0 baseline 정렬 | `OPS-069`, `SAFE-102` | `verify-v320-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `3.2.0`, latest published `v3.2.0`, current roadmap `v3.2.0 Operations Resolution Workspace` 정렬 기준. v3.2 기능 구현, UI 풀테스트, 30분/120분, GitHub Release publish evidence가 아님 |
| v3.2.0 (2) Resolution State Contract | `EVT-063`, `SAFE-103`, `OPS-070` | `verify-v320-resolution-state-contract` | 사건 상태, 판정 reason, close/reopen lifecycle contract를 `/ops/api/events/reviews`의 `media-server.ops.resolution-state.v1` Ops-only state/API/verifier와 연결합니다. Unified Ops Events Workspace, UI 풀테스트 직접 조작, 30분/120분, operator assignment flow, client digest, search/metrics, published metadata evidence가 아님 |
| v3.2.0 (3) Unified Ops Events Workspace | `UI-062`, `EVT-064`, `SAFE-104`, `OPS-071` | `verify-v320-unified-ops-events-workspace`, `verify-ops-client-ui` | `/ops/events` resolution queue/detail/timeline workspace를 실제 UI/verifier와 연결합니다. Evidence Quality Layer, Source Reliability Context, AI Review Quality Context, Operator Resolution Flow, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (4) Evidence Quality Layer | `UI-063`, `EVT-065`, `SAFE-105`, `OPS-072` | `verify-v320-evidence-quality-layer`, `verify-ops-client-ui` | evidence completeness/confidence/replay coverage hint를 `/ops/events` UI와 `/ops/api/events/reviews` `unifiedResolutionWorkspace.evidenceQuality` payload/verifier에 연결합니다. Source Reliability Context, AI Review Quality Context, Operator Resolution Flow, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (5) Source Reliability Context | `UI-064`, `EVT-066`, `SAFE-106`, `OPS-073` | `verify-v320-source-reliability-context`, `verify-v320-source-reliability-runtime-sample`, `verify-ops-client-ui` | source health와 recent failure context를 `/ops/events` UI와 `/ops/api/events/reviews` `unifiedResolutionWorkspace.sourceReliability` payload/verifier에 연결합니다. runtime sample은 fixture EventRecord item을 사용해 개별 item `sourceReliability`를 확인합니다. AI Review Quality Context, Operator Resolution Flow, Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (6) AI Review Quality Context | `UI-065`, `EVT-067`, `SAFE-107`, `OPS-074` | `verify-v320-ai-review-quality-context`, `verify-ops-client-ui` | correction/review signal, uncertainty reason, quality badge를 `/ops/events` UI와 `/ops/api/events/reviews` `unifiedResolutionWorkspace.aiReviewQuality` payload/verifier에 연결합니다. Operator Resolution Flow, Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (7) Operator Resolution Flow | `UI-066`, `EVT-068`, `SAFE-108`, `OPS-075` | `verify-v320-operator-resolution-flow`, `verify-ops-client-ui` | assign, note, close, reopen, audit trail을 `/ops/events` UI와 `/ops/api/events/reviews` write path/verifier에 연결합니다. Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (8) Action Readiness Checklist | `UI-067`, `EVT-069`, `SAFE-109`, `OPS-076` | `verify-v320-action-readiness-checklist`, `verify-ops-client-ui` | rule draft/evidence bundle/notification readiness checklist를 `/ops/events` UI와 `/ops/api/events/reviews` `unifiedResolutionWorkspace.actionReadinessChecklist` payload/verifier에 연결합니다. Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (9) Client-safe Resolution Digest | `UI-068`, `CLIENT-027`, `SAFE-110`, `OPS-077` | `verify-v320-client-safe-resolution-digest`, `verify-ops-client-ui` | viewer-safe status summary와 redaction boundary를 `/client/api/views/{id}/events` `resolutionDigest`, client live/dashboard/events UI, 정적 verifier에 연결합니다. Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (10) Resolution Search & Metrics | `UI-069`, `EVT-070`, `SAFE-111`, `OPS-078` | `verify-v320-resolution-search-metrics`, `verify-ops-client-ui` | active resolution filters, saved view presets, 운영 metric summary를 `/ops/events` UI와 `/ops/api/events/reviews` `unifiedResolutionWorkspace.resolutionSearchMetrics` payload/verifier에 연결합니다. Stabilization and Release Readiness, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (11) Stabilization and Release Readiness | `SAFE-112`, `OPS-079` | `verify-v320-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run` | v3.2 local stabilization gate, release evidence/not-run boundary, close-out dry-run 기록을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release 실행 evidence가 아님 |

## v3.1.0 Encoded Event Clip and Safe Sharing Expansion Coverage Mapping

이 절은 현재 active target의 계획 단계 연결만 남깁니다. 아래 행은 실행 evidence가
아니며, 기능 구현 전에는 실제 기능 ID, route/control/action, verifier command를
추가해야 합니다. 신규 기능 ID가 예약되어 있어도 안정화/UI 테스트를 PASS로 보고하지
않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| V310-S00 Baseline/source-of-truth | `OPS-061`, `SAFE-093` | `verify-v310-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `3.1.0`, latest published `v3.1.0`, current roadmap `v3.1.0 Encoded Event Clip and Safe Sharing Expansion` 정렬 기준. v3.1 기능 구현, UI 풀테스트, 30분/120분, GitHub Release publish evidence가 아님 |
| V310-S01 Encoded Event Clip Contract | `OPS-062`, `SAFE-094` | `verify-v310-event-clip-contract` | EncodedClipManifest, MP4/WebM format, FrameRef/PTS mapping, evidence links, retention/privacy/non-VMS boundary, fixture, docs/inventory/release records 연결 기준. encoder generation, replay UI, cleanup execution, client digest, scoped API, UI 풀테스트, 30분/120분, GitHub Release publish evidence가 아님 |
| V310-S02 Event Clip Encoder Pipeline | `EVT-059`, `SAFE-083` | `verify-analysis-state`, `./server.sh build`, `git diff --check` | 기존 frame-bundle hook에서 bounded WebM/VP8 encoded clip artifact, FrameRef-PTS mapping, queue/status manifest, partial cleanup, non-VMS boundary를 확인합니다. replay UI, client digest, VMS/NVR archive API, 24/7 recording, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V310-S03 Replay Timeline UI | `UI-060`, `OPS-063`, `SAFE-095` | `verify-v310-replay-timeline-ui`, `verify-ops-client-ui` | `/ops/events` Ops-only replay timeline UI가 event frame, representative image, frame bundle, encoded clip timeline, FrameRef/PTS mapping을 표시하는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, client digest, scoped API, cleanup execution, published metadata evidence가 아님 |
| V310-S04 Client-safe Event Digest | `CLIENT-025`, `SAFE-096` | `verify-v310-client-safe-event-digest`, `verify-ops-client-ui` | `/client/api/views/{id}/events`와 client live/dashboard/events가 `media-server.client.event-digest.v1` viewer-safe digest를 표시하고 source/raw/debug/provider/feature provenance/encoded clip path/rule action material을 노출하지 않는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, scoped API, cleanup execution, published metadata evidence가 아님 |
| V310-S05 Scoped Integrator Search API | `CLIENT-026`, `SAFE-097`, `OPS-064` | `verify-v310-scoped-integrator-search-api`, `verify-auth-routes` | `/client/api/views/{id}/events/search`가 integrator-only PublishedView-scoped event search API로 `event:read:{viewId}`를 요구하고 `media-server.integrator.scoped-event-search.v1` digest만 반환하는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, cleanup execution, vector search, published metadata evidence가 아님 |
| V310-S06 Operator Feature Correction | `UI-061`, `EVT-061`, `SAFE-098`, `OPS-065` | `verify-v310-operator-feature-correction`, `verify-ops-client-ui` | `/ops/events`가 operator-only correctedFeatureLabel/featureAliases/reanalysisRequested 상태를 기존 review state에 저장하고 `media-server.ops.operator-feature-correction.v1` view model로 표시합니다. UI 풀테스트 직접 조작, 30분/120분, vector search, cleanup execution, published metadata evidence가 아님 |
| V310-S07 Optional Vector Search | `LAB-089`, `SAFE-100`, `OPS-067` | `verify-v310-optional-vector-search`, `verify-analysis-state` | default-off optional embedding index가 명시 opt-in일 때만 non-identifying embedding을 quality gate와 dimension gate로 인덱싱하고 rebuild stale vector entry를 제거하는지 확인합니다. provider embedding calls, UI 풀테스트 직접 조작, 30분/120분, client/viewer 노출, published metadata evidence가 아님 |
| V310-S08 Retention/Export Hardening | `EVT-062`, `SAFE-099`, `OPS-066` | `verify-v310-retention-export-hardening`, `verify-analysis-state` | encoded clip lifecycle cleanup이 EventRecord/EvidenceManifest/FeatureSet/SearchIndex cleanup 계획에 묶이고 release-safe export bundle이 encoded media/path/material을 제외하며 `export-bundle` audit coverage를 남기는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, vector search, destructive operational cleanup, published metadata evidence가 아님 |
| V310-S09 Stabilization and Release Readiness | `SAFE-101`, `OPS-068` | `verify-v310-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run` | v3.1 local stabilization gate, release evidence/not-run boundary, close-out dry-run 기록을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release 실행 evidence가 아님 |

## v3.0.0 Event Evidence Search MVP Coverage Mapping

이 절은 직전 published baseline의 계획 단계 연결입니다. 아래 행은 실행 evidence가
아니며, 기능 구현 전에는 실제 기능 ID, route/control/action, verifier command를
추가해야 합니다. 신규 기능 ID가 예약되어 있어도 안정화/UI 테스트를 PASS로 보고하지
않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| V300-S00 Baseline/source-of-truth | `OPS-051`, `SAFE-081` | `verify-v300-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `3.0.0`, latest published `v3.0.0`, current roadmap `v3.0.0 Event Evidence Search MVP` 정렬 기준. v3.0 기능 구현, UI 풀테스트, 30분/120분, GitHub Release publish evidence가 아님 |
| V300-S01 Event Evidence Contract | `OPS-052`, `SAFE-082` | `verify-v300-event-evidence-contract` | EvidenceManifest, FrameRef, retention lifecycle, privacy/non-VMS boundary, fixture, docs/inventory/release records 연결 기준. frame extraction, encoded clip/playback, Search DSL, `/ops/events` UI, UI 풀테스트, 30분/120분, GitHub Release publish evidence가 아님 |
| V300-S02 Frame Bundle Extraction | `EVT-060`, `SAFE-084` | `verify-analysis-state`, `./server.sh build`, `git diff --check` | EventRecord recorder가 eventFrame, representativeImage selection, bboxCrop, pre/event/post frameBundle manifest, EvidenceManifest sidecar를 생성하는지 확인합니다. encoded clip/playback, Search DSL, `/ops/events` UI, VMS/NVR archive API, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S03 Feature Schema and Privacy Policy | `LAB-083`, `SAFE-085`, `OPS-053` | `verify-v300-feature-schema-privacy` | FeatureSet envelope, namespace allowed/disallowed matrix, raw prompt/response non-retention, identity feature prohibition, privacy guard fixture와 문서 연결 기준. VLM queue/runtime/provider success, Search DSL, `/ops/events` UI, 얼굴 인식/신원 식별/model 품질 PASS, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S04 VLM Feature Queue | `LAB-084`, `SAFE-086`, `OPS-054` | `verify-v300-vlm-feature-queue`, `verify-analysis-state` | Background queue, lazy trigger, missing-runtime/queue-timeout/invalid-output VLM-only failure, structured FeatureSet revision 경계를 확인합니다. real provider success, Search DSL, `/ops/events` UI, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S05 Feature-only Retention | `LAB-085`, `SAFE-087`, `OPS-055` | `verify-v300-feature-only-retention`, `verify-analysis-state` | Feature-only durable retention, raw prompt/response rejection, FeatureSet revision store, reanalysis revision policy를 확인합니다. Search DSL, Retention/Pin/Cleanup, `/ops/events` UI, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S06 Search DSL and Query Convert | `LAB-086`, `SAFE-088`, `OPS-056` | `verify-v300-search-dsl-query-convert`, `verify-analysis-state` | Natural-language query conversion to constrained Search DSL, text/tags/filter matching, strict structured output, identity-query rejection을 확인합니다. Feature/Search Index, `/ops/events` UI, vector search, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S07 Feature/Search Index | `LAB-087`, `SAFE-089`, `OPS-057` | `verify-v300-feature-search-index`, `verify-analysis-state` | EventRecord, FeatureSet, EvidenceManifest, operator review state projection과 index/rebuild/report, stale result guard를 확인합니다. `/ops/events` UI, vector search, semantic provider rerank, retention cleanup execution, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S08 Ops Events UI | `UI-059`, `SAFE-090`, `OPS-058` | `verify-v300-ops-events-ui`, `verify-ops-client-ui` | `/ops/events` Ops-only search/detail UI가 evidence timeline, feature reasons, retry, pin, retention status를 표시하는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, Retention/Pin/Cleanup lifecycle execution, published metadata evidence가 아님 |
| V300-S09 Retention/Pin/Cleanup | `LAB-088`, `SAFE-091`, `OPS-059` | `verify-v300-retention-pin-cleanup`, `verify-analysis-state` | 기본 7일 retention, operator-configurable override, pinned event cleanup 제외, dry-run/apply lifecycle delete plan, audit trail을 확인합니다. destructive cleanup 실운영 실행, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| V300-S10 Stabilization and Release Readiness | `SAFE-092`, `OPS-060` | `verify-v300-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run` | v3.0 local stabilization gate, release evidence/not-run boundary, close-out dry-run 기록을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release 실행 evidence가 아님 |
## v2.9.0 Final 2.x Closure & Compatibility Baseline Coverage Mapping

이 절은 latest published baseline의 기능 ID 연결입니다. 아래 행은 실행 evidence가
아니며, v3.0.0 완료 근거 또는 UI 풀테스트/30분/120분 PASS로 대체하지 않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| V290-S00 Baseline/source-of-truth | `OPS-041`, `SAFE-071` | `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `2.9.0`, latest published `v2.8.0`, current roadmap `v2.9.0` 정렬 기준. GitHub Release publish evidence가 아님 |
| V290-S01 2.x final contract freeze | `OPS-042`, `SAFE-072` | `verify-v290-final-contract-freeze` | Event POST/WebRTC/SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload의 2.x 최종 계약 기준. 3.0 migration 구현 evidence가 아님 |
| V290-S02 v2.8 feature regression bundle | `OPS-043`, `SAFE-073` | `verify-v290-v28-regression-bundle` | v2.8 완료 evidence 재사용이 아니라 v2.9 기준 재실행 evidence |
| V290-S03 2.x compatibility gate | `OPS-044`, `SAFE-074` | `verify-v290-2x-compatibility-baseline` | v2.5~v2.8 하위 verifier가 실제 실행한 범위만 PASS |
| V290-S04 release test records enforcement | `OPS-045`, `SAFE-075` | `verify-v290-release-test-records-enforcement` | 저장소 보존형 테스트 기록 체계, pass/fail 결과표, 미실행/제외 분리, cleanup/token 기록 기준. UI/30분/120분/published metadata 실행 evidence가 아님 |
| V290-S05 UI fulltest criteria freeze | `OPS-046`, `SAFE-076` | `verify-v290-ui-fulltest-criteria-freeze`, `verify-manual-ui-evidence` | v2.9 UI 풀테스트 route/control/action/role/viewport/theme 기준 freeze. 인앱 브라우저 직접 조작 실행 evidence가 아님 |
| V290-S06 release evidence hygiene | `OPS-047`, `SAFE-077` | `verify-v290-release-evidence-hygiene`, `verify-release-evidence-index`, `verify-script-inventory` | release evidence index, release test records, feature inventory, script inventory, manual UI evidence 연결과 PASS/FAIL vs 미실행/제외/manual-not-run/미확인 분리. 실제 UI/30분/120분/published metadata 실행 evidence가 아님 |
| V290-S07 public docs/assets refresh | `OPS-048`, `SAFE-078` | `verify-v290-public-docs-assets-refresh`, `verify-docs-ui-assets`, `verify-docs-links` | README/README.en/docs index/UI guide/docs asset policy/release-version policy refresh. 대표 이미지 직접 재캡처, UI 풀테스트, 30분/120분, published metadata 실행 evidence가 아님 |
| V290-S08 final stabilization run | `OPS-049`, `SAFE-079` | `verify-v290-final-stabilization-run` | build/auth/Ops-Client UI/rule/event/metadata/media-schema/docs-inventory 안정화 실행 기록 기준. UI 풀테스트 직접 조작, 30분/120분, published metadata, field smoke 실행 evidence가 아님 |
| V290-S09 owner release readiness | `OPS-050`, `SAFE-080` | `verify-v290-owner-release-readiness` | v2.9.0 local owner release readiness와 release close-out dry-run 기준. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke 실행 evidence가 아님 |

## v2.8.0 Operator-Supervised Action Readiness Coverage Mapping

이 절은 최신 published baseline의 기능 ID 연결입니다. 아래 행은 실행 evidence가
아니며, v2.9.0 완료 근거 또는 UI 풀테스트/30분/120분 PASS로 대체하지 않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| V280-S00 Baseline/source-of-truth | `OPS-039`, `SAFE-064` | `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `2.8.0`, latest published `v2.7.0`, current roadmap `v2.8.0` 정렬 기준. GitHub Release publish evidence가 아님 |
| V280-S01 2.x runway boundary | `OPS-039`, `SAFE-064` | 문서 gate 기준 | `2.8.0`/`2.9.0`/`3.0.0` 경계 문서화 기준. 3.0 설계 완료나 migration 구현 evidence가 아님 |
| V280-S02 Incident Action Readiness Queue | `UI-055`, `EVT-055`, `LAB-079`, `SAFE-065` | `verify-v280-incident-action-readiness-queue` | Ops-only readiness queue 기준. 외부 실제 발송, 자동 action write, UI 직접 조작 PASS가 아님 |
| V280-S03 Approval-gated Rule Draft Readiness | `UI-056`, `RULE-104`, `EVT-056`, `LAB-080`, `SAFE-066` | `verify-v280-approval-gated-rule-draft` | 수동 approval/staged draft 기준. full replay, 자동 저장, 자동 적용 evidence가 아님 |
| V280-S04 Evidence Intake and Field Readiness | `UI-057`, `SRC-032`, `EVT-057`, `LAB-081`, `SAFE-067` | `verify-v280-evidence-intake-field-readiness` | redacted intake와 field precondition 기준. endpoint/credential 없는 field PASS가 아님 |
| V280-S05 Runtime Evidence Window | `UI-058`, `EVT-058`, `LAB-082`, `SAFE-068` | `verify-v280-runtime-evidence-window` | bounded runtime evidence window 기준. 30분/120분/장기 녹화 evidence가 아님 |
| V280-S06 Client-safe Follow-up Digest | `CLIENT-024`, `SAFE-069` | `verify-v280-client-safe-followup-digest` | viewer-safe follow-up digest 기준. source/raw/debug/provider/rule editor/action control 비노출은 브라우저 직접 확인 전 UI PASS가 아님 |
| V280-S07 Release readiness | `UI-055`, `UI-056`, `UI-057`, `UI-058`, `CLIENT-024`, `OPS-040`, `SAFE-070` | `verify-v280-owner-release-readiness` | v2.8.0 local release readiness gate 기준. UI 풀테스트 직접 조작, 30분/120분, published metadata, tag/push/GitHub Release evidence가 아님 |

## v2.7.0 Operational Incident Command Loop Coverage Mapping

이 절은 최신 published baseline의 기능 ID 연결입니다. 아래 행은 실행 evidence가
아니며, v2.8.0 완료 근거 또는 UI 풀테스트/30분/120분 PASS로 대체하지 않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| V270-S01 Incident Triage Board | `UI-050`, `EVT-050`, `LAB-074`, `SAFE-058` | `verify-v270-incident-triage-board` | `/ops/events` board view, lane/filter/sort UI, viewer/client 비노출 기준. 브라우저 직접 조작 전 UI PASS가 아님 |
| V270-S02 Decision scorecard | `UI-051`, `EVT-051`, `LAB-075`, `SAFE-059` | `verify-v270-incident-decision-scorecard` | deterministic scorecard 기준. provider 호출, raw JSON/source URL 노출, schema/media 변경 evidence가 아님 |
| V270-S03 Operational Action Pack | `UI-052`, `EVT-052`, `LAB-076`, `SAFE-060` | `verify-v270-operational-action-pack` | evidence bundle/rule draft/alert dry-run/source health recheck 연결 기준. 외부 실제 발송과 자동 rule write는 비범위 |
| V270-S04 Rule What-if Preview | `UI-053`, `EVT-053`, `LAB-077`, `SAFE-061` | `verify-v270-rule-what-if-preview` | selected incident/rule suggestion preview 기준. full replay engine, 자동 저장, 자동 적용 evidence가 아님 |
| V270-S05 Operator outcome memory | `UI-054`, `EVT-054`, `LAB-078`, `SAFE-062` | `verify-v270-operator-outcome-memory` | 기존 Ops review state/audit 기반 deterministic history hint 기준. EventRecord top-level 변경과 client/viewer 노출은 비범위 |
| V270-S06 Release readiness | `UI-050`, `UI-051`, `UI-052`, `UI-053`, `UI-054`, `OPS-038`, `SAFE-063` | `verify-v270-owner-release-readiness` | v2.7.0 local release readiness gate 기준. UI 풀테스트 직접 조작, 30분/120분, published metadata, tag/push/GitHub Release evidence가 아님 |

## v2.6.0 Operational Hardening Coverage Mapping

이 절은 직전 published baseline의 기능 ID 연결입니다. 아래 행은 실행 evidence가 아니며,
v2.7.0 완료 근거 또는 UI 풀테스트/30분/120분 PASS로 대체하지 않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| V260-S01 Incident memory productization | `UI-045`, `EVT-046`, `LAB-069`, `SAFE-052` | `verify-v260-incident-memory-productization` | `/ops/events` Ops-only wrapper/static smoke 기준. 브라우저 직접 조작, provider 호출, auto rule 적용, 장시간 테스트 evidence가 아님 |
| V260-S02 Rule suggestion review | `UI-046`, `EVT-047`, `LAB-070`, `SAFE-053` | `verify-v260-rule-suggestion-review` | `/ops/events` incident-to-rule review wrapper와 `/ops/rules` draft-only 링크 기준. 자동 저장, provider 호출, schema/media 변경, UI 풀테스트 evidence가 아님 |
| V260-S03 ONVIF credential gate | `UI-047`, `SRC-031`, `LAB-071`, `SAFE-054` | `verify-v260-onvif-credential-gate` | `/ops/sources` credential gate와 `/ops/api/onvif/import-draft` redaction guard 기준. persistent store, external secret manager, 실장비 credential 성공, UI 풀테스트 evidence가 아님 |
| V260-S04 Runtime dashboard trends | `UI-048`, `EVT-048`, `LAB-072`, `SAFE-055` | `verify-v260-runtime-dashboard-trends` | `/ops/dashboard` page-session-only runtime trend card와 static smoke 기준. 장기 녹화, 30분/120분, UI 풀테스트, schema/media/client 변경 evidence가 아님 |
| V260-S05 Scenario extension | `UI-049`, `RULE-103`, `EVT-049`, `LAB-073`, `SAFE-056` | `verify-v260-scenario-cross-zone-reentry` | `/ops/rules` configured-zones A→B 후보, analysis-state, va-replay fixture 기준. Event POST/WebRTC/SSE/WS schema, media path, client 노출, UI 풀테스트 evidence가 아님 |
| V260-S06 Release readiness | `UI-045`, `UI-046`, `UI-047`, `UI-048`, `UI-049`, `OPS-037`, `SAFE-057` | `verify-v260-owner-release-readiness` | v2.6.0 Operational Hardening local release readiness gate 기준. UI 풀테스트 직접 조작, 30분/120분, published metadata, tag/push/GitHub Release evidence가 아님 |

## v2.5.0 Semantic Incident Memory Coverage Mapping

이 절은 현재 active target의 기능 ID 연결만 남깁니다. 아래 행은 실행 evidence가 아니며, UI 풀테스트/30분/120분 PASS로 대체하지 않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| V250-S01 Event/incident text projection | `EVT-039`, `LAB-063`, `SAFE-043` | `verify-v250-incident-text-projection` | 검색 UI/SQLite index/model provider 실행 evidence가 아님 |
| V250-S02 Local incident memory index | `EVT-040`, `LAB-064`, `SAFE-044` | `verify-v250-incident-memory-index` | `/ops/events` UI/API, similarity/timeline/brief, external embedding/provider 실행 evidence가 아님 |
| V250-S03 `/ops/events` semantic search UI | `UI-039`, `EVT-041`, `SAFE-045` | `verify-v250-ops-events-semantic-search-ui` | 브라우저 직접 조작 전 UI PASS가 아님 |
| V250-S04 Incident timeline graph | `UI-040`, `EVT-042`, `LAB-065`, `SAFE-046` | `verify-v250-incident-timeline-graph` | 브라우저 직접 조작과 운영 데이터 graph 판독 전 UI PASS가 아님 |
| V250-S05 Explainable incident brief | `UI-041`, `EVT-043`, `LAB-066`, `SAFE-047` | `verify-v250-explainable-incident-brief` | provider 호출 성공이나 VLM default-on 근거가 아님 |
| V250-S06 Similar incident lookup | `UI-042`, `EVT-044`, `LAB-067`, `SAFE-048` | `verify-v250-similar-incident-lookup` | external embedding/provider 실행 evidence가 아님 |
| V250-S07 Client-safe incident digest | `CLIENT-023`, `SAFE-049` | `verify-v250-client-safe-incident-digest` | viewer role UI 직접 확인 전 UI PASS가 아님 |
| V250-S08 Redacted incident evidence bundle | `UI-043`, `EVT-045`, `LAB-068`, `SAFE-050` | `verify-v250-redacted-incident-evidence-bundle` | 실제 다운로드 파일 육안 검수 전 UI PASS가 아님 |
| V250-S09 Owner decomposition/release readiness | `UI-044`, `OPS-036`, `SAFE-051` | `verify-v250-owner-release-readiness` | close-out gate와 UI 풀테스트 기준 정리. 실제 UI 직접 조작, 30분/120분, tag/push/GitHub Release PASS가 아님 |

## Historical UI Evidence Close-out Compatibility

이 절은 v2.2.0 F06 UI Evidence Close-out 준비 verifier 호환용 cross-reference입니다. 현재 v2.5.0 완료 근거가 아니며, inventory 자체는 실행 evidence가 아님.

| Row | 연결 문서 | verifier | 경계 |
| --- | --- | --- | --- |
| V220-F02 Ops Channels Workspace | [manual-ui-checklist.md](./manual-ui-checklist.md), [manual-ui-result-template.md](./manual-ui-result-template.md) | `verify-v220-ui-evidence-closeout` | F02 UI 실행 PASS가 아님 |
| V220-F03 Ops Users / Access Workspace | [manual-ui-checklist.md](./manual-ui-checklist.md), [manual-ui-result-template.md](./manual-ui-result-template.md) | `verify-v220-ui-evidence-closeout` | F03 UI 실행 PASS가 아님 |
| V220-F04 Ops VLM UI containment | [manual-ui-checklist.md](./manual-ui-checklist.md), [manual-ui-result-template.md](./manual-ui-result-template.md) | `verify-v220-ui-evidence-closeout` | F04 UI 실행 PASS가 아님 |
| V220-F05 Client Preview / Viewer Redaction | [manual-ui-checklist.md](./manual-ui-checklist.md), [manual-ui-result-template.md](./manual-ui-result-template.md) | `verify-v220-ui-evidence-closeout` | F05 UI 실행 PASS가 아님 |
| V220-F06 UI Evidence Close-out | [manual-ui-checklist.md](./manual-ui-checklist.md), [manual-ui-result-template.md](./manual-ui-result-template.md) | `verify-v220-ui-evidence-closeout` | F06는 결과 기록 기준 정리이며 UI 풀테스트 PASS가 아님 |

## Owner Source Map

| ID prefix | 코드 로직 owner | 제품 UI owner | 대표 verifier family |
| --- | --- | --- | --- |
| `UI-*` | `src/ingress/product_ui_*`, `src/ingress/webrtc_http_server.cpp` | Auth/Ops/Client shell | UI/auth/ops/v250 verifier family |
| `AUTH-*` | `src/ingress/http_auth.cpp`, product auth pages/users scripts | `/setup`, `/login`, `/password/change`, `/invite/setup`, `/ops/users` | auth verifier family |
| `SRC-*` | source registry/factory/ONVIF import/ops source scripts | `/ops/sources`, `/ops/api/source-registry/snapshot`, `/client/live`, `/client/dashboard` | source/ONVIF/UI verifier family |
| `RULE-*` | analysis query/scenario/rule engine | `/ops/rules`, `/client/live` overlay | rule/VA verifier family |
| `EVT-*` | event manager/storage/webrtc HTTP server | `/ops/dashboard`, `/ops/events`, `/ops/home` | event/VLM/v250 verifier family |
| `CLIENT-*` | client UI scripts/CSS, WebRTC egress/session | `/client/live`, `/client/dashboard`, `/client/request-access` | client/UI verifier family |
| `MEDIA-*` | session manager, source factory, stream registry, RTSP/WebRTC adapters | video-visible client routes only | codec/WebRTC/longrun verifier family |
| `LAB-*` | analysis query, VLM local stores, internal scripts | 비대상 | lab/VLM fixture verifier family |
| `SAFE-*` | schema/payload/media/auth/UI boundary owners | route guard와 client 비노출 화면 | safety/boundary verifier family |
| `OPS-*` | ops backup/evidence/release readiness scripts | 비대상 | ops evidence/readiness verifier family |

## Verifier Coverage Map

| 기능 ID 범위 | 안정화 verifier 후보 | 비고 |
| --- | --- | --- |
| `UI-001`~`UI-018`, `UI-022`~`UI-072` | auth, Ops, Client, VLM, v250/v260/v270/v280/v300/v310/v320/v330 UI verifier family | route/control/action 단위 UI 풀테스트는 별도 evidence 필요 |
| `AUTH-001`~`AUTH-042` | `verify-auth-regression-matrix`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-auth-ui-smoke`, `verify-auth-scope-picker` | role/scope별 브라우저 증거는 별도 |
| `SRC-001`~`SRC-038` | source/ONVIF/UI verifier family | ONVIF field success는 approved environment only |
| `RULE-001`~`RULE-104` | rule/VA verifier family | 실제 UI 이벤트 발생 전수 evidence 없음. 실제 UI 이벤트 발생 전수 evidence 없으면 FAIL |
| `EVT-001`~`EVT-072` | event/VLM/v250/v260/v270/v280/v300/v310/v320/v330 verifier family | event log 육안 확인은 UI 풀테스트 |
| `CLIENT-001`~`CLIENT-028` | client/UI verifier family | viewer 비노출은 브라우저 확인 필요 |
| `MEDIA-001`~`MEDIA-021` | codec/WebRTC/external TURN/WHEP verifier family | 30분/120분은 사용자 지시 필요 |
| `LAB-001`~`LAB-089` | lab/VLM/v250/v260/v270/v280/v300/v310 fixture verifier family | 제품 UI 비대상 |
| `SAFE-001`~`SAFE-120` | safety/boundary verifier family | schema/media/auth/UI automation 불변 조건 |
| `OPS-035`~`OPS-087` | ops evidence/readiness verifier family | real operational backup, release publish, UI 풀테스트 evidence가 아님 |

## VA Manual UI Seed Matrix

| 항목 | 기준 |
| --- | --- |
| fixture | `test/fixtures/manual_ui_fulltest_va_seed_matrix.json` |
| dry-run 준비 | `./server.sh prepare-manual-ui-fulltest-seed --dry-run`은 HTTP 요청 없이 numeric ID, payload 참조, media file 존재, coverage를 확인합니다. 이 결과는 UI/event evidence가 아닙니다. 상태 표기는 `dry-run 준비 가능, 서버 적용 evidence 없음`으로 남깁니다. |
| registry 파일 준비 | `./server.sh prepare-manual-ui-fulltest-seed --dry-run --emit-registry-dir <dir>`은 throwaway registry 파일을 생성합니다. 이 결과도 UI/event evidence가 아닙니다. |
| registry preconditions file | `preconditions.json`은 throwaway registry 시작 조건 파일입니다. 파일 생성은 서버 적용, 제품 UI 조작, EventRecord 확인 evidence가 아닙니다. |
| apply 경계 | 실제 서버 적용은 사용자 지시 후 `--apply --confirm-throwaway-data --http-base <url>`로만 수행하며, 적용 후에도 인앱 브라우저 확인 전에는 UI PASS가 아닙니다. |
| final state | profiles, event templates, VA rules가 모두 남아 있어야 하며 event log 확인 전 삭제하지 않음 |

## 30-Minute And 120-Minute Mapping

120분 조건부 대상은 memory growth, runtime drift, fanout/media path 고위험 변경,
VLM queue/backpressure 신호가 있을 때 안정화/30분/UI evidence와 분리해 기록합니다.

| 영역 | 대상 기능 | 실행 기준 |
| --- | --- | --- |
| 30분 soak | media/session/runtime, client live, selected rule/event/runtime queue rows | 사용자 장기간 테스트 지시 또는 명시 요청된 경우 `verify-predev --soak-minutes 30` 계열. 요청이 없으면 미실행으로 기록 |
| 120분 | media fanout, source worker lifecycle, non-blocking safety, runtime/cache drift high-risk rows | memory growth/runtime drift 고위험 변경 시 사용자에게 먼저 말하고 승인 후 실행 |

## Coverage Start Conditions

30분, 120분, UI 풀테스트는 실패 후 재시작 비용이 크므로 아래 항목이 먼저 `PASS` 또는 명시 제외로 정리되지 않으면 시작하지 않습니다.

| 시작 조건 | 긴 테스트 전 확인 | 실패 시 처리 |
| --- | --- | --- |
| 기능/route 목록 freeze | 현재 문서의 기능 ID 목록과 result template route/control/action 목록이 맞음 | mapping/template 수정 후 긴 테스트 시작 전 재검수 |
| side-effect 선수 gate | build/auth/Ops/Client/Rule/VA/WebRTC/SSE/WS/Event POST/media path verifier 목록이 실행 계획에 있음 | 선수 gate 실패 시 30분/120분/UI 시작 금지 |
| auth/env/fixture | auth password env, throwaway registry, output artifact 경로 기록 | 누락이면 긴 테스트 시작 전 중단 |
| UI phase order | Auth/setup, route/nav, fixture seed, VLM redaction, VA EventRecord, responsive/theme 순서로 early failure를 앞에 둠 | 앞 phase 실패 시 뒤 phase로 진행하지 않음 |

## Classification Rules

| 값 | 의미 |
| --- | --- |
| UI 필요: 필요 | 제품 화면에서 사용자가 직접 조작하거나 확인해야 합니다. |
| UI 필요: 간접 | 별도 제품 화면은 아니지만 화면 상태, redirect, nav, scope, session 결과로 확인되어야 합니다. |
| UI 필요: 비대상 | 제품 UI를 만들면 안 되거나 API/정책/backend/계약 기능입니다. |
| 테스트 필요: 필요 | 해당 기능은 하나 이상의 테스트 영역에 반드시 들어갑니다. |
| PASS 기준 | 요구 조건입니다. 실제 PASS 보고는 실행 evidence가 있을 때만 가능합니다. |

## A. Screen And Route

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| UI-001 | `/` 진입 후 제품 시작 route로 이동 | 필요 | 필요 | 안정화, UI | auth/setup 상태별 redirect가 실제 route와 브라우저 화면에서 일치 |
| UI-002 | `/setup` 최초 관리자 설정 화면 | 필요 | 필요 | 안정화, UI | setup form 표시, S08 `auth-form-grid`/password policy panel, weak/strong password flow 직접 확인 |
| UI-003 | `/login` 로그인 화면 | 필요 | 필요 | 안정화, UI | S08 `auth-login-form` credential 입력 후 role landing 확인 |
| UI-004 | `/password/change` 비밀번호 변경 화면 | 필요 | 필요 | 안정화, UI | S08 `auth-password-change-form`, 사용자 지정 테스트 pw -> 임시 pw 변경 성공, 임시 pw 로그인, 즉시 원래 pw 재사용 거부, history count 기준 복원 후 최종 로그인 확인 |
| UI-005 | `/logout` 세션 종료 | 간접 | 필요 | 안정화, UI | logout action 후 세션 종료와 보호 route 재접근 차단 확인 |
| UI-006 | `/auth/whoami` 현재 세션 확인 | 간접 | 필요 | 안정화 | principal/schema가 role/scope와 일치 |
| UI-007 | `/invite/setup` 초대 기반 계정 설정 | 필요 | 필요 | 안정화, UI | S08 `auth-invite-setup-form`, invite setup 전후 login/client 접근 경계 확인 |
| UI-008 | `/client/request-access` 시청자 접근 요청 | 필요 | 필요 | 안정화, UI | S08 `auth-access-request-form`, request submit, pending copy, 승인 전 접근 차단 확인 |
| UI-009 | `/ops/home` 운영 Home | 필요 | 필요 | 안정화, UI | home summary/nav/status와 S05 `ops-workspace-home` action grid가 표시되고 320/390/760/1180 overflow 없음 |
| UI-010 | `/ops/dashboard` 운영 Dashboard | 필요 | 필요 | 안정화, UI | filter/search/copy/refresh, root cause/runtime/event panel, S05 `ops-workspace-dashboard` diagnostic grid 표시 확인 |
| UI-011 | `/ops/sources` 채널 / 소스 관리 | 필요 | 필요 | 안정화, UI | source/view CRUD와 validation을 직접 조작 |
| UI-012 | `/ops/rules` VA 룰 / 프로파일 / 이벤트 템플릿 관리 | 필요 | 필요 | 안정화, UI | rule/template/profile CRUD, validation, preview, S06 `rules-workspace` readiness/assist/catalog/detail flow와 320/390/760/1180 overflow 확인 |
| UI-013 | `/ops/users` 사용자 관리 | 필요 | 필요 | 안정화, UI | user/invite/access request/role/scope flow 확인 |
| UI-014 | `/ops/events` Operator Event Review Inbox | 필요 | 필요 | 안정화, UI | operator review inbox list/detail, evidence refs, review state, operator note, false-positive/action target 저장 흐름과 primary nav 비노출 경계 확인 |
| UI-015 | `/client/live` 시청자 Live | 필요 | 필요 | 안정화, UI, 30분 | video viewport/control/status/overlay, S07 `client-live-workspace` video-first grid, viewer redaction, session 지속성 확인 |
| UI-016 | `/client/dashboard` 시청자 Dashboard | 필요 | 필요 | 안정화, UI | viewer scope 내 dashboard/filter/sort/copy와 S07 `client-viewer-dashboard` status/event summary 확인 |
| UI-017 | `/client/events` 시청자 이벤트 route | 필요 | 필요 | 안정화, UI | viewer scope 내 events 표시, S07 `client-viewer-events` direct route, 비노출 경계 확인 |
| UI-018 | `/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test` 제품 UI 미제공 / 404 | 비대상 | 필요 | 안정화, UI | 이전 제품 UI route와 임의 route가 제품 UI로 열리지 않음 |
| UI-019 | light/dark theme-aware 공통 UI | 필요 | 필요 | UI | 주요 화면에서 contrast/token/상태 색상 일관성 확인 |
| UI-020 | desktop 반응형 화면 | 필요 | 필요 | UI | 1180px 이상에서 nav/table/form/video 겹침 없음 |
| UI-021 | mobile 반응형 화면 | 필요 | 필요 | UI | 320px/390px에서 text/control/video overflow 없음 |
| UI-022 | `/ops/vlm` VLM 설치/연결 준비 | 필요 | 필요 | 안정화, UI | Ops-only route에서 local/cloud dry-run 후보, cloud opt-in guard, 단일 선택 상태, 실행/저장 없음 boundary가 표시되고 viewer/client에는 노출되지 않음 |
| UI-023 | `/ops/vlm` VLM profile 저장 | 필요 | 필요 | 안정화, UI | 선택한 dry-run 후보를 profile ID, prompt profile, 평가 상태, 활성화/fallback/disable 상태와 함께 저장하고 저장 목록/삭제가 Ops-only로 동작 |
| UI-024 | `/ops/vlm` VLM Privacy/전송 guard | 필요 | 필요 | 안정화, UI | Cloud 후보에서 외부 전송 경고 확인과 provider logging/retention 검토가 profile 저장 전 guard로 표시되고, local 후보는 provider 전송 없음 상태로 표시 |
| UI-025 | `/ops/vlm` PC capability/recommendation 요약 | 필요 | 필요 | 안정화, UI | hardware class, runtime readiness, 추천/대안/비추천 사유가 Ops-only로 표시되고 자동 설치/호출/저장 action은 발생하지 않음 |
| UI-026 | `/ops/vlm` local model dry-run 후보 선택 | 필요 | 필요 | 안정화, UI | local 후보 선택 버튼이 단일 선택 상태를 반영하고 model download, runtime install, profile 저장 없이 dry-run 상태만 갱신 |
| UI-027 | `/ops/vlm` cloud connection dry-run 후보 선택 | 필요 | 필요 | 안정화, UI | cloud opt-in 전 후보가 disabled 상태이며 opt-in 확인 후에도 provider API 호출/credential 저장 없이 dry-run 선택만 반영 |
| UI-028 | `/ops/vlm` profile 활성화/fallback/disable control | 필요 | 필요 | 안정화, UI | profile row의 active/fallback/disabled 상태가 저장 목록과 상세 copy에 반영되고 VLM runtime 호출은 발생하지 않음 |
| UI-029 | `/ops/vlm` profile 삭제 action | 필요 | 필요 | 안정화, UI | 삭제 버튼이 Ops-only로 동작하고 삭제 후 목록에서 제거되며 EventRecord, sidecar, media path에는 영향 없음 |
| UI-030 | `/ops/vlm` evaluation/prompt profile 표시 | 필요 | 필요 | 안정화, UI | 평가 상태, prompt profile, language/JSON stability planning 값이 저장 profile에 표시되고 benchmark PASS로 과장하지 않음 |
| UI-031 | `/ops/vlm` raw details 접힘 영역 | 필요 | 필요 | 안정화, UI | dry-run/profile diagnostic JSON은 Ops debug details 안에만 접혀 있고 viewer/client 화면에는 노출되지 않음 |
| UI-032 | `/ops/events` VLM review detail control | 필요 | 필요 | 안정화, UI | VLM summary, explanation, false-positive hints, operator questions, evidence availability가 Ops event review 안에서만 열리고 client/viewer에는 노출되지 않음 |
| UI-033 | `/ops/vlm` VLM runtime status panel | 필요 | 필요 | 안정화, UI | provider 상태, runtime 연결 상태, 마지막 evaluation, 실패 사유, privacy mode, default-off 상태가 Ops-only panel에 표시되고 client/viewer에는 노출되지 않음 |
| UI-034 | `/ops/vlm` VLM evaluation result workflow | 필요 | 필요 | 안정화, UI | evaluation result 후보를 latency/JSON/explanation/hallucination/language 축으로 비교하고 profile draft 반영 버튼이 model/prompt/evaluation 상태만 채우며 자동 저장/활성화/runtime 호출은 하지 않음 |
| UI-035 | `/ops/events` VLM review action workflow | 필요 | 필요 | 안정화, UI | VLM review card의 action/target/note control이 `accept`, `dismiss`, `review-needed`를 Ops review state에 저장하고 EventRecord/Event POST/metadata/media path와 client/viewer 노출을 바꾸지 않음 |
| UI-036 | `/ops/rules` VLM Rule suggestion draft workflow | 필요 | 필요 | 안정화, UI | VLM rule draft 후보 refresh/kind filter/`폼에 적용`이 이벤트 템플릿 form draft만 채우고, 기존 저장 버튼 전에는 `/lab/analysis/rules`/`va-rules` write, 자동 Rule/Profile 적용, runtime/provider 호출이 발생하지 않음 |
| UI-037 | `/ops/events` Event Action and Incident Workflow | 필요 | 필요 | 안정화, UI | incident status/id/action target control이 `new`, `review-needed`, `acknowledged`, `in-progress`, `closed`, `false-positive`를 Ops review state에 저장하고 events audit trail에 `incident-action-update`로 표시되며 EventRecord/Event POST/metadata/media path와 client/viewer 노출을 바꾸지 않음 |
| UI-038 | `/ops/events` Alert Dry-run and Delivery Attempt Log | 필요 | 필요 | 안정화, UI | alert target draft의 dry-run button이 payload preview와 dry-run result를 표시하고 delivery attempt log에 `dry-run`/`externalDeliveryPerformed=false`를 남기며 endpoint secret과 Event POST payload를 노출하지 않음 |
| UI-039 | `/ops/events` Semantic Incident Search | 필요 | 필요 | 안정화, UI | 검색 입력, rule/source/incident status/time filter, `memorySearch` 결과, matched evidence highlight가 `/ops/events`에 Ops-only로 표시되고 primary nav/client/viewer에는 노출되지 않음 |
| UI-040 | `/ops/events` Incident Timeline Graph | 필요 | 필요 | 안정화, UI | source state → EventRecord → operator action → alert dry-run → close state graph가 `/ops/events`에 Ops-only로 표시되고 graph node/edge가 source URL/raw/debug/provider material 없이 연결됨 |
| UI-041 | `/ops/events` Explainable Incident Brief | 필요 | 필요 | 안정화, UI | action/object/context/environment slot 기반 brief가 `/ops/events`에 Ops-only로 표시되고 VLM enrichment는 default-off, provider call 없음, client/viewer 노출 없음으로 표시됨 |
| UI-042 | `/ops/events` Similar Incident Lookup | 필요 | 필요 | 안정화, UI | rule/scenario/source/status/action target 기반 similar incident lookup group이 `/ops/events`에 Ops-only로 표시되고 raw JSON/source URL/debug/provider material 없이 deterministic score와 explanation term만 표시됨 |
| UI-043 | `/ops/events` Redacted Incident Evidence Bundle | 필요 | 필요 | 안정화, UI | `/ops/events` evidence action이 raw signed bundle과 별도로 release-safe bundle 버튼을 제공하고 redacted manifest-only export 경계를 표시함 |
| UI-044 | `/ops/events` Semantic Incident Memory UI 풀테스트 준비 기준 | 필요 | 필요 | 안정화, UI | semantic search, timeline graph, explainable brief, similar lookup, release-safe bundle을 route/control/action 단위 UI 풀테스트 기준으로 분리하고 자동 smoke나 raw JSON/API-only 확인을 UI PASS로 쓰지 않음 |
| UI-045 | `/ops/events` VLM Summary Candidate Review | 필요 | 필요 | 안정화, UI | VLM summary candidate review panel이 `media-server.ops.vlm-summary-candidate-review.v1` wrapper, candidate count, matched terms, manual review route를 Ops-only로 표시하고 client/viewer에는 노출되지 않음 |
| UI-046 | `/ops/events` Incident-to-rule suggestion review | 필요 | 필요 | 안정화, UI | Event review row가 matching VLM rule suggestion을 `media-server.ops.incident-rule-suggestion-review.v1` 카드로 표시하고 `/ops/rules` draft-only manual save route로만 연결함 |
| UI-047 | `/ops/sources` ONVIF credential gate | 필요 | 필요 | 안정화, UI | ONVIF probe draft tool이 `media-server.onvif-credential-binding-gate.v1` gate status를 표시하고 secret input/reference echo 없이 source:write/reference-only/store-off 경계를 보여줌 |
| UI-048 | `/ops/dashboard` Runtime dashboard trend card | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 page-session-only sample로 runtime baseline/sparkline 후보, delta, longrun evidence 아님 상태를 운영 card에 표시하고 persistent trend store를 만들지 않음 |
| UI-049 | `/ops/rules` ReEntry cross-zone review control | 필요 | 필요 | 안정화, UI | ReEntry `configured-zones` 기준이 source zone A 이탈 후 `reEntryZoneIds` destination B 진입 후보임을 select/summary/review copy로 표시하고 event/schema/media/client 경계를 바꾸지 않음 |
| UI-050 | `/ops/events` Incident Triage Board | 필요 | 필요 | 안정화, UI | `/ops/events`가 priority/review state/source/rule/scenario/similar incident/VLM candidate 기준의 lane/filter/sort board를 `media-server.ops.incident-triage-board.v1`로 표시하고 client/viewer에는 노출하지 않음 |
| UI-051 | `/ops/events` Incident Decision Scorecard | 필요 | 필요 | 안정화, UI | `/ops/events`가 EventRecord/source health/similar incident/VLM summary/rule candidate/operator review age를 deterministic priority reason chip으로 표시하고 provider 호출/raw JSON/source URL 노출 없이 Ops-only로 유지함 |
| UI-052 | `/ops/events` Operational Action Pack | 필요 | 필요 | 안정화, UI | `/ops/events`가 release-safe evidence bundle, `/ops/rules` draft route, alert dry-run, source health recheck dry-run을 한 action pack card로 표시하고 외부 실제 발송/자동 rule write 없이 Ops-only로 유지함 |
| UI-053 | `/ops/events` Rule What-if Preview | 필요 | 필요 | 안정화, UI | `/ops/events`가 selected incident/EventRecord와 rule suggestion 후보를 저장 전 condition preview/draft comparison으로 표시하고 `/ops/rules` draft-only 수동 저장 경로로만 연결하며 full replay engine/자동 저장/자동 적용 없이 Ops-only로 유지함 |
| UI-054 | `/ops/events` Operator Outcome Memory | 필요 | 필요 | 안정화, UI | `/ops/events`가 accept/dismiss/review-needed outcome과 기존 Ops review/audit 상태를 deterministic history hint로 표시하고 새 저장소/자동 학습/client viewer 노출 없이 Ops-only로 유지함 |
| UI-055 | `/ops/events` Incident Action Readiness Queue | 필요 | 필요 | 안정화, UI | `/ops/events`가 operator 승인 가능한 follow-up 후보를 ready/blocked/field-smoke-needed/not-run 상태로 분리해 표시하고 외부 실제 발송, 자동 action write, EventRecord/Event POST/WebRTC/SSE/WS/media path 변경 없이 Ops-only로 유지함 |
| UI-056 | `/ops/rules` Approval-gated Rule Draft Readiness | 필요 | 필요 | 안정화, UI | `/ops/rules`가 incident/rule suggestion 후보를 approval state, validation summary, staged draft context로 표시하고 수동 저장 전 Rule/Profile registry write, 자동 저장, 자동 적용을 만들지 않음 |
| UI-057 | `/ops/events` Evidence Intake and Field Readiness | 필요 | 필요 | 안정화, UI | `/ops/events`가 redacted evidence intake, source health recheck, field smoke precondition을 passed/failed/blocked/not-run으로 구분하고 credential/source/raw/debug material을 노출하지 않음 |
| UI-058 | `/ops/events` Runtime Evidence Window | 필요 | 필요 | 안정화, UI | `/ops/events` incident detail이 bounded runtime/source/event evidence window를 Ops-only로 표시하되 장기 저장소, 30분/120분 evidence, client/viewer exposure를 만들지 않음 |
| UI-059 | `/ops/events` V300 Event Evidence Search UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 V300 Feature/Search Index 기반의 search/detail UI를 Ops-only로 표시하고 evidence timeline, feature reasons, retry action, pin status, retention status를 source URL/raw provider/debug/client exposure 없이 보여줌 |
| UI-060 | `/ops/events` V310 Replay Timeline UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 EventRecord evidence refs 기반 event frame, representative image, frame bundle, encoded clip timeline과 FrameRef/PTS mapping을 Ops-only로 표시하고 source URL/raw JSON/debug/client exposure 없이 유지함 |
| UI-061 | `/ops/events` V310 Operator Feature Correction | 필요 | 필요 | 안정화, UI | `/ops/events`가 correctedFeatureLabel, featureAliases, reanalysisRequested/reanalysisReason control과 summary card를 Ops-only로 표시하고 기존 review 저장 버튼으로 event review state에만 반영하며 client/viewer에는 노출하지 않음 |
| UI-062 | V320 Step 3 Unified Ops Events Workspace UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v320-unified-events-workspace.v1` 기반 resolution queue, resolution detail, resolution timeline을 한 작업공간으로 표시하고 source URL/raw JSON/debug/client exposure 없이 유지함 |
| UI-063 | V320 Step 4 Evidence Quality Layer UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v320-evidence-quality.v1` 기반 evidence completeness, deterministic confidence, replay coverage hint를 unified resolution detail 안에 표시하고 source URL/raw JSON/debug/client exposure 없이 유지함 |
| UI-064 | V320 Step 5 Source Reliability Context UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v320-source-reliability-context.v1` 기반 source health, recent failure, operator recheck hint를 unified resolution detail 안에 표시하고 source URL/raw JSON/debug/client exposure/source registry write 없이 유지함 |
| UI-065 | V320 Step 6 AI Review Quality Context UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v320-ai-review-quality-context.v1` 기반 correction/review signal, uncertainty reason, quality badge를 unified resolution detail 안에 표시하고 source URL/raw JSON/debug/client exposure/provider call 없이 유지함 |
| UI-066 | V320 Step 7 Operator Resolution Flow UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v320-operator-resolution-flow.v1` 기반 assignment target, operator note, close/reopen 가능 상태, audit trail을 unified resolution detail 안에 표시하고 source URL/raw JSON/debug/client exposure 없이 유지함 |
| UI-067 | V320 Step 8 Action Readiness Checklist UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v320-action-readiness-checklist.v1` 기반 readiness status, rule draft, evidence bundle, notification readiness checklist와 blocker chip을 unified resolution detail 안에 표시하고 자동 action write, external delivery, source URL/raw JSON/debug/client exposure 없이 유지함 |
| UI-068 | V320 Step 9 Client-safe Resolution Digest UI | 필요 | 필요 | 안정화, UI | `/client/live`, `/client/dashboard`, `/client/events`가 `media-server.client.resolution-digest.v1` 기반 resolutionStatus/resolutionLabel/summaryText/severity/timelineHint/time만 표시하고 source URL/raw JSON/debug/provider/operator note/action control을 노출하지 않음 |
| UI-069 | V320 Step 10 Resolution Search & Metrics UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v320-resolution-search-metrics.v1` 기반 active resolution filters, saved view presets, operations metric summary를 unified resolution detail 안에 표시하고 saved view write/source URL/raw JSON/debug/client exposure 없이 유지함 |
| UI-070 | V330 Step 5 Incident-to-Source Correlation UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v330-incident-source-correlation.v1` 기반 source cause, closure impact, source handoff를 unified resolution detail 안에 표시하고 source URL/raw JSON/debug/client exposure 없이 유지함 |
| UI-071 | V330 Step 6 Operator Recheck and Recovery Queue UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v330-operator-recheck-recovery-queue.v1` 기반 failed-only recheck, retry candidate, recovery checklist, dry-run result, operator note link를 unified resolution detail 안에 표시하고 source URL/raw JSON/debug/client exposure/자동 recovery 없이 유지함 |
| UI-072 | V330 Step 7 Client-safe Source Status Digest UI | 필요 | 필요 | 안정화, UI | `/client/live`, `/client/dashboard`, `/client/events`가 `media-server.client.source-status-digest.v1` 기반 sourceStatus/connectionStatus/videoFrameStatus/metadataStatus/summaryText/severity/timelineHint만 표시하고 source URL/raw locator/raw JSON/debug/credential/operator material/action control을 노출하지 않음 |

## B. Auth, Account, Role, Scope

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| AUTH-001 | auth mode `auto` | 간접 | 필요 | 안정화 | users/admin 상태별 setup/login/role gate 결정 일치 |
| AUTH-002 | auth mode `off` 개발/검증 모드 | 비대상 | 필요 | 안정화 | dev principal만 허용되고 제품 기본값으로 문서화되지 않음 |
| AUTH-003 | auth mode `token` | 비대상 | 필요 | 안정화 | bearer principal과 scope guard가 계약대로 동작 |
| AUTH-004 | auth mode `session` | 간접 | 필요 | 안정화, UI | login cookie 기반 보호 route 접근/차단 확인 |
| AUTH-005 | users file 없음 또는 admin passwordHash 없음 시 setup 유도 | 필요 | 필요 | 안정화, UI | `/setup` redirect와 bootstrap 후 `/login` redirect 확인 |
| AUTH-006 | 기본 admin username `admin` | 필요 | 필요 | 안정화, UI | setup/login/user 화면에서 기본 admin 정책 일치 |
| AUTH-007 | passwordless admin login 금지 | 필요 | 필요 | 안정화, UI | 빈 password 또는 hash 없는 admin으로 login 불가 |
| AUTH-008 | password hash 저장 | 비대상 | 필요 | 안정화 | 평문/단순 hash 저장 없음 |
| AUTH-009 | password history 저장 | 비대상 | 필요 | 안정화 | reuse rejection에 필요한 history가 저장/검증됨 |
| AUTH-010 | token hash 저장 | 비대상 | 필요 | 안정화 | token 원문이 저장/API 응답에 노출되지 않음 |
| AUTH-011 | invite token hash 저장 | 비대상 | 필요 | 안정화 | invite token 원문 저장/API 노출 없음 |
| AUTH-012 | passwordHash API/UI 비노출 | 비대상 | 필요 | 안정화, UI | API 응답과 admin/user UI에 hash가 보이지 않음 |
| AUTH-013 | passwordHistory API/UI 비노출 | 비대상 | 필요 | 안정화, UI | API 응답과 admin/user UI에 history가 보이지 않음 |
| AUTH-014 | tokenHash API/UI 비노출 | 비대상 | 필요 | 안정화, UI | API 응답과 UI에 tokenHash가 보이지 않음 |
| AUTH-015 | invite tokenHash API/UI 비노출 | 비대상 | 필요 | 안정화, UI | invite list/detail에 hash가 보이지 않음 |
| AUTH-016 | session cookie 로그인 | 간접 | 필요 | 안정화, UI | cookie 세션으로 role landing과 logout이 동작 |
| AUTH-017 | 현재 사용자 whoami 조회 | 간접 | 필요 | 안정화 | username/role/scopes/view scope가 세션과 일치 |
| AUTH-018 | 사용자 생성 | 필요 | 필요 | 안정화, UI | `/ops/users`에서 create 성공과 validation 확인 |
| AUTH-019 | 사용자 수정 | 필요 | 필요 | 안정화, UI | role/scope/status 수정 후 목록/detail 반영 |
| AUTH-020 | 사용자 삭제 또는 비활성화 | 필요 | 필요 | 안정화, UI | disable/delete action 후 login/access 차단 |
| AUTH-021 | 사용자 활성화 | 필요 | 필요 | 안정화, UI | disabled user restore 후 의도된 접근 복구 |
| AUTH-022 | 사용자 비밀번호 초기화 | 필요 | 필요 | 안정화, UI | reset은 password history 우회가 아님을 확인하고, reset 성공 시 must-change/password flow와 session revoke 확인 |
| AUTH-023 | 마지막 admin 비활성화 방지 | 필요 | 필요 | 안정화, UI | 마지막 admin disable/role change가 거부 copy를 표시 |
| AUTH-024 | role: admin | 필요 | 필요 | 안정화, UI | ops/users/rules/sources 접근과 admin action 허용 |
| AUTH-025 | role: operator | 필요 | 필요 | 안정화, UI | ops 운영 범위 접근과 admin-only action 차단 |
| AUTH-026 | role: viewer | 필요 | 필요 | 안정화, UI | client만 접근, ops/lab 차단 |
| AUTH-027 | role: integrator | 필요 | 필요 | 안정화, UI | API/scope 중심 접근과 제품 UI 경계 확인 |
| AUTH-028 | scope: ops 읽기 | 간접 | 필요 | 안정화, UI | read-only route/API 허용, write action 차단 |
| AUTH-029 | scope: ops 쓰기 | 간접 | 필요 | 안정화, UI | permitted write action만 성공 |
| AUTH-030 | scope: client/view 접근 | 간접 | 필요 | 안정화, UI | assigned view만 client 화면에 표시 |
| AUTH-031 | scope: lab 읽기 | 비대상 | 필요 | 안정화 | lab API read guard가 scope와 일치 |
| AUTH-032 | scope: lab 쓰기 | 비대상 | 필요 | 안정화 | lab API write guard가 scope와 일치 |
| AUTH-033 | 초대 생성 | 필요 | 필요 | 안정화, UI | invite 생성 UI/API 성공, 원문 token 기록 금지 |
| AUTH-034 | 초대 수락 | 필요 | 필요 | 안정화, UI | invite setup 후 login/client 접근 확인 |
| AUTH-035 | 초대 만료/무효 처리 | 간접 | 필요 | 안정화, UI | expired/consumed token이 거부됨 |
| AUTH-036 | client 접근 요청 생성 | 필요 | 필요 | 안정화, UI | public request 제출 후 pending 상태 확인 |
| AUTH-037 | client 접근 요청 승인 | 필요 | 필요 | 안정화, UI | approve 후 invite/view scope 생성 확인 |
| AUTH-038 | client 접근 요청 거절 | 필요 | 필요 | 안정화, UI | reject 후 invite/session/view scope 미생성 확인 |
| AUTH-039 | 승인 전 client self-signup scope 미부여 | 간접 | 필요 | 안정화, UI | pending 상태에서 user/session/view 접근 없음 |
| AUTH-040 | route guard | 간접 | 필요 | 안정화, UI | role별 보호 route 접근/차단이 브라우저와 API에서 일치 |
| AUTH-041 | API 권한 guard | 비대상 | 필요 | 안정화 | unauthorized/forbidden status와 payload redaction 확인 |
| AUTH-042 | CORS / origin guard | 비대상 | 필요 | 안정화 | 허용되지 않은 origin이 차단됨 |

## C. Channel, Source, Published View

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| SRC-001 | file source 등록 | 필요 | 필요 | 안정화, UI | file source form save 후 목록/view에서 사용 가능 |
| SRC-002 | RTSP pull source 등록 | 필요 | 필요 | 안정화, UI, 30분 | RTSP URL 저장, health/session 지속성 확인 |
| SRC-003 | HTTP/HLS URI source 등록 | 필요 | 필요 | 안정화, UI, 30분 | URI 저장, 재생/health 상태 확인 |
| SRC-004 | external WHEP playback URL source 등록 | 필요 | 필요 | 안정화, UI, 30분 | WHEP URL 저장, client wrapper session 생성/삭제, WHEP source sample ready 확인 |
| SRC-005 | internal WHIP published source 등록 | 필요 | 필요 | 안정화, UI, 30분 | WHIP publish sourceId가 view/source registry에 반영 |
| SRC-006 | source 목록 조회 | 필요 | 필요 | 안정화, UI | 목록 row/count/status가 API와 일치 |
| SRC-007 | source 상세 조회 | 필요 | 필요 | 안정화, UI | detail panel/route가 source fields를 표시 |
| SRC-008 | source 생성 | 필요 | 필요 | 안정화, UI | create validation, 빈 채널 이름 거부, 성공 row 반영 |
| SRC-009 | source 수정 | 필요 | 필요 | 안정화, UI | edit save 후 변경 값 반영 |
| SRC-010 | source 삭제 | 필요 | 필요 | 안정화, UI | delete 후 목록/view 참조 정리 확인 |
| SRC-011 | source 활성/비활성 상태 | 필요 | 필요 | 안정화, UI | disabled source가 view/session/rule에서 차단됨 |
| SRC-012 | source health 조회 | 필요 | 필요 | 안정화, UI, 30분 | health status가 dashboard/list와 V240-S04 client-safe source health summary에 반영 |
| SRC-013 | source health bulk 조회 | 간접 | 필요 | 안정화 | bulk response schema와 status 집계 확인 |
| SRC-014 | ONVIF import draft | 필요 | 필요 | 안정화, UI | no-device 경계와 실기기 endpoint 조건을 안정화/UI 기록 안에서 분리하고 V230-S04 `verify-v230-conditional-field-evidence`에서 approved environment only, redacted field report, not-run is not PASS 경계를 확인 |
| SRC-015 | channel bulk API | 비대상 | 필요 | 안정화 | 제품 `/ops/sources`에는 channel bulk UI가 없어야 정상이며, `/ops/api/channels/bulk` payload/schema/status/partial failure/rollback/retry 계약이 `verify-ops-channel-bulk`에서 통과 |
| SRC-016 | PublishedView 목록 조회 | 필요 | 필요 | 안정화, UI | view 목록/count/scope 표시 확인 |
| SRC-017 | PublishedView 생성 | 필요 | 필요 | 안정화, UI | create 후 client/viewer scope에서 선택 가능 |
| SRC-018 | PublishedView 수정 | 필요 | 필요 | 안정화, UI | source/rule/scope 변경 후 반영 |
| SRC-019 | PublishedView 삭제 | 필요 | 필요 | 안정화, UI | 삭제 후 client view와 session 접근 차단 |
| SRC-020 | PublishedView 활성/비활성 | 필요 | 필요 | 안정화, UI | inactive view가 client/rule/session에서 차단 |
| SRC-021 | View별 source 연결 | 필요 | 필요 | 안정화, UI | view-source mapping이 client live에 반영 |
| SRC-022 | View별 allowed rule list | 필요 | 필요 | 안정화, UI | PublishedView `allowedRuleIds`가 client list/detail API에 유지되고 허용 rule만 client session/metadata에 반영 |
| SRC-023 | View별 viewer 접근 범위 | 필요 | 필요 | 안정화, UI | viewer별 assigned view만 노출 |
| SRC-024 | View별 WebRTC client wrapper | 간접 | 필요 | 안정화, UI, 30분 | wrapper session 생성/종료와 media path 확인 |
| SRC-025 | View별 dashboard | 필요 | 필요 | 안정화, UI | view-scoped dashboard가 assigned data만 표시 |
| SRC-026 | View별 events | 필요 | 필요 | 안정화, UI | view-scoped events가 assigned data만 표시 |
| SRC-027 | View별 metadata | 간접 | 필요 | 안정화 | metadata endpoint/schema가 view scope와 일치 |
| SRC-028 | Client preview as admin 표시 | 필요 | 필요 | UI | admin client 화면에 preview 상태가 명확히 표시 |
| SRC-029 | viewer에게 source URL 비노출 | 필요 | 필요 | 안정화, UI | client 화면/API에 source URL이 보이지 않음 |
| SRC-030 | viewer에게 developer URL 비노출 | 필요 | 필요 | 안정화, UI | client 화면에 Developer URL이 보이지 않음 |
| SRC-031 | ONVIF credential binding/store gate | 간접 | 필요 | 안정화, UI | `/ops/api/onvif/import-draft`가 `credentialGate` summary만 반환하고 `source:write` guard, URL credential reject, SourceRegistry/PublishedView secret field 비저장을 유지함 |
| SRC-032 | Evidence intake source health readiness | 간접 | 필요 | 안정화, UI | v2.8.0 evidence intake가 source health recheck 준비 상태를 표시하되 source registry write, credential 원문 저장, external endpoint 성공 보장, Event POST/WebRTC/SSE/WS/media path 변경을 만들지 않음 |
| SRC-033 | V330 Step 2 Source Registry Snapshot and Identity | 비대상 | 필요 | 안정화 | 비대상: 제품 UI 없어야 정상. `/ops/api/source-registry/snapshot`이 sourceId, source kind, PublishedView 연결, canonical source key, owner/site/group context를 Ops-only read model로 반환하고 source registry/PublishedView write와 viewer/client 노출을 만들지 않음 |
| SRC-034 | V330 Step 3 Source Onboarding Quality Summary | 필요 | 필요 | 안정화, UI | `/ops/api/source-registry/onboarding-quality`과 `/ops/sources`가 채널 저장 전 validation, 중복/충돌/누락/ready 상태, ONVIF/WHEP/RTSP 입력 품질 요약을 표시하고 raw locator/credential/client exposure/source registry write를 만들지 않음 |
| SRC-035 | V330 Step 4 Reliability Timeline and Health History | 필요 | 필요 | 안정화, UI | `/ops/api/source-registry/reliability-timeline`과 `/ops/sources`가 live/stale/offline/reconnect/source warning 변화 이력과 Ops audit 연결을 표시하고 raw locator/credential/client exposure/source registry write를 만들지 않음 |
| SRC-036 | V330 Step 5 Incident-to-Source Correlation source context | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews`의 incidentSourceCorrelation이 기존 sourceReliability와 source-health-state-change audit handoff만 읽어 source 원인/context를 연결하고 raw locator/credential/client exposure/source registry write를 만들지 않음 |
| SRC-037 | V330 Step 6 Operator Recheck and Recovery source context | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews`의 operatorRecheckRecoveryQueue가 기존 sourceReliability와 incidentSourceCorrelation만 읽어 failed-only source recheck와 retry candidate를 요약하고 raw locator/credential/client exposure/source registry write를 만들지 않음 |
| SRC-038 | V330 Step 7 client-safe source status context | 필요 | 필요 | 안정화, UI | `/client/api/views/{id}/events`와 client dashboard payload가 PublishedView-scoped source/tap 상태만 읽어 source status와 connection health를 요약하고 source URL/raw locator/credential/client scope 외 노출/source registry write를 만들지 않음 |

## D. Rule, Profile, Scenario, Tracker

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| RULE-001 | `/ops/rules` VA rule/channel analysis setting 목록 | 필요 | 필요 | 안정화, UI | list count/status/source/type/profile이 표시됨 |
| RULE-002 | `/ops/rules` event template 목록 | 필요 | 필요 | 안정화, UI | template 목록과 type/scenario summary 표시 |
| RULE-003 | `/ops/rules` analysis profile 목록 | 필요 | 필요 | 안정화, UI | profile 목록과 detector/FPS/tracking summary 표시 |
| RULE-004 | channel analysis setting 생성 | 필요 | 필요 | 안정화, UI | source/template/profile/geometry 선택 후 저장 성공 |
| RULE-005 | channel analysis setting 수정 | 필요 | 필요 | 안정화, UI | 변경 값 저장 후 list/detail 반영 |
| RULE-006 | channel analysis setting 삭제 | 필요 | 필요 | 안정화, UI | 삭제 후 allowed rule/session에서 제거 |
| RULE-007 | channel analysis setting 상세 보기 | 필요 | 필요 | 안정화, UI | detail에 source/template/profile/geometry/status 표시 |
| RULE-008 | channel analysis setting apply/active 상태 | 필요 | 필요 | 안정화, UI | active/inactive 전환과 적용 상태 반영 |
| RULE-009 | channel analysis setting source 선택 | 필요 | 필요 | 안정화, UI | source select와 validation 동작 |
| RULE-010 | channel analysis setting event template 연결 | 필요 | 필요 | 안정화, UI | template 선택과 저장 payload 반영 |
| RULE-011 | channel analysis setting analysis profile 연결 | 필요 | 필요 | 안정화, UI | profile 선택과 저장 payload 반영 |
| RULE-012 | channel analysis setting region geometry 설정 | 필요 | 필요 | 안정화, UI | polygon/region 값 입력/초기화/저장 |
| RULE-013 | channel analysis setting line geometry 설정 | 필요 | 필요 | 안정화, UI | line points/direction 입력/저장 |
| RULE-014 | channel analysis setting output URL 표시 | 필요 | 필요 | UI | output URL/copy 표시가 role 정책과 일치 |
| RULE-015 | channel analysis setting status 표시 | 필요 | 필요 | 안정화, UI | status badge/copy가 runtime/API와 일치 |
| RULE-016 | vaRule numeric id 자동 생성 | 필요 | 필요 | 안정화, UI | 사용자가 직접 id 입력하지 않고 다음 번호가 부여 |
| RULE-017 | vaRule id 직접 입력 방지 | 필요 | 필요 | 안정화, UI | id field가 노출/수정되지 않음 |
| RULE-018 | event template 생성 | 필요 | 필요 | 안정화, UI | basic/scenario template 생성 성공 |
| RULE-019 | event template 수정 | 필요 | 필요 | 안정화, UI | type/condition 변경 저장 후 반영 |
| RULE-020 | event template 삭제 | 필요 | 필요 | 안정화, UI | 삭제 후 참조 rule validation 확인 |
| RULE-021 | event template 상세 보기 | 필요 | 필요 | 안정화, UI | condition/geometry/cooldown summary 표시 |
| RULE-022 | analysis profile 생성 | 필요 | 필요 | 안정화, UI | detector/FPS/queue/input/tracker 설정 저장 |
| RULE-023 | analysis profile 수정 | 필요 | 필요 | 안정화, UI | profile field 변경 후 반영 |
| RULE-024 | analysis profile 삭제 | 필요 | 필요 | 안정화, UI | 삭제 후 참조 rule validation 확인 |
| RULE-025 | analysis profile 상세 보기 | 필요 | 필요 | 안정화, UI | detector/FPS/queue/tracker/Re-ID 표시 |
| RULE-026 | detector: YOLO/ONNX | 필요 | 필요 | 안정화, UI | detector 선택과 payload 저장 |
| RULE-027 | detector: dummy | 필요 | 필요 | 안정화, UI | dummy detector 선택과 payload 저장 |
| RULE-028 | profile FPS 설정 | 필요 | 필요 | 안정화, UI | numeric input validation과 저장 |
| RULE-029 | profile queue 설정 | 필요 | 필요 | 안정화, UI | queue input validation과 저장 |
| RULE-030 | profile confidence 설정 | 필요 | 필요 | 안정화, UI | confidence range validation과 저장 |
| RULE-031 | profile NMS 설정 | 필요 | 필요 | 안정화, UI | NMS range validation과 저장 |
| RULE-032 | profile input size 설정 | 필요 | 필요 | 안정화, UI | width/height validation과 저장 |
| RULE-033 | profile tracking category 표시 | 필요 | 필요 | UI | tracking category summary가 선택 값과 일치 |
| RULE-034 | tracker `none` | 필요 | 필요 | 안정화, UI | tracker none 저장과 Re-ID off 정책 확인 |
| RULE-035 | tracker `lite` | 필요 | 필요 | 안정화, UI, 30분 | lite 저장과 runtime 안정성 확인 |
| RULE-036 | tracker `kalman-lite` | 필요 | 필요 | 안정화, UI, 30분 | kalman-lite 저장과 runtime 안정성 확인 |
| RULE-037 | tracker `bytetrack` | 필요 | 필요 | 안정화, UI, 30분 | bytetrack 저장과 runtime 안정성 확인 |
| RULE-038 | Re-ID `off` | 필요 | 필요 | 안정화, UI | Re-ID off 저장과 metadata policy 확인 |
| RULE-039 | Re-ID `assist` | 필요 | 필요 | 안정화, UI, 30분 | assist 저장과 tracker 조합 정책 확인 |
| RULE-040 | `tracker=none`이면 Re-ID off 강제 또는 거부 | 필요 | 필요 | 안정화, UI | invalid 조합이 저장되지 않거나 off로 정규화 |
| RULE-041 | basic event: presence | 필요 | 필요 | 안정화, UI | template 생성과 최종 EventRecord `presence` 발생 이력 확인 |
| RULE-042 | basic event: enter | 필요 | 필요 | 안정화, UI | template 생성과 최종 EventRecord `enter` 발생 이력 확인 |
| RULE-043 | basic event: exit | 필요 | 필요 | 안정화, UI | template 생성과 최종 EventRecord `exit` 발생 이력 확인 |
| RULE-044 | basic event: line-crossing | 필요 | 필요 | 안정화, UI | line geometry/direction 저장과 최종 EventRecord `line-crossing` 발생 이력 확인 |
| RULE-045 | line direction: any | 필요 | 필요 | 안정화, UI | any direction 저장과 적용 확인 |
| RULE-046 | line direction: forward | 필요 | 필요 | 안정화, UI | forward 저장과 적용 확인 |
| RULE-047 | line direction: reverse | 필요 | 필요 | 안정화, UI | reverse 저장과 적용 확인 |
| RULE-048 | scenario: intrusion-dwell | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `intrusion-dwell` 발생 이력 확인 |
| RULE-049 | scenario: re-entry | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `re-entry` 발생 이력 확인 |
| RULE-050 | scenario: wrong-direction | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `wrong-direction` 발생 이력 확인 |
| RULE-051 | scenario: intrusion-after-line-crossing | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `intrusion-after-line-crossing` 발생 이력 확인 |
| RULE-052 | scenario: loitering | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `loitering` 발생 이력 확인 |
| RULE-053 | scenario: zone-occupancy | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `zone-occupancy` 발생 이력 확인 |
| RULE-054 | scenario preset: default | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-055 | scenario preset: road | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-056 | scenario preset: retail | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-057 | scenario preset: park | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-058 | scenario preset: indoor | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-059 | scenario preset: lobby | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-060 | scenario preset: platform | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-061 | scenario preset: entrance | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-062 | scenario preset: doorway | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-063 | scenario preset: parking | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-064 | scenario preset: elevator | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-065 | scenario preset: custom | 필요 | 필요 | 안정화, UI | custom value 입력과 저장 확인 |
| RULE-066 | intrusion-dwell zone 설정 | 필요 | 필요 | 안정화, UI | zone geometry 저장과 payload 반영 |
| RULE-067 | intrusion-dwell candidate time 설정 | 필요 | 필요 | 안정화, UI | candidateTime validation과 저장 |
| RULE-068 | intrusion-dwell dwell time 설정 | 필요 | 필요 | 안정화, UI | dwellTime validation과 저장 |
| RULE-069 | intrusion-dwell cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-070 | re-entry polygon zone 설정 | 필요 | 필요 | 안정화, UI | polygon zone 저장 |
| RULE-071 | re-entry window 설정 | 필요 | 필요 | 안정화, UI | reEntryWindow validation과 저장 |
| RULE-072 | re-entry cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-073 | wrong-direction line geometry 설정 | 필요 | 필요 | 안정화, UI | line geometry 저장 |
| RULE-074 | wrong-direction allowed direction 설정 | 필요 | 필요 | 안정화, UI | allowed direction에서 `any` 제외 정책 확인 |
| RULE-075 | wrong-direction cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-076 | intrusion-after-line-crossing trigger line 설정 | 필요 | 필요 | 안정화, UI | trigger line 저장 |
| RULE-077 | intrusion-after-line-crossing crossing direction 설정 | 필요 | 필요 | 안정화, UI | any/forward/reverse 저장 |
| RULE-078 | intrusion-after-line-crossing target zone 설정 | 필요 | 필요 | 안정화, UI | target zone 저장 |
| RULE-079 | intrusion-after-line-crossing max delay 설정 | 필요 | 필요 | 안정화, UI | maxDelayAfterCrossingMs validation과 저장 |
| RULE-080 | intrusion-after-line-crossing dwell 설정 | 필요 | 필요 | 안정화, UI | dwell validation과 저장 |
| RULE-081 | intrusion-after-line-crossing cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-082 | loitering target zone 설정 | 필요 | 필요 | 안정화, UI | target zone 저장 |
| RULE-083 | loitering min dwell 설정 | 필요 | 필요 | 안정화, UI | min dwell validation과 저장 |
| RULE-084 | loitering movement radius 설정 | 필요 | 필요 | 안정화, UI | radius validation과 저장 |
| RULE-085 | loitering trajectory points 설정 | 필요 | 필요 | 안정화, UI | min points validation과 저장 |
| RULE-086 | loitering cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-087 | loitering ground-plane 옵션 | 필요 | 필요 | 안정화, UI | `/ops/rules` loitering form의 ground-plane toggle이 표시되고 `scenario.useGroundPlaneMovementRadius` 저장/재조회에 반영 |
| RULE-088 | zone-occupancy target zone 설정 | 필요 | 필요 | 안정화, UI | target zone 저장 |
| RULE-089 | zone-occupancy threshold 설정 | 필요 | 필요 | 안정화, UI | threshold validation과 저장 |
| RULE-090 | zone-occupancy min dwell 설정 | 필요 | 필요 | 안정화, UI | min dwell validation과 저장 |
| RULE-091 | zone-occupancy cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-092 | duplicate id 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` validation panel이 VA rule/event template/profile 중복 ID를 표시하고, 서버 create API가 기존 event template/VA rule ID 재생성을 거부 |
| RULE-093 | missing template/profile 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` 저장 전 missing profile과 missing template을 각각 차단하고, 서버가 `analysis.profileId`/`templateStart.ruleId` missing reference 저장을 거부 |
| RULE-094 | inactive template/profile 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` 저장 전 inactive profile과 inactive template을 각각 차단하고, 서버가 inactive `analysis.profileId`/`templateStart.ruleId` 저장을 거부 |
| RULE-095 | source mismatch 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` validation matrix가 source mismatch를 표시하고, mismatched PublishedView `va-rule` session apply가 `vaRule source must match PublishedView source`로 거부 |
| RULE-096 | inactive channel/View 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` validation matrix가 inactive channel/view를 표시하고, inactive PublishedView와 inactive source의 `va-rule` session apply가 각각 404로 거부 |
| RULE-097 | client view 권한 없음 검증 | 필요 | 필요 | 안정화, UI | viewer가 권한 없는 rule/view를 보지 못함 |
| RULE-098 | va-rule not allowed 검증 | 필요 | 필요 | 안정화, UI | source는 일치하지만 PublishedView `allowedRuleIds` 밖인 VA rule이 `/ops/rules`에서 표시되고 client `va-rule` session이 `allowed vaRule is required for va-rule mode`로 거부 |
| RULE-099 | existing connection allowed rule 검증 | 간접 | 필요 | 안정화, 30분 | 연결 생성 후 PublishedView `allowedRuleIds`에서 해당 rule을 제거해도 기존 client session ICE/DELETE는 200으로 유지되고, 같은 rule의 신규 `va-rule` session은 `allowed vaRule is required for va-rule mode`로 거부 |
| RULE-100 | same channel/priority conflict 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` validation matrix가 `priority-conflict`를 표시하고, 같은 source+priority의 두 번째 VA rule 저장 API가 `vaRule priority conflicts with existing rule on same source`로 거부 |
| RULE-101 | class mismatch 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` 저장 전 검증이 profile/template class mismatch를 쓰기 없이 차단하고, 서버가 `analysis.classes`/profile classes가 template classes를 포함하지 않는 VA rule 저장을 각각 거부 |
| RULE-102 | Rule/Scenario 저장 전 review loop | 필요 | 필요 | 안정화, UI | `/ops/rules` 상세 편집기가 저장 전 예상 event type, conflict, missing reference, scenario preset 영향, `/ops/events` EventRecord coverage link를 표시하고, `verify-rule-ui` 인앱 evidence `v240-s05-rule-scenario-review-loop`와 `verify-ops-rule-validation-matrix`가 확인 |
| RULE-103 | re-entry cross-zone A→B 후보 | 필요 | 필요 | 안정화, UI | 저장 scenario payload의 `reEntryMode=configured-zones`와 `reEntryZoneIds`가 runtime ReEntryScenario source/destination zone 후보로 반영되고 기본 `same-zone` 동작과 event type `re-entry`는 유지 |
| RULE-104 | approval-gated staged rule draft 후보 | 필요 | 필요 | 안정화, UI | incident/rule suggestion 후보가 approval state와 validation summary를 가진 staged draft로만 표시되고 기존 저장 버튼 전에는 Rule/Profile registry write, 자동 적용, full replay execution, Event POST/WebRTC/SSE/WS/media path 변경을 만들지 않음 |

## E. Runtime, Dashboard, Events

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| EVT-001 | ops runtime status 조회 | 필요 | 필요 | 안정화, UI, 30분 | runtime status가 dashboard/home에 반영되고 drift 없음 |
| EVT-002 | lab runtime status 조회 | 비대상 | 필요 | 안정화, 30분 | lab runtime API schema와 counters 확인 |
| EVT-003 | ops source health 표시 | 필요 | 필요 | 안정화, UI, 30분 | source health list/dashboard 표시가 상태와 일치 |
| EVT-004 | ops diagnostics log tail | 필요 | 필요 | 안정화, UI | log tail 표시와 redaction 확인 |
| EVT-005 | event post status | 간접 | 필요 | 안정화 | event POST status schema와 실패/성공 상태 확인 |
| EVT-006 | event storage status | 간접 | 필요 | 안정화, 30분 | storage status/counters 안정성 확인 |
| EVT-007 | event records 조회 | 필요 | 필요 | 안정화, UI | `/ops/events` rows/filter/pagination/archive 상태가 표시되고 최종 rule/scenario별 EventRecord 발생 이력과 대조됨 |
| EVT-008 | event records compact | 비대상 | 필요 | 안정화 | compaction command/API 결과와 artifact 확인 |
| EVT-009 | event records compaction 목록 | 비대상 | 필요 | 안정화 | compaction list schema 확인 |
| EVT-010 | event records compaction cleanup | 비대상 | 필요 | 안정화 | cleanup 정책과 삭제 결과 확인 |
| EVT-011 | event records compaction file 조회 | 비대상 | 필요 | 안정화 | file fetch와 redaction 확인 |
| EVT-012 | evidence bundle token 발급 | 비대상 | 필요 | 안정화 | signed/limited token 발급과 원문 노출 없음 |
| EVT-013 | evidence bundle 조회 | 비대상 | 필요 | 안정화 | bundle 다운로드/권한/만료 확인 |
| EVT-014 | evidence 조회 | 간접 | 필요 | 안정화 | evidence metadata/file access 정책 확인 |
| EVT-015 | evidence 삭제 | 비대상 | 필요 | 안정화 | retention/delete 정책 확인 |
| EVT-016 | ops events status | 필요 | 필요 | 안정화, UI | events status panel/API 일치 |
| EVT-017 | alert deliveries 조회 | 필요 | 필요 | 안정화, UI | `/ops/events` Alert Delivery list에서 검색/kind/status filter와 empty filter 상태를 표시 |
| EVT-018 | alert delivery test | 필요 | 필요 | 안정화, UI | `/ops/events` Alert Delivery에서 integration 저장 후 Fixture/test action을 클릭하면 최근 시도에 `delivered · fixture`가 표시되고 endpoint token은 redacted 상태로 유지 |
| EVT-019 | Operator event review 목록 | 필요 | 필요 | 안정화, UI | review inbox list가 EventRecord와 별도 review state를 함께 표시 |
| EVT-020 | Operator event review 상세 | 필요 | 필요 | 안정화, UI | event list/detail, evidence refs, review status, operator note 표시 |
| EVT-021 | Operator event review 상태/action 저장 | 필요 | 필요 | 안정화, UI | status/classification/note/false-positive 또는 VLM action target 저장과 audit 반영 |
| EVT-022 | audit log 조회 | 필요 | 필요 | 안정화, UI | audit list/filter/export 표시 |
| EVT-023 | dashboard event 요약 | 필요 | 필요 | 안정화, UI | event summary count/status와 V240-S04 viewer-safe incident summary가 raw/debug/source locator 없이 표시 |
| EVT-024 | dashboard runtime 요약 | 필요 | 필요 | 안정화, UI, 30분 | runtime summary가 장시간 drift 없이 유지 |
| EVT-025 | dashboard source/channel 요약 | 필요 | 필요 | 안정화, UI | source/channel summary count/status 표시 |
| EVT-026 | dashboard VA 상태 요약 | 필요 | 필요 | 안정화, UI, 30분 | VA status/tap/event summary 표시와 안정성 확인 |
| EVT-027 | VLM event evidence refs extraction | 비대상 | 필요 | 안정화 | EventRecord `metadata.vlmEvidenceRefs`가 snapshot, bbox crop, clip manifest, previous/event/next frame refs를 reference-only로 제공하고 raw media/source URL/credential 노출 없음 |
| EVT-028 | VLM Ops event review evidence panel | 필요 | 필요 | 안정화, UI | `/ops/events` review inbox가 EventRecord, snapshot/short clip evidence, VLM explanation, false-positive hints, operator questions를 Ops 전용으로 표시하고 viewer/client 비노출, Event POST/WebRTC/SSE/WS schema와 media path 불변 확인 |
| EVT-029 | VLM evidence availability runtime state | 비대상 | 필요 | 안정화 | EventRecord review item이 snapshot, bbox crop, clip, previous/event/next frame ref 존재 여부를 상태값으로 제공하되 raw media/source URL/credential은 노출하지 않음 |
| EVT-030 | VLMObservation sidecar correlation state | 필요 | 필요 | 안정화, UI | sidecar observation은 `eventId`로만 EventRecord와 상관되고 Ops review UI는 matching/missing 상태를 표시하며 EventRecord top-level schema는 변경하지 않음 |
| EVT-031 | VLM explanation/hint review state | 필요 | 필요 | 안정화, UI | summary, eventExplanation, falsePositiveHints, operatorReviewQuestions가 Ops review 상태에 표시되고 provider raw response/prompt는 표시하지 않음 |
| EVT-032 | VLM summary search candidate state | 비대상 | 필요 | 안정화 | summary search 후보는 sidecar summary와 EventRecord `eventId` correlation만 사용하고 제품 검색 UI, vector index, provider rerank는 만들지 않음 |
| EVT-033 | VLM rule suggestion candidate state | 비대상 | 필요 | 안정화 | line/intrusion/zone rule suggestion 후보는 manual review 상태로만 산출하고 rule/profile registry write와 auto-apply는 발생하지 않음 |
| EVT-034 | VLM runtime disabled/queue readiness state | 비대상 | 필요 | 안정화 | profile/recommendation 상태가 runtime disabled, missing model, queue not started를 명확히 표시하고 media path나 Event POST dispatch를 block하지 않음 |
| EVT-035 | VLM review action state correlation | 간접 | 필요 | 안정화 | `media-server.ops.vlm-review-action-state.v1`은 Ops review state에서 `eventId`로만 EventRecord와 상관되고 EventRecord top-level payload나 Event POST payload에 action field를 추가하지 않음 |
| EVT-036 | VLM rule suggestion draft correlation state | 간접 | 필요 | 안정화, UI | `media-server.vlm-rule-suggestion-draft-workflow.v1`은 V200-S13 sidecar candidate를 `sourceCandidateReport`로만 참조하고 EventRecord/Event POST/WebRTC/SSE/WS payload에 draft field를 추가하지 않음 |
| EVT-037 | Event Action and Incident Workflow state | 필요 | 필요 | 안정화, UI | `media-server.ops.incident-action-state.v1`은 Ops review JSONL/audit에만 저장되고 `eventId`/`incidentId`로 EventRecord와 상관되며 EventRecord top-level payload나 Event POST payload에 incident/action field를 추가하지 않음 |
| EVT-038 | Alert dry-run payload preview and delivery attempt log state | 필요 | 필요 | 안정화, UI | `media-server.ops.alert-delivery-dry-run.v1`과 `media-server.ops.alert-delivery-payload-preview.v1`은 Ops alert delivery attempt JSONL/audit에만 남고 Event POST payload, EventRecord, WebRTC/SSE/WS metadata에 섞이지 않음 |
| EVT-039 | Event/incident text projection document | 비대상 | 필요 | 안정화 | `media-server.incident-text-projection.v1` 문서가 EventRecord, Ops audit, source health, alert dry-run을 searchable text/terms로 투영하고 Event POST/WebRTC/SSE/WS/media path payload를 변경하지 않음 |
| EVT-040 | Local incident memory search index state | 비대상 | 필요 | 안정화 | `media-server.incident-memory-index.v1` report가 SQLite FTS5 primary와 JSONL+BM25 fallback을 분리하고 동일 projection documents에 대해 deterministic query result parity를 보장함 |
| EVT-041 | Ops incident memory search view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `media-server.ops.incident-memory-search-view.v1` `memorySearch`가 `q`, rule/source/status/time filter, matched terms, highlight fragments를 제공하되 model/provider dependency와 client/viewer exposure를 만들지 않음 |
| EVT-042 | Ops incident timeline graph view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `media-server.ops.incident-timeline-graph.v1` `timelineGraph`가 source-state/event-record/operator-action/alert-dry-run/close-state node와 edge를 제공하되 EventRecord/Event POST payload와 client/viewer exposure를 바꾸지 않음 |
| EVT-043 | Ops explainable incident brief view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `media-server.ops.explainable-incident-brief.v1` `incidentBrief`가 action/object/context/environment slot과 provider enrichment default-off 상태를 제공하되 EventRecord/Event POST payload와 client/viewer exposure를 바꾸지 않음 |
| EVT-044 | Ops similar incident lookup view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `media-server.ops.similar-incident-lookup.v1` `similarIncidents`가 rule/scenario/source/status/action target 기반 deterministic score와 explanation terms를 제공하되 EventRecord/Event POST payload와 client/viewer exposure를 바꾸지 않음 |
| EVT-045 | Redacted incident evidence bundle export | 비대상 | 필요 | 안정화 | `/lab/analysis/events/evidence/bundle-token`과 `/lab/analysis/events/evidence/bundle`이 `releaseSafe=1` token binding과 `media-server.v250.redacted-incident-evidence-bundle.v1` manifest-only export를 제공하되 기존 raw evidence bundle mode를 release-safe PASS로 대체하지 않음 |
| EVT-046 | Ops VLM summary candidate review view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `memorySearch.vlmSummaryCandidateReview`가 기존 `media-server.vlm-summary-search-candidates.v1`를 `sourceCandidateReport`로 감싸고 EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출을 바꾸지 않음 |
| EVT-047 | Ops incident-to-rule suggestion review view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` item의 `incidentRuleSuggestionReview`가 matching sidecar `ruleSuggestion`과 기존 candidate report를 Ops-only wrapper로 감싸고 EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출을 바꾸지 않음 |
| EVT-048 | dashboard runtime baseline/sparkline summary | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `/ops/api/runtime/status`, source health, events status 응답을 page-local sample로 요약해 baseline 대비 delta와 sparkline 후보를 표시하고 Event POST/WebRTC/SSE/WS payload, RTSP/WebRTC media path, client API를 바꾸지 않음 |
| EVT-049 | ScenarioEngine cross-zone re-entry candidate | 필요 | 필요 | 안정화, UI | A zone 이탈 후 B zone 진입 replay가 기존 `re-entry` EventRecord 후보를 만들고 Event POST/WebRTC/SSE/WS payload, RTSP/WebRTC media path, client API를 바꾸지 않음 |
| EVT-050 | Ops incident triage board view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `incidentTriageBoard`가 기존 EventRecord/review/VLM candidate 상태를 Ops-only board card로 요약하고 EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출을 바꾸지 않음 |
| EVT-051 | Ops incident decision scorecard view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `incidentDecisionScorecard`가 EventRecord/source health/similar/VLM/review age 근거를 deterministic priority reason으로 요약하고 EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출을 바꾸지 않음 |
| EVT-052 | Ops operational action pack view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `operationalActionPack`이 release-safe bundle/rule draft/alert dry-run/source health recheck 수동 workflow link를 요약하고 EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출을 바꾸지 않음 |
| EVT-053 | Ops rule what-if preview view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `ruleWhatIfPreview`가 selected incident/EventRecord와 matching rule suggestion 후보의 condition preview/draft comparison/manual draft route를 요약하고 EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출을 바꾸지 않음 |
| EVT-054 | Ops operator outcome memory view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `operatorOutcomeMemory`가 기존 review state의 accept/dismiss/review-needed 결과와 audit action reference를 deterministic history hint로 요약하고 EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출을 바꾸지 않음 |
| EVT-055 | Ops incident action readiness queue view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 또는 후속 Ops API가 follow-up 후보를 ready/blocked/field-smoke-needed/not-run으로 요약하되 EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출을 바꾸지 않음 |
| EVT-056 | Ops approval-gated rule draft readiness state | 필요 | 필요 | 안정화, UI | staged rule draft readiness가 approval state와 validation summary만 제공하고 EventRecord top-level, Event POST/WebRTC/SSE/WS payload, Rule/Profile registry 자동 write를 만들지 않음 |
| EVT-057 | Ops evidence intake field readiness view model | 필요 | 필요 | 안정화, UI | evidence intake/field readiness 상태가 passed/failed/blocked/not-run을 분리하고 credential/source/raw/debug/provider material을 EventRecord/Event POST/WebRTC/SSE/WS/client에 노출하지 않음 |
| EVT-058 | Ops runtime evidence window view model | 필요 | 필요 | 안정화, UI | incident-linked runtime/source/event evidence window가 bounded summary만 제공하고 장기 저장소, 30분/120분 PASS, Event POST/WebRTC/SSE/WS/media path/client viewer 변경을 만들지 않음 |
| EVT-059 | V310-S02 encoded event clip encoder pipeline | 비대상 | 필요 | 안정화 | EventRecord frame-bundle clip hook이 bounded short segment에서 WebM/VP8 encoded clip media artifact와 `media-server.encoded-event-clip-contract.v1` runtime manifest를 생성하고, FrameRef-PTS mapping/frameMap/queueName/status/non-VMS boundary/partial cleanup 결과를 남기며 EventRecord top-level, Event POST/WebRTC/SSE/WS payload, RTSP/WebRTC media path를 바꾸지 않음 |
| EVT-060 | V300-S02 frame bundle extraction sidecar | 비대상 | 필요 | 안정화 | EventRecord recorder가 trigger-time eventFrame, representativeImage selection status, bboxCrop reference, pre/event/post frameBundle manifest, EvidenceManifest sidecar를 생성하고 FrameRef를 source/channel/stream epoch/frame/time/relative event 기준으로 남기며 EventRecord top-level, Event POST/WebRTC/SSE/WS payload, RTSP/WebRTC media path를 바꾸지 않음 |
| EVT-061 | V310-S06 operator feature correction state | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews`가 correctedFeatureLabel, featureAliases, reanalysisRequested/reanalysisReason을 기존 Ops review JSONL에만 저장하고 operatorFeatureCorrection view model로 요약하되 EventRecord top-level, Event POST/WebRTC/SSE/WS payload, RTSP/WebRTC media path, Rule/Profile payload를 바꾸지 않음 |
| EVT-062 | V310-S08 encoded clip lifecycle cleanup | 비대상 | 필요 | 안정화 | retention cleanup plan이 encoded clip manifest/media를 EventRecord, EvidenceManifest, FeatureSet revision, SearchIndex와 같은 lifecycle group으로 묶고 pinned event 자동 cleanup 제외, dry-run/apply audit, Event POST/WebRTC/SSE/WS payload, RTSP/WebRTC media path 불변 조건을 유지함 |
| EVT-063 | V320 Step 2 resolution state contract | 비대상 | 필요 | 안정화 | `/ops/api/events/reviews`가 `media-server.ops.resolution-state.v1`로 resolutionStatus/resolutionReason/resolution.transition, close/reopen lifecycle, resolution note/timestamps를 Ops review JSONL에만 저장하고 EventRecord top-level, Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-064 | V320 Step 3 unified resolution workspace view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `unifiedResolutionWorkspace`가 기존 EventRecord와 Ops review resolution state를 resolution queue/detail/timeline view model로 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-065 | V320 Step 4 evidence quality view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `unifiedResolutionWorkspace.evidenceQuality`가 EventRecord evidence refs와 Ops review state만 읽어 evidence completeness, confidence, replay coverage hint를 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-066 | V320 Step 5 source reliability view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `unifiedResolutionWorkspace.sourceReliability`가 SourceRegistry source health snapshot과 EventRecord source identifier만 읽어 source health, recent failure context, operator recheck hint를 요약하고, `verify-v320-source-reliability-runtime-sample`이 fixture EventRecord item의 개별 `sourceReliability` 런타임 샘플을 확인하며 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-067 | V320 Step 6 AI review quality view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `unifiedResolutionWorkspace.aiReviewQuality`가 기존 Ops review state와 EventRecord evidence/source context만 읽어 correction/review signal, uncertainty reason, quality badge를 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-068 | V320 Step 7 operator resolution flow view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` write path와 응답의 `unifiedResolutionWorkspace.operatorResolutionFlow`가 기존 Ops review JSONL과 audit log만 사용해 assignment target, note presence, close/reopen availability, audit actions를 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-069 | V320 Step 8 action readiness checklist view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `unifiedResolutionWorkspace.actionReadinessChecklist`가 기존 EventRecord evidence refs, source reliability, AI review quality, operator resolution flow만 읽어 rule draft/evidence bundle/notification readiness와 blocker를 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-070 | V320 Step 10 resolution search metrics view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `unifiedResolutionWorkspace.resolutionSearchMetrics`가 기존 EventRecord, Ops review, v3.2 context만 읽어 active filters, saved view matches, 운영 metric summary를 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-071 | V330 Step 5 incident source correlation view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `unifiedResolutionWorkspace.incidentSourceCorrelation`이 기존 resolution detail, sourceReliability, source health audit handoff만 읽어 source cause/closure impact/correlation signal을 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-072 | V330 Step 6 operator recheck recovery queue view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `unifiedResolutionWorkspace.operatorRecheckRecoveryQueue`가 기존 resolution detail, sourceReliability, incidentSourceCorrelation, operator note 상태만 읽어 failed-only recheck/retry candidate/recovery checklist/dry-run status/operator note link를 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |

## F. Client And Viewer

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| CLIENT-001 | viewer live view 목록 조회 | 필요 | 필요 | 안정화, UI | assigned view만 source tree에 표시 |
| CLIENT-002 | viewer live WebRTC session 생성 | 필요 | 필요 | 안정화, UI, 30분 | tile start 후 video/status/session 생성 확인 |
| CLIENT-003 | viewer live SDP answer 처리 | 간접 | 필요 | 안정화, 30분 | answer exchange와 session state 확인 |
| CLIENT-004 | viewer live ICE candidate 처리 | 간접 | 필요 | 안정화, 30분 | ICE candidate 처리와 media path 확인 |
| CLIENT-005 | viewer live session 종료 | 필요 | 필요 | 안정화, UI, 30분 | stop/reconnect/logout 후 session cleanup 확인 |
| CLIENT-006 | viewer dashboard 조회 | 필요 | 필요 | 안정화, UI | dashboard가 viewer scope 안의 data와 V240-S04 event/status/source health/incident summary만 표시 |
| CLIENT-007 | viewer events 조회 | 필요 | 필요 | 안정화, UI | events와 client-safe summary가 viewer scope 안의 data만 표시 |
| CLIENT-008 | viewer metadata 조회 | 간접 | 필요 | 안정화 | metadata schema와 scope filtering 확인 |
| CLIENT-009 | live layout preference 저장 | 필요 | 필요 | 안정화, UI | grid/density/dock preference 저장 |
| CLIENT-010 | live layout preference 조회 | 필요 | 필요 | 안정화, UI | reload 후 preference 복원 |
| CLIENT-011 | viewer 권한 없는 view 숨김 | 필요 | 필요 | 안정화, UI | unassigned view가 목록/API/UI에 보이지 않음 |
| CLIENT-012 | viewer에게 Ops navigation 숨김 | 필요 | 필요 | 안정화, UI | client shell에 Ops nav 없음 |
| CLIENT-013 | viewer에게 Lab navigation 숨김 | 필요 | 필요 | 안정화, UI | client shell에 Lab nav 없음 |
| CLIENT-014 | viewer에게 raw JSON 비노출 | 필요 | 필요 | 안정화, UI | raw JSON/debug details가 client에 보이지 않음 |
| CLIENT-015 | viewer에게 debugCounters 비노출 | 필요 | 필요 | 안정화, UI | debug counters가 client에 보이지 않음 |
| CLIENT-016 | viewer에게 BBox diagnostics 비노출 | 필요 | 필요 | 안정화, UI | bbox diagnostics가 client에 보이지 않음 |
| CLIENT-017 | viewer에게 rule/profile editor 비노출 | 필요 | 필요 | 안정화, UI | editor controls가 client에 보이지 않음 |
| CLIENT-018 | admin client preview 표시 | 필요 | 필요 | UI | admin preview banner/state 표시 |
| CLIENT-019 | video viewport 표시 | 필요 | 필요 | UI, 30분 | video viewport가 재생되고 잘리지 않음 |
| CLIENT-020 | video control 표시 | 필요 | 필요 | UI | start/stop/reconnect/control 조작 확인 |
| CLIENT-021 | VA overlay 표시 | 필요 | 필요 | 안정화, UI, 30분 | overlay toggle/status/metadata 일치 |
| CLIENT-022 | status/caption 표시 | 필요 | 필요 | UI | caption/status와 V240-S04 live selected-tile client-safe status summary가 viewport를 가리지 않고 표시 |
| CLIENT-023 | Client-safe incident digest API/UI | 필요 | 필요 | 안정화, UI | `/client/api/views/{id}/events`와 client dashboard/events/live dock이 `media-server.client.incident-digest.v1` digest를 viewer-safe 요약으로 표시하고 source locator/raw evidence/debug/provider material을 포함하지 않음 |
| CLIENT-024 | Client-safe follow-up digest API/UI | 필요 | 필요 | 안정화, UI | viewer 할당 PublishedView 범위 안에서 follow-up status/severity/time만 `media-server.client.follow-up-digest.v1` 후보로 표시하고 source URL, raw evidence, debug material, provider material, rule editor/action controls를 노출하지 않음 |
| CLIENT-025 | V310-S04 Client-safe event digest API/UI | 필요 | 필요 | 안정화, UI | viewer 할당 PublishedView 범위 안에서 event summaryText/eventType/status/severity/timelineHint/time만 `media-server.client.event-digest.v1`로 표시하고 source URL, raw evidence, debug material, provider material, feature provenance, encoded clip path, rule editor/action controls를 노출하지 않음 |
| CLIENT-026 | V310-S05 Scoped Integrator Search API | 비대상 | 필요 | 안정화 | UI가 없어야 정상인 integrator-only API입니다. integrator role과 `event:read:{viewId}` scope가 있는 API client만 `/client/api/views/{id}/events/search`를 호출할 수 있고, 결과는 eventId/viewId와 digest summaryText/eventType/status/severity/timelineHint/time만 포함하며 source URL/raw evidence/debug/provider/feature provenance/encoded clip path/rule/action controls를 노출하지 않음 |
| CLIENT-027 | V320 Step 9 Client-safe resolution digest API/UI | 필요 | 필요 | 안정화, UI | viewer 할당 PublishedView 범위 안에서 resolutionStatus/resolutionLabel/summaryText/severity/timelineHint/time만 `media-server.client.resolution-digest.v1`로 표시하고 source URL, raw evidence, debug material, provider material, feature provenance, internal evidence, operator note, rule editor/action controls를 노출하지 않음 |
| CLIENT-028 | V330 Step 7 Client-safe source status digest API/UI | 필요 | 필요 | 안정화, UI | viewer 할당 PublishedView 범위 안에서 sourceStatus/connectionStatus/videoFrameStatus/metadataStatus/summaryText/severity/timelineHint/lastFrameAgeMs/metadataAgeMs만 `media-server.client.source-status-digest.v1`로 표시하고 source URL, raw locator, raw JSON, debug material, credential material, operator material, rule editor/action controls를 노출하지 않음 |

## G. Media And Streaming

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| MEDIA-001 | RTSP egress | 비대상 | 필요 | 안정화, 30분, 120분 | RTSP playback/session이 안정적으로 유지 |
| MEDIA-002 | generic WebRTC session | 비대상 | 필요 | 안정화, 30분, 120분 | generic session SDP/ICE/delete 계약 유지 |
| MEDIA-003 | WHEP session | 비대상 | 필요 | 안정화, 30분, 120분 | WHEP offer/answer/session lifecycle 유지 |
| MEDIA-004 | WHIP publish session | 비대상 | 필요 | 안정화, 30분, 120분 | WHIP publish/source registry lifecycle 유지 |
| MEDIA-005 | WebRTC SDP offer 생성 | 비대상 | 필요 | 안정화 | offer response schema와 codec/ICE 정보 확인 |
| MEDIA-006 | WebRTC SDP answer 수신 | 비대상 | 필요 | 안정화 | answer 처리와 session state 확인 |
| MEDIA-007 | WebRTC ICE candidate 수신 | 비대상 | 필요 | 안정화 | candidate 처리와 invalid payload guard 확인 |
| MEDIA-008 | WebRTC session 삭제 | 비대상 | 필요 | 안정화, 30분 | delete 후 cleanup/counter 감소 확인 |
| MEDIA-009 | WHIP published source registry | 간접 | 필요 | 안정화, 30분 | publish source가 registry/view에 반영되고 cleanup됨 |
| MEDIA-010 | external WHEP playback source | 간접 | 필요 | 안정화, 30분 | WHEP source registry와 session wrapper 확인 |
| MEDIA-011 | shared stream reuse | 비대상 | 필요 | 안정화, 30분, 120분 | 다중 session이 source worker를 재사용 |
| MEDIA-012 | source worker lifecycle | 비대상 | 필요 | 안정화, 30분, 120분 | start/stop/reconnect 후 worker leak 없음 |
| MEDIA-013 | stream registry | 비대상 | 필요 | 안정화, 30분 | registry add/remove/counter 일치 |
| MEDIA-014 | RTSP TCP 강제 옵션 | 비대상 | 필요 | 안정화 | TCP 옵션 적용과 기존 path 유지 |
| MEDIA-015 | codec capability | 비대상 | 필요 | 안정화 | codec capability response와 negotiation 유지 |
| MEDIA-016 | H.264 sample playback | 필요 | 필요 | 안정화, UI, 30분 | sample 영상 표시. 단, 모든 VA 이벤트 검증으로 쓰지 않음 |
| MEDIA-017 | multi-channel playback | 필요 | 필요 | 안정화, UI, 30분 | 여러 tile/channel 동시 재생과 layout 안정성 확인 |
| MEDIA-018 | media path와 metadata path 분리 | 비대상 | 필요 | 안정화, 30분 | metadata 실패가 media path를 막지 않음 |
| MEDIA-019 | DataChannel metadata 송신 | 간접 | 필요 | 안정화, 30분 | metadata schema와 delivery 확인 |
| MEDIA-020 | WebRTC media 실패와 DataChannel 실패 분리 | 비대상 | 필요 | 안정화, 30분 | 한 경로 실패가 다른 경로 실패로 전파되지 않음 |
| MEDIA-021 | External TURN/WHEP credential boundary | 비대상 | 필요 | 안정화 | V230-S04 `verify-v230-conditional-field-evidence`와 `media-server.external-turn-whep-field-gate-report.v1`이 external TURN relay/auth와 external WHEP playback 상태를 not-run/blocked/failed/passed로 분리하고, 기본 release PASS와 local ICE/UI/longrun PASS로 대체하지 않음을 확인 |

## H. Lab, Development API, Metadata

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| LAB-001 | `/lab/analysis/capabilities` 조회 | 비대상 | 필요 | 안정화 | capabilities schema 확인 |
| LAB-002 | lab analysis profile 목록 | 비대상 | 필요 | 안정화 | profile list schema 확인 |
| LAB-003 | lab analysis profile 생성 | 비대상 | 필요 | 안정화 | create API schema/validation 확인 |
| LAB-004 | lab analysis profile 수정 | 비대상 | 필요 | 안정화 | update API schema/validation 확인 |
| LAB-005 | lab analysis profile 삭제 | 비대상 | 필요 | 안정화 | delete API와 reference cleanup 확인 |
| LAB-006 | lab analysis rule 목록 | 비대상 | 필요 | 안정화 | rule list schema 확인 |
| LAB-007 | lab analysis rule 생성 | 비대상 | 필요 | 안정화 | create API schema/validation 확인 |
| LAB-008 | lab analysis rule 수정 | 비대상 | 필요 | 안정화 | update API schema/validation 확인 |
| LAB-009 | lab analysis rule 삭제 | 비대상 | 필요 | 안정화 | delete API와 reference cleanup 확인 |
| LAB-010 | lab va-rule 목록 | 비대상 | 필요 | 안정화 | va-rule list schema 확인 |
| LAB-011 | lab va-rule 생성 | 비대상 | 필요 | 안정화 | create API schema/validation 확인 |
| LAB-012 | lab va-rule 수정 | 비대상 | 필요 | 안정화 | update API schema/validation 확인 |
| LAB-013 | lab va-rule 삭제 | 비대상 | 필요 | 안정화 | delete API와 reference cleanup 확인 |
| LAB-014 | analysis image endpoint | 비대상 | 필요 | 안정화 | image endpoint response/redaction 확인 |
| LAB-015 | metadata stream | 비대상 | 필요 | 안정화, 30분 | SSE metadata stream schema와 지속성 확인 |
| LAB-016 | WS VA metadata `/ws/va-metadata` | 비대상 | 필요 | 안정화, 30분 | WS schema와 지속성 확인 |
| LAB-017 | analysis tap 목록 | 비대상 | 필요 | 안정화 | tap list schema 확인 |
| LAB-018 | analysis tap 생성 | 비대상 | 필요 | 안정화 | tap create API와 source/rule 연결 확인 |
| LAB-019 | analysis tap 삭제 | 비대상 | 필요 | 안정화 | tap cleanup 확인 |
| LAB-020 | tap metadata stream | 비대상 | 필요 | 안정화, 30분 | tap stream schema와 지속성 확인 |
| LAB-021 | tap metadata endpoint | 비대상 | 필요 | 안정화 | tap metadata schema 확인 |
| LAB-022 | tap bbox diagnostics | 비대상 | 필요 | 안정화 | diagnostics schema와 redaction 확인 |
| LAB-023 | tap state dump | 비대상 | 필요 | 안정화 | state dump schema와 redaction 확인 |
| LAB-024 | tap metrics dump | 비대상 | 필요 | 안정화 | metrics schema 확인 |
| LAB-025 | tap events | 비대상 | 필요 | 안정화 | tap event list/schema 확인 |
| LAB-026 | tap snapshot jpg | 비대상 | 필요 | 안정화 | jpg response/content-type 확인 |
| LAB-027 | tap overlay jpg | 비대상 | 필요 | 안정화 | overlay response/content-type 확인 |
| LAB-028 | global metadata endpoint | 비대상 | 필요 | 안정화 | global metadata schema 확인 |
| LAB-029 | global bbox diagnostics | 비대상 | 필요 | 안정화 | diagnostics schema와 redaction 확인 |
| LAB-030 | global state dump | 비대상 | 필요 | 안정화 | state schema와 redaction 확인 |
| LAB-031 | global metrics dump | 비대상 | 필요 | 안정화 | metrics schema 확인 |
| LAB-032 | lab files 조회 | 비대상 | 필요 | 안정화 | lab files listing schema 확인 |
| LAB-033 | lab reports 조회 | 비대상 | 필요 | 안정화 | report list schema 확인 |
| LAB-034 | lab report content 조회 | 비대상 | 필요 | 안정화 | report content fetch와 path guard 확인 |
| LAB-035 | VLM PC capability detector | 비대상 | 필요 | 안정화 | `media-server.vlm-pc-capability.v1` schema, macOS/Linux fixture, missing-tool fixture, no recommendation/install/runtime-call boundary, loopback-only probe 확인 |
| LAB-036 | VLM recommendation engine | 비대상 | 필요 | 안정화 | `media-server.vlm-recommendation.v1` schema, low/standard/high/unsupported fixture, local-only/cloud-disabled/cloud-allowed policy, recommendation/alternative/not-recommended/resource estimate, no install/profile/runtime-call/sidecar boundary 확인 |
| LAB-037 | VLM install/connection dry-run contract | 비대상 | 필요 | 안정화 | `media-server.vlm-install-connection-dry-run.v1` schema, local/cloud/unsupported/missing-runtime/cloud-opt-in fixture, dry-run-only side-effect false invariant, no profile/runtime-call/sidecar/cloud-provider-call boundary 확인 |
| LAB-038 | VLM profile storage API contract | 비대상 | 필요 | 안정화 | `media-server.vlm-profile.v1` schema, `/ops/api/vlm/profiles` CRUD, invalid profile fixture, provider/model/runtime/prompt/evaluation/activation/runtimeContract validation, `verify-v230-vlm-opt-in-operational-evidence`의 operator-approved profile promotion/default-off boundary, no runtime-call/sidecar/schema/media path boundary 확인 |
| LAB-039 | VLM evaluation harness fixture report | 비대상 | 필요 | 안정화 | `media-server.vlm-evaluation-report.v1` schema, event frame/bbox crop/previous-next frame refs, prompt profile A/B, latency/explanation/hallucination/JSON/한국어/영어 scoring, fixture-only no runtime/provider/sidecar/schema/media path boundary 확인 |
| LAB-040 | VLMObservation sidecar storage | 비대상 | 필요 | 안정화 | `media-server.vlm-observation.v1` schema, 별도 JSONL 저장, EventRecord `eventId` correlation report, raw prompt/response/source URL/credential/raw media 비저장, Event POST/WebRTC/SSE/WS schema와 RTSP/WebRTC media path 불변 확인 |
| LAB-041 | VLM event explanation and false-positive hints | 비대상 | 필요 | 안정화 | `media-server.vlm-event-explanation-report.v1` schema, 사람/차량/영역 관계 설명, `falsePositiveHints`, `operatorReviewQuestions`, byte-stable JSON, runtime/provider/client/schema/media path/auto-rule boundary 확인 |
| LAB-042 | VLM privacy transfer guard contract | 비대상 | 필요 | 안정화 | `media-server.vlm-privacy-transfer-guard.v1` schema, local/cloud fixture, external transfer warning, provider logging/retention review, `verify-v230-vlm-opt-in-operational-evidence`의 privacy/default-off evidence, credential/prompt/raw response/source URL/raw frame bytes 비저장 확인 |
| LAB-043 | VLM summary search candidates | 비대상 | 필요 | 안정화 | `media-server.vlm-summary-search-candidates.v1` schema, sidecar summary token 후보, EventRecord `eventId` correlation, excluded candidate/reason, no runtime/provider/client/schema/media path/auto-rule boundary 확인 |
| LAB-044 | VLM Rule suggestion candidates | 비대상 | 필요 | 안정화 | `media-server.vlm-rule-suggestion-candidates.v1` schema, line/intrusion/zone 수동 저장 후보, EventRecord `eventId` correlation, rejected auto-apply candidate, no runtime/provider/client/schema/media path/rule registry write boundary 확인 |
| LAB-045 | VLM boundary contract gate | 비대상 | 필요 | 안정화 | `verify-vlm-boundary`가 VLM을 YOLO 대체가 아닌 이벤트 해석 보조 계층으로 고정하고 Event POST/WebRTC/SSE/WS/media path 불변 조건을 확인 |
| LAB-046 | VLM model selection decision fixture | 비대상 | 필요 | 안정화 | `media-server.vlm-selection-decision.v1`이 1차 local standard, low-spec fallback, cloud opt-in fallback, 제외/조건부 후보와 license/provenance/privacy 판정을 보존 |
| LAB-047 | VLM model artifact/bundle exclusion | 비대상 | 필요 | 안정화 | model weight, runtime package, credential, download token이 repo/release/bundle/container image에 포함되지 않음을 selection/bundle gate가 확인 |
| LAB-048 | VLM PC capability hardware-class matrix | 비대상 | 필요 | 안정화 | Apple Silicon, Linux NVIDIA, CPU-only, missing runtime case가 hardware class만 산출하고 추천/설치/profile/runtime/sidecar 결과를 만들지 않음 |
| LAB-049 | VLM recommendation privacy-mode matrix | 비대상 | 필요 | 안정화 | local-only, cloud-disabled, cloud-allowed별 추천/대안/비추천/resource estimate가 산출되고 cloud 후보는 opt-in 전 실행 가능 상태가 아님 |
| LAB-050 | VLM install dry-run disabled-option matrix | 비대상 | 필요 | 안정화 | unsupported, missing-runtime, cloud-opt-in-required 후보가 disabled reason을 보존하고 install/profile/runtime/provider call side effect를 만들지 않음 |
| LAB-051 | VLM profile invalid-case matrix | 비대상 | 필요 | 안정화 | provider/model/runtime/prompt/evaluation/activation/privacyGuard/runtimeContract invalid profile이 저장 전 거부되고 credential/prompt/raw response/source URL 저장 없음 |
| LAB-052 | VLM evaluation scoring-axis matrix | 비대상 | 필요 | 안정화 | latency, explanation quality, hallucination, JSON stability, Korean/English scoring 축이 fixture report에 분리되고 실제 benchmark PASS로 보고하지 않음 |
| LAB-053 | VLM sidecar JSONL redaction invariant | 비대상 | 필요 | 안정화 | observation JSONL에는 raw prompt, raw provider response, credential, source URL, raw frame bytes가 저장되지 않고 별도 sidecar scope만 유지 |
| LAB-054 | VLM summary search query builder | 비대상 | 필요 | 안정화 | sidecar summary token 후보가 queryTerms, matchedTerms, matchScore, eventId correlation을 산출하되 제품 검색 UI나 external rerank를 만들지 않음 |
| LAB-055 | VLM rule suggestion no-auto-apply builder | 비대상 | 필요 | 안정화 | rule suggestion 후보가 manualSaveRoute와 autoApply=false를 고정하고 `/ops/rules` 수동 저장 전 registry write를 수행하지 않음 |
| LAB-056 | VLM local runtime connection smoke | 비대상 | 필요 | 안정화 | `media-server.vlm-local-runtime-smoke-report.v1`과 `verify-v230-vlm-opt-in-operational-evidence`가 Ollama/vLLM/API-compatible loopback endpoint 연결, missing-runtime, timeout queue cleanup, invalid-output fallback을 실행하고 cloud/provider/model quality/UI/longrun PASS로 과장하지 않음 |
| LAB-057 | VLM cloud provider credential gate | 비대상 | 필요 | 안정화 | `media-server.vlm-cloud-provider-field-smoke-gate-report.v1`과 `verify-v230-vlm-opt-in-operational-evidence`가 `gemini-2.5-flash` provider 후보의 env/manual 승인, credential env-only, not-run/missing-credential/failure/pass 분리, releasePassEligible 판정을 기록하고 기본 gate PASS를 provider PASS로 과장하지 않음 |
| LAB-058 | VLM queue/backpressure stability fixture | 비대상 | 필요 | 안정화, 30분 | `media-server.vlm-queue-backpressure-fixtures.v1`이 default-off, missing-model, invalid-output, timeout, metadata fanout, Event POST dispatch case를 VLM-only failure로 판정하고 media/Event/metadata/Event POST non-blocking 경계를 확인 |
| LAB-059 | VLM evaluation result workflow fixture | 비대상 | 필요 | 안정화 | `media-server.ops.vlm-evaluation-result-workflow.v1`이 1차 선택값, fallback, 제외 사유, latency/JSON/explanation/hallucination/language 품질축, profile draft-only side-effect false invariant를 보존 |
| LAB-060 | VLM review action workflow fixture | 비대상 | 필요 | 안정화 | `media-server.vlm-review-action-workflow-fixtures.v1`이 1차 action, fallback, 제외 사유, action target, license/provenance/privacy/operation 검토, side-effect false invariant를 보존 |
| LAB-061 | VLM rule suggestion draft workflow API/fixture | 비대상 | 필요 | 안정화 | `media-server.vlm-rule-suggestion-draft-workflow.v1` API와 fixture가 V200-S13 후보를 `/ops/rules` draft-only/manual-save contract로 감싸고 sourceCandidateReport, excluded auto-apply count, no runtime/provider/schema/media side-effect를 보존 |
| LAB-062 | Runtime/model bundle RC rehearsal fixture | 비대상 | 필요 | 안정화 | `media-server.runtime-model-bundle-rc-rehearsal-report.v1`이 source-only default, RC-only no-runtime/no-model dry-run 후보, runtime/model/GPL-risk/release asset blocked 후보, hash/provenance/license/source-offer review boundary를 실제 bundle 생성 없이 보존 |
| LAB-063 | Incident text projection fixture smoke | 비대상 | 필요 | 안정화 | `verify-v250-incident-text-projection`이 C++ fixture만 사용해 EventRecord/audit/source health/alert dry-run projection과 deterministic JSON을 검증하고 model/provider/runtime dependency를 만들지 않음 |
| LAB-064 | Incident memory index fixture smoke | 비대상 | 필요 | 안정화 | `verify-v250-incident-memory-index`가 SQLite FTS5 primary, forced JSONL+BM25 fallback, fallback JSONL materialization, query parity, deterministic ordering을 C++ fixture로 검증함 |
| LAB-065 | Incident timeline graph fixture linkage | 비대상 | 필요 | 안정화 | `verify-v250-incident-timeline-graph`가 source-state → event-record → operator-action → alert-dry-run → close-state node/edge와 `auditLinkage`를 fixture/static guard로 검증하고 Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않음 |
| LAB-066 | Explainable incident brief fixture guard | 비대상 | 필요 | 안정화 | `verify-v250-explainable-incident-brief`가 action/object/context/environment slot, VLM default-off, no provider dependency, no Event POST/WebRTC/SSE/WS/media path schema change를 fixture/static guard로 검증함 |
| LAB-067 | Similar incident deterministic scoring fixture | 비대상 | 필요 | 안정화 | `verify-v250-similar-incident-lookup`이 rule/scenario/source/status/action target score weights, deterministic ordering, no provider dependency, no Event POST/WebRTC/SSE/WS/media path schema change를 fixture/static guard로 검증함 |
| LAB-068 | Release-safe incident evidence bundle fixture | 비대상 | 필요 | 안정화 | `verify-v250-redacted-incident-evidence-bundle`이 release-safe manifest schema, token releaseSafe binding, raw evidence file exclusion, searchResults/timelineSummary redaction policy를 fixture/static guard로 검증함 |
| LAB-069 | V260-S01 VLM summary productization fixture/static guard | 비대상 | 필요 | 안정화 | `verify-v260-incident-memory-productization`이 VLM summary candidate wrapper schema, sourceCandidateReport 보존, `/ops/events` UI marker, command/docs/inventory wiring, client/provider/auto-rule 비범위를 정적 검증함 |
| LAB-070 | V260-S02 rule suggestion review static guard | 비대상 | 필요 | 안정화 | `verify-v260-rule-suggestion-review`이 incident-to-rule wrapper schema, matching ruleSuggestion 보존, `/ops/events` UI marker, `/ops/rules` draft-only 링크, command/docs/inventory wiring, client/provider/auto-rule 비범위를 정적 검증함 |
| LAB-071 | V260-S03 ONVIF credential gate static guard | 비대상 | 필요 | 안정화 | `verify-v260-onvif-credential-gate`가 credential binding fixture, provider 선택값, 제외 사유, `/ops/sources` marker, URL credential reject, docs/inventory/command wiring, persistent store 비범위를 정적 검증함 |
| LAB-072 | V260-S04 runtime dashboard trend static guard | 비대상 | 필요 | 안정화 | `verify-v260-runtime-dashboard-trends`가 `/ops/dashboard` trend card marker, page-session-only sample buffer, sparkline rendering, command/docs/inventory wiring, longrun/schema/media/client 비범위를 정적 검증함 |
| LAB-073 | V260-S05 cross-zone re-entry replay/static guard | 비대상 | 필요 | 안정화 | `verify-v260-scenario-cross-zone-reentry`가 ReEntryScenario source/destination 분리, EventRuleEngine parser, analysis-state A→B case, va-replay fixture, UI/docs/inventory wiring, schema/media/client 비범위를 검증함 |
| LAB-074 | V270-S01 incident triage board static guard | 비대상 | 필요 | 안정화 | `verify-v270-incident-triage-board`가 triage board wrapper schema, lane/filter/sort UI marker, priority/review/source/rule/scenario/similar/VLM 기준, command/docs/inventory wiring, client/provider/auto-action 비범위를 정적 검증함 |
| LAB-075 | V270-S02 incident decision scorecard static guard | 비대상 | 필요 | 안정화 | `verify-v270-incident-decision-scorecard`가 decision scorecard wrapper schema, deterministic priority reason chips, EventRecord/source health/similar/VLM/review age 근거, command/docs/inventory wiring, raw/provider/schema/media 비범위를 정적 검증함 |
| LAB-076 | V270-S03 operational action pack static guard | 비대상 | 필요 | 안정화 | `verify-v270-operational-action-pack`이 action pack wrapper schema, release-safe bundle/rule draft/alert dry-run/source health recheck 연결, command/docs/inventory wiring, external delivery/auto rule/schema/media 비범위를 정적 검증함 |
| LAB-077 | V270-S04 rule what-if preview static guard | 비대상 | 필요 | 안정화 | `verify-v270-rule-what-if-preview`가 rule what-if preview wrapper schema, selected incident/rule suggestion condition preview, `/ops/rules` draft-only link, command/docs/inventory wiring, full replay/auto apply/schema/media 비범위를 정적 검증함 |
| LAB-078 | V270-S05 operator outcome memory static guard | 비대상 | 필요 | 안정화 | `verify-v270-operator-outcome-memory`이 operator outcome memory wrapper schema, review state/audit action 기반 deterministic history hint, command/docs/inventory wiring, persistent write/client/schema/media 비범위를 정적 검증함 |
| LAB-079 | V280-S02 incident action readiness queue static guard | 비대상 | 필요 | 안정화 | 후보 `verify-v280-incident-action-readiness-queue`가 readiness queue wrapper schema, ready/blocked/not-run status, command/docs/inventory wiring, external delivery/auto write/schema/media 비범위를 정적 검증해야 함 |
| LAB-080 | V280-S03 approval-gated rule draft static guard | 비대상 | 필요 | 안정화 | 후보 `verify-v280-approval-gated-rule-draft`가 approval state, staged draft, validation summary, command/docs/inventory wiring, auto save/auto apply/full replay/schema/media 비범위를 정적 검증해야 함 |
| LAB-081 | V280-S04 evidence intake field readiness static guard | 비대상 | 필요 | 안정화 | 후보 `verify-v280-evidence-intake-field-readiness`가 redacted intake, source health recheck, field smoke precondition, credential/source/raw redaction, endpoint/credential 미실행 경계를 정적 검증해야 함 |
| LAB-082 | V280-S05 runtime evidence window static guard | 비대상 | 필요 | 안정화 | 후보 `verify-v280-runtime-evidence-window`가 bounded runtime/source/event evidence window, no longrun substitute, no persistent archive, command/docs/inventory wiring을 정적 검증해야 함 |
| LAB-083 | V300-S03 feature schema fixture | 비대상 | 필요 | 안정화 | `verify-v300-feature-schema-privacy`가 `media-server.event-feature-set.v1` fixture의 FeatureSet envelope, allowed namespace feature values, confidence/uncertainty/evidenceRef, raw prompt/response non-retention, disallowed identity feature matrix를 검증하되 VLM runtime/provider call, Search DSL, `/ops/events` UI를 만들지 않음 |
| LAB-084 | V300-S04 VLM feature queue fixture | 비대상 | 필요 | 안정화, 30분 | `verify-v300-vlm-feature-queue`와 `verify-analysis-state`가 background queue, lazy trigger, missing-runtime, queue-timeout, invalid-output outcome과 structured FeatureSet revision을 검증하되 real provider call, Search DSL, `/ops/events` UI를 만들지 않음 |
| LAB-085 | V300-S05 feature-only retention fixture | 비대상 | 필요 | 안정화 | `verify-v300-feature-only-retention`와 `verify-analysis-state`가 FeatureSet revision store, raw prompt/response rejection, reanalysis revision policy, previous revision preservation을 검증하되 Search DSL, Retention/Pin/Cleanup, `/ops/events` UI를 만들지 않음 |
| LAB-086 | V300-S06 search DSL/query convert fixture | 비대상 | 필요 | 안정화 | `verify-v300-search-dsl-query-convert`와 `verify-analysis-state`가 natural language to constrained Search DSL, strict structured output, text/tags/filter matching, identity-query rejection을 검증하되 Feature/Search Index, `/ops/events` UI, vector search를 만들지 않음 |
| LAB-087 | V300-S07 feature/search index fixture | 비대상 | 필요 | 안정화 | `verify-v300-feature-search-index`와 `verify-analysis-state`가 EventRecord, FeatureSet, EvidenceManifest, operator review state projection, latest revision selection, orphan/privacy guard, stale result guard를 검증하되 `/ops/events` UI, vector search, provider rerank를 만들지 않음 |
| LAB-088 | V300-S09 retention/pin/cleanup fixture | 비대상 | 필요 | 안정화 | `verify-v300-retention-pin-cleanup`와 `verify-analysis-state`가 7일 기본 retention, source/rule override, pinned event cleanup 제외, dry-run 후보 산출, apply lifecycle delete/de-index, audit trail을 검증하되 destructive 운영 삭제, UI 풀테스트, 30분/120분을 만들지 않음 |
| LAB-089 | V310-S07 optional vector search fixture | 비대상 | 필요 | 안정화 | `verify-v310-optional-vector-search`와 `verify-analysis-state`가 default-off embedding index, explicit opt-in, quality/dimension gate, face/identity embedding rejection, rebuild stale vector result guard를 검증하되 provider embedding call, 제품 UI, client/viewer 노출을 만들지 않음 |

## I. Safety, Boundary, Invariant Contract

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| SAFE-001 | Event POST payload schema 유지 | 비대상 | 필요 | 안정화 | payload field/type 호환과 freeze baseline SHA-256 유지 |
| SAFE-002 | WebRTC DataChannel schema 유지 | 비대상 | 필요 | 안정화 | 기존 client metadata consumer 호환과 freeze baseline 유지 |
| SAFE-003 | SSE metadata schema 유지 | 비대상 | 필요 | 안정화 | SSE event/schema 호환과 freeze baseline 유지 |
| SAFE-004 | WS metadata schema 유지 | 비대상 | 필요 | 안정화 | WS payload/schema 호환과 freeze baseline 유지 |
| SAFE-005 | 기존 Intrusion event type 유지 | 비대상 | 필요 | 안정화 | existing event type string 유지 |
| SAFE-006 | 기존 LineCrossing event type 유지 | 비대상 | 필요 | 안정화 | existing event type string 유지 |
| SAFE-007 | scenario 판단 로직 유지 | 비대상 | 필요 | 안정화 | replay/scenario fixture 결과 유지 |
| SAFE-008 | RTSP media path 유지 | 비대상 | 필요 | 안정화, 30분 | RTSP playback path 회귀 없음 |
| SAFE-009 | WebRTC media path 유지 | 비대상 | 필요 | 안정화, 30분 | WebRTC playback path 회귀 없음 |
| SAFE-010 | SourceRegistry API 계약 유지 | 비대상 | 필요 | 안정화 | registry schema/semantics 호환과 freeze baseline 유지 |
| SAFE-011 | PublishedView API 계약 유지 | 비대상 | 필요 | 안정화 | view schema/semantics 호환과 freeze baseline 유지 |
| SAFE-012 | Rule/Profile 저장 payload 계약 유지 | 비대상 | 필요 | 안정화 | 저장 payload/schema 호환과 freeze baseline 유지 |
| SAFE-013 | `vaRule=<id>` 호출 정책 유지 | 비대상 | 필요 | 안정화 | allowed rule/session policy 유지 |
| SAFE-014 | media pipeline non-blocking 정책 | 비대상 | 필요 | 안정화, 30분, 120분 | VA/metadata 실패가 media path를 막지 않음 |
| SAFE-015 | lab 개발 UI 제품 화면 embed 금지 | 필요 | 필요 | 안정화, UI | ops/client 제품 화면에 lab editor가 없음 |
| SAFE-016 | undefined route 404 처리 | 간접 | 필요 | 안정화, UI | 정의하지 않은 route가 404 처리됨 |
| SAFE-017 | 구 `/lab` 제품 UI route 404 처리 | 간접 | 필요 | 안정화, UI | `/lab` 구 UI route가 제품 UI로 열리지 않음 |
| SAFE-018 | client/viewer debug 정보 비노출 | 필요 | 필요 | 안정화, UI | client 화면/API에 debug/source/raw 정보 없음 |
| SAFE-019 | auth material 비노출 | 필요 | 필요 | 안정화, UI | password/token/session material이 artifact/UI/API에 없음 |
| SAFE-020 | 운영 UI와 client UI 권한 경계 분리 | 필요 | 필요 | 안정화, UI | ops/client nav, route, action guard가 role별로 분리 |
| SAFE-021 | UI blocking dialog policy | 필요 | 필요 | 안정화, UI | `verify-ui-blocking-dialog-policy`가 native alert/confirm/prompt와 blocking beforeunload 금지, allowlisted read-only dialog, 제품 화면 안 2회 확인 흐름만 허용하는 정책을 확인 |
| SAFE-022 | VLM 설치/연결 UI scope gate | 비대상 | 필요 | 안정화 | `verify-vlm-install-connection-scope-gate`가 Ops-only S04 UI 준비 허용, profile 저장/VLM runtime 호출/sidecar 저장/cloud provider API 호출/schema/media path 변경 금지, viewer/client 비노출 경계를 확인 |
| SAFE-023 | VLM profile 저장 scope gate | 비대상 | 필요 | 안정화 | `verify-vlm-profile-storage`가 S05 profile 저장만 허용하고 VLM runtime 호출, sidecar 저장, cloud provider API 호출, credential/prompt/raw response/source URL 저장, Event/WebRTC/SSE/WS schema와 media path 변경을 금지 |
| SAFE-024 | VLM Privacy/전송 guard | 필요 | 필요 | 안정화, UI | `verify-vlm-privacy-transfer-guard`와 Ops/Client UI leak guard가 cloud 외부 전송 경고, provider logging/retention accepted review, credential/prompt/raw response/source URL/raw frame bytes 비노출을 확인 |
| SAFE-025 | VLM default-off / no runtime auto-start | 비대상 | 필요 | 안정화 | `verify-vlm-runtime-opt-in-contract`와 `verify-v230-vlm-opt-in-operational-evidence`가 VLM profile이나 recommendation이 있어도 `defaultEnabled=false`, runtime call, queue start, provider API call이 자동으로 발생하지 않음을 확인 |
| SAFE-026 | VLM model/runtime bundle 금지 | 비대상 | 필요 | 안정화 | Qwen/Gemini/Gemma 등 model weight, GGUF/safetensors/ckpt, runtime package, credential, download token이 repo/release/bundle에 포함되지 않음 |
| SAFE-027 | VLM cloud external transfer opt-in 필수 | 비대상 | 필요 | 안정화 | cloud 후보는 privacy mode와 외부 전송 경고, provider logging/retention review, runtimeContract `cloud-provider`/`providerFieldSmokeRequired=true`, `verify-v230-vlm-opt-in-operational-evidence`의 provider not-run/releasePassEligible=false 경계가 충족되기 전 전송 가능 상태가 되지 않음 |
| SAFE-028 | VLM prompt/raw response/credential/source redaction | 필요 | 필요 | 안정화, UI | profile, sidecar, Ops review, debug details, viewer/client, Event POST/WebRTC/SSE/WS payload에 prompt/raw response/credential/source URL/raw frame bytes가 노출되지 않음 |
| SAFE-029 | VLM sidecar와 외부 event/metadata 분리 | 비대상 | 필요 | 안정화 | VLMObservation, summary search, rule suggestion 결과는 sidecar/candidate contract에만 있고 `verify-v230-vlm-opt-in-operational-evidence` 기준으로 Sidecar/EventRecord/API schema, Event POST, WebRTC DataChannel, SSE/WS metadata에 섞이지 않음 |
| SAFE-030 | VLM 자동 rule/profile 적용 금지 | 비대상 | 필요 | 안정화 | rule suggestion 후보가 있어도 Rule/Profile registry write, auto apply, viewer/client suggestion 노출이 발생하지 않음 |
| SAFE-031 | VLM viewer/client 비노출 | 필요 | 필요 | 안정화, UI | viewer/client route/nav/API/UI에 VLM model, prompt, raw response, provider, internal review card, source/debug JSON이 노출되지 않음 |
| SAFE-032 | VLM queue/media path non-blocking | 비대상 | 필요 | 안정화 | VLM disabled/missing-model/invalid-output/timeout 상태가 RTSP/WebRTC media path, VA metadata, Event POST dispatch 실패로 전파되지 않음 |
| SAFE-033 | VLM Ops-only debug details boundary | 필요 | 필요 | 안정화, UI | VLM diagnostic JSON과 dry-run raw details는 Ops debug details 접힘 영역 안에만 있으며 제품 client 화면과 public evidence에는 노출되지 않음 |
| SAFE-034 | VLM local runtime smoke side-effect boundary | 비대상 | 필요 | 안정화 | `verify-vlm-local-runtime-smoke`와 `verify-v230-vlm-opt-in-operational-evidence`가 local runtime request/response/timeout cleanup을 실행하되 credential/prompt/raw runtime response/source URL/raw frame bytes 저장, sidecar write, Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media path 변경, viewer/client 노출을 만들지 않음 |
| SAFE-035 | VLM cloud provider credential/redaction boundary | 비대상 | 필요 | 안정화 | `verify-vlm-cloud-provider-field-smoke-gate`와 `verify-v230-vlm-opt-in-operational-evidence`가 credential material, raw prompt, raw provider response, source URL, raw frame bytes를 report/profile/sidecar/Event POST/WebRTC/SSE/WS/client에 저장하지 않고, provider call 미실행은 PASS가 아님, 미실행/실패를 release PASS로 기록하지 않음 |
| SAFE-036 | VLM queue/backpressure non-blocking stability | 비대상 | 필요 | 안정화, 30분 | `verify-vlm-queue-backpressure-stability`와 VA/Event/metadata verifier 묶음이 VLM disabled/missing-model/invalid-output/timeout 상태가 RTSP/WebRTC media path, EventRecord, metadata fanout, Event POST dispatch를 block하지 않고 payload/schema를 바꾸지 않음을 확인 |
| SAFE-037 | VLM review action external schema boundary | 비대상 | 필요 | 안정화 | VLM review action은 Ops review JSONL/audit에만 저장되고 EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, client/viewer, sidecar에 action field나 raw note를 노출하지 않음 |
| SAFE-038 | VLM rule suggestion draft no-auto-save boundary | 필요 | 필요 | 안정화, UI | `/ops/rules` draft 적용은 이벤트 템플릿 form field만 채우며 기존 저장 버튼 수동 조작 전 Rule/Profile registry write, automatic apply, EventRecord/Event POST/WebRTC/SSE/WS schema 변경, media path 변경, client/viewer 노출을 만들지 않음 |
| SAFE-039 | External TURN/WHEP credential and endpoint redaction boundary | 비대상 | 필요 | 안정화 | V230-S04 `verify-v230-conditional-field-evidence`와 `verify-external-turn-whep-field-gate`가 TURN credential material, raw TURN server, raw WHEP URL, raw ICE candidate, source URL을 report/profile/Event POST/WebRTC/SSE/WS/client에 저장하지 않고, 미실행/실패/credential-only PASS를 기본 release PASS로 기록하지 않음 |
| SAFE-040 | Runtime/model bundle release asset prohibition | 비대상 | 필요 | 안정화 | `verify-runtime-model-bundle-rc-rehearsal`과 bundle policy가 ONNX Runtime package, FFmpeg/GStreamer GPL-risk runtime, YOLO/Re-ID/VLM model binary, download token, binary/runtime/model release asset 업로드를 기본 release에서 차단하고 source-only default를 유지 |
| SAFE-041 | V240-S02 EventRecord/Event POST incident workflow boundary | 필요 | 필요 | 안정화, UI | incident/action workflow는 Ops review JSONL와 `/ops/api/audit`에만 저장되고 EventRecord storage, Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, client/viewer에 incident/action field나 raw note를 노출하지 않음 |
| SAFE-042 | V240-S03 alert dry-run external delivery boundary | 필요 | 필요 | 안정화, UI | alert dry-run은 payload preview와 delivery attempt log만 생성하고 webhook/email/slack 외부 전송, Event POST payload 변경, EventRecord/metadata/media path 변경, endpoint secret/client-viewer 노출을 만들지 않음 |
| SAFE-043 | V250-S01 incident projection redaction boundary | 비대상 | 필요 | 안정화 | projection JSON/searchable text가 source URL, Developer URL, raw JSON/debugCounters/BBox diagnostics, auth material, model/provider internals를 저장하지 않고 EventRecord/Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않음 |
| SAFE-044 | V250-S02 incident memory index dependency boundary | 비대상 | 필요 | 안정화 | local incident memory index가 external embedding/model/provider credential/runtime call을 만들지 않고 EventRecord/Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않으며 SQLite unavailable 시 JSONL+BM25 fallback으로 제한됨 |
| SAFE-045 | V250-S03 incident search UI redaction boundary | 필요 | 필요 | 안정화, UI | `/ops/events` semantic search는 Ops-only review response의 redacted projection/highlight만 표시하고 source URL, Developer URL, raw JSON/debugCounters/BBox diagnostics, auth/model/provider material, Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않음 |
| SAFE-046 | V250-S04 incident timeline graph boundary | 필요 | 필요 | 안정화, UI | incident timeline graph는 Ops-only node/edge summary와 audit linkage만 표시하고 source URL, Developer URL, raw JSON/debugCounters/BBox diagnostics, auth/model/provider material, Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않음 |
| SAFE-047 | V250-S05 explainable incident brief boundary | 필요 | 필요 | 안정화, UI | explainable incident brief는 redacted slot summary와 VLM default-off/provider opt-in guard만 표시하고 source URL, Developer URL, raw JSON/debugCounters/BBox diagnostics, auth/model/provider material, Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않음 |
| SAFE-048 | V250-S06 similar incident lookup boundary | 필요 | 필요 | 안정화, UI | similar incident lookup은 rule/scenario/source/status/action target 기반 score와 explanation term만 표시하고 source URL, Developer URL, raw JSON/debugCounters/BBox diagnostics, auth/model/provider material, Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않음 |
| SAFE-049 | V250-S07 client-safe incident digest boundary | 필요 | 필요 | 안정화, UI | client-safe incident digest는 viewer-safe summaryText/severity/event type/status/time만 표시하고 source locator, raw evidence, debug material, provider material, Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않음 |
| SAFE-050 | V250-S08 redacted incident evidence bundle boundary | 필요 | 필요 | 안정화, UI | release-safe incident evidence bundle은 manifest/searchResults/timelineSummary/redactionPolicy만 포함하고 snapshot/clip raw evidence, source URL, credential, debug material, provider material, Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않음 |
| SAFE-051 | V250-S09 릴리즈 준비 경계 | 비대상 | 필요 | 안정화 | owner decomposition/release readiness gate는 Event POST/WebRTC/SSE/WS/RTSP/WebRTC media path/Auth/Rule/Profile payload schema를 바꾸지 않고 UI 풀테스트/30분/120분/published metadata/tag/push/GitHub Release 미실행을 PASS로 승격하지 않음 |
| SAFE-052 | V260-S01 VLM summary candidate productization boundary | 필요 | 필요 | 안정화, UI | `/ops/events` VLM summary candidate review는 Ops-only manual review wrapper만 추가하고 viewer/client route, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, runtime VLM 호출, cloud provider 호출, 자동 Rule/Profile 적용을 만들지 않음 |
| SAFE-053 | V260-S02 incident-to-rule draft-only boundary | 필요 | 필요 | 안정화, UI | `/ops/events` incident-to-rule card는 matching rule suggestion을 표시하고 `/ops/rules` draft workflow로만 연결하며 Rule/Profile registry write, auto apply, client/viewer 노출, provider 호출, EventRecord/Event POST/WebRTC/SSE/WS/media path schema 변경을 만들지 않음 |
| SAFE-054 | V260-S03 ONVIF credential redaction boundary | 필요 | 필요 | 안정화, UI | ONVIF credential gate는 primary `none` provider와 fixture fallback만 허용하고 URL credential, credentialRef 원문, username/password/auth header/SOAP security header, SourceRegistry/PublishedView/client secret 노출, Event POST/WebRTC/SSE/WS/media path schema 변경을 만들지 않음 |
| SAFE-055 | V260-S04 runtime trend storage/schema boundary | 필요 | 필요 | 안정화, UI | runtime trend card는 현재 browser page session의 sample만 사용하고 localStorage/sessionStorage/indexedDB/server trend API, 장기 녹화, Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media path 변경, client/viewer exposure를 만들지 않음 |
| SAFE-056 | V260-S05 scenario schema/media boundary | 필요 | 필요 | 안정화, UI | cross-zone re-entry 후보는 저장 rule scenario payload의 기존 field만 사용하고 새 event type, Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media path 변경, client/viewer exposure를 만들지 않음 |
| SAFE-057 | V260-S06 릴리즈 준비 경계 | 비대상 | 필요 | 안정화 | release readiness gate는 UI 풀테스트 직접 조작, 30분/120분, `verify-release-metadata --published`, tag/push/GitHub Release, PR merge/main sync/후속 브랜치 생성을 local verifier PASS로 승격하지 않음 |
| SAFE-058 | V270-S01 incident triage board boundary | 필요 | 필요 | 안정화, UI | Incident Triage Board는 `/ops/events` Ops-only view model/UI만 추가하고 viewer/client route, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, runtime VLM 호출, cloud provider 호출, 자동 조치 적용을 만들지 않음 |
| SAFE-059 | V270-S02 decision scorecard boundary | 필요 | 필요 | 안정화, UI | Decision scorecard는 `/ops/events` Ops-only deterministic reason summary만 추가하고 provider 호출, raw JSON/source URL 표시, viewer/client route, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경을 만들지 않음 |
| SAFE-060 | V270-S03 operational action pack boundary | 필요 | 필요 | 안정화, UI | Operational Action Pack은 기존 수동 workflow link만 `/ops/events`에 표시하고 외부 실제 alert 발송, 자동 rule registry write, source registry write, viewer/client route, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경을 만들지 않음 |
| SAFE-061 | V270-S04 rule what-if preview boundary | 필요 | 필요 | 안정화, UI | Rule What-if Preview는 selected incident/EventRecord와 rule suggestion 후보의 저장 전 condition preview만 `/ops/events`와 `/ops/rules` draft context에 표시하고 full replay engine, 자동 rule/profile 저장, 자동 적용, viewer/client route, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경을 만들지 않음 |
| SAFE-062 | V270-S05 operator outcome memory boundary | 필요 | 필요 | 안정화, UI | Operator Outcome Memory는 기존 Ops review JSONL와 audit action reference만 읽어 accept/dismiss/review-needed history hint를 표시하고 새 persistent outcome store, 자동 학습/적용, viewer/client route, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경을 만들지 않음 |
| SAFE-063 | V270-S06 릴리즈 준비 경계 | 비대상 | 필요 | 안정화 | `verify-v270-owner-release-readiness`는 v2.7.0 S01~S05 feature inventory, manual UI criteria, release policy/evidence, close-out dry-run companion command를 연결하되 UI 풀테스트 직접 조작, 30분/120분, `verify-release-metadata --published`, tag/push/GitHub Release, PR merge/main sync/후속 브랜치 생성을 local verifier PASS로 승격하지 않음 |
| SAFE-064 | V280-S00/S01 2.x runway and source-of-truth boundary | 비대상 | 필요 | 안정화 | source `2.8.0`, latest published `v2.7.0`, 2.x는 `2.8.0`/`2.9.0`까지만 유지, `3.0.0` major-change line을 분리하되 3.0 설계 완료나 publish/tag evidence로 승격하지 않음 |
| SAFE-065 | V280-S02 incident action readiness queue boundary | 필요 | 필요 | 안정화, UI | readiness queue는 Ops-only 준비 상태만 표시하고 외부 실제 발송, 자동 action write, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, client/viewer 노출을 만들지 않음 |
| SAFE-066 | V280-S03 approval-gated rule draft boundary | 필요 | 필요 | 안정화, UI | staged rule draft readiness는 수동 approval 전 Rule/Profile registry write, 자동 저장, 자동 적용, full replay, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경을 만들지 않음 |
| SAFE-067 | V280-S04 evidence intake field readiness boundary | 필요 | 필요 | 안정화, UI | evidence intake와 field readiness는 redacted 준비 상태만 표시하고 endpoint/credential 없는 field PASS, credential/source/raw/debug/provider material 노출, Event POST/WebRTC/SSE/WS/media path 변경을 만들지 않음 |
| SAFE-068 | V280-S05 runtime evidence window boundary | 필요 | 필요 | 안정화, UI | runtime evidence window는 bounded Ops-only summary이며 장기 녹화, persistent archive, 30분/120분 PASS, Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, client/viewer 노출을 만들지 않음 |
| SAFE-069 | V280-S06 client-safe follow-up digest boundary | 필요 | 필요 | 안정화, UI | client follow-up digest는 viewer-safe status/severity/time만 표시하고 source URL, raw evidence, debug material, provider material, rule editor/action controls를 노출하지 않음 |
| SAFE-070 | V280-S07 릴리즈 준비 경계 | 비대상 | 필요 | 안정화 | `verify-v280-owner-release-readiness`는 v2.8.0 feature inventory, manual UI criteria, release policy/evidence, close-out dry-run companion command를 연결하되 UI 풀테스트 직접 조작, 30분/120분, `verify-release-metadata --published`, tag/push/GitHub Release, PR merge/main sync/후속 브랜치 생성을 local verifier PASS로 승격하지 않음 |
| SAFE-071 | V290-S00 source-of-truth boundary | 비대상 | 필요 | 안정화 | source `2.9.0`, latest published `v2.8.0`, current roadmap `v2.9.0 Final 2.x Closure & Compatibility Baseline`을 분리 정렬하되 published metadata, tag/push/GitHub Release, UI 풀테스트, 30분/120분 PASS로 승격하지 않음 |
| SAFE-072 | V290-S01 2.x final contract freeze boundary | 비대상 | 필요 | 안정화 | `verify-v290-final-contract-freeze`가 Event POST/WebRTC/SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload의 2.x freeze 문서와 freeze-baseline hash 연결을 확인하되 runtime smoke, UI 풀테스트, 30분/120분, published metadata PASS로 승격하지 않음 |
| SAFE-073 | V290-S02 v2.8 기능군 회귀 묶음 boundary | 비대상 | 필요 | 안정화 | `verify-v290-v28-regression-bundle`이 v2.8 S02~S06 verifier를 v2.9 source tree에서 재실행하되 v2.8 완료 evidence 재사용, UI 직접 조작 PASS, 30분/120분, published metadata PASS로 승격하지 않음 |
| SAFE-074 | V290-S03 2.x compatibility baseline boundary | 비대상 | 필요 | 안정화 | `verify-v290-2x-compatibility-baseline`이 v2.5~v2.8 핵심 verifier와 v2.9 S01/S02 gate를 현재 source tree에서 재실행하되 각 하위 verifier 실행 범위만 PASS로 기록하고 UI/30분/120분/published metadata PASS로 승격하지 않음 |
| SAFE-075 | V290-S04 release test records enforcement boundary | 비대상 | 필요 | 안정화 | `verify-v290-release-test-records-enforcement`가 저장소 보존형 테스트 기록의 pass/fail 결과표, 미실행/제외 분리, `/tmp` final evidence 금지, summary-only 금지, cleanup/token 기록 경계를 확인하되 UI/30분/120분/published metadata PASS로 대체하지 않음 |
| SAFE-076 | V290-S05 UI fulltest criteria freeze boundary | 비대상 | 필요 | 안정화 | `verify-v290-ui-fulltest-criteria-freeze`가 v2.9 UI 풀테스트 route/control/action/role/viewport/theme 기준과 raw JSON/API-only/static smoke/screenshot-only/Chrome fallback 비승격 경계를 확인하되 실제 인앱 브라우저 직접 조작 PASS로 대체하지 않음 |
| SAFE-077 | V290-S06 release evidence hygiene boundary | 비대상 | 필요 | 안정화 | `verify-v290-release-evidence-hygiene`가 release evidence index, release test records, feature inventory, script inventory, manual UI evidence 연결과 PASS/FAIL vs 미실행/제외/manual-not-run/미확인 경계를 확인하되 실제 UI 풀테스트, 30분/120분, published metadata, tag/push/GitHub Release PASS로 대체하지 않음 |
| SAFE-078 | V290-S07 public docs/assets refresh boundary | 비대상 | 필요 | 안정화 | `verify-v290-public-docs-assets-refresh`가 README/README.en/docs index/UI guide/docs asset policy/release-version policy와 managed asset set을 확인하되 대표 이미지 직접 재캡처, 직접 브라우저 검수 PASS, UI 풀테스트, 30분/120분, published metadata, tag/push/GitHub Release PASS로 대체하지 않음 |
| SAFE-079 | V290-S08 final stabilization run boundary | 비대상 | 필요 | 안정화 | `verify-v290-final-stabilization-run`가 build/auth/Ops-Client UI/rule/event/metadata/media-schema/docs-inventory 안정화 실행 기록과 미실행 경계를 확인하되 UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, field smoke, tag/push/GitHub Release PASS로 대체하지 않음 |
| SAFE-080 | V290-S09 owner release readiness boundary | 비대상 | 필요 | 안정화 | `verify-v290-owner-release-readiness`가 v2.9.0 local readiness, release close-out dry-run, evidence/records/policy 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분 longrun, `verify-release-metadata --published`, PR/main/tag/GitHub Release, field smoke PASS로 대체하지 않음 |
| SAFE-081 | V300-S00 v3.0 baseline boundary | 비대상 | 필요 | 안정화 | `verify-v300-entry-baseline`가 source `3.0.0`, latest published `v3.0.0`, current roadmap `v3.0.0 Event Evidence Search MVP`, 1차 선택값/fallback/제외 대상, release records, inventory 연결을 확인하되 Event Evidence Contract, frame bundle, feature schema, search UI, UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release PASS로 대체하지 않음 |
| SAFE-082 | V300-S01 evidence contract boundary | 비대상 | 필요 | 안정화 | `verify-v300-event-evidence-contract`가 EvidenceManifest, FrameRef, 7일 retention, pin cleanup 제외, raw prompt/response non-retention, identity feature 금지, non-VMS boundary를 확인하되 frame extraction, encoded clip/playback, VMS archive API, Search DSL, `/ops/events` UI, UI 풀테스트, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-083 | V310-S02 encoded clip non-VMS boundary | 비대상 | 필요 | 안정화 | `verify-analysis-state`가 WebM/VP8 encoded clip artifact와 queue/status manifest의 bounded short segment, `continuousRecording=false`, `archiveApi=false`, partial cleanup 기록을 확인하되 24/7 recording, VMS/NVR archive API, replay UI, client viewer exposure, Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media path 변경 evidence로 쓰지 않음 |
| SAFE-084 | V300-S02 frame bundle boundary | 비대상 | 필요 | 안정화 | `verify-analysis-state`가 V300-S02 EvidenceManifest와 frame bundle manifest의 eventFrame 필수, representativeImage selection 경계, bboxCrop reference, pre/event/post FrameRef, raw prompt/response non-retention, identity feature 금지, VMS/NVR archive API 금지, encoded clip/playback 비승격 경계를 확인하되 Search DSL, `/ops/events` UI, UI 풀테스트, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-085 | V300-S03 privacy and identity boundary | 비대상 | 필요 | 안정화 | `verify-v300-feature-schema-privacy`가 FeatureSet privacy guard에서 raw LLM/VLM prompt, raw provider response, face recognition, watchlist, face embedding, person/account identity, license plate searchable identity를 금지하고 EventRecord/Event POST/WebRTC/SSE/WS/media path 변경 없음과 UI/longrun/published 비승격 경계를 확인함 |
| SAFE-086 | V300-S04 VLM feature queue isolation boundary | 비대상 | 필요 | 안정화, 30분 | `verify-v300-vlm-feature-queue`가 missing-runtime, queue-timeout, invalid-output을 VLM-only failure로 닫고 media path, EventRecord, metadata fanout, Event POST dispatch, Event POST/WebRTC/SSE/WS schema, raw prompt/response retention으로 전파하지 않음을 확인함 |
| SAFE-087 | V300-S05 raw prompt/response non-retention boundary | 비대상 | 필요 | 안정화 | `verify-v300-feature-only-retention`가 raw prompt, raw provider response, provider request body, credential, source URL, raw frame bytes를 durable FeatureSet retention에서 거부하고 provider replay, Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경으로 전파하지 않음을 확인함 |
| SAFE-088 | V300-S06 query convert privacy and boundary | 비대상 | 필요 | 안정화 | `verify-v300-search-dsl-query-convert`가 query conversion 중 raw prompt/raw provider response를 보존하지 않고 runtime provider call, vector search, Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경으로 전파하지 않으며 identity/watchlist query를 거부함 |
| SAFE-089 | V300-S07 search index privacy and boundary | 비대상 | 필요 | 안정화 | `verify-v300-feature-search-index`가 Feature/Search Index projection 중 raw prompt/raw provider response, identity feature, provider call, vector search, Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경, viewer/client 노출을 만들지 않음을 확인함 |
| SAFE-090 | V300-S08 Ops Events UI boundary | 비대상 | 필요 | 안정화 | `verify-v300-ops-events-ui`가 `/ops/events` UI shell/view model/script/CSS와 Ops-only redaction boundary를 확인하되 UI 풀테스트 직접 조작, 30분/120분, Retention/Pin/Cleanup lifecycle delete/dry-run/audit, Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경 evidence로 쓰지 않음 |
| SAFE-091 | V300-S09 retention cleanup boundary | 비대상 | 필요 | 안정화 | `verify-v300-retention-pin-cleanup`가 cleanup plan에서 EventRecord, EvidenceManifest, FeatureSet revision, SearchIndex entry를 일관되게 삭제/de-index 대상으로 묶고 pinned event를 자동 cleanup에서 제외하며 Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, viewer/client 노출을 만들지 않음을 확인함 |
| SAFE-092 | V300-S10 stabilization/release readiness boundary | 비대상 | 필요 | 안정화 | `verify-v300-stabilization-release-readiness`가 v3.0 local stabilization, release evidence/not-run 경계, close-out dry-run 기록을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, release action PASS로 대체하지 않음을 확인함 |
| SAFE-093 | V310-S00 v3.1 baseline boundary | 비대상 | 필요 | 안정화 | `verify-v310-entry-baseline`가 source `3.1.0`, latest published `v3.1.0`, current roadmap `v3.1.0 Encoded Event Clip and Safe Sharing Expansion`, 1차 선택값/fallback/제외 대상, license/provenance/privacy/운영 제약, release records, inventory 연결을 확인하되 encoded clip contract/pipeline/replay UI/client digest/scoped API/operator correction/vector search/export hardening, UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release PASS로 대체하지 않음 |
| SAFE-094 | V310-S01 encoded clip contract boundary | 비대상 | 필요 | 안정화 | `verify-v310-event-clip-contract`가 EncodedClipManifest, MP4/WebM format, FrameRef/PTS mapping, evidence links, 7일 retention, raw prompt/response non-retention, identity feature 금지, non-VMS boundary를 확인하되 encoder generation, replay UI, cleanup execution, client digest, scoped API, UI 풀테스트, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-095 | V310-S03 replay timeline UI boundary | 비대상 | 필요 | 안정화 | `verify-v310-replay-timeline-ui`가 `/ops/events` replayTimeline view model/UI shell/script/CSS에서 Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, viewer/client exposure, source URL/raw JSON/debug material을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, client digest, scoped API, cleanup execution, published metadata PASS로 대체하지 않음 |
| SAFE-096 | V310-S04 client-safe event digest boundary | 비대상 | 필요 | 안정화 | `verify-v310-client-safe-event-digest`가 `/client/api/views/{id}/events`와 client live/dashboard/events에 viewer-safe digest만 추가하고 Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload, source URL/raw JSON/debug/provider/feature provenance/encoded clip path 노출을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, scoped API, cleanup execution, published metadata PASS로 대체하지 않음 |
| SAFE-097 | V310-S05 scoped integrator search redaction boundary | 비대상 | 필요 | 안정화 | `verify-v310-scoped-integrator-search-api`가 integrator-only search API에서 Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, source URL/raw JSON/debug/provider/feature provenance/internal evidence/encoded clip path 노출을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, cleanup execution, vector search, published metadata PASS로 대체하지 않음 |
| SAFE-098 | V310-S06 operator correction boundary | 필요 | 필요 | 안정화, UI | `verify-v310-operator-feature-correction`가 operator correction/alias/reanalysis request가 Ops review state와 audit에만 저장되고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, client/viewer exposure, runtime provider replay, vector search를 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, cleanup execution, published metadata PASS로 대체하지 않음 |
| SAFE-099 | V310-S08 retention/export boundary | 비대상 | 필요 | 안정화 | `verify-v310-retention-export-hardening`이 release-safe export bundle에서 encoded clip media/path/material, source URL, raw evidence, provider/debug material을 제외하고 signed token expiry와 `export-bundle` audit coverage를 확인하되 UI 풀테스트 직접 조작, 30분/120분, vector search, destructive operational cleanup, published metadata PASS로 대체하지 않음 |
| SAFE-100 | V310-S07 optional vector search boundary | 비대상 | 필요 | 안정화 | `verify-v310-optional-vector-search`가 optional vector index/search를 기본 off로 유지하고 명시 opt-in에서도 raw prompt/raw provider response/runtime provider call/face embedding/identity embedding/Event POST/WebRTC/SSE/WS schema/RTSP-WebRTC media path/client-viewer 노출을 만들지 않음을 확인하되 provider embedding calls, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-101 | V310-S09 stabilization/release readiness boundary | 비대상 | 필요 | 안정화 | `verify-v310-stabilization-release-readiness`가 v3.1 local stabilization, release evidence/not-run 경계, close-out dry-run 기록을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, release action PASS로 대체하지 않음을 확인함 |
| SAFE-102 | V320 Step 1 v3.2 baseline boundary | 비대상 | 필요 | 안정화 | `verify-v320-entry-baseline`가 source `3.2.0`, latest published `v3.1.0`, current roadmap `v3.2.0 Operations Resolution Workspace`, 1차 선택값/fallback/제외 대상, license/provenance/privacy/운영 제약, release records, inventory 연결을 확인하되 resolution state contract/unified workspace/evidence quality/source reliability/AI review/operator flow/action checklist/client digest/search metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release PASS로 대체하지 않음 |
| SAFE-103 | V320 Step 2 resolution boundary | 비대상 | 필요 | 안정화 | `verify-v320-resolution-state-contract`가 resolution state contract가 Ops review state/audit에만 저장되고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer exposure, operator assignment flow, search/metrics를 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-104 | V320 Step 3 unified workspace boundary | 필요 | 필요 | 안정화, UI | `verify-v320-unified-ops-events-workspace`가 `/ops/events`의 unifiedResolutionWorkspace UI/view model/script/CSS에서 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client exposure, source URL/raw JSON/debug material을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, evidence quality, source reliability, AI review quality, operator assignment flow, client digest, search/metrics, published metadata PASS로 대체하지 않음 |
| SAFE-105 | V320 Step 4 evidence quality boundary | 필요 | 필요 | 안정화, UI | `verify-v320-evidence-quality-layer`가 evidenceQuality layer가 EventRecord evidence refs와 Ops review state를 deterministic hint로만 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client exposure, source URL/raw JSON/debug material, raw evidence material을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, full replay engine, source reliability, AI review quality, operator assignment flow, client digest, search/metrics, published metadata PASS로 대체하지 않음 |
| SAFE-106 | V320 Step 5 source reliability boundary | 필요 | 필요 | 안정화, UI | `verify-v320-source-reliability-context`와 `verify-v320-source-reliability-runtime-sample`이 sourceReliability context가 SourceRegistry source health snapshot과 EventRecord source identifier를 deterministic hint로만 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client exposure, source URL/raw JSON/debug material, source registry write를 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, AI review quality, operator assignment flow, client digest, search/metrics, published metadata PASS로 대체하지 않음 |
| SAFE-107 | V320 Step 6 AI review quality boundary | 필요 | 필요 | 안정화, UI | `verify-v320-ai-review-quality-context`가 aiReviewQuality context가 기존 Ops review state, evidence quality, source reliability context를 deterministic hint로만 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client exposure, source URL/raw JSON/debug material, runtime provider call, raw provider material을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, operator assignment flow, action checklist, client digest, search/metrics, published metadata PASS로 대체하지 않음 |
| SAFE-108 | V320 Step 7 operator resolution boundary | 필요 | 필요 | 안정화, UI | `verify-v320-operator-resolution-flow`가 operatorResolutionFlow context와 nested write payload가 Ops review JSONL/audit에만 저장되고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client exposure, source URL/raw JSON/debug material, 자동 조치를 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, action checklist, client digest, search/metrics, published metadata PASS로 대체하지 않음 |
| SAFE-109 | V320 Step 8 action readiness boundary | 필요 | 필요 | 안정화, UI | `verify-v320-action-readiness-checklist`가 actionReadinessChecklist context가 기존 EventRecord/source/AI/operator context를 deterministic checklist로만 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client exposure, source URL/raw JSON/debug material, rule draft 생성, 자동 조치, external delivery를 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, client digest, search/metrics, published metadata PASS로 대체하지 않음 |
| SAFE-110 | V320 Step 9 client-safe resolution digest boundary | 필요 | 필요 | 안정화, UI | `verify-v320-client-safe-resolution-digest`가 `/client/api/views/{id}/events`와 client live/dashboard/events에 viewer-safe resolution digest만 추가하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload, source URL/raw JSON/debug/provider/feature provenance/internal evidence/operator note/action control 노출을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, search/metrics, published metadata PASS로 대체하지 않음 |
| SAFE-111 | V320 Step 10 resolution search metrics boundary | 필요 | 필요 | 안정화, UI | `verify-v320-resolution-search-metrics`가 resolutionSearchMetrics context가 기존 EventRecord/Ops review/v3.2 context를 deterministic search/metric view로만 요약하고 saved view write, client digest, source URL/raw JSON/debug material, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload를 변경하지 않음을 확인하되 Stabilization and Release Readiness, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-112 | V320 Step 11 stabilization/release readiness boundary | 비대상 | 필요 | 안정화 | `verify-v320-stabilization-release-readiness`가 v3.2 local stabilization, release evidence/not-run 경계, close-out dry-run 기록을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke PASS로 대체하지 않음을 확인함 |
| SAFE-113 | V330 Step 1 v3.3 baseline boundary | 비대상 | 필요 | 안정화 | `verify-v330-entry-baseline`가 source `3.3.0`, latest published `v3.2.0`, current roadmap `v3.3.0 Live Source Reliability Workspace`, 1차 선택값/fallback/제외 대상, license/provenance/privacy/운영 제약, release records, inventory 연결을 확인하되 source registry snapshot/onboarding quality/reliability timeline/incident correlation/recovery queue/client digest/search metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release PASS로 대체하지 않음 |
| SAFE-114 | V330 Step 2 source registry snapshot boundary | 비대상 | 필요 | 안정화 | `verify-v330-source-registry-snapshot-identity`가 SourceViewRegistry의 Ops-only snapshot identity read model과 `/ops/api/source-registry/snapshot` route가 sourceId/source kind/PublishedView/canonical source key/owner context를 읽기 전용으로 조합하고 source registry write, PublishedView write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client output을 변경하지 않음을 확인하되 onboarding quality, reliability timeline, incident correlation, recovery queue, client digest, search/metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-115 | V330 Step 3 source onboarding quality boundary | 비대상 | 필요 | 안정화 | `verify-v330-source-onboarding-quality-summary`가 SourceViewRegistry의 Ops-only onboarding quality read model, `/ops/api/source-registry/onboarding-quality` route, `/ops/sources` 요약 UI가 저장 전 validation/중복/누락/ready/input quality를 읽기 전용으로 요약하고 source registry write, PublishedView write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client output, raw locator/credential 노출을 변경하지 않음을 확인하되 reliability timeline, incident correlation, recovery queue, client digest, search/metrics, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-116 | V330 Step 4 reliability timeline boundary | 비대상 | 필요 | 안정화 | `verify-v330-reliability-timeline-health-history`가 current source health snapshot과 `source-health-state-change` Ops audit history를 Ops-only timeline으로 요약하고 source registry write, PublishedView write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client output, raw locator/credential 노출을 변경하지 않음을 확인하되 incident correlation, recovery queue, client digest, search/metrics, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-117 | V330 Step 5 incident source correlation boundary | 필요 | 필요 | 안정화, UI | `verify-v330-incident-source-correlation-layer`가 incidentSourceCorrelation context가 기존 resolution detail/sourceReliability/source health audit handoff를 deterministic hint로만 요약하고 source registry write, PublishedView write, EventRecord write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, recovery queue, client digest, search/metrics, viewer/client output, source URL/raw JSON/debug/raw locator/credential 노출을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-118 | V330 Step 6 operator recheck recovery boundary | 필요 | 필요 | 안정화, UI | `verify-v330-operator-recheck-recovery-queue`가 operatorRecheckRecoveryQueue context가 기존 resolution detail/sourceReliability/incidentSourceCorrelation/operator note 상태를 deterministic queue hint로만 요약하고 source registry write, PublishedView write, EventRecord write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, persistent recovery queue write, client digest, search/metrics, viewer/client output, source URL/raw JSON/debug/raw locator/credential 노출, 자동 recovery를 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-119 | V330 Step 7 client-safe source status digest boundary | 필요 | 필요 | 안정화, UI | `verify-v330-client-safe-source-status-digest`가 `/client/api/views/{id}/events`와 client live/dashboard/events에 viewer-safe sourceStatusDigest만 추가하고 source registry write, PublishedView write, EventRecord write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, search/metrics, source URL/raw locator/raw JSON/debug/credential/operator material/action control 노출을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-120 | V330 Step 8 operator runbook reliability handoff boundary | 비대상 | 필요 | 안정화 | `verify-v330-operator-runbook-reliability-handoff`가 operator runbook과 reliability handoff 문서 연결만 확인하고 제품 API/UI schema, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, SourceRegistry/PublishedView write, automatic recovery, real backup/restore, search/metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음을 확인함 |

## J. Ops Evidence And Release Readiness

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| OPS-035 | v2.3.0 S06 Ops backup/recovery evidence lifecycle | 비대상 | 필요 | 안정화 | 비대상: UI 없어야 정상. `verify-v230-ops-backup-recovery-lifecycle`이 staging drill manifest/checksum/restore-validation-plan, redacted evidence bundle, retention cleanup dry-run/apply/audit를 확인하고 30분/120분/UI 실행 PASS로 대체하지 않음 |
| OPS-036 | V250-S09 incident memory route owner 분리 게이트 | 비대상 | 필요 | 안정화 | `verify-v250-owner-release-readiness`가 event memory/search route owner catalog, release-safe evidence bundle route matcher, release readiness 문서 연결을 확인하되 PR/tag/push/GitHub Release 실행 PASS로 대체하지 않음 |
| OPS-037 | V260-S06 릴리즈 준비 게이트 | 비대상 | 필요 | 안정화 | `verify-v260-owner-release-readiness`가 v2.6.0 feature inventory, UI criteria, release policy/evidence, close-out dry-run companion command를 연결하되 release publish, PR/main/tag/push, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-038 | V270-S06 릴리즈 준비 게이트 | 비대상 | 필요 | 안정화 | `verify-v270-owner-release-readiness`가 v2.7.0 S01~S05 feature inventory, manual UI criteria, release policy/evidence, close-out dry-run companion command를 연결하되 release publish, PR/main/tag/push, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-039 | V280-S00/S01 source-of-truth와 2.x runway 게이트 | 비대상 | 필요 | 안정화 | source `2.8.0`, latest published `v2.7.0`, next source tag `v2.8.0`, 2.x runway/3.0 major boundary 문서가 서로 일치하는지 확인하되 release publish, PR/main/tag/push, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-040 | V280-S07 릴리즈 준비 게이트 | 비대상 | 필요 | 안정화 | `verify-v280-owner-release-readiness`가 v2.8.0 S02~S06 feature inventory, manual UI criteria, release policy/evidence, close-out dry-run companion command를 연결하되 release publish, PR/main/tag/push, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-041 | V290-S00 source-of-truth와 latest published 분리 게이트 | 비대상 | 필요 | 안정화 | `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`가 source `2.9.0`, latest published `v2.8.0`, current roadmap `v2.9.0 Final 2.x Closure & Compatibility Baseline`을 확인하되 published metadata, PR/main/tag/push, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-042 | V290-S01 2.x final contract freeze 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-final-contract-freeze`가 contract freeze 문서, server command, stream verification, feature inventory, release test records, integrator freeze-baseline 연결을 확인하되 PR/main/tag/push/GitHub Release, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-043 | V290-S02 v2.8 기능군 회귀 묶음 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-v28-regression-bundle`이 `verify-v280-incident-action-readiness-queue`, `verify-v280-approval-gated-rule-draft`, `verify-v280-evidence-intake-field-readiness`, `verify-v280-runtime-evidence-window`, `verify-v280-client-safe-followup-digest`를 현재 source tree에서 재실행하되 release publish, PR/main/tag/push, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-044 | V290-S03 2.x compatibility baseline 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-2x-compatibility-baseline`이 v2.5/v2.6/v2.7 핵심 feature verifier와 `verify-v290-final-contract-freeze`, `verify-v290-v28-regression-bundle`을 현재 source tree에서 재실행하되 owner release readiness, PR/main/tag/push/GitHub Release, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-045 | V290-S04 release test records enforcement 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-release-test-records-enforcement`가 `docs/release-test-records.md`의 테스트 항목/결과/deprecated/미실행/cleanup/token 기록 구조를 확인하되 실제 안정화/UI/30분/120분/published metadata 실행 완료로 대체하지 않음 |
| OPS-046 | V290-S05 UI fulltest criteria freeze 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-ui-fulltest-criteria-freeze`와 `verify-manual-ui-evidence`가 v2.9 manual UI fulltest/checklist/result template 기준을 확인하되 UI 풀테스트 실행, 30분/120분, published metadata, tag/push/GitHub Release 완료로 대체하지 않음 |
| OPS-047 | V290-S06 release evidence hygiene 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-release-evidence-hygiene`, `verify-release-evidence-index`, `verify-script-inventory`가 release evidence index/records/inventory/manual UI evidence 연결과 PASS/FAIL vs 미실행/제외 경계를 확인하되 release publish, PR/main/tag/push, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-048 | V290-S07 public docs/assets refresh 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-public-docs-assets-refresh`, `verify-docs-ui-assets`, `verify-docs-links`가 공개 첫 화면, docs index, UI guide, docs asset policy, release/version policy를 확인하되 image recapture, release publish, PR/main/tag/push, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-049 | V290-S08 final stabilization run 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-final-stabilization-run`가 release 순서의 build/auth/Ops-Client UI/rule/event/metadata/media-schema/docs-inventory 결과 기록을 확인하되 release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-050 | V290-S09 owner release readiness 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-owner-release-readiness`가 v2.9.0 S00~S09 local readiness, release close-out dry-run, policy/evidence/records/manual UI criteria 연결을 확인하되 release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-051 | V300-S00 v3.0 baseline 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-entry-baseline`가 VERSION/CMake/README/docs/backlog/source roadmap을 source `3.0.0`, latest published `v3.0.0`, current roadmap `v3.0.0 Event Evidence Search MVP` 기준으로 정렬했는지 확인하되 v3.0 기능 구현, release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-052 | V300-S01 Event Evidence Contract 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-event-evidence-contract`가 docs/event-evidence-contract.md, sample manifest fixture, stream verification, roadmap, release records, feature inventory, server dispatch 연결을 확인하되 runtime frame capture, encoded clip/playback, VMS archive API, Search DSL, `/ops/events` UI, release publish, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-053 | V300-S03 feature schema privacy 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-feature-schema-privacy`가 docs/event-feature-schema-privacy.md, FeatureSet fixture, stream verification, roadmap, release records, feature inventory, server dispatch 연결을 확인하되 VLM queue/runtime/provider success, Search DSL, `/ops/events` UI, release publish, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-054 | V300-S04 VLM feature queue 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-vlm-feature-queue`가 docs/v300-vlm-feature-queue.md, fixture, analysis smoke, stream verification, roadmap, release records, feature inventory, server dispatch 연결을 확인하되 provider success, Search DSL, `/ops/events` UI, release publish, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-055 | V300-S05 feature-only retention 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-feature-only-retention`가 docs/v300-feature-only-retention.md, fixture, analysis smoke, stream verification, roadmap, release records, feature inventory, server dispatch 연결을 확인하되 Search DSL, Retention/Pin/Cleanup, `/ops/events` UI, release publish, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-056 | V300-S06 search DSL/query convert 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-search-dsl-query-convert`가 docs/v300-search-dsl-query-convert.md, fixture, analysis smoke, stream verification, roadmap, release records, feature inventory, server dispatch 연결을 확인하되 Feature/Search Index, `/ops/events` UI, vector search, release publish, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-057 | V300-S07 feature/search index 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-feature-search-index`가 docs/v300-feature-search-index.md, fixture, analysis smoke, stream verification, roadmap, release records, feature inventory, server dispatch 연결을 확인하되 `/ops/events` UI, vector search, semantic provider rerank, retention cleanup execution, release publish, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-058 | V300-S08 Ops Events UI 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-ops-events-ui`가 `/ops/events` UI shell, eventEvidenceSearch view model, script rendering, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, cleanup execution, release publish 실행 PASS로 대체하지 않음 |
| OPS-059 | V300-S09 retention/pin/cleanup 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-retention-pin-cleanup`가 docs/v300-retention-pin-cleanup.md, fixture, analysis smoke, stream verification, roadmap, release records, feature inventory, server dispatch 연결을 확인하되 destructive 운영 cleanup 실행, UI 풀테스트 직접 조작, 30분/120분, release publish 실행 PASS로 대체하지 않음 |
| OPS-060 | V300-S10 stabilization/release readiness 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-stabilization-release-readiness`가 v3.0 S00~S09 local gates, release policy/evidence index/test records, close-out dry-run command, server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release 실행 PASS로 대체하지 않음 |
| OPS-061 | V310-S00 v3.1 baseline 게이트 | 비대상 | 필요 | 안정화 | `verify-v310-entry-baseline`가 VERSION/CMake/README/docs/backlog/source roadmap을 source `3.1.0`, latest published `v3.1.0`, current roadmap `v3.1.0 Encoded Event Clip and Safe Sharing Expansion` 기준으로 정렬했는지 확인하되 v3.1 기능 구현, release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-062 | V310-S01 Encoded Event Clip Contract 게이트 | 비대상 | 필요 | 안정화 | `verify-v310-event-clip-contract`가 docs/v310-encoded-event-clip-contract.md, sample encoded clip manifest fixture, stream verification, roadmap, release records, feature inventory, server dispatch 연결을 확인하되 runtime encoder generation, replay UI, VMS archive API, cleanup execution, release publish, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-063 | V310-S03 Replay Timeline UI 게이트 | 비대상 | 필요 | 안정화 | `verify-v310-replay-timeline-ui`가 `/ops/events` UI shell, replayTimeline view model, script rendering, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, client digest, scoped API, cleanup execution, release publish 실행 PASS로 대체하지 않음 |
| OPS-064 | V310-S05 Scoped Integrator Search API 게이트 | 비대상 | 필요 | 안정화 | `verify-v310-scoped-integrator-search-api`가 `/client/api/views/{id}/events/search` route, integrator role guard, `event:read:{viewId}` scope gate, redacted digest payload, backlog/stream verification/release records/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, cleanup execution, vector search, release publish 실행 PASS로 대체하지 않음 |
| OPS-065 | V310-S06 Operator Feature Correction 게이트 | 비대상 | 필요 | 안정화 | `verify-v310-operator-feature-correction`가 `/ops/events` correction UI shell, review state persistence, alias/reanalysis request fields, product script/CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, cleanup execution, vector search, release publish 실행 PASS로 대체하지 않음 |
| OPS-066 | V310-S08 Retention/Export Hardening 게이트 | 비대상 | 필요 | 안정화 | `verify-v310-retention-export-hardening`가 encoded clip lifecycle cleanup, release-safe export bundle encoded media exclusion, `export-bundle` audit coverage, backlog/stream verification/release records/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, vector search, destructive operational cleanup, release publish 실행 PASS로 대체하지 않음 |
| OPS-067 | V310-S07 Optional Vector Search 게이트 | 비대상 | 필요 | 안정화 | `verify-v310-optional-vector-search`가 optional vector fixture, EventFeatureSearchIndex optional vector API/report, analysis-state smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 provider embedding calls, UI 풀테스트 직접 조작, 30분/120분, client/viewer 노출, release publish 실행 PASS로 대체하지 않음 |
| OPS-068 | V310-S09 stabilization/release readiness 게이트 | 비대상 | 필요 | 안정화 | `verify-v310-stabilization-release-readiness`가 v3.1 S00~S08 local gates, release policy/evidence index/test records, close-out dry-run command, server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release 실행 PASS로 대체하지 않음 |
| OPS-069 | V320 Step 1 v3.2 baseline 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-entry-baseline`가 VERSION/CMake/README/docs/backlog/source roadmap을 source `3.2.0`, latest published `v3.1.0`, current roadmap `v3.2.0 Operations Resolution Workspace` 기준으로 정렬했는지 확인하되 v3.2 기능 구현, release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-070 | V320 Step 2 Resolution State Contract 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-resolution-state-contract`가 `/ops/api/events/reviews`의 `media-server.ops.resolution-state.v1`, status/reason/close-reopen lifecycle catalog, review JSONL persistence, resolution audit, backlog/stream verification/release records/server dispatch 연결을 확인하되 Unified Ops Events Workspace, UI 풀테스트 직접 조작, 30분/120분, operator assignment flow, client digest, search/metrics, published metadata PASS로 대체하지 않음 |
| OPS-071 | V320 Step 3 Unified Ops Events Workspace 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-unified-ops-events-workspace`가 `/ops/events` UI shell, unifiedResolutionWorkspace view model, resolution queue/detail/timeline script rendering, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 Evidence Quality Layer, Source Reliability Context, AI Review Quality Context, Operator Resolution Flow, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| OPS-072 | V320 Step 4 Evidence Quality Layer 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-evidence-quality-layer`가 `/ops/events` evidence quality UI, `unifiedResolutionWorkspace.evidenceQuality` view model, completeness/confidence/replay coverage hint, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 Source Reliability Context, AI Review Quality Context, Operator Resolution Flow, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| OPS-073 | V320 Step 5 Source Reliability Context 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-source-reliability-context`가 `/ops/events` source reliability UI, `unifiedResolutionWorkspace.sourceReliability` view model, source health/recent failure/operator recheck hint, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하고, `verify-v320-source-reliability-runtime-sample`이 실행 중인 서버에서 fixture EventRecord item의 개별 `sourceReliability` 샘플과 cleanup을 확인하되 AI Review Quality Context, Operator Resolution Flow, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| OPS-074 | V320 Step 6 AI Review Quality Context 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-ai-review-quality-context`가 `/ops/events` AI review quality UI, `unifiedResolutionWorkspace.aiReviewQuality` view model, correction/review signal, uncertainty reason, quality badge, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 Operator Resolution Flow, Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| OPS-075 | V320 Step 7 Operator Resolution Flow 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-operator-resolution-flow`가 `/ops/events` operator resolution UI, `unifiedResolutionWorkspace.operatorResolutionFlow` view model, nested write payload, `operator-resolution-flow-update` audit, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| OPS-076 | V320 Step 8 Action Readiness Checklist 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-action-readiness-checklist`가 `/ops/events` action readiness UI, `unifiedResolutionWorkspace.actionReadinessChecklist` view model, rule draft/evidence bundle/notification readiness checklist, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| OPS-077 | V320 Step 9 Client-safe Resolution Digest 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-client-safe-resolution-digest`가 `/client/api/views/{id}/events` `resolutionDigest`, client live/dashboard/events renderer, CSS, ops/client smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| OPS-078 | V320 Step 10 Resolution Search & Metrics 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-resolution-search-metrics`가 `/ops/events` resolution search metrics UI, unifiedResolutionWorkspace.resolutionSearchMetrics view model, active filters/saved view presets/operations metrics, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 Stabilization and Release Readiness, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| OPS-079 | V320 Step 11 Stabilization and Release Readiness 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-stabilization-release-readiness`가 v3.2 Step 1~10 local gates, release policy/evidence index/test records, close-out dry-run command, server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke 실행 PASS로 대체하지 않음 |
| OPS-080 | V330 Step 1 v3.3 baseline 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-entry-baseline`가 VERSION/CMake/README/docs/backlog/source roadmap을 source `3.3.0`, latest published `v3.2.0`, current roadmap `v3.3.0 Live Source Reliability Workspace` 기준으로 정렬했는지 확인하되 v3.3 기능 구현, release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-081 | V330 Step 2 Source Registry Snapshot and Identity 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-source-registry-snapshot-identity`가 SourceViewRegistry read model, `/ops/api/source-registry/snapshot` Ops-only route, backlog/stream verification/release records/server dispatch 연결을 확인하되 source registry write, PublishedView write, viewer/client 노출, onboarding quality, reliability timeline, incident correlation, recovery queue, client digest, search/metrics, release publish, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-082 | V330 Step 3 Source Onboarding Quality Summary 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-source-onboarding-quality-summary`가 SourceViewRegistry read model, `/ops/api/source-registry/onboarding-quality` Ops-only route, `/ops/sources` summary hook, backlog/stream verification/release records/server dispatch 연결을 확인하되 source registry write, PublishedView write, viewer/client 노출, reliability timeline, incident correlation, recovery queue, client digest, search/metrics, release publish, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-083 | V330 Step 4 Reliability Timeline and Health History 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-reliability-timeline-health-history`가 `/ops/api/source-registry/reliability-timeline` Ops-only route, `/ops/sources` timeline/history UI, current source health snapshot, source-health-state-change Ops audit history, backlog/stream verification/release records/server dispatch 연결을 확인하되 source registry write, PublishedView write, viewer/client 노출, incident correlation, recovery queue, client digest, search/metrics, release publish, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-084 | V330 Step 5 Incident-to-Source Correlation Layer 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-incident-source-correlation-layer`가 `/ops/api/events/reviews` incidentSourceCorrelation view model, `/ops/events` source cause/closure impact/source handoff UI, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 source registry write, PublishedView write, viewer/client 노출, EventRecord/Event POST/API/schema/media 변경, recovery queue, client digest, search/metrics, release publish, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-085 | V330 Step 6 Operator Recheck and Recovery Queue 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-operator-recheck-recovery-queue`가 `/ops/api/events/reviews` operatorRecheckRecoveryQueue view model, `/ops/events` failed-only recheck/retry candidate/recovery checklist/dry-run/operator note UI, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 source registry write, PublishedView write, viewer/client 노출, EventRecord/Event POST/API/schema/media 변경, persistent recovery queue write, client digest, search/metrics, release publish, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-086 | V330 Step 7 Client-safe Source Status Digest 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-client-safe-source-status-digest`가 `/client/api/views/{id}/events` sourceStatusDigest, client live/dashboard/events renderer, CSS, ops/client smoke, backlog/stream verification/release records/manual UI/feature inventory/server dispatch 연결을 확인하되 source registry write, PublishedView write, viewer/client 범위 밖 노출, EventRecord/Event POST/API/schema/media 변경, search/metrics, release publish, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-087 | V330 Step 8 Operator Runbook and Reliability Handoff 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-operator-runbook-reliability-handoff`가 `docs/live-source-health.md` runbook source-of-truth, docs index/UI guide/config/backup handoff, backlog/stream verification/release records/feature inventory/server dispatch 연결을 확인하되 Source Reliability Search and Metrics, Ops Backup and Recovery Source Handoff, real backup/restore, release publish, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |

## Coverage Review To Do

이 문서 다음 단계는 실행이 아니라 대조입니다.

| 작업 | 산출물 |
| --- | --- |
| 코드 로직 존재 대조 | 기능 ID별 source/API/route 위치 |
| 제품 UI 존재 대조 | 기능 ID별 route/control/state 위치 |
| 안정화 테스트 존재 대조 | 기능 ID별 verifier/script/API smoke 존재 여부 |
| 30분 테스트 존재 대조 | 기능 ID별 soak/long session 포함 여부 |
| 120분 대조 | 기능 ID별 longrun 필요 조건과 사용자 승인 기준 |
| UI 풀테스트 항목 대조 | 기능 ID별 직접 클릭/타이핑/viewport/theme evidence 항목 |

coverage 대조 전에는 `테스트 있음`, `UI 있음`, `완료`라고 보고하지 않습니다.
정적 대조는 `./server.sh verify-feature-inventory-coverage`로 수행하며, 새 기능 ID가 안정화 verifier, manual UI fulltest, 30분/120분 승인 조건 중 어디에도 연결되지 않으면 누락 ID는 release gate에서 FAIL입니다. 네 테스트 영역 밖 분류는 coverage 대조에서 거부합니다.

## Script Inventory Boundary

이 문서는 기능별 UI 필요 여부와 테스트 영역을 관리합니다. `server.sh` command dispatch, `scripts/internal/*`, `scripts/examples/*`, helper script 전체 목록은 `./server.sh verify-script-inventory`가 전용 검증 기준입니다. script 파일 하나하나를 기능 row로 다시 나열하지 않습니다.
