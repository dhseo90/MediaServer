#!/usr/bin/env node
// 파일 용도: v3.8.0 source baseline, roadmap, docs, verifier 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.8.0 entry baseline verification

Usage:
  ./server.sh verify-v380-entry-baseline

Checks:
  - VERSION/CMake and public docs identify source 3.8.0
  - latest published release is v3.8.0 source-only
  - v3.8.0 roadmap selection is Operator-Gated Action Pilot & Outcome Loop
  - backlog, stream verification, release records, feature inventory, and dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v380-entry-baseline";
const baselineRoadmap = "v3.8.0 Operator-Gated Action Pilot & Outcome Loop";
const latestPublishedTag = "v3.8.0";
const latestPublishedBaseline = "v3.8.0 Operator-Gated Action Pilot & Outcome Loop";
const files = {
  cmake: readText("CMakeLists.txt"),
  readme: readText("README.md"),
  readmeEn: readText("README.en.md"),
  docsIndex: readText("docs/README.md"),
  docsEnIndex: readText("docs/en/README.md"),
  versioning: readText("docs/versioning-policy.md"),
  releasePolicy: readText("docs/release-policy.md"),
  publicReview: readText("docs/public-repo-final-review.md"),
  uiGuide: readText("docs/ui-guide.md"),
  assetPolicy: readText("docs/assets/ui/README.md"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseMetadataVerifier: readText("scripts/internal/verify_release_metadata_consistency.mjs"),
  docsUiAssetsVerifier: readText("scripts/internal/verify_docs_ui_assets.mjs"),
  docsUiAssetsManifest: readText("config/docs_ui_assets.json"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  serverSh: readText("server.sh"),
};

const version = readText("VERSION").trim();
const currentRoadmap = requiredMatch(files.versioning, /- 현재 source roadmap: `([^`]+)`/, "current source roadmap");
const checks = [];

check("current source and CMake align while v3.8 remains published historical", () => {
  assert(semverAtLeast(version, "3.8.0"), `current VERSION ${version} predates v3.8 baseline`);
  assertIncludes(files.cmake, `project(media_server VERSION ${version} LANGUAGES CXX)`, "CMake project version");
  assert(currentRoadmap.startsWith(`v${version} `), `current roadmap must match source ${version}: ${currentRoadmap}`);
});

check("public entry docs pin current source and published v3.8 boundary", () => {
  for (const [label, text, sourceSnippet, roadmapSnippet] of [
    ["README.md", files.readme, `현재 소스 버전: \`${version}\``, `현재 source roadmap: \`${currentRoadmap}\``],
    ["README.en.md", files.readmeEn, `Current source version: \`${version}\``, `Current source roadmap: \`${currentRoadmap}\``],
    ["docs/README.md", files.docsIndex, `현재 소스 버전: \`${version}\``, `현재 source roadmap: \`${currentRoadmap}\``],
    ["docs/en/README.md", files.docsEnIndex, `Current source version: \`${version}\``, `Current source roadmap: \`${currentRoadmap}\``],
  ]) {
    assertIncludes(text, sourceSnippet, label);
    assertIncludes(text, roadmapSnippet, label);
    assertIncludes(text, latestPublishedTag, label);
    assertIncludes(text, "source-only", label);
    assertIncludes(text, latestPublishedBaseline, label);
  }
});

check("policy docs separate current source from published v3.8 baseline", () => {
  for (const [label, text] of [["versioning policy", files.versioning], ["release policy", files.releasePolicy]]) {
    assertIncludes(text, version, label);
    assertIncludes(text, currentRoadmap, label);
    assertIncludes(text, latestPublishedTag, label);
  }
  assertIncludes(files.versioning, "## v3.8.0 latest published source-only release 범위", "versioning policy published v3.8 section");
  assertIncludes(files.releasePolicy, "## v3.8.0 Published Source Roadmap Scope", "release policy published v3.8 section");
  assertIncludes(files.releasePolicy, "./server.sh verify-v380-entry-baseline", "release policy v3.8 baseline command");
});

check("roadmap records v3.8 Step 1 as completed baseline alignment only", () => {
  for (const snippet of [
    "| 1 | v3.8.0 (1) v3.8.0 baseline 정렬 | P0 | 완료 |",
    "Action Capability Contract",
    "Action Request Ledger Contract",
    "Approval Decision Gate",
    "Action Readiness Preflight",
    "## v3.8.0 Step 1 개발 기록",
    "`./server.sh verify-v380-entry-baseline`",
    "이번 Step 1은 source/version/docs/backlog/verification metadata 정렬입니다.",
    "UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다.",
  ]) {
    assertIncludes(files.backlog, snippet, "development backlog");
  }
});

check("metadata, asset, stream, inventory, and records expose v3.8 Step 1 gate", () => {
  assertIncludes(files.releaseMetadataVerifier, 'const latestPublishedTag = "v3.8.0";', "release metadata verifier");
  assertIncludes(files.releaseMetadataVerifier, `const currentRoadmap = "${currentRoadmap}";`, "release metadata verifier");
  assertIncludes(files.docsUiAssetsVerifier, 'const latestPublishedTag = "v3.8.0";', "docs UI assets verifier");
  const manifest = JSON.parse(files.docsUiAssetsManifest);
  assert(manifest.baseline?.sourceVersion === version, `docs UI asset manifest source version must be ${version}`);
  assert(manifest.baseline?.publishedRelease === "v3.8.0", "docs UI asset manifest published release must be v3.8.0");
  for (const snippet of [
    "| v3.8.0 (1) | `./server.sh verify-v380-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` |",
    "source `3.8.0`, latest published `v3.8.0`, current roadmap `v3.8.0 Operator-Gated Action Pilot & Outcome Loop` 정렬",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification");
  }
  for (const snippet of [
    "v3.8.0 (1) v3.8.0 baseline 정렬 | `OPS-147`, `SAFE-180` | `verify-v380-entry-baseline`",
    "OPS-147 | V380 Step 1 v3.8 baseline 게이트",
    "SAFE-180 | V380 Step 1 v3.8 baseline boundary",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory");
  }
  for (const snippet of [
    "V380 source/published baseline alignment",
    "`./server.sh verify-v380-entry-baseline`",
    "v380 Step 1 RED entry baseline gate",
    "v380 Step 1 entry baseline final",
    "v380 Step 1 UI 풀테스트",
    "v380 Step 1 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records");
  }
});

check("server entrypoint and inventory verifiers include v3.8 Step 1", () => {
  assertIncludes(files.serverSh, command, "server.sh");
  assertIncludes(files.serverSh, "verify_v380_entry_baseline.mjs", "server.sh");
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  for (const id of ["SAFE-180", "OPS-147"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v380_entry_baseline.mjs", "script inventory");
});

for (const [label, text] of [
  ["docs/public-repo-final-review.md", files.publicReview],
  ["docs/ui-guide.md", files.uiGuide],
  ["docs/assets/ui/README.md", files.assetPolicy],
]) {
  check(`${label} pins current source and published v3.8 wording`, () => {
    assertIncludes(text, version, label);
    assertIncludes(text, latestPublishedTag, label);
  });
}

check("SAFE-180 canonical V380 historical baseline boundary", () => {
  const baselineCommandDocumented = files.serverSh.includes("verify-v380-entry-baseline)");
  const currentSourceAligned = semverAtLeast(version, "3.8.0") && files.cmake.includes(`VERSION ${version}`);
  const historicalBaselinePreserved = files.streamVerification.includes(baselineRoadmap) && files.releaseRecords.includes("v380 Step 1 entry baseline final") && files.featureInventory.includes("SAFE-180");
  const safe180BoundaryObserved = baselineCommandDocumented && currentSourceAligned && historicalBaselinePreserved;
  assert(safe180BoundaryObserved,
    "SAFE-180 V380 historical baseline must remain preserved while current source version advances");
});

check("OPS-147 canonical V380 historical baseline gate", () => {
  const historicalBaselineRecorded = files.featureInventory.includes("source `3.8.0`") &&
    files.featureInventory.includes("latest published `v3.8.0`") && files.featureInventory.includes(baselineRoadmap);
  const currentSourceNotRegressed = semverAtLeast(version, "3.8.0") && files.cmake.includes(`VERSION ${version}`);
  const excludedCompletionAbsent = files.releaseRecords.includes("v380 Step 1 entry baseline final") &&
    !files.releaseRecords.includes("OPS-147 feature implementation PASS");
  const ops147GateObserved = historicalBaselineRecorded && currentSourceNotRegressed && excludedCompletionAbsent &&
    files.serverSh.includes("verify-v380-entry-baseline)");
  assert(ops147GateObserved,
    "OPS-147 v3.8 source/published historical baseline, current non-regression, records, and dispatch gate missing");
});

const results = runChecks();
console.log("");
console.log("== v3.8.0 entry baseline summary ==");
console.log("- schema: media-server.v380-entry-baseline.v1");
console.log(`- currentVersion: ${version}`);
console.log("- latestPublishedTag: v3.8.0");
console.log(`- currentRoadmap: ${currentRoadmap}`);
console.log("- featureImplementation: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
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

function requiredMatch(text, pattern, label) {
  const match = String(text).match(pattern);
  if (!match) throw new Error(`missing ${label}`);
  return match[1];
}

function semverAtLeast(current, baseline) {
  const currentParts = String(current).split(".").map(Number);
  const baselineParts = String(baseline).split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (currentParts[index] > baselineParts[index]) return true;
    if (currentParts[index] < baselineParts[index]) return false;
  }
  return true;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
