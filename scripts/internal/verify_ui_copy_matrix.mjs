#!/usr/bin/env node
// 파일 용도: 제품 UI empty/loading/error 문구 matrix와 구현 스니펫이 유지되는지 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`UI copy matrix verification

Usage:
  ./server.sh verify-ui-copy-matrix

Checks:
  - docs/ui-empty-loading-error-copy-matrix.md 상태 문구 matrix
  - Client/Ops empty/loading/error 구현 스니펫
  - server.sh command와 script inventory 등록
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("copy matrix document defines product states", () => {
  const doc = readText("docs/ui-empty-loading-error-copy-matrix.md");
  const required = [
    "media-server.ui-copy-matrix.v1",
    "`/client/live`",
    "`/client/dashboard`",
    "`/ops/dashboard`",
    "`/ops/rules`",
    "`/ops/events`",
    "Ops audit panels",
    "source URL, raw JSON, debug counter, Developer URL",
    "./server.sh verify-ui-copy-matrix",
  ];
  for (const snippet of required) {
    assert(doc.includes(snippet), `copy matrix doc is missing snippet: ${snippet}`);
  }
});

check("client empty loading error copy remains wired", () => {
  const script = readText("src/ingress/product_ui_page_scripts.cpp");
  const required = [
    "emptyState",
    "Live view가 없습니다",
    "할당된 PublishedView가 없습니다",
    "비교할 채널이 없습니다",
    "필터에 맞는 채널이 없습니다",
    "최근 이벤트 없음",
    "현장 상태 불러오는 중",
    "상태를 불러오지 못했습니다",
    "/client/request-access",
  ];
  for (const snippet of required) {
    assert(script.includes(snippet), `client copy snippet is missing: ${snippet}`);
  }
});

check("ops empty loading error copy remains wired", () => {
  const script = readText("src/ingress/product_ui_page_scripts.cpp");
  const shared = readText("src/ingress/product_ui_js.cpp");
  const required = [
    "최근 인시던트 없음",
    "활성 시나리오 인스턴스가 없습니다.",
    "트래킹 이슈 없음",
    "런타임 상태를 불러오는 중입니다.",
    "VA 런타임 디버그를 불러오지 못했습니다.",
    "저장된 채널 분석 설정이 없습니다.",
    "저장 전 차단 항목이 없습니다.",
    "조회된 이벤트 기록이 없습니다.",
    "bundle token 발급 실패",
  ];
  for (const snippet of required) {
    assert(script.includes(snippet) || shared.includes(snippet), `ops copy snippet is missing: ${snippet}`);
  }
});

check("server entrypoint exposes copy matrix verifier", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  assert(server.includes("verify-ui-copy-matrix"), "server.sh is missing verify-ui-copy-matrix");
  assert(server.includes("verify_ui_copy_matrix.mjs"), "server.sh is missing verifier script reference");
  assert(inventory.includes("verify_ui_copy_matrix.mjs"), "script inventory is missing verify_ui_copy_matrix.mjs");
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
console.log("== UI copy matrix verification summary ==");
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
