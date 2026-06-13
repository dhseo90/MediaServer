#!/usr/bin/env node
// 파일 용도: v2.5.0 S05 explainable incident brief와 VLM default-off 경계를 검증한다.

import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readText("src/ingress/webrtc_http_server.cpp");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const serverSh = readText("server.sh");

check("ops events page exposes explainable incident brief shell", () => {
  for (const snippet of [
    'data-testid="ops-explainable-incident-brief"',
    'data-incident-brief="action-object-context-environment"',
    'id="opsIncidentBriefSummary"',
    'id="opsIncidentBriefBadges"',
    'id="opsIncidentBriefRows"',
    "action/object/context/environment",
  ]) {
    assertIncludes(server, snippet, "incident brief shell");
  }
});

check("ops review API returns deterministic brief view model", () => {
  for (const snippet of [
    "OpsExplainableIncidentBriefViewJson",
    "media-server.ops.explainable-incident-brief.v1",
    "\\\"incidentBrief\\\":",
    "\\\"actionSlot\\\":",
    "\\\"objectSlot\\\":",
    "\\\"contextSlot\\\":",
    "\\\"environmentSlot\\\":",
    "\\\"defaultVlmEnrichmentEnabled\\\":false",
    "\\\"modelProviderDependency\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"viewerClientExposureAdded\\\":false",
  ]) {
    assertIncludes(server, snippet, "incident brief view model");
  }
  assert(!server.includes("/ops/api/incidents/brief"), "S05 must not introduce a new public incident brief API");
  assert(!server.includes("defaultVlmEnrichmentEnabled\\\":true"), "VLM enrichment must not be default-on");
});

check("incident brief script renders slots and default-off state", () => {
  for (const snippet of [
    "renderExplainableIncidentBrief",
    "incidentBriefSlotLabel",
    "incidentBrief",
    "actionSlot",
    "objectSlot",
    "contextSlot",
    "environmentSlot",
    "defaultVlmEnrichmentEnabled",
    "data-incident-brief-card",
    "data-incident-brief-slot",
  ]) {
    assertIncludes(script, snippet, "incident brief script");
  }
});

check("incident brief has responsive slot styling", () => {
  for (const snippet of [
    ".incident-brief-panel",
    ".incident-brief-card",
    ".incident-brief-slot-grid",
    ".incident-brief-slot",
  ]) {
    assertIncludes(css, snippet, "incident brief CSS");
  }
});

check("ops smoke, inventory, and coverage track S05 markers", () => {
  for (const snippet of [
    'data-testid="ops-explainable-incident-brief"',
    'id="opsIncidentBriefRows"',
    "incidentBrief",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke marker");
  }
  for (const snippet of [
    "| UI-041 | `/ops/events` Explainable Incident Brief |",
    "| EVT-043 | Ops explainable incident brief view model |",
    "| LAB-066 | Explainable incident brief fixture guard |",
    "| SAFE-047 | V250-S05 explainable incident brief boundary |",
    "verify-v250-explainable-incident-brief",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S05 row");
  }
  assertIncludes(coverage, "verify-v250-explainable-incident-brief", "feature coverage S05 verifier");
});

check("server command is registered", () => {
  assertIncludes(serverSh, "verify-v250-explainable-incident-brief", "server.sh command");
  assertIncludes(serverSh, "verify_v250_explainable_incident_brief.mjs", "server.sh script target");
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.5.0 S05 explainable incident brief 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.5.0 S05 explainable incident brief 통과 ==");

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
