#!/usr/bin/env node
// 파일 용도: V390-REVIEW2-24 exact 424 native 실행 manifest의 positive/negative 계약을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildNativeExactManifest,
  normalizeProductScreenRoute,
  validateNativeExactManifest,
} from "./v390_ui_native_exact_cases_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const canonical = readJson("test/fixtures/ui_fulltest_case_manifest_policy_v4.json");
const implementation = readJson("test/fixtures/project_feature_implementation_evidence.json");
const manifest = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const runnerSource = fs.readFileSync(path.join(rootDir, "scripts/internal/run_v390_ui_native_exact_cases.mjs"), "utf8");
const checks = [];

check("generated manifest validates against canonical exact ordered 424", () => {
  const result = validateNativeExactManifest({ manifest, canonical, implementation });
  assert(result.caseCount === 424, `caseCount mismatch: ${result.caseCount}`);
  assert(result.unsupported === 0, `unsupported must be zero: ${result.unsupported}`);
  assert(result.positiveNative === 423, `positiveNative mismatch: ${result.positiveNative}`);
  assert(result.negativeRoute === 1, `negativeRoute mismatch: ${result.negativeRoute}`);
});

check("builder is deterministic and preserves exact case order", () => {
  const rebuilt = buildNativeExactManifest({ canonical, implementation });
  assert(JSON.stringify(rebuilt) === JSON.stringify(manifest), "generated manifest drift");
  assert(JSON.stringify(manifest.cases.map(item => item.caseId)) ===
    JSON.stringify(canonical.cases.map(item => item.testId)), "canonical ordered IDs drift");
});

check("API ownership routes normalize to product screens", () => {
  const expected = new Map([
    ["/ops/api/events/reviews", "/ops/events"],
    ["/client/api/views/{id}/events", "/client/events"],
    ["/ops/api/source-registry/reliability-timeline", "/ops/sources"],
    ["/ops/api/onvif/credential-provider-status", "/ops/sources"],
    ["/ops/api/audit", "/ops/users"],
  ]);
  for (const [source, screen] of expected) {
    assert(normalizeProductScreenRoute(source) === screen, `${source} did not normalize to ${screen}`);
  }
  for (const item of manifest.cases.filter(value => value.disposition === "native-executable")) {
    assert(!item.screenRoute.includes("/api/"), `${item.caseId} retains raw API screen route`);
  }
});

check("UI-018 remains a dedicated negative route case", () => {
  const item = manifest.cases.find(value => value.caseId === "UI-018");
  assert(item?.disposition === "negative-route", "UI-018 negative disposition missing");
  assert(item.canonicalRoute === "/lab" && item.screenRoute === "/lab", "UI-018 route mismatch");
  assert(item.actions.length === 1 && item.actions[0].kind === "navigate", "UI-018 action must be native navigate");
  assert(item.oracle.kind === "negative-route-status", "UI-018 negative status oracle missing");
  assert(item.oracle.allowedStatuses.includes(404), "UI-018 must accept only explicit negative status");
});

check("SAFE-017 keeps its cross-route negative behavior without changing UI-018 classification", () => {
  const item = manifest.cases.find(value => value.caseId === "SAFE-017");
  assert(item?.disposition === "native-executable", "SAFE-017 must remain in positive native count");
  assert(item.screenRoute === "/ops", "SAFE-017 product screen route mismatch");
  const negativeAction = item.actions.find(action => action.kind === "navigate-negative");
  assert(negativeAction?.route === "/lab", "SAFE-017 /lab negative action missing");
  assert(negativeAction.allowedStatuses.includes(404), "SAFE-017 404 oracle missing");
  assert(item.oracle.kind === "cross-route-negative-status", "SAFE-017 cross-route oracle missing");
});

check("all cases declare native action, oracle seed, and artifact plan", () => {
  for (const item of manifest.cases) {
    assert(item.dispatch === "playwright-native", `${item.caseId} dispatch mismatch`);
    assert(Array.isArray(item.actions) && item.actions.length > 0, `${item.caseId} actions missing`);
    assert(item.actions.every(action => action.dispatch === "playwright-native"), `${item.caseId} non-native action`);
    assert(item.oracle?.sourceKind && item.oracle?.expectedBehaviorSha256, `${item.caseId} oracle seed missing`);
    assert(item.artifacts?.screenshot && item.artifacts?.trace && item.artifacts?.browserConsole && item.artifacts?.serverLog,
      `${item.caseId} artifact plan missing`);
    assert(item.accountRole && item.viewport?.width > 0 && item.viewport?.height > 0 && item.theme,
      `${item.caseId} role/viewport/theme missing`);
  }
});

check("runner owns native execution, role state, first-fail, and artifact fields", () => {
  for (const snippet of [
    "createNativePlaywrightAdapter",
    "playwright-native",
    "role state missing",
    "not run after previous native case failure",
    "screenshotPath",
    "tracePath",
    "browserConsolePath",
    "serverLogReference",
    "uiFulltestPass: false",
  ]) {
    assert(runnerSource.includes(snippet), `runner source missing ${snippet}`);
  }
});

check("missing, reordered, unsupported, API-screen, and field drift are rejected", () => {
  expectInvalid("missing", mutate(value => value.cases.pop()), "canonical exact case count");
  expectInvalid("reordered", mutate(value => value.cases.reverse()), "canonical ordered case IDs");
  expectInvalid("unsupported", mutate(value => { value.cases[0].disposition = "unsupported"; }), "unsupported disposition");
  expectInvalid("api-screen", mutate(value => { value.cases[0].screenRoute = "/ops/api/audit"; }), "raw API screen route");
  expectInvalid("role-drift", mutate(value => { value.cases[0].accountRole = "admin"; }), "accountRole drift");
  expectInvalid("viewport-drift", mutate(value => { value.cases[0].viewport.width = 1180; }), "viewport drift");
  expectInvalid("oracle-drift", mutate(value => { value.cases[0].oracle.expectedBehaviorSha256 = "0".repeat(64); }), "oracle digest drift");
});

const result = runChecks();
console.log("");
console.log("== v3.9.0 exact native UI case contract summary ==");
console.log("- canonicalExactCases: 424");
console.log("- positiveNative: 423");
console.log("- negativeRoute: 1");
console.log("- unsupported: 0");
console.log(`- pass: ${result.pass}`);
console.log(`- fail: ${result.fail}`);
console.log("- actualBrowserExecution: not-run-by-this-contract");
if (result.fail > 0) process.exit(1);

function mutate(fn) {
  const value = structuredClone(manifest);
  fn(value);
  return value;
}

function expectInvalid(label, value, expectedMessage) {
  let failed = false;
  try {
    validateNativeExactManifest({ manifest: value, canonical, implementation });
  } catch (error) {
    failed = true;
    assert(String(error.message).includes(expectedMessage), `${label} missing error ${expectedMessage}: ${error.message}`);
  }
  assert(failed, `${label} must fail`);
}

function check(name, fn) {
  checks.push({ name, fn });
}

function runChecks() {
  let pass = 0;
  let fail = 0;
  for (const item of checks) {
    try {
      item.fn();
      pass += 1;
      console.log(`[pass] ${item.name}`);
    } catch (error) {
      fail += 1;
      console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { pass, fail };
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
