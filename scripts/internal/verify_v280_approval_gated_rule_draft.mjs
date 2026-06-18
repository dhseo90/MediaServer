#!/usr/bin/env node
// 파일 용도: v2.8.0 S03 Approval-gated Rule Draft Readiness와 no-auto-save/no-auto-apply 경계를 검증한다.

import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readText("src/ingress/webrtc_http_server.cpp");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const manualChecklist = readText("docs/manual-ui-checklist.md");
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const serverSh = readText("server.sh");

check("roadmap records V280-S03 as active/completed approval-gated rule draft work", () => {
  assert(/\| 3 \| V280-S03 \| P0 \| (진행|완료) \| Approval-gated Rule Draft Readiness \|/.test(backlog),
    "backlog V280-S03 row must be 진행 or 완료 while S03 is under development");
  for (const snippet of [
    "media-server.ops.approval-gated-rule-draft-readiness.v1",
    "approval state",
    "validation summary",
    "staged draft",
    "no-auto-save/no-auto-apply",
    "rule registry 자동 write 없음",
    "verify-v280-approval-gated-rule-draft",
  ]) {
    assertIncludes(backlog, snippet, "V280-S03 backlog");
  }
});

check("Ops events API exposes approval-gated staged draft readiness without write side effects", () => {
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
  for (const snippet of [
    'data-testid="ops-approval-gated-rule-draft-readiness-events"',
    'data-approval-gated-rule-draft="events-to-rules-manual-approval"',
    'id="opsApprovalGatedRuleDraftReadinessBadges"',
    'id="opsApprovalGatedRuleDraftReadinessRows"',
    "Approval-gated Rule Draft Readiness",
  ]) {
    assertIncludes(server, snippet, "Ops events approval-gated rule draft shell");
  }
  for (const snippet of [
    'data-testid="ops-approval-gated-rule-draft-readiness"',
    'data-approval-gated-rule-draft="manual-approval-staged-only"',
    'id="opsApprovalGatedRuleDraftContext"',
    'id="opsApprovalGatedRuleDraftRows"',
    "approvalDraft=1",
  ]) {
    assertIncludes(server, snippet, "Ops rules approval-gated draft context shell");
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
  for (const snippet of [
    "| V280-S03 Approval-gated Rule Draft Readiness | `UI-056`, `RULE-104`, `EVT-056`, `LAB-080`, `SAFE-066` | `verify-v280-approval-gated-rule-draft`",
    "| UI-056 | `/ops/rules` Approval-gated Rule Draft Readiness |",
    "| RULE-104 | approval-gated staged rule draft 후보 |",
    "| EVT-056 | Ops approval-gated rule draft readiness state |",
    "| LAB-080 | V280-S03 approval-gated rule draft static guard |",
    "| SAFE-066 | V280-S03 approval-gated rule draft boundary |",
    "verify-v280-approval-gated-rule-draft",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S03 row");
  }
  assertIncludes(manualChecklist, "| V280-S03 Approval-gated Rule Draft Readiness | `UI-056`, `RULE-104`, `EVT-056`, `LAB-080`, `SAFE-066` |", "manual UI checklist S03 row");
  assertIncludes(coverageVerifier, "verify-v280-approval-gated-rule-draft", "feature inventory coverage S03 command");
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
    assert(!server.includes(forbidden) && !script.includes(forbidden) && !backlog.includes(forbidden),
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
