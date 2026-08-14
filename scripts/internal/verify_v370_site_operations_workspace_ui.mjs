#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.7.0 Step 11 Site Operations Workspace UI 구현, 문서, inventory 연결을 검증한다.
import { extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.7.0 Site Operations Workspace UI verification

Usage:
  ./server.sh verify-v370-site-operations-workspace-ui

Checks:
  - /ops dashboard declares an Ops-only site operations workspace UI shell
  - renderer loads site list, health rollup, runbook queue, approval workflow, and impact detail read models
  - client/viewer scripts do not expose site operations operator material
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v370-site-operations-workspace-ui";
const schema = "media-server.ops.v370-site-operations-workspace-ui.v1";
const projectionRoute = "/ops/api/site-operations/source-registry-projection";
const healthRoute = "/ops/api/site-operations/health-rollup";
const impactRoute = "/ops/api/site-operations/impact-graph";
const runbookRoute = "/ops/api/site-operations/runbook-instance-ledger";
const approvalRoute = "/ops/api/site-operations/approval-ticket-workflow";
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

check("/ops dashboard declares the v3.7 site operations workspace UI shell", () => {
  const block = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "ops-site-operations-workspace",
    "data-testid=\"ops-site-operations-workspace\"",
    "data-v370-site-operations-workspace",
    schema,
    "dashSiteOperationsWorkspaceBadges",
    "dashSiteOperationsWorkspaceText",
    "dashSiteOperationsSiteList",
    "dashSiteOperationsHealthList",
    "dashSiteOperationsRunbookQueue",
    "dashSiteOperationsImpactDetail",
    "dashSiteOperationsBoundary",
  ]) {
    assertIncludes(block, snippet, "v370 site operations workspace shell");
    assertIncludes(extractNamedFunctionBlock(files.uiScript, "renderV370SiteOperationsWorkspace"), "dashSiteOperationsBoundary", "UI-095 block-scoped canonical product state");
    assert(!["requestJson(","fetch(","method: 'POST'","method: 'PUT'","method: 'DELETE'"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV370SiteOperationsWorkspace").includes(marker)), "UI-095 no-write explicit absence oracle");
    assert(!["rawJson","rawLocator","rawEvidenceIncluded: true","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV370SiteOperationsWorkspace").includes(marker)), "UI-095 raw-material-redaction explicit absence oracle");
    assert(!["sourceUrl","sourceURL","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV370SiteOperationsWorkspace").includes(marker)), "UI-095 source-url-redaction explicit absence oracle");
    assert(!["passwordHash","tokenHash","Authorization:","credentialValue"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV370SiteOperationsWorkspace").includes(marker)), "UI-095 credential-redaction explicit absence oracle");
    assert(!["debugCounters","Developer URL","debugMaterialExposed: true"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV370SiteOperationsWorkspace").includes(marker)), "UI-095 debug-redaction explicit absence oracle");
    assertIncludes(files.uiScript, "/ops/dashboard", "UI-095 canonical route obligation");
    assertIncludes(files.server, "media-server.ops.v370-site-operations-workspace-ui.v1", "UI-095 canonical schema obligation");
  }
});

check("site operations renderer loads site list, health, runbook queue, approvals, and impact detail", () => {
  const block = extractBlock(files.uiScript, "const renderV370SiteOperationsWorkspace", "const renderDashboardRootCause");
  for (const snippet of [
    "refreshV370SiteOperationsWorkspace",
    "v370SiteOperationsWorkspaceState",
    projectionRoute,
    healthRoute,
    impactRoute,
    runbookRoute,
    approvalRoute,
    "sourceRegistryProjectionItems",
    "siteHealthRollupItems",
    "siteImpactGraphNodes",
    "runbookInstanceLedgerEntries",
    "approvalTicketWorkflowItems",
    "dashSiteOperationsSiteList",
    "dashSiteOperationsHealthList",
    "dashSiteOperationsRunbookQueue",
    "dashSiteOperationsImpactDetail",
    "requestJson(projectionRoute)",
    "requestJson(approvalRoute)",
  ]) {
    assertIncludes(block, snippet, "v370 site operations workspace renderer");
  }
});

check("dashboard refresh wires the site operations workspace without write actions", () => {
  const block = extractBlock(files.uiScript, "async function refreshDashboard()", "let opsVlmSelectedOptionId");
  for (const snippet of [
    "refreshV370SiteOperationsWorkspace",
    projectionRoute,
    healthRoute,
    impactRoute,
    runbookRoute,
    approvalRoute,
  ]) {
    assertIncludes(block, snippet, "v370 site operations workspace refresh");
  }
  for (const forbidden of [
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "sourceChangeApplied: true",
    "runbookInstancePersisted: true",
    "approvalTicketWritePerformed: true",
    "clientNoticeSent: true",
  ]) {
    assert(!block.includes(forbidden), `site operations workspace must stay read-only: ${forbidden}`);
  }
});

check("site operations workspace styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-site-operations-workspace",
    ".ops-site-operations-grid",
    ".ops-site-operations-list",
    ".ops-site-operations-entry",
    ".ops-site-operations-boundary",
    "body.ops-shell .ops-site-operations-workspace",
  ]) {
    assertIncludes(files.css, snippet, "v370 site operations workspace CSS");
  }
});

check("client/viewer scripts do not expose v3.7 site operations operator material", () => {
  for (const forbidden of [
    schema,
    "ops-site-operations-workspace",
    "data-v370-site-operations-workspace",
    projectionRoute,
    healthRoute,
    impactRoute,
    runbookRoute,
    approvalRoute,
    "runbookInstanceLedgerEntries",
    "approvalTicketWorkflowItems",
    "operatorNote",
    "reviewer",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose site operations material: ${forbidden}`);
  }
});

check("roadmap records v3.7 Step 11 without overclaiming UI fulltest or longrun", () => {
  for (const snippet of [
    "| 11 | v3.7.0 (11) Site Operations Workspace UI | P1 | 완료 |",
    "## v3.7.0 Step 11 개발 기록",
    "AppendOpsDashboardPage",
    "renderV370SiteOperationsWorkspace",
    "ops-site-operations-workspace",
    projectionRoute,
    healthRoute,
    impactRoute,
    runbookRoute,
    approvalRoute,
    `\`./server.sh ${command}\``,
    "Client Notice by Site/View Group 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.7 Step 11");
  }
});

check("stream verification exposes v3.7 Step 11 command and boundary", () => {
  for (const snippet of [
    `| v3.7.0 (11) | \`./server.sh ${command}\` | Site Operations Workspace UI.`,
    "/ops",
    "site list, health rollup, runbook queue, impact detail",
    "source URL/raw locator/raw JSON/debug/credential material",
    "UI 풀테스트 직접 조작",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.7 Step 11");
  }
});

check("feature inventory and release records map v3.7 Step 11", () => {
  for (const snippet of [
    `v3.7.0 (11) Site Operations Workspace UI | \`UI-095\`, \`SAFE-172\`, \`OPS-139\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-095 | V370 Step 11 Site Operations Workspace UI",
    "SAFE-172 | V370 Step 11 site operations workspace boundary",
    "OPS-139 | V370 Step 11 Site Operations Workspace UI 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.7 Step 11");
  }
  for (const snippet of [
    "V370 Site Operations Workspace UI",
    `\`./server.sh ${command}\``,
    "v370 Step 11 RED site operations workspace UI gate",
    "v370 Step 11 site operations workspace UI final",
    "v370 Step 11 UI 풀테스트",
    "v370 Step 11 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.7 Step 11");
  }
});

check("server entrypoint and inventory verifiers include v3.7 Step 11 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v370_site_operations_workspace_ui.mjs", "server.sh script dispatch");
  for (const snippet of [
    "validateImplementationManifest",
    "semantic.verifierAssertion.command",
    'kind: "stability"',
  ]) {
    assertIncludes(files.featureCoverageVerifier, snippet, "feature coverage verifier canonical command mapping");
  }
  for (const id of ["UI-095", "SAFE-172", "OPS-139"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v370_site_operations_workspace_ui.mjs", "script inventory");
});

check("SAFE-172 canonical bounded no-execution boundary", () => {
  const block = extractNamedFunctionBlock(files.uiScript, "renderV370SiteOperationsWorkspace");
  const routeObserved = files.uiScript.includes("/ops");
  const safe172BoundaryObserved = block.includes("sourceRegistryProjectionItems");
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
  assert(routeObserved && safe172BoundaryObserved && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && sendPerformed === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-172 sourceRegistryProjectionItems must remain bounded no-execution no-write redacted and client/provider isolated");
});

const results = runChecks();
console.log("");
console.log("== v3.7.0 site operations workspace UI summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.7.0 (11)");
console.log("- route: /ops");
console.log("- flow: site list -> health rollup -> runbook queue -> impact detail");
console.log("- writes: no source/view/runbook/approval/client/media mutation performed");
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

function check(name, fn) { checks.push({ name, fn }); }
function readText(relativePath) { return fs.readFileSync(path.join(rootDir, relativePath), "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function assertIncludes(text, needle, label) { assert(text.includes(needle), `${label} missing snippet: ${needle}`); }
function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
