#!/usr/bin/env node
import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";
// 파일 용도: v3.4.0 Step 3 Recovery Candidate Package read model 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.4.0 Recovery Candidate Package verification

Usage:
  ./server.sh verify-v340-recovery-candidate-package

Checks:
  - /ops/api/source-registry/recovery-candidate-package exposes an Ops-only redacted candidate package read model
  - the model combines SourceRegistry snapshot, PublishedView, source health, EventRecord, and Ops audit context
  - package output does not expose source locator, credential, raw audit body, media path, or client/viewer material
  - backlog, stream verification, release records, feature inventory, coverage verifier, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v340-recovery-candidate-package";
const schema = "media-server.ops.v340-recovery-candidate-package.v1";
const route = "/ops/api/source-registry/recovery-candidate-package";
const files = {
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

check("Ops server builds the v3.4 redacted recovery candidate package read model", () => {
  const start = files.server.indexOf("std::string OpsV340RecoveryCandidatePackageJson(");
  const end = files.server.indexOf("struct OpsV340ApprovalGatedRecoveryChecklistItem", start);
  assert(start >= 0 && end > start, "EVT-073 recovery candidate package block missing");
  const evt073RecoveryPackageBlock = files.server.slice(start, end);
  assert(!evt073RecoveryPackageBlock.includes("\\\"rawAuditBodyIncluded\\\":true") && evt073RecoveryPackageBlock.includes("\\\"rawAuditBodyIncluded\\\":false"), "EVT-073 rawAuditBodyIncluded redacted canonical package");
  for (const snippet of [
    "struct OpsV340RecoveryCandidateContext",
    "struct OpsV340RecoveryCandidatePackageItem",
    "BuildV340RecoveryCandidateContext",
    "BuildV340RecoveryCandidatePackages",
    "AppendV340RecoveryCandidatePackageItemJson",
    "AppendV340RecoveryCandidateEventAuditContextJson",
    "OpsV340RecoveryCandidatePackageJson",
    schema,
    "recoveryCandidatePackageSummary",
    "sourceRegistrySnapshotSummary",
    "publishedViewSummary",
    "sourceHealthSnapshotSummary",
    "eventRecordAuditContext",
    "recoveryCandidates",
    "redactionPolicy",
  ]) {
    assertIncludes(files.server, snippet, "v340 recovery candidate package server model");
  }
});

check("recovery candidate package reads source, view, source health, EventRecord, and audit context", () => {
  const block = extractBlock(files.server, "struct OpsV340RecoveryCandidateContext", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "SourceViewRegistry::Instance().Snapshot",
    "source_health_snapshot.items",
    "analysis::QueryEventRecords",
    "QueryOpsAuditEntries",
    "ParseStringField(event_json, \"eventId\")",
    "ParseStringField(event_json, \"streamId\")",
    "ParseStringField(event_json, \"channelId\")",
    "ParseStringField(redacted_entry, \"action\")",
    "RedactAuditJsonFragment",
    "sourceId",
    "publishedViewIds",
    "sourceHealth",
    "eventRecordCount",
    "auditEntryCount",
    "recoveryReadiness",
  ]) {
    assertIncludes(block, snippet, "v340 recovery candidate package read model");
  }
});

check("recovery candidate package preserves redaction, read-only, schema, media, and client boundaries", () => {
  const block = extractBlock(files.server, "std::string OpsV340RecoveryCandidatePackageJson", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "redacted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "productionRestorePerformed",
    "automaticRecoveryPerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "rawAuditBodyIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    assertIncludes(block, snippet, "v340 recovery candidate package boundary flags");
  }
  for (const flag of [
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "productionRestorePerformed",
    "automaticRecoveryPerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "rawAuditBodyIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    const index = block.indexOf(flag);
    const nearby = block.slice(index, index + 128);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  for (const forbidden of [
    "CreateSource(",
    "UpsertSource(",
    "DisableSource(",
    "CreateView(",
    "UpsertView(",
    "DisableView(",
    "AppendOpsAuditRecord(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "\"httpUrl\"",
    "\"webrtcSourceId\"",
    "credentialRef",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `candidate package JSON must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the recovery candidate package route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/backup-recovery-handoff\")");
  assertIncludes(block, route, "recovery candidate package route");
  assertIncludes(block, "request.method == \"GET\"", "recovery candidate package route");
  assertIncludes(block, "require_ops_principal()", "recovery candidate package route");
  assertIncludes(block, "OpsV340RecoveryCandidatePackageJson(", "recovery candidate package route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "recovery candidate package route");
  assertIncludes(block, "Cache-Control", "recovery candidate package route");
  assertIncludes(block, "no-store", "recovery candidate package route");
  assert(!block.includes("require_source_write_principal"), "recovery candidate package route must not require source writes");
});

check("roadmap records v3.4 Step 3 without overclaiming staging restore validation", () => {
  for (const snippet of [
    "| 3 | v3.4.0 (3) Recovery Candidate Package Read Model | P0 | 완료 |",
    "source registry snapshot, PublishedView, source health, EventRecord/audit context를 redacted 복구 후보 package로 조합",
    "## v3.4.0 Step 3 개발 기록",
    route,
    "OpsV340RecoveryCandidatePackageJson",
    "`./server.sh verify-v340-recovery-candidate-package`",
    "Staging Restore Validation Harness 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.4 Step 3");
  }
});

check("stream verification exposes v3.4 Step 3 command and boundary", () => {
  for (const snippet of [
    `| v3.4.0 (3) | \`./server.sh ${command}\` | Recovery Candidate Package Read Model.`,
    route,
    "SourceRegistry snapshot, PublishedView, source health, EventRecord/audit context",
    "redacted recovery candidate package",
    "source locator/credential/raw audit body/media path 비노출",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.4 Step 3");
  }
});

check("feature inventory and release records map v3.4 Step 3", () => {
  for (const snippet of [
    `v3.4.0 (3) Recovery Candidate Package Read Model | \`SRC-041\`, \`EVT-073\`, \`SAFE-126\`, \`OPS-093\` | \`${command}\``,
    "SRC-041 | V340 Step 3 recovery candidate package read model",
    "EVT-073 | V340 Step 3 EventRecord/audit context projection",
    "SAFE-126 | V340 Step 3 recovery candidate redaction boundary",
    "OPS-093 | V340 Step 3 Recovery Candidate Package 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.4 Step 3");
  }
  for (const snippet of [
    "V340 Recovery Candidate Package Read Model",
    `\`./server.sh ${command}\``,
    "v340 Step 3 RED recovery candidate package gate",
    "v340 Step 3 recovery candidate package final",
    "v340 Step 3 UI 풀테스트",
    "v340 Step 3 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.4 Step 3");
  }
});

check("server entrypoint and inventory verifiers include v3.4 Step 3 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v340_recovery_candidate_package.mjs", "server.sh script dispatch");
  assertIncludes(files.featureInventory, command, "feature inventory command");
  for (const id of ["SRC-041", "EVT-073", "SAFE-126", "OPS-093"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v340_recovery_candidate_package.mjs", "script inventory");
});

check("SAFE-126 canonical recovery candidate redaction boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV340RecoveryCandidatePackageJson(");
  const routeObserved = files.server.includes("/ops/api/source-registry/recovery-candidate-package");
  const safe126BoundaryObserved = block.includes("BuildV340RecoveryCandidatePackages") && block.includes("media-server.ops.v340-recovery-candidate-package.v1");
  const rawMaterialExposed = /\\\"(?:rawAuditBody|rawLocator|sourceUrl|credentialMaterial|clientViewerMaterial)Included\\\":true/.test(block);
  const credentialMaterialExposed = block.includes("\\\"credentialMaterialIncluded\\\":true");
  const viewerClientExposureAdded = block.includes("\\\"clientViewerMaterialIncluded\\\":true");
  const schemaMutationPerformed = /\b(?:DispatchEventRecords|Write|Persist|UpdateSource)[A-Za-z0-9_:]*\s*\(/.test(block);
  assert(routeObserved && safe126BoundaryObserved && rawMaterialExposed === false && credentialMaterialExposed === false && viewerClientExposureAdded === false && schemaMutationPerformed === false,
    "SAFE-126 BuildV340RecoveryCandidatePackages redacted source locator credential raw audit media client material must remain absent");
});

const results = runChecks();
console.log("");
console.log("== v3.4.0 recovery candidate package summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.4.0 (3)");
console.log(`- route: ${route}`);
console.log("- joins: SourceRegistry, PublishedView, source health, EventRecord, Ops audit");
console.log("- redaction: source locator, credential, raw audit body, media path excluded");
console.log("- stagingRestoreValidation: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
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

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
