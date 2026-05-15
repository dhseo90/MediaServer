#!/usr/bin/env node
// 파일 용도: ONVIF 인증 주입 설계 기준과 현재 provider 기반 Basic 경계를 검증한다.
// 동작 요약: 기본 none provider와 explicit HTTP Basic provider 경계, WS-Security/Digest 후속 조건, redaction 기준을 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF auth injection design verification

Usage:
  ./server.sh verify-onvif-auth-injection-design

Checks:
  - docs/onvif-auth-injection-design.md가 현재 provider 기반 HTTP Basic 경계를 명시함
  - WS-Security, Digest 인증 주입의 향후 조건과 금지선을 문서화함
  - credential policy/protocol matrix가 auth design 문서를 참조함
  - 현재 ONVIF SOAP transport는 provider material이 있을 때만 Authorization을 주입함
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const designDoc = readText("docs/onvif-auth-injection-design.md");
const credentialDoc = readText("docs/onvif-credential-reference-policy.md");
const storeDesign = readText("docs/onvif-credential-store-integration-design.md");
const matrixDoc = readText("docs/onvif-protocol-support-matrix.md");
const onvifCode = readText("src/ingress/onvif_live_import.cpp");
const providerHeader = readText("include/ingress/onvif_credential_provider.h");
const authLoopbackSmoke = readText("scripts/internal/onvif_auth_injection_loopback_smoke.cpp");
const checks = [];

check("auth injection design keeps current provider Basic status explicit", () => {
  for (const term of [
    "명시적으로 연결된 credential provider",
    "`HTTP Basic` material",
    "기본 provider는 계속 secret 없이",
    "WS-Security UsernameToken과 HTTP Digest 인증 주입은 구현 완료가 아닙니다",
    "`credentialRefPresent=true/false`",
    "Authorization",
    "Cookie",
    "UsernameToken",
    "credential_ready",
    "http_basic",
    "Authorization: Basic",
    "verify-onvif-auth-injection-loopback",
    "401 challenge",
    "InMemoryCredentialSecretProvider",
    "in-memory fixture store provider 연결 시 HTTP Basic header",
    "제품 persistent secret 저장소 또는 외부 secret manager lookup은 현재 구현 완료가 아닙니다",
    "HTTP 401/403은 sanitized probe failure",
  ]) {
    assertContains(designDoc, term, `design doc missing current auth boundary: ${term}`);
  }
});

check("auth injection design documents future secret handling requirements", () => {
  for (const term of [
    "secret storage는 libsodium",
    "외부 secret manager",
    "secret lookup key",
    "장비별 fallback 순서",
    "인증 header와 SOAP security header는 redaction matrix",
    "username, realm, nonce, token, password를 남기지 않습니다",
    "`source:write` scope",
    "credential rotation, expiry, audit event",
    "URL credential",
    "plaintext credential 저장",
  ]) {
    assertContains(designDoc, term, `design doc missing future auth requirement: ${term}`);
  }
});

check("credential policy and protocol matrix link auth injection design", () => {
  assertContains(credentialDoc, "./onvif-auth-injection-design.md", "credential policy missing auth design link");
  assertContains(credentialDoc, "./onvif-credential-store-integration-design.md", "credential policy missing credential store design link");
  assertContains(storeDesign, "./onvif-auth-injection-design.md", "credential store design missing auth design link");
  assertContains(matrixDoc, "./onvif-auth-injection-design.md", "protocol matrix missing auth design link");
  assertContains(matrixDoc, "./onvif-credential-store-integration-design.md", "protocol matrix missing credential store design link");
  assertContains(matrixDoc, "verify-onvif-auth-injection-design", "protocol matrix missing auth design verification");
  assertContains(matrixDoc, "verify-onvif-auth-injection-loopback", "protocol matrix missing auth loopback verification");
  assertContains(storeDesign, "InMemoryCredentialSecretProvider", "credential store design missing in-memory provider");
});

check("current ONVIF SOAP transport injects only provider-provided Basic auth", () => {
  for (const term of [
    "CredentialSecretProvider",
    "ApplyCredentialMaterial",
    "CredentialLookupStatus::kReady",
    "CredentialAuthScheme::kHttpBasic",
    "Authorization",
    "Basic ",
    "Base64Encode",
  ]) {
    assertContains(onvifCode, term, `current ONVIF transport missing auth injection term: ${term}`);
  }
  for (const forbidden of ["Cookie:", "UsernameToken", "PasswordDigest", "Digest "]) {
    assert(!onvifCode.includes(forbidden), `current ONVIF transport unexpectedly includes unsupported auth term: ${forbidden}`);
  }
  assertContains(onvifCode, "SOAPAction:", "current transport should still include SOAPAction header smoke path");
  assertContains(onvifCode, "credentialRefPresent", "current draft response should expose boolean credential summary only");
  assertContains(providerHeader, "InMemoryCredentialSecretProvider", "provider header missing in-memory fixture store");
  assertContains(authLoopbackSmoke, "InMemoryCredentialSecretProvider", "auth loopback smoke missing in-memory store provider");
  assertContains(authLoopbackSmoke, "UpsertHttpBasic", "auth loopback smoke missing store-backed Basic credential");
});

let failures = 0;
for (const item of checks) {
  try {
    item.fn();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failures += 1;
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log("== ONVIF auth injection design summary ==");
console.log("- doc: docs/onvif-auth-injection-design.md");
console.log(`- failures: ${failures}`);
if (failures > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertContains(text, needle, message) {
  const normalizedText = text.replace(/\s+/g, " ");
  const normalizedNeedle = needle.replace(/\s+/g, " ");
  assert(normalizedText.includes(normalizedNeedle), message);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
