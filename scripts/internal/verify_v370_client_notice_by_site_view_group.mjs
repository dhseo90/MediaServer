#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.7.0 Step 12 Client Notice by Site/View Group 구현, 문서, inventory 연결을 검증한다.

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
  printUsageAndExit(`v3.7.0 Client Notice by Site/View Group verification

Usage:
  ./server.sh verify-v370-client-notice-by-site-view-group

Checks:
  - /ops/api/site-operations/client-notice-by-site-view-group exposes site/view-group scoped viewer-safe notice previews
  - delivery queue state is preview-only and no client notice is sent or persisted
  - /ops dashboard renders site/view group notice preview and delivery queue without client/viewer injection
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v370-client-notice-by-site-view-group";
const schema = "media-server.ops.v370-client-notice-by-site-view-group.v1";
const route = "/ops/api/site-operations/client-notice-by-site-view-group";
const projectionRoute = "/ops/api/site-operations/source-registry-projection";
const healthRoute = "/ops/api/site-operations/health-rollup";
const impactRoute = "/ops/api/site-operations/impact-graph";
const runbookRoute = "/ops/api/site-operations/runbook-instance-ledger";
const approvalRoute = "/ops/api/site-operations/approval-ticket-workflow";
const featureIds = ["UI-096", "CLIENT-037", "SAFE-173", "OPS-140"];

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

check("Ops server builds the v3.7 client notice by site/view group model", () => {
  for (const snippet of [
    "struct OpsV370ClientNoticeBySiteViewGroupItem",
    "struct OpsV370ClientNoticeBySiteViewGroupSummary",
    "BuildV370ClientNoticeBySiteViewGroupItems",
    "BuildV370ClientNoticeBySiteViewGroupSummary",
    "AppendV370ClientNoticeBySiteViewGroupItemJson",
    "AppendV370ClientNoticeBySiteViewGroupSummaryJson",
    "OpsV370ClientNoticeBySiteViewGroupJson",
    schema,
    "noticePreviewId",
    "siteId",
    "sourceGroup",
    "viewGroup",
    "noticeStatus",
    "viewerSafeTitle",
    "viewerSafeBody",
    "timelineHint",
    "deliveryState",
    "deliveryQueueState",
    "affectedViewIds",
    "affectedClientRefs",
    "viewGroupScoped",
  ]) {
    assertIncludes(files.server, snippet, "v370 client notice by site/view group server model");
  }
});

check("client notice by site/view group derives from v3.7 site projection, health, impact, runbook, and approval refs", () => {
  const block = extractBlock(
    files.server,
    "struct OpsV370ClientNoticeBySiteViewGroupItem",
    "struct OpsV360RuleVaWhatIfReplayCandidate",
  );
  for (const snippet of [
    "BuildV370SiteAwareSourceRegistryProjectionItems",
    "BuildV370SiteHealthRollupItems",
    "BuildV370SiteImpactGraphNodes",
    "BuildV370RunbookTemplateContractItems",
    "BuildV370RunbookInstanceLedgerEntries",
    "BuildV370ApprovalTicketWorkflowItems",
    "viewerSafeClientNoticeBySiteViewGroup",
    "preview-only",
    "delivery-queue-preview",
    projectionRoute,
    healthRoute,
    impactRoute,
    runbookRoute,
    approvalRoute,
  ]) {
    assertIncludes(block, snippet, "v370 client notice by site/view group derivation");
  }
});

check("client notice by site/view group preserves preview-only and viewer-safe boundaries", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370ClientNoticeBySiteViewGroupJson(");
  const clientNoticeSendPerformed = exactBooleanFlagValue(block, "clientNoticeSent");
  assert(clientNoticeSendPerformed === false, "CLIENT-037 client notice send must remain false");
  assert(exactBooleanFlagValue(block, "clientNoticeSent") === false, "CLIENT-037 client notice send must remain false");
  assert(exactBooleanFlagValue(block, "viewerClientPayloadChanged") === false, "CLIENT-037 viewer client payload mutation must remain false");
  assert(exactBooleanFlagValue(block, "rawLocatorIncluded") === false && exactBooleanFlagValue(block, "rawJsonIncluded") === false, "CLIENT-037 raw/source locator material must remain redacted");
  assert(exactBooleanFlagValue(block, "debugMaterialIncluded") === false, "CLIENT-037 debug material must remain redacted");
  assert(block.includes("clientNoticeSent") && block.includes("viewerSafeClientNoticeBySiteViewGroup"), "CLIENT-037 exact site/view group clientNoticeSent preview readback missing");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "viewerSafe",
    "previewOnly",
    "siteViewGroupScoped",
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
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
  ]) {
    assertIncludes(block, snippet, "v370 client notice boundary");
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
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    const index = block.indexOf(flag);
    assert(index >= 0, `boundary flag missing: ${flag}`);
    const nearby = block.slice(index, index + 144);
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
    assert(!block.includes(forbidden), `client notice by site/view group must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the client notice by site/view group route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/");
  assertIncludes(block, route, "v370 client notice route");
  assertIncludes(block, "request.method == \"GET\"", "v370 client notice route");
  assertIncludes(block, "require_ops_principal()", "v370 client notice route");
  assertIncludes(block, "OpsV370ClientNoticeBySiteViewGroupJson(", "v370 client notice route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "v370 client notice route");
  assertIncludes(block, "Cache-Control", "v370 client notice route");
  assertIncludes(block, "no-store", "v370 client notice route");
});

check("/ops dashboard declares and renders site/view group client notice workspace", () => {
  const serverBlock = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "ops-site-client-notice-workspace",
    "data-testid=\"ops-site-client-notice-workspace\"",
    "data-v370-client-notice-by-site-view-group",
    schema,
    "Client Notice by Site/View Group",
    "dashSiteClientNoticeBadges",
    "dashSiteClientNoticeText",
    "dashSiteClientNoticePreviewList",
    "dashSiteClientNoticeDeliveryQueue",
    "dashSiteClientNoticeBoundary",
  ]) {
    assertIncludes(serverBlock, snippet, "v370 client notice dashboard shell");
  }
  const scriptBlock = extractBlock(
    files.uiScript,
    "const renderV370ClientNoticeBySiteViewGroup",
    "const renderV370SiteOperationsWorkspace",
  );
  assertIncludes(scriptBlock, "dashSiteClientNoticeBoundary", "v370 client notice product UI state");
  const noticeSendPerformed = ["send(", "sendClientNotice", "deliveryQueueWritePerformed: true"].some(marker => scriptBlock.includes(marker));
  assert(noticeSendPerformed === false, "UI-096 site/view notice preview must not send a client notice");
  assertIncludes(files.uiScript, "/ops/dashboard", "UI-096 canonical route obligation");
  assertIncludes(files.server, "media-server.ops.v370-client-notice-by-site-view-group.v1", "UI-096 canonical schema obligation");
  for (const snippet of [
    "refreshV370ClientNoticeBySiteViewGroup",
    route,
    "clientNoticeBySiteViewGroupItems",
    "clientNoticeBySiteViewGroupSummary",
    "noticeStatus",
    "viewGroup",
    "deliveryQueueState",
    "affectedViewIds",
    "affectedClientRefs",
    "dashSiteClientNoticePreviewList",
    "dashSiteClientNoticeDeliveryQueue",
    "requestJson(noticeRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v370 client notice dashboard renderer");
  }
  const refreshBlock = extractBlock(files.uiScript, "async function refreshDashboard()", "async function refreshEvents()");
  assertIncludes(refreshBlock, "refreshV370ClientNoticeBySiteViewGroup", "dashboard refresh");
  assertIncludes(refreshBlock, route, "dashboard refresh");
});

check("client notice by site/view group styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-site-client-notice-workspace",
    ".ops-site-client-notice-grid",
    ".ops-site-client-notice-list",
    ".ops-site-client-notice-entry",
    ".ops-site-client-notice-boundary",
    "body.ops-shell .ops-site-client-notice-workspace",
  ]) {
    assertIncludes(files.css, snippet, "v370 client notice CSS");
  }
});

check("client/viewer scripts do not receive v3.7 site/view group notice preview material", () => {
  for (const forbidden of [
    schema,
    route,
    "clientNoticeBySiteViewGroupItems",
    "noticePreviewId",
    "deliveryQueueState",
    "affectedClientRefs",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose v3.7 notice preview material: ${forbidden}`);
  }
});

check("roadmap, stream verification, inventory, and release records map v3.7 Step 12", () => {
  for (const snippet of [
    "| 12 | v3.7.0 (12) Client Notice by Site/View Group | P1 | 완료 |",
    "## v3.7.0 Step 12 개발 기록",
    route,
    "OpsV370ClientNoticeBySiteViewGroupJson",
    `\`./server.sh ${command}\``,
    "Rule/VA What-if by Site 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.7 Step 12");
  }
  for (const snippet of [
    `| v3.7.0 (12) | \`./server.sh ${command}\` | Client Notice by Site/View Group.`,
    "site/view group 기준 viewer-safe notice preview",
    "실제 발송 없이",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.7 Step 12");
  }
  for (const snippet of [
    `v3.7.0 (12) Client Notice by Site/View Group | \`UI-096\`, \`CLIENT-037\`, \`SAFE-173\`, \`OPS-140\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-096 | V370 Step 12 Client Notice by Site/View Group UI",
    "CLIENT-037 | V370 Step 12 site/view group client notice preview boundary",
    "SAFE-173 | V370 Step 12 client notice by site/view group boundary",
    "OPS-140 | V370 Step 12 Client Notice by Site/View Group 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.7 Step 12");
  }
  for (const snippet of [
    "V370 Client Notice by Site/View Group",
    `\`./server.sh ${command}\``,
    "v370 Step 12 RED client notice by site/view group gate",
    "v370 Step 12 client notice by site/view group final",
    "v370 Step 12 UI 풀테스트",
    "v370 Step 12 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.7 Step 12");
  }
});

check("server entrypoint and inventory verifiers include v3.7 Step 12 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v370_client_notice_by_site_view_group.mjs", "server.sh script dispatch");
  for (const snippet of [
    "validateImplementationManifest",
    "semantic.verifierAssertion.command",
    'kind: "stability"',
  ]) {
    assertIncludes(files.featureCoverageVerifier, snippet, "feature coverage verifier canonical command mapping");
  }
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v370_client_notice_by_site_view_group.mjs", "script inventory");
});

check("SAFE-173 canonical bounded no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370ClientNoticeBySiteViewGroupJson(");
  const routeObserved = files.server.includes("/ops/api/site-operations/client-notice-by-site-view-group");
  const safe173BoundaryObserved = block.includes("BuildV370ClientNoticeBySiteViewGroupItems");
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
  assert(routeObserved && safe173BoundaryObserved && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && sendPerformed === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-173 BuildV370ClientNoticeBySiteViewGroupItems must remain bounded no-execution no-write redacted and client/provider isolated");
});

const results = runChecks();
console.log("");
console.log("== v3.7.0 client notice by site/view group summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.7.0 (12)");
console.log(`- route: ${route}`);
console.log("- scope: site/view group viewer-safe notice preview and delivery queue");
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
      console.log(`[fail] ${item.name}: ${error.message}`);
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
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing ${needle}`);
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `block start missing: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `block end missing after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
