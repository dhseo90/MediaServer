#!/usr/bin/env node
// 파일 용도: v2.5.0 S03 /ops/events semantic search UI와 Ops-only search view model을 검증한다.

import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readText("src/ingress/webrtc_http_server.cpp");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const serverSh = readText("server.sh");

check("ops events page exposes semantic incident search controls", () => {
  for (const snippet of [
    'data-testid="ops-events-semantic-search"',
    'data-incident-memory-search="local-index"',
    'id="opsIncidentSearchInput"',
    'id="opsIncidentSearchRuleFilter"',
    'id="opsIncidentSearchSourceFilter"',
    'id="opsIncidentSearchStatusFilter"',
    'id="opsIncidentSearchStartTime"',
    'id="opsIncidentSearchEndTime"',
    'id="opsIncidentSearchSummary"',
    'id="opsIncidentSearchRows"',
    "matched evidence highlight",
  ]) {
    assertIncludes(server, snippet, "semantic search page shell");
  }
});

check("ops events review API returns local-only semantic search view model", () => {
  for (const snippet of [
    "OpsIncidentMemorySearchViewJson",
    "media-server.ops.incident-memory-search-view.v1",
    "IncidentMemoryIndex",
    "IncidentMemorySearchOptions",
    "\\\"memorySearch\\\":",
    "\\\"matchedTerms\\\":",
    "\\\"highlightFragments\\\":",
    "\\\"filters\\\":",
    "\\\"modelProviderDependency\\\":false",
    "\\\"viewerClientExposureAdded\\\":false",
  ]) {
    assertIncludes(server, snippet, "semantic search view model");
  }
  assert(!server.includes("/ops/api/events/search"), "S03 must reuse Ops events owner instead of adding a new public search route");
  assert(!server.includes("embeddingProvider"), "S03 must not introduce an embedding provider dependency");
});

check("ops events script wires query filters and highlight rendering", () => {
  for (const snippet of [
    "incidentMemoryQueryParams",
    "renderIncidentMemorySearch",
    "incidentMemoryHighlightHtml",
    "opsIncidentSearchInput",
    "opsIncidentSearchRuleFilter",
    "opsIncidentSearchSourceFilter",
    "opsIncidentSearchStatusFilter",
    "opsIncidentSearchStartTime",
    "opsIncidentSearchEndTime",
    "q",
    "ruleId",
    "sourceId",
    "incidentStatus",
    "startTimeMs",
    "endTimeMs",
    "memorySearch",
    "matchedTerms",
    "highlightFragments",
  ]) {
    assertIncludes(script, snippet, "semantic search script");
  }
});

check("semantic search UI has responsive highlight styling", () => {
  for (const snippet of [
    ".incident-memory-search",
    ".incident-memory-search-grid",
    ".incident-memory-highlight",
    ".incident-memory-result",
  ]) {
    assertIncludes(css, snippet, "semantic search CSS");
  }
});

check("ops client UI smoke and inventory track S03 markers", () => {
  for (const snippet of [
    'data-testid="ops-events-semantic-search"',
    'id="opsIncidentSearchInput"',
    'id="opsIncidentSearchRows"',
    "memorySearch",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke marker");
  }
  for (const snippet of [
    "| UI-039 | `/ops/events` Semantic Incident Search |",
    "| EVT-041 | Ops incident memory search view model |",
    "| SAFE-045 | V250-S03 incident search UI redaction boundary |",
    "verify-v250-ops-events-semantic-search-ui",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S03 row");
  }
});

check("server command is registered", () => {
  assertIncludes(serverSh, "verify-v250-ops-events-semantic-search-ui", "server.sh command");
  assertIncludes(serverSh, "verify_v250_ops_events_semantic_search_ui.mjs", "server.sh script target");
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.5.0 S03 semantic search UI 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.5.0 S03 semantic search UI 통과 ==");

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
