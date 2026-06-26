# Development Backlog

이 문서는 현재 source tree의 roadmap 요약을 보관합니다. 여기서 `완료`라고 표시한
항목은 해당 source 기능과 local verifier 기준을 뜻합니다. GitHub Release publish,
UI 풀테스트, 30분, 120분 evidence는 해당 실행 증거가 있을 때만 별도로 완료로 씁니다.

- 현재 버전/비범위 기준: [versioning-policy.md](./versioning-policy.md)
- release 정책: [release-policy.md](./release-policy.md)
- 검증 명령 기준: [stream-verification.md](./stream-verification.md)

## 현재 공개 상태

- 현재 소스 버전: `3.3.0`
- 최신 공개 GitHub Release: `v3.2.0`
- `v3.2.0` 공개 상태: source-only GitHub Release. Binary, runtime, model bundle은
  포함하지 않습니다.
- 현재 source roadmap: `v3.3.0 Live Source Reliability Workspace`
- 최신 published baseline: `v3.2.0 Operations Resolution Workspace`

## 현재 source roadmap: v3.3.0 Live Source Reliability Workspace

상태: Step 1 source/version/docs/backlog/verification metadata 정렬 완료. Step 2
Source Registry Snapshot and Identity 구현 완료. Step 3 Source Onboarding Quality Summary
구현 완료. Step 4 Reliability Timeline and Health History 구현 완료. Step 5
Incident-to-Source Correlation Layer 구현 완료. Step 6 Operator Recheck and Recovery Queue
구현 완료. Step 7 Client-safe Source Status Digest 구현 완료. 현재 source version은 `3.3.0`이고, 최신 published baseline은 `v3.2.0`
Operations Resolution Workspace입니다. 이 절은 v3.3.0 개발 이슈와 현재 step evidence를
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
- source reliability search, filters, and metrics
- backup/recovery handoff에 필요한 source registry/health 검증 입력
- operator runbook과 source reliability handoff 문서

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
| 8 | v3.3.0 (8) Source Reliability Search and Metrics | P2 | 미착수 | source health filter, saved reliability view, reconnect/stale/offline metric summary |
| 9 | v3.3.0 (9) Ops Backup and Recovery Source Handoff | P2 | 미착수 | source registry, PublishedView, source health snapshot, recovery validation plan 연결 |
| 10 | v3.3.0 (10) Operator Runbook and Reliability Handoff | P1 | 미착수 | source reliability workspace 사용 흐름, 운영자 runbook, docs index/UI guide/config/backup 문서 연결 |

완료 경계: Step 1은 source/version/docs/backlog/verification metadata 정렬입니다.
Step 2는 source registry identity read model/API/verifier 연결입니다. Step 3은 source
onboarding quality read model/API/UI/verifier 연결입니다. Step 4는 reliability timeline
and health history read model/API/UI/verifier 연결입니다. Step 5는 incident-to-source
correlation read model/UI/verifier 연결입니다. Step 6는 operator recheck recovery queue
read model/UI/verifier 연결입니다. Step 7은 client-safe source status digest API/UI/verifier
연결입니다. 아직 완료 기록이 없는 항목은 실제 코드/UI/API/문서
산출물이 생긴 뒤에만 완료로 기록합니다.
현재 Step 1 기록은 source registry snapshot, onboarding quality, reliability timeline,
recovery queue, client digest, search/metrics 구현 완료 evidence가 아닙니다.
`v3.3.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.

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

## 최신 공개 기준: v3.2.0 Source Release Baseline

v3.2.0은 Operations Resolution Workspace source-only 공개 릴리즈입니다. 이 기준은
resolution state contract, unified Ops Events workspace, evidence quality, source
reliability, AI review quality, operator resolution flow, action readiness checklist,
client-safe resolution digest, resolution search/metrics, release readiness를 local
evidence와 함께 닫은 최신 published baseline입니다. 120분 longrun과 external field
smoke는 실행하지 않은 영역으로 계속 분리합니다.

## 직전 공개 기준: v3.1.0 Source Release Baseline

v3.1.0은 Encoded Event Clip and Safe Sharing Expansion source-only 직전 공개
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

후속 이슈는 현재 `2.8.0` source tree와 현재 스텝 범위 안에서 실제로 처리 가능한 항목만
기록합니다. 다음 버전 후보, 별도 Phase 후보, 사용자 승인이 필요한 새 제품 범위는 이
문서에 추천하지 않습니다.
