#!/usr/bin/env node
// 파일 용도: V200-S01 VLM 모델 선택값, 선택 기준, license/privacy/bundle gate가 실제로 닫혔는지 정적 검증한다.

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
  printUsageAndExit(`VLM selection decision verification

Usage:
  ./server.sh verify-vlm-selection-decision [options]

Options:
  --report <path>       Markdown 리포트를 저장합니다.
  --json-report <path>  JSON 리포트를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - V200-S01 roadmap row가 실제 모델 선택값과 선택 기준으로 완료 처리됐는지 확인
  - docs/vlm-model-selection.md가 1차 모델, fallback, 제외/조건부 사유, license/privacy/bundle gate를 담는지 확인
  - selection_decision.json이 같은 결정을 구조화해 보존하는지 확인
  - macOS/Linux PC tier별 Qwen 4B/8B/30B, Gemini Flash, Gemma 조건부 판정이 프로젝트 license/bundle/privacy 제약을 지키는지 확인
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const checks = [];
const report = {
  schema: "media-server.vlm-selection-decision-report.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  checks: [],
};

const decisionPath = "test/fixtures/vlm_model_catalog/selection_decision.json";
const decision = readJson(decisionPath);

check("V200-S01 roadmap row is closed with explicit selected models", () => {
  const backlog = readText("docs/development-backlog.md");
  for (const snippet of [
    "| 1 | V200-S01 | 완료 | VLM 후보군/선택 기준 |",
    "`Qwen/Qwen3-VL-8B-Instruct`를 1차 local standard로 선택",
    "`Qwen/Qwen3-VL-4B-Instruct`를 local low-spec fallback",
    "`Qwen/Qwen3-VL-30B-A3B-Instruct`",
    "`gemini-2.5-flash`는 cloud opt-in fallback",
    "Gemma 계열은 custom terms/license review 때문에 기본값이 아닙니다",
    "`verify-vlm-selection-decision`",
    "### V200-S01 VLM 후보군/선택 기준 종료 기준",
  ]) {
    assert(backlog.includes(snippet), `backlog missing V200-S01 decision snippet: ${snippet}`);
  }
  return { step: "V200-S01", status: "complete", decision: "explicit-model-baseline" };
});

check("selection document contains direct answer, gates, tiers, hardware classes, and non-scope", () => {
  const doc = readText("docs/vlm-model-selection.md");
  for (const snippet of [
    "# VLM Model Selection",
    "## 직접 답",
    "`Qwen/Qwen3-VL-8B-Instruct`",
    "`Qwen/Qwen3-VL-4B-Instruct`",
    "`Qwen/Qwen3-VL-30B-A3B-Instruct`",
    "`gemini-2.5-flash`",
    "Gemma 계열",
    "## Hard Gates",
    "`G0-license-compatible`",
    "`G0-no-bundle`",
    "`G0-cloud-opt-in`",
    "`G0-no-contract-drift`",
    "## Tier 기준",
    "`T1-primary-local-standard`",
    "`T2-local-low-spec-fallback`",
    "`T1H-local-high-candidate`",
    "`T3-cloud-opt-in-fallback`",
    "`T4-conditional-user-supplied`",
    "`T5-excluded-or-blocked`",
    "## PC 등급 기준",
    "macOS/Linux",
    "`local-unsupported`",
    "`local-low`",
    "`local-standard`",
    "`local-high`",
    "Apple Silicon",
    "NVIDIA",
    "24GB 이상 VRAM",
    "48GB 이상 unified memory",
    "`cloud-allowed`",
    "GTX 1050",
    "no-local-vlm-recommendation",
    "P50 10초 이하",
    "P95 30초 이하",
    "benchmark PASS로 보고하지 않습니다",
    "## 향후 모델 추가 규칙",
    "Event POST/WebRTC/SSE/WS metadata schema 변경",
  ]) {
    assert(doc.includes(snippet), `selection doc missing snippet: ${snippet}`);
  }
  return { doc: "docs/vlm-model-selection.md" };
});

check("decision fixture schema and scope are explicit", () => {
  assert(decision.schema === "media-server.vlm-selection-decision.v1", "decision schema mismatch");
  assert(decision.targetStep === "V200-S01", "target step mismatch");
  assert(decision.status === "selected", "decision status must be selected");
  assert(decision.projectLicense === "Apache-2.0", "project license must be Apache-2.0");
  for (const item of [
    "pc-capability-detector",
    "recommendation-engine",
    "install-or-connection-ui",
    "profile-storage",
    "runtime-vlm-call",
    "sidecar-storage",
    "event-post-webrtc-sse-ws-schema-change",
  ]) {
    assert(decision.nonScope.includes(item), `nonScope missing ${item}`);
  }
  return { fixture: decisionPath, status: decision.status };
});

check("primary local standard is Qwen3-VL 8B with Apache-2.0 and no bundle", () => {
  const primary = decision.primary;
  assert(primary.model === "Qwen/Qwen3-VL-8B-Instruct", "primary model mismatch");
  assert(primary.tier === "T1-primary-local-standard", "primary tier mismatch");
  assert(primary.deployment === "local", "primary must be local");
  assert(primary.hardwareClass === "local-standard", "primary hardware class mismatch");
  assert(primary.license === "Apache-2.0", "primary license mismatch");
  assert(primary.externalTransfer === false, "primary must not require external transfer");
  assert(primary.bundleAllowed === false, "primary model bundle must be disallowed");
  assert(primary.autoInstallAllowed === false, "primary auto install must be disallowed");
  assert(hasSource(primary, "https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct"), "primary official source missing");
  return { primary: primary.model, tier: primary.tier };
});

check("local low-spec fallback is Qwen3-VL 4B with Apache-2.0 and no bundle", () => {
  const fallback = findById(decision.fallbacks, "qwen3-vl-4b-instruct");
  assert(fallback.model === "Qwen/Qwen3-VL-4B-Instruct", "local fallback model mismatch");
  assert(fallback.tier === "T2-local-low-spec-fallback", "local fallback tier mismatch");
  assert(fallback.deployment === "local", "local fallback must be local");
  assert(fallback.hardwareClass === "local-low", "local fallback hardware class mismatch");
  assert(fallback.license === "Apache-2.0", "local fallback license mismatch");
  assert(fallback.externalTransfer === false, "local fallback must not require external transfer");
  assert(fallback.bundleAllowed === false, "local fallback model bundle must be disallowed");
  assert(fallback.autoInstallAllowed === false, "local fallback auto install must be disallowed");
  assert(hasSource(fallback, "https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct"), "local fallback official source missing");
  return { fallback: fallback.model, tier: fallback.tier };
});

check("cloud fallback is Gemini 2.5 Flash with explicit opt-in and no redistribution", () => {
  const fallback = findById(decision.fallbacks, "gemini-2.5-flash");
  assert(fallback.model === "gemini-2.5-flash", "cloud fallback model mismatch");
  assert(fallback.tier === "T3-cloud-opt-in-fallback", "cloud fallback tier mismatch");
  assert(fallback.deployment === "cloud", "cloud fallback must be cloud");
  assert(fallback.externalTransfer === true, "cloud fallback must mark external transfer");
  assert(fallback.privacyModeRequired === "cloud-allowed-explicit-opt-in", "cloud fallback opt-in mismatch");
  assert(fallback.loggingRetentionReviewRequired === true, "cloud fallback must require logging/retention review");
  assert(fallback.bundleAllowed === false, "cloud fallback must not bundle model");
  assert(hasSource(fallback, "https://ai.google.dev/gemini-api/docs/models"), "cloud fallback official source missing");
  return { fallback: fallback.model, privacyModeRequired: fallback.privacyModeRequired };
});

check("local high candidate is Qwen3-VL 30B-A3B for high macOS/Linux servers only", () => {
  const candidate = findById(decision.highCandidates, "qwen3-vl-30b-a3b-instruct");
  assert(candidate.model === "Qwen/Qwen3-VL-30B-A3B-Instruct", "high candidate model mismatch");
  assert(candidate.tier === "T1H-local-high-candidate", "high candidate tier mismatch");
  assert(candidate.deployment === "local", "high candidate must be local");
  assert(candidate.hardwareClass === "local-high", "high candidate hardware class mismatch");
  assert(candidate.license === "Apache-2.0", "high candidate license mismatch");
  assert(candidate.defaultAllowedBeforeEvaluation === false, "high candidate must require evaluation before default");
  assert(candidate.safeFallback === "Qwen/Qwen3-VL-8B-Instruct", "high candidate safe fallback mismatch");
  assert(hasSource(candidate, "https://huggingface.co/Qwen/Qwen3-VL-30B-A3B-Instruct"), "high candidate official source missing");
  return { candidate: candidate.model, tier: candidate.tier };
});

check("Gemma is conditional user-supplied and not default", () => {
  const gemma = findById(decision.conditional, "gemma-family");
  assert(gemma.tier === "T4-conditional-user-supplied", "Gemma tier mismatch");
  assert(gemma.status === "not-default", "Gemma must be not-default");
  assert(gemma.defaultAllowed === false, "Gemma default must be disallowed");
  assert(gemma.requiresLicenseReview === true, "Gemma must require license review");
  assert(hasSource(gemma, "https://ai.google.dev/gemma/terms"), "Gemma terms source missing");
  assert(![decision.primary, ...decision.fallbacks].some((item) => /gemma/i.test(item.model || item.id)), "Gemma must not be primary or fallback");
  return { conditional: gemma.family, status: gemma.status };
});

check("hard gates and future model admission criteria are complete", () => {
  const gateIds = new Set(decision.hardGates.map((gate) => gate.id));
  for (const gate of [
    "G0-official-source",
    "G0-license-compatible",
    "G0-no-bundle",
    "G0-cloud-opt-in",
    "G0-image-input",
    "G0-structured-output-plan",
    "G0-no-contract-drift",
    "G0-viewer-redaction",
  ]) {
    assert(gateIds.has(gate), `hard gate missing ${gate}`);
  }
  for (const tier of [
    "T1-primary-local-standard",
    "T2-local-low-spec-fallback",
    "T1H-local-high-candidate",
    "T3-cloud-opt-in-fallback",
    "T4-conditional-user-supplied",
    "T5-excluded-or-blocked",
  ]) {
    assert(Object.hasOwn(decision.tiers, tier), `tier missing ${tier}`);
  }
  for (const hardwareClass of [
    "local-unsupported",
    "local-low",
    "local-standard",
    "local-high",
    "cloud-allowed",
    "cloud-disabled",
  ]) {
    assert(Object.hasOwn(decision.hardwareClasses, hardwareClass), `hardware class missing ${hardwareClass}`);
  }
  assert(decision.hardwareClasses["local-unsupported"].decisionWhenCloudDisabled === "no-local-vlm-recommendation", "unsupported class must not receive a local VLM default");
  assert(decision.hardwareClasses["local-unsupported"].decisionWhenCloudAllowed === "gemini-2.5-flash", "unsupported class cloud fallback mismatch");
  assert(decision.hardwareClasses["local-low"].minimumGpuVramGb === 8, "local-low minimum VRAM must be 8GB");
  assert(decision.hardwareClasses["local-standard"].minimumGpuVramGb === 12, "local-standard minimum VRAM must be 12GB");
  assert(decision.hardwareClasses["local-high"].minimumGpuVramGb === 24, "local-high minimum VRAM must be 24GB");
  assert(decision.hardwareClasses["local-high"].minimumAppleUnifiedMemoryGb === 48, "local-high Apple unified memory must be 48GB");
  assert(decision.hardwareClasses["local-high"].recommendedCandidate === "Qwen/Qwen3-VL-30B-A3B-Instruct", "local-high candidate mismatch");
  assert(decision.resourceDecisionPolicy.memoryHeadroomMaxRatio === 0.7, "resource headroom ratio mismatch");
  assert(decision.resourceDecisionPolicy.reservedGpuVramGb === 2, "reserved GPU VRAM mismatch");
  assert(decision.resourceDecisionPolicy.latencyTargets.eventReviewP50Seconds === 10, "P50 latency target mismatch");
  assert(decision.resourceDecisionPolicy.latencyTargets.eventReviewP95Seconds === 30, "P95 latency target mismatch");
  assert(decision.resourceDecisionPolicy.latencyTargets.mustNotBlockMediaPath === true, "media path blocking target mismatch");
  const matrix = decision.resourceDecisionPolicy.pcSelectionMatrix || [];
  assert(matrix.some((item) => item.pcClass === "local-unsupported" && item.localModel === null), "PC selection matrix must block unsupported local model defaults");
  assert(matrix.some((item) => item.pcClass === "local-low" && item.localModel === "Qwen/Qwen3-VL-4B-Instruct"), "PC selection matrix missing local-low Qwen 4B");
  assert(matrix.some((item) => item.pcClass === "local-standard" && item.localModel === "Qwen/Qwen3-VL-8B-Instruct"), "PC selection matrix missing local-standard Qwen 8B");
  assert(matrix.some((item) => item.pcClass === "local-high" && item.localModel === "Qwen/Qwen3-VL-30B-A3B-Instruct"), "PC selection matrix missing local-high Qwen 30B");
  for (const field of [
    "officialSourceUrl",
    "licenseUrl",
    "hardGateResults",
    "tier",
    "hardwareClass",
    "minimumRamOrVram",
    "latencyTarget",
    "decisionRole",
    "bundlePolicy",
    "exclusionOrConditionReason",
  ]) {
    assert(decision.futureModelAdmission.requiredFields.includes(field), `future model admission missing ${field}`);
  }
  return { hardGates: gateIds.size, tiers: Object.keys(decision.tiers).length };
});

check("bundle and public repo policies block VLM model artifacts", () => {
  const bundle = JSON.stringify(readJson("config/bundle_distribution_policy.json"));
  const publicRepo = JSON.stringify(readJson("config/public_repo_policy.json"));
  for (const ext of ["gguf", "ggml", "safetensors", "ckpt"]) {
    assert(bundle.includes(ext), `bundle policy missing ${ext}`);
    assert(publicRepo.includes(ext), `public repo policy missing ${ext}`);
  }
  const distribution = readText("docs/distribution-policy.md");
  for (const snippet of [
    "VLM model artifact",
    ".gguf",
    ".safetensors",
    ".ggml",
    ".ckpt",
    "license/provenance",
  ]) {
    assert(distribution.includes(snippet), `distribution policy doc missing ${snippet}`);
  }
  return { policies: ["config/bundle_distribution_policy.json", "config/public_repo_policy.json"] };
});

check("server command, script inventory, docs index, and verification docs are wired", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  const docsIndex = readText("docs/README.md");
  const stream = readText("docs/stream-verification.md");
  for (const snippet of ["verify-vlm-selection-decision", "verify_vlm_selection_decision.mjs"]) {
    assert(server.includes(snippet), `server.sh missing ${snippet}`);
  }
  assert(inventory.includes("verify_vlm_selection_decision.mjs"), "script inventory missing verifier script");
  assert(docsIndex.includes("vlm-model-selection.md"), "docs index missing VLM selection doc");
  assert(stream.includes("./server.sh verify-vlm-selection-decision"), "stream verification missing command");
  assert(stream.includes("모델 선택 결정 자체"), "stream verification missing decision-scope wording");
  return { command: "./server.sh verify-vlm-selection-decision" };
});

check("V200-S01/S03 do not introduce runtime implementation artifacts beyond S05 profile storage", () => {
  const sourceFiles = gitLsFiles(["src", "include"]).filter((file) => !isBinaryPath(file));
  const hits = [];
  const forbidden = [
    /\bVLMObservation\b/,
    /\bvlm[_-]?sidecar\b/i,
  ];
  for (const file of sourceFiles) {
    const text = readText(file);
    for (const pattern of forbidden) {
      if (pattern.test(text)) hits.push(`${file}: ${pattern}`);
    }
  }
  assert(hits.length === 0, `runtime implementation token(s) found:\n${hits.join("\n")}`);
  return { scannedRoots: ["src", "include"], files: sourceFiles.length };
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
console.log("== VLM selection decision summary ==");
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);
console.log(`- primary: ${decision.primary?.model || "missing"}`);
console.log(`- local fallback: ${findById(decision.fallbacks || [], "qwen3-vl-4b-instruct")?.model || "missing"}`);
console.log(`- cloud fallback: ${findById(decision.fallbacks || [], "gemini-2.5-flash")?.model || "missing"}`);

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
  fs.writeFileSync(filePath, text, "utf8");
}

function renderMarkdownReport(payload) {
  const lines = [
    "# VLM Selection Decision Report",
    "",
    `- schema: ${payload.schema}`,
    `- generatedAt: ${payload.generatedAt}`,
    `- status: ${payload.status}`,
    "",
    "| 결과 | 검사 | 상세 |",
    "| --- | --- | --- |",
  ];
  for (const item of payload.checks) {
    const detail = item.message || JSON.stringify(item.details || {});
    lines.push(`| ${item.status.toUpperCase()} | ${cell(item.name)} | ${cell(detail)} |`);
  }
  return `${lines.join("\n")}\n`;
}

function findById(items, id) {
  return (items || []).find((item) => item.id === id) || null;
}

function hasSource(item, url) {
  return (item.officialSources || []).some((source) => source.url === url);
}

function gitLsFiles(pathspecs = []) {
  return execFileSync("git", ["ls-files", "-z", "--", ...pathspecs], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  }).split("\0").filter(Boolean);
}

function isBinaryPath(file) {
  return /\.(png|jpe?g|mp4|onnx|pyc|o|a|dylib|so)$/i.test(file);
}

function cell(value) {
  return String(value || "-").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
