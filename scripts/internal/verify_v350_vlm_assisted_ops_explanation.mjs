#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.5.0 Step 12 VLM-assisted Ops Explanation 구현, UI, 문서, inventory 연결을 검증한다.
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
  printUsageAndExit(`v3.5.0 VLM-assisted Ops Explanation verification

Usage:
  ./server.sh verify-v350-vlm-assisted-ops-explanation

Checks:
  - /ops/api/live-operations/vlm-assisted-explanation summarizes command plan blockers, incident/source relation, and operator review hints
  - VLM assistance is default-off and never performs provider/runtime calls in this gate
  - /ops command workspace renders VLM-assisted explanation without raw prompt, provider response, credential, or client material
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v350-vlm-assisted-ops-explanation";
const schema = "media-server.ops.v350-vlm-assisted-explanation.v1";
const route = "/ops/api/live-operations/vlm-assisted-explanation";
const commandPlanRoute = "/ops/api/live-operations/command-plan";
const graphRoute = "/ops/api/live-operations/graph";
const files = {
  server: readWebRtcHttpServerBundle(readText),
  uiScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
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
  serverSh: readText("server.sh"),
};

const checks = [];

check("Ops server builds default-off VLM-assisted explanation models", () => {
  for (const snippet of [
    "struct OpsV350VlmAssistedOpsExplanationItem",
    "struct OpsV350VlmAssistedOpsExplanationSummary",
    "BuildV350VlmAssistedOpsExplanationItems",
    "AppendV350VlmAssistedOpsExplanationItemJson",
    "AppendV350VlmAssistedOpsExplanationSummaryJson",
    "OpsV350VlmAssistedOpsExplanationJson",
    schema,
    "vlmAssistedOpsExplanations",
    "commandPlanBlockerSummary",
    "incidentSourceRelationSummary",
    "operatorReviewHint",
    "defaultEnabled",
    "defaultOff",
    "vlmProviderCallPerformed",
  ]) {
    assertIncludes(files.server, snippet, "v350 VLM-assisted explanation server model");
  }
  const producerBlock = extractCppFunctionBlock(files.server, "std::string OpsV350VlmAssistedOpsExplanationJson(");
  assertIncludes(producerBlock, "media-server.ops.v350-vlm-assisted-explanation.v1", "v350 VLM-assisted explanation schema");
});

check("VLM-assisted explanation derives blocker, incident/source relation, and review hints without calling VLM", () => {
  const block = extractBlock(files.server, "struct OpsV350VlmAssistedOpsExplanationItem", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "BuildV350LiveOperationsGraphContext",
    "BuildV350CommandPlanCandidates",
    "command-plan-blocker",
    "incident-source-relation",
    "operator-review-hint",
    "blockedReason",
    "sourceHealth",
    "eventRecord",
    "operator review hint",
    "sourceId",
    "evidenceRefs",
    commandPlanRoute,
    graphRoute,
  ]) {
    assertIncludes(block, snippet, "v350 VLM-assisted explanation derivation");
  }
});

check("VLM-assisted explanation boundary flags keep default-off/no-call/no-write/no-raw-material invariants", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV350VlmAssistedOpsExplanationJson(");
  const routeObserved = files.server.includes("/ops/api/live-operations/vlm-assisted-explanation");
  for (const snippet of [
    "defaultOff",
    "defaultEnabled",
    "runtimeOptInRequired",
    "vlmProviderCallPerformed",
    "vlmRuntimeCallPerformed",
    "rawVlmPromptIncluded",
    "rawProviderResponseIncluded",
    "credentialMaterialIncluded",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "commandPlanExecuted",
    "operatorReviewWritePerformed",
    "clientNoticeSent",
    "viewerClientExposureAdded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    assertIncludes(block, snippet, "v350 VLM-assisted explanation boundary flags");
  }
  for (const flag of [
    "defaultEnabled",
    "vlmProviderCallPerformed",
    "vlmRuntimeCallPerformed",
    "rawVlmPromptIncluded",
    "rawProviderResponseIncluded",
    "credentialMaterialIncluded",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "commandPlanExecuted",
    "operatorReviewWritePerformed",
    "clientNoticeSent",
    "viewerClientExposureAdded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    const index = block.indexOf(flag);
    assert(index >= 0, `missing boundary flag: ${flag}`);
    const nearby = block.slice(index, index + 128);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  assert(exactBooleanFlagValue(block, "eventRecordWritePerformed") === false, "eventRecordWritePerformed must remain false");
  assert(exactBooleanFlagValue(block, "viewerClientExposureAdded") === false, "viewerClientExposureAdded must remain false");
  assert(exactBooleanFlagValue(block, "vlmProviderCallPerformed") === false, "vlmProviderCallPerformed must remain false");
  for (const forbidden of [
    "CallVlmProvider(",
    "RunVlm",
    "GenerateVlm",
    "AppendOpsAuditRecord(",
    "Authorization",
    "password",
    "\"rawPrompt\"",
    "\"rawResponse\"",
    "\"providerResponse\"",
    "\"rtspUrl\"",
  ]) {
    assert(!block.includes(forbidden), `VLM-assisted explanation must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the VLM-assisted explanation route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/");
  assertIncludes(block, route, "VLM-assisted explanation route");
  assertIncludes(block, "request.method == \"GET\"", "VLM-assisted explanation route");
  assertIncludes(block, "require_ops_principal()", "VLM-assisted explanation route");
  assertIncludes(block, "OpsV350VlmAssistedOpsExplanationJson(", "VLM-assisted explanation route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "VLM-assisted explanation route");
  assertIncludes(block, "Cache-Control", "VLM-assisted explanation route");
  assertIncludes(block, "no-store", "VLM-assisted explanation route");
});

check("/ops command workspace declares VLM-assisted explanation surfaces", () => {
  const block = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "dashCommandWorkspaceVlmAssistedExplanation",
    "data-v350-vlm-assisted-explanation",
    schema,
    "VLM-assisted Ops Explanation",
    "default-off VLM",
    "command plan blocker",
    "incident/source relation",
    "operator review hint",
  ]) {
    assertIncludes(block, snippet, "v350 VLM-assisted explanation dashboard shell");
    assertIncludes(extractNamedFunctionBlock(files.uiScript, "renderV350OpsCommandWorkspace"), "data-v350-vlm-assisted-explanation", "UI-087 block-scoped canonical product state");
    assert(!["rawJson","rawLocator","rawEvidenceIncluded: true","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV350OpsCommandWorkspace").includes(marker)), "UI-087 raw-material-redaction explicit absence oracle");
    assert(!["passwordHash","tokenHash","Authorization:","credentialValue"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV350OpsCommandWorkspace").includes(marker)), "UI-087 credential-redaction explicit absence oracle");
    assertIncludes(files.uiScript, "/ops/dashboard", "UI-087 canonical route obligation");
    assertIncludes(files.uiScript, "media-server.ops.v350-vlm-assisted-explanation.v1", "UI-087 canonical schema obligation");
    assertIncludes(files.uiScript, "VLM", "UI-087 canonical field obligation");
  }
});

check("/ops command workspace renderer loads and displays VLM-assisted explanation summaries", () => {
  const block = extractBlock(files.uiScript, "const v350CommandWorkspaceCard", "const renderDashboardRootCause");
  for (const snippet of [
    "vlmAssistedExplanation",
    "vlmExplanationRoute",
    route,
    "vlmAssistedOpsExplanations",
    "commandPlanBlockerSummary",
    "incidentSourceRelationSummary",
    "operatorReviewHint",
    "defaultEnabled",
    "vlmProviderCallPerformed",
    "dashCommandWorkspaceVlmAssistedExplanation",
    "requestJson(vlmExplanationRoute)",
  ]) {
    assertIncludes(block, snippet, "v350 VLM-assisted explanation renderer");
  }
  assert(!block.includes("POST"), "VLM-assisted explanation renderer must not POST");
  assert(!block.includes("PUT"), "VLM-assisted explanation renderer must not PUT");
  assert(!block.includes("DELETE"), "VLM-assisted explanation renderer must not DELETE");
});

check("VLM-assisted explanation styling and ops/client smoke track Step 12 markers", () => {
  for (const snippet of [
    ".ops-vlm-assisted-explanation-list",
    ".ops-vlm-assisted-explanation-entry",
    ".ops-vlm-explanation-boundary",
  ]) {
    assertIncludes(files.css, snippet, "v350 VLM-assisted explanation CSS");
  }
  for (const snippet of [
    "dashCommandWorkspaceVlmAssistedExplanation",
    "data-v350-vlm-assisted-explanation",
    schema,
    route,
    "VLM-assisted Ops Explanation",
    "default-off VLM",
    "operator review hint",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops/client UI smoke v3.5 Step 12 marker");
  }
});

check("client/viewer scripts do not expose VLM-assisted explanation operator material", () => {
  for (const forbidden of [
    schema,
    route,
    "vlmAssistedOpsExplanations",
    "commandPlanBlockerSummary",
    "incidentSourceRelationSummary",
    "operatorReviewHint",
    "rawVlmPrompt",
    "rawProviderResponse",
    "providerResponse",
    "commandPlanBlocker",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose VLM-assisted explanation material: ${forbidden}`);
  }
});

check("roadmap records v3.5 Step 12 without overclaiming VLM/provider execution", () => {
  for (const snippet of [
    "| 12 | v3.5.0 (12) VLM-assisted Ops Explanation | P2 | 완료 |",
    "## v3.5.0 Step 12 개발 기록",
    route,
    "OpsV350VlmAssistedOpsExplanationJson",
    "command plan blocker, incident/source relation, operator review hint",
    `\`./server.sh ${command}\``,
    "default-off VLM 보조 설명",
    "VLM/provider 호출 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.5 Step 12");
  }
});

check("stream verification exposes v3.5 Step 12 command and boundary", () => {
  for (const snippet of [
    `| v3.5.0 (12) | \`./server.sh ${command}\` | VLM-assisted Ops Explanation.`,
    route,
    "default-off VLM",
    "command plan blocker",
    "incident/source relation",
    "operator review hint",
    "VLM/provider call 미수행",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.5 Step 12");
  }
});

check("feature inventory and release records map v3.5 Step 12", () => {
  for (const snippet of [
    `v3.5.0 (12) VLM-assisted Ops Explanation | \`UI-087\`, \`SRC-048\`, \`EVT-076\`, \`LAB-094\`, \`SAFE-146\`, \`OPS-113\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-087 | V350 Step 12 VLM-assisted Ops Explanation UI",
    "SRC-048 | V350 Step 12 source relation explanation context",
    "EVT-076 | V350 Step 12 incident/source relation explanation context",
    "LAB-094 | V350 Step 12 default-off VLM ops explanation harness",
    "SAFE-146 | V350 Step 12 VLM-assisted ops explanation boundary",
    "OPS-113 | V350 Step 12 VLM-assisted Ops Explanation 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.5 Step 12");
  }
  for (const snippet of [
    "V350 VLM-assisted Ops Explanation",
    `\`./server.sh ${command}\``,
    "v350 Step 12 RED VLM-assisted ops explanation gate",
    "v350 Step 12 VLM-assisted ops explanation final",
    "v350 Step 12 VLM/provider execution",
    "v350 Step 12 UI 풀테스트",
    "v350 Step 12 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.5 Step 12");
  }
});

check("server entrypoint and inventory verifiers include v3.5 Step 12 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v350_vlm_assisted_ops_explanation.mjs", "server.sh script dispatch");
  for (const id of ["UI-087", "SRC-048", "EVT-076", "LAB-094", "SAFE-146", "OPS-113"]) {
    assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  }
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(files.scriptInventory, "verify_v350_vlm_assisted_ops_explanation.mjs", "script inventory");
});

check("SAFE-146 canonical VLM explanation default-off boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV350VlmAssistedOpsExplanationJson(");
  const routeObserved = files.server.includes("/ops/api/live-operations/vlm-assisted-explanation");
  const safe146BoundaryObserved = block.includes("BuildV350VlmAssistedOpsExplanationItems") && block.includes("defaultEnabled");
  const defaultEnabled = exactBooleanFlagValue(block, "defaultEnabled");
  const vlmProviderCallPerformed = exactBooleanFlagValue(block, "vlmProviderCallPerformed");
  const vlmRuntimeCallPerformed = exactBooleanFlagValue(block, "vlmRuntimeCallPerformed");
  const rawMaterialIncluded = /\\\"(?:rawVlmPrompt|rawProviderResponse|credentialMaterial)Included\\\":true/.test(block);
  const mutationPerformed = /\b(?:Write|Persist|Execute|UpdateSource|DispatchEventRecords)[A-Za-z0-9_:]*\s*\(/.test(block);
  const writePerformed = /\b(?:Write|Persist)[A-Za-z0-9_:]*\s*\(/.test(block);
  const credentialMaterialExposed = block.includes("\\\"credentialMaterialIncluded\\\":true");
  assert(routeObserved && safe146BoundaryObserved && defaultEnabled === false && vlmProviderCallPerformed === false && vlmRuntimeCallPerformed === false && rawMaterialIncluded === false && credentialMaterialExposed === false && writePerformed === false && mutationPerformed === false,
    "SAFE-146 BuildV350VlmAssistedOpsExplanationItems defaultEnabled vlmProviderCallPerformed vlmRuntimeCallPerformed raw prompt response credential commandPlanExecuted must remain false");
});

const results = runChecks();
console.log("");
console.log("== v3.5.0 VLM-assisted ops explanation ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.5.0 (12)");
console.log(`- route: ${route}`);
console.log("- summaries: command plan blocker, incident/source relation, operator review hint");
console.log("- VLM: default-off, runtime/provider call not performed");
console.log("- writes: no command execution, review write, source/view/EventRecord/Ops audit/client/media mutation performed");
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

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function extractBlock(text, start, end) {
  const startIndex = text.indexOf(start);
  assert(startIndex >= 0, `missing block start: ${start}`);
  const endIndex = text.indexOf(end, startIndex + start.length);
  assert(endIndex >= 0, `missing block end after ${start}: ${end}`);
  return text.slice(startIndex, endIndex);
}
