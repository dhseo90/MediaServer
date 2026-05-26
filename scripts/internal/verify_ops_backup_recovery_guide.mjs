#!/usr/bin/env node
// 파일 용도: 운영 백업/복구 가이드가 auth/registry/event/evidence/asset 복구 기준을 빠짐없이 담는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const checks = [];

check("backup recovery guide covers required operational assets", () => {
  const doc = readText("docs/ops-backup-recovery.md");
  const required = [
    "# Ops Backup / Recovery Guide",
    "MEDIA_SERVER_AUTH_USERS_FILE",
    ".media_server.users.json",
    "MEDIA_SERVER_SOURCE_REGISTRY",
    "MEDIA_SERVER_PUBLISHED_VIEWS",
    "MEDIA_SERVER_ANALYSIS_REGISTRY",
    ".media_server.ops_audit.jsonl",
    "MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH",
    "MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR",
    "MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR",
    "MEDIA_SERVER_FILE_ROOT",
    "MEDIA_SERVER_ANALYSIS_MODEL",
    "MEDIA_SERVER_ANALYSIS_LABELS",
    "shasum -a 256",
    "manifest.json",
    "SHA256SUMS",
    "restore-validation-plan.md",
    "0600",
    "signed token",
    "./server.sh verify-ops-backup-restore-dry-run",
  ];
  for (const snippet of required) {
    assert(doc.includes(snippet), `backup guide missing snippet: ${snippet}`);
  }
});

check("backup recovery guide defines restore validation commands", () => {
  const doc = readText("docs/ops-backup-recovery.md");
  const required = [
    "./server.sh build",
    "./server.sh diagnose",
    "./server.sh auth-user list",
    "./server.sh verify-auth-bootstrap",
    "./server.sh verify-auth-users",
    "./server.sh verify-auth-routes",
    "./server.sh verify-ops-route-boundaries",
    "./server.sh verify-ops-rule-relationships",
    "./server.sh verify-ops-event-records-scope",
    "./server.sh verify-ops-audit-persistence",
    "./server.sh verify-ops-diagnostics-bundle",
    "./server.sh verify-ops-backup-restore-dry-run",
    "verify-ops-client-ui",
    "verify-ops-click-e2e",
    "verify-ops-tables-layout",
  ];
  for (const snippet of required) {
    assert(doc.includes(snippet), `backup guide missing restore validation: ${snippet}`);
  }
});

check("guide is discoverable from config reference", () => {
  const config = readText("docs/config-reference.md");
  assert(config.includes("docs/ops-backup-recovery.md"), "config reference must link ops backup guide");
});

check("guide is discoverable from docs index", () => {
  const docsIndex = readText("docs/README.md");
  assert(docsIndex.includes("ops-backup-recovery.md"), "docs index must link ops backup guide");
});

check("server exposes backup recovery guide verification", () => {
  const server = readText("server.sh");
  assert(server.includes("verify-ops-backup-recovery-guide"), "server.sh is missing verify-ops-backup-recovery-guide");
  assert(server.includes("verify_ops_backup_recovery_guide.mjs"), "server.sh does not dispatch verify_ops_backup_recovery_guide.mjs");
  assert(server.includes("verify-ops-backup-restore-dry-run"), "server.sh is missing verify-ops-backup-restore-dry-run");
  assert(server.includes("verify_ops_backup_restore_dry_run.mjs"), "server.sh does not dispatch verify_ops_backup_restore_dry_run.mjs");
});

let failCount = 0;
for (const item of checks) {
  try {
    item.run();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

console.log("");
console.log("== Ops backup/recovery guide verification summary ==");
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);

if (failCount > 0) process.exit(1);

function check(name, run) {
  checks.push({ name, run });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
