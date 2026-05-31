#!/usr/bin/env node
// 파일 용도: V200-S04 VLM 설치/연결 dry-run contract, fixture, 문서/명령 연결을 검증한다.

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
  printUsageAndExit(`VLM install/connection dry-run verification

Usage:
  ./server.sh verify-vlm-install-connection-dry-run [options]

Options:
  --report <path>       Markdown 리포트를 저장합니다.
  --json-report <path>  JSON 리포트를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - dry-run fixture가 local/cloud/unsupported/runtime-missing/cloud-opt-in case를 포함하는지 확인
  - dry-run 출력이 media-server.vlm-install-connection-dry-run.v1 contract를 지키는지 확인
  - 설치, cloud provider API 호출, credential 저장, profile 저장, runtime call, sidecar 저장이 모두 false인지 확인
  - server.sh, script inventory, stream verification, feature inventory, roadmap, docs index 연결을 확인
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const fixturePath = "test/fixtures/vlm_install_connection_dry_run/cases.json";
const fixture = readJson(fixturePath);
const outputs = new Map();
const checks = [];
const report = {
  schema: "media-server.vlm-install-connection-dry-run-report.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  fixturePath,
  checks: [],
};

check("fixture bundle covers required V200-S04 dry-run cases", () => {
  assert(fixture.schema === "media-server.vlm-install-connection-dry-run-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V200-S04", "fixture target step mismatch");
  assert(fixture.pcCapabilityFixture === "test/fixtures/vlm_pc_capability/cases.json", "fixture must reuse PC capability cases");
  assert(fixture.recommendationFixture === "test/fixtures/vlm_recommendation/cases.json", "fixture must reference recommendation cases");
  const ids = new Set(fixture.cases.map(item => item.id));
  for (const id of [
    "unsupported-local-only",
    "unsupported-cloud-allowed-without-opt-in",
    "unsupported-cloud-allowed-with-opt-in",
    "low-local-only",
    "standard-cloud-allowed-with-opt-in",
    "high-cloud-disabled",
    "standard-missing-runtime-tools",
  ]) {
    assert(ids.has(id), `fixture missing case: ${id}`);
  }
  return { cases: fixture.cases.length };
});

check("dry-run outputs match expected selectable and disabled options", () => {
  for (const item of fixture.cases) {
    const output = runDryRun(item);
    assert(output.schema === "media-server.vlm-install-connection-dry-run.v1", `${item.id}: schema mismatch`);
    assert(output.targetStep === "V200-S04", `${item.id}: target step mismatch`);
    assert(output.scope === "install-connection-dry-run-contract-only", `${item.id}: scope mismatch`);
    assert(output.pcCapability.hardwareClass === item.expected.hardwareClass, `${item.id}: hardware class mismatch`);
    assert(output.privacy.mode === item.privacyMode, `${item.id}: privacy mode mismatch`);
    assert(output.privacy.cloudOptInState === item.cloudOptIn, `${item.id}: cloud opt-in mismatch`);
    assert(output.decision.status === item.expected.status, `${item.id}: status mismatch`);
    assert(output.decision.selectableOptionIds.length === item.expected.selectableCount, `${item.id}: selectable option count mismatch`);
    for (const model of item.expected.selectableModels || []) {
      assert(output.options.some(option => option.model === model && option.selectable), `${item.id}: missing selectable model ${model}`);
    }
    for (const reason of item.expected.disabledReasonsInclude || []) {
      assert(output.options.some(option => option.disabledReasons.includes(reason)) || output.decision.blockedReason === reason, `${item.id}: missing disabled reason ${reason}`);
    }
    for (const warning of item.expected.warningsInclude || []) {
      assert(output.warnings.includes(warning), `${item.id}: missing warning ${warning}`);
    }
    assertNoSideEffects(output, item.id);
    assertNoSensitiveLeak(output, item.id);
  }
  return { fixtureCases: fixture.cases.length };
});

check("dry-run contract preserves S04 non-scope boundaries", () => {
  const output = runDryRun(fixture.cases.find(item => item.id === "standard-cloud-allowed-with-opt-in"));
  for (const item of [
    "profile-storage",
    "runtime-vlm-call",
    "sidecar-storage",
    "cloud-provider-api-call",
    "credential-storage",
    "event-post-webrtc-sse-ws-schema-change",
    "rtsp-webrtc-media-path-change",
    "viewer-client-exposure",
    "model-or-runtime-bundle-release",
  ]) {
    assert(output.nonScope.includes(item), `nonScope missing ${item}`);
  }
  assert(output.decision.singleSelectionRequired === true, "dry-run must require one user selection");
  assert(output.decision.automaticMultiInstallAllowed === false, "automatic multi-install must be false");
  assert(output.options.every(option => option.automaticInstallAllowed === false), "option automatic install must be false");
  assert(output.options.every(option => option.installCommandsIncluded === false), "install commands must not be included");
  assert(output.options.every(option => option.modelArtifactReferenceIncluded === false), "model artifact references must not be included");
});

check("roadmap, verification docs, feature inventory, docs index, and server command are wired", () => {
  const backlog = readText("docs/development-backlog.md");
  const stream = readText("docs/stream-verification.md");
  const inventory = readText("docs/project-feature-test-inventory.md");
  const docsIndex = readText("docs/README.md");
  const server = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  const doc = readText("docs/vlm-install-connection-dry-run.md");
  for (const snippet of [
    "### V200-S04 VLM 설치/연결 dry-run contract",
    "`vlm-install-connection-dry-run`",
    "`verify-vlm-install-connection-dry-run`",
    "media-server.vlm-install-connection-dry-run.v1",
  ]) {
    assert(backlog.includes(snippet), `development backlog missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "./server.sh vlm-install-connection-dry-run",
    "./server.sh verify-vlm-install-connection-dry-run",
    "media-server.vlm-install-connection-dry-run.v1",
  ]) {
    assert(stream.includes(snippet), `stream verification missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "| LAB-037 | VLM install/connection dry-run contract",
    "verify-vlm-install-connection-dry-run",
    "| `LAB-001`~`LAB-039` |",
  ]) {
    assert(inventory.includes(snippet), `feature inventory missing snippet: ${snippet}`);
  }
  assert(docsIndex.includes("vlm-install-connection-dry-run.md"), "docs index missing dry-run doc");
  for (const snippet of [
    "vlm-install-connection-dry-run",
    "vlm_install_connection_dry_run.mjs",
    "verify-vlm-install-connection-dry-run",
    "verify_vlm_install_connection_dry_run.mjs",
  ]) {
    assert(server.includes(snippet), `server.sh missing snippet: ${snippet}`);
  }
  for (const script of [
    "vlm_install_connection_dry_run.mjs",
    "verify_vlm_install_connection_dry_run.mjs",
  ]) {
    assert(scriptInventory.includes(script), `script inventory missing ${script}`);
  }
  for (const snippet of [
    "# VLM Install/Connection Dry-run Contract",
    "media-server.vlm-install-connection-dry-run.v1",
    "실제 설치",
    "profile 저장",
    "cloud provider API 호출",
    "VLM runtime 호출",
    "sidecar 저장",
  ]) {
    assert(doc.includes(snippet), `dry-run doc missing snippet: ${snippet}`);
  }
});

check("source tree does not add sidecar, runtime, client VLM, or model artifacts beyond S05 profile storage", () => {
  const sourceFiles = gitLsFiles(["src", "include", "config", "test/fixtures"])
    .filter(file => !isBinaryPath(file));
  const allowlisted = new Set([
    fixturePath,
    "test/fixtures/vlm_model_catalog/selection_decision.json",
    "test/fixtures/vlm_pc_capability/cases.json",
    "test/fixtures/vlm_recommendation/cases.json",
  ]);
  const hits = [];
  const forbidden = [
    /\bVLMObservation\b/,
    /\bvlm[_-]?sidecar\b/i,
    /\/client\/vlm/i,
    /\.(gguf|safetensors|ggml|ckpt)\b/i,
  ];
  for (const file of sourceFiles) {
    if (allowlisted.has(file)) continue;
    const text = readText(file);
    for (const pattern of forbidden) {
      if (pattern.test(text)) hits.push(`${file}: ${pattern}`);
    }
  }
  assert(hits.length === 0, `forbidden dry-run/runtime artifact token(s) found:\n${hits.join("\n")}`);
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
console.log("== VLM install/connection dry-run verification summary ==");
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);
console.log(`- fixtureCases: ${fixture.cases.length}`);

if (args.report) writeText(path.resolve(rootDir, args.report), renderMarkdownReport(report));
if (args.jsonReport) writeText(path.resolve(rootDir, args.jsonReport), `${JSON.stringify(report, null, 2)}\n`);
if (failCount > 0) process.exit(1);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--report") parsed.report = requireValue(argv, ++index, arg);
    else if (arg.startsWith("--report=")) parsed.report = arg.slice("--report=".length);
    else if (arg === "--json-report") parsed.jsonReport = requireValue(argv, ++index, arg);
    else if (arg.startsWith("--json-report=")) parsed.jsonReport = arg.slice("--json-report=".length);
  }
  return parsed;
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("-")) throw new Error(`${option} requires a value`);
  return value;
}

function runDryRun(item) {
  if (outputs.has(item.id)) return outputs.get(item.id);
  const output = execFileSync(process.execPath, [
    path.join(rootDir, "scripts/internal/vlm_install_connection_dry_run.mjs"),
    "--pc-capability-fixture",
    fixture.pcCapabilityFixture,
    "--fixture-case",
    item.pcCapabilityCase,
    "--privacy-mode",
    item.privacyMode,
    "--cloud-opt-in",
    item.cloudOptIn,
  ], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  const parsed = JSON.parse(output);
  outputs.set(item.id, parsed);
  return parsed;
}

function assertNoSideEffects(output, id) {
  for (const [key, value] of Object.entries(output.contractInvariants || {})) {
    assert(value === false, `${id}: contract invariant ${key} must be false`);
  }
  for (const option of output.options || []) {
    for (const [key, value] of Object.entries(option.execution || {})) {
      if (key === "dryRunOnly") {
        assert(value === true, `${id}: option ${option.id} dryRunOnly must be true`);
      } else {
        assert(value === false, `${id}: option ${option.id} execution ${key} must be false`);
      }
    }
  }
}

function assertNoSensitiveLeak(output, id) {
  const text = JSON.stringify(output);
  for (const pattern of [
    /api[_-]?key/i,
    /password/i,
    /token/i,
    /secret/i,
    /rtsp:\/\/[^"]+/i,
    /sourceUrl/i,
    /rawPrompt/i,
    /rawResponse/i,
    /downloadUrl/i,
  ]) {
    assert(!pattern.test(text), `${id}: sensitive or forbidden token leaked: ${pattern}`);
  }
  assert(output.privacy?.sourceLocatorOrCredentialIncluded === false, `${id}: source locator/credential flag must be false`);
  assert(output.privacy?.promptOrResponseIncluded === false, `${id}: prompt/response flag must be false`);
  assert(output.privacy?.providerCredentialEchoed === false, `${id}: provider credential echo flag must be false`);
}

function renderMarkdownReport(result) {
  const lines = [
    "# VLM Install/Connection Dry-run Verification Report",
    "",
    `- schema: ${result.schema}`,
    `- generatedAt: ${result.generatedAt}`,
    `- status: ${result.status}`,
    "",
    "| check | status |",
    "| --- | --- |",
  ];
  for (const checkResult of result.checks) {
    lines.push(`| ${checkResult.name} | ${checkResult.status} |`);
  }
  return `${lines.join("\n")}\n`;
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(outputPath, content) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content);
}

function gitLsFiles(pathspecs) {
  return execFileSync("git", ["ls-files", "--", ...pathspecs], {
    cwd: rootDir,
    encoding: "utf8",
  }).split(/\r?\n/).filter(Boolean);
}

function isBinaryPath(file) {
  return /\.(png|jpe?g|gif|mp4|mov|onnx|pyc|zip|tar|gz)$/i.test(file);
}

function check(name, run) {
  checks.push({ name, run });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
