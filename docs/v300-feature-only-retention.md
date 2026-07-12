# V300 Feature-only Retention

독자: v3.0 Event Evidence Search MVP를 구현/검증하는 개발자와 테스트 에이전트.
Lifecycle: v3.0.0 `V300-S05 Feature-only Retention`에서 시작한 historical-origin/current-contract 문서이며, 현재 source tree가 이 retention 계약을 사용하는 동안 유지합니다.
Source-of-truth: AGENTS.md는 개발/테스트/보고 권한의 최상위 규칙이고, 이 문서는 V300-S05 feature-only durable retention과 reanalysis policy 경계만 정의합니다.

## Scope

S05는 V300-S03 FeatureSet schema와 V300-S04 VLM Feature Queue에서 산출한 structured
FeatureSet을 durable retention 대상으로 승격하되, raw prompt/response non-retention
경계를 코드와 verifier로 닫는 단계입니다.

포함:

- `media-server.event-feature-set.v1` FeatureSet revision store
- raw prompt/response non-retention guard
- raw provider response, provider request body, credential, source URL, raw frame bytes rejection
- reanalysis policy: 기존 revision을 덮어쓰지 않고 새 feature revision 생성
- previous revision 보존과 source evidence refs 유지
- provider replay 없이 stored evidence refs와 structured FeatureSet만 보존
- EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path 불변

제외:

- Search DSL/query convert
- `/ops/events` 검색/detail UI
- Retention/Pin/Cleanup lifecycle delete, cleanup dry-run, audit apply
- raw prompt와 raw provider response durable retention
- provider replay evidence 또는 real provider success
- UI 풀테스트, 30분/120분 longrun, published metadata PASS

## Retention Contract

`VlmFeatureRetentionStore`는 structured FeatureSet JSON을 받아
`media-server.vlm-feature-retention-record.v1` record를 반환합니다. record는
`feature-only-structured-non-identifying` retention mode를 사용하고 아래 값을 false로
고정합니다.

- `rawPromptStored`
- `rawProviderResponseStored`
- `providerRequestBodyStored`
- `credentialStored`
- `sourceUrlStored`
- `rawFrameBytesStored`
- `runtimeProviderReplayPerformed`

raw material key가 포함된 입력은 `reject-raw-provider-material`로 거부하며
FeatureSet revision을 생성하지 않습니다.

## Reanalysis Policy

재분석은 기존 revision을 수정하지 않습니다. operator-triggered reanalysis 요청은
`store-reanalysis-revision` action으로 새 revision을 만들고, record에
`previousRevision`, `reanalysis.reason`, `previousRevisionPreserved=true`를 남깁니다.

이 정책은 provider replay 성공이나 raw provider response 보관을 의미하지 않습니다.
재분석 결과도 structured FeatureSet revision만 보존합니다.

## Verification

Fixture:

- `test/fixtures/v300_feature_only_retention/cases.json`

명령:

```bash
./server.sh verify-analysis-state
./server.sh verify-v300-feature-only-retention
```

`verify-analysis-state`는 C++ smoke에서 feature revision store, raw prompt rejection,
raw provider response rejection, reanalysis revision, previous revision 보존을 직접
실행합니다.
`verify-v300-feature-only-retention`은 fixture, module, docs, backlog, stream
verification, feature inventory, release records, server dispatch 연결을 확인합니다.

이 명령들의 PASS는 Search DSL, `/ops/events` UI, Retention/Pin/Cleanup lifecycle,
UI 풀테스트, 30분/120분 longrun, published metadata 완료 evidence가 아닙니다.
