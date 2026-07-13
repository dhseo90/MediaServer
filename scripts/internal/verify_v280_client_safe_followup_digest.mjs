#!/usr/bin/env node
// 파일 용도: v2.8.0 S06 client-safe follow-up digest와 viewer redaction 경계를 검증한다.

import fs from "node:fs";
import process from "node:process";
import { extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";

const failures = [];

const server = readText("src/ingress/webrtc_http_server.cpp");
const clientScript = readText("src/ingress/product_ui_client_scripts.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const backlog = readText("docs/development-backlog.md");
const manualUi = readText("docs/manual-ui-checklist.md");
const serverSh = readText("server.sh");
const followUpDigestApiBlock = extractCppFunctionBlock(server, "void AppendClientSafeFollowUpDigestJson(");
const followUpDigestProjectionBlock = extractCppFunctionBlock(server, "void AppendClientEventSummaryJson(");
const followUpDigestRendererBlock = extractNamedFunctionBlock(clientScript, "renderClientSafeFollowUpDigest");

check("client events API emits viewer-safe follow-up digest schema", () => {
  assert(followUpDigestApiBlock.includes("media-server.client.follow-up-digest.v1") && followUpDigestProjectionBlock.includes("followUpDigest"), "CLIENT-024 exact followUpDigest API projection missing");
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
  const rawEvidenceBoundaryMissing = !followUpDigestRendererBlock.includes("rawEvidenceIncluded === false");
  const rawMaterialExposed = ["rawJson", "rawLocator", "rawEvidence.value", "rawEvidence.items"].some(marker => followUpDigestRendererBlock.includes(marker));
  const sourceUrlExposed = ["sourceUrl", "sourceURL", "rtsp://", "rtsps://"].some(marker => followUpDigestRendererBlock.includes(marker));
  const debugMaterialExposed = ["debugCounters", "debugMaterial"].some(marker => followUpDigestRendererBlock.includes(marker));
  const providerMaterialExposed = ["providerPrompt", "providerResponse", "providerMaterial"].some(marker => followUpDigestRendererBlock.includes(marker));
  assert(rawEvidenceBoundaryMissing === false && rawMaterialExposed === false, "CLIENT-024 raw material must remain redacted");
  assert(sourceUrlExposed === false, "CLIENT-024 source URL must remain redacted");
  assert(debugMaterialExposed === false, "CLIENT-024 debug material must remain redacted");
  assert(providerMaterialExposed === false, "CLIENT-024 provider material must remain absent");
  assert(followUpDigestApiBlock.includes("media-server.client.follow-up-digest.v1") && followUpDigestRendererBlock.includes("followUpDigest") && followUpDigestRendererBlock.includes("client-safe-followup-digest"), "CLIENT-024 exact followUpDigest renderer/schema readback missing");
  for (const snippet of [
    "renderClientSafeFollowUpDigest",
    "followUpDigest",
    "data-testid=\"client-safe-followup-digest\"",
    "data-client-followup-digest=\"viewer-safe\"",
    "viewer-safe follow-up digest",
    "digestItems",
    "followUpStatus",
  ]) {
    assertIncludes(followUpDigestRendererBlock, snippet, "client follow-up digest renderer");
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
    assert(!followUpDigestRendererBlock.includes(`followUpDigest.${forbidden}`), `client follow-up digest renderer must not read ${forbidden}`);
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
  assertIncludes(coverage, "validateImplementationManifest", "feature coverage manifest validation");
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
