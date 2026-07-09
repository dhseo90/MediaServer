#!/usr/bin/env node
// 파일 용도: v3.9.0 Step 14 VLM evaluation promotion guard 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 VLM evaluation promotion guard verification

Usage:
  ./server.sh verify-v390-vlm-evaluation-promotion-guard

Checks:
  - /ops/api/vlm/evaluation-promotion-guard exposes the Step 14 product decision
  - passed evaluation candidates can be promoted only through operator draft/save/activation review
  - invalid active/enabled states are rejected by the existing profile storage validation
  - runtime/provider calls, sidecar writes, client exposure, and media/event schemas remain unchanged
  - route/UI/docs/inventory/release records/dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-vlm-evaluation-promotion-guard";
const targetScript = "verify_v390_vlm_evaluation_promotion_guard.mjs";
const schema = "media-server.ops.v390-vlm-evaluation-promotion-guard.v1";
const route = "/ops/api/vlm/evaluation-promotion-guard";
const evaluationRoute = "/ops/api/vlm/evaluation-results";
const profileRoute = "/ops/api/vlm/profiles";
const featureIds = ["UI-111", "LAB-123", "SAFE-206", "OPS-173"];
const files = loadFiles();
const checks = [];

check("Ops server exposes the v3.9 VLM evaluation promotion guard", () => {
  for (const snippet of [
    "OpsV390VlmEvaluationPromotionGuardJson",
    schema,
    route,
    "V390-ADD1-03",
    "server-verified-evaluation-promotion",
    "operator-select-candidate-then-server-verify-save",
    "clientDeclaredEvaluationRejected",
    "serverCanonicalEvaluationStored",
    "invalidStatesRejected",
    "sourceEvaluationRoute",
    "profileSaveRoute",
  ]) {
    assertIncludes(files.server, snippet, "v390 VLM evaluation promotion guard server model");
  }
});

check("promotion guard is read-only and preserves runtime/provider boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV390VlmEvaluationPromotionGuardJson",
    "std::string OpsVlmPrivacyTransferGuardJson",
  );
  for (const snippet of [
    "manualPromotionRequired",
    "operatorSaveRequired",
    "operatorActivationReviewRequired",
    "passedEvaluationRequiredForActive",
    "profileWritePerformedByGuard",
    "activationPerformedByGuard",
    "runtimeVlmCallPerformed",
    "cloudProviderApiCalled",
    "sidecarWritePerformed",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "viewerClientExposureAdded",
  ]) {
    assertIncludes(block, snippet, "v390 VLM evaluation promotion guard boundaries");
  }
  for (const flag of [
    "profileWritePerformedByGuard",
    "activationPerformedByGuard",
    "runtimeVlmCallPerformed",
    "cloudProviderApiCalled",
    "sidecarWritePerformed",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "viewerClientExposureAdded",
  ]) {
    assertFlagFalse(block, flag);
  }
  for (const state of [
    "review-required-active",
    "failed-active",
    "enabled-without-active-status",
    "active-without-enabled",
  ]) {
    assertIncludes(block, state, "v390 VLM evaluation invalid state guard");
  }
});

check("Ops API exposes the guard as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "v390 VLM evaluation promotion guard route");
  assertIncludes(block, "request.method == \"GET\"", "v390 VLM evaluation promotion guard route");
  assertIncludes(block, "require_ops_principal()", "v390 VLM evaluation promotion guard route");
  assertIncludes(block, "OpsV390VlmEvaluationPromotionGuardJson()", "v390 VLM evaluation promotion guard route");
  assertIncludes(block, "Cache-Control", "v390 VLM evaluation promotion guard route");
  assertIncludes(block, "no-store", "v390 VLM evaluation promotion guard route");
  assert(!block.includes("require_rule_write_principal"), "promotion guard summary is read-only and must not require rule write principal");

  const evaluationBlock = extractRouteBlock(files.server, evaluationRoute);
  assertIncludes(evaluationBlock, "require_ops_principal()", "evaluation result route must remain ops guarded");
  const profileBlock = extractRouteBlock(files.server, profileRoute);
  assertIncludes(profileBlock, "require_ops_principal()", "profile list route must remain ops guarded");
  assertIncludes(files.server, "require_rule_write_principal()", "profile writes must still require rule write principal");
});

check("existing profile validation rejects invalid promotion/activation states", () => {
  for (const snippet of [
    "enabled VLM profile requires passed evaluation and active activation",
    "active VLM profile must be enabled",
    "VLM profile activation.status is not supported",
    "disabled VLM profile requires disabledReason",
    "fallbackProfileId",
    "activation_enabled && (evaluation_status != \"passed\" || activation_status != \"active\")",
    "!activation_enabled && activation_status == \"active\"",
  ]) {
    assertIncludes(files.server, snippet, "VLM profile activation validation");
  }
  assertIncludes(files.profileVerifier, "active-requires-passed-evaluation", "profile verifier invalid fixture coverage");
  for (const snippet of [
    "ValidateVlmEvaluationPromotion",
    "expected_catalog_revision",
    "expected_provenance_digest",
    "server-candidate-option-model-prompt-revision-digest-binding",
    "server-verified-evaluation-catalog",
  ]) assertIncludes(files.promotionModule, snippet, "server-owned VLM promotion validator");
});

check("Ops VLM UI renders the promotion guard and keeps manual save wording", () => {
  for (const snippet of [
    route,
    "loadOpsVlmEvaluationPromotionGuard",
    "renderOpsVlmEvaluationPromotionGuard",
    "opsVlmEvaluationPromotionGuardStatus",
    "server-verified-evaluation-promotion",
    "serverVerification=true",
    "clientDeclaredEvaluationRejected=true",
    "runtimeCall=false",
    "providerCall=false",
  ]) {
    assertIncludes(files.pageScript, snippet, "v390 VLM evaluation promotion guard UI script");
  }
  for (const snippet of [
    "opsVlmEvaluationPromotionGuardStatus",
    "promotion guard",
    "operator-select-candidate-then-server-verify-save",
  ]) {
    assertIncludes(files.server, snippet, "v390 VLM evaluation promotion guard UI shell");
  }
  assertIncludes(files.opsClientUiSmoke, "opsVlmEvaluationPromotionGuardStatus", "ops client UI smoke");
});

check("roadmap, stream verification, inventory, and release records map v3.9 Step 14", () => {
  for (const snippet of [
    "| 14 | v3.9.0 (14) VLM evaluation promotion guard | P1 | 완료 |",
    "V390-CAND-004",
    route,
    "OpsV390VlmEvaluationPromotionGuardJson",
    `\`./server.sh ${command}\``,
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.9 Step 14");
  }
  for (const snippet of [
    `| v3.9.0 (14) | \`./server.sh ${command}\` | VLM evaluation promotion guard.`,
    "server-verified-evaluation-promotion",
    "operator-select-candidate-then-server-verify-save",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.9 Step 14");
  }
  for (const snippet of [
    "V390-ADD1-03 VLM evaluation promotion trust boundary",
    "UI-111 | V390 VLM server-verified promotion UI",
    "LAB-123 | V390 VLM server-owned evaluation catalog binding",
    "SAFE-206 | V390 VLM client-forged promotion rejection boundary",
    "OPS-173 | V390 VLM promotion trust boundary gate",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.9 Step 14");
  }
  for (const snippet of [
    "V390 VLM Evaluation Promotion Guard",
    `\`./server.sh ${command}\``,
    "v390 Step 14 RED VLM evaluation promotion guard gate",
    "v390 Step 14 VLM evaluation promotion guard final",
    "v390 Step 14 UI 풀테스트",
    "v390 Step 14 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.9 Step 14");
  }
});

check("server entrypoint and inventory verifiers include v3.9 Step 14 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, targetScript, "server.sh script dispatch");
  assertIncludes(files.implementationManifest, "verify-v390-vlm-promotion-trust-boundary", "feature implementation manifest");
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, targetScript, "script inventory");
});

finish("== v3.9.0 VLM evaluation promotion guard ==", {
  schema,
  step: "v3.9.0 (14)",
  route,
});

function loadFiles() {
  return {
    server: readText("src/ingress/webrtc_http_server.cpp"),
    promotionModule: readText("src/ingress/vlm_evaluation_promotion.cpp"),
    pageScript: readText("src/ingress/product_ui_page_scripts.cpp"),
    opsClientUiSmoke: readText("scripts/internal/verify_ops_client_ui_smoke.mjs"),
    profileVerifier: readText("scripts/internal/verify_vlm_profile_storage.mjs"),
    backlog: readText("docs/development-backlog.md"),
    streamVerification: readText("docs/stream-verification.md"),
    featureInventory: readText("docs/project-feature-test-inventory.md"),
    implementationManifest: readText("test/fixtures/project_feature_implementation_evidence.json"),
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
  console.log(`- schema: ${summary.schema}`);
  console.log(`- step: ${summary.step}`);
  console.log(`- route: ${summary.route}`);
  console.log("- profileWritePerformedByGuard: false");
  console.log("- activationPerformedByGuard: false");
  console.log("- runtimeVlmCallPerformed: false");
  console.log("- cloudProviderApiCalled: false");
  console.log("- sidecarWritePerformed: false");
  console.log("- uiFulltest: not-run-by-this-command");
  console.log("- longrun30: not-run-by-this-command");
  console.log("- longrun120: not-run-by-this-command");
  console.log(`- pass: ${results.pass}`);
  console.log(`- fail: ${results.fail}`);
  if (results.fail > 0) process.exit(1);
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
      console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { pass, fail };
}

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
