#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.6.0 Step 4 Command Plan Dry-run Simulator 구현, 문서, inventory 연결을 검증한다.

import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.6.0 Command Plan Dry-run Simulator verification

Usage:
  ./server.sh verify-v360-command-plan-dry-run-simulator

Checks:
  - /ops/api/live-operations/simulation/command-plan-dry-run calculates dry-run results
  - source recheck, recovery, maintenance, client notice, and rule follow-up candidate types are covered
  - no candidate execution or write path is performed
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v360-command-plan-dry-run-simulator";
const schema = "media-server.ops.v360-command-plan-dry-run.v1";
const route = "/ops/api/live-operations/simulation/command-plan-dry-run";
const files = loadFiles();
const checks = [];

check("Ops server builds the v3.6 command plan dry-run simulator", () => {
  for (const snippet of [
    "struct OpsV360CommandPlanDryRunResult",
    "struct OpsV360CommandPlanDryRunSummary",
    "BuildV360CommandPlanDryRunResults",
    "BuildV360CommandPlanDryRunSummary",
    "AppendV360CommandPlanDryRunResultJson",
    "OpsV360CommandPlanDryRunSimulatorJson",
    schema,
    "commandPlanDryRunSummary",
    "commandPlanDryRunResults",
    "sourceRecheck",
    "recovery",
    "maintenance",
    "clientNotice",
    "ruleFollowUp",
    "dryRunStatus",
    "writePlan",
  ]) assertIncludes(files.server, snippet, "v360 command dry-run server model");
});

check("dry-run simulator derives all command plan candidate families", () => {
  const block = extractBlock(files.server, "struct OpsV360CommandPlanDryRunResult", "std::string OpsV360CommandPlanDryRunSimulatorJson");
  for (const snippet of [
    "BuildV350CommandPlanCandidates",
    "OpsV350CommandPlanCandidate",
    "sourceRecheck",
    "recovery",
    "maintenance",
    "clientNotice",
    "ruleFollowUp",
    "dryRunComputed",
    "predictedResult",
    "blockers",
  ]) assertIncludes(block, snippet, "v360 dry-run derivation");
});

check("dry-run simulator preserves no-write no-execution boundaries", () => {
  const block = extractBlock(files.server, "std::string OpsV360CommandPlanDryRunSimulatorJson", "struct OpsV360SourceRuleImpactDiff");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "dryRunOnly",
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
    "commandPlanExecuted",
    "automaticApplyPerformed",
    "rtspOrWebrtcMediaPathChanged",
  ]) assertIncludes(block, snippet, "v360 dry-run boundary flags");
  for (const flag of [
    "sourceRecheckExecuted", "recoveryExecuted", "maintenanceStarted", "clientNoticeSent",
    "ruleFollowUpApplied", "sourceRegistryWritePerformed", "publishedViewWritePerformed",
    "ruleRegistryWritePerformed", "eventRecordWritePerformed", "opsAuditWritePerformed",
    "commandPlanExecuted", "automaticApplyPerformed", "rtspOrWebrtcMediaPathChanged",
  ]) assertFlagFalse(block, flag);
  const ruleRegistryWritePerformed = block.includes('\\"ruleRegistryWritePerformed\\":true');
  const ruleFollowUpApplied = block.includes('\\"ruleFollowUpApplied\\":true');
  const clientNoticeSendPerformed = block.includes('\\"clientNoticeSent\\":true');
  assert(ruleRegistryWritePerformed === false && ruleFollowUpApplied === false && clientNoticeSendPerformed === false, "RULE-107 OpsV360CommandPlanDryRunSimulatorJson dry-run registryWrite/apply/client notice send absence");
});

check("Ops API exposes the command dry-run route as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "command dry-run route");
  assertIncludes(block, "request.method == \"GET\"", "command dry-run route");
  assertIncludes(block, "require_ops_principal()", "command dry-run route");
  assertIncludes(block, "OpsV360CommandPlanDryRunSimulatorJson(", "command dry-run route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "command dry-run route");
  assertIncludes(block, "Cache-Control", "command dry-run route");
  assertIncludes(block, "no-store", "command dry-run route");
});

check("docs, inventory, and dispatch map v3.6 Step 4", () => {
  assertStepDocs("4", "Command Plan Dry-run Simulator", "SRC-050", "RULE-107", "SAFE-151", "OPS-118");
  for (const id of ["SRC-050", "RULE-107", "SAFE-151", "OPS-118"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v360_command_plan_dry_run_simulator.mjs", "server.sh dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  assertIncludes(files.scriptInventory, "verify_v360_command_plan_dry_run_simulator.mjs", "script inventory");
});

check("SAFE-151 canonical bounded no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV360CommandPlanDryRunSimulatorJson(");
  const routeObserved = files.server.includes("/ops/api/live-operations/simulation/command-plan-dry-run");
  const safe151BoundaryObserved = block.includes("BuildV360CommandPlanDryRunResults");
  const writePerformed = /\b(?:Write|Persist|AppendFile|UpdateSource|CreateVaRule|UpdateVaRule|AssignReviewer)[A-Za-z0-9_:]*\s*\(/.test(block);
  const mutationPerformed = writePerformed || /\b(?:Apply|AutomaticApply|SafeApply|SendClientNotice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const executionPerformed = /\b(?:Execute|RunSimulation|Probe|Contact|ProviderCall|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const automaticApplyPerformed = /\b(?:AutomaticApply|SafeApply|ApplyRule|ApplySource)[A-Za-z0-9_:]*\s*\(/.test(block);
  const clientNoticeSent = /\bSendClientNotice[A-Za-z0-9_:]*\s*\(/.test(block);
  const sendPerformed = clientNoticeSent;
  const fieldSmokeExecuted = /\b(?:ExecuteFieldSmoke|ProbeEndpoint|ContactDevice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const providerCallPerformed = /\b(?:ProviderCall|ProviderClient|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const rawMaterialExposed = /\\"(?:rawLocator|rawJson|rawProviderResponse|rawEndpoint|rawMaterial)\\":true/.test(block);
  const sourceUrlExposed = block.includes("\\\"sourceUrlIncluded\\\":true") || block.includes("\\\"sourceUrlExposed\\\":true");
  const credentialMaterialExposed = block.includes("\\\"credentialMaterialIncluded\\\":true") || block.includes("\\\"credentialMaterialExposed\\\":true");
  const debugMaterialExposed = block.includes("\\\"debugMaterialIncluded\\\":true") || block.includes("\\\"debugMaterialExposed\\\":true");
  const viewerClientExposureAdded = block.includes("\\\"viewerClientExposureAdded\\\":true");
  const mediaPathChanged = block.includes("\\\"rtspOrWebrtcMediaPathChanged\\\":true");
  assert(routeObserved && safe151BoundaryObserved && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && sendPerformed === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-151 BuildV360CommandPlanDryRunResults must remain bounded no-execution no-write redacted and client/provider isolated");
});

finish("== v3.6.0 command plan dry-run simulator summary ==", { schema, step: "v3.6.0 (4)", route });

function assertStepDocs(step, title, ...ids) {
  for (const snippet of [`| ${step} | v3.6.0 (${step}) ${title} | P0 | 완료 |`, `## v3.6.0 Step ${step} 개발 기록`, route, `\`./server.sh ${command}\``]) assertIncludes(files.backlog, snippet, `backlog v3.6 Step ${step}`);
  assertIncludes(files.streamVerification, `| v3.6.0 (${step}) | \`./server.sh ${command}\` | ${title}.`, `stream verification v3.6 Step ${step}`);
  assertIncludes(files.featureInventory, `v3.6.0 (${step}) ${title}`, `feature inventory v3.6 Step ${step}`);
  for (const id of ids) assertIncludes(files.featureInventory, `\`${id}\``, `feature inventory ${id}`);
  assertIncludes(files.releaseRecords, `V360 ${title}`, `release records v3.6 Step ${step}`);
  assertIncludes(files.releaseRecords, `\`./server.sh ${command}\``, `release records v3.6 Step ${step}`);
}
function loadFiles() { return { server: readWebRtcHttpServerBundle(readText), backlog: readText("docs/development-backlog.md"), streamVerification: readText("docs/stream-verification.md"), featureInventory: readText("docs/project-feature-test-inventory.md"), featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"), projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"), scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"), releaseRecords: readText("docs/release-test-records.md"), serverSh: readText("server.sh") }; }
function extractRouteBlock(text, routeNeedle) { const start = text.indexOf(`request.path == "${routeNeedle}"`); assert(start >= 0, `missing route: ${routeNeedle}`); const next = text.indexOf("\n                        if (request.path == ", start + 1); return text.slice(start, next >= 0 ? next : start + 2200); }
function extractBlock(text, startNeedle, endNeedle) { const start = text.indexOf(startNeedle); assert(start >= 0, `missing block start: ${startNeedle}`); const end = text.indexOf(endNeedle, start + startNeedle.length); assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`); return text.slice(start, end); }
function assertFlagFalse(text, flag) { const index = text.indexOf(flag); assert(index >= 0, `missing boundary flag: ${flag}`); assert(text.slice(index, index + 128).includes("false"), `boundary flag must be false: ${flag}`); }
function finish(title, summary) { const results = runChecks(); console.log(""); console.log(title); for (const [key, value] of Object.entries(summary)) console.log(`- ${key}: ${value}`); console.log("- writes: no command/source/view/rule/EventRecord/Ops audit/client/media mutation performed"); console.log(`- pass: ${results.pass}`); console.log(`- fail: ${results.fail}`); if (results.fail > 0) process.exit(1); }
function runChecks() { let pass = 0, fail = 0; for (const item of checks) { try { item.fn(); pass += 1; console.log(`[pass] ${item.name}`); } catch (error) { fail += 1; console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`); } } return { pass, fail }; }
function check(name, fn) { checks.push({ name, fn }); }
function readText(relativePath) { return fs.readFileSync(path.join(rootDir, relativePath), "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function assertIncludes(text, snippet, label) { assert(text.includes(snippet), `${label} missing snippet: ${snippet}`); }
