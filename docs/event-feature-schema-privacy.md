# Event Feature Schema And Privacy Policy

독자: v3.0 Event Evidence Search MVP를 구현/검증하는 개발자와 테스트 에이전트.
Lifecycle: v3.0.0 `V300-S03 Feature Schema and Privacy Policy`에서 시작한 historical-origin/current-contract 문서이며, 현재 source tree가 이 schema/privacy 계약을 사용하는 동안 유지합니다.
Source-of-truth: AGENTS.md는 개발/테스트/보고 권한의 최상위 규칙이고, 이 문서는 V300-S03 FeatureSet schema와 privacy guard만 정의합니다.

## Scope

이 문서는 Event Evidence Contract와 FrameRef 위에 올라가는 FeatureSet envelope를 정의합니다.
VLM queue, runtime 호출, provider 성공, Search DSL, `/ops/events` UI, retention cleanup 실행은 이 단계의 완료 산출물이 아닙니다.

포함:

- FeatureSet envelope와 feature 단위 공통 필드
- namespace 기반 확장 정책
- 비식별 feature 허용 기준
- identity feature 금지 기준
- raw LLM/VLM prompt와 raw provider response non-retention
- evidence/provenance reference만 보존하는 Privacy Guard

제외:

- background VLM queue/lazy trigger
- real VLM runtime/provider call
- Search DSL/query convert
- `/ops/events` 검색/detail UI
- face recognition, watchlist, face embedding 저장
- license plate, phone number, ID card 같은 searchable identity feature
- UI 풀테스트, 30분/120분 longrun, published metadata PASS

## FeatureSet

FeatureSet은 한 EventRecord의 evidence bundle에서 파생된 구조화 feature 묶음입니다.
Durable record는 raw prompt나 raw response를 저장하지 않고, evidence reference와
non-identifying structured value만 저장합니다.

필수 envelope:

```json
{
  "schema": "media-server.event-feature-set.v1",
  "policyVersion": 1,
  "featureSetId": "features-evt-v300-s03-line-001",
  "eventId": "evt-v300-s03-line-001",
  "sourceId": "cam-lobby",
  "channelId": "main",
  "createdAtMs": 1781950200456,
  "evidenceRefs": {
    "schema": "media-server.vlm-event-evidence-refs.v1",
    "evidenceManifest": "events/evt-v300-s03-line-001/evidence-manifest.json"
  },
  "features": []
}
```

## Feature Envelope

각 feature는 아래 공통 field를 가집니다.

| Field | Required | 설명 |
| --- | --- | --- |
| `featureId` | 예 | FeatureSet 안의 stable id |
| `namespace` | 예 | `appearance`, `action`, `scene`, `spatial`, `event`, `operator`, `embedding` 중 하나 |
| `name` | 예 | namespace 안의 feature name |
| `valueType` | 예 | `string`, `number`, `boolean`, `enum`, `object`, `array` |
| `value` | 예 | structured feature value |
| `confidence` | 예 | 0..1 confidence |
| `uncertainty` | 예 | feature quality note |
| `evidenceRef` | 예 | `eventFrame`, `representativeImage`, `bboxCrop`, `frameBundle` 중 근거 |
| `identityRisk` | 예 | v3.0 durable feature는 `non-identifying`만 허용 |
| `searchable` | 예 | true여도 identity material은 넣을 수 없음 |
| `rawPromptFragmentStored` | 예 | 항상 false |
| `rawProviderResponseFragmentStored` | 예 | 항상 false |

## Allowed Namespace Matrix

| Namespace | 허용 예 | 경계 |
| --- | --- | --- |
| `appearance` | clothing color, headwear presence/color, face visible/occluded/masked state | person name, face recognition match, face embedding으로 승격 금지 |
| `action` | carrying object, moving/stationary, crossing context | 범죄/위험 단정이나 identity inference 금지 |
| `scene` | lighting, weather-visible condition, doorway/counter/zone context | source URL, address, private location identity 저장 금지 |
| `spatial` | zone/line relationship, bbox-relative position | 장기 개인 추적이나 cross-camera identity 연결 금지 |
| `event` | rule/scenario/event action context, false-positive hint category | Event POST/WebRTC/SSE/WS payload schema 변경 금지 |
| `operator` | manual review tag, false-positive note category, pinned reason category | operator free text에서 identity material을 searchable feature로 승격 금지 |
| `embedding` | future optional default-off index eligibility marker | vector payload, faceprint, biometric template 저장 금지 |

## Disallowed Identity Matrix

| Feature | 허용 | 이유 |
| --- | --- | --- |
| person name/account identity | 아니오 | Event evidence search는 non-identifying feature만 저장 |
| face recognition match | 아니오 | biometric identity match로 취급 |
| face embedding/template/faceprint | 아니오 | biometric material이며 v3.0 durable feature 금지 |
| watchlist match | 아니오 | identity/list membership 추론 |
| long-term person re-identification | 아니오 | cross-event/cross-camera identity tracking |
| ID card/phone number/license plate as searchable identity feature | 아니오 | 직접 식별자 또는 강한 개인 식별자 |

`license plate`는 차량 색상/타입 같은 비식별 관찰과 다릅니다. 번호 자체, 번호 OCR,
번호 기반 검색 key는 v3.0 FeatureSet에 저장하지 않습니다.

## Privacy Guard

V300-S03 Privacy Guard는 아래 조건을 만족해야 PASS입니다.

- `rawPromptStored=false`
- `rawProviderResponseStored=false`
- `rawPromptFragmentStored=false`
- `rawProviderResponseFragmentStored=false`
- `identityFeaturesAllowed=false`
- `faceRecognitionAllowed=false`
- `watchlistAllowed=false`
- `faceEmbeddingStored=false`
- durable retention mode는 `feature-only-structured-non-identifying`
- FeatureSet은 EvidenceManifest/FrameRef path를 reference로만 들고 raw image bytes를 inline 저장하지 않음
- EventRecord top-level, Event POST payload, WebRTC DataChannel, SSE/WS metadata schema, RTSP/WebRTC media path를 바꾸지 않음

## Fixture And Verification

샘플 fixture:

- `test/fixtures/event_feature_schema_privacy/feature_set_sample.json`

검증 명령:

```bash
./server.sh verify-v300-feature-schema-privacy
```

이 verifier는 schema/privacy policy, allowed/disallowed matrix, fixture, docs/inventory/release records/server wiring을 확인합니다.
이 명령의 PASS는 VLM queue/runtime/provider success, Search DSL, `/ops/events` UI, UI 풀테스트, 30분/120분 longrun, published metadata 완료 evidence가 아닙니다.
