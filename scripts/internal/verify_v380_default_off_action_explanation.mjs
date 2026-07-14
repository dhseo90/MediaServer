#!/usr/bin/env node
// 파일 용도: v3.8.0 Step 15 Default-off Action Explanation 구현, 문서, inventory 연결을 검증한다.

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
  printUsageAndExit(`v3.8.0 Default-off Action Explanation verification

Usage:
  ./server.sh verify-v380-default-off-action-explanation

Checks:
  - /ops/api/actions/default-off-explanation exposes an Ops-only read model for approval blockers, readiness reasons, and outcome hints
  - explanation hints remain default-off and never perform VLM/provider/runtime calls, action execution, source/view writes, or media changes
  - /ops action control workspace renders default-off explanation summaries without raw prompt, provider response, credential, locator, or debug material
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v380-default-off-action-explanation";
const schema = "media-server.ops.v380-default-off-action-explanation.v1";
const route = "/ops/api/actions/default-off-explanation";
const approvalRoute = "/ops/api/actions/approval-decision-gate";
const readinessRoute = "/ops/api/actions/readiness-preflight";
const outcomeRoute = "/ops/api/actions/outcome-reconciliation";
const receiptRoute = "/ops/api/actions/receipt-bundle";
const fieldConnectorRoute = "/ops/api/actions/field-connector-evidence-package";
const featureIds = ["UI-107", "SRC-064", "EVT-086", "LAB-122", "SAFE-194", "OPS-161"];

const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  uiScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  implementationEvidence: readJson("test/fixtures/project_feature_implementation_evidence.json"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  serverSh: readText("server.sh"),
};

const checks = [];

check("Ops server builds the v3.8 Default-off Action Explanation model", () => {
  for (const snippet of [
    "struct OpsV380DefaultOffActionExplanationItem",
    "struct OpsV380DefaultOffActionExplanationSummary",
    "BuildV380DefaultOffActionExplanationItems",
    "BuildV380DefaultOffActionExplanationSummary",
    "AppendV380DefaultOffActionExplanationItemJson",
    "AppendV380DefaultOffActionExplanationSummaryJson",
    "OpsV380DefaultOffActionExplanationJson",
    schema,
    "defaultOffActionExplanationId",
    "explanationKind",
    "approvalBlockerSummary",
    "readinessReasonSummary",
    "outcomeHint",
    "operatorReviewHint",
    "defaultEnabled",
    "defaultOff",
    "runtimeOptInRequired",
    "providerOptInRequired",
    "vlmProviderCallPerformed",
    "vlmRuntimeCallPerformed",
    "redactedExplanation",
  ]) {
    assertIncludes(files.server, snippet, "v380 default-off action explanation server model");
  }
  const producerBlock = extractCppFunctionBlock(files.server, "std::string OpsV380DefaultOffActionExplanationJson(");
  assertIncludes(producerBlock, "media-server.ops.v380-default-off-action-explanation.v1", "v380 default-off action explanation schema");
});

check("Default-off Action Explanation derives approval, readiness, outcome, receipt, and field refs without calling providers", () => {
  const block = extractBlock(
    files.server,
    "struct OpsV380DefaultOffActionExplanationItem",
    "struct OpsV370ClientNoticeBySiteViewGroupItem",
  );
  for (const snippet of [
    "BuildV380ApprovalDecisionGateItems",
    "BuildV380ActionReadinessPreflightItems",
    "BuildV380OutcomeObserverReconciliationItems",
    "BuildV380ActionReceiptBundleItems",
    "BuildV380FieldConnectorEvidencePackageItems",
    approvalRoute,
    readinessRoute,
    outcomeRoute,
    receiptRoute,
    fieldConnectorRoute,
    "approval-blocker-explanation",
    "readiness-reason-explanation",
    "outcome-hint-explanation",
    "provider-opt-in-required",
    "runtime-opt-in-required",
  ]) {
    assertIncludes(block, snippet, "v380 default-off action explanation derivation");
  }
});

check("Default-off Action Explanation preserves default-off/no-call/no-write/no-raw-material boundaries", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV380DefaultOffActionExplanationJson(");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "defaultOff",
    "explanationHintOnly",
    "runtimeOptInRequired",
    "providerOptInRequired",
    "defaultEnabled",
    "vlmProviderCallPerformed",
    "vlmRuntimeCallPerformed",
    "rawVlmPromptIncluded",
    "rawProviderResponseIncluded",
    "credentialMaterialIncluded",
    "rawEndpointIncluded",
    "rawLocatorIncluded",
    "rawJsonIncluded",
    "debugMaterialIncluded",
    "actionExecutionPerformed",
    "sourceRecheckExecuted",
    "clientNoticeSent",
    "noticeQueueWritePerformed",
    "ruleApplyPerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "operatorReviewWritePerformed",
    "viewerClientPayloadChanged",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "v380 default-off action explanation boundary");
  }
  for (const flag of [
    "defaultEnabled",
    "vlmProviderCallPerformed",
    "vlmRuntimeCallPerformed",
    "rawVlmPromptIncluded",
    "rawProviderResponseIncluded",
    "credentialMaterialIncluded",
    "rawEndpointIncluded",
    "rawLocatorIncluded",
    "rawJsonIncluded",
    "debugMaterialIncluded",
    "actionExecutionPerformed",
    "sourceRecheckExecuted",
    "clientNoticeSent",
    "noticeQueueWritePerformed",
    "ruleApplyPerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "operatorReviewWritePerformed",
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
    const nearby = block.slice(index, index + 180);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  assert(exactBooleanFlagValue(block, "eventRecordWritePerformed") === false, "eventRecordWritePerformed must remain false");
  assert(exactBooleanFlagValue(block, "vlmProviderCallPerformed") === false, "vlmProviderCallPerformed must remain false");
  for (const forbidden of [
    "CallVlmProvider",
    "CallCloudProvider",
    "StartVlmRuntime",
    "ExecuteAction",
    "ExecuteSourceRecheck",
    "SendClientNotice",
    "ApplyRuleDraft",
    "AppendEventRecord(",
    "AppendOpsAuditRecord(",
    "\"rawPrompt\"",
    "\"rawProviderResponse\"",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `default-off action explanation must not call or expose restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the Default-off Action Explanation route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "request.path == \"/ops/api/site-operations/source-group-contract\"");
  assertIncludes(block, route, "v380 default-off action explanation route");
  assertIncludes(block, "request.method == \"GET\"", "v380 default-off action explanation route");
  assertIncludes(block, "require_ops_principal()", "v380 default-off action explanation route");
  assertIncludes(block, "OpsV380DefaultOffActionExplanationJson(", "v380 default-off action explanation route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "v380 default-off action explanation route");
  assertIncludes(block, "Cache-Control", "v380 default-off action explanation route");
  assertIncludes(block, "no-store", "v380 default-off action explanation route");
});

check("/ops action control workspace declares and renders Default-off Action Explanation signals", () => {
  const serverBlock = extractBlock(files.server, "void AppendOpsDashboardPage", "section class=\"section-card ops-workspace-wide ops-site-client-notice-workspace");
  for (const snippet of [
    "ops-default-off-action-explanation",
    "data-testid=\"ops-default-off-action-explanation\"",
    "data-v380-default-off-action-explanation",
    schema,
    "Default-off Action Explanation",
    "dashDefaultOffActionExplanationBadges",
    "dashDefaultOffActionExplanationText",
    "dashDefaultOffActionExplanationList",
    "dashDefaultOffActionExplanationBoundary",
  ]) {
    assertIncludes(serverBlock, snippet, "v380 default-off action explanation dashboard shell");
  }
  const scriptBlock = extractBlock(
    files.uiScript,
    "const renderV380DefaultOffActionExplanation",
    "let v370OutcomeReconciliationState",
  );
  for (const snippet of [
    "refreshV380DefaultOffActionExplanation",
    route,
    "defaultOffActionExplanations",
    "defaultOffActionExplanationSummary",
    "approvalBlockerSummary",
    "readinessReasonSummary",
    "outcomeHint",
    "operatorReviewHint",
    "defaultEnabled",
    "providerOptInRequired",
    "runtimeOptInRequired",
    "dashDefaultOffActionExplanationList",
    "requestJson(defaultOffActionExplanationRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v380 default-off action explanation renderer");
  }
  const dashboardRoutePresent = files.server.includes('path == "/ops/dashboard"');
  const schemaPresent = serverBlock.includes("media-server.ops.v380-default-off-action-explanation.v1");
  const rawMaterialExposed = /\b(?:rawEvidence|rawJson|rawLocator)\b/.test(scriptBlock);
  const credentialExposed = /\b(?:credentialValue|credentialMaterial)\b/i.test(scriptBlock);
  const debugExposed = /\b(?:debugPayload|debugMaterial)\b/i.test(scriptBlock);
  const defaultEnabled = /\bdefaultEnabled\s*===\s*true\b/.test(scriptBlock);
  const VLMDefaultOffBoundaryPresent = scriptBlock.includes("vlmProviderCallPerformed") &&
    scriptBlock.includes("vlmRuntimeCallPerformed");
  assert(dashboardRoutePresent, "v380 default-off dashboard route missing");
  assert(schemaPresent, "v380 default-off schema missing");
  assert(rawMaterialExposed === false, "v380 default-off renderer must redact raw material");
  assert(credentialExposed === false, "v380 default-off renderer must redact credentials");
  assert(debugExposed === false, "v380 default-off renderer must redact debug material");
  assert(defaultEnabled === false, "v380 default-off renderer must never enable actions");
  assert(VLMDefaultOffBoundaryPresent, "v380 default-off renderer must expose the VLM no-call boundary status");
  assertIncludes(scriptBlock, "dashDefaultOffActionExplanationBoundary", "v380 default-off explanation boundary state");
  const refreshBlock = extractBlock(files.uiScript, "async function refreshDashboard()", "async function refreshEvents()");
  assertIncludes(refreshBlock, "refreshV380DefaultOffActionExplanation", "dashboard refresh");
  assertIncludes(refreshBlock, route, "dashboard refresh");
});

check("Default-off Action Explanation styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-default-off-action-explanation",
    ".ops-default-off-action-explanation-list",
    ".ops-default-off-action-explanation-entry",
    ".ops-default-off-action-explanation-boundary",
    "body.ops-shell .ops-default-off-action-explanation",
  ]) {
    assertIncludes(files.css, snippet, "v380 default-off action explanation CSS");
  }
});

check("client/viewer scripts do not receive v3.8 Default-off Action Explanation material", () => {
  for (const forbidden of [
    schema,
    route,
    "defaultOffActionExplanations",
    "defaultOffActionExplanationId",
    "approvalBlockerSummary",
    "readinessReasonSummary",
    "redactedExplanation",
    "rawVlmPrompt",
    "rawProviderResponse",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose v3.8 Default-off Action Explanation material: ${forbidden}`);
  }
});

check("roadmap, stream verification, inventory, and release records map v3.8 Step 15", () => {
  for (const snippet of [
    "| 15 | v3.8.0 (15) Default-off Action Explanation | P2 | 완료 |",
    "## v3.8.0 Step 15 개발 기록",
    route,
    "OpsV380DefaultOffActionExplanationJson",
    `\`./server.sh ${command}\``,
    "Stabilization and Release Readiness 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.8 Step 15");
  }
  for (const snippet of [
    `| v3.8.0 (15) | \`./server.sh ${command}\` | Default-off Action Explanation.`,
    "approval blocker, readiness reason, outcome hint",
    "provider/runtime call은 opt-in 전 미수행",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.8 Step 15");
  }
  for (const snippet of [
    `v3.8.0 (15) Default-off Action Explanation | \`UI-107\`, \`SRC-064\`, \`EVT-086\`, \`LAB-122\`, \`SAFE-194\`, \`OPS-161\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-107 | V380 Step 15 Default-off Action Explanation UI",
    "SRC-064 | V380 Step 15 source readiness explanation context",
    "EVT-086 | V380 Step 15 outcome hint explanation context",
    "LAB-122 | V380 Step 15 default-off action explanation harness",
    "SAFE-194 | V380 Step 15 Default-off Action Explanation boundary",
    "OPS-161 | V380 Step 15 Default-off Action Explanation 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.8 Step 15");
  }
  for (const snippet of [
    "V380 Default-off Action Explanation",
    `\`./server.sh ${command}\``,
    "v380 Step 15 RED Default-off Action Explanation gate",
    "v380 Step 15 Default-off Action Explanation final",
    "v380 Step 15 UI 풀테스트",
    "v380 Step 15 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.8 Step 15");
  }
});

check("server entrypoint and inventory verifiers include v3.8 Step 15 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v380_default_off_action_explanation.mjs", "server.sh script dispatch");
  assertExactVerifierMapping(
    files.implementationEvidence,
    "UI-107",
    command,
    "scripts/internal/verify_v380_default_off_action_explanation.mjs",
  );
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v380_default_off_action_explanation.mjs", "script inventory");
});

check("SAFE-194 canonical bounded product boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV380DefaultOffActionExplanationJson(");
  const routeObserved = files.server.includes("/ops/api/actions/default-off-explanation");
  const outcomeObserved = files.uiScript.includes("renderV380DefaultOffActionExplanation");
  const safe194BoundaryObserved = block.includes("BuildV380DefaultOffActionExplanationItems") && block.includes("vlmProviderCallPerformed");
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
  assert(routeObserved && outcomeObserved && writePerformed === false && mutationPerformed === false && executionPerformed === false && sendPerformed === false && providerCallPerformed === false, "OPS-161 canonical bounded absence oracle");
  assert(safe194BoundaryObserved && block.includes("media-server.ops.v380-default-off-action-explanation.v1") && writePerformed === false && mutationPerformed === false && executionPerformed === false && sendPerformed === false && automaticApplyPerformed === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-194 vlmProviderCallPerformed must remain no-execution no-write redacted and client/provider isolated");
});

const results = runChecks();
console.log("");
console.log("== v3.8.0 Default-off Action Explanation summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.8.0 (15)");
console.log(`- route: ${route}`);
console.log("- explains: approval blocker, readiness reason, outcome hint");
console.log("- writes: no VLM/provider/runtime call, action execution, source/view/EventRecord/Ops audit/client/media mutation performed");
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
function readJson(relativePath) { return JSON.parse(readText(relativePath)); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function assertIncludes(text, needle, label) { assert(text.includes(needle), `${label} missing snippet: ${needle}`); }
function assertExactVerifierMapping(manifest, featureId, expectedCommand, expectedFile) {
  const item = manifest.items?.find(entry => entry.id === featureId);
  assert(item?.verifierEvidence?.command === expectedCommand,
    `${featureId} exact verifier command mismatch: ${item?.verifierEvidence?.command}`);
  assert(item?.verifierEvidence?.file === expectedFile,
    `${featureId} exact verifier file mismatch: ${item?.verifierEvidence?.file}`);
  assert(item?.verifierEvidence?.anchor === 'assert(defaultEnabled === false, "v380 default-off renderer must never enable actions");',
    `${featureId} exact verifier assertion anchor mismatch: ${item?.verifierEvidence?.anchor}`);
}
function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start !== -1, `block start not found: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end !== -1, `block end not found after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
