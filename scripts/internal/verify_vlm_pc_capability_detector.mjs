#!/usr/bin/env node
// 파일 용도: V200-S02 PC 사양 감지 detector, fixture, 문서/명령 연결을 검증한다.

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
  printUsageAndExit(`VLM PC capability detector verification

Usage:
  ./server.sh verify-vlm-pc-capability [options]

Options:
  --report <path>       Markdown 리포트를 저장합니다.
  --json-report <path>  JSON 리포트를 저장합니다.
  --skip-live-smoke     현재 host live detector smoke를 생략합니다.
  -h, --help            도움말 출력

Checks:
  - detector output schema가 media-server.vlm-pc-capability.v1인지 확인
  - macOS/Linux/Apple Silicon/NVIDIA/CPU-only/missing-tool fixture class가 기대값과 일치하는지 확인
  - 출력이 추천 모델, 설치, VLM 호출, sidecar 저장을 대신하지 않는지 확인
  - loopback-only/redaction/privacy 경계가 유지되는지 확인
  - server.sh, script inventory, stream verification, feature inventory, roadmap 연결을 확인
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "skip-live-smoke", "h", "help"]);

const args = parseArgs(rawArgs);
const fixturePath = "test/fixtures/vlm_pc_capability/cases.json";
const fixture = readJson(fixturePath);
const detectorPath = "scripts/internal/detect_vlm_pc_capability.mjs";
const checks = [];
const detectorReports = new Map();
const report = {
  schema: "media-server.vlm-pc-capability-detector-report.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  fixturePath,
  checks: [],
};

check("fixture bundle covers required V200-S02 hardware cases", () => {
  assert(fixture.schema === "media-server.vlm-pc-capability-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V200-S02", "fixture target step mismatch");
  const ids = new Set(fixture.cases.map(item => item.id));
  for (const id of [
    "macos-apple-silicon-16gb",
    "macos-apple-silicon-24gb",
    "macos-apple-silicon-48gb",
    "macos-intel-cpu-only",
    "linux-nvidia-8gb",
    "linux-nvidia-12gb",
    "linux-nvidia-24gb",
    "linux-cpu-only",
    "missing-runtime-tools",
  ]) {
    assert(ids.has(id), `fixture missing case: ${id}`);
  }
  return { cases: fixture.cases.length };
});

check("detector fixture outputs match expected hardware classes", () => {
  for (const item of fixture.cases) {
    const output = runDetectorFixture(item.id);
    assert(output.schema === "media-server.vlm-pc-capability.v1", `${item.id}: output schema mismatch`);
    assert(output.targetStep === "V200-S02", `${item.id}: target step mismatch`);
    assert(output.scope === "pc-capability-detector-only", `${item.id}: scope mismatch`);
    assert(output.hardwareClassCandidate?.class === item.expectedHardwareClass, `${item.id}: VLM expected ${item.expectedHardwareClass}, got ${output.hardwareClassCandidate?.class}`);
    assert(output.privacy?.externalNetworkProbes === false, `${item.id}: external network probe must be false`);
    assert(output.privacy?.loopbackEndpointProbeOnly === true, `${item.id}: loopback-only policy missing`);
    assert(output.privacy?.rawCommandOutputStored === false, `${item.id}: raw command output must not be stored`);
    assert(output.privacy?.sensitiveValuesIncluded === false, `${item.id}: sensitive values must not be included`);
    assert(Array.isArray(output.nonScope) && output.nonScope.includes("recommendation-engine"), `${item.id}: recommendation non-scope missing`);
    assertNoRecommendationKeys(output, item.id);
    assertNoSensitiveLeak(output, item.id);
  }
  return { fixtureCases: fixture.cases.length };
});

check("missing-tool fixture remains a detector success with runtime warnings", () => {
  const output = runDetectorFixture("missing-runtime-tools");
  const expected = fixture.cases.find(item => item.id === "missing-runtime-tools").expectedRuntimeStatuses;
  assert(output.hardwareClassCandidate.class === "local-standard", "missing tools must not erase detected hardware class");
  assert(output.runtimes.docker.status === expected.docker, "docker missing status mismatch");
  assert(output.runtimes.ollama.cli.status === expected.ollamaCli, "ollama CLI missing status mismatch");
  assert(output.runtimes.ollama.loopbackApi.status === expected.ollamaLoopback, "ollama loopback status mismatch");
  assert(output.runtimes.vllm.pythonModule.status === expected.vllmModule, "vLLM module status mismatch");
  assert(output.runtimes.vllm.loopbackApi.status === expected.vllmLoopback, "vLLM loopback status mismatch");
  for (const warning of ["docker-missing", "ollama-cli-missing", "vllm-module-missing"]) {
    assert(output.warnings.includes(warning), `missing-tool fixture warning absent: ${warning}`);
  }
  return { case: "missing-runtime-tools", status: "pass" };
});

check("live detector smoke returns schema on the current host", () => {
  if (args.skipLiveSmoke) return { skipped: true };
  const output = runDetectorLive();
  assert(output.schema === "media-server.vlm-pc-capability.v1", "live output schema mismatch");
  assert(output.targetStep === "V200-S02", "live target step mismatch");
  assert(["macOS", "Linux", "unsupported"].includes(output.os.family), `live OS family unexpected: ${output.os.family}`);
  assert(["local-unsupported", "local-low", "local-standard", "local-high"].includes(output.hardwareClassCandidate.class), `live hardware class unexpected: ${output.hardwareClassCandidate.class}`);
  assertNoRecommendationKeys(output, "live");
  assertNoSensitiveLeak(output, "live");
  return {
    os: output.os.family,
    hardwareClassCandidate: output.hardwareClassCandidate.class,
  };
});

check("roadmap, verification docs, feature inventory, and server command are wired", () => {
  const stream = readText("docs/stream-verification.md");
  const inventory = readText("docs/project-feature-test-inventory.md");
  const docsIndex = readText("docs/README.md");
  const server = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");

  for (const snippet of [
    "./server.sh verify-vlm-pc-capability",
  ]) {
    assert(stream.includes(snippet), `stream verification missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "| LAB-035 | VLM PC capability detector",
    "media-server.vlm-pc-capability.v1",
    "missing-tool fixture",
    "no recommendation/install/runtime-call boundary",
  ]) {
    assert(inventory.includes(snippet), `feature inventory missing snippet: ${snippet}`);
  }
  assert(docsIndex.includes("vlm-recommendation-engine.md") && docsIndex.includes("PC 사양별 추천 기준"),
    "docs index missing current VLM PC capability/recommendation link");
  for (const snippet of [
    "detect-vlm-pc-capability",
    "detect_vlm_pc_capability.mjs",
    "verify-vlm-pc-capability",
    "verify_vlm_pc_capability_detector.mjs",
  ]) {
    assert(server.includes(snippet), `server.sh missing snippet: ${snippet}`);
  }
  for (const script of [
    "detect_vlm_pc_capability.mjs",
    "verify_vlm_pc_capability_detector.mjs",
  ]) {
    assert(scriptInventory.includes(script), `script inventory strict parser missing ${script}`);
  }
  return {
    command: "./server.sh verify-vlm-pc-capability",
    detector: "./server.sh detect-vlm-pc-capability",
  };
});

check("existing VLM boundary and selection decisions remain non-runtime scopes", () => {
  const selection = readText("docs/vlm-model-selection.md");
  const distribution = readText("docs/distribution-policy.md");
  for (const snippet of [
    "PC 사양 자동 감지",
    "추천 엔진 구현",
    "VLM runtime 호출",
    "Event POST/WebRTC/SSE/WS metadata schema 변경",
  ]) {
    assert(selection.includes(snippet), `selection doc missing non-scope reminder: ${snippet}`);
  }
  for (const snippet of [
    "VLM 후보는 사용자 준비물 또는 외부 provider API로 취급",
    "기본 source release",
    "model weight/runtime을 포함하지 않습니다",
  ]) {
    assert(distribution.includes(snippet), `distribution policy missing VLM bundle boundary: ${snippet}`);
  }
  return { boundaries: ["selection", "distribution"] };
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
console.log("== VLM PC capability detector verification summary ==");
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);
console.log(`- fixtureCases: ${fixture.cases.length}`);

if (args.report) {
  writeText(path.resolve(rootDir, args.report), renderMarkdownReport(report));
  console.log(`- report: ${args.report}`);
}
if (args.jsonReport) {
  writeText(path.resolve(rootDir, args.jsonReport), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`- jsonReport: ${args.jsonReport}`);
}

if (failCount > 0) process.exit(1);

function parseArgs(argv) {
  const parsed = {
    skipLiveSmoke: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--report") {
      parsed.report = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--report=")) {
      parsed.report = arg.slice("--report=".length);
    } else if (arg === "--json-report") {
      parsed.jsonReport = requireValue(argv, ++index, arg);
    } else if (arg.startsWith("--json-report=")) {
      parsed.jsonReport = arg.slice("--json-report=".length);
    } else if (arg === "--skip-live-smoke") {
      parsed.skipLiveSmoke = true;
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

function runDetectorFixture(caseId) {
  if (detectorReports.has(caseId)) return detectorReports.get(caseId);
  const output = runNodeScript(detectorPath, [
    "--fixture",
    fixturePath,
    "--fixture-case",
    caseId,
    "--timeout-ms",
    "500",
  ]);
  const parsed = JSON.parse(output);
  detectorReports.set(caseId, parsed);
  return parsed;
}

function runDetectorLive() {
  const output = runNodeScript(detectorPath, [
    "--timeout-ms",
    "700",
  ]);
  return JSON.parse(output);
}

function runNodeScript(relativeScriptPath, scriptArgs) {
  return execFileSync(process.execPath, [path.join(rootDir, relativeScriptPath), ...scriptArgs], {
    cwd: rootDir,
    encoding: "utf8",
    timeout: 10000,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assertNoRecommendationKeys(value, label) {
  const forbidden = new Set([
    "recommendedModel",
    "modelRecommendation",
    "selectedModel",
    "primaryModel",
    "fallbackModel",
    "installPlan",
    "profileStorage",
    "runtimeCall",
    "sidecarStorage",
  ]);
  const hits = [];
  walk(value, (key) => {
    if (forbidden.has(key)) hits.push(key);
  });
  assert(hits.length === 0, `${label}: recommendation/install/runtime key leaked: ${hits.join(", ")}`);
}

function assertNoSensitiveLeak(value, label) {
  const text = JSON.stringify(value);
  const forbidden = [
    /passwordHash/i,
    /tokenHash/i,
    /api[_-]?key/i,
    /bearer\s+[A-Za-z0-9._-]+/i,
    /rtsp:\/\/[^"\s]+/i,
    /https?:\/\/(?!127\.0\.0\.1|localhost|\[?::1\]?)/i,
    /serial\s*(number)?\s*[:=]/i,
  ];
  for (const pattern of forbidden) {
    assert(!pattern.test(text), `${label}: sensitive value pattern found: ${pattern}`);
  }
}

function walk(value, visit, key = "") {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit, key);
  } else if (value && typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) {
      visit(childKey, childValue);
      walk(childValue, visit, childKey);
    }
  }
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function renderMarkdownReport(value) {
  const lines = [
    "# VLM PC Capability Detector Verification Report",
    "",
    `- schema: \`${value.schema}\``,
    `- generatedAt: \`${value.generatedAt}\``,
    `- status: \`${value.status}\``,
    `- fixturePath: \`${value.fixturePath}\``,
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

function check(name, run) {
  checks.push({ name, run });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
