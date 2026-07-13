// 파일 용도: REVIEW4-57 canonical requested와 runtime observed UI 상태의 공통 typed schema를 정의한다.

export const canonicalRequestedSchema = "media-server.v390-ui-canonical-requested.v1";
export const runtimeObservedSchema = "media-server.v390-ui-runtime-observed.v1";
export const requestedObservedEnvelopeSchema = "media-server.v390-ui-requested-observed-envelope.v1";

const requestedKeys = Object.freeze([
  "schema",
  "route",
  "accountRole",
  "viewport",
  "theme",
  "controlAction",
]);
const observedKeys = Object.freeze([
  "schema",
  "screenRoute",
  "accountRole",
  "viewport",
  "theme",
  "controlAction",
  "provenance",
]);
const observedControlKeys = Object.freeze([
  "selector",
  "applicability",
  "exists",
  "visible",
  "enabled",
]);
const observedProvenance = Object.freeze({
  screenRoute: "browser-location",
  accountRole: "session-whoami",
  viewport: "browser-inner-size",
  theme: "browser-media-query",
  controlAction: "dom-selector-state",
});

export function canonicalControlAction(controlAction) {
  const selector = Object.prototype.hasOwnProperty.call(controlAction || {}, "requestedSelector")
    ? controlAction.requestedSelector
    : Object.prototype.hasOwnProperty.call(controlAction || {}, "canonicalSelector")
    ? controlAction.canonicalSelector
    : controlAction?.selector;
  return {
    selector: selector ?? null,
    actionAnchor: String(controlAction?.actionAnchor || ""),
  };
}

export function canonicalRequestedProjection(item) {
  return {
    schema: canonicalRequestedSchema,
    route: String(item?.canonicalRoute ?? item?.route ?? ""),
    accountRole: String(item?.accountRole || ""),
    viewport: cloneViewport(item?.viewport),
    theme: String(item?.theme || ""),
    controlAction: canonicalControlAction(item?.controlAction),
  };
}

export function expectedRuntimeObservation(item) {
  const primaryControl = item?.workflow?.primaryControl || {};
  const applicability = primaryControl.applicability === "not-applicable"
    ? "not-applicable"
    : "required";
  return {
    schema: runtimeObservedSchema,
    screenRoute: String(primaryControl.route || item?.screenRoute || ""),
    accountRole: String(primaryControl.accountRole || item?.accountRole || ""),
    viewport: cloneViewport(item?.viewport),
    theme: String(item?.theme || ""),
    controlAction: {
      selector: primaryControl.selector ?? null,
      applicability,
      exists: applicability === "required",
      visible: primaryControl.expectedVisible === true,
      enabled: primaryControl.expectedEnabled === true,
    },
    provenance: { ...observedProvenance },
  };
}

export function runtimeObservedProjection(value) {
  const errors = [];
  validateObserved(value, errors);
  if (errors.length > 0) throw new Error(`runtime-observed-raw-invalid:${errors.join(",")}`);
  return {
    schema: value.schema,
    screenRoute: value.screenRoute,
    accountRole: value.accountRole,
    viewport: structuredClone(value.viewport),
    theme: value.theme,
    controlAction: {
      selector: value.controlAction.selector,
      applicability: value.controlAction.applicability,
      exists: value.controlAction.exists,
      visible: value.controlAction.visible,
      enabled: value.controlAction.enabled,
    },
    provenance: structuredClone(value.provenance),
  };
}

export function validateRequestedObservedEnvelope({ requested, observed, canonicalCase, nativeCase }) {
  const errors = [];
  validateRequested(requested, errors);
  validateObserved(observed, errors);
  if (canonicalCase) {
    const expectedRequested = canonicalRequestedProjection({
      canonicalRoute: canonicalCase.route,
      accountRole: canonicalCase.accountRole,
      viewport: canonicalCase.viewport,
      theme: canonicalCase.theme,
      controlAction: canonicalCase.controlAction,
    });
    compareFields(requested, expectedRequested, requestedKeys, "requested-canonical", errors);
  }
  if (nativeCase) {
    const expectedObserved = expectedRuntimeObservation(nativeCase);
    compareFields(observed, expectedObserved, observedKeys, "observed-runtime", errors);
  }
  return errors;
}

export function assertRequestedObservedEnvelope(args) {
  const errors = validateRequestedObservedEnvelope(args);
  if (errors.length > 0) throw new Error(errors.join("; "));
  return {
    schema: requestedObservedEnvelopeSchema,
    requested: structuredClone(args.requested),
    observed: structuredClone(args.observed),
  };
}

function validateRequested(value, errors) {
  expectExactKeys(value, requestedKeys, "requested", errors);
  if (value?.schema !== canonicalRequestedSchema) errors.push("requested-schema-mismatch");
  validateRoute(value?.route, "requested-route", errors);
  validateRole(value?.accountRole, "requested-accountRole", errors);
  validateViewport(value?.viewport, "requested-viewport", errors);
  validateTheme(value?.theme, "requested-theme", errors);
  expectExactKeys(value?.controlAction, ["selector", "actionAnchor"], "requested-controlAction", errors);
  if (!(value?.controlAction?.selector === null || typeof value?.controlAction?.selector === "string")) {
    errors.push("requested-controlAction-selector-invalid");
  }
  if (typeof value?.controlAction?.actionAnchor !== "string" || !value.controlAction.actionAnchor) {
    errors.push("requested-controlAction-actionAnchor-invalid");
  }
}

function validateObserved(value, errors) {
  expectExactKeys(value, observedKeys, "observed", errors);
  if (value?.schema !== runtimeObservedSchema) errors.push("observed-schema-mismatch");
  validateRoute(value?.screenRoute, "observed-screenRoute", errors);
  if (String(value?.screenRoute || "").includes("/api/")) errors.push("observed-screenRoute-api-route-forbidden");
  validateRole(value?.accountRole, "observed-accountRole", errors);
  validateViewport(value?.viewport, "observed-viewport", errors);
  validateTheme(value?.theme, "observed-theme", errors);
  expectExactKeys(value?.controlAction, observedControlKeys, "observed-controlAction", errors);
  if (!(value?.controlAction?.selector === null || typeof value?.controlAction?.selector === "string")) {
    errors.push("observed-controlAction-selector-invalid");
  }
  if (!["required", "not-applicable"].includes(value?.controlAction?.applicability)) {
    errors.push("observed-controlAction-applicability-invalid");
  }
  for (const field of ["exists", "visible", "enabled"]) {
    if (typeof value?.controlAction?.[field] !== "boolean") errors.push(`observed-controlAction-${field}-invalid`);
  }
  expectExactKeys(value?.provenance, Object.keys(observedProvenance), "observed-provenance", errors);
  for (const [field, expected] of Object.entries(observedProvenance)) {
    if (value?.provenance?.[field] !== expected) errors.push(`observed-provenance-${field}-mismatch`);
  }
}

function compareFields(actual, expected, fields, prefix, errors) {
  for (const field of fields) {
    if (stableStringify(actual?.[field]) !== stableStringify(expected?.[field])) {
      errors.push(`${prefix}-${field}-mismatch`);
    }
  }
}

function expectExactKeys(value, expectedKeys, prefix, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${prefix}-object-missing`);
    return;
  }
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (stableStringify(actual) !== stableStringify(expected)) errors.push(`${prefix}-fields-mismatch`);
}

function validateRoute(value, prefix, errors) {
  if (typeof value !== "string" || !value.startsWith("/")) errors.push(`${prefix}-invalid`);
}

function validateRole(value, prefix, errors) {
  if (!["anonymous", "operator", "viewer"].includes(value)) errors.push(`${prefix}-invalid`);
}

function validateViewport(value, prefix, errors) {
  if (!Number.isInteger(value?.width) || value.width <= 0 ||
      !Number.isInteger(value?.height) || value.height <= 0) errors.push(`${prefix}-invalid`);
}

function validateTheme(value, prefix, errors) {
  if (!["light", "dark"].includes(value)) errors.push(`${prefix}-invalid`);
}

function cloneViewport(value) {
  return {
    width: Number(value?.width || 0),
    height: Number(value?.height || 0),
  };
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
