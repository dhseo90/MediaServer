#!/usr/bin/env node
// 파일 용도: v2.9.0 S05 UI 풀테스트 기준 freeze 문서/게이트 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.9.0 UI fulltest criteria freeze verification

Usage:
  ./server.sh verify-v290-ui-fulltest-criteria-freeze

Checks:
  - V290-S05 문서/인벤토리/release records가 v2.9 UI 풀테스트 기준 freeze를 가리키는지 확인
  - manual UI fulltest/checklist/result template이 v2.9 current target과 latest published v2.8을 분리하는지 확인
  - route/control/action/role/viewport/theme 기준이 개별 UI evidence로 고정됐는지 확인
  - raw JSON/API-only/static smoke/screenshot-only/Chrome fallback을 UI 풀테스트 PASS로 승격하지 않는 경계 유지
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const featureInventory = readText("docs/project-feature-test-inventory.md");
const releaseRecords = readText("docs/release-test-records.md");
const fulltest = readText("docs/manual-ui-fulltest.md");
const checklist = readText("docs/manual-ui-checklist.md");
const template = readText("docs/manual-ui-result-template.md");
const manualVerifier = readText("scripts/internal/verify_manual_ui_evidence.mjs");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const projectInventoryVerifier = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
const serverSh = readText("server.sh");
const normalizedManualDocs = normalizeWhitespace([fulltest, checklist, template].join("\n"));

check("roadmap and stream verification expose V290-S05 UI criteria freeze", () => {
  for (const snippet of [
    "| 5 | V290-S05 | P1 | 완료 | UI fulltest criteria freeze |",
    "`./server.sh verify-v290-ui-fulltest-criteria-freeze`",
    "v2.9 기준 route/control/action/UI role/viewport/theme 확인 항목",
    "자동 smoke나 raw JSON을 UI PASS로 승격하지 않음",
    "## v2.9.0 S05 개발 기록",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S05 snippet: ${snippet}`);
  }
  for (const snippet of [
    "| V290-S05 | `./server.sh verify-v290-ui-fulltest-criteria-freeze`, `./server.sh verify-manual-ui-evidence` |",
    "v2.9 UI 풀테스트 route/control/action/role/viewport/theme 기준 freeze",
    "실제 인앱 브라우저 직접 조작 PASS가 아님",
  ]) {
    assert(streamVerification.includes(snippet), `stream verification missing S05 snippet: ${snippet}`);
  }
});

check("manual UI docs pin v2.9 current target and latest v2.8 published baseline", () => {
  assert(fulltest.includes("최신 공개 release 기준은 `v2.8.0 Operator-Supervised Action Readiness`"), "manual fulltest missing latest published baseline");
  assert(normalizedManualDocs.includes("현재 release 목표와 UI 문서 기준은 `v2.9.0 Final 2.x Closure & Compatibility Baseline`"), "manual fulltest missing v2.9 UI docs baseline");
  assert(checklist.includes("현재 release 목표는 `v2.9.0`"), "manual checklist missing current v2.9 target");
  assert(template.includes("## v2.9.0 Release Evidence Index"), "manual result template missing v2.9 release evidence index");
  assert(template.includes("## v2.9.0 UI Fulltest Criteria Freeze"), "manual result template missing S05 criteria freeze section");
});

check("manual UI docs freeze route, role, viewport, theme, control, and action coverage", () => {
  for (const snippet of [
    "`/setup`, `/login`, `/password/change`, `/invite/setup`, `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/ops/vlm`, `/client/live`, `/client/dashboard`, `/client/events`, `/client/request-access`",
    "admin/operator/viewer/integrator role guard",
    "320px/390px/760px/1180px viewport",
    "light/dark theme",
    "nav/tab/button/menu/details",
    "textbox/textarea/password",
    "select/checkbox/toggle/segmented control",
    "copy/export/preview/play/stop/reconnect",
  ]) {
    assert(normalizedManualDocs.includes(snippet), `manual UI docs missing criteria snippet: ${snippet}`);
  }
});

check("manual UI docs keep direct browser evidence separate from automation", () => {
  for (const snippet of [
    "UI 풀테스트 판정값은 `PASS`와 `FAIL`만 사용합니다.",
    "카테고리 묶음 판정은 금지합니다.",
    "S05는 기준 freeze이며 실제 UI 풀테스트 실행 PASS가 아닙니다.",
    "raw JSON/API-only/static smoke/screenshot-only/Chrome fallback은 UI 풀테스트 PASS로 쓰지 않습니다.",
    "자동 smoke나 raw JSON 확인만으로 채우지 않습니다.",
    "직접 열어보지 않은 화면",
    "인앱 브라우저 직접 조작 미실행 항목",
  ]) {
    assert(normalizedManualDocs.includes(snippet), `manual UI docs missing boundary snippet: ${snippet}`);
  }
});

check("feature inventory maps V290-S05 to OPS-046 and SAFE-076", () => {
  assertSummaryCountAtLeast("전체 기능 항목", 509);
  assertSummaryCountAtLeast("기능 ID 목록", 509);
  assertRangeCovers("SAFE", 76);
  assertRangeCovers("OPS", 46);
  for (const snippet of [
    "V290-S05 UI fulltest criteria freeze | `OPS-046`, `SAFE-076` | `verify-v290-ui-fulltest-criteria-freeze`, `verify-manual-ui-evidence`",
    "SAFE-076 | V290-S05 UI fulltest criteria freeze boundary",
    "OPS-046 | V290-S05 UI fulltest criteria freeze 게이트",
  ]) {
    assert(featureInventory.includes(snippet), `feature inventory missing S05 snippet: ${snippet}`);
  }
  assert(coverageVerifier.includes("verify-v290-ui-fulltest-criteria-freeze"), "feature coverage missing V290-S05 verifier");
  assert(projectInventoryVerifierRangeCovers("SAFE", 76), "project inventory verifier missing SAFE-076 coverage");
  assert(projectInventoryVerifierRangeCovers("OPS", 46), "project inventory verifier missing OPS-046 coverage");
});

check("release records include S05 test item, RED failures, and not-run boundaries", () => {
  for (const snippet of [
    "V290 UI fulltest criteria freeze",
    "`./server.sh verify-v290-ui-fulltest-criteria-freeze`",
    "최초 `./server.sh verify-v290-ui-fulltest-criteria-freeze`는 command 미구현으로 fail",
    "최초 `./server.sh verify-manual-ui-evidence`는 manual UI 문서가 v2.8 기준이라 fail",
    "v290 S05 UI 풀테스트",
    "v290 S05 30분/120분 longrun",
    "v290 S05 published metadata",
  ]) {
    assert(releaseRecords.includes(snippet), `release records missing S05 snippet: ${snippet}`);
  }
});

check("server and existing manual UI verifier expose S05 gates", () => {
  for (const snippet of [
    "verify-v290-ui-fulltest-criteria-freeze",
    "verify_v290_ui_fulltest_criteria_freeze.mjs",
    "verify-manual-ui-evidence",
  ]) {
    assert(serverSh.includes(snippet), `server.sh missing S05 command snippet: ${snippet}`);
  }
  for (const snippet of [
    "currentTag",
    "verify-manual-ui-evidence",
    "UI 풀테스트 판정이 PASS/FAIL만",
  ]) {
    assert(manualVerifier.includes(snippet), `manual UI verifier missing current-target snippet: ${snippet}`);
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
console.log("== v2.9.0 UI fulltest criteria freeze summary ==");
console.log("- schema: media-server.v290-ui-fulltest-criteria-freeze.v1");
console.log("- criteriaSource: docs/manual-ui-fulltest.md + docs/manual-ui-checklist.md + docs/manual-ui-result-template.md");
console.log("- routeControlActionRoleViewportTheme: frozen");
console.log("- directBrowserEvidence: required-for-ui-pass");
console.log("- rawJsonApiOnly: not-ui-pass");
console.log("- staticSmokeScreenshotOnly: not-ui-pass");
console.log("- chromeFallback: not-ui-pass-without-explicit-exception");
console.log("- uiFulltest: not-run-by-this-command");
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
