#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.7.0 Step 9 Runbook Instance Ledger 구현, 문서, inventory 연결을 검증한다.

import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.7.0 Runbook Instance Ledger verification

Usage:
  ./server.sh verify-v370-runbook-instance-ledger

Checks:
  - /ops/api/site-operations/runbook-instance-ledger exposes a read-only append-only ledger projection
  - runbookId, siteId, status, operator note, and previous run comparison are represented
  - the route remains Ops-only and never persists runbook instances, operator notes, or approval tickets
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v370-runbook-instance-ledger";
const schema = "media-server.ops.v370-runbook-instance-ledger.v1";
const route = "/ops/api/site-operations/runbook-instance-ledger";
const files = loadFiles();
const checks = [];

check("Ops server builds the v3.7 runbook instance ledger model", () => {
  for (const snippet of [
    "struct OpsV370RunbookInstanceLedgerEntry",
    "struct OpsV370RunbookInstanceLedgerSummary",
    "BuildV370RunbookInstanceLedgerEntries",
    "BuildV370RunbookInstanceLedgerSummary",
    "AppendV370RunbookInstanceLedgerEntryJson",
    "OpsV370RunbookInstanceLedgerJson",
    schema,
    "runbookInstanceLedgerSummary",
    "runbookInstanceLedgerEntries",
    "runbookId",
    "siteId",
    "status",
    "operatorNote",
    "previousRunComparison",
    "appendOnlyLedgerProjection",
  ]) assertIncludes(files.server, snippet, "v370 runbook ledger server model");
});

check("runbook ledger derives from templates, readiness, and previous run comparison", () => {
  const block = extractBlock(files.server, "struct OpsV370RunbookInstanceLedgerEntry", "struct OpsV360ClientNoticePreviewItem");
  for (const snippet of [
    "BuildV370RunbookTemplateContractItems",
    "BuildV370RunbookTemplateContractSummary",
    "BuildV370CrossSiteSafeApplyReadinessItems",
    "BuildV360SimulationRunLedgerEntries",
    "runbookTemplateContractItems",
    "crossSiteReadinessItems",
    "simulationRunLedgerEntries",
    "previousRunComparison",
    "operatorNote",
  ]) assertIncludes(block, snippet, "v370 runbook ledger derivation");
});

check("runbook ledger preserves append-only read-only boundaries", () => {
  const block = extractBlock(files.server, "std::string OpsV370RunbookInstanceLedgerJson", "struct OpsV360ClientNoticePreviewItem");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "appendOnlyLedgerProjection",
    "runbookInstancePersisted",
    "operatorNoteWritePerformed",
    "approvalTicketWritePerformed",
    "resultDiffPersisted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "clientNoticeSent",
    "fieldSmokeExecuted",
    "commandPlanExecuted",
    "automaticApplyPerformed",
    "viewerClientExposureAdded",
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) assertIncludes(block, snippet, "v370 runbook ledger boundary flags");
  for (const flag of [
    "runbookInstancePersisted",
    "operatorNoteWritePerformed",
    "approvalTicketWritePerformed",
    "resultDiffPersisted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "clientNoticeSent",
    "fieldSmokeExecuted",
    "commandPlanExecuted",
    "automaticApplyPerformed",
    "viewerClientExposureAdded",
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) assertFlagFalse(block, flag);
});

check("Ops API exposes the runbook ledger route as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "runbook ledger route");
  assertIncludes(block, "request.method == \"GET\"", "runbook ledger route");
  assertIncludes(block, "require_ops_principal()", "runbook ledger route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "runbook ledger route");
  assertIncludes(block, "OpsV370RunbookInstanceLedgerJson(", "runbook ledger route");
  assertIncludes(block, "Cache-Control", "runbook ledger route");
  assertIncludes(block, "no-store", "runbook ledger route");
});

check("docs, inventory, and dispatch map v3.7 Step 9", () => {
  assertStepDocs("9", "Runbook Instance Ledger", "LAB-104", "SAFE-170", "OPS-137");
  for (const id of ["LAB-104", "SAFE-170", "OPS-137"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v370_runbook_instance_ledger.mjs", "server.sh dispatch");
  for (const id of ["LAB-104", "SAFE-170", "OPS-137"]) assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(files.scriptInventory, "verify_v370_runbook_instance_ledger.mjs", "script inventory");
});

check("SAFE-170 canonical bounded no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370RunbookInstanceLedgerJson(");
  const routeObserved = files.server.includes("/ops/api/site-operations/runbook-instance-ledger");
  const safe170BoundaryObserved = block.includes("BuildV370RunbookInstanceLedgerEntries");
  const writePerformed = /\b(?:Write|Persist|AppendFile|UpdateSource|CreateVaRule|UpdateVaRule|AssignReviewer)[A-Za-z0-9_:]*\s*\(/.test(block);
  const mutationPerformed = writePerformed || /\b(?:Apply|AutomaticApply|SafeApply|SendClientNotice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const executionPerformed = /\b(?:Execute|RunSimulation|Probe|Contact|ProviderCall|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const automaticApplyPerformed = /\b(?:AutomaticApply|SafeApply|ApplyRule|ApplySource)[A-Za-z0-9_:]*\s*\(/.test(block);
  const clientNoticeSent = /\bSendClientNotice[A-Za-z0-9_:]*\s*\(/.test(block);
  const fieldSmokeExecuted = /\b(?:ExecuteFieldSmoke|ProbeEndpoint|ContactDevice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const providerCallPerformed = /\b(?:ProviderCall|ProviderClient|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const rawMaterialExposed = /\\"(?:rawLocator|rawJson|rawProviderResponse|rawEndpoint|rawMaterial)\\":true/.test(block);
  const sourceUrlExposed = block.includes("\\\"sourceUrlIncluded\\\":true") || block.includes("\\\"sourceUrlExposed\\\":true");
  const credentialMaterialExposed = block.includes("\\\"credentialMaterialIncluded\\\":true") || block.includes("\\\"credentialMaterialExposed\\\":true");
  const debugMaterialExposed = block.includes("\\\"debugMaterialIncluded\\\":true") || block.includes("\\\"debugMaterialExposed\\\":true");
  const viewerClientExposureAdded = block.includes("\\\"viewerClientExposureAdded\\\":true");
  const mediaPathChanged = block.includes("\\\"rtspOrWebrtcMediaPathChanged\\\":true");
  assert(routeObserved && safe170BoundaryObserved && block.includes("media-server.ops.v370-runbook-instance-ledger.v1") && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-170 BuildV370RunbookInstanceLedgerEntries must remain bounded no-execution no-write redacted and client/provider isolated");
});

finish("== v3.7.0 runbook instance ledger summary ==", { schema, step: "v3.7.0 (9)", route });

function assertStepDocs(step, title, ...ids) {
  for (const snippet of [
    `| ${step} | v3.7.0 (${step}) ${title} | P1 | 완료 |`,
    `## v3.7.0 Step ${step} 개발 기록`,
    route,
    `\`./server.sh ${command}\``,
  ]) assertIncludes(files.backlog, snippet, `backlog v3.7 Step ${step}`);
  assertIncludes(files.streamVerification, `| v3.7.0 (${step}) | \`./server.sh ${command}\` | ${title}.`, `stream verification v3.7 Step ${step}`);
  assertIncludes(files.featureInventory, `v3.7.0 (${step}) ${title}`, `feature inventory v3.7 Step ${step}`);
  for (const id of ids) assertIncludes(files.featureInventory, `\`${id}\``, `feature inventory ${id}`);
  assertIncludes(files.releaseRecords, "V370 Runbook Instance Ledger", "release records v3.7 Step 9");
  assertIncludes(files.releaseRecords, `\`./server.sh ${command}\``, "release records v3.7 Step 9");
}

function loadFiles() {
  return {
    server: readWebRtcHttpServerBundle(readText),
    backlog: readText("docs/development-backlog.md"),
    streamVerification: readText("docs/stream-verification.md"),
    featureInventory: readText("docs/project-feature-test-inventory.md"),
    featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
    implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
    projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
    scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
    releaseRecords: readText("docs/release-test-records.md"),
    serverSh: readText("server.sh"),
  };
}

function extractRouteBlock(text, routeNeedle) {
  const start = text.indexOf(`request.path == "${routeNeedle}"`);
  assert(start >= 0, `missing route: ${routeNeedle}`);
  const next = text.indexOf("\n                        if (request.path == ", start + 1);
  return text.slice(start, next >= 0 ? next : start + 2200);
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
  assert(text.slice(index, index + 128).includes("false"), `boundary flag must be false: ${flag}`);
}
function finish(title, summary) {
  const results = runChecks();
  console.log("");
  console.log(title);
  for (const [key, value] of Object.entries(summary)) console.log(`- ${key}: ${value}`);
  console.log("- writes: no runbook instance/operator note/approval/source/view/rule/EventRecord/Ops audit/client/media mutation performed");
  console.log("- uiFulltest: not-run-by-this-command");
  console.log("- longrun30Or120: not-run-by-this-command");
  console.log(`- pass: ${results.pass}`);
  console.log(`- fail: ${results.fail}`);
  if (results.fail > 0) process.exit(1);
}
function runChecks() {
  let pass = 0, fail = 0;
  for (const item of checks) {
    try { item.fn(); pass += 1; console.log(`[pass] ${item.name}`); }
    catch (error) { fail += 1; console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  return { pass, fail };
}
function check(name, fn) { checks.push({ name, fn }); }
function readText(relativePath) { return fs.readFileSync(path.join(rootDir, relativePath), "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function assertIncludes(text, snippet, label) { assert(text.includes(snippet), `${label} missing snippet: ${snippet}`); }
