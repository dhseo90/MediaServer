# Ops 이벤트와 VLM 설명 검토

운영자는 `/ops/events`의 Rule Event Review Inbox에서 EventRecord와 evidence 참조,
저장된 VLM 설명을 함께 검토한다. 이 경로는 Ops 진단/상세 검토용이며 primary nav가 아니다.
조회·검토 API는 Ops operator/admin·`ops:read` 경계 안에 있고 Client/viewer에는
`ops-vlm-event-review-card`와 VLM 내부 검토 정보를 노출하지 않는다.

## 응답과 화면 해석

`/ops/api/events/reviews`의 각 item에 붙는 `vlmReview` schema는
`media-server.ops.vlm-event-review.v1`이다.
[webrtc_http_server_ops_incidents.cpp](../src/ingress/webrtc_http_server_ops_incidents.cpp)의
`OpsVlmEventReviewJson`이 eventId로 observation 한 건을 조회한다.
현재 저장 순서의 첫 일치 항목을 사용하므로 “최신 모델 결과”로 단정하지 않는다.

- `eventRecordPresent`: 전달된 EventRecord JSON이 있는지 나타낸다.
- `snapshotPathPresent/clipPathPresent`: 경로 문자열 유무다. 실제 파일 존재·재생 검증이 아니다.
- `vlmEvidenceRefsPresent`: metadata에 참조 키가 있는지 나타낸다.
- `observationStoreExists/observationQueryOk/observationPresent/observationError`: 저장소·조회·일치 여부를 구분한다.
- `explanation.summary/eventExplanation/falsePositiveHints[]/operatorReviewQuestions[]`: 저장된 설명과 검토 맥락이다.

관측이 없으면 pending 안내와 evidence 확인 질문을 표시하며 새 모델을 호출하지 않는다.
[product_ui_page_scripts.cpp](../src/ingress/product_ui_page_scripts.cpp)의
`eventReviewVlmHtml`은 EventRecord/snapshot/clip/설명 badge, 요약·설명 및 힌트/질문을
렌더링한다. 현재 카드의 힌트와 질문은 각각 앞의 두 개만 보여준다.
이는 clip 재생 성공이나 설명 품질을 판정한 화면이 아니다.

action/target/note 저장은 [검토 action](vlm-review-action-workflow.md),
사건에서 규칙 폼으로 옮기기는 [수동 규칙 draft](vlm-rule-suggestion-candidates.md),
검색 후보는 [요약 검색](vlm-summary-search-candidates.md)을 따른다.
원문 텍스트는 [sidecar 입력 정제](vlm-observation-sidecar.md#입력-정제-책임)가 전제이며
escaping이나 계약 flag만으로 비밀이 제거됐다고 판단하지 않는다.

## 현행 Ops 사건 검토 모델

아래 모델은 현재 Ops 응답 계약이다. 버전이 들어간 식별자는 그대로 유지하며
자동 조치·실제 field 성공·UI/장시간 완료와 구분한다.

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

이 모델들은 Ops 전용 wrapper이며 EventRecord 최상위나 Event POST/WebRTC DataChannel/SSE/WS
payload, RTSP/WebRTC 경로에 검토 정보를 넣지 않는다.
기능 ID·명령은 [기능별 정의](project-feature-test-inventory.md),
사용 흐름은 [UI 가이드](ui-guide.md), 실제 관측 항목은 [UI 체크리스트](manual-ui-checklist.md)를 따른다.

## 검사와 실제 UI

```bash
./server.sh verify-vlm-ops-event-review-ui
./server.sh verify-ops-event-review-inbox
```

첫 명령(UI-032)은 API/UI source·selector·client 비노출·EventRecord/Event POST 경계를
정적으로 읽는다. source 검사나 raw JSON 조회만으로 화면 렌더링·권한·저장 roundtrip을
확인했다고 기록하지 않는다.

실제 화면 확인에서는 Ops의 evidence/설명/대기·오류·action 저장 상태와
`/client/live`, `/client/dashboard`의 비노출을 함께 관측한다.
브라우저/자동화 방식의 적격 조건은 [UI 풀테스트](manual-ui-fulltest.md),
별도 실행 승인과 기록은 [검증 정책](stream-verification.md#검증-정책)을 따른다.
이 문서는 실행 결과가 아니며 실제 VLM/provider 품질·장시간 완료를 보증하지 않는다.
