#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
import { copyWebRtcHttpServerSourceFixture } from "./webrtc_http_server_source_bundle.mjs";
// REVIEW4-64 Slice 9: public contract/interface owner realignment verifier.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 public contract/interface owner verification

Usage:
  ./server.sh verify-v390-public-contract-interface-owner
`);
}
assertKnownOptions(rawArgs, ["h", "help", "fixture-root", "skip-mutations"]);

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), "../..");
const skipMutations = rawArgs.includes("--skip-mutations");
const fixtureArg = rawArgs.find(arg => arg.startsWith("--fixture-root="));
const sourceRoot = fixtureArg ? validateFixtureRoot(fixtureArg.slice("--fixture-root=".length)) : rootDir;
const read = file => fs.readFileSync(path.join(sourceRoot, file), "utf8");
const sha256Text = text => crypto.createHash("sha256").update(text).digest("hex");
const sha256 = file => sha256Text(read(file));
const checks = [];

function validateFixtureRoot(value) {
  if (!skipMutations) throw new Error("--fixture-root requires --skip-mutations");
  const resolved = fs.realpathSync(path.resolve(value));
  const tempRoot = `${fs.realpathSync(os.tmpdir())}${path.sep}`;
  if (!resolved.startsWith(tempRoot)) throw new Error("fixture root must stay under the system temp directory");
  return resolved;
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function check(name, fn) {
  try { fn(); checks.push({ name, status: "PASS" }); }
  catch (error) { checks.push({ name, status: "FAIL", detail: error.message }); }
}

const immutableContracts = new Map([
  ["include/domain/strict_json.h", "08afb593177919101fda06cd16ba75e8e586f4c05137479f1196a8a10bba479a"],
  ["include/ingress/onvif_credential_provider.h", "8407d3d3ff57d4dc01f75be71046d16315ca074aa1bed2882084edcac4c830ff"],
  ["include/ingress/ops_action_execution_deferral.h", "6ddd2810b51493fb5f8523590a50f123090f9cb0e15fb07a462aea7327425a36"],
  ["include/ingress/ops_event_route_owner.h", "6b8e46250fbe53f2805332378fe2032c61145c0a4e24a4974f0748d91cfd2d7b"],
  ["include/ingress/vlm_evaluation_promotion.h", "2df6a93b9a9c2485daddf5e9f86c2eeba024cf3526d3c8d6721be87ea876a599"],
  ["include/ingress/product_ui_action_execution_deferral.h", "b2f74a240835e7e68431d59a3ad622d3b9c19321a909355c0d3d8cc6aa11dacd"],
  ["include/ingress/product_ui_assets.h", "57cd7f878fbb02fbf5961aa4cbdb32bd6a578af771ba54ed334bcb8872437278"],
  ["include/ingress/product_ui_auth_pages.h", "f27b9e8cfa6dd830c4dfc525e62d4522c2c0c0ddfb1b4bd3b8765160b902692a"],
  ["include/ingress/product_ui_components.h", "8775e7fc7a2ae783575168749f429e81b7ba409db81e49f5823eb023f09b4cc6"],
  ["include/ingress/product_ui_css.h", "1841030dce952ca62a816f0db1ef4e1d961dad48f35ea9f19579b9e45d2377c1"],
  ["include/ingress/product_ui_js.h", "f61abbc1aefe1b3bb0d4b2a1ed7515849f93e8080964fd8ed41a65d3c07c4752"],
  ["include/ingress/product_ui_page_scripts.h", "1371aae21b92dc0d1c19a87511b8cd4429167bfb09c8c8979845a629bcd3195d"],
  ["include/ingress/product_ui_server_pages.h", "e52bd34e04bc21eceab75b05244e0c2c193a72da5c5e91ace3497aaf85318635"],
]);

const stableHeaders = [
  "include/ingress/product_ui_principal_view.h",
  "include/ingress/product_ui_action_execution_deferral.h",
  "include/ingress/product_ui_assets.h",
  "include/ingress/product_ui_auth_pages.h",
  "include/ingress/product_ui_components.h",
  "include/ingress/product_ui_css.h",
  "include/ingress/product_ui_js.h",
  "include/ingress/product_ui_page_scripts.h",
  "include/ingress/product_ui_server_pages.h",
];
const applicationFiles = [
  "include/ingress/application_service_result.h",
  "include/ingress/analysis_rule_application_service.h", "src/ingress/analysis_rule_application_service.cpp",
  "include/ingress/appearance_readiness_application_service.h", "src/ingress/appearance_readiness_application_service.cpp",
  "include/ingress/category_catalog_application_service.h", "src/ingress/category_catalog_application_service.cpp",
  "include/ingress/incident_memory_application_service.h", "src/ingress/incident_memory_application_service.cpp",
  "include/ingress/event_post_application_service.h", "src/ingress/event_post_application_service.cpp",
  "include/ingress/image_codec_application_service.h", "src/ingress/image_codec_application_service.cpp",
  "include/ingress/vlm_observation_application_service.h", "src/ingress/vlm_observation_application_service.cpp",
  "include/ingress/onvif_live_import.h", "src/ingress/onvif_live_import.cpp",
  "include/ingress/source_view_application_service.h", "src/ingress/source_view_application_service.cpp",
  "include/ingress/vlm_incident_rule_provenance.h", "src/ingress/vlm_incident_rule_provenance.cpp",
  "include/ingress/vlm_profile_json_document.h", "src/ingress/vlm_profile_json_document.cpp",
  "include/ingress/onvif_credential_provider.h",
  "include/ingress/ops_action_execution_deferral.h",
  "include/ingress/ops_event_route_owner.h",
  "include/ingress/vlm_evaluation_promotion.h",
];
const domainFiles = [
  "include/ingress/analysis_rule_registry.h", "src/ingress/analysis_rule_registry.cpp",
  "include/ingress/source_view_registry.h",
  "src/ingress/source_view_registry.cpp", "include/domain/strict_json.h", "src/domain/strict_json.cpp",
];
const opsImplementationFiles = [
  "src/ingress/ops_action_execution_deferral.cpp", "src/ingress/onvif_credential_provider.cpp",
  "src/ingress/ops_event_route_owner.cpp", "src/ingress/vlm_evaluation_promotion.cpp",
];
const expectedDirections = [
  "analysis-services -> core-media-interfaces",
  "analysis-services -> domain-and-registry-owners", "application-service-interfaces -> analysis-services",
  "application-service-interfaces -> domain-and-registry-owners", "composition-root -> analysis-services",
  "composition-root -> core-media-interfaces", "composition-root -> core-utilities",
  "composition-root -> transport-and-auth-adapter", "core-media-interfaces -> core-utilities",
  "domain-and-registry-owners -> core-utilities",
  "ops-route-groups -> application-service-interfaces", "product-ui-workspaces -> stable-contract-dtos",
  "transport-and-auth-adapter -> analysis-services", "transport-and-auth-adapter -> application-service-interfaces",
  "transport-and-auth-adapter -> core-media-interfaces", "transport-and-auth-adapter -> stable-contract-dtos",
];

check("public contract bytes stay unchanged", () => {
  for (const [file, expected] of immutableContracts) assert(sha256(file) === expected, `contract bytes drift: ${file}`);
  const strictSource = read("src/domain/strict_json.cpp")
    .replace('#include "domain/strict_json.h"', '#include "core/strict_json.h"');
  assert(sha256Text(strictSource) === "9371131f84ebe1d6e2a656d6e3eebd40b75c6ea86fe662e8fe623a0ff536ac5a",
    "strict JSON parser implementation drift");
});

check("interface and implementation owners are exact", () => {
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const owner = id => graph.moduleClassifiers.find(item => item.id === id);
  const exact = id => [...owner(id).exactFiles].sort();
  assert(JSON.stringify(exact("stable-contract-dtos")) === JSON.stringify([...stableHeaders].sort()) &&
    owner("stable-contract-dtos").expectedFileCount === 9 && owner("stable-contract-dtos").expectedCppCount === 0,
  "stable public contract owner drift");
  assert(JSON.stringify(exact("application-service-interfaces")) === JSON.stringify([...applicationFiles].sort()) &&
    owner("application-service-interfaces").expectedFileCount === 27 &&
    owner("application-service-interfaces").expectedCppCount === 11,
  "application public interface owner drift");
  assert(JSON.stringify(exact("domain-and-registry-owners")) === JSON.stringify([...domainFiles].sort()) &&
    owner("domain-and-registry-owners").expectedFileCount === 6 &&
    owner("domain-and-registry-owners").expectedCppCount === 3,
  "strict JSON domain owner drift");
  assert(JSON.stringify(exact("ops-route-groups")) === JSON.stringify([...opsImplementationFiles].sort()) &&
    owner("ops-route-groups").expectedFileCount === 4 && owner("ops-route-groups").expectedCppCount === 4,
  "Ops implementation owner drift");
  assert(owner("product-ui-workspaces").expectedFileCount === 12 &&
    owner("product-ui-workspaces").expectedCppCount === 12,
  "product UI implementation owner drift");
  assert(owner("core-utilities").expectedFileCount === 15 && owner("core-utilities").expectedCppCount === 5 &&
    !owner("core-utilities").exactFiles.some(file => file.includes("strict_json")),
  "core utility retained strict JSON ownership");
});

check("public headers remain dependency-neutral", () => {
  for (const file of stableHeaders) {
    const includes = [...read(file).matchAll(/^\s*#\s*include\s*"([^"]+)"/gm)].map(match => match[1]);
    assert(includes.every(include => include === "ingress/product_ui_principal_view.h"),
      `public header gained a non-stable production include: ${file}`);
  }
  const applicationIncludes = new Map([
    ["include/ingress/onvif_live_import.h", [
      "ingress/onvif_credential_provider.h", "ingress/application_service_result.h",
    ]],
    ["include/ingress/application_service_result.h", []],
    ["include/ingress/source_view_application_service.h", ["ingress/application_service_result.h"]],
    ["include/ingress/vlm_incident_rule_provenance.h", []],
    ["include/ingress/vlm_profile_json_document.h", []],
    ["include/ingress/onvif_credential_provider.h", []],
    ["include/ingress/ops_action_execution_deferral.h", []],
    ["include/ingress/ops_event_route_owner.h", []],
    ["include/ingress/vlm_evaluation_promotion.h", []],
  ]);
  for (const [file, allowed] of applicationIncludes) {
    const includes = [...read(file).matchAll(/^\s*#\s*include\s*"([^"]+)"/gm)].map(match => match[1]);
    assert(includes.every(include => allowed.includes(include)),
      `application header gained a non-interface production include: ${file}`);
  }
});

check("strict JSON has a physical domain owner boundary", () => {
  const cmake = read("CMakeLists.txt");
  const provenance = read("src/ingress/vlm_incident_rule_provenance.cpp");
  const profileDocument = read("src/ingress/vlm_profile_json_document.cpp");
  const transport = readWebRtcHttpServerBundle(read);
  assert(!fs.existsSync(path.join(sourceRoot, "include/core/strict_json.h")) &&
    !fs.existsSync(path.join(sourceRoot, "src/core/strict_json.cpp")),
  "legacy core strict JSON paths remain");
  assert(provenance.includes('#include "domain/strict_json.h"') &&
    profileDocument.includes('#include "domain/strict_json.h"') &&
    !transport.includes('#include "domain/strict_json.h"') &&
    !provenance.includes('#include "core/strict_json.h"') &&
    !profileDocument.includes('#include "core/strict_json.h"') &&
    !transport.includes('#include "core/strict_json.h"'),
  "strict JSON consumers do not use the domain boundary");
  assert(cmake.split("src/domain/strict_json.cpp").length === 2 &&
    !cmake.includes("src/core/strict_json.cpp"),
  "CMake strict JSON domain owner drift");
});

check("current graph removes only the planned owner violations", () => {
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const violations = graph.observedModuleEdges.filter(item => item.allowedByTarget === false);
  assert(graph.expectedProductionFiles === 194 && graph.expectedCppFiles === 95 &&
    graph.observedModuleEdges.length === 16 && violations.length === 2 &&
    graph.stronglyConnectedComponents.length === 0 &&
    JSON.stringify(graph.observedModuleEdges.map(item => item.direction)) === JSON.stringify(expectedDirections),
  "public owner graph metrics or exact direction set drift");
  for (const direction of [
    "application-service-interfaces -> core-utilities",
    "application-service-interfaces -> ops-route-groups",
    "transport-and-auth-adapter -> ops-route-groups",
    "transport-and-auth-adapter -> product-ui-workspaces",
  ]) assert(!graph.observedModuleEdges.some(item => item.direction === direction), `removed direction remains: ${direction}`);
});

const oracleInputs = [...new Set([...immutableContracts.keys(), ...applicationFiles.filter(item => item.endsWith(".h")),
  "src/domain/strict_json.cpp", "CMakeLists.txt", "src/ingress/vlm_incident_rule_provenance.cpp",
  "src/ingress/vlm_profile_json_document.cpp",
  "src/ingress/webrtc_http_server.cpp", "include/ingress/product_ui_principal_view.h"]),
  "test/fixtures/v390_structure_stabilization_current_graph.json"];
function copyInputs(targetRoot) {
  copyWebRtcHttpServerSourceFixture(targetRoot);
  for (const file of oracleInputs) {
    const target = path.join(targetRoot, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(rootDir, file), target);
  }
}
function runFixture(targetRoot) {
  return spawnSync(process.execPath, [scriptPath, `--fixture-root=${targetRoot}`, "--skip-mutations"], {
    cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
}
function rejectMutation(id, file, mutate, expectedFailure) {
  const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), `v390-public-owner-${id}-`));
  try {
    copyInputs(targetRoot);
    const target = path.join(targetRoot, file);
    const before = fs.readFileSync(target, "utf8");
    const after = mutate(before);
    assert(after !== before, `${id}: mutation changed no bytes`);
    fs.writeFileSync(target, after);
    const run = runFixture(targetRoot);
    const output = `${run.stdout || ""}\n${run.stderr || ""}`;
    assert(run.status === 1 && output.includes(expectedFailure), `${id}: mutation did not fail closed\n${output}`);
  } finally { fs.rmSync(targetRoot, { recursive: true, force: true }); }
}

if (!skipMutations) {
  check("isolated owner mutations fail through the real verifier", () => {
    const pristine = fs.mkdtempSync(path.join(os.tmpdir(), "v390-public-owner-pristine-"));
    try {
      copyInputs(pristine);
      const run = runFixture(pristine);
      assert(run.status === 0, `pristine fixture failed\n${run.stdout}\n${run.stderr}`);
    } finally { fs.rmSync(pristine, { recursive: true, force: true }); }
    rejectMutation("contract", "include/ingress/ops_event_route_owner.h", text => `${text}\n// drift\n`,
      "public contract bytes stay unchanged");
    rejectMutation("stable-owner", "test/fixtures/v390_structure_stabilization_current_graph.json",
      text => text.replace('"include/ingress/product_ui_assets.h",', ""),
      "stable public contract owner drift");
    rejectMutation("implementation-owner", "test/fixtures/v390_structure_stabilization_current_graph.json",
      text => text.replace('"src/ingress/ops_event_route_owner.cpp"', '"include/ingress/ops_event_route_owner.h"'),
      "Ops implementation owner drift");
    rejectMutation("direction-swap", "test/fixtures/v390_structure_stabilization_current_graph.json",
      text => text.replace('"direction": "analysis-services -> core-media-interfaces"',
        '"direction": "analysis-services -> product-ui-workspaces"'),
      "public owner graph metrics or exact direction set drift");
    rejectMutation("header-dependency", "include/ingress/product_ui_assets.h",
      text => text.replace("#include <string>", '#include <string>\n#include "core/session_manager.h"'),
      "public headers remain dependency-neutral");
    rejectMutation("strict-json-consumer", "src/ingress/vlm_incident_rule_provenance.cpp",
      text => text.replace('#include "domain/strict_json.h"', '#include "core/strict_json.h"'),
      "strict JSON consumers do not use the domain boundary");
    rejectMutation("strict-json-cmake", "CMakeLists.txt",
      text => text.replace("src/domain/strict_json.cpp", "src/core/strict_json.cpp"),
      "CMake strict JSON domain owner drift");
  });
}

for (const item of checks) console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const passed = checks.filter(item => item.status === "PASS").length;
const failed = checks.length - passed;
console.log(`- summary: pass=${passed} fail=${failed}`);
process.exit(failed === 0 ? 0 : 1);
