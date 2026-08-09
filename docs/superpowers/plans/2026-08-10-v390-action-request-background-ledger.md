# V390 Action Request / Background Ledger Plan

> 독자: v3.9.0 exact native UI request ownership 구현·검증 담당자. 이 문서는 이번 결함 수정 계획이며 테스트/완료 정책의 source-of-truth는 `AGENTS.md`입니다.

**Goal:** canonical request completion 391건의 명시 action request envelope와 page bootstrap/polling/SSE/WS/background refresh ledger를 initiating object/sequence로 분리하고 correlation leak을 fail-closed로 검증한다.

1. SHA `a470638ed64987cace31c9a00cdda7f9d1f4000d` actual `424/9/8/1/415`, UI-010 primary `GET /ops/dashboard` 1/1 exact PASS와 동시 background 7/7 action/correlation 오염을 immutable RED로 보존한다.
2. 391건을 method, endpoint template/materialized path, action/correlation scope, document form/exact API fetch로 전수 분류한다.
3. route interceptor는 active scope 전체가 아니라 manifest envelope와 explicit registration에 결속된 exact initiating Playwright request object만 action owner로 claim한다.
4. 명시 action request/response는 method/path/status/object/action/correlation/phase와 manifest cardinality를 exact 검증한다. missing/duplicate/leak/wrong path/wrong phase/reordered response는 fail-closed다.
5. bootstrap/polling/SSE/WS/background refresh는 page-owned ledger에 source owner/phase를 남기고 primary action ID/correlation을 상속하지 않는다. 같은 endpoint도 first explicit registration/sequence 뒤의 request object identity로 분리한다.
6. explicit inner request correlation은 byte-identical preserve하며 EVT-004, UI-001/002/008/009/109 계약을 재검증한다.
7. actual browser, `./test_ui.sh`, 장시간 테스트는 실행하지 않는다. 지정된 build/ownership/correlation/adapter/runtime/native/completion/diagnostic/replay/Policy/acceptance/final-integrity/semantic/feature/inventory/docs/syntax/diff와 branch-bearing clean checkout만 실행한다.
8. semantic/native actual drift가 있을 때만 reviewer/producer/generator를 실행한다. 모든 gate PASS 뒤 commit/push한다.
