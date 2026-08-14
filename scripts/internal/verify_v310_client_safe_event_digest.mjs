#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.1.0 S04 Client-safe Event Digest 구현, 문서, inventory, verifier 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.1.0 Client-safe Event Digest verification

Usage:
  ./server.sh verify-v310-client-safe-event-digest

Checks:
  - /client/api/views/{id}/events emits a PublishedView-scoped eventDigest with only viewer-safe fields
  - client live/dashboard/events render the digest without source URL, raw evidence, debug material, provider material, feature provenance, encoded clip paths, rule editor, or action controls
  - ops/client static smoke tracks the client route markers
  - roadmap, stream verification, release records, feature inventory, manual UI checklist, and server dispatch are wired
  - PASS is limited to V310-S04 local/static evidence and does not imply UI 풀테스트, 30분/120분, scoped API, cleanup execution, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v310-client-safe-event-digest";
const files = {
  server: readWebRtcHttpServerBundle(readText),
  clientScript: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  uiSmoke: readText("scripts/internal/verify_ops_client_ui_smoke.mjs"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  manualUi: readText("docs/manual-ui-checklist.md"),
  serverSh: readText("server.sh"),
};
const eventDigestApiBlock = extractCppFunctionBlock(files.server, "void AppendClientSafeEventDigestJson(");
const eventDigestProjectionBlock = extractCppFunctionBlock(files.server, "void AppendClientEventSummaryJson(");
const eventDigestRendererBlock = extractNamedFunctionBlock(files.clientScript, "renderClientSafeEventDigest");
const checks = [];

check("client events API emits V310 viewer-safe event digest schema", () => {
  assert(eventDigestApiBlock.includes("media-server.client.event-digest.v1") && eventDigestProjectionBlock.includes("eventDigest"), "CLIENT-025 exact eventDigest API projection missing");
  for (const snippet of [
    "AppendClientSafeEventDigestJson",
    "media-server.client.event-digest.v1",
    "\\\"eventDigest\\\":",
    "\\\"viewerSafe\\\":true",
    "\\\"publishedViewScoped\\\":true",
    "\\\"sourceUrlIncluded\\\":false",
    "\\\"rawEvidenceIncluded\\\":false",
    "\\\"debugMaterialIncluded\\\":false",
    "\\\"providerMaterialIncluded\\\":false",
    "\\\"featureProvenanceIncluded\\\":false",
    "\\\"internalEvidenceIncluded\\\":false",
    "\\\"encodedClipPathIncluded\\\":false",
    "\\\"ruleEditorIncluded\\\":false",
    "\\\"actionControlsIncluded\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"eventSchemaChanged\\\":false",
    "\\\"mediaPathChanged\\\":false",
    "\\\"digestItems\\\":",
    "\\\"summaryText\\\":",
    "\\\"eventType\\\":",
    "\\\"status\\\":",
    "\\\"severity\\\":",
    "\\\"timelineHint\\\":",
    "\\\"time\\\":",
  ]) {
    assertIncludes(files.server, snippet, "client-safe event digest API");
  }
  for (const forbidden of [
    "/client/api/events/digest",
    "media-server.ops.client-event-digest",
    "eventDigest.sourceUrl",
    "eventDigest.rawEvidence",
    "eventDigest.debugMaterial",
    "eventDigest.providerMaterial",
    "eventDigest.featureProvenance",
    "eventDigest.encodedClipManifestPath",
    "eventDigest.encodedClipMediaPath",
  ]) {
    assert(!files.server.includes(forbidden), `client event digest API must not include ${forbidden}`);
  }
});

check("client renderer shows event digest without raw/source/debug/provider/provenance material", () => {
  const rawMaterialExposed = ["rawEvidence", "rawJson", "rawLocator"].some(marker => eventDigestRendererBlock.includes(marker));
  const debugMaterialExposed = ["debugCounters", "debugMaterial"].some(marker => eventDigestRendererBlock.includes(marker));
  const providerMaterialExposed = ["providerPrompt", "providerResponse", "providerMaterial"].some(marker => eventDigestRendererBlock.includes(marker));
  assert(rawMaterialExposed === false, "CLIENT-025 raw material must remain redacted");
  assert(debugMaterialExposed === false, "CLIENT-025 debug material must remain redacted");
  assert(providerMaterialExposed === false, "CLIENT-025 provider material must remain absent");
  assert(eventDigestRendererBlock.includes("eventDigest") && eventDigestRendererBlock.includes("summaryText") && eventDigestRendererBlock.includes("eventType") && eventDigestRendererBlock.includes("timelineHint"), "CLIENT-025 exact eventDigest renderer readback missing");
  for (const snippet of [
    "renderClientSafeEventDigest",
    "eventDigest",
    "data-testid=\"client-safe-event-digest\"",
    "data-client-event-digest=\"viewer-safe\"",
    "viewer-safe event digest",
    "media-server.client.event-digest.v1",
    "digestItems",
    "timelineHint",
  ]) {
    assertIncludes(eventDigestRendererBlock, snippet, "client event digest renderer");
  }
  for (const forbidden of [
    "sourceUrl",
    "developerUrl",
    "rawJson",
    "debugCounters",
    "providerPrompt",
    "providerResponse",
    "featureProvenance",
    "internalEvidence",
    "encodedClipManifestPath",
    "encodedClipMediaPath",
    "ruleEditor",
    "actionRoute",
    "actionControls",
  ]) {
    assert(!eventDigestRendererBlock.includes(`eventDigest.${forbidden}`), `client event digest renderer must not read ${forbidden}`);
  }
});

check("client digest styling and ops/client smoke track V310 event digest markers", () => {
  for (const snippet of [
    ".client-safe-event-digest",
    ".client-safe-digest-list",
    ".client-safe-digest-item",
  ]) {
    assertIncludes(files.css, snippet, "client event digest CSS");
  }
  for (const snippet of [
    "client-safe-event-digest",
    "eventDigest",
    "viewer-safe event digest",
    "media-server.client.event-digest.v1",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops/client UI smoke V310-S04 marker");
  }
});

check("docs and roadmap expose V310-S04 scope without overclaim", () => {
  for (const snippet of [
    "V310-S04` Client-safe Event Digest 완료",
    "| 4 | V310-S04 | P1 | 완료 | Client-safe Event Digest |",
    "media-server.client.event-digest.v1",
    "viewer-safe summaryText/eventType/status/severity/timelineHint/time",
    "UI 풀테스트 직접 조작, 30분/120분, scoped API, cleanup execution, published metadata evidence가 아님",
    "## v3.1.0 S04 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog V310-S04");
  }
  for (const snippet of [
    "| V310-S04 | `./server.sh verify-v310-client-safe-event-digest` |",
    "viewer-safe client event digest",
    "source/raw/debug/provider/feature provenance/encoded clip path",
    "UI 풀테스트 직접 조작, 30분/120분, scoped API, cleanup execution",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification V310-S04");
  }
});

check("feature inventory, manual UI checklist, and release records map V310-S04", () => {
  for (const snippet of [
    "V310-S04 Client-safe Event Digest | `CLIENT-025`, `SAFE-096` | `verify-v310-client-safe-event-digest`, `verify-ops-client-ui`",
    "CLIENT-025 | V310-S04 Client-safe event digest API/UI",
    "SAFE-096 | V310-S04 client-safe event digest boundary",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory V310-S04");
  }
  for (const snippet of [
    "| V310-S04 Client-safe Event Digest | `CLIENT-025`, `SAFE-096` | `/client/live`, `/client/dashboard`, `/client/events` |",
    "Client-safe Event Digest card",
    "media-server.client.event-digest.v1",
  ]) {
    assertIncludes(files.manualUi, snippet, "manual UI V310-S04");
  }
  for (const snippet of [
    "V310 Client-safe Event Digest",
    "`./server.sh verify-v310-client-safe-event-digest`",
    "v310 S04 RED client-safe event digest gate",
    "v310 S04 client-safe event digest final",
    "v310 S04 UI 풀테스트",
    "v310 S04 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records V310-S04");
  }
});

check("server entrypoint and inventory verifiers include V310-S04 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v310_client_safe_event_digest.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.projectInventoryVerifier, "CLIENT-025", "project inventory verifier CLIENT-025");
  assertIncludes(files.projectInventoryVerifier, "SAFE-096", "project inventory verifier SAFE-096");
  assertIncludes(files.scriptInventory, "verify_v310_client_safe_event_digest.mjs", "script inventory");
});

check("SAFE-096 canonical client event digest boundary", () => {
  const rawMaterialExposed = ["rawEvidence.value", "rawEvidence.items", "rawJson", "rawLocator"].some(marker => eventDigestRendererBlock.includes(marker));
  const sourceUrlExposed = ["sourceUrl", "sourceURL", "rtsp://"].some(marker => eventDigestRendererBlock.includes(marker));
  const debugMaterialExposed = ["debugCounters", "debugMaterial"].some(marker => eventDigestRendererBlock.includes(marker));
  const safe096BoundaryObserved = eventDigestApiBlock.includes("media-server.client.event-digest.v1") && eventDigestProjectionBlock.includes("eventDigest") && files.serverSh.includes("verify-v310-client-safe-event-digest");
  assert(safe096BoundaryObserved && rawMaterialExposed === false && sourceUrlExposed === false && debugMaterialExposed === false,
    "verify-v310-client-safe-event-digest media-server.client.event-digest.v1 /client/api/views/{id}/events raw/sourceUrl/debug WebRTC/SSE/RTSP material must remain absent");
});

const results = runChecks();
console.log("");
console.log("== v3.1.0 client-safe event digest summary ==");
console.log("- schema: media-server.client.event-digest.v1");
console.log("- step: V310-S04");
console.log("- route: /client/api/views/{id}/events");
console.log("- client routes: /client/live, /client/dashboard, /client/events");
console.log("- exposed fields: summaryText, eventType, status, severity, timelineHint, time");
console.log("- hidden fields: source URL, raw evidence, debug material, provider material, feature provenance, encoded clip paths, rule/action controls");
console.log("- scopedIntegratorApi: not-run-by-this-command");
console.log("- cleanupExecution: not-run-by-this-command");
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
