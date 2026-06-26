#!/usr/bin/env node
// 파일 용도: v3.3.0 Step 4 Reliability Timeline and Health History 구현, UI, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.3.0 Reliability Timeline and Health History verification

Usage:
  ./server.sh verify-v330-reliability-timeline-health-history

Checks:
  - /ops/api/source-registry/reliability-timeline exposes an Ops-only read-only timeline
  - the timeline combines current source health, live/stale/offline/reconnect/source warning state, and Ops audit history
  - /ops/sources renders Reliability Timeline and Health History without source writes or client/viewer exposure
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v330-reliability-timeline-health-history";
const schema = "media-server.ops.v330-reliability-timeline-health-history.v1";
const route = "/ops/api/source-registry/reliability-timeline";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  opsSourcesScript: readText("src/ingress/product_ui_ops_sources_script.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  registry: readText("src/ingress/source_view_registry.cpp"),
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

check("Ops server builds the v3.3 reliability timeline health history read model", () => {
  for (const snippet of [
    "struct OpsV330ReliabilityTimelineEvent",
    "struct OpsV330ReliabilityTimelineItem",
    "struct OpsV330ReliabilityTimelineSummary",
    "BuildV330ReliabilityTimelineHealthHistory",
    "AppendV330ReliabilityTimelineEventJson",
    "AppendV330ReliabilityTimelineItemJson",
    "OpsV330ReliabilityTimelineHealthHistoryJson",
    schema,
    "reliabilityTimelineSummary",
    "reliabilityTimeline",
    "healthHistory",
    "currentHealthStatus",
    "statusTransitionCount",
    "sourceWarningCount",
    "reconnectCount",
    "lastReconnectAt",
    "source-health-state-change",
    "QueryOpsAuditEntries",
  ]) {
    assertIncludes(files.server, snippet, "v330 reliability timeline read model");
  }
});

check("reliability timeline read model is read-only and preserves schema/media/client boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV330ReliabilityTimelineHealthHistoryJson",
    "std::string OpsAuditSearchIndexJson"
  );
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
  ]) {
    assertIncludes(block, snippet, "v330 reliability timeline boundary flags");
    const index = block.indexOf(snippet);
    const nearby = block.slice(index, index + 112);
    assert(nearby.includes("false"), `v330 reliability timeline boundary flag must be false: ${snippet}`);
  }
  for (const forbidden of [
    "CreateSource(",
    "UpsertSource(",
    "DisableSource(",
    "CreateView(",
    "UpsertView(",
    "DisableView(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "\"httpUrl\"",
    "\"webrtcSourceId\"",
    "credentialRef",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `timeline JSON must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the reliability timeline route as guarded read-only no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/onboarding-quality\")");
  assertIncludes(block, route, "reliability timeline route");
  assertIncludes(block, "request.method == \"GET\"", "reliability timeline route");
  assertIncludes(block, "require_ops_principal()", "reliability timeline route");
  assertIncludes(block, "OpsV330ReliabilityTimelineHealthHistoryJson(", "reliability timeline route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "reliability timeline route");
  assertIncludes(block, "Cache-Control", "reliability timeline route");
  assertIncludes(block, "no-store", "reliability timeline route");
  assert(!block.includes("require_source_write_principal"), "reliability timeline route must not require or perform source writes");
});

check("/ops/sources renders reliability timeline and health history without client/viewer exposure", () => {
  for (const snippet of [
    "source-reliability-timeline-health-history",
    "source-reliability-timeline-summary",
    "source-reliability-timeline-list",
    "renderReliabilityTimelineHealthHistory",
    "requestJson('/ops/api/source-registry/reliability-timeline')",
    "reliabilityTimelineSummary",
    "reliabilityTimeline",
    "healthHistory",
    "currentHealthStatus",
    "statusTransitionCount",
    "sourceWarningCount",
    "auditRoute",
  ]) {
    assertIncludes(files.opsSourcesScript + files.server, snippet, "ops sources reliability timeline UI");
  }
  assertIncludes(files.css, "source-reliability-timeline-list", "reliability timeline CSS");
  assertIncludes(files.css, "source-reliability-timeline-item", "reliability timeline CSS");
  for (const forbidden of [schema, "reliabilityTimeline", "healthHistory", route]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose Step 4 timeline material: ${forbidden}`);
  }
  const clientBlock = extractBlock(files.registry, "std::string ClientPublishedViewJson", "SourceViewRegistry::SourceIdentityPublishedView ToSourceIdentityPublishedView");
  for (const forbidden of [
    "reliabilityTimeline",
    "healthHistory",
    "currentHealthStatus",
    "canonicalSourceKey",
    "rtspUrl",
    "whepUrl",
    "httpUrl",
    "webrtcSourceId",
  ]) {
    assert(!clientBlock.includes(forbidden), `client view JSON must not expose ${forbidden}`);
  }
});

check("roadmap records v3.3 Step 4 as implemented without overclaiming later steps", () => {
  for (const snippet of [
    "| 4 | v3.3.0 (4) Reliability Timeline and Health History | P0 | 완료 |",
    "## v3.3.0 Step 4 개발 기록",
    route,
    "OpsV330ReliabilityTimelineHealthHistoryJson",
    "live/stale/offline/reconnect/source warning 변화 이력과 Ops audit 연결",
    "`./server.sh verify-v330-reliability-timeline-health-history`",
    "이번 Step 4 범위 밖 기능 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.3 Step 4");
  }
});

check("stream verification exposes v3.3 Step 4 command and boundary", () => {
  for (const snippet of [
    "| v3.3.0 (4) | `./server.sh verify-v330-reliability-timeline-health-history` |",
    "Reliability Timeline and Health History",
    route,
    "live/stale/offline/reconnect/source warning",
    "Ops audit",
    "source registry write, PublishedView write, viewer/client 노출, API/schema/media 변경",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.3 Step 4");
  }
});

check("feature inventory and release records map v3.3 Step 4", () => {
  for (const snippet of [
    `v3.3.0 (4) Reliability Timeline and Health History | \`SRC-035\`, \`SAFE-116\`, \`OPS-083\` | \`${command}\``,
    "SRC-035 | V330 Step 4 Reliability Timeline and Health History",
    "SAFE-116 | V330 Step 4 reliability timeline boundary",
    "OPS-083 | V330 Step 4 Reliability Timeline and Health History 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.3 Step 4");
  }
  for (const snippet of [
    "V330 Reliability Timeline and Health History",
    `\`./server.sh ${command}\``,
    "v330 Step 4 RED reliability timeline health history gate",
    "v330 Step 4 UI 풀테스트",
    "v330 Step 4 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.3 Step 4");
  }
});

check("server entrypoint and inventory verifiers include v3.3 Step 4 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v330_reliability_timeline_health_history.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["SRC-035", "SAFE-116", "OPS-083"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.projectInventoryVerifier, "`SRC-001`~`SRC-040`", "project inventory SRC range");
  assertIncludes(files.projectInventoryVerifier, "`SAFE-001`~`SAFE-122`", "project inventory SAFE range");
  assertIncludes(files.projectInventoryVerifier, "`OPS-035`~`OPS-089`", "project inventory OPS range");
  assertIncludes(files.scriptInventory, "verify_v330_reliability_timeline_health_history.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.3.0 reliability timeline and health history ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.3.0 (4)");
console.log(`- route: ${route}`);
console.log("- model: Ops source health snapshot + source-health-state-change audit history");
console.log("- summarizes: live/stale/offline/reconnect/source warning transitions and current health");
console.log("- unchanged: source registry write, PublishedView write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer output");
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
