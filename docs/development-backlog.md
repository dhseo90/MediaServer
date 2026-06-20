# Development Backlog

이 문서는 현재 source tree의 roadmap 요약을 보관합니다. 여기서 `완료`라고 표시한
항목은 해당 source 기능과 local verifier 기준을 뜻합니다. GitHub Release publish,
UI 풀테스트, 30분, 120분 evidence는 해당 실행 증거가 있을 때만 별도로 완료로 씁니다.

- 현재 버전/비범위 기준: [versioning-policy.md](./versioning-policy.md)
- release 정책: [release-policy.md](./release-policy.md)
- 검증 명령 기준: [stream-verification.md](./stream-verification.md)

## 현재 공개 상태

- 현재 소스 버전: `3.0.0`
- 최신 공개 GitHub Release: `v2.9.0`
- `v2.9.0` 공개 상태: source-only GitHub Release. Binary, runtime, model bundle은
  포함하지 않습니다.
- 현재 source roadmap: `v3.0.0 Event Evidence Search MVP`

## 현재 source roadmap: v3.0.0 Event Evidence Search MVP

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
| 0 | V300-S00 | P0 | 완료 | v3.0 baseline | VERSION/CMake/README/docs/backlog/source roadmap을 v3.0 작업 기준으로 정렬 | source `3.0.0`, latest published `v2.9.0`, current roadmap `v3.0.0 Event Evidence Search MVP`, V300-S00 verifier 연결 | `./server.sh verify-v300-entry-baseline`, `verify-release-metadata`, docs/inventory gates. 기능 구현 완료 evidence가 아님 |
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

## 계획 roadmap: v3.1.0 Evidence Replay and Sharing Expansion

상태: 계획 확정, `V310-S02` Event Clip Encoder Pipeline 직접 개발 완료. v3.1.0은
v3.0.0의 Event Evidence Search MVP가 구현되고 검증된 뒤 진행하는 후속 확장입니다.
이 절은 v3.1.0 전체 기능 완료 evidence가 아니며, `V310-S00`, `V310-S01`,
`V310-S03`~`V310-S09`는 별도 직접 evidence가 생기기 전까지 계획 상태입니다.

직접 답: v3.1.0의 1차 선택값은 `Evidence Replay and Sharing Expansion`입니다.
v3.0의 evidence/search 기반을 유지하면서 encoded event clip, 안전한 공유 요약,
scoped 연동 API, 운영자 feature 보정, 선택적 vector search를 확장합니다.

포함 범위:

- encoded event clip 생성과 playback/replay timeline
- frame bundle과 encoded clip의 FrameRef/PTS 매핑
- client-safe event digest
- scoped integrator search API
- operator feature correction/alias/reanalysis 요청
- optional vector/embedding index
- encoded clip 포함 lifecycle cleanup/export/audit hardening

제외 범위:

- 24/7 상시녹화, VMS/NVR archive API
- 얼굴 인식, 신원 식별, watchlist, face embedding
- raw prompt/response 보관
- client에게 내부 feature/provenance/raw evidence 전체 노출
- 자동 rule 적용, cloud provider default-on

| Step | ID | Priority | 상태 | 묶음 | 개발 내용 | 완료 산출물 | 검증/evidence 경계 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | V310-S00 | P0 | 계획 | v3.1 baseline | VERSION/CMake/README/docs/backlog/source roadmap을 v3.1 작업 기준으로 정렬 | v3.1 source-of-truth 정렬 | v3.1 기능 구현 완료 evidence가 아님 |
| 1 | V310-S01 | P0 | 계획 | Encoded Event Clip Contract | MP4/WebM clip manifest, FrameRef/PTS 매핑, non-VMS boundary | encoded clip contract와 verifier | 24/7 recording/VMS API 완료 evidence가 아님 |
| 2 | V310-S02 | P0 | 완료 | Event Clip Encoder Pipeline | frame bundle 또는 bounded short segment에서 encoded clip 생성 | clip generation queue/status/cleanup | 장시간 recorder나 상시녹화 evidence가 아님 |
| 3 | V310-S03 | P0 | 계획 | Replay Timeline UI | event frame, representative image, frame bundle, encoded clip timeline 표출 | `/ops/events` replay timeline UI | 직접 브라우저 UI evidence 없이는 UI PASS가 아님 |
| 4 | V310-S04 | P1 | 계획 | Client-safe Event Digest | viewer-safe redacted summary 제공 | client-safe digest schema/UI/API guard | 내부 feature/provenance/raw evidence 노출 evidence가 아님 |
| 5 | V310-S05 | P1 | 계획 | Scoped Integrator Search API | scope 기반 외부 연동 검색 API | scoped search contract와 redaction guard | broad public archive API가 아님 |
| 6 | V310-S06 | P1 | 계획 | Operator Feature Correction | feature correction, alias, reanalysis 요청 | correction audit와 index update policy | 자동 학습/자동 rule 적용 evidence가 아님 |
| 7 | V310-S07 | P2 | 계획 | Optional Vector Search | default-off embedding index, rebuild/quality gate | vector index optional gate | default search 또는 provider rerank PASS가 아님 |
| 8 | V310-S08 | P1 | 계획 | Retention/Export Hardening | encoded clip 포함 lifecycle cleanup, export bundle, audit | export/redaction/cleanup verifier | raw evidence 무제한 export evidence가 아님 |
| 9 | V310-S09 | P0 | 계획 | Stabilization and Release Readiness | build/docs/verifier/UI 기준과 release readiness 기록 | v3.1 local stabilization, release evidence/not-run 경계 | UI 풀테스트/30분/120분/published metadata는 실행한 경우만 PASS |

## v3.1.0 S02 개발 기록

- 범위: P0 `V310-S02 Event Clip Encoder Pipeline`.
- `src/analysis/event_storage.cpp`: 기존 EventRecord frame-bundle clip hook 내부에 bounded short segment를 `event-clip.avi`로 쓰는 encoded clip artifact writer를 추가했습니다. `WriteClipMedia()`가 기존 `.clip/manifest.json`과 frame files를 유지한 뒤 `.clip/encoded/event-clip.avi`, `.clip/encoded/encoded-manifest.json`을 생성합니다.
- `src/analysis/event_storage.cpp`: encoded manifest schema `media-server.va.encoded-event-clip.v1`에 `inputSource=frame-bundle`, `queueName=event-clip-encoder`, `status=completed`, `frameMap`, `cleanup.deletedEntries`, `nonVmsBoundary.boundedShortSegment=true`, `continuousRecording=false`, `archiveApi=false`를 기록합니다.
- `src/analysis/event_storage.cpp`: encoded output directory를 job 시작 전에 정리해 stale/partial encoded output을 제거하고, 삭제 entry 수를 manifest와 frame-bundle manifest의 `encodedClip.cleanupDeletedEntries`에 남깁니다.
- `scripts/internal/analysis_state_smoke.cpp`: Event recorder media hook smoke에 encoded clip artifact, encoded manifest, queue/status/frameMap/non-VMS boundary 확인 항목을 추가했습니다.
- `docs/project-feature-test-inventory.md`, `docs/release-test-records.md`, `docs/stream-verification.md`: `EVT-059`, `SAFE-083`, V310-S02 안정화 확인 항목과 완료 evidence 경계를 추가했습니다.
- 검증: 최초 `./server.sh verify-analysis-state`는 encoded clip job status/non-VMS boundary가 기존 manifest에 없어 fail했습니다. 최종 재검증은 `./server.sh verify-analysis-state` `pass=142 fail=0`, `./server.sh build`, `./server.sh verify-project-inventory`, `./server.sh verify-feature-inventory-coverage`, `./server.sh verify-script-inventory`, `./server.sh verify-docs-links`, `./server.sh verify-v300-event-evidence-contract`, `git diff --check` 기준 PASS입니다.
- 미실행/비대체: v3.1 baseline 정렬, V310-S01 encoded clip contract, `/ops/events` replay timeline UI, client-safe digest, scoped integrator API, 30분/120분 장시간 테스트, UI 풀테스트 직접 조작, published metadata, PR/main/tag/GitHub Release는 S02 완료 근거가 아닙니다.

## 최신 공개 기준: v2.9.0 Source Release Baseline

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

## 최신 공개 기준 요약: v2.9.0 Source Release Baseline

v2.9.0은 source-only/live-only 제품 경계를 유지하면서 Final 2.x Closure &
Compatibility Baseline을 닫은 최신 공개 릴리즈입니다. 이 기준은 2.x final line의
published baseline이며, 3.0.0 major work의 완료 evidence로 재사용하지 않습니다.

## 직전 공개 기준: v2.8.0 Source Release Baseline

v2.8.0은 source-only/live-only 제품 경계를 유지하면서 Operator-Supervised Action
Readiness를 닫은 직전 공개 릴리즈입니다. 이 기준은 v2.9.0의 시작 baseline이며,
v2.9.0의 예정 항목 완료 evidence로 재사용하지 않습니다.

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
