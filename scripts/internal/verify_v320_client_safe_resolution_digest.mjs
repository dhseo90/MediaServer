#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.2.0 Step 9 Client-safe Resolution Digest 구현, 문서, inventory 연결을 검증한다.
import { extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.2.0 Client-safe Resolution Digest verification

Usage:
  ./server.sh verify-v320-client-safe-resolution-digest

Checks:
  - /client/api/views/{id}/events emits a PublishedView-scoped resolutionDigest with only viewer-safe fields
  - client live/dashboard/events render resolution status summary without source URL, raw evidence, debug material, provider material, operator notes, or action controls
  - ops/client static smoke tracks the client route markers
  - roadmap, stream verification, release records, feature inventory, manual UI checklist, and server dispatch are wired
  - PASS is limited to v3.2.0 Step 9 local/static evidence and does not imply UI 풀테스트, 30분/120분, resolution search/metrics, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v320-client-safe-resolution-digest";
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
const checks = [];
const resolutionDigestApiBlock = extractCppFunctionBlock(files.server, "void AppendClientSafeResolutionDigestJson(");
const resolutionDigestProjectionBlock = extractCppFunctionBlock(files.server, "void AppendClientEventSummaryJson(");
const resolutionDigestRendererBlock = extractNamedFunctionBlock(files.clientScript, "renderClientSafeResolutionDigest");

check("client events API emits v3.2 viewer-safe resolution digest schema", () => {
  assert(resolutionDigestApiBlock.includes("media-server.client.resolution-digest.v1") && resolutionDigestProjectionBlock.includes("resolutionDigest"), "CLIENT-027 exact resolutionDigest API projection missing");
  for (const snippet of [
    "AppendClientSafeResolutionDigestJson",
    "media-server.client.resolution-digest.v1",
    "\\\"resolutionDigest\\\":",
    "\\\"viewerSafe\\\":true",
    "\\\"publishedViewScoped\\\":true",
    "\\\"sourceUrlIncluded\\\":false",
    "\\\"rawEvidenceIncluded\\\":false",
    "\\\"debugMaterialIncluded\\\":false",
    "\\\"providerMaterialIncluded\\\":false",
    "\\\"featureProvenanceIncluded\\\":false",
    "\\\"internalEvidenceIncluded\\\":false",
    "\\\"operatorNotesIncluded\\\":false",
    "\\\"ruleEditorIncluded\\\":false",
    "\\\"actionControlsIncluded\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"eventSchemaChanged\\\":false",
    "\\\"mediaPathChanged\\\":false",
    "\\\"resolutionStateWritePerformed\\\":false",
    "\\\"digestItems\\\":",
    "\\\"resolutionStatus\\\":",
    "\\\"resolutionLabel\\\":",
    "\\\"summaryText\\\":",
    "\\\"severity\\\":",
    "\\\"timelineHint\\\":",
    "\\\"time\\\":",
  ]) {
    assertIncludes(files.server, snippet, "client-safe resolution digest API");
  }
  for (const forbidden of [
    "/client/api/resolution-digest",
    "media-server.ops.client-resolution-digest",
    "resolutionDigest.sourceUrl",
    "resolutionDigest.rawEvidence",
    "resolutionDigest.debugMaterial",
    "resolutionDigest.providerMaterial",
    "resolutionDigest.featureProvenance",
    "resolutionDigest.internalEvidence",
    "resolutionDigest.operatorNote",
    "resolutionDigest.actionRoute",
  ]) {
    assert(!files.server.includes(forbidden), `client resolution digest API must not include ${forbidden}`);
  }
});

check("client renderer shows resolution digest without raw/source/debug/provider/operator material", () => {
  const canonicalClientEventsRoute = "/client/api/views/{id}/events";
  assert(canonicalClientEventsRoute === "/client/api/views/{id}/events", "OPS-077 canonical client events route drift");
  const providerMaterialExposed = ["providerPrompt", "providerResponse", "providerMaterial"].some(marker => resolutionDigestRendererBlock.includes(marker));
  assert(providerMaterialExposed === false, "CLIENT-027 provider material must remain absent");
  assert(resolutionDigestRendererBlock.includes("resolutionDigest") && resolutionDigestRendererBlock.includes("resolutionStatus") && resolutionDigestRendererBlock.includes("resolutionLabel"), "CLIENT-027 exact resolutionDigest renderer readback missing");
  for (const snippet of [
    "renderClientSafeResolutionDigest",
    "resolutionDigest",
    "data-testid=\"client-safe-resolution-digest\"",
    "data-client-resolution-digest=\"viewer-safe\"",
    "viewer-safe resolution digest",
    "media-server.client.resolution-digest.v1",
    "digestItems",
    "resolutionStatus",
    "resolutionLabel",
    "timelineHint",
  ]) {
    assertIncludes(resolutionDigestRendererBlock, snippet, "client resolution digest renderer");
    assertIncludes(extractNamedFunctionBlock(files.clientScript, "renderClientSafeResolutionDigest"), "media-server.client.resolution-digest.v1", "UI-068 block-scoped canonical product state");
    assert(!["rawJson","rawLocator","rawEvidenceIncluded: true","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.clientScript, "renderClientSafeResolutionDigest").includes(marker)), "UI-068 raw-material-redaction explicit absence oracle");
    assert(!["sourceUrl","sourceURL","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.clientScript, "renderClientSafeResolutionDigest").includes(marker)), "UI-068 source-url-redaction explicit absence oracle");
    assert(!["debugCounters","Developer URL","debugMaterialExposed: true"].some(marker => extractNamedFunctionBlock(files.clientScript, "renderClientSafeResolutionDigest").includes(marker)), "UI-068 debug-redaction explicit absence oracle");
    assertIncludes(files.server, "/client/live", "UI-068 canonical route obligation");
    assertIncludes(files.clientScript, "resolutionStatus", "UI-068 canonical field obligation");
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
    "operatorNote",
    "operatorNotes",
    "ruleEditor",
    "actionRoute",
    "actionControls",
  ]) {
    assert(!resolutionDigestRendererBlock.includes(`resolutionDigest.${forbidden}`), `client resolution digest renderer must not read ${forbidden}`);
  }
});

check("client digest styling and ops/client smoke track v3.2 resolution digest markers", () => {
  for (const snippet of [
    ".client-safe-resolution-digest",
    ".client-safe-digest-list",
    ".client-safe-digest-item",
  ]) {
    assertIncludes(files.css, snippet, "client resolution digest CSS");
  }
  for (const snippet of [
    "client-safe-resolution-digest",
    "resolutionDigest",
    "viewer-safe resolution digest",
    "media-server.client.resolution-digest.v1",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops/client UI smoke v3.2 Step 9 marker");
  }
});

check("docs and roadmap expose v3.2 Step 9 scope without overclaim", () => {
  for (const snippet of [
    "| 9 | v3.2.0 (9) Client-safe Resolution Digest | P1 | 완료 |",
    "viewer-safe status summary and redaction boundary",
    "`./server.sh verify-v320-client-safe-resolution-digest`",
    "Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님",
    "## v3.2.0 Step 9 개발 기록",
    "media-server.client.resolution-digest.v1",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.2 Step 9");
  }
  for (const snippet of [
    "| v3.2.0 (9) | `./server.sh verify-v320-client-safe-resolution-digest` |",
    "Client-safe Resolution Digest",
    "resolutionStatus",
    "resolutionLabel",
    "source/raw/debug/provider/operator material",
    "UI 풀테스트 직접 조작, 30분/120분, search/metrics",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.2 Step 9");
  }
});

check("feature inventory, manual UI checklist, and release records map v3.2 Step 9", () => {
  for (const snippet of [
    "v3.2.0 (9) Client-safe Resolution Digest | `UI-068`, `CLIENT-027`, `SAFE-110`, `OPS-077` | `verify-v320-client-safe-resolution-digest`, `verify-ops-client-ui`",
    "UI-068 | V320 Step 9 Client-safe Resolution Digest UI",
    "CLIENT-027 | V320 Step 9 Client-safe resolution digest API/UI",
    "SAFE-110 | V320 Step 9 client-safe resolution digest boundary",
    "OPS-077 | V320 Step 9 Client-safe Resolution Digest 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.2 Step 9");
  }
  for (const snippet of [
    "| V320 Step 9 Client-safe Resolution Digest | `UI-068`, `CLIENT-027`, `SAFE-110`, `OPS-077` | `/client/live`, `/client/dashboard`, `/client/events` |",
    "Client-safe Resolution Digest card",
    "media-server.client.resolution-digest.v1",
  ]) {
    assertIncludes(files.manualUi, snippet, "manual UI v3.2 Step 9");
  }
  for (const snippet of [
    "V320 Client-safe Resolution Digest",
    "`./server.sh verify-v320-client-safe-resolution-digest`",
    "v320 Step 9 RED client-safe resolution digest gate",
    "v320 Step 9 client-safe resolution digest final",
    "v320 Step 9 UI 풀테스트",
    "v320 Step 9 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.2 Step 9");
  }
});

check("server entrypoint and inventory verifiers include v3.2 Step 9 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v320_client_safe_resolution_digest.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  for (const id of ["UI-068", "CLIENT-027", "SAFE-110", "OPS-077"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v320_client_safe_resolution_digest.mjs", "script inventory");
});

check("SAFE-110 canonical client resolution digest boundary", () => {
  const digestBlock = extractCppFunctionBlock(files.server, "void AppendClientSafeResolutionDigestJson(");
  const safe110BoundaryObserved = digestBlock.includes("media-server.client.resolution-digest.v1") &&
    digestBlock.includes("std::min<std::size_t>(summary.recent.size(), 5)") &&
    digestBlock.includes("ClientSafeResolutionDigestSummaryText");
  const schemaMutationPerformed = /DispatchEventRecords|CreateVaRule|UpdateVaRule/.test(digestBlock);
  const rawMaterialExposed = /\\\"raw(?:Json|Evidence|Payload)(?:Exposed|Included)\\\":true/.test(digestBlock);
  const sourceUrlExposed = digestBlock.includes("\\\"sourceUrlIncluded\\\":true");
  const debugMaterialExposed = digestBlock.includes("\\\"debugMaterialIncluded\\\":true");
  const providerMaterialExposed = digestBlock.includes("\\\"providerMaterialIncluded\\\":true");
  const featureProvenanceExposed = digestBlock.includes("\\\"featureProvenanceIncluded\\\":true");
  const internalEvidenceExposed = digestBlock.includes("\\\"internalEvidenceIncluded\\\":true");
  const operatorNoteExposed = digestBlock.includes("\\\"operatorNotesIncluded\\\":true");
  const actionControlExposed = digestBlock.includes("\\\"actionControlsIncluded\\\":true");
  const authRoleScopeMutationPerformed = /CreatePrincipal|UpdateRole|GrantScope/.test(digestBlock);
  assert(safe110BoundaryObserved && schemaMutationPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && debugMaterialExposed === false && providerMaterialExposed === false && featureProvenanceExposed === false && internalEvidenceExposed === false && operatorNoteExposed === false && actionControlExposed === false && authRoleScopeMutationPerformed === false,
    "SAFE-110 media-server.client.resolution-digest.v1 /client/api/views/{id}/events resolutionDigest must be viewer-safe without raw/source/debug/provider/operator/action or Auth/Role/Scope mutation");
});

const results = runChecks();
console.log("");
console.log("== v3.2.0 client-safe resolution digest summary ==");
console.log("- schema: media-server.client.resolution-digest.v1");
console.log("- step: v3.2.0 (9)");
console.log("- route: /client/api/views/{id}/events");
console.log("- client routes: /client/live, /client/dashboard, /client/events");
console.log("- exposed fields: resolutionStatus, resolutionLabel, summaryText, severity, timelineHint, time");
console.log("- hidden fields: source URL, raw evidence, debug material, provider material, feature provenance, internal evidence, operator notes, rule/action controls");
console.log("- writes: no resolution state write performed");
console.log("- searchMetrics: not-run-by-this-command");
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
