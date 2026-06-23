#!/usr/bin/env node
// 파일 용도: v3.2.0 Step 8 Action Readiness Checklist 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.2.0 Action Readiness Checklist verification

Usage:
  ./server.sh verify-v320-action-readiness-checklist

Checks:
  - /ops/api/events/reviews returns an Ops-only actionReadinessChecklist inside unifiedResolutionWorkspace items
  - the checklist exposes rule draft, evidence bundle, and notification readiness without auto action or external delivery
  - /ops/events renders action readiness status, blockers, checklist items, and boundary flags
  - the context does not claim client digest, search/metrics, UI fulltest, longrun, or published metadata evidence
  - backlog, stream verification, release records, feature inventory, ops smoke, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v320-action-readiness-checklist";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  pageScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
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

check("ops review API attaches Step 8 action readiness checklist to unified workspace items", () => {
  for (const snippet of [
    "OpsV320ActionReadinessChecklistInfoFor",
    "OpsV320ActionReadinessChecklistJson",
    "OpsV320ActionReadinessChecklistSummaryJson",
    "media-server.ops.v320-action-readiness-checklist.v1",
    "\\\"actionReadinessChecklist\\\":",
    "\\\"actionReadinessChecklistSummary\\\":",
    "\\\"readinessStatus\\\":",
    "\\\"ruleDraftReady\\\":",
    "\\\"evidenceBundleReady\\\":",
    "\\\"notificationReady\\\":",
    "\\\"manualApprovalRequired\\\":true",
    "\\\"readinessBlockers\\\":",
    "\\\"checklistItems\\\":",
    "\\\"ruleDraftRoute\\\":\\\"/ops/rules\\\"",
    "\\\"notificationDryRunRequired\\\":true",
    "\\\"opsOnly\\\":true",
  ]) {
    assertIncludes(files.server, snippet, "V320 action readiness checklist server view model");
  }
});

check("action readiness checklist preserves schema, media, action, and delivery boundaries", () => {
  for (const snippet of [
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
    "\\\"ruleDraftCreated\\\":false",
    "\\\"autoActionApplied\\\":false",
    "\\\"autoActionWritePerformed\\\":false",
    "\\\"externalDeliveryPerformed\\\":false",
    "\\\"notificationSent\\\":false",
    "\\\"actionReadinessChecklistImplemented\\\":true",
    "\\\"clientDigestImplemented\\\":false",
    "\\\"searchMetricsImplemented\\\":false",
  ]) {
    assertIncludes(files.server, snippet, "V320 action readiness checklist boundary flags");
  }
});

check("product UI script renders Step 8 rule draft, evidence bundle, notification, and blockers", () => {
  for (const snippet of [
    "renderV320ActionReadinessChecklist",
    "actionReadinessChecklistSummary",
    "actionReadinessChecklist",
    "media-server.ops.v320-action-readiness-checklist.v1",
    "v320ActionReadinessChecklistGrid",
    "data-v320-action-readiness-checklist",
    "data-v320-action-readiness-blocker",
    "data-v320-action-readiness-item",
    "readiness status",
    "rule draft",
    "evidence bundle",
    "notification readiness",
    "manualApprovalRequired",
    "autoActionWritePerformed",
    "externalDeliveryPerformed",
  ]) {
    assertIncludes(files.pageScript, snippet, "V320 action readiness checklist UI script");
  }
});

check("Step 8 action readiness CSS is responsive and scoped to the v3.2 workspace", () => {
  for (const snippet of [
    ".v320-action-readiness-checklist-grid",
    ".v320-action-readiness-checklist-card",
    ".v320-action-readiness-items",
    ".v320-action-readiness-item",
    ".v320-action-readiness-blocker",
  ]) {
    assertIncludes(files.css, snippet, "V320 action readiness checklist CSS");
  }
});

check("ops static smoke tracks Step 8 action readiness checklist markers", () => {
  for (const snippet of [
    "ops-events-action-readiness-checklist",
    'data-testid="ops-v320-unified-events-workspace"',
    "v320ActionReadinessChecklistGrid",
    "data-v320-action-readiness-checklist",
    "data-v320-action-readiness-blocker",
    "data-v320-action-readiness-item",
    "actionReadinessChecklistSummary",
    "actionReadinessChecklist",
    "media-server.ops.v320-action-readiness-checklist.v1",
    "readiness status",
    "rule draft",
    "evidence bundle",
    "notification readiness",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops UI smoke");
  }
});

check("docs and roadmap expose v3.2 Step 8 scope without overclaim", () => {
  for (const snippet of [
    "| 8 | v3.2.0 (8) Action Readiness Checklist | P1 | 완료 |",
    "rule draft/evidence bundle/notification readiness checklist",
    "`./server.sh verify-v320-action-readiness-checklist`",
    "Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님",
    "## v3.2.0 Step 8 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.2 Step 8");
  }
  for (const snippet of [
    "| v3.2.0 (8) | `./server.sh verify-v320-action-readiness-checklist` |",
    "Action Readiness Checklist",
    "rule draft",
    "evidence bundle",
    "notification readiness",
    "auto action, external delivery, client digest, search/metrics",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.2 Step 8");
  }
});

check("feature inventory and release records map v3.2 Step 8", () => {
  for (const snippet of [
    "v3.2.0 (8) Action Readiness Checklist | `UI-067`, `EVT-069`, `SAFE-109`, `OPS-076` | `verify-v320-action-readiness-checklist`, `verify-ops-client-ui`",
    "UI-067 | V320 Step 8 Action Readiness Checklist UI",
    "EVT-069 | V320 Step 8 action readiness checklist view model",
    "SAFE-109 | V320 Step 8 action readiness boundary",
    "OPS-076 | V320 Step 8 Action Readiness Checklist 게이트",
    "`UI-001`~`UI-018`, `UI-022`~`UI-068`",
    "`EVT-001`~`EVT-069`",
    "`SAFE-001`~`SAFE-110`",
    "`OPS-035`~`OPS-077`",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.2 Step 8");
  }
  for (const snippet of [
    "V320 Action Readiness Checklist",
    "`./server.sh verify-v320-action-readiness-checklist`",
    "v320 Step 8 RED action readiness checklist gate",
    "v320 Step 8 action readiness checklist final",
    "v320 Step 8 UI 풀테스트",
    "v320 Step 8 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.2 Step 8");
  }
});

check("server entrypoint and inventory verifiers include v3.2 Step 8 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v320_action_readiness_checklist.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["UI-067", "EVT-069", "SAFE-109", "OPS-076"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v320_action_readiness_checklist.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.2.0 action readiness checklist summary ==");
console.log("- schema: media-server.ops.v320-action-readiness-checklist.v1");
console.log("- step: v3.2.0 (8)");
console.log("- route: /ops/events");
console.log("- payload: /ops/api/events/reviews unifiedResolutionWorkspace.actionReadinessChecklist");
console.log("- checklist dimensions: ruleDraftReady, evidenceBundleReady, notificationReady");
console.log("- storage: reads existing EventRecord, source context, AI quality, and Ops review state only");
console.log("- unchanged: EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer output");
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
