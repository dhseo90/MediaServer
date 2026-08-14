#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.5.0 Step 6 Ops Command Workspace UI 구현, 문서, inventory 연결을 검증한다.
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
  printUsageAndExit(`v3.5.0 Ops Command Workspace UI verification

Usage:
  ./server.sh verify-v350-ops-command-workspace-ui

Checks:
  - /ops dashboard renders an Ops-only command workspace UI shell
  - the renderer loads incident, source, drill, staged plan, and client impact in one read-only flow
  - the workspace keeps command/staged plan/client impact material out of client/viewer scripts
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v350-ops-command-workspace-ui";
const schema = "media-server.ops.v350-command-workspace-ui.v1";
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

const graphRoute = "/ops/api/live-operations/graph";
const commandPlanRoute = "/ops/api/live-operations/command-plan";
const stagedPlanRoute = "/ops/api/live-operations/staged-change-plan-impact-preview";
const reviewRoute = "/ops/api/events/reviews";
const checks = [];

check("/ops dashboard declares the v3.5 command workspace UI shell", () => {
  const block = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "ops-command-workspace",
    "data-testid=\"ops-command-workspace\"",
    "data-v350-command-workspace",
    schema,
    "dashCommandWorkspaceBadges",
    "dashCommandWorkspaceText",
    "dashCommandWorkspaceFlow",
    "dashCommandWorkspacePlanList",
    "dashCommandWorkspaceImpactList",
    "dashCommandWorkspaceBoundary",
  ]) {
    assertIncludes(block, snippet, "v350 command workspace dashboard shell");
  }
});

check("/ops command workspace renderer loads incident, source, drill, staged plan, and client impact together", () => {
  const block = extractBlock(files.uiScript, "const v350CommandWorkspaceCard", "const renderDashboardRootCause");
  for (const snippet of [
    "renderV350OpsCommandWorkspace",
    "v350CommandWorkspaceState",
    graphRoute,
    commandPlanRoute,
    stagedPlanRoute,
    reviewRoute,
    "liveOperationsGraph",
    "commandPlanCandidates",
    "stagedChangePlans",
    "incidentCommandHandoff",
    "clientImpact",
    "continuityDrill",
    "stagedPlan",
    "data-v350-command-workspace-flow",
    "data-command-workspace-step",
    "v350CommandWorkspaceCard('incident'",
    "v350CommandWorkspaceCard('source'",
    "v350CommandWorkspaceCard('drill'",
    "v350CommandWorkspaceCard('staged-plan'",
    "v350CommandWorkspaceCard('client-impact'",
    "renderBadges('dashCommandWorkspaceBadges'",
  ]) {
    assertIncludes(block, snippet, "v350 command workspace renderer");
    assertIncludes(extractNamedFunctionBlock(files.uiScript, "renderV350OpsCommandWorkspace"), "data-v350-command-workspace-flow", "UI-081 block-scoped canonical product state");
    assert(!["requestJson(","fetch(","method: 'POST'","method: 'PUT'","method: 'DELETE'"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV350OpsCommandWorkspace").includes(marker)), "UI-081 no-write explicit absence oracle");
    assert(!["rawJson","rawLocator","rawEvidenceIncluded: true","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV350OpsCommandWorkspace").includes(marker)), "UI-081 raw-material-redaction explicit absence oracle");
    assert(!["sourceUrl","sourceURL","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV350OpsCommandWorkspace").includes(marker)), "UI-081 source-url-redaction explicit absence oracle");
    assert(!["passwordHash","tokenHash","Authorization:","credentialValue"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV350OpsCommandWorkspace").includes(marker)), "UI-081 credential-redaction explicit absence oracle");
    assert(!["debugCounters","Developer URL","debugMaterialExposed: true"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV350OpsCommandWorkspace").includes(marker)), "UI-081 debug-redaction explicit absence oracle");
    assertIncludes(files.uiScript, "/ops/dashboard", "UI-081 canonical route obligation");
    assertIncludes(files.server, "media-server.ops.v350-command-workspace-ui.v1", "UI-081 canonical schema obligation");
  }
});

check("dashboard refresh wires the command workspace read model without write actions", () => {
  const block = extractBlock(files.uiScript, "async function refreshDashboard()", "let opsVlmSelectedOptionId");
  for (const snippet of [
    "refreshV350OpsCommandWorkspace",
    graphRoute,
    commandPlanRoute,
    stagedPlanRoute,
    reviewRoute,
  ]) {
    assertIncludes(block, snippet, "v350 command workspace refresh");
  }
  for (const forbidden of [
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "sourceChangeApplied",
    "clientNoticeSent: true",
    "commandPlanExecuted: true",
  ]) {
    assert(!block.includes(forbidden), `dashboard command workspace must stay read-only: ${forbidden}`);
  }
});

check("command workspace styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-command-workspace",
    ".ops-command-flow-grid",
    ".ops-command-flow-card",
    ".ops-command-plan-list",
    ".ops-command-impact-list",
    ".ops-command-boundary",
    "body.ops-shell .ops-command-workspace",
  ]) {
    assertIncludes(files.css, snippet, "v350 command workspace CSS");
  }
});

check("client/viewer scripts do not expose command workspace operator material", () => {
  for (const forbidden of [
    schema,
    "ops-command-workspace",
    "data-v350-command-workspace",
    graphRoute,
    commandPlanRoute,
    stagedPlanRoute,
    "commandPlanCandidates",
    "stagedChangePlans",
    "incidentCommandHandoff",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose command workspace material: ${forbidden}`);
  }
});

check("roadmap records v3.5 Step 6 without overclaiming longrun or UI fulltest", () => {
  for (const snippet of [
    "| 6 | v3.5.0 (6) Ops Command Workspace UI | P1 | 완료 |",
    "## v3.5.0 Step 6 개발 기록",
    "AppendOpsDashboardPage",
    "renderV350OpsCommandWorkspace",
    "ops-command-workspace",
    `\`./server.sh ${command}\``,
    "Drill Run Ledger and Plan Comparison 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.5 Step 6");
  }
});

check("stream verification exposes v3.5 Step 6 command and boundary", () => {
  for (const snippet of [
    `| v3.5.0 (6) | \`./server.sh ${command}\` | Ops Command Workspace UI.`,
    "/ops",
    "incident, source, drill, staged plan, client impact",
    "source URL/raw locator/raw JSON/debug/credential material",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.5 Step 6");
  }
});

check("feature inventory and release records map v3.5 Step 6", () => {
  for (const snippet of [
    `v3.5.0 (6) Ops Command Workspace UI | \`UI-081\`, \`SAFE-140\`, \`OPS-107\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-081 | V350 Step 6 Ops Command Workspace UI",
    "SAFE-140 | V350 Step 6 Ops command workspace UI boundary",
    "OPS-107 | V350 Step 6 Ops Command Workspace UI 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.5 Step 6");
  }
  for (const snippet of [
    "V350 Ops Command Workspace UI",
    `\`./server.sh ${command}\``,
    "v350 Step 6 RED ops command workspace UI gate",
    "v350 Step 6 UI 풀테스트",
    "v350 Step 6 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.5 Step 6");
  }
});

check("server entrypoint and inventory verifiers include v3.5 Step 6 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v350_ops_command_workspace_ui.mjs", "server.sh script dispatch");
  for (const snippet of [
    "validateImplementationManifest",
    "semantic.verifierAssertion.command",
    'kind: "stability"',
  ]) {
    assertIncludes(files.featureCoverageVerifier, snippet, "feature coverage verifier canonical command mapping");
  }
  for (const id of ["UI-081", "SAFE-140", "OPS-107"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v350_ops_command_workspace_ui.mjs", "script inventory");
});

check("SAFE-140 canonical Ops command workspace UI boundary", () => {
  const block = extractNamedFunctionBlock(files.uiScript, "renderV350OpsCommandWorkspace");
  const safe140BoundaryObserved = block.includes("const boundaryOk =") && block.includes("v350CommandWorkspaceCard('client-impact'");
  const commandPlanExecuted = /\b(?:fetch|requestJson|Execute|Write|Apply)[A-Za-z0-9_$:]*\s*\(/.test(block);
  const rawMaterialExposed = /rawLocator|credentialMaterial|debugMaterial/.test(block);
  const mutationPerformed = commandPlanExecuted;
  const sourceUrlExposed = /sourceUrl/.test(block);
  const credentialMaterialExposed = /credentialMaterial/.test(block);
  const debugMaterialExposed = /debugMaterial/.test(block);
  assert(safe140BoundaryObserved && commandPlanExecuted === false && mutationPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false,
    "SAFE-140 const boundaryOk = /ops command workspace must remain read-only without command execution mutation raw locator credential debug material");
});

const results = runChecks();
console.log("");
console.log("== v3.5.0 ops command workspace UI summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.5.0 (6)");
console.log("- route: /ops");
console.log("- flow: incident -> source -> drill -> staged plan -> client impact");
console.log("- writes: no source/view/rule/client/EventRecord/Ops audit/media mutation performed");
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
