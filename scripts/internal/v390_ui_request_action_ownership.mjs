// 파일 용도: canonical UI request-action을 단일 active owner와 고정 phase 순서로 관리한다.

export const requestActionOwnershipPhases = Object.freeze([
  "bootstrap-settling",
  "source-before-frozen",
  "primary-action",
  "independent-readback",
  "post-action-observation",
]);

const scopedPhases = new Set(["primary-action", "independent-readback"]);

export function createRequestActionOwnershipRegistry({ caseId = "" } = {}) {
  const ownedCaseId = String(caseId || "");
  assert(ownedCaseId, "request-action ownership case ID is missing");
  const registryToken = Object.freeze({});
  const completed = [];
  const lifecycle = [];
  let phaseIndex = 0;
  let scopeSequence = 0;
  let active = null;
  let activeRequests = new Set();
  let endedScopes = [];

  const expectedPhase = () => requestActionOwnershipPhases[phaseIndex] || "complete";
  const requireExpectedPhase = phase => {
    const requested = String(phase || "");
    assert(requested, "request-action ownership phase is missing");
    assert(requested === expectedPhase(),
      `request-action ownership phase mismatch: expected=${expectedPhase()} observed=${requested}`);
    return requested;
  };
  const requireContext = context => {
    assert(context && context.__registryToken === registryToken,
      "request-action ownership context is missing or foreign");
    assert(active, "request-action ownership context is stale or no active owner exists");
    assert(context === active,
      "request-action ownership context does not match the active owner");
    assert(context.caseId === ownedCaseId,
      "request-action ownership context case mismatch");
    return context;
  };
  const completePhase = evidence => {
    completed.push(Object.freeze({
      sequence: completed.length + 1,
      ...evidence,
    }));
    phaseIndex += 1;
  };

  return Object.freeze({
    attest({ phase = "", actionId = "", ownershipMode = "attested" } = {}) {
      assert(!active, "request-action ownership phase attestation while an owner is active is forbidden");
      const requestedPhase = requireExpectedPhase(phase);
      if (scopedPhases.has(requestedPhase)) {
        assert(endedScopes.length > 0 || String(ownershipMode).includes("not-applicable"),
          `request-owning phase has no ended scope attestation: ${requestedPhase}`);
      }
      const evidence = {
        phase: requestedPhase,
        caseId: ownedCaseId,
        actionId: String(actionId || ""),
        ownershipMode: String(ownershipMode || "attested"),
        status: "attested",
        endedScopeCount: endedScopes.length,
      };
      lifecycle.push({ event: "attest", ...evidence });
      completePhase(evidence);
      endedScopes = [];
      return structuredClone(evidence);
    },

    begin({
      caseId: observedCaseId = "",
      phase = "",
      actionId = "",
      correlationId = "",
      ownershipKind = "",
      renderCycleId = "",
    } = {}) {
      assert(!active, "nested request action ownership is forbidden");
      const requestedPhase = requireExpectedPhase(phase);
      assert(scopedPhases.has(requestedPhase),
        `request-action ownership phase is not request-owning: ${requestedPhase}`);
      assert(String(observedCaseId || ""), "request-action ownership case ID is missing");
      assert(String(observedCaseId) === ownedCaseId,
        "request-action ownership begin case mismatch");
      assert(String(actionId || ""), "request-action ownership action ID is missing");
      assert(String(ownershipKind || ""), "request-action ownership kind is missing");
      const context = {
        schema: "media-server.v390-ui-request-action-context.v1",
        scopeSequence: ++scopeSequence,
        caseId: ownedCaseId,
        phase: requestedPhase,
        actionId: String(actionId),
        correlationId: String(correlationId || ""),
        ownershipKind: String(ownershipKind),
        renderCycleId: String(renderCycleId || ""),
      };
      Object.defineProperty(context, "__registryToken", {
        value: registryToken,
        enumerable: false,
      });
      active = Object.freeze(context);
      activeRequests = new Set();
      lifecycle.push({
        event: "begin",
        scopeSequence: active.scopeSequence,
        caseId: active.caseId,
        phase: active.phase,
        actionId: active.actionId,
        ownershipKind: active.ownershipKind,
      });
      return active;
    },

    validate(context, {
      caseId: observedCaseId = "",
      actionId = "",
      phase = "",
    } = {}) {
      const value = requireContext(context);
      if (observedCaseId) {
        assert(String(observedCaseId) === value.caseId,
          "request-action ownership context case mismatch");
      }
      if (actionId) {
        assert(String(actionId) === value.actionId,
          "request-action ownership context action mismatch");
      }
      if (phase) {
        assert(String(phase) === value.phase,
          "request-action ownership context phase mismatch");
      }
      return value;
    },

    register(context, {
      requestId = "",
      caseId: requestCaseId = "",
      actionId = "",
      phase = "",
    } = {}) {
      const value = requireContext(context);
      const ownedRequestId = String(requestId || "");
      assert(ownedRequestId, "request-action registration request ID is missing");
      assert(String(requestCaseId || "") === value.caseId,
        "request-action registration case mismatch");
      assert(String(actionId || "") === value.actionId,
        "request-action registration action mismatch");
      assert(String(phase || "") === value.phase,
        "request-action registration phase mismatch");
      assert(!activeRequests.has(ownedRequestId),
        `duplicate request-action registration: ${ownedRequestId}`);
      activeRequests.add(ownedRequestId);
      lifecycle.push({
        event: "register",
        scopeSequence: value.scopeSequence,
        requestId: ownedRequestId,
      });
      return Object.freeze({
        scopeSequence: value.scopeSequence,
        requestId: ownedRequestId,
      });
    },

    completeRequest(context, requestId) {
      const value = requireContext(context);
      const ownedRequestId = String(requestId || "");
      assert(ownedRequestId && activeRequests.has(ownedRequestId),
        `request-action registration is missing or stale: ${ownedRequestId || "(missing)"}`);
      activeRequests.delete(ownedRequestId);
      lifecycle.push({
        event: "request-complete",
        scopeSequence: value.scopeSequence,
        requestId: ownedRequestId,
      });
    },

    end(context) {
      const value = requireContext(context);
      assert(activeRequests.size === 0,
        `request-action scope ended with active requests: ${activeRequests.size}`);
      const evidence = {
        phase: value.phase,
        caseId: value.caseId,
        actionId: value.actionId,
        correlationId: value.correlationId,
        ownershipKind: value.ownershipKind,
        ownershipMode: "explicit-begin-register-end",
        scopeSequence: value.scopeSequence,
        activeRequestCount: 0,
        status: "attested",
      };
      lifecycle.push({ event: "end", ...evidence });
      active = null;
      activeRequests = new Set();
      endedScopes.push(evidence);
      return structuredClone(evidence);
    },

    cleanup({ failure = null } = {}) {
      const clearedActiveOwner = Boolean(active);
      const clearedRequestCount = activeRequests.size;
      const evidence = {
        schema: "media-server.v390-ui-request-action-cleanup.v1",
        caseId: ownedCaseId,
        clearedActiveOwner,
        clearedRequestCount,
        activePhase: String(active?.phase || ""),
        activeActionId: String(active?.actionId || ""),
        primaryFailurePreserved: failure instanceof Error,
        status: "PASS",
      };
      lifecycle.push({ event: "cleanup", ...evidence });
      active = null;
      activeRequests = new Set();
      return Object.freeze(evidence);
    },

    evidence() {
      return structuredClone({
        schema: "media-server.v390-ui-request-action-ownership-lifecycle.v1",
        caseId: ownedCaseId,
        expectedPhases: requestActionOwnershipPhases,
        completedPhases: completed,
        nextPhase: expectedPhase(),
        activeOwner: active
          ? {
              scopeSequence: active.scopeSequence,
              phase: active.phase,
              actionId: active.actionId,
              ownershipKind: active.ownershipKind,
              activeRequestCount: activeRequests.size,
            }
          : null,
        lifecycle,
        complete: phaseIndex === requestActionOwnershipPhases.length && !active,
      });
    },
  });
}

export function buildCanonicalRequestActionOwnershipCensus(manifest) {
  assert(Array.isArray(manifest?.cases), "canonical ownership census manifest is missing");
  const seen = new Set();
  const cases = manifest.cases.map(item => {
    const caseId = String(item?.caseId || "");
    assert(caseId && !seen.has(caseId), `canonical ownership census duplicate case: ${caseId}`);
    seen.add(caseId);
    const primary = (item.actions || []).filter(action =>
      action?.semanticCompletion?.phase === "primary-action");
    const readback = (item.actions || []).filter(action =>
      action?.semanticCompletion?.phase === "independent-readback");
    assert(primary.length === 1,
      `${caseId} canonical ownership primary action cardinality mismatch`);
    assert(readback.length <= 1,
      `${caseId} canonical ownership readback action cardinality mismatch`);
    const completionMode = String(primary[0].semanticCompletion?.completionMode || "");
    assert(["request", "local", "navigation"].includes(completionMode),
      `${caseId} canonical ownership completion mode is invalid: ${completionMode}`);
    const classification = `${completionMode}-primary`;
    return Object.freeze({
      caseId,
      workflowClass: String(item.workflow?.workflowClass || ""),
      classification,
      primaryActionId: String(primary[0].semanticCompletion?.actionId || ""),
      independentReadbackActionId:
        String(readback[0]?.semanticCompletion?.actionId || ""),
      independentReadbackApplicability: readback.length === 1 ? "required" : "not-applicable",
      phases: requestActionOwnershipPhases,
    });
  });
  const classifications = Object.fromEntries([
    "request-primary",
    "local-primary",
    "navigation-primary",
  ].map(classification => [classification,
    cases.filter(item => item.classification === classification).length]));
  const readbackApplicability = {
    required: cases.filter(item =>
      item.independentReadbackApplicability === "required").length,
    notApplicable: cases.filter(item =>
      item.independentReadbackApplicability === "not-applicable").length,
  };
  return Object.freeze({
    schema: "media-server.v390-ui-request-action-ownership-census.v1",
    canonicalCaseCount: cases.length,
    sequenceCount: cases.length,
    invalidSequenceCount: 0,
    classifications,
    readbackApplicability,
    phaseOrder: requestActionOwnershipPhases,
    cases,
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
