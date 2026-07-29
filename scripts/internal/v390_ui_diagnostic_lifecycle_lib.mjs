// 파일 용도: UI diagnostic case 실패 시 cleanup/browser close 이후 구조화 lifecycle evidence를 최종화한다.

import { buildNavigationTrustEvidence } from "./v390_ui_completion_oracle_lib.mjs";
import { buildExclusiveRequestScopedCorrelationEvidence } from "./v390_ui_exact_oracle_runtime.mjs";

const maxCorrelationWindowEntries = 256;

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
  capturedCorrelationWindow,
}) {
  const lifecycleNavigationBinding = item.actions.find(action =>
    action.semanticCompletion?.phase === "primary-action")?.semanticCompletion?.navigationBinding || null;
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
  const markerEvidence =
    runtimeState.get("__eventDomSemanticEvidence")?.markerFlow || null;
  return {
    navigationLifecycleEvidence,
    requestCorrelationScopeEvidence,
    markerEvidence,
    markerEvidenceLifecycle: markerEvidence
      ? { phase: "reached" }
      : { phase: "not-reached" },
    cleanupAttestation: buildCaseCleanupAttestation({
      primaryFailure,
      cleanupFailure,
      browserCloseFailure,
      browserCloseAttempted,
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
  caseRuntimeRestored,
  cleanupEntries = [],
}) {
  const pass = !cleanupFailure &&
    !browserCloseFailure &&
    browserCloseAttempted === true &&
    caseRuntimeRestored === true;
  return {
    schema: "media-server.v390-ui-case-cleanup-attestation.v1",
    pass,
    primaryFailurePresent: Boolean(primaryFailure),
    primaryFailurePreserved: Boolean(primaryFailure),
    caseRuntimeRestoreAttempted: true,
    caseRuntimeRestored: caseRuntimeRestored === true,
    browserCloseAttempted: browserCloseAttempted === true,
    browserContextClosed: browserCloseAttempted === true && !browserCloseFailure,
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
  caseRuntimeRestored,
  cleanupEntries = [],
  navigation = null,
} = {}) {
  return {
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
    markerEvidenceLifecycle: { phase: "not-reached" },
    cleanupAttestation: buildCaseCleanupAttestation({
      primaryFailure,
      cleanupFailure,
      browserCloseFailure,
      browserCloseAttempted,
      caseRuntimeRestored,
      cleanupEntries,
    }),
  };
}

export function validateEvt004LifecycleEvidence(caseEvidence = {}) {
  if (caseEvidence.actualBrowserExecution !== true) return [];
  const errors = [];
  for (const [field, code] of [
    ["requestCorrelationEvidence", "EVT-004-request-correlation-missing"],
    ["requestCorrelationScopeEvidence", "EVT-004-correlation-scope-missing"],
    ["navigationLifecycleEvidence", "EVT-004-navigation-lifecycle-missing"],
    ["cleanupAttestation", "EVT-004-cleanup-attestation-missing"],
  ]) {
    if (!caseEvidence[field]) errors.push(code);
  }
  if (caseEvidence.status === "PASS") {
    for (const [field, code] of [
      ["requestCorrelationEvidence", "EVT-004-request-correlation-not-pass"],
      ["requestCorrelationScopeEvidence", "EVT-004-correlation-scope-not-pass"],
      ["navigationLifecycleEvidence", "EVT-004-navigation-lifecycle-not-pass"],
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
        caseEvidence.markerEvidenceLifecycle?.phase !== "reached") {
      errors.push("EVT-004-marker-not-reached");
    }
  } else if (!caseEvidence.markerEvidence) {
    if (caseEvidence.markerEvidenceLifecycle?.phase !== "not-reached") {
      errors.push("EVT-004-marker-phase-missing");
    }
  } else if (caseEvidence.markerEvidence.pass !== true ||
      caseEvidence.markerEvidenceLifecycle?.phase !== "reached") {
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
