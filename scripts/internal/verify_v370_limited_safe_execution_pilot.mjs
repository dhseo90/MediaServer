#!/usr/bin/env node
// Verifies v3.7.0 Step 15 Limited Safe Execution Pilot wiring, docs, and boundaries.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.7.0 Limited Safe Execution Pilot verification

Usage:
  ./server.sh verify-v370-limited-safe-execution-pilot

Checks:
  - /ops/api/site-operations/limited-safe-execution-pilot exposes only lowest-risk source recheck or notice queue pilot candidates
  - every pilot action is approval-gated and preview-only; no source recheck, notice send, queue write, runbook write, or media mutation occurs
  - /ops dashboard renders pilot candidates, approval gate state, execution preview, and boundaries without client/viewer injection
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v370-limited-safe-execution-pilot";
const schema = "media-server.ops.v370-limited-safe-execution-pilot.v1";
const route = "/ops/api/site-operations/limited-safe-execution-pilot";
const fieldAttachmentRoute = "/ops/api/site-operations/field-evidence-attachment";
const clientNoticeRoute = "/ops/api/site-operations/client-notice-by-site-view-group";
const runbookRoute = "/ops/api/site-operations/runbook-instance-ledger";
const approvalRoute = "/ops/api/site-operations/approval-ticket-workflow";
const featureIds = ["UI-099", "SRC-061", "CLIENT-038", "LAB-108", "SAFE-176", "OPS-143"];

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

check("Ops server builds the v3.7 Limited Safe Execution Pilot model", () => {
  for (const snippet of [
    "struct OpsV370LimitedSafeExecutionPilotAction",
    "struct OpsV370LimitedSafeExecutionPilotSummary",
    "BuildV370LimitedSafeExecutionPilotActions",
    "BuildV370LimitedSafeExecutionPilotSummary",
    "AppendV370LimitedSafeExecutionPilotActionJson",
    "AppendV370LimitedSafeExecutionPilotSummaryJson",
    "OpsV370LimitedSafeExecutionPilotJson",
    schema,
    "pilotActionId",
    "siteId",
    "sourceGroup",
    "actionKind",
    "actionLabel",
    "approvalTicketId",
    "runbookId",
    "sourceRecheckRef",
    "noticeQueueRef",
    "pilotExecutionStatus",
    "approvalGateState",
    "executionRequestPreview",
    "idempotencyKey",
    "expectedOutcomeRef",
    "blockerRefs",
    "evidenceRefs",
    "lowestRisk",
    "approvalGated",
    "readOnly",
  ]) {
    assertIncludes(files.server, snippet, "v370 limited safe execution pilot server model");
  }
});

check("Limited Safe Execution Pilot derives from runbook, approval, field attachment, and notice refs", () => {
  const block = extractBlock(
    files.server,
    "struct OpsV370LimitedSafeExecutionPilotAction",
    "struct OpsV360RuleVaWhatIfReplayCandidate",
  );
  for (const snippet of [
    "BuildV370RunbookInstanceLedgerEntries",
    "BuildV370ApprovalTicketWorkflowItems",
    "BuildV370FieldEvidenceAttachmentItems",
    "BuildV370ClientNoticeBySiteViewGroupItems",
    "source-recheck-pilot",
    "notice-queue-pilot",
    "approval-gated-not-run",
    fieldAttachmentRoute,
    clientNoticeRoute,
    runbookRoute,
    approvalRoute,
  ]) {
    assertIncludes(block, snippet, "v370 limited safe execution pilot derivation");
  }
});

check("Limited Safe Execution Pilot preserves approval-gated preview and no-mutation boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV370LimitedSafeExecutionPilotJson",
    "struct OpsV360RuleVaWhatIfReplayCandidate",
  );
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "executionPilotOnly",
    "lowestRiskOnly",
    "approvalGateRequired",
    "pilotExecutionPerformed",
    "sourceRecheckExecuted",
    "noticeQueueWritePerformed",
    "clientNoticeSent",
    "runbookInstancePersisted",
    "approvalTicketWritePerformed",
    "approvalDecisionPersisted",
    "operatorNoteWritePerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "fieldSmokeExecuted",
    "endpointProbePerformed",
    "providerCallPerformed",
    "viewerClientPayloadChanged",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "v370 limited safe execution pilot boundary");
  }
  for (const flag of [
    "pilotExecutionPerformed",
    "sourceRecheckExecuted",
    "noticeQueueWritePerformed",
    "clientNoticeSent",
    "runbookInstancePersisted",
    "approvalTicketWritePerformed",
    "approvalDecisionPersisted",
    "operatorNoteWritePerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "fieldSmokeExecuted",
    "endpointProbePerformed",
    "providerCallPerformed",
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
  for (const forbidden of [
    "ExecuteSourceRecheck",
    "SendClientNotice",
    "PersistNoticeQueue",
    "PersistRunbook",
    "PersistApprovalTicket",
    "AppendEventRecord(",
    "AppendOpsAuditRecord(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `limited safe execution pilot must not execute or expose restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the Limited Safe Execution Pilot route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "request.path == \"/ops/api/diagnostics/log-tail\"");
  assertIncludes(block, route, "v370 limited safe execution pilot route");
  assertIncludes(block, "request.method == \"GET\"", "v370 limited safe execution pilot route");
  assertIncludes(block, "require_ops_principal()", "v370 limited safe execution pilot route");
  assertIncludes(block, "OpsV370LimitedSafeExecutionPilotJson(", "v370 limited safe execution pilot route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "v370 limited safe execution pilot route");
  assertIncludes(block, "Cache-Control", "v370 limited safe execution pilot route");
  assertIncludes(block, "no-store", "v370 limited safe execution pilot route");
});

check("/ops dashboard declares and renders Limited Safe Execution Pilot workspace", () => {
  const serverBlock = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "ops-site-limited-safe-execution-pilot-workspace",
    "data-testid=\"ops-site-limited-safe-execution-pilot-workspace\"",
    "data-v370-limited-safe-execution-pilot",
    schema,
    "Limited Safe Execution Pilot",
    "dashSiteLimitedSafeExecutionPilotBadges",
    "dashSiteLimitedSafeExecutionPilotText",
    "dashSiteLimitedSafeExecutionPilotList",
    "dashSiteLimitedSafeExecutionPilotGateList",
    "dashSiteLimitedSafeExecutionPilotBoundary",
  ]) {
    assertIncludes(serverBlock, snippet, "v370 limited safe execution pilot dashboard shell");
  }
  const scriptBlock = extractBlock(
    files.uiScript,
    "const renderV370LimitedSafeExecutionPilot",
    "const renderV370FieldEvidenceAttachment",
  );
  for (const snippet of [
    "refreshV370LimitedSafeExecutionPilot",
    route,
    "limitedSafeExecutionPilotActions",
    "limitedSafeExecutionPilotSummary",
    "sourceRecheckRef",
    "noticeQueueRef",
    "approvalGateState",
    "pilotExecutionStatus",
    "executionRequestPreview",
    "dashSiteLimitedSafeExecutionPilotList",
    "dashSiteLimitedSafeExecutionPilotGateList",
    "requestJson(limitedSafeExecutionPilotRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v370 limited safe execution pilot dashboard renderer");
  }
  const refreshBlock = extractBlock(files.uiScript, "async function refreshDashboard()", "async function refreshEvents()");
  assertIncludes(refreshBlock, "refreshV370LimitedSafeExecutionPilot", "dashboard refresh");
  assertIncludes(refreshBlock, route, "dashboard refresh");
});

check("Limited Safe Execution Pilot styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-site-limited-safe-execution-pilot-workspace",
    ".ops-site-limited-safe-execution-pilot-grid",
    ".ops-site-limited-safe-execution-pilot-list",
    ".ops-site-limited-safe-execution-pilot-entry",
    ".ops-site-limited-safe-execution-pilot-boundary",
    "body.ops-shell .ops-site-limited-safe-execution-pilot-workspace",
  ]) {
    assertIncludes(files.css, snippet, "v370 limited safe execution pilot CSS");
  }
});

check("client/viewer scripts do not receive v3.7 Limited Safe Execution Pilot material", () => {
  for (const forbidden of [
    schema,
    route,
    "limitedSafeExecutionPilotActions",
    "pilotActionId",
    "sourceRecheckRef",
    "noticeQueueRef",
    "executionRequestPreview",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose v3.7 Limited Safe Execution Pilot material: ${forbidden}`);
  }
});

check("roadmap, stream verification, inventory, and release records map v3.7 Step 15", () => {
  for (const snippet of [
    "| 15 | v3.7.0 (15) Limited Safe Execution Pilot | P2 | 완료 |",
    "## v3.7.0 Step 15 개발 기록",
    route,
    "OpsV370LimitedSafeExecutionPilotJson",
    `\`./server.sh ${command}\``,
    "Outcome Reconciliation 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.7 Step 15");
  }
  for (const snippet of [
    `| v3.7.0 (15) | \`./server.sh ${command}\` | Limited Safe Execution Pilot.`,
    "source recheck 또는 notice queue action",
    "approval-gated",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.7 Step 15");
  }
  for (const snippet of [
    `v3.7.0 (15) Limited Safe Execution Pilot | \`UI-099\`, \`SRC-061\`, \`CLIENT-038\`, \`LAB-108\`, \`SAFE-176\`, \`OPS-143\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-099 | V370 Step 15 Limited Safe Execution Pilot UI",
    "SRC-061 | V370 Step 15 source recheck pilot candidate",
    "CLIENT-038 | V370 Step 15 notice queue pilot candidate",
    "LAB-108 | V370 Step 15 Limited Safe Execution Pilot harness",
    "SAFE-176 | V370 Step 15 Limited Safe Execution Pilot boundary",
    "OPS-143 | V370 Step 15 Limited Safe Execution Pilot 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.7 Step 15");
  }
  for (const snippet of [
    "V370 Limited Safe Execution Pilot",
    `\`./server.sh ${command}\``,
    "v370 Step 15 RED limited safe execution pilot gate",
    "v370 Step 15 limited safe execution pilot final",
    "v370 Step 15 UI 풀테스트",
    "v370 Step 15 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.7 Step 15");
  }
});

check("server entrypoint and inventory verifiers include v3.7 Step 15 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v370_limited_safe_execution_pilot.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v370_limited_safe_execution_pilot.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.7.0 Limited Safe Execution Pilot summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.7.0 (15)");
console.log(`- route: ${route}`);
console.log("- scope: lowest-risk source recheck / notice queue pilot candidates");
console.log("- execution: approval-gated-preview; no source recheck or notice send");
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
