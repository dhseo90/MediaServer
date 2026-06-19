#!/usr/bin/env node
// 파일 용도: v2.9.0 S06 release evidence hygiene 문서/게이트 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.9.0 release evidence hygiene verification

Usage:
  ./server.sh verify-v290-release-evidence-hygiene

Checks:
  - V290-S06 roadmap/stream verification이 release evidence hygiene gate를 가리키는지 확인
  - release evidence index가 records/inventory/script/manual UI evidence 연결과 PASS/FAIL vs 미실행/제외 경계를 고정하는지 확인
  - release test records가 S06 RED와 미실행/제외 경계를 저장소 보존형으로 남기는지 확인
  - feature inventory가 OPS-047/SAFE-077을 S06 stability gate에 매핑하는지 확인
  - server.sh와 기존 release evidence verifier가 S06 hygiene contract를 노출하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const featureInventory = readText("docs/project-feature-test-inventory.md");
const releaseEvidence = readText("docs/release-evidence-index.md");
const releaseRecords = readText("docs/release-test-records.md");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const projectInventoryVerifier = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
const releaseEvidenceVerifier = readText("scripts/internal/verify_release_evidence_index.mjs");
const serverSh = readText("server.sh");
const normalizedEvidence = normalizeWhitespace(releaseEvidence);
const normalizedRecords = normalizeWhitespace(releaseRecords);

check("roadmap and stream verification expose V290-S06 release evidence hygiene", () => {
  for (const snippet of [
    "| 6 | V290-S06 | P1 | 완료 | release evidence hygiene |",
    "`./server.sh verify-v290-release-evidence-hygiene`",
    "release evidence index, release test records, feature inventory, script inventory, manual UI evidence 연결",
    "미실행/제외 항목은 PASS/FAIL 표에서 분리",
    "## v2.9.0 S06 개발 기록",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S06 snippet: ${snippet}`);
  }
  for (const snippet of [
    "| V290-S06 | `./server.sh verify-v290-release-evidence-hygiene` |",
    "release evidence index, release test records, feature inventory, script inventory, manual UI evidence 연결",
    "미실행/제외/manual-not-run/미확인은 PASS가 아님",
  ]) {
    assert(streamVerification.includes(snippet), `stream verification missing S06 snippet: ${snippet}`);
  }
});

check("release evidence index pins S06 hygiene sources and boundaries", () => {
  for (const snippet of [
    "## v2.9.0 Release Evidence Hygiene",
    "S06은 index hygiene gate이며 실제 안정화/UI/30분/120분/published metadata 실행 evidence가 아닙니다.",
    "[release-test-records.md](./release-test-records.md)",
    "[project-feature-test-inventory.md](./project-feature-test-inventory.md)",
    "[manual-ui-fulltest.md](./manual-ui-fulltest.md)",
    "[manual-ui-checklist.md](./manual-ui-checklist.md)",
    "verify-script-inventory",
    "verify-manual-ui-evidence",
    "verify-v290-release-evidence-hygiene",
    "PASS/FAIL 결과표",
    "미실행/제외/manual-not-run/미확인",
    "`/tmp`, `/private/tmp`, `$TMPDIR`",
  ]) {
    assert(normalizedEvidence.includes(normalizeWhitespace(snippet)), `release evidence index missing S06 snippet: ${snippet}`);
  }
  for (const snippet of [
    "`PASS` 또는 `FAIL`만 기록합니다.",
    "`미실행`, `manual-not-run`, `미확인`, `제외`는 PASS가 아닙니다.",
    "UI 풀테스트 직접 조작",
    "30분 soak와 120분 longrun은 서로 대체하지 않습니다.",
    "tag, push, GitHub Release 생성은 사용자 명시 승인 전에는 완료로 기록하지 않습니다.",
  ]) {
    assert(normalizedEvidence.includes(normalizeWhitespace(snippet)), `release evidence index missing existing hygiene boundary: ${snippet}`);
  }
});

check("release evidence index verifier enforces S06 hygiene snippets", () => {
  for (const snippet of [
    "v2.9.0 Release Evidence Hygiene",
    "verify-v290-release-evidence-hygiene",
    "미실행/제외/manual-not-run/미확인",
  ]) {
    assert(releaseEvidenceVerifier.includes(snippet), `release evidence verifier missing S06 snippet: ${snippet}`);
  }
});

check("release records include S06 test item, RED failure, and not-run boundaries", () => {
  for (const snippet of [
    "V290 release evidence hygiene",
    "`./server.sh verify-v290-release-evidence-hygiene`",
    "최초 `./server.sh verify-v290-release-evidence-hygiene`는 command 미구현으로 fail",
    "v290 S06 UI 풀테스트",
    "v290 S06 30분/120분 longrun",
    "v290 S06 published metadata",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing S06 snippet: ${snippet}`);
  }
});

check("feature inventory maps V290-S06 to OPS-047 and SAFE-077", () => {
  assertSummaryCountAtLeast("전체 기능 항목", 511);
  assertSummaryCountAtLeast("기능 ID 목록", 511);
  assertRangeCovers("SAFE", 77);
  assertRangeCovers("OPS", 47);
  for (const snippet of [
    "V290-S06 release evidence hygiene | `OPS-047`, `SAFE-077` | `verify-v290-release-evidence-hygiene`, `verify-release-evidence-index`, `verify-script-inventory`",
    "SAFE-077 | V290-S06 release evidence hygiene boundary",
    "OPS-047 | V290-S06 release evidence hygiene 게이트",
  ]) {
    assert(featureInventory.includes(snippet), `feature inventory missing S06 snippet: ${snippet}`);
  }
  assert(coverageVerifier.includes("verify-v290-release-evidence-hygiene"), "feature coverage missing V290-S06 verifier");
  assert(projectInventoryVerifierRangeCovers("SAFE", 77), "project inventory verifier missing SAFE-077 coverage");
  assert(projectInventoryVerifierRangeCovers("OPS", 47), "project inventory verifier missing OPS-047 coverage");
});

check("server exposes S06 hygiene command without promoting internal evidence index in public stream", () => {
  for (const snippet of [
    "verify-v290-release-evidence-hygiene",
    "verify_v290_release_evidence_hygiene.mjs",
  ]) {
    assert(serverSh.includes(snippet), `server.sh missing S06 command snippet: ${snippet}`);
  }
  assert(!streamVerification.includes("./server.sh verify-release-evidence-index"), "stream verification must not expose internal release evidence index command");
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
console.log("== v2.9.0 release evidence hygiene summary ==");
console.log("- schema: media-server.v290-release-evidence-hygiene.v1");
console.log("- index: docs/release-evidence-index.md");
console.log("- detailedRecords: docs/release-test-records.md");
console.log("- inventory: docs/project-feature-test-inventory.md");
console.log("- manualUiEvidence: criteria-only");
console.log("- directUiFulltest: not-run-by-this-command");
console.log("- longrun30And120: not-run-by-this-command");
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
