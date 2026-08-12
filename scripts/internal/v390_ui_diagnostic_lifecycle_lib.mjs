// 파일 용도: UI diagnostic case 실패 시 cleanup/browser close 이후 구조화 lifecycle evidence를 최종화한다.

import { createHash } from "node:crypto";

import { buildNavigationTrustEvidence } from "./v390_ui_completion_oracle_lib.mjs";
import {
  buildExclusiveRequestScopedCorrelationEvidence,
  validateEventDomSemanticCompositeEvidence,
} from "./v390_ui_exact_oracle_runtime.mjs";
import {
  deriveMarkerEvidenceLifecycle,
  failureLifecycleEvidenceSchema,
  serializeFailureLifecycleEvidence,
} from "./v390_ui_failure_lifecycle_evidence.mjs";

export {
  deriveMarkerEvidenceLifecycle,
  serializeFailureLifecycleEvidence,
} from "./v390_ui_failure_lifecycle_evidence.mjs";

const maxCorrelationWindowEntries = 256;
export const eventReviewSeedDiagnosticCaseIds = Object.freeze([
  "EVT-019",
  "EVT-020",
  "EVT-021",
  "EVT-037",
  "EVT-061",
  "EVT-066",
  "EVT-068",
]);
const diagnosticStructuredAssertionEvidence = Object.freeze([
  ["dom-semantic-assertion-failed", "eventDomSemanticEvidence"],
  ["request-semantic-assertion-failed", "requestSemanticAssertionEvidence"],
  ["request-correlation-assertion-failed", "requestCorrelationEvidence"],
  ["request-correlation-scope-assertion-failed", "requestCorrelationScopeEvidence"],
  ["navigation-assertion-failed", "navigationLifecycleEvidence"],
  ["marker-assertion-failed", "markerEvidence"],
  ["marker-stage-assertion-failed", "markerStageEvidence"],
]);
const diagnosticPrimaryFailureEvidenceSchema =
  "media-server.v390-ui-diagnostic-primary-failure-evidence.v1";
const eventReviewNoteDigestEvidenceSchema =
  "media-server.v390-ui-event-review-note-digest-evidence.v1";
const eventReviewNoteStages = Object.freeze([
  "request",
  "expected",
  "put",
  "storage",
]);
const eventReviewNoteMatches = Object.freeze([
  "requestExpected",
  "putExpected",
  "storageExpected",
  "putStorage",
]);

export function copyEventReviewSeedWriteEvidence(evidence, { caseId = "" } = {}) {
  const fail = code => {
    throw new Error(`event review note digest evidence invalid: ${code}`);
  };
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    fail("missing");
  }
  if (JSON.stringify(Object.keys(evidence).sort()) !== JSON.stringify([
    "caseId",
    "eventId",
    "expected",
    "matches",
    "put",
    "request",
    "schema",
    "storage",
  ])) {
    fail("top-level-shape");
  }
  if (evidence.schema !== eventReviewNoteDigestEvidenceSchema) fail("schema");
  if (!caseId || evidence.caseId !== caseId) fail("case-id");
  if (typeof evidence.eventId !== "string" || evidence.eventId.length === 0) {
    fail("event-id");
  }

  const copied = {
    schema: evidence.schema,
    caseId: evidence.caseId,
    eventId: evidence.eventId,
  };
  for (const stageName of eventReviewNoteStages) {
    const stage = evidence[stageName];
    if (!stage || typeof stage !== "object" || Array.isArray(stage) ||
        JSON.stringify(Object.keys(stage).sort()) !==
          JSON.stringify(["present", "sha256", "type"])) {
      fail(`${stageName}-shape`);
    }
    if (typeof stage.present !== "boolean" || typeof stage.type !== "string" ||
        typeof stage.sha256 !== "string") {
      fail(`${stageName}-types`);
    }
    if (stage.type === "string") {
      if (stage.present !== true || !/^[a-f0-9]{64}$/.test(stage.sha256)) {
        fail(`${stageName}-digest`);
      }
    } else if (stage.sha256 !== "") {
      fail(`${stageName}-non-string-digest`);
    }
    copied[stageName] = {
      present: stage.present,
      type: stage.type,
      sha256: stage.sha256,
    };
  }

  const matches = evidence.matches;
  if (!matches || typeof matches !== "object" || Array.isArray(matches) ||
      JSON.stringify(Object.keys(matches).sort()) !==
        JSON.stringify([...eventReviewNoteMatches].sort())) {
    fail("matches-shape");
  }
  const digestMatches = (left, right) =>
    left.present === true &&
    right.present === true &&
    left.type === "string" &&
    right.type === "string" &&
    left.sha256 !== "" &&
    left.sha256 === right.sha256;
  const expectedMatches = {
    requestExpected: digestMatches(copied.request, copied.expected),
    putExpected: digestMatches(copied.put, copied.expected),
    storageExpected: digestMatches(copied.storage, copied.expected),
    putStorage: digestMatches(copied.put, copied.storage),
  };
  for (const key of eventReviewNoteMatches) {
    if (typeof matches[key] !== "boolean" || matches[key] !== expectedMatches[key]) {
      fail(`matches-${key}`);
    }
  }
  copied.matches = expectedMatches;
  return Object.freeze(copied);
}

export function diagnosticStructuredAssertionFailureClass(error) {
  const observed = diagnosticStructuredAssertionEvidence
    .map(([failureClass, field]) => [failureClass, error?.[field]])
    .filter(([, evidence]) => evidence !== undefined && evidence !== null);
  if (observed.some(([, evidence]) => typeof evidence?.pass !== "boolean")) {
    return "invalid-structured-failure-evidence";
  }
  const failed = observed.filter(([, evidence]) => evidence.pass === false);
  if (failed.length > 1) return "ambiguous-structured-failure-evidence";
  return failed.length === 1 ? failed[0][0] : "";
}

export function diagnosticStructuredAssertionEvidencePresent(error) {
  return diagnosticStructuredAssertionEvidence.some(([, field]) =>
    error?.[field] !== undefined && error?.[field] !== null);
}

export function serializeDiagnosticPrimaryFailureEvidence(
  error,
  { playwrightTimeoutClassAttested = false } = {},
) {
  const structuredEvidence = {};
  for (const [, field] of diagnosticStructuredAssertionEvidence) {
    if (error?.[field] === undefined || error?.[field] === null) continue;
    structuredEvidence[field] = structuredClone(error[field]);
  }
  return Object.freeze({
    schema: diagnosticPrimaryFailureEvidenceSchema,
    errorName: String(error?.name || "Error"),
    playwrightTimeoutClassAttested:
      playwrightTimeoutClassAttested === true,
    structuredEvidence: Object.freeze(structuredEvidence),
  });
}

export function diagnosticStructuredAssertionEvidenceValid(
  field,
  evidence,
  { expectedCaseId = "" } = {},
) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence) ||
      typeof evidence.pass !== "boolean") return false;
  if (field === "eventDomSemanticEvidence") {
    try {
      validateEventDomSemanticCompositeEvidence(evidence);
      return evidence.actualBrowserExecution === true;
    } catch {
      return false;
    }
  }
  if (field === "requestSemanticAssertionEvidence") {
    const digest = value => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
    return evidence.schema === "media-server.v390-ui-request-semantic-assertion-evidence.v1" &&
      typeof evidence.caseId === "string" && evidence.caseId.length > 0 &&
      (!expectedCaseId || evidence.caseId === expectedCaseId) &&
      /^[A-Z]+$/.test(evidence.requestMethod || "") &&
      digest(evidence.requestPathDigest) &&
      digest(evidence.requestPathTemplateDigest) &&
      Number.isInteger(evidence.assertionIndex) && evidence.assertionIndex >= 0 &&
      typeof evidence.assertionOperator === "string" && evidence.assertionOperator.length > 0 &&
      digest(evidence.assertionPathDigest) &&
      digest(evidence.assertionIdentityDigest) &&
      typeof evidence.baselinePresent === "boolean" && digest(evidence.baselineDigest) &&
      typeof evidence.actualPresent === "boolean" && digest(evidence.actualDigest) &&
      typeof evidence.expectedPresent === "boolean" && digest(evidence.expectedDigest) &&
      ["PASS", "REQUEST_SEMANTIC_ASSERTION_MISMATCH",
        "REQUEST_SEMANTIC_ASSERTION_PATH_MISSING"].includes(evidence.failureCode) &&
      (evidence.pass === true) === (evidence.failureCode === "PASS");
  }
  if (field === "requestCorrelationEvidence") {
    return evidence.schema === "media-server.v390-ui-request-correlation-evidence.v1" &&
      evidence.requestKind === "application-fetch" &&
      typeof evidence.expectedCorrelationDigest === "string" &&
      typeof evidence.initiatingRequestCorrelationDigest === "string" &&
      typeof evidence.responseRequestCorrelationDigest === "string" &&
      typeof evidence.caseRequestIdentity === "string" &&
      (evidence.caseRequestSequence === null ||
        Number.isInteger(evidence.caseRequestSequence)) &&
      typeof evidence.responseRequestObjectObserved === "boolean" &&
      typeof evidence.responseRequestMethod === "string" &&
      typeof evidence.responseRequestPath === "string" &&
      typeof evidence.responseRequestHeaderDigest === "string" &&
      Number.isInteger(evidence.responseStatus) &&
      typeof evidence.responseEchoHeaderRequired === "boolean" &&
      typeof evidence.responseEchoHeaderObserved === "boolean" &&
      typeof evidence.failureCode === "string";
  }
  if (field === "requestCorrelationScopeEvidence") {
    return evidence.schema === "media-server.v390-ui-request-correlation-scope-evidence.v1" &&
      evidence.requestKind === "application-fetch" &&
      Number.isInteger(evidence.logTailRequestCount) &&
      Number.isInteger(evidence.correlationLeakRequestCount) &&
      Array.isArray(evidence.orderedLedger) &&
      typeof evidence.failureCode === "string";
  }
  if (field === "navigationLifecycleEvidence") {
    return evidence.schema === "media-server.v390-ui-navigation-trust-evidence.v1" &&
      Number.isInteger(evidence.totalDocumentNavigationCount) &&
      Array.isArray(evidence.orderedDocumentNavigations) &&
      typeof evidence.listenerInstalledBeforeFirstNavigation === "boolean" &&
      Number.isInteger(evidence.navigationAfterListenerEndCount) &&
      typeof evidence.failureCode === "string";
  }
  if (field === "markerEvidence") {
    return evidence.schema === "media-server.v390-ui-event-marker-flow-evidence.v1" &&
      typeof evidence.failurePhase === "string" &&
      typeof evidence.failureCode === "string" &&
      Number.isInteger(evidence.evaluatorInvocationCount) &&
      typeof evidence.correlationResponseBound === "boolean" &&
      typeof evidence.domReadinessConfirmed === "boolean";
  }
  if (field === "markerStageEvidence") {
    const validNested = (value, schema) => value === null ||
      (value && typeof value === "object" && !Array.isArray(value) &&
        value.schema === schema && typeof value.pass === "boolean");
    return evidence.schema === "media-server.v390-ui-evt004-marker-stage-evidence.v1" &&
      typeof evidence.failurePhase === "string" &&
      typeof evidence.failureCode === "string" &&
      Object.hasOwn(evidence, "fileStageEvidence") &&
      Object.hasOwn(evidence, "dashboardResponseEvidence") &&
      validNested(evidence.fileStageEvidence,
        "media-server.v390-ui-marker-file-stage-evidence.v1") &&
      validNested(evidence.dashboardResponseEvidence,
        "media-server.v390-ui-dashboard-marker-response-stage-evidence.v1");
  }
  return false;
}

export function diagnosticRequestSemanticAssertionBindingValid(
  evidence,
  { caseId = "", requests = [] } = {},
) {
  if (!diagnosticStructuredAssertionEvidenceValid(
    "requestSemanticAssertionEvidence", evidence, { expectedCaseId: caseId })) return false;
  const digest = value => createHash("sha256").update(
    typeof value === "string" ? value : stableDiagnosticEvidenceJson(value),
  ).digest("hex");
  const matches = [];
  for (const request of requests) {
    const requestMethod = String(request?.method || "").toUpperCase();
    const requestPathTemplate = String(request?.path || "");
    const assertions = request?.assertions || request?.jsonAssertions || [];
    for (const [assertionIndex, assertion] of assertions.entries()) {
      const assertionOperator = String(assertion?.operator || "");
      const assertionPath = String(assertion?.path || "");
      if (evidence.requestMethod !== requestMethod ||
          evidence.requestPathTemplateDigest !== digest(requestPathTemplate) ||
          evidence.assertionIndex !== assertionIndex ||
          evidence.assertionOperator !== assertionOperator ||
          evidence.assertionPathDigest !== digest(assertionPath) ||
          evidence.assertionIdentityDigest !== digest({
            requestMethod,
            requestPathTemplate,
            assertionIndex,
            assertionOperator,
            assertionPath,
          })) continue;
      matches.push({ request, assertion });
    }
  }
  return matches.length === 1;
}

function stableDiagnosticEvidenceJson(value) {
  const normalize = item => {
    if (Array.isArray(item)) return item.map(normalize);
    if (!item || typeof item !== "object") return item;
    return Object.fromEntries(Object.keys(item).sort()
      .map(key => [key, normalize(item[key])]));
  };
  return JSON.stringify(normalize(value));
}

export async function finalizeFailedCaseLifecycle({
  primaryFailure = null,
  captureEvidence = () => null,
  restoreCase,
  closeBrowser,
  finalizeEvidence,
} = {}) {
  let cleanupFailure = null;
  let browserCloseFailure = null;
  let lifecycleFinalizationFailure = null;
  let finalNavigation = null;
  let capturedEvidence = null;

  try {
    await restoreCase();
  } catch (error) {
    cleanupFailure = error;
  }

  try {
    finalNavigation = await closeBrowser();
  } catch (error) {
    browserCloseFailure = error;
  }

  try {
    capturedEvidence = captureEvidence();
  } catch (error) {
    lifecycleFinalizationFailure = error;
  }

  let failureLifecycleEvidence = null;
  try {
    failureLifecycleEvidence = finalizeEvidence({
      primaryFailure,
      cleanupFailure,
      browserCloseFailure,
      finalNavigation,
      capturedEvidence,
    });
  } catch (error) {
    lifecycleFinalizationFailure ||= error;
  }

  return {
    primaryFailure,
    cleanupFailure,
    browserCloseFailure,
    lifecycleFinalizationFailure,
    finalNavigation,
    failureLifecycleEvidence,
  };
}

export async function closeBrowserForFailureLifecycle({ browser, trace }) {
  try {
    const navigation = await browser.close();
    trace.navigation = navigation;
    return navigation;
  } catch (error) {
    if (error?.navigationLifecycleEvidence) {
      trace.navigation = structuredClone(error.navigationLifecycleEvidence);
    }
    throw error;
  }
}

export function cleanupActiveRequestOwnershipBeforeClose({
  browser,
  primaryFailure = null,
} = {}) {
  if (!browser || typeof browser.requestActionOwnershipEvidence !== "function" ||
      typeof browser.cleanupRequestActionOwnership !== "function") {
    throw new Error("request ownership cleanup adapter is unavailable");
  }
  const before = browser.requestActionOwnershipEvidence();
  const activeOwnerBefore = Boolean(before?.activeOwner);
  let cleanup = null;
  if (activeOwnerBefore) {
    cleanup = browser.cleanupRequestActionOwnership(primaryFailure);
  }
  const after = browser.requestActionOwnershipEvidence();
  if (after?.activeOwner) {
    throw new Error("request ownership remained active after bounded pre-close cleanup");
  }
  return Object.freeze({
    schema: "media-server.v390-ui-pre-close-request-ownership-cleanup.v1",
    cleanupPerformed: activeOwnerBefore,
    activeOwnerBefore,
    activeOwnerAfter: Boolean(after?.activeOwner),
    primaryFailurePreserved: primaryFailure instanceof Error,
    cleanupStatus: String(cleanup?.status || (activeOwnerBefore ? "" : "not-required")),
    clearedRequestCount: Number(cleanup?.clearedRequestCount || 0),
  });
}

export function captureBoundedCorrelationWindow({
  entries = [],
  window = null,
  maxEntries = maxCorrelationWindowEntries,
} = {}) {
  if (!window) return null;
  const networkStart = Number(window.networkStart);
  const networkEnd = Number(window.networkEnd);
  const sourceEntries = Array.isArray(entries) ? entries : [];
  const validBounds = Number.isInteger(networkStart) &&
    Number.isInteger(networkEnd) &&
    networkStart >= 0 &&
    networkEnd >= networkStart &&
    networkEnd <= sourceEntries.length;
  const boundedEntries = validBounds
    ? sourceEntries.slice(networkStart, networkEnd)
    : [];
  const truncated = boundedEntries.length > maxEntries;
  return {
    entries: truncated ? boundedEntries.slice(0, maxEntries) : boundedEntries,
    window: structuredClone(window),
    attestation: {
      schema: "media-server.v390-ui-correlation-window-attestation.v1",
      pass: validBounds && !truncated,
      networkStart: Number.isInteger(networkStart) ? networkStart : null,
      networkEnd: Number.isInteger(networkEnd) ? networkEnd : null,
      sourceEntryCount: sourceEntries.length,
      boundedEntryCount: boundedEntries.length,
      capturedEntryCount: truncated ? maxEntries : boundedEntries.length,
      maxEntryCount: maxEntries,
      truncated,
      failureCode: !validBounds
        ? "CORRELATION_WINDOW_UNBOUNDED"
        : (truncated ? "CORRELATION_WINDOW_TRUNCATED" : ""),
    },
  };
}

export function buildFailureLifecycleEvidence({
  item,
  trace,
  runtimeState,
  primaryFailure,
  cleanupFailure,
  browserCloseFailure,
  browserCloseAttempted,
  browserContextCreated,
  capturedCorrelationWindow,
}) {
  const initialNavigationBinding =
    item.actions[0]?.semanticCompletion?.navigationBinding || null;
  const primaryNavigationBinding = item.actions.find(action =>
    action.semanticCompletion?.phase === "primary-action")
    ?.semanticCompletion?.navigationBinding || null;
  const lifecycleNavigationBinding =
    primaryNavigationBinding || initialNavigationBinding;
  const navigationLifecycleEvidence = buildNavigationTrustEvidence({
    navigation: trace.navigation || {},
    expected: lifecycleNavigationBinding || {},
  });
  const correlationWindow = capturedCorrelationWindow;
  let requestCorrelationScopeEvidence = correlationWindow
    ? buildExclusiveRequestScopedCorrelationEvidence({
        entries: correlationWindow.entries,
        correlationId: correlationWindow.window.correlationId,
        actionId: correlationWindow.window.actionId,
        method: correlationWindow.window.method,
        urlPath: correlationWindow.window.urlPath,
      })
    : {
        schema: "media-server.v390-ui-request-correlation-scope-evidence.v1",
        pass: false,
        actionId: "",
        method: "",
        path: "",
        requestKind: "application-fetch",
        logTailRequestCount: 0,
        logTailResponseCount: 0,
        correlationDigest: "",
        correlationLeakRequestCount: 0,
        correlationLeakResponseCount: 0,
        orderedLedger: [],
        failurePhase: "application-fetch-correlation-scope",
        failureCode: "CORRELATION_SCOPE_NOT_REACHED",
      };
  if (correlationWindow) {
    requestCorrelationScopeEvidence = {
      ...requestCorrelationScopeEvidence,
      windowAttestation: correlationWindow.attestation,
      pass: requestCorrelationScopeEvidence.pass === true &&
        correlationWindow.attestation.pass === true,
      failurePhase: correlationWindow.attestation.pass === true
        ? requestCorrelationScopeEvidence.failurePhase
        : "application-fetch-correlation-window",
      failureCode: correlationWindow.attestation.pass === true
        ? requestCorrelationScopeEvidence.failureCode
        : correlationWindow.attestation.failureCode,
    };
  }
  const markerEvidence = runtimeState.get("__markerEvidence") ||
    runtimeState.get("__eventDomSemanticEvidence")?.markerFlow || null;
  const markerStageEvidence =
    runtimeState.get("__markerStageEvidence") || null;
  return {
    schema: failureLifecycleEvidenceSchema,
    navigationLifecycleEvidence,
    requestCorrelationScopeEvidence,
    markerStageEvidence,
    markerEvidence,
    markerEvidenceLifecycle: deriveMarkerEvidenceLifecycle({
      markerEvidence,
      markerStageEvidence,
      requestCorrelationScopeEvidence,
      cleanupAttestation: {
        primaryFailurePresent: Boolean(primaryFailure),
      },
    }),
    cleanupAttestation: buildCaseCleanupAttestation({
      primaryFailure,
      cleanupFailure,
      browserCloseFailure,
      browserCloseAttempted,
      browserContextCreated,
      caseRuntimeRestored: runtimeState.has("__caseRuntimeRestored"),
      cleanupEntries: trace.cleanup,
    }),
  };
}

export function buildCaseCleanupAttestation({
  primaryFailure,
  cleanupFailure,
  browserCloseFailure,
  browserCloseAttempted,
  browserContextCreated = true,
  caseRuntimeRestored,
  cleanupEntries = [],
}) {
  const browserContextClosed = browserContextCreated !== true ||
    (browserCloseAttempted === true && !browserCloseFailure);
  const pass = !cleanupFailure &&
    !browserCloseFailure &&
    browserContextClosed &&
    caseRuntimeRestored === true;
  return {
    schema: "media-server.v390-ui-case-cleanup-attestation.v1",
    pass,
    primaryFailurePresent: Boolean(primaryFailure),
    primaryFailurePreserved: Boolean(primaryFailure),
    caseRuntimeRestoreAttempted: true,
    caseRuntimeRestored: caseRuntimeRestored === true,
    browserCloseAttempted: browserCloseAttempted === true,
    browserContextClosed,
    cleanupEntryCount: Array.isArray(cleanupEntries) ? cleanupEntries.length : 0,
    failureCode: pass
      ? ""
      : (cleanupFailure
          ? "CASE_RUNTIME_CLEANUP_FAILED"
          : (browserCloseFailure
              ? "BROWSER_CLOSE_FAILED"
              : "CLEANUP_ATTESTATION_INCOMPLETE")),
  };
}

export function buildFallbackFailureLifecycleEvidence({
  primaryFailure,
  cleanupFailure,
  browserCloseFailure,
  browserCloseAttempted,
  browserContextCreated = true,
  caseRuntimeRestored,
  cleanupEntries = [],
  navigation = null,
} = {}) {
  return {
    schema: failureLifecycleEvidenceSchema,
    navigationLifecycleEvidence: {
      schema: "media-server.v390-ui-navigation-trust-evidence.v1",
      pass: false,
      orderedDocumentNavigations: Array.isArray(navigation?.orderedDocumentNavigations)
        ? structuredClone(navigation.orderedDocumentNavigations)
        : [],
      totalDocumentNavigationCount:
        Number(navigation?.totalDocumentNavigationCount || 0),
      listenerInstalledBeforeFirstNavigation:
        navigation?.listenerInstalledBeforeFirstNavigation === true,
      navigationAfterListenerEndCount:
        Number(navigation?.navigationAfterListenerEndCount || 0),
      failureCode: "LIFECYCLE_EVIDENCE_FINALIZATION_FAILED",
    },
    requestCorrelationScopeEvidence: {
      schema: "media-server.v390-ui-request-correlation-scope-evidence.v1",
      pass: false,
      requestKind: "application-fetch",
      logTailRequestCount: 0,
      logTailResponseCount: 0,
      correlationDigest: "",
      correlationLeakRequestCount: 0,
      correlationLeakResponseCount: 0,
      orderedLedger: [],
      failurePhase: "application-fetch-correlation-scope",
      failureCode: "LIFECYCLE_EVIDENCE_FINALIZATION_FAILED",
    },
    markerEvidence: null,
    markerStageEvidence: null,
    markerEvidenceLifecycle: { phase: "not-reached" },
    cleanupAttestation: buildCaseCleanupAttestation({
      primaryFailure,
      cleanupFailure,
      browserCloseFailure,
      browserCloseAttempted,
      browserContextCreated,
      caseRuntimeRestored,
      cleanupEntries,
    }),
  };
}

export function validateEvt004LifecycleEvidence(caseEvidence = {}) {
  if (caseEvidence.actualBrowserExecution !== true) return [];
  const errors = [];
  const preservedFailure = preservedPrimaryFailurePresent(caseEvidence);
  const markerLifecycle = deriveMarkerEvidenceLifecycle(caseEvidence);
  const requiredFields = caseEvidence.status === "PASS" || !preservedFailure
    ? [
        ["requestCorrelationEvidence", "EVT-004-request-correlation-missing"],
        ["requestCorrelationScopeEvidence", "EVT-004-correlation-scope-missing"],
        ["navigationLifecycleEvidence", "EVT-004-navigation-lifecycle-missing"],
        ["cleanupAttestation", "EVT-004-cleanup-attestation-missing"],
      ]
    : [
        ["navigationLifecycleEvidence", "EVT-004-navigation-lifecycle-missing"],
        ["cleanupAttestation", "EVT-004-cleanup-attestation-missing"],
      ];
  for (const [field, code] of requiredFields) {
    if (!caseEvidence[field]) errors.push(code);
  }
  if (caseEvidence.status === "PASS") {
    for (const [field, code] of [
      ["requestCorrelationEvidence", "EVT-004-request-correlation-not-pass"],
      ["requestCorrelationScopeEvidence", "EVT-004-correlation-scope-not-pass"],
      ["navigationLifecycleEvidence", "EVT-004-navigation-lifecycle-not-pass"],
      ["markerStageEvidence", "EVT-004-marker-stage-not-pass"],
      ["cleanupAttestation", "EVT-004-cleanup-attestation-not-pass"],
    ]) {
      if (caseEvidence[field]?.pass !== true) errors.push(code);
    }
    const windowAttestation =
      caseEvidence.requestCorrelationScopeEvidence?.windowAttestation;
    if (windowAttestation?.pass !== true ||
        windowAttestation.truncated !== false ||
        !Number.isInteger(windowAttestation.capturedEntryCount) ||
        !Number.isInteger(windowAttestation.maxEntryCount) ||
        windowAttestation.capturedEntryCount > windowAttestation.maxEntryCount ||
        caseEvidence.requestCorrelationScopeEvidence?.orderedLedger?.length !==
          windowAttestation.capturedEntryCount) {
      errors.push("EVT-004-correlation-window-not-bounded");
    }
    if (!caseEvidence.markerEvidence ||
        caseEvidence.markerEvidence.pass !== true ||
        caseEvidence.markerEvidence.evaluatorInvocationCount !== 1 ||
        caseEvidence.markerEvidence.correlationResponseBound !== true ||
        caseEvidence.markerEvidence.domReadinessConfirmed !== true ||
        markerLifecycle.phase !== "reached" ||
        markerLifecycle.evaluatorInvocationCount !== 1) {
      errors.push("EVT-004-marker-not-reached");
    }
    if (caseEvidence.markerStageEvidence?.fileStageEvidence?.pass !== true ||
        caseEvidence.markerStageEvidence?.dashboardResponseEvidence?.pass !== true) {
      errors.push("EVT-004-marker-stage-incomplete");
    }
  } else if (!caseEvidence.markerEvidence) {
    if (!["not-reached", "partial"].includes(markerLifecycle.phase)) {
      errors.push("EVT-004-marker-lifecycle-invalid");
    }
    if (caseEvidence.requestCorrelationEvidence?.pass === true &&
        caseEvidence.navigationLifecycleEvidence?.pass === true &&
        !preservedPrimaryFailurePresent(caseEvidence)) {
      errors.push("EVT-004-marker-evidence-required-after-prerequisites");
    }
  } else if (markerLifecycle.phase !== "reached" ||
      !Number.isInteger(caseEvidence.markerEvidence.evaluatorInvocationCount) ||
      markerLifecycle.evaluatorInvocationCount !==
        caseEvidence.markerEvidence.evaluatorInvocationCount ||
      caseEvidence.markerEvidence.correlationResponseBound !== true ||
      caseEvidence.markerEvidence.domReadinessConfirmed !== true) {
    errors.push("EVT-004-marker-lifecycle-invalid");
  }
  if (caseEvidence.status === "FAIL" &&
      caseEvidence.cleanupAttestation &&
      caseEvidence.cleanupAttestation.primaryFailurePresent === true &&
      caseEvidence.cleanupAttestation.primaryFailurePreserved !== true) {
    errors.push("EVT-004-primary-failure-not-preserved");
  }
  return errors;
}

function preservedPrimaryFailurePresent(caseEvidence) {
  const primary = caseEvidence.primaryFailureEvidence;
  const provenance = caseEvidence.failureProvenance;
  return primary?.schema === "media-server.v390-ui-diagnostic-primary-failure-evidence.v1" &&
    typeof primary.errorName === "string" && primary.errorName.length > 0 &&
    primary.structuredEvidence && typeof primary.structuredEvidence === "object" &&
    !Array.isArray(primary.structuredEvidence) &&
    provenance?.schema === "media-server.v390-ui-diagnostic-failure-provenance.v1" &&
    ["case-local-failure", "browser-case-assertion"].includes(provenance.kind) &&
    provenance.phase === "browser-case-execution" &&
    provenance.actualBrowserExecution === true &&
    provenance.continuationEligible === true &&
    caseEvidence.cleanupAttestation?.primaryFailurePresent === true &&
    caseEvidence.cleanupAttestation?.primaryFailurePreserved === true;
}

function diagnosticChildRawCaptureIntegrityPass(summary, expectedCaseId) {
  if (summary?.rawCaptureValidation?.status === "PASS") return true;
  if (summary?.case?.caseId !== expectedCaseId ||
      summary?.result !== "FAIL" || summary?.case?.status !== "FAIL" ||
      summary?.rawCaptureValidation?.releaseEvidenceEligible !== false) {
    return false;
  }
  const recordedErrors = summary.rawCaptureValidation?.errors;
  return Array.isArray(recordedErrors) && recordedErrors.length > 0 &&
    recordedErrors.every(error => typeof error === "string" && error.length > 0);
}

export function diagnosticChildSourceBindingErrors(summary, expected = {}) {
  const binding = summary?.sourceBinding;
  const errors = [];
  if (!binding || typeof binding !== "object") {
    return ["diagnostic-child-source-binding-missing"];
  }
  for (const [field, code] of [
    ["gitCommit", "diagnostic-child-source-commit-mismatch"],
    ["manifestSha256", "diagnostic-child-manifest-digest-mismatch"],
    ["buildSha256", "diagnostic-child-build-digest-mismatch"],
    ["runId", "diagnostic-child-run-id-mismatch"],
    ["caseId", "diagnostic-child-source-case-mismatch"],
    ["caseIdsSha256", "diagnostic-child-source-selection-mismatch"],
  ]) {
    if (String(binding[field] || "") !== String(expected[field] || "")) {
      errors.push(code);
    }
  }
  for (const [field, code] of [
    ["selectionMode", "diagnostic-child-selection-mode-mismatch"],
    ["parentSelectionCount", "diagnostic-child-parent-selection-count-mismatch"],
    ["parentSelectionIdsSha256", "diagnostic-child-parent-selection-digest-mismatch"],
    ["selectionContractDigest", "diagnostic-child-selection-contract-digest-mismatch"],
  ]) {
    if (Object.hasOwn(expected, field) && binding[field] !== expected[field]) {
      errors.push(code);
    }
  }
  return errors;
}

export function diagnosticChildBrowserExecutionBindingValid(summary = {}) {
  const attempted = Number(summary?.counts?.attempted || 0);
  const pass = Number(summary?.counts?.pass || 0);
  const fail = Number(summary?.counts?.fail || 0);
  const actualBrowserExecution = summary?.case?.actualBrowserExecution === true;
  if (summary?.actualBrowserExecution !== actualBrowserExecution) return false;
  if (attempted !== pass + fail || ![0, 1].includes(attempted)) return false;
  if (attempted === 0) return actualBrowserExecution === false;
  if (pass === 1) return actualBrowserExecution === true;
  const provenance = summary?.case?.failureProvenance;
  if (provenance?.kind === "browser-case-assertion") {
    return actualBrowserExecution === true &&
      provenance.actualBrowserExecution === true;
  }
  if (provenance?.kind !== "case-local-failure" ||
      provenance.continuationEligible !== true ||
      provenance.actualBrowserExecution !== actualBrowserExecution) {
    return false;
  }
  if (["prepare-case", "expected-fixture-digest", "browser-open"]
      .includes(provenance.phase)) {
    return actualBrowserExecution === false;
  }
  return provenance.phase === "browser-case-execution" &&
    actualBrowserExecution === true;
}

export function aggregateDiagnosticChildOutcome({
  summary,
  exitCode,
} = {}) {
  if (!summary?.case) {
    return {
      status: "FAIL",
      failureClass: "diagnostic-child-missing",
      failurePhase: "child-evidence-ingestion",
      failureCode: "DIAGNOSTIC_CHILD_SUMMARY_MISSING_OR_INVALID",
      actualBrowserExecution: false,
    };
  }
  const childCase = summary.case;
  const rawCaptureErrors = Array.isArray(summary.rawCaptureValidation?.errors)
    ? summary.rawCaptureValidation.errors.map(String)
    : [];
  const markerFailure = childCase.markerEvidence?.pass === false
    ? childCase.markerEvidence
    : null;
  const pass = exitCode === 0 &&
    summary.result === "PASS" &&
    childCase.status === "PASS" &&
    summary.rawCaptureValidation?.status === "PASS";
  const fallbackCode = rawCaptureErrors[0] ||
    (exitCode === 0
      ? "DIAGNOSTIC_CHILD_RESULT_FAILED"
      : "DIAGNOSTIC_CHILD_EXIT_NONZERO");
  return {
    status: pass ? "PASS" : "FAIL",
    failureClass: pass
      ? ""
      : String(childCase.failureClass || markerFailure?.failureCode || fallbackCode),
    failurePhase: pass
      ? ""
      : String(markerFailure?.failurePhase || "child-execution"),
    failureCode: pass
      ? ""
      : String(markerFailure?.failureCode || childCase.failureClass || fallbackCode),
    actualBrowserExecution: childCase.actualBrowserExecution === true,
    requested: childCase.requested || null,
    observed: childCase.observed || null,
    eventDomSemanticEvidence: childCase.eventDomSemanticEvidence || null,
    requestSemanticAssertionEvidence:
      childCase.requestSemanticAssertionEvidence || null,
    requestCorrelationEvidence: childCase.requestCorrelationEvidence || null,
    requestCorrelationScopeEvidence:
      childCase.requestCorrelationScopeEvidence || null,
    navigationLifecycleEvidence:
      childCase.navigationLifecycleEvidence || null,
    markerEvidence: childCase.markerEvidence || null,
    markerStageEvidence: childCase.markerStageEvidence || null,
    markerEvidenceLifecycle: childCase.markerEvidenceLifecycle || null,
    failureProvenance: childCase.failureProvenance || null,
    primaryFailureEvidence: childCase.primaryFailureEvidence || null,
    cleanupAttestation: childCase.cleanupAttestation || null,
    eventReviewSeedWriteEvidence:
      childCase.eventReviewSeedWriteEvidence || null,
    failureLifecycleEvidence:
      serializeFailureLifecycleEvidence(childCase),
    childExecutionStatus: String(summary.executionStatus || ""),
    childResult: String(summary.result || ""),
    childRawCaptureValidation: summary.rawCaptureValidation || null,
    childSourceBinding: summary.sourceBinding || null,
  };
}

export function classifyDiagnosticCaseDisposition({
  child,
  childSummary,
  childOutcome,
  contaminated,
  secretScan,
  expectedCaseId = "",
} = {}) {
  const cleanupAttestation = childOutcome?.cleanupAttestation;
  const integrityPass = diagnosticChildRawCaptureIntegrityPass(
    childSummary, expectedCaseId) &&
    childSummary?.caseRuntimeSecretArtifactIntegrity?.status === "PASS" &&
    secretScan?.status === "PASS" &&
    (expectedCaseId !== "EVT-004" ||
      validateEvt004LifecycleEvidence(childSummary?.case).length === 0);
  const lifecyclePass = contaminated !== true &&
    cleanupAttestation?.pass === true &&
    cleanupAttestation?.caseRuntimeRestored === true &&
    cleanupAttestation?.browserContextClosed === true;
  const provenance = childOutcome?.failureProvenance;
  const primaryFailureEvidence = childOutcome?.primaryFailureEvidence;
  const primaryStructuredEvidence = primaryFailureEvidence?.structuredEvidence;
  const allowedPrimaryEvidenceFields = new Set(
    diagnosticStructuredAssertionEvidence.map(([, field]) => field));
  const primaryFailureEvidenceValid =
    primaryFailureEvidence?.schema === diagnosticPrimaryFailureEvidenceSchema &&
    typeof primaryFailureEvidence.errorName === "string" &&
    primaryFailureEvidence.errorName.length > 0 &&
    typeof primaryFailureEvidence.playwrightTimeoutClassAttested === "boolean" &&
    primaryStructuredEvidence &&
    typeof primaryStructuredEvidence === "object" &&
    !Array.isArray(primaryStructuredEvidence) &&
    Object.keys(primaryStructuredEvidence).every(field =>
      allowedPrimaryEvidenceFields.has(field) &&
      diagnosticStructuredAssertionEvidenceValid(
        field, primaryStructuredEvidence[field], { expectedCaseId }) &&
      diagnosticStructuredAssertionEvidenceValid(
        field, childOutcome?.[field], { expectedCaseId }) &&
      stableDiagnosticEvidenceJson(primaryStructuredEvidence[field]) ===
        stableDiagnosticEvidenceJson(childOutcome[field]));
  const observedStructuredFailureClass =
    diagnosticStructuredAssertionFailureClass(primaryStructuredEvidence);
  const observedStructuredEvidencePresent =
    diagnosticStructuredAssertionEvidencePresent(primaryStructuredEvidence);
  const browserAssertionClasses = new Set([
    "ui-timeout",
    "http-status-mismatch",
    "control-observation-failed",
    "authoritative-readback-failed",
    "dom-semantic-assertion-failed",
    "request-semantic-assertion-failed",
    "request-correlation-assertion-failed",
    "request-correlation-scope-assertion-failed",
    "navigation-assertion-failed",
    "marker-assertion-failed",
    "marker-stage-assertion-failed",
  ]);
  const browserAssertionProvenance =
    provenance?.schema === "media-server.v390-ui-diagnostic-failure-provenance.v1" &&
    provenance.kind === "browser-case-assertion" &&
    provenance.phase === "browser-case-execution" &&
    provenance.actualBrowserExecution === true &&
    provenance.continuationEligible === true &&
    primaryFailureEvidenceValid &&
    provenance.errorName === primaryFailureEvidence.errorName &&
    ["failed-structured-evidence", "playwright-timeout"].includes(provenance.classificationSource) &&
    (provenance.classificationSource !== "playwright-timeout" ||
      (provenance.failureClass === "ui-timeout" && provenance.errorName === "TimeoutError" &&
        primaryFailureEvidence.playwrightTimeoutClassAttested === true &&
        provenance.structuredEvidencePresent === false &&
        observedStructuredEvidencePresent === false &&
        observedStructuredFailureClass === "")) &&
    (provenance.classificationSource !== "failed-structured-evidence" ||
      (provenance.structuredEvidencePresent === true &&
        observedStructuredEvidencePresent === true &&
        provenance.failureClass === observedStructuredFailureClass)) &&
    !["TypeError", "ReferenceError", "SyntaxError", "RangeError"].includes(provenance.errorName) &&
    browserAssertionClasses.has(provenance.failureClass) &&
    provenance.failureClass === childOutcome?.failureClass;
  const caseLocalFailureProvenance =
    provenance?.schema === "media-server.v390-ui-diagnostic-failure-provenance.v1" &&
    provenance.kind === "case-local-failure" &&
    ["prepare-case", "expected-fixture-digest", "browser-open", "browser-case-execution"]
      .includes(provenance.phase) &&
    provenance.continuationEligible === true &&
    provenance.classificationSource === "case-local-error" &&
    primaryFailureEvidenceValid &&
    provenance.structuredEvidencePresent === observedStructuredEvidencePresent &&
    observedStructuredFailureClass === "" &&
    !["TypeError", "ReferenceError", "SyntaxError", "RangeError"]
      .includes(provenance.errorName) &&
    provenance.failureClass === childOutcome?.failureClass;
  if (!childSummary || !integrityPass || !lifecyclePass) {
    return "abort-diagnostic-lifecycle";
  }
  if (childOutcome?.status === "PASS" && child?.exitCode === 0) return "continue-pass";
  if (childOutcome?.status === "FAIL" && child?.exitCode === 1 &&
      childOutcome?.actualBrowserExecution === true && browserAssertionProvenance) {
    return "continue-case-local-failure";
  }
  if (childOutcome?.status === "FAIL" && child?.exitCode === 1 &&
      caseLocalFailureProvenance) {
    return "continue-case-local-failure";
  }
  return "abort-diagnostic-lifecycle";
}
