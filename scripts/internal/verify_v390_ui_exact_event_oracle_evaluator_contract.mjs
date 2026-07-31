#!/usr/bin/env node
// 파일 용도: exact EVT runtime evaluator가 response/DOM/network/state assertion을 실제 평가하고 미지원 의미를 fail-closed 처리하는지 검증한다.

import {
  assertEventExactRuntimeBindings,
  createEventExactOracleEvaluationPlan,
  evaluateEventExactDomAssertion,
  evaluateEventExactForbiddenNetwork,
  evaluateEventExactOracle,
  evaluateEventExactRequests,
  evaluateEventExactResponseAssertion,
  evaluateEventExactStateAndCleanup,
  evaluateEventExactVisibleControl,
  eventExactOracleEvaluatorCapabilities,
  eventExactSemanticEvidenceKey,
  eventExactValuesAtPath,
  materializeEventExactTemplate,
} from "./v390_ui_exact_event_oracle_evaluator.mjs";
import {
  eventExactOracleCaseIds,
  eventExactOracleFor,
} from "./v390_ui_exact_event_oracles.mjs";

const checks = [];
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function check(name, callback) {
  try {
    callback();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", detail: String(error?.message || error) });
  }
}

check("path resolver expands array projections without inventing missing values", () => {
  const value = { records: [{ eventId: "a" }, { eventId: "b" }] };
  assert(JSON.stringify(eventExactValuesAtPath(value, "records[].eventId")) === JSON.stringify(["a", "b"]), "array path projection mismatch");
  assert(eventExactValuesAtPath(value, "records[].missing").length === 0, "missing path was invented");
});

check("template materialization requires every dynamic value and URL-encodes it", () => {
  assert(materializeEventExactTemplate("/reviews/{fixtureId}", { fixtureId: "fixture a" }) === "/reviews/fixture%20a", "template encoding mismatch");
  let message = "";
  try { materializeEventExactTemplate("/reviews/{fixtureId}", {}); } catch (error) { message = String(error?.message || error); }
  assert(message.includes("missing exact oracle template value"), "missing template value did not fail closed");
});

check("response evaluator executes equals, number-gte, and forbidden path checks", () => {
  const base = { caseId: "EVT-001", responseJson: { ok: true, sessionManager: { activeSessions: 2 } }, context: { fixtureId: "fixture" } };
  assert(evaluateEventExactResponseAssertion({ ...base, assertion: { path: "ok", operator: "equals", expected: true } }).pass, "equals did not execute");
  assert(evaluateEventExactResponseAssertion({ ...base, assertion: { path: "sessionManager.activeSessions", operator: "number-gte", expected: 1 } }).pass, "number-gte did not execute");
  assert(!evaluateEventExactResponseAssertion({ ...base, assertion: { path: "sessionManager.activeSessions", operator: "number-gte", expected: 3 } }).pass, "number-gte false result passed");
  assert(!evaluateEventExactResponseAssertion({ ...base, assertion: { path: "sessionManager.missing", operator: "number", expected: true } }).pass, "missing response path passed");
});

check("request evaluator requires the correlated runtime exchange", () => {
  const spec = {
    caseId: "EVT-TEST",
    requests: [{
      method: "GET",
      path: "/fixture/{fixtureId}",
      allowedStatuses: [200],
      correlationRequired: true,
      forbiddenJsonKeys: ["password"],
      assertions: [{ path: "ok", operator: "equals", expected: true }],
    }],
  };
  const base = { spec, context: { fixtureId: "fixture", templateValues: { fixtureId: "fixture" } } };
  const missing = evaluateEventExactRequests({ ...base, exchanges: [{ method: "GET", path: "/fixture/fixture", status: 200, json: { ok: true } }] });
  assert(missing.some(item => item.kind === "request-correlation" && !item.pass), "missing correlation passed");
  const present = evaluateEventExactRequests({ ...base, exchanges: [{ method: "GET", path: "/fixture/fixture", status: 200, correlationId: "cid-1", json: { ok: true } }] });
  assert(present.every(item => item.pass), "valid correlated exchange failed");
  const forbidden = evaluateEventExactRequests({ ...base, exchanges: [{ method: "GET", path: "/fixture/fixture", status: 200, correlationId: "cid-1", json: { ok: true, password: "secret" } }] });
  assert(forbidden.some(item => item.kind === "forbidden-json-key" && !item.pass), "forbidden JSON key passed");
});

check("seed/request/readback equality operators require real expected values", () => {
  const assertion = { path: "review", operator: "equals-requested-fields", expected: true };
  const missing = evaluateEventExactResponseAssertion({ caseId: "EVT-021", assertion, responseJson: { review: { status: "confirmed" } }, context: { fixtureId: "fixture" } });
  assert(!missing.pass && missing.reason.includes("expected value missing"), "missing request evidence passed");
  const present = evaluateEventExactResponseAssertion({ caseId: "EVT-021", assertion, responseJson: { review: { status: "confirmed" } }, context: { fixtureId: "fixture", requestByPath: { review: { status: "confirmed" } } } });
  assert(present.pass, "request equality evidence did not pass");
});

check("domain-specific response operators require keyed semantic evidence and verify actual binding", () => {
  const assertion = { path: "records", operator: "contains-matching-and-missing", expected: true };
  const responseJson = { records: [{ eventId: "fixture" }] };
  const missing = evaluateEventExactResponseAssertion({ caseId: "EVT-030", assertion, responseJson, context: { fixtureId: "fixture" } });
  assert(!missing.pass && missing.reason.includes("semantic evidence missing"), "uninterpreted semantic operator passed");
  const key = "response:EVT-030:contains-matching-and-missing:records";
  const pass = evaluateEventExactResponseAssertion({ caseId: "EVT-030", assertion, responseJson, context: { fixtureId: "fixture", semanticEvidence: { [key]: { pass: true, actual: responseJson.records } } } });
  assert(pass.pass, "keyed response semantic evidence did not execute");
  const mismatch = evaluateEventExactResponseAssertion({ caseId: "EVT-030", assertion, responseJson, context: { fixtureId: "fixture", semanticEvidence: { [key]: { pass: true, actual: [] } } } });
  assert(!mismatch.pass, "semantic evidence detached from actual response passed");
});

check("DOM evaluator executes number-equals-response and fails without response evidence", () => {
  const assertion = { operator: "number-equals-response", target: "sessionManager.activeSessions", expected: true };
  const observation = { selector: "#dashActiveSessions", exists: true, visible: true, text: "2", number: 2 };
  assert(evaluateEventExactDomAssertion({ caseId: "EVT-001", assertion, observation, context: { fixtureId: "fixture", responseValues: { "sessionManager.activeSessions": 2 } } }).pass, "DOM number/response comparison failed");
  assert(!evaluateEventExactDomAssertion({ caseId: "EVT-001", assertion, observation, context: { fixtureId: "fixture", responseValues: {} } }).pass, "DOM number comparison passed without response evidence");
  assert(!evaluateEventExactDomAssertion({ caseId: "EVT-001", assertion, observation, context: { fixtureId: "fixture", responseValues: { "sessionManager.activeSessions": 3 } } }).pass, "wrong DOM number passed");
});

check("domain-specific DOM operators require keyed semantic evidence", () => {
  const assertion = { operator: "fields-equal-response", target: "event/review", expected: true };
  const observation = { selector: "[data-event-review-row]", exists: true, visible: true, text: "fixture" };
  const missing = evaluateEventExactDomAssertion({ caseId: "EVT-019", assertion, observation, context: { fixtureId: "fixture" } });
  assert(!missing.pass && missing.reason.includes("semantic evidence missing"), "uninterpreted DOM operator passed");
  const key = "dom:EVT-019:fields-equal-response:event/review";
  assert(evaluateEventExactDomAssertion({ caseId: "EVT-019", assertion, observation, context: { fixtureId: "fixture", semanticEvidence: { [key]: { pass: true, actual: observation } } } }).pass, "DOM semantic evidence did not execute");
});

check("visible control evaluator binds both selector presence and semantic action", () => {
  const spec = eventExactOracleFor("EVT-021");
  const selector = "[data-event-review-row][data-event-id=fixture] [data-event-review-save]";
  const pass = evaluateEventExactVisibleControl({ spec, observations: [{ selector, exists: true, visible: true, action: "persisted-mutation" }], context: { fixtureId: "fixture", templateValues: { fixtureId: "fixture" } } });
  assert(pass.every(item => item.pass), "valid visible control/action failed");
  const wrong = evaluateEventExactVisibleControl({ spec, observations: [{ selector, exists: true, visible: true, action: "read-only-state" }], context: { fixtureId: "fixture", templateValues: { fixtureId: "fixture" } } });
  assert(wrong.some(item => item.kind === "visible-control-action" && !item.pass), "wrong visible control action passed");
});

check("forbidden network evaluator rejects matching mutations", () => {
  const spec = eventExactOracleFor("EVT-021");
  assert(evaluateEventExactForbiddenNetwork({ spec, network: [] }).every(item => item.pass), "empty network was rejected");
  const results = evaluateEventExactForbiddenNetwork({ spec, network: [{ method: "POST", path: "/client/api/views" }] });
  assert(results.some(item => !item.pass && item.actual?.path === "/client/api/views"), "forbidden client mutation passed");
});

check("state and cleanup evaluator requires byte hashes and named cleanup evidence", () => {
  const spec = {
    stateSnapshots: [{ scope: "ops-review", policy: "restore", before: true, after: true }],
    cleanup: { assertions: ["review-jsonl-restored"] },
  };
  const pass = evaluateEventExactStateAndCleanup({ spec, snapshots: { "ops-review": { beforeHash: "a", afterHash: "b", restoredHash: "a" } }, cleanupEvidence: { "review-jsonl-restored": true } });
  assert(pass.every(item => item.pass), "valid restore evidence failed");
  const fail = evaluateEventExactStateAndCleanup({ spec, snapshots: { "ops-review": { beforeHash: "a", restoredHash: "b" } }, cleanupEvidence: {} });
  assert(fail.filter(item => !item.pass).length === 2, "missing restore/cleanup evidence passed");
});

check("all 49 plans account for every declared response and DOM assertion", () => {
  for (const id of eventExactOracleCaseIds()) {
    const spec = eventExactOracleFor(id);
    const plan = createEventExactOracleEvaluationPlan(id);
    assert(plan.responseAssertionCount === spec.requests.flatMap(item => item.assertions).length, `${id} response assertion omitted from plan`);
    assert(plan.domAssertionCount === spec.dom.flatMap(item => item.assertions).length, `${id} DOM assertion omitted from plan`);
    assert(plan.requestCount === spec.requests.length && plan.domTargetCount === spec.dom.length, `${id} target count drift`);
    assert(new Set(plan.semanticEvidenceKeys).size === plan.semanticEvidenceKeys.length, `${id} duplicate semantic evidence key`);
  }
});

check("semantic evidence keys are deterministic and reject incomplete identities", () => {
  assert(eventExactSemanticEvidenceKey({ scope: "response", caseId: "EVT-030", operator: "contains-matching-and-missing", subject: "records" }) ===
    "response:EVT-030:contains-matching-and-missing:records", "semantic key mismatch");
  let message = "";
  try { eventExactSemanticEvidenceKey({ scope: "runtime", caseId: "EVT-030", operator: "x", subject: "y" }); } catch (error) { message = String(error?.message || error); }
  assert(message.includes("unsupported semantic evidence scope"), "invalid semantic key scope passed");
});

check("runtime binding contract accepts a complete representative EVT context", () => {
  const caseId = "EVT-019";
  const semanticEvidence = Object.fromEntries(
    createEventExactOracleEvaluationPlan(caseId).semanticEvidenceKeys.map(key =>
      [key, { pass: true, actual: key.startsWith("response:") ? [] : {
        selector: "[data-event-review-row]",
        exists: true,
        visible: true,
        text: "fixture",
      } }]),
  );
  const requirements = assertEventExactRuntimeBindings(caseId, {
    seedByPath: {
      "records[].review.reviewStatus": "reviewing",
      "records[].review.classification": "needs-review",
    },
    requestByPath: {},
    semanticEvidence,
  });
  assert(requirements.seedPaths.includes("records[].review.reviewStatus") &&
    requirements.seedPaths.includes("records[].review.classification") &&
    requirements.semanticEvidenceKeys.length === 1,
  "representative EVT runtime binding requirements drifted");
});

check("runtime binding contract rejects missing seed, request, semantic, and canary evidence", () => {
  for (const [caseId, expected] of [
    ["EVT-019", "seedByPath:records[].review.reviewStatus"],
    ["EVT-070", "requestByPath:unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters"],
    ["EVT-030", "semanticEvidence:response:EVT-030:contains-matching-and-missing:records"],
    ["EVT-031", "sensitiveCanaries"],
  ]) {
    let message = "";
    try {
      assertEventExactRuntimeBindings(caseId, {}, { requireSemanticEvidence: true });
    } catch (error) {
      message = String(error?.message || error);
    }
    assert(message.includes(expected), `${caseId} missing binding did not fail closed: ${expected}`);
  }
});

check("full evaluator fails closed when runtime evidence is incomplete", () => {
  const report = evaluateEventExactOracle({
    caseId: "EVT-001",
    actualRoute: "/ops/dashboard",
    actualRole: "operator",
    exchanges: [],
    domObservations: [],
    network: [],
    snapshots: {},
    cleanupEvidence: {},
    context: { fixtureId: "fixture" },
  });
  assert(!report.pass && report.failureCount > 0, "empty runtime evidence produced PASS");
  let message = "";
  try {
    evaluateEventExactOracle({ caseId: "EVT-001", actualRoute: "/ops/dashboard", actualRole: "operator", context: { fixtureId: "fixture" }, throwOnFailure: true });
  } catch (error) { message = String(error?.message || error); }
  assert(message.includes("exact event oracle failed"), "throwOnFailure did not fail closed");
});

check("capabilities advertise direct evaluation and keyed semantic fail-closed fallback", () => {
  const capabilities = eventExactOracleEvaluatorCapabilities();
  assert(capabilities.directResponseOperators.includes("equals") && capabilities.directResponseOperators.includes("number-gte"), "response capability missing");
  assert(capabilities.directDomOperators.includes("number-equals-response"), "DOM capability missing");
  assert(capabilities.semanticFallback === "required-keyed-evidence-fail-closed", "semantic fallback is not fail-closed");
});

const failures = checks.filter(item => item.status === "FAIL");
for (const item of checks) console.log(`[${item.status.toLowerCase()}] ${item.name}${item.detail ? `: ${item.detail}` : ""}`);
if (failures.length) {
  console.error(`\nV390 exact event oracle evaluator contract FAIL: ${failures.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nV390 exact event oracle evaluator contract PASS: ${checks.length}/${checks.length}`);
