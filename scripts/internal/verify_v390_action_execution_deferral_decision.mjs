#!/usr/bin/env node
// 파일 용도: v3.9.0 Step 16 action execution deferral decision 구현, 문서, inventory 연결을 검증한다.

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
  printUsageAndExit(`v3.9.0 action execution deferral decision verification

Usage:
  ./server.sh verify-v390-action-execution-deferral-decision

Checks:
  - /ops/api/actions/execution-deferral-decision exposes the Step 16 product decision
  - the route explicitly defers source recheck execution, client notice send, and rule apply writes
  - /ops action control workspace renders the deferral decision without adding action execution controls
  - action execution, request/approval/readiness/outcome/receipt writes, source/view/EventRecord/Ops audit writes, client/media/schema changes, and external side effects remain false
  - route/UI/docs/inventory/release records/dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-action-execution-deferral-decision";
const targetScript = "verify_v390_action_execution_deferral_decision.mjs";
const schema = "media-server.ops.v390-action-execution-deferral-decision.v1";
const route = "/ops/api/actions/execution-deferral-decision";
const sourceRecheckRoute = "/ops/api/actions/source-recheck-pilot";
const noticeRoute = "/ops/api/actions/client-notice-draft-queue";
const rulePackageRoute = "/ops/api/actions/rule-draft-package";
const featureIds = ["UI-113", "EVT-087", "SAFE-208", "OPS-175"];
const files = loadFiles();
const checks = [];

check("Ops server exposes the v3.9 action execution deferral decision", () => {
  const source = `${files.server}\n${files.handlerHeader}\n${files.handlerSource}\n${files.uiWorkspaceHeader}\n${files.uiWorkspaceSource}`;
  for (const snippet of [
    "OpsV390ActionExecutionDeferralDecisionJson",
    schema,
    route,
    "V390-CAND-006",
    "defer-all-action-writes",
    "actionExecutionDeferralDecisionSummary",
    "deferredActionKinds",
    "source-recheck-execution",
    "client-notice-send",
    "rule-apply",
    sourceRecheckRoute,
    noticeRoute,
    rulePackageRoute,
  ]) {
    assertIncludes(source, snippet, "v390 action execution deferral decision server model");
  }
});

check("REVIEW4-64 route owner is extracted behind a transport-neutral response", () => {
  for (const snippet of [
    "struct ActionExecutionDeferralDecisionResponse",
    "std::optional<ActionExecutionDeferralDecisionResponse>",
    "TryHandleActionExecutionDeferralDecision",
    "const std::string& method",
    "const std::string& path",
  ]) assertIncludes(files.handlerHeader, snippet, "action deferral handler contract");
  for (const snippet of [
    "OpsV390ActionExecutionDeferralDecisionJson",
    "method != \"GET\"",
    "path != kActionExecutionDeferralDecisionRoute",
    "response.status = 200",
    "response.reason = \"OK\"",
    "response.cache_control = \"no-store\"",
  ]) assertIncludes(files.handlerSource, snippet, "action deferral handler implementation");
  assert(!files.handlerHeader.includes("HttpResponse") && !files.handlerSource.includes("require_ops_principal"),
    "route owner must not depend on transport response or auth principal implementation");
  assert(!files.server.includes("std::string OpsV390ActionExecutionDeferralDecisionJson()"),
    "legacy JSON owner remains in transport source");
});

check("deferral decision preserves no-action/no-write/no-external-side-effect boundaries", () => {
  const deferralBlock = extractCppFunctionBlock(
    files.handlerSource,
    "std::string OpsV390ActionExecutionDeferralDecisionJson()",
  );
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "deferAllWrites",
    "approvalGatedExecutionEnabled",
    "actionExecutionPerformed",
    "sourceRecheckExecuted",
    "clientNoticeSent",
    "noticeQueueWritePerformed",
    "ruleApplyPerformed",
    "ruleRegistryWritePerformed",
    "actionRequestPersisted",
    "approvalDecisionPersisted",
    "readinessResultPersisted",
    "outcomePersisted",
    "receiptBundlePersisted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "externalDeliveryPerformed",
    "fieldSmokeExecuted",
    "viewerClientPayloadChanged",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(deferralBlock, snippet, "v390 action execution deferral boundary flags");
  }
  for (const flag of [
    "approvalGatedExecutionEnabled",
    "actionExecutionPerformed",
    "sourceRecheckExecuted",
    "clientNoticeSent",
    "noticeQueueWritePerformed",
    "ruleApplyPerformed",
    "ruleRegistryWritePerformed",
    "actionRequestPersisted",
    "approvalDecisionPersisted",
    "readinessResultPersisted",
    "outcomePersisted",
    "receiptBundlePersisted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "externalDeliveryPerformed",
    "fieldSmokeExecuted",
    "viewerClientPayloadChanged",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertFlagFalse(deferralBlock, flag);
  }
  const actionExecutionPerformed = exactBooleanFlagValue(deferralBlock, "actionExecutionPerformed");
  const actionExecutionDeferred = actionExecutionPerformed === false;
  const ruleRegistryWritePerformed = exactBooleanFlagValue(deferralBlock, "ruleRegistryWritePerformed");
  const externalDeliveryPerformed = exactBooleanFlagValue(deferralBlock, "externalDeliveryPerformed");
  const eventPostPayloadChanged = exactBooleanFlagValue(deferralBlock, "eventPostPayloadChanged");
  assert(actionExecutionDeferred && actionExecutionPerformed === false &&
    ruleRegistryWritePerformed === false && externalDeliveryPerformed === false &&
    eventPostPayloadChanged === false, "actionExecutionPerformed must remain false");
  assert(exactBooleanFlagValue(deferralBlock, "eventRecordWritePerformed") === false, "eventRecordWritePerformed must remain false");
  assert(exactBooleanFlagValue(deferralBlock, "externalDeliveryPerformed") === false, "externalDeliveryPerformed must remain false");
  for (const forbidden of [
    "ExecuteAction",
    "ExecuteSourceRecheck",
    "SendClientNotice",
    "ApplyRuleDraft",
    "CreateActionRequest",
    "PersistActionRequest",
    "PersistApprovalDecision",
    "PersistReadinessResult",
    "PersistActionOutcome",
    "PersistReceiptBundle",
    "AppendEventRecord(",
    "AppendOpsAuditRecord(",
    "CallExternalDelivery",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "password",
    "Authorization",
  ]) {
    assert(!deferralBlock.includes(forbidden), `deferral decision must not call or expose restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the action execution deferral route as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "v390 action execution deferral route");
  assertIncludes(block, "require_ops_principal()", "v390 action execution deferral route");
  assertIncludes(block, "TryHandleActionExecutionDeferralDecision", "v390 action execution deferral route");
  assertIncludes(block, "request.method", "v390 action execution deferral route");
  assertIncludes(block, "request.path", "v390 action execution deferral route");
  assertIncludes(block, "Cache-Control", "v390 action execution deferral route");
  assertIncludes(files.handlerSource, "no-store", "v390 action execution deferral route");
  assert(!block.includes("require_source_write_principal"), "deferral route must not require source writes");
});

check("/ops action control workspace renders action execution deferral decision", () => {
  const serverBlock = extractBlock(files.uiServer, "void AppendOpsDashboardPage", "section class=\"section-card ops-workspace-wide ops-site-client-notice-workspace");
  assertIncludes(serverBlock, "OpsActionExecutionDeferralWorkspaceHtml()", "v390 action execution deferral dashboard adapter");
  for (const snippet of [
    "ops-action-execution-deferral-decision",
    "data-testid=\"ops-action-execution-deferral-decision\"",
    "data-v390-action-execution-deferral-decision",
    schema,
    "Action Execution Deferral",
    "dashActionExecutionDeferralBadges",
    "dashActionExecutionDeferralText",
    "dashActionExecutionDeferralList",
    "dashActionExecutionDeferralBoundary",
  ]) {
    assertIncludes(files.uiWorkspaceSource, snippet, "v390 action execution deferral dashboard shell");
  }
  const scriptBlock = extractBlock(
    files.uiWorkspaceSource,
    "const renderV390ActionExecutionDeferralDecision",
    ")DEFERRALSCRIPT\"",
  );
  for (const snippet of [
    "refreshV390ActionExecutionDeferralDecision",
    route,
    "actionExecutionDeferralDecisionSummary",
    "deferredActionKinds",
    "source-recheck-execution",
    "client-notice-send",
    "rule-apply",
    "approvalGatedExecutionEnabled",
    "dashActionExecutionDeferralList",
    "requestJson(actionExecutionDeferralRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v390 action execution deferral renderer");
  }
  const dashboardRoutePresent = files.server.includes('path == "/ops/dashboard"');
  const schemaPresent = files.uiWorkspaceSource.includes("media-server.ops.v390-action-execution-deferral-decision.v1");
  const writePerformed = /\bmethod\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i.test(scriptBlock);
  assert(dashboardRoutePresent, "v390 action deferral dashboard route missing");
  assert(schemaPresent, "v390 action deferral schema missing");
  assert(writePerformed === false, "v390 action deferral renderer must not perform writes");
  assertIncludes(scriptBlock, "dashActionExecutionDeferralBoundary", "v390 action execution deferral boundary state");
  assertIncludes(files.uiScript, "AppendOpsActionExecutionDeferralWorkspaceScript(out);", "v390 action execution deferral script adapter");
  assert(!files.uiScript.includes("const renderV390ActionExecutionDeferralDecision ="),
    "legacy mixed page script still owns the v390 action deferral renderer");
  assert(!files.server.includes('data-testid="ops-action-execution-deferral-decision"'),
    "legacy mixed server still owns the v390 action deferral HTML shell");
  const refreshBlock = extractBlock(files.uiScript, "async function refreshDashboard()", "async function refreshEvents()");
  assertIncludes(refreshBlock, "refreshV390ActionExecutionDeferralDecision", "dashboard refresh");
  assertIncludes(refreshBlock, route, "dashboard refresh");
  assertIncludes(files.opsClientUiSmoke, "ops-action-execution-deferral-decision", "ops client UI smoke");
});

check("client/viewer scripts do not receive action deferral internals", () => {
  for (const forbidden of [
    schema,
    route,
    "actionExecutionDeferralDecisionSummary",
    "deferredActionKinds",
    "approvalGatedExecutionEnabled",
    "sourceRecheckExecuted",
    "clientNoticeSent",
    "ruleApplyPerformed",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose action deferral internals: ${forbidden}`);
  }
});

check("roadmap, action docs, stream verification, inventory, and release records map v3.9 Step 16", () => {
  for (const snippet of [
    "| 16 | v3.9.0 (16) action execution deferral decision | P1 | 완료 |",
    "V390-CAND-006",
    route,
    "OpsV390ActionExecutionDeferralDecisionJson",
    `\`./server.sh ${command}\``,
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.9 Step 16");
  }
  for (const snippet of [
    `| v3.9.0 (16) | \`./server.sh ${command}\` | Action execution deferral decision.`,
    "defer-all-action-writes",
    "source recheck, client notice send, rule apply",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.9 Step 16");
  }
  for (const snippet of [
    `v3.9.0 (16) action execution deferral decision | \`UI-113\`, \`EVT-087\`, \`SAFE-208\`, \`OPS-175\` | \`${command}\`, \`verify-v380-ops-action-control-workspace-ui\`, \`verify-v380-default-off-action-explanation\``,
    "UI-113 | V390 Step 16 action execution deferral decision UI",
    "EVT-087 | V390 Step 16 action outcome/write deferral context",
    "SAFE-208 | V390 Step 16 no-action-execution boundary",
    "OPS-175 | V390 Step 16 action execution deferral gate",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.9 Step 16");
  }
  for (const snippet of [
    "V390 Action Execution Deferral Decision",
    `\`./server.sh ${command}\``,
    "v390 Step 16 RED action execution deferral decision gate",
    "v390 Step 16 action execution deferral decision final",
    "v390 Step 16 UI 풀테스트",
    "v390 Step 16 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.9 Step 16");
  }
  for (const snippet of [
    "| V390-CAND-006 |",
    "Closed with `defer-all-action-writes`",
    route,
    "UI-113",
    "SAFE-208",
    "OPS-175",
  ]) {
    assertIncludes(files.v390Inventory, snippet, "v390 feature completion inventory Step 16");
  }
});

check("server entrypoint and inventory verifiers include v3.9 Step 16 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, targetScript, "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, 'check("exact implementation evidence manifest is valid"', "feature coverage verifier data-driven manifest gate");
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, targetScript, "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 action execution deferral decision ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.9.0 (16)");
console.log(`- route: ${route}`);
console.log("- selectedMode: defer-all-action-writes");
console.log("- actionExecutionPerformed: false");
console.log("- sourceRecheckExecuted: false");
console.log("- clientNoticeSent: false");
console.log("- ruleApplyPerformed: false");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30: not-run-by-this-command");
console.log("- longrun120: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function loadFiles() {
  return {
    server: readText("src/ingress/webrtc_http_server.cpp"),
    uiServer: readText("src/ingress/product_ui_server_pages.cpp"),
    handlerHeader: readTextIfExists("include/ingress/ops_action_execution_deferral.h"),
    handlerSource: readTextIfExists("src/ingress/ops_action_execution_deferral.cpp"),
    uiWorkspaceHeader: readTextIfExists("include/ingress/product_ui_action_execution_deferral.h"),
    uiWorkspaceSource: readTextIfExists("src/ingress/product_ui_action_execution_deferral.cpp"),
    uiScript: readText("src/ingress/product_ui_page_scripts.cpp"),
    clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
    backlog: readText("docs/development-backlog.md"),
    streamVerification: readText("docs/stream-verification.md"),
    featureInventory: readText("docs/project-feature-test-inventory.md"),
    v390Inventory: readText("docs/v390-feature-completion-inventory.md"),
    featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
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
      ++pass;
      console.log(`[pass] ${item.name}`);
    } catch (error) {
      ++fail;
      console.error(`[fail] ${item.name}: ${error.message}`);
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

function readTextIfExists(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
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
  const nearby = block.slice(index, index + 200);
  assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
}

function extractRouteBlock(text, routeText) {
  const marker = `request.path == "${routeText}"`;
  const start = text.indexOf(marker);
  assert(start >= 0, `route block missing: ${routeText}`);
  const next = text.indexOf("\n                        if (request.path == ", start + marker.length);
  return text.slice(start, next >= 0 ? next : start + 2400);
}

function extractBlock(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert(start >= 0, `block start missing: ${startMarker}`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert(end >= 0, `block end missing after ${startMarker}: ${endMarker}`);
  return text.slice(start, end);
}
