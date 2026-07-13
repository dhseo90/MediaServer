#!/usr/bin/env node
// 파일 용도: V200-S06 VLM 평가 harness, fixture, report, 문서/명령 연결을 검증한다.

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
  printUsageAndExit(`VLM evaluation harness verification

Usage:
  ./server.sh verify-vlm-evaluation-harness

Checks:
  - fixture covers event frame, bbox crop, previous/next frame, prompt profile A/B, ko/en output, invalid JSON/hallucination case.
  - evaluate-vlm-harness emits media-server.vlm-evaluation-report.v1 with latency, explanation, hallucination, JSON stability, language scores.
  - docs, inventory, server command, and script inventory are wired.
  - S06 remains fixture evaluation only and does not add sidecar, client route, provider API, schema, or media path artifacts.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const fixturePath = "test/fixtures/vlm_evaluation_harness/cases.json";

check("fixture bundle covers required V200-S06 evaluation cases", () => {
  const fixture = readJson(fixturePath);
  assert(fixture.schema === "media-server.vlm-evaluation-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V200-S06", "fixture target step mismatch");
  const ids = new Set(fixture.cases.map(item => item.id));
  for (const id of ["line-crossing-ko-ab", "intrusion-en-json-stability"]) {
    assert(ids.has(id), `fixture missing case: ${id}`);
  }
  for (const item of fixture.cases) {
    for (const key of ["eventFrame", "bboxCrop", "previousFrame", "nextFrame"]) {
      assert(item.evidenceRefs?.[key], `${item.id}: missing evidenceRefs.${key}`);
    }
    assert((item.candidates || []).length >= 2, `${item.id}: prompt profile comparison needs at least two candidates`);
  }
  assert(JSON.stringify(fixture).includes("expectedStatus"), "fixture must encode expected pass/fail status");
});

check("evaluation harness report scores latency, explanation, hallucination, JSON, and language quality", () => {
  const output = runHarness([]);
  assert(output.schema === "media-server.vlm-evaluation-report.v1", "report schema mismatch");
  assert(output.targetStep === "V200-S06", "target step mismatch");
  assert(output.summary.cases === 2, "expected two evaluation cases");
  assert(output.summary.candidates === 4, "expected four candidate outputs");
  assert(output.status === "passed", "fixture expected-status alignment should pass");
  for (const item of output.cases) {
    assert(item.evidenceRefs.eventFrame && item.evidenceRefs.bboxCrop, `${item.id}: report missing evidence refs`);
    assert(item.promptProfilesCompared.length >= 2, `${item.id}: prompt A/B comparison missing`);
    for (const candidate of item.candidates) {
      for (const dimension of ["latency", "jsonStability", "explanationQuality", "hallucination", "languageQuality"]) {
      assert(candidate.dimensions[dimension], `${candidate.id}: VLM missing dimension ${dimension}`);
      }
      assert(typeof candidate.score.total === "number", `${candidate.id}: total score missing`);
      assert(candidate.expectedStatus === candidate.status, `${candidate.id}: expected status mismatch`);
    }
  }
  assert(output.cases.every(item => item.candidates.every(candidate => Object.keys(candidate.dimensions || {}).length === 5)), "LAB-052 VLM dimensions matrix readback mismatch");
  const invalid = output.cases.flatMap(item => item.candidates).find(item => item.id === "bad-json-hallucination-en");
  assert(invalid?.status === "failed", "invalid structured output fixture must fail candidate scoring");
  assert(invalid.failedDimensions.includes("jsonStability"), "invalid fixture must fail JSON stability");
  assert(invalid.failedDimensions.includes("hallucination"), "invalid fixture must fail hallucination guard");
});

check("single case mode and markdown report output work", () => {
  const tmpDir = fs.mkdtempSync(path.join(osTmp(), "media_server_vlm_eval_"));
  const jsonOut = path.join(tmpDir, "report.json");
  const mdOut = path.join(tmpDir, "report.md");
  const output = runHarness(["--case", "line-crossing-ko-ab", "--json-output", jsonOut, "--report", mdOut]);
  assert(output.summary.cases === 1, "single case filter should emit one case");
  assert(fs.existsSync(jsonOut), "json report not written");
  assert(fs.existsSync(mdOut), "markdown report not written");
  const markdown = fs.readFileSync(mdOut, "utf8");
  assert(markdown.includes("VLM Evaluation Harness Report"), "markdown report title missing");
  assert(markdown.includes("runtimeVlmCallPerformed: false"), "markdown report missing runtime invariant");
});

check("docs, inventory, server command, and script inventory are wired", () => {
  const docs = [
    readText("docs/vlm-evaluation-harness.md"),
    readText("docs/README.md"),
    readText("docs/stream-verification.md"),
    readText("docs/development-backlog.md"),
    readText("docs/project-feature-test-inventory.md"),
  ].join("\n");
  const server = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  for (const snippet of [
    "evaluate-vlm-harness",
    "verify-vlm-evaluation-harness",
    "media-server.vlm-evaluation-report.v1",
    "latency",
    "hallucination",
    "JSON 안정성",
    "한국어/영어",
    "fixture-captured-output-only",
    "V200-S06",
  ]) {
    assert(docs.includes(snippet), `docs missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "evaluate-vlm-harness",
    "evaluate_vlm_harness.mjs",
    "verify-vlm-evaluation-harness",
    "verify_vlm_evaluation_harness.mjs",
  ]) {
    assert(server.includes(snippet), `server missing snippet: ${snippet}`);
  }
  assert(scriptInventory.includes("evaluate_vlm_harness.mjs"), "script inventory missing evaluate harness");
  assert(scriptInventory.includes("verify_vlm_evaluation_harness.mjs"), "script inventory missing verifier");
});

check("S06 fixture harness does not introduce sidecar, client route, provider API, schema, or media path artifacts", () => {
  const files = [
    "scripts/internal/evaluate_vlm_harness.mjs",
    "scripts/internal/verify_vlm_evaluation_harness.mjs",
    "docs/vlm-evaluation-harness.md",
    "test/fixtures/vlm_evaluation_harness/cases.json",
  ]
    .filter(file => !isBinaryPath(file));
  const forbidden = [
    /\bvlm[_-]?sidecar\b/i,
    /\/client\/vlm/i,
    /\bcloudProviderApiCalled\s*:\s*true\b/,
    /\bruntimeVlmCallPerformed\s*:\s*true\b/,
    /\.(gguf|safetensors|ggml|ckpt)\b/i,
  ];
  const hits = [];
  for (const file of files) {
    const text = readText(file);
    for (const pattern of forbidden) {
      if (pattern.test(text)) hits.push(`${file}: ${pattern}`);
    }
  }
  assert(hits.length === 0, `forbidden S06 artifact token(s) found:\n${hits.join("\n")}`);
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    item.fn();
    pass += 1;
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log("== VLM evaluation harness summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runHarness(extraArgs) {
  const output = execFileSync(process.execPath, [
    path.join(rootDir, "scripts/internal/evaluate_vlm_harness.mjs"),
    "--fixture",
    fixturePath,
    ...extraArgs,
  ], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(output);
}

function gitLsFiles(pathspecs) {
  return execFileSync("git", ["ls-files", "--others", "--cached", "--exclude-standard", "--", ...pathspecs], {
    cwd: rootDir,
    encoding: "utf8",
  }).split(/\r?\n/).filter(Boolean);
}

function isBinaryPath(file) {
  return /\.(png|jpe?g|gif|mp4|mov|onnx|pyc|zip|tar|gz)$/i.test(file);
}

function osTmp() {
  return process.env.TMPDIR || "/tmp";
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
