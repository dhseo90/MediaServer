#!/usr/bin/env node
// 파일 용도: v2.3.0 S02 4대 테스트 evidence 정합성 문서와 gate 연결을 검증한다.

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
  printUsageAndExit(`v2.3.0 S02 four-test evidence consistency verification

Usage:
  ./server.sh verify-v230-test-evidence-consistency [options]

Options:
  --report <path>       Markdown consistency report를 저장합니다.
  --json-report <path>  JSON consistency report를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - V230-S02가 안정화, 30분, 120분, UI 풀테스트 네 영역만 사용함
  - release evidence와 feature inventory가 실행/미실행/제외 기록을 같은 기준으로 설명함
  - 30분/120분/UI 실행을 이 verifier PASS로 대체하지 않음
  - S02 완료 evidence는 companion verifier와 git diff check 범위로 제한됨
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const branch = runText("git", ["rev-parse", "--abbrev-ref", "HEAD"], { optional: true }).trim() || "unknown";
const head = runText("git", ["rev-parse", "HEAD"], { optional: true }).trim() || "unknown";
const checks = [];
const payload = buildReport();

check("S02 evidence report uses only the four approved test areas", () => {
  const allowedAreas = new Set(["안정화 테스트", "30분 테스트", "120분 테스트", "UI 풀테스트"]);
  for (const item of payload.evidence) {
    assert(allowedAreas.has(item.area), `${item.id} uses unsupported test area: ${item.area}`);
    for (const field of ["tokenStart", "tokenEnd", "tokenConsumed", "elapsed", "source"]) {
      assert(Object.prototype.hasOwnProperty.call(item.tokenUsage, field), `${item.id} missing token usage field: ${field}`);
    }
  }
  const areaSet = new Set(payload.evidence.map(item => item.area));
  for (const area of allowedAreas) {
    assert(areaSet.has(area), `S02 report missing approved test area: ${area}`);
  }
});

check("roadmap records V230-S02 completion boundary and companion gates", () => {
  const backlog = readText("docs/development-backlog.md");
  assert(/\| 2 \| V230-S02 \| P0 \| 완료 \| 4대 테스트 evidence 정합성 \|/.test(backlog),
    "backlog V230-S02 row must be 완료 after S02 closure");
  for (const snippet of [
    "### V230-S02 4대 테스트 evidence 정합성 종료 기준",
    "직접 답: S02 완료는 네 테스트 영역의 evidence 기록 기준 정합성 완료입니다.",
    "새 테스트 영역은 만들지 않습니다.",
    "30분 테스트, 120분 테스트, UI 풀테스트를 실행했다는 뜻이 아닙니다.",
    "verify-v230-test-evidence-consistency",
    "verify-release-evidence-index",
    "verify-feature-inventory-coverage",
    "verify-longrun-separation",
    "verify-manual-ui-evidence",
    "git diff --check",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S02 closure snippet: ${snippet}`);
  }
});

check("release evidence index records S02 without promoting not-run tests", () => {
  const index = readText("docs/release-evidence-index.md");
  for (const snippet of [
    "v230-s02-four-test-evidence-consistency-20260605",
    "media-server.v230-test-evidence-consistency.v1",
    "4대 테스트 evidence 정합성",
    "verify-v230-test-evidence-consistency",
    "verify-feature-inventory-coverage",
    "verify-longrun-separation",
    "verify-manual-ui-evidence",
    "Not run for `v230-s02-four-test-evidence-consistency-20260605`",
    "이 항목은 V230-S02 evidence 정합성 gate이며, 30분/120분/UI 풀테스트 실행 evidence를 대체하지 않습니다.",
  ]) {
    assert(index.includes(snippet), `release evidence index missing S02 snippet: ${snippet}`);
  }
});

check("feature inventory maps S02 to the same four test areas", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  for (const snippet of [
    "v2.3.0 S02 4대 테스트 evidence 정합성",
    "release evidence index, feature inventory coverage, longrun separation, manual UI evidence 기준을 같은 네 영역으로 연결",
    "새 테스트 영역이 아니며 실행 evidence가 아님",
    "V230-S02 4대 테스트 evidence 정합성",
    "verify-v230-test-evidence-consistency",
    "안정화/30분/120분/UI 풀테스트 evidence 정합성",
    "30분/120분/UI 실행 PASS로 대체하지 않음",
  ]) {
    assert(inventory.includes(snippet), `project feature inventory missing S02 snippet: ${snippet}`);
  }
});

check("stream verification and docs index expose the S02 command", () => {
  const stream = readText("docs/stream-verification.md");
  const docsIndex = readText("docs/README.md");
  const docsEnglish = readText("docs/en/README.md");
  for (const snippet of [
    "v2.3.0 S02 4대 테스트 evidence 정합성",
    "verify-v230-test-evidence-consistency",
    "media-server.v230-test-evidence-consistency.v1",
    "이 verifier는 30분/120분/UI 풀테스트를 실행하지 않습니다.",
  ]) {
    assert(stream.includes(snippet), `stream verification missing S02 snippet: ${snippet}`);
  }
  assert(docsIndex.includes("v2.3.0 S02 4대 테스트 evidence 정합성"), "docs index missing S02 row");
  assert(docsEnglish.includes("verify-v230-test-evidence-consistency"), "English docs index missing S02 command");
});

check("server entrypoint exposes the S02 verifier", () => {
  const server = readText("server.sh");
  assert(server.includes("verify-v230-test-evidence-consistency"), "server.sh missing verify-v230-test-evidence-consistency");
  assert(server.includes("verify_v230_test_evidence_consistency.mjs"), "server.sh missing S02 verifier script dispatch");
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
console.log("== v2.3.0 S02 evidence consistency summary ==");
console.log(`- schema: ${payload.schema}`);
console.log(`- targetStep: ${payload.targetStep}`);
console.log(`- branch: ${payload.branch}`);
console.log(`- head: ${payload.head}`);
console.log(`- evidenceRows: ${payload.evidence.length}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

if (reportPath) writeText(reportPath, renderMarkdown(payload));
if (jsonReportPath) writeText(jsonReportPath, `${JSON.stringify(payload, null, 2)}\n`);
if (fail > 0) process.exit(1);

function buildReport() {
  return {
    schema: "media-server.v230-test-evidence-consistency.v1",
    generatedAt: new Date().toISOString(),
    status: "pass",
    targetStep: "V230-S02",
    activeRoadmap: "v2.3.0 Operational Evidence & Contract Baseline",
    branch,
    head,
    checks: [],
    completionBoundary: {
      primary: "Align release evidence, feature inventory, longrun separation, and manual UI evidence wording to the same four approved test areas.",
      excluded: [
        "This verifier does not execute 30 minute soak, 120 minute longrun, UI fulltest, field smoke, provider smoke, push, PR, tag, or GitHub Release.",
        "Field/provider/no-device/external credential conditions remain stability conditions or UI exclusion records, not a fifth test area.",
      ],
    },
    evidence: [
      evidenceRow({
        id: "s02-consistency-verifier",
        area: "안정화 테스트",
        status: "current-run-required",
        source: "./server.sh verify-v230-test-evidence-consistency",
      }),
      evidenceRow({
        id: "release-evidence-index",
        area: "안정화 테스트",
        status: "current-run-required",
        source: "./server.sh verify-release-evidence-index",
      }),
      evidenceRow({
        id: "feature-inventory-coverage",
        area: "안정화 테스트",
        status: "current-run-required",
        source: "./server.sh verify-feature-inventory-coverage",
      }),
      evidenceRow({
        id: "longrun-separation",
        area: "안정화 테스트",
        status: "current-run-required",
        source: "./server.sh verify-longrun-separation",
      }),
      evidenceRow({
        id: "manual-ui-evidence-standard",
        area: "UI 풀테스트",
        status: "current-run-required",
        source: "./server.sh verify-manual-ui-evidence",
      }),
      evidenceRow({
        id: "soak-30min-execution",
        area: "30분 테스트",
        status: "미실행",
        source: "./server.sh verify-predev --soak-minutes 30; not requested for S02",
      }),
      evidenceRow({
        id: "longrun-120min-execution",
        area: "120분 테스트",
        status: "미실행",
        source: "./server.sh verify-predev --soak-minutes 120 or ./server.sh verify-va-runtime-console-longrun --duration-minutes 120; approval required and not requested for S02",
        approvalRequired: true,
      }),
      evidenceRow({
        id: "ui-fulltest-execution",
        area: "UI 풀테스트",
        status: "미실행",
        source: "Codex in-app browser UI fulltest is not executed by S02 consistency gate",
      }),
    ],
  };
}

function evidenceRow({ id, area, status, source, approvalRequired = false }) {
  return {
    id,
    area,
    status,
    approvalRequired,
    source,
    tokenUsage: {
      tokenStart: "미집계",
      tokenEnd: "미집계",
      tokenConsumed: "미집계",
      elapsed: "미집계",
      source: "not-collected-by-consistency-report-generator",
    },
  };
}

function renderMarkdown(report) {
  const lines = [
    "# v2.3.0 S02 Four-Test Evidence Consistency Report",
    "",
    `- schema: ${report.schema}`,
    `- status: ${report.status}`,
    `- targetStep: ${report.targetStep}`,
    `- activeRoadmap: ${report.activeRoadmap}`,
    `- branch: ${report.branch}`,
    `- head: ${report.head}`,
    "",
    "## Completion Boundary",
    "",
    `- primary: ${report.completionBoundary.primary}`,
    "- excluded:",
    ...report.completionBoundary.excluded.map(item => `  - ${item}`),
    "",
    "## Evidence Rows",
    "",
    "| id | area | status | approval required | source | token source |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.evidence.map(item =>
      `| ${item.id} | ${item.area} | ${item.status} | ${item.approvalRequired ? "yes" : "no"} | ${item.source} | ${item.tokenUsage.source} |`
    ),
    "",
    "## Checks",
    "",
    ...report.checks.map(item => `- ${item.status}: ${item.name}${item.message ? ` - ${item.message}` : ""}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  const parsed = { report: "", jsonReport: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--report") parsed.report = argv[++index] || "";
    else if (token.startsWith("--report=")) parsed.report = token.slice("--report=".length);
    else if (token === "--json-report") parsed.jsonReport = argv[++index] || "";
    else if (token.startsWith("--json-report=")) parsed.jsonReport = token.slice("--json-report=".length);
  }
  return parsed;
}

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.resolve(rootDir, relativePath), "utf8");
}

function writeText(targetPath, text) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, text, "utf8");
}

function runText(command, argsForCommand, options = {}) {
  const result = spawnSync(command, argsForCommand, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0 && !options.optional) {
    throw new Error(`${command} ${argsForCommand.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout || "";
}
