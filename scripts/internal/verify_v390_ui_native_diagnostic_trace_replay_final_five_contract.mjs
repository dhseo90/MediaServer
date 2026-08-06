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
  validateIncidentMemorySearchResponseProjection,
} from "./v390_ui_exact_event_oracle_evaluator.mjs";
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
    responseJson: memoryResponse([fixtureHit, { ...fixtureHit, documentId: "event-record:duplicate" }]),
    fixtureId,
    query: fixtureId,
    sourceId: fixtureSourceId,
  }), "fixture-cardinality");
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

if (failures.length > 0 || closed.size !== 5) {
  failures.forEach(failure => console.error(`RED ${failure}`));
  console.error(`v390 UI native diagnostic final five trace replay: FAIL ${closed.size}/5`);
  process.exit(1);
}
console.log(`v390 UI native diagnostic final five trace replay: PASS ${closed.size}/5`);
