#!/usr/bin/env node
import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";
// 파일 용도: v3.5.0 Step 3 Operations Command Plan Contract 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.5.0 Operations Command Plan Contract verification

Usage:
  ./server.sh verify-v350-operations-command-plan-contract

Checks:
  - /ops/api/live-operations/command-plan exposes an Ops-only command plan contract
  - the contract defines source recheck, recovery, maintenance, client notice, and rule follow-up candidates
  - candidates remain draft/read-only and do not execute source, view, rule, client, EventRecord, audit, or media mutations
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v350-operations-command-plan-contract";
const schema = "media-server.ops.v350-command-plan.v1";
const route = "/ops/api/live-operations/command-plan";
const files = {
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

const checks = [];

check("Ops server builds the v3.5 command plan contract", () => {
  for (const snippet of [
    "struct OpsV350CommandPlanCandidate",
    "struct OpsV350CommandPlanSummary",
    "BuildV350CommandPlanCandidates",
    "BuildV350CommandPlanSummary",
    "AppendV350CommandPlanCandidateJson",
    "OpsV350CommandPlanJson",
    schema,
    "commandPlanSummary",
    "commandPlanCandidates",
    "sourceRecheck",
    "recovery",
    "maintenance",
    "clientNotice",
    "ruleFollowUp",
    "candidateType",
    "draftOnly",
  ]) {
    assertIncludes(files.server, snippet, "v350 command plan server model");
  }
});

check("command plan derives candidates from live graph and existing source/review context", () => {
  const block = extractBlock(files.server, "struct OpsV350CommandPlanCandidate", "struct OpsV350IncidentCommandHandoff");
  for (const snippet of [
    "BuildV350LiveOperationsGraphContext",
    "OpsV350LiveOperationsGraphContext",
    "sourceRecheck",
    "recovery",
    "maintenance",
    "clientNotice",
    "ruleFollowUp",
    "sourceHealthRecheck",
    "recoveryCandidatePackage",
    "clientNoticeDraft",
    "ruleFollowUpDraft",
    "operatorApprovalRequired",
    "blockedReason",
  ]) {
    assertIncludes(block, snippet, "v350 command plan candidate derivation");
  }
});

check("command plan preserves draft-only no-execution boundaries", () => {
  const block = extractBlock(files.server, "std::string OpsV350CommandPlanJson", "struct OpsV350IncidentCommandHandoff");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "draftOnly",
    "operatorApprovalRequired",
    "sourceRecheckExecuted",
    "recoveryExecuted",
    "maintenanceStarted",
    "clientNoticeSent",
    "ruleFollowUpApplied",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    assertIncludes(block, snippet, "v350 command plan boundary flags");
  }
  for (const flag of [
    "sourceRecheckExecuted",
    "recoveryExecuted",
    "maintenanceStarted",
    "clientNoticeSent",
    "ruleFollowUpApplied",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    const index = block.indexOf(flag);
    const nearby = block.slice(index, index + 128);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  const ruleRegistryWritePerformed = block.includes('\\"ruleRegistryWritePerformed\\":true');
  const ruleFollowUpApplied = block.includes('\\"ruleFollowUpApplied\\":true');
  const eventPostPayloadChanged = block.includes('\\"eventPostPayloadChanged\\":true');
  assert(ruleRegistryWritePerformed === false && ruleFollowUpApplied === false && eventPostPayloadChanged === false, "RULE-105 OpsV350CommandPlanJson rule follow-up stays draft-only without registryWrite/apply/mutation Changed");
});

check("Ops API exposes the command plan route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/live-operations/staged-change-plan-impact-preview\")");
  assertIncludes(block, route, "command plan route");
  assertIncludes(block, "request.method == \"GET\"", "command plan route");
  assertIncludes(block, "require_ops_principal()", "command plan route");
  assertIncludes(block, "OpsV350CommandPlanJson(", "command plan route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "command plan route");
  assertIncludes(block, "Cache-Control", "command plan route");
  assertIncludes(block, "no-store", "command plan route");
  assert(!block.includes("require_source_write_principal"), "command plan route must not require source writes");
});

check("roadmap records v3.5 Step 3 without overclaiming handoff or staging", () => {
  for (const snippet of [
    "| 3 | v3.5.0 (3) Operations Command Plan Contract | P0 | 완료 |",
    "source recheck, recovery, maintenance, client notice, rule follow-up 후보를 command plan으로 표현",
    "## v3.5.0 Step 3 개발 기록",
    route,
    "OpsV350CommandPlanJson",
    "`./server.sh verify-v350-operations-command-plan-contract`",
    "Incident-to-Command Handoff, Staged Change Plan 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.5 Step 3");
  }
});

check("stream verification exposes v3.5 Step 3 command and boundary", () => {
  for (const snippet of [
    `| v3.5.0 (3) | \`./server.sh ${command}\` | Operations Command Plan Contract.`,
    route,
    "source recheck, recovery, maintenance, client notice, rule follow-up",
    "draft-only command plan",
    "source/view/rule/client/EventRecord/Ops audit/media mutation 미수행",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.5 Step 3");
  }
});

check("feature inventory and release records map v3.5 Step 3", () => {
  for (const snippet of [
    `v3.5.0 (3) Operations Command Plan Contract | \`SRC-045\`, \`RULE-105\`, \`SAFE-137\`, \`OPS-104\` | \`${command}\``,
    "SRC-045 | V350 Step 3 source recheck/recovery command candidates",
    "RULE-105 | V350 Step 3 rule follow-up command candidate boundary",
    "SAFE-137 | V350 Step 3 command plan no-execution boundary",
    "OPS-104 | V350 Step 3 Operations Command Plan Contract 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.5 Step 3");
  }
  for (const snippet of [
    "V350 Operations Command Plan Contract",
    `\`./server.sh ${command}\``,
    "v350 Step 3 RED operations command plan gate",
    "v350 Step 3 operations command plan final",
    "v350 Step 3 UI 풀테스트",
    "v350 Step 3 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.5 Step 3");
  }
});

check("server entrypoint and inventory verifiers include v3.5 Step 3 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v350_operations_command_plan_contract.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["SRC-045", "RULE-105", "SAFE-137", "OPS-104"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v350_operations_command_plan_contract.mjs", "script inventory");
});

check("SAFE-137 canonical command plan no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV350CommandPlanJson(");
  const routeObserved = files.server.includes("/ops/api/live-operations/command-plan");
  const safe137BoundaryObserved = block.includes("BuildV350CommandPlanCandidates") && block.includes("media-server.ops.v350-command-plan.v1");
  const commandPlanExecuted = /\b(?:Execute|Apply|Write|Persist|UpdateSource|CreateVaRule)[A-Za-z0-9_:]*\s*\(/.test(block);
  const mutationPerformed = commandPlanExecuted;
  assert(routeObserved && safe137BoundaryObserved && commandPlanExecuted === false && mutationPerformed === false,
    "SAFE-137 BuildV350CommandPlanCandidates draft-only command plan must not execute or mutate source view rule client event audit media state");
});

const results = runChecks();
console.log("");
console.log("== v3.5.0 operations command plan summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.5.0 (3)");
console.log(`- route: ${route}`);
console.log("- candidates: source recheck, recovery, maintenance, client notice, rule follow-up");
console.log("- writes: no source/view/rule/client/EventRecord/Ops audit/media mutation performed");
console.log("- incidentHandoff: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
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
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
