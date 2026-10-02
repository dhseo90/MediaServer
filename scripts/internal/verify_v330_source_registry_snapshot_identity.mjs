#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.3.0 Step 2 Source Registry Snapshot and Identity 구현, 문서, inventory 연결을 검증한다.
import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";

import { validateFeatureDocumentation } from "./documentation_contract_lib.mjs";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.3.0 Source Registry Snapshot and Identity verification

Usage:
  ./server.sh verify-v330-source-registry-snapshot-identity

Checks:
  - SourceViewRegistry exposes an Ops-only source identity snapshot read model
  - the read model joins sourceId, source kind, canonical source key, PublishedView links, and owner/site/group context
  - /ops/api/source-registry/snapshot is read-only, no-store, and guarded by the Ops principal
  - client/viewer output does not gain source locator, canonical key, raw JSON, or debug exposure
  - current feature definitions, contract identifiers, verification guide, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v330-source-registry-snapshot-identity";
const schema = "media-server.ops.v330-source-registry-snapshot-identity.v1";
const route = "/ops/api/source-registry/snapshot";
const files = {
  header: readText("include/ingress/source_view_registry.h"),
  registry: readText("src/ingress/source_view_registry.cpp"),
  server: readWebRtcHttpServerBundle(readText),
  documentationImplementation: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  serverSh: readText("server.sh"),
};

const checks = [];

check("SourceViewRegistry declares the v3.3 source identity snapshot read model", () => {
  assert(route === "/ops/api/source-registry/snapshot", "OPS-081 canonical route drift");
  for (const snippet of [
    "SourceRegistrySnapshotIdentityJson",
    "SourceIdentitySnapshot",
    "SourceIdentityPublishedView",
    "SourceIdentitySummary",
  ]) {
    assertIncludes(files.header, snippet, "source registry header");
  }
});

check("SourceViewRegistry joins source identity, PublishedView links, and ownership context", () => {
  for (const snippet of [
    "BuildSourceIdentitySnapshot",
    "AppendSourceIdentitySnapshotJson",
    schema,
    "sourceIdentity",
    "sourceId",
    "sourceKind",
    "canonicalSourceKey",
    "publishedViews",
    "publishedViewCount",
    "ownerContext",
    "ownerGroup",
    "site",
    "group",
    "floor",
    "zone",
    "sourcesWithoutPublishedView",
    "publishedViewsWithoutSource",
  ]) {
    assertIncludes(files.registry, snippet, "source registry identity read model");
  }
});

check("source identity snapshot is read-only and marks future v3.3 steps as not implemented", () => {
  for (const snippet of [
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "onboardingQualityImplemented",
    "reliabilityTimelineImplemented",
    "incidentCorrelationImplemented",
    "recoveryQueueImplemented",
    "clientSafeDigestImplemented",
    "searchMetricsImplemented",
  ]) {
    assertIncludes(files.registry, snippet, "source identity boundary flags");
  }
  for (const flag of [
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "onboardingQualityImplemented",
    "reliabilityTimelineImplemented",
    "incidentCorrelationImplemented",
    "recoveryQueueImplemented",
    "clientSafeDigestImplemented",
    "searchMetricsImplemented",
  ]) {
    const index = files.registry.indexOf(flag);
    assert(index >= 0, `source identity boundary missing flag: ${flag}`);
    const nearby = files.registry.slice(index, index + 96);
    assert(nearby.includes("false"), `source identity boundary flag must be false: ${flag}`);
  }
});

check("client PublishedView JSON does not expose ops-only identity material", () => {
  const block = extractBlock(files.registry, "std::string ClientPublishedViewJson", "SourceViewRegistry::SourceIdentityPublishedView ToSourceIdentityPublishedView");
  assertIncludes(block, "sourceKind", "client view keeps safe source kind");
  for (const forbidden of [
    "canonicalSourceKey",
    "canonical_source_key",
    "rtspUrl",
    "whepUrl",
    "httpUrl",
    "webrtcSourceId",
  ]) {
    assert(!block.includes(forbidden), `client view JSON must not expose ${forbidden}`);
  }
});

check("Ops API exposes the source registry snapshot route as guarded read-only no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/sources\")");
  assertIncludes(block, route, "source registry snapshot route");
  assertIncludes(block, "request.method == \"GET\"", "source registry snapshot route");
  assertIncludes(block, "require_ops_principal()", "source registry snapshot route");
  assertIncludes(block, "SourceViewApplicationService::Instance().SourceRegistrySnapshotIdentityJson()", "source registry snapshot route");
  assertIncludes(block, "Cache-Control", "source registry snapshot route");
  assertIncludes(block, "no-store", "source registry snapshot route");
  assert(!block.includes("require_source_write_principal"), "source identity snapshot must not require or perform source writes");
  assert(!block.includes("CreateSource") && !block.includes("UpsertSource") && !block.includes("DisableSource"), "source identity snapshot route must be read-only");
});

check("현재 기능 정의·계약·검증 명령·dispatch 연결", () => {
  const featureIds = ["SRC-033","SAFE-114","OPS-081"];
  const currentDefinitions = files.featureInventory.split(/\r?\n/).filter(line => featureIds.includes(line.split("|")[1]?.trim())).join("\n");
  const errors = validateFeatureDocumentation({
    document: currentDefinitions, identifiers: ["/ops/api/source-registry/snapshot"],
    command, script: "verify_v330_source_registry_snapshot_identity.mjs", featureIds: featureIds.filter(id => !["SRC-033"].includes(id)),
    inventory: files.featureInventory, implementation: files.documentationImplementation,
    verification: files.streamVerification, server: files.serverSh,
  });
  errors.push(...validateFeatureDocumentation({
    document: currentDefinitions, identifiers: ["/ops/api/source-registry/snapshot"],
    command: "verify-ops-source-registry-api", script: "verify_ops_source_registry_api.mjs",
    featureIds: ["SRC-033"], inventory: files.featureInventory, implementation: files.documentationImplementation,
    verification: files.streamVerification, server: files.serverSh,
  }));
  assert(errors.length === 0, errors.join("; "));
});



check("server entrypoint and inventory verifiers include v3.3 Step 2 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v330_source_registry_snapshot_identity.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["SRC-033", "SAFE-114", "OPS-081"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.projectInventoryVerifier, "`SRC-001`~`SRC-068`", "project inventory SRC range");
  assertIncludes(files.projectInventoryVerifier, "`SAFE-001`~`SAFE-216`", "project inventory SAFE range");
  assertIncludes(files.projectInventoryVerifier, "`OPS-035`~`OPS-184`", "project inventory OPS range");
  assertIncludes(files.scriptInventory, "verify_v330_source_registry_snapshot_identity.mjs", "script inventory");
});

check("SAFE-114 canonical source registry snapshot boundary", () => {
  const snapshotBlock = extractCppFunctionBlock(files.registry, "RegistryResult SourceViewRegistry::SourceRegistrySnapshotIdentityJson()");
  const snapshotRouteObserved = "/ops/api/source-registry/snapshot" === route;
  const safe114BoundaryObserved = snapshotRouteObserved && snapshotBlock.includes("BuildSourceIdentitySnapshot(sources_, views_)") &&
    snapshotBlock.includes("media-server.ops.v330-source-registry-snapshot-identity.v1") && snapshotBlock.includes("AppendSourceIdentitySnapshotJson");
  const sourceRegistryWritePerformed = /\b(?:CreateSource|UpdateSource|DeleteSource|Write|Persist)[A-Za-z0-9_:]*\s*\(/.test(snapshotBlock);
  const schemaMutationPerformed = /DispatchEventRecords|CreateVaRule|UpdateVaRule/.test(snapshotBlock);
  const viewerClientExposureAdded = /AppendClient|ClientEventSummary|PublishedViewJson/.test(snapshotBlock);
  assert(safe114BoundaryObserved && snapshotBlock.includes("BuildSourceIdentitySnapshot(sources_, views_)") && snapshotRouteObserved && sourceRegistryWritePerformed === false && schemaMutationPerformed === false && viewerClientExposureAdded === false,
    "SAFE-114 source-registry-snapshot-identity must remain Ops-only read-only without registry/schema/client mutation");
});

const results = runChecks();
console.log("");
console.log("== v3.3.0 source registry snapshot identity summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.3.0 (2)");
console.log(`- route: ${route}`);
console.log("- model: SourceViewRegistry source identity snapshot");
console.log("- joins: sourceId, sourceKind, canonicalSourceKey, PublishedView links, owner/site/group context");
console.log("- unchanged: source registry write, PublishedView write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer output");
console.log("- onboardingQuality: not-run-by-this-command");
console.log("- reliabilityTimeline: not-run-by-this-command");
console.log("- incidentCorrelation: not-run-by-this-command");
console.log("- recoveryQueue: not-run-by-this-command");
console.log("- clientDigest: not-run-by-this-command");
console.log("- searchMetrics: not-run-by-this-command");
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

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end > start, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
