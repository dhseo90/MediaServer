# v3.0 Feature/Search Index

Audience: MediaServer 개발/테스트 에이전트와 운영 검색 계약 검토자입니다.
Lifecycle: v3.0.0 `V300-S07 Feature/Search Index` active release target 동안 유지합니다.
Source-of-truth: AGENTS.md는 개발/테스트/보고 권한의 최상위 규칙이고, 이 문서는 V300-S07 feature/search index 경계만 정의합니다.

## Scope

V300-S07은 S06의 `media-server.event-search-dsl.v1`을 입력으로 사용해 EventRecord,
FeatureSet revision, EvidenceManifest, operator review state를 하나의 로컬 검색
projection으로 합칩니다. 이 단계는 검색 가능한 index/rebuild/report와 stale result
guard를 제공하지만 `/ops/events` 제품 UI나 vector search는 만들지 않습니다.

포함:

- EventRecord 기반 source/channel/event/status/scenario/time projection
- latest FeatureSet revision의 searchable feature/tag projection
- EvidenceManifest의 eventFrame, representativeImage, bboxCrop, frameBundle 상태 tag
- operator review state, classification, incident status, pin 상태 projection
- rebuild report와 orphan/stale/privacy rejected count
- rebuild 시 이전 결과를 제거하는 stale result guard
- S06 Search DSL 기반 text/tags/filter search

비범위:

- `/ops/events` 검색/detail UI
- vector search 또는 embedding search
- semantic provider rerank
- raw LLM/VLM prompt 또는 raw provider response durable retention
- client/viewer exposure
- retention cleanup delete/dry-run 실행
- 30분/120분 longrun 또는 UI 풀테스트 evidence

## Index Contract

Index report schema는 `media-server.v300-feature-search-index-report.v1`입니다.
Search index는 runtime provider를 호출하지 않고, 이미 보존된 structured record만
읽습니다.

Index entry는 아래 projection을 가집니다.

| Projection | Source | Search use |
| --- | --- | --- |
| EventRecord | event id, source, channel, event type, status, scenario, zone, class, timestamp | text/filter/sort base |
| FeatureSet | latest revision, namespace/name/value, evidence ref | feature text, `feature:*`, `evidence:*` tags |
| EvidenceManifest | manifest path, eventFrame, representativeImage, bboxCrop, frameBundle | evidence availability tags |
| Review state | review status, classification, incident status, pin | review filter, pinned filter |

Orphan FeatureSet/EvidenceManifest/review rows without matching EventRecord are not indexed.
Older FeatureSet revisions are skipped when a newer revision for the same event exists.
Any row that contains raw prompt/response/provider material or identity feature flags is rejected.

## Privacy And Boundary Guard

The index records these invariants:

- `rawPromptStored=false`
- `rawProviderResponseStored=false`
- `runtimeProviderCallPerformed=false`
- `vectorSearchPerformed=false`
- `opsEventsUiRequired=false`
- `eventPostPayloadChanged=false`
- `webrtcDataChannelSchemaChanged=false`
- `sseWsMetadataSchemaChanged=false`
- `rtspWebrtcMediaPathChanged=false`
- `viewerClientExposureAdded=false`

## Verification

```bash
./server.sh verify-v300-feature-search-index
./server.sh verify-analysis-state
```

`verify-v300-feature-search-index` checks the fixture, C++ module,
analysis-state smoke, docs, backlog, stream verification, release records,
feature inventory, script inventory, CMake, and `server.sh` dispatch.

This verifier PASS is limited to V300-S07 Feature/Search Index evidence. It is
not `/ops/events` UI evidence, not vector search evidence, not semantic provider
rerank evidence, not retention cleanup execution evidence, not UI 풀테스트
evidence, not 30분/120분 longrun evidence, and not published metadata evidence.
