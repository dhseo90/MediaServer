#!/usr/bin/env node
// 파일 용도: ONVIF 현장 smoke 산출물 sample bundle이 redaction 기준을 지키는지 검증한다.
// 동작 요약: manifest/summary/checklist 파일과 금지 literal, 필수 요약 필드, 문서 연결을 정적으로 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF field smoke sample bundle verification

Usage:
  ./server.sh verify-onvif-field-smoke-sample-bundle [options]

Options:
  --bundle-dir <path>   Sample bundle directory입니다. 기본 test/fixtures/onvif_field_smoke_artifact_sample.
  -h, --help            도움말 출력

Checks:
  - sample bundle manifest, summary, checklist 파일이 존재함
  - endpoint, stream URI, credential, raw SOAP, raw diagnostic JSON literal이 없음
  - clientRedaction, opsCopyParity, probeErrorWording 요약 필드가 있음
`);
}

assertKnownOptions(rawArgs, ["bundle-dir", "h", "help"]);

const args = parseArgs(rawArgs);
const bundleDir = path.resolve(rootDir, args.bundleDir || "test/fixtures/onvif_field_smoke_artifact_sample");
const manifestPath = path.join(bundleDir, "manifest.json");
const summaryPath = path.join(bundleDir, "redacted_probe_summary.json");
const checklistPath = path.join(bundleDir, "redaction-checklist.md");
const readmePath = path.join(bundleDir, "README.md");
const reportTemplatePath = path.join(bundleDir, "field-smoke-report-template.md");

for (const file of [manifestPath, summaryPath, checklistPath, readmePath, reportTemplatePath]) {
  assert(fs.existsSync(file), `missing sample bundle file: ${path.relative(rootDir, file)}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const checklist = fs.readFileSync(checklistPath, "utf8");
const readme = fs.readFileSync(readmePath, "utf8");
const reportTemplate = fs.readFileSync(reportTemplatePath, "utf8");
const combined = [JSON.stringify(manifest), JSON.stringify(summary), checklist, readme, reportTemplate].join("\n");

assert(manifest.schema === "media-server.onvif-field-smoke-artifact-sample-manifest.v1", "manifest schema mismatch");
assert(summary.schema === "media-server.onvif-field-smoke-artifact-sample.v1", "summary schema mismatch");
assert(manifest.files?.includes("field-smoke-report-template.md"), "manifest missing report template file");
assert(manifest.fieldDevice?.realDeviceTestPerformed === false, "manifest realDeviceTestPerformed must be false for sample");
assert(manifest.fieldDevice?.realDeviceEndpointSuccess === "unverified", "manifest realDeviceEndpointSuccess must be unverified");
assert(summary.mode === "field-smoke-template", "summary mode mismatch");
assert(summary.realDeviceTestPerformed === false, "summary realDeviceTestPerformed must be false for sample");
assert(summary.realDeviceEndpointSuccess === "unverified", "summary realDeviceEndpointSuccess must be unverified");
assert(summary.endpoint === "<redacted-host>/onvif/device_service", "summary endpoint must be redacted placeholder");
assert(summary.auth?.credentialReferencePresent === true, "summary credentialReferencePresent must be true");
assert(summary.auth?.plaintextSecretIncluded === false, "summary plaintextSecretIncluded must be false");
assert(summary.selectedProfile?.streamUriRedacted === true, "summary streamUriRedacted must be true");
assert(summary.clientRedaction === "pass", "clientRedaction must be pass");
assert(summary.opsCopyParity === "pass", "opsCopyParity must be pass");
assert(summary.probeErrorWording === "pass", "probeErrorWording must be pass");
assert(Array.isArray(summary.verificationStatus), "summary verificationStatus must be array");
assert(summary.verificationStatus.length >= manifest.requiredVerification.length, "summary verificationStatus is incomplete");
assert(Array.isArray(summary.evidenceIndex), "summary evidenceIndex must be array");
assert(summary.evidenceIndex.some(item => item?.path === "field-smoke-report-template.md"), "evidenceIndex missing report template");

for (const command of [
  "verify-onvif-field-smoke-redaction",
  "verify-onvif-field-http-probe",
  "verify-onvif-probe-draft-api",
  "verify-onvif-ops-sources-ui",
]) {
  assert(manifest.requiredVerification?.includes(command), `manifest missing required verification command: ${command}`);
  assert(summary.verificationStatus.some(item => item?.command === command), `summary missing verification status: ${command}`);
}

for (const term of [
  "clientRedaction",
  "opsCopyParity",
  "probeErrorWording",
  "streamUriRedacted=true",
  "realDeviceEndpointSuccess=unverified",
  "realDeviceTestPerformed=false",
  "field-smoke-report-template.md",
  "Evidence Index",
]) {
  assert(combined.includes(term), `sample bundle missing required term: ${term}`);
}

for (const forbidden of [
  "operator-entered-secret",
  "192.0.2.",
  "rtsp://",
  "rtsps://",
  "http://",
  "https://",
  "Authorization:",
  "Cookie:",
  "<s:Envelope",
  "raw diagnostic JSON:",
]) {
  assert(!combined.includes(forbidden), `sample bundle leaked forbidden literal: ${forbidden}`);
}

console.log("[pass] ONVIF field smoke sample bundle content");
console.log("[pass] ONVIF field smoke sample bundle redaction");
console.log("");
console.log("== ONVIF field smoke sample bundle summary ==");
console.log(`- bundle: ${path.relative(rootDir, bundleDir)}`);
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
