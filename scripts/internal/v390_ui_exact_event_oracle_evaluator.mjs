// 파일 용도: exact EVT oracle catalog의 response/DOM/network/state assertion을 누락 없이 fail-closed로 평가한다.

import crypto from "node:crypto";

import {
  eventExactOracleFor,
} from "./v390_ui_exact_event_oracles.mjs";

const DIRECT_RESPONSE_OPERATORS = new Set([
  "array", "boolean", "equals", "equals-fixture", "non-empty", "number", "number-gte", "object",
  "redacted", "score-descending", "starts-with", "string-non-empty",
]);
const DIRECT_DOM_OPERATORS = new Set([
  "contains-descendant", "contains-fixture-event", "contains-fixture-marker", "does-not-claim-longrun-pass",
  "not-contains-seed-credential-canary", "not-contains-seed-raw-canary", "not-contains-sensitive-canary",
  "number-equals-response", "selected-event-equals", "slot-count-equals", "text-includes",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function deepEqual(left, right) {
  return stable(left) === stable(right);
}

function scalarValues(value) {
  return Array.isArray(value) ? value.flatMap(scalarValues) : [value];
}

function valueText(value) {
  if (typeof value === "string") return value;
  if (value === undefined) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function recursiveContains(value, needle) {
  if (needle === undefined || needle === null || needle === "") return false;
  return valueText(value).includes(String(needle));
}

function pathTokens(path) {
  if (!path || path === "$" || path.startsWith("$")) return [];
  return String(path).split(".").flatMap(part => part.endsWith("[]")
    ? [{ key: part.slice(0, -2), expand: true }]
    : part.endsWith("[*]")
      ? [{ key: part.slice(0, -3), expand: true }]
      : [{ key: part, expand: false }]);
}

export function eventExactValuesAtPath(root, path) {
  if (path === "$" || path === "$body") return [root];
  let values = [root];
  for (const token of pathTokens(path)) {
    const next = [];
    for (const value of values) {
      if (!isObject(value) && !Array.isArray(value)) continue;
      const child = value?.[token.key];
      if (token.expand) {
        if (Array.isArray(child)) next.push(...child);
      } else if (child !== undefined) {
        next.push(child);
      }
    }
    values = next;
  }
  return values;
}

function normalizeTemplateValues(values = {}) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)]));
}

export function materializeEventExactTemplate(template, values = {}) {
  const normalized = normalizeTemplateValues(values);
  return String(template || "").replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (_, key) => {
    if (!(key in normalized)) throw new Error(`missing exact oracle template value: ${key}`);
    return encodeURIComponent(normalized[key]);
  });
}

export function eventExactSemanticEvidenceKey({ scope, caseId, operator, subject }) {
  if (!["response", "dom"].includes(scope)) throw new Error(`unsupported semantic evidence scope: ${scope}`);
  if (!caseId || !operator || !subject) throw new Error("semantic evidence key requires caseId, operator, and subject");
  return `${scope}:${caseId}:${operator}:${subject}`;
}

function semanticEvidenceFor(context, key) {
  const source = context?.semanticEvidence;
  if (source instanceof Map) return source.get(key);
  return source?.[key];
}

function expectedValueFor(context, assertion, scope) {
  const key = assertion.path || assertion.target;
  const stores = scope === "response"
    ? [context?.expectedResponseByPath, context?.seedByPath, context?.requestByPath, context?.priorResponseByPath]
    : [context?.expectedDomByTarget, context?.responseValues, context?.seedByPath, context?.requestByPath];
  for (const store of stores) {
    if (store && Object.prototype.hasOwnProperty.call(store, key)) return store[key];
  }
  return undefined;
}

function evaluateSemanticFallback({ scope, caseId, assertion, actual, context }) {
  const subject = assertion.path || assertion.target || "unknown";
  const key = eventExactSemanticEvidenceKey({ scope, caseId, operator: assertion.operator, subject });
  const evidence = semanticEvidenceFor(context, key);
  if (evidence === undefined) {
    return { pass: false, reason: `semantic evidence missing: ${key}`, evidenceKey: key };
  }
  if (typeof evidence === "boolean") {
    return { pass: evidence, reason: evidence ? "semantic evidence passed" : `semantic evidence failed: ${key}`, evidenceKey: key };
  }
  if (!isObject(evidence) || typeof evidence.pass !== "boolean") {
    return { pass: false, reason: `semantic evidence must be boolean or {pass}: ${key}`, evidenceKey: key };
  }
  if (evidence.actual !== undefined && !deepEqual(actual, evidence.actual)) {
    return { pass: false, reason: `semantic evidence actual value mismatch: ${key}`, evidenceKey: key };
  }
  return { pass: evidence.pass, reason: evidence.reason || (evidence.pass ? "semantic evidence passed" : `semantic evidence failed: ${key}`), evidenceKey: key };
}

function forbiddenCanaries(context) {
  return [
    ...(context?.sensitiveCanaries || []),
    context?.seed?.redactionCanary,
    context?.seed?.rawCanary,
    context?.seed?.credentialCanary,
  ].filter(value => value !== undefined && value !== null && String(value) !== "").map(String);
}

function everyValue(actual, predicate) {
  const values = scalarValues(actual);
  return values.length > 0 && values.every(predicate);
}

function evaluateDirectResponse({ assertion, actual, context }) {
  const expected = assertion.expected;
  switch (assertion.operator) {
    case "equals":
      return { pass: everyValue(actual, value => deepEqual(value, expected)), reason: "equals" };
    case "equals-fixture":
      return { pass: everyValue(actual, value => deepEqual(value, context.fixtureId)), reason: "equals-fixture" };
    case "number-gte":
      return { pass: everyValue(actual, value => Number.isFinite(Number(value)) && Number(value) >= Number(expected)), reason: "number-gte" };
    case "number":
      return { pass: everyValue(actual, value => typeof value === "number" && Number.isFinite(value)), reason: "number" };
    case "boolean":
      return { pass: everyValue(actual, value => typeof value === "boolean"), reason: "boolean" };
    case "object":
      return { pass: everyValue(actual, value => isObject(value)), reason: "object" };
    case "non-empty":
    case "string-non-empty":
      return { pass: everyValue(actual, value => value !== null && value !== undefined && (typeof value === "string" ? value.trim().length > 0 : Array.isArray(value) ? value.length > 0 : isObject(value) ? Object.keys(value).length > 0 : true)), reason: "non-empty" };
    case "starts-with":
      return { pass: everyValue(actual, value => String(value).startsWith(String(expected))), reason: "starts-with" };
    case "redacted": {
      const canaries = forbiddenCanaries(context);
      const text = valueText(actual);
      return { pass: canaries.every(canary => !text.includes(canary)) && !/authorization\s*:\s*bearer|password(hash)?|sessionsecret/i.test(text), reason: "redacted" };
    }
    case "score-descending": {
      const scores = scalarValues(actual).flatMap(value => Array.isArray(value) ? value : [value]).map(value => Number(value?.score)).filter(Number.isFinite);
      return { pass: scores.length > 0 && scores.every((score, index) => index === 0 || scores[index - 1] >= score), reason: "score-descending" };
    }
    default:
      return null;
  }
}

function genericContainsFixtureOperator(operator) {
  return operator.startsWith("contains-fixture") || operator === "csv-contains-fixture";
}

function genericSensitiveAbsenceOperator(operator) {
  return operator.startsWith("not-contains-seed-") || operator === "not-contains-sensitive-canary";
}

function directResponseAssertion(assertion) {
  return DIRECT_RESPONSE_OPERATORS.has(assertion.operator) || genericContainsFixtureOperator(assertion.operator) ||
    genericSensitiveAbsenceOperator(assertion.operator) ||
    ["equals-seed", "equals-request", "equals-requested-fields", "equals-requested-resolution", "equals-put-response", "equals-put-response-review", "equals-review-projection", "equals-seed-counts", "equals-seed-derivation", "contains-stages"].includes(assertion.operator);
}

function directDomAssertion(assertion) {
  return DIRECT_DOM_OPERATORS.has(assertion.operator);
}

export function eventExactRuntimeBindingRequirements(caseId) {
  const spec = eventExactOracleFor(caseId);
  const seedPaths = new Set();
  const requestPaths = new Set();
  const semanticEvidenceKeys = new Set();
  let sensitiveCanaryRequired = false;
  for (const request of spec.requests) {
    for (const assertion of request.assertions) {
      if (assertion.operator.includes("seed")) seedPaths.add(assertion.path);
      if (assertion.operator.includes("request")) requestPaths.add(assertion.path);
      if (!directResponseAssertion(assertion)) {
        semanticEvidenceKeys.add(eventExactSemanticEvidenceKey({
          scope: "response",
          caseId,
          operator: assertion.operator,
          subject: assertion.path,
        }));
      }
      if (genericSensitiveAbsenceOperator(assertion.operator)) sensitiveCanaryRequired = true;
    }
  }
  for (const contract of spec.dom) {
    for (const assertion of contract.assertions) {
      if (assertion.operator.includes("seed")) seedPaths.add(assertion.target);
      if (assertion.operator.includes("request")) requestPaths.add(assertion.target);
      if (!directDomAssertion(assertion)) {
        semanticEvidenceKeys.add(eventExactSemanticEvidenceKey({
          scope: "dom",
          caseId,
          operator: assertion.operator,
          subject: assertion.target,
        }));
      }
      if (genericSensitiveAbsenceOperator(assertion.operator)) sensitiveCanaryRequired = true;
    }
  }
  return Object.freeze({
    caseId,
    seedPaths: Object.freeze([...seedPaths]),
    requestPaths: Object.freeze([...requestPaths]),
    semanticEvidenceKeys: Object.freeze([...semanticEvidenceKeys]),
    sensitiveCanaryRequired,
    repeatedRequests: Object.freeze(spec.requests
      .filter(request => Number(request.repeat?.count || 1) > 1)
      .map(request => Object.freeze({
        method: request.method,
        path: request.path,
        count: Number(request.repeat.count),
        intervalMs: Number(request.repeat.intervalMs || 0),
      }))),
  });
}

export function assertEventExactRuntimeBindings(caseId, context = {}, {
  requireSemanticEvidence = true,
} = {}) {
  const requirements = eventExactRuntimeBindingRequirements(caseId);
  const missing = [];
  for (const path of requirements.seedPaths) {
    if (!Object.prototype.hasOwnProperty.call(context.seedByPath || {}, path) ||
        context.seedByPath[path] === undefined) {
      missing.push(`seedByPath:${path}`);
    }
  }
  for (const path of requirements.requestPaths) {
    if (!Object.prototype.hasOwnProperty.call(context.requestByPath || {}, path) ||
        context.requestByPath[path] === undefined) {
      missing.push(`requestByPath:${path}`);
    }
  }
  if (requirements.sensitiveCanaryRequired && forbiddenCanaries(context).length === 0) {
    missing.push("sensitiveCanaries");
  }
  if (requireSemanticEvidence) {
    for (const key of requirements.semanticEvidenceKeys) {
      if (semanticEvidenceFor(context, key) === undefined) missing.push(`semanticEvidence:${key}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(`${caseId} exact event runtime bindings missing: ${missing.join(", ")}`);
  }
  return requirements;
}

export function evaluateEventExactResponseAssertion({ caseId, assertion, responseJson, responseText = "", responseHeaders = {}, context = {} }) {
  let actual;
  if (assertion.path === "$text") actual = responseText;
  else if (assertion.path === "$contentType") actual = responseHeaders["content-type"] || responseHeaders["Content-Type"] || "";
  else {
    const values = eventExactValuesAtPath(responseJson, assertion.path);
    actual = values.length === 1 ? values[0] : values;
    if (values.length === 0) return { pass: false, reason: `required response path missing: ${assertion.path}`, assertion, actual: undefined };
    if (assertion.operator === "array") {
      return {
        pass: values.length === 1 && Array.isArray(values[0]),
        reason: "array",
        assertion,
        actual,
      };
    }
  }

  const direct = evaluateDirectResponse({ assertion, actual, context });
  if (direct) return { ...direct, assertion, actual };
  if (genericContainsFixtureOperator(assertion.operator)) {
    const expected = expectedValueFor(context, assertion, "response") ?? context.fixtureId;
    return { pass: recursiveContains(actual, expected), reason: `${assertion.operator} expected ${valueText(expected)}`, assertion, actual };
  }
  if (genericSensitiveAbsenceOperator(assertion.operator)) {
    const canaries = forbiddenCanaries(context);
    return { pass: canaries.length > 0 && canaries.every(canary => !valueText(actual).includes(canary)), reason: assertion.operator, assertion, actual };
  }
  if (["equals-seed", "equals-request", "equals-requested-fields", "equals-requested-resolution", "equals-put-response", "equals-put-response-review", "equals-review-projection", "equals-seed-counts", "equals-seed-derivation"].includes(assertion.operator)) {
    const expected = expectedValueFor(context, assertion, "response");
    if (expected === undefined) return { pass: false, reason: `expected value missing for ${assertion.operator}:${assertion.path}`, assertion, actual };
    if (assertion.operator === "equals-seed" &&
        expected && typeof expected === "object" &&
        /^[a-f0-9]{64}$/.test(String(expected.sha256 || "")) &&
        typeof expected.present === "boolean") {
      const actualPresent = typeof actual === "string" && actual.length > 0;
      const actualSha256 = sha256Text(typeof actual === "string" ? actual : "");
      return {
        pass: actualPresent === expected.present && actualSha256 === expected.sha256,
        reason: "equals-seed-digest",
        assertion,
        actual: { present: actualPresent, sha256: actualSha256 },
        expected,
      };
    }
    return { pass: deepEqual(actual, expected), reason: assertion.operator, assertion, actual, expected };
  }
  if (assertion.operator === "contains-stages") {
    const stages = scalarValues(actual).flatMap(value => Array.isArray(value) ? value : [value]).map(value => value?.stage ?? value);
    const expected = Array.isArray(assertion.expected) ? assertion.expected : [];
    return { pass: expected.length > 0 && expected.every(stage => stages.includes(stage)), reason: "contains-stages", assertion, actual, expected };
  }
  const semantic = evaluateSemanticFallback({ scope: "response", caseId, assertion, actual, context });
  return { ...semantic, assertion, actual };
}

function findForbiddenKey(value, forbiddenKeys, prefix = "") {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenKey(value[index], forbiddenKeys, `${prefix}[${index}]`);
      if (found) return found;
    }
    return "";
  }
  if (!isObject(value)) return "";
  const normalized = new Set(forbiddenKeys.map(key => String(key).toLowerCase()));
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (normalized.has(key.toLowerCase())) return path;
    const found = findForbiddenKey(child, forbiddenKeys, path);
    if (found) return found;
  }
  return "";
}

function requestIdentity(method, path) {
  return `${String(method || "GET").toUpperCase()} ${path}`;
}

function findExchange(exchanges, method, path) {
  return exchanges.find(item => requestIdentity(item.method, item.path) === requestIdentity(method, path));
}

export function evaluateEventExactRequests({ spec, exchanges = [], context = {} }) {
  const results = [];
  for (const request of spec.requests) {
    let path;
    try {
      path = materializeEventExactTemplate(request.path, context.templateValues || { fixtureId: context.fixtureId });
    } catch (error) {
      results.push({ pass: false, kind: "request-template", request, reason: String(error?.message || error) });
      continue;
    }
    const exchange = findExchange(exchanges, request.method, path);
    if (!exchange) {
      results.push({ pass: false, kind: "request-missing", request, reason: `request exchange missing: ${requestIdentity(request.method, path)}` });
      continue;
    }
    const statusPass = request.allowedStatuses.includes(Number(exchange.status));
    results.push({ pass: statusPass, kind: "request-status", request, actual: exchange.status, expected: request.allowedStatuses, reason: statusPass ? "allowed status" : "unexpected status" });
    if (request.correlationRequired) {
      const identity = requestIdentity(request.method, path);
      const expectedCorrelation = context?.correlationByRequest?.[identity];
      const pass = typeof exchange.correlationId === "string" && exchange.correlationId.length > 0 &&
        (expectedCorrelation === undefined || exchange.correlationId === expectedCorrelation);
      results.push({ pass, kind: "request-correlation", request, actual: exchange.correlationId, expected: expectedCorrelation, reason: pass ? "correlated request/response" : `missing or mismatched correlation: ${identity}` });
    }
    const forbiddenPath = findForbiddenKey(exchange.json, request.forbiddenJsonKeys || []);
    results.push({ pass: !forbiddenPath, kind: "forbidden-json-key", request, actual: forbiddenPath, reason: forbiddenPath ? `forbidden JSON key: ${forbiddenPath}` : "forbidden keys absent" });
    for (const assertion of request.assertions) {
      const result = evaluateEventExactResponseAssertion({
        caseId: spec.caseId,
        assertion,
        responseJson: exchange.json,
        responseText: exchange.text,
        responseHeaders: exchange.headers,
        context,
      });
      results.push({ ...result, kind: "response-assertion", request });
    }
  }
  return results;
}

function domText(observation) {
  return String(observation?.text ?? observation?.textContent ?? "");
}

function evaluateDirectDom({ assertion, observation, context }) {
  const text = domText(observation);
  switch (assertion.operator) {
    case "text-includes":
      return { pass: text.includes(String(assertion.target)), reason: "text-includes" };
    case "contains-descendant": {
      const selector = materializeEventExactTemplate(
        assertion.target,
        context.templateValues || { fixtureId: context.fixtureId },
      );
      const match = (observation.descendantMatches || [])
        .find(candidate => candidate?.selector === selector);
      const pass = observation.rootCount === 1 &&
        observation.visibleRootCount === 1 &&
        (observation.descendants || []).includes(selector) &&
        match?.ownerNodeCount === 1 && match?.count === 1 &&
        match?.visibleCount === 1;
      return {
        pass,
        reason: pass
          ? "contains-exact-visible-descendant"
          : "exact visible descendant cardinality mismatch",
      };
    }
    case "contains-fixture-event":
    case "contains-fixture-marker":
      return { pass: recursiveContains(observation, context.fixtureId), reason: assertion.operator };
    case "not-contains-seed-credential-canary":
    case "not-contains-seed-raw-canary":
    case "not-contains-sensitive-canary": {
      const canaries = forbiddenCanaries(context);
      return { pass: canaries.length > 0 && canaries.every(canary => !text.includes(canary)), reason: assertion.operator };
    }
    case "does-not-claim-longrun-pass":
      return { pass: !/(30|120)\s*(분|minute).*pass/i.test(text), reason: "does-not-claim-longrun-pass" };
    case "selected-event-equals":
      return { pass: recursiveContains(observation, context.fixtureId), reason: "selected-event-equals" };
    case "slot-count-equals":
      return { pass: Number(observation?.descendantCounts?.[assertion.target]) === Number(assertion.expected), reason: "slot-count-equals" };
    case "number-equals-response": {
      const expected = context?.responseValues?.[assertion.target];
      const actual = Number(observation?.number ?? observation?.value ?? text.trim());
      return { pass: expected !== undefined && Number(actual) === Number(expected), reason: expected === undefined ? `response value missing: ${assertion.target}` : "number-equals-response", actual, expected };
    }
    default:
      return null;
  }
}

export function evaluateEventExactDomAssertion({ caseId, assertion, observation, context = {} }) {
  const direct = evaluateDirectDom({ assertion, observation, context });
  if (direct) return { ...direct, assertion };
  const semantic = evaluateSemanticFallback({ scope: "dom", caseId, assertion, actual: observation, context });
  return { ...semantic, assertion, actual: observation };
}

export function evaluateEventExactDom({ spec, observations = [], context = {} }) {
  const results = [];
  for (const contract of spec.dom) {
    let selector;
    try {
      selector = materializeEventExactTemplate(contract.selector, context.templateValues || { fixtureId: context.fixtureId });
    } catch (error) {
      results.push({ pass: false, kind: "dom-template", contract, reason: String(error?.message || error) });
      continue;
    }
    const observation = observations.find(item => item.selector === selector);
    if (!observation) {
      results.push({ pass: false, kind: "dom-missing", contract, reason: `DOM observation missing: ${selector}` });
      continue;
    }
    results.push({ pass: observation.exists === true && observation.visible === true, kind: "dom-presence", contract, reason: "exact DOM target must exist and be visible" });
    const text = domText(observation);
    for (const token of contract.requiredTextTokens) {
      results.push({ pass: text.includes(token), kind: "dom-required-text", contract, actual: text, expected: token, reason: `required DOM text: ${token}` });
    }
    for (const token of contract.forbiddenTextTokens) {
      results.push({ pass: !text.includes(token), kind: "dom-forbidden-text", contract, actual: text, expected: token, reason: `forbidden DOM text: ${token}` });
    }
    for (const attribute of contract.requiredAttributes) {
      const actual = observation.attributes?.[attribute.name];
      const expected = attribute.value === null ? null : materializeEventExactTemplate(attribute.value, context.templateValues || { fixtureId: context.fixtureId });
      const pass = attribute.value === null ? actual !== undefined : String(actual) === String(expected);
      results.push({ pass, kind: "dom-required-attribute", contract, actual, expected, reason: `required DOM attribute: ${attribute.name}` });
    }
    for (const assertion of contract.assertions) {
      results.push({ ...evaluateEventExactDomAssertion({ caseId: spec.caseId, assertion, observation, context }), kind: "dom-assertion", contract });
    }
  }
  return results;
}

export function evaluateEventExactVisibleControl({ spec, observations = [], context = {} }) {
  let selector;
  try {
    selector = materializeEventExactTemplate(spec.visibleControl.selector, context.templateValues || { fixtureId: context.fixtureId });
  } catch (error) {
    return [{ pass: false, kind: "visible-control-template", reason: String(error?.message || error) }];
  }
  const observation = observations.find(item => item.selector === selector);
  const present = observation?.exists === true && observation?.visible === true;
  const actualAction = observation?.action ?? context.visibleControlAction;
  return [
    { pass: present, kind: "visible-control-presence", actual: observation, expected: selector, reason: present ? "visible control observed" : `visible control missing: ${selector}` },
    { pass: actualAction === spec.visibleControl.action, kind: "visible-control-action", actual: actualAction, expected: spec.visibleControl.action, reason: actualAction === spec.visibleControl.action ? "visible control action bound" : "visible control action mismatch" },
  ];
}

function globMatches(path, pattern) {
  if (pattern.endsWith("/*")) return path === pattern.slice(0, -2) || path.startsWith(pattern.slice(0, -1));
  return path === pattern;
}

export function evaluateEventExactForbiddenNetwork({ spec, network = [] }) {
  const results = [];
  for (const forbidden of spec.forbiddenNetwork) {
    const match = network.find(item => String(item.method).toUpperCase() === forbidden.method && globMatches(item.path, forbidden.path));
    results.push({ pass: !match, kind: "forbidden-network", forbidden, actual: match, reason: match ? `forbidden network mutation: ${requestIdentity(match.method, match.path)}` : "forbidden network mutation absent" });
  }
  return results;
}

function evaluateSnapshot(contract, evidence) {
  if (!evidence) return { pass: false, reason: `snapshot evidence missing: ${contract.scope}` };
  if (contract.policy === "equal") return { pass: evidence.beforeHash !== undefined && evidence.beforeHash === evidence.afterHash, reason: "before/after equal" };
  if (contract.policy === "restore") return { pass: evidence.beforeHash !== undefined && evidence.beforeHash === evidence.restoredHash, reason: "restored byte exact" };
  if (["baseline-after-cleanup", "remove-fixture-then-equal"].includes(contract.policy)) {
    return { pass: evidence.beforeHash !== undefined && evidence.beforeHash === evidence.cleanupHash && evidence.fixtureRemaining !== true, reason: contract.policy };
  }
  return { pass: false, reason: `unsupported snapshot policy: ${contract.policy}` };
}

export function evaluateEventExactStateAndCleanup({ spec, snapshots = {}, cleanupEvidence = {} }) {
  const results = spec.stateSnapshots.map(contract => ({
    ...evaluateSnapshot(contract, snapshots[contract.scope]),
    kind: "state-snapshot",
    contract,
  }));
  for (const assertion of spec.cleanup.assertions) {
    results.push({
      pass: cleanupEvidence[assertion] === true,
      kind: "cleanup-assertion",
      assertion,
      reason: cleanupEvidence[assertion] === true ? "cleanup assertion passed" : `cleanup evidence missing or false: ${assertion}`,
    });
  }
  return results;
}

export function createEventExactOracleEvaluationPlan(caseId) {
  const spec = eventExactOracleFor(caseId);
  const semanticEvidenceKeys = [
    ...spec.requests.flatMap(request => request.assertions.filter(assertion => !directResponseAssertion(assertion)).map(assertion =>
      eventExactSemanticEvidenceKey({ scope: "response", caseId, operator: assertion.operator, subject: assertion.path }))),
    ...spec.dom.flatMap(contract => contract.assertions.filter(assertion => !directDomAssertion(assertion)).map(assertion =>
      eventExactSemanticEvidenceKey({ scope: "dom", caseId, operator: assertion.operator, subject: assertion.target }))),
  ];
  return Object.freeze({
    caseId,
    responseAssertionCount: spec.requests.reduce((count, item) => count + item.assertions.length, 0),
    domAssertionCount: spec.dom.reduce((count, item) => count + item.assertions.length, 0),
    requestCount: spec.requests.length,
    domTargetCount: spec.dom.length,
    forbiddenNetworkCount: spec.forbiddenNetwork.length,
    snapshotCount: spec.stateSnapshots.length,
    cleanupAssertionCount: spec.cleanup.assertions.length,
    visibleControlCount: 1,
    semanticEvidenceKeys: Object.freeze(semanticEvidenceKeys),
  });
}

export function evaluateEventExactOracle({
  caseId,
  actualRoute,
  actualRole,
  exchanges = [],
  domObservations = [],
  network = [],
  snapshots = {},
  cleanupEvidence = {},
  context = {},
  throwOnFailure = false,
}) {
  const spec = eventExactOracleFor(caseId);
  const evaluationContext = { ...context, fixtureId: context.fixtureId, templateValues: { fixtureId: context.fixtureId, ...(context.templateValues || {}) } };
  const results = [
    { pass: typeof context.fixtureId === "string" && context.fixtureId.length > 0, kind: "fixture-context", actual: context.fixtureId, expected: "non-empty fixtureId", reason: "exact fixture identity" },
    { pass: actualRoute === spec.route, kind: "route", actual: actualRoute, expected: spec.route, reason: "exact product route" },
    { pass: actualRole === spec.role, kind: "role", actual: actualRole, expected: spec.role, reason: "exact account role" },
    ...evaluateEventExactRequests({ spec, exchanges, context: evaluationContext }),
    ...evaluateEventExactVisibleControl({ spec, observations: domObservations, context: evaluationContext }),
    ...evaluateEventExactDom({ spec, observations: domObservations, context: evaluationContext }),
    ...evaluateEventExactForbiddenNetwork({ spec, network }),
    ...evaluateEventExactStateAndCleanup({ spec, snapshots, cleanupEvidence }),
  ];
  const failures = results.filter(item => item.pass !== true);
  const report = Object.freeze({
    schema: "media-server.v390-ui-exact-event-oracle-evaluation.v1",
    caseId,
    pass: failures.length === 0,
    resultCount: results.length,
    failureCount: failures.length,
    results: Object.freeze(results),
  });
  if (throwOnFailure && failures.length) {
    throw new Error(`${caseId} exact event oracle failed (${failures.length}/${results.length}): ${failures.map(item => item.reason).join("; ")}`);
  }
  return report;
}

export function eventExactOracleEvaluatorCapabilities() {
  return Object.freeze({
    schema: "media-server.v390-ui-exact-event-oracle-evaluator-capabilities.v1",
    directResponseOperators: Object.freeze([...DIRECT_RESPONSE_OPERATORS].sort()),
    directDomOperators: Object.freeze([...DIRECT_DOM_OPERATORS].sort()),
    semanticFallback: "required-keyed-evidence-fail-closed",
    semanticEvidenceKeyFormat: "<response|dom>:<caseId>:<operator>:<path|target>",
  });
}
