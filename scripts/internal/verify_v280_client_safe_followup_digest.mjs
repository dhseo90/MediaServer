#!/usr/bin/env node
// 파일 용도: v2.8.0 S06 client-safe follow-up digest와 viewer redaction 경계를 검증한다.

import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readText("src/ingress/webrtc_http_server.cpp");
const clientScript = readText("src/ingress/product_ui_client_scripts.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const backlog = readText("docs/development-backlog.md");
const manualUi = readText("docs/manual-ui-checklist.md");
const serverSh = readText("server.sh");

check("client events API emits viewer-safe follow-up digest schema", () => {
  for (const snippet of [
    "AppendClientSafeFollowUpDigestJson",
    "media-server.client.follow-up-digest.v1",
    "\\\"followUpDigest\\\":",
    "\\\"viewerSafe\\\":true",
    "\\\"publishedViewScoped\\\":true",
    "\\\"sourceUrlIncluded\\\":false",
    "\\\"rawEvidenceIncluded\\\":false",
    "\\\"debugMaterialIncluded\\\":false",
    "\\\"providerMaterialIncluded\\\":false",
    "\\\"ruleEditorIncluded\\\":false",
    "\\\"actionControlsIncluded\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"eventSchemaChanged\\\":false",
    "\\\"mediaPathChanged\\\":false",
    "\\\"digestItems\\\":",
    "\\\"followUpStatus\\\":",
    "\\\"severity\\\":",
    "\\\"time\\\":",
  ]) {
    assertIncludes(server, snippet, "client-safe follow-up digest API");
  }
  assert(!server.includes("/client/api/follow-up-digest"), "S06 must not introduce a separate client follow-up digest route");
  assert(!server.includes("media-server.ops.follow-up-digest"), "S06 digest must be client schema, not an Ops-only schema");
});

check("client renderer shows follow-up digest without raw/source/debug/provider/rule editor material", () => {
  for (const snippet of [
    "renderClientSafeFollowUpDigest",
    "followUpDigest",
    "data-testid=\"client-safe-followup-digest\"",
    "data-client-followup-digest=\"viewer-safe\"",
    "viewer-safe follow-up digest",
    "digestItems",
    "followUpStatus",
  ]) {
    assertIncludes(clientScript, snippet, "client follow-up digest renderer");
  }
  for (const forbidden of [
    "sourceUrl",
    "developerUrl",
    "rawJson",
    "debugCounters",
    "providerPrompt",
    "providerResponse",
    "ruleEditor",
    "actionRoute",
    "actionControls",
  ]) {
    assert(!clientScript.includes(`followUpDigest.${forbidden}`), `client follow-up digest renderer must not read ${forbidden}`);
  }
});

check("ops/client smoke, inventory, coverage, and docs track S06", () => {
  for (const snippet of [
    "client-safe-followup-digest",
    "followUpDigest",
    "viewer-safe follow-up digest",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops/client UI smoke S06 marker");
  }
  for (const snippet of [
    "| CLIENT-024 | Client-safe follow-up digest API/UI |",
    "| SAFE-069 | V280-S06 client-safe follow-up digest boundary |",
    "verify-v280-client-safe-followup-digest",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S06 row");
  }
  assertIncludes(coverage, "verify-v280-client-safe-followup-digest", "feature coverage S06 verifier");
  assertIncludes(backlog, "| 6 | V280-S06 | P2 | 완료 | Client-safe Follow-up Digest |", "roadmap S06 completed row");
  assertIncludes(backlog, "## v2.8.0 S06 개발 기록", "roadmap S06 implementation record");
  assertIncludes(backlog, "media-server.client.follow-up-digest.v1", "roadmap S06 schema record");
  assertIncludes(manualUi, "| V280-S06 Client-safe Follow-up Digest |", "manual UI S06 row");
  for (const route of ["/client/live", "/client/dashboard", "/client/events"]) {
    assertIncludes(manualUi, route, "manual UI S06 route coverage");
  }
});

check("server command is registered", () => {
  assertIncludes(serverSh, "verify-v280-client-safe-followup-digest", "server.sh command");
  assertIncludes(serverSh, "verify_v280_client_safe_followup_digest.mjs", "server.sh script target");
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.8.0 S06 client-safe follow-up digest 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.8.0 S06 client-safe follow-up digest 통과 ==");

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
