# VLM Rule Suggestion Candidates

이 문서는 `v2.0.0 V200-S13 Rule 추천 보조 후보`의 세부 기준 문서입니다.
S13은 S08 VLMObservation sidecar에 이미 저장된 `ruleSuggestion` object를 읽어
line-crossing, intrusion-dwell, zone-occupancy 후보를 산출합니다. 후보는 운영자
검토와 `/ops/rules` 수동 저장을 돕기 위한 것이며, 자동 Rule/Profile 생성이나 적용은
하지 않습니다.

## 직접 답

S13의 1차 선택값은 `sidecar-rule-suggestion-candidate`입니다. 실제 선택 후보는
`line-crossing-manual-review`, `intrusion-dwell-manual-review`,
`zone-occupancy-manual-review`입니다.

Fallback은 EventRecord, VLM 설명/오탐 힌트, 기존 `/ops/rules` form을 운영자가 직접
검토해 수동 저장하는 흐름입니다. 대안 후보인 `rule-suggestion-review-ui-candidate`와
`provider-rerank-rule-candidate`는 이번 단계에서 승격하지 않습니다.

제외 대상과 이유:

- 자동 Rule/Profile 생성 또는 적용: 기존 rule registry write와 운영 승인 경계를
  우회하므로 제외합니다.
- EventRecord top-level `ruleSuggestion` 추가: 기존 EventRecord, Event POST, WebRTC,
  SSE/WS metadata contract를 바꾸므로 제외합니다.
- client/viewer rule suggestion UI: viewer/client 노출 정책 검토가 별도 필요하므로
  S13에서는 제외합니다.
- runtime VLM re-query/provider rerank: 실제 VLM runtime 또는 cloud provider API 호출을
  만들 수 있으므로 제외합니다.

## Candidate Schema

Response schema는 `media-server.vlm-rule-suggestion-candidates.v1`입니다.
개별 후보 schema는 `media-server.vlm-rule-suggestion-candidate.v1`입니다.

주요 field:

- `suggestionMode`
- `candidateStatus`
- `manualSaveRoute`
- `correlationKey`
- `candidates[]`
- `ruleSuggestion`
- `proposedRuleKind`
- `manualReviewRequired`
- `autoApply`
- `contract`

`correlationKey`는 `eventId`입니다. 후보는 EventRecord payload에 섞지 않고,
observation sidecar와 EventRecord를 `eventId`로만 연결합니다.

## License / Provenance / Privacy Review

S13은 새 모델, runtime, provider, model artifact를 추가하지 않습니다. 모델 license와
provenance는 V200-S01/V200-S05에서 저장한 VLM profile metadata를 참조합니다.

S13 rule suggestion 후보는 아래 값을 저장하거나 노출하지 않습니다.

- raw prompt
- raw provider response
- credential material
- source URL
- raw frame bytes

Cloud 외부 전송도 추가하지 않습니다. 저장된 cloud observation을 후보로 다룰 때에도
provider logging/retention 검토는 V200-S11 guard 결과를 따라야 하며, S13 verifier는
새 외부 호출을 PASS evidence로 보지 않습니다.

## Command

```bash
./server.sh verify-vlm-rule-suggestion-candidates
./server.sh verify-vlm-rule-suggestion-draft-workflow
./server.sh verify-analysis-state
./server.sh verify-rule-ui
git diff --check
```

## v2.1.0 S08 Draft Workflow

V210-S08은 이 문서의 V200-S13 후보를 제품 `/ops/rules` 화면의 이벤트 템플릿
draft로만 가져갑니다. API schema는
`media-server.vlm-rule-suggestion-draft-workflow.v1`이며,
`/ops/api/vlm/rule-suggestion-drafts`가 기존
`media-server.vlm-rule-suggestion-candidates.v1` 후보 report를
`sourceCandidateReport`로 감싸 반환합니다.

운영 기본값은 `sidecar-candidate-to-ops-rules-event-template-draft`입니다.
운영자는 후보를 `폼에 적용`한 뒤 기존 `/ops/rules` composer 저장 버튼으로
수동 저장해야 합니다. draft 적용 자체는 Rule/Profile registry write, 자동 적용,
VLM runtime/provider 호출, EventRecord/Event POST/WebRTC/SSE/WS schema 변경,
RTSP/WebRTC media path 변경, client/viewer 노출을 수행하지 않습니다.

## v2.6.0 S02 Incident-to-rule Review

`V260-S02`는 기존 V200-S13 candidate와 V210-S08 draft workflow를 새 schema로
바꾸지 않고, `/ops/events` incident review row 안에 Ops-only 검토 연결만 추가합니다.
wrapper schema는 `media-server.ops.incident-rule-suggestion-review.v1`입니다.

직접 답: rule suggestion 후보의 제품 연결 기본값은
`incident-to-rule manual review`입니다. 운영자는 `/ops/events`에서 matching sidecar
`ruleSuggestion`을 보고, `draft-only manual save` 경계가 유지되는 `/ops/rules`
draft workflow로 이동해 기존 저장 버튼을 수동으로 누를 때만 rule/template을 저장합니다.

S02 wrapper는 아래 값을 표시합니다.

- `matchingRuleSuggestion`: matching eventId sidecar observation의 `ruleSuggestion`
- `sourceCandidateReport`: 기존 `media-server.vlm-rule-suggestion-candidates.v1` report
- `manualReviewRoute`: `/ops/events`
- `manualDraftRoute`: `/ops/rules`
- `draftApiRoute`: `/ops/api/vlm/rule-suggestion-drafts`
- `candidateStatus`: `candidate-only-manual-rule-save` 또는 `no-rule-suggestion-candidate`

S02는 자동 Rule/Profile 적용, rule registry write, runtime VLM 호출, cloud provider
호출, EventRecord/Event POST/WebRTC/SSE/WS payload/schema 변경, RTSP/WebRTC media path
변경, client/viewer 노출을 수행하지 않습니다.

검증:

```bash
./server.sh verify-v260-rule-suggestion-review
./server.sh verify-vlm-rule-suggestion-candidates
./server.sh verify-vlm-rule-suggestion-draft-workflow
./server.sh verify-rule-ui
```

## Non-Scope

S13에서 하지 않는 일:

- 실제 VLM runtime 호출
- cloud provider API 호출 또는 provider rerank
- 자동 Rule/Profile 생성 또는 적용
- rule registry write 수행
- 자동 저장 rule suggestion UI 또는 viewer/client 노출
- EventRecord top-level schema 변경
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- V200-S14 테스트 inventory 전체 확장

## 완료 기준

- `./server.sh verify-vlm-rule-suggestion-candidates`가 fixture, C++ sidecar rule suggestion
  builder, analysis-state smoke, docs/inventory/server wiring, no-auto-apply boundary를
  검증합니다.
- `./server.sh verify-analysis-state`가 sidecar observation에서 후보를 만들고 EventRecord와
  `eventId`로만 상관시키는 smoke를 실행합니다.
- `./server.sh verify-rule-ui`가 기존 `/ops/rules` smoke selector와 Rule/Profile 저장
  흐름이 유지되는지 확인합니다.
- `git diff --check`가 코드/문서/script whitespace drift를 확인합니다.

이 검증은 제품 rule suggestion UI, 실제 provider 품질 평가, 자동 rule 적용, 장시간
안정화, UI 풀테스트, V200-S14 inventory 전체 확장을 대신하지 않습니다.
