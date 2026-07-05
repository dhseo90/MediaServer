#!/usr/bin/env node
// 파일 용도: v3.7.0 Step 5 Site Impact Graph 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

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
  const block = extractBlock(files.server, "std::string OpsV370SiteImpactGraphJson", "struct OpsV350CommandPlanCandidate");
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
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  assertIncludes(files.scriptInventory, "verify_v370_site_impact_graph.mjs", "script inventory");
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
