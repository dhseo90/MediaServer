#!/usr/bin/env node
// 파일 용도: v3.5.0 Step 5 Staged Change Plan and Impact Preview 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.5.0 Staged Change Plan and Impact Preview verification

Usage:
  ./server.sh verify-v350-staged-change-plan-impact-preview

Checks:
  - /ops/api/live-operations/staged-change-plan-impact-preview exposes source/view/rule follow-up staging plans
  - each staged plan reports impact preview and blockers before any apply path exists
  - the preview remains read-only/staging-only and does not mutate source, view, rule, EventRecord, Ops audit, client, or media/schema contracts
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v350-staged-change-plan-impact-preview";
const schema = "media-server.ops.v350-staged-change-plan-impact-preview.v1";
const route = "/ops/api/live-operations/staged-change-plan-impact-preview";
const commandPlanRoute = "/ops/api/live-operations/command-plan";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
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

check("Ops server builds the v3.5 staged change plan impact preview model", () => {
  for (const snippet of [
    "struct OpsV350StagedChangePlan",
    "struct OpsV350ImpactPreview",
    "struct OpsV350StagedChangePlanSummary",
    "BuildV350StagedChangePlans",
    "BuildV350StagedChangePlanSummary",
    "AppendV350StagedChangePlanJson",
    "AppendV350ImpactPreviewJson",
    "OpsV350StagedChangePlanImpactPreviewJson",
    schema,
    "stagedChangePlanSummary",
    "stagedChangePlans",
    "impactPreview",
    "blockers",
    "sourceChangeCandidate",
    "publishedViewChangeCandidate",
    "ruleFollowUpChangeCandidate",
    "stagingOnly",
    "applyBlocked",
  ]) {
    assertIncludes(files.server, snippet, "v350 staged change plan server model");
  }
});

check("staged change plans derive from command plan and graph context before apply", () => {
  const block = extractBlock(files.server, "struct OpsV350StagedChangePlan", "std::string OpsV350StagedChangePlanImpactPreviewJson");
  for (const snippet of [
    "BuildV350LiveOperationsGraphContext",
    "BuildV350CommandPlanCandidates",
    "OpsV350CommandPlanCandidate",
    "sourceChangeCandidate",
    "publishedViewChangeCandidate",
    "ruleFollowUpChangeCandidate",
    "clientImpact",
    "operatorApprovalRequired",
    "blockedReason",
    "impactPreview",
    "blockers",
    "beforeApply",
  ]) {
    assertIncludes(block, snippet, "v350 staged change plan derivation");
  }
});

check("staged change plan preserves read-only staging-only boundaries", () => {
  const block = extractBlock(files.server, "std::string OpsV350StagedChangePlanImpactPreviewJson", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "stagingOnly",
    "applyBlocked",
    "sourceChangeApplied",
    "publishedViewChangeApplied",
    "ruleFollowUpApplied",
    "commandPlanExecuted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "rawDiagnosticJsonIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    assertIncludes(block, snippet, "v350 staged change plan boundary flags");
  }
  for (const flag of [
    "sourceChangeApplied",
    "publishedViewChangeApplied",
    "ruleFollowUpApplied",
    "commandPlanExecuted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "rawDiagnosticJsonIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    const index = block.indexOf(flag);
    const nearby = block.slice(index, index + 128);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  for (const forbidden of [
    "CreateSource(",
    "UpsertSource(",
    "DisableSource(",
    "CreateView(",
    "UpsertView(",
    "DisableView(",
    "AppendOpsAuditRecord(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "\"httpUrl\"",
    "\"webrtcSourceId\"",
    "credentialRef",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `staged change plan must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the staged change plan route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/");
  assertIncludes(block, route, "staged change plan route");
  assertIncludes(block, "request.method == \"GET\"", "staged change plan route");
  assertIncludes(block, "require_ops_principal()", "staged change plan route");
  assertIncludes(block, "OpsV350StagedChangePlanImpactPreviewJson(", "staged change plan route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "staged change plan route");
  assertIncludes(block, "Cache-Control", "staged change plan route");
  assertIncludes(block, "no-store", "staged change plan route");
  assert(!block.includes("require_source_write_principal"), "staged change plan route must not require source writes");
});

check("roadmap records v3.5 Step 5 as staging preview, not apply execution", () => {
  for (const snippet of [
    "| 5 | v3.5.0 (5) Staged Change Plan and Impact Preview | P0 | 완료 |",
    "source/view/rule follow-up 변경 후보를 적용 전 staging plan으로 만들고 영향도와 blocker 표시",
    "## v3.5.0 Step 5 개발 기록",
    route,
    "OpsV350StagedChangePlanImpactPreviewJson",
    "`./server.sh verify-v350-staged-change-plan-impact-preview`",
    "변경 적용, source/view/rule write, client notice 발송 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.5 Step 5");
  }
});

check("stream verification exposes v3.5 Step 5 command and boundary", () => {
  for (const snippet of [
    `| v3.5.0 (5) | \`./server.sh ${command}\` | Staged Change Plan and Impact Preview.`,
    route,
    "source/view/rule follow-up 변경 후보",
    "before-apply impact preview",
    "staging-only/read-only",
    "source/view/rule/EventRecord/Ops audit/client/media mutation 미수행",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.5 Step 5");
  }
});

check("feature inventory and release records map v3.5 Step 5", () => {
  for (const snippet of [
    `v3.5.0 (5) Staged Change Plan and Impact Preview | \`SRC-046\`, \`RULE-106\`, \`LAB-092\`, \`SAFE-139\`, \`OPS-106\` | \`${command}\``,
    "SRC-046 | V350 Step 5 source/view staged change candidate",
    "RULE-106 | V350 Step 5 rule follow-up staged change candidate",
    "LAB-092 | V350 Step 5 staging impact preview harness",
    "SAFE-139 | V350 Step 5 staged change no-apply boundary",
    "OPS-106 | V350 Step 5 Staged Change Plan and Impact Preview 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.5 Step 5");
  }
  for (const snippet of [
    "V350 Staged Change Plan and Impact Preview",
    `\`./server.sh ${command}\``,
    "v350 Step 5 RED staged change plan gate",
    "v350 Step 5 staged change plan final",
    "v350 Step 5 UI 풀테스트",
    "v350 Step 5 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.5 Step 5");
  }
});

check("server entrypoint and inventory verifiers include v3.5 Step 5 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v350_staged_change_plan_impact_preview.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["SRC-046", "RULE-106", "LAB-092", "SAFE-139", "OPS-106"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v350_staged_change_plan_impact_preview.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.5.0 staged change plan impact preview summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.5.0 (5)");
console.log(`- route: ${route}`);
console.log("- candidates: source change, published view change, rule follow-up change");
console.log("- writes: no source/view/rule/client/EventRecord/Ops audit/media mutation performed");
console.log("- apply: blocked/not executed by this contract");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
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

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
