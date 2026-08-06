#!/usr/bin/env node

// 파일 용도: 750cdfd8 actual batch의 최종 잔여 5건을 전체 runtime operator 입력으로 replay한다.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as caseRuntime from "./v390_ui_case_runtime.mjs";
import {
  eventTypedResponseBinding,
  typedActiveResolutionFiltersFromUrl,
} from "./v390_ui_case_runtime.mjs";
import {
  materializeEventExactTemplate,
  validateIncidentMemorySearchResponseProjection,
} from "./v390_ui_exact_event_oracle_evaluator.mjs";
import { eventExactOracleFor } from "./v390_ui_exact_event_oracles.mjs";
import * as exactRuntime from "./v390_ui_exact_oracle_runtime.mjs";
import {
  buildExactDomAttributeBindingEvidence,
} from "./v390_ui_exact_oracle_runtime.mjs";
import {
  domSnapshotDigest,
  evaluateCompletionOracle,
} from "./v390_ui_completion_oracle_lib.mjs";
import { materializeClientSafeExactOracle } from "./v390_ui_exact_client_safe_oracles.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runId = "v390-ui-diagnostic-20260806142335-93401";
const runRoot = path.join(root, ".media_server.test/v3.9.0/ui-diagnostic-sweep", runId);
const regressionRunId = "v390-ui-diagnostic-20260806152819-11248";
const regressionRunRoot = path.join(
  root,
  ".media_server.test/v3.9.0/ui-diagnostic-sweep",
  regressionRunId,
);
const cases = Object.freeze([
  ["EVT-041", "1317e6eb76cb99d657bda8e99f6e4f8c7db93a63790b14fcedb6bf608aae0074", "69fb8041f62861266e4e67633d6f46c45e62422052f8789c61da3741c951bec5", "memorySearch.hits[1].sourceId[type]"],
  ["EVT-046", "e91d0362b1ebd52201c44ac8f6df2eb405937c02bd3e0faaf102cbb0e59021b6", "f137dbd860643d3fbf8549b24e8a53b299f75569c0ffc7a8788c691659a5aea4", "request-correlation-missing"],
  ["EVT-048", "40901271a8a4b6fb51c63d432992914853f477e395ff69dd19ba43359b97f644", "266ac555f10759f63521b2c03bf52bcfaaf1d9a55597edde91d4c83e37bdb96b", "baselinePresent"],
  ["EVT-070", "4394e5fcdce99d3c9a1eae0ebc142b682a129827f94901f11481e2c831d5d02c", "c07ce5d5dfe1287044f45b727f3092c544d1ae4289aa5568032cfe05f122dd72", "incidentStatus=open"],
  ["CLIENT-019", "697e4cb071edb56c17f16646a79e0ff8d1b33b00d7854cdd471e56e68b7e8547", "4a72b3a5c85b2d3053441810c8b1e024422c15fe044d7e23a7cca4097d5da88b", "playsinline=exact-node"],
]);

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
const readCase = ([caseId, summarySha, traceSha, failureSignature]) => {
  const caseRoot = path.join(runRoot, "cases", caseId);
  const summaryBytes = fs.readFileSync(path.join(caseRoot, "summary.json"));
  const traceBytes = fs.readFileSync(path.join(caseRoot, "traces", `${caseId}.trace.json`));
  assert.equal(sha256(summaryBytes), summarySha, `${caseId} summary digest drift`);
  assert.equal(sha256(traceBytes), traceSha, `${caseId} trace digest drift`);
  const summary = JSON.parse(summaryBytes);
  const trace = JSON.parse(traceBytes);
  assert.equal(summary.case?.status, "FAIL", `${caseId} actual status drift`);
  assert.equal(trace.caseId, caseId, `${caseId} trace identity drift`);
  const failureText = `${summary.case?.failureDetail || ""}\n${stable(summary.case?.primaryFailureEvidence || {})}`;
  assert(failureText.includes(failureSignature), `${caseId} actual failure signature drift`);
  return { summary, trace };
};

assert.equal(sha256(fs.readFileSync(path.join(runRoot, "summary.json"))),
  "bd6e8743dd9e0aa0bccbae1376a7175019e9eb2fade4ed83db6da0a58383b1df");
const runSummary = JSON.parse(fs.readFileSync(path.join(runRoot, "summary.json")));
assert.deepEqual(runSummary.counts, { target: 125, attempted: 125, pass: 120, fail: 5, notRun: 0 });
assert.equal(runSummary.sourceBinding?.gitCommit, "750cdfd8a371b618d4f0f3e8f463da9bfecbff61");
const actual = new Map(cases.map(entry => [entry[0], readCase(entry)]));

const failures = [];
const closed = new Set();
const close = (caseId, operation) => {
  try {
    operation();
    closed.add(caseId);
  } catch (error) {
    failures.push(`${caseId}: ${String(error?.message || error)}`);
  }
};
const expectReject = (operation, signature) => {
  let error = null;
  try {
    operation();
  } catch (caught) {
    error = caught;
  }
  assert(error, `negative replay unexpectedly passed: ${signature}`);
  assert(String(error.message).includes(signature),
    `negative replay failure drift: ${String(error.message)} / ${signature}`);
};

const fixtureId = "evt-041-review4-fixture";
const fixtureSourceId = "stream-review4-fixture";
const fixtureHit = Object.freeze({
  documentId: `event-record:${fixtureId}`,
  sourceKind: "event-record",
  incidentId: `incident:${fixtureId}`,
  sourceId: fixtureSourceId,
  title: fixtureId,
  summary: "fixture incident memory summary",
  score: 1,
  matchedTerms: ["evt", "041", "review4", "fixture"],
  highlightFragments: ["evt 041 review4 fixture"],
});
const unrelatedHit = Object.freeze({
  documentId: "review-note:unrelated",
  sourceKind: "review-note",
  incidentId: "incident:unrelated",
  sourceId: null,
  title: "unrelated",
  summary: "unrelated incident memory summary",
  score: 0.25,
  matchedTerms: ["review4"],
  highlightFragments: ["review4"],
});
const memoryResponse = hits => ({
  memorySearch: {
    schema: "media-server.ops.incident-memory-search-view.v1",
    query: fixtureId,
    hits,
  },
});
close("EVT-041", () => {
  const evidence = validateIncidentMemorySearchResponseProjection({
    caseId: "EVT-041",
    responseJson: memoryResponse([fixtureHit, unrelatedHit]),
    fixtureId,
    query: fixtureId,
    sourceId: fixtureSourceId,
  });
  assert.equal(evidence.fixtureHitCount, 1);
  expectReject(() => validateIncidentMemorySearchResponseProjection({
    caseId: "EVT-041",
    responseJson: memoryResponse([fixtureHit, { ...fixtureHit }]),
    fixtureId,
    query: fixtureId,
    sourceId: fixtureSourceId,
  }), "duplicate");
  for (const sourceId of [41, "wrong-source"]) {
    expectReject(() => validateIncidentMemorySearchResponseProjection({
      caseId: "EVT-041",
      responseJson: memoryResponse([{ ...fixtureHit, sourceId }, unrelatedHit]),
      fixtureId,
      query: fixtureId,
      sourceId: fixtureSourceId,
    }), ".sourceId");
  }
});

close("EVT-046", () => {
  const action = actual.get("EVT-046").trace.actions[0];
  const observation = { actual: action.observed };
  const completion = evaluateCompletionOracle({
    action,
    before: null,
    after: action.observed,
    networkResponses: [],
    semanticReadback: {
      schema: "media-server.v390-ui-semantic-readback.v2",
      identity: action.expectedReadbackIdentity,
      correlationId: action.correlationId,
      actionId: action.actionId,
      expectedBehaviorSha256: action.expectedBehaviorSha256,
      observationSource: "browser-dom",
      selector: action.controlSelector,
      observation,
      observationSha256: domSnapshotDigest(observation),
    },
  });
  assert.equal(completion.pass, true, completion.reason);
  const wrongIdentity = structuredClone(action);
  wrongIdentity.observed.exactRuntimeOracle.responses[0]
    .requestCorrelationEvidence.responseRequestIdentity = "EVT-046:request-wrong";
  const wrongObservation = { actual: wrongIdentity.observed };
  const rejected = evaluateCompletionOracle({
    action: wrongIdentity,
    before: null,
    after: wrongIdentity.observed,
    networkResponses: [],
    semanticReadback: {
      schema: "media-server.v390-ui-semantic-readback.v2",
      identity: wrongIdentity.expectedReadbackIdentity,
      correlationId: wrongIdentity.correlationId,
      actionId: wrongIdentity.actionId,
      expectedBehaviorSha256: wrongIdentity.expectedBehaviorSha256,
      observationSource: "browser-dom",
      selector: wrongIdentity.controlSelector,
      observation: wrongObservation,
      observationSha256: domSnapshotDigest(wrongObservation),
    },
  });
  assert.equal(rejected.pass, false);
});

const sourceHealthRows = Object.freeze([
  Object.freeze({ sourceId: "9002", status: "available", reason: "healthy" }),
  Object.freeze({ sourceId: "9001", status: "degraded", reason: "source-health-fixture" }),
]);
const sourceAssertion = Object.freeze({ path: "sourceHealth", operator: "contains-fixture-source", expected: true });
const sourceBinding = eventTypedResponseBinding({
  assertionPath: sourceAssertion.path,
  operator: sourceAssertion.operator,
  fixtureId: "evt-048-review4-fixture",
  sourceId: "9001",
  responseJson: { sourceHealth: sourceHealthRows },
  comparisonProjectionPaths: ["status", "reason"],
});
close("EVT-048", () => {
  assert.equal(typeof exactRuntime.evaluateEventRuntimeRequestAssertions, "function",
    "actual request semantic operator replay is unavailable");
  const baseline = {
    ...sourceBinding,
    requestMethod: "GET",
    requestPathTemplate: "/ops/api/source-health",
    assertionOperator: sourceAssertion.operator,
    assertionPath: sourceAssertion.path,
  };
  const context = {
    body: { sourceHealth: sourceHealthRows },
    contentType: "application/json",
    status: 200,
    bindings: { fixtureId: "evt-048-review4-fixture", sourceId: "9001" },
    caseId: "EVT-048",
    requestLabel: "GET /ops/api/source-health",
    request: { method: "GET", path: "/ops/api/source-health" },
    urlPath: "/ops/api/source-health",
    samples: [{ body: { sourceHealth: sourceHealthRows }, contentType: "application/json", status: 200 }],
    eventRuntimeContext: { requestRowLocalBaselines: [baseline] },
  };
  const evidence = exactRuntime.evaluateEventRuntimeRequestAssertions([sourceAssertion], context);
  assert.equal(evidence.length, 1);
  expectReject(() => exactRuntime.evaluateEventRuntimeRequestAssertions([sourceAssertion], {
    ...context,
    eventRuntimeContext: { requestRowLocalBaselines: [] },
  }), "contains-fixture-source sourceHealth");
  expectReject(() => exactRuntime.evaluateEventRuntimeRequestAssertions([sourceAssertion], {
    ...context,
    body: { sourceHealth: [...sourceHealthRows, { ...sourceHealthRows[1] }] },
  }), "fixture cardinality mismatch");
  expectReject(() => exactRuntime.evaluateEventRuntimeRequestAssertions([sourceAssertion], {
    ...context,
    body: { sourceHealth: [sourceHealthRows[0], { ...sourceHealthRows[1], reason: "drift" }] },
  }), "contains-fixture-source sourceHealth");
});

close("EVT-070", () => {
  assert.equal(typeof caseRuntime.exactOracleRuntimeBindings, "function",
    "authoritative catalog runtime binding replay is unavailable");
  assert.equal(typeof exactRuntime.evaluateEventRuntimeRequestAssertions, "function",
    "actual request semantic operator replay is unavailable");
  const bindings = caseRuntime.exactOracleRuntimeBindings({
    defaultViewId: "9001",
    fixtureId: "evt-070-review4-fixture",
    catalogBindings: {
      sourceId: "9001",
      ruleId: "1",
      searchQuery: "evt-070-review4-fixture",
      incidentStatus: "new",
      incidentMemoryHitSourceId: "stream-review4-fixture",
    },
  });
  assert.equal(bindings.incidentStatus, "new");
  const urlPath = `/ops/api/events/reviews?q=${bindings.searchQuery}&ruleId=${bindings.ruleId}` +
    `&sourceId=${bindings.sourceId}&incidentStatus=${bindings.incidentStatus}`;
  const activeFilters = typedActiveResolutionFiltersFromUrl(urlPath);
  const assertion = {
    path: "unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters",
    operator: "equals-request",
    expected: true,
  };
  const context = {
    body: { unifiedResolutionWorkspace: { resolutionSearchMetricsSummary: { activeResolutionFilters: activeFilters } } },
    contentType: "application/json",
    status: 200,
    bindings: { fixtureId: "evt-070-review4-fixture", ...bindings },
    caseId: "EVT-070",
    requestLabel: `GET ${urlPath}`,
    request: { method: "GET", path: urlPath },
    urlPath,
    samples: [],
    eventRuntimeContext: { requestByPath: { [assertion.path]: activeFilters } },
  };
  assert.equal(exactRuntime.evaluateEventRuntimeRequestAssertions([assertion], context).length, 1);
  for (const drift of [
    { ...activeFilters, incidentStatus: "open" },
    Object.fromEntries(Object.entries(activeFilters).filter(([key]) => key !== "incidentStatus")),
  ]) {
    expectReject(() => exactRuntime.evaluateEventRuntimeRequestAssertions([assertion], {
      ...context,
      body: { unifiedResolutionWorkspace: { resolutionSearchMetricsSummary: { activeResolutionFilters: drift } } },
    }), "equals-request unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters");
  }
});

close("CLIENT-019", () => {
  const spec = materializeClientSafeExactOracle("CLIENT-019", {
    "assigned-view": "9001",
    "playable-source": "9001",
  });
  const domContract = spec.dom.find(item => item.selector === '[data-tile="0"] video' &&
    item.requiredAttributes.some(attribute => attribute.name === "playsinline"));
  const playsinline = domContract.requiredAttributes.find(item => item.name === "playsinline");
  const candidate = { index: 0, attributeNames: ["playsinline"], attributeValues: { playsinline: "" } };
  const evidence = buildExactDomAttributeBindingEvidence({
    selector: domContract.selector,
    requiredAttributes: [playsinline],
    candidates: [candidate],
    nodeCount: 1,
    selectedIndices: [0],
  });
  assert.equal(evidence.pass, true, evidence.failureCode);
  assert.equal(buildExactDomAttributeBindingEvidence({
    selector: domContract.selector,
    requiredAttributes: [playsinline],
    candidates: [{ index: 0, attributeNames: [], attributeValues: {} }],
    nodeCount: 1,
    selectedIndices: [0],
  }).pass, false);
  assert.equal(buildExactDomAttributeBindingEvidence({
    selector: domContract.selector,
    requiredAttributes: [playsinline],
    candidates: [candidate, { ...candidate, index: 1 }],
    nodeCount: 2,
    selectedIndices: [0, 1],
  }).pass, false);
});

const expectedRunArtifacts = Object.freeze({
  [runId]: Object.freeze({
    summarySha256: "bd6e8743dd9e0aa0bccbae1376a7175019e9eb2fade4ed83db6da0a58383b1df",
    manifestSha256: "508f7aebb84e6fa298a6843b81df1d5f3c72d194a5619df0eb2e1273401398da",
    caseSummarySetSha256: "525fbd2cab32553fdb8f925df8a8b97e98ab8be863d8b6f48585f30b9b117107",
    caseTraceSetSha256: "74ff80f4adfa47c8a17f480a61c675ef50cee372ea05d0b6fa7395a177e4cdc8",
    sourceCommit: "750cdfd8a371b618d4f0f3e8f463da9bfecbff61",
  }),
  [regressionRunId]: Object.freeze({
    summarySha256: "9b0d20905b1b8879b8d77d02356e796860de64b627e3876e2e4060cc9eaa59a7",
    manifestSha256: "1cae23fd5521102fd97f4741ef74ac38a25bc9c50187d81624e3adda8cb17b86",
    caseSummarySetSha256: "602cd9641d2f6ca5b409f222de477a9e92ae25b6fad16fe5ee5114f77b8a97ae",
    caseTraceSetSha256: "25229fd32fca8c352b920b01314b98b1dd7eaa8cc43e4ede69e0a33e68115e14",
    sourceCommit: "275b5f816cd5859c3cf3a11d9f7fabcb005042d9",
  }),
});

function readPinnedRun(runPath, expected) {
  const summaryBytes = fs.readFileSync(path.join(runPath, "summary.json"));
  const manifestBytes = fs.readFileSync(path.join(runPath, "diagnostic-native-manifest.json"));
  assert.equal(sha256(summaryBytes), expected.summarySha256, "actual parent summary digest drift");
  assert.equal(sha256(manifestBytes), expected.manifestSha256, "actual manifest digest drift");
  const summary = JSON.parse(summaryBytes);
  const manifest = JSON.parse(manifestBytes);
  assert.equal(summary.sourceBinding?.gitCommit, expected.sourceCommit);
  assert.equal(summary.cases?.length, 125);
  assert.equal(manifest.cases?.length, 424);
  const caseIds = summary.cases.map(item => item.caseId);
  assert.equal(new Set(caseIds).size, 125, "actual case identities are not unique");
  const caseSummaries = new Map();
  const traces = new Map();
  const summaryDigests = [];
  const traceDigests = [];
  for (const caseId of [...caseIds].sort()) {
    const caseRoot = path.join(runPath, "cases", caseId);
    const caseSummaryBytes = fs.readFileSync(path.join(caseRoot, "summary.json"));
    const traceBytes = fs.readFileSync(path.join(caseRoot, "traces", `${caseId}.trace.json`));
    const caseSummary = JSON.parse(caseSummaryBytes);
    const trace = JSON.parse(traceBytes);
    assert.equal(caseSummary.case?.caseId, caseId);
    assert.equal(trace.caseId, caseId);
    assert.equal(caseSummary.case?.status,
      summary.cases.find(item => item.caseId === caseId)?.status);
    summaryDigests.push(`${caseId}:${sha256(caseSummaryBytes)}`);
    traceDigests.push(`${caseId}:${sha256(traceBytes)}`);
    caseSummaries.set(caseId, caseSummary);
    traces.set(caseId, trace);
  }
  assert.equal(sha256(summaryDigests.join("\n")), expected.caseSummarySetSha256,
    "actual per-case summary set digest drift");
  assert.equal(sha256(traceDigests.join("\n")), expected.caseTraceSetSha256,
    "actual per-case trace set digest drift");
  return { summary, manifest, caseSummaries, traces };
}

const priorRun = readPinnedRun(runRoot, expectedRunArtifacts[runId]);
const regressionRun = readPinnedRun(
  regressionRunRoot,
  expectedRunArtifacts[regressionRunId],
);
const priorStatus = new Map(priorRun.summary.cases.map(item => [item.caseId, item.status]));
const regressionStatus = new Map(
  regressionRun.summary.cases.map(item => [item.caseId, item.status]),
);
const transitions = new Map([
  ["PASS->PASS", []],
  ["PASS->FAIL", []],
  ["FAIL->PASS", []],
  ["FAIL->FAIL", []],
]);
for (const caseId of priorStatus.keys()) {
  const transition = `${priorStatus.get(caseId)}->${regressionStatus.get(caseId)}`;
  assert(transitions.has(transition), `${caseId} unsupported actual transition: ${transition}`);
  transitions.get(transition).push(caseId);
}
for (const ids of transitions.values()) ids.sort();
const regressedIds = Object.freeze([
  "EVT-023", "EVT-025", "EVT-026", "EVT-028", "EVT-031",
  "EVT-036", "EVT-047", "EVT-064", "EVT-065", "EVT-066",
  "EVT-067", "EVT-069", "EVT-071", "EVT-072", "EVT-075",
]);
const continuingFailureIds = Object.freeze(["EVT-041", "EVT-048", "EVT-070"]);
const newPassIds = Object.freeze(["CLIENT-019", "EVT-046"]);
assert.deepEqual(transitions.get("PASS->FAIL"), regressedIds);
assert.deepEqual(transitions.get("FAIL->PASS"), newPassIds);
assert.deepEqual(transitions.get("FAIL->FAIL"), continuingFailureIds);
assert.equal(transitions.get("PASS->PASS").length, 105);

function actualFailureOperatorInput(caseId) {
  const caseSummary = regressionRun.caseSummaries.get(caseId);
  const trace = regressionRun.traces.get(caseId);
  const failure = caseSummary.case?.requestSemanticAssertionEvidence;
  assert(failure?.schema === "media-server.v390-ui-request-semantic-assertion-evidence.v1" &&
    failure.pass === false, `${caseId} actual request-semantic evidence missing`);
  const fixtureId = trace.setup.find(item => item.kind === "seed-reviewed-state")?.fixtureId;
  assert(typeof fixtureId === "string" && fixtureId, `${caseId} actual fixture seed missing`);
  const spec = eventExactOracleFor(caseId);
  const request = spec.requests.find(candidate =>
    sha256(candidate.path) === failure.requestPathTemplateDigest);
  assert(request, `${caseId} actual request template owner missing`);
  const assertion = request.assertions[Number(failure.assertionIndex)];
  assert(assertion && assertion.operator === failure.assertionOperator &&
    sha256(assertion.path) === failure.assertionPathDigest,
  `${caseId} actual assertion operator input drift`);
  const requestMatch = caseSummary.case.failureDetail.match(
    /failed (GET|HEAD) ([^:]+):/,
  );
  assert(requestMatch, `${caseId} actual request observation missing`);
  const method = requestMatch[1];
  const urlPath = requestMatch[2];
  assert.equal(method, failure.requestMethod);
  assert.equal(sha256(urlPath), failure.requestPathDigest);
  const query = Object.fromEntries(
    new URL(urlPath, "http://runtime.invalid").searchParams.entries(),
  );
  const bindings = {
    fixtureId,
    eventId: fixtureId,
    id: fixtureId,
    viewId: "9001",
    sourceId: query.sourceId || "9001",
    ruleId: query.ruleId || "1",
    q: query.q || fixtureId,
    incidentStatus: query.incidentStatus || "open",
  };
  assert.equal(materializeEventExactTemplate(request.path, bindings), urlPath,
    `${caseId} actual request fixture materialization drift`);
  const digestInput = {
    caseId,
    sourceCommit: regressionRun.summary.sourceBinding.gitCommit,
    fixtureSeed: { fixtureId },
    requestObservation: { method, urlPath, pathTemplate: request.path, query },
    assertionInput: {
      index: failure.assertionIndex,
      operator: assertion.operator,
      path: assertion.path,
    },
    responseCandidates: {
      baselinePresent: failure.baselinePresent,
      baselineDigest: failure.baselineDigest,
      actualPresent: failure.actualPresent,
      actualDigest: failure.actualDigest,
      expectedPresent: failure.expectedPresent,
      expectedDigest: failure.expectedDigest,
    },
  };
  return Object.freeze({
    ...digestInput,
    operatorInputDigest: sha256(stable(digestInput)),
    request,
    assertion,
    bindings,
  });
}

function validateActualFailureOperatorInput(input) {
  for (const key of [
    "caseId", "sourceCommit", "fixtureSeed", "requestObservation",
    "assertionInput", "responseCandidates", "operatorInputDigest",
  ]) assert(input?.[key] !== undefined, `actual operator input field missing: ${key}`);
  for (const key of ["baselineDigest", "actualDigest", "expectedDigest"]) {
    assert(/^[a-f0-9]{64}$/.test(String(input.responseCandidates?.[key] || "")),
      `actual operator response digest missing: ${key}`);
  }
  const digestInput = {
    caseId: input.caseId,
    sourceCommit: input.sourceCommit,
    fixtureSeed: input.fixtureSeed,
    requestObservation: input.requestObservation,
    assertionInput: input.assertionInput,
    responseCandidates: input.responseCandidates,
  };
  assert.equal(sha256(stable(digestInput)), input.operatorInputDigest,
    "actual operator input digest mismatch");
}

const requestFailureIds = Object.freeze([...regressedIds, "EVT-048", "EVT-070"]);
const actualOperatorInputs = new Map(requestFailureIds.map(caseId => {
  const input = actualFailureOperatorInput(caseId);
  validateActualFailureOperatorInput(input);
  return [caseId, input];
}));

function setNested(owner, relativePath, value) {
  const keys = relativePath.split(".").filter(Boolean);
  let cursor = owner;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) cursor[key] = structuredClone(value);
    else cursor = cursor[key] ||= {};
  });
}

function responseOwnerFor(input, seedValue, freshness) {
  const pathValue = input.assertion.path;
  let collectionPath;
  let prefix;
  let row;
  if (pathValue === "records.records" || pathValue.startsWith("records.records[].")) {
    collectionPath = "records.records";
    prefix = "records.records";
    row = { eventId: input.fixtureSeed.fixtureId };
  } else if (pathValue === "sourceHealth" || pathValue.startsWith("sourceHealth[].")) {
    collectionPath = "sourceHealth";
    prefix = "sourceHealth";
    row = { sourceId: input.bindings.sourceId, status: "degraded", reason: "fixture-health" };
  } else if (pathValue === "records" || pathValue.startsWith("records[].")) {
    collectionPath = "records";
    prefix = "records";
    row = {
      event: { eventId: input.fixtureSeed.fixtureId },
      review: { eventId: input.fixtureSeed.fixtureId },
    };
  } else if (pathValue === "unifiedResolutionWorkspace.resolutionQueue" ||
      pathValue.startsWith("unifiedResolutionWorkspace.resolutionQueue[].")) {
    collectionPath = "unifiedResolutionWorkspace.resolutionQueue";
    prefix = collectionPath;
    row = { eventId: input.fixtureSeed.fixtureId, sourceId: input.bindings.sourceId };
  } else {
    throw new Error(`${input.caseId} replay collection owner is unsupported: ${pathValue}`);
  }
  row.runtimeSampleFreshness = freshness;
  const expandedPrefix = `${prefix}[]`;
  if (pathValue.startsWith(`${expandedPrefix}.`)) {
    setNested(row, pathValue.slice(expandedPrefix.length + 1), seedValue);
  }
  const body = {};
  setNested(body, collectionPath, [row]);
  return { body, row, collectionPath };
}

function replayRequestSemanticOperator(input) {
  const seedValue = Object.freeze({
    schema: "media-server.v390-ui-recorded-operator-seed.v1",
    fixtureId: input.fixtureSeed.fixtureId,
    assertionPath: input.assertion.path,
  });
  const baselineOwner = responseOwnerFor(input, seedValue, "baseline");
  const freshOwner = responseOwnerFor(input, seedValue, "fresh");
  let baseline = eventTypedResponseBinding({
    assertionPath: input.assertion.path,
    operator: input.assertion.operator,
    fixtureId: input.fixtureSeed.fixtureId,
    sourceId: input.bindings.sourceId,
    responseJson: baselineOwner.body,
  });
  assert(baseline, `${input.caseId} typed replay baseline missing`);
  baseline = Object.freeze({
    ...baseline,
    requestMethod: input.requestObservation.method,
    requestPathTemplate: input.request.path,
    assertionOperator: input.assertion.operator,
    assertionPath: input.assertion.path,
  });
  if (input.caseId === "EVT-048") {
    baseline = Object.freeze({
      ...baseline,
      comparisonProjectionPaths: Object.freeze(["status", "reason"]),
      expectedComparisonProjection: Object.freeze({
        status: baselineOwner.row.status,
        reason: baselineOwner.row.reason,
      }),
    });
  }
  const context = {
    body: freshOwner.body,
    contentType: "application/json",
    status: 200,
    bindings: { fixtureId: input.fixtureSeed.fixtureId, ...input.bindings },
    caseId: input.caseId,
    requestLabel: `${input.requestObservation.method} ${input.requestObservation.urlPath}`,
    request: {
      method: input.requestObservation.method,
      path: input.request.path,
      pathTemplate: input.request.path,
    },
    urlPath: input.requestObservation.urlPath,
    samples: [],
    eventRuntimeContext: {
      requestRowLocalBaselines: [baseline],
      seedByPath: { [input.assertion.path]: seedValue },
      requestByPath: {},
    },
  };
  exactRuntime.evaluateEventRuntimeRequestAssertions([input.assertion], context);
  return { baseline, context, baselineOwner, freshOwner };
}

const requestReplayPass = new Set();
const requestReplayFailures = [];
for (const [caseId, input] of actualOperatorInputs) {
  try {
    const replay = replayRequestSemanticOperator(input);
    if (caseId === "EVT-048") {
      expectReject(() => exactRuntime.evaluateEventRuntimeRequestAssertions([input.assertion], {
        ...replay.context,
        body: responseOwnerFor(input, Object.freeze({
          schema: "media-server.v390-ui-recorded-operator-seed.v1",
          fixtureId: input.fixtureSeed.fixtureId,
          assertionPath: input.assertion.path,
        }), "fresh").body,
        eventRuntimeContext: {
          ...replay.context.eventRuntimeContext,
          requestRowLocalBaselines: [{
            ...replay.baseline,
            expectedComparisonProjection: {
              ...replay.baseline.expectedComparisonProjection,
              reason: "wrong-authoritative-reason",
            },
          }],
        },
      }), "contains-fixture-source sourceHealth");
      const duplicate = structuredClone(replay.context.body);
      duplicate.sourceHealth.push(structuredClone(duplicate.sourceHealth[0]));
      expectReject(() => exactRuntime.evaluateEventRuntimeRequestAssertions([input.assertion], {
        ...replay.context,
        body: duplicate,
      }), "fixture cardinality mismatch");
    }
    if (caseId === "EVT-070") {
      const requestAssertion = eventExactOracleFor(caseId).requests[0].assertions[0];
      const filters = typedActiveResolutionFiltersFromUrl(input.requestObservation.urlPath);
      const filterContext = {
        ...replay.context,
        body: {
          unifiedResolutionWorkspace: {
            resolutionSearchMetricsSummary: { activeResolutionFilters: filters },
          },
        },
        eventRuntimeContext: {
          requestByPath: { [requestAssertion.path]: filters },
          requestRowLocalBaselines: [],
        },
      };
      exactRuntime.evaluateEventRuntimeRequestAssertions([requestAssertion], filterContext);
      for (const drift of [
        { ...filters, incidentStatus: "wrong-status" },
        Object.fromEntries(Object.entries(filters).filter(([key]) => key !== "incidentStatus")),
      ]) {
        expectReject(() => exactRuntime.evaluateEventRuntimeRequestAssertions([requestAssertion], {
          ...filterContext,
          body: {
            unifiedResolutionWorkspace: {
              resolutionSearchMetricsSummary: { activeResolutionFilters: drift },
            },
          },
        }), "equals-request");
      }
    }
    requestReplayPass.add(caseId);
  } catch (error) {
    requestReplayFailures.push(`${caseId}: ${String(error?.message || error)}`);
  }
}

let memoryReplayPass = false;
try {
  const fixture = "evt-041-review4-fixture";
  const source = "stream-review4-fixture";
  const exactHit = {
    documentId: `event-record:${fixture}`,
    sourceKind: "event-record",
    incidentId: `incident:${fixture}`,
    sourceId: source,
    title: fixture,
    summary: "fixture incident memory summary",
    score: 1,
    matchedTerms: ["evt", "041", "review4", "fixture"],
    highlightFragments: ["evt 041 review4 fixture"],
  };
  const legitimateSibling = {
    documentId: `review-note:${fixture}`,
    sourceKind: "review-note",
    incidentId: `incident:${fixture}`,
    sourceId: null,
  };
  const response = {
    memorySearch: {
      schema: "media-server.ops.incident-memory-search-view.v1",
      query: fixture,
      hits: [exactHit, legitimateSibling],
    },
  };
  const evidence = validateIncidentMemorySearchResponseProjection({
    caseId: "EVT-041",
    responseJson: response,
    fixtureId: fixture,
    query: fixture,
    sourceId: source,
  });
  assert.equal(evidence.fixtureHitCount, 1);
  expectReject(() => validateIncidentMemorySearchResponseProjection({
    caseId: "EVT-041",
    responseJson: {
      memorySearch: { ...response.memorySearch, hits: [exactHit, { ...exactHit }] },
    },
    fixtureId: fixture,
    query: fixture,
    sourceId: source,
  }), "duplicate");
  for (const wrongSource of [41, "wrong-source"]) {
    expectReject(() => validateIncidentMemorySearchResponseProjection({
      caseId: "EVT-041",
      responseJson: {
        memorySearch: {
          ...response.memorySearch,
          hits: [{ ...exactHit, sourceId: wrongSource }, legitimateSibling],
        },
      },
      fixtureId: fixture,
      query: fixture,
      sourceId: source,
    }), ".sourceId");
  }
  memoryReplayPass = true;
} catch (error) {
  requestReplayFailures.push(`EVT-041: ${String(error?.message || error)}`);
}

const priorPassIds = [...priorStatus.entries()]
  .filter(([, status]) => status === "PASS")
  .map(([caseId]) => caseId)
  .sort();
assert.equal(priorPassIds.length, 120);
const priorPassReplay = new Set();
for (const caseId of priorPassIds) {
  if (regressedIds.includes(caseId)) {
    if (requestReplayPass.has(caseId)) priorPassReplay.add(caseId);
    continue;
  }
  assert.equal(regressionStatus.get(caseId), "PASS");
  assert.deepEqual(
    regressionRun.summary.cases.find(item => item.caseId === caseId)?.requested,
    priorRun.summary.cases.find(item => item.caseId === caseId)?.requested,
    `${caseId} unchanged PASS canonical request drift`,
  );
  priorPassReplay.add(caseId);
}

const currentFailureReplay = new Set(requestReplayPass);
if (memoryReplayPass) currentFailureReplay.add("EVT-041");
const recordedReplay = new Set(priorPassReplay);
for (const caseId of newPassIds) {
  if (closed.has(caseId)) recordedReplay.add(caseId);
}
for (const caseId of continuingFailureIds) {
  if (currentFailureReplay.has(caseId)) recordedReplay.add(caseId);
}

let negativeReplayPass = 0;
const negativeBase = actualOperatorInputs.get("EVT-023");
assert.throws(() => validateActualFailureOperatorInput((({ actualDigest, ...rest }) => ({
  ...negativeBase,
  responseCandidates: rest,
}))(negativeBase.responseCandidates)), /response digest missing|input digest mismatch/);
negativeReplayPass += 1;
assert.throws(() => validateActualFailureOperatorInput({
  ...negativeBase,
  fixtureSeed: { fixtureId: `${negativeBase.fixtureSeed.fixtureId}-tampered` },
}), /input digest mismatch/);
negativeReplayPass += 1;

if (requestReplayFailures.length > 0 ||
    priorPassReplay.size !== 120 ||
    !newPassIds.every(caseId => closed.has(caseId)) ||
    currentFailureReplay.size !== 18 ||
    recordedReplay.size !== 125 ||
    negativeReplayPass !== 2) {
  requestReplayFailures.forEach(failure => console.error(`RED ${failure}`));
  console.error(
    "v390 UI request semantic isolation actual replay: FAIL " +
    `prior=${priorPassReplay.size}/120 new=${newPassIds.filter(caseId => closed.has(caseId)).length}/2 ` +
    `failures=${currentFailureReplay.size}/18 recorded=${recordedReplay.size}/125 ` +
    `negative=${negativeReplayPass}/2`,
  );
  process.exit(1);
}

if (failures.length > 0 || closed.size !== 5) {
  failures.forEach(failure => console.error(`RED ${failure}`));
  console.error(`v390 UI native diagnostic final five trace replay: FAIL ${closed.size}/5`);
  process.exit(1);
}
console.log(`v390 UI native diagnostic final five trace replay: PASS ${closed.size}/5`);
console.log(
  "v390 UI request semantic isolation actual replay: PASS " +
  "differential=125/125 prior=120/120 new=2/2 failures=18/18 " +
  "recorded=125/125 negative=2/2",
);
