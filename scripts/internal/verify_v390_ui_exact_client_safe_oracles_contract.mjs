#!/usr/bin/env node
// 파일 용도: CLIENT/MEDIA/SAFE exact runtime oracle 87개 catalog의 완전성·불변성·false-PASS 거부 계약을 독립 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  clientSafeExactOracleCaseIds,
  clientSafeExactOracleFor,
  materializeClientSafeExactOracle,
  validateClientSafeExactOracleCatalog,
} from "./v390_ui_exact_client_safe_oracles.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const canonical = JSON.parse(fs.readFileSync(
  path.join(rootDir, "test/fixtures/ui_fulltest_case_manifest_policy_v4.json"),
  "utf8",
));
const checks = [];

check("catalog validates exact 87 current canonical IDs", () => {
  const result = validateClientSafeExactOracleCatalog();
  const canonicalIds = canonical.cases
    .map(item => item.testId)
    .filter(id => /^CLIENT-/.test(id) || ["MEDIA-016", "MEDIA-017"].includes(id) || /^SAFE-/.test(id))
    .sort();
  const catalogIds = [...clientSafeExactOracleCaseIds()].sort();
  assert(result.caseCount === 87, `case count mismatch: ${result.caseCount}`);
  assert(JSON.stringify(catalogIds) === JSON.stringify(canonicalIds), "catalog IDs drift from canonical CLIENT/MEDIA/SAFE scope");
  assert(new Set(catalogIds).size === 87, "catalog IDs are not unique");
});

check("public lookup returns immutable exact specs and null for unknown IDs", () => {
  assert(clientSafeExactOracleFor("UNKNOWN-001") === null, "unknown case lookup must return null");
  for (const caseId of clientSafeExactOracleCaseIds()) {
    const spec = clientSafeExactOracleFor(caseId);
    assert(spec?.caseId === caseId, `${caseId} lookup mismatch`);
    assert(deepFrozen(spec), `${caseId} nested spec is mutable`);
  }
  assert(Object.isFrozen(clientSafeExactOracleCaseIds()), "exported case ID list is mutable");
});

check("all 87 specs own route role control action API DOM forbidden snapshots cleanup and meaning", () => {
  const meanings = new Set();
  for (const caseId of clientSafeExactOracleCaseIds()) {
    const spec = clientSafeExactOracleFor(caseId);
    meanings.add(spec.featureMeaning);
    assert(spec.route.startsWith("/"), `${caseId} route missing`);
    assert(["viewer", "operator", "admin"].includes(spec.role), `${caseId} role invalid`);
    assert(spec.expectedBehavior === spec.featureMeaning, `${caseId} expectedBehavior drift`);
    assert(spec.visibleControl.selector && spec.visibleControl.action.kind && spec.visibleControl.action.target,
      `${caseId} control/action missing`);
    assert(spec.requests.length > 0 && spec.dom.length > 0, `${caseId} API/DOM assertion missing`);
    assert(spec.dom.every(item => Array.isArray(item.requiredTextTokens) &&
      Array.isArray(item.forbiddenTextTokens) && Array.isArray(item.forbiddenMaterialTokens)),
    `${caseId} DOM text/material boundary is not structured`);
    assert(spec.requests.every(item => item.requiredJsonPaths.length > 0 || item.requiredJsonValues.length > 0 ||
      item.requiredBodyTokens.length > 0 || item.forbiddenJsonKeys.length > 0 || item.forbiddenJsonValues.length > 0 ||
      item.allowedStatuses.some(status => status !== 200)), `${caseId} API assertion has no semantic/status boundary`);
    assert(spec.forbiddenFields.length + spec.forbiddenNetwork.length + spec.forbiddenStateMutations.length > 0,
      `${caseId} forbidden boundary is empty`);
    assert(spec.forbiddenNetwork.every(item => item.method && item.path && item.match),
      `${caseId} forbidden network is not structured`);
    assert(spec.stateSnapshots.length > 0 && spec.stateSnapshots.every(item =>
      item.target && item.before === "capture" && item.after === "capture" && item.comparison),
    `${caseId} state snapshot mismatch`);
    assert(!hasNonCanonicalPlaceholder(spec), `${caseId} non-canonical dynamic placeholder found`);
    assert(spec.cleanup.assertions.includes("owned-fixtures-absent-or-restored") &&
      spec.cleanup.assertions.includes("no-orphan-media-session"), `${caseId} cleanup assertion incomplete`);
  }
  assert(meanings.size === 87, `feature meanings must be case-specific: ${meanings.size}/87`);
});

check("known canonical route/role false-PASS mappings are corrected", () => {
  const client018 = clientSafeExactOracleFor("CLIENT-018");
  assert(client018.route === "/client/live" && client018.role === "admin" &&
    client018.dom.some(item => item.selector === ".client-preview-redaction-strip" &&
      item.requiredAttributes.some(attribute => attribute.name === "data-admin-preview-state" && attribute.value === "true")),
  "CLIENT-018 admin preview role/state correction missing");
  const media017 = clientSafeExactOracleFor("MEDIA-017");
  assert(media017.route === "/client/live" && media017.role === "viewer" &&
    media017.dom.some(item => item.propertyAssertions.some(property => property.name === "playingCount" && property.value === 2)),
  "MEDIA-017 client live viewer two-tile correction missing");
  const safe016 = clientSafeExactOracleFor("SAFE-016");
  assert(safe016.route === "/__v390-undefined-route__" && safe016.action.kind === "navigate-negative" &&
    safe016.requests.some(item => item.path === "/__v390-undefined-route__" &&
      JSON.stringify(item.allowedStatuses) === "[404]"),
  "SAFE-016 exact undefined route 404 correction missing");
  const safe061 = clientSafeExactOracleFor("SAFE-061");
  assert(safe061.route === "/ops/events" &&
    safe061.visibleControl.selector === '[data-testid="ops-rule-what-if-preview"]' &&
    safe061.action.kind === "assert-read-model" &&
    safe061.action.target === '[data-testid="ops-rule-what-if-preview"]' &&
    !safe061.dom.some(item => item.selector === "#opsEventRulePresetSelect"),
  "SAFE-061 events read-model control correction missing");
});

check("Ops API evidence tokens are not forced into route-local DOM prose", () => {
  for (const caseId of [
    "CLIENT-041", "SAFE-020", "SAFE-021", "SAFE-024", "SAFE-041", "SAFE-042",
    "SAFE-046", "SAFE-047", "SAFE-048", "SAFE-049", "SAFE-055", "SAFE-056",
    "SAFE-059", "SAFE-060", "SAFE-062", "SAFE-065", "SAFE-066", "SAFE-067",
    "SAFE-068", "SAFE-069", "SAFE-098", "SAFE-105", "SAFE-106", "SAFE-107",
    "SAFE-108", "SAFE-109", "SAFE-111", "SAFE-117", "SAFE-118", "SAFE-121",
    "SAFE-122", "SAFE-129", "SAFE-130", "SAFE-131", "SAFE-132", "SAFE-140",
  ]) {
    const spec = clientSafeExactOracleFor(caseId);
    const apiTokens = new Set(spec.requests.flatMap(request => [
      ...request.requiredJsonPaths,
      ...request.requiredBodyTokens,
      ...request.requiredJsonValues.map(item => String(item.value)),
    ]));
    const domTokens = new Set(spec.dom.flatMap(assertion => assertion.requiredTextTokens));
    assert([...apiTokens].some(Boolean), `${caseId} API evidence tokens are missing`);
    assert([...apiTokens].every(token => !domTokens.has(token)),
      `${caseId} API evidence token is still forced into DOM prose: ${[...apiTokens].find(token => domTokens.has(token))}`);
    assert(spec.dom.some(assertion => assertion.selector === spec.visibleControl.selector),
      `${caseId} route-local visible control assertion is missing`);
    const bodyBoundary = spec.dom.find(assertion => assertion.selector === "body");
    assert(bodyBoundary?.forbiddenTextTokens.length === 0 &&
      bodyBoundary?.forbiddenMaterialTokens.length > 0,
    `${caseId} forbidden fields must use structured DOM material boundaries`);
  }
});

check("media/session, scoped client projection, no-write and cleanup oracles are concrete", () => {
  for (const caseId of ["CLIENT-002", "CLIENT-005", "CLIENT-019", "CLIENT-020", "MEDIA-016", "MEDIA-017"]) {
    const spec = clientSafeExactOracleFor(caseId);
    assert(spec.requests.some(item => item.path.includes("/webrtc/session")), `${caseId} session API missing`);
    assert(spec.cleanup.assertions.includes("no-orphan-media-session"), `${caseId} orphan session cleanup missing`);
  }
  for (const caseId of ["CLIENT-023", "CLIENT-024", "CLIENT-025", "CLIENT-027", "CLIENT-028", "CLIENT-029", "CLIENT-031", "CLIENT-032", "CLIENT-040", "SAFE-110", "SAFE-119"]) {
    const spec = clientSafeExactOracleFor(caseId);
    assert(spec.setup.fixtures.includes("assigned-view") && spec.setup.fixtures.includes("scoped-event-record"),
      `${caseId} scoped digest seed missing`);
    assert(spec.requests.some(item => item.path === "/client/api/views/{fixtureId}/events"),
      `${caseId} authoritative events API missing`);
    assert(spec.forbiddenFields.includes("sourceUrl") && spec.forbiddenFields.includes("rawJson"),
      `${caseId} viewer redaction fields missing`);
  }
  for (const caseId of ["SAFE-038", "SAFE-052", "SAFE-053", "SAFE-061", "SAFE-066", "SAFE-098", "SAFE-108"]) {
    const spec = clientSafeExactOracleFor(caseId);
    assert(spec.forbiddenNetwork.some(item => /lab\/analysis|provider|full-replay/.test(item.path)),
      `${caseId} forbidden action/provider network missing`);
    assert(spec.stateSnapshots.some(item => /rule|event/.test(item.target)),
      `${caseId} rule/event before-state snapshot missing`);
  }
});

check("CLIENT-005/021 require tile-owned UI sessions and actual product overlay DOM", () => {
  const allStop = clientSafeExactOracleFor("CLIENT-005");
  assert(allStop.setup.fixtures.includes("active-live-session") &&
    allStop.requests.some(item => item.method === "DELETE" && item.path.includes("/webrtc/session/") &&
      item.fixtureRefs.includes("active-session")),
  "CLIENT-005 must retain the UI-created session all-stop contract");
  const overlay = clientSafeExactOracleFor("CLIENT-021");
  assert(overlay.setup.fixtures.includes("va-metadata-sample") &&
    overlay.requests.some(item => item.method === "POST" && item.path.includes("/webrtc/session")),
  "CLIENT-021 must retain metadata provenance and UI-created session contract");
  assert(overlay.requests.some(item =>
    item.method === "GET" &&
    item.path === "/client/api/views/{fixtureId}/events?limit=6" &&
    item.fixtureRefs.length === 1 &&
    item.fixtureRefs[0] === "assigned-view" &&
    item.jsonAssertions.some(assertion =>
      assertion.path === "$..eventId" &&
      assertion.operator === "equals-fixture" &&
      assertion.fixtureRef === "va-metadata-sample")),
  "CLIENT-021 deterministic VA event API binding missing");
  assert(overlay.dom.some(item => item.selector === '[data-tile] [data-mode-action="va-overlay"]' &&
    item.requiredAttributes.some(attribute => attribute.name === "aria-pressed" && attribute.value === "true")),
  "CLIENT-021 tile-local VA mode control assertion missing");
  assert(overlay.dom.some(item => item.selector === '[data-tile] [data-role="status"]' &&
    item.requiredTextTokens.includes("온라인")),
  "CLIENT-021 tile-local live status assertion missing");
  assert(overlay.dom.some(item => item.selector === '[data-tile] [data-role="info-overlay"]' &&
    item.propertyAssertions.some(property => property.name === "hidden" && property.value === false)),
  "CLIENT-021 tile-local info overlay assertion missing");
  assert(overlay.dom.some(item => item.selector === "#liveDockEvents" &&
    ["person", "presence", "open"].every(token => item.requiredTextTokens.includes(token))),
  "CLIENT-021 viewer-safe event projection DOM assertion missing");
  assert(!overlay.dom.some(item => /data-overlay-(?:status|metadata)/.test(item.selector)),
    "CLIENT-021 must reject nonexistent overlay status/metadata selectors");
  const materialized = materializeClientSafeExactOracle("CLIENT-021", {
    "assigned-view": "9001",
    "va-metadata-sample": "va-sample-21",
  });
  const eventRequest = materialized.requests.find(item =>
    item.method === "GET" && item.path === "/client/api/views/9001/events?limit=6");
  assert(eventRequest?.pathTemplate === "/client/api/views/{fixtureId}/events?limit=6",
    "CLIENT-021 materialized request lost its canonical path template");
  assert(eventRequest?.jsonAssertions.some(assertion =>
    assertion.path === "$..eventId" &&
    assertion.operator === "equals-fixture" &&
    assertion.value === "va-sample-21"),
  "CLIENT-021 materialized API binding is not tied to the seeded VA event");
});

check("CLIENT/SAFE projection contracts use renderer ownership and current response field names", () => {
  const digestAttributes = {
    "CLIENT-007": "data-client-incident-digest",
    "CLIENT-023": "data-client-incident-digest",
    "CLIENT-024": "data-client-followup-digest",
    "CLIENT-025": "data-client-event-digest",
    "CLIENT-027": "data-client-resolution-digest",
    "CLIENT-028": "data-client-source-status-digest",
    "CLIENT-029": "data-client-maintenance-digest",
    "CLIENT-031": "data-client-impact-forecast",
    "CLIENT-032": "data-client-operations-notice",
    "CLIENT-040": "data-client-action-notice-preview",
    "SAFE-110": "data-client-resolution-digest",
    "SAFE-119": "data-client-source-status-digest",
  };
  for (const [caseId, attribute] of Object.entries(digestAttributes)) {
    const spec = clientSafeExactOracleFor(caseId);
    assert(spec.dom.some(item => item.requiredAttributes.some(item =>
      item.name === attribute && item.value === "viewer-safe")),
    `${caseId} must bind the actual viewer-safe renderer attribute`);
    assert(!spec.dom.some(item => item.requiredTextTokens.includes("summaryText") ||
      item.requiredTextTokens.includes("resolutionStatus") ||
      item.requiredTextTokens.includes("sourceStatus")),
    `${caseId} must not treat response keys as literal DOM prose`);
  }
  const followUp = clientSafeExactOracleFor("CLIENT-024");
  assert(followUp.requests[0].requiredJsonPaths.includes("$..followUpStatus") &&
    !followUp.requests[0].requiredJsonPaths.includes("$..status"),
  "CLIENT-024 must use the published followUpStatus field");
  const actionNotice = clientSafeExactOracleFor("CLIENT-040");
  assert(actionNotice.requests[0].requiredJsonPaths.includes("$..noticeStatus") &&
    !actionNotice.requests[0].requiredJsonPaths.includes("$..status"),
  "CLIENT-040 must use the published noticeStatus field");
  for (const caseId of ["CLIENT-006", "CLIENT-007", "CLIENT-023"]) {
    const request = clientSafeExactOracleFor(caseId).requests.find(item =>
      item.path.includes("/client/api/views/{fixtureId}/") &&
      (item.path.endsWith("/dashboard") || item.path.endsWith("/events")));
    assert(request?.requiredJsonPaths.includes("$.events.incidentDigest.schema") &&
      request.requiredJsonPaths.includes("$.events.incidentDigest.itemCount") &&
      request.requiredJsonPaths.includes("$.events.incidentDigest.digestItems") &&
      !request.requiredJsonPaths.includes("$..incidentDigest"),
    `${caseId} must bind the exact events.incidentDigest response envelope`);
  }
  const safeBoundary = clientSafeExactOracleFor("SAFE-049");
  assert(safeBoundary.requests.length === 1 && safeBoundary.requests[0].path === "/ops" &&
    safeBoundary.requests[0].responseSchema === "html" &&
    safeBoundary.requests[0].requiredBodyTokens.includes("summaryText"),
  "SAFE-049 must remain an Ops HTML redaction boundary instead of claiming the client events envelope");
});

check("SAFE-038 separates API candidate identity from the DOM candidate index", () => {
  const spec = clientSafeExactOracleFor("SAFE-038");
  const request = spec.requests[0];
  assert(request.jsonAssertions.some(item =>
    item.path === "$..ruleSuggestion.candidateId" &&
    item.operator === "equals-fixture" &&
    item.fixtureRef === "vlm-rule-suggestion-draft"),
  "SAFE-038 API candidate identity binding missing");
  assert(spec.visibleControl.selector === '[data-vlm-rule-draft-index="0"]' &&
    spec.action.target === '[data-vlm-rule-draft-index="0"]' &&
    !JSON.stringify(spec).includes("$..draftId"),
  "SAFE-038 DOM candidate index is still conflated with a nonexistent draftId");
});

check("tile controls and denied view reads use their actual product boundaries", () => {
  const start = clientSafeExactOracleFor("CLIENT-002");
  assert(start.action.kind === "start-live-tile" &&
    start.action.target === '[data-tile="0"] [data-action="toggle-playback"]',
  "CLIENT-002 must use the tile session lifecycle action");
  const allStop = clientSafeExactOracleFor("CLIENT-005");
  assert(allStop.dom.every(item => !item.selector.startsWith("[data-role=\"tile-playback-icon\"]")) &&
    allStop.dom.some(item => item.selector.startsWith('[data-tile="0"]')),
  "CLIENT-005 must inspect the exact first tile after all-stop");
  const denied = clientSafeExactOracleFor("CLIENT-011");
  const deniedRead = denied.requests.find(item => item.path.includes("{fixtureId}"));
  assert(deniedRead?.allowedStatuses.includes(403) && deniedRead?.allowedStatuses.includes(404) &&
    deniedRead.requiredJsonPaths.length === 0,
  "CLIENT-011 must accept the authoritative forbidden/not-found status without inventing an error schema");
  const dashboard = clientSafeExactOracleFor("CLIENT-006");
  assert(dashboard.requests[0].jsonAssertions.some(item => item.path === "$..viewId" &&
    item.operator === "equals-fixture" && item.fixtureRef === "assigned-view"),
  "CLIENT-006 must bind the published dashboard viewId to its assigned fixture");
});

check("client live controls are tile-local and persisted controls keep their real product owners", () => {
  for (const caseId of ["CLIENT-002", "CLIENT-019", "CLIENT-020", "MEDIA-016"]) {
    const spec = clientSafeExactOracleFor(caseId);
    const selectors = [
      spec.visibleControl.selector,
      spec.action.target,
      ...spec.dom.map(item => item.selector),
    ];
    assert(selectors.some(selector => selector.includes('[data-tile="0"]')),
      `${caseId} first actionable tile is not selected exactly`);
    assert(!selectors.some(selector => selector === '[data-action="toggle-playback"]'),
      `${caseId} retained a strict-multi playback selector`);
  }
  const overlay = clientSafeExactOracleFor("CLIENT-021");
  assert(overlay.visibleControl.selector === '[data-tile="0"] [data-mode-action="va-overlay"]' &&
    overlay.action.target === '[data-tile="0"] [data-mode-action="va-overlay"]',
  "CLIENT-021 retained a strict-multi VA selector");
  const layout = clientSafeExactOracleFor("CLIENT-010");
  assert(layout.dom.some(item => item.selector === '[data-testid="client-live-drop-grid"]' &&
    item.requiredAttributes.some(attribute => attribute.name === "data-density" && attribute.value === "compact")),
  "CLIENT-010 density assertion is not owned by the live grid");
  const multi = clientSafeExactOracleFor("MEDIA-017");
  assert(multi.action.target === "[data-tile]" &&
    multi.dom.some(item => item.selector === "[data-tile] video"),
  "MEDIA-017 retained the nonexistent live-tile selector");
});

check("selector cardinality, fixture refs and JSONPath bindings are evaluator-ready", () => {
  for (const caseId of clientSafeExactOracleCaseIds()) {
    const spec = clientSafeExactOracleFor(caseId);
    for (const assertion of spec.dom) {
      assert(!assertion.requiredAttributes.some(item => item.name === "count"),
        `${caseId} count incorrectly encoded as DOM attribute`);
      assert(assertion.fixtureRefs.length === (assertion.selector.match(/\{fixtureId\}/g) || []).length,
        `${caseId} DOM fixture refs do not match placeholders`);
    }
    for (const request of spec.requests) {
      assert(request.fixtureRefs.length === (request.path.match(/\{fixtureId\}/g) || []).length,
        `${caseId} request fixture refs do not match placeholders`);
      assert(request.requiredJsonPaths.every(value => /^\$(?:\.\.|\.)[A-Za-z_][A-Za-z0-9_.]*$/.test(value)),
        `${caseId} invalid requiredJsonPath`);
      assert(request.jsonAssertions.every(item => request.requiredJsonPaths.includes(item.path)),
        `${caseId} JSON assertion is not bound to a requiredJsonPath`);
    }
  }
  const client001 = clientSafeExactOracleFor("CLIENT-001");
  const assigned = client001.dom.find(item => item.fixtureRefs.includes("assigned-view"));
  const blocked = client001.dom.find(item => item.fixtureRefs.includes("blocked-view"));
  assert(assigned?.selector === '[data-source-view="{fixtureId}"]' && assigned.cardinality?.value === 1,
    "CLIENT-001 assigned selector fixture/cardinality binding missing");
  assert(blocked?.selector === '[data-source-view="{fixtureId}"]' && blocked.cardinality?.value === 0,
    "CLIENT-001 blocked selector fixture/cardinality binding missing");
  assert(assigned.fixtureRefs[0] !== blocked.fixtureRefs[0],
    "CLIENT-001 assigned and blocked selectors collapse to the same fixture reference");
  const assignedApiBinding = client001.requests[0].jsonAssertions.find(item => item.path === "$..viewId");
  assert(assignedApiBinding?.operator === "equals-fixture" &&
    assignedApiBinding.value === "{fixtureId}" && assignedApiBinding.fixtureRef === "assigned-view",
  "CLIENT-001 assigned API JSON path is not bound to the assigned-view fixture");
  assert(client001.requests[0].forbiddenJsonValues.some(item =>
    item.operator === "excludes-fixture" && item.fixtureRef === "blocked-view"),
  "CLIENT-001 blocked-view API value exclusion is not fixture-bound");
});

check("fixture materializer separates assigned/blocked, multi-view and event-search runtime values", () => {
  const client001 = materializeClientSafeExactOracle("CLIENT-001", {
    "assigned-view": "assigned/view-A",
    "blocked-view": "blocked/view-B",
  });
  assert(client001.dom[0].selector.includes("assigned\\2f view-A") &&
    client001.dom[1].selector.includes("blocked\\2f view-B") &&
    client001.dom[0].selector !== client001.dom[1].selector,
  "CLIENT-001 materialized assigned/blocked selectors are not distinct/CSS-safe");
  assert(client001.requests[0].jsonAssertions[0].value === "assigned/view-A" &&
    client001.requests[0].forbiddenJsonValues[0].value === "blocked/view-B",
  "CLIENT-001 materialized JSON fixture values drift");
  const media017 = materializeClientSafeExactOracle("MEDIA-017", {
    "assigned-view-a": "view A",
    "assigned-view-b": "view/B",
  });
  assert(media017.requests[0].path.endsWith("/view%20A/webrtc/session") &&
    media017.requests[1].path.endsWith("/view%2FB/webrtc/session") &&
    media017.requests[0].path !== media017.requests[1].path,
  "MEDIA-017 materialized session paths are not distinct/URL-safe");
  const safe052 = materializeClientSafeExactOracle("SAFE-052", {
    "event-record": "event/52",
    "event-search-query": "candidate 52",
  });
  assert(safe052.action.kind === "assert-read-model" &&
    safe052.requests[0].path.includes("eventId=event%2F52&q=candidate%2052") &&
    safe052.dom.some(item => item.selector.includes('data-vlm-summary-candidate-event="event\\2f 52"')) &&
    safe052.dom.some(item => item.propertyAssertions.some(property => property.value === "candidate 52")),
  "SAFE-052 event/query API and DOM fixture values were not materialized together");
  let missingFixture = "";
  try {
    materializeClientSafeExactOracle("CLIENT-001", { "assigned-view": "assigned" });
  } catch (error) {
    missingFixture = String(error?.message || error);
  }
  assert(missingFixture.includes("fixture value missing for blocked-view"),
    `materializer accepted missing blocked fixture: ${missingFixture}`);
});

check("validator rejects missing, extra, generic GET200, existence-only, unbound and cleanup defects", () => {
  expectInvalid("missing case", candidate => { delete candidate["CLIENT-001"]; }, "exact 87 case IDs mismatch");
  expectInvalid("extra case", candidate => { candidate["CLIENT-999"] = structuredClone(candidate["CLIENT-001"]); }, "exact 87 case IDs mismatch");
  expectInvalid("simple GET200 existence-only", candidate => {
    const spec = candidate["CLIENT-001"];
    spec.semanticKeys = ["exists", "visible"];
    spec.requests = [{ method: "GET", path: "/client/live", fixtureRefs: [], allowedStatuses: [200], responseSchema: "html", requiredJsonPaths: [], jsonAssertions: [], requiredJsonValues: [], requiredBodyTokens: [], forbiddenJsonKeys: [], forbiddenJsonValues: [], cardinality: null }];
    spec.dom = [{ selector: "body", fixtureRefs: [], requiredTextTokens: [], forbiddenTextTokens: [],
      forbiddenMaterialTokens: [], cardinality: null,
      requiredAttributes: [{ name: "exists", operator: "equals", value: true }],
      propertyAssertions: [], valueFixtureRefs: [] }];
    spec.forbiddenFields = [];
    spec.forbiddenNetwork = [];
    spec.forbiddenStateMutations = [];
  }, "simple GET200 existence-only false-PASS oracle forbidden");
  expectInvalid("missing DOM", candidate => { candidate["CLIENT-006"].dom = []; }, "DOM assertions missing");
  expectInvalid("unbound meaning", candidate => { candidate["CLIENT-010"].semanticKeys = ["never-bound-a", "never-bound-b"]; }, "case meaning is not bound");
  expectInvalid("missing snapshots", candidate => { candidate["MEDIA-016"].stateSnapshots = []; }, "before/after snapshots missing");
  expectInvalid("missing cleanup", candidate => { candidate["SAFE-038"].cleanup.assertions = []; }, "cleanup contract missing");
});

check("validator rejects corrected route, role, and route-local control regressions", () => {
  expectInvalid("CLIENT-018 viewer regression", candidate => { candidate["CLIENT-018"].role = "viewer"; }, "CLIENT-018 admin preview route/role correction missing");
  expectInvalid("MEDIA-017 ops regression", candidate => { candidate["MEDIA-017"].route = "/ops/sources"; }, "MEDIA-017 client live viewer route/role correction missing");
  expectInvalid("SAFE-016 /ops regression", candidate => { candidate["SAFE-016"].route = "/ops"; }, "SAFE-016 undefined route 404 correction missing");
  expectInvalid("SAFE-061 rules-page control regression", candidate => {
    candidate["SAFE-061"].visibleControl.selector = "#opsEventRulePresetSelect";
    candidate["SAFE-061"].action = { kind: "select", target: "#opsEventRulePresetSelect", value: "road" };
  }, "SAFE-061 events read-model control correction missing");
});

for (const item of checks) {
  const prefix = item.ok ? "[pass]" : "[fail]";
  console.log(`${prefix} ${item.name}${item.error ? `: ${item.error}` : ""}`);
}
const failed = checks.filter(item => !item.ok);
console.log("\n== v3.9.0 CLIENT/MEDIA/SAFE exact oracle contract summary ==");
console.log(`- canonicalCases: ${clientSafeExactOracleCaseIds().length}`);
console.log(`- pass: ${checks.length - failed.length}`);
console.log(`- fail: ${failed.length}`);
console.log("- runtimeBrowserExecution: not-run-by-this-contract");
if (failed.length > 0) process.exitCode = 1;

function expectInvalid(label, mutate, message) {
  const candidate = Object.fromEntries(clientSafeExactOracleCaseIds().map(caseId => [
    caseId,
    structuredClone(clientSafeExactOracleFor(caseId)),
  ]));
  mutate(candidate);
  deepFreeze(candidate);
  let observed = "";
  try {
    validateClientSafeExactOracleCatalog(candidate);
  } catch (error) {
    observed = String(error?.message || error);
  }
  assert(observed.includes(message), `${label} accepted or wrong failure: ${observed}`);
}

function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true, error: "" });
  } catch (error) {
    checks.push({ name, ok: false, error: String(error?.message || error) });
  }
}

function deepFrozen(value) {
  if (!value || typeof value !== "object") return true;
  return Object.isFrozen(value) && Object.values(value).every(deepFrozen);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function hasNonCanonicalPlaceholder(value) {
  if (typeof value === "string") {
    return [...value.matchAll(/\{[^}]+\}/g)].some(match => match[0] !== "{fixtureId}");
  }
  if (Array.isArray(value)) return value.some(hasNonCanonicalPlaceholder);
  return Boolean(value && typeof value === "object" && Object.values(value).some(hasNonCanonicalPlaceholder));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
