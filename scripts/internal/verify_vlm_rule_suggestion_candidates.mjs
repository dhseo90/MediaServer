#!/usr/bin/env node
// 파일 용도: V200-S13 VLM rule 추천 보조 후보 fixture, builder, no-auto-apply 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM rule suggestion candidate verification

Usage:
  ./server.sh verify-vlm-rule-suggestion-candidates

Checks:
  - V200-S13 fixture defines the sidecar-rule-suggestion-candidate decision.
  - Fixture keeps line/intrusion/zone suggestions as manual-save candidates only.
  - C++ sidecar rule suggestion builder and analysis-state smoke are wired.
  - docs, inventory, stream verification, server command, and script inventory are wired.
  - S13 does not add runtime VLM calls, provider calls, viewer/client exposure, Event/WebRTC/SSE/WS schema changes, media path changes, rule registry writes, or automatic rule/profile application.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("fixture defines V200-S13 rule suggestion decision, fallback, exclusions, and privacy review", () => {
  const fixture = readJson("test/fixtures/vlm_rule_suggestion/cases.json");
  assert(fixture.schema === "media-server.vlm-rule-suggestion-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V200-S13", "fixture target step mismatch");
  assert(fixture.decision?.primarySuggestionCandidate === "sidecar-rule-suggestion-candidate",
    "primary rule suggestion candidate mismatch");
  for (const selected of [
    "line-crossing-manual-review",
    "intrusion-dwell-manual-review",
    "zone-occupancy-manual-review",
  ]) {
    assert(fixture.decision?.selectedCandidates?.includes(selected), `selected candidate missing: ${selected}`);
  }
  assert(fixture.decision?.fallback?.includes("/ops/rules"), "fallback must mention /ops/rules manual review");
  assert(Array.isArray(fixture.decision?.excluded) && fixture.decision.excluded.length >= 4,
    "fixture must list excluded candidates and reasons");
  for (const item of fixture.decision.excluded) {
    assert(item.id && item.reason, `excluded candidate needs id and reason: ${JSON.stringify(item)}`);
  }
  const review = fixture.decision?.licenseProvenancePrivacyReview || {};
  for (const key of [
    "newModelOrProviderAdded",
    "rawPromptStored",
    "rawResponseStored",
    "sourceUrlExposed",
    "rawFrameBytesStored",
    "credentialMaterialStored",
    "externalTransferAdded",
    "ruleRegistryWritePerformed",
  ]) {
    assert(review[key] === false, `privacy review ${key} must be false`);
  }
});

check("fixture candidate matrix keeps line/intrusion/zone suggestions manual-only", () => {
  const fixture = readJson("test/fixtures/vlm_rule_suggestion/cases.json");
  assert(Array.isArray(fixture.cases) && fixture.cases.length >= 1, "fixture needs cases");
  for (const item of fixture.cases) {
    assert(Array.isArray(item.observations) && item.observations.length >= 4,
      `${item.id}: needs line/intrusion/zone candidates and a rejected auto-apply candidate`);
    const candidates = ruleSuggestionCandidates(item);
    assert(candidates.length >= 3, `${item.id}: expected at least 3 manual candidates`);
    const kinds = new Set(candidates.map(candidate => candidate.kind));
    for (const kind of item.expected.candidateKinds || []) {
      assert(kinds.has(kind), `${item.id}: missing candidate kind ${kind}`);
    }
    for (const candidate of candidates) {
      assert(candidate.autoApply === false, `${item.id}: candidate ${candidate.eventId} must disable autoApply`);
      assert(candidate.manualReviewRequired === true,
        `${item.id}: candidate ${candidate.eventId} must require manual review`);
      assert(candidate.suggestedAction === "manual-save-in-ops-rules",
        `${item.id}: candidate ${candidate.eventId} must use manual save action`);
      assert(candidate.targetRoute === "/ops/rules", `${item.id}: candidate ${candidate.eventId} target route mismatch`);
    }
    for (const eventId of item.expected.excludedEventIds || []) {
      assert(!candidates.some(candidate => candidate.eventId === eventId),
        `${item.id}: excluded auto-apply event should not be returned: ${eventId}`);
    }
    assert(item.expected.schema === "media-server.vlm-rule-suggestion-candidates.v1",
      `${item.id}: expected response schema mismatch`);
    assert(item.expected.candidateSchema === "media-server.vlm-rule-suggestion-candidate.v1",
      `${item.id}: expected candidate schema mismatch`);
    assert(item.expected.suggestionMode === "sidecar-rule-suggestion-candidate",
      `${item.id}: expected suggestion mode mismatch`);
    assert(item.expected.candidateStatus === "candidate-only-manual-rule-save",
      `${item.id}: expected candidate status mismatch`);
    assert(item.expected.manualSaveRoute === "/ops/rules", `${item.id}: manual save route mismatch`);
    for (const [key, value] of Object.entries(item.expected.contract || {})) {
      assert(value === false, `${item.id}: expected contract.${key} must be false`);
    }
    for (const observation of item.observations) {
      assert(observation.schema === "media-server.vlm-observation.v1", `${item.id}: observation schema mismatch`);
      assert(observation.storageScope === "vlm-observation-store-only", `${item.id}: storage scope mismatch`);
      for (const [key, value] of Object.entries(observation.redactionReview || {})) {
        assert(value === false, `${item.id}: redactionReview.${key} must be false`);
      }
      for (const [key, value] of Object.entries(observation.contractInvariants || {})) {
        assert(value === false, `${item.id}: contractInvariants.${key} must be false`);
      }
    }
  }
});

check("C++ sidecar rule suggestion builder and analysis-state smoke are wired", () => {
  const header = readText("include/analysis/vlm_observation_store.h");
  const source = readText("src/analysis/vlm_observation_store.cpp");
  const smoke = readText("scripts/internal/analysis_state_smoke.cpp");
  for (const snippet of [
    "VlmRuleSuggestionOptions",
    "BuildVlmRuleSuggestionCandidatesJson",
    "media-server.vlm-rule-suggestion-candidates.v1",
    "media-server.vlm-rule-suggestion-candidate.v1",
    "sidecar-rule-suggestion-candidate",
    "candidate-only-manual-rule-save",
    "ruleRegistryWritePerformed",
    "autoRuleApplied",
    "autoProfileApplied",
  ]) {
    assert(header.includes(snippet) || source.includes(snippet), `rule suggestion builder missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "VlmRuleSuggestionOptions",
    "BuildVlmRuleSuggestionCandidatesJson",
    "VLM rule suggestion returns manual-save candidates",
    "VLM rule suggestion preserves no-auto-apply boundary",
    "\\\"targetStep\\\":\\\"V200-S13\\\"",
    "\\\"ruleRegistryWritePerformed\\\":false",
  ]) {
    assert(smoke.includes(snippet), `analysis-state smoke missing snippet: ${snippet}`);
  }
});

check("docs, inventory, stream verification, server command, and script inventory are wired", () => {
  const docs = [
    readText("docs/vlm-rule-suggestion-candidates.md"),
    readText("docs/README.md"),
    readText("docs/stream-verification.md"),
    readText("docs/development-backlog.md"),
    readText("docs/project-feature-test-inventory.md"),
  ].join("\n");
  const server = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  for (const snippet of [
    "V200-S13",
    "Rule 추천 보조 후보",
    "media-server.vlm-rule-suggestion-candidates.v1",
    "media-server.vlm-rule-suggestion-candidate.v1",
    "verify-vlm-rule-suggestion-candidates",
    "LAB-044",
  ]) {
    assert(docs.includes(snippet), `docs/inventory missing snippet: ${snippet}`);
  }
  assert(server.includes("verify-vlm-rule-suggestion-candidates"), "server command missing S13 verifier");
  assert(server.includes("verify_vlm_rule_suggestion_candidates.mjs"), "server dispatch missing S13 verifier script");
  assert(scriptInventory.includes("verify_vlm_rule_suggestion_candidates.mjs"),
    "script inventory missing S13 verifier");
  assert(coverage.includes("verify-vlm-rule-suggestion-candidates"),
    "feature coverage missing S13 verifier");
});

check("S13 remains candidate-only and does not introduce provider/client/schema/media/rule-write artifacts", () => {
  const files = [
    "include/analysis/vlm_observation_store.h",
    "src/analysis/vlm_observation_store.cpp",
    "scripts/internal/analysis_state_smoke.cpp",
    "docs/vlm-rule-suggestion-candidates.md",
    "test/fixtures/vlm_rule_suggestion/cases.json",
    "docs/development-backlog.md",
  ];
  const forbidden = [
    /\bcloudProviderApiCalled\s*:\s*true\b/,
    /\bruntimeVlmCallPerformed\s*:\s*true\b/,
    /\bruleRegistryWritePerformed\s*:\s*true\b/,
    /\bautoRuleApplied\s*:\s*true\b/,
    /\bautoProfileApplied\s*:\s*true\b/,
    /\/client\/api\/vlm\/rule-suggestions/i,
    /\/client\/vlm/i,
    /Event POST payload 변경 완료/,
    /WebRTC DataChannel schema 변경 완료/,
    /SSE\/WS metadata schema 변경 완료/,
    /자동\s*Rule\/Profile\s*적용\s*완료/,
    /\.(gguf|safetensors|ggml|ckpt)\b/i,
  ];
  const hits = [];
  for (const file of files) {
    const text = readText(file);
    for (const pattern of forbidden) {
      if (pattern.test(text)) hits.push(`${file}: ${pattern}`);
    }
  }
  assert(hits.length === 0, `forbidden S13 artifact token(s) found:\n${hits.join("\n")}`);
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
console.log("== VLM rule suggestion candidate summary ==");
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

function ruleSuggestionCandidates(item) {
  const sourceId = item.options?.sourceId || "";
  const privacyMode = item.options?.privacyMode || "";
  return item.observations
    .filter(observation => !sourceId || observation.sourceId === sourceId)
    .filter(observation => !privacyMode || observation.privacyMode === privacyMode)
    .map(observation => ({
      eventId: observation.eventId,
      observationId: observation.observationId,
      kind: observation.ruleSuggestion?.kind || "",
      candidateId: observation.ruleSuggestion?.candidateId || "",
      suggestedAction: observation.ruleSuggestion?.suggestedAction || "",
      targetRoute: observation.ruleSuggestion?.targetRoute || "",
      manualReviewRequired: observation.ruleSuggestion?.manualReviewRequired,
      autoApply: observation.ruleSuggestion?.autoApply,
    }))
    .filter(candidate => candidate.kind && candidate.kind !== "none")
    .filter(candidate => candidate.autoApply === false)
    .filter(candidate => candidate.manualReviewRequired === true);
}
