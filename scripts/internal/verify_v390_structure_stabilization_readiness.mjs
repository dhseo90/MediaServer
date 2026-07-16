#!/usr/bin/env node
// 파일 용도: v3.9.0 (17) Development 17 구조 안정화 실행 branch, 경계, 의존성, contract, slice gate를 검증한다.

import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
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
  - v3.9.0 current branch/base/user approval and REVIEW4-50..63 entry conditions
  - module mayDependOn and allowed directions are exact and complete
  - actual src/include include graph and CMake source graph reject new forbidden edges/cycles
  - preserved route/schema/media/auth/registry/UI contracts
  - fixed slice order, entry/exit gates, stop conditions
  - REVIEW4-51 authorizes but does not execute the REVIEW4-64 refactor
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-structure-stabilization-readiness";
const targetScript = "verify_v390_structure_stabilization_readiness.mjs";
const fixturePath = "test/fixtures/v390_structure_stabilization_readiness.json";
const scopeDecisionPath = "test/fixtures/v390_structure_execution_scope_decision.json";
const executionPath = "test/fixtures/v390_structure_stabilization_execution.json";
const currentGraphCommand = "verify-v390-review4-structure-stabilization-execution";
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
const actualGraphFixture = JSON.parse(read(fixture.actualGraphEvidence.path));
const execution = JSON.parse(read(executionPath));
const currentGraph = JSON.parse(read(execution.currentGraph.path));

check("machine-readable readiness contract is complete", () => {
  const server = read("server.sh");
  assert(fixture.schema === "media-server.v390-structure-stabilization-readiness.v2", "unexpected readiness schema");
  assert(fixture.sourceRelease === "v3.9.0", "source release must be v3.9.0");
  assert(fixture.executionRelease === "v3.9.0", "execution release must be v3.9.0");
  assert(fixture.executionBranch === "v3.9.0", "execution branch must be v3.9.0");
  assert(fixture.currentStepRefactorExecuted === false, "REVIEW4-51 must not claim refactor execution");
  assert(fixture.branchCreationPerformed === false, "current-branch decision must not create a branch");
  assert(fixture.recordKind === "refactor-readiness-gate", "record kind must be refactor-readiness-gate");
  assert(fixture.status === "approved-scheduled-after-review4-50-63", "readiness approval status mismatch");
  assert(fixture.implementationStatus === "not-executed", "refactor implementation must remain not-executed");
  assert(fixture.evidenceStatus === "approved-decision-contract-not-refactor-evidence", "readiness evidence status mismatch");
  assert(fixture.requiredApproval === "approved-by-latest-user-instruction", "latest user approval is required");
  assert(Array.isArray(fixture.baseRequirements) && fixture.baseRequirements.length >= 4, "base requirements are incomplete");
  assert(Array.isArray(fixture.moduleBoundaries) && fixture.moduleBoundaries.length >= 9, "module boundaries are incomplete");
  assert(Array.isArray(fixture.allowedDependencyDirections) && fixture.allowedDependencyDirections.length >= 10, "allowed dependency directions are incomplete");
  assert(Array.isArray(fixture.forbiddenDependencies) && fixture.forbiddenDependencies.length >= 5, "forbidden dependency rules are incomplete");
  const contracts = fixture.preservedContracts?.map(item => item.id) || [];
  assert(JSON.stringify(contracts) === JSON.stringify(expectedContracts), "preserved contract order/set mismatch");
  const changeAllowed = fixture.preservedContracts.some((contract) => contract.changeAllowed === true);
  const behaviorChangeForbidden = changeAllowed === false;
  assert(behaviorChangeForbidden && changeAllowed === false,
    "preserved contracts must not allow behavior changes");
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
  assert(fixture.graphStatus === "actual-monolith-cyclic-target-violations-baselined-refactor-not-executed",
    "current graph status must preserve the legacy baseline boundary");
  assert(fixture.refactorEntryReady === false, "legacy graph must not claim refactor entry ready");
  assert(fixture.actualGraphEvidence?.schema === "media-server.v390-actual-module-dependency-graph.v1",
    "actual graph evidence schema binding mismatch");
  assert(actualGraphFixture.schema === fixture.actualGraphEvidence.schema, "actual graph fixture schema mismatch");
  assert(actualGraphFixture.moduleClassifiers?.length === 9,
    "actual graph must classify all nine declared module owners");
  assert(actualGraphFixture.expectedProductionFiles === 148,
    "actual graph production file count is not pinned");
  assert(actualGraphFixture.cmake?.targets?.length === 1,
    "actual graph build target inventory is not pinned");
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

check("current REVIEW4-64 source and CMake graph match the completed execution ledger", () => {
  const graphRun = spawnSync(path.join(rootDir, "server.sh"), [currentGraphCommand, "--graph-only"], {
    cwd: rootDir,
    encoding: "utf8",
    env: process.env,
  });
  if (graphRun.error) throw graphRun.error;
  assert(graphRun.signal === null && graphRun.status === 0,
    `current graph gate failed (exit=${graphRun.status}, stderr=${graphRun.stderr || "none"})`);
  assert(graphRun.stdout.includes("current graph negative mutations reject forbidden edge and cycle"),
    "current graph gate did not execute the forbidden-edge/cycle negative");
  assert(execution.currentGraph.schema === currentGraph.schema &&
    execution.currentGraph.sha256 === sha256File(path.join(rootDir, execution.currentGraph.path)),
  "current graph path/schema/hash binding mismatch");
  assert(currentGraph.expectedProductionFiles === 215 && currentGraph.expectedCppFiles === 103 &&
    currentGraph.moduleClassifiers?.length === 10 && currentGraph.cmake?.targets?.length === 2,
  "current graph inventory mismatch");
  assert(execution.currentGraph.metrics?.productionFiles === 215 && execution.currentGraph.metrics?.targetViolationDirections === 0 &&
    execution.currentGraph.metrics?.cppSources === 103 &&
    execution.currentGraph.metrics?.moduleOwners === 10 &&
    execution.currentGraph.metrics?.cmakeTargets === 2 &&
    execution.currentGraph.metrics?.largestSccOwners === 0 &&
    execution.currentGraph.metrics?.internalTargetSeparation === true,
  "completed REVIEW4-64 " +
    "graph metrics mismatch");
});

check("historical REVIEW4-51 decision/readiness remain frozen and separate from current completion", () => {
  assert(fs.existsSync(path.join(rootDir, scopeDecisionPath)), "structure execution scope decision fixture missing");
  const decision = JSON.parse(read(scopeDecisionPath));
  assert(decision.schema === "media-server.v390-structure-execution-scope-decision.v2",
    "structure execution scope decision schema mismatch");
  assert(fixture.executionScopeDecision?.path === scopeDecisionPath &&
    fixture.executionScopeDecision?.schema === decision.schema,
  "readiness/decision source binding mismatch");
  assert(decision.decision === "execute-actual-refactor-in-v3.9.0-after-review4-50-63" &&
    fixture.executionScopeDecision.decision === decision.decision,
  "structure execution release decision mismatch");
  assert(decision.status === "approved-scheduled" && decision.implementationStatus === "not-executed",
    "structure decision status overclaims implementation");
  assert(decision.approval?.approved === true && decision.approval?.source === "latest-user-instruction",
    "latest explicit user approval missing");
  assert(decision.approval?.v400TransferAllowed === false, "v4.0 transfer must be disabled");
  assert(decision.executionBase?.commit === "027678bab9ef75f809c1aeac2061d785c5f6f8b2" &&
    decision.executionBase?.branch === "v3.9.0" && decision.executionBase?.newBranchRequired === false &&
    decision.executionBase?.branchCreationPerformed === false && fixture.branchCreationPerformed === false,
  "current v3.9 base/branch boundary mismatch");
  assert(decision.actualGraph?.path === fixture.actualGraphEvidence.path &&
    decision.actualGraph?.schema === actualGraphFixture.schema,
  "decision actual graph path/schema mismatch");
  assert(decision.actualGraph.sha256 === sha256File(path.join(rootDir, decision.actualGraph.path)),
    "decision actual graph hash drift");
  const historicalViolations = actualGraphFixture.observedModuleEdges.filter(item => !item.allowedByTarget).length;
  const historicalLargestScc = Math.max(0,
    ...actualGraphFixture.stronglyConnectedComponents.map(item => item.length));
  const mixedByFile = new Map(actualGraphFixture.mixedOwnershipDebt.map(item => [item.file, item.lineCount]));
  assert(decision.actualGraph.productionFiles === actualGraphFixture.expectedProductionFiles &&
    decision.actualGraph.declaredCppSources === actualGraphFixture.expectedCppFiles &&
    decision.actualGraph.defaultActiveCppSources === actualGraphFixture.cmake.targets
      .reduce((sum, target) => sum + target.defaultActiveSourceCount, 0) &&
    decision.actualGraph.moduleOwners === actualGraphFixture.moduleClassifiers.length &&
    decision.actualGraph.cmakeTargets === actualGraphFixture.cmake.targets.length &&
    decision.actualGraph.targetViolationDirections === historicalViolations &&
    decision.actualGraph.largestSccOwners === historicalLargestScc &&
    decision.actualGraph.webrtcHttpServerLines === mixedByFile.get("src/ingress/webrtc_http_server.cpp") &&
    decision.actualGraph.productUiPageScriptsLines === mixedByFile.get("src/ingress/product_ui_page_scripts.cpp"),
  "decision actual graph metrics mismatch");
  assert(decision.riskRecord?.acceptedDespiteReleaseLineThresholds === true &&
    decision.riskRecord?.actualFactors?.length === 4 &&
    decision.riskRecord.actualFactors.every(item => item.result === "approved-with-hard-gates"),
  "high-risk explicit acceptance record mismatch");
  assert(historicalViolations > decision.riskRecord.baselineThresholds.maxTargetViolationDirections &&
    historicalLargestScc > decision.riskRecord.baselineThresholds.maxSccOwners &&
    decision.actualGraph.webrtcHttpServerLines > decision.riskRecord.baselineThresholds.maxMixedOwnerFileLines &&
    actualGraphFixture.cmake.internalTargetSeparation === false,
  "accepted high-risk graph factors are not bound to actual evidence");
  assert(decision.v390Execution?.mode === "approved-actual-refactor-after-review4-50-63" &&
    fixture.executionScopeDecision.v390Mode === decision.v390Execution.mode,
  "v3.9 structure scope mode mismatch");
  assert(decision.v390Execution?.release === "v3.9.0" && decision.v390Execution?.branch === "v3.9.0",
    "v3.9 execution release/branch mismatch");
  assert(JSON.stringify(decision.v390Execution.orderedSlices) === JSON.stringify(expectedSlices),
    "v3.9 execution slice order mismatch");
  assert(decision.v390Execution.entryConditions.some(item => item.includes("REVIEW4-50 through V390-REVIEW4-63")),
    "50..63 prerequisite missing");
  assert(JSON.stringify(decision.preservedContractIds) === JSON.stringify(expectedContracts),
    "decision preserved contract order/set mismatch");
  assert(decision.finalAcceptance?.id === "V390-REVIEW4-65" &&
    decision.finalAcceptance?.approved === true && decision.finalAcceptance?.runAfterRefactor === true,
  "post-refactor final acceptance approval mismatch");
  assert(execution.status === "completed" && execution.refactorComplete === true &&
    execution.completionClaimed === true && execution.currentContinuation?.status === "completed" &&
    execution.currentContinuation?.latestCompletedSlice === 32 &&
    execution.currentContinuation?.architectureStatus === "final-targets-satisfied" &&
    execution.currentContinuation?.finalCompletionClaimAllowed === true,
  "current REVIEW4-64 completion oracle mismatch");
  assert(execution.orderedSlices?.[5]?.id === "verifier-docs" &&
    execution.orderedSlices[5].status === "not-started" &&
    execution.historicalSixSliceDecision?.executionOrCompletionEvidence === false,
  "historical six-slice Slice 6 record was rewritten as current completion evidence");
  assert(execution.parkedGeneratedEvidenceArtifacts?.ownerIssue === "V390-REVIEW4-65" &&
    execution.parkedGeneratedEvidenceArtifacts?.completionEvidence === false &&
    execution.parkedGeneratedEvidenceArtifacts?.excludedFromReview4Completion === true,
  "REVIEW4-65 generated acceptance artifacts are not separated from REVIEW4-64 completion");
  for (const [label, text, snippets] of [
    ["backlog", read("docs/development-backlog.md"), ["V390-REVIEW4-51", "current `v3.9.0` branch", "64 뒤 65 acceptance"]],
    ["records", read("docs/release-test-records.md"), ["V390-REVIEW4-51", "base `027678ba`", "64 후 65 acceptance"]],
    ["evidence", read("docs/release-evidence-index.md"), ["V390-REVIEW4-51", "approved-actual-refactor-after-review4-50-63", "V390-REVIEW4-65"]],
    ["stream", read("docs/stream-verification.md"), ["V390-REVIEW4-51", "approved-actual-refactor-after-review4-50-63", "V390-REVIEW4-65"]],
  ]) {
    for (const snippet of snippets) {
      assert(text.includes(snippet), `${label} missing structure decision snippet: ${snippet}`);
    }
  }
});

check("handoff plan fixes branch, module, dependency, contract, and slice readiness", () => {
  const plan = read(planPath);
  for (const snippet of [
    "## Development 17 Structure Stabilization Readiness",
    "Execution branch: `v3.9.0`",
    "Historical readiness snapshot execution: `not-run`",
    "Current v3.9 refactor execution: `completed`",
    "Current v3.9 refactor continuation: `completed` (Slice 32, final target 충족, 구조 테스트·cleanup PASS)",
    "Branch creation: `not-performed`",
    "## Module Boundary and Dependency Direction",
    "## Current actual graph baseline (V390-REVIEW3-48)",
    "test/fixtures/v390_actual_module_dependency_graph.json",
    "target architecture 위반 direction",
    "8-owner 1개",
    "test/fixtures/v390_structure_stabilization_current_graph.json",
    "production 215파일/C++ 103개/owner 10개",
    "## Structure execution scope decision (V390-REVIEW4-51)",
    "execute-actual-refactor-in-v3.9.0-after-review4-50-63",
    "approved-actual-refactor-after-review4-50-63",
    "approved-by-latest-user-instruction",
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

check("roadmap and evidence preserve historical readiness and expose current REVIEW4-64 completion", () => {
  const backlog = read("docs/development-backlog.md");
  const inventory = read("docs/project-feature-test-inventory.md");
  const records = read("docs/release-test-records.md");
  const evidence = read("docs/release-evidence-index.md");
  const stream = read("docs/stream-verification.md");
  for (const [label, text, snippets] of [
    ["backlog", backlog, ["structure stabilization implementation readiness", "gate 준비", "V390-REVIEW4-64 current continuation Slice 32", "REVIEW4-64 구조 개발은 완료됐지만 parked evidence를 확정하는 REVIEW4-65 독립 acceptance PASS는 아닙니다"]],
    ["inventory", inventory, ["SAFE-215", "OPS-182", command]],
    ["records", records, ["V390 Structure Stabilization Readiness", "Development 17 structure readiness final", "V390-REVIEW4-64 continuation Slice 32 WebRTC media application final", "65 독립 acceptance PASS는 아닙니다"]],
    ["evidence", evidence, ["Development 17 structure stabilization readiness", "SAFE-215", "OPS-182"]],
    ["stream", stream, ["Development 17", command, "approved-scheduled-after-review4-50-63", "not-executed"]],
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
console.log("- executionBranch: v3.9.0");
console.log("- historicalReadinessStatus: approved-scheduled-after-review4-50-63/not-executed");
console.log("- currentReview4Status: completed");
console.log("- review4AcceptanceStatus: pending");
console.log("- preservedContracts: 9");
console.log("- historicalOrderedSlices: 6 (Slice 6 not-started record preserved)");
console.log(`- actualProductionFiles: ${currentGraph.expectedProductionFiles}`);
console.log(`- actualCppSources: ${currentGraph.expectedCppFiles}`);
console.log(`- actualModuleOwners: ${currentGraph.moduleClassifiers.length}`);
console.log(`- actualTargetCount: ${currentGraph.cmake.targets.length}`);
console.log(`- targetViolationDirections: ${execution.currentGraph.metrics.targetViolationDirections}`);
console.log(`- largestSccOwners: ${execution.currentGraph.metrics.largestSccOwners}`);
console.log("- graphStatus: final-targets-satisfied");
console.log(`- pass: ${checks.length - failed.length}`);
console.log(`- fail: ${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function collectActualGraph(graphFixture) {
  assert(graphFixture && Array.isArray(graphFixture.productionRoots), "actual graph productionRoots is required");
  const productionFiles = graphFixture.productionRoots
    .flatMap(root => walkFiles(path.join(rootDir, root)))
    .map(file => path.relative(rootDir, file).replaceAll(path.sep, "/"))
    .filter(file => graphFixture.sourceExtensions.some(extension => file.endsWith(extension)))
    .sort();
  const productionSet = new Set(productionFiles);
  const ownership = productionFiles.map(file => ({
    file,
    owner: classifyModule(file, graphFixture.moduleClassifiers),
  }));
  const ownerByFile = new Map(ownership.map(item => [item.file, item.owner]));
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
        from: ownerByFile.get(source),
        to: ownerByFile.get(resolved),
      });
    }
  }
  const cmake = read(graphFixture.cmake.file);
  const cmakeSources = [...cmake.matchAll(/\b(src\/[A-Za-z0-9_./-]+\.cpp)\b/g)]
    .map(match => match[1]);
  const executableBlock = cmake.match(/add_executable\s*\(\s*media_server([\s\S]*?)\n\)/)?.[1] || "";
  const defaultActiveCmakeSources = [...executableBlock.matchAll(/\b(src\/[A-Za-z0-9_./-]+\.cpp)\b/g)]
    .map(match => match[1]);
  const cppFiles = productionFiles.filter(file => file.endsWith(".cpp"));
  const targetIds = [...cmake.matchAll(/\badd_(?:executable|library)\s*\(\s*([A-Za-z0-9_.:+-]+)/g)]
    .map(match => match[1]);
  const externalLinkEdges = [];
  for (const match of cmake.matchAll(/target_link_libraries\s*\(\s*([A-Za-z0-9_.:+-]+)\s+PRIVATE\s+([^\)]+)\)/g)) {
    for (const dependency of match[2].trim().split(/\s+/)) {
      externalLinkEdges.push(`${match[1]} -> ${dependency}`);
    }
  }
  const groupedEdges = new Map();
  for (const edge of includeEdges.filter(item => item.from !== item.to)) {
    const direction = `${edge.from} -> ${edge.to}`;
    if (!groupedEdges.has(direction)) groupedEdges.set(direction, []);
    groupedEdges.get(direction).push(`${edge.source} -> ${edge.resolved}`);
  }
  const allowed = new Set(fixture.allowedDependencyDirections);
  const observedModuleEdges = [...groupedEdges.entries()].sort(([lhs], [rhs]) => lhs.localeCompare(rhs))
    .map(([direction, witnesses]) => {
      const sorted = [...witnesses].sort();
      return {
        direction,
        witnessCount: sorted.length,
        witnessSha256: sha256Text(sorted.join("\n")),
        allowedByTarget: allowed.has(direction),
      };
    });
  const moduleIds = graphFixture.moduleClassifiers.map(item => item.id);
  const moduleEdges = observedModuleEdges.map(item => {
    const [from, to] = item.direction.split(" -> ");
    return { from, to };
  });
  return {
    productionFiles,
    ownership,
    ownershipSha256: sha256Text(ownership.map(item => `${item.file}\t${item.owner}`).join("\n")),
    includeEdges,
    observedModuleEdges,
    moduleEdges,
    cmakeSources,
    defaultActiveCmakeSources,
    cppFiles,
    targetIds,
    externalLinkEdges,
    stronglyConnectedComponents: findCycleComponents(moduleIds, moduleEdges),
  };
}

function validateActualGraph(graph, graphFixture, readinessFixture) {
  const errors = [];
  const declaredModuleIds = readinessFixture.moduleBoundaries.map(item => item.id).sort();
  const actualModuleIds = graphFixture.moduleClassifiers.map(item => item.id).sort();
  if (JSON.stringify(declaredModuleIds) !== JSON.stringify(actualModuleIds)) {
    errors.push(`declared/actual module owner mismatch: declared=${declaredModuleIds} actual=${actualModuleIds}`);
  }
  if (graph.productionFiles.length !== graphFixture.expectedProductionFiles) {
    errors.push(`production file count drift: expected=${graphFixture.expectedProductionFiles} actual=${graph.productionFiles.length}`);
  }
  if (graph.cppFiles.length !== graphFixture.expectedCppFiles) {
    errors.push(`production cpp count drift: expected=${graphFixture.expectedCppFiles} actual=${graph.cppFiles.length}`);
  }
  if (graph.ownershipSha256 !== graphFixture.expectedFileOwnershipSha256) {
    errors.push(`file ownership digest drift: expected=${graphFixture.expectedFileOwnershipSha256} actual=${graph.ownershipSha256}`);
  }
  for (const classifier of graphFixture.moduleClassifiers) {
    const owned = graph.ownership.filter(item => item.owner === classifier.id);
    const cppCount = owned.filter(item => item.file.endsWith(".cpp")).length;
    if (owned.length !== classifier.expectedFileCount) {
      errors.push(`${classifier.id} file count drift: expected=${classifier.expectedFileCount} actual=${owned.length}`);
    }
    if (cppCount !== classifier.expectedCppCount) {
      errors.push(`${classifier.id} cpp count drift: expected=${classifier.expectedCppCount} actual=${cppCount}`);
    }
    for (const exact of classifier.exactFiles || []) {
      if (!graph.productionFiles.includes(exact)) errors.push(`${classifier.id} exact owner file missing: ${exact}`);
      else if (classifyModule(exact, graphFixture.moduleClassifiers) !== classifier.id) {
        errors.push(`${classifier.id} exact owner precedence mismatch: ${exact}`);
      }
    }
  }
  const expectedEdges = JSON.stringify(graphFixture.observedModuleEdges);
  const actualEdges = JSON.stringify(graph.observedModuleEdges);
  if (actualEdges !== expectedEdges) {
    const expectedDirections = new Set(graphFixture.observedModuleEdges.map(item => item.direction));
    for (const item of graph.observedModuleEdges) {
      if (!item.allowedByTarget && !expectedDirections.has(item.direction)) {
        errors.push(`new target-violation direction: ${item.direction}`);
      }
    }
    errors.push("module edge witness baseline drift");
  }
  const legacyForbidden = new Set(graphFixture.legacyForbiddenIncludeEdges);
  const observedWitnesses = new Set(graph.includeEdges.map(edge => `${edge.source} -> ${edge.resolved}`));
  for (const edge of legacyForbidden) {
    if (!observedWitnesses.has(edge)) errors.push(`stale legacy forbidden edge baseline: ${edge}`);
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
  const expectedTargets = graphFixture.cmake.targets.map(item => item.id);
  if (JSON.stringify(graph.targetIds) !== JSON.stringify(expectedTargets)) {
    errors.push(`CMake target set drift: expected=${expectedTargets} actual=${graph.targetIds}`);
  }
  const target = graphFixture.cmake.targets[0];
  if (graph.cmakeSources.length !== target.declaredSourceCount) {
    errors.push(`CMake declared source count drift: expected=${target.declaredSourceCount} actual=${graph.cmakeSources.length}`);
  }
  if (graph.defaultActiveCmakeSources.length !== target.defaultActiveSourceCount) {
    errors.push(`CMake default active source count drift: expected=${target.defaultActiveSourceCount} actual=${graph.defaultActiveCmakeSources.length}`);
  }
  const cmakeText = read(graphFixture.cmake.file);
  for (const conditional of target.conditionalSources || []) {
    if (!cmakeText.includes(`option(${conditional.option}`) ||
        !cmakeText.includes(`${conditional.option} \"Enable`) ||
        !cmakeText.includes(`${conditional.default})`)) {
      errors.push(`CMake conditional option/default drift: ${conditional.option}`);
    }
    if (!graph.cmakeSources.includes(conditional.path) || graph.defaultActiveCmakeSources.includes(conditional.path)) {
      errors.push(`CMake conditional source boundary drift: ${conditional.path}`);
    }
  }
  const targetOwners = [...new Set(graph.cmakeSources.map(source => classifyModule(source, graphFixture.moduleClassifiers)))].sort();
  const expectedTargetOwners = [...graphFixture.cmake.targets[0].moduleOwners].sort();
  if (JSON.stringify(targetOwners) !== JSON.stringify(expectedTargetOwners)) {
    errors.push(`CMake target module owner drift: expected=${expectedTargetOwners} actual=${targetOwners}`);
  }
  if (graphFixture.cmake.internalTargetSeparation !== false || graphFixture.cmake.targets.some(item => item.internalModuleTarget !== false)) {
    errors.push("actual single-target graph falsely claims internal module target separation");
  }
  if (JSON.stringify([...graph.externalLinkEdges].sort()) !== JSON.stringify([...graphFixture.cmake.externalLinkEdges].sort())) {
    errors.push(`external link edge drift: actual=${JSON.stringify(graph.externalLinkEdges)}`);
  }
  const expectedCycles = graphFixture.stronglyConnectedComponents.map(component => [...component].sort()).sort(compareArrays);
  if (JSON.stringify(graph.stronglyConnectedComponents) !== JSON.stringify(expectedCycles)) {
    errors.push(`module SCC baseline drift: expected=${JSON.stringify(expectedCycles)} actual=${JSON.stringify(graph.stronglyConnectedComponents)}`);
  }
  const sliceIds = readinessFixture.slices.map(item => item.id);
  if (JSON.stringify(graphFixture.sliceBindings.map(item => item.id)) !== JSON.stringify(sliceIds)) {
    errors.push("actual graph slice entry/exit binding order mismatch");
  }
  const moduleIds = new Set(actualModuleIds);
  for (const slice of graphFixture.sliceBindings) {
    if (!slice.exitRule) errors.push(`${slice.id} graph exit rule missing`);
    if (slice.nonProductionSlice !== true && (!Array.isArray(slice.entryOwners) || slice.entryOwners.length === 0)) {
      errors.push(`${slice.id} graph entry owner set missing`);
    }
    for (const owner of slice.entryOwners || []) {
      if (!moduleIds.has(owner)) errors.push(`${slice.id} unknown graph entry owner: ${owner}`);
    }
  }
  for (const debt of graphFixture.mixedOwnershipDebt || []) {
    const filePath = path.join(rootDir, debt.file);
    if (!fs.existsSync(filePath)) errors.push(`mixed ownership debt file missing: ${debt.file}`);
    else {
      const lineCount = fs.readFileSync(filePath, "utf8").split(/\r?\n/).length - 1;
      if (lineCount !== debt.lineCount) errors.push(`${debt.file} line count drift: expected=${debt.lineCount} actual=${lineCount}`);
      if (classifyModule(debt.file, graphFixture.moduleClassifiers) !== debt.primaryOwner) {
        errors.push(`${debt.file} primary owner drift`);
      }
      if (!Array.isArray(debt.embeddedResponsibilities) || debt.embeddedResponsibilities.length === 0) {
        errors.push(`${debt.file} mixed responsibility ledger missing`);
      }
    }
  }
  return errors;
}

function classifyModule(file, classifiers) {
  const match = classifiers.find(classifier =>
    (classifier.exactFiles || []).includes(file) ||
    (classifier.prefixes || []).some(prefix => file.startsWith(prefix)));
  assert(match, `unclassified production file: ${file}`);
  return match.id;
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
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
