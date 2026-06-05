#!/usr/bin/env node
// 파일 용도: v2.3.0 진입 baseline과 4대 테스트 영역 유지 계약을 검증한다.

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
  printUsageAndExit(`v2.3.0 entry baseline verification

Usage:
  ./server.sh verify-v230-entry-baseline [options]

Options:
  --report <path>       Markdown baseline report를 저장합니다.
  --json-report <path>  JSON baseline report를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - v2.2.0 source-only/live-only release baseline과 v2.3.0 active roadmap을 분리
  - v2.3.0 S00이 Event POST/WebRTC/SSE/WS/Auth/Rule/media path freeze gate를 요구
  - 안정화/30분/120분/UI 풀테스트 네 영역 밖의 새 테스트 영역을 만들지 않음
  - 이 명령은 build, UI 풀테스트, 30분/120분 longrun, field smoke, published GitHub check를 실행하지 않음
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

check("v2.3.0 roadmap is separated from v2.2.0 release baseline", () => {
  assert(version === "2.2.0", `v2.3.0 entry must preserve current released VERSION 2.2.0, got ${version}`);
  assert(cmake.includes("project(media_server VERSION 2.2.0"), "CMake project version must remain current release 2.2.0");
  assert(payload.currentRelease === "v2.2.0", "current release drifted");
  assert(payload.entryBranch === "v2.3.0", "entry branch drifted");
  assert(payload.activeRoadmap === "v2.3.0 Operational Evidence & Contract Baseline", "active roadmap drifted");
});

check("roadmap S00 scopes baseline to contract freeze and 4대 테스트 영역", () => {
  const backlog = readText("docs/development-backlog.md");
  assert(backlog.includes("## 활성 roadmap: v2.3.0 Operational Evidence & Contract Baseline"), "backlog missing v2.3.0 active roadmap");
  assert(/\| 0 \| V230-S00 \| P0 \| (진행|완료) \| v2\.3\.0 entry baseline \|/.test(backlog),
    "backlog S00 row must be 진행 or 완료 and stay scoped to v2.3.0 entry baseline");
  for (const snippet of [
    "기존 네 영역인 안정화 테스트, 30분 테스트, 120분 테스트, UI 풀테스트",
    "field gate, provider smoke, runtime longrun trigger는 별도 다섯 번째 테스트 영역이",
    "### V230-S00 v2.3.0 entry baseline 종료 기준",
    "S00은 UI 구현, VA matrix 실행, VLM runtime/provider 호출",
    "RTSP/WebRTC\nmedia path 변경을 수행하지 않습니다.",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S00 snippet: ${snippet}`);
  }
  for (const command of [
    "verify-v230-entry-baseline",
    "verify-release-metadata",
    "verify-release-evidence-index",
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

check("documentation index exposes current release and v2.3.0 active roadmap", () => {
  const docsIndex = readText("docs/README.md");
  const englishIndex = readText("docs/en/README.md");
  for (const snippet of [
    "최신 공개 release: [`v2.2.0`](https://github.com/dhseo90/MediaServer/releases/tag/v2.2.0)",
    "활성 roadmap: `v2.3.0 Operational Evidence & Contract Baseline`",
    "안정화 테스트, 30분 테스트, 120분 테스트, UI 풀테스트",
  ]) {
    assert(docsIndex.includes(snippet), `docs index missing v2.3.0 snippet: ${snippet}`);
  }
  for (const snippet of [
    "v2.2.0 is the latest published source-only release target",
    "v2.3.0 active roadmap",
    "stability, 30-minute, 120-minute, and UI fulltest",
  ]) {
    assert(englishIndex.includes(snippet), `English docs index missing v2.3.0 snippet: ${snippet}`);
  }
});

check("release evidence index documents the v2.3.0 entry baseline report", () => {
  const index = readText("docs/release-evidence-index.md");
  for (const snippet of [
    "## v2.3.0 Entry Baseline Report",
    "media-server.v230-entry-baseline-report.v1",
    "./server.sh verify-v230-entry-baseline",
    "v2.2.0 source-only/live-only release baseline",
    "안정화/UI/30분/120분/field/published metadata 상태를 서로 대체하지 않습니다.",
  ]) {
    assert(index.includes(snippet), `release evidence index missing v2.3.0 baseline snippet: ${snippet}`);
  }
});

check("stream verification docs expose v2.3.0 baseline command and companion gates", () => {
  const stream = readText("docs/stream-verification.md");
  for (const snippet of [
    "verify-v230-entry-baseline",
    "media-server.v230-entry-baseline-report.v1",
    "./server.sh verify-release-metadata",
    "./server.sh verify-release-evidence-index",
    "./server.sh verify-integrator-contract-artifact",
    "./server.sh verify-event-post",
    "./server.sh verify-auth-routes",
    "./server.sh verify-webrtc-va-metadata",
    "./server.sh verify-va-metadata-sidechannel",
    "./server.sh verify-ws-metadata",
    "안정화, 30분, 120분, UI 풀테스트",
  ]) {
    assert(stream.includes(snippet), `stream verification missing v2.3.0 baseline snippet: ${snippet}`);
  }
});

check("server entrypoint exposes the v2.3.0 baseline verifier", () => {
  const server = readText("server.sh");
  assert(server.includes("verify-v230-entry-baseline"), "server.sh missing verify-v230-entry-baseline");
  assert(server.includes("verify_v230_entry_baseline.mjs"), "server.sh missing v2.3.0 baseline script dispatch");
});

check("baseline report keeps script, UI, longrun, field, and published metadata separate", () => {
  const rows = new Map(payload.evidence.map(item => [item.id, item]));
  for (const id of [
    "v220-release-baseline",
    "source-version-boundary",
    "roadmap-boundary",
    "integrator-contract-freeze",
    "event-post-freeze",
    "webrtc-metadata-freeze",
    "sse-metadata-freeze",
    "ws-metadata-freeze",
    "auth-scope-freeze",
    "rule-payload-freeze",
    "viewer-redaction-freeze",
    "ui-fulltest",
    "soak-30min",
    "longrun-120min",
    "field-onvif-turn-whep",
    "published-metadata",
  ]) {
    assert(rows.has(id), `baseline evidence row missing: ${id}`);
  }
  assert(rows.get("ui-fulltest").status === "미실행", "UI fulltest must not be marked pass by this command");
  assert(rows.get("soak-30min").status === "미실행", "30 minute soak must not be marked pass by this command");
  assert(rows.get("longrun-120min").approvalRequired === true, "120 minute longrun must be approval-gated");
  assert(rows.get("field-onvif-turn-whep").status === "미확인", "field gate must remain 미확인 unless explicitly executed");
  assert(rows.get("published-metadata").status === "manual-not-run", "published metadata must remain manual-not-run");
});

check("token usage placeholders exist for every baseline evidence row", () => {
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
console.log("== v2.3.0 entry baseline summary ==");
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
    schema: "media-server.v230-entry-baseline-report.v1",
    generatedAt: new Date().toISOString(),
    status: "pass",
    currentRelease: "v2.2.0",
    entryBranch: "v2.3.0",
    activeRoadmap: "v2.3.0 Operational Evidence & Contract Baseline",
    sourceVersion: `v${version}`,
    branch,
    head,
    checks: [],
    baselineDecision: {
      primary: "Use the v2.2.0 source-only/live-only release baseline as the frozen product contract and start v2.3.0 as an operational evidence and contract baseline roadmap.",
      fallback: "If live published metadata or field endpoints cannot be rechecked, keep them 미확인/manual-not-run and rely only on recorded local evidence.",
      excluded: [
        "No UI implementation, VA matrix execution, VLM runtime/provider call, route/API/schema migration, or media path change is performed by S00.",
        "No fifth test area is introduced; field/provider gates stay inside stability conditions or exclusion records.",
        "No UI fulltest, 30 minute soak, 120 minute longrun, field smoke, or published GitHub check is executed by this baseline verifier.",
      ],
    },
    evidence: [
      evidenceRow({
        id: "v220-release-baseline",
        area: "v2.2.0 release baseline",
        status: "recorded-pass",
        source: "docs/development-backlog.md and docs/release-evidence-index.md identify v2.2.0 as the current source-only/live-only baseline",
      }),
      evidenceRow({
        id: "source-version-boundary",
        area: "source version boundary",
        status: "recorded-pass",
        source: "VERSION and CMakeLists.txt remain 2.2.0 while active roadmap is v2.3.0",
      }),
      evidenceRow({
        id: "roadmap-boundary",
        area: "roadmap review",
        status: "current-run-required",
        source: "./server.sh verify-v230-entry-baseline",
      }),
      evidenceRow({
        id: "integrator-contract-freeze",
        area: "스크립트 테스트: contract artifact freeze",
        status: "current-run-required",
        source: "./server.sh verify-integrator-contract-artifact",
      }),
      evidenceRow({
        id: "event-post-freeze",
        area: "스크립트 테스트: Event POST freeze",
        status: "current-run-required",
        source: "./server.sh verify-event-post --mode schema --http-base <enabled-auth-off-http-base>",
      }),
      evidenceRow({
        id: "webrtc-metadata-freeze",
        area: "스크립트 테스트: WebRTC DataChannel metadata freeze",
        status: "current-run-required",
        source: "./server.sh verify-webrtc-va-metadata",
      }),
      evidenceRow({
        id: "sse-metadata-freeze",
        area: "스크립트 테스트: SSE metadata freeze",
        status: "current-run-required",
        source: "./server.sh verify-va-metadata-sidechannel",
      }),
      evidenceRow({
        id: "ws-metadata-freeze",
        area: "스크립트 테스트: WS metadata freeze",
        status: "current-run-required",
        source: "./server.sh verify-ws-metadata",
      }),
      evidenceRow({
        id: "auth-scope-freeze",
        area: "스크립트 테스트: Auth/session/scope freeze",
        status: "current-run-required",
        source: "./server.sh verify-auth-routes",
      }),
      evidenceRow({
        id: "rule-payload-freeze",
        area: "스크립트 테스트: Rule/Profile payload freeze",
        status: "current-run-required",
        source: "roadmap review plus verify-rule-ui / verify-ops-rules-roundtrip in later rule-touching steps",
      }),
      evidenceRow({
        id: "viewer-redaction-freeze",
        area: "viewer/client redaction",
        status: "current-run-required",
        source: "roadmap review plus verify-ops-client-ui in later UI-touching steps",
      }),
      evidenceRow({
        id: "ui-fulltest",
        area: "UI 풀테스트",
        status: "미실행",
        source: "Not part of S00; release-candidate or UI-changing steps only",
        requiredBeforeS01: false,
      }),
      evidenceRow({
        id: "soak-30min",
        area: "30분 테스트",
        status: "미실행",
        source: "./server.sh verify-predev --soak-minutes 30; not requested for S00",
        requiredBeforeS01: false,
      }),
      evidenceRow({
        id: "longrun-120min",
        area: "120분 테스트",
        status: "미실행",
        source: "./server.sh verify-predev --soak-minutes 120 or ./server.sh verify-va-runtime-console-longrun --duration-minutes 120",
        approvalRequired: true,
        requiredBeforeS01: false,
      }),
      evidenceRow({
        id: "field-onvif-turn-whep",
        area: "조건부 field evidence",
        status: "미확인",
        source: "real ONVIF/external TURN/WHEP credential success is not executed by S00",
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
      source: "not-collected-by-baseline-report-generator",
    },
  };
}

function renderMarkdown(report) {
  const lines = [
    "# v2.3.0 Entry Baseline Report",
    "",
    `- schema: ${report.schema}`,
    `- status: ${report.status}`,
    `- currentRelease: ${report.currentRelease}`,
    `- entryBranch: ${report.entryBranch}`,
    `- activeRoadmap: ${report.activeRoadmap}`,
    `- sourceVersion: ${report.sourceVersion}`,
    `- branch: ${report.branch}`,
    `- head: ${report.head}`,
    "",
    "## Baseline Decision",
    "",
    `- primary: ${report.baselineDecision.primary}`,
    `- fallback: ${report.baselineDecision.fallback}`,
    "- excluded:",
    ...report.baselineDecision.excluded.map(item => `  - ${item}`),
    "",
    "## Evidence Rows",
    "",
    "| id | area | status | approval required | required before S01 | source | token source |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...report.evidence.map(item =>
      `| ${item.id} | ${item.area} | ${item.status} | ${item.approvalRequired ? "yes" : "no"} | ${item.requiredBeforeS01 ? "yes" : "no"} | ${item.source} | ${item.tokenUsage.source} |`
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
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--report") {
      parsed.report = argv[++i] || "";
    } else if (arg === "--json-report") {
      parsed.jsonReport = argv[++i] || "";
    }
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
