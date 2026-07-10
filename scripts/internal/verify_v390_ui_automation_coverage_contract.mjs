#!/usr/bin/env node
// 파일 용도: v3.9.0 전 기능 UI 자동화 매트릭스의 exact test ID와 prefix-free 계약을 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {
  generateImplementationManifest,
  parseFeatureRows,
} from "./feature_implementation_manifest_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 full-feature UI automation coverage matrix contract

Usage:
  ./server.sh verify-v390-ui-automation-coverage-contract

Checks:
  - 978-feature inventory에서 prefix/range가 아닌 exact manualUiCaseId 424개 선택
  - featureId/testId/route/control-action anchor/stability verifier exact 연결
  - UI-108~UI-115 automation featureId→caseId actual artifact/log 연결
  - cross-prefix 누락·중복·route/action drift와 artifact 누락 negative fixture
  - full automation/UI fulltest 거짓 PASS 금지와 durable evidence wiring
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-ui-automation-coverage";
const contractCommand = "verify-v390-ui-automation-coverage-contract";
const runnerScript = "verify_v390_ui_automation_coverage.mjs";
const contractScript = "verify_v390_ui_automation_coverage_contract.mjs";
const policyPath = path.join(rootDir, "test/fixtures/v390_ui_automation_coverage_policy.json");
const implementationPath = path.join(rootDir, "test/fixtures/project_feature_implementation_evidence.json");
const caseManifestPath = path.join(rootDir, "test/fixtures/v390_ui_automation_cases.json");
const durableMatrixPath = path.join(rootDir, "docs/v390-ui-automation-coverage-matrix.md");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "media_server_v390_ui_coverage_contract_"));
const checks = [];

process.on("exit", () => fs.rmSync(tempRoot, { recursive: true, force: true }));

check("server, script inventory, policy, and durable matrix expose the exact-ID commands", () => {
  for (const filePath of [
    path.join(rootDir, "scripts/internal", runnerScript),
    path.join(rootDir, "scripts/internal", contractScript),
    policyPath,
    durableMatrixPath,
  ]) {
    assert(fs.existsSync(filePath), `missing V390-ADD1-11 file: ${repoRelative(filePath)}`);
  }
  const serverSh = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  for (const snippet of [command, contractCommand, runnerScript, contractScript]) {
    assertIncludes(`${serverSh}\n${scriptInventory}`, snippet, "V390-ADD1-11 dispatch/inventory");
  }
});

check("positive matrix covers the exact 424 manual UI test IDs from all feature families", () => {
  const summary = readPositiveSummary();
  const implementation = readJson(implementationPath);
  const expectedTestIds = implementation.items
    .filter(item => item.manualUiCaseId !== null)
    .map(item => item.manualUiCaseId);
  assert(summary.schema === "media-server.v390-ui-automation-coverage.v2", "coverage schema mismatch");
  assert(summary.matrixValidationResult === "PASS", "matrix validation must PASS");
  assert(summary.coverageStatus === "mapped-with-explicit-gaps", "coverage status mismatch");
  assert(summary.executionEvidenceStatus === "partial-automation-evidence", "execution evidence boundary mismatch");
  assert(summary.fullAutomationCoverage === false, "matrix must not claim full automation coverage");
  assert(summary.manualUiFulltestEvidence === false, "matrix must not claim manual UI fulltest evidence");
  assert(summary.counts.inventoryFeatures === 978, "inventory feature count must be 978");
  assert(summary.counts.exactUiTestIds === 424, "exact UI test ID count must be 424");
  assert(summary.counts.automated === 8, "automated count must be 8");
  assert(summary.counts.unsupportedManual === 415, "unsupported/manual count must be 415");
  assert(summary.counts.excludedPositiveUi === 1, "positive UI exclusion count must be 1");
  assertExact(summary.rows.map(item => item.testId), expectedTestIds,
    "matrix must preserve the exact ordered manualUiCaseId set");
  assert(new Set(summary.rows.map(item => item.testId)).size === 424,
    "matrix exact UI test IDs must be unique");
});

check("cross-prefix rows preserve exact test ID, route, control/action anchor, and verifier mapping", () => {
  const summary = readPositiveSummary();
  const implementation = readJson(implementationPath);
  const implementationById = new Map(implementation.items.map(item => [item.id, item]));
  for (const featureId of [
    "UI-001", "AUTH-004", "SRC-001", "RULE-001",
    "EVT-001", "CLIENT-001", "MEDIA-016", "SAFE-015",
  ]) {
    const row = summary.rows.find(item => item.featureId === featureId);
    const source = implementationById.get(featureId);
    assert(row, `${featureId} cross-prefix matrix row missing`);
    assert(row.testId === source.manualUiCaseId, `${featureId} exact manual test ID mismatch`);
    assert(row.route === source.uiEvidence.screenRoute, `${featureId} exact route mismatch`);
    assert(row.controlActionAnchor === source.uiEvidence.anchor, `${featureId} control/action anchor mismatch`);
    assert(row.stabilityVerifier.command === source.verifierEvidence.command,
      `${featureId} stability verifier command mismatch`);
    assert(row.stabilityVerifier.assertionAnchor === source.verifierEvidence.anchor,
      `${featureId} stability verifier assertion mismatch`);
  }
});

check("coverage selection contains no UI-prefix or numeric-range classification", () => {
  const runner = readText(`scripts/internal/${runnerScript}`);
  const policy = readText("test/fixtures/v390_ui_automation_coverage_policy.json");
  const implementationManifestLib = readText("scripts/internal/feature_implementation_manifest_lib.mjs");
  for (const forbidden of [
    "expectedUiIdRange", "unsupportedManual\": {\n      \"range", "expandRange(", "parseUiId(",
    "^\\| UI-", "inventoryUiIds", "function uiScreenRoute(", "if (prefix === \"AUTH\")",
  ]) {
    assert(!`${runner}\n${policy}\n${implementationManifestLib}`.includes(forbidden),
      `prefix/range coverage logic remains: ${forbidden}`);
  }
  for (const required of [
    "reviewedById.get(row.id)",
    "structuredClone(reviewedItem?.uiEvidence)",
    "structuredClone(reviewedItem?.verifierEvidence)",
    "has no reviewed exact UI screenRoute mapping",
  ]) {
    assertIncludes(implementationManifestLib, required, "reviewed exact UI mapping generator");
  }
});

check("explicit manifest refresh preserves all reviewed exact UI mappings", () => {
  const inventoryText = readText("docs/project-feature-test-inventory.md");
  const current = readJson(implementationPath);
  const generated = generateImplementationManifest({
    rootDir,
    inventoryText,
    rows: parseFeatureRows(inventoryText),
  });
  const generatedById = new Map(generated.items.map(item => [item.id, item]));
  for (const item of current.items.filter(entry => entry.manualUiCaseId !== null)) {
    const refreshed = generatedById.get(item.id);
    assert(refreshed?.manualUiCaseId === item.manualUiCaseId,
      `${item.id} refresh exact test ID drift`);
    assert(JSON.stringify(refreshed?.uiEvidence) === JSON.stringify(item.uiEvidence),
      `${item.id} refresh route/control-action mapping drift`);
    assert(JSON.stringify(refreshed?.verifierEvidence) === JSON.stringify(item.verifierEvidence),
      `${item.id} refresh exact verifier mapping drift`);
  }
});

check("automated rows map exact featureId to caseId and preserve every artifact/log", () => {
  const summary = readPositiveSummary();
  const manifest = readJson(caseManifestPath);
  const manifestByFeature = new Map(manifest.cases.map(item => [item.featureId, item]));
  const automated = summary.rows.filter(item => item.automationDisposition === "automated");
  assertExact(automated.map(item => item.automationCaseId), manifest.cases.map(item => item.caseId),
    "automated exact case IDs");
  for (const item of automated) {
    const source = manifestByFeature.get(item.featureId);
    assert(source, `${item.featureId} automation feature mapping missing`);
    assert(item.testId === source.featureId, `${item.featureId} manual test ID/feature mapping mismatch`);
    assert(item.automationCaseId === source.caseId, `${item.featureId} automation case ID mismatch`);
    assert(item.route === source.route, `${item.featureId} automated route mismatch`);
    assert(item.controlAction === source.controlAction, `${item.featureId} automated action mismatch`);
    assert(item.automationStatus === "PASS", `${item.featureId} automationStatus must PASS`);
    assert(item.actualResult === "control action executed and expected UI state captured",
      `${item.featureId} actualResult must preserve the executed UI result`);
    for (const key of ["screenshot", "trace", "browserConsole", "serverLog"]) {
      assert(item.evidence?.[key], `${item.featureId} ${key} evidence missing`);
      assert(fs.existsSync(path.join(rootDir, item.evidence[key])), `${item.featureId} ${key} file missing`);
    }
    assert(!item.evidence?.video, `${item.featureId} placeholder video evidence must not be required`);
  }
});

check("unsupported/manual and excluded exact test IDs remain explicit non-PASS work", () => {
  const summary = readPositiveSummary();
  const manual = summary.rows.filter(item => item.automationDisposition === "unsupported-manual");
  assert(manual.length === 415, "unsupported/manual row count mismatch");
  for (const item of manual) {
    assert(item.testId, `${item.featureId} unsupported row exact test ID missing`);
    assert(item.automationCaseId === null, `${item.featureId} unsupported row must not invent automation case ID`);
    assert(item.automationStatus === "not-run", `${item.featureId} unsupported status must be not-run`);
    assert(item.actualResult === "not-run", `${item.featureId} unsupported row must be not-run`);
    assert(item.unsupportedReasonCode === "no-current-native-exact-selector-case",
      `${item.featureId} reason code mismatch`);
    assert(item.unsupportedReason, `${item.featureId} unsupported reason missing`);
    assert(Object.values(item.evidence || {}).every(value => value === ""),
      `${item.featureId} must not carry fake artifacts`);
  }
  const excluded = summary.rows.find(item => item.testId === "UI-018");
  assert(excluded?.automationDisposition === "excluded-positive-ui", "UI-018 exclusion disposition mismatch");
  assert(excluded?.automationStatus === "not-applicable", "UI-018 automation status mismatch");
  assert(excluded?.actualResult === "not-applicable", "UI-018 actual result mismatch");
  assert(excluded?.unsupportedReasonCode === "product-ui-absence-negative-check", "UI-018 reason code mismatch");
});

check("missing cross-prefix exact test ID is rejected", () => {
  const evidence = readJson(implementationPath);
  evidence.items.find(item => item.id === "AUTH-004").manualUiCaseId = null;
  const run = runWithEvidence("missing-cross-prefix-test-id", evidence, true);
  assert(run.status === "failed-as-expected", "missing exact test ID fixture must fail");
  assertIncludes(`${run.stdout}\n${run.stderr}`, "AUTH-004 manualUiCaseId missing",
    "missing exact test ID failure");
});

check("duplicate cross-prefix exact test ID is rejected", () => {
  const evidence = readJson(implementationPath);
  evidence.items.find(item => item.id === "AUTH-005").manualUiCaseId = "AUTH-004";
  const run = runWithEvidence("duplicate-cross-prefix-test-id", evidence, true);
  assert(run.status === "failed-as-expected", "duplicate exact test ID fixture must fail");
  assertIncludes(`${run.stdout}\n${run.stderr}`, "duplicate exact manual UI test IDs: AUTH-004",
    "duplicate exact test ID failure");
});

check("cross-prefix route and control/action drift are rejected", () => {
  const routeEvidence = readJson(implementationPath);
  routeEvidence.items.find(item => item.id === "AUTH-004").uiEvidence.screenRoute = "/missing-auth-screen";
  const routeRun = runWithEvidence("cross-prefix-route-drift", routeEvidence, true);
  assert(routeRun.status === "failed-as-expected", "cross-prefix route drift fixture must fail");
  assertIncludes(`${routeRun.stdout}\n${routeRun.stderr}`, "AUTH-004 route/action source mapping invalid",
    "cross-prefix route drift failure");

  const actionEvidence = readJson(implementationPath);
  actionEvidence.items.find(item => item.id === "AUTH-004").uiEvidence.anchor = "__missing_auth_control_action__";
  const actionRun = runWithEvidence("cross-prefix-action-drift", actionEvidence, true);
  assert(actionRun.status === "failed-as-expected", "cross-prefix action drift fixture must fail");
  assertIncludes(`${actionRun.stdout}\n${actionRun.stderr}`, "AUTH-004 route/action source mapping invalid",
    "cross-prefix action drift failure");
});

check("automation feature mapping drift and missing artifact are rejected", () => {
  const manifest = readJson(caseManifestPath);
  manifest.cases.find(item => item.caseId === "UI-113").featureId = "AUTH-004";
  const modifiedManifest = path.join(tempRoot, "feature-mapping-drift-cases.json");
  writeJson(modifiedManifest, manifest);
  const policy = readJson(policyPath);
  policy.automationCaseManifestSource = modifiedManifest;
  const modifiedPolicy = path.join(tempRoot, "feature-mapping-drift-policy.json");
  writeJson(modifiedPolicy, policy);
  const mappingRun = runCoverage("feature-mapping-drift", ["--policy", modifiedPolicy], true);
  assert(mappingRun.status === "failed-as-expected", "automation feature mapping drift must fail");
  assertIncludes(`${mappingRun.stdout}\n${mappingRun.stderr}`, "UI-113 featureId mismatch",
    "automation feature mapping drift failure");

  const actual = readJson(path.join(rootDir,
    "docs/release-artifacts/v3.9.0/ui-automation-visible-dom-final/summary.json"));
  actual.cases.find(item => item.caseId === "UI-108").screenshotPath = path.join(tempRoot, "missing-ui-108.png");
  const modifiedSummary = path.join(tempRoot, "missing-artifact-summary.json");
  writeJson(modifiedSummary, actual);
  const artifactRun = runCoverage("missing-artifact", ["--automation-summary", modifiedSummary], true);
  assert(artifactRun.status === "failed-as-expected", "missing artifact fixture must fail");
  assertIncludes(`${artifactRun.stdout}\n${artifactRun.stderr}`, "UI-108 screenshotPath does not exist",
    "missing artifact failure");
});

check("durable matrix and release docs record exact-ID partial coverage boundaries", () => {
  const matrix = fs.readFileSync(durableMatrixPath, "utf8");
  const matrixTestIds = matrix.split(/\r?\n/)
    .map(line => line.match(/^\| ([A-Z]+-\d{3}) \|/)?.[1])
    .filter(Boolean);
  const implementation = readJson(implementationPath);
  const expected = implementation.items.filter(item => item.manualUiCaseId !== null)
    .map(item => item.manualUiCaseId);
  assertExact(matrixTestIds, expected, "durable matrix exact test ID set");
  for (const snippet of [
    "inventory features `978`",
    "exact UI test IDs `424`",
    "automated `8`",
    "unsupported-manual `415`",
    "excluded-positive-ui `1`",
    "fullAutomationCoverage: `false`",
    "manualUiFulltestEvidence: `false`",
  ]) {
    assertIncludes(matrix, snippet, "durable matrix boundary");
  }
  const docs = [
    "docs/development-backlog.md",
    "docs/stream-verification.md",
    "docs/project-feature-test-inventory.md",
    "docs/release-test-records.md",
    "docs/release-evidence-index.md",
  ].map(readText).join("\n");
  for (const snippet of ["V390-ADD1-11", command, contractCommand,
    "exact UI test ID 424", "prefix/range 판정 제거", "mapped-with-explicit-gaps"]) {
    assertIncludes(docs, snippet, "V390-ADD1-11 docs/evidence");
  }
});

const result = summarizeChecks();
console.log("");
console.log("== v3.9.0 full-feature UI automation coverage matrix contract summary ==");
console.log("- schema: media-server.v390-ui-automation-coverage.v2");
console.log("- inventoryFeatures: 978");
console.log("- exactUiTestIds: 424");
console.log("- automated: 8");
console.log("- unsupportedManual: 415");
console.log("- excludedPositiveUi: 1");
console.log("- prefixRangeClassification: removed");
console.log(`- pass: ${result.pass}`);
console.log(`- fail: ${result.fail}`);
if (result.fail > 0) process.exit(1);

function check(name, fn) {
  try {
    fn();
    checks.push({ name, status: "pass" });
    console.log(`[pass] ${name}`);
  } catch (error) {
    checks.push({ name, status: "fail", reason: error instanceof Error ? error.message : String(error) });
    console.error(`[fail] ${name}: ${checks.at(-1).reason}`);
  }
}

function summarizeChecks() {
  return {
    pass: checks.filter(item => item.status === "pass").length,
    fail: checks.filter(item => item.status === "fail").length,
  };
}

function runWithEvidence(label, evidence, expectFailure) {
  const evidencePath = path.join(tempRoot, `${label}-evidence.json`);
  writeJson(evidencePath, evidence);
  const policy = readJson(policyPath);
  policy.implementationEvidenceSource = evidencePath;
  const modifiedPolicy = path.join(tempRoot, `${label}-policy.json`);
  writeJson(modifiedPolicy, policy);
  return runCoverage(label, ["--policy", modifiedPolicy], expectFailure);
}

function runCoverage(label, extraArgs = [], expectFailure = false) {
  const outputDir = path.join(tempRoot, label);
  fs.rmSync(outputDir, { recursive: true, force: true });
  const args = [command, "--output-dir", outputDir, ...extraArgs];
  try {
    const stdout = execFileSync(path.join(rootDir, "server.sh"), args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      status: expectFailure ? "passed-unexpectedly" : "passed",
      stdout,
      stderr: "",
      summaryPath: path.join(outputDir, "summary.json"),
      reportPath: path.join(outputDir, "report.md"),
    };
  } catch (error) {
    return {
      status: expectFailure ? "failed-as-expected" : "failed-unexpectedly",
      stdout: error?.stdout ? String(error.stdout) : "",
      stderr: error?.stderr ? String(error.stderr) : String(error),
      summaryPath: path.join(outputDir, "summary.json"),
      reportPath: path.join(outputDir, "report.md"),
    };
  }
}

function readPositiveSummary() {
  const run = runCoverage(`positive-${Math.random().toString(16).slice(2)}`);
  assert(run.status === "passed", `positive matrix failed: ${run.stderr || run.stdout}`);
  return readJson(run.summaryPath);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function repoRelative(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join("/");
}

function assertExact(actual, expected, label) {
  assert(JSON.stringify(actual) === JSON.stringify(expected),
    `${label} mismatch: expected=${expected.join(",")} actual=${actual.join(",")}`);
}

function assertIncludes(value, expected, label) {
  assert(String(value).includes(expected), `${label} missing: ${expected}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
