#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: REVIEW4-64 Ops 제품 UI renderer 분리와 HTML/source byte 불변 계약을 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 REVIEW4-64 Ops product UI renderer owner verification

Usage:
  ./server.sh verify-v390-ops-product-ui-renderer-owner

Checks:
  - focused Ops page renderer header/source와 CMake wiring
  - webrtc_http_server route/auth/status owner 불변과 renderer delegation
  - dashboard/rules/events/home/VLM HTML renderer source-byte 불변
  - DOM root/test-id/label 계약 불변
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const server = readWebRtcHttpServerBundle(readText);
const cmake = readText("CMakeLists.txt");
const headerPath = "include/ingress/product_ui_server_pages.h";
const sourcePath = "src/ingress/product_ui_server_pages.cpp";
const checks = [];

check("focused Ops renderer files exist and are wired", () => {
  assert(fs.existsSync(path.join(rootDir, headerPath)), `missing ${headerPath}`);
  assert(fs.existsSync(path.join(rootDir, sourcePath)), `missing ${sourcePath}`);
  assert(cmake.includes(sourcePath), `CMakeLists.txt missing ${sourcePath}`);
});

check("server delegates Ops renderer ownership", () => {
  const header = readText(headerPath);
  const source = readText(sourcePath);
  assert(server.includes('#include "ingress/product_ui_server_pages.h"'),
    "webrtc_http_server.cpp missing focused renderer include");
  assert(header.includes("std::string OpsShellPageHtml(const std::string& stream_route,") &&
    header.includes("int rtsp_listen_port,"),
    "focused renderer header missing OpsShellPageHtml declaration");
  for (const symbol of [
    "AppendOpsShellStart",
    "AppendOpsShellEnd",
    "AppendOpsDashboardPage",
    "AppendOpsRulesPage",
    "AppendOpsEventsPage",
    "AppendOpsHomePage",
    "AppendOpsVlmInstallConnectionPage",
  ]) {
    assert(!server.includes(`void ${symbol}(`), `webrtc_http_server.cpp still owns ${symbol}`);
    assert(source.includes(`void ${symbol}(`), `${sourcePath} missing ${symbol}`);
  }
  assert(!server.includes("std::string OpsShellPageHtml("),
    "webrtc_http_server.cpp still defines OpsShellPageHtml");
  assert(source.includes("std::string OpsShellPageHtmlImpl(const std::string& stream_route,"),
    "focused renderer source missing private byte-stable implementation");
  assert(source.includes("return OpsShellPageHtmlImpl(stream_route, rtsp_listen_port, principal, active);"),
    "focused renderer source missing public forwarding boundary");
});

check("Ops renderer source bytes match the pre-extraction baseline", () => {
  const source = readText(sourcePath);
  const rendererBlock = sliceBetween(source,
    "void AppendOpsShellStartImpl(",
    "// OPS_RENDERER_BYTE_BASELINE_END")
    .replaceAll("ProductUiPrincipalView", "auth::Principal")
    .replace("if (principal.is_admin) {", "if (auth::IsAdmin(principal)) {")
    .replaceAll("AppendOpsShellStartImpl", "AppendOpsShellStart")
    .replaceAll("AppendOpsShellEndImpl", "AppendOpsShellEnd")
    .replace(
      "std::string OpsShellPageHtmlImpl(const std::string& stream_route,\n                                 int rtsp_listen_port,\n                                 const auth::Principal& principal,\n                                 const std::string& active)",
      "std::string OpsShellPageHtml(const app::AppConfig& config,\n                             const auth::Principal& principal,\n                             const std::string& active)")
    .replace("AppendOpsShellScript(out, active, stream_route, rtsp_listen_port);",
      "AppendOpsShellScript(out, active, config.stream_route, config.rtsp_listen_port);");
  assert(sha256(rendererBlock) === "fc59b705f2be7eda96fd05fc2f8a579f784d3644de3d68b687112bb4ea1570e1",
    "Ops renderer HTML/source byte baseline drifted");

  const helperHashes = new Map([
    ["std::string HtmlEscape(", "9e9635d29597d975943aacadc90208a0dad300eb0caa00b53cfd4426910d5eb4"],
    ["std::string RefreshIconSvgHtml(", "e426b3b4f2eeac68ff0848eb01d13e13238d8cd6caf96bea970026c2d8166376"],
    ["std::string RefreshIconButtonHtml(", "e2a84ce8de58f385baa293989ac532164c07fac7b4ad82de940f9c1afae1b1a1"],
    ["void AppendProductAccountMenu(", "00a41a1660e31bbce5c82207aeb492a4326405b79a655247730366e88e349df1"],
    ["void AppendImageNavLink(", "c5ccbdf1076d9bb9abbff9dbd6376ca71771a3511fcd06097105bb4cb7ab963d"],
  ]);
  for (const [signature, expected] of helperHashes) {
    assert(sha256(normalizePrincipalView(extractFunction(source, signature))) === expected,
      `focused renderer helper byte baseline drifted: ${signature}`);
    assert(sha256(extractFunction(server, signature)) === expected,
      `shared server helper byte baseline drifted: ${signature}`);
  }
});

check("route auth/status and response delegation remain byte-identical", () => {
  const rulesRoute = sliceBetween(server,
    '                        if (request.method == "GET" && request.path == "/ops/rules") {',
    '\n\t                        if (request.path == "/ops/api/users")');
  const overviewRoute = sliceBetween(server,
    '                        if (request.method == "GET" &&\n                            (IsOpsOverviewShellRoute(request.path) ||',
    '\n                        if (request.method == "GET" && IsClientShellRoute(request.path))');
  assert(sha256(normalizeConfigAdapter(rulesRoute)) === "66d0866bd160d8b449a6b03cf5bd974c861bacab7d145655ed131e46218ff7af",
    "/ops/rules route/auth/status block drifted");
  assert(sha256(normalizeConfigAdapter(overviewRoute)) === "a8dc4d9667f53b8f240cb7bf3af19f8645a52cc3ef2680d2b97aae2e39cb0fe4",
    "Ops overview/events route/auth/status block drifted");
});

check("DOM roots, test ids, and visible labels remain present", () => {
  const source = readText(sourcePath);
  for (const token of [
    'aria-label="운영 메뉴"',
    'data-testid="ops-dashboard-page"',
    'data-testid="ops-rules-page"',
    'data-testid="ops-events-page"',
    'data-testid="ops-home-page"',
    'data-testid="ops-vlm-page"',
    '"운영 대시보드"',
    '<h2>룰 설정</h2>',
    '<h2>Operator Event Review Inbox</h2>',
    '<h2>운영 홈</h2>',
    '<h2>VLM 설치/연결 준비</h2>',
  ]) {
    assert(source.includes(token), `focused renderer missing DOM/label token: ${token}`);
  }
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
console.log("== V390 REVIEW4-64 Ops product UI renderer owner summary ==");
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

function sliceBetween(text, startToken, endToken) {
  const start = text.indexOf(startToken);
  const end = text.indexOf(endToken, start);
  assert(start >= 0, `start token not found: ${startToken}`);
  assert(end >= 0, `end token not found: ${endToken}`);
  return text.slice(start, end);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeConfigAdapter(value) {
  return value
    .replace(/ProductUiPrincipalViewFromAuthPrincipal\(\s*principal_result\.principal\s*\)/g,
      "principal_result.principal")
    .replace(
      /OpsShellPageHtml\(config\.stream_route,\n\s+config\.rtsp_listen_port,\n\s+principal_result\.principal,\n\s+"rules"\)/g,
      'OpsShellPageHtml(config, principal_result.principal, "rules")')
    .replace(
      /OpsShellPageHtml\(config\.stream_route,\n\s+config\.rtsp_listen_port,\n\s+principal_result\.principal,/g,
      "OpsShellPageHtml(config,\n                                                                     principal_result.principal,");
}

function normalizePrincipalView(value) {
  return value
    .replaceAll("ProductUiPrincipalView", "auth::Principal")
    .replace("if (principal.is_admin) {", "if (auth::IsAdmin(principal)) {");
}

function extractFunction(text, signature) {
  const start = text.indexOf(signature);
  assert(start >= 0, `function signature not found: ${signature}`);
  const open = text.indexOf("{", start);
  assert(open >= 0, `function body not found: ${signature}`);
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    if (text[index] === "}" && --depth === 0) return text.slice(start, index + 1);
  }
  throw new Error(`unterminated function body: ${signature}`);
}
