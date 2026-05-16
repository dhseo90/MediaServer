#!/usr/bin/env node
// 파일 용도: 실제 ONVIF HTTP probe field smoke harness를 빌드/실행하고 산출물 redaction을 검증한다.
// 동작 요약: endpoint가 없으면 명시 옵션에서만 skip하며, 실행 결과에는 endpoint/stream URI/credential 원문을 남기지 않는다.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF field HTTP probe smoke

Usage:
  ./server.sh verify-onvif-field-http-probe --endpoint <http-url> [options]
  MEDIA_SERVER_ONVIF_FIELD_ENDPOINT=<http-url> ./server.sh verify-onvif-field-http-probe [options]

Options:
  --endpoint <url>              실제 ONVIF Device service HTTP endpoint입니다. credential을 URL에 넣지 않습니다.
  --timeout-ms <ms>             SOAP action timeout입니다. 기본 3000.
  --credential-ref-present      산출물에 credential reference가 별도 보관됨을 boolean으로만 표시합니다.
  --output <path>               sanitized field smoke JSON을 파일로 저장합니다.
  --build-dir <path>            임시 C++ smoke build directory입니다.
  --cxx <path>                  C++ compiler입니다. 기본 CXX env 또는 c++.
  --expect-failure              redaction/compile smoke용으로 sanitized probe 실패를 통과 처리합니다.
  --allow-missing-endpoint      endpoint 미설정 환경에서는 명시 skip으로 종료합니다.
  -h, --help                    도움말 출력

Checks:
  - 실제 endpoint를 RunOnvifProbeAdapter + SendOnvifSoapHttp로 probe
  - stdout/output artifact에서 endpoint, host, stream URI, credential 원문을 제거
  - 실패도 sanitized summary로만 보고
`);
}

assertKnownOptions(rawArgs, [
  "endpoint",
  "timeout-ms",
  "credential-ref-present",
  "output",
  "build-dir",
  "cxx",
  "expect-failure",
  "allow-missing-endpoint",
  "h",
  "help",
]);

const args = parseArgs(rawArgs);
const endpoint = String(args.endpoint || process.env.MEDIA_SERVER_ONVIF_FIELD_ENDPOINT || "").trim();
const allowMissingEndpoint = Boolean(args.allowMissingEndpoint);
const timeoutMs = Number(args.timeoutMs || process.env.MEDIA_SERVER_ONVIF_FIELD_TIMEOUT_MS || 3000);
const credentialRefPresent = Boolean(args.credentialRefPresent || process.env.MEDIA_SERVER_ONVIF_FIELD_CREDENTIAL_REF);
const expectFailure = Boolean(args.expectFailure);
const buildDir = path.resolve(args.buildDir || path.join(os.tmpdir(), `media_server_onvif_field_probe-${process.pid}`));
const cxxBin = args.cxx || process.env.CXX || "c++";
const binaryPath = path.join(buildDir, "onvif_field_http_probe_smoke");

if (!endpoint) {
  if (allowMissingEndpoint) {
    console.log("[skip] ONVIF field HTTP probe endpoint is not configured");
    console.log("");
    console.log("== ONVIF field HTTP probe summary ==");
    console.log("- endpoint: not configured");
    console.log("- result: skipped");
    process.exit(0);
  }
  console.error("[fail] missing ONVIF endpoint. Use --endpoint or MEDIA_SERVER_ONVIF_FIELD_ENDPOINT.");
  process.exit(1);
}

validateEndpoint(endpoint);
assert(Number.isInteger(timeoutMs) && timeoutMs > 0, "--timeout-ms must be a positive integer");

fs.mkdirSync(buildDir, { recursive: true });
compileSmoke();
const outputText = runSmoke();
assertRedacted(outputText, endpoint);
const payload = JSON.parse(outputText);

if (args.output) {
  const outputPath = path.resolve(args.output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  assertRedacted(fs.readFileSync(outputPath, "utf8"), endpoint);
}

const resultLabel = payload.ok
  ? "[pass] ONVIF field HTTP probe pass"
  : (expectFailure
    ? "[pass] ONVIF field HTTP probe sanitized failure"
    : "[fail] ONVIF field HTTP probe fail");
console.log(resultLabel);
console.log("");
console.log("== ONVIF field HTTP probe summary ==");
console.log("- endpoint: configured, redacted");
console.log(`- credentialReferencePresent: ${payload.credentialReferencePresent === true}`);
console.log(`- profilesDiscovered: ${payload.profilesDiscovered || 0}`);
console.log(`- result: ${payload.status}`);

if (!payload.ok) {
  console.log(`- sanitizedError: ${payload.error || "probe failed"}`);
  if (expectFailure) {
    process.exit(0);
  }
  process.exit(1);
}

if (expectFailure) {
  console.error("[fail] expected sanitized probe failure, but probe passed");
  process.exit(1);
}

function compileSmoke() {
  const result = spawnSync(cxxBin, [
    "-std=c++17",
    `-I${path.join(rootDir, "include")}`,
    path.join(scriptDir, "onvif_field_http_probe_smoke.cpp"),
    path.join(rootDir, "src/ingress/onvif_live_import.cpp"),
    path.join(rootDir, "src/ingress/onvif_credential_provider.cpp"),
    "-o",
    binaryPath,
  ], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error(`C++ smoke build failed with exit ${result.status}`);
  }
}

function runSmoke() {
  const childArgs = [
    "--endpoint",
    endpoint,
    "--timeout-ms",
    String(timeoutMs),
  ];
  if (credentialRefPresent) childArgs.push("--credential-ref-present");
  const result = spawnSync(binaryPath, childArgs, {
    cwd: rootDir,
    encoding: "utf8",
  });
  const stdout = String(result.stdout || "").trim();
  if (!stdout) {
    process.stderr.write(result.stderr || "");
    throw new Error(`C++ smoke returned empty output, exit=${result.status}`);
  }
  try {
    JSON.parse(stdout);
  } catch {
    throw new Error(`C++ smoke returned non-JSON: ${stdout.slice(0, 240)}`);
  }
  process.stderr.write(result.stderr || "");
  return stdout;
}

function validateEndpoint(value) {
  let url = null;
  try {
    url = new URL(value);
  } catch {
    throw new Error("--endpoint must be an absolute URL");
  }
  assert(url.protocol === "http:", "field HTTP probe currently accepts http:// endpoints only");
  assert(!url.username && !url.password && !String(value).includes("@"), "endpoint URL must not include credentials");
}

function assertRedacted(text, endpointValue) {
  const url = new URL(endpointValue);
  const forbidden = [
    endpointValue,
    url.host,
    url.hostname,
    url.pathname,
    "rtsp://",
    "rtsps://",
    "Authorization:",
    "Cookie:",
    "password",
    "operator-entered-secret",
    "raw SOAP",
    "<s:Envelope",
  ].filter(item => item && item !== "/");
  for (const term of forbidden) {
    assert(!text.includes(term), `field probe artifact leaked forbidden term: ${term}`);
  }
}

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
