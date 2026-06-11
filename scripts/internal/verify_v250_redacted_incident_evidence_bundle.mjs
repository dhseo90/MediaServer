#!/usr/bin/env node
// 파일 용도: v2.5.0 S08 redacted incident evidence bundle의 release-safe export 경계를 검증한다.

import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readText("src/ingress/webrtc_http_server.cpp");
const opsScript = readText("src/ingress/product_ui_page_scripts.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const serverSh = readText("server.sh");

check("bundle route supports release-safe redacted manifest mode", () => {
  for (const snippet of [
    "EvidenceBundleReleaseSafeRequested",
    "BuildReleaseSafeIncidentEvidenceBundleManifest",
    "media-server.v250.redacted-incident-evidence-bundle.v1",
    "\\\"releaseSafe\\\":true",
    "\\\"rawEvidenceIncluded\\\":false",
    "\\\"sourceLocatorIncluded\\\":false",
    "\\\"credentialIncluded\\\":false",
    "\\\"providerMaterialIncluded\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"searchResults\\\":",
    "\\\"timelineSummary\\\":",
    "\\\"redactionPolicy\\\":",
  ]) {
    assertIncludes(server, snippet, "release-safe evidence bundle server");
  }
  assertIncludes(server, "if (!release_safe_requested)", "raw evidence files must stay outside release-safe bundle branch");
  assert(!server.includes("/ops/api/incidents/evidence-bundle"), "S08 must reuse existing evidence bundle owner instead of adding a new Ops route");
});

check("ops events UI offers release-safe bundle action separately from raw bundle", () => {
  for (const snippet of [
    "releaseSafeBundlePayload",
    "releaseSafe",
    "data-release-safe-evidence-bundle",
    "release-safe bundle",
    "redacted incident evidence bundle",
  ]) {
    assertIncludes(opsScript, snippet, "release-safe evidence bundle UI");
  }
});

check("ops smoke, inventory, and coverage track S08", () => {
  for (const snippet of [
    "data-release-safe-evidence-bundle",
    "release-safe bundle",
    "redacted incident evidence bundle",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke S08 marker");
  }
  for (const snippet of [
    "| UI-043 | `/ops/events` Redacted Incident Evidence Bundle |",
    "| EVT-045 | Redacted incident evidence bundle export |",
    "| LAB-068 | Release-safe incident evidence bundle fixture |",
    "| SAFE-050 | V250-S08 redacted incident evidence bundle boundary |",
    "verify-v250-redacted-incident-evidence-bundle",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S08 row");
  }
  assertIncludes(coverage, "verify-v250-redacted-incident-evidence-bundle", "feature coverage S08 verifier");
});

check("server command is registered", () => {
  assertIncludes(serverSh, "verify-v250-redacted-incident-evidence-bundle", "server.sh command");
  assertIncludes(serverSh, "verify_v250_redacted_incident_evidence_bundle.mjs", "server.sh script target");
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.5.0 S08 redacted incident evidence bundle 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.5.0 S08 redacted incident evidence bundle 통과 ==");

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
