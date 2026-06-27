#!/usr/bin/env node
// 파일 용도: v3.3.0 source baseline 정렬과 v3.2.0 published metadata 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.3.0 entry baseline verification

Usage:
  ./server.sh verify-v330-entry-baseline

Checks:
  - VERSION/CMake and public docs identify source 3.3.0 while latest published release is v3.2.0
  - v3.3.0 roadmap selection is Live Source Reliability Workspace with explicit fallback/exclusions
  - v3.3.0 Step 1 is recorded as completed local source baseline alignment, not feature/UI/longrun/published evidence
  - server entrypoint, stream verification, feature inventory, release records, and release policy expose this gate
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const version = readText("VERSION").trim();
const currentTag = "v3.3.0";
const latestPublishedTag = "v3.2.0";
const currentRoadmap = "v3.3.0 Live Source Reliability Workspace";
const latestPublishedBaseline = "v3.2.0 Operations Resolution Workspace";
const previousPublishedTag = "v3.1.0";
const previousPublishedBaseline = "v3.1.0 Encoded Event Clip and Safe Sharing Expansion";

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
  assetsPolicy: readText("docs/assets/ui/README.md"),
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

check("source version is v3.3.0 and CMake matches", () => {
  assert(version === "3.3.0", `VERSION must be 3.3.0, got ${version}`);
  assert(files.cmake.includes("project(media_server VERSION 3.3.0 LANGUAGES CXX)"), "CMake project version must be 3.3.0");
});

check("public entry docs pin source v3.3.0 and published v3.2.0", () => {
  for (const [label, text, sourceSnippet, roadmapSnippet] of [
    ["README.md", files.readme, "현재 소스 버전: `3.3.0`", `현재 source roadmap: \`${currentRoadmap}\``],
    ["README.en.md", files.readmeEn, "Current source version: `3.3.0`", `Current source roadmap: \`${currentRoadmap}\``],
    ["docs/README.md", files.docsIndex, "현재 소스 버전: `3.3.0`", `현재 source roadmap: \`${currentRoadmap}\``],
    ["docs/en/README.md", files.docsEnIndex, "Current source version: `3.3.0`", `Current source roadmap: \`${currentRoadmap}\``],
  ]) {
    assert(text.includes(sourceSnippet), `${label} missing source snippet: ${sourceSnippet}`);
    assert(text.includes(roadmapSnippet), `${label} missing roadmap snippet: ${roadmapSnippet}`);
    assert(text.includes(latestPublishedTag) && text.includes("source-only"), `${label} must preserve ${latestPublishedTag} source-only published boundary`);
  }
});

check("policy docs pin v3.3 active source and v3.2 published release", () => {
  for (const [label, text] of [
    ["docs/versioning-policy.md", files.versioning],
    ["docs/release-policy.md", files.releasePolicy],
    ["docs/public-repo-final-review.md", files.publicReview],
    ["docs/ui-guide.md", files.uiGuide],
  ]) {
    assert(text.includes("3.3.0"), `${label} missing 3.3.0 source wording`);
    assert(text.includes(latestPublishedTag), `${label} missing latest published ${latestPublishedTag}`);
    assert(text.includes(currentRoadmap), `${label} missing current roadmap ${currentRoadmap}`);
  }
  assert(files.versioning.includes("## 3.3.0 active source roadmap 범위"), "versioning policy missing v3.3 active roadmap section");
  assert(files.releasePolicy.includes("## v3.3.0 Source Roadmap Scope"), "release policy missing v3.3 source roadmap section");
  assert(files.releasePolicy.includes("`./server.sh verify-v330-entry-baseline`"), "release policy missing v3.3 entry baseline companion gate");
  assert(files.assetsPolicy.includes("## v3.3.0 Step 1 source baseline alignment"), "docs asset policy missing v3.3 Step 1 boundary");
});

check("roadmap records v3.3 Step 1 as completed baseline alignment only", () => {
  for (const snippet of [
    "## 현재 source roadmap: v3.3.0 Live Source Reliability Workspace",
    "직접 답: v3.3.0의 1차 선택값은 `Live Source Reliability Workspace`입니다.",
    "fallback 또는 축소 대안은 `Source Reliability Core`입니다.",
    "제외 대상과 제외 사유",
    "ONVIF 실장비 중심 roadmap: 실장비와 credential 준비가 source-only local 개발 범위의",
    "VLM default-on 또는 provider 품질 중심 roadmap: 모델/runtime/provider 품질 판단이",
    "license/provenance/privacy/운영 검토 결과",
    "viewer/client에는 source 상태 요약과 viewer-safe digest만 제공하고, 운영자용 locator,",
    "| 1 | v3.3.0 (1) v3.3.0 roadmap/source baseline 정렬 | P0 | 완료 |",
    "| 2 | v3.3.0 (2) Source Registry Snapshot and Identity | P0 | 완료 |",
    "`./server.sh verify-v330-entry-baseline`",
    "## v3.3.0 Step 1 개발 기록",
    "Step 1은 source/version/docs/backlog/verification metadata 정렬입니다.",
  ]) {
    assert(files.backlog.includes(snippet), `backlog missing snippet: ${snippet}`);
  }
});

check("release metadata and docs UI asset verifiers know source v3.3 and published v3.2 baseline", () => {
  assert(files.releaseMetadataVerifier.includes('const latestPublishedTag = "v3.2.0";'), "release metadata verifier must keep latest published v3.2.0");
  assert(files.releaseMetadataVerifier.includes(`const currentRoadmap = "${currentRoadmap}";`), "release metadata verifier missing v3.3 current roadmap");
  assert(files.releaseMetadataVerifier.includes(`const latestPublishedBaseline = "${latestPublishedBaseline}";`), "release metadata verifier missing v3.2 published baseline");
  assert(files.docsUiAssetsVerifier.includes('const latestPublishedTag = "v3.2.0";'), "docs UI assets verifier must preserve latest published v3.2.0");
  const manifest = JSON.parse(files.docsUiAssetsManifest);
  assert(manifest.baseline?.sourceVersion === "3.3.0", "docs UI asset manifest source version must be 3.3.0");
  assert(manifest.baseline?.publishedRelease === latestPublishedTag, "docs UI asset manifest published release must stay v3.2.0");
  assert(manifest.baseline?.publicReleaseStatus === "v3.2.0-published-source-only", "docs UI asset manifest public release status must stay v3.2.0 source-only");
});

check("stream verification, feature inventory, and release records expose v3.3 Step 1 gate", () => {
  for (const snippet of [
    "| v3.3.0 (1) | `./server.sh verify-v330-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` |",
    `source \`3.3.0\`, latest published \`${latestPublishedTag}\`, current roadmap \`${currentRoadmap}\` 정렬`,
  ]) {
    assert(files.streamVerification.includes(snippet), `stream verification missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "현재 release 목표 `v3.3.0`",
    "v3.3.0 (1) v3.3.0 roadmap/source baseline 정렬 | `OPS-080`, `SAFE-113` | `verify-v330-entry-baseline`",
    "OPS-080 | V330 Step 1 v3.3 baseline 게이트",
    "SAFE-113 | V330 Step 1 v3.3 baseline boundary",
  ]) {
    assert(files.featureInventory.includes(snippet), `feature inventory missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "V330 source-of-truth split",
    "`./server.sh verify-v330-entry-baseline`",
    "최초 `node scripts/internal/verify_v330_entry_baseline.mjs`는 source version/docs/inventory/server dispatch가 아직 v3.3 기준이 아니어서",
    "v330 Step 1 entry baseline final",
    "v330 Step 1 UI 풀테스트",
    "v330 Step 1 30분/120분 longrun",
  ]) {
    assert(files.releaseRecords.includes(snippet), `release records missing snippet: ${snippet}`);
  }
});

check("inventory coverage and server entrypoint include v3.3 Step 1", () => {
  assert(files.featureCoverageVerifier.includes("verify-v330-entry-baseline"), "feature coverage verifier missing V330 command");
  assert(files.projectInventoryVerifier.includes("SAFE-113") && files.projectInventoryVerifier.includes("OPS-080"), "project inventory verifier missing V330 IDs");
  assert(files.projectInventoryVerifier.includes("`SAFE-001`~`SAFE-123`"), "project inventory verifier missing V330 SAFE range");
  assert(files.projectInventoryVerifier.includes("`OPS-035`~`OPS-090`"), "project inventory verifier missing V330 OPS range");
  assert(files.server.includes("verify-v330-entry-baseline"), "server.sh missing V330 command");
  assert(files.server.includes("verify_v330_entry_baseline.mjs"), "server.sh missing V330 script dispatch");
});

const results = runChecks();

console.log("");
console.log("== v3.3.0 entry baseline summary ==");
console.log("- schema: media-server.v330-entry-baseline.v1");
console.log(`- currentVersion: ${version}`);
console.log(`- currentTag: ${currentTag}`);
console.log(`- latestPublishedTag: ${latestPublishedTag}`);
console.log(`- latestPublishedBaseline: ${latestPublishedBaseline}`);
console.log(`- previousPublishedTag: ${previousPublishedTag}`);
console.log(`- previousPublishedBaseline: ${previousPublishedBaseline}`);
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
