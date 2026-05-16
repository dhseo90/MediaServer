#!/usr/bin/env node
// 파일 용도: ONVIF 현장 smoke 산출물 redaction checklist 문서가 필수 기준을 담는지 검증한다.
// 동작 요약: 체크리스트 항목, 금지 값, 검증 명령, 기록 템플릿의 필수 문구를 정적으로 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF field smoke artifact redaction checklist verification

Usage:
  ./server.sh verify-onvif-field-smoke-redaction [options]

Options:
  --doc <path>      Redaction checklist 문서입니다. 기본 docs/onvif-field-smoke-artifact-redaction.md.
  -h, --help        도움말 출력

Checks:
  - 현장 smoke 산출물 공유 가능/금지 값 기준이 문서화되어 있음
  - client redaction, ops copy parity, probe error wording 확인 항목이 있음
  - 실제 fixture credential, documentation IP, raw SOAP 덤프 예시가 문서에 남지 않음
`);
}

assertKnownOptions(rawArgs, ["doc", "h", "help"]);

const args = parseArgs(rawArgs);
const docPath = path.resolve(rootDir, args.doc || "docs/onvif-field-smoke-artifact-redaction.md");
const doc = fs.readFileSync(docPath, "utf8");

assertIncludes([
  "# ONVIF Field Smoke Artifact Redaction Checklist",
  "## 공유 가능 산출물",
  "## 금지 값",
  "## Artifact Checklist",
  "## 기록 템플릿",
  "## 검증 명령",
  "source locator",
  "ONVIF endpoint",
  "credential reference",
  "raw diagnostic JSON",
  "/client/api/views",
  "/ops/sources",
  "/ops/rules",
  "clientRedaction",
  "opsCopyParity",
  "probeErrorWording",
  "verify-onvif-probe-error-wording",
  "verify-onvif-ops-sources-ui",
  "verify-docs-links",
  "git diff --check",
]);

const checklistItems = [...doc.matchAll(/^- \[ \] /gm)].length;
assert(checklistItems >= 10, `expected at least 10 checklist items, got ${checklistItems}`);

assertForbiddenAbsent([
  "operator-entered-secret",
  "192.0.2.20",
  "rtsp://192.0.2.",
  "http://192.0.2.",
  "Authorization: Basic",
  "Authorization: Bearer",
  "Cookie:",
  "<s:Envelope",
]);

console.log("[pass] ONVIF field smoke redaction checklist content");
console.log("[pass] ONVIF field smoke redaction forbidden literals absent");
console.log("");
console.log("== ONVIF field smoke redaction checklist summary ==");
console.log(`- doc: ${path.relative(rootDir, docPath)}`);
console.log(`- checklistItems: ${checklistItems}`);
console.log("- failures: 0");

function assertIncludes(terms) {
  for (const term of terms) {
    assert(doc.includes(term), `missing required wording: ${term}`);
  }
}

function assertForbiddenAbsent(terms) {
  for (const term of terms) {
    assert(!doc.includes(term), `forbidden literal present: ${term}`);
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
