# VLM Event Explanation And False-Positive Hints

이 문서는 `v2.0.0 V200-S09 이벤트 설명/오탐 힌트`의 source-of-truth입니다.
S09는 S07 evidence reference와 S08 observation 저장 계약 위에서 이벤트 설명,
화면 내 객체/영역 관계, 오탐 가능성, 운영자 확인 질문을 fixture 기반으로 생성합니다.

## 직접 답

S09 report schema는 `media-server.vlm-event-explanation-report.v1`입니다. 개별 설명
object schema는 `media-server.vlm-event-explanation.v1`입니다. 생성기는
`generate-vlm-event-explanation`이며, 검증기는 `verify-vlm-event-explanation-hints`입니다.

이 단계는 실제 VLM runtime 호출이나 cloud provider API 호출을 하지 않습니다. 출력은
기존 Event POST, WebRTC DataChannel, SSE/WS metadata schema에 섞지 않고 S08의 별도
observation 저장 계약과 호환되는 필드 모양만 생성합니다.

## 생성 필드

- `summary`
- `eventExplanation`
- `objectAreaRelations[]`
- `falsePositiveHints[]`
- `operatorReviewQuestions[]`
- `uncertainty`
- `inputEvidenceRefs`
- `provider`
- `model`
- `promptProfile`
- `privacyMode`
- `latencyMs`
- `createdAt`

## JSON Stability

Fixture 실행은 deterministic clock `1970-01-01T00:00:00Z`와 `latencyMs: 0`을 사용합니다.
동일 fixture를 두 번 실행했을 때 byte-stable JSON이 나와야 하며, verifier가 이 조건을
직접 비교합니다.

## Command

```bash
./server.sh generate-vlm-event-explanation \
  --fixture test/fixtures/vlm_event_explanation/cases.json \
  --json-output /tmp/media_server_vlm_event_explanation.json \
  --report /tmp/media_server_vlm_event_explanation.md
./server.sh verify-vlm-event-explanation-hints
```

## Non-Scope

S09에서 하지 않는 일:

- 실제 VLM runtime 호출
- cloud provider API 호출
- model artifact download
- Ops 이벤트 리뷰 UI 구현
- viewer/client 화면 노출
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- 자동 rule/profile 적용

## 완료 기준

- `./server.sh verify-vlm-event-explanation-hints`가 event explanation fixture,
  false-positive hint fixture, operator question review, JSON stability, docs/inventory/server
  wiring, non-scope boundary를 검증합니다.
- `./server.sh generate-vlm-event-explanation`가 `media-server.vlm-event-explanation-report.v1`
  report와 Markdown report를 생성할 수 있어야 합니다.
- `git diff --check`가 코드/문서/script whitespace drift를 확인합니다.

이 검증은 실제 provider 품질 평가, Ops 리뷰 UI, Privacy/전송 guard, semantic search 후보,
rule 추천 후보, 장시간 안정화, UI 풀테스트 완료를 대신하지 않습니다.
