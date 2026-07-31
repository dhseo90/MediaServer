#!/usr/bin/env node
// 파일 용도: REVIEW4-64 Slice 15 transport strict-JSON 사용의 semantic application service 경계를 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 strict JSON service boundary verification

Usage:
  ./server.sh verify-v390-strict-json-service-boundary

Checks:
  - transport의 domain/strict_json.h 및 StrictJson* 직접 사용 제거
  - dependency-light opaque VlmProfileJsonDocument API와 parse 상태 계약
  - domain strict JSON 구현은 VLM profile application-service implementation TU에만 한정
  - CMake/owner/current graph 215/103/16/0/SCC0 및 transport-domain witness 제거
  - umbrella/re-export, relabel, alias, source-text hiding, policy exception mutation 차단
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(rootDir, file), "utf8");
const exists = file => fs.existsSync(path.join(rootDir, file));
const sha256Text = value => crypto.createHash("sha256").update(value).digest("hex");
const checks = [];
const headerPath = "include/ingress/vlm_profile_json_document.h";
const sourcePath = "src/ingress/vlm_profile_json_document.cpp";
const graphPath = "test/fixtures/v390_structure_stabilization_current_graph.json";
const policyPath = "test/fixtures/v390_structure_stabilization_current_architecture_policy.json";
const oldTransportDomainWitnessSha256 = "6df2676b1f737db68766f0c9fccd4b3df7f5ea5af41706e6f8585d4e5fa51f57";
const transportFiles = [
  "include/ingress/http_auth.h",
  "include/ingress/webrtc_http_runtime_config.h",
  "src/ingress/http_auth.cpp",
  "include/ingress/webrtc_http_server.h",
  "src/ingress/webrtc_http_server.cpp",
  "src/ingress/webrtc_http_server_ops_foundation.cpp",
  "src/ingress/webrtc_http_server_ops_workflows.cpp",
  "src/ingress/webrtc_http_server_ops_incidents.cpp",
  "src/ingress/webrtc_http_server_runtime.cpp",
  "src/ingress/webrtc_http_server_detail.h",
];
const currentTransportFiles = [
  ...transportFiles,
  "include/ingress/webrtc_http_analysis_rule_declarations.h",
];

function assert(condition, message) { if (!condition) throw new Error(message); }
function check(name, fn) {
  try { fn(); checks.push({ name, status: "PASS" }); }
  catch (error) { checks.push({ name, status: "FAIL", detail: error.message }); }
}
function stripCppComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}
function count(text, pattern) { return [...text.matchAll(pattern)].length; }

function inspectTransport(overrides = new Map()) {
  const errors = [];
  for (const file of transportFiles) {
    const text = stripCppComments(overrides.get(file) ?? read(file));
    if (/^\s*#\s*include\s*["<](?:domain\/)?strict_json\.h[">]/m.test(text))
      errors.push(`transport:strict-json-include:${file}`);
    if (/\b(?:domain::)?StrictJson[A-Za-z0-9_]*\b|\bParseStrictJson[A-Za-z0-9_]*\b/.test(text))
      errors.push(`transport:strict-json-symbol-or-alias:${file}`);
    if (/\b(?:using|typedef|#\s*define)\b[^\n;]*(?:StrictJson|ParseStrictJson)/.test(text))
      errors.push(`transport:strict-json-text-hiding:${file}`);
  }
  const bundle = transportFiles.map(file => overrides.get(file) ?? read(file)).join("\n");
  if (!bundle.includes('#include "ingress/vlm_profile_json_document.h"'))
    errors.push("transport:semantic-service-not-consumed");
  for (const operation of [
    "VlmProfileJsonDocument::Parse(",
    ".ContainsKey(",
    ".HasTopLevelField(",
    ".FieldIsNull(",
    ".StringField(",
    ".BoolField(",
    ".ObjectField(",
  ]) if (!bundle.includes(operation)) errors.push(`transport:semantic-operation:${operation}`);
  return errors;
}

function inspectHeader(text) {
  const errors = [];
  const code = stripCppComments(text);
  if (/^\s*#\s*include\s*"/m.test(code) || /\b(?:domain|analysis|core|app)::/.test(code))
    errors.push("header:non-standard-dependency");
  if (/\b(?:StrictJson|ParseStrictJson|StrictJsonObjectDocument)\b/.test(code))
    errors.push("header:raw-json-re-export-or-alias");
  if (!/class\s+VlmProfileJsonDocument\s*\{/.test(code) ||
      !/private:\s*struct\s+State\s*;/s.test(code) ||
      !/std::shared_ptr<const State>\s+state_\s*;/s.test(code))
    errors.push("header:opaque-state-contract");
  for (const declaration of [
    /static\s+bool\s+Parse\s*\(\s*const std::string&\s+body\s*,\s*VlmProfileJsonDocument\*\s+document\s*,\s*std::string\*\s+error_message\s*\)/s,
    /bool\s+ContainsKey\s*\(\s*const std::string&\s+key\s*\)\s*const/s,
    /bool\s+HasTopLevelField\s*\(\s*const std::string&\s+key\s*\)\s*const/s,
    /bool\s+FieldIsNull\s*\(\s*const std::string&\s+key\s*\)\s*const/s,
    /std::optional<std::string>\s+StringField\s*\(\s*const std::string&\s+key\s*\)\s*const/s,
    /std::optional<bool>\s+BoolField\s*\(\s*const std::string&\s+key\s*\)\s*const/s,
    /std::optional<std::string>\s+ObjectField\s*\(\s*const std::string&\s+key\s*\)\s*const/s,
  ]) if (!declaration.test(code)) errors.push(`header:semantic-api:${declaration}`);
  return errors;
}

function inspectImplementation(text) {
  const errors = [];
  if (count(text, /^\s*#\s*include\s*"domain\/strict_json\.h"/gm) !== 1)
    errors.push("source:exact-domain-include");
  for (const semanticAnchor of [
    "struct VlmProfileJsonDocument::State",
    "StrictJsonObjectDocument document;",
    "if (document == nullptr)",
    "VLM profile JSON output document is required",
    "if (!ParseStrictJsonObjectDocument(body, &state->document, error_message))",
    "*document = VlmProfileJsonDocument();",
    "*document = VlmProfileJsonDocument(std::move(state));",
    "state_ != nullptr && StrictJsonContainsKey(state_->document, key)",
    "state_ != nullptr && StrictJsonHasTopLevelField(state_->document, key)",
    "state_ != nullptr && StrictJsonFieldIsNull(state_->document, key)",
    "return StrictJsonStringField(state_->document, key);",
    "return StrictJsonBoolField(state_->document, key);",
    "return StrictJsonObjectField(state_->document, key);",
  ]) if (!text.includes(semanticAnchor)) errors.push(`source:behavior-anchor:${semanticAnchor}`);
  if (count(text, /\b(?:ParseStrictJson|StrictJson)[A-Za-z0-9_]*\s*\(/g) !== 7)
    errors.push("source:exact-seven-strict-delegations");
  return errors;
}

function runSemanticHarness() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "v390-vlm-profile-json-document-"));
  const harnessPath = path.join(tempDir, "main.cpp");
  const binaryPath = path.join(tempDir, "verify");
  const harness = String.raw`#include "ingress/vlm_profile_json_document.h"
#include <iostream>
#include <string>

int main() {
    ingress::VlmProfileJsonDocument document;
    std::string error;
    const std::string valid =
        R"({"name":"camera","enabled":true,"missing":null,"nested":{"secret":"x"}})";
    if (!ingress::VlmProfileJsonDocument::Parse(valid, &document, &error)) return 1;
    if (document.StringField("name").value_or("") != "camera") return 2;
    if (!document.BoolField("enabled").value_or(false)) return 3;
    if (!document.FieldIsNull("missing")) return 4;
    if (!document.ContainsKey("secret") || document.HasTopLevelField("secret")) return 5;
    if (!document.HasTopLevelField("nested") || !document.ObjectField("nested").has_value()) return 6;
    if (document.StringField("enabled").has_value()) return 7;
    for (const std::string invalid : {
             std::string(R"({"id":"a","id":"b"})"),
             std::string(R"({"nested":{"id":"a","id":"b"}})"),
             std::string(R"({"id":"a"} trailing)"),
         }) {
        ingress::VlmProfileJsonDocument rejected;
        if (ingress::VlmProfileJsonDocument::Parse(invalid, &rejected, &error)) return 8;
    }
    if (ingress::VlmProfileJsonDocument::Parse("{}", nullptr, &error)) return 9;
    if (error != "VLM profile JSON output document is required") return 10;
    if (ingress::VlmProfileJsonDocument::Parse(R"({"id":"a","id":"b"})", &document, &error)) return 11;
    if (document.ContainsKey("name") || document.StringField("name").has_value()) return 12;
    std::cout << "semantic-ok\n";
    return 0;
}
`;
  try {
    fs.writeFileSync(harnessPath, harness);
    execFileSync(process.env.CXX || "c++", [
      "-std=c++17",
      "-I", path.join(rootDir, "include"),
      harnessPath,
      path.join(rootDir, sourcePath),
      path.join(rootDir, "src/domain/strict_json.cpp"),
      "-o", binaryPath,
    ], { cwd: rootDir, stdio: "pipe" });
    const output = execFileSync(binaryPath, [], { cwd: rootDir, encoding: "utf8" }).trim();
    assert(output === "semantic-ok", "semantic harness output mismatch");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function classifyModule(file, classifiers) {
  for (const item of classifiers) {
    if (item.exactFiles.includes(file) || item.prefixes.some(prefix => file.startsWith(prefix)))
      return item.id;
  }
  throw new Error(`unclassified production file: ${file}`);
}

function walkProduction(graph) {
  const files = [];
  const visit = directory => {
    for (const entry of fs.readdirSync(path.join(rootDir, directory), { withFileTypes: true })) {
      const relative = path.posix.join(directory, entry.name);
      if (entry.isDirectory()) visit(relative);
      else if (graph.sourceExtensions.some(extension => relative.endsWith(extension))) files.push(relative);
    }
  };
  for (const root of graph.productionRoots) visit(root);
  return files.sort();
}

function collectObservedEdges(graph, policy) {
  const files = walkProduction(graph);
  const fileSet = new Set(files);
  const owner = new Map(files.map(file => [file, classifyModule(file, graph.moduleClassifiers)]));
  const grouped = new Map();
  for (const source of files) {
    for (const match of read(source).matchAll(/^\s*#\s*include\s*["<]([^">]+)[">]/gm)) {
      const include = match[1];
      const candidates = [
        path.posix.normalize(path.posix.join(path.posix.dirname(source), include)),
        `include/${include}`,
        `src/${include}`,
      ];
      const resolved = candidates.find(candidate => fileSet.has(candidate));
      if (!resolved || owner.get(source) === owner.get(resolved)) continue;
      const direction = `${owner.get(source)} -> ${owner.get(resolved)}`;
      if (!grouped.has(direction)) grouped.set(direction, []);
      grouped.get(direction).push(`${source} -> ${resolved}`);
    }
  }
  const allowed = new Set(policy.allowedDependencyDirections);
  return [...grouped.entries()].sort(([lhs], [rhs]) => lhs.localeCompare(rhs)).map(([direction, witnesses]) => {
    const sorted = [...witnesses].sort();
    return { direction, witnessCount: sorted.length,
      witnessSha256: sha256Text(sorted.join("\n")), allowedByTarget: allowed.has(direction) };
  });
}

function inspectOwnersAndGraph(graph, policy) {
  const errors = [];
  const transport = graph.moduleClassifiers.find(item => item.id === "transport-and-auth-adapter");
  const appService = graph.moduleClassifiers.find(item => item.id === "application-service-interfaces");
  if (!transport || transport.expectedFileCount !== 11 || transport.expectedCppCount !== 6 ||
      transport.prefixes.length !== 0 ||
      JSON.stringify([...transport.exactFiles].sort()) !== JSON.stringify([...currentTransportFiles].sort()))
    errors.push("graph:transport-owner-exact-11");
  if (!appService || appService.expectedFileCount !== 48 || appService.expectedCppCount !== 19 ||
      !appService.exactFiles.includes(headerPath) || !appService.exactFiles.includes(sourcePath) ||
      appService.prefixes.length !== 0)
    errors.push("graph:application-service-owner-current-exact");
  const edge = graph.observedModuleEdges.find(item =>
    item.direction === "transport-and-auth-adapter -> domain-and-registry-owners");
  if (edge || graph.observedModuleEdges.some(item =>
      item.witnessSha256 === oldTransportDomainWitnessSha256))
    errors.push("graph:transport-domain-witness-not-removed");
  const actualEdges = collectObservedEdges(graph, policy);
  if (JSON.stringify(actualEdges) !== JSON.stringify(graph.observedModuleEdges))
    errors.push("graph:stored-edge-or-digest-drift");
  const violations = graph.observedModuleEdges.filter(item => item.allowedByTarget === false);
  if (graph.expectedProductionFiles !== 215 || graph.expectedCppFiles !== 103 ||
      graph.observedModuleEdges.length !== 16 || violations.length !== 0 ||
      graph.stronglyConnectedComponents.length !== 0)
    errors.push(`graph:metrics:${graph.expectedProductionFiles}/${graph.expectedCppFiles}/` +
      `${graph.observedModuleEdges.length}/${violations.length}/${graph.stronglyConnectedComponents.length}`);
  return errors;
}

function inspectPolicy(policy) {
  const errors = [];
  const direction = "transport-and-auth-adapter -> domain-and-registry-owners";
  if (policy.allowedDependencyDirections.includes(direction)) errors.push("policy:hidden-in-allowlist");
  if ((policy.temporaryDebtExceptions || []).some(item => item.direction === direction))
    errors.push("policy:temporary-exception");
  return errors;
}

check("transport consumes the semantic VLM profile service without strict JSON", () => {
  const errors = inspectTransport();
  assert(errors.length === 0, errors.join(", "));
});

check("strict JSON service exposes a dependency-light semantic contract", () => {
  assert(exists(headerPath), `${headerPath} is missing`);
  const errors = inspectHeader(read(headerPath));
  assert(errors.length === 0, errors.join(", "));
});

check("application service implementation owns concrete strict JSON behavior", () => {
  assert(exists(sourcePath), `${sourcePath} is missing`);
  const errors = inspectImplementation(read(sourcePath));
  assert(errors.length === 0, errors.join(", "));
  runSemanticHarness();
});

check("CMake, owners and graph reduce only the transport domain witness", () => {
  const cmake = read("CMakeLists.txt");
  assert(count(cmake, /src\/ingress\/vlm_profile_json_document\.cpp/g) === 1,
    "vlm_profile_json_document.cpp must appear exactly once in CMake");
  const graph = JSON.parse(read(graphPath));
  const policy = JSON.parse(read(policyPath));
  const errors = [...inspectOwnersAndGraph(graph, policy), ...inspectPolicy(policy)];
  assert(errors.length === 0, errors.join(", "));
});

check("umbrella, alias, relabel, source hiding and policy mutations fail closed", () => {
  const transportMutation = new Map([["src/ingress/webrtc_http_server_runtime.cpp",
    `${read("src/ingress/webrtc_http_server_runtime.cpp")}\nusing HiddenDocument = StrictJsonObjectDocument;\n`]]);
  assert(inspectTransport(transportMutation).some(error => error.includes("symbol-or-alias")),
    "transport alias mutation escaped");
  const header = read(headerPath);
  assert(inspectHeader(header.replace("#include <string>", '#include "domain/strict_json.h"'))
    .includes("header:non-standard-dependency"), "umbrella include mutation escaped");
  assert(inspectHeader(`${header}\nusing PublicJson = StrictJsonObjectDocument;\n`)
    .includes("header:raw-json-re-export-or-alias"), "raw alias mutation escaped");
  const source = read(sourcePath);
  assert(inspectImplementation(source.replace("if (document == nullptr)", "if (false)"))
    .includes("source:behavior-anchor:if (document == nullptr)"), "null output mutation escaped");
  assert(inspectImplementation(source.replace("*document = VlmProfileJsonDocument();", "return false;"))
    .includes("source:behavior-anchor:*document = VlmProfileJsonDocument();"),
  "failed-parse reset mutation escaped");
  const graph = JSON.parse(read(graphPath));
  graph.moduleClassifiers.find(item => item.id === "transport-and-auth-adapter").exactFiles =
    graph.moduleClassifiers.find(item => item.id === "transport-and-auth-adapter").exactFiles
      .filter(file => file !== "src/ingress/webrtc_http_server_runtime.cpp");
  graph.moduleClassifiers.find(item => item.id === "application-service-interfaces").exactFiles.push(
    "src/ingress/webrtc_http_server_runtime.cpp");
  const policy = JSON.parse(read(policyPath));
  let relabelRejected = false;
  try { relabelRejected = inspectOwnersAndGraph(graph, policy).length > 0; } catch { relabelRejected = true; }
  assert(relabelRejected, "classifier relabel mutation escaped");
  policy.temporaryDebtExceptions.push({ direction: "transport-and-auth-adapter -> domain-and-registry-owners",
    reason: "mutation", countsAsTargetViolation: false });
  assert(inspectPolicy(policy).includes("policy:temporary-exception"), "policy exception mutation escaped");
});

for (const item of checks) {
  console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
}
const passed = checks.filter(item => item.status === "PASS").length;
const failed = checks.length - passed;
console.log(`- summary: pass=${passed} fail=${failed}`);
process.exit(failed === 0 ? 0 : 1);
