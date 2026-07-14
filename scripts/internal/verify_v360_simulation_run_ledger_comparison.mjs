#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.6.0 Step 8 Simulation Run Ledger and Comparison 구현, 문서, inventory 연결을 검증한다.
import { extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.6.0 Simulation Run Ledger and Comparison verification

Usage:
  ./server.sh verify-v360-simulation-run-ledger-comparison

Checks:
  - /ops/api/live-operations/simulation/run-ledger exposes a read-only simulation run ledger
  - simulation run id, input ref, result diff, operator note, and previous-run comparison are accumulated
  - /ops simulation workspace renders the ledger without client/viewer exposure
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v360-simulation-run-ledger-comparison";
const schema = "media-server.ops.v360-simulation-run-ledger.v1";
const route = "/ops/api/live-operations/simulation/run-ledger";
const inputPackRoute = "/ops/api/live-operations/simulation/input-pack";
const runContractRoute = "/ops/api/live-operations/simulation/run-contract";
const dryRunRoute = "/ops/api/live-operations/simulation/command-plan-dry-run";
const impactDiffRoute = "/ops/api/live-operations/simulation/impact-diff";
const readinessRoute = "/ops/api/live-operations/simulation/safe-apply-readiness";
const files = {
  server: readWebRtcHttpServerBundle(readText),
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

check("Ops server builds the v3.6 simulation run ledger and comparison model", () => {
  for (const snippet of [
    "struct OpsV360SimulationRunLedgerEntry",
    "struct OpsV360SimulationRunLedgerSummary",
    "BuildV360SimulationRunLedgerEntries",
    "BuildV360SimulationRunLedgerSummary",
    "AppendV360SimulationRunLedgerEntryJson",
    "AppendV360SimulationRunLedgerSummaryJson",
    "OpsV360SimulationRunLedgerComparisonJson",
    schema,
    "simulationRunId",
    "inputRef",
    "resultDiff",
    "operatorNote",
    "previousRunId",
    "comparedToRunId",
    "changedFields",
    "accumulatedRunCount",
  ]) {
    assertIncludes(files.server, snippet, "v360 simulation run ledger server model");
  }
});

check("simulation ledger derives entries from input pack, run contract, dry-run, impact diff, and readiness", () => {
  const block = extractBlock(files.server, "struct OpsV360SimulationRunLedgerEntry", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "BuildV350LiveOperationsGraphContext",
    "BuildV360SimulationInputPackItems",
    "BuildV360SimulationRunContract",
    "BuildV360SimulationResultEnvelope",
    "BuildV360CommandPlanDryRunResults",
    "BuildV360SourceRuleImpactDiffs",
    "BuildV360SafeApplyReadinessItems",
    "inputRefDelta",
    "resultDiffDelta",
    "readinessBlockerDelta",
    inputPackRoute,
    runContractRoute,
    dryRunRoute,
    impactDiffRoute,
    readinessRoute,
  ]) {
    assertIncludes(block, snippet, "v360 simulation run ledger derivation");
  }
});

check("simulation ledger preserves read-only append-only projection boundaries", () => {
  const block = extractBlock(files.server, "std::string OpsV360SimulationRunLedgerComparisonJson", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "appendOnlyLedgerProjection",
    "simulationRunPersisted",
    "simulationRunExecuted",
    "operatorNoteWritePerformed",
    "resultDiffPersisted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "clientNoticeSent",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "rawDiagnosticJsonIncluded",
  ]) {
    assertIncludes(block, snippet, "v360 simulation ledger boundary flags");
  }
  for (const flag of [
    "simulationRunPersisted",
    "simulationRunExecuted",
    "operatorNoteWritePerformed",
    "resultDiffPersisted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "clientNoticeSent",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "rawDiagnosticJsonIncluded",
  ]) {
    const index = block.indexOf(flag);
    const nearby = block.slice(index, index + 128);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  for (const forbidden of [
    "AppendOpsAuditRecord(",
    "SaveOperatorNote",
    "PersistSimulationRun",
    "ExecuteSimulationRun",
    "ExecuteCommandPlan",
    "SendClientNotice",
    "CreateSource(",
    "UpsertSource(",
    "CreateView(",
    "UpsertView(",
    "credentialRef",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `simulation ledger must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the simulation run ledger route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/");
  assertIncludes(block, route, "simulation run ledger route");
  assertIncludes(block, "request.method == \"GET\"", "simulation run ledger route");
  assertIncludes(block, "require_ops_principal()", "simulation run ledger route");
  assertIncludes(block, "OpsV360SimulationRunLedgerComparisonJson(", "simulation run ledger route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "simulation run ledger route");
  assertIncludes(block, "Cache-Control", "simulation run ledger route");
  assertIncludes(block, "no-store", "simulation run ledger route");
  assert(!block.includes("require_source_write_principal"), "simulation run ledger route must not require source writes");
});

check("/ops simulation workspace declares a ledger UI surface", () => {
  const block = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "dashSimulationWorkspaceLedgerList",
    "ops-simulation-ledger-list",
    "data-v360-simulation-run-ledger",
    schema,
    "Simulation Ledger",
    "simulation run id",
    "operator note",
    "previous run diff",
  ]) {
    assertIncludes(block, snippet, "v360 simulation ledger dashboard shell");
    assertIncludes(extractNamedFunctionBlock(files.uiScript, "renderV360OpsSimulationWorkspace"), "data-v360-simulation-run-ledger", "UI-089 block-scoped canonical product state");
    assert(!["requestJson(","fetch(","method: 'POST'","method: 'PUT'","method: 'DELETE'"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV360OpsSimulationWorkspace").includes(marker)), "UI-089 no-write explicit absence oracle");
    assert(!["send(","sendClientNotice","deliveryQueueWritePerformed: true"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV360OpsSimulationWorkspace").includes(marker)), "UI-089 no-send explicit absence oracle");
    assertIncludes(files.uiScript, "/ops/dashboard", "UI-089 canonical route obligation");
    assertIncludes(files.server, "media-server.ops.v360-simulation-run-ledger.v1", "UI-089 canonical schema obligation");
  }
});

check("/ops simulation workspace renderer loads and displays ledger entries", () => {
  const block = extractBlock(files.uiScript, "const renderV360OpsSimulationWorkspace", "const renderDashboardRootCause");
  for (const snippet of [
    "simulationRunLedger",
    "simulationRunLedgerRoute",
    route,
    "simulationRunLedgerEntries",
    "simulationRunId",
    "inputRef",
    "resultDiff",
    "operatorNote",
    "previousRunId",
    "changedFields",
    "dashSimulationWorkspaceLedgerList",
    "requestJson(simulationRunLedgerRoute)",
  ]) {
    assertIncludes(block, snippet, "v360 simulation run ledger renderer");
  }
});

check("simulation ledger styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-simulation-ledger-list",
    ".ops-simulation-ledger-entry",
    "body.ops-shell .ops-simulation-workspace .ops-simulation-ledger-list",
  ]) {
    assertIncludes(files.css, snippet, "v360 simulation run ledger CSS");
  }
});

check("client/viewer scripts do not expose simulation ledger operator material", () => {
  for (const forbidden of [
    schema,
    route,
    "simulationRunLedgerEntries",
    "operatorNote",
    "inputRef",
    "resultDiff",
    "previousRunId",
    "comparedToRunId",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose simulation ledger material: ${forbidden}`);
  }
});

check("roadmap records v3.6 Step 8 without overclaiming execution or longrun", () => {
  for (const snippet of [
    "| 8 | v3.6.0 (8) Simulation Run Ledger and Comparison | P1 | 완료 |",
    "## v3.6.0 Step 8 개발 기록",
    route,
    "OpsV360SimulationRunLedgerComparisonJson",
    "simulation run id, 입력 ref, 결과 diff, operator note, 이전 run 대비 변화",
    `\`./server.sh ${command}\``,
    "Client Notice Preview 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.6 Step 8");
  }
});

check("stream verification exposes v3.6 Step 8 command and boundary", () => {
  for (const snippet of [
    `| v3.6.0 (8) | \`./server.sh ${command}\` | Simulation Run Ledger and Comparison.`,
    route,
    "simulation run id, 입력 ref, 결과 diff, operator note",
    "이전 run 대비 변화",
    "simulation run persist/execute/operator note write/client notice 미수행",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.6 Step 8");
  }
});

check("feature inventory and release records map v3.6 Step 8", () => {
  for (const snippet of [
    `v3.6.0 (8) Simulation Run Ledger and Comparison | \`UI-089\`, \`LAB-096\`, \`SAFE-155\`, \`OPS-122\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-089 | V360 Step 8 Simulation Run Ledger and Comparison UI",
    "LAB-096 | V360 Step 8 simulation run ledger comparison",
    "SAFE-155 | V360 Step 8 simulation ledger boundary",
    "OPS-122 | V360 Step 8 Simulation Run Ledger and Comparison 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.6 Step 8");
  }
  for (const snippet of [
    "V360 Simulation Run Ledger and Comparison",
    `\`./server.sh ${command}\``,
    "v360 Step 8 RED simulation run ledger gate",
    "v360 Step 8 simulation run ledger final",
    "v360 Step 8 UI 풀테스트",
    "v360 Step 8 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.6 Step 8");
  }
});

check("server entrypoint and inventory verifiers include v3.6 Step 8 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v360_simulation_run_ledger_comparison.mjs", "server.sh script dispatch");
  for (const id of ["UI-089", "LAB-096", "SAFE-155", "OPS-122"]) assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  for (const id of ["UI-089", "LAB-096", "SAFE-155", "OPS-122"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v360_simulation_run_ledger_comparison.mjs", "script inventory");
});

check("SAFE-155 canonical bounded no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV360SimulationRunLedgerComparisonJson(");
  const routeObserved = files.server.includes("/ops/api/live-operations/simulation/run-ledger");
  const safe155BoundaryObserved = block.includes("BuildV360SimulationRunLedgerEntries");
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
  assert(sendPerformed === false, "SAFE-155 simulation ledger comparison must not send client delivery");
  assert(routeObserved && safe155BoundaryObserved && block.includes("media-server.ops.v360-simulation-run-ledger.v1") && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && sendPerformed === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-155 BuildV360SimulationRunLedgerEntries must remain bounded no-execution no-write redacted and client/provider isolated");
});

const results = runChecks();
console.log("");
console.log("== v3.6.0 simulation run ledger and comparison summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.6.0 (8)");
console.log(`- route: ${route}`);
console.log("- accumulates: simulation run id, input ref, result diff, operator note, previous-run comparison");
console.log("- writes: no simulation run/operator note/source/view/rule/EventRecord/Ops audit/client/media mutation performed");
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

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
