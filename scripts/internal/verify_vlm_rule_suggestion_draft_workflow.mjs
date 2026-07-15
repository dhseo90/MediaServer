#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: V210-S08 VLM rule suggestion draft workflow의 Ops-only/manual-save 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { extractCppFunctionBlock, exactBooleanFlagValue } from "./source_block_assertion_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM rule suggestion draft workflow verification

Usage:
  ./server.sh verify-vlm-rule-suggestion-draft-workflow

Checks:
  - V210-S08 fixture maps V200-S13 candidates into /ops/rules form drafts only.
  - Ops API reads sidecar candidates and returns draft-only/manual-save contract.
  - /ops/rules UI can apply candidates to the event-template form without save/write calls.
  - server command, script inventory, docs, and feature inventory are wired.
  - client/viewer exposure, runtime/provider calls, external schema changes, media path changes, and automatic rule/profile application are absent.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("fixture defines V210-S08 draft-only workflow", () => {
  const fixture = readJson("test/fixtures/vlm_rule_suggestion/draft_workflow.json");
  assert(fixture.schema === "media-server.vlm-rule-suggestion-draft-workflow-fixture.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V210-S08", "fixture target step mismatch");
  assert(fixture.sourceCandidateStep === "V200-S13", "fixture must point to existing candidate source step");
  const workflow = fixture.workflow || {};
  assert(workflow.primaryDraftRoute === "/ops/rules", "draft route must be /ops/rules");
  assert(workflow.apiRoute === "/ops/api/vlm/rule-suggestion-drafts", "API route mismatch");
  for (const key of [
    "manualSaveRequired",
  ]) {
    assert(workflow[key] === true, `workflow.${key} must be true`);
  }
  for (const key of [
    "autoApply",
    "ruleRegistryWritePerformed",
    "autoRuleApplied",
    "autoProfileApplied",
    "viewerClientExposureAdded",
  ]) {
    assert(workflow[key] === false, `workflow.${key} must be false`);
  }
  assert(Array.isArray(fixture.draftCases) && fixture.draftCases.length >= 3, "draft cases missing");
  for (const item of fixture.draftCases) {
    assert(item.expectedManualSaveRoute === "/ops/rules", `${item.id}: manual route mismatch`);
    assert(item.expectedWriteBeforeSave === false, `${item.id}: write before save must be false`);
  }
  assert(Array.isArray(fixture.excluded) && fixture.excluded.length >= 3, "excluded decisions missing");
});

check("Ops API route wraps existing candidate builder without requiring rule-write", () => {
  const server = readWebRtcHttpServerBundle(readText);
  const draftWorkflowBlock = extractCppFunctionBlock(server, "std::string OpsVlmRuleSuggestionDraftWorkflowJson(");
  assert(server.includes('\\"ruleRegistryWritePerformed\\":false'), "ruleRegistryWritePerformed must remain absent/false before manual save");
  assert(draftWorkflowBlock.includes("media-server.vlm-rule-suggestion-draft-workflow.v1") && exactBooleanFlagValue(draftWorkflowBlock, "ruleRegistryWritePerformed") === false, "draft workflow schema must not write the rule registry");
  assert(draftWorkflowBlock.includes("sourceCandidateReport") && exactBooleanFlagValue(draftWorkflowBlock, "autoRuleApplied") === false,
    "LAB-061 sourceCandidateReport draft workflow must not auto-apply a rule");
  for (const snippet of [
    "OpsVlmRuleSuggestionDraftWorkflowJson",
    "media-server.vlm-rule-suggestion-draft-workflow.v1",
    "\\\"targetStep\\\":\\\"V210-S08\\\"",
    "\\\"sourceCandidateStep\\\":\\\"V200-S13\\\"",
    "BuildVlmRuleSuggestionCandidates",
    "/ops/api/vlm/rule-suggestion-drafts",
    "\\\"manualSaveRequired\\\":true",
    "\\\"ruleRegistryWritePerformed\\\":false",
    "\\\"autoRuleApplied\\\":false",
    "\\\"autoProfileApplied\\\":false",
  ]) {
    assert(server.includes(snippet), `server missing snippet: ${snippet}`);
  }
  assert(server.includes('<< "\\\"sourceCandidateReport\\\":" << candidate_body'),
    "draft workflow must project the computed candidate body as sourceCandidateReport");
  const routeBlock = extractBlockAround(server, 'request.path == "/ops/api/vlm/rule-suggestion-drafts"', 1600);
  assert(routeBlock.includes("require_ops_principal"), "draft route must require ops principal");
  assert(!routeBlock.includes("require_rule_write_principal"), "draft read route must not require rule-write");
});

check("/ops/rules UI renders draft workflow and applies to form only", () => {
  const html = readText("src/ingress/product_ui_server_pages.cpp");
  const js = readText("src/ingress/product_ui_page_scripts.cpp");
  const css = readText("src/ingress/product_ui_css.cpp");
  for (const snippet of [
    'data-testid="ops-vlm-rule-draft-workflow"',
    'data-vlm-rule-draft-contract="draft-only-manual-save"',
    "opsVlmRuleDraftRefresh",
    "opsVlmRuleDraftList",
  ]) {
    assert(html.includes(snippet), `rules HTML missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "/ops/api/vlm/rule-suggestion-drafts",
    "refreshOpsVlmRuleDrafts",
    "applyOpsVlmRuleSuggestionDraft",
    "openOpsRulesEditor('event-rule', 'new')",
    "suggestion.autoApply !== false",
    "suggestion.manualReviewRequired !== true",
    "data-vlm-rule-draft-index",
  ]) {
    assert(js.includes(snippet), `rules JS missing snippet: ${snippet}`);
  }
  const applyFunction = extractNamedFunction(js, "applyOpsVlmRuleSuggestionDraft");
  assert(applyFunction.includes("opsRulesEventTypes.includes(type)"), "draft apply must validate opsRulesEventTypes");
  assert(!["providerApiCall(", "rawProviderResponse", "providerMaterialExposed: true"].some(marker => applyFunction.includes(marker)), "UI-036 provider-boundary explicit absence oracle");
  const ruleRegistryWritePerformed = ["/lab/analysis/rules", "/lab/analysis/va-rules", "opsRulesSaveNativeRecord", "triggerOpsRulesSave"].some(marker => applyFunction.includes(marker));
  assert(ruleRegistryWritePerformed === false, "UI-036 draft form apply must not write the rule registry");
  for (const forbidden of [
    "/lab/analysis/rules",
    "/lab/analysis/va-rules",
    "opsRulesSaveNativeRecord",
    "triggerOpsRulesSave",
    "recordOpsAudit",
  ]) {
    assert(!applyFunction.includes(forbidden), `draft apply function must not include write/save token: ${forbidden}`);
  }
  assert(css.includes(".ops-vlm-rule-draft-card"), "rules CSS missing draft card styles");
});

check("browser rule UI smoke covers draft apply without write calls", () => {
  const smoke = readText("scripts/internal/verify_ops_rules_embed_smoke.mjs");
  for (const snippet of [
    "vlmDraftWorkflow",
    "/ops/api/vlm/rule-suggestion-drafts",
    "data-vlm-rule-draft-index",
    "attemptedDraftWrites.length === 0",
    "opsEventRuleTypeSelect",
    "line-crossing",
  ]) {
    assert(smoke.includes(snippet), `verify-rule-ui smoke missing draft workflow snippet: ${snippet}`);
  }
});

check("docs, inventory, server command, and script inventory are wired", () => {
  const docs = [
    readText("docs/development-backlog.md"),
    readText("docs/project-feature-test-inventory.md"),
    readText("docs/stream-verification.md"),
    readText("docs/vlm-rule-suggestion-candidates.md"),
  ].join("\n");
  const serverSh = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  for (const snippet of [
    "V210-S08",
    "Rule suggestion draft workflow",
    "verify-vlm-rule-suggestion-draft-workflow",
    "media-server.vlm-rule-suggestion-draft-workflow.v1",
    "UI-036",
    "EVT-036",
    "LAB-061",
    "SAFE-038",
  ]) {
    assert(docs.includes(snippet), `docs/inventory missing snippet: ${snippet}`);
  }
  assert(serverSh.includes("verify-vlm-rule-suggestion-draft-workflow"), "server.sh command missing");
  assert(serverSh.includes("verify_vlm_rule_suggestion_draft_workflow.mjs"), "server.sh dispatch missing");
  assert(scriptInventory.includes("verify_vlm_rule_suggestion_draft_workflow.mjs"),
    "script inventory missing verifier");
});

check("S08 remains Ops-only and does not add forbidden client/runtime/schema/media artifacts", () => {
  const files = [
    "src/ingress/webrtc_http_server.cpp",
    "src/ingress/product_ui_page_scripts.cpp",
    "src/ingress/product_ui_css.cpp",
    "docs/development-backlog.md",
    "docs/project-feature-test-inventory.md",
    "test/fixtures/vlm_rule_suggestion/draft_workflow.json",
  ];
  const forbidden = [
    /\/client\/api\/vlm\/rule-suggestion/i,
    /\/client\/vlm/i,
    /\bruntimeVlmCallPerformed\s*:\s*true\b/,
    /\bcloudProviderApiCalled\s*:\s*true\b/,
    /\bruleRegistryWritePerformed\s*:\s*true\b/,
    /\bautoRuleApplied\s*:\s*true\b/,
    /\bautoProfileApplied\s*:\s*true\b/,
    /Event POST payload 변경 완료/,
    /WebRTC DataChannel schema 변경 완료/,
    /SSE\/WS metadata schema 변경 완료/,
    /RTSP\/WebRTC media path 변경 완료/,
  ];
  const hits = [];
  for (const file of files) {
    const text = readText(file);
    for (const pattern of forbidden) {
      if (pattern.test(text)) hits.push(`${file}: ${pattern}`);
    }
  }
  assert(hits.length === 0, `forbidden S08 token(s) found:\n${hits.join("\n")}`);
});

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

console.log("");
console.log("== VLM rule suggestion draft workflow summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function extractBlockAround(text, needle, length) {
  const index = text.indexOf(needle);
  if (index < 0) return "";
  return text.slice(index, index + length);
}

function extractNamedFunction(text, name) {
  const index = text.indexOf(`function ${name}`);
  if (index < 0) return "";
  const brace = text.indexOf("{", index);
  if (brace < 0) return "";
  let depth = 0;
  for (let i = brace; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(index, i + 1);
    }
  }
  return text.slice(index);
}
