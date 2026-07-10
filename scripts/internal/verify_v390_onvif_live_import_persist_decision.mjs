#!/usr/bin/env node
// 파일 용도: v3.9.0 Step 12 ONVIF live import persist decision 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 ONVIF live import persist decision verification

Usage:
  ./server.sh verify-v390-onvif-live-import-persist-decision

Checks:
  - /ops/api/onvif/live-import-persist-decision exposes the Step 12 product decision
  - the decision keeps /ops/api/onvif/import-draft as notSaved:true and selects manual form-save handoff
  - explicit operator save uses one source/view paired route with server-owned compensating rollback
  - route/UI/docs/inventory/release records/dispatch are wired without adding import-draft auto-persist
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-onvif-live-import-persist-decision";
const targetScript = "verify_v390_onvif_live_import_persist_decision.mjs";
const atomicityCommand = "verify-v390-onvif-source-view-atomicity";
const atomicityScript = "verify_v390_onvif_source_view_atomicity.mjs";
const schema = "media-server.ops.v390-onvif-live-import-persist-decision.v1";
const route = "/ops/api/onvif/live-import-persist-decision";
const importDraftRoute = "/ops/api/onvif/import-draft";
const featureIds = ["UI-109", "SRC-066", "SAFE-204", "OPS-171"];
const files = loadFiles();
const checks = [];

check("Ops server exposes the v3.9 ONVIF live import persist decision", () => {
  for (const snippet of [
    "OpsV390OnvifLiveImportPersistDecisionJson",
    schema,
    route,
    "V390-CAND-002",
    "manual-form-save-handoff",
    "operator-save-channel-form-paired-rollback",
    "importDraftNotSavedPreserved",
    "oneShotPersistEnabled",
    "autoSourceViewWriteEnabled",
    "rollbackModel",
    "manualPairedSaveRoute",
    "paired-write-with-compensating-rollback",
    "second-write-failure-source-rollback",
  ]) {
    assertIncludes(files.server, snippet, "v390 ONVIF live import persist decision server model");
  }
});

check("ONVIF live import decision preserves source/view write boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV390OnvifLiveImportPersistDecisionJson",
    "std::string OpsV390OnvifCredentialProviderStatusSummaryJson",
  );
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "sourceWriteRequiredForManualSave",
    "manualPairedSaveRouteAdded",
    "importDraftEndpointNotSaved",
    "importDraftAutoPersistPerformed",
    "sourceRegistryWritePerformedByDecisionRoute",
    "publishedViewWritePerformedByDecisionRoute",
    "directPersistRouteAdded",
    "clientViewerExposureAdded",
    "credentialMaterialExposed",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "v390 ONVIF live import persist decision boundaries");
  }
  for (const flag of [
    "oneShotPersistEnabled",
    "autoSourceViewWriteEnabled",
    "importDraftAutoPersistPerformed",
    "sourceRegistryWritePerformedByDecisionRoute",
    "publishedViewWritePerformedByDecisionRoute",
    "directPersistRouteAdded",
    "clientViewerExposureAdded",
    "credentialMaterialExposed",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertFlagFalse(block, flag);
  }
  assertFlagTrue(block, "manualPairedSaveRouteAdded");
  for (const forbidden of [
    "SourceViewRegistry::Instance().UpsertSource",
    "SourceViewRegistry::Instance().UpsertPublishedView",
    "BuildOnvifLiveImportDraft(request.body)",
    "\"password\"",
    "\"credentialRef\":\"",
  ]) {
    assert(!block.includes(forbidden), `decision route must not perform import/persist or expose secrets: ${forbidden}`);
  }
});

check("Ops API exposes the decision as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "v390 ONVIF live import persist decision route");
  assertIncludes(block, "request.method == \"GET\"", "v390 ONVIF live import persist decision route");
  assertIncludes(block, "require_ops_principal()", "v390 ONVIF live import persist decision route");
  assertIncludes(block, "OpsV390OnvifLiveImportPersistDecisionJson()", "v390 ONVIF live import persist decision route");
  assertIncludes(block, "Cache-Control", "v390 ONVIF live import persist decision route");
  assertIncludes(block, "no-store", "v390 ONVIF live import persist decision route");
  assert(!block.includes("require_source_write_principal"), "decision summary is read-only and must not require source write principal");

  const importBlock = extractRouteBlock(files.server, importDraftRoute);
  assertIncludes(importBlock, "require_source_write_principal()", "import draft route must remain source-write guarded");
  assertIncludes(files.onvifImport, "\\\"notSaved\\\":true", "import draft must still declare notSaved true");
});

check("Ops sources UI renders the manual persist handoff decision", () => {
  for (const snippet of [
    route,
    "loadOnvifLiveImportPersistDecision",
    "renderOnvifLiveImportPersistDecision",
    "onvifPersistDecisionStatus",
    "manual-form-save-handoff",
    "oneShotPersist=false",
    "importDraftNotSaved=true",
    "sourceWriteRequired=true",
    "/ops/api/onvif/channels/{channelId}",
    "saveChannelSourceViewPair",
    "publishedView: viewPayload",
  ]) {
    assertIncludes(files.opsSourcesScript, snippet, "v390 ONVIF live import persist decision UI script");
  }
});

check("roadmap, stream verification, inventory, and release records map v3.9 Step 12", () => {
  for (const snippet of [
    "| 12 | v3.9.0 (12) ONVIF live import persist decision | P1 | 완료 |",
    "V390-CAND-002",
    route,
    "OpsV390OnvifLiveImportPersistDecisionJson",
    `\`./server.sh ${command}\``,
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.9 Step 12");
  }
  for (const snippet of [
    `| v3.9.0 (12) / V390-ADD1-05 | \`./server.sh ${atomicityCommand}\`, \`./server.sh ${command}\` | ONVIF import draft는 \`notSaved:true\``,
    "second-file failure source rollback",
    "actual HTTP 8개 case",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.9 Step 12");
  }
  for (const snippet of [
    `v3.9.0 (12) / V390-ADD1-05 ONVIF source/view paired save | \`UI-109\`, \`SRC-066\`, \`SAFE-204\`, \`OPS-171\` | \`${atomicityCommand}\`, \`${command}\`, \`verify-ops-client-ui\``,
    "UI-109 | V390 ONVIF paired save status UI",
    "SRC-066 | V390 ONVIF paired source/view save",
    "SAFE-204 | V390 ONVIF partial-save rollback boundary",
    "OPS-171 | V390 ONVIF source/view atomicity gate",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.9 Step 12");
  }
  for (const snippet of [
    "V390 ONVIF Live Import Persist Decision",
    `\`./server.sh ${command}\``,
    "v390 Step 12 RED ONVIF live import persist decision gate",
    "v390 Step 12 ONVIF live import persist decision final",
    "V390-ADD1-05 ONVIF source/view atomicity final",
    "v390 Step 12 UI 풀테스트",
    "v390 Step 12 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.9 Step 12");
  }
});

check("server entrypoint and inventory verifiers include v3.9 Step 12 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, targetScript, "server.sh script dispatch");
  assertIncludes(files.serverSh, atomicityCommand, "server.sh atomicity command");
  assertIncludes(files.serverSh, atomicityScript, "server.sh atomicity script dispatch");
  assertIncludes(files.featureInventory, command, "feature inventory decision verifier mapping");
  assertIncludes(files.featureInventory, atomicityCommand, "feature inventory atomicity verifier mapping");
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, targetScript, "script inventory");
});

finish("== v3.9.0 ONVIF live import persist decision ==", {
  schema,
  step: "v3.9.0 (12)",
  route,
});

function loadFiles() {
  return {
    server: readText("src/ingress/webrtc_http_server.cpp"),
    opsSourcesScript: readText("src/ingress/product_ui_ops_sources_script.cpp"),
    onvifImport: readText("src/ingress/onvif_live_import.cpp"),
    backlog: readText("docs/development-backlog.md"),
    streamVerification: readText("docs/stream-verification.md"),
    featureInventory: readText("docs/project-feature-test-inventory.md"),
    projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
    scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
    releaseRecords: readText("docs/release-test-records.md"),
    serverSh: readText("server.sh"),
  };
}

function extractRouteBlock(text, routeNeedle) {
  const start = text.indexOf(`request.path == "${routeNeedle}"`);
  assert(start >= 0, `missing route: ${routeNeedle}`);
  const next = text.indexOf("\n                        if (request.path", start + 1);
  return text.slice(start, next >= 0 ? next : start + 2400);
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}

function assertFlagFalse(text, flag) {
  const index = text.indexOf(flag);
  assert(index >= 0, `missing boundary flag: ${flag}`);
  assert(text.slice(index, index + 180).includes("false"), `boundary flag must be false: ${flag}`);
}

function assertFlagTrue(text, flag) {
  const index = text.indexOf(flag);
  assert(index >= 0, `missing boundary flag: ${flag}`);
  assert(text.slice(index, index + 180).includes("true"), `boundary flag must be true: ${flag}`);
}

function finish(title, summary) {
  const results = runChecks();
  console.log("");
  console.log(title);
  for (const [key, value] of Object.entries(summary)) {
    console.log(`- ${key}: ${value}`);
  }
  console.log("- decision: manual paired save handoff; import-draft remains notSaved:true; no one-shot import persist");
  console.log("- writes: paired source/view save uses compensating rollback; decision route remains read-only");
  console.log("- uiFulltest: not-run-by-this-command");
  console.log("- longrun30Or120: not-run-by-this-command");
  console.log(`- pass: ${results.pass}`);
  console.log(`- fail: ${results.fail}`);
  if (results.fail > 0) {
    process.exit(1);
  }
}

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

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing ${JSON.stringify(needle)}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
