#!/usr/bin/env node
// 파일 용도: v3.5.0 Step 11 Field Evidence Intake 구현, UI, 문서, inventory 연결을 검증한다.
import { exactBooleanFlagValue, extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.5.0 Field Evidence Intake verification

Usage:
  ./server.sh verify-v350-field-evidence-intake

Checks:
  - /ops/api/live-operations/field-evidence-intake collects redacted ONVIF, external WHEP/TURN, and cloud/VLM provider field evidence states
  - execution conditions and not-run states are separated from collected redacted evidence
  - /ops command workspace renders field evidence intake without raw endpoint, credential, provider, or VLM material
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v350-field-evidence-intake";
const schema = "media-server.ops.v350-field-evidence-intake.v1";
const route = "/ops/api/live-operations/field-evidence-intake";
const fieldBridgeRoute = "/ops/api/source-registry/field-bridge-condition-gates";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  uiScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
  uiSmoke: readText("scripts/internal/verify_ops_client_ui_smoke.mjs"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  serverSh: readText("server.sh"),
};

const checks = [];

check("MEDIA-023 exact product field intake preserves external WHEP/TURN no-execution", () => {
  const productBlock = extractCppFunctionBlock(files.server, "std::string OpsV350FieldEvidenceIntakeJson(");
  assert(productBlock.includes("externalWhepTurnContacted") && productBlock.includes("fieldEvidenceIntakeRecords") && productBlock.includes("rtspOrWebrtcMediaPathChanged"), "MEDIA-023 exact external WHEP/TURN intake boundary missing");
  assert(exactBooleanFlagValue(productBlock, "rtspOrWebrtcMediaPathChanged") === false && exactBooleanFlagValue(productBlock, "credentialMaterialIncluded") === false, "MEDIA-023 rtspOrWebrtcMediaPathChanged/credentialMaterialIncluded exact false boundary missing");
});

check("Ops server builds redacted field evidence intake models", () => {
  for (const snippet of [
    "struct OpsV350FieldEvidenceExecutionCondition",
    "struct OpsV350FieldEvidenceIntakeRecord",
    "struct OpsV350FieldEvidenceIntakeSummary",
    "BuildV350FieldEvidenceIntakeRecords",
    "BuildV350FieldEvidenceExecutionConditions",
    "AppendV350FieldEvidenceExecutionConditionJson",
    "AppendV350FieldEvidenceIntakeRecordJson",
    "AppendV350FieldEvidenceIntakeSummaryJson",
    "OpsV350FieldEvidenceIntakeJson",
    schema,
    "fieldEvidenceIntakeRecords",
    "fieldEvidenceExecutionConditions",
    "redactedFieldEvidence",
    "notRunReason",
  ]) {
    assertIncludes(files.server, snippet, "v350 field evidence intake server model");
  }
});

check("field evidence intake derives ONVIF, external WHEP/TURN, and cloud/VLM provider states without execution", () => {
  const block = extractBlock(files.server, "struct OpsV350FieldEvidenceExecutionCondition", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "BuildV340FieldBridgeConditionGates",
    "onvif-real-device",
    "external-whep-turn",
    "real-cloud-vlm-provider",
    "condition-gated",
    "not-run",
    "field-smoke-needed",
    "endpointRequired",
    "credentialRequired",
    "operatorApprovalRequired",
    "executionStatus",
    "fieldSmokeStatus",
    "notRunReason",
    "redacted field evidence",
    fieldBridgeRoute,
  ]) {
    assertIncludes(block, snippet, "v350 field evidence intake derivation");
  }
});

check("field evidence intake redaction and boundary flags prevent probes, writes, raw material, and media/schema changes", () => {
  const block = extractBlock(files.server, "std::string OpsV350FieldEvidenceIntakeJson", "std::string OpsAuditSearchIndexJson");
  for (const snippet of [
    "redactionPolicy",
    "redactedFieldEvidence",
    "endpointUrlIncluded",
    "credentialMaterialIncluded",
    "rawLocatorIncluded",
    "rawJsonIncluded",
    "debugMaterialIncluded",
    "providerMaterialIncluded",
    "rawTurnCredentialsIncluded",
    "rawVlmPromptIncluded",
    "rawProviderResponseIncluded",
    "clientViewerMaterialIncluded",
    "opsOnly",
    "readOnly",
    "fieldEvidencePersisted",
    "fieldEvidenceWritePerformed",
    "fieldSmokeExecuted",
    "endpointProbePerformed",
    "credentialProbePerformed",
    "onvifDeviceContacted",
    "externalWhepTurnContacted",
    "cloudProviderContacted",
    "vlmProviderCalled",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "artifactExportExecuted",
    "commandPlanExecuted",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    assertIncludes(block, snippet, "v350 field evidence boundary flags");
  }
  for (const flag of [
    "endpointUrlIncluded",
    "credentialMaterialIncluded",
    "rawLocatorIncluded",
    "rawJsonIncluded",
    "debugMaterialIncluded",
    "providerMaterialIncluded",
    "rawTurnCredentialsIncluded",
    "rawVlmPromptIncluded",
    "rawProviderResponseIncluded",
    "clientViewerMaterialIncluded",
    "fieldEvidencePersisted",
    "fieldEvidenceWritePerformed",
    "fieldSmokeExecuted",
    "endpointProbePerformed",
    "credentialProbePerformed",
    "onvifDeviceContacted",
    "externalWhepTurnContacted",
    "cloudProviderContacted",
    "vlmProviderCalled",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "artifactExportExecuted",
    "commandPlanExecuted",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    const index = block.indexOf(flag);
    assert(index >= 0, `missing boundary flag: ${flag}`);
    const nearby = block.slice(index, index + 128);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  for (const forbidden of [
    "AppendOpsAuditRecord(",
    "ProbeOnvif",
    "OpenOnvif",
    "RunFieldSmoke",
    "ConnectWhep",
    "CallVlmProvider(",
    "Authorization",
    "password",
    "\"rtspUrl\"",
    "\"whepUrl\"",
  ]) {
    assert(!block.includes(forbidden), `field evidence intake must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the field evidence intake route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/");
  assertIncludes(block, route, "field evidence intake route");
  assertIncludes(block, "request.method == \"GET\"", "field evidence intake route");
  assertIncludes(block, "require_ops_principal()", "field evidence intake route");
  assertIncludes(block, "OpsV350FieldEvidenceIntakeJson(", "field evidence intake route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "field evidence intake route");
  assertIncludes(block, "Cache-Control", "field evidence intake route");
  assertIncludes(block, "no-store", "field evidence intake route");
  assert(!block.includes("require_source_write_principal"), "field evidence intake route must not require source writes");
});

check("/ops command workspace declares field evidence intake surfaces", () => {
  const block = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "dashCommandWorkspaceFieldEvidenceIntake",
    "data-v350-field-evidence-intake",
    schema,
    "Field Evidence Intake",
    "redacted field evidence",
    "execution conditions",
    "not-run",
    "ONVIF",
    "external WHEP/TURN",
    "cloud/VLM provider",
  ]) {
    assertIncludes(block, snippet, "v350 field evidence dashboard shell");
    assertIncludes(extractNamedFunctionBlock(files.uiScript, "renderV350OpsCommandWorkspace"), "data-v350-field-evidence-intake", "UI-086 block-scoped canonical product state");
    assert(!["rawJson","rawLocator","rawEvidenceIncluded: true","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV350OpsCommandWorkspace").includes(marker)), "UI-086 raw-material-redaction explicit absence oracle");
    assert(!["passwordHash","tokenHash","Authorization:","credentialValue"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV350OpsCommandWorkspace").includes(marker)), "UI-086 credential-redaction explicit absence oracle");
    assertIncludes(files.uiScript, "/ops/dashboard", "UI-086 canonical route obligation");
    assertIncludes(files.uiScript, "media-server.ops.v350-field-evidence-intake.v1", "UI-086 canonical schema obligation");
    assertIncludes(files.uiScript, "ONVIF", "UI-086 canonical field obligation");
  }
});

check("/ops command workspace renderer loads and displays field evidence intake records and conditions", () => {
  const block = extractBlock(files.uiScript, "const v350CommandWorkspaceCard", "const renderDashboardRootCause");
  for (const snippet of [
    "fieldEvidenceIntake",
    "fieldEvidenceRoute",
    route,
    "fieldEvidenceIntakeRecords",
    "fieldEvidenceExecutionConditions",
    "redactedFieldEvidence",
    "executionStatus",
    "fieldSmokeStatus",
    "notRunReason",
    "endpointRequired",
    "credentialRequired",
    "operatorApprovalRequired",
    "dashCommandWorkspaceFieldEvidenceIntake",
    "requestJson(fieldEvidenceRoute)",
  ]) {
    assertIncludes(block, snippet, "v350 field evidence renderer");
  }
  assert(!block.includes("POST"), "field evidence renderer must not POST");
  assert(!block.includes("PUT"), "field evidence renderer must not PUT");
  assert(!block.includes("DELETE"), "field evidence renderer must not DELETE");
});

check("field evidence styling and ops/client smoke track Step 11 markers", () => {
  for (const snippet of [
    ".ops-field-evidence-intake-list",
    ".ops-field-evidence-intake-entry",
    ".ops-field-evidence-condition-list",
  ]) {
    assertIncludes(files.css, snippet, "v350 field evidence intake CSS");
  }
  for (const snippet of [
    "dashCommandWorkspaceFieldEvidenceIntake",
    "data-v350-field-evidence-intake",
    schema,
    route,
    "Field Evidence Intake",
    "redacted field evidence",
    "execution conditions",
  ]) {
    assertIncludes(files.uiSmoke, snippet, "ops/client UI smoke v3.5 Step 11 marker");
  }
});

check("client/viewer scripts do not expose field evidence operator material", () => {
  for (const forbidden of [
    schema,
    route,
    "fieldEvidenceIntakeRecords",
    "fieldEvidenceExecutionConditions",
    "redactedFieldEvidence",
    "notRunReason",
    "endpointRequired",
    "credentialRequired",
    "operatorApprovalRequired",
    "rawProviderResponse",
    "rawVlmPrompt",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose field evidence intake material: ${forbidden}`);
  }
});

check("roadmap records v3.5 Step 11 without overclaiming field smoke or VLM explanation", () => {
  for (const snippet of [
    "| 11 | v3.5.0 (11) Field Evidence Intake | P2 | 완료 |",
    "## v3.5.0 Step 11 개발 기록",
    route,
    "OpsV350FieldEvidenceIntakeJson",
    "ONVIF, external WHEP/TURN, cloud/VLM provider",
    `\`./server.sh ${command}\``,
    "field smoke 실행 evidence가 아닙니다",
    "VLM-assisted Ops Explanation 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.5 Step 11");
  }
});

check("stream verification exposes v3.5 Step 11 command and boundary", () => {
  for (const snippet of [
    `| v3.5.0 (11) | \`./server.sh ${command}\` | Field Evidence Intake.`,
    route,
    "redacted field evidence",
    "execution conditions",
    "ONVIF, external WHEP/TURN, cloud/VLM provider",
    "field smoke/provider call 미수행",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.5 Step 11");
  }
});

check("feature inventory and release records map v3.5 Step 11", () => {
  for (const snippet of [
    `v3.5.0 (11) Field Evidence Intake | \`UI-086\`, \`SRC-047\`, \`MEDIA-023\`, \`LAB-093\`, \`SAFE-145\`, \`OPS-112\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-086 | V350 Step 11 Field Evidence Intake UI",
    "SRC-047 | V350 Step 11 ONVIF field evidence intake",
    "MEDIA-023 | V350 Step 11 external WHEP/TURN field evidence intake",
    "LAB-093 | V350 Step 11 cloud/VLM provider field evidence intake",
    "SAFE-145 | V350 Step 11 field evidence redaction boundary",
    "OPS-112 | V350 Step 11 Field Evidence Intake 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.5 Step 11");
  }
  for (const snippet of [
    "V350 Field Evidence Intake",
    `\`./server.sh ${command}\``,
    "v350 Step 11 RED field evidence intake gate",
    "v350 Step 11 field evidence intake final",
    "v350 Step 11 field smoke",
    "v350 Step 11 UI 풀테스트",
    "v350 Step 11 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.5 Step 11");
  }
});

check("server entrypoint and inventory verifiers include v3.5 Step 11 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v350_field_evidence_intake.mjs", "server.sh script dispatch");
  for (const id of ["UI-086", "SRC-047", "MEDIA-023", "LAB-093", "SAFE-145", "OPS-112"]) {
    assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  }
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(files.scriptInventory, "verify_v350_field_evidence_intake.mjs", "script inventory");
});

check("SAFE-145 canonical field evidence intake boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV350FieldEvidenceIntakeJson(");
  const routeObserved = files.server.includes("/ops/api/live-operations/field-evidence-intake");
  const safe145BoundaryObserved = block.includes("BuildV350FieldEvidenceIntakeRecords") && block.includes("BuildV350FieldEvidenceIntakeSummary");
  const fieldSmokeExecuted = /\b(?:Probe|Contact|Write|Persist|Execute)[A-Za-z0-9_:]*\s*\(/.test(block);
  const rawMaterialExposed = /\\\"(?:rawEndpoint|credentialMaterial|providerMaterial|vlmMaterial)Included\\\":true/.test(block);
  const writePerformed = /\b(?:Write|Persist)[A-Za-z0-9_:]*\s*\(/.test(block);
  const mutationPerformed = fieldSmokeExecuted;
  const credentialMaterialExposed = block.includes("\\\"credentialMaterialIncluded\\\":true");
  const providerCallPerformed = /\b(?:ProviderCall|ProviderClient|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  assert(routeObserved && safe145BoundaryObserved && block.includes("executionStatus") && fieldSmokeExecuted === false && providerCallPerformed === false && writePerformed === false && mutationPerformed === false && rawMaterialExposed === false && credentialMaterialExposed === false,
    "SAFE-145 BuildV350FieldEvidenceIntakeRecords fieldEvidenceWritePerformed fieldSmokeExecuted endpointProbePerformed credentialProbePerformed provider contact must remain false and redacted");
});

const results = runChecks();
console.log("");
console.log("== v3.5.0 field evidence intake ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.5.0 (11)");
console.log(`- route: ${route}`);
console.log("- intake: ONVIF, external WHEP/TURN, cloud/VLM provider redacted field evidence states");
console.log("- conditions: endpoint, credential, operator approval, not-run state separated from evidence");
console.log("- writes: no field smoke, endpoint probe, credential probe, provider call, source/view/EventRecord/Ops audit/client/media mutation performed");
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

function extractBlock(text, start, end) {
  const startIndex = text.indexOf(start);
  assert(startIndex >= 0, `missing block start: ${start}`);
  const endIndex = text.indexOf(end, startIndex + start.length);
  assert(endIndex >= 0, `missing block end after ${start}: ${end}`);
  return text.slice(startIndex, endIndex);
}
