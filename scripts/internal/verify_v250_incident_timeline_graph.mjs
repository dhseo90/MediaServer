#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v2.5.0 S04 incident timeline graph와 action/audit linkage boundary를 검증한다.
import { extractCppFunctionBlock, exactBooleanFlagValue, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readWebRtcHttpServerBundle(readText);
const timelineViewBlock = extractCppFunctionBlock(server, "std::string OpsIncidentTimelineGraphViewJson(");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const manifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
const serverSh = readText("server.sh");

check("ops events page exposes incident timeline graph shell", () => {
  for (const snippet of [
    'data-testid="ops-incident-timeline-graph"',
    'data-incident-timeline-graph="source-event-action-alert-close"',
    'id="opsIncidentTimelineGraphSummary"',
    'id="opsIncidentTimelineGraphBadges"',
    'id="opsIncidentTimelineGraphRows"',
    "source state → event → operator action → alert dry-run → close",
  ]) {
    assertIncludes(server, snippet, "incident timeline graph shell");
  }
});

check("ops review API returns Ops-only timeline graph view model", () => {
  assertIncludes(timelineViewBlock, "media-server.ops.incident-timeline-graph.v1", "/ops/api/events/reviews timeline graph view model");
  assert(timelineViewBlock.includes("auditLinkage") && exactBooleanFlagValue(timelineViewBlock, "viewerClientExposureAdded") === false, "LAB-065 timeline graph auditLinkage must preserve viewer absence");
  assert(exactBooleanFlagValue(timelineViewBlock, "viewerClientExposureAdded") === false, "timeline graph must remain hidden from client/viewer");
  assertIncludes(server, "\\\"viewerClientExposureAdded\\\":false", "viewerClientExposureAdded must remain absent/false");
  for (const snippet of [
    "OpsIncidentTimelineGraphViewJson",
    "media-server.ops.incident-timeline-graph.v1",
    "\\\"timelineGraph\\\":",
    "\\\"nodes\\\":",
    "\\\"edges\\\":",
    '"source-state"',
    '"event-record"',
    '"operator-action"',
    '"alert-dry-run"',
    '"close-state"',
    "\\\"auditLinkage\\\":",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"viewerClientExposureAdded\\\":false",
  ]) {
    assertIncludes(server, snippet, "timeline graph view model");
  }
  assert(!server.includes("/ops/api/incidents/timeline"), "S04 must not introduce a new public incident timeline API");
  assert(!server.includes("media-server.client.incident-timeline"), "S04 must not add a client timeline schema");
});

check("timeline graph script renders graph nodes and linkage labels", () => {
  const timelineBlock = extractNamedFunctionBlock(script, "renderIncidentTimelineGraph");
  for (const snippet of [
    "renderIncidentTimelineGraph",
    "incidentTimelineStageLabel",
    "timelineGraph",
    "source-state",
    "event-record",
    "operator-action",
    "alert-dry-run",
    "close-state",
    "data-incident-timeline-node",
    "data-incident-timeline-edge",
    "auditLinkage",
  ]) {
    assertIncludes(script, snippet, "timeline graph script");
  }
  assertIncludes(timelineBlock, "incident-timeline-edge", "UI-040 block-scoped canonical product state");
  assert(!["rawJson", "rawLocator", "rawEvidenceIncluded: true", "rtsp://", "rtsps://"].some(marker => timelineBlock.includes(marker)), "UI-040 raw-material-redaction explicit absence oracle");
  assert(!["sourceUrl", "sourceURL", "rtsp://", "rtsps://"].some(marker => timelineBlock.includes(marker)), "UI-040 source-url-redaction explicit absence oracle");
  assert(!["debugCounters", "Developer URL", "debugMaterialExposed: true"].some(marker => timelineBlock.includes(marker)), "UI-040 debug-redaction explicit absence oracle");
  assert(!["providerApiCall(", "rawProviderResponse", "providerMaterialExposed: true"].some(marker => timelineBlock.includes(marker)), "UI-040 provider-boundary explicit absence oracle");
  assertIncludes(script, "/ops/events", "UI-040 canonical route obligation");
});

check("timeline graph is styled as a responsive graph rail", () => {
  for (const snippet of [
    ".incident-timeline-graph",
    ".incident-timeline-graph-rail",
    ".incident-timeline-node",
    ".incident-timeline-edge",
    ".incident-timeline-node[data-stage",
  ]) {
    assertIncludes(css, snippet, "timeline graph CSS");
  }
});

check("ops smoke, inventory, and coverage track S04 markers", () => {
  for (const snippet of [
    'data-testid="ops-incident-timeline-graph"',
    'id="opsIncidentTimelineGraphRows"',
    "timelineGraph",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke marker");
  }
  for (const snippet of [
    "| UI-040 | `/ops/events` Incident Timeline Graph |",
    "| EVT-042 | Ops incident timeline graph view model |",
    "| LAB-065 | Incident timeline graph fixture linkage |",
    "| SAFE-046 | V250-S04 incident timeline graph boundary |",
    "verify-v250-incident-timeline-graph",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S04 row");
  }
  for (const id of ["UI-040", "EVT-042", "LAB-065", "SAFE-046"]) {
    assert(manifest.items.find(item => item.id === id)?.verifierEvidence?.command === "verify-v250-incident-timeline-graph",
      `${id} manifest verifier command drift`);
  }
  assertIncludes(coverage, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(coverage, "verifierEvidenceRows", "feature coverage verifier evidence summary");
});

check("server command is registered", () => {
  assertIncludes(serverSh, "verify-v250-incident-timeline-graph", "server.sh command");
  assertIncludes(serverSh, "verify_v250_incident_timeline_graph.mjs", "server.sh script target");
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.5.0 S04 incident timeline graph 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.5.0 S04 incident timeline graph 통과 ==");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function check(name, fn) {
  try {
    fn();
    console.log(`[pass] ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`[fail] ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}
