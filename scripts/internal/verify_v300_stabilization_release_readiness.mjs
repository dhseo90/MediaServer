#!/usr/bin/env node
// 파일 용도: v3.0.0 S10 stabilization/release readiness 기록과 미실행 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.0.0 S10 stabilization and release readiness verification

Usage:
  ./server.sh verify-v300-stabilization-release-readiness

Checks:
  - v3.0.0 S10 roadmap, stream verification, feature inventory, release policy, evidence index, and release records are wired
  - local stabilization companion gates are documented without claiming UI fulltest, 30m/120m longrun, published metadata, or release actions
  - server.sh and inventory verifiers expose the S10 readiness command
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const featureInventory = readText("docs/project-feature-test-inventory.md");
const releaseRecords = readText("docs/release-test-records.md");
const releaseEvidenceIndex = readText("docs/release-evidence-index.md");
const releasePolicy = readText("docs/release-policy.md");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const projectInventoryVerifier = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
const serverSh = readText("server.sh");
const normalizedRecords = normalizeWhitespace(releaseRecords);

const command = "./server.sh verify-v300-stabilization-release-readiness";
const companionCommands = [
  command,
  "./server.sh build",
  "./server.sh verify-v300-entry-baseline",
  "./server.sh verify-v300-event-evidence-contract",
  "./server.sh verify-v300-feature-schema-privacy",
  "./server.sh verify-v300-vlm-feature-queue",
  "./server.sh verify-v300-feature-only-retention",
  "./server.sh verify-v300-search-dsl-query-convert",
  "./server.sh verify-v300-feature-search-index",
  "./server.sh verify-v300-ops-events-ui",
  "./server.sh verify-v300-retention-pin-cleanup",
  "./server.sh verify-analysis-state",
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

check("roadmap and stream verification expose V300-S10 stabilization readiness", () => {
  for (const snippet of [
    "| 10 | V300-S10 | P0 | 완료 | Stabilization and Release Readiness |",
    "v3.0 local stabilization, release evidence/not-run 경계",
    "`./server.sh verify-v300-stabilization-release-readiness`",
    "## v3.0.0 S10 개발 기록",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S10 snippet: ${snippet}`);
  }
  for (const snippet of [
    "| V300-S10 | `./server.sh verify-v300-stabilization-release-readiness` |",
    "v3.0.0 local stabilization and release readiness",
    "UI 풀테스트 직접 조작, 30분/120분, published metadata, release action evidence를 대체하지 않음",
  ]) {
    assert(streamVerification.includes(snippet), `stream verification missing S10 snippet: ${snippet}`);
  }
});

check("feature inventory maps V300-S10 to SAFE-092 and OPS-060", () => {
  assertSummaryCountAtLeast("전체 기능 항목", 548);
  assertSummaryCountAtLeast("기능 ID 목록", 548);
  assertRangeCovers("SAFE", 92);
  assertRangeCovers("OPS", 60);
  for (const snippet of [
    "V300-S10 Stabilization and Release Readiness | `SAFE-092`, `OPS-060` | `verify-v300-stabilization-release-readiness`",
    "SAFE-092 | V300-S10 stabilization/release readiness boundary",
    "OPS-060 | V300-S10 stabilization/release readiness 게이트",
  ]) {
    assert(featureInventory.includes(snippet), `feature inventory missing S10 snippet: ${snippet}`);
  }
  assert(coverageVerifier.includes("verify-v300-stabilization-release-readiness"), "feature coverage missing V300-S10 verifier");
  assert(projectInventoryVerifier.includes('"SAFE-092"'), "project inventory verifier missing SAFE-092");
  assert(projectInventoryVerifier.includes('"OPS-060"'), "project inventory verifier missing OPS-060");
  assert(projectInventoryVerifierRangeCovers("SAFE", 92), "project inventory verifier SAFE range below 092");
  assert(projectInventoryVerifierRangeCovers("OPS", 60), "project inventory verifier OPS range below 060");
});

check("release policy, evidence index, and records list S10 companion local gates", () => {
  for (const item of companionCommands) {
    assert(backlog.includes(item), `backlog missing S10 command: ${item}`);
    assert(releasePolicy.includes(item), `release policy missing S10 command: ${item}`);
    assert(releaseEvidenceIndex.includes(item), `release evidence index missing S10 command: ${item}`);
    assert(releaseRecords.includes(item), `release records missing S10 command: ${item}`);
  }
  for (const snippet of [
    "## v3.0.0 stabilization and release readiness",
    "media-server.v300-stabilization-release-readiness.v1",
    "V300-S10 local readiness gate",
    "`verify-release-metadata --published` 미실행",
  ]) {
    assert(releasePolicy.includes(snippet), `release policy missing S10 snippet: ${snippet}`);
  }
  for (const snippet of [
    "v300-s10-stabilization-release-readiness-20260620",
    "media-server.v300-stabilization-release-readiness.v1",
    "V300-S10 stabilization/release readiness",
    "UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence를 대체하지 않습니다",
  ]) {
    assert(releaseEvidenceIndex.includes(snippet), `release evidence index missing S10 snippet: ${snippet}`);
  }
});

check("release records include S10 RED, local gate placeholders, and not-run boundaries", () => {
  for (const snippet of [
    "V300 stabilization and release readiness",
    "최초 `./server.sh verify-v300-stabilization-release-readiness`는 command 미구현으로 fail",
    "v300 S10 stabilization/release readiness",
    "v300 S10 local stabilization gates",
    "v300 S10 closeout dry-run",
    "v300 S10 one-shot closeout dry-run",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing S10 result: ${snippet}`);
  }
  for (const snippet of [
    "v300 S10 UI 풀테스트",
    "v300 S10 30분/120분 longrun",
    "v300 S10 published metadata",
    "v300 S10 PR/main/tag/GitHub Release",
    "v300 S10 field smoke",
    "S10 local readiness PASS로 대체하지 않음",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing S10 not-run boundary: ${snippet}`);
  }
});

check("server and script inventory expose S10 readiness command", () => {
  for (const snippet of [
    "verify-v300-stabilization-release-readiness",
    "verify_v300_stabilization_release_readiness.mjs",
  ]) {
    assert(serverSh.includes(snippet), `server.sh missing S10 command snippet: ${snippet}`);
  }
  for (const snippet of [
    "server.sh command dispatch",
    "tracked scripts are classified and referenced",
  ]) {
    assert(scriptInventory.includes(snippet), `script inventory verifier missing generic dispatch coverage snippet: ${snippet}`);
  }
});

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

console.log("");
console.log("== v3.0.0 stabilization/release readiness summary ==");
console.log("- schema: media-server.v300-stabilization-release-readiness.v1");
console.log("- scope: local stabilization gate wiring, release evidence records, not-run boundaries");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30m120m: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log("- releaseActions: not-run-by-this-command");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ");
}

function assertSummaryCountAtLeast(label, minimum) {
  const pattern = new RegExp(`\\| ${escapeRegExp(label)} \\| ([0-9]+)`);
  const match = featureInventory.match(pattern);
  assert(match, `feature inventory missing summary count: ${label}`);
  const count = Number.parseInt(match[1], 10);
  assert(count >= minimum, `feature inventory ${label} ${count} below ${minimum}`);
}

function assertRangeCovers(prefix, minimum) {
  const pattern = new RegExp(`\`${prefix}-[0-9]{3}\`~\`${prefix}-([0-9]{3})\``, "g");
  const matches = [...featureInventory.matchAll(pattern)];
  assert(matches.length > 0, `feature inventory missing ${prefix} range`);
  const max = Math.max(...matches.map((match) => Number.parseInt(match[1], 10)));
  assert(max >= minimum, `feature inventory ${prefix} range ${max} below ${minimum}`);
}

function projectInventoryVerifierRangeCovers(prefix, minimum) {
  const pattern = new RegExp(`\`${prefix}-[0-9]{3}\`~\`${prefix}-([0-9]{3})\``, "g");
  const matches = [...projectInventoryVerifier.matchAll(pattern)];
  if (matches.length === 0) return false;
  const max = Math.max(...matches.map((match) => Number.parseInt(match[1], 10)));
  return max >= minimum;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
