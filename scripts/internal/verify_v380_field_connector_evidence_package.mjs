#!/usr/bin/env node
// 파일 용도: v3.8.0 Step 14 Field Connector Evidence Package 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.8.0 Field Connector Evidence Package verification

Usage:
  ./server.sh verify-v380-field-connector-evidence-package

Checks:
  - /ops/api/actions/field-connector-evidence-package exposes an Ops-only read model for ONVIF, external WHEP/TURN, and cloud provider evidence conditions
  - connector evidence remains conditional/not-run and never performs field smoke, endpoint probes, credential probes, provider calls, source/view writes, action writes, or media changes
  - /ops action control workspace renders connector package refs, credential/endpoint approval gates, and not-run boundary text without client/viewer exposure
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v380-field-connector-evidence-package";
const schema = "media-server.ops.v380-field-connector-evidence-package.v1";
const route = "/ops/api/actions/field-connector-evidence-package";
const readinessRoute = "/ops/api/actions/readiness-preflight";
const sourceRecheckRoute = "/ops/api/actions/source-recheck-pilot";
const outcomeRoute = "/ops/api/actions/outcome-reconciliation";
const receiptRoute = "/ops/api/actions/receipt-bundle";
const fieldAttachmentRoute = "/ops/api/site-operations/field-evidence-attachment";
const featureIds = ["UI-106", "SRC-063", "MEDIA-026", "LAB-121", "SAFE-193", "OPS-160"];

const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  uiScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
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

check("Ops server builds the v3.8 Field Connector Evidence Package model", () => {
  for (const snippet of [
    "struct OpsV380FieldConnectorEvidencePackageItem",
    "struct OpsV380FieldConnectorEvidencePackageSummary",
    "BuildV380FieldConnectorEvidencePackageItems",
    "BuildV380FieldConnectorEvidencePackageSummary",
    "AppendV380FieldConnectorEvidencePackageItemJson",
    "AppendV380FieldConnectorEvidencePackageSummaryJson",
    "OpsV380FieldConnectorEvidencePackageJson",
    schema,
    "connectorEvidencePackageId",
    "connectorKind",
    "actionRequestRef",
    "readinessRef",
    "sourceRecheckRef",
    "outcomeRef",
    "receiptBundleRef",
    "fieldAttachmentRef",
    "endpointApprovalRef",
    "credentialApprovalRef",
    "operatorApprovalRequired",
    "connectorEvidenceState",
    "fieldSmokeStatus",
    "redactedConnectorEvidence",
    "conditionRefs",
    "releaseSafe",
    "readOnly",
  ]) {
    assertIncludes(files.server, snippet, "v380 field connector evidence package server model");
  }
});

check("Field Connector Evidence Package derives from action, receipt, and field evidence refs", () => {
  const block = extractBlock(
    files.server,
    "struct OpsV380FieldConnectorEvidencePackageItem",
    "struct OpsV370ClientNoticeBySiteViewGroupItem",
  );
  for (const snippet of [
    "BuildV380ActionReadinessPreflightItems",
    "BuildV380SourceRecheckActionPilotItems",
    "BuildV380OutcomeObserverReconciliationItems",
    "BuildV380ActionReceiptBundleItems",
    "BuildV370FieldEvidenceAttachmentItems",
    readinessRoute,
    sourceRecheckRoute,
    outcomeRoute,
    receiptRoute,
    fieldAttachmentRoute,
    "onvif-connector-evidence",
    "external-whep-turn-connector-evidence",
    "cloud-provider-connector-evidence",
    "credential-approval-required",
    "endpoint-approval-required",
    "field-smoke-not-run",
  ]) {
    assertIncludes(block, snippet, "v380 field connector evidence package derivation");
  }
});

check("Field Connector Evidence Package preserves conditional/not-run and no-mutation boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV380FieldConnectorEvidencePackageJson",
    "struct OpsV370ClientNoticeBySiteViewGroupItem",
  );
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "connectorEvidencePackageOnly",
    "conditionalNotRunOnly",
    "releaseSafe",
    "fieldSmokeExecuted",
    "endpointProbePerformed",
    "credentialProbePerformed",
    "providerCallPerformed",
    "onvifDeviceContacted",
    "externalWhepContacted",
    "externalTurnCredentialUsed",
    "cloudProviderCalled",
    "actionExecutionPerformed",
    "sourceRecheckExecuted",
    "clientNoticeSent",
    "noticeQueueWritePerformed",
    "ruleApplyPerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientPayloadChanged",
    "rawEndpointIncluded",
    "rawLocatorIncluded",
    "rawJsonIncluded",
    "debugMaterialIncluded",
    "credentialMaterialIncluded",
    "providerMaterialIncluded",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "v380 field connector evidence package boundary");
  }
  for (const flag of [
    "fieldSmokeExecuted",
    "endpointProbePerformed",
    "credentialProbePerformed",
    "providerCallPerformed",
    "onvifDeviceContacted",
    "externalWhepContacted",
    "externalTurnCredentialUsed",
    "cloudProviderCalled",
    "actionExecutionPerformed",
    "sourceRecheckExecuted",
    "clientNoticeSent",
    "noticeQueueWritePerformed",
    "ruleApplyPerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientPayloadChanged",
    "rawEndpointIncluded",
    "rawLocatorIncluded",
    "rawJsonIncluded",
    "debugMaterialIncluded",
    "credentialMaterialIncluded",
    "providerMaterialIncluded",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    const index = block.indexOf(flag);
    assert(index >= 0, `boundary flag missing: ${flag}`);
    const nearby = block.slice(index, index + 180);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  for (const forbidden of [
    "PerformFieldSmoke",
    "ProbeEndpoint",
    "ProbeCredential",
    "ContactOnvifDevice",
    "CallCloudProvider",
    "UseTurnCredential",
    "ExecuteSourceRecheck",
    "SendClientNotice",
    "ApplyRuleDraft",
    "AppendEventRecord(",
    "AppendOpsAuditRecord(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `field connector package must not execute or expose restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the Field Connector Evidence Package route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "request.path == \"/ops/api/site-operations/source-group-contract\"");
  assertIncludes(block, route, "v380 field connector evidence package route");
  assertIncludes(block, "request.method == \"GET\"", "v380 field connector evidence package route");
  assertIncludes(block, "require_ops_principal()", "v380 field connector evidence package route");
  assertIncludes(block, "OpsV380FieldConnectorEvidencePackageJson(", "v380 field connector evidence package route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "v380 field connector evidence package route");
  assertIncludes(block, "Cache-Control", "v380 field connector evidence package route");
  assertIncludes(block, "no-store", "v380 field connector evidence package route");
});

check("/ops action control workspace declares and renders Field Connector Evidence Package signals", () => {
  const serverBlock = extractBlock(files.server, "void AppendOpsDashboardPage", "section class=\"section-card ops-workspace-wide ops-site-client-notice-workspace");
  for (const snippet of [
    "ops-field-connector-evidence-package",
    "data-testid=\"ops-field-connector-evidence-package\"",
    "data-v380-field-connector-evidence-package",
    schema,
    "Field Connector Evidence Package",
    "dashFieldConnectorEvidenceBadges",
    "dashFieldConnectorEvidenceText",
    "dashFieldConnectorEvidenceList",
    "dashFieldConnectorConditionList",
    "dashFieldConnectorBoundary",
  ]) {
    assertIncludes(serverBlock, snippet, "v380 field connector evidence package dashboard shell");
  }
  const scriptBlock = extractBlock(
    files.uiScript,
    "const renderV380FieldConnectorEvidencePackage",
    "let v370OutcomeReconciliationState",
  );
  for (const snippet of [
    "refreshV380FieldConnectorEvidencePackage",
    route,
    "fieldConnectorEvidenceItems",
    "fieldConnectorEvidenceSummary",
    "connectorKind",
    "endpointApprovalRef",
    "credentialApprovalRef",
    "fieldSmokeStatus",
    "conditionRefs",
    "dashFieldConnectorEvidenceList",
    "dashFieldConnectorConditionList",
    "requestJson(fieldConnectorEvidenceRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v380 field connector evidence package renderer");
  }
  const refreshBlock = extractBlock(files.uiScript, "async function refreshDashboard()", "async function refreshEvents()");
  assertIncludes(refreshBlock, "refreshV380FieldConnectorEvidencePackage", "dashboard refresh");
  assertIncludes(refreshBlock, route, "dashboard refresh");
});

check("Field Connector Evidence Package styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-field-connector-evidence-package",
    ".ops-field-connector-grid",
    ".ops-field-connector-list",
    ".ops-field-connector-entry",
    ".ops-field-connector-boundary",
    "body.ops-shell .ops-field-connector-evidence-package",
  ]) {
    assertIncludes(files.css, snippet, "v380 field connector evidence package CSS");
  }
});

check("client/viewer scripts do not receive v3.8 Field Connector Evidence Package material", () => {
  for (const forbidden of [
    schema,
    route,
    "fieldConnectorEvidenceItems",
    "connectorEvidencePackageId",
    "endpointApprovalRef",
    "credentialApprovalRef",
    "redactedConnectorEvidence",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose v3.8 Field Connector Evidence Package material: ${forbidden}`);
  }
});

check("roadmap, stream verification, inventory, and release records map v3.8 Step 14", () => {
  for (const snippet of [
    "| 14 | v3.8.0 (14) Field Connector Evidence Package | P2 | 완료 |",
    "## v3.8.0 Step 14 개발 기록",
    route,
    "OpsV380FieldConnectorEvidencePackageJson",
    `\`./server.sh ${command}\``,
    "Default-off Action Explanation 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.8 Step 14");
  }
  for (const snippet of [
    `| v3.8.0 (14) | \`./server.sh ${command}\` | Field Connector Evidence Package.`,
    "ONVIF, external WHEP/TURN, cloud provider 조건",
    "credential/endpoint 승인 기반 field evidence",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.8 Step 14");
  }
  for (const snippet of [
    `v3.8.0 (14) Field Connector Evidence Package | \`UI-106\`, \`SRC-063\`, \`MEDIA-026\`, \`LAB-121\`, \`SAFE-193\`, \`OPS-160\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-106 | V380 Step 14 Field Connector Evidence Package UI",
    "SRC-063 | V380 Step 14 ONVIF field connector evidence refs",
    "MEDIA-026 | V380 Step 14 external WHEP/TURN connector evidence",
    "LAB-121 | V380 Step 14 Field Connector Evidence Package harness",
    "SAFE-193 | V380 Step 14 Field Connector Evidence Package boundary",
    "OPS-160 | V380 Step 14 Field Connector Evidence Package 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.8 Step 14");
  }
  for (const snippet of [
    "V380 Field Connector Evidence Package",
    `\`./server.sh ${command}\``,
    "v380 Step 14 RED Field Connector Evidence Package gate",
    "v380 Step 14 Field Connector Evidence Package final",
    "v380 Step 14 UI 풀테스트",
    "v380 Step 14 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.8 Step 14");
  }
});

check("server entrypoint and inventory verifiers include v3.8 Step 14 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v380_field_connector_evidence_package.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v380_field_connector_evidence_package.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.8.0 Field Connector Evidence Package summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.8.0 (14)");
console.log(`- route: ${route}`);
console.log("- scope: conditional/not-run connector evidence package");
console.log("- execution: field-smoke-not-run; no endpoint, credential, provider, source, action, or media operation");
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
