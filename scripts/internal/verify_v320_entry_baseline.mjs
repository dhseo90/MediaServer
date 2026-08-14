#!/usr/bin/env node
// 파일 용도: v3.2.0 source baseline 정렬과 v3.2.0 published metadata 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.2.0 entry baseline verification

Usage:
  ./server.sh verify-v320-entry-baseline

Checks:
  - VERSION/CMake and public docs identify source 3.2.0 while latest published release is v3.2.0
  - v3.2.0 roadmap selection is Operations Resolution Workspace with explicit fallback/exclusions
  - v3.2.0 Step 1 is recorded as completed local source baseline alignment, not feature/UI/longrun/published evidence
  - server entrypoint, stream verification, feature inventory, release records, and release policy expose this gate
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const version = readText("VERSION").trim();
const currentTag = `v${version}`;
const baselineVersion = "3.2.0";
const baselineTag = "v3.2.0";
const baselineRoadmap = "v3.2.0 Operations Resolution Workspace";

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
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseMetadataVerifier: readText("scripts/internal/verify_release_metadata_consistency.mjs"),
  docsUiAssetsVerifier: readText("scripts/internal/verify_docs_ui_assets.mjs"),
  docsUiAssetsManifest: readText("config/docs_ui_assets.json"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  server: readText("server.sh"),
};
const currentRoadmap = requiredMatch(files.versioning, /- 현재 source roadmap: `([^`]+)`/, "current source roadmap");
const latestPublishedTag = requiredMatch(files.releaseMetadataVerifier, /const latestPublishedTag = "(v[0-9]+\.[0-9]+\.[0-9]+)";/, "latest published tag");

check("current source version and CMake align while v3.2 remains historical", () => {
  assert(semverAtLeast(version, baselineVersion), `current VERSION ${version} predates historical baseline ${baselineVersion}`);
  assert(files.cmake.includes(`project(media_server VERSION ${version} LANGUAGES CXX)`), `CMake project version must match current VERSION ${version}`);
  assert(currentRoadmap.startsWith(`v${version} `), `current roadmap must match source ${version}: ${currentRoadmap}`);
});

check("public entry docs pin current source while preserving source-only publication boundary", () => {
  for (const [label, text, sourceSnippet, roadmapSnippet] of [
    ["README.md", files.readme, `현재 소스 버전: \`${version}\``, `현재 source roadmap: \`${currentRoadmap}\``],
    ["README.en.md", files.readmeEn, `Current source version: \`${version}\``, `Current source roadmap: \`${currentRoadmap}\``],
    ["docs/README.md", files.docsIndex, `현재 소스 버전: \`${version}\``, `현재 source roadmap: \`${currentRoadmap}\``],
    ["docs/en/README.md", files.docsEnIndex, `Current source version: \`${version}\``, `Current source roadmap: \`${currentRoadmap}\``],
  ]) {
    assert(text.includes(sourceSnippet), `${label} missing source snippet: ${sourceSnippet}`);
    assert(text.includes(roadmapSnippet), `${label} missing roadmap snippet: ${roadmapSnippet}`);
    assert(text.includes(latestPublishedTag) && text.includes("source-only"), `${label} must preserve ${latestPublishedTag} source-only published boundary`);
  }
});

check("policy docs preserve v3.2 historical baseline and current source split", () => {
  for (const [label, text] of [
    ["docs/versioning-policy.md", files.versioning],
    ["docs/release-policy.md", files.releasePolicy],
    ["docs/public-repo-final-review.md", files.publicReview],
    ["docs/ui-guide.md", files.uiGuide],
  ]) {
    assert(text.includes(version), `${label} missing current source ${version}`);
    assert(text.includes(latestPublishedTag), `${label} missing latest published ${latestPublishedTag}`);
    if (label !== "docs/ui-guide.md") {
      assert(text.includes(currentRoadmap), `${label} missing current roadmap ${currentRoadmap}`);
    }
  }
  assert(files.versioning.includes("## v3.2.0 previous published source-only release 범위"), "versioning policy missing historical v3.2 release section");
  assert(files.releasePolicy.includes("## v3.2.0 stabilization and release readiness"), "release policy missing historical v3.2 readiness section");
  assert(files.releasePolicy.includes("./server.sh verify-v320-entry-baseline"), "release policy missing v3.2 entry baseline companion gate");
});

check("roadmap records v3.2 Step 1 as completed baseline alignment only", () => {
  for (const snippet of [
    "Step 11 Stabilization and Release Readiness local gate 연결 완료 후 published baseline으로",
    "직접 답: v3.2.0의 1차 선택값은 `Operations Resolution Workspace`입니다.",
    "fallback 또는 축소 대안은 `Resolution Core Baseline`입니다.",
    "제외 대상과 제외 사유",
    "새 저장소 제품군으로의 확장: MediaServer의 current source target을 운영 resolution workspace로 제한하기 위해 제외합니다.",
    "자동 승인/자동 조치 적용: operator closure와 manual review 경계를 깨므로 제외합니다.",
    "license/provenance/privacy/운영 제약",
    "기본 공개 형태는 source-only이며 Binary, runtime, model bundle을 release asset에 포함하지 않습니다.",
    "provider credential, raw prompt/response, source URL, raw frame bytes, 내부 debug material은 문서/UI/client/event payload/release evidence에 원문 노출하지 않습니다.",
    "| 1 | v3.2.0 (1) v3.2.0 baseline 정렬 | P0 | 완료 |",
    "| 2 | v3.2.0 (2) Resolution State Contract | P0 | 완료 |",
    "`./server.sh verify-v320-entry-baseline`",
  ]) {
    assert(files.backlog.includes(snippet), `backlog missing snippet: ${snippet}`);
  }
});

check("current metadata stays aligned while release records preserve v3.2 publication", () => {
  assert(files.releaseMetadataVerifier.includes(`const latestPublishedTag = "${latestPublishedTag}";`), "release metadata verifier latest published tag drift");
  assert(files.releaseMetadataVerifier.includes(`const currentRoadmap = "${currentRoadmap}";`), "release metadata verifier missing v3.2 current roadmap");
  assert(files.docsUiAssetsVerifier.includes(`const latestPublishedTag = "${latestPublishedTag}";`), "docs UI assets verifier latest published tag drift");
  const manifest = JSON.parse(files.docsUiAssetsManifest);
  assert(manifest.baseline?.sourceVersion === version, `docs UI asset manifest source version must be ${version}`);
  assert(manifest.baseline?.publishedRelease === latestPublishedTag, "docs UI asset manifest published release must stay v3.2.0");
  assert(manifest.baseline?.publicReleaseStatus === `${latestPublishedTag}-published-source-only`, "docs UI asset manifest public release status drift");
  assert(files.releaseRecords.includes("v320 release PR/main/ruleset/tag/GitHub Release"), "release records missing v3.2 publication evidence");
  assert(files.releaseRecords.includes("SSH-signed annotated tag `v3.2.0`"), "release records missing signed v3.2 tag evidence");
});

check("stream verification, feature inventory, and release records expose v3.2 Step 1 gate", () => {
  for (const snippet of [
    "| v3.2.0 (1) | `./server.sh verify-v320-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` |",
    `source \`3.2.0\`, latest published \`v3.2.0\`, current roadmap \`${baselineRoadmap}\` 정렬`,
  ]) {
    assert(files.streamVerification.includes(snippet), `stream verification missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "v3.2.0 (1) v3.2.0 baseline 정렬 | `OPS-069`, `SAFE-102` | `verify-v320-entry-baseline`",
    "OPS-069 | V320 Step 1 v3.2 baseline 게이트",
    "SAFE-102 | V320 Step 1 v3.2 baseline boundary",
  ]) {
    assert(files.featureInventory.includes(snippet), `feature inventory missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "V320 source-of-truth split",
    "`./server.sh verify-v320-entry-baseline`",
    "최초 `./server.sh verify-v320-entry-baseline`는 command 미구현으로",
    "v320 Step 1 entry baseline final",
    "v320 Step 1 UI 풀테스트",
    "v320 Step 1 30분/120분 longrun",
  ]) {
    assert(files.releaseRecords.includes(snippet), `release records missing snippet: ${snippet}`);
  }
});

check("inventory coverage and server entrypoint include v3.2 Step 1", () => {
  assert(files.featureCoverageVerifier.includes("verify-v320-entry-baseline"), "feature coverage verifier missing V320 command");
  assert(files.projectInventoryVerifier.includes("SAFE-102") && files.projectInventoryVerifier.includes("OPS-069"), "project inventory verifier missing V320 IDs");
  assert(files.server.includes("verify-v320-entry-baseline"), "server.sh missing V320 command");
  assert(files.server.includes("verify_v320_entry_baseline.mjs"), "server.sh missing V320 script dispatch");
});

check("SAFE-102 canonical V320 source-of-truth boundary", () => {
  const baselineCommandDocumented = files.server.includes("verify-v320-entry-baseline)");
  const currentSourceAligned = semverAtLeast(version, baselineVersion) && files.cmake.includes(`VERSION ${version}`) && currentRoadmap.startsWith(`v${version} `);
  const v320HistoricalBaselinePreserved = files.streamVerification.includes(baselineRoadmap) && files.releaseRecords.includes("v320 Step 1 entry baseline final") && files.featureInventory.includes("SAFE-102");
  const featureCompletionClaimed = files.releaseRecords.includes("SAFE-102 |") && !files.releaseRecords.includes("baseline boundary");
  const safe102BoundaryObserved = baselineCommandDocumented && currentSourceAligned && v320HistoricalBaselinePreserved && featureCompletionClaimed === false;
  assert(safe102BoundaryObserved && (baselineCommandDocumented && currentSourceAligned && v320HistoricalBaselinePreserved && featureCompletionClaimed === false) && featureCompletionClaimed === false,
    "SAFE-102 V320 baseline must align version/roadmap/inventory without claiming feature, UI, long-run, published metadata, or release completion");
});

check("OPS-069 canonical V320 baseline gate", () => {
  const historicalBaselineRecorded = files.featureInventory.includes("source `3.2.0`") &&
    files.featureInventory.includes(`latest published \`${baselineTag}\``) && files.featureInventory.includes(baselineRoadmap);
  const currentSourceNotRegressed = semverAtLeast(version, baselineVersion) &&
    files.cmake.includes(`VERSION ${version}`) && currentRoadmap.startsWith(`v${version} `);
  const historicalStepRecorded = files.releaseRecords.includes("v320 Step 1 entry baseline final") && files.featureInventory.includes("OPS-069");
  const ops069GateObserved = historicalBaselineRecorded && currentSourceNotRegressed && historicalStepRecorded &&
    files.server.includes("verify-v320-entry-baseline)");
  assert(ops069GateObserved && currentSourceNotRegressed && historicalStepRecorded,
    "OPS-069 source/CMake/roadmap, v3.2 published baseline, inventory, and command gate alignment missing");
});

const results = runChecks();

console.log("");
console.log("== v3.2.0 entry baseline summary ==");
console.log("- schema: media-server.v320-entry-baseline.v1");
console.log(`- currentVersion: ${version}`);
console.log(`- currentTag: ${currentTag}`);
console.log(`- latestPublishedTag: ${latestPublishedTag}`);
console.log(`- currentRoadmap: ${currentRoadmap}`);
console.log(`- historicalBaseline: ${baselineTag} ${baselineRoadmap}`);
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
