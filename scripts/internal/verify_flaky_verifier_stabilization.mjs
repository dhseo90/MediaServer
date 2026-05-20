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
const rule = readText("scripts/internal/verify_ops_rules_embed_smoke.mjs");
const helper = readText("scripts/internal/rule_preview_fixture_helpers.mjs");
const cleanup = readText("scripts/internal/verify_fixture_cleanup_contracts.mjs");
const stream = readText("docs/stream-verification.md");
const clipboardDocs = readText("docs/browser-use-clipboard-diagnostics.md");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");

const checks = [];

check("access approval fixture restore and cleanup are enforced", () => {
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

check("clipboard fallback and capture stubs restore browser state", () => {
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

check("browser route smoke keeps deterministic waits and error collection", () => {
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

check("rule preview smoke uses shared fixture helper and blocks invalid save writes", () => {
  assertIncludes(rule, [
    "ensureRulePreviewPrerequisites",
    "cleanupRulePreviewPrerequisites",
    "const seededPrereqs = await ensureRulePreviewPrerequisites({ httpBase })",
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

check("fixture cleanup verifier and docs expose the stabilization contract", () => {
  assertIncludes(cleanup, [
    "ops click E2E restores access request fixture",
    "ops event records smoke restores storage, audit, and evidence fixtures",
    "stream verification docs expose cleanup-sensitive commands",
  ], "verify_fixture_cleanup_contracts.mjs");
  assertIncludes(stream, [
    "## Flaky verifier stabilization",
    "Access approval",
    "rule preview save",
    "clipboard fallback",
    "Browser/Computer Use fallback",
    "raw JSON/API-only",
    "fixture cleanup",
    "browser route smoke",
    "sandbox local fetch/CDP 제한",
    "./server.sh verify-flaky-verifiers",
  ], "docs/stream-verification.md");
});

check("server entrypoint and inventory expose flaky verifier guard", () => {
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
