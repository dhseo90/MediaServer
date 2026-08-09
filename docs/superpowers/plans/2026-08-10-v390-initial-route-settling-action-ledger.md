# V390 Initial Route Settling / Action Ledger Plan

> 독자: v3.9.0 exact native UI lifecycle 구현·검증 담당자. 이 문서는 이번 결함 수정의 실행 계획이며 테스트/완료 정책의 source-of-truth는 `AGENTS.md`입니다.

**Goal:** canonical 424건의 initial/bootstrap document route settling을 primary action ledger보다 먼저 exact attest하고, 마지막 visible owner/epoch 이후의 request/navigation만 action-owned ledger로 결속한다.

1. SHA `fe7c4611dde964c006685db9f794f128c483023a` actual UI-010 RED와 target/attempted/PASS/FAIL/not-run `424/9/8/1/415`, initial `/ops/dashboard` document epoch 1, primary `GET /ops/dashboard` application fetch 오염을 hash-bound fixture로 보존한다.
2. canonical 424건의 requested/settled route, role, HTTP redirect chain, status/Location, visible document/control owner, epoch를 분류하고 exact census를 고정한다.
3. adapter가 initial/bootstrap chain을 immutable attest한 뒤 exact-one visible pre-action owner를 캡처하고 그 이후 checkpoint에서만 action ledger를 시작한다.
4. primary request/response는 같은 Playwright request object identity, action ID, correlation ID, method/path/status로 결속하고 additional fetch call-flow는 action scope 안에서만 계산한다.
5. wrong/missing/duplicate/reordered bootstrap hop, wrong landing/role/status/Location/control/epoch와 action source/request/response/action/correlation drift를 fail-closed negative로 고정한다.
6. UI-001 anonymous `/`→`/login`, UI-002 redirect chain, UI-008 readback roundtrip, UI-109 hidden-source negative를 재검증한다.
7. actual browser, diagnostic actual, `./test_ui.sh`, 장시간 acceptance/release 테스트는 실행하지 않고 지정된 build·contract·replay·Policy·inventory·docs·syntax·diff·clean-checkout gate만 수행한다.
8. semantic/native drift가 실제 발생한 경우에만 reviewer/producer/generator를 최소 횟수 실행한다. 모든 gate PASS 뒤 단일 commit을 `origin/v3.9.0`에 push한다.
