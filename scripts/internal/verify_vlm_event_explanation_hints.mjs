#!/usr/bin/env node
// 파일 용도: V200-S09 이벤트 설명/오탐 힌트 생성기와 JSON 안정성, 문서 연결을 검증한다.

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
  printUsageAndExit(`VLM event explanation verification

Usage:
  ./server.sh verify-vlm-event-explanation-hints

Checks:
  - fixture covers event explanation, object/area relation, false-positive hint, and operator question cases.
  - generate-vlm-event-explanation emits media-server.vlm-event-explanation-report.v1 deterministically.
  - JSON output is stable across repeated fixture runs.
  - docs, inventory, server command, and script inventory are wired.
  - S09 does not add runtime/provider calls, client exposure, external payload/schema changes, media path changes, or auto rule apply.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const fixturePath = "test/fixtures/vlm_event_explanation/cases.json";

check("fixture defines V200-S09 explanation/hint/operator question cases", () => {
  const fixture = readJson(fixturePath);
  assert(fixture.schema === "media-server.vlm-event-explanation-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V200-S09", "fixture target step mismatch");
  assert(Array.isArray(fixture.cases) && fixture.cases.length >= 3, "fixture needs person, vehicle, and area cases");
  const serialized = JSON.stringify(fixture);
  for (const snippet of ["line-crossing", "zone-dwell", "restricted-zone", "사람", "차량", "operatorReviewQuestions"]) {
    assert(serialized.includes(snippet), `fixture missing required coverage snippet: ${snippet}`);
  }
  for (const item of fixture.cases) {
    for (const key of ["previousFrame", "eventFrame", "nextFrame", "bboxCrop"]) {
      assert(item.evidenceRefs?.[key], `${item.id}: missing evidenceRefs.${key}`);
    }
    assert(Array.isArray(item.relations) && item.relations.length >= 1, `${item.id}: relation fixture missing`);
    assert(Array.isArray(item.falsePositiveFactors) && item.falsePositiveFactors.length >= 1, `${item.id}: false-positive hints missing`);
    assert(Array.isArray(item.operatorReviewQuestions) && item.operatorReviewQuestions.length >= 1, `${item.id}: operator questions missing`);
    assert(Array.isArray(item.expected?.requiredTerms) && item.expected.requiredTerms.length >= 3, `${item.id}: required terms missing`);
  }
});

check("generator emits S09 report with explanation schema, hints, questions, and invariants", () => {
  const output = runGenerator([]);
  assert(output.schema === "media-server.vlm-event-explanation-report.v1", "report schema mismatch");
  assert(output.targetStep === "V200-S09", "target step mismatch");
  assert(output.status === "passed", "fixture cases should pass");
  assert(output.summary.cases === 3, "expected three fixture cases");
  assert(output.jsonStability?.stable === true, "report must mark deterministic JSON stability");
  assert(Object.values(output.contractInvariants || {}).every(value => value === false), "top-level invariants must remain false");
  for (const item of output.cases) {
    const explanation = item.explanation;
    assert(explanation.schema === "media-server.vlm-event-explanation.v1", `${item.id}: explanation schema mismatch`);
    for (const field of ["summary", "eventExplanation", "provider", "model", "privacyMode", "createdAt"]) {
      assert(explanation[field], `${item.id}: missing explanation.${field}`);
    }
    assert(explanation.eventId === item.eventId, `${item.id}: event id mismatch`);
    assert(explanation.objectAreaRelations.length >= 1, `${item.id}: object/area relations missing`);
    assert(explanation.falsePositiveHints.length >= 1, `${item.id}: false-positive hints missing`);
    assert(explanation.operatorReviewQuestions.length >= 1, `${item.id}: operator questions missing`);
    assert(item.validation.passed === true, `${item.id}: validation did not pass`);
    assert(item.validation.evidenceComplete === true, `${item.id}: evidence refs incomplete`);
    assert(item.validation.redactionClean === true, `${item.id}: redaction review not clean`);
    assert(item.validation.invariantsClean === true, `${item.id}: contract invariants not clean`);
  }
});

check("generator output is byte-stable across repeated runs and supports filtered reports", () => {
  const first = runGeneratorText([]);
  const second = runGeneratorText([]);
  assert(first === second, "generator JSON output changed between identical runs");
  const tmpDir = fs.mkdtempSync(path.join(osTmp(), "media_server_vlm_explain_"));
  const jsonOut = path.join(tmpDir, "report.json");
  const mdOut = path.join(tmpDir, "report.md");
  const filtered = runGenerator(["--case", "line-crossing-person-ko", "--json-output", jsonOut, "--report", mdOut]);
  assert(filtered.summary.cases === 1, "case filter should emit one case");
  assert(fs.existsSync(jsonOut), "json report not written");
  assert(fs.existsSync(mdOut), "markdown report not written");
  const markdown = fs.readFileSync(mdOut, "utf8");
  assert(markdown.includes("VLM Event Explanation Report"), "markdown report title missing");
  assert(markdown.includes("runtimeVlmCallPerformed: false"), "markdown report missing invariant");
});

check("docs, inventory, stream verification, server command, and script inventory are wired", () => {
  const docs = [
    readText("docs/vlm-event-explanation-hints.md"),
    readText("docs/README.md"),
    readText("docs/stream-verification.md"),
    readText("docs/development-backlog.md"),
    readText("docs/project-feature-test-inventory.md"),
  ].join("\n");
  const server = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  for (const snippet of [
    "V200-S09",
    "media-server.vlm-event-explanation-report.v1",
    "media-server.vlm-event-explanation.v1",
    "generate-vlm-event-explanation",
    "verify-vlm-event-explanation-hints",
    "falsePositiveHints",
    "operatorReviewQuestions",
    "JSON stability",
    "LAB-041",
  ]) {
    assert(docs.includes(snippet), `docs/inventory missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "generate-vlm-event-explanation",
    "generate_vlm_event_explanation.mjs",
    "verify-vlm-event-explanation-hints",
    "verify_vlm_event_explanation_hints.mjs",
  ]) {
    assert(server.includes(snippet), `server.sh missing snippet: ${snippet}`);
  }
  assert(scriptInventory.includes("generate_vlm_event_explanation.mjs"), "script inventory missing S09 generator");
  assert(scriptInventory.includes("verify_vlm_event_explanation_hints.mjs"), "script inventory missing S09 verifier");
  assert(coverage.includes("verify-vlm-event-explanation-hints"), "coverage verifier missing S09 command");
});

check("S09 remains fixture-generation only and preserves external/schema/media boundaries", () => {
  const files = [
    "scripts/internal/generate_vlm_event_explanation.mjs",
    "docs/vlm-event-explanation-hints.md",
    "test/fixtures/vlm_event_explanation/cases.json",
  ];
  const forbidden = [
    /\bcloudProviderApiCalled\s*:\s*true\b/,
    /\bruntimeVlmCallPerformed\s*:\s*true\b/,
    /\bautoRuleApplied\s*:\s*true\b/,
    /\/client\/vlm/i,
    /Event POST payload 변경 완료/,
    /WebRTC DataChannel schema 변경 완료/,
    /SSE\/WS metadata schema 변경 완료/,
    /\.(gguf|safetensors|ggml|ckpt)\b/i,
  ];
  const hits = [];
  for (const file of files) {
    const text = readText(file);
    for (const pattern of forbidden) {
      if (pattern.test(text)) hits.push(`${file}: ${pattern}`);
    }
  }
  assert(hits.length === 0, `forbidden S09 artifact token(s) found:\n${hits.join("\n")}`);
  const eventStorage = readText("src/analysis/event_storage.cpp");
  for (const forbiddenField of ["\"eventExplanation\"", "\"falsePositiveHints\"", "\"operatorReviewQuestions\""]) {
    assert(!eventStorage.includes(forbiddenField), `EventRecord serialization must not add top-level ${forbiddenField}`);
  }
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
console.log("== VLM event explanation summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runGenerator(extraArgs) {
  return JSON.parse(runGeneratorText(extraArgs));
}

function runGeneratorText(extraArgs) {
  return execFileSync(process.execPath, [
    path.join(rootDir, "scripts/internal/generate_vlm_event_explanation.mjs"),
    "--fixture",
    fixturePath,
    ...extraArgs,
  ], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
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
