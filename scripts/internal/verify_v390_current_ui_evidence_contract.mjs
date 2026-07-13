#!/usr/bin/env node
// 파일 용도: current UI evidence가 stale placeholder/historical summary를 PASS 입력으로 재사용하지 않는지 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
if (hasHelpFlag(args)) {
  printUsageAndExit(`v3.9.0 current UI evidence hygiene contract

Usage:
  ./server.sh verify-v390-current-ui-evidence-contract

Checks current not-run binding, exact 423+1 native readiness, unsupported 0,
historical audit-only roots, and active consumer stale-path denial. This command does not run UI.
`);
}
assertKnownOptions(args, ["h", "help"]);

const checks = [];
check("current state is explicit not-run and not PASS", () => {
  const state = readJson("test/fixtures/v390_ui_current_evidence_state.json");
  assert(state.schema === "media-server.v390-ui-current-evidence-state.v2", "current state schema mismatch");
  assert(state.sourceKind === "current-not-run-state", "current state source kind mismatch");
  assert(state.status === "not-run", "current state must be not-run");
  assert(state.actualBrowserExecution === false && state.uiFulltestPass === false,
    "current state claims execution/PASS");
  assert(state.readiness?.nativeExecutablePositive === 423 && state.readiness?.negativeRouteExecutable === 1 &&
    state.readiness?.unsupported === 0, "current exact readiness mismatch");
  assert(state.readiness?.canonicalRequestedObservedSchemaComplete === true,
    "REVIEW4-57 requested/observed schema closure missing");
  assert(state.readiness?.primaryActionCompletionOracleComplete === true,
    "REVIEW4-58 primary action completion oracle closure missing");
  assert(state.readiness?.visualMatrixComplete === true,
    "REVIEW4-59 visual matrix closure missing");
  assert(state.automatedCaseCount === 0, "current not-run state invented automated cases");
  const bindingErrors = currentManifestBindingErrors(state);
  assert(bindingErrors.length === 0, bindingErrors.join("; "));
  assert(state.execution?.pass === 0 && state.execution?.notRun === 424 && state.execution?.unsupported === 0,
    "current execution state mismatch");
});

check("current state rejects stale canonical and native manifest hashes", () => {
  const state = readJson("test/fixtures/v390_ui_current_evidence_state.json");
  const staleCanonical = structuredClone(state);
  staleCanonical.canonicalCaseManifest.sha256 = "0".repeat(64);
  assert(currentManifestBindingErrors(staleCanonical).includes("current canonical case manifest hash mismatch"),
    "stale canonical hash passed");
  const staleNative = structuredClone(state);
  staleNative.nativeExactManifest.sha256 = "0".repeat(64);
  assert(currentManifestBindingErrors(staleNative).includes("current native exact manifest hash mismatch"),
    "stale native hash passed");
});

check("all stale roots are historical-invalid and never current eligible", () => {
  const manifest = readJson("docs/release-artifacts/v3.9.0/historical-invalid-ui-evidence.json");
  assert(manifest.schema === "media-server.v390-historical-invalid-ui-evidence.v2", "historical manifest schema mismatch");
  assert(manifest.sourceKind === "audit-only-historical", "historical source kind mismatch");
  assert(manifest.consumerPolicy === "deny-current-evidence", "historical consumer policy mismatch");
  assert(manifest.eligibleForCurrentCoverage === false, "historical manifest became current eligible");
  const expected = [
    "ui-automation-playwright-final", "ui-automation-case-completeness-final",
    "ui-automation-native-final", "ui-automation-visible-dom-final",
    "test-acceptance-post-ui-final", "test-acceptance-final",
  ];
  for (const suffix of expected) {
    const item = manifest.roots.find(entry => entry.path.endsWith(suffix));
    assert(item?.status === "historical-invalid", `historical-invalid root missing: ${suffix}`);
    assert(fs.existsSync(path.join(rootDir, item.path)), `historical root missing: ${item.path}`);
  }
  assert(manifest.cleanup?.historicalSummariesRewritten === false,
    "historical summaries must remain immutable");
});

check("tracked fixture video placeholders are absent", () => {
  const tracked = execFileSync("git", ["ls-files", "*.video.txt"], { cwd: rootDir, encoding: "utf8" })
    .split(/\r?\n/).filter(Boolean).filter(relative => fs.existsSync(path.join(rootDir, relative)));
  assert(tracked.length === 0, `tracked placeholder video remains: ${tracked.join(", ")}`);
});

check("active consumers use current state instead of stale summary", () => {
  const stale = "docs/release-artifacts/v3.9.0/ui-automation-visible-dom-final/summary.json";
  const consumers = [
    "test/fixtures/v390_ui_automation_coverage_policy.json",
    "scripts/internal/verify_ui_fulltest_evidence_policy_v4.mjs",
    "scripts/internal/verify_v390_test_acceptance_bundle.mjs",
    "scripts/internal/verify_v390_ui_native_adapter_contract.mjs",
  ];
  for (const file of consumers) {
    assert(!read(file).includes(stale), `${file} still binds stale summary`);
    assert(read(file).includes("v390_ui_current_evidence_state.json"), `${file} missing current state binding`);
  }
});

check("Policy v4 consumer marks historical roots audit-only and ineligible", () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-v390-historical-policy-"));
  try {
    execFileSync(path.join(rootDir, "server.sh"), [
      "verify-ui-fulltest-evidence-policy-v4",
      "--summary", "docs/release-artifacts/v3.9.0/ui-automation-visible-dom-final/summary.json",
      "--output-dir", output,
    ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const evaluation = JSON.parse(fs.readFileSync(path.join(output, "evaluation.json"), "utf8"));
    assert(evaluation.currentEvidenceStatus === "audit-only-historical-denied",
      "Policy qualifier did not deny historical source");
    assert(evaluation.uiFulltestPass === false &&
      evaluation.qualification?.reasons?.includes("audit-only-historical-source-denied"),
    "historical Policy source became UI PASS");
  } finally {
    fs.rmSync(output, { recursive: true, force: true });
  }
});

check("durable matrix separates exact native readiness from current execution", () => {
  const matrix = read("docs/v390-ui-automation-coverage-matrix.md");
  for (const snippet of [
    "currentEvidenceStatus: `not-run`", "native-executable-positive `423`",
    "negative-route-executable `1`", "unsupported `0`", "executed-pass `0`", "not-run `424`",
    "review4-60-pending",
    "primaryActionCompletionOracleComplete: `true`",
    "visualMatrixComplete: `true`",
  ]) assert(matrix.includes(snippet), `durable matrix missing: ${snippet}`);
  assert(!matrix.includes("ui-automation-visible-dom-final/summary.json"), "durable matrix retains stale source");
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try { item.fn(); pass += 1; console.log(`[pass] ${item.name}`); }
  catch (error) { fail += 1; console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`); }
}
console.log("\n== v3.9.0 current UI evidence hygiene summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log("- actualBrowserExecution: not-run-by-this-contract");
if (fail > 0) process.exit(1);

function read(relative) { return fs.readFileSync(path.join(rootDir, relative), "utf8"); }
function readJson(relative) { return JSON.parse(read(relative)); }
function sha256File(filePath) { return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex"); }
function currentManifestBindingErrors(state) {
  const bindings = [
    ["canonicalCaseManifest", "test/fixtures/ui_fulltest_case_manifest_policy_v4.json", "canonical case manifest"],
    ["nativeExactManifest", "test/fixtures/v390_ui_native_exact_cases.json", "native exact manifest"],
    ["visualMatrixPlan", "test/fixtures/v390_ui_visual_matrix_plan.json", "visual matrix plan"],
  ];
  const errors = [];
  for (const [field, expectedPath, label] of bindings) {
    const binding = state?.[field];
    if (binding?.path !== expectedPath) {
      errors.push(`current ${label} path mismatch`);
      continue;
    }
    const absolutePath = path.join(rootDir, binding.path);
    if (!fs.existsSync(absolutePath)) errors.push(`current ${label} missing`);
    else if (sha256File(absolutePath) !== binding.sha256) errors.push(`current ${label} hash mismatch`);
  }
  return errors;
}
function check(name, fn) { checks.push({ name, fn }); }
function assert(condition, message) { if (!condition) throw new Error(message); }
