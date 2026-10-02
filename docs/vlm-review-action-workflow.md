# VLM 설명에 대한 운영자 검토 기록

운영자는 `/ops/events`의 VLM 검토 카드에서 설명·오탐 힌트·질문을 읽고 판단을 기록한다.
이는 모델 재평가나 Rule/Profile 적용 명령이 아니라 Ops 검토 metadata다.
기본 동선과 화면 범위는 [Ops 이벤트 검토](vlm-ops-event-review-ui.md)를 따른다.

## 값과 저장 범위

| 필드 | 허용 값 |
| --- | --- |
| `action` | `not-reviewed`(기본), `accept`, `dismiss`, `review-needed` |
| `target` | `summary`, `eventExplanation`(기본), `falsePositiveHints`, `operatorReviewQuestions` |
| `note` | 운영자의 정제된 검토 메모 |

[fixture](../test/fixtures/vlm_review_action_workflow/cases.json)는
`media-server.vlm-review-action-workflow-fixtures.v1`이다.
fixture의 primary는 `accept`, fallback은 `review-needed`지만 운영자가 설명을
무조건 수락해야 한다는 권고가 아니다. 실제 판단에 따라 dismiss 또는 추가 검토를 선택한다.

`POST/PUT /ops/api/events/reviews/{eventId}`의 `vlmAction`은
`media-server.ops.vlm-review-action-state.v1`로 기존 Ops review JSONL에 저장된다.
조회·갱신 모두 현재 Ops operator/admin·`ops:read` guard를 따른다.
이 경로는 Rules 저장이 아니며 추가 `rule:write`를 요구한다고 가정하지 않는다.
audit에는 기존 review의 before/after가 남는다.

[webrtc_http_server_ops_foundation.cpp](../src/ingress/webrtc_http_server_ops_foundation.cpp)의
`UpsertOpsEventReviewState`가 action/target을 정규화하고
`NormalizeOpsEventReviewNote`로 제어 문자·길이와 민감 패턴을 처리한다.
화면 메모 maxlength는 300, 서버 정규화 상한은 500바이트다.
정규화는 임의 비밀을 완벽히 탐지하는 기능이 아니므로 credential/token/source URL/raw JSON/debug
본문을 메모에 넣지 않는다. 새 모델·제3자 결과를 추가하는 흐름이 아니며 출처는 운영자 입력이다.

## 사용·검증

`data-testid="ops-vlm-review-action-controls"`에서 action·target·메모를 고른 뒤
기존 review 저장 버튼을 누르고 저장된 review state를 다시 확인한다.
`eventReviewVlmHtml` 및 저장 payload는
[product_ui_page_scripts.cpp](../src/ingress/product_ui_page_scripts.cpp)에 있다.

```bash
./server.sh verify-vlm-review-action-workflow
./server.sh verify-ops-event-review-inbox
./server.sh verify-vlm-ops-event-review-ui
./server.sh verify-event-post
./server.sh verify-ws-metadata
```

LAB-060의 첫 명령은 fixture·API/저장/UI source 연결을 정적으로 검사한다.
실제 API roundtrip·브라우저 저장은 각 별도 검사/직접 관측으로 확인해야 한다.
[검증 정책](stream-verification.md#검증-정책)과 [UI 풀테스트](manual-ui-fulltest.md)를 적용한다.

저장은 Ops review/audit 범위이며 observation sidecar나 EventRecord 최상위를 바꾸지 않는다.
자동 Rule/Profile 저장·적용, VLM/provider 호출, Event POST/WebRTC DataChannel/SSE/WS schema·
RTSP/WebRTC 경로 변경, viewer/client 노출은 추가하지 않는다.
