#!/usr/bin/env node
// 파일 용도: 현행 UI architecture 계약·구현 연결을 확인한다. CLI 이름은 호환을 위해 유지한다.

import { validateUiComponentDocumentation } from "./documentation_contract_lib.mjs";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.2.0 UI architecture inventory verification

Usage:
  ./server.sh verify-v220-ui-architecture-inventory

검사 범위:
  - 현행 UI 기술 안내와 정확한 명령 연결
  - 기존 소스·helper·모듈 계약
  - 정적 결과를 실제 UI/장시간 PASS로 사용하지 않음
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("현행 UI 안내·정책·명령 연결", () => {
  const errors = validateUiComponentDocumentation({
    document: readText("docs/product-shell-component-examples.md"), kind: "architecture",
    verification: readText("docs/stream-verification.md"), server: readText("server.sh"),
  });
  assert(errors.length === 0, errors.join("; "));
});

check("inventory document covers required UI source files", () => {
  const doc = readText("docs/product-shell-component-examples.md");
  for (const file of [
    "src/ingress/webrtc_http_server.cpp",
    "src/ingress/product_ui_css.cpp",
    "src/ingress/product_ui_page_scripts.cpp",
    "src/ingress/product_ui_js.cpp",
    "src/ingress/product_ui_assets.cpp",
    "include/ingress/product_ui_css.h",
    "include/ingress/product_ui_js.h",
    "include/ingress/product_ui_page_scripts.h",
    "include/ingress/product_ui_assets.h",
  ]) {
    assert(doc.includes(file), `inventory missing file: ${file}`);
    assert(fs.existsSync(path.join(rootDir, file)), `inventory references missing file: ${file}`);
  }
});

check("inventory document covers public helper API boundaries", () => {
  const doc = readText("docs/product-shell-component-examples.md");
  for (const symbol of [
    "ProductDesignTokensCss",
    "ProductUiCss",
    "ClientShellCss",
    "ProductThemeBootScript",
    "ProductSharedUiScript",
    "AppendProductThemeScript",
    "AppendClientAccessRequestScript",
    "AppendClientShellScript",
    "AppendOpsShellScript",
    "AppendOpsSourcesPageScript",
    "AppendOpsUsersPageScript",
    "ProductThemeToggleButtonHtml",
    "ProductLanguageSelectHtml",
    "ProductBrandMarkSvg",
    "ProductNavIconSvg",
    "ProductAccountAvatarSvg",
  ]) {
    assert(doc.includes(symbol), `inventory missing public helper symbol: ${symbol}`);
  }
});

check("inventory document covers route and template boundaries", () => {
  const doc = readText("docs/product-shell-component-examples.md");
  for (const snippet of [
    "/setup",
    "/invite/setup",
    "/login",
    "/password/change",
    "/client/request-access",
    "/ops/home",
    "/ops/dashboard",
    "/ops/events",
    "/ops/vlm",
    "/ops/sources",
    "/ops/rules",
    "/ops/users",
    "/client/live",
    "/client/dashboard",
    "/client/events",
    "OpsShellPageHtml",
    "ClientShellPageHtml",
    "BuildOpsSourcesPageHtml",
    "BuildOpsUsersPageHtml",
    "AppendOpsRulesPage",
  ]) {
    assert(doc.includes(snippet), `inventory missing route/template snippet: ${snippet}`);
  }
});




check("server entrypoint exposes the S01 inventory verifier", () => {
  const server = readText("server.sh");
  assert(server.includes("verify-v220-ui-architecture-inventory"), "server.sh missing verify-v220-ui-architecture-inventory");
  assert(server.includes("verify_v220_ui_architecture_inventory.mjs"), "server.sh missing v2.2.0 UI inventory script dispatch");
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    item.fn();
    pass += 1;
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log("== v2.2.0 UI architecture inventory summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);

if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
