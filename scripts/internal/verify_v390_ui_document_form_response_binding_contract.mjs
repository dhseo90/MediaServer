#!/usr/bin/env node
// 파일 용도: canonical 11개 document-form의 initiating Request/response identity와 redirect ledger 분리를 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  bindDocumentFormSubmission,
  bindPlaywrightResponseToInitiatingRequest,
  createAdapterActionRequestEnvelopeWrapper,
  createCaseOwnedRequestIdentityRegistry,
} from "./v390_ui_native_adapter.mjs";
import {
  buildDocumentFormResponseBindingCensus,
} from "./v390_ui_request_navigation_lifecycle.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = relative => JSON.parse(fs.readFileSync(path.join(rootDir, relative), "utf8"));
const readText = relative => fs.readFileSync(path.join(rootDir, relative), "utf8");
const manifest = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const storedCensus = readJson("test/fixtures/v390_document_form_response_binding_census.json");
const red = readJson("test/fixtures/v390_document_form_response_binding_red_20260810.json");
const adapterSource = readText("scripts/internal/v390_ui_native_adapter.mjs");
const checks = [];
const check = async (name, fn) => { await fn(); checks.push(name); };
const reject = async (fn, pattern) => {
  let error = null;
  try { await fn(); } catch (caught) { error = caught; }
  assert(error instanceof Error && pattern.test(error.message),
    `expected rejection ${pattern}: ${error?.message || "none"}`);
};

await check("latest actual UI-002 RED is commit and artifact SHA-bound", async () => {
  assert(red.sourceBranch === "v3.9.0" &&
    red.sourceCommitSha === "81d3ec3ddf6cf6055379c5bbb74fbff81395f876" &&
    red.sourceWorktreeClean === true,
  "document form RED source binding drift");
  assert(JSON.stringify(red.coverage) === JSON.stringify({
    target: 424, attempted: 2, pass: 1, fail: 1, notRun: 422, unsupported: 0,
  }), "document form RED coverage drift");
  assert(red.firstFailure.caseId === "UI-002" &&
    red.firstFailure.reason === "action response cardinality mismatch: 0/1" &&
    red.firstFailure.declaredPrimaryCardinality === "1/1" &&
    red.firstFailure.observedPrimaryCardinality === "1/0",
  "document form RED failure shape drift");
  for (const artifact of Object.values(red.artifacts)) {
    assert(/^[0-9a-f]{64}$/.test(artifact.sha256), "document form RED digest invalid");
    const absolute = path.join(rootDir, artifact.path);
    if (fs.existsSync(absolute)) {
      const digest = crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
      assert(digest === artifact.sha256, `document form RED artifact drift: ${artifact.path}`);
    }
  }
});

await check("canonical 11-case response-binding census is exact", async () => {
  const actual = buildDocumentFormResponseBindingCensus(manifest);
  assert(JSON.stringify(actual) === JSON.stringify(storedCensus),
    "stored document form response-binding census drift");
  assert(actual.caseCount === 11 && actual.redirectingCaseCount === 9 &&
    actual.sameRouteCaseCount === 2,
  "document form census cardinality drift");
  assert(actual.rows.every(row => row.method === "POST" &&
    row.declaredPrimaryCardinality === "1/1" &&
    row.primaryResponseOwnership ===
      "action-envelope:response.request-object-identity" &&
    (row.redirectHops === 0
      ? row.redirectDestinationOwnership === "not-applicable"
      : row.redirectDestinationOwnership === "document-navigation-chain:page-owned")),
  "document form census ownership/cardinality drift");
});

await check("every document-form branch executes the actual-like late response ordering", async () => {
  for (const row of storedCensus.rows) {
    const context = {
      caseId: row.caseId,
      phase: "primary-action",
      actionId: `${row.caseId}:submit-form`,
      correlationId: `${row.caseId}:submit-form:completion`,
    };
    const wrapper = createAdapterActionRequestEnvelopeWrapper({
      requestActionOwnershipRegistry: { validate: () => context },
      context,
      requestEnvelope: {
        method: row.method,
        urlPath: row.path,
        allowedStatuses: [row.status],
        initiatorActionId: context.actionId,
        correlationId: context.correlationId,
        requestOwnershipKind: "primary-action",
      },
      caseId: row.caseId,
      requestKind: "document-navigation",
    });
    const identityRegistry = createCaseOwnedRequestIdentityRegistry({ caseId: row.caseId });
    const initiatingRequest = {};
    const identity = identityRegistry.registerPlaywrightRequest(initiatingRequest);
    wrapper.claimInRequestEvent(initiatingRequest, {
      method: row.method,
      target: row.path,
      requestKind: "document-navigation",
      registrationKind: "manifest-envelope-sequence",
    });
    wrapper.bindRequestIdentity(initiatingRequest, identity);
    const responseBindings = new WeakMap([[initiatingRequest, {
      ...identity,
      actionRequestLedgerWrapper: wrapper,
    }]]);
    const barrierPromise = wrapper.waitForExpectedResponse(1000);
    assert(wrapper.responseBarrier.evidence().settlement === "pending",
      `${row.caseId} navigation completion incorrectly finalized the response barrier`);
    const response = { request: () => initiatingRequest };
    const bound = bindPlaywrightResponseToInitiatingRequest(
      response,
      responseBindings,
      identityRegistry,
    );
    assert(bound.request === initiatingRequest && bound.initiatingRequest,
      `${row.caseId} late response lost exact initiating Request identity`);
    wrapper.bindResponseRequestObject(bound.request, {
      method: row.method,
      target: row.path,
      status: row.status,
      ...identity,
      responseRequestObjectObserved: true,
    });
    const barrier = await barrierPromise;
    assert(barrier.settlement === "resolved" && barrier.responseCount === 1,
      `${row.caseId} exact response barrier did not resolve 1/1`);

    const primaryRequest = requestEntry(row, identity, context);
    const primaryResponse = responseEntry(row, identity, context);
    const entries = [primaryRequest, primaryResponse];
    if (row.redirectHops === 1) {
      const destinationRequestHandle = {};
      const destinationIdentity = identityRegistry
        .registerPlaywrightRequest(destinationRequestHandle);
      entries.push(
        redirectRequestEntry(row, destinationIdentity, identity),
        redirectResponseEntry(row, destinationIdentity, identity),
      );
      assert(wrapper.ledger.resolve(destinationRequestHandle) === null,
        `${row.caseId} redirect destination GET entered the primary envelope`);
    }
    const binding = bindDocumentFormSubmission(entries, {
      method: row.method,
      path: row.path,
      allowedStatuses: [row.status],
      expectedRedirectPath: row.location || null,
    });
    assert(binding.requestId === identity.requestId &&
      binding.responseCandidateCount === 1 && binding.requestAttemptCount === 1 &&
      binding.redirectCount === row.redirectHops,
    `${row.caseId} actual-like document binding drift`);
    const ledger = wrapper.ledger.close();
    wrapper.closed = true;
    assert(ledger.requestCount === 1 && ledger.responseCount === 1 &&
      wrapper.responseBarrier.evidence().pass === true,
    `${row.caseId} envelope/barrier cleanup drift`);
  }
});

await check("missing duplicate reordered wrong-object status path Location destination and late responses fail closed", async () => {
  const make = () => {
    const context = { caseId: "FORM-RED", phase: "primary-action",
      actionId: "FORM-RED:submit", correlationId: "FORM-RED:completion" };
    const wrapper = createAdapterActionRequestEnvelopeWrapper({
      requestActionOwnershipRegistry: { validate: () => context }, context,
      requestEnvelope: { method: "POST", urlPath: "/setup", allowedStatuses: [302],
        initiatorActionId: context.actionId, correlationId: context.correlationId,
        requestOwnershipKind: "primary-action" },
      caseId: context.caseId, requestKind: "document-navigation",
    });
    return { context, wrapper };
  };
  await reject(async () => make().wrapper.ledger.close(), /request cardinality/i);
  const missing = make().wrapper;
  await reject(async () => missing.waitForExpectedResponse(10),
    /object-bound action response barrier timeout/i);
  const missingEvidence = missing.responseBarrier.evidence();
  assert(missingEvidence.settlement === "failed" &&
    missingEvidence.activeWaiterCount === 0 &&
    missingEvidence.activeTimerCount === 0,
  "missing response barrier cleanup left a pending waiter or timer");
  const reordered = make().wrapper;
  await reject(async () => reordered.bindResponseRequestObject({}, {
    method: "POST", target: "/setup", status: 302,
    responseRequestObjectObserved: true,
  }), /initiating request object claim/i);
  const wrong = make().wrapper;
  const request = {};
  wrong.claimInRequestEvent(request, { method: "POST", target: "/setup",
    requestKind: "document-navigation" });
  wrong.bindRequestIdentity(request, { requestId: "r1", caseRequestIdentity: "c1",
    caseRequestSequence: 1 });
  await reject(async () => wrong.bindResponseRequestObject({}, {
    method: "POST", target: "/setup", status: 302,
    responseRequestObjectObserved: true,
  }), /initiating request object claim/i);
  await reject(async () => wrong.bindResponseRequestObject(request, {
    method: "POST", target: "/setup", status: 200,
    responseRequestObjectObserved: true,
  }), /status mismatch/i);
  await reject(async () => wrong.bindResponseRequestObject(request, {
    method: "POST", target: "/wrong", status: 302,
    responseRequestObjectObserved: true,
  }), /method\/path mismatch/i);

  const row = storedCensus.rows[0];
  const identity = { requestId: "r1", caseRequestIdentity: "UI-002:r1", caseRequestSequence: 1 };
  const context = { actionId: "UI-002:submit-form" };
  const valid = [requestEntry(row, identity, context), responseEntry(row, identity, context),
    redirectRequestEntry(row, { requestId: "r2", caseRequestIdentity: "UI-002:r2",
      caseRequestSequence: 2 }, identity),
    redirectResponseEntry(row, { requestId: "r2", caseRequestIdentity: "UI-002:r2",
      caseRequestSequence: 2 }, identity)];
  await reject(async () => bindDocumentFormSubmission(valid.map(entry =>
    entry.phase === "response" && entry.requestId === "r1"
      ? { ...entry, responseLocationPath: "/wrong" } : entry),
  { method: "POST", path: "/setup", allowedStatuses: [302],
    expectedRedirectPath: "/login" }), /response trust binding/i);
  await reject(async () => bindDocumentFormSubmission(valid.map(entry =>
    entry.phase === "request-start" && entry.requestId === "r2"
      ? { ...entry, sourceOwner: "explicit-action-registration" } : entry),
  { method: "POST", path: "/setup", allowedStatuses: [302],
    expectedRedirectPath: "/login" }), /redirect request trust binding/i);

  const complete = make().wrapper;
  const exact = {};
  complete.claimInRequestEvent(exact, { method: "POST", target: "/setup",
    requestKind: "document-navigation" });
  complete.bindRequestIdentity(exact, { requestId: "r1", caseRequestIdentity: "c1",
    caseRequestSequence: 1 });
  complete.bindResponseRequestObject(exact, { method: "POST", target: "/setup", status: 302,
    requestId: "r1", caseRequestIdentity: "c1", caseRequestSequence: 1,
    responseRequestObjectObserved: true });
  complete.ledger.close();
  complete.closed = true;
  let lateError = null;
  try {
    complete.bindResponseRequestObject(exact, {
      method: "POST", target: "/setup", status: 302,
      responseRequestObjectObserved: true,
    });
  } catch (caught) {
    lateError = caught;
    complete.abort(caught);
  }
  assert(lateError instanceof Error && /late action response/i.test(lateError.message),
    "late response did not fail after envelope finalization");
  assert(complete.responseBarrier.evidence().settlement === "failed" &&
    complete.responseBarrier.evidence().pass === false,
  "late response did not invalidate the already resolved barrier");
});

await check("adapter installs before submit, claims in request, and has no case exception or sleep workaround", async () => {
  const submit = adapterSource.slice(adapterSource.indexOf("submitDocumentForm:"),
    adapterSource.indexOf("fill: async", adapterSource.indexOf("submitDocumentForm:")));
  const requestListener = adapterSource.slice(adapterSource.indexOf('page.on("request"'),
    adapterSource.indexOf('page.on("response"'));
  assert(submit.indexOf("documentEnvelopeWrappers") < submit.indexOf(".click()") &&
    submit.indexOf("waitForExpectedResponse") > submit.indexOf(".click()") &&
    submit.indexOf("captureNavigationOwnerLifecycle") >
      submit.indexOf("waitForExpectedResponse"),
  "document response barrier ordering drift");
  assert(requestListener.includes("claimInRequestEvent(request") &&
    !adapterSource.slice(adapterSource.indexOf('context.route("**/*"'),
      adapterSource.indexOf("context.addInitScript")).includes(".ledger.claim("),
  "initiating request is not claimed exclusively in the request event");
  assert(adapterSource.includes("responseRequestBindings = new WeakMap()") &&
    adapterSource.includes("bindResponseRequestObject(request") &&
    !adapterSource.includes("UI-002") &&
    !submit.includes("waitForTimeout") && !submit.includes("setTimeout"),
  "document form implementation contains case/path timing workaround");
});

console.log("== v3.9.0 UI document-form response binding contract ==");
for (const name of checks) console.log(`PASS ${name}`);
console.log(`PASS checks=${checks.length} documentForms=${storedCensus.caseCount}`);

function requestEntry(row, identity, context) {
  return {
    phase: "request-start", ...identity, requestKind: "document-navigation",
    resourceType: "document", sameOrigin: true, ledgerOwner: "action",
    sourceOwner: "explicit-action-registration", ownerPhase: "primary-action",
    initiatorActionId: context.actionId, requestOwnershipKind: "primary-action",
    redirectedFromRequestId: "", correlationId: "", method: row.method,
    status: 0, url: `http://127.0.0.1${row.path}`,
  };
}

function responseEntry(row, identity, context) {
  return {
    ...requestEntry(row, identity, context), phase: "response",
    responseRequestObjectObserved: true,
    requestIdentitySource: "playwright-response-request", status: row.status,
    responseLocationPath: row.location,
  };
}

function redirectRequestEntry(row, identity, initiatingIdentity) {
  return {
    phase: "request-start", ...identity, requestKind: "document-navigation",
    resourceType: "document", sameOrigin: true, ledgerOwner: "page",
    sourceOwner: "document-navigation-ledger", ownerPhase: "document-navigation-chain",
    initiatorActionId: "", requestOwnershipKind: "document-navigation-chain",
    redirectedFromRequestId: initiatingIdentity.requestId, correlationId: "",
    method: "GET", status: 0, url: `http://127.0.0.1${row.location}`,
  };
}

function redirectResponseEntry(row, identity, initiatingIdentity) {
  return {
    ...redirectRequestEntry(row, identity, initiatingIdentity), phase: "response",
    responseRequestObjectObserved: true,
    requestIdentitySource: "playwright-response-request", status: 200,
    responseLocationPath: "",
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
