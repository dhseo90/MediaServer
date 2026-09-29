#!/usr/bin/env node
// 파일 용도: 기존 UI 기준 freeze 명령으로 현행 정의·Policy v4·기능 연결을 검사한다. 실제 UI를 실행하지 않는다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { hasDocumentLink, validateFeatureDocumentation, validateUiPolicyDocumentation } from "./documentation_contract_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.9.0 UI fulltest criteria freeze verification

Usage:
  ./server.sh verify-v290-ui-fulltest-criteria-freeze

Checks:
  - 현행 manual UI 기준·체크리스트·결과 템플릿과 기능 ID/명령 연결 확인
  - 종료된 버전의 제목·완료 문구·실행 원장은 요구하지 않음
  - route/control/action/role/viewport/theme 기준이 개별 UI evidence로 고정됐는지 확인
  - raw JSON/API-only/static smoke/screenshot-only는 불인정, 실제 자동화는 Policy v4로 별도 판정
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const streamVerification = readText("docs/stream-verification.md");
const featureInventory = readText("docs/project-feature-test-inventory.md");
const fulltest = readText("docs/manual-ui-fulltest.md");
const checklist = readText("docs/manual-ui-checklist.md");
const template = readText("docs/manual-ui-result-template.md");
const manualVerifier = readText("scripts/internal/verify_manual_ui_evidence.mjs");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const projectInventoryVerifier = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
const implementationManifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
const serverSh = readText("server.sh");
const normalizedManualDocs = normalizeWhitespace([fulltest, checklist, template].join("\n"));
const agents = readText("AGENTS.md");
const policy = JSON.parse(readText("test/fixtures/ui_fulltest_evidence_policy_v4.json"));

check("현행 UI 기준·기능 ID·명령 dispatch 연결", () => {
  const errors = validateFeatureDocumentation({
    document: fulltest, identifiers: ['route', 'control', 'action', 'role', 'viewport', 'theme'],
    command: 'verify-v290-ui-fulltest-criteria-freeze', script: 'verify_v290_ui_fulltest_criteria_freeze.mjs',
    featureIds: ['OPS-046', 'SAFE-076'], inventory: featureInventory,
    implementation: implementationManifest, verification: streamVerification, server: serverSh,
  });
  assert(errors.length === 0, errors.join('; '));
});

check("현재 기준을 체크리스트와 결과 템플릿에서 참조", () => {
  for (const [name, text] of [['checklist', checklist], ['template', template]]) {
    assert(hasDocumentLink(text, 'manual-ui-fulltest.md'), `${name}: 현행 UI 기준 링크 누락`);
    assert(text.includes('PASS') && text.includes('FAIL'), `${name}: 실제 결과 상태 누락`);
  }
});

check("manual UI docs freeze route, role, viewport, theme, control, and action coverage", () => {
  for (const snippet of [
    '/setup', '/login', '/password/change', '/invite/setup', '/ops/home', '/ops/dashboard',
    '/ops/sources', '/ops/rules', '/ops/users', '/ops/events', '/ops/vlm', '/client/live',
    '/client/dashboard', '/client/events', '/client/request-access',
    'admin', 'operator', 'viewer', 'integrator', '320', '390', '760', '1180', 'light', 'dark',
    'nav', 'tab', 'button', 'menu', 'details', 'textbox', 'textarea', 'password',
    'select', 'checkbox', 'toggle', 'segmented', 'copy', 'export', 'preview', 'play', 'stop', 'reconnect',
  ]) {
    assert(normalizedManualDocs.includes(snippet), `manual UI docs missing criteria snippet: ${snippet}`);
  }
});

check("UI 정책 문서와 실제 실행 판정 경계", () => {
  const errors = validateUiPolicyDocumentation({agents, fulltest, policy});
  assert(errors.length === 0, errors.join('; '));
  for (const key of ['policyVerifierPassIsUiFulltestPass', 'replayAloneIsUiFulltestPass',
    'coverageMappingAloneIsUiFulltestPass', 'partialAutomationIsUiFulltestPass', 'historicalEvidenceIsRetroactivelyUpgraded']) {
    assert(policy.boundaries?.[key] === false, `정의 검사·과거 자료를 실제 UI PASS로 승격할 수 없음: ${key}`);
  }
});

check("feature inventory maps V290-S05 to OPS-046 and SAFE-076", () => {
  assertSummaryCountAtLeast("전체 기능 항목", 509);
  assertSummaryCountAtLeast("기능 ID 목록", 509);
  assertRangeCovers("SAFE", 76);
  assertRangeCovers("OPS", 46);
  assert(coverageVerifier.includes("loadImplementationManifest") && coverageVerifier.includes("validateImplementationManifest"),
    "feature coverage missing canonical implementation manifest validation");
  for (const id of ["SAFE-076", "OPS-046"]) {
    const mapping = implementationManifest.items?.find((item) => item.id === id);
    assert(mapping?.verifierEvidence?.command === "verify-v290-ui-fulltest-criteria-freeze",
      `implementation manifest ${id} missing V290-S05 verifier mapping`);
  }
  assert(projectInventoryVerifierRangeCovers("SAFE", 76), "project inventory verifier missing SAFE-076 coverage");
  assert(projectInventoryVerifierRangeCovers("OPS", 46), "project inventory verifier missing OPS-046 coverage");
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
    "verify-manual-ui-evidence",
  ]) {
    assert(manualVerifier.includes(snippet), `manual UI verifier missing current-target snippet: ${snippet}`);
  }
});

check("SAFE-076 canonical UI evidence boundary", () => {
  const uiCriteriaSource = policy.caseEquivalence?.forbiddenEvidenceKinds || [];
  const rawMaterialPromoted = ['raw-json-only', 'api-only', 'static-smoke', 'screenshot-only'].some(kind => !uiCriteriaSource.includes(kind));
  const safe076BoundaryObserved = serverSh.includes("verify-v290-ui-fulltest-criteria-freeze") && rawMaterialPromoted === false;
  assert(safe076BoundaryObserved && rawMaterialPromoted === false,
    "verify-v290-ui-fulltest-criteria-freeze raw material must not be promoted to direct browser PASS");
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
console.log("- directBrowserEvidence: direct-or-policy-v4-qualified");
console.log("- rawJsonApiOnly: not-ui-pass");
console.log("- staticSmokeScreenshotOnly: not-ui-pass");
console.log("- chromeFallback: requires-policy-v4-qualification");
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
