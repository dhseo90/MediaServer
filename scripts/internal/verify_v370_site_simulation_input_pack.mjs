#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.7.0 Step 6 Site Simulation Input Pack 구현, 문서, inventory 연결을 검증한다.

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
  printUsageAndExit(`v3.7.0 Site Simulation Input Pack verification

Usage:
  ./server.sh verify-v370-site-simulation-input-pack

Checks:
  - /ops/api/site-operations/simulation-input-pack extends the v3.6 simulation input/result envelope by site
  - site packs derive from the read-only site projection and impact graph
  - the route remains Ops-only, read-only, and never persists or runs a simulation
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v370-site-simulation-input-pack";
const schema = "media-server.ops.v370-site-simulation-input-pack.v1";
const route = "/ops/api/site-operations/simulation-input-pack";
const files = loadFiles();
const checks = [];

check("Ops server builds the v3.7 site simulation input pack model", () => {
  for (const snippet of [
    "struct OpsV370SiteSimulationInputPackItem",
    "struct OpsV370SiteSimulationInputPackSummary",
    "BuildV370SiteSimulationInputPackItems",
    "BuildV370SiteSimulationInputPackSummary",
    "AppendV370SiteSimulationInputPackItemJson",
    "OpsV370SiteSimulationInputPackJson",
    schema,
    "siteSimulationInputPackSummary",
    "siteSimulationInputPackItems",
    "siteScopedInputPack",
    "SiteImpactGraph",
    "simulationResultEnvelope",
    "v360InputPackSummary",
  ]) assertIncludes(files.server, snippet, "v370 site simulation input pack server model");
  const producerBlock = extractCppFunctionBlock(files.server, "std::string OpsV370SiteSimulationInputPackJson(");
  assertIncludes(producerBlock, "media-server.ops.v370-site-simulation-input-pack.v1", "v370 site simulation input pack schema");
});

check("site simulation input pack derives from v3.6 input/result envelope and v3.7 site graph", () => {
  const block = extractBlock(files.server, "struct OpsV370SiteSimulationInputPackItem", "struct OpsV360CommandPlanDryRunResult");
  for (const snippet of [
    "BuildV350LiveOperationsGraphContext",
    "BuildV350CommandPlanCandidates",
    "BuildV350StagedChangePlans",
    "BuildV360SimulationInputPackItems",
    "BuildV360SimulationInputPackSummary",
    "BuildV360SimulationResultEnvelope",
    "BuildV370SiteAwareSourceRegistryProjectionItems",
    "BuildV370SiteImpactGraphNodes",
    "BuildV370SiteImpactGraphEdges",
    "BuildV370SiteHealthRollupItems",
    "sourceGroup",
    "siteId",
  ]) assertIncludes(block, snippet, "v370 site simulation derivation");
});

check("site simulation input pack preserves read-only simulation boundaries", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370SiteSimulationInputPackJson(");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "siteScopedInputPack",
    "readOnlySimulationInputPack",
    "simulationInputPersisted",
    "simulationRunExecuted",
    "simulationResultPersisted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "commandPlanExecuted",
    "stagedPlanApplied",
    "viewerClientExposureAdded",
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) assertIncludes(block, snippet, "v370 site simulation boundary flags");
  for (const flag of [
    "simulationInputPersisted",
    "simulationRunExecuted",
    "simulationResultPersisted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "commandPlanExecuted",
    "stagedPlanApplied",
    "viewerClientExposureAdded",
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) assertFlagFalse(block, flag);
  assert(exactBooleanFlagValue(block, "eventRecordWritePerformed") === false, "eventRecordWritePerformed must remain false");
});

check("Ops API exposes the site simulation input pack route as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "site simulation input pack route");
  assertIncludes(block, "request.method == \"GET\"", "site simulation input pack route");
  assertIncludes(block, "require_ops_principal()", "site simulation input pack route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "site simulation input pack route");
  assertIncludes(block, "OpsV370SiteSimulationInputPackJson(", "site simulation input pack route");
  assertIncludes(block, "Cache-Control", "site simulation input pack route");
  assertIncludes(block, "no-store", "site simulation input pack route");
});

check("docs, inventory, and dispatch map v3.7 Step 6", () => {
  assertStepDocs("6", "Site Simulation Input Pack", "SRC-058", "EVT-081", "LAB-101", "SAFE-167", "OPS-134");
  for (const id of ["SRC-058", "EVT-081", "LAB-101", "SAFE-167", "OPS-134"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v370_site_simulation_input_pack.mjs", "server.sh dispatch");
  for (const id of ["SRC-058", "EVT-081", "LAB-101", "SAFE-167", "OPS-134"]) {
    const expectedCommand = id === "SRC-058" ? "verify-ops-source-registry-api" : command;
    assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === expectedCommand, `${id} manifest verifier command drift`);
  }
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(files.scriptInventory, "verify_v370_site_simulation_input_pack.mjs", "script inventory");
});

check("SAFE-167 canonical bounded no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370SiteSimulationInputPackJson(");
  const routeObserved = files.server.includes("/ops/api/site-operations/simulation-input-pack");
  const safe167BoundaryObserved = block.includes("BuildV370SiteSimulationInputPackItems");
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
  assert(routeObserved && safe167BoundaryObserved && block.includes("media-server.ops.v370-site-simulation-input-pack.v1") && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-167 BuildV370SiteSimulationInputPackItems must remain bounded no-execution no-write redacted and client/provider isolated");
});

finish("== v3.7.0 site simulation input pack summary ==", { schema, step: "v3.7.0 (6)", route });

function assertStepDocs(step, title, ...ids) {
  for (const snippet of [
    `| ${step} | v3.7.0 (${step}) ${title} | P1 | 완료 |`,
    `## v3.7.0 Step ${step} 개발 기록`,
    route,
    `\`./server.sh ${command}\``,
  ]) assertIncludes(files.backlog, snippet, `backlog v3.7 Step ${step}`);
  assertIncludes(files.streamVerification, `| v3.7.0 (${step}) | \`./server.sh ${command}\` | ${title}.`, `stream verification v3.7 Step ${step}`);
  assertIncludes(files.featureInventory, `v3.7.0 (${step}) ${title}`, `feature inventory v3.7 Step ${step}`);
  for (const id of ids) assertIncludes(files.featureInventory, `\`${id}\``, `feature inventory ${id}`);
  assertIncludes(files.releaseRecords, "V370 Site Simulation Input Pack", "release records v3.7 Step 6");
  assertIncludes(files.releaseRecords, `\`./server.sh ${command}\``, "release records v3.7 Step 6");
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
  const results = runChecks();
  console.log("");
  console.log(title);
  for (const [key, value] of Object.entries(summary)) console.log(`- ${key}: ${value}`);
  console.log("- writes: no source/view/EventRecord/Ops audit/client/media mutation performed");
  console.log("- simulationRun: not-run-by-this-command");
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
