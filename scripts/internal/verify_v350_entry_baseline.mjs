#!/usr/bin/env node
// 파일 용도: v3.5.0 source baseline 정렬과 v3.4.0 published baseline 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.5.0 entry baseline verification

Usage:
  ./server.sh verify-v350-entry-baseline

Checks:
  - VERSION/CMake and public docs identify source 3.5.0
  - latest published release remains v3.4.0 source-only
  - v3.5.0 roadmap selection is Live Operations Control Plane
  - backlog, stream verification, feature inventory, release records, release metadata, and server dispatch expose this gate
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v350-entry-baseline";
const version = readText("VERSION").trim();
const currentTag = "v3.5.0";
const latestPublishedTag = "v3.4.0";
const currentRoadmap = "v3.5.0 Live Operations Control Plane";
const latestPublishedBaseline = "v3.4.0 Operations Continuity Drill Workspace";
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

const checks = [];

check("source version is v3.5.0 and CMake matches", () => {
  assert(version === "3.5.0", `VERSION must be 3.5.0, got ${version}`);
  assertIncludes(files.cmake, "project(media_server VERSION 3.5.0 LANGUAGES CXX)", "CMake project version");
});

check("public entry docs pin source v3.5.0 and published v3.4.0", () => {
  for (const [label, text, sourceSnippet, roadmapSnippet] of [
    ["README.md", files.readme, "현재 소스 버전: `3.5.0`", `현재 source roadmap: \`${currentRoadmap}\``],
    ["README.en.md", files.readmeEn, "Current source version: `3.5.0`", `Current source roadmap: \`${currentRoadmap}\``],
    ["docs/README.md", files.docsIndex, "현재 소스 버전: `3.5.0`", `현재 source roadmap: \`${currentRoadmap}\``],
    ["docs/en/README.md", files.docsEnIndex, "Current source version: `3.5.0`", `Current source roadmap: \`${currentRoadmap}\``],
  ]) {
    assertIncludes(text, sourceSnippet, label);
    assertIncludes(text, roadmapSnippet, label);
    assertIncludes(text, latestPublishedTag, label);
    assertIncludes(text, "source-only", label);
  }
});

check("versioning and release policy pin v3.5 source and v3.4 published baseline", () => {
  for (const snippet of [
    "현재 소스 버전: `3.5.0`",
    `현재 source roadmap: \`${currentRoadmap}\``,
    `최신 공개 GitHub Release: \`${latestPublishedBaseline}\``,
    "`v3.4.0` 공개 상태: source-only GitHub Release",
    "현재 소스 트리의 `3.5.0` roadmap은 v3.5.0 Live Operations Control Plane",
    "published tag `v3.4.0`와 현재 source tag `v3.5.0`",
    "## 3.5.0 active source roadmap 범위",
    "## v3.4.0 latest published source-only release 범위",
  ]) {
    assertIncludes(files.versioning, snippet, "versioning policy");
  }
  for (const snippet of [
    "현재 소스 버전: `3.5.0`",
    "최신 공개 GitHub Release: `v3.4.0`",
    `현재 source roadmap은 \`${currentRoadmap}\`입니다.`,
    "현재 latest published release는 `v3.4.0`입니다.",
    "현재 공개 release tag 기준은 `v3.4.0`입니다.",
    "현재 source tag 기준은 `v3.5.0`입니다.",
    "## v3.5.0 Source Roadmap Scope",
    "v3.5.0 Step 1 source baseline alignment",
  ]) {
    assertIncludes(files.releasePolicy, snippet, "release policy");
  }
});

check("roadmap records v3.5 Step 1 as completed baseline alignment only", () => {
  for (const snippet of [
    `## 현재 source roadmap: ${currentRoadmap}`,
    "| 1 | v3.5.0 (1) v3.5.0 baseline 정렬 | P0 | 완료 | VERSION/CMake/docs/backlog/source roadmap과 `verify-v350-entry-baseline` 기준 정렬 |",
    "Live Operations Control Plane",
    "Operations Command Core",
    "## v3.5.0 Step 1 개발 기록",
    "`./server.sh verify-v350-entry-baseline`",
    "이번 Step 1은 source/version/docs/backlog/verification metadata 정렬입니다.",
    "UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다.",
    "`v3.5.0` GitHub Release publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 기록합니다.",
  ]) {
    assertIncludes(files.backlog, snippet, "development backlog");
  }
});

check("metadata, asset, stream, inventory, and records expose v3.5 Step 1 gate", () => {
  assertIncludes(files.releaseMetadataVerifier, 'const latestPublishedTag = "v3.4.0";', "release metadata verifier");
  assertIncludes(files.releaseMetadataVerifier, `const currentRoadmap = "${currentRoadmap}";`, "release metadata verifier");
  assertIncludes(files.releaseMetadataVerifier, `const latestPublishedBaseline = "${latestPublishedBaseline}";`, "release metadata verifier");
  assertIncludes(files.docsUiAssetsVerifier, 'const latestPublishedTag = "v3.4.0";', "docs UI assets verifier");
  const manifest = JSON.parse(files.docsUiAssetsManifest);
  assert(manifest.baseline?.sourceVersion === "3.5.0", "docs UI asset manifest source version must be 3.5.0");
  assert(manifest.baseline?.publishedRelease === "v3.4.0", "docs UI asset manifest published release must be v3.4.0");
  for (const snippet of [
    "| v3.5.0 (1) | `./server.sh verify-v350-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` |",
    `source \`3.5.0\`, latest published \`${latestPublishedTag}\`, current roadmap \`${currentRoadmap}\` 정렬`,
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification");
  }
  for (const snippet of [
    "현재 release 목표 `v3.5.0`",
    "v3.5.0 (1) v3.5.0 baseline 정렬 | `OPS-102`, `SAFE-135` | `verify-v350-entry-baseline`",
    "OPS-102 | V350 Step 1 v3.5 baseline 게이트",
    "SAFE-135 | V350 Step 1 v3.5 baseline boundary",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory");
  }
  for (const snippet of [
    "V350 source-of-truth split",
    "`./server.sh verify-v350-entry-baseline`",
    "v350 Step 1 RED entry baseline gate",
    "v350 Step 1 entry baseline final",
    "v350 Step 1 UI 풀테스트",
    "v350 Step 1 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records");
  }
});

check("server entrypoint and inventory verifiers include v3.5 Step 1", () => {
  assertIncludes(files.serverSh, command, "server.sh");
  assertIncludes(files.serverSh, "verify_v350_entry_baseline.mjs", "server.sh");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["SAFE-135", "OPS-102"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.projectInventoryVerifier, "`SAFE-001`~`SAFE-147`", "project inventory SAFE range");
  assertIncludes(files.projectInventoryVerifier, "`OPS-035`~`OPS-114`", "project inventory OPS range");
  assertIncludes(files.scriptInventory, "verify_v350_entry_baseline.mjs", "script inventory");
});

for (const [label, text] of [
  ["docs/public-repo-final-review.md", files.publicReview],
  ["docs/ui-guide.md", files.uiGuide],
  ["docs/assets/ui/README.md", files.assetPolicy],
]) {
  check(`${label} pins v3.5 source wording`, () => {
    assertIncludes(text, "3.5.0", label);
    assertIncludes(text, "v3.5.0", label);
    assertIncludes(text, "Live Operations Control Plane", label);
  });
}

const results = runChecks();
console.log("");
console.log("== v3.5.0 entry baseline summary ==");
console.log("- schema: media-server.v350-entry-baseline.v1");
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
