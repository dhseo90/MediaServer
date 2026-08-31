#!/usr/bin/env node
// 파일 용도: v4.0.0 current source baseline과 published v3.9.1 분리를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v4.0.0 entry baseline verification

Usage:
  ./server.sh verify-v400-entry-baseline

Checks:
  - VERSION/CMake current source are 4.0.0
  - current source roadmap is v4.0.0 Local Operations Policy and Stabilization
  - latest published GitHub Release remains v3.9.1
  - public docs and release metadata separate current source from published
  - inventory, stream-verification, records, and server.sh dispatch are wired

Not run by this command:
  - v4.0.0 steps 2-8
  - feature implementation
  - UI fulltest
  - 30/120 minute longrun
  - published metadata verification
  - tag, push, GitHub Release
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v400-entry-baseline";
const expectedVersion = "4.0.0";
const expectedTag = `v${expectedVersion}`;
const currentRoadmap = "v4.0.0 Local Operations Policy and Stabilization";
const latestPublishedTag = "v3.9.1";
const latestPublishedBaseline = "v3.9.1 Release Correctness and Public Repository Hygiene";
const previousPublishedTag = "v3.9.0";
const previousPublishedBaseline = "v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation";
const targetScript = "verify_v400_entry_baseline.mjs";

const files = {
  cmake: readText("CMakeLists.txt"),
  readme: readText("README.md"),
  readmeEn: readText("README.en.md"),
  docsIndex: readText("docs/README.md"),
  docsEnIndex: readText("docs/en/README.md"),
  versioning: readText("docs/versioning-policy.md"),
  releasePolicy: readText("docs/release-policy.md"),
  uiGuide: readText("docs/ui-guide.md"),
  uiAssetsReadme: readText("docs/assets/ui/README.md"),
  publicReview: readText("docs/public-repo-final-review.md"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  releaseMetadataVerifier: readText("scripts/internal/verify_release_metadata_consistency.mjs"),
  roadmapContract: readText("scripts/internal/verify_v400_roadmap_contract.mjs"),
  serverSh: readText("server.sh"),
};
const version = readText("VERSION").trim();
const checks = [];

check("VERSION and CMake pin current source 4.0.0", () => {
  assert(version === expectedVersion, `VERSION must be ${expectedVersion}, got ${version}`);
  assertIncludes(files.cmake, `project(media_server VERSION ${expectedVersion} LANGUAGES CXX)`, "CMake project version");
});

check("versioning policy separates current 4.0.0 from published v3.9.1", () => {
  for (const snippet of [
    `현재 소스 버전: \`${expectedVersion}\``,
    `현재 source roadmap: \`${currentRoadmap}\``,
    `최신 공개 GitHub Release: \`${latestPublishedTag}\``,
    `최신 공개 roadmap: \`${latestPublishedBaseline}\``,
    `## v4.0.0 현재 source 개발 범위`,
    `\`${expectedTag}\`는 아직 생성하지 않습니다`,
    "신규 기능은 `v4.1.0`부터 넣는다",
  ]) {
    assertIncludes(files.versioning, snippet, "versioning policy");
  }
});

check("public entry docs pin current source and keep published v3.9.1", () => {
  const docs = [
    {
      label: "README.md",
      text: files.readme,
      sourceSnippets: [`현재 소스 버전: \`${expectedVersion}\``, `현재 source roadmap: \`${currentRoadmap}\``],
    },
    {
      label: "README.en.md",
      text: files.readmeEn,
      sourceSnippets: [`Current source version: \`${expectedVersion}\``, `Current source roadmap: \`${currentRoadmap}\``],
    },
    {
      label: "docs/README.md",
      text: files.docsIndex,
      sourceSnippets: [`현재 소스 버전: \`${expectedVersion}\``, `현재 source roadmap: \`${currentRoadmap}\``],
    },
    {
      label: "docs/en/README.md",
      text: files.docsEnIndex,
      sourceSnippets: [`Current source version: \`${expectedVersion}\``, `Current source roadmap: \`${currentRoadmap}\``],
    },
  ];
  for (const doc of docs) {
    for (const snippet of doc.sourceSnippets) {
      assertIncludes(doc.text, snippet, doc.label);
    }
    assertIncludes(doc.text, latestPublishedTag, doc.label);
    assertIncludes(doc.text, latestPublishedBaseline, doc.label);
    assertIncludes(doc.text, previousPublishedBaseline, doc.label);
    assertIncludes(doc.text, "source-only", doc.label);
    assert(!doc.text.includes(`${expectedTag}](https://github.com/dhseo90/MediaServer/releases/tag/${expectedTag})`),
      `${doc.label} must not claim a GitHub Release for unpublished ${expectedTag}`);
  }
});

check("release policy keeps published v3.9.1 and does not create a v4.0.0 tag", () => {
  for (const snippet of [
    `현재 소스 버전: \`${expectedVersion}\``,
    `현재 source roadmap은 \`${currentRoadmap}\`입니다.`,
    `현재 latest published release는 \`${latestPublishedTag}\`입니다.`,
    `현재 공개 release tag 기준은 \`${latestPublishedTag}\`입니다.`,
    `\`${expectedTag}\` GitHub Release/tag는 아직 생성하지 않습니다`,
    `\`${latestPublishedTag}\` GitHub Release publish 완료는 tag, GitHub Release,`,
  ]) {
    assertIncludes(files.releasePolicy, snippet, "release policy");
  }
});

check("development backlog current roadmap is v4.0.0 and step 1 is developed", () => {
  for (const snippet of [
    `현재 소스 버전: \`${expectedVersion}\``,
    `현재 source roadmap: \`${currentRoadmap}\``,
    `## 현재 source roadmap: ${currentRoadmap}`,
    `최신 공개 GitHub Release: \`${latestPublishedTag}\``,
    `최신 published baseline: \`${latestPublishedBaseline}\``,
    `| 1 | v4.0.0 (1) v4.0.0 baseline 정렬 | P0 | 완료 |`,
    "VERSION/CMake/README/docs current pin을 `4.0.0`",
    "scripts/internal/verify_v400_entry_baseline.mjs",
    "verify_release_metadata_consistency.mjs",
    `| 2 | v4.0.0 (2) User Review Gate | P0 | 완료 |`,
    `\`${expectedTag}\` GitHub Release/tag는 아직 생성하지 않습니다`,
  ]) {
    assertIncludes(files.backlog, snippet, "development backlog");
  }
});

check("stream verification, inventory, and records wire v4.0.0 (1)", () => {
  for (const snippet of [
    "v4.0.0 (1)",
    "./server.sh verify-v400-entry-baseline",
    "./server.sh verify-release-metadata",
    "latest published `v3.9.1`",
    "UI 풀테스트, 30분/120분, published metadata, release action evidence가 아닙니다",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification");
  }
  for (const snippet of [
    `현재 release 목표 \`${expectedTag}\``,
    "v4.0.0 (1) v4.0.0 baseline 정렬",
    "verify-v400-entry-baseline",
    "`OPS-163`, `SAFE-196`",
  ]) {
    assertIncludes(files.projectInventory, snippet, "project inventory");
  }
  for (const snippet of [
    "V400 entry baseline",
    "./server.sh verify-v400-entry-baseline",
    "| v4.0.0 |",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release test records");
  }
  for (const snippet of [
    "v4.0.0 source baseline",
    "verify-v400-entry-baseline",
    "latest published: v3.9.1",
  ]) {
    assertIncludes(files.releaseEvidence, snippet, "release evidence index");
  }
});

check("release metadata verifier separates current 4.0.0 from published v3.9.1", () => {
  for (const snippet of [
    `assert(currentTag === "${expectedTag}"`,
    `const latestPublishedTag = "${latestPublishedTag}";`,
    `const currentRoadmap = "${currentRoadmap}";`,
    `const latestPublishedBaseline = "${latestPublishedBaseline}";`,
    "currentTag !== latestPublishedTag",
    "publishedMode ? \"published-release\" : \"local-release-metadata\"",
  ]) {
    assertIncludes(files.releaseMetadataVerifier, snippet, "release metadata verifier");
  }
});

check("roadmap contract no longer freezes VERSION at 3.9.1", () => {
  assertIncludes(files.roadmapContract, `assert(version === "${expectedVersion}"`, "v400 roadmap contract current VERSION");
  assert(!files.roadmapContract.includes('assert(version === "3.9.1"'),
    "v400 roadmap contract still freezes VERSION at 3.9.1");
});

check("server.sh dispatches verify-v400-entry-baseline", () => {
  assertIncludes(files.serverSh, command, "server.sh");
  assertIncludes(files.serverSh, targetScript, "server.sh");
});

check("SAFE-196/OPS-163 inherited baseline does not claim execution PASS", () => {
  const currentSourceAligned = version === expectedVersion &&
    files.cmake.includes(`VERSION ${expectedVersion}`) &&
    files.versioning.includes(`현재 source roadmap: \`${currentRoadmap}\``);
  const publishedSeparated = files.releaseMetadataVerifier.includes(`const latestPublishedTag = "${latestPublishedTag}";`) &&
    files.readme.includes(`최신 공개 GitHub Release: [${latestPublishedTag}]`);
  const noExecutionPass = files.releaseRecords.includes("published metadata PASS가 아님") ||
    files.streamVerification.includes("published metadata, release action evidence가 아닙니다");
  assert(currentSourceAligned && publishedSeparated && noExecutionPass,
    "v4.0.0 (1) must not claim UI/longrun/published metadata PASS");
});

const results = runChecks();
console.log("");
console.log("== v4.0.0 entry baseline summary ==");
console.log("- schema: media-server.v400-entry-baseline.v1");
console.log(`- command: ${command}`);
console.log(`- currentVersion: ${version}`);
console.log(`- currentRoadmap: ${currentRoadmap}`);
console.log(`- latestPublishedTag: ${latestPublishedTag}`);
console.log(`- latestPublishedBaseline: ${latestPublishedBaseline}`);
console.log(`- previousPublishedTag: ${previousPublishedTag}`);
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
