#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.5.0 Step 10 Operations Export Bundle and Handoff Map 구현, UI, 문서, inventory 연결을 검증한다.
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
  printUsageAndExit(`v3.5.0 Operations Export Bundle and Handoff Map verification

Usage:
  ./server.sh verify-v350-operations-export-bundle-handoff-map

Checks:
  - /ops/api/live-operations/export-bundle-handoff-map combines command plan, drill ledger, field evidence refs, and client impact forecast refs
  - export bundle and handoff map stay release-safe, read-only, ops-only, and no-store
  - /ops command workspace renders bundle and handoff entries without client/viewer exposure
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v350-operations-export-bundle-handoff-map";
const schema = "media-server.ops.v350-export-bundle-handoff-map.v1";
const route = "/ops/api/live-operations/export-bundle-handoff-map";
const commandPlanRoute = "/ops/api/live-operations/command-plan";
const drillLedgerRoute = "/ops/api/live-operations/drill-run-ledger";
const fieldEvidenceRoute = "/ops/api/source-registry/field-bridge-condition-gates";
const clientImpactRoute = "/client/api/views";
const files = {
  server: readWebRtcHttpServerBundle(readText),
  uiScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  uiSmoke: readText("scripts/internal/verify_ops_client_ui_smoke.mjs"),
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

check("Ops server builds release-safe export bundle and handoff map models", () => {
  for (const snippet of [
    "struct OpsV350OperationsExportBundleItem",
    "struct OpsV350HandoffMapEntry",
    "struct OpsV350OperationsExportBundleSummary",
    "BuildV350OperationsExportBundleItems",
    "BuildV350OperationsHandoffMapEntries",
    "AppendV350OperationsExportBundleItemJson",
    "AppendV350OperationsHandoffMapEntryJson",
    "AppendV350OperationsExportBundleSummaryJson",
    "OpsV350OperationsExportBundleHandoffMapJson",
    schema,
    "operationsExportBundle",
    "handoffMapEntries",
    "releaseSafe",
    "handoffMap",
    "commandPlanRefs",
    "drillLedgerRefs",
    "fieldEvidenceRefs",
    "clientImpactForecastRefs",
  ]) {
    assertIncludes(files.server, snippet, "v350 operations export bundle server model");
  }
});

check("export bundle derives refs from command plan, drill ledger, field evidence, and client impact without execution", () => {
  const block = extractBlock(files.server, "struct OpsV350OperationsExportBundleItem", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "BuildV350LiveOperationsGraphContext",
    "BuildV350CommandPlanCandidates",
    "BuildV350StagedChangePlans",
    "BuildV350DrillRunLedgerEntries",
    "BuildV340FieldBridgeConditionGates",
    commandPlanRoute,
    drillLedgerRoute,
    fieldEvidenceRoute,
    clientImpactRoute,
    "clientImpactForecastRefs",
    "release-safe",
    "handoffStatus",
    "nextOperatorRole",
    "blockedReason",
    "evidenceRefs",
  ]) {
    assertIncludes(block, snippet, "v350 export bundle derivation");
  }
});

check("export bundle boundary flags prevent writes, raw material, and media/schema changes", () => {
  const block = extractBlock(files.server, "std::string OpsV350OperationsExportBundleHandoffMapJson", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "releaseSafe",
    "artifactExportExecuted",
    "handoffWritePerformed",
    "fieldEvidenceExecutionPerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "commandPlanExecuted",
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "rawProviderResponseIncluded",
    "rawVlmPromptIncluded",
    "clientViewerRawMaterialIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    assertIncludes(block, snippet, "v350 export bundle boundary flags");
  }
  for (const flag of [
    "artifactExportExecuted",
    "handoffWritePerformed",
    "fieldEvidenceExecutionPerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "commandPlanExecuted",
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "rawProviderResponseIncluded",
    "rawVlmPromptIncluded",
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
  for (const forbidden of [
    "AppendOpsAuditRecord(",
    "ExecuteCommandPlan",
    "RunContinuityDrill(",
    "CreateSource(",
    "UpsertSource(",
    "CreateView(",
    "UpsertView(",
    "CallVlmProvider(",
    "Authorization",
    "password",
    "\"rtspUrl\"",
    "\"whepUrl\"",
  ]) {
    assert(!block.includes(forbidden), `export bundle must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the export bundle handoff route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/");
  assertIncludes(block, route, "export bundle handoff route");
  assertIncludes(block, "request.method == \"GET\"", "export bundle handoff route");
  assertIncludes(block, "require_ops_principal()", "export bundle handoff route");
  assertIncludes(block, "OpsV350OperationsExportBundleHandoffMapJson(", "export bundle handoff route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "export bundle handoff route");
  assertIncludes(block, "Cache-Control", "export bundle handoff route");
  assertIncludes(block, "no-store", "export bundle handoff route");
  assert(!block.includes("require_source_write_principal"), "export bundle handoff route must not require source writes");
});

check("/ops command workspace declares export bundle and handoff map surfaces", () => {
  const block = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "dashCommandWorkspaceExportBundleMap",
    "data-v350-export-bundle-handoff-map",
    schema,
    "Operations Export Bundle",
    "Handoff Map",
    "command plan refs",
    "field evidence refs",
    "client impact refs",
  ]) {
    assertIncludes(block, snippet, "v350 export bundle dashboard shell");
    assertIncludes(extractNamedFunctionBlock(files.uiScript, "renderV350OpsCommandWorkspace"), "data-v350-export-bundle-handoff-map", "UI-085 block-scoped canonical product state");
    assertIncludes(files.uiScript, "/ops/dashboard", "UI-085 canonical route obligation");
    assertIncludes(files.uiScript, "media-server.ops.v350-export-bundle-handoff-map.v1", "UI-085 canonical schema obligation");
  }
});

check("/ops command workspace renderer loads and displays bundle and handoff entries", () => {
  const block = extractBlock(files.uiScript, "const v350CommandWorkspaceCard", "const renderDashboardRootCause");
  for (const snippet of [
    "exportBundle",
    "exportBundleRoute",
    route,
    "operationsExportBundle",
    "handoffMapEntries",
    "dashCommandWorkspaceExportBundleMap",
    "commandPlanRefs",
    "drillLedgerRefs",
    "fieldEvidenceRefs",
    "clientImpactForecastRefs",
    "handoffStatus",
    "nextOperatorRole",
    "blockedReason",
    "requestJson(exportBundleRoute)",
  ]) {
    assertIncludes(block, snippet, "v350 export bundle renderer");
  }
  assert(!block.includes("POST"), "export bundle renderer must not POST");
  assert(!block.includes("PUT"), "export bundle renderer must not PUT");
  assert(!block.includes("DELETE"), "export bundle renderer must not DELETE");
});

check("export bundle styling and ops/client smoke track Step 10 markers", () => {
  for (const snippet of [
    ".ops-export-bundle-list",
    ".ops-handoff-map-list",
    ".ops-handoff-map-entry",
  ]) {
    assertIncludes(files.css, snippet, "v350 export bundle CSS");
  }
  for (const snippet of [
    "dashCommandWorkspaceExportBundleMap",
    "data-v350-export-bundle-handoff-map",
    schema,
    route,
    "Operations Export Bundle",
    "Handoff Map",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops/client UI smoke v3.5 Step 10 marker");
  }
});

check("client/viewer scripts do not expose export bundle operator material", () => {
  for (const forbidden of [
    schema,
    route,
    "operationsExportBundle",
    "handoffMapEntries",
    "commandPlanRefs",
    "drillLedgerRefs",
    "fieldEvidenceRefs",
    "clientImpactForecastRefs",
    "operatorNote",
    "blockedReason",
    "nextOperatorRole",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose export bundle material: ${forbidden}`);
  }
});

check("roadmap records v3.5 Step 10 without overclaiming export execution or field intake", () => {
  for (const snippet of [
    "| 10 | v3.5.0 (10) Operations Export Bundle and Handoff Map | P1 | 완료 |",
    "## v3.5.0 Step 10 개발 기록",
    route,
    "OpsV350OperationsExportBundleHandoffMapJson",
    "command plan, drill ledger, field evidence, client impact forecast",
    `\`./server.sh ${command}\``,
    "Field Evidence Intake 완료 evidence가 아닙니다",
    "VLM-assisted Ops Explanation 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.5 Step 10");
  }
});

check("stream verification exposes v3.5 Step 10 command and boundary", () => {
  for (const snippet of [
    `| v3.5.0 (10) | \`./server.sh ${command}\` | Operations Export Bundle and Handoff Map.`,
    route,
    "release-safe export bundle",
    "handoff map",
    "artifact export/write/field smoke/provider call 미수행",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.5 Step 10");
  }
});

check("feature inventory and release records map v3.5 Step 10", () => {
  for (const snippet of [
    `v3.5.0 (10) Operations Export Bundle and Handoff Map | \`UI-085\`, \`SAFE-144\`, \`OPS-111\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-085 | V350 Step 10 Operations Export Bundle and Handoff Map UI",
    "SAFE-144 | V350 Step 10 operations export bundle boundary",
    "OPS-111 | V350 Step 10 Operations Export Bundle and Handoff Map 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.5 Step 10");
  }
  for (const snippet of [
    "V350 Operations Export Bundle and Handoff Map",
    `\`./server.sh ${command}\``,
    "v350 Step 10 RED operations export bundle gate",
    "v350 Step 10 operations export bundle final",
    "v350 Step 10 UI 풀테스트",
    "v350 Step 10 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.5 Step 10");
  }
});

check("server entrypoint and inventory verifiers include v3.5 Step 10 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v350_operations_export_bundle_handoff_map.mjs", "server.sh script dispatch");
  for (const snippet of [
    "validateImplementationManifest",
    "semantic.verifierAssertion.command",
    'kind: "stability"',
  ]) {
    assertIncludes(files.featureCoverageVerifier, snippet, "feature coverage verifier canonical command mapping");
  }
  for (const id of ["UI-085", "SAFE-144", "OPS-111"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v350_operations_export_bundle_handoff_map.mjs", "script inventory");
});

check("SAFE-144 canonical operations export bundle boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV350OperationsExportBundleHandoffMapJson(");
  const routeObserved = files.server.includes("/ops/api/live-operations/export-bundle-handoff-map");
  const safe144BoundaryObserved = block.includes("BuildV350OperationsExportBundleItems") && block.includes("BuildV350OperationsExportBundleSummary");
  const artifactExportExecuted = /\b(?:Export|Write|Persist|Execute|DispatchEventRecords)[A-Za-z0-9_:]*\s*\(/.test(block);
  const rawMaterialExposed = /\\\"(?:rawLocator|credentialMaterial|providerMaterial|vlmMaterial|clientViewerMaterial)Included\\\":true/.test(block);
  const mutationPerformed = artifactExportExecuted;
  const handoffWritePerformed = artifactExportExecuted;
  const providerCallPerformed = /\b(?:ProviderCall|ProviderClient|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const sourceUrlExposed = block.includes("\\\"sourceUrlIncluded\\\":true");
  const credentialMaterialExposed = block.includes("\\\"credentialMaterialIncluded\\\":true");
  assert(routeObserved && safe144BoundaryObserved && artifactExportExecuted === false && mutationPerformed === false && handoffWritePerformed === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false,
    "SAFE-144 BuildV350OperationsExportBundleItems artifactExportExecuted handoffWritePerformed fieldEvidenceExecutionPerformed commandPlanExecuted must remain false and redacted");
});

const results = runChecks();
console.log("");
console.log("== v3.5.0 operations export bundle and handoff map ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.5.0 (10)");
console.log(`- route: ${route}`);
console.log("- combines: command plan refs, drill ledger refs, field evidence refs, client impact forecast refs");
console.log("- handoff: release-safe bundle item map with next operator role, blocker, evidence refs");
console.log("- writes: no artifact export, handoff write, field smoke execution, provider call, command execution, source/view/EventRecord/Ops audit/client/media mutation performed");
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

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function extractBlock(text, start, end) {
  const startIndex = text.indexOf(start);
  assert(startIndex >= 0, `missing block start: ${start}`);
  const endIndex = text.indexOf(end, startIndex + start.length);
  assert(endIndex >= 0, `missing block end after ${start}: ${end}`);
  return text.slice(startIndex, endIndex);
}
