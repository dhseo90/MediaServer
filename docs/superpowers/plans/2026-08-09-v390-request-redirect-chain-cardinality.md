# V390 Request Redirect Chain Cardinality Plan

> 독자: v3.9.0 exact native UI lifecycle 구현·검증 담당자. 이 문서는 이번 결함 수정의 실행 계획이며 테스트/완료 정책의 source-of-truth는 `AGENTS.md`입니다.

**Goal:** request completion 391건의 기존 5분류를 유지하면서 primary document form, HTTP redirect chain, 독립 readback navigation을 action-owned main-frame document hop 단위로 정확히 결속한다.

1. SHA `5a02ce81407de7f297d83d56951f3dc84c57ca9d`의 actual UI-002 RED와 `POST /setup` 302 → `GET /login` 200, epoch 1 → 3을 fixture로 고정한다.
2. canonical 391건 census `9/2/5/1/374`를 유지하고 각 operation에 expected hop method/path/status/redirect target을 선언한다.
3. adapter가 request object identity, request/response sequence, redirected-from request, Location target, status, route, navigation epoch를 operation chain에 기록한다.
4. primary action checkpoint 이후의 document navigation 전수를 scope로 묶어 선언되지 않은 polling/unrelated navigation도 fail-closed한다.
5. source-before epoch와 destination-after epoch 차이가 declared owned document commit 수 `0/1/N`과 정확히 같은지 검증한다. readback hop은 primary hop과 별도 count로 보존한다.
6. wrong/missing/duplicate/reordered/status/route/request binding/redirect target/epoch와 unrelated document navigation negative 계약을 추가한다.
7. actual browser, diagnostic actual, `./test_ui.sh`, 장시간 acceptance/release 테스트를 실행하지 않고 지정된 build·contract·replay·Policy·inventory·docs·syntax·diff·clean-checkout gate만 수행한다.
8. semantic/native drift가 실제 발생한 경우에만 reviewer/producer/generator를 최소 횟수 실행한다. 모든 gate PASS 뒤 단일 commit을 `origin/v3.9.0`에 push한다.
