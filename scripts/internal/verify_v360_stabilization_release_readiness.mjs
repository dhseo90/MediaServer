#!/usr/bin/env node
// 파일 용도: v3.6.0 Step 14 안정화/release readiness 기록과 미실행 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.6.0 Step 14 stabilization and release readiness verification

Usage:
  ./server.sh verify-v360-stabilization-release-readiness

Checks:
  - v3.6.0 Step 14 roadmap, stream verification, feature inventory, release policy, evidence index, and release records are wired
  - local stabilization companion gates are documented without claiming UI fulltest, 30m/120m longrun, published metadata, field smoke, or release actions
  - server.sh and inventory verifiers expose the Step 14 readiness command
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const commandName = "verify-v360-stabilization-release-readiness";
const command = `./server.sh ${commandName}`;
const companionCommands = [
  command,
  "./server.sh build",
  "./server.sh verify-v360-entry-baseline",
  "./server.sh verify-v360-simulation-input-contract",
  "./server.sh verify-v360-operations-simulation-run-contract",
  "./server.sh verify-v360-command-plan-dry-run-simulator",
  "./server.sh verify-v360-source-rule-impact-diff",
  "./server.sh verify-v360-safe-apply-readiness-gate",
  "./server.sh verify-v360-ops-simulation-workspace-ui",
  "./server.sh verify-v360-simulation-run-ledger-comparison",
  "./server.sh verify-v360-client-notice-preview",
  "./server.sh verify-v360-rule-va-what-if-replay-pack",
  "./server.sh verify-v360-simulation-export-bundle",
  "./server.sh verify-v360-field-evidence-simulation-adapter",
  "./server.sh verify-v360-vlm-assisted-simulation-explanation",
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
  implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  serverSh: readText("server.sh"),
};
const normalizedRecords = normalizeWhitespace(files.releaseRecords);
const checks = [];

check("roadmap and stream verification expose v3.6 Step 14 stabilization readiness", () => {
  for (const snippet of [
    "| 14 | v3.6.0 (14) Stabilization and Release Readiness | P0 | 완료 |",
    "v3.6 local stabilization, release evidence/not-run 경계",
    "`./server.sh verify-v360-stabilization-release-readiness`",
    "## v3.6.0 Step 14 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.6 Step 14");
  }
  for (const snippet of [
    "| v3.6.0 (14) | `./server.sh verify-v360-stabilization-release-readiness` |",
    "v3.6.0 local stabilization and release readiness",
    "UI 풀테스트 직접 조작, 30분/120분, published metadata, release action evidence를 대체하지 않음",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.6 Step 14");
  }
});

check("feature inventory maps v3.6 Step 14 to SAFE-161 and OPS-128", () => {
  for (const snippet of [
    "v3.6.0 (14) Stabilization and Release Readiness | `SAFE-161`, `OPS-128` | `verify-v360-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run`",
    "SAFE-161 | V360 Step 14 stabilization/release readiness boundary",
    "OPS-128 | V360 Step 14 Stabilization and Release Readiness 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.6 Step 14");
  }
  assertIncludes(files.coverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  for (const id of ["SAFE-161", "OPS-128"]) {
    assert(files.implementationManifest.items.find((item) => item.id === id)?.verifierEvidence?.command === commandName,
      `${id} implementation manifest verifier command drift`);
  }
  assertIncludes(files.projectInventoryVerifier, '"SAFE-161"', "project inventory verifier SAFE-161");
  assertIncludes(files.projectInventoryVerifier, '"OPS-128"', "project inventory verifier OPS-128");
});

check("release policy, evidence index, and records list v3.6 companion local gates", () => {
  for (const item of companionCommands) {
    assertIncludes(files.backlog, item, `backlog command ${item}`);
    assertIncludes(files.releasePolicy, item, `release policy command ${item}`);
    assertIncludes(files.releaseEvidenceIndex, item, `release evidence index command ${item}`);
    assertIncludes(files.releaseRecords, item, `release records command ${item}`);
  }
  for (const snippet of [
    "## v3.6.0 stabilization and release readiness",
    "media-server.v360-stabilization-release-readiness.v1",
    "v3.6.0 Step 14 local readiness gate",
    "`verify-release-metadata --published` 미실행",
  ]) {
    assertIncludes(files.releasePolicy, snippet, "release policy v3.6 Step 14");
  }
  for (const snippet of [
    "## v3.6.0 Step 14 local readiness gate records",
    "media-server.v360-stabilization-release-readiness.v1",
    "v3.6.0 Step 14 stabilization/release readiness",
    "UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence를 대체하지 않습니다",
  ]) {
    assertIncludes(files.releaseEvidenceIndex, snippet, "release evidence index v3.6 Step 14");
  }
});

check("release records include v3.6 Step 14 RED and not-run boundaries", () => {
  for (const snippet of [
    "V360 Stabilization and Release Readiness",
    "최초 `node scripts/internal/verify_v360_stabilization_release_readiness.mjs`는",
    "v360 Step 14 RED stabilization/release readiness gate",
    "v360 Step 14 stabilization/release readiness final",
    "v360 Step 14 local stabilization gates",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing Step 14 result: ${snippet}`);
  }
  for (const snippet of [
    "v360 Step 14 UI 풀테스트",
    "v360 Step 14 30분/120분 longrun",
    "v360 Step 14 published metadata",
    "v360 Step 14 PR/main/tag/GitHub Release",
    "v360 Step 14 field smoke",
    "Step 14 local readiness PASS로 대체하지 않음",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing Step 14 not-run boundary: ${snippet}`);
  }
});

check("server and script inventory expose v3.6 Step 14 readiness command", () => {
  for (const snippet of [
    commandName,
    "verify_v360_stabilization_release_readiness.mjs",
  ]) {
    assertIncludes(files.serverSh, snippet, "server.sh v3.6 Step 14 dispatch");
  }
  for (const snippet of [
    "server.sh dispatch targets exist and are executable",
    "tracked scripts are classified and referenced",
    "documented server.sh commands resolve to dispatch table",
    "verify_v360_stabilization_release_readiness.mjs",
  ]) {
    assertIncludes(files.scriptInventory, snippet, "script inventory Step 14 coverage");
  }
});

check("Step 14 gate keeps release actions and long UI/soak evidence separate", () => {
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
      assertIncludes(text, snippet, `${name} Step 14 boundary`);
    }
  }
});

check("SAFE-161 canonical readiness non-substitution boundary", () => {
  const releaseActionExecuted = !files.releaseRecords.includes("v360 Step 14 PR/main/tag/GitHub Release") || !files.releaseRecords.includes("미실행");
  const uiFulltestExecuted = !files.releaseRecords.includes("v360 Step 14 UI 풀테스트") || !files.releaseRecords.includes("미실행");
  const longrunExecuted = !files.releaseRecords.includes("v360 Step 14 30분/120분 longrun") || !files.releaseRecords.includes("미실행");
  const fieldSmokeExecuted = !files.releaseRecords.includes("v360 Step 14 field smoke") || !files.releaseRecords.includes("미실행");
  const safe161BoundaryObserved = companionCommands.includes(command) && files.releaseRecords.includes("v360 Step 14 stabilization/release readiness final");
  assert(safe161BoundaryObserved && releaseActionExecuted === false && uiFulltestExecuted === false && longrunExecuted === false && fieldSmokeExecuted === false,
    "SAFE-161 local readiness must preserve release action UI fulltest longrun and field smoke as independently not-run");
});

check("OPS-128 canonical local readiness gate", () => {
  const localCommandsWired = companionCommands.every((item) =>
    files.releasePolicy.includes(item) && files.releaseEvidenceIndex.includes(item) && files.releaseRecords.includes(item));
  const notRunBoundariesPresent = [
    "v360 Step 14 UI 풀테스트",
    "v360 Step 14 30분/120분 longrun",
    "v360 Step 14 PR/main/tag/GitHub Release",
    "v360 Step 14 field smoke",
  ].every((item) => files.releaseRecords.includes(item));
  const ops128GateObserved = localCommandsWired && notRunBoundariesPresent &&
    files.serverSh.includes("verify-v360-stabilization-release-readiness)");
  const ops128ReadinessObserved = ops128GateObserved;
  assert(ops128ReadinessObserved && ops128GateObserved,
    "OPS-128 local command wiring and explicit UI/long-run/release-action/field-smoke boundaries missing");
});

const results = runChecks();
console.log("");
console.log("== v3.6.0 stabilization/release readiness summary ==");
console.log("- schema: media-server.v360-stabilization-release-readiness.v1");
console.log("- step: v3.6.0 (14)");
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
