#!/usr/bin/env node
// 파일 용도: v3.9.0 Step 15 backup/recovery staging restore validation handoff 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 backup/recovery handoff validation verification

Usage:
  ./server.sh verify-v390-backup-recovery-handoff-validation

Checks:
  - /ops/api/source-registry/staging-restore-validation-handoff exposes the Step 15 product decision
  - the route links v3.3 backup/recovery source handoff inputs to the v3.4 staging restore validation harness
  - /ops/sources renders checklist/result artifact status without claiming production restore or cutover
  - SourceRegistry/PublishedView writes, production restore, automatic recovery, client exposure, credentials, and media/event schemas remain unchanged
  - route/UI/docs/inventory/release records/dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-backup-recovery-handoff-validation";
const targetScript = "verify_v390_backup_recovery_handoff_validation.mjs";
const schema = "media-server.ops.v390-staging-restore-validation-handoff.v1";
const route = "/ops/api/source-registry/staging-restore-validation-handoff";
const sourceHandoffRoute = "/ops/api/source-registry/backup-recovery-handoff";
const stagingHarnessCommand = "verify-v340-staging-restore-validation-harness";
const featureIds = ["UI-112", "SRC-067", "SAFE-207", "OPS-174"];
const files = loadFiles();
const checks = [];

check("Ops server exposes the v3.9 staging restore validation handoff", () => {
  for (const snippet of [
    "OpsV390StagingRestoreValidationHandoffJson",
    schema,
    route,
    "V390-CAND-005",
    "staging-restore-validation-checklist-result-handoff",
    "stagingRestoreValidationChecklist",
    "resultArtifactContract",
    "stagingHarnessCommand",
    "sourceHandoffRoute",
    "viewerScopeValidation",
  ]) {
    assertIncludes(files.server, snippet, "v390 staging restore validation handoff server model");
  }
});

check("handoff validation preserves no-production-write and no-client-exposure boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV390StagingRestoreValidationHandoffJson",
    "struct OpsV330ReliabilityTimelineEvent",
  );
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "stagingOnly",
    "resultArtifactPersistedByRoute",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "sourceHealthSnapshotPersisted",
    "productionRestorePerformed",
    "automaticRecoveryPerformed",
    "viewerScopeChanged",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "v390 staging restore validation boundary flags");
  }
  for (const flag of [
    "resultArtifactPersistedByRoute",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "sourceHealthSnapshotPersisted",
    "productionRestorePerformed",
    "automaticRecoveryPerformed",
    "viewerScopeChanged",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertFlagFalse(block, flag);
  }
});

check("Ops API exposes the handoff validation route as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "v390 staging restore validation handoff route");
  assertIncludes(block, "request.method == \"GET\"", "v390 staging restore validation handoff route");
  assertIncludes(block, "require_ops_principal()", "v390 staging restore validation handoff route");
  assertIncludes(block, "OpsV390StagingRestoreValidationHandoffJson()", "v390 staging restore validation handoff route");
  assertIncludes(block, "Cache-Control", "v390 staging restore validation handoff route");
  assertIncludes(block, "no-store", "v390 staging restore validation handoff route");
  assert(!block.includes("require_source_write_principal"), "handoff validation route must not require source writes");

  const sourceBlock = extractRouteBlock(files.server, sourceHandoffRoute);
  assertIncludes(sourceBlock, sourceHandoffRoute, "source handoff route must remain available");
  assertIncludes(files.server, "OpsV330BackupRecoverySourceHandoffJson", "source handoff route must remain available");
  assertIncludes(files.serverSh, stagingHarnessCommand, "staging harness command remains dispatched");
});

check("Ops sources UI renders staging restore checklist and result artifact status", () => {
  for (const snippet of [
    route,
    "sourceStagingRestoreValidationStatus",
    "source-staging-restore-checklist-list",
    "source-staging-restore-result-artifact-list",
    "renderStagingRestoreValidationHandoff",
    "staging-restore-validation-checklist-result-handoff",
    "resultArtifactPersistedByRoute=false",
    "productionRestorePerformed=false",
    "automaticRecoveryPerformed=false",
  ]) {
    assertIncludes(files.opsSourcesScript + files.server, snippet, "v390 staging restore validation UI");
  }
  assertIncludes(files.opsClientUiSmoke, "sourceStagingRestoreValidationStatus", "ops client UI smoke");
});

check("roadmap, backup guide, stream verification, inventory, and release records map v3.9 Step 15", () => {
  for (const snippet of [
    "| 15 | v3.9.0 (15) backup/recovery handoff validation | P1 | 완료 |",
    "V390-CAND-005",
    route,
    "OpsV390StagingRestoreValidationHandoffJson",
    `\`./server.sh ${command}\``,
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.9 Step 15");
  }
  for (const snippet of [
    "staging restore validation checklist/result artifact",
    "source registry",
    "PublishedView",
    "source health",
    "viewer scope",
    "production restore cutover",
  ]) {
    assertIncludes(files.backupRecovery, snippet, "backup recovery Step 15 guide");
  }
  for (const snippet of [
    `| v3.9.0 (15) | \`./server.sh ${command}\` | Backup/recovery handoff validation.`,
    "staging-restore-validation-checklist-result-handoff",
    "production restore cutover",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.9 Step 15");
  }
  for (const snippet of [
    `v3.9.0 (15) backup/recovery handoff validation | \`UI-112\`, \`SRC-067\`, \`SAFE-207\`, \`OPS-174\` | \`${command}\`, \`${stagingHarnessCommand}\`, \`verify-v330-ops-backup-recovery-source-handoff\``,
    "UI-112 | V390 Step 15 staging restore validation handoff UI",
    "SRC-067 | V390 Step 15 staging restore validation source/view refs",
    "SAFE-207 | V390 Step 15 no-production-restore boundary",
    "OPS-174 | V390 Step 15 backup/recovery validation handoff gate",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.9 Step 15");
  }
  for (const snippet of [
    "V390 Backup Recovery Handoff Validation",
    `\`./server.sh ${command}\``,
    "v390 Step 15 RED backup/recovery handoff validation gate",
    "v390 Step 15 backup/recovery handoff validation final",
    "v390 Step 15 UI 풀테스트",
    "v390 Step 15 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.9 Step 15");
  }
});

check("server entrypoint and inventory verifiers include v3.9 Step 15 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, targetScript, "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, 'check("exact implementation evidence manifest is valid"', "feature coverage verifier data-driven manifest gate");
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, targetScript, "script inventory");
});

finish("== v3.9.0 backup/recovery handoff validation ==", {
  schema,
  step: "v3.9.0 (15)",
  route,
});

function loadFiles() {
  return {
    server: readText("src/ingress/webrtc_http_server.cpp"),
    opsSourcesScript: readText("src/ingress/product_ui_ops_sources_script.cpp"),
    opsClientUiSmoke: readText("scripts/internal/verify_ops_client_ui_smoke.mjs"),
    backupRecovery: readText("docs/ops-backup-recovery.md"),
    backlog: readText("docs/development-backlog.md"),
    streamVerification: readText("docs/stream-verification.md"),
    featureInventory: readText("docs/project-feature-test-inventory.md"),
    featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
    projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
    scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
    releaseRecords: readText("docs/release-test-records.md"),
    serverSh: readText("server.sh"),
  };
}

function extractRouteBlock(text, routeNeedle) {
  const start = text.indexOf(`request.path == "${routeNeedle}"`);
  const startWithMethod = text.indexOf(`request.method == "GET" && request.path == "${routeNeedle}"`);
  const blockStart = startWithMethod >= 0 ? startWithMethod : start;
  assert(blockStart >= 0, `missing route: ${routeNeedle}`);
  const nextMethod = text.indexOf("\n                            if (request.method", blockStart + 1);
  const nextPath = text.indexOf("\n                            if (request.path", blockStart + 1);
  const ends = [nextMethod, nextPath].filter((index) => index > blockStart);
  const end = ends.length > 0 ? Math.min(...ends) : blockStart + 2400;
  return text.slice(blockStart, end);
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}

function assertFlagFalse(text, flag) {
  const index = text.indexOf(flag);
  assert(index >= 0, `missing boundary flag: ${flag}`);
  assert(text.slice(index, index + 180).includes("false"), `boundary flag must be false: ${flag}`);
}

function finish(title, summary) {
  const results = runChecks();
  console.log("");
  console.log(title);
  console.log(`- schema: ${summary.schema}`);
  console.log(`- step: ${summary.step}`);
  console.log(`- route: ${summary.route}`);
  console.log("- selectedMode: staging-restore-validation-checklist-result-handoff");
  console.log("- productionRestorePerformed: false");
  console.log("- automaticRecoveryPerformed: false");
  console.log("- resultArtifactPersistedByRoute: false");
  console.log("- uiFulltest: not-run-by-this-command");
  console.log("- longrun30: not-run-by-this-command");
  console.log("- longrun120: not-run-by-this-command");
  console.log(`- pass: ${results.pass}`);
  console.log(`- fail: ${results.fail}`);
  if (results.fail > 0) process.exit(1);
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
