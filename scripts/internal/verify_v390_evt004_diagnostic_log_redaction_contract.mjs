#!/usr/bin/env node
// 파일 용도: EVT-004 진단 로그 tail의 실제 파일 경계와 민감정보 redaction 계약을 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const productPath = path.join(rootDir, "src/ingress/webrtc_http_server_ops_incidents.cpp");
const runtimePath = path.join(rootDir, "scripts/internal/v390_ui_case_runtime.mjs");
const product = fs.readFileSync(productPath, "utf8");
const runtime = fs.readFileSync(runtimePath, "utf8");
const checks = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function check(name, callback) {
  try {
    callback();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", detail: String(error?.message || error) });
  }
}

function emulateRedaction(line) {
  const sensitive = /(?:password|token|authorization|cookie|session|secret|credential|apikey)/i;
  return line.replace(/(?:\"[^\"]*(?:password|token|authorization|cookie|session|secret|credential|apikey)[^\"]*\"\s*:\s*\"(?:\\.|[^\"])*\")|(?:\b(?:password|token|authorization|cookie|session[_-]?secret|secret|credential|api[_-]?key)[\w_-]*\b\s*[:=].*)/ig,
    match => sensitive.test(match) ? (match.startsWith('"') ? '"<redacted>":"<redacted>"' : '[redacted]') : match);
}

function validateProductBoundary(source) {
  for (const token of [
    "RedactDiagnosticLogLine", "IsSensitiveDiagnosticLogKey", "CanonicalDiagnosticLogKey",
    'canonical.find("password")', 'canonical.find("token")', 'canonical.find("authorization")',
    'canonical.find("cookie")', 'canonical.find("session")', 'canonical.find("secret")',
    'canonical.find("credential")', 'canonical.find("apikey")',
    "lines.push_back(RedactDiagnosticLogLine(Trim(line)))", "JsonEscape(lines[i])",
  ]) assert(source.includes(token), `product redaction boundary is missing ${token}`);
  assert(source.indexOf("RedactDiagnosticLogLine(Trim(line))") < source.indexOf("JsonEscape(lines[i])"),
    "product must redact before JSON escaping the log line");
}

function validateFixtureBoundary(source) {
  for (const token of [
    'const logPath = path.join(rootDir, ".media_server.log")',
    'snapshotStateFiles([logPath])',
    'password=${redactionCanary}',
    '\\"token\\":\\"${redactionCanary}\\"',
    'Authorization: Bearer ${redactionCanary}',
    'cookie=${redactionCanary}',
    'session_secret=${redactionCanary}',
    'diagnostic marker is missing from the authoritative log-tail readback',
    'diagnostic log-tail did not redact the fixture canary',
    'diagnostic log-tail did not preserve the marker with redacted sensitive material',
  ]) assert(source.includes(token), `EVT-004 root-log lifecycle is missing ${token}`);
  assert(!source.includes('const logPath = String(descriptor?.serverLogPath || "")'),
    "EVT-004 still targets the isolated runtime server log instead of the product root log");
}

function expectReject(label, callback) {
  let failed = false;
  try {
    callback();
  } catch {
    failed = true;
  }
  assert(failed, `${label} unexpectedly passed`);
}

check("product redacts sensitive diagnostic key/value pairs before JSON escaping", () => {
  validateProductBoundary(product);
});

check("redaction preserves ordinary lines and JSON escape-sensitive structure", () => {
  const ordinary = 'ordinary marker \\"quoted\\" value';
  const json = '{"marker":"REVIEW4-MARKER","password":"REVIEW4-CANARY"}';
  assert(emulateRedaction(ordinary) === ordinary, "ordinary line changed");
  assert(emulateRedaction(json) === '{"marker":"REVIEW4-MARKER","<redacted>":"<redacted>"}',
    "quoted JSON key/value was not redacted without breaking its JSON shape");
});

check("redaction removes fixture canaries for password token authorization cookie and session secret", () => {
  const canary = "REVIEW4-EVT-004-REDACTION-CANARY";
  const marker = "REVIEW4-EVT-004-LOG-MARKER";
  const lines = [
    `[review4] ${marker} password=${canary}`,
    `[review4] ${marker} "token":"${canary}"`,
    `[review4] ${marker} Authorization: Bearer ${canary}`,
    `[review4] ${marker} cookie=${canary}`,
    `[review4] ${marker} session_secret=${canary}`,
  ].map(emulateRedaction);
  assert(lines.every(line => line.includes(marker)), "opaque marker was removed");
  assert(lines.every(line => !line.includes(canary)), "sensitive canary survived redaction");
  assert(lines.every(line => line.includes("redacted")), "sensitive line lacks explicit redaction");
});

check("EVT-004 fixture writes and restores the exact product root log", () => {
  validateFixtureBoundary(runtime);
  const prepareFailureRestore = runtime.indexOf("prepare-failure-file-snapshot-restore");
  const restoreCase = runtime.indexOf("async function restoreCase");
  const finalByteReadback = runtime.indexOf("acceptance-owned-state-file-byte-readback");
  assert(prepareFailureRestore >= 0 && runtime.lastIndexOf("restoreStateFiles(context.snapshots)", prepareFailureRestore) >= 0,
    "EVT-004 prepare exception does not restore exact state snapshots");
  assert(restoreCase >= 0 && finalByteReadback > restoreCase &&
    runtime.slice(restoreCase, finalByteReadback).includes("restoreStateFiles(caseContext.snapshots)"),
  "EVT-004 successful cleanup does not restore exact state snapshots");
});

check("negative regression mutations fail closed", () => {
  expectReject("redactor call removal", () =>
    validateProductBoundary(product.replace("RedactDiagnosticLogLine(Trim(line))", "Trim(line)")));
  expectReject("token key removal", () =>
    validateProductBoundary(product.replace('canonical.find("token")', 'canonical.find("tok_en")')));
  expectReject("redaction-after-escape ordering", () =>
    validateProductBoundary(product.replace(
      "lines.push_back(RedactDiagnosticLogLine(Trim(line)))",
      "lines.push_back(Trim(line))\n        RedactDiagnosticLogLine(lines.back())",
    )));
  expectReject("isolated server log path", () =>
    validateFixtureBoundary(runtime.replace(
      'const logPath = path.join(rootDir, ".media_server.log")',
      'const logPath = String(descriptor?.serverLogPath || "")',
    )));
});

let failures = 0;
for (const item of checks) {
  if (item.status === "PASS") {
    console.log(`[pass] ${item.name}`);
  } else {
    failures += 1;
    console.log(`[fail] ${item.name}: ${item.detail}`);
  }
}
console.log("");
console.log("== EVT-004 diagnostic log redaction contract summary ==");
console.log(`- pass: ${checks.length - failures}`);
console.log(`- fail: ${failures}`);
if (failures > 0) process.exit(1);
