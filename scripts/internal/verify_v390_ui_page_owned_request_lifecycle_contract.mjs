#!/usr/bin/env node
// 파일 용도: canonical page-owned request lifecycle tuple의 exact-one 분류를 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertCanonicalRequestLifecycleTuple,
  buildCanonicalRequestLifecycleTupleCensus,
  classifyRequestLifecycleOwnership,
  validateRequestLifecycleLedger,
} from "./v390_ui_action_request_ledger.mjs";
import { bindActionOwnedRequestLedger, buildInitialRouteSettlingCensus,
  buildInitialRouteSettlingPlan }
  from "./v390_ui_initial_route_settling.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = relative => JSON.parse(fs.readFileSync(path.join(rootDir, relative), "utf8"));
const manifest = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const forms = readJson("test/fixtures/v390_document_form_response_binding_census.json");
const red = readJson("test/fixtures/v390_page_owned_request_lifecycle_red_20260810.json");
const runnerStartRed = readJson(
  "test/fixtures/v390_bootstrap_action_redirect_lifecycle_red_20260810.json");
const checks = [];
const check = (name, fn) => { fn(); checks.push(name); };
const reject = (fn, pattern) => {
  let error;
  try { fn(); } catch (caught) { error = caught; }
  assert(error instanceof Error && pattern.test(error.message),
    `expected rejection ${pattern}: ${error?.message || "none"}`);
};
const tuple = value => [value.ledgerOwner, value.sourceOwner,
  value.ownerPhase, value.requestOwnershipKind];

check("latest runner-start RED is bound before canonical case execution", () => {
  assert(runnerStartRed.sourceCommitSha ===
      "6c5c2f613567faf82edd574de7ec3b312aff65df" &&
    runnerStartRed.sourceWorktreeClean === true &&
    JSON.stringify(runnerStartRed.coverage) === JSON.stringify({
      target: 424, attempted: 0, pass: 0, fail: 0, notRun: 424, unsupported: 0,
    }) && runnerStartRed.runnerStartFailure.canonicalFirstCaseId === "UI-001" &&
    runnerStartRed.runnerStartFailure.source ===
      "scripts/internal/v390_ui_action_request_ledger.mjs:367" &&
    runnerStartRed.runnerStartFailure.error ===
      "bootstrap/redirect lifecycle mixing is forbidden" &&
    runnerStartRed.runnerStartFailure.request.initialSettlingComplete === false &&
    runnerStartRed.runnerStartFailure.request.actionInvocationPresent === false &&
    runnerStartRed.runnerStartFailure.request.navigationKind ===
      "initial-document-navigation",
  "latest runner-start RED shape drift");
});

check("latest actual UI-002 RED is SHA-bound", () => {
  assert(red.sourceCommitSha === "dfda3a6431b30f99971cd19c1cab22a231c109da" &&
    JSON.stringify(red.coverage) === JSON.stringify({
      target: 424, attempted: 2, pass: 1, fail: 1, notRun: 422, unsupported: 0,
    }) && red.firstFailure.reason === "page-owned request source/phase mismatch" &&
    red.firstFailure.primaryCardinality === "1/1" &&
    red.firstFailure.actionCorrelationLeakCount === 0,
  "page lifecycle RED shape drift");
  for (const artifact of Object.values(red.artifacts)) {
    const absolute = path.join(rootDir, artifact.path);
    assert(/^[0-9a-f]{64}$/.test(artifact.sha256), "RED digest invalid");
    if (fs.existsSync(absolute)) {
      assert(crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex") ===
        artifact.sha256, `RED artifact hash drift: ${artifact.path}`);
    }
  }
});

check("canonical 424/391/11 lifecycle census is exhaustive", () => {
  const census = buildCanonicalRequestLifecycleTupleCensus(manifest, forms);
  const initial = buildInitialRouteSettlingCensus(manifest);
  assert(JSON.stringify({
    cases: census.canonicalCaseCount,
    request: census.requestCompletionCount,
    forms: census.documentFormCount,
    redirects: census.documentFormRedirectCount,
    sameRoute: census.documentFormSameRouteRejectionCount,
    readback: census.independentReadbackCount,
    bootstrap: census.bootstrapDocumentCount,
  }) === JSON.stringify({
    cases: 424, request: 391, forms: 11, redirects: 9,
    sameRoute: 2, readback: 421, bootstrap: 424,
  }) && census.primaryResponseCardinality === "391/391" &&
    census.redirectDestinationPrimaryCardinalityContribution === 0 &&
    census.invalidClassificationCount === 0 &&
    initial.canonicalCaseCount === 424 &&
    initial.expectedDocumentHopCount === 425 &&
    initial.routeClassifications["initial-http-redirect"] === 1 &&
    initial.routeClassifications["requested-equals-settled"] === 423 &&
    JSON.stringify(initial.redirectedCaseIds) === JSON.stringify(["UI-001"]),
  "canonical lifecycle census drift");
});

check("request facts select exactly one authoritative tuple", () => {
  const actionInvocation = Object.freeze({ phase: "primary-action", actionId: "CASE:submit" });
  const initialInvocation = Object.freeze({
    kind: "initial-document-navigation", invocationId: "CASE:initial-document-navigation",
  });
  const actionNavigationInvocation = Object.freeze({
    kind: "form-submit-document-navigation",
    invocationId: "CASE:form-submit-document-navigation",
    actionId: "CASE:submit",
  });
  const redirectedFromRequest = Object.freeze({});
  const matrix = [
    ["bootstrap-document", { requestKind: "document-navigation", resourceType: "document",
      initialSettlingComplete: false, phase: "initial-document-navigation",
      navigationInvocation: initialInvocation },
    ["page", "page", "bootstrap", "initial-page-load"]],
    ["bootstrap-fetch", { requestKind: "application-fetch", resourceType: "fetch",
      initialSettlingComplete: false, phase: "bootstrap-settling" },
    ["page", "page", "bootstrap", "bootstrap"]],
    ["background-fetch", { requestKind: "application-fetch", resourceType: "fetch",
      initialSettlingComplete: true, phase: "post-action-observation" },
    ["page", "page", "background-refresh", "background-refresh"]],
    ["page-subresource", { requestKind: "subresource", resourceType: "script",
      initialSettlingComplete: true, phase: "post-action-observation" },
    ["page", "page", "page-subresource", "page-subresource"]],
    ["sse", { requestKind: "subresource", resourceType: "eventsource",
      initialSettlingComplete: true, phase: "post-action-observation" },
    ["page", "page", "sse", "sse"]],
    ["websocket", { requestKind: "subresource", resourceType: "websocket",
      initialSettlingComplete: true, phase: "post-action-observation" },
    ["page", "page", "websocket", "websocket"]],
    ["primary-action", { requestKind: "document-navigation", resourceType: "document",
      initialSettlingComplete: true, actionInvocation, phase: "primary-action",
      navigationInvocation: actionNavigationInvocation },
    ["action", "explicit-action-registration", "primary-action", "primary-action"]],
    ["document-redirect-chain", { requestKind: "document-navigation", resourceType: "document",
      initialSettlingComplete: true, redirectedFromRequest,
      redirectedFromLifecycle: {
        requestObject: redirectedFromRequest, lifecycleClass: "primary-action",
        requestKind: "document-navigation", resourceType: "document",
        initiatorActionId: "CASE:submit",
      },
      navigationInvocation: actionNavigationInvocation,
      phase: "form-submit-document-navigation" },
    ["page", "document-navigation-ledger", "document-navigation-chain",
      "document-navigation-chain"]],
    ["independent-readback", { requestKind: "application-fetch", resourceType: "fetch",
      initialSettlingComplete: true, phase: "independent-readback" },
    ["page", "page", "independent-readback", "independent-readback"]],
  ];
  for (const [lifecycleClass, input, expected] of matrix) {
    const result = classifyRequestLifecycleOwnership(input);
    assert(result.lifecycleClass === lifecycleClass &&
      JSON.stringify(tuple(result)) === JSON.stringify(expected),
    `tuple mismatch: ${lifecycleClass}`);
    assertCanonicalRequestLifecycleTuple(result, { lifecycleClass });
  }
});

check("UI-001 bootstrap redirect is an actual-like initial page-load chain", () => {
  const invocation = Object.freeze({
    kind: "initial-document-navigation",
    invocationId: "UI-001:initial-document-navigation",
  });
  const requestedObject = {};
  const requested = classifyRequestLifecycleOwnership({
    requestKind: "document-navigation", resourceType: "document",
    initialSettlingComplete: false, actionInvocation: null,
    navigationInvocation: invocation, phase: invocation.kind,
  });
  const destinationObject = {};
  const destination = classifyRequestLifecycleOwnership({
    requestKind: "document-navigation", resourceType: "document",
    initialSettlingComplete: false, actionInvocation: null,
    redirectedFromRequest: requestedObject,
    redirectedFromLifecycle: {
      requestObject: requestedObject, lifecycleClass: "bootstrap-document",
      requestKind: "document-navigation", resourceType: "document",
      navigationInvocationId: invocation.invocationId,
    },
    navigationInvocation: invocation, phase: invocation.kind,
  });
  const entries = [
    entry(requested, "request-start", requestedObject, 1),
    entry(requested, "response", requestedObject, 1, {
      status: 302,
    }),
    entry(destination, "request-start", destinationObject, 2, {
      redirectedFromRequest: requestedObject,
    }),
    entry(destination, "response", destinationObject, 2, {
      redirectedFromRequest: requestedObject, status: 200,
    }),
  ];
  const evidence = validateRequestLifecycleLedger(entries, {});
  assert(entries.every(current => current.lifecycleClass === "bootstrap-document" &&
      current.initiatorActionId === "" &&
      current.navigationInvocationId === invocation.invocationId) &&
    evidence.bootstrapInitialDocumentRequestCount === 2 &&
    evidence.bootstrapRedirectDestinationRequestCount === 1 &&
    evidence.redirectDestinationRequestCount === 0 &&
    evidence.primaryRequestCount === 0,
  "UI-001 bootstrap redirect/action ledger separation drift");
});

check("9 redirects and 2 same-route rejections keep primary POST 1/1", () => {
  for (const [index, row] of forms.rows.entries()) {
    const primaryObject = {};
    const primary = classifyRequestLifecycleOwnership({
      requestKind: "document-navigation", resourceType: "document",
      initialSettlingComplete: true,
      actionInvocation: { phase: "primary-action", actionId: `${row.caseId}:submit-form` },
      navigationInvocation: {
        kind: "form-submit-document-navigation",
        invocationId: `${row.caseId}:form-submit-document-navigation`,
        actionId: `${row.caseId}:submit-form`,
      },
      phase: "primary-action", sameRouteFormRejection: row.redirectHops === 0,
    });
    const entries = [
      entry(primary, "request-start", primaryObject, index * 10 + 1,
        { actionId: `${row.caseId}:submit-form` }),
      entry(primary, "response", primaryObject, index * 10 + 1,
        { actionId: `${row.caseId}:submit-form`, status: row.status }),
    ];
    if (row.redirectHops === 1) {
      const redirectObject = {};
      const redirect = classifyRequestLifecycleOwnership({
        requestKind: "document-navigation", resourceType: "document",
        initialSettlingComplete: true, redirectedFromRequest: primaryObject,
        redirectedFromLifecycle: {
          requestObject: primaryObject, lifecycleClass: primary.lifecycleClass,
          requestKind: "document-navigation", resourceType: "document",
          initiatorActionId: `${row.caseId}:submit-form`,
        },
        navigationInvocation: {
          kind: "form-submit-document-navigation",
          invocationId: `${row.caseId}:form-submit-document-navigation`,
          actionId: `${row.caseId}:submit-form`,
        },
        phase: "form-submit-document-navigation",
      });
      entries.push(entry(redirect, "request-start", redirectObject, index * 10 + 2,
        { redirectedFromRequest: primaryObject }),
      entry(redirect, "response", redirectObject, index * 10 + 2,
        { redirectedFromRequest: primaryObject, status: 200 }));
    }
    const evidence = validateRequestLifecycleLedger(entries, {
      primaryActionId: `${row.caseId}:submit-form`,
      expectedPrimaryRequestCount: 1, expectedPrimaryResponseCount: 1,
    });
    assert(evidence.primaryRequestCount === 1 && evidence.primaryResponseCount === 1 &&
      evidence.redirectDestinationRequestCount === row.redirectHops &&
      evidence.redirectDestinationPrimaryCardinalityContribution === 0 &&
      evidence.actionCorrelationLeakCount === 0,
    `${row.caseId} lifecycle cardinality drift`);
  }
});

check("wrong tuple object action mixing duplicate and leak fail closed", () => {
  reject(() => classifyRequestLifecycleOwnership({ requestKind: "document-navigation",
    resourceType: "document", initialSettlingComplete: true,
    phase: "form-submit-document-navigation" }), /redirect/i);
  reject(() => classifyRequestLifecycleOwnership({ requestKind: "application-fetch",
    resourceType: "fetch", initialSettlingComplete: true,
    redirectedFromRequest: {}, phase: "form-submit-document-navigation" }), /document/i);
  reject(() => classifyRequestLifecycleOwnership({ requestKind: "document-navigation",
    resourceType: "document", initialSettlingComplete: false,
    redirectedFromRequest: {}, phase: "initial-document-navigation" }), /invocation/i);
  reject(() => classifyRequestLifecycleOwnership({ requestKind: "document-navigation",
    resourceType: "document", initialSettlingComplete: true,
    redirectedFromRequest: {}, redirectedFromLifecycle: {
      requestObject: {}, lifecycleClass: "bootstrap-document",
      requestKind: "document-navigation", resourceType: "document",
      navigationInvocationId: "wrong",
    }, navigationInvocation: {
      kind: "form-submit-document-navigation", invocationId: "FORM:nav",
      actionId: "FORM:action",
    }, phase: "form-submit-document-navigation" }), /object|parent|chain|invocation/i);
  const request = {};
  const binding = classifyRequestLifecycleOwnership({ requestKind: "application-fetch",
    resourceType: "fetch", initialSettlingComplete: true,
    phase: "post-action-observation" });
  const start = entry(binding, "request-start", request, 1);
  reject(() => validateRequestLifecycleLedger([start, start], {}), /duplicate/i);
  reject(() => validateRequestLifecycleLedger([{ ...start, sourceOwner: "wrong" }], {}), /tuple/i);
  reject(() => validateRequestLifecycleLedger([{ ...start,
    initiatorActionId: "PRIMARY:action" }], { primaryActionId: "PRIMARY:action" }), /leak/i);
  reject(() => validateRequestLifecycleLedger([start,
    { ...entry(binding, "response", {}, 1), requestId: start.requestId }], {}), /object/i);
  reject(() => validateRequestLifecycleLedger([start,
    { ...entry(binding, "response", request, 1),
      actionInvocationId: "STALE:action" }], {}), /lifecycle identity/i);
});

check("latest actual trace passes the common ledger binding", () => {
  const tracePath = path.join(rootDir, red.artifacts.trace.path);
  if (!fs.existsSync(tracePath)) return;
  const trace = JSON.parse(fs.readFileSync(tracePath, "utf8"));
  const plan = buildInitialRouteSettlingPlan(
    manifest.cases.find(candidate => candidate.caseId === "UI-002"));
  const raw = trace.rawPrimaryObservations.find(observation =>
    observation?.action?.actionId === plan.primaryRequest.actionId);
  const sourceOwner = trace.navigationOwnerLifecycleEvidence.sourceOwner;
  const evidence = bindActionOwnedRequestLedger(plan, {
    schema: "media-server.v390-ui-action-ledger-start.v1",
    caseId: plan.caseId, actionId: plan.primaryRequest.actionId,
    correlationId: plan.primaryRequest.correlationId,
    sourceRoute: plan.actionSource.route, navigationEpoch: sourceOwner.navigationEpoch,
    caseRequestSequenceFloor: 3, sourceBeforeOwner: sourceOwner, sourceControl: sourceOwner,
  }, raw.networkEntries);
  assert(evidence.requestCount === 1 && evidence.responseCount === 1 &&
    evidence.actionCorrelationLeakCount === 0, "latest actual ledger did not turn GREEN");
});

check("implementation has no case or path allowlist", () => {
  const source = fs.readFileSync(path.join(rootDir,
    "scripts/internal/v390_ui_action_request_ledger.mjs"), "utf8");
  for (const forbidden of ["UI-002", "AUTH-007", "AUTH-035", "pathAllowlist", "caseAllowlist"]) {
    assert(!source.includes(forbidden), `forbidden exception marker: ${forbidden}`);
  }
});

console.log("== v3.9.0 page-owned request lifecycle tuple contract ==");
for (const name of checks) console.log(`PASS ${name}`);
console.log(`PASS checks=${checks.length}`);

function entry(binding, phase, requestObject, sequence, {
  actionId = "", redirectedFromRequest = null, status = 0,
} = {}) {
  return { ...binding, phase, requestObject, redirectedFromRequest,
    requestId: `request-${sequence}`, caseRequestIdentity: `case-request-${sequence}`,
    caseRequestSequence: sequence, responseRequestObjectObserved: phase === "response",
    responseRequestObject: phase === "response" ? requestObject : null,
    requestIdentitySource: phase === "response" ? "playwright-response-request" : "",
    initiatorActionId: actionId, correlationId: "", status };
}

function assert(condition, message) { if (!condition) throw new Error(message); }
