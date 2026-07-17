#!/usr/bin/env node
// 파일 용도: UI/AUTH/SRC/RULE immutable exact runtime oracle catalog의 제품 source 결속과 false-PASS 거부를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  coreExactOracleCaseIds,
  coreExactOracleFor,
  validateCoreExactOracleCatalog,
} from "./v390_ui_exact_core_oracles.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const checks = [];
const productSource = readTree("src/ingress", file => /\.(?:cpp|h)$/.test(file));

check("catalog covers every canonical UI/AUTH/SRC/RULE case in exact order", () => {
  const result = validateCoreExactOracleCatalog();
  assert(result.caseCount === 288, `core exact oracle case count mismatch: ${result.caseCount}`);
  assert(JSON.stringify(result.prefixCounts) === JSON.stringify({ UI: 114, AUTH: 30, SRC: 40, RULE: 104 }),
    `core exact oracle prefix counts mismatch: ${JSON.stringify(result.prefixCounts)}`);
  assert(result.specializedCount === 13 && result.genericGet200ExistsOnlyCount === 0,
    "specialized/generic closure mismatch");
  assert(result.coreBindingSha256 === "62e799c0460c633a6ea8a75934824aaa7cd28556452b5fddf6bc14053b8ec24d",
    "independent canonical/source semantic binding digest drift");
});

check("catalog and every returned oracle are deeply immutable", () => {
  assert(Object.isFrozen(coreExactOracleCaseIds), "core exact oracle ID list is mutable");
  for (const caseId of coreExactOracleCaseIds) {
    const oracle = coreExactOracleFor(caseId);
    assert(Object.isFrozen(oracle) && Object.isFrozen(oracle.api) &&
      Object.isFrozen(oracle.api.bodyAssertions) && Object.isFrozen(oracle.domAssertions) &&
      Object.isFrozen(oracle.network) && Object.isFrozen(oracle.beforeAfterState) && Object.isFrozen(oracle.cleanup),
    `${caseId} oracle is not deeply immutable`);
  }
  assert(coreExactOracleFor("NOT-A-CASE") === null, "unknown core oracle must return null");
});

check("runner-facing route/role/control/request/DOM/network/state/cleanup shape is exact", () => {
  for (const caseId of coreExactOracleCaseIds) {
    const oracle = coreExactOracleFor(caseId);
    assert(oracle.route && oracle.role && oracle.visibleControl?.selector && oracle.visibleControl?.action,
      `${caseId} route/role/visibleControl action missing`);
    assert(oracle.requests.length === 1 && oracle.requests[0].forbiddenJsonKeys.length >= 4,
      `${caseId} runner request assertions missing`);
    assertExecutableRequest(caseId, oracle.requests[0]);
    assert(oracle.requests[0].body === null || oracle.requests[0].body.fixtureId === "{fixtureId}",
      `${caseId} dynamic fixture must use {fixtureId}`);
    assert(oracle.dom.length >= 1 && oracle.dom.every(item => Array.isArray(item.requiredAttributes) &&
      item.requiredAttributes.length > 0 && item.requiredAttributes.every(attribute =>
        attribute.name && attribute.operator && attribute.value !== undefined)),
      `${caseId} runner DOM assertion missing`);
    assert(oracle.stateSnapshots.length === 2 && oracle.cleanup.strategy && oracle.cleanup.targets.length > 0,
      `${caseId} state snapshot/cleanup target missing`);
    assert(oracle.expectedBehavior.text && oracle.expectedBehavior.sha256.length === 64,
      `${caseId} expectedBehavior missing`);
  }
});

check("owner/action anchors and visible controls resolve in product source", () => {
  for (const caseId of coreExactOracleCaseIds) {
    const oracle = coreExactOracleFor(caseId);
    const ownerPath = path.join(rootDir, oracle.owner.file);
    const actionPath = path.join(rootDir, oracle.owner.actionFile);
    assert(fs.existsSync(ownerPath) && fs.existsSync(actionPath), `${caseId} product owner/action file missing`);
    assert(fs.readFileSync(ownerPath, "utf8").includes(oracle.owner.anchor), `${caseId} product owner anchor missing`);
    const token = selectorSourceToken(oracle.visibleControl.selector);
    if (token) assert(productSource.includes(token), `${caseId} visible control token is not in product source: ${token}`);
  }
});

check("runtime response paths/tokens resolve to product JSON or HTML output anchors", () => {
  for (const caseId of coreExactOracleCaseIds) {
    const request = coreExactOracleFor(caseId).requests[0];
    for (const jsonPath of request.requiredJsonPaths || []) {
      const keys = jsonPath.replace(/^\$\./, "").split(".").filter(key => key !== "*");
      assert(keys.every(key => productSource.includes(key)),
        `${caseId} JSON response path is not product-owned: ${jsonPath}`);
    }
    for (const tokenGroup of request.requiredBodyTokens || []) {
      const alternatives = tokenGroup.split("|").map(value => value.trim()).filter(Boolean);
      assert(alternatives.some(token => productSource.toLowerCase().includes(token.toLowerCase())),
        `${caseId} HTML/negative response token is not product-owned: ${tokenGroup}`);
    }
  }
});

check("every exact API path is owned by ingress source and has semantic body assertions", () => {
  for (const caseId of coreExactOracleCaseIds) {
    const oracle = coreExactOracleFor(caseId);
    const ownedPrefix = oracle.api.request.path.split("/{")[0].replace(/\{[^}]+\}/g, "");
    assert(ownedPrefix === "/" || productSource.includes(ownedPrefix),
      `${caseId} exact API/route owner missing in ingress source: ${ownedPrefix}`);
    assert(oracle.api.bodyAssertions.length >= 2 &&
      oracle.api.bodyAssertions[0].verifier.startsWith("scripts/internal/") &&
      oracle.api.bodyAssertions[1].tokens.length > 0,
    `${caseId} verifier-backed body assertions missing`);
    assert(!oracle.api.forbiddenFields.some(value => !String(value).trim()), `${caseId} empty forbidden field token`);
  }
});

check("state mutations bind exact request bodies, changed state, and authoritative cleanup", () => {
  const mutations = coreExactOracleCaseIds.map(coreExactOracleFor).filter(oracle =>
    oracle.beforeAfterState.comparison === "case-fixture-created-or-updated");
  assert(mutations.length === 36, `core mutation oracle count mismatch: ${mutations.length}`);
  for (const oracle of mutations) {
    assert(oracle.api.request.body?.fixtureId === oracle.action.fixtureId &&
      oracle.api.request.body.requiredFields.length > 0 &&
      oracle.beforeAfterState.comparison === "case-fixture-created-or-updated" &&
      ["delete-created-fixture", "restore-authoritative-snapshot"].includes(oracle.cleanup.mode) &&
      oracle.cleanup.finalExpectation === "equal-before-or-absent",
    `${oracle.caseId} mutation body/state/cleanup contract incomplete`);
  }
});

check("read, preview POST, and negative cases forbid writes and require independent before/after readback", () => {
  const reads = coreExactOracleCaseIds.map(coreExactOracleFor).filter(oracle =>
    oracle.beforeAfterState.comparison === "authoritative-state-equal-before");
  assert(reads.length === 252, `core read oracle count mismatch: ${reads.length}`);
  for (const oracle of reads) {
    assert(oracle.network.forbiddenRequests.some(request => request.methods.includes("PUT") && request.methods.includes("DELETE")) &&
      oracle.beforeAfterState.comparison === "authoritative-state-equal-before" &&
      oracle.cleanup.mode === "no-op-with-state-proof" && oracle.cleanup.finalExpectation === "equal-before",
    `${oracle.caseId} read/no-write state contract incomplete`);
  }
  const preview = coreExactOracleFor("SRC-031");
  assert(preview.requests[0].method === "POST" && preview.requests[0].allowedStatuses[0] === 200 &&
    preview.requests[0].requiredJsonPaths.includes("$.credentialGate") &&
    preview.forbiddenNetwork.every(item => item.method !== "POST"),
  "SRC-031 POST preview/no-write runtime contract drift");
});

check("corrected AUTH disable and client-view bindings match executable product routes", () => {
  const authDisable = coreExactOracleFor("AUTH-020").requests[0];
  assert(authDisable.method === "POST" && authDisable.path === "/ops/api/users/{fixtureId}/disable" &&
    JSON.stringify(authDisable.allowedStatuses) === "[200]" &&
    JSON.stringify(authDisable.requiredJsonPaths) === JSON.stringify(["$.status", "$.user"]),
  "AUTH-020 must execute the product disable action, not a nonexistent DELETE route");
  const clientEvents = coreExactOracleFor("SRC-038").requests[0];
  assert(clientEvents.path === "/client/api/views/{viewId}/events" &&
    clientEvents.requiredJsonPaths.includes("$.events"),
  "SRC-038 must bind the assigned runtime view rather than a synthetic fixture id");
});

check("RULE-092~104 and RULE-111 delegate to existing specialized exact oracles", () => {
  const expected = [
    "RULE-092", "RULE-093", "RULE-094", "RULE-095", "RULE-096", "RULE-097", "RULE-098",
    "RULE-100", "RULE-101", "RULE-102", "RULE-103", "RULE-104", "RULE-111",
  ];
  const actual = coreExactOracleCaseIds.filter(caseId => coreExactOracleFor(caseId).classification === "existing-specialized");
  assert(JSON.stringify(actual) === JSON.stringify(expected), "existing-specialized case set drift");
  for (const caseId of expected) {
    const oracle = coreExactOracleFor(caseId);
    assert(oracle.specializedOracleId === `existing:${caseId}`, `${caseId} specialized oracle reference missing`);
  }
});

check("validator rejects missing, duplicate, route/role drift, and weak source ownership", () => {
  expectInvalid("missing", catalog => catalog.pop(), "core oracle count mismatch");
  expectInvalid("duplicate", catalog => { catalog[1] = structuredClone(catalog[0]); }, "case IDs must be unique");
  expectInvalid("route", catalog => { catalog[0].route = "/wrong"; }, "route/role drift");
  expectInvalid("role", catalog => { catalog[0].accountRole = "admin"; }, "route/role drift");
  expectInvalid("owner digest", catalog => { catalog[0].owner.contextSha256 = "weak"; }, "owner contextSha256 missing");
});

check("validator rejects generic GET200, exists-only DOM, uncorrelated network, and state self-comparison", () => {
  expectInvalid("generic body", catalog => {
    catalog[0].api.bodyAssertions = [{ kind: "exists" }, { kind: "visible" }];
  }, "API body assertions are generic or incomplete");
  expectInvalid("exists-only DOM", catalog => {
    catalog[0].domAssertions = [{ kind: "visible-control", selector: "body", expected: true }];
  }, "DOM oracle is exists-only");
  expectInvalid("HTML status/exists only", catalog => {
    catalog[0].requests[0].requiredBodyTokens = [];
  }, "runner request/body oracle missing");
  const jsonIndex = coreExactOracleCaseIds.indexOf("UI-036");
  expectInvalid("synthetic verifier path", catalog => {
    catalog[jsonIndex].requests[0].requiredJsonPaths[0] = "$<verifier:fake>";
  }, "synthetic JSONPath token forbidden");
  expectInvalid("JSON status only", catalog => {
    catalog[jsonIndex].requests[0].requiredJsonPaths = [];
  }, "runner request/body oracle missing");
  const redirectIndex = coreExactOracleCaseIds.indexOf("UI-005");
  expectInvalid("redirect accepted as JSON", catalog => {
    catalog[redirectIndex].requests[0].responseSchema = "json";
    catalog[redirectIndex].requests[0].requiredJsonPaths = [];
  }, "runner request/body oracle missing");
  expectInvalid("uncorrelated", catalog => { catalog[0].network.correlationId = "generic"; }, "exact network correlation missing");
  expectInvalid("non-executable forbidden wildcard", catalog => {
    catalog[0].forbiddenNetwork[0].path = "/ops/api/{any}";
  }, "forbidden network shape missing");
  expectInvalid("state self compare", catalog => {
    catalog[0].beforeAfterState.afterIdentity = catalog[0].beforeAfterState.beforeIdentity;
  }, "before/after state oracle is self-comparison");
});

check("validator rejects absent API payload, forbidden fields, cleanup, and specialized link", () => {
  const mutationIndex = coreExactOracleCaseIds.findIndex(caseId => coreExactOracleFor(caseId).api.request.method !== "GET");
  expectInvalid("payload", catalog => { catalog[mutationIndex].action.semanticPayload.requiredFields = []; }, "API payload/semantic fields missing");
  expectInvalid("forbidden", catalog => { catalog[0].api.forbiddenFields = []; }, "forbidden field contract missing");
  expectInvalid("cleanup", catalog => { catalog[0].cleanup.verification = ""; }, "cleanup readback missing");
  const specializedIndex = coreExactOracleCaseIds.indexOf("RULE-092");
  expectInvalid("specialized", catalog => { catalog[specializedIndex].classification = "core-exact"; }, "specialized classification drift");
});

const failures = checks.filter(item => item.status === "FAIL");
for (const item of checks) console.log(`[${item.status.toLowerCase()}] ${item.name}${item.error ? `: ${item.error}` : ""}`);
console.log("\n== v3.9.0 UI exact core oracle contract summary ==");
console.log(`- cases: ${coreExactOracleCaseIds.length}`);
console.log(`- pass: ${checks.length - failures.length}`);
console.log(`- fail: ${failures.length}`);
console.log("- actualBrowserExecution: not-run-by-this-contract");
if (failures.length > 0) process.exit(1);

function expectInvalid(label, mutate, expectedMessage) {
  const candidate = coreExactOracleCaseIds.map(caseId => structuredClone(coreExactOracleFor(caseId)));
  mutate(candidate);
  let message = "";
  try { validateCoreExactOracleCatalog(candidate); } catch (error) { message = String(error?.message || error); }
  assert(message.includes(expectedMessage), `${label} mutation accepted or wrong error: ${message}`);
}

function selectorSourceToken(selector) {
  const value = String(selector || "");
  if (!value || value === "body") return "";
  const testId = value.match(/data-testid=["']([^"']+)/)?.[1];
  if (testId) return `data-testid="${testId}"`;
  const id = value.match(/#([A-Za-z0-9_-]+)/)?.[1];
  if (id) return `id="${id}"`;
  const data = value.match(/\[(data-[A-Za-z0-9_-]+)/)?.[1];
  if (data) return data;
  const className = value.match(/\.([A-Za-z0-9_-]+)/)?.[1];
  return className || "";
}

function assertExecutableRequest(caseId, request) {
  const serialized = JSON.stringify(request);
  assert(!serialized.includes("$<") && !serialized.includes("<verifier:") &&
    !/expectedBehaviorSha256:[a-f0-9]{64}/.test(serialized),
  `${caseId} synthetic verifier/digest response token present`);
  if (request.responseSchema === "json") {
    assert(Array.isArray(request.requiredJsonPaths) && request.requiredJsonPaths.length >= 2 &&
      request.requiredJsonPaths.every(value => /^\$\.[A-Za-z_][A-Za-z0-9_]*(?:\.(?:[A-Za-z_][A-Za-z0-9_]*|\*))*$/.test(value)) &&
      Array.isArray(request.requiredBodyTokens) && request.requiredBodyTokens.length === 0,
    `${caseId} JSON response contract is not executable`);
    return;
  }
  assert(request.requiredJsonPaths === undefined,
    `${caseId} non-JSON response must omit requiredJsonPaths for runtime fallback`);
  if (["html", "negative-route"].includes(request.responseSchema)) {
    assert(Array.isArray(request.requiredBodyTokens) && request.requiredBodyTokens.length > 0,
      `${caseId} HTML/negative response token missing`);
    return;
  }
  assert(request.responseSchema === "redirect" && request.allowedStatuses.length === 1 &&
    request.allowedStatuses[0] === 302 && request.requiredBodyTokens.length === 0,
  `${caseId} redirect response contract invalid`);
}

function readTree(relativeDir, include) {
  const root = path.join(rootDir, relativeDir);
  const chunks = [];
  const visit = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (include(target)) chunks.push(fs.readFileSync(target, "utf8"));
    }
  };
  visit(root);
  return chunks.join("\n");
}

function check(name, fn) {
  try { fn(); checks.push({ name, status: "PASS" }); }
  catch (error) { checks.push({ name, status: "FAIL", error: String(error?.message || error) }); }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
