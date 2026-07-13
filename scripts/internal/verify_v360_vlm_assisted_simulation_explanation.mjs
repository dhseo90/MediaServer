#!/usr/bin/env node
// 파일 용도: v3.6.0 Step 13 VLM-assisted Simulation Explanation 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { exactBooleanFlagValue, extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.6.0 VLM-assisted Simulation Explanation verification

Usage:
  ./server.sh verify-v360-vlm-assisted-simulation-explanation

Checks:
  - /ops/api/live-operations/simulation/vlm-assisted-explanation summarizes simulation blocker, impact diff, and operator review hints
  - VLM assistance is default-off and never performs provider/runtime calls before opt-in
  - /ops simulation workspace renders explanation summaries without raw prompt, provider response, credential, or client material
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v360-vlm-assisted-simulation-explanation";
const schema = "media-server.ops.v360-vlm-assisted-simulation-explanation.v1";
const route = "/ops/api/live-operations/simulation/vlm-assisted-explanation";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  uiScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
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

const checks = [];

check("Ops server builds default-off VLM-assisted simulation explanation models", () => {
  for (const snippet of [
    "struct OpsV360VlmAssistedSimulationExplanationItem",
    "struct OpsV360VlmAssistedSimulationExplanationSummary",
    "BuildV360VlmAssistedSimulationExplanationItems",
    "BuildV360VlmAssistedSimulationExplanationSummary",
    "AppendV360VlmAssistedSimulationExplanationItemJson",
    "AppendV360VlmAssistedSimulationExplanationSummaryJson",
    "OpsV360VlmAssistedSimulationExplanationJson",
    schema,
    "vlmAssistedSimulationExplanations",
    "simulationBlockerSummary",
    "impactDiffSummary",
    "operatorReviewHint",
    "defaultEnabled",
    "defaultOff",
    "vlmProviderCallPerformed",
  ]) {
    assertIncludes(files.server, snippet, "v360 VLM-assisted simulation explanation server model");
  }
  const producerBlock = extractCppFunctionBlock(files.server, "std::string OpsV360VlmAssistedSimulationExplanationJson(");
  assertIncludes(producerBlock, "media-server.ops.v360-vlm-assisted-simulation-explanation.v1", "v360 VLM-assisted simulation explanation schema");
});

check("VLM-assisted simulation explanation derives blockers, impact diff, and review hints without calling VLM", () => {
  const block = extractBlock(files.server, "struct OpsV360VlmAssistedSimulationExplanationItem", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "BuildV350LiveOperationsGraphContext",
    "BuildV360CommandPlanDryRunResults",
    "BuildV360SourceRuleImpactDiffs",
    "BuildV360SafeApplyReadinessItems",
    "BuildV360FieldEvidenceSimulationAdapterItems",
    "simulation-blocker",
    "simulation-impact-diff",
    "operator-review-hint",
    "simulationBlockerSummary",
    "impactDiffSummary",
    "operator review hint",
    "evidenceRefs",
  ]) {
    assertIncludes(block, snippet, "v360 VLM-assisted simulation explanation derivation");
  }
});

check("VLM-assisted simulation explanation boundary flags keep default-off/no-call/no-write/no-raw-material invariants", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV360VlmAssistedSimulationExplanationJson(");
  for (const snippet of [
    "defaultOff",
    "defaultEnabled",
    "runtimeOptInRequired",
    "vlmProviderCallPerformed",
    "vlmRuntimeCallPerformed",
    "rawVlmPromptIncluded",
    "rawProviderResponseIncluded",
    "credentialMaterialIncluded",
    "simulationRunExecuted",
    "simulationRunPersisted",
    "fieldSmokeExecuted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "operatorReviewWritePerformed",
    "clientNoticeSent",
    "viewerClientExposureAdded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "v360 VLM-assisted simulation explanation boundary flags");
  }
  for (const flag of [
    "defaultEnabled",
    "vlmProviderCallPerformed",
    "vlmRuntimeCallPerformed",
    "rawVlmPromptIncluded",
    "rawProviderResponseIncluded",
    "credentialMaterialIncluded",
    "simulationRunExecuted",
    "simulationRunPersisted",
    "fieldSmokeExecuted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "operatorReviewWritePerformed",
    "clientNoticeSent",
    "viewerClientExposureAdded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    const index = block.indexOf(flag);
    const nearby = block.slice(index, index + 128);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  assert(exactBooleanFlagValue(block, "eventRecordWritePerformed") === false, "eventRecordWritePerformed must remain false");
  assert(exactBooleanFlagValue(block, "viewerClientExposureAdded") === false, "viewerClientExposureAdded must remain false");
  assert(exactBooleanFlagValue(block, "vlmProviderCallPerformed") === false, "vlmProviderCallPerformed must remain false");
});

check("Ops API exposes the VLM-assisted simulation explanation route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/");
  assertIncludes(block, route, "VLM-assisted simulation explanation route");
  assertIncludes(block, "request.method == \"GET\"", "VLM-assisted simulation explanation route");
  assertIncludes(block, "require_ops_principal()", "VLM-assisted simulation explanation route");
  assertIncludes(block, "OpsV360VlmAssistedSimulationExplanationJson(", "VLM-assisted simulation explanation route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "VLM-assisted simulation explanation route");
  assertIncludes(block, "Cache-Control", "VLM-assisted simulation explanation route");
  assertIncludes(block, "no-store", "VLM-assisted simulation explanation route");
});

check("/ops simulation workspace declares and renders VLM-assisted Simulation Explanation", () => {
  const serverBlock = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "dashSimulationWorkspaceVlmAssistedExplanationList",
    "ops-simulation-vlm-assisted-explanation-list",
    "data-v360-vlm-assisted-simulation-explanation",
    schema,
    "VLM-assisted Simulation Explanation",
  ]) {
    assertIncludes(serverBlock, snippet, "v360 VLM-assisted simulation explanation dashboard shell");
  }
  const scriptBlock = extractNamedFunctionBlock(files.uiScript, "renderV360OpsSimulationWorkspace");
  assertIncludes(scriptBlock, "data-v360-vlm-assisted-simulation-explanation", "v360 VLM simulation explanation product UI state");
  const credentialExposed = ["passwordHash", "tokenHash", "Authorization:", "credentialValue", "providerCredential"].some(marker => scriptBlock.includes(marker));
  assert(credentialExposed === false, "UI-094 VLM simulation explanation must not expose credentials");
  const rawMaterialExposed = ["rawEvidenceIncluded: true", "rawLocatorIncluded === true", "rawDiagnosticJsonIncluded === true", "rtsp://", "rtsps://"].some(marker => scriptBlock.includes(marker));
  assert(rawMaterialExposed === false, "UI-094 raw-material-redaction explicit absence oracle");
  assertIncludes(files.uiScript, "/ops/dashboard", "UI-094 canonical route obligation");
  assertIncludes(files.server, "media-server.ops.v360-vlm-assisted-simulation-explanation.v1", "UI-094 canonical schema obligation");
  assertIncludes(files.uiScript, "VLM", "UI-094 canonical field obligation");
  const refreshBlock = extractNamedFunctionBlock(files.uiScript, "refreshV360OpsSimulationWorkspace");
  assertIncludes(refreshBlock, "requestJson(vlmAssistedSimulationExplanationRoute)", "v360 VLM-assisted simulation explanation request dispatch");
  for (const snippet of [
    "vlmAssistedSimulationExplanation",
    "vlmAssistedSimulationExplanationRoute",
    route,
    "vlmAssistedSimulationExplanations",
    "simulationBlockerSummary",
    "impactDiffSummary",
    "operatorReviewHint",
    "defaultEnabled",
    "dashSimulationWorkspaceVlmAssistedExplanationList",
  ]) {
    assertIncludes(scriptBlock, snippet, "v360 VLM-assisted simulation explanation renderer");
  }
});

check("VLM-assisted Simulation Explanation styling and client redaction are in place", () => {
  for (const snippet of [
    ".ops-simulation-vlm-assisted-explanation-list",
    ".ops-simulation-vlm-assisted-explanation-entry",
    "body.ops-shell .ops-simulation-workspace .ops-simulation-vlm-assisted-explanation-list",
  ]) {
    assertIncludes(files.css, snippet, "v360 VLM-assisted simulation explanation CSS");
  }
  for (const forbidden of [
    schema,
    route,
    "vlmAssistedSimulationExplanations",
    "rawVlmPrompt",
    "rawProviderResponse",
    "providerResponse",
    "credentialMaterialIncluded",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose VLM-assisted simulation explanation material: ${forbidden}`);
  }
});

check("docs, inventory, and dispatch map v3.6 Step 13", () => {
  for (const snippet of [
    "| 13 | v3.6.0 (13) VLM-assisted Simulation Explanation | P2 | 완료 |",
    "## v3.6.0 Step 13 개발 기록",
    route,
    "OpsV360VlmAssistedSimulationExplanationJson",
    `\`./server.sh ${command}\``,
    "provider/runtime call은 opt-in 전 미수행",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.6 Step 13");
  }
  for (const snippet of [
    `| v3.6.0 (13) | \`./server.sh ${command}\` | VLM-assisted Simulation Explanation.`,
    "default-off VLM",
    "blocker, impact diff, operator review hint",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.6 Step 13");
  }
  for (const snippet of [
    `v3.6.0 (13) VLM-assisted Simulation Explanation | \`UI-094\`, \`SRC-053\`, \`EVT-079\`, \`LAB-100\`, \`SAFE-160\`, \`OPS-127\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-094 | V360 Step 13 VLM-assisted Simulation Explanation UI",
    "SRC-053 | V360 Step 13 source simulation explanation context",
    "EVT-079 | V360 Step 13 event risk simulation explanation context",
    "LAB-100 | V360 Step 13 default-off VLM simulation explanation harness",
    "SAFE-160 | V360 Step 13 VLM-assisted simulation explanation boundary",
    "OPS-127 | V360 Step 13 VLM-assisted Simulation Explanation 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.6 Step 13");
  }
  for (const snippet of [
    "V360 VLM-assisted Simulation Explanation",
    `\`./server.sh ${command}\``,
    "v360 Step 13 RED VLM-assisted simulation explanation gate",
    "v360 Step 13 VLM-assisted simulation explanation final",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.6 Step 13");
  }
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v360_vlm_assisted_simulation_explanation.mjs", "server.sh script dispatch");
  for (const id of ["UI-094", "SRC-053", "EVT-079", "LAB-100", "SAFE-160", "OPS-127"]) assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  for (const id of ["UI-094", "SRC-053", "EVT-079", "LAB-100", "SAFE-160", "OPS-127"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v360_vlm_assisted_simulation_explanation.mjs", "script inventory");
});

check("SAFE-160 canonical bounded no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV360VlmAssistedSimulationExplanationJson(");
  const routeObserved = files.server.includes("/ops/api/live-operations/simulation/vlm-assisted-explanation");
  const safe160BoundaryObserved = block.includes("BuildV360VlmAssistedSimulationExplanationItems");
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
  assert(routeObserved && safe160BoundaryObserved && block.includes("media-server.ops.v360-vlm-assisted-simulation-explanation.v1") && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-160 BuildV360VlmAssistedSimulationExplanationItems must remain bounded no-execution no-write redacted and client/provider isolated");
});

const results = runChecks();
console.log("");
console.log("== v3.6.0 VLM-assisted simulation explanation summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.6.0 (13)");
console.log(`- route: ${route}`);
console.log("- explains: simulation blocker, impact diff, operator review hint");
console.log("- writes: no VLM/provider/runtime call, simulation execution, operator review write, source/view/EventRecord/Ops audit/client/media mutation performed");
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
