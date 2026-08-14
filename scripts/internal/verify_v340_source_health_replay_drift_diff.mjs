#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";
// 파일 용도: v3.4.0 Step 5 Source Health Replay and Drift Diff 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.4.0 Source Health Replay and Drift Diff verification

Usage:
  ./server.sh verify-v340-source-health-replay-drift-diff

Checks:
  - /ops/api/source-registry/source-health-replay-drift-diff exposes an Ops-only read-only drift diff model
  - the model compares handoff source health with a fresh source health snapshot and summarizes stale/offline/reconnect/warning drift
  - the output does not write SourceRegistry/PublishedView/Ops audit, perform recovery, expose raw locators, or alter media/schema contracts
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v340-source-health-replay-drift-diff";
const schema = "media-server.ops.v340-source-health-replay-drift-diff.v1";
const route = "/ops/api/source-registry/source-health-replay-drift-diff";
const files = {
  server: readWebRtcHttpServerBundle(readText),
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

check("Ops server builds the v3.4 source health replay drift diff read model", () => {
  for (const snippet of [
    "struct OpsV340SourceHealthReplayDriftItem",
    "struct OpsV340SourceHealthReplayDriftSummary",
    "BuildV340HandoffSourceHealthReplaySnapshot",
    "BuildV340SourceHealthReplayDriftDiffItems",
    "BuildV340SourceHealthReplayDriftSummary",
    "AppendV340SourceHealthReplayDriftItemJson",
    "AppendV340SourceHealthReplayDriftSummaryJson",
    "OpsV340SourceHealthReplayDriftDiffJson",
    schema,
    "sourceHealthReplayDriftDiffSummary",
    "handoffSourceHealthSummary",
    "freshSourceHealthSummary",
    "sourceHealthReplayDriftItems",
    "staleDelta",
    "offlineDelta",
    "reconnectDelta",
    "warningDelta",
    "driftStatus",
  ]) {
    assertIncludes(files.server, snippet, "v340 source health replay drift diff server model");
  }
});

check("source health replay drift diff preserves read-only, recovery, schema, media, and client boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV340SourceHealthReplayDriftDiffJson",
    "std::string OpsV330BackupRecoverySourceHandoffJson"
  );
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "opsAuditWritePerformed",
    "sourceHealthSnapshotPersisted",
    "recoveryValidationPlanPersisted",
    "productionRestorePerformed",
    "automaticRecoveryPerformed",
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
    assertIncludes(block, snippet, "v340 source health replay drift diff boundary flags");
  }
  for (const flag of [
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "opsAuditWritePerformed",
    "sourceHealthSnapshotPersisted",
    "recoveryValidationPlanPersisted",
    "productionRestorePerformed",
    "automaticRecoveryPerformed",
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
    const index = block.indexOf(flag);
    const nearby = block.slice(index, index + 128);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  for (const forbidden of [
    "CreateSource(",
    "UpsertSource(",
    "DisableSource(",
    "CreateView(",
    "UpsertView(",
    "DisableView(",
    "AppendOpsAuditRecord(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "\"httpUrl\"",
    "\"webrtcSourceId\"",
    "credentialRef",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `drift diff JSON must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the source health replay drift diff route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/continuity-drill/contract\")");
  assertIncludes(block, route, "source health replay drift diff route");
  assertIncludes(block, "request.method == \"GET\"", "source health replay drift diff route");
  assertIncludes(block, "require_ops_principal()", "source health replay drift diff route");
  assertIncludes(block, "OpsV340SourceHealthReplayDriftDiffJson(", "source health replay drift diff route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "source health replay drift diff route");
  assertIncludes(block, "Cache-Control", "source health replay drift diff route");
  assertIncludes(block, "no-store", "source health replay drift diff route");
  assert(!block.includes("require_source_write_principal"), "source health replay drift diff route must not require source writes");
});

check("roadmap records v3.4 Step 5 without overclaiming Ops UI or recovery", () => {
  for (const snippet of [
    "| 5 | v3.4.0 (5) Source Health Replay and Drift Diff | P1 | 완료 |",
    "handoff 당시 source health와 fresh source health를 비교해 stale/offline/reconnect/warning drift를 요약",
    "## v3.4.0 Step 5 개발 기록",
    route,
    "OpsV340SourceHealthReplayDriftDiffJson",
    `\`./server.sh ${command}\``,
    "Ops Continuity Drill Workspace UI 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.4 Step 5");
  }
});

check("stream verification exposes v3.4 Step 5 command and boundary", () => {
  for (const snippet of [
    `| v3.4.0 (5) | \`./server.sh ${command}\` | Source Health Replay and Drift Diff.`,
    route,
    "handoff source health",
    "fresh source health",
    "stale/offline/reconnect/warning drift",
    "source registry write, PublishedView write, Ops audit write, automatic recovery",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.4 Step 5");
  }
});

check("feature inventory and release records map v3.4 Step 5", () => {
  for (const snippet of [
    `v3.4.0 (5) Source Health Replay and Drift Diff | \`SRC-042\`, \`SAFE-128\`, \`OPS-095\` | \`${command}\``,
    "SRC-042 | V340 Step 5 source health replay drift diff read model",
    "SAFE-128 | V340 Step 5 source health replay drift diff boundary",
    "OPS-095 | V340 Step 5 Source Health Replay and Drift Diff 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.4 Step 5");
  }
  for (const snippet of [
    "V340 Source Health Replay and Drift Diff",
    `\`./server.sh ${command}\``,
    "v340 Step 5 RED source health replay drift diff gate",
    "v340 Step 5 source health replay drift diff final",
    "v340 Step 5 UI 풀테스트",
    "v340 Step 5 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.4 Step 5");
  }
});

check("server entrypoint and inventory verifiers include v3.4 Step 5 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v340_source_health_replay_drift_diff.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["SRC-042", "SAFE-128", "OPS-095"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v340_source_health_replay_drift_diff.mjs", "script inventory");
});

check("SAFE-128 canonical source health replay boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV340SourceHealthReplayDriftDiffJson(");
  const routeObserved = files.server.includes("/ops/api/source-registry/source-health-replay-drift-diff");
  const safe128BoundaryObserved = block.includes("BuildV340SourceHealthReplayDriftDiffItems") && block.includes("media-server.ops.v340-source-health-replay-drift-diff.v1");
  const writeOrRecoveryPerformed = /\b(?:Write|Persist|Recover|UpdateSource|DispatchEventRecords)[A-Za-z0-9_:]*\s*\(/.test(block);
  const rawMaterialExposed = /\\\"(?:sourceUrl|rawLocator|rawJson|debugMaterial|credentialMaterial)Exposed\\\":true/.test(block);
  const mutationPerformed = writeOrRecoveryPerformed;
  const sourceUrlExposed = block.includes("\\\"sourceUrlExposed\\\":true");
  const credentialMaterialExposed = block.includes("\\\"credentialMaterialExposed\\\":true");
  const debugMaterialExposed = block.includes("\\\"debugMaterialExposed\\\":true");
  assert(routeObserved && safe128BoundaryObserved && writeOrRecoveryPerformed === false && mutationPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false,
    "SAFE-128 BuildV340SourceHealthReplayDriftDiffItems must remain read-only without registry audit persistence recovery or raw material");
});

const results = runChecks();
console.log("");
console.log("== v3.4.0 source health replay drift diff ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.4.0 (5)");
console.log(`- route: ${route}`);
console.log("- compares: handoff source health vs fresh source health");
console.log("- drift: stale/offline/reconnect/warning summary");
console.log("- writes: no SourceRegistry, PublishedView, Ops audit, persistence, or recovery mutation performed");
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

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
