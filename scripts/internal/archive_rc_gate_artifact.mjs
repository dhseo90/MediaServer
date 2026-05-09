#!/usr/bin/env node
// 파일 용도: RC gate artifact를 S3/NAS 등 외부 마운트 디렉터리에 checksum manifest와 함께 보관한다.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const args = parseArgs(process.argv.slice(2));
const sourceDir = path.resolve(args.sourceDir || "artifacts/rc-gate");
const destinationDir = path.resolve(args.destinationDir || "");
const runId = String(args.runId || process.env.GITHUB_RUN_ID || `local-${Date.now()}-${process.pid}`);
const retentionDays = Number(args.retentionDays || 0);

if (!destinationDir || destinationDir === path.resolve("")) {
  throw new Error("--destination-dir is required");
}
if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
  throw new Error(`source artifact dir not found: ${sourceDir}`);
}
if (!Number.isFinite(retentionDays) || retentionDays < 0) {
  throw new Error("--retention-days must be a non-negative number");
}

const archiveDir = path.join(destinationDir, runId);
fs.mkdirSync(destinationDir, { recursive: true });
resetDir(archiveDir);
copyDir(sourceDir, archiveDir);

const files = walkFiles(archiveDir)
  .map(filePath => ({
    path: path.relative(archiveDir, filePath),
    sizeBytes: fs.statSync(filePath).size,
    sha256: sha256(filePath),
  }))
  .sort((a, b) => a.path.localeCompare(b.path));

const manifest = {
  schema: "media-server.rc-external-artifact.v1",
  generatedAt: new Date().toISOString(),
  runId,
  sourceDir,
  archiveDir,
  retentionDays,
  fileCount: files.length,
  totalBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0),
  files,
};

writeText(path.join(archiveDir, "external-artifact-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeText(path.join(archiveDir, "SHA256SUMS"), `${files.map(file => `${file.sha256}  ${file.path}`).join("\n")}\n`);

const pruned = pruneOldArchives(destinationDir, runId, retentionDays);
writeIndex(destinationDir, { ...manifest, pruned });

console.log(`[pass] rc external artifact archive: ${archiveDir}`);
console.log(`[pass] files: ${files.length}`);
console.log(`[pass] bytes: ${manifest.totalBytes}`);
console.log(`[pass] pruned: ${pruned.length}`);

function pruneOldArchives(root, currentRunId, days) {
  if (days <= 0) return [];
  const cutoff = Date.now() - Math.round(days * 24 * 60 * 60 * 1000);
  const pruned = [];
  for (const name of fs.readdirSync(root)) {
    if (name === currentRunId) continue;
    const candidate = path.join(root, name);
    if (!fs.statSync(candidate).isDirectory()) continue;
    const manifestPath = path.join(candidate, "external-artifact-manifest.json");
    let generatedAt = fs.statSync(candidate).mtimeMs;
    if (fs.existsSync(manifestPath)) {
      try {
        generatedAt = Date.parse(JSON.parse(fs.readFileSync(manifestPath, "utf8")).generatedAt) || generatedAt;
      } catch {
        // Keep filesystem mtime fallback.
      }
    }
    if (generatedAt < cutoff) {
      fs.rmSync(candidate, { recursive: true, force: true });
      pruned.push(name);
    }
  }
  return pruned;
}

function writeIndex(root, latest) {
  const records = [];
  for (const name of fs.readdirSync(root).sort()) {
    const manifestPath = path.join(root, name, "external-artifact-manifest.json");
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const payload = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      records.push({
        runId: payload.runId || name,
        generatedAt: payload.generatedAt || "",
        archiveDir: payload.archiveDir || path.join(root, name),
        fileCount: payload.fileCount || 0,
        totalBytes: payload.totalBytes || 0,
      });
    } catch {
      // Ignore malformed archive records but leave directories untouched.
    }
  }
  records.sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)));
  writeText(path.join(root, "index.json"), `${JSON.stringify({
    schema: "media-server.rc-external-artifact-index.v1",
    generatedAt: new Date().toISOString(),
    latestRunId: latest.runId,
    records,
  }, null, 2)}\n`);
  writeText(path.join(root, "index.md"), buildIndexMarkdown(records, latest.pruned || []));
}

function buildIndexMarkdown(records, pruned) {
  const lines = [
    "# RC External Artifact Index",
    "",
    `- generatedAt: ${new Date().toISOString()}`,
    `- records: ${records.length}`,
    `- pruned: ${pruned.length}`,
    "",
    "| Run | Generated | Files | Bytes | Path |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const record of records) {
    lines.push(`| ${escapeMarkdown(record.runId)} | ${escapeMarkdown(record.generatedAt)} | ${record.fileCount} | ${record.totalBytes} | \`${record.archiveDir}\` |`);
  }
  return `${lines.join("\n")}\n`;
}

function copyDir(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const name of fs.readdirSync(source)) {
    const sourcePath = path.join(source, name);
    const destinationPath = path.join(destination, name);
    const stat = fs.statSync(sourcePath);
    if (stat.isDirectory()) {
      copyDir(sourcePath, destinationPath);
    } else {
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(sourcePath, destinationPath);
      fs.chmodSync(destinationPath, stat.mode & 0o777);
    }
  }
}

function walkFiles(root) {
  const result = [];
  if (!fs.existsSync(root)) return result;
  for (const name of fs.readdirSync(root).sort()) {
    const current = path.join(root, name);
    if (fs.statSync(current).isDirectory()) {
      result.push(...walkFiles(current));
    } else {
      result.push(current);
    }
  }
  return result;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function escapeMarkdown(value) {
  return String(value ?? "").replaceAll("|", "\\|");
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
