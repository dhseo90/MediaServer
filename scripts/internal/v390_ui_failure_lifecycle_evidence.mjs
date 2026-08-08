// 파일 용도: focused diagnostic과 canonical exact runner가 공유하는 실패 lifecycle evidence를 직렬화한다.

export const failureLifecycleEvidenceSchema =
  "media-server.v390-ui-failure-lifecycle-evidence.v1";

export function deriveMarkerEvidenceLifecycle(source = {}) {
  const nested = source?.failureLifecycleEvidence &&
      typeof source.failureLifecycleEvidence === "object"
    ? { ...source.failureLifecycleEvidence, ...source }
    : source;
  const markerEvidence = nested?.markerEvidence || null;
  const declared = nested?.markerEvidenceLifecycle || null;
  const stageEvidencePresent = Boolean(nested?.markerStageEvidence);
  const primaryFailurePresent = Boolean(nested?.primaryFailureEvidence) ||
    nested?.cleanupAttestation?.primaryFailurePresent === true;
  if (markerEvidence) {
    if (declared?.phase && declared.phase !== "reached") {
      return {
        ...cloneStructured(declared),
        evaluatorInvocationCount: Number(declared.evaluatorInvocationCount || 0),
        stageEvidencePresent,
        primaryFailurePresent,
      };
    }
    return {
      phase: "reached",
      evaluatorInvocationCount: Number(markerEvidence.evaluatorInvocationCount || 0),
      correlationResponseBound: markerEvidence.correlationResponseBound === true,
      domReadinessConfirmed: markerEvidence.domReadinessConfirmed === true,
      stageEvidencePresent,
      primaryFailurePresent,
    };
  }
  if (declared?.phase === "reached") {
    return {
      ...cloneStructured(declared),
      phase: "reached",
      evaluatorInvocationCount: Number(declared.evaluatorInvocationCount || 0),
      stageEvidencePresent,
      primaryFailurePresent,
    };
  }
  if (declared?.phase === "partial" || stageEvidencePresent ||
      nested?.requestCorrelationEvidence || nested?.requestCorrelationScopeEvidence) {
    return {
      phase: "partial",
      evaluatorInvocationCount: Number(declared?.evaluatorInvocationCount || 0),
      correlationResponseBound: declared?.correlationResponseBound === true ||
        nested?.requestCorrelationEvidence?.pass === true,
      domReadinessConfirmed: declared?.domReadinessConfirmed === true,
      stageEvidencePresent,
      primaryFailurePresent,
    };
  }
  return {
    phase: "not-reached",
    evaluatorInvocationCount: 0,
    correlationResponseBound: false,
    domReadinessConfirmed: false,
    stageEvidencePresent,
    primaryFailurePresent,
  };
}

export function serializeFailureLifecycleEvidence(source = {}) {
  const nested = source?.failureLifecycleEvidence &&
      typeof source.failureLifecycleEvidence === "object"
    ? source.failureLifecycleEvidence
    : source;
  const markerStageEvidence = nested?.markerStageEvidence || null;
  const markerEvidence = nested?.markerEvidence || null;
  const markerEvidenceLifecycle = deriveMarkerEvidenceLifecycle(source);
  const failurePhase = String(
    markerEvidence?.failurePhase ||
    markerStageEvidence?.failurePhase ||
    markerStageEvidence?.fileStageEvidence?.failurePhase ||
    (markerEvidenceLifecycle.phase === "reached"
      ? "marker-evaluation"
      : "not-reached"),
  );
  const failureCode = String(
    markerEvidence?.failureCode ||
    markerStageEvidence?.failureCode ||
    markerStageEvidence?.fileStageEvidence?.failureCode ||
    (markerEvidenceLifecycle.phase === "reached"
      ? "MARKER_EVIDENCE_INCOMPLETE"
      : "MARKER_LIFECYCLE_NOT_REACHED"),
  );
  return {
    schema: failureLifecycleEvidenceSchema,
    failurePhase,
    failureCode,
    navigationLifecycleEvidence:
      cloneStructured(nested?.navigationLifecycleEvidence),
    requestCorrelationScopeEvidence:
      cloneStructured(nested?.requestCorrelationScopeEvidence),
    markerStageEvidence: cloneStructured(markerStageEvidence),
    markerEvidence: cloneStructured(markerEvidence),
    markerEvidenceLifecycle: cloneStructured(markerEvidenceLifecycle),
    primaryFailureEvidence:
      cloneStructured(source?.primaryFailureEvidence || nested?.primaryFailureEvidence),
    failureProvenance:
      cloneStructured(source?.failureProvenance || nested?.failureProvenance),
    cleanupAttestation:
      cloneStructured(nested?.cleanupAttestation),
  };
}

function cloneStructured(value) {
  return value && typeof value === "object"
    ? structuredClone(value)
    : null;
}
