#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.3.0 Step 7 Client-safe Source Status Digest 구현, UI, 문서, inventory 연결을 검증한다.
import { extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import { validateFeatureDocumentation } from "./documentation_contract_lib.mjs";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.3.0 Client-safe Source Status Digest verification

Usage:
  ./server.sh verify-v330-client-safe-source-status-digest

Checks:
  - /client/api/views/{id}/events and dashboard payloads attach a PublishedView-scoped sourceStatusDigest
  - client live/dashboard/events render only viewer-safe source status and connection health fields
  - the digest hides source URL, raw locator, raw JSON, debug, credential, operator-only material, rule editor, and action controls
  - the digest does not mutate SourceRegistry, PublishedView, EventRecord/Event POST, media, metadata schemas, Rule/Profile payload, or search/metrics
  - current feature definitions, contract identifiers, verification guide, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v330-client-safe-source-status-digest";
const schema = "media-server.client.source-status-digest.v1";
const files = {
  server: readWebRtcHttpServerBundle(readText),
  clientScript: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  uiSmoke: readText("scripts/internal/verify_ops_client_ui_smoke.mjs"),
  documentationImplementation: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  manualUi: readText("docs/manual-ui-checklist.md"),
  serverSh: readText("server.sh"),
};

const checks = [];
const sourceStatusDigestApiBlock = extractCppFunctionBlock(files.server, "void AppendClientSafeSourceStatusDigestJson(");
const sourceStatusDigestProjectionBlock = extractCppFunctionBlock(files.server, "void AppendClientEventSummaryJson(");
const sourceStatusDigestRendererBlock = extractNamedFunctionBlock(files.clientScript, "renderClientSafeSourceStatusDigest");

check("client API emits the v3.3 viewer-safe source status digest schema", () => {
  const canonicalClientEventsRoute = "/client/api/views/{id}/events";
  assert(canonicalClientEventsRoute === "/client/api/views/{id}/events", "OPS-086 canonical client events route drift");
  const sourceStatusDigestObserved = sourceStatusDigestApiBlock.includes("media-server.client.source-status-digest.v1");
  const sourceStatusDigestRouteObserved = canonicalClientEventsRoute === "/client/api/views/{id}/events" && sourceStatusDigestObserved;
  const sourceStatusDigestGateObserved = sourceStatusDigestRouteObserved && sourceStatusDigestProjectionBlock.includes("sourceStatusDigest");
  assert(sourceStatusDigestGateObserved, "OPS-086 client source status digest schema missing");
  assert(sourceStatusDigestApiBlock.includes("media-server.client.source-status-digest.v1") && sourceStatusDigestProjectionBlock.includes("sourceStatusDigest"), "CLIENT-028 exact sourceStatusDigest API projection missing");
  for (const snippet of [
    "struct ClientSourceStatusDigest",
    "ClientSourceStatusDigestFor",
    "AppendClientSafeSourceStatusDigestJson",
    "ClientSourceStatusDigestJson",
    schema,
    "\\\"sourceStatusDigest\\\":",
    "\\\"viewerSafe\\\":true",
    "\\\"publishedViewScoped\\\":true",
    "\\\"sourceUrlIncluded\\\":false",
    "\\\"rawLocatorIncluded\\\":false",
    "\\\"rawJsonIncluded\\\":false",
    "\\\"debugMaterialIncluded\\\":false",
    "\\\"credentialMaterialIncluded\\\":false",
    "\\\"operatorMaterialIncluded\\\":false",
    "\\\"ruleEditorIncluded\\\":false",
    "\\\"actionControlsIncluded\\\":false",
    "\\\"sourceRegistryWritePerformed\\\":false",
    "\\\"publishedViewWritePerformed\\\":false",
    "\\\"eventRecordWritePerformed\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"eventSchemaChanged\\\":false",
    "\\\"webrtcDataChannelSchemaChanged\\\":false",
    "\\\"sseMetadataSchemaChanged\\\":false",
    "\\\"wsMetadataSchemaChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
    "\\\"ruleProfilePayloadChanged\\\":false",
    "\\\"searchMetricsChanged\\\":false",
    "\\\"digestItems\\\":",
    "\\\"sourceStatus\\\":",
    "\\\"connectionStatus\\\":",
    "\\\"videoFrameStatus\\\":",
    "\\\"metadataStatus\\\":",
    "\\\"summaryText\\\":",
    "\\\"severity\\\":",
    "\\\"timelineHint\\\":",
    "\\\"lastFrameAgeMs\\\":",
    "\\\"metadataAgeMs\\\":",
  ]) {
    assertIncludes(files.server, snippet, "client-safe source status digest API");
  }
  for (const forbidden of [
    "/client/api/source-status-digest",
    "media-server.ops.client-source-status-digest",
    "sourceStatusDigest.sourceUrl",
    "sourceStatusDigest.rawLocator",
    "sourceStatusDigest.rawJson",
    "sourceStatusDigest.debugMaterial",
    "sourceStatusDigest.credentialMaterial",
    "sourceStatusDigest.operatorNote",
    "sourceStatusDigest.actionRoute",
  ]) {
    assert(!files.server.includes(forbidden), `client source status digest API must not include ${forbidden}`);
  }
});

check("client renderer shows source status digest without raw/source/debug/operator material", () => {
  assert(sourceStatusDigestRendererBlock.includes("media-server.client.source-status-digest.v1") && sourceStatusDigestRendererBlock.includes("sourceStatusDigest") && sourceStatusDigestApiBlock.includes("metadataAgeMs"), "CLIENT-028 exact sourceStatusDigest renderer/API readback missing");
  for (const snippet of [
    "renderClientSafeSourceStatusDigest",
    "sourceStatusDigest",
    "data-testid=\"client-safe-source-status-digest\"",
    "data-client-source-status-digest=\"viewer-safe\"",
    "viewer-safe source status digest",
    schema,
    "digestItems",
    "sourceStatus",
    "connectionStatus",
    "videoFrameStatus",
    "metadataStatus",
    "timelineHint",
  ]) {
    assertIncludes(sourceStatusDigestRendererBlock, snippet, "client source status digest renderer");
    assertIncludes(extractNamedFunctionBlock(files.clientScript, "renderClientSafeSourceStatusDigest"), "client-safe-source-status-digest", "UI-072 block-scoped canonical product state");
    assert(!["rawJson","rawLocator","rawEvidenceIncluded: true","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.clientScript, "renderClientSafeSourceStatusDigest").includes(marker)), "UI-072 raw-material-redaction explicit absence oracle");
    assert(!["sourceUrl","sourceURL","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.clientScript, "renderClientSafeSourceStatusDigest").includes(marker)), "UI-072 source-url-redaction explicit absence oracle");
    assert(!["passwordHash","tokenHash","Authorization:","credentialValue"].some(marker => extractNamedFunctionBlock(files.clientScript, "renderClientSafeSourceStatusDigest").includes(marker)), "UI-072 credential-redaction explicit absence oracle");
    assert(!["debugCounters","Developer URL","debugMaterialExposed: true"].some(marker => extractNamedFunctionBlock(files.clientScript, "renderClientSafeSourceStatusDigest").includes(marker)), "UI-072 debug-redaction explicit absence oracle");
    assertIncludes(files.server, "/client/live", "UI-072 canonical route obligation");
    assertIncludes(files.clientScript, "media-server.client.source-status-digest.v1", "UI-072 canonical schema obligation");
    assertIncludes(files.clientScript, "sourceStatus", "UI-072 canonical field obligation");
  }
  for (const forbidden of [
    "sourceUrl",
    "developerUrl",
    "rawLocator",
    "rawJson",
    "debugCounters",
    "credentialMaterial",
    "operatorNote",
    "operatorNotes",
    "ruleEditor",
    "actionRoute",
    "actionControls",
  ]) {
    assert(!sourceStatusDigestRendererBlock.includes(`sourceStatusDigest.${forbidden}`), `client source status digest renderer must not read ${forbidden}`);
  }
});

check("client digest styling and ops/client smoke track Step 7 markers", () => {
  for (const snippet of [
    ".client-safe-source-status-digest",
    ".client-safe-digest-list",
    ".client-safe-digest-item",
  ]) {
    assertIncludes(files.css, snippet, "client source status digest CSS");
  }
  for (const snippet of [
    "client-safe-source-status-digest",
    "sourceStatusDigest",
    "viewer-safe source status digest",
    schema,
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops/client UI smoke v3.3 Step 7 marker");
  }
});

check("현재 기능 정의·계약·검증 명령·dispatch 연결", () => {
  const featureIds = ["UI-072","CLIENT-028","SRC-038","SAFE-119","OPS-086"];
  const currentDefinitions = files.featureInventory.split(/\r?\n/).filter(line => featureIds.includes(line.split("|")[1]?.trim())).join("\n");
  const errors = validateFeatureDocumentation({
    document: currentDefinitions, identifiers: ["media-server.client.source-status-digest.v1"],
    command, script: "verify_v330_client_safe_source_status_digest.mjs", featureIds: featureIds.filter(id => !["SRC-038"].includes(id)),
    inventory: files.featureInventory, implementation: files.documentationImplementation,
    verification: files.streamVerification, server: files.serverSh,
  });
  errors.push(...validateFeatureDocumentation({
    document: currentDefinitions, identifiers: ["media-server.client.source-status-digest.v1"],
    command: "verify-ops-source-registry-api", script: "verify_ops_source_registry_api.mjs",
    featureIds: ["SRC-038"], inventory: files.featureInventory, implementation: files.documentationImplementation,
    verification: files.streamVerification, server: files.serverSh,
  }));
  assert(errors.length === 0, errors.join("; "));
});


check("실제 UI 체크리스트 정의 연결", () => {
  const ids = ["UI-072", "CLIENT-028", "SRC-038", "SAFE-119", "OPS-086"];
  const rows = files.manualUi.split(/\r?\n/).map(line => line.split("|").map(cell => cell.trim()))
    .filter(cells => cells[2]?.includes("`" + ids[0] + "`"));
  assert(rows.length === 1, "manual UI 대상 행 누락·중복: " + ids[0]);
  const row = rows[0];
  for (const id of ids) assertIncludes(row[2], "`" + id + "`", "manual UI 기능 ID");
  for (const route of ["/client/live", "/client/dashboard", "/client/events"]) assertIncludes(row[3], "`" + route + "`", "manual UI route");
  for (const token of ["Client-safe Source Status Digest card", schema]) assertIncludes(row[4], token, "manual UI 조작 계약");
  assertIncludes(row[5], "`verify-v330-client-safe-source-status-digest`", "manual UI 실행 명령");
});

check("server entrypoint and inventory verifiers include v3.3 Step 7 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v330_client_safe_source_status_digest.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  for (const id of ["UI-072", "CLIENT-028", "SRC-038", "SAFE-119", "OPS-086"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v330_client_safe_source_status_digest.mjs", "script inventory");
});

check("SAFE-119 canonical client source status digest boundary", () => {
  const digestBlock = extractCppFunctionBlock(files.server, "void AppendClientSafeSourceStatusDigestJson(");
  const safe119BoundaryObserved = digestBlock.includes("media-server.client.source-status-digest.v1") && digestBlock.includes("digest.source_status") && digestBlock.includes("digest.connection_status") && digestBlock.includes("digest.timeline_hint");
  const sourceOrEventWritePerformed = /\b(?:CreateSource|UpdateSource|DeleteSource|DispatchEventRecords|Write|Persist)[A-Za-z0-9_:]*\s*\(/.test(digestBlock);
  const rawMaterialExposed = digestBlock.includes("\\\"rawJsonIncluded\\\":true") || digestBlock.includes("\\\"rawEvidenceIncluded\\\":true");
  const rawLocatorExposed = digestBlock.includes("\\\"rawLocatorIncluded\\\":true");
  const sourceUrlExposed = digestBlock.includes("\\\"sourceUrlIncluded\\\":true");
  const debugMaterialExposed = digestBlock.includes("\\\"debugMaterialIncluded\\\":true");
  const credentialMaterialExposed = digestBlock.includes("\\\"credentialMaterialIncluded\\\":true");
  const operatorMaterialExposed = digestBlock.includes("\\\"operatorMaterialIncluded\\\":true");
  const actionControlExposed = digestBlock.includes("\\\"actionControlsIncluded\\\":true");
  const schemaMutationPerformed = /CreateVaRule|UpdateVaRule/.test(digestBlock) ||
    ["eventSchemaChanged", "webrtcDataChannelSchemaChanged", "sseMetadataSchemaChanged",
      "wsMetadataSchemaChanged", "rtspOrWebrtcMediaPathChanged"]
      .some((field) => digestBlock.includes(`\\\"${field}\\\":true`));
  assert(safe119BoundaryObserved && sourceOrEventWritePerformed === false && rawMaterialExposed === false && rawLocatorExposed === false && sourceUrlExposed === false && debugMaterialExposed === false && credentialMaterialExposed === false && operatorMaterialExposed === false && actionControlExposed === false && schemaMutationPerformed === false,
    "SAFE-119 media-server.client.source-status-digest.v1 /client/api/views/{id}/events sourceStatusDigest must be viewer-safe without source/event write, raw credential/operator material, or schema mutation");
});

const results = runChecks();
console.log("");
console.log("== v3.3.0 client-safe source status digest ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.3.0 (7)");
console.log("- route: /client/api/views/{id}/events");
console.log("- client routes: /client/live, /client/dashboard, /client/events");
console.log("- exposed fields: sourceStatus, connectionStatus, videoFrameStatus, metadataStatus, summaryText, severity, timelineHint, lastFrameAgeMs, metadataAgeMs");
console.log("- hidden fields: source URL, raw locator, raw JSON, debug material, credential material, operator material, rule/action controls");
console.log("- unchanged: source registry write, PublishedView write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, search/metrics");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function runChecks() {
  let pass = 0;
  let fail = 0;
  for (const item of checks) {
    try {
      item.fn();
      pass += 1;
      console.log(`[pass] ${item.name}`);
    } catch (error) {
      fail += 1;
      console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { pass, fail };
}

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
