#!/usr/bin/env node
// 파일 용도: v3.6.0 Step 11 Simulation Export Bundle 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.6.0 Simulation Export Bundle verification

Usage:
  ./server.sh verify-v360-simulation-export-bundle

Checks:
  - /ops/api/live-operations/simulation/export-bundle combines simulation input/output, readiness blocker, and handoff map refs
  - export bundle stays redacted, release-safe, read-only, ops-only, and no-store
  - /ops simulation workspace renders bundle and handoff entries without client/viewer exposure
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v360-simulation-export-bundle";
const schema = "media-server.ops.v360-simulation-export-bundle.v1";
const route = "/ops/api/live-operations/simulation/export-bundle";
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

check("Ops server builds the v3.6 Simulation Export Bundle model", () => {
  for (const snippet of [
    "struct OpsV360SimulationExportBundleItem",
    "struct OpsV360SimulationHandoffMapEntry",
    "struct OpsV360SimulationExportBundleSummary",
    "BuildV360SimulationExportBundleItems",
    "BuildV360SimulationHandoffMapEntries",
    "BuildV360SimulationExportBundleSummary",
    "AppendV360SimulationExportBundleItemJson",
    "AppendV360SimulationHandoffMapEntryJson",
    "AppendV360SimulationExportBundleSummaryJson",
    "OpsV360SimulationExportBundleJson",
    schema,
    "simulationExportBundle",
    "simulationHandoffMapEntries",
    "simulationInputRefs",
    "simulationOutputRefs",
    "readinessBlockerRefs",
    "handoffMapRefs",
    "redactionPolicy",
    "releaseSafe",
  ]) {
    assertIncludes(files.server, snippet, "v360 simulation export bundle server model");
  }
});

check("simulation export bundle derives from simulation input/output, blocker, and handoff refs", () => {
  const block = extractBlock(files.server, "struct OpsV360SimulationExportBundleItem", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "BuildV360SimulationInputPackItems",
    "BuildV360SimulationRunLedgerEntries",
    "BuildV360CommandPlanDryRunResults",
    "BuildV360SourceRuleImpactDiffs",
    "BuildV360SafeApplyReadinessItems",
    "BuildV360RuleVaWhatIfReplayCandidates",
    "BuildV360ClientNoticePreviewItems",
    "/ops/api/live-operations/simulation/input-pack",
    "/ops/api/live-operations/simulation/run-ledger",
    "/ops/api/live-operations/simulation/safe-apply-readiness",
    "/ops/api/live-operations/simulation/rule-va-what-if-replay-pack",
    "redacted-release-safe",
    "handoffStatus",
    "nextOperatorRole",
    "blockedReason",
  ]) {
    assertIncludes(block, snippet, "v360 simulation export derivation");
  }
});

check("simulation export bundle boundary flags prevent writes, raw material, and media/schema changes", () => {
  const block = extractBlock(files.server, "std::string OpsV360SimulationExportBundleJson", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "releaseSafe",
    "redacted",
    "artifactExportExecuted",
    "bundlePersisted",
    "fileWritePerformed",
    "handoffWritePerformed",
    "simulationRunPersisted",
    "simulationRunExecuted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "clientNoticeSent",
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "rawProviderResponseIncluded",
    "rawDiagnosticJsonIncluded",
    "clientViewerRawMaterialIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    assertIncludes(block, snippet, "v360 simulation export boundary flags");
  }
  for (const flag of [
    "artifactExportExecuted",
    "bundlePersisted",
    "fileWritePerformed",
    "handoffWritePerformed",
    "simulationRunPersisted",
    "simulationRunExecuted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "clientNoticeSent",
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "rawProviderResponseIncluded",
    "rawDiagnosticJsonIncluded",
    "clientViewerRawMaterialIncluded",
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
});

check("Ops API exposes the simulation export bundle route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/");
  assertIncludes(block, route, "simulation export bundle route");
  assertIncludes(block, "request.method == \"GET\"", "simulation export bundle route");
  assertIncludes(block, "require_ops_principal()", "simulation export bundle route");
  assertIncludes(block, "OpsV360SimulationExportBundleJson(", "simulation export bundle route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "simulation export bundle route");
  assertIncludes(block, "Cache-Control", "simulation export bundle route");
  assertIncludes(block, "no-store", "simulation export bundle route");
});

check("/ops simulation workspace declares and renders Simulation Export Bundle", () => {
  const serverBlock = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "dashSimulationWorkspaceExportBundleList",
    "ops-simulation-export-bundle-list",
    "data-v360-simulation-export-bundle",
    schema,
    "Simulation Export Bundle",
  ]) {
    assertIncludes(serverBlock, snippet, "v360 simulation export dashboard shell");
  }
  const scriptBlock = extractBlock(files.uiScript, "const renderV360OpsSimulationWorkspace", "const renderDashboardRootCause");
  for (const snippet of [
    "simulationExportBundle",
    "simulationExportBundleRoute",
    route,
    "simulationExportBundleItems",
    "simulationHandoffMapEntries",
    "simulationInputRefs",
    "simulationOutputRefs",
    "readinessBlockerRefs",
    "handoffStatus",
    "dashSimulationWorkspaceExportBundleList",
    "requestJson(simulationExportBundleRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v360 simulation export renderer");
  }
});

check("Simulation Export Bundle styling and client redaction are in place", () => {
  for (const snippet of [
    ".ops-simulation-export-bundle-list",
    ".ops-simulation-export-bundle-entry",
    "body.ops-shell .ops-simulation-workspace .ops-simulation-export-bundle-list",
  ]) {
    assertIncludes(files.css, snippet, "v360 simulation export CSS");
  }
  for (const forbidden of [
    schema,
    route,
    "simulationExportBundleItems",
    "simulationHandoffMapEntries",
    "credentialMaterialIncluded",
    "rawProviderResponseIncluded",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose simulation export material: ${forbidden}`);
  }
});

check("docs, inventory, and dispatch map v3.6 Step 11", () => {
  for (const snippet of [
    "| 11 | v3.6.0 (11) Simulation Export Bundle | P1 | 완료 |",
    "## v3.6.0 Step 11 개발 기록",
    route,
    "OpsV360SimulationExportBundleJson",
    `\`./server.sh ${command}\``,
    "Field Evidence Simulation Adapter 완료 evidence가 아닙니다",
    "VLM-assisted Simulation Explanation 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.6 Step 11");
  }
  for (const snippet of [
    `| v3.6.0 (11) | \`./server.sh ${command}\` | Simulation Export Bundle.`,
    "simulation input/output, blocker, handoff map",
    "redacted release-safe export bundle",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.6 Step 11");
  }
  for (const snippet of [
    `v3.6.0 (11) Simulation Export Bundle | \`UI-092\`, \`LAB-098\`, \`SAFE-158\`, \`OPS-125\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-092 | V360 Step 11 Simulation Export Bundle UI",
    "LAB-098 | V360 Step 11 simulation export bundle",
    "SAFE-158 | V360 Step 11 simulation export boundary",
    "OPS-125 | V360 Step 11 Simulation Export Bundle 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.6 Step 11");
  }
  for (const snippet of [
    "V360 Simulation Export Bundle",
    `\`./server.sh ${command}\``,
    "v360 Step 11 RED simulation export bundle gate",
    "v360 Step 11 simulation export bundle final",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.6 Step 11");
  }
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v360_simulation_export_bundle.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["UI-092", "LAB-098", "SAFE-158", "OPS-125"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v360_simulation_export_bundle.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.6.0 simulation export bundle summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.6.0 (11)");
console.log(`- route: ${route}`);
console.log("- combines: simulation input/output, readiness blocker, handoff map refs");
console.log("- writes: no artifact export, file write, handoff write, simulation execution, source/view/rule/EventRecord/Ops audit/client/media mutation performed");
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
  assert(start !== -1, `block start not found: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end !== -1, `block end not found after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
