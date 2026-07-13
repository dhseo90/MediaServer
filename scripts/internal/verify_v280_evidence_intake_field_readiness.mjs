#!/usr/bin/env node
// 파일 용도: v2.8.0 S04 Evidence Intake and Field Readiness와 redaction/field-smoke 경계를 검증한다.
import { exactBooleanFlagValue, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readText("src/ingress/webrtc_http_server.cpp");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const manualChecklist = readText("docs/manual-ui-checklist.md");
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const implementationManifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
const serverSh = readText("server.sh");

check("roadmap records V280-S04 as active/completed evidence intake field readiness work", () => {
  assert(/\| 4 \| V280-S04 \| P1 \| (진행|완료) \| Evidence Intake and Field Readiness \|/.test(backlog),
    "backlog V280-S04 row must be 진행 or 완료 while S04 is under development");
  for (const snippet of [
    "media-server.ops.evidence-intake-field-readiness.v1",
    "redacted evidence/source health/field smoke precondition",
    "passed/failed/blocked/not-run",
    "field readiness panel",
    "credential/endpoint required",
    "release-safe evidence intake 기준",
    "verify-v280-evidence-intake-field-readiness",
  ]) {
    assertIncludes(backlog, snippet, "V280-S04 backlog");
  }
});

check("Ops events API exposes redacted evidence intake and field precondition status", () => {
  const start = server.indexOf("std::string OpsEvidenceIntakeFieldReadinessViewJson(");
  const end = server.indexOf("std::string OpsRuntimeEvidenceWindowViewJson(", start);
  assert(start >= 0 && end > start, "EVT-057 evidence intake projection block missing");
  const evt057ProjectionBlock = server.slice(start, end);
  const routeOwnerSource = readText("src/ingress/ops_event_route_owner.cpp");
  const routeBlock = routeOwnerSource.slice(routeOwnerSource.indexOf("constexpr const char* kOpsEventsPagePath"), routeOwnerSource.indexOf("bool HasPrefix("));
  assert(evt057ProjectionBlock.includes("media-server.ops.evidence-intake-field-readiness.v1") && routeBlock.includes("/ops/api/events/reviews") && exactBooleanFlagValue(evt057ProjectionBlock, "credentialMaterialExposed") === false, "LAB-081 evidence intake must remain redacted on canonical review route");
  assert(!evt057ProjectionBlock.includes("\\\"credentialMaterialExposed\\\":true") && evt057ProjectionBlock.includes("\\\"credentialMaterialExposed\\\":false"), "EVT-057 credentialMaterialExposed redacted canonical projection");
  assert(!evt057ProjectionBlock.includes("\\\"rawEvidenceMaterialExposed\\\":true") && evt057ProjectionBlock.includes("\\\"rawEvidenceMaterialExposed\\\":false"), "EVT-057 raw evidence material must remain redacted");
  assert(!evt057ProjectionBlock.includes("\\\"debugMaterialExposed\\\":true") && evt057ProjectionBlock.includes("\\\"debugMaterialExposed\\\":false"), "EVT-057 debug material must remain redacted");
  assert(!evt057ProjectionBlock.includes("\\\"providerMaterialExposed\\\":true") && evt057ProjectionBlock.includes("\\\"providerMaterialExposed\\\":false"), "EVT-057 provider material must remain redacted");
  assertIncludes(evt057ProjectionBlock, "webrtcDataChannelSchemaChanged", "EVT-057 WebRTC SSE boundary");
  for (const snippet of [
    "OpsEvidenceIntakeFieldReadinessViewJson",
    "OpsEvidenceIntakeFieldReadinessItemJson",
    "OpsEvidenceIntakeFieldPreconditionJson",
    "media-server.ops.evidence-intake-field-readiness.v1",
    "\\\"evidenceIntakeFieldReadiness\\\":",
    "\\\"evidenceIntakeStatus\\\":",
    "\\\"sourceHealthReadiness\\\":",
    "\\\"fieldSmokeStatus\\\":",
    "\\\"endpointCredentialRequired\\\":",
    "\\\"fieldSmokeCredentialStatus\\\":",
    "\\\"redactedEvidenceBundleStatus\\\":",
    "\\\"credentialMaterialExposed\\\":false",
    "\\\"sourceUrlMaterialExposed\\\":false",
    "\\\"rawEvidenceMaterialExposed\\\":false",
    "\\\"debugMaterialExposed\\\":false",
    "\\\"providerMaterialExposed\\\":false",
    "\\\"endpointCredentialFieldPassClaimed\\\":false",
    "\\\"eventPostPayloadChanged\\\":false",
    "\\\"rtspOrWebrtcMediaPathChanged\\\":false",
  ]) {
    assertIncludes(server, snippet, "Ops evidence intake field readiness API");
  }
});

check("/ops/events UI renders evidence intake field readiness and redaction markers", () => {
  for (const snippet of [
    'data-testid="ops-evidence-intake-field-readiness"',
    'data-evidence-intake-field-readiness="redacted-field-preconditions"',
    'id="opsEvidenceIntakeFieldReadinessBadges"',
    'id="opsEvidenceIntakeFieldReadinessRows"',
    "Evidence Intake and Field Readiness",
  ]) {
    assertIncludes(server, snippet, "Ops events evidence intake shell");
  }
  for (const snippet of [
    "renderEvidenceIntakeFieldReadiness",
    "evidenceIntakeFieldReadiness",
    "opsEvidenceIntakeFieldReadinessRows",
    "evidenceIntakeStatus",
    "sourceHealthReadiness",
    "fieldSmokeStatus",
    "endpointCredentialRequired",
    "fieldSmokeCredentialStatus",
    "credentialMaterialExposed",
    "rawEvidenceMaterialExposed",
    "endpointCredentialFieldPassClaimed",
  ]) {
    assertIncludes(script, snippet, "Ops evidence intake field readiness script");
    assertIncludes(extractNamedFunctionBlock(script, "renderEvidenceIntakeFieldReadiness"), "evidenceIntakeFieldReadiness", "UI-057 block-scoped canonical product state");
    assert(!["rawJson","rawLocator","rawEvidenceIncluded: true","rtsp://","rtsps://"].some(marker => extractNamedFunctionBlock(script, "renderEvidenceIntakeFieldReadiness").includes(marker)), "UI-057 raw-material-redaction explicit absence oracle");
    assert(!["passwordHash","tokenHash","Authorization:","credentialValue"].some(marker => extractNamedFunctionBlock(script, "renderEvidenceIntakeFieldReadiness").includes(marker)), "UI-057 credential-redaction explicit absence oracle");
    assert(!["debugCounters","Developer URL","debugMaterialExposed: true"].some(marker => extractNamedFunctionBlock(script, "renderEvidenceIntakeFieldReadiness").includes(marker)), "UI-057 debug-redaction explicit absence oracle");
    assertIncludes(server, "\\\"credentialMaterialExposed\\\":false", "UI-057 canonical credential redaction oracle");
    assertIncludes(script, "/ops/events", "UI-057 canonical route obligation");
  }
  for (const snippet of [
    ".evidence-intake-field-readiness",
    ".evidence-intake-field-readiness-list",
    ".evidence-intake-field-readiness-card",
    ".evidence-intake-field-readiness-grid",
    ".evidence-intake-field-preconditions",
  ]) {
    assertIncludes(css, snippet, "Ops evidence intake field readiness CSS");
  }
});

check("smoke, inventory, manual UI, coverage, and command catalog track S04", () => {
  for (const snippet of [
    'data-testid="ops-evidence-intake-field-readiness"',
    'id="opsEvidenceIntakeFieldReadinessRows"',
    "evidenceIntakeFieldReadiness",
    "evidenceIntakeStatus",
    "sourceHealthReadiness",
    "fieldSmokeStatus",
    "endpointCredentialRequired",
    "credentialMaterialExposed",
    "rawEvidenceMaterialExposed",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke marker");
  }
  for (const snippet of [
    "| V280-S04 Evidence Intake and Field Readiness | `UI-057`, `SRC-032`, `EVT-057`, `LAB-081`, `SAFE-067` | `verify-v280-evidence-intake-field-readiness`",
    "| UI-057 | `/ops/events` Evidence Intake and Field Readiness |",
    "| SRC-032 | Evidence intake source health readiness |",
    "| EVT-057 | Ops evidence intake field readiness view model |",
    "| LAB-081 | V280-S04 evidence intake field readiness static guard |",
    "| SAFE-067 | V280-S04 evidence intake field readiness boundary |",
    "verify-v280-evidence-intake-field-readiness",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S04 row");
  }
  assertIncludes(manualChecklist, "| V280-S04 Evidence Intake and Field Readiness | `UI-057`, `SRC-032`, `EVT-057`, `LAB-081`, `SAFE-067` |", "manual UI checklist S04 row");
  for (const id of ["UI-057", "SRC-032", "EVT-057", "LAB-081", "SAFE-067"]) {
    assert(implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === "verify-v280-evidence-intake-field-readiness", `${id} manifest verifier command drift`);
  }
  assertIncludes(coverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(coverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(streamVerification, "verify-v280-evidence-intake-field-readiness", "stream verification S04 command");
  assertIncludes(serverSh, "verify-v280-evidence-intake-field-readiness", "server.sh S04 command");
  assertIncludes(serverSh, "verify_v280_evidence_intake_field_readiness.mjs", "server.sh S04 script target");
});

check("S04 keeps forbidden field PASS, secret exposure, provider/schema/media side effects absent", () => {
  for (const forbidden of [
    "/client/api/evidence-intake-field-readiness",
    "fieldSmokeStatus\\\":\\\"passed\\\"",
    "fieldSmokeCredentialStatus\\\":\\\"passed\\\"",
    "credentialMaterialExposed\\\":true",
    "sourceUrlMaterialExposed\\\":true",
    "rawEvidenceMaterialExposed\\\":true",
    "debugMaterialExposed\\\":true",
    "providerMaterialExposed\\\":true",
    "endpointCredentialFieldPassClaimed\\\":true",
    "runtimeVlmCallPerformed\\\":true",
    "cloudProviderApiCalled\\\":true",
    "Event POST payload 변경 완료",
    "WebRTC DataChannel schema 변경 완료",
    "SSE/WS metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
  ]) {
    assert(!server.includes(forbidden) && !script.includes(forbidden) && !backlog.includes(forbidden),
      `forbidden S04 snippet present: ${forbidden}`);
  }
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.8.0 S04 evidence intake field readiness 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.8.0 S04 evidence intake field readiness 통과 ==");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function check(name, fn) {
  try {
    fn();
    console.log(`[pass] ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`[fail] ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}
