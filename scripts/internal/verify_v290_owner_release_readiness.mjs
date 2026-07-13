#!/usr/bin/env node
// 파일 용도: v2.9.0 S09 owner release readiness와 close-out 준비 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.9.0 S09 owner release readiness verification

Usage:
  ./server.sh verify-v290-owner-release-readiness

Checks:
  - v2.9.0 S00~S09 source/local readiness gates가 feature inventory, release policy, evidence index, records에 연결됐는지 확인
  - owner close-out companion command와 dry-run/one-shot dry-run이 문서화됐는지 확인
  - UI 풀테스트, 30분/120분, published metadata, PR/tag/GitHub Release, field smoke가 S09 local readiness PASS로 승격되지 않는지 확인
  - server.sh와 feature inventory coverage가 S09 verifier를 노출하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const featureInventory = readText("docs/project-feature-test-inventory.md");
const releaseRecords = readText("docs/release-test-records.md");
const releaseEvidenceIndex = readText("docs/release-evidence-index.md");
const releasePolicy = readText("docs/release-policy.md");
const manualFulltest = readText("docs/manual-ui-fulltest.md");
const manualChecklist = readText("docs/manual-ui-checklist.md");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const implementationManifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
const projectInventoryVerifier = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
const serverSh = readText("server.sh");
const normalizedRecords = normalizeWhitespace(releaseRecords);

const readinessCommands = [
  "./server.sh verify-v290-owner-release-readiness",
  "./server.sh build",
  "./server.sh verify-release-metadata",
  "./server.sh verify-docs-links",
  "./server.sh verify-docs-ui-assets",
  "./server.sh verify-project-inventory",
  "./server.sh verify-feature-inventory-coverage",
  "./server.sh verify-manual-ui-evidence",
  "./server.sh verify-release-evidence-index",
  "./server.sh verify-release-closeout-helper --dry-run",
  "./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run",
  "./server.sh verify-script-inventory",
  "git diff --check",
];

check("roadmap and stream verification expose V290-S09 owner readiness", () => {
  for (const snippet of [
    "| 9 | V290-S09 | P0 | 완료 | owner release readiness |",
    "v2.9 release readiness gate와 close-out 준비",
    "`./server.sh verify-v290-owner-release-readiness`",
    "## v2.9.0 S09 개발 기록",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S09 snippet: ${snippet}`);
  }
  for (const snippet of [
    "| V290-S09 | `./server.sh verify-v290-owner-release-readiness` |",
    "v2.9.0 local owner release readiness",
    "PR/tag/GitHub Release/published metadata 실행 evidence를 대체하지 않음",
  ]) {
    assert(streamVerification.includes(snippet), `stream verification missing S09 snippet: ${snippet}`);
  }
});

check("feature inventory maps V290-S09 to OPS-050 and SAFE-080", () => {
  assertSummaryCountAtLeast("전체 기능 항목", 517);
  assertSummaryCountAtLeast("기능 ID 목록", 517);
  assertRangeCovers("SAFE", 80);
  assertRangeCovers("OPS", 50);
  for (const snippet of [
    "V290-S09 owner release readiness | `OPS-050`, `SAFE-080` | `verify-v290-owner-release-readiness`",
    "SAFE-080 | V290-S09 owner release readiness boundary",
    "OPS-050 | V290-S09 owner release readiness 게이트",
  ]) {
    assert(featureInventory.includes(snippet), `feature inventory missing S09 snippet: ${snippet}`);
  }
  assertCanonicalCoverage(["SAFE-080", "OPS-050"], "verify-v290-owner-release-readiness");
  assert(projectInventoryVerifier.includes('"OPS-050"'), "project inventory verifier missing OPS-050");
  assert(projectInventoryVerifier.includes('"SAFE-080"'), "project inventory verifier missing SAFE-080");
  assert(projectInventoryVerifierRangeCovers("SAFE", 80), "project inventory verifier SAFE range below 080");
  assert(projectInventoryVerifierRangeCovers("OPS", 50), "project inventory verifier OPS range below 050");
});

check("historical roadmap, evidence index, and records list companion local gates", () => {
  for (const command of readinessCommands) {
    assert(backlog.includes(command), `backlog missing S09 command: ${command}`);
    assert(releaseEvidenceIndex.includes(command), `release evidence missing S09 command: ${command}`);
    assert(releaseRecords.includes(command), `release records missing S09 command: ${command}`);
  }
  for (const snippet of [
    "v290-s09-owner-release-readiness-20260619",
    "media-server.v290-owner-release-readiness.v1",
    "v2.9.0 S09 owner release readiness",
    "Not run for `v290-s09-owner-release-readiness-20260619`",
  ]) {
    assert(releaseEvidenceIndex.includes(snippet), `release evidence missing S09 snippet: ${snippet}`);
  }
});

check("release records include S09 RED, local gates, and not-run boundaries", () => {
  for (const snippet of [
    "V290 owner release readiness",
    "최초 `./server.sh verify-v290-owner-release-readiness`는 command 미구현으로 fail",
    "v290 S09 owner release readiness",
    "v290 S09 local release gates",
    "v290 S09 closeout dry-run",
    "v290 S09 one-shot closeout dry-run",
    "v290 S09 git/tag/remote preflight",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing S09 result: ${snippet}`);
  }
  for (const snippet of [
    "v290 S09 UI 풀테스트",
    "v290 S09 30분/120분 longrun",
    "v290 S09 published metadata",
    "v290 S09 PR/main/tag/GitHub Release",
    "v290 S09 field smoke",
    "S09 local readiness PASS로 대체하지 않음",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing S09 not-run boundary: ${snippet}`);
  }
});

check("manual UI criteria keep v2.9 direct UI execution separate", () => {
  const normalized = normalizeWhitespace(`${manualFulltest}\n${manualChecklist}`);
  for (const snippet of [
    "v2.9.0 Final 2.x Closure UI 풀테스트 기준",
    "UI 풀테스트 PASS로 쓰지",
    "raw JSON/API-only/static smoke",
    "Chrome fallback",
  ]) {
    assert(normalized.includes(snippet), `manual UI criteria missing S09 boundary snippet: ${snippet}`);
  }
});

check("server exposes S09 owner readiness command", () => {
  for (const snippet of [
    "verify-v290-owner-release-readiness",
    "verify_v290_owner_release_readiness.mjs",
  ]) {
    assert(serverSh.includes(snippet), `server.sh missing S09 command snippet: ${snippet}`);
  }
});

check("SAFE-080 canonical owner readiness boundary", () => {
  const publishedMetadataStillManual = releasePolicy.includes("verify-release-metadata --published") &&
    releaseEvidenceIndex.includes("verify-v290-owner-release-readiness");
  const ownerReadinessRecorded = normalizedRecords.includes("v290 S09 published metadata");
  const safe080BoundaryObserved = publishedMetadataStillManual && ownerReadinessRecorded;
  assert(safe080BoundaryObserved,
    "verify-v290-owner-release-readiness must not promote verify-release-metadata --published");
});

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

console.log("");
console.log("== v2.9.0 S09 owner/release readiness summary ==");
console.log("- schema: media-server.v290-owner-release-readiness.v1");
console.log("- scope: local readiness, release close-out dry-run, evidence boundary");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30m120m: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log("- releaseActions: not-run-by-this-command");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ");
}

function assertSummaryCountAtLeast(label, minimum) {
  const pattern = new RegExp(`\\| ${escapeRegExp(label)} \\| ([0-9]+)`);
  const match = featureInventory.match(pattern);
  assert(match, `feature inventory missing summary count: ${label}`);
  const count = Number.parseInt(match[1], 10);
  assert(count >= minimum, `feature inventory ${label} ${count} below ${minimum}`);
}

function assertRangeCovers(prefix, minimum) {
  const pattern = new RegExp(`\`${prefix}-[0-9]{3}\`~\`${prefix}-([0-9]{3})\``, "g");
  const matches = [...featureInventory.matchAll(pattern)];
  assert(matches.length > 0, `feature inventory missing ${prefix} range`);
  const max = Math.max(...matches.map((match) => Number.parseInt(match[1], 10)));
  assert(max >= minimum, `feature inventory ${prefix} range ${max} below ${minimum}`);
}

function projectInventoryVerifierRangeCovers(prefix, minimum) {
  const pattern = new RegExp(`\`${prefix}-[0-9]{3}\`~\`${prefix}-([0-9]{3})\``, "g");
  const matches = [...projectInventoryVerifier.matchAll(pattern)];
  if (matches.length === 0) return false;
  const max = Math.max(...matches.map((match) => Number.parseInt(match[1], 10)));
  return max >= minimum;
}

function assertCanonicalCoverage(ids, command) {
  assert(coverageVerifier.includes("loadImplementationManifest") && coverageVerifier.includes("validateImplementationManifest"), "feature coverage missing canonical implementation manifest validation");
  for (const id of ids) assert(implementationManifest.items?.find(item => item.id === id)?.verifierEvidence?.command === command, `implementation manifest ${id} missing ${command}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
