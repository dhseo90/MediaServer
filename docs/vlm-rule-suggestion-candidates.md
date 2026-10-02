# VLM 규칙 후보와 수동 draft

개발자·운영자를 위한 sidecar 후보 → Ops 사건 검토 → `/ops/rules` 폼 연결 안내다.
저장된 `ruleSuggestion`을 재사용하며 실제 모델을 재호출하거나 Rule/Profile을 자동 저장·적용하지 않는다.

## 후보 계약

기준 구현은 [vlm_observation_store.cpp](../src/analysis/vlm_observation_store.cpp)의
`BuildVlmRuleSuggestionCandidatesJson`이다.
[fixture](../test/fixtures/vlm_rule_suggestion/cases.json)는
`media-server.vlm-rule-suggestion-fixtures.v1`이고,
`line-crossing-manual-review`, `intrusion-dwell-manual-review`,
`zone-occupancy-manual-review`를 선택한 후보로 정의한다.

| 항목 | 값·의미 |
| --- | --- |
| 응답 / 후보 schema | `media-server.vlm-rule-suggestion-candidates.v1` / `media-server.vlm-rule-suggestion-candidate.v1` |
| `suggestionMode` | `sidecar-rule-suggestion-candidate` |
| `candidateStatus` | `candidate-only-manual-rule-save` |
| `manualSaveRoute/correlationKey` | `/ops/rules` / `eventId` |
| 후보 내용 | `candidates[]/ruleSuggestion/proposedRuleKind/manualReviewRequired/autoApply/contract` |

`sourceId/privacyMode/suggestionKind`로 필터링하며 후보는 저장 행 순서다.
`autoApply=false`와 `manualReviewRequired=true`가 명시되지 않은 제안은 제외하고
`excludedAutoApplySuggestions/excludedNonManualReviewSuggestions`에 집계한다.
빈/null/잘못된 suggestion·빈 kind/`none`도 후보로 쓰지 않는다.
builder 페이지 크기는 기본 25·최대 100이다. 파일 부재·손상 행·빈 후보는 실제 모델 실패와 다르다.

## Ops 검토에서 폼으로

현재 구현은 단순 미래 UI 후보가 아니라 수동 draft 연결을 제공한다.
[webrtc_http_server_ops_incidents.cpp](../src/ingress/webrtc_http_server_ops_incidents.cpp)의
`OpsIncidentRuleSuggestionReviewJson`과 `OpsVlmRuleSuggestionDraftWorkflowJson`,
[product_ui_page_scripts.cpp](../src/ingress/product_ui_page_scripts.cpp)의
`applyOpsVlmRuleSuggestionDraft`를 함께 본다.

1. `/ops/events`에서 `media-server.ops.incident-rule-suggestion-review.v1`을 검토한다.
   `matchingRuleSuggestion`은 해당 eventId의 observation이고,
   `sourceCandidateReport`는 source 범위 후보 report다. 둘을 같은 단일 후보로 단정하지 않는다.
2. `manualReviewRoute=/ops/events`, `manualDraftRoute=/ops/rules`,
   `draftApiRoute=/ops/api/vlm/rule-suggestion-drafts`로 이동한다.
3. GET draft API는 `media-server.vlm-rule-suggestion-draft-workflow.v1`로 기존 report를 감싼다.
   sourceId/privacyMode/suggestionKind 및 offset/limit을 받고 limit은 기본 10·최대 25다.
4. `폼에 적용`은 이벤트 템플릿 draft를 채운다. geometry·대상 객체·숫자 조건을 검토한 뒤
   기존 저장 버튼을 별도로 눌러야 한다.

sidecar 후보를 이벤트 템플릿 폼으로 옮기는 흐름이며 API의
상태는 `draft-only-manual-save-required`다.
incident wrapper의 상태는 `incident-to-rule-manual-review`,
후보 상태는 `candidate-only-manual-rule-save` 또는 `no-rule-suggestion-candidate`다.
조회는 Ops operator/admin·`ops:read`, 실제 규칙 저장은 별도의 `rule:write` 경계를 따른다.
조회·폼 적용 자체는 `ruleRegistryWritePerformed=false/autoRuleApplied=false/autoProfileApplied=false`다.

fallback은 EventRecord·설명·오탐 힌트와 기존 Rules 폼을 운영자가 직접 검토해 저장하는 방식이다.
fixture의 과거 대안 `rule-suggestion-review-ui-candidate`는 현재 수동 UI 연결과 구분하고,
`provider-rerank-rule-candidate`는 여전히 실행하지 않는다.
자동 생성/적용은 승인 경계를 우회하고, EventRecord 최상위 `ruleSuggestion` 추가는
기존 payload 계약을 바꾸므로 제외한다. viewer/client 노출과 runtime/provider 재질의도 하지 않는다.

## 출처와 검증

새 모델·provider·artifact를 추가하지 않고 기존 profile license/provenance와
[privacy guard](vlm-privacy-transfer-guard.md)를 유지한다. 후보 문자열/JSON은
[sidecar 정제 책임](vlm-observation-sidecar.md#입력-정제-책임)을 따르며 raw prompt/response·
credential·source URL·frame을 넣지 않는다. EventRecord/Event POST/WebRTC DataChannel/SSE/WS·
RTSP/WebRTC 경로는 그대로다.

```bash
./server.sh verify-vlm-rule-suggestion-candidates
./server.sh verify-vlm-rule-suggestion-draft-workflow
./server.sh verify-v260-rule-suggestion-review
./server.sh verify-analysis-state
./server.sh verify-rule-ui
```

후보 검사는 EVT-033·LAB-055, draft 연결은 UI-036·EVT-036·LAB-061이다.
[draft fixture](../test/fixtures/vlm_rule_suggestion/draft_workflow.json)의 schema는
`media-server.vlm-rule-suggestion-draft-workflow-fixture.v1`이다.
앞의 문서/fixture/source 검사는 실제 Rules 저장·권한·브라우저 조작을 실행한 증거가 아니다.
Lab API(LAB-044), Rules roundtrip(RULE-048·066~069), 권한(SAFE-038)은 각 독립 검사를 따른다.
[검증 정책](stream-verification.md#검증-정책)·[UI 풀테스트](manual-ui-fulltest.md)에서
실행 승인과 실제 모델·UI·장시간 미실행을 구분한다.
