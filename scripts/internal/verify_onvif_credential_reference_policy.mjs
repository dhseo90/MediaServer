#!/usr/bin/env node
// 파일 용도: ONVIF credential reference 운영 정책과 저장소 설계/redaction 검증 연결을 확인한다.
// 동작 요약: 정책/저장소 설계 문서, fixture, draft API smoke, field probe harness의 credential 원문 미저장 기준을 정적으로 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF credential reference policy verification

Usage:
  ./server.sh verify-onvif-credential-reference-policy [options]

Options:
  --doc <path>      Credential reference policy 문서입니다. 기본 docs/onvif-credential-reference-policy.md.
  --cxx <path>      C++ compiler입니다. 기본 CXX env 또는 c++.
  -h, --help        도움말 출력

Checks:
  - credential 원문 저장/출력 금지와 reference-only 정책이 문서화되어 있음
  - credential store/secret manager 연동 설계가 secret provider와 binding store 경계를 분리함
  - CredentialSecretProvider interface skeleton과 none provider smoke가 컴파일/실행됨
  - probe fixture와 draft API smoke가 credentialRef redaction을 검증함
  - field HTTP probe harness가 credential reference presence만 산출물에 남김
`);
}

assertKnownOptions(rawArgs, ["doc", "cxx", "h", "help"]);

const args = parseArgs(rawArgs);
const docPath = path.resolve(rootDir, args.doc || "docs/onvif-credential-reference-policy.md");
const cxxBin = args.cxx || process.env.CXX || "c++";
const doc = fs.readFileSync(docPath, "utf8");
const storeDesign = fs.readFileSync(path.join(rootDir, "docs/onvif-credential-store-integration-design.md"), "utf8");
const authDesign = fs.readFileSync(path.join(rootDir, "docs/onvif-auth-injection-design.md"), "utf8");
const matrixDoc = fs.readFileSync(path.join(rootDir, "docs/onvif-protocol-support-matrix.md"), "utf8");
const supportDoc = fs.readFileSync(path.join(rootDir, "docs/onvif-live-source-support.md"), "utf8");
const providerHeader = fs.readFileSync(path.join(rootDir, "include/ingress/onvif_credential_provider.h"), "utf8");
const providerImpl = fs.readFileSync(path.join(rootDir, "src/ingress/onvif_credential_provider.cpp"), "utf8");
const providerSmoke = fs.readFileSync(path.join(rootDir, "scripts/internal/onvif_credential_provider_smoke.cpp"), "utf8");
const liveImportHeader = fs.readFileSync(path.join(rootDir, "include/ingress/onvif_live_import.h"), "utf8");
const liveImportImpl = fs.readFileSync(path.join(rootDir, "src/ingress/onvif_live_import.cpp"), "utf8");
const fixtureContract = fs.readFileSync(path.join(rootDir, "scripts/internal/verify_onvif_probe_fixture_contract.mjs"), "utf8");
const draftApiSmoke = fs.readFileSync(path.join(rootDir, "scripts/internal/verify_onvif_probe_draft_api.mjs"), "utf8");
const fieldProbeHarness = fs.readFileSync(path.join(rootDir, "scripts/internal/verify_onvif_field_http_probe.mjs"), "utf8");
const probeFixture = JSON.parse(fs.readFileSync(path.join(rootDir, "test/fixtures/onvif_probe_result_stub.json"), "utf8"));
const storeDecisionPath = path.join(rootDir, "test/fixtures/onvif_credential_store_policy_decision.json");
const storeDecision = JSON.parse(fs.readFileSync(storeDecisionPath, "utf8"));

for (const term of [
  "# ONVIF Credential Reference Policy",
  "credential 원문",
  "SourceRegistry",
  "PublishedView",
  "client/viewer API",
  "credentialRefPresent",
  "sourceDraft",
  "publishedViewDraft",
  "endpoint URL",
  "username",
  "password",
  "token",
  "source:write",
  "secret manager",
  "include/ingress/onvif_credential_provider.h",
  "NoneCredentialSecretProvider",
  "credential_ready",
  "http_basic",
  "credential_provider_unavailable",
  "secret_material_present=false",
  "RunOnvifProbeAdapter",
  "credential_ref_present",
  "plaintext_secret_included=false",
  "별도 schema version",
  "./onvif-credential-store-integration-design.md",
  "test/fixtures/onvif_credential_store_policy_decision.json",
  "verify-onvif-probe-draft-api",
]) {
  assert(doc.includes(term), `credential policy doc missing required term: ${term}`);
}

for (const term of [
  "# ONVIF Credential Store Integration Design",
  "제품 API/UI에 persistent secret",
  "in-memory credential store",
  "CredentialSecretProvider",
  "CredentialBindingStore",
  "include/ingress/onvif_credential_provider.h",
  "NoneCredentialSecretProvider",
  "InMemoryCredentialSecretProvider",
  "CredentialLookupStatusCode",
  "Probe runtime",
  "Audit event",
  "`none`",
  "`local-encrypted`",
  "`external-secret-manager`",
  "`credentialRef`는 lookup key",
  "실제 reference 값도 기본 노출하지",
  "`source:write` scope",
  "credential_missing",
  "credential_provider_unavailable",
  "credential_material_rejected",
  "secret_material_present=false",
  "secret_material_present=true",
  "Probe adapter summary 연결 정책",
  "RunOnvifProbeAdapter",
  "credentialRefPresent",
  "schema version 변경",
  "provider path를 포함하지",
  "제품 persistent secret 저장소 구현 완료 선언",
  "v1.2.0 (2) 정책 결정",
  "defer-product-persistent-store",
  "이번 스텝 잔여로 보지 않는 항목",
  "실장비 credential smoke redacted artifact",
]) {
  assert(storeDesign.includes(term), `credential store design missing required term: ${term}`);
}

assert(storeDecision.schema === "media-server.onvif-credential-store-policy-decision.v1",
       "credential store policy decision schema mismatch");
assert(storeDecision.decision === "defer-product-persistent-store",
       "credential store policy decision must defer product persistent store");
assert(storeDecision.realDeviceEndpointSuccess === "미확인",
       "credential store policy decision must keep real device success unverified");
const currentScope = storeDecision.currentScope || {};
for (const enabled of [
  "noneProvider",
  "inMemoryFixtureProvider",
  "httpBasicProviderBoundary",
  "credentialRefPresentSummary",
]) {
  assert(currentScope[enabled] === true, `credential store decision must keep current scope enabled: ${enabled}`);
}
for (const disabled of [
  "sourceRegistrySecretStorage",
  "publishedViewSecretStorage",
  "clientViewerCredentialExposure",
  "productPersistentSecretStore",
  "externalSecretManagerAdapter",
  "credentialBindingStore",
]) {
  assert(currentScope[disabled] === false, `credential store decision must keep scope disabled: ${disabled}`);
}
for (const residual of [
  "local encrypted credential store",
  "external secret manager adapter",
  "credential binding UI/API",
  "credential rotation and expiry workflow",
  "credential audit event payload",
  "Digest or WS-Security automatic fallback",
]) {
  assert(storeDecision.notResidualForStep2?.includes(residual),
         `credential store decision missing non-residual item: ${residual}`);
}
for (const gate of [
  "schema review for provider status exposure",
  "source:write guard for credential binding changes",
  "encrypted local store or external secret manager selection",
  "rotation expiry audit policy",
  "redaction matrix for auth headers and SOAP security headers",
  "real device credential smoke with redacted artifact",
]) {
  assert(storeDecision.requiredBeforeOpening?.includes(gate),
         `credential store decision missing opening gate: ${gate}`);
}
assert(storeDecision.handoffIssue?.priority === "P1", "credential store handoff issue priority mismatch");
assert(storeDecision.handoffIssue?.phase === "after v1.2.0 (2) no-device closure",
       "credential store handoff phase mismatch");

for (const term of [
  "class CredentialSecretProvider",
  "class NoneCredentialSecretProvider",
  "CredentialLookupRequest",
  "CredentialLookupResult",
  "CredentialAuthScheme",
  "CredentialSecretMaterial",
  "class InMemoryCredentialSecretProvider",
  "UpsertHttpBasic",
  "MarkStatus",
  "Erase",
  "secret_material_present",
  "CredentialLookupStatusCode",
  "CredentialAuthSchemeCode",
]) {
  assert(providerHeader.includes(term), `credential provider header missing required term: ${term}`);
}

for (const term of [
  "NoneCredentialSecretProvider::Lookup",
  "CredentialLookupStatus::kReady",
  "CredentialLookupStatus::kProviderUnavailable",
  "CredentialLookupStatus::kMissing",
  "\"credential_ready\"",
  "\"http_basic\"",
  "\"credential_provider_unavailable\"",
  "\"credential_missing\"",
  "secret_material_present = false",
  "InMemoryCredentialSecretProvider::Lookup",
  "InMemoryCredentialSecretProvider::UpsertHttpBasic",
  "CredentialLookupStatus::kDenied",
  "CredentialLookupStatus::kExpired",
]) {
  assert(providerImpl.includes(term), `credential provider implementation missing required term: ${term}`);
}

for (const term of [
  "NoneOnvifCredentialProvider",
  "InMemoryCredentialSecretProvider",
  "UpsertHttpBasic",
  "MarkStatus",
  "Erase",
  "secret_material_present",
  "credential_ready",
  "http_basic",
  "credential_provider_unavailable",
  "credential_material_rejected",
]) {
  assert(providerSmoke.includes(term), `credential provider smoke missing required term: ${term}`);
}

for (const term of [
  "bool credential_ref_present",
  "bool plaintext_secret_included",
  "std::vector<std::pair<std::string, std::string>> headers",
  "const CredentialSecretProvider& credential_provider",
]) {
  assert(liveImportHeader.includes(term), `ONVIF live import header missing credential summary term: ${term}`);
}

for (const term of [
  "NoneOnvifCredentialProvider",
  "ApplyCredentialMaterial",
  "CredentialLookupStatus::kReady",
  "CredentialAuthScheme::kHttpBasic",
  "Authorization",
  "Base64Encode",
]) {
  assert(liveImportImpl.includes(term), `probe adapter implementation missing provider auth term: ${term}`);
}

for (const forbidden of [
  "admin:admin",
  "password=1234",
  "Authorization: Basic",
  "Authorization: Bearer",
  "Cookie:",
]) {
  assert(!doc.includes(forbidden), `credential policy doc includes forbidden literal: ${forbidden}`);
}

assert(supportDoc.includes("./onvif-credential-reference-policy.md"), "ONVIF support doc must link credential policy");
assert(authDesign.includes("./onvif-credential-store-integration-design.md"), "auth design must link credential store design");
assert(authDesign.includes("verify-onvif-auth-injection-loopback"), "auth design must mention auth injection loopback smoke");
assert(authDesign.includes("InMemoryCredentialSecretProvider"), "auth design must mention in-memory fixture store provider");
assert(storeDesign.includes("InMemoryCredentialSecretProvider"), "credential store design must mention in-memory provider");
assert(storeDesign.includes("fixture store"), "credential store design must limit in-memory provider to fixture store");
assert(matrixDoc.includes("./onvif-credential-store-integration-design.md"), "protocol matrix must link credential store design");
assert(matrixDoc.includes("verify-onvif-auth-injection-loopback"), "protocol matrix must mention auth loopback smoke");
assert(probeFixture.auth?.credentialRef === "operator-entered-secret", "probe fixture should keep synthetic credentialRef sentinel");
assert(probeFixture.auth?.plaintextSecretIncluded === false, "probe fixture must mark plaintextSecretIncluded=false");
assert(fixtureContract.includes("credentialRef is required instead of plaintext secret"), "fixture contract must check credential reference policy");
assert(draftApiSmoke.includes("\"credentialRef\""), "draft API smoke must forbid credentialRef in response text");
assert(draftApiSmoke.includes("operator-entered-secret"), "draft API smoke must forbid synthetic credential value");
assert(fieldProbeHarness.includes("credentialReferencePresent"), "field probe harness must expose boolean credential reference summary only");
assert(fieldProbeHarness.includes("endpoint URL must not include credentials"), "field probe harness must reject credentials in endpoint URL");
runCredentialProviderSmoke();

console.log("[pass] ONVIF credential reference policy document");
console.log("[pass] ONVIF credential store integration design");
console.log("[pass] ONVIF credential provider interface skeleton");
console.log("[pass] ONVIF credential reference redaction coverage");
console.log("[pass] ONVIF persistent credential store policy decision");
console.log("");
console.log("== ONVIF credential reference policy summary ==");
console.log(`- doc: ${path.relative(rootDir, docPath)}`);
console.log(`- policyDecision: ${path.relative(rootDir, storeDecisionPath)}`);
console.log("- failures: 0");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runCredentialProviderSmoke() {
  const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), "media_server_onvif_credential_provider-"));
  const outputPath = path.join(buildDir, "onvif_credential_provider_smoke");
  const compileArgs = [
    "-std=c++17",
    `-I${path.join(rootDir, "include")}`,
    path.join(rootDir, "scripts/internal/onvif_credential_provider_smoke.cpp"),
    path.join(rootDir, "src/ingress/onvif_credential_provider.cpp"),
    "-o",
    outputPath,
  ];
  console.log(`[verify] build ONVIF credential provider smoke: ${buildDir}`);
  const compile = spawnSync(cxxBin, compileArgs, {
    cwd: rootDir,
    encoding: "utf8",
  });
  assert(compile.status === 0, `credential provider smoke build failed: ${compile.stderr || compile.stdout}`);

  const run = spawnSync(outputPath, [], {
    cwd: rootDir,
    encoding: "utf8",
  });
  process.stdout.write(run.stdout || "");
  process.stderr.write(run.stderr || "");
  assert(run.status === 0, "credential provider smoke failed");
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[toCamel(raw)] = next;
      index += 1;
    } else {
      parsed[toCamel(raw)] = "1";
    }
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, ch) => ch.toUpperCase());
}
