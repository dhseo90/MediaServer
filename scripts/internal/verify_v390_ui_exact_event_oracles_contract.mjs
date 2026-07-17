#!/usr/bin/env node
// 파일 용도: v3.9.0 exact EVT runtime oracle catalog의 완전성, 의미 결속, 약한 oracle 거부를 독립 검증한다.

import {
  eventExactOracleCaseIds,
  eventExactOracleFor,
  validateEventExactOracleCatalog,
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
function cloneCatalog() {
  return Object.fromEntries(eventExactOracleCaseIds().map(id => [id, structuredClone(eventExactOracleFor(id))]));
}
function expectReject(label, mutate, expectedText) {
  const catalog = cloneCatalog();
  mutate(catalog);
  let message = "";
  try {
    validateEventExactOracleCatalog(catalog);
  } catch (error) {
    message = String(error?.message || error);
  }
  assert(message.includes(expectedText), `${label} was accepted or returned the wrong error: ${message}`);
}

check("catalog contains the exact canonical 49 EVT case ids", () => {
  const ids = eventExactOracleCaseIds();
  assert(ids.length === 49, `case count mismatch: ${ids.length}`);
  assert(new Set(ids).size === 49, "case ids are not unique");
  assert(ids[0] === "EVT-001" && ids.at(-1) === "EVT-075", "case order drift");
  const result = validateEventExactOracleCatalog();
  assert(result.valid === true && result.caseCount === 49 && result.mutationCaseCount === 5, "validation summary mismatch");
});

check("catalog and returned specs are recursively immutable", () => {
  assert(Object.isFrozen(eventExactOracleCaseIds()), "case id list is mutable");
  for (const id of eventExactOracleCaseIds()) {
    const spec = eventExactOracleFor(id);
    assert(Object.isFrozen(spec), `${id} spec is mutable`);
    assert(Object.isFrozen(spec.apiAssertions), `${id} API assertions are mutable`);
    assert(Object.isFrozen(spec.domAssertions), `${id} DOM assertions are mutable`);
    assert(Object.isFrozen(spec.cleanup), `${id} cleanup is mutable`);
  }
});

check("audited route and selector corrections stay feature-specific", () => {
  const expected = {
    "EVT-004": ["/ops/dashboard", "#dashIncidentTimelineSource"],
    "EVT-016": ["/ops/events", "#eventStorageBadges"],
    "EVT-018": ["/ops/events", "#alertDeliveryTest"],
    "EVT-022": ["/ops/events", "#event-review-audit-list"],
    "EVT-023": ["/ops/dashboard", "#dashIncidentTimeline"],
    "EVT-049": ["/ops/events", "#eventRecordRows"],
    "EVT-058": ["/ops/events", "#opsRuntimeEvidenceWindowRows"],
  };
  for (const [id, [route, selector]] of Object.entries(expected)) {
    const spec = eventExactOracleFor(id);
    assert(spec.route === route, `${id} screen route mismatch`);
    assert(spec.visibleControl.selector.startsWith(selector), `${id} selector mismatch`);
  }
  assert(eventExactOracleFor("EVT-023").additionalRoles.includes("viewer"), "EVT-023 viewer readback role missing");
  assert(eventExactOracleFor("EVT-049").action.kind === "runtime-replay", "EVT-049 is not an actual replay");
});

check("mutation cases bind request, independent readback, audit, before/after, and byte-exact restore", () => {
  for (const id of ["EVT-021", "EVT-037", "EVT-038", "EVT-061", "EVT-068"]) {
    const spec = eventExactOracleFor(id);
    assert(spec.action.kind === "persisted-mutation", `${id} mutation action missing`);
    assert(spec.apiAssertions.some(item => ["POST", "PUT", "PATCH", "DELETE"].includes(item.method)), `${id} mutation request missing`);
    assert(spec.apiAssertions.some(item => item.method === "GET"), `${id} independent GET missing`);
    assert(spec.apiAssertions.some(item => item.path.startsWith("/ops/api/audit")), `${id} audit readback missing`);
    assert(spec.stateSnapshots.some(item => item.before && item.after && item.policy === "restore"), `${id} restore snapshot missing`);
    assert(spec.cleanup.strategy === "restore-byte-exact-snapshots", `${id} byte-exact cleanup missing`);
    for (const token of ["before", "after", "audit", "restore"]) {
      assert(spec.action.steps.some(step => step.includes(token)), `${id} ${token} action step missing`);
    }
  }
});

check("all specs assert body semantics, DOM semantics, forbidden boundaries, snapshots, and cleanup", () => {
  for (const id of eventExactOracleCaseIds()) {
    const spec = eventExactOracleFor(id);
    assert(spec.apiAssertions.every(item => item.bodyAssertions.length >= 2), `${id} weak API assertion`);
    assert(spec.domAssertions.some(item => item.assertions.some(value => !["exists", "visible"].includes(value.operator))), `${id} weak DOM assertion`);
    assert(spec.forbidden.responseFields.length > 0 && spec.forbidden.networkMutations.length > 0 && spec.forbidden.stateChanges.length > 0, `${id} forbidden boundary missing`);
    assert(spec.stateSnapshots.every(item => item.before && item.after), `${id} before/after snapshot missing`);
    assert(spec.cleanup.required && spec.cleanup.assertions.length > 0, `${id} cleanup missing`);
    assert(spec.expectedBehavior === spec.featureMeaning, `${id} expectedBehavior drift`);
    assert(spec.seed.fixtureId === "{fixtureId}", `${id} fixed fixture id leaked`);
    assert(spec.requests.length === spec.apiAssertions.length && spec.requests.every(item => item.requiredJsonPaths.length >= 2 && item.forbiddenJsonKeys.length > 0), `${id} runner request contract missing`);
    assert(spec.dom.length === spec.domAssertions.length && spec.dom.every(item => Array.isArray(item.requiredTextTokens) && Array.isArray(item.forbiddenTextTokens) && Array.isArray(item.requiredAttributes)), `${id} runner DOM contract missing`);
    assert(spec.forbiddenNetwork.length > 0, `${id} runner forbidden network contract missing`);
    assert(spec.cleanup.targets.length > 0, `${id} cleanup targets missing`);
  }
});

check("validator rejects GET 200 without feature-specific response assertions", () => {
  expectReject("GET 200 only", catalog => {
    catalog["EVT-041"].apiAssertions[0].bodyAssertions = [{ path: "status", operator: "equals", expected: "ok" }];
  }, "GET/status-only oracle is forbidden");
});

check("validator rejects exists/visible-only DOM assertions", () => {
  expectReject("visible only", catalog => {
    catalog["EVT-041"].domAssertions = [{ selector: "#opsIncidentSearchRows", assertions: [{ operator: "visible", target: true, expected: true }] }];
  }, "exists/visible-only DOM oracle is forbidden");
});

check("validator rejects a generic product page GET as feature readback", () => {
  expectReject("generic page GET", catalog => {
    catalog["EVT-041"].apiAssertions[0].path = "/ops/events";
  }, "generic product page GET cannot be used as feature readback");
});

check("validator rejects missing mutation audit and restore contracts", () => {
  expectReject("mutation audit", catalog => {
    catalog["EVT-021"].apiAssertions = catalog["EVT-021"].apiAssertions.filter(item => !item.path.startsWith("/ops/api/audit"));
  }, "audit readback is missing");
  expectReject("mutation restore", catalog => {
    catalog["EVT-068"].stateSnapshots = catalog["EVT-068"].stateSnapshots.map(item => ({ ...item, policy: "equal" }));
  }, "before/after restore snapshot is missing");
});

check("unknown case ids fail closed", () => {
  let message = "";
  try {
    eventExactOracleFor("EVT-999");
  } catch (error) {
    message = String(error?.message || error);
  }
  assert(message.includes("unknown exact event oracle caseId"), `unknown id did not fail closed: ${message}`);
});

const failures = checks.filter(item => item.status === "FAIL");
for (const item of checks) {
  console.log(`[${item.status.toLowerCase()}] ${item.name}${item.detail ? `: ${item.detail}` : ""}`);
}
if (failures.length) {
  console.error(`\nV390 exact event oracle contract FAIL: ${failures.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nV390 exact event oracle contract PASS: ${checks.length}/${checks.length}`);
