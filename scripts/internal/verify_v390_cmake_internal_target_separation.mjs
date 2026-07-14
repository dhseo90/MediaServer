#!/usr/bin/env node
// 파일 용도: REVIEW4-64 composition executable과 runtime static library의 실제 CMake 분리를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 REVIEW4-64 CMake internal target separation verification

Usage:
  ./server.sh verify-v390-cmake-internal-target-separation

Checks:
  - media_server composition executable과 media_server_runtime static library 분리
  - 모든 production C++ source의 target별 정확히 1회 소유
  - optional YouTube source와 external compile/link 설정의 runtime target 결속
  - current graph target topology와 mutation negative
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const cmake = read("CMakeLists.txt");
const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
const structureVerifier = read("scripts/internal/verify_v390_structure_stabilization_execution.mjs");
const productionCpp = execFileSync("git", ["ls-files", "src"], { cwd: rootDir, encoding: "utf8" })
  .trim().split("\n").filter(file => file.endsWith(".cpp")).sort();
const checks = [];

check("composition executable and runtime static library are distinct", () => {
  const model = parseTargets(cmake);
  assert(model.definitions.get("media_server")?.type === "executable", "media_server executable missing");
  assert(model.definitions.get("media_server_runtime")?.type === "library", "media_server_runtime library missing");
  assert(cmake.includes("add_library(media_server_runtime STATIC"), "runtime target is not STATIC");
  assert(cmake.includes("target_link_libraries(media_server PRIVATE media_server_runtime)"),
    "composition executable does not link the runtime target");
});

check("production C++ sources have exact composition/runtime ownership", () => {
  const model = parseTargets(cmake);
  const executableSources = [...(model.sources.get("media_server") || [])].sort();
  const runtimeSources = [...(model.sources.get("media_server_runtime") || [])].sort();
  assert(JSON.stringify(executableSources) === JSON.stringify([
    "src/application/media_server_application.cpp",
    "src/main.cpp",
  ]), `composition source set drift: ${JSON.stringify(executableSources)}`);
  assert(!runtimeSources.includes("src/main.cpp") &&
    !runtimeSources.includes("src/application/media_server_application.cpp"),
  "runtime library retains composition sources");
  const all = [...executableSources, ...runtimeSources].sort();
  assert(JSON.stringify(all) === JSON.stringify(productionCpp),
    `production source coverage drift: expected=${productionCpp.length} actual=${all.length}`);
  assert(new Set(all).size === all.length, "production source is declared in multiple targets");
});

check("runtime target owns optional source, compile definitions, includes, and external links", () => {
  assert(cmake.includes("target_sources(media_server_runtime PRIVATE src/core/youtube_resolver.cpp)"),
    "conditional YouTube source is not owned by runtime target");
  assert(cmake.includes("target_include_directories(media_server_runtime PUBLIC include)"),
    "runtime public include boundary missing");
  for (const anchor of [
    "target_compile_definitions(media_server_runtime PUBLIC MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=1)",
    "target_compile_definitions(media_server_runtime PUBLIC MEDIA_SERVER_USE_GSTREAMER=1 GST_USE_UNSTABLE_API=1)",
    "target_link_libraries(media_server_runtime PUBLIC PkgConfig::GSTREAMER)",
    "target_link_libraries(media_server_runtime PUBLIC PkgConfig::SQLITE3)",
    "target_link_libraries(media_server_runtime PUBLIC PkgConfig::LIBSODIUM)",
    "target_link_libraries(media_server_runtime PUBLIC PkgConfig::OPENSSL)",
    "target_link_libraries(media_server_runtime PUBLIC OpenSSL::SSL OpenSSL::Crypto)",
    "target_include_directories(media_server_runtime PUBLIC ${ONNXRUNTIME_INCLUDE_DIR})",
    "target_link_libraries(media_server_runtime PUBLIC ${ONNXRUNTIME_LIBRARY})",
  ]) assert(cmake.includes(anchor), `runtime build setting missing: ${anchor}`);
});

check("current graph and writer bind both actual CMake targets", () => {
  assert(graph.cmake.internalTargetSeparation === true, "current graph does not claim actual target separation");
  assert(JSON.stringify(graph.cmake.targets.map(item => item.id)) ===
    JSON.stringify(["media_server_runtime", "media_server"]),
  `current graph target order drift: ${graph.cmake.targets.map(item => item.id)}`);
  const runtime = graph.cmake.targets[0];
  const executable = graph.cmake.targets[1];
  assert(runtime.type === "library" && runtime.internalModuleTarget === true &&
    executable.type === "executable" && executable.internalModuleTarget === false,
  "current graph target kind/internal flags drift");
  assert(runtime.declaredSourceCount === 77 && runtime.defaultActiveSourceCount === 76 &&
    executable.declaredSourceCount === 2 && executable.defaultActiveSourceCount === 2,
  "current graph target source counts drift");
  for (const anchor of [
    "graph.cmake.targets = current.cmake.targets.map",
    "graph.cmake.internalTargetSeparation = current.cmake.internalTargetSeparation",
  ]) assert(structureVerifier.includes(anchor), `graph writer topology anchor missing: ${anchor}`);
});

check("target ownership and topology mutations fail closed", () => {
  const duplicate = parseTargets(cmake + "\ntarget_sources(media_server PRIVATE src/main.cpp)\n");
  const duplicateOwners = [...duplicate.sources.entries()]
    .flatMap(([target, sources]) => sources.map(source => `${source}:${target}`))
    .filter(item => item.startsWith("src/main.cpp:"));
  assert(duplicateOwners.length !== 1, "duplicate main target mutation was accepted");
  const missingLink = cmake.replace("target_link_libraries(media_server PRIVATE media_server_runtime)", "");
  assert(!missingLink.includes("target_link_libraries(media_server PRIVATE media_server_runtime)"),
    "missing runtime link mutation was not detected");
  const wrongOptionalOwner = cmake.replace(
    "target_sources(media_server_runtime PRIVATE src/core/youtube_resolver.cpp)",
    "target_sources(media_server PRIVATE src/core/youtube_resolver.cpp)",
  );
  assert(!wrongOptionalOwner.includes("target_sources(media_server_runtime PRIVATE src/core/youtube_resolver.cpp)"),
    "optional source owner mutation was not detected");
});

for (const item of checks) {
  console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
}
const passed = checks.filter(item => item.status === "PASS").length;
const failed = checks.length - passed;
console.log(`- summary: pass=${passed} fail=${failed}`);
process.exit(failed === 0 ? 0 : 1);

function parseTargets(text) {
  const definitions = new Map();
  const sources = new Map();
  for (const call of cmakeCalls(text, ["add_executable", "add_library", "target_sources"])) {
    const tokens = call.body.match(/"[^"]*"|[^\s]+/g)?.map(token => token.replace(/^"|"$/g, "")) || [];
    if (tokens.length === 0) continue;
    const id = tokens[0];
    if (call.name !== "target_sources") {
      definitions.set(id, { type: call.name === "add_executable" ? "executable" : "library" });
      if (!sources.has(id)) sources.set(id, []);
    }
    if (!sources.has(id)) continue;
    for (const token of tokens.slice(1)) {
      if (/^src\/[A-Za-z0-9_./-]+\.cpp$/.test(token)) sources.get(id).push(token);
    }
  }
  return { definitions, sources };
}

function cmakeCalls(text, names) {
  const calls = [];
  const pattern = new RegExp(`\\b(${names.join("|")})\\s*\\(`, "g");
  for (const match of text.matchAll(pattern)) {
    let depth = 1;
    let cursor = match.index + match[0].length;
    let quote = false;
    for (; cursor < text.length && depth > 0; cursor += 1) {
      const character = text[cursor];
      if (character === '"' && text[cursor - 1] !== "\\") quote = !quote;
      if (quote) continue;
      if (character === "(") depth += 1;
      if (character === ")") depth -= 1;
    }
    if (depth !== 0) throw new Error(`unterminated CMake command: ${match[1]}`);
    calls.push({ name: match[1], body: text.slice(match.index + match[0].length, cursor - 1).replace(/#[^\n]*/g, " ") });
  }
  return calls;
}

function read(file) {
  return fs.readFileSync(path.join(rootDir, file), "utf8");
}

function check(name, fn) {
  try {
    fn();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", detail: error.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
