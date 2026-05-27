#!/usr/bin/env node
// 파일 용도: v2.0.0 VLM 도입 경계가 기존 감지/계약/미디어 경로를 확장하지 않았는지 정적 점검한다.
// 동작 요약: VLM을 이벤트 해석/리뷰 보조 계층으로만 고정하고, 기존 Event/WebRTC/SSE/WS/media contract drift를 차단한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM boundary verification

Usage:
  ./server.sh verify-vlm-boundary [options]

Options:
  --report <path>       Markdown 리포트를 저장합니다.
  --json-report <path>  JSON 리포트를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - V200-S00이 VLM을 감지기/최종 판정자가 아니라 이벤트 해석/리뷰 보조 계층으로 고정하는지 확인
  - YOLO, Rule, Scenario, Event POST, WebRTC/SSE/WS metadata, RTSP/WebRTC media path 불변 조건이 문서화됐는지 확인
  - v2.0.0 entry freeze baseline과 live contract verifier 연결이 유지되는지 확인
  - VLM runtime/storage/UI 구현 세부 항목이 이 경계 스텝에 섞이지 않았는지 확인
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const checks = [];
const report = {
  schema: "media-server.vlm-boundary-report.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  checks: [],
};

check("V200-S00 roadmap row is closed on boundary scope only", () => {
  const backlog = readText("docs/development-backlog.md");
  for (const snippet of [
    "| 0 | V200-S00 | 완료 | VLM 도입 경계 |",
    "VLM을 감지기가 아니라 이벤트 해석/리뷰 보조 계층으로 정의",
    "YOLO, Rule, Scenario, Event POST, WebRTC/SSE/WS metadata, media path 불변 조건",
    "`verify-integrator-contract-artifact`, `verify-webrtc-va-metadata`, `verify-va-metadata-sidechannel`, `verify-ws-metadata`, `verify-event-post`, `verify-vlm-boundary`, `git diff --check`",
    "### V200-S00 VLM 도입 경계 종료 기준",
    "VLM 실행, 설정 저장, 결과 저장, 제품 화면 노출 구현은 이 단계의 완료 조건이 아닙니다",
    "후속 이슈: 없음",
  ]) {
    assert(backlog.includes(snippet), `backlog missing V200-S00 snippet: ${snippet}`);
  }
  return {
    step: "V200-S00",
    status: "complete",
    scope: "boundary-only",
  };
});

check("VLM principles keep YOLO/Rule/Scenario and media contracts immutable", () => {
  const backlog = readText("docs/development-backlog.md");
  for (const snippet of [
    "YOLO/Rule/Scenario는 유지하고 VLM으로 대체하지 않습니다",
    "전체 영상을 VLM에 상시 전달하지 않습니다",
    "기존 Event POST, WebRTC DataChannel, SSE/WS metadata schema는 기본적으로 변경하지",
    "VLM 결과는 별도 sidecar contract로 저장하고, 기존 외부 event/metadata payload에",
    "cloud VLM은 외부 전송 경고와 명시 opt-in이 있어야 합니다",
    "client/viewer에는 prompt, raw response, source URL, debug JSON, 내부 모델 정보",
    "VLM default-on",
    "VLM model/runtime bundle release",
  ]) {
    assert(backlog.includes(snippet), `backlog missing VLM principle: ${snippet}`);
  }
  return {
    immutable: [
      "YOLO/Rule/Scenario",
      "Event POST",
      "WebRTC DataChannel",
      "SSE/WS metadata",
      "RTSP/WebRTC media path",
    ],
  };
});

check("contract freeze baseline remains the schema drift gate", () => {
  const stream = readText("docs/stream-verification.md");
  const live = readText("docs/live-event-metadata-contracts.md");
  const artifact = readText("docs/integrator-contract-artifact.md");
  const baseline = readJson("test/fixtures/integrator_contract_artifact/freeze-baseline.json");

  for (const snippet of [
    "media-server.v200-contract-schema-freeze.v1",
    "`freeze-baseline.json`을 사용합니다",
    "runtime delivery smoke 통과를 대신하지 않습니다",
    "./server.sh verify-integrator-contract-artifact",
  ]) {
    assert(stream.includes(snippet), `stream-verification missing freeze snippet: ${snippet}`);
  }
  for (const snippet of [
    "Event POST, WebRTC DataChannel, SSE, WebSocket의 live delivery",
    "payload field 추가/삭제",
    "별도 schema review",
  ]) {
    assert(live.includes(snippet), `live contract doc missing boundary snippet: ${snippet}`);
  }
  for (const snippet of [
    "payload field를 추가하거나 삭제하지 않습니다",
    "v2.0.0 entry freeze gate",
    "Runtime delivery smoke는 별도입니다",
  ]) {
    assert(artifact.includes(snippet), `integrator artifact doc missing boundary snippet: ${snippet}`);
  }
  assert(baseline.schema === "media-server.v200-contract-schema-freeze.v1", "freeze baseline schema mismatch");
  assert(baseline.runtimeVerificationStillRequired === true, "freeze baseline must keep runtime verification required");
  for (const target of [
    "docs/integrator-contract-artifact.md",
    "docs/live-event-metadata-contracts.md",
    "docs/webrtc-metadata-client.md",
    "include/ingress/http_auth.h",
    "src/ingress/http_auth.cpp",
    "include/ingress/source_view_registry.h",
    "src/ingress/source_view_registry.cpp",
    "include/ingress/analysis_rule_registry.h",
  ]) {
    assert(
      baseline.entries.some((entry) => entry.path === target),
      `freeze baseline missing target: ${target}`
    );
  }
  return {
    freezeSchema: baseline.schema,
    targetRelease: baseline.targetRelease,
  };
});

check("VLM implementation is not introduced before boundary-only step closes", () => {
  const sourceFiles = gitLsFiles(["src", "include", "config", "test/fixtures"]);
  const allowlisted = new Set([
    "test/fixtures/integrator_contract_artifact/README.md",
    "test/fixtures/integrator_contract_artifact/freeze-baseline.json",
    "test/fixtures/vlm_model_catalog/candidate_families.json",
  ]);
  const forbiddenTokens = [
    /\bVLMObservation\b/,
    /\bvlm[_-]?provider\b/i,
    /\bvlm[_-]?profile\b/i,
    /\bvlm[_-]?sidecar\b/i,
    /\bvision[-_ ]language\b/i,
    /\bpromptProfile\b/,
  ];
  const hits = [];
  for (const file of sourceFiles) {
    if (allowlisted.has(file) || isBinaryPath(file)) continue;
    const text = readText(file);
    for (const token of forbiddenTokens) {
      if (token.test(text)) hits.push(`${file}: ${token}`);
    }
  }
  assert(hits.length === 0, `VLM implementation token(s) found before boundary step:\n${hits.join("\n")}`);
  return {
    scannedRoots: ["src", "include", "config", "test/fixtures"],
    forbiddenImplementationTokens: forbiddenTokens.length,
  };
});

check("server command and script inventory register the VLM boundary verifier", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  const stream = readText("docs/stream-verification.md");
  for (const snippet of [
    "verify-vlm-boundary",
    "verify_vlm_boundary.mjs",
  ]) {
    assert(server.includes(snippet), `server.sh missing VLM boundary snippet: ${snippet}`);
    assert(inventory.includes("verify_script_inventory") || inventory.includes("parseServerDispatches"), "script inventory parser missing");
  }
  assert(stream.includes("./server.sh verify-vlm-boundary"), "stream-verification missing verify-vlm-boundary command");
  return {
    command: "./server.sh verify-vlm-boundary",
  };
});

let failCount = 0;
for (const item of checks) {
  try {
    const details = item.run() || {};
    report.checks.push({ name: item.name, status: "pass", details });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name: item.name, status: "fail", message });
    console.error(`[fail] ${item.name}: ${message}`);
  }
}

report.status = failCount > 0 ? "fail" : "pass";

console.log("");
console.log("== VLM boundary verification summary ==");
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);

if (reportPath) {
  writeText(reportPath, renderMarkdownReport(report));
  console.log(`- report: ${path.relative(rootDir, reportPath)}`);
}
if (jsonReportPath) {
  writeText(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`- jsonReport: ${path.relative(rootDir, jsonReportPath)}`);
}

if (failCount > 0) {
  process.exit(1);
}

function check(name, run) {
  checks.push({ name, run });
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--report") {
      parsed.report = requireValue(argv, ++index, arg);
    } else if (arg === "--json-report") {
      parsed.jsonReport = requireValue(argv, ++index, arg);
    } else if (arg === "-h" || arg === "--help") {
      // handled before option validation
    }
  }
  return parsed;
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("-")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function gitLsFiles(prefixes) {
  const output = execFileSync("git", ["ls-files", ...prefixes], {
    cwd: rootDir,
    encoding: "utf8",
  });
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map(normalizePath)
    .filter((file) => prefixes.some((prefix) => file === prefix || file.startsWith(`${prefix}/`)));
}

function isBinaryPath(file) {
  return /\.(png|jpe?g|mp4|onnx|pyc|o|a|dylib|so)$/i.test(file);
}

function renderMarkdownReport(value) {
  const lines = [
    "# VLM Boundary Verification Report",
    "",
    `- schema: \`${value.schema}\``,
    `- generatedAt: \`${value.generatedAt}\``,
    `- status: \`${value.status}\``,
    "",
    "## Checks",
    "",
  ];
  for (const item of value.checks) {
    lines.push(`- ${item.status.toUpperCase()}: ${item.name}`);
    if (item.message) lines.push(`  - message: ${item.message}`);
  }
  return `${lines.join("\n")}\n`;
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
