# VLM Summary Search Candidates

이 문서는 `v2.0.0 V200-S12 VLM summary 검색 후보`의 세부 기준 문서입니다.
S12는 S08 VLMObservation sidecar에 이미 저장된 `summary`, `eventExplanation`,
`falsePositiveHints[]`, `operatorReviewQuestions[]`를 이용해 semantic event search
후보를 산출합니다. 검색은 후보 단계이며 제품 검색 UI, vector index, provider rerank,
runtime VLM 재호출, 자동 rule 적용은 이 단계에서 하지 않습니다.

## 직접 답

S12의 1차 선택값은 `sidecar-summary-token-candidate`입니다. 기본 질문 후보는
`문 근처에서 멈춘 사람`처럼 운영자가 자연어로 기억하는 이벤트를, 저장된
VLMObservation summary에서 찾는 local-only 후보입니다.

Fallback은 `eventId`/`sourceId` 범위로 좁힌 sidecar query와 Ops 수동 review입니다.
대안 후보는 `vector-index-candidate`와 `provider-rerank-candidate`로 남기되, 둘 다
S12에서는 승격하지 않습니다.

제외 대상과 이유:

- EventRecord top-level `vlmSummary` 추가: 기존 EventRecord, Event POST, WebRTC,
  SSE/WS metadata contract를 바꾸므로 제외합니다.
- client/viewer semantic search UI: viewer/client 노출 정책 검토가 별도 필요하므로
  S12에서는 제외합니다.
- runtime VLM re-query/provider rerank: 실제 VLM runtime 또는 cloud provider API 호출을
  만들 수 있으므로 제외합니다.
- 검색 결과 기반 자동 rule 생성/적용: V200-S13 Rule 추천 보조 후보 범위이므로
  S12에서 제외합니다.

## Candidate Schema

Search response schema는 `media-server.vlm-summary-search-candidates.v1`입니다.
개별 후보 schema는 `media-server.vlm-summary-search-candidate.v1`입니다.

주요 field:

- `query`
- `searchMode`
- `candidateStatus`
- `correlationKey`
- `queryTerms[]`
- `candidates[]`
- `matchedTerms[]`
- `matchScore`
- `contract`

`correlationKey`는 `eventId`입니다. 후보는 EventRecord payload에 섞지 않고,
observation sidecar summary와 EventRecord를 `eventId`로만 연결합니다.

## License / Provenance / Privacy Review

S12는 새 모델, runtime, provider, model artifact를 추가하지 않습니다. 모델 license와
provenance는 V200-S01/V200-S05에서 저장한 VLM profile metadata를 참조합니다.

S12 검색 후보는 아래 값을 저장하거나 노출하지 않습니다.

- raw prompt
- raw provider response
- credential material
- source URL
- raw frame bytes

Cloud 외부 전송도 추가하지 않습니다. 저장된 cloud observation을 검색 후보로 다룰
때에도 provider logging/retention 검토는 V200-S11 guard 결과를 따라야 하며, S12
verifier는 새 외부 호출을 PASS evidence로 보지 않습니다.

## Command

```bash
./server.sh verify-vlm-summary-search-candidates
./server.sh verify-analysis-state
./server.sh verify-event-post
./server.sh verify-ws-metadata
```

## Non-Scope

S12에서 하지 않는 일:

- 실제 VLM runtime 호출
- cloud provider API 호출 또는 provider rerank
- vector DB/index 도입
- 제품 검색 UI 또는 viewer/client 노출
- EventRecord top-level schema 변경
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- 자동 Rule/Profile 적용
- V200-S13 rule suggestion 구현

## 완료 기준

- `./server.sh verify-vlm-summary-search-candidates`가 fixture, C++ sidecar summary
  search builder, EventRecord correlation boundary, docs/inventory/server wiring, non-scope
  boundary를 검증합니다.
- `./server.sh verify-analysis-state`가 VLM summary search 후보를 sidecar에서 조회하고
  EventRecord와 `eventId`로만 상관시키는 smoke를 실행합니다.
- `./server.sh verify-event-post`와 `./server.sh verify-ws-metadata`가 기존 외부 payload
  변경이 없음을 확인합니다.
- `git diff --check`가 코드/문서/script whitespace drift를 확인합니다.

이 검증은 제품 검색 UI, semantic 품질 평가, vector/rerank 품질, 장시간 안정화,
UI 풀테스트, V200-S13 rule suggestion 완료를 대신하지 않습니다.

## v2.6.0 S01 Productization Boundary

`V260-S01`은 S12의 `media-server.vlm-summary-search-candidates.v1` 후보를
`/ops/events` incident memory 안의 Ops-only manual review view model로 감쌉니다.
새 wrapper schema는 `media-server.ops.vlm-summary-candidate-review.v1`이고,
`sourceCandidateReport`에 기존 candidate-only report를 그대로 보존합니다.

운영 기본값은 `ops-manual-review-not-auto-applied`입니다. 운영자는 `/ops/events`에서
summary candidate를 incident memory 검색 결과와 나란히 검토할 수 있지만, 이 단계는
viewer/client 비노출을 유지하고 자동 Rule/Profile 적용, runtime VLM 재호출, cloud
provider API 호출, EventRecord/Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media
path 변경을 수행하지 않습니다.

검증:

```bash
./server.sh verify-v260-incident-memory-productization
./server.sh verify-vlm-summary-search-candidates
./server.sh verify-ops-client-ui
./server.sh verify-event-post
./server.sh verify-ws-metadata
git diff --check
```

이 검증은 브라우저 UI 직접 조작, 30분/120분 장시간 안정화, provider 품질 평가,
실제 자동 rule 적용 evidence를 대신하지 않습니다.
