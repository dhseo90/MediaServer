#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v2.7.0 S04 Rule What-if Preview와 draft-only/manual-save 경계를 검증한다.
import { extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readWebRtcHttpServerBundle(readText);
const serverPages = readText("src/ingress/product_ui_server_pages.cpp");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const manualChecklist = readText("docs/manual-ui-checklist.md");
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const implementationManifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
const serverSh = readText("server.sh");
const roadmapEvidence = [backlog, inventory, manualChecklist].join("\n");

check("roadmap records V270-S04 as active/completed Rule What-if Preview work", () => {
  assert(
    /\| 4 \| V270-S04 \| P1 \| (진행|완료) \| Rule What-if Preview \|/.test(backlog) ||
      /\| V270-S04 \| 완료 \| Rule What-if Preview \|/.test(backlog),
    "backlog V270-S04 row must be 진행/완료 in active table or 완료 in completed baseline table"
  );
  for (const snippet of [
    "media-server.ops.rule-what-if-preview.v1",
    "selected incident/EventRecord",
    "rule suggestion 후보",
    "/ops/rules",
    "draft-only",
    "full replay engine",
    "자동 저장",
    "자동 적용",
    "verify-v270-rule-what-if-preview",
  ]) {
    assertIncludes(roadmapEvidence, snippet, "V270-S04 roadmap evidence");
  }
});

check("Ops events API exposes rule what-if preview without rule/media/schema side effects", () => {
  const start = server.indexOf("std::string OpsRuleWhatIfPreviewViewJson(");
  const end = server.indexOf("std::string OpsApprovalGatedRuleDraftReadinessViewJson(", start);
  assert(start >= 0 && end > start, "EVT-053 rule what-if projection block missing");
  const evt053ProjectionBlock = server.slice(start, end);
  assertIncludes(evt053ProjectionBlock, "manualSaveRequired", "EVT-053 block-scoped canonical projection");
  assert(evt053ProjectionBlock.includes("media-server.ops.rule-what-if-preview.v1") && evt053ProjectionBlock.includes("/ops/rules"), "LAB-077 rule what-if schema and /ops/rules draft route readback mismatch");
  const routeOwnerSource = readText("src/ingress/ops_event_route_owner.cpp");
  const routeBlock = routeOwnerSource.slice(routeOwnerSource.indexOf("constexpr const char* kOpsEventsPagePath"), routeOwnerSource.indexOf("bool HasPrefix("));
  assertIncludes(routeBlock, "/ops/api/events/reviews", "EVT-053 canonical review route");
  for (const snippet of [
    "OpsRuleWhatIfPreviewViewJson",
    "OpsRuleWhatIfPreviewItemJson",
    "OpsRuleWhatIfPreviewDraftJson",
    "media-server.ops.rule-what-if-preview.v1",
    "\\\"ruleWhatIfPreview\\\":",
    "\\\"draftComparison\\\":",
    "\\\"conditionPreview\\\":",
    "\\\"manualDraftRoute\\\":",
    "\\\"draftOnly\\\":true",
    "\\\"manualSaveRequired\\\":true",
    "\\\"fullReplayEngineExecuted\\\":false",
    "\\\"ruleRegistryWritePerformed\\\":false",
    "\\\"autoRuleApplied\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
  ]) {
    assertIncludes(server, snippet, "Ops rule what-if preview API");
  }
});

check("/ops/events UI renders selected incident rule what-if preview", () => {
  for (const snippet of [
    'data-testid="ops-rule-what-if-preview"',
    'data-rule-what-if-preview="selected-incident-draft-only"',
    'id="opsRuleWhatIfPreviewBadges"',
    'id="opsRuleWhatIfPreviewRows"',
    "Rule What-if Preview",
  ]) {
    assertIncludes(serverPages, snippet, "Ops rule what-if preview shell");
  }
  for (const snippet of [
    "renderRuleWhatIfPreview",
    "ruleWhatIfPreview",
    "opsRuleWhatIfPreviewRows",
    "draftComparison",
    "conditionPreview",
    "manualDraftRoute",
    "fullReplayEngineExecuted",
    "ruleRegistryWritePerformed",
  ]) {
    assertIncludes(script, snippet, "Ops rule what-if preview script");
    assertIncludes(extractNamedFunctionBlock(script, "renderRuleWhatIfPreview"), "ruleWhatIfPreview", "UI-053 block-scoped canonical product state");
    assert(!["requestJson(","fetch(","method: 'POST'","method: 'PUT'","method: 'DELETE'"].some(marker => extractNamedFunctionBlock(script, "renderRuleWhatIfPreview").includes(marker)), "UI-053 no-write explicit absence oracle");
    assert(!["autoRuleApplied: true","autoApply: true","applyRule("].some(marker => extractNamedFunctionBlock(script, "renderRuleWhatIfPreview").includes(marker)), "UI-053 no-auto-apply explicit absence oracle");
    assertIncludes(script, "/ops/events", "UI-053 canonical route obligation");
  }
  for (const snippet of [
    ".rule-what-if-preview",
    ".rule-what-if-preview-list",
    ".rule-what-if-preview-card",
    ".rule-what-if-preview-comparison",
  ]) {
    assertIncludes(css, snippet, "Ops rule what-if preview CSS");
  }
});

check("/ops/rules keeps draft-only what-if context visible without auto save", () => {
  for (const snippet of [
    'data-testid="ops-rule-what-if-preview-draft-context"',
    'id="opsRuleWhatIfDraftContext"',
    "opsRuleWhatIfDraftContextFromLocation",
    "renderOpsRuleWhatIfDraftContext",
    "whatIfPreview=1",
    "draftEventId",
    "저장은 운영자가 수동으로 실행",
  ]) {
    assertIncludes(script + serverPages, snippet, "Ops rules what-if draft context");
  }
});

check("smoke, inventory, manual UI, coverage, and command catalog track S04", () => {
  for (const snippet of [
    'data-testid="ops-rule-what-if-preview"',
    'id="opsRuleWhatIfPreviewRows"',
    "ruleWhatIfPreview",
    "draftComparison",
    "conditionPreview",
    "manualDraftRoute",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke marker");
  }
  for (const snippet of [
    "| V270-S04 Rule What-if Preview | `UI-053`, `EVT-053`, `LAB-077`, `SAFE-061` | `verify-v270-rule-what-if-preview` |",
    "| UI-053 | `/ops/events` Rule What-if Preview |",
    "| EVT-053 | Ops rule what-if preview view model |",
    "| LAB-077 | V270-S04 rule what-if preview static guard |",
    "| SAFE-061 | V270-S04 rule what-if preview boundary |",
    "verify-v270-rule-what-if-preview",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S04 row");
  }
  assertIncludes(manualChecklist, "| V270-S04 Rule What-if Preview | `UI-053`, `EVT-053`, `LAB-077`, `SAFE-061` |", "manual UI checklist S04 row");
  assert(implementationManifest.items.find(item => item.id === "LAB-077")?.verifierEvidence?.command === "verify-v270-rule-what-if-preview", "LAB-077 manifest verifier command drift");
  assertIncludes(coverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(coverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(streamVerification, "verify-v270-rule-what-if-preview", "stream verification S04 command");
  assertIncludes(serverSh, "verify-v270-rule-what-if-preview", "server.sh S04 command");
  assertIncludes(serverSh, "verify_v270_rule_what_if_preview.mjs", "server.sh S04 script target");
});

check("S04 keeps forbidden replay/rule/provider/schema/media side effects absent", () => {
  for (const forbidden of [
    "/client/api/rule-what-if-preview",
    "fullReplayEngineExecuted\\\":true",
    "ruleRegistryWritePerformed\\\":true",
    "autoRuleApplied\\\":true",
    "autoProfileApplied\\\":true",
    "runtimeVlmCallPerformed\\\":true",
    "cloudProviderApiCalled\\\":true",
    "Event POST payload 변경 완료",
    "WebRTC DataChannel schema 변경 완료",
    "SSE/WS metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
  ]) {
    assert(!server.includes(forbidden) && !serverPages.includes(forbidden) && !script.includes(forbidden) && !backlog.includes(forbidden),
      `forbidden S04 snippet present: ${forbidden}`);
  }
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.7.0 S04 rule what-if preview 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.7.0 S04 rule what-if preview 통과 ==");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function check(name, fn) {
  try {
    fn();
    console.log(`[pass] ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`[fail] ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}
