#!/usr/bin/env node
// 파일 용도: native Playwright adapter의 모듈 탐색, capability, fallback 거부, 실제 evidence 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import * as nativeAdapterModule from "./v390_ui_native_adapter.mjs";
import {
  bindDocumentFormSubmission,
  bindBrowserConsoleResponseMessages,
  bindFixtureResponseToInitiatingRequest,
  bindPlaywrightResponseToInitiatingRequest,
  buildDiagnosticMarkerResponseStageEvidence,
  buildLiveSessionEvidence,
  captureClientLiveSessionResponseProjection,
  captureDiagnosticMarkerResponseProjection,
  captureEndpointOwnedResponseProjection,
  captureOpsIncidentTimelineResponseProjection,
  collectUniqueFocusSamples,
  createCaseOwnedRequestIdentityRegistry,
  formatSafeResponseReadFailure,
  nativeCapabilities,
  isResolvedPlaywrightTimeoutError,
  revealClosedDetailsForSelector,
  resolveRequestCorrelationPrecedence,
  resolvePlaywrightModule,
  secretStrippedBrowserEnv,
  visualEvidenceScrollDelta,
} from "./v390_ui_native_adapter.mjs";
import {
  bindRuntimeControlObservationOwner,
  buildCanonicalSharedAdapterImpact,
  buildPostActionLifecyclePlan,
  evaluatePostActionLifecycle,
  observePostActionLifecycle,
  postActionDestinationLifecycleRequired,
  resolvePostActionVisualTarget,
} from "./v390_ui_shared_adapter_lifecycle.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 native UI adapter contract verification

Usage:
  ./server.sh verify-v390-ui-native-adapter-contract

Checks module discovery, missing-module hard failure, native action capabilities,
runner integration, dispatch/docs, and preserved standalone native evidence.
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const adapterSource = readText("scripts/internal/v390_ui_native_adapter.mjs");
const browserCallbackSource = readText("scripts/internal/v390_ui_browser_callback_boundary.mjs");
const adapterBrowserSource = `${adapterSource}\n${browserCallbackSource}`;
const runnerSource = readText("scripts/internal/verify_v390_ui_automation.mjs");
const exactRunnerSource = readText("scripts/internal/run_v390_ui_native_exact_cases.mjs");
const caseRuntimeSource = readText("scripts/internal/v390_ui_case_runtime.mjs");
const authProductSource = readText("src/ingress/http_auth.cpp");
const registryProductSource = readText("src/ingress/source_view_registry.cpp");
const onvifProductSource = readText("src/ingress/onvif_live_import.cpp");
const serverSh = readText("server.sh");
const docs = [
  readText("docs/development-backlog.md"),
  readText("docs/stream-verification.md"),
  readText("docs/project-feature-test-inventory.md"),
  readText("docs/release-test-records.md"),
  readText("docs/release-evidence-index.md"),
].join("\n");
const checks = [];

check("native callbacks use the capture-only recorder as lifecycle authority", () => {
  const requestCallback = callbackSource("request", "response");
  const responseCallback = callbackSource("response", "requestfinished");
  const finishedCallback = callbackSource("requestfinished", "requestfailed");
  const failedCallback = callbackSource("requestfailed", null);
  assert(countToken(requestCallback, "requestLifecycleRecorder.recordRequest(") === 1,
    "request callback must record the exact Request once");
  assert(countToken(responseCallback, "requestLifecycleRecorder.recordResponse(") === 1,
    "response callback must record response.request() identity once");
  assert(countToken(finishedCallback,
    "requestLifecycleRecorder.recordRequestFinished(") === 1,
  "requestfinished callback must record the terminal Request once");
  assert(countToken(failedCallback, "requestLifecycleRecorder.recordRequestFailed(") === 1,
    "requestfailed callback must record the failed terminal Request once");
  for (const [name, source] of [["request", requestCallback], ["response", responseCallback],
    ["requestfinished", finishedCallback], ["requestfailed", failedCallback]]) {
    assert(!source.includes("classifyRequestLifecycleOwnership(") &&
      !source.includes("assert(") && !source.includes("throw new Error("),
    `${name} callback still owns lifecycle classification/assertion`);
  }
  const capturePreamble = requestCallback.slice(0,
    requestCallback.indexOf("requestLifecycleRecorder.recordRequest("));
  assert(capturePreamble.includes("resolveNativeLifecycleActionCapture({") &&
    capturePreamble.includes("directActionRequestOwnership: actionRequestOwnership") &&
    !capturePreamble.includes("action: activeActionLifecycleInvocation"),
  "capture-time action claim is not exact-owner/redirect-bound");
  const routeCallback = adapterSource.slice(adapterSource.indexOf('context.route("**/*"'),
    adapterSource.indexOf("context.addInitScript"));
  assert(routeCallback.includes("actionLifecycleInvocationByContext.get(claimedContext)") &&
    routeCallback.includes("bindExactActionRequestMembership(request") &&
    !routeCallback.includes("bindExactActionRequestMembership(request,\n          activeActionLifecycleInvocation"),
    "route callback does not exact-bind the same Request object after ownership confirmation");
});

check("request-first and route-first exact action binding fail closed without global fallback", () => {
  const createLedger = nativeAdapterModule.createNativeRequestLifecycleLedger;
  const exercise = ({ caseId, routeFirst }) => {
    const ledger = createLedger({ caseId });
    assert(typeof ledger.registerCapturedRequest === "function" &&
      typeof ledger.bindExactActionRequestMembership === "function",
    "explicit captured/exact action binding API is missing");
    const action = ledger.beginInvocation("action", {
      invocationId: `${caseId}:action`, phase: "primary-action",
    });
    const request = fakeLifecycleRequest("http://runtime.invalid/ops/api/sources", {
      method: "POST",
    });
    if (routeFirst) ledger.bindExactActionRequestMembership(request, action);
    const envelope = ledger.requestLifecycleRecorder.recordRequest(request,
      ledger.captureContext({ action, correlationDigest: `${caseId}-digest` }));
    ledger.registerCapturedRequest(envelope, { actionClaim: action });
    if (!routeFirst) ledger.bindExactActionRequestMembership(request, action);
    ledger.requestLifecycleRecorder.recordResponse(fakeLifecycleResponse(request, 201));
    ledger.endInvocation(action);
    ledger.sealRequestLifecycleLedger();
    const result = ledger.evaluateRequestLifecycleLedger();
    assert(result.status === "PASS" && result.classifications.length === 1,
      `${caseId} exact action binding failed for ${routeFirst ? "route-first" : "request-first"}`);
    return { ledger, result, request };
  };
  exercise({ caseId: "ORDER-REQUEST-FIRST", routeFirst: false });
  exercise({ caseId: "ORDER-ROUTE-FIRST", routeFirst: true });

  const background = createLedger({ caseId: "ORDER-BACKGROUND" });
  const backgroundAction = background.beginInvocation("action", {
    invocationId: "ORDER-BACKGROUND:action", phase: "primary-action",
  });
  const backgroundRequest = fakeLifecycleRequest("http://runtime.invalid/ops/api/runtime");
  const backgroundEnvelope = background.requestLifecycleRecorder.recordRequest(backgroundRequest,
    background.captureContext({ action: backgroundAction }));
  background.registerCapturedRequest(backgroundEnvelope, { actionClaim: backgroundAction });
  background.requestLifecycleRecorder.recordResponse(fakeLifecycleResponse(backgroundRequest));
  background.endInvocation(backgroundAction);
  background.sealRequestLifecycleLedger();
  const backgroundResult = background.evaluateRequestLifecycleLedger();
  assert(backgroundResult.status === "FAIL" &&
    backgroundResult.failures.some(item => item.code === "INVOCATION_MEMBERSHIP_MISSING"),
  "concurrent background request was false-PASSed through active action fallback");

  const samePath = createLedger({ caseId: "ORDER-SAME-PATH" });
  const samePathRequests = [];
  for (const suffix of ["one", "two"]) {
    const action = samePath.beginInvocation("action", {
      invocationId: `ORDER-SAME-PATH:${suffix}`, phase: "primary-action",
    });
    const request = fakeLifecycleRequest("http://runtime.invalid/ops/api/sources", {
      method: "POST",
    });
    samePathRequests.push(request);
    const envelope = samePath.requestLifecycleRecorder.recordRequest(request,
      samePath.captureContext({ action }));
    samePath.registerCapturedRequest(envelope, { actionClaim: action });
    samePath.bindExactActionRequestMembership(request, action);
    samePath.requestLifecycleRecorder.recordResponse(fakeLifecycleResponse(request, 201));
    samePath.endInvocation(action);
  }
  samePath.sealRequestLifecycleLedger();
  const samePathResult = samePath.evaluateRequestLifecycleLedger();
  assert(samePathRequests[0] !== samePathRequests[1] &&
    samePathResult.status === "PASS" && samePathResult.classifications.length === 2,
  "same-path distinct actions were joined without exact Request identity");
});

check("legacy request evidence preserves every exact tuple without evaluator authority", () => {
  const tuple = nativeAdapterModule.legacyRequestEvidenceTuple;
  assert(typeof tuple === "function", "legacyRequestEvidenceTuple is missing");
  const expected = {
    "bootstrap-document": ["page", "page", "bootstrap", "initial-page-load"],
    "bootstrap-fetch": ["page", "page", "bootstrap", "bootstrap"],
    "background-fetch": ["page", "page", "background-refresh", "background-refresh"],
    "page-subresource": ["page", "page", "page-subresource", "page-subresource"],
    sse: ["page", "page", "sse", "sse"],
    websocket: ["page", "page", "websocket", "websocket"],
    "primary-action": ["action", "explicit-action-registration", "primary-action", "primary-action"],
    "same-route-form-rejection": ["action", "explicit-action-registration", "primary-action", "primary-action"],
    "document-redirect-chain": ["page", "document-navigation-ledger", "document-navigation-chain", "document-navigation-chain"],
    "independent-readback": ["page", "page", "independent-readback", "independent-readback"],
  };
  for (const [lifecycleClass, values] of Object.entries(expected)) {
    const observed = tuple(lifecycleClass, {
      actionInvocationId: "legacy-action", navigationInvocationId: "legacy-navigation",
    });
    assert([observed.ledgerOwner, observed.sourceOwner, observed.ownerPhase,
      observed.requestOwnershipKind].join("|") === values.join("|") &&
      observed.lifecycleClass === lifecycleClass && Object.isFrozen(observed),
    `legacy tuple drift: ${lifecycleClass}`);
  }
  const helperSource = adapterSource.slice(
    adapterSource.indexOf("export function legacyRequestEvidenceTuple"),
    adapterSource.indexOf("async function openNativePlaywrightPage"),
  );
  assert(!helperSource.includes("throw ") && !helperSource.includes("assert(") &&
    !helperSource.includes("evaluateRequestLifecycle") &&
    !helperSource.includes("requestLifecycleRecorder") &&
    !helperSource.includes("invocationRows"),
  "legacy tuple helper crossed into recorder/evaluator authority");
});

check("invocation begin/end events use one independent case-local total order", () => {
  const ledger = nativeAdapterModule.createNativeRequestLifecycleLedger({
    caseId: "EVENT-ORDER",
  });
  const navigation = ledger.beginInvocation("navigation", {
    invocationId: "EVENT-ORDER:navigation", phase: "explicit-navigation",
  });
  const action = ledger.beginInvocation("action", {
    invocationId: "EVENT-ORDER:action", phase: "primary-action",
  });
  ledger.endInvocation(navigation);
  ledger.endInvocation(action);
  const noRequestNavigation = ledger.beginInvocation("navigation", {
    invocationId: "EVENT-ORDER:no-request-navigation", phase: "explicit-navigation",
  });
  ledger.endInvocation(noRequestNavigation);
  const noRequestAction = ledger.beginInvocation("action", {
    invocationId: "EVENT-ORDER:no-request-action", phase: "primary-action",
  });
  ledger.endInvocation(noRequestAction);
  ledger.sealRequestLifecycleLedger();
  const events = ledger.invocationEvents();
  const ordered = [...events.navigationEvents, ...events.actionEvents]
    .sort((left, right) => left.sequence - right.sequence);
  assert(ordered.length === 8 &&
    ordered.map(item => item.sequence).join(",") === "1,2,3,4,5,6,7,8" &&
    ordered.map(item => `${item.kind}:${item.event}`).join(",") ===
      "navigation:begin,action:begin,navigation:end,action:end,navigation:begin,navigation:end,action:begin,action:end" &&
    ordered.every(item => Number.isSafeInteger(item.timestamp) &&
      Object.isFrozen(item) && typeof item.invocationId === "string" && item.phase),
  "cross-kind invocation event order/shape/freeze drift");
});

check("constant clocks still produce strictly monotonic cross-kind invocation timestamps", () => {
  const ledger = nativeAdapterModule.createNativeRequestLifecycleLedger({
    caseId: "EVENT-CONSTANT-CLOCK",
    clock: () => 7000,
  });
  const navigation = ledger.beginInvocation("navigation", {
    invocationId: "EVENT-CONSTANT-CLOCK:navigation", phase: "explicit-navigation",
  });
  const action = ledger.beginInvocation("action", {
    invocationId: "EVENT-CONSTANT-CLOCK:action", phase: "primary-action",
  });
  ledger.endInvocation(navigation);
  ledger.endInvocation(action);
  const nextNavigation = ledger.beginInvocation("navigation", {
    invocationId: "EVENT-CONSTANT-CLOCK:next-navigation", phase: "explicit-navigation",
  });
  ledger.endInvocation(nextNavigation);
  ledger.sealRequestLifecycleLedger();
  const events = ledger.invocationEvents();
  const ordered = [...events.navigationEvents, ...events.actionEvents]
    .sort((left, right) => left.sequence - right.sequence);
  assert(ordered.map(item => item.sequence).join(",") === "1,2,3,4,5,6" &&
    ordered.map(item => item.timestamp).join(",") === "7000,7001,7002,7003,7004,7005" &&
    ordered.every((item, index) => index === 0 ||
      item.timestamp > ordered[index - 1].timestamp) &&
    ordered.every(item => Number.isSafeInteger(item.timestamp) && Object.isFrozen(item) &&
      (item.event === "begin"
        ? item.timestamp === item.startedAtMs
        : item.timestamp === item.endedAtMs)),
  "constant clock did not preserve strict timestamp order/shape/consistency");
  const rows = ledger.invocationRows();
  assert([...rows.navigationInvocations, ...rows.actionInvocations].every(row =>
    Number.isSafeInteger(row.startedAtMs) && Number.isSafeInteger(row.endedAtMs) &&
    row.startedAtMs < row.endedAtMs && Object.isFrozen(row)),
  "invocation rows drifted from strictly monotonic event timestamps");
});

check("request capture timestamps advance the invocation watermark before end", () => {
  const clockReadings = [7000, 9000, 7000];
  const ledger = nativeAdapterModule.createNativeRequestLifecycleLedger({
    caseId: "EVENT-CAPTURE-WATERMARK",
    clock: () => clockReadings.shift(),
  });
  const navigation = ledger.beginInvocation("navigation", {
    invocationId: "EVENT-CAPTURE-WATERMARK:navigation",
    phase: "initial-document-navigation",
  });
  const request = fakeLifecycleRequest("http://runtime.invalid/ops/home", {
    resourceType: "document", navigation: true,
  });
  const envelope = ledger.requestLifecycleRecorder.recordRequest(request,
    ledger.captureContext({ navigation }));
  ledger.registerCapturedRequest(envelope, { navigation });
  ledger.requestLifecycleRecorder.recordResponse(fakeLifecycleResponse(request, 200));
  ledger.endInvocation(navigation);
  ledger.sealRequestLifecycleLedger();
  const result = ledger.evaluateRequestLifecycleLedger();
  const row = ledger.invocationRows().navigationInvocations[0];
  const events = ledger.invocationEvents().navigationEvents;
  assert(result.status === "PASS" && result.failures.length === 0 &&
    envelope.timestamp === 9000 && row.startedAtMs === 7000 && row.endedAtMs === 9001 &&
    row.startedAtMs <= envelope.timestamp && envelope.timestamp <= row.endedAtMs &&
    events.map(item => item.timestamp).join(",") === "7000,9001" &&
    events[0].timestamp < events[1].timestamp &&
    row.requests.length === 1 && row.requests[0] === request,
  `capture watermark did not prevent stale invocation: ${result.failures
    .map(item => item.code).join(",")}`);

  const invalid = nativeAdapterModule.createNativeRequestLifecycleLedger({
    caseId: "EVENT-CLOCK-INVALID", clock: () => 1.5,
  });
  let invalidFailed = false;
  try {
    invalid.beginInvocation("navigation", {
      invocationId: "EVENT-CLOCK-INVALID:navigation", phase: "explicit-navigation",
    });
  } catch (error) {
    invalidFailed = String(error.message).includes("clock is invalid");
  }
  const overflow = nativeAdapterModule.createNativeRequestLifecycleLedger({
    caseId: "EVENT-CLOCK-OVERFLOW", clock: () => Number.MAX_SAFE_INTEGER,
  });
  const overflowNavigation = overflow.beginInvocation("navigation", {
    invocationId: "EVENT-CLOCK-OVERFLOW:navigation", phase: "explicit-navigation",
  });
  overflow.captureContext({ navigation: overflowNavigation });
  let overflowFailed = false;
  try {
    overflow.endInvocation(overflowNavigation);
  } catch (error) {
    overflowFailed = String(error.message).includes("timestamp is invalid");
  }
  assert(invalidFailed && overflowFailed,
    "invalid or overflowing invocation clocks did not fail closed");
});

check("navigation and action capture projections exclude load subresources by exact request kind", () => {
  const select = nativeAdapterModule.selectNativeLifecycleCaptureInvocations;
  assert(typeof select === "function", "native lifecycle capture selector is missing");
  const capture = (ledger, request, status, { navigation = null, action = null,
    exactAction = false } = {}) => {
    const selected = select(request, { navigation, action });
    const envelope = ledger.requestLifecycleRecorder.recordRequest(request,
      ledger.captureContext({
        navigation: selected.navigation,
        action: selected.actionClaim,
      }));
    ledger.registerCapturedRequest(envelope, {
      navigation: selected.navigation,
      actionClaim: selected.actionClaim,
    });
    if (exactAction) ledger.bindExactActionRequestMembership(request, action);
    ledger.requestLifecycleRecorder.recordResponse(fakeLifecycleResponse(request, status));
    return envelope;
  };

  const initial = nativeAdapterModule.createNativeRequestLifecycleLedger({
    caseId: "NAV-SUBRESOURCE-INITIAL",
  });
  const initialNavigation = initial.beginInvocation("navigation", {
    invocationId: "NAV-SUBRESOURCE-INITIAL:navigation",
    phase: "initial-document-navigation",
  });
  capture(initial, fakeLifecycleRequest("http://runtime.invalid/ops/home", {
    resourceType: "document", navigation: true,
  }), 200, { navigation: initialNavigation });
  capture(initial, fakeLifecycleRequest("http://runtime.invalid/ops/api/runtime", {
    resourceType: "fetch",
  }), 200, { navigation: initialNavigation });
  capture(initial, fakeLifecycleRequest("http://runtime.invalid/assets/app.css", {
    resourceType: "stylesheet",
  }), 200, { navigation: initialNavigation });
  initial.endInvocation(initialNavigation);
  initial.sealRequestLifecycleLedger();
  const initialResult = initial.evaluateRequestLifecycleLedger();
  assert(initialResult.status === "PASS" &&
    initialResult.classifications.map(item => item.classification).join(",") ===
      "bootstrap,background,background" &&
    initial.invocationRows().navigationInvocations[0].requests.length === 1,
  "initial navigation load subresources contaminated navigation membership");

  const form = nativeAdapterModule.createNativeRequestLifecycleLedger({
    caseId: "NAV-SUBRESOURCE-FORM",
  });
  const formAction = form.beginInvocation("action", {
    invocationId: "NAV-SUBRESOURCE-FORM:action", phase: "primary-action",
  });
  const formNavigation = form.beginInvocation("navigation", {
    invocationId: "NAV-SUBRESOURCE-FORM:navigation",
    phase: "form-submit-document-navigation",
  });
  const initiating = fakeLifecycleRequest("http://runtime.invalid/setup", {
    method: "POST", resourceType: "document", navigation: true,
  });
  const redirect = fakeLifecycleRequest("http://runtime.invalid/ops/home", {
    resourceType: "document", navigation: true, redirectedFrom: initiating,
  });
  capture(form, initiating, 302, {
    navigation: formNavigation, action: formAction, exactAction: true,
  });
  capture(form, redirect, 200, { navigation: formNavigation, action: formAction });
  capture(form, fakeLifecycleRequest("http://runtime.invalid/assets/app.css", {
    resourceType: "stylesheet",
  }), 200, { navigation: formNavigation, action: formAction });
  capture(form, fakeLifecycleRequest("http://runtime.invalid/assets/app.js", {
    resourceType: "script",
  }), 200, { navigation: formNavigation, action: formAction });
  form.endInvocation(formNavigation);
  form.endInvocation(formAction);
  form.sealRequestLifecycleLedger();
  const formResult = form.evaluateRequestLifecycleLedger();
  assert(formResult.status === "PASS" &&
    formResult.classifications.map(item => item.classification).join(",") ===
      "action,redirect,background,background" &&
    form.invocationRows().navigationInvocations[0].requests.length === 2 &&
    form.invocationRows().actionInvocations[0].requests.length === 1,
  "form navigation subresources contaminated navigation/action membership");

  const unexpected = nativeAdapterModule.createNativeRequestLifecycleLedger({
    caseId: "ACTION-UNEXPECTED-FETCH",
  });
  const unexpectedAction = unexpected.beginInvocation("action", {
    invocationId: "ACTION-UNEXPECTED-FETCH:action", phase: "primary-action",
  });
  capture(unexpected, fakeLifecycleRequest("http://runtime.invalid/ops/api/runtime", {
    resourceType: "xhr",
  }), 200, { action: unexpectedAction });
  unexpected.endInvocation(unexpectedAction);
  unexpected.sealRequestLifecycleLedger();
  assert(unexpected.evaluateRequestLifecycleLedger().failures.some(item =>
    item.code === "INVOCATION_MEMBERSHIP_MISSING"),
  "unexpected fetch/xhr action claim false-PASSed without exact route membership");

  const propertyFailure = nativeAdapterModule.createNativeRequestLifecycleLedger({
    caseId: "CAPTURE-PROPERTY-FAILURE",
  });
  const hostile = fakeLifecycleRequest("http://runtime.invalid/fail");
  hostile.resourceType = () => { throw new Error("resource type unavailable"); };
  const selected = select(hostile, { navigation: {}, action: {} });
  const captured = propertyFailure.requestLifecycleRecorder.recordRequest(hostile,
    propertyFailure.captureContext({
      navigation: selected.navigation,
      action: selected.actionClaim,
    }));
  assert(captured === null && selected.navigation === null && selected.actionClaim === null &&
    propertyFailure.requestLifecycleRecorder.snapshot().captureErrors.length === 1,
  "property read failure escaped or displaced recorder capture-error authority");
});

check("active action scopes claim only exact request owners and their document redirects", () => {
  const resolve = nativeAdapterModule.resolveNativeLifecycleActionCapture;
  assert(typeof resolve === "function",
    "native lifecycle exact action capture resolver is missing");
  const directContext = {};
  const unrelatedContext = {};
  const directInvocation = { invocationId: "ACTION:primary:scope-1" };
  const unrelatedInvocation = { invocationId: "ACTION:readback:scope-2" };
  const invocations = new WeakMap([
    [directContext, directInvocation],
    [unrelatedContext, unrelatedInvocation],
  ]);
  const directOwnership = { context: directContext };

  assert(resolve({
    directActionRequestOwnership: directOwnership,
    actionLifecycleInvocationByContext: invocations,
  }) === directInvocation,
  "exact action request lost its lifecycle invocation");
  assert(resolve({
    actionLifecycleInvocationByContext: invocations,
  }) === null,
  "background request inherited the active coordinator action scope");
  assert(resolve({
    redirectParentActionRequestOwnership: directOwnership,
    actionLifecycleInvocationByContext: invocations,
  }) === directInvocation,
  "document redirect did not inherit its exact parent action invocation");

  let crossActionFailed = false;
  try {
    resolve({
      directActionRequestOwnership: directOwnership,
      redirectParentActionRequestOwnership: { context: unrelatedContext },
      actionLifecycleInvocationByContext: invocations,
    });
  } catch (error) {
    crossActionFailed = String(error.message).includes("different action contexts");
  }
  assert(crossActionFailed,
    "redirect crossing two action contexts did not fail closed");
});

check("missing invite runtime-secret sink keeps failure evidence and a safe fallback shape", async () => {
  const capture = nativeAdapterModule.captureLegacyFormResponseProjection;
  assert(typeof capture === "function", "legacy form response projection helper is missing");
  const rawToken = "round2-issued-token-must-not-leak";
  const entry = {};
  const pending = new Set();
  const failures = [];
  const observedSecrets = new Set();
  const read = capture({
    response: {
      json: async () => ({
        status: "issued",
        invite: {
          inviteId: "invite-round2",
          token: rawToken,
          setupUrl: `/invite/setup?token=${encodeURIComponent(rawToken)}`,
        },
      }),
    },
    entry,
    pathname: "/ops/api/invites",
    pendingSafeResponseReads: pending,
    safeResponseReadFailures: failures,
    observedRuntimeSecrets: observedSecrets,
  });
  assert(read && pending.has(read), "invite safe response read was not tracked");
  await read;
  const serializedEvidence = JSON.stringify({ entry, failures });
  assert(pending.size === 0 && observedSecrets.has(rawToken) &&
    failures.join("|") === "invite response runtime secret sink is unavailable" &&
    JSON.stringify(entry.safeResponseBody) === JSON.stringify({
      pathname: "/ops/api/invites",
      status: "",
      username: "",
      requestId: "",
      inviteId: "",
      tokenPresent: false,
      setupUrlTokenBound: false,
      persistentSecretFieldsPresent: false,
    }) && !serializedEvidence.includes(rawToken),
  "missing invite secret sink lost fallback evidence or exposed the raw token");
});

check("adapter lifecycle ledger is exact-object, sealed, memoized, and JSON-safe", () => {
  const createLedger = nativeAdapterModule.createNativeRequestLifecycleLedger;
  assert(typeof createLedger === "function",
    "createNativeRequestLifecycleLedger integration helper is missing");
  let evaluatorCalls = 0;
  const ledger = createLedger({
    caseId: "ADAPTER-CONTRACT",
    correlationDigest: "digest-default",
    evaluator: input => {
      evaluatorCalls += 1;
      return Object.freeze({
        status: input.recorderSnapshot.captureErrors.length === 0 ? "PASS" : "FAIL",
        classifications: Object.freeze(input.recorderSnapshot.requests.map(envelope =>
          Object.freeze({ request: envelope.requestObject, response: null,
            requestKind: envelope.requestKind, classification: "action",
            owner: "action", phase: "primary-action" }))),
        failures: Object.freeze(input.recorderSnapshot.captureErrors.map(() =>
          Object.freeze({ code: "CAPTURE_ERROR", request: null, response: null }))),
        census: Object.freeze({ requestCount: input.recorderSnapshot.requests.length,
          responseCount: input.recorderSnapshot.responses.length,
          classified: input.recorderSnapshot.requests.length,
          unclassified: 0, multiplyClassified: 0,
          captureErrors: input.recorderSnapshot.captureErrors.length,
          duplicateResponses: 0,
          failureCount: input.recorderSnapshot.captureErrors.length }),
      });
    },
  });
  const first = fakeLifecycleRequest("http://runtime.invalid/ops/home");
  const second = fakeLifecycleRequest("http://runtime.invalid/ops/home");
  const action = ledger.beginInvocation("action", {
    invocationId: "ADAPTER-CONTRACT:action", phase: "primary-action",
  });
  const firstEnvelope = ledger.requestLifecycleRecorder.recordRequest(first,
    ledger.captureContext({ action, correlationDigest: "digest-one" }));
  const secondEnvelope = ledger.requestLifecycleRecorder.recordRequest(second,
    ledger.captureContext({ action, correlationDigest: "digest-two" }));
  ledger.bindCapturedRequest(firstEnvelope, { action });
  ledger.bindCapturedRequest(secondEnvelope, { action });
  ledger.requestLifecycleRecorder.recordResponse(fakeLifecycleResponse(first));
  ledger.requestLifecycleRecorder.recordResponse(fakeLifecycleResponse(second));
  ledger.endInvocation(action);

  assert(first !== second && firstEnvelope.requestObject !== secondEnvelope.requestObject,
    "same-route requests lost exact object separation");
  assert(firstEnvelope.correlationDigest === "digest-one" &&
    secondEnvelope.correlationDigest === "digest-two",
  "per-request digest projection drift");
  let earlyError = null;
  try { ledger.evaluateRequestLifecycleLedger(); } catch (error) { earlyError = error; }
  assert(earlyError instanceof Error && /seal/i.test(earlyError.message),
    "incomplete lifecycle ledger evaluation did not fail closed");
  ledger.sealRequestLifecycleLedger();
  const firstResult = ledger.evaluateRequestLifecycleLedger();
  const secondResult = ledger.evaluateRequestLifecycleLedger();
  assert(firstResult === secondResult && Object.isFrozen(firstResult) && evaluatorCalls === 1,
    "sealed lifecycle evaluation is not frozen/memoized exactly once");
  const rows = ledger.invocationRows();
  const events = ledger.invocationEvents();
  assert(rows.actionInvocations.length === 1 &&
    Object.isFrozen(rows.actionInvocations[0]) &&
    Object.isFrozen(rows.actionInvocations[0].requests) &&
    rows.actionInvocations[0].requests[0] === first &&
    rows.actionInvocations[0].requests[1] === second,
  "final action ledger lost immutable exact Request membership");
  assert(events.actionEvents.length === 2 &&
    events.actionEvents.map(item => item.event).join(",") === "begin,end" &&
    Object.isFrozen(events.actionEvents) &&
    events.actionEvents.every(Object.isFrozen),
  "immutable invocation begin/end event ledger drift");
  const safe = ledger.safeRequestLifecycleProjection();
  const serialized = JSON.stringify(safe);
  assert(typeof serialized === "string" &&
    !serialized.includes("digest-default") &&
    !serialized.includes("correlationId") &&
    !Object.values(safe).includes(first) && !Object.values(safe).includes(second),
  "safe lifecycle projection exposed raw objects/correlation material");

  const failing = createLedger({ caseId: "ADAPTER-CAPTURE-ERROR" });
  const hostile = fakeLifecycleRequest("http://runtime.invalid/fail");
  hostile.resourceType = () => { throw new Error("property failure"); };
  const captured = failing.requestLifecycleRecorder.recordRequest(hostile,
    failing.captureContext({}));
  assert(captured === null, "callback property failure unexpectedly produced an envelope");
  failing.sealRequestLifecycleLedger();
  assert(failing.evaluateRequestLifecycleLedger().status === "FAIL",
    "callback property failure was not deferred to evaluator FAIL");
  const failingSafe = failing.safeRequestLifecycleProjection();
  assert(failingSafe.failures[0]?.requestIdentity &&
    !JSON.stringify(failingSafe).includes("property failure"),
  "capture failure safe projection lost opaque identity or exposed raw detail");
});

check("adapter integration carries the four actual-like lifecycle graphs end to end", () => {
  const createLedger = nativeAdapterModule.createNativeRequestLifecycleLedger;
  const run = ({ caseId, setup }) => {
    const ledger = createLedger({ caseId, correlationDigest: `${caseId}-digest` });
    setup(ledger);
    ledger.sealRequestLifecycleLedger();
    const result = ledger.evaluateRequestLifecycleLedger();
    assert(result.status === "PASS" && result.failures.length === 0,
      `${caseId} adapter lifecycle failed: ${result.failures.map(item => item.code).join(",")}`);
    return result;
  };
  const capture = (ledger, request, responseStatus, { navigation = null,
    action = null, actionMembership = true } = {}) => {
    const envelope = ledger.requestLifecycleRecorder.recordRequest(request,
      ledger.captureContext({ navigation, action }));
    ledger.bindCapturedRequest(envelope, { navigation, action, actionMembership });
    ledger.requestLifecycleRecorder.recordResponse(
      fakeLifecycleResponse(request, responseStatus));
  };
  const bootstrap = run({ caseId: "UI-001-bootstrap-redirect", setup: ledger => {
    const navigation = ledger.beginInvocation("navigation", {
      invocationId: "UI-001:initial-document-navigation",
      phase: "initial-document-navigation",
    });
    const root = fakeLifecycleRequest("http://runtime.invalid/", {
      resourceType: "document", navigation: true,
    });
    const login = fakeLifecycleRequest("http://runtime.invalid/login", {
      resourceType: "document", navigation: true, redirectedFrom: root,
    });
    capture(ledger, root, 302, { navigation });
    capture(ledger, login, 200, { navigation });
    ledger.endInvocation(navigation);
    capture(ledger, fakeLifecycleRequest("http://runtime.invalid/ops/api/runtime"), 200);
  } });
  assert(bootstrap.classifications.length === 3,
    "UI-001 bootstrap/background classification census drift");

  const redirect = run({ caseId: "UI-002-action-redirect", setup: ledger => {
    const action = ledger.beginInvocation("action", {
      invocationId: "UI-002:submit-form", phase: "primary-action",
    });
    const navigation = ledger.beginInvocation("navigation", {
      invocationId: "UI-002:form-submit-document-navigation",
      phase: "form-submit-document-navigation",
    });
    const post = fakeLifecycleRequest("http://runtime.invalid/setup", {
      method: "POST", resourceType: "document", navigation: true,
    });
    const home = fakeLifecycleRequest("http://runtime.invalid/ops/home", {
      resourceType: "document", navigation: true, redirectedFrom: post,
    });
    capture(ledger, post, 302, { navigation, action });
    capture(ledger, home, 200, { navigation, action, actionMembership: false });
    ledger.endInvocation(navigation);
    ledger.endInvocation(action);
  } });
  assert(redirect.classifications.map(item => item.classification).join(",") ===
    "action,redirect", "UI-002 action/redirect classification drift");

  const api = run({ caseId: "representative-api-fetch", setup: ledger => {
    const action = ledger.beginInvocation("action", {
      invocationId: "SRC-008:execute-endpoint-action", phase: "primary-action",
    });
    capture(ledger, fakeLifecycleRequest("http://runtime.invalid/ops/api/sources", {
      method: "POST",
    }), 201, { action });
    ledger.endInvocation(action);
  } });
  assert(api.classifications[0]?.classification === "action",
    "representative API action classification drift");

  const rejection = run({ caseId: "same-route-rejection", setup: ledger => {
    const action = ledger.beginInvocation("action", {
      invocationId: "AUTH-001:submit-login", phase: "primary-action",
    });
    const navigation = ledger.beginInvocation("navigation", {
      invocationId: "AUTH-001:form-submit-document-navigation",
      phase: "form-submit-document-navigation",
    });
    capture(ledger, fakeLifecycleRequest("http://runtime.invalid/login", {
      method: "POST", resourceType: "document", navigation: true,
    }), 401, { navigation, action });
    ledger.endInvocation(navigation);
    ledger.endInvocation(action);
  } });
  assert(rejection.classifications[0]?.phase === "same-route-rejection",
    "same-route rejection lifecycle phase drift");
});

check("request lifecycle invocation identity separates phases for one semantic action", () => {
  const identity = nativeAdapterModule.buildNativeRequestLifecycleInvocationId;
  assert(typeof identity === "function",
    "request lifecycle invocation identity builder is missing");
  const primary = identity({
    actionId: "UI-001:assert-product-state",
    phase: "primary-action",
    scopeSequence: 1,
  });
  const readback = identity({
    actionId: "UI-001:assert-product-state",
    phase: "independent-readback",
    scopeSequence: 2,
  });
  assert(primary === "UI-001:assert-product-state:primary-action:scope-1" &&
    readback === "UI-001:assert-product-state:independent-readback:scope-2" &&
    primary !== readback,
  "primary and independent readback lifecycle invocations were not separated");

  const ledger = nativeAdapterModule.createNativeRequestLifecycleLedger({
    caseId: "UI-001-SCOPED-ACTION",
  });
  const primaryInvocation = ledger.beginInvocation("action", {
    invocationId: primary,
    phase: "primary-action",
  });
  ledger.endInvocation(primaryInvocation);
  const readbackInvocation = ledger.beginInvocation("action", {
    invocationId: readback,
    phase: "independent-readback",
  });
  ledger.endInvocation(readbackInvocation);
  ledger.sealRequestLifecycleLedger();
  const result = ledger.evaluateRequestLifecycleLedger();
  assert(result.status === "PASS" && result.failures.length === 0 &&
    ledger.invocationRows().actionInvocations.length === 2,
  "sequential lifecycle scopes for one semantic action did not close independently");

  for (const invalid of [
    { actionId: "", phase: "primary-action", scopeSequence: 1 },
    { actionId: "UI-001:assert-product-state", phase: "", scopeSequence: 1 },
    { actionId: "UI-001:assert-product-state", phase: "primary-action", scopeSequence: 0 },
  ]) {
    let rejected = false;
    try {
      identity(invalid);
    } catch (error) {
      rejected = String(error.message).includes("identity input is invalid");
    }
    assert(rejected, "invalid request lifecycle invocation identity input did not fail closed");
  }
  assert(adapterSource.includes(
    "buildNativeRequestLifecycleInvocationId(context)"),
  "adapter request ownership did not use the scoped lifecycle invocation identity");
});

check("bundled Playwright module resolves with provenance", () => {
  const resolved = resolvePlaywrightModule();
  assert(Boolean(resolved.playwright?.chromium), "chromium browser type missing");
  assert(Boolean(resolved.modulePath), "modulePath missing");
  assert(/^\d+\./.test(resolved.moduleVersion), `invalid moduleVersion: ${resolved.moduleVersion}`);
  assert(resolved.attempts.some(item => item.status === "selected"), "selected module attempt missing");
});

check("explicit missing module fails without fallback", () => {
  let failed = false;
  try {
    resolvePlaywrightModule({ modulePath: "/tmp/media-server-missing-playwright", requireExplicit: true });
  } catch (error) {
    failed = true;
    assert(String(error.message).includes("native Playwright module unavailable"), "missing-module reason mismatch");
    assert(Array.isArray(error.attempts) && error.attempts[0]?.status === "missing-package-json", "missing-module attempt evidence missing");
  }
  assert(failed, "missing explicit module must fail");
});

check("Playwright timeout attestation uses class identity instead of mutable error name", () => {
  class RealTimeoutError extends Error {}
  const playwright = { errors: { TimeoutError: RealTimeoutError } };
  const genuine = new RealTimeoutError("genuine timeout");
  const forged = new Error("forged timeout");
  forged.name = "TimeoutError";
  assert(isResolvedPlaywrightTimeoutError(playwright, genuine) === true,
    "real Playwright TimeoutError class was not attested");
  assert(isResolvedPlaywrightTimeoutError(playwright, forged) === false,
    "mutable Error.name impersonated Playwright TimeoutError");
});

check("selector owner reveal keeps plain CSS in the Playwright locator engine", async () => {
  const selector = "#plain-target";
  const harness = selectorOwnerHarness({ selector });
  const evidence = await revealClosedDetailsForSelector(harness.page, selector, {
    state: "visible",
    timeout: 41,
  });
  assertSelectorOwnerEvidence(evidence, { candidateCount: 1, requestedState: "visible" });
  assert(harness.nativeSelectorCalls.length === 0,
    "plain CSS selector escaped into a native DOM selector API");
  assert(JSON.stringify(harness.waits) === JSON.stringify([
    { state: "attached", timeout: 41 },
    { state: "visible", timeout: 41 },
  ]), "plain CSS selector did not preserve attached-before-visible ordering");
});

check("UI-008 Playwright has-text selector never reaches native querySelector", async () => {
  const selector = '#access-requests-body tr:has-text("ui-008-review4-fixture")';
  const harness = selectorOwnerHarness({ selector });
  const evidence = await revealClosedDetailsForSelector(harness.page, selector, {
    state: "visible",
    timeout: 43,
  });
  assertSelectorOwnerEvidence(evidence, { candidateCount: 1, requestedState: "visible" });
  assert(harness.nativeSelectorCalls.length === 0,
    "UI-008 Playwright selector escaped into native querySelector");
  assert(harness.locatorSelectors.every(value => value === selector),
    "UI-008 selector identity changed before Playwright resolution");
});

check("selector owner reveal opens only the selected target closed details owner", async () => {
  const selector = "#closed-details-target";
  const disclosure = selectorHarnessDetails(false);
  const harness = selectorOwnerHarness({
    selector,
    targets: [selectorHarnessTarget({ disclosure })],
  });
  const evidence = await revealClosedDetailsForSelector(harness.page, selector, {
    state: "visible",
    timeout: 47,
  });
  assert(disclosure.open === true, "closed details owner was not opened");
  assert(evidence.disclosureFound === true && evidence.disclosureOpened === true,
    "closed details mutation evidence is incomplete");

  const summaryDetails = selectorHarnessDetails(false);
  const summary = selectorHarnessTarget({ disclosure: summaryDetails, tagName: "SUMMARY" });
  summary.parentElement = summaryDetails;
  const summaryHarness = selectorOwnerHarness({ selector: "details > summary", targets: [summary] });
  const summaryEvidence = await revealClosedDetailsForSelector(
    summaryHarness.page,
    "details > summary",
    { state: "visible", timeout: 47 },
  );
  assert(summaryDetails.open === false && summaryEvidence.disclosureOpened === false,
    "details summary selection changed the existing summary-owner contract");
});

check("selector owner reveal waits for dynamic attachment before owner evaluation", async () => {
  const selector = "#dynamic-target";
  const harness = selectorOwnerHarness({ selector, initiallyAttached: false, attachOnWait: true });
  const evidence = await revealClosedDetailsForSelector(harness.page, selector, {
    state: "attached",
    timeout: 53,
  });
  assertSelectorOwnerEvidence(evidence, { candidateCount: 1, requestedState: "attached" });
  assert(harness.evaluateAfterAttached === true,
    "dynamic selector owner was evaluated before attachment");
  assert(JSON.stringify(harness.waits) === JSON.stringify([
    { state: "attached", timeout: 53 },
    { state: "attached", timeout: 53 },
  ]), "dynamic attached state did not retain the two-phase locator lifecycle");
});

check("selector owner reveal fails closed for zero candidates and preserves first of many", async () => {
  const missing = selectorOwnerHarness({ selector: "#missing", targets: [] });
  let missingFailed = false;
  try {
    await revealClosedDetailsForSelector(missing.page, "#missing", {
      state: "visible",
      timeout: 59,
    });
  } catch (error) {
    missingFailed = true;
    assert(String(error.message).includes("locator wait timeout"),
      "missing selector did not preserve locator timeout failure");
  }
  assert(missingFailed, "missing selector was accepted");

  const firstDetails = selectorHarnessDetails(false);
  const secondDetails = selectorHarnessDetails(false);
  const multiple = selectorOwnerHarness({
    selector: ".candidate",
    targets: [
      selectorHarnessTarget({ disclosure: firstDetails }),
      selectorHarnessTarget({ disclosure: secondDetails }),
    ],
  });
  const evidence = await revealClosedDetailsForSelector(multiple.page, ".candidate", {
    state: "visible",
    timeout: 61,
  });
  assertSelectorOwnerEvidence(evidence, { candidateCount: 2, requestedState: "visible" });
  assert(firstDetails.open === true && secondDetails.open === false,
    "multiple selector candidates did not preserve first-locator ownership");
});

check("selector owner reveal preserves exact text selector identity and rejects wrong text", async () => {
  const exact = '#access-requests-body tr:has-text("ui-008-review4-fixture")';
  const wrong = '#access-requests-body tr:has-text("wrong-fixture")';
  const harness = selectorOwnerHarness({ selector: exact });
  let failed = false;
  try {
    await revealClosedDetailsForSelector(harness.page, wrong, {
      state: "visible",
      timeout: 67,
    });
  } catch (error) {
    failed = true;
    assert(String(error.message).includes("locator wait timeout"),
      "wrong text selector did not retain locator failure");
  }
  assert(failed, "wrong text selector was accepted");
  assert(harness.locatorSelectors.includes(wrong),
    "wrong text selector was rewritten before Playwright resolution");
});

check("shared adapter impact census covers all canonical 424 cases and the fixed remaining 125", () => {
  const nativeManifest = JSON.parse(readText("test/fixtures/v390_ui_native_exact_cases.json"));
  const impact = buildCanonicalSharedAdapterImpact(nativeManifest);
  const storedImpact = JSON.parse(readText("test/fixtures/v390_ui_shared_adapter_impact.json"));
  assert(impact.caseCount === 424 && impact.cases.length === 424,
    "shared adapter impact census did not cover canonical 424");
  assert(new Set(impact.cases.map(item => item.caseId)).size === 424,
    "shared adapter impact census contains duplicate case IDs");
  assert(JSON.stringify(impact.cases.map(item => item.caseId)) ===
    JSON.stringify(nativeManifest.cases.map(item => item.caseId)),
  "shared adapter impact census changed canonical ordering");
  assert(impact.remaining125CaseCount === 125 &&
    JSON.stringify(impact.remaining125CaseIds) ===
      JSON.stringify(nativeManifest.cases.slice(299).map(item => item.caseId)),
  "shared adapter impact census changed the fixed remaining-125 selection");
  assert(impact.postActionVisualCensus.exactOneOwnerCaseCount === 424 &&
    JSON.stringify(impact.postActionVisualCensus.completionModeCounts) ===
      JSON.stringify({ request: 391, local: 28, navigation: 5 }) &&
    impact.postActionVisualCensus.hiddenSourceBranchCaseCount === 227 &&
    impact.postActionVisualCensus.detachedSourceBranchCaseCount === 227 &&
    impact.postActionVisualCensus.routeChangeCaseCount === 13 &&
    impact.postActionVisualCensus.localTransitionCaseCount === 28 &&
    impact.postActionVisualCensus.navigationCaseCount === 5,
  "canonical 424 post-action visual lifecycle census drifted");
  assert(impact.cases.every(item =>
    item.postActionVisualLifecycle.exactOneOwnerRequired === true &&
    item.postActionVisualLifecycle.invisibleSourceRewaitAllowed === false &&
    item.postActionVisualLifecycle.staleSourceScrollAllowed === false),
  "canonical post-action visual lifecycle permits ambiguous/stale owners");
  for (const family of ["UI-", "EVT-", "CLIENT-", "MEDIA-", "SAFE-"]) {
    assert(impact.cases.some(item => item.caseId.startsWith(family)),
      `shared adapter impact census omitted ${family} cases`);
  }
  assert(JSON.stringify(storedImpact) === JSON.stringify(impact),
    "stored shared adapter impact artifact drifted from canonical source analysis");
});

check("all redirecting document cases bind destination controls and forbid stale source rewait", () => {
  const nativeManifest = JSON.parse(readText("test/fixtures/v390_ui_native_exact_cases.json"));
  const impact = buildCanonicalSharedAdapterImpact(nativeManifest);
  const expectedRedirects = [
    "UI-002", "UI-003", "UI-004", "UI-005", "UI-007",
    "AUTH-004", "AUTH-005", "AUTH-006", "AUTH-034",
  ];
  assert(JSON.stringify(impact.routeTransitionCaseIds) === JSON.stringify(expectedRedirects),
    "redirecting document case census drifted");
  for (const caseId of expectedRedirects) {
    const item = nativeManifest.cases.find(candidate => candidate.caseId === caseId);
    const plan = buildPostActionLifecyclePlan(item);
    assert(plan.postNavigation.routeChanged === true &&
      plan.postNavigation.sourceSelectorRewaitAllowed === false &&
      plan.postNavigation.selector !== plan.preAction.selector &&
      postActionDestinationLifecycleRequired(plan) === true,
    `${caseId} redirect lifecycle permits stale source reuse`);
    const accepted = evaluatePostActionLifecycle(plan, {
      observedRoute: plan.postNavigation.route,
      destinationObservation: { exists: true, visible: true },
      sourceObservation: { exists: false, visible: false },
    });
    assert(accepted.pass === true && accepted.sourceDetached === true,
      `${caseId} detached redirect source was not accepted with its destination`);
  }
});

check("UI-002 through UI-007 existing canonical cases have explicit post-action lifecycle coverage", () => {
  const nativeManifest = JSON.parse(readText("test/fixtures/v390_ui_native_exact_cases.json"));
  const existingIds = nativeManifest.cases.map(item => item.caseId);
  assert(!existingIds.includes("UI-006"), "unexpected canonical UI-006 case appeared");
  for (const caseId of ["UI-002", "UI-003", "UI-004", "UI-005", "UI-007"]) {
    const item = nativeManifest.cases.find(candidate => candidate.caseId === caseId);
    const plan = buildPostActionLifecyclePlan(item);
    assert(plan.action.sequence.some(action => action.kind === "submit-form"),
      `${caseId} action sequence lost its form submission`);
    const destinationMissing = evaluatePostActionLifecycle(plan, {
      observedRoute: plan.postNavigation.route,
      destinationObservation: { exists: false, visible: false },
      sourceObservation: { exists: false, visible: false },
    });
    assert(destinationMissing.failureCode === "DESTINATION_CONTROL_MISSING",
      `${caseId} missing destination did not fail closed`);
    const wrongRoute = evaluatePostActionLifecycle(plan, {
      observedRoute: `${plan.postNavigation.route}-wrong`,
      destinationObservation: { exists: true, visible: true },
      sourceObservation: { exists: false, visible: false },
    });
    assert(wrongRoute.failureCode === "WRONG_DESTINATION_ROUTE",
      `${caseId} wrong destination route did not fail closed`);
  }
});

check("post-action lifecycle separates UI-002 source control from the redirect destination", () => {
  const nativeManifest = JSON.parse(readText("test/fixtures/v390_ui_native_exact_cases.json"));
  const item = nativeManifest.cases.find(candidate => candidate.caseId === "UI-002");
  const plan = buildPostActionLifecyclePlan(item, {
    schema: "media-server.v390-ui-document-form-submit-binding.v1",
    method: "POST",
    path: "/setup",
    status: 302,
    redirectCount: 1,
    redirectPath: "/login",
  });
  assert(plan.preAction.route === "/setup" &&
    plan.preAction.selector === '[data-testid="auth-setup-form"] button[type="submit"]',
  "UI-002 pre-action source binding drifted");
  assert(plan.postNavigation.route === "/login" &&
    plan.postNavigation.selector === '[data-testid="auth-login-form"]' &&
    plan.postNavigation.selector !== plan.preAction.selector,
  "UI-002 redirect destination reused the stale setup selector");
  assert(plan.postNavigation.sourceSelectorRewaitAllowed === false,
    "UI-002 redirect permits a stale source selector rewait");
});

check("legacy destination wait helper remains redirect-scoped", async () => {
  const nativeManifest = JSON.parse(readText("test/fixtures/v390_ui_native_exact_cases.json"));
  const ui002 = nativeManifest.cases.find(candidate => candidate.caseId === "UI-002");
  const redirectPlan = buildPostActionLifecyclePlan(ui002, {
    schema: "media-server.v390-ui-document-form-submit-binding.v1",
    method: "POST",
    path: "/setup",
    status: 302,
    redirectCount: 1,
    redirectPath: "/login",
  });
  const redirected = evaluatePostActionLifecycle(redirectPlan, {
    observedRoute: "/login",
    destinationObservation: { exists: true, visible: true },
    sourceObservation: { exists: false, visible: false },
  });
  assert(redirected.pass === true && redirected.sourceSelectorRewaited === false,
    "redirect lifecycle did not accept detached source with a valid destination");
  assert(postActionDestinationLifecycleRequired(redirectPlan) === true,
    "redirect destination lifecycle was not enabled");

  const auth007 = nativeManifest.cases.find(candidate => candidate.caseId === "AUTH-007");
  const nonRedirectPlan = buildPostActionLifecyclePlan(auth007, {
    schema: "media-server.v390-ui-document-form-submit-binding.v1",
    method: "POST",
    path: "/login",
    status: 403,
    redirectCount: 0,
    redirectPath: "",
  });
  const nonRedirect = evaluatePostActionLifecycle(nonRedirectPlan, {
    observedRoute: "/login",
    destinationObservation: { exists: true, visible: true },
    sourceObservation: { exists: true, visible: true },
  });
  assert(nonRedirect.pass === true &&
    nonRedirectPlan.postNavigation.selector === nonRedirectPlan.preAction.selector &&
    postActionDestinationLifecycleRequired(nonRedirectPlan) === false,
  "non-redirect lifecycle changed the source control contract");
  let waitAttempted = false;
  let rejected = false;
  try {
    await observePostActionLifecycle({
      waitForSelector: async () => { waitAttempted = true; },
      snapshot: async () => ({ exists: true, visible: true }),
      evaluate: async () => "/login",
    }, nonRedirectPlan);
  } catch (error) {
    rejected = String(error.message).includes("requires an observed redirect contract");
  }
  assert(rejected && waitAttempted === false,
    "non-redirect source selector reached the post-action wait callsite");
});

check("runtime control observation separates canonical identity from fixture-qualified owner", () => {
  const observed = bindRuntimeControlObservationOwner({
    identitySelector: '[data-ops-rule-action="delete-va"]',
    executionOwnerSelector: '[data-ops-rule-action="delete-va"][data-ops-rule-id="3920006"]',
    ownerObservation: { exists: true, visible: true, disabled: false },
  });
  assert(observed.selector === '[data-ops-rule-action="delete-va"]' &&
    observed.exists === true && observed.visible === true && observed.enabled === true,
  "fixture-qualified owner did not retain canonical selector identity");
  const missing = bindRuntimeControlObservationOwner({
    identitySelector: '[data-ops-rule-action="delete-va"]',
    executionOwnerSelector: '[data-ops-rule-action="delete-va"][data-ops-rule-id="missing"]',
    ownerObservation: { exists: false, visible: false, disabled: false },
  });
  assert(missing.exists === false && missing.visible === false && missing.enabled === false,
    "missing execution owner passed runtime control observation");
});

check("post-action lifecycle fails closed for missing destination and wrong destination route", () => {
  const nativeManifest = JSON.parse(readText("test/fixtures/v390_ui_native_exact_cases.json"));
  const item = nativeManifest.cases.find(candidate => candidate.caseId === "UI-002");
  const plan = buildPostActionLifecyclePlan(item, {
    schema: "media-server.v390-ui-document-form-submit-binding.v1",
    method: "POST",
    path: "/setup",
    status: 302,
    redirectCount: 1,
    redirectPath: "/login",
  });
  const missing = evaluatePostActionLifecycle(plan, {
    observedRoute: "/login",
    destinationObservation: { exists: false, visible: false },
    sourceObservation: { exists: false, visible: false },
  });
  assert(missing.pass === false && missing.failureCode === "DESTINATION_CONTROL_MISSING",
    "missing redirect destination control did not fail closed");
  const wrongRoute = evaluatePostActionLifecycle(plan, {
    observedRoute: "/setup",
    destinationObservation: { exists: true, visible: true },
    sourceObservation: { exists: true, visible: true },
  });
  assert(wrongRoute.pass === false && wrongRoute.failureCode === "WRONG_DESTINATION_ROUTE",
    "wrong redirect destination route did not fail closed");
});

check("post-action lifecycle waits only for the destination selector after redirect", async () => {
  const nativeManifest = JSON.parse(readText("test/fixtures/v390_ui_native_exact_cases.json"));
  const item = nativeManifest.cases.find(candidate => candidate.caseId === "UI-002");
  const plan = buildPostActionLifecyclePlan(item);
  const waitedSelectors = [];
  const browser = {
    waitForSelector: async (selector, options) => {
      waitedSelectors.push({ selector, state: options.state });
    },
    evaluate: async () => "/login",
    snapshot: async selector => ({
      selector,
      exists: selector === '[data-testid="auth-login-form"]',
      visible: true,
    }),
  };
  const observed = await observePostActionLifecycle(browser, plan, {
    sourceObservation: { exists: false, visible: false },
  });
  assert(observed.evidence.pass === true && observed.evidence.sourceDetached === true,
    "redirect destination lifecycle did not accept a detached source");
  assert(JSON.stringify(waitedSelectors) === JSON.stringify([{
    selector: '[data-testid="auth-login-form"]',
    state: "visible",
  }]), "redirect lifecycle waited for a stale source selector");
});

check("post-action destination wait failures retain structured fail-closed evidence", async () => {
  const nativeManifest = JSON.parse(readText("test/fixtures/v390_ui_native_exact_cases.json"));
  const item = nativeManifest.cases.find(candidate => candidate.caseId === "UI-002");
  const plan = buildPostActionLifecyclePlan(item);
  const browser = {
    waitForSelector: async () => { throw new Error("destination timeout"); },
    evaluate: async () => "/login",
    snapshot: async selector => ({ selector, exists: false, visible: false }),
  };
  let failure = null;
  try {
    await observePostActionLifecycle(browser, plan, {
      sourceObservation: { exists: false, visible: false },
    });
  } catch (error) {
    failure = error;
  }
  assert(failure?.postActionLifecycleEvidence?.failureCode === "DESTINATION_CONTROL_MISSING",
    "destination timeout lost the structured missing-control evidence");
});

check("post-action visual measurement never re-waits a detached source owner", () => {
  const nativeManifest = JSON.parse(readText("test/fixtures/v390_ui_native_exact_cases.json"));
  const item = nativeManifest.cases.find(candidate => candidate.caseId === "UI-029");
  const plan = buildPostActionLifecyclePlan(item);
  const observation = ({ selector = plan.preAction.selector, candidateCount = 1,
    exists = candidateCount === 1, visible = true, navigationEpoch = 1 } = {}) => ({
    selector,
    candidateCount,
    navigationEpoch,
    exists,
    visible,
    url: "http://127.0.0.1:8080/ops/vlm",
  });
  const visualContext = {
    schema: "media-server.v390-ui-post-action-visual-context.v1",
    route: "/ops/vlm",
    navigationEpoch: 1,
    documentOwner: observation({ selector: "body" }),
  };
  const detached = resolvePostActionVisualTarget(plan, {
    visualContext,
    sourceBeforeObservation: observation(),
    sourceObservation: observation({ candidateCount: 0, visible: false }),
  });
  assert(detached.selector === "body" &&
    detached.bindingKind === "post-action-visible-document-owner" &&
    detached.sourceDetached === true &&
    detached.sourceSelectorRewaited === false &&
    detached.observedRoute === "/ops/vlm",
  "detached source control remained the post-action visual wait owner");
  const hidden = resolvePostActionVisualTarget(plan, {
    visualContext,
    sourceBeforeObservation: observation(),
    sourceObservation: observation({ visible: false }),
  });
  assert(hidden.selector === "body" && hidden.sourceHidden === true &&
    hidden.bindingKind === "post-action-visible-document-owner",
  "hidden source control remained the post-action visual wait owner");
  const retained = resolvePostActionVisualTarget(plan, {
    visualContext,
    sourceBeforeObservation: observation(),
    sourceObservation: observation(),
  });
  assert(retained.selector === plan.preAction.selector &&
    retained.bindingKind === "post-action-visible-source-owner" &&
    retained.sourceDetached === false && retained.sourceHidden === false,
  "visible source control lost its post-action visual contract");
  for (const invalid of [
    { sourceObservation: observation({ selector: "#wrong" }) },
    { sourceObservation: observation({ candidateCount: 2 }) },
    { sourceObservation: observation({ navigationEpoch: 2 }) },
    { visualContext: { ...visualContext, route: "/wrong" } },
  ]) {
    let rejected = false;
    try {
      resolvePostActionVisualTarget(plan, {
        visualContext: invalid.visualContext || visualContext,
        sourceBeforeObservation: observation(),
        sourceObservation: invalid.sourceObservation || observation(),
      });
    } catch {
      rejected = true;
    }
    assert(rejected, "wrong selector/cardinality/epoch/route visual owner passed");
  }
});

check("exact runner preserves visible same-route source owners and binds all destination owners", () => {
  for (const snippet of [
    "buildPostActionLifecyclePlan",
    "postActionLifecyclePlan",
    "browser.observePostActionVisualContext()",
    "resolvePostActionVisualTarget(",
    "trace.postActionVisualTargetEvidence = postActionVisualTarget",
    "sourceBeforeObservation",
    "destinationObservation",
    "ownerBinding: postActionVisualTarget",
  ]) {
    assert(exactRunnerSource.includes(snippet),
      `exact runner post-action lifecycle integration missing ${snippet}`);
  }
  assert(!exactRunnerSource.includes("postActionDestinationLifecycleRequired(postActionLifecyclePlan)"),
    "exact runner retained the redirect-only visual owner fork");
  assert(exactRunnerSource.indexOf("resolvePostActionVisualTarget(") <
    exactRunnerSource.indexOf("ownerBinding: postActionVisualTarget"),
  "exact runner did not resolve the owner before visual measurement");
});

check("canonical selector dialect audit leaves no Playwright selector path in native DOM APIs", () => {
  const canonicalManifest = JSON.parse(readText("test/fixtures/ui_fulltest_case_manifest_policy_v4.json"));
  const nativeManifest = JSON.parse(readText("test/fixtures/v390_ui_native_exact_cases.json"));
  assert(canonicalManifest.cases?.length === 424 && nativeManifest.cases?.length === 424,
    "selector audit did not cover the canonical/native exact 424 manifests");
  assert(nativeManifest.cases.filter(item => item.disposition === "unsupported").length === 0,
    "selector audit encountered an unsupported native case");
  const manifestSelectors = [
    ...collectSelectorContractValues(canonicalManifest),
    ...collectSelectorContractValues(nativeManifest),
  ];
  assert(manifestSelectors.length > 0, "selector audit found no manifest selector contracts");
  const manifestDialect = manifestSelectors.filter(item => playwrightSelectorDialect(item.value));
  assert(manifestDialect.length === 0,
    `canonical CSS-only selector contract contains Playwright dialect: ${manifestDialect.map(item => item.path).join(",")}`);

  assert(caseRuntimeSource.includes(
    'await browser.waitForSelector(`${sectionSelector} tr:has-text(${JSON.stringify(identity)})`);'),
  "UI-008 runtime Playwright selector construction is missing");
  assert(!caseRuntimeSource.includes(
    'document.querySelector(`${sectionSelector} tr:has-text(${JSON.stringify(identity)})`)'),
  "UI-008 runtime Playwright selector reaches native querySelector");

  for (const forbidden of [
    "document.querySelector(browserSelector)",
    "document.querySelector(${JSON.stringify(selector)})",
    "const element = selector ? document.querySelector(selector) : null;",
  ]) {
    assert(!adapterSource.includes(forbidden),
      `Locator-bound adapter selector still reaches a native DOM API: ${forbidden}`);
  }
  const measureVisualSource = adapterSource.slice(
    adapterSource.indexOf("measureVisualState: async"),
    adapterSource.indexOf("waitForLiveVideoReady: async"),
  );
  assert(!measureVisualSource.includes("document.querySelector(targetSelector)"),
    "visual target selector is not Locator-bound");

  const dynamicCalls = collectDynamicNativeSelectorCalls();
  const unclassified = dynamicCalls.filter(item => !cssOnlyNativeSelectorOwners().has(
    `${item.file}::${item.identifier}`));
  assert(unclassified.length === 0,
    `dynamic native selector owner is unclassified: ${unclassified.map(item => `${item.file}:${item.identifier}`).join(",")}`);
  const dialectNativeCalls = collectNativeSelectorDialectCalls();
  assert(dialectNativeCalls.length === 0,
    `Playwright selector dialect reaches a native DOM API: ${dialectNativeCalls.join(",")}`);
});

check("adapter exposes native wait click fill type select screenshot", () => {
  for (const capability of ["wait", "click", "fill", "type", "select", "screenshot", "evaluate", "request-correlation", "request-start-ledger", "request-action-ownership", "network-quiet", "role-session-switch"]) {
    assert(nativeCapabilities.includes(capability), `missing capability ${capability}`);
  }
  for (const snippet of ["waitForSelector", "page.locator(selector).click", "page.locator(selector).fill", "pressSequentially", "selectOption", "page.screenshot"]) {
    assert(adapterSource.includes(snippet), `adapter source missing ${snippet}`);
  }
  assert(adapterSource.includes('readOnly: Boolean("readOnly" in element && element.readOnly)'),
    "adapter snapshot does not expose product readonly state");
  for (const snippet of ["x-media-server-correlation-id", "requestId", "correlationSource", "setCorrelationId"]) {
    assert(adapterSource.includes(snippet), `adapter correlation source missing ${snippet}`);
  }
  for (const snippet of [
    "caseRequestIdentity",
    "caseRequestSequence",
    '"playwright-response-request"',
    "responseRequestObjectObserved: Boolean(initiatingRequest)",
    '"initiating-request-identity"',
    '"not-required"',
    "pendingRequests.get(request)",
  ]) {
    assert(adapterSource.includes(snippet), `adapter exact response request binding missing ${snippet}`);
  }
  assert(!adapterSource.includes('response.headers()["x-media-server-correlation-id"]'),
    "adapter invents a response correlation echo contract");
  for (const snippet of [
    "revealClosedDetailsForSelector",
    'disclosure.open = true',
    "isDisclosureSummary",
  ]) {
    assert(adapterSource.includes(snippet), `adapter lifecycle readiness source missing ${snippet}`);
  }
  assert(/style\.display !== ["']none["'] && style\.visibility !== ["']hidden["']/.test(adapterSource),
    "adapter lifecycle readiness no longer observes display and visibility");
  const snapshotReadinessSource = adapterSource.slice(
    adapterSource.indexOf("snapshot: async (selector)"),
    adapterSource.indexOf("measureVisualState: async"),
  );
  const observedReadinessSource = adapterSource.slice(
    adapterSource.indexOf("observeRequestedObservedState: async"),
    adapterSource.indexOf("screenshot: async outputFile"),
  );
  assert(!snapshotReadinessSource.includes("Number(style.opacity || 1) > 0") &&
    !observedReadinessSource.includes("Number(style.opacity || 1) > 0"),
  "adapter readiness treats a native transparent control as non-actionable");
  for (const snippet of ["page.on(\"request\"", "pendingRequests", "correlatedEntryCount", "entry.correlationId === correlationId"]) {
    assert(adapterSource.includes(snippet), `adapter action-window source missing ${snippet}`);
  }
  for (const snippet of [
    "clickWithRequestOwnership",
    "initiatorActionId",
    "renderCycleId",
    "requestStartedAtMs",
    "responseObservedAtMs",
    "case-owned-refresh-action",
    "__mediaServerDiagnosticOwnedRenderCycle",
  ]) {
    assert(adapterSource.includes(snippet), `adapter owned render-cycle source missing ${snippet}`);
  }
  for (const snippet of [
    "requestListenersInstalled = true",
    'requestKind = request.isNavigationRequest()',
    'requestKind: "document-navigation"',
    "navigationInvocationId",
    "documentNavigationLedger",
    "orderedDocumentNavigations",
    "totalDocumentNavigationCount",
    "listenerStartSequence",
    "listenerEndSequence",
    "navigationAfterListenerEndCount",
    "requestCandidateCount: candidates.length",
    "requestResponseBound:",
    'requestKind: "application-fetch"',
    "requestAttemptCount: 1",
    "requestReissued: false",
    "listenerInstalledBeforeRequest: requestListenersInstalled",
    "ledgerSettled",
  ]) {
    assert(adapterSource.includes(snippet), `adapter application-fetch evidence missing ${snippet}`);
  }
  assert(exactRunnerSource.includes("buildRequestCorrelationEvidence") &&
    exactRunnerSource.includes("requestCorrelationEvidence") &&
    exactRunnerSource.includes('navigationCorrelationId: ""') &&
    exactRunnerSource.includes("navigationInvocationId: item.actions[0].semanticCompletion.navigationBinding"),
  "exact runner does not preserve application-fetch correlation evidence");
  assert(adapterSource.includes('await context.route("**/*"') &&
    adapterSource.includes("activeNavigationOperation?.allowCorrelation === true") &&
    adapterSource.includes("delete headers[correlationHeaderName]") &&
    adapterSource.includes("outerInjectionEnabled: claimedContext") &&
    adapterSource.includes("allowCorrelation: false") &&
    !adapterSource.includes("context.setExtraHTTPHeaders"),
  "adapter does not keep correlation injection request/document scoped");
  assert(exactRunnerSource.includes("finalNavigation = await browser.close()") &&
    exactRunnerSource.includes("browser.sealRequestLifecycleLedger()") &&
    !exactRunnerSource.includes("browser.finalizeNavigationLedger()") &&
    exactRunnerSource.includes("final navigation lifecycle failed"),
  "exact runner does not separate physical browser close from request lifecycle sealing");
  const closeBlockStart = adapterSource.indexOf("close: async () => {");
  const contextClose = adapterSource.indexOf("await context.close()", closeBlockStart);
  const browserClose = adapterSource.indexOf("await browser.close()", closeBlockStart);
  const finalLedger = adapterSource.indexOf("const finalNavigation = finalizeNavigationLedger()", closeBlockStart);
  assert(closeBlockStart >= 0 &&
    contextClose > closeBlockStart &&
    browserClose > contextClose &&
    finalLedger > browserClose,
  "adapter finalizes the navigation ledger before the browser lifecycle is closed");
  const closeBlockEnd = adapterSource.indexOf("\n    },\n  };", closeBlockStart);
  assert(closeBlockEnd > closeBlockStart &&
    !adapterSource.slice(closeBlockStart, closeBlockEnd)
      .includes("sealRequestLifecycleLedger"),
  "adapter physical close still conflates request lifecycle ledger finalization");
  assert(adapterSource.includes("let closePromise = null") &&
    adapterSource.includes("if (!closePromise)") &&
    adapterSource.includes("return closePromise"),
  "adapter browser close is not a single idempotent lifecycle boundary");
});

check("route-injected application correlation survives request-start to response binding", () => {
  for (const snippet of [
    "const routeInjectedCorrelations = new WeakMap()",
    "const applyRouteInjectedCorrelation = (request, correlationId, {",
    "resolveRequestCorrelationPrecedence({",
    "applyRouteInjectedCorrelation(request, decision.correlationId, decision)",
    "const routeInjectedCorrelation = routeInjectedCorrelations.get(request)",
    'correlationInjectionSource: "route-continue"',
    "Object.assign(pending, applied)",
    "let activeCorrelationInjectionEnabled = Boolean(navigationCorrelationId)",
    "outerInjectionEnabled: claimedContext",
    "correlationAllowed,",
    "setCorrelationId: async (",
  ]) {
    assert(adapterSource.includes(snippet),
      `route-injected correlation is not preserved through response binding: ${snippet}`);
  }
  assert(!adapterSource.includes("context.setExtraHTTPHeaders"),
    "route-injected correlation widened beyond the exact intercepted request");
});

check("explicit inner correlation precedence is registry-bound and leak-free", () => {
  const outerCorrelationId = "EVT-023:outer-correlation";
  const innerCorrelationId = "EVT-023:diagnostic-inner-correlation";
  const caseId = "EVT-023";
  const actionId = "EVT-023:ops-timeline-authoritative-readback";
  const registration = {
    active: true,
    caseId,
    actionId,
    correlationId: innerCorrelationId,
    outerCorrelationId,
  };
  const absent = resolveRequestCorrelationPrecedence({
    headerEntries: [],
    outerCorrelationId,
    outerInjectionEnabled: true,
    correlationAllowed: true,
    registration: null,
    currentCaseId: caseId,
    currentActionId: actionId,
  });
  assert(absent.state === "injected-outer" &&
    absent.inject === true &&
    absent.preserve === false &&
    absent.correlationId === outerCorrelationId &&
    /^[0-9a-f]{64}$/.test(absent.correlationDigest),
  "header-absent request did not inject the outer correlation exactly once");

  const preserved = resolveRequestCorrelationPrecedence({
    headerEntries: [{ name: "X-Media-Server-Correlation-Id", value: innerCorrelationId }],
    outerCorrelationId,
    outerInjectionEnabled: true,
    correlationAllowed: true,
    registration,
    currentCaseId: caseId,
    currentActionId: actionId,
  });
  assert(preserved.state === "preserved-explicit-inner" &&
    preserved.inject === false &&
    preserved.preserve === true &&
    preserved.correlationId === innerCorrelationId &&
    JSON.stringify(preserved).includes(innerCorrelationId) === false,
  "registered explicit inner correlation was not byte-preserved or leaked into safe evidence");

  const expectRejected = (label, overrides, failureCode) => {
    let observed = "";
    try {
      resolveRequestCorrelationPrecedence({
        headerEntries: [{ name: "x-media-server-correlation-id", value: innerCorrelationId }],
        outerCorrelationId,
        outerInjectionEnabled: true,
        correlationAllowed: true,
        registration,
        currentCaseId: caseId,
        currentActionId: actionId,
        ...overrides,
      });
    } catch (error) {
      observed = String(error?.failureCode || "");
      assert(!JSON.stringify(error?.safeEvidence || {}).includes(innerCorrelationId),
        `${label} rejection leaked raw correlation`);
    }
    assert(observed === failureCode,
      `${label} explicit correlation did not fail closed: ${observed}`);
  };
  expectRejected("unregistered", { registration: null },
    "EXPLICIT_CORRELATION_UNREGISTERED");
  expectRejected("stale registration", {
    registration: { ...registration, active: false },
  }, "EXPLICIT_CORRELATION_UNREGISTERED");
  expectRejected("wrong action", { currentActionId: `${actionId}:other` },
    "EXPLICIT_CORRELATION_ACTION_MISMATCH");
  expectRejected("wrong case", { currentCaseId: "EVT-026" },
    "EXPLICIT_CORRELATION_CASE_MISMATCH");
  expectRejected("outer scope changed", { outerCorrelationId: `${outerCorrelationId}:stale` },
    "EXPLICIT_CORRELATION_OUTER_SCOPE_MISMATCH");
  expectRejected("wrong explicit value", {
    headerEntries: [{ name: "x-media-server-correlation-id", value: `${innerCorrelationId}:wrong` }],
  }, "EXPLICIT_CORRELATION_VALUE_MISMATCH");
  expectRejected("duplicate header", {
    headerEntries: [
      { name: "x-media-server-correlation-id", value: innerCorrelationId },
      { name: "X-Media-Server-Correlation-Id", value: innerCorrelationId },
    ],
  }, "CORRELATION_HEADER_DUPLICATE");

  registration.active = false;
  expectRejected("inner after scope end", { registration },
    "EXPLICIT_CORRELATION_UNREGISTERED");
  const nextOuter = resolveRequestCorrelationPrecedence({
    headerEntries: [],
    outerCorrelationId,
    outerInjectionEnabled: true,
    correlationAllowed: true,
    registration: null,
    currentCaseId: caseId,
    currentActionId: `${caseId}:next-action`,
  });
  assert(nextOuter.state === "injected-outer" &&
    nextOuter.correlationId === outerCorrelationId &&
    nextOuter.correlationId !== innerCorrelationId,
  "inner correlation leaked into the next outer request");

  for (const snippet of [
    "activeExplicitCorrelationRegistration",
    "explicitCorrelationScopeSequence",
    "request.headersArray()",
    'state: "preserved-explicit-inner"',
    'state: "injected-outer"',
    "correlationRouteFailures",
    "explicitRegistration.active = false",
    "activeExplicitCorrelationRegistration = null",
  ]) {
    assert(adapterSource.includes(snippet),
      `explicit correlation registry lifecycle missing ${snippet}`);
  }
});

check("Playwright response events bind only to the exact initiating request object", () => {
  const firstRequest = {};
  const secondRequest = {};
  const registry = createCaseOwnedRequestIdentityRegistry({
    caseId: "EVT-004",
  });
  const firstIdentity = registry.registerPlaywrightRequest(firstRequest);
  const secondIdentity = registry.registerPlaywrightRequest(secondRequest);
  const pendingRequests = new Map([
    [firstRequest, firstIdentity],
    [secondRequest, secondIdentity],
  ]);
  const firstBinding = bindPlaywrightResponseToInitiatingRequest(
    { request: () => firstRequest },
    pendingRequests,
    registry,
  );
  const secondBinding = bindPlaywrightResponseToInitiatingRequest(
    { request: () => secondRequest },
    pendingRequests,
    registry,
  );
  const missingBinding = bindPlaywrightResponseToInitiatingRequest(
    { request: () => ({}) },
    pendingRequests,
    registry,
  );
  assert(firstBinding.request === firstRequest &&
    firstBinding.initiatingRequest === firstIdentity &&
    secondBinding.request === secondRequest &&
    secondBinding.initiatingRequest === secondIdentity,
  "response event did not retain exact Playwright request object identity");
  assert(missingBinding.initiatingRequest === null,
    "method/path-equivalent request object was accepted without identity");
});

check("document form responses bind exact request identity and redirect chain", () => {
  const request = {
    phase: "request-start",
    requestId: "native-request-1",
    caseRequestIdentity: "UI-002:request-1",
    caseRequestSequence: 1,
    requestKind: "document-navigation",
    resourceType: "document",
    sameOrigin: true,
    ledgerOwner: "action",
    sourceOwner: "explicit-action-registration",
    ownerPhase: "primary-action",
    initiatorActionId: "UI-002:submit-form",
    requestOwnershipKind: "primary-action",
    redirectedFromRequestId: "",
    correlationId: "",
    method: "POST",
    status: 0,
    url: "http://127.0.0.1:8081/setup",
  };
  const response = {
    phase: "response",
    requestId: request.requestId,
    caseRequestIdentity: request.caseRequestIdentity,
    caseRequestSequence: request.caseRequestSequence,
    responseRequestObjectObserved: true,
    requestIdentitySource: "playwright-response-request",
    requestKind: "document-navigation",
    resourceType: "document",
    sameOrigin: true,
    ledgerOwner: "action",
    sourceOwner: "explicit-action-registration",
    ownerPhase: "primary-action",
    initiatorActionId: request.initiatorActionId,
    requestOwnershipKind: request.requestOwnershipKind,
    correlationId: "",
    method: "POST",
    status: 302,
    url: "http://127.0.0.1:8081/setup",
    responseLocationPath: "/login",
  };
  const redirectRequest = {
    ...request,
    requestId: "native-request-2",
    caseRequestIdentity: "UI-002:request-2",
    caseRequestSequence: 2,
    redirectedFromRequestId: request.requestId,
    method: "GET",
    url: "http://127.0.0.1:8081/login",
    ledgerOwner: "page",
    sourceOwner: "document-navigation-ledger",
    ownerPhase: "document-navigation-chain",
    initiatorActionId: "",
    requestOwnershipKind: "document-navigation-chain",
  };
  const redirectResponse = {
    ...response,
    requestId: redirectRequest.requestId,
    caseRequestIdentity: redirectRequest.caseRequestIdentity,
    caseRequestSequence: redirectRequest.caseRequestSequence,
    method: "GET",
    status: 200,
    url: redirectRequest.url,
    responseLocationPath: "",
    ledgerOwner: "page",
    sourceOwner: "document-navigation-ledger",
    ownerPhase: "document-navigation-chain",
    initiatorActionId: "",
    requestOwnershipKind: "document-navigation-chain",
  };
  const entries = [request, response, redirectRequest, redirectResponse];
  const binding = bindDocumentFormSubmission(entries, {
    method: "POST",
    path: "/setup",
    allowedStatuses: [302],
    expectedRedirectPath: "/login",
  });
  assert(binding.requestId === request.requestId &&
    binding.caseRequestIdentity === request.caseRequestIdentity &&
    binding.redirectCount === 1 &&
    binding.redirectPath === "/login" &&
    binding.initiatorActionId === request.initiatorActionId &&
    binding.requestOwnershipKind === "primary-action" &&
    binding.correlationObserved === false,
  "exact document form response binding did not pass");

  const expectRejected = (label, nextEntries, overrides = {}) => {
    let failed = false;
    try {
      bindDocumentFormSubmission(nextEntries, {
        method: "POST",
        path: "/setup",
        allowedStatuses: [302],
        expectedRedirectPath: "/login",
        ...overrides,
      });
    } catch {
      failed = true;
    }
    assert(failed, `${label} document form submission was accepted`);
  };
  expectRejected("duplicate submit", [...entries, { ...request, requestId: "native-request-3" }]);
  expectRejected("reload/reissue", [...entries, {
    ...redirectRequest,
    requestId: "native-request-3",
    caseRequestIdentity: "UI-002:request-3",
    caseRequestSequence: 3,
    redirectedFromRequestId: "",
    url: "http://127.0.0.1:8081/setup",
  }]);
  expectRejected("different response request object", entries.map(entry =>
    entry === response ? { ...entry, requestId: "native-request-other" } : entry));
  expectRejected("correlated document request", entries.map(entry =>
    entry === request ? { ...entry, correlationId: "forbidden" } : entry));
  expectRejected("wrong action owner", entries.map(entry =>
    entry === response ? { ...entry, initiatorActionId: "OTHER:action" } : entry));
  expectRejected("wrong method", entries, { method: "PUT" });
  expectRejected("wrong path", entries, { path: "/other" });
  expectRejected("wrong status", entries.map(entry =>
    entry === response ? { ...entry, status: 200 } : entry));
  expectRejected("unexpected redirect target", entries, { expectedRedirectPath: "/ops/home" });

  const rejected = bindDocumentFormSubmission([
    { ...request, caseRequestIdentity: "AUTH-007:request-1", url: "http://127.0.0.1:8081/login" },
    {
      ...response,
      caseRequestIdentity: "AUTH-007:request-1",
      status: 403,
      url: "http://127.0.0.1:8081/login",
      responseLocationPath: "",
    },
  ], {
    method: "POST",
    path: "/login",
    allowedStatuses: [403],
    expectedRedirectPath: null,
  });
  assert(rejected.status === 403 && rejected.redirectCount === 0,
    "non-redirect document form rejection binding did not pass");
});

check("fixture responses use an exact opaque initiating request handle", () => {
  const registry = createCaseOwnedRequestIdentityRegistry({
    caseId: "EVT-004",
    requestIdPrefix: "fixture-request",
  });
  const firstHandle = {};
  const otherHandle = {};
  const firstIdentity = registry.registerFixtureRequestHandle(firstHandle);
  const otherIdentity = registry.registerFixtureRequestHandle(otherHandle);
  const exact = bindFixtureResponseToInitiatingRequest(
    { initiatingRequestHandle: firstHandle },
    registry,
  );
  const wrong = bindFixtureResponseToInitiatingRequest(
    { initiatingRequestHandle: {} },
    registry,
  );
  const missing = bindFixtureResponseToInitiatingRequest({}, registry);
  assert(firstIdentity.caseRequestIdentity === "EVT-004:request-1" &&
    firstIdentity.caseRequestSequence === 1 &&
    otherIdentity.caseRequestIdentity === "EVT-004:request-2" &&
    otherIdentity.caseRequestSequence === 2 &&
    exact.initiatingRequest === firstIdentity,
  "fixture response did not resolve the registered initiating handle");
  assert(wrong.initiatingRequest === null && missing.initiatingRequest === null,
    "fixture response accepted a different or missing initiating handle");
  let duplicateRejected = false;
  try {
    registry.registerFixtureRequestHandle(firstHandle);
  } catch (error) {
    duplicateRejected = error?.message === "duplicate fixture request handle";
  }
  assert(duplicateRejected, "duplicate fixture request handle was accepted");
  let stringRejected = false;
  try {
    registry.registerFixtureRequestHandle("arbitrary-request-id");
  } catch (error) {
    stringRejected = error?.message?.includes("opaque object handle");
  }
  assert(stringRejected, "arbitrary string request ID was trusted as fixture identity");
});

check("whoami observation keeps setup-required and unauthorized sessions anonymous", () => {
  const unauthenticatedBranches = adapterBrowserSource.match(/principal\?\.authenticated === false/g) || [];
  assert(unauthenticatedBranches.length === 2,
    `setup-required anonymous handling must cover requested/observed and visual capture: ${unauthenticatedBranches.length}`);
  assert(/if \(response\.status === 401\) \{\s+accountRole = ["']anonymous["'];/.test(adapterBrowserSource) &&
    /if \(principal\?\.authenticated === false\) \{\s+accountRole = ["']anonymous["'];/.test(adapterBrowserSource),
  "whoami observation does not distinguish 401 and setup-required unauthenticated principals");
  assert(/principal\?\.authenticated === true && typeof principal\?\.role === ["']string["']/.test(adapterBrowserSource),
    "authenticated whoami observation no longer requires an exact role");
});

check("native browser child strips acceptance secrets", () => {
  const env = secretStrippedBrowserEnv({
    SAFE_VALUE: "preserved",
    MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD: "contract-admin-secret",
    MEDIA_SERVER_V390_UI_ROLE_SECRETS: "contract-role-secrets",
  });
  assert(env.SAFE_VALUE === "preserved", "browser child stripped an unrelated environment value");
  assert(!("MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD" in env), "browser child inherited the admin secret");
  assert(!("MEDIA_SERVER_V390_UI_ROLE_SECRETS" in env), "browser child inherited the role-secret JSON");
  assert(adapterSource.includes("env: secretStrippedBrowserEnv()"),
    "Playwright Chromium launch is not bound to the stripped environment");
});

check("issued invite tokens are registered and redacted at every evidence boundary", () => {
  for (const snippet of [
    "onRuntimeSecret",
    'kind: "issued-invite-token"',
    "invite response runtime secret sink is unavailable",
    "safeResponseReadFailures",
    "redactObservedSecrets",
    "assertEvidenceDomSecretsAbsent",
    "bindBrowserConsoleResponseMessages(consoleEntries, networkEntries)",
    "sanitizeEvidenceValue(networkEntries",
    "persistentSecretFieldsPresent",
  ]) {
    assert(adapterSource.includes(snippet), `adapter invite secret boundary missing: ${snippet}`);
  }
  for (const snippet of [
    "caseRuntime.registerObservedSecret",
    "browser.registerRuntimeSecret",
    "runtimeSecretRedaction",
    "issued invite token was not registered or remained in the evidence DOM",
  ]) {
    assert(exactRunnerSource.includes(snippet), `exact runner invite secret binding missing: ${snippet}`);
  }
  for (const snippet of [
    "registerObservedSecret",
    "issued-invite-token",
    "raw issued invite token reached the authoritative store",
    "forbiddenSecretAbsent",
  ]) {
    assert(caseRuntimeSource.includes(snippet), `runtime invite secret oracle missing: ${snippet}`);
  }
});

check("endpoint-owned response fixtures cover the product response fields", () => {
  for (const field of [
    "username", "displayName", "role", "enabled", "scopesCount", "scopes",
    "mustChangePassword", "failedLoginCount", "lockedUntil", "lastFailedLoginAt",
    "lastLoginAt", "lastLoginIp", "createdAt", "passwordUpdatedAt", "disabledAt",
  ]) {
    assert(authProductSource.includes(`\\\"${field}\\\"`), `AppendPublicUserJson field missing: ${field}`);
  }
  for (const field of [
    "sourceId", "displayName", "kind", "enabled", "tags", "ownerGroup", "site",
    "group", "floor", "zone", "canonicalSourceKey", "file", "rtspUrl",
    "webrtcSourceId", "whepUrl", "httpUrl", "viewId", "defaultRuleId",
    "allowedRuleIds", "allowedOverlayModes", "showDashboard", "showEvents",
    "showMetadataSummary", "clientGroups", "maxTiles",
  ]) {
    assert(registryProductSource.includes(`\\\"${field}\\\"`) ||
      registryProductSource.includes(`"${field}"`),
    `source/view product field missing: ${field}`);
  }
  for (const field of [
    "previewContract", "selectedProfile", "credentialGate", "sourceDraft",
    "publishedViewDraft", "credentialMaterialIncluded", "credentialReferenceStatus",
    "secretMaterialStored", "urlCredentialsRejected", "draftApiOmitsCredentialRef",
  ]) {
    assert(onvifProductSource.includes(`\\\"${field}\\\"`), `ONVIF product field missing: ${field}`);
  }
});

check("endpoint-owned full product responses are projected only through the Playwright response listener", async () => {
  const cases = [
    ["POST", "/ops/api/users/auth-020-fixture/disable", 200,
      fullAuthDisableResponse(),
      { status: "disabled", user: { username: "auth-020-fixture", enabled: false } }],
    ["POST", "/ops/api/sources", 201,
      fullSourceResponse("src-008-fixture", true, "created"),
      { ok: true, source: { sourceId: "src-008-fixture", enabled: true } }],
    ["DELETE", "/ops/api/sources/src-010-fixture", 200,
      fullSourceResponse("src-010-fixture", false, "disabled"),
      { ok: true, status: "disabled", source: { sourceId: "src-010-fixture", enabled: false } }],
    ["DELETE", "/ops/api/views/src-019-fixture", 200,
      fullViewDisableResponse(),
      { ok: true, status: "disabled", view: { viewId: "src-019-fixture", sourceId: "src-019-fixture", enabled: false } }],
    ["POST", "/ops/api/onvif/import-draft", 200, fullOnvifDraftResponse(), {
      ok: true,
      credentialGate: {
        schema: "media-server.onvif-credential-binding-gate.v1",
        requiredScope: "source:write",
        primaryStoreProvider: "none",
        primaryStoreDecision: "defer-product-persistent-store",
        credentialReferenceStatus: "reference-present-redacted",
        urlCredentialsRejected: true,
        secretMaterialStored: false,
      },
      sourceDraft: { sourceId: "src-031-source", enabled: true },
      publishedViewDraft: { viewId: "src-031-view", sourceId: "src-031-source", enabled: true },
    }],
    ["POST", "/ops/api/alerts/deliveries/dry-run", 200, fullAlertDeliveryDryRunResponse(), {
      status: "ops-alert-delivery-dry-run",
      schema: "media-server.ops.alert-delivery-dry-run.v1",
      dryRun: true,
      externalDeliveryPerformed: false,
      eventPostPayloadChanged: false,
      auditAction: "alert-delivery-dry-run",
      payloadPreview: {
        schema: "media-server.ops.alert-delivery-payload-preview.v1",
        deliveryId: "evt-038-review4-fixture",
        eventId: "evt-038-runtime-event",
        eventType: "intrusion",
        sourceId: "sample",
        payloadRedacted: true,
      },
      attempt: {
        schema: "media-server.ops.alert-delivery-attempt.v1",
        deliveryId: "evt-038-review4-fixture",
        eventId: "evt-038-runtime-event",
        eventType: "intrusion",
        sourceId: "sample",
        status: "dry-run",
        transport: "dry-run",
        dryRun: true,
        externalDeliveryPerformed: false,
        eventPostPayloadChanged: false,
      },
    }],
  ];
  for (const [method, pathname, status, payload, expected] of cases) {
    const observed = await captureListenerProjection({ method, pathname, status, payload });
    assert(observed.failures.length === 0, `${method} ${pathname} projection failed: ${observed.failures.join(",")}`);
    assert(observed.entry.safeResponseProjectionSource === "playwright-response-json",
      `${method} ${pathname} projection provenance missing`);
    assert(JSON.stringify(observed.entry.safeResponseBody) === JSON.stringify(expected),
      `${method} ${pathname} safe projection drift`);
    assert(!/profile-live-main|rtsp:\/\/|mustChangePassword|passwordUpdatedAt|canonicalSourceKey/.test(
      JSON.stringify(observed.entry.safeResponseBody)),
      `${method} ${pathname} persisted sensitive response material`);
  }
});

check("Ops timeline response projection preserves only safe EventRecord identity", async () => {
  const pending = new Set();
  const failures = [];
  const entry = { status: 200 };
  const request = {
    method: () => "GET",
  };
  const response = {
    request: () => request,
    url: () => "http://runtime.invalid/ops/api/events/status?limit=5&includeArchives=1",
    json: async () => ({
      status: "ops-events",
      records: {
        matchedRecords: 1,
        total: 1,
        records: [{
          eventId: "evt-023-review4-fixture",
          eventType: "presence",
          status: "open",
          summary: "not-retained",
        }],
      },
    }),
  };
  const read = captureOpsIncidentTimelineResponseProjection({
    response,
    entry,
    pendingSafeResponseReads: pending,
    safeResponseReadFailures: failures,
  });
  assert(read, "Ops timeline response did not enter the safe projection");
  await read;
  assert(failures.length === 0 && pending.size === 0 &&
    entry.safeResponseProjectionSource === "playwright-response-json" &&
    entry.safeResponseProjectionKind === "ops-incident-timeline-event-records" &&
    entry.safeResponseForbiddenMaterialObserved === false &&
    entry.safeResponseBody?.records?.records?.[0]?.eventId ===
      "evt-023-review4-fixture" &&
    !JSON.stringify(entry.safeResponseBody).includes("not-retained"),
  "Ops timeline safe response projection drift");

  const rejectedEntry = { status: 200 };
  const rejectedFailures = [];
  const rejected = captureOpsIncidentTimelineResponseProjection({
    response: {
      ...response,
      json: async () => ({
        records: {
          matchedRecords: 1,
          total: 1,
          records: [{
            eventId: "evt-023-review4-fixture",
            eventType: "presence",
            status: "open",
            sourceUrl: "forbidden",
          }],
        },
      }),
    },
    entry: rejectedEntry,
    pendingSafeResponseReads: new Set(),
    safeResponseReadFailures: rejectedFailures,
  });
  await rejected;
  assert(rejectedFailures.length === 1 && !rejectedEntry.safeResponseBody,
    "Ops timeline forbidden response material did not fail closed");
});

check("client WebRTC session responses retain only the safe protocol completion shape", async () => {
  const rawOffer = "v=0\r\no=- raw-offer-must-not-reach-evidence 1 1 IN IP4 127.0.0.1\r\n";
  const rawSecret = "client-session-secret-must-not-reach-evidence";
  const cases = [
    ["POST", "/client/api/views/view-019/webrtc/session", 200,
      { sessionId: "client-session-019", clientSessionId: "client-session-019", offer: rawOffer, sessionToken: rawSecret },
      { sessionId: "client-session-019", offerReceived: true }, "client-live-session-create"],
    ["POST", "/client/api/views/view-019/webrtc/session/client-session-019/answer", 200,
      { ok: true, answerSdp: rawOffer, sessionToken: rawSecret },
      { ok: true }, "client-live-session-answer"],
    ["DELETE", "/client/api/views/view-020/webrtc/session/client-session-020", 200,
      { ok: true, offer: rawOffer, sessionToken: rawSecret },
      { ok: true }, "client-live-session-delete"],
  ];
  for (const [method, pathname, status, payload, expected, kind] of cases) {
    const observed = await captureListenerProjection({ method, pathname, status, payload });
    assert(observed.failures.length === 0, `${kind} projection failed: ${observed.failures.join(",")}`);
    assert(observed.entry.safeResponseProjectionSource === "playwright-response-json",
      `${kind} projection provenance missing`);
    assert(observed.entry.safeResponseProjectionKind === kind,
      `${kind} projection kind missing`);
    assert(JSON.stringify(observed.entry.safeResponseBody) === JSON.stringify(expected),
      `${kind} safe response projection drift`);
    assert(!JSON.stringify(observed.entry).includes(rawOffer) && !JSON.stringify(observed.entry).includes(rawSecret),
      `${kind} retained raw WebRTC response material`);
  }
});

check("client WebRTC session projections reject wrong status and malformed success shapes", async () => {
  const cases = [
    ["POST", "/client/api/views/view-019/webrtc/session", 409, { error: "raw failure body" }, "client-live-session-create"],
    ["POST", "/client/api/views/view-019/webrtc/session/client-session-019/answer", 200, { ok: false }, "client-live-session-answer"],
    ["DELETE", "/client/api/views/view-020/webrtc/session/client-session-020", 200, { ok: "true" }, "client-live-session-delete"],
  ];
  for (const [method, pathname, status, payload, kind] of cases) {
    const observed = await captureListenerProjection({ method, pathname, status, payload });
    const failure = formatSafeResponseReadFailure(observed.failures);
    assert(observed.failures.length === 1 && !observed.entry.safeResponseBody,
      `${kind} malformed response did not fail closed`);
    assert(failure.includes(kind) && failure.includes(`${method} ${pathname}`),
      `${kind} redacted method/path diagnostic missing: ${failure}`);
    assert(!failure.includes("raw failure body") && !JSON.stringify(observed.entry).includes("raw failure body"),
      `${kind} error body leaked through diagnostics`);
  }
});

check("endpoint-owned non-success responses fail before success-shape projection with redacted status diagnostics", async () => {
  const cases = [
    ["POST", "/ops/api/users/auth-020-fixture/disable", 403, 200],
    ["POST", "/ops/api/sources", 409, 201],
    ["DELETE", "/ops/api/sources/src-010-fixture", 409, 200],
    ["DELETE", "/ops/api/views/src-019-fixture", 403, 200],
    ["POST", "/ops/api/onvif/import-draft", 409, 200],
    ["POST", "/ops/api/alerts/deliveries/dry-run", 409, 200],
  ];
  for (const [method, pathname, status, expectedStatus] of cases) {
    const observed = await captureListenerProjection({
      method,
      pathname,
      status,
      payload: { ok: false, error: "contract error body must not be projected", source: null },
    });
    const failure = formatSafeResponseReadFailure(observed.failures);
    assert(observed.jsonReadCount === 0, `${method} ${pathname} parsed an error response body`);
    assert(observed.failures.length === 1 && !observed.entry.safeResponseBody,
      `${method} ${pathname} non-success response did not fail closed`);
    assert(failure.includes(`expected status ${expectedStatus}`) && failure.includes(`actual status ${status}`),
      `${method} ${pathname} expected/actual status diagnostic missing: ${failure}`);
    assert(!failure.includes("contract error body") && !failure.includes("source is missing"),
      `${method} ${pathname} error body was replaced by or leaked through a success-shape diagnostic`);
  }
});

check("endpoint-owned sensitive response fields fail closed with redacted field-path diagnostics", async () => {
  const forbiddenValue = "contract-secret-value-that-must-not-appear";
  const cases = [
    ["auth-user-disable", "POST", "/ops/api/users/auth-020-fixture/disable", 200,
      withField(fullAuthDisableResponse(), ["user", "passwordHash"], forbiddenValue), "user.passwordHash"],
    ["source-create", "POST", "/ops/api/sources", 201,
      withField(fullSourceResponse("src-008-fixture", true, "created"), ["source", "rtspUrl"],
        `rtsp://user:${forbiddenValue}@camera.invalid/live`), "source.rtspUrl"],
    ["source-disable", "DELETE", "/ops/api/sources/src-010-fixture", 200,
      withField(fullSourceResponse("src-010-fixture", false, "disabled"), ["source", "tokenHash"], forbiddenValue),
      "source.tokenHash"],
    ["view-disable", "DELETE", "/ops/api/views/src-019-fixture", 200,
      withField(fullViewDisableResponse(), ["view", "secret"], forbiddenValue), "view.secret"],
    ["onvif-import-draft", "POST", "/ops/api/onvif/import-draft", 200,
      withField(fullOnvifDraftResponse(), ["credentialGate", "secretMaterialStored"], true),
      "credentialGate.secretMaterialStored"],
  ];
  for (const [kind, method, pathname, status, payload, fieldPath] of cases) {
    const observed = await captureListenerProjection({ method, pathname, status, payload });
    assert(observed.failures.length === 1 && !observed.entry.safeResponseBody,
      `${kind} sensitive endpoint response did not fail closed`);
    const failure = formatSafeResponseReadFailure(observed.failures);
    assert(failure.includes(`[${kind}] ${method} ${pathname}`) && failure.includes(fieldPath),
      `${kind} redacted endpoint/field-path diagnostic missing: ${failure}`);
    assert(!failure.includes(forbiddenValue) && !JSON.stringify(observed.entry).includes(forbiddenValue),
      `${kind} diagnostic or evidence retained sensitive response material`);
  }
});

check("AUTH public lifecycle fields accept exact public types and reject type drift", async () => {
  const cases = [
    [withField(fullAuthDisableResponse(), ["user", "mustChangePassword"], "false"), "user.mustChangePassword"],
    [withField(fullAuthDisableResponse(), ["user", "passwordUpdatedAt"], 123), "user.passwordUpdatedAt"],
  ];
  for (const [payload, fieldPath] of cases) {
    const observed = await captureListenerProjection({
      method: "POST",
      pathname: "/ops/api/users/auth-020-fixture/disable",
      status: 200,
      payload,
    });
    const failure = formatSafeResponseReadFailure(observed.failures);
    assert(observed.failures.length === 1 && !observed.entry.safeResponseBody && failure.includes(fieldPath),
      `AUTH lifecycle type drift did not fail closed for ${fieldPath}`);
  }
});

check("live session evidence preserves request view and response session identity", () => {
  const correlationId = "visual-live:session";
  const entries = [
    { phase: "request-start", requestId: "request-1", correlationId, method: "POST", url: "http://127.0.0.1/client/api/views/view-b/webrtc/session", requestBody: { overlayMode: "va-overlay" } },
    { phase: "response", requestId: "request-1", correlationId, method: "POST", status: 200, url: "http://127.0.0.1/client/api/views/view-b/webrtc/session", safeResponseBody: { sessionId: "session-b", offerReceived: true } },
    { phase: "request-start", requestId: "request-2", correlationId, method: "POST", url: "http://127.0.0.1/client/api/views/view-b/webrtc/session/session-b/answer" },
    { phase: "response", requestId: "request-2", correlationId, method: "POST", status: 200, url: "http://127.0.0.1/client/api/views/view-b/webrtc/session/session-b/answer", safeResponseBody: { ok: true } },
  ];
  const evidence = buildLiveSessionEvidence(entries, correlationId, "tile-0:view-a", "view-a");
  assert(evidence.tileViewId === "view-a", "tile view identity missing");
  assert(evidence.requestViewId === "view-b" && evidence.answerViewId === "view-b", "request view was overwritten by tile view");
  assert(evidence.responseSessionId === "session-b" && evidence.answerSessionId === "session-b", "response/answer session identity missing");
  assert(evidence.offerReceived === true, "safe offer response evidence missing");
  assert(entries[3].safeResponseBody.ok === true, "safe answer response evidence missing");
});

check("visual focus sampling preserves exact DOM identity and stops before a repeated owner", async () => {
  const observed = [
    { focusIdentity: "#first", visible: true },
    { focusIdentity: "button:nth-of-type(2)", visible: true },
    { focusIdentity: "#first", visible: true },
  ];
  let cursor = 0;
  const samples = await collectUniqueFocusSamples({
    pressTab: async () => {},
    observeFocus: async index => ({ index, ...observed[cursor++] }),
    maxSteps: 8,
  });
  assert(JSON.stringify(samples.map(item => item.focusIdentity)) ===
    JSON.stringify(["#first", "button:nth-of-type(2)"]),
  "focus sampler retained a repeated DOM owner");
});

check("live visual sampling keeps serializable video evidence separate from the DOM element", () => {
  assert(adapterSource.includes("videoEvidence:"),
    "live visual sample does not expose a serializable video evidence field");
  assert(adapterSource.includes("videoElement:"),
    "live visual sample does not retain a private video DOM element field");
  assert(!/genericDomOverlays:[\s\S]{0,500}\n\s*video,\n\s*\};/.test(adapterSource),
    "live visual sample still overwrites serialized video evidence with a DOM node");
});

check("live visual capture scrolls the target and tile union by the minimum bounded delta", () => {
  assert(visualEvidenceScrollDelta({ top: 341, bottom: 683 }, { top: 707, bottom: 897.125 }, 844) === 53.125,
    "live target/tile union did not use the minimum lower-edge correction");
  assert(visualEvidenceScrollDelta({ top: 20, bottom: 200 }, { top: 210, bottom: 500 }, 844) === 0,
    "already contained live evidence requested a scroll");
  assert(visualEvidenceScrollDelta({ top: 0, bottom: 900 }, { top: 910, bottom: 1200 }, 844) === 0,
    "oversized target/tile union must remain fail-closed instead of manufacturing containment");
});

check("browser resource console errors bind one exact Playwright response and fail closed on duplicates", () => {
  const message = {
    kind: "console",
    level: "error",
    text: "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
    location: { url: "http://localhost/auth/whoami", lineNumber: 0, columnNumber: 0 },
    observedAtMs: 20,
  };
  const response = {
    phase: "response",
    requestId: "request-1",
    caseRequestIdentity: "UI-002:request-1",
    caseRequestSequence: 1,
    responseRequestObjectObserved: true,
    requestIdentitySource: "playwright-response-request",
    requestKind: "application-fetch",
    sameOrigin: true,
    method: "GET",
    status: 401,
    url: "http://localhost/auth/whoami",
    responseObservedAtMs: 10,
  };
  const bound = bindBrowserConsoleResponseMessages([message], [response]);
  assert(bound[0].responseBinding?.requestId === "request-1" &&
    bound[0].responseBinding?.caseRequestIdentity === "UI-002:request-1",
  "resource console message lost exact response identity");
  const duplicate = bindBrowserConsoleResponseMessages([message], [
    response,
    { ...response, requestId: "request-2", caseRequestIdentity: "UI-002:request-2" },
  ]);
  assert(duplicate[0].responseBinding === null && duplicate[0].responseBindingCandidateCount === 2,
    "ambiguous resource response binding selected an arbitrary response");
});

check("UI runner selects native Playwright and rejects CDP promotion", () => {
  for (const snippet of [
    "createNativePlaywrightAdapter",
    'engine: "playwright-native"',
    "Chrome/CDP fallback is not accepted as Playwright PASS",
    "playwrightModulePath",
  ]) {
    assert((runnerSource + "\n" + adapterSource).includes(snippet), `runner native integration missing ${snippet}`);
  }
});

check("server dispatch and docs expose reproducible native commands", () => {
  for (const command of ["verify-v390-ui-native-adapter", "verify-v390-ui-native-adapter-contract"]) {
    assert(serverSh.includes(command), `server.sh missing ${command}`);
    assert(docs.includes(command), `docs missing ${command}`);
  }
  for (const snippet of ["V390-ADD1-08", "playwright-native", "wait/click/fill/select/screenshot"]) {
    assert(docs.includes(snippet), `docs missing ${snippet}`);
  }
});

check("preserved standalone evidence proves native actions", () => {
  const summaryPath = path.join(rootDir, "docs/release-artifacts/v3.9.0/ui-native-adapter-final/summary.json");
  assert(fs.existsSync(summaryPath), "native adapter summary missing");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  assert(summary.schema === "media-server.v390-ui-native-adapter.v1", "native adapter schema mismatch");
  assert(summary.result === "PASS", "native adapter result must PASS");
  assert(summary.selectedAdapter?.engine === "playwright-native", "native engine not selected");
  assert(summary.selectedAdapter?.fallbackUsed === false, "fallback must be false");
  for (const kind of ["wait", "fill", "type", "select", "click", "screenshot"]) {
    assert(summary.actions.some(action => action.kind === kind && action.status === "PASS"), `missing PASS action ${kind}`);
  }
  assert(summary.finalState === "native-adapter:ready:typed", "native final state mismatch");
  const artifactNames = {
    screenshotPath: "native-adapter.png",
    tracePath: "trace.json",
  };
  for (const [field, expectedName] of Object.entries(artifactNames)) {
    assert(path.basename(String(summary[field] || "")) === expectedName,
      `native artifact identity drifted ${field}`);
    const artifactPath = path.join(path.dirname(summaryPath), expectedName);
    assert(fs.existsSync(artifactPath), `native artifact missing ${field}`);
  }
  const screenshot = fs.readFileSync(path.join(path.dirname(summaryPath), artifactNames.screenshotPath));
  assert(screenshot.length > 8 && screenshot.subarray(0, 8).equals(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "native screenshot is not a PNG artifact");
  const trace = JSON.parse(fs.readFileSync(
    path.join(path.dirname(summaryPath), artifactNames.tracePath), "utf8"));
  assert(trace.schema === "media-server.v390-ui-native-adapter-trace.v1",
    "native adapter trace schema mismatch");
});

check("current UI suite state does not reuse stale native evidence", () => {
  const statePath = path.join(rootDir, "test/fixtures/v390_ui_current_evidence_state.json");
  assert(fs.existsSync(statePath), "current UI evidence state missing");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  assert(state.status === "not-run" && state.actualBrowserExecution === false,
    "current UI evidence state must be explicit not-run");
  assert(state.automatedCaseCount === 0 && state.uiFulltestPass === false,
    "current UI evidence state invented suite PASS");
});

check("dashboard marker response projection keeps only digests and fails closed", async () => {
  const marker = "REVIEW4-EVT-004-LOG-MARKER";
  const probe = {
    armed: true,
    marker,
    method: "GET",
    urlPath: "/ops/api/diagnostics/log-tail?limit=80",
    ownedNoisePrefix: "[review4-noise] EVT-004-OWNED-",
    captures: [],
    readFailureCount: 0,
  };
  const pending = new Set();
  const failures = [];
  const read = captureDiagnosticMarkerResponseProjection({
    response: {
      json: async () => ({
        lines: [
          ...Array.from({ length: 79 }, (_, index) =>
            `[review4-noise] EVT-004-OWNED-${String(index).padStart(3, "0")}`),
          `[review4] auth incident ${marker} password=redacted`,
        ],
      }),
    },
    entry: {
      requestId: "native-request-80",
      caseRequestIdentity: "EVT-004:request-80",
      caseRequestSequence: 80,
      responseRequestObjectObserved: true,
      method: "GET",
      status: 200,
      url: "http://runtime.invalid/ops/api/diagnostics/log-tail?limit=80",
    },
    probe,
    pendingSafeResponseReads: pending,
    safeResponseReadFailures: failures,
  });
  assert(read, "dashboard marker response did not enter the safe projection");
  await read;
  const evidence = buildDiagnosticMarkerResponseStageEvidence(probe);
  assert(evidence.pass === true &&
    evidence.responseCandidateCount === 1 &&
    evidence.markerCount === 1 &&
    evidence.responseRequestObjectObserved === true &&
    evidence.lineCount === 80 &&
    evidence.markerResponseIndex === 79 &&
    evidence.markerReverseIndex === 0 &&
    evidence.rendererLogSelectedIndex === 0 &&
    evidence.ownedNoiseCount === 79,
  "dashboard marker response projection did not preserve exact safe identity");
  const serialized = JSON.stringify(evidence);
  assert(!serialized.includes(marker) &&
    !serialized.includes("[review4]") &&
    !serialized.includes("password="),
  "dashboard marker response projection retained raw response material");
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    await item.fn();
    pass += 1;
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
console.log("");
console.log("== v3.9.0 native UI adapter contract summary ==");
console.log(`- capabilities: ${nativeCapabilities.join(",")}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function callbackSource(eventName, nextEventName) {
  const start = adapterSource.indexOf(`page.on("${eventName}"`);
  assert(start >= 0, `${eventName} callback source is missing`);
  if (nextEventName === null) return adapterSource.slice(start,
    adapterSource.indexOf("requestListenersInstalled = true", start));
  const end = adapterSource.indexOf(`page.on("${nextEventName}"`, start);
  assert(end > start, `${eventName} callback source boundary is missing`);
  return adapterSource.slice(start, end);
}

function countToken(source, token) {
  return source.split(token).length - 1;
}

function fakeLifecycleRequest(url, {
  method = "GET",
  resourceType = "fetch",
  navigation = false,
  redirectedFrom = null,
} = {}) {
  return {
    method: () => method,
    url: () => url,
    resourceType: () => resourceType,
    isNavigationRequest: () => navigation,
    redirectedFrom: () => redirectedFrom,
  };
}

function fakeLifecycleResponse(request, status = 200) {
  return { request: () => request, status: () => status };
}

function assertSelectorOwnerEvidence(evidence, {
  candidateCount,
  requestedState,
} = {}) {
  assert(evidence?.schema === "media-server.v390-ui-selector-owner-reveal.v1",
    "selector owner reveal schema mismatch");
  assert(evidence.selectorEngine === "playwright-locator" &&
    evidence.candidatePolicy === "first" &&
    evidence.selectedCandidateIndex === 0,
  "selector owner reveal did not preserve Playwright first-locator ownership");
  assert(evidence.candidateCount === candidateCount,
    `selector owner candidate count mismatch: ${evidence.candidateCount}`);
  assert(evidence.requestedState === requestedState,
    `selector owner requested state mismatch: ${evidence.requestedState}`);
  assert(/^[0-9a-f]{64}$/.test(evidence.selectorSha256 || ""),
    "selector owner safe identity digest missing");
}

function selectorHarnessDetails(open = false) {
  return { tagName: "DETAILS", open };
}

function selectorHarnessTarget({
  disclosure = null,
  tagName = "DIV",
  visible = true,
} = {}) {
  return {
    tagName,
    visible,
    parentElement: null,
    closest(value) {
      return value === "details" ? disclosure : null;
    },
  };
}

function selectorOwnerHarness({
  selector,
  targets = [selectorHarnessTarget()],
  initiallyAttached = true,
  attachOnWait = false,
} = {}) {
  let attached = initiallyAttached && targets.length > 0;
  const waits = [];
  const locatorSelectors = [];
  const nativeSelectorCalls = [];
  let evaluateAfterAttached = false;
  const locatorFor = requestedSelector => {
    locatorSelectors.push(requestedSelector);
    const matches = requestedSelector === selector ? targets : [];
    const first = {
      waitFor: async ({ state, timeout } = {}) => {
        waits.push({ state, timeout });
        if (state === "attached" && attachOnWait && matches.length > 0) attached = true;
        if (!attached || matches.length === 0) throw new Error(`locator wait timeout: ${requestedSelector}`);
        if (state === "visible" && matches[0]?.visible !== true) {
          throw new Error(`locator wait timeout: ${requestedSelector}`);
        }
      },
      evaluate: async (callback, argument) => {
        evaluateAfterAttached = attached;
        if (!attached || matches.length === 0) throw new Error(`locator evaluate missing: ${requestedSelector}`);
        return callback(matches[0], argument);
      },
    };
    return {
      count: async () => attached ? matches.length : 0,
      first: () => first,
    };
  };
  return {
    page: {
      locator: locatorFor,
      evaluate: async (_callback, requestedSelector) => {
        nativeSelectorCalls.push(requestedSelector);
        if (/:(?:has-text|text|text-is|visible)\b|(?:^|\s)nth=|>>/.test(String(requestedSelector || ""))) {
          throw new SyntaxError(`native querySelector rejected: ${requestedSelector}`);
        }
        return null;
      },
    },
    waits,
    locatorSelectors,
    nativeSelectorCalls,
    get evaluateAfterAttached() {
      return evaluateAfterAttached;
    },
  };
}

function cssOnlyNativeSelectorOwners() {
  return new Set([
    "capture_docs_ui_assets.mjs::selector",
    "ui_visual_smoke_lib.mjs::item",
    "ui_visual_smoke_lib.mjs::selector",
    "v390_ui_case_runtime.mjs::selector",
    "v390_ui_browser_callback_boundary.mjs::argument.selector",
    "v390_ui_browser_callback_boundary.mjs::argument.exactSelector",
    "v390_ui_exact_oracle_runtime.mjs::descendantSelector",
    "v390_ui_exact_oracle_runtime.mjs::exactSelector",
    "v390_ui_exact_oracle_runtime.mjs::memorySelector",
    "v390_ui_exact_oracle_runtime.mjs::selector",
    "v390_ui_exact_oracle_runtime.mjs::tileSelector",
    "v390_ui_native_adapter.mjs::controlSelector",
    "v390_ui_native_adapter.mjs::liveSpec.modeControlsSelector",
    "v390_ui_native_adapter.mjs::liveSpec.modeSelector",
    "v390_ui_native_adapter.mjs::liveSpec.placeholderSelector",
    "v390_ui_native_adapter.mjs::liveSpec.stageSelector",
    "v390_ui_native_adapter.mjs::liveSpec.tileSelector",
    "v390_ui_native_adapter.mjs::liveSpec.videoSelector",
    "v390_ui_native_adapter.mjs::modeSelectorValue",
    "v390_ui_native_adapter.mjs::targetSelector",
    "v390_ui_native_adapter.mjs::videoSelectorValue",
    "verify_auth_scope_picker.mjs::selector",
    "verify_ops_client_ui_smoke.mjs::selector",
    "verify_ops_event_records_scope.mjs::selector",
    "verify_ops_tables_layout.mjs::auditSelector",
    "verify_ops_tables_layout.mjs::fallbackOpenSelector",
    "verify_ops_tables_layout.mjs::openSelector",
    "verify_ops_tables_layout.mjs::selector",
    "verify_ops_ui_click_e2e.mjs::selector",
    "verify_v390_ui_automation.mjs::interaction.selector",
    "verify_v390_ui_automation.mjs::selector",
    "verify_v390_ui_automation.mjs::targetSelector",
  ]);
}

function playwrightSelectorDialect(value) {
  return /:has-text\(|:text\(|:text-is\(|:visible(?:\b|\()|(?:^|\s)nth=|>>/.test(String(value || ""));
}

function collectSelectorContractValues(value, currentPath = "$") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectSelectorContractValues(item, `${currentPath}[${index}]`));
  }
  if (!value || typeof value !== "object") return [];
  const result = [];
  for (const [key, item] of Object.entries(value)) {
    const itemPath = `${currentPath}.${key}`;
    const selectorOwned = /selector/i.test(key) && !/(?:source|engine|policy|sha256)$/i.test(key);
    if (selectorOwned && typeof item === "string" && item) {
      result.push({ path: itemPath, value: item });
    } else if (selectorOwned && Array.isArray(item)) {
      for (let index = 0; index < item.length; index += 1) {
        if (typeof item[index] === "string" && item[index]) {
          result.push({ path: `${itemPath}[${index}]`, value: item[index] });
        }
      }
    }
    result.push(...collectSelectorContractValues(item, itemPath));
  }
  return result;
}

function selectorAuditSources() {
  const internalDir = path.join(rootDir, "scripts/internal");
  return fs.readdirSync(internalDir)
    .filter(name => name.endsWith(".mjs") && !name.endsWith("_contract.mjs"))
    .sort()
    .map(file => ({ file, source: fs.readFileSync(path.join(internalDir, file), "utf8") }));
}

function collectDynamicNativeSelectorCalls() {
  const pattern = /\b(?:document|[A-Za-z_$][\w$]*)\.querySelector(?:All)?\(\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*\)/g;
  const result = [];
  for (const { file, source } of selectorAuditSources()) {
    for (const match of source.matchAll(pattern)) {
      result.push({ file, identifier: match[1] });
    }
  }
  return result;
}

function collectNativeSelectorDialectCalls() {
  const result = [];
  const pattern = /\.querySelector(?:All)?\(([^\n;]{0,300})\)/g;
  for (const { file, source } of selectorAuditSources()) {
    for (const match of source.matchAll(pattern)) {
      if (playwrightSelectorDialect(match[1])) result.push(`${file}:${match.index}`);
    }
  }
  return result;
}

function fullAuthDisableResponse() {
  return {
    status: "disabled",
    user: {
      username: "auth-020-fixture",
      displayName: "REVIEW4 AUTH-020 user",
      role: "viewer",
      enabled: false,
      scopesCount: 1,
      scopes: ["view:9001"],
      mustChangePassword: false,
      failedLoginCount: 0,
      lockedUntil: "",
      lastFailedLoginAt: "",
      lastLoginAt: "2026-07-21T00:00:00Z",
      lastLoginIp: "127.0.0.1",
      createdAt: "2026-07-21T00:00:00Z",
      passwordUpdatedAt: "2026-07-21T00:00:00Z",
      disabledAt: "2026-07-21T00:01:00Z",
    },
  };
}

function fullSourceResponse(sourceId, enabled, status) {
  return {
    ok: true,
    status,
    source: {
      sourceId,
      displayName: `REVIEW4 ${sourceId} source`,
      kind: "file",
      enabled,
      tags: ["review4"],
      ownerGroup: "ops",
      site: "test-site",
      group: "test-group",
      floor: "test-floor",
      zone: "REVIEW4",
      canonicalSourceKey: "file:sample_h264.mp4",
      file: "sample_h264.mp4",
    },
  };
}

function fullViewDisableResponse() {
  return {
    ok: true,
    status: "disabled",
    view: {
      viewId: "src-019-fixture",
      displayName: "REVIEW4 SRC-019 view",
      sourceId: "src-019-fixture",
      defaultRuleId: "",
      allowedRuleIds: [],
      allowedOverlayModes: ["raw", "va-overlay", "va-rule"],
      showDashboard: true,
      showEvents: true,
      showMetadataSummary: true,
      clientGroups: ["default"],
      maxTiles: 1,
      enabled: false,
    },
  };
}

function fullOnvifDraftResponse() {
  return {
    ok: true,
    status: "onvifImportDraft",
    notSaved: true,
    previewContract: {
      schema: "media-server.onvif-draft-preview.v1",
      scope: "ops-sources-before-save",
      requiresExplicitSave: true,
      storageAction: "none",
      sourceRegistryMutation: false,
      publishedViewMutation: false,
      rawSoapIncluded: false,
      credentialMaterialIncluded: false,
      endpointIncluded: false,
      diagnosticJsonIncluded: false,
    },
    candidate: {
      manufacturer: "ExampleCam",
      model: "EC-LiveT-200",
      firmwareVersion: "1.2.3-test",
      serialNumber: "EXAMPLE-ONVIF-0001",
    },
    selectedProfile: {
      token: "profile-live-main",
      name: "Live Main H264",
      mediaApi: "Media2",
      encoding: "H264",
      width: 1920,
      height: 1080,
      fps: 30,
      transport: "RTSP",
    },
    auth: {
      required: true,
      credentialRefPresent: true,
      plaintextSecretIncluded: false,
    },
    credentialGate: {
      schema: "media-server.onvif-credential-binding-gate.v1",
      targetStep: "V260-S03",
      status: "credential-reference-only-store-deferred",
      primaryStoreProvider: "none",
      primaryStoreDecision: "defer-product-persistent-store",
      fallbackProviders: ["in-memory-fixture"],
      excludedProviders: ["local-encrypted", "external-secret-manager"],
      sourceWriteRequired: true,
      requiredScope: "source:write",
      authRequired: true,
      credentialRefPresent: true,
      credentialReferenceStatus: "reference-present-redacted",
      productPersistentSecretStoreEnabled: false,
      externalSecretManagerEnabled: false,
      credentialBindingStoreEnabled: false,
      secretMaterialStored: false,
      referenceValueExposed: false,
      redactionGuard: {
        urlCredentialsRejected: true,
        draftApiOmitsCredentialRef: true,
        sourceRegistrySecretFields: false,
        publishedViewSecretFields: false,
        clientViewerExposureAdded: false,
        authHeaderMaterialIncluded: false,
        soapSecurityHeaderIncluded: false,
      },
      contract: {
        eventPostPayloadChanged: false,
        webrtcDataChannelSchemaChanged: false,
        sseMetadataSchemaChanged: false,
        wsMetadataSchemaChanged: false,
        rtspOrWebrtcMediaPathChanged: false,
        authRoleScopeChanged: false,
      },
    },
    sourceDraft: {
      sourceId: "src-031-source",
      displayName: "ExampleCam Live Main",
      kind: "rtsp",
      rtspUrl: "rtsp://camera.invalid/live",
      enabled: true,
      tags: ["onvif", "live"],
      ownerGroup: "ops",
    },
    publishedViewDraft: {
      viewId: "src-031-view",
      displayName: "ExampleCam Live Main",
      sourceId: "src-031-source",
      allowedOverlayModes: ["raw", "va-overlay", "va-rule"],
      showDashboard: true,
      showEvents: true,
      showMetadataSummary: true,
      clientGroups: ["default"],
      maxTiles: 1,
      enabled: true,
    },
  };
}

function fullAlertDeliveryDryRunResponse() {
  const preview = {
    schema: "media-server.ops.alert-delivery-payload-preview.v1",
    deliveryId: "evt-038-review4-fixture",
    kind: "webhook",
    label: "REVIEW4 EVT-038",
    endpointMasked: "alerts.example.invalid/[redacted]",
    payloadRedacted: true,
    event: {
      eventId: "evt-038-runtime-event",
      eventType: "intrusion",
      sourceId: "sample",
    },
    body: {
      deliveryId: "evt-038-review4-fixture",
      kind: "webhook",
      eventId: "evt-038-runtime-event",
      eventType: "intrusion",
      sourceId: "sample",
      endpoint: "[redacted-alert-target]",
    },
    eventPostPayloadChanged: false,
    externalDeliveryPerformed: false,
  };
  return {
    status: "ops-alert-delivery-dry-run",
    schema: "media-server.ops.alert-delivery-dry-run.v1",
    dryRun: true,
    externalDeliveryPerformed: false,
    eventPostPayloadChanged: false,
    contract: {
      alertTargetDraft: true,
      payloadPreview: true,
      deliveryAttemptLog: true,
      separateFromEventPostPayload: true,
    },
    audit: { area: "events", action: "alert-delivery-dry-run" },
    payloadPreviews: [preview],
    attempts: [{
      schema: "media-server.ops.alert-delivery-attempt.v1",
      deliveryId: preview.deliveryId,
      kind: "webhook",
      eventId: preview.event.eventId,
      eventType: preview.event.eventType,
      sourceId: preview.event.sourceId,
      status: "dry-run",
      transport: "dry-run",
      endpointMasked: preview.endpointMasked,
      retryPolicy: { maxAttempts: 3, backoffMs: 2000, bounded: true },
      dryRun: true,
      externalDeliveryPerformed: false,
      eventPostPayloadChanged: false,
      attemptedAtMs: 1,
      payloadPreview: preview,
    }],
  };
}

function withField(payload, pathSegments, value) {
  const clone = structuredClone(payload);
  let target = clone;
  for (const segment of pathSegments.slice(0, -1)) target = target[segment];
  target[pathSegments.at(-1)] = value;
  return clone;
}

async function captureListenerProjection({ method, pathname, status, payload }) {
  const entry = {
    phase: "response",
    requestId: "contract-request",
    correlationId: "contract-correlation",
    method,
    status,
    url: `http://runtime.invalid${pathname}`,
  };
  const pending = new Set();
  const failures = [];
  const request = { method: () => method };
  let jsonReadCount = 0;
  const response = {
    request: () => request,
    url: () => entry.url,
    json: async () => {
      jsonReadCount += 1;
      return structuredClone(payload);
    },
  };
  const read = captureClientLiveSessionResponseProjection({
    response,
    entry,
    pendingSafeResponseReads: pending,
    safeResponseReadFailures: failures,
  }) || captureEndpointOwnedResponseProjection({
    response,
    entry,
    pendingSafeResponseReads: pending,
    safeResponseReadFailures: failures,
  });
  assert(read, `${method} ${pathname} did not enter the endpoint response listener`);
  await read;
  assert(pending.size === 0, `${method} ${pathname} response projection remained pending`);
  return { entry, failures, jsonReadCount };
}
