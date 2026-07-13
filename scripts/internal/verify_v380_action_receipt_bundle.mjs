#!/usr/bin/env node
// 파일 용도: v3.8.0 Step 13 Action Receipt Bundle 구현, 문서, inventory 연결을 검증한다.

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
  printUsageAndExit(`v3.8.0 Action Receipt Bundle verification

Usage:
  ./server.sh verify-v380-action-receipt-bundle

Checks:
  - /ops/api/actions/receipt-bundle exposes an Ops-only read model that bundles request, approval, readiness, candidate, and outcome diff refs
  - receipt bundle is redacted, release-safe, handoff-oriented, and never writes files, artifacts, handoff state, EventRecord, source, rule, notice, approval, or media state
  - /ops action control workspace renders receipt bundle, handoff map, and redaction review signals without client/viewer exposure
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v380-action-receipt-bundle";
const schema = "media-server.ops.v380-action-receipt-bundle.v1";
const route = "/ops/api/actions/receipt-bundle";
const requestRoute = "/ops/api/actions/request-ledger";
const approvalRoute = "/ops/api/actions/approval-decision-gate";
const readinessRoute = "/ops/api/actions/readiness-preflight";
const sourceRecheckRoute = "/ops/api/actions/source-recheck-pilot";
const noticeRoute = "/ops/api/actions/client-notice-draft-queue";
const rulePackageRoute = "/ops/api/actions/rule-draft-package";
const outcomeRoute = "/ops/api/actions/outcome-reconciliation";
const featureIds = ["UI-105", "EVT-085", "CLIENT-042", "LAB-120", "SAFE-192", "OPS-159"];

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

check("Ops server builds the v3.8 Action Receipt Bundle model", () => {
  for (const snippet of [
    "struct OpsV380ActionReceiptBundleItem",
    "struct OpsV380ActionReceiptBundleSummary",
    "BuildV380ActionReceiptBundleItems",
    "BuildV380ActionReceiptBundleSummary",
    "AppendV380ActionReceiptBundleItemJson",
    "AppendV380ActionReceiptBundleSummaryJson",
    "OpsV380ActionReceiptBundleJson",
    schema,
    "receiptBundleId",
    "actionRequestRef",
    "approvalDecisionRef",
    "readinessRef",
    "executionCandidateRef",
    "outcomeDiffRef",
    "redactionSummary",
    "handoffMap",
    "receiptState",
    "releaseSafe",
    "bundleSignals",
    "readOnly",
  ]) {
    assertIncludes(files.server, snippet, "v380 action receipt bundle server model");
  }
  const producerBlock = extractCppFunctionBlock(files.server, "std::string OpsV380ActionReceiptBundleJson(");
  assertIncludes(producerBlock, "media-server.ops.v380-action-receipt-bundle.v1", "v380 action receipt bundle schema");
});

check("Action Receipt Bundle derives from request, approval, readiness, candidate, and outcome refs", () => {
  const block = extractBlock(
    files.server,
    "struct OpsV380ActionReceiptBundleItem",
    "struct OpsV370SiteSourceGroupContractItem",
  );
  for (const snippet of [
    "BuildV380ActionRequestLedgerContractItems",
    "BuildV380ApprovalDecisionGateItems",
    "BuildV380ActionReadinessPreflightItems",
    "BuildV380SourceRecheckActionPilotItems",
    "BuildV380ClientNoticeDraftQueueItems",
    "BuildV380RuleDraftActionPackageItems",
    "BuildV380OutcomeObserverReconciliationItems",
    requestRoute,
    approvalRoute,
    readinessRoute,
    sourceRecheckRoute,
    noticeRoute,
    rulePackageRoute,
    outcomeRoute,
    "request-to-receipt",
    "approval-to-receipt",
    "readiness-to-receipt",
    "candidate-to-receipt",
    "outcome-diff-to-receipt",
    "release-safe-handoff",
  ]) {
    assertIncludes(block, snippet, "v380 action receipt bundle derivation");
  }
});

check("Action Receipt Bundle preserves redaction, release-safe, and no-mutation boundaries", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV380ActionReceiptBundleJson(");
  assert(exactBooleanFlagValue(block, "rawLocatorIncluded") === false, "CLIENT-042 viewer raw material must remain redacted");
  assert(exactBooleanFlagValue(block, "credentialMaterialIncluded") === false, "CLIENT-042 credential material must remain redacted");
  assert(exactBooleanFlagValue(block, "viewerClientPayloadChanged") === false, "CLIENT-042 exact viewerClientPayloadChanged receipt redaction readback must remain false for /ops and /client");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "receiptBundleOnly",
    "redacted",
    "releaseSafe",
    "handoffMapOnly",
    "bundlePersisted",
    "artifactFileWritePerformed",
    "handoffWritePerformed",
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
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "rawDiagnosticJsonIncluded",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "v380 action receipt bundle boundary");
  }
  for (const flag of [
    "bundlePersisted",
    "artifactFileWritePerformed",
    "handoffWritePerformed",
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
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "rawDiagnosticJsonIncluded",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    const index = block.indexOf(flag);
    assert(index >= 0, `boundary flag missing: ${flag}`);
    const nearby = block.slice(index, index + 180);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  assert(exactBooleanFlagValue(block, "eventRecordWritePerformed") === false, "eventRecordWritePerformed must remain false");
  for (const forbidden of [
    "PersistReceiptBundle",
    "WriteReceiptBundleFile",
    "AppendHandoffBundle",
    "ExecuteSourceRecheck",
    "SendClientNotice",
    "PersistNoticeQueue",
    "ApplyRuleDraft",
    "AppendEventRecord(",
    "AppendOpsAuditRecord(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `receipt bundle must not write or expose restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the Action Receipt Bundle route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "request.path == \"/ops/api/site-operations/source-group-contract\"");
  assertIncludes(block, route, "v380 action receipt bundle route");
  assertIncludes(block, "request.method == \"GET\"", "v380 action receipt bundle route");
  assertIncludes(block, "require_ops_principal()", "v380 action receipt bundle route");
  assertIncludes(block, "OpsV380ActionReceiptBundleJson()", "v380 action receipt bundle route");
  assertIncludes(block, "Cache-Control", "v380 action receipt bundle route");
  assertIncludes(block, "no-store", "v380 action receipt bundle route");
});

check("/ops action control workspace declares and renders Action Receipt Bundle signals", () => {
  const serverBlock = extractBlock(files.server, "void AppendOpsDashboardPage", "section class=\"section-card ops-workspace-wide ops-site-client-notice-workspace");
  for (const snippet of [
    "ops-action-receipt-bundle",
    "data-testid=\"ops-action-receipt-bundle\"",
    "data-v380-action-receipt-bundle",
    schema,
    "Action Receipt Bundle",
    "dashActionReceiptBundleBadges",
    "dashActionReceiptBundleText",
    "dashActionReceiptBundleList",
    "dashActionReceiptHandoffList",
    "dashActionReceiptRedactionList",
    "dashActionReceiptBundleBoundary",
  ]) {
    assertIncludes(serverBlock, snippet, "v380 action receipt bundle dashboard shell");
  }
  const scriptBlock = extractBlock(
    files.uiScript,
    "const renderV380ActionReceiptBundle",
    "let v370OutcomeReconciliationState",
  );
  for (const snippet of [
    "refreshV380ActionReceiptBundle",
    route,
    "receiptBundleItems",
    "receiptBundleSummary",
    "handoffMap",
    "redactionSummary",
    "releaseSafe",
    "dashActionReceiptBundleList",
    "dashActionReceiptHandoffList",
    "dashActionReceiptRedactionList",
    "requestJson(receiptBundleRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v380 action receipt bundle renderer");
  }
  const dashboardRoutePresent = files.server.includes('path == "/ops/dashboard"');
  const schemaPresent = serverBlock.includes("media-server.ops.v380-action-receipt-bundle.v1");
  const writePerformed = /\bmethod\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i.test(scriptBlock);
  const rawMaterialExposed = /\b(?:rawEvidence|rawJson|rawLocator)\b/.test(scriptBlock);
  const sourceUrlExposed = /\bsourceUrl\b/.test(scriptBlock);
  const credentialExposed = /\b(?:credentialValue|credentialReferenceValue|rawCredential|secretMaterial)\b/i.test(scriptBlock);
  assert(dashboardRoutePresent, "v380 action receipt dashboard route missing");
  assert(schemaPresent, "v380 action receipt schema missing");
  assert(writePerformed === false, "v380 action receipt renderer must not write state");
  assert(rawMaterialExposed === false, "v380 action receipt renderer must redact raw material");
  assert(sourceUrlExposed === false, "v380 action receipt renderer must redact source URLs");
  assert(credentialExposed === false, "v380 action receipt renderer must redact credentials");
  assertIncludes(scriptBlock, "dashActionReceiptBundleBoundary", "v380 action receipt boundary state");
  const refreshBlock = extractBlock(files.uiScript, "async function refreshDashboard()", "async function refreshEvents()");
  assertIncludes(refreshBlock, "refreshV380ActionReceiptBundle", "dashboard refresh");
  assertIncludes(refreshBlock, route, "dashboard refresh");
});

check("Action Receipt Bundle styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-action-receipt-bundle",
    ".ops-action-receipt-grid",
    ".ops-action-receipt-list",
    ".ops-action-receipt-entry",
    ".ops-action-receipt-boundary",
    "body.ops-shell .ops-action-receipt-bundle",
  ]) {
    assertIncludes(files.css, snippet, "v380 action receipt bundle CSS");
  }
});

check("client/viewer scripts do not receive v3.8 Action Receipt Bundle material", () => {
  for (const forbidden of [
    schema,
    route,
    "receiptBundleItems",
    "receiptBundleId",
    "approvalDecisionRef",
    "executionCandidateRef",
    "outcomeDiffRef",
    "redactionSummary",
    "handoffMap",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose v3.8 Action Receipt Bundle material: ${forbidden}`);
  }
});

check("roadmap, stream verification, inventory, and release records map v3.8 Step 13", () => {
  for (const snippet of [
    "| 13 | v3.8.0 (13) Action Receipt Bundle | P1 | 완료 |",
    "## v3.8.0 Step 13 개발 기록",
    route,
    "OpsV380ActionReceiptBundleJson",
    `\`./server.sh ${command}\``,
    "Field Connector Evidence Package 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.8 Step 13");
  }
  for (const snippet of [
    `| v3.8.0 (13) | \`./server.sh ${command}\` | Action Receipt Bundle.`,
    "redacted release-safe receipt bundle",
    "handoff map",
    "not-run",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.8 Step 13");
  }
  for (const snippet of [
    `v3.8.0 (13) Action Receipt Bundle | \`UI-105\`, \`EVT-085\`, \`CLIENT-042\`, \`LAB-120\`, \`SAFE-192\`, \`OPS-159\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-105 | V380 Step 13 Action Receipt Bundle UI",
    "EVT-085 | V380 Step 13 EventRecord receipt reference",
    "CLIENT-042 | V380 Step 13 client-safe receipt redaction",
    "LAB-120 | V380 Step 13 Action Receipt Bundle harness",
    "SAFE-192 | V380 Step 13 Action Receipt Bundle boundary",
    "OPS-159 | V380 Step 13 Action Receipt Bundle 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.8 Step 13");
  }
  for (const snippet of [
    "V380 Action Receipt Bundle",
    `\`./server.sh ${command}\``,
    "v380 Step 13 RED Action Receipt Bundle gate",
    "v380 Step 13 Action Receipt Bundle final",
    "v380 Step 13 UI 풀테스트",
    "v380 Step 13 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.8 Step 13");
  }
});

check("server entrypoint and inventory verifiers include v3.8 Step 13 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v380_action_receipt_bundle.mjs", "server.sh script dispatch");
  for (const id of featureIds) {
    assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  }
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v380_action_receipt_bundle.mjs", "script inventory");
});

check("SAFE-192 canonical bounded product boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV380ActionReceiptBundleJson(");
  const routeObserved = files.server.includes("/ops/api/actions/receipt-bundle");
  const outcomeObserved = files.uiScript.includes("renderV380ActionReceiptBundle");
  const safe192BoundaryObserved = block.includes("BuildV380ActionReceiptBundleItems") && block.includes("bundlePersisted");
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
  assert(routeObserved && outcomeObserved && writePerformed === false && mutationPerformed === false && executionPerformed === false && sendPerformed === false && providerCallPerformed === false, "OPS-159 canonical bounded absence oracle");
  assert(safe192BoundaryObserved && block.includes("media-server.ops.v380-action-receipt-bundle.v1") && writePerformed === false && mutationPerformed === false && executionPerformed === false && sendPerformed === false && automaticApplyPerformed === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-192 bundlePersisted must remain no-execution no-write redacted and client/provider isolated");
});

const results = runChecks();
console.log("");
console.log("== v3.8.0 Action Receipt Bundle summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.8.0 (13)");
console.log(`- route: ${route}`);
console.log("- scope: redacted approval/request/readiness/candidate/outcome receipt bundle");
console.log("- execution: read-only bundle; no artifact, handoff, action, source, notice, rule, or media write");
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
