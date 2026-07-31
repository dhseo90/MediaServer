// 파일 용도: UI diagnostic case 실패 시 cleanup/browser close 이후 구조화 lifecycle evidence를 최종화한다.

import { buildNavigationTrustEvidence } from "./v390_ui_completion_oracle_lib.mjs";
import { buildExclusiveRequestScopedCorrelationEvidence } from "./v390_ui_exact_oracle_runtime.mjs";
import {
  failureLifecycleEvidenceSchema,
  serializeFailureLifecycleEvidence,
} from "./v390_ui_failure_lifecycle_evidence.mjs";

export { serializeFailureLifecycleEvidence } from "./v390_ui_failure_lifecycle_evidence.mjs";

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
    markerEvidenceLifecycle: markerEvidence
      ? {
          phase: "reached",
          evaluatorInvocationCount:
            Number(markerEvidence.evaluatorInvocationCount || 0),
          correlationResponseBound:
            markerEvidence.correlationResponseBound === true,
          domReadinessConfirmed:
            markerEvidence.domReadinessConfirmed === true,
        }
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
        caseEvidence.markerEvidenceLifecycle?.phase !== "reached" ||
        caseEvidence.markerEvidenceLifecycle?.evaluatorInvocationCount !== 1) {
      errors.push("EVT-004-marker-not-reached");
    }
    if (caseEvidence.markerStageEvidence?.fileStageEvidence?.pass !== true ||
        caseEvidence.markerStageEvidence?.dashboardResponseEvidence?.pass !== true) {
      errors.push("EVT-004-marker-stage-incomplete");
    }
  } else if (!caseEvidence.markerEvidence) {
    if (caseEvidence.markerEvidenceLifecycle?.phase !== "not-reached") {
      errors.push("EVT-004-marker-phase-missing");
    }
    if (caseEvidence.requestCorrelationEvidence?.pass === true &&
        caseEvidence.navigationLifecycleEvidence?.pass === true) {
      errors.push("EVT-004-marker-evidence-required-after-prerequisites");
    }
  } else if (caseEvidence.markerEvidenceLifecycle?.phase !== "reached" ||
      !Number.isInteger(caseEvidence.markerEvidence.evaluatorInvocationCount) ||
      caseEvidence.markerEvidenceLifecycle?.evaluatorInvocationCount !==
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

export function diagnosticChildSourceBindingErrors(summary, expected = {}) {
  const binding = summary?.sourceBinding;
  const errors = [];
  if (!binding || typeof binding !== "object") {
    return ["diagnostic-child-source-binding-missing"];
  }
  for (const [field, code] of [
    ["gitCommit", "diagnostic-child-source-commit-mismatch"],
    ["manifestSha256", "diagnostic-child-manifest-digest-mismatch"],
    ["runId", "diagnostic-child-run-id-mismatch"],
    ["caseId", "diagnostic-child-source-case-mismatch"],
    ["caseIdsSha256", "diagnostic-child-source-selection-mismatch"],
  ]) {
    if (String(binding[field] || "") !== String(expected[field] || "")) {
      errors.push(code);
    }
  }
  return errors;
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
    requestCorrelationEvidence: childCase.requestCorrelationEvidence || null,
    requestCorrelationScopeEvidence:
      childCase.requestCorrelationScopeEvidence || null,
    navigationLifecycleEvidence:
      childCase.navigationLifecycleEvidence || null,
    markerEvidence: childCase.markerEvidence || null,
    markerStageEvidence: childCase.markerStageEvidence || null,
    markerEvidenceLifecycle: childCase.markerEvidenceLifecycle || null,
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
