#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.7.0 Step 17 Export / Handoff Bundle 연결, 문서, 경계를 검증한다.

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
  printUsageAndExit(`v3.7.0 Export / Handoff Bundle verification

Usage:
  ./server.sh verify-v370-export-handoff-bundle

Checks:
  - /ops/api/site-operations/export-handoff-bundle combines site, runbook, evidence, approval, and outcome refs into a redacted release-safe handoff bundle
  - bundle remains read-only and does not write files, export artifacts, persist handoff state, send notices, or mutate media/schema/runtime state
  - /ops dashboard renders bundle, handoff, redaction, and release safety signals without client/viewer injection
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v370-export-handoff-bundle";
const schema = "media-server.ops.v370-export-handoff-bundle.v1";
const route = "/ops/api/site-operations/export-handoff-bundle";
const sourceRegistryRoute = "/ops/api/site-operations/source-registry-projection";
const runbookRoute = "/ops/api/site-operations/runbook-instance-ledger";
const evidenceRoute = "/ops/api/site-operations/field-evidence-attachment";
const approvalRoute = "/ops/api/site-operations/approval-ticket-workflow";
const outcomeRoute = "/ops/api/site-operations/outcome-reconciliation";
const featureIds = ["UI-101", "LAB-110", "SAFE-178", "OPS-145"];

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

check("Ops server builds the v3.7 Export / Handoff Bundle model", () => {
  for (const snippet of [
    "struct OpsV370ExportHandoffBundleItem",
    "struct OpsV370ExportHandoffMapEntry",
    "struct OpsV370ExportHandoffBundleSummary",
    "BuildV370ExportHandoffBundleItems",
    "BuildV370ExportHandoffMapEntries",
    "BuildV370ExportHandoffBundleSummary",
    "AppendV370ExportHandoffBundleItemJson",
    "AppendV370ExportHandoffMapEntryJson",
    "AppendV370ExportHandoffBundleSummaryJson",
    "OpsV370ExportHandoffBundleJson",
    schema,
    "exportHandoffBundleItems",
    "exportHandoffMapEntries",
    "siteRefs",
    "runbookRefs",
    "evidenceRefs",
    "approvalRefs",
    "outcomeRefs",
    "redactionReview",
    "releaseSafe",
    "handoffReady",
  ]) {
    assertIncludes(files.server, snippet, "v370 export handoff bundle server model");
  }
});

check("Export / Handoff Bundle derives from site, runbook, evidence, approval, and outcome refs", () => {
  const block = extractBlock(
    files.server,
    "struct OpsV370ExportHandoffBundleItem",
    "struct OpsV360RuleVaWhatIfReplayCandidate",
  );
  for (const snippet of [
    "BuildV370SiteAwareSourceRegistryProjectionItems",
    "BuildV370RunbookInstanceLedgerEntries",
    "BuildV370FieldEvidenceAttachmentItems",
    "BuildV370ApprovalTicketWorkflowItems",
    "BuildV370OutcomeReconciliationItems",
    sourceRegistryRoute,
    runbookRoute,
    evidenceRoute,
    approvalRoute,
    outcomeRoute,
    "redacted-release-safe",
    "handoffStatus",
    "nextOperatorRole",
    "blockedReason",
  ]) {
    assertIncludes(block, snippet, "v370 export handoff derivation");
  }
});

check("Export / Handoff Bundle preserves release-safe redaction and no-mutation boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV370ExportHandoffBundleJson",
    "struct OpsV360RuleVaWhatIfReplayCandidate",
  );
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "releaseSafe",
    "redacted",
    "exportHandoffOnly",
    "artifactExportExecuted",
    "bundlePersisted",
    "fileWritePerformed",
    "handoffWritePerformed",
    "pilotExecutionPerformed",
    "sourceRecheckExecuted",
    "noticeQueueWritePerformed",
    "clientNoticeSent",
    "fieldSmokeExecuted",
    "endpointProbePerformed",
    "providerCallPerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "runbookInstancePersisted",
    "approvalTicketWritePerformed",
    "operatorNoteWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientPayloadChanged",
    "rawLocatorIncluded",
    "rawEndpointIncluded",
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
    assertIncludes(block, snippet, "v370 export handoff boundary");
  }
  for (const flag of [
    "artifactExportExecuted",
    "bundlePersisted",
    "fileWritePerformed",
    "handoffWritePerformed",
    "pilotExecutionPerformed",
    "sourceRecheckExecuted",
    "noticeQueueWritePerformed",
    "clientNoticeSent",
    "fieldSmokeExecuted",
    "endpointProbePerformed",
    "providerCallPerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "runbookInstancePersisted",
    "approvalTicketWritePerformed",
    "operatorNoteWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientPayloadChanged",
    "rawLocatorIncluded",
    "rawEndpointIncluded",
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
    assert(index >= 0, `boundary flag missing: ${flag}`);
    const nearby = block.slice(index, index + 144);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  for (const forbidden of [
    "WriteExportBundle",
    "PersistHandoffBundle",
    "PersistOutcome",
    "ExecuteSourceRecheck",
    "SendClientNotice",
    "PersistNoticeQueue",
    "AppendEventRecord(",
    "AppendOpsAuditRecord(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `export handoff bundle must not execute, persist, or expose restricted material: ${forbidden}`);
  }
});

check("Ops API exposes Export / Handoff Bundle route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "request.path == \"/ops/api/diagnostics/log-tail\"");
  assertIncludes(block, route, "v370 export handoff bundle route");
  assertIncludes(block, "request.method == \"GET\"", "v370 export handoff bundle route");
  assertIncludes(block, "require_ops_principal()", "v370 export handoff bundle route");
  assertIncludes(block, "OpsV370ExportHandoffBundleJson(", "v370 export handoff bundle route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "v370 export handoff bundle route");
  assertIncludes(block, "Cache-Control", "v370 export handoff bundle route");
  assertIncludes(block, "no-store", "v370 export handoff bundle route");
});

check("/ops dashboard declares and renders Export / Handoff Bundle workspace", () => {
  const serverBlock = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "ops-site-export-handoff-bundle-workspace",
    "data-testid=\"ops-site-export-handoff-bundle-workspace\"",
    "data-v370-export-handoff-bundle",
    schema,
    "Export / Handoff Bundle",
    "dashSiteExportHandoffBundleBadges",
    "dashSiteExportHandoffBundleText",
    "dashSiteExportHandoffBundleList",
    "dashSiteExportHandoffMapList",
    "dashSiteExportHandoffRedactionList",
    "dashSiteExportHandoffBundleBoundary",
  ]) {
    assertIncludes(serverBlock, snippet, "v370 export handoff dashboard shell");
  }
  const scriptBlock = extractBlock(
    files.uiScript,
    "const renderV370ExportHandoffBundle",
    "const renderV370OutcomeReconciliation",
  );
  for (const snippet of [
    "refreshV370ExportHandoffBundle",
    route,
    "exportHandoffBundleItems",
    "exportHandoffMapEntries",
    "exportHandoffBundleSummary",
    "siteRefs",
    "runbookRefs",
    "evidenceRefs",
    "approvalRefs",
    "outcomeRefs",
    "redactionReview",
    "dashSiteExportHandoffBundleList",
    "dashSiteExportHandoffMapList",
    "dashSiteExportHandoffRedactionList",
    "requestJson(exportHandoffBundleRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v370 export handoff dashboard renderer");
  }
  const dashboardRoutePresent = files.server.includes('path == "/ops/dashboard"');
  const schemaPresent = serverBlock.includes("media-server.ops.v370-export-handoff-bundle.v1");
  const writePerformed = /\bmethod\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i.test(scriptBlock);
  const sendPerformed = /\b(?:sendClientNotice|deliverClientNotice|enqueueClientNotice)\s*\(/.test(scriptBlock);
  const rawMaterialExposed = /\b(?:rawEvidence|rawJson|rawLocator)\b/.test(scriptBlock);
  assert(dashboardRoutePresent, "v370 export handoff dashboard route missing");
  assert(schemaPresent, "v370 export handoff schema missing from exact dashboard block");
  assert(writePerformed === false, "v370 export handoff renderer must not perform write actions");
  assert(sendPerformed === false, "v370 export handoff renderer must not send client notices");
  assert(rawMaterialExposed === false, "v370 export handoff renderer must not expose raw material");
  assertIncludes(scriptBlock, "dashSiteExportHandoffBundleBoundary", "v370 export handoff boundary state");
  const refreshBlock = extractBlock(files.uiScript, "async function refreshDashboard()", "async function refreshEvents()");
  assertIncludes(refreshBlock, "refreshV370ExportHandoffBundle", "dashboard refresh");
  assertIncludes(refreshBlock, route, "dashboard refresh");
});

check("Export / Handoff Bundle styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-site-export-handoff-bundle-workspace",
    ".ops-site-export-handoff-bundle-grid",
    ".ops-site-export-handoff-bundle-list",
    ".ops-site-export-handoff-bundle-entry",
    ".ops-site-export-handoff-bundle-boundary",
    "body.ops-shell .ops-site-export-handoff-bundle-workspace",
  ]) {
    assertIncludes(files.css, snippet, "v370 export handoff CSS");
  }
});

check("client/viewer scripts do not receive v3.7 Export / Handoff Bundle material", () => {
  for (const forbidden of [
    schema,
    route,
    "exportHandoffBundleItems",
    "exportHandoffMapEntries",
    "handoffStatus",
    "nextOperatorRole",
    "blockedReason",
    "redactionReview",
    "rawDiagnosticJsonIncluded",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose v3.7 Export / Handoff Bundle material: ${forbidden}`);
  }
});

check("roadmap, stream verification, inventory, and release records map v3.7 Step 17", () => {
  for (const snippet of [
    "| 17 | v3.7.0 (17) Export / Handoff Bundle | P1 | 완료 |",
    "## v3.7.0 Step 17 개발 기록",
    route,
    "OpsV370ExportHandoffBundleJson",
    `\`./server.sh ${command}\``,
    "Stabilization and Release Readiness 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.7 Step 17");
  }
  for (const snippet of [
    `| v3.7.0 (17) | \`./server.sh ${command}\` | Export / Handoff Bundle.`,
    "site/runbook/evidence/approval/outcome",
    "redacted release-safe handoff bundle",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.7 Step 17");
  }
  for (const snippet of [
    `v3.7.0 (17) Export / Handoff Bundle | \`UI-101\`, \`LAB-110\`, \`SAFE-178\`, \`OPS-145\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-101 | V370 Step 17 Export / Handoff Bundle UI",
    "LAB-110 | V370 Step 17 Export / Handoff Bundle harness",
    "SAFE-178 | V370 Step 17 Export / Handoff Bundle boundary",
    "OPS-145 | V370 Step 17 Export / Handoff Bundle 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.7 Step 17");
  }
  for (const snippet of [
    "V370 Export / Handoff Bundle",
    `\`./server.sh ${command}\``,
    "v370 Step 17 RED export handoff bundle gate",
    "v370 Step 17 export handoff bundle final",
    "v370 Step 17 UI 풀테스트",
    "v370 Step 17 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.7 Step 17");
  }
});

check("server entrypoint and inventory verifiers include v3.7 Step 17 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v370_export_handoff_bundle.mjs", "server.sh script dispatch");
  for (const id of ["UI-101", "LAB-110", "SAFE-178", "OPS-145"]) assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v370_export_handoff_bundle.mjs", "script inventory");
});

check("SAFE-178 canonical bounded product boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370ExportHandoffBundleJson(");
  const routeObserved = files.server.includes("/ops/api/site-operations/export-handoff-bundle");
  const safe178BoundaryObserved = block.includes("BuildV370ExportHandoffBundleItems") && block.includes("artifactExportExecuted");
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
  assert(routeObserved && writePerformed === false && mutationPerformed === false && executionPerformed === false && sendPerformed === false && providerCallPerformed === false, "OPS-145 canonical bounded absence oracle");
  assert(safe178BoundaryObserved && block.includes("media-server.ops.v370-export-handoff-bundle.v1") && writePerformed === false && mutationPerformed === false && executionPerformed === false && sendPerformed === false && automaticApplyPerformed === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-178 artifactExportExecuted must remain no-execution no-write redacted and client/provider isolated");
});

const results = runChecks();
console.log("");
console.log("== v3.7.0 Export / Handoff Bundle summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.7.0 (17)");
console.log(`- route: ${route}`);
console.log("- combines: site, runbook, evidence, approval, and outcome refs");
console.log("- writes: no artifact export, file write, handoff write, execution, source/view/runbook/approval/EventRecord/Ops audit/client/media mutation performed");
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
