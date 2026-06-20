# V300 VLM Feature Queue

독자: v3.0 Event Evidence Search MVP를 구현/검증하는 개발자와 테스트 에이전트.
Lifecycle: v3.0.0 `V300-S04 VLM Feature Queue` active release target 동안 유지합니다.
Source-of-truth: AGENTS.md는 개발/테스트/보고 권한의 최상위 규칙이고, 이 문서는 V300-S04 queue contract와 VLM-only failure 경계만 정의합니다.

## Scope

S04는 V300-S02 evidence refs와 V300-S03 FeatureSet schema 사이에 있는 VLM feature 작업 경계입니다.
background queue와 lazy trigger를 제공하되 real VLM runtime/provider 호출은 수행하지 않습니다.
이 단계는 queue outcome, structured FeatureSet revision, missing-runtime, queue-timeout,
invalid-output을 media/event 경로와 분리하는지 확인합니다.

포함:

- background queue enqueue와 bounded queue size
- lazy trigger 실행 경계
- `missing-runtime`, `queue-timeout`, `invalid-output` VLM-only failure
- `media-server.event-feature-set.v1` structured FeatureSet revision 산출
- raw prompt, raw provider response, credential, source URL, raw frame bytes non-retention
- EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path 불변

제외:

- real VLM runtime/provider 호출
- cloud provider success 또는 model 품질 PASS
- raw prompt와 raw provider response durable retention
- Search DSL/query convert
- `/ops/events` 검색/detail UI
- UI 풀테스트, 30분/120분 longrun, published metadata PASS

## Queue Contract

`VlmFeatureQueue`는 EventRecord/evidence bundle에서 파생된 `VlmFeatureQueueTask`를 받아
provider 호출 없이 deterministic outcome을 반환합니다.

Task 필드:

| Field | 설명 |
| --- | --- |
| `task_id` | queue 작업 stable id |
| `event_id` | EventRecord correlation key |
| `source_id` / `channel_id` | evidence source scope |
| `trigger_mode` | `background` 또는 `lazy` |
| `input_evidence_refs_json` | `media-server.vlm-event-evidence-refs.v1` reference JSON |
| `queue_wait_ms` | timeout/drop fixture 판정용 대기 시간 |

Outcome schema는 `media-server.vlm-feature-queue-outcome.v1`입니다. 모든 outcome은 아래
side-effect invariant를 false로 유지해야 합니다.

- `runtimeProviderCallPerformed`
- `mediaPathBlocked`
- `eventRecordBlocked`
- `metadataFanoutBlocked`
- `eventPostDispatchBlocked`
- `eventPostPayloadChanged`
- `webrtcDataChannelSchemaChanged`
- `sseWsMetadataSchemaChanged`
- `rtspWebrtcMediaPathChanged`
- `viewerClientExposureAdded`
- `rawPromptStored`
- `rawProviderResponseStored`
- `credentialStored`

## Outcome Matrix

| Case | 기대 status | queue action | failure reason | 경계 |
| --- | --- | --- | --- | --- |
| background queue | `queued` 후 `completed` | `enqueue-background` / `store-feature-set` | 없음 | bounded queue가 FeatureSet revision을 생성 |
| lazy trigger | `completed` | `run-lazy-trigger` | 없음 | background backlog 없이 explicit lazy request만 처리 |
| missing-runtime | `blocked` | `do-not-enqueue` | `missing-runtime` | FeatureSet 저장 없이 VLM-only blocked |
| queue-timeout | `failed` | `drop-vlm-task` | `queue-timeout` | media/EventRecord/metadata/Event POST backpressure 전파 없음 |
| invalid-output | `failed` | `discard-invalid-output` | `invalid-output` | invalid structured output을 저장하지 않음 |

## FeatureSet Revision

성공 outcome은 `media-server.event-feature-set.v1` JSON을 저장 대상으로 반환합니다.
이 FeatureSet은 `featureRevision`을 포함하고, V300-S03 privacy guard를 유지합니다.

필수 privacy 값:

- `rawPromptStored=false`
- `rawProviderResponseStored=false`
- `identityFeaturesAllowed=false`
- `faceRecognitionAllowed=false`
- `watchlistAllowed=false`
- `faceEmbeddingStored=false`
- `credentialStored=false`

## Verification

Fixture:

- `test/fixtures/v300_vlm_feature_queue/cases.json`

명령:

```bash
./server.sh verify-analysis-state
./server.sh verify-v300-vlm-feature-queue
```

`verify-analysis-state`는 C++ smoke에서 queue behavior를 직접 실행합니다.
`verify-v300-vlm-feature-queue`는 fixture, module, docs, backlog, stream verification,
feature inventory, release records, server dispatch 연결을 확인합니다.

이 명령들의 PASS는 real provider success, Search DSL, `/ops/events` UI, UI 풀테스트,
30분/120분 longrun, published metadata 완료 evidence가 아닙니다.
