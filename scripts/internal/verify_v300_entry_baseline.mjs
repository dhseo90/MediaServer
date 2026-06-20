#!/usr/bin/env node
// 파일 용도: v3.0.0 S00 source baseline 정렬과 published v2.9.0 경계 분리를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.0.0 entry baseline verification

Usage:
  ./server.sh verify-v300-entry-baseline

Checks:
  - VERSION/CMake and public docs identify source 3.0.0 while latest published release remains v2.9.0
  - v3.0.0 roadmap selection is Event Evidence Search MVP with explicit fallback/exclusions
  - V300-S00 is recorded as completed local source baseline alignment, not feature/UI/longrun/published evidence
  - server entrypoint, stream verification, feature inventory, and release records expose this gate
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const version = readText("VERSION").trim();
const currentTag = "v3.0.0";
const latestPublishedTag = "v2.9.0";
const currentRoadmap = "v3.0.0 Event Evidence Search MVP";
const latestPublishedBaseline = "v2.9.0 Final 2.x Closure & Compatibility Baseline";

const files = {
  cmake: readText("CMakeLists.txt"),
  readme: readText("README.md"),
  readmeEn: readText("README.en.md"),
  docsIndex: readText("docs/README.md"),
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

check("source version is v3.0.0 and CMake matches", () => {
  assert(version === "3.0.0", `VERSION must be 3.0.0, got ${version}`);
  assert(files.cmake.includes("project(media_server VERSION 3.0.0 LANGUAGES CXX)"), "CMake project version must be 3.0.0");
});

check("public entry docs split source v3.0.0 from published v2.9.0", () => {
  for (const [label, text, sourceSnippet, roadmapSnippet] of [
    ["README.md", files.readme, "현재 소스 버전: `3.0.0`", "현재 source roadmap: `v3.0.0 Event Evidence Search MVP`"],
    ["README.en.md", files.readmeEn, "Current source version: `3.0.0`", "Current source roadmap: `v3.0.0 Event Evidence Search MVP`"],
    ["docs/README.md", files.docsIndex, "현재 소스 버전: `3.0.0`", "현재 source roadmap: `v3.0.0 Event Evidence Search MVP`"],
  ]) {
    assert(text.includes(sourceSnippet), `${label} missing source snippet: ${sourceSnippet}`);
    assert(text.includes(roadmapSnippet), `${label} missing roadmap snippet: ${roadmapSnippet}`);
    assert(text.includes("v2.9.0") && text.includes("source-only"), `${label} must preserve v2.9.0 source-only published boundary`);
  }
});

check("policy docs pin v3.0 active source and v2.9 published release", () => {
  for (const [label, text] of [
    ["docs/versioning-policy.md", files.versioning],
    ["docs/release-policy.md", files.releasePolicy],
    ["docs/public-repo-final-review.md", files.publicReview],
    ["docs/ui-guide.md", files.uiGuide],
  ]) {
    assert(text.includes("3.0.0"), `${label} missing 3.0.0 source wording`);
    assert(text.includes(latestPublishedTag), `${label} missing latest published ${latestPublishedTag}`);
    assert(text.includes(currentRoadmap), `${label} missing current roadmap ${currentRoadmap}`);
  }
  assert(files.versioning.includes("## 3.0.0 active source roadmap 범위"), "versioning policy missing v3.0 active roadmap section");
  assert(files.releasePolicy.includes("## v3.0.0 Source Roadmap Scope"), "release policy missing v3.0 source roadmap section");
});

check("roadmap records V300-S00 as completed baseline alignment only", () => {
  for (const snippet of [
    "## 현재 source roadmap: v3.0.0 Event Evidence Search MVP",
    "| 0 | V300-S00 | P0 | 완료 | v3.0 baseline |",
    "## v3.0.0 S00 개발 기록",
    "직접 답: v3.0.0의 1차 선택값은 `Event Evidence Search MVP`입니다.",
    "fallback 또는 축소 대안은 `Conservative Foundation`입니다.",
    "제외 대상과 제외 사유",
    "encoded MP4/WebM event clip과 clip playback",
    "얼굴 인식, 신원 식별, watchlist, face embedding",
    "기능 구현 완료 evidence가 아닙니다.",
    "`./server.sh verify-v300-entry-baseline`",
  ]) {
    assert(files.backlog.includes(snippet), `backlog missing snippet: ${snippet}`);
  }
});

check("release metadata and docs UI asset verifiers know source/published split", () => {
  assert(files.releaseMetadataVerifier.includes('const latestPublishedTag = "v2.9.0";'), "release metadata verifier must pin latest published v2.9.0 during v3.0 source work");
  assert(files.releaseMetadataVerifier.includes('const currentRoadmap = "v3.0.0 Event Evidence Search MVP";'), "release metadata verifier missing v3.0 current roadmap");
  assert(files.docsUiAssetsVerifier.includes('const latestPublishedTag = "v2.9.0";'), "docs UI assets verifier must preserve latest published v2.9.0");
  const manifest = JSON.parse(files.docsUiAssetsManifest);
  assert(manifest.baseline?.sourceVersion === "3.0.0", "docs UI asset manifest source version must be 3.0.0");
  assert(manifest.baseline?.publishedRelease === latestPublishedTag, "docs UI asset manifest published release must stay v2.9.0");
});

check("stream verification, feature inventory, and release records expose V300-S00 gate", () => {
  for (const snippet of [
    "| V300-S00 | `./server.sh verify-v300-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` |",
    "source `3.0.0`, latest published `v2.9.0`, current roadmap `v3.0.0 Event Evidence Search MVP` 정렬",
  ]) {
    assert(files.streamVerification.includes(snippet), `stream verification missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "현재 release 목표 `v3.0.0`",
    "V300-S00 Baseline/source-of-truth | `OPS-051`, `SAFE-081` | `verify-v300-entry-baseline`",
    "OPS-051 | V300-S00 v3.0 baseline 게이트",
    "SAFE-081 | V300-S00 v3.0 baseline boundary",
  ]) {
    assert(files.featureInventory.includes(snippet), `feature inventory missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "V300 source-of-truth split",
    "`./server.sh verify-v300-entry-baseline`",
    "최초 `./server.sh verify-v300-entry-baseline`는 command 미구현으로 fail",
    "v300 S00 UI 풀테스트",
    "v300 S00 30분/120분 longrun",
  ]) {
    assert(files.releaseRecords.includes(snippet), `release records missing snippet: ${snippet}`);
  }
});

check("inventory coverage and server entrypoint include V300-S00", () => {
  assert(files.featureCoverageVerifier.includes("verify-v300-entry-baseline"), "feature coverage verifier missing V300 command");
  assert(files.projectInventoryVerifier.includes("SAFE-081") && files.projectInventoryVerifier.includes("OPS-051"), "project inventory verifier missing V300 ranges");
  assert(files.server.includes("verify-v300-entry-baseline"), "server.sh missing V300 command");
  assert(files.server.includes("verify_v300_entry_baseline.mjs"), "server.sh missing V300 script dispatch");
});

const results = runChecks();

console.log("");
console.log("== v3.0.0 entry baseline summary ==");
console.log("- schema: media-server.v300-entry-baseline.v1");
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
