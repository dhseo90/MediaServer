#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.4.0 Step 8 client-safe maintenance digest 구현과 문서 연결을 검증한다.
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
  printUsageAndExit(`v3.4.0 Client-safe Maintenance Digest verification

Usage:
  ./server.sh verify-v340-client-safe-maintenance-digest

Checks:
  - /client/api/views/{id}/events and dashboard payloads attach a PublishedView-scoped maintenanceDigest
  - client live/dashboard/events render only viewer-safe maintenance/recovering/unavailable summaries
  - digest hides source URL, raw locator, raw JSON, debug, credential, operator note, audit, dry-run, and recovery action material
  - digest does not mutate SourceRegistry, PublishedView, EventRecord/Event POST, media, metadata schemas, Rule/Profile payload, or search/metrics
  - backlog, stream verification, release records, feature inventory, manual UI checklist, ops/client smoke, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v340-client-safe-maintenance-digest";
const schema = "media-server.client.v340-maintenance-digest.v1";
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
const maintenanceDigestApiBlock = extractCppFunctionBlock(files.server, "void AppendClientSafeMaintenanceDigestJson(");
const maintenanceDigestProjectionBlock = extractCppFunctionBlock(files.server, "std::string ClientMaintenanceDigestJson(");
const maintenanceDigestRendererBlock = extractNamedFunctionBlock(files.clientScript, "renderClientSafeMaintenanceDigest");

check("client API emits the v3.4 viewer-safe maintenance digest schema", () => {
  assert(maintenanceDigestApiBlock.includes("media-server.client.v340-maintenance-digest.v1") && maintenanceDigestProjectionBlock.includes("AppendClientSafeMaintenanceDigestJson"), "CLIENT-029 exact AppendClientSafeMaintenanceDigestJson projection missing for /client/api/views/{id}/events");
  for (const snippet of [
    "struct ClientMaintenanceDigest",
    "ClientMaintenanceDigestFor",
    "AppendClientSafeMaintenanceDigestJson",
    "ClientMaintenanceDigestJson",
    schema,
    "\\\"maintenanceDigest\\\":",
    "\\\"viewerSafe\\\":true",
    "\\\"publishedViewScoped\\\":true",
    "\\\"sourceUrlIncluded\\\":false",
    "\\\"rawLocatorIncluded\\\":false",
    "\\\"rawJsonIncluded\\\":false",
    "\\\"debugMaterialIncluded\\\":false",
    "\\\"credentialMaterialIncluded\\\":false",
    "\\\"operatorMaterialIncluded\\\":false",
    "\\\"opsAuditLinkageIncluded\\\":false",
    "\\\"dryRunResultIncluded\\\":false",
    "\\\"approvalChecklistIncluded\\\":false",
    "\\\"recoveryActionIncluded\\\":false",
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
    "\\\"maintenanceState\\\":",
    "return \"maintenance\";",
    "return \"recovering\";",
    "return \"unavailable\";",
    "\\\"summaryText\\\":",
    "\\\"severity\\\":",
    "\\\"timelineHint\\\":",
  ]) {
    assertIncludes(files.server, snippet, "client-safe maintenance digest API");
  }
  for (const forbidden of [
    "/client/api/maintenance-digest",
    "media-server.ops.v340-maintenance-digest",
    "maintenanceDigest.sourceUrl",
    "maintenanceDigest.rawLocator",
    "maintenanceDigest.rawJson",
    "maintenanceDigest.debugMaterial",
    "maintenanceDigest.credentialMaterial",
    "maintenanceDigest.operatorNote",
    "maintenanceDigest.opsAuditLinkage",
    "maintenanceDigest.dryRunResult",
    "maintenanceDigest.recoveryAction",
  ]) {
    assert(!files.server.includes(forbidden), `client maintenance digest API must not include ${forbidden}`);
  }
});

check("client renderer shows maintenance digest without raw/source/debug/operator material", () => {
  assert(maintenanceDigestProjectionBlock.includes("AppendClientSafeMaintenanceDigestJson") && maintenanceDigestRendererBlock.includes("maintenanceDigest") && maintenanceDigestRendererBlock.includes("maintenanceState") && maintenanceDigestRendererBlock.includes("timelineHint"), "CLIENT-029 exact AppendClientSafeMaintenanceDigestJson renderer readback missing for /client/api/views/{id}/events");
  for (const snippet of [
    "renderClientSafeMaintenanceDigest",
    "maintenanceDigest",
    "data-testid=\"client-safe-maintenance-digest\"",
    "data-client-maintenance-digest=\"viewer-safe\"",
    "viewer-safe maintenance digest",
    schema,
    "digestItems",
    "maintenanceState",
    "summaryText",
    "severity",
    "timelineHint",
  ]) {
    assertIncludes(maintenanceDigestRendererBlock, snippet, "client maintenance digest renderer");
    assertIncludes(extractNamedFunctionBlock(files.clientScript, "renderClientSafeMaintenanceDigest"), "client-safe-maintenance-digest", "UI-077 block-scoped canonical product state");
    assert(!["rawJson","rawLocator","rawEvidenceIncluded: true","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.clientScript, "renderClientSafeMaintenanceDigest").includes(marker)), "UI-077 raw-material-redaction explicit absence oracle");
    assert(!["sourceUrl","sourceURL","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.clientScript, "renderClientSafeMaintenanceDigest").includes(marker)), "UI-077 source-url-redaction explicit absence oracle");
    assert(!["passwordHash","tokenHash","Authorization:","credentialValue"].some(marker => extractNamedFunctionBlock(files.clientScript, "renderClientSafeMaintenanceDigest").includes(marker)), "UI-077 credential-redaction explicit absence oracle");
    assert(!["debugCounters","Developer URL","debugMaterialExposed: true"].some(marker => extractNamedFunctionBlock(files.clientScript, "renderClientSafeMaintenanceDigest").includes(marker)), "UI-077 debug-redaction explicit absence oracle");
    assertIncludes(files.server, "/client/live", "UI-077 canonical route obligation");
    assertIncludes(files.clientScript, "media-server.client.v340-maintenance-digest.v1", "UI-077 canonical schema obligation");
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
    "opsAuditLinkage",
    "dryRunResult",
    "approvalGatedRecoveryChecklist",
    "recoveryAction",
    "actionControls",
  ]) {
    assert(!maintenanceDigestRendererBlock.includes(`maintenanceDigest.${forbidden}`), `client maintenance digest renderer must not read ${forbidden}`);
  }
});

check("maintenance digest styling and ops/client smoke track Step 8 markers", () => {
  for (const snippet of [
    ".client-safe-maintenance-digest",
    ".client-safe-digest-list",
    ".client-safe-digest-item",
  ]) {
    assertIncludes(files.css, snippet, "client maintenance digest CSS");
  }
  for (const snippet of [
    "client-safe-maintenance-digest",
    "maintenanceDigest",
    "viewer-safe maintenance digest",
    schema,
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops/client UI smoke v3.4 Step 8 marker");
  }
});

check("roadmap records v3.4 Step 8 without overclaiming export or field bridge", () => {
  for (const snippet of [
    "| 8 | v3.4.0 (8) Client-safe Maintenance Digest | P1 | 완료 |",
    "## v3.4.0 Step 8 개발 기록",
    "ClientMaintenanceDigestJson",
    "renderClientSafeMaintenanceDigest",
    `\`./server.sh ${command}\``,
    "Drill Evidence Export and Cleanup Manifest 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.4 Step 8");
  }
});

check("stream verification exposes v3.4 Step 8 command and boundary", () => {
  for (const snippet of [
    `| v3.4.0 (8) | \`./server.sh ${command}\` | Client-safe Maintenance Digest.`,
    "/client/api/views/{id}/events",
    "maintenance/recovering/unavailable",
    "source URL/raw locator/raw JSON/debug/credential material",
    "operator note/Ops audit/dry-run/recovery action",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.4 Step 8");
  }
});

check("feature inventory, manual UI, and release records map v3.4 Step 8", () => {
  for (const snippet of [
    `v3.4.0 (8) Client-safe Maintenance Digest | \`UI-077\`, \`CLIENT-029\`, \`SAFE-131\`, \`OPS-098\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-077 | V340 Step 8 Client-safe Maintenance Digest UI",
    "CLIENT-029 | V340 Step 8 client-safe maintenance digest API/UI",
    "SAFE-131 | V340 Step 8 client-safe maintenance digest boundary",
    "OPS-098 | V340 Step 8 Client-safe Maintenance Digest 게이트",
    "`UI-001`~`UI-115`",
    "`CLIENT-001`~`CLIENT-042`",
    "`SAFE-001`~`SAFE-216`",
    "`OPS-035`~`OPS-184`",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.4 Step 8");
  }
  for (const snippet of [
    "| V340 Step 8 Client-safe Maintenance Digest | `UI-077`, `CLIENT-029`, `SAFE-131`, `OPS-098` | `/client/live`, `/client/dashboard`, `/client/events` |",
    "Client-safe Maintenance Digest",
    schema,
  ]) {
    assertIncludes(files.manualUi, snippet, "manual UI v3.4 Step 8");
  }
  for (const snippet of [
    "V340 Client-safe Maintenance Digest",
    `\`./server.sh ${command}\``,
    "v340 Step 8 RED client-safe maintenance digest gate",
    "v340 Step 8 client-safe maintenance digest final",
    "v340 Step 8 UI 풀테스트",
    "v340 Step 8 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.4 Step 8");
  }
});

check("server entrypoint and inventory verifiers include v3.4 Step 8 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v340_client_safe_maintenance_digest.mjs", "server.sh script dispatch");
  for (const snippet of [
    "validateImplementationManifest",
    "semantic.verifierAssertion.command",
    'kind: "stability"',
  ]) {
    assertIncludes(files.featureCoverageVerifier, snippet, "feature coverage verifier canonical command mapping");
  }
  for (const id of ["UI-077", "CLIENT-029", "SAFE-131", "OPS-098"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.projectInventoryVerifier, "`UI-001`~`UI-115`", "project inventory UI range");
  assertIncludes(files.projectInventoryVerifier, "`CLIENT-001`~`CLIENT-042`", "project inventory CLIENT range");
  assertIncludes(files.projectInventoryVerifier, "`SAFE-001`~`SAFE-216`", "project inventory SAFE range");
  assertIncludes(files.projectInventoryVerifier, "`OPS-035`~`OPS-184`", "project inventory OPS range");
  assertIncludes(files.scriptInventory, "verify_v340_client_safe_maintenance_digest.mjs", "script inventory");
});

check("SAFE-131 canonical client maintenance digest boundary", () => {
  const block = extractCppFunctionBlock(files.server, "void AppendClientSafeMaintenanceDigestJson(");
  const safe131BoundaryObserved = block.includes("media-server.client.v340-maintenance-digest.v1") && block.includes("digest.maintenance_state");
  const rawMaterialExposed = /\\\"(?:sourceUrl|rawLocator|rawJson|debugMaterial|credentialMaterial|operatorNote|opsAudit|dryRun|recoveryAction)Included\\\":true/.test(block);
  const mutationPerformed = /\b(?:Write|Persist|DispatchEventRecords|UpdateSource|CreateVaRule)[A-Za-z0-9_:]*\s*\(/.test(block);
  assert(safe131BoundaryObserved && rawMaterialExposed === false && mutationPerformed === false,
    "SAFE-131 media-server.client.v340-maintenance-digest.v1 digest.maintenance_state must remain viewer-safe and mutation-free");
});

const results = runChecks();
console.log("");
console.log("== v3.4.0 client-safe maintenance digest ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.4.0 (8)");
console.log("- route: /client/api/views/{id}/events");
console.log("- client routes: /client/live, /client/dashboard, /client/events");
console.log("- exposed fields: maintenanceState, summaryText, severity, timelineHint");
console.log("- hidden fields: source URL, raw locator, raw JSON, debug material, credential material, operator note, Ops audit, dry-run result, recovery action");
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

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
