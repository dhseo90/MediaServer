#!/usr/bin/env node
// 파일 용도: EventRecord snapshot/clip evidence와 compaction snapshot retention cleanup을 운영 job으로 수행한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const args = parseArgs(process.argv.slice(2));
const apply = parseBool(args.apply, false);
const maxAgeDays = Number(args.maxAgeDays ?? 30);
const keepCompactions = Number(args.keepCompactions ?? 10);
const httpBase = String(args.httpBase || "").replace(/\/+$/, "");
const reportFile = args.reportFile || path.join(os.tmpdir(), `media_server_evidence_cleanup_${Date.now()}_${process.pid}.json`);
const markdownReportFile = args.markdownReportFile || reportFile.replace(/\.json$/i, ".md");
const auditFile = args.auditFile || "";

if (!Number.isFinite(maxAgeDays) || maxAgeDays < 0) {
  throw new Error("--max-age-days must be a non-negative number");
}
if (!Number.isFinite(keepCompactions) || keepCompactions < 0) {
  throw new Error("--keep-compactions must be a non-negative number");
}

if (parseBool(args.fixture, false)) {
  const fixtureRoot = args.fixtureRoot || fs.mkdtempSync(path.join(os.tmpdir(), "media-server-evidence-cleanup-"));
  seedFixture(fixtureRoot);
  args.snapshotDir = args.snapshotDir || path.join(fixtureRoot, ".media_server.va_snapshots");
  args.clipDir = args.clipDir || path.join(fixtureRoot, ".media_server.va_clips");
}

const status = httpBase ? await tryRequestJson("/lab/analysis/event-storage/status") : null;
const snapshotDir = path.resolve(args.snapshotDir || status?.snapshotHook?.directory || ".media_server.va_snapshots");
const clipDir = path.resolve(args.clipDir || status?.clipHook?.directory || ".media_server.va_clips");
const cutoffMs = Date.now() - Math.round(maxAgeDays * 24 * 60 * 60 * 1000);

const snapshotPlan = scanSnapshotDir(snapshotDir, cutoffMs);
const clipPlan = scanClipDir(clipDir, cutoffMs);
const compactionPlan = httpBase
  ? await cleanupCompactions(keepCompactions, apply)
  : { skipped: true, reason: "http-base not provided", keepNewest: keepCompactions };

const deleted = { snapshots: [], clips: [] };
if (apply) {
  for (const item of snapshotPlan.expired) {
    fs.rmSync(item.path, { force: true });
    deleted.snapshots.push(item);
  }
  for (const item of clipPlan.expired) {
    fs.rmSync(item.path, { recursive: true, force: true });
    deleted.clips.push(item);
  }
}

const auditPayload = {
  area: "events",
  action: "retention-cleanup",
  target: "evidence-retention",
  dryRun: !apply,
  before: {
    snapshotExpired: snapshotPlan.expired.length,
    clipExpired: clipPlan.expired.length,
    compactions: compactionPlan,
  },
  after: {
    snapshotDeleted: deleted.snapshots.length,
    clipDeleted: deleted.clips.length,
    bundleExpiredCleanup: "token-expiry-no-server-file",
  },
  metadata: {
    maxAgeDays,
    keepCompactions,
    snapshotDir,
    clipDir,
  },
};

let auditResult = { mode: "skipped", reason: "audit disabled for dry-run without audit-file" };
if (auditFile) {
  writeText(auditFile, `${JSON.stringify(auditPayload, null, 2)}\n`);
  auditResult = { mode: "file", path: auditFile };
} else if (httpBase && apply && !parseBool(args.noAudit, false)) {
  auditResult = await postAudit(auditPayload);
}

const report = {
  schema: "media-server.ops-evidence-retention-cleanup.v1",
  generatedAt: new Date().toISOString(),
  apply,
  maxAgeDays,
  cutoffMs,
  snapshotDir,
  clipDir,
  snapshotPlan,
  clipPlan,
  compactionPlan,
  deleted,
  audit: auditResult,
  policy: {
    scope: "event-short-evidence",
    longRecording: false,
    evidenceFileDeleteViaUi: false,
    cleanupJobDeletesExpiredEvidence: apply,
    bundleExpiredCleanup: "token-expiry-no-server-file",
  },
};

writeText(reportFile, `${JSON.stringify(report, null, 2)}\n`);
writeText(markdownReportFile, buildMarkdown(report));

console.log(`[pass] evidence retention cleanup report: ${reportFile}`);
console.log(`[pass] evidence retention cleanup markdown: ${markdownReportFile}`);
console.log(`[pass] mode: ${apply ? "apply" : "dry-run"}`);
console.log(`[pass] expired snapshots: ${snapshotPlan.expired.length}`);
console.log(`[pass] expired clips: ${clipPlan.expired.length}`);
console.log(`[pass] audit: ${auditResult.mode}`);

function scanSnapshotDir(root, cutoff) {
  const allowed = new Set([".jpg", ".jpeg", ".ppm", ".pgm"]);
  const files = walkFiles(root)
    .filter(filePath => allowed.has(path.extname(filePath).toLowerCase()))
    .map(filePath => fileInfo(root, filePath));
  return splitExpired(files, cutoff);
}

function scanClipDir(root, cutoff) {
  const dirs = walkDirs(root)
    .filter(dir => fs.existsSync(path.join(dir, "manifest.json")))
    .map(dir => fileInfo(root, dir));
  return splitExpired(dirs, cutoff);
}

function splitExpired(items, cutoff) {
  const expired = [];
  const kept = [];
  for (const item of items) {
    if (item.modifiedTimeMs > 0 && item.modifiedTimeMs < cutoff) {
      expired.push(item);
    } else {
      kept.push(item);
    }
  }
  return { scanned: items.length, expired, kept };
}

async function cleanupCompactions(keepNewest, shouldApply) {
  if (!httpBase) return { skipped: true, reason: "http-base not provided", keepNewest };
  if (!shouldApply) {
    const payload = await tryRequestJson("/lab/analysis/events/records/compactions");
    const files = Array.isArray(payload?.files) ? payload.files : [];
    return {
      dryRun: true,
      keepNewest,
      scanned: files.length,
      wouldDelete: Math.max(0, files.length - keepNewest),
    };
  }
  return await tryRequestJson(`/lab/analysis/events/records/compactions/cleanup?keepNewest=${encodeURIComponent(String(keepNewest))}`);
}

async function postAudit(payload) {
  try {
    const response = await fetch(`${httpBase}/ops/api/audit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    if (!response.ok) {
      return { mode: "http-failed", status: response.status, body: text.slice(0, 240) };
    }
    return { mode: "http", status: response.status };
  } catch (error) {
    return { mode: "http-failed", error: error.message };
  }
}

async function tryRequestJson(pathname) {
  const response = await fetch(`${httpBase}${pathname}`);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${pathname} failed HTTP ${response.status}: ${text.slice(0, 240)}`);
  }
  return text ? JSON.parse(text) : {};
}

function seedFixture(root) {
  const snapshotDir = path.join(root, ".media_server.va_snapshots");
  const clipDir = path.join(root, ".media_server.va_clips");
  fs.mkdirSync(snapshotDir, { recursive: true });
  fs.mkdirSync(clipDir, { recursive: true });
  const oldMs = Date.now() - 10 * 24 * 60 * 60 * 1000;
  const freshMs = Date.now();
  writeText(path.join(snapshotDir, "expired.ppm"), "P3\n1 1\n255\n255 0 0\n");
  writeText(path.join(snapshotDir, "fresh.ppm"), "P3\n1 1\n255\n0 255 0\n");
  const oldClip = path.join(clipDir, "expired.clip");
  const freshClip = path.join(clipDir, "fresh.clip");
  writeText(path.join(oldClip, "manifest.json"), "{}\n");
  writeText(path.join(oldClip, "frame-000001.ppm"), "old\n");
  writeText(path.join(freshClip, "manifest.json"), "{}\n");
  writeText(path.join(freshClip, "frame-000001.ppm"), "fresh\n");
  touchRecursive(path.join(snapshotDir, "expired.ppm"), oldMs);
  touchRecursive(oldClip, oldMs);
  touchRecursive(path.join(snapshotDir, "fresh.ppm"), freshMs);
  touchRecursive(freshClip, freshMs);
}

function touchRecursive(target, timeMs) {
  const date = new Date(timeMs);
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(target)) touchRecursive(path.join(target, name), timeMs);
  }
  fs.utimesSync(target, date, date);
}

function fileInfo(root, target) {
  const stat = fs.statSync(target);
  return {
    path: target,
    relativePath: path.relative(root, target),
    sizeBytes: stat.isDirectory() ? dirSize(target) : stat.size,
    modifiedTimeMs: Math.round(stat.mtimeMs),
  };
}

function walkFiles(root) {
  const result = [];
  if (!fs.existsSync(root)) return result;
  const stat = fs.statSync(root);
  if (!stat.isDirectory()) return [root];
  for (const name of fs.readdirSync(root).sort()) {
    const current = path.join(root, name);
    const currentStat = fs.statSync(current);
    if (currentStat.isDirectory()) result.push(...walkFiles(current));
    else result.push(current);
  }
  return result;
}

function walkDirs(root) {
  const result = [];
  if (!fs.existsSync(root)) return result;
  for (const name of fs.readdirSync(root).sort()) {
    const current = path.join(root, name);
    if (!fs.statSync(current).isDirectory()) continue;
    result.push(current, ...walkDirs(current));
  }
  return result;
}

function dirSize(root) {
  return walkFiles(root).reduce((sum, filePath) => sum + fs.statSync(filePath).size, 0);
}

function buildMarkdown(report) {
  return [
    "# Evidence Retention Cleanup Report",
    "",
    `- generatedAt: ${report.generatedAt}`,
    `- mode: ${report.apply ? "apply" : "dry-run"}`,
    `- maxAgeDays: ${report.maxAgeDays}`,
    `- snapshotDir: ${report.snapshotDir}`,
    `- clipDir: ${report.clipDir}`,
    `- expiredSnapshots: ${report.snapshotPlan.expired.length}`,
    `- expiredClips: ${report.clipPlan.expired.length}`,
    `- audit: ${report.audit.mode}`,
    `- bundleExpiredCleanup: ${report.policy.bundleExpiredCleanup}`,
    "",
    "| Area | Scanned | Expired | Deleted |",
    "| --- | --- | --- | --- |",
    `| snapshots | ${report.snapshotPlan.scanned} | ${report.snapshotPlan.expired.length} | ${report.deleted.snapshots.length} |`,
    `| clips | ${report.clipPlan.scanned} | ${report.clipPlan.expired.length} | ${report.deleted.clips.length} |`,
    "",
  ].join("\n");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
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
