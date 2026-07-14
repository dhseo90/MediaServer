#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.7.0 Step 5 Site Impact Graph 구현, 문서, inventory 연결을 검증한다.

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
  printUsageAndExit(`v3.7.0 Site Impact Graph verification

Usage:
  ./server.sh verify-v370-site-impact-graph

Checks:
  - /ops/api/site-operations/impact-graph links EventRecord, source health, PublishedView, and client impact by site
  - graph nodes and edges are derived from existing read models
  - the route remains Ops-only, read-only, and redacted
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v370-site-impact-graph";
const schema = "media-server.ops.v370-site-impact-graph.v1";
const route = "/ops/api/site-operations/impact-graph";
const files = loadFiles();
const checks = [];

check("Ops server builds the v3.7 site impact graph model", () => {
  for (const snippet of [
    "struct OpsV370SiteImpactGraphNode",
    "struct OpsV370SiteImpactGraphEdge",
    "struct OpsV370SiteImpactGraphSummary",
    "BuildV370SiteImpactGraphNodes",
    "BuildV370SiteImpactGraphEdges",
    "BuildV370SiteImpactGraphSummary",
    "AppendV370SiteImpactGraphNodeJson",
    "AppendV370SiteImpactGraphEdgeJson",
    "OpsV370SiteImpactGraphJson",
    schema,
    "siteImpactGraphSummary",
    "siteImpactGraphNodes",
    "siteImpactGraphEdges",
    "EventRecord",
    "sourceHealth",
    "PublishedView",
    "clientImpact",
  ]) assertIncludes(files.server, snippet, "v370 site impact graph server model");
  const producerBlock = extractCppFunctionBlock(files.server, "std::string OpsV370SiteImpactGraphJson(");
  assertIncludes(producerBlock, "media-server.ops.v370-site-impact-graph.v1", "v370 site impact graph schema");
});

check("site impact graph derives from existing graph context, health rollup, and site projection", () => {
  const block = extractBlock(files.server, "struct OpsV370SiteImpactGraphNode", "struct OpsV350CommandPlanCandidate");
  for (const snippet of [
    "BuildV350LiveOperationsGraphContext",
    "BuildV370SiteAwareSourceRegistryProjectionItems",
    "BuildV370SiteHealthRollupItems",
    "event_record_count_by_source",
    "published_view_ids_by_source",
    "source_health_status_by_source",
    "viewerSafeImpactSummary",
    "AddV370UniqueString",
  ]) assertIncludes(block, snippet, "v370 site impact derivation");
});

check("site impact graph preserves read-only redaction boundaries", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370SiteImpactGraphJson(");
  const clientNoticeSendCallPresent = /sendClientNotice|clientNoticeDelivery|deliveryQueue/.test(block);
  const debugMaterialExposed = exactBooleanFlagValue(block, "rawDiagnosticJsonIncluded");
  assert(clientNoticeSendCallPresent === false, "CLIENT-035 client notice send must remain absent");
  assert(exactBooleanFlagValue(block, "rawLocatorIncluded") === false, "CLIENT-035 raw/source locator material must remain redacted");
  assert(debugMaterialExposed === false, "CLIENT-035 debug material must remain redacted");
  assert(block.includes("clientImpact") && block.includes("viewer-safe summary only"), "CLIENT-035 exact clientImpact summary readback missing");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "graphOnly",
    "redacted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "rawDiagnosticJsonIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) assertIncludes(block, snippet, "v370 site impact boundary flags");
  for (const flag of [
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "rawDiagnosticJsonIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) assertFlagFalse(block, flag);
  assert(exactBooleanFlagValue(block, "eventRecordWritePerformed") === false, "eventRecordWritePerformed must remain false");
});

check("Ops API exposes the impact graph route as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "site impact graph route");
  assertIncludes(block, "request.method == \"GET\"", "site impact graph route");
  assertIncludes(block, "require_ops_principal()", "site impact graph route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "site impact graph route");
  assertIncludes(block, "OpsV370SiteImpactGraphJson(", "site impact graph route");
  assertIncludes(block, "Cache-Control", "site impact graph route");
  assertIncludes(block, "no-store", "site impact graph route");
});

check("docs, inventory, and dispatch map v3.7 Step 5", () => {
  assertStepDocs("5", "Site Impact Graph", "SRC-057", "EVT-080", "CLIENT-035", "SAFE-166", "OPS-133");
  for (const id of ["SRC-057", "EVT-080", "CLIENT-035", "SAFE-166", "OPS-133"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v370_site_impact_graph.mjs", "server.sh dispatch");
  assertIncludes(files.featureCoverageVerifier, "loadImplementationManifest", "feature coverage manifest loading");
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  const manifestById = new Map(files.implementationManifest.items.map(item => [item.id, item]));
  for (const id of ["SRC-057", "EVT-080", "CLIENT-035", "SAFE-166", "OPS-133"]) {
    const expectedCommand = id === "SRC-057" ? "verify-ops-source-registry-api" : command;
    assert(manifestById.get(id)?.verifierEvidence?.command === expectedCommand,
      `${id} implementation manifest verifier must be ${expectedCommand}`);
  }
  assertIncludes(files.scriptInventory, "verify_v370_site_impact_graph.mjs", "script inventory");
});

check("SAFE-166 canonical bounded no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370SiteImpactGraphJson(");
  const routeObserved = files.server.includes("/ops/api/site-operations/impact-graph");
  const safe166BoundaryObserved = block.includes("BuildV370SiteImpactGraphNodes");
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
  assert(routeObserved && safe166BoundaryObserved && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-166 BuildV370SiteImpactGraphNodes must remain bounded no-execution no-write redacted and client/provider isolated");
});

finish("== v3.7.0 site impact graph summary ==", { schema, step: "v3.7.0 (5)", route });

function assertStepDocs(step, title, ...ids) {
  for (const snippet of [
    `| ${step} | v3.7.0 (${step}) ${title} | P1 | 완료 |`,
    `## v3.7.0 Step ${step} 개발 기록`,
    route,
    `\`./server.sh ${command}\``,
  ]) assertIncludes(files.backlog, snippet, `backlog v3.7 Step ${step}`);
  assertIncludes(files.streamVerification, `| v3.7.0 (${step}) | \`./server.sh ${command}\` | ${title}.`, `stream verification v3.7 Step ${step}`);
  assertIncludes(files.featureInventory, `v3.7.0 (${step}) ${title}`, `feature inventory v3.7 Step ${step}`);
  for (const id of ids) assertIncludes(files.featureInventory, `\`${id}\``, `feature inventory ${id}`);
  assertIncludes(files.releaseRecords, "V370 Site Impact Graph", "release records v3.7 Step 5");
  assertIncludes(files.releaseRecords, `\`./server.sh ${command}\``, "release records v3.7 Step 5");
}

function loadFiles() {
  return {
    server: readWebRtcHttpServerBundle(readText),
    backlog: readText("docs/development-backlog.md"),
    streamVerification: readText("docs/stream-verification.md"),
    featureInventory: readText("docs/project-feature-test-inventory.md"),
    featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
    projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
    scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
    releaseRecords: readText("docs/release-test-records.md"),
    implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
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
  assert(text.slice(index, index + 128).includes("false"), `boundary flag must be false: ${flag}`);
}
function finish(title, summary) {
  const results = runChecks();
  console.log("");
  console.log(title);
  for (const [key, value] of Object.entries(summary)) console.log(`- ${key}: ${value}`);
  console.log("- writes: no source/view/EventRecord/Ops audit/client/media mutation performed");
  console.log("- uiFulltest: not-run-by-this-command");
  console.log("- longrun30Or120: not-run-by-this-command");
  console.log(`- pass: ${results.pass}`);
  console.log(`- fail: ${results.fail}`);
  if (results.fail > 0) process.exit(1);
}
function runChecks() {
  let pass = 0, fail = 0;
  for (const item of checks) {
    try { item.fn(); pass += 1; console.log(`[pass] ${item.name}`); }
    catch (error) { fail += 1; console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  return { pass, fail };
}
function check(name, fn) { checks.push({ name, fn }); }
function readText(relativePath) { return fs.readFileSync(path.join(rootDir, relativePath), "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function assertIncludes(text, snippet, label) { assert(text.includes(snippet), `${label} missing snippet: ${snippet}`); }
