#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.7.0 Step 8 Runbook Template Contract 구현, 문서, inventory 연결을 검증한다.

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
  printUsageAndExit(`v3.7.0 Runbook Template Contract verification

Usage:
  ./server.sh verify-v370-runbook-template-contract

Checks:
  - /ops/api/site-operations/runbook-template-contract defines repeatable runbook templates
  - source recheck, maintenance, rule draft, and client notice candidate templates are represented
  - the route remains Ops-only, read-only, and never persists runbook instances or approval tickets
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v370-runbook-template-contract";
const schema = "media-server.ops.v370-runbook-template-contract.v1";
const route = "/ops/api/site-operations/runbook-template-contract";
const files = loadFiles();
const checks = [];

check("Ops server builds the v3.7 runbook template contract model", () => {
  for (const snippet of [
    "struct OpsV370RunbookTemplateContractItem",
    "struct OpsV370RunbookTemplateContractSummary",
    "BuildV370RunbookTemplateContractItems",
    "BuildV370RunbookTemplateContractSummary",
    "AppendV370RunbookTemplateContractItemJson",
    "OpsV370RunbookTemplateContractJson",
    schema,
    "runbookTemplateContractSummary",
    "runbookTemplateContractItems",
    "runbookTemplateId",
    "templateType",
    "source-recheck",
    "maintenance",
    "rule-draft",
    "client-notice",
  ]) assertIncludes(files.server, snippet, "v370 runbook template server model");
});

check("runbook templates derive from command plan, site input, and readiness models", () => {
  const block = extractBlock(files.server, "struct OpsV370RunbookTemplateContractItem", "struct OpsV360SimulationRunLedgerEntry");
  for (const snippet of [
    "BuildV350LiveOperationsGraphContext",
    "BuildV350CommandPlanCandidates",
    "BuildV360CommandPlanDryRunResults",
    "BuildV360SourceRuleImpactDiffs",
    "BuildV360SafeApplyReadinessItems",
    "BuildV370SiteAwareSourceRegistryProjectionItems",
    "BuildV370SiteSimulationInputPackItems",
    "BuildV370CrossSiteSafeApplyReadinessItems",
    "requiredInputs",
    "approvalStateCatalog",
    "outputRefs",
    "operatorApprovalRequired",
    "fieldEvidenceRequired",
  ]) assertIncludes(block, snippet, "v370 runbook template derivation");
});

check("runbook template contract preserves read-only workflow boundaries", () => {
  const block = extractBlock(files.server, "std::string OpsV370RunbookTemplateContractJson", "struct OpsV360SimulationRunLedgerEntry");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "runbookTemplateContractOnly",
    "runbookInstancePersisted",
    "approvalTicketWritePerformed",
    "operatorNoteWritePerformed",
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
  ]) assertIncludes(block, snippet, "v370 runbook template boundary flags");
  for (const flag of [
    "runbookInstancePersisted",
    "approvalTicketWritePerformed",
    "operatorNoteWritePerformed",
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

check("Ops API exposes the runbook template route as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "runbook template route");
  assertIncludes(block, "request.method == \"GET\"", "runbook template route");
  assertIncludes(block, "require_ops_principal()", "runbook template route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "runbook template route");
  assertIncludes(block, "OpsV370RunbookTemplateContractJson(", "runbook template route");
  assertIncludes(block, "Cache-Control", "runbook template route");
  assertIncludes(block, "no-store", "runbook template route");
});

check("docs, inventory, and dispatch map v3.7 Step 8", () => {
  assertStepDocs("8", "Runbook Template Contract", "LAB-103", "SAFE-169", "OPS-136");
  for (const id of ["LAB-103", "SAFE-169", "OPS-136"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v370_runbook_template_contract.mjs", "server.sh dispatch");
  for (const id of ["LAB-103", "SAFE-169", "OPS-136"]) assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(files.scriptInventory, "verify_v370_runbook_template_contract.mjs", "script inventory");
});

check("SAFE-169 canonical bounded no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370RunbookTemplateContractJson(");
  const routeObserved = files.server.includes("/ops/api/site-operations/runbook-template-contract");
  const safe169BoundaryObserved = block.includes("BuildV370RunbookTemplateContractItems");
  const writePerformed = /\b(?:Write|Persist|AppendFile|UpdateSource|CreateVaRule|UpdateVaRule|AssignReviewer)[A-Za-z0-9_:]*\s*\(/.test(block);
  const mutationPerformed = writePerformed || /\b(?:Apply|AutomaticApply|SafeApply|SendClientNotice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const executionPerformed = /\b(?:Execute|RunSimulation|Probe|Contact|ProviderCall|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const automaticApplyPerformed = /\b(?:AutomaticApply|SafeApply|ApplyRule|ApplySource)[A-Za-z0-9_:]*\s*\(/.test(block);
  const clientNoticeSent = /\bSendClientNotice[A-Za-z0-9_:]*\s*\(/.test(block);
  const sendPerformed = clientNoticeSent;
  const fieldSmokeExecuted = /\b(?:ExecuteFieldSmoke|ProbeEndpoint|ContactDevice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const providerCallPerformed = /\b(?:ProviderCall|ProviderClient|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const rawMaterialExposed = /\\"(?:rawLocator|rawJson|rawProviderResponse|rawEndpoint|rawMaterial)\\":true/.test(block);
  const sourceUrlExposed = block.includes("\\\"sourceUrlIncluded\\\":true") || block.includes("\\\"sourceUrlExposed\\\":true");
  const credentialMaterialExposed = block.includes("\\\"credentialMaterialIncluded\\\":true") || block.includes("\\\"credentialMaterialExposed\\\":true");
  const debugMaterialExposed = block.includes("\\\"debugMaterialIncluded\\\":true") || block.includes("\\\"debugMaterialExposed\\\":true");
  const viewerClientExposureAdded = block.includes("\\\"viewerClientExposureAdded\\\":true");
  const mediaPathChanged = block.includes("\\\"rtspOrWebrtcMediaPathChanged\\\":true");
  assert(routeObserved && safe169BoundaryObserved && block.includes("media-server.ops.v370-runbook-template-contract.v1") && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && sendPerformed === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-169 BuildV370RunbookTemplateContractItems must remain bounded no-execution no-write redacted and client/provider isolated");
});

finish("== v3.7.0 runbook template contract summary ==", { schema, step: "v3.7.0 (8)", route });

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
  assertIncludes(files.releaseRecords, "V370 Runbook Template Contract", "release records v3.7 Step 8");
  assertIncludes(files.releaseRecords, `\`./server.sh ${command}\``, "release records v3.7 Step 8");
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
  console.log("- writes: no runbook instance/approval/source/view/rule/EventRecord/Ops audit/client/media mutation performed");
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
