# VLM Ops Event Review UI

이 문서는 `v2.0.0 V200-S10 Ops 이벤트 리뷰 UI`의 source-of-truth입니다.
S10은 `/ops/events`의 Rule Event Review Inbox에서 EventRecord, snapshot/short clip
evidence 상태, VLM 설명/오탐 힌트/운영자 질문을 함께 보여주는 Ops 전용 화면 작업입니다.

## 직접 답

Ops review API는 각 review item에 `vlmReview` object를 붙입니다. 이 object의 schema는
`media-server.ops.vlm-event-review.v1`입니다. `vlmReview`는 EventRecord top-level field가
아니며, Event POST, WebRTC DataChannel, SSE/WS metadata schema에도 추가하지 않습니다.

viewer/client 화면에는 `ops-vlm-event-review-card` 또는 VLM review panel을 노출하지
않습니다.

## UI 표시 범위

- EventRecord 존재 여부
- snapshot evidence 존재 여부
- short clip evidence 존재 여부
- S07 `metadata.vlmEvidenceRefs` 존재 여부
- S08 observation matching 여부
- VLM `summary`
- `eventExplanation`
- `falsePositiveHints[]`
- `operatorReviewQuestions[]`

## Verification

```bash
./server.sh verify-vlm-ops-event-review-ui
./server.sh verify-ops-event-review-inbox
```

S10 UI 직접 확인은 Codex 인앱 브라우저에서 `/ops/events`, `/client/live`,
`/client/dashboard`를 열어 수행합니다. Chrome/CDP 기반 `verify-ops-client-ui`와
`verify-ops-client-ui --screenshots`는 이번 S10 close evidence로 사용하지 않습니다.

## Non-Scope

S10에서 하지 않는 일:

- viewer/client 노출
- EventRecord top-level schema 변경
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- 자동 rule/profile 적용
- Privacy/전송 guard 전체 구현
- semantic search 또는 rule suggestion 구현

## 완료 기준

- `/ops/api/events/reviews`가 EventRecord payload를 바꾸지 않고 Ops 전용 `vlmReview`를 반환합니다.
- `/ops/events` review inbox가 EventRecord, snapshot/clip evidence, VLM explanation,
  false-positive hints, operator questions를 한 행에서 표시합니다.
- `./server.sh verify-vlm-ops-event-review-ui`가 API/UI/비노출/불변 조건을 검증합니다.
- Codex 인앱 브라우저에서 `/ops/events`의 VLM review panel 표시와 `/client/live`,
  `/client/dashboard` viewer/client 비노출을 직접 확인합니다.
- `git diff --check`가 코드/문서/script whitespace drift를 확인합니다.

이 검증은 v2.0.0 전체 UI 풀테스트, 장시간 안정화, Privacy/전송 guard, semantic search,
rule suggestion 완료를 대신하지 않습니다.
