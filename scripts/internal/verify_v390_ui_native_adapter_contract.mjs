#!/usr/bin/env node
// 파일 용도: native Playwright adapter의 모듈 탐색, capability, fallback 거부, 실제 evidence 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {
  bindDocumentFormSubmission,
  bindFixtureResponseToInitiatingRequest,
  bindPlaywrightResponseToInitiatingRequest,
  buildDiagnosticMarkerResponseStageEvidence,
  buildLiveSessionEvidence,
  captureClientLiveSessionResponseProjection,
  captureDiagnosticMarkerResponseProjection,
  captureEndpointOwnedResponseProjection,
  captureOpsIncidentTimelineResponseProjection,
  createCaseOwnedRequestIdentityRegistry,
  formatSafeResponseReadFailure,
  nativeCapabilities,
  isResolvedPlaywrightTimeoutError,
  resolveRequestCorrelationPrecedence,
  resolvePlaywrightModule,
  secretStrippedBrowserEnv,
} from "./v390_ui_native_adapter.mjs";

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

check("adapter exposes native wait click fill type select screenshot", () => {
  for (const capability of ["wait", "click", "fill", "type", "select", "screenshot", "evaluate", "request-correlation", "request-start-ledger", "request-action-ownership", "network-quiet", "role-session-switch"]) {
    assert(nativeCapabilities.includes(capability), `missing capability ${capability}`);
  }
  for (const snippet of ["waitForSelector", "page.locator(selector).click", "page.locator(selector).fill", "pressSequentially", "selectOption", "page.screenshot"]) {
    assert(adapterSource.includes(snippet), `adapter source missing ${snippet}`);
  }
  assert(adapterSource.includes("readOnly: Boolean(element && 'readOnly' in element && element.readOnly)"),
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
    adapterSource.includes("outerInjectionEnabled: activeCorrelationInjectionEnabled") &&
    adapterSource.includes("allowCorrelation: false") &&
    !adapterSource.includes("context.setExtraHTTPHeaders"),
  "adapter does not keep correlation injection request/document scoped");
  assert(exactRunnerSource.includes("finalNavigation = await browser.close()") &&
    !exactRunnerSource.includes("browser.finalizeNavigationLedger()") &&
    exactRunnerSource.includes("final navigation lifecycle failed"),
  "exact runner does not validate the authoritative ledger returned after browser close");
  const closeBlockStart = adapterSource.indexOf("close: async () => {");
  const contextClose = adapterSource.indexOf("await context.close()", closeBlockStart);
  const browserClose = adapterSource.indexOf("await browser.close()", closeBlockStart);
  const finalLedger = adapterSource.indexOf("const finalNavigation = finalizeNavigationLedger()", closeBlockStart);
  assert(closeBlockStart >= 0 &&
    contextClose > closeBlockStart &&
    browserClose > contextClose &&
    finalLedger > browserClose,
  "adapter finalizes the navigation ledger before the browser lifecycle is closed");
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
    "outerInjectionEnabled: activeCorrelationInjectionEnabled",
    "correlationAllowed,",
    "setCorrelationId: async (correlationId, { inject = true } = {})",
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
    correlationId: "",
    method: "POST",
    status: 302,
    url: "http://127.0.0.1:8081/setup",
  };
  const redirectRequest = {
    ...request,
    requestId: "native-request-2",
    caseRequestIdentity: "UI-002:request-2",
    caseRequestSequence: 2,
    redirectedFromRequestId: request.requestId,
    method: "GET",
    url: "http://127.0.0.1:8081/login",
  };
  const redirectResponse = {
    ...response,
    requestId: redirectRequest.requestId,
    caseRequestIdentity: redirectRequest.caseRequestIdentity,
    caseRequestSequence: redirectRequest.caseRequestSequence,
    method: "GET",
    status: 200,
    url: redirectRequest.url,
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
  const unauthenticatedBranches = adapterSource.match(/principal\?\.authenticated === false/g) || [];
  assert(unauthenticatedBranches.length === 2,
    `setup-required anonymous handling must cover requested/observed and visual capture: ${unauthenticatedBranches.length}`);
  assert(adapterSource.includes("if (response.status === 401) {\n          accountRole = 'anonymous';") &&
    adapterSource.includes("if (principal?.authenticated === false) {\n            accountRole = 'anonymous';"),
  "whoami observation does not distinguish 401 and setup-required unauthenticated principals");
  assert(adapterSource.includes("principal?.authenticated === true && typeof principal?.role === 'string'"),
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
    "sanitizeEvidenceValue(consoleEntries",
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
  for (const field of ["screenshotPath", "tracePath"]) {
    assert(fs.existsSync(summary[field]), `native artifact missing ${field}`);
  }
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
