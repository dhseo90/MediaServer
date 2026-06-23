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
const currentTag = "v3.2.0";
const latestPublishedTag = "v3.2.0";
const currentRoadmap = "v3.2.0 Operations Resolution Workspace";
const latestPublishedBaseline = "v3.2.0 Operations Resolution Workspace";

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

check("source version is v3.2.0 and CMake matches", () => {
  assert(version === "3.2.0", `VERSION must be 3.2.0, got ${version}`);
  assert(files.cmake.includes("project(media_server VERSION 3.2.0 LANGUAGES CXX)"), "CMake project version must be 3.2.0");
});

check("public entry docs pin source v3.2.0 and published v3.2.0", () => {
  for (const [label, text, sourceSnippet, roadmapSnippet] of [
    ["README.md", files.readme, "현재 소스 버전: `3.2.0`", `현재 source roadmap: \`${currentRoadmap}\``],
    ["README.en.md", files.readmeEn, "Current source version: `3.2.0`", `Current source roadmap: \`${currentRoadmap}\``],
    ["docs/README.md", files.docsIndex, "현재 소스 버전: `3.2.0`", `현재 source roadmap: \`${currentRoadmap}\``],
    ["docs/en/README.md", files.docsEnIndex, "Current source version: `3.2.0`", `Current source roadmap: \`${currentRoadmap}\``],
  ]) {
    assert(text.includes(sourceSnippet), `${label} missing source snippet: ${sourceSnippet}`);
    assert(text.includes(roadmapSnippet), `${label} missing roadmap snippet: ${roadmapSnippet}`);
    assert(text.includes(latestPublishedTag) && text.includes("source-only"), `${label} must preserve ${latestPublishedTag} source-only published boundary`);
  }
});

check("policy docs pin v3.2 active source and v3.2 published release", () => {
  for (const [label, text] of [
    ["docs/versioning-policy.md", files.versioning],
    ["docs/release-policy.md", files.releasePolicy],
    ["docs/public-repo-final-review.md", files.publicReview],
    ["docs/ui-guide.md", files.uiGuide],
  ]) {
    assert(text.includes("3.2.0"), `${label} missing 3.2.0 source wording`);
    assert(text.includes(latestPublishedTag), `${label} missing latest published ${latestPublishedTag}`);
    assert(text.includes(currentRoadmap), `${label} missing current roadmap ${currentRoadmap}`);
  }
  assert(files.versioning.includes("## 3.2.0 active source roadmap 범위"), "versioning policy missing v3.2 active roadmap section");
  assert(files.releasePolicy.includes("## v3.2.0 Source Roadmap Scope"), "release policy missing v3.2 source roadmap section");
  assert(files.releasePolicy.includes("`./server.sh verify-v320-entry-baseline`"), "release policy missing v3.2 entry baseline companion gate");
});

check("roadmap records v3.2 Step 1 as completed baseline alignment only", () => {
  for (const snippet of [
    "## 현재 source roadmap: v3.2.0 Operations Resolution Workspace",
    "Step 11 Stabilization and Release Readiness local gate 연결 완료.",
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

check("release metadata and docs UI asset verifiers know source v3.2 and published v3.2 baseline", () => {
  assert(files.releaseMetadataVerifier.includes('const latestPublishedTag = "v3.2.0";'), "release metadata verifier must keep latest published v3.2.0");
  assert(files.releaseMetadataVerifier.includes(`const currentRoadmap = "${currentRoadmap}";`), "release metadata verifier missing v3.2 current roadmap");
  assert(files.docsUiAssetsVerifier.includes('const latestPublishedTag = "v3.2.0";'), "docs UI assets verifier must preserve latest published v3.2.0");
  const manifest = JSON.parse(files.docsUiAssetsManifest);
  assert(manifest.baseline?.sourceVersion === "3.2.0", "docs UI asset manifest source version must be 3.2.0");
  assert(manifest.baseline?.publishedRelease === latestPublishedTag, "docs UI asset manifest published release must stay v3.2.0");
  assert(manifest.baseline?.publicReleaseStatus === "v3.2.0-published-source-only", "docs UI asset manifest public release status must stay v3.2.0 source-only");
});

check("stream verification, feature inventory, and release records expose v3.2 Step 1 gate", () => {
  for (const snippet of [
    "| v3.2.0 (1) | `./server.sh verify-v320-entry-baseline`, `./server.sh verify-release-metadata`, `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets` |",
    `source \`3.2.0\`, latest published \`${latestPublishedTag}\`, current roadmap \`${currentRoadmap}\` 정렬`,
  ]) {
    assert(files.streamVerification.includes(snippet), `stream verification missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "현재 release 목표 `v3.2.0`",
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
  assert(files.projectInventoryVerifier.includes("`SAFE-001`~`SAFE-112`"), "project inventory verifier missing V320 SAFE range");
  assert(files.projectInventoryVerifier.includes("`OPS-035`~`OPS-079`"), "project inventory verifier missing V320 OPS range");
  assert(files.server.includes("verify-v320-entry-baseline"), "server.sh missing V320 command");
  assert(files.server.includes("verify_v320_entry_baseline.mjs"), "server.sh missing V320 script dispatch");
});

const results = runChecks();

console.log("");
console.log("== v3.2.0 entry baseline summary ==");
console.log("- schema: media-server.v320-entry-baseline.v1");
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
