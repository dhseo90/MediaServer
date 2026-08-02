#!/usr/bin/env node
// 파일 용도: 설치 없는 bundled Playwright를 찾아 wait/click/fill/select/screenshot 네이티브 UI 동작을 제공한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
export const nativeCapabilities = [
  "navigate",
  "wait",
  "query",
  "assert",
  "click",
  "fill",
  "type",
  "select",
  "screenshot",
  "evaluate",
  "visual-geometry",
  "product-theme-observation",
  "live-video-session-evidence",
  "request-correlation",
  "request-start-ledger",
  "request-action-ownership",
  "network-quiet",
  "role-session-switch",
];

export function discoverPlaywrightCandidates(explicitModulePath = "") {
  const nodePathCandidates = String(process.env.NODE_PATH || "")
    .split(path.delimiter)
    .filter(Boolean)
    .map(entry => path.join(entry, "playwright"));
  return unique([
    explicitModulePath,
    process.env.MEDIA_SERVER_PLAYWRIGHT_MODULE_PATH || "",
    process.env.CODEX_PRIMARY_RUNTIME_PLAYWRIGHT_PATH || "",
    path.join(process.cwd(), "node_modules/playwright"),
    path.resolve(path.dirname(process.execPath), "../node_modules/playwright"),
    path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"),
    ...nodePathCandidates,
  ].filter(Boolean).map(candidate => path.resolve(candidate)));
}

export function resolvePlaywrightModule({ modulePath = "", requireExplicit = false } = {}) {
  const candidates = requireExplicit && modulePath
    ? [path.resolve(modulePath)]
    : discoverPlaywrightCandidates(modulePath);
  const attempts = [];
  for (const candidate of candidates) {
    const packagePath = path.join(candidate, "package.json");
    if (!fs.existsSync(packagePath)) {
      attempts.push({ candidate, status: "missing-package-json" });
      continue;
    }
    try {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      const playwright = require(candidate);
      if (!playwright?.chromium) throw new Error("chromium browser type missing");
      attempts.push({ candidate, status: "selected", version: packageJson.version || "unknown" });
      return {
        playwright,
        modulePath: fs.realpathSync(candidate),
        moduleVersion: packageJson.version || "unknown",
        attempts,
      };
    } catch (error) {
      attempts.push({
        candidate,
        status: "load-failed",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const failure = new Error("native Playwright module unavailable; set MEDIA_SERVER_PLAYWRIGHT_MODULE_PATH to a Playwright package directory");
  failure.attempts = attempts;
  throw failure;
}

export async function createNativePlaywrightAdapter({ modulePath = "", chromePath = "" } = {}) {
  const resolved = resolvePlaywrightModule({ modulePath, requireExplicit: Boolean(modulePath) });
  const executablePath = resolveNativeBrowserExecutable(chromePath);
  return {
    summary: {
      tool: "playwright",
      engine: "playwright-native",
      fallbackUsed: false,
      fallbackReason: "",
      visualOnly: false,
      dependencyStatus: "bundled-module-available",
      modulePath: resolved.modulePath,
      moduleVersion: resolved.moduleVersion,
      browserExecutable: executablePath || "playwright-managed-browser",
      capabilities: nativeCapabilities,
    },
    attempts: resolved.attempts.map(item => ({
      tool: "playwright",
      engine: "playwright-native",
      status: item.status,
      reason: item.reason || (item.status === "selected" ? `Playwright ${item.version}` : item.candidate),
      modulePath: item.candidate,
    })),
    openPage: args => openNativePlaywrightPage(resolved.playwright, {
      ...args,
      executablePath,
    }),
  };
}

export function resolveNativeBrowserExecutable(explicitPath = "") {
  const candidates = unique([
    explicitPath,
    process.env.CHROME_PATH || "",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean).map(candidate => path.resolve(candidate)));
  if (explicitPath && !fs.existsSync(path.resolve(explicitPath))) {
    throw new Error(`native browser executable does not exist: ${path.resolve(explicitPath)}`);
  }
  return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || "";
}

export function secretStrippedBrowserEnv(sourceEnv = process.env) {
  const env = { ...sourceEnv };
  delete env.MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD;
  delete env.MEDIA_SERVER_V390_UI_ROLE_SECRETS;
  return env;
}

const correlationHeaderName = "x-media-server-correlation-id";

function correlationDigest(value) {
  return value
    ? createHash("sha256").update(String(value)).digest("hex")
    : "";
}

function correlationPrecedenceFailure(failureCode, message, {
  actionId = "",
  state = "rejected-explicit-correlation",
} = {}) {
  const error = new Error(message);
  error.failureCode = failureCode;
  error.safeEvidence = Object.freeze({
    state,
    actionId: String(actionId || ""),
    failureCode,
  });
  return error;
}

export function resolveRequestCorrelationPrecedence({
  headerEntries = [],
  outerCorrelationId = "",
  outerInjectionEnabled = false,
  correlationAllowed = true,
  registration = null,
  currentCaseId = "",
  currentActionId = "",
} = {}) {
  const correlationHeaders = (Array.isArray(headerEntries) ? headerEntries : [])
    .filter(entry => String(entry?.name || "").toLowerCase() === correlationHeaderName)
    .map(entry => ({
      name: String(entry?.name || ""),
      value: String(entry?.value || ""),
    }));
  if (correlationHeaders.length > 1) {
    throw correlationPrecedenceFailure(
      "CORRELATION_HEADER_DUPLICATE",
      "duplicate or case-conflicting correlation headers are forbidden",
      { actionId: currentActionId },
    );
  }
  const explicit = correlationHeaders[0] || null;
  const outer = String(outerCorrelationId || "");
  const actionId = String(currentActionId || "");
  const caseId = String(currentCaseId || "");
  if (explicit) {
    if (!correlationAllowed) {
      throw correlationPrecedenceFailure(
        "EXPLICIT_CORRELATION_NOT_ALLOWED",
        "explicit correlation is forbidden for this request boundary",
        { actionId },
      );
    }
    if (!registration || registration.active !== true) {
      throw correlationPrecedenceFailure(
        "EXPLICIT_CORRELATION_UNREGISTERED",
        "explicit correlation is not registered to an active request action",
        { actionId },
      );
    }
    if (String(registration.caseId || "") !== caseId) {
      throw correlationPrecedenceFailure(
        "EXPLICIT_CORRELATION_CASE_MISMATCH",
        "explicit correlation registration belongs to a different case",
        { actionId },
      );
    }
    if (!actionId || String(registration.actionId || "") !== actionId) {
      throw correlationPrecedenceFailure(
        "EXPLICIT_CORRELATION_ACTION_MISMATCH",
        "explicit correlation registration belongs to a different action",
        { actionId },
      );
    }
    if (String(registration.outerCorrelationId || "") !== outer) {
      throw correlationPrecedenceFailure(
        "EXPLICIT_CORRELATION_OUTER_SCOPE_MISMATCH",
        "outer correlation changed after inner correlation registration",
        { actionId },
      );
    }
    if (!explicit.value || String(registration.correlationId || "") !== explicit.value) {
      throw correlationPrecedenceFailure(
        "EXPLICIT_CORRELATION_VALUE_MISMATCH",
        "explicit correlation does not match the active action registration",
        { actionId },
      );
    }
    const decision = {
      state: "preserved-explicit-inner",
      actionId,
      correlationDigest: correlationDigest(explicit.value),
      inject: false,
      preserve: true,
      failureCode: "",
    };
    Object.defineProperty(decision, "correlationId", {
      value: explicit.value,
      enumerable: false,
    });
    return Object.freeze(decision);
  }
  if (outer && outerInjectionEnabled === true && correlationAllowed) {
    const decision = {
      state: "injected-outer",
      actionId,
      correlationDigest: correlationDigest(outer),
      inject: true,
      preserve: false,
      failureCode: "",
    };
    Object.defineProperty(decision, "correlationId", {
      value: outer,
      enumerable: false,
    });
    return Object.freeze(decision);
  }
  return Object.freeze({
    state: "correlation-absent",
    actionId,
    correlationDigest: "",
    inject: false,
    preserve: false,
    failureCode: "",
  });
}

export function createCaseOwnedRequestIdentityRegistry({
  caseId = "",
  requestIdPrefix = "native-request",
} = {}) {
  let requestSequence = 0;
  const playwrightRequests = new WeakMap();
  const fixtureRequestHandles = new WeakMap();
  const issueIdentity = () => {
    const caseRequestSequence = ++requestSequence;
    return Object.freeze({
      requestId: `${requestIdPrefix}-${caseRequestSequence}`,
      caseRequestIdentity:
        `${String(caseId || "unbound-case")}:request-${caseRequestSequence}`,
      caseRequestSequence,
    });
  };
  const requireOpaqueObject = (value, label) => {
    if ((typeof value !== "object" && typeof value !== "function") ||
        value === null) {
      throw new Error(`${label} must be an opaque object handle`);
    }
  };
  return {
    registerPlaywrightRequest(request) {
      requireOpaqueObject(request, "Playwright request");
      const existing = playwrightRequests.get(request);
      if (existing) return existing;
      const identity = issueIdentity();
      playwrightRequests.set(request, identity);
      return identity;
    },
    resolvePlaywrightRequest(request) {
      if ((typeof request !== "object" && typeof request !== "function") ||
          request === null) return null;
      return playwrightRequests.get(request) || null;
    },
    registerFixtureRequestHandle(requestHandle) {
      requireOpaqueObject(requestHandle, "fixture request handle");
      if (fixtureRequestHandles.has(requestHandle)) {
        throw new Error("duplicate fixture request handle");
      }
      const identity = issueIdentity();
      fixtureRequestHandles.set(requestHandle, identity);
      return identity;
    },
    resolveFixtureRequestHandle(requestHandle) {
      if ((typeof requestHandle !== "object" &&
          typeof requestHandle !== "function") || requestHandle === null) {
        return null;
      }
      return fixtureRequestHandles.get(requestHandle) || null;
    },
  };
}

export function bindPlaywrightResponseToInitiatingRequest(
  response,
  pendingRequests,
  requestIdentityRegistry = null,
) {
  const request = response.request();
  const registeredIdentity =
    requestIdentityRegistry?.resolvePlaywrightRequest(request) || null;
  const pendingRequest = pendingRequests.get(request) || null;
  const initiatingRequest = pendingRequest &&
    (!requestIdentityRegistry ||
      (registeredIdentity &&
       registeredIdentity.requestId === pendingRequest.requestId &&
       registeredIdentity.caseRequestIdentity ===
         pendingRequest.caseRequestIdentity &&
       registeredIdentity.caseRequestSequence ===
         pendingRequest.caseRequestSequence))
    ? pendingRequest
    : null;
  return { request, initiatingRequest };
}

export function bindFixtureResponseToInitiatingRequest(
  response,
  requestIdentityRegistry,
) {
  const requestHandle = response?.initiatingRequestHandle;
  const initiatingRequest =
    requestIdentityRegistry?.resolveFixtureRequestHandle(requestHandle) || null;
  return { requestHandle, initiatingRequest };
}

export function bindDocumentFormSubmission(entries, {
  method = "POST",
  path: expectedPath,
  allowedStatuses = [],
  expectedRedirectPath = null,
} = {}) {
  const expectedMethod = String(method).toUpperCase();
  const documentRequests = entries.filter(entry =>
    entry.phase === "request-start" &&
    entry.requestKind === "document-navigation");
  const primaryRequests = documentRequests.filter(entry =>
    entry.method === expectedMethod &&
    urlTarget(entry.url) === expectedPath);
  if (primaryRequests.length !== 1) {
    throw new Error(`document form submit request count mismatch: ${primaryRequests.length}`);
  }
  const primaryRequest = primaryRequests[0];
  if (primaryRequest.resourceType !== "document" ||
      primaryRequest.sameOrigin !== true ||
      primaryRequest.correlationId ||
      primaryRequest.redirectedFromRequestId) {
    throw new Error("document form submit request trust binding mismatch");
  }
  const primaryResponses = entries.filter(entry =>
    entry.phase === "response" &&
    entry.requestKind === "document-navigation" &&
    entry.requestId === primaryRequest.requestId);
  if (primaryResponses.length !== 1) {
    throw new Error(`document form submit response count mismatch: ${primaryResponses.length}`);
  }
  const primaryResponse = primaryResponses[0];
  if (primaryResponse.responseRequestObjectObserved !== true ||
      primaryResponse.requestIdentitySource !== "playwright-response-request" ||
      primaryResponse.caseRequestIdentity !== primaryRequest.caseRequestIdentity ||
      primaryResponse.caseRequestSequence !== primaryRequest.caseRequestSequence ||
      primaryResponse.method !== expectedMethod ||
      urlTarget(primaryResponse.url) !== expectedPath ||
      primaryResponse.resourceType !== "document" ||
      primaryResponse.sameOrigin !== true ||
      primaryResponse.correlationId ||
      !allowedStatuses.includes(primaryResponse.status)) {
    throw new Error("document form submit response trust binding mismatch");
  }

  const redirectRequests = documentRequests.filter(entry =>
    entry.redirectedFromRequestId === primaryRequest.requestId);
  const expectedRedirectCount = expectedRedirectPath ? 1 : 0;
  if (redirectRequests.length !== expectedRedirectCount ||
      documentRequests.length !== 1 + expectedRedirectCount) {
    throw new Error(`document form submit redirect/reissue count mismatch: ${redirectRequests.length}/${documentRequests.length}`);
  }

  let redirectResponse = null;
  if (expectedRedirectPath) {
    const redirectRequest = redirectRequests[0];
    if (primaryResponse.status !== 302 ||
        redirectRequest.method !== "GET" ||
        urlTarget(redirectRequest.url) !== expectedRedirectPath ||
        redirectRequest.resourceType !== "document" ||
        redirectRequest.sameOrigin !== true ||
        redirectRequest.correlationId) {
      throw new Error("document form submit redirect request trust binding mismatch");
    }
    const redirectResponses = entries.filter(entry =>
      entry.phase === "response" &&
      entry.requestKind === "document-navigation" &&
      entry.requestId === redirectRequest.requestId);
    if (redirectResponses.length !== 1) {
      throw new Error(`document form submit redirect response count mismatch: ${redirectResponses.length}`);
    }
    redirectResponse = redirectResponses[0];
    if (redirectResponse.responseRequestObjectObserved !== true ||
        redirectResponse.requestIdentitySource !== "playwright-response-request" ||
        redirectResponse.caseRequestIdentity !== redirectRequest.caseRequestIdentity ||
        redirectResponse.caseRequestSequence !== redirectRequest.caseRequestSequence ||
        redirectResponse.method !== "GET" ||
        urlTarget(redirectResponse.url) !== expectedRedirectPath ||
        redirectResponse.resourceType !== "document" ||
        redirectResponse.sameOrigin !== true ||
        redirectResponse.correlationId ||
        redirectResponse.status !== 200) {
      throw new Error("document form submit redirect response trust binding mismatch");
    }
  }

  return {
    schema: "media-server.v390-ui-document-form-submit-binding.v1",
    requestId: primaryRequest.requestId,
    caseRequestIdentity: primaryRequest.caseRequestIdentity,
    caseRequestSequence: primaryRequest.caseRequestSequence,
    method: expectedMethod,
    path: expectedPath,
    status: primaryResponse.status,
    requestKind: "document-navigation",
    resourceType: "document",
    sameOrigin: true,
    correlationObserved: false,
    responseRequestObjectObserved: true,
    redirectCount: expectedRedirectCount,
    redirectPath: expectedRedirectPath,
    redirectRequestId: redirectResponse?.requestId || null,
    requestAttemptCount: primaryRequests.length,
    responseCandidateCount: primaryResponses.length,
    reissueCount: 0,
  };
}

export function captureDiagnosticMarkerResponseProjection({
  response,
  entry,
  probe,
  pendingSafeResponseReads = new Set(),
  safeResponseReadFailures = [],
} = {}) {
  if (!probe?.armed ||
      entry?.method !== probe.method ||
      urlTarget(entry?.url) !== probe.urlPath) {
    return null;
  }
  const read = response.json()
    .then(payload => {
      const lines = Array.isArray(payload?.lines) ? payload.lines.map(String) : [];
      const normalizedMarker = String(probe.marker || "").normalize("NFKC").trim();
      const markerMatches = lines.filter(line =>
        line.split(/\s+/u).includes(normalizedMarker));
      const markerResponseIndex = markerMatches.length === 1
        ? lines.lastIndexOf(markerMatches[0])
        : -1;
      const markerReverseIndex = markerResponseIndex >= 0
        ? lines.length - 1 - markerResponseIndex
        : -1;
      const classifierMatches = [...lines].reverse().filter(line =>
        /source health|cleanup|stale|event post|event storage|auth|ICE|TURN|relay|reconnect|WHIP/i
          .test(line));
      const rendererLogSelectedIndex = markerMatches.length === 1
        ? classifierMatches.indexOf(markerMatches[0])
        : -1;
      probe.captures.push({
        requestId: String(entry.requestId || ""),
        caseRequestIdentity: String(entry.caseRequestIdentity || ""),
        caseRequestSequence: Number(entry.caseRequestSequence || 0),
        responseRequestObjectObserved:
          entry.responseRequestObjectObserved === true,
        method: String(entry.method || ""),
        path: urlTarget(entry.url),
        status: Number(entry.status || 0),
        markerCount: markerMatches.length,
        lineCount: lines.length,
        responseOrder: "oldest-to-newest",
        rendererLogOrder: "newest-matching-first",
        markerResponseIndex,
        markerReverseIndex,
        classifierCandidateCount: classifierMatches.length,
        rendererLogSelectedIndex,
        rendererLogWindow: 3,
        ownedNoiseCount: String(probe.ownedNoisePrefix || "")
          ? lines.filter(line => line.startsWith(probe.ownedNoisePrefix)).length
          : 0,
        candidateDigest: createHash("sha256")
          .update(JSON.stringify(lines.map(line =>
            createHash("sha256").update(line).digest("hex"))))
          .digest("hex"),
        matchedDigest: createHash("sha256")
          .update(JSON.stringify(markerMatches.map(line =>
            createHash("sha256").update(line).digest("hex"))))
          .digest("hex"),
      });
    })
    .catch(() => {
      safeResponseReadFailures.push(
        `diagnostic marker response projection failed for ${probe.method} ${probe.urlPath}`,
      );
      probe.readFailureCount += 1;
    })
    .finally(() => pendingSafeResponseReads.delete(read));
  pendingSafeResponseReads.add(read);
  return read;
}

export function buildDiagnosticMarkerResponseStageEvidence(probe = {}) {
  const captures = Array.isArray(probe.captures) ? probe.captures : [];
  const capture = captures.length === 1 ? captures[0] : null;
  const failureCode = Number(probe.readFailureCount || 0) > 0
    ? "DASHBOARD_MARKER_RESPONSE_PARSE_FAILED"
    : (captures.length === 0
        ? "DASHBOARD_MARKER_RESPONSE_MISSING"
        : (captures.length > 1
            ? "DASHBOARD_MARKER_RESPONSE_DUPLICATE"
            : (!capture.responseRequestObjectObserved || !capture.requestId
                ? "DASHBOARD_MARKER_RESPONSE_REQUEST_IDENTITY_MISSING"
                : (capture.status !== 200
                    ? "DASHBOARD_MARKER_RESPONSE_STATUS_MISMATCH"
                    : (capture.markerCount === 0
                        ? "DASHBOARD_MARKER_RESPONSE_MARKER_MISSING"
                        : (capture.markerCount > 1
                            ? "DASHBOARD_MARKER_RESPONSE_MARKER_DUPLICATE"
                            : (capture.rendererLogSelectedIndex !== 0
                                ? "DASHBOARD_MARKER_RENDERER_WINDOW_MISMATCH"
                                : "PASS")))))));
  return {
    schema: "media-server.v390-ui-dashboard-marker-response-stage-evidence.v1",
    pass: failureCode === "PASS",
    failurePhase: "dashboard-owned-log-tail-response",
    failureCode,
    method: String(probe.method || ""),
    path: String(probe.urlPath || ""),
    markerDigest: createHash("sha256")
      .update(String(probe.marker || "").normalize("NFKC").trim())
      .digest("hex"),
    responseCandidateCount: captures.length,
    responseMatchedCount: capture?.markerCount === 1 ? 1 : 0,
    requestId: String(capture?.requestId || ""),
    caseRequestIdentity: String(capture?.caseRequestIdentity || ""),
    caseRequestSequence: Number(capture?.caseRequestSequence || 0),
    responseRequestObjectObserved:
      capture?.responseRequestObjectObserved === true,
    status: Number(capture?.status || 0),
    lineCount: Number(capture?.lineCount || 0),
    markerCount: Number(capture?.markerCount || 0),
    responseOrder: String(capture?.responseOrder || ""),
    rendererLogOrder: String(capture?.rendererLogOrder || ""),
    markerResponseIndex: Number.isInteger(capture?.markerResponseIndex)
      ? capture.markerResponseIndex
      : -1,
    markerReverseIndex: Number.isInteger(capture?.markerReverseIndex)
      ? capture.markerReverseIndex
      : -1,
    classifierCandidateCount: Number(capture?.classifierCandidateCount || 0),
    rendererLogSelectedIndex:
      Number.isInteger(capture?.rendererLogSelectedIndex)
        ? capture.rendererLogSelectedIndex
        : -1,
    rendererLogWindow: Number(capture?.rendererLogWindow || 0),
    ownedNoiseCount: Number(capture?.ownedNoiseCount || 0),
    candidateDigest: String(capture?.candidateDigest || ""),
    matchedDigest: String(capture?.matchedDigest || ""),
  };
}

async function openNativePlaywrightPage(playwright, {
  httpBase,
  pagePath,
  timeoutMs,
  width = 390,
  height = 844,
  executablePath = "",
  storageStatePath = "",
  colorScheme = "light",
  caseId = "",
  navigationCorrelationId = "",
  navigationInvocationId = "",
  onRuntimeSecret = null,
}) {
  const consoleEntries = [];
  const networkEntries = [];
  const requestIdentityRegistry = createCaseOwnedRequestIdentityRegistry({
    caseId,
  });
  const pendingRequests = new Map();
  const routeInjectedCorrelations = new WeakMap();
  const correlationRouteFailures = [];
  const pendingSafeResponseReads = new Set();
  const safeResponseReadFailures = [];
  let diagnosticMarkerProbe = null;
  const observedRuntimeSecrets = new Set();
  let requestListenersInstalled = false;
  let requestListenerStartSequence = 0;
  let requestListenerEndSequence = null;
  let lifecycleSequence = 0;
  let navigationOperationSequence = 0;
  let activeNavigationOperation = null;
  let activeCorrelationId = String(navigationCorrelationId || "");
  let activeCorrelationInjectionEnabled = Boolean(navigationCorrelationId);
  let activeRequestOwnership = null;
  let activeExplicitCorrelationRegistration = null;
  let explicitCorrelationScopeSequence = 0;
  const documentNavigationLedger = [];
  const documentNavigationByRequestId = new Map();
  let documentNavigationAfterListenerEndCount = 0;
  let closePromise = null;
  const correlationHeaderDigest = correlationId => correlationId
    ? createHash("sha256").update(JSON.stringify({
        "x-media-server-correlation-id": correlationId,
      })).digest("hex")
    : "";
  const applyRouteInjectedCorrelation = (request, correlationId, {
    state = "injected-outer",
    actionId = "",
  } = {}) => {
    const applied = {
      correlationId,
      requestHeaderDigest: correlationHeaderDigest(correlationId),
      correlationInjectionSource: "route-continue",
      correlationRouteState: String(state || ""),
      correlationRouteActionId: String(actionId || ""),
      correlationRouteDigest: correlationDigest(correlationId),
    };
    routeInjectedCorrelations.set(request, applied);
    const pending = pendingRequests.get(request);
    if (pending) Object.assign(pending, applied);
    const requestId = pending?.requestId;
    if (!requestId) return;
    for (const entry of networkEntries) {
      if (entry.phase === "request-start" && entry.requestId === requestId) {
        Object.assign(entry, applied, {
          correlationSource: "request-header",
        });
      }
    }
  };
  const browser = await playwright.chromium.launch({
    headless: true,
    env: secretStrippedBrowserEnv(),
    ...(executablePath ? { executablePath } : {}),
  });
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme,
    ...(storageStatePath ? { storageState: storageStatePath } : {}),
  });
  await context.route("**/*", async route => {
    const request = route.request();
    const headers = { ...request.headers() };
    const headerEntries = typeof request.headersArray === "function"
      ? await request.headersArray()
      : Object.entries(headers).map(([name, value]) => ({ name, value }));
    const documentNavigation = request.isNavigationRequest() &&
      request.resourceType() === "document";
    const correlationAllowed = !documentNavigation ||
      activeNavigationOperation?.allowCorrelation === true;
    let decision;
    try {
      decision = resolveRequestCorrelationPrecedence({
        headerEntries,
        outerCorrelationId: activeCorrelationId,
        outerInjectionEnabled: activeCorrelationInjectionEnabled,
        correlationAllowed,
        registration: activeExplicitCorrelationRegistration,
        currentCaseId: caseId,
        currentActionId: String(activeRequestOwnership?.actionId || ""),
      });
    } catch (error) {
      correlationRouteFailures.push({
        sequence: ++lifecycleSequence,
        state: String(error?.safeEvidence?.state || "rejected-explicit-correlation"),
        actionId: String(error?.safeEvidence?.actionId || activeRequestOwnership?.actionId || ""),
        failureCode: String(error?.failureCode || "CORRELATION_PRECEDENCE_REJECTED"),
      });
      await route.abort("blockedbyclient");
      return;
    }
    if (decision.inject) {
      headers[correlationHeaderName] = decision.correlationId;
      applyRouteInjectedCorrelation(request, decision.correlationId, decision);
    } else if (decision.preserve) {
      applyRouteInjectedCorrelation(request, decision.correlationId, decision);
    } else if (documentNavigation) {
      delete headers[correlationHeaderName];
    }
    await route.continue({ headers });
  });
  await context.addInitScript(theme => {
    localStorage.setItem("mediaServerTheme", theme);
    document.documentElement.dataset.theme = theme;
  }, colorScheme);
  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);
  page.on("console", message => {
    consoleEntries.push({ level: message.type(), text: message.text() });
  });
  page.on("pageerror", error => {
    consoleEntries.push({ level: "error", text: error instanceof Error ? error.message : String(error) });
  });
  const requestIdentity = request => {
    return requestIdentityRegistry.registerPlaywrightRequest(request);
  };
  requestListenerStartSequence = ++lifecycleSequence;
  page.on("request", request => {
    const routeInjectedCorrelation = routeInjectedCorrelations.get(request);
    const correlationId = String(routeInjectedCorrelation?.correlationId ||
      request.headers()["x-media-server-correlation-id"] || "");
    const identity = requestIdentity(request);
    const requestId = identity.requestId;
    const requestStartedAtMs = Date.now();
    const implicitPageLoadOwnership = !activeRequestOwnership && activeNavigationOperation
      ? {
          actionId: `${String(activeNavigationOperation.invocationId || "initial-navigation")}:page-load`,
          renderCycleId: "",
          ownershipKind: "initial-page-load",
        }
      : null;
    const requestOwnership = activeRequestOwnership || implicitPageLoadOwnership;
    const redirectedFrom = request.redirectedFrom();
    const requestKind = request.isNavigationRequest() && request.frame() === page.mainFrame()
      ? "document-navigation"
      : (request.resourceType() === "fetch" ? "application-fetch" : "subresource");
    const requestHeaderDigest = String(routeInjectedCorrelation?.requestHeaderDigest ||
      correlationHeaderDigest(correlationId));
    pendingRequests.set(request, {
      ...identity,
      correlationId,
      requestHeaderDigest,
      correlationInjectionSource: String(routeInjectedCorrelation?.correlationInjectionSource || ""),
      correlationRouteState: String(routeInjectedCorrelation?.correlationRouteState || "correlation-absent"),
      correlationRouteActionId: String(routeInjectedCorrelation?.correlationRouteActionId || ""),
      correlationRouteDigest: String(routeInjectedCorrelation?.correlationRouteDigest || ""),
      initiatorActionId: String(requestOwnership?.actionId || ""),
      renderCycleId: String(requestOwnership?.renderCycleId || ""),
      requestOwnershipKind: String(requestOwnership?.ownershipKind || ""),
      requestStartedAtMs,
      requestKind,
      method: request.method(),
      path: urlTarget(request.url()),
    });
    networkEntries.push({
      phase: "request-start",
      requestId,
      caseRequestIdentity: identity.caseRequestIdentity,
      caseRequestSequence: identity.caseRequestSequence,
      requestKind,
      resourceType: request.resourceType(),
      sameOrigin: urlOrigin(request.url()) === urlOrigin(httpBase),
      redirectedFromRequestId: redirectedFrom ? requestIdentity(redirectedFrom).requestId : "",
      correlationId,
      correlationSource: correlationId ? 'request-header' : 'none',
      correlationInjectionSource: String(routeInjectedCorrelation?.correlationInjectionSource || ""),
      correlationRouteState: String(routeInjectedCorrelation?.correlationRouteState || "correlation-absent"),
      correlationRouteActionId: String(routeInjectedCorrelation?.correlationRouteActionId || ""),
      correlationRouteDigest: String(routeInjectedCorrelation?.correlationRouteDigest || ""),
      requestHeaderDigest,
      initiatorActionId: String(requestOwnership?.actionId || ""),
      renderCycleId: String(requestOwnership?.renderCycleId || ""),
      requestOwnershipKind: String(requestOwnership?.ownershipKind || ""),
      requestStartedAtMs,
      method: request.method(),
      status: 0,
      url: request.url(),
      requestBody: safeRequestBodyProjection(request),
    });
    if (requestKind === "document-navigation") {
      const operation = activeNavigationOperation;
      const navigationKind = operation?.kind ||
        (urlTarget(request.url()) === urlTarget(page.url())
          ? "reload"
          : "unowned-document-navigation");
      const ledgerEntry = {
        sequence: ++lifecycleSequence,
        responseSequence: null,
        invocationId: String(operation?.invocationId || ""),
        navigationKind: String(navigationKind),
        method: request.method(),
        path: urlTarget(request.url()),
        resourceType: request.resourceType(),
        sameOrigin: urlOrigin(request.url()) === urlOrigin(httpBase),
        correlationPresent: Boolean(correlationId),
        correlationDigest: correlationId
          ? createHash("sha256").update(correlationId).digest("hex")
          : "",
        redirected: Boolean(redirectedFrom),
        requestId,
        responseStatus: 0,
        responseBound: false,
        listenerActive: requestListenerEndSequence === null,
      };
      if (requestListenerEndSequence !== null) {
        documentNavigationAfterListenerEndCount += 1;
      }
      documentNavigationLedger.push(ledgerEntry);
      documentNavigationByRequestId.set(requestId, ledgerEntry);
    }
  });
  page.on("response", response => {
    const { request, initiatingRequest } =
      bindPlaywrightResponseToInitiatingRequest(
        response,
        pendingRequests,
        requestIdentityRegistry,
      );
    const correlationId = String(initiatingRequest?.correlationId || "");
    const requestKind = request.isNavigationRequest() && request.frame() === page.mainFrame()
      ? "document-navigation"
      : (request.resourceType() === "fetch" ? "application-fetch" : "subresource");
    const entry = {
      phase: "response",
      requestId: String(initiatingRequest?.requestId || ""),
      caseRequestIdentity: String(initiatingRequest?.caseRequestIdentity || ""),
      caseRequestSequence: initiatingRequest?.caseRequestSequence || null,
      responseRequestObjectObserved: Boolean(initiatingRequest),
      requestIdentitySource: initiatingRequest ? "playwright-response-request" : "",
      requestKind,
      resourceType: request.resourceType(),
      sameOrigin: urlOrigin(response.url()) === urlOrigin(httpBase),
      correlationId,
      correlationSource: correlationId ? "request-header" : "none",
      responseCorrelationSource: correlationId
        ? "initiating-request-identity"
        : "none",
      requestHeaderDigest: String(initiatingRequest?.requestHeaderDigest || ""),
      correlationRouteState: String(initiatingRequest?.correlationRouteState || "correlation-absent"),
      correlationRouteActionId: String(initiatingRequest?.correlationRouteActionId || ""),
      correlationRouteDigest: String(initiatingRequest?.correlationRouteDigest || ""),
      responseEchoHeaderContract: "not-required",
      responseEchoHeaderObserved: false,
      initiatorActionId: String(initiatingRequest?.initiatorActionId || ""),
      renderCycleId: String(initiatingRequest?.renderCycleId || ""),
      requestOwnershipKind: String(initiatingRequest?.requestOwnershipKind || ""),
      requestStartedAtMs: Number(initiatingRequest?.requestStartedAtMs || 0),
      responseObservedAtMs: Date.now(),
      method: request.method(),
      status: response.status(),
      httpOk: response.ok(),
      url: response.url(),
      responseHeaders: {
        "content-type": String(response.headers()["content-type"] || ""),
      },
    };
    networkEntries.push(entry);
    if (requestKind === "document-navigation") {
      const ledgerEntry = documentNavigationByRequestId.get(entry.requestId);
      if (ledgerEntry) {
        ledgerEntry.responseSequence = ++lifecycleSequence;
        ledgerEntry.responseStatus = response.status();
        ledgerEntry.responseBound = true;
      }
    }
    const clientLiveSessionProjection = captureClientLiveSessionResponseProjection({
      response,
      entry,
      pendingSafeResponseReads,
      safeResponseReadFailures,
    });
    const endpointOwnedProjection = clientLiveSessionProjection || captureEndpointOwnedResponseProjection({
      response,
      entry,
      pendingSafeResponseReads,
      safeResponseReadFailures,
    });
    if (endpointOwnedProjection) {
      // 공용 response listener projection이 endpoint-action evidence를 소유한다.
    } else if (captureOpsIncidentTimelineResponseProjection({
      response,
      entry,
      pendingSafeResponseReads,
      safeResponseReadFailures,
    })) {
      // Ops timeline refresh response는 raw payload 없이 EventRecord safe projection만 보존한다.
    } else if (captureDiagnosticMarkerResponseProjection({
      response,
      entry,
      probe: diagnosticMarkerProbe,
      pendingSafeResponseReads,
      safeResponseReadFailures,
    })) {
      // dashboard 소유 log-tail 응답은 marker 원문 없이 stage evidence만 보존한다.
    } else if (request.method() === "POST" && /^\/client\/api\/views\/[^/]+\/webrtc\/session$/.test(urlPath(response.url()))) {
      const read = response.json()
        .then(payload => {
          entry.safeResponseBody = {
            sessionId: typeof payload?.sessionId === "string" ? payload.sessionId : "",
            offerReceived: typeof payload?.offer === "string" && payload.offer.length > 0,
          };
        })
        .catch(() => {
          entry.safeResponseBody = { sessionId: "", offerReceived: false };
        })
        .finally(() => pendingSafeResponseReads.delete(read));
      pendingSafeResponseReads.add(read);
    } else if (request.method() === "POST" && [
      "/ops/api/users",
      "/ops/api/invites",
      "/client/api/access-requests",
    ].includes(urlPath(response.url()))) {
      const read = response.json()
        .then(payload => {
          if (urlPath(response.url()) === "/ops/api/invites") {
            const issuedToken = typeof payload?.invite?.token === "string" ? payload.invite.token : "";
            if (issuedToken) {
              observedRuntimeSecrets.add(issuedToken);
              if (typeof onRuntimeSecret !== "function") {
                throw new Error("invite response runtime secret sink is unavailable");
              }
              onRuntimeSecret({ kind: "issued-invite-token", value: issuedToken });
            }
          }
          entry.safeResponseBody = safeFormResponseProjection(urlPath(response.url()), payload);
        })
        .catch(() => {
          safeResponseReadFailures.push(
            `form response projection failed for POST ${urlPath(response.url())}: response parsing or runtime secret registration failed`,
          );
          entry.safeResponseBody = safeFormResponseProjection(urlPath(response.url()), null);
        })
        .finally(() => pendingSafeResponseReads.delete(read));
      pendingSafeResponseReads.add(read);
    }
  });
  page.on("requestfinished", request => pendingRequests.delete(request));
  page.on("requestfailed", request => pendingRequests.delete(request));
  requestListenersInstalled = true;
  const navigationRequestedPath = urlTarget(new URL(pagePath, `${httpBase}/`).toString());
  const navigationOrigin = urlOrigin(new URL(pagePath, `${httpBase}/`).toString());
  const performNavigation = async (nextPagePath, {
    invocationId = "",
    kind = "explicit-navigation",
    allowCorrelation = Boolean(activeCorrelationId),
  } = {}) => {
    if (requestListenerEndSequence !== null) {
      throw new Error(`document navigation attempted after listener end: ${nextPagePath}`);
    }
    const operation = {
      invocationId: String(invocationId || `native-document-navigation-${++navigationOperationSequence}`),
      kind,
      allowCorrelation,
    };
    activeNavigationOperation = operation;
    try {
      const response = await page.goto(new URL(nextPagePath, `${httpBase}/`).toString(), {
        waitUntil: "load",
        timeout: timeoutMs,
      });
      return { status: response?.status() || 0, url: page.url(), invocationId: operation.invocationId };
    } finally {
      activeNavigationOperation = null;
    }
  };
  const navigationResponse = await performNavigation(pagePath, {
    invocationId: String(navigationInvocationId),
    kind: "initial-document-navigation",
    allowCorrelation: Boolean(navigationCorrelationId),
  });
  activeCorrelationId = "";
  const buildNavigationEvidence = ({
    requestedPath = navigationRequestedPath,
    invocationId = String(navigationInvocationId),
    response = navigationResponse,
    ledger = documentNavigationLedger,
    scopedNetworkEntries = networkEntries,
  } = {}) => {
    const candidates = ledger.filter(entry =>
      entry.method === "GET" &&
      entry.path === requestedPath &&
      (!invocationId || entry.invocationId === invocationId));
    const responses = candidates.filter(entry => entry.responseBound);
    const first = candidates[0] || null;
    const redirectCount = ledger.filter(entry => entry.redirected).length;
    const unownedNavigationCount = ledger.filter(entry =>
      entry.navigationKind === "unowned-document-navigation").length;
    const reloadCount = ledger.filter(entry =>
      entry.navigationKind === "reload").length;
    const additionalFetchCount = scopedNetworkEntries.filter(entry =>
      entry.phase === "request-start" &&
      entry.requestKind === "application-fetch" &&
      urlTarget(entry.url) === requestedPath).length;
    return {
      status: response.status || first?.responseStatus || 0,
      url: response.url || (first ? new URL(first.path, `${httpBase}/`).toString() : ""),
      invocationId,
      requestKind: "document-navigation",
      resourceType: candidates.length === 1 ? String(first?.resourceType || "") : "",
      method: "GET",
      requestedPath,
      observedPath: urlTarget(response.url),
      sameOrigin: Boolean(navigationOrigin) &&
        ledger.every(entry => entry.sameOrigin === true),
      requestAttemptCount: candidates.length,
      requestCandidateCount: candidates.length,
      responseCandidateCount: responses.length,
      requestResponseBound: candidates.length === 1 &&
        responses.length === 1 &&
        candidates[0].requestId === responses[0].requestId,
      correlationObserved: ledger.some(entry => entry.correlationPresent),
      redirectCount,
      retryCount: 0,
      reloadCount,
      unownedNavigationCount,
      additionalFetchCount,
      requestReissued: candidates.length !== 1,
      totalDocumentNavigationCount: ledger.length,
      orderedDocumentNavigations: ledger.map(entry => ({
        sequence: entry.sequence,
        responseSequence: entry.responseSequence,
        invocationId: entry.invocationId,
        navigationKind: entry.navigationKind,
        method: entry.method,
        path: entry.path,
        resourceType: entry.resourceType,
        sameOrigin: entry.sameOrigin,
        correlationPresent: entry.correlationPresent,
        correlationDigest: entry.correlationDigest,
        redirected: entry.redirected,
        responseStatus: entry.responseStatus,
        responseBound: entry.responseBound,
      })),
      listenerStartSequence: requestListenerStartSequence,
      listenerEndSequence: requestListenerEndSequence,
      listenerActive: requestListenerEndSequence === null,
      listenerInstalledBeforeFirstNavigation: Boolean(first) &&
        requestListenerStartSequence > 0 &&
        first.sequence > requestListenerStartSequence,
      navigationAfterListenerEndCount: documentNavigationAfterListenerEndCount,
    };
  };
  const finalizeNavigationLedger = () => {
    if (requestListenerEndSequence === null) {
      requestListenerEndSequence = ++lifecycleSequence;
      requestListenersInstalled = false;
    }
    return buildNavigationEvidence();
  };
  return {
    get navigation() {
      return buildNavigationEvidence();
    },
    finalizeNavigationLedger,
    waitForSelector: (selector, options = {}) => page.locator(selector).waitFor({ state: options.state || "visible", timeout: options.timeout || timeoutMs }),
    navigate: async (nextPagePath, {
      invocationId = "",
      kind = "explicit-navigation",
    } = {}) => {
      const ledgerStart = documentNavigationLedger.length;
      const networkStart = networkEntries.length;
      const response = await performNavigation(nextPagePath, {
        invocationId,
        kind,
        allowCorrelation: false,
      });
      const observedInvocationId = response.invocationId;
      return buildNavigationEvidence({
        requestedPath: urlTarget(new URL(nextPagePath, `${httpBase}/`).toString()),
        invocationId: observedInvocationId,
        response,
        ledger: documentNavigationLedger.slice(ledgerStart),
        scopedNetworkEntries: networkEntries.slice(networkStart),
      });
    },
    setCorrelationId: async (correlationId, { inject = true } = {}) => {
      activeCorrelationId = String(correlationId || "");
      activeCorrelationInjectionEnabled = Boolean(activeCorrelationId) && inject === true;
    },
    clickWithRequestOwnership: async ({
      selector,
      actionId,
      correlationId,
      renderCycleId,
      targetMethod = "GET",
      targetPath,
      renderSelector = "",
      expectedRenderPhase = "dom-committed",
      minimumObservationMs = 500,
      quietMs = 200,
    } = {}) => {
      const ownedActionId = String(actionId || "");
      const ownedCorrelationId = String(correlationId || "");
      const ownedRenderCycleId = String(renderCycleId || "");
      const expectedMethod = String(targetMethod || "GET").toUpperCase();
      const expectedPath = urlTarget(String(targetPath || ""));
      if (!ownedActionId || !ownedCorrelationId || !ownedRenderCycleId || !expectedPath) {
        throw new Error("owned request action/correlation/render-cycle binding is incomplete");
      }
      if (activeRequestOwnership) {
        throw new Error("nested request action ownership is forbidden");
      }
      const previousCorrelationId = activeCorrelationId;
      const previousCorrelationInjectionEnabled = activeCorrelationInjectionEnabled;
      const networkStart = networkEntries.length;
      const actionStartedAtMs = Date.now();
      if (renderSelector) {
        await page.evaluate(({ ownedActionId: browserActionId, ownedRenderCycleId: browserCycleId, renderSelector: browserSelector }) => {
          const previous = globalThis.__mediaServerDiagnosticOwnedRenderCycle;
          if (previous?.observer && typeof previous.observer.disconnect === "function") {
            previous.observer.disconnect();
          }
          const owner = document.querySelector(browserSelector);
          if (!owner) throw new Error(`owned render selector missing: ${browserSelector}`);
          const tracker = {
            actionId: browserActionId,
            renderCycleId: browserCycleId,
            startedAtMs: Date.now(),
            phaseMutationCount: 0,
            domMutationCount: 0,
            initialPhase: String(owner.getAttribute("data-incident-render-phase") || ""),
            finalPhase: "",
            completedAtMs: 0,
            observer: null,
          };
          tracker.observer = new MutationObserver(records => {
            for (const record of records) {
              if (record.type === "attributes" && record.attributeName === "data-incident-render-phase") {
                tracker.phaseMutationCount += 1;
              }
              if (record.type === "childList") tracker.domMutationCount += 1;
            }
          });
          tracker.observer.observe(owner, {
            attributes: true,
            attributeFilter: ["data-incident-render-phase"],
            childList: true,
            subtree: true,
          });
          globalThis.__mediaServerDiagnosticOwnedRenderCycle = tracker;
        }, {
          ownedActionId,
          ownedRenderCycleId,
          renderSelector,
        });
      }
      activeRequestOwnership = {
        actionId: ownedActionId,
        renderCycleId: ownedRenderCycleId,
        ownershipKind: "case-owned-refresh-action",
      };
      activeCorrelationId = ownedCorrelationId;
      activeCorrelationInjectionEnabled = true;
      try {
        await page.locator(String(selector || "")).click();
        const quietDeadline = Date.now() + timeoutMs;
        let lastEntryCount = networkEntries.length;
        let quietStartedAt = Date.now();
        let quietObserved = false;
        while (Date.now() < quietDeadline) {
          const currentEntryCount = networkEntries.length;
          if (currentEntryCount !== lastEntryCount) {
            lastEntryCount = currentEntryCount;
            quietStartedAt = Date.now();
          }
          const actionPending = [...pendingRequests.values()].some(item =>
            item.initiatorActionId === ownedActionId &&
            item.renderCycleId === ownedRenderCycleId);
          if (Date.now() - actionStartedAtMs >= minimumObservationMs &&
              !actionPending && pendingSafeResponseReads.size === 0 &&
              Date.now() - quietStartedAt >= quietMs) {
            quietObserved = true;
            break;
          }
          await page.waitForTimeout(25);
        }
        if (!quietObserved) {
          throw new Error(`owned request action network quiet timeout: ${ownedActionId}`);
        }
        if (safeResponseReadFailures.length > 0) {
          throw new Error(formatSafeResponseReadFailure(safeResponseReadFailures));
        }
        if (renderSelector) {
          await page.waitForFunction(({ browserSelector, browserExpectedPhase }) =>
            document.querySelector(browserSelector)?.getAttribute("data-incident-render-phase") === browserExpectedPhase,
          { browserSelector: renderSelector, browserExpectedPhase: expectedRenderPhase },
          { timeout: timeoutMs });
        }
        const scopedEntries = networkEntries.slice(networkStart);
        const requests = scopedEntries.filter(entry =>
          entry.phase === "request-start" &&
          entry.method === expectedMethod &&
          urlTarget(entry.url) === expectedPath &&
          entry.initiatorActionId === ownedActionId &&
          entry.renderCycleId === ownedRenderCycleId);
        const responses = scopedEntries.filter(entry =>
          entry.phase === "response" &&
          entry.method === expectedMethod &&
          urlTarget(entry.url) === expectedPath &&
          entry.initiatorActionId === ownedActionId &&
          entry.renderCycleId === ownedRenderCycleId);
        const request = requests.length === 1 ? requests[0] : null;
        const response = responses.length === 1 ? responses[0] : null;
        const identityMatched = Boolean(request && response &&
          response.responseRequestObjectObserved === true &&
          response.requestIdentitySource === "playwright-response-request" &&
          response.requestId === request.requestId &&
          response.caseRequestIdentity === request.caseRequestIdentity &&
          response.caseRequestSequence === request.caseRequestSequence);
        const renderObservation = renderSelector
          ? await page.evaluate(({ browserExpectedPhase, browserSelector }) => {
              const tracker = globalThis.__mediaServerDiagnosticOwnedRenderCycle || {};
              tracker.observer?.disconnect?.();
              tracker.finalPhase = String(document.querySelector(browserSelector)?.getAttribute("data-incident-render-phase") || "");
              tracker.completedAtMs = Date.now();
              const safe = {
                actionId: String(tracker.actionId || ""),
                renderCycleId: String(tracker.renderCycleId || ""),
                startedAtMs: Number(tracker.startedAtMs || 0),
                completedAtMs: Number(tracker.completedAtMs || 0),
                initialPhase: String(tracker.initialPhase || ""),
                finalPhase: String(tracker.finalPhase || ""),
                phaseMutationCount: Number(tracker.phaseMutationCount || 0),
                domMutationCount: Number(tracker.domMutationCount || 0),
                expectedPhaseMatched: tracker.finalPhase === browserExpectedPhase,
              };
              globalThis.__mediaServerDiagnosticOwnedRenderCycle = safe;
              return safe;
            }, {
              browserExpectedPhase: expectedRenderPhase,
              browserSelector: renderSelector,
            })
          : null;
        const result = {
          schema: "media-server.v390-ui-owned-request-render-cycle.v1",
          actionId: ownedActionId,
          renderCycleId: ownedRenderCycleId,
          correlationDigest: createHash("sha256").update(ownedCorrelationId).digest("hex"),
          method: expectedMethod,
          path: expectedPath,
          requestCandidateCount: requests.length,
          responseCandidateCount: responses.length,
          requestIdentityDigest: request?.caseRequestIdentity
            ? createHash("sha256").update(String(request.caseRequestIdentity)).digest("hex")
            : "",
          requestSequence: Number.isInteger(request?.caseRequestSequence)
            ? request.caseRequestSequence
            : 0,
          requestStartedAtMs: Number(request?.requestStartedAtMs || 0),
          responseObservedAtMs: Number(response?.responseObservedAtMs || 0),
          status: Number(response?.status || 0),
          responseRequestObjectObserved: response?.responseRequestObjectObserved === true,
          identityMatched,
          correlationRouteState: String(request?.correlationRouteState || ""),
          correlationRouteActionId: String(request?.correlationRouteActionId || ""),
          correlationRouteDigest: String(request?.correlationRouteDigest || ""),
          renderObservation,
          safeResponseProjectionSource: String(response?.safeResponseProjectionSource || ""),
          safeResponseProjectionKind: String(response?.safeResponseProjectionKind || ""),
          safeResponseForbiddenMaterialObserved:
            response?.safeResponseForbiddenMaterialObserved === true,
          safeResponseBody: response?.safeResponseBody
            ? structuredClone(response.safeResponseBody)
            : null,
        };
        Object.defineProperty(result, "networkEntries", {
          value: scopedEntries.map(entry => ({ ...entry })),
          enumerable: false,
        });
        return result;
      } finally {
        activeRequestOwnership = null;
        activeCorrelationId = previousCorrelationId;
        activeCorrelationInjectionEnabled = previousCorrelationInjectionEnabled;
        if (renderSelector) {
          await page.evaluate(() => {
            globalThis.__mediaServerDiagnosticOwnedRenderCycle?.observer?.disconnect?.();
          }).catch(() => {});
        }
      }
    },
    armDiagnosticMarkerProbe: ({
      caseId: probeCaseId,
      marker,
      method = "GET",
      urlPath: probePath,
      ownedNoisePrefix = "",
    } = {}) => {
      if (probeCaseId !== "EVT-004") {
        throw new Error("diagnostic marker response probe is limited to EVT-004");
      }
      if (diagnosticMarkerProbe?.armed) {
        throw new Error("diagnostic marker response probe was armed more than once");
      }
      diagnosticMarkerProbe = {
        armed: true,
        caseId: probeCaseId,
        marker: String(marker || ""),
        method: String(method || "").toUpperCase(),
        urlPath: urlTarget(probePath),
        ownedNoisePrefix: String(ownedNoisePrefix || ""),
        captures: [],
        readFailureCount: 0,
      };
    },
    diagnosticMarkerProbeEvidence: async () => {
      await Promise.all([...pendingSafeResponseReads]);
      if (!diagnosticMarkerProbe?.armed) {
        return buildDiagnosticMarkerResponseStageEvidence({});
      }
      return buildDiagnosticMarkerResponseStageEvidence(diagnosticMarkerProbe);
    },
    replaceStorageState: async (storageStatePath = "") => {
      await context.clearCookies();
      if (!storageStatePath) return;
      const state = JSON.parse(fs.readFileSync(storageStatePath, "utf8"));
      if (Array.isArray(state.cookies) && state.cookies.length > 0) {
        await context.addCookies(state.cookies);
      }
      for (const origin of Array.isArray(state.origins) ? state.origins : []) {
        if (!origin?.origin || !Array.isArray(origin.localStorage)) continue;
        await page.goto(origin.origin, { waitUntil: "load", timeout: timeoutMs });
        await page.evaluate(entries => {
          for (const entry of entries) localStorage.setItem(entry.name, entry.value);
        }, origin.localStorage);
      }
    },
    request: async ({
      method = "GET",
      urlPath,
      actionId = "",
      correlationId = "",
      renderCycleId = "",
      ownershipKind = "diagnostic-authoritative-readback",
    }) => {
      const requestMethod = String(method).toUpperCase();
      const requestPath = String(urlPath);
      const expectedPath = urlTarget(requestPath);
      const networkStart = networkEntries.length;
      const routeFailureStart = correlationRouteFailures.length;
      const startedAt = Date.now();
      if (activeRequestOwnership) {
        throw new Error("nested request action ownership is forbidden");
      }
      const explicitCorrelationId = String(correlationId || "");
      const ownedActionId = String(actionId || "");
      if (explicitCorrelationId && !ownedActionId) {
        throw new Error("explicit request correlation requires an action ID");
      }
      if (explicitCorrelationId && activeExplicitCorrelationRegistration) {
        throw new Error("nested explicit correlation registration is forbidden");
      }
      const explicitRegistration = explicitCorrelationId
        ? {
            active: true,
            scopeSequence: ++explicitCorrelationScopeSequence,
            caseId: String(caseId || ""),
            actionId: ownedActionId,
            correlationId: explicitCorrelationId,
            outerCorrelationId: String(activeCorrelationId || ""),
          }
        : null;
      activeExplicitCorrelationRegistration = explicitRegistration;
      activeRequestOwnership = {
        actionId: ownedActionId,
        renderCycleId: String(renderCycleId || ""),
        ownershipKind: String(ownershipKind || "diagnostic-authoritative-readback"),
      };
      let response;
      try {
        response = await page.evaluate(async ({
          requestMethod: evaluatedMethod,
          requestPath: evaluatedPath,
          requestCorrelationId,
        }) => {
          const result = await fetch(evaluatedPath, {
            method: evaluatedMethod,
            credentials: "same-origin",
            cache: "no-store",
            redirect: "follow",
            headers: requestCorrelationId
              ? { "x-media-server-correlation-id": requestCorrelationId }
              : {},
          });
          const text = await result.text();
          let json = null;
          try { json = text ? JSON.parse(text) : null; } catch (_) {}
          return {
            status: result.status,
            url: result.url,
            text,
            json,
            contentType: result.headers.get("content-type") || "",
          };
        }, {
          requestMethod,
          requestPath,
          requestCorrelationId: explicitCorrelationId,
        });
      } catch (error) {
        const routeFailure = correlationRouteFailures.slice(routeFailureStart)
          .find(item => item.actionId === ownedActionId) || null;
        if (routeFailure) {
          const failure = new Error(
            `request correlation route rejected: ${routeFailure.failureCode}`,
          );
          failure.failureCode = routeFailure.failureCode;
          throw failure;
        }
        throw error;
      } finally {
        if (explicitRegistration) explicitRegistration.active = false;
        activeExplicitCorrelationRegistration = null;
        activeRequestOwnership = null;
      }
      const deadline = Date.now() + Math.min(timeoutMs, 1000);
      let ledgerSettled = false;
      while (Date.now() <= deadline) {
        const window = networkEntries.slice(networkStart);
        const requests = window.filter(entry =>
          entry.phase === "request-start" &&
          entry.method === requestMethod &&
          urlTarget(entry.url) === expectedPath);
        const responses = window.filter(entry =>
          entry.phase === "response" &&
          entry.method === requestMethod &&
          urlTarget(entry.url) === expectedPath);
        if (requests.length > 0 && responses.length > 0) {
          ledgerSettled = true;
          break;
        }
        await page.waitForTimeout(10);
      }
      const requestEntry = networkEntries.slice(networkStart).find(entry =>
        entry.phase === "request-start" &&
        entry.method === requestMethod &&
        urlTarget(entry.url) === expectedPath) || null;
      return {
        status: response.status,
        url: response.url,
        text: response.text,
        json: response.json,
        contentType: response.contentType,
        actionId: String(actionId),
        requestKind: "application-fetch",
        requestAttemptCount: 1,
        requestReissued: false,
        listenerInstalledBeforeRequest: requestListenersInstalled,
        ledgerSettled,
        ledgerWaitMs: Date.now() - startedAt,
        correlationRouteState: String(requestEntry?.correlationRouteState || ""),
        correlationRouteActionId: String(requestEntry?.correlationRouteActionId || ""),
        correlationRouteDigest: String(requestEntry?.correlationRouteDigest || ""),
      };
    },
    requestListenersInstalled: () => requestListenersInstalled,
    waitForNetworkQuiet: async ({ correlationId, minimumObservationMs = 750, quietMs = 250 } = {}) => {
      const startedAt = Date.now();
      const deadline = startedAt + timeoutMs;
      const correlatedEntryCount = () => networkEntries.reduce((count, entry) =>
        count + ((!correlationId || entry.correlationId === correlationId) ? 1 : 0), 0);
      let lastEntryCount = correlatedEntryCount();
      let quietStartedAt = Date.now();
      while (Date.now() < deadline) {
        const currentEntryCount = correlatedEntryCount();
        if (currentEntryCount !== lastEntryCount) {
          lastEntryCount = currentEntryCount;
          quietStartedAt = Date.now();
        }
        const actionPending = [...pendingRequests.values()].some(item =>
          !correlationId || item.correlationId === correlationId);
        if (Date.now() - startedAt >= minimumObservationMs &&
            !actionPending && pendingSafeResponseReads.size === 0 &&
            Date.now() - quietStartedAt >= quietMs) {
          if (safeResponseReadFailures.length > 0) {
            throw new Error(formatSafeResponseReadFailure(safeResponseReadFailures));
          }
          return {
            correlationId: correlationId || "",
            observedMs: Date.now() - startedAt,
            entryCount: currentEntryCount,
          };
        }
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw new Error(`network quiet timeout for correlation ${correlationId || "(any)"}`);
    },
    click: async (selector) => {
      await page.locator(selector).click();
    },
    submitDocumentForm: async (selector, {
      invocationId = "",
    } = {}) => {
      if (requestListenerEndSequence !== null) {
        throw new Error(`document form submission attempted after listener end: ${selector}`);
      }
      const operation = {
        invocationId: String(invocationId || `native-document-form-${++navigationOperationSequence}`),
        kind: "form-submit-document-navigation",
        allowCorrelation: false,
      };
      activeNavigationOperation = operation;
      try {
        await page.locator(selector).click();
        return { invocationId: operation.invocationId };
      } finally {
        activeNavigationOperation = null;
      }
    },
    fill: async (selector, value) => {
      await page.locator(selector).fill(String(value));
    },
    type: async (selector, value) => {
      await page.locator(selector).pressSequentially(String(value));
    },
    select: async (selector, value) => {
      await page.locator(selector).selectOption(String(value));
    },
    waitForText: async (selector, expected, waitTimeoutMs = timeoutMs) => {
      await page.locator(selector).filter({ hasText: String(expected) }).waitFor({ state: "visible", timeout: waitTimeoutMs });
      return page.locator(selector).innerText();
    },
    registerRuntimeSecret: value => {
      if (typeof value === "string" && value) observedRuntimeSecrets.add(value);
    },
    captureInviteRuntimeSecret: async (selector = "#invite-create-output") => {
      const captured = await page.evaluate(({ targetSelector, replacement }) => {
        const target = document.querySelector(targetSelector);
        const text = String(target?.textContent || "");
        const tokenLineMatch = text.match(/(?:^|\n)\s*토큰:\s*([^\s]+)\s*(?:\n|$)/);
        const setupUrlMatch = text.match(/\/invite\/setup\?token=([^\s]+)/);
        let secret = String(tokenLineMatch?.[1] || "");
        if (!secret && setupUrlMatch?.[1]) {
          try {
            secret = decodeURIComponent(setupUrlMatch[1]);
          } catch {
            secret = String(setupUrlMatch[1]);
          }
        }
        if (!secret) return {
          secret: "",
          redactedNodes: 0,
          targetExists: Boolean(target),
          textPresent: text.length > 0,
          tokenLinePresent: text.includes("토큰:"),
          setupUrlPresent: text.includes("/invite/setup?token="),
        };
        const variants = [...new Set([secret, encodeURIComponent(secret)])].filter(Boolean);
        const replaceSecrets = source => {
          let next = String(source || "");
          for (const value of variants) next = next.split(value).join(replacement);
          return next;
        };
        let redactedNodes = 0;
        const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const next = replaceSecrets(node.nodeValue);
          if (next !== node.nodeValue) {
            node.nodeValue = next;
            redactedNodes += 1;
          }
        }
        for (const element of document.querySelectorAll("*")) {
          if ("value" in element && typeof element.value === "string") {
            element.value = replaceSecrets(element.value);
          }
          for (const attribute of [...element.attributes]) {
            const next = replaceSecrets(attribute.value);
            if (next !== attribute.value) element.setAttribute(attribute.name, next);
          }
        }
        return {
          secret,
          redactedNodes,
          targetExists: true,
          textPresent: true,
          tokenLinePresent: Boolean(tokenLineMatch),
          setupUrlPresent: Boolean(setupUrlMatch),
        };
      }, { targetSelector: selector, replacement: "[REDACTED-RUNTIME-SECRET]" });
      if (!captured.secret) {
        return {
          captured: false,
          redactedNodes: 0,
          targetExists: captured.targetExists,
          textPresent: captured.textPresent,
          tokenLinePresent: captured.tokenLinePresent,
          setupUrlPresent: captured.setupUrlPresent,
        };
      }
      observedRuntimeSecrets.add(captured.secret);
      if (typeof onRuntimeSecret !== "function") {
        throw new Error("invite DOM runtime secret sink is unavailable");
      }
      onRuntimeSecret({ kind: "issued-invite-token", value: captured.secret });
      captured.secret = "";
      return {
        captured: true,
        redactedNodes: captured.redactedNodes,
        targetExists: captured.targetExists,
        textPresent: captured.textPresent,
        tokenLinePresent: captured.tokenLinePresent,
        setupUrlPresent: captured.setupUrlPresent,
      };
    },
    cookieHeader: async () => (await context.cookies())
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join("; "),
    redactObservedSecrets: async () => {
      await Promise.all([...pendingSafeResponseReads]);
      if (safeResponseReadFailures.length > 0) {
        throw new Error(formatSafeResponseReadFailure(safeResponseReadFailures));
      }
      const variants = secretVariants([...observedRuntimeSecrets]);
      if (variants.length === 0) {
        return {
          schema: "media-server.v390-ui-runtime-secret-redaction.v1",
          status: "PASS",
          registeredSecrets: 0,
          redactedTextNodes: 0,
          redactedValues: 0,
          redactedAttributes: 0,
          residualSecrets: 0,
        };
      }
      const redactDomPass = () => page.evaluate(({ secretVariants: values, replacement }) => {
        const replaceSecrets = source => {
          let next = String(source || "");
          for (const value of values) next = next.split(value).join(replacement);
          return next;
        };
        let redactedTextNodes = 0;
        let redactedValues = 0;
        let redactedAttributes = 0;
        const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const next = replaceSecrets(node.nodeValue);
          if (next !== node.nodeValue) {
            node.nodeValue = next;
            redactedTextNodes += 1;
          }
        }
        for (const element of document.querySelectorAll("input,textarea,select,option")) {
          if (!("value" in element)) continue;
          const next = replaceSecrets(element.value);
          if (next !== element.value) {
            element.value = next;
            redactedValues += 1;
          }
        }
        for (const element of document.querySelectorAll("*")) {
          for (const attribute of [...element.attributes]) {
            const next = replaceSecrets(attribute.value);
            if (next !== attribute.value) {
              element.setAttribute(attribute.name, next);
              redactedAttributes += 1;
            }
          }
        }
        const serialized = document.documentElement.outerHTML;
        const residualSecrets = values.filter(value => serialized.includes(value)).length;
        return { redactedTextNodes, redactedValues, redactedAttributes, residualSecrets };
      }, { secretVariants: variants, replacement: "[REDACTED-RUNTIME-SECRET]" });
      const result = {
        redactedTextNodes: 0,
        redactedValues: 0,
        redactedAttributes: 0,
        residualSecrets: 0,
      };
      for (let pass = 0; pass < 5; pass += 1) {
        const observed = await redactDomPass();
        result.redactedTextNodes += observed.redactedTextNodes;
        result.redactedValues += observed.redactedValues;
        result.redactedAttributes += observed.redactedAttributes;
        result.residualSecrets = observed.residualSecrets;
        if (pass < 4) await page.waitForTimeout(50);
      }
      if (result.residualSecrets !== 0) {
        throw new Error("runtime secret remained in the evidence DOM after redaction");
      }
      return {
        schema: "media-server.v390-ui-runtime-secret-redaction.v1",
        status: "PASS",
        registeredSecrets: observedRuntimeSecrets.size,
        ...result,
      };
    },
    snapshot: async (selector) => sanitizeEvidenceValue(await page.evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      const rect = element ? element.getBoundingClientRect() : null;
      const style = element ? getComputedStyle(element) : null;
      return {
        selector: ${JSON.stringify(selector)},
        exists: Boolean(element),
        visible: Boolean(rect && rect.width > 0 && rect.height > 0 && style && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0),
        tag: String(element?.tagName || '').toLowerCase(),
        hidden: Boolean(element?.hidden),
        disabled: Boolean(element && 'disabled' in element && element.disabled),
        readOnly: Boolean(element && 'readOnly' in element && element.readOnly),
        open: Boolean(element && 'open' in element && element.open),
        href: String(element?.getAttribute?.('href') || ''),
        title: String(element?.getAttribute?.('title') || ''),
        ariaLabel: String(element?.getAttribute?.('aria-label') || ''),
        ariaPressed: String(element?.getAttribute?.('aria-pressed') || ''),
        text: String(element?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 4000),
        value: element && 'value' in element ? String(element.value || '') : '',
        checked: Boolean(element && 'checked' in element && element.checked),
        selectedValues: element?.tagName === 'SELECT' ? Array.from(element.selectedOptions).map(option => String(option.value)) : [],
        optionValues: element?.tagName === 'SELECT' ? Array.from(element.options).filter(option => !option.disabled).map(option => String(option.value)) : [],
        url: location.href,
      };
    })()`), observedRuntimeSecrets),
    measureVisualState: async (selector = "body", {
      caseBinding = null,
      requestedTheme = colorScheme,
      liveVideoSpec = null,
      liveCorrelationId = "",
    } = {}) => {
      const geometry = await page.evaluate(async ({ targetSelector, binding, requestedThemeValue, liveSpec }) => {
        if (document.fonts?.ready) await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const target = document.querySelector(targetSelector);
        const rectValue = element => {
          const rect = element?.getBoundingClientRect?.();
          if (!rect) return null;
          return { x: rect.x, y: rect.y, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        };
        const isVisible = element => {
          const rect = element?.getBoundingClientRect?.();
          const style = element ? getComputedStyle(element) : null;
          return Boolean(rect && rect.width > 0 && rect.height > 0 && style && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0);
        };
        const effectiveBackground = element => {
          let current = element;
          while (current) {
            const value = getComputedStyle(current).backgroundColor;
            const match = value.match(/^rgba?\(\s*[0-9.]+[, ]+[0-9.]+[, ]+[0-9.]+(?:\s*[,/]\s*([0-9.]+))?\s*\)$/i);
            const alpha = value.startsWith("rgb(") ? 1 : Number(match?.[1] || 0);
            if (alpha >= 0.99) return value;
            current = current.parentElement;
          }
          return document.documentElement.dataset.theme === "dark" ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)";
        };
        const elements = Array.from(document.querySelectorAll("body *")).filter(isVisible).slice(0, 400);
        const textSamples = elements.filter(element => String(element.innerText || "").trim().length > 0).slice(0, 120).map(element => {
          const style = getComputedStyle(element);
          return { foreground: style.color, background: effectiveBackground(element), fontSizePx: Number.parseFloat(style.fontSize || "0"), fontWeight: style.fontWeight, rect: rectValue(element) };
        });
        const roleResponse = await fetch("/auth/whoami", { credentials: "same-origin", cache: "no-store" });
        let accountRole = "";
        if (roleResponse.status === 401) accountRole = "anonymous";
        else if (roleResponse.ok) {
          const principal = await roleResponse.json();
          if (principal?.authenticated === false) accountRole = "anonymous";
          else if (principal?.authenticated === true && typeof principal?.role === "string") accountRole = principal.role;
        }
        const sampleLive = () => {
          if (!liveSpec) return null;
          const tile = document.querySelector(liveSpec.tileSelector);
          const stage = document.querySelector(liveSpec.stageSelector);
          const video = document.querySelector(liveSpec.videoSelector);
          const placeholder = document.querySelector(liveSpec.placeholderSelector);
          const modeControls = document.querySelector(liveSpec.modeControlsSelector);
          const mode = document.querySelector(liveSpec.modeSelector);
          if (!tile) return null;
          const tileIdentity = `tile-${String(tile.getAttribute("data-tile") || "")}:${String(tile.getAttribute("data-view-id") || "")}`;
          const stageRect = rectValue(stage);
          const videoRect = rectValue(video);
          let contentRect = null;
          if (videoRect && Number(video?.videoWidth || 0) > 0 && Number(video?.videoHeight || 0) > 0) {
            const intrinsicRatio = Number(video.videoWidth) / Number(video.videoHeight);
            const elementRatio = videoRect.width / videoRect.height;
            const contentWidth = elementRatio > intrinsicRatio ? videoRect.height * intrinsicRatio : videoRect.width;
            const contentHeight = elementRatio > intrinsicRatio ? videoRect.height : videoRect.width / intrinsicRatio;
            const left = videoRect.left + (videoRect.width - contentWidth) / 2;
            const top = videoRect.top + (videoRect.height - contentHeight) / 2;
            contentRect = { left, top, right: left + contentWidth, bottom: top + contentHeight, width: contentWidth, height: contentHeight };
          }
          const playbackQuality = video?.getVideoPlaybackQuality?.();
          return {
            tileIdentity,
            tile: { selector: liveSpec.tileSelector, identity: tileIdentity, viewId: String(tile.getAttribute("data-view-id") || ""), visible: isVisible(tile), rect: rectValue(tile) },
            stage: { selector: liveSpec.stageSelector, tileIdentity, visible: isVisible(stage), rect: stageRect },
            video: { selector: liveSpec.videoSelector, tileIdentity, visible: isVisible(video), rect: videoRect },
            placeholder: { selector: liveSpec.placeholderSelector, tileIdentity, hidden: Boolean(placeholder?.hidden || !isVisible(placeholder)) },
            modeControls: { selector: liveSpec.modeControlsSelector, tileIdentity, visible: isVisible(modeControls) },
            mode: { selector: liveSpec.modeSelector, tileIdentity, active: Boolean(mode && mode.getAttribute("aria-pressed") === "true"), value: String(mode?.getAttribute("data-mode-action") || "") },
            playback: {
              tileIdentity,
              srcObject: Boolean(video?.srcObject),
              liveVideoTracks: Number(video?.srcObject?.getVideoTracks?.().filter(track => track.readyState === "live").length || 0),
              readyState: Number(video?.readyState || 0),
              videoWidth: Number(video?.videoWidth || 0),
              videoHeight: Number(video?.videoHeight || 0),
              currentTime: Number(video?.currentTime || 0),
              presentedFrames: Number(playbackQuality?.totalVideoFrames || 0),
            },
            rendering: { tileIdentity, objectFit: String(video ? getComputedStyle(video).objectFit : ""), stageRect, contentRect },
            controls: (liveSpec.controlSelectors || []).map(controlSelector => {
              const control = document.querySelector(controlSelector);
              return { selector: controlSelector, tileIdentity, visible: isVisible(control), rect: rectValue(control) };
            }),
            genericDomOverlays: Array.from(document.querySelectorAll("canvas,[data-testid*='overlay' i],[class*='overlay' i]")).filter(isVisible).map(element => ({
              selector: element.id ? `#${element.id}` : String(element.getAttribute("data-testid") || element.className || element.tagName),
              visible: true,
              rect: rectValue(element),
            })),
            video,
          };
        };
        const liveBefore = sampleLive();
        if (liveBefore?.video) {
          await Promise.race([
            new Promise(resolve => {
              if (typeof liveBefore.video.requestVideoFrameCallback === "function") liveBefore.video.requestVideoFrameCallback(() => resolve());
              else setTimeout(resolve, 350);
            }),
            new Promise(resolve => setTimeout(resolve, 600)),
          ]);
        }
        const liveAfter = sampleLive();
        const liveVideo = liveAfter ? {
          tile: liveAfter.tile,
          stage: liveAfter.stage,
          video: liveAfter.video,
          placeholder: liveAfter.placeholder,
          modeControls: liveAfter.modeControls,
          mode: liveAfter.mode,
          playback: {
            ...liveAfter.playback,
            currentTimeBefore: Number(liveBefore?.playback?.currentTime || 0),
            currentTimeAfter: Number(liveAfter.playback.currentTime || 0),
            presentedFramesBefore: Number(liveBefore?.playback?.presentedFrames || 0),
            presentedFramesAfter: Number(liveAfter.playback.presentedFrames || 0),
          },
          rendering: liveAfter.rendering,
          controls: liveAfter.controls,
          genericDomOverlays: liveAfter.genericDomOverlays,
        } : null;
        return {
          schema: "media-server.ui-browser-visual-measurement.v2",
          caseBinding: binding,
          route: location.pathname,
          accountRole,
          requestedTheme: requestedThemeValue,
          appliedTheme: document.documentElement.dataset.theme === "dark" ? "dark" : "light",
          mediaTheme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
          viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
          document: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight },
          target: { selector: targetSelector, visible: isVisible(target), rect: rectValue(target) },
          textSamples,
          liveVideo,
        };
      }, {
        targetSelector: String(selector),
        binding: caseBinding,
        requestedThemeValue: String(requestedTheme),
        liveSpec: liveVideoSpec,
      });
      const focusSamples = [];
      for (let index = 0; index < 8; index += 1) {
        await page.keyboard.press("Tab");
        focusSamples.push(await page.evaluate(`(() => {
          const element = document.activeElement;
          const style = element ? getComputedStyle(element) : null;
          const rect = element?.getBoundingClientRect?.();
          return {
            index: ${index},
            tag: String(element?.tagName || '').toLowerCase(),
            id: String(element?.id || ''),
            testId: String(element?.getAttribute?.('data-testid') || ''),
            visible: Boolean(rect && rect.width > 0 && rect.height > 0),
            outlineStyle: String(style?.outlineStyle || ''),
            outlineWidth: String(style?.outlineWidth || ''),
            boxShadow: String(style?.boxShadow || ''),
          };
        })()`));
      }
      if (geometry.liveVideo) {
        await Promise.all([...pendingSafeResponseReads]);
        geometry.liveVideo.session = buildLiveSessionEvidence(
          networkEntries,
          liveCorrelationId,
          geometry.liveVideo.tile?.identity || "",
          geometry.liveVideo.tile?.viewId || "",
        );
      }
      return { ...geometry, focusSamples };
    },
    waitForLiveVideoReady: async ({ videoSelector, modeSelector, timeout = timeoutMs }) => {
      await page.waitForFunction(({ videoSelectorValue, modeSelectorValue }) => {
        const video = document.querySelector(videoSelectorValue);
        const mode = document.querySelector(modeSelectorValue);
        const liveTracks = video?.srcObject?.getVideoTracks?.().filter(track => track.readyState === "live").length || 0;
        return Boolean(mode && mode.getAttribute("aria-pressed") === "true" && video?.readyState >= 2 &&
          video.videoWidth > 0 && video.videoHeight > 0 && liveTracks > 0);
      }, { videoSelectorValue: videoSelector, modeSelectorValue: modeSelector }, { timeout });
    },
    evaluate: (expression, argument) => page.evaluate(expression, argument),
    observeRequestedObservedState: async ({ selector = null, applicability = "required" } = {}) => {
      return page.evaluate(`(async () => {
        const selector = ${JSON.stringify(selector)};
        const applicability = ${JSON.stringify(applicability)};
        const response = await fetch('/auth/whoami', { credentials: 'same-origin', cache: 'no-store' });
        let accountRole = '';
        if (response.status === 401) {
          accountRole = 'anonymous';
        } else {
          if (!response.ok) throw new Error('whoami observation failed with status ' + response.status);
          const principal = await response.json();
          if (principal?.authenticated === false) {
            accountRole = 'anonymous';
          } else if (principal?.authenticated === true && typeof principal?.role === 'string') {
            accountRole = principal.role;
          } else {
            throw new Error('whoami observation returned an invalid authenticated principal');
          }
        }
        const element = selector ? document.querySelector(selector) : null;
        const rect = element?.getBoundingClientRect?.() || null;
        const style = element ? getComputedStyle(element) : null;
        const exists = Boolean(element);
        const visible = Boolean(rect && rect.width > 0 && rect.height > 0 && style &&
          style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0);
        const disabled = Boolean(element && 'disabled' in element && element.disabled);
        return {
          schema: 'media-server.v390-ui-runtime-observed.v1',
          screenRoute: location.pathname,
          accountRole,
          viewport: { width: innerWidth, height: innerHeight },
          theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          controlAction: {
            selector,
            applicability,
            exists,
            visible,
            enabled: visible && !disabled,
          },
          provenance: {
            screenRoute: 'browser-location',
            accountRole: 'session-whoami',
            viewport: 'browser-inner-size',
            theme: 'browser-media-query',
            controlAction: 'dom-selector-state',
          },
        };
      })()`);
    },
    screenshot: async outputFile => {
      await assertEvidenceDomSecretsAbsent(page, observedRuntimeSecrets);
      return page.screenshot({ path: outputFile, fullPage: false });
    },
    consoleEntries: () => sanitizeEvidenceValue(consoleEntries, observedRuntimeSecrets),
    networkEntries: () => sanitizeEvidenceValue(networkEntries.map(item => ({ ...item })), observedRuntimeSecrets),
    close: async () => {
      if (!closePromise) {
        closePromise = (async () => {
          let closeFailure = null;
          try {
            await context.close();
          } catch (error) {
            closeFailure = error;
          }
          try {
            await browser.close();
          } catch (error) {
            closeFailure ||= error;
          }
          const finalNavigation = finalizeNavigationLedger();
          if (closeFailure) {
            closeFailure.navigationLifecycleEvidence = structuredClone(finalNavigation);
            throw closeFailure;
          }
          return finalNavigation;
        })();
      }
      return closePromise;
    },
  };
}

function secretVariants(values) {
  const variants = new Set();
  for (const value of values) {
    if (typeof value !== "string" || !value) continue;
    variants.add(value);
    variants.add(encodeURIComponent(value));
    variants.add(new URLSearchParams({ value }).toString().slice("value=".length));
  }
  return [...variants].filter(Boolean).sort((left, right) => right.length - left.length);
}

function sanitizeEvidenceValue(value, secrets) {
  const variants = secretVariants([...secrets]);
  const sanitizeString = source => {
    let next = source;
    for (const secret of variants) next = next.split(secret).join("[REDACTED-RUNTIME-SECRET]");
    return next;
  };
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map(item => sanitizeEvidenceValue(item, secrets));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeEvidenceValue(item, secrets)]));
  }
  return value;
}

async function assertEvidenceDomSecretsAbsent(page, secrets) {
  const variants = secretVariants([...secrets]);
  if (variants.length === 0) return;
  const residual = await page.evaluate(values => {
    const serialized = document.documentElement.outerHTML;
    return values.filter(value => serialized.includes(value)).length;
  }, variants);
  if (residual !== 0) throw new Error("runtime secret reached an evidence capture boundary");
}

function unique(values) {
  return [...new Set(values)];
}

function safeRequestBodyProjection(request) {
  try {
    if (!["POST", "PUT", "DELETE"].includes(request.method())) return null;
    const pathname = new URL(request.url()).pathname;
    if (/^\/client\/api\/views\/[^/]+\/webrtc\/session$/.test(pathname)) {
      const parsed = JSON.parse(request.postData() || "{}");
      return {
        overlayMode: typeof parsed.overlayMode === "string" ? parsed.overlayMode : "",
      };
    }
    const allowed = [
      /^\/ops\/api\/(?:sources|views|onvif\/channels|vlm\/profiles|users|invites|access-requests|events\/reviews)(?:\/|$)/,
      /^\/lab\/analysis\/(?:va-rules|rules|profiles)(?:\/|$)/,
      /^\/client\/api\/(?:access-requests|preferences\/live-layout)$/,
      /^\/(?:setup|login|logout|password\/change|invite\/setup)$/,
    ];
    if (!allowed.some(pattern => pattern.test(pathname))) return null;
    const contentType = String(request.headers()["content-type"] || "");
    let parsed = {};
    if (contentType.includes("application/json")) {
      parsed = JSON.parse(request.postData() || "{}");
    } else {
      parsed = Object.fromEntries(new URLSearchParams(request.postData() || ""));
    }
    return safePersistedRequestBodyProjection(parsed);
  } catch {
    return { projectionError: true };
  }
}

function safePersistedRequestBodyProjection(value) {
  const record = value && typeof value === "object" ? value : {};
  const identity = source => ({
    id: String(source?.id || ""),
    sourceId: String(source?.sourceId || ""),
    viewId: String(source?.viewId || ""),
    channelId: String(source?.channelId || ""),
    ruleId: String(source?.ruleId || ""),
    profileId: String(source?.profileId || ""),
    eventId: String(source?.eventId || ""),
    username: String(source?.username || ""),
  });
  const result = {
    identity: identity(record),
    fieldNames: Object.keys(record).filter(name => !/password|token|confirm|credential|secret/i.test(name)).sort(),
  };
  if (record.source && typeof record.source === "object") result.sourceIdentity = identity(record.source);
  if (record.publishedView && typeof record.publishedView === "object") {
    result.publishedViewIdentity = identity(record.publishedView);
  }
  if (record.workspaceLayout && typeof record.workspaceLayout === "object") {
    result.workspaceLayout = {
      gridSize: Number(record.workspaceLayout.gridSize || 0),
      density: String(record.workspaceLayout.density || ""),
      dockSide: String(record.workspaceLayout.dockSide || ""),
    };
  }
  if (typeof record.role === "string") result.role = record.role;
  if (typeof record.reviewStatus === "string") result.reviewStatus = record.reviewStatus;
  return result;
}

function safeFormResponseProjection(pathname, payload) {
  const value = payload && typeof payload === "object" ? payload : {};
  const record = value.accessRequest || value.invite || value.user || {};
  const token = typeof value.invite?.token === "string" ? value.invite.token : "";
  const setupUrl = typeof value.invite?.setupUrl === "string" ? value.invite.setupUrl : "";
  return {
    pathname,
    status: String(value.status || record.status || ""),
    username: String(record.username || ""),
    requestId: String(record.requestId || ""),
    inviteId: String(record.inviteId || ""),
    tokenPresent: token.length > 0,
    setupUrlTokenBound: Boolean(token && setupUrl.includes(encodeURIComponent(token))),
    persistentSecretFieldsPresent: objectContainsKey(value,
      new Set(["passwordHash", "passwordHistory", "tokenHash"])),
  };
}

const endpointOwnedResponsePatterns = Object.freeze([
  Object.freeze({ kind: "auth-user-disable", method: "POST", expectedStatus: 200, pattern: /^\/ops\/api\/users\/([^/]+)\/disable$/ }),
  Object.freeze({ kind: "source-create", method: "POST", expectedStatus: 201, pattern: /^\/ops\/api\/sources$/ }),
  Object.freeze({ kind: "source-disable", method: "DELETE", expectedStatus: 200, pattern: /^\/ops\/api\/sources\/([^/]+)$/ }),
  Object.freeze({ kind: "view-disable", method: "DELETE", expectedStatus: 200, pattern: /^\/ops\/api\/views\/([^/]+)$/ }),
  Object.freeze({ kind: "onvif-import-draft", method: "POST", expectedStatus: 200, pattern: /^\/ops\/api\/onvif\/import-draft$/ }),
]);

const clientLiveSessionResponsePatterns = Object.freeze([
  Object.freeze({
    kind: "client-live-session-create",
    method: "POST",
    expectedStatus: 200,
    pattern: /^\/client\/api\/views\/[^/]+\/webrtc\/session$/,
  }),
  Object.freeze({
    kind: "client-live-session-answer",
    method: "POST",
    expectedStatus: 200,
    pattern: /^\/client\/api\/views\/[^/]+\/webrtc\/session\/[^/]+\/answer$/,
  }),
  Object.freeze({
    kind: "client-live-session-delete",
    method: "DELETE",
    expectedStatus: 200,
    pattern: /^\/client\/api\/views\/[^/]+\/webrtc\/session\/[^/]+$/,
  }),
]);

export function formatSafeResponseReadFailure(failures = []) {
  const reasons = [...new Set(failures.map(value => String(value || "").trim()).filter(Boolean))];
  const suffix = reasons.length > 0 ? `: ${reasons.join("; ")}` : "";
  return `safe response projection or runtime secret registration failed${suffix}`;
}

export function captureClientLiveSessionResponseProjection({
  response,
  entry,
  pendingSafeResponseReads = new Set(),
  safeResponseReadFailures = [],
} = {}) {
  const request = response?.request?.();
  const method = String(request?.method?.() || "").toUpperCase();
  const pathname = urlPath(response?.url?.() || "");
  const descriptor = clientLiveSessionResponsePatterns.find(candidate =>
    candidate.method === method && candidate.pattern.test(pathname));
  if (!descriptor) return null;

  const actualStatus = Number(entry?.status || 0);
  entry.safeResponseProjectionKind = descriptor.kind;
  entry.safeResponseExpectedStatus = descriptor.expectedStatus;
  if (actualStatus !== descriptor.expectedStatus) {
    safeResponseReadFailures.push(
      `client live session response status mismatch [${descriptor.kind}] ${method} ${pathname}: expected status ${descriptor.expectedStatus}, actual status ${actualStatus}`,
    );
    delete entry.safeResponseBody;
    delete entry.safeResponseProjectionSource;
    return Promise.resolve();
  }

  const read = Promise.resolve()
    .then(() => response.json())
    .then(payload => {
      entry.safeResponseBody = clientLiveSessionSafeResponseProjection(descriptor.kind, payload);
      entry.safeResponseProjectionSource = "playwright-response-json";
    })
    .catch(error => {
      safeResponseReadFailures.push(
        `client live session response projection failed [${descriptor.kind}] ${method} ${pathname}: ${redactedEndpointProjectionFailure(error)}`,
      );
      delete entry.safeResponseBody;
      delete entry.safeResponseProjectionSource;
    })
    .finally(() => pendingSafeResponseReads.delete(read));
  pendingSafeResponseReads.add(read);
  return read;
}

function clientLiveSessionSafeResponseProjection(kind, payload) {
  const value = requireResponseObject(payload, `${kind} response`);
  if (kind === "client-live-session-create") {
    const sessionId = requireResponseIdentity(value.sessionId, "", "client session create sessionId", { nonEmpty: true });
    const offer = requireResponseIdentity(value.offer, "", "client session create offer", { nonEmpty: true });
    void offer;
    return { sessionId, offerReceived: true };
  }
  requireResponseBoolean(value.ok, true, `${kind} ok`);
  return { ok: true };
}

export function captureEndpointOwnedResponseProjection({
  response,
  entry,
  pendingSafeResponseReads = new Set(),
  safeResponseReadFailures = [],
} = {}) {
  const request = response?.request?.();
  const method = String(request?.method?.() || "").toUpperCase();
  const pathname = urlPath(response?.url?.() || "");
  const descriptor = endpointOwnedResponsePatterns.find(candidate =>
    candidate.method === method && candidate.pattern.test(pathname));
  if (!descriptor) return null;
  const actualStatus = Number(entry?.status || 0);
  entry.endpointResponseKind = descriptor.kind;
  entry.endpointExpectedStatus = descriptor.expectedStatus;
  if (actualStatus !== descriptor.expectedStatus) {
    safeResponseReadFailures.push(
      `endpoint response status mismatch [${descriptor.kind}] ${method} ${pathname}: expected status ${descriptor.expectedStatus}, actual status ${actualStatus}`,
    );
    delete entry.safeResponseBody;
    delete entry.safeResponseProjectionSource;
    delete entry.safeResponseProjectionKind;
    return Promise.resolve();
  }
  const read = Promise.resolve()
    .then(() => response.json())
    .then(payload => {
      entry.safeResponseBody = endpointOwnedSafeResponseProjection({
        kind: descriptor.kind,
        method,
        pathname,
        payload,
      });
      entry.safeResponseProjectionSource = "playwright-response-json";
      entry.safeResponseProjectionKind = descriptor.kind;
    })
    .catch(error => {
      safeResponseReadFailures.push(
        `endpoint response projection failed [${descriptor.kind}] ${method} ${pathname}: ${redactedEndpointProjectionFailure(error)}`,
      );
      delete entry.safeResponseBody;
      delete entry.safeResponseProjectionSource;
      delete entry.safeResponseProjectionKind;
    })
    .finally(() => pendingSafeResponseReads.delete(read));
  pendingSafeResponseReads.add(read);
  return read;
}

const opsIncidentTimelineForbiddenResponseKeys = new Set([
  "sourceUrl",
  "rawJson",
  "debugMaterial",
  "debugCounters",
  "providerPrompt",
  "providerResponse",
  "providerMaterial",
  "credential",
  "authorization",
  "password",
  "sessionSecret",
  "tokenHash",
]);

export function captureOpsIncidentTimelineResponseProjection({
  response,
  entry,
  pendingSafeResponseReads = new Set(),
  safeResponseReadFailures = [],
} = {}) {
  const request = response?.request?.();
  const method = String(request?.method?.() || "").toUpperCase();
  const target = urlTarget(response?.url?.() || "");
  const expectedTarget = "/ops/api/events/status?limit=5&includeArchives=1";
  if (method !== "GET" || target !== expectedTarget) return null;
  const actualStatus = Number(entry?.status || 0);
  entry.safeResponseProjectionKind = "ops-incident-timeline-event-records";
  entry.safeResponseExpectedStatus = 200;
  if (actualStatus !== 200) {
    safeResponseReadFailures.push(
      `Ops incident timeline response status mismatch GET ${expectedTarget}: expected status 200, actual status ${actualStatus}`,
    );
    return Promise.resolve();
  }
  const read = Promise.resolve()
    .then(() => response.json())
    .then(payload => {
      if (objectContainsKey(payload, opsIncidentTimelineForbiddenResponseKeys)) {
        throw new EndpointResponseProjectionError(
          "response-sensitive-field-present",
          "Ops incident timeline response contains forbidden material",
        );
      }
      const value = requireResponseObject(payload, "Ops incident timeline response");
      const records = requireResponseObject(value.records, "Ops incident timeline records");
      if (!Array.isArray(records.records)) {
        throw new EndpointResponseProjectionError(
          "response-shape-invalid",
          "Ops incident timeline records.records is missing",
        );
      }
      const safeRecords = records.records.map((record, index) => {
        const row = requireResponseObject(record, `Ops incident timeline record ${index}`);
        return {
          eventId: requireResponseIdentity(
            row.eventId,
            "",
            `Ops incident timeline record ${index} eventId`,
            { nonEmpty: true },
          ),
          eventType: String(row.eventType || ""),
          status: String(row.status || ""),
        };
      });
      entry.safeResponseBody = {
        status: String(value.status || ""),
        records: {
          matchedRecords: Number(records.matchedRecords || 0),
          total: Number(records.total || 0),
          records: safeRecords,
        },
      };
      entry.safeResponseProjectionSource = "playwright-response-json";
      entry.safeResponseForbiddenMaterialObserved = false;
    })
    .catch(error => {
      safeResponseReadFailures.push(
        `Ops incident timeline response projection failed GET ${expectedTarget}: ${redactedEndpointProjectionFailure(error)}`,
      );
      delete entry.safeResponseBody;
      delete entry.safeResponseProjectionSource;
    })
    .finally(() => pendingSafeResponseReads.delete(read));
  pendingSafeResponseReads.add(read);
  return read;
}

function endpointOwnedSafeResponseProjection({ kind, pathname, payload }) {
  const value = requireResponseObject(payload, `${kind} response`);
  assertEndpointResponseSensitiveBoundary(kind, value);
  if (kind === "auth-user-disable") {
    const username = decodePathSegment(pathname.match(/^\/ops\/api\/users\/([^/]+)\/disable$/)?.[1]);
    const user = requireResponseObject(value.user, "auth disable user");
    requireResponseIdentity(user.username, username, "auth disable username");
    requireResponseBoolean(user.enabled, false, "auth disable enabled");
    requireResponseIdentity(value.status, "disabled", "auth disable status");
    return { status: "disabled", user: { username, enabled: false } };
  }
  if (kind === "source-create") {
    const source = requireResponseObject(value.source, "source create source");
    const sourceId = requireResponseIdentity(source.sourceId, "", "source create sourceId", { nonEmpty: true });
    const enabled = requireResponseBoolean(source.enabled, true, "source create enabled");
    requireResponseBoolean(value.ok, true, "source create ok");
    return { ok: true, source: { sourceId, enabled } };
  }
  if (kind === "source-disable") {
    const sourceId = decodePathSegment(pathname.match(/^\/ops\/api\/sources\/([^/]+)$/)?.[1]);
    const source = requireResponseObject(value.source, "source disable source");
    requireResponseIdentity(source.sourceId, sourceId, "source disable sourceId");
    requireResponseBoolean(source.enabled, false, "source disable enabled");
    requireResponseBoolean(value.ok, true, "source disable ok");
    requireResponseIdentity(value.status, "disabled", "source disable status");
    return { ok: true, status: "disabled", source: { sourceId, enabled: false } };
  }
  if (kind === "view-disable") {
    const viewId = decodePathSegment(pathname.match(/^\/ops\/api\/views\/([^/]+)$/)?.[1]);
    const view = requireResponseObject(value.view, "view disable view");
    requireResponseIdentity(view.viewId, viewId, "view disable viewId");
    requireResponseBoolean(view.enabled, false, "view disable enabled");
    requireResponseBoolean(value.ok, true, "view disable ok");
    requireResponseIdentity(value.status, "disabled", "view disable status");
    return {
      ok: true,
      status: "disabled",
      view: {
        viewId,
        sourceId: String(view.sourceId || ""),
        enabled: false,
      },
    };
  }
  const gate = requireResponseObject(value.credentialGate, "ONVIF credential gate");
  const redaction = requireResponseObject(gate.redactionGuard, "ONVIF redaction guard");
  const sourceDraft = requireResponseObject(value.sourceDraft, "ONVIF source draft");
  const publishedViewDraft = requireResponseObject(value.publishedViewDraft, "ONVIF published view draft");
  requireResponseBoolean(value.ok, true, "ONVIF import ok");
  const sourceId = requireResponseIdentity(sourceDraft.sourceId, "", "ONVIF source draft sourceId", { nonEmpty: true });
  const viewId = requireResponseIdentity(publishedViewDraft.viewId, "", "ONVIF view draft viewId", { nonEmpty: true });
  requireResponseIdentity(publishedViewDraft.sourceId, sourceId, "ONVIF view draft sourceId");
  const sourceEnabled = requireResponseBoolean(sourceDraft.enabled, true, "ONVIF source draft enabled");
  const viewEnabled = requireResponseBoolean(publishedViewDraft.enabled, true, "ONVIF view draft enabled");
  return {
    ok: true,
    credentialGate: {
      schema: String(gate.schema || ""),
      requiredScope: String(gate.requiredScope || ""),
      primaryStoreProvider: String(gate.primaryStoreProvider || ""),
      primaryStoreDecision: String(gate.primaryStoreDecision || ""),
      credentialReferenceStatus: String(gate.credentialReferenceStatus || ""),
      urlCredentialsRejected: redaction.urlCredentialsRejected === true,
      secretMaterialStored: gate.secretMaterialStored === true,
    },
    sourceDraft: { sourceId, enabled: sourceEnabled },
    publishedViewDraft: { viewId, sourceId, enabled: viewEnabled },
  };
}

function assertEndpointResponseSensitiveBoundary(kind, value) {
  const allowedDiscardValidators = endpointResponseAllowedDiscardValidators(kind);
  const findings = [];
  const visit = (candidate, segments = []) => {
    if (Array.isArray(candidate)) {
      candidate.forEach((item, index) => visit(item, [...segments, String(index)]));
      return;
    }
    if (!candidate || typeof candidate !== "object") return;
    for (const [key, item] of Object.entries(candidate)) {
      const next = [...segments, key];
      const fieldPath = next.join(".");
      const leaf = item === null || typeof item !== "object";
      const sensitiveKey = leaf && /password|token|credential|secret|(?:^|_)(?:url|uri)$|(?:url|uri)$/i.test(key);
      const sensitiveValue = typeof item === "string" && /^(?:rtsp|rtsps|http|https|whep):\/\//i.test(item);
      const allowedDrop = (sensitiveKey || sensitiveValue) &&
        allowedDiscardValidators.get(fieldPath)?.(item) === true;
      if ((sensitiveKey || sensitiveValue) && !allowedDrop) findings.push(fieldPath);
      visit(item, next);
    }
  };
  visit(value);
  if (findings.length > 0) {
    throw new EndpointResponseProjectionError(
      "sensitive-response-field-rejected",
      `rejected field paths: ${[...new Set(findings)].join(",")}`,
    );
  }
}

function endpointResponseAllowedDiscardValidators(kind) {
  if (kind === "auth-user-disable") {
    return new Map([
      ["user.mustChangePassword", value => typeof value === "boolean"],
      ["user.passwordUpdatedAt", value => typeof value === "string"],
    ]);
  }
  if (kind !== "onvif-import-draft") return new Map();
  const falseBoolean = value => value === false;
  return new Map([
    ["previewContract.credentialMaterialIncluded", falseBoolean],
    ["selectedProfile.token", value => typeof value === "string" && value.length > 0],
    ["auth.credentialRefPresent", value => typeof value === "boolean"],
    ["auth.plaintextSecretIncluded", falseBoolean],
    ["credentialGate.credentialRefPresent", value => typeof value === "boolean"],
    ["credentialGate.credentialReferenceStatus", value =>
      value === "reference-present-redacted" || value === "reference-absent"],
    ["credentialGate.productPersistentSecretStoreEnabled", falseBoolean],
    ["credentialGate.externalSecretManagerEnabled", falseBoolean],
    ["credentialGate.credentialBindingStoreEnabled", falseBoolean],
    ["credentialGate.secretMaterialStored", falseBoolean],
    ["credentialGate.redactionGuard.urlCredentialsRejected", value => value === true],
    ["credentialGate.redactionGuard.draftApiOmitsCredentialRef", value => value === true],
    ["credentialGate.redactionGuard.sourceRegistrySecretFields", falseBoolean],
    ["credentialGate.redactionGuard.publishedViewSecretFields", falseBoolean],
    ["credentialGate.redactionGuard.authHeaderMaterialIncluded", falseBoolean],
    ["credentialGate.redactionGuard.soapSecurityHeaderIncluded", falseBoolean],
    ["sourceDraft.rtspUrl", isCredentialFreeRtspUrl],
  ]);
}

function isCredentialFreeRtspUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return ["rtsp:", "rtsps:"].includes(parsed.protocol) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function redactedEndpointProjectionFailure(error) {
  if (error instanceof EndpointResponseProjectionError) return error.message;
  return "response JSON parsing or response shape validation failed";
}

class EndpointResponseProjectionError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = "EndpointResponseProjectionError";
    this.code = code;
  }
}

function requireResponseObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new EndpointResponseProjectionError("response-shape-invalid", `${label} is missing`);
  }
  return value;
}

function requireResponseIdentity(actual, expected, label, { nonEmpty = false } = {}) {
  const value = String(actual || "");
  if ((nonEmpty && !value) || (!nonEmpty && value !== String(expected))) {
    throw new EndpointResponseProjectionError("response-identity-mismatch", `${label} mismatch`);
  }
  return value;
}

function requireResponseBoolean(actual, expected, label) {
  if (typeof actual !== "boolean" || actual !== expected) {
    throw new EndpointResponseProjectionError("response-boolean-mismatch", `${label} mismatch`);
  }
  return actual;
}

function objectContainsKey(value, forbidden) {
  if (Array.isArray(value)) return value.some(item => objectContainsKey(item, forbidden));
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, item]) =>
    forbidden.has(key) || objectContainsKey(item, forbidden));
}

export function buildLiveSessionEvidence(entries, correlationId, tileIdentity, tileViewId) {
  const correlated = entries.filter(item => !correlationId || item.correlationId === correlationId);
  const sessionStart = [...correlated].reverse().find(item => {
    if (item.phase !== "request-start" || item.method !== "POST") return false;
    return /^\/client\/api\/views\/[^/]+\/webrtc\/session$/.test(urlPath(item.url));
  });
  const sessionResponse = sessionStart
    ? correlated.find(item => item.phase === "response" && item.requestId === sessionStart.requestId)
    : null;
  const sessionMatch = sessionStart ? urlPath(sessionStart.url).match(/^\/client\/api\/views\/([^/]+)\/webrtc\/session$/) : null;
  const answerStart = [...correlated].reverse().find(item => {
    if (item.phase !== "request-start" || item.method !== "POST") return false;
    const match = urlPath(item.url).match(/^\/client\/api\/views\/([^/]+)\/webrtc\/session\/([^/]+)\/answer$/);
    return Boolean(match && (!sessionMatch || match[1] === sessionMatch[1]));
  });
  const answerResponse = answerStart
    ? correlated.find(item => item.phase === "response" && item.requestId === answerStart.requestId)
    : null;
  const answerMatch = answerStart ? urlPath(answerStart.url).match(/^\/client\/api\/views\/([^/]+)\/webrtc\/session\/([^/]+)\/answer$/) : null;
  const responseSessionId = String(sessionResponse?.safeResponseBody?.sessionId || "");
  return {
    tileIdentity,
    tileViewId,
    requestViewId: decodePathSegment(sessionMatch?.[1]),
    answerViewId: decodePathSegment(answerMatch?.[1]),
    correlationId: sessionStart?.correlationId || correlationId || "",
    requestMethod: sessionStart?.method || "",
    requestPath: sessionStart ? urlPath(sessionStart.url) : "",
    requestBody: sessionStart?.requestBody || {},
    responseStatus: Number(sessionResponse?.status || 0),
    sessionId: responseSessionId,
    responseSessionId,
    answerSessionId: decodePathSegment(answerMatch?.[2]),
    offerReceived: Boolean(sessionResponse?.safeResponseBody?.offerReceived && answerStart),
    answerMethod: answerStart?.method || "",
    answerPath: answerStart ? urlPath(answerStart.url) : "",
    answerStatus: Number(answerResponse?.status || 0),
  };
}

function decodePathSegment(value) {
  try { return decodeURIComponent(String(value || "")); }
  catch { return ""; }
}

function urlPath(value) {
  try { return new URL(String(value)).pathname; }
  catch { return ""; }
}

function urlTarget(value) {
  try {
    const parsed = new URL(String(value), "http://localhost");
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "";
  }
}

function urlOrigin(value) {
  try {
    return new URL(String(value), "http://localhost").origin;
  } catch {
    return "";
  }
}
