#!/usr/bin/env node
// 파일 용도: v3.5.0 Step 7 Drill Run Ledger and Plan Comparison 구현, 문서, inventory 연결을 검증한다.
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
  printUsageAndExit(`v3.5.0 Drill Run Ledger and Plan Comparison verification

Usage:
  ./server.sh verify-v350-drill-run-ledger-plan-comparison

Checks:
  - /ops/api/live-operations/drill-run-ledger exposes a read-only drill run ledger
  - drill run id, operator note, blocker, evidence refs, and previous-run diff are accumulated
  - /ops command workspace renders the ledger and plan comparison without client/viewer exposure
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v350-drill-run-ledger-plan-comparison";
const schema = "media-server.ops.v350-drill-run-ledger.v1";
const route = "/ops/api/live-operations/drill-run-ledger";
const graphRoute = "/ops/api/live-operations/graph";
const commandPlanRoute = "/ops/api/live-operations/command-plan";
const stagedPlanRoute = "/ops/api/live-operations/staged-change-plan-impact-preview";
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

check("Ops server builds the v3.5 drill run ledger and plan comparison model", () => {
  for (const snippet of [
    "struct OpsV350DrillRunLedgerEntry",
    "struct OpsV350DrillRunLedgerSummary",
    "BuildV350DrillRunLedgerEntries",
    "BuildV350DrillRunLedgerSummary",
    "AppendV350DrillRunLedgerEntryJson",
    "AppendV350DrillRunLedgerSummaryJson",
    "OpsV350DrillRunLedgerPlanComparisonJson",
    schema,
    "drillRunId",
    "operatorNote",
    "blocker",
    "evidenceRefs",
    "previousRunId",
    "planComparison",
    "diffFromPreviousRun",
    "changedFields",
    "accumulatedRunCount",
  ]) {
    assertIncludes(files.server, snippet, "v350 drill run ledger server model");
  }
});

check("drill ledger derives entries from graph, command plan, and staged plan without execution", () => {
  const block = extractBlock(files.server, "struct OpsV350DrillRunLedgerEntry", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "BuildV350LiveOperationsGraphContext",
    "BuildV350CommandPlanCandidates",
    "BuildV350StagedChangePlans",
    "OpsV350CommandPlanCandidate",
    "OpsV350StagedChangePlan",
    "operator-note-required",
    "blockerDelta",
    "evidenceRefDelta",
    "previousRunId",
    "comparedToRunId",
    graphRoute,
    commandPlanRoute,
    stagedPlanRoute,
  ]) {
    assertIncludes(block, snippet, "v350 drill run ledger derivation");
  }
});

check("drill ledger preserves read-only append-only projection boundaries", () => {
  const block = extractBlock(files.server, "std::string OpsV350DrillRunLedgerPlanComparisonJson", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "appendOnlyLedgerProjection",
    "drillRunWritePerformed",
    "operatorNoteWritePerformed",
    "commandPlanExecuted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "rawDiagnosticJsonIncluded",
  ]) {
    assertIncludes(block, snippet, "v350 drill ledger boundary flags");
  }
  for (const flag of [
    "drillRunWritePerformed",
    "operatorNoteWritePerformed",
    "commandPlanExecuted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
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
    "ExecuteCommandPlan",
    "RunContinuityDrill(",
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
    assert(!block.includes(forbidden), `drill ledger must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the drill run ledger route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/");
  assertIncludes(block, route, "drill run ledger route");
  assertIncludes(block, "request.method == \"GET\"", "drill run ledger route");
  assertIncludes(block, "require_ops_principal()", "drill run ledger route");
  assertIncludes(block, "OpsV350DrillRunLedgerPlanComparisonJson(", "drill run ledger route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "drill run ledger route");
  assertIncludes(block, "Cache-Control", "drill run ledger route");
  assertIncludes(block, "no-store", "drill run ledger route");
  assert(!block.includes("require_source_write_principal"), "drill run ledger route must not require source writes");
});

check("/ops command workspace declares a drill ledger UI surface", () => {
  const block = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "dashCommandWorkspaceLedgerList",
    "ops-command-ledger-list",
    "data-v350-drill-run-ledger",
    "Drill Ledger",
    "drill run id",
    "operator note",
    "previous run diff",
  ]) {
    assertIncludes(block, snippet, "v350 drill run ledger dashboard shell");
    assertIncludes(extractNamedFunctionBlock(files.uiScript, "renderV350OpsCommandWorkspace"), "data-v350-drill-run-ledger", "UI-082 block-scoped canonical product state");
    assert(!["requestJson(","fetch(","method: 'POST'","method: 'PUT'","method: 'DELETE'"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV350OpsCommandWorkspace").includes(marker)), "UI-082 no-write explicit absence oracle");
    assertIncludes(files.uiScript, "/ops/dashboard", "UI-082 canonical route obligation");
    assertIncludes(files.server, "media-server.ops.v350-drill-run-ledger.v1", "UI-082 canonical schema obligation");
  }
});

check("/ops command workspace renderer loads and displays ledger entries", () => {
  const block = extractBlock(files.uiScript, "const v350CommandWorkspaceCard", "const renderDashboardRootCause");
  for (const snippet of [
    "drillLedger",
    "drillLedgerRoute",
    route,
    "drillRunLedgerEntries",
    "drillRunId",
    "operatorNote",
    "blocker",
    "evidenceRefs",
    "previousRunId",
    "diffFromPreviousRun",
    "planComparison",
    "dashCommandWorkspaceLedgerList",
    "requestJson(drillLedgerRoute)",
  ]) {
    assertIncludes(block, snippet, "v350 drill run ledger renderer");
  }
});

check("drill ledger styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-command-ledger-list",
    ".ops-command-ledger-entry",
    "body.ops-shell .ops-command-workspace .ops-command-ledger-list",
  ]) {
    assertIncludes(files.css, snippet, "v350 drill run ledger CSS");
  }
});

check("client/viewer scripts do not expose drill ledger operator material", () => {
  for (const forbidden of [
    schema,
    route,
    "drillRunLedgerEntries",
    "operatorNote",
    "evidenceRefs",
    "previousRunId",
    "diffFromPreviousRun",
    "planComparison",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose drill ledger material: ${forbidden}`);
  }
});

check("roadmap records v3.5 Step 7 without overclaiming execution or longrun", () => {
  for (const snippet of [
    "| 7 | v3.5.0 (7) Drill Run Ledger and Plan Comparison | P1 | 완료 |",
    "## v3.5.0 Step 7 개발 기록",
    route,
    "OpsV350DrillRunLedgerPlanComparisonJson",
    "drill run id, operator note, blocker, evidence refs, 이전 run 대비 차이",
    `\`./server.sh ${command}\``,
    "Client Impact Forecast 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.5 Step 7");
  }
});

check("stream verification exposes v3.5 Step 7 command and boundary", () => {
  for (const snippet of [
    `| v3.5.0 (7) | \`./server.sh ${command}\` | Drill Run Ledger and Plan Comparison.`,
    route,
    "drill run id, operator note, blocker, evidence refs",
    "이전 run 대비 차이",
    "drill run write/operator note write/command execution 미수행",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.5 Step 7");
  }
});

check("feature inventory and release records map v3.5 Step 7", () => {
  for (const snippet of [
    `v3.5.0 (7) Drill Run Ledger and Plan Comparison | \`UI-082\`, \`SAFE-141\`, \`OPS-108\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-082 | V350 Step 7 Drill Run Ledger and Plan Comparison UI",
    "SAFE-141 | V350 Step 7 drill run ledger boundary",
    "OPS-108 | V350 Step 7 Drill Run Ledger and Plan Comparison 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.5 Step 7");
  }
  for (const snippet of [
    "V350 Drill Run Ledger and Plan Comparison",
    `\`./server.sh ${command}\``,
    "v350 Step 7 RED drill run ledger gate",
    "v350 Step 7 drill run ledger final",
    "v350 Step 7 UI 풀테스트",
    "v350 Step 7 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.5 Step 7");
  }
});

check("server entrypoint and inventory verifiers include v3.5 Step 7 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v350_drill_run_ledger_plan_comparison.mjs", "server.sh script dispatch");
  for (const snippet of [
    "validateImplementationManifest",
    "semantic.verifierAssertion.command",
    'kind: "stability"',
  ]) {
    assertIncludes(files.featureCoverageVerifier, snippet, "feature coverage verifier canonical command mapping");
  }
  for (const id of ["UI-082", "SAFE-141", "OPS-108"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v350_drill_run_ledger_plan_comparison.mjs", "script inventory");
});

check("SAFE-141 canonical drill ledger no-write boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV350DrillRunLedgerPlanComparisonJson(");
  const routeObserved = files.server.includes("/ops/api/live-operations/drill-run-ledger");
  const safe141BoundaryObserved = block.includes("BuildV350DrillRunLedgerEntries") && block.includes("media-server.ops.v350-drill-run-ledger.v1");
  const drillRunWritePerformed = /\b(?:AppendFile|Write|Persist|Execute|UpdateSource|CreateVaRule)[A-Za-z0-9_:]*\s*\(/.test(block);
  const rawMaterialExposed = /\\\"(?:rawLocator|credentialMaterial|debugMaterial)Exposed\\\":true/.test(block);
  const mutationPerformed = drillRunWritePerformed;
  const sourceUrlExposed = block.includes("\\\"sourceUrlExposed\\\":true");
  const credentialMaterialExposed = block.includes("\\\"credentialMaterialExposed\\\":true");
  const debugMaterialExposed = block.includes("\\\"debugMaterialExposed\\\":true");
  assert(routeObserved && safe141BoundaryObserved && drillRunWritePerformed === false && mutationPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false,
    "SAFE-141 BuildV350DrillRunLedgerEntries drillRunWritePerformed operatorNoteWritePerformed commandPlanExecuted must remain false and redacted");
});

const results = runChecks();
console.log("");
console.log("== v3.5.0 drill run ledger and plan comparison summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.5.0 (7)");
console.log(`- route: ${route}`);
console.log("- accumulates: drill run id, operator note, blocker, evidence refs, previous-run diff");
console.log("- writes: no drill run/operator note/command/source/view/rule/EventRecord/Ops audit/client/media mutation performed");
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
