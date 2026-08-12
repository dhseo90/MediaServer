// 파일 용도: case 종료 후 capture-only request ledger를 raw object identity로 평가한다.

const reference = value =>
  (typeof value === "object" && value !== null) || typeof value === "function";

export function evaluateRequestLifecycle(input = {}) {
  try {
    return evaluate(input);
  } catch {
    return frozenResult([], [failure("INPUT_INVALID", null, null)], emptyCensus(1));
  }
}

function evaluate(input) {
  const normalized = normalizeInput(input);
  if (normalized === null) {
    return frozenResult([], [failure("INPUT_INVALID", null, null)], emptyCensus(1));
  }

  const { recorderSnapshot, navigationInvocations, actionInvocations } = normalized;
  const failures = [];
  const states = [];
  const byRequestObject = new Map();
  const responseByRequest = new Map();
  let duplicateResponses = 0;
  let multiplyClassified = 0;

  for (const captureError of recorderSnapshot.captureErrors) {
    failures.push(failure(
      "CAPTURE_ERROR",
      reference(captureError?.requestObject) ? captureError.requestObject : null,
      reference(captureError?.responseObject) ? captureError.responseObject : null,
    ));
  }

  for (const envelope of recorderSnapshot.requests) {
    const request = envelope?.requestObject;
    const state = {
      envelope,
      request: reference(request) ? request : null,
      invalid: false,
      navigation: null,
      action: null,
      redirectCandidate: false,
    };
    states.push(state);
    if (!reference(request)) {
      failures.push(failure("REQUEST_IDENTITY_MISSING", null, null));
      state.invalid = true;
      continue;
    }
    if (byRequestObject.has(request)) {
      failures.push(failure("REQUEST_DUPLICATE", request, null));
      state.invalid = true;
      continue;
    }
    byRequestObject.set(request, state);
  }

  for (const responseEnvelope of recorderSnapshot.responses) {
    const response = reference(responseEnvelope?.responseObject)
      ? responseEnvelope.responseObject
      : null;
    const request = responseRequestObject(responseEnvelope);
    if (response === null) {
      failures.push(failure("RESPONSE_IDENTITY_MISSING",
        reference(request) ? request : null, null));
      continue;
    }
    if (!reference(request)) {
      failures.push(failure("RESPONSE_IDENTITY_MISSING", null, response));
      continue;
    }
    const state = byRequestObject.get(request);
    if (state === undefined) {
      failures.push(failure("RESPONSE_REQUEST_UNKNOWN", request, response));
      continue;
    }
    if (!responseObjectMatches(responseEnvelope, request)) {
      failures.push(failure("RESPONSE_IDENTITY_MISMATCH", request, response));
      continue;
    }
    if (responseByRequest.has(request)) {
      failures.push(failure("RESPONSE_DUPLICATE", request, response));
      duplicateResponses += 1;
      continue;
    }
    responseByRequest.set(request, responseEnvelope);
  }

  for (const terminal of recorderSnapshot.requestFailed) {
    const request = reference(terminal?.requestObject) ? terminal.requestObject : null;
    const knownRequest = request !== null && byRequestObject.has(request);
    failures.push(failure("REQUEST_FAILED", knownRequest ? request : null, null));
  }

  for (const state of states) {
    if (state.invalid || state.request === null) continue;
    validateRequestContract(state, failures);
    const requestContractInvalid = state.invalid;

    const conflictingActionOwnership = hasConflictingActionOwnership(
      state, actionInvocations);
    if (conflictingActionOwnership) {
      failures.push(failure("CROSS_ACTION_LEAK", state.request,
        rawResponse(responseByRequest.get(state.request))));
    }

    const navigation = validateInvocation({
      state,
      projection: state.envelope.navigationInvocation,
      rows: navigationInvocations,
      kind: "navigation",
      directMembership: true,
    });
    state.navigation = navigation;
    let projectionInvalid = false;
    if (navigation.failureCode !== null) {
      failures.push(failure(navigation.failureCode, state.request,
        rawResponse(responseByRequest.get(state.request))));
      projectionInvalid = true;
    }

    const nonCurrentProjection = state.envelope.actionInvocation?.current === false ||
      state.envelope.navigationInvocation?.current === false;
    if (nonCurrentProjection) {
      failures.push(failure("CROSS_ACTION_LEAK", state.request,
        rawResponse(responseByRequest.get(state.request))));
    }

    const action = validateInvocation({
      state,
      projection: state.envelope.actionInvocation,
      rows: actionInvocations,
      kind: "action",
      directMembership: state.envelope.redirectedFromObject === null,
    });
    state.action = action;
    if (action.failureCode !== null) {
      failures.push(failure(action.failureCode, state.request,
        rawResponse(responseByRequest.get(state.request))));
      projectionInvalid = true;
    }
    if (requestContractInvalid || projectionInvalid || conflictingActionOwnership ||
        nonCurrentProjection) {
      state.invalid = true;
      continue;
    }

    validateRedirect(state, byRequestObject, actionInvocations, failures,
      responseByRequest);
  }

  const classifications = [];
  for (const state of states) {
    if (state.invalid || state.request === null) continue;
    const candidates = classificationCandidates(state, responseByRequest,
      actionInvocations);
    if (candidates.length === 1) {
      classifications.push(candidates[0]);
    } else if (candidates.length > 1) {
      failures.push(failure("CLASSIFICATION_MULTIPLE", state.request,
        rawResponse(responseByRequest.get(state.request))));
      multiplyClassified += 1;
      state.invalid = true;
    } else {
      failures.push(failure("CLASSIFICATION_UNCLASSIFIED", state.request,
        rawResponse(responseByRequest.get(state.request))));
      state.invalid = true;
    }
  }

  const hasPrimaryFailure = failures.length > 0;
  if (!hasPrimaryFailure) {
    for (const state of states) {
      if (state.request !== null && !responseByRequest.has(state.request)) {
        failures.push(failure("RESPONSE_MISSING", state.request, null));
      }
    }
  }

  const classifiedRequests = new Set(classifications.map(item => item.request));
  const requestCount = recorderSnapshot.requests.length;
  const census = Object.freeze({
    requestCount,
    responseCount: recorderSnapshot.responses.length,
    classified: classifications.length,
    unclassified: requestCount - classifiedRequests.size,
    multiplyClassified,
    captureErrors: recorderSnapshot.captureErrors.length,
    duplicateResponses,
    failureCount: failures.length,
  });
  return frozenResult(classifications, failures, census);
}

function normalizeInput(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const recorderSnapshot = input.recorderSnapshot;
  if (recorderSnapshot === null || typeof recorderSnapshot !== "object" ||
      Array.isArray(recorderSnapshot)) return null;
  for (const field of ["requests", "responses", "requestFinished", "requestFailed",
    "captureErrors"]) {
    if (!Array.isArray(recorderSnapshot[field])) return null;
  }
  if (!Array.isArray(input.navigationInvocations) ||
      !Array.isArray(input.actionInvocations)) return null;
  return {
    recorderSnapshot,
    navigationInvocations: input.navigationInvocations,
    actionInvocations: input.actionInvocations,
  };
}

function responseRequestObject(envelope) {
  if (reference(envelope?.responseRequestObject)) return envelope.responseRequestObject;
  try {
    const request = envelope?.responseObject?.request?.();
    return reference(request) ? request : null;
  } catch {
    return null;
  }
}

function responseObjectMatches(envelope, request) {
  const response = envelope?.responseObject;
  if (!reference(response) || typeof response.request !== "function") return false;
  try {
    return response.request() === request;
  } catch {
    return false;
  }
}

function validateRequestContract(state, failures) {
  const { envelope, request } = state;
  if (typeof envelope.resourceType !== "string" || envelope.resourceType.length === 0) {
    failures.push(failure("RESOURCE_TYPE_MISSING", request, null));
    state.invalid = true;
    return;
  }
  const kind = envelope.requestKind;
  const validKind = kind === "document-navigation"
    ? envelope.resourceType === "document"
    : kind === "application-fetch"
      ? envelope.resourceType === "fetch" || envelope.resourceType === "xhr"
      : kind === "subresource";
  if (!validKind) {
    failures.push(failure("REQUEST_KIND_INVALID", request, null));
    state.invalid = true;
  }
}

function validateInvocation({ state, projection, rows, kind, directMembership }) {
  if (projection === null) return { projection: null, row: null, failureCode: null };
  if (!validProjection(projection)) {
    return { projection, row: null, failureCode: "INVOCATION_PROJECTION_MISMATCH" };
  }
  const matches = rows.filter(row => row?.invocationId === projection.invocationId);
  if (matches.length !== 1) {
    return { projection, row: null, failureCode: "INVOCATION_LEDGER_MISSING" };
  }
  const row = matches[0];
  if (!validLedgerRow(row) || row.phase !== projection.phase ||
      row.startedSequence !== projection.startedSequence ||
      row.startedAtMs !== projection.startedAtMs ||
      row.current !== projection.current ||
      (projection.endedSequence !== null &&
        row.endedSequence !== projection.endedSequence) ||
      (projection.endedAtMs !== null && row.endedAtMs !== projection.endedAtMs)) {
    return { projection, row, failureCode: "INVOCATION_PROJECTION_MISMATCH" };
  }
  if (projection.current !== true) {
    return { projection, row, failureCode: null };
  }
  if (state.envelope.sequence < row.startedSequence ||
      state.envelope.timestamp < row.startedAtMs ||
      state.envelope.sequence > row.endedSequence ||
      state.envelope.timestamp > row.endedAtMs) {
    return { projection, row, failureCode: "INVOCATION_STALE" };
  }
  if (directMembership && !row.requests.includes(state.request)) {
    return { projection, row, failureCode: "INVOCATION_MEMBERSHIP_MISSING" };
  }
  return { projection, row, failureCode: null, kind };
}

function validProjection(projection) {
  if (projection === null || typeof projection !== "object" || Array.isArray(projection)) {
    return false;
  }
  const open = projection.current === true && projection.endedSequence === null &&
    projection.endedAtMs === null;
  const completed = Number.isSafeInteger(projection.endedSequence) &&
    Number.isSafeInteger(projection.endedAtMs);
  return typeof projection.invocationId === "string" && projection.invocationId.length > 0 &&
    typeof projection.phase === "string" && projection.phase.length > 0 &&
    Number.isSafeInteger(projection.startedSequence) &&
    Number.isSafeInteger(projection.startedAtMs) &&
    typeof projection.current === "boolean" && (open || completed);
}

function validLedgerRow(row) {
  return row !== null && typeof row === "object" && !Array.isArray(row) &&
    typeof row.invocationId === "string" && typeof row.phase === "string" &&
    Number.isSafeInteger(row.startedSequence) && Number.isSafeInteger(row.endedSequence) &&
    Number.isSafeInteger(row.startedAtMs) && Number.isSafeInteger(row.endedAtMs) &&
    row.startedSequence <= row.endedSequence && row.startedAtMs <= row.endedAtMs &&
    Array.isArray(row.requests);
}

function hasConflictingActionOwnership(state, actionRows) {
  const owners = actionRows.filter(row =>
    Array.isArray(row?.requests) && row.requests.includes(state.request));
  const projectedId = state.envelope.actionInvocation?.invocationId ?? null;
  if (projectedId === null) return owners.length > 0;
  return owners.some(row => row.invocationId !== projectedId);
}

function validateRedirect(state, byRequestObject, actionRows, failures,
    responseByRequest) {
  const parentObject = state.envelope.redirectedFromObject;
  if (parentObject === null) return;
  const parent = byRequestObject.get(parentObject);
  if (parent === undefined) {
    failures.push(failure("REDIRECT_PARENT_MISSING", state.request,
      rawResponse(responseByRequest.get(state.request))));
    state.invalid = true;
    return;
  }
  const parentIsDocument = parent.envelope.resourceType === "document" &&
    parent.envelope.requestKind === "document-navigation";
  const childIsDocument = state.envelope.resourceType === "document" &&
    state.envelope.requestKind === "document-navigation";
  if (parentIsDocument !== childIsDocument) {
    failures.push(failure("REDIRECT_PARENT_WRONG", state.request,
      rawResponse(responseByRequest.get(state.request))));
    state.invalid = true;
    return;
  }
  if (!childIsDocument) {
    if (parent.envelope.requestKind !== state.envelope.requestKind ||
        parent.envelope.navigationInvocation !== null ||
        state.envelope.navigationInvocation !== null) {
      failures.push(failure("REDIRECT_PARENT_WRONG", state.request,
        rawResponse(responseByRequest.get(state.request))));
      state.invalid = true;
      return;
    }
    const parentAction = parent.envelope.actionInvocation;
    const childAction = state.envelope.actionInvocation;
    if ((parentAction === null) !== (childAction === null) ||
        (parentAction !== null &&
          parentAction.invocationId !== childAction.invocationId)) {
      failures.push(failure("REDIRECT_CHAIN_MISMATCH", state.request,
        rawResponse(responseByRequest.get(state.request))));
      state.invalid = true;
      return;
    }
    if (childAction !== null) {
      const actionRow = actionRows.find(row =>
        row?.invocationId === childAction.invocationId);
      if (!actionRow?.requests?.includes(parent.request)) {
        failures.push(failure("REDIRECT_PARENT_WRONG", state.request,
          rawResponse(responseByRequest.get(state.request))));
        state.invalid = true;
      }
    }
    return;
  }
  const parentNavigation = parent.envelope.navigationInvocation;
  const childNavigation = state.envelope.navigationInvocation;
  if (parentNavigation === null || childNavigation === null ||
      parentNavigation.invocationId !== childNavigation.invocationId) {
    failures.push(failure("REDIRECT_CHAIN_MISMATCH", state.request,
      rawResponse(responseByRequest.get(state.request))));
    state.invalid = true;
    return;
  }
  if (state.envelope.actionInvocation === null) {
    if (parent.envelope.actionInvocation !== null) {
      failures.push(failure("REDIRECT_CHAIN_MISMATCH", state.request,
        rawResponse(responseByRequest.get(state.request))));
      state.invalid = true;
    }
    return;
  }
  const parentAction = parent.envelope.actionInvocation;
  const childAction = state.envelope.actionInvocation;
  if (parentAction === null || parentAction.invocationId !== childAction.invocationId) {
    failures.push(failure("REDIRECT_CHAIN_MISMATCH", state.request,
      rawResponse(responseByRequest.get(state.request))));
    state.invalid = true;
    return;
  }
  const actionRow = actionRows.find(row => row?.invocationId === childAction.invocationId);
  if (!actionRow?.requests?.includes(parent.request)) {
    failures.push(failure("REDIRECT_PARENT_WRONG", state.request,
      rawResponse(responseByRequest.get(state.request))));
    state.invalid = true;
    return;
  }
  state.redirectCandidate = true;
}

function classificationCandidates(state, responseByRequest, actionRows) {
  const { envelope, request } = state;
  const responseEnvelope = responseByRequest.get(request);
  const response = rawResponse(responseEnvelope);
  const candidates = [];
  const push = (classification, owner, phase) => candidates.push(Object.freeze({
    request,
    response,
    requestKind: envelope.requestKind,
    classification,
    owner,
    phase,
  }));

  if (envelope.navigationInvocation !== null && envelope.actionInvocation === null &&
      envelope.requestKind === "document-navigation") {
    push("bootstrap", "page", "bootstrap-document");
  }
  const actionRow = envelope.actionInvocation === null
    ? null
    : actionRows.find(row => row?.invocationId === envelope.actionInvocation.invocationId);
  if (actionRow?.requests?.includes(request)) {
    const status = responseEnvelope?.status;
    const sameRouteRejection = envelope.redirectedFromObject === null &&
      envelope.requestKind === "document-navigation" && Number.isInteger(status) &&
      status >= 400 && status <= 599;
    push("action", "action", sameRouteRejection
      ? "same-route-rejection"
      : "primary-action");
  }
  if (state.redirectCandidate && envelope.navigationInvocation !== null &&
      envelope.requestKind === "document-navigation") {
    push("redirect", "page", "document-redirect-chain");
  }
  if (envelope.navigationInvocation === null && envelope.actionInvocation === null &&
      (envelope.requestKind === "application-fetch" ||
        envelope.requestKind === "subresource")) {
    push("background", "page", "background-refresh");
  }
  return candidates;
}

function rawResponse(envelope) {
  return reference(envelope?.responseObject) ? envelope.responseObject : null;
}

function failure(code, request, response) {
  return Object.freeze({ code, request, response });
}

function emptyCensus(failureCount) {
  return Object.freeze({
    requestCount: 0,
    responseCount: 0,
    classified: 0,
    unclassified: 0,
    multiplyClassified: 0,
    captureErrors: 0,
    duplicateResponses: 0,
    failureCount,
  });
}

function frozenResult(classifications, failures, census) {
  return Object.freeze({
    status: failures.length === 0 ? "PASS" : "FAIL",
    classifications: Object.freeze([...classifications]),
    failures: Object.freeze([...failures]),
    census,
  });
}
