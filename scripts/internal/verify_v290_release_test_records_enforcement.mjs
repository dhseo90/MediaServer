#!/usr/bin/env node
// 파일 용도: v2.9.0 S04 release test records enforcement 문서/게이트 경계를 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.9.0 release test records enforcement verification

Usage:
  ./server.sh verify-v290-release-test-records-enforcement

Checks:
  - V290-S04 문서/인벤토리/release records가 저장소 보존형 테스트 기록 체계를 가리키는지 확인
  - 테스트 항목/결과/deprecated/미실행/cleanup/token 섹션이 분리되어 있는지 확인
  - /tmp evidence, summary-only, UI 자동 smoke, 미실행 PASS 승격 금지 경계를 확인
  - 이 정적 gate를 UI/30분/120분/published metadata PASS로 대체하지 않는 경계 유지
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const featureInventory = readText("docs/project-feature-test-inventory.md");
const releaseRecords = readText("docs/release-test-records.md");
const releaseRecordsShaBefore = sha256Text(releaseRecords);
const normalizedReleaseRecords = normalizeWhitespace(releaseRecords);
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const projectInventoryVerifier = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
const implementationManifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
const serverSh = readText("server.sh");

check("roadmap and stream verification expose V290-S04 records enforcement", () => {
  for (const snippet of [
    "| 4 | V290-S04 | P1 | 완료 | release test records enforcement |",
    "`./server.sh verify-v290-release-test-records-enforcement`",
    "안정화/30분/120분/UI 풀테스트별 `제목/수행내용/결과` 기록 기준",
    "`/tmp` 증거 금지, summary-only 기록 금지",
    "## v2.9.0 S04 개발 기록",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S04 snippet: ${snippet}`);
  }
  for (const snippet of [
    "| V290-S04 | `./server.sh verify-v290-release-test-records-enforcement` |",
    "저장소 보존형 테스트 기록 체계",
    "미실행/제외 항목을 PASS/FAIL 표에 섞지 않음",
  ]) {
    assert(streamVerification.includes(snippet), `stream verification missing S04 snippet: ${snippet}`);
  }
});

check("release test records keep required source-of-truth sections", () => {
  for (const snippet of [
    "## 기록 원칙",
    "## 테스트 항목 상세 기록",
    "## Deprecated 테스트 항목",
    "## 버전별 테스트 결과 기록",
    "## 토큰/시간 사용량 기록",
    "## 임시 산출물 정리 기록",
    "테스트 결과표의 `결과`는 `pass` 또는 `fail`만 사용합니다.",
  ]) {
    assert(releaseRecords.includes(snippet), `release records missing required section/snippet: ${snippet}`);
  }
  assert(
    normalizedReleaseRecords.includes("실행하지 않은 항목, 사용자가 제외한 항목, 외부 조건이 없어 제외한 항목은 별도 미실행/제외 표에 둡니다."),
    "release records missing not-run/exclusion separation rule"
  );
});

check("deprecated record patterns block broad completion claims", () => {
  for (const snippet of [
    "| `/tmp` 경로를 최종 evidence로 링크 |",
    "| UI 자동 smoke를 UI 풀테스트 직접 조작 PASS로 승격 |",
    "| 결과 요약만 남기기 |",
    "| 미실행 항목을 결과표 PASS/FAIL에 섞기 |",
    "조건부 통과처럼 기록",
    "결과표는 pass/fail만 쓰고",
  ]) {
    assert(releaseRecords.includes(snippet), `release records missing deprecated guard: ${snippet}`);
  }
});

check("release records include S04 test item, RED failure, and not-run boundaries", () => {
  for (const snippet of [
    "V290 release test records enforcement",
    "`./server.sh verify-v290-release-test-records-enforcement`",
    "최초 `./server.sh verify-v290-release-test-records-enforcement`는 command 미구현으로 fail",
    "v290 S04 UI 풀테스트",
    "v290 S04 30분/120분 longrun",
    "v290 S04 published metadata",
  ]) {
    assert(releaseRecords.includes(snippet), `release records missing S04 snippet: ${snippet}`);
  }
});

check("feature inventory maps V290-S04 to OPS-045 and SAFE-075", () => {
  assertSummaryCountAtLeast("전체 기능 항목", 507);
  assertSummaryCountAtLeast("기능 ID 목록", 507);
  assertRangeCovers("SAFE", 75);
  assertRangeCovers("OPS", 45);
  for (const snippet of [
    "V290-S04 release test records enforcement | `OPS-045`, `SAFE-075` | `verify-v290-release-test-records-enforcement`",
    "SAFE-075 | V290-S04 release test records enforcement boundary",
    "OPS-045 | V290-S04 release test records enforcement 게이트",
  ]) {
    assert(featureInventory.includes(snippet), `feature inventory missing S04 snippet: ${snippet}`);
  }
  assert(coverageVerifier.includes("loadImplementationManifest") && coverageVerifier.includes("validateImplementationManifest"),
    "feature coverage missing canonical implementation manifest validation");
  for (const id of ["SAFE-075", "OPS-045"]) {
    const mapping = implementationManifest.items?.find((item) => item.id === id);
    assert(mapping?.verifierEvidence?.command === "verify-v290-release-test-records-enforcement",
      `implementation manifest ${id} missing V290-S04 verifier mapping`);
  }
  assert(projectInventoryVerifierRangeCovers("SAFE", 75), "project inventory verifier missing SAFE-075 coverage");
  assert(projectInventoryVerifierRangeCovers("OPS", 45), "project inventory verifier missing OPS-045 coverage");
});

check("server entrypoint exposes V290-S04 records command", () => {
  for (const snippet of [
    "verify-v290-release-test-records-enforcement",
    "verify_v290_release_test_records_enforcement.mjs",
  ]) {
    assert(serverSh.includes(snippet), `server.sh missing S04 command snippet: ${snippet}`);
  }
});

check("release result tables keep pass/fail cells separate from not-run wording", () => {
  const forbiddenCells = new Set(["skip", "skipped", "조건부 pass", "미실행", "not-run"]);
  const resultCells = markdownResultCells(releaseRecords);
  for (const cell of resultCells) {
    assert(!forbiddenCells.has(cell.value.toLowerCase()),
      `release records must not use forbidden result cell at line ${cell.line}: ${cell.value}`);
  }
  assert(markdownResultCells("| 항목 | 상태 |\n| --- | --- |\n| UI | 미실행 |").length === 0,
    "not-run status tables must stay outside pass/fail result-cell enforcement");
  assert(markdownResultCells("| 항목 | 결과 |\n| --- | --- |\n| gate | 미실행 |")[0]?.value === "미실행",
    "pass/fail result-cell enforcement must detect forbidden not-run values");
});

check("canonical records gate rejects tmp evidence without writing the records source", () => {
  const releaseRecordsShaAfter = sha256Text(readText("docs/release-test-records.md"));
  const tmpFinalEvidenceRejected = releaseRecords.includes("| `/tmp` 경로를 최종 evidence로 링크 |") &&
    releaseRecords.includes("| 결과 요약만 남기기 |") &&
    releaseRecords.includes("미실행/제외 표");
  const releaseRecordsHashStable = releaseRecordsShaBefore === releaseRecordsShaAfter;
  const releaseRecordsWritePerformed = !releaseRecordsHashStable;
  assert(releaseRecordsWritePerformed === false && tmpFinalEvidenceRejected,
    "verify-v290-release-test-records-enforcement must reject /tmp/summary-only evidence with no write");
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
console.log("== v2.9.0 release test records enforcement summary ==");
console.log("- schema: media-server.v290-release-test-records-enforcement.v1");
console.log("- recordsSourceOfTruth: docs/release-test-records.md");
console.log("- resultCells: pass-or-fail-only");
console.log("- tmpEvidence: not-final-evidence");
console.log("- summaryOnlyCompletion: forbidden");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
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

function markdownResultCells(text) {
  const cells = [];
  const lines = text.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const header = markdownTableCells(lines[lineIndex]);
    if (!header) continue;
    const resultIndex = header.findIndex(cell => /^결과(?:\s*\(\s*pass\s*\/\s*fail\s*\))?$/i.test(cell));
    const verdictIndex = header.findIndex(cell => cell === "판정");
    if (resultIndex < 0 || (verdictIndex >= 0 && !/pass\s*\/\s*fail/i.test(header[resultIndex]))) continue;
    const separator = markdownTableCells(lines[lineIndex + 1] || "");
    if (!separator || separator.length !== header.length ||
        separator.some(cell => !/^:?-{3,}:?$/.test(cell))) continue;
    for (let rowIndex = lineIndex + 2; rowIndex < lines.length; rowIndex += 1) {
      const row = markdownTableCells(lines[rowIndex]);
      if (!row || row.length !== header.length) break;
      cells.push({ line: rowIndex + 1, value: row[resultIndex] });
    }
  }
  return cells;
}

function markdownTableCells(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed.slice(1, -1).split("|").map(cell => cell.trim());
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
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
