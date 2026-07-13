#!/usr/bin/env node
// 파일 용도: v3.6.0 Step 10 Rule/VA What-if Replay Pack 구현, 문서, inventory 연결을 검증한다.

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
  printUsageAndExit(`v3.6.0 Rule/VA What-if Replay Pack verification

Usage:
  ./server.sh verify-v360-rule-va-what-if-replay-pack

Checks:
  - /ops/api/live-operations/simulation/rule-va-what-if-replay-pack exposes read-only what-if replay candidates
  - rule threshold, preset, and scenario candidates compare against EventRecord/VA fixture context
  - /ops simulation workspace renders the pack without rule/EventRecord/media mutation
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v360-rule-va-what-if-replay-pack";
const schema = "media-server.ops.v360-rule-va-what-if-replay-pack.v1";
const route = "/ops/api/live-operations/simulation/rule-va-what-if-replay-pack";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  uiScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  serverSh: readText("server.sh"),
};

const checks = [];

check("Ops server builds the v3.6 Rule/VA what-if replay pack model", () => {
  for (const snippet of [
    "struct OpsV360RuleVaWhatIfReplayCandidate",
    "struct OpsV360RuleVaWhatIfReplaySummary",
    "BuildV360RuleVaWhatIfReplayCandidates",
    "BuildV360RuleVaWhatIfReplaySummary",
    "AppendV360RuleVaWhatIfReplayCandidateJson",
    "AppendV360RuleVaWhatIfReplaySummaryJson",
    "OpsV360RuleVaWhatIfReplayPackJson",
    schema,
    "whatIfReplayId",
    "eventRecordRef",
    "ruleThresholdCandidate",
    "presetCandidate",
    "scenarioCandidate",
    "beforeMatchState",
    "afterMatchState",
    "whatIfResultDelta",
  ]) {
    assertIncludes(files.server, snippet, "v360 Rule/VA what-if replay server model");
  }
  const producerBlock = extractCppFunctionBlock(files.server, "std::string OpsV360RuleVaWhatIfReplayPackJson(");
  assertIncludes(producerBlock, "media-server.ops.v360-rule-va-what-if-replay-pack.v1", "v360 Rule/VA what-if replay schema");
});

check("what-if replay derives from EventRecord/VA fixture context and simulation diff inputs", () => {
  const block = extractBlock(files.server, "struct OpsV360RuleVaWhatIfReplayCandidate", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "BuildV350LiveOperationsGraphContext",
    "BuildV360CommandPlanDryRunResults",
    "BuildV360SourceRuleImpactDiffs",
    "EventRecord",
    "vaFixtureRef",
    "thresholdCandidate",
    "presetCandidate",
    "scenarioCandidate",
    "ruleThresholdDelta",
    "presetDelta",
    "scenarioDelta",
  ]) {
    assertIncludes(block, snippet, "v360 Rule/VA what-if replay derivation");
  }
});

check("what-if replay preserves read-only no-apply boundaries", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV360RuleVaWhatIfReplayPackJson(");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "whatIfOnly",
    "ruleRegistryWritePerformed",
    "ruleThresholdApplied",
    "presetApplied",
    "scenarioApplied",
    "eventRecordWritePerformed",
    "eventPostPayloadChanged",
    "rtspOrWebrtcMediaPathChanged",
    "clientNoticeSent",
    "viewerClientExposureAdded",
    "rawDiagnosticJsonIncluded",
  ]) {
    assertIncludes(block, snippet, "v360 Rule/VA what-if replay boundary");
  }
  for (const flag of [
    "ruleRegistryWritePerformed",
    "ruleThresholdApplied",
    "presetApplied",
    "scenarioApplied",
    "eventRecordWritePerformed",
    "eventPostPayloadChanged",
    "rtspOrWebrtcMediaPathChanged",
    "clientNoticeSent",
    "viewerClientExposureAdded",
    "rawDiagnosticJsonIncluded",
  ]) {
    const index = block.indexOf(flag);
    const nearby = block.slice(index, index + 128);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  assert(exactBooleanFlagValue(block, "eventRecordWritePerformed") === false, "eventRecordWritePerformed must remain false");
  const ruleRegistryWritePerformed = block.includes('\\"ruleRegistryWritePerformed\\":true');
  const scenarioApplied = block.includes('\\"scenarioApplied\\":true');
  const eventPostPayloadChanged = block.includes('\\"eventPostPayloadChanged\\":true');
  assert(ruleRegistryWritePerformed === false && scenarioApplied === false && eventPostPayloadChanged === false, "RULE-109 OpsV360RuleVaWhatIfReplayPackJson calculation-only registryWrite/scenario apply/mutation Changed absence");
});

check("Ops API exposes the Rule/VA what-if route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/");
  assertIncludes(block, route, "Rule/VA what-if route");
  assertIncludes(block, "request.method == \"GET\"", "Rule/VA what-if route");
  assertIncludes(block, "require_ops_principal()", "Rule/VA what-if route");
  assertIncludes(block, "OpsV360RuleVaWhatIfReplayPackJson(", "Rule/VA what-if route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "Rule/VA what-if route");
  assertIncludes(block, "Cache-Control", "Rule/VA what-if route");
  assertIncludes(block, "no-store", "Rule/VA what-if route");
});

check("/ops simulation workspace declares and renders Rule/VA what-if replay pack", () => {
  const serverBlock = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "dashSimulationWorkspaceWhatIfReplayList",
    "ops-simulation-what-if-replay-list",
    "data-v360-rule-va-what-if-replay-pack",
    schema,
    "Rule/VA What-if Replay",
  ]) {
    assertIncludes(serverBlock, snippet, "v360 Rule/VA what-if dashboard shell");
  }
  const scriptBlock = extractBlock(files.uiScript, "const renderV360OpsSimulationWorkspace", "const renderDashboardRootCause");
  assertIncludes(scriptBlock, "data-v360-rule-va-what-if-replay", "v360 Rule/VA what-if product UI state");
  assertIncludes(files.uiScript, "/ops/dashboard", "UI-091 canonical route obligation");
  assertIncludes(files.server, "media-server.ops.v360-rule-va-what-if-replay-pack.v1", "UI-091 canonical schema obligation");
  for (const snippet of [
    "ruleVaWhatIfReplayPack",
    "ruleVaWhatIfReplayRoute",
    route,
    "whatIfReplayCandidates",
    "ruleThresholdCandidate",
    "presetCandidate",
    "scenarioCandidate",
    "whatIfResultDelta",
    "dashSimulationWorkspaceWhatIfReplayList",
    "requestJson(ruleVaWhatIfReplayRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v360 Rule/VA what-if renderer");
  }
});

check("Rule/VA what-if styling and client redaction are in place", () => {
  for (const snippet of [
    ".ops-simulation-what-if-replay-list",
    ".ops-simulation-what-if-replay-entry",
    "body.ops-shell .ops-simulation-workspace .ops-simulation-what-if-replay-list",
  ]) {
    assertIncludes(files.css, snippet, "v360 Rule/VA what-if CSS");
  }
  for (const forbidden of [schema, route, "whatIfReplayCandidates", "ruleThresholdCandidate", "scenarioCandidate"]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose Rule/VA what-if material: ${forbidden}`);
  }
});

check("docs, inventory, and dispatch map v3.6 Step 10", () => {
  for (const snippet of [
    "| 10 | v3.6.0 (10) Rule/VA What-if Replay Pack | P1 | 완료 |",
    "## v3.6.0 Step 10 개발 기록",
    route,
    "OpsV360RuleVaWhatIfReplayPackJson",
    `\`./server.sh ${command}\``,
    "Simulation Export Bundle 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.6 Step 10");
  }
  for (const snippet of [
    `| v3.6.0 (10) | \`./server.sh ${command}\` | Rule/VA What-if Replay Pack.`,
    "rule threshold, preset, scenario",
    "EventRecord/VA fixture",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.6 Step 10");
  }
  for (const snippet of [
    `v3.6.0 (10) Rule/VA What-if Replay Pack | \`UI-091\`, \`RULE-109\`, \`EVT-078\`, \`LAB-097\`, \`SAFE-157\`, \`OPS-124\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-091 | V360 Step 10 Rule/VA What-if Replay Pack UI",
    "RULE-109 | V360 Step 10 Rule/VA what-if candidates",
    "EVT-078 | V360 Step 10 EventRecord what-if replay input",
    "LAB-097 | V360 Step 10 Rule/VA what-if replay pack",
    "SAFE-157 | V360 Step 10 Rule/VA what-if boundary",
    "OPS-124 | V360 Step 10 Rule/VA What-if Replay Pack 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.6 Step 10");
  }
  for (const snippet of [
    "V360 Rule/VA What-if Replay Pack",
    `\`./server.sh ${command}\``,
    "v360 Step 10 RED rule/VA what-if replay gate",
    "v360 Step 10 rule/VA what-if replay final",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.6 Step 10");
  }
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v360_rule_va_what_if_replay_pack.mjs", "server.sh script dispatch");
  for (const id of ["UI-091", "RULE-109", "EVT-078", "LAB-097", "SAFE-157", "OPS-124"]) assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  for (const id of ["UI-091", "RULE-109", "EVT-078", "LAB-097", "SAFE-157", "OPS-124"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v360_rule_va_what_if_replay_pack.mjs", "script inventory");
});

check("SAFE-157 canonical bounded no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV360RuleVaWhatIfReplayPackJson(");
  const routeObserved = files.server.includes("/ops/api/live-operations/simulation/rule-va-what-if-replay-pack");
  const safe157BoundaryObserved = block.includes("BuildV360RuleVaWhatIfReplayCandidates");
  const writePerformed = /\b(?:Write|Persist|AppendFile|UpdateSource|CreateVaRule|UpdateVaRule|AssignReviewer)[A-Za-z0-9_:]*\s*\(/.test(block);
  const mutationPerformed = writePerformed || /\b(?:Apply|AutomaticApply|SafeApply|SendClientNotice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const executionPerformed = /\b(?:Execute|RunSimulation|Probe|Contact|ProviderCall|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const automaticApplyPerformed = /\b(?:AutomaticApply|SafeApply|ApplyRule|ApplySource)[A-Za-z0-9_:]*\s*\(/.test(block);
  const clientNoticeSent = /\bSendClientNotice[A-Za-z0-9_:]*\s*\(/.test(block);
  const fieldSmokeExecuted = /\b(?:ExecuteFieldSmoke|ProbeEndpoint|ContactDevice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const providerCallPerformed = /\b(?:ProviderCall|ProviderClient|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const rawMaterialExposed = /\\"(?:rawLocator|rawJson|rawProviderResponse|rawEndpoint|rawMaterial)\\":true/.test(block);
  const sourceUrlExposed = block.includes("\\\"sourceUrlIncluded\\\":true") || block.includes("\\\"sourceUrlExposed\\\":true");
  const credentialMaterialExposed = block.includes("\\\"credentialMaterialIncluded\\\":true") || block.includes("\\\"credentialMaterialExposed\\\":true");
  const debugMaterialExposed = block.includes("\\\"debugMaterialIncluded\\\":true") || block.includes("\\\"debugMaterialExposed\\\":true");
  const viewerClientExposureAdded = block.includes("\\\"viewerClientExposureAdded\\\":true");
  const mediaPathChanged = block.includes("\\\"rtspOrWebrtcMediaPathChanged\\\":true");
  assert(routeObserved && safe157BoundaryObserved && block.includes("media-server.ops.v360-rule-va-what-if-replay-pack.v1") && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-157 BuildV360RuleVaWhatIfReplayCandidates must remain bounded no-execution no-write redacted and client/provider isolated");
});

const results = runChecks();
console.log("");
console.log("== v3.6.0 Rule/VA what-if replay pack summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.6.0 (10)");
console.log(`- route: ${route}`);
console.log("- compares: rule threshold, preset, scenario candidates");
console.log("- writes: no rule/EventRecord/client/media mutation performed");
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
function assert(condition, message) { if (!condition) throw new Error(message); }
function assertIncludes(text, needle, label) { assert(text.includes(needle), `${label} missing snippet: ${needle}`); }
function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
