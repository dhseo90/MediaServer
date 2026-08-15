#!/usr/bin/env node
// 파일 용도: public 전환 전 secret, history, 추적 asset, 필수 문서 기준을 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {
  isDeniedArtifactPath,
  scanTrackedTextFile,
} from "./public_repo_readiness_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Public repo readiness verification

Usage:
  ./server.sh verify-public-repo-readiness [options]

Options:
  --policy <path>       public repo policy JSON입니다. 기본 config/public_repo_policy.json.
  --report <path>       Markdown 점검 리포트를 저장합니다.
  --max-history <n>     history secret scan 최대 commit 수입니다. 기본 500.
  --no-history          git history secret scan을 생략합니다.
  -h, --help            도움말 출력
`);
}
assertKnownOptions(rawArgs, ["policy", "report", "max-history", "no-history", "h", "help"]);

const args = parseArgs(rawArgs);
const policyPath = path.resolve(rootDir, args.policy || "config/public_repo_policy.json");
const policy = readJson(policyPath);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const includeHistory = args.noHistory !== true;
const maxHistory = Number(args.maxHistory || 500);

const checks = [];
const report = {
  schema: "media-server.public-repo-readiness-report.v1",
  generatedAt: new Date().toISOString(),
  policy: relative(policyPath),
  checks: [],
};

check("required public docs exist", () => {
  const missing = (policy.requiredDocs || []).filter((file) => !fs.existsSync(path.join(rootDir, file)));
  assert(missing.length === 0, `missing docs:\n${missing.join("\n")}`);
  return { count: policy.requiredDocs.length };
});

check("tracked denied paths are absent", () => {
  const files = gitLsFiles();
  const denied = files.filter((file) => matchesAny(file, policy.deniedTrackedPathPatterns || []));
  assert(denied.length === 0, `denied tracked path(s):\n${denied.join("\n")}`);
  return { trackedFiles: files.length };
});

check("tracked release artifacts are bounded", () => {
  const denied = gitLsFiles().filter((file) => isDeniedArtifactPath(file, policy));
  assert(denied.length === 0, `raw release artifact path(s):\n${denied.join("\n")}`);
  return { trackedArtifacts: gitLsFiles().filter((file) => file.startsWith("docs/release-artifacts/")).length };
});

check("tracked content has no personal or ephemeral paths", () => {
  const deniedIds = new Set((policy.deniedTrackedContentPatterns || []).map((item) => item.id));
  const hits = scanCurrentText().filter((hit) => deniedIds.has(hit.id));
  assert(hits.length === 0, `denied content path(s):\n${renderHits(hits)}`);
  return { patterns: deniedIds.size };
});

check("tracked file sizes stay public-friendly", () => {
  const maxBytes = Number(policy.maxTrackedFileBytes || 25 * 1024 * 1024);
  const oversized = gitLsFiles().map((file) => {
    const full = path.join(rootDir, file);
    return { file, bytes: fs.existsSync(full) ? fs.statSync(full).size : 0 };
  }).filter((item) => item.bytes > maxBytes);
  assert(oversized.length === 0, `oversized tracked file(s):\n${oversized.map(item => `${item.file} (${item.bytes} bytes)`).join("\n")}`);
  return { maxBytes };
});

check("tracked media assets are allowlisted", () => {
  const media = gitLsFiles().filter((file) => /\.(mp4|mov|mkv|avi|onnx|jpg|jpeg|png)$/i.test(file));
  const unexpected = media.filter((file) => !matchesAny(file, policy.allowedTrackedAssetPatterns || []));
  assert(unexpected.length === 0, `unexpected tracked asset(s):\n${unexpected.join("\n")}`);
  return { assetCount: media.length };
});

check("current tracked content has no high-confidence secrets", () => {
  const hits = scanCurrentSecrets();
  assert(hits.length === 0, `secret candidate(s):\n${hits.join("\n")}`);
  return { patterns: policy.secretPatterns.length };
});

check("git history has no high-confidence secrets", () => {
  if (!includeHistory) return { skipped: true };
  const hits = scanHistorySecrets(maxHistory);
  assert(hits.length === 0, `history secret candidate(s):\n${hits.join("\n")}`);
  return { maxHistory };
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    const detail = item.fn() || {};
    pass += 1;
    report.checks.push({ name: item.name, status: "pass", detail });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name: item.name, status: "fail", message });
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

console.log("");
console.log("== Public repo readiness summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log(`- history scan: ${includeHistory ? `enabled max=${maxHistory}` : "skipped"}`);
if (reportPath) writeText(reportPath, renderMarkdown(report));
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function scanCurrentSecrets() {
  const secretIds = new Set((policy.secretPatterns || []).map((item) => item.id));
  return scanCurrentText()
    .filter((hit) => secretIds.has(hit.id))
    .map((hit) => `${hit.file}: ${hit.id}: ${hit.match}`);
}

function scanCurrentText() {
  const hits = [];
  for (const file of gitLsFiles()) {
    const full = path.join(rootDir, file);
    if (!fs.existsSync(full)) continue;
    hits.push(...scanTrackedTextFile(full, file, policy));
  }
  return hits;
}

function scanHistorySecrets(maxCommits) {
  const regex = (policy.secretPatterns || []).map((item) => `(${item.pattern})`).join("|");
  if (!regex) return [];
  const revs = runGit(["rev-list", "--all"]).stdout.trim().split(/\n/).filter(Boolean).slice(0, maxCommits);
  if (revs.length === 0) return [];
  const result = runGit(["grep", "-I", "-n", "-E", regex, ...revs, "--", "."], { allowExitOne: true, maxBuffer: 8 * 1024 * 1024 });
  if (result.status === 1) return [];
  return result.stdout.split(/\n/).filter(Boolean).slice(0, 50);
}

function gitLsFiles() {
  return runGit(["ls-files", "-z"]).stdout.split("\0").filter(Boolean)
    .filter((file) => fs.existsSync(path.join(rootDir, file)));
}

function matchesAny(file, patterns) {
  return patterns.some((pattern) => new RegExp(pattern).test(file));
}

function renderHits(hits) {
  return hits.slice(0, 200).map((hit) => `${hit.file}: ${hit.id}: ${hit.match}`).join("\n");
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`file not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function runGit(argsForGit, options = {}) {
  const result = spawnSync("git", argsForGit, {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: options.maxBuffer || 2 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !(options.allowExitOne && result.status === 1)) {
    throw new Error(`git ${argsForGit.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return { stdout: result.stdout || "", stderr: result.stderr || "", status: result.status };
}

function renderMarkdown(payload) {
  const lines = [
    "# Public Repo Readiness Report",
    "",
    `- schema: ${payload.schema}`,
    `- generatedAt: ${payload.generatedAt}`,
    `- policy: ${payload.policy}`,
    "",
    "| 결과 | 검사 | 상세 |",
    "| --- | --- | --- |",
  ];
  for (const item of payload.checks) {
    const detail = item.message || JSON.stringify(item.detail || {});
    lines.push(`| ${item.status.toUpperCase()} | ${cell(item.name)} | ${cell(detail)} |`);
  }
  return `${lines.join("\n")}\n`;
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function relative(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/") || ".";
}

function cell(value) {
  return String(value || "-").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
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
    if (raw === "no-history") {
      parsed.noHistory = true;
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
