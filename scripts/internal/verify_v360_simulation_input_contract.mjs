#!/usr/bin/env node
import { validateFeatureDocumentation } from "./documentation_contract_lib.mjs";
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.6.0 Step 2 Simulation Input Contract 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { exactBooleanFlagValue, extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";

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
  const producerBlock = extractCppFunctionBlock(files.server, "std::string OpsV360SimulationInputPackJson(");
  assertIncludes(producerBlock, "media-server.ops.v360-simulation-input-pack.v1", "v360 simulation input schema");
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
  const block = extractCppFunctionBlock(files.server, "std::string OpsV360SimulationInputPackJson(");
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
  assert(exactBooleanFlagValue(block, "eventRecordWritePerformed") === false, "eventRecordWritePerformed must remain false");
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

check("현행 계약 식별자·기능 정의·검증 명령 연결", () => {
  const ids = ["SRC-049","EVT-077","SAFE-149","OPS-116"];
  const currentDefinitions = files.featureInventory.split(/\r?\n/).filter(line => ids.includes(line.split("|")[1]?.trim())).join("\n");
  const errors = validateFeatureDocumentation({
    document: currentDefinitions, identifiers: ["/ops/api/live-operations/simulation/input-pack"],
    command, script: "verify_v360_simulation_input_contract.mjs", featureIds: ids,
    inventory: files.featureInventory, implementation: files.implementationManifest,
    verification: files.streamVerification, server: files.serverSh,
  });
  assert(errors.length === 0, errors.join("; "));
  // 독립 API 검사 결속이며 이 정적 명령의 실행 결과로 대체하지 않는다.
  for (const [id, expectedCommand, expectedFile] of [["SRC-049","verify-ops-source-registry-api","scripts/internal/verify_ops_source_registry_api.mjs"]]) {
    const entries = files.implementationManifest.items.filter(item => item.id === id);
    assert(entries.length === 1 && entries[0].verifierEvidence?.command === expectedCommand && entries[0].verifierEvidence?.file === expectedFile, id + " 독립 API 검증 연결 불일치");
  }

});

check("server entrypoint and inventory verifiers include v3.6 Step 2", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v360_simulation_input_contract.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, "loadImplementationManifest", "feature coverage manifest loading");
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  const manifestById = new Map(files.implementationManifest.items.map(item => [item.id, item]));
  for (const id of ["SRC-049", "EVT-077", "SAFE-149", "OPS-116"]) {
    const expectedCommand = id === "SRC-049" ? "verify-ops-source-registry-api" : command;
    assert(manifestById.get(id)?.verifierEvidence?.command === expectedCommand,
      `${id} implementation manifest verifier must be ${expectedCommand}`);
  }
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
    server: readWebRtcHttpServerBundle(readText),
    streamVerification: readText("docs/stream-verification.md"),
    featureInventory: readText("docs/project-feature-test-inventory.md"),
    featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
    projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
    scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
    implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
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
  check("SAFE-149 canonical simulation input no-write boundary", () => {
    const block = extractCppFunctionBlock(files.server, "std::string OpsV360SimulationInputPackJson(");
    const routeObserved = files.server.includes("/ops/api/live-operations/simulation/input-pack");
    const safe149BoundaryObserved = block.includes("BuildV360SimulationInputPackItems") && block.includes("media-server.ops.v360-simulation-input-pack.v1");
    const mutationPerformed = /\b(?:Write|Persist|Execute|Apply|UpdateSource|CreateVaRule|DispatchEventRecords)[A-Za-z0-9_:]*\s*\(/.test(block);
    const registryWritePerformed = mutationPerformed;
    const rawMaterialExposed = /\\\"(?:credentialMaterial|rawLocator|sourceUrl|debugMaterial)Included\\\":true/.test(block);
    const sourceUrlExposed = block.includes("\\\"sourceUrlIncluded\\\":true");
    const credentialMaterialExposed = block.includes("\\\"credentialMaterialIncluded\\\":true");
    assert(routeObserved && safe149BoundaryObserved && mutationPerformed === false && registryWritePerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false,
      "SAFE-149 BuildV360SimulationInputPackItems read-only input pack must not mutate source view rule event audit client media or expose credential raw locator");
  });

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
