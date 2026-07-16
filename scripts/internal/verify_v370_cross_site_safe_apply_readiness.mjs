#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.7.0 Step 7 Cross-Site Safe Apply Readiness 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { exactBooleanFlagValue, extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.7.0 Cross-Site Safe Apply Readiness verification

Usage:
  ./server.sh verify-v370-cross-site-safe-apply-readiness

Checks:
  - /ops/api/site-operations/cross-site-safe-apply-readiness maps safe-apply readiness by site/source group
  - readiness items expose affected clients, blockers, approval-needed, and field-needed state
  - the route remains Ops-only, read-only, and never performs a safe apply
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v370-cross-site-safe-apply-readiness";
const schema = "media-server.ops.v370-cross-site-safe-apply-readiness.v1";
const route = "/ops/api/site-operations/cross-site-safe-apply-readiness";
const files = loadFiles();
const checks = [];

check("Ops server builds the v3.7 cross-site safe apply readiness model", () => {
  for (const snippet of [
    "struct OpsV370CrossSiteSafeApplyReadinessItem",
    "struct OpsV370CrossSiteSafeApplyReadinessSummary",
    "BuildV370CrossSiteSafeApplyReadinessItems",
    "BuildV370CrossSiteSafeApplyReadinessSummary",
    "AppendV370CrossSiteSafeApplyReadinessItemJson",
    "OpsV370CrossSiteSafeApplyReadinessJson",
    schema,
    "crossSiteSafeApplyReadinessSummary",
    "crossSiteSafeApplyReadinessItems",
    "affectedClientRefs",
    "crossSiteImpact",
    "approval-needed",
    "field-needed",
  ]) assertIncludes(files.server, snippet, "v370 cross-site readiness server model");
});

check("cross-site readiness derives from v3.6 safe apply readiness and v3.7 site inputs", () => {
  const block = extractBlock(files.server, "struct OpsV370CrossSiteSafeApplyReadinessItem", "struct OpsV360SimulationRunLedgerEntry");
  for (const snippet of [
    "BuildV350LiveOperationsGraphContext",
    "BuildV350CommandPlanCandidates",
    "BuildV350StagedChangePlans",
    "BuildV360CommandPlanDryRunResults",
    "BuildV360SourceRuleImpactDiffs",
    "BuildV360SafeApplyReadinessItems",
    "BuildV360SafeApplyReadinessSummary",
    "BuildV370SiteAwareSourceRegistryProjectionItems",
    "BuildV370SiteSimulationInputPackItems",
    "BuildV370SiteImpactGraphNodes",
    "BuildV370SiteImpactGraphEdges",
    "operatorApprovalRequired",
    "fieldEvidenceRequired",
    "affectedClientRefs",
  ]) assertIncludes(block, snippet, "v370 cross-site readiness derivation");
});

check("cross-site readiness preserves no-apply and no-client-exposure boundaries", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370CrossSiteSafeApplyReadinessJson(");
  const debugMaterialExposed = /debugCounters|debugMaterial.*true/.test(block);
  const clientNoticeSendPerformed = exactBooleanFlagValue(block, "clientNoticeSent");
  assert(clientNoticeSendPerformed === false, "CLIENT-036 client notice send must remain false");
  assert(exactBooleanFlagValue(block, "clientNoticeSent") === false, "CLIENT-036 client notice send must remain false");
  assert(exactBooleanFlagValue(block, "eventPostPayloadChanged") === false, "CLIENT-036 client/API payload mutation must remain false");
  assert(exactBooleanFlagValue(block, "rawLocatorIncluded") === false, "CLIENT-036 raw/source locator material must remain redacted");
  assert(debugMaterialExposed === false, "CLIENT-036 debug material must remain redacted");
  assert(block.includes("affectedClientRefs") && block.includes("PublishedView refs only"), "CLIENT-036 exact affectedClientRefs readback missing");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "crossSiteSafeApplyReadinessOnly",
    "automaticApplyPerformed",
    "safeApplyPerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "clientNoticeSent",
    "fieldSmokeExecuted",
    "sourceChangeApplied",
    "ruleFollowUpApplied",
    "viewerClientExposureAdded",
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) assertIncludes(block, snippet, "v370 cross-site readiness boundary flags");
  for (const flag of [
    "automaticApplyPerformed",
    "safeApplyPerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "clientNoticeSent",
    "fieldSmokeExecuted",
    "sourceChangeApplied",
    "ruleFollowUpApplied",
    "viewerClientExposureAdded",
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) assertFlagFalse(block, flag);
});

check("Ops API exposes the cross-site readiness route as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "cross-site safe apply readiness route");
  assertIncludes(block, "request.method == \"GET\"", "cross-site safe apply readiness route");
  assertIncludes(block, "require_ops_principal()", "cross-site safe apply readiness route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "cross-site safe apply readiness route");
  assertIncludes(block, "OpsV370CrossSiteSafeApplyReadinessJson(", "cross-site safe apply readiness route");
  assertIncludes(block, "Cache-Control", "cross-site safe apply readiness route");
  assertIncludes(block, "no-store", "cross-site safe apply readiness route");
});

check("docs, inventory, and dispatch map v3.7 Step 7", () => {
  assertStepDocs("7", "Cross-Site Safe Apply Readiness", "SRC-059", "CLIENT-036", "LAB-102", "SAFE-168", "OPS-135");
  for (const id of ["SRC-059", "CLIENT-036", "LAB-102", "SAFE-168", "OPS-135"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v370_cross_site_safe_apply_readiness.mjs", "server.sh dispatch");
  for (const id of ["SRC-059", "CLIENT-036", "LAB-102", "SAFE-168", "OPS-135"]) {
    const expectedCommand = ["SRC-059", "SAFE-168", "OPS-135"].includes(id) ?
      "verify-ops-source-registry-api" : command;
    assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === expectedCommand, `${id} manifest verifier command drift`);
  }
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(files.scriptInventory, "verify_v370_cross_site_safe_apply_readiness.mjs", "script inventory");
});

check("SAFE-168 canonical bounded no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370CrossSiteSafeApplyReadinessJson(");
  const routeObserved = files.server.includes("/ops/api/site-operations/cross-site-safe-apply-readiness");
  const safe168BoundaryObserved = block.includes("BuildV370CrossSiteSafeApplyReadinessItems");
  const safe168CommandBoundaryObserved = safe168BoundaryObserved && command === "verify-v370-cross-site-safe-apply-readiness";
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
  assert(routeObserved && safe168CommandBoundaryObserved && block.includes("media-server.ops.v370-cross-site-safe-apply-readiness.v1") && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-168 BuildV370CrossSiteSafeApplyReadinessItems must remain bounded no-execution no-write redacted and client/provider isolated");
});

finish("== v3.7.0 cross-site safe apply readiness summary ==", { schema, step: "v3.7.0 (7)", route });

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
  assertIncludes(files.releaseRecords, "V370 Cross-Site Safe Apply Readiness", "release records v3.7 Step 7");
  assertIncludes(files.releaseRecords, `\`./server.sh ${command}\``, "release records v3.7 Step 7");
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
  console.log("- writes: no source/view/rule/EventRecord/Ops audit/client/media mutation performed");
  console.log("- safeApply: not-run-by-this-command");
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
