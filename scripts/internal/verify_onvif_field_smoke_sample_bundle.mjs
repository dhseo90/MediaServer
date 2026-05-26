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
console.log("[pass] ONVIF field smoke sample bundle manifest file exists");
console.log("[pass] ONVIF field smoke sample bundle redacted summary file exists");
console.log("[pass] ONVIF field smoke sample bundle checklist file exists");
console.log("[pass] ONVIF field smoke sample bundle README file exists");
console.log("[pass] ONVIF field smoke sample bundle report template file exists");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const checklist = fs.readFileSync(checklistPath, "utf8");
const readme = fs.readFileSync(readmePath, "utf8");
const reportTemplate = fs.readFileSync(reportTemplatePath, "utf8");
const combined = [JSON.stringify(manifest), JSON.stringify(summary), checklist, readme, reportTemplate].join("\n");
const gateSchema = "media-server.onvif-field-smoke-gate.v1";

assert(manifest.schema === "media-server.onvif-field-smoke-artifact-sample-manifest.v1", "manifest schema mismatch");
console.log("[pass] ONVIF field smoke sample bundle manifest schema matches");
assert(summary.schema === "media-server.onvif-field-smoke-artifact-sample.v1", "summary schema mismatch");
console.log("[pass] ONVIF field smoke sample bundle summary schema matches");
assert(manifest.files?.includes("field-smoke-report-template.md"), "manifest missing report template file");
console.log("[pass] ONVIF field smoke sample bundle manifest includes report template");
assert(manifest.fieldDevice?.realDeviceTestPerformed === false, "manifest realDeviceTestPerformed must be false for sample");
assert(manifest.fieldDevice?.realDeviceEndpointSuccess === "unverified", "manifest realDeviceEndpointSuccess must be unverified");
console.log("[pass] ONVIF field smoke sample bundle manifest marks real device test not performed");
console.log("[pass] ONVIF field smoke sample bundle manifest marks real device endpoint unverified");
assert(manifest.gate?.schema === gateSchema, "manifest gate schema mismatch");
assert(manifest.gate?.releaseDevelopmentStatus === "procedure-fixed", "manifest releaseDevelopmentStatus must be procedure-fixed");
assert(manifest.gate?.gateDecision === "not-run", "manifest gateDecision must be not-run for sample");
assert(manifest.gate?.noDeviceSuiteCountsAsFieldSuccess === false, "manifest noDeviceSuiteCountsAsFieldSuccess must be false");
console.log("[pass] ONVIF field smoke sample bundle manifest gate schema matches");
console.log("[pass] ONVIF field smoke sample bundle manifest gate status is procedure-fixed");
console.log("[pass] ONVIF field smoke sample bundle manifest gate decision is not-run");
console.log("[pass] ONVIF field smoke sample bundle manifest keeps no-device suite out of field success");
assert(summary.mode === "field-smoke-template", "summary mode mismatch");
assert(summary.realDeviceTestPerformed === false, "summary realDeviceTestPerformed must be false for sample");
assert(summary.realDeviceEndpointSuccess === "unverified", "summary realDeviceEndpointSuccess must be unverified");
assert(summary.operatorChecklistStatus === "skipped", "summary operatorChecklistStatus must be skipped for sample");
assert(summary.failureWording === "skipped: real device endpoint not provided; no-device suite result only", "summary failureWording must be sanitized skip wording");
console.log("[pass] ONVIF field smoke sample bundle summary mode is field-smoke-template");
console.log("[pass] ONVIF field smoke sample bundle summary marks real device test not performed");
console.log("[pass] ONVIF field smoke sample bundle summary marks real device endpoint unverified");
console.log("[pass] ONVIF field smoke sample bundle summary records skipped operator checklist");
console.log("[pass] ONVIF field smoke sample bundle summary records sanitized skip wording");
assert(summary.gateDecision?.schema === gateSchema, "summary gate schema mismatch");
assert(summary.gateDecision?.releaseDevelopmentStatus === "procedure-fixed", "summary releaseDevelopmentStatus must be procedure-fixed");
assert(summary.gateDecision?.gateDecision === "not-run", "summary gateDecision must be not-run");
assert(summary.gateDecision?.realDeviceEndpointSuccess === "unverified", "summary gate realDeviceEndpointSuccess must be unverified");
assert(summary.gateDecision?.playbackStatus === "skipped", "summary playbackStatus must be skipped");
assert(summary.gateDecision?.redactionArtifactReview === "pass", "summary redactionArtifactReview must be pass");
assert(summary.gateDecision?.fieldSmokeReportReview === "pass", "summary fieldSmokeReportReview must be pass");
assert(summary.gateDecision?.endpointRedacted === true, "summary endpointRedacted must be true");
assert(summary.gateDecision?.streamUriRedacted === true, "summary gate streamUriRedacted must be true");
assert(summary.gateDecision?.rawSoapIncluded === false, "summary rawSoapIncluded must be false");
assert(summary.gateDecision?.plaintextSecretIncluded === false, "summary gate plaintextSecretIncluded must be false");
assert(summary.gateDecision?.noDeviceSuiteCountsAsFieldSuccess === false, "summary noDeviceSuiteCountsAsFieldSuccess must be false");
console.log("[pass] ONVIF field smoke sample bundle summary gate schema matches");
console.log("[pass] ONVIF field smoke sample bundle summary gate status is procedure-fixed");
console.log("[pass] ONVIF field smoke sample bundle summary gate decision is not-run");
console.log("[pass] ONVIF field smoke sample bundle summary gate keeps real device endpoint unverified");
console.log("[pass] ONVIF field smoke sample bundle summary gate marks playback skipped");
console.log("[pass] ONVIF field smoke sample bundle summary gate marks redaction artifact review pass");
console.log("[pass] ONVIF field smoke sample bundle summary gate marks field smoke report review pass");
console.log("[pass] ONVIF field smoke sample bundle summary gate marks endpoint redacted");
console.log("[pass] ONVIF field smoke sample bundle summary gate marks stream URI redacted");
console.log("[pass] ONVIF field smoke sample bundle summary gate omits raw SOAP");
console.log("[pass] ONVIF field smoke sample bundle summary gate omits plaintext secret");
console.log("[pass] ONVIF field smoke sample bundle summary gate keeps no-device suite out of field success");
assert(summary.endpoint === "<redacted-host>/onvif/device_service", "summary endpoint must be redacted placeholder");
assert(summary.auth?.credentialReferencePresent === true, "summary credentialReferencePresent must be true");
assert(summary.auth?.plaintextSecretIncluded === false, "summary plaintextSecretIncluded must be false");
assert(summary.selectedProfile?.streamUriRedacted === true, "summary streamUriRedacted must be true");
assert(summary.clientRedaction === "pass", "clientRedaction must be pass");
assert(summary.opsCopyParity === "pass", "opsCopyParity must be pass");
assert(summary.probeErrorWording === "pass", "probeErrorWording must be pass");
console.log("[pass] ONVIF field smoke sample bundle summary endpoint is redacted placeholder");
console.log("[pass] ONVIF field smoke sample bundle summary records credential reference presence only");
console.log("[pass] ONVIF field smoke sample bundle summary omits plaintext secret");
console.log("[pass] ONVIF field smoke sample bundle summary marks selected profile stream URI redacted");
console.log("[pass] ONVIF field smoke sample bundle summary marks client redaction pass");
console.log("[pass] ONVIF field smoke sample bundle summary marks ops copy parity pass");
console.log("[pass] ONVIF field smoke sample bundle summary marks probe error wording pass");
assert(Array.isArray(summary.verificationStatus), "summary verificationStatus must be array");
assert(summary.verificationStatus.length >= manifest.requiredVerification.length, "summary verificationStatus is incomplete");
assert(Array.isArray(summary.evidenceIndex), "summary evidenceIndex must be array");
assert(summary.evidenceIndex.some(item => item?.path === "field-smoke-report-template.md"), "evidenceIndex missing report template");
console.log("[pass] ONVIF field smoke sample bundle summary verificationStatus is complete");
console.log("[pass] ONVIF field smoke sample bundle summary evidenceIndex includes report template");

for (const command of [
  "verify-onvif-field-smoke-redaction",
  "verify-onvif-field-smoke-gate",
  "verify-onvif-field-http-probe",
  "verify-onvif-probe-draft-api",
  "verify-onvif-ops-sources-ui",
]) {
  assert(manifest.requiredVerification?.includes(command), `manifest missing required verification command: ${command}`);
  assert(summary.verificationStatus.some(item => item?.command === command), `summary missing verification status: ${command}`);
  console.log(`[pass] ONVIF field smoke sample bundle lists required verifier ${command}`);
}

for (const term of [
  "clientRedaction",
  "opsCopyParity",
  "probeErrorWording",
  "streamUriRedacted=true",
  "realDeviceEndpointSuccess=unverified",
  "realDeviceTestPerformed=false",
  "operatorChecklistStatus=skipped",
  "media-server.onvif-field-smoke-gate.v1",
  "releaseDevelopmentStatus=procedure-fixed",
  "gateDecision=not-run",
  "playbackStatus=skipped",
  "redactionArtifactReview=pass",
  "fieldSmokeReportReview=pass",
  "noDeviceSuiteCountsAsFieldSuccess=false",
  "Failure Wording",
  "skipped: real device endpoint not provided",
  "blocked: Digest or WS-Security required; out of",
  "field-smoke-report-template.md",
  "Evidence Index",
]) {
  assert(combined.includes(term), `sample bundle missing required term: ${term}`);
  console.log(`[pass] ONVIF field smoke sample bundle contains required term ${JSON.stringify(term)}`);
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
  console.log(`[pass] ONVIF field smoke sample bundle omits forbidden literal ${JSON.stringify(forbidden)}`);
}
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
