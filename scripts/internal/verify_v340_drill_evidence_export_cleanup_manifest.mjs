#!/usr/bin/env node
// Verifies v3.4.0 Step 9 drill evidence export and cleanup manifest wiring.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.4.0 Drill Evidence Export and Cleanup Manifest verification

Usage:
  ./server.sh verify-v340-drill-evidence-export-cleanup-manifest

Checks:
  - Ops-only route exposes a redacted drill artifact manifest and minimum retained evidence list
  - /tmp cleanup and sensitive material scan boundaries are recorded without executing cleanup
  - /ops/sources renders the manifest read-only without source URL, raw locator, raw JSON, debug, or credential material
  - SourceRegistry, PublishedView, EventRecord/Event POST, media, metadata schemas, Rule/Profile payload, search/metrics, automatic recovery, and file cleanup are not mutated
  - backlog, stream verification, release records, feature inventory, manual UI checklist, ops/client smoke, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v340-drill-evidence-export-cleanup-manifest";
const schema = "media-server.ops.v340-drill-evidence-export-cleanup-manifest.v1";
const route = "/ops/api/source-registry/drill-evidence-export-cleanup-manifest";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  opsSourcesScript: readText("src/ingress/product_ui_ops_sources_script.cpp"),
  clientScript: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
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

check("Ops API records the redacted drill evidence export and cleanup manifest", () => {
  for (const snippet of [
    "struct OpsV340DrillEvidenceArtifact",
    "struct OpsV340DrillCleanupManifestItem",
    "struct OpsV340DrillEvidenceExportCleanupSummary",
    "BuildV340DrillEvidenceArtifactManifest",
    "BuildV340DrillCleanupManifest",
    "BuildV340DrillEvidenceExportCleanupSummary",
    "AppendV340DrillEvidenceArtifactJson",
    "AppendV340DrillCleanupManifestItemJson",
    "OpsV340DrillEvidenceExportCleanupManifestJson",
    schema,
    route,
    "\\\"redactedDrillArtifactManifest\\\":",
    "\\\"minimumRetainedEvidence\\\":",
    "\\\"tmpCleanupManifest\\\":",
    "\\\"sensitiveMaterialScanBoundary\\\":",
    "\\\"retainedEvidenceCount\\\":",
    "\\\"cleanupCandidateCount\\\":",
    "\\\"sensitiveScanPatternCount\\\":",
    "\\\"manifestOnly\\\":true",
    "\\\"artifactExportExecuted\\\":false",
    "\\\"cleanupExecutionPerformed\\\":false",
    "\\\"temporaryCleanupExecuted\\\":false",
    "\\\"sourceUrlIncluded\\\":false",
    "\\\"rawLocatorIncluded\\\":false",
    "\\\"rawJsonIncluded\\\":false",
    "\\\"debugMaterialIncluded\\\":false",
    "\\\"credentialMaterialIncluded\\\":false",
    "\\\"rawAuditBodyIncluded\\\":false",
    "\\\"providerMaterialIncluded\\\":false",
    "\\\"clientViewerMaterialIncluded\\\":false",
    "\\\"sourceRegistryWritePerformed\\\":false",
    "\\\"publishedViewWritePerformed\\\":false",
    "\\\"eventRecordWritePerformed\\\":false",
    "\\\"opsAuditWritePerformed\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
    "\\\"ruleProfilePayloadChanged\\\":false",
    "\\\"searchMetricsChanged\\\":false",
  ]) {
    assertIncludes(files.server, snippet, "drill evidence cleanup manifest API");
  }

  const routeBlock = extractBlock(files.server, `request.path == "${route}"`, "request.path == \"/ops/api/source-registry/backup-recovery-handoff\"");
  assertIncludes(routeBlock, "require_ops_principal()", "drill evidence cleanup route guard");
  assertIncludes(routeBlock, "request.method == \"GET\"", "drill evidence cleanup route method");
  assertIncludes(routeBlock, "Cache-Control", "drill evidence cleanup route no-store");
  assertIncludes(routeBlock, "OpsV340DrillEvidenceExportCleanupManifestJson(", "drill evidence cleanup route response");
});

check("Ops sources UI renders the drill manifest without exposing raw material", () => {
  for (const snippet of [
    "sourceDrillEvidenceManifestStatus",
    "sourceDrillEvidenceArtifactList",
    "sourceDrillEvidenceCleanupList",
    "sourceDrillEvidenceScanList",
    "renderDrillEvidenceExportCleanupManifest",
    route,
  ]) {
    assertIncludes(files.opsSourcesScript, snippet, "drill evidence cleanup UI controller");
  }
  for (const snippet of [
    "ops-drill-evidence-export-cleanup-manifest",
    "source-drill-evidence-manifest-status",
    "source-drill-evidence-artifact-list",
    "source-drill-evidence-cleanup-list",
    "source-drill-evidence-scan-list",
    "data-source-drill-evidence-manifest",
    schema,
  ]) {
    assertIncludes(files.server, snippet, "drill evidence cleanup UI shell");
  }
  for (const forbidden of [
    "sourceUrl",
    "rawLocator",
    "rawJson",
    "debugMaterial",
    "credentialMaterial",
    "rawAuditBody",
    "providerMaterial",
  ]) {
    assert(!files.opsSourcesScript.includes(`drillEvidenceExportCleanupManifest.${forbidden}`), `drill evidence UI must not read ${forbidden}`);
  }
  assert(!files.clientScript.includes(route), "client routes must not call the Ops drill evidence cleanup route");
  assert(!files.clientScript.includes(schema), "client routes must not expose the Ops drill evidence cleanup schema");
});

check("drill manifest styling and ops/client smoke track Step 9 markers", () => {
  for (const snippet of [
    ".source-drill-evidence-manifest-grid",
    ".source-drill-evidence-manifest-list",
    ".source-drill-evidence-manifest-card",
    ".source-drill-evidence-manifest-boundary",
  ]) {
    assertIncludes(files.css, snippet, "drill evidence cleanup CSS");
  }
  for (const snippet of [
    "ops-drill-evidence-export-cleanup-manifest",
    "source-drill-evidence-manifest-status",
    "source-drill-evidence-artifact-list",
    "source-drill-evidence-cleanup-list",
    "source-drill-evidence-scan-list",
    "renderDrillEvidenceExportCleanupManifest",
    route,
    schema,
    "cleanupExecutionPerformed",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops/client UI smoke v3.4 Step 9 marker");
  }
});

check("roadmap records v3.4 Step 9 without overclaiming field bridge or cleanup execution", () => {
  for (const snippet of [
    "| 9 | v3.4.0 (9) Drill Evidence Export and Cleanup Manifest | P1 | 완료 |",
    "## v3.4.0 Step 9 개발 기록",
    "OpsV340DrillEvidenceExportCleanupManifestJson",
    "renderDrillEvidenceExportCleanupManifest",
    `\`./server.sh ${command}\``,
    "Field Bridge Condition Gates 완료 evidence가 아닙니다",
    "cleanupExecutionPerformed=false",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.4 Step 9");
  }
});

check("stream verification exposes v3.4 Step 9 command and boundary", () => {
  for (const snippet of [
    `| v3.4.0 (9) | \`./server.sh ${command}\` | Drill Evidence Export and Cleanup Manifest.`,
    route,
    "redacted drill artifact manifest",
    "minimum retained evidence",
    "/tmp cleanup",
    "sensitive material scan",
    "cleanupExecutionPerformed=false",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.4 Step 9");
  }
});

check("feature inventory, manual UI, and release records map v3.4 Step 9", () => {
  for (const snippet of [
    `v3.4.0 (9) Drill Evidence Export and Cleanup Manifest | \`UI-078\`, \`SAFE-132\`, \`OPS-099\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-078 | V340 Step 9 Drill Evidence Export and Cleanup Manifest UI",
    "SAFE-132 | V340 Step 9 drill evidence export cleanup boundary",
    "OPS-099 | V340 Step 9 Drill Evidence Export and Cleanup Manifest 게이트",
    "`UI-001`~`UI-018`, `UI-022`~`UI-078`",
    "`SAFE-001`~`SAFE-132`",
    "`OPS-035`~`OPS-099`",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.4 Step 9");
  }
  for (const snippet of [
    "| V340 Step 9 Drill Evidence Export and Cleanup Manifest | `UI-078`, `SAFE-132`, `OPS-099` | `/ops/sources` |",
    "Drill Evidence Export and Cleanup Manifest",
    schema,
  ]) {
    assertIncludes(files.manualUi, snippet, "manual UI v3.4 Step 9");
  }
  for (const snippet of [
    "V340 Drill Evidence Export and Cleanup Manifest",
    `\`./server.sh ${command}\``,
    "v340 Step 9 RED drill evidence export cleanup manifest gate",
    "v340 Step 9 drill evidence export cleanup manifest final",
    "v340 Step 9 UI 풀테스트",
    "v340 Step 9 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.4 Step 9");
  }
});

check("server entrypoint and inventory verifiers include v3.4 Step 9 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v340_drill_evidence_export_cleanup_manifest.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["UI-078", "SAFE-132", "OPS-099"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.projectInventoryVerifier, "`UI-001`~`UI-018`, `UI-022`~`UI-078`", "project inventory UI range");
  assertIncludes(files.projectInventoryVerifier, "`SAFE-001`~`SAFE-132`", "project inventory SAFE range");
  assertIncludes(files.projectInventoryVerifier, "`OPS-035`~`OPS-099`", "project inventory OPS range");
  assertIncludes(files.scriptInventory, "verify_v340_drill_evidence_export_cleanup_manifest.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.4.0 drill evidence export and cleanup manifest ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.4.0 (9)");
console.log(`- route: ${route}`);
console.log("- ops route: /ops/sources");
console.log("- exposed fields: redactedDrillArtifactManifest, minimumRetainedEvidence, tmpCleanupManifest, sensitiveMaterialScanBoundary");
console.log("- hidden fields: source URL, raw locator, raw JSON, debug material, credential material, raw audit body, provider material, client viewer material");
console.log("- unchanged: source registry write, PublishedView write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, search/metrics, automatic recovery, cleanup execution");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log("- fieldBridge: not-run-by-this-command");
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

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end > start, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
