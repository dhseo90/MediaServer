#!/usr/bin/env node
// 파일 용도: V200-S08 VLMObservation sidecar 저장소와 EventRecord 상관 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM observation sidecar verification

Usage:
  ./server.sh verify-vlm-observation-sidecar

Checks:
  - media-server.vlm-observation.v1 fixture has eventId correlation and redaction fields.
  - C++ store/query/correlation report exists outside EventRecord serialization.
  - analysis-state smoke executes side storage and payload drift checks.
  - docs, inventory, server command, and script inventory are wired.
  - S08 does not add provider calls, client exposure, Event/WebRTC/SSE/WS schema changes, or media path changes.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("fixture defines V200-S08 observation schema and correlation boundary", () => {
  const fixture = readJson("test/fixtures/vlm_observation_store/observations.json");
  assert(fixture.schema === "media-server.vlm-observation-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V200-S08", "fixture target step mismatch");
  assert(Array.isArray(fixture.cases) && fixture.cases.length >= 1, "fixture needs at least one case");
  for (const item of fixture.cases) {
    assert(item.eventRecord?.schema === "media-server.va.event-record.v1", `${item.id}: missing EventRecord schema`);
    assert(item.observation?.schema === "media-server.vlm-observation.v1", `${item.id}: missing observation schema`);
    assert(item.eventRecord.eventId === item.observation.eventId, `${item.id}: eventId correlation mismatch`);
    assert(item.observation.inputEvidenceRefs?.schema === "media-server.vlm-event-evidence-refs.v1", `${item.id}: missing evidence refs`);
    assert(item.observation.storageScope === "vlm-observation-store-only", `${item.id}: storage scope mismatch`);
    for (const [key, value] of Object.entries(item.observation.redactionReview || {})) {
      assert(value === false, `${item.id}: redactionReview.${key} must be false`);
    }
    for (const [key, value] of Object.entries(item.observation.contractInvariants || {})) {
      assert(value === false, `${item.id}: contractInvariants.${key} must be false`);
    }
    for (const field of ["eventExplanation", "falsePositiveHints", "operatorReviewQuestions", "provider", "model"]) {
      assert(!(field in item.eventRecord), `${item.id}: EventRecord must not contain observation field ${field}`);
    }
  }
});

check("C++ observation store/query/correlation report is wired without EventRecord top-level expansion", () => {
  const header = readText("include/analysis/vlm_observation_store.h");
  const source = readText("src/analysis/vlm_observation_store.cpp");
  const eventStorage = readText("src/analysis/event_storage.cpp");
  const cmake = readText("CMakeLists.txt");
  for (const snippet of [
    "VlmObservationSidecar",
    "FileVlmObservationStore",
    "DefaultVlmObservationStorePath",
    "QueryVlmObservations",
    "BuildVlmObservationCorrelationReportJson",
    "media-server.vlm-observation.v1",
    "media-server.vlm-observation-correlation-report.v1",
    "vlm-observation-store-only",
    "rawPromptStored",
    "rawResponseStored",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assert(header.includes(snippet) || source.includes(snippet), `observation store missing snippet: ${snippet}`);
  }
  assert(cmake.includes("src/analysis/vlm_observation_store.cpp"), "CMake missing observation store source");
  for (const forbidden of [
    "\"vlmObservation\"",
    "\"vlmObservationPath\"",
    "\"vlmSummary\"",
    "\"eventExplanation\"",
    "\"falsePositiveHints\"",
    "\"operatorReviewQuestions\"",
  ]) {
    assert(!eventStorage.includes(forbidden), `EventRecord serialization must not add top-level ${forbidden}`);
  }
});

check("analysis state smoke verifies side storage, eventId correlation, and payload boundary", () => {
  const smoke = readText("scripts/internal/analysis_state_smoke.cpp");
  const smokeBuild = readText("scripts/internal/verify_analysis_state_smoke.sh");
  for (const snippet of [
    "VerifyVlmObservationStore",
    "FileVlmObservationStore",
    "QueryVlmObservations",
    "BuildVlmObservationCorrelationReportJson",
    "VLM observation store writes side storage",
    "VLM observation query correlates EventRecord by eventId",
    "VLM observation correlation report preserves event payload boundary",
    "externalPayloadChanged",
    "eventRecordTopLevelObservationFieldsPresent",
  ]) {
    assert(smoke.includes(snippet), `analysis state smoke missing snippet: ${snippet}`);
  }
  assert(smokeBuild.includes("src/analysis/vlm_observation_store.cpp"),
    "analysis state smoke build script missing observation store source");
});

check("docs, inventory, stream verification, server command, and script inventory are wired", () => {
  const docs = [
    readText("docs/vlm-observation-sidecar.md"),
    readText("docs/README.md"),
    readText("docs/stream-verification.md"),
    readText("docs/development-backlog.md"),
    readText("docs/project-feature-test-inventory.md"),
  ].join("\n");
  const server = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  for (const snippet of [
    "V200-S08",
    "media-server.vlm-observation.v1",
    "media-server.vlm-observation-correlation-report.v1",
    "verify-vlm-observation-sidecar",
    "EventRecord correlation",
    "LAB-040",
  ]) {
    assert(docs.includes(snippet), `docs/inventory missing snippet: ${snippet}`);
  }
  assert(server.includes("verify-vlm-observation-sidecar"), "server command missing S08 verifier");
  assert(server.includes("verify_vlm_observation_sidecar.mjs"), "server dispatch missing S08 verifier script");
  assert(scriptInventory.includes("verify_vlm_observation_sidecar.mjs"), "script inventory missing S08 verifier");
  assert(coverage.includes("verify-vlm-observation-sidecar"), "coverage verifier missing S08 command");
});

check("S08 remains storage-only and does not introduce provider/client/schema/media artifacts", () => {
  const files = [
    "include/analysis/vlm_observation_store.h",
    "src/analysis/vlm_observation_store.cpp",
    "scripts/internal/analysis_state_smoke.cpp",
    "docs/vlm-observation-sidecar.md",
    "test/fixtures/vlm_observation_store/observations.json",
  ];
  const forbidden = [
    /\bcloudProviderApiCalled\s*:\s*true\b/,
    /\bruntimeVlmCallPerformed\s*:\s*true\b/,
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
  assert(hits.length === 0, `forbidden S08 artifact token(s) found:\n${hits.join("\n")}`);
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
console.log("== VLM observation sidecar summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
