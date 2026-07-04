#!/usr/bin/env node
// 파일 용도: v3.6.0 Step 2 Simulation Input Contract 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.6.0 Simulation Input Contract verification

Usage:
  ./server.sh verify-v360-simulation-input-contract

Checks:
  - /ops/api/live-operations/simulation/input-pack exposes a read-only simulation input pack
  - EventRecord, SourceRegistry, PublishedView, command plan, and staged plan inputs are represented
  - no source/view/rule/EventRecord/Ops audit/client/media writes are performed
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v360-simulation-input-contract";
const schema = "media-server.ops.v360-simulation-input-pack.v1";
const route = "/ops/api/live-operations/simulation/input-pack";
const files = loadFiles();
const checks = [];

check("Ops server builds the v3.6 simulation input pack model", () => {
  for (const snippet of [
    "struct OpsV360SimulationInputPackItem",
    "struct OpsV360SimulationInputPackSummary",
    "BuildV360SimulationInputPackItems",
    "BuildV360SimulationInputPackSummary",
    "AppendV360SimulationInputPackItemJson",
    "OpsV360SimulationInputPackJson",
    schema,
    "simulationInputPackSummary",
    "simulationInputPackItems",
    "EventRecord",
    "SourceRegistry",
    "PublishedView",
    "commandPlan",
    "stagedPlan",
    "readOnlySimulationInputPack",
  ]) {
    assertIncludes(files.server, snippet, "v360 simulation input server model");
  }
});

check("simulation input pack derives from existing graph, command plan, and staged plan context", () => {
  const block = extractBlock(files.server, "struct OpsV360SimulationInputPackItem", "std::string OpsV360SimulationInputPackJson");
  for (const snippet of [
    "BuildV350LiveOperationsGraphContext",
    "BuildV350CommandPlanCandidates",
    "BuildV350StagedChangePlans",
    "eventRecordCount",
    "sourceRegistryCount",
    "publishedViewCount",
    "commandPlanCandidateCount",
    "stagedPlanCount",
    "sourceRoute",
    "includedFields",
  ]) {
    assertIncludes(block, snippet, "v360 simulation input derivation");
  }
});

check("simulation input pack preserves read-only boundaries", () => {
  const block = extractBlock(files.server, "std::string OpsV360SimulationInputPackJson", "struct OpsV360SimulationRunContract");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "readOnlySimulationInputPack",
    "simulationInputPersisted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "commandPlanExecuted",
    "stagedPlanApplied",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    assertIncludes(block, snippet, "v360 simulation input boundary flags");
  }
  for (const flag of [
    "simulationInputPersisted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "commandPlanExecuted",
    "stagedPlanApplied",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
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

check("Ops API exposes the input pack route as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "simulation input route");
  assertIncludes(block, "request.method == \"GET\"", "simulation input route");
  assertIncludes(block, "require_ops_principal()", "simulation input route");
  assertIncludes(block, "OpsV360SimulationInputPackJson(", "simulation input route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "simulation input route");
  assertIncludes(block, "Cache-Control", "simulation input route");
  assertIncludes(block, "no-store", "simulation input route");
  assert(!block.includes("require_source_write_principal"), "simulation input route must not require source writes");
});

check("docs and inventory map v3.6 Step 2", () => {
  for (const snippet of [
    "| 2 | v3.6.0 (2) Simulation Input Contract | P0 | 완료 |",
    "EventRecord, SourceRegistry, PublishedView, command plan, staged plan을 read-only simulation input pack으로 정의",
    "## v3.6.0 Step 2 개발 기록",
    route,
    "OpsV360SimulationInputPackJson",
    "`./server.sh verify-v360-simulation-input-contract`",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.6 Step 2");
  }
  for (const snippet of [
    `| v3.6.0 (2) | \`./server.sh ${command}\` | Simulation Input Contract.`,
    route,
    "read-only simulation input pack",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.6 Step 2");
  }
  for (const snippet of [
    `v3.6.0 (2) Simulation Input Contract | \`SRC-049\`, \`EVT-077\`, \`SAFE-149\`, \`OPS-116\` | \`${command}\``,
    "SRC-049 | V360 Step 2 SourceRegistry/PublishedView simulation input",
    "EVT-077 | V360 Step 2 EventRecord simulation input",
    "SAFE-149 | V360 Step 2 simulation input no-write boundary",
    "OPS-116 | V360 Step 2 Simulation Input Contract 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.6 Step 2");
  }
  for (const snippet of [
    "V360 Simulation Input Contract",
    `\`./server.sh ${command}\``,
    "v360 Step 2 RED simulation input gate",
    "v360 Step 2 simulation input final",
    "v360 Step 2 UI 풀테스트",
    "v360 Step 2 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.6 Step 2");
  }
});

check("server entrypoint and inventory verifiers include v3.6 Step 2", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v360_simulation_input_contract.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["SRC-049", "EVT-077", "SAFE-149", "OPS-116"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v360_simulation_input_contract.mjs", "script inventory");
});

finish("== v3.6.0 simulation input contract summary ==", {
  schema,
  step: "v3.6.0 (2)",
  route,
  inputs: "EventRecord, SourceRegistry, PublishedView, command plan, staged plan",
});

function loadFiles() {
  return {
    server: readText("src/ingress/webrtc_http_server.cpp"),
    backlog: readText("docs/development-backlog.md"),
    streamVerification: readText("docs/stream-verification.md"),
    featureInventory: readText("docs/project-feature-test-inventory.md"),
    featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
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
  const nearby = text.slice(index, index + 128);
  assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
}

function finish(title, summary) {
  const results = runChecks();
  console.log("");
  console.log(title);
  for (const [key, value] of Object.entries(summary)) console.log(`- ${key}: ${value}`);
  console.log("- writes: no source/view/rule/EventRecord/Ops audit/client/media mutation performed");
  console.log("- uiFulltest: not-run-by-this-command");
  console.log("- longrun30Or120: not-run-by-this-command");
  console.log(`- pass: ${results.pass}`);
  console.log(`- fail: ${results.fail}`);
  if (results.fail > 0) process.exit(1);
}

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

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
