#!/usr/bin/env node
import { validateFeatureDocumentation } from "./documentation_contract_lib.mjs";
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v2.8.0 S03 Approval-gated Rule Draft Readiness와 no-auto-save/no-auto-apply 경계를 검증한다.
import { extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readWebRtcHttpServerBundle(readText);
const productUiPages = readText("src/ingress/product_ui_server_pages.cpp");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const reviewDoc = readText("docs/vlm-ops-event-review-ui.md");
const inventory = readText("docs/project-feature-test-inventory.md");
const manualChecklist = readText("docs/manual-ui-checklist.md");
const streamVerification = readText("docs/stream-verification.md");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const implementationManifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
const serverSh = readText("server.sh");

const definitionIds = ["UI-056","RULE-104","EVT-056","LAB-080","SAFE-066"];
const currentDefinitions = inventory.split(/\r?\n/).filter(line => definitionIds.includes(line.split("|")[1]?.trim())).join("\n");

check("현행 계약·기능 정의·검증 명령 연결", () => {
  const errors = validateFeatureDocumentation({
    document: reviewDoc, identifiers: ["media-server.ops.approval-gated-rule-draft-readiness.v1"],
    command: "verify-v280-approval-gated-rule-draft", script: "verify_v280_approval_gated_rule_draft.mjs",
    featureIds: ["UI-056","RULE-104","EVT-056","LAB-080"], inventory, implementation: implementationManifest,
    verification: streamVerification, server: serverSh,
  });
  assert(errors.length === 0, errors.join("; "));
  // 독립 runtime 검사의 결속을 확인할 뿐 여기서 실행하거나 정적 검사로 대체하지 않는다.
  for (const [id, expectedCommand] of [["SAFE-066","verify-auth-routes"]]) {
    const rows = inventory.split(/\r?\n/).filter(line => line.split("|")[1]?.trim() === id);
    const entries = implementationManifest.items.filter(item => item.id === id);
    assert(rows.length === 1 && entries.length === 1 && entries[0].verifierEvidence?.command === expectedCommand,
      id + " 독립 실행 정의/명령 연결 누락 또는 중복");
  }
});

check("Ops events API exposes approval-gated staged draft readiness without write side effects", () => {
  const start = server.indexOf("std::string OpsApprovalGatedRuleDraftReadinessViewJson(");
  const end = server.indexOf("std::string OpsOperatorOutcomeMemoryViewJson(", start);
  assert(start >= 0 && end > start, "EVT-056 approval-gated draft projection block missing");
  const evt056ProjectionBlock = server.slice(start, end);
  const routeOwnerSource = readText("src/ingress/ops_event_route_owner.cpp");
  const routeBlock = routeOwnerSource.slice(routeOwnerSource.indexOf("constexpr const char* kOpsEventsPagePath"), routeOwnerSource.indexOf("bool HasPrefix("));
  assert(evt056ProjectionBlock.includes("media-server.ops.approval-gated-rule-draft-readiness.v1") && routeBlock.includes("/ops/api/events/reviews"), "LAB-080 approval-gated draft schema and review route readback mismatch");
  assertIncludes(evt056ProjectionBlock, "noAutoApply", "EVT-056 block-scoped canonical projection");
  assertIncludes(evt056ProjectionBlock, "webrtcDataChannelSchemaChanged", "EVT-056 WebRTC SSE boundary");
  assert(!evt056ProjectionBlock.includes("\\\"ruleRegistryWritePerformed\\\":true") && evt056ProjectionBlock.includes("\\\"ruleRegistryWritePerformed\\\":false"), "EVT-056 no-write registry boundary");
  const ruleRegistryWritePerformed = evt056ProjectionBlock.includes("\\\"ruleRegistryWritePerformed\\\":true");
  const autoRuleApplied = evt056ProjectionBlock.includes("\\\"noAutoApply\\\":false");
  const eventPostPayloadChanged = evt056ProjectionBlock.includes("\\\"eventPostPayloadChanged\\\":true");
  assert(ruleRegistryWritePerformed === false && autoRuleApplied === false && eventPostPayloadChanged === false, "RULE-104 approvalGatedRuleDraft staged-only registryWrite/autoApply/mutation Changed absence");
  for (const snippet of [
    "OpsApprovalGatedRuleDraftReadinessViewJson",
    "OpsApprovalGatedRuleDraftReadinessItemJson",
    "OpsApprovalGatedRuleDraftValidationState",
    "media-server.ops.approval-gated-rule-draft-readiness.v1",
    "\\\"approvalGatedRuleDraftReadiness\\\":",
    "\\\"approvalState\\\":",
    "\\\"validationSummary\\\":",
    "\\\"stagedDraft\\\":",
    "\\\"manualApprovalRequired\\\":true",
    "\\\"noAutoSave\\\":true",
    "\\\"noAutoApply\\\":true",
    "\\\"ruleRegistryWritePerformed\\\":false",
    "\\\"profileRegistryWritePerformed\\\":false",
    "\\\"fullReplayEngineExecuted\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
  ]) {
    assertIncludes(server, snippet, "Ops approval-gated rule draft API");
  }
});

check("/ops/events and /ops/rules render approval-gated staged draft readiness", () => {
  const approvalDraftBlock = extractNamedFunctionBlock(script, "renderOpsApprovalGatedRuleDraftContext");
  assertIncludes(approvalDraftBlock, "approvalDraft", "UI-056 block-scoped canonical product state");
  const ruleRegistryWritePerformed = ["requestJson(", "fetch(", "method: 'POST'", "method: 'PUT'", "method: 'DELETE'"].some(marker => approvalDraftBlock.includes(marker));
  assert(ruleRegistryWritePerformed === false, "UI-056 approval draft renderer must not write the rule registry");
  assert(!["requestJson(","fetch(","method: 'POST'","method: 'PUT'","method: 'DELETE'"].some(marker => approvalDraftBlock.includes(marker)), "UI-056 no-write explicit absence oracle");
  assert(!["autoRuleApplied: true","autoApply: true","applyRule("].some(marker => extractNamedFunctionBlock(script, "renderOpsApprovalGatedRuleDraftContext").includes(marker)), "UI-056 no-auto-apply explicit absence oracle");
  assertIncludes(script, "/ops/rules", "UI-056 canonical route obligation");
  for (const snippet of [
    'data-testid="ops-approval-gated-rule-draft-readiness-events"',
    'data-approval-gated-rule-draft="events-to-rules-manual-approval"',
    'id="opsApprovalGatedRuleDraftReadinessBadges"',
    'id="opsApprovalGatedRuleDraftReadinessRows"',
    "Approval-gated Rule Draft Readiness",
  ]) {
    assertIncludes(productUiPages, snippet, "Ops events approval-gated rule draft shell");
  }
  for (const snippet of [
    'data-testid="ops-approval-gated-rule-draft-readiness"',
    'data-approval-gated-rule-draft="manual-approval-staged-only"',
    'id="opsApprovalGatedRuleDraftContext"',
    'id="opsApprovalGatedRuleDraftRows"',
    "approvalDraft=1",
  ]) {
    assertIncludes(productUiPages, snippet, "Ops rules approval-gated draft context shell");
  }
  for (const snippet of [
    "renderApprovalGatedRuleDraftReadiness",
    "approvalGatedRuleDraftReadiness",
    "opsApprovalGatedRuleDraftReadinessRows",
    "renderOpsApprovalGatedRuleDraftContext",
    "approvalState",
    "validationSummary",
    "stagedDraft",
    "noAutoSave",
    "noAutoApply",
    "ruleRegistryWritePerformed",
  ]) {
    assertIncludes(script, snippet, "Ops approval-gated rule draft script");
  }
  for (const snippet of [
    ".approval-gated-rule-draft-readiness",
    ".approval-gated-rule-draft-readiness-list",
    ".approval-gated-rule-draft-readiness-card",
    ".approval-gated-rule-draft-grid",
    ".ops-approval-gated-rule-draft-list",
  ]) {
    assertIncludes(css, snippet, "Ops approval-gated rule draft CSS");
  }
});

check("smoke, inventory, manual UI, coverage, and command catalog track S03", () => {
  for (const snippet of [
    'data-testid="ops-approval-gated-rule-draft-readiness-events"',
    'id="opsApprovalGatedRuleDraftReadinessRows"',
    'data-testid="ops-approval-gated-rule-draft-readiness"',
    'id="opsApprovalGatedRuleDraftContext"',
    "approvalGatedRuleDraftReadiness",
    "approvalState",
    "validationSummary",
    "stagedDraft",
    "noAutoSave",
    "noAutoApply",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke marker");
  }
  assert(manualChecklist.split(/\r?\n/).some(line => definitionIds.every(id => line.includes("`" + id + "`")) && line.includes("verify-v280-approval-gated-rule-draft")), "manual UI checklist S03 row: 기능 ID·명령 연결 누락");
  for (const id of ["UI-056", "RULE-104", "EVT-056", "LAB-080"]) {
    assert(implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === "verify-v280-approval-gated-rule-draft", `${id} manifest verifier command drift`);
  }
  assertIncludes(coverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(coverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(streamVerification, "verify-v280-approval-gated-rule-draft", "stream verification S03 command");
  assertIncludes(serverSh, "verify-v280-approval-gated-rule-draft", "server.sh S03 command");
  assertIncludes(serverSh, "verify_v280_approval_gated_rule_draft.mjs", "server.sh S03 script target");
});

check("S03 keeps forbidden auto save/apply/replay/registry/schema/media side effects absent", () => {
  for (const forbidden of [
    "/client/api/approval-gated-rule-draft",
    "noAutoSave\\\":false",
    "noAutoApply\\\":false",
    "ruleRegistryWritePerformed\\\":true",
    "profileRegistryWritePerformed\\\":true",
    "autoRuleApplied\\\":true",
    "autoProfileApplied\\\":true",
    "fullReplayEngineExecuted\\\":true",
    "runtimeVlmCallPerformed\\\":true",
    "cloudProviderApiCalled\\\":true",
    "Event POST payload 변경 완료",
    "WebRTC DataChannel schema 변경 완료",
    "SSE/WS metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
  ]) {
    assert(!server.includes(forbidden) && !script.includes(forbidden) && !currentDefinitions.includes(forbidden),
      `forbidden S03 snippet present: ${forbidden}`);
  }
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.8.0 S03 approval-gated rule draft 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("[scope] uiFulltest: not-run-by-this-command; longrun30Or120: not-run-by-this-command");
console.log("== v2.8.0 S03 approval-gated rule draft 통과 ==");

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
