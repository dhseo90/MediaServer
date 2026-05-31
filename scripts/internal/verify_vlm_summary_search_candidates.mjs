#!/usr/bin/env node
// 파일 용도: V200-S12 VLM summary 검색 후보 fixture, sidecar query smoke, contract 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM summary search candidate verification

Usage:
  ./server.sh verify-vlm-summary-search-candidates

Checks:
  - V200-S12 fixture defines the primary sidecar-summary-token-candidate decision.
  - Fixture search candidates correlate VLMObservation to EventRecord by eventId only.
  - C++ sidecar search builder and analysis-state smoke are wired.
  - docs, inventory, stream verification, server command, and script inventory are wired.
  - S12 does not add runtime VLM calls, provider calls, viewer/client exposure, Event/WebRTC/SSE/WS schema changes, media path changes, or auto rule application.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("fixture defines V200-S12 search decision, fallback, exclusions, and privacy review", () => {
  const fixture = readJson("test/fixtures/vlm_summary_search/cases.json");
  assert(fixture.schema === "media-server.vlm-summary-search-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V200-S12", "fixture target step mismatch");
  assert(fixture.decision?.primarySearchCandidate === "sidecar-summary-token-candidate",
    "primary search candidate mismatch");
  assert(fixture.decision?.fallback?.includes("eventId"), "fallback must mention eventId sidecar query");
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
  ]) {
    assert(review[key] === false, `privacy review ${key} must be false`);
  }
});

check("fixture search matrix returns the primary event and excludes non-matching observations", () => {
  const fixture = readJson("test/fixtures/vlm_summary_search/cases.json");
  assert(Array.isArray(fixture.cases) && fixture.cases.length >= 1, "fixture needs cases");
  for (const item of fixture.cases) {
    assert(item.eventRecord?.schema === "media-server.va.event-record.v1", `${item.id}: EventRecord schema mismatch`);
    assert(Array.isArray(item.observations) && item.observations.length >= 2,
      `${item.id}: needs matching and excluded observations`);
    for (const observation of item.observations) {
      assert(observation.schema === "media-server.vlm-observation.v1", `${item.id}: observation schema mismatch`);
      assert(observation.storageScope === "vlm-observation-store-only", `${item.id}: storage scope mismatch`);
      assert(observation.redactionReview, `${item.id}: redaction review missing`);
      assert(observation.contractInvariants, `${item.id}: contract invariants missing`);
      for (const [key, value] of Object.entries(observation.redactionReview)) {
        assert(value === false, `${item.id}: redactionReview.${key} must be false`);
      }
      for (const [key, value] of Object.entries(observation.contractInvariants)) {
        assert(value === false, `${item.id}: contractInvariants.${key} must be false`);
      }
    }
    const candidates = searchFixtureCandidates(item);
    assert(candidates.length >= 1, `${item.id}: search returned no candidates`);
    assert(candidates[0].eventId === item.expected.primaryEventId,
      `${item.id}: primary event mismatch ${candidates[0].eventId}`);
    for (const eventId of item.expected.excludedEventIds || []) {
      assert(!candidates.some(candidate => candidate.eventId === eventId),
        `${item.id}: excluded event should not be returned: ${eventId}`);
    }
    for (const term of item.expected.matchedTerms || []) {
      assert(candidates[0].matchedTerms.includes(normalize(term)),
        `${item.id}: missing matched term ${term}`);
    }
    assert(item.expected.schema === "media-server.vlm-summary-search-candidates.v1",
      `${item.id}: expected response schema mismatch`);
    assert(item.expected.candidateSchema === "media-server.vlm-summary-search-candidate.v1",
      `${item.id}: expected candidate schema mismatch`);
    assert(item.expected.searchMode === "sidecar-summary-token-candidate",
      `${item.id}: expected search mode mismatch`);
    assert(item.expected.correlationKey === "eventId", `${item.id}: correlation key must be eventId`);
    for (const [key, value] of Object.entries(item.expected.contract || {})) {
      assert(value === false, `${item.id}: expected contract.${key} must be false`);
    }
  }
});

check("C++ sidecar summary search builder and analysis-state smoke are wired", () => {
  const header = readText("include/analysis/vlm_observation_store.h");
  const source = readText("src/analysis/vlm_observation_store.cpp");
  const smoke = readText("scripts/internal/analysis_state_smoke.cpp");
  for (const snippet of [
    "VlmSummarySearchOptions",
    "BuildVlmSummarySearchCandidatesJson",
    "media-server.vlm-summary-search-candidates.v1",
    "media-server.vlm-summary-search-candidate.v1",
    "sidecar-summary-token-candidate",
    "candidate-only-not-product-search",
    "runtimeVlmCallPerformed",
    "cloudProviderApiCalled",
    "autoRuleApplied",
  ]) {
    assert(header.includes(snippet) || source.includes(snippet), `summary search builder missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "VlmSummarySearchOptions",
    "BuildVlmSummarySearchCandidatesJson",
    "VLM summary search returns sidecar candidates",
    "VLM summary search preserves EventRecord correlation boundary",
    "\\\"targetStep\\\":\\\"V200-S12\\\"",
    "\\\"eventPostPayloadChanged\\\":false",
  ]) {
    assert(smoke.includes(snippet), `analysis-state smoke missing snippet: ${snippet}`);
  }
});

check("docs, inventory, stream verification, server command, and script inventory are wired", () => {
  const docs = [
    readText("docs/vlm-summary-search-candidates.md"),
    readText("docs/README.md"),
    readText("docs/stream-verification.md"),
    readText("docs/development-backlog.md"),
    readText("docs/project-feature-test-inventory.md"),
  ].join("\n");
  const server = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  for (const snippet of [
    "V200-S12",
    "VLM summary 검색 후보",
    "media-server.vlm-summary-search-candidates.v1",
    "media-server.vlm-summary-search-candidate.v1",
    "verify-vlm-summary-search-candidates",
    "LAB-043",
  ]) {
    assert(docs.includes(snippet), `docs/inventory missing snippet: ${snippet}`);
  }
  assert(server.includes("verify-vlm-summary-search-candidates"), "server command missing S12 verifier");
  assert(server.includes("verify_vlm_summary_search_candidates.mjs"), "server dispatch missing S12 verifier script");
  assert(scriptInventory.includes("verify_vlm_summary_search_candidates.mjs"),
    "script inventory missing S12 verifier");
  assert(coverage.includes("verify-vlm-summary-search-candidates"),
    "feature coverage missing S12 verifier");
});

check("S12 remains candidate-only and does not introduce provider/client/schema/media artifacts", () => {
  const files = [
    "include/analysis/vlm_observation_store.h",
    "src/analysis/vlm_observation_store.cpp",
    "scripts/internal/analysis_state_smoke.cpp",
    "docs/vlm-summary-search-candidates.md",
    "test/fixtures/vlm_summary_search/cases.json",
    "docs/development-backlog.md",
  ];
  const forbidden = [
    /\bcloudProviderApiCalled\s*:\s*true\b/,
    /\bruntimeVlmCallPerformed\s*:\s*true\b/,
    /\/client\/api\/vlm\/summary-search/i,
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
  assert(hits.length === 0, `forbidden S12 artifact token(s) found:\n${hits.join("\n")}`);
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
console.log("== VLM summary search candidate summary ==");
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

function normalize(value) {
  return String(value)
    .toLocaleLowerCase("ko-KR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function searchTerms(query) {
  return [...new Set(normalize(query).split(/\s+/).filter(Boolean))];
}

function searchFixtureCandidates(item) {
  const terms = searchTerms(item.query);
  const sourceId = item.options?.sourceId || "";
  const privacyMode = item.options?.privacyMode || "";
  return item.observations
    .filter(observation => !sourceId || observation.sourceId === sourceId)
    .filter(observation => !privacyMode || observation.privacyMode === privacyMode)
    .map(observation => {
      const haystack = normalize([
        observation.summary,
        observation.eventExplanation,
        ...(observation.falsePositiveHints || []),
        ...(observation.operatorReviewQuestions || []),
        observation.ruleId,
        observation.scenarioId,
        observation.sourceId,
      ].join(" "));
      const matchedTerms = terms.filter(term => haystack.includes(term));
      return {
        eventId: observation.eventId,
        observationId: observation.observationId,
        matchedTerms,
        matchScore: terms.length === 0 ? 0 : matchedTerms.length / terms.length,
      };
    })
    .filter(candidate => candidate.matchedTerms.length > 0)
    .sort((left, right) => right.matchScore - left.matchScore);
}
