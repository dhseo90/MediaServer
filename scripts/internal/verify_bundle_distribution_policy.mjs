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
  --allow-risky-runtime     발견 항목을 실패가 아니라 경고로만 보고합니다.
  --scan-linked-libs        Mach-O/ELF/PE binary의 linked library도 검사합니다. 기본값입니다.
  --no-scan-linked-libs     linked library 검사를 건너뜁니다.
  -h, --help                도움말 출력
`);
}
assertKnownOptions(rawArgs, [
  "bundle-dir",
  "policy",
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
      pathHits.push({ rule, file: relative, kind: "path" });
    }
  }
  if (scanLinkedLibraries && looksLikeBinary(file)) {
    const linked = inspectLinkedLibraries(file);
    for (const line of linked.lines) {
      const normalizedLine = normalizePath(line);
      for (const rule of rules) {
        if (rule.linkedPatterns.some((pattern) => pattern.test(normalizedLine))) {
          linkedHits.push({ rule, file: relative, kind: "linked", line });
        }
      }
    }
  }
}

console.log("");
console.log("== Bundle distribution policy summary ==");
console.log(`- policy: ${path.relative(rootDir, policyPath)}`);
console.log(`- bundleDir: ${path.relative(rootDir, bundleDir) || "."}`);
console.log(`- files scanned: ${files.length}`);
console.log(`- path hits: ${pathHits.length}`);
console.log(`- linked hits: ${linkedHits.length}`);

const allHits = [...pathHits, ...linkedHits];
for (const hit of allHits) {
  const prefix = allowRiskyRuntime ? "warn" : "fail";
  const detail = hit.kind === "linked" ? `${hit.file} -> ${hit.line}` : hit.file;
  console.log(`[${prefix}] ${hit.rule.id}: ${detail}`);
  console.log(`       ${hit.rule.reason}`);
}

if (allHits.length > 0 && !allowRiskyRuntime) {
  console.log("");
  console.log("[결론] 기본 bundle 정책을 위반하는 runtime 후보가 있습니다.");
  console.log("       의도적으로 포함하는 배포라면 --allow-risky-runtime과 별도 license 검토 기록을 사용하세요.");
  process.exit(1);
}

if (allHits.length > 0) {
  console.log("[결론] risky runtime 후보가 있지만 allow 옵션으로 경고 처리했습니다.");
} else {
  console.log("[결론] 기본 bundle 정책 위반 항목이 없습니다.");
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

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}

function fail(message) {
  console.error(`[fail] ${message}`);
  process.exit(1);
}
