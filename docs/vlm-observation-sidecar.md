# VLMObservation Sidecar

이 문서는 `v2.0.0 V200-S08 VLMObservation sidecar`의 source-of-truth입니다.
S08은 EventRecord와 기존 live event/metadata payload를 바꾸지 않고, VLM 결과를
별도 JSONL observation 저장소에 기록하는 단계입니다.

## 직접 답

S08 observation schema는 `media-server.vlm-observation.v1`입니다. Correlation report
schema는 `media-server.vlm-observation-correlation-report.v1`입니다. EventRecord와
observation은 `eventId`로만 상관시키며, EventRecord top-level field, Event POST,
WebRTC DataChannel, SSE/WS metadata schema에는 VLM 결과 필드를 추가하지 않습니다.

저장 위치 기본값은 EventRecord active path 옆의 `.vlm-observations.jsonl` 파일입니다.
예를 들어 EventRecord가 `events.jsonl`이면 observation 기본 파일은
`events.vlm-observations.jsonl`입니다.

## Sidecar Fields

- `observationId`
- `eventId`
- `sourceId`
- `ruleId`
- `scenarioId`
- `inputType`
- `inputEvidenceRefs`
- `summary`
- `eventExplanation`
- `falsePositiveHints[]`
- `operatorReviewQuestions[]`
- `ruleSuggestion`
- `uncertainty`
- `provider`
- `model`
- `promptProfile`
- `privacyMode`
- `latencyMs`
- `createdAt`

## Redaction Boundary

Observation 저장소는 다음 값을 저장하지 않습니다.

- raw prompt
- raw provider response
- credential material
- source URL
- raw frame bytes

`redactionReview`와 `contractInvariants`에는 위 경계와 기존 payload/schema/media path
불변 조건을 `false`로 기록합니다.

## Command

```bash
./server.sh verify-vlm-observation-sidecar
./server.sh verify-analysis-state
./server.sh verify-event-post
./server.sh verify-ws-metadata
```

## Non-Scope

S08에서 하지 않는 일:

- 실제 VLM runtime 호출
- cloud provider API 호출
- 이벤트 설명/오탐 힌트 생성 품질 판정
- Ops 이벤트 리뷰 UI 노출
- viewer/client 화면 노출
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- 자동 rule/profile 적용

## 완료 기준

- `./server.sh verify-vlm-observation-sidecar`가 schema fixture, C++ store/query,
  EventRecord correlation report, docs, inventory, non-scope boundary를 확인합니다.
- `./server.sh verify-analysis-state`가 observation 저장, eventId correlation,
  EventRecord payload drift 없음, correlation report를 실행 smoke로 확인합니다.
- `./server.sh verify-event-post`와 `./server.sh verify-ws-metadata`가 기존 외부 payload
  변경이 없음을 확인합니다.
- `git diff --check`가 코드/문서/script whitespace drift를 확인합니다.

이 검증은 실제 VLM runtime 호출, 설명 품질 평가, Ops 리뷰 UI, Privacy/전송 guard,
semantic search 후보, rule 추천 후보, 장시간 안정화, UI 풀테스트 완료를 대신하지 않습니다.
