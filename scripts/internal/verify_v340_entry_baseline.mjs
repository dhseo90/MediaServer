#!/usr/bin/env node
// 파일 용도: v3.4.0 source baseline 정렬과 v3.4.0 published baseline 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.4.0 entry baseline verification

Usage:
  ./server.sh verify-v340-entry-baseline

Checks:
  - VERSION/CMake and public docs identify the current source while preserving v3.4.0 historical evidence
  - latest published release remains the current source-only baseline
  - v3.4.0 roadmap selection is Operations Continuity Drill Workspace
  - backlog, stream verification, feature inventory, release records, release metadata, and server dispatch expose this gate
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v340-entry-baseline";
const version = readText("VERSION").trim();
const currentTag = `v${version}`;
const baselineVersion = "3.4.0";
const baselineTag = "v3.4.0";
const baselineRoadmap = "v3.4.0 Operations Continuity Drill Workspace";
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
  implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
  serverSh: readText("server.sh"),
};
const currentRoadmap = requiredMatch(files.versioning, /- 현재 source roadmap: `([^`]+)`/, "current source roadmap");
const latestPublishedTag = requiredMatch(files.releaseMetadataVerifier, /const latestPublishedTag = "(v[0-9]+\.[0-9]+\.[0-9]+)";/, "latest published tag");
const latestPublishedBaseline = requiredMatch(files.releaseMetadataVerifier, /const latestPublishedBaseline = "([^"]+)";/, "latest published baseline");

const checks = [];

check("current source and CMake align while v3.4 remains historical", () => {
  assert(semverAtLeast(version, baselineVersion), `current VERSION ${version} predates historical baseline ${baselineVersion}`);
  assertIncludes(files.cmake, `project(media_server VERSION ${version} LANGUAGES CXX)`, "CMake project version");
  assert(currentRoadmap.startsWith(`v${version} `), `current roadmap must match source ${version}: ${currentRoadmap}`);
});

check("public entry docs pin current source and current published boundary", () => {
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
  }
});

check("versioning and release policy preserve v3.4 history and current source truth", () => {
  for (const [label, text] of [["versioning policy", files.versioning], ["release policy", files.releasePolicy]]) {
    assertIncludes(text, version, label);
    assertIncludes(text, currentRoadmap, label);
    assertIncludes(text, latestPublishedTag, label);
  }
  assertIncludes(files.backlog, baselineRoadmap, "development backlog historical v3.4 baseline");
  assertIncludes(files.streamVerification, "verify-v340-entry-baseline", "stream verification historical v3.4 command");
  assertIncludes(files.releaseRecords, "v340 Step 1 entry baseline final", "release records historical v3.4 result");
});

check("roadmap records v3.4 Step 1 as completed baseline alignment only", () => {
  for (const snippet of [
    "| 1 | v3.4.0 (1) v3.4.0 baseline 정렬 | P0 | 완료 | VERSION/CMake/docs/backlog/source roadmap과 `verify-v340-entry-baseline` 기준 정렬 |",
    "Operations Continuity Drill Workspace",
    "Continuity Drill Core",
    "## v3.4.0 Step 1 개발 기록",
    "`./server.sh verify-v340-entry-baseline`",
    "이번 Step 1은 source/version/docs/backlog/verification metadata 정렬입니다.",
    "UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다.",
    "`v3.4.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.",
  ]) {
    assertIncludes(files.backlog, snippet, "development backlog");
  }
});

check("metadata, asset, stream, inventory, and records expose v3.4 Step 1 gate", () => {
  assertIncludes(files.releaseMetadataVerifier, `const latestPublishedTag = "${latestPublishedTag}";`, "release metadata verifier");
  assertIncludes(files.releaseMetadataVerifier, `const currentRoadmap = "${currentRoadmap}";`, "release metadata verifier");
  assertIncludes(files.releaseMetadataVerifier, `const latestPublishedBaseline = "${latestPublishedBaseline}";`, "release metadata verifier");
  assertIncludes(files.docsUiAssetsVerifier, `const latestPublishedTag = "${latestPublishedTag}";`, "docs UI assets verifier");
  const manifest = JSON.parse(files.docsUiAssetsManifest);
  assert(manifest.baseline?.sourceVersion === version, `docs UI asset manifest source version must be ${version}`);
  assert(manifest.baseline?.publishedRelease === latestPublishedTag, `docs UI asset manifest published release must be ${latestPublishedTag}`);
  for (const snippet of [
    "| v3.4.0 (1) | `./server.sh verify-v340-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` |",
    `source \`3.4.0\`, latest published \`${baselineTag}\`, current roadmap \`${baselineRoadmap}\` 정렬`,
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification");
  }
  for (const snippet of [
    "v3.4.0 (1) v3.4.0 baseline 정렬 | `OPS-091`, `SAFE-124` | `verify-v340-entry-baseline`",
    "OPS-091 | V340 Step 1 v3.4 baseline 게이트",
    "SAFE-124 | V340 Step 1 v3.4 baseline boundary",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory");
  }
  for (const snippet of [
    "V340 source-of-truth split",
    "`./server.sh verify-v340-entry-baseline`",
    "v340 Step 1 RED entry baseline gate",
    "v340 Step 1 entry baseline final",
    "v340 Step 1 UI 풀테스트",
    "v340 Step 1 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records");
  }
});

check("server entrypoint and inventory verifiers include v3.4 Step 1", () => {
  assertIncludes(files.serverSh, command, "server.sh");
  assertIncludes(files.serverSh, "verify_v340_entry_baseline.mjs", "server.sh");
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage verifier");
  for (const id of ["SAFE-124", "OPS-091"]) {
    assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command,
      `${id} implementation manifest verifier command drift`);
  }
});

for (const [label, text] of [
  ["docs/public-repo-final-review.md", files.publicReview],
  ["docs/ui-guide.md", files.uiGuide],
  ["docs/assets/ui/README.md", files.assetPolicy],
]) {
  check(`${label} pins current source wording`, () => {
    assertIncludes(text, version, label);
    assertIncludes(text, latestPublishedTag, label);
  });
}

check("SAFE-124 canonical V340 source-of-truth boundary", () => {
  const baselineCommandDocumented = files.serverSh.includes("verify-v340-entry-baseline)");
  const currentSourceAligned = semverAtLeast(version, baselineVersion) && files.cmake.includes(`VERSION ${version}`) && currentRoadmap.startsWith(`v${version} `);
  const historicalBaselinePreserved = files.streamVerification.includes(baselineRoadmap) && files.releaseRecords.includes("v340 Step 1 entry baseline final") && files.featureInventory.includes("SAFE-124");
  const safe124BoundaryObserved = baselineCommandDocumented && currentSourceAligned && historicalBaselinePreserved;
  assert(safe124BoundaryObserved && (baselineCommandDocumented && currentSourceAligned && historicalBaselinePreserved),
    "SAFE-124 V340 baseline must align version/roadmap/dispatch without claiming v3.4 feature, UI, long-run, or release completion");
});

const results = runChecks();
console.log("");
console.log("== v3.4.0 entry baseline summary ==");
console.log("- schema: media-server.v340-entry-baseline.v1");
console.log(`- currentVersion: ${version}`);
console.log(`- currentTag: ${currentTag}`);
console.log(`- latestPublishedTag: ${latestPublishedTag}`);
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
