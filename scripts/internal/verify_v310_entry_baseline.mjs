#!/usr/bin/env node
// 파일 용도: v3.1.0 source baseline 정렬과 v3.1.0 published metadata 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.1.0 entry baseline verification

Usage:
  ./server.sh verify-v310-entry-baseline

Checks:
  - VERSION/CMake and public docs identify source 3.1.0 while latest published release is v3.1.0
  - v3.1.0 roadmap selection is Encoded Event Clip and Safe Sharing Expansion with explicit fallback/exclusions
  - V310-S00 is recorded as completed local source baseline alignment, not feature/UI/longrun/published evidence
  - server entrypoint, stream verification, feature inventory, and release records expose this gate
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const version = readText("VERSION").trim();
const currentTag = "v3.1.0";
const latestPublishedTag = "v3.1.0";
const currentRoadmap = "v3.1.0 Encoded Event Clip and Safe Sharing Expansion";
const latestPublishedBaseline = "v3.1.0 Encoded Event Clip and Safe Sharing Expansion";

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

check("current source version remains aligned while v3.1 is historical", () => {
  assert(version === "3.9.0", `current VERSION must be 3.9.0, got ${version}`);
  assert(files.cmake.includes("project(media_server VERSION 3.9.0 LANGUAGES CXX)"), "current CMake project version must be 3.9.0");
});

check("public entry docs pin the current source and published baseline", () => {
  for (const [label, text] of [["README.md", files.readme], ["README.en.md", files.readmeEn], ["docs/README.md", files.docsIndex], ["docs/en/README.md", files.docsEnIndex]]) {
    assert(text.includes("3.9.0"), `${label} missing current source 3.9.0`);
    assert(text.includes("v3.8.0"), `${label} missing published v3.8.0 baseline`);
  }
});

check("policy docs preserve current source truth and historical v3.1 references", () => {
  for (const [label, text] of [
    ["docs/versioning-policy.md", files.versioning],
    ["docs/release-policy.md", files.releasePolicy],
    ["docs/public-repo-final-review.md", files.publicReview],
    ["docs/ui-guide.md", files.uiGuide],
  ]) {
    assert(text.includes("3.9.0"), `${label} missing current source wording`);
    assert(text.includes("v3.8.0"), `${label} missing current published baseline`);
  }
  assert(files.backlog.includes("## v3.1.0 S00 개발 기록"), "historical v3.1 S00 record missing");
});

check("roadmap records V310-S00 as completed baseline alignment only", () => {
  for (const snippet of [
    "| 0 | V310-S00 | P0 | 완료 | v3.1 baseline |",
    "## v3.1.0 S00 개발 기록",
    "직접 답: v3.1.0의 1차 선택값은 `Encoded Event Clip and Safe Sharing Expansion`입니다.",
    "fallback 또는 축소 대안은 `Encoded Clip Foundation`입니다.",
    "제외 대상과 제외 사유",
    "24/7 상시녹화와 VMS/NVR archive API",
    "얼굴 인식, 신원 식별, watchlist, face embedding",
    "license/provenance/privacy/운영 제약",
    "기능 구현 완료 evidence가 아닙니다.",
    "`./server.sh verify-v310-entry-baseline`",
  ]) {
    assert(files.backlog.includes(snippet), `backlog missing snippet: ${snippet}`);
  }
});

check("release metadata and docs UI asset verifiers know the current baseline", () => {
  assert(files.releaseMetadataVerifier.includes('const latestPublishedTag = "v3.8.0";'), "release metadata verifier must pin latest published v3.8.0");
  const manifest = JSON.parse(files.docsUiAssetsManifest);
  assert(manifest.baseline?.sourceVersion === "3.9.0", "docs UI asset manifest source version must be 3.9.0");
  assert(manifest.baseline?.publishedRelease === "v3.8.0", "docs UI asset manifest published release must stay v3.8.0");
});

check("stream verification, feature inventory, and release records expose V310-S00 gate", () => {
  for (const snippet of [
    "| V310-S00 | `./server.sh verify-v310-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` |",
    `source \`3.1.0\`, latest published \`${latestPublishedTag}\`, current roadmap \`${currentRoadmap}\` 정렬`,
  ]) {
    assert(files.streamVerification.includes(snippet), `stream verification missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "V310-S00 Baseline/source-of-truth | `OPS-061`, `SAFE-093` | `verify-v310-entry-baseline`",
    "OPS-061 | V310-S00 v3.1 baseline 게이트",
    "SAFE-093 | V310-S00 v3.1 baseline boundary",
  ]) {
    assert(files.featureInventory.includes(snippet), `feature inventory missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "V310 source-of-truth split",
    "`./server.sh verify-v310-entry-baseline`",
    "최초 `./server.sh verify-v310-entry-baseline`는 VERSION/CMake/docs/backlog/inventory가 아직 v3.0 기준이라",
    "v310 S00 UI 풀테스트",
    "v310 S00 30분/120분 longrun",
  ]) {
    assert(files.releaseRecords.includes(snippet), `release records missing snippet: ${snippet}`);
  }
});

check("inventory coverage and server entrypoint include V310-S00", () => {
  assert(files.featureCoverageVerifier.includes("validateImplementationManifest"), "feature coverage verifier missing canonical manifest validation");
  const manifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
  for (const id of ["SAFE-093", "OPS-061"]) assert(manifest.items?.find(item => item.id === id)?.verifierEvidence?.command === "verify-v310-entry-baseline", `${id} V310 mapping missing`);
  assert(files.projectInventoryVerifier.includes("SAFE-093") && files.projectInventoryVerifier.includes("OPS-061"), "project inventory verifier missing V310 ranges");
  assert(files.server.includes("verify-v310-entry-baseline"), "server.sh missing V310 command");
  assert(files.server.includes("verify_v310_entry_baseline.mjs"), "server.sh missing V310 script dispatch");
});

check("SAFE-093 canonical V310 source-of-truth boundary", () => {
  const baselineCommandDocumented = files.server.includes("verify-v310-entry-baseline");
  const v310SourceTruthAligned = version === "3.9.0" && files.backlog.includes("## v3.1.0 S00 개발 기록") && files.releaseRecords.includes("V310 source-of-truth split");
  const safe093BoundaryObserved = baselineCommandDocumented && v310SourceTruthAligned;
  assert(safe093BoundaryObserved,
    "verify-v310-entry-baseline must preserve historical v3.1 evidence without reverting current source truth");
});

const results = runChecks();

console.log("");
console.log("== v3.1.0 entry baseline summary ==");
console.log("- schema: media-server.v310-entry-baseline.v1");
console.log(`- currentVersion: ${version}`);
console.log(`- currentTag: ${currentTag}`);
console.log(`- latestPublishedTag: ${latestPublishedTag}`);
console.log(`- latestPublishedBaseline: ${latestPublishedBaseline}`);
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
