#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v2.5.0 S06 similar incident lookup과 deterministic scoring/redaction 경계를 검증한다.
import { extractCppFunctionBlock, exactBooleanFlagValue, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readWebRtcHttpServerBundle(readText);
const similarIncidentViewBlock = extractCppFunctionBlock(server, "std::string OpsSimilarIncidentLookupViewJson(");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const implementationEvidence = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
const serverSh = readText("server.sh");

check("ops events page exposes similar incident lookup shell", () => {
  for (const snippet of [
    'data-testid="ops-similar-incident-lookup"',
    'data-similar-incident-lookup="rule-scenario-source-status"',
    'id="opsSimilarIncidentSummary"',
    'id="opsSimilarIncidentBadges"',
    'id="opsSimilarIncidentRows"',
    "같은 rule/scenario/source/status 패턴",
  ]) {
    assertIncludes(server, snippet, "similar incident lookup shell");
  }
});

check("ops review API returns deterministic similar incident view model", () => {
  assertIncludes(similarIncidentViewBlock, "media-server.ops.similar-incident-lookup.v1", "/ops/api/events/reviews similar incident view model");
  assert(exactBooleanFlagValue(similarIncidentViewBlock, "deterministicScoring") === true,
    "LAB-067 similar incident deterministicScoring must remain true");
  assert(exactBooleanFlagValue(similarIncidentViewBlock, "viewerClientExposureAdded") === false, "similar incidents must remain hidden from client/viewer");
  assertIncludes(server, "\\\"modelProviderDependency\\\":false", "modelProviderDependency must remain absent/false");
  for (const snippet of [
    "OpsSimilarIncidentLookupViewJson",
    "media-server.ops.similar-incident-lookup.v1",
    "\\\"similarIncidents\\\":",
    "\\\"baseEventId\\\":",
    "\\\"related\\\":",
    "\\\"score\\\":",
    "\\\"explanationTerms\\\":",
    "\\\"rule\\\"",
    "\\\"scenario\\\"",
    "\\\"source\\\"",
    "\\\"event-status\\\"",
    "\\\"incident-status\\\"",
    "\\\"action-target\\\"",
    "\\\"deterministicScoring\\\":true",
    "\\\"modelProviderDependency\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"viewerClientExposureAdded\\\":false",
  ]) {
    assertIncludes(server, snippet, "similar incident view model");
  }
  assert(!server.includes("/ops/api/incidents/similar"), "S06 must not introduce a new public similar incident API");
  assert(!server.includes("media-server.client.similar-incident"), "S06 must not add a client similar incident schema");
});

check("similar incident script renders groups and score explanations", () => {
  const lookupBlock = extractNamedFunctionBlock(script, "renderSimilarIncidentLookup");
  for (const snippet of [
    "renderSimilarIncidentLookup",
    "similarIncidents",
    "baseEventId",
    "related",
    "explanationTerms",
    "data-similar-incident-group",
    "data-similar-incident-related",
  ]) {
    assertIncludes(script, snippet, "similar incident script");
  }
  assertIncludes(lookupBlock, "similar-incident-score", "UI-042 block-scoped canonical product state");
  assert(!["rawJson", "rawLocator", "rawEvidenceIncluded: true", "rtsp://", "rtsps://"].some(marker => lookupBlock.includes(marker)), "UI-042 raw-material-redaction explicit absence oracle");
  assert(!["sourceUrl", "sourceURL", "rtsp://", "rtsps://"].some(marker => lookupBlock.includes(marker)), "UI-042 source-url-redaction explicit absence oracle");
  assert(!["debugCounters", "Developer URL", "debugMaterialExposed: true"].some(marker => lookupBlock.includes(marker)), "UI-042 debug-redaction explicit absence oracle");
  assertIncludes(script, "/ops/events", "UI-042 canonical route obligation");
});

check("similar incident lookup has responsive styling", () => {
  for (const snippet of [
    ".similar-incident-panel",
    ".similar-incident-list",
    ".similar-incident-group",
    ".similar-incident-related-list",
    ".similar-incident-score",
  ]) {
    assertIncludes(css, snippet, "similar incident CSS");
  }
});

check("ops smoke, inventory, and coverage track S06 markers", () => {
  for (const snippet of [
    'data-testid="ops-similar-incident-lookup"',
    'id="opsSimilarIncidentRows"',
    "similarIncidents",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke marker");
  }
  for (const snippet of [
    "| UI-042 | `/ops/events` Similar Incident Lookup |",
    "| EVT-044 | Ops similar incident lookup view model |",
    "| LAB-067 | Similar incident deterministic scoring fixture |",
    "| SAFE-048 | V250-S06 similar incident lookup boundary |",
    "verify-v250-similar-incident-lookup",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S06 row");
  }
  assertExactVerifierMapping(
    implementationEvidence,
    "UI-042",
    "verify-v250-similar-incident-lookup",
    "scripts/internal/verify_v250_similar_incident_lookup.mjs",
  );
});

check("server command is registered", () => {
  assertIncludes(serverSh, "verify-v250-similar-incident-lookup", "server.sh command");
  assertIncludes(serverSh, "verify_v250_similar_incident_lookup.mjs", "server.sh script target");
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.5.0 S06 similar incident lookup 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.5.0 S06 similar incident lookup 통과 ==");

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

function assertExactVerifierMapping(manifest, featureId, command, file) {
  const item = manifest.items?.find(entry => entry.id === featureId);
  assert(item?.verifierEvidence?.command === command,
    `${featureId} exact verifier command mismatch: ${item?.verifierEvidence?.command}`);
  assert(item?.verifierEvidence?.file === file,
    `${featureId} exact verifier file mismatch: ${item?.verifierEvidence?.file}`);
  assert(item?.verifierEvidence?.anchor === featureId,
    `${featureId} exact verifier assertion anchor mismatch: ${item?.verifierEvidence?.anchor}`);
}
