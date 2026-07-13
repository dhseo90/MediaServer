#!/usr/bin/env node
// 파일 용도: v3.4.0 Step 10 field bridge condition gate 연결을 검증한다.
import { exactBooleanFlagValue, extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.4.0 Field Bridge Condition Gates verification

Usage:
  ./server.sh verify-v340-field-bridge-condition-gates

Checks:
  - Ops-only route records ONVIF real device, external WHEP/TURN, and real cloud/VLM provider field smoke gates
  - Gate records require endpoint, credential, and operator approval before field smoke can pass
  - Source-only/local verifier PASS is explicitly not accepted as field bridge PASS
  - /ops/sources renders the gates read-only without endpoint URLs, credentials, raw locator, raw JSON, debug, or provider material
  - SourceRegistry, PublishedView, EventRecord/Event POST, media, metadata schemas, Rule/Profile payload, search/metrics, automatic recovery, and real field probes are not mutated/executed
  - backlog, stream verification, release records, feature inventory, manual UI checklist, ops/client smoke, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v340-field-bridge-condition-gates";
const schema = "media-server.ops.v340-field-bridge-condition-gates.v1";
const route = "/ops/api/source-registry/field-bridge-condition-gates";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  opsSourcesScript: readText("src/ingress/product_ui_ops_sources_script.cpp"),
  clientScript: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  uiSmoke: readText("scripts/internal/verify_ops_client_ui_smoke.mjs"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  manualUi: readText("docs/manual-ui-checklist.md"),
  serverSh: readText("server.sh"),
};

const checks = [];

check("MEDIA-022 exact product field gate preserves external WHEP/TURN no-execution", () => {
  const productBlock = extractCppFunctionBlock(files.server, "std::string OpsV340FieldBridgeConditionGatesJson(");
  assert(productBlock.includes("externalWhepTurnContacted") && productBlock.includes("AppendV340FieldBridgeConditionGateSummaryJson") && exactBooleanFlagValue(productBlock, "credentialMaterialIncluded") === false && productBlock.includes("rtspOrWebrtcMediaPathChanged"), "MEDIA-022 exact external WHEP/TURN FieldBridgeConditionGateSummary credentialMaterialIncluded=false missing");
});

check("Ops API records field bridge gates as conditional not-run field smoke", () => {
  for (const snippet of [
    "struct OpsV340FieldBridgeConditionGate",
    "struct OpsV340FieldBridgeConditionGateSummary",
    "BuildV340FieldBridgeConditionGates",
    "BuildV340FieldBridgeConditionGateSummary",
    "AppendV340FieldBridgeConditionGateJson",
    "AppendV340FieldBridgeConditionGateSummaryJson",
    "OpsV340FieldBridgeConditionGatesJson",
    schema,
    route,
    "\\\"fieldBridgeConditionGateSummary\\\":",
    "\\\"fieldBridgeConditionGates\\\":",
    "\\\"sourceOnlyPassPolicy\\\":",
    "\\\"fieldSmokeConditions\\\":",
    "\"onvif-real-device\"",
    "\"external-whep-turn\"",
    "\"real-cloud-vlm-provider\"",
    "\\\"fieldSmokeStatus\\\":",
    "\"field-smoke-needed\"",
    "\\\"executionStatus\\\":",
    "\"not-run\"",
    "\\\"endpointRequired\\\":",
    "\\\"credentialRequired\\\":",
    "\\\"operatorApprovalRequired\\\":",
    "\\\"sourceOnlyPassAccepted\\\":false",
    "\\\"localVerifierPassSubstitutesFieldSmoke\\\":false",
    "\\\"sourceOnlyPassResult\\\":\\\"blocked\\\"",
    "\\\"fieldSmokeExecuted\\\":false",
    "\\\"endpointProbePerformed\\\":false",
    "\\\"credentialProbePerformed\\\":false",
    "\\\"onvifDeviceContacted\\\":false",
    "\\\"externalWhepTurnContacted\\\":false",
    "\\\"cloudProviderContacted\\\":false",
    "\\\"vlmProviderCalled\\\":false",
    "\\\"endpointUrlIncluded\\\":false",
    "\\\"credentialMaterialIncluded\\\":false",
    "\\\"rawLocatorIncluded\\\":false",
    "\\\"rawJsonIncluded\\\":false",
    "\\\"debugMaterialIncluded\\\":false",
    "\\\"providerMaterialIncluded\\\":false",
    "\\\"rawTurnCredentialsIncluded\\\":false",
    "\\\"rawVlmPromptIncluded\\\":false",
    "\\\"rawProviderResponseIncluded\\\":false",
    "\\\"sourceRegistryWritePerformed\\\":false",
    "\\\"publishedViewWritePerformed\\\":false",
    "\\\"eventRecordWritePerformed\\\":false",
    "\\\"opsAuditWritePerformed\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
    "\\\"ruleProfilePayloadChanged\\\":false",
    "\\\"searchMetricsChanged\\\":false",
  ]) {
    assertIncludes(files.server, snippet, "field bridge condition gates API");
  }

  const routeBlock = extractBlock(files.server, `request.path == "${route}"`, "request.path == \"/ops/api/source-registry/backup-recovery-handoff\"");
  assertIncludes(routeBlock, "require_ops_principal()", "field bridge gate route guard");
  assertIncludes(routeBlock, "request.method == \"GET\"", "field bridge gate route method");
  assertIncludes(routeBlock, "Cache-Control", "field bridge gate route no-store");
  assertIncludes(routeBlock, "OpsV340FieldBridgeConditionGatesJson(", "field bridge gate route response");
});

check("Ops sources UI renders field bridge gates without exposing raw material", () => {
  assertIncludes(extractNamedFunctionBlock(files.opsSourcesScript, "renderFieldBridgeConditionGates"), "sourceOnlyPassAccepted", "UI-079 block-scoped canonical product state");
  assert(!["rawJson","rawLocator","rawEvidenceIncluded: true","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderFieldBridgeConditionGates").includes(marker)), "UI-079 raw-material-redaction explicit absence oracle");
  assert(!["sourceUrl","sourceURL","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderFieldBridgeConditionGates").includes(marker)), "UI-079 source-url-redaction explicit absence oracle");
  assert(!["passwordHash","tokenHash","Authorization:","credentialValue"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderFieldBridgeConditionGates").includes(marker)), "UI-079 credential-redaction explicit absence oracle");
  assert(!["debugCounters","Developer URL","debugMaterialExposed: true"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderFieldBridgeConditionGates").includes(marker)), "UI-079 debug-redaction explicit absence oracle");
  assert(!["providerApiCall(","rawProviderResponse","providerMaterialExposed: true"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderFieldBridgeConditionGates").includes(marker)), "UI-079 provider-boundary explicit absence oracle");
  assertIncludes(files.opsSourcesScript, "/ops/sources", "UI-079 canonical route obligation");
  assertIncludes(files.server, "media-server.ops.v340-field-bridge-condition-gates.v1", "UI-079 canonical schema obligation");
  assertIncludes(files.opsSourcesScript, "ONVIF", "UI-079 canonical field obligation");
  for (const snippet of [
    "sourceFieldBridgeGateStatus",
    "sourceFieldBridgeGateList",
    "sourceFieldBridgeBoundaryList",
    "renderFieldBridgeConditionGates",
    route,
  ]) {
    assertIncludes(files.opsSourcesScript, snippet, "field bridge gate UI controller");
  }
  for (const snippet of [
    "ops-field-bridge-condition-gates",
    "source-field-bridge-gate-status",
    "source-field-bridge-gate-list",
    "source-field-bridge-boundary-list",
    "data-source-field-bridge-gates",
    schema,
  ]) {
    assertIncludes(files.server, snippet, "field bridge gate UI shell");
  }
  for (const forbidden of [
    "endpointUrl",
    "credentialMaterial",
    "rawLocator",
    "rawJson",
    "debugMaterial",
    "providerMaterial",
    "rawTurnCredentials",
    "rawVlmPrompt",
    "rawProviderResponse",
  ]) {
    assert(!files.opsSourcesScript.includes(`fieldBridgeConditionGates.${forbidden}`), `field bridge UI must not read ${forbidden}`);
  }
  assert(!files.clientScript.includes(route), "client routes must not call the Ops field bridge condition route");
  assert(!files.clientScript.includes(schema), "client routes must not expose the Ops field bridge condition schema");
});

check("field bridge styling and ops/client smoke track Step 10 markers", () => {
  for (const snippet of [
    ".source-field-bridge-gate-grid",
    ".source-field-bridge-gate-list",
    ".source-field-bridge-gate-card",
    ".source-field-bridge-gate-boundary",
  ]) {
    assertIncludes(files.css, snippet, "field bridge gate CSS");
  }
  for (const snippet of [
    "ops-field-bridge-condition-gates",
    "source-field-bridge-gate-status",
    "source-field-bridge-gate-list",
    "source-field-bridge-boundary-list",
    "renderFieldBridgeConditionGates",
    route,
    schema,
    "sourceOnlyPassAccepted",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops/client UI smoke v3.4 Step 10 marker");
  }
});

check("roadmap records v3.4 Step 10 without overclaiming field smoke execution", () => {
  for (const snippet of [
    "| 10 | v3.4.0 (10) Field Bridge Condition Gates | P2 | 완료 |",
    "## v3.4.0 Step 10 개발 기록",
    "OpsV340FieldBridgeConditionGatesJson",
    "renderFieldBridgeConditionGates",
    `\`./server.sh ${command}\``,
    "fieldSmokeExecuted=false",
    "sourceOnlyPassAccepted=false",
    "ONVIF 실기기, external WHEP/TURN, real cloud/VLM provider field smoke 실행 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.4 Step 10");
  }
});

check("stream verification exposes v3.4 Step 10 command and boundary", () => {
  for (const snippet of [
    `| v3.4.0 (10) | \`./server.sh ${command}\` | Field Bridge Condition Gates.`,
    route,
    "ONVIF 실기기",
    "external WHEP/TURN",
    "real cloud/VLM provider",
    "endpoint/credential/approval",
    "source-only PASS",
    "fieldSmokeExecuted=false",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.4 Step 10");
  }
});

check("feature inventory, manual UI, and release records map v3.4 Step 10", () => {
  for (const snippet of [
    `v3.4.0 (10) Field Bridge Condition Gates | \`UI-079\`, \`SRC-043\`, \`MEDIA-022\`, \`LAB-091\`, \`SAFE-133\`, \`OPS-100\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-079 | V340 Step 10 Field Bridge Condition Gates UI",
    "SRC-043 | V340 Step 10 ONVIF real-device condition gate",
    "MEDIA-022 | V340 Step 10 external WHEP/TURN condition gate",
    "LAB-091 | V340 Step 10 real cloud/VLM provider condition gate",
    "SAFE-133 | V340 Step 10 source-only PASS and credential boundary",
    "OPS-100 | V340 Step 10 Field Bridge Condition Gates 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.4 Step 10");
  }
  for (const snippet of [
    "| V340 Step 10 Field Bridge Condition Gates | `UI-079`, `SRC-043`, `MEDIA-022`, `LAB-091`, `SAFE-133`, `OPS-100` | `/ops/sources` |",
    "Field Bridge Condition Gates",
    schema,
  ]) {
    assertIncludes(files.manualUi, snippet, "manual UI v3.4 Step 10");
  }
  for (const snippet of [
    "V340 Field Bridge Condition Gates",
    `\`./server.sh ${command}\``,
    "v340 Step 10 RED field bridge condition gates",
    "v340 Step 10 field bridge condition gates final",
    "v340 Step 10 UI 풀테스트",
    "v340 Step 10 field smoke",
    "v340 Step 10 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.4 Step 10");
  }
});

check("server entrypoint and inventory verifiers include v3.4 Step 10 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v340_field_bridge_condition_gates.mjs", "server.sh script dispatch");
  for (const id of ["SRC-043", "MEDIA-022", "LAB-091", "SAFE-133", "OPS-100"]) {
    assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  }
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(files.scriptInventory, "verify_v340_field_bridge_condition_gates.mjs", "script inventory");
});

check("SAFE-133 canonical field bridge source-only boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV340FieldBridgeConditionGatesJson(");
  const routeObserved = files.server.includes("/ops/api/source-registry/field-bridge-condition-gates");
  const safe133BoundaryObserved = block.includes("BuildV340FieldBridgeConditionGates") && block.includes("sourceOnlyPassAccepted");
  const sourceOnlyPassAccepted = exactBooleanFlagValue(block, "sourceOnlyPassAccepted");
  const localVerifierPassSubstitutesFieldSmoke = exactBooleanFlagValue(block, "localVerifierPassSubstitutesFieldSmoke");
  const fieldSmokeExecuted = exactBooleanFlagValue(block, "fieldSmokeExecuted");
  const credentialMaterialExposed = /\\\"(?:endpointUrl|credentialMaterial|rawLocator|rawJson|debugMaterial|providerMaterial|rawTurnCredential|rawVlmPrompt|rawProviderResponse)Included\\\":true/.test(block);
  const rawMaterialExposed = /\\\"(?:rawLocator|rawJson|rawTurnCredential|rawVlmPrompt|rawProviderResponse)Included\\\":true/.test(block);
  const sourceUrlExposed = block.includes("\\\"endpointUrlIncluded\\\":true");
  const debugMaterialExposed = block.includes("\\\"debugMaterialIncluded\\\":true");
  const providerCallPerformed = /\b(?:Provider|HttpPost|Infer)[A-Za-z0-9_:]*\s*\(/.test(block);
  assert(routeObserved && safe133BoundaryObserved && sourceOnlyPassAccepted === false && localVerifierPassSubstitutesFieldSmoke === false && fieldSmokeExecuted === false && credentialMaterialExposed === false && rawMaterialExposed === false && sourceUrlExposed === false && debugMaterialExposed === false && providerCallPerformed === false,
    "SAFE-133 BuildV340FieldBridgeConditionGates sourceOnlyPassAccepted localVerifierPassSubstitutesFieldSmoke fieldSmokeExecuted must remain false with credential redaction");
});

const results = runChecks();
console.log("");
console.log("== v3.4.0 field bridge condition gates ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.4.0 (10)");
console.log(`- route: ${route}`);
console.log("- ops route: /ops/sources");
console.log("- gated bridges: ONVIF real device, external WHEP/TURN, real cloud/VLM provider");
console.log("- condition: endpoint + credential + operator approval required before field smoke");
console.log("- sourceOnlyPassAccepted: false");
console.log("- fieldSmokeExecuted: false");
console.log("- hidden fields: endpoint URL, credential material, raw locator, raw JSON, debug material, provider material, raw TURN credentials, raw VLM prompt, raw provider response");
console.log("- unchanged: source registry write, PublishedView write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, search/metrics, automatic recovery");
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

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end > start, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
