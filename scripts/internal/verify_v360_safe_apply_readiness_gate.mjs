#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.6.0 Step 6 Safe Apply Readiness Gate 구현, 문서, inventory 연결을 검증한다.

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
  printUsageAndExit(`v3.6.0 Safe Apply Readiness Gate verification

Usage:
  ./server.sh verify-v360-safe-apply-readiness-gate

Checks:
  - /ops/api/live-operations/simulation/safe-apply-readiness emits safe apply states and blockers
  - ready, blocked, approval-needed, field-needed, and not-run states are represented
  - no automatic apply path is introduced
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v360-safe-apply-readiness-gate";
const schema = "media-server.ops.v360-safe-apply-readiness.v1";
const route = "/ops/api/live-operations/simulation/safe-apply-readiness";
const files = loadFiles();
const checks = [];

check("Ops server builds the v3.6 safe apply readiness gate", () => {
  for (const snippet of [
    "struct OpsV360SafeApplyReadinessItem",
    "struct OpsV360SafeApplyReadinessSummary",
    "BuildV360SafeApplyReadinessItems",
    "BuildV360SafeApplyReadinessSummary",
    "AppendV360SafeApplyReadinessItemJson",
    "OpsV360SafeApplyReadinessGateJson",
    schema,
    "safeApplyReadinessSummary",
    "safeApplyReadinessItems",
    "readinessState",
    "ready",
    "blocked",
    "approval-needed",
    "field-needed",
    "not-run",
    "blockers",
  ]) assertIncludes(files.server, snippet, "v360 safe apply server model");
});

check("safe apply readiness derives from dry-run and impact diff results", () => {
  const block = extractBlock(files.server, "struct OpsV360SafeApplyReadinessItem", "std::string OpsV360SafeApplyReadinessGateJson");
  for (const snippet of [
    "BuildV360CommandPlanDryRunResults",
    "BuildV360SourceRuleImpactDiffs",
    "approval-needed",
    "field-needed",
    "not-run",
    "blocked",
    "ready",
    "blockers",
    "operatorApprovalRequired",
    "fieldEvidenceRequired",
  ]) assertIncludes(block, snippet, "v360 safe apply derivation");
});

check("safe apply readiness preserves no-auto-apply boundaries", () => {
  const block = extractBlock(files.server, "std::string OpsV360SafeApplyReadinessGateJson", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "opsOnly", "readOnly", "safeApplyGateOnly",
    "automaticApplyPerformed", "safeApplyPerformed", "sourceRegistryWritePerformed",
    "publishedViewWritePerformed", "ruleRegistryWritePerformed", "eventRecordWritePerformed",
    "opsAuditWritePerformed", "clientNoticeSent", "fieldSmokeExecuted",
    "commandPlanExecuted", "sourceChangeApplied", "ruleFollowUpApplied",
    "eventRecordSchemaChanged", "eventPostPayloadChanged", "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged", "wsMetadataSchemaChanged", "rtspOrWebrtcMediaPathChanged",
  ]) assertIncludes(block, snippet, "v360 safe apply boundary flags");
  for (const flag of [
    "automaticApplyPerformed", "safeApplyPerformed", "sourceRegistryWritePerformed",
    "publishedViewWritePerformed", "ruleRegistryWritePerformed", "eventRecordWritePerformed",
    "opsAuditWritePerformed", "clientNoticeSent", "fieldSmokeExecuted", "commandPlanExecuted",
    "sourceChangeApplied", "ruleFollowUpApplied", "eventRecordSchemaChanged",
    "eventPostPayloadChanged", "webrtcDataChannelSchemaChanged", "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged", "rtspOrWebrtcMediaPathChanged",
  ]) assertFlagFalse(block, flag);
});

check("Ops API exposes the safe apply readiness route as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "safe apply route");
  assertIncludes(block, "request.method == \"GET\"", "safe apply route");
  assertIncludes(block, "require_ops_principal()", "safe apply route");
  assertIncludes(block, "OpsV360SafeApplyReadinessGateJson(", "safe apply route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "safe apply route");
  assertIncludes(block, "Cache-Control", "safe apply route");
  assertIncludes(block, "no-store", "safe apply route");
});

check("docs, inventory, and dispatch map v3.6 Step 6", () => {
  assertStepDocs("6", "Safe Apply Readiness Gate", "SAFE-153", "OPS-120");
  for (const id of ["SAFE-153", "OPS-120"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v360_safe_apply_readiness_gate.mjs", "server.sh dispatch");
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  for (const id of ["SAFE-153", "OPS-120"]) {
    assert(files.implementationManifest.items.find((item) => item.id === id)?.verifierEvidence?.command === "verify-ops-source-registry-api",
      `${id} implementation manifest verifier command drift`);
  }
  assertIncludes(files.scriptInventory, "verify_v360_safe_apply_readiness_gate.mjs", "script inventory");
});

check("SAFE-153 canonical bounded no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV360SafeApplyReadinessGateJson(");
  const routeObserved = files.server.includes("/ops/api/live-operations/simulation/safe-apply-readiness");
  const safe153BoundaryObserved = block.includes("BuildV360SafeApplyReadinessItems");
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
  assert(routeObserved && safe153BoundaryObserved && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-153 BuildV360SafeApplyReadinessItems must remain bounded no-execution no-write redacted and client/provider isolated");
});

finish("== v3.6.0 safe apply readiness gate summary ==", { schema, step: "v3.6.0 (6)", route });

function assertStepDocs(step, title, ...ids) { for (const snippet of [`| ${step} | v3.6.0 (${step}) ${title} | P0 | 완료 |`, `## v3.6.0 Step ${step} 개발 기록`, route, `\`./server.sh ${command}\``]) assertIncludes(files.backlog, snippet, `backlog v3.6 Step ${step}`); assertIncludes(files.streamVerification, `| v3.6.0 (${step}) | \`./server.sh ${command}\` | ${title}.`, `stream verification v3.6 Step ${step}`); assertIncludes(files.featureInventory, `v3.6.0 (${step}) ${title}`, `feature inventory v3.6 Step ${step}`); for (const id of ids) assertIncludes(files.featureInventory, `\`${id}\``, `feature inventory ${id}`); assertIncludes(files.releaseRecords, `V360 ${title}`, `release records v3.6 Step ${step}`); assertIncludes(files.releaseRecords, `\`./server.sh ${command}\``, `release records v3.6 Step ${step}`); }
function loadFiles() { return { server: readWebRtcHttpServerBundle(readText), backlog: readText("docs/development-backlog.md"), streamVerification: readText("docs/stream-verification.md"), featureInventory: readText("docs/project-feature-test-inventory.md"), featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"), projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"), implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")), scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"), releaseRecords: readText("docs/release-test-records.md"), serverSh: readText("server.sh") }; }
function extractRouteBlock(text, routeNeedle) { const start = text.indexOf(`request.path == "${routeNeedle}"`); assert(start >= 0, `missing route: ${routeNeedle}`); const next = text.indexOf("\n                        if (request.path == ", start + 1); return text.slice(start, next >= 0 ? next : start + 2200); }
function extractBlock(text, startNeedle, endNeedle) { const start = text.indexOf(startNeedle); assert(start >= 0, `missing block start: ${startNeedle}`); const end = text.indexOf(endNeedle, start + startNeedle.length); assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`); return text.slice(start, end); }
function assertFlagFalse(text, flag) { const index = text.indexOf(flag); assert(index >= 0, `missing boundary flag: ${flag}`); assert(text.slice(index, index + 128).includes("false"), `boundary flag must be false: ${flag}`); }
function finish(title, summary) { const results = runChecks(); console.log(""); console.log(title); for (const [key, value] of Object.entries(summary)) console.log(`- ${key}: ${value}`); console.log("- writes: no automatic apply/source/view/rule/EventRecord/Ops audit/client/media mutation performed"); console.log(`- pass: ${results.pass}`); console.log(`- fail: ${results.fail}`); if (results.fail > 0) process.exit(1); }
function runChecks() { let pass = 0, fail = 0; for (const item of checks) { try { item.fn(); pass += 1; console.log(`[pass] ${item.name}`); } catch (error) { fail += 1; console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`); } } return { pass, fail }; }
function check(name, fn) { checks.push({ name, fn }); }
function readText(relativePath) { return fs.readFileSync(path.join(rootDir, relativePath), "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function assertIncludes(text, snippet, label) { assert(text.includes(snippet), `${label} missing snippet: ${snippet}`); }
