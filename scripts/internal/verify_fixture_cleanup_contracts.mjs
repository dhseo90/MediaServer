#!/usr/bin/env node
// 파일 용도: UI/Event 검증 fixture가 실행 후 저장소와 evidence 파일을 복원/삭제하는 계약을 정적으로 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Fixture cleanup contract verification

Usage:
  ./server.sh verify-fixture-cleanup-contracts

Checks:
  - access request click E2E restores the auth users file and asserts server cleanup
  - source/view/rule UI fixtures delete or isolate created registry records
  - manual UI VA seed writes throwaway registry files and requires explicit apply confirmation
  - ops event records scope smoke restores EventStorage/audit files and removes evidence files
  - SSE/WS/Event POST metadata smokes clean up temporary taps, rules, and receivers
  - auto-start lifecycle and browser smoke helpers remove temporary state/user data
  - docs mention the cleanup-sensitive verifier options
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const checks = [];

function check(name, fn) {
  checks.push({ name, fn });
}

check("ops click E2E restores access request fixture", () => {
  const script = readText("scripts/internal/verify_ops_ui_click_e2e.mjs");
  assertIncludes(script, [
    "--auth-users-file <path>",
    "snapshotAuthStore",
    "restoreAuthStoreSnapshot",
    "assertAccessRequestFixtureCleaned",
    "access request fixture cleanup failed",
    "await restoreAuthStoreSnapshot(fixture.snapshot)",
    "await assertAccessRequestFixtureCleaned(fixture)",
  ], "verify_ops_ui_click_e2e.mjs");
});

check("ops click E2E cleans source/view/rule UI fixtures", () => {
  const script = readText("scripts/internal/verify_ops_ui_click_e2e.mjs");
  assertIncludes(script, [
    "cleanupSourceCrudFixture(sourceId)",
    "for (const sourceId of created.reverse())",
    "cleanupRulesNativeCrudFixtures(created)",
    "source kind matrix cleanup failed",
    "rules native fixture source cleanup failed",
  ], "verify_ops_ui_click_e2e.mjs");
});

check("manual UI seed emits throwaway registry files only", () => {
  const script = readText("scripts/internal/prepare_manual_ui_fulltest_seed.mjs");
  assertIncludes(script, [
    "--emit-registry-dir <dir>",
    "Write throwaway sources/views/analysis/preconditions files. Sends 0 HTTP requests.",
    "--apply requires --confirm-throwaway-data",
    "writeRegistryFiles(outputDir, fixture, plan)",
    "sources.json",
    "views.json",
    "analysis.json",
    "preconditions.json",
    "notExecutionEvidence: true",
  ], "prepare_manual_ui_fulltest_seed.mjs");
});

check("ops event records smoke restores storage fixture", () => {
  const script = readText("scripts/internal/verify_ops_event_records_scope.mjs");
  assertIncludes(script, [
    "seedPopulatedEventRecordFixture",
    "cleanupPopulatedEventRecordFixture",
    "restoreFileSnapshot(fixture.eventSnapshot)",
  ], "verify_ops_event_records_scope.mjs");
});

check("ops event records smoke restores audit fixture", () => {
  const script = readText("scripts/internal/verify_ops_event_records_scope.mjs");
  assertIncludes(script, [
    "const auditSnapshot = snapshotFile(path.resolve(\".media_server.ops_audit.jsonl\"))",
    "restoreFileSnapshot(auditSnapshot)",
  ], "verify_ops_event_records_scope.mjs");
});

check("ops event records smoke removes evidence fixtures", () => {
  const script = readText("scripts/internal/verify_ops_event_records_scope.mjs");
  assertIncludes(script, [
    "fs.rmSync(fixture.snapshotPath",
    "fs.rmSync(fixture.clipBundleDir",
    "ops-events-populated-${visualWidth}.png",
  ], "verify_ops_event_records_scope.mjs");
});

check("metadata and event verifier temp resources are cleaned", () => {
  const eventPost = readText("scripts/internal/verify_event_post_dispatch.sh");
  const sse = readText("scripts/internal/va_metadata_stream_smoke.py");
  const ws = readText("scripts/internal/verify_ws_va_metadata.mjs");
  assertIncludes(eventPost, [
    "trap cleanup EXIT",
    "curl -fsS -X DELETE \"${HTTP_BASE}/lab/analysis/taps/${TAP_ID}\"",
    "curl -fsS -X DELETE \"${HTTP_BASE}/lab/analysis/rules/${rule_id}\"",
    "kill \"${RECEIVER_PID}\"",
  ], "verify_event_post_dispatch.sh");
  assertIncludes(sse, [
    "activeTapsBefore",
    "activeTapsAfter",
    "skip_cleanup_count_check",
    "SSE 임시 analysis tap cleanup 확인",
  ], "va_metadata_stream_smoke.py");
  assertIncludes(ws, [
    "deleteAllTaps()",
    "waitForTapCleanup()",
    "temporary WebSocket tap was not cleaned up",
    "WebSocket smoke용 명시적 analysis tap 삭제 확인",
  ], "verify_ws_va_metadata.mjs");
});

check("auto-start lifecycle uses throwaway state and port cleanup", () => {
  const script = readText("scripts/internal/verify_ops_source_lifecycle.mjs");
  assertIncludes(script, [
    "const managedStateDir = path.join(\"/private/tmp\"",
    "MEDIA_SERVER_SOURCE_REGISTRY: path.join(managedStateDir, \"sources.json\")",
    "MEDIA_SERVER_PUBLISHED_VIEWS: path.join(managedStateDir, \"views.json\")",
    "MEDIA_SERVER_ANALYSIS_REGISTRY: path.join(managedStateDir, \"analysis.json\")",
    "MEDIA_SERVER_AUTH_USERS_FILE: path.join(managedStateDir, \"users.json\")",
    "managedServer.kill(\"SIGTERM\")",
    "managedServer.kill(\"SIGKILL\")",
    "fs.rmSync(managedStateDir",
    "assertZeroLifecycle(idle.sourceLifecycle)",
  ], "verify_ops_source_lifecycle.mjs");
});

check("browser visual smoke removes temporary chrome profile", () => {
  const script = readText("scripts/internal/ui_visual_smoke_lib.mjs");
  assertIncludes(script, [
    "const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), \"media-server-ui-chrome-\"))",
    "`--user-data-dir=${userDataDir}`",
    "chrome.kill(\"SIGTERM\")",
    "chrome.kill(\"SIGKILL\")",
    "fs.rmSync(userDataDir, { recursive: true, force: true",
  ], "ui_visual_smoke_lib.mjs");
});

check("stream verification docs expose cleanup-sensitive commands", () => {
  const docs = readText("docs/stream-verification.md");
  assertIncludes(docs, [
    "verify-ops-click-e2e --auth-users-file <path>",
    "접근 요청 fixture cleanup",
    "prepare-manual-ui-fulltest-seed --dry-run --emit-registry-dir <dir>",
    "`sources.json`, `views.json`, `analysis.json`, `preconditions.json`",
    "verify-ops-event-records-scope --http-base",
    "active file에 잠시 주입하고 복원",
    "ops-events-populated-<width>.png",
    "SSE/WS/Event POST",
    "throwaway state dir",
    "Chrome userDataDir",
  ], "docs/stream-verification.md");
});

check("server entrypoint exposes fixture cleanup verifier", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  assertIncludes(server, [
    "verify-fixture-cleanup-contracts",
    "verify_fixture_cleanup_contracts.mjs",
  ], "server.sh");
  assertIncludes(inventory, [
    "verify_fixture_cleanup_contracts.mjs",
  ], "verify_script_inventory.mjs");
});

let pass = 0;
let fail = 0;
const failures = [];
for (const item of checks) {
  try {
    item.fn();
    pass += 1;
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`[${item.name}] ${message}`);
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

console.log("");
console.log("== Fixture cleanup contract verification summary ==");
console.log("- schema: media-server.fixture-cleanup-contracts.v1");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (failures.length > 0) {
  console.log("- failures:");
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(text, snippets, label) {
  const missing = snippets.filter(snippet => !text.includes(snippet));
  if (missing.length > 0) {
    throw new Error(`${label} missing snippet(s): ${missing.join(", ")}`);
  }
}
