#!/usr/bin/env node
// 파일 용도: ONVIF SOAP Fault/malformed response matrix와 실제 adapter 실패 요약을 비교 검증한다.
// 동작 요약: C++ smoke를 빌드/실행하고 fault/깨진 SOAP가 raw body 노출 없이 fail-safe 요약으로 축약되는지 확인한다.

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
  printUsageAndExit(`ONVIF SOAP Fault/malformed matrix verification

Usage:
  ./server.sh verify-onvif-soap-fault-matrix [options]

Options:
  --fixture <path>      SOAP Fault/malformed matrix fixture입니다.
  --build-dir <path>    임시 C++ smoke build directory입니다.
  --cxx <path>          C++ compiler입니다. 기본 CXX env 또는 c++.
  -h, --help            도움말 출력

Checks:
  - SOAP Fault, malformed XML, HTTP fault response가 sanitized failure로 축약됨
  - endpoint, credential, raw SOAP, fault code/detail이 실패 요약에 남지 않음
`);
}

assertKnownOptions(rawArgs, ["fixture", "build-dir", "cxx", "h", "help"]);

const args = parseArgs(rawArgs);
const fixturePath = path.resolve(rootDir, args.fixture || "test/fixtures/onvif_soap_fault_malformed_matrix.json");
const buildDir = path.resolve(args.buildDir || path.join(os.tmpdir(), `media_server_onvif_soap_fault-${process.pid}`));
const cxxBin = args.cxx || process.env.CXX || "c++";
const binaryPath = path.join(buildDir, "onvif_soap_fault_matrix_smoke");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

validateFixture(fixture);
fs.mkdirSync(buildDir, { recursive: true });
compileSmoke();
const actual = runSmoke();
validateActual(actual, fixture);

console.log("[summary] ONVIF SOAP Fault/malformed matrix complete");
console.log("");
console.log("== ONVIF SOAP Fault/malformed matrix summary ==");
console.log(`- fixture: ${path.relative(rootDir, fixturePath)}`);
console.log(`- scenarios: ${fixture.scenarios.length}`);
console.log("- failures: 0");

function compileSmoke() {
  const result = spawnSync(cxxBin, [
    "-std=c++17",
    `-I${path.join(rootDir, "include")}`,
    path.join(scriptDir, "onvif_soap_fault_matrix_smoke.cpp"),
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
  const result = spawnSync(binaryPath, [], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error(`C++ smoke failed with exit ${result.status}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`C++ smoke returned non-JSON: ${String(result.stdout || "").slice(0, 240)}`);
  }
}

function validateFixture(matrix) {
  assert(matrix.schema === "media-server.onvif-soap-fault-malformed-matrix.v1", "unexpected matrix schema");
  assert(String(matrix.description || "").includes("not a product API contract"), "description must keep fixture scope explicit");
  assert(Array.isArray(matrix.defaultForbiddenTerms), "defaultForbiddenTerms must be an array");
  for (const term of ["operator-entered-secret", "secret-camera-token", "raw SOAP", "<s:Fault"]) {
    assert(matrix.defaultForbiddenTerms.includes(term), `default forbidden terms missing ${term}`);
  }
  assert(Array.isArray(matrix.scenarios) && matrix.scenarios.length >= 6, "matrix must contain representative scenarios");
  const ids = new Set();
  for (const scenario of matrix.scenarios) {
    assert(nonEmptyString(scenario.id), "scenario.id is required");
    assert(!ids.has(scenario.id), `duplicate scenario id: ${scenario.id}`);
    ids.add(scenario.id);
    assert(["soap-fault", "malformed-soap", "transport", "soap-fault-redaction"].includes(scenario.category), `${scenario.id}: unexpected category`);
    assert(nonEmptyString(scenario.inputSummary), `${scenario.id}: inputSummary is required`);
    const expected = scenario.expected || {};
    assert(expected.ok === false, `${scenario.id}: expected.ok must be false`);
    assert(expected.credentialRefPresent === true, `${scenario.id}: expected credential summary must be true`);
    assert(nonEmptyString(expected.error), `${scenario.id}: expected.error is required`);
    assert(Array.isArray(expected.requiredTerms) && expected.requiredTerms.length > 0, `${scenario.id}: requiredTerms missing`);
    assert(Array.isArray(expected.forbiddenTerms), `${scenario.id}: forbiddenTerms must be an array`);
  }
}

function validateActual(actual, matrix) {
  assert(actual.schema === "media-server.onvif-soap-fault-malformed-actual.v1", "unexpected actual schema");
  assert(actual.results && typeof actual.results === "object", "actual results missing");
  const defaultForbiddenTerms = matrix.defaultForbiddenTerms.map(String).filter(Boolean);
  for (const scenario of matrix.scenarios) {
    const result = actual.results[scenario.id];
    assert(result, `${scenario.id}: actual result missing`);
    const expected = scenario.expected;
    assert(result.ok === false, `${scenario.id}: actual ok must be false`);
    assert(result.credentialRefPresent === expected.credentialRefPresent, `${scenario.id}: credential summary mismatch`);
    assert(result.error === expected.error, `${scenario.id}: error mismatch: ${result.error}`);
    for (const term of expected.requiredTerms) {
      assert(result.error.includes(term), `${scenario.id}: error missing required term ${term}`);
    }
    for (const term of [...defaultForbiddenTerms, ...expected.forbiddenTerms]) {
      assert(!result.error.includes(term), `${scenario.id}: error leaked forbidden term ${term}`);
    }
    console.log(`[pass] ONVIF SOAP negative scenario ${scenario.id}`);
    console.log(`[pass] ONVIF SOAP negative redaction scenario ${scenario.id}`);
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
