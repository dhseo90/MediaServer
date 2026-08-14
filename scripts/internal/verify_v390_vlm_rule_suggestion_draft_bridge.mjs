#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.9.0 Step 13 VLM rule suggestion review-to-draft bridge 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 VLM rule suggestion draft bridge verification

Usage:
  ./server.sh verify-v390-vlm-rule-suggestion-draft-bridge

Checks:
  - /ops/api/vlm/rule-suggestion-draft-bridge exposes the Step 13 product bridge decision
  - the bridge ties incident review provenance to the existing /ops/rules draft-only workflow
  - rule/profile registry writes remain manual-save-only and no auto-apply/provider/runtime call is added
  - route/UI/docs/inventory/release records/dispatch are wired without changing media or event schemas
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-vlm-rule-suggestion-draft-bridge";
const targetScript = "verify_v390_vlm_rule_suggestion_draft_bridge.mjs";
const schema = "media-server.ops.v390-vlm-rule-suggestion-draft-bridge.v1";
const route = "/ops/api/vlm/rule-suggestion-draft-bridge";
const sourceRoute = "/ops/api/vlm/rule-suggestion-drafts";
const featureIds = ["UI-110", "RULE-111", "SAFE-205", "OPS-172"];
const files = loadFiles();
const checks = [];

check("Ops server exposes the v3.9 VLM rule suggestion draft bridge", () => {
  for (const snippet of [
    "OpsV390VlmRuleSuggestionDraftBridgeJson",
    schema,
    route,
    "V390-CAND-003",
    "ops-review-to-rule-draft-bridge",
    "incident-review-provenance",
    "manual-save-only",
    "sourceCandidateReportRoute",
    "reviewToDraftBridge",
  ]) {
    assertIncludes(files.server, snippet, "v390 VLM rule suggestion draft bridge server model");
  }
});

check("VLM bridge preserves draft-only/manual-save boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV390VlmRuleSuggestionDraftBridgeJson",
    "std::string OpsVlmRuleSuggestionDraftWorkflowJson",
  );
  for (const snippet of [
    "opsOnly",
    "reviewableDraft",
    "manualSaveRequired",
    "approvalRequiredBeforeSave",
    "candidateProvenanceIncluded",
    "ruleRegistryWritePerformedByBridge",
    "profileRegistryWritePerformedByBridge",
    "eventRecordWritePerformedByBridge",
    "autoApplyEnabled",
    "runtimeVlmCallPerformed",
    "cloudProviderApiCalled",
    "clientViewerExposureAdded",
    "eventPostPayloadChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "v390 VLM rule suggestion draft bridge boundaries");
  }
  for (const flag of [
    "ruleRegistryWritePerformedByBridge",
    "profileRegistryWritePerformedByBridge",
    "eventRecordWritePerformedByBridge",
    "autoApplyEnabled",
    "runtimeVlmCallPerformed",
    "cloudProviderApiCalled",
    "clientViewerExposureAdded",
    "eventPostPayloadChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertFlagFalse(block, flag);
  }
  const ruleRegistryWritePerformedByBridge = block.includes('\\"ruleRegistryWritePerformedByBridge\\":true');
  const autoApplyEnabled = block.includes('\\"autoApplyEnabled\\":true');
  const eventPostPayloadChanged = block.includes('\\"eventPostPayloadChanged\\":true');
  const viewerClientExposureAdded = block.includes('\\"clientViewerExposureAdded\\":true');
  const manualSaveRoute = "/ops/rules";
  persistAndReadBridgeContract({ manualSaveRoute, ruleRegistryWritePerformedByBridge,
    autoApplyEnabled, eventPostPayloadChanged, viewerClientExposureAdded });
  for (const forbidden of [
    "RuleRegistry",
    "ProfileRegistry",
    "StoreEventRecord",
    "runtimeVlmCallPerformed\":true",
    "cloudProviderApiCalled\":true",
  ]) {
    assert(!block.includes(forbidden), `bridge route must not write registries or call providers: ${forbidden}`);
  }
});

function persistAndReadBridgeContract(contract) {
  const bridgeArtifactPath = path.join(process.env.TMPDIR || "/tmp", `media-server-v390-rule-bridge-${process.pid}.json`);
  fs.writeFileSync(bridgeArtifactPath, JSON.stringify(contract));
  const bridgeArtifactReadback = JSON.parse(fs.readFileSync(bridgeArtifactPath, "utf8"));
  const mutationPerformed = bridgeArtifactReadback.eventPostPayloadChanged;
  assert(mutationPerformed === false && bridgeArtifactReadback.manualSaveRoute === "/ops/rules" &&
    bridgeArtifactReadback.ruleRegistryWritePerformedByBridge === false &&
    bridgeArtifactReadback.autoApplyEnabled === false &&
    bridgeArtifactReadback.eventPostPayloadChanged === false &&
    bridgeArtifactReadback.viewerClientExposureAdded === false,
  "RULE-111 /ops/rules bridge keeps registryWrite/autoApply/mutation Changed/client viewer exposure absent before manual save");
  fs.rmSync(bridgeArtifactPath, { force: true });
}

check("Ops API exposes the bridge as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "v390 VLM rule suggestion draft bridge route");
  assertIncludes(block, "request.method == \"GET\"", "v390 VLM rule suggestion draft bridge route");
  assertIncludes(block, "require_ops_principal()", "v390 VLM rule suggestion draft bridge route");
  assertIncludes(block, "OpsV390VlmRuleSuggestionDraftBridgeJson()", "v390 VLM rule suggestion draft bridge route");
  assertIncludes(block, "Cache-Control", "v390 VLM rule suggestion draft bridge route");
  assertIncludes(block, "no-store", "v390 VLM rule suggestion draft bridge route");
  assert(!block.includes("require_rule_write_principal"), "bridge summary is read-only and must not require rule write principal");

  const sourceBlock = extractRouteBlock(files.server, sourceRoute);
  assertIncludes(sourceBlock, "require_ops_principal()", "source draft route must remain ops guarded");
  assertIncludes(files.server, "\\\"manualSaveRequired\\\":true", "existing VLM rule draft workflow keeps manual save required");
  assertIncludes(files.server, "\\\"ruleRegistryWritePerformed\\\":false", "existing VLM rule draft workflow does not write registry");
  assertIncludes(files.server, "\\\"autoRuleApplied\\\":false", "existing VLM rule draft workflow does not auto apply");
});

check("Ops rules UI renders the bridge decision and provenance", () => {
  const rendererBlock = extractBlock(
    files.opsRulesScript,
    "function renderOpsVlmRuleSuggestionDraftBridge",
    "async function loadOpsVlmRuleSuggestionDraftBridge",
  );
  const loadBlock = extractBlock(
    files.opsRulesScript,
    "async function loadOpsVlmRuleSuggestionDraftBridge",
    "async function refreshOpsVlmRuleDrafts",
  );
  const serverBridgeBlock = extractBlock(
    files.server,
    "std::string OpsV390VlmRuleSuggestionDraftBridgeJson",
    "std::string OpsVlmRuleSuggestionDraftWorkflowJson",
  );
  for (const snippet of [
    route,
    "loadOpsVlmRuleSuggestionDraftBridge",
    "renderOpsVlmRuleSuggestionDraftBridge",
    "opsVlmRuleDraftBridgeStatus",
    "ops-review-to-rule-draft-bridge",
    "manualSaveRequired=true",
    "autoApply=false",
    "ruleRegistryWrite=false",
    "provenance=incident-review-provenance",
  ]) {
    assertIncludes(`${rendererBlock}\n${loadBlock}\n${serverBridgeBlock}`, snippet, "v390 VLM rule suggestion draft bridge UI script");
  }
  const opsRulesRoutePresent = files.server.includes('request.path == "/ops/rules"');
  const schemaPresent = serverBridgeBlock.includes("media-server.ops.v390-vlm-rule-suggestion-draft-bridge.v1");
  const ruleRegistryWritePerformedByBridge = serverBridgeBlock.includes('\\"ruleRegistryWritePerformed\\":true');
  const autoApply = serverBridgeBlock.includes('\\"autoApply\\":true') ||
    serverBridgeBlock.includes('\\"autoRuleApplied\\":true');
  assert(opsRulesRoutePresent, "v390 VLM draft bridge /ops/rules route missing");
  assert(schemaPresent, "v390 VLM draft bridge schema missing");
  assert(ruleRegistryWritePerformedByBridge === false,
    "OPS-172 v390 VLM draft bridge ruleRegistryWritePerformedByBridge must remain false");
  assert(autoApply === false, "v390 VLM draft bridge must not auto apply rules");
  assert(rendererBlock.includes("ops-review-to-rule-draft-bridge") &&
    serverBridgeBlock.includes('\\"autoApply\\":true') === false &&
    serverBridgeBlock.includes('\\"autoRuleApplied\\":true') === false,
  "UI-110 canonical draft bridge state must independently observe no auto apply");
  assertIncludes(rendererBlock, "ops-review-to-rule-draft-bridge", "v390 VLM draft bridge state");
  for (const snippet of [
    "opsVlmRuleDraftBridgeStatus",
    "review-to-draft bridge",
    "manual-save-only",
  ]) {
    assertIncludes(files.opsRulesPage, snippet, "v390 VLM rule suggestion draft bridge UI shell");
  }
});

check("roadmap, stream verification, inventory, and release records map v3.9 Step 13", () => {
  for (const snippet of [
    "| 13 | v3.9.0 (13) VLM rule suggestion draft bridge | P1 | 완료 |",
    "V390-CAND-003",
    route,
    "OpsV390VlmRuleSuggestionDraftBridgeJson",
    `\`./server.sh ${command}\``,
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.9 Step 13");
  }
  for (const snippet of [
    `| v3.9.0 (13) | \`./server.sh ${command}\` | VLM rule suggestion draft bridge.`,
    "review-to-draft bridge",
    "manual-save-only",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.9 Step 13");
  }
  for (const snippet of [
    `v3.9.0 (13) VLM rule suggestion draft bridge | \`UI-110\`, \`RULE-111\`, \`SAFE-205\`, \`OPS-172\` | \`${command}\`, \`verify-vlm-rule-suggestion-draft-workflow\`, \`verify-rule-ui\``,
    "UI-110 | V390 Step 13 VLM rule suggestion draft bridge UI",
    "RULE-111 | V390 Step 13 VLM review-to-rule draft bridge",
    "SAFE-205 | V390 Step 13 VLM rule suggestion no-auto-apply boundary",
    "OPS-172 | V390 Step 13 VLM draft bridge decision gate",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.9 Step 13");
  }
  for (const snippet of [
    "V390 VLM Rule Suggestion Draft Bridge",
    `\`./server.sh ${command}\``,
    "v390 Step 13 RED VLM rule suggestion draft bridge gate",
    "v390 Step 13 VLM rule suggestion draft bridge final",
    "v390 Step 13 UI 풀테스트",
    "v390 Step 13 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.9 Step 13");
  }
});

check("server entrypoint and inventory verifiers include v3.9 Step 13 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, targetScript, "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, 'check("exact implementation evidence manifest is valid"', "feature coverage verifier data-driven manifest gate");
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, targetScript, "script inventory");
});

finish("== v3.9.0 VLM rule suggestion draft bridge ==", {
  schema,
  step: "v3.9.0 (13)",
  route,
});

function loadFiles() {
  return {
    server: readWebRtcHttpServerBundle(readText),
    opsRulesPage: readText("src/ingress/product_ui_server_pages.cpp"),
    opsRulesScript: readText("src/ingress/product_ui_page_scripts.cpp"),
    backlog: readText("docs/development-backlog.md"),
    streamVerification: readText("docs/stream-verification.md"),
    featureInventory: readText("docs/project-feature-test-inventory.md"),
    featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
    projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
    scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
    releaseRecords: readText("docs/release-test-records.md"),
    serverSh: readText("server.sh"),
  };
}

function extractRouteBlock(text, routeNeedle) {
  const start = text.indexOf(`request.path == "${routeNeedle}"`);
  const startWithMethod = text.indexOf(`request.method == "GET" && request.path == "${routeNeedle}"`);
  const blockStart = startWithMethod >= 0 ? startWithMethod : start;
  assert(blockStart >= 0, `missing route: ${routeNeedle}`);
  const nextMethod = text.indexOf("\n                            if (request.method", blockStart + 1);
  const nextPath = text.indexOf("\n                            if (request.path", blockStart + 1);
  const ends = [nextMethod, nextPath].filter((index) => index > blockStart);
  const end = ends.length > 0 ? Math.min(...ends) : blockStart + 2400;
  return text.slice(blockStart, end);
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

function finish(title, summary) {
  const results = runChecks();
  console.log("");
  console.log(title);
  for (const [key, value] of Object.entries(summary)) {
    console.log(`- ${key}: ${value}`);
  }
  console.log("- decision: ops review-to-rule draft bridge; existing draft workflow remains manual-save-only");
  console.log("- writes: no rule/profile registry write by bridge, no auto apply, no provider/runtime call");
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
