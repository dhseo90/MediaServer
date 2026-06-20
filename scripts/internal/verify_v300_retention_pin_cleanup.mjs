#!/usr/bin/env node
// 파일 용도: v3.0.0 S09 Retention/Pin/Cleanup 구현, fixture, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.0.0 Retention/Pin/Cleanup verification

Usage:
  ./server.sh verify-v300-retention-pin-cleanup

Checks:
  - V300-S09 fixture covers default retention, source/rule overrides, pinned exclusion, dry-run/apply, audit
  - analysis/event_retention_cleanup exposes cleanup policy, lifecycle action, audit, and boundary invariants
  - analysis-state smoke includes S09 dry-run, pin exclusion, lifecycle delete/de-index, and boundary checks
  - docs/backlog/stream verification/release records/feature inventory/server dispatch are wired
  - PASS is limited to V300-S09 local cleanup contract and does not imply destructive operational cleanup, UI 풀테스트, 30분/120분, or release publication
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v300-retention-pin-cleanup";
const fixturePath = "test/fixtures/v300_retention_pin_cleanup/cases.json";
const files = {
  header: readText("include/analysis/event_retention_cleanup.h"),
  source: readText("src/analysis/event_retention_cleanup.cpp"),
  smoke: readText("scripts/internal/analysis_state_smoke.cpp"),
  smokeBuild: readText("scripts/internal/verify_analysis_state_smoke.sh"),
  policy: readText("docs/v300-retention-pin-cleanup.md"),
  docsIndex: readText("docs/README.md"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  server: readText("server.sh"),
  cmake: readText("CMakeLists.txt"),
};
const fixture = JSON.parse(readText(fixturePath));
const checks = [];

check("fixture covers V300-S09 retention/pin/cleanup matrix", () => {
  assert(fixture.schema === "media-server.v300-retention-pin-cleanup-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V300-S09", "fixture targetStep mismatch");
  const ids = new Set((fixture.cases || []).map(item => item.id));
  for (const id of [
    "default-seven-day-expired-candidate",
    "pinned-event-excluded-from-cleanup",
    "source-and-rule-retention-override",
    "apply-lifecycle-delete-and-deindex",
    "cleanup-audit-trail",
  ]) {
    assert(ids.has(id), `fixture missing case: ${id}`);
  }
  for (const item of fixture.cases || []) {
    assert(item.expected?.status, `${item.id}: expected status missing`);
    assert(item.contractInvariants?.rawPromptStored === false, `${item.id}: raw prompt must not be stored`);
    assert(item.contractInvariants?.rawProviderResponseStored === false, `${item.id}: raw response must not be stored`);
    assert(item.contractInvariants?.eventPostPayloadChanged === false, `${item.id}: Event POST payload must not change`);
    assert(item.contractInvariants?.rtspWebrtcMediaPathChanged === false, `${item.id}: media path must not change`);
    assert(item.contractInvariants?.viewerClientExposureAdded === false, `${item.id}: viewer exposure must be false`);
  }
});

check("analysis module exposes cleanup policy, lifecycle actions, audit, and invariants", () => {
  for (const snippet of [
    "struct EventRetentionCleanupPolicy",
    "struct EventRetentionCleanupItem",
    "struct EventRetentionCleanupAction",
    "struct EventRetentionCleanupAuditEntry",
    "struct EventRetentionCleanupResult",
    "BuildEventRetentionCleanupPlan",
    "HasRetentionCleanupAction",
    "EventRetentionCleanupResultContainsForbiddenMaterial",
    "media-server.v300-retention-cleanup-report.v1",
    "retention-cleanup-dry-run",
    "retention-cleanup-apply",
    "retain-pinned",
    "would-delete",
    "deleted",
  ]) {
    assert(files.header.includes(snippet) || files.source.includes(snippet), `cleanup module missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "raw_prompt_stored",
    "raw_provider_response_stored",
    "event_post_payload_changed",
    "rtsp_webrtc_media_path_changed",
    "viewer_client_exposure_added",
  ]) {
    assert(files.header.includes(snippet) || files.source.includes(snippet), `cleanup invariant missing snippet: ${snippet}`);
  }
});

check("analysis-state smoke verifies S09 behavior and build links module", () => {
  for (const snippet of [
    "VerifyV300RetentionPinCleanup",
    "V300 S09 dry-run selects expired non-pinned events only",
    "V300 S09 pin exclusion preserves pinned evidence",
    "V300 S09 apply deletes evidence feature and search lifecycle together",
    "V300 S09 audit trail records dry-run and apply cleanup boundaries",
    "V300 S09 preserves provider/schema/media/viewer boundary invariants",
  ]) {
    assert(files.smoke.includes(snippet), `analysis_state_smoke missing S09 snippet: ${snippet}`);
  }
  assert(files.smokeBuild.includes("src/analysis/event_retention_cleanup.cpp"), "analysis smoke build missing event_retention_cleanup.cpp");
  assert(files.cmake.includes("src/analysis/event_retention_cleanup.cpp"), "CMake missing event_retention_cleanup.cpp");
});

check("docs and roadmap expose V300-S09 scope without overclaim", () => {
  for (const snippet of [
    "v3.0.0 `V300-S09 Retention/Pin/Cleanup`",
    "media-server.v300-retention-cleanup-report.v1",
    "defaultRetentionDays",
    "pinnedExcludesAutomaticCleanup",
    "cleanup dry-run",
    "lifecycle delete",
    "audit trail",
    "destructive 운영 cleanup 실행 evidence가 아님",
  ]) {
    assert(files.policy.includes(snippet), `policy doc missing snippet: ${snippet}`);
  }
  assert(files.docsIndex.includes("[v300-retention-pin-cleanup.md](v300-retention-pin-cleanup.md)"), "docs index missing S09 doc");
  for (const snippet of [
    "| 9 | V300-S09 | P1 | 완료 | Retention/Pin/Cleanup |",
    "7일 기본 retention, pin 제외, 설정 가능 cleanup, dry-run/audit",
    "docs/v300-retention-pin-cleanup.md",
    "`./server.sh verify-v300-retention-pin-cleanup`",
    "destructive cleanup 실행은 별도 승인과 evidence 필요",
  ]) {
    assert(files.backlog.includes(snippet), `backlog missing V300-S09 snippet: ${snippet}`);
  }
  for (const snippet of [
    "| V300-S09 | `./server.sh verify-v300-retention-pin-cleanup` |",
    "Configurable retention, pin exclusion, dry-run/apply lifecycle cleanup, and audit trail",
    "destructive operational cleanup, UI 풀테스트, 30분/120분, published metadata evidence가 아님",
  ]) {
    assert(files.streamVerification.includes(snippet), `stream verification missing V300-S09 snippet: ${snippet}`);
  }
});

check("feature inventory and release records map V300-S09 to LAB-088, SAFE-091, and OPS-059", () => {
  for (const snippet of [
    "V300-S09 Retention/Pin/Cleanup | `LAB-088`, `SAFE-091`, `OPS-059` | `verify-v300-retention-pin-cleanup`, `verify-analysis-state`",
    "LAB-088 | V300-S09 retention/pin/cleanup fixture",
    "SAFE-091 | V300-S09 retention cleanup boundary",
    "OPS-059 | V300-S09 retention/pin/cleanup 게이트",
  ]) {
    assert(files.featureInventory.includes(snippet), `feature inventory missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "V300 Retention/Pin/Cleanup",
    "`./server.sh verify-v300-retention-pin-cleanup`",
    "v300 S09 RED retention/pin/cleanup analysis-state gate",
    "v300 S09 RED retention/pin/cleanup static gate",
    "v300 S09 UI/longrun/published/destructive cleanup",
  ]) {
    assert(files.releaseRecords.includes(snippet), `release records missing snippet: ${snippet}`);
  }
});

check("server entrypoint and inventory verifiers include V300-S09 command", () => {
  assert(files.server.includes(command), "server.sh missing V300-S09 command");
  assert(files.server.includes("verify_v300_retention_pin_cleanup.mjs"), "server.sh missing V300-S09 script dispatch");
  assert(files.featureCoverageVerifier.includes(command), "feature coverage verifier missing V300-S09 command");
  assert(files.projectInventoryVerifier.includes("LAB-088") &&
    files.projectInventoryVerifier.includes("SAFE-091") &&
    files.projectInventoryVerifier.includes("OPS-059"), "project inventory verifier missing V300-S09 IDs");
  assert(files.scriptInventory.includes("verify_v300_retention_pin_cleanup.mjs"), "script inventory missing V300-S09 verifier");
});

const results = runChecks();
console.log("");
console.log("== v3.0.0 retention/pin/cleanup summary ==");
console.log("- schema: media-server.v300-retention-pin-cleanup-fixtures.v1");
console.log("- step: V300-S09");
console.log(`- fixture: ${fixturePath}`);
console.log("- cleanupPolicy: default 7 days with source/rule overrides");
console.log("- pinPolicy: pinned events excluded from automatic cleanup");
console.log("- lifecycle: EventRecord, EvidenceManifest, FeatureSet revisions, SearchIndex entries");
console.log("- destructiveOperationalCleanup: not-run-by-this-command");
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

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
