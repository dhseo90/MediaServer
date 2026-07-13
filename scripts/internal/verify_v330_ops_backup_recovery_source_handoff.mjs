#!/usr/bin/env node
// 파일 용도: v3.3.0 Step 10 Ops Backup and Recovery Source Handoff 구현, UI, 문서, inventory 연결을 검증한다.
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
  printUsageAndExit(`v3.3.0 Ops Backup and Recovery Source Handoff verification

Usage:
  ./server.sh verify-v330-ops-backup-recovery-source-handoff

Checks:
  - /ops/api/source-registry/backup-recovery-handoff exposes an Ops-only read-only source handoff model
  - the model links source registry snapshot, PublishedView registry, source health snapshot, and recovery validation plan inputs
  - /ops/sources renders the backup/recovery source handoff without source URL/raw JSON/debug/client exposure
  - the context does not persist backup artifacts, mutate SourceRegistry/PublishedView, perform recovery, or change EventRecord/Event POST/media schemas
  - backlog, backup/recovery guide, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v330-ops-backup-recovery-source-handoff";
const schema = "media-server.ops.v330-backup-recovery-source-handoff.v1";
const route = "/ops/api/source-registry/backup-recovery-handoff";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  opsSourcesScript: readText("src/ingress/product_ui_ops_sources_script.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  registry: readText("src/ingress/source_view_registry.cpp"),
  backlog: readText("docs/development-backlog.md"),
  backupRecovery: readText("docs/ops-backup-recovery.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  implementationEvidence: readJson("test/fixtures/project_feature_implementation_evidence.json"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  serverSh: readText("server.sh"),
};

const checks = [];

check("Ops server builds the v3.3 backup/recovery source handoff read model", () => {
  assert(route === "/ops/api/source-registry/backup-recovery-handoff", "OPS-089 canonical route drift");
  for (const snippet of [
    "struct OpsV330BackupRecoverySourceHandoffInput",
    "struct OpsV330BackupRecoverySourceHandoffSummary",
    "BuildV330BackupRecoverySourceHandoffInputs",
    "BuildV330BackupRecoveryValidationPlan",
    "AppendV330BackupRecoverySourceHandoffInputJson",
    "AppendV330BackupRecoveryValidationPlanJson",
    "OpsV330BackupRecoverySourceHandoffJson",
    schema,
    "backupRecoverySourceHandoffSummary",
    "sourceHandoffInputs",
    "sourceRegistrySnapshotRoute",
    "publishedViewRegistryRoute",
    "sourceHealthSnapshotSummary",
    "recoveryValidationPlan",
    "registryRestoreValidation",
    "publishedViewRestoreValidation",
    "sourceHealthSnapshotValidation",
    "viewerScopeValidation",
  ]) {
    assertIncludes(files.server, snippet, "v330 backup recovery handoff server model");
  }
});

check("backup/recovery source handoff preserves backup, write, schema, media, and client boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV330BackupRecoverySourceHandoffJson",
    "std::string OpsAuditSearchIndexJson"
  );
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "sourceHealthSnapshotPersisted",
    "recoveryValidationPlanPersisted",
    "realBackupPerformed",
    "productionRestorePerformed",
    "automaticRecoveryPerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    assertIncludes(block, snippet, "v330 backup recovery handoff boundary flags");
  }
  for (const flag of [
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "sourceHealthSnapshotPersisted",
    "recoveryValidationPlanPersisted",
    "realBackupPerformed",
    "productionRestorePerformed",
    "automaticRecoveryPerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
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
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "\"httpUrl\"",
    "\"webrtcSourceId\"",
    "credentialRef",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `backup recovery handoff JSON must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the backup/recovery source handoff route as guarded read-only no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/onboarding-quality\")");
  assertIncludes(block, route, "backup recovery source handoff route");
  assertIncludes(block, "request.method == \"GET\"", "backup recovery source handoff route");
  assertIncludes(block, "require_ops_principal()", "backup recovery source handoff route");
  assertIncludes(block, "OpsV330BackupRecoverySourceHandoffJson(", "backup recovery source handoff route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "backup recovery source handoff route");
  assertIncludes(block, "Cache-Control", "backup recovery source handoff route");
  assertIncludes(block, "no-store", "backup recovery source handoff route");
  assert(!block.includes("require_source_write_principal"), "backup recovery source handoff route must not require or perform source writes");
});

check("/ops/sources renders Step 10 backup/recovery source handoff inputs and validation plan", () => {
  for (const snippet of [
    "source-backup-recovery-handoff",
    "source-backup-handoff-status",
    "source-backup-handoff-input-list",
    "source-recovery-validation-plan-list",
    "renderBackupRecoverySourceHandoff",
    `requestJson('${route}')`,
    "backupRecoverySourceHandoffSummary",
    "sourceHandoffInputs",
    "sourceHealthSnapshotSummary",
    "recoveryValidationPlan",
    "sourceRegistrySnapshotRoute",
    "publishedViewRegistryRoute",
    "sourceHealthSnapshotPersisted",
    "recoveryValidationPlanPersisted",
    "data-source-backup-handoff-input",
    "data-source-recovery-validation-plan",
  ]) {
    assertIncludes(files.opsSourcesScript + files.server, snippet, "ops sources backup recovery source handoff UI");
    assertIncludes(extractNamedFunctionBlock(files.opsSourcesScript, "renderBackupRecoverySourceHandoff"), "sourceHandoffInputs", "UI-074 block-scoped canonical product state");
    assert(!["rawJson","rawLocator","rawEvidenceIncluded: true","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderBackupRecoverySourceHandoff").includes(marker)), "UI-074 raw-material-redaction explicit absence oracle");
    assert(!["sourceUrl","sourceURL","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderBackupRecoverySourceHandoff").includes(marker)), "UI-074 source-url-redaction explicit absence oracle");
    assert(!["passwordHash","tokenHash","Authorization:","credentialValue"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderBackupRecoverySourceHandoff").includes(marker)), "UI-074 credential-redaction explicit absence oracle");
    assert(!["debugCounters","Developer URL","debugMaterialExposed: true"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderBackupRecoverySourceHandoff").includes(marker)), "UI-074 debug-redaction explicit absence oracle");
    assert(!["/client/api/","viewerClientExposureAdded: true","clientExposureAdded: true"].some(marker => extractNamedFunctionBlock(files.opsSourcesScript, "renderBackupRecoverySourceHandoff").includes(marker)), "UI-074 client-viewer-boundary explicit absence oracle");
    assertIncludes(files.opsSourcesScript, "/ops/sources", "UI-074 canonical route obligation");
    assertIncludes(files.server, "media-server.ops.v330-backup-recovery-source-handoff.v1", "UI-074 canonical schema obligation");
  }
  for (const snippet of [
    ".source-backup-handoff-grid",
    ".source-backup-handoff-card",
    ".source-backup-handoff-input-list",
    ".source-recovery-validation-plan-list",
    ".source-backup-handoff-boundary",
  ]) {
    assertIncludes(files.css, snippet, "backup recovery source handoff CSS");
  }
  for (const forbidden of [schema, "sourceHandoffInputs", "recoveryValidationPlan", route]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose Step 10 backup handoff material: ${forbidden}`);
  }
  const clientBlock = extractBlock(files.registry, "std::string ClientPublishedViewJson", "SourceViewRegistry::SourceIdentityPublishedView ToSourceIdentityPublishedView");
  for (const forbidden of [
    "sourceHandoffInputs",
    "recoveryValidationPlan",
    "sourceRegistrySnapshotRoute",
    "rawLocator",
    "rtspUrl",
    "whepUrl",
    "httpUrl",
    "webrtcSourceId",
  ]) {
    assert(!clientBlock.includes(forbidden), `client view JSON must not expose ${forbidden}`);
  }
});

check("roadmap and backup guide record v3.3 Step 10 without overclaiming real restore or release gates", () => {
  for (const snippet of [
    "| 10 | v3.3.0 (10) Ops Backup and Recovery Source Handoff | P2 | 완료 |",
    "source registry, PublishedView, source health snapshot, recovery validation plan 연결",
    "## v3.3.0 Step 10 개발 기록",
    route,
    "OpsV330BackupRecoverySourceHandoffJson",
    "`./server.sh verify-v330-ops-backup-recovery-source-handoff`",
    "이번 Step 10은 Ops Backup and Recovery Source Handoff read model/API/UI/verifier 연결입니다",
    "real backup/restore 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.3 Step 10");
  }
  for (const snippet of [
    "## Ops Backup and Recovery Source Handoff",
    route,
    "source registry snapshot",
    "PublishedView registry",
    "source health snapshot",
    "recovery validation plan",
    "registry restore validation",
    "PublishedView restore validation",
    "source health snapshot validation",
    "viewer scope validation",
    "실제 운영 백업 생성, production restore cutover, 자동 recovery 완료 evidence가 아닙니다.",
  ]) {
    assertIncludes(files.backupRecovery, snippet, "backup recovery Step 10 handoff guide");
  }
});

check("stream verification exposes v3.3 Step 10 command and boundary", () => {
  for (const snippet of [
    `| v3.3.0 (10) | \`./server.sh ${command}\` | Ops Backup and Recovery Source Handoff.`,
    route,
    "source registry snapshot",
    "PublishedView registry",
    "source health snapshot",
    "recovery validation plan",
    "source registry write, PublishedView write, real backup/restore, automatic recovery",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.3 Step 10");
  }
});

check("feature inventory and release records map v3.3 Step 10", () => {
  for (const snippet of [
    `v3.3.0 (10) Ops Backup and Recovery Source Handoff | \`UI-074\`, \`SRC-040\`, \`SAFE-122\`, \`OPS-089\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-074 | V330 Step 10 Ops Backup and Recovery Source Handoff UI",
    "SRC-040 | V330 Step 10 backup recovery source handoff view model",
    "SAFE-122 | V330 Step 10 backup recovery source handoff boundary",
    "OPS-089 | V330 Step 10 Ops Backup and Recovery Source Handoff 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.3 Step 10");
  }
  for (const snippet of [
    "V330 Ops Backup and Recovery Source Handoff",
    `\`./server.sh ${command}\``,
    "v330 Step 10 RED ops backup recovery source handoff gate",
    "v330 Step 10 ops backup recovery source handoff final",
    "v330 Step 10 UI 풀테스트",
    "v330 Step 10 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.3 Step 10");
  }
});

check("server entrypoint and inventory verifiers include v3.3 Step 10 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v330_ops_backup_recovery_source_handoff.mjs", "server.sh script dispatch");
  assertExactVerifierMapping(
    files.implementationEvidence,
    "UI-074",
    command,
    "scripts/internal/verify_v330_ops_backup_recovery_source_handoff.mjs",
  );
  for (const id of ["UI-074", "SRC-040", "SAFE-122", "OPS-089"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v330_ops_backup_recovery_source_handoff.mjs", "script inventory");
});

check("SAFE-122 canonical backup recovery source handoff boundary", () => {
  const handoffBlock = extractCppFunctionBlock(files.server, "std::string OpsV330BackupRecoverySourceHandoffJson(");
  const backupRecoveryHandoffRouteObserved = route === "/ops/api/source-registry/backup-recovery-handoff";
  const safe122BoundaryObserved = backupRecoveryHandoffRouteObserved && handoffBlock.includes("SourceViewRegistry::Instance().Snapshot") && handoffBlock.includes("media-server.ops.v330-backup-recovery-source-handoff.v1") && handoffBlock.includes("BuildV330BackupRecoveryValidationPlan");
  const persistencePerformed = /\b(?:Write|Persist|AppendFile|SavePlan)[A-Za-z0-9_:]*\s*\(/.test(handoffBlock);
  const sourceRegistryWritePerformed = /\b(?:CreateSource|UpdateSource|DeleteSource)[A-Za-z0-9_:]*\s*\(/.test(handoffBlock);
  const rawMaterialExposed = handoffBlock.includes("\\\"rawJsonExposed\\\":true");
  const rawLocatorExposed = handoffBlock.includes("\\\"rawLocatorExposed\\\":true");
  const sourceUrlExposed = handoffBlock.includes("\\\"sourceUrlExposed\\\":true");
  const debugMaterialExposed = handoffBlock.includes("\\\"debugMaterialExposed\\\":true");
  const credentialMaterialExposed = handoffBlock.includes("\\\"credentialMaterialExposed\\\":true");
  const automaticRecoveryPerformed = /\b(?:Restore|Recover|Execute)[A-Za-z0-9_:]*\s*\(/.test(handoffBlock);
  const schemaMutationPerformed = /DispatchEventRecords|CreateVaRule|UpdateVaRule/.test(handoffBlock);
  const viewerClientExposureAdded = /AppendClient|ClientEventSummary|PublishedViewJson/.test(handoffBlock);
  assert(safe122BoundaryObserved && persistencePerformed === false && sourceRegistryWritePerformed === false && rawMaterialExposed === false && rawLocatorExposed === false && sourceUrlExposed === false && debugMaterialExposed === false && credentialMaterialExposed === false && automaticRecoveryPerformed === false && schemaMutationPerformed === false && viewerClientExposureAdded === false,
    "SAFE-122 backup-recovery-source-handoff must remain a non-persistent validation plan without registry/raw credential/recovery/schema/client mutation");
});

const results = runChecks();
console.log("");
console.log("== v3.3.0 ops backup and recovery source handoff ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.3.0 (10)");
console.log(`- route: ${route}`);
console.log("- model: source registry snapshot + PublishedView registry + source health snapshot + recovery validation plan");
console.log("- writes: no backup artifact, SourceRegistry, PublishedView, EventRecord, or recovery mutation performed");
console.log("- unchanged: EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer output");
console.log("- realBackupRestore: not-run-by-this-command");
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

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function assertExactVerifierMapping(manifest, featureId, expectedCommand, expectedFile) {
  const item = manifest.items?.find(entry => entry.id === featureId);
  assert(item?.verifierEvidence?.command === expectedCommand,
    `${featureId} exact verifier command mismatch: ${item?.verifierEvidence?.command}`);
  assert(item?.verifierEvidence?.file === expectedFile,
    `${featureId} exact verifier file mismatch: ${item?.verifierEvidence?.file}`);
  assert(item?.verifierEvidence?.anchor === featureId,
    `${featureId} exact verifier assertion anchor mismatch: ${item?.verifierEvidence?.anchor}`);
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
  assert(end > start, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
