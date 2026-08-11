# v3.9.0 Verification Runner Rebase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기준 commit `327afe0d4b3282400f1925252c59a53b87827224`의 v3.9.0 제품 코드를 바꾸지 않고 UI request lifecycle 실행기를 capture-only/post-case/case-isolated 구조로 재기준화해 독립 exact 424 actual과 조건부 immutable RC closure를 완수한다.

**Architecture:** Playwright callback은 immutable request/response ledger만 수집하고, case 종료 후 독립 evaluator가 object identity graph 전체를 fail-closed 평가한다. Canonical parent는 정확히 한 case를 실행하는 child process 424개를 순서대로 집계하며 일반 case FAIL 뒤에도 계속하고, bootstrap·runtime/port contamination·summary write 불가만 infra-fatal로 처리한다.

**Tech Stack:** Node.js ESM, Playwright native adapter, Bash dispatcher, JSON fixtures/evidence, CMake C++17 build, Git/GitHub origin.

## Global Constraints

- Source commit은 `327afe0d4b3282400f1925252c59a53b87827224`다.
- 작업 브랜치는 `v3.9.0-verification-rebase`다.
- `src/**`, 제품 API schema, UI renderer, WebRTC/SSE/WS/event payload와 media path는 동결한다.
- callback에서는 lifecycle assertion과 throw를 금지한다.
- authoritative join key는 request object, `response.request()`, `redirectedFrom()` object identity뿐이다.
- case-ID 예외, allowlist, path-only owner 추론, global mutable active owner fallback을 금지한다.
- Static 전체 PASS 전에는 commit/push하지 않는다.
- actual 자동 retry와 동일 commit actual 재실행을 금지한다.
- RC 브랜치는 모든 completion condition이 직접 증명된 commit에서만 한 번 생성·push하고 이후 움직이지 않는다.
- 설계 source-of-truth는 `docs/superpowers/specs/2026-08-11-v390-verification-runner-rebase-design.md`다.

---

### Task 1: Actual RED와 독립 actual-like 계약 고정

**Files:**
- Create: `test/fixtures/v390_ui_request_lifecycle_rebase_red_20260811.json`
- Create: `test/fixtures/v390_ui_request_lifecycle_actual_like_cases.json`
- Create: `scripts/internal/verify_v390_ui_request_lifecycle_rebase_contract.mjs`
- Modify: `server.sh`

**Interfaces:**
- Consumes: 기존 `.media_server.test/v3.9.0/ui-acceptance-current/first-failure.json`의 source/error shape와 canonical UI-001/UI-002 manifest metadata.
- Produces: recorder/evaluator가 충족해야 할 explicit object-graph fixture와 `verify-v390-ui-request-lifecycle-rebase-contract` dispatch.
- Test utilities: verifier 안에서 `fakeRequest(spec)`, `fakeResponse(request, status)`, `materializeObjectGraph(fixtureCase)`를 정의한다. `fakeRequest`는 stable object 하나와 Playwright-compatible method를 만들고, `fakeResponse`는 `request()`가 같은 object를 반환하며, `materializeObjectGraph`는 fixture identity label마다 object를 정확히 하나 생성한다.

- [ ] **Step 1: RED evidence fixture 작성**

```json
{
  "schema": "media-server.v390-ui-request-lifecycle-rebase-red.v1",
  "sourceCommitSha": "327afe0d4b3282400f1925252c59a53b87827224",
  "caseId": "UI-001",
  "error": "action redirect chain parent resourceType mismatch",
  "failureOwner": "playwright-request-callback",
  "coverage": {"target":424,"attempted":0,"pass":0,"fail":0,"notRun":424,"unsupported":0},
  "releaseEvidenceEligible": false
}
```

- [ ] **Step 2: actual-like positive/negative object graph 작성**

```json
{
  "schema": "media-server.v390-ui-request-lifecycle-actual-like.v1",
  "positive": ["UI-001-bootstrap-redirect", "UI-002-action-redirect", "representative-api-fetch", "same-route-rejection"],
  "negative": ["callback-capture-error", "missing-resource-type", "wrong-redirect-parent", "duplicate-response", "stale-invocation", "cross-action-leak"]
}
```

- [ ] **Step 3: 새 모듈이 없어서 실패하는 contract verifier 작성**

```js
import { createRequestEventRecorder } from "./v390_ui_request_event_recorder.mjs";
import { evaluateRequestLifecycle } from "./v390_ui_request_lifecycle_evaluator.mjs";

function fakeRequest({ method = "GET", path = "/", resourceType = "document",
  navigation = true, redirectedFrom = null } = {}) {
  return {
    method: () => method,
    url: () => `http://127.0.0.1${path}`,
    resourceType: () => resourceType,
    isNavigationRequest: () => navigation,
    redirectedFrom: () => redirectedFrom,
  };
}
function fakeResponse(request, status = 200) {
  return { request: () => request, status: () => status, url: () => request.url() };
}
function materializeObjectGraph(fixtureCase) {
  const objects = new Map();
  const objectFor = label => {
    if (!objects.has(label)) objects.set(label, {});
    return objects.get(label);
  };
  return {
    caseId: fixtureCase.id,
    recorderSnapshot: {
      requests: fixtureCase.requests.map(item => ({
        ...item,
        requestObject: objectFor(item.identity),
        redirectedFromObject: item.redirectedFromIdentity
          ? objectFor(item.redirectedFromIdentity)
          : null,
      })),
      responses: fixtureCase.responses.map(item => ({
        ...item,
        responseRequestObject: objectFor(item.requestIdentity),
      })),
      captureErrors: fixtureCase.captureErrors || [],
    },
    navigationInvocations: fixtureCase.navigationInvocations || [],
    actionInvocations: fixtureCase.actionInvocations || [],
  };
}

const recorder = createRequestEventRecorder({ caseId: "UI-001" });
assert(typeof recorder.recordRequest === "function", "capture-only recorder unavailable");
assert(typeof evaluateRequestLifecycle === "function", "post-case evaluator unavailable");
```

- [ ] **Step 4: RED 실행 확인**

Run: `node scripts/internal/verify_v390_ui_request_lifecycle_rebase_contract.mjs`

Expected: FAIL with module-not-found for `v390_ui_request_event_recorder.mjs` or `v390_ui_request_lifecycle_evaluator.mjs`.

---

### Task 2: Capture-only recorder 구현

**Files:**
- Create: `scripts/internal/v390_ui_request_event_recorder.mjs`
- Modify: `scripts/internal/verify_v390_ui_request_lifecycle_rebase_contract.mjs`

**Interfaces:**
- Consumes: Playwright Request/Response object와 capture-time invocation projection.
- Produces: `createRequestEventRecorder({caseId, correlationDigest})`, frozen request/response envelopes, `snapshot()`.
- Private helpers: `captureSafely(phase, fn)`, `objectIdentity(object)`, `requestKindFor(request)`, `sanitizeCaptureError(error)`.

- [ ] **Step 1: recorder fail-closed assertions 추가**

```js
const recorder = createRequestEventRecorder({ caseId: "UI-001" });
const first = fakeRequest({ path: "/", resourceType: "document" });
recorder.recordRequest(first, { navigationInvocation: { invocationId: "UI-001:bootstrap" } });
recorder.recordResponse(fakeResponse(first, 302));
const snapshot = recorder.snapshot();
assert(Object.isFrozen(snapshot.requests[0]), "request envelope is mutable");
assert(snapshot.captureErrors.length === 0, "valid capture recorded an error");
```

- [ ] **Step 2: recorder 최소 구현**

```js
export function createRequestEventRecorder({ caseId, correlationDigest = "" } = {}) {
  const objectIds = new WeakMap();
  const requests = [];
  const responses = [];
  const captureErrors = [];
  let sequence = 0;
  let objectSequence = 0;
  const objectIdentity = value => {
    if (!objectIds.has(value)) {
      objectSequence += 1;
      objectIds.set(value, `${caseId}:request-object-${objectSequence}`);
    }
    return objectIds.get(value);
  };
  const sanitizeCaptureError = error => ({
    name: error instanceof Error ? error.name : "Error",
    message: error instanceof Error ? error.message : String(error),
  });
  const captureSafely = (phase, fn) => {
    try {
      return fn();
    } catch (error) {
      captureErrors.push(Object.freeze({
        sequence: ++sequence,
        phase,
        code: `${phase.toUpperCase()}_CAPTURE_FAILED`,
        error: sanitizeCaptureError(error),
        timestamp: Date.now(),
      }));
      return null;
    }
  };
  const requestKindFor = request => request.isNavigationRequest() &&
      request.resourceType() === "document"
    ? "document-navigation"
    : (request.resourceType() === "fetch" ? "application-fetch" : "subresource");
  return Object.freeze({
    recordRequest(request, context = {}) {
      return captureSafely("request", () => {
        const redirectedFromObject = request.redirectedFrom();
        const envelope = Object.freeze({
          requestObject: request,
          objectIdentity: objectIdentity(request),
          requestId: `${caseId}:request-${requests.length + 1}`,
          sequence: ++sequence,
          method: request.method(),
          path: new URL(request.url()).pathname,
          resourceType: request.resourceType(),
          requestKind: requestKindFor(request),
          navigationInvocation: Object.freeze({ ...(context.navigationInvocation || {}) }),
          actionInvocation: Object.freeze({ ...(context.actionInvocation || {}) }),
          correlationDigest: String(context.correlationDigest || correlationDigest),
          redirectedFromObject,
          redirectedFromObjectIdentity: redirectedFromObject
            ? objectIdentity(redirectedFromObject)
            : "",
          timestamp: Date.now(),
        });
        requests.push(envelope);
        return envelope;
      });
    },
    recordResponse(response) {
      return captureSafely("response", () => {
        const responseRequestObject = response.request();
        const envelope = Object.freeze({
          responseRequestObject,
          requestObjectIdentity: objectIdentity(responseRequestObject),
          sequence: ++sequence,
          status: response.status(),
          timestamp: Date.now(),
        });
        responses.push(envelope);
        return envelope;
      });
    },
    recordRequestFinished(request) {
      return captureSafely("request_finished", () => Object.freeze({
        requestObject: request,
        requestObjectIdentity: objectIdentity(request),
        sequence: ++sequence,
        timestamp: Date.now(),
      }));
    },
    recordRequestFailed(request, failure) {
      return captureSafely("request_failed", () => Object.freeze({
        requestObject: request,
        requestObjectIdentity: objectIdentity(request),
        sequence: ++sequence,
        failure: sanitizeCaptureError(failure),
        timestamp: Date.now(),
      }));
    },
    snapshot() {
      return Object.freeze({
        requests: Object.freeze([...requests]),
        responses: Object.freeze([...responses]),
        captureErrors: Object.freeze([...captureErrors]),
      });
    },
  });
}
```

- [ ] **Step 3: callback error가 throw되지 않는 계약 추가**

```js
const broken = { method() { throw new Error("capture-read-failed"); } };
assert.doesNotThrow(() => recorder.recordRequest(broken, {}));
assert(recorder.snapshot().captureErrors.some(item => item.code === "REQUEST_CAPTURE_FAILED"));
```

- [ ] **Step 4: focused GREEN 실행**

Run: `node scripts/internal/verify_v390_ui_request_lifecycle_rebase_contract.mjs`

Expected: evaluator module missing or evaluator behavior failures only; recorder checks PASS.

---

### Task 3: Post-case lifecycle evaluator 구현

**Files:**
- Create: `scripts/internal/v390_ui_request_lifecycle_evaluator.mjs`
- Modify: `scripts/internal/verify_v390_ui_request_lifecycle_rebase_contract.mjs`

**Interfaces:**
- Consumes: recorder in-memory snapshot, navigation invocation ledger, action invocation ledger.
- Produces: `evaluateRequestLifecycle(input)` with `status`, exhaustive `classifications`, `failures`, `census`.
- Private helpers: `bindResponsesByExactObject(responses, byRequestObject, failures)`, `classifyExactOne({input, byRequestObject, responses, failures})`, `buildCensus(classifications, failures)`; 각 helper는 throw하지 않고 모든 결함을 `failures`에 append한다.

- [ ] **Step 1: positive graph 네 건의 failing assertions 작성**

```js
for (const fixtureCase of fixture.positiveCases) {
  const result = evaluateRequestLifecycle(materializeObjectGraph(fixtureCase));
  assert.equal(result.status, "PASS", `${fixtureCase.id} did not pass`);
  assert.equal(result.census.unclassified, 0);
  assert.equal(result.census.multiplyClassified, 0);
}
```

- [ ] **Step 2: identity graph evaluator 최소 구현**

```js
export function evaluateRequestLifecycle(input = {}) {
  const failures = [];
  const byRequestObject = new Map(input.recorderSnapshot.requests.map(item => [item.requestObject, item]));
  const responses = bindResponsesByExactObject(input.recorderSnapshot.responses, byRequestObject, failures);
  const classifications = classifyExactOne({ input, byRequestObject, responses, failures });
  return Object.freeze({
    status: failures.length === 0 ? "PASS" : "FAIL",
    classifications,
    failures,
    census: buildCensus(classifications, failures),
  });
}
```

- [ ] **Step 3: negative graph 여섯 건의 fail-closed assertions 작성**

```js
const expectedCodes = new Map([
  ["callback-capture-error", "CAPTURE_ERROR"],
  ["missing-resource-type", "RESOURCE_TYPE_MISSING"],
  ["wrong-redirect-parent", "REDIRECT_PARENT_WRONG"],
  ["duplicate-response", "RESPONSE_DUPLICATE"],
  ["stale-invocation", "INVOCATION_STALE"],
  ["cross-action-leak", "CROSS_ACTION_LEAK"],
]);
```

- [ ] **Step 4: 전체 lifecycle contract GREEN 확인**

Run: `./server.sh verify-v390-ui-request-lifecycle-rebase-contract`

Expected: PASS for 4 positive and 6 negative cases; no replay data used as expected value.

---

### Task 4: Native adapter callback을 capture-only로 전환

**Files:**
- Modify: `scripts/internal/v390_ui_native_adapter.mjs`
- Modify: `scripts/internal/verify_v390_ui_native_adapter_contract.mjs`
- Modify: `scripts/internal/verify_v390_ui_browser_callback_free_identifier_contract.mjs`
- Modify: `scripts/internal/verify_v390_ui_request_lifecycle_rebase_contract.mjs`

**Interfaces:**
- Consumes: Task 2 recorder와 existing action/navigation invocation begin/end events.
- Produces: case-local `requestLifecycleRecorder`, post-case `evaluateRequestLifecycleLedger()` adapter API.

- [ ] **Step 1: callback source contract RED 작성**

```js
assert(!requestCallbackSource.includes("classifyRequestLifecycleOwnership("));
assert(!requestCallbackSource.includes("throw new Error("));
assert(requestCallbackSource.includes("requestLifecycleRecorder.recordRequest("));
assert(responseCallbackSource.includes("requestLifecycleRecorder.recordResponse("));
```

- [ ] **Step 2: adapter request/response callback 교체**

```js
page.on("request", request => {
  requestLifecycleRecorder.recordRequest(request, immutableCaptureContext());
});
page.on("response", response => {
  requestLifecycleRecorder.recordResponse(response);
  captureSafeResponseProjection(response);
});
```

- [ ] **Step 3: action/navigation begin/end를 immutable ledger event로 기록**

```js
invocationLedger.push(Object.freeze({
  sequence: nextInvocationSequence(),
  invocationId,
  kind,
  phase: "begin",
  timestamp: Date.now(),
}));
```

- [ ] **Step 4: case 종료 API가 evaluator를 한 번 호출하도록 구현**

```js
evaluateRequestLifecycleLedger() {
  return evaluateRequestLifecycle({
    caseId,
    recorderSnapshot: requestLifecycleRecorder.snapshot(),
    navigationInvocations: navigationInvocationLedger,
    actionInvocations: actionInvocationLedger,
  });
}
```

- [ ] **Step 5: adapter 관련 focused verifiers 실행**

Run:

```bash
./server.sh verify-v390-ui-request-lifecycle-rebase-contract
./server.sh verify-v390-ui-native-adapter-contract
./server.sh verify-v390-ui-browser-callback-free-identifier-contract
```

Expected: all PASS; source callback contains no lifecycle classifier/assertion.

---

### Task 5: Single-case child summary를 finally에서 보장

**Files:**
- Modify: `scripts/internal/run_v390_ui_native_exact_cases.mjs`
- Modify: `scripts/internal/v390_ui_native_exact_cases_lib.mjs`
- Create: `scripts/internal/verify_v390_ui_case_child_isolation_contract.mjs`
- Modify: `server.sh`

**Interfaces:**
- Consumes: adapter post-case evaluator result.
- Produces: exact one-case child mode와 `media-server.v390-ui-case-child.v1` summary.

- [ ] **Step 1: 일반 assertion 이후 summary가 존재해야 하는 RED 작성**

```js
const child = await runContractChild("lifecycle-failure");
assert.equal(child.exitCode, 1);
assert.equal(child.summary.counts.attempted, 1);
assert.equal(child.summary.counts.fail, 1);
assert.equal(child.summary.case.status, "FAIL");
```

- [ ] **Step 2: executeCase의 evaluator와 failure census 결속**

```js
const lifecycleEvaluation = browser.evaluateRequestLifecycleLedger();
if (lifecycleEvaluation.status !== "PASS") {
  throw structuredCaseFailure("REQUEST_LIFECYCLE_FAILED", lifecycleEvaluation);
}
```

- [ ] **Step 3: child summary write를 finally로 이동**

```js
let childSummary;
try {
  childSummary = await executeSelectedCase();
} catch (error) {
  childSummary = failedAttemptSummary(error);
} finally {
  writeChildSummaryOrInfraFatal(summaryPath, childSummary);
}
```

- [ ] **Step 4: callback error·DOM/API error·duplicate response fixture child를 순차 검증**

Run: `./server.sh verify-v390-ui-case-child-isolation-contract`

Expected: each ordinary failure writes attempted 1/fail 1 summary; summary-write fixture is the only infra-fatal child result.

---

### Task 6: Canonical parent가 424 child를 전수 시도하도록 구현

**Files:**
- Modify: `scripts/internal/run_v390_ui_native_exact_cases.mjs`
- Modify: `scripts/internal/v390_ui_diagnostic_lifecycle_lib.mjs`
- Create: `scripts/internal/verify_v390_ui_canonical_parent_isolation_contract.mjs`
- Modify: `scripts/internal/verify_v390_ui_native_exact_cases_contract.mjs`
- Modify: `server.sh`

**Interfaces:**
- Consumes: canonical manifest, single-case child summary, shared owned server runtime.
- Produces: `selected`, `attempted`, complete failure census, infra-fatal classification.

- [ ] **Step 1: fail-continue RED 작성**

```js
const summary = await runParentFixture(["PASS", "FAIL", "PASS", "FAIL"]);
assert.deepEqual(summary.counts, {
  selected: 4, attempted: 4, pass: 2, fail: 2, notRun: 0, unsupported: 0,
});
assert.equal(summary.failureCensus.length, 2);
```

- [ ] **Step 2: parent child loop 구현**

```js
for (const item of selectedCases) {
  const child = await runCaseChild(item);
  const disposition = classifyCaseChildDisposition(child);
  if (disposition.kind === "case-result") results.push(disposition.result);
  else {
    infraFatal = disposition;
    appendRemainingNotRun(selectedCases, item, results, disposition.code);
    break;
  }
}
```

- [ ] **Step 3: infra-fatal allowset 고정**

```js
const infraFatalCodes = new Set([
  "SERVER_BOOTSTRAP_FAILED",
  "PORT_RUNTIME_CONTAMINATION",
  "SUMMARY_WRITE_FAILED",
]);
```

- [ ] **Step 4: failure census serializer 구현**

```js
failureCensus: results.filter(item => item.status === "FAIL").map(item => ({
  caseId: item.caseId,
  failureClass: item.failureClass,
  failurePhase: item.failurePhase,
  failureCode: item.failureCode,
  lifecycleCensus: item.requestLifecycleEvaluation?.census || null,
  cleanup: item.cleanupAttestation || null,
}))
```

- [ ] **Step 5: contract fixture에서 424 모두 attempted 검증**

Run:

```bash
./server.sh verify-v390-ui-canonical-parent-isolation-contract
./server.sh verify-v390-ui-native-exact-cases-contract
./server.sh verify-v390-ui-native-diagnostic-sweep-contract
```

Expected: ordinary failures do not abort; only three infra-fatal classes produce later not-run.

---

### Task 7: Acceptance, Policy v4, launcher 통합

**Files:**
- Modify: `scripts/internal/verify_v390_test_acceptance_bundle.mjs`
- Modify: `scripts/internal/v390_ui_policy_v4_evidence_producer.mjs`
- Modify: `scripts/internal/verify_v390_ui_policy_v4_producer_contract.mjs`
- Modify: `scripts/internal/verify_v390_final_evidence_integrity_contract.mjs`
- Modify: `scripts/internal/user_test_launcher_common.sh`
- Modify: `scripts/internal/verify_v390_user_test_launchers_contract.mjs`

**Interfaces:**
- Consumes: canonical parent counts, failure census, child source bindings.
- Produces: exact 424 acceptance summary, Policy v4 eligibility boundary, final-integrity inputs, `./test_ui.sh` output.

- [ ] **Step 1: count/evidence RED assertions 작성**

```js
assert(summary.coverage.selected === 424);
assert(summary.coverage.attempted === 424);
assert(summary.coverage.attempted === summary.coverage.pass + summary.coverage.fail);
assert(summary.coverage.notRun === 0);
assert(summary.coverage.unsupported === 0);
```

- [ ] **Step 2: Policy producer가 complete census만 받도록 강화**

```js
const completeAttemptCensus = coverage.selected === 424 &&
  coverage.attempted === 424 && coverage.notRun === 0 && coverage.unsupported === 0;
const uiFulltestPass = completeAttemptCensus && coverage.fail === 0 && allCasesEligible;
```

- [ ] **Step 3: launcher summary에 selected/attempted/failure census 표시**

```bash
echo "[test] exactUiSelected=${selected}"
echo "[test] exactUiAttempted=${attempted}"
echo "[test] exactUiFailureCensus=${failure_count}"
```

- [ ] **Step 4: 통합 contract 실행**

Run:

```bash
./server.sh verify-v390-test-acceptance-bundle-contract
./server.sh verify-v390-ui-policy-v4-producer-contract
./server.sh verify-v390-final-evidence-integrity-contract
./server.sh verify-v390-user-test-launchers-contract
```

Expected: PASS; plan/static/replay fixture still cannot set `uiFulltestPass=true`.

---

### Task 8: Inventory, roadmap, evidence와 Static 전체 검증

**Files:**
- Modify: `docs/project-feature-test-inventory.md`
- Modify: `docs/release-test-records.md`
- Modify: `docs/v390-feature-completion-inventory.md`
- Modify only if required by existing verifier: `test/fixtures/project_feature_implementation_evidence.json`
- Modify only on proven drift through official producer: semantic approval/audit fixtures

**Interfaces:**
- Consumes: Tasks 1-7 implementation and contract results.
- Produces: step implementation record, exhaustive test rows, Static PASS evidence.

- [ ] **Step 1: 새 실행기 기능과 테스트 항목을 실행 전에 inventory에 등록**

```text
V390 request capture-only recorder
V390 post-case request lifecycle evaluator
V390 canonical case child isolation
V390 exact 424 complete failure census
```

- [ ] **Step 2: release-test-records에 최초 RED, 구현 위치, 미실행 actual 경계 기록**

Record source commit, UI-001 error, new module/function/dispatch names, every focused verifier command, generator/producer invocation count, and `actual 미실행` boundary.

- [ ] **Step 3: focused Static 실패를 원인 수정하며 전부 PASS**

Run every new verifier plus existing native/runtime/completion/adapter/diagnostic/acceptance/launcher/final-integrity/Policy v4/replay contracts. Do not stop at the first failure; repair the common implementation cause and rerun the affected Static set.

- [ ] **Step 4: 공식 generator/producer drift 판정**

Run source audit/read-only comparison first. Invoke an official generator/producer only when generated output differs from source-of-truth; record invocation count and atomic output set.

- [ ] **Step 5: 전체 required Static gate 실행**

Run:

```bash
./server.sh build
./server.sh verify-v390-ui-request-lifecycle-rebase-contract
./server.sh verify-v390-ui-case-child-isolation-contract
./server.sh verify-v390-ui-canonical-parent-isolation-contract
./server.sh verify-v390-ui-native-exact-cases-contract
./server.sh verify-v390-ui-native-adapter-contract
./server.sh verify-v390-ui-completion-oracle-contract
./server.sh verify-v390-ui-native-diagnostic-sweep-contract
./server.sh verify-v390-ui-native-diagnostic-trace-replay-contract
./server.sh verify-v390-ui-remaining-actual-trace-replay-contract
./server.sh verify-v390-test-acceptance-bundle-contract
./server.sh verify-v390-user-test-launchers-contract
./server.sh verify-v390-final-evidence-integrity-contract
./server.sh verify-v390-ui-policy-v4-producer-contract
./server.sh verify-v390-ui-policy-v4-independence-contract
./server.sh verify-feature-implementation-evidence
./server.sh verify-project-inventory
./server.sh verify-release-evidence-index
./server.sh verify-docs-links
./server.sh verify-script-inventory
bash -n server.sh test_ui.sh scripts/internal/user_test_launcher_common.sh
git diff --check
```

Expected: every command exit 0; recorded replay reports 548/548 as auxiliary only.

- [ ] **Step 6: branch-bearing clean checkout 검증 준비**

Create a temporary local checkpoint commit only at Task 9 after all dirty-worktree Static passes; then validate checkout-local build/static from that commit before push.

---

### Task 9: Verification commit, clean checkout, push, product diff proof

**Files:**
- Stage only Task 1-8 files.
- Preserve unrelated user changes if any appear.

**Interfaces:**
- Consumes: Static PASS working tree.
- Produces: pushed verification commit and immutable source/product diff evidence.

- [ ] **Step 1: change scope and product freeze 확인**

Run:

```bash
git status --short
git diff --name-only 327afe0d4b3282400f1925252c59a53b87827224
git diff --exit-code 327afe0d4b3282400f1925252c59a53b87827224 -- src
git diff --check
```

Expected: no `src/**` diff; only approved scripts/test/docs/dispatcher changes.

- [ ] **Step 2: verification commit 생성**

```bash
git add \
  server.sh \
  scripts/internal/v390_ui_request_event_recorder.mjs \
  scripts/internal/v390_ui_request_lifecycle_evaluator.mjs \
  scripts/internal/verify_v390_ui_request_lifecycle_rebase_contract.mjs \
  scripts/internal/verify_v390_ui_case_child_isolation_contract.mjs \
  scripts/internal/verify_v390_ui_canonical_parent_isolation_contract.mjs \
  scripts/internal/v390_ui_native_adapter.mjs \
  scripts/internal/run_v390_ui_native_exact_cases.mjs \
  scripts/internal/v390_ui_native_exact_cases_lib.mjs \
  scripts/internal/v390_ui_diagnostic_lifecycle_lib.mjs \
  scripts/internal/verify_v390_ui_native_adapter_contract.mjs \
  scripts/internal/verify_v390_ui_browser_callback_free_identifier_contract.mjs \
  scripts/internal/verify_v390_ui_native_exact_cases_contract.mjs \
  scripts/internal/verify_v390_ui_native_diagnostic_sweep_contract.mjs \
  scripts/internal/verify_v390_test_acceptance_bundle.mjs \
  scripts/internal/v390_ui_policy_v4_evidence_producer.mjs \
  scripts/internal/verify_v390_ui_policy_v4_producer_contract.mjs \
  scripts/internal/verify_v390_final_evidence_integrity_contract.mjs \
  scripts/internal/user_test_launcher_common.sh \
  scripts/internal/verify_v390_user_test_launchers_contract.mjs \
  test/fixtures/v390_ui_request_lifecycle_rebase_red_20260811.json \
  test/fixtures/v390_ui_request_lifecycle_actual_like_cases.json \
  docs/project-feature-test-inventory.md \
  docs/release-test-records.md \
  docs/v390-feature-completion-inventory.md \
  docs/superpowers/specs/2026-08-11-v390-verification-runner-rebase-design.md \
  docs/superpowers/plans/2026-08-11-v390-verification-runner-rebase.md
git commit -m "fix: rebase v3.9.0 UI verification lifecycle"
```

If source audit proves generated semantic/feature fixture drift and the official producer atomically updates additional files, append exactly the paths printed by that producer after reviewing their diff; do not stage unrelated paths.

- [ ] **Step 3: branch-bearing clean checkout에서 full build/static 재검증**

Use a fresh checkout/worktree at the commit, build checkout-local `build-gst-onnx/media_server`, rerun Task 8 required Static gate, and require clean status.

- [ ] **Step 4: verification branch push**

```bash
git push -u origin v3.9.0-verification-rebase
```

- [ ] **Step 5: local/origin 동일성 확인**

```bash
git rev-parse HEAD
git rev-parse origin/v3.9.0-verification-rebase
```

Expected: identical 40-character SHA.

---

### Task 10: 독립 actual과 조건부 immutable RC closure

**Files:**
- Create runtime evidence only under canonical repository artifact roots required by the launcher.
- Modify source only if a common failure cluster requires a new commit.

**Interfaces:**
- Consumes: pushed verification commit.
- Produces: independent clone build/4-case/canonical summaries, final integrity, cleanup, conditional RC branch.

- [ ] **Step 1: 별도 Sol/high actual 에이전트에 immutable task 전달**

Include verification SHA, no-local requirement, exact command counts, no retry rule, artifact paths, and completion conditions.

- [ ] **Step 2: origin에서 독립 clone 생성**

```bash
actual_clone_root=$(mktemp -d /private/tmp/mediaServer-v390-actual.XXXXXX)
git clone --no-local git@github.com:dhseo90/MediaServer.git "$actual_clone_root/repo"
verification_sha=$(git rev-parse origin/v3.9.0-verification-rebase)
git -C "$actual_clone_root/repo" checkout --detach "$verification_sha"
```

- [ ] **Step 3: checkout-local full build**

Run `./server.sh build`; verify binary path and SHA inside the clone and confirm no pre-existing ignored build/artifact was used.

- [ ] **Step 4: 4-case pilot 정확히 한 번 실행**

Execute UI-001, UI-002, representative API fetch, same-route rejection once through the approved case-isolated selection. Require 4 selected/4 attempted/4 PASS/0 fail.

- [ ] **Step 5: pilot PASS이면 canonical 424 정확히 한 번 실행**

Run `./test_ui.sh` or the canonical launcher mode defined by the final implementation exactly once. Preserve selected/attempted/pass/fail/not-run/unsupported and full failure census.

- [ ] **Step 6: common failure cluster 처리 경계**

If failure exists, do not add case-specific exceptions. Group every failed case by common failure code/object graph, fix the shared cause on the verification branch, rerun Static, create/push a new commit, then create a new `--no-local` clone. Do not rerun actual on the failed commit.

- [ ] **Step 7: completion audit**

Require exact 424/424 PASS, zero fail/not-run/unsupported/abort, Policy v4 eligible+qualified 424/424, `uiFulltestPass=true`, final-integrity PASS, cleanup PASS, independent clone clean, and local/origin SHA equality.

- [ ] **Step 8: 조건 충족 시 RC 브랜치 생성·push**

```bash
verified_sha=$(git rev-parse origin/v3.9.0-verification-rebase)
git branch v3.9.0-rc-verified "$verified_sha"
git push origin v3.9.0-rc-verified
```

Verify remote SHA equals `$verified_sha` and do not move the branch afterward. If any condition is missing, do not create the RC branch and do not claim completion or release readiness.
