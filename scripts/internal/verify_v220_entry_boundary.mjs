#!/usr/bin/env node
// 파일 용도: v2.2.0 Responsive UI Foundation 진입 경계와 변경 금지 contract를 검증한다.

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
  printUsageAndExit(`v2.2.0 Responsive UI Foundation entry boundary verification

Usage:
  ./server.sh verify-v220-entry-boundary [options]

Options:
  --report <path>       Markdown boundary report를 저장합니다.
  --json-report <path>  JSON boundary report를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - v2.1.0 release baseline과 v2.2.0 active UI roadmap을 분리해 기록
  - v2.2.0 S00이 Event POST/WebRTC/SSE/WS/Auth/media path/schema 변경 금지 gate를 요구
  - 반응형 task shell 기준이 320/390/760/1180+ viewport와 연결되어 있음
  - 이 명령은 UI 구현, UI 풀테스트, 30분/120분 longrun, published GitHub check를 실행하지 않음
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const version = readText("VERSION").trim();
const cmake = readText("CMakeLists.txt");
const branch = runText("git", ["rev-parse", "--abbrev-ref", "HEAD"], { optional: true }).trim() || "unknown";
const head = runText("git", ["rev-parse", "HEAD"], { optional: true }).trim() || "unknown";
const checks = [];
const payload = buildReport();

check("v2.2.0 roadmap is separated from v2.1.0 release baseline", () => {
  assert(version === "2.1.0", `v2.2.0 branch must preserve current released VERSION 2.1.0, got ${version}`);
  assert(cmake.includes("project(media_server VERSION 2.1.0"), "CMake project version must remain current release 2.1.0");
  assert(payload.currentRelease === "v2.1.0", "current release drifted");
  assert(payload.entryBranch === "v2.2.0", "entry branch drifted");
  assert(payload.activeRoadmap === "v2.2.0 Responsive UI Foundation", "active roadmap drifted");
});

check("roadmap S00 states UI boundary, responsive shell, and non-scope", () => {
  const backlog = readText("docs/development-backlog.md");
  assert(/\| 0 \| V220-S00 \| P0 \| (진행|완료) \| Entry boundary \/ roadmap gate \|/.test(backlog),
    "backlog S00 row must be 진행 or 완료 and stay scoped to entry boundary");
  for (const snippet of [
    "## 활성 roadmap: v2.2.0 Responsive UI Foundation",
    "작업 단위 반응형 셸",
    "`320`, `390`, `760`, `1180+`",
    "Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC",
    "client/viewer에는 source URL, Developer URL, raw JSON, debugCounters, BBox",
    "`/ops/rules` smoke selector와 Rule/Profile 저장 흐름은 redesign 중에도 보존합니다.",
    "UI 풀테스트는 스크립트 smoke, screenshot 생성, raw JSON/API 확인으로 대체하지 않고",
    "### V220-S00 v2.2.0 UI redesign entry boundary 종료 기준",
  ]) {
    assert(backlog.includes(snippet), `backlog missing v2.2.0 boundary snippet: ${snippet}`);
  }
  for (const command of [
    "verify-v220-entry-boundary",
    "verify-integrator-contract-artifact",
    "verify-event-post",
    "verify-auth-routes",
    "verify-webrtc-va-metadata",
    "verify-va-metadata-sidechannel",
    "verify-ws-metadata",
    "git diff --check",
  ]) {
    assert(backlog.includes(command), `backlog missing S00 command: ${command}`);
  }
});

check("documentation index exposes the v2.2.0 active roadmap", () => {
  const docsIndex = readText("docs/README.md");
  const englishIndex = readText("docs/en/README.md");
  for (const snippet of [
    "활성 roadmap: `v2.2.0 Responsive UI Foundation`",
    "UI 기반 재설계, 반응형 task shell, C++ 문자열 UI 구조 한계 완화",
  ]) {
    assert(docsIndex.includes(snippet), `docs index missing v2.2.0 snippet: ${snippet}`);
  }
  for (const snippet of [
    "v2.2.0 active roadmap",
    "Responsive UI",
    "Foundation",
  ]) {
    assert(englishIndex.includes(snippet), `English docs index missing v2.2.0 snippet: ${snippet}`);
  }
});

check("stream verification docs expose v2.2.0 boundary command and companion gates", () => {
  const stream = readText("docs/stream-verification.md");
  for (const snippet of [
    "verify-v220-entry-boundary",
    "media-server.v220-entry-boundary-report.v1",
    "./server.sh verify-integrator-contract-artifact",
    "./server.sh verify-event-post",
    "./server.sh verify-auth-routes",
    "./server.sh verify-webrtc-va-metadata",
    "./server.sh verify-va-metadata-sidechannel",
    "./server.sh verify-ws-metadata",
    "320/390/760/1180+",
    "UI 풀테스트, 30분 soak, 120분 longrun",
  ]) {
    assert(stream.includes(snippet), `stream verification missing v2.2.0 boundary snippet: ${snippet}`);
  }
});

check("server entrypoint exposes the v2.2.0 boundary verifier", () => {
  const server = readText("server.sh");
  assert(server.includes("verify-v220-entry-boundary"), "server.sh missing verify-v220-entry-boundary");
  assert(server.includes("verify_v220_entry_boundary.mjs"), "server.sh missing v2.2.0 boundary script dispatch");
});

check("boundary report keeps script, UI, longrun, and published metadata separate", () => {
  const rows = new Map(payload.evidence.map(item => [item.id, item]));
  for (const id of [
    "v210-release-baseline",
    "source-version-boundary",
    "roadmap-boundary",
    "integrator-contract-freeze",
    "event-post-freeze",
    "webrtc-metadata-freeze",
    "sse-metadata-freeze",
    "ws-metadata-freeze",
    "auth-scope-freeze",
    "responsive-viewports",
    "ui-fulltest",
    "soak-30min",
    "longrun-120min",
    "published-metadata",
  ]) {
    assert(rows.has(id), `boundary evidence row missing: ${id}`);
  }
  assert(rows.get("ui-fulltest").status === "미실행", "UI fulltest must not be marked pass by this command");
  assert(rows.get("soak-30min").status === "미실행", "30 minute soak must not be marked pass by this command");
  assert(rows.get("longrun-120min").approvalRequired === true, "120 minute longrun must be approval-gated");
  assert(rows.get("published-metadata").status === "manual-not-run", "published metadata must remain manual-not-run");
});

check("token usage placeholders exist for every boundary evidence row", () => {
  for (const item of payload.evidence) {
    for (const field of ["tokenStart", "tokenEnd", "tokenConsumed", "elapsed", "source"]) {
      assert(Object.prototype.hasOwnProperty.call(item.tokenUsage, field), `${item.id} missing token usage field: ${field}`);
    }
  }
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
console.log("== v2.2.0 entry boundary summary ==");
console.log(`- schema: ${payload.schema}`);
console.log(`- currentRelease: ${payload.currentRelease}`);
console.log(`- entryBranch: ${payload.entryBranch}`);
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
    schema: "media-server.v220-entry-boundary-report.v1",
    generatedAt: new Date().toISOString(),
    status: "pass",
    currentRelease: "v2.1.0",
    entryBranch: "v2.2.0",
    activeRoadmap: "v2.2.0 Responsive UI Foundation",
    sourceVersion: `v${version}`,
    branch,
    head,
    checks: [],
    boundaryDecision: {
      primary: "Use v2.1.0 source-only release baseline as the frozen product contract and start v2.2.0 only as a responsive UI foundation roadmap.",
      fallback: "If live published metadata cannot be rechecked, use recorded v2.1.0 release evidence and keep live GitHub state separate from S00 completion.",
      excluded: [
        "No UI implementation, visual redesign code, route/API/schema migration, or media path change is performed by S00.",
        "No VLM runtime/provider expansion, credential persistence, or model/runtime bundle decision is part of S00.",
        "No UI fulltest, 30 minute soak, 120 minute longrun, or published GitHub check is executed by this boundary verifier.",
      ],
    },
    evidence: [
      evidenceRow({
        id: "v210-release-baseline",
        area: "v2.1.0 release baseline",
        status: "recorded-pass",
        source: "VERSION/CMake/docs identify v2.1.0 as current source-only release baseline",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "source-version-boundary",
        area: "source version boundary",
        status: "recorded-pass",
        source: "VERSION and CMakeLists.txt remain 2.1.0 while active roadmap is v2.2.0",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "roadmap-boundary",
        area: "roadmap review",
        status: "current-run-required",
        source: "./server.sh verify-v220-entry-boundary",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "integrator-contract-freeze",
        area: "스크립트 테스트: contract artifact freeze",
        status: "current-run-required",
        source: "./server.sh verify-integrator-contract-artifact",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "event-post-freeze",
        area: "스크립트 테스트: Event POST freeze",
        status: "current-run-required",
        source: "./server.sh verify-event-post",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "webrtc-metadata-freeze",
        area: "스크립트 테스트: WebRTC DataChannel metadata freeze",
        status: "current-run-required",
        source: "./server.sh verify-webrtc-va-metadata",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "sse-metadata-freeze",
        area: "스크립트 테스트: SSE metadata freeze",
        status: "current-run-required",
        source: "./server.sh verify-va-metadata-sidechannel",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "ws-metadata-freeze",
        area: "스크립트 테스트: WS metadata freeze",
        status: "current-run-required",
        source: "./server.sh verify-ws-metadata",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "auth-scope-freeze",
        area: "스크립트 테스트: Auth/session/scope freeze",
        status: "current-run-required",
        source: "./server.sh verify-auth-routes",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "responsive-viewports",
        area: "responsive shell boundary",
        status: "current-run-required",
        source: "roadmap review for 320/390/760/1180+ criteria; visual implementation is later S02+",
        requiredBeforeS01: true,
      }),
      evidenceRow({
        id: "ui-fulltest",
        area: "UI 풀테스트",
        status: "미실행",
        source: "Not part of S00; v2.2.0 UI implementation and release-candidate gates only",
        requiredBeforeS01: false,
      }),
      evidenceRow({
        id: "soak-30min",
        area: "스크립트 테스트: 30분 안정화",
        status: "미실행",
        source: "./server.sh verify-predev --soak-minutes 30; not requested for S00",
        requiredBeforeS01: false,
      }),
      evidenceRow({
        id: "longrun-120min",
        area: "스크립트 테스트: 120분 장시간",
        status: "미실행",
        source: "./server.sh verify-predev --soak-minutes 120 or ./server.sh verify-va-runtime-console-longrun --duration-minutes 120",
        approvalRequired: true,
        requiredBeforeS01: false,
      }),
      evidenceRow({
        id: "published-metadata",
        area: "Published release metadata",
        status: "manual-not-run",
        source: "./server.sh verify-release-metadata --published; release close-out only",
        approvalRequired: true,
        requiredBeforeS01: false,
      }),
    ],
  };
}

function evidenceRow({ id, area, status, source, approvalRequired = false, requiredBeforeS01 = true }) {
  return {
    id,
    area,
    status,
    approvalRequired,
    requiredBeforeS01,
    source,
    tokenUsage: {
      tokenStart: "미집계",
      tokenEnd: "미집계",
      tokenConsumed: "미집계",
      elapsed: "미집계",
      source: "not-collected-by-boundary-report-generator",
    },
  };
}

function renderMarkdown(report) {
  const lines = [
    "# v2.2.0 Entry Boundary Report",
    "",
    `- schema: ${report.schema}`,
    `- generatedAt: ${report.generatedAt}`,
    `- status: ${report.status}`,
    `- currentRelease: ${report.currentRelease}`,
    `- entryBranch: ${report.entryBranch}`,
    `- activeRoadmap: ${report.activeRoadmap}`,
    `- sourceVersion: ${report.sourceVersion}`,
    `- branch: ${report.branch}`,
    `- head: ${report.head}`,
    "",
    "## Boundary Decision",
    "",
    `- primary: ${report.boundaryDecision.primary}`,
    `- fallback: ${report.boundaryDecision.fallback}`,
    `- excluded: ${report.boundaryDecision.excluded.join("; ")}`,
    "",
    "| ID | Area | Status | Approval Required | Required Before S01 | Source | Token Usage Source |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of report.evidence) {
    lines.push([
      item.id,
      item.area,
      item.status,
      item.approvalRequired ? "yes" : "no",
      item.requiredBeforeS01 ? "yes" : "no",
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

function runText(command, argsList, { optional = false } = {}) {
  const result = spawnSync(command, argsList, { cwd: rootDir, encoding: "utf8" });
  if (result.status === 0) return result.stdout || "";
  if (optional) return "";
  const stderr = (result.stderr || result.stdout || "").trim();
  throw new Error(`${command} ${argsList.join(" ")} failed: ${stderr}`);
}

function parseArgs(argsList) {
  const parsed = {};
  for (let index = 0; index < argsList.length; index += 1) {
    const token = argsList[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argsList[index + 1];
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
