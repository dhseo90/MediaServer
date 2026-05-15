#!/usr/bin/env node
// 파일 용도: ONVIF 실장비 제외 검증에 필요한 짧은 smoke 명령을 순차 실행한다.
// 동작 요약: 실장비 endpoint 성공을 제외하고 fixture, loopback, redaction, 정책 검증만 묶어 실행한다.

import { spawnSync } from "node:child_process";
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
  ./server.sh verify-onvif-no-device-suite

Checks:
  - 실장비 없이 실행 가능한 ONVIF fixture/parser/adapter/transport smoke를 순차 실행
  - endpoint 미설정 skip과 closed loopback sanitized failure를 모두 확인
  - redaction, TLS fail-closed, credential reference 정책 검증을 포함
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const server = path.join(rootDir, "server.sh");
const suite = [
  ["verify-onvif-no-device-mode"],
  ["verify-onvif-protocol-support-matrix"],
  ["verify-onvif-rtsps-draft-policy"],
  ["verify-onvif-https-soap-transport-design"],
  ["verify-onvif-auth-injection-design"],
  ["verify-onvif-live-import-contract"],
  ["verify-onvif-probe-fixture-contract"],
  ["verify-onvif-probe-profile-variants"],
  ["verify-onvif-probe-parser"],
  ["verify-onvif-probe-adapter"],
  ["verify-onvif-http-transport"],
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
for (let index = 0; index < suite.length; index += 1) {
  const args = suite[index];
  console.log(`\n== ONVIF no-device suite ${index + 1}/${suite.length}: ./server.sh ${args.join(" ")} ==`);
  const result = spawnSync(server, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.log("");
    console.log("== ONVIF no-device suite summary ==");
    console.log(`- completed: ${completed}/${suite.length}`);
    console.log(`- failed: ./server.sh ${args.join(" ")}`);
    console.log("- realDeviceEndpointSuccess: 미확인");
    process.exit(result.status || 1);
  }
  completed += 1;
}

console.log("");
console.log("== ONVIF no-device suite summary ==");
console.log(`- completed: ${completed}/${suite.length}`);
console.log("- failed: 0");
console.log("- mode: 실장비 제외");
console.log("- realDeviceEndpointSuccess: 미확인");
