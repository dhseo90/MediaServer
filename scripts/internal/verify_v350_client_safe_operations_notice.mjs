#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.5.0 Step 9 Client-safe Operations Notice 구현, UI, 문서, inventory 연결을 검증한다.
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
  printUsageAndExit(`v3.5.0 Client-safe Operations Notice verification

Usage:
  ./server.sh verify-v350-client-safe-operations-notice

Checks:
  - /client/api/views/{id}/events and dashboard payloads attach a PublishedView-scoped clientOperationsNotice
  - client live/dashboard/events render only maintenance/degraded/recovering/available plus timeline hint
  - notice hides source URL, raw locator, raw JSON, debug, credential, operator material, command plan details, incident details, and action controls
  - notice does not mutate SourceRegistry, PublishedView, EventRecord/Event POST, media, metadata schemas, Rule/Profile payload, or search/metrics
  - backlog, stream verification, release records, feature inventory, ops/client smoke, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v350-client-safe-operations-notice";
const schema = "media-server.client.v350-operations-notice.v1";
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
  serverSh: readText("server.sh"),
};

const checks = [];
const operationsNoticeProjectionBlock = extractCppFunctionBlock(files.server, "std::string ClientOperationsNoticeJson(");
const operationsNoticeRendererBlock = extractNamedFunctionBlock(files.clientScript, "renderClientOperationsNotice");

check("client API emits the v3.5 viewer-safe operations notice schema", () => {
  assert(operationsNoticeProjectionBlock.includes("AppendClientOperationsNoticeJson") && operationsNoticeProjectionBlock.includes("ClientOperationsNoticeJson"), "CLIENT-032 exact ClientOperationsNoticeJson projection missing for /client/api/views/{id}/events");
  for (const snippet of [
    "struct ClientOperationsNotice",
    "ClientOperationsNoticeFor",
    "AppendClientOperationsNoticeJson",
    "ClientOperationsNoticeJson",
    schema,
    "\\\"clientOperationsNotice\\\":",
    "\\\"viewerSafe\\\":true",
    "\\\"publishedViewScoped\\\":true",
    "\\\"operationsStatus\\\":",
    "\\\"timelineHint\\\":",
    "return \"maintenance\";",
    "return \"degraded\";",
    "return \"recovering\";",
    "return \"available\";",
    "\\\"sourceUrlIncluded\\\":false",
    "\\\"rawLocatorIncluded\\\":false",
    "\\\"rawJsonIncluded\\\":false",
    "\\\"debugMaterialIncluded\\\":false",
    "\\\"credentialMaterialIncluded\\\":false",
    "\\\"operatorMaterialIncluded\\\":false",
    "\\\"commandPlanDetailsIncluded\\\":false",
    "\\\"incidentDetailsIncluded\\\":false",
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
  ]) {
    assertIncludes(files.server, snippet, "v350 client-safe operations notice API");
  }
  for (const forbidden of [
    "/client/api/operations-notice",
    "media-server.ops.v350-operations-notice",
    "clientOperationsNotice.sourceUrl",
    "clientOperationsNotice.rawLocator",
    "clientOperationsNotice.rawJson",
    "clientOperationsNotice.debugMaterial",
    "clientOperationsNotice.credentialMaterial",
    "clientOperationsNotice.operatorNote",
    "clientOperationsNotice.commandPlanCandidates",
    "clientOperationsNotice.incidentDetails",
    "clientOperationsNotice.actionRoute",
  ]) {
    assert(!files.server.includes(forbidden), `client operations notice API must not include ${forbidden}`);
  }
});

check("client renderer shows only operations status and timeline hint", () => {
  const credentialMaterialExposed = ["passwordHash", "tokenHash", "credentialMaterial", "credentialRef"].some(marker => operationsNoticeRendererBlock.includes(marker));
  assert(credentialMaterialExposed === false, "CLIENT-032 credential material must remain redacted");
  assert(operationsNoticeProjectionBlock.includes("ClientOperationsNoticeJson") && operationsNoticeRendererBlock.includes("clientOperationsNotice") && operationsNoticeRendererBlock.includes("operationsStatus") && operationsNoticeRendererBlock.includes("timelineHint"), "CLIENT-032 exact ClientOperationsNoticeJson renderer readback missing for /client/api/views/{id}/events");
  for (const snippet of [
    "renderClientOperationsNotice",
    "clientOperationsNotice",
    "data-testid=\"client-operations-notice\"",
    "data-client-operations-notice=\"viewer-safe\"",
    "viewer-safe operations notice",
    schema,
    "operationsStatus",
    "timelineHint",
  ]) {
    assertIncludes(operationsNoticeRendererBlock, snippet, "client operations notice renderer");
    assertIncludes(extractNamedFunctionBlock(files.clientScript, "renderClientOperationsNotice"), "client-operations-notice", "UI-084 block-scoped canonical product state");
    assert(!["rawJson","rawLocator","rawEvidenceIncluded: true","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.clientScript, "renderClientOperationsNotice").includes(marker)), "UI-084 raw-material-redaction explicit absence oracle");
    assert(!["sourceUrl","sourceURL","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.clientScript, "renderClientOperationsNotice").includes(marker)), "UI-084 source-url-redaction explicit absence oracle");
    assert(!["debugCounters","Developer URL","debugMaterialExposed: true"].some(marker => extractNamedFunctionBlock(files.clientScript, "renderClientOperationsNotice").includes(marker)), "UI-084 debug-redaction explicit absence oracle");
    assertIncludes(files.server, "/client/live", "UI-084 canonical route obligation");
    assertIncludes(files.clientScript, "media-server.client.v350-operations-notice.v1", "UI-084 canonical schema obligation");
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
    "commandPlanCandidates",
    "stagedChangePlans",
    "drillRunLedgerEntries",
    "incidentDetails",
    "summaryText",
    "severity",
    "actionRoute",
    "actionControls",
  ]) {
    assert(!operationsNoticeRendererBlock.includes(`clientOperationsNotice.${forbidden}`), `client operations notice renderer must not read ${forbidden}`);
  }
});

check("operations notice styling and ops/client smoke track Step 9 markers", () => {
  for (const snippet of [
    ".client-operations-notice",
    ".client-operations-notice-list",
    ".client-operations-notice-item",
  ]) {
    assertIncludes(files.css, snippet, "client operations notice CSS");
  }
  for (const snippet of [
    "client-operations-notice",
    "clientOperationsNotice",
    "viewer-safe operations notice",
    schema,
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops/client UI smoke v3.5 Step 9 marker");
  }
});

check("roadmap records v3.5 Step 9 without overclaiming export or field evidence", () => {
  for (const snippet of [
    "| 9 | v3.5.0 (9) Client-safe Operations Notice | P1 | 완료 |",
    "## v3.5.0 Step 9 개발 기록",
    "ClientOperationsNoticeJson",
    "renderClientOperationsNotice",
    `\`./server.sh ${command}\``,
    "Operations Export Bundle and Handoff Map 완료 evidence가 아닙니다",
    "Field Evidence Intake 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.5 Step 9");
  }
});

check("stream verification exposes v3.5 Step 9 command and boundary", () => {
  for (const snippet of [
    `| v3.5.0 (9) | \`./server.sh ${command}\` | Client-safe Operations Notice.`,
    "/client/api/views/{id}/events",
    "clientOperationsNotice",
    "maintenance/degraded/recovering/available",
    "timeline hint",
    "source URL/raw locator/raw JSON/debug/credential/operator material",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.5 Step 9");
  }
});

check("feature inventory and release records map v3.5 Step 9", () => {
  for (const snippet of [
    `v3.5.0 (9) Client-safe Operations Notice | \`UI-084\`, \`CLIENT-032\`, \`SAFE-143\`, \`OPS-110\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-084 | V350 Step 9 Client-safe Operations Notice UI",
    "CLIENT-032 | V350 Step 9 client-safe operations notice API/UI",
    "SAFE-143 | V350 Step 9 client-safe operations notice boundary",
    "OPS-110 | V350 Step 9 Client-safe Operations Notice 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.5 Step 9");
  }
  for (const snippet of [
    "V350 Client-safe Operations Notice",
    `\`./server.sh ${command}\``,
    "v350 Step 9 RED client-safe operations notice gate",
    "v350 Step 9 client-safe operations notice final",
    "v350 Step 9 UI 풀테스트",
    "v350 Step 9 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.5 Step 9");
  }
});

check("server entrypoint and inventory verifiers include v3.5 Step 9 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v350_client_safe_operations_notice.mjs", "server.sh script dispatch");
  for (const snippet of [
    "validateImplementationManifest",
    "semantic.verifierAssertion.command",
    'kind: "stability"',
  ]) {
    assertIncludes(files.featureCoverageVerifier, snippet, "feature coverage verifier canonical command mapping");
  }
  for (const id of ["UI-084", "CLIENT-032", "SAFE-143", "OPS-110"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v350_client_safe_operations_notice.mjs", "script inventory");
});

check("SAFE-143 canonical client operations notice boundary", () => {
  const block = extractCppFunctionBlock(files.server, "void AppendClientOperationsNoticeJson(");
  const safe143BoundaryObserved = block.includes("media-server.client.v350-operations-notice.v1") && block.includes("notice.operations_status");
  const rawMaterialExposed = /\\\"(?:sourceUrl|rawLocator|rawJson|debugMaterial|credentialMaterial|operatorMaterial|commandPlanDetail|incidentDetail|actionControls)Included\\\":true/.test(block);
  const mutationPerformed = /\b(?:Write|Persist|Execute|UpdateSource|CreateVaRule|DispatchEventRecords)[A-Za-z0-9_:]*\s*\(/.test(block);
  assert(safe143BoundaryObserved && rawMaterialExposed === false && mutationPerformed === false,
    "SAFE-143 notice.operations_status viewer-safe PublishedView notice must hide incident command action raw credential operator material");
});

const results = runChecks();
console.log("");
console.log("== v3.5.0 client-safe operations notice ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.5.0 (9)");
console.log("- route: /client/api/views/{id}/events");
console.log("- client routes: /client/live, /client/dashboard, /client/events");
console.log("- exposed item fields: operationsStatus, timelineHint");
console.log("- allowed status values: maintenance, degraded, recovering, available");
console.log("- hidden fields: source URL, raw locator, raw JSON, debug material, credential material, operator material, command plan details, incident details, action controls");
console.log("- unchanged: source registry write, PublishedView write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, search/metrics");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
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

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}
