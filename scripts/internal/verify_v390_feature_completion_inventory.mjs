#!/usr/bin/env node
// 파일 용도: v3.9.0 기능 완성 인벤토리의 구조, vocabulary, discovery review gate를 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 feature completion inventory verification

Usage:
  ./server.sh verify-v390-feature-completion-inventory

Checks:
  - docs/v390-feature-completion-inventory.md title, source-of-truth relationship, disposition vocabulary, test-area vocabulary
  - discovery table header, seed row, source groups, and review gate phrases
  - development backlog keeps the user review gate boundary
  - server.sh dispatch and verify-script-inventory track this verifier

Not run by this command:
  - actual feature discovery completion
  - feature development
  - UI fulltest
  - 30/120 minute longrun
  - published metadata verification
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-feature-completion-inventory";
const inventoryPath = "docs/v390-feature-completion-inventory.md";
const targetScript = "verify_v390_feature_completion_inventory.mjs";
const helpPhrase = "v3.9.0 기능 완성 인벤토리 구조와 discovery review gate를 검증합니다.";
const tableHeader = "| Feature ID | Source | Current State | Required Development | Completion Condition | Stabilization | 30min | 120min | UI Fulltest | v3.9 Disposition | Invariant Impact | Evidence / Notes |";

const expectedDispositions = [
  "required-development",
  "candidate-development",
  "structure-stabilization-handoff",
  "excluded-non-scope",
  "closed-with-evidence",
];

const expectedSourceGroups = [
  "Public entry docs",
  "Roadmap and policy",
  "Test source-of-truth",
  "Product UI docs",
  "Server routes/API",
  "Product UI source",
  "Analysis/core/media",
  "Verifier dispatch",
];

const files = {
  inventory: readText(inventoryPath),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  serverSh: readText("server.sh"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
};

const checks = [];

check("inventory title is exact", () => {
  const firstLine = files.inventory.split(/\r?\n/, 1)[0];
  assert(firstLine === "# v3.9.0 Feature Completion Inventory", `unexpected title: ${firstLine}`);
});

check("source-of-truth relationship phrases are present", () => {
  for (const snippet of [
    "Source-of-truth 관계",
    "`AGENTS.md`가 권한/테스트/보고 규칙을 우선",
    "`docs/development-backlog.md`는 큰 phase 상태판",
    "작은 기능 단위의 완료 여부를 추적",
  ]) {
    assertIncludes(files.inventory, snippet, inventoryPath);
  }
});

check("disposition vocabulary has exactly five approved values", () => {
  const section = sectionBetween(files.inventory, "## Disposition Vocabulary", "## Test Area Vocabulary");
  const rows = dataRows(section, "Disposition");
  const actualDispositions = rows.map(row => row[0]);
  assertSameList(actualDispositions, expectedDispositions, "disposition vocabulary");
});

check("AGENTS four test areas and no extra test-area wording are present", () => {
  for (const snippet of [
    "`안정화`",
    "`30분`",
    "`120분`",
    "`UI`",
    "wrapper, preflight, dry-run, field smoke, external credential, no-device는 별도 테스트 영역이 아니다",
  ]) {
    assertIncludes(files.inventory, snippet, "test area vocabulary");
  }
});

check("discovery table header and seed row are present", () => {
  assert(files.inventory.split(/\r?\n/).includes(tableHeader), "discovery table header does not match exact required header");
  assertIncludes(files.inventory, "| V390-DISCOVERY-000 |", "discovery seed row");
  assertIncludes(files.inventory, "`verify-v390-feature-completion-inventory` passes", "discovery seed row");
  assertIncludes(files.inventory, "| required | not-run | not-run | not-run | required-development |", "discovery seed row test/disposition boundary");
});

check("discovery source groups have exactly the eight approved groups", () => {
  const section = sectionBetween(files.inventory, "## Discovery Sources To Check", "## Review Gate");
  const rows = dataRows(section, "Source Group");
  const actual = rows.map(row => row[0]);
  assertSameList(actual, expectedSourceGroups, "discovery source groups");
});

check("review gate phrases require user approval of the development list", () => {
  for (const snippet of [
    "Discovery is not complete until",
    "the user reviews and approves the required/candidate development list",
    "development list",
    "Until this review gate passes, this file remains a discovery tracking scaffold only.",
  ]) {
    assertIncludes(files.inventory, snippet, "review gate");
  }
});

check("development backlog blocks feature development before discovery approval", () => {
  assertIncludes(files.backlog, "discovery 결과 승인 전 기능 개발 금지", "development backlog");
});

check("stream verification records v3.9 feature inventory command boundary", () => {
  for (const snippet of [
    "## 현재 v3.9.0 verifier",
    "v3.9.0 (2)",
    command,
    "feature completion inventory scaffold",
    "실제 feature discovery 완료, 기능 구현, 구조 안정화 구현, 테스트 방식 전환 구현",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.9 feature inventory");
  }
});

check("project inventory maps v3.9 feature completion IDs", () => {
  for (const snippet of [
    "v3.9.0 (2) Feature Completion Inventory/Discovery Gate",
    "`OPS-164`, `SAFE-197`",
    command,
    "| SAFE-197 |",
    "| OPS-164 |",
    "실제 discovery 완료, 기능 구현, 구조 안정화 구현, 테스트 방식 전환 구현",
  ]) {
    assertIncludes(files.projectInventory, snippet, "project inventory v3.9 feature completion");
  }
});

check("release records and evidence index track feature inventory review gate", () => {
  for (const snippet of [
    "v390 Step 2 RED feature completion inventory gate",
    "v390 Step 2 feature completion inventory final",
    "v390 discovery user review gate",
    "#### v3.9.0 미실행/제외",
    "v390 기능 개발",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.9 feature completion");
  }
  for (const snippet of [
    "v3.9.0 feature completion inventory",
    "OPS-164",
    "SAFE-197",
    "실제 discovery 완료, 기능 구현, 구조 안정화 구현, 테스트 방식 전환 구현",
  ]) {
    assertIncludes(files.releaseEvidence, snippet, "release evidence v3.9 feature completion");
  }
});

check("server.sh help and dispatch include the feature completion inventory verifier", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, targetScript, "server.sh dispatch target");
  assertIncludes(files.serverSh, helpPhrase, "server.sh help phrase");
});

check("script inventory tracks this verifier as a strict user-facing JS script", () => {
  assertIncludes(files.scriptInventory, targetScript, "script inventory");
});

check("SAFE-197 canonical feature inventory review boundary", () => {
  const discoveryGroupsObserved = expectedSourceGroups.every((group) => files.inventory.includes(group));
  const dispositionVocabularyObserved = expectedDispositions.every((value) => files.inventory.includes(value));
  const actualFeatureDiscoveryCompletion = !files.inventory.includes("not-run") && !files.inventory.includes("미실행");
  const featureInventoryReviewFlowObserved = discoveryGroupsObserved && dispositionVocabularyObserved;
  const safe197BoundaryObserved = featureInventoryReviewFlowObserved && files.projectInventory.includes("SAFE-197");
  assert(safe197BoundaryObserved && actualFeatureDiscoveryCompletion === false,
    "SAFE-197 inventory scaffold must not claim actual feature discovery or implementation completion");
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 feature completion inventory summary ==");
console.log("- schema: media-server.v390-feature-completion-inventory.v1");
console.log(`- command: ${command}`);
console.log(`- inventory: ${inventoryPath}`);
console.log(`- dispositionValues: ${expectedDispositions.length}`);
console.log(`- discoverySourceGroups: ${expectedSourceGroups.length}`);
console.log("- actualFeatureDiscoveryCompletion: not-run-by-this-command");
console.log("- featureDevelopment: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30: not-run-by-this-command");
console.log("- longrun120: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log("- boundary: wrapper/preflight/dry-run/field-smoke/external-credential/no-device are not separate test areas");
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

function sectionBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert(start >= 0, `missing section: ${startMarker}`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert(end >= 0, `missing next section after ${startMarker}: ${endMarker}`);
  return text.slice(start, end);
}

function dataRows(section, firstHeader) {
  const rows = section
    .split(/\r?\n/)
    .filter(line => line.startsWith("|") && line.endsWith("|"))
    .map(line => line.slice(1, -1).split("|").map(cell => cell.trim()))
    .filter(row => row.length > 0)
    .filter(row => row[0] !== firstHeader)
    .filter(row => !/^:?-{3,}:?$/.test(row[0]));
  assert(rows.length > 0, `no data rows found for ${firstHeader}`);
  return rows;
}

function assertSameList(actual, expected, label) {
  assert(actual.length === expected.length, `${label} count mismatch: expected ${expected.length}, got ${actual.length} (${actual.join(", ")})`);
  for (let index = 0; index < expected.length; index += 1) {
    assert(actual[index] === expected[index], `${label} mismatch at ${index + 1}: expected ${expected[index]}, got ${actual[index]}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
