#!/usr/bin/env node
// 파일 용도: REVIEW4-64의 실제 6-slice 구조 안정화 실행 원장과 현재 source/graph 결속을 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390-REVIEW4-64 structure stabilization execution

Usage:
  ./server.sh verify-v390-review4-structure-stabilization-execution

Checks:
  - historical REVIEW4-51 approval and current REVIEW4-64 execution are separate
  - six slices are ordered, contiguous, rollback-bound, and do not overclaim later slices
  - current graph hash/metrics and per-slice debt reduction are exact
  - completed composition root owns construction/start/stop while main stays minimal
  - mutations for order, path escape, behavior change, false completion, and debt regression fail closed
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const ledgerPath = "test/fixtures/v390_structure_stabilization_execution.json";
const ledger = readJson(ledgerPath);
const decision = readJson(ledger.approvalDecision.path);
const graph = readJson(ledger.currentGraph.path);
const expectedSlices = [
  "composition-root", "route-api-handler", "registry-domain",
  "ui-script-css", "vlm-parser", "verifier-docs",
];
const expectedContracts = [
  "event-post-payload", "webrtc-datachannel-metadata", "sse-ws-metadata",
  "rtsp-webrtc-media-path", "auth-role-scope", "source-registry-published-view",
  "rule-profile-payload", "http-route-status-error", "product-ui-dom-test-id",
];
const checks = [];

check("historical approval is separate from actual execution", () => {
  assert(ledger.schema === "media-server.v390-structure-stabilization-execution.v3", "execution schema mismatch");
  assert(ledger.issueId === "V390-REVIEW4-64" && ledger.release === "v3.9.0" && ledger.branch === "v3.9.0",
    "execution identity mismatch");
  assert(ledger.recordKind === "refactor-execution-ledger" && ledger.productionRefactorStarted === true &&
    ledger.refactorComplete === false && ledger.completionClaimed === false,
  "execution state overclaim");
  assert(decision.schema === ledger.approvalDecision.schema && decision.decisionId === "V390-REVIEW4-51",
    "historical approval binding mismatch");
  assert(decision.status === "approved-scheduled" && decision.implementationStatus === "not-executed",
    "historical decision was rewritten as execution evidence");
  assert(ledger.status === "in-progress" && ledger.latestCompletedSlice === 1,
    "Slice 1 ledger must remain in-progress");
  for (const record of [ledger.approvalDecision, ledger.historicalReadiness, ledger.historicalGraph]) {
    assert(record.sha256 === sha256File(record.path), `historical record drift: ${record.path}`);
  }
  assert(ledger.currentGraph.path !== ledger.historicalGraph.path, "current graph overwrites historical graph");
  assert(exec("git", ["branch", "--show-current"]) === ledger.branch, "current branch mismatch");
  assert(ledger.executionBase.commit === ledger.rollbackCommit && ledger.executionBase.review4CompletedThrough === 63 &&
    ledger.executionBase.newBranchCreated === false,
  "execution base/rollback boundary mismatch");
  assert(exec("git", ["merge-base", "--is-ancestor", ledger.executionBase.commit, "HEAD"], true).status === 0,
    "execution base is not an ancestor of HEAD");
});

check("slice order and completion frontier are fail-closed", () => {
  const errors = validateLedger(ledger);
  assert(errors.length === 0, errors.join("; "));
  assert(JSON.stringify(ledger.orderedSlices.map(item => item.id)) === JSON.stringify(expectedSlices),
    "slice order mismatch");
  assert(JSON.stringify(ledger.preservedContracts) === JSON.stringify(expectedContracts),
    "preserved contract set/order mismatch");
});

check("current graph hash and metrics are exact", () => {
  assert(ledger.currentGraph.schema === graph.schema, "current graph schema mismatch");
  assert(ledger.currentGraph.sha256 === sha256File(ledger.currentGraph.path), "current graph hash drift");
  const actual = collectCurrentGraph(graph);
  assert(actual.productionFiles.length === graph.expectedProductionFiles, "current production file count drift");
  assert(actual.cppFiles.length === graph.expectedCppFiles, "current cpp count drift");
  assert(actual.ownershipSha256 === graph.expectedFileOwnershipSha256, "current ownership digest drift");
  assert(JSON.stringify(actual.observedModuleEdges) === JSON.stringify(graph.observedModuleEdges),
    "current include edge/witness graph drift");
  assert(JSON.stringify(actual.stronglyConnectedComponents) === JSON.stringify(graph.stronglyConnectedComponents),
    "current SCC graph drift");
  assert(JSON.stringify(actual.targetIds) === JSON.stringify(graph.cmake.targets.map(item => item.id)),
    "current CMake target drift");
  assert(actual.cmakeSources.length === graph.cmake.targets[0].declaredSourceCount &&
    actual.defaultActiveCmakeSources.length === graph.cmake.targets[0].defaultActiveSourceCount,
  "current CMake source count drift");
  for (const debt of graph.mixedOwnershipDebt) {
    assert(lineCount(debt.file) === debt.lineCount, `mixed-owner line count drift: ${debt.file}`);
  }
  const metrics = graphMetrics(graph);
  assert(JSON.stringify(metrics) === JSON.stringify(ledger.currentGraph.metrics),
    `current graph metric drift: expected=${JSON.stringify(ledger.currentGraph.metrics)} actual=${JSON.stringify(metrics)}`);
  assert(metrics.targetViolationDirections < ledger.approvalBaseline.targetViolationDirections,
    "completed production slice did not reduce target violation directions");
  assert(ledger.finalTargets.completionRequired === true &&
    metrics.targetViolationDirections > ledger.finalTargets.maxTargetViolationDirections,
  "in-progress graph falsely satisfies final completion threshold");
});

check("composition root extraction preserves lifecycle ownership", () => {
  const main = readText("src/main.cpp");
  const header = readText("include/application/media_server_application.h");
  const application = readText("src/application/media_server_application.cpp");
  const cmake = readText("CMakeLists.txt");
  assert(main.includes("media_server::application::RunMediaServerApplication(argc, argv)"), "main does not delegate");
  assert(!main.includes("SessionManager") && !main.includes("WebRtcHttpServer") && !main.includes("RunAuthUserCli"),
    "main retains mixed runtime/CLI ownership");
  assert(header.includes("int RunMediaServerApplication(int argc, char** argv);"), "composition root API missing");
  for (const snippet of [
    "core::SessionManager session_manager(registry, resource_guard);",
    "ingress::GStreamerRtspServer gst_rtsp_server(session_manager);",
    "ingress::WebRtcHttpServer webrtc_http_server(session_manager);",
    "gst_rtsp_server.Start(rtsp_port, &server_error)",
    "webrtc_http_server.Start(http_address, http_port, &http_error)",
    "webrtc_http_server.Stop();",
    "gst_rtsp_server.Stop();",
    "analysis::StopEventStorage();",
    "RunAuthUserCli(args)",
  ]) assert(application.includes(snippet), `composition source missing lifecycle anchor: ${snippet}`);
  const httpStop = application.indexOf("webrtc_http_server.Stop();");
  const rtspStop = application.indexOf("gst_rtsp_server.Stop();", httpStop + 1);
  const eventStop = application.indexOf("analysis::StopEventStorage();");
  assert(httpStop >= 0 && rtspStop > httpStop && eventStop > rtspStop, "cleanup order drift");
  assert(cmake.includes("src/application/media_server_application.cpp"), "composition source missing from CMake");
  assert(graph.moduleClassifiers.some(item => item.id === "composition-root" && item.expectedFileCount === 3),
    "composition-root graph owner mismatch");
});

check("dirty worktree paths stay inside the active slice declaration", () => {
  const active = ledger.orderedSlices[ledger.latestCompletedSlice - 1];
  const allowed = new Set(active.allowedFiles);
  const changed = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    cwd: rootDir,
    encoding: "utf8",
  }).trimEnd()
    .split("\n")
    .filter(Boolean)
    .map(line => line.slice(3))
    .map(file => file.includes(" -> ") ? file.split(" -> ").at(-1) : file);
  const outside = changed.filter(file => !allowed.has(file));
  assert(outside.length === 0, `active slice changed undeclared path(s): ${outside.join(",")}`);
  const committed = execFileSync("git", ["diff", "--name-only", `${active.rollbackCommit}..HEAD`], {
    cwd: rootDir,
    encoding: "utf8",
  }).trim().split("\n").filter(Boolean);
  const observed = new Set([...changed, ...committed]);
  for (const file of active.changedFiles) assert(observed.has(file), `declared production change missing: ${file}`);
});

check("historical readiness remains immutable while current order is explicit", () => {
  const readiness = readJson(ledger.historicalReadiness.path);
  assert(readiness.schema === ledger.historicalReadiness.schema && readiness.implementationStatus === "not-executed",
    "historical readiness state drift");
  assert(ledger.planningOrderTransition?.historicalDecisionPreserved === true &&
    ledger.planningOrderTransition?.scope === "slice-identifiers-and-order-only" &&
    ledger.planningOrderTransition?.preservedBoundaries?.length === 4,
  "planning order transition boundary missing");
});

check("negative mutations reject false progress", () => {
  for (const [label, mutate, expected] of [
    ["reordered slice", value => { [value.orderedSlices[0], value.orderedSlices[1]] = [value.orderedSlices[1], value.orderedSlices[0]]; }, "order"],
    ["completion gap", value => { value.orderedSlices[1].status = "completed"; }, "frontier"],
    ["path escape", value => { value.orderedSlices[0].allowedFiles.push("../outside"); }, "path"],
    ["behavior change", value => { value.orderedSlices[0].contractAssertions = []; }, "contract"],
    ["false complete", value => { value.status = "completed"; }, "completion"],
    ["debt regression", value => { value.orderedSlices[0].after.targetViolationDirections = 25; }, "debt"],
  ]) {
    const copy = structuredClone(ledger);
    mutate(copy);
    assert(validateLedger(copy).some(error => error.includes(expected)), `${label} negative was accepted`);
  }
});

for (const item of checks) console.log(`- ${item.status}: ${item.name}`);
console.log(`- summary: pass=${checks.filter(item => item.status === "PASS").length} fail=${checks.filter(item => item.status === "FAIL").length}`);
if (checks.some(item => item.status === "FAIL")) process.exit(1);

function validateLedger(value) {
  const errors = [];
  const slices = value.orderedSlices || [];
  if (JSON.stringify(slices.map(item => item.id)) !== JSON.stringify(expectedSlices) ||
      slices.some((item, index) => item.order !== index + 1)) errors.push("order");
  const completed = slices.filter(item => item.status === "completed");
  if (completed.length !== value.latestCompletedSlice ||
      slices.some((item, index) => item.status === "completed" !== (index < value.latestCompletedSlice))) {
    errors.push("frontier");
  }
  for (const slice of slices) {
    for (const file of slice.allowedFiles || []) {
      if (path.isAbsolute(file) || file.split("/").includes("..")) errors.push(`path:${file}`);
    }
  }
  for (const slice of completed) {
    if (!Array.isArray(slice.contractAssertions) || slice.contractAssertions.length < 4) errors.push(`contract:${slice.id}`);
    if (!Array.isArray(slice.tests) || slice.tests.length < 5 || slice.tests.some(test => test.status !== "pass")) {
      errors.push(`tests:${slice.id}`);
    }
    if (slice.after?.targetViolationDirections >= slice.before?.targetViolationDirections) errors.push(`debt:${slice.id}`);
  }
  const allCompleted = completed.length === expectedSlices.length;
  if ((value.status === "completed") !== allCompleted) errors.push("completion");
  if (value.refactorComplete !== allCompleted || value.completionClaimed !== allCompleted) errors.push("completion");
  return errors;
}

function collectCurrentGraph(value) {
  const productionFiles = value.productionRoots
    .flatMap(root => walkFiles(path.join(rootDir, root)))
    .map(file => path.relative(rootDir, file).replaceAll(path.sep, "/"))
    .filter(file => value.sourceExtensions.some(extension => file.endsWith(extension)))
    .sort();
  const productionSet = new Set(productionFiles);
  const ownership = productionFiles.map(file => ({ file, owner: classifyModule(file, value.moduleClassifiers) }));
  const ownerByFile = new Map(ownership.map(item => [item.file, item.owner]));
  const grouped = new Map();
  for (const source of productionFiles) {
    for (const match of readText(source).matchAll(/^\s*#\s*include\s*["<]([^">]+)[">]/gm)) {
      const include = match[1];
      const candidates = [
        path.posix.join(path.posix.dirname(source), include),
        `include/${include}`,
        `src/${include}`,
      ].map(candidate => path.posix.normalize(candidate));
      const resolved = candidates.find(candidate => productionSet.has(candidate));
      if (!resolved) continue;
      const from = ownerByFile.get(source);
      const to = ownerByFile.get(resolved);
      if (from === to) continue;
      const direction = `${from} -> ${to}`;
      if (!grouped.has(direction)) grouped.set(direction, []);
      grouped.get(direction).push(`${source} -> ${resolved}`);
    }
  }
  const expectedPolicy = new Map(value.observedModuleEdges.map(item => [item.direction, item.allowedByTarget]));
  const observedModuleEdges = [...grouped.entries()].sort(([lhs], [rhs]) => lhs.localeCompare(rhs))
    .map(([direction, witnesses]) => {
      const sorted = [...witnesses].sort();
      return {
        direction,
        witnessCount: sorted.length,
        witnessSha256: sha256Text(sorted.join("\n")),
        allowedByTarget: expectedPolicy.get(direction) === true,
      };
    });
  const moduleEdges = observedModuleEdges.map(item => {
    const [from, to] = item.direction.split(" -> ");
    return { from, to };
  });
  const cmake = readText(value.cmake.file);
  const cmakeSources = [...cmake.matchAll(/\b(src\/[A-Za-z0-9_./-]+\.cpp)\b/g)].map(match => match[1]);
  const executable = cmake.match(/add_executable\s*\(\s*media_server([\s\S]*?)\n\)/)?.[1] || "";
  const defaultActiveCmakeSources = [...executable.matchAll(/\b(src\/[A-Za-z0-9_./-]+\.cpp)\b/g)]
    .map(match => match[1]);
  const targetIds = [...cmake.matchAll(/\badd_(?:executable|library)\s*\(\s*([A-Za-z0-9_.:+-]+)/g)]
    .map(match => match[1]);
  return {
    productionFiles,
    cppFiles: productionFiles.filter(file => file.endsWith(".cpp")),
    ownershipSha256: sha256Text(ownership.map(item => `${item.file}\t${item.owner}`).join("\n")),
    observedModuleEdges,
    stronglyConnectedComponents: findCycleComponents(value.moduleClassifiers.map(item => item.id), moduleEdges),
    cmakeSources,
    defaultActiveCmakeSources,
    targetIds,
  };
}

function classifyModule(file, classifiers) {
  for (const classifier of classifiers) {
    if ((classifier.exactFiles || []).includes(file) ||
        (classifier.prefixes || []).some(prefix => file.startsWith(prefix))) return classifier.id;
  }
  throw new Error(`unclassified production file: ${file}`);
}

function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function findCycleComponents(nodes, edges) {
  const adjacency = new Map(nodes.map(node => [node, []]));
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from).push(edge.to);
  }
  let index = 0;
  const stack = [];
  const indices = new Map();
  const low = new Map();
  const onStack = new Set();
  const components = [];
  function visit(node) {
    indices.set(node, index);
    low.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);
    for (const next of adjacency.get(node) || []) {
      if (!indices.has(next)) {
        visit(next);
        low.set(node, Math.min(low.get(node), low.get(next)));
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node), indices.get(next)));
      }
    }
    if (low.get(node) !== indices.get(node)) return;
    const component = [];
    while (stack.length > 0) {
      const member = stack.pop();
      onStack.delete(member);
      component.push(member);
      if (member === node) break;
    }
    if (component.length > 1) components.push(component.sort());
  }
  for (const node of nodes) if (!indices.has(node)) visit(node);
  return components.sort((lhs, rhs) => lhs.join("\0").localeCompare(rhs.join("\0")));
}

function graphMetrics(value) {
  const violations = value.observedModuleEdges.filter(item => item.allowedByTarget === false).length;
  const largestScc = Math.max(0, ...value.stronglyConnectedComponents.map(item => item.length));
  const largestMixed = Math.max(0, ...value.mixedOwnershipDebt.map(item => item.lineCount));
  return {
    productionFiles: value.expectedProductionFiles,
    cppSources: value.expectedCppFiles,
    moduleOwners: value.moduleClassifiers.length,
    cmakeTargets: value.cmake.targets.length,
    targetViolationDirections: violations,
    largestSccOwners: largestScc,
    largestMixedOwnerFileLines: largestMixed,
    internalTargetSeparation: value.cmake.internalTargetSeparation,
  };
}

function check(name, fn) {
  try { fn(); checks.push({ name, status: "PASS" }); }
  catch (error) { checks.push({ name, status: "FAIL" }); console.error(`[FAIL] ${name}: ${error.message}`); }
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function readText(file) { return fs.readFileSync(path.join(rootDir, file), "utf8"); }
function readJson(file) { return JSON.parse(readText(file)); }
function sha256File(file) { return crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, file))).digest("hex"); }
function sha256Text(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function lineCount(file) { return readText(file).split(/\r?\n/).length - 1; }
function exec(command, args, statusOnly = false) {
  if (statusOnly) return spawnSync(command, args, { cwd: rootDir, encoding: "utf8" });
  return execFileSync(command, args, { cwd: rootDir, encoding: "utf8" }).trim();
}
