#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.6.0 Step 9 Client Notice Preview 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { exactBooleanFlagValue, extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.6.0 Client Notice Preview verification

Usage:
  ./server.sh verify-v360-client-notice-preview

Checks:
  - /ops/api/live-operations/simulation/client-notice-preview exposes viewer-safe preview-only notices
  - maintenance/degraded/recovering notices are generated without actual delivery
  - /ops simulation workspace renders notice previews without client/viewer injection
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v360-client-notice-preview";
const schema = "media-server.ops.v360-client-notice-preview.v1";
const route = "/ops/api/live-operations/simulation/client-notice-preview";
const dryRunRoute = "/ops/api/live-operations/simulation/command-plan-dry-run";
const impactDiffRoute = "/ops/api/live-operations/simulation/impact-diff";
const readinessRoute = "/ops/api/live-operations/simulation/safe-apply-readiness";
const files = {
  server: readWebRtcHttpServerBundle(readText),
  uiScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
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

check("Ops server builds the v3.6 client notice preview model", () => {
  for (const snippet of [
    "struct OpsV360ClientNoticePreviewItem",
    "struct OpsV360ClientNoticePreviewSummary",
    "BuildV360ClientNoticePreviewItems",
    "BuildV360ClientNoticePreviewSummary",
    "AppendV360ClientNoticePreviewItemJson",
    "AppendV360ClientNoticePreviewSummaryJson",
    "OpsV360ClientNoticePreviewJson",
    schema,
    "noticePreviewId",
    "noticeStatus",
    "viewerSafeTitle",
    "viewerSafeBody",
    "timelineHint",
    "deliveryState",
    "maintenance",
    "degraded",
    "recovering",
  ]) {
    assertIncludes(files.server, snippet, "v360 client notice preview server model");
  }
});

check("client notice preview derives from dry-run, impact diff, and readiness without delivery", () => {
  const block = extractBlock(files.server, "struct OpsV360ClientNoticePreviewItem", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "BuildV360CommandPlanDryRunResults",
    "BuildV360SourceRuleImpactDiffs",
    "BuildV360SafeApplyReadinessItems",
    "viewerSafeClientNoticePreview",
    "preview-only",
    dryRunRoute,
    impactDiffRoute,
    readinessRoute,
  ]) {
    assertIncludes(block, snippet, "v360 client notice preview derivation");
  }
});

check("client notice preview preserves viewer-safe preview-only boundaries", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV360ClientNoticePreviewJson(");
  const clientNoticeSendPerformed = exactBooleanFlagValue(block, "clientNoticeSent");
  assert(clientNoticeSendPerformed === false, "CLIENT-034 client notice send must remain false");
  assert(exactBooleanFlagValue(block, "clientNoticeSent") === false, "CLIENT-034 client notice send must remain false");
  assert(exactBooleanFlagValue(block, "viewerClientPayloadChanged") === false, "CLIENT-034 viewer client payload mutation must remain false");
  assert(exactBooleanFlagValue(block, "rawLocatorIncluded") === false && exactBooleanFlagValue(block, "rawJsonIncluded") === false, "CLIENT-034 raw/source locator material must remain redacted");
  assert(exactBooleanFlagValue(block, "debugMaterialIncluded") === false, "CLIENT-034 debug material must remain redacted");
  assert(block.includes("clientNoticeSent") && block.includes("viewerSafeClientNoticePreview"), "CLIENT-034 exact clientNoticeSent preview readback missing");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "viewerSafe",
    "previewOnly",
    "clientNoticeSent",
    "clientNoticePersisted",
    "viewerClientPayloadChanged",
    "sourceUrlIncluded",
    "rawLocatorIncluded",
    "rawJsonIncluded",
    "debugMaterialIncluded",
    "credentialMaterialIncluded",
    "operatorMaterialIncluded",
    "commandPlanDetailsIncluded",
    "incidentDetailsIncluded",
  ]) {
    assertIncludes(block, snippet, "v360 client notice preview boundary");
  }
  for (const flag of [
    "clientNoticeSent",
    "clientNoticePersisted",
    "viewerClientPayloadChanged",
    "sourceUrlIncluded",
    "rawLocatorIncluded",
    "rawJsonIncluded",
    "debugMaterialIncluded",
    "credentialMaterialIncluded",
    "operatorMaterialIncluded",
    "commandPlanDetailsIncluded",
    "incidentDetailsIncluded",
  ]) {
    const index = block.indexOf(flag);
    const nearby = block.slice(index, index + 128);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  for (const forbidden of [
    "SendClientNotice",
    "PublishClientNotice",
    "AppendOpsAuditRecord(",
    "credentialRef",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `client notice preview must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the client notice preview route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/");
  assertIncludes(block, route, "client notice preview route");
  assertIncludes(block, "request.method == \"GET\"", "client notice preview route");
  assertIncludes(block, "require_ops_principal()", "client notice preview route");
  assertIncludes(block, "OpsV360ClientNoticePreviewJson(", "client notice preview route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "client notice preview route");
  assertIncludes(block, "Cache-Control", "client notice preview route");
  assertIncludes(block, "no-store", "client notice preview route");
});

check("/ops simulation workspace declares and renders notice preview", () => {
  const serverBlock = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "dashSimulationWorkspaceNoticePreviewList",
    "ops-simulation-notice-preview-list",
    "data-v360-client-notice-preview",
    schema,
    "Client Notice Preview",
    "maintenance/degraded/recovering",
  ]) {
    assertIncludes(serverBlock, snippet, "v360 client notice preview dashboard shell");
  }
  const scriptBlock = extractBlock(files.uiScript, "const renderV360OpsSimulationWorkspace", "const renderDashboardRootCause");
  assertIncludes(scriptBlock, "data-v360-client-notice-preview", "v360 client notice preview product UI state");
  const noticeSendPerformed = ["send(", "sendClientNotice", "deliveryQueueWritePerformed: true"].some(marker => scriptBlock.includes(marker));
  assert(noticeSendPerformed === false, "UI-090 notice preview must not send a client notice");
  assertIncludes(files.uiScript, "/ops/dashboard", "UI-090 canonical route obligation");
  assertIncludes(files.server, "media-server.ops.v360-client-notice-preview.v1", "UI-090 canonical schema obligation");
  for (const snippet of [
    "clientNoticePreview",
    "clientNoticePreviewRoute",
    route,
    "clientNoticePreviewItems",
    "noticeStatus",
    "viewerSafeTitle",
    "viewerSafeBody",
    "timelineHint",
    "dashSimulationWorkspaceNoticePreviewList",
    "requestJson(clientNoticePreviewRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v360 client notice preview renderer");
  }
});

check("client notice preview styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-simulation-notice-preview-list",
    ".ops-simulation-notice-preview-entry",
    "body.ops-shell .ops-simulation-workspace .ops-simulation-notice-preview-list",
  ]) {
    assertIncludes(files.css, snippet, "v360 client notice preview CSS");
  }
});

check("client/viewer scripts do not receive v3.6 preview material", () => {
  for (const forbidden of [
    schema,
    route,
    "clientNoticePreviewItems",
    "noticePreviewId",
    "deliveryState",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose v3.6 preview material: ${forbidden}`);
  }
});

check("roadmap, stream verification, inventory, and release records map v3.6 Step 9", () => {
  for (const snippet of [
    "| 9 | v3.6.0 (9) Client Notice Preview | P1 | 완료 |",
    "## v3.6.0 Step 9 개발 기록",
    route,
    "OpsV360ClientNoticePreviewJson",
    `\`./server.sh ${command}\``,
    "Rule/VA What-if Replay Pack 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.6 Step 9");
  }
  for (const snippet of [
    `| v3.6.0 (9) | \`./server.sh ${command}\` | Client Notice Preview.`,
    "maintenance/degraded/recovering",
    "실제 발송 없이",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.6 Step 9");
  }
  for (const snippet of [
    `v3.6.0 (9) Client Notice Preview | \`UI-090\`, \`CLIENT-034\`, \`SAFE-156\`, \`OPS-123\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-090 | V360 Step 9 Client Notice Preview UI",
    "CLIENT-034 | V360 Step 9 client notice preview",
    "SAFE-156 | V360 Step 9 client notice preview boundary",
    "OPS-123 | V360 Step 9 Client Notice Preview 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.6 Step 9");
  }
  for (const snippet of [
    "V360 Client Notice Preview",
    `\`./server.sh ${command}\``,
    "v360 Step 9 RED client notice preview gate",
    "v360 Step 9 client notice preview final",
    "v360 Step 9 UI 풀테스트",
    "v360 Step 9 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.6 Step 9");
  }
});

check("server entrypoint and inventory verifiers include v3.6 Step 9 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v360_client_notice_preview.mjs", "server.sh script dispatch");
  for (const snippet of [
    "validateImplementationManifest",
    "semantic.verifierAssertion.command",
    'kind: "stability"',
  ]) {
    assertIncludes(files.featureCoverageVerifier, snippet, "feature coverage verifier canonical command mapping");
  }
  for (const id of ["UI-090", "CLIENT-034", "SAFE-156", "OPS-123"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v360_client_notice_preview.mjs", "script inventory");
});

check("SAFE-156 canonical bounded no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV360ClientNoticePreviewJson(");
  const routeObserved = files.server.includes("/ops/api/live-operations/simulation/client-notice-preview");
  const safe156BoundaryObserved = block.includes("BuildV360ClientNoticePreviewItems");
  const writePerformed = /\b(?:Write|Persist|AppendFile|UpdateSource|CreateVaRule|UpdateVaRule|AssignReviewer)[A-Za-z0-9_:]*\s*\(/.test(block);
  const mutationPerformed = writePerformed || /\b(?:Apply|AutomaticApply|SafeApply|SendClientNotice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const executionPerformed = /\b(?:Execute|RunSimulation|Probe|Contact|ProviderCall|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const automaticApplyPerformed = /\b(?:AutomaticApply|SafeApply|ApplyRule|ApplySource)[A-Za-z0-9_:]*\s*\(/.test(block);
  const clientNoticeSent = /\bSendClientNotice[A-Za-z0-9_:]*\s*\(/.test(block);
  const sendPerformed = clientNoticeSent;
  const fieldSmokeExecuted = /\b(?:ExecuteFieldSmoke|ProbeEndpoint|ContactDevice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const providerCallPerformed = /\b(?:ProviderCall|ProviderClient|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const rawMaterialExposed = /\\"(?:rawLocator|rawJson|rawProviderResponse|rawEndpoint|rawMaterial)\\":true/.test(block);
  const sourceUrlExposed = block.includes("\\\"sourceUrlIncluded\\\":true") || block.includes("\\\"sourceUrlExposed\\\":true");
  const credentialMaterialExposed = block.includes("\\\"credentialMaterialIncluded\\\":true") || block.includes("\\\"credentialMaterialExposed\\\":true");
  const debugMaterialExposed = block.includes("\\\"debugMaterialIncluded\\\":true") || block.includes("\\\"debugMaterialExposed\\\":true");
  const viewerClientExposureAdded = block.includes("\\\"viewerClientExposureAdded\\\":true");
  const mediaPathChanged = block.includes("\\\"rtspOrWebrtcMediaPathChanged\\\":true");
  assert(routeObserved && safe156BoundaryObserved && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && sendPerformed === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-156 BuildV360ClientNoticePreviewItems must remain bounded no-execution no-write redacted and client/provider isolated");
});

const results = runChecks();
console.log("");
console.log("== v3.6.0 client notice preview summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.6.0 (9)");
console.log(`- route: ${route}`);
console.log("- previewStatuses: maintenance, degraded, recovering");
console.log("- delivery: preview-only; no client notice sent");
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

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
