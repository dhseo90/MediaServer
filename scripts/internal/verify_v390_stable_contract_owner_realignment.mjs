#!/usr/bin/env node
// 파일 용도: REVIEW4-64 Slice 8 stable contract owner 재정렬을 검증한다.
// 동작 요약: contract bytes, owner classifier, media facade, graph delta와 source mutation 거부를 확인한다.

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 stable contract owner realignment verification

Usage:
  ./server.sh verify-v390-stable-contract-owner-realignment
`);
}
assertKnownOptions(rawArgs, ["h", "help", "fixture-root", "skip-mutations"]);

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const rootDir = path.resolve(scriptDir, "../..");
const skipMutations = rawArgs.includes("--skip-mutations");
const fixtureArg = rawArgs.find(arg => arg.startsWith("--fixture-root="));
const sourceRoot = fixtureArg ? validateFixtureRoot(fixtureArg.slice("--fixture-root=".length)) : rootDir;
const read = file => fs.readFileSync(path.join(sourceRoot, file), "utf8");
const sha256 = file => crypto.createHash("sha256").update(read(file)).digest("hex");
const checks = [];

function validateFixtureRoot(value) {
  if (!skipMutations) throw new Error("--fixture-root requires --skip-mutations");
  const resolved = fs.realpathSync(path.resolve(value));
  const tempRoot = `${fs.realpathSync(os.tmpdir())}${path.sep}`;
  if (!resolved.startsWith(tempRoot)) throw new Error("fixture root must stay under the system temp directory");
  return resolved;
}

function check(name, fn) {
  try {
    fn();
    checks.push({name, status:"PASS"});
  } catch (error) {
    checks.push({name, status:"FAIL", detail:error.message});
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const immutableContracts = new Map([
  ["include/analysis/analysis_types.h", "5f4142d917b2cac6d52ec8edcf01e6c5b9d19ef6621508b79dbb789bb7c963db"],
  ["include/analysis/tracked_object_metadata.h", "872f28fd2b9faf8f25ad6d2b15f681e2a44e0b995591102a6ef092e8fd93a964"],
  ["src/analysis/tracked_object_metadata.cpp", "3400838dad2035d307c7759722c11ec95edc278ba92138d8b14719c8bc07e47f"],
  ["include/analysis/va_runtime_metadata.h", "e05787c72af37b7efb5e55762dafed6f25d8d847ae48e8d245f94d2c420eaed2"],
  ["include/media_types.h", "d158ff9294bc419cf14e6ce40303a840ef63310a6eb5e26336d18141630a3b50"],
  ["include/ingress/rtsp_request_context.h", "5106d25b6a76a80e2d33ec5705ec1f076e476f6344716484acbf22dad9506b6e"],
  ["src/ingress/rtsp_request_context.cpp", "c55e0e9d98afd603b15e5ad91d87ad1fa1c744b77c2058c31c20886a1f519d17"],
  ["include/ingress/product_ui_principal_view.h", "11dc3085469c3f7a42eced329a1df40d3ee450fd76f585e5bca34c2f8f792902"],
]);

check("stable contract bytes stay unchanged", () => {
  for (const [file, expected] of immutableContracts) {
    assert(sha256(file) === expected, `contract bytes drift: ${file}`);
  }
});

check("stable owner contains only the presentation contract leaf", () => {
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const stable = graph.moduleClassifiers.find(item => item.id === "stable-contract-dtos");
  assert(JSON.stringify(stable?.exactFiles) === JSON.stringify([
    "include/ingress/product_ui_principal_view.h",
  ]), "stable owner exact file set drift");
  assert(stable.expectedFileCount === 1 && stable.expectedCppCount === 0,
    "stable owner expected counts drift");
  assert(!read("include/ingress/product_ui_principal_view.h").match(/^\s*#\s*include\s*"/m),
    "stable presentation leaf gained a production include");
});

check("analysis media and RTSP contracts have their target owners", () => {
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const analysis = graph.moduleClassifiers.find(item => item.id === "analysis-services");
  const coreUtilities = graph.moduleClassifiers.find(item => item.id === "core-utilities");
  const coreMedia = graph.moduleClassifiers.find(item => item.id === "core-media-interfaces");
  for (const file of [
    "include/analysis/analysis_types.h",
    "include/analysis/tracked_object_metadata.h",
    "src/analysis/tracked_object_metadata.cpp",
    "include/analysis/va_runtime_metadata.h",
  ]) assert(!graph.moduleClassifiers.some(item => item.id !== "analysis-services" && item.exactFiles.includes(file)),
    `analysis contract has a foreign exact owner: ${file}`);
  assert(analysis.expectedFileCount === 73 && analysis.expectedCppCount === 37,
    "analysis owner counts drift");
  assert(coreUtilities.exactFiles.includes("include/media_types.h") &&
    coreUtilities.expectedFileCount === 15 && coreUtilities.expectedCppCount === 6,
  "media primitive is not core-utility owned");
  for (const file of ["include/ingress/rtsp_request_context.h", "src/ingress/rtsp_request_context.cpp"])
    assert(coreMedia.exactFiles.includes(file), `RTSP request contract owner drift: ${file}`);
  assert(coreMedia.expectedFileCount === 30 && coreMedia.expectedCppCount === 13,
    "core-media owner counts drift");
});

check("analysis decoder consumes media packets through the core-media facade", () => {
  const decoder = read("include/analysis/raw_video_decoder.h");
  const facade = read("include/core/media_packet_contract.h");
  assert(decoder.includes('#include "core/media_packet_contract.h"') &&
    !decoder.includes('#include "media_types.h"'), "raw decoder bypasses the core-media facade");
  assert(facade.includes('#include "media_types.h"') &&
    !facade.includes("analysis/") && !facade.includes("ingress/"),
  "media packet facade is not dependency-neutral");
});

check("current graph records only the planned four-direction reduction", () => {
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const violations = graph.observedModuleEdges.filter(item => item.allowedByTarget === false);
  const expectedDirections = [
    "analysis-services -> core-media-interfaces",
    "analysis-services -> core-utilities",
    "analysis-services -> domain-and-registry-owners",
    "application-service-interfaces -> analysis-services",
    "application-service-interfaces -> core-utilities",
    "application-service-interfaces -> domain-and-registry-owners",
    "application-service-interfaces -> ops-route-groups",
    "composition-root -> analysis-services",
    "composition-root -> core-media-interfaces",
    "composition-root -> core-utilities",
    "composition-root -> transport-and-auth-adapter",
    "core-media-interfaces -> core-utilities",
    "core-media-interfaces -> domain-and-registry-owners",
    "domain-and-registry-owners -> core-utilities",
    "product-ui-workspaces -> stable-contract-dtos",
    "transport-and-auth-adapter -> analysis-services",
    "transport-and-auth-adapter -> application-service-interfaces",
    "transport-and-auth-adapter -> core-media-interfaces",
    "transport-and-auth-adapter -> core-utilities",
    "transport-and-auth-adapter -> domain-and-registry-owners",
    "transport-and-auth-adapter -> ops-route-groups",
    "transport-and-auth-adapter -> product-ui-workspaces",
  ];
  assert(graph.expectedProductionFiles === 163 && graph.expectedCppFiles === 80 &&
    graph.observedModuleEdges.length === 22 && violations.length === 10 &&
    graph.stronglyConnectedComponents.length === 0 &&
    JSON.stringify(graph.observedModuleEdges.map(item => item.direction)) === JSON.stringify(expectedDirections),
  "stable owner graph metrics drift");
  for (const direction of [
    "analysis-services -> stable-contract-dtos",
    "core-media-interfaces -> stable-contract-dtos",
    "core-utilities -> stable-contract-dtos",
    "domain-and-registry-owners -> stable-contract-dtos",
  ]) assert(!graph.observedModuleEdges.some(item => item.direction === direction),
    `removed stable direction remains: ${direction}`);
});

const oracleInputs = [
  ...immutableContracts.keys(),
  "include/analysis/raw_video_decoder.h",
  "include/core/media_packet_contract.h",
  "test/fixtures/v390_structure_stabilization_current_graph.json",
];

function copyInputs(targetRoot) {
  for (const file of oracleInputs) {
    const target = path.join(targetRoot, file);
    fs.mkdirSync(path.dirname(target), {recursive:true});
    fs.copyFileSync(path.join(rootDir, file), target);
  }
}

function runFixture(targetRoot) {
  return spawnSync(process.execPath, [scriptPath, `--fixture-root=${targetRoot}`, "--skip-mutations"], {
    cwd: rootDir, encoding:"utf8", stdio:["ignore", "pipe", "pipe"],
  });
}

function rejectMutation(id, file, mutate, expectedFailure) {
  const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), `v390-stable-owner-${id}-`));
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
  } finally {
    fs.rmSync(targetRoot, {recursive:true, force:true});
  }
}

if (!skipMutations) {
  check("isolated contract owner mutations fail through the real verifier", () => {
    const pristine = fs.mkdtempSync(path.join(os.tmpdir(), "v390-stable-owner-pristine-"));
    try {
      copyInputs(pristine);
      const run = runFixture(pristine);
      assert(run.status === 0, `pristine fixture failed\n${run.stdout}\n${run.stderr}`);
    } finally {
      fs.rmSync(pristine, {recursive:true, force:true});
    }
    rejectMutation("contract-bytes", "include/media_types.h", text => `${text}\n// drift\n`,
      "stable contract bytes stay unchanged");
    rejectMutation("decoder-bypass", "include/analysis/raw_video_decoder.h",
      text => text.replace('#include "core/media_packet_contract.h"', '#include "media_types.h"'),
      "analysis decoder consumes media packets through the core-media facade");
    rejectMutation("facade-bypass", "include/core/media_packet_contract.h",
      text => text.replace('#include "media_types.h"', "// media include removed"),
      "analysis decoder consumes media packets through the core-media facade");
    rejectMutation("stable-owner", "test/fixtures/v390_structure_stabilization_current_graph.json",
      text => text.replace('"include/ingress/product_ui_principal_view.h"',
        '"include/analysis/analysis_types.h",\n        "include/ingress/product_ui_principal_view.h"'),
      "stable owner contains only the presentation contract leaf");
    rejectMutation("graph-count", "test/fixtures/v390_structure_stabilization_current_graph.json",
      text => text.replace('"expectedProductionFiles": 163', '"expectedProductionFiles": 162'),
      "current graph records only the planned four-direction reduction");
    rejectMutation("direction-swap", "test/fixtures/v390_structure_stabilization_current_graph.json",
      text => text.replace('"direction": "analysis-services -> core-utilities"',
        '"direction": "analysis-services -> product-ui-workspaces"'),
      "current graph records only the planned four-direction reduction");
  });
}

for (const item of checks) console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const passed = checks.filter(item => item.status === "PASS").length;
const failed = checks.length - passed;
console.log(`- summary: pass=${passed} fail=${failed}`);
process.exit(failed === 0 ? 0 : 1);
