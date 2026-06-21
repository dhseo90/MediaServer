#!/usr/bin/env node
// 파일 용도: v3.1.0 S05 Scoped Integrator Search API 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.1.0 Scoped Integrator Search API verification

Usage:
  ./server.sh verify-v310-scoped-integrator-search-api

Checks:
  - /client/api/views/{id}/events/search is an integrator-only, PublishedView-scoped event search API
  - the route requires event:read:{viewId} scope and does not expose raw evidence, source URLs, debug material, feature provenance, encoded clip paths, rule/action controls, or internal evidence refs
  - the API reuses the local EventFeatureSearchIndex/Search DSL path without provider calls or vector search
  - roadmap, stream verification, release records, feature inventory, and server dispatch are wired
  - PASS is limited to V310-S05 local/API/static evidence and does not imply UI 풀테스트, 30분/120분, cleanup execution, vector search, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v310-scoped-integrator-search-api";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  routeOwnerSource: readText("src/ingress/ops_event_route_owner.cpp"),
  routeOwnerHeader: readText("include/ingress/ops_event_route_owner.h"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  authWorkflow: readText("scripts/internal/verify_auth_workflow.sh"),
  releaseRecords: readText("docs/release-test-records.md"),
  serverSh: readText("server.sh"),
};
const checks = [];

check("client route owner exposes events/search as a summary subresource", () => {
  for (const snippet of [
    "kClientEventsSearchSubresource = \"events/search\"",
    "IsClientViewEventsSearchRoute",
    "return subresource == kClientEventsSearchSubresource",
  ]) {
    assertIncludes(files.routeOwnerSource, snippet, "client events search route owner");
  }
  assertIncludes(files.routeOwnerHeader, "bool IsClientViewEventsSearchRoute", "client events search route owner header");
});

check("server exposes integrator-only scoped search route with event scope gate", () => {
  for (const snippet of [
    "IntegratorScopedEventSearchJson",
    "media-server.integrator.scoped-event-search.v1",
    "/client/api/views/{id}/events/search",
    "IsClientViewEventsSearchRoute(subresource)",
    "!auth::IsIntegrator(principal_result.principal)",
    "ResolveClientViewAccess(",
    "\"event:read\"",
    "Integrator scoped search requires integrator role",
    "events search is not enabled for this view",
  ]) {
    assertIncludes(files.server, snippet, "scoped integrator search API route");
  }
});

check("scoped search response is redacted and client-safe", () => {
  const scopedFunction = [
    extractFunctionBody(files.server, "std::string IntegratorScopedEventSearchItemJson"),
    extractFunctionBody(files.server, "std::string IntegratorScopedEventSearchJson"),
  ].join("\n");
  for (const snippet of [
    "\\\"schema\\\":\\\"media-server.integrator.scoped-event-search.v1\\\"",
    "\\\"integratorOnly\\\":true",
    "\\\"publishedViewScoped\\\":true",
    "\\\"scopeGate\\\":\\\"event:read\\\"",
    "\\\"searchDslValid\\\":",
    "\\\"featureSearchIndexBacked\\\":true",
    "\\\"modelProviderDependency\\\":false",
    "\\\"runtimeProviderCallPerformed\\\":false",
    "\\\"vectorSearchPerformed\\\":false",
    "\\\"sourceUrlIncluded\\\":false",
    "\\\"rawEvidenceIncluded\\\":false",
    "\\\"debugMaterialIncluded\\\":false",
    "\\\"providerMaterialIncluded\\\":false",
    "\\\"featureProvenanceIncluded\\\":false",
    "\\\"internalEvidenceIncluded\\\":false",
    "\\\"encodedClipPathIncluded\\\":false",
    "\\\"ruleEditorIncluded\\\":false",
    "\\\"actionControlsIncluded\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"webrtcDataChannelSchemaChanged\\\":false",
    "\\\"sseMetadataSchemaChanged\\\":false",
    "\\\"wsMetadataSchemaChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
    "\\\"digest\\\":",
    "\\\"summaryText\\\":",
    "\\\"timelineHint\\\":",
    "\\\"time\\\":",
  ]) {
    assertIncludes(scopedFunction, snippet, "scoped integrator redaction response");
  }
  for (const forbidden of [
    "\\\"evidenceRefs\\\":",
    "\\\"evidenceTimeline\\\":",
    "\\\"featureReasons\\\":",
    "\\\"retryActions\\\":",
    "\\\"pinStatus\\\":",
    "\\\"retentionStatus\\\":",
    "\\\"encodedClipManifestPath\\\":",
    "\\\"encodedClipMediaPath\\\":",
  ]) {
    assert(!scopedFunction.includes(forbidden), `scoped integrator search must not expose ${forbidden}`);
  }
});

check("docs and roadmap expose V310-S05 scope without overclaim", () => {
  for (const snippet of [
    "V310-S05` Scoped Integrator Search API 완료",
    "| 5 | V310-S05 | P1 | 완료 | Scoped Integrator Search API |",
    "`/client/api/views/{id}/events/search`",
    "media-server.integrator.scoped-event-search.v1",
    "UI 풀테스트 직접 조작, 30분/120분, cleanup execution, vector search, published metadata evidence가 아님",
    "## v3.1.0 S05 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog V310-S05");
  }
  for (const snippet of [
    "| V310-S05 | `./server.sh verify-v310-scoped-integrator-search-api` |",
    "integrator-only PublishedView-scoped event search API",
    "event:read:{viewId}",
    "source/raw/debug/provider/feature provenance/encoded clip path",
    "UI 풀테스트 직접 조작, 30분/120분, cleanup execution, vector search",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification V310-S05");
  }
});

check("feature inventory and release records map V310-S05", () => {
  for (const snippet of [
    "V310-S05 Scoped Integrator Search API | `CLIENT-026`, `SAFE-097`, `OPS-064` | `verify-v310-scoped-integrator-search-api`, `verify-auth-routes`",
    "CLIENT-026 | V310-S05 Scoped Integrator Search API",
    "SAFE-097 | V310-S05 scoped integrator search redaction boundary",
    "OPS-064 | V310-S05 Scoped Integrator Search API 게이트",
    "`CLIENT-001`~`CLIENT-026`",
    "`SAFE-001`~`SAFE-097`",
    "`OPS-035`~`OPS-064`",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory V310-S05");
  }
  for (const snippet of [
    "V310 Scoped Integrator Search API",
    "`./server.sh verify-v310-scoped-integrator-search-api`",
    "v310 S05 RED scoped integrator search API gate",
    "v310 S05 UI 풀테스트",
    "v310 S05 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records V310-S05");
  }
});

check("server entrypoint and inventory verifiers include V310-S05 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v310_scoped_integrator_search_api.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  assertIncludes(files.projectInventoryVerifier, "CLIENT-026", "project inventory verifier CLIENT-026");
  assertIncludes(files.projectInventoryVerifier, "SAFE-097", "project inventory verifier SAFE-097");
  assertIncludes(files.projectInventoryVerifier, "OPS-064", "project inventory verifier OPS-064");
  assertIncludes(files.scriptInventory, "verify_v310_scoped_integrator_search_api.mjs", "script inventory");
});

check("auth routes smoke covers scoped search role and view gates", () => {
  for (const snippet of [
    "unauth scoped event search denied",
    "viewer scoped event search role denied",
    "integrator scoped event search allowed",
    "integrator scoped event search cross-view denied",
  ]) {
    assertIncludes(files.authWorkflow, snippet, "auth route smoke scoped search");
  }
});

const results = runChecks();
console.log("");
console.log("== v3.1.0 scoped integrator search API summary ==");
console.log("- schema: media-server.integrator.scoped-event-search.v1");
console.log("- step: V310-S05");
console.log("- route: /client/api/views/{id}/events/search");
console.log("- scopeGate: event:read:{viewId}");
console.log("- role: integrator");
console.log("- exposed fields: eventId, viewId, eventType, status, severity, summaryText, timelineHint, time");
console.log("- hidden fields: source URL, raw evidence, debug material, provider material, feature provenance, encoded clip paths, rule/action controls");
console.log("- providerRuntimeCall: not-run-by-this-command");
console.log("- vectorSearch: not-run-by-this-command");
console.log("- cleanupExecution: not-run-by-this-command");
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

function extractFunctionBody(text, signature) {
  const start = text.indexOf(signature);
  assert(start >= 0, `missing function signature: ${signature}`);
  const brace = text.indexOf("{", start);
  assert(brace >= 0, `missing function body for: ${signature}`);
  let depth = 0;
  let inString = false;
  let inChar = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1] || "";
    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (inString) {
      if (!escaped && ch === "\"") inString = false;
      escaped = !escaped && ch === "\\";
      if (ch !== "\\") escaped = false;
      continue;
    }
    if (inChar) {
      if (!escaped && ch === "'") inChar = false;
      escaped = !escaped && ch === "\\";
      if (ch !== "\\") escaped = false;
      continue;
    }
    if (ch === "/" && next === "/") {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === "\"") {
      inString = true;
      escaped = false;
      continue;
    }
    if (ch === "'") {
      inChar = true;
      escaped = false;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(brace, i + 1);
    }
  }
  throw new Error(`unterminated function body for: ${signature}`);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
