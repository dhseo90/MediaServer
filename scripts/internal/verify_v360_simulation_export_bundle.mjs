#!/usr/bin/env node
import { validateFeatureDocumentation } from "./documentation_contract_lib.mjs";
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.6.0 Step 11 Simulation Export Bundle 구현, 문서, inventory 연결을 검증한다.

import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.6.0 Simulation Export Bundle verification

Usage:
  ./server.sh verify-v360-simulation-export-bundle

Checks:
  - /ops/api/live-operations/simulation/export-bundle combines simulation input/output, readiness blocker, and handoff map refs
  - export bundle stays redacted, release-safe, read-only, ops-only, and no-store
  - /ops simulation workspace renders bundle and handoff entries without client/viewer exposure
  - 현행 기능 정의·계약·검증 안내·실제 dispatch 연결 (실행 결과 판정 아님)
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v360-simulation-export-bundle";
const schema = "media-server.ops.v360-simulation-export-bundle.v1";
const route = "/ops/api/live-operations/simulation/export-bundle";
const files = {
  server: readWebRtcHttpServerBundle(readText),
  pages: readText("src/ingress/product_ui_server_pages.cpp"),
  uiScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  serverSh: readText("server.sh"),
};

const checks = [];

check("Ops server builds the v3.6 Simulation Export Bundle model", () => {
  for (const snippet of [
    "struct OpsV360SimulationExportBundleItem",
    "struct OpsV360SimulationHandoffMapEntry",
    "struct OpsV360SimulationExportBundleSummary",
    "BuildV360SimulationExportBundleItems",
    "BuildV360SimulationHandoffMapEntries",
    "BuildV360SimulationExportBundleSummary",
    "AppendV360SimulationExportBundleItemJson",
    "AppendV360SimulationHandoffMapEntryJson",
    "AppendV360SimulationExportBundleSummaryJson",
    "OpsV360SimulationExportBundleJson",
    schema,
    "simulationExportBundle",
    "simulationHandoffMapEntries",
    "simulationInputRefs",
    "simulationOutputRefs",
    "readinessBlockerRefs",
    "handoffMapRefs",
    "redactionPolicy",
    "releaseSafe",
  ]) {
    assertIncludes(files.server, snippet, "v360 simulation export bundle server model");
  }
});

check("simulation export bundle derives from simulation input/output, blocker, and handoff refs", () => {
  const block = extractBlock(files.server, "struct OpsV360SimulationExportBundleItem", "std::string OpsV360SimulationExportBundleJson(") +
    extractCppFunctionBlock(files.server, "std::string OpsV360SimulationExportBundleJson(");
  for (const snippet of [
    "BuildV360SimulationInputPackItems",
    "BuildV360SimulationRunLedgerEntries",
    "BuildV360CommandPlanDryRunResults",
    "BuildV360SourceRuleImpactDiffs",
    "BuildV360SafeApplyReadinessItems",
    "BuildV360RuleVaWhatIfReplayCandidates",
    "BuildV360ClientNoticePreviewItems",
    "/ops/api/live-operations/simulation/input-pack",
    "/ops/api/live-operations/simulation/run-ledger",
    "/ops/api/live-operations/simulation/safe-apply-readiness",
    "/ops/api/live-operations/simulation/rule-va-what-if-replay-pack",
    "redacted-release-safe",
    "handoffStatus",
    "nextOperatorRole",
    "blockedReason",
  ]) {
    assertIncludes(block, snippet, "v360 simulation export derivation");
  }
});

check("simulation export bundle boundary flags prevent writes, raw material, and media/schema changes", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV360SimulationExportBundleJson(");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "releaseSafe",
    "redacted",
    "artifactExportExecuted",
    "bundlePersisted",
    "fileWritePerformed",
    "handoffWritePerformed",
    "simulationRunPersisted",
    "simulationRunExecuted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "clientNoticeSent",
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "rawProviderResponseIncluded",
    "rawDiagnosticJsonIncluded",
    "clientViewerRawMaterialIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    assertIncludes(block, snippet, "v360 simulation export boundary flags");
  }
  for (const flag of [
    "artifactExportExecuted",
    "bundlePersisted",
    "fileWritePerformed",
    "handoffWritePerformed",
    "simulationRunPersisted",
    "simulationRunExecuted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "clientNoticeSent",
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "rawProviderResponseIncluded",
    "rawDiagnosticJsonIncluded",
    "clientViewerRawMaterialIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    const index = block.indexOf(flag);
    const nearby = block.slice(index, index + 128);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
});

check("Ops API exposes the simulation export bundle route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/");
  assertIncludes(block, route, "simulation export bundle route");
  assertIncludes(block, "request.method == \"GET\"", "simulation export bundle route");
  assertIncludes(block, "require_ops_principal()", "simulation export bundle route");
  assertIncludes(block, "OpsV360SimulationExportBundleJson(", "simulation export bundle route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "simulation export bundle route");
  assertIncludes(block, "Cache-Control", "simulation export bundle route");
  assertIncludes(block, "no-store", "simulation export bundle route");
});

check("/ops simulation workspace declares and renders Simulation Export Bundle", () => {
  const serverBlock = extractBlock(files.pages, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "dashSimulationWorkspaceExportBundleList",
    "ops-simulation-export-bundle-list",
    "data-v360-simulation-export-bundle",
    schema,
    "Simulation Export Bundle",
  ]) {
    assertIncludes(serverBlock, snippet, "v360 simulation export dashboard shell");
  }
  const scriptBlock = extractBlock(files.uiScript, "const renderV360OpsSimulationWorkspace", "const renderDashboardRootCause");
  assertIncludes(scriptBlock, "data-v360-simulation-export-bundle", "v360 simulation export product UI state");
  assertIncludes(files.uiScript, "/ops/dashboard", "UI-092 canonical route obligation");
  assertIncludes(files.server, "media-server.ops.v360-simulation-export-bundle.v1", "UI-092 canonical schema obligation");
  for (const snippet of [
    "simulationExportBundle",
    "simulationExportBundleRoute",
    route,
    "simulationExportBundleItems",
    "simulationHandoffMapEntries",
    "simulationInputRefs",
    "simulationOutputRefs",
    "readinessBlockerRefs",
    "handoffStatus",
    "dashSimulationWorkspaceExportBundleList",
    "requestJson(simulationExportBundleRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v360 simulation export renderer");
  }
});

check("Simulation Export Bundle styling and client redaction are in place", () => {
  for (const snippet of [
    ".ops-simulation-export-bundle-list",
    ".ops-simulation-export-bundle-entry",
    "body.ops-shell .ops-simulation-workspace .ops-simulation-export-bundle-list",
  ]) {
    assertIncludes(files.css, snippet, "v360 simulation export CSS");
  }
  for (const forbidden of [
    schema,
    route,
    "simulationExportBundleItems",
    "simulationHandoffMapEntries",
    "credentialMaterialIncluded",
    "rawProviderResponseIncluded",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose simulation export material: ${forbidden}`);
  }
});

check("현행 계약 식별자·기능 정의·검증 명령 연결", () => {
  const ids = ["UI-092","LAB-098","SAFE-158","OPS-125"];
  const currentDefinitions = files.featureInventory.split(/\r?\n/).filter(line => ids.includes(line.split("|")[1]?.trim())).join("\n");
  const errors = validateFeatureDocumentation({
    document: currentDefinitions, identifiers: ["/ops/api/live-operations/simulation/export-bundle"],
    command, script: "verify_v360_simulation_export_bundle.mjs", featureIds: ids,
    inventory: files.featureInventory, implementation: files.implementationManifest,
    verification: files.streamVerification, server: files.serverSh,
  });
  assert(errors.length === 0, errors.join("; "));
});

check("현행 실행·등록 연결 1", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v360_simulation_export_bundle.mjs", "server.sh script dispatch");
  for (const id of ["UI-092", "LAB-098", "SAFE-158", "OPS-125"]) assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  for (const id of ["UI-092", "LAB-098", "SAFE-158", "OPS-125"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v360_simulation_export_bundle.mjs", "script inventory");
});

check("SAFE-158 canonical bounded no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV360SimulationExportBundleJson(");
  const routeObserved = files.server.includes("/ops/api/live-operations/simulation/export-bundle");
  const safe158BoundaryObserved = block.includes("BuildV360SimulationExportBundleItems");
  const writePerformed = /\b(?:Write|Persist|AppendFile|UpdateSource|CreateVaRule|UpdateVaRule|AssignReviewer)[A-Za-z0-9_:]*\s*\(/.test(block);
  const mutationPerformed = writePerformed || /\b(?:Apply|AutomaticApply|SafeApply|SendClientNotice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const executionPerformed = /\b(?:Execute|RunSimulation|Probe|Contact|ProviderCall|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const automaticApplyPerformed = /\b(?:AutomaticApply|SafeApply|ApplyRule|ApplySource)[A-Za-z0-9_:]*\s*\(/.test(block);
  const clientNoticeSent = /\bSendClientNotice[A-Za-z0-9_:]*\s*\(/.test(block);
  const fieldSmokeExecuted = /\b(?:ExecuteFieldSmoke|ProbeEndpoint|ContactDevice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const providerCallPerformed = /\b(?:ProviderCall|ProviderClient|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const rawMaterialExposed = /\\"(?:rawLocator|rawJson|rawProviderResponse|rawEndpoint|rawMaterial)\\":true/.test(block);
  const sourceUrlExposed = block.includes("\\\"sourceUrlIncluded\\\":true") || block.includes("\\\"sourceUrlExposed\\\":true");
  const credentialMaterialExposed = block.includes("\\\"credentialMaterialIncluded\\\":true") || block.includes("\\\"credentialMaterialExposed\\\":true");
  const debugMaterialExposed = block.includes("\\\"debugMaterialIncluded\\\":true") || block.includes("\\\"debugMaterialExposed\\\":true");
  const viewerClientExposureAdded = block.includes("\\\"viewerClientExposureAdded\\\":true");
  const mediaPathChanged = block.includes("\\\"rtspOrWebrtcMediaPathChanged\\\":true");
  assert(routeObserved && safe158BoundaryObserved && block.includes("media-server.ops.v360-simulation-export-bundle.v1") && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-158 BuildV360SimulationExportBundleItems must remain bounded no-execution no-write redacted and client/provider isolated");
});

const results = runChecks();
console.log("");
console.log("== v3.6.0 simulation export bundle summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.6.0 (11)");
console.log(`- route: ${route}`);
console.log("- combines: simulation input/output, readiness blocker, handoff map refs");
console.log("- writes: no artifact export, file write, handoff write, simulation execution, source/view/rule/EventRecord/Ops audit/client/media mutation performed");
console.log("- uiFulltest: not-run-by-this-command");
  console.log("- longrun30Or120: not-run-by-this-command");
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

function check(name, fn) { checks.push({ name, fn }); }
function readText(relativePath) { return fs.readFileSync(path.join(rootDir, relativePath), "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function assertIncludes(text, needle, label) { assert(text.includes(needle), `${label} missing snippet: ${needle}`); }
function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start !== -1, `block start not found: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end !== -1, `block end not found after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
