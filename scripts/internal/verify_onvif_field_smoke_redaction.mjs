#!/usr/bin/env node
// 파일 용도: ONVIF 현장 smoke 산출물 redaction checklist 문서가 필수 기준을 담는지 검증한다.
// 동작 요약: 현행 식별자·금지 값·검증 명령 연결을 정적으로 확인한다. 실제 자료를 정제하지 않는다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { validateFieldGateDocumentation } from "./documentation_contract_lib.mjs";

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

const errors = validateFieldGateDocumentation(doc, "redaction");
assert(errors.length === 0, errors.join("; "));
console.log("[pass] ONVIF field smoke redaction current contract and command links");

const checklistItems = [...doc.matchAll(/^- \[ \] /gm)].length;
// 항목 수는 정보만 제공한다. 중복 체크박스로 계약 누락을 대체하지 않는다.

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
console.log("");
console.log("== ONVIF field smoke redaction checklist summary ==");
console.log(`- doc: ${path.relative(rootDir, docPath)}`);
console.log(`- checklistItems: ${checklistItems}`);
console.log("- failures: 0");
console.log("- actual device/network/playback/UI not-run; artifact sanitization not-run");

function assertForbiddenAbsent(terms) {
  for (const term of terms) {
    assert(!doc.includes(term), `forbidden literal present: ${term}`);
    console.log(`[pass] ONVIF field smoke redaction checklist omits forbidden literal ${JSON.stringify(term)}`);
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
