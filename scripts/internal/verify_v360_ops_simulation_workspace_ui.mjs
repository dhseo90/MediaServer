#!/usr/bin/env node
// 파일 용도: v3.6.0 Step 7 Ops Simulation Workspace UI 구현, 문서, inventory 연결을 검증한다.
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
  printUsageAndExit(`v3.6.0 Ops Simulation Workspace UI verification

Usage:
  ./server.sh verify-v360-ops-simulation-workspace-ui

Checks:
  - /ops dashboard renders an Ops-only simulation workspace UI shell
  - the renderer loads simulation input pack, simulation run, impact diff, and readiness blocker read models
  - the workspace keeps simulation/operator material out of client/viewer scripts
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v360-ops-simulation-workspace-ui";
const schema = "media-server.ops.v360-simulation-workspace-ui.v1";
const inputPackRoute = "/ops/api/live-operations/simulation/input-pack";
const runContractRoute = "/ops/api/live-operations/simulation/run-contract";
const dryRunRoute = "/ops/api/live-operations/simulation/command-plan-dry-run";
const impactDiffRoute = "/ops/api/live-operations/simulation/impact-diff";
const readinessRoute = "/ops/api/live-operations/simulation/safe-apply-readiness";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
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

check("/ops dashboard declares the v3.6 simulation workspace UI shell", () => {
  const block = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "ops-simulation-workspace",
    "data-testid=\"ops-simulation-workspace\"",
    "data-v360-simulation-workspace",
    schema,
    "dashSimulationWorkspaceBadges",
    "dashSimulationWorkspaceText",
    "dashSimulationWorkspaceInputList",
    "dashSimulationWorkspaceRunList",
    "dashSimulationWorkspaceImpactList",
    "dashSimulationWorkspaceReadinessList",
    "dashSimulationWorkspaceBoundary",
  ]) {
    assertIncludes(block, snippet, "v360 simulation workspace dashboard shell");
    assertIncludes(extractNamedFunctionBlock(files.uiScript, "renderV360OpsSimulationWorkspace"), "dashSimulationWorkspaceBoundary", "UI-088 block-scoped canonical product state");
    assert(!["requestJson(","fetch(","method: 'POST'","method: 'PUT'","method: 'DELETE'"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV360OpsSimulationWorkspace").includes(marker)), "UI-088 no-write explicit absence oracle");
    assert(!["send(","sendClientNotice","deliveryQueueWritePerformed: true"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV360OpsSimulationWorkspace").includes(marker)), "UI-088 no-send explicit absence oracle");
    assertIncludes(files.uiScript, "/ops/dashboard", "UI-088 canonical route obligation");
    assertIncludes(files.server, "media-server.ops.v360-simulation-workspace-ui.v1", "UI-088 canonical schema obligation");
  }
});

check("/ops simulation workspace renderer loads simulation input, run, impact, and readiness data", () => {
  const block = extractBlock(files.uiScript, "const renderV360OpsSimulationWorkspace", "const renderDashboardRootCause");
  for (const snippet of [
    "refreshV360OpsSimulationWorkspace",
    "v360SimulationWorkspaceState",
    inputPackRoute,
    runContractRoute,
    dryRunRoute,
    impactDiffRoute,
    readinessRoute,
    "simulationInputPackItems",
    "simulationResultEnvelope",
    "commandPlanDryRunResults",
    "sourceRuleImpactDiffs",
    "safeApplyReadinessItems",
    "readinessState",
    "blockers",
    "dashSimulationWorkspaceInputList",
    "dashSimulationWorkspaceRunList",
    "dashSimulationWorkspaceImpactList",
    "dashSimulationWorkspaceReadinessList",
    "requestJson(inputPackRoute)",
    "requestJson(readinessRoute)",
  ]) {
    assertIncludes(block, snippet, "v360 simulation workspace renderer");
  }
});

check("dashboard refresh wires the simulation workspace read model without write actions", () => {
  const block = extractBlock(files.uiScript, "async function refreshDashboard()", "let opsVlmSelectedOptionId");
  for (const snippet of [
    "refreshV360OpsSimulationWorkspace",
    inputPackRoute,
    runContractRoute,
    dryRunRoute,
    impactDiffRoute,
    readinessRoute,
  ]) {
    assertIncludes(block, snippet, "v360 simulation workspace refresh");
  }
  for (const forbidden of [
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "sourceChangeApplied: true",
    "safeApplyPerformed: true",
    "clientNoticeSent: true",
    "commandPlanExecuted: true",
  ]) {
    assert(!block.includes(forbidden), `dashboard simulation workspace must stay read-only: ${forbidden}`);
  }
});

check("simulation workspace styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-simulation-workspace",
    ".ops-simulation-workspace-grid",
    ".ops-simulation-workspace-list",
    ".ops-simulation-workspace-entry",
    ".ops-simulation-boundary",
    "body.ops-shell .ops-simulation-workspace",
  ]) {
    assertIncludes(files.css, snippet, "v360 simulation workspace CSS");
  }
});

check("client/viewer scripts do not expose simulation operator material", () => {
  for (const forbidden of [
    schema,
    "ops-simulation-workspace",
    "data-v360-simulation-workspace",
    inputPackRoute,
    runContractRoute,
    dryRunRoute,
    impactDiffRoute,
    readinessRoute,
    "simulationInputPackItems",
    "simulationResultEnvelope",
    "safeApplyReadinessItems",
    "operatorApprovalRequired",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose simulation workspace material: ${forbidden}`);
  }
});

check("roadmap records v3.6 Step 7 without overclaiming UI fulltest or longrun", () => {
  for (const snippet of [
    "| 7 | v3.6.0 (7) Ops Simulation Workspace UI | P1 | 완료 |",
    "## v3.6.0 Step 7 개발 기록",
    "AppendOpsDashboardPage",
    "renderV360OpsSimulationWorkspace",
    "ops-simulation-workspace",
    inputPackRoute,
    readinessRoute,
    `\`./server.sh ${command}\``,
    "Simulation Run Ledger and Comparison 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.6 Step 7");
  }
});

check("stream verification exposes v3.6 Step 7 command and boundary", () => {
  for (const snippet of [
    `| v3.6.0 (7) | \`./server.sh ${command}\` | Ops Simulation Workspace UI.`,
    "/ops",
    "simulation input, run, impact diff, readiness blocker",
    "source URL/raw locator/raw JSON/debug/credential material",
    "UI 풀테스트 직접 조작",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.6 Step 7");
  }
});

check("feature inventory and release records map v3.6 Step 7", () => {
  for (const snippet of [
    `v3.6.0 (7) Ops Simulation Workspace UI | \`UI-088\`, \`SAFE-154\`, \`OPS-121\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-088 | V360 Step 7 Ops Simulation Workspace UI",
    "SAFE-154 | V360 Step 7 simulation workspace UI boundary",
    "OPS-121 | V360 Step 7 Ops Simulation Workspace UI 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.6 Step 7");
  }
  for (const snippet of [
    "V360 Ops Simulation Workspace UI",
    `\`./server.sh ${command}\``,
    "v360 Step 7 RED ops simulation workspace UI gate",
    "v360 Step 7 ops simulation workspace UI final",
    "v360 Step 7 UI 풀테스트",
    "v360 Step 7 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.6 Step 7");
  }
});

check("server entrypoint and inventory verifiers include v3.6 Step 7 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v360_ops_simulation_workspace_ui.mjs", "server.sh script dispatch");
  for (const snippet of [
    "validateImplementationManifest",
    "semantic.verifierAssertion.command",
    'kind: "stability"',
  ]) {
    assertIncludes(files.featureCoverageVerifier, snippet, "feature coverage verifier canonical command mapping");
  }
  for (const id of ["UI-088", "SAFE-154", "OPS-121"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v360_ops_simulation_workspace_ui.mjs", "script inventory");
});

check("SAFE-154 canonical bounded no-execution boundary", () => {
  const block = extractNamedFunctionBlock(files.uiScript, "renderV360OpsSimulationWorkspace");
  const routeObserved = files.uiScript.includes("/ops");
  const safe154BoundaryObserved = block.includes("readinessBlockers");
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
  assert(routeObserved && safe154BoundaryObserved && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && sendPerformed === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-154 readinessBlockers must remain bounded no-execution no-write redacted and client/provider isolated");
});

const results = runChecks();
console.log("");
console.log("== v3.6.0 ops simulation workspace UI summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.6.0 (7)");
console.log("- route: /ops");
console.log("- flow: simulation input -> run -> impact diff -> readiness blocker");
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
