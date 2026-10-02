#!/usr/bin/env node
// 파일 용도: REVIEW4-64 Slice 8 stable contract owner 재정렬을 검증한다.
// 동작 요약: contract bytes, owner classifier, media facade, graph delta와 source mutation 거부를 확인한다.

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import {assertCurrentSourceGraph, assertBoundaryOwners, copyCurrentGraphInputs} from "./structure_dependency_policy_lib.mjs";
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

// 현행 후속 기준은 공개된 v4.1.0 소스의 고정 바이트다.
// 기준 커밋은 16f3df711bf02035da22aa1fc2a8720d8162871d이며 이 작업 트리에서 생성하지 않는다.
// 위의 원래 Slice 8 기대값은 과거 자료로 유지한다.
const releasedSuccessors = new Map([
  ["include/analysis/analysis_types.h", "ff41f7a7142a93c800f8e2eaecf18f028bcfde5a6cd003dc8bcfd5db9693c1c1"],
  ["include/media_types.h", "4c7ed4b29cd3385f109d55ed3bea47e1792f38198d11896840b3b0c8b8f9c54a"],
]);

check("stable contract bytes match the current released baseline", () => {
  for (const [file, expected] of immutableContracts) {
    assert(sha256(file) === (releasedSuccessors.get(file) || expected), `contract bytes drift: ${file}`);
  }
});

check("stable owner retains the presentation leaf and approved public successors", () => {
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  const stable = graph.moduleClassifiers.find(item => item.id === "stable-contract-dtos");
  const slice8Files = ["include/ingress/product_ui_principal_view.h"];
  const slice9Files = [
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
  assert([JSON.stringify(slice8Files), JSON.stringify(slice9Files)].includes(JSON.stringify(stable?.exactFiles)),
    "stable owner exact file set drift");
  assert([1, 9].includes(stable.expectedFileCount) && stable.expectedCppCount === 0,
    "stable owner expected counts drift");
  assert(!read("include/ingress/product_ui_principal_view.h").match(/^\s*#\s*include\s*"/m),
    "stable presentation leaf gained a production include");
});

check("analysis media and RTSP contracts have their target owners", () => {
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  assertBoundaryOwners(graph, [
    ...['include/analysis/analysis_types.h','include/analysis/tracked_object_metadata.h','src/analysis/tracked_object_metadata.cpp','include/analysis/va_runtime_metadata.h'].map(file => [file, 'analysis-services']),
    ['include/media_types.h','core-utilities'],
    ...['include/ingress/rtsp_request_context.h','src/ingress/rtsp_request_context.cpp'].map(file => [file,'core-media-interfaces']),
  ]);
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
  assertCurrentSourceGraph(sourceRoot, graph);

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
  copyCurrentGraphInputs(rootDir, targetRoot);
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
      "stable contract bytes match the current released baseline");
    rejectMutation("decoder-bypass", "include/analysis/raw_video_decoder.h",
      text => text.replace('#include "core/media_packet_contract.h"', '#include "media_types.h"'),
      "analysis decoder consumes media packets through the core-media facade");
    rejectMutation("facade-bypass", "include/core/media_packet_contract.h",
      text => text.replace('#include "media_types.h"', "// media include removed"),
      "analysis decoder consumes media packets through the core-media facade");
    rejectMutation("stable-owner", "test/fixtures/v390_structure_stabilization_current_graph.json",
      text => text.replace('"include/ingress/product_ui_principal_view.h"',
        '"include/analysis/analysis_types.h",\n        "include/ingress/product_ui_principal_view.h"'),
      "stable owner retains the presentation leaf and approved public successors");
    rejectMutation("graph-count", "test/fixtures/v390_structure_stabilization_current_graph.json",
      text => { const value = JSON.parse(text); value.expectedProductionFiles += 1; return JSON.stringify(value); },
      "current graph records only the planned four-direction reduction");
    rejectMutation("direction-swap", "test/fixtures/v390_structure_stabilization_current_graph.json",
      text => text.replace('"direction": "analysis-services -> core-media-interfaces"',
        '"direction": "analysis-services -> product-ui-workspaces"'),
      "current graph records only the planned four-direction reduction");
  });
}

for (const item of checks) console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const passed = checks.filter(item => item.status === "PASS").length;
const failed = checks.length - passed;
console.log(`- summary: pass=${passed} fail=${failed}`);
process.exit(failed === 0 ? 0 : 1);
