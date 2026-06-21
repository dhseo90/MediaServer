#!/usr/bin/env node
// 파일 용도: v3.1.0 S08 Retention/Export Hardening 구현, 감사, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.1.0 Retention/Export Hardening verification

Usage:
  ./server.sh verify-v310-retention-export-hardening

Checks:
  - encoded clip lifecycle cleanup is tied to EventRecord/EvidenceManifest/FeatureSet/SearchIndex cleanup planning
  - release-safe export bundles exclude encoded clip media/path/material and carry a V310 hardening policy marker
  - export bundle downloads write explicit Ops audit coverage with retention/export policy fields
  - roadmap, stream verification, release records, feature inventory, and server dispatch are wired
  - PASS is limited to V310-S08 local retention/export evidence and does not imply UI 풀테스트, 30분/120분, vector search, destructive operational cleanup, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v310-retention-export-hardening";
const files = {
  cleanupHeader: readText("include/analysis/event_retention_cleanup.h"),
  cleanupCpp: readText("src/analysis/event_retention_cleanup.cpp"),
  eventStorage: readText("src/analysis/event_storage.cpp"),
  server: readText("src/ingress/webrtc_http_server.cpp"),
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

check("retention cleanup plan covers encoded clip lifecycle artifacts", () => {
  for (const snippet of [
    "encoded_clip_manifest_count",
    "encoded_clip_media_count",
    "deleted_encoded_clip_manifests",
    "deleted_encoded_clip_media",
    "encoded_clip_manifest_deleted",
    "encoded_clip_media_deleted",
    "encodedClipManifestsDeleted",
    "encodedClipMediaDeleted",
    "encoded-clip-retention-export-hardening",
  ]) {
    assertIncludes(`${files.cleanupHeader}\n${files.cleanupCpp}`, snippet, "encoded clip cleanup lifecycle");
  }
});

check("encoded clip manifests declare S08 lifecycle/export hardening policy", () => {
  for (const snippet of [
    "\\\"retentionExportHardening\\\":{",
    "\\\"schema\\\":\\\"media-server.v310.retention-export-hardening.v1\\\"",
    "\\\"implementedInStep\\\":\\\"V310-S08\\\"",
    "\\\"encodedClipLifecycleCleanup\\\":true",
    "\\\"exportBundleAuditCoverage\\\":true",
    "\\\"releaseSafeExportExcludesEncodedMedia\\\":true",
    "\\\"tokenExpiryNoServerFile\\\":true",
  ]) {
    assertIncludes(files.eventStorage, snippet, "encoded manifest S08 hardening policy");
  }
});

check("release-safe export bundle excludes encoded clip material with V310 policy markers", () => {
  for (const snippet of [
    "media-server.v310.retention-export-hardening.v1",
    "\\\"encodedClipIncluded\\\":false",
    "\\\"encodedClipManifestIncluded\\\":false",
    "\\\"encodedClipPathIncluded\\\":false",
    "\\\"encodedClipMediaIncluded\\\":false",
    "\\\"releaseSafeExportExcludesEncodedMedia\\\":true",
    "\\\"signed-token-expiresAtMs\\\"",
    "\\\"token-expiry-no-server-file\\\"",
  ]) {
    assertIncludes(files.server, snippet, "release-safe export hardening");
  }
});

check("export bundle download audit records retention/export hardening coverage", () => {
  for (const snippet of [
    "BuildEvidenceBundleAuditJson",
    "\"Export bundle downloaded with V310 retention/export hardening\"",
    "\\\"action\\\":\\\"export-bundle\\\"",
    "\\\"schema\\\":\\\"media-server.v310.retention-export-hardening.v1\\\"",
    "\\\"bundleExpiry\\\":\\\"signed-token-expiresAtMs\\\"",
    "\\\"expiredBundleCleanup\\\":\\\"token-expiry-no-server-file\\\"",
    "\\\"encodedClipLifecycleCleanup\\\":\\\"event-retention-cleanup\\\"",
    "\\\"releaseSafe\\\":",
  ]) {
    assertIncludes(files.server, snippet, "export bundle audit coverage");
  }
});

check("docs and roadmap expose V310-S08 scope without overclaim", () => {
  for (const snippet of [
    "V310-S08` Retention/Export Hardening 완료",
    "| 8 | V310-S08 | P1 | 완료 | Retention/Export Hardening |",
    "encoded clip lifecycle cleanup",
    "release-safe export bundle",
    "export-bundle audit",
    "UI 풀테스트 직접 조작, 30분/120분, vector search, destructive operational cleanup, published metadata evidence가 아님",
    "## v3.1.0 S08 개발 기록",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog V310-S08");
  }
  for (const snippet of [
    "| V310-S08 | `./server.sh verify-v310-retention-export-hardening` |",
    "encoded clip lifecycle cleanup",
    "release-safe export bundle",
    "export-bundle audit",
    "destructive operational cleanup",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification V310-S08");
  }
});

check("feature inventory and release records map V310-S08", () => {
  for (const snippet of [
    "V310-S08 Retention/Export Hardening | `EVT-062`, `SAFE-099`, `OPS-066` | `verify-v310-retention-export-hardening`, `verify-analysis-state`",
    "EVT-062 | V310-S08 encoded clip lifecycle cleanup",
    "SAFE-099 | V310-S08 retention/export boundary",
    "OPS-066 | V310-S08 Retention/Export Hardening 게이트",
    "`EVT-001`~`EVT-062`",
    "`SAFE-001`~`SAFE-099`",
    "`OPS-035`~`OPS-066`",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory V310-S08");
  }
  for (const snippet of [
    "V310 Retention/Export Hardening",
    "`./server.sh verify-v310-retention-export-hardening`",
    "v310 S08 RED retention/export hardening gate",
    "v310 S08 retention/export hardening final",
    "v310 S08 UI 풀테스트",
    "v310 S08 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records V310-S08");
  }
});

check("server entrypoint and inventory verifiers include V310-S08 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v310_retention_export_hardening.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  assertIncludes(files.projectInventoryVerifier, "EVT-062", "project inventory verifier EVT-062");
  assertIncludes(files.projectInventoryVerifier, "SAFE-099", "project inventory verifier SAFE-099");
  assertIncludes(files.projectInventoryVerifier, "OPS-066", "project inventory verifier OPS-066");
  assertIncludes(files.scriptInventory, "verify_v310_retention_export_hardening.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.1.0 retention/export hardening summary ==");
console.log("- schema: media-server.v310.retention-export-hardening.v1");
console.log("- step: V310-S08");
console.log("- cleanupLifecycle: encoded clip tied to event retention cleanup");
console.log("- exportBundle: release-safe excludes encoded media/path/material");
console.log("- auditAction: export-bundle");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log("- vectorSearch: not-run-by-this-command");
console.log("- destructiveOperationalCleanup: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(text, snippet, context) {
  assert(text.includes(snippet), `${context} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function check(name, fn) {
  checks.push({ name, fn });
}

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
      console.error(`[fail] ${item.name}: ${error.message}`);
    }
  }
  return { pass, fail };
}
