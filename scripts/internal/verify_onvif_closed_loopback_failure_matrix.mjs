#!/usr/bin/env node
// 파일 용도: ONVIF 실장비 제외 환경의 closed loopback probe 실패 matrix를 검증한다.
// 동작 요약: 닫힌 127.0.0.1 endpoint 실패가 sanitized transport error로만 출력되는지 확인한다.

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
  printUsageAndExit(`ONVIF closed loopback failure matrix verification

Usage:
  ./server.sh verify-onvif-closed-loopback-failure-matrix [options]

Options:
  --fixture <path>   Closed loopback failure matrix fixture입니다. 기본 test/fixtures/onvif_closed_loopback_failure_matrix.json.
  -h, --help         도움말 출력

Checks:
  - 닫힌 127.0.0.1 endpoint probe는 --expect-failure에서 sanitized failure로 통과
  - stdout/stderr에 endpoint, path, credential, raw SOAP, stream URI 원문이 남지 않음
  - 실장비 endpoint 성공을 검증 완료로 표시하지 않음
`);
}

assertKnownOptions(rawArgs, ["fixture", "h", "help"]);

const args = parseArgs(rawArgs);
const fixturePath = path.resolve(rootDir, args.fixture || "test/fixtures/onvif_closed_loopback_failure_matrix.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const server = path.join(rootDir, "server.sh");
const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), `media_server_onvif_closed_loopback_failure_matrix-${process.pid}-`));

validateFixture(fixture);

for (const scenario of fixture.scenarios) {
  const outputPath = path.join(artifactDir, `${scenario.id}.json`);
  const commandArgs = [
    "verify-onvif-field-http-probe",
    "--endpoint",
    scenario.endpoint,
    "--timeout-ms",
    String(scenario.timeoutMs),
    "--expect-failure",
    "--output",
    outputPath,
  ];
  if (scenario.credentialRefPresent === true) {
    commandArgs.push("--credential-ref-present");
  }
  const result = spawnSync(server, commandArgs, {
    cwd: rootDir,
    encoding: "utf8",
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  assert(result.status === 0, `${scenario.id}: probe command failed with exit ${result.status}`);
  assertConsoleOutput(scenario, output);
  const artifactText = fs.readFileSync(outputPath, "utf8");
  assertArtifactOutput(scenario, artifactText);
  console.log(`[pass] ${scenario.id}`);
}

console.log("");
console.log("== ONVIF closed loopback failure matrix summary ==");
console.log(`- fixture: ${path.relative(rootDir, fixturePath)}`);
console.log(`- scenarios: ${fixture.scenarios.length}`);
console.log("- failures: 0");
console.log("- realDeviceEndpointSuccess: 미확인");

function validateFixture(matrix) {
  assert(matrix.schema === "media-server.onvif-closed-loopback-failure-matrix.v1", "unexpected matrix schema");
  assert(String(matrix.description || "").includes("not a product API contract"), "description must keep fixture scope explicit");
  assert(String(matrix.description || "").includes("does not prove real device endpoint success"), "description must avoid field success claim");
  assert(matrix.defaultExpectedError === "ONVIF probe failed at GetServices: transport error", "defaultExpectedError mismatch");
  assert(Array.isArray(matrix.defaultForbiddenTerms), "defaultForbiddenTerms must be an array");
  assert(matrix.defaultForbiddenTerms.includes("127.0.0.1"), "default forbidden terms must include loopback host");
  assert(matrix.defaultForbiddenTerms.includes("operator-entered-secret"), "default forbidden terms must include credential fixture");
  assert(matrix.defaultForbiddenTerms.includes("credentialRef="), "default forbidden terms must include credentialRef query sentinel");
  assert(matrix.defaultForbiddenTerms.includes("token="), "default forbidden terms must include token query sentinel");
  assert(matrix.defaultForbiddenTerms.includes("secret-camera-token"), "default forbidden terms must include secret token sentinel");
  assert(Array.isArray(matrix.scenarios) && matrix.scenarios.length >= 4, "matrix must include at least four scenarios");
  const ids = new Set();
  for (const scenario of matrix.scenarios) {
    assert(nonEmptyString(scenario.id), "scenario.id is required");
    assert(!ids.has(scenario.id), `duplicate scenario id: ${scenario.id}`);
    ids.add(scenario.id);
    assert(isClosedLoopbackEndpoint(scenario.endpoint), `${scenario.id}: endpoint must be closed loopback http://127.0.0.1:9`);
    assert(Number.isInteger(scenario.timeoutMs) && scenario.timeoutMs > 0, `${scenario.id}: timeoutMs must be positive`);
    assert(typeof scenario.credentialRefPresent === "boolean", `${scenario.id}: credentialRefPresent must be boolean`);
    assert(scenario.expectedStatus === "fail", `${scenario.id}: expectedStatus must be fail`);
    assert(scenario.expectedError === matrix.defaultExpectedError, `${scenario.id}: expectedError mismatch`);
    assert(Array.isArray(scenario.expectedConsoleTerms) && scenario.expectedConsoleTerms.length > 0, `${scenario.id}: expectedConsoleTerms missing`);
    assert(Array.isArray(scenario.expectedArtifactTerms) && scenario.expectedArtifactTerms.length > 0, `${scenario.id}: expectedArtifactTerms missing`);
    assert(Array.isArray(scenario.forbiddenTerms), `${scenario.id}: forbiddenTerms must be an array`);
  }
}

function assertConsoleOutput(scenario, output) {
  for (const term of scenario.expectedConsoleTerms) {
    assert(output.includes(term), `${scenario.id}: output missing expected term ${term}`);
  }
  assert(output.includes(scenario.expectedError), `${scenario.id}: output missing expected sanitized error`);
  assertNoForbiddenTerms(scenario, output, "console output");
}

function assertArtifactOutput(scenario, output) {
  for (const term of scenario.expectedArtifactTerms) {
    assert(output.includes(term), `${scenario.id}: artifact missing expected term ${term}`);
  }
  assert(output.includes(scenario.expectedError), `${scenario.id}: artifact missing expected sanitized error`);
  assertNoForbiddenTerms(scenario, output, "artifact");
}

function assertNoForbiddenTerms(scenario, output, label) {
  const url = new URL(scenario.endpoint);
  const forbidden = [
    ...fixture.defaultForbiddenTerms,
    scenario.endpoint,
    url.host,
    url.hostname,
    url.pathname === "/" ? "" : url.pathname,
    ...scenario.forbiddenTerms,
  ].map(String).filter(Boolean);
  for (const term of forbidden) {
    assert(!output.includes(term), `${scenario.id}: ${label} leaked forbidden term ${term}`);
  }
}

function isClosedLoopbackEndpoint(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" &&
      parsed.hostname === "127.0.0.1" &&
      parsed.port === "9" &&
      !parsed.username &&
      !parsed.password;
  } catch {
    return false;
  }
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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
