# v3.9.0 Verification Runner Rebase Design

> 독자: v3.9.0 UI actual 실행기와 Policy v4 evidence를 유지보수하는 개발자 및 검증자.
> Lifecycle: `327afe0d4b3282400f1925252c59a53b87827224`에서 시작한 verification rebase의 설계 source-of-truth이며, 구현·actual·RC closure가 끝난 뒤 historical design evidence로 보존한다.
> 상위 규칙: 개발·테스트·커밋·푸시·완료 판정은 저장소 루트 `AGENTS.md`가 우선한다.

## 목적

Playwright callback에서 lifecycle을 추론하고 assertion을 던지는 기존 실행기를 capture-only recorder, post-case evaluator, case-isolated parent/child runner로 재기준화한다. 기존 v3.9.0 제품 코드와 외부 계약은 그대로 유지하면서 canonical 424건을 모두 시도하고 전체 failure census를 남길 수 있게 한다.

기준 source는 commit `327afe0d4b3282400f1925252c59a53b87827224`이며 작업 브랜치는 `v3.9.0-verification-rebase`다. `src/**`, 제품 API schema, event/WebRTC/SSE/WS payload, UI renderer는 동결한다.

## 확인된 RED

- Actual source: `327afe0d4b3282400f1925252c59a53b87827224`
- Case: `UI-001`
- Error: `action redirect chain parent resourceType mismatch`
- Failure path: `v390_ui_native_adapter.mjs`의 Playwright `request` callback → `classifyRequestLifecycleOwnership()` → callback 밖으로 전파된 assertion
- Consequence: runner가 case summary를 만들기 전에 종료되어 UI-002 이후 423건의 결과를 확인하지 못함
- Local evidence: `.media_server.test/v3.9.0/ui-acceptance-current/first-failure.json`과 해당 run의 `ui-exact-424.log`

이 evidence는 TDD RED fixture의 source일 뿐 Policy v4 PASS 또는 새 actual evidence가 아니다.

## 검토한 접근

### 1. 기존 lifecycle helper 부분 보정

현재 `pendingRequests`, `responseRequestBindings`, mutable active owner를 유지하면서 redirect 분기만 추가한다. 변경량은 작지만 callback throw, 불완전 metadata, stale owner, replay common-mode를 유지하므로 채택하지 않는다.

### 2. Capture/evaluate 분리, 동일 프로세스 fail-continue

callback을 capture-only로 바꾸고 case 종료 후 평가하되 canonical 424를 한 프로세스에서 계속 실행한다. lifecycle 판정 결함은 제거하지만 unhandled rejection, page/context 오염, summary writer 손상이 이후 case에 전파될 수 있다.

### 3. Capture/evaluate 분리와 case child 격리

각 case child가 browser context, recorder, evaluator, case summary를 소유하고 parent가 child summary를 검증·집계한다. 일반 assertion 실패는 한 case에 제한하고 server bootstrap, port/runtime contamination, summary write 불가만 infra-fatal로 승격한다. 비용은 child orchestration과 evidence schema가 늘어나는 것이지만 424건 전체 failure census와 fail-closed 격리를 직접 만족하므로 이 방식을 채택한다.

## Capture-only recorder

새 파일 `scripts/internal/v390_ui_request_event_recorder.mjs`가 case-local recorder를 제공한다.

### 인터페이스

```js
createRequestEventRecorder({ caseId, correlationDigest })
  -> {
    recordRequest(request, captureContext),
    recordResponse(response),
    recordRequestFinished(request),
    recordRequestFailed(request, failure),
    snapshot()
  }
```

`recordRequest()`가 생성하는 envelope는 생성 즉시 freeze하며 다음 값을 가진다.

- request object reference와 case-local opaque object identity
- requestId와 strictly increasing sequence
- method, normalized path, resourceType, requestKind
- navigation invocation과 action invocation의 immutable capture-time projection
- correlation digest
- `redirectedFrom()` object reference와 opaque identity
- timestamp

`recordResponse()`는 반드시 `response.request()`가 반환한 object reference로 request envelope에 결속한다. response callback의 current action/navigation state나 URL/path 재검색으로 owner를 추론하지 않는다.

Playwright callback은 recorder 메서드 호출만 수행한다. recorder는 callback에서 발생한 property read, identity registration, response binding 오류를 `captureErrors`에 구조화해 누적하고 callback 밖으로 throw하지 않는다. capture 오류가 있으면 evaluator가 해당 case를 FAIL로 판정한다.

직렬화 evidence에는 raw Playwright object를 넣지 않는다. in-memory evaluation에는 object reference를 보존하고, JSON에는 case-local opaque identity와 digest만 투영한다.

## Post-case lifecycle evaluator

새 파일 `scripts/internal/v390_ui_request_lifecycle_evaluator.mjs`가 recorder snapshot과 case action/navigation invocation ledger를 입력받아 case 종료 후 한 번 평가한다.

### 인터페이스

```js
evaluateRequestLifecycle({
  caseId,
  recorderSnapshot,
  navigationInvocations,
  actionInvocations,
}) -> {
  status: "PASS" | "FAIL",
  classifications,
  failures,
  census,
}
```

authoritative join key는 다음 세 가지뿐이다.

1. request object reference
2. `response.request()` object reference
3. `request.redirectedFrom()` object reference

path-only matching, global active state, case-ID 예외, allowlist, 빈 값 fallback은 사용하지 않는다. method/path/resourceType/requestKind/invocation은 identity join이 끝난 뒤 계약 검증 값으로만 사용한다.

분류는 `bootstrap`, `action`, `redirect`, `background`의 exact-one이어야 한다. 다음 결함은 모두 해당 case FAIL이다.

- request 또는 response identity missing
- response duplicate 또는 request cardinality duplicate
- redirect parent missing/wrong/cross-case
- action owner 또는 invocation missing/wrong/stale
- resourceType/requestKind missing 또는 계약 불일치
- action 종료 뒤 capture된 request의 stale action ownership
- 서로 다른 action의 request/response leak
- captureErrors 비어 있지 않음

evaluator는 실패 배열 전체를 반환하며 첫 assertion에서 중단하지 않는다.

## Runner isolation

기존 exact runner의 case 구현을 child mode와 parent mode로 분리한다.

### Child

- 정확히 한 canonical case만 선택한다.
- browser/context, recorder, evaluator, DOM/API assertion, cleanup을 소유한다.
- case summary 쓰기는 `finally`에서 시도한다.
- lifecycle/DOM/API assertion과 cleanup 가능한 browser failure는 `attempted=1`, `FAIL=1` summary로 반환한다.
- callback capture error는 evaluator failure로 남기며 프로세스 조기 종료 원인이 아니다.
- summary write 실패는 별도의 infra-fatal exit와 parent-readable stderr marker를 남긴다.

### Parent

- canonical manifest 순서로 선택된 모든 child를 정확히 한 번 실행한다.
- 유효한 child FAIL summary와 exit code 1은 case-local failure로 집계하고 다음 case를 실행한다.
- child summary 부재/손상은 summary write 불가로 판정한다.
- server bootstrap 실패, owned port/runtime contamination, summary write 불가만 infra-fatal이다.
- 정상 batch는 `selected=424`, `attempted=424`, `attempted=pass+fail`, `notRun=0`, `unsupported=0`을 강제한다.
- failure census에는 모든 failed case의 failure class, phase, code, object identity digest, request/response cardinality, cleanup 상태를 담는다.

parent는 visual matrix와 Policy v4 producer를 모든 case child 결과가 수집된 뒤 한 번만 실행한다. failure가 있으면 `uiFulltestPass=false`를 유지하면서도 census와 summary를 보존한다.

## TDD 계약

구현 전에 actual RED와 다음 actual-like 계약을 독립 fixture로 등록하고 의도한 실패를 확인한다.

- `UI-001` bootstrap redirect
- `UI-002` action redirect
- representative API fetch
- same-route rejection
- callback property read/recorder capture 오류가 프로세스를 종료하지 않음
- missing resourceType
- wrong redirect parent
- duplicate response
- stale invocation
- cross-action leak

각 negative fixture는 evaluator가 fail-closed reason을 반환해야 한다. child orchestration 계약은 첫 child FAIL 뒤 다음 child가 실행되고, 모든 child가 `finally` summary를 남기며, infra-fatal만 batch abort하는 것을 검증한다.

기존 recorded replay 548/548은 보조 비회귀다. replay PASS는 actual, Policy v4 eligibility, `uiFulltestPass`, final-integrity를 대신하지 않는다. actual-like fixture 기대값은 기존 replay classifier의 PASS 결과를 가져오지 않고 명시적 object graph와 독립 expected failure code로 정의한다.

## Static 검증과 drift 처리

Static 단계는 사용자가 지정한 전체 묶음을 끝까지 PASS시킨 뒤에만 닫는다.

- full build
- native/runtime/completion/adapter/diagnostic contracts
- semantic/feature/inventory/docs/syntax/diff
- branch-bearing clean checkout contract
- recorded replay 548/548 auxiliary regression

static 실패는 actual로 넘어갈 수 없는 수정 대상이다. 실제 generated artifact drift가 확인된 경우에만 기존 공식 generator/producer를 실행하고, 예상 파일을 수동 합성하지 않는다.

Static 전체 PASS 뒤 변경 파일, roadmap/evidence, 개별 테스트 기록을 확인하고 verification branch에 한 번 커밋·push한다. `327afe0d..verificationCommit -- src/**` diff가 비어 있음을 별도 증명한다.

## 독립 actual 프로토콜

독립 actual은 별도 `5.6 Sol / high` 에이전트가 수행한다. 이는 현재 환경에서 Luna가 선택 불가능하고 release correctness 검증에는 `AGENTS.md` 13.4의 Sol/high 상향 규칙이 적용되기 때문이다.

1. origin에서 `git clone --no-local`로 새 clone을 만든다.
2. verification commit을 checkout하고 기존 build/ignored artifact를 사용하지 않는다.
3. checkout-local full build를 수행한다.
4. UI-001, UI-002, representative API fetch, same-route rejection 네 case를 정확히 한 번 실행한다.
5. 4/4 PASS인 경우 canonical 424를 정확히 한 번 실행한다.
6. selected/attempted 424/424와 전체 failure census를 보존한다.
7. failure가 있으면 case별 예외를 추가하지 않고 공통 원인 cluster를 분석한다.
8. 보정이 필요하면 새 commit/push 후 새 `--no-local` clone에서 `./test_ui.sh`를 정확히 한 번 실행한다. 동일 commit 자동 retry는 금지한다.

## RC closure

다음 조건을 모두 직접 증명한 verification commit에만 `v3.9.0-rc-verified` 브랜치를 만들고 origin에 push한다.

- exact attempted/PASS 424/424
- fail/not-run/unsupported/runner abort 모두 0
- Policy v4 eligible 및 qualified 424/424
- `uiFulltestPass=true`
- final-integrity PASS
- cleanup PASS
- independent clone worktree clean
- local/origin commit 동일
- `src/**` 제품 코드 diff 0

RC 브랜치 push 후에는 브랜치를 이동하지 않는다. 하나라도 충족하지 않으면 RC 브랜치를 만들지 않고 완료·전체 폐쇄·release-ready라고 표현하지 않는다.

## 최종 evidence

최종 보고에는 verification commit과 immutable RC commit, 제품 코드 diff 0, exact/Policy/final-integrity 집계, source/manifest/binary SHA, 독립 clone 명령과 경로, summary/first-failure/case evidence 절대 경로, PID/ports/runtime-root cleanup, 사용자가 동일 RC 브랜치를 pull해 실행할 정확한 명령을 포함한다.
