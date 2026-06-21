#!/usr/bin/env node
// 파일 용도: v3.1.0 S09 stabilization/release readiness 기록과 미실행 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.1.0 S09 stabilization and release readiness verification

Usage:
  ./server.sh verify-v310-stabilization-release-readiness

Checks:
  - v3.1.0 S09 roadmap, stream verification, feature inventory, release policy, evidence index, and release records are wired
  - local stabilization companion gates are documented without claiming UI fulltest, 30m/120m longrun, published metadata, field smoke, or release actions
  - server.sh and inventory verifiers expose the S09 readiness command
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const commandName = "verify-v310-stabilization-release-readiness";
const command = `./server.sh ${commandName}`;
const companionCommands = [
  command,
  "./server.sh build",
  "./server.sh verify-v310-entry-baseline",
  "./server.sh verify-v310-event-clip-contract",
  "./server.sh verify-analysis-state",
  "./server.sh verify-v310-replay-timeline-ui",
  "./server.sh verify-v310-client-safe-event-digest",
  "./server.sh verify-v310-scoped-integrator-search-api",
  "./server.sh verify-v310-operator-feature-correction",
  "./server.sh verify-v310-optional-vector-search",
  "./server.sh verify-v310-retention-export-hardening",
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

check("roadmap and stream verification expose V310-S09 stabilization readiness", () => {
  for (const snippet of [
    "V310-S09` Stabilization and Release Readiness 완료",
    "| 9 | V310-S09 | P0 | 완료 | Stabilization and Release Readiness |",
    "v3.1 local stabilization, release evidence/not-run 경계",
    "`./server.sh verify-v310-stabilization-release-readiness`",
    "## v3.1.0 S09 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog V310-S09");
  }
  for (const snippet of [
    "| V310-S09 | `./server.sh verify-v310-stabilization-release-readiness` |",
    "v3.1.0 local stabilization and release readiness",
    "UI 풀테스트 직접 조작, 30분/120분, published metadata, release action evidence를 대체하지 않음",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification V310-S09");
  }
});

check("feature inventory maps V310-S09 to SAFE-101 and OPS-068", () => {
  assertSummaryCountAtLeast("전체 기능 항목", 569);
  assertSummaryCountAtLeast("기능 ID 목록", 569);
  assertRangeCovers("SAFE", 101);
  assertRangeCovers("OPS", 68);
  for (const snippet of [
    "V310-S09 Stabilization and Release Readiness | `SAFE-101`, `OPS-068` | `verify-v310-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run`",
    "SAFE-101 | V310-S09 stabilization/release readiness boundary",
    "OPS-068 | V310-S09 stabilization/release readiness 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory V310-S09");
  }
  assertIncludes(files.coverageVerifier, commandName, "feature coverage verifier");
  assertIncludes(files.projectInventoryVerifier, '"SAFE-101"', "project inventory verifier SAFE-101");
  assertIncludes(files.projectInventoryVerifier, '"OPS-068"', "project inventory verifier OPS-068");
  assert(projectInventoryVerifierRangeCovers("SAFE", 101), "project inventory verifier SAFE range below 101");
  assert(projectInventoryVerifierRangeCovers("OPS", 68), "project inventory verifier OPS range below 068");
});

check("release policy, evidence index, and records list S09 companion local gates", () => {
  for (const item of companionCommands) {
    assertIncludes(files.backlog, item, `backlog command ${item}`);
    assertIncludes(files.releasePolicy, item, `release policy command ${item}`);
    assertIncludes(files.releaseEvidenceIndex, item, `release evidence index command ${item}`);
    assertIncludes(files.releaseRecords, item, `release records command ${item}`);
  }
  for (const snippet of [
    "## v3.1.0 stabilization and release readiness",
    "media-server.v310-stabilization-release-readiness.v1",
    "V310-S09 local readiness gate",
    "`verify-release-metadata --published` 미실행",
  ]) {
    assertIncludes(files.releasePolicy, snippet, "release policy V310-S09");
  }
  for (const snippet of [
    "## v3.1.0 S09 local readiness gate records",
    "media-server.v310-stabilization-release-readiness.v1",
    "V310-S09 stabilization/release readiness",
    "UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence를 대체하지 않습니다",
  ]) {
    assertIncludes(files.releaseEvidenceIndex, snippet, "release evidence index V310-S09");
  }
});

check("release records include S09 RED and not-run boundaries", () => {
  for (const snippet of [
    "V310 stabilization and release readiness",
    "최초 `./server.sh verify-v310-stabilization-release-readiness`는 command 미구현으로",
    "v310 S09 RED stabilization/release readiness gate",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing S09 result: ${snippet}`);
  }
  for (const snippet of [
    "v310 S09 UI 풀테스트",
    "v310 S09 30분/120분 longrun",
    "v310 S09 published metadata",
    "v310 S09 PR/main/tag/GitHub Release",
    "v310 S09 field smoke",
    "S09 local readiness PASS로 대체하지 않음",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing S09 not-run boundary: ${snippet}`);
  }
});

check("server and script inventory expose S09 readiness command", () => {
  for (const snippet of [
    commandName,
    "verify_v310_stabilization_release_readiness.mjs",
  ]) {
    assertIncludes(files.serverSh, snippet, "server.sh V310-S09 dispatch");
  }
  for (const snippet of [
    "server.sh dispatch targets exist and are executable",
    "tracked scripts are classified and referenced",
    "documented server.sh commands resolve to dispatch table",
  ]) {
    assertIncludes(files.scriptInventory, snippet, "script inventory generic dispatch coverage");
  }
});

check("S09 gate keeps release actions and long UI/soak evidence separate", () => {
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
      assertIncludes(text, snippet, `${name} S09 boundary`);
    }
  }
});

const results = runChecks();
console.log("");
console.log("== v3.1.0 stabilization/release readiness summary ==");
console.log("- schema: media-server.v310-stabilization-release-readiness.v1");
console.log("- step: V310-S09");
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
