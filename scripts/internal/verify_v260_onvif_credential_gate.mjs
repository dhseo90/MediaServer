#!/usr/bin/env node
// 파일 용도: v2.6.0 S03 ONVIF credential binding/store gate와 redaction guard 경계를 검증한다.

import fs from "node:fs";
import process from "node:process";

const failures = [];

const server = readText("src/ingress/webrtc_http_server.cpp");
const liveImport = readText("src/ingress/onvif_live_import.cpp");
const liveImportHeader = readText("include/ingress/onvif_live_import.h");
const opsSourcesScript = readText("src/ingress/product_ui_ops_sources_script.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const inventory = readText("docs/project-feature-test-inventory.md");
const backlog = readText("docs/development-backlog.md");
const credentialPolicy = readText("docs/onvif-credential-reference-policy.md");
const storeDesign = readText("docs/onvif-credential-store-integration-design.md");
const streamVerification = readText("docs/stream-verification.md");
const serverSh = readText("server.sh");

check("fixture records S03 store selection, fallback, exclusions, and redaction gate", () => {
  const fixture = readJson("test/fixtures/onvif_credential_binding_gate.json");
  assert(fixture.schema === "media-server.onvif-credential-binding-gate.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V260-S03", "fixture targetStep mismatch");
  assert(fixture.primaryStoreProvider === "none", "primary store provider must stay none");
  assert(fixture.primaryStoreDecision === "defer-product-persistent-store", "persistent store decision must be deferred");
  assert(arrayIncludes(fixture.fallbackProviders, "in-memory-fixture"), "fallback must include in-memory-fixture");
  assert(arrayIncludes(fixture.requiredScopes, "source:write"), "source:write must gate binding changes");
  assert(fixture.bindingStoreEnabled === false, "binding store must remain disabled");
  assert(fixture.productPersistentSecretStoreEnabled === false, "persistent secret store must remain disabled");
  assert(fixture.externalSecretManagerEnabled === false, "external secret manager must remain disabled");
  assert(fixture.referenceValueExposed === false, "credential reference values must be redacted");
  assert(fixture.secretMaterialStored === false, "secret material must not be stored");
  assert(fixture.redactionGuard?.urlCredentialsRejected === true, "URL credentials must be rejected");
  assert(fixture.redactionGuard?.draftApiOmitsCredentialRef === true, "draft API must omit credentialRef");
  assert(fixture.redactionGuard?.sourceRegistrySecretFields === false, "SourceRegistry secret fields must stay absent");
  assert(fixture.redactionGuard?.publishedViewSecretFields === false, "PublishedView secret fields must stay absent");
  assert(fixture.licenseProvenancePrivacy?.credentialOrigin === "operator-owned-reference", "credential origin decision missing");
  assert(fixture.licenseProvenancePrivacy?.privacyDecision === "reference-presence-only", "privacy decision missing");
  assert((fixture.excludedProviders || []).some(item => item.provider === "local-encrypted" && item.reason),
    "local-encrypted exclusion reason missing");
  assert((fixture.excludedProviders || []).some(item => item.provider === "external-secret-manager" && item.reason),
    "external-secret-manager exclusion reason missing");
});

check("ONVIF import draft emits credentialGate and rejects URL credential material", () => {
  for (const snippet of [
    "OnvifCredentialGateJson",
    "media-server.onvif-credential-binding-gate.v1",
    "defer-product-persistent-store",
    "sourceWriteRequired",
    "credentialReferenceStatus",
    "reference-present-redacted",
    "productPersistentSecretStoreEnabled",
    "externalSecretManagerEnabled",
    "credentialBindingStoreEnabled",
    "UriContainsAuthorityCredential",
    "streamUri must not include credentials",
    "\\\"credentialGate\\\":",
  ]) {
    assertIncludes(liveImport, snippet, "ONVIF live import S03 gate");
  }
  for (const snippet of [
    "bool credential_ref_present",
    "bool plaintext_secret_included",
  ]) {
    assertIncludes(liveImportHeader, snippet, "ONVIF live import header credential fields");
  }
});

check("/ops/sources renders credential gate without secret input or reference echo", () => {
  for (const snippet of [
    "data-testid=\"onvif-credential-gate\"",
    "data-credential-store=\"deferred-product-store\"",
    "data-redaction=\"credential-reference-only\"",
    "id=\"onvifCredentialGateStatus\"",
  ]) {
    assertIncludes(server, snippet, "ops sources credential gate HTML");
  }
  for (const snippet of [
    "onvifCredentialGateStatus",
    "renderOnvifCredentialGate",
    "credentialGate",
    "uriContainsAuthorityCredential",
    "ONVIF stream URI에는 username/password를 포함할 수 없습니다.",
  ]) {
    assertIncludes(opsSourcesScript, snippet, "ops sources credential gate script");
  }
  for (const forbidden of [
    "name=\"credentialRef\"",
    "name=\"onvifPassword\"",
    "name=\"onvifUsername\"",
    "id=\"onvifCredentialRef\"",
  ]) {
    assert(!server.includes(forbidden) && !opsSourcesScript.includes(forbidden),
      `credential secret/reference input must not be added: ${forbidden}`);
  }
});

check("source:write guard remains the only write gate for ONVIF credential binding changes", () => {
  const block = extractBlockAround(server, "request.path == \"/ops/api/onvif/import-draft\"", 1600);
  assert(block.includes("require_ops_principal"), "ONVIF import draft must require ops principal");
  assert(block.includes("require_source_write_principal"), "ONVIF import draft must require source:write");
  assert(block.indexOf("require_source_write_principal") < block.indexOf("BuildOnvifLiveImportDraft"),
    "source:write guard must run before BuildOnvifLiveImportDraft");
});

check("docs, inventory, smoke, and command catalog track S03", () => {
  assert(/\| 3 \| V260-S03 \| P1 \| (진행|완료) \| ONVIF credential gate \|/.test(backlog),
    "backlog V260-S03 row must be 진행 or 완료 while S03 is under development");
  for (const snippet of [
    "media-server.onvif-credential-binding-gate.v1",
    "V260-S03",
    "primaryStoreProvider: none",
    "fallbackProviders: in-memory-fixture",
    "local-encrypted 제외",
    "external-secret-manager 제외",
    "source:write",
    "URL credential",
    "verify-v260-onvif-credential-gate",
  ]) {
    assertIncludes(credentialPolicy + "\n" + storeDesign, snippet, "ONVIF credential docs S03");
  }
  for (const snippet of [
    "onvif-credential-gate",
    "onvifCredentialGateStatus",
    "credentialGate",
  ]) {
    assertIncludes(uiSmoke, snippet, "ops UI smoke S03 marker");
  }
  for (const snippet of [
    "| UI-047 | `/ops/sources` ONVIF credential gate |",
    "| SRC-031 | ONVIF credential binding/store gate |",
    "| LAB-071 | V260-S03 ONVIF credential gate static guard |",
    "| SAFE-054 | V260-S03 ONVIF credential redaction boundary |",
    "verify-v260-onvif-credential-gate",
  ]) {
    assertIncludes(inventory, snippet, "feature inventory S03 row");
  }
  assertIncludes(streamVerification, "verify-v260-onvif-credential-gate", "stream verification S03 command");
  assertIncludes(serverSh, "verify-v260-onvif-credential-gate", "server.sh S03 command");
  assertIncludes(serverSh, "verify_v260_onvif_credential_gate.mjs", "server.sh S03 script target");
});

check("S03 keeps forbidden persistent store/client/schema/media side effects absent", () => {
  for (const forbidden of [
    "productPersistentSecretStoreEnabled\\\":true",
    "externalSecretManagerEnabled\\\":true",
    "credentialBindingStoreEnabled\\\":true",
    "credentialMaterialIncluded\\\":true",
    "plaintextSecretIncluded\\\":true",
    "/client/api/onvif/credential",
    "Event POST payload 변경 완료",
    "WebRTC DataChannel schema 변경 완료",
    "SSE/WS metadata schema 변경 완료",
    "RTSP/WebRTC media path 변경 완료",
  ]) {
    assert(!server.includes(forbidden) &&
      !liveImport.includes(forbidden) &&
      !opsSourcesScript.includes(forbidden) &&
      !credentialPolicy.includes(forbidden) &&
      !storeDesign.includes(forbidden),
    `forbidden S03 snippet present: ${forbidden}`);
  }
});

if (failures.length > 0) {
  console.log("");
  console.log("== v2.6.0 S03 ONVIF credential gate 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v2.6.0 S03 ONVIF credential gate 통과 ==");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
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

function arrayIncludes(value, expected) {
  return Array.isArray(value) && value.includes(expected);
}

function extractBlockAround(text, needle, length) {
  const index = text.indexOf(needle);
  if (index < 0) return "";
  const start = Math.max(0, index - Math.floor(length / 2));
  return text.slice(start, index + length);
}
