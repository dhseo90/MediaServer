#!/usr/bin/env node
// 파일 용도: v2.9.0 S07 public docs/assets refresh 문서/게이트 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.9.0 public docs/assets refresh verification

Usage:
  ./server.sh verify-v290-public-docs-assets-refresh

Checks:
  - README, README.en, docs index, English docs index가 v2.9 source/v2.8 published/source-only 기준을 공유하는지 확인
  - release/version policy, UI guide, docs UI asset policy가 public docs/assets refresh 경계를 고정하는지 확인
  - 대표 UI 이미지가 managed asset set으로만 참조되고 recapture/direct review 경계를 과장하지 않는지 확인
  - feature inventory가 OPS-048/SAFE-078을 S07 public docs/assets refresh gate에 매핑하는지 확인
  - release records와 server.sh가 S07 RED/not-run boundary와 verifier command를 노출하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const readme = readText("README.md");
const readmeEn = readText("README.en.md");
const docsIndex = readText("docs/README.md");
const docsIndexEn = readText("docs/en/README.md");
const uiGuide = readText("docs/ui-guide.md");
const assetPolicy = readText("docs/assets/ui/README.md");
const releasePolicy = readText("docs/release-policy.md");
const versionPolicy = readText("docs/versioning-policy.md");
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const featureInventory = readText("docs/project-feature-test-inventory.md");
const releaseRecords = readText("docs/release-test-records.md");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const projectInventoryVerifier = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
const docsUiAssetsVerifier = readText("scripts/internal/verify_docs_ui_assets.mjs");
const serverSh = readText("server.sh");
const normalizedPublicDocs = normalizeWhitespace([readme, readmeEn, docsIndex, docsIndexEn].join("\n"));
const normalizedAssetDocs = normalizeWhitespace([uiGuide, assetPolicy].join("\n"));
const normalizedPolicies = normalizeWhitespace([releasePolicy, versionPolicy].join("\n"));
const normalizedRecords = normalizeWhitespace(releaseRecords);

check("roadmap and stream verification expose V290-S07 public docs/assets refresh", () => {
  for (const snippet of [
    "| 7 | V290-S07 | P1 | 완료 | public docs/assets refresh |",
    "`./server.sh verify-v290-public-docs-assets-refresh`",
    "README, README.en, docs index, release/version policy, stream verification, UI guide",
    "대표 이미지 교체 없이 managed asset set과 직접 검수 경계를 고정",
    "## v2.9.0 S07 개발 기록",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S07 snippet: ${snippet}`);
  }
  for (const snippet of [
    "| V290-S07 | `./server.sh verify-v290-public-docs-assets-refresh`, `./server.sh verify-docs-ui-assets` |",
    "public README/docs index/UI guide/docs asset policy refresh",
    "대표 이미지 직접 재캡처/브라우저 검수 PASS가 아님",
  ]) {
    assert(streamVerification.includes(snippet), `stream verification missing S07 snippet: ${snippet}`);
  }
});

check("public entry docs share v2.9 source and v2.8 published baseline", () => {
  for (const snippet of [
    "v2.9.0 Final 2.x Closure & Compatibility Baseline",
    "v2.8.0 Operator-Supervised Action Readiness",
    "source-only GitHub Release",
    "Public docs/assets baseline",
    "공개 문서/대표 asset 기준",
    "verify-docs-ui-assets",
    "config/docs_ui_assets.json",
  ]) {
    assert(normalizedPublicDocs.includes(normalizeWhitespace(snippet)), `public docs missing shared snippet: ${snippet}`);
  }
  for (const asset of [
    "docs/assets/ui/ops-home.png",
    "docs/assets/ui/ops-channels.png",
    "docs/assets/ui/ops-rules.png",
    "docs/assets/ui/ops-rules-preview.png",
    "docs/assets/ui/ops-users.png",
    "docs/assets/ui/client-live.png",
    "docs/assets/ui/en/ops-home.png",
    "docs/assets/ui/en/client-live.png",
  ]) {
    assert(normalizedPublicDocs.includes(asset), `public docs missing representative asset path: ${asset}`);
  }
});

check("asset docs keep representative screenshot boundary explicit", () => {
  for (const snippet of [
    "v2.9.0 S07 public docs/assets refresh",
    "이번 S07에서는 이미지 파일을 새로 교체하지 않았습니다.",
    "대표 이미지 교체는 직접 이미지 검수와 `./server.sh verify-docs-ui-assets` 재실행 후에만 기록합니다.",
    "Chrome/CDP fallback 재캡처는 사용자가 명시 승인한 예외일 때만",
    "UI 풀테스트 PASS 증거가 아닙니다.",
    "source URL, Developer URL, raw JSON, debug counter",
    "열지 않은 이미지는 PASS가 아니라 `미확인`",
  ]) {
    assert(normalizedAssetDocs.includes(normalizeWhitespace(snippet)), `asset docs missing S07 boundary snippet: ${snippet}`);
  }
  for (const snippet of [
    "2026-05-23 캡처 자산을 대표 shell 설명 이미지로 유지",
    "이 이미지는 v2.9.0 release evidence, GitHub Release publish evidence, UI 풀테스트 PASS 증거가 아님",
  ]) {
    assert(uiGuide.includes(snippet), `UI guide missing S07 screenshot snippet: ${snippet}`);
  }
});

check("release and version policies list S07 local gate without promoting publication", () => {
  for (const snippet of [
    "public docs/assets refresh",
    "verify-v290-public-docs-assets-refresh",
    "대표 UI 이미지는 `config/docs_ui_assets.json`",
    "이미지 재캡처나 직접 브라우저 검수 PASS가 아닙니다.",
    "published metadata, tag/push/GitHub Release",
  ]) {
    assert(normalizedPolicies.includes(normalizeWhitespace(snippet)), `release/version policy missing S07 snippet: ${snippet}`);
  }
  for (const publicDoc of [
    "README.md",
    "README.en.md",
    "docs/README.md",
    "docs/en/README.md",
    "docs/ui-guide.md",
    "docs/assets/ui/README.md",
  ]) {
    assert(normalizedPolicies.includes(publicDoc), `release/version policy missing public doc path: ${publicDoc}`);
  }
});

check("docs UI assets verifier still owns the managed image set", () => {
  for (const snippet of [
    "README uses only representative product UI screenshots",
    "English README uses English UI screenshots",
    "managed UI asset manifest stays complete",
    "representative screenshot docs do not point at stale visual baselines",
    "docs UI asset directory contains managed PNG files",
  ]) {
    assert(docsUiAssetsVerifier.includes(snippet), `docs UI asset verifier missing guard: ${snippet}`);
  }
});

check("feature inventory maps V290-S07 to OPS-048 and SAFE-078", () => {
  assertSummaryCountAtLeast("전체 기능 항목", 513);
  assertSummaryCountAtLeast("기능 ID 목록", 513);
  assertRangeCovers("SAFE", 78);
  assertRangeCovers("OPS", 48);
  for (const snippet of [
    "V290-S07 public docs/assets refresh | `OPS-048`, `SAFE-078` | `verify-v290-public-docs-assets-refresh`, `verify-docs-ui-assets`, `verify-docs-links`",
    "SAFE-078 | V290-S07 public docs/assets refresh boundary",
    "OPS-048 | V290-S07 public docs/assets refresh 게이트",
  ]) {
    assert(featureInventory.includes(snippet), `feature inventory missing S07 snippet: ${snippet}`);
  }
  assert(coverageVerifier.includes("verify-v290-public-docs-assets-refresh"), "feature coverage missing V290-S07 verifier");
  assert(projectInventoryVerifierRangeCovers("SAFE", 78), "project inventory verifier missing SAFE-078 coverage");
  assert(projectInventoryVerifierRangeCovers("OPS", 48), "project inventory verifier missing OPS-048 coverage");
});

check("release records include S07 test item, RED failure, and not-run boundaries", () => {
  for (const snippet of [
    "V290 public docs/assets refresh",
    "`./server.sh verify-v290-public-docs-assets-refresh`",
    "최초 `./server.sh verify-v290-public-docs-assets-refresh`는 command 미구현으로 fail",
    "v290 S07 UI 풀테스트",
    "v290 S07 30분/120분 longrun",
    "v290 S07 published metadata",
    "v290 S07 image recapture",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing S07 snippet: ${snippet}`);
  }
});

check("server exposes S07 public docs/assets command", () => {
  for (const snippet of [
    "verify-v290-public-docs-assets-refresh",
    "verify_v290_public_docs_assets_refresh.mjs",
    "verify-docs-ui-assets",
  ]) {
    assert(serverSh.includes(snippet), `server.sh missing S07 command snippet: ${snippet}`);
  }
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
console.log("== v2.9.0 public docs/assets refresh summary ==");
console.log("- schema: media-server.v290-public-docs-assets-refresh.v1");
console.log("- publicDocs: README.md, README.en.md, docs/README.md, docs/en/README.md");
console.log("- uiGuide: docs/ui-guide.md");
console.log("- assetPolicy: docs/assets/ui/README.md");
console.log("- managedAssets: config/docs_ui_assets.json");
console.log("- recapture: not-run-by-this-command");
console.log("- directBrowserReview: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
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

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
