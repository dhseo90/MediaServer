#!/usr/bin/env node
import { validateFeatureDocumentation } from "./documentation_contract_lib.mjs";
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v2.8.0 S06 client-safe follow-up digest와 viewer redaction 경계를 검증한다.

import fs from "node:fs";
import process from "node:process";
import { extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";

const failures = [];

const server = readWebRtcHttpServerBundle(readText);
const clientScript = readText("src/ingress/product_ui_client_scripts.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const manualUi = readText("docs/manual-ui-checklist.md");
const implementationManifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
const streamVerification = readText("docs/stream-verification.md");
const serverSh = readText("server.sh");
const followUpDigestApiBlock = extractCppFunctionBlock(server, "void AppendClientSafeFollowUpDigestJson(");
const followUpDigestProjectionBlock = extractCppFunctionBlock(server, "void AppendClientEventSummaryJson(");
const followUpDigestRendererBlock = extractNamedFunctionBlock(clientScript, "renderClientSafeFollowUpDigest");

const definitionIds = ["CLIENT-024","SAFE-069"];
const currentDefinitions = inventory.split(/\r?\n/).filter(line => definitionIds.includes(line.split("|")[1]?.trim())).join("\n");

check("현행 계약·기능 정의·검증 명령 연결", () => {
  const errors = validateFeatureDocumentation({
    document: currentDefinitions, identifiers: ["media-server.client.follow-up-digest.v1"],
    command: "verify-v280-client-safe-followup-digest", script: "verify_v280_client_safe_followup_digest.mjs",
    featureIds: ["CLIENT-024"], inventory, implementation: implementationManifest,
    verification: streamVerification, server: serverSh,
  });
  assert(errors.length === 0, errors.join("; "));
  // 독립 runtime 검사의 결속을 확인할 뿐 여기서 실행하거나 정적 검사로 대체하지 않는다.
  for (const [id, expectedCommand] of [["SAFE-069","verify-auth-routes"]]) {
    const rows = inventory.split(/\r?\n/).filter(line => line.split("|")[1]?.trim() === id);
    const entries = implementationManifest.items.filter(item => item.id === id);
    assert(rows.length === 1 && entries.length === 1 && entries[0].verifierEvidence?.command === expectedCommand,
      id + " 독립 실행 정의/명령 연결 누락 또는 중복");
  }
});

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
  assertIncludes(coverage, "validateImplementationManifest", "feature coverage manifest validation");
  assert(manualUi.split(/\r?\n/).some(line => definitionIds.every(id => line.includes("`" + id + "`")) && line.includes("verify-v280-client-safe-followup-digest")), "manual UI S06 row: 기능 ID·명령 연결 누락");
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
console.log("[scope] uiFulltest: not-run-by-this-command; longrun30Or120: not-run-by-this-command");
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
