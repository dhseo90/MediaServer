#!/usr/bin/env node
// 파일 용도: ONVIF credential reference 운영 정책과 저장소 설계/redaction 검증 연결을 확인한다.
// 동작 요약: 정책/저장소 설계 문서, fixture, draft API smoke, field probe harness의 credential 원문 미저장 기준을 정적으로 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
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
  -h, --help        도움말 출력

Checks:
  - credential 원문 저장/출력 금지와 reference-only 정책이 문서화되어 있음
  - credential store/secret manager 연동 설계가 secret provider와 binding store 경계를 분리함
  - probe fixture와 draft API smoke가 credentialRef redaction을 검증함
  - field HTTP probe harness가 credential reference presence만 산출물에 남김
`);
}

assertKnownOptions(rawArgs, ["doc", "h", "help"]);

const args = parseArgs(rawArgs);
const docPath = path.resolve(rootDir, args.doc || "docs/onvif-credential-reference-policy.md");
const doc = fs.readFileSync(docPath, "utf8");
const storeDesign = fs.readFileSync(path.join(rootDir, "docs/onvif-credential-store-integration-design.md"), "utf8");
const authDesign = fs.readFileSync(path.join(rootDir, "docs/onvif-auth-injection-design.md"), "utf8");
const matrixDoc = fs.readFileSync(path.join(rootDir, "docs/onvif-protocol-support-matrix.md"), "utf8");
const supportDoc = fs.readFileSync(path.join(rootDir, "docs/onvif-live-source-support.md"), "utf8");
const fixtureContract = fs.readFileSync(path.join(rootDir, "scripts/internal/verify_onvif_probe_fixture_contract.mjs"), "utf8");
const draftApiSmoke = fs.readFileSync(path.join(rootDir, "scripts/internal/verify_onvif_probe_draft_api.mjs"), "utf8");
const fieldProbeHarness = fs.readFileSync(path.join(rootDir, "scripts/internal/verify_onvif_field_http_probe.mjs"), "utf8");
const probeFixture = JSON.parse(fs.readFileSync(path.join(rootDir, "test/fixtures/onvif_probe_result_stub.json"), "utf8"));

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
  "./onvif-credential-store-integration-design.md",
  "verify-onvif-probe-draft-api",
]) {
  assert(doc.includes(term), `credential policy doc missing required term: ${term}`);
}

for (const term of [
  "# ONVIF Credential Store Integration Design",
  "현재 v1.2.0 구현은 secret 저장소를 제공하지",
  "CredentialSecretProvider",
  "CredentialBindingStore",
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
  "provider path를 포함하지",
  "secret 저장소 구현 완료 선언",
]) {
  assert(storeDesign.includes(term), `credential store design missing required term: ${term}`);
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
assert(matrixDoc.includes("./onvif-credential-store-integration-design.md"), "protocol matrix must link credential store design");
assert(probeFixture.auth?.credentialRef === "operator-entered-secret", "probe fixture should keep synthetic credentialRef sentinel");
assert(probeFixture.auth?.plaintextSecretIncluded === false, "probe fixture must mark plaintextSecretIncluded=false");
assert(fixtureContract.includes("credentialRef is required instead of plaintext secret"), "fixture contract must check credential reference policy");
assert(draftApiSmoke.includes("\"credentialRef\""), "draft API smoke must forbid credentialRef in response text");
assert(draftApiSmoke.includes("operator-entered-secret"), "draft API smoke must forbid synthetic credential value");
assert(fieldProbeHarness.includes("credentialReferencePresent"), "field probe harness must expose boolean credential reference summary only");
assert(fieldProbeHarness.includes("endpoint URL must not include credentials"), "field probe harness must reject credentials in endpoint URL");

console.log("[pass] ONVIF credential reference policy document");
console.log("[pass] ONVIF credential store integration design");
console.log("[pass] ONVIF credential reference redaction coverage");
console.log("");
console.log("== ONVIF credential reference policy summary ==");
console.log(`- doc: ${path.relative(rootDir, docPath)}`);
console.log("- failures: 0");

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
