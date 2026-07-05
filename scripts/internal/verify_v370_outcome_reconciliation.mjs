#!/usr/bin/env node
// 파일 용도: v3.7.0 Step 16 Outcome Reconciliation 연결, 문서, 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

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
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
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
  const block = extractBlock(
    files.server,
    "std::string OpsV370OutcomeReconciliationJson",
    "struct OpsV360RuleVaWhatIfReplayCandidate",
  );
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
  const serverBlock = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
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

check("roadmap, stream verification, inventory, and release records map v3.7 Step 16", () => {
  for (const snippet of [
    "| 16 | v3.7.0 (16) Outcome Reconciliation | P2 | 완료 |",
    "## v3.7.0 Step 16 개발 기록",
    route,
    "OpsV370OutcomeReconciliationJson",
    `\`./server.sh ${command}\``,
    "Export/Handoff Bundle 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.7 Step 16");
  }
  for (const snippet of [
    `| v3.7.0 (16) | \`./server.sh ${command}\` | Outcome Reconciliation.`,
    "source/event/client impact diff",
    "pre-simulation",
    "post-execution",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.7 Step 16");
  }
  for (const snippet of [
    `v3.7.0 (16) Outcome Reconciliation | \`UI-100\`, \`SRC-062\`, \`EVT-083\`, \`CLIENT-039\`, \`LAB-109\`, \`SAFE-177\`, \`OPS-144\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-100 | V370 Step 16 Outcome Reconciliation UI",
    "SRC-062 | V370 Step 16 source outcome reconciliation",
    "EVT-083 | V370 Step 16 EventRecord outcome reconciliation",
    "CLIENT-039 | V370 Step 16 client impact outcome reconciliation",
    "LAB-109 | V370 Step 16 Outcome Reconciliation harness",
    "SAFE-177 | V370 Step 16 Outcome Reconciliation boundary",
    "OPS-144 | V370 Step 16 Outcome Reconciliation 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.7 Step 16");
  }
  for (const snippet of [
    "V370 Outcome Reconciliation",
    `\`./server.sh ${command}\``,
    "v370 Step 16 RED outcome reconciliation gate",
    "v370 Step 16 outcome reconciliation final",
    "v370 Step 16 UI 풀테스트",
    "v370 Step 16 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.7 Step 16");
  }
});

check("server entrypoint and inventory verifiers include v3.7 Step 16 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v370_outcome_reconciliation.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v370_outcome_reconciliation.mjs", "script inventory");
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
