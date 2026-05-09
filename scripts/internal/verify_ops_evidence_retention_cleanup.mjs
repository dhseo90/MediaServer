#!/usr/bin/env node
// 파일 용도: Evidence retention cleanup job의 dry-run/apply/audit/report 계약을 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const checks = [];

check("cleanup job script exposes evidence retention policy", () => {
  const script = readText("scripts/internal/run_ops_evidence_retention_cleanup.mjs");
  const required = [
    "media-server.ops-evidence-retention-cleanup.v1",
    "retention-cleanup",
    "token-expiry-no-server-file",
    "snapshotDir",
    "clipDir",
    "keepCompactions",
    "auditFile",
    "apply",
  ];
  for (const snippet of required) {
    assert(script.includes(snippet), `cleanup script missing snippet: ${snippet}`);
  }
});

check("cleanup job dry-run and apply preserve fresh evidence", () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-evidence-cleanup-verify-"));
  const dryRunReport = path.join(workDir, "dry-run.json");
  execFileSync(process.execPath, [
    path.join(rootDir, "scripts/internal/run_ops_evidence_retention_cleanup.mjs"),
    "--fixture",
    "--fixture-root", workDir,
    "--max-age-days", "1",
    "--report-file", dryRunReport,
    "--audit-file", path.join(workDir, "dry-run-audit.json"),
  ], { cwd: rootDir, stdio: "pipe" });
  const dryRun = JSON.parse(fs.readFileSync(dryRunReport, "utf8"));
  assert(dryRun.apply === false, "dry-run report must be non-apply");
  assert(dryRun.snapshotPlan.expired.length === 1, "dry-run must find one expired snapshot");
  assert(dryRun.clipPlan.expired.length === 1, "dry-run must find one expired clip");
  assert(fs.existsSync(path.join(workDir, ".media_server.va_snapshots/expired.ppm")), "dry-run deleted expired snapshot");

  const applyReport = path.join(workDir, "apply.json");
  const auditFile = path.join(workDir, "apply-audit.json");
  execFileSync(process.execPath, [
    path.join(rootDir, "scripts/internal/run_ops_evidence_retention_cleanup.mjs"),
    "--snapshot-dir", path.join(workDir, ".media_server.va_snapshots"),
    "--clip-dir", path.join(workDir, ".media_server.va_clips"),
    "--max-age-days", "1",
    "--apply",
    "--report-file", applyReport,
    "--audit-file", auditFile,
  ], { cwd: rootDir, stdio: "pipe" });
  const applied = JSON.parse(fs.readFileSync(applyReport, "utf8"));
  const audit = JSON.parse(fs.readFileSync(auditFile, "utf8"));
  assert(applied.apply === true, "apply report must be apply");
  assert(applied.deleted.snapshots.length === 1, "apply must delete one snapshot");
  assert(applied.deleted.clips.length === 1, "apply must delete one clip");
  assert(!fs.existsSync(path.join(workDir, ".media_server.va_snapshots/expired.ppm")), "expired snapshot still exists");
  assert(!fs.existsSync(path.join(workDir, ".media_server.va_clips/expired.clip")), "expired clip still exists");
  assert(fs.existsSync(path.join(workDir, ".media_server.va_snapshots/fresh.ppm")), "fresh snapshot was deleted");
  assert(fs.existsSync(path.join(workDir, ".media_server.va_clips/fresh.clip/manifest.json")), "fresh clip was deleted");
  assert(audit.action === "retention-cleanup", "audit action mismatch");
  assert(audit.after.bundleExpiredCleanup === "token-expiry-no-server-file", "audit missing bundle cleanup policy");
});

check("server exposes evidence retention cleanup commands", () => {
  const server = readText("server.sh");
  assert(server.includes("ops-evidence-cleanup"), "server.sh missing ops-evidence-cleanup");
  assert(server.includes("verify-ops-evidence-retention-cleanup"), "server.sh missing verify command");
  assert(server.includes("run_ops_evidence_retention_cleanup.mjs"), "server.sh does not dispatch cleanup job");
  assert(server.includes("verify_ops_evidence_retention_cleanup.mjs"), "server.sh does not dispatch verify script");
});

check("documentation describes evidence retention cleanup job", () => {
  const docs = readText("docs/video-analysis.md");
  assert(docs.includes("./server.sh ops-evidence-cleanup"), "video-analysis missing cleanup command");
  assert(docs.includes("retention-cleanup"), "video-analysis missing audit action");
  assert(docs.includes("token-expiry-no-server-file"), "video-analysis missing bundle expiry policy");
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
console.log("== Ops evidence retention cleanup verification summary ==");
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
