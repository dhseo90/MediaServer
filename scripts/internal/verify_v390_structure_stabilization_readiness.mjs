#!/usr/bin/env node
// 파일 용도: v3.9.0 (17) Development 17 구조 안정화 실행 branch, 경계, 의존성, contract, slice gate를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 structure stabilization readiness verification

Usage:
  ./server.sh verify-v390-structure-stabilization-readiness

Checks:
  - v4.0.0 execution branch/base/approval entry conditions
  - module mayDependOn and allowed directions are exact and complete
  - actual src/include include graph and CMake source graph reject new forbidden edges/cycles
  - preserved route/schema/media/auth/registry/UI contracts
  - fixed slice order, entry/exit gates, stop conditions
  - current v3.9.0 step does not execute the refactor
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-structure-stabilization-readiness";
const targetScript = "verify_v390_structure_stabilization_readiness.mjs";
const fixturePath = "test/fixtures/v390_structure_stabilization_readiness.json";
const planPath = "docs/superpowers/plans/2026-07-08-v390-structure-stabilization-handoff.md";
const expectedContracts = [
  "event-post-payload",
  "webrtc-datachannel-metadata",
  "sse-ws-metadata",
  "rtsp-webrtc-media-path",
  "auth-role-scope",
  "source-registry-published-view",
  "rule-profile-payload",
  "http-route-status-error",
  "product-ui-dom-test-id",
];
const expectedSlices = [
  "baseline-and-ownership-map",
  "pure-json-builder-extraction",
  "route-handler-group-extraction",
  "product-ui-workspace-split",
  "source-read-model-boundary",
  "docs-template-and-vlm-index",
];
const checks = [];
const fixture = JSON.parse(read(fixturePath));

check("machine-readable readiness contract is complete", () => {
  const server = read("server.sh");
  assert(fixture.schema === "media-server.v390-structure-stabilization-readiness.v1", "unexpected readiness schema");
  assert(fixture.sourceRelease === "v3.9.0", "source release must be v3.9.0");
  assert(fixture.executionRelease === "v4.0.0", "execution release must be v4.0.0");
  assert(fixture.executionBranch === "v4.0.0", "execution branch must be v4.0.0");
  assert(fixture.currentStepRefactorExecuted === false, "current v3.9 step must not execute refactor");
  assert(fixture.branchCreationPerformed === false, "readiness step must not create a branch");
  assert(fixture.recordKind === "refactor-readiness-gate", "record kind must be refactor-readiness-gate");
  assert(fixture.status === "gate-ready", "readiness status must be gate-ready");
  assert(fixture.implementationStatus === "not-executed", "refactor implementation must remain not-executed");
  assert(fixture.evidenceStatus === "gate-contract-not-refactor-evidence", "readiness evidence status mismatch");
  assert(fixture.requiredApproval === "explicit-structure-refactor-start", "explicit start approval is required");
  assert(Array.isArray(fixture.baseRequirements) && fixture.baseRequirements.length >= 4, "base requirements are incomplete");
  assert(Array.isArray(fixture.moduleBoundaries) && fixture.moduleBoundaries.length >= 9, "module boundaries are incomplete");
  assert(Array.isArray(fixture.allowedDependencyDirections) && fixture.allowedDependencyDirections.length >= 10, "allowed dependency directions are incomplete");
  assert(Array.isArray(fixture.forbiddenDependencies) && fixture.forbiddenDependencies.length >= 5, "forbidden dependency rules are incomplete");
  const contracts = fixture.preservedContracts?.map(item => item.id) || [];
  assert(JSON.stringify(contracts) === JSON.stringify(expectedContracts), "preserved contract order/set mismatch");
  for (const contract of fixture.preservedContracts) {
    assert(Array.isArray(contract.verifiers) && contract.verifiers.length >= 1, `${contract.id}: verifier is required`);
    assert(contract.changeAllowed === false, `${contract.id}: behavior change must remain forbidden`);
    for (const verifier of contract.verifiers) {
      assert(verifier === "build" || server.includes(`  ${verifier})`), `${contract.id}: unknown server command ${verifier}`);
    }
  }
  const slices = fixture.slices?.map(item => item.id) || [];
  assert(JSON.stringify(slices) === JSON.stringify(expectedSlices), "slice order/set mismatch");
  for (const [index, slice] of fixture.slices.entries()) {
    assert(slice.order === index + 1, `${slice.id}: order mismatch`);
    assert(slice.dependsOnSlice === (index === 0 ? null : fixture.slices[index - 1].id),
      `${slice.id}: dependsOnSlice must name the immediately preceding slice`);
    assert(Array.isArray(slice.entryGates) && slice.entryGates.length >= 3, `${slice.id}: entry gates incomplete`);
    assert(Array.isArray(slice.exitGates) && slice.exitGates.length >= 3, `${slice.id}: exit gates incomplete`);
  }
  assert(Array.isArray(fixture.stopConditions) && fixture.stopConditions.length >= 6, "stop conditions are incomplete");
  assert(fixture.graphStatus === "legacy-forbidden-edges-baselined-refactor-not-executed",
    "current graph status must preserve the legacy baseline boundary");
  assert(fixture.refactorEntryReady === false, "legacy graph must not claim refactor entry ready");
});

check("module mayDependOn declarations exactly match allowed dependency directions", () => {
  const ids = new Set(fixture.moduleBoundaries.map(module => module.id));
  assert(ids.size === fixture.moduleBoundaries.length, "module boundary IDs must be unique");
  const declared = [];
  for (const module of fixture.moduleBoundaries) {
    assert(Array.isArray(module.mayDependOn), `${module.id}: mayDependOn must be an array`);
    for (const dependency of module.mayDependOn) {
      assert(ids.has(dependency), `${module.id}: unknown mayDependOn module ${dependency}`);
      assert(dependency !== module.id, `${module.id}: self dependency is forbidden`);
      declared.push(`${module.id} -> ${dependency}`);
    }
  }
  assert(new Set(declared).size === declared.length, "duplicate mayDependOn direction");
  assert(new Set(fixture.allowedDependencyDirections).size === fixture.allowedDependencyDirections.length,
    "duplicate allowed dependency direction");
  assert(JSON.stringify([...declared].sort()) === JSON.stringify([...fixture.allowedDependencyDirections].sort()),
    "mayDependOn and allowedDependencyDirections must be exact bidirectional representations");
});

check("actual include and CMake graphs match the explicit legacy baseline with no new forbidden edge or cycle", () => {
  const graph = collectActualGraph(fixture.actualGraphPolicy);
  const errors = validateActualGraph(graph, fixture.actualGraphPolicy);
  assert(errors.length === 0, errors.join("; "));
  assert(graph.productionFiles.length > 100, "actual production graph is unexpectedly small");
  assert(graph.cmakeSources.length === graph.cppFiles.length,
    "CMake source graph must cover every production .cpp exactly once");
});

check("graph validator rejects a new forbidden include edge and a new cycle", () => {
  const graph = collectActualGraph(fixture.actualGraphPolicy);
  const forbiddenGraph = {
    ...graph,
    includeEdges: [...graph.includeEdges, {
      source: "src/analysis/negative_fixture.cpp",
      include: "ingress/negative_fixture.h",
      from: "analysis-services",
      to: "ingress-or-product-ui",
    }],
  };
  assert(validateActualGraph(forbiddenGraph, fixture.actualGraphPolicy)
    .some(error => error.includes("new forbidden include edge")),
  "new analysis-to-ingress edge negative must fail");

  const cycle = findCycleComponents(
    ["negative-a", "negative-b"],
    [{ from: "negative-a", to: "negative-b" }, { from: "negative-b", to: "negative-a" }],
  );
  assert(cycle.length === 1 && cycle[0].join(",") === "negative-a,negative-b",
    "synthetic dependency cycle negative must be detected");
});

check("handoff plan fixes branch, module, dependency, contract, and slice readiness", () => {
  const plan = read(planPath);
  for (const snippet of [
    "## Development 17 Structure Stabilization Readiness",
    "Execution branch: `v4.0.0`",
    "Current v3.9 refactor execution: `not-run`",
    "Branch creation: `not-performed`",
    "## Module Boundary and Dependency Direction",
    "analysis/core/media -> ingress/product UI 의존 금지",
    "## Contract Preservation Matrix",
    ...expectedContracts.map(id => `\`${id}\``),
    "## Fixed Refactoring Slice Order",
    ...expectedSlices.map(id => `\`${id}\``),
    "## Entry, Exit, and Stop Gates",
    "first failure stops every later slice",
  ]) {
    assert(plan.includes(snippet), `handoff plan missing readiness snippet: ${snippet}`);
  }
});

check("roadmap and evidence expose Development 17 readiness without refactor overclaim", () => {
  const backlog = read("docs/development-backlog.md");
  const inventory = read("docs/project-feature-test-inventory.md");
  const records = read("docs/release-test-records.md");
  const evidence = read("docs/release-evidence-index.md");
  const stream = read("docs/stream-verification.md");
  for (const [label, text, snippets] of [
    ["backlog", backlog, ["structure stabilization implementation readiness", "gate 준비", "구조 안정화 착수 조건", "gate 준비/커밋 `fcfe9f0d`"]],
    ["inventory", inventory, ["SAFE-215", "OPS-182", command]],
    ["records", records, ["V390 Structure Stabilization Readiness", "Development 17 structure readiness final", "Development 17 실제 refactor/UI/longrun"]],
    ["evidence", evidence, ["Development 17 structure stabilization readiness", "SAFE-215", "OPS-182"]],
    ["stream", stream, ["Development 17", command, "gate-ready", "not-executed"]],
  ]) {
    for (const snippet of snippets) assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
  }
});

check("server dispatch exposes the readiness verifier", () => {
  const server = read("server.sh");
  assert(server.includes(command), `server.sh missing ${command}`);
  assert(server.includes(targetScript), `server.sh missing ${targetScript}`);
});

const failed = checks.filter(item => !item.ok);
for (const item of checks) console.log(`[${item.ok ? "pass" : "fail"}] ${item.name}${item.error ? `: ${item.error}` : ""}`);
console.log("\n== v3.9.0 structure stabilization readiness ==");
console.log("- executionBranch: v4.0.0");
console.log("- currentStepRefactorExecuted: false");
console.log("- status: gate-ready");
console.log("- implementationStatus: not-executed");
console.log("- preservedContracts: 9");
console.log("- orderedSlices: 6");
console.log(`- actualProductionFiles: ${collectActualGraph(fixture.actualGraphPolicy).productionFiles.length}`);
console.log("- graphStatus: legacy-forbidden-edges-baselined-refactor-not-executed");
console.log(`- pass: ${checks.length - failed.length}`);
console.log(`- fail: ${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function collectActualGraph(policy) {
  assert(policy && Array.isArray(policy.productionRoots), "actualGraphPolicy.productionRoots is required");
  const productionFiles = policy.productionRoots
    .flatMap(root => walkFiles(path.join(rootDir, root)))
    .map(file => path.relative(rootDir, file).replaceAll(path.sep, "/"))
    .filter(file => policy.sourceExtensions.some(extension => file.endsWith(extension)))
    .sort();
  const productionSet = new Set(productionFiles);
  const includeEdges = [];
  for (const source of productionFiles) {
    const sourceText = read(source);
    for (const match of sourceText.matchAll(/^\s*#\s*include\s*["<]([^">]+)[">]/gm)) {
      const include = match[1];
      const candidates = [
        path.posix.join(path.posix.dirname(source), include),
        `include/${include}`,
        `src/${include}`,
      ].map(candidate => path.posix.normalize(candidate));
      const resolved = candidates.find(candidate => productionSet.has(candidate));
      if (!resolved) {
        assert(!include.startsWith("test/") && !include.startsWith("docs/"),
          `${source}: production include targets non-production path ${include}`);
        continue;
      }
      includeEdges.push({
        source,
        include,
        resolved,
        from: classifyModule(source, policy.moduleClassifiers),
        to: classifyModule(resolved, policy.moduleClassifiers),
      });
    }
  }
  const cmake = read(policy.cmakeFile);
  assert(cmake.includes(`add_executable(${policy.cmakeTarget}`),
    `CMake target missing: ${policy.cmakeTarget}`);
  const cmakeSources = [...cmake.matchAll(/\b(src\/[A-Za-z0-9_./-]+\.cpp)\b/g)]
    .map(match => match[1]);
  const cppFiles = productionFiles.filter(file => file.endsWith(".cpp"));
  const moduleEdges = includeEdges
    .filter(edge => edge.from !== edge.to && policy.cycleModules.includes(edge.from) && policy.cycleModules.includes(edge.to))
    .map(edge => ({ from: edge.from, to: edge.to }));
  return { productionFiles, includeEdges, moduleEdges, cmakeSources, cppFiles };
}

function validateActualGraph(graph, policy) {
  const errors = [];
  const legacyForbidden = new Set(policy.legacyForbiddenIncludeEdges);
  const forbiddenDirections = new Set(policy.forbiddenModuleEdges);
  const observedForbidden = graph.includeEdges
    .filter(edge => forbiddenDirections.has(`${edge.from} -> ${edge.to}`))
    .map(edge => `${edge.source} -> ${edge.include}`)
    .sort();
  for (const edge of observedForbidden) {
    if (!legacyForbidden.has(edge)) errors.push(`new forbidden include edge: ${edge}`);
  }
  for (const edge of legacyForbidden) {
    if (!observedForbidden.includes(edge)) errors.push(`stale legacy forbidden edge baseline: ${edge}`);
  }
  const duplicateCmake = graph.cmakeSources.filter((source, index, all) => all.indexOf(source) !== index);
  if (duplicateCmake.length > 0) errors.push(`duplicate CMake sources: ${[...new Set(duplicateCmake)].join(",")}`);
  const cmakeSet = new Set(graph.cmakeSources);
  const missingCmake = graph.cppFiles.filter(source => !cmakeSet.has(source));
  const unknownCmake = graph.cmakeSources.filter(source => !graph.cppFiles.includes(source));
  if (missingCmake.length > 0) errors.push(`production .cpp missing from CMake: ${missingCmake.join(",")}`);
  if (unknownCmake.length > 0) errors.push(`unknown CMake source: ${unknownCmake.join(",")}`);
  if (graph.cmakeSources.some(source => source.startsWith("test/") || source.startsWith("docs/"))) {
    errors.push("production CMake target includes test fixture or documentation");
  }
  const actualCycles = findCycleComponents(policy.cycleModules, graph.moduleEdges);
  const expectedCycles = policy.legacyCycleComponents.map(component => [...component].sort()).sort(compareArrays);
  if (JSON.stringify(actualCycles) !== JSON.stringify(expectedCycles)) {
    errors.push(`module cycle baseline drift: expected=${JSON.stringify(expectedCycles)} actual=${JSON.stringify(actualCycles)}`);
  }
  return errors;
}

function classifyModule(file, classifiers) {
  const match = classifiers.find(classifier => classifier.prefixes.some(prefix => file.startsWith(prefix)));
  assert(match, `unclassified production file: ${file}`);
  return match.id;
}

function walkFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function findCycleComponents(nodes, edges) {
  const adjacency = new Map(nodes.map(node => [node, []]));
  for (const edge of edges) {
    if (adjacency.has(edge.from) && adjacency.has(edge.to)) adjacency.get(edge.from).push(edge.to);
  }
  let index = 0;
  const indices = new Map();
  const low = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];
  const visit = node => {
    indices.set(node, index);
    low.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);
    for (const next of adjacency.get(node)) {
      if (!indices.has(next)) {
        visit(next);
        low.set(node, Math.min(low.get(node), low.get(next)));
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node), indices.get(next)));
      }
    }
    if (low.get(node) === indices.get(node)) {
      const component = [];
      while (stack.length > 0) {
        const current = stack.pop();
        onStack.delete(current);
        component.push(current);
        if (current === node) break;
      }
      if (component.length > 1) components.push(component.sort());
    }
  };
  for (const node of nodes) if (!indices.has(node)) visit(node);
  return components.sort(compareArrays);
}

function compareArrays(lhs, rhs) {
  return lhs.join("\0").localeCompare(rhs.join("\0"));
}

function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
