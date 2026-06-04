#!/usr/bin/env node
// 파일 용도: flaky 가능성이 큰 UI verifier의 fixture, clipboard, route smoke 안정화 guard를 정적으로 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Flaky verifier stabilization guard

Usage:
  ./server.sh verify-flaky-verifiers

Checks:
  - access approval E2E가 users file snapshot/restore와 server cleanup assertion을 유지
  - rule preview smoke가 shared fixture helper와 cleanup finally를 유지
  - clipboard fallback/capture stub이 restore path를 유지
  - browser route smoke가 wait/path/error/overflow guard를 유지
  - docs가 제품 회귀와 sandbox/browser 환경 실패를 분리해 설명
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const click = readText("scripts/internal/verify_ops_ui_click_e2e.mjs");
const oneShot = readText("scripts/internal/verify_ui_fulltest_one_shot.mjs");
const rule = readText("scripts/internal/verify_ops_rules_embed_smoke.mjs");
const helper = readText("scripts/internal/rule_preview_fixture_helpers.mjs");
const cleanup = readText("scripts/internal/verify_fixture_cleanup_contracts.mjs");
const stream = readText("docs/stream-verification.md");
const manualFulltest = readText("docs/manual-ui-fulltest.md");
const manualChecklist = readText("docs/manual-ui-checklist.md");
const clipboardDocs = readText("docs/browser-use-clipboard-diagnostics.md");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");

const checks = [];

check("access approval fixture restore is enforced", () => {
  assertIncludes(click, [
    "--auth-users-file <path>",
    "snapshotAuthStore",
    "restoreAuthStoreSnapshot",
    "assertAccessRequestFixtureCleaned",
    "access request fixture cleanup failed",
    "await restoreAuthStoreSnapshot(fixture.snapshot)",
    "await assertAccessRequestFixtureCleaned(fixture)",
    "finally {",
    "restoreAccessRequestApprovalSpy",
  ], "verify_ops_ui_click_e2e.mjs");
});

check("clipboard stubs restore browser state", () => {
  assertIncludes(click, [
    "installClipboardFailureStub",
    "restoreClipboardFailureStub",
    "installClipboardCaptureStub",
    "restoreClipboardCaptureStub",
    "forced clipboard failure",
    "window.__opsClickClipboardOriginal",
    "window.__opsClickClipboardCaptureOriginal",
    "assertClientCopyFallback",
    "assertClientCopyPayload",
    "forbiddenSnippets",
  ], "verify_ops_ui_click_e2e.mjs");
  assertIncludes(clipboardDocs, [
    "Browser Use virtual clipboard is not installed",
    "`verify-ops-click-e2e` clipboard 실패 주입",
    "제품 fallback 검증은 Browser Use clipboard 성공 여부가 아니라 UI toast",
    "Browser/Computer Use fallback 절차",
    "Browser Use, Chrome",
    "Computer Use",
    "raw JSON/API-only 확인은",
    "자동 smoke 결과를 `대체 검증`으로만 기록",
  ], "docs/browser-use-clipboard-diagnostics.md");
});

check("browser route smoke keeps deterministic waits", () => {
  assertIncludes(click, [
    "waitForPath",
    "waitForResult",
    "waitForScrollIdle",
    "installErrorCollector",
    "assertBrowserErrors",
    "assertNoOverflow",
    'a[href="/ops/dashboard"]',
    'a[href="/ops/sources"]',
    'a[href="/ops/rules"]',
    'a[href="/ops/users"]',
    'a[href="/client/live"]',
    'a[href="/client/dashboard"]',
    'Page.navigate',
    'Input.dispatchMouseEvent',
  ], "verify_ops_ui_click_e2e.mjs");
});

check("ops click E2E exits explicitly after writing summary", () => {
  assertIncludes(click, [
    "exitAfterSummary",
    "await exitAfterSummary(0)",
    "await exitAfterSummary(1)",
  ], "verify_ops_ui_click_e2e.mjs");
});

check("UI fulltest one-shot manual result verification is opt-in", () => {
  assertIncludes(oneShot, [
    "const manualResult = args.manualResult || \"\"",
    "const skipManualResult = Boolean(args.skipManualResult) || !manualResult",
    "manual result not provided",
  ], "verify_ui_fulltest_one_shot.mjs");
  assertNotIncludes(oneShot, [
    "docs/manual-ui-result-2026-05-25-ui-fulltest-restart.md",
  ], "verify_ui_fulltest_one_shot.mjs");
});

check("UI fulltest one-shot docs expose auth env and manual-result boundaries", () => {
  for (const text of [stream, manualFulltest, manualChecklist]) {
    assertIncludes(text, [
      "--manual-result <result.md>",
      "manual result 구조 검증은 opt-in",
      "manual result를 지정하지 않으면",
      "MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD",
      "MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD",
      "MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD",
      "MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE",
      "MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO",
      "wrapper PASS는 full UI 풀테스트 PASS가 아닙니다",
    ], "one-shot UI docs");
  }
});

check("rule preview smoke uses shared fixture helper", () => {
  assertIncludes(rule, [
    "ensureRulePreviewPrerequisites",
    "cleanupRulePreviewPrerequisites",
    "const seededPrereqs = await ensureRulePreviewPrerequisites({",
    "finally {",
    "await cleanupRulePreviewPrerequisites({ httpBase, created: seededPrereqs })",
    "preSaveValidation",
    "attemptedWrites.length === 0",
    "blocked test va-rule write",
    "저장 전 검증 실패",
  ], "verify_ops_rules_embed_smoke.mjs");
  assertIncludes(helper, [
    "findFreeNumericId",
    "created.profileId",
    "created.ruleId",
    "created.vaRuleId",
    "method: \"DELETE\"",
    "requestJson",
    "response.ok",
  ], "rule_preview_fixture_helpers.mjs");
});

check("fixture cleanup verifier exposes stabilization contract", () => {
  assertIncludes(cleanup, [
    "ops click E2E restores access request fixture",
    "ops event records smoke restores storage fixture",
    "ops event records smoke restores audit fixture",
    "ops event records smoke removes evidence fixtures",
    "stream verification docs expose cleanup-sensitive commands",
  ], "verify_fixture_cleanup_contracts.mjs");
  assertIncludes(stream, [
    "## Flaky verifier stabilization",
    "Access approval",
    "rule preview save",
    "clipboard fallback",
    "raw JSON/API-only",
    "fixture cleanup",
    "browser route smoke",
    "Chrome/CDP fallback",
    "sandbox local fetch/browser automation 제한",
    "./server.sh verify-flaky-verifiers",
  ], "docs/stream-verification.md");
});

check("server entrypoint exposes flaky verifier guard", () => {
  assertIncludes(server, [
    "verify-flaky-verifiers",
    "verify_flaky_verifier_stabilization.mjs",
  ], "server.sh");
  assertIncludes(inventory, [
    "verify_flaky_verifier_stabilization.mjs",
  ], "verify_script_inventory.mjs");
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
console.log("== Flaky verifier stabilization summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(text, terms, label) {
  const missing = terms.filter(term => !text.includes(term));
  if (missing.length > 0) {
    throw new Error(`${label} missing required wording: ${missing.join(", ")}`);
  }
}

function assertNotIncludes(text, terms, label) {
  const found = terms.filter(term => text.includes(term));
  if (found.length > 0) {
    throw new Error(`${label} contains forbidden wording: ${found.join(", ")}`);
  }
}
