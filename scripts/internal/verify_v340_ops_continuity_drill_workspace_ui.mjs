#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.4.0 Step 6 Ops Continuity Drill Workspace UI 구현, 문서, inventory 연결을 검증한다.
import { extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.4.0 Ops Continuity Drill Workspace UI verification

Usage:
  ./server.sh verify-v340-ops-continuity-drill-workspace-ui

Checks:
  - /ops/sources renders an Ops-only read-only continuity drill workspace
  - the UI shows drill package, validation status, blocked/ready state, and source health drift status
  - client/viewer scripts and ClientPublishedView JSON do not expose drill package, raw locator, raw JSON, debug, or credential material
  - backlog, stream verification, release records, manual UI checklist, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v340-ops-continuity-drill-workspace-ui";
const schema = "media-server.ops.v340-continuity-drill-workspace-ui.v1";
const files = {
  server: readWebRtcHttpServerBundle(readText),
  opsSourcesScript: readText("src/ingress/product_ui_ops_sources_script.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  registry: readText("src/ingress/source_view_registry.cpp"),
  uiSmoke: readText("scripts/internal/verify_ops_client_ui_smoke.mjs"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  manualUi: readText("docs/manual-ui-checklist.md"),
  serverSh: readText("server.sh"),
};

const checks = [];

check("/ops/sources declares the v3.4 continuity drill workspace UI shell", () => {
  for (const snippet of [
    "ops-continuity-drill-workspace",
    "source-continuity-drill-status",
    "source-continuity-drill-package-count",
    "source-continuity-drill-validation-ready-count",
    "source-continuity-drill-blocked-count",
    "source-continuity-drill-drift-count",
    "source-continuity-drill-package-list",
    "source-continuity-drill-validation-list",
    "source-continuity-drill-drift-list",
    schema,
    "data-source-continuity-drill-workspace",
  ]) {
    assertIncludes(files.server, snippet, "v340 continuity drill workspace HTML");
  }
});

check("/ops/sources renders drill package, validation status, blocked/ready, and drift state", () => {
  for (const snippet of [
    "renderOpsContinuityDrillWorkspace",
    "requestJson('/ops/api/source-registry/continuity-drill/contract')",
    "requestJson('/ops/api/source-registry/recovery-candidate-package')",
    "requestJson('/ops/api/source-registry/source-health-replay-drift-diff')",
    "recoveryCandidatePackageSummary",
    "recoveryCandidates",
    "sourceHealthReplayDriftDiffSummary",
    "sourceHealthReplayDriftItems",
    "drillPackageReady",
    "validationReady",
    "blockedSources",
    "data-source-continuity-drill-package",
    "data-source-continuity-drill-validation",
    "data-source-continuity-drill-drift",
    "automaticRecoveryPerformed",
  ]) {
    assertIncludes(files.opsSourcesScript, snippet, "v340 continuity drill workspace renderer");
    assertIncludes(extractNamedFunctionBlock(files.opsSourcesScript, "renderOpsContinuityDrillWorkspace"), "automaticRecoveryPerformed", "UI-075 block-scoped canonical product state");
    const sourceRegistryWritePerformed = ["requestJson(", "fetch(", "method: 'POST'", "method: 'PUT'", "method: 'DELETE'"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderOpsContinuityDrillWorkspace").includes(marker));
    assert(sourceRegistryWritePerformed === false, "UI-075 continuity drill workspace must remain read-only");
    assert(!["requestJson(","fetch(","method: 'POST'","method: 'PUT'","method: 'DELETE'"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderOpsContinuityDrillWorkspace").includes(marker)), "UI-075 no-write explicit absence oracle");
    assert(!["rawJson","rawLocator","rawEvidenceIncluded: true","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderOpsContinuityDrillWorkspace").includes(marker)), "UI-075 raw-material-redaction explicit absence oracle");
    assert(!["sourceUrl","sourceURL","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderOpsContinuityDrillWorkspace").includes(marker)), "UI-075 source-url-redaction explicit absence oracle");
    assert(!["passwordHash","tokenHash","Authorization:","credentialValue"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderOpsContinuityDrillWorkspace").includes(marker)), "UI-075 credential-redaction explicit absence oracle");
    assert(!["debugCounters","Developer URL","debugMaterialExposed: true"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderOpsContinuityDrillWorkspace").includes(marker)), "UI-075 debug-redaction explicit absence oracle");
    assertIncludes(files.opsSourcesScript, "/ops/sources", "UI-075 canonical route obligation");
    assertIncludes(files.server, "media-server.ops.v340-continuity-drill-workspace-ui.v1", "UI-075 canonical schema obligation");
  }
});

check("continuity drill workspace styling and smoke markers are tracked", () => {
  for (const snippet of [
    ".source-continuity-drill-grid",
    ".source-continuity-drill-card",
    ".source-continuity-drill-list",
    ".source-continuity-drill-boundary",
  ]) {
    assertIncludes(files.css, snippet, "v340 continuity drill workspace CSS");
  }
  for (const snippet of [
    "ops-continuity-drill-workspace",
    "source-continuity-drill-status",
    schema,
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops/client UI smoke v3.4 Step 6 marker");
  }
});

check("client/viewer surfaces do not expose continuity drill package material", () => {
  for (const forbidden of [
    schema,
    "source-continuity-drill",
    "recoveryCandidates",
    "sourceHealthReplayDriftItems",
    "continuity-drill/contract",
    "recovery-candidate-package",
    "source-health-replay-drift-diff",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose Step 6 drill workspace material: ${forbidden}`);
  }
  const clientBlock = extractBlock(files.registry, "std::string ClientPublishedViewJson", "SourceViewRegistry::SourceIdentityPublishedView ToSourceIdentityPublishedView");
  for (const forbidden of [
    "recoveryCandidates",
    "sourceHealthReplayDriftItems",
    "rawLocator",
    "rtspUrl",
    "whepUrl",
    "httpUrl",
    "webrtcSourceId",
  ]) {
    assert(!clientBlock.includes(forbidden), `client view JSON must not expose ${forbidden}`);
  }
});

check("roadmap records v3.4 Step 6 without overclaiming approval or client digest", () => {
  for (const snippet of [
    "| 6 | v3.4.0 (6) Ops Continuity Drill Workspace UI | P1 | 완료 |",
    "## v3.4.0 Step 6 개발 기록",
    "renderOpsContinuityDrillWorkspace",
    "source-continuity-drill-status",
    `\`./server.sh ${command}\``,
    "Approval-Gated Recovery Checklist and Audit 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.4 Step 6");
  }
});

check("stream verification exposes v3.4 Step 6 command and boundary", () => {
  for (const snippet of [
    `| v3.4.0 (6) | \`./server.sh ${command}\` | Ops Continuity Drill Workspace UI.`,
    "/ops/sources",
    "drill package, validation status, blocked/ready 상태",
    "source URL/raw locator/raw JSON/debug/credential material",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.4 Step 6");
  }
});

check("feature inventory, manual UI, and release records map v3.4 Step 6", () => {
  for (const snippet of [
    `v3.4.0 (6) Ops Continuity Drill Workspace UI | \`UI-075\`, \`SAFE-129\`, \`OPS-096\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-075 | V340 Step 6 Ops Continuity Drill Workspace UI",
    "SAFE-129 | V340 Step 6 Ops continuity drill UI boundary",
    "OPS-096 | V340 Step 6 Ops Continuity Drill Workspace UI 게이트",
    "`UI-001`~`UI-115`",
    "`SAFE-001`~`SAFE-216`",
    "`OPS-035`~`OPS-184`",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.4 Step 6");
  }
  for (const snippet of [
    "| V340 Step 6 Ops Continuity Drill Workspace UI | `UI-075`, `SAFE-129`, `OPS-096` | `/ops/sources` |",
    "Ops Continuity Drill Workspace",
    schema,
  ]) {
    assertIncludes(files.manualUi, snippet, "manual UI v3.4 Step 6");
  }
  for (const snippet of [
    "V340 Ops Continuity Drill Workspace UI",
    `\`./server.sh ${command}\``,
    "v340 Step 6 RED ops continuity drill workspace UI gate",
    "v340 Step 6 ops continuity drill workspace UI final",
    "v340 Step 6 UI 풀테스트",
    "v340 Step 6 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.4 Step 6");
  }
});

check("server entrypoint and inventory verifiers include v3.4 Step 6 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v340_ops_continuity_drill_workspace_ui.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage verifier canonical manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier command coverage summary");
  for (const id of ["UI-075", "SAFE-129", "OPS-096"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.projectInventoryVerifier, "`UI-001`~`UI-115`", "project inventory UI range");
  assertIncludes(files.projectInventoryVerifier, "`SAFE-001`~`SAFE-216`", "project inventory SAFE range");
  assertIncludes(files.projectInventoryVerifier, "`OPS-035`~`OPS-184`", "project inventory OPS range");
  assertIncludes(files.scriptInventory, "verify_v340_ops_continuity_drill_workspace_ui.mjs", "script inventory");
});

check("SAFE-129 canonical continuity drill UI boundary", () => {
  const block = extractNamedFunctionBlock(files.opsSourcesScript, "renderOpsContinuityDrillWorkspace");
  const safe129BoundaryObserved = block.includes("candidates.slice(0, 8)") && block.includes("contractInputs.map(input");
  const mutationPerformed = /\b(?:fetch|requestJson|Write|Recover)[A-Za-z0-9_$:]*\s*\(/.test(block);
  const rawMaterialExposed = /sourceUrl|rawLocator|rawJson|debugMaterial|credentialMaterial/.test(block);
  const writePerformed = mutationPerformed;
  const sourceUrlExposed = /sourceUrl/.test(block);
  const credentialMaterialExposed = /credentialMaterial/.test(block);
  const debugMaterialExposed = /debugMaterial/.test(block);
  assert(safe129BoundaryObserved && mutationPerformed === false && writePerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false,
    "SAFE-129 candidates.slice(0, 8) /ops/sources drill workspace must remain read-only without raw credential or automatic recovery");
});

const results = runChecks();
console.log("");
console.log("== v3.4.0 ops continuity drill workspace UI ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.4.0 (6)");
console.log("- route: /ops/sources");
console.log("- shows: drill package, validation status, blocked/ready, source health drift");
console.log("- clientExposure: false");
console.log("- automaticRecovery: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
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
