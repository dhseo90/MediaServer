#!/usr/bin/env node
// 파일 용도: REVIEW4-64 Slice 12 WebRTC HTTP server translation-unit physical split을 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 WebRTC HTTP server physical split verification

Usage:
  ./server.sh verify-v390-webrtc-http-server-physical-split
`);
}
assertKnownOptions(rawArgs, ["h", "help", "fixture-root", "skip-mutations"]);

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), "../..");
const skipMutations = rawArgs.includes("--skip-mutations");
const fixtureArg = rawArgs.find(arg => arg.startsWith("--fixture-root="));
const sourceRoot = fixtureArg ? validateFixtureRoot(fixtureArg.slice("--fixture-root=".length)) : rootDir;
const rollbackCommit = "2e4a4d7e";
const expectedSuccessorDefinitionCount = 1190;
const expectedSuccessorDefinitionSha256 =
  "eb9f038a775adebb06d9ddd84f6b6ef1b6f5dbcc2803dc020cc4cc9287250729";
const expectedGraphSha256 =
  "215ce9282593945dc820171348eabc2f06814ce2be4b2abe1dbd632919dd820a";
const expectedCurrentGraphSha256 =
  "fd34ace24775ec0ffbd6617bc1ddcee661f50630471626ff57604e5955eebc24";
const helperPath = "scripts/internal/webrtc_http_server_source_bundle.mjs";
const completionGraphPath = "test/fixtures/v390_structure_stabilization_slice32_completion_graph.json";
const currentGraphPath = "test/fixtures/v390_structure_stabilization_current_graph.json";
const snapshotPath = "test/fixtures/v390_webrtc_http_server_source_bundle_snapshots.json";
const completionSourceCommit = "b9a45740e60f087cff6ff6d8358994855db8651f";
const splitPaths = [
  "src/ingress/webrtc_http_server.cpp",
  "src/ingress/webrtc_http_server_ops_foundation.cpp",
  "src/ingress/webrtc_http_server_ops_workflows.cpp",
  "src/ingress/webrtc_http_server_ops_incidents.cpp",
  "src/ingress/webrtc_http_server_runtime.cpp",
  "src/ingress/webrtc_http_server_detail.h",
];
const cppPaths = splitPaths.filter(file => file.endsWith(".cpp"));
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
const read = file => fs.readFileSync(path.join(sourceRoot, file), "utf8");
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const lineCount = text => text.split(/\r?\n/).length - (text.endsWith("\n") ? 1 : 0);
const gitText = (commit, file) => execFileSync("git", ["show", `${commit}:${file}`], {
  cwd: rootDir, encoding: "utf8",
});
const snapshots = JSON.parse(read(snapshotPath));

function findClosingBrace(text, opening) {
  let depth = 0;
  let state = "code";
  let rawEnd = "";
  for (let index = opening; index < text.length; ++index) {
    const ch = text[index];
    const next = text[index + 1] || "";
    if (state === "line-comment") {
      if (ch === "\n") state = "code";
      continue;
    }
    if (state === "block-comment") {
      if (ch === "*" && next === "/") { state = "code"; ++index; }
      continue;
    }
    if (state === "string" || state === "char") {
      if (ch === "\\") { ++index; continue; }
      if ((state === "string" && ch === '"') || (state === "char" && ch === "'")) state = "code";
      continue;
    }
    if (state === "raw") {
      if (text.startsWith(rawEnd, index)) { index += rawEnd.length - 1; state = "code"; }
      continue;
    }
    if (ch === "/" && next === "/") { state = "line-comment"; ++index; continue; }
    if (ch === "/" && next === "*") { state = "block-comment"; ++index; continue; }
    if (ch === "R" && next === '"') {
      const paren = text.indexOf("(", index + 2);
      if (paren > 0 && paren - index <= 18) {
        rawEnd = `)${text.slice(index + 2, paren)}"`;
        state = "raw";
        index = paren;
        continue;
      }
    }
    if (ch === '"') { state = "string"; continue; }
    if (ch === "'") { state = "char"; continue; }
    if (ch === "{") ++depth;
    if (ch === "}" && --depth === 0) return index;
  }
  throw new Error("unterminated declaration block");
}

function definitionBlocks(text) {
  const matches = [];
  const lineStarts = [0];
  for (let index = 0; index < text.length; ++index) {
    if (text[index] === "\n") lineStarts.push(index + 1);
  }
  const stateAt = new Array(text.length + 1);
  let depth = 0;
  let state = "code";
  let rawEnd = "";
  for (let index = 0; index < text.length; ++index) {
    stateAt[index] = { depth, state };
    const ch = text[index];
    const next = text[index + 1] || "";
    if (state === "line-comment") {
      if (ch === "\n") state = "code";
      continue;
    }
    if (state === "block-comment") {
      if (ch === "*" && next === "/") { state = "code"; stateAt[++index] = { depth, state: "block-comment" }; }
      continue;
    }
    if (state === "string" || state === "char") {
      if (ch === "\\") { stateAt[++index] = { depth, state }; continue; }
      if ((state === "string" && ch === '"') || (state === "char" && ch === "'")) state = "code";
      continue;
    }
    if (state === "raw") {
      if (text.startsWith(rawEnd, index)) {
        for (let offset = 1; offset < rawEnd.length; ++offset) stateAt[index + offset] = { depth, state };
        index += rawEnd.length - 1;
        state = "code";
      }
      continue;
    }
    if (ch === "/" && next === "/") { state = "line-comment"; stateAt[++index] = { depth, state }; continue; }
    if (ch === "/" && next === "*") { state = "block-comment"; stateAt[++index] = { depth, state }; continue; }
    if (ch === "R" && next === '"') {
      const paren = text.indexOf("(", index + 2);
      if (paren > 0 && paren - index <= 18) {
        rawEnd = `)${text.slice(index + 2, paren)}"`;
        for (let offset = 1; offset <= paren - index; ++offset) stateAt[index + offset] = { depth, state: "raw" };
        state = "raw";
        index = paren;
        continue;
      }
    }
    if (ch === '"') { state = "string"; continue; }
    if (ch === "'") { state = "char"; continue; }
    if (ch === "{") ++depth;
    if (ch === "}") --depth;
  }
  stateAt[text.length] = { depth, state };

  for (const start of lineStarts) {
    const lineEnd = text.indexOf("\n", start);
    const firstLine = text.slice(start, lineEnd < 0 ? text.length : lineEnd);
    if (firstLine.length === 0 || /^\s/.test(firstLine) ||
        /^(?:\/\/|#|namespace\b|using\b|typedef\b|static_assert\b)/.test(firstLine) ||
        ![1, 2].includes(stateAt[start]?.depth) || stateAt[start]?.state !== "code") continue;
    let opening = -1;
    let semicolon = -1;
    let parenDepth = 0;
    for (let index = start; index < text.length; ++index) {
      const meta = stateAt[index];
      if (meta?.state !== "code") continue;
      if (text[index] === "(") ++parenDepth;
      if (text[index] === ")") --parenDepth;
      if (text[index] === ";" && parenDepth === 0) { semicolon = index; break; }
      if (text[index] === "{" && parenDepth === 0) { opening = index; break; }
      if (text[index] === "\n" && index > start && !/^\s/.test(text[index + 1] || "")) break;
    }
    if (opening < 0 || semicolon >= 0) continue;
    const signature = text.slice(start, opening).trim();
    const isType = /^(?:struct|class|enum\s+class)\b/.test(signature);
    if (!isType && !signature.includes("(")) continue;
    const closing = findClosingBrace(text, opening);
    let end = closing + 1;
    if (isType) {
      while (/\s/.test(text[end] || "")) ++end;
      if (text[end] === ";") ++end;
    }
    matches.push({ isType, signature, block: text.slice(start, end).trim() });
  }
  return matches;
}

function definitionInventory(text) {
  return definitionBlocks(text).map(item => sha256(item.isType ? item.block : item.block.replace(
    /\s*=\s*(?:\{\}|nullptr|true|false|\d+|"(?:\\.|[^"])*"|std::string\(\))/g, ""))).sort();
}

function markedDeclarationInventory(text, kind, predicate = () => true) {
  const marker = new RegExp(`^// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN \\d+ ${kind}\\r?$`, "gm");
  const markers = [...text.matchAll(/^\/\/ WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN \d+ (?:type|constant|prototype|function)\r?$/gm)];
  const wanted = new Set([...text.matchAll(marker)].map(match => match.index));
  return markers.filter(match => wanted.has(match.index)).map((match, index, all) => {
    const start = match.index + match[0].length + (text[match.index + match[0].length] === "\r" ? 2 : 1);
    const allIndex = markers.findIndex(item => item.index === match.index);
    const end = allIndex + 1 < markers.length ? markers[allIndex + 1].index : text.length;
    const declaration = text.slice(start, end).trim().split(";")[0].trim();
    return declaration;
  }).filter(predicate).map(value => sha256(value)).sort();
}

function lexicalCodeView(text) {
  const output = [...text];
  let state = "code";
  let rawEnd = "";
  for (let index = 0; index < text.length; ++index) {
    const ch = text[index];
    const next = text[index + 1] || "";
    if (state === "line-comment") {
      if (ch === "\n") state = "code";
      else output[index] = " ";
      continue;
    }
    if (state === "block-comment") {
      if (ch !== "\n") output[index] = " ";
      if (ch === "*" && next === "/") { output[++index] = " "; state = "code"; }
      continue;
    }
    if (state === "string" || state === "char") {
      if (ch !== "\n") output[index] = " ";
      if (ch === "\\") { output[++index] = " "; continue; }
      if ((state === "string" && ch === '"') || (state === "char" && ch === "'")) state = "code";
      continue;
    }
    if (state === "raw") {
      if (ch !== "\n") output[index] = " ";
      if (text.startsWith(rawEnd, index)) {
        for (let offset = 1; offset < rawEnd.length; ++offset) {
          if (text[index + offset] !== "\n") output[index + offset] = " ";
        }
        index += rawEnd.length - 1;
        state = "code";
      }
      continue;
    }
    if (ch === "/" && next === "/") { output[index] = output[++index] = " "; state = "line-comment"; continue; }
    if (ch === "/" && next === "*") { output[index] = output[++index] = " "; state = "block-comment"; continue; }
    if (ch === "R" && next === '"') {
      const paren = text.indexOf("(", index + 2);
      if (paren > 0 && paren - index <= 18) { rawEnd = `)${text.slice(index + 2, paren)}"`; state = "raw"; output[index] = " "; continue; }
    }
    if (ch === '"') { output[index] = " "; state = "string"; continue; }
    if (ch === "'") { output[index] = " "; state = "char"; }
  }
  return output.join("");
}

function hasNamespaceScopeMutableDefinition(text) {
  const code = lexicalCodeView(text);
  const namespaceOnlyAt = new Array(code.length + 1);
  const scopes = [];
  for (let index = 0; index < code.length; ++index) {
    namespaceOnlyAt[index] = scopes.every(scope => scope === "namespace");
    if (code[index] === "{") {
      const prefix = code.slice(Math.max(0, index - 256), index);
      scopes.push(/\bnamespace(?:\s+[A-Za-z_][A-Za-z0-9_:]*)?\s*$/.test(prefix)
        ? "namespace" : "other");
    }
    if (code[index] === "}") scopes.pop();
  }
  const pattern = /(?:^|\n)\s*(?!extern\b)(?:(?:static|inline)\s+)*(?:std::mutex\b|std::atomic\s*<|std::unordered_map\s*<|std::map\s*<|std::set\s*<|std::vector\s*<)[^;()]*;/g;
  return [...code.matchAll(pattern)].some(match => {
    const start = match.index + match[0].search(/\S/);
    return namespaceOnlyAt[Math.max(match.index, start)] === true;
  });
}

function cmakeCall(text, command, target) {
  const match = new RegExp(`\\b${command}\\s*\\(\\s*${target}\\b`).exec(text);
  if (!match) throw new Error(`CMake target missing: ${target}`);
  const opening = text.indexOf("(", match.index);
  let depth = 1;
  let cursor = opening + 1;
  for (; cursor < text.length && depth > 0; ++cursor) {
    if (text[cursor] === "(") ++depth;
    if (text[cursor] === ")") --depth;
  }
  if (depth !== 0) throw new Error(`unterminated CMake target: ${target}`);
  return text.slice(opening + 1, cursor - 1);
}

const rollbackSource = execFileSync("git", ["show", `${rollbackCommit}:src/ingress/webrtc_http_server.cpp`], {
  cwd: rootDir,
  encoding: "utf8",
  maxBuffer: 4 * 1024 * 1024,
});
const rollbackDefinitions = definitionInventory(rollbackSource);
const rollbackDefaultArguments = definitionBlocks(rollbackSource)
  .filter(item => !item.isType && item.signature.includes("="))
  .map(item => sha256(item.signature)).sort();
const rollbackConstants = [...rollbackSource.matchAll(/^constexpr [^;\n]+;$/gm)]
  .map(match => sha256(match[0].slice(0, -1))).sort();

check("six-file layout is exact and every mixed owner stays within 15000 lines", () => {
  assert(splitPaths.every(file => fs.existsSync(path.join(sourceRoot, file))), "physical split file missing");
  const helper = read(helperPath);
  const layoutPaths = [...helper.matchAll(/\{ id: "[^"]+", role: "(?:implementation|declaration)", path: "([^"]+)" \}/g)]
    .map(match => match[1]);
  assert(JSON.stringify(layoutPaths) === JSON.stringify(splitPaths), "source bundle split layout/order drift");
  const counts = splitPaths.map(file => ({ file, lines: lineCount(read(file)) }));
  assert(counts.every(item => item.lines > 0 && item.lines <= 15000),
    `split line budget exceeded: ${JSON.stringify(counts)}`);
});

check("private detail declarations keep shared state and singleton ownership ODR-safe", () => {
  const header = read(splitPaths.at(-1));
  const implementations = cppPaths.map(file => read(file));
  const joined = implementations.join("\n");
  const headerDefinitions = definitionInventory(header);
  const headerDefaults = markedDeclarationInventory(header, "prototype", value => value.includes("="));
  const headerConstants = markedDeclarationInventory(header, "constant");
  assert(header.startsWith("#pragma once\n") && headerDefinitions.length === 151,
    `private detail header type/declaration inventory drift: definitions=${headerDefinitions.length}`);
  assert(JSON.stringify(headerDefaults) === JSON.stringify(rollbackDefaultArguments),
    "private detail default-argument inventory drift");
  assert(JSON.stringify(headerConstants) === JSON.stringify(rollbackConstants),
    "private detail constexpr inventory drift");
  assert(!hasNamespaceScopeMutableDefinition(header),
    "private detail header defines namespace-scope mutable state");
  assert(!splitPaths.some(file => /\bnamespace\s*\{/.test(lexicalCodeView(read(file)))),
    "anonymous namespace survived the cross-translation-unit split");
  assert((joined.match(/AnalysisDocumentRegistry& AnalysisRegistry\s*\([^)]*\)\s*\{/g) || []).length === 1 &&
    !header.includes("static AnalysisDocumentRegistry registry;") &&
    (joined.match(/static AnalysisDocumentRegistry registry;/g) || []).length === 1,
  "AnalysisRegistry singleton ownership drift");
  const mutableDefinitions = new Map([
    ["g_web_rtc_metadata_sequence", "std::atomic<std::uint64_t> g_web_rtc_metadata_sequence{0};"],
    ["g_ops_audit_sequence", "std::atomic<std::uint64_t> g_ops_audit_sequence{0};"],
    ["g_ops_audit_mu", "std::mutex g_ops_audit_mu;"],
    ["g_ops_event_review_mu", "std::mutex g_ops_event_review_mu;"],
    ["g_ops_alert_delivery_mu", "std::mutex g_ops_alert_delivery_mu;"],
    ["g_client_live_preference_mu", "std::mutex g_client_live_preference_mu;"],
    ["g_source_health_audit_mu", "std::mutex g_source_health_audit_mu;"],
    ["g_source_health_audit_state", "std::unordered_map<std::string, std::string> g_source_health_audit_state;"],
    ["g_source_health_warning_mu", "std::mutex g_source_health_warning_mu;"],
    ["g_source_health_warning_state", "std::unordered_map<std::string, std::pair<std::string, int>> g_source_health_warning_state;"],
  ]);
  for (const [symbol, definition] of mutableDefinitions) {
    assert((header.match(new RegExp(`extern [^\\n;]*\\b${symbol}\\b[^\\n;]*;`, "g")) || []).length === 1,
      `shared mutable declaration drift: ${symbol}`);
    assert(joined.split(definition).length - 1 === 1,
      `shared mutable definition drift: ${symbol}`);
  }
  for (const file of cppPaths) {
    assert(read(file).split('#include "webrtc_http_server_detail.h"').length - 1 === 1,
      `private detail include count drift: ${file}`);
  }
});

check("rollback split and exact successor definition inventory remain bound", () => {
  const current = splitPaths.filter(file => fs.existsSync(path.join(sourceRoot, file)))
    .flatMap(file => definitionInventory(read(file))).sort();
  const completion = splitPaths.flatMap(file => definitionInventory(gitText(completionSourceCommit, file))).sort();
  const completionBinding = snapshots.completion.physicalSplitBinding;
  const currentBinding = snapshots.current.physicalSplitBinding;
  assert(rollbackDefinitions.length === 1151 &&
    sha256(rollbackDefinitions.join("\n")) ===
      "1127fa03438b96dd134fef7488eebe69e0cf5049fe41bf256674edb6d8e825cd" &&
    snapshots.completion.sourceCommit === completionSourceCommit &&
    completion.length === expectedSuccessorDefinitionCount &&
    completionBinding.definitionCount === expectedSuccessorDefinitionCount &&
    completionBinding.definitionSha256 === expectedSuccessorDefinitionSha256 &&
    sha256(completion.join("\n")) === expectedSuccessorDefinitionSha256 &&
    current.length === currentBinding.definitionCount &&
    sha256(current.join("\n")) === currentBinding.definitionSha256,
  `definition inventory drift: rollback=${rollbackDefinitions.length}/${sha256(rollbackDefinitions.join("\n"))} completion=${completion.length}/${sha256(completion.join("\n"))} current=${current.length}/${sha256(current.join("\n"))}`);
});

check("CMake and owner classifier include every translation unit exactly once", () => {
  const cmake = read("CMakeLists.txt");
  const graphText = read(currentGraphPath);
  const graph = JSON.parse(graphText);
  assert(sha256(graphText) === expectedCurrentGraphSha256,
    "current source owner/CMake graph SHA drift");
  const owner = graph.moduleClassifiers.find(item => item.id === "transport-and-auth-adapter");
  const runtimeTarget = cmakeCall(cmake, "add_library", "media_server_runtime");
  const executableTarget = cmakeCall(cmake, "add_executable", "media_server");
  const graphRuntimeTarget = graph.cmake.targets.find(target => target.id === "media_server_runtime");
  for (const file of cppPaths) {
    assert(cmake.split(file).length - 1 === 1 && runtimeTarget.split(file).length - 1 === 1 &&
      !executableTarget.includes(file), `CMake split source target drift: ${file}`);
    assert(graphRuntimeTarget?.productionSources?.filter(item => item === file).length === 1,
      `stored CMake target source drift: ${file}`);
  }
  for (const file of splitPaths) {
    assert(owner?.exactFiles?.filter(item => item === file).length === 1,
      `transport owner split path drift: ${file}`);
  }
});

check("Slice 32 completion graph keeps direction debt stable while closing the mixed-owner limit", () => {
  const graphText = read(completionGraphPath);
  const graph = JSON.parse(graphText);
  const trackedSplit = graph.mixedOwnershipDebt.filter(item => splitPaths.includes(item.file));
  const appCore = graph.observedModuleEdges.find(item =>
    item.direction === "application-service-interfaces -> core-media-interfaces");
  const transportCore = graph.observedModuleEdges.filter(item =>
    item.direction === "transport-and-auth-adapter -> core-media-interfaces" ||
    item.direction === "transport-and-auth-adapter -> core-utilities");
  assert(sha256(graphText) === expectedGraphSha256 &&
    graph.expectedProductionFiles === 215 && graph.expectedCppFiles === 103 &&
    graph.observedModuleEdges.length === 16 &&
    graph.observedModuleEdges.filter(item => item.allowedByTarget === false).length === 0 &&
    appCore?.witnessCount === 4 && appCore.allowedByTarget === true &&
    transportCore.length === 0 &&
    graph.stronglyConnectedComponents.length === 0 && graph.cmake.targets.length === 2 &&
    graph.cmake.internalTargetSeparation === true && trackedSplit.length === splitPaths.length &&
    trackedSplit.every(item => item.lineCount === lineCount(read(item.file)) && item.lineCount <= 15000),
  "physical split graph or mixed-owner metrics drift");
});

function copyInputs(targetRoot) {
  for (const file of [...splitPaths, helperPath, completionGraphPath, currentGraphPath, snapshotPath,
    "CMakeLists.txt", "scripts/internal/script_arg_utils.mjs"]) {
    const source = path.join(rootDir, file);
    if (!fs.existsSync(source)) continue;
    const target = path.join(targetRoot, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}
function runFixture(targetRoot) {
  return spawnSync(process.execPath, [scriptPath, `--fixture-root=${targetRoot}`, "--skip-mutations"], {
    cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
}
function rejectMutation(id, file, mutate, expectedFailure) {
  const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), `v390-server-split-${id}-`));
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

if (!skipMutations && splitPaths.every(file => fs.existsSync(path.join(rootDir, file)))) {
  check("isolated layout, source, ODR, CMake, classifier, graph, and line-budget mutations fail closed", () => {
    const pristine = fs.mkdtempSync(path.join(os.tmpdir(), "v390-server-split-pristine-"));
    try {
      copyInputs(pristine);
      const run = runFixture(pristine);
      assert(run.status === 0, `pristine fixture failed\n${run.stdout}\n${run.stderr}`);
    } finally { fs.rmSync(pristine, { recursive: true, force: true }); }
    rejectMutation("layout", helperPath,
      text => text.replace(`  { id: "ops-foundation", role: "implementation", path: "${splitPaths[1]}" },\n`, ""),
      "six-file layout is exact");
    rejectMutation("source", splitPaths[1],
      text => text.replace("std::int64_t PtsNsToMs", "std::int64_t PtsNsToMilliseconds"),
      "rollback split and exact successor definition inventory remain bound");
    rejectMutation("enum", splitPaths.at(-1),
      text => text.replace("AnalysisRegistryMutationFailure {\n    None,", "AnalysisRegistryMutationFailure {\n    Unknown,"),
      "rollback split and exact successor definition inventory remain bound");
    rejectMutation("default-argument", splitPaths.at(-1),
      text => text.replace("std::string persistence_stage = {}", "std::string persistence_stage"),
      "private detail declarations keep shared state");
    rejectMutation("constexpr", splitPaths.at(-1),
      text => text.replace("kMaxHttpHeaderBytes = 64 * 1024", "kMaxHttpHeaderBytes = 32 * 1024"),
      "private detail declarations keep shared state");
    rejectMutation("anonymous-namespace", splitPaths[2],
      text => `${text}\nnamespace { int slice12_hidden_owner = 0; }\n`,
      "private detail declarations keep shared state and singleton ownership ODR-safe");
    rejectMutation("anonymous-namespace-newline", splitPaths[2],
      text => `${text}\nnamespace /* split */\n{ int slice12_hidden_owner = 0; }\n`,
      "private detail declarations keep shared state and singleton ownership ODR-safe");
    rejectMutation("header-mutable-state", splitPaths.at(-1),
      text => `${text}\nstd::mutex g_slice12_header_mutex;\n`,
      "private detail declarations keep shared state and singleton ownership ODR-safe");
    rejectMutation("header-static-mutable-state", splitPaths.at(-1),
      text => `${text}\nstatic\nstd::mutex g_slice12_header_static_mutex;\n`,
      "private detail declarations keep shared state and singleton ownership ODR-safe");
    rejectMutation("header-inline-mutable-state", splitPaths.at(-1),
      text => `${text}\ninline std::atomic<int> g_slice12_header_inline_atomic{0};\n`,
      "private detail declarations keep shared state and singleton ownership ODR-safe");
    rejectMutation("duplicate-singleton", splitPaths[2],
      text => `${text}\nAnalysisDocumentRegistry& AnalysisRegistry() { static AnalysisDocumentRegistry registry; return registry; }\n`,
      "private detail declarations keep shared state and singleton ownership ODR-safe");
    rejectMutation("cmake", "CMakeLists.txt",
      text => text.replace(`    ${splitPaths[2]}\n`, ""),
      "CMake and owner classifier");
    rejectMutation("cmake-wrong-target", "CMakeLists.txt",
      text => text.replace(`    ${splitPaths[2]}\n`, "")
        .replace("add_executable(media_server\n", `add_executable(media_server\n    ${splitPaths[2]}\n`),
      "CMake and owner classifier");
    rejectMutation("classifier", currentGraphPath,
      text => text.replace(`        "${splitPaths[2]}",\n`, ""),
      "CMake and owner classifier");
    rejectMutation("graph", completionGraphPath,
      text => text.replace('"expectedProductionFiles": 215', '"expectedProductionFiles": 216'),
      "Slice 32 completion graph keeps direction debt stable");
    rejectMutation("graph-line-count", completionGraphPath,
      text => text.replace('"lineCount": 7777', '"lineCount": 7778'),
      "Slice 32 completion graph keeps direction debt stable");
    rejectMutation("completion-definition-binding", snapshotPath, text => {
      const value = JSON.parse(text);
      value.completion.physicalSplitBinding = structuredClone(value.current.physicalSplitBinding);
      return `${JSON.stringify(value, null, 2)}\n`;
    }, "rollback split and exact successor definition inventory remain bound");
    rejectMutation("current-definition-binding", snapshotPath, text => {
      const value = JSON.parse(text);
      value.current.physicalSplitBinding.definitionSha256 =
        value.completion.physicalSplitBinding.definitionSha256;
      return `${JSON.stringify(value, null, 2)}\n`;
    }, "rollback split and exact successor definition inventory remain bound");
    rejectMutation("line-budget", splitPaths[2],
      text => `${text}${"\n".repeat(15001)}`,
      "six-file layout is exact");
  });
}

for (const item of checks) console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const passed = checks.filter(item => item.status === "PASS").length;
const failed = checks.length - passed;
console.log(`- summary: pass=${passed} fail=${failed}`);
process.exit(failed === 0 ? 0 : 1);
