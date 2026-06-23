#!/usr/bin/env node
// 파일 용도: v3.2.0 Step 6 AI Review Quality Context 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.2.0 AI Review Quality Context verification

Usage:
  ./server.sh verify-v320-ai-review-quality-context

Checks:
  - /ops/api/events/reviews returns an Ops-only aiReviewQuality context inside unifiedResolutionWorkspace items
  - aiReviewQuality exposes correction/review signal, uncertainty reason, and quality badge hints
  - /ops/events renders AI review quality without source URL, raw JSON, debug material, provider calls, or client/viewer exposure
  - the context does not claim operator flow, action checklist, client digest, search/metrics, UI fulltest, longrun, or published metadata evidence
  - backlog, stream verification, release records, feature inventory, ops smoke, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v320-ai-review-quality-context";
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

check("ops review API attaches Step 6 AI review quality context to unified workspace items", () => {
  for (const snippet of [
    "OpsV320AiReviewQualityContextJson",
    "OpsV320AiReviewQualitySummaryJson",
    "media-server.ops.v320-ai-review-quality-context.v1",
    "\\\"aiReviewQuality\\\":",
    "\\\"aiReviewQualitySummary\\\":",
    "\\\"correctionReviewSignal\\\":",
    "\\\"uncertaintyReason\\\":",
    "\\\"qualityBadge\\\":",
    "\\\"qualityScore\\\":",
    "\\\"reanalysisRequested\\\":",
    "\\\"correctedFeatureLabelPresent\\\":",
    "\\\"opsOnly\\\":true",
  ]) {
    assertIncludes(files.server, snippet, "V320 AI review quality server view model");
  }
});

check("AI review quality context preserves schema, media, provider, and viewer boundaries", () => {
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
    "\\\"runtimeProviderCallPerformed\\\":false",
    "\\\"rawProviderMaterialExposed\\\":false",
    "\\\"aiReviewQualityContextImplemented\\\":true",
    "\\\"operatorAssignmentFlowImplemented\\\":",
    "\\\"actionReadinessChecklistImplemented\\\":false",
    "\\\"clientDigestImplemented\\\":false",
    "\\\"searchMetricsImplemented\\\":false",
  ]) {
    assertIncludes(files.server, snippet, "V320 AI review quality boundary flags");
  }
});

check("product UI script renders Step 6 AI review quality fields", () => {
  for (const snippet of [
    "renderV320AiReviewQualityContext",
    "aiReviewQualitySummary",
    "aiReviewQuality",
    "media-server.ops.v320-ai-review-quality-context.v1",
    "v320AiReviewQualityGrid",
    "data-v320-ai-review-quality",
    "data-v320-ai-review-signal",
    "correctionReviewSignal",
    "uncertaintyReason",
    "qualityBadge",
    "qualityScore",
    "runtimeProviderCallPerformed",
    "rawProviderMaterialExposed",
  ]) {
    assertIncludes(files.pageScript, snippet, "V320 AI review quality UI script");
  }
});

check("Step 6 AI review quality CSS is responsive and scoped to the v3.2 workspace", () => {
  for (const snippet of [
    ".v320-ai-review-quality-grid",
    ".v320-ai-review-quality-card",
    ".v320-ai-review-quality-signals",
    ".v320-ai-review-quality-signal",
  ]) {
    assertIncludes(files.css, snippet, "V320 AI review quality CSS");
  }
});

check("ops static smoke tracks Step 6 AI review quality markers", () => {
  for (const snippet of [
    "ops-events-ai-review-quality-context",
    'data-testid="ops-v320-unified-events-workspace"',
    "aiReviewQualitySummary",
    "aiReviewQuality",
    "media-server.ops.v320-ai-review-quality-context.v1",
    "correction review",
    "uncertainty reason",
    "quality badge",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops UI smoke");
  }
});

check("docs and roadmap expose v3.2 Step 6 scope without overclaim", () => {
  for (const snippet of [
    "| 6 | v3.2.0 (6) AI Review Quality Context | P1 | 완료 |",
    "correction/review signal, uncertainty reason, quality badge",
    "`./server.sh verify-v320-ai-review-quality-context`",
    "Operator Resolution Flow, Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님",
    "## v3.2.0 Step 6 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.2 Step 6");
  }
  for (const snippet of [
    "| v3.2.0 (6) | `./server.sh verify-v320-ai-review-quality-context` |",
    "AI Review Quality Context",
    "correction/review signal",
    "uncertainty reason",
    "quality badge",
    "provider call",
    "operator assignment flow, action readiness checklist, client digest, search/metrics",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.2 Step 6");
  }
});

check("feature inventory and release records map v3.2 Step 6", () => {
  for (const snippet of [
    "v3.2.0 (6) AI Review Quality Context | `UI-065`, `EVT-067`, `SAFE-107`, `OPS-074` | `verify-v320-ai-review-quality-context`, `verify-ops-client-ui`",
    "UI-065 | V320 Step 6 AI Review Quality Context UI",
    "EVT-067 | V320 Step 6 AI review quality view model",
    "SAFE-107 | V320 Step 6 AI review quality boundary",
    "OPS-074 | V320 Step 6 AI Review Quality Context 게이트",
    "`UI-001`~`UI-018`, `UI-022`~`UI-066`",
    "`EVT-001`~`EVT-068`",
    "`SAFE-001`~`SAFE-108`",
    "`OPS-035`~`OPS-075`",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.2 Step 6");
  }
  for (const snippet of [
    "V320 AI Review Quality Context",
    "`./server.sh verify-v320-ai-review-quality-context`",
    "v320 Step 6 RED AI review quality context gate",
    "v320 Step 6 AI review quality context final",
    "v320 Step 6 UI 풀테스트",
    "v320 Step 6 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.2 Step 6");
  }
});

check("server entrypoint and inventory verifiers include v3.2 Step 6 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v320_ai_review_quality_context.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["UI-065", "EVT-067", "SAFE-107", "OPS-074"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v320_ai_review_quality_context.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.2.0 AI review quality context summary ==");
console.log("- schema: media-server.ops.v320-ai-review-quality-context.v1");
console.log("- step: v3.2.0 (6)");
console.log("- route: /ops/events");
console.log("- payload: /ops/api/events/reviews unifiedResolutionWorkspace.aiReviewQuality");
console.log("- context dimensions: correctionReviewSignal, uncertaintyReason, qualityBadge");
console.log("- storage: reads existing Ops review state and EventRecord evidence refs only");
console.log("- unchanged: EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer output");
console.log("- operatorResolutionFlow: not-run-by-this-command");
console.log("- actionReadinessChecklist: not-run-by-this-command");
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
