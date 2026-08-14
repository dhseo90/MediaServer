#!/usr/bin/env node
// 파일 용도: V200-S03 VLM 추천 엔진, fixture matrix, 문서/명령 연결을 정적 검증한다.

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
  printUsageAndExit(`VLM recommendation engine verification

Usage:
  ./server.sh verify-vlm-recommendation-engine [options]

Options:
  --report <path>       Markdown 리포트를 저장합니다.
  --json-report <path>  JSON 리포트를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - recommendation fixture가 low/standard/high/unsupported PC class와 local/cloud privacy mode를 포함하는지 확인
  - 추천 출력이 media-server.vlm-recommendation.v1 schema와 V200-S03 scope를 지키는지 확인
  - 추천 모델, 대안 모델, 비추천 사유, memory/disk/latency/cost estimate가 존재하는지 확인
  - 설치/UI/profile/runtime-call/sidecar/Event schema 변경을 하지 않는 경계를 확인
  - server.sh, script inventory, stream verification, feature inventory, roadmap, docs index 연결을 확인
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const fixturePath = "test/fixtures/vlm_recommendation/cases.json";
const fixture = readJson(fixturePath);
const recommendationScript = "scripts/internal/recommend_vlm_model.mjs";
const outputs = new Map();
const checks = [];
const report = {
  schema: "media-server.vlm-recommendation-engine-report.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  fixturePath,
  checks: [],
};

check("fixture bundle covers required V200-S03 recommendation matrix", () => {
  assert(fixture.schema === "media-server.vlm-recommendation-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V200-S03", "fixture target step mismatch");
  assert(fixture.pcCapabilityFixture === "test/fixtures/vlm_pc_capability/cases.json", "fixture must reuse PC capability cases");
  assert(fixture.selectionDecisionFixture === "test/fixtures/vlm_model_catalog/selection_decision.json", "fixture must reuse model selection decision");
  const ids = new Set(fixture.cases.map(item => item.id));
  for (const id of [
    "unsupported-local-only",
    "unsupported-cloud-allowed",
    "low-local-only",
    "standard-cloud-allowed",
    "high-cloud-disabled",
    "standard-missing-runtime-tools",
  ]) {
    assert(ids.has(id), `fixture missing case: ${id}`);
  }
  const classes = new Set(fixture.cases.map(item => item.expected.hardwareClass));
  for (const hardwareClass of ["local-unsupported", "local-low", "local-standard", "local-high"]) {
    assert(classes.has(hardwareClass), `fixture missing hardware class: ${hardwareClass}`);
  }
  const privacyModes = new Set(fixture.cases.map(item => item.privacyMode));
  for (const mode of ["local-only", "cloud-disabled", "cloud-allowed"]) {
    assert(privacyModes.has(mode), `fixture missing privacy mode: ${mode}`);
  }
  return { cases: fixture.cases.length };
});

check("recommendation outputs match expected primary, alternatives, and no-recommendation cases", () => {
  for (const item of fixture.cases) {
    const output = runRecommendation(item);
    const expected = item.expected;
    assert(output.schema === "media-server.vlm-recommendation.v1", `${item.id}: schema mismatch`);
    assert(output.targetStep === "V200-S03", `${item.id}: target step mismatch`);
    assert(output.scope === "recommendation-engine-only", `${item.id}: scope mismatch`);
    assert(output.selectionDecision.sourceTargetStep === "V200-S01", `${item.id}: selection decision source mismatch`);
    assert(output.pcCapability.hardwareClassCandidate.class === expected.hardwareClass, `${item.id}: hardware class mismatch`);
    assert(output.privacy.mode === item.privacyMode, `${item.id}: privacy mode mismatch`);
    assert(output.privacy.externalTransferAllowed === expected.externalTransferAllowed, `${item.id}: external transfer policy mismatch`);
    assert(output.decision.status === expected.status, `${item.id}: status mismatch`);
    const primaryModel = output.decision.primaryRecommendation?.model || null;
    assert(primaryModel === expected.primaryModel, `${item.id}: primary model expected ${expected.primaryModel}, got ${primaryModel}`);
    for (const model of expected.alternativesInclude || []) {
      assert(output.decision.alternativeRecommendations.some(alt => alt.model === model), `${item.id}: missing alternative ${model}`);
    }
    for (const model of expected.notRecommendedInclude || []) {
      assert(output.decision.notRecommended.some(entry => entry.model === model), `${item.id}: missing not-recommended ${model}`);
    }
    if (expected.runtimeReadiness) {
      assert(output.runtimeReadiness.status === expected.runtimeReadiness, `${item.id}: runtime readiness mismatch`);
    }
    for (const warning of expected.warningsInclude || []) {
      assert(output.warnings.includes(warning), `${item.id}: missing warning ${warning}`);
    }
    assertOutputHasEstimates(output, item.id);
    assertNoForbiddenActionKeys(output, item.id);
    assertNoSensitiveLeak(output, item.id);
  }
  return { fixtureCases: fixture.cases.length };
});

check("recommendation engine preserves V200-S03 non-scope and contract invariants", () => {
  const output = runRecommendation(fixture.cases.find(item => item.id === "standard-cloud-allowed"));
  for (const item of [
    "install-or-connection-ui",
    "profile-storage",
    "runtime-vlm-call",
    "sidecar-storage",
    "event-post-webrtc-sse-ws-schema-change",
    "auto-multi-model-install",
    "model-or-runtime-bundle-release",
  ]) {
    assert(output.nonScope.includes(item), `nonScope missing ${item}`);
  }
  for (const [key, value] of Object.entries(output.contractInvariants)) {
    assert(value === false, `contract invariant ${key} must be false`);
  }
  assert(output.privacy.sourceUrlOrCredentialIncluded === false, "source URL/credential must not be included");
  assert(output.privacy.rawPromptOrResponseIncluded === false, "raw prompt/response must not be included");
  return { nonScope: output.nonScope.length };
});

check("roadmap, verification docs, feature inventory, docs index, and server command are wired", () => {
  const backlog = readText("docs/development-backlog.md");
  const stream = readText("docs/stream-verification.md");
  const inventory = readText("docs/project-feature-test-inventory.md");
  const docsIndex = readText("docs/README.md");
  const server = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  const recommendationDoc = readText("docs/vlm-recommendation-engine.md");

  const legacyBacklogSnippets = [
    "| 3 | V200-S03 | 완료 | VLM 추천 엔진 |",
    "`recommend-vlm-model`",
    "`verify-vlm-recommendation-engine`",
    "### V200-S03 VLM 추천 엔진 종료 기준",
    "설치/연결 UI, profile 저장, VLM runtime 호출",
    "sidecar 저장은",
  ];
  const currentInventoryContract = inventory.includes("| LAB-049 | VLM recommendation privacy-mode matrix |") &&
    recommendationDoc.includes("media-server.vlm-recommendation.v1");
  assert(legacyBacklogSnippets.every(snippet => backlog.includes(snippet)) || currentInventoryContract,
    "recommendation evidence must exist in the legacy roadmap or current inventory/contract source");
  for (const snippet of [
    "./server.sh verify-vlm-recommendation-engine",
  ]) {
    assert(stream.includes(snippet), `stream verification missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "| LAB-049 | VLM recommendation privacy-mode matrix |",
    "media-server.vlm-recommendation.v1",
  ]) {
    assert(inventory.includes(snippet), `feature inventory missing snippet: ${snippet}`);
  }
  assert(inventory.includes("| LAB-069 |"), "feature inventory missing current LAB range endpoint");
  assert(docsIndex.includes("vlm-recommendation-engine.md"), "docs index missing recommendation doc");
  for (const snippet of [
    "recommend-vlm-model",
    "recommend_vlm_model.mjs",
    "verify-vlm-recommendation-engine",
    "verify_vlm_recommendation_engine.mjs",
  ]) {
    assert(server.includes(snippet), `server.sh missing snippet: ${snippet}`);
  }
  for (const script of [
    "recommend_vlm_model.mjs",
    "verify_vlm_recommendation_engine.mjs",
  ]) {
    assert(scriptInventory.includes(script), `script inventory strict parser missing ${script}`);
  }
  for (const snippet of [
    "# VLM Recommendation Engine",
    "media-server.vlm-recommendation.v1",
    "Qwen/Qwen3-VL-8B-Instruct",
    "Qwen/Qwen3-VL-4B-Instruct",
    "Qwen/Qwen3-VL-30B-A3B-Instruct",
    "gemini-2.5-flash",
    "Gemma",
    "설치/연결 UI 구현",
    "VLM runtime 호출",
  ]) {
    assert(recommendationDoc.includes(snippet), `recommendation doc missing snippet: ${snippet}`);
  }
  return { command: "./server.sh verify-vlm-recommendation-engine" };
});

check("source tree does not add client route, sidecar, or runtime VLM artifacts beyond S05 profile storage", () => {
  const sourceFiles = gitLsFiles(["src", "include"]).filter(file => !isBinaryPath(file));
  const hits = [];
  const forbidden = [
    /\bVLMObservation\b/,
    /\bvlm[_-]?sidecar\b/i,
    /\/client\/vlm/i,
  ];
  for (const file of sourceFiles) {
    const text = readText(file);
    for (const pattern of forbidden) {
      if (pattern.test(text)) hits.push(`${file}: ${pattern}`);
    }
  }
  assert(hits.length === 0, `runtime/product implementation token(s) found:\n${hits.join("\n")}`);
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
console.log("== VLM recommendation engine verification summary ==");
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
  const parsed = {};
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

function runRecommendation(caseItem) {
  if (outputs.has(caseItem.id)) return outputs.get(caseItem.id);
  const output = execFileSync(process.execPath, [
    path.join(rootDir, recommendationScript),
    "--pc-capability-fixture",
    fixture.pcCapabilityFixture,
    "--fixture-case",
    caseItem.pcCapabilityCase,
    "--privacy-mode",
    caseItem.privacyMode,
    "--selection-decision",
    fixture.selectionDecisionFixture,
    "--timeout-ms",
    "500",
  ], {
    cwd: rootDir,
    encoding: "utf8",
    timeout: 15000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const parsed = JSON.parse(output);
  outputs.set(caseItem.id, parsed);
  return parsed;
}

function assertOutputHasEstimates(output, label) {
  const recommendations = [
    output.decision.primaryRecommendation,
    ...output.decision.alternativeRecommendations,
    ...output.decision.notRecommended,
  ].filter(Boolean);
  assert(recommendations.length > 0, `${label}: no recommendation/not-recommended rows`);
  for (const item of recommendations) {
    if (item.model === "Gemma family") continue;
    const estimate = item.resourceEstimate;
    assert(estimate?.estimateSource, `${label}: ${item.model} missing estimate source`);
    assert(Object.hasOwn(estimate.memory || {}, "localWorkingSetGb"), `${label}: ${item.model} missing memory estimate`);
    assert(Object.hasOwn(estimate.disk || {}, "modelArtifactGb"), `${label}: ${item.model} missing disk estimate`);
    assert(estimate.latency?.target, `${label}: ${item.model} missing latency target`);
    assert(estimate.cost?.costClass, `${label}: ${item.model} missing cost class`);
    assert(estimate.disk.bundledInRepoOrRelease === false, `${label}: ${item.model} must not be bundled`);
  }
}

function assertNoForbiddenActionKeys(value, label) {
  const forbidden = new Set([
    "installPlan",
    "profileStorage",
    "runtimeCall",
    "sidecarStorage",
    "eventPostPayload",
    "webrtcDataChannelPayload",
    "ssePayload",
    "wsPayload",
  ]);
  const hits = [];
  walk(value, (key) => {
    if (forbidden.has(key)) hits.push(key);
  });
  assert(hits.length === 0, `${label}: forbidden action/schema key leaked: ${hits.join(", ")}`);
}

function assertNoSensitiveLeak(value, label) {
  const text = JSON.stringify(value);
  const forbidden = [
    /passwordHash/i,
    /tokenHash/i,
    /api[_-]?key/i,
    /bearer\s+[A-Za-z0-9._-]+/i,
    /rtsp:\/\/[^"\s]+/i,
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
  fs.writeFileSync(filePath, content, "utf8");
}

function gitLsFiles(pathspecs = []) {
  return execFileSync("git", ["ls-files", "-z", "--", ...pathspecs], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  }).split("\0").filter(Boolean);
}

function isBinaryPath(filePath) {
  return /\.(png|jpe?g|gif|mp4|onnx|pyc)$/i.test(filePath);
}

function renderMarkdownReport(value) {
  const lines = [
    "# VLM Recommendation Engine Verification Report",
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
