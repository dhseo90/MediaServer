#!/usr/bin/env node
// 파일 용도: REVIEW4-64 Slice 10 core-media registry ownership과 RTSP rule port를 검증한다.

import crypto from "node:crypto";
import {assertCurrentSourceGraph, assertBoundaryOwners, copyCurrentGraphInputs} from "./structure_dependency_policy_lib.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 core-media registry/rule port verification

Usage:
  ./server.sh verify-v390-core-media-registry-rule-port
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
const checks = [];

function walkProductionFiles(dir, extensions, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const current = path.join(dir, entry.name);
    if (entry.isDirectory()) walkProductionFiles(current, extensions, files);
    else if (extensions.some(extension => entry.name.endsWith(extension))) files.push(current);
  }
  return files;
}

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

const registryHeader = "include/core/webrtc_source_registry.h";
const registrySource = "src/core/webrtc_source_registry.cpp";
check("WebRTC published source registry physically belongs to core-media", () => {
  assert(!fs.existsSync(path.join(sourceRoot, "include/ingress/webrtc_source_registry.h")) &&
    !fs.existsSync(path.join(sourceRoot, "src/ingress/webrtc_source_registry.cpp")),
  "legacy ingress WebRTC source registry paths remain");
  assert(sha256Text(read(registryHeader)) ===
    "c8b216833083574cb83482e27a32f03b72c8d1051dc24418ad8d17971dca8cf7",
  "WebRTC source registry public contract bytes drift");
  const normalized = read(registrySource)
    .replace('#include "core/webrtc_source_registry.h"', '#include "ingress/webrtc_source_registry.h"');
  assert(sha256Text(normalized) ===
    "260e3ed57db808c0ad01df86f328523fb5dac9d3e431051438737f6d1b56735c",
  "WebRTC source registry implementation drift");
});

check("registry consumers and CMake use only the core-media path", () => {
  const cmake = read("CMakeLists.txt");
  const consumers = [
    "include/ingress/webrtc_source_session.h",
    "src/core/source_factory.cpp",
    "src/ingress/webrtc_media_application_adapter.cpp",
    registrySource,
  ];
  for (const file of consumers) {
    assert(read(file).includes('#include "core/webrtc_source_registry.h"'),
      `registry consumer does not use core-media path: ${file}`);
    assert(!read(file).includes('#include "ingress/webrtc_source_registry.h"'),
      `registry consumer retained ingress path: ${file}`);
  }
  assert(cmake.split("src/core/webrtc_source_registry.cpp").length === 2 &&
    !cmake.includes("src/ingress/webrtc_source_registry.cpp"),
  "CMake WebRTC source registry owner drift");
});

check("RTSP rule lookup crosses the injected media-analysis port", () => {
  const port = read("include/core/media_analysis_port.h");
  const serviceHeader = read("include/analysis/analysis_session_service.h");
  const service = read("src/analysis/analysis_session_service.cpp");
  const rtsp = read("src/ingress/gstreamer_rtsp_server.cpp");
  for (const text of [port, serviceHeader]) {
    assert(text.includes("PrepareRtspRequest(media::IngressRequest* request,"),
      "RTSP request preparation port declaration missing");
  }
  const implementation = service.match(
    /bool\s+AnalysisSessionService::PrepareRtspRequest\([^)]*\)\s*\{([^}]*)\}/s);
  assert(implementation &&
    implementation[1].replace(/\s+/g, " ").trim() ===
      "return ingress::ApplyVideoAnalysisRuleToRequest(request, error_message);",
  "analysis service does not own RTSP rule request preparation");
  const configureStart = rtsp.indexOf("void OnMediaConfigure(");
  const configureEnd = rtsp.indexOf("void OnMediaConstructed(", configureStart);
  const configure = rtsp.slice(configureStart, configureEnd > configureStart ? configureEnd : undefined);
  const orderedTokens = [
    "BuildRequestFromRtspUrl(",
    "runtime->analysis_port.PrepareRtspRequest(&request, &va_rule_error)",
    "CodecFromPath(",
    "AudioCodecFromPath(",
    "core::ParseSourceSpec(",
    "runtime->analysis_port.PrepareRtsp(request)",
  ].map(token => configure.indexOf(token));
  assert(configureStart >= 0 && orderedTokens.every(index => index >= 0) &&
    orderedTokens.every((index, position) => position === 0 || orderedTokens[position - 1] < index),
  "RTSP rule preparation order drift");
  assert(rtsp.includes("runtime->analysis_port.PrepareRtspRequest(&request, &va_rule_error)") &&
    rtsp.includes("[gst] invalid vaRule request: ") &&
    !rtsp.includes('#include "ingress/analysis_rule_registry.h"') &&
    !rtsp.includes("ApplyVideoAnalysisRuleToRequest(&request"),
  "RTSP adapter bypasses the injected rule preparation port");
});

check("current graph removes the complete core-media to domain direction", () => {
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  assertCurrentSourceGraph(sourceRoot, graph);
  assertBoundaryOwners(graph, [[registryHeader, 'core-media-interfaces'], [registrySource, 'core-media-interfaces'],
    ['include/ingress/analysis_rule_registry.h', 'domain-and-registry-owners'],
    ['src/ingress/analysis_rule_registry.cpp', 'domain-and-registry-owners']]);
  assert(!graph.observedModuleEdges.some(item => item.direction === 'core-media-interfaces -> domain-and-registry-owners'),
    'core-media to domain direction remains');
});

const oracleInputs = [
  registryHeader, registrySource, "CMakeLists.txt", "include/ingress/webrtc_source_session.h",
  "src/core/source_factory.cpp", "src/ingress/webrtc_http_server.cpp",
  "include/core/media_analysis_port.h", "include/analysis/analysis_session_service.h",
  "src/analysis/analysis_session_service.cpp", "src/ingress/gstreamer_rtsp_server.cpp",
  "test/fixtures/v390_structure_stabilization_current_graph.json",
];
function copyInputs(targetRoot) {
  copyCurrentGraphInputs(rootDir, targetRoot);
  const graph = JSON.parse(fs.readFileSync(path.join(rootDir,
    "test/fixtures/v390_structure_stabilization_current_graph.json"), "utf8"));
  const productionFiles = graph.productionRoots
    .flatMap(root => walkProductionFiles(path.join(rootDir, root), graph.sourceExtensions))
    .map(file => path.relative(rootDir, file).replaceAll(path.sep, "/"));
  for (const file of new Set([...oracleInputs, ...productionFiles])) {
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
  const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), `v390-core-registry-port-${id}-`));
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
  check("isolated registry, port, consumer, CMake, and graph mutations fail closed", () => {
    const pristine = fs.mkdtempSync(path.join(os.tmpdir(), "v390-core-registry-port-pristine-"));
    try {
      copyInputs(pristine);
      const run = runFixture(pristine);
      assert(run.status === 0, `pristine fixture failed\n${run.stdout}\n${run.stderr}`);
    } finally { fs.rmSync(pristine, { recursive: true, force: true }); }
    rejectMutation("contract", registryHeader, text => `${text}\n// drift\n`,
      "WebRTC published source registry physically belongs to core-media");
    rejectMutation("consumer", "src/core/source_factory.cpp",
      text => text.replace('#include "core/webrtc_source_registry.h"',
        '#include "ingress/webrtc_source_registry.h"'),
      "registry consumers and CMake use only the core-media path");
    rejectMutation("cmake", "CMakeLists.txt",
      text => text.replace("src/core/webrtc_source_registry.cpp", "src/ingress/webrtc_source_registry.cpp"),
      "registry consumers and CMake use only the core-media path");
    rejectMutation("port", "include/core/media_analysis_port.h",
      text => text.replace("PrepareRtspRequest", "PrepareRtspRequestDrift"),
      "RTSP rule lookup crosses the injected media-analysis port");
    rejectMutation("adapter", "src/ingress/gstreamer_rtsp_server.cpp",
      text => text.replace("runtime->analysis_port.PrepareRtspRequest", "ApplyVideoAnalysisRuleToRequest"),
      "RTSP rule lookup crosses the injected media-analysis port");
    rejectMutation("order", "src/ingress/gstreamer_rtsp_server.cpp", text => {
      const call = "runtime->analysis_port.PrepareRtspRequest(&request, &va_rule_error)";
      return text.replace(call, "true /* moved */")
        .replace("auto analysis_binding = runtime->analysis_port.PrepareRtsp(request);",
          `const bool moved_rule_result = ${call};\n    (void)moved_rule_result;\n    auto analysis_binding = runtime->analysis_port.PrepareRtsp(request);`);
    }, "RTSP rule lookup crosses the injected media-analysis port");
    rejectMutation("unreachable-delegate", "src/analysis/analysis_session_service.cpp",
      text => text.replace(
        /bool\s+AnalysisSessionService::PrepareRtspRequest\(([^)]*)\)\s*\{/s,
        "bool AnalysisSessionService::PrepareRtspRequest($1) {\n    return true;"),
      "RTSP rule lookup crosses the injected media-analysis port");
    rejectMutation("hidden-core-domain-edge", "src/core/source_factory.cpp",
      text => text.replace(/^#include/m, '#include "ingress/source_view_registry.h"\n#include'),
      "current graph removes the complete core-media to domain direction");
    rejectMutation("direction", "test/fixtures/v390_structure_stabilization_current_graph.json",
      text => text.replace('"direction": "analysis-services -> core-media-interfaces"',
        '"direction": "core-media-interfaces -> domain-and-registry-owners"'),
      "current graph removes the complete core-media to domain direction");
  });
}

for (const item of checks) console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const passed = checks.filter(item => item.status === "PASS").length;
const failed = checks.length - passed;
console.log(`- summary: pass=${passed} fail=${failed}`);
process.exit(failed === 0 ? 0 : 1);
