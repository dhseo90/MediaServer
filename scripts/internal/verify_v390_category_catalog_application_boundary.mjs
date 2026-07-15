#!/usr/bin/env node
// REVIEW4-64 Slice 18: transport category catalog through a dependency-free application boundary.

import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const args = process.argv.slice(2);
if (hasHelpFlag(args)) printUsageAndExit(`V390 category catalog application boundary verification

Usage:
  ./server.sh verify-v390-category-catalog-application-boundary
`);
assertKnownOptions(args, ["h", "help"]);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const exists = file => fs.existsSync(path.join(root, file));
const headerPath = "include/ingress/category_catalog_application_service.h";
const sourcePath = "src/ingress/category_catalog_application_service.cpp";
const detailPath = "src/ingress/webrtc_http_server_detail.h";
const serverPath = "src/ingress/webrtc_http_server.cpp";
const fields = ["token", "label_ko", "hint", "group", "aliases", "labels", "display_labels_ko"];
const transportFiles = [
  "include/ingress/http_auth.h", "include/ingress/webrtc_http_runtime_config.h",
  "src/ingress/http_auth.cpp", "include/ingress/webrtc_http_server.h",
  "src/ingress/webrtc_http_server.cpp", "src/ingress/webrtc_http_server_ops_foundation.cpp",
  "src/ingress/webrtc_http_server_ops_workflows.cpp", "src/ingress/webrtc_http_server_ops_incidents.cpp",
  "src/ingress/webrtc_http_server_runtime.cpp", "src/ingress/webrtc_http_server_detail.h",
];
const expectedCatalogJsonSha256 = "5acfa1e522bc627763073d208b3b71be5c02f19f7ebfd6eadc2773ade5ed43fe";
const checks = [];
function assert(value, message) { if (!value) throw new Error(message); }
function check(name, fn) { try { fn(); checks.push({name,status:"PASS"}); } catch (error) { checks.push({name,status:"FAIL",detail:error.message}); } }

check("dependency-free category DTO is exact", () => {
  assert(exists(headerPath), `${headerPath} missing`);
  const header = read(headerPath);
  const includes = [...header.matchAll(/^\s*#\s*include\s*([<"][^>"]+[>"])/gm)].map(match => match[1]);
  assert(JSON.stringify(includes) === JSON.stringify(["<string>", "<vector>"]), "header include set drift");
  assert(!/\banalysis::|CategoryTokenInfo/.test(header), "analysis type leaked into public DTO");
  const declared = [...header.matchAll(/^\s*(?:std::string|std::vector<std::string>)\s+([A-Za-z_]\w*)\s*;/gm)].map(match => match[1]);
  assert(JSON.stringify(declared) === JSON.stringify(fields), "category DTO field order/count drift");
});

check("application implementation maps every canonical field", () => {
  assert(exists(sourcePath), `${sourcePath} missing`);
  const source = read(sourcePath);
  assert(source.includes('#include "analysis/category_tokens.h"') && source.includes("analysis::CategoryTokenCatalog()"),
    "canonical catalog delegation missing");
  const mapped = [...source.matchAll(/\boutput\.([A-Za-z_]\w*)\s*=\s*item\.([A-Za-z_]\w*)\s*;/g)]
    .map(match => [match[1], match[2]]);
  assert(JSON.stringify(mapped) === JSON.stringify(fields.map(field => [field, field])), "category mapping drift");
  for (const key of ["value", "label", "hint", "group", "aliases", "labels", "displayLabels"]) {
    assert(source.includes(`\\\"${key}\\\"`), `category JSON key missing: ${key}`);
  }
});

check("transport consumes only application category catalog", () => {
  const detail = read(detailPath);
  const server = read(serverPath);
  assert(detail.includes('#include "ingress/category_catalog_application_service.h"') &&
    !detail.includes('#include "analysis/category_tokens.h"'), "transport include owner drift");
  assert(server.includes("CategoryCatalogJson()") && !server.includes("CategoryCatalog()") &&
    !server.includes("AnalysisCategoryCatalogJson()"), "transport route does not consume final application JSON bytes");
  for (const file of transportFiles) {
    const text = read(file);
    assert(!text.includes('#include "analysis/category_tokens.h"') &&
      !/\banalysis::CategoryTokenCatalog\s*\(/.test(text) && !/\bCategoryTokenInfo\b/.test(text),
    `transport direct category dependency remains: ${file}`);
  }
});

check("compiled catalog parity and exact route bytes are exact", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "v390-category-catalog-"));
  try {
    const harness = path.join(temp, "harness.cpp");
    const binary = path.join(temp, "harness");
    fs.writeFileSync(harness, `#include "analysis/category_tokens.h"\n#include "ingress/category_catalog_application_service.h"\n#include <cstdlib>\n#include <iostream>\nint main(){const auto& a=analysis::CategoryTokenCatalog();const auto b=ingress::CategoryCatalog();if(a.size()!=b.size()||a.size()!=10)return 1;for(size_t i=0;i<a.size();++i){if(a[i].token!=b[i].token||a[i].label_ko!=b[i].label_ko||a[i].hint!=b[i].hint||a[i].group!=b[i].group||a[i].aliases!=b[i].aliases||a[i].labels!=b[i].labels||a[i].display_labels_ko!=b[i].display_labels_ko)return 2;}std::cout<<ingress::CategoryCatalogJson();return 0;}\n`);
    execFileSync(process.env.CXX || "c++", ["-std=c++17", `-I${path.join(root,"include")}`,
      path.join(root,"src/analysis/category_tokens.cpp"), path.join(root,sourcePath), harness, "-o", binary]);
    const bytes = execFileSync(binary, {encoding:"utf8"});
    const digest = crypto.createHash("sha256").update(bytes).digest("hex");
    assert(digest === expectedCatalogJsonSha256, `category JSON byte digest drift: ${digest}`);
    const decoded = JSON.parse(bytes);
    assert(decoded.length === 10 && decoded.every(item =>
      JSON.stringify(Object.keys(item)) === JSON.stringify([
        "value", "label", "hint", "group", "aliases", "labels", "displayLabels",
      ])), "category JSON order/key schema drift");
  } finally { fs.rmSync(temp, {recursive:true,force:true}); }
});

check("CMake and exact graph successor bind Slice 18", () => {
  const cmake = read("CMakeLists.txt");
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  assert(cmake.split(sourcePath).length - 1 === 1, "CMake source exact-once binding missing");
  const owner = graph.moduleClassifiers.find(item => item.id === "application-service-interfaces");
  assert(owner?.exactFiles.includes(headerPath) && owner.exactFiles.includes(sourcePath) &&
    owner.expectedFileCount === 23 && owner.expectedCppCount === 9, "application owner successor drift");
  const edge = direction => graph.observedModuleEdges.find(item => item.direction === direction);
  const exactEdges = {
    "transport-and-auth-adapter -> analysis-services": [13, false, "2a57a73c7b95d0ff5afe52fff4af915ce8a99a0ab1ce96a1cf2ca24eff378233"],
    "application-service-interfaces -> analysis-services": [6, true, "01462553c675fb8de7829bf128aa059679c3950f2f532209d495010e9c995251"],
    "transport-and-auth-adapter -> application-service-interfaces": [12, true, "cb40c1b772183f109c5a5cf7522303b1c102d59ad2c6a46449ef684046e64d34"],
  };
  assert(graph.expectedProductionFiles === 188 && graph.expectedCppFiles === 92 &&
    graph.observedModuleEdges.length === 17 && graph.observedModuleEdges.filter(item => !item.allowedByTarget).length === 3 &&
    graph.stronglyConnectedComponents.length === 0 &&
    edge("transport-and-auth-adapter -> analysis-services")?.witnessCount === 13 &&
    edge("application-service-interfaces -> analysis-services")?.witnessCount === 6 &&
    edge("transport-and-auth-adapter -> application-service-interfaces")?.witnessCount === 12,
  "exact graph successor drift");
  for (const [direction, [count, allowed, witnessSha256]] of Object.entries(exactEdges)) {
    const item = edge(direction);
    assert(item?.witnessCount === count && item.allowedByTarget === allowed &&
      item.witnessSha256 === witnessSha256, `exact graph edge drift: ${direction}`);
  }
  for (const [direction, field] of [
    ["transport-and-auth-adapter -> analysis-services", "witnessCount"],
    ["application-service-interfaces -> analysis-services", "witnessSha256"],
    ["transport-and-auth-adapter -> application-service-interfaces", "allowedByTarget"],
  ]) {
    const mutated = structuredClone(graph);
    const item = mutated.observedModuleEdges.find(value => value.direction === direction);
    item[field] = field === "witnessCount" ? item[field] + 1 : field === "allowedByTarget" ? !item[field] : "0".repeat(64);
    let rejected = false;
    try {
      const expected = exactEdges[direction];
      const value = mutated.observedModuleEdges.find(edgeValue => edgeValue.direction === direction);
      assert(value.witnessCount === expected[0] && value.allowedByTarget === expected[1] &&
        value.witnessSha256 === expected[2], "mutation accepted");
    } catch { rejected = true; }
    assert(rejected, `graph mutation was not rejected: ${direction}/${field}`);
  }
});

for (const item of checks) console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const failed = checks.filter(item => item.status === "FAIL").length;
console.log(`- summary: pass=${checks.length-failed} fail=${failed}`);
process.exit(failed ? 1 : 0);
