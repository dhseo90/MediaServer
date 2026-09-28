#!/usr/bin/env node
import { validateFeatureDocumentation } from "./documentation_contract_lib.mjs";
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.7.0 Step 16 Outcome Reconciliation 연결, 문서, 경계를 검증한다.

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
  printUsageAndExit(`v3.7.0 Outcome Reconciliation verification

Usage:
  ./server.sh verify-v370-outcome-reconciliation

Checks:
  - /ops/api/site-operations/outcome-reconciliation compares pre-simulation refs with post-execution observed refs for source/event/client impact
  - reconciliation remains read-only and marks execution outcomes as pending/not-run when no pilot execution evidence exists
  - /ops dashboard renders source, EventRecord, client, and pending reconciliation signals without client/viewer injection
  - 현행 기능 정의·계약·검증 안내·실제 dispatch 연결 (실행 결과 판정 아님)
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v370-outcome-reconciliation";
const schema = "media-server.ops.v370-outcome-reconciliation.v1";
const route = "/ops/api/site-operations/outcome-reconciliation";
const pilotRoute = "/ops/api/site-operations/limited-safe-execution-pilot";
const siteSimulationRoute = "/ops/api/site-operations/simulation-input-pack";
const impactDiffRoute = "/ops/api/live-operations/simulation/impact-diff";
const clientNoticeRoute = "/ops/api/site-operations/client-notice-by-site-view-group";
const featureIds = ["UI-100", "SRC-062", "EVT-083", "CLIENT-039", "LAB-109", "SAFE-177", "OPS-144"];

const files = {
  server: readWebRtcHttpServerBundle(readText),
  uiServerPages: readText("src/ingress/product_ui_server_pages.cpp"),
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

check("Ops server builds the v3.7 Outcome Reconciliation model", () => {
  for (const snippet of [
    "struct OpsV370OutcomeReconciliationItem",
    "struct OpsV370OutcomeReconciliationSummary",
    "BuildV370OutcomeReconciliationItems",
    "BuildV370OutcomeReconciliationSummary",
    "AppendV370OutcomeReconciliationItemJson",
    "AppendV370OutcomeReconciliationSummaryJson",
    "OpsV370OutcomeReconciliationJson",
    schema,
    "reconciliationId",
    "pilotActionId",
    "siteId",
    "sourceGroup",
    "actionKind",
    "preSimulationRef",
    "postExecutionRef",
    "sourceImpactBeforeRef",
    "sourceImpactAfterRef",
    "sourceImpactDiff",
    "eventImpactBeforeRef",
    "eventImpactAfterRef",
    "eventImpactDiff",
    "clientImpactBeforeRef",
    "clientImpactAfterRef",
    "clientImpactDiff",
    "reconciliationStatus",
    "pendingReason",
    "evidenceRefs",
    "driftSignals",
    "sourceReconciled",
    "eventReconciled",
    "clientReconciled",
    "executionObserved",
    "readOnly",
  ]) {
    assertIncludes(files.server, snippet, "v370 outcome reconciliation server model");
  }
  const producerBlock = extractCppFunctionBlock(files.server, "std::string OpsV370OutcomeReconciliationJson(");
  assertIncludes(producerBlock, "media-server.ops.v370-outcome-reconciliation.v1", "v370 outcome reconciliation schema");
});

check("Outcome Reconciliation derives from pilot, simulation, source/event/client impact refs", () => {
  const block = extractBlock(
    files.server,
    "struct OpsV370OutcomeReconciliationItem",
    "struct OpsV360RuleVaWhatIfReplayCandidate",
  );
  for (const snippet of [
    "BuildV370LimitedSafeExecutionPilotActions",
    "BuildV370SiteSimulationInputPackItems",
    "BuildV360SourceRuleImpactDiffs",
    "BuildV370SiteImpactGraphNodes",
    "BuildV370ClientNoticeBySiteViewGroupItems",
    "preSimulationRef",
    "postExecutionRef",
    "sourceImpactDiff",
    "eventImpactDiff",
    "clientImpactDiff",
    "source-reconciliation",
    "event-reconciliation",
    "client-reconciliation",
    pilotRoute,
    siteSimulationRoute,
    impactDiffRoute,
    clientNoticeRoute,
  ]) {
    assertIncludes(block, snippet, "v370 outcome reconciliation derivation");
  }
});

check("Outcome Reconciliation preserves pending/not-run and no-mutation boundaries", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370OutcomeReconciliationJson(");
  const clientNoticeSendPerformed = exactBooleanFlagValue(block, "clientNoticeSent");
  assert(clientNoticeSendPerformed === false, "CLIENT-039 client notice send must remain false");
  assert(exactBooleanFlagValue(block, "noticeQueueWritePerformed") === false, "CLIENT-039 notice queue write must remain false");
  assert(exactBooleanFlagValue(block, "clientNoticeSent") === false, "CLIENT-039 client notice send must remain false");
  assert(exactBooleanFlagValue(block, "eventPostPayloadChanged") === false, "CLIENT-039 client/API payload mutation must remain false");
  assert(exactBooleanFlagValue(block, "viewerClientPayloadChanged") === false, "CLIENT-039 exact viewerClientPayloadChanged reconciliation readback must remain false");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "outcomeReconciliationOnly",
    "preSimulationCompared",
    "postExecutionCompared",
    "executionObserved",
    "pilotExecutionPerformed",
    "sourceRecheckExecuted",
    "noticeQueueWritePerformed",
    "clientNoticeSent",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "runbookInstancePersisted",
    "approvalTicketWritePerformed",
    "operatorNoteWritePerformed",
    "viewerClientPayloadChanged",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "v370 outcome reconciliation boundary");
  }
  for (const flag of [
    "executionObserved",
    "pilotExecutionPerformed",
    "sourceRecheckExecuted",
    "noticeQueueWritePerformed",
    "clientNoticeSent",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "runbookInstancePersisted",
    "approvalTicketWritePerformed",
    "operatorNoteWritePerformed",
    "viewerClientPayloadChanged",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    const index = block.indexOf(flag);
    assert(index >= 0, `boundary flag missing: ${flag}`);
    const nearby = block.slice(index, index + 144);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  assert(exactBooleanFlagValue(block, "eventRecordWritePerformed") === false, "eventRecordWritePerformed must remain false");
  for (const forbidden of [
    "ExecuteSourceRecheck",
    "SendClientNotice",
    "PersistNoticeQueue",
    "PersistOutcome",
    "AppendEventRecord(",
    "AppendOpsAuditRecord(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `outcome reconciliation must not execute or expose restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the Outcome Reconciliation route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "request.path == \"/ops/api/diagnostics/log-tail\"");
  assertIncludes(block, route, "v370 outcome reconciliation route");
  assertIncludes(block, "request.method == \"GET\"", "v370 outcome reconciliation route");
  assertIncludes(block, "require_ops_principal()", "v370 outcome reconciliation route");
  assertIncludes(block, "OpsV370OutcomeReconciliationJson(", "v370 outcome reconciliation route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "v370 outcome reconciliation route");
  assertIncludes(block, "Cache-Control", "v370 outcome reconciliation route");
  assertIncludes(block, "no-store", "v370 outcome reconciliation route");
});

check("/ops dashboard declares and renders Outcome Reconciliation workspace", () => {
  const serverBlock = extractCppFunctionBlock(files.uiServerPages, "void AppendOpsDashboardPage(");
  for (const snippet of [
    "ops-site-outcome-reconciliation-workspace",
    "data-testid=\"ops-site-outcome-reconciliation-workspace\"",
    "data-v370-outcome-reconciliation",
    schema,
    "Outcome Reconciliation",
    "dashSiteOutcomeReconciliationBadges",
    "dashSiteOutcomeReconciliationText",
    "dashSiteOutcomeReconciliationSourceList",
    "dashSiteOutcomeReconciliationEventClientList",
    "dashSiteOutcomeReconciliationBoundary",
  ]) {
    assertIncludes(serverBlock, snippet, "v370 outcome reconciliation dashboard shell");
  }
  const scriptBlock = extractBlock(
    files.uiScript,
    "const renderV370OutcomeReconciliation",
    "const renderV370LimitedSafeExecutionPilot",
  );
  assertIncludes(scriptBlock, "dashSiteOutcomeReconciliationBoundary", "v370 outcome reconciliation product UI state");
  assert(!["send(", "sendClientNotice", "deliveryQueueWritePerformed: true"].some(marker => scriptBlock.includes(marker)), "UI-100 no-send explicit absence oracle");
  assertIncludes(files.uiScript, "/ops/dashboard", "UI-100 canonical route obligation");
  assertIncludes(files.server, "media-server.ops.v370-outcome-reconciliation.v1", "UI-100 canonical schema obligation");
  for (const snippet of [
    "refreshV370OutcomeReconciliation",
    route,
    "outcomeReconciliationItems",
    "outcomeReconciliationSummary",
    "preSimulationRef",
    "postExecutionRef",
    "sourceImpactDiff",
    "eventImpactDiff",
    "clientImpactDiff",
    "reconciliationStatus",
    "dashSiteOutcomeReconciliationSourceList",
    "dashSiteOutcomeReconciliationEventClientList",
    "requestJson(outcomeReconciliationRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v370 outcome reconciliation dashboard renderer");
  }
  const refreshBlock = extractBlock(files.uiScript, "async function refreshDashboard()", "async function refreshEvents()");
  assertIncludes(refreshBlock, "refreshV370OutcomeReconciliation", "dashboard refresh");
  assertIncludes(refreshBlock, route, "dashboard refresh");
});

check("Outcome Reconciliation styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-site-outcome-reconciliation-workspace",
    ".ops-site-outcome-reconciliation-grid",
    ".ops-site-outcome-reconciliation-list",
    ".ops-site-outcome-reconciliation-entry",
    ".ops-site-outcome-reconciliation-boundary",
    "body.ops-shell .ops-site-outcome-reconciliation-workspace",
  ]) {
    assertIncludes(files.css, snippet, "v370 outcome reconciliation CSS");
  }
});

check("client/viewer scripts do not receive v3.7 Outcome Reconciliation material", () => {
  for (const forbidden of [
    schema,
    route,
    "outcomeReconciliationItems",
    "reconciliationId",
    "preSimulationRef",
    "postExecutionRef",
    "sourceImpactDiff",
    "eventImpactDiff",
    "clientImpactDiff",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose v3.7 Outcome Reconciliation material: ${forbidden}`);
  }
});

check("현행 계약 식별자·기능 정의·검증 명령 연결", () => {
  const ids = ["UI-100","SRC-062","EVT-083","CLIENT-039","LAB-109","SAFE-177","OPS-144"];
  const currentDefinitions = files.featureInventory.split(/\r?\n/).filter(line => ids.includes(line.split("|")[1]?.trim())).join("\n");
  const errors = validateFeatureDocumentation({
    document: currentDefinitions, identifiers: ["/ops/api/site-operations/outcome-reconciliation"],
    command, script: "verify_v370_outcome_reconciliation.mjs", featureIds: ids,
    inventory: files.featureInventory, implementation: files.implementationManifest,
    verification: files.streamVerification, server: files.serverSh,
  });
  assert(errors.length === 0, errors.join("; "));
  // 독립 API 검사 결속이며 이 정적 명령의 실행 결과로 대체하지 않는다.
  for (const [id, expectedCommand, expectedFile] of [["SRC-062","verify-ops-source-registry-api","scripts/internal/verify_ops_source_registry_api.mjs"]]) {
    const entries = files.implementationManifest.items.filter(item => item.id === id);
    assert(entries.length === 1 && entries[0].verifierEvidence?.command === expectedCommand && entries[0].verifierEvidence?.file === expectedFile, id + " 독립 API 검증 연결 불일치");
  }

});

check("server entrypoint and inventory verifiers include v3.7 Step 16 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v370_outcome_reconciliation.mjs", "server.sh script dispatch");
  for (const id of ["UI-100", "SRC-062", "EVT-083", "CLIENT-039", "LAB-109", "SAFE-177", "OPS-144"]) {
    const expectedCommand = id === "SRC-062" ? "verify-ops-source-registry-api" : command;
    assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === expectedCommand, `${id} manifest verifier command drift`);
  }
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v370_outcome_reconciliation.mjs", "script inventory");
});

check("SAFE-177 canonical bounded product boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370OutcomeReconciliationJson(");
  const routeObserved = files.server.includes("/ops/api/site-operations/outcome-reconciliation");
  const safe177BoundaryObserved = block.includes("BuildV370OutcomeReconciliationItems") && block.includes("pilotExecutionPerformed");
  const writePerformed = /\b(?:Write|Persist|AppendFile|UpdateSource|CreateVaRule|UpdateVaRule|AssignReviewer|RecheckSource)[A-Za-z0-9_:]*\s*\(/.test(block);
  const mutationPerformed = writePerformed || /\b(?:Apply|AutomaticApply|SafeApply|SendClientNotice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const executionPerformed = /\b(?:Execute|RunSimulation|Probe|Contact|ProviderCall|ProviderClient|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const sendPerformed = /\bSendClientNotice[A-Za-z0-9_:]*\s*\(/.test(block);
  const automaticApplyPerformed = /\b(?:AutomaticApply|SafeApply|ApplyRule|ApplySource)[A-Za-z0-9_:]*\s*\(/.test(block);
  const fieldSmokeExecuted = /\b(?:ExecuteFieldSmoke|ProbeEndpoint|ContactDevice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const providerCallPerformed = /\b(?:ProviderCall|ProviderClient|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const rawMaterialExposed = /\\"(?:rawLocator|rawJson|rawProviderResponse|rawEndpoint|rawMaterial|rawDiagnosticJson)\\":true/.test(block);
  const sourceUrlExposed = /\\"(?:sourceUrlIncluded|sourceUrlExposed)\\":true/.test(block);
  const credentialMaterialExposed = /\\"(?:credentialMaterialIncluded|credentialMaterialExposed)\\":true/.test(block);
  const debugMaterialExposed = /\\"(?:debugMaterialIncluded|debugMaterialExposed)\\":true/.test(block);
  const viewerClientExposureAdded = /\\"(?:viewerClientExposureAdded|viewerClientPayloadChanged)\\":true/.test(block);
  const mediaPathChanged = /\\"rtspOrWebrtcMediaPathChanged\\":true/.test(block);
  assert(routeObserved && writePerformed === false && mutationPerformed === false && executionPerformed === false && sendPerformed === false && providerCallPerformed === false, "OPS-144 canonical bounded absence oracle");
  assert(safe177BoundaryObserved && block.includes("media-server.ops.v370-outcome-reconciliation.v1") && writePerformed === false && mutationPerformed === false && executionPerformed === false && sendPerformed === false && automaticApplyPerformed === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-177 pilotExecutionPerformed must remain no-execution no-write redacted and client/provider isolated");
});

const results = runChecks();
console.log("");
console.log("== v3.7.0 Outcome Reconciliation summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.7.0 (16)");
console.log(`- route: ${route}`);
console.log("- scope: source/event/client pre-simulation vs post-execution impact reconciliation");
console.log("- execution: not-run reconciliation; no pilot execution or write");
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
      console.log(`[fail] ${item.name}: ${error.message}`);
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
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing ${needle}`);
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `block start missing: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `block end missing after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
