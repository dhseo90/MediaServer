#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.3.0 Step 6 Operator Recheck and Recovery Queue 구현, UI, 문서, inventory 연결을 검증한다.
import { extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


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
  server: readWebRtcHttpServerBundle(readText),
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
const implementationManifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));

const checks = [];

check("Ops review API builds the v3.3 operator recheck recovery queue read model", () => {
  const start = files.server.indexOf("std::string OpsV330OperatorRecheckRecoveryQueueJson(");
  const end = files.server.indexOf("std::string OpsV330OperatorRecheckRecoveryQueueSummaryJson(", start);
  assert(start >= 0 && end > start, "EVT-072 recheck recovery projection block missing");
  const evt072RecoveryQueueBlock = files.server.slice(start, end);
  assertIncludes(evt072RecoveryQueueBlock, "media-server.ops.v330-operator-recheck-recovery-queue.v1", "EVT-072 block-scoped canonical recovery queue projection");
  assert(!evt072RecoveryQueueBlock.includes("\\\"viewerClientExposureAdded\\\":true") && evt072RecoveryQueueBlock.includes("\\\"viewerClientExposureAdded\\\":false"), "EVT-072 recovery queue must remain hidden from client/viewer");
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
  const recoveryQueueBlock = extractNamedFunctionBlock(files.pageScript, "renderV330OperatorRecheckRecoveryQueue");
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
    assertIncludes(recoveryQueueBlock, snippet, "v330 operator recheck recovery queue UI renderer block");
  }
  assertIncludes(recoveryQueueBlock, "operatorRecheckRecoveryQueue.rawJsonExposed === false", "UI-071 block-scoped raw JSON redaction contract");
  assertIncludes(recoveryQueueBlock, "operatorRecheckRecoveryQueue.rawLocatorExposed === false", "UI-071 block-scoped raw locator redaction contract");
  assertIncludes(recoveryQueueBlock, "operatorRecheckRecoveryQueue.sourceUrlExposed === false", "UI-071 block-scoped source URL redaction contract");
  assertIncludes(recoveryQueueBlock, "operatorRecheckRecoveryQueue.debugMaterialExposed === false", "UI-071 block-scoped debug material redaction contract");
  assertIncludes(recoveryQueueBlock, "operatorRecheckRecoveryQueue.viewerClientExposureAdded === false", "UI-071 block-scoped client viewer boundary contract");
  assert(!["rawJsonPayload", "rawPayload", "rawLocator:", "rawEvidenceIncluded: true", "rtsp://", "rtsps://"].some(marker => recoveryQueueBlock.includes(marker)), "UI-071 raw-material-redaction explicit absence oracle");
  assert(!["sourceUrl:", "sourceURL:", "sourceUrlValue", "rtsp://", "rtsps://"].some(marker => recoveryQueueBlock.includes(marker)), "UI-071 source-url-redaction explicit absence oracle");
  assert(!["providerApiCall(", "providerResponse", "rawProviderResponse", "providerMaterialExposed: true", "rawProviderMaterialExposed: true"].some(marker => recoveryQueueBlock.includes(marker)), "UI-071 provider-material explicit absence oracle");
  assert(!["debugCounters", "Developer URL", "debugMaterialExposed: true"].some(marker => recoveryQueueBlock.includes(marker)), "UI-071 debug-redaction explicit absence oracle");
  assert(!["/client/api/", "viewerClientExposureAdded: true", "clientExposureAdded: true"].some(marker => recoveryQueueBlock.includes(marker)), "UI-071 client-viewer-boundary explicit absence oracle");
  const unifiedWorkspaceBlock = extractNamedFunctionBlock(files.pageScript, "renderV320UnifiedOpsEventsWorkspace");
  assertIncludes(unifiedWorkspaceBlock, "/ops/events", "UI-071 exact route owner obligation");
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
  assertIncludes(files.featureInventory, command, "feature inventory command");
  for (const id of ["UI-071", "SRC-037", "EVT-072", "SAFE-118", "OPS-085"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  for (const id of ["SRC-037", "EVT-072", "SAFE-118", "OPS-085"]) {
    const item = implementationManifest.items.find(candidate => candidate.id === id);
    assert(item?.verifierEvidence?.command === command, `${id} manifest canonical verifier command drift`);
  }
  assertIncludes(files.scriptInventory, "verify_v330_operator_recheck_recovery_queue.mjs", "script inventory");
});

check("SAFE-118 canonical operator recheck recovery boundary", () => {
  const queueBlock = extractCppFunctionBlock(files.server, "std::string OpsV330OperatorRecheckRecoveryQueueJson(");
  const safe118BoundaryObserved = queueBlock.includes("media-server.ops.v330-operator-recheck-recovery-queue.v1") && queueBlock.includes("info.queue_status") && queueBlock.includes("info.retry_candidate") && queueBlock.includes("info.recheck_status");
  const persistentQueueWritePerformed = /\b(?:Enqueue|Write|Persist|AppendFile)[A-Za-z0-9_:]*\s*\(/.test(queueBlock);
  const sourceOrEventWritePerformed = /\b(?:CreateSource|UpdateSource|DeleteSource|DispatchEventRecords)[A-Za-z0-9_:]*\s*\(/.test(queueBlock);
  const rawMaterialExposed = queueBlock.includes("\\\"rawJsonExposed\\\":true") || queueBlock.includes("\\\"rawEvidenceExposed\\\":true");
  const rawLocatorExposed = queueBlock.includes("\\\"rawLocatorExposed\\\":true");
  const sourceUrlExposed = queueBlock.includes("\\\"sourceUrlExposed\\\":true");
  const debugMaterialExposed = queueBlock.includes("\\\"debugMaterialExposed\\\":true");
  const credentialMaterialExposed = queueBlock.includes("\\\"credentialMaterialExposed\\\":true");
  const viewerClientExposureAdded = /AppendClient|ClientEventSummary|PublishedView/.test(queueBlock);
  const automaticRecoveryPerformed = /\b(?:Recover|Restore|Execute)[A-Za-z0-9_:]*\s*\(/.test(queueBlock);
  assert(safe118BoundaryObserved && persistentQueueWritePerformed === false && sourceOrEventWritePerformed === false && rawMaterialExposed === false && rawLocatorExposed === false && sourceUrlExposed === false && debugMaterialExposed === false && credentialMaterialExposed === false && viewerClientExposureAdded === false && automaticRecoveryPerformed === false,
    "SAFE-118 info.retry_candidate operatorRecheckRecoveryQueue must remain a deterministic hint without queue/source/event writes, raw credential, client, or automatic recovery");
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
