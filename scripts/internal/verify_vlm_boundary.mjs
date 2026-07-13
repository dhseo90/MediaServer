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

check("current inventory closes the VLM boundary scope without runtime claims", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  for (const snippet of [
    "| SAFE-025 | VLM default-off / no runtime auto-start |",
    "| SAFE-026 | VLM model/runtime bundle 금지 |",
    "| SAFE-027 | VLM cloud external transfer opt-in 필수 |",
    "| SAFE-029 | VLM sidecar와 외부 event/metadata 분리 |",
    "| SAFE-032 | VLM queue/media path non-blocking |",
  ]) {
    assert(inventory.includes(snippet), `current inventory missing VLM boundary: ${snippet}`);
  }
  return {
    step: "V200-S00",
    status: "complete",
    scope: "boundary-only",
  };
});

check("VLM principles keep YOLO/Rule/Scenario and media contracts immutable", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  for (const snippet of [
    "Event/WebRTC/SSE/WS schema와 media path 변경을 금지",
    "Sidecar/EventRecord/API schema, Event POST, WebRTC DataChannel, SSE/WS metadata에 섞이지 않음",
    "RTSP/WebRTC media path, VA metadata, Event POST dispatch 실패로 전파되지 않음",
    "model weight, GGUF/safetensors/ckpt, runtime package, credential, download token",
  ]) {
    assert(inventory.includes(snippet), `current inventory missing VLM principle: ${snippet}`);
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
    "./server.sh verify-vlm-boundary",
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
  const boundaryProjection = projectBoundaryFreeze(baseline);
  assert(boundaryProjection.runtimeVerificationStillRequired === true && boundaryProjection.frozenEntryCount >= 8,
    "VLM boundary projection must preserve frozen external contracts and separate runtime verification");
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

check("VLM implementation artifacts preserve boundary non-scope invariants", () => {
  const sourceFiles = gitLsFiles(["src", "include", "config", "test/fixtures"]);
  const forbiddenAssetPaths = sourceFiles.filter(file =>
    /\.(?:gguf|ggml|safetensors|ckpt|onnx|engine|plan|pt|pth|tflite)$/i.test(file) ||
    /(?:^|\/)(?:runtime-package|model-weights?|download-token|provider-credential)(?:\/|\.|$)/i.test(file));
  const modelArtifactDownloaded = forbiddenAssetPaths.length > 0;
  const credentialArtifactPresent = forbiddenAssetPaths.some(file => /credential|download-token/i.test(file));
  assert(modelArtifactDownloaded === false && credentialArtifactPresent === false && forbiddenAssetPaths.length === 0,
    `VLM model/runtime artifact paths must remain absent: ${forbiddenAssetPaths.join(", ")}`);
  assert(credentialArtifactPresent === false,
    `VLM credential/download-token artifact paths must remain absent: ${forbiddenAssetPaths.join(", ")}`);
  const allowlisted = new Set([
    "test/fixtures/integrator_contract_artifact/README.md",
    "test/fixtures/integrator_contract_artifact/freeze-baseline.json",
  ]);
  const forbiddenTokens = [
    /\/client\/vlm/i,
    /\.(gguf|safetensors|ggml|ckpt)\b/i,
    /\bcloudProviderApiCalled\s*:\s*true\b/,
    /\bruntimeVlmCallPerformed\s*:\s*true\b/,
    /\bmodelArtifactDownloaded\s*:\s*true\b/,
    /\bautoRuleApplied\s*:\s*true\b/,
  ];
  const hits = [];
  for (const file of sourceFiles) {
    if (allowlisted.has(file) || isBinaryPath(file)) continue;
    const text = readText(file);
    for (const token of forbiddenTokens) {
      if (token.test(text)) hits.push(`${file}: ${token}`);
    }
  }
  assert(hits.length === 0, `forbidden VLM boundary artifact token(s) found:\n${hits.join("\n")}`);
  assert(!hits.some(hit => hit.includes("modelArtifactDownloaded")), "modelArtifactDownloaded must remain absent/false");
  return {
    scannedRoots: ["src", "include", "config", "test/fixtures"],
    forbiddenBoundaryTokens: forbiddenTokens.length,
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

function projectBoundaryFreeze(baseline) {
  const externalContractEntries = (baseline.entries || []).filter(entry =>
    /(?:event|metadata|auth|registry)/i.test(String(entry.path || "")));
  return {
    contractSchema: baseline.schema,
    runtimeVerificationStillRequired: baseline.runtimeVerificationStillRequired === true,
    frozenEntryCount: externalContractEntries.length,
  };
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
      // 도움말 옵션은 앞단에서 처리됩니다.
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
