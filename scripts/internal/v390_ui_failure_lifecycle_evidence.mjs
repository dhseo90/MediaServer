// 파일 용도: focused diagnostic과 canonical exact runner가 공유하는 실패 lifecycle evidence를 직렬화한다.

export const failureLifecycleEvidenceSchema =
  "media-server.v390-ui-failure-lifecycle-evidence.v1";

export function serializeFailureLifecycleEvidence(source = {}) {
  const nested = source?.failureLifecycleEvidence &&
      typeof source.failureLifecycleEvidence === "object"
    ? source.failureLifecycleEvidence
    : source;
  const markerStageEvidence = nested?.markerStageEvidence || null;
  const markerEvidence = nested?.markerEvidence || null;
  const markerEvidenceLifecycle = nested?.markerEvidenceLifecycle ||
    (markerEvidence ? {
      phase: "reached",
      evaluatorInvocationCount:
        Number(markerEvidence.evaluatorInvocationCount || 0),
      correlationResponseBound:
        markerEvidence.correlationResponseBound === true,
      domReadinessConfirmed:
        markerEvidence.domReadinessConfirmed === true,
    } : { phase: "not-reached" });
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
    cleanupAttestation:
      cloneStructured(nested?.cleanupAttestation),
  };
}

function cloneStructured(value) {
  return value && typeof value === "object"
    ? structuredClone(value)
    : null;
}
