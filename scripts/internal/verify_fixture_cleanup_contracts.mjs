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
  - ops event records scope smoke restores EventStorage/audit files and removes evidence files
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

check("ops event records smoke restores storage, audit, and evidence fixtures", () => {
  const script = readText("scripts/internal/verify_ops_event_records_scope.mjs");
  assertIncludes(script, [
    "seedPopulatedEventRecordFixture",
    "cleanupPopulatedEventRecordFixture",
    "const auditSnapshot = snapshotFile(path.resolve(\".media_server.ops_audit.jsonl\"))",
    "restoreFileSnapshot(auditSnapshot)",
    "restoreFileSnapshot(fixture.eventSnapshot)",
    "fs.rmSync(fixture.snapshotPath",
    "fs.rmSync(fixture.clipBundleDir",
    "ops-events-populated-${visualWidth}.png",
  ], "verify_ops_event_records_scope.mjs");
});

check("stream verification docs expose cleanup-sensitive commands", () => {
  const docs = readText("docs/stream-verification.md");
  assertIncludes(docs, [
    "verify-ops-click-e2e --auth-users-file <path>",
    "접근 요청 fixture cleanup",
    "verify-ops-event-records-scope --http-base",
    "active file에 잠시 주입하고 복원",
    "ops-events-populated-<width>.png",
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
