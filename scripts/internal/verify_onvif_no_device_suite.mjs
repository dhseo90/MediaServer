#!/usr/bin/env node
// 파일 용도: ONVIF 실장비 제외 검증에 필요한 짧은 smoke 명령을 순차 실행한다.
// 동작 요약: 실장비 endpoint 성공을 제외하고 fixture, loopback, redaction, 정책 검증만 묶어 실행한다.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF no-device verification suite

Usage:
  ./server.sh verify-onvif-no-device-suite [options]

Options:
  --json-output <path>   suite summary JSON을 기록합니다.
  -h, --help             도움말 출력

Checks:
  - 실장비 없이 실행 가능한 ONVIF fixture/parser/adapter/transport smoke를 순차 실행
  - endpoint 미설정 skip과 closed loopback sanitized failure를 모두 확인
  - redaction, TLS fail-closed, credential reference 정책 검증을 포함
`);
}

assertKnownOptions(rawArgs, ["json-output", "h", "help"]);

const args = parseArgs(rawArgs);
const jsonOutput = args.jsonOutput ? path.resolve(rootDir, args.jsonOutput) : "";
const server = path.join(rootDir, "server.sh");
const noDeviceSuiteSummarySchema = "media-server.onvif-no-device-suite-summary.v1";
const suite = [
  ["verify-onvif-no-device-mode"],
  ["verify-onvif-protocol-support-matrix"],
  ["verify-onvif-rtsps-draft-policy"],
  ["verify-onvif-https-soap-transport-design"],
  ["verify-onvif-https-tls-fixture", "--expect-skip"],
  ["verify-onvif-auth-injection-design"],
  ["verify-onvif-ws-discovery-ux"],
  ["verify-onvif-unsupported-api-guard"],
  ["verify-onvif-live-import-contract"],
  ["verify-onvif-probe-fixture-contract"],
  ["verify-onvif-probe-profile-variants"],
  ["verify-onvif-probe-parser"],
  ["verify-onvif-probe-adapter"],
  ["verify-onvif-http-transport"],
  ["verify-onvif-local-simulator"],
  ["verify-onvif-probe-error-wording"],
  ["verify-onvif-field-smoke-redaction"],
  ["verify-onvif-field-smoke-sample-bundle"],
  ["verify-onvif-field-http-probe", "--allow-missing-endpoint"],
  ["verify-onvif-closed-loopback-failure-matrix"],
  [
    "verify-onvif-field-http-probe",
    "--endpoint",
    "http://127.0.0.1:9/onvif/device_service",
    "--expect-failure",
    "--credential-ref-present",
  ],
  ["verify-onvif-tls-transport-policy"],
  ["verify-onvif-credential-reference-policy"],
];

let completed = 0;
const results = [];
for (let index = 0; index < suite.length; index += 1) {
  const commandArgs = suite[index];
  const command = `./server.sh ${commandArgs.join(" ")}`;
  console.log(`\n== ONVIF no-device suite ${index + 1}/${suite.length}: ${command} ==`);
  const result = spawnSync(server, commandArgs, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "inherit",
  });
  const status = result.status === null ? 1 : result.status;
  results.push({
    index: index + 1,
    command,
    ok: status === 0,
    status,
  });
  if (status !== 0) {
    writeJsonSummary(command);
    console.log("");
    console.log("== ONVIF no-device suite summary ==");
    console.log(`- completed: ${completed}/${suite.length}`);
    console.log(`- failed: ${command}`);
    console.log("- realDeviceEndpointSuccess: 미확인");
    if (jsonOutput) console.log(`- jsonOutput: ${jsonOutput}`);
    process.exit(status || 1);
  }
  completed += 1;
}

writeJsonSummary("");
console.log("");
console.log("== ONVIF no-device suite summary ==");
console.log(`- completed: ${completed}/${suite.length}`);
console.log("- failed: 0");
console.log("- mode: 실장비 제외");
console.log("- realDeviceEndpointSuccess: 미확인");
if (jsonOutput) console.log(`- jsonOutput: ${jsonOutput}`);

function writeJsonSummary(failedCommand) {
  if (!jsonOutput) return;
  fs.mkdirSync(path.dirname(jsonOutput), { recursive: true });
  const summary = {
    schema: noDeviceSuiteSummarySchema,
    generatedAt: new Date().toISOString(),
    mode: "실장비 제외",
    realDeviceEndpointSuccess: "미확인",
    total: suite.length,
    completed,
    failed: failedCommand || null,
    results,
  };
  fs.writeFileSync(jsonOutput, `${JSON.stringify(summary, null, 2)}\n`);
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
