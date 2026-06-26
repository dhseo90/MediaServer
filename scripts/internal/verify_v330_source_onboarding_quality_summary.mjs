#!/usr/bin/env node
// 파일 용도: v3.3.0 Step 3 Source Onboarding Quality Summary 구현, UI, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.3.0 Source Onboarding Quality Summary verification

Usage:
  ./server.sh verify-v330-source-onboarding-quality-summary

Checks:
  - SourceViewRegistry exposes an Ops-only source onboarding quality summary read model
  - the read model summarizes pre-save validation, duplicate/conflict/missing/ready states, and ONVIF/WHEP/RTSP input quality
  - /ops/api/source-registry/onboarding-quality is read-only, no-store, and guarded by the Ops principal
  - /ops/sources renders the summary without exposing raw locators to client/viewer output
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v330-source-onboarding-quality-summary";
const schema = "media-server.ops.v330-source-onboarding-quality-summary.v1";
const route = "/ops/api/source-registry/onboarding-quality";
const files = {
  header: readText("include/ingress/source_view_registry.h"),
  registry: readText("src/ingress/source_view_registry.cpp"),
  server: readText("src/ingress/webrtc_http_server.cpp"),
  opsSourcesScript: readText("src/ingress/product_ui_ops_sources_script.cpp"),
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

check("SourceViewRegistry declares the v3.3 source onboarding quality read model", () => {
  for (const snippet of [
    "SourceOnboardingQualityIssue",
    "SourceOnboardingQualityItem",
    "SourceOnboardingQualitySummary",
    "SourceOnboardingQualitySummaryJson",
  ]) {
    assertIncludes(files.header, snippet, "source registry header");
  }
});

check("SourceViewRegistry builds onboarding quality status, duplicate, missing, and input quality summaries", () => {
  for (const snippet of [
    "BuildSourceOnboardingQualityItems",
    "BuildSourceOnboardingQualitySummary",
    "AppendSourceOnboardingQualityItemJson",
    schema,
    "onboardingQualitySummary",
    "sourceOnboardingQuality",
    "readinessStatus",
    "readySources",
    "warningSources",
    "blockedSources",
    "duplicateCanonicalSourceKeys",
    "missingLocatorCount",
    "invalidLocatorCount",
    "missingPublishedViewCount",
    "disabledSourceCount",
    "preSaveValidation",
    "inputQuality",
    "locatorPresent",
    "locatorScheme",
    "validationIssues",
    "duplicate-canonical-source-key",
    "missing-published-view",
    "onvif-tag-without-live-locator",
    "whep-url-invalid-scheme",
    "rtsp-url-invalid-scheme",
  ]) {
    assertIncludes(files.registry, snippet, "source onboarding quality read model");
  }
});

check("source onboarding quality read model is read-only and redacts raw locator material", () => {
  const appendBlock = extractBlock(
    files.registry,
    "void AppendSourceOnboardingQualityItemJson",
    "RegistryResult JsonResult"
  );
  for (const forbidden of [
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "\"httpUrl\"",
    "\"file\"",
    "\"url\"",
    "credentialRef",
    "password",
    "Authorization",
  ]) {
    assert(!appendBlock.includes(forbidden), `onboarding quality JSON must not expose raw locator material: ${forbidden}`);
  }
  for (const snippet of [
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
    "reliabilityTimelineImplemented",
    "incidentCorrelationImplemented",
    "recoveryQueueImplemented",
    "clientSafeDigestImplemented",
    "searchMetricsImplemented",
  ]) {
    assertIncludes(files.registry, snippet, "source onboarding quality boundary flags");
  }
  for (const flag of [
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
    "reliabilityTimelineImplemented",
    "incidentCorrelationImplemented",
    "recoveryQueueImplemented",
    "clientSafeDigestImplemented",
    "searchMetricsImplemented",
  ]) {
    const index = files.registry.indexOf(flag);
    assert(index >= 0, `source onboarding quality boundary missing flag: ${flag}`);
    const nearby = files.registry.slice(index, index + 96);
    assert(nearby.includes("false"), `source onboarding quality boundary flag must be false: ${flag}`);
  }
});

check("Ops API exposes the source onboarding quality route as guarded read-only no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/snapshot\")");
  assertIncludes(block, route, "source onboarding quality route");
  assertIncludes(block, "request.method == \"GET\"", "source onboarding quality route");
  assertIncludes(block, "require_ops_principal()", "source onboarding quality route");
  assertIncludes(block, "SourceViewRegistry::Instance().SourceOnboardingQualitySummaryJson()", "source onboarding quality route");
  assertIncludes(block, "Cache-Control", "source onboarding quality route");
  assertIncludes(block, "no-store", "source onboarding quality route");
  assert(!block.includes("require_source_write_principal"), "source onboarding quality route must not require or perform source writes");
  assert(!block.includes("CreateSource") && !block.includes("UpsertSource") && !block.includes("DisableSource"), "source onboarding quality route must be read-only");
});

check("/ops/sources renders onboarding quality summary without client/viewer exposure", () => {
  for (const snippet of [
    "source-onboarding-quality-summary",
    "source-onboarding-quality-list",
    "renderOnboardingQualitySummary",
    "requestJson('/ops/api/source-registry/onboarding-quality')",
    "readySources",
    "warningSources",
    "blockedSources",
    "duplicateCanonicalSourceKeys",
    "missingPublishedViewCount",
    "inputQuality",
  ]) {
    assertIncludes(files.opsSourcesScript + files.server, snippet, "ops sources onboarding quality UI");
  }
  const clientBlock = extractBlock(files.registry, "std::string ClientPublishedViewJson", "SourceViewRegistry::SourceIdentityPublishedView ToSourceIdentityPublishedView");
  for (const forbidden of [
    "onboardingQuality",
    "preSaveValidation",
    "canonicalSourceKey",
    "rtspUrl",
    "whepUrl",
    "httpUrl",
    "webrtcSourceId",
  ]) {
    assert(!clientBlock.includes(forbidden), `client view JSON must not expose ${forbidden}`);
  }
});

check("roadmap records v3.3 Step 3 as implemented without overclaiming later steps", () => {
  for (const snippet of [
    "| 3 | v3.3.0 (3) Source Onboarding Quality Summary | P0 | 완료 |",
    "## v3.3.0 Step 3 개발 기록",
    route,
    "SourceViewRegistry::SourceOnboardingQualitySummaryJson",
    "채널 저장 전 validation, 중복/충돌/누락/ready 상태, ONVIF/WHEP/RTSP 입력 품질 요약",
    "`./server.sh verify-v330-source-onboarding-quality-summary`",
    "Reliability Timeline and Health History, Incident-to-Source Correlation Layer, Operator Recheck and Recovery Queue, Client-safe Source Status Digest, Source Reliability Search and Metrics 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.3 Step 3");
  }
});

check("stream verification exposes v3.3 Step 3 command and boundary", () => {
  for (const snippet of [
    "| v3.3.0 (3) | `./server.sh verify-v330-source-onboarding-quality-summary` |",
    "Source Onboarding Quality Summary",
    route,
    "pre-save validation",
    "duplicate/conflict/missing/ready",
    "ONVIF/WHEP/RTSP input quality",
    "viewer/client 노출, source registry write, reliability timeline, incident correlation, recovery queue, client digest, search/metrics",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.3 Step 3");
  }
});

check("feature inventory and release records map v3.3 Step 3", () => {
  for (const snippet of [
    `v3.3.0 (3) Source Onboarding Quality Summary | \`SRC-034\`, \`SAFE-115\`, \`OPS-082\` | \`${command}\``,
    "SRC-034 | V330 Step 3 Source Onboarding Quality Summary",
    "SAFE-115 | V330 Step 3 source onboarding quality boundary",
    "OPS-082 | V330 Step 3 Source Onboarding Quality Summary 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.3 Step 3");
  }
  for (const snippet of [
    "V330 Source Onboarding Quality Summary",
    `\`./server.sh ${command}\``,
    "v330 Step 3 RED source onboarding quality summary gate",
    "v330 Step 3 source onboarding quality summary final",
    "v330 Step 3 UI 풀테스트",
    "v330 Step 3 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.3 Step 3");
  }
});

check("server entrypoint and inventory verifiers include v3.3 Step 3 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v330_source_onboarding_quality_summary.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["SRC-034", "SAFE-115", "OPS-082"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.projectInventoryVerifier, "`SRC-001`~`SRC-035`", "project inventory SRC range");
  assertIncludes(files.projectInventoryVerifier, "`SAFE-001`~`SAFE-116`", "project inventory SAFE range");
  assertIncludes(files.projectInventoryVerifier, "`OPS-035`~`OPS-083`", "project inventory OPS range");
  assertIncludes(files.scriptInventory, "verify_v330_source_onboarding_quality_summary.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.3.0 source onboarding quality summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.3.0 (3)");
console.log(`- route: ${route}`);
console.log("- model: SourceViewRegistry source onboarding quality summary");
console.log("- summarizes: pre-save validation, duplicate/conflict/missing/ready states, ONVIF/WHEP/RTSP input quality");
console.log("- unchanged: source registry write, PublishedView write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer output");
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
