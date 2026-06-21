#!/usr/bin/env node
// 파일 용도: v3.1.0 S06 Operator Feature Correction 구현, UI/API, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.1.0 Operator Feature Correction verification

Usage:
  ./server.sh verify-v310-operator-feature-correction

Checks:
  - /ops/events exposes an Ops-only operator feature correction surface
  - /ops/api/events/reviews persists corrected feature labels, aliases, and reanalysis requests in review state only
  - the API/view model does not mutate EventRecord, Event POST, WebRTC/DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer output, or provider runtime state
  - product UI renders correction controls and saves them through the existing review endpoint
  - roadmap, stream verification, release records, feature inventory, manual UI checklist, and server dispatch are wired
  - PASS is limited to V310-S06 local/Ops evidence and does not imply UI 풀테스트, 30분/120분, vector search, cleanup execution, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v310-operator-feature-correction";
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
  manualChecklist: readText("docs/manual-ui-checklist.md"),
  serverSh: readText("server.sh"),
};
const checks = [];

check("ops events page exposes V310 operator feature correction UI shell", () => {
  for (const snippet of [
    'data-testid="ops-v310-operator-feature-correction"',
    'data-v310-operator-feature-correction="ops-only-feature-alias-reanalysis"',
    'id="opsV310OperatorFeatureCorrectionSummary"',
    'id="opsV310OperatorFeatureCorrectionBadges"',
    'id="opsV310OperatorFeatureCorrectionRows"',
    "Operator Feature Correction",
    "feature correction",
    "aliases",
    "reanalysis request",
  ]) {
    assertIncludes(files.server, snippet, "V310 operator correction UI shell");
  }
});

check("ops review state persists correction, aliases, and reanalysis request separately", () => {
  for (const snippet of [
    "corrected_feature_label",
    "feature_aliases",
    "reanalysis_requested",
    "reanalysis_reason",
    "media-server.ops.operator-feature-correction.v1",
    "\\\"operatorFeatureCorrection\\\":",
    "\\\"featureCorrection\\\":",
    "\\\"correctedFeatureLabel\\\":",
    "\\\"featureAliases\\\":",
    "\\\"reanalysisRequested\\\":",
    "\\\"reanalysisReason\\\":",
    "\\\"separateFromEventRecords\\\":true",
    "\\\"eventPostPayloadChanged\\\":false",
  ]) {
    assertIncludes(files.server, snippet, "operator correction review state");
  }
});

check("review update API accepts correction payload and writes correction audit", () => {
  for (const snippet of [
    "ParseStringField(request.body, \"correctedFeatureLabel\")",
    "StringArrayFieldValues(request.body, \"featureAliases\")",
    "ParseBoolField(request.body, \"reanalysisRequested\")",
    "ParseStringField(request.body, \"reanalysisReason\")",
    "ExtractObjectField(request.body, \"featureCorrection\")",
    "\"operator-feature-correction-update\"",
    "\"Feature correction updated\"",
  ]) {
    assertIncludes(files.server, snippet, "operator correction update route");
  }
});

check("ops review API returns V310 operator correction view model with boundary flags", () => {
  for (const snippet of [
    "OpsV310OperatorFeatureCorrectionViewJson",
    "OpsV310OperatorFeatureCorrectionItemJson",
    "media-server.ops.operator-feature-correction.v1",
    "\\\"status\\\":\\\"ops-operator-feature-correction\\\"",
    "\\\"correctionCount\\\":",
    "\\\"aliasCount\\\":",
    "\\\"reanalysisRequestCount\\\":",
    "\\\"modelProviderDependency\\\":false",
    "\\\"runtimeProviderCallPerformed\\\":false",
    "\\\"featureRevisionWritePerformed\\\":false",
    "\\\"automaticRuleApplied\\\":false",
    "\\\"viewerClientExposureAdded\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"webrtcDataChannelSchemaChanged\\\":false",
    "\\\"sseMetadataSchemaChanged\\\":false",
    "\\\"wsMetadataSchemaChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
  ]) {
    assertIncludes(files.server, snippet, "operator correction view model");
  }
});

check("product UI renders correction controls and saves them through review state", () => {
  for (const snippet of [
    "eventReviewFeatureCorrectionHtml",
    "renderV310OperatorFeatureCorrection",
    "opsV310OperatorFeatureCorrectionRows",
    "operatorFeatureCorrection",
    "data-testid=\"ops-event-feature-correction-controls\"",
    "data-event-review-field=\"correctedFeatureLabel\"",
    "data-event-review-field=\"featureAliases\"",
    "data-event-review-field=\"reanalysisRequested\"",
    "data-event-review-field=\"reanalysisReason\"",
    "schema: 'media-server.ops.operator-feature-correction.v1'",
    "featureCorrection: {",
    "correctedFeatureLabel:",
    "featureAliases:",
    "reanalysisRequested:",
    "reanalysisReason:",
  ]) {
    assertIncludes(files.pageScript, snippet, "operator correction product UI script");
  }
});

check("V310 operator correction UI has stable responsive styles", () => {
  for (const snippet of [
    ".v310-operator-feature-correction",
    ".operator-feature-correction-list",
    ".operator-feature-correction-card",
    ".ops-feature-correction-controls",
    ".ops-feature-correction-controls label",
  ]) {
    assertIncludes(files.css, snippet, "operator correction CSS");
  }
});

check("ops static smoke tracks S06 markers", () => {
  for (const snippet of [
    'data-testid="ops-v310-operator-feature-correction"',
    'id="opsV310OperatorFeatureCorrectionRows"',
    "operatorFeatureCorrection",
    "media-server.ops.operator-feature-correction.v1",
    "correctedFeatureLabel",
    "featureAliases",
    "reanalysisRequested",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops UI smoke S06 markers");
  }
});

check("docs and roadmap expose V310-S06 scope without overclaim", () => {
  for (const snippet of [
    "V310-S06` Operator Feature Correction 완료",
    "| 6 | V310-S06 | P1 | 완료 | Operator Feature Correction |",
    "correctedFeatureLabel",
    "featureAliases",
    "reanalysisRequested",
    "UI 풀테스트 직접 조작, 30분/120분, vector search, cleanup execution, published metadata evidence가 아님",
    "## v3.1.0 S06 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog V310-S06");
  }
  for (const snippet of [
    "| V310-S06 | `./server.sh verify-v310-operator-feature-correction` |",
    "operator feature correction",
    "aliases",
    "reanalysis request",
    "EventRecord/Event POST/WebRTC/SSE/WS/media path",
    "UI 풀테스트 직접 조작, 30분/120분, vector search, cleanup execution",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification V310-S06");
  }
});

check("feature inventory, manual UI checklist, and release records map V310-S06", () => {
  for (const snippet of [
    "V310-S06 Operator Feature Correction | `UI-061`, `EVT-061`, `SAFE-098`, `OPS-065` | `verify-v310-operator-feature-correction`, `verify-ops-client-ui`",
    "UI-061 | `/ops/events` V310 Operator Feature Correction",
    "EVT-061 | V310-S06 operator feature correction state",
    "SAFE-098 | V310-S06 operator correction boundary",
    "OPS-065 | V310-S06 Operator Feature Correction 게이트",
    "`UI-001`~`UI-018`, `UI-022`~`UI-061`",
    "`EVT-001`~`EVT-061`",
    "`SAFE-001`~`SAFE-098`",
    "`OPS-035`~`OPS-065`",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory V310-S06");
  }
  for (const snippet of [
    "V310-S06 Operator Feature Correction",
    "`UI-061`, `EVT-061`, `SAFE-098`, `OPS-065`",
    "correctedFeatureLabel/featureAliases/reanalysisRequested",
    "`verify-v310-operator-feature-correction`, `verify-ops-client-ui`",
  ]) {
    assertIncludes(files.manualChecklist, snippet, "manual UI checklist V310-S06");
  }
  for (const snippet of [
    "V310 Operator Feature Correction",
    "`./server.sh verify-v310-operator-feature-correction`",
    "v310 S06 RED operator feature correction gate",
    "v310 S06 operator feature correction final",
    "v310 S06 UI 풀테스트",
    "v310 S06 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records V310-S06");
  }
});

check("server entrypoint and inventory verifiers include V310-S06 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v310_operator_feature_correction.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  assertIncludes(files.projectInventoryVerifier, "UI-061", "project inventory verifier UI-061");
  assertIncludes(files.projectInventoryVerifier, "EVT-061", "project inventory verifier EVT-061");
  assertIncludes(files.projectInventoryVerifier, "SAFE-098", "project inventory verifier SAFE-098");
  assertIncludes(files.projectInventoryVerifier, "OPS-065", "project inventory verifier OPS-065");
  assertIncludes(files.scriptInventory, "verify_v310_operator_feature_correction.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.1.0 operator feature correction summary ==");
console.log("- schema: media-server.ops.operator-feature-correction.v1");
console.log("- step: V310-S06");
console.log("- route: /ops/events");
console.log("- API: /ops/api/events/reviews/{eventId}");
console.log("- persisted fields: correctedFeatureLabel, featureAliases, reanalysisRequested, reanalysisReason");
console.log("- hidden/mutated fields: EventRecord payload, Event POST, WebRTC DataChannel, SSE/WS metadata, media path, Rule/Profile payload, client/viewer output");
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

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
