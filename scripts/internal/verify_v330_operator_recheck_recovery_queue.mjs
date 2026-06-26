#!/usr/bin/env node
// 파일 용도: v3.3.0 Step 6 Operator Recheck and Recovery Queue 구현, UI, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.3.0 Operator Recheck and Recovery Queue verification

Usage:
  ./server.sh verify-v330-operator-recheck-recovery-queue

Checks:
  - /ops/api/events/reviews attaches an Ops-only v3.3 operatorRecheckRecoveryQueue read model to unified resolution detail items
  - the read model derives failed-only recheck, retry candidate, recovery checklist, dry-run status, and operator note linkage from existing source/review context
  - /ops/events renders the recovery queue without source URL/raw JSON/debug/client exposure
  - the queue does not mutate SourceRegistry, PublishedView, EventRecord/Event POST, media, metadata, Rule/Profile, client digest, search/metrics, or release state
  - backlog, stream verification, release records, feature inventory, ops smoke, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v330-operator-recheck-recovery-queue";
const schema = "media-server.ops.v330-operator-recheck-recovery-queue.v1";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  pageScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  opsSourcesScript: readText("src/ingress/product_ui_ops_sources_script.cpp"),
  uiSmoke: readText("scripts/internal/verify_ops_client_ui_smoke.mjs"),
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

check("Ops review API builds the v3.3 operator recheck recovery queue read model", () => {
  for (const snippet of [
    "struct OpsV330OperatorRecheckRecoveryQueueInfo",
    "OpsV330OperatorRecheckRecoveryQueueInfoFor",
    "OpsV330OperatorRecheckRecoveryQueueJson",
    "OpsV330OperatorRecheckRecoveryQueueSummaryJson",
    schema,
    "\\\"operatorRecheckRecoveryQueue\\\":",
    "\\\"operatorRecheckRecoveryQueueSummary\\\":",
    "\\\"failedOnlyRecheck\\\":",
    "\\\"retryCandidate\\\":",
    "\\\"recoveryChecklist\\\":",
    "\\\"dryRunResultStatus\\\":",
    "\\\"operatorNoteStatus\\\":",
    "\\\"operatorNoteRoute\\\":\\\"/ops/api/events/reviews/{eventId}\\\"",
    "\\\"sourceRecheckRoute\\\":\\\"/ops/api/source-health\\\"",
    "\\\"operatorNoteLinked\\\":true",
    "\\\"recoveryQueueReadModelCreated\\\":true",
  ]) {
    assertIncludes(files.server, snippet, "v330 operator recheck recovery queue server view model");
  }
});

check("operator recheck recovery queue preserves schema, media, source write, and viewer boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV330OperatorRecheckRecoveryQueueJson",
    "std::string OpsV330OperatorRecheckRecoveryQueueSummaryJson"
  );
  for (const snippet of [
    "\\\"persistentRecoveryQueueCreated\\\":false",
    "\\\"recoveryQueueWritePerformed\\\":false",
    "\\\"sourceRegistryWritePerformed\\\":false",
    "\\\"publishedViewWritePerformed\\\":false",
    "\\\"eventRecordWritePerformed\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"webrtcDataChannelSchemaChanged\\\":false",
    "\\\"sseMetadataSchemaChanged\\\":false",
    "\\\"wsMetadataSchemaChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
    "\\\"ruleProfilePayloadChanged\\\":false",
    "\\\"viewerClientExposureAdded\\\":false",
    "\\\"sourceUrlExposed\\\":false",
    "\\\"rawJsonExposed\\\":false",
    "\\\"debugMaterialExposed\\\":false",
    "\\\"rawLocatorExposed\\\":false",
    "\\\"credentialMaterialExposed\\\":false",
    "\\\"autoRecoveryApplied\\\":false",
    "\\\"externalRecoveryPerformed\\\":false",
    "\\\"clientDigestChanged\\\":false",
    "\\\"searchMetricsChanged\\\":false",
  ]) {
    assertIncludes(block, snippet, "v330 operator recheck recovery false boundary value");
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
    assert(!block.includes(forbidden), `operator recheck queue must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("/ops/events renders the v3.3 operator recheck recovery queue", () => {
  for (const snippet of [
    "renderV330OperatorRecheckRecoveryQueue",
    "operatorRecheckRecoveryQueueSummary",
    "operatorRecheckRecoveryQueue",
    schema,
    "v330OperatorRecheckRecoveryQueueGrid",
    "data-v330-operator-recheck-recovery-queue",
    "data-v330-recovery-checklist-item",
    "failedOnlyRecheck",
    "retryCandidate",
    "recoveryChecklist",
    "dryRunResultStatus",
    "operatorNoteStatus",
    "operatorNoteRoute",
    "sourceRecheckRoute",
    "operatorNoteLinked",
  ]) {
    assertIncludes(files.pageScript, snippet, "v330 operator recheck recovery queue UI script");
  }
  for (const snippet of [
    ".v330-operator-recheck-recovery-queue-grid",
    ".v330-operator-recheck-recovery-queue-card",
    ".v330-recovery-checklist-list",
    ".v330-recovery-checklist-item",
  ]) {
    assertIncludes(files.css, snippet, "v330 operator recheck recovery queue CSS");
  }
});

check("client/viewer scripts and source registry UI do not expose recovery queue internals", () => {
  for (const forbidden of [
    schema,
    "operatorRecheckRecoveryQueue",
    "failedOnlyRecheck",
    "retryCandidate",
    "recoveryChecklist",
    "dryRunResultStatus",
    "operatorNoteStatus",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose Step 6 material: ${forbidden}`);
  }
  for (const forbidden of [
    schema,
    "operatorRecheckRecoveryQueue",
    "dryRunResultStatus",
    "operatorNoteStatus",
  ]) {
    assert(!files.opsSourcesScript.includes(forbidden), `/ops/sources script must not own Step 6 recovery queue UI: ${forbidden}`);
  }
});

check("ops static smoke tracks Step 6 operator recheck recovery markers", () => {
  for (const snippet of [
    "ops-events-operator-recheck-recovery-queue",
    'data-testid="ops-v320-unified-events-workspace"',
    "v330OperatorRecheckRecoveryQueueGrid",
    "data-v330-operator-recheck-recovery-queue",
    "data-v330-recovery-checklist-item",
    "operatorRecheckRecoveryQueueSummary",
    "operatorRecheckRecoveryQueue",
    schema,
    "failed-only recheck",
    "retry candidate",
    "recovery checklist",
    "dry-run result",
    "operator note",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops UI smoke");
  }
});

check("roadmap records v3.3 Step 6 as implemented without overclaiming outside this step", () => {
  for (const snippet of [
    "| 6 | v3.3.0 (6) Operator Recheck and Recovery Queue | P1 | 완료 |",
    "## v3.3.0 Step 6 개발 기록",
    "OpsV330OperatorRecheckRecoveryQueueJson",
    "`./server.sh verify-v330-operator-recheck-recovery-queue`",
    "failed-only recheck, retry candidate, recovery checklist, dry-run 결과와 operator note 연결",
    "이번 Step 6 범위 밖 기능 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.3 Step 6");
  }
});

check("stream verification exposes v3.3 Step 6 command and boundary", () => {
  for (const snippet of [
    "| v3.3.0 (6) | `./server.sh verify-v330-operator-recheck-recovery-queue` |",
    "Operator Recheck and Recovery Queue",
    "/ops/api/events/reviews",
    "operatorRecheckRecoveryQueue",
    "failed-only recheck",
    "retry candidate",
    "recovery checklist",
    "dry-run",
    "operator note",
    "source registry write, PublishedView write, viewer/client 노출, EventRecord/Event POST/API/schema/media 변경",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.3 Step 6");
  }
});

check("feature inventory and release records map v3.3 Step 6", () => {
  for (const snippet of [
    `v3.3.0 (6) Operator Recheck and Recovery Queue | \`UI-071\`, \`SRC-037\`, \`EVT-072\`, \`SAFE-118\`, \`OPS-085\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-071 | V330 Step 6 Operator Recheck and Recovery Queue UI",
    "SRC-037 | V330 Step 6 Operator Recheck and Recovery source context",
    "EVT-072 | V330 Step 6 operator recheck recovery queue view model",
    "SAFE-118 | V330 Step 6 operator recheck recovery boundary",
    "OPS-085 | V330 Step 6 Operator Recheck and Recovery Queue 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.3 Step 6");
  }
  for (const snippet of [
    "V330 Operator Recheck and Recovery Queue",
    `\`./server.sh ${command}\``,
    "v330 Step 6 RED operator recheck recovery queue gate",
    "v330 Step 6 UI 풀테스트",
    "v330 Step 6 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.3 Step 6");
  }
});

check("server entrypoint and inventory verifiers include v3.3 Step 6 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v330_operator_recheck_recovery_queue.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["UI-071", "SRC-037", "EVT-072", "SAFE-118", "OPS-085"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.projectInventoryVerifier, "`UI-001`~`UI-018`, `UI-022`~`UI-073`", "project inventory UI range");
  assertIncludes(files.projectInventoryVerifier, "`SRC-001`~`SRC-039`", "project inventory SRC range");
  assertIncludes(files.projectInventoryVerifier, "`EVT-001`~`EVT-072`", "project inventory EVT range");
  assertIncludes(files.projectInventoryVerifier, "`SAFE-001`~`SAFE-121`", "project inventory SAFE range");
  assertIncludes(files.projectInventoryVerifier, "`OPS-035`~`OPS-088`", "project inventory OPS range");
  assertIncludes(files.scriptInventory, "verify_v330_operator_recheck_recovery_queue.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.3.0 operator recheck and recovery queue ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.3.0 (6)");
console.log("- route: /ops/events");
console.log("- payload: /ops/api/events/reviews unifiedResolutionWorkspace.operatorRecheckRecoveryQueue");
console.log("- model: failed-only source recheck + retry candidate + recovery checklist + dry-run status + operator note link");
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
