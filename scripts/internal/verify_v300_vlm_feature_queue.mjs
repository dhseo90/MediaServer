#!/usr/bin/env node
// 파일 용도: v3.0.0 S04 VLM Feature Queue 구현, fixture, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {validateFeatureDocumentation} from "./documentation_contract_lib.mjs";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.0.0 VLM Feature Queue verification

Usage:
  ./server.sh verify-v300-vlm-feature-queue

Checks:
  - V300-S04 fixture covers background queue, lazy trigger, missing-runtime, timeout, and invalid-output cases
  - analysis/vlm_feature_queue implements bounded queue outcomes and FeatureSet revision output without raw prompt/response retention
  - analysis-state smoke includes the S04 queue behavior
  - 현재 계약 문서의 식별자·기능 ID·검증 명령·server dispatch 연결 (과거 실행 기록 제외)
  - PASS is limited to V300-S04 queue contract evidence and does not imply real provider success, search UI, longrun, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v300-vlm-feature-queue";
const fixturePath = "test/fixtures/v300_vlm_feature_queue/cases.json";
const files = {
  header: readText("include/analysis/vlm_feature_queue.h"),
  source: readText("src/analysis/vlm_feature_queue.cpp"),
  smoke: readText("scripts/internal/analysis_state_smoke.cpp"),
  smokeBuild: readText("scripts/internal/verify_analysis_state_smoke.sh"),
  policy: readText("docs/v300-vlm-feature-queue.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  server: readText("server.sh"),
  cmake: readText("CMakeLists.txt"),
};
const fixture = JSON.parse(readText(fixturePath));
const checks = [];

check("fixture covers V300-S04 feature queue outcome matrix", () => {
  assert(fixture.schema === "media-server.v300-vlm-feature-queue-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V300-S04", "fixture targetStep mismatch");
  const ids = new Set((fixture.cases || []).map(item => item.id));
  for (const id of [
    "background-queue-feature-revision",
    "lazy-trigger-feature-revision",
    "missing-runtime-vlm-only",
    "queue-timeout-drop-vlm-only",
    "invalid-output-discarded",
  ]) {
    assert(ids.has(id), `fixture missing case: ${id}`);
  }
  for (const item of fixture.cases || []) {
    assert(item.expected?.status, `${item.id}: expected status missing`);
    assert(item.contractInvariants?.runtimeProviderCallPerformed === false, `${item.id}: provider call must be false`);
    assert(item.contractInvariants?.eventRecordBlocked === false, `${item.id}: EventRecord must not be blocked`);
    assert(item.contractInvariants?.mediaPathBlocked === false, `${item.id}: media path must not be blocked`);
    assert(item.contractInvariants?.rawPromptStored === false, `${item.id}: raw prompt must not be stored`);
    assert(item.contractInvariants?.rawProviderResponseStored === false, `${item.id}: raw response must not be stored`);
  }
});

check("analysis module exposes bounded background and lazy queue contract", () => {
  const completeTaskBlock = extractCppFunctionBlock(files.source, "VlmFeatureQueueOutcome CompleteTask(");
  const makeOutcomeBlock = extractCppFunctionBlock(files.source, "VlmFeatureQueueOutcome MakeOutcome(");
  const opsEventsUiAdded = completeTaskBlock.includes("/ops/events");
  const providerCallPerformed = makeOutcomeBlock.includes("providerCallPerformed");
  assert(completeTaskBlock.includes("feature_set_stored") && opsEventsUiAdded === false && providerCallPerformed === false, "LAB-084 queue feature_set_stored must not add /ops/events UI or provider calls");
  for (const snippet of [
    "struct VlmFeatureQueueTask",
    "struct VlmFeatureQueueOutcome",
    "class VlmFeatureQueue",
    "EnqueueBackgroundTask",
    "RunLazyTask",
    "RunNext",
    "BuildVlmFeatureSetFixtureJson",
    "media-server.vlm-feature-queue-outcome.v1",
    "media-server.event-feature-set.v1",
    "missing-runtime",
    "queue-timeout",
    "invalid-output",
    "drop-vlm-task",
    "discard-invalid-output",
  ]) {
    assert(files.header.includes(snippet) || files.source.includes(snippet), `queue module missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "rawPromptStored",
    "rawProviderResponseStored",
    "identityFeaturesAllowed",
    "raw_prompt_stored = false",
    "raw_provider_response_stored = false",
    "media_path_blocked = false",
    "event_record_blocked = false",
    "metadata_fanout_blocked = false",
    "event_post_dispatch_blocked = false",
  ]) {
    assert(files.source.includes(snippet), `queue source missing invariant: ${snippet}`);
  }
});

check("analysis-state smoke verifies S04 behavior and build links module", () => {
  for (const snippet of [
    "VerifyV300VlmFeatureQueue",
    "V300 S04 background feature queue enqueues evidence tasks",
    "V300 S04 queue worker stores structured FeatureSet revision",
    "V300 S04 lazy trigger runs without default-on provider behavior",
    "V300 S04 missing-runtime stays VLM-only",
    "V300 S04 timeout drops VLM task without media backpressure",
    "V300 S04 invalid output is discarded without FeatureSet retention",
  ]) {
    assert(files.smoke.includes(snippet), `analysis_state_smoke missing S04 snippet: ${snippet}`);
  }
  assert(files.smokeBuild.includes("src/analysis/vlm_feature_queue.cpp"), "analysis smoke build missing vlm_feature_queue.cpp");
  assert(files.cmake.includes("src/analysis/vlm_feature_queue.cpp"), "CMake missing vlm_feature_queue.cpp");
});

check("현재 계약 문서와 기능별 검증 연결", () => {
  const errors = validateFeatureDocumentation({
    document: files.policy, identifiers: ["VlmFeatureQueue","background","lazy","missing-runtime","queue-timeout","invalid-output","media-server.vlm-feature-queue-outcome.v1","mediaPathBlocked","rawPromptStored","runtimeProviderCallPerformed"],
    command, script: "verify_v300_vlm_feature_queue.mjs", featureIds: ["LAB-084","SAFE-086","OPS-054"],
    inventory: files.featureInventory, verification: files.streamVerification,
    server: files.server,
  });
  assert(errors.length === 0, errors.join("; "));
});


check("server entrypoint and inventory verifiers include V300-S04 command", () => {
  assert(files.server.includes(command), "server.sh missing V300-S04 command");
  assert(files.server.includes("verify_v300_vlm_feature_queue.mjs"), "server.sh missing V300-S04 script dispatch");
  for (const id of ["LAB-002", "LAB-006", "LAB-017", "LAB-018", "LAB-019", "LAB-025", "LAB-084", "SAFE-086", "OPS-054"]) {
    // 기존 Lab API 항목은 독립 API 검증, 큐 자체의 세 항목은 이 명령에 연결된다.
    const expected = ["LAB-084", "SAFE-086", "OPS-054"].includes(id) ? command : "verify-v390-review4-lab-core-api";
    const entries = files.implementationManifest.items.filter(item => item.id === id);
    assert(entries.length === 1 && entries[0].verifierEvidence?.command === expected, `${id} manifest verifier command drift`);
  }
  assert(files.featureCoverageVerifier.includes("validateImplementationManifest") && files.featureCoverageVerifier.includes("verifierEvidenceRows"), "feature coverage must validate manifest-backed verifier evidence");
  assert(files.projectInventoryVerifier.includes("LAB-084") &&
    files.projectInventoryVerifier.includes("SAFE-086") &&
    files.projectInventoryVerifier.includes("OPS-054"), "project inventory verifier missing V300-S04 IDs");
  assert(files.scriptInventory.includes("verify_v300_vlm_feature_queue.mjs"), "script inventory missing V300-S04 verifier");
});

check("SAFE-086 canonical VLM queue isolation boundary", () => {
  const invalidOutputDiscarded = files.source.includes("discard-invalid-output");
  const rawMaterialStored = files.source.includes("raw_prompt_stored = true") || files.source.includes("raw_provider_response_stored = true");
  const vlmQueueIsolationInputsObserved = invalidOutputDiscarded && rawMaterialStored === false;
  const safe086BoundaryObserved = vlmQueueIsolationInputsObserved && files.source.includes("webrtc_data_channel_schema_changed = false");
  assert(safe086BoundaryObserved && rawMaterialStored === false,
    "verify-v300-vlm-feature-queue discard-invalid-output raw material must remain absent from WebRTC/SSE state");
});

const results = runChecks();
console.log("");
console.log("== v3.0.0 VLM feature queue summary ==");
console.log("- schema: media-server.v300-vlm-feature-queue-fixtures.v1");
console.log("- step: V300-S04");
console.log(`- fixture: ${fixturePath}`);
console.log("- backgroundQueue: fixture-and-analysis-smoke");
console.log("- lazyTrigger: fixture-and-analysis-smoke");
console.log("- missingRuntime: vlm-only-failure");
console.log("- queueTimeout: drop-vlm-task");
console.log("- invalidOutput: discard-invalid-output");
console.log("- providerRuntimeCall: not-run-by-this-command");
console.log("- searchDslOrOpsEventsUi: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function runChecks() {
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
  return { pass, fail };
}

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
