#!/usr/bin/env node
// REVIEW4-64 Slice 11: split-safe WebRTC HTTP server verifier source bundle gate.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 WebRTC HTTP server source bundle verification

Usage:
  ./server.sh verify-v390-webrtc-http-server-source-bundle
`);
}
assertKnownOptions(rawArgs, ["h", "help", "fixture-root", "skip-mutations"]);

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), "../..");
const skipMutations = rawArgs.includes("--skip-mutations");
const fixtureArg = rawArgs.find(arg => arg.startsWith("--fixture-root="));
const sourceRoot = fixtureArg ? validateFixtureRoot(fixtureArg.slice("--fixture-root=".length)) : rootDir;
const helperPath = "scripts/internal/webrtc_http_server_source_bundle.mjs";
const serverPath = "src/ingress/webrtc_http_server.cpp";
const sourcePaths = [
  serverPath,
  "src/ingress/webrtc_http_server_ops_foundation.cpp",
  "src/ingress/webrtc_http_server_ops_workflows.cpp",
  "src/ingress/webrtc_http_server_ops_incidents.cpp",
  "src/ingress/webrtc_http_server_runtime.cpp",
  "src/ingress/webrtc_http_server_detail.h",
];
const rollbackCommit = "e5df05f3945e43e89ae13e3fdd21d0c83ab78ac8";
const expectedConsumerCount = 170;
const expectedExpressionCount = 188;
const expectedConsumerSha = "1e13a798e01c601114df0287bc552e3681531e3021e81c57307ee99ae458ee1c";
const expectedBundleSha = "1761803bbb08b6d5cd0ebdead3bae60100bc3a6f4bc19b2da7f9e5866736df63";
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
const sha256Text = text => crypto.createHash("sha256").update(text).digest("hex");
const legacyPatterns = [
  /\breadText\(\s*["']src\/ingress\/webrtc_http_server\.cpp["']\s*\)/g,
  /\bread\(\s*["']src\/ingress\/webrtc_http_server\.cpp["']\s*\)/g,
  /\b(?:fs\.)?readFileSync\(\s*["']src\/ingress\/webrtc_http_server\.cpp["']\s*,\s*["']utf8["']\s*\)/g,
];
const migratedPatterns = [
  /\breadWebRtcHttpServerBundle\(\s*readText\s*\)/g,
  /\breadWebRtcHttpServerBundle\(\s*read\s*\)/g,
  /\breadWebRtcHttpServerBundle\(\s*file\s*=>\s*(?:fs\.)?readFileSync\(\s*file\s*,\s*["']utf8["']\s*\)\s*\)/g,
];
const importPattern = /import\s*\{\s*readWebRtcHttpServerBundle\s*\}\s*from\s*["']\.\/webrtc_http_server_source_bundle\.mjs["'];/g;

function legacyExpressionCount(text) {
  return legacyPatterns.reduce((total, pattern) => total + [...text.matchAll(pattern)].length, 0);
}
function baselineConsumers() {
  const files = execFileSync("git", ["ls-tree", "-r", "--name-only", rollbackCommit, "scripts/internal"], {
    cwd: rootDir, encoding: "utf8",
  }).trim().split("\n").filter(file => file.endsWith(".mjs")).sort();
  return files.map(file => ({
    file,
    text: execFileSync("git", ["show", `${rollbackCommit}:${file}`], { cwd: rootDir, encoding: "utf8" }),
  })).map(item => ({
    ...item,
    expressions: legacyExpressionCount(item.text),
    expressionKinds: legacyPatterns.map(pattern => [...item.text.matchAll(pattern)].length),
  }))
    .filter(item => item.expressions > 0);
}
const baseline = baselineConsumers();
const baselineFiles = baseline.map(item => item.file);

check("baseline direct-reader consumer set is exact and rollback-bound", () => {
  assert(baseline.length === expectedConsumerCount &&
    baseline.reduce((sum, item) => sum + item.expressions, 0) === expectedExpressionCount &&
    sha256Text(baselineFiles.join("\n")) === expectedConsumerSha,
  "rollback direct-reader consumer set drift");
});

check("source bundle helper exposes an ordered fail-closed API", () => {
  assert(fs.existsSync(path.join(sourceRoot, helperPath)), "source bundle helper missing");
  const helper = read(helperPath);
  for (const token of [
    "WEBRTC_HTTP_SERVER_SOURCE_LAYOUT", "readWebRtcHttpServerBundle",
    "resolveWebRtcHttpServerSource", "webrtcHttpServerSourceMetrics",
    "duplicate source layout path", "source token resolution failed",
  ]) assert(helper.includes(token), `source bundle helper API missing: ${token}`);
});

check("all 170 readers use the bundle exactly and no unregistered reader is migrated", () => {
  const migrated = [];
  for (const item of baseline) {
    const current = read(item.file);
    const imports = [...current.matchAll(importPattern)].length;
    const calls = (current.match(/\breadWebRtcHttpServerBundle\s*\(/g) || []).length;
    const migratedKinds = migratedPatterns.map(pattern => [...current.matchAll(pattern)].length);
    assert(imports === 1 && calls === item.expressions &&
      JSON.stringify(migratedKinds) === JSON.stringify(item.expressionKinds) &&
      migratedKinds.reduce((sum, count) => sum + count, 0) === calls && legacyExpressionCount(current) === 0,
      `consumer is not exactly migrated: ${item.file}`);
    migrated.push(item.file);
  }
  const currentImports = fs.readdirSync(path.join(sourceRoot, "scripts/internal"))
    .filter(file => file.endsWith(".mjs"))
    .map(file => `scripts/internal/${file}`)
    .filter(file => [...read(file).matchAll(importPattern)].length > 0)
    .sort();
  assert(JSON.stringify(currentImports) === JSON.stringify(migrated),
    "unregistered source bundle consumer migration detected");
});

check("six-file physical metrics and logical-origin bundle are exact", () => {
  const helperUrl = pathToFileURL(path.join(sourceRoot, helperPath)).href;
  const probe = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import crypto from "node:crypto";
    import { readWebRtcHttpServerBundle, resolveWebRtcHttpServerSource,
      webrtcHttpServerSourceMetrics } from ${JSON.stringify(helperUrl)};
    const root = ${JSON.stringify(sourceRoot)};
    const bundle = readWebRtcHttpServerBundle(root);
    const resolved = resolveWebRtcHttpServerSource(root, {
      tokens: ["bool WebRtcHttpServer::Start(const std::string& listen_address",
        "failed to create HTTP socket"],
      purpose: "slice11-probe",
    });
    const resolvedFunction = resolveWebRtcHttpServerSource(root, {
      tokens: ["std::int64_t PtsNsToMs"], purpose: "slice12-prototype-shadow-probe",
    });
    let missing = false;
    try { resolveWebRtcHttpServerSource(root, { tokens: ["__missing_slice11_token__"] }); }
    catch { missing = true; }
    let ambiguous = false;
    try {
      resolveWebRtcHttpServerSource(file => file.endsWith("a.cpp") || file.endsWith("b.cpp")
        ? "shared ambiguous token" : "", {
        tokens: ["shared ambiguous token"],
        layout: [{ id: "a", path: "a.cpp" }, { id: "b", path: "b.cpp" }],
      });
    } catch { ambiguous = true; }
    console.log(JSON.stringify({
      sha: crypto.createHash("sha256").update(bundle).digest("hex"),
      logicalOrder: [bundle.indexOf("struct OpsV350LiveOperationsGraphNode"),
        bundle.indexOf("BuildV350LiveOperationsGraphNodes("),
        bundle.indexOf("struct OpsV380ActionCapabilityContractItem"),
        bundle.indexOf("BuildV380ActionCapabilityContractItems(")],
      metrics: webrtcHttpServerSourceMetrics(root), resolved: resolved.file,
      resolvedFunction: resolvedFunction.file, missing, ambiguous,
    }));
  `], { cwd: sourceRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(probe.status === 0, `source bundle probe failed: ${probe.stderr}`);
  const result = JSON.parse(probe.stdout.trim());
  assert(result.sha === expectedBundleSha &&
    result.resolved === "src/ingress/webrtc_http_server_runtime.cpp" &&
    result.resolvedFunction === "src/ingress/webrtc_http_server_ops_foundation.cpp" &&
    result.logicalOrder.every(index => index >= 0) &&
    result.logicalOrder[0] < result.logicalOrder[1] && result.logicalOrder[2] < result.logicalOrder[3] &&
    result.missing === true && result.ambiguous === true &&
    result.metrics.fileCount === 6 && result.metrics.totalLines === 46619 &&
    result.metrics.largestFileLines === 10150 && result.metrics.totalBytes === 2245565 &&
    JSON.stringify(result.metrics.files.map(item => item.file)) === JSON.stringify(sourcePaths),
  `logical source bundle order, bytes, resolver, or metrics drift: ${JSON.stringify(result)}`);
});

check("physical bundle successor binds the exact production graph", () => {
  const graph = JSON.parse(read("test/fixtures/v390_structure_stabilization_current_graph.json"));
  assert(graph.expectedProductionFiles === 182 && graph.expectedCppFiles === 89 &&
    graph.observedModuleEdges.length === 17 &&
    graph.observedModuleEdges.filter(item => item.allowedByTarget === false).length === 3 &&
    graph.stronglyConnectedComponents.length === 0,
  "source bundle slice changed production graph metrics");
});

function copyInputs(targetRoot) {
  for (const file of [...baselineFiles, helperPath, ...sourcePaths,
    "test/fixtures/v390_structure_stabilization_current_graph.json",
    "scripts/internal/script_arg_utils.mjs"]) {
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
  const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), `v390-server-bundle-${id}-`));
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
  check("isolated consumer, import, bundle, layout, and graph mutations fail closed", () => {
    const pristine = fs.mkdtempSync(path.join(os.tmpdir(), "v390-server-bundle-pristine-"));
    try {
      copyInputs(pristine);
      const run = runFixture(pristine);
      assert(run.status === 0, `pristine fixture failed\n${run.stdout}\n${run.stderr}`);
    } finally { fs.rmSync(pristine, { recursive: true, force: true }); }
    const consumer = baselineFiles[0];
    rejectMutation("legacy-reader", consumer,
      text => text.replace(/readWebRtcHttpServerBundle\(readText\)/,
        'readText("src/ingress/webrtc_http_server.cpp")'),
      "all 170 readers use the bundle exactly");
    rejectMutation("missing-import", consumer,
      text => text.replace(importPattern, ""),
      "all 170 readers use the bundle exactly");
    rejectMutation("callback-removal", consumer,
      text => text.replace(/readWebRtcHttpServerBundle\(readText\)/,
        "readWebRtcHttpServerBundle()"),
      "all 170 readers use the bundle exactly");
    rejectMutation("empty-bundle", helperPath,
      text => text.replace("  return `${prefix.trimEnd()}\\n\\n${chunks.map(item => item.source).join(\"\\n\\n\")}\\n`;", '  return "";'),
      "six-file physical metrics and logical-origin bundle");
    rejectMutation("duplicate-layout", helperPath,
      text => text.replace(`path: "${serverPath}"`, `path: "${serverPath}" },\n  { id: "duplicate", path: "${serverPath}"`),
      "six-file physical metrics and logical-origin bundle");
    rejectMutation("header-first", helperPath,
      text => {
        const line = `  { id: "private-detail", role: "declaration", path: "${sourcePaths.at(-1)}" },\n`;
        return text.replace(line, "").replace(
          "export const WEBRTC_HTTP_SERVER_SOURCE_LAYOUT = Object.freeze([\n",
          `export const WEBRTC_HTTP_SERVER_SOURCE_LAYOUT = Object.freeze([\n${line}`);
      },
      "six-file physical metrics and logical-origin bundle");
    rejectMutation("prototype-shadow", helperPath,
      text => text.replace('{ id: "private-detail", role: "declaration"',
        '{ id: "private-detail", role: "implementation"'),
      "six-file physical metrics and logical-origin bundle");
    rejectMutation("ambiguous-resolver", helperPath,
      text => text.replace("if (matches.length !== 1)", "if (matches.length === 0)"),
      "six-file physical metrics and logical-origin bundle");
    rejectMutation("logical-order", helperPath,
      text => text.replace("left.line - right.line", "right.line - left.line"),
      "six-file physical metrics and logical-origin bundle");
    rejectMutation("logical-origin", sourcePaths[2],
      text => text.replace("WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17051", "WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 99999"),
      "six-file physical metrics and logical-origin bundle");
    rejectMutation("graph", "test/fixtures/v390_structure_stabilization_current_graph.json",
      text => text.replace('"expectedProductionFiles": 182', '"expectedProductionFiles": 183'),
      "physical bundle successor binds the exact production graph");
  });
}

for (const item of checks) console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const passed = checks.filter(item => item.status === "PASS").length;
const failed = checks.length - passed;
console.log(`- summary: pass=${passed} fail=${failed}`);
process.exit(failed === 0 ? 0 : 1);
