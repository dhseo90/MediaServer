#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.9.0 Step 17~18 conditional field / Re-ID assist decision 구현, 문서, inventory 연결을 검증한다.

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
  printUsageAndExit(`v3.9.0 conditional field / Re-ID assist decisions verification

Usage:
  ./server.sh verify-v390-conditional-field-ai-decisions

Checks:
  - /ops/api/field-evidence/bridge-decision exposes the Step 17 approval-only field evidence bridge decision
  - /ops/api/analysis/reid-assist-decision exposes the Step 18 explicit opt-in Re-ID assist decision
  - /ops dashboard renders both decisions without adding field execution, provider calls, or model-backed execution controls
  - endpoint/credential/provider material, embeddings, crops, model paths, and raw identity material are not exposed to client/viewer scripts
  - route/UI/docs/inventory/release records/dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-conditional-field-ai-decisions";
const targetScript = "verify_v390_conditional_field_ai_decisions.mjs";
const readinessCommand = "verify-v390-reid-readiness-consistency";
const readinessScript = "verify_v390_reid_readiness_consistency.mjs";
const fieldSchema = "media-server.ops.v390-field-evidence-bridge-decision.v1";
const reidSchema = "media-server.ops.v390-reid-assist-decision.v1";
const fieldRoute = "/ops/api/field-evidence/bridge-decision";
const reidRoute = "/ops/api/analysis/reid-assist-decision";
const featureIds = [
  "UI-114",
  "SRC-068",
  "MEDIA-027",
  "LAB-124",
  "SAFE-209",
  "OPS-176",
  "UI-115",
  "LAB-125",
  "SAFE-210",
  "OPS-177",
];
const files = loadFiles();
const checks = [];

check("MEDIA-027 exact product approval-only bridge preserves external WHEP/TURN no-execution", () => {
  const productBlock = extractCppFunctionBlock(files.server, "std::string OpsV390FieldEvidenceBridgeDecisionJson()");
  const writePerformed = /\b(?:Write|Persist|UpdateSource|CreateVaRule)[A-Za-z0-9_:]*\s*\(/.test(productBlock);
  const rawMaterialExposed = /\\\"(?:rawVlmPrompt|rawProviderResponse|rawProviderMaterial)Included\\\":true/.test(productBlock);
  const providerCallPerformed = /\b(?:ProviderCall|ProviderClient|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(productBlock);
  assert(productBlock.includes("approval-only-minimal-field-evidence-bridge") && writePerformed === false && rawMaterialExposed === false && providerCallPerformed === false, "LAB-124 approval-only-minimal-field-evidence-bridge must remain no-write/redacted/provider-free");
  assert(productBlock.includes("externalWhepTurnContacted") && productBlock.includes("approval-only-minimal-field-evidence-bridge") && productBlock.includes("fieldPassClaimed"), "MEDIA-027 exact external WHEP/TURN bridge boundary missing");
  assert(exactBooleanFlagValue(productBlock, "rtspOrWebrtcMediaPathChanged") === false && exactBooleanFlagValue(productBlock, "rawCredentialMaterialIncluded") === false, "MEDIA-027 rtspOrWebrtcMediaPathChanged/rawCredentialMaterialIncluded exact false boundary missing");
});

check("Ops server exposes the v3.9 conditional field and Re-ID decisions", () => {
  for (const snippet of [
    "OpsV390FieldEvidenceBridgeDecisionJson",
    fieldSchema,
    fieldRoute,
    "V390-CAND-009",
    "approval-only-minimal-field-evidence-bridge",
    "fieldEvidenceBridgeDecisionSummary",
    "fieldEvidenceBridgeDecisions",
    "external-whep-turn",
    "cloud-vlm-provider",
    "OpsV390ReidAssistDecisionJson",
    reidSchema,
    reidRoute,
    "V390-CAND-010",
    "explicit-opt-in-provenance-gated-assist",
    "reidAssistDecisionSummary",
    "reidAssistRuntimeGate",
    "analysis::InspectAppearanceModelReadiness",
    "modelBackedPreflightReady",
    "modelSessionLoadValidated",
    "modelBackedExecutionReady",
  ]) {
    assertIncludes(files.server, snippet, "v390 conditional field / Re-ID server model");
  }
});

check("field evidence bridge preserves approval-only no-execution boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV390FieldEvidenceBridgeDecisionJson",
    "std::string OpsV390ReidAssistDecisionJson",
  );
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "approvalRequired",
    "minimalEvidenceOnly",
    "fieldSmokeExecuted",
    "endpointProbePerformed",
    "credentialProbePerformed",
    "onvifDeviceContacted",
    "externalWhepTurnContacted",
    "turnCredentialUsed",
    "cloudProviderCalled",
    "vlmProviderCalled",
    "minimalEvidencePersistedByRoute",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "fieldPassClaimed",
    "releasePassClaimed",
    "rawEndpointIncluded",
    "rawCredentialMaterialIncluded",
    "rawProviderMaterialIncluded",
    "viewerClientPayloadChanged",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "field evidence bridge boundary flags");
  }
  for (const flag of [
    "fieldSmokeExecuted",
    "endpointProbePerformed",
    "credentialProbePerformed",
    "onvifDeviceContacted",
    "externalWhepTurnContacted",
    "turnCredentialUsed",
    "cloudProviderCalled",
    "vlmProviderCalled",
    "minimalEvidencePersistedByRoute",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "fieldPassClaimed",
    "releasePassClaimed",
    "rawEndpointIncluded",
    "rawCredentialMaterialIncluded",
    "rawProviderMaterialIncluded",
    "viewerClientPayloadChanged",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertFlagFalse(block, flag);
  }
  const fieldSmokeExecuted = exactBooleanFlagValue(block, "fieldSmokeExecuted");
  const eventPostPayloadChanged = exactBooleanFlagValue(block, "eventPostPayloadChanged");
  const rawProviderMaterialIncluded = exactBooleanFlagValue(block, "rawProviderMaterialIncluded");
  const rawCredentialMaterialIncluded = exactBooleanFlagValue(block, "rawCredentialMaterialIncluded");
  const providerCallPerformed = exactBooleanFlagValue(block, "cloudProviderCalled") ||
    exactBooleanFlagValue(block, "vlmProviderCalled");
  assert(fieldSmokeExecuted === false && eventPostPayloadChanged === false &&
    rawProviderMaterialIncluded === false && rawCredentialMaterialIncluded === false &&
    providerCallPerformed === false,
    "fieldSmokeExecuted must remain false in the bounded field evidence bridge summary");
  for (const forbidden of [
    "RunFieldSmoke",
    "ProbeEndpoint",
    "UseTurnCredential",
    "CallCloudProvider",
    "CallVlmProvider",
    "PersistMinimalFieldEvidence",
    "AppendEventRecord(",
    "AppendOpsAuditRecord(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `field bridge must not execute or expose restricted material: ${forbidden}`);
  }
});

check("Re-ID assist decision preserves explicit opt-in and privacy boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV390ReidAssistDecisionJson",
    "std::string OpsV380DefaultOffActionExplanationJson",
  );
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "explicitOptInRequired",
    "modelBackedExecutionPerformed",
    "modelSessionLoadPerformed",
    "appearanceExtractorCreatedByRoute",
    "runtimeReidCallPerformed",
    "embeddingSerialized",
    "cropSerialized",
    "modelPathExposed",
    "modelChecksumExposed",
    "modelProvenanceExposed",
    "identitySearchEnabled",
    "faceRecognitionEnabled",
    "watchlistMatchingEnabled",
    "clientViewerExposureAdded",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "Re-ID assist boundary flags");
  }
  for (const flag of [
    "modelBackedExecutionPerformed",
    "modelSessionLoadPerformed",
    "appearanceExtractorCreatedByRoute",
    "runtimeReidCallPerformed",
    "embeddingSerialized",
    "cropSerialized",
    "modelPathExposed",
    "modelChecksumExposed",
    "modelProvenanceExposed",
    "identitySearchEnabled",
    "faceRecognitionEnabled",
    "watchlistMatchingEnabled",
    "clientViewerExposureAdded",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertFlagFalse(block, flag);
  }
  for (const forbidden of [
    "CreateAppearanceExtractor",
    "ExtractAppearance",
    "SerializeEmbedding",
    "SerializeCrop",
    "\"modelPath\"",
    "\"embedding\"",
    "\"crop\"",
    "\"faceRecognition\"",
    "\"watchlist\"",
  ]) {
    assert(!block.includes(forbidden), `Re-ID decision must not execute or expose restricted material: ${forbidden}`);
  }
});

check("Ops API exposes both decision routes as guarded no-store JSON", () => {
  for (const [route, factory] of [
    [fieldRoute, "OpsV390FieldEvidenceBridgeDecisionJson()"],
    [reidRoute, "OpsV390ReidAssistDecisionJson(config)"],
  ]) {
    const block = extractRouteBlock(files.server, route);
    assertIncludes(block, route, `route ${route}`);
    assertIncludes(block, "request.method == \"GET\"", `route ${route}`);
    assertIncludes(block, "require_ops_principal()", `route ${route}`);
    assertIncludes(block, factory, `route ${route}`);
    assertIncludes(block, "Cache-Control", `route ${route}`);
    assertIncludes(block, "no-store", `route ${route}`);
    assert(!block.includes("require_source_write_principal"), `${route} must not require source writes`);
    assert(!block.includes("require_rule_write_principal"), `${route} must not require rule writes`);
  }
});

check("/ops dashboard renders conditional field and Re-ID decisions", () => {
  const serverBlock = extractBlock(files.server, "void AppendOpsDashboardPage", "section class=\"section-card ops-workspace-wide ops-site-client-notice-workspace");
  for (const snippet of [
    "ops-field-evidence-bridge-decision",
    "data-testid=\"ops-field-evidence-bridge-decision\"",
    "data-v390-field-evidence-bridge-decision",
    fieldSchema,
    "Field Evidence Bridge",
    "dashFieldEvidenceBridgeBadges",
    "dashFieldEvidenceBridgeList",
    "dashFieldEvidenceBridgeBoundary",
    "ops-reid-assist-decision",
    "data-testid=\"ops-reid-assist-decision\"",
    "data-v390-reid-assist-decision",
    reidSchema,
    "Re-ID Assist Decision",
    "dashReidAssistDecisionBadges",
    "dashReidAssistDecisionList",
    "dashReidAssistDecisionBoundary",
  ]) {
    assertIncludes(serverBlock, snippet, "v390 conditional field / Re-ID dashboard shell");
  }
  const scriptBlock = extractBlock(
    files.uiScript,
    "let v390FieldEvidenceBridgeDecisionState",
    "let v370OutcomeReconciliationState",
  );
  for (const snippet of [
    "const renderV390FieldEvidenceBridgeDecision",
    "refreshV390FieldEvidenceBridgeDecision",
    fieldRoute,
    "fieldEvidenceBridgeDecisionSummary",
    "fieldEvidenceBridgeDecisions",
    "fieldSmokeExecuted",
    "dashFieldEvidenceBridgeList",
    "const renderV390ReidAssistDecision",
    "refreshV390ReidAssistDecision",
    reidRoute,
    "reidAssistDecisionSummary",
    "reidAssistRuntimeGate",
    "modelBackedPreflightReady",
    "modelSessionLoadValidated",
    "readinessReason",
    "openSslRuntimeAvailable",
    "onnxRuntimeAvailable",
    "dashReidAssistDecisionList",
    "requestJson(fieldEvidenceBridgeRoute)",
    "requestJson(reidAssistDecisionRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v390 conditional field / Re-ID renderer");
  }
  const dashboardRoutePresent = files.server.includes('path == "/ops/dashboard"');
  const fieldSchemaPresent = serverBlock.includes("media-server.ops.v390-field-evidence-bridge-decision.v1");
  const credentialExposed = /\b(?:credentialValue|credentialReferenceValue|rawCredential|secretMaterial)\b/i.test(scriptBlock);
  const rawMaterialExposed = /\b(?:rawModelMaterial|rawEmbedding|rawDiagnostic|rawLocator)\b/i.test(scriptBlock);
  assert(dashboardRoutePresent, "v390 conditional field dashboard route missing");
  assert(fieldSchemaPresent, "v390 field evidence bridge schema missing");
  assert(credentialExposed === false, "v390 field evidence bridge renderer must redact credentials");
  assert(rawMaterialExposed === false, "v390 Re-ID assist renderer must redact raw model material");
  assertIncludes(scriptBlock, "dashFieldEvidenceBridgeBoundary", "v390 field evidence bridge boundary state");
  assertIncludes(scriptBlock, "dashReidAssistDecisionBoundary", "v390 Re-ID assist boundary state");
  const refreshBlock = extractBlock(files.uiScript, "async function refreshDashboard()", "async function refreshEvents()");
  assertIncludes(refreshBlock, "refreshV390FieldEvidenceBridgeDecision", "dashboard refresh");
  assertIncludes(refreshBlock, "refreshV390ReidAssistDecision", "dashboard refresh");
  assertIncludes(files.opsClientUiSmoke, "ops-field-evidence-bridge-decision", "ops client UI smoke");
  assertIncludes(files.opsClientUiSmoke, "ops-reid-assist-decision", "ops client UI smoke");
});

check("client/viewer scripts do not receive field or Re-ID internals", () => {
  for (const forbidden of [
    fieldSchema,
    reidSchema,
    fieldRoute,
    reidRoute,
    "fieldEvidenceBridgeDecisionSummary",
    "fieldEvidenceBridgeDecisions",
    "rawEndpointIncluded",
    "rawCredentialMaterialIncluded",
    "rawProviderMaterialIncluded",
    "reidAssistDecisionSummary",
    "reidAssistRuntimeGate",
    "modelBackedPreflightReady",
    "modelSessionLoadValidated",
    "readinessReason",
    "modelBackedExecutionReady",
    "embeddingSerialized",
    "cropSerialized",
    "modelPathExposed",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose conditional field / Re-ID internals: ${forbidden}`);
  }
});

check("roadmap, stream verification, inventory, and release records map v3.9 Steps 17~18", () => {
  for (const snippet of [
    "| 17 | v3.9.0 (17) field evidence bridge | P2 | 완료 |",
    "| 18 | v3.9.0 (18) Re-ID appearance assist model-backed path decision | P2 | 완료 |",
    "V390-CAND-009",
    "V390-CAND-010",
    fieldRoute,
    reidRoute,
    "OpsV390FieldEvidenceBridgeDecisionJson",
    "OpsV390ReidAssistDecisionJson",
    `\`./server.sh ${command}\``,
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.9 Steps 17~18");
  }
  for (const snippet of [
    `| v3.9.0 (17) | \`./server.sh ${command}\` | Field evidence bridge decision.`,
    `| v3.9.0 (18) / V390-ADD1-04 | \`./server.sh ${readinessCommand}\`, \`./server.sh ${command}\` | Re-ID readiness consistency.`,
    "approval-only-minimal-field-evidence-bridge",
    "explicit-opt-in-provenance-gated-assist",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.9 Steps 17~18");
  }
  for (const snippet of [
    `v3.9.0 (17) field evidence bridge | \`UI-114\`, \`SRC-068\`, \`MEDIA-027\`, \`LAB-124\`, \`SAFE-209\`, \`OPS-176\` | \`${command}\`, \`verify-v380-field-connector-evidence-package\`, \`verify-v350-field-evidence-intake\``,
    `v3.9.0 (18) / V390-ADD1-04 / V390-REVIEW2-32 Re-ID readiness consistency | \`UI-115\`, \`LAB-125\`, \`SAFE-210\`, \`OPS-177\` | \`${readinessCommand}\`, \`${command}\`, \`verify-reid-advanced-tracking\`, \`verify-analysis-state\``,
    "UI-114 | V390 Step 17 field evidence bridge decision UI",
    "SRC-068 | V390 Step 17 field evidence source approval boundary",
    "MEDIA-027 | V390 Step 17 external WHEP/TURN field evidence bridge",
    "LAB-124 | V390 Step 17 cloud/VLM provider field evidence bridge",
    "SAFE-209 | V390 Step 17 no-field-execution boundary",
    "OPS-176 | V390 Step 17 field evidence bridge gate",
    "UI-115 | V390 Re-ID server readiness evidence UI",
    "LAB-125 | V390 Re-ID shared readiness evaluator matrix",
    "SAFE-210 | V390 Re-ID false-ready/privacy boundary",
    "OPS-177 | V390 Re-ID readiness consistency gate",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.9 Steps 17~18");
  }
  for (const snippet of [
    "V390 Conditional Field/AI Decisions",
    `\`./server.sh ${command}\``,
    "v390 Step 17-18 RED conditional field/AI decisions gate",
    "v390 Step 17 field evidence bridge final",
    "v390 Step 18 Re-ID assist decision final",
    "V390-ADD1-04 Re-ID readiness consistency final",
    "v390 Step 17-18 UI 풀테스트",
    "v390 Step 17-18 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.9 Steps 17~18");
  }
  for (const snippet of [
    "| V390-CAND-009 |",
    "Closed with `approval-only-minimal-field-evidence-bridge`",
    fieldRoute,
    "UI-114",
    "SAFE-209",
    "OPS-176",
    "| V390-CAND-010 |",
    "Closed with `explicit-opt-in-provenance-gated-assist`",
    "Hardened by V390-ADD1-04",
    reidRoute,
    "UI-115",
    "SAFE-210",
    "OPS-177",
  ]) {
    assertIncludes(files.v390Inventory, snippet, "v390 feature completion inventory Steps 17~18");
  }
});

check("server entrypoint and inventory verifiers include v3.9 Steps 17~18 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, targetScript, "server.sh script dispatch");
  assertIncludes(files.serverSh, readinessCommand, "server.sh readiness command");
  assertIncludes(files.serverSh, readinessScript, "server.sh readiness script dispatch");
  assertIncludes(files.featureInventory, command, "feature inventory conditional verifier mapping");
  assertIncludes(files.featureInventory, readinessCommand, "feature inventory readiness verifier mapping");
  for (const id of featureIds) {
    const expected = ["SRC-068", "OPS-176"].includes(id)
      ? "verify-ops-source-registry-api"
      : ["LAB-125", "SAFE-210", "OPS-177"].includes(id)
        ? readinessCommand
        : command;
    assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === expected, `${id} manifest verifier command drift`);
  }
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, targetScript, "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 conditional field / Re-ID assist decisions ==");
console.log(`- fieldSchema: ${fieldSchema}`);
console.log(`- fieldRoute: ${fieldRoute}`);
console.log("- fieldSelectedMode: approval-only-minimal-field-evidence-bridge");
console.log(`- reidSchema: ${reidSchema}`);
console.log(`- reidRoute: ${reidRoute}`);
console.log("- reidSelectedMode: explicit-opt-in-provenance-gated-assist");
console.log("- fieldSmokeExecuted: false");
console.log("- providerCallPerformed: false");
console.log("- modelBackedExecutionPerformed: false");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30: not-run-by-this-command");
console.log("- longrun120: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function loadFiles() {
  return {
    server: readWebRtcHttpServerBundle(readText),
    uiScript: readText("src/ingress/product_ui_page_scripts.cpp"),
    clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
    backlog: readText("docs/development-backlog.md"),
    streamVerification: readText("docs/stream-verification.md"),
    featureInventory: readText("docs/project-feature-test-inventory.md"),
    v390Inventory: readText("docs/v390-feature-completion-inventory.md"),
    featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
    implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
    projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
    scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
    opsClientUiSmoke: readText("scripts/internal/verify_ops_client_ui_smoke.mjs"),
    releaseRecords: readText("docs/release-test-records.md"),
    serverSh: readText("server.sh"),
  };
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

function assertFlagFalse(block, flag) {
  const index = block.indexOf(flag);
  assert(index >= 0, `boundary flag missing: ${flag}`);
  const nearby = block.slice(index, index + 220);
  assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
}

function extractRouteBlock(text, routeText) {
  const marker = `request.path == "${routeText}"`;
  const start = text.indexOf(marker);
  assert(start >= 0, `route block missing: ${routeText}`);
  const next = text.indexOf("\n                        if (request.path == ", start + marker.length);
  return text.slice(start, next >= 0 ? next : start + 2600);
}

function extractBlock(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert(start >= 0, `block start missing: ${startMarker}`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert(end >= 0, `block end missing after ${startMarker}: ${endMarker}`);
  return text.slice(start, end);
}
