#!/usr/bin/env node
// 파일 용도: v3.9.0 exact EVT runtime oracle catalog의 완전성, 의미 결속, 약한 oracle 거부를 독립 검증한다.

import fs from "node:fs";

import {
  eventExactOracleCaseIds,
  eventExactOracleFor,
  validateEventExactOracleCatalog,
} from "./v390_ui_exact_event_oracles.mjs";
import {
  evaluateEventExactResponseAssertion,
} from "./v390_ui_exact_event_oracle_evaluator.mjs";
import {
  eventExactSeedMaterializerRegistry,
  eventExactUsesFixtureIdentityBaseline,
} from "./v390_ui_case_runtime.mjs";

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
function responsePaths(spec) {
  return spec.apiAssertions.flatMap(item => item.bodyAssertions.map(assertion => assertion.path));
}
function replaceResponsePath(catalog, caseId, currentPath, replacementPath) {
  const spec = catalog[caseId];
  for (let index = 0; index < spec.apiAssertions.length; index += 1) {
    const assertion = spec.apiAssertions[index].bodyAssertions.find(item => item.path === currentPath);
    if (!assertion) continue;
    assertion.path = replacementPath;
    const requestIndex = spec.requests[index].requiredJsonPaths.indexOf(currentPath);
    if (requestIndex >= 0) spec.requests[index].requiredJsonPaths[requestIndex] = replacementPath;
    return;
  }
  throw new Error(`${caseId} response path not found in negative fixture: ${currentPath}`);
}
function boundedFunctionSource(source, signature, nextSignature) {
  const start = source.indexOf(signature);
  const end = source.indexOf(nextSignature, start + signature.length);
  assert(start >= 0 && end > start, `runtime function boundary missing: ${signature}`);
  return source.slice(start, end);
}
function assertOrdered(source, markers, message) {
  let previous = -1;
  for (const marker of markers) {
    const current = source.indexOf(marker, previous + 1);
    assert(current > previous, `${message}: ${marker}`);
    previous = current;
  }
}
function assertRuntimeResponseProjectionContract(captureBody) {
  const assertionLoopStart = captureBody.indexOf("for (const assertion of request.assertions)");
  const assertionLoopEnd = captureBody.indexOf(
    "if (requirements.requestPaths.includes(assertion.path))",
    assertionLoopStart,
  );
  assert(assertionLoopStart >= 0 && assertionLoopEnd > assertionLoopStart,
    "event assertion projection loop boundary is missing");
  const assertionLoopBody = captureBody.slice(assertionLoopStart, assertionLoopEnd);
  const fixtureDeclaration = assertionLoopBody.indexOf(
    "const fixtureIdentityAssertion = eventExactUsesFixtureIdentityBaseline(assertion.operator)",
  );
  const responseAssignment = assertionLoopBody.indexOf(
    "responseByPath[assertion.path] = actual",
  );
  const fixtureBranch = assertionLoopBody.indexOf("if (fixtureIdentityAssertion)");
  assert(fixtureDeclaration >= 0 && responseAssignment > fixtureDeclaration &&
    fixtureBranch > responseAssignment,
  "actual response projection must precede the fixture identity seed branch");
  assert(!assertionLoopBody.slice(fixtureDeclaration, responseAssignment)
    .includes("!fixtureIdentityAssertion"),
  "actual response projection is incorrectly guarded by fixture identity");
  assert(/if \(values\.length > 0 \|\|\s*\["\$text", "\$contentType", "\$body"\]\.includes\(assertion\.path\)\) \{\s*responseByPath\[assertion\.path\] = actual;\s*\}/s
    .test(assertionLoopBody),
  "actual response projection is not bound to values or response pseudo-fields");
  assert(/if \(fixtureIdentityAssertion\) \{\s*seedByPath\[assertion\.path\] = context\.fixtureId;\s*\}/s
    .test(assertionLoopBody),
  "fixture identity branch must set only the fixture seed channel");

  const evt003Start = captureBody.indexOf(
    'if (item.caseId === "EVT-003" || item.caseId === "EVT-025")',
  );
  const evt003End = captureBody.indexOf("const canaries = [", evt003Start);
  assert(evt003Start >= 0 && evt003End > evt003Start,
    "EVT-003 source-health runtime binding boundary is missing");
  const evt003Body = captureBody.slice(evt003Start, evt003End);
  assertOrdered(evt003Body, [
    "const sourceHealth = responseByPath.sourceHealth",
    "Array.isArray(sourceHealth)",
    "sourceHealth.some",
    "const healthItem = sourceHealth.find",
    "const status = String(healthItem?.status",
    "const reason = String(healthItem?.reason",
    'if (item.caseId === "EVT-003")',
    "context.catalogBindings.sourceId === sourceId",
    "context.catalogBindings.status === status",
    "context.catalogBindings.reason === reason",
  ], "EVT-003 must consume and validate actual sourceHealth response projection");
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

check("review PUT responses and independent audit readbacks keep distinct action contracts", () => {
  const expectedAuditActions = {
    "EVT-037": "incident-action-update",
    "EVT-061": "operator-feature-correction-update",
    "EVT-068": "operator-resolution-flow-update",
  };
  for (const [id, caseAction] of Object.entries(expectedAuditActions)) {
    const spec = eventExactOracleFor(id);
    const put = spec.apiAssertions.find(item => item.method === "PUT");
    const audit = spec.apiAssertions.find(item => item.method === "GET" && item.path.startsWith("/ops/api/audit"));
    const putAction = put?.bodyAssertions.find(item => item.path === "audit.action");
    const auditAction = audit?.bodyAssertions.find(item => item.operator === "contains-action");
    assert(putAction?.operator === "equals" && putAction.expected === "event-review-update",
      `${id} PUT response must retain the generic event-review-update action`);
    assert(auditAction?.expected === caseAction,
      `${id} independent audit readback lost the case-specific action`);
    assert(putAction.expected !== auditAction.expected,
      `${id} response and audit readback actions were conflated`);
  }
});

check("EVT-018 test binds POST, refreshed attempt row, and redaction without dry-run UI", () => {
  const spec = eventExactOracleFor("EVT-018");
  assert(spec.action.steps.includes("click-test") && !spec.action.steps.includes("click-dry-run"),
    "EVT-018 action must execute Test without Dry-run");
  const testRequest = spec.apiAssertions.find(item =>
    item.method === "POST" && item.path === "/ops/api/alerts/deliveries/test");
  assert(testRequest?.bodyAssertions.some(item =>
    item.path === "status" && item.operator === "equals" && item.expected === "delivered"),
  "EVT-018 Test response status binding missing");
  assert(testRequest?.bodyAssertions.some(item =>
    item.path === "mode" && item.operator === "equals" && item.expected === "fixture"),
  "EVT-018 Test response mode binding missing");
  const refresh = spec.apiAssertions.find(item =>
    item.method === "GET" && item.path === "/ops/api/alerts/deliveries");
  assert(refresh?.bodyAssertions.some(item =>
    item.path === "attempts" && item.operator === "contains-fixture-delivery"),
  "EVT-018 refreshed attempt readback missing");
  const attemptRow = spec.domAssertions.find(item =>
    item.selector.includes("[data-alert-delivery-test={fixtureId}]"));
  assert(attemptRow?.assertions.some(item =>
    item.operator === "text-includes" && item.target === "delivered · fixture"),
  "EVT-018 latest attempt visual result missing");
  assert(attemptRow?.assertions.some(item =>
    item.operator === "not-contains-sensitive-canary" && item.target === "endpointToken"),
  "EVT-018 latest attempt redaction assertion missing");
  assert(!spec.domAssertions.some(item => item.selector === "#alertDeliveryDryRunResult"),
    "EVT-018 Test must not claim the Dry-run result DOM");
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
    assert(spec.requests.length === spec.apiAssertions.length && spec.requests.every(item =>
      item.requiredJsonPaths.length + item.requiredResponsePseudoFields.length >= 2 &&
      item.requiredJsonPaths.every(path => !["$body", "$text", "$contentType", "$status"].includes(path)) &&
      item.forbiddenJsonKeys.length > 0), `${id} runner request contract missing`);
    assert(spec.dom.length === spec.domAssertions.length && spec.dom.every(item =>
      Array.isArray(item.requiredTextTokens) &&
      Array.isArray(item.forbiddenTextTokens) &&
      Array.isArray(item.requiredAttributes) &&
      Array.isArray(item.attributeOwners)), `${id} runner DOM contract missing`);
    assert(spec.forbiddenNetwork.length > 0, `${id} runner forbidden network contract missing`);
    assert(spec.cleanup.targets.length > 0, `${id} cleanup targets missing`);
  }
});

check("18 audited stale response path families bind the actual product JSON schema", () => {
  const expected = {
    "EVT-007": ["records.matchedRecords"],
    "EVT-017": ["integrations", "integrations[].endpointMasked", "integrations[].endpointRedacted"],
    "EVT-020": ["records.records[].snapshotPath", "records.records[].clipPath"],
    "EVT-022": ["entries", "entries[].action", "entries[].after"],
    "EVT-050": ["incidentTriageBoard.cards"],
    "EVT-051": ["incidentDecisionScorecard.scorecards", "incidentDecisionScorecard.scorecards[].priorityReasonChips"],
    "EVT-052": [
      "operationalActionPack.contract.externalDeliveryPerformed",
      "operationalActionPack.contract.ruleRegistryWritePerformed",
      "operationalActionPack.contract.sourceHealthWritePerformed",
    ],
    "EVT-055": ["incidentActionReadinessQueue.readinessCounts.notRun", "incidentActionReadinessQueue.contract.autoActionWritePerformed"],
    "EVT-058": [
      "runtimeEvidenceWindow.contract.persistentArchiveCreated",
      "runtimeEvidenceWindow.contract.longrunSubstitute",
      "runtimeEvidenceWindow.contract.thirtyMinutePassClaimed",
      "runtimeEvidenceWindow.contract.oneHundredTwentyMinutePassClaimed",
    ],
    "EVT-064": ["unifiedResolutionWorkspace.selectedDetail", "unifiedResolutionWorkspace.resolutionTimeline"],
    "EVT-065": [
      "unifiedResolutionWorkspace.resolutionQueue[].evidenceQuality",
      "unifiedResolutionWorkspace.resolutionQueue[].evidenceQuality.evidenceCompleteness",
      "unifiedResolutionWorkspace.resolutionQueue[].evidenceQuality.evidenceConfidence",
    ],
    "EVT-066": [
      "unifiedResolutionWorkspace.resolutionQueue[].sourceReliability",
      "unifiedResolutionWorkspace.resolutionQueue[].sourceReliability.recentFailureContext",
    ],
    "EVT-067": [
      "unifiedResolutionWorkspace.resolutionQueue[].aiReviewQuality",
      "unifiedResolutionWorkspace.resolutionQueue[].aiReviewQuality.uncertaintyReason",
      "unifiedResolutionWorkspace.resolutionQueue[].aiReviewQuality.qualityBadge",
    ],
    "EVT-069": [
      "unifiedResolutionWorkspace.resolutionQueue[].actionReadinessChecklist",
      "unifiedResolutionWorkspace.resolutionQueue[].actionReadinessChecklist.readinessStatus",
      "unifiedResolutionWorkspace.resolutionQueue[].actionReadinessChecklist.readinessBlockers",
    ],
    "EVT-070": [
      "unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters",
      "unifiedResolutionWorkspace.resolutionQueue[].resolutionSearchMetrics.savedViewMatches",
      "unifiedResolutionWorkspace.resolutionSearchMetricsSummary.operationsMetricSummary",
    ],
    "EVT-071": [
      "unifiedResolutionWorkspace.resolutionQueue[].incidentSourceCorrelation",
      "unifiedResolutionWorkspace.resolutionQueue[].incidentSourceCorrelation.sourceCauseSummary",
      "unifiedResolutionWorkspace.resolutionQueue[].incidentSourceCorrelation.correlationSignals",
    ],
    "EVT-072": [
      "unifiedResolutionWorkspace.resolutionQueue[].operatorRecheckRecoveryQueue",
      "unifiedResolutionWorkspace.resolutionQueue[].operatorRecheckRecoveryQueue.recoveryChecklist",
    ],
    "EVT-075": [
      "unifiedResolutionWorkspace.resolutionQueue[].incidentCommandHandoff",
      "unifiedResolutionWorkspace.resolutionQueue[].incidentCommandHandoff.sourceCause",
      "unifiedResolutionWorkspace.resolutionQueue[].incidentCommandHandoff.commandPlanDraft",
    ],
  };
  assert(Object.keys(expected).length === 18, "audited stale response family count drift");
  for (const [caseId, paths] of Object.entries(expected)) {
    const actual = responsePaths(eventExactOracleFor(caseId));
    for (const path of paths) assert(actual.includes(path), `${caseId} actual product response path missing: ${path}`);
  }
  const workspaceSchema = eventExactOracleFor("EVT-064").apiAssertions[0].bodyAssertions
    .find(item => item.path === "unifiedResolutionWorkspace.schema");
  assert(workspaceSchema?.expected === "media-server.ops.v320-unified-events-workspace.v1",
    "EVT-064 unified workspace schema value drift");
});

check("validator rejects restoring any audited stale response path", () => {
  const stalePairs = {
    "EVT-007": ["records.matchedRecords", "records.total"],
    "EVT-017": ["integrations[].endpointMasked", "integrations[].endpoint"],
    "EVT-020": ["records.records[].snapshotPath", "records.records[].evidence"],
    "EVT-022": ["entries[].action", "items[].action"],
    "EVT-050": ["incidentTriageBoard.cards", "incidentTriageBoard.items"],
    "EVT-051": ["incidentDecisionScorecard.scorecards", "incidentDecisionScorecard.items"],
    "EVT-052": ["operationalActionPack.contract.externalDeliveryPerformed", "operationalActionPack.contract.autoActionPerformed"],
    "EVT-055": ["incidentActionReadinessQueue.readinessCounts.notRun", "incidentActionReadinessQueue.contract.notRunIsPass"],
    "EVT-058": ["runtimeEvidenceWindow.contract.persistentArchiveCreated", "runtimeEvidenceWindow.contract.longTermStorageAdded"],
    "EVT-064": ["unifiedResolutionWorkspace.selectedDetail", "unifiedResolutionWorkspace.resolutionDetail"],
    "EVT-065": ["unifiedResolutionWorkspace.resolutionQueue[].evidenceQuality", "unifiedResolutionWorkspace.evidenceQuality"],
    "EVT-066": ["unifiedResolutionWorkspace.resolutionQueue[].sourceReliability", "unifiedResolutionWorkspace.sourceReliability"],
    "EVT-067": ["unifiedResolutionWorkspace.resolutionQueue[].aiReviewQuality", "unifiedResolutionWorkspace.aiReviewQuality"],
    "EVT-069": ["unifiedResolutionWorkspace.resolutionQueue[].actionReadinessChecklist", "unifiedResolutionWorkspace.actionReadinessChecklist"],
    "EVT-070": ["unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters", "unifiedResolutionWorkspace.resolutionSearchMetrics.activeFilters"],
    "EVT-071": ["unifiedResolutionWorkspace.resolutionQueue[].incidentSourceCorrelation", "unifiedResolutionWorkspace.incidentSourceCorrelation"],
    "EVT-072": ["unifiedResolutionWorkspace.resolutionQueue[].operatorRecheckRecoveryQueue", "unifiedResolutionWorkspace.operatorRecheckRecoveryQueue"],
    "EVT-075": ["unifiedResolutionWorkspace.resolutionQueue[].incidentCommandHandoff", "unifiedResolutionWorkspace.incidentCommandHandoff"],
  };
  for (const [caseId, [currentPath, stalePath]] of Object.entries(stalePairs)) {
    expectReject(`${caseId} stale path`, catalog => {
      replaceResponsePath(catalog, caseId, currentPath, stalePath);
    }, `${caseId}: stale response path is forbidden: ${stalePath}`);
  }
});

check("EVT mutation baselines are seeded once before persisted readback", () => {
  for (const caseId of ["EVT-021", "EVT-037", "EVT-038", "EVT-061", "EVT-068"]) {
    const spec = eventExactOracleFor(caseId);
    const plan = eventExactSeedMaterializerRegistry[spec.seed.kind];
    assert(plan?.eventRecords >= 1, `${caseId} mutation seed lacks an EventRecord`);
    assert(plan?.review === true, `${caseId} mutation seed lacks a review join`);
  }
  const runtimeSource = fs.readFileSync(new URL("./v390_ui_case_runtime.mjs", import.meta.url), "utf8");
  const prepareStart = runtimeSource.indexOf("async function prepareCase(item)");
  const prepareEnd = runtimeSource.indexOf("async function seedRuleCatalogFixturesViaApi", prepareStart);
  const prepareBody = runtimeSource.slice(prepareStart, prepareEnd);
  const seedIndex = prepareBody.indexOf("await materializeEventExactSeed");
  const persistedIndex = prepareBody.indexOf("await preparePersistedFixture");
  assert(seedIndex >= 0 && persistedIndex > seedIndex,
    "EVT exact seed must run before the persisted mutation baseline readback");
  assert(runtimeSource.includes("exact event seed materializer ran more than once"),
    "EVT exact seed duplicate-run guard is missing");
});

check("EVT-003 requires authoritative source-health readback without metadata fixture substitution", () => {
  const spec = eventExactOracleFor("EVT-003");
  const rootCauseAssertion = spec.domAssertions.find(item =>
    item.selector === "#dashRootCauseList .root-cause-item");
  assert(rootCauseAssertion &&
    rootCauseAssertion.assertions.some(item =>
      item.operator === "contains-fixture-source" && item.target === "sourceId/status/reason"),
  "EVT-003 root-cause assertion is not bound to the current root-cause item renderer");
  assert(!spec.domAssertions.some(item =>
    item.selector === "#dashRootCauseList [data-incident-unit]"),
  "EVT-003 still expects the incident-timeline owner attribute inside the root-cause list");
  const plan = eventExactSeedMaterializerRegistry["source-health-state"];
  assert(plan?.eventRecords === 0, "EVT-003 source-health seed still creates a metadata EventRecord");
  assert(plan?.sourceHealthReadback === true, "EVT-003 authoritative source-health readback requirement is missing");
  assert(plan?.sourceHealth !== true, "EVT-003 metadata sourceHealth flag still masquerades as product state");
  const runtimeSource = fs.readFileSync(new URL("./v390_ui_case_runtime.mjs", import.meta.url), "utf8");
  const seedBody = boundedFunctionSource(
    runtimeSource,
    "async function materializeEventExactSeed(item, context, spec)",
    "async function materializeEvt003SourceHealthFixture(item, context)",
  );
  const materializerBody = boundedFunctionSource(
    runtimeSource,
    "async function materializeEvt003SourceHealthFixture(item, context)",
    "async function disableEvt003SourceHealthFixtureForTeardown(item, context)",
  );
  const cleanupBody = boundedFunctionSource(
    runtimeSource,
    "async function disableEvt003SourceHealthFixtureForTeardown(item, context)",
    "async function captureEventExactRuntimeBindings(item, context, spec)",
  );
  const captureBody = boundedFunctionSource(
    runtimeSource,
    "async function captureEventExactRuntimeBindings(item, context, spec)",
    "async function materializeExactRuntimeFixturePlan(item, context, spec, fixturePlan)",
  );
  const prepareBody = boundedFunctionSource(
    runtimeSource,
    "async function prepareCatalogRuntimeFixture(item, context)",
    "async function materializeEventExactSeed(item, context, spec)",
  );
  assertRuntimeResponseProjectionContract(captureBody);
  const restoredOldGuard = captureBody.replace(
    "if (values.length > 0 ||",
    "if (!fixtureIdentityAssertion &&\n            (values.length > 0 ||",
  ).replace(
    '["$text", "$contentType", "$body"].includes(assertion.path)) {',
    '["$text", "$contentType", "$body"].includes(assertion.path))) {',
  );
  assert(restoredOldGuard !== captureBody,
    "EVT-003 old response projection guard negative mutation was not applied");
  let oldGuardMessage = "";
  try {
    assertRuntimeResponseProjectionContract(restoredOldGuard);
  } catch (error) {
    oldGuardMessage = String(error?.message || error);
  }
  assert(oldGuardMessage.includes("incorrectly guarded by fixture identity"),
    `EVT-003 old response projection guard mutation was accepted: ${oldGuardMessage}`);

  assert(/const source = plan\.sourceHealthReadback\s*\?\s*await materializeEvt003SourceHealthFixture\(item, context\)\s*:\s*defaultPublishedSourceIdentity\(descriptor\)/s.test(seedBody),
    "EVT-003 materializer call is not conditionally bound inside materializeEventExactSeed");
  const awaitedCalls = runtimeSource.match(/await materializeEvt003SourceHealthFixture\(item, context\)/g) || [];
  assert(awaitedCalls.length === 1,
    `EVT-003 materializer must have one live awaited call and no dead legacy call: ${awaitedCalls.length}`);
  assertOrdered(seedBody, [
    "await materializeEvt003SourceHealthFixture(item, context)",
    "context.catalogBindings = {",
    "sourceId: source.sourceId",
    "viewId: source.viewId",
    "status: source.status",
    "reason: source.reason",
    "context.eventExactSeedPrepared = true",
  ], "EVT-003 conditional call/binding order drift");
  assertOrdered(prepareBody, [
    "await materializeEventExactSeed(item, context, spec)",
    "await captureEventExactRuntimeBindings(item, context, spec)",
  ], "EVT-003 seed must precede runtime binding capture");
  assert(/item\.caseId === "EVT-003" && eventCount === 0 && plan\.sourceHealth !== true/.test(seedBody),
    "EVT-003 metadata substitution does not fail closed in the seed function");

  assertOrdered(materializerBody, [
    '"GET", "/ops/api/sources"',
    '"GET", "/ops/api/views"',
    '"GET", "/ops/api/source-health"',
    ".filter(value => String(value?.status || \"\") !== \"live\")",
    ".slice(0, 3)",
    "throwaway published-seed fixture is absent from the dashboard top-three degraded rows",
    "displayIndex >= 0 && displayIndex < 3",
    "sourceMatches.length === 1 && viewMatches.length === 1",
    "const status = String(healthItem?.status",
    "const reason = String(healthItem?.reason",
    'status && status !== "live" && reason',
    "reusedPublishedSeed: true",
    "context.catalogBindings = {",
    "return { sourceId, streamId: baseline.streamId, viewId, status, reason }",
  ], "EVT-003 published-seed selection/readback/binding order drift");
  assert(!/"POST"|"PUT"|"DELETE"/.test(materializerBody),
    "EVT-003 materializer mutates the published seed or registry ordering");
  assert(!/const status = ["']/.test(materializerBody),
    "EVT-003 source-health status is hardcoded instead of captured");
  assert(/status && status !== "live" && reason/.test(materializerBody),
    "EVT-003 degraded published-seed status/reason guard is missing");

  assertOrdered(captureBody, [
    'if (item.caseId === "EVT-003")',
    "context.catalogBindings.sourceId === sourceId",
    "context.catalogBindings.viewId === templateValues.viewId",
    "context.catalogBindings.status === status",
    "context.catalogBindings.reason === reason",
    '"media-server.v390-ui-event-row-local-response-baseline.v1"',
    'identityPaths: ["sourceId", "id"]',
    'projectionPaths: ["status", "reason"]',
    "expectedProjection: { status, reason }",
    "domResponseBaselineByTarget.sourceHealth = rowLocalBaseline",
    'domResponseBaselineByTarget["sourceHealth[].status"] = rowLocalBaseline',
    'domResponseBaselineByTarget["sourceId/status/reason"] = rowLocalBaseline',
    'rowLocalResponseTargets.push("sourceId/status/reason")',
    'domFixtureIdentityByTarget["sourceId/status/reason"] = {',
    'expectedNodeTokens: [`#${sourceId}`, "오프라인", "구독 세션 없음"]',
    'seedByPath["sourceHealth[].status"] = status',
    'seedByPath["sourceHealth[].reason"] = reason',
    "templateValues.status = status",
    "templateValues.reason = reason",
    "context.catalogBindings = {",
    "...templateValues",
    "domResponseBaselineByTarget",
    "domFixtureIdentityByTarget",
    "rowLocalResponseTargets",
  ], "EVT-003 sourceId/viewId/status/reason capture propagation drift");

  assertOrdered(cleanupBody, [
    "if (fixture.reusedPublishedSeed)",
    '"GET", "/ops/api/sources"',
    '"GET", "/ops/api/views"',
    '"GET", "/ops/api/source-health"',
    "stableJson(sourceList.json?.sources || []) === stableJson(fixture.sourcesBefore)",
    "stableJson(viewList.json?.views || []) === stableJson(fixture.viewsBefore)",
    "String(healthItem.status || \"\") === String(healthBefore.status || \"\")",
    "String(healthItem.reason || \"\") === String(healthBefore.reason || \"\")",
    'status: "published-seed-baseline-unchanged"',
    "registryOrderingUnchanged: true",
    "physicalAbsenceClaimed: false",
  ], "EVT-003 published-seed invariant/readback/teardown order drift");
  assert(/self-contained-pid-port-artifact-ownership/.test(cleanupBody) &&
    /media_server_v390_ui-/.test(cleanupBody),
  "EVT-003 cleanup is not bound to isolated runtime teardown ownership");
  assert(!/fixtureMaterialRemaining:\s*false|physical(?:ly)? absent/i.test(cleanupBody),
    "EVT-003 cleanup makes a false physical-absence claim after soft-disable");
});

check("EVT-003 dashboard renderer keeps the bounded three-source identity projection", () => {
  const pageScript = fs.readFileSync("src/ingress/product_ui_page_scripts.cpp", "utf8");
  const sourceHealthStart = pageScript.indexOf(
    "const dashboardDegradedSourceIdentitySegments = degradedSources =>",
  );
  const sourceHealthEnd = pageScript.indexOf(
    "const dashboardSourceHealthIncidentId = item =>",
    sourceHealthStart,
  );
  assert(sourceHealthStart >= 0 && sourceHealthEnd > sourceHealthStart,
    "dashboard degraded source identity projection is missing");
  const sourceHealthProjection = pageScript.slice(sourceHealthStart, sourceHealthEnd);
  assert(sourceHealthProjection.includes("degradedSources.slice(0, 3).map(item =>") &&
    sourceHealthProjection.includes("String(item?.sourceId ?? '').trim()") &&
    sourceHealthProjection.includes("dashboardSourceHealthStatusLabel(item?.status)") &&
    sourceHealthProjection.includes("dashboardSourceHealthReason(item?.reason)"),
  "dashboard degraded source identity projection does not preserve sourceId/status/reason");
  assert(!sourceHealthProjection.includes("degradedSources.map(item =>"),
    "dashboard degraded source identity projection is unbounded");

  const rootCauseStart = pageScript.indexOf(
    "const dashboardRootCauseItems = (runtime, principal",
  );
  const rootCauseEnd = pageScript.indexOf(
    "const rootCauseLogFilter =",
    rootCauseStart,
  );
  assert(rootCauseStart >= 0 && rootCauseEnd > rootCauseStart,
    "dashboard root-cause item projection boundary is missing");
  const rootCauseBody = pageScript.slice(rootCauseStart, rootCauseEnd);
  assert(rootCauseBody.includes(
    "dashboardDegradedSourceIdentitySegments(degradedSources).join(' · ')",
  ), "dashboard root-cause detail is not bound to the bounded degraded source identities");
  assert(!/sourceUrl|credential|password|token/i.test(sourceHealthProjection),
    "dashboard source identity segment includes sensitive source material");
});

check("fixture contains assertions use identity baselines and diagnostic canaries stay bound", () => {
  for (const operator of [
    "contains-fixture-event",
    "contains-fixture-review",
    "contains-fixture-handoff",
    "csv-contains-fixture",
  ]) {
    assert(eventExactUsesFixtureIdentityBaseline(operator),
      `${operator} did not select the fixture identity baseline`);
  }
  assert(!eventExactUsesFixtureIdentityBaseline("equals-seed"),
    "non-fixture semantic assertions were weakened to identity matching");
  const runtimeSource = fs.readFileSync(new URL("./v390_ui_case_runtime.mjs", import.meta.url), "utf8");
  assert(runtimeSource.includes("seedByPath[assertion.path] = context.fixtureId"),
    "fixture identity baseline binding is missing");
  assert(runtimeSource.includes("bindings.redactionCanary = redactionCanary"),
    "diagnostic redaction canary is not propagated to runtime bindings");
});

check("audited EVT response paths are anchored in the product response builders", () => {
  const foundation = fs.readFileSync(
    new URL("../../src/ingress/webrtc_http_server_ops_foundation.cpp", import.meta.url),
    "utf8",
  );
  const incidents = fs.readFileSync(
    new URL("../../src/ingress/webrtc_http_server_ops_incidents.cpp", import.meta.url),
    "utf8",
  );
  const configStart = foundation.indexOf("std::string OpsAlertDeliveryConfigJson(");
  const configEnd = foundation.indexOf("// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 13957 function", configStart);
  const configBody = foundation.slice(configStart, configEnd);
  const listStart = foundation.indexOf("std::string OpsAlertDeliveryListJson(");
  const listEnd = foundation.indexOf("// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 14192 function", listStart);
  const listBody = foundation.slice(listStart, listEnd);
  const candidateStart = incidents.indexOf("std::string OpsVlmSummaryCandidateReviewJson(");
  const candidateEnd = incidents.indexOf("std::string OpsIncidentMemorySearchViewJson(", candidateStart);
  const candidateBody = incidents.slice(candidateStart, candidateEnd);
  assert(configStart >= 0 && configEnd > configStart &&
    configBody.includes("if (redact_endpoint)") &&
    configBody.includes('out << "\\"endpointMasked\\":\\""') &&
    configBody.includes('"\\"endpointRedacted\\":true,"') &&
    configBody.includes('out << "\\"endpoint\\":\\""') &&
    listStart >= 0 && listEnd > listStart &&
    listBody.includes("OpsAlertDeliveryConfigJson(items[i], true)"),
  "EVT-017 masked endpoint fields are not bound to the redacted product list builder");
  assert(incidents.includes('ParseStringField(event_json, "snapshotPath")') &&
    incidents.includes('ParseStringField(event_json, "clipPath")'),
  "EVT-020 EventRecord evidence fields are absent from the product response builder");
  assert(candidateStart >= 0 && candidateEnd > candidateStart &&
    candidateBody.includes('"\\"sourceCandidateReport\\":"') &&
    candidateBody.includes("BuildVlmSummaryCandidates(options, &candidate_report, &error_message)") &&
    incidents.includes("OpsVlmSummaryCandidateReviewJson(search_query, source_id)"),
  "EVT-046 VLM summary candidate response binding is absent from the product builder");
  const summaryCandidateRequest = eventExactOracleFor("EVT-046").requests[0].path;
  assert(summaryCandidateRequest.includes("q={q}") &&
    summaryCandidateRequest.includes("sourceId={sourceId}"),
  "EVT-046 exact request does not satisfy the product candidate-report precondition");
});

check("mutation and alert cleanup require fresh authoritative API readback after snapshot restore", () => {
  const runtimeSource = fs.readFileSync(new URL("./v390_ui_case_runtime.mjs", import.meta.url), "utf8");
  for (const token of [
    ":mutation-api-readback",
    "/ops/api/events/reviews/",
    "/ops/api/audit?eventId=",
    "mutation audit fixture remains after snapshot cleanup",
    ":alert-api-readback",
    "/ops/api/alerts/deliveries",
    "alert delivery fixture remains after snapshot cleanup",
    "alert delivery attempt remains after snapshot cleanup",
  ]) {
    assert(runtimeSource.includes(token), `cleanup API readback binding missing: ${token}`);
  }
});

check("response pseudo-fields stay semantic assertions and never become JSON preflight paths", () => {
  for (const caseId of ["EVT-031", "EVT-057"]) {
    const spec = eventExactOracleFor(caseId);
    const request = spec.requests[0];
    assert(request.requiredResponsePseudoFields.includes("$body"), `${caseId} $body pseudo-field missing`);
    assert(!request.requiredJsonPaths.includes("$body"), `${caseId} $body leaked into JSON path preflight`);
    const assertion = request.assertions.find(item => item.path === "$body");
    const canaryKey = caseId === "EVT-031" ? "rawCanary" : "credentialCanary";
    const canary = `${caseId.toLowerCase()}-forbidden-canary`;
    const context = { seed: { [canaryKey]: canary } };
    const absent = evaluateEventExactResponseAssertion({
      caseId,
      assertion,
      responseJson: { records: [] },
      context,
    });
    const present = evaluateEventExactResponseAssertion({
      caseId,
      assertion,
      responseJson: { records: [{ detail: canary }] },
      context,
    });
    assert(absent.pass, `${caseId} clean $body response failed`);
    assert(!present.pass, `${caseId} forbidden $body canary passed`);
  }
});

check("debugCounters allow finite numeric leaves and the typed reuse key only at Ops runtime", () => {
  for (const id of eventExactOracleCaseIds()) {
    for (const request of eventExactOracleFor(id).requests) {
      const runtimeStatus = request.method === "GET" && request.path === "/ops/api/runtime/status";
      if (runtimeStatus) {
        assert(!request.forbiddenJsonKeys.includes("debugCounters"), `${id} Ops numeric debugCounters remained globally forbidden`);
        assert(JSON.stringify(request.responseFieldPolicies) === JSON.stringify([{
          path: "debugCounters",
          endpoint: "/ops/api/runtime/status",
          leafType: "finite-number",
          containersAllowed: true,
          allowedStringLeaves: ["analysisTapReuseKey"],
        }]), `${id} Ops numeric debugCounters policy drift`);
      } else {
        assert(request.forbiddenJsonKeys.includes("debugCounters"), `${id} debugCounters escaped a non-runtime response`);
        assert(request.responseFieldPolicies.length === 0, `${id} debugCounters allowance escaped the runtime endpoint`);
      }
    }
  }
  expectReject("runtime debug policy widening", catalog => {
    catalog["EVT-024"].requests[0].responseFieldPolicies[0].leafType = "any";
  }, "Ops runtime debugCounters must be limited to finite numeric leaves and the typed reuse key");
  expectReject("runtime debug string leaf widening", catalog => {
    catalog["EVT-024"].requests[0].responseFieldPolicies[0].allowedStringLeaves.push("sourceUrl");
  }, "Ops runtime debugCounters must be limited to finite numeric leaves and the typed reuse key");
  expectReject("non-runtime debug allowance", catalog => {
    catalog["EVT-017"].requests[0].forbiddenJsonKeys =
      catalog["EVT-017"].requests[0].forbiddenJsonKeys.filter(key => key !== "debugCounters");
  }, "debugCounters allowance escaped the Ops runtime status boundary");
});

check("nested DOM attributes remain bound to their selector owner", () => {
  for (const caseId of ["EVT-030", "EVT-036"]) {
    const contract = eventExactOracleFor(caseId).dom[0];
    const parent = contract.attributeOwners.find(owner => owner.selector.includes("[data-event-review-row]"));
    const child = contract.attributeOwners.find(owner => owner.selector.includes("[data-testid="));
    assert(parent?.attributes.some(item => item.name === "data-event-id" && item.value === "{fixtureId}"),
      `${caseId} parent event id owner missing`);
    assert(child?.attributes.some(item => item.name === "data-testid"),
      `${caseId} child test id owner missing`);
    assert(!contract.requiredAttributes.some(item => item.name === "data-event-id"),
      `${caseId} parent data-event-id leaked onto the child selector`);
  }
  expectReject("nested attribute owner flattening", catalog => {
    const contract = catalog["EVT-030"].dom[0];
    contract.requiredAttributes.push({ name: "data-event-id", value: "{fixtureId}" });
  }, "runner DOM attribute owner contract is incomplete");
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
