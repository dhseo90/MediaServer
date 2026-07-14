#!/usr/bin/env node
// 파일 용도: v3.7.0 Step 14 Field Evidence Attachment 연결, 문서, 경계를 검증한다.

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
  printUsageAndExit(`v3.7.0 Field Evidence Attachment verification

Usage:
  ./server.sh verify-v370-field-evidence-attachment

Checks:
  - /ops/api/site-operations/field-evidence-attachment attaches ONVIF, external WHEP/TURN, and cloud/VLM conditional evidence to site/runbook refs
  - evidence remains conditional/not-run and never performs field smoke, endpoint probes, credential probes, provider calls, source/view writes, or media changes
  - /ops dashboard renders attachment status, condition refs, runbook/approval refs, and boundary text without client/viewer injection
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v370-field-evidence-attachment";
const schema = "media-server.ops.v370-field-evidence-attachment.v1";
const route = "/ops/api/site-operations/field-evidence-attachment";
const projectionRoute = "/ops/api/site-operations/source-registry-projection";
const runbookRoute = "/ops/api/site-operations/runbook-instance-ledger";
const approvalRoute = "/ops/api/site-operations/approval-ticket-workflow";
const fieldAdapterRoute = "/ops/api/live-operations/simulation/field-evidence-adapter";
const featureIds = ["UI-098", "SRC-060", "MEDIA-025", "LAB-107", "SAFE-175", "OPS-142"];

const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  uiScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
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

const checks = [];

check("MEDIA-025 exact product attachment preserves external WHEP/TURN no-execution", () => {
  const productBlock = extractCppFunctionBlock(files.server, "std::string OpsV370FieldEvidenceAttachmentJson(");
  assert(productBlock.includes("externalWhepTurn") && productBlock.includes("fieldEvidenceAttachments") && productBlock.includes("rtspOrWebrtcMediaPathChanged"), "MEDIA-025 exact external WHEP/TURN attachment boundary missing");
  assert(exactBooleanFlagValue(productBlock, "rtspOrWebrtcMediaPathChanged") === false && exactBooleanFlagValue(productBlock, "credentialMaterialIncluded") === false, "MEDIA-025 rtspOrWebrtcMediaPathChanged/credentialMaterialIncluded exact false boundary missing");
});

check("Ops server builds the v3.7 Field Evidence Attachment model", () => {
  for (const snippet of [
    "struct OpsV370FieldEvidenceAttachmentItem",
    "struct OpsV370FieldEvidenceAttachmentSummary",
    "BuildV370FieldEvidenceAttachmentItems",
    "BuildV370FieldEvidenceAttachmentSummary",
    "AppendV370FieldEvidenceAttachmentItemJson",
    "AppendV370FieldEvidenceAttachmentSummaryJson",
    "OpsV370FieldEvidenceAttachmentJson",
    schema,
    "fieldEvidenceAttachmentId",
    "siteId",
    "sourceGroup",
    "runbookId",
    "approvalTicketId",
    "bridgeKind",
    "siteRunbookEvidenceRef",
    "conditionalNotRunEvidence",
    "executionStatus",
    "fieldSmokeStatus",
    "notRunReason",
    "redactedFieldEvidence",
    "simulationInputRef",
    "simulationReadinessBlockerRef",
    "runbookLedgerRef",
    "approvalTicketRef",
    "conditionRefs",
    "evidenceRefs",
    "endpointRequired",
    "credentialRequired",
    "operatorApprovalRequired",
    "readOnly",
  ]) {
    assertIncludes(files.server, snippet, "v370 field evidence attachment server model");
  }
});

check("Field Evidence Attachment derives only from site/runbook/approval/conditional evidence refs", () => {
  const block = extractBlock(
    files.server,
    "struct OpsV370FieldEvidenceAttachmentItem",
    "struct OpsV370ClientNoticeBySiteViewGroupItem",
  );
  for (const snippet of [
    "BuildV340FieldBridgeConditionGates",
    "BuildV350FieldEvidenceIntakeRecords",
    "BuildV350FieldEvidenceExecutionConditions",
    "BuildV360FieldEvidenceSimulationAdapterItems",
    "BuildV370SiteAwareSourceRegistryProjectionItems",
    "BuildV370SiteSimulationInputPackItems",
    "BuildV370RunbookInstanceLedgerEntries",
    "BuildV370ApprovalTicketWorkflowItems",
    "siteRunbookEvidenceRef",
    "conditionalNotRunEvidence",
    "redactedFieldEvidence",
    "not-run",
    "field-smoke-not-run",
    projectionRoute,
    runbookRoute,
    approvalRoute,
    fieldAdapterRoute,
  ]) {
    assertIncludes(block, snippet, "v370 field evidence attachment derivation");
  }
});

check("Field Evidence Attachment preserves conditional/not-run and no-mutation boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV370FieldEvidenceAttachmentJson",
    "struct OpsV370ClientNoticeBySiteViewGroupItem",
  );
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "attachmentOnly",
    "siteScoped",
    "conditionalNotRunOnly",
    "fieldSmokeExecuted",
    "endpointProbePerformed",
    "credentialProbePerformed",
    "providerCallPerformed",
    "vlmProviderCalled",
    "vlmRuntimeCallPerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "runbookInstancePersisted",
    "approvalTicketWritePerformed",
    "approvalDecisionPersisted",
    "operatorNoteWritePerformed",
    "resultDiffPersisted",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "clientNoticeSent",
    "viewerClientPayloadChanged",
    "rawEndpointIncluded",
    "rawLocatorIncluded",
    "rawJsonIncluded",
    "debugMaterialIncluded",
    "credentialMaterialIncluded",
    "providerMaterialIncluded",
    "vlmPromptIncluded",
    "vlmResponseIncluded",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "v370 field evidence attachment boundary");
  }
  for (const flag of [
    "fieldSmokeExecuted",
    "endpointProbePerformed",
    "credentialProbePerformed",
    "providerCallPerformed",
    "vlmProviderCalled",
    "vlmRuntimeCallPerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "runbookInstancePersisted",
    "approvalTicketWritePerformed",
    "approvalDecisionPersisted",
    "operatorNoteWritePerformed",
    "resultDiffPersisted",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "clientNoticeSent",
    "viewerClientPayloadChanged",
    "rawEndpointIncluded",
    "rawLocatorIncluded",
    "rawJsonIncluded",
    "debugMaterialIncluded",
    "credentialMaterialIncluded",
    "providerMaterialIncluded",
    "vlmPromptIncluded",
    "vlmResponseIncluded",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    const index = block.indexOf(flag);
    assert(index >= 0, `boundary flag missing: ${flag}`);
    const nearby = block.slice(index, index + 144);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  for (const forbidden of [
    "PerformFieldSmoke",
    "ProbeEndpoint",
    "ProbeCredential",
    "CallCloudProvider",
    "CallVlmProvider",
    "PersistRunbook",
    "PersistApprovalTicket",
    "AppendEventRecord(",
    "AppendOpsAuditRecord(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `field evidence attachment must not execute or expose restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the Field Evidence Attachment route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "request.path == \"/ops/api/diagnostics/log-tail\"");
  assertIncludes(block, route, "v370 field evidence attachment route");
  assertIncludes(block, "request.method == \"GET\"", "v370 field evidence attachment route");
  assertIncludes(block, "require_ops_principal()", "v370 field evidence attachment route");
  assertIncludes(block, "OpsV370FieldEvidenceAttachmentJson(", "v370 field evidence attachment route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "v370 field evidence attachment route");
  assertIncludes(block, "Cache-Control", "v370 field evidence attachment route");
  assertIncludes(block, "no-store", "v370 field evidence attachment route");
});

check("/ops dashboard declares and renders Field Evidence Attachment workspace", () => {
  const serverBlock = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "ops-site-field-evidence-attachment-workspace",
    "data-testid=\"ops-site-field-evidence-attachment-workspace\"",
    "data-v370-field-evidence-attachment",
    schema,
    "Field Evidence Attachment",
    "dashSiteFieldEvidenceAttachmentBadges",
    "dashSiteFieldEvidenceAttachmentText",
    "dashSiteFieldEvidenceAttachmentList",
    "dashSiteFieldEvidenceAttachmentConditionList",
    "dashSiteFieldEvidenceAttachmentBoundary",
  ]) {
    assertIncludes(serverBlock, snippet, "v370 field evidence attachment dashboard shell");
  }
  const scriptBlock = extractBlock(
    files.uiScript,
    "const renderV370FieldEvidenceAttachment",
    "const renderV370RuleVaWhatIfBySite",
  );
  assertIncludes(scriptBlock, "dashSiteFieldEvidenceAttachmentBoundary", "v370 field evidence attachment product UI state");
  assert(!["rawJson", "rawLocator", "rawEvidenceIncluded: true", "rtsp://", "rtsps://"].some(marker => scriptBlock.includes(marker)), "UI-098 raw-material-redaction explicit absence oracle");
  assertIncludes(files.uiScript, "/ops/dashboard", "UI-098 canonical route obligation");
  assertIncludes(files.server, "media-server.ops.v370-field-evidence-attachment.v1", "UI-098 canonical schema obligation");
  for (const snippet of [
    "refreshV370FieldEvidenceAttachment",
    route,
    "fieldEvidenceAttachments",
    "fieldEvidenceAttachmentSummary",
    "siteRunbookEvidenceRef",
    "conditionalNotRunEvidence",
    "bridgeKind",
    "executionStatus",
    "fieldSmokeStatus",
    "conditionRefs",
    "dashSiteFieldEvidenceAttachmentList",
    "dashSiteFieldEvidenceAttachmentConditionList",
    "requestJson(fieldEvidenceAttachmentRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v370 field evidence attachment dashboard renderer");
  }
  const refreshBlock = extractBlock(files.uiScript, "async function refreshDashboard()", "async function refreshEvents()");
  assertIncludes(refreshBlock, "refreshV370FieldEvidenceAttachment", "dashboard refresh");
  assertIncludes(refreshBlock, route, "dashboard refresh");
});

check("Field Evidence Attachment styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-site-field-evidence-attachment-workspace",
    ".ops-site-field-evidence-attachment-grid",
    ".ops-site-field-evidence-attachment-list",
    ".ops-site-field-evidence-attachment-entry",
    ".ops-site-field-evidence-attachment-boundary",
    "body.ops-shell .ops-site-field-evidence-attachment-workspace",
  ]) {
    assertIncludes(files.css, snippet, "v370 field evidence attachment CSS");
  }
});

check("client/viewer scripts do not receive v3.7 Field Evidence Attachment material", () => {
  for (const forbidden of [
    schema,
    route,
    "fieldEvidenceAttachments",
    "fieldEvidenceAttachmentId",
    "siteRunbookEvidenceRef",
    "conditionalNotRunEvidence",
    "redactedFieldEvidence",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose v3.7 Field Evidence Attachment material: ${forbidden}`);
  }
});

check("roadmap, stream verification, inventory, and release records map v3.7 Step 14", () => {
  for (const snippet of [
    "| 14 | v3.7.0 (14) Field Evidence Attachment | P2 | 완료 |",
    "## v3.7.0 Step 14 개발 기록",
    route,
    "OpsV370FieldEvidenceAttachmentJson",
    `\`./server.sh ${command}\``,
    "Limited Safe Execution Pilot 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.7 Step 14");
  }
  for (const snippet of [
    `| v3.7.0 (14) | \`./server.sh ${command}\` | Field Evidence Attachment.`,
    "ONVIF, external WHEP/TURN, cloud/VLM 조건부 evidence",
    "site/runbook에 not-run/conditional로",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.7 Step 14");
  }
  for (const snippet of [
    `v3.7.0 (14) Field Evidence Attachment | \`UI-098\`, \`SRC-060\`, \`MEDIA-025\`, \`LAB-107\`, \`SAFE-175\`, \`OPS-142\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-098 | V370 Step 14 Field Evidence Attachment UI",
    "SRC-060 | V370 Step 14 site/runbook field evidence source refs",
    "MEDIA-025 | V370 Step 14 external WHEP/TURN field evidence attachment",
    "LAB-107 | V370 Step 14 Field Evidence Attachment harness",
    "SAFE-175 | V370 Step 14 Field Evidence Attachment boundary",
    "OPS-142 | V370 Step 14 Field Evidence Attachment 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.7 Step 14");
  }
  for (const snippet of [
    "V370 Field Evidence Attachment",
    `\`./server.sh ${command}\``,
    "v370 Step 14 RED field evidence attachment gate",
    "v370 Step 14 field evidence attachment final",
    "v370 Step 14 UI 풀테스트",
    "v370 Step 14 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.7 Step 14");
  }
});

check("server entrypoint and inventory verifiers include v3.7 Step 14 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v370_field_evidence_attachment.mjs", "server.sh script dispatch");
  for (const id of ["UI-098", "SRC-060", "MEDIA-025", "LAB-107", "SAFE-175", "OPS-142"]) {
    const expectedCommand = id === "SRC-060" ? "verify-ops-source-registry-api" : command;
    assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === expectedCommand, `${id} manifest verifier command drift`);
  }
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v370_field_evidence_attachment.mjs", "script inventory");
});

check("SAFE-175 canonical bounded no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370FieldEvidenceAttachmentJson(");
  const routeObserved = files.server.includes("/ops/api/site-operations/field-evidence-attachment");
  const safe175BoundaryObserved = block.includes("BuildV370FieldEvidenceAttachmentItems");
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
  assert(routeObserved && safe175BoundaryObserved && block.includes("media-server.ops.v370-field-evidence-attachment.v1") && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-175 BuildV370FieldEvidenceAttachmentItems must remain bounded no-execution no-write redacted and client/provider isolated");
});

const results = runChecks();
console.log("");
console.log("== v3.7.0 Field Evidence Attachment summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.7.0 (14)");
console.log(`- route: ${route}`);
console.log("- scope: conditional/not-run field evidence attachment");
console.log("- execution: field-smoke-not-run; no endpoint/provider execution");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
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
      console.log(`[fail] ${item.name}: ${error.message}`);
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
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing ${needle}`);
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `block start missing: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `block end missing after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
