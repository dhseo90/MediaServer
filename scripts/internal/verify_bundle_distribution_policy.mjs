#!/usr/bin/env node
// 파일 용도: 배포 bundle 안에 기본 정책상 제외해야 하는 FFmpeg/GStreamer GPL-risk runtime 바이너리가 포함됐는지 검사한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Bundle distribution policy verification

Usage:
  ./server.sh verify-bundle-policy [options]

Options:
  --bundle-dir <path>       검사할 bundle/root 디렉터리입니다. 기본은 현재 저장소입니다.
  --policy <path>           bundle distribution policy JSON입니다. 기본 config/bundle_distribution_policy.json.
  --output <path>           Markdown 리포트를 저장합니다.
  --json-output <path>      JSON 리포트를 저장합니다.
  --allow-risky-runtime     발견 항목을 실패가 아니라 경고로만 보고합니다.
  --scan-linked-libs        Mach-O/ELF/PE binary의 linked library도 검사합니다. 기본값입니다.
  --no-scan-linked-libs     linked library 검사를 건너뜁니다.
  -h, --help                도움말 출력
`);
}
assertKnownOptions(rawArgs, [
  "bundle-dir",
  "policy",
  "output",
  "json-output",
  "allow-risky-runtime",
  "scan-linked-libs",
  "no-scan-linked-libs",
  "h",
  "help",
]);

const args = parseArgs(rawArgs);
const policyPath = path.resolve(rootDir, args.policy || "config/bundle_distribution_policy.json");
const policy = readPolicy(policyPath);
const bundleDir = path.resolve(rootDir, args.bundleDir || ".");
const scanLinkedLibraries = args.noScanLinkedLibs !== true;
const allowRiskyRuntime = args.allowRiskyRuntime === true;
const outputPath = args.output ? path.resolve(rootDir, args.output) : "";
const jsonOutputPath = args.jsonOutput ? path.resolve(rootDir, args.jsonOutput) : "";

if (!fs.existsSync(bundleDir) || !fs.statSync(bundleDir).isDirectory()) {
  fail(`bundle directory not found: ${path.relative(rootDir, bundleDir)}`);
}

const rules = compileRules(policy.rules || []);
const files = walkBundle(bundleDir, policy);
const pathHits = [];
const linkedHits = [];

for (const file of files) {
  const relative = toBundleRelative(bundleDir, file);
  const normalized = normalizePath(relative);
  for (const rule of rules) {
    if (rule.pathPatterns.some((pattern) => pattern.test(normalized))) {
        pathHits.push(hitPayload({ rule, file: relative, kind: "path" }));
    }
  }
  if (scanLinkedLibraries && looksLikeBinary(file)) {
    const linked = inspectLinkedLibraries(file);
    for (const line of linked.lines) {
      const normalizedLine = normalizePath(line);
      for (const rule of rules) {
        if (rule.linkedPatterns.some((pattern) => pattern.test(normalizedLine))) {
          linkedHits.push(hitPayload({ rule, file: relative, kind: "linked", line }));
        }
      }
    }
  }
}

const allHits = [...pathHits, ...linkedHits];
const status = allHits.length === 0 ? "pass" : allowRiskyRuntime ? "warn" : "fail";
const report = buildReport({ policyPath, bundleDir, files, pathHits, linkedHits, allHits, status });
writeReports(report);
printReport(report);

if (allHits.length > 0 && !allowRiskyRuntime) {
  process.exit(1);
}

function buildReport({ policyPath: reportPolicyPath, bundleDir: reportBundleDir, files: reportFiles, pathHits: reportPathHits, linkedHits: reportLinkedHits, allHits: reportAllHits, status: reportStatus }) {
  return {
    schema: "media-server.bundle-policy-report.v1",
    generatedAt: new Date().toISOString(),
    status: reportStatus,
    allowRiskyRuntime,
    scanLinkedLibraries,
    policy: path.relative(rootDir, reportPolicyPath).replaceAll(path.sep, "/"),
    bundleDir: path.relative(rootDir, reportBundleDir).replaceAll(path.sep, "/") || ".",
    filesScanned: reportFiles.length,
    pathHitCount: reportPathHits.length,
    linkedHitCount: reportLinkedHits.length,
    hits: reportAllHits,
  };
}

function printReport(report) {
  console.log("");
  console.log("== Bundle distribution policy summary ==");
  console.log(`- policy: ${report.policy}`);
  console.log(`- bundleDir: ${report.bundleDir}`);
  console.log(`- files scanned: ${report.filesScanned}`);
  console.log(`- path hits: ${report.pathHitCount}`);
  console.log(`- linked hits: ${report.linkedHitCount}`);
  for (const hit of report.hits) {
    const prefix = report.allowRiskyRuntime ? "warn" : "fail";
    const detail = hit.kind === "linked" ? `${hit.file} -> ${hit.line}` : hit.file;
    console.log(`[${prefix}] ${hit.ruleId}: ${detail}`);
    console.log(`       ${hit.reason}`);
  }
  if (report.hits.length > 0 && !report.allowRiskyRuntime) {
    console.log("");
    console.log("[결론] 기본 bundle 정책을 위반하는 runtime 후보가 있습니다.");
    console.log("       의도적으로 포함하는 배포라면 --allow-risky-runtime과 별도 license 검토 기록을 사용하세요.");
  } else if (report.hits.length > 0) {
    console.log("[결론] risky runtime 후보가 있지만 allow 옵션으로 경고 처리했습니다.");
  } else {
    console.log("[결론] 기본 bundle 정책 위반 항목이 없습니다.");
  }
}

function writeReports(report) {
  if (outputPath) writeText(outputPath, renderMarkdown(report));
  if (jsonOutputPath) writeText(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function renderMarkdown(report) {
  const lines = [
    "# Bundle Distribution Policy Report",
    "",
    `- schema: ${report.schema}`,
    `- generatedAt: ${report.generatedAt}`,
    `- status: ${report.status}`,
    `- policy: ${report.policy}`,
    `- bundleDir: ${report.bundleDir}`,
    `- filesScanned: ${report.filesScanned}`,
    `- pathHits: ${report.pathHitCount}`,
    `- linkedHits: ${report.linkedHitCount}`,
    `- allowRiskyRuntime: ${report.allowRiskyRuntime}`,
    `- scanLinkedLibraries: ${report.scanLinkedLibraries}`,
    "",
    "| 결과 | Rule | 종류 | 파일 | 상세 | 사유 |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  if (report.hits.length === 0) {
    lines.push("| PASS | - | - | - | - | 기본 bundle 정책 위반 항목이 없습니다. |");
  } else {
    const verdict = report.allowRiskyRuntime ? "WARN" : "FAIL";
    for (const hit of report.hits) {
      lines.push(`| ${verdict} | ${cell(hit.ruleId)} | ${cell(hit.kind)} | ${cell(hit.file)} | ${cell(hit.line || "-")} | ${cell(hit.reason)} |`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function hitPayload({ rule, file, kind, line = "" }) {
  return {
    ruleId: rule.id,
    title: rule.title || rule.id,
    severity: rule.severity || "block",
    kind,
    file,
    line,
    reason: rule.reason || "",
  };
}

function readPolicy(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`policy not found: ${filePath}`);
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(payload.rules)) throw new Error("policy.rules must be an array");
  return payload;
}

function compileRules(rawRules) {
  return rawRules.map((rule) => ({
    ...rule,
    pathPatterns: (rule.pathPatterns || []).map((pattern) => new RegExp(pattern, "i")),
    linkedPatterns: (rule.linkedPatterns || []).map((pattern) => new RegExp(pattern, "i")),
  }));
}

function walkBundle(dir, policyPayload) {
  const result = [];
  const sourceTreeMode = path.resolve(dir) === rootDir;
  const sourceTreeExcludes = sourceTreeMode ? (policyPayload.sourceTreeExcludes || []) : [];
  const alwaysExcludeNames = new Set(policyPayload.alwaysExcludeNames || []);
  walk(dir);
  return result;

  function walk(currentDir) {
    for (const name of fs.readdirSync(currentDir)) {
      if (alwaysExcludeNames.has(name)) continue;
      const current = path.join(currentDir, name);
      const relative = normalizePath(path.relative(dir, current));
      if (sourceTreeExcludes.some((prefix) => relative === prefix || relative.startsWith(`${prefix}/`))) continue;
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink()) {
        result.push(current);
        continue;
      }
      if (stat.isDirectory()) {
        walk(current);
      } else {
        result.push(current);
      }
    }
  }
}

function looksLikeBinary(filePath) {
  const name = path.basename(filePath).toLowerCase();
  const ext = path.extname(name);
  if ([".o", ".a", ".lo", ".la", ".bc", ".pcm"].includes(ext)) return false;
  const sharedLibraryName = /\.(dylib|dll|exe)$/.test(name) || /\.so($|\.)/.test(name);
  const executableName = !ext && isExecutable(filePath);
  if (!sharedLibraryName && !executableName) return false;
  let fd = null;
  try {
    fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(4);
    const bytesRead = fs.readSync(fd, buffer, 0, 4, 0);
    if (bytesRead < 2) return false;
    return (
      buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46 ||
      buffer[0] === 0xcf && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe ||
      buffer[0] === 0xca && buffer[1] === 0xfe && buffer[2] === 0xba && buffer[3] === 0xbe ||
      buffer[0] === 0xfe && buffer[1] === 0xed && buffer[2] === 0xfa && buffer[3] === 0xcf ||
      buffer[0] === 0x4d && buffer[1] === 0x5a
    );
  } catch {
    return false;
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

function isExecutable(filePath) {
  try {
    return (fs.statSync(filePath).mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

function inspectLinkedLibraries(filePath) {
  const command = process.platform === "darwin" ? "otool" : process.platform === "linux" ? "ldd" : "";
  if (!command) return { status: "skipped", lines: [] };
  const argsForCommand = process.platform === "darwin" ? ["-L", filePath] : [filePath];
  const result = spawnSync(command, argsForCommand, {
    cwd: rootDir,
    encoding: "utf8",
    timeout: 5000,
    maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0 || result.error) return { status: "error", lines: [] };
  const lines = `${result.stdout || ""}${result.stderr || ""}`.split(/\n/).map((line) => line.trim()).filter(Boolean);
  return { status: "ok", lines: process.platform === "darwin" ? lines.slice(1) : lines };
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
    if (raw === "allow-risky-runtime" || raw === "scan-linked-libs" || raw === "no-scan-linked-libs") {
      parsed[toCamel(raw)] = true;
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

function toBundleRelative(bundleRoot, filePath) {
  return path.relative(bundleRoot, filePath).replaceAll(path.sep, "/");
}

function normalizePath(value) {
  return String(value || "").replaceAll("\\", "/").toLowerCase();
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function cell(value) {
  return String(value || "-").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}

function fail(message) {
  console.error(`[fail] ${message}`);
  process.exit(1);
}
