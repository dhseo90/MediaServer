#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.8.0 Step 12 Outcome Observer and Reconciliation 구현, 문서, inventory 연결을 검증한다.

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
  printUsageAndExit(`v3.8.0 Outcome Observer and Reconciliation verification

Usage:
  ./server.sh verify-v380-outcome-observer-reconciliation

Checks:
  - /ops/api/actions/outcome-reconciliation exposes an Ops-only read model that compares readiness, candidate, and observed outcome refs
  - outcome observer keeps execution as not-run/pending and never writes EventRecord, source, rule, notice, approval, or media state
  - /ops action control workspace renders source/EventRecord/client/rule outcome diff signals without client/viewer exposure
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v380-outcome-observer-reconciliation";
const schema = "media-server.ops.v380-outcome-observer-reconciliation.v1";
const route = "/ops/api/actions/outcome-reconciliation";
const readinessRoute = "/ops/api/actions/readiness-preflight";
const sourceRecheckRoute = "/ops/api/actions/source-recheck-pilot";
const noticeRoute = "/ops/api/actions/client-notice-draft-queue";
const rulePackageRoute = "/ops/api/actions/rule-draft-package";
const featureIds = ["UI-104", "EVT-084", "CLIENT-041", "LAB-119", "SAFE-191", "OPS-158"];

const files = {
  server: readWebRtcHttpServerBundle(readText),
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

check("Ops server builds the v3.8 Outcome Observer and Reconciliation model", () => {
  for (const snippet of [
    "struct OpsV380OutcomeObserverReconciliationItem",
    "struct OpsV380OutcomeObserverReconciliationSummary",
    "BuildV380OutcomeObserverReconciliationItems",
    "BuildV380OutcomeObserverReconciliationSummary",
    "AppendV380OutcomeObserverReconciliationItemJson",
    "AppendV380OutcomeObserverReconciliationSummaryJson",
    "OpsV380OutcomeObserverReconciliationJson",
    schema,
    "outcomeObserverId",
    "actionRequestRef",
    "readinessRef",
    "executionCandidateRef",
    "observedOutcomeRef",
    "sourceOutcomeDiff",
    "eventRecordOutcomeDiff",
    "clientImpactOutcomeDiff",
    "ruleDraftOutcomeDiff",
    "reconciliationStatus",
    "pendingReason",
    "evidenceRefs",
    "observerSignals",
    "executionObserved",
    "readOnly",
  ]) {
    assertIncludes(files.server, snippet, "v380 outcome observer server model");
  }
  const producerBlock = extractCppFunctionBlock(files.server, "std::string OpsV380OutcomeObserverReconciliationJson(");
  assertIncludes(producerBlock, "media-server.ops.v380-outcome-observer-reconciliation.v1", "v380 outcome observer schema");
});

check("Outcome Observer derives from readiness, source recheck, notice, and rule package refs", () => {
  const block = extractBlock(
    files.server,
    "struct OpsV380OutcomeObserverReconciliationItem",
    "struct OpsV370SiteSourceGroupContractItem",
  );
  for (const snippet of [
    "BuildV380ActionRequestLedgerContractItems",
    "BuildV380ActionReadinessPreflightItems",
    "BuildV380SourceRecheckActionPilotItems",
    "BuildV380ClientNoticeDraftQueueItems",
    "BuildV380RuleDraftActionPackageItems",
    readinessRoute,
    sourceRecheckRoute,
    noticeRoute,
    rulePackageRoute,
    "readiness-to-outcome",
    "candidate-to-observed-outcome",
    "source-outcome-diff",
    "event-record-outcome-diff",
    "client-impact-outcome-diff",
    "rule-draft-outcome-diff",
  ]) {
    assertIncludes(block, snippet, "v380 outcome observer derivation");
  }
});

check("Outcome Observer preserves pending/not-run and no-mutation boundaries", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV380OutcomeObserverReconciliationJson(");
  const rawMaterialExposed = /raw(?:Evidence|Json|Locator).*true/.test(block);
  const credentialMaterialExposed = /credential(?:Material|Ref)?.*true/i.test(block);
  const clientNoticeSendPerformed = exactBooleanFlagValue(block, "clientNoticeSent");
  assert(clientNoticeSendPerformed === false, "CLIENT-041 client notice delivery must remain false");
  assert(exactBooleanFlagValue(block, "clientNoticeSent") === false, "CLIENT-041 client notice delivery must remain false");
  assert(rawMaterialExposed === false, "CLIENT-041 viewer raw material must remain redacted");
  assert(credentialMaterialExposed === false, "CLIENT-041 credential material must remain redacted");
  assert(exactBooleanFlagValue(block, "viewerClientPayloadChanged") === false, "CLIENT-041 exact viewerClientPayloadChanged observer readback must remain false for /ops and /client");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "outcomeObserverOnly",
    "readinessCompared",
    "candidateCompared",
    "observedOutcomeCompared",
    "executionObserved",
    "actionExecutionPerformed",
    "sourceRecheckExecuted",
    "clientNoticeSent",
    "noticeQueueWritePerformed",
    "ruleApplyPerformed",
    "ruleRegistryWritePerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "actionResultPersisted",
    "viewerClientPayloadChanged",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "v380 outcome observer boundary");
  }
  for (const flag of [
    "executionObserved",
    "actionExecutionPerformed",
    "sourceRecheckExecuted",
    "clientNoticeSent",
    "noticeQueueWritePerformed",
    "ruleApplyPerformed",
    "ruleRegistryWritePerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "actionResultPersisted",
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
    const nearby = block.slice(index, index + 160);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  assert(exactBooleanFlagValue(block, "eventRecordWritePerformed") === false, "eventRecordWritePerformed must remain false");
  for (const forbidden of [
    "ExecuteSourceRecheck",
    "SendClientNotice",
    "PersistNoticeQueue",
    "ApplyRuleDraft",
    "PersistOutcome",
    "AppendEventRecord(",
    "AppendOpsAuditRecord(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `outcome observer must not execute or expose restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the Outcome Observer route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "request.path == \"/ops/api/site-operations/source-group-contract\"");
  assertIncludes(block, route, "v380 outcome observer route");
  assertIncludes(block, "request.method == \"GET\"", "v380 outcome observer route");
  assertIncludes(block, "require_ops_principal()", "v380 outcome observer route");
  assertIncludes(block, "OpsV380OutcomeObserverReconciliationJson()", "v380 outcome observer route");
  assertIncludes(block, "Cache-Control", "v380 outcome observer route");
  assertIncludes(block, "no-store", "v380 outcome observer route");
});

check("/ops action control workspace declares and renders Outcome Observer signals", () => {
  const serverBlock = extractBlock(files.server, "void AppendOpsDashboardPage", "section class=\"section-card ops-workspace-wide ops-site-client-notice-workspace");
  for (const snippet of [
    "ops-action-outcome-observer",
    "data-testid=\"ops-action-outcome-observer\"",
    "data-v380-outcome-observer-reconciliation",
    schema,
    "Outcome Observer",
    "dashActionOutcomeObserverBadges",
    "dashActionOutcomeObserverText",
    "dashActionOutcomeSourceList",
    "dashActionOutcomeEventClientList",
    "dashActionOutcomeRuleList",
    "dashActionOutcomeBoundary",
  ]) {
    assertIncludes(serverBlock, snippet, "v380 outcome observer dashboard shell");
  }
  const scriptBlock = extractBlock(
    files.uiScript,
    "const renderV380OutcomeObserverReconciliation",
    "let v370OutcomeReconciliationState",
  );
  for (const snippet of [
    "refreshV380OutcomeObserverReconciliation",
    route,
    "outcomeObserverItems",
    "outcomeObserverSummary",
    "readinessRef",
    "executionCandidateRef",
    "observedOutcomeRef",
    "sourceOutcomeDiff",
    "eventRecordOutcomeDiff",
    "clientImpactOutcomeDiff",
    "ruleDraftOutcomeDiff",
    "dashActionOutcomeSourceList",
    "dashActionOutcomeEventClientList",
    "dashActionOutcomeRuleList",
    "requestJson(outcomeObserverRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v380 outcome observer renderer");
  }
  const dashboardRoutePresent = files.server.includes('path == "/ops/dashboard"');
  const schemaPresent = serverBlock.includes("media-server.ops.v380-outcome-observer-reconciliation.v1");
  const writePerformed = /\bmethod\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i.test(scriptBlock);
  const sendPerformed = /\b(?:sendClientNotice|deliverClientNotice|enqueueClientNotice)\s*\(/.test(scriptBlock);
  const schemaChanged = /\b(?:eventSchema|mediaSchema|payloadSchema)\s*=/.test(scriptBlock);
  assert(dashboardRoutePresent, "v380 outcome observer dashboard route missing");
  assert(schemaPresent, "v380 outcome observer schema missing");
  assert(writePerformed === false, "v380 outcome observer renderer must not write state");
  assert(sendPerformed === false, "v380 outcome observer renderer must not send notices");
  assert(schemaChanged === false, "v380 outcome observer renderer must not mutate schema");
  assertIncludes(scriptBlock, "dashActionOutcomeBoundary", "v380 outcome observer boundary state");
  const refreshBlock = extractBlock(files.uiScript, "async function refreshDashboard()", "async function refreshEvents()");
  assertIncludes(refreshBlock, "refreshV380OutcomeObserverReconciliation", "dashboard refresh");
  assertIncludes(refreshBlock, route, "dashboard refresh");
});

check("Outcome Observer styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-action-outcome-observer",
    ".ops-action-outcome-grid",
    ".ops-action-outcome-list",
    ".ops-action-outcome-entry",
    ".ops-action-outcome-boundary",
    "body.ops-shell .ops-action-outcome-observer",
  ]) {
    assertIncludes(files.css, snippet, "v380 outcome observer CSS");
  }
});

check("client/viewer scripts do not receive v3.8 Outcome Observer material", () => {
  for (const forbidden of [
    schema,
    route,
    "outcomeObserverItems",
    "outcomeObserverId",
    "readinessRef",
    "executionCandidateRef",
    "observedOutcomeRef",
    "sourceOutcomeDiff",
    "eventRecordOutcomeDiff",
    "ruleDraftOutcomeDiff",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose v3.8 Outcome Observer material: ${forbidden}`);
  }
});

check("roadmap, stream verification, inventory, and release records map v3.8 Step 12", () => {
  for (const snippet of [
    "| 12 | v3.8.0 (12) Outcome Observer and Reconciliation | P1 | 완료 |",
    "## v3.8.0 Step 12 개발 기록",
    route,
    "OpsV380OutcomeObserverReconciliationJson",
    `\`./server.sh ${command}\``,
    "Action Receipt Bundle 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.8 Step 12");
  }
  for (const snippet of [
    `| v3.8.0 (12) | \`./server.sh ${command}\` | Outcome Observer and Reconciliation.`,
    "readiness/outcome diff",
    "source/EventRecord/client/rule outcome diff",
    "not-run",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.8 Step 12");
  }
  for (const snippet of [
    `v3.8.0 (12) Outcome Observer and Reconciliation | \`UI-104\`, \`EVT-084\`, \`CLIENT-041\`, \`LAB-119\`, \`SAFE-191\`, \`OPS-158\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-104 | V380 Step 12 Outcome Observer and Reconciliation UI",
    "EVT-084 | V380 Step 12 EventRecord outcome observer",
    "CLIENT-041 | V380 Step 12 client impact outcome observer",
    "LAB-119 | V380 Step 12 Outcome Observer harness",
    "SAFE-191 | V380 Step 12 Outcome Observer boundary",
    "OPS-158 | V380 Step 12 Outcome Observer 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.8 Step 12");
  }
  for (const snippet of [
    "V380 Outcome Observer and Reconciliation",
    `\`./server.sh ${command}\``,
    "v380 Step 12 RED outcome observer reconciliation gate",
    "v380 Step 12 Outcome Observer and Reconciliation final",
    "v380 Step 12 UI 풀테스트",
    "v380 Step 12 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.8 Step 12");
  }
});

check("server entrypoint and inventory verifiers include v3.8 Step 12 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v380_outcome_observer_reconciliation.mjs", "server.sh script dispatch");
  for (const id of ["UI-104", "EVT-084", "CLIENT-041", "LAB-119", "SAFE-191", "OPS-158"]) assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v380_outcome_observer_reconciliation.mjs", "script inventory");
});

check("SAFE-191 canonical bounded product boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV380OutcomeObserverReconciliationJson(");
  const routeObserved = files.server.includes("/ops/api/actions/outcome-reconciliation");
  const outcomeObserved = files.uiScript.includes("renderV380OutcomeObserverReconciliation");
  const safe191BoundaryObserved = block.includes("BuildV380OutcomeObserverReconciliationItems") && block.includes("actionExecutionPerformed");
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
  assert(routeObserved && outcomeObserved && writePerformed === false && mutationPerformed === false && executionPerformed === false && sendPerformed === false && providerCallPerformed === false, "OPS-158 canonical bounded absence oracle");
  assert(safe191BoundaryObserved && block.includes("media-server.ops.v380-outcome-observer-reconciliation.v1") && writePerformed === false && mutationPerformed === false && executionPerformed === false && sendPerformed === false && automaticApplyPerformed === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-191 actionExecutionPerformed must remain no-execution no-write redacted and client/provider isolated");
});

const results = runChecks();
console.log("");
console.log("== v3.8.0 Outcome Observer and Reconciliation summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.8.0 (12)");
console.log(`- route: ${route}`);
console.log("- scope: readiness/candidate/observed outcome reconciliation");
console.log("- execution: not-run observer; no action execution or write");
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
  assert(text.includes(needle), `${label} missing: ${needle}`);
}

function extractBlock(text, start, end) {
  const startIndex = text.indexOf(start);
  assert(startIndex >= 0, `block start not found: ${start}`);
  const endIndex = text.indexOf(end, startIndex + start.length);
  assert(endIndex > startIndex, `block end not found after ${start}: ${end}`);
  return text.slice(startIndex, endIndex);
}
