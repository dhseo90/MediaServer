#!/usr/bin/env node
// 파일 용도: REVIEW4-64 Slice 11 split-safe WebRTC HTTP server verifier source bundle을 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {
  readWebRtcHttpServerBundle,
  webrtcHttpServerSourceMetrics,
} from "./webrtc_http_server_source_bundle.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 WebRTC HTTP server source bundle verification

Usage:
  ./server.sh verify-v390-webrtc-http-server-source-bundle
`);
}
assertKnownOptions(rawArgs, ["h", "help", "fixture-root", "skip-mutations", "write-current-snapshot"]);

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), "../..");
const skipMutations = rawArgs.includes("--skip-mutations");
const writeCurrentSnapshot = rawArgs.includes("--write-current-snapshot");
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
const snapshotPath = "test/fixtures/v390_webrtc_http_server_source_bundle_snapshots.json";
const completionGraphPath = "test/fixtures/v390_structure_stabilization_slice32_completion_graph.json";
const currentGraphPath = "test/fixtures/v390_structure_stabilization_current_graph.json";
const completionSourceCommit = "b9a45740e60f087cff6ff6d8358994855db8651f";
const currentSourceBaselineCommit = "72c74f4f71bcb3e212082139077aaf8ed3d478fd";
const completionGraphSha256 = "215ce9282593945dc820171348eabc2f06814ce2be4b2abe1dbd632919dd820a";
const currentGraphSha256 = "fd34ace24775ec0ffbd6617bc1ddcee661f50630471626ff57604e5955eebc24";
const rollbackCommit = "e5df05f3945e43e89ae13e3fdd21d0c83ab78ac8";
const expectedConsumerCount = 170;
const expectedExpressionCount = 188;
const expectedConsumerSha = "1e13a798e01c601114df0287bc552e3681531e3021e81c57307ee99ae458ee1c";
const currentOwnerRebindings = new Map([
  ["scripts/internal/verify_vlm_rule_suggestion_draft_workflow.mjs", {
    removedBundleReads: 1,
    owner: "src/ingress/product_ui_server_pages.cpp",
    tokens: ['data-testid="ops-vlm-rule-draft-workflow"', 'data-vlm-rule-draft-contract="draft-only-manual-save"'],
  }],
]);
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
const lineCount = text => text.length === 0 ? 0 :
  text.split(/\r?\n/).length - (text.endsWith("\n") ? 1 : 0);
const gitText = (commit, file) => execFileSync("git", ["show", `${commit}:${file}`], {
  cwd: rootDir, encoding: "utf8",
});
const snapshot = JSON.parse(read(snapshotPath));

function logicalOffsets(bundle) {
  return [
    bundle.indexOf("struct OpsV350LiveOperationsGraphNode"),
    bundle.indexOf("BuildV350LiveOperationsGraphNodes("),
    bundle.indexOf("struct OpsV380ActionCapabilityContractItem"),
    bundle.indexOf("BuildV380ActionCapabilityContractItems("),
  ];
}

function sourceSnapshot(reader) {
  const bundle = readWebRtcHttpServerBundle(reader);
  return {
    bundleSha256: sha256Text(bundle),
    logicalOffsets: logicalOffsets(bundle),
    metrics: webrtcHttpServerSourceMetrics(reader),
  };
}

function probeCurrentBundle() {
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
      bundleSha256: crypto.createHash("sha256").update(bundle).digest("hex"),
      logicalOffsets: [bundle.indexOf("struct OpsV350LiveOperationsGraphNode"),
        bundle.indexOf("BuildV350LiveOperationsGraphNodes("),
        bundle.indexOf("struct OpsV380ActionCapabilityContractItem"),
        bundle.indexOf("BuildV380ActionCapabilityContractItems(")],
      metrics: webrtcHttpServerSourceMetrics(root), resolved: resolved.file,
      resolvedFunction: resolvedFunction.file, missing, ambiguous,
    }));
  `], { cwd: sourceRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert(probe.status === 0, `source bundle probe failed: ${probe.stderr}`);
  return JSON.parse(probe.stdout.trim());
}

function extractBoundedRegion(text, item, label) {
  const startMatches = [...text.matchAll(new RegExp(escapeRegExp(item.startLocator), "g"))];
  const endMatches = [...text.matchAll(new RegExp(escapeRegExp(item.endLocator), "g"))];
  assert(startMatches.length === 1 && endMatches.length === 1,
    `${label}: comment-only locator missing or duplicated`);
  const start = startMatches[0].index + item.startLocator.length;
  const end = endMatches[0].index;
  assert(start <= end, `${label}: comment-only locators are reversed`);
  return {
    region: text.slice(start, end),
    executableSource: text.slice(0, start) + text.slice(end),
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validateOrderedSources(value) {
  assert(value.schema === "media-server.v390-webrtc-http-server-source-bundle-snapshots.v1",
    "source bundle snapshot schema drift");
  assert(Array.isArray(value.orderedSources) && value.orderedSources.length === sourcePaths.length,
    "six-file source order missing or duplicated");
  const files = value.orderedSources.map(item => item.file);
  assert(new Set(files).size === sourcePaths.length &&
    JSON.stringify(files) === JSON.stringify(sourcePaths),
  "six-file source order missing, duplicated, or reordered");
}

function validateCompletionSnapshot(value) {
  const completion = value.completion;
  assert(completion.sourceCommit === completionSourceCommit,
    "completion source commit drift");
  const actual = sourceSnapshot(file => gitText(completionSourceCommit, file));
  assert(actual.bundleSha256 === completion.bundleSha256 &&
    JSON.stringify(actual.logicalOffsets) === JSON.stringify(completion.logicalOffsets) &&
    JSON.stringify(actual.metrics) === JSON.stringify(completion.metrics),
  "immutable completion bundle snapshot drift");
  assert(completion.graphBinding.path === completionGraphPath &&
    completion.graphBinding.sha256 === completionGraphSha256,
  "completion bundle graph binding drift");
}

function currentSnapshotFromSource(value, actual) {
  return {
    sourceBaselineCommit: value.current.sourceBaselineCommit,
    generatedFrom: "working-tree-six-file-source",
    bundleSha256: actual.bundleSha256,
    logicalOffsets: actual.logicalOffsets,
    metrics: actual.metrics,
    graphBinding: {
      path: currentGraphPath,
      sha256: sha256Text(read(currentGraphPath)),
    },
    physicalSplitBinding: value.current.physicalSplitBinding,
  };
}

if (writeCurrentSnapshot) {
  assert(!fixtureArg && !skipMutations, "current snapshot generation only supports the repository root");
  validateOrderedSources(snapshot);
  validateCompletionSnapshot(snapshot);
  const completionBefore = JSON.stringify(snapshot.completion);
  const transitionBefore = JSON.stringify(snapshot.commentOnlyTransition);
  const orderBefore = JSON.stringify(snapshot.orderedSources);
  const next = structuredClone(snapshot);
  next.current = currentSnapshotFromSource(snapshot, probeCurrentBundle());
  assert(next.current.sourceBaselineCommit === currentSourceBaselineCommit,
    "current source baseline commit drift");
  assert(JSON.stringify(next.completion) === completionBefore &&
    JSON.stringify(next.commentOnlyTransition) === transitionBefore &&
    JSON.stringify(next.orderedSources) === orderBefore,
  "current snapshot generator modified immutable completion or historical transition evidence");
  const absolute = path.join(rootDir, snapshotPath);
  const temporary = `${absolute}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`);
  fs.renameSync(temporary, absolute);
  console.log(`updated current WebRTC source bundle snapshot: ${snapshotPath}`);
  process.exit(0);
}
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
    const rebinding = currentOwnerRebindings.get(item.file);
    const removed = rebinding?.removedBundleReads || 0;
    assert(imports === 1 && calls === item.expressions - removed &&
      (removed > 0 || JSON.stringify(migratedKinds) === JSON.stringify(item.expressionKinds)) &&
      migratedKinds.reduce((sum, count) => sum + count, 0) === calls && legacyExpressionCount(current) === 0,
      `consumer is not exactly migrated: ${item.file}`);
    if (rebinding) {
      const owner = read(rebinding.owner);
      assert(rebinding.tokens.every(token => owner.includes(token)),
        `consumer current owner rebinding drift: ${item.file}`);
    }
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

check("completion and current six-file source bundle snapshots are exact", () => {
  validateOrderedSources(snapshot);
  validateCompletionSnapshot(snapshot);
  assert(snapshot.current.sourceBaselineCommit === currentSourceBaselineCommit,
    "current source baseline commit drift");
  const result = probeCurrentBundle();
  assert(result.bundleSha256 === snapshot.current.bundleSha256 &&
    JSON.stringify(result.logicalOffsets) === JSON.stringify(snapshot.current.logicalOffsets) &&
    result.resolved === "src/ingress/webrtc_http_server_runtime.cpp" &&
    result.resolvedFunction === "src/ingress/webrtc_http_server_ops_foundation.cpp" &&
    result.missing === true && result.ambiguous === true &&
    JSON.stringify(result.metrics) === JSON.stringify(snapshot.current.metrics) &&
    JSON.stringify(result.metrics.files.map(item => item.file)) === JSON.stringify(sourcePaths),
  `current logical source bundle order, bytes, resolver, or metrics drift: ${JSON.stringify(result)}`);
});

check("completion-to-current delta is limited to two exact comment regions", () => {
  const transition = snapshot.commentOnlyTransition;
  assert(transition.fromCommit === completionSourceCommit &&
    transition.toCommit === currentSourceBaselineCommit &&
    Array.isArray(transition.files) && transition.files.length === 2,
  "comment-only transition commit or file coverage drift");
  const changed = new Set(transition.files.map(item => item.file));
  assert(changed.size === 2 && changed.has(serverPath) && changed.has(sourcePaths.at(-1)),
    "comment-only transition must cover exactly the two reviewed files");
  let byteDelta = 0;
  let lineDelta = 0;
  let unchanged = 0;
  for (const file of sourcePaths) {
    const completionText = gitText(completionSourceCommit, file);
    const baselineText = gitText(currentSourceBaselineCommit, file);
    const currentText = read(file);
    assert(currentText === baselineText, `current source is not bound to the reviewed baseline commit: ${file}`);
    const item = transition.files.find(entry => entry.file === file);
    if (!item) {
      assert(completionText === currentText, `unreviewed source bundle file changed: ${file}`);
      unchanged += 1;
      continue;
    }
    const completionBounded = extractBoundedRegion(completionText, item, `${file}:completion`);
    const currentBounded = extractBoundedRegion(currentText, item, `${file}:current`);
    const actualByteDelta = Buffer.byteLength(currentText) - Buffer.byteLength(completionText);
    const actualLineDelta = lineCount(currentText) - lineCount(completionText);
    assert(sha256Text(completionText) === item.completionSha256 &&
      sha256Text(currentText) === item.currentSha256 &&
      actualByteDelta === item.byteDelta && actualLineDelta === item.lineDelta &&
      completionBounded.region === item.completionRegion &&
      currentBounded.region === item.currentRegion &&
      sha256Text(completionBounded.region) === item.completionRegionSha256 &&
      sha256Text(currentBounded.region) === item.currentRegionSha256,
    `reviewed comment region digest or metric drift: ${file}`);
    for (const region of [completionBounded.region, currentBounded.region]) {
      assert(region.split("\n").filter(line => line.trim().length > 0)
        .every(line => line.trimStart().startsWith("//")),
      `reviewed region contains executable text: ${file}`);
    }
    assert(completionBounded.executableSource === currentBounded.executableSource &&
      sha256Text(completionBounded.executableSource) === item.executableSourceSha256,
    `executable source changed outside the reviewed comment region: ${file}`);
    byteDelta += actualByteDelta;
    lineDelta += actualLineDelta;
  }
  assert(unchanged === transition.unchangedFileCount &&
    byteDelta === transition.totalByteDelta && lineDelta === transition.totalLineDelta,
  "comment-only aggregate delta drift");
});

check("completion and current bundles bind only their matching structure graphs", () => {
  const completionGraphText = read(completionGraphPath);
  const currentGraphText = read(currentGraphPath);
  const graph = JSON.parse(completionGraphText);
  const currentGraph = JSON.parse(currentGraphText);
  const appCore = graph.observedModuleEdges.find(item =>
    item.direction === "application-service-interfaces -> core-media-interfaces");
  const transportCore = graph.observedModuleEdges.filter(item =>
    item.direction === "transport-and-auth-adapter -> core-media-interfaces" ||
    item.direction === "transport-and-auth-adapter -> core-utilities");
  assert(snapshot.completion.graphBinding.path === completionGraphPath &&
    snapshot.current.graphBinding.path === currentGraphPath &&
    snapshot.completion.graphBinding.sha256 === completionGraphSha256 &&
    snapshot.current.graphBinding.sha256 === currentGraphSha256 &&
    sha256Text(completionGraphText) === completionGraphSha256 &&
    sha256Text(currentGraphText) === currentGraphSha256 &&
    graph.expectedProductionFiles === 215 && graph.expectedCppFiles === 103 &&
    graph.observedModuleEdges.length === 16 &&
    graph.observedModuleEdges.filter(item => item.allowedByTarget === false).length === 0 &&
    appCore?.witnessCount === 4 && appCore.allowedByTarget === true &&
    transportCore.length === 0 &&
    graph.stronglyConnectedComponents.length === 0 &&
    currentGraph.expectedProductionFiles === 215 && currentGraph.expectedCppFiles === 103 &&
    currentGraph.observedModuleEdges.filter(item => item.allowedByTarget === false).length === 0 &&
    currentGraph.stronglyConnectedComponents.length === 0,
  "source bundle completion/current graph boundary drift");
});

check("current snapshot generator preserves completion and historical evidence", () => {
  const source = fs.readFileSync(scriptPath, "utf8");
  const start = source.indexOf("if (writeCurrentSnapshot) {");
  const end = source.indexOf("const legacyPatterns", start);
  assert(start >= 0 && end > start, "current snapshot generator block missing");
  const generator = source.slice(start, end);
  assert(generator.includes("next.current = currentSnapshotFromSource") &&
    generator.includes("current snapshot generator modified immutable completion or historical transition evidence") &&
    [...generator.matchAll(/^\s*fs\.writeFileSync\(/gm)].length === 1 &&
    [...generator.matchAll(/^\s*fs\.renameSync\(/gm)].length === 1,
  "current snapshot generator write boundary drift");
});

function copyInputs(targetRoot) {
  for (const file of [...baselineFiles, helperPath, ...sourcePaths,
    ...new Set([...currentOwnerRebindings.values()].map(item => item.owner)),
    snapshotPath, completionGraphPath, currentGraphPath,
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
      "completion and current six-file source bundle snapshots");
    rejectMutation("duplicate-layout", helperPath,
      text => text.replace(`path: "${serverPath}"`, `path: "${serverPath}" },\n  { id: "duplicate", path: "${serverPath}"`),
      "completion and current six-file source bundle snapshots");
    rejectMutation("header-first", helperPath,
      text => {
        const line = `  { id: "private-detail", role: "declaration", path: "${sourcePaths.at(-1)}" },\n`;
        return text.replace(line, "").replace(
          "export const WEBRTC_HTTP_SERVER_SOURCE_LAYOUT = Object.freeze([\n",
          `export const WEBRTC_HTTP_SERVER_SOURCE_LAYOUT = Object.freeze([\n${line}`);
      },
      "completion and current six-file source bundle snapshots");
    rejectMutation("prototype-shadow", helperPath,
      text => text.replace('{ id: "private-detail", role: "declaration"',
        '{ id: "private-detail", role: "implementation"'),
      "completion and current six-file source bundle snapshots");
    rejectMutation("ambiguous-resolver", helperPath,
      text => text.replace("if (matches.length !== 1)", "if (matches.length === 0)"),
      "completion and current six-file source bundle snapshots");
    rejectMutation("logical-order", helperPath,
      text => text.replace("left.line - right.line", "right.line - left.line"),
      "completion and current six-file source bundle snapshots");
    rejectMutation("logical-origin", sourcePaths[2],
      text => text.replace("WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 17051", "WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 99999"),
      "completion and current six-file source bundle snapshots");
    rejectMutation("completion-graph", completionGraphPath,
      text => text.replace('"expectedProductionFiles": 215', '"expectedProductionFiles": 216'),
      "completion and current bundles bind only their matching structure graphs");
    rejectMutation("current-graph", currentGraphPath,
      text => text.replace('"expectedProductionFiles": 215', '"expectedProductionFiles": 216'),
      "completion and current bundles bind only their matching structure graphs");
    rejectMutation("completion-current-exchange", snapshotPath, text => {
      const value = JSON.parse(text);
      [value.completion, value.current] = [value.current, value.completion];
      return `${JSON.stringify(value, null, 2)}\n`;
    }, "completion and current six-file source bundle snapshots");
    rejectMutation("completion-source-commit", snapshotPath,
      text => text.replace(completionSourceCommit, currentSourceBaselineCommit),
      "completion and current six-file source bundle snapshots");
    rejectMutation("current-file-metric", snapshotPath, text => {
      const value = JSON.parse(text);
      value.current.metrics.files[0].bytes += 1;
      return `${JSON.stringify(value, null, 2)}\n`;
    }, "completion and current six-file source bundle snapshots");
    rejectMutation("current-logical-offset", snapshotPath, text => {
      const value = JSON.parse(text);
      value.current.logicalOffsets[0] += 1;
      return `${JSON.stringify(value, null, 2)}\n`;
    }, "completion and current six-file source bundle snapshots");
    rejectMutation("executable-token", serverPath,
      text => text.replace("const bool parent_exists =", "const bool parent_exists_changed ="),
      "completion-to-current delta is limited to two exact comment regions");
    rejectMutation("completion-graph-bound-to-current", snapshotPath, text => {
      const value = JSON.parse(text);
      value.completion.graphBinding = structuredClone(value.current.graphBinding);
      return `${JSON.stringify(value, null, 2)}\n`;
    }, "completion and current six-file source bundle snapshots");
    rejectMutation("current-graph-bound-to-completion", snapshotPath, text => {
      const value = JSON.parse(text);
      value.current.graphBinding = structuredClone(value.completion.graphBinding);
      return `${JSON.stringify(value, null, 2)}\n`;
    }, "completion and current bundles bind only their matching structure graphs");
    rejectMutation("missing-source", snapshotPath, text => {
      const value = JSON.parse(text);
      value.orderedSources.pop();
      return `${JSON.stringify(value, null, 2)}\n`;
    }, "completion and current six-file source bundle snapshots");
    rejectMutation("reordered-source", snapshotPath, text => {
      const value = JSON.parse(text);
      [value.orderedSources[0], value.orderedSources[1]] =
        [value.orderedSources[1], value.orderedSources[0]];
      return `${JSON.stringify(value, null, 2)}\n`;
    }, "completion and current six-file source bundle snapshots");
    rejectMutation("duplicate-source", snapshotPath, text => {
      const value = JSON.parse(text);
      value.orderedSources[1] = structuredClone(value.orderedSources[0]);
      return `${JSON.stringify(value, null, 2)}\n`;
    }, "completion and current six-file source bundle snapshots");
  });
}

for (const item of checks) console.log(`- ${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
const passed = checks.filter(item => item.status === "PASS").length;
const failed = checks.length - passed;
console.log(`- summary: pass=${passed} fail=${failed}`);
process.exit(failed === 0 ? 0 : 1);
