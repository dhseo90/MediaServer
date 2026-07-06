#!/usr/bin/env node
// 파일 용도: v3.8.0 Step 5 Approval Decision Gate 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.8.0 Approval Decision Gate verification

Usage:
  ./server.sh verify-v380-approval-decision-gate

Checks:
  - /ops/api/actions/approval-decision-gate exposes the v3.8 approval decision gate contract
  - approve, hold, reject, field-needed, reviewer, reason, auditRef, and stale decision guard are explicit
  - approval gate is Ops-only/read-only and does not persist decisions, execute actions, write runbooks, or mutate media/event/client schemas
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v380-approval-decision-gate";
const schema = "media-server.ops.v380-approval-decision-gate.v1";
const route = "/ops/api/actions/approval-decision-gate";
const ledgerRoute = "/ops/api/actions/request-ledger";
const capabilityRoute = "/ops/api/actions/capability-contract";
const featureIds = ["LAB-114", "SAFE-184", "OPS-151"];
const files = loadFiles();
const checks = [];

check("Ops server builds the v3.8 approval decision gate model", () => {
  for (const snippet of [
    "struct OpsV380ApprovalDecisionGateItem",
    "BuildV380ApprovalDecisionGateItems",
    "AppendV380ApprovalDecisionGateItemJson",
    "OpsV380ApprovalDecisionGateJson",
    schema,
    "approvalDecisionGate",
    "decisionStates",
    "approve",
    "hold",
    "reject",
    "field-needed",
    "reviewer",
    "reason",
    "auditRef",
    "staleDecisionGuard",
    ledgerRoute,
    capabilityRoute,
  ]) {
    assertIncludes(files.server, snippet, "v380 approval decision gate server model");
  }
});

check("approval decision gate preserves no-execution, no-persist, and no-schema-change boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV380ApprovalDecisionGateJson",
    "struct OpsV370SiteSourceGroupContractItem",
  );
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "approvalGateContractOnly",
    "staleDecisionGuard",
    "decisionWritePerformed",
    "actionExecutionPerformed",
    "actionRequestPersisted",
    "approvalDecisionPersisted",
    "readinessCheckExecuted",
    "sourceRecheckExecuted",
    "clientNoticeSent",
    "noticeQueueWritePerformed",
    "ruleRegistryWritePerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "runbookInstancePersisted",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientPayloadChanged",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "v380 approval decision gate flags");
  }
  for (const flag of [
    "decisionWritePerformed",
    "actionExecutionPerformed",
    "actionRequestPersisted",
    "approvalDecisionPersisted",
    "readinessCheckExecuted",
    "sourceRecheckExecuted",
    "clientNoticeSent",
    "noticeQueueWritePerformed",
    "ruleRegistryWritePerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "runbookInstancePersisted",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientPayloadChanged",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
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
    "ExecuteAction",
    "PersistActionRequest",
    "PersistApproval",
    "StoreApproval",
    "AppendApproval",
    "PersistRunbook",
    "PersistNoticeQueue",
    "SendClientNotice",
    "AppendEventRecord(",
    "AppendOpsAuditRecord(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `approval decision gate must not execute, persist, write, or expose restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the approval decision gate as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "v380 approval decision gate route");
  assertIncludes(block, "request.method == \"GET\"", "v380 approval decision gate route");
  assertIncludes(block, "require_ops_principal()", "v380 approval decision gate route");
  assertIncludes(block, "OpsV380ApprovalDecisionGateJson()", "v380 approval decision gate route");
  assertIncludes(block, "Cache-Control", "v380 approval decision gate route");
  assertIncludes(block, "no-store", "v380 approval decision gate route");
  assert(!block.includes("require_source_write_principal"), "approval decision gate must not require source write principal");
});

check("docs, inventory, and dispatch map v3.8 Step 5", () => {
  for (const snippet of [
    "| 5 | v3.8.0 (5) Approval Decision Gate | P0 | 완료 |",
    "## v3.8.0 Step 5 개발 기록",
    route,
    `\`./server.sh ${command}\``,
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.8 Step 5");
  }
  assertIncludes(
    files.streamVerification,
    `| v3.8.0 (5) | \`./server.sh ${command}\` | Approval Decision Gate.`,
    "stream verification v3.8 Step 5",
  );
  assertIncludes(files.featureInventory, "v3.8.0 (5) Approval Decision Gate", "feature inventory v3.8 Step 5");
  for (const id of featureIds) {
    assertIncludes(files.featureInventory, `\`${id}\``, `feature inventory ${id}`);
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.releaseRecords, "V380 Approval Decision Gate", "release records v3.8 Step 5");
  assertIncludes(files.releaseRecords, `\`./server.sh ${command}\``, "release records v3.8 Step 5");
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v380_approval_decision_gate.mjs", "server.sh dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  assertIncludes(files.scriptInventory, "verify_v380_approval_decision_gate.mjs", "script inventory");
});

finish("== v3.8.0 Approval Decision Gate summary ==", { schema, step: "v3.8.0 (5)", route });

function loadFiles() {
  return {
    server: readText("src/ingress/webrtc_http_server.cpp"),
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

function extractRouteBlock(text, routeNeedle) {
  const start = text.indexOf(`request.path == "${routeNeedle}"`);
  assert(start >= 0, `missing route: ${routeNeedle}`);
  const next = text.indexOf("\n                        if (request.path == ", start + 1);
  return text.slice(start, next >= 0 ? next : start + 2200);
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}

function assertFlagFalse(text, flag) {
  const index = text.indexOf(flag);
  assert(index >= 0, `missing boundary flag: ${flag}`);
  assert(text.slice(index, index + 144).includes("false"), `boundary flag must be false: ${flag}`);
}

function finish(title, summary) {
  const results = runChecks();
  console.log("");
  console.log(title);
  for (const [key, value] of Object.entries(summary)) {
    console.log(`- ${key}: ${value}`);
  }
  console.log("- writes: no approval/action request/runbook/EventRecord/client/media mutation performed");
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

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
