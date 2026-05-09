#!/usr/bin/env node
// 파일 용도: third-party inventory를 기준으로 현재 개발/배포 환경의 dependency 버전과 asset hash snapshot을 생성한다.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Dependency snapshot writer

Usage:
  ./server.sh dependency-snapshot [options]

Options:
  --inventory <path>    attribution inventory JSON입니다. 기본 config/third_party_attribution.json.
  --output <path>       생성할 Markdown snapshot입니다. 기본 inventory.generatedSnapshotFile.
  --json-output <path>  생성할 JSON snapshot입니다.
  --binary <path>       linked library를 확인할 media_server binary입니다. 기본 build-gst-onnx/media_server.
  --no-linked-libs      binary linked library snapshot을 건너뜁니다.
  --timeout-ms <n>      각 감지 command timeout입니다. 기본 5000.
  -h, --help            도움말 출력
`);
}
assertKnownOptions(rawArgs, [
  "inventory",
  "output",
  "json-output",
  "binary",
  "no-linked-libs",
  "timeout-ms",
  "h",
  "help",
]);

const args = parseArgs(rawArgs);
const inventoryPath = path.resolve(rootDir, args.inventory || "config/third_party_attribution.json");
const inventory = readInventory(inventoryPath);
const outputPath = path.resolve(rootDir, args.output || inventory.generatedSnapshotFile || "DEPENDENCY_SNAPSHOT.md");
const jsonOutputPath = args.jsonOutput ? path.resolve(rootDir, args.jsonOutput) : "";
const timeoutMs = Number(args.timeoutMs || 5000);
const binaryPath = path.resolve(rootDir, args.binary || defaultBinaryPath());
const snapshot = buildSnapshot(inventory, {
  inventoryPath,
  timeoutMs,
  binaryPath,
  includeLinkedLibraries: !args.noLinkedLibs,
});

writeText(outputPath, buildMarkdown(snapshot));
if (jsonOutputPath) {
  writeText(jsonOutputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
}

console.log(`[pass] dependency snapshot written: ${path.relative(rootDir, outputPath)}`);
if (jsonOutputPath) {
  console.log(`[pass] dependency snapshot json written: ${path.relative(rootDir, jsonOutputPath)}`);
}

function buildSnapshot(inventoryPayload, context) {
  const dependencies = inventoryPayload.dependencies.map((dep) => ({
    id: dep.id,
    name: dep.name || dep.id,
    license: dep.license || "",
    minimumVersion: dep.minimumVersion || "",
    versionPolicy: dep.versionPolicy || "",
    detected: runDetectors(dep.detectors || [], context.timeoutMs),
    assets: inspectAssets(dep.assets || []),
  }));
  return {
    schema: "media-server.dependency-snapshot.v1",
    generatedAt: new Date().toISOString(),
    inventory: path.relative(rootDir, context.inventoryPath).replaceAll(path.sep, "/"),
    platform: `${os.type()} ${os.release()} ${os.arch()}`,
    binary: path.relative(rootDir, context.binaryPath).replaceAll(path.sep, "/"),
    dependencies,
    linkedLibraries: context.includeLinkedLibraries ? inspectLinkedLibraries(context.binaryPath, context.timeoutMs) : null,
  };
}

function runDetectors(detectors, timeoutMsValue) {
  return detectors.map((detector) => {
    const result = runCommand(detector.command, detector.args || [], timeoutMsValue);
    const output = result.output.trim();
    const firstLine = firstOutputLine(output);
    const detectedVersion = result.ok ? extractVersion(firstLine || output, detector.versionPattern) : "";
    const attention = output.includes("--enable-gpl") ? "GPL build flag 감지" : "";
    return {
      label: detector.label || detector.command,
      command: formatCommand(detector.command, detector.args || []),
      status: result.status,
      version: detectedVersion,
      firstLine,
      attention,
      error: result.error,
    };
  });
}

function inspectAssets(assets) {
  return assets.map((asset) => {
    const assetPath = path.resolve(rootDir, asset.path || "");
    if (!asset.path || !fs.existsSync(assetPath)) {
      return {
        label: asset.label || asset.path || "(missing asset)",
        path: asset.path || "",
        status: asset.optional ? "missing-optional" : "missing",
        expectedVersion: asset.expectedVersion || "",
        source: asset.source || "",
      };
    }
    const stat = fs.statSync(assetPath);
    return {
      label: asset.label || asset.path,
      path: asset.path,
      status: "ok",
      expectedVersion: asset.expectedVersion || "",
      source: asset.source || "",
      bytes: stat.size,
      sha256: asset.sha256 ? sha256File(assetPath) : "",
      lineCount: asset.lineCount ? countLines(assetPath) : null,
    };
  });
}

function inspectLinkedLibraries(binaryPath, timeoutMsValue) {
  if (!fs.existsSync(binaryPath)) {
    return { status: "missing", command: "", lines: [], error: `binary not found: ${path.relative(rootDir, binaryPath)}` };
  }
  const command = process.platform === "darwin" ? "otool" : "ldd";
  const argsForCommand = process.platform === "darwin" ? ["-L", binaryPath] : [binaryPath];
  const result = runCommand(command, argsForCommand, timeoutMsValue);
  const rawLines = result.output.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const lines = process.platform === "darwin" ? rawLines.slice(1) : rawLines;
  return {
    status: result.status,
    command: formatCommand(command, argsForCommand.map((item) => item === binaryPath ? path.relative(rootDir, item) : item)),
    lines,
    error: result.error,
  };
}

function runCommand(command, argsForCommand, timeoutMsValue) {
  if (!command) return { ok: false, status: "missing", output: "", error: "empty command" };
  const result = spawnSync(command, argsForCommand, {
    cwd: rootDir,
    encoding: "utf8",
    timeout: timeoutMsValue,
    maxBuffer: 1024 * 1024,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.error) {
    return { ok: false, status: result.error.code === "ENOENT" ? "missing" : "error", output, error: result.error.message };
  }
  if (result.status !== 0) {
    return { ok: false, status: "error", output, error: `exit=${result.status}` };
  }
  return { ok: true, status: "ok", output, error: "" };
}

function buildMarkdown(snapshot) {
  const lines = [
    "# Dependency Snapshot",
    "",
    "<!-- 이 파일은 ./server.sh dependency-snapshot 명령으로 생성합니다. -->",
    "",
    `- schema: ${snapshot.schema}`,
    `- generatedAt: ${snapshot.generatedAt}`,
    `- inventory: ${snapshot.inventory}`,
    `- platform: ${snapshot.platform}`,
    `- binary: ${snapshot.binary}`,
    "",
    "이 snapshot은 현재 개발/배포 환경에서 감지한 dependency 버전과 asset hash입니다.",
    "패키지 매니저로 설치되는 항목은 환경마다 달라질 수 있으므로, release 전에는 이 파일을 다시 생성합니다.",
    "",
    "| 구성요소 | 기준 버전/정책 | 감지 결과 | Asset/hash | 주의 |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const dep of snapshot.dependencies) {
    lines.push([
      `| ${cell(dep.name)}`,
      cell([dep.minimumVersion, dep.versionPolicy].filter(Boolean).join(" ")),
      cell(formatDetections(dep.detected)),
      cell(formatAssets(dep.assets)),
      `${cell(formatAttention(dep))} |`,
    ].join(" | "));
  }
  if (snapshot.linkedLibraries) {
    lines.push(
      "",
      "## Linked Library Snapshot",
      "",
      `- status: ${snapshot.linkedLibraries.status}`,
      snapshot.linkedLibraries.command ? `- command: \`${snapshot.linkedLibraries.command}\`` : "",
      snapshot.linkedLibraries.error ? `- error: ${snapshot.linkedLibraries.error}` : "",
      "",
      "```text",
      ...(snapshot.linkedLibraries.lines.length > 0 ? snapshot.linkedLibraries.lines : ["(linked library 정보 없음)"]),
      "```",
      "",
    );
  }
  return `${lines.join("\n")}\n`;
}

function formatDetections(items) {
  if (!items.length) return "-";
  return items.map((item) => {
    if (item.status !== "ok") return `${item.label}: ${item.status}`;
    return `${item.label}: ${item.version || item.firstLine || "ok"}`;
  }).join("; ");
}

function formatAssets(items) {
  if (!items.length) return "-";
  return items.map((item) => {
    if (item.status !== "ok") return `${item.label}: ${item.status}`;
    const parts = [`${item.label}: ${item.bytes} bytes`];
    if (item.expectedVersion) parts.push(item.expectedVersion);
    if (item.lineCount !== null && item.lineCount !== undefined) parts.push(`${item.lineCount} lines`);
    if (item.sha256) parts.push(`sha256=${item.sha256}`);
    return parts.join(", ");
  }).join("; ");
}

function formatAttention(dep) {
  const messages = [];
  for (const item of dep.detected) {
    if (item.attention) messages.push(`${item.label}: ${item.attention}`);
    if (item.status !== "ok" && item.status !== "missing") messages.push(`${item.label}: ${item.error || item.status}`);
  }
  for (const asset of dep.assets) {
    if (asset.status === "missing") messages.push(`${asset.label}: 필수 asset 없음`);
  }
  return messages.join("; ") || "-";
}

function extractVersion(value, pattern) {
  if (!pattern) return value;
  const match = new RegExp(pattern).exec(value);
  return match ? (match[1] || match[0]) : value;
}

function firstOutputLine(value) {
  return String(value || "").split(/\n/).map((line) => line.trim()).find(Boolean) || "";
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function countLines(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  if (!text) return 0;
  return text.endsWith("\n") ? text.split(/\n/).length - 1 : text.split(/\n/).length;
}

function readInventory(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`inventory not found: ${filePath}`);
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(payload.dependencies) || payload.dependencies.length === 0) {
    throw new Error("inventory.dependencies must not be empty");
  }
  return payload;
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function cell(value) {
  return String(value || "-").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function formatCommand(command, argsForCommand) {
  return [command, ...argsForCommand].map(shellToken).join(" ");
}

function shellToken(value) {
  const text = String(value);
  return /^[A-Za-z0-9_./:=@+-]+$/.test(text) ? text : JSON.stringify(text);
}

function defaultBinaryPath() {
  const candidates = ["build-gst-onnx/media_server", "build-gst/media_server", "build/media_server"];
  return candidates.find((candidate) => fs.existsSync(path.join(rootDir, candidate))) || candidates[0];
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
    if (raw === "no-linked-libs") {
      parsed.noLinkedLibs = true;
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
