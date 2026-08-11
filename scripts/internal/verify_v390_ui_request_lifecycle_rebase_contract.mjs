#!/usr/bin/env node
// 파일 용도: actual-like Request object graph로 recorder/evaluator의 fail-closed lifecycle 계약을 검증한다.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = relative => JSON.parse(fs.readFileSync(path.join(rootDir, relative), "utf8"));
const red = readJson("test/fixtures/v390_ui_request_lifecycle_rebase_red_20260811.json");
const fixture = readJson("test/fixtures/v390_ui_request_lifecycle_actual_like_cases.json");
const manifest = readJson("test/fixtures/v390_ui_native_exact_cases.json");

const positiveCaseIds = [
  "UI-001-bootstrap-redirect",
  "UI-002-action-redirect",
  "representative-api-fetch",
  "same-route-rejection",
];
const negativeCaseIds = [
  "callback-capture-error",
  "missing-resource-type",
  "wrong-redirect-parent",
  "duplicate-response",
  "stale-invocation",
  "cross-action-leak",
];

assert.deepStrictEqual(red, {
  schema: "media-server.v390-ui-request-lifecycle-rebase-red.v1",
  sourceCommitSha: "327afe0d4b3282400f1925252c59a53b87827224",
  caseId: "UI-001",
  error: "action redirect chain parent resourceType mismatch",
  failureOwner: "playwright-request-callback",
  coverage: {
    target: 424, attempted: 0, pass: 0, fail: 0, notRun: 424, unsupported: 0,
  },
  releaseEvidenceEligible: false,
}, "actual RED literal drift");

assert.equal(fixture.schema,
  "media-server.v390-ui-request-lifecycle-actual-like-cases.v1");
assert.equal(fixture.sourceCommitSha,
  "327afe0d4b3282400f1925252c59a53b87827224");
assert.deepStrictEqual(fixture.positiveCaseIds, positiveCaseIds,
  "positive case ID census drift");
assert.deepStrictEqual(fixture.negativeCaseIds, negativeCaseIds,
  "negative case ID census drift");
assert.deepStrictEqual(fixture.cases.map(item => item.caseId),
  [...positiveCaseIds, ...negativeCaseIds], "actual-like case order/census drift");
assert.deepStrictEqual([...new Set(fixture.cases
  .filter(item => item.polarity === "positive")
  .flatMap(item => item.expected.classifications.map(row => row.classification)))].sort(),
["action", "background", "bootstrap", "redirect"],
"positive cases do not exhaust the exact-one lifecycle taxonomy");
const multiFailureCase = fixture.cases.find(item => item.caseId === "wrong-redirect-parent");
assert.deepStrictEqual(multiFailureCase.expected.failures, [
  { code: "REDIRECT_PARENT_WRONG", requestIdentity: "wrong-parent-document",
    responseIndex: null },
  { code: "RESOURCE_TYPE_MISSING", requestIdentity: "independent-missing-type",
    responseIndex: null },
], "multi-defect graph failure order/code/identity drift");
assert.equal(multiFailureCase.expected.census.failureCount, 2,
  "multi-defect graph census did not retain every failure");
const collisionCase = fixture.cases.find(item => item.caseId === "cross-action-leak");
const collisionGraph = materializeObjectGraph(collisionCase);
const currentCollisionRequest = collisionGraph.requests.get("current-action-document");
const crossCollisionRequest = collisionGraph.requests.get("cross-action-document");
assert.notStrictEqual(currentCollisionRequest, crossCollisionRequest,
  "path-collision requests unexpectedly share raw object identity");
assert.equal(currentCollisionRequest.method(), crossCollisionRequest.method(),
  "path-collision request methods differ");
assert.equal(currentCollisionRequest.url(), crossCollisionRequest.url(),
  "path-collision request paths differ");
assert.equal(currentCollisionRequest.resourceType(), crossCollisionRequest.resourceType(),
  "path-collision request resourceTypes differ");
assert(currentCollisionRequest.redirectedFrom() && crossCollisionRequest.redirectedFrom(),
  "path-collision redirectedFrom parents must both be raw objects");
assert.notStrictEqual(currentCollisionRequest.redirectedFrom(),
  crossCollisionRequest.redirectedFrom(),
"path-collision redirectedFrom parents unexpectedly share object identity");
assert.notStrictEqual(collisionGraph.responses[1], collisionGraph.responses[3],
  "path-collision responses unexpectedly share object identity");
assert.strictEqual(collisionGraph.responses[1].request(), currentCollisionRequest,
  "current collision response/request identity drift");
assert.strictEqual(collisionGraph.responses[3].request(), crossCollisionRequest,
  "cross collision response/request identity drift");
assert.deepStrictEqual(collisionCase.expected.failures, [
  { code: "CROSS_ACTION_LEAK", requestIdentity: "cross-action-parent", responseIndex: 2 },
  { code: "CROSS_ACTION_LEAK", requestIdentity: "cross-action-document", responseIndex: 3 },
], "path-collision failure order/code/identity drift");
assert.equal(collisionCase.expected.census.failureCount, 2,
  "path-collision census did not retain both failures");

const manifestByCaseId = new Map(manifest.cases.map(item => [item.caseId, item]));
const ui001 = manifestByCaseId.get("UI-001");
const ui002 = manifestByCaseId.get("UI-002");
const src008Cases = manifest.cases.filter(item => item.caseId === "SRC-008");
assert.equal(src008Cases.length, 1, "canonical SRC-008 manifest case missing or duplicated");
const src008 = src008Cases[0];
assert(ui001 && ui001.caseId === "UI-001", "canonical UI-001 manifest case missing");
assert(ui002 && ui002.caseId === "UI-002", "canonical UI-002 manifest case missing");
const ui001Navigation = ui001.actions.find(item => item.kind === "navigate");
const ui002SubmitForm = ui002.actions.find(item => item.kind === "submit-form");
const src008EndpointActions = src008.actions
  .filter(item => item.kind === "execute-endpoint-action");
assert.equal(src008EndpointActions.length, 1,
  "canonical SRC-008 execute-endpoint-action missing or duplicated");
const src008EndpointAction = src008EndpointActions[0];
assert(ui001Navigation?.semanticCompletion?.navigationBinding,
  "canonical UI-001 navigate action/navigation binding missing");
assert(ui002SubmitForm?.semanticCompletion?.request,
  "canonical UI-002 submit-form action/request binding missing");
assert(src008EndpointAction.semanticCompletion?.request,
  "canonical SRC-008 endpoint action/request binding missing");
assert.equal(src008EndpointAction.actionId, "SRC-008:execute-endpoint-action",
  "canonical SRC-008 endpoint actionId drift");
assert.equal(src008EndpointAction.semanticCompletion.actionId,
  src008EndpointAction.actionId,
  "canonical SRC-008 semantic completion actionId drift");
assert.equal(src008EndpointAction.semanticCompletion.actionKind,
  "execute-endpoint-action", "canonical SRC-008 semantic action kind drift");
assert.equal(src008EndpointAction.semanticCompletion.navigationBinding ?? null, null,
  "canonical SRC-008 endpoint action unexpectedly owns navigation");
assert.equal(src008EndpointAction.semanticCompletion.request.initiatorActionId,
  src008EndpointAction.actionId,
  "canonical SRC-008 request initiator/action correlation drift");
assert.equal(src008EndpointAction.semanticCompletion.request.requestOwnershipKind,
  "primary-action", "canonical SRC-008 request ownership drift");
assert.equal(src008EndpointAction.semanticCompletion.request.correlationSource,
  "request-header", "canonical SRC-008 request correlation source drift");
assert.equal(src008EndpointAction.semanticCompletion.request.correlationHeader,
  "x-media-server-correlation-id", "canonical SRC-008 request correlation header drift");
assert.equal(src008EndpointAction.endpoint.method, "POST",
  "canonical SRC-008 endpoint method drift");
assert.equal(src008EndpointAction.endpoint.path, "/ops/api/sources",
  "canonical SRC-008 endpoint path drift");
assert.deepStrictEqual(src008EndpointAction.endpoint.allowedStatuses, [201],
  "canonical SRC-008 endpoint allowed status drift");
assert.equal(src008EndpointAction.semanticCompletion.request.method,
  src008EndpointAction.endpoint.method,
  "canonical SRC-008 completion request method drift");
assert.equal(src008EndpointAction.semanticCompletion.request.urlPath,
  src008EndpointAction.endpoint.path,
  "canonical SRC-008 completion request path drift");
assert.deepStrictEqual(src008EndpointAction.semanticCompletion.request.allowedStatuses,
  src008EndpointAction.endpoint.allowedStatuses,
  "canonical SRC-008 completion request statuses drift");
assert.equal(src008EndpointAction.semanticCompletion.request.correlationId,
  src008EndpointAction.semanticCompletion.correlationId,
  "canonical SRC-008 request correlationId drift");
const src008CorrelationDigest = createHash("sha256")
  .update(src008EndpointAction.semanticCompletion.request.correlationId)
  .digest("hex");
assert.deepStrictEqual(fixture.canonicalMetadata, {
  "UI-001": {
    canonicalRoute: ui001.canonicalRoute,
    screenRoute: ui001.screenRoute,
    accountRole: ui001.accountRole,
    navigationInvocation:
      ui001Navigation.semanticCompletion.navigationBinding.invocationId,
  },
  "UI-002": {
    canonicalRoute: ui002.canonicalRoute,
    screenRoute: ui002.screenRoute,
    accountRole: ui002.accountRole,
    navigationInvocation: "UI-002:form-submit-document-navigation",
    actionInvocation: ui002SubmitForm.actionId,
    correlationId: ui002SubmitForm.semanticCompletion.request.correlationId,
  },
  "SRC-008": {
    canonicalRoute: src008.canonicalRoute,
    screenRoute: src008.screenRoute,
    accountRole: src008.accountRole,
    actionKind: src008EndpointAction.kind,
    navigationInvocation: null,
    actionInvocation: src008EndpointAction.actionId,
    correlationId: src008EndpointAction.semanticCompletion.request.correlationId,
    method: src008EndpointAction.endpoint.method,
    path: src008EndpointAction.endpoint.path,
    allowedStatuses: src008EndpointAction.endpoint.allowedStatuses,
  },
}, "canonical UI-001/UI-002/SRC-008 metadata drift");

const representativeApiFetch = fixture.cases
  .find(item => item.caseId === "representative-api-fetch");
assert(representativeApiFetch, "representative-api-fetch fixture missing");
assert.equal(representativeApiFetch.correlationDigest, src008CorrelationDigest,
  "representative-api-fetch SRC-008 correlation digest drift");
assert.equal(representativeApiFetch.requests.length, 1,
  "representative-api-fetch request cardinality drift");
const representativeRequest = representativeApiFetch.requests[0];
assert.equal(representativeRequest.method, src008EndpointAction.endpoint.method,
  "representative-api-fetch SRC-008 request method drift");
assert.equal(representativeRequest.path, src008EndpointAction.endpoint.path,
  "representative-api-fetch SRC-008 request path drift");
assert.strictEqual(representativeRequest.navigationInvocation, null,
  "representative-api-fetch must have an explicit null navigation projection");
assert.equal(representativeRequest.actionInvocation?.invocationId,
  src008EndpointAction.actionId,
  "representative-api-fetch SRC-008 action projection drift");
assert.equal(representativeRequest.actionInvocation?.phase,
  src008EndpointAction.semanticCompletion.phase,
  "representative-api-fetch SRC-008 action phase drift");
assert.deepStrictEqual(representativeApiFetch.actionInvocations
  .map(item => item.invocationId), [src008EndpointAction.actionId],
"representative-api-fetch SRC-008 action ledger drift");
assert.deepStrictEqual(representativeApiFetch.navigationInvocations, [],
  "representative-api-fetch unexpected navigation ledger");
assert.deepStrictEqual(representativeApiFetch.responses
  .map(item => item.status), src008EndpointAction.endpoint.allowedStatuses,
"representative-api-fetch SRC-008 expected status drift");

for (const [caseIndex, fixtureCase] of fixture.cases.entries()) {
  validateFixtureCase(fixtureCase, caseIndex);
  materializeObjectGraph(fixtureCase);
}

// 이 import는 Task 1에서 의도적으로 RED이며 Task 2/3이 실제 module을 제공한다.
const recorderModule = await import("./v390_ui_request_event_recorder.mjs");
assert.deepStrictEqual(Object.keys(recorderModule), ["createRequestEventRecorder"],
  "recorder module exports drift");
const { createRequestEventRecorder } = recorderModule;
assert.equal(typeof createRequestEventRecorder, "function",
  "recorder export createRequestEventRecorder missing");

const recordedCases = [];
for (const fixtureCase of fixture.cases) {
  const graph = materializeObjectGraph(fixtureCase);
  const recorder = createRequestEventRecorder({
    caseId: fixtureCase.caseId,
    correlationDigest: fixtureCase.correlationDigest,
  });
  assert(Object.isFrozen(recorder), `${fixtureCase.caseId} recorder API is mutable`);
  assert.equal(typeof recorder.recordRequest, "function", "recordRequest missing");
  assert.equal(typeof recorder.recordResponse, "function", "recordResponse missing");
  assert.equal(typeof recorder.recordRequestFinished, "function",
    "recordRequestFinished missing");
  assert.equal(typeof recorder.recordRequestFailed, "function",
    "recordRequestFailed missing");
  assert.equal(typeof recorder.snapshot, "function", "snapshot missing");
  const requestCaptureContexts = new Map();

  for (const event of fixtureCase.events) {
    const requestSpec = event.type === "request"
      ? graph.requestSpecs.get(event.requestIdentity)
      : null;
    const eventContext = Object.freeze({
      sequence: event.sequence,
      timestampMs: event.timestampMs,
      phase: event.phase,
      navigationInvocation: event.type === "request"
        ? immutableProjection(requestSpec.navigationInvocation)
        : null,
      actionInvocation: event.type === "request"
        ? immutableProjection(requestSpec.actionInvocation)
        : null,
    });
    if (event.type === "request") {
      assert(Object.isFrozen(eventContext),
        `${fixtureCase.caseId} request event context is mutable`);
      for (const projection of [eventContext.navigationInvocation,
        eventContext.actionInvocation].filter(Boolean)) {
        assert(Object.isFrozen(projection),
          `${fixtureCase.caseId} request invocation projection is mutable`);
      }
      requestCaptureContexts.set(event.requestIdentity, eventContext);
      const record = () => recorder.recordRequest(
        graph.requests.get(event.requestIdentity), eventContext);
      if (requestSpec.throwOn !== null) {
        assert.doesNotThrow(record,
          `${fixtureCase.caseId} callback property failure escaped recordRequest`);
      } else {
        record();
      }
    } else {
      recorder.recordResponse(graph.responses[event.responseIndex]);
    }
  }

  const recorderSnapshot = recorder.snapshot();
  assertRecorderSnapshotObjectIdentity(fixtureCase, graph, recorderSnapshot,
    requestCaptureContexts);
  assert.deepStrictEqual(recorderSnapshot.captureErrors.map(item => item.code),
    fixtureCase.expectedCaptureErrorCodes,
  `${fixtureCase.caseId} recorder capture error code drift`);

  if (fixtureCase.caseId === "callback-capture-error") {
    assert.equal(recorderSnapshot.captureErrors[0]?.reasonCode,
      "request-resource-type-read-failed",
    "resourceType property failure reason code drift");
  }
  recordedCases.push({ fixtureCase, graph, recorderSnapshot });
}

assertRecorderBoundaryBehavior(createRequestEventRecorder);
assertOpenProjectionBehavior(createRequestEventRecorder);
assertRecorderIdentityBehavior(createRequestEventRecorder);
assertRequestKindBehavior(createRequestEventRecorder);
assertStrictContextBehavior(createRequestEventRecorder);
assertResponseAndTerminalBehavior(createRequestEventRecorder);
assertCaptureOnlyShapeAndIsolation(createRequestEventRecorder);
assertPerRequestCorrelationDigest(createRequestEventRecorder);

// Task 3 evaluator를 불러오기 전에 Task 2 recorder assertion을 모두 실행해야 한다.
const { evaluateRequestLifecycle } = await import("./v390_ui_request_lifecycle_evaluator.mjs");
assert.equal(typeof evaluateRequestLifecycle, "function",
  "evaluator export evaluateRequestLifecycle missing");
assertEvaluatorBoundaryBehavior(evaluateRequestLifecycle);

const passed = [];
for (const { fixtureCase, graph, recorderSnapshot } of recordedCases) {
  const result = await evaluateRequestLifecycle({
    caseId: fixtureCase.caseId,
    recorderSnapshot,
    navigationInvocations: graph.navigationInvocations,
    actionInvocations: graph.actionInvocations,
  });
  assertResultObjectIdentity(fixtureCase, graph, result);
  assert.deepStrictEqual(normalizeResult(graph, result), fixtureCase.expected,
    `${fixtureCase.caseId} lifecycle result drift`);
  passed.push(fixtureCase.caseId);
}

console.log(`v3.9.0 UI request lifecycle rebase contract: PASS (${passed.length}/${fixture.cases.length})`);

export function fakeRequest(spec) {
  const read = (property, value) => {
    if (spec.throwOn === property) {
      throw new Error(`fixture request ${property} read failed`);
    }
    return value;
  };
  return Object.freeze({
    method: () => read("method", spec.method),
    url: () => read("url", new URL(spec.path, "http://127.0.0.1").href),
    resourceType: () => read("resourceType", spec.resourceType),
    isNavigationRequest: () => read("isNavigationRequest", spec.isNavigationRequest),
    redirectedFrom: () => read("redirectedFrom", spec.redirectedFromRequest),
  });
}

export function fakeResponse(request, status) {
  return Object.freeze({
    request: () => request,
    status: () => status,
    url: () => request.url(),
  });
}

export function materializeObjectGraph(fixtureCase) {
  const requestSpecs = new Map();
  const requests = new Map();
  for (const spec of fixtureCase.requests) {
    assert(!requestSpecs.has(spec.identity),
      `${fixtureCase.caseId} duplicate request identity label: ${spec.identity}`);
    assert(spec.redirectedFrom === null || requests.has(spec.redirectedFrom),
      `${fixtureCase.caseId} redirectedFrom must precede child: ${spec.identity}`);
    requestSpecs.set(spec.identity, spec);
    requests.set(spec.identity, fakeRequest({
      ...spec,
      redirectedFromRequest: spec.redirectedFrom === null
        ? null
        : requests.get(spec.redirectedFrom),
    }));
  }
  assert.equal(new Set(requests.values()).size, fixtureCase.requests.length,
    `${fixtureCase.caseId} identity labels must materialize exactly one object each`);

  const responses = fixtureCase.responses.map((spec, index) => {
    assert(requests.has(spec.requestIdentity),
      `${fixtureCase.caseId} response ${index} request identity missing`);
    return fakeResponse(requests.get(spec.requestIdentity), spec.status);
  });
  for (const [index, spec] of fixtureCase.responses.entries()) {
    assert.strictEqual(responses[index].request(), requests.get(spec.requestIdentity),
      `${fixtureCase.caseId} response ${index} request object identity drift`);
    assert.equal(responses[index].url(), requests.get(spec.requestIdentity).url(),
      `${fixtureCase.caseId} response ${index} URL drift`);
  }
  for (const spec of fixtureCase.requests.filter(item => item.throwOn === null)) {
    const expectedParent = spec.redirectedFrom === null
      ? null
      : requests.get(spec.redirectedFrom);
    assert.strictEqual(requests.get(spec.identity).redirectedFrom(), expectedParent,
      `${fixtureCase.caseId} redirectedFrom object identity drift: ${spec.identity}`);
  }

  const materializeLedger = rows => rows.map(row => {
    const { requestIdentities, ...ledger } = row;
    return Object.freeze({
      ...ledger,
      requests: Object.freeze(requestIdentities.map(identity => {
        assert(requests.has(identity),
          `${fixtureCase.caseId} invocation request identity missing: ${identity}`);
        return requests.get(identity);
      })),
    });
  });
  return {
    requestSpecs,
    requests,
    responses,
    navigationInvocations: materializeLedger(fixtureCase.navigationInvocations),
    actionInvocations: materializeLedger(fixtureCase.actionInvocations),
  };
}

function immutableProjection(projection) {
  if (projection === null) return null;
  return Object.freeze({
    invocationId: projection.invocationId,
    phase: projection.phase,
    startedSequence: projection.startedSequence,
    endedSequence: projection.endedSequence,
    startedAtMs: projection.startedAtMs,
    endedAtMs: projection.endedAtMs,
    current: projection.current,
  });
}

function assertRecorderSnapshotObjectIdentity(fixtureCase, graph, snapshot,
    requestCaptureContexts) {
  assert(Object.isFrozen(snapshot), `${fixtureCase.caseId} recorder snapshot is mutable`);
  assert(Array.isArray(snapshot.requests) && Array.isArray(snapshot.responses) &&
    Array.isArray(snapshot.requestFinished) && Array.isArray(snapshot.requestFailed) &&
    Array.isArray(snapshot.captureErrors),
  `${fixtureCase.caseId} recorder snapshot arrays missing`);
  assert(Object.isFrozen(snapshot.requests) && Object.isFrozen(snapshot.responses) &&
    Object.isFrozen(snapshot.requestFinished) && Object.isFrozen(snapshot.requestFailed) &&
    Object.isFrozen(snapshot.captureErrors),
  `${fixtureCase.caseId} recorder snapshot arrays are mutable`);
  assert.deepStrictEqual(Object.keys(snapshot).sort(), [
    "captureErrors", "requestFailed", "requestFinished", "requests", "responses",
  ], `${fixtureCase.caseId} recorder snapshot fields drift`);
  assert.deepStrictEqual([
    snapshot.requestFinished.length, snapshot.requestFailed.length,
  ], [0, 0], `${fixtureCase.caseId} unexpected terminal ledger rows`);
  const successfulRequestEvents = fixtureCase.events.filter(event => event.type === "request" &&
    graph.requestSpecs.get(event.requestIdentity).throwOn === null);
  assert.equal(snapshot.requests.length, successfulRequestEvents.length,
    `${fixtureCase.caseId} recorder request count drift`);
  successfulRequestEvents.forEach((event, index) => {
    const requestSpec = graph.requestSpecs.get(event.requestIdentity);
    const inputContext = requestCaptureContexts.get(event.requestIdentity);
    assert(Object.isFrozen(snapshot.requests[index]),
      `${fixtureCase.caseId} recorder request envelope is mutable`);
    assert.strictEqual(snapshot.requests[index].requestObject,
      graph.requests.get(event.requestIdentity),
    `${fixtureCase.caseId} recorder copied/replaced request object`);
    assert.equal(typeof snapshot.requests[index].objectIdentity, "string",
      `${fixtureCase.caseId} recorder request object identity missing`);
    assert(snapshot.requests[index].objectIdentity,
      `${fixtureCase.caseId} recorder request object identity empty`);
    assert.equal(typeof snapshot.requests[index].requestId, "string",
      `${fixtureCase.caseId} recorder requestId missing`);
    assert.equal(snapshot.requests[index].sequence, event.sequence,
      `${fixtureCase.caseId} recorder request sequence drift`);
    assert.equal(snapshot.requests[index].method, requestSpec.method,
      `${fixtureCase.caseId} recorder request method drift`);
    assert.equal(snapshot.requests[index].path, requestSpec.path,
      `${fixtureCase.caseId} recorder normalized path drift`);
    assert.equal(snapshot.requests[index].resourceType, requestSpec.resourceType,
      `${fixtureCase.caseId} recorder resourceType drift`);
    if (requestSpec.resourceType !== null) {
      assert.equal(snapshot.requests[index].requestKind, requestSpec.requestKind,
        `${fixtureCase.caseId} recorder derived requestKind drift`);
    } else {
      assert.equal(snapshot.requests[index].requestKind, "unclassified-request",
        `${fixtureCase.caseId} missing resourceType did not retain fail-closed kind`);
    }
    assert.strictEqual(snapshot.requests[index].redirectedFromObject,
      requestSpec.redirectedFrom === null
        ? null
        : graph.requests.get(requestSpec.redirectedFrom),
    `${fixtureCase.caseId} recorder redirectedFrom object identity drift`);
    assert.equal(snapshot.requests[index].timestamp, event.timestampMs,
      `${fixtureCase.caseId} recorder request timestamp drift`);
    assert.equal(snapshot.requests[index].phase, event.phase,
      `${fixtureCase.caseId} recorder request phase drift`);
    assert.equal(snapshot.requests[index].correlationDigest,
      fixtureCase.correlationDigest,
    `${fixtureCase.caseId} recorder correlation digest drift`);
    for (const field of ["navigationInvocation", "actionInvocation"]) {
      assert(Object.hasOwn(snapshot.requests[index], field),
        `${fixtureCase.caseId} snapshot ${field} projection missing`);
      if (requestSpec[field] === null) {
        assert.strictEqual(inputContext[field], null,
          `${fixtureCase.caseId} input ${field} null fallback drift`);
        assert.strictEqual(snapshot.requests[index][field], null,
          `${fixtureCase.caseId} snapshot ${field} null fallback drift`);
      } else {
        assert(Object.isFrozen(inputContext[field]),
          `${fixtureCase.caseId} input ${field} projection is mutable`);
        assert(Object.isFrozen(snapshot.requests[index][field]),
          `${fixtureCase.caseId} snapshot ${field} projection is mutable`);
        assert.notStrictEqual(snapshot.requests[index][field], inputContext[field],
          `${fixtureCase.caseId} snapshot retained mutable ${field} reference`);
        assert.deepStrictEqual(snapshot.requests[index][field], requestSpec[field],
          `${fixtureCase.caseId} snapshot ${field} literal projection drift`);
      }
    }
  });
  const responseEvents = fixtureCase.events.filter(event => event.type === "response");
  assert.equal(snapshot.responses.length, responseEvents.length,
    `${fixtureCase.caseId} recorder response count drift`);
  responseEvents.forEach((event, index) => {
    assert(Object.isFrozen(snapshot.responses[index]),
      `${fixtureCase.caseId} recorder response envelope is mutable`);
    assert.strictEqual(snapshot.responses[index].responseRequestObject,
      graph.requests.get(fixtureCase.responses[event.responseIndex].requestIdentity),
    `${fixtureCase.caseId} recorder response/request identity join drift`);
    assert.strictEqual(snapshot.responses[index].responseObject,
      graph.responses[event.responseIndex],
    `${fixtureCase.caseId} recorder copied/replaced response object`);
    assert.equal(snapshot.responses[index].sequence, event.sequence,
      `${fixtureCase.caseId} recorder response sequence drift`);
    assert.equal(snapshot.responses[index].status,
      fixtureCase.responses[event.responseIndex].status,
    `${fixtureCase.caseId} recorder response status drift`);
  });
  const captureErrorEvents = fixtureCase.events.filter(event => event.type === "request" &&
    graph.requestSpecs.get(event.requestIdentity).throwOn !== null);
  assert.equal(snapshot.captureErrors.length, captureErrorEvents.length,
    `${fixtureCase.caseId} recorder capture error count drift`);
  captureErrorEvents.forEach((event, index) => assert(Object.isFrozen(
    snapshot.captureErrors[index]),
  `${fixtureCase.caseId} capture error envelope is mutable: ${event.requestIdentity}`));
}

function assertRecorderBoundaryBehavior(createRecorder) {
  const request = fakeRequest({
    method: "GET",
    path: "/boundary",
    resourceType: "xhr",
    isNavigationRequest: false,
    redirectedFromRequest: null,
    throwOn: null,
  });
  const recorder = createRecorder({ caseId: "recorder-boundary" });
  const finished = recorder.recordRequestFinished(request);
  const failed = recorder.recordRequestFailed(request, new Error("fixture-failure"));
  assert(Object.isFrozen(finished) && Object.isFrozen(failed),
    "request terminal envelopes are mutable");
  assert.strictEqual(finished.requestObject, request,
    "request-finished raw object identity drift");
  assert.strictEqual(failed.requestObject, request,
    "request-failed raw object identity drift");
  assert(Object.isFrozen(failed.failure), "request-failed detail is mutable");

  const invalidContextRecorder = createRecorder({ caseId: "invalid-context" });
  assert.doesNotThrow(() => invalidContextRecorder.recordRequest(request, {
    sequence: undefined,
    timestampMs: 1,
    phase: "boundary",
  }), "invalid explicit request context escaped callback");
  const invalidSnapshot = invalidContextRecorder.snapshot();
  assert.equal(invalidSnapshot.requests.length, 0,
    "invalid explicit request context silently produced an envelope");
  assert.deepStrictEqual(invalidSnapshot.captureErrors.map(item => item.reasonCode),
    ["request-context-sequence-invalid"],
  "invalid explicit request context did not fail closed");

  const undefinedRedirectRequest = fakeRequest({
    method: "GET",
    path: "/undefined-redirect",
    resourceType: "document",
    isNavigationRequest: true,
    redirectedFromRequest: undefined,
    throwOn: null,
  });
  const undefinedRedirectRecorder = createRecorder({ caseId: "undefined-redirect" });
  assert.doesNotThrow(() => undefinedRedirectRecorder.recordRequest(
    undefinedRedirectRequest, { sequence: 1, timestampMs: 1, phase: "boundary" }),
  "undefined redirectedFrom escaped callback");
  const undefinedRedirectSnapshot = undefinedRedirectRecorder.snapshot();
  assert.equal(undefinedRedirectSnapshot.requests.length, 0,
    "undefined redirectedFrom silently fell back to null");
  assert.deepStrictEqual(undefinedRedirectSnapshot.captureErrors.map(item => item.reasonCode),
    ["request-redirected-from-invalid"],
  "undefined redirectedFrom did not fail closed");

  const atomicRecorder = createRecorder({ caseId: "atomic-context" });
  assert.doesNotThrow(() => atomicRecorder.recordRequest(request, {
    sequence: 1,
    timestampMs: -1,
    phase: "boundary",
  }), "invalid timestamp escaped callback");
  assert.deepStrictEqual(atomicRecorder.snapshot().captureErrors.map(item => item.sequence), [1],
    "invalid capture context consumed sequence more than once");
  assert.doesNotThrow(() => atomicRecorder.recordRequest(request, {
    sequence: 2,
    timestampMs: 2,
    phase: "boundary-recovery",
  }), "normal capture after invalid context escaped callback");
  const atomicSnapshot = atomicRecorder.snapshot();
  assert.deepStrictEqual(atomicSnapshot.requests.map(item => item.sequence), [2],
    "invalid capture context cascaded into the next normal sequence");
  assert.deepStrictEqual(atomicSnapshot.captureErrors.map(item => item.reasonCode),
    ["request-context-timestamp-invalid"],
  "invalid capture context recovery recorded extra errors");

  for (const [field, reasonCode] of [
    ["navigationInvocation", "request-navigation-invocation-invalid"],
    ["actionInvocation", "request-action-invocation-invalid"],
  ]) {
    const projectionRecorder = createRecorder({ caseId: `undefined-${field}` });
    assert.doesNotThrow(() => projectionRecorder.recordRequest(request, {
      sequence: 1,
      timestampMs: 1,
      phase: "boundary",
      [field]: undefined,
    }), `${field} explicit undefined escaped callback`);
    const projectionSnapshot = projectionRecorder.snapshot();
    assert.equal(projectionSnapshot.requests.length, 0,
      `${field} explicit undefined silently fell back to null`);
    assert.deepStrictEqual(projectionSnapshot.captureErrors.map(item => item.reasonCode),
      [reasonCode], `${field} explicit undefined did not fail closed`);
  }
}

function assertOpenProjectionBehavior(createRecorder) {
  const request = fakeRequest({
    method: "POST", path: "/open-projection", resourceType: "document",
    isNavigationRequest: true, redirectedFromRequest: null, throwOn: null,
  });
  const navigationInvocation = Object.freeze({
    invocationId: "OPEN:navigation",
    phase: "open-navigation",
    startedSequence: 0,
    endedSequence: null,
    startedAtMs: 100,
    endedAtMs: null,
    current: true,
  });
  const actionInvocation = Object.freeze({
    invocationId: "OPEN:action",
    phase: "open-action",
    startedSequence: 0,
    endedSequence: null,
    startedAtMs: 100,
    endedAtMs: null,
    current: true,
  });
  const recorder = createRecorder({ caseId: "open-projection" });
  const envelope = recorder.recordRequest(request, {
    sequence: 1,
    timestampMs: 110,
    phase: "open-capture",
    navigationInvocation,
    actionInvocation,
  });
  assert(envelope, "open capture-time invocation projection was rejected");
  for (const [field, input] of [
    ["navigationInvocation", navigationInvocation],
    ["actionInvocation", actionInvocation],
  ]) {
    assert(Object.isFrozen(envelope[field]), `${field} open projection is mutable`);
    assert.notStrictEqual(envelope[field], input, `${field} retained caller object reference`);
    assert.strictEqual(envelope[field].endedSequence, null,
      `${field} open endedSequence drift`);
    assert.strictEqual(envelope[field].endedAtMs, null, `${field} open endedAtMs drift`);
    assert.deepStrictEqual(envelope[field], input, `${field} open projection literal drift`);
  }

  const invalidProjections = [
    ["partial-sequence", { ...navigationInvocation, endedSequence: null, endedAtMs: 120 }],
    ["partial-time", { ...navigationInvocation, endedSequence: 2, endedAtMs: null }],
    ["non-current-open", { ...navigationInvocation, current: false }],
    ["sequence-bounds", {
      ...navigationInvocation, startedSequence: 3, endedSequence: 2, endedAtMs: 120,
    }],
    ["time-bounds", {
      ...navigationInvocation, endedSequence: 2, startedAtMs: 130, endedAtMs: 120,
    }],
  ];
  for (const [name, projection] of invalidProjections) {
    const invalidRecorder = createRecorder({ caseId: `invalid-open-${name}` });
    const result = invalidRecorder.recordRequest(request, {
      sequence: 1,
      timestampMs: 110,
      phase: "invalid-open-capture",
      navigationInvocation: projection,
      actionInvocation: null,
    });
    assert.strictEqual(result, null, `${name} invocation projection did not fail closed`);
    assert.deepStrictEqual(invalidRecorder.snapshot().captureErrors.map(item => item.reasonCode),
      ["request-navigation-invocation-invalid"],
    `${name} invocation projection reason drift`);
  }
}

function assertRecorderIdentityBehavior(createRecorder) {
  const recorder = createRecorder({ caseId: "identity-boundary" });
  const parent = fakeRequest({
    method: "POST", path: "/identity", resourceType: "document",
    isNavigationRequest: true, redirectedFromRequest: null, throwOn: null,
  });
  const child = fakeRequest({
    method: "GET", path: "/identity/child", resourceType: "document",
    isNavigationRequest: true, redirectedFromRequest: parent, throwOn: null,
  });
  const parentEnvelope = recorder.recordRequest(parent);
  const childEnvelope = recorder.recordRequest(child);
  const responseEnvelope = recorder.recordResponse(fakeResponse(child, 200));
  const finishedEnvelope = recorder.recordRequestFinished(parent);
  const failedEnvelope = recorder.recordRequestFailed(child, new Error("identity-failure"));

  assert.notEqual(parentEnvelope.objectIdentity, childEnvelope.objectIdentity,
    "different request objects share an opaque identity");
  assert.notEqual(responseEnvelope.responseObjectIdentity, childEnvelope.objectIdentity,
    "request and response objects share an opaque identity");
  assert.equal(childEnvelope.redirectedFromObjectIdentity, parentEnvelope.objectIdentity,
    "redirect parent opaque identity does not match parent envelope");
  assert.equal(responseEnvelope.responseRequestObjectIdentity, childEnvelope.objectIdentity,
    "response request opaque identity does not match request envelope");
  assert.equal(responseEnvelope.requestObjectIdentity, childEnvelope.objectIdentity,
    "response binding alias does not match request envelope identity");
  assert.equal(finishedEnvelope.requestObjectIdentity, parentEnvelope.objectIdentity,
    "request-finished did not reuse stable request identity");
  assert.equal(failedEnvelope.requestObjectIdentity, childEnvelope.objectIdentity,
    "request-failed did not reuse stable request identity");
  assert.notEqual(parentEnvelope.requestId, childEnvelope.requestId,
    "different requests share a requestId");
}

function assertRequestKindBehavior(createRecorder) {
  const cases = [
    ["navigation-document", true, "document", "document-navigation"],
    ["non-navigation-fetch", false, "fetch", "application-fetch"],
    ["non-navigation-xhr", false, "xhr", "application-fetch"],
    ["navigation-fetch", true, "fetch", "subresource"],
    ["navigation-stylesheet", true, "stylesheet", "subresource"],
    ["non-navigation-document", false, "document", "subresource"],
    ["eventsource", false, "eventsource", "subresource"],
    ["websocket", false, "websocket", "subresource"],
    ["stylesheet", false, "stylesheet", "subresource"],
    ["image", false, "image", "subresource"],
    ["script", false, "script", "subresource"],
    ["missing", false, null, "unclassified-request"],
    ["empty", false, "", "unclassified-request"],
    ["invalid", false, 42, "unclassified-request"],
  ];
  const recorder = createRecorder({ caseId: "request-kind-boundary" });
  const envelopes = cases.map(([name, isNavigationRequest, resourceType]) =>
    recorder.recordRequest(fakeRequest({
      method: "GET",
      path: `/request-kind/${name}`,
      resourceType,
      isNavigationRequest,
      redirectedFromRequest: null,
      throwOn: null,
    })));
  assert.deepStrictEqual(envelopes.map(item => item.requestKind),
    cases.map(item => item[3]), "requestKind Playwright method combinations drift");
}

function expectedRequestKind(isNavigationRequest, resourceType) {
  if (isNavigationRequest && resourceType === "document") return "document-navigation";
  if (!isNavigationRequest && (resourceType === "fetch" || resourceType === "xhr")) {
    return "application-fetch";
  }
  if (typeof resourceType === "string" && resourceType.length > 0) return "subresource";
  return "unclassified-request";
}

function assertStrictContextBehavior(createRecorder) {
  const request = fakeRequest({
    method: "GET", path: "/strict-context", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const sequenceRecorder = createRecorder({ caseId: "strict-sequence" });
  sequenceRecorder.recordRequest(request, {
    sequence: 2, timestampMs: 2, phase: "valid-before-errors",
  });
  sequenceRecorder.recordRequest(request, {
    sequence: 2, timestampMs: 3, phase: "duplicate",
  });
  sequenceRecorder.recordRequest(request, {
    sequence: 1, timestampMs: 4, phase: "decreasing",
  });
  sequenceRecorder.recordRequest(request, {
    sequence: 5, timestampMs: 5, phase: "valid-after-errors",
  });
  const sequenceSnapshot = sequenceRecorder.snapshot();
  assert.deepStrictEqual(sequenceSnapshot.requests.map(item => item.sequence), [2, 5],
    "duplicate/decreasing sequence errors cascaded into normal capture");
  assert.deepStrictEqual(sequenceSnapshot.captureErrors.map(item => item.sequence), [3, 4],
    "duplicate/decreasing sequence errors did not consume exactly one sequence each");
  assert.deepStrictEqual(sequenceSnapshot.captureErrors.map(item => item.reasonCode), [
    "request-context-sequence-invalid", "request-context-sequence-invalid",
  ], "duplicate/decreasing sequence reason drift");

  for (const [name, context, reasonCode] of [
    ["undefined-timestamp", { sequence: 1, timestampMs: undefined, phase: "boundary" },
      "request-context-timestamp-invalid"],
    ["negative-timestamp", { sequence: 1, timestampMs: -1, phase: "boundary" },
      "request-context-timestamp-invalid"],
    ["undefined-phase", { sequence: 1, timestampMs: 1, phase: undefined },
      "request-context-phase-invalid"],
    ["empty-phase", { sequence: 1, timestampMs: 1, phase: "" },
      "request-context-phase-invalid"],
  ]) {
    const recorder = createRecorder({ caseId: name });
    assert.doesNotThrow(() => recorder.recordRequest(request, context),
      `${name} escaped callback`);
    const snapshot = recorder.snapshot();
    assert.equal(snapshot.requests.length, 0, `${name} produced a request envelope`);
    assert.deepStrictEqual(snapshot.captureErrors.map(item => item.reasonCode), [reasonCode],
      `${name} structured reason drift`);
    assert.deepStrictEqual(snapshot.captureErrors.map(item => item.sequence), [1],
      `${name} capture error consumed sequence more than once`);
  }

  for (const [field, reasonCode] of [
    ["sequence", "request-context-sequence-read-failed"],
    ["timestampMs", "request-context-timestamp-read-failed"],
    ["phase", "request-context-phase-read-failed"],
  ]) {
    const context = { sequence: 1, timestampMs: 1, phase: "boundary" };
    Object.defineProperty(context, field, {
      enumerable: true,
      get() { throw new Error(`fixture ${field} getter failed`); },
    });
    const recorder = createRecorder({ caseId: `getter-${field}` });
    assert.doesNotThrow(() => recorder.recordRequest(request, context),
      `${field} getter failure escaped callback`);
    const captureError = recorder.snapshot().captureErrors[0];
    assert.equal(captureError?.reasonCode, reasonCode,
      `${field} getter failure lost property-level reason`);
    assert(Object.isFrozen(captureError?.error),
      `${field} getter failure nested error is mutable`);
  }

  const propertyFailureRequest = fakeRequest({
    method: "GET", path: "/property-failure", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: "resourceType",
  });
  const recoveryRecorder = createRecorder({ caseId: "property-recovery" });
  recoveryRecorder.recordRequest(request, {
    sequence: 1, timestampMs: 1, phase: "before-property-error",
  });
  recoveryRecorder.recordRequest(propertyFailureRequest, {
    sequence: 2, timestampMs: 2, phase: "property-error",
  });
  recoveryRecorder.recordRequest(request, {
    sequence: 3, timestampMs: 3, phase: "after-property-error",
  });
  const recoverySnapshot = recoveryRecorder.snapshot();
  assert.deepStrictEqual(recoverySnapshot.requests.map(item => item.sequence), [1, 3],
    "property capture failure cascaded into next normal sequence");
  assert.deepStrictEqual(recoverySnapshot.captureErrors.map(item => item.sequence), [2],
    "property capture failure consumed sequence more than once");
}

function assertResponseAndTerminalBehavior(createRecorder) {
  const request = fakeRequest({
    method: "GET", path: "/response-terminal", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const responseFailures = [
    ["response-request-throw", Object.freeze({
      request() { throw new Error("fixture response request read failed"); },
      status() { return 200; },
    }), "response-request-read-failed"],
    ["response-status-throw", Object.freeze({
      request() { return request; },
      status() { throw new Error("fixture response status read failed"); },
    }), "response-status-read-failed"],
    ["response-invalid-request", Object.freeze({
      request() { return null; },
      status() { return 200; },
    }), "object-identity-invalid"],
  ];
  for (const [caseId, response, reasonCode] of responseFailures) {
    const recorder = createRecorder({ caseId });
    assert.doesNotThrow(() => recorder.recordResponse(response),
      `${caseId} escaped response callback`);
    const snapshot = recorder.snapshot();
    assert.equal(snapshot.responses.length, 0, `${caseId} produced a response envelope`);
    assert.equal(snapshot.captureErrors[0]?.code, "RESPONSE_CAPTURE_FAILED",
      `${caseId} capture error code drift`);
    assert.equal(snapshot.captureErrors[0]?.reasonCode, reasonCode,
      `${caseId} capture error reason drift`);
    assert(Object.isFrozen(snapshot.captureErrors[0]?.error),
      `${caseId} nested capture error is mutable`);
  }

  for (const [method, code] of [
    ["recordRequestFinished", "REQUEST_FINISHED_CAPTURE_FAILED"],
    ["recordRequestFailed", "REQUEST_FAILED_CAPTURE_FAILED"],
  ]) {
    const recorder = createRecorder({ caseId: `invalid-${method}` });
    assert.doesNotThrow(() => recorder[method](null, new Error("terminal-invalid")),
      `${method} invalid request identity escaped callback`);
    const captureError = recorder.snapshot().captureErrors[0];
    assert.equal(captureError?.code, code, `${method} capture error code drift`);
    assert.equal(captureError?.reasonCode, "object-identity-invalid",
      `${method} invalid request identity reason drift`);
    assert(Object.isFrozen(captureError?.error), `${method} nested capture error is mutable`);
  }

  const hostileFailure = new Proxy({}, {
    getPrototypeOf() { throw new Error("fixture failure prototype read failed"); },
    get() { throw new Error("fixture failure property read failed"); },
  });
  const sanitizerRecorder = createRecorder({ caseId: "failure-sanitizer" });
  let failedEnvelope = null;
  assert.doesNotThrow(() => {
    failedEnvelope = sanitizerRecorder.recordRequestFailed(request, hostileFailure);
  }, "request failure sanitizer escaped callback");
  assert(Object.isFrozen(failedEnvelope) && Object.isFrozen(failedEnvelope?.failure),
    "request failure sanitizer did not return immutable detail");
  assert.equal(failedEnvelope?.failure.message, "unreadable capture failure",
    "request failure sanitizer fallback drift");
  assert.equal(sanitizerRecorder.snapshot().captureErrors.length, 0,
    "sanitized request failure was misreported as capture failure");
}

function assertCaptureOnlyShapeAndIsolation(createRecorder) {
  const requestKeys = [
    "actionInvocation", "capturePhase", "correlationDigest", "method",
    "navigationInvocation", "objectIdentity", "path", "phase",
    "redirectedFromObject", "redirectedFromObjectIdentity", "requestId",
    "requestKind", "requestObject", "resourceType", "sequence", "timestamp",
  ];
  const responseKeys = [
    "capturePhase", "phase", "requestObjectIdentity", "responseObject",
    "responseObjectIdentity", "responseRequestObject", "responseRequestObjectIdentity",
    "sequence", "status", "timestamp",
  ];
  const finishedKeys = [
    "capturePhase", "phase", "requestObject", "requestObjectIdentity", "sequence",
    "timestamp",
  ];
  const failedKeys = [
    "capturePhase", "failure", "phase", "requestObject", "requestObjectIdentity",
    "sequence", "timestamp",
  ];
  const apiKeys = [
    "recordRequest", "recordResponse", "recordRequestFinished", "recordRequestFailed",
    "snapshot",
  ];
  const request = fakeRequest({
    method: "GET", path: "/shape", resourceType: "document",
    isNavigationRequest: true, redirectedFromRequest: null, throwOn: null,
  });
  const recorder = createRecorder({ caseId: "shape-boundary" });
  assert.deepStrictEqual(Object.keys(recorder), apiKeys, "recorder API shape drift");
  const requestEnvelope = recorder.recordRequest(request);
  const responseEnvelope = recorder.recordResponse(fakeResponse(request, 200));
  const beforeTerminalSnapshot = recorder.snapshot();
  const finishedEnvelope = recorder.recordRequestFinished(request);
  const afterFinishedSnapshot = recorder.snapshot();
  const failedEnvelope = recorder.recordRequestFailed(request, new Error("shape-failure"));
  const afterFailedSnapshot = recorder.snapshot();
  assert.deepStrictEqual(Object.keys(requestEnvelope).sort(), requestKeys,
    "request capture-only envelope shape drift");
  assert.deepStrictEqual(Object.keys(responseEnvelope).sort(), responseKeys,
    "response capture-only envelope shape drift");
  assert.deepStrictEqual(Object.keys(finishedEnvelope).sort(), finishedKeys,
    "request-finished capture-only envelope shape drift");
  assert.deepStrictEqual(Object.keys(failedEnvelope).sort(), failedKeys,
    "request-failed capture-only envelope shape drift");
  assert.deepStrictEqual([
    finishedEnvelope.sequence, finishedEnvelope.capturePhase,
    finishedEnvelope.requestObjectIdentity,
  ], [3, "request-finished", requestEnvelope.objectIdentity],
  "request-finished sequence/capturePhase/identity drift");
  assert.deepStrictEqual([
    failedEnvelope.sequence, failedEnvelope.capturePhase,
    failedEnvelope.requestObjectIdentity,
  ], [4, "request-failed", requestEnvelope.objectIdentity],
  "request-failed sequence/capturePhase/identity drift");
  const snapshotKeys = [
    "captureErrors", "requestFailed", "requestFinished", "requests", "responses",
  ];
  assert.deepStrictEqual(Object.keys(afterFailedSnapshot).sort(), snapshotKeys,
    "terminal ledger snapshot shape drift");
  assert(Object.isFrozen(afterFailedSnapshot.requestFinished) &&
    Object.isFrozen(afterFailedSnapshot.requestFailed),
  "terminal ledger snapshot arrays are mutable");
  assert.deepStrictEqual([
    beforeTerminalSnapshot.requestFinished?.length,
    beforeTerminalSnapshot.requestFailed?.length,
    afterFinishedSnapshot.requestFinished?.length,
    afterFinishedSnapshot.requestFailed?.length,
    afterFailedSnapshot.requestFinished?.length,
    afterFailedSnapshot.requestFailed?.length,
  ], [0, 0, 1, 0, 1, 1], "terminal ledger snapshot temporal cardinality drift");
  assert.strictEqual(afterFailedSnapshot.requestFinished[0], finishedEnvelope,
    "request-finished snapshot replaced the returned envelope");
  assert.strictEqual(afterFailedSnapshot.requestFailed[0], failedEnvelope,
    "request-failed snapshot replaced the returned envelope");
  assert(Object.isFrozen(afterFailedSnapshot.requestFailed[0].failure),
    "request-failed snapshot failure is mutable");

  const firstRecorder = createRecorder({ caseId: "isolated-first" });
  const secondRecorder = createRecorder({ caseId: "isolated-second" });
  const firstRequest = fakeRequest({
    method: "GET", path: "/isolated/first", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const secondRequest = fakeRequest({
    method: "GET", path: "/isolated/second", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const firstRequestEnvelope = firstRecorder.recordRequest(firstRequest);
  const secondRequestEnvelope = secondRecorder.recordRequest(secondRequest);
  const firstResponseEnvelope = firstRecorder.recordResponse(fakeResponse(firstRequest, 200));
  const secondFinishedEnvelope = secondRecorder.recordRequestFinished(secondRequest);
  assert.deepStrictEqual([
    firstRequestEnvelope.sequence, firstResponseEnvelope.sequence,
    secondRequestEnvelope.sequence, secondFinishedEnvelope.sequence,
  ], [1, 2, 1, 2], "interleaved recorders share sequence state");
  assert.notEqual(firstRequestEnvelope.objectIdentity, secondRequestEnvelope.objectIdentity,
    "interleaved recorders share opaque object IDs");
  assert.notEqual(firstRequestEnvelope.requestId, secondRequestEnvelope.requestId,
    "interleaved recorders share request IDs");

  const pathCases = [
    ["/ops/api/runtime?detail=1#fragment", "/ops/api/runtime"],
    ["/alpha/./beta/../gamma/", "/alpha/gamma/"],
    ["/encoded/%7Eviewer/%2Fsegment", "/encoded/%7Eviewer/%2Fsegment"],
  ];
  const pathRecorder = createRecorder({ caseId: "pathname-boundary" });
  const pathEnvelopes = pathCases.map(([path]) => pathRecorder.recordRequest(fakeRequest({
    method: "GET", path, resourceType: "fetch", isNavigationRequest: false,
    redirectedFromRequest: null, throwOn: null,
  })));
  assert.deepStrictEqual(pathEnvelopes.map(item => item.path), pathCases.map(item => item[1]),
    "WHATWG URL.pathname normalization literal drift");

  const temporalRecorder = createRecorder({ caseId: "temporal-snapshot" });
  const firstTemporalRequest = fakeRequest({
    method: "GET", path: "/temporal/first", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const secondTemporalRequest = fakeRequest({
    method: "GET", path: "/temporal/second", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  temporalRecorder.recordRequest(firstTemporalRequest);
  const before = temporalRecorder.snapshot();
  temporalRecorder.recordRequest(secondTemporalRequest);
  temporalRecorder.recordResponse(fakeResponse(secondTemporalRequest, 200));
  const after = temporalRecorder.snapshot();
  assert.deepStrictEqual([before.requests.length, before.responses.length], [1, 0],
    "previous snapshot changed after later captures");
  assert.deepStrictEqual([after.requests.length, after.responses.length], [2, 1],
    "new snapshot did not include later captures");
  assert.notStrictEqual(before.requests, after.requests,
    "snapshots reused a mutable request array");
  assert.notStrictEqual(before.responses, after.responses,
    "snapshots reused a mutable response array");
}

function assertPerRequestCorrelationDigest(createRecorder) {
  const makeRequest = name => fakeRequest({
    method: "POST", path: `/correlation/${name}`, resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const actionProjection = invocationId => Object.freeze({
    invocationId,
    phase: "primary-action",
    startedSequence: 0,
    endedSequence: 10,
    startedAtMs: 100,
    endedAtMs: 200,
    current: true,
  });
  const recorder = createRecorder({
    caseId: "per-request-correlation",
    correlationDigest: "default-correlation-digest",
  });
  const firstRequest = makeRequest("first-action");
  const secondRequest = makeRequest("second-action");
  const fallbackRequest = makeRequest("fallback");
  const firstEnvelope = recorder.recordRequest(firstRequest, {
    correlationDigest: "first-action-digest",
    actionInvocation: actionProjection("ACTION:first"),
  });
  const secondEnvelope = recorder.recordRequest(secondRequest, {
    correlationDigest: "second-action-digest",
    actionInvocation: actionProjection("ACTION:second"),
  });
  const fallbackEnvelope = recorder.recordRequest(fallbackRequest, {});
  assert.deepStrictEqual([
    firstEnvelope.correlationDigest,
    secondEnvelope.correlationDigest,
    fallbackEnvelope.correlationDigest,
  ], ["first-action-digest", "second-action-digest", "default-correlation-digest"],
  "per-request correlation digest override/default drift");
  assert(!Object.hasOwn(firstEnvelope, "correlationId") &&
    !Object.hasOwn(secondEnvelope, "correlationId"),
  "raw external correlation ID leaked into request envelope");

  const responseEnvelope = recorder.recordResponse(fakeResponse(firstRequest, 201));
  const finishedEnvelope = recorder.recordRequestFinished(firstRequest);
  const failedEnvelope = recorder.recordRequestFailed(secondRequest,
    new Error("correlation-failure"));
  for (const envelope of [responseEnvelope, finishedEnvelope, failedEnvelope]) {
    assert(!Object.hasOwn(envelope, "correlationDigest"),
      `${envelope.capturePhase} conflated request correlation digest`);
  }
  assert.equal(firstEnvelope.correlationDigest, "first-action-digest",
    "response/terminal capture mutated prior request correlation digest");

  for (const [name, value] of [
    ["undefined", undefined],
    ["empty", ""],
    ["nonstring", 42],
  ]) {
    const invalidRecorder = createRecorder({
      caseId: `invalid-correlation-${name}`,
      correlationDigest: "constructor-default",
    });
    const result = invalidRecorder.recordRequest(makeRequest(name), {
      correlationDigest: value,
    });
    assert.strictEqual(result, null, `${name} correlation digest did not fail closed`);
    assert.deepStrictEqual(invalidRecorder.snapshot().captureErrors.map(item => item.reasonCode),
      ["request-correlation-digest-invalid"],
    `${name} correlation digest reason drift`);
  }

  const getterContext = {};
  Object.defineProperty(getterContext, "correlationDigest", {
    enumerable: true,
    get() { throw new Error("fixture correlationDigest getter failed"); },
  });
  const getterRecorder = createRecorder({
    caseId: "correlation-getter",
    correlationDigest: "constructor-default",
  });
  let getterResult = "not-called";
  assert.doesNotThrow(() => {
    getterResult = getterRecorder.recordRequest(makeRequest("getter"), getterContext);
  }, "correlationDigest getter failure escaped callback");
  assert.strictEqual(getterResult, null,
    "correlationDigest getter failure produced a request envelope");
  const getterSnapshot = getterRecorder.snapshot();
  assert.equal(getterSnapshot.requests.length, 0,
    "correlationDigest getter failure persisted a request envelope");
  assert.deepStrictEqual(getterSnapshot.captureErrors.map(item => item.reasonCode),
    ["request-correlation-digest-read-failed"],
  "correlationDigest getter failure reason drift");
  assert(Object.isFrozen(getterSnapshot.captureErrors[0]?.error),
    "correlationDigest getter nested error is mutable");

  const inheritedContext = Object.create({
    correlationDigest: "inherited-must-not-override",
  });
  const inheritedRecorder = createRecorder({
    caseId: "correlation-inherited",
    correlationDigest: "constructor-default",
  });
  const inheritedEnvelope = inheritedRecorder.recordRequest(
    makeRequest("inherited"), inheritedContext);
  assert.equal(inheritedEnvelope?.correlationDigest, "constructor-default",
    "inherited correlationDigest overrode constructor default");

  const rawCorrelationId = "raw-external-correlation-id";
  const rawFieldRecorder = createRecorder({
    caseId: "correlation-raw-field",
    correlationDigest: "constructor-default",
  });
  const rawFieldEnvelope = rawFieldRecorder.recordRequest(makeRequest("raw-field"), {
    correlationDigest: "digest-only-value",
    correlationId: rawCorrelationId,
  });
  assert.deepStrictEqual(Object.keys(rawFieldEnvelope).sort(), [
    "actionInvocation", "capturePhase", "correlationDigest", "method",
    "navigationInvocation", "objectIdentity", "path", "phase",
    "redirectedFromObject", "redirectedFromObjectIdentity", "requestId",
    "requestKind", "requestObject", "resourceType", "sequence", "timestamp",
  ], "raw correlation field changed exact request envelope shape");
  assert.equal(rawFieldEnvelope.correlationDigest, "digest-only-value",
    "raw correlation field displaced digest-only value");
  assert(!Object.hasOwn(rawFieldEnvelope, "correlationId"),
    "raw correlationId leaked into request envelope");
  assert(!Object.values(rawFieldEnvelope).includes(rawCorrelationId),
    "raw correlationId leaked into request envelope values");
}

function assertResultObjectIdentity(fixtureCase, graph, result) {
  assert.deepStrictEqual(Object.keys(result),
    ["status", "classifications", "failures", "census"],
  `${fixtureCase.caseId} evaluator result fields drift`);
  assert(Array.isArray(result.classifications) && Array.isArray(result.failures),
    `${fixtureCase.caseId} evaluator result arrays missing`);
  for (const classification of result.classifications) {
    assert([...graph.requests.values()].includes(classification.request),
      `${fixtureCase.caseId} classification request is not an exact fixture object`);
    if (classification.response !== null) {
      assert(graph.responses.includes(classification.response),
        `${fixtureCase.caseId} classification response is not an exact fixture object`);
      assert.strictEqual(classification.response.request(), classification.request,
        `${fixtureCase.caseId} classification response/request identity mismatch`);
    }
  }
  for (const failure of result.failures) {
    if (failure.request !== null) {
      assert([...graph.requests.values()].includes(failure.request),
        `${fixtureCase.caseId} failure request is not an exact fixture object`);
    }
    if (failure.response !== null) {
      assert(graph.responses.includes(failure.response),
        `${fixtureCase.caseId} failure response is not an exact fixture object`);
    }
  }
}

function normalizeResult(graph, result) {
  const requestIdentity = request => request === null
    ? null
    : [...graph.requests.entries()].find(([, value]) => value === request)?.[0];
  const responseIndex = response => response === null
    ? null
    : graph.responses.findIndex(value => value === response);
  return {
    status: result.status,
    classifications: result.classifications.map(item => ({
      requestIdentity: requestIdentity(item.request),
      responseIndex: responseIndex(item.response),
      requestKind: item.requestKind,
      classification: item.classification,
      owner: item.owner,
      phase: item.phase,
    })),
    failures: result.failures.map(item => ({
      code: item.code,
      requestIdentity: requestIdentity(item.request),
      responseIndex: responseIndex(item.response),
    })),
    census: result.census,
  };
}

function assertEvaluatorBoundaryBehavior(evaluate) {
  const projection = (invocationId, overrides = {}) => Object.freeze({
    invocationId,
    phase: "primary-action",
    startedSequence: 0,
    endedSequence: 10,
    startedAtMs: 0,
    endedAtMs: 100,
    current: true,
    ...overrides,
  });
  const ledger = (invocation, requests, overrides = {}) => Object.freeze({
    invocationId: invocation.invocationId,
    phase: invocation.phase,
    startedSequence: invocation.startedSequence,
    endedSequence: invocation.endedSequence ?? 10,
    startedAtMs: invocation.startedAtMs,
    endedAtMs: invocation.endedAtMs ?? 100,
    current: invocation.current,
    requests: Object.freeze([...requests]),
    ...overrides,
  });
  const requestEnvelope = (request, overrides = {}) => Object.freeze({
    requestObject: request,
    objectIdentity: "opaque-request",
    requestId: "boundary:request",
    sequence: 1,
    method: "GET",
    path: "/boundary",
    resourceType: "fetch",
    requestKind: "application-fetch",
    navigationInvocation: null,
    actionInvocation: null,
    correlationDigest: "boundary-digest",
    redirectedFromObject: null,
    redirectedFromObjectIdentity: null,
    timestamp: 10,
    phase: "boundary",
    capturePhase: "request",
    ...overrides,
  });
  const responseEnvelope = (request, status = 200) => {
    const response = fakeResponse(request, status);
    return Object.freeze({
      responseObject: response,
      responseObjectIdentity: "opaque-response",
      responseRequestObject: request,
      responseRequestObjectIdentity: "opaque-request",
      requestObjectIdentity: "opaque-request",
      sequence: 9,
      status,
      timestamp: 90,
      phase: "response-callback",
      capturePhase: "response",
    });
  };
  const terminalEnvelope = request => Object.freeze({
    requestObject: request,
    requestObjectIdentity: "opaque-request",
    sequence: 2,
    failure: Object.freeze({ name: "Error", message: "network failed" }),
    timestamp: 20,
    phase: "request-failed-callback",
    capturePhase: "request-failed",
  });
  const snapshot = ({ requests = [], responses = [], requestFinished = [],
      requestFailed = [], captureErrors = [] } = {}) => Object.freeze({
    requests: Object.freeze(requests),
    responses: Object.freeze(responses),
    requestFinished: Object.freeze(requestFinished),
    requestFailed: Object.freeze(requestFailed),
    captureErrors: Object.freeze(captureErrors),
  });
  const runBoundary = (name, input, expectedCodes, verify = () => {}) => {
    let result = null;
    assert.doesNotThrow(() => {
      result = evaluate(input);
    }, `${name} evaluator threw on case data defect`);
    assert.equal(result.status, "FAIL", `${name} did not fail closed`);
    assert.deepStrictEqual(result.failures.map(item => item.code), expectedCodes,
      `${name} exhaustive failure order drift`);
    assert(Object.isFrozen(result) && Object.isFrozen(result.classifications) &&
      Object.isFrozen(result.failures) && Object.isFrozen(result.census),
    `${name} result structure is mutable`);
    assert(result.classifications.every(Object.isFrozen) &&
      result.failures.every(Object.isFrozen), `${name} result entries are mutable`);
    assert.equal(result.census.failureCount, result.failures.length,
      `${name} failure census is incomplete`);
    verify(result);
  };
  const input = (recorderSnapshot, navigationInvocations = [], actionInvocations = []) => ({
    caseId: "evaluator-boundary",
    recorderSnapshot,
    navigationInvocations: Object.freeze(navigationInvocations),
    actionInvocations: Object.freeze(actionInvocations),
  });

  runBoundary("malformed snapshot", input(null), ["INPUT_INVALID"]);

  const duplicateRequest = fakeRequest({
    method: "GET", path: "/duplicate", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const unknownResponseRequest = fakeRequest({
    method: "GET", path: "/unknown", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  runBoundary("duplicate request and unknown response", input(snapshot({
    requests: [requestEnvelope(duplicateRequest),
      requestEnvelope(duplicateRequest, { requestId: "boundary:request-2", sequence: 2 })],
    responses: [responseEnvelope(unknownResponseRequest)],
  })), ["REQUEST_DUPLICATE", "RESPONSE_REQUEST_UNKNOWN"]);

  const missingResponseObjectRequest = fakeRequest({
    method: "GET", path: "/missing-response-object", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  runBoundary("missing raw response object", input(snapshot({
    requests: [requestEnvelope(missingResponseObjectRequest)],
    responses: [Object.freeze({
      ...responseEnvelope(missingResponseObjectRequest),
      responseObject: null,
    })],
  })), ["RESPONSE_IDENTITY_MISSING"], result => {
    assert.strictEqual(result.failures[0].request, missingResponseObjectRequest,
      "missing response object failure lost known raw request identity");
  });

  const missingResponseRequestMethod = fakeRequest({
    method: "GET", path: "/missing-response-request-method", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  runBoundary("raw response request method missing", input(snapshot({
    requests: [requestEnvelope(missingResponseRequestMethod)],
    responses: [Object.freeze({
      ...responseEnvelope(missingResponseRequestMethod),
      responseObject: Object.freeze({}),
    })],
  })), ["RESPONSE_IDENTITY_MISMATCH"]);

  const missingResponseRequest = fakeRequest({
    method: "GET", path: "/missing-response", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  runBoundary("otherwise valid missing response", input(snapshot({
    requests: [requestEnvelope(missingResponseRequest)],
  })), ["RESPONSE_MISSING"]);

  const failedRequest = fakeRequest({
    method: "GET", path: "/request-failed", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  runBoundary("request failed terminal", input(snapshot({
    requests: [requestEnvelope(failedRequest)],
    requestFailed: [terminalEnvelope(failedRequest)],
  })), ["REQUEST_FAILED"]);

  const unknownParent = fakeRequest({
    method: "POST", path: "/unknown-parent", resourceType: "document",
    isNavigationRequest: true, redirectedFromRequest: null, throwOn: null,
  });
  const unknownParentChild = fakeRequest({
    method: "GET", path: "/unknown-child", resourceType: "document",
    isNavigationRequest: true, redirectedFromRequest: unknownParent, throwOn: null,
  });
  const unknownNavigation = projection("boundary:unknown-navigation", {
    phase: "document-navigation",
  });
  runBoundary("redirect parent unknown", input(snapshot({
    requests: [requestEnvelope(unknownParentChild, {
      resourceType: "document", requestKind: "document-navigation",
      redirectedFromObject: unknownParent, navigationInvocation: unknownNavigation,
    })],
    responses: [responseEnvelope(unknownParentChild)],
  }), [ledger(unknownNavigation, [unknownParentChild])]), ["REDIRECT_PARENT_MISSING"]);

  const wrongTypeParent = fakeRequest({
    method: "GET", path: "/wrong-type-parent", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const wrongTypeChild = fakeRequest({
    method: "GET", path: "/wrong-type-child", resourceType: "document",
    isNavigationRequest: true, redirectedFromRequest: wrongTypeParent, throwOn: null,
  });
  const wrongTypeNavigation = projection("boundary:wrong-type-navigation", {
    phase: "document-navigation",
  });
  runBoundary("actionless redirect parent wrong", input(snapshot({
    requests: [
      requestEnvelope(wrongTypeParent),
      requestEnvelope(wrongTypeChild, {
        requestId: "boundary:wrong-type-child", sequence: 2, timestamp: 20,
        resourceType: "document", requestKind: "document-navigation",
        redirectedFromObject: wrongTypeParent,
        navigationInvocation: wrongTypeNavigation,
      }),
    ],
    responses: [responseEnvelope(wrongTypeParent), responseEnvelope(wrongTypeChild)],
  }), [ledger(wrongTypeNavigation, [wrongTypeChild])]), ["REDIRECT_PARENT_WRONG"]);

  const navigationParent = fakeRequest({
    method: "GET", path: "/navigation-parent", resourceType: "document",
    isNavigationRequest: true, redirectedFromRequest: null, throwOn: null,
  });
  const navigationChild = fakeRequest({
    method: "GET", path: "/navigation-child", resourceType: "document",
    isNavigationRequest: true, redirectedFromRequest: navigationParent, throwOn: null,
  });
  const parentNavigation = projection("boundary:parent-navigation", {
    phase: "document-navigation",
  });
  const otherNavigation = projection("boundary:other-navigation", {
    phase: "document-navigation",
  });
  runBoundary("actionless redirect navigation cross chain", input(snapshot({
    requests: [
      requestEnvelope(navigationParent, {
        resourceType: "document", requestKind: "document-navigation",
        navigationInvocation: parentNavigation,
      }),
      requestEnvelope(navigationChild, {
        requestId: "boundary:navigation-child", sequence: 2, timestamp: 20,
        resourceType: "document", requestKind: "document-navigation",
        redirectedFromObject: navigationParent, navigationInvocation: otherNavigation,
      }),
    ],
    responses: [responseEnvelope(navigationParent), responseEnvelope(navigationChild)],
  }), [ledger(parentNavigation, [navigationParent]),
    ledger(otherNavigation, [navigationChild])]), ["REDIRECT_CHAIN_MISMATCH"]);

  const chainParent = fakeRequest({
    method: "POST", path: "/chain-parent", resourceType: "document",
    isNavigationRequest: true, redirectedFromRequest: null, throwOn: null,
  });
  const chainChild = fakeRequest({
    method: "GET", path: "/chain-child", resourceType: "document",
    isNavigationRequest: true, redirectedFromRequest: chainParent, throwOn: null,
  });
  const parentAction = projection("boundary:parent-action");
  const childAction = projection("boundary:child-action");
  const childNavigation = projection("boundary:child-navigation", {
    phase: "document-navigation",
  });
  runBoundary("redirect cross chain", input(snapshot({
    requests: [
      requestEnvelope(chainParent, {
        resourceType: "document", requestKind: "document-navigation",
        actionInvocation: parentAction,
      }),
      requestEnvelope(chainChild, {
        requestId: "boundary:chain-child", sequence: 2, timestamp: 20,
        resourceType: "document", requestKind: "document-navigation",
        redirectedFromObject: chainParent, navigationInvocation: childNavigation,
        actionInvocation: childAction,
      }),
    ],
    responses: [responseEnvelope(chainParent), responseEnvelope(chainChild)],
  }), [ledger(childNavigation, [chainChild])], [
    ledger(parentAction, [chainParent]), ledger(childAction, [chainChild]),
  ]), ["REDIRECT_CHAIN_MISMATCH"]);

  const missingChildActionParent = fakeRequest({
    method: "POST", path: "/missing-child-action-parent", resourceType: "document",
    isNavigationRequest: true, redirectedFromRequest: null, throwOn: null,
  });
  const missingChildActionChild = fakeRequest({
    method: "GET", path: "/missing-child-action-child", resourceType: "document",
    isNavigationRequest: true, redirectedFromRequest: missingChildActionParent, throwOn: null,
  });
  const missingChildNavigation = projection("boundary:missing-child-navigation", {
    phase: "document-navigation",
  });
  const owningParentAction = projection("boundary:owning-parent-action");
  runBoundary("action redirect missing child action projection", input(snapshot({
    requests: [
      requestEnvelope(missingChildActionParent, {
        resourceType: "document", requestKind: "document-navigation",
        navigationInvocation: missingChildNavigation, actionInvocation: owningParentAction,
      }),
      requestEnvelope(missingChildActionChild, {
        requestId: "boundary:missing-child-action-child", sequence: 2, timestamp: 20,
        resourceType: "document", requestKind: "document-navigation",
        redirectedFromObject: missingChildActionParent,
        navigationInvocation: missingChildNavigation,
      }),
    ],
    responses: [responseEnvelope(missingChildActionParent),
      responseEnvelope(missingChildActionChild)],
  }), [ledger(missingChildNavigation, [missingChildActionParent,
    missingChildActionChild])], [
    ledger(owningParentAction, [missingChildActionParent]),
  ]), ["REDIRECT_CHAIN_MISMATCH"]);

  const openRequest = fakeRequest({
    method: "POST", path: "/open-stale", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const openAction = projection("boundary:open-action", {
    endedSequence: null, endedAtMs: null,
  });
  runBoundary("open projection final bound mismatch", input(snapshot({
    requests: [requestEnvelope(openRequest, {
      sequence: 3, timestamp: 30, actionInvocation: openAction,
    })],
    responses: [responseEnvelope(openRequest)],
  }), [], [ledger(openAction, [openRequest], {
    endedSequence: 2, endedAtMs: 20,
  })]), ["INVOCATION_STALE"]);

  const missingLedgerRequest = fakeRequest({
    method: "POST", path: "/missing-ledger", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const mismatchRequest = fakeRequest({
    method: "POST", path: "/mismatch-ledger", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const missingAction = projection("boundary:missing-action");
  const mismatchedAction = projection("boundary:mismatched-action");
  runBoundary("invocation missing and mismatch", input(snapshot({
    requests: [
      requestEnvelope(missingLedgerRequest, { actionInvocation: missingAction }),
      requestEnvelope(mismatchRequest, {
        requestId: "boundary:mismatch", sequence: 2, timestamp: 20,
        actionInvocation: mismatchedAction,
      }),
    ],
    responses: [responseEnvelope(missingLedgerRequest), responseEnvelope(mismatchRequest)],
  }), [], [ledger(mismatchedAction, [mismatchRequest], {
    phase: "different-final-phase",
  })]), ["INVOCATION_LEDGER_MISSING", "INVOCATION_PROJECTION_MISMATCH"]);

  const exhaustiveProjectionRequest = fakeRequest({
    method: "POST", path: "/exhaustive-projections", resourceType: "document",
    isNavigationRequest: true, redirectedFromRequest: null, throwOn: null,
  });
  const missingNavigation = projection("boundary:missing-navigation", {
    phase: "document-navigation",
  });
  const secondMissingAction = projection("boundary:second-missing-action");
  runBoundary("independent projection failures", input(snapshot({
    requests: [requestEnvelope(exhaustiveProjectionRequest, {
      resourceType: "document", requestKind: "document-navigation",
      navigationInvocation: missingNavigation, actionInvocation: secondMissingAction,
    })],
    responses: [responseEnvelope(exhaustiveProjectionRequest)],
  })), ["INVOCATION_LEDGER_MISSING", "INVOCATION_LEDGER_MISSING"]);

  const invalidContractMissingLedgerRequest = fakeRequest({
    method: "POST", path: "/invalid-contract-missing-ledger", resourceType: null,
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const invalidContractMissingAction = projection("boundary:invalid-contract-missing");
  runBoundary("request contract and invocation failures", input(snapshot({
    requests: [requestEnvelope(invalidContractMissingLedgerRequest, {
      resourceType: null, requestKind: "unclassified-request",
      actionInvocation: invalidContractMissingAction,
    })],
    responses: [responseEnvelope(invalidContractMissingLedgerRequest)],
  })), ["RESOURCE_TYPE_MISSING", "INVOCATION_LEDGER_MISSING"]);

  const currentMismatchRequest = fakeRequest({
    method: "POST", path: "/current-mismatch", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const currentMismatchAction = projection("boundary:current-mismatch");
  runBoundary("projection final current mismatch", input(snapshot({
    requests: [requestEnvelope(currentMismatchRequest, {
      actionInvocation: currentMismatchAction,
    })],
    responses: [responseEnvelope(currentMismatchRequest)],
  }), [], [ledger(currentMismatchAction, [currentMismatchRequest], {
    current: false,
  })]), ["INVOCATION_PROJECTION_MISMATCH"]);

  const nonCurrentMissingLedgerRequest = fakeRequest({
    method: "POST", path: "/non-current-missing-ledger", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const nonCurrentMissingAction = projection("boundary:non-current-missing", {
    current: false,
  });
  runBoundary("non-current projection with missing ledger", input(snapshot({
    requests: [requestEnvelope(nonCurrentMissingLedgerRequest, {
      actionInvocation: nonCurrentMissingAction,
    })],
    responses: [responseEnvelope(nonCurrentMissingLedgerRequest)],
  })), ["CROSS_ACTION_LEAK", "INVOCATION_LEDGER_MISSING"]);

  const reverseOwnedRequest = fakeRequest({
    method: "GET", path: "/reverse-owned", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const multiplyOwnedRequest = fakeRequest({
    method: "POST", path: "/multiply-owned", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const projectedOwner = projection("boundary:projected-owner");
  const reverseOwner = projection("boundary:reverse-owner");
  const secondOwner = projection("boundary:second-owner");
  runBoundary("reverse and multiple action ownership", input(snapshot({
    requests: [
      requestEnvelope(reverseOwnedRequest),
      requestEnvelope(multiplyOwnedRequest, {
        requestId: "boundary:multiply-owned", sequence: 2, timestamp: 20,
        actionInvocation: projectedOwner,
      }),
    ],
    responses: [responseEnvelope(reverseOwnedRequest), responseEnvelope(multiplyOwnedRequest)],
  }), [], [
    ledger(reverseOwner, [reverseOwnedRequest]),
    ledger(projectedOwner, [multiplyOwnedRequest]),
    ledger(secondOwner, [multiplyOwnedRequest]),
  ]), ["CROSS_ACTION_LEAK", "CROSS_ACTION_LEAK"]);

  const reverseMissingLedgerRequest = fakeRequest({
    method: "POST", path: "/reverse-missing-ledger", resourceType: "fetch",
    isNavigationRequest: false, redirectedFromRequest: null, throwOn: null,
  });
  const absentProjectedOwner = projection("boundary:absent-projected-owner");
  const onlyReverseOwner = projection("boundary:only-reverse-owner");
  runBoundary("reverse ownership with missing projected ledger", input(snapshot({
    requests: [requestEnvelope(reverseMissingLedgerRequest, {
      actionInvocation: absentProjectedOwner,
    })],
    responses: [responseEnvelope(reverseMissingLedgerRequest)],
  }), [], [ledger(onlyReverseOwner, [reverseMissingLedgerRequest])]), [
    "CROSS_ACTION_LEAK", "INVOCATION_LEDGER_MISSING",
  ]);

  const multiplyParent = fakeRequest({
    method: "POST", path: "/multiply-parent", resourceType: "document",
    isNavigationRequest: true, redirectedFromRequest: null, throwOn: null,
  });
  const multiplyChild = fakeRequest({
    method: "GET", path: "/multiply-child", resourceType: "document",
    isNavigationRequest: true, redirectedFromRequest: multiplyParent, throwOn: null,
  });
  const multiplyAction = projection("boundary:multiply-action");
  const multiplyNavigation = projection("boundary:multiply-navigation", {
    phase: "document-navigation",
  });
  runBoundary("multiple simultaneous candidates", input(snapshot({
    requests: [
      requestEnvelope(multiplyParent, {
        resourceType: "document", requestKind: "document-navigation",
        navigationInvocation: multiplyNavigation, actionInvocation: multiplyAction,
      }),
      requestEnvelope(multiplyChild, {
        requestId: "boundary:multiply-child", sequence: 2, timestamp: 20,
        resourceType: "document", requestKind: "document-navigation",
        redirectedFromObject: multiplyParent, navigationInvocation: multiplyNavigation,
        actionInvocation: multiplyAction,
      }),
    ],
    responses: [responseEnvelope(multiplyParent), responseEnvelope(multiplyChild)],
  }), [ledger(multiplyNavigation, [multiplyParent, multiplyChild])], [
    ledger(multiplyAction, [multiplyParent, multiplyChild]),
  ]), ["CLASSIFICATION_MULTIPLE"], result => {
    assert.equal(result.census.multiplyClassified, 1,
      "multiple candidate census did not retain the conflict");
  });
}

function validateFixtureCase(fixtureCase, caseIndex) {
  const expectedPolarity = caseIndex < positiveCaseIds.length ? "positive" : "negative";
  assert.equal(fixtureCase.polarity, expectedPolarity,
    `${fixtureCase.caseId} polarity drift`);
  assert(/^[0-9a-f]{64}$/.test(fixtureCase.correlationDigest),
    `${fixtureCase.caseId} correlation digest invalid`);
  assert(Array.isArray(fixtureCase.requests) && Array.isArray(fixtureCase.responses) &&
    Array.isArray(fixtureCase.events) && Array.isArray(fixtureCase.navigationInvocations) &&
    Array.isArray(fixtureCase.actionInvocations),
  `${fixtureCase.caseId} object graph/invocation arrays missing`);
  assert(Array.isArray(fixtureCase.expectedCaptureErrorCodes),
    `${fixtureCase.caseId} capture error expectation missing`);

  const identities = new Set();
  for (const spec of fixtureCase.requests) {
    for (const field of ["identity", "method", "path", "resourceType",
      "isNavigationRequest", "requestKind", "redirectedFrom",
      "navigationInvocation", "actionInvocation", "throwOn"]) {
      assert(Object.hasOwn(spec, field), `${fixtureCase.caseId} request ${field} missing`);
    }
    assert(typeof spec.identity === "string" && spec.identity && !identities.has(spec.identity),
      `${fixtureCase.caseId} request identity invalid/duplicate`);
    identities.add(spec.identity);
    assert(typeof spec.method === "string" && /^\/[A-Za-z0-9_./?=&{}:-]*$/.test(spec.path),
      `${fixtureCase.caseId} request method/path invalid`);
    assert(spec.resourceType === null || typeof spec.resourceType === "string",
      `${fixtureCase.caseId} request resourceType invalid`);
    assert(typeof spec.isNavigationRequest === "boolean",
      `${fixtureCase.caseId} Playwright navigation state invalid`);
    const derivedRequestKind = expectedRequestKind(
      spec.isNavigationRequest, spec.resourceType);
    if (spec.resourceType === null) {
      assert.equal(derivedRequestKind, "unclassified-request",
        `${fixtureCase.caseId} missing resourceType requestKind must fail closed`);
    } else {
      assert.equal(spec.requestKind, derivedRequestKind,
        `${fixtureCase.caseId} Playwright resourceType/requestKind fixture drift`);
    }
    assert(spec.redirectedFrom === null || typeof spec.redirectedFrom === "string",
      `${fixtureCase.caseId} redirectedFrom invalid`);
    validateRequestProjection(fixtureCase, spec, "navigationInvocation",
      fixtureCase.navigationInvocations);
    validateRequestProjection(fixtureCase, spec, "actionInvocation",
      fixtureCase.actionInvocations);
    assert(spec.throwOn === null || ["method", "url", "resourceType",
      "isNavigationRequest", "redirectedFrom"].includes(spec.throwOn),
    `${fixtureCase.caseId} throwOn invalid`);
  }
  for (const spec of fixtureCase.requests) {
    assert(spec.redirectedFrom === null || identities.has(spec.redirectedFrom),
      `${fixtureCase.caseId} redirectedFrom identity missing: ${spec.redirectedFrom}`);
  }
  for (const response of fixtureCase.responses) {
    assert(identities.has(response.requestIdentity),
      `${fixtureCase.caseId} response request identity invalid`);
    assert(Number.isInteger(response.status) && response.status >= 100 && response.status <= 599,
      `${fixtureCase.caseId} response status invalid`);
  }
  for (const event of fixtureCase.events) {
    assert(["request", "response"].includes(event.type),
      `${fixtureCase.caseId} event type invalid`);
    assert(Number.isInteger(event.sequence) && Number.isInteger(event.timestampMs) &&
      typeof event.phase === "string" && event.phase,
    `${fixtureCase.caseId} event sequence/timestamp/phase missing`);
    if (event.type === "request") {
      assert(identities.has(event.requestIdentity),
        `${fixtureCase.caseId} event request identity invalid`);
    } else {
      assert(Number.isInteger(event.responseIndex) && fixtureCase.responses[event.responseIndex],
        `${fixtureCase.caseId} event response index invalid`);
    }
  }
  validateInvocationLedger(fixtureCase, fixtureCase.navigationInvocations,
    "navigation", identities);
  validateInvocationLedger(fixtureCase, fixtureCase.actionInvocations,
    "action", identities);
  assert.deepStrictEqual(Object.keys(fixtureCase.expected),
    ["status", "classifications", "failures", "census"],
  `${fixtureCase.caseId} literal expectation fields drift`);
  assert.equal(fixtureCase.expected.status,
    expectedPolarity === "positive" ? "PASS" : "FAIL",
  `${fixtureCase.caseId} expected status drift`);
  assert.deepStrictEqual(Object.keys(fixtureCase.expected.census), [
    "requestCount", "responseCount", "classified", "unclassified",
    "multiplyClassified", "captureErrors", "duplicateResponses", "failureCount",
  ], `${fixtureCase.caseId} exact-one census fields drift`);
  assert.equal(fixtureCase.expected.census.classified +
    fixtureCase.expected.census.unclassified,
  fixtureCase.expected.census.requestCount,
  `${fixtureCase.caseId} exact-one census request partition drift`);
  assert.equal(fixtureCase.expected.census.failureCount,
    fixtureCase.expected.failures.length,
  `${fixtureCase.caseId} census failureCount does not cover all failures`);
  for (const classification of fixtureCase.expected.classifications) {
    assert(["bootstrap", "action", "redirect", "background"]
      .includes(classification.classification),
    `${fixtureCase.caseId} classification taxonomy invalid`);
  }
}

function validateRequestProjection(fixtureCase, spec, field, ledger) {
  const projection = spec[field];
  assert(projection === null || (projection && typeof projection === "object" &&
    !Array.isArray(projection)),
  `${fixtureCase.caseId} ${spec.identity} ${field} must be object or explicit null`);
  if (projection === null) return;
  assert.deepStrictEqual(Object.keys(projection), [
    "invocationId", "phase", "startedSequence", "endedSequence",
    "startedAtMs", "endedAtMs", "current",
  ], `${fixtureCase.caseId} ${spec.identity} ${field} projection fields drift`);
  assert(typeof projection.invocationId === "string" && projection.invocationId &&
    typeof projection.phase === "string" && projection.phase &&
    Number.isInteger(projection.startedSequence) &&
    Number.isInteger(projection.endedSequence) &&
    Number.isInteger(projection.startedAtMs) && Number.isInteger(projection.endedAtMs) &&
    typeof projection.current === "boolean",
  `${fixtureCase.caseId} ${spec.identity} ${field} projection value invalid`);
  const matchingLedger = ledger.find(row => row.invocationId === projection.invocationId);
  assert(matchingLedger,
    `${fixtureCase.caseId} ${spec.identity} ${field} ledger binding missing`);
  const { requestIdentities: _requestIdentities, ...ledgerProjection } = matchingLedger;
  assert.deepStrictEqual(projection, ledgerProjection,
    `${fixtureCase.caseId} ${spec.identity} ${field} capture-time projection drift`);
}

function validateInvocationLedger(fixtureCase, rows, kind, identities) {
  for (const row of rows) {
    for (const field of ["invocationId", "phase", "startedSequence", "endedSequence",
      "startedAtMs", "endedAtMs", "current", "requestIdentities"]) {
      assert(Object.hasOwn(row, field),
        `${fixtureCase.caseId} ${kind} invocation ${field} missing`);
    }
    assert(typeof row.invocationId === "string" && row.invocationId &&
      typeof row.phase === "string" && row.phase && typeof row.current === "boolean",
    `${fixtureCase.caseId} ${kind} invocation identity/phase/current invalid`);
    assert(Number.isInteger(row.startedSequence) && Number.isInteger(row.endedSequence) &&
      row.startedSequence <= row.endedSequence && Number.isInteger(row.startedAtMs) &&
      Number.isInteger(row.endedAtMs) && row.startedAtMs <= row.endedAtMs,
    `${fixtureCase.caseId} ${kind} invocation bounds invalid`);
    assert(Array.isArray(row.requestIdentities) &&
      row.requestIdentities.every(identity => identities.has(identity)),
    `${fixtureCase.caseId} ${kind} invocation request identity invalid`);
  }
}
