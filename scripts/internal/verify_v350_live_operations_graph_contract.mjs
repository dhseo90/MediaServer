#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.5.0 Step 2 Live Operations Graph Contract 구현, 문서, inventory 연결을 검증한다.

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
  printUsageAndExit(`v3.5.0 Live Operations Graph Contract verification

Usage:
  ./server.sh verify-v350-live-operations-graph-contract

Checks:
  - /ops/api/live-operations/graph exposes an Ops-only graph read model
  - the graph links EventRecord, SourceRegistry, PublishedView, source health, continuity drill, and client impact
  - the output does not write registries, EventRecord, Ops audit, client material, or media/schema contracts
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v350-live-operations-graph-contract";
const schema = "media-server.ops.v350-live-operations-graph.v1";
const route = "/ops/api/live-operations/graph";
const files = {
  server: readWebRtcHttpServerBundle(readText),
  serverWorkflows: readText("src/ingress/webrtc_http_server_ops_workflows.cpp"),
  eventStorageApplication: readText("src/ingress/event_storage_application_service.cpp"),
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

check("Ops server builds the v3.5 live operations graph read model", () => {
  const start = files.server.indexOf("std::string OpsV350LiveOperationsGraphJson(");
  const end = files.server.indexOf("struct OpsV370SiteImpactGraphNode", start);
  assert(start >= 0 && end > start, "EVT-074 live operations graph block missing");
  const evt074OperationsGraphBlock = files.server.slice(start, end);
  assertIncludes(evt074OperationsGraphBlock, "media-server.ops.v350-live-operations-graph.v1", "EVT-074 block-scoped canonical graph projection");
  assert(!evt074OperationsGraphBlock.includes("\\\"eventRecordWritePerformed\\\":true") && evt074OperationsGraphBlock.includes("\\\"eventRecordWritePerformed\\\":false"), "EVT-074 graph projection must not write EventRecord state");
  for (const snippet of [
    "struct OpsV350LiveOperationsGraphNode",
    "struct OpsV350LiveOperationsGraphEdge",
    "struct OpsV350LiveOperationsGraphSummary",
    "BuildV350LiveOperationsGraphContext",
    "BuildV350LiveOperationsGraphNodes",
    "BuildV350LiveOperationsGraphEdges",
    "AppendV350LiveOperationsGraphNodeJson",
    "AppendV350LiveOperationsGraphEdgeJson",
    "OpsV350LiveOperationsGraphJson",
    schema,
    "liveOperationsGraphSummary",
    "graphNodes",
    "graphEdges",
    "eventRecord",
    "sourceRegistry",
    "publishedView",
    "sourceHealth",
    "continuityDrill",
    "clientImpact",
  ]) {
    assertIncludes(files.server, snippet, "v350 live operations graph server model");
  }
});

check("live operations graph joins required source-of-truth inputs", () => {
  const block = extractBlock(files.serverWorkflows,
    "OpsV350LiveOperationsGraphContext BuildV350LiveOperationsGraphContext(",
    "std::vector<OpsV350CommandPlanCandidate> BuildV350CommandPlanCandidates(");
  const eventStorageDelegate = extractBlock(files.eventStorageApplication,
    "bool QueryEventRecordsForApplication(", "bool CompactEventRecordsForApplication(");
  const eventRecordReadDelegateObserved = block.includes("QueryEventRecordsForApplication") &&
    eventStorageDelegate.includes("analysis::QueryEventRecords") &&
    eventStorageDelegate.includes("result->records_json = std::move(canonical.records_json)");
  assert(eventRecordReadDelegateObserved,
    "SRC-044 live operations graph must bind the application-service EventRecord read delegate and result readback");
  for (const snippet of [
    "SourceViewApplicationService::Instance().Snapshot",
    "QueryEventRecordsForApplication",
    "BuildV340RecoveryCandidateContext",
    "BuildV340RecoveryCandidatePackages",
    "BuildV340SourceHealthReplayDriftDiffItems",
    "clientImpact",
    "publishedViewIds",
    "eventRecordCount",
    "sourceHealthStatus",
    "continuityDrillReadiness",
    "viewerSafeImpactSummary",
  ]) {
    assertIncludes(block, snippet, "v350 live operations graph joins");
  }
});

check("live operations graph preserves Ops-only read-only redaction and media/schema boundaries", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV350LiveOperationsGraphJson(");
  const routeObserved = files.server.includes("/ops/api/live-operations/graph");
  const debugMaterialExposed = exactBooleanFlagValue(block, "rawDiagnosticJsonIncluded");
  assert(exactBooleanFlagValue(block, "rawLocatorExposedToClient") === false, "CLIENT-030 raw locator/source URL must remain redacted");
  assert(debugMaterialExposed === false, "CLIENT-030 debug material must remain redacted");
  assert(block.includes("clientImpact") && block.includes("viewer-safe-summary"), "CLIENT-030 exact clientImpact projection readback missing");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "redacted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "commandPlanWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "rawDiagnosticJsonIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    assertIncludes(block, snippet, "v350 live operations graph boundary flags");
  }
  for (const flag of [
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "commandPlanWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "rawDiagnosticJsonIncluded",
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
    "CreateSource(",
    "UpsertSource(",
    "DisableSource(",
    "CreateView(",
    "UpsertView(",
    "DisableView(",
    "AppendOpsAuditRecord(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "\"httpUrl\"",
    "\"webrtcSourceId\"",
    "credentialRef",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `live operations graph must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the live operations graph route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/live-operations/command-plan\")");
  assertIncludes(block, route, "live operations graph route");
  assertIncludes(block, "request.method == \"GET\"", "live operations graph route");
  assertIncludes(block, "require_ops_principal()", "live operations graph route");
  assertIncludes(block, "OpsV350LiveOperationsGraphJson(", "live operations graph route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "live operations graph route");
  assertIncludes(block, "Cache-Control", "live operations graph route");
  assertIncludes(block, "no-store", "live operations graph route");
  assert(!block.includes("require_source_write_principal"), "live operations graph route must not require source writes");
});

check("roadmap records v3.5 Step 2 without overclaiming command plans or UI workspace", () => {
  for (const snippet of [
    "| 2 | v3.5.0 (2) Live Operations Graph Contract | P0 | 완료 |",
    "EventRecord, SourceRegistry, PublishedView, source health, continuity drill, client impact를 Ops-only graph read model로 연결",
    "## v3.5.0 Step 2 개발 기록",
    route,
    "OpsV350LiveOperationsGraphJson",
    "`./server.sh verify-v350-live-operations-graph-contract`",
    "Operations Command Plan Contract, Incident-to-Command Handoff, Staged Change Plan 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.5 Step 2");
  }
});

check("stream verification exposes v3.5 Step 2 command and boundary", () => {
  for (const snippet of [
    `| v3.5.0 (2) | \`./server.sh ${command}\` | Live Operations Graph Contract.`,
    route,
    "EventRecord, SourceRegistry, PublishedView, source health, continuity drill, client impact",
    "Ops-only graph read model",
    "source locator/credential/raw diagnostic JSON/media path 비노출",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.5 Step 2");
  }
});

check("feature inventory and release records map v3.5 Step 2", () => {
  for (const snippet of [
    `v3.5.0 (2) Live Operations Graph Contract | \`SRC-044\`, \`EVT-074\`, \`CLIENT-030\`, \`SAFE-136\`, \`OPS-103\` | \`${command}\``,
    "SRC-044 | V350 Step 2 live operations source graph projection",
    "EVT-074 | V350 Step 2 EventRecord graph projection",
    "CLIENT-030 | V350 Step 2 client impact graph projection boundary",
    "SAFE-136 | V350 Step 2 live operations graph redaction boundary",
    "OPS-103 | V350 Step 2 Live Operations Graph Contract 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.5 Step 2");
  }
  for (const snippet of [
    "V350 Live Operations Graph Contract",
    `\`./server.sh ${command}\``,
    "v350 Step 2 RED live operations graph gate",
    "v350 Step 2 live operations graph final",
    "v350 Step 2 UI 풀테스트",
    "v350 Step 2 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.5 Step 2");
  }
});

check("server entrypoint and inventory verifiers include v3.5 Step 2 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v350_live_operations_graph_contract.mjs", "server.sh script dispatch");
  assertIncludes(files.featureInventory, command, "feature inventory command");
  for (const id of ["SRC-044", "EVT-074", "CLIENT-030", "SAFE-136", "OPS-103"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v350_live_operations_graph_contract.mjs", "script inventory");
});

check("SAFE-136 canonical live operations graph redaction boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV350LiveOperationsGraphJson(");
  const routeObserved = files.server.includes("/ops/api/live-operations/graph");
  const safe136BoundaryObserved = block.includes("BuildV350LiveOperationsGraphNodes") && block.includes("media-server.ops.v350-live-operations-graph.v1");
  const rawMaterialExposed = /\\\"(?:sourceLocator|credentialMaterial|rawDiagnosticJson|mediaPath|clientViewerMaterial)Included\\\":true/.test(block);
  const credentialMaterialExposed = block.includes("\\\"credentialMaterialIncluded\\\":true");
  const viewerClientExposureAdded = block.includes("\\\"clientViewerMaterialIncluded\\\":true");
  const writePerformed = /\b(?:Write|Persist|UpdateSource|DispatchEventRecords)[A-Za-z0-9_:]*\s*\(/.test(block);
  assert(routeObserved && safe136BoundaryObserved && rawMaterialExposed === false && credentialMaterialExposed === false && viewerClientExposureAdded === false && writePerformed === false,
    "SAFE-136 BuildV350LiveOperationsGraphNodes must remain Ops-only redacted read-only without source locator credential diagnostic media client material");
});

const results = runChecks();
console.log("");
console.log("== v3.5.0 live operations graph summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.5.0 (2)");
console.log(`- route: ${route}`);
console.log("- joins: EventRecord, SourceRegistry, PublishedView, source health, continuity drill, client impact");
console.log("- redaction: source locator, credential, raw diagnostic JSON, media path excluded");
console.log("- commandPlan: not-run-by-this-command");
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
