#!/usr/bin/env node
// 파일 용도: v3.9.0 historical baseline과 현재 source의 비회귀 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {
  loadV390EntryBaselineExpectation,
  validateV390EntryBaselineSteps,
} from "./v390_entry_baseline_state_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 historical entry baseline verification

Usage:
  ./server.sh verify-v390-entry-baseline

Checks:
  - current VERSION/CMake/roadmap do not regress below the v3.9.0 baseline
  - public entry docs separate the current source from latest published v3.9.0
  - historical v3.9.0 roadmap/backlog and feature completion inventory remain wired
  - server.sh and verify-script-inventory know the v3.9.0 entry baseline command

Not run by this command:
  - feature implementation
  - discovery completion
  - UI fulltest
  - 30/120 minute longrun
  - published metadata verification
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-entry-baseline";
const baselineVersion = "3.9.0";
const baselineRoadmap = "v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation";
const latestPublishedTag = "v3.9.0";
const latestPublishedBaseline = baselineRoadmap;
const targetScript = "verify_v390_entry_baseline.mjs";

const files = {
  cmake: readText("CMakeLists.txt"),
  readme: readText("README.md"),
  readmeEn: readText("README.en.md"),
  docsIndex: readText("docs/README.md"),
  docsEnIndex: readText("docs/en/README.md"),
  versioning: readText("docs/versioning-policy.md"),
  uiAssetsReadme: readText("docs/assets/ui/README.md"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  releaseMetadataVerifier: readText("scripts/internal/verify_release_metadata_consistency.mjs"),
  featureInventory: readText("docs/v390-feature-completion-inventory.md"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  acceptanceRunner: readText("scripts/internal/verify_v390_test_acceptance_bundle.mjs"),
  serverSh: readText("server.sh"),
};

const version = readText("VERSION").trim();
const currentRoadmap = requiredMatch(files.versioning, /- 현재 source roadmap: `([^`]+)`/, "current source roadmap");
const checks = [];

check("current source and CMake align while v3.9.0 remains historical", () => {
  assert(semverAtLeast(version, baselineVersion), `current VERSION ${version} predates v3.9.0 baseline`);
  assertIncludes(files.cmake, `project(media_server VERSION ${version} LANGUAGES CXX)`, "CMake project version");
  assert(currentRoadmap.startsWith(`v${version} `), `current roadmap must match source ${version}: ${currentRoadmap}`);
});

check("public entry docs align current source and latest published v3.9.0", () => {
  const docs = [
    {
      label: "README.md",
      text: files.readme,
      sourceSnippets: [`현재 소스 버전: \`${version}\``, `현재 source roadmap: \`${currentRoadmap}\``],
    },
    {
      label: "README.en.md",
      text: files.readmeEn,
      sourceSnippets: [`Current source version: \`${version}\``, `Current source roadmap: \`${currentRoadmap}\``],
    },
    {
      label: "docs/README.md",
      text: files.docsIndex,
      sourceSnippets: [`현재 소스 버전: \`${version}\``, `현재 source roadmap: \`${currentRoadmap}\``],
    },
    {
      label: "docs/en/README.md",
      text: files.docsEnIndex,
      sourceSnippets: [`Current source version: \`${version}\``, `Current source roadmap: \`${currentRoadmap}\``],
    },
  ];

  for (const doc of docs) {
    for (const snippet of doc.sourceSnippets) {
      assertIncludes(doc.text, snippet, doc.label);
    }
    assertIncludes(doc.text, latestPublishedTag, doc.label);
    assertIncludes(doc.text, latestPublishedBaseline, doc.label);
    assertIncludes(doc.text, "source-only", doc.label);
  }
});

check("development backlog separates current source from historical v3.9 baseline", () => {
  for (const snippet of [
    `현재 소스 버전: \`${version}\``,
    "최신 공개 GitHub Release: `v3.9.0`",
    `현재 source roadmap: \`${currentRoadmap}\``,
    `최신 published baseline: \`${latestPublishedBaseline}\``,
    `## 현재 source roadmap: ${currentRoadmap}`,
    "### v3.9.0 진행 상태",
    "| Foundation | v3.9.0 (1) v3.9.0 baseline 정렬 | P0 | VERSION/docs/backlog/source roadmap 정렬 |",
    "| Foundation | v3.9.0 (2) Feature Completion Inventory/Discovery Gate | P0 |",
    "## 이전 source roadmap 기록: v3.8.0 Operator-Gated Action Pilot & Outcome Loop",
    "## 최신 공개 기준: v3.9.0 Source Release Baseline",
    "## 직전 공개 기준: v3.8.0 Source Release Baseline",
    "후속 이슈는 현재 source tree와 현재 v3.9 스텝 범위 안에서",
  ]) {
    assertIncludes(files.backlog, snippet, "development backlog");
  }
});

check("development backlog current Step 1-3 state matches the structured expectation", () => {
  const expectation = loadV390EntryBaselineExpectation(rootDir);
  const result = validateV390EntryBaselineSteps(files.backlog, expectation);
  assert(result.ok, result.errors.join("; "));
});

check("actual acceptance command list uses the same v3.9 entry verifier", () => {
  assertIncludes(
    files.acceptanceRunner,
    '"verify-v390-entry-baseline",',
    "v3.9 actual acceptance feature command list",
  );
});

check("v3.9 feature completion inventory scaffold has title, source-of-truth relation, seed row, and review gate", () => {
  for (const snippet of [
    "# v3.9.0 Feature Completion Inventory",
    "Source-of-truth 관계",
    "이 문서는 구현 완료 evidence가 아니다.",
    "| V390-DISCOVERY-000 | approved design | inventory seed row |",
    "`verify-v390-feature-completion-inventory` passes",
    "## Review Gate",
    "Until this review gate passes, this file remains a discovery tracking scaffold only.",
  ]) {
    assertIncludes(files.featureInventory, snippet, "v3.9 feature completion inventory");
  }
});

check("stream verification records current v3.9 verifier boundary", () => {
  for (const snippet of [
    "## 현재 v3.9.0 verifier",
    "v3.9.0 (1)",
    "verify-v390-entry-baseline",
    "verify-release-metadata",
    "verify-docs-links",
    "verify-docs-ui-assets",
    "feature discovery 완료",
    "published metadata, release action evidence가 아닙니다",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.9 boundary");
  }
});

check("project inventory maps current source and historical v3.9 baseline IDs", () => {
  for (const snippet of [
    `현재 release 목표 \`v${version}\``,
    "## v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation Coverage Mapping",
    "v3.9.1 release correction",
    "v3.9.0 (1) v3.9.0 baseline 정렬",
    "`OPS-163`, `SAFE-196`",
    "verify-v390-entry-baseline",
    "feature discovery/dev, UI 풀테스트, 30분/120분, published metadata, PR/main/tag/GitHub Release evidence와는 별도 gate",
    "| SAFE-196 |",
    "| OPS-163 |",
  ]) {
    assertIncludes(files.projectInventory, snippet, "project inventory v3.9 source baseline");
  }
});

check("release records and evidence index track v3.9 source baseline boundary", () => {
  for (const snippet of [
    "### v3.9.0",
    "v390 Step 1 RED entry baseline gate",
    "v390 Step 1 entry baseline final",
    "feature discovery/dev, UI 풀테스트, 30분/120분, published metadata, release action은 not-run-by-this-command",
    "#### v3.9.0 미실행/제외",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release test records v3.9 source baseline");
  }
  for (const snippet of [
    "## v3.9.0 source baseline, feature completion inventory, and user review gate records",
    "v3.9.0 source baseline",
    "OPS-163",
    "SAFE-196",
    "published metadata, PR/main/tag/GitHub Release",
  ]) {
    assertIncludes(files.releaseEvidence, snippet, "release evidence index v3.9 source baseline");
  }
});

check("release metadata verifier expects v3.9 source and latest published boundary", () => {
  for (const snippet of [
    'const latestPublishedTag = "v3.9.0";',
    `const currentRoadmap = "${currentRoadmap}";`,
    "publishedMode ? \"published-release\" : \"local-release-metadata\"",
    "Default mode checks local release metadata only",
  ]) {
    assertIncludes(files.releaseMetadataVerifier, snippet, "release metadata verifier v3.9 boundary");
  }
});

check("UI asset policy records current source, v3.9 published, and v3.8 previous baseline boundary", () => {
  for (const snippet of [
    `현재 source tree는 \`v${version}\``,
    "최신 공개 GitHub Release는 `v3.9.0` Feature Completion, Structure Stabilization, and Test Model Preparation",
    "직전 `v3.8.0`",
    "UI 풀테스트, 공개 릴리즈 증거로 쓰지 않습니다",
    "image recapture, 직접 브라우저 검수, UI 풀테스트, 30분/120분, published metadata는",
  ]) {
    assertIncludes(files.uiAssetsReadme, snippet, "UI asset policy v3.9 boundary");
  }
});

check("server entrypoint dispatches v3.9 entry baseline", () => {
  assertIncludes(files.serverSh, command, "server.sh");
  assertIncludes(files.serverSh, targetScript, "server.sh");
  assertIncludes(files.serverSh, "verify-v390-entry-baseline-contract", "server.sh");
  assertIncludes(files.serverSh, "verify_v390_entry_baseline_contract.mjs", "server.sh");
});

check("script inventory explicitly tracks v3.9 entry baseline script", () => {
  assertIncludes(files.scriptInventory, targetScript, "script inventory");
});

check("SAFE-196 canonical source baseline no-overclaim boundary", () => {
  const currentSourceAligned = semverAtLeast(version, baselineVersion) &&
    files.cmake.includes(`VERSION ${version}`) && currentRoadmap.startsWith(`v${version} `);
  const publishedBaselineSeparated = latestPublishedTag === "v3.9.0" &&
    files.releaseRecords.includes("v390 Step 1 entry baseline final") &&
    files.projectInventory.includes(baselineRoadmap);
  const executionPassClaimed = !(files.releaseRecords.includes("feature discovery/dev") && files.releaseRecords.includes("not-run-by-this-command"));
  const safe196BoundaryObserved = currentSourceAligned && publishedBaselineSeparated && files.projectInventory.includes("SAFE-196");
  const ops163BaselineObserved = safe196BoundaryObserved;
  assert(ops163BaselineObserved && safe196BoundaryObserved && executionPassClaimed === false,
    "SAFE-196 current 3.9 source baseline must not claim feature discovery development UI longrun or release execution PASS");
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 entry baseline summary ==");
console.log("- schema: media-server.v390-entry-baseline.v1");
console.log(`- command: ${command}`);
console.log(`- currentVersion: ${version}`);
console.log(`- currentRoadmap: ${currentRoadmap}`);
console.log(`- historicalBaseline: v${baselineVersion} ${baselineRoadmap}`);
console.log(`- latestPublishedTag: ${latestPublishedTag}`);
console.log(`- latestPublishedBaseline: ${latestPublishedBaseline}`);
console.log("- featureImplementation: not-run-by-this-command");
console.log("- discoveryCompletion: not-run-by-this-command");
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
