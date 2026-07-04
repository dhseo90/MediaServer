#!/usr/bin/env node
// 파일 용도: v3.7.0 source baseline, roadmap, docs, verifier 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.7.0 entry baseline verification

Usage:
  ./server.sh verify-v370-entry-baseline

Checks:
  - VERSION/CMake and public docs identify source 3.7.0
  - latest published release is v3.6.0 source-only
  - v3.7.0 roadmap selection is Site-Aware Operations and Safe Runbook Control Plane
  - backlog, stream verification, release records, feature inventory, and dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v370-entry-baseline";
const currentRoadmap = "v3.7.0 Site-Aware Operations and Safe Runbook Control Plane";
const latestPublishedTag = "v3.6.0";
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
const checks = [];

check("source version is v3.7.0 and CMake matches", () => {
  assert(version === "3.7.0", `VERSION must be 3.7.0, got ${version}`);
  assertIncludes(files.cmake, "project(media_server VERSION 3.7.0 LANGUAGES CXX)", "CMake project version");
});

check("public entry docs pin source v3.7.0 and published v3.6.0", () => {
  for (const [label, text, sourceSnippet, roadmapSnippet] of [
    ["README.md", files.readme, "현재 소스 버전: `3.7.0`", `현재 source roadmap: \`${currentRoadmap}\``],
    ["README.en.md", files.readmeEn, "Current source version: `3.7.0`", `Current source roadmap: \`${currentRoadmap}\``],
    ["docs/README.md", files.docsIndex, "현재 소스 버전: `3.7.0`", `현재 source roadmap: \`${currentRoadmap}\``],
    ["docs/en/README.md", files.docsEnIndex, "Current source version: `3.7.0`", `Current source roadmap: \`${currentRoadmap}\``],
  ]) {
    assertIncludes(text, sourceSnippet, label);
    assertIncludes(text, roadmapSnippet, label);
    assertIncludes(text, latestPublishedTag, label);
    assertIncludes(text, "source-only", label);
  }
});

check("versioning and release policy pin v3.7 source and v3.6 published baseline", () => {
  for (const snippet of [
    "현재 소스 버전: `3.7.0`",
    `현재 source roadmap: \`${currentRoadmap}\``,
    "최신 공개 GitHub Release: `v3.6.0`",
    "## 3.7.0 active source roadmap 범위",
    "Site-Aware Operations and Safe Runbook Control Plane",
  ]) {
    assertIncludes(files.versioning, snippet, "versioning policy");
  }
  for (const snippet of [
    "현재 소스 버전: `3.7.0`",
    "최신 공개 GitHub Release: `v3.6.0`",
    `현재 source roadmap은 \`${currentRoadmap}\`입니다.`,
    "## v3.7.0 Source Roadmap Scope",
    "v3.7.0 Step 1 source baseline alignment",
  ]) {
    assertIncludes(files.releasePolicy, snippet, "release policy");
  }
});

check("roadmap records v3.7 Step 1 as completed baseline alignment only", () => {
  for (const snippet of [
    `## 현재 source roadmap: ${currentRoadmap}`,
    "| 1 | v3.7.0 (1) v3.7.0 baseline 정렬 | P0 | 완료 | VERSION/CMake/docs/backlog/source roadmap과 `verify-v370-entry-baseline` 기준 정렬 |",
    "Site / Source Group Contract",
    "Site Health Rollup",
    "Site Operations Workspace UI",
    "Limited Safe Execution Pilot",
    "## v3.7.0 Step 1 개발 기록",
    "`./server.sh verify-v370-entry-baseline`",
    "이번 Step 1은 source/version/docs/backlog/verification metadata 정렬입니다.",
    "UI 풀테스트, 30분/120분 장시간 테스트, published metadata, release action 완료 evidence가 아닙니다.",
  ]) {
    assertIncludes(files.backlog, snippet, "development backlog");
  }
});

check("metadata, asset, stream, inventory, and records expose v3.7 Step 1 gate", () => {
  assertIncludes(files.releaseMetadataVerifier, 'const latestPublishedTag = "v3.6.0";', "release metadata verifier");
  assertIncludes(files.releaseMetadataVerifier, `const currentRoadmap = "${currentRoadmap}";`, "release metadata verifier");
  assertIncludes(files.docsUiAssetsVerifier, 'const latestPublishedTag = "v3.6.0";', "docs UI assets verifier");
  const manifest = JSON.parse(files.docsUiAssetsManifest);
  assert(manifest.baseline?.sourceVersion === "3.7.0", "docs UI asset manifest source version must be 3.7.0");
  assert(manifest.baseline?.publishedRelease === "v3.6.0", "docs UI asset manifest published release must be v3.6.0");
  for (const snippet of [
    "| v3.7.0 (1) | `./server.sh verify-v370-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` |",
    "source `3.7.0`, latest published `v3.6.0`, current roadmap `v3.7.0 Site-Aware Operations and Safe Runbook Control Plane` 정렬",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification");
  }
  for (const snippet of [
    "현재 release 목표 `v3.7.0`",
    "v3.7.0 (1) v3.7.0 baseline 정렬 | `OPS-129`, `SAFE-162` | `verify-v370-entry-baseline`",
    "OPS-129 | V370 Step 1 v3.7 baseline 게이트",
    "SAFE-162 | V370 Step 1 v3.7 baseline boundary",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory");
  }
  for (const snippet of [
    "V370 source-of-truth split",
    "`./server.sh verify-v370-entry-baseline`",
    "v370 Step 1 RED entry baseline gate",
    "v370 Step 1 entry baseline final",
    "v370 Step 1 UI 풀테스트",
    "v370 Step 1 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records");
  }
});

check("server entrypoint and inventory verifiers include v3.7 Step 1", () => {
  assertIncludes(files.serverSh, command, "server.sh");
  assertIncludes(files.serverSh, "verify_v370_entry_baseline.mjs", "server.sh");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["SAFE-162", "OPS-129"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.projectInventoryVerifier, "`SAFE-001`~`SAFE-165`", "project inventory SAFE range");
  assertIncludes(files.projectInventoryVerifier, "`OPS-035`~`OPS-132`", "project inventory OPS range");
  assertIncludes(files.scriptInventory, "verify_v370_entry_baseline.mjs", "script inventory");
});

for (const [label, text] of [
  ["docs/public-repo-final-review.md", files.publicReview],
  ["docs/ui-guide.md", files.uiGuide],
  ["docs/assets/ui/README.md", files.assetPolicy],
]) {
  check(`${label} pins v3.7 source wording`, () => {
    assertIncludes(text, "3.7.0", label);
    assertIncludes(text, "v3.7.0", label);
    assertIncludes(text, "Site-Aware Operations and Safe Runbook Control Plane", label);
  });
}

const results = runChecks();
console.log("");
console.log("== v3.7.0 entry baseline summary ==");
console.log("- schema: media-server.v370-entry-baseline.v1");
console.log(`- currentVersion: ${version}`);
console.log("- latestPublishedTag: v3.6.0");
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
