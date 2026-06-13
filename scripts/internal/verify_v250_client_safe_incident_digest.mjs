#!/usr/bin/env node
// 파일 용도: v2.5.0 S07 client-safe incident digest와 viewer redaction 경계를 검증한다.

import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readText("src/ingress/webrtc_http_server.cpp");
const clientScript = readText("src/ingress/product_ui_client_scripts.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const serverSh = readText("server.sh");

check("client events API emits viewer-safe incident digest schema", () => {
  for (const snippet of [
    "AppendClientSafeIncidentDigestJson",
    "media-server.client.incident-digest.v1",
    "\\\"incidentDigest\\\":",
    "\\\"viewerSafe\\\":true",
    "\\\"sourceLocatorIncluded\\\":false",
    "\\\"rawEvidenceIncluded\\\":false",
    "\\\"debugMaterialIncluded\\\":false",
    "\\\"providerMaterialIncluded\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"digestItems\\\":",
    "\\\"summaryText\\\":",
    "\\\"severity\\\":",
  ]) {
    assertIncludes(server, snippet, "client-safe incident digest API");
  }
  assert(!server.includes("/client/api/incidents/digest"), "S07 must not introduce a separate client incident digest route");
  assert(!server.includes("media-server.ops.client-incident-digest"), "S07 digest must be client schema, not an Ops-only schema");
});

check("client renderer shows digest without raw/source/debug/provider material", () => {
  for (const snippet of [
    "renderClientSafeIncidentDigest",
    "incidentDigest",
    "data-testid=\"client-safe-incident-digest\"",
    "data-client-incident-digest=\"viewer-safe\"",
    "viewer-safe incident digest",
    "digestItems",
  ]) {
    assertIncludes(clientScript, snippet, "client incident digest renderer");
  }
  for (const forbidden of [
    "sourceUrl",
    "developerUrl",
    "rawJson",
    "debugCounters",
    "providerPrompt",
    "providerResponse",
  ]) {
    assert(!clientScript.includes(`incidentDigest.${forbidden}`), `client digest renderer must not read ${forbidden}`);
  }
});

check("ops/client smoke, inventory, and coverage track S07", () => {
  for (const snippet of [
    "client-safe-incident-digest",
    "incidentDigest",
    "viewer-safe incident digest",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops/client UI smoke S07 marker");
  }
  for (const snippet of [
    "| CLIENT-023 | Client-safe incident digest API/UI |",
    "| SAFE-049 | V250-S07 client-safe incident digest boundary |",
    "verify-v250-client-safe-incident-digest",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S07 row");
  }
  assertIncludes(coverage, "verify-v250-client-safe-incident-digest", "feature coverage S07 verifier");
});

check("server command is registered", () => {
  assertIncludes(serverSh, "verify-v250-client-safe-incident-digest", "server.sh command");
  assertIncludes(serverSh, "verify_v250_client_safe_incident_digest.mjs", "server.sh script target");
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.5.0 S07 client-safe incident digest 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.5.0 S07 client-safe incident digest 통과 ==");

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
