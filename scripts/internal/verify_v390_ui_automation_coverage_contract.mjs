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
  - 986-feature inventory에서 prefix/range가 아닌 exact manualUiCaseId 424개 선택
  - featureId/testId/route/control-action anchor/stability verifier exact 연결
  - UI-108~UI-115 automation capability와 current not-run evidence 분리
  - cross-prefix 누락·중복·route/action drift와 historical stale summary negative fixture
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
const caseManifestPath = path.join(rootDir, "test/fixtures/v390_ui_native_exact_cases.json");
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
  assert(summary.schema === "media-server.v390-ui-automation-coverage.v4", "coverage schema mismatch");
  assert(summary.matrixValidationResult === "PASS", "source-ready matrix must validate");
  assert(summary.coverageStatus === "exact-native-ready-current-not-run", "coverage status mismatch");
  assert(summary.executionEvidenceStatus === "current-not-run", "execution evidence boundary mismatch");
  assert(summary.currentEvidenceStatus === "not-run", "current evidence status mismatch");
  assert(summary.exactNativeWorkflowReadinessComplete === true,
    "matrix must record exact native source readiness after REVIEW4-60");
  assert(summary.canonicalRequestedObservedSchemaComplete === true,
    "matrix must record REVIEW4-57 requested/observed schema closure");
  assert(summary.primaryActionCompletionOracleComplete === true,
    "matrix must record REVIEW4-58 action completion oracle closure");
  assert(summary.visualMatrixComplete === true,
    "matrix must record REVIEW4-59 visual matrix closure");
  assert(summary.policyQualifierIndependenceComplete === true,
    "matrix must record REVIEW4-60 Policy independence closure");
  assert(summary.actualAutomationExecutionComplete === false,
    "matrix must not claim current actual automation execution");
  assert(summary.manualUiFulltestEvidence === false, "matrix must not claim manual UI fulltest evidence");
  assert(summary.counts.inventoryFeatures === 986, "inventory feature count must be 986");
  assert(summary.counts.exactUiTestIds === 424, "exact UI test ID count must be 424");
  assert(summary.counts.nativeExecutablePositive === 423, "native executable positive count must be 423");
  assert(summary.counts.negativeRouteExecutable === 1, "negative route executable count must be 1");
  assert(summary.counts.unsupported === 0, "unsupported count must be 0");
  assert(summary.counts.pass === 0 && summary.counts.notRun === 424,
    "execution state must remain pass 0/not-run 424");
  assertExact(summary.rows.map(item => item.testId), expectedTestIds,
    "matrix must preserve the exact ordered manualUiCaseId set");
  assert(new Set(summary.rows.map(item => item.testId)).size === 424,
    "matrix exact UI test IDs must be unique");
});

check("cross-prefix rows preserve exact test ID, route, control/action anchor, and verifier mapping", () => {
  const summary = readPositiveSummary();
  const implementation = readJson(implementationPath);
  const implementationById = new Map(implementation.items.map(item => [item.id, item]));
  const clientEventsProjectionIds = new Set([
    "SRC-038", "CLIENT-023", "CLIENT-029", "CLIENT-031",
    "CLIENT-032", "CLIENT-040", "SAFE-110", "SAFE-119",
  ]);
  const requestedObservedProjectionIds = new Set(["UI-001", ...clientEventsProjectionIds]);
  for (const featureId of [
    "UI-001", "AUTH-004", "SRC-001", "RULE-001",
    "EVT-001", "CLIENT-001", "MEDIA-016", "SAFE-015", ...clientEventsProjectionIds,
  ]) {
    const row = summary.rows.find(item => item.featureId === featureId);
    const source = implementationById.get(featureId);
    const semantic = source.semanticEvidence;
    const expectedRoute = requestedObservedProjectionIds.has(featureId)
      ? source.uiEvidence.screenRoute
      : semantic.controlSelector?.screenRoute ||
        (semantic.route?.applicability === "http-or-product-route" ? semantic.route.value : source.uiEvidence.screenRoute);
    assert(row, `${featureId} cross-prefix matrix row missing`);
    assert(row.testId === source.manualUiCaseId, `${featureId} exact manual test ID mismatch`);
    assert(row.route === expectedRoute, `${featureId} exact route mismatch`);
    assert(row.controlActionAnchor === semantic.actionHandler.anchor, `${featureId} control/action anchor mismatch`);
    assert(row.stabilityVerifier.command === semantic.verifierAssertion.command,
      `${featureId} stability verifier command mismatch`);
    assert(row.stabilityVerifier.assertionAnchor === semantic.verifierAssertion.assertionAnchor,
      `${featureId} stability verifier assertion mismatch`);
    assert(row.stabilityVerifier.assertedSemanticDigest === source.review.semanticDigest,
      `${featureId} semantic verifier digest mismatch`);
    if (clientEventsProjectionIds.has(featureId)) {
      assert(semantic.route?.value === "/client/api/views/{id}/events",
        `${featureId} canonical requested API route drift`);
      assert(semantic.controlSelector?.screenRoute === "/client/api/views/{id}/events",
        `${featureId} canonical control projection route drift`);
      assert(source.uiEvidence.screenRoute === "/client/events" && row.route === "/client/events",
        `${featureId} observed product screen route drift`);
    }
    if (featureId === "UI-001") {
      assert(semantic.route?.value === "/" && semantic.controlSelector?.screenRoute === "/",
        "UI-001 canonical requested root route drift");
      assert(source.uiEvidence.screenRoute === "/login" && row.route === "/login",
        "UI-001 setup-complete anonymous observed login screen drift");
    }
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
    "structuredClone(reviewedItem)",
  ]) {
    assertIncludes(implementationManifestLib, required, "reviewed exact UI mapping generator");
  }
  assertIncludes(runner, "automationSummary.cases.map(item => item.testId)",
    "Policy v4 actual case identity binding");
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

check("exact native capability remains mapped without inventing current artifacts", () => {
  const summary = readPositiveSummary();
  const manifest = readJson(caseManifestPath);
  const native = summary.rows.filter(item => item.automationDisposition === "native-executable");
  assert(native.length === 423, "exact native positive readiness mismatch");
  assert(manifest.cases.length === 424, "native exact manifest must retain 424 explicit cases");
  for (const item of summary.rows) {
    assert(item.automationCaseId === item.testId, `${item.featureId} exact native case mapping missing`);
    assert(item.automationStatus === "not-run", `${item.featureId} invented execution status`);
    assert(Object.values(item.evidence || {}).every(value => value === ""),
      `${item.featureId} current not-run row carries invented artifact`);
  }
});

check("positive and negative classifications remain review-required and non-PASS", () => {
  const summary = readPositiveSummary();
  assert(summary.rows.every(item => item.automationStatus === "not-run" && item.actualResult === "not-run"),
    "readiness was promoted to execution PASS");
  assert(summary.rows.every(item => item.automationDisposition !== "unsupported"),
    "exact native manifest retains unsupported work");
  const negative = summary.rows.find(item => item.testId === "UI-018");
  assert(negative?.automationDisposition === "negative-route", "UI-018 negative route disposition mismatch");
  assert(negative?.automationCaseId === "UI-018", "UI-018 exact native workflow missing");
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

check("automation feature mapping drift and stale historical summary are rejected", () => {
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
  assertIncludes(`${mappingRun.stdout}\n${mappingRun.stderr}`, "duplicate automation feature IDs: AUTH-004",
    "automation feature mapping drift failure");

  const staleSummary = path.join(rootDir,
    "docs/release-artifacts/v3.9.0/ui-automation-visible-dom-final/summary.json");
  const staleRun = runCoverage("stale-historical-summary", ["--automation-summary", staleSummary], true);
  assert(staleRun.status === "failed-as-expected", "historical stale summary must fail");
  assertIncludes(`${staleRun.stdout}\n${staleRun.stderr}`, "audit-only historical UI summary cannot be current evidence",
    "stale summary failure");
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
    "inventory features `986`",
    "exact UI test IDs `424`",
    "currentEvidenceStatus: `not-run`",
    "native-executable-positive `423`",
    "negative-route-executable `1`",
    "unsupported `0`",
    "executed-pass `0`",
    "not-run `424`",
    "exactNativeWorkflowReadinessComplete: `true`",
    "canonicalRequestedObservedSchemaComplete: `true`",
    "primaryActionCompletionOracleComplete: `true`",
    "visualMatrixComplete: `true`",
    "policyQualifierIndependenceComplete: `true`",
    "actualAutomationExecutionComplete: `false`",
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
    "exact UI test ID 424", "prefix/range 판정 제거", "exact-native-ready-current-not-run"]) {
    assertIncludes(docs, snippet, "V390-ADD1-11 docs/evidence");
  }
});

const result = summarizeChecks();
console.log("");
console.log("== v3.9.0 full-feature UI automation coverage matrix contract summary ==");
console.log("- schema: media-server.v390-ui-automation-coverage.v4");
console.log("- inventoryFeatures: 986");
console.log("- exactUiTestIds: 424");
console.log("- nativeExecutablePositive: 423");
console.log("- negativeRouteExecutable: 1");
console.log("- unsupported: 0");
console.log("- executedPass: 0");
console.log("- notRun: 424");
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
