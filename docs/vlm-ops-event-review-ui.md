# VLM Ops Event Review UI

이 문서는 `v2.0.0 V200-S10 Ops 이벤트 리뷰 UI`의 세부 기준 문서입니다.
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

## 현행 Ops 사건 검토 모델

아래는 종료된 개발 일지가 아니라 `/ops/api/events/reviews`가 제공하는 현재 요약 모델의
식별자와 제한이다. 이름에 버전이 포함돼 있어도 공개 식별자를 문서 정리 때문에 바꾸지 않는다.
각 모델은 Ops 전용이며 EventRecord 최상위 필드·Event POST·WebRTC/SSE/WS·미디어 경로를
확장하지 않는다. 목록의 존재를 실제 UI 조작이나 장시간 검증 결과로 사용하지 않는다.

| 응답 필드 | schema | 현재 의미와 제한 |
| --- | --- | --- |
| `incidentTriageBoard` | `media-server.ops.incident-triage-board.v1` | 사건·검토 상태를 lane/filter/sort로 정리. 자동 조치나 viewer/client 노출 없음 |
| `incidentDecisionScorecard` | `media-server.ops.incident-decision-scorecard.v1` | 사건·source health·유사 사건·VLM 후보·review age 기반 우선순위 이유. provider 호출·raw JSON/source URL 표시 없음 |
| `operationalActionPack` | `media-server.ops.operational-action-pack.v1` | 정제 evidence bundle·rule draft·alert dry-run·source health 재확인 링크. 실제 외부 발송·자동 registry write 없음 |
| `ruleWhatIfPreview` | `media-server.ops.rule-what-if-preview.v1` | 선택 사건과 rule suggestion의 저장 전 조건 비교. `/ops/rules` 수동 draft 경로만 제공하며 full replay·자동 저장/적용 없음 |
| `operatorOutcomeMemory` | `media-server.ops.operator-outcome-memory.v1` | 기존 Ops review/audit의 accept/dismiss/review-needed 결과를 deterministic history hint로 표시. 새 저장소·자동 학습·EventRecord 최상위 변경 없음 |
| `incidentActionReadinessQueue` | `media-server.ops.incident-action-readiness-queue.v1` | ready/blocked/field-smoke-needed/not-run 구분. 수동 승인 필요, 외부 발송·자동 action write 없음 |
| `approvalGatedRuleDraftReadiness` | `media-server.ops.approval-gated-rule-draft-readiness.v1` | approvalState·validationSummary·stagedDraft 표시. 수동 저장 전 Rule/Profile registry write·자동 적용·full replay 없음 |
| `evidenceIntakeFieldReadiness` | `media-server.ops.evidence-intake-field-readiness.v1` | 정제 evidence·source health·field 조건의 passed/failed/blocked/not-run 구분. credential/endpoint 없는 성공 주장과 비밀/raw/debug/provider 원문 노출 금지 |
| `runtimeEvidenceWindow` | `media-server.ops.runtime-evidence-window.v1` | 사건에 연결된 bounded runtime/source/event summary. page/session 또는 bounded local buffer이며 persistent archive·30분/120분 증거 대체 아님 |

기능 ID·검증 명령은 [현재 기능 정의](project-feature-test-inventory.md)를,
실제 UI 조작과 관측 조건은 [UI 체크리스트](manual-ui-checklist.md)를 따른다.

## Verification

```bash
./server.sh verify-vlm-ops-event-review-ui
./server.sh verify-ops-event-review-inbox
```

S10 UI 직접 확인은 Codex 인앱 브라우저에서 `/ops/events`, `/client/live`,
`/client/dashboard`를 열어 수행합니다. Chrome/CDP fallback은 인앱 브라우저가 없는
외부 환경에서만 사용하며, Codex close evidence로 사용하지 않습니다.

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
