#!/usr/bin/env node
// 파일 용도: 운영 백업/복구 절차를 임시 디렉터리에서 dry-run으로 리허설한다.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const args = parseArgs(process.argv.slice(2));
const workDir = args.workDir || fs.mkdtempSync(path.join(os.tmpdir(), "media-server-backup-restore-"));
const sourceDir = path.join(workDir, "source-runtime");
const backupDir = path.join(workDir, "backup-20260509-120000");
const restoreDir = path.join(workDir, "restore-runtime");
const manifestPath = path.join(backupDir, "manifest.json");
const checksumsPath = path.join(backupDir, "SHA256SUMS");
const validationPlanPath = path.join(restoreDir, "restore-validation-plan.md");

const backupItems = [
  { id: "auth-store", source: "auth/.media_server.users.json", destination: "auth/.media_server.users.json", mode: 0o600 },
  { id: "source-registry", source: "registry/.media_server.sources.json", destination: "registry/.media_server.sources.json" },
  { id: "published-views", source: "registry/.media_server.views.json", destination: "registry/.media_server.views.json" },
  { id: "analysis-registry", source: "registry/.media_server.analysis_registry.json", destination: "registry/.media_server.analysis_registry.json" },
  { id: "ops-audit", source: "audit/.media_server.ops_audit.jsonl", destination: "audit/.media_server.ops_audit.jsonl" },
  { id: "event-record-active", source: "events/.media_server.va_events.jsonl", destination: "events/.media_server.va_events.jsonl" },
  { id: "event-record-archive", source: "events/.media_server.va_events.jsonl.1", destination: "events/.media_server.va_events.jsonl.1" },
  { id: "snapshot-evidence", source: "evidence/.media_server.va_snapshots", destination: "evidence/.media_server.va_snapshots" },
  { id: "clip-evidence", source: "evidence/.media_server.va_clips", destination: "evidence/.media_server.va_clips" },
  { id: "sample-video", source: "media-assets/video/sample_h264.mp4", destination: "media-assets/video/sample_h264.mp4" },
  { id: "va-sample-video", source: "media-assets/video/va_four_scene_sample.mp4", destination: "media-assets/video/va_four_scene_sample.mp4" },
  { id: "analysis-model", source: "media-assets/models/yolo11n.onnx", destination: "media-assets/models/yolo11n.onnx" },
  { id: "analysis-labels", source: "media-assets/models/coco.names", destination: "media-assets/models/coco.names" },
  { id: "env-summary", source: "config/production.env.redacted", destination: "config/production.env.redacted" },
];

const validationCommands = [
  "./server.sh build",
  "./server.sh diagnose",
  "./server.sh auth-user list",
  "./server.sh verify-auth-bootstrap",
  "./server.sh verify-auth-users",
  "./server.sh verify-auth-routes",
  "./server.sh verify-ops-route-boundaries",
  "./server.sh verify-ops-rule-relationships --http-base http://127.0.0.1:8080",
  "./server.sh verify-ops-event-records-scope --http-base http://127.0.0.1:8080",
  "./server.sh verify-ops-audit-persistence",
  "./server.sh verify-ops-diagnostics-bundle",
  "./server.sh verify-ops-client-ui",
  "./server.sh verify-ops-click-e2e",
  "./server.sh verify-ops-tables-layout",
];

resetDir(workDir);
seedRuntime(sourceDir);
writeBackup(sourceDir, backupDir);
writeRestore(backupDir, restoreDir);
writeValidationPlan(validationPlanPath);

const sourceInventory = inventory(sourceDir);
const restoreInventory = inventory(restoreDir, { exclude: ["restore-validation-plan.md"] });
assertSameInventory(sourceInventory, restoreInventory);
assertMode(path.join(backupDir, "auth/.media_server.users.json"), 0o600, "backup auth store");
assertMode(path.join(restoreDir, "auth/.media_server.users.json"), 0o600, "restore auth store");
assertManifest();

console.log(`[pass] backup restore dry-run work dir: ${workDir}`);
console.log(`[pass] backup manifest: ${manifestPath}`);
console.log(`[pass] restore validation plan: ${validationPlanPath}`);
console.log("");
console.log("== Ops backup/restore dry-run summary ==");
console.log(`- backup items: ${backupItems.length}`);
console.log(`- files verified: ${restoreInventory.length}`);
console.log("- fail: 0");

function seedRuntime(root) {
  writeJson(path.join(root, "auth/.media_server.users.json"), {
    users: [{
      username: "admin",
      displayName: "Admin",
      role: "admin",
      scopes: ["*"],
      passwordHash: "$argon2id$v=19$m=65536,t=2,p=1$redacted",
      passwordHistory: ["$argon2id$history-redacted"],
      enabled: true,
      mustChangePassword: false,
    }],
    invites: [],
    accessRequests: [],
  }, 0o600);
  writeJson(path.join(root, "registry/.media_server.sources.json"), {
    sources: [{ sourceId: "1", displayName: "Lobby", kind: "file", file: "sample_h264.mp4", enabled: true }],
  });
  writeJson(path.join(root, "registry/.media_server.views.json"), {
    views: [{ viewId: "1", sourceId: "1", displayName: "Lobby", enabled: true }],
  });
  writeJson(path.join(root, "registry/.media_server.analysis_registry.json"), {
    profiles: [{ profileId: "default", detector: "yolo", model: "models/yolo11n.onnx" }],
    eventRules: [{ ruleId: "10", scenario: { type: "LineCrossing" } }],
    vaRules: [{ ruleId: "20", sourceId: "1", profileId: "default", eventRuleId: "10" }],
  });
  writeText(path.join(root, "audit/.media_server.ops_audit.jsonl"), `${JSON.stringify({
    area: "channels",
    action: "create",
    target: "channel:1",
    user: "admin",
    receivedAtMs: 1778300000000,
  })}\n`);
  writeText(path.join(root, "events/.media_server.va_events.jsonl"), `${JSON.stringify({
    eventId: "evt-1",
    eventType: "LineCrossing",
    channelId: "1",
    snapshotPath: ".media_server.va_snapshots/evt-1.jpg",
    clipPath: ".media_server.va_clips/evt-1/manifest.json",
  })}\n`);
  writeText(path.join(root, "events/.media_server.va_events.jsonl.1"), `${JSON.stringify({ eventId: "evt-archive" })}\n`);
  writeText(path.join(root, "evidence/.media_server.va_snapshots/evt-1.jpg"), "dry-run jpeg placeholder\n");
  writeJson(path.join(root, "evidence/.media_server.va_clips/evt-1/manifest.json"), {
    eventId: "evt-1",
    frames: ["frame-0001.ppm"],
  });
  writeText(path.join(root, "evidence/.media_server.va_clips/evt-1/frame-0001.ppm"), "dry-run frame placeholder\n");
  writeText(path.join(root, "media-assets/video/sample_h264.mp4"), "sample video placeholder\n");
  writeText(path.join(root, "media-assets/video/va_four_scene_sample.mp4"), "va sample video placeholder\n");
  writeText(path.join(root, "media-assets/models/yolo11n.onnx"), "model placeholder\n");
  writeText(path.join(root, "media-assets/models/coco.names"), "person\ncar\n");
  writeText(path.join(root, "config/production.env.redacted"), [
    "MEDIA_SERVER_AUTH_USERS_FILE=auth/.media_server.users.json",
    "MEDIA_SERVER_SOURCE_REGISTRY=registry/.media_server.sources.json",
    "MEDIA_SERVER_PUBLISHED_VIEWS=registry/.media_server.views.json",
    "MEDIA_SERVER_ANALYSIS_REGISTRY=registry/.media_server.analysis_registry.json",
    "MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH=events/.media_server.va_events.jsonl",
    "MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR=evidence/.media_server.va_snapshots",
    "MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR=evidence/.media_server.va_clips",
    "MEDIA_SERVER_FILE_ROOT=media-assets/video",
    "MEDIA_SERVER_ANALYSIS_MODEL=media-assets/models/yolo11n.onnx",
    "MEDIA_SERVER_ANALYSIS_LABELS=media-assets/models/coco.names",
    "MEDIA_SERVER_AUTH_ADMIN_TOKEN=redacted",
    "",
  ].join("\n"));
}

function writeBackup(sourceRoot, targetRoot) {
  const records = [];
  for (const item of backupItems) {
    const source = path.join(sourceRoot, item.source);
    const destination = path.join(targetRoot, item.destination);
    copyPath(source, destination);
    if (item.mode) fs.chmodSync(destination, item.mode);
    records.push({
      id: item.id,
      source: item.source,
      destination: item.destination,
      sha256: hashPath(destination),
      mode: modeString(destination),
      sizeBytes: pathSize(destination),
    });
  }
  const manifest = {
    schema: "media-server.ops-backup.v1",
    generatedAt: new Date().toISOString(),
    sourceRuntime: sourceRoot,
    backupRoot: targetRoot,
    items: records,
    restoreValidationCommands: validationCommands,
  };
  writeText(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeText(checksumsPath, `${records.map(record => `${record.sha256}  ${record.destination}`).join("\n")}\n`);
}

function writeRestore(backupRoot, targetRoot) {
  for (const item of backupItems) {
    copyPath(path.join(backupRoot, item.destination), path.join(targetRoot, item.destination));
    if (item.mode) fs.chmodSync(path.join(targetRoot, item.destination), item.mode);
  }
}

function writeValidationPlan(filePath) {
  writeText(filePath, [
    "# Restore Validation Plan",
    "",
    "복구 후 staging 포트에서 아래 명령을 순서대로 실행합니다.",
    "",
    ...validationCommands.map(command => `- \`${command}\``),
    "",
  ].join("\n"));
}

function inventory(root, options = {}) {
  const excluded = new Set(options.exclude || []);
  return walkFiles(root)
    .map(filePath => {
      const relative = path.relative(root, filePath);
      if (excluded.has(relative)) return null;
      return {
        path: relative,
        sha256: hashFile(filePath),
        mode: modeString(filePath),
        sizeBytes: fs.statSync(filePath).size,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.path.localeCompare(b.path));
}

function assertSameInventory(expected, actual) {
  const expectedMap = new Map(expected.map(item => [item.path, item]));
  const actualMap = new Map(actual.map(item => [item.path, item]));
  assert(expectedMap.size === actualMap.size, `file count mismatch: expected=${expectedMap.size} actual=${actualMap.size}`);
  for (const [relative, left] of expectedMap.entries()) {
    const right = actualMap.get(relative);
    assert(right, `missing restored file: ${relative}`);
    assert(left.sha256 === right.sha256, `sha mismatch for ${relative}`);
    assert(left.mode === right.mode, `mode mismatch for ${relative}: ${left.mode} != ${right.mode}`);
  }
}

function assertManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert(manifest.schema === "media-server.ops-backup.v1", "manifest schema mismatch");
  assert(Array.isArray(manifest.items) && manifest.items.length === backupItems.length, "manifest item count mismatch");
  assert(manifest.restoreValidationCommands.includes("./server.sh verify-ops-audit-persistence"), "manifest missing audit validation");
  const checksums = fs.readFileSync(checksumsPath, "utf8");
  assert(checksums.includes("auth/.media_server.users.json"), "checksums missing auth store");
  assert(checksums.includes("evidence/.media_server.va_clips"), "checksums missing clip evidence");
}

function assertMode(filePath, expectedMode, label) {
  const actual = fs.statSync(filePath).mode & 0o777;
  assert(actual === expectedMode, `${label} mode ${modeToString(actual)} != ${modeToString(expectedMode)}`);
}

function copyPath(source, destination) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const name of fs.readdirSync(source)) {
      copyPath(path.join(source, name), path.join(destination, name));
    }
    fs.chmodSync(destination, stat.mode & 0o777);
    return;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  fs.chmodSync(destination, stat.mode & 0o777);
}

function pathSize(target) {
  const stat = fs.statSync(target);
  if (!stat.isDirectory()) return stat.size;
  return walkFiles(target).reduce((sum, filePath) => sum + fs.statSync(filePath).size, 0);
}

function hashPath(target) {
  const stat = fs.statSync(target);
  if (!stat.isDirectory()) return hashFile(target);
  const hash = crypto.createHash("sha256");
  for (const filePath of walkFiles(target)) {
    hash.update(path.relative(target, filePath));
    hash.update("\0");
    hash.update(fs.readFileSync(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function walkFiles(root) {
  const result = [];
  if (!fs.existsSync(root)) return result;
  const stat = fs.statSync(root);
  if (!stat.isDirectory()) return [root];
  for (const name of fs.readdirSync(root).sort()) {
    const current = path.join(root, name);
    const currentStat = fs.statSync(current);
    if (currentStat.isDirectory()) {
      result.push(...walkFiles(current));
    } else {
      result.push(current);
    }
  }
  return result;
}

function writeJson(filePath, payload, mode = 0o644) {
  writeText(filePath, `${JSON.stringify(payload, null, 2)}\n`, mode);
}

function writeText(filePath, text, mode = 0o644) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, { encoding: "utf8", mode });
  fs.chmodSync(filePath, mode);
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function modeString(filePath) {
  return modeToString(fs.statSync(filePath).mode & 0o777);
}

function modeToString(mode) {
  return `0${mode.toString(8).padStart(3, "0")}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
