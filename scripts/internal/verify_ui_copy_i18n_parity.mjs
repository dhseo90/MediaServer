#!/usr/bin/env node
// 파일 용도: 제품 UI 주요 한국어 문구가 English translation map/pattern과 함께 유지되는지 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`UI copy i18n parity verification

Usage:
  ./server.sh verify-ui-copy-i18n-parity

Checks:
  - 최근 UI copy가 product English translation map에 등록되어 있는지
  - 반복 UI aria-label 패턴이 English translation pattern에 포함되는지
  - copy matrix 문서가 i18n parity 검증을 안내하는지
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("product translation map includes recent UI copy", () => {
  const js = readText("src/ingress/product_ui_js.cpp");
  const required = [
    "'최근 인시던트 흐름': 'Recent Incident Timeline'",
    "'최근 인시던트 없음': 'No recent incidents'",
    "'즉시 인시던트 없음': 'No immediate incidents'",
    "'관련 화면': 'Related screen'",
    "'소스 상태 변경 이력': 'Source status change history'",
    "'상태 변화 audit은 /ops/sources 변경 이력의 소스 상태 변경 preset에서 확인합니다.':",
    "'재연결': 'Reconnect'",
    "'정지': 'Stop'",
    "'보기 방식': 'View mode'",
  ];
  for (const snippet of required) {
    assert(js.includes(snippet), `translation map missing snippet: ${snippet}`);
  }
});

check("product translation patterns include repeated live tile labels", () => {
  const js = readText("src/ingress/product_ui_js.cpp");
  const required = [
    "^타일\\s+(\\d+):\\s+(.+)$",
    "^타일\\s+(\\d+)\\s+(시작|재연결|정지|채널|보기 방식)$",
    "Tile ${count}",
    "translatePattern(detail.trim())",
  ];
  for (const snippet of required) {
    assert(js.includes(snippet), `translation pattern missing snippet: ${snippet}`);
  }
});

check("copy matrix references i18n parity verifier", () => {
  const doc = readText("docs/ui-empty-loading-error-copy-matrix.md");
  const backlog = readText("docs/development-backlog.md");
  assert(doc.includes("./server.sh verify-ui-copy-i18n-parity"), "copy matrix doc missing i18n verifier");
  assert(backlog.includes("UI copy Korean/English parity"), "backlog missing i18n parity closure");
});

check("server entrypoint exposes i18n parity verifier", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  assert(server.includes("verify-ui-copy-i18n-parity"), "server.sh is missing verify-ui-copy-i18n-parity");
  assert(server.includes("verify_ui_copy_i18n_parity.mjs"), "server.sh is missing verifier script reference");
  assert(inventory.includes("verify_ui_copy_i18n_parity.mjs"), "script inventory is missing verify_ui_copy_i18n_parity.mjs");
});

let failCount = 0;
for (const item of checks) {
  try {
    item.run();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    console.error(`[fail] ${item.name}: ${error.message}`);
  }
}

console.log("");
console.log("== UI copy i18n parity verification summary ==");
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);

if (failCount > 0) {
  process.exit(1);
}

function check(name, run) {
  checks.push({ name, run });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
