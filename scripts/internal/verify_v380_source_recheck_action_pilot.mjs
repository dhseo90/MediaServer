#!/usr/bin/env node
// 파일 용도: v3.8.0 Step 7 Source Recheck Action Pilot 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.8.0 Source Recheck Action Pilot verification

Usage:
  ./server.sh verify-v380-source-recheck-action-pilot

Checks:
  - /ops/api/actions/source-recheck-pilot exposes the v3.8 source recheck action pilot contract
  - source health recheck request, dry execution result envelope, readiness refs, and blocker states are explicit
  - source recheck pilot is Ops-only/read-only and does not execute rechecks, persist action results, write source state, or mutate media/event/client schemas
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v380-source-recheck-action-pilot";
const schema = "media-server.ops.v380-source-recheck-action-pilot.v1";
const route = "/ops/api/actions/source-recheck-pilot";
const readinessRoute = "/ops/api/actions/readiness-preflight";
const capabilityRoute = "/ops/api/actions/capability-contract";
const approvalRoute = "/ops/api/actions/approval-decision-gate";
const ledgerRoute = "/ops/api/actions/request-ledger";
const featureIds = ["LAB-116", "SAFE-186", "OPS-153"];
const files = loadFiles();
const checks = [];

check("Ops server builds the v3.8 source recheck action pilot model", () => {
  for (const snippet of [
    "struct OpsV380SourceRecheckActionPilotItem",
    "BuildV380SourceRecheckActionPilotItems",
    "AppendV380SourceRecheckActionPilotItemJson",
    "OpsV380SourceRecheckActionPilotJson",
    schema,
    "sourceRecheckActionPilot",
    "pilotCandidate",
    "sourceHealthRecheck",
    "dryExecutionResultEnvelope",
    "recheckRequest",
    "executionPreview",
    "readinessRef",
    "not-run",
    "ready",
    "blocked",
    "degraded",
    "field-needed",
    readinessRoute,
    capabilityRoute,
    approvalRoute,
    ledgerRoute,
  ]) {
    assertIncludes(files.server, snippet, "v380 source recheck action pilot server model");
  }
});

check("source recheck action pilot preserves no-execution, no-persist, and no-schema-change boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV380SourceRecheckActionPilotJson",
    "struct OpsV370SiteSourceGroupContractItem",
  );
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "sourceRecheckPilotContractOnly",
    "dryExecutionResultEnvelope",
    "sourceRecheckExecuted",
    "sourceHealthWritePerformed",
    "actionExecutionPerformed",
    "actionResultPersisted",
    "actionRequestPersisted",
    "approvalDecisionPersisted",
    "readinessResultPersisted",
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
    assertIncludes(block, snippet, "v380 source recheck action pilot flags");
  }
  for (const flag of [
    "sourceRecheckExecuted",
    "sourceHealthWritePerformed",
    "actionExecutionPerformed",
    "actionResultPersisted",
    "actionRequestPersisted",
    "approvalDecisionPersisted",
    "readinessResultPersisted",
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
    "RunSourceRecheck",
    "PersistActionResult",
    "PersistActionRequest",
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
    assert(!block.includes(forbidden), `source recheck pilot must not execute, persist, write, or expose restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the source recheck pilot as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "v380 source recheck action pilot route");
  assertIncludes(block, "request.method == \"GET\"", "v380 source recheck action pilot route");
  assertIncludes(block, "require_ops_principal()", "v380 source recheck action pilot route");
  assertIncludes(block, "OpsV380SourceRecheckActionPilotJson()", "v380 source recheck action pilot route");
  assertIncludes(block, "Cache-Control", "v380 source recheck action pilot route");
  assertIncludes(block, "no-store", "v380 source recheck action pilot route");
  assert(!block.includes("require_source_write_principal"), "source recheck pilot must not require source write principal");
});

check("docs, inventory, and dispatch map v3.8 Step 7", () => {
  for (const snippet of [
    "| 7 | v3.8.0 (7) Source Recheck Action Pilot | P1 | 완료 |",
    "## v3.8.0 Step 7 개발 기록",
    route,
    `\`./server.sh ${command}\``,
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.8 Step 7");
  }
  assertIncludes(
    files.streamVerification,
    `| v3.8.0 (7) | \`./server.sh ${command}\` | Source Recheck Action Pilot.`,
    "stream verification v3.8 Step 7",
  );
  assertIncludes(files.featureInventory, "v3.8.0 (7) Source Recheck Action Pilot", "feature inventory v3.8 Step 7");
  for (const id of featureIds) {
    assertIncludes(files.featureInventory, `\`${id}\``, `feature inventory ${id}`);
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.releaseRecords, "V380 Source Recheck Action Pilot", "release records v3.8 Step 7");
  assertIncludes(files.releaseRecords, `\`./server.sh ${command}\``, "release records v3.8 Step 7");
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v380_source_recheck_action_pilot.mjs", "server.sh dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  assertIncludes(files.scriptInventory, "verify_v380_source_recheck_action_pilot.mjs", "script inventory");
});

finish("== v3.8.0 Source Recheck Action Pilot summary ==", { schema, step: "v3.8.0 (7)", route });

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
  console.log("- writes: no source recheck/action result/runbook/EventRecord/client/media mutation performed");
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
