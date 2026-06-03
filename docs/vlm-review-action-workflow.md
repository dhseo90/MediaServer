# VLM Review Action Workflow

`V210-S07`은 `/ops/events`의 VLM review detail에서 운영자가 설명, 오탐 힌트,
운영자 질문을 `accept`, `dismiss`, `review-needed` action으로 기록하는 workflow입니다.

직접 답: 1차 action은 `accept`입니다. fallback action은 `review-needed`이고,
기본값은 `not-reviewed`입니다. action target은 `summary`, `eventExplanation`,
`falsePositiveHints`, `operatorReviewQuestions` 중 하나입니다.

## Scope

- `vlmAction`은 기존 `/ops/api/events/reviews/{eventId}` review state 안에
  `media-server.ops.vlm-review-action-state.v1` 객체로 저장합니다.
- 저장 범위는 Ops event review JSONL과 audit before/after state입니다.
- `/ops/events`의 VLM review 카드에는 action, target, action note control이 있습니다.
- action note는 기존 review note redaction을 재사용합니다.

## Excluded

- EventRecord top-level payload 변경
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- VLMObservation sidecar write
- 자동 Rule/Profile 저장 또는 적용
- client/viewer 노출
- 실제 VLM runtime/provider 호출

## Verification

```bash
./server.sh verify-vlm-review-action-workflow
./server.sh verify-ops-event-review-inbox
./server.sh verify-vlm-ops-event-review-ui
./server.sh verify-event-post
./server.sh verify-ws-metadata
git diff --check
```

30분/120분 longrun은 runtime queue/cache/media path 변경이 있을 때만 사용자 승인 후
실행합니다. UI PASS는 인앱 브라우저에서 `/ops/events`를 직접 열고 action 저장 결과가
Ops review state에 반영되는지 확인한 evidence가 있을 때만 기록합니다.
