// 파일 용도: Playwright request/response callback의 raw identity와 immutable capture ledger를 수집한다.

class RecorderCaptureFailure extends Error {
  constructor(reasonCode, message, cause = undefined) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "RecorderCaptureFailure";
    this.reasonCode = reasonCode;
  }
}

export function createRequestEventRecorder(options = {}) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("recorder options must be an object");
  }

  const caseId = options.caseId === undefined ? "unscoped-case" : options.caseId;
  if (typeof caseId !== "string" || caseId.length === 0) {
    throw new TypeError("recorder caseId must be a nonempty string");
  }
  const correlationDigest = options.correlationDigest === undefined
    ? ""
    : options.correlationDigest;
  if (typeof correlationDigest !== "string") {
    throw new TypeError("recorder correlationDigest must be a string");
  }

  const objectIds = new WeakMap();
  const requests = [];
  const responses = [];
  const requestFinished = [];
  const requestFailed = [];
  const captureErrors = [];
  let lastSequence = 0;
  let objectSequence = 0;
  let requestSequence = 0;

  const objectIdentity = object => {
    if ((typeof object !== "object" || object === null) && typeof object !== "function") {
      throw captureFailure("object-identity-invalid", "capture object must use reference identity");
    }
    let identity = objectIds.get(object);
    if (identity === undefined) {
      objectSequence += 1;
      identity = `${caseId}:object-${objectSequence}`;
      objectIds.set(object, identity);
    }
    return identity;
  };

  const candidateSequence = (hasExplicitSequence, explicitSequence) => {
    if (hasExplicitSequence) {
      if (!Number.isSafeInteger(explicitSequence) || explicitSequence <= lastSequence) {
        throw captureFailure("request-context-sequence-invalid",
          "explicit capture sequence must be a strictly increasing safe integer");
      }
      return explicitSequence;
    }
    return lastSequence + 1;
  };

  const captureMeta = (eventContext, defaultPhase) => {
    if (eventContext === undefined) eventContext = {};
    if (eventContext === null || typeof eventContext !== "object" || Array.isArray(eventContext)) {
      throw captureFailure("request-context-invalid", "capture context must be an object");
    }

    const sequenceField = readCaptureContextField(eventContext, "sequence", "sequence");
    const timestampField = readCaptureContextField(eventContext, "timestampMs", "timestamp");
    const phaseField = readCaptureContextField(eventContext, "phase", "phase");
    const sequence = candidateSequence(sequenceField.present, sequenceField.value);
    const timestamp = timestampField.present ? timestampField.value : Date.now();
    const phase = phaseField.present ? phaseField.value : defaultPhase;
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
      throw captureFailure("request-context-timestamp-invalid",
        "explicit capture timestampMs must be a nonnegative safe integer");
    }
    if (typeof phase !== "string" || phase.length === 0) {
      throw captureFailure("request-context-phase-invalid",
        "explicit capture phase must be a nonempty string");
    }
    lastSequence = sequence;
    return { sequence, timestamp, phase };
  };

  const captureSafely = ({ capturePhase, rawObject, eventContext, defaultPhase }, fn) => {
    let meta = null;
    let rawObjectIdentity = null;
    try {
      rawObjectIdentity = objectIdentity(rawObject);
      meta = captureMeta(eventContext, defaultPhase);
      return fn(meta, rawObjectIdentity);
    } catch (error) {
      const sequence = meta?.sequence ?? nextErrorSequence();
      const timestamp = meta?.timestamp ?? Date.now();
      const reasonCode = error instanceof RecorderCaptureFailure
        ? error.reasonCode
        : `${capturePhase}-capture-failed`;
      const detail = sanitizeCaptureError(error instanceof RecorderCaptureFailure &&
        error.cause !== undefined ? error.cause : error);
      const captureError = Object.freeze({
        code: `${capturePhase.toUpperCase().replaceAll("-", "_")}_CAPTURE_FAILED`,
        reasonCode,
        caseId,
        capturePhase,
        sequence,
        timestamp,
        phase: meta?.phase ?? defaultPhase,
        requestObject: capturePhase.startsWith("request") ? rawObject : null,
        requestObjectIdentity: capturePhase.startsWith("request")
          ? rawObjectIdentity
          : null,
        responseObject: capturePhase === "response" ? rawObject : null,
        responseObjectIdentity: capturePhase === "response"
          ? rawObjectIdentity
          : null,
        error: detail,
      });
      captureErrors.push(captureError);
      return null;
    }
  };

  const api = {
    recordRequest(request, eventContext = {}) {
      return captureSafely({
        capturePhase: "request",
        rawObject: request,
        eventContext,
        defaultPhase: "request-callback",
      }, (meta, requestObjectIdentity) => {
        const method = readProperty("request", "method", () => request.method());
        if (typeof method !== "string" || method.length === 0) {
          throw captureFailure("request-method-invalid", "request method must be nonempty");
        }
        const rawUrl = readProperty("request", "url", () => request.url());
        if (typeof rawUrl !== "string" || rawUrl.length === 0) {
          throw captureFailure("request-url-invalid", "request URL must be nonempty");
        }
        const path = normalizePath(rawUrl);
        const resourceType = readProperty("request", "resource-type",
          () => request.resourceType());
        const isNavigationRequest = readProperty("request", "is-navigation-request",
          () => request.isNavigationRequest());
        if (typeof isNavigationRequest !== "boolean") {
          throw captureFailure("request-is-navigation-request-invalid",
            "request navigation state must be boolean");
        }
        const redirectedFromObject = readProperty("request", "redirected-from",
          () => request.redirectedFrom());
        if (redirectedFromObject !== null &&
            (typeof redirectedFromObject !== "object" &&
              typeof redirectedFromObject !== "function")) {
          throw captureFailure("request-redirected-from-invalid",
            "redirectedFrom must preserve request object identity");
        }

        const navigationInvocation = captureInvocationProjection(
          readContextProjection(eventContext, "navigationInvocation"),
          "navigation-invocation");
        const actionInvocation = captureInvocationProjection(
          readContextProjection(eventContext, "actionInvocation"), "action-invocation");
        const requestCorrelationDigest = readRequestCorrelationDigest(
          eventContext, correlationDigest);
        requestSequence += 1;
        const envelope = Object.freeze({
          requestObject: request,
          objectIdentity: requestObjectIdentity,
          requestId: `${caseId}:request-${requestSequence}`,
          sequence: meta.sequence,
          method,
          path,
          resourceType,
          requestKind: requestKindFor(isNavigationRequest, resourceType),
          navigationInvocation,
          actionInvocation,
          correlationDigest: requestCorrelationDigest,
          redirectedFromObject,
          redirectedFromObjectIdentity: redirectedFromObject === null
            ? null
            : objectIdentity(redirectedFromObject),
          timestamp: meta.timestamp,
          phase: meta.phase,
          capturePhase: "request",
        });
        requests.push(envelope);
        return envelope;
      });
    },

    recordResponse(response) {
      return captureSafely({
        capturePhase: "response",
        rawObject: response,
        eventContext: {},
        defaultPhase: "response-callback",
      }, (meta, responseObjectIdentity) => {
        const responseRequestObject = readProperty("response", "request",
          () => response.request());
        const responseRequestObjectIdentity = objectIdentity(responseRequestObject);
        const status = readProperty("response", "status", () => response.status());
        if (!Number.isInteger(status) || status < 100 || status > 599) {
          throw captureFailure("response-status-invalid",
            "response status must be an HTTP status integer");
        }
        const envelope = Object.freeze({
          responseObject: response,
          responseObjectIdentity,
          responseRequestObject,
          responseRequestObjectIdentity,
          requestObjectIdentity: responseRequestObjectIdentity,
          sequence: meta.sequence,
          status,
          timestamp: meta.timestamp,
          phase: meta.phase,
          capturePhase: "response",
        });
        responses.push(envelope);
        return envelope;
      });
    },

    recordRequestFinished(request) {
      return captureSafely({
        capturePhase: "request-finished",
        rawObject: request,
        eventContext: {},
        defaultPhase: "request-finished-callback",
      }, (meta, requestObjectIdentity) => {
        const envelope = Object.freeze({
          requestObject: request,
          requestObjectIdentity,
          sequence: meta.sequence,
          timestamp: meta.timestamp,
          phase: meta.phase,
          capturePhase: "request-finished",
        });
        requestFinished.push(envelope);
        return envelope;
      });
    },

    recordRequestFailed(request, failure) {
      return captureSafely({
        capturePhase: "request-failed",
        rawObject: request,
        eventContext: {},
        defaultPhase: "request-failed-callback",
      }, (meta, requestObjectIdentity) => {
        const envelope = Object.freeze({
          requestObject: request,
          requestObjectIdentity,
          sequence: meta.sequence,
          failure: sanitizeCaptureError(failure),
          timestamp: meta.timestamp,
          phase: meta.phase,
          capturePhase: "request-failed",
        });
        requestFailed.push(envelope);
        return envelope;
      });
    },

    snapshot() {
      return Object.freeze({
        requests: Object.freeze([...requests]),
        responses: Object.freeze([...responses]),
        requestFinished: Object.freeze([...requestFinished]),
        requestFailed: Object.freeze([...requestFailed]),
        captureErrors: Object.freeze([...captureErrors]),
      });
    },
  };
  return Object.freeze(api);

  function nextErrorSequence() {
    lastSequence += 1;
    return lastSequence;
  }
}

function captureFailure(reasonCode, message, cause = undefined) {
  return new RecorderCaptureFailure(reasonCode, message, cause);
}

function readProperty(owner, property, read) {
  try {
    return read();
  } catch (error) {
    throw captureFailure(`${owner}-${property}-read-failed`,
      `${owner} ${property} property read failed`, error);
  }
}

function readContextProjection(eventContext, field) {
  try {
    if (!Object.hasOwn(eventContext, field)) return null;
    const value = eventContext[field];
    if (value === undefined) {
      throw captureFailure(`request-${toKebab(field)}-invalid`,
        `explicit ${field} projection must not be undefined`);
    }
    return value;
  } catch (error) {
    if (error instanceof RecorderCaptureFailure) throw error;
    throw captureFailure(`request-${toKebab(field)}-read-failed`,
      `request ${field} projection read failed`, error);
  }
}

function readCaptureContextField(eventContext, field, reasonField) {
  try {
    const present = Object.hasOwn(eventContext, field);
    return { present, value: present ? eventContext[field] : undefined };
  } catch (error) {
    throw captureFailure(`request-context-${reasonField}-read-failed`,
      `request context ${field} read failed`, error);
  }
}

function readRequestCorrelationDigest(eventContext, defaultDigest) {
  try {
    if (!Object.hasOwn(eventContext, "correlationDigest")) return defaultDigest;
    const value = eventContext.correlationDigest;
    if (typeof value !== "string" || value.length === 0) {
      throw captureFailure("request-correlation-digest-invalid",
        "explicit request correlationDigest must be a nonempty string");
    }
    return value;
  } catch (error) {
    if (error instanceof RecorderCaptureFailure) throw error;
    throw captureFailure("request-correlation-digest-read-failed",
      "request correlationDigest read failed", error);
  }
}

function captureInvocationProjection(value, field) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw captureFailure(`request-${field}-invalid`,
      `${field} projection must be an object or null`);
  }
  try {
    const projection = {
      invocationId: value.invocationId,
      phase: value.phase,
      startedSequence: value.startedSequence,
      endedSequence: value.endedSequence,
      startedAtMs: value.startedAtMs,
      endedAtMs: value.endedAtMs,
      current: value.current,
    };
    const hasOpenEnd = projection.current === true &&
      projection.endedSequence === null && projection.endedAtMs === null;
    const hasCompletedEnd = Number.isSafeInteger(projection.endedSequence) &&
      Number.isSafeInteger(projection.endedAtMs) &&
      projection.startedSequence <= projection.endedSequence &&
      projection.startedAtMs <= projection.endedAtMs;
    if (typeof projection.invocationId !== "string" ||
        projection.invocationId.length === 0 || typeof projection.phase !== "string" ||
        projection.phase.length === 0 ||
        !Number.isSafeInteger(projection.startedSequence) ||
        !Number.isSafeInteger(projection.startedAtMs) ||
        typeof projection.current !== "boolean" ||
        (!hasOpenEnd && !hasCompletedEnd)) {
      throw captureFailure(`request-${field}-invalid`,
        `${field} projection fields are invalid`);
    }
    return Object.freeze(projection);
  } catch (error) {
    if (error instanceof RecorderCaptureFailure) throw error;
    throw captureFailure(`request-${field}-read-failed`,
      `${field} projection read failed`, error);
  }
}

function normalizePath(rawUrl) {
  try {
    return new URL(rawUrl, "http://127.0.0.1").pathname;
  } catch (error) {
    throw captureFailure("request-url-normalize-failed", "request URL normalization failed",
      error);
  }
}

function requestKindFor(isNavigationRequest, resourceType) {
  if (isNavigationRequest && resourceType === "document") return "document-navigation";
  if (!isNavigationRequest && (resourceType === "fetch" || resourceType === "xhr")) {
    return "application-fetch";
  }
  if (typeof resourceType === "string" && resourceType.length > 0) return "subresource";
  return "unclassified-request";
}

function sanitizeCaptureError(error) {
  let name = "Error";
  let message = "unknown capture failure";
  try {
    if (error instanceof Error) {
      name = typeof error.name === "string" && error.name ? error.name : "Error";
      message = typeof error.message === "string" ? error.message : String(error.message);
    } else {
      message = String(error);
    }
  } catch {
    message = "unreadable capture failure";
  }
  return Object.freeze({ name, message });
}

function toKebab(value) {
  return value.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
}
