#!/usr/bin/env node
// 파일 용도: V210-S06 VLM evaluation result workflow의 Ops UI/API/profile draft 경계를 검증한다.

import fs from "node:fs";
import process from "node:process";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM evaluation result workflow verification

Usage:
  ./server.sh verify-vlm-evaluation-result-workflow

Checks:
  - fixture records actual primary/fallback/excluded evaluation candidates for V210-S06.
  - /ops/api/vlm/evaluation-results returns an Ops-only workflow payload.
  - /ops/vlm renders evaluation result rows and can copy a candidate into the profile draft.
  - profile draft stores only evaluation summary metadata and does not auto-save, auto-activate, call runtime/provider, write sidecar, or change external payload schemas.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const fixture = readJson("test/fixtures/vlm_evaluation_result_workflow/cases.json");
const server = readText("src/ingress/webrtc_http_server.cpp");
const pageScript = readText("src/ingress/product_ui_page_scripts.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const profileVerifier = readText("scripts/internal/verify_vlm_profile_storage.mjs");
const recommendationVerifier = readText("scripts/internal/verify_vlm_recommendation_engine.mjs");
const eventPost = readText("src/analysis/event_post_dispatcher.cpp");
const serverSh = readText("server.sh");

check("fixture defines primary, fallback, excluded candidates and non-side-effect invariants", () => {
  assert(fixture.schema === "media-server.vlm-evaluation-result-workflow-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V210-S06", "fixture targetStep mismatch");
  assert(fixture.selection?.primaryCandidateId === "eval-qwen8b-event-review-default", "primary candidate mismatch");
  assert(fixture.selection?.fallbackCandidateId === "eval-qwen4b-false-positive-review", "fallback candidate mismatch");
  assert((fixture.selection?.excludedCandidateIds || []).includes("eval-qwen4b-operator-question-review"), "excluded candidate missing");
  const candidates = fixture.candidates || [];
  assert(candidates.length === 3, "expected three profile candidates");
  for (const candidate of candidates) {
    for (const axis of ["latency", "jsonStability", "explanationQuality", "hallucinationRisk", "languageQuality"]) {
      assert(candidate.qualityAxes?.[axis], `${candidate.id}: missing quality axis ${axis}`);
    }
  }
  for (const [key, value] of Object.entries(fixture.contractInvariants || {})) {
    assert(value === false, `contract invariant must be false: ${key}`);
  }
});

check("Ops evaluation result API and page markup are wired", () => {
  for (const snippet of [
    "OpsVlmEvaluationResultWorkflowJson",
    "/ops/api/vlm/evaluation-results",
    "media-server.ops.vlm-evaluation-result-workflow.v1",
    "ready-for-operator-selection",
    "eval-qwen8b-event-review-default",
    "eval-qwen4b-false-positive-review",
    "eval-qwen4b-operator-question-review",
  ]) {
    assertIncludes(server, snippet, "server");
  }
  for (const snippet of [
    'data-testid="ops-vlm-evaluation-result-workflow"',
    'data-vlm-evaluation-workflow="fixture-result-profile-selection"',
    'id="opsVlmEvaluationRows"',
    'id="opsVlmEvaluationSelectionSummary"',
    "latency, JSON 안정성, 설명 품질, hallucination risk, 한국어/영어 품질",
  ]) {
    assertIncludes(server, snippet, "Ops VLM page markup");
  }
});

check("Ops VLM script copies evaluation candidates into profile drafts without auto activation", () => {
  for (const snippet of [
    "opsVlmEvaluationPayload",
    "opsVlmSelectedEvaluationCandidateId",
    "refreshOpsVlmEvaluationResults",
    "renderOpsVlmEvaluationResults",
    "applyOpsVlmEvaluationCandidate",
    "data-vlm-evaluation-candidate-id",
    "profile draft 반영",
    "v210-s06-evaluation-result-workflow",
    "workflowSchema",
    "candidateId",
    "caseIds",
    "score",
  ]) {
    assertIncludes(pageScript, snippet, "Ops VLM script");
  }
  assert(pageScript.includes("enabled.checked = candidate.selection?.enabledDefault === true"),
    "candidate selection must not force enabled=true");
  assert(pageScript.includes("activation.value = candidate.selection?.activationDefault || 'pending-evaluation'"),
    "candidate selection must use activation default");
});

check("existing VLM profile and recommendation gates remain connected", () => {
  assertIncludes(profileVerifier, "evaluation.status", "profile storage verifier");
  assertIncludes(recommendationVerifier, "Qwen/Qwen3-VL-8B-Instruct", "recommendation verifier");
  for (const snippet of [
    'data-testid="ops-vlm-evaluation-result-workflow"',
    "/ops/api/vlm/evaluation-results",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops client UI smoke");
  }
});

check("docs, inventory, server command, and script inventory are wired", () => {
  const docs = [
    readText("docs/vlm-evaluation-result-workflow.md"),
    readText("docs/README.md"),
    readText("docs/development-backlog.md"),
    readText("docs/project-feature-test-inventory.md"),
  ].join("\n");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  for (const snippet of [
    "V210-S06",
    "verify-vlm-evaluation-result-workflow",
    "media-server.ops.vlm-evaluation-result-workflow.v1",
    "eval-qwen8b-event-review-default",
    "fallback",
    "invalid JSON",
  ]) {
    assertIncludes(docs, snippet, `docs snippet ${snippet}`);
  }
  assertIncludes(serverSh, "verify-vlm-evaluation-result-workflow", "server.sh");
  assertIncludes(serverSh, "verify_vlm_evaluation_result_workflow.mjs", "server.sh");
  assertIncludes(scriptInventory, "verify_vlm_evaluation_result_workflow.mjs", "script inventory");
});

check("S06 workflow does not touch Event POST or client/viewer VLM exposure", () => {
  assert(!eventPost.includes("vlm-evaluation-result-workflow"), "Event POST dispatcher must not mention evaluation workflow");
  const clientStart = server.indexOf("void AppendClientEventItemJson");
  const clientEnd = server.indexOf("std::string OpsVlmProfilesJson");
  const clientRegion = clientStart >= 0 && clientEnd > clientStart
    ? server.slice(clientStart, clientEnd)
    : "";
  assert(clientRegion.length > 0, "client region not found");
  for (const forbidden of [
    "ops-vlm-evaluation-result-workflow",
    "media-server.ops.vlm-evaluation-result-workflow.v1",
    "/ops/api/vlm/evaluation-results",
  ]) {
    assert(!clientRegion.includes(forbidden), `client/viewer region exposes ${forbidden}`);
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
console.log("== VLM evaluation result workflow summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function readText(path) {
  return fs.readFileSync(path, "utf8");
}
