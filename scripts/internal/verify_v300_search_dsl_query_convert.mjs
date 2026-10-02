#!/usr/bin/env node
// 파일 용도: v3.0.0 S06 Search DSL and Query Convert 구현, fixture, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {validateFeatureDocumentation} from "./documentation_contract_lib.mjs";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.0.0 Search DSL and Query Convert verification

Usage:
  ./server.sh verify-v300-search-dsl-query-convert

Checks:
  - V300-S06 fixture covers natural-language conversion, strict DSL filters, tags, matching, and identity-query rejection
  - analysis/event_search_query converts natural language to media-server.event-search-dsl.v1 without provider calls or raw prompt/response retention
  - analysis-state smoke includes S06 query conversion and text/tags/filter matching behavior
  - 현재 계약 문서의 식별자·기능 ID·검증 명령·server dispatch 연결 (과거 실행 기록 제외)
  - PASS is limited to V300-S06 Search DSL/query convert evidence and does not imply search index, /ops/events UI, vector search, longrun, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v300-search-dsl-query-convert";
const fixturePath = "test/fixtures/v300_search_dsl_query_convert/cases.json";
const files = {
  header: readText("include/analysis/event_search_query.h"),
  source: readText("src/analysis/event_search_query.cpp"),
  smoke: readText("scripts/internal/analysis_state_smoke.cpp"),
  smokeBuild: readText("scripts/internal/verify_analysis_state_smoke.sh"),
  policy: readText("docs/v300-search-dsl-query-convert.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  server: readText("server.sh"),
  cmake: readText("CMakeLists.txt"),
};
const fixture = JSON.parse(readText(fixturePath));
const checks = [];

check("fixture covers V300-S06 query convert and search matrix", () => {
  assert(fixture.schema === "media-server.v300-search-dsl-query-convert-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V300-S06", "fixture targetStep mismatch");
  const ids = new Set((fixture.cases || []).map(item => item.id));
  for (const id of [
    "natural-language-text-tags-filter",
    "strict-dsl-bounded-defaults",
    "text-tags-filter-match",
    "identity-query-rejected",
    "provider-vector-not-run-boundary",
  ]) {
    assert(ids.has(id), `fixture missing case: ${id}`);
  }
  for (const item of fixture.cases || []) {
    assert(item.expected?.status, `${item.id}: expected status missing`);
    assert(item.contractInvariants?.rawPromptStored === false, `${item.id}: raw prompt must not be stored`);
    assert(item.contractInvariants?.rawProviderResponseStored === false, `${item.id}: raw response must not be stored`);
    assert(item.contractInvariants?.runtimeProviderCallPerformed === false, `${item.id}: provider call must be false`);
    assert(item.contractInvariants?.vectorSearchPerformed === false, `${item.id}: vector search must be false`);
    assert(item.contractInvariants?.eventPostPayloadChanged === false, `${item.id}: Event POST payload must not change`);
    assert(item.contractInvariants?.rtspWebrtcMediaPathChanged === false, `${item.id}: media path must not change`);
  }
});

check("analysis module exposes constrained DSL conversion and text/tags/filter search", () => {
  const queryConvertBlock = extractCppFunctionBlock(files.source, "EventSearchDsl ConvertEventSearchQueryToDsl(");
  const opsEventsUiAdded = queryConvertBlock.includes("/ops/events");
  assert(queryConvertBlock.includes("identity-search-disallowed") && opsEventsUiAdded === false, "LAB-086 identity-search-disallowed query conversion must not add /ops/events UI");
  for (const snippet of [
    "struct EventSearchFilter",
    "struct EventSearchDsl",
    "struct EventSearchDocument",
    "struct EventSearchQueryOptions",
    "ConvertEventSearchQueryToDsl",
    "SearchEventDocuments",
    "EventSearchDslJson",
    "media-server.event-search-dsl.v1",
    "identity-search-disallowed",
    "eventTimeDesc",
  ]) {
    assert(files.header.includes(snippet) || files.source.includes(snippet), `query module missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "raw_llm_prompt_stored = false",
    "raw_provider_response_stored = false",
    "runtime_provider_call_performed = false",
    "vector_search_performed = false",
    "event_post_payload_changed = false",
    "rtsp_webrtc_media_path_changed = false",
  ]) {
    assert(files.source.includes(snippet), `query source missing invariant: ${snippet}`);
  }
});

check("analysis-state smoke verifies S06 behavior and build links module", () => {
  for (const snippet of [
    "VerifyV300SearchDslQueryConvert",
    "V300 S06 natural language query converts to constrained Search DSL",
    "V300 S06 text tags and filters match event documents",
    "V300 S06 rejects identity or watchlist search",
    "V300 S06 preserves provider/schema/media boundary invariants",
  ]) {
    assert(files.smoke.includes(snippet), `analysis_state_smoke missing S06 snippet: ${snippet}`);
  }
  assert(files.smokeBuild.includes("src/analysis/event_search_query.cpp"), "analysis smoke build missing event_search_query.cpp");
  assert(files.cmake.includes("src/analysis/event_search_query.cpp"), "CMake missing event_search_query.cpp");
});

check("현재 계약 문서와 기능별 검증 연결", () => {
  const errors = validateFeatureDocumentation({
    document: files.policy, identifiers: ["media-server.event-search-dsl.v1","textTerms","tags","filters","limit","offset","identity-search-disallowed","strictStructuredOutput=true","rawPromptStored=false","runtimeProviderCallPerformed=false"],
    command, script: "verify_v300_search_dsl_query_convert.mjs", featureIds: ["LAB-086","SAFE-088","OPS-056"],
    inventory: files.featureInventory, verification: files.streamVerification,
    server: files.server,
  });
  assert(errors.length === 0, errors.join("; "));
});


check("server entrypoint and inventory verifiers include V300-S06 command", () => {
  assert(files.server.includes(command), "server.sh missing V300-S06 command");
  assert(files.server.includes("verify_v300_search_dsl_query_convert.mjs"), "server.sh missing V300-S06 script dispatch");
  for (const id of ["LAB-086", "SAFE-088", "OPS-056"]) {
    assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  }
  assert(files.featureCoverageVerifier.includes("validateImplementationManifest") && files.featureCoverageVerifier.includes("verifierEvidenceRows"), "feature coverage must validate manifest-backed verifier evidence");
  assert(files.projectInventoryVerifier.includes("LAB-086") &&
    files.projectInventoryVerifier.includes("SAFE-088") &&
    files.projectInventoryVerifier.includes("OPS-056"), "project inventory verifier missing V300-S06 IDs");
  assert(files.scriptInventory.includes("verify_v300_search_dsl_query_convert.mjs"), "script inventory missing V300-S06 verifier");
});

check("SAFE-088 canonical query conversion boundary", () => {
  const rawMaterialStored = files.source.includes("raw_llm_prompt_stored = true") || files.source.includes("raw_provider_response_stored = true");
  const providerCallPerformed = files.source.includes("runtime_provider_call_performed = true");
  const schemaMutationPerformed = files.source.includes("event_post_payload_changed = true") || files.source.includes("rtsp_webrtc_media_path_changed = true");
  const safe088BoundaryObserved = files.source.includes("identity-search-disallowed") && providerCallPerformed === false;
  assert(safe088BoundaryObserved && rawMaterialStored === false && providerCallPerformed === false && schemaMutationPerformed === false,
    "verify-v300-search-dsl-query-convert identity-search-disallowed rejected; raw/provider/WebRTC/SSE/RTSP mutation must remain absent");
});

const results = runChecks();
console.log("");
console.log("== v3.0.0 search DSL/query convert summary ==");
console.log("- schema: media-server.v300-search-dsl-query-convert-fixtures.v1");
console.log("- step: V300-S06");
console.log(`- fixture: ${fixturePath}`);
console.log("- naturalLanguageConvert: fixture-and-analysis-smoke");
console.log("- strictSearchDsl: media-server.event-search-dsl.v1");
console.log("- textTagsFilterSearch: fixture-and-analysis-smoke");
console.log("- identityQueryRejection: identity-search-disallowed");
console.log("- providerRuntimeCall: not-run-by-this-command");
console.log("- vectorSearch: not-run-by-this-command");
console.log("- searchIndex: not-run-by-this-command");
console.log("- opsEventsUi: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

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
