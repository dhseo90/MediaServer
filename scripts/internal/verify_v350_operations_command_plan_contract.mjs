#!/usr/bin/env node
import { validateFeatureDocumentation } from "./documentation_contract_lib.mjs";
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
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
  - 현행 기능 정의·계약·검증 안내·실제 dispatch 연결 (실행 결과 판정 아님)
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v350-operations-command-plan-contract";
const schema = "media-server.ops.v350-command-plan.v1";
const route = "/ops/api/live-operations/command-plan";
const files = {
  server: readWebRtcHttpServerBundle(readText),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  serverSh: readText("server.sh"),
};

const documentationImplementation = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
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

check("현행 계약 식별자·기능 정의·검증 명령 연결", () => {
  const ids = ["SRC-045","RULE-105","SAFE-137","OPS-104"];
  const currentDefinitions = files.featureInventory.split(/\r?\n/).filter(line => ids.includes(line.split("|")[1]?.trim())).join("\n");
  const errors = validateFeatureDocumentation({
    document: currentDefinitions, identifiers: ["/ops/api/live-operations/command-plan"],
    command, script: "verify_v350_operations_command_plan_contract.mjs", featureIds: ids,
    inventory: files.featureInventory, implementation: documentationImplementation,
    verification: files.streamVerification, server: files.serverSh,
  });
  assert(errors.length === 0, errors.join("; "));
  // 독립 API 검사 결속이며 이 정적 명령의 실행 결과로 대체하지 않는다.
  for (const [id, expectedCommand, expectedFile] of [["SRC-045","verify-ops-source-registry-api","scripts/internal/verify_ops_source_registry_api.mjs"]]) {
    const entries = documentationImplementation.items.filter(item => item.id === id);
    assert(entries.length === 1 && entries[0].verifierEvidence?.command === expectedCommand && entries[0].verifierEvidence?.file === expectedFile, id + " 독립 API 검증 연결 불일치");
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
