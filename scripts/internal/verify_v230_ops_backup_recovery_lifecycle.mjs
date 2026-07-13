#!/usr/bin/env node
// 파일 용도: v2.3.0 Ops backup/recovery evidence lifecycle gate와 산출물 경계를 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.3.0 Ops backup/recovery evidence lifecycle verification

Usage:
  ./server.sh verify-v230-ops-backup-recovery-lifecycle [options]

Options:
  --report <path>       Markdown lifecycle report를 저장합니다.
  --json-report <path>  JSON lifecycle report를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - existing backup/restore dry-run creates manifest, checksums, and restore validation plan
  - existing evidence cleanup job proves dry-run/apply/audit retention behavior on fixtures
  - docs/backlog/release evidence/inventory expose the v2.3.0 lifecycle boundary
  - no claim is made that real operational backups, long recording backup, or external storage were completed
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const branch = runText("git", ["rev-parse", "--abbrev-ref", "HEAD"], { optional: true }).trim() || "unknown";
const head = runText("git", ["rev-parse", "HEAD"], { optional: true }).trim() || "unknown";
const payload = buildPayload();
const checks = [];

check("backup/restore dry-run produces lifecycle evidence bundle", () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-v230-ops-backup-"));
  const output = runNodeScript("verify_ops_backup_restore_dry_run.mjs", ["--work-dir", workDir]);
  const manifestPath = path.join(workDir, "backup-20260509-120000/manifest.json");
  const checksumsPath = path.join(workDir, "backup-20260509-120000/SHA256SUMS");
  const validationPlanPath = path.join(workDir, "restore-runtime/restore-validation-plan.md");
  assert(output.includes("Ops backup/restore dry-run summary"), "dry-run output missing summary");
  assert(fs.existsSync(manifestPath), "dry-run did not create manifest.json");
  assert(fs.existsSync(checksumsPath), "dry-run did not create SHA256SUMS");
  assert(fs.existsSync(validationPlanPath), "dry-run did not create restore-validation-plan.md");
  const manifest = JSON.parse(readFile(manifestPath));
  const validationPlan = readFile(validationPlanPath);
  for (const snippet of [
    "media-server.ops-backup.v1",
    "auth-store",
    "source-registry",
    "published-views",
    "analysis-registry",
    "event-record-active",
    "snapshot-evidence",
    "clip-evidence",
    "env-summary",
  ]) {
    assert(JSON.stringify(manifest).includes(snippet), `manifest missing lifecycle item: ${snippet}`);
  }
  for (const command of [
    "./server.sh build",
    "./server.sh diagnose",
    "./server.sh verify-auth-routes",
    "./server.sh verify-ops-event-records-scope --http-base http://127.0.0.1:8080",
    "./server.sh verify-ops-client-ui",
  ]) {
    assert(validationPlan.includes(command), `restore validation plan missing command: ${command}`);
  }
  payload.runtimeEvidence.backupDryRun = {
    status: "pass",
    workDir,
    manifestPath,
    checksumsPath,
    validationPlanPath,
    itemCount: manifest.items.length,
  };
});

check("evidence retention cleanup proves dry-run, apply, and audit behavior", () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-v230-evidence-cleanup-"));
  const dryRunReport = path.join(workDir, "dry-run.json");
  const applyReport = path.join(workDir, "apply.json");
  const auditFile = path.join(workDir, "apply-audit.json");
  runNodeScript("run_ops_evidence_retention_cleanup.mjs", [
    "--fixture",
    "--fixture-root", workDir,
    "--max-age-days", "1",
    "--report-file", dryRunReport,
    "--audit-file", path.join(workDir, "dry-run-audit.json"),
  ]);
  runNodeScript("run_ops_evidence_retention_cleanup.mjs", [
    "--snapshot-dir", path.join(workDir, ".media_server.va_snapshots"),
    "--clip-dir", path.join(workDir, ".media_server.va_clips"),
    "--max-age-days", "1",
    "--apply",
    "--report-file", applyReport,
    "--audit-file", auditFile,
  ]);
  const dryRun = JSON.parse(readFile(dryRunReport));
  const applied = JSON.parse(readFile(applyReport));
  const audit = JSON.parse(readFile(auditFile));
  assert(dryRun.schema === "media-server.ops-evidence-retention-cleanup.v1", "dry-run cleanup schema mismatch");
  assert(dryRun.apply === false, "dry-run cleanup must not apply deletes");
  assert(applied.apply === true, "apply cleanup report must be apply=true");
  assert(applied.deleted.snapshots.length === 1, "apply cleanup must delete one expired snapshot");
  assert(applied.deleted.clips.length === 1, "apply cleanup must delete one expired clip");
  assert(audit.action === "retention-cleanup", "cleanup audit action mismatch");
  assert(audit.after.bundleExpiredCleanup === "token-expiry-no-server-file", "cleanup audit missing bundle expiry policy");
  assert(fs.existsSync(path.join(workDir, ".media_server.va_snapshots/fresh.ppm")), "fresh snapshot was not preserved");
  assert(fs.existsSync(path.join(workDir, ".media_server.va_clips/fresh.clip/manifest.json")), "fresh clip was not preserved");
  payload.runtimeEvidence.retentionCleanup = {
    status: "pass",
    workDir,
    dryRunReport,
    applyReport,
    auditFile,
    expiredSnapshots: dryRun.snapshotPlan.expired.length,
    expiredClips: dryRun.clipPlan.expired.length,
  };
});

check("ops backup guide documents the v2.3.0 lifecycle boundary", () => {
  const doc = readText("docs/ops-backup-recovery.md");
  for (const snippet of [
    "## v2.3.0 Ops backup/recovery evidence lifecycle",
    "media-server.v230-ops-backup-recovery-lifecycle.v1",
    "staging drill",
    "redacted evidence bundle",
    "retention cleanup",
    "운영 데이터 백업 완료로 확대 보고하지 않습니다",
    "장기 영상 녹화 백업",
    "external storage replication",
    "verify-v230-ops-backup-recovery-lifecycle",
  ]) {
    assert(doc.includes(snippet), `ops backup guide missing v2.3.0 lifecycle snippet: ${snippet}`);
  }
});

check("historical release records preserve V230-S06 completion without current-roadmap overclaim", () => {
  const records = readText("docs/release-test-records.md");
  assert(records.includes("| v230 S06 backup/recovery lifecycle | backup restore dry-run과 evidence retention cleanup dry-run/apply/audit 확인 | pass |"),
    "historical V230-S06 lifecycle PASS record missing");
  const backlog = readText("docs/development-backlog.md");
  assert(!backlog.includes("실제 운영 백업 완료"),
    "current roadmap must not promote the historical lifecycle gate to real operational backup completion");
});

check("release evidence index records S06 without promoting unrun operational backup", () => {
  const index = readText("docs/release-evidence-index.md");
  for (const snippet of [
    "v230-s06-ops-backup-recovery-lifecycle-20260605",
    "media-server.v230-ops-backup-recovery-lifecycle.v1",
    "verify-v230-ops-backup-recovery-lifecycle",
    "verify-ops-backup-restore-dry-run",
    "verify-ops-evidence-retention-cleanup",
    "Not run for `v230-s06-ops-backup-recovery-lifecycle-20260605`",
    "real operational backup",
    "external storage replication",
    "UI 풀테스트 직접 조작",
  ]) {
    assert(index.includes(snippet), `release evidence index missing S06 snippet: ${snippet}`);
  }
});

check("feature inventory maps backup lifecycle to approved test areas", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  for (const snippet of [
    "OPS-035",
    "v2.3.0 S06 Ops backup/recovery evidence lifecycle",
    "verify-v230-ops-backup-recovery-lifecycle",
    "staging drill manifest/checksum/restore-validation-plan",
    "redacted evidence bundle",
    "retention cleanup dry-run/apply/audit",
    "비대상: UI 없어야 정상",
    "30분/120분/UI 실행 PASS로 대체하지 않음",
  ]) {
    assert(inventory.includes(snippet), `project feature inventory missing S06 snippet: ${snippet}`);
  }
});

check("server entrypoint exposes the S06 lifecycle verifier", () => {
  const server = readText("server.sh");
  assert(server.includes("verify-v230-ops-backup-recovery-lifecycle"),
    "server.sh missing verify-v230-ops-backup-recovery-lifecycle");
  assert(server.includes("verify_v230_ops_backup_recovery_lifecycle.mjs"),
    "server.sh missing v2.3.0 S06 lifecycle verifier dispatch");
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    item.fn();
    pass += 1;
    payload.checks.push({ name: item.name, status: "pass" });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    payload.status = "fail";
    payload.checks.push({ name: item.name, status: "fail", message: error instanceof Error ? error.message : String(error) });
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log("== v2.3.0 Ops backup/recovery lifecycle summary ==");
console.log(`- schema: ${payload.schema}`);
console.log(`- targetStep: ${payload.targetStep}`);
console.log(`- branch: ${payload.branch}`);
console.log(`- head: ${payload.head}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

if (reportPath) writeText(reportPath, renderMarkdown(payload));
if (jsonReportPath) writeText(jsonReportPath, `${JSON.stringify(payload, null, 2)}\n`);
if (fail > 0) process.exit(1);

function buildPayload() {
  return {
    schema: "media-server.v230-ops-backup-recovery-lifecycle.v1",
    generatedAt: new Date().toISOString(),
    status: "pass",
    targetStep: "V230-S06",
    activeRoadmap: "v2.3.0 Operational Evidence & Contract Baseline",
    branch,
    head,
    checks: [],
    runtimeEvidence: {},
    completionBoundary: {
      primary: "Prove the backup/restore staging drill, redacted evidence bundle shape, and retention cleanup lifecycle using local fixtures and existing operational verifiers.",
      excluded: [
        "No real production backup was created.",
        "No external storage replication, restore into production, long recording backup, 30 minute soak, 120 minute longrun, UI fulltest, push, PR, tag, or GitHub Release was executed by this verifier.",
      ],
    },
    tokenUsage: {
      tokenStart: "96792",
      tokenEnd: "미집계",
      tokenConsumed: "미집계",
      elapsed: "command output 기준",
      source: "Codex goal usage snapshot at S06 start plus command output",
    },
  };
}

function renderMarkdown(report) {
  const lines = [
    "# v2.3.0 Ops Backup/Recovery Lifecycle Report",
    "",
    `- schema: ${report.schema}`,
    `- generatedAt: ${report.generatedAt}`,
    `- status: ${report.status}`,
    `- targetStep: ${report.targetStep}`,
    `- branch: ${report.branch}`,
    `- head: ${report.head}`,
    "",
    "## Completion Boundary",
    "",
    `- primary: ${report.completionBoundary.primary}`,
    ...report.completionBoundary.excluded.map(item => `- excluded: ${item}`),
    "",
    "## Runtime Evidence",
    "",
    `- backupDryRun: ${report.runtimeEvidence.backupDryRun?.status || "not-run"}`,
    `- retentionCleanup: ${report.runtimeEvidence.retentionCleanup?.status || "not-run"}`,
    "",
    "## Checks",
    "",
    "| Check | Status |",
    "| --- | --- |",
    ...report.checks.map(item => `| ${escapePipe(item.name)} | ${item.status} |`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runNodeScript(file, scriptArgs = []) {
  return execFileSync(process.execPath, [path.join(scriptDir, file), ...scriptArgs], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runText(command, commandArgs, options = {}) {
  try {
    return execFileSync(command, commandArgs, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (options.optional) return "";
    throw error;
  }
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[toCamel(raw)] = next;
      index += 1;
    } else {
      parsed[toCamel(raw)] = "1";
    }
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}

function escapePipe(value) {
  return String(value).replace(/\|/g, "\\|");
}
