#!/usr/bin/env node
// 파일 용도: v3.2.0 Step 11 stabilization/release readiness 기록과 미실행 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.2.0 Step 11 stabilization and release readiness verification

Usage:
  ./server.sh verify-v320-stabilization-release-readiness

Checks:
  - v3.2.0 Step 11 roadmap, stream verification, feature inventory, release policy, evidence index, and release records are wired
  - local stabilization companion gates are documented without claiming UI fulltest, 30m/120m longrun, published metadata, field smoke, or release actions
  - server.sh and inventory verifiers expose the Step 11 readiness command
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const commandName = "verify-v320-stabilization-release-readiness";
const command = `./server.sh ${commandName}`;
const companionCommands = [
  command,
  "./server.sh build",
  "./server.sh verify-v320-entry-baseline",
  "./server.sh verify-v320-resolution-state-contract",
  "./server.sh verify-v320-unified-ops-events-workspace",
  "./server.sh verify-v320-evidence-quality-layer",
  "./server.sh verify-v320-source-reliability-context",
  "./server.sh verify-v320-source-reliability-runtime-sample",
  "./server.sh verify-v320-ai-review-quality-context",
  "./server.sh verify-v320-operator-resolution-flow",
  "./server.sh verify-v320-action-readiness-checklist",
  "./server.sh verify-v320-client-safe-resolution-digest",
  "./server.sh verify-v320-resolution-search-metrics",
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

check("roadmap and stream verification expose v3.2 Step 11 stabilization readiness", () => {
  for (const snippet of [
    "| 11 | v3.2.0 (11) Stabilization and Release Readiness | P0 | 완료 |",
    "v3.2 local stabilization, release evidence/not-run 경계",
    "`./server.sh verify-v320-stabilization-release-readiness`",
    "## v3.2.0 Step 11 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.2 Step 11");
  }
  for (const snippet of [
    "| v3.2.0 (11) | `./server.sh verify-v320-stabilization-release-readiness` |",
    "v3.2.0 local stabilization and release readiness",
    "UI 풀테스트 직접 조작, 30분/120분, published metadata, release action evidence를 대체하지 않음",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.2 Step 11");
  }
});

check("feature inventory maps v3.2 Step 11 to SAFE-112 and OPS-079", () => {
  assertSummaryCountAtLeast("전체 기능 항목", 611);
  assertSummaryCountAtLeast("기능 ID 목록", 611);
  assertRangeCovers("SAFE", 112);
  assertRangeCovers("OPS", 79);
  for (const snippet of [
    "v3.2.0 (11) Stabilization and Release Readiness | `SAFE-112`, `OPS-079` | `verify-v320-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run`",
    "SAFE-112 | V320 Step 11 stabilization/release readiness boundary",
    "OPS-079 | V320 Step 11 Stabilization and Release Readiness 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.2 Step 11");
  }
  assertIncludes(files.coverageVerifier, commandName, "feature coverage verifier");
  assertIncludes(files.projectInventoryVerifier, '"SAFE-112"', "project inventory verifier SAFE-112");
  assertIncludes(files.projectInventoryVerifier, '"OPS-079"', "project inventory verifier OPS-079");
  assert(projectInventoryVerifierRangeCovers("SAFE", 112), "project inventory verifier SAFE range below 112");
  assert(projectInventoryVerifierRangeCovers("OPS", 79), "project inventory verifier OPS range below 079");
});

check("release policy, evidence index, and records list Step 11 companion local gates", () => {
  for (const item of companionCommands) {
    assertIncludes(files.backlog, item, `backlog command ${item}`);
    assertIncludes(files.releasePolicy, item, `release policy command ${item}`);
    assertIncludes(files.releaseEvidenceIndex, item, `release evidence index command ${item}`);
    assertIncludes(files.releaseRecords, item, `release records command ${item}`);
  }
  for (const snippet of [
    "## v3.2.0 stabilization and release readiness",
    "media-server.v320-stabilization-release-readiness.v1",
    "v3.2.0 Step 11 local readiness gate",
    "`verify-release-metadata --published` 미실행",
  ]) {
    assertIncludes(files.releasePolicy, snippet, "release policy v3.2 Step 11");
  }
  for (const snippet of [
    "## v3.2.0 Step 11 local readiness gate records",
    "media-server.v320-stabilization-release-readiness.v1",
    "v3.2.0 Step 11 stabilization/release readiness",
    "UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence를 대체하지 않습니다",
  ]) {
    assertIncludes(files.releaseEvidenceIndex, snippet, "release evidence index v3.2 Step 11");
  }
});

check("release records include Step 11 RED and not-run boundaries", () => {
  for (const snippet of [
    "V320 Stabilization and Release Readiness",
    "최초 `./server.sh verify-v320-stabilization-release-readiness`는 command 미구현으로",
    "v320 Step 11 RED stabilization/release readiness gate",
    "v320 Step 11 stabilization/release readiness final",
    "v320 Step 11 local stabilization gates",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing Step 11 result: ${snippet}`);
  }
  for (const snippet of [
    "v320 Step 11 UI 풀테스트",
    "v320 Step 11 30분/120분 longrun",
    "v320 Step 11 published metadata",
    "v320 Step 11 PR/main/tag/GitHub Release",
    "v320 Step 11 field smoke",
    "Step 11 local readiness PASS로 대체하지 않음",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing Step 11 not-run boundary: ${snippet}`);
  }
});

check("server and script inventory expose Step 11 readiness command", () => {
  for (const snippet of [
    commandName,
    "verify_v320_stabilization_release_readiness.mjs",
  ]) {
    assertIncludes(files.serverSh, snippet, "server.sh v3.2 Step 11 dispatch");
  }
  for (const snippet of [
    "server.sh dispatch targets exist and are executable",
    "tracked scripts are classified and referenced",
    "documented server.sh commands resolve to dispatch table",
    "verify_v320_stabilization_release_readiness.mjs",
  ]) {
    assertIncludes(files.scriptInventory, snippet, "script inventory Step 11 coverage");
  }
});

check("Step 11 gate keeps release actions and long UI/soak evidence separate", () => {
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
      assertIncludes(text, snippet, `${name} Step 11 boundary`);
    }
  }
});

check("SAFE-112 canonical V320 readiness boundary", () => {
  const readinessCommandDocumented = files.serverSh.includes("verify-v320-stabilization-release-readiness)");
  const localEvidenceRecorded = normalizedRecords.includes("SAFE-112") && normalizedRecords.includes("Step 11");
  const notRunBoundaryMissing = !normalizedRecords.includes("not-run") || !files.releasePolicy.includes("UI 풀테스트") || !files.releasePolicy.includes("120분");
  const safe112BoundaryObserved = readinessCommandDocumented && localEvidenceRecorded && notRunBoundaryMissing === false;
  assert(safe112BoundaryObserved && (readinessCommandDocumented && localEvidenceRecorded && notRunBoundaryMissing === false) && notRunBoundaryMissing === false,
    "SAFE-112 V320 readiness must preserve UI fulltest/30m/120m/published metadata/field smoke/release action not-run boundaries");
});

const results = runChecks();
console.log("");
console.log("== v3.2.0 stabilization/release readiness summary ==");
console.log("- schema: media-server.v320-stabilization-release-readiness.v1");
console.log("- step: v3.2.0 (11)");
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

function assertSummaryCountAtLeast(label, minimum) {
  const pattern = new RegExp(`\\| ${escapeRegExp(label)} \\| ([0-9]+)`);
  const match = files.featureInventory.match(pattern);
  assert(match, `feature inventory missing summary count: ${label}`);
  const count = Number.parseInt(match[1], 10);
  assert(count >= minimum, `feature inventory ${label} ${count} below ${minimum}`);
}

function assertRangeCovers(prefix, minimum) {
  const pattern = new RegExp(`\`${prefix}-[0-9]{3}\`~\`${prefix}-([0-9]{3})\``, "g");
  const matches = [...files.featureInventory.matchAll(pattern)];
  assert(matches.length > 0, `feature inventory missing ${prefix} range`);
  const max = Math.max(...matches.map((match) => Number.parseInt(match[1], 10)));
  assert(max >= minimum, `feature inventory ${prefix} range ${max} below ${minimum}`);
}

function projectInventoryVerifierRangeCovers(prefix, minimum) {
  const pattern = new RegExp(`\`${prefix}-[0-9]{3}\`~\`${prefix}-([0-9]{3})\``, "g");
  const matches = [...files.projectInventoryVerifier.matchAll(pattern)];
  if (matches.length === 0) return false;
  const max = Math.max(...matches.map((match) => Number.parseInt(match[1], 10)));
  return max >= minimum;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
