#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: 현행 UI renderer 계약·구현 연결을 확인한다. CLI 이름은 호환을 위해 유지한다.

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
  printUsageAndExit(`v2.3.0 S03 UI renderer/module decomposition verification

Usage:
  ./server.sh verify-v230-ui-renderer-module-decomposition

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
    document: readText("docs/product-shell-component-examples.md"), kind: "renderer",
    verification: readText("docs/stream-verification.md"), server: readText("server.sh"),
  });
  assert(errors.length === 0, errors.join("; "));
});

check("module inventory documents the extracted UI boundaries", () => {
  const doc = readText("docs/product-shell-component-examples.md");
  for (const snippet of [
    "src/ingress/webrtc_http_server.cpp",
    "include/ingress/product_ui_auth_pages.h",
    "src/ingress/product_ui_auth_pages.cpp",
    "src/ingress/product_ui_client_css.cpp",
    "src/ingress/product_ui_client_scripts.cpp",
    "src/ingress/product_ui_ops_sources_script.cpp",
    "src/ingress/product_ui_ops_users_script.cpp",
  ]) {
    assert(doc.includes(snippet), `inventory missing snippet: ${snippet}`);
  }
});

check("new renderer and module files exist", () => {
  for (const file of expectedModuleFiles()) {
    assert(fs.existsSync(path.join(rootDir, file)), `missing module file: ${file}`);
  }
});

check("CMake builds the extracted modules", () => {
  const cmake = readText("CMakeLists.txt");
  for (const file of expectedSourceFiles()) {
    assert(cmake.includes(file), `CMakeLists.txt missing source: ${file}`);
  }
});

check("webrtc_http_server delegates extracted auth route renderers", () => {
  const server = readWebRtcHttpServerBundle(readText);
  assert(server.includes("#include \"ingress/product_ui_auth_pages.h\""),
    "webrtc_http_server.cpp must include the auth page renderer module");
  for (const symbol of [
    "LoginPageHtml",
    "SetupPageHtml",
    "InviteSetupPageHtml",
    "ClientAccessRequestPageHtml",
    "PasswordChangePageHtml",
    "AuthLandingPageHtml",
  ]) {
    assert(!new RegExp(`\\nstd::string ${symbol}\\s*\\(`).test(server),
      `webrtc_http_server.cpp still defines ${symbol}`);
  }
});

check("product_ui_css delegates the client shell CSS module", () => {
  const css = readText("src/ingress/product_ui_css.cpp");
  const clientCss = readText("src/ingress/product_ui_client_css.cpp");
  assert(!/\nstd::string ClientShellCss\s*\(\)\s*\{/.test(css),
    "product_ui_css.cpp still defines ClientShellCss");
  assert(/\nstd::string ClientShellCss\s*\(\)\s*\{/.test(clientCss),
    "product_ui_client_css.cpp must define ClientShellCss");
  for (const snippet of [
    "client-shell",
    "client-viewer-workspace",
    "client-redaction-review",
  ]) {
    assert(clientCss.includes(snippet), `client CSS module missing snippet: ${snippet}`);
  }
});

check("product_ui_page_scripts delegates extracted JS controllers", () => {
  const scripts = readText("src/ingress/product_ui_page_scripts.cpp");
  for (const symbol of [
    "AppendClientAccessRequestScript",
    "AppendClientShellScript",
    "AppendOpsSourcesPageScript",
    "AppendOpsUsersPageScript",
  ]) {
    assert(!new RegExp(`\\nvoid ${symbol}\\s*\\(`).test(scripts),
      `product_ui_page_scripts.cpp still defines ${symbol}`);
  }
  const clientScripts = readText("src/ingress/product_ui_client_scripts.cpp");
  const sourceScripts = readText("src/ingress/product_ui_ops_sources_script.cpp");
  const userScripts = readText("src/ingress/product_ui_ops_users_script.cpp");
  for (const snippet of [
    "AppendClientAccessRequestScript",
    "AppendClientShellScript",
    "clientWebRtcConfigPromise",
  ]) {
    assert(clientScripts.includes(snippet), `client JS module missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "AppendOpsSourcesPageScript",
    "source:write",
    "channel-audit",
  ]) {
    assert(sourceScripts.includes(snippet), `ops sources JS module missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "AppendOpsUsersPageScript",
    "user-reset-password",
    "invite",
  ]) {
    assert(userScripts.includes(snippet), `ops users JS module missing snippet: ${snippet}`);
  }
});

check("server entrypoint exposes the S03 verifier", () => {
  const server = readText("server.sh");
  assert(server.includes("verify-v230-ui-renderer-module-decomposition"),
    "server.sh missing verify-v230-ui-renderer-module-decomposition");
  assert(server.includes("verify_v230_ui_renderer_module_decomposition.mjs"),
    "server.sh missing v2.3.0 S03 verifier script dispatch");
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
console.log("== v2.3.0 S03 UI renderer/module decomposition summary ==");
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

function expectedModuleFiles() {
  return [
    "include/ingress/product_ui_auth_pages.h",
    ...expectedSourceFiles(),
  ];
}

function expectedSourceFiles() {
  return [
    "src/ingress/product_ui_auth_pages.cpp",
    "src/ingress/product_ui_client_css.cpp",
    "src/ingress/product_ui_client_scripts.cpp",
    "src/ingress/product_ui_ops_sources_script.cpp",
    "src/ingress/product_ui_ops_users_script.cpp",
  ];
}
