#!/usr/bin/env node
// 파일 용도: v1.9.0 종료와 v2.0.0 진입 전 baseline report의 필수 evidence 구획을 검증한다.

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
  printUsageAndExit(`v1.9.0 entry baseline report verification

Usage:
  ./server.sh verify-v190-entry-baseline [options]

Options:
  --report <path>       Markdown baseline report를 저장합니다.
  --json-report <path>  JSON baseline report를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - v1.9.0 종료 report가 안정화, 30분, UI 풀테스트, 120분, CI, release metadata 상태를 분리
  - 30분/120분/UI 풀테스트는 이 명령에서 실행하지 않고 미실행/미확인으로만 기록
  - release evidence index, post-release reconciliation, release metadata verifier와 v2.0.0 entry freeze gate를 연결
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const checks = [];
const version = readText("VERSION").trim();
const branch = runText("git", ["rev-parse", "--abbrev-ref", "HEAD"], { optional: true }).trim() || "unknown";
const head = runText("git", ["rev-parse", "HEAD"], { optional: true }).trim() || "unknown";
const payload = buildReport();

check("roadmap release and source metadata version are explicitly separated", () => {
  assert(/^\d+\.\d+\.\d+$/.test(version), `VERSION must be semver, got ${version}`);
  assert(payload.release === "v1.9.0", "payload release drifted");
  assert(payload.sourceVersion === `v${version}`, "payload source version drifted");
  assert(payload.entryTarget === "v2.0.0", "payload entry target drifted");
});

check("baseline report keeps script, 30 minute, 120 minute, and UI evidence separate", () => {
  const evidenceIds = new Set(payload.evidence.map(item => item.id));
  for (const id of [
    "short-stability",
    "soak-30min",
    "ui-fulltest",
    "longrun-120min",
    "ci-checks",
    "release-metadata",
    "published-release-metadata",
    "release-closeout",
    "v2-entry-freeze",
  ]) {
    assert(evidenceIds.has(id), `baseline evidence row missing: ${id}`);
  }
  const soak = payload.evidence.find(item => item.id === "soak-30min");
  const ui = payload.evidence.find(item => item.id === "ui-fulltest");
  const longrun = payload.evidence.find(item => item.id === "longrun-120min");
  assert(soak.status === "미실행", "30 minute soak must remain not-run until explicitly requested");
  assert(ui.status === "미실행", "UI full test must remain not-run until explicitly requested");
  assert(longrun.status === "미실행", "120 minute longrun must remain not-run until explicitly requested");
  assert(longrun.approvalRequired === true, "120 minute longrun must be approval-gated");
});

check("token usage placeholders exist for every test evidence row", () => {
  for (const item of payload.evidence) {
    for (const field of ["tokenStart", "tokenEnd", "tokenConsumed", "elapsed", "source"]) {
      assert(Object.prototype.hasOwnProperty.call(item.tokenUsage, field), `${item.id} missing token usage field: ${field}`);
    }
  }
});

check("release evidence index documents v2.0.0 entry baseline report", () => {
  const index = readText("docs/release-evidence-index.md");
  for (const snippet of [
    "v2.0.0 Entry Baseline Report",
    "media-server.v190-entry-baseline-report.v1",
    "./server.sh verify-v190-entry-baseline",
    "30분, UI 풀테스트, 120분 longrun",
    "CI 상태는 GitHub Actions UI/API를 실제 확인하기 전까지 `미확인`",
  ]) {
    assert(index.includes(snippet), `release evidence index missing entry baseline snippet: ${snippet}`);
  }
});

check("verification docs expose v1.9.0 entry baseline command", () => {
  const stream = readText("docs/stream-verification.md");
  const backlog = readText("docs/development-backlog.md");
  for (const snippet of [
    "verify-v190-entry-baseline",
    "media-server.v190-entry-baseline-report.v1",
  ]) {
    assert(stream.includes(snippet), `stream verification missing entry baseline snippet: ${snippet}`);
    assert(backlog.includes(snippet), `backlog missing entry baseline snippet: ${snippet}`);
  }
});

check("server entrypoint and script inventory expose entry baseline verifier", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  assert(server.includes("verify-v190-entry-baseline"), "server.sh missing verify-v190-entry-baseline");
  assert(server.includes("verify_v190_entry_baseline_report.mjs"), "server.sh missing entry baseline script reference");
  assert(inventory.includes("verify_v190_entry_baseline_report.mjs"), "script inventory missing entry baseline verifier");
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
console.log("== v1.9.0 entry baseline report summary ==");
console.log(`- schema: ${payload.schema}`);
console.log(`- release: ${payload.release}`);
console.log(`- entryTarget: ${payload.entryTarget}`);
console.log(`- baselineStatus: ${payload.baselineStatus}`);
console.log(`- evidenceRows: ${payload.evidence.length}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

if (reportPath) writeText(reportPath, renderMarkdown(payload));
if (jsonReportPath) writeText(jsonReportPath, `${JSON.stringify(payload, null, 2)}\n`);
if (fail > 0) process.exit(1);

function buildReport() {
  return {
    schema: "media-server.v190-entry-baseline-report.v1",
    generatedAt: new Date().toISOString(),
    status: "pass",
    baselineStatus: "draft-pending-release-closeout",
    release: "v1.9.0",
    sourceVersion: `v${version}`,
    entryTarget: "v2.0.0",
    branch,
    head,
    checks: [],
    evidence: [
      evidenceRow({
        id: "short-stability",
        area: "스크립트 테스트: 단기 smoke",
        status: "미실행",
        source: "run stage-specific stabilizers first; attach actual command list in close-out",
        requiredBeforeRelease: true,
      }),
      evidenceRow({
        id: "soak-30min",
        area: "스크립트 테스트: 30분 안정화",
        status: "미실행",
        source: "./server.sh verify-predev --soak-minutes 30",
        approvalRequired: true,
        requiredBeforeRelease: true,
      }),
      evidenceRow({
        id: "ui-fulltest",
        area: "UI 풀테스트",
        status: "미실행",
        source: "Codex in-app browser manual UI full test evidence",
        approvalRequired: true,
        requiredBeforeRelease: true,
      }),
      evidenceRow({
        id: "longrun-120min",
        area: "스크립트 테스트: 120분 장시간",
        status: "미실행",
        source: "./server.sh verify-predev --soak-minutes 120 or ./server.sh verify-va-runtime-console-longrun --duration-minutes 120",
        approvalRequired: true,
        requiredBeforeRelease: false,
      }),
      evidenceRow({
        id: "ci-checks",
        area: "CI 상태",
        status: "미확인",
        source: "GitHub Actions UI/API check review",
        requiredBeforeRelease: true,
      }),
      evidenceRow({
        id: "release-metadata",
        area: "Release metadata",
        status: "미실행",
        source: "./server.sh verify-release-metadata",
        requiredBeforeRelease: true,
      }),
      evidenceRow({
        id: "published-release-metadata",
        area: "Published release metadata",
        status: "manual-not-run",
        source: "./server.sh verify-release-metadata --published",
        approvalRequired: true,
        requiredBeforeRelease: false,
      }),
      evidenceRow({
        id: "release-closeout",
        area: "Release close-out one-shot",
        status: "manual-not-run",
        source: "./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run",
        approvalRequired: true,
        requiredBeforeRelease: true,
      }),
      evidenceRow({
        id: "v2-entry-freeze",
        area: "v2.0.0 entry freeze",
        status: "미실행",
        source: "./server.sh verify-integrator-contract-artifact",
        requiredBeforeRelease: true,
      }),
    ],
  };
}

function evidenceRow({ id, area, status, source, approvalRequired = false, requiredBeforeRelease = true }) {
  return {
    id,
    area,
    status,
    approvalRequired,
    requiredBeforeRelease,
    source,
    tokenUsage: {
      tokenStart: "미집계",
      tokenEnd: "미집계",
      tokenConsumed: "미집계",
      elapsed: "미집계",
      source: "not-collected-by-baseline-report-generator",
    },
  };
}

function renderMarkdown(report) {
  const lines = [
    "# v1.9.0 Final Baseline and v2.0.0 Entry Report",
    "",
    `- schema: ${report.schema}`,
    `- generatedAt: ${report.generatedAt}`,
    `- status: ${report.status}`,
    `- baselineStatus: ${report.baselineStatus}`,
    `- release: ${report.release}`,
    `- sourceVersion: ${report.sourceVersion}`,
    `- entryTarget: ${report.entryTarget}`,
    `- branch: ${report.branch}`,
    `- head: ${report.head}`,
    "",
    "| ID | Area | Status | Approval Required | Required Before Release | Source | Token Usage Source |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of report.evidence) {
    lines.push([
      item.id,
      item.area,
      item.status,
      item.approvalRequired ? "yes" : "no",
      item.requiredBeforeRelease ? "yes" : "no",
      item.source,
      item.tokenUsage.source,
    ].map(cell).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  lines.push("");
  lines.push("## Checks");
  lines.push("");
  for (const item of report.checks) {
    lines.push(`- ${item.status}: ${item.name}${item.message ? ` (${item.message})` : ""}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function cell(value) {
  return String(value).replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function runText(command, args, { optional = false } = {}) {
  const result = spawnSync(command, args, { cwd: rootDir, encoding: "utf8" });
  if (result.status === 0) return result.stdout || "";
  if (optional) return "";
  const stderr = (result.stderr || result.stdout || "").trim();
  throw new Error(`${command} ${args.join(" ")} failed: ${stderr}`);
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
