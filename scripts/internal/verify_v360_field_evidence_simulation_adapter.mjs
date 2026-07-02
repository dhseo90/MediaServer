#!/usr/bin/env node
// 파일 용도: v3.6.0 Step 12 Field Evidence Simulation Adapter 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.6.0 Field Evidence Simulation Adapter verification

Usage:
  ./server.sh verify-v360-field-evidence-simulation-adapter

Checks:
  - /ops/api/live-operations/simulation/field-evidence-adapter connects ONVIF, external WHEP/TURN, and cloud/VLM provider conditions to simulation evidence
  - adapter produces conditional/not-run evidence without field execution, endpoint probe, credential probe, media mutation, or provider call
  - /ops simulation workspace renders adapter items without raw endpoint, credential, provider, or VLM material
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v360-field-evidence-simulation-adapter";
const schema = "media-server.ops.v360-field-evidence-simulation-adapter.v1";
const route = "/ops/api/live-operations/simulation/field-evidence-adapter";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  uiScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  serverSh: readText("server.sh"),
};

const checks = [];

check("Ops server builds the v3.6 Field Evidence Simulation Adapter model", () => {
  for (const snippet of [
    "struct OpsV360FieldEvidenceSimulationAdapterItem",
    "struct OpsV360FieldEvidenceSimulationAdapterSummary",
    "BuildV360FieldEvidenceSimulationAdapterItems",
    "BuildV360FieldEvidenceSimulationAdapterSummary",
    "AppendV360FieldEvidenceSimulationAdapterItemJson",
    "AppendV360FieldEvidenceSimulationAdapterSummaryJson",
    "OpsV360FieldEvidenceSimulationAdapterJson",
    schema,
    "fieldEvidenceSimulationAdapters",
    "simulationAdapterConditions",
    "conditionalNotRunEvidence",
    "simulationReadinessBlockerRef",
  ]) {
    assertIncludes(files.server, snippet, "v360 field evidence simulation adapter server model");
  }
});

check("field evidence adapter derives ONVIF, WHEP/TURN, and cloud/VLM conditions without execution", () => {
  const block = extractBlock(files.server, "struct OpsV360FieldEvidenceSimulationAdapterItem", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "BuildV340FieldBridgeConditionGates",
    "BuildV350FieldEvidenceIntakeRecords",
    "BuildV350FieldEvidenceExecutionConditions",
    "BuildV360SafeApplyReadinessItems",
    "onvif-real-device",
    "external-whep-turn",
    "real-cloud-vlm-provider",
    "conditional-not-run",
    "not-run",
    "fieldEvidenceAdapter",
    "simulationReadinessBlockerRef",
    "endpointRequired",
    "credentialRequired",
    "operatorApprovalRequired",
  ]) {
    assertIncludes(block, snippet, "v360 field evidence adapter derivation");
  }
});

check("field evidence adapter boundary flags prevent field execution, raw material, and media/schema changes", () => {
  const block = extractBlock(files.server, "std::string OpsV360FieldEvidenceSimulationAdapterJson", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "conditionalNotRunEvidence",
    "fieldEvidencePersisted",
    "fieldEvidenceWritePerformed",
    "fieldSmokeExecuted",
    "endpointProbePerformed",
    "credentialProbePerformed",
    "onvifDeviceContacted",
    "externalWhepTurnContacted",
    "cloudProviderContacted",
    "vlmProviderCalled",
    "simulationRunExecuted",
    "simulationRunPersisted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "artifactExportExecuted",
    "rawEndpointIncluded",
    "credentialMaterialIncluded",
    "rawTurnCredentialsIncluded",
    "rawVlmPromptIncluded",
    "rawProviderResponseIncluded",
    "clientViewerMaterialIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "v360 field evidence adapter boundary flags");
  }
  for (const flag of [
    "fieldEvidencePersisted",
    "fieldEvidenceWritePerformed",
    "fieldSmokeExecuted",
    "endpointProbePerformed",
    "credentialProbePerformed",
    "onvifDeviceContacted",
    "externalWhepTurnContacted",
    "cloudProviderContacted",
    "vlmProviderCalled",
    "simulationRunExecuted",
    "simulationRunPersisted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "artifactExportExecuted",
    "rawEndpointIncluded",
    "credentialMaterialIncluded",
    "rawTurnCredentialsIncluded",
    "rawVlmPromptIncluded",
    "rawProviderResponseIncluded",
    "clientViewerMaterialIncluded",
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
});

check("Ops API exposes the field evidence adapter route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/");
  assertIncludes(block, route, "field evidence simulation adapter route");
  assertIncludes(block, "request.method == \"GET\"", "field evidence simulation adapter route");
  assertIncludes(block, "require_ops_principal()", "field evidence simulation adapter route");
  assertIncludes(block, "OpsV360FieldEvidenceSimulationAdapterJson(", "field evidence simulation adapter route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "field evidence simulation adapter route");
  assertIncludes(block, "Cache-Control", "field evidence simulation adapter route");
  assertIncludes(block, "no-store", "field evidence simulation adapter route");
});

check("/ops simulation workspace declares and renders Field Evidence Simulation Adapter", () => {
  const serverBlock = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "dashSimulationWorkspaceFieldEvidenceAdapterList",
    "ops-simulation-field-evidence-adapter-list",
    "data-v360-field-evidence-simulation-adapter",
    schema,
    "Field Evidence Adapter",
  ]) {
    assertIncludes(serverBlock, snippet, "v360 field evidence adapter dashboard shell");
  }
  const scriptBlock = extractBlock(files.uiScript, "const renderV360OpsSimulationWorkspace", "const renderDashboardRootCause");
  for (const snippet of [
    "fieldEvidenceSimulationAdapter",
    "fieldEvidenceSimulationAdapterRoute",
    route,
    "fieldEvidenceSimulationAdapters",
    "simulationAdapterConditions",
    "conditionalNotRunEvidence",
    "simulationReadinessBlockerRef",
    "dashSimulationWorkspaceFieldEvidenceAdapterList",
    "requestJson(fieldEvidenceSimulationAdapterRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v360 field evidence adapter renderer");
  }
});

check("Field Evidence Simulation Adapter styling and client redaction are in place", () => {
  for (const snippet of [
    ".ops-simulation-field-evidence-adapter-list",
    ".ops-simulation-field-evidence-adapter-entry",
    "body.ops-shell .ops-simulation-workspace .ops-simulation-field-evidence-adapter-list",
  ]) {
    assertIncludes(files.css, snippet, "v360 field evidence adapter CSS");
  }
  for (const forbidden of [
    schema,
    route,
    "fieldEvidenceSimulationAdapters",
    "simulationAdapterConditions",
    "rawVlmPrompt",
    "rawProviderResponse",
    "credentialMaterialIncluded",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose field evidence adapter material: ${forbidden}`);
  }
});

check("docs, inventory, and dispatch map v3.6 Step 12", () => {
  for (const snippet of [
    "| 12 | v3.6.0 (12) Field Evidence Simulation Adapter | P2 | 완료 |",
    "## v3.6.0 Step 12 개발 기록",
    route,
    "OpsV360FieldEvidenceSimulationAdapterJson",
    `\`./server.sh ${command}\``,
    "VLM-assisted Simulation Explanation 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.6 Step 12");
  }
  for (const snippet of [
    `| v3.6.0 (12) | \`./server.sh ${command}\` | Field Evidence Simulation Adapter.`,
    "ONVIF, external WHEP/TURN, cloud/VLM provider",
    "조건부/not-run evidence",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.6 Step 12");
  }
  for (const snippet of [
    `v3.6.0 (12) Field Evidence Simulation Adapter | \`UI-093\`, \`SRC-052\`, \`MEDIA-024\`, \`LAB-099\`, \`SAFE-159\`, \`OPS-126\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-093 | V360 Step 12 Field Evidence Simulation Adapter UI",
    "SRC-052 | V360 Step 12 ONVIF simulation field evidence adapter",
    "MEDIA-024 | V360 Step 12 external WHEP/TURN simulation field evidence adapter",
    "LAB-099 | V360 Step 12 cloud/VLM simulation field evidence adapter",
    "SAFE-159 | V360 Step 12 field evidence simulation boundary",
    "OPS-126 | V360 Step 12 Field Evidence Simulation Adapter 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.6 Step 12");
  }
  for (const snippet of [
    "V360 Field Evidence Simulation Adapter",
    `\`./server.sh ${command}\``,
    "v360 Step 12 RED field evidence simulation adapter gate",
    "v360 Step 12 field evidence simulation adapter final",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.6 Step 12");
  }
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v360_field_evidence_simulation_adapter.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["UI-093", "SRC-052", "MEDIA-024", "LAB-099", "SAFE-159", "OPS-126"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v360_field_evidence_simulation_adapter.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.6.0 field evidence simulation adapter summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.6.0 (12)");
console.log(`- route: ${route}`);
console.log("- adapter: ONVIF, external WHEP/TURN, cloud/VLM provider conditions as conditional/not-run simulation evidence");
console.log("- writes: no field smoke, endpoint probe, credential probe, provider call, simulation execution, source/view/EventRecord/Ops audit/client/media mutation performed");
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
