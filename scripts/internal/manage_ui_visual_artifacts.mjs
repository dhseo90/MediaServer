#!/usr/bin/env node
// 파일 용도: UI visual artifact 디렉터리를 retention policy 기준으로 보관/정리한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const ARTIFACT_SCHEMA = "media-server.ui-visual-artifact-index.v1";
const REPORT_SCHEMA = "media-server.ui-visual-artifact-maintenance.v1";
const DAY_MS = 24 * 60 * 60 * 1000;

if (isMainModule()) {
  main();
}

export function manageUiVisualArtifacts({
  artifactRoot,
  archiveDir = "",
  report = "",
  markdownReport = "",
  apply = false,
  now = new Date().toISOString(),
  maxDepth = 4,
  maxAgeDays = null,
} = {}) {
  if (!artifactRoot) throw new Error("--artifact-root is required");
  const resolvedRoot = path.resolve(artifactRoot);
  if (!fs.existsSync(resolvedRoot) || !fs.statSync(resolvedRoot).isDirectory()) {
    throw new Error(`artifact root not found: ${resolvedRoot}`);
  }
  const resolvedArchiveDir = archiveDir ? path.resolve(archiveDir) : "";
  const nowDate = parseDate(now, "--now");
  const artifactDirs = findArtifactDirs(resolvedRoot, Number(maxDepth) || 4);
  const actions = [];

  for (const dir of artifactDirs) {
    const manifestPath = path.join(dir, "visual-regression-manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (manifest.schema !== ARTIFACT_SCHEMA) {
      actions.push(actionFor(dir, "skip", false, `manifest schema mismatch: ${manifest.schema || "(missing)"}`));
      continue;
    }
    const generatedAt = parseDate(manifest.generatedAt || fs.statSync(manifestPath).mtime.toISOString(), `${manifestPath} generatedAt`);
    const retentionDays = maxAgeDays == null
      ? Number(manifest.retentionPolicy?.defaultDays || 14)
      : Number(maxAgeDays);
    if (!Number.isFinite(retentionDays) || retentionDays < 0) {
      actions.push(actionFor(dir, "skip", false, `invalid retention days: ${retentionDays}`));
      continue;
    }
    const ageDays = Math.max(0, (nowDate.getTime() - generatedAt.getTime()) / DAY_MS);
    const expired = ageDays > retentionDays;
    const detail = {
      generatedAt: generatedAt.toISOString(),
      ageDays: round(ageDays),
      retentionDays,
      screenshotCount: manifest.screenshotCount ?? 0,
      archivePath: "",
    };
    if (!expired) {
      actions.push(actionFor(dir, "keep", false, "within retention window", detail));
      continue;
    }
    if (resolvedArchiveDir) {
      const archivePath = uniqueArchivePath(resolvedArchiveDir, path.basename(dir));
      detail.archivePath = archivePath;
      if (apply) copyDir(dir, archivePath);
      actions.push(actionFor(dir, "archive", true, apply ? "archived expired artifact" : "dry-run archive expired artifact", detail));
    }
    if (apply) fs.rmSync(dir, { recursive: true, force: true });
    actions.push(actionFor(dir, "cleanup", true, apply ? "removed expired artifact" : "dry-run remove expired artifact", detail));
  }

  const reportPayload = {
    schema: REPORT_SCHEMA,
    generatedAt: new Date().toISOString(),
    now: nowDate.toISOString(),
    artifactRoot: resolvedRoot,
    archiveDir: resolvedArchiveDir,
    apply: Boolean(apply),
    maxDepth: Number(maxDepth) || 4,
    maxAgeDays: maxAgeDays == null ? null : Number(maxAgeDays),
    summary: summarize(actions),
    actions,
  };

  if (report) {
    const reportPath = path.resolve(report);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(reportPayload, null, 2)}\n`);
    reportPayload.reportPath = reportPath;
  }
  if (markdownReport) {
    const markdownPath = path.resolve(markdownReport);
    fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
    fs.writeFileSync(markdownPath, buildMarkdown(reportPayload));
    reportPayload.markdownReportPath = markdownPath;
  }
  return reportPayload;
}

function main() {
  const rawArgs = process.argv.slice(2);
  if (hasHelpFlag(rawArgs)) {
    printUsageAndExit(`UI visual artifact maintenance

Usage:
  ./server.sh ui-visual-artifact-maintenance --artifact-root <dir> [options]

Options:
  --artifact-root <path>      visual-regression-manifest.json을 찾을 root 디렉터리입니다.
  --archive-dir <path>        만료 artifact를 삭제 전 복사할 디렉터리입니다.
  --report <path>             JSON maintenance report 출력 경로입니다.
  --markdown-report <path>    Markdown maintenance report 출력 경로입니다.
  --apply[=1]                 실제 archive/copy와 cleanup 삭제를 수행합니다. 기본은 dry-run입니다.
  --now <iso>                 age 계산 기준 시각입니다. 기본 현재 시각입니다.
  --max-depth <n>             artifact root 재귀 탐색 깊이입니다. 기본 4입니다.
  --max-age-days <n>          manifest retentionPolicy.defaultDays 대신 사용할 보존 기간입니다.
  -h, --help                  도움말 출력
`);
  }
  assertKnownOptions(rawArgs, [
    "artifact-root",
    "archive-dir",
    "report",
    "markdown-report",
    "apply",
    "now",
    "max-depth",
    "max-age-days",
    "h",
    "help",
  ]);
  try {
    const args = parseArgs(rawArgs);
    const result = manageUiVisualArtifacts({
      artifactRoot: args.artifactRoot,
      archiveDir: args.archiveDir,
      report: args.report,
      markdownReport: args.markdownReport,
      apply: isTruthy(args.apply),
      now: args.now || new Date().toISOString(),
      maxDepth: numberOption(args.maxDepth, 4, "--max-depth"),
      maxAgeDays: args.maxAgeDays == null ? null : numberOption(args.maxAgeDays, 14, "--max-age-days"),
    });
    console.log(`[pass] UI visual artifact maintenance: total=${result.summary.total} keep=${result.summary.keep} archive=${result.summary.archive} cleanup=${result.summary.cleanup} dryRun=${!result.apply}`);
    if (result.reportPath) console.log(`[pass] maintenance report: ${result.reportPath}`);
    if (result.markdownReportPath) console.log(`[pass] maintenance markdown: ${result.markdownReportPath}`);
  } catch (error) {
    console.error(`[fail] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function findArtifactDirs(root, maxDepth) {
  const result = [];
  const visit = (dir, depth) => {
    if (depth > maxDepth) return;
    if (fs.existsSync(path.join(dir, "visual-regression-manifest.json"))) {
      result.push(dir);
      return;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      visit(path.join(dir, entry.name), depth + 1);
    }
  };
  visit(root, 0);
  return result.sort((a, b) => a.localeCompare(b));
}

function actionFor(dir, action, expired, reason, detail = {}) {
  return {
    artifactDir: dir,
    action,
    expired,
    reason,
    ...detail,
  };
}

function summarize(actions) {
  const expiredArtifactDirs = new Set(actions.filter((item) => item.expired).map((item) => item.artifactDir));
  return {
    total: actions.length,
    keep: actions.filter((item) => item.action === "keep").length,
    archive: actions.filter((item) => item.action === "archive").length,
    cleanup: actions.filter((item) => item.action === "cleanup").length,
    skip: actions.filter((item) => item.action === "skip").length,
    expired: actions.filter((item) => item.expired).length,
    expiredArtifacts: expiredArtifactDirs.size,
  };
}

function uniqueArchivePath(archiveRoot, name) {
  fs.mkdirSync(archiveRoot, { recursive: true });
  let candidate = path.join(archiveRoot, name);
  let suffix = 1;
  while (fs.existsSync(candidate)) {
    suffix += 1;
    candidate = path.join(archiveRoot, `${name}-${suffix}`);
  }
  return candidate;
}

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function buildMarkdown(report) {
  const lines = [
    "# UI Visual Artifact Maintenance",
    "",
    "## PR Summary",
    "",
    `- Decision: ${maintenanceDecision(report)}`,
    `- Mode: ${report.apply ? "apply" : "dry-run"}`,
    `- Expired artifacts: ${report.summary.expiredArtifacts ?? 0}`,
    `- Planned archive actions: ${report.summary.archive}`,
    `- Planned cleanup actions: ${report.summary.cleanup}`,
    `- Artifact root: ${report.artifactRoot}`,
    `- Next action: ${maintenanceNextAction(report)}`,
    "",
    "## Report Details",
    "",
    `- schema: ${report.schema}`,
    `- generatedAt: ${report.generatedAt}`,
    `- artifactRoot: ${report.artifactRoot}`,
    `- archiveDir: ${report.archiveDir || "(none)"}`,
    `- apply: ${report.apply}`,
    `- total: ${report.summary.total}`,
    `- keep: ${report.summary.keep}`,
    `- archive: ${report.summary.archive}`,
    `- cleanup: ${report.summary.cleanup}`,
    "",
    "| Action | Expired | Age Days | Retention Days | Artifact | Reason |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of report.actions || []) {
    lines.push(`| ${item.action} | ${item.expired} | ${item.ageDays ?? ""} | ${item.retentionDays ?? ""} | ${sanitizeMarkdownCell(path.basename(item.artifactDir || ""))} | ${sanitizeMarkdownCell(item.reason || "")} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function maintenanceDecision(report) {
  const expiredArtifacts = report.summary.expiredArtifacts ?? 0;
  if (report.apply) return expiredArtifacts > 0 ? "APPLIED" : "NOOP";
  return expiredArtifacts > 0 ? "REVIEW" : "NOOP";
}

function maintenanceNextAction(report) {
  const expiredArtifacts = report.summary.expiredArtifacts ?? 0;
  if (!expiredArtifacts) return "No retention action needed.";
  if (report.apply) return "Confirm archive copy and cleanup result before closing the PR.";
  return "Review archive/cleanup candidates before rerunning with --apply.";
}

function parseDate(value, label) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid ISO date`);
  return date;
}

function numberOption(value, fallback, name) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative number`);
  return parsed;
}

function isTruthy(value) {
  const text = String(value || "").toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function sanitizeMarkdownCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const eq = token.indexOf("=");
    const key = token.slice(2, eq >= 0 ? eq : undefined).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    if (eq >= 0) {
      result[key] = token.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      result[key] = next;
      index += 1;
    } else {
      result[key] = "1";
    }
  }
  return result;
}

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}
