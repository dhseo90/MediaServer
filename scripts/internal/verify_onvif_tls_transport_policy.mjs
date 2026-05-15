#!/usr/bin/env node
// 파일 용도: ONVIF HTTPS/TLS transport 정책 문서와 fail-closed smoke가 일치하는지 검증한다.
// 동작 요약: 정책 문구, 기존 HTTP transport smoke의 HTTPS fail-closed case, redaction 기준을 정적으로 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF TLS transport policy verification

Usage:
  ./server.sh verify-onvif-tls-transport-policy [options]

Options:
  --doc <path>      TLS transport policy 문서입니다. 기본 docs/onvif-tls-transport-policy.md.
  -h, --help        도움말 출력

Checks:
  - HTTPS/TLS endpoint는 현재 fail-closed 정책으로 문서화되어 있음
  - HTTP transport smoke가 https endpoint redaction case를 포함함
  - downgrade/insecure TLS/credential-in-URL 금지 기준이 문서화되어 있음
`);
}

assertKnownOptions(rawArgs, ["doc", "h", "help"]);

const args = parseArgs(rawArgs);
const docPath = path.resolve(rootDir, args.doc || "docs/onvif-tls-transport-policy.md");
const doc = fs.readFileSync(docPath, "utf8");
const supportDoc = fs.readFileSync(path.join(rootDir, "docs/onvif-live-source-support.md"), "utf8");
const smoke = fs.readFileSync(path.join(rootDir, "scripts/internal/onvif_http_transport_smoke.cpp"), "utf8");
const implementation = fs.readFileSync(path.join(rootDir, "src/ingress/onvif_live_import.cpp"), "utf8");

for (const term of [
  "# ONVIF TLS Transport Policy",
  "HTTP SOAP transport",
  "https://",
  "fail-closed",
  "scheme preflight gate",
  "TLS client library",
  "downgrade",
  "hostname verification",
  "custom CA",
  "insecure TLS",
  "credential",
  "raw SOAP",
  "verify-onvif-http-transport",
]) {
  assert(doc.includes(term), `TLS policy doc missing required term: ${term}`);
}

for (const forbidden of [
  "curl -k",
  "--insecure",
  "NODE_TLS_REJECT_UNAUTHORIZED=0",
  "allow invalid certificate",
]) {
  assert(!doc.includes(forbidden), `TLS policy doc includes forbidden bypass wording: ${forbidden}`);
}

assert(supportDoc.includes("./onvif-tls-transport-policy.md"), "ONVIF support doc must link TLS policy");
assert(smoke.includes("https://192.0.2.40/onvif/device_service"), "HTTP transport smoke missing HTTPS fixture endpoint");
assert(smoke.includes("HTTPS transport should fail closed before TLS implementation"), "HTTP transport smoke missing HTTPS fail-closed assertion");
assert(smoke.includes("HTTPS://user:pass@192.0.2.40/onvif/device_service"), "HTTP transport smoke missing URL userinfo redaction case");
assert(smoke.includes("transport error leaked endpoint"), "HTTP transport smoke missing endpoint redaction assertion");
assert(smoke.includes("transport error leaked URL password"), "HTTP transport smoke missing URL password redaction assertion");
assert(implementation.includes("bool IsHttpSoapTransportScheme"), "transport implementation missing HTTPS preflight helper");
assert(implementation.includes("only http transport is supported"), "transport implementation missing stable HTTPS fail-closed wording");

console.log("[pass] ONVIF TLS transport policy document");
console.log("[pass] ONVIF TLS fail-closed smoke coverage");
console.log("");
console.log("== ONVIF TLS transport policy summary ==");
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
