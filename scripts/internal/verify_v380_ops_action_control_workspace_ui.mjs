#!/usr/bin/env node
// 파일 용도: v3.8.0 Step 10 Ops Action Control Workspace UI 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.8.0 Ops Action Control Workspace UI verification

Usage:
  ./server.sh verify-v380-ops-action-control-workspace-ui

Checks:
  - /ops dashboard declares a v3.8 action control workspace UI shell
  - renderer loads action request, approval, readiness, pilot candidate, notice/rule package, and receipt placeholders from read-only action APIs
  - dashboard refresh stays read-only and does not expose operator-only material to client/viewer scripts
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v380-ops-action-control-workspace-ui";
const schema = "media-server.ops.v380-action-control-workspace-ui.v1";
const ledgerRoute = "/ops/api/actions/request-ledger";
const approvalRoute = "/ops/api/actions/approval-decision-gate";
const readinessRoute = "/ops/api/actions/readiness-preflight";
const sourceRecheckRoute = "/ops/api/actions/source-recheck-pilot";
const noticeRoute = "/ops/api/actions/client-notice-draft-queue";
const rulePackageRoute = "/ops/api/actions/rule-draft-package";
const capabilityRoute = "/ops/api/actions/capability-contract";
const featureIds = ["UI-102", "SAFE-189", "OPS-156"];
const files = loadFiles();
const checks = [];

check("/ops dashboard declares the v3.8 action control workspace UI shell", () => {
  const block = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "ops-action-control-workspace",
    "data-testid=\"ops-action-control-workspace\"",
    "data-v380-action-control-workspace",
    schema,
    "Action Control Workspace",
    "dashActionControlWorkspaceBadges",
    "dashActionControlWorkspaceText",
    "dashActionControlWorkspaceFlow",
    "dashActionControlRequestList",
    "dashActionControlApprovalList",
    "dashActionControlReadinessList",
    "dashActionControlPilotList",
    "dashActionControlReceiptList",
    "dashActionControlBoundary",
  ]) {
    assertIncludes(block, snippet, "v380 action control workspace shell");
  }
});

check("action control renderer loads the request, approval, readiness, pilot, package, and receipt flow", () => {
  const block = extractBlock(
    files.uiScript,
    "const renderV380OpsActionControlWorkspace",
    "const renderV370OutcomeReconciliation",
  );
  for (const snippet of [
    "refreshV380OpsActionControlWorkspace",
    "v380ActionControlWorkspaceState",
    ledgerRoute,
    approvalRoute,
    readinessRoute,
    sourceRecheckRoute,
    noticeRoute,
    rulePackageRoute,
    capabilityRoute,
    "actionRequestLedger",
    "approvalDecisionGate",
    "actionReadinessPreflight",
    "sourceRecheckActionPilot",
    "clientNoticeDraftQueue",
    "ruleDraftActionPackage",
    "receiptPlaceholder",
    "dashActionControlWorkspaceFlow",
    "dashActionControlRequestList",
    "dashActionControlApprovalList",
    "dashActionControlReadinessList",
    "dashActionControlPilotList",
    "dashActionControlReceiptList",
    "requestJson(ledgerRoute)",
    "requestJson(approvalRoute)",
    "requestJson(readinessRoute)",
    "requestJson(sourceRecheckRoute)",
    "requestJson(noticeRoute)",
    "requestJson(rulePackageRoute)",
  ]) {
    assertIncludes(block, snippet, "v380 action control workspace renderer");
  }
});

check("dashboard refresh wires action control workspace without write actions", () => {
  const block = extractBlock(files.uiScript, "async function refreshDashboard()", "let opsVlmSelectedOptionId");
  for (const snippet of [
    "refreshV380OpsActionControlWorkspace",
    ledgerRoute,
    approvalRoute,
    readinessRoute,
    sourceRecheckRoute,
    noticeRoute,
    rulePackageRoute,
    capabilityRoute,
  ]) {
    assertIncludes(block, snippet, "v380 action control workspace refresh");
  }
  for (const forbidden of [
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "actionExecutionPerformed: true",
    "actionRequestPersisted: true",
    "approvalDecisionPersisted: true",
    "readinessResultPersisted: true",
    "sourceRecheckExecuted: true",
    "clientNoticeSent: true",
    "noticeQueueWritePerformed: true",
    "ruleRegistryWritePerformed: true",
  ]) {
    assert(!block.includes(forbidden), `action control workspace must stay read-only: ${forbidden}`);
  }
});

check("action control workspace styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-action-control-workspace",
    ".ops-action-control-grid",
    ".ops-action-control-flow-grid",
    ".ops-action-control-list",
    ".ops-action-control-entry",
    ".ops-action-control-boundary",
    "body.ops-shell .ops-action-control-workspace",
  ]) {
    assertIncludes(files.css, snippet, "v380 action control workspace CSS");
  }
});

check("client/viewer scripts do not expose v3.8 action control operator material", () => {
  for (const forbidden of [
    schema,
    "ops-action-control-workspace",
    "data-v380-action-control-workspace",
    ledgerRoute,
    approvalRoute,
    readinessRoute,
    sourceRecheckRoute,
    noticeRoute,
    rulePackageRoute,
    "approvalDecisionGate",
    "actionReadinessPreflight",
    "ruleDraftActionPackage",
    "operator-only",
    "reviewer",
    "auditRef",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose action control material: ${forbidden}`);
  }
});

check("docs, inventory, and dispatch map v3.8 Step 10 without overclaiming UI fulltest or longrun", () => {
  for (const snippet of [
    "| 10 | v3.8.0 (10) Ops Action Control Workspace UI | P1 | 완료 |",
    "## v3.8.0 Step 10 개발 기록",
    "AppendOpsDashboardPage",
    "renderV380OpsActionControlWorkspace",
    "ops-action-control-workspace",
    ledgerRoute,
    approvalRoute,
    readinessRoute,
    sourceRecheckRoute,
    noticeRoute,
    rulePackageRoute,
    `\`./server.sh ${command}\``,
    "Client-safe Action Notice Preview 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.8 Step 10");
  }
  assertIncludes(
    files.streamVerification,
    `| v3.8.0 (10) | \`./server.sh ${command}\` | Ops Action Control Workspace UI.`,
    "stream verification v3.8 Step 10",
  );
  assertIncludes(files.featureInventory, "v3.8.0 (10) Ops Action Control Workspace UI", "feature inventory v3.8 Step 10");
  for (const id of featureIds) {
    assertIncludes(files.featureInventory, `\`${id}\``, `feature inventory ${id}`);
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.releaseRecords, "V380 Ops Action Control Workspace UI", "release records v3.8 Step 10");
  assertIncludes(files.releaseRecords, `\`./server.sh ${command}\``, "release records v3.8 Step 10");
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v380_ops_action_control_workspace_ui.mjs", "server.sh dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  assertIncludes(files.scriptInventory, "verify_v380_ops_action_control_workspace_ui.mjs", "script inventory");
});

finish("== v3.8.0 Ops Action Control Workspace UI summary ==", {
  schema,
  step: "v3.8.0 (10)",
  route: "/ops",
});

function loadFiles() {
  return {
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
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}

function finish(title, summary) {
  const results = runChecks();
  console.log("");
  console.log(title);
  for (const [key, value] of Object.entries(summary)) {
    console.log(`- ${key}: ${value}`);
  }
  console.log("- writes: no action execution/request persist/approval persist/readiness persist/source recheck/notice send/rule apply/client/media mutation performed");
  console.log("- uiFulltest: not-run-by-this-command");
  console.log("- longrun30Or120: not-run-by-this-command");
  console.log(`- pass: ${results.pass}`);
  console.log(`- fail: ${results.fail}`);
  if (results.fail > 0) {
    process.exit(1);
  }
}

function runChecks() {
  let pass = 0;
  let fail = 0;
  for (const item of checks) {
    try {
      item.fn();
      pass += 1;
      console.log(`[PASS] ${item.name}`);
    } catch (error) {
      fail += 1;
      console.error(`[FAIL] ${item.name}`);
      console.error(`       ${error.message}`);
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

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing: ${needle}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
