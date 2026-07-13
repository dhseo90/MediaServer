#!/usr/bin/env node
// 파일 용도: v3.8.0 Step 16 안정화/release readiness 기록과 미실행 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.8.0 Step 16 stabilization and release readiness verification

Usage:
  ./server.sh verify-v380-stabilization-release-readiness

Checks:
  - v3.8.0 Step 16 roadmap, stream verification, feature inventory, release policy, evidence index, and release records are wired
  - local stabilization companion gates are documented without claiming UI fulltest, 30m/120m longrun, published metadata, field smoke, or release actions
  - server.sh and inventory verifiers expose the Step 16 readiness command
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const commandName = "verify-v380-stabilization-release-readiness";
const command = `./server.sh ${commandName}`;
const schema = "media-server.v380-stabilization-release-readiness.v1";
const companionCommands = [
  command,
  "./server.sh build",
  "./server.sh verify-v380-entry-baseline",
  "./server.sh verify-v380-ops-action-route-boundary",
  "./server.sh verify-v380-action-capability-contract",
  "./server.sh verify-v380-action-request-ledger-contract",
  "./server.sh verify-v380-approval-decision-gate",
  "./server.sh verify-v380-action-readiness-preflight",
  "./server.sh verify-v380-source-recheck-action-pilot",
  "./server.sh verify-v380-client-notice-draft-queue",
  "./server.sh verify-v380-rule-draft-action-package",
  "./server.sh verify-v380-ops-action-control-workspace-ui",
  "./server.sh verify-v380-client-safe-action-notice-preview",
  "./server.sh verify-v380-outcome-observer-reconciliation",
  "./server.sh verify-v380-action-receipt-bundle",
  "./server.sh verify-v380-field-connector-evidence-package",
  "./server.sh verify-v380-default-off-action-explanation",
  "./server.sh verify-release-metadata",
  "./server.sh verify-docs-links",
  "./server.sh verify-docs-ui-assets",
  "./server.sh verify-project-inventory",
  "./server.sh verify-feature-inventory-coverage",
  "./server.sh verify-release-evidence-index",
  "./server.sh verify-release-closeout-helper --dry-run",
  "./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run",
  "./server.sh verify-script-inventory",
  "git diff --check",
];

const files = {
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidenceIndex: readText("docs/release-evidence-index.md"),
  releasePolicy: readText("docs/release-policy.md"),
  coverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  serverSh: readText("server.sh"),
};
const normalizedRecords = normalizeWhitespace(files.releaseRecords);
const checks = [];

check("roadmap and stream verification expose v3.8 Step 16 stabilization readiness", () => {
  for (const snippet of [
    "| 16 | v3.8.0 (16) Stabilization and Release Readiness | P0 | 완료 |",
    "v3.8 local stabilization, release evidence/not-run 경계",
    "`./server.sh verify-v380-stabilization-release-readiness`",
    "## v3.8.0 Step 16 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.8 Step 16");
  }
  for (const snippet of [
    "| v3.8.0 (16) | `./server.sh verify-v380-stabilization-release-readiness` |",
    "v3.8.0 local stabilization and release readiness",
    "UI 풀테스트 직접 조작, 30분/120분, published metadata, release action evidence를 대체하지 않음",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.8 Step 16");
  }
});

check("feature inventory maps v3.8 Step 16 to SAFE-195 and OPS-162", () => {
  for (const snippet of [
    "v3.8.0 (16) Stabilization and Release Readiness | `SAFE-195`, `OPS-162` | `verify-v380-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run`",
    "SAFE-195 | V380 Step 16 stabilization/release readiness boundary",
    "OPS-162 | V380 Step 16 Stabilization and Release Readiness 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.8 Step 16");
  }
  assertIncludes(files.coverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.projectInventoryVerifier, '"SAFE-195"', "project inventory verifier SAFE-195");
  assertIncludes(files.projectInventoryVerifier, '"OPS-162"', "project inventory verifier OPS-162");
});

check("release policy, evidence index, and records list v3.8 companion local gates", () => {
  for (const item of companionCommands) {
    assertIncludes(files.backlog, item, `backlog command ${item}`);
    assertIncludes(files.releasePolicy, item, `release policy command ${item}`);
    assertIncludes(files.releaseEvidenceIndex, item, `release evidence index command ${item}`);
    assertIncludes(files.releaseRecords, item, `release records command ${item}`);
  }
  for (const snippet of [
    "## v3.8.0 stabilization and release readiness",
    schema,
    "v3.8.0 Step 16 local readiness gate",
    "`verify-release-metadata --published` 미실행",
  ]) {
    assertIncludes(files.releasePolicy, snippet, "release policy v3.8 Step 16");
  }
  for (const snippet of [
    "## v3.8.0 Step 16 local readiness gate records",
    schema,
    "v3.8.0 Step 16 stabilization/release readiness",
    "UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence를 대체하지 않습니다",
  ]) {
    assertIncludes(files.releaseEvidenceIndex, snippet, "release evidence index v3.8 Step 16");
  }
});

check("release records include v3.8 Step 16 RED and not-run boundaries", () => {
  for (const snippet of [
    "V380 Stabilization and Release Readiness",
    "최초 `./server.sh verify-v380-stabilization-release-readiness`는",
    "v380 Step 16 RED stabilization/release readiness gate",
    "v380 Step 16 stabilization/release readiness final",
    "v380 Step 16 local stabilization gates",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing Step 16 result: ${snippet}`);
  }
  for (const snippet of [
    "v380 Step 16 UI 풀테스트",
    "v380 Step 16 30분/120분 longrun",
    "v380 Step 16 published metadata",
    "v380 Step 16 PR/main/tag/GitHub Release",
    "v380 Step 16 field smoke",
    "Step 16 local readiness PASS로 대체하지 않음",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing Step 16 not-run boundary: ${snippet}`);
  }
});

check("server and script inventory expose v3.8 Step 16 readiness command", () => {
  for (const snippet of [
    commandName,
    "verify_v380_stabilization_release_readiness.mjs",
  ]) {
    assertIncludes(files.serverSh, snippet, "server.sh v3.8 Step 16 dispatch");
  }
  for (const snippet of [
    "server.sh dispatch targets exist and are executable",
    "tracked scripts are classified and referenced",
    "documented server.sh commands resolve to dispatch table",
    "verify_v380_stabilization_release_readiness.mjs",
  ]) {
    assertIncludes(files.scriptInventory, snippet, "script inventory Step 16 coverage");
  }
});

check("Step 16 gate keeps release actions and long UI/soak evidence separate", () => {
  for (const [name, text] of [
    ["backlog", files.backlog],
    ["stream verification", files.streamVerification],
    ["feature inventory", files.featureInventory],
    ["release records", files.releaseRecords],
    ["release policy", files.releasePolicy],
    ["release evidence index", files.releaseEvidenceIndex],
  ]) {
    for (const snippet of [
      "UI 풀테스트 직접 조작",
      "30분/120분",
      "published metadata",
      "PR/main/tag/GitHub Release",
    ]) {
      assertIncludes(text, snippet, `${name} Step 16 boundary`);
    }
  }
});

check("SAFE-195 canonical readiness non-substitution boundary", () => {
  const releaseActionExecuted = !files.releaseRecords.includes("v380 Step 16 PR/main/tag/GitHub Release") || !files.releaseRecords.includes("미실행");
  const uiFulltestExecuted = !files.releaseRecords.includes("v380 Step 16 UI 풀테스트") || !files.releaseRecords.includes("미실행");
  const longrunExecuted = !files.releaseRecords.includes("v380 Step 16 30분/120분 longrun") || !files.releaseRecords.includes("미실행");
  const fieldSmokeExecuted = !files.releaseRecords.includes("v380 Step 16 field smoke") || !files.releaseRecords.includes("미실행");
  const safe195BoundaryObserved = companionCommands.includes(command) && files.releaseRecords.includes("v380 Step 16 stabilization/release readiness final");
  assert(safe195BoundaryObserved && releaseActionExecuted === false && uiFulltestExecuted === false && longrunExecuted === false && fieldSmokeExecuted === false,
    "SAFE-195 releaseActionExecuted UI longrun field smoke must remain independently not-run");
});

check("OPS-162 canonical local readiness gate", () => {
  const localCommandsWired = companionCommands.every((item) =>
    files.releasePolicy.includes(item) && files.releaseEvidenceIndex.includes(item) && files.releaseRecords.includes(item));
  const notRunBoundariesPresent = [
    "v380 Step 16 UI 풀테스트",
    "v380 Step 16 30분/120분 longrun",
    "v380 Step 16 PR/main/tag/GitHub Release",
    "v380 Step 16 field smoke",
  ].every((item) => files.releaseRecords.includes(item));
  const ops162GateObserved = localCommandsWired && notRunBoundariesPresent &&
    files.serverSh.includes("verify-v380-stabilization-release-readiness)");
  assert(ops162GateObserved,
    "OPS-162 local command wiring and explicit UI/long-run/release-action/field-smoke boundaries missing");
});

const results = runChecks();
console.log("");
console.log("== v3.8.0 stabilization/release readiness summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.8.0 (16)");
console.log("- scope: local stabilization gate wiring, release evidence records, not-run boundaries");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30m120m: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log("- releaseActions: not-run-by-this-command");
console.log("- fieldSmoke: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

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

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(text, snippet, context) {
  assert(text.includes(snippet), `${context} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ");
}
