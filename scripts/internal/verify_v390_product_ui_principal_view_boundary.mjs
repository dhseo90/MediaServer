#!/usr/bin/env node
// 파일 용도: REVIEW4-64 ProductUiPrincipalView auth/transport 역의존 제거와 HTML byte 불변을 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 REVIEW4-64 ProductUiPrincipalView boundary

Usage:
  ./server.sh verify-v390-product-ui-principal-view-boundary

Checks:
  - product UI renderer는 http_auth/auth::Principal/role helper를 포함하지 않는다
  - transport adapter만 Principal을 stable ProductUiPrincipalView로 변환한다
  - password/landing/Ops renderer 15개 HTML SHA가 변경 전 baseline과 같다
  - dependency/adapter/HTML mutation은 fail-closed로 거부된다
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const dtoPath = "include/ingress/product_ui_principal_view.h";
const authHeaderPath = "include/ingress/product_ui_auth_pages.h";
const authSourcePath = "src/ingress/product_ui_auth_pages.cpp";
const serverHeaderPath = "include/ingress/product_ui_server_pages.h";
const serverSourcePath = "src/ingress/product_ui_server_pages.cpp";
const transportPath = "src/ingress/webrtc_http_server.cpp";
const expectedHtml = new Map([
  ["landing-admin.html", [269590, "ab389a3ffb7f6bcb996233d09cd7f42a4f5aef2054dd28c2c2ecf9dff181ee38"]],
  ["landing-operator.html", [269595, "0d36bd1acf52af2e506c7b53c7a483f80be8ed9c28eb7db16edcb858ca49cf18"]],
  ["landing-viewer.html", [269466, "a7644dc7aa7081a9b86bf7a14d3efe00d689c7e9cccbd592772fcc7caa046e91"]],
  ["ops-admin-dashboard.html", [1017778, "73521c5cd33ba3e3a89a39800d8b99e0317e626686fd6c9809cc29da20fe2314"]],
  ["ops-admin-events.html", [1007629, "c372948c7f0fce9a4fffb88c5c1798e6a95b76e03931aa0659a03d6f7d2e4ee4"]],
  ["ops-admin-home.html", [979113, "232759a81744ab67044354bc596c44bf543e704f57c58f1033db594c3e039b3d"]],
  ["ops-admin-rules.html", [1014431, "b503db9c06c39a7270dc17bec586c33ec35343958906055993a3a70385cdb201"]],
  ["ops-admin-vlm.html", [988604, "a5654314d4745d66fb173a764d56db22305d1b10fa0e7dfe6129446e392391d2"]],
  ["ops-operator-dashboard.html", [1017228, "96e891758db51c100bf1dd5c4d1c3552cb72607317b1411a77155603012e6c4e"]],
  ["ops-operator-events.html", [1007079, "e56b7dd879390b33c6862ec23dbc9a79ecc13f9ad0f697a670e4e62fee37eb0d"]],
  ["ops-operator-home.html", [978563, "f009cbdcf7f584cf176736ce00875f4c988238032f96b0fea1ff8641735d4de2"]],
  ["ops-operator-rules.html", [1013881, "bb7431a2a91c7d2434fb509eda1db4a2418567bd190fc254fb359cc141c3bbec"]],
  ["ops-operator-vlm.html", [988054, "472cef03d1bc9e29e9d2b30c8c2a102c77a2e2973a64c9ddd892912dd9a99aa8"]],
  ["password-empty.html", [270280, "4190c6d87fa3218b61647b7b3e7c6186efd48642df56e3771654f3fdb0028efd"]],
  ["password-error.html", [270374, "2a8559889c305630fd4a322a30707fff16485a449034654d4a875a7170ccf3e8"]],
]);
const checks = [];
let observedHtmlCache;

check("stable ProductUiPrincipalView DTO is transport-neutral", () => {
  assert(fs.existsSync(path.join(rootDir, dtoPath)), `missing ${dtoPath}`);
  const dto = readText(dtoPath);
  for (const token of ["struct ProductUiPrincipalView", "display_name", "role", "auth_mode", "scopes", "is_admin", "can_access_ops_sources"]) {
    assert(dto.includes(token), `DTO missing ${token}`);
  }
  assert(boundaryErrors(currentBoundary()).length === 0, boundaryErrors(currentBoundary()).join("; "));
});

check("transport owns the exact Principal adapter semantics", () => {
  const transport = readText(transportPath);
  const errors = [...adapterErrors(transport), ...rendererCallSiteErrors(transport)];
  assert(errors.length === 0, errors.join("; "));
});

check("rendered auth and Ops HTML matches the pre-boundary baseline", () => {
  const errors = compareHtmlBaseline(observedHtmlDigests());
  assert(errors.length === 0, errors.join("; "));
});

check("dependency, adapter, and HTML mutations fail closed", () => {
  const base = currentBoundary();
  for (const [label, mutate] of [
    ["auth include", value => { value.authSource += '\n#include "ingress/http_auth.h"\n'; }],
    ["Principal type", value => { value.serverHeader += "\nauth::Principal leaked;\n"; }],
    ["role helper", value => { value.serverSource += "\nauth::RequireRole();\n"; }],
    ["adapter admin", value => { value.transport = value.transport.replace("view.is_admin = auth::IsAdmin(principal);", "view.is_admin = true;"); }],
    ["adapter operator", value => { value.transport = value.transport.replace('view.can_access_ops_sources = auth::RequireRole(principal, {"operator"});', "view.can_access_ops_sources = true;"); }],
    ["raw password renderer call", value => {
      value.transport = value.transport.replace(
        "ProductUiPrincipalViewFromAuthPrincipal(principal_result.principal),\n                                        \"\",",
        "principal_result.principal,\n                                        \"\",");
    }],
  ]) {
    const copy = structuredClone(base);
    mutate(copy);
    assert(boundaryErrors(copy).length > 0, `${label} mutation was accepted`);
  }
  const mutatedHtml = new Map(observedHtmlDigests());
  const [observedLength, observedDigest] = mutatedHtml.get("password-empty.html");
  const mutatedDigest = `${observedDigest[0] === "0" ? "1" : "0"}${observedDigest.slice(1)}`;
  mutatedHtml.set("password-empty.html", [observedLength + 1, mutatedDigest]);
  const mutationErrors = compareHtmlBaseline(mutatedHtml);
  assert(mutationErrors.some(error => error.startsWith("password-empty.html:")),
    "observed HTML byte/digest mutation was accepted by the baseline comparator");
});

for (const item of checks) {
  try { item.fn(); item.status = "PASS"; }
  catch (error) { item.status = "FAIL"; item.error = error.message; }
  console.log(`- ${item.status}: ${item.name}${item.error ? `: ${item.error}` : ""}`);
}
console.log(`- summary: pass=${checks.filter(item => item.status === "PASS").length} fail=${checks.filter(item => item.status === "FAIL").length}`);
if (checks.some(item => item.status === "FAIL")) process.exit(1);

function currentBoundary() {
  return {
    dto: fs.existsSync(path.join(rootDir, dtoPath)) ? readText(dtoPath) : "",
    authHeader: readText(authHeaderPath),
    authSource: readText(authSourcePath),
    serverHeader: readText(serverHeaderPath),
    serverSource: readText(serverSourcePath),
    transport: readText(transportPath),
  };
}

function boundaryErrors(value) {
  const errors = [];
  for (const [name, text] of [["auth header", value.authHeader], ["auth source", value.authSource], ["server header", value.serverHeader], ["server source", value.serverSource]]) {
    for (const forbidden of ['"ingress/http_auth.h"', "auth::Principal", "auth::RequireRole", "auth::IsAdmin"]) {
      if (text.includes(forbidden)) errors.push(`${name} retains ${forbidden}`);
    }
    if (!text.includes('"ingress/product_ui_principal_view.h"') && name.endsWith("header")) {
      errors.push(`${name} missing stable DTO include`);
    }
  }
  if (value.dto.includes("auth::") || value.dto.includes("http_auth")) errors.push("DTO depends on transport auth");
  errors.push(...adapterErrors(value.transport), ...rendererCallSiteErrors(value.transport));
  return errors;
}

function adapterErrors(transport) {
  const errors = [];
  const signature =
    "ProductUiPrincipalView ProductUiPrincipalViewFromAuthPrincipal(const auth::Principal& principal)";
  if (countOccurrences(transport, signature) !== 1) {
    errors.push("transport must contain exactly one ProductUiPrincipalView adapter definition");
    return errors;
  }
  let body;
  try {
    body = extractFunctionBody(transport, signature);
  } catch (error) {
    errors.push(error.message);
    return errors;
  }
  const declaration = "ProductUiPrincipalView view;";
  const semanticAnchors = [
    "view.display_name = principal.display_name;",
    "view.role = principal.role;",
    "view.auth_mode = principal.auth_mode;",
    "view.scopes = principal.scopes;",
    "view.is_admin = auth::IsAdmin(principal);",
    'view.can_access_ops_sources = auth::RequireRole(principal, {"operator"});',
    "return view;",
  ];
  if (countOccurrences(body, declaration) !== 1) {
    errors.push(`adapter declaration count drift: ${declaration}`);
  }
  for (const anchor of semanticAnchors) {
    if (countOccurrences(body, anchor) !== 1) {
      errors.push(`adapter semantic anchor count drift: ${anchor}`);
    }
  }
  const observedLines = body.split("\n").map(line => line.trim()).filter(Boolean);
  const expectedLines = [declaration, ...semanticAnchors];
  if (JSON.stringify(observedLines) !== JSON.stringify(expectedLines)) {
    errors.push("adapter body contains reordered, missing, or additional statements");
  }
  return errors;
}

function rendererCallSiteErrors(transport) {
  const errors = [];
  const blocks = {
    sources: sliceBetween(transport,
      "std::string BuildOpsSourcesPageHtml(const auth::Principal& principal) {",
      "std::string BuildOpsUsersPageHtml(const auth::Principal& principal) {"),
    users: sliceBetween(transport,
      "std::string BuildOpsUsersPageHtml(const auth::Principal& principal) {",
      "std::string PrincipalOwnerKey(const auth::Principal& principal) {"),
    password: sliceBetween(transport,
      'request.path == "/password/change") {',
      'if (request.method == "POST" && request.path == "/logout") {'),
    rules: sliceBetween(transport,
      'if (request.method == "GET" && request.path == "/ops/rules") {',
      'if (request.path == "/ops/api/users") {'),
    overview: sliceBetween(transport,
      "(IsOpsOverviewShellRoute(request.path) ||",
      'if (request.method == "GET" && IsClientShellRoute(request.path)) {'),
  };
  const callSites = [
    {
      id: "BuildOpsSourcesPageHtml",
      block: blocks.sources,
      exact: `AppendOpsShellStart(out,
                        ProductUiPrincipalViewFromAuthPrincipal(principal),
                        "sources",
                        "운영 채널을 관리합니다.");`,
      raw: /AppendOpsShellStart\(out,\s*principal\s*,/,
    },
    {
      id: "BuildOpsUsersPageHtml",
      block: blocks.users,
      exact: `AppendOpsShellStart(out,
                        ProductUiPrincipalViewFromAuthPrincipal(principal),
                        "users",
                        "관리자가 사용자 계정과 접근 범위를 관리합니다.");`,
      raw: /AppendOpsShellStart\(out,\s*principal\s*,/,
    },
    {
      id: "GET /password/change",
      block: blocks.password,
      exact: `PasswordChangePageHtml(
                                        ProductUiPrincipalViewFromAuthPrincipal(principal_result.principal),
                                        "",
                                        false)`,
      raw: /PasswordChangePageHtml\(\s*principal_result\.principal\s*,/,
    },
    {
      id: "POST /password/change failure",
      block: blocks.password,
      exact: `PasswordChangePageHtml(
                                                            ProductUiPrincipalViewFromAuthPrincipal(
                                                                principal_result.principal),
                                                            change_error,
                                                            true)`,
      raw: /PasswordChangePageHtml\(\s*principal_result\.principal\s*,/,
    },
    {
      id: "GET /ops/rules",
      block: blocks.rules,
      exact: `OpsShellPageHtml(config.stream_route,
                                                                     config.rtsp_listen_port,
                                                                     ProductUiPrincipalViewFromAuthPrincipal(
                                                                         principal_result.principal),
                                                                     "rules")`,
      raw: /OpsShellPageHtml\(\s*config\.stream_route,\s*config\.rtsp_listen_port,\s*principal_result\.principal\s*,/,
    },
    {
      id: "GET Ops overview/events",
      block: blocks.overview,
      exact: `OpsShellPageHtml(config.stream_route,
                                                                     config.rtsp_listen_port,
                                                                     ProductUiPrincipalViewFromAuthPrincipal(
                                                                         principal_result.principal),
                                                                     OpsOverviewActiveForPath(request.path))`,
      raw: /OpsShellPageHtml\(\s*config\.stream_route,\s*config\.rtsp_listen_port,\s*principal_result\.principal\s*,/,
    },
  ];
  for (const callSite of callSites) {
    if (countOccurrences(callSite.block, callSite.exact) !== 1 ||
        countOccurrences(transport, callSite.exact) !== 1) {
      errors.push(`${callSite.id}: exact ProductUiPrincipalView adapter call drift`);
    }
    if (callSite.raw.test(callSite.block)) {
      errors.push(`${callSite.id}: raw auth::Principal renderer argument remains`);
    }
  }
  for (const [renderer, expectedCount] of [
    ["AppendOpsShellStart(out,", 2],
    ["PasswordChangePageHtml(", 2],
    ["OpsShellPageHtml(", 2],
  ]) {
    if (countOccurrences(transport, renderer) !== expectedCount) {
      errors.push(`${renderer} transport call count drift`);
    }
  }
  const adapterReferences = countOccurrences(transport, "ProductUiPrincipalViewFromAuthPrincipal(");
  if (adapterReferences - 1 !== callSites.length) {
    errors.push(`adapter call-site count drift: expected=${callSites.length} observed=${adapterReferences - 1}`);
  }
  return errors;
}
function observedHtmlDigests() {
  if (observedHtmlCache === undefined) observedHtmlCache = renderHtmlDigests();
  return observedHtmlCache;
}

function compareHtmlBaseline(actual) {
  const errors = [];
  if (actual.size !== expectedHtml.size) errors.push(`HTML case count mismatch: ${actual.size}`);
  for (const [file, expected] of expectedHtml) {
    const observed = actual.get(file);
    if (observed === undefined) {
      errors.push(`missing rendered case ${file}`);
      continue;
    }
    if (observed[0] !== expected[0] || observed[1] !== expected[1]) {
      errors.push(`${file}: expected ${expected.join("/")} observed ${observed.join("/")}`);
    }
  }
  for (const file of actual.keys()) {
    if (!expectedHtml.has(file)) errors.push(`unexpected rendered case ${file}`);
  }
  return errors;
}

function renderHtmlDigests() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "v390-product-ui-principal-"));
  try {
    const harness = path.join(tempDir, "render.cpp");
    fs.writeFileSync(harness, `#include <fstream>\n#include <string>\n#include <utility>\n#include <vector>\n#include "ingress/product_ui_auth_pages.h"\n#include "ingress/product_ui_server_pages.h"\nusing ingress::ProductUiPrincipalView;\nProductUiPrincipalView View(std::string name,std::string role,std::string mode,std::vector<std::string> scopes,bool admin,bool ops){ProductUiPrincipalView v;v.display_name=std::move(name);v.role=std::move(role);v.auth_mode=std::move(mode);v.scopes=std::move(scopes);v.is_admin=admin;v.can_access_ops_sources=ops;return v;}\nint main(int argc,char**argv){auto a=View("Admin <A>","admin","session",{"*"},true,true);auto o=View("Operator & O","operator","session",{"ops:read","source:write"},false,true);auto v=View("Viewer V","viewer","token",{"view:read","metadata:read"},false,false);std::vector<std::pair<std::string,std::string>> x;x.push_back({"password-empty",ingress::PasswordChangePageHtml(o,"",false)});x.push_back({"password-error",ingress::PasswordChangePageHtml(o,"bad <password>",true)});x.push_back({"landing-admin",ingress::AuthLandingPageHtml(a,"Title <A>","Body & A")});x.push_back({"landing-operator",ingress::AuthLandingPageHtml(o,"Operator","Body")});x.push_back({"landing-viewer",ingress::AuthLandingPageHtml(v,"Viewer","Body")});for(const auto& active:{"home","dashboard","rules","events","vlm"}){x.push_back({std::string("ops-admin-")+active,ingress::OpsShellPageHtml("stream",8554,a,active)});x.push_back({std::string("ops-operator-")+active,ingress::OpsShellPageHtml("stream",8554,o,active)});}for(const auto& q:x){std::ofstream f(std::string(argv[1])+"/"+q.first+".html",std::ios::binary);f<<q.second;}}\n`);
    const productSources = fs.readdirSync(path.join(rootDir, "src/ingress"))
      .filter(file => file.startsWith("product_ui_") && file.endsWith(".cpp"))
      .map(file => path.join(rootDir, "src/ingress", file));
    const binary = path.join(tempDir, "render");
    const compile = spawnSync(process.env.CXX || "c++", [
      "-std=c++17", "-DMEDIA_SERVER_USE_GSTREAMER=0", `-I${path.join(rootDir, "include")}`,
      harness, ...productSources, "-o", binary,
    ], { encoding: "utf8" });
    assert(compile.status === 0, `standalone product UI compile failed: ${compile.stdout}${compile.stderr}`);
    const run = spawnSync(binary, [tempDir], { encoding: "utf8" });
    assert(run.status === 0, `standalone product UI renderer failed: ${run.stdout}${run.stderr}`);
    const result = new Map();
    for (const file of fs.readdirSync(tempDir).filter(file => file.endsWith(".html"))) {
      const bytes = fs.readFileSync(path.join(tempDir, file));
      result.set(file, [bytes.length, sha256(bytes)]);
    }
    return result;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function check(name, fn) { checks.push({ name, fn }); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function readText(file) { return fs.readFileSync(path.join(rootDir, file), "utf8"); }
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function countOccurrences(text, token) { return text.split(token).length - 1; }

function sliceBetween(text, startToken, endToken) {
  const start = text.indexOf(startToken);
  assert(start >= 0, `slice start not found: ${startToken}`);
  const end = text.indexOf(endToken, start + startToken.length);
  assert(end > start, `slice end not found: ${endToken}`);
  return text.slice(start, end);
}

function extractFunctionBody(text, signature) {
  const signatureStart = text.indexOf(signature);
  assert(signatureStart >= 0, `function signature not found: ${signature}`);
  const open = text.indexOf("{", signatureStart + signature.length);
  assert(open >= 0, `function body start not found: ${signature}`);
  let depth = 0;
  for (let index = open; index < text.length; ++index) {
    if (text[index] === "{") ++depth;
    if (text[index] === "}") {
      --depth;
      if (depth === 0) return text.slice(open + 1, index);
    }
  }
  throw new Error(`function body end not found: ${signature}`);
}
