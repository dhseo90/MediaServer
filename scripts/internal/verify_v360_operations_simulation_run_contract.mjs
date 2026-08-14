#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";
// 파일 용도: v3.6.0 Step 3 Operations Simulation Run Contract 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.6.0 Operations Simulation Run Contract verification

Usage:
  ./server.sh verify-v360-operations-simulation-run-contract

Checks:
  - /ops/api/live-operations/simulation/run-contract exposes read-only simulation run schema
  - result envelope and simulation/* route family are defined
  - simulation run remains not-run until explicitly evaluated by read-only dry-run endpoints
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v360-operations-simulation-run-contract";
const schema = "media-server.ops.v360-simulation-run-contract.v1";
const route = "/ops/api/live-operations/simulation/run-contract";
const files = loadFiles();
const checks = [];

check("Ops server builds the v3.6 simulation run contract and result envelope", () => {
  for (const snippet of [
    "struct OpsV360SimulationRunContract",
    "struct OpsV360SimulationResultEnvelope",
    "BuildV360SimulationRunContract",
    "BuildV360SimulationResultEnvelope",
    "AppendV360SimulationRunContractJson",
    "AppendV360SimulationResultEnvelopeJson",
    "OpsV360OperationsSimulationRunContractJson",
    schema,
    "simulationRunSchema",
    "simulationResultEnvelope",
    "simulationRunId",
    "simulationRouteFamily",
    "inputPackRoute",
    "resultStatus",
    "not-run",
  ]) {
    assertIncludes(files.server, snippet, "v360 simulation run server model");
  }
});

check("simulation run contract lists the simulation route family", () => {
  const block = extractBlock(files.server, "struct OpsV360SimulationRunContract", "std::string OpsV360OperationsSimulationRunContractJson");
  for (const snippet of [
    "/ops/api/live-operations/simulation/input-pack",
    "/ops/api/live-operations/simulation/run-contract",
    "/ops/api/live-operations/simulation/command-plan-dry-run",
    "/ops/api/live-operations/simulation/impact-diff",
    "/ops/api/live-operations/simulation/safe-apply-readiness",
    "ready",
    "blocked",
    "approval-needed",
    "field-needed",
    "not-run",
  ]) {
    assertIncludes(block, snippet, "v360 simulation route family");
  }
});

check("simulation run contract preserves read-only no-run boundaries", () => {
  const block = extractBlock(files.server, "std::string OpsV360OperationsSimulationRunContractJson", "struct OpsV360CommandPlanDryRunResult");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "simulationRunPersisted",
    "simulationRunExecuted",
    "resultEnvelopePersisted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "commandPlanExecuted",
    "automaticApplyPerformed",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    assertIncludes(block, snippet, "v360 simulation run boundary flags");
  }
  for (const flag of [
    "simulationRunPersisted",
    "simulationRunExecuted",
    "resultEnvelopePersisted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "commandPlanExecuted",
    "automaticApplyPerformed",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    assertFlagFalse(block, flag);
  }
});

check("Ops API exposes the simulation run route as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "simulation run route");
  assertIncludes(block, "request.method == \"GET\"", "simulation run route");
  assertIncludes(block, "require_ops_principal()", "simulation run route");
  assertIncludes(block, "OpsV360OperationsSimulationRunContractJson(", "simulation run route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "simulation run route");
  assertIncludes(block, "Cache-Control", "simulation run route");
  assertIncludes(block, "no-store", "simulation run route");
});

check("docs and inventory map v3.6 Step 3", () => {
  assertDocs("3", "Operations Simulation Run Contract", "OPS-117", "SAFE-150", command, route);
  for (const snippet of [
    "LAB-095 | V360 Step 3 simulation run schema/envelope",
    "SAFE-150 | V360 Step 3 simulation run no-execution boundary",
    "OPS-117 | V360 Step 3 Operations Simulation Run Contract 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.6 Step 3");
  }
});

check("server entrypoint and inventory verifiers include v3.6 Step 3", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v360_operations_simulation_run_contract.mjs", "server.sh script dispatch");
  for (const id of ["LAB-095", "SAFE-150", "OPS-117"]) assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  for (const id of ["LAB-095", "SAFE-150", "OPS-117"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v360_operations_simulation_run_contract.mjs", "script inventory");
});

finish("== v3.6.0 operations simulation run contract summary ==", { schema, step: "v3.6.0 (3)", route });

function assertDocs(step, title, opsId, safeId, verifier, routeValue) {
  for (const snippet of [
    `| ${step} | v3.6.0 (${step}) ${title} | P0 | 완료 |`,
    `## v3.6.0 Step ${step} 개발 기록`,
    routeValue,
    `\`./server.sh ${verifier}\``,
  ]) assertIncludes(files.backlog, snippet, `backlog v3.6 Step ${step}`);
  assertIncludes(files.streamVerification, `| v3.6.0 (${step}) | \`./server.sh ${verifier}\` | ${title}.`, `stream verification v3.6 Step ${step}`);
  assertIncludes(files.featureInventory, `v3.6.0 (${step}) ${title}`, `feature inventory v3.6 Step ${step}`);
  assertIncludes(files.featureInventory, `\`${opsId}\``, `feature inventory ${opsId}`);
  assertIncludes(files.featureInventory, `\`${safeId}\``, `feature inventory ${safeId}`);
  assertIncludes(files.releaseRecords, `V360 ${title}`, `release records v3.6 Step ${step}`);
  assertIncludes(files.releaseRecords, `\`./server.sh ${verifier}\``, `release records v3.6 Step ${step}`);
}

function loadFiles() {
  return {
    server: readWebRtcHttpServerBundle(readText),
    backlog: readText("docs/development-backlog.md"),
    streamVerification: readText("docs/stream-verification.md"),
    featureInventory: readText("docs/project-feature-test-inventory.md"),
    featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
    implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
    projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
    scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
    releaseRecords: readText("docs/release-test-records.md"),
    serverSh: readText("server.sh"),
  };
}

function extractRouteBlock(text, routeNeedle) {
  const start = text.indexOf(`request.path == "${routeNeedle}"`);
  assert(start >= 0, `missing route: ${routeNeedle}`);
  const next = text.indexOf("\n                        if (request.path == ", start + 1);
  return text.slice(start, next >= 0 ? next : start + 2200);
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}

function assertFlagFalse(text, flag) {
  const index = text.indexOf(flag);
  assert(index >= 0, `missing boundary flag: ${flag}`);
  assert(text.slice(index, index + 128).includes("false"), `boundary flag must be false: ${flag}`);
}

function finish(title, summary) {
  check("SAFE-150 canonical simulation run no-execution boundary", () => {
    const block = extractCppFunctionBlock(files.server, "std::string OpsV360OperationsSimulationRunContractJson(");
    const routeObserved = files.server.includes("/ops/api/live-operations/simulation/run-contract");
    const safe150BoundaryObserved = block.includes("BuildV360SimulationRunContract") && block.includes("BuildV360SimulationResultEnvelope");
    const simulationRunPersisted = /\\\"simulationRunPersisted\\\":true/.test(block);
    const simulationRunExecuted = /\\\"simulationRunExecuted\\\":true/.test(block);
    const resultEnvelopePersisted = /\\\"resultEnvelopePersisted\\\":true/.test(block);
    const automaticApplyPerformed = /\\\"automaticApplyPerformed\\\":true/.test(block);
    assert(routeObserved && safe150BoundaryObserved && block.includes("media-server.ops.v360-simulation-run-contract.v1") && simulationRunPersisted === false && simulationRunExecuted === false && resultEnvelopePersisted === false && automaticApplyPerformed === false,
      "SAFE-150 BuildV360SimulationRunContract simulationRunPersisted simulationRunExecuted resultEnvelopePersisted automaticApplyPerformed must remain false");
  });

  const results = runChecks();
  console.log("");
  console.log(title);
  for (const [key, value] of Object.entries(summary)) console.log(`- ${key}: ${value}`);
  console.log("- uiFulltest: not-run-by-this-command");
  console.log("- longrun30Or120: not-run-by-this-command");
  console.log(`- pass: ${results.pass}`);
  console.log(`- fail: ${results.fail}`);
  if (results.fail > 0) process.exit(1);
}

function runChecks() {
  let pass = 0, fail = 0;
  for (const item of checks) {
    try { item.fn(); pass += 1; console.log(`[pass] ${item.name}`); }
    catch (error) { fail += 1; console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  return { pass, fail };
}
function check(name, fn) { checks.push({ name, fn }); }
function readText(relativePath) { return fs.readFileSync(path.join(rootDir, relativePath), "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function assertIncludes(text, snippet, label) { assert(text.includes(snippet), `${label} missing snippet: ${snippet}`); }
