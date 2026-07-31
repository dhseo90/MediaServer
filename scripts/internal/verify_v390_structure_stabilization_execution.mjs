#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
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
  ./server.sh verify-v390-review4-structure-stabilization-execution --graph-only

Checks:
  - historical REVIEW4-51 approval and current REVIEW4-64 execution are separate
  - historical six-slice authorization and current continuation/final completion are separate
  - six slices are ordered, contiguous, rollback-bound, and do not overclaim later slices
  - current graph hash/metrics, versioned dependency policy, mixed debt, and CMake target topology are exact
  - a non-production slice cannot change the production graph
  - parked generated artifacts remain non-final until independent final evidence closes them
  - completed composition root owns construction/start/stop while main stays minimal
  - mutations for order, path escape, behavior change, false completion, and debt regression fail closed
`);
}
assertKnownOptions(rawArgs, ["h", "help", "write-current-graph", "graph-only"]);
const graphOnly = rawArgs.includes("--graph-only");

const ledgerPath = "test/fixtures/v390_structure_stabilization_execution.json";
const ledger = readJson(ledgerPath);
const decision = readJson(ledger.approvalDecision.path);
const completionGraph = readJson(ledger.completionGraph.path);
const currentGraphAbsolutePath = path.join(rootDir, ledger.currentGraph.path);
const currentGraph = fs.existsSync(currentGraphAbsolutePath)
  ? readJson(ledger.currentGraph.path)
  : structuredClone(completionGraph);
// Slice 1~32 validator는 이 immutable completion artifact에 의도적으로 계속 결속한다.
const graph = completionGraph;
const policy = readJson(ledger.currentArchitecturePolicy.path);
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

check("versioned current architecture policy and continuation are explicit", () => {
  assert(ledger.currentArchitecturePolicy?.schema === policy.schema &&
    ledger.currentArchitecturePolicy?.policyVersion === policy.policyVersion &&
    ledger.currentArchitecturePolicy?.sha256 === sha256File(ledger.currentArchitecturePolicy.path),
  "current architecture policy binding mismatch");
  assert(policy.schema === "media-server.v390-structure-stabilization-current-architecture-policy.v1" &&
    policy.policyVersion === "v1" && policy.recordKind === "current-continuation-architecture-policy" &&
    policy.historicalDecisionMutationAllowed === false,
  "current architecture policy identity/boundary mismatch");
  assert(JSON.stringify(policy.finalThresholds) === JSON.stringify({
    maxTargetViolationDirections: ledger.finalTargets.maxTargetViolationDirections,
    maxSccOwners: ledger.finalTargets.maxSccOwners,
    maxMixedOwnerFileLines: ledger.finalTargets.maxMixedOwnerFileLines,
    requireActualCmakeInternalTargetSeparation: ledger.finalTargets.requireSeparatedInternalTargets,
  }), "current architecture policy/final target mismatch");
  assert(ledger.historicalSixSliceDecision?.status === "historical-authorization-only",
    "historical six-slice decision boundary missing");
  assert(["in-progress", "completed"].includes(ledger.currentContinuation?.status),
    "current continuation state missing");
  if (ledger.currentContinuation.status === "in-progress") {
    assert(ledger.currentContinuation?.finalCompletionClaimAllowed === false &&
      ledger.parkedGeneratedEvidenceArtifacts?.status === "allowed-until-final-evidence" &&
      ledger.parkedGeneratedEvidenceArtifacts?.completionEvidence === false,
    "current continuation or parked generated evidence overclaims completion");
  } else {
    assert(ledger.status === "completed" && ledger.refactorComplete === true &&
      ledger.completionClaimed === true && ledger.currentContinuation.status === "completed" &&
      ledger.currentContinuation.finalCompletionClaimAllowed === true &&
      ledger.parkedGeneratedEvidenceArtifacts?.ownerIssue === "V390-REVIEW4-65" &&
      ledger.parkedGeneratedEvidenceArtifacts?.completionEvidence === false &&
      ledger.parkedGeneratedEvidenceArtifacts?.excludedFromReview4Completion === true,
    "completed REVIEW4-64 must keep REVIEW4-65 generated acceptance evidence pending and separate");
  }
});

if (rawArgs.includes("--write-current-graph")) {
  const ledgerSha256Before = sha256File(ledgerPath);
  const completionSha256Before = sha256File(ledger.completionGraph.path);
  assert(ledger.completionGraph.sha256 === completionSha256Before,
    "immutable Slice 32 completion graph drift before current generation");
  const generatedGraph = structuredClone(completionGraph);
  generatedGraph.graphKind = "actual-current-source-include-and-cmake-target-graph";
  generatedGraph.completionGraphBinding = {
    path: ledger.completionGraph.path,
    sha256: ledger.completionGraph.sha256,
  };
  generatedGraph.boundary = "current post-Slice-32 source topology generated from src/include and CMake; " +
    "the immutable Slice 32 completion graph remains the historical completion evidence, while current line counts, " +
    "owner/include/target directions, SCCs, and target separation are independently fail-closed";
  const current = collectCurrentGraph(generatedGraph, policy);
  generatedGraph.expectedProductionFiles = current.productionFiles.length;
  generatedGraph.expectedCppFiles = current.cppFiles.length;
  generatedGraph.expectedFileOwnershipSha256 = current.ownershipSha256;
  for (const classifier of generatedGraph.moduleClassifiers) {
    const owned = current.ownership.filter(item => item.owner === classifier.id);
    classifier.expectedFileCount = owned.length;
    classifier.expectedCppCount = owned.filter(item => item.file.endsWith(".cpp")).length;
  }
  const conditionalByPath = new Map(generatedGraph.cmake.targets
    .flatMap(target => target.conditionalSources || [])
    .map(conditional => [conditional.path, conditional]));
  generatedGraph.cmake.targets = current.cmake.targets.map(target => {
    const conditionalSources = target.productionSources
      .filter(source => conditionalByPath.has(source))
      .map(source => conditionalByPath.get(source));
    return {
      id: target.id,
      type: target.type,
      productionSources: target.productionSources,
      productionSourceSha256: sha256Text(target.productionSources.join("\n")),
      declaredSourceCount: target.productionSources.length,
      defaultActiveSourceCount: target.productionSources.length - conditionalSources.length,
      conditionalSources,
      internalModuleTarget: target.type === "library",
      moduleOwners: target.moduleOwners,
    };
  });
  generatedGraph.cmake.internalTargetSeparation = current.cmake.internalTargetSeparation;
  generatedGraph.observedModuleEdges = current.observedModuleEdges;
  generatedGraph.stronglyConnectedComponents = current.stronglyConnectedComponents;
  for (const debt of generatedGraph.mixedOwnershipDebt) debt.lineCount = lineCount(debt.file);
  fs.writeFileSync(currentGraphAbsolutePath, `${JSON.stringify(generatedGraph, null, 2)}\n`);
  assert(sha256File(ledgerPath) === ledgerSha256Before,
    "current graph generator modified the historical execution ledger");
  assert(sha256File(ledger.completionGraph.path) === completionSha256Before,
    "current graph generator modified the immutable Slice 32 completion graph");
  console.log(`wrote ${ledger.currentGraph.path}: files=${current.productionFiles.length} cpp=${current.cppFiles.length} edges=${current.observedModuleEdges.length}`);
  process.exit(0);
}

check("historical approval is separate from actual execution", () => {
  assert(ledger.schema === "media-server.v390-structure-stabilization-execution.v4", "execution schema mismatch");
  assert(ledger.issueId === "V390-REVIEW4-64" && ledger.release === "v3.9.0" && ledger.branch === "v3.9.0",
    "execution identity mismatch");
  assert(ledger.recordKind === "refactor-execution-ledger" && ledger.productionRefactorStarted === true,
    "execution state identity mismatch");
  assert(decision.schema === ledger.approvalDecision.schema && decision.decisionId === "V390-REVIEW4-51",
    "historical approval binding mismatch");
  assert(decision.status === "approved-scheduled" && decision.implementationStatus === "not-executed",
    "historical decision was rewritten as execution evidence");
  assert(["in-progress", "completed"].includes(ledger.status) &&
    ledger.latestCompletedSlice >= 1 && ledger.latestCompletedSlice <= expectedSlices.length,
  "execution ledger has an invalid partial/completed state");
  for (const record of [ledger.approvalDecision, ledger.historicalReadiness, ledger.historicalGraph]) {
    assert(record.sha256 === sha256File(record.path), `historical record drift: ${record.path}`);
  }
  assert(ledger.currentGraph.path !== ledger.historicalGraph.path, "current graph overwrites historical graph");
  assert(ledger.historicalSixSliceDecision.path === ledger.approvalDecision.path &&
    ledger.historicalSixSliceDecision.sha256 === ledger.approvalDecision.sha256 &&
    JSON.stringify(ledger.historicalSixSliceDecision.orderedSliceIds) ===
      JSON.stringify(decision.v390Execution.orderedSlices) &&
    ledger.historicalSixSliceDecision.executionOrCompletionEvidence === false,
  "historical six-slice authorization was rewritten as current execution evidence");
  assert(exec("git", ["branch", "--show-current"]) === ledger.branch, "current branch mismatch");
  assert(ledger.executionBase.commit === ledger.rollbackCommit && ledger.executionBase.review4CompletedThrough === 63 &&
    ledger.executionBase.newBranchCreated === false,
  "execution base/rollback boundary mismatch");
  assert(exec("git", ["merge-base", "--is-ancestor", ledger.executionBase.commit, "HEAD"], true).status === 0,
    "execution base is not an ancestor of HEAD");
});

check("slice order and completion frontier are fail-closed", () => {
  const current = collectCurrentGraph(currentGraph, policy);
  const errors = validateLedger(ledger, {
    finalTargetsSatisfied: finalTargetsSatisfied(ledger.finalTargets, graphMetrics(currentGraph, current)),
  });
  assert(errors.length === 0, errors.join("; "));
  assert(JSON.stringify(ledger.orderedSlices.map(item => item.id)) === JSON.stringify(expectedSlices),
    "slice order mismatch");
  assert(JSON.stringify(ledger.preservedContracts) === JSON.stringify(expectedContracts),
    "preserved contract set/order mismatch");
});

check("current graph hash and metrics are exact", () => {
  assert(ledger.currentGraph.schema === currentGraph.schema, "current graph schema mismatch");
  assert(ledger.currentGraph.sha256 === sha256File(ledger.currentGraph.path), "current graph hash drift");
  assert(JSON.stringify(policy.ownerIds) === JSON.stringify(currentGraph.moduleClassifiers.map(item => item.id)),
    "versioned policy owner order does not match current graph classifiers");
  const actual = collectCurrentGraph(currentGraph, policy);
  assert(actual.productionFiles.length === currentGraph.expectedProductionFiles, "current production file count drift");
  assert(actual.cppFiles.length === currentGraph.expectedCppFiles, "current cpp count drift");
  assert(actual.ownershipSha256 === currentGraph.expectedFileOwnershipSha256, "current ownership digest drift");
  assert(JSON.stringify(stripAllowedFlags(actual.observedModuleEdges)) ===
    JSON.stringify(stripAllowedFlags(currentGraph.observedModuleEdges)),
    "current include edge/witness graph drift");
  assert(JSON.stringify(actual.stronglyConnectedComponents) === JSON.stringify(currentGraph.stronglyConnectedComponents),
    "current SCC graph drift");
  assert(JSON.stringify(actual.cmake.targetIds) === JSON.stringify(currentGraph.cmake.targets.map(item => item.id)),
    "current CMake target drift");
  for (const target of actual.cmake.targets) {
    const stored = currentGraph.cmake.targets.find(item => item.id === target.id);
    assert(stored && JSON.stringify(stored.productionSources) === JSON.stringify(target.productionSources) &&
      stored.productionSourceSha256 === sha256Text(target.productionSources.join("\n")),
    `current CMake target source digest drift: ${target.id}`);
  }
  const declaredSourceCount = currentGraph.cmake.targets
    .reduce((sum, target) => sum + target.declaredSourceCount, 0);
  const defaultActiveSourceCount = currentGraph.cmake.targets
    .reduce((sum, target) => sum + target.defaultActiveSourceCount, 0);
  const conditionalSourceCount = currentGraph.cmake.targets
    .reduce((sum, target) => sum + target.conditionalSources.length, 0);
  assert(actual.cmake.productionSources.length === declaredSourceCount &&
    actual.cmake.productionSources.length - conditionalSourceCount === defaultActiveSourceCount,
  "current CMake source count drift");
  const graphPolicyErrors = validateGraphPolicy(currentGraph, policy, actual);
  assert(graphPolicyErrors.length === 0, graphPolicyErrors.join("; "));
  const metrics = graphMetrics(currentGraph, actual);
  assert(JSON.stringify(metrics) === JSON.stringify(ledger.currentGraph.metrics),
    `current graph metric drift: expected=${JSON.stringify(ledger.currentGraph.metrics)} actual=${JSON.stringify(metrics)}`);
  assert(metrics.targetViolationDirections < ledger.approvalBaseline.targetViolationDirections,
    "completed production slice did not reduce target violation directions");
  const finalSatisfied = finalTargetsSatisfied(ledger.finalTargets, metrics);
  if (ledger.status === "completed") {
    assert(finalSatisfied, "completed ledger does not satisfy current architecture final targets");
  } else if (ledger.currentContinuation.architectureStatus === "final-targets-unmet") {
    assert(!finalSatisfied, "continuation says final targets are unmet but actual graph satisfies them");
  }
});

check("current graph negative mutations reject forbidden edge and cycle", () => {
  const actual = collectCurrentGraph(currentGraph, policy);
  const forgedEdge = {
    direction: "analysis-services -> transport-and-auth-adapter",
    witnessCount: 1,
    witnessSha256: sha256Text("negative-analysis-source -> negative-transport-target"),
    allowedByTarget: false,
  };
  const forgedObserved = [...actual.observedModuleEdges, forgedEdge]
    .sort((lhs, rhs) => lhs.direction.localeCompare(rhs.direction));
  assert(JSON.stringify(stripAllowedFlags(forgedObserved)) !==
    JSON.stringify(stripAllowedFlags(currentGraph.observedModuleEdges)),
  "new forbidden include edge negative was accepted by the exact current graph");
  assert(forgedObserved.filter(item => item.allowedByTarget === false).length === 1,
    "new forbidden include edge did not become a target violation");
  const cycle = findCycleComponents(
    ["negative-a", "negative-b"],
    [{ from: "negative-a", to: "negative-b" }, { from: "negative-b", to: "negative-a" }],
  );
  assert(cycle.length === 1 && cycle[0].join(",") === "negative-a,negative-b",
    "synthetic dependency cycle negative was accepted");
});

check("Slice 32 completion and current graph separation is fail-closed", () => {
  const slice32 = ledger.currentContinuation?.orderedSlices?.[31];
  assert(ledger.completionGraph?.path ===
      "test/fixtures/v390_structure_stabilization_slice32_completion_graph.json" &&
    ledger.completionGraph.schema === completionGraph.schema &&
    ledger.completionGraph.sha256 === "215ce9282593945dc820171348eabc2f06814ce2be4b2abe1dbd632919dd820a" &&
    ledger.completionGraph.sha256 === sha256File(ledger.completionGraph.path),
  "immutable Slice 32 completion graph binding mismatch");
  assert(slice32?.after?.productionGraphSha256 === ledger.completionGraph.sha256 &&
    slice32.after.largestMixedOwnerFileLines === 10156 &&
    ledger.review4Completion?.completionGraphPath === ledger.completionGraph.path &&
    ledger.review4Completion?.completionGraphSha256 === ledger.completionGraph.sha256,
  "Slice 32 completion ledger was rewritten as current source evidence");
  const currentDebt = new Map(currentGraph.mixedOwnershipDebt.map(item => [item.file, item.lineCount]));
  assert(currentGraph.completionGraphBinding?.path === ledger.completionGraph.path &&
    currentGraph.completionGraphBinding?.sha256 === ledger.completionGraph.sha256 &&
    currentDebt.get("src/ingress/product_ui_page_scripts.cpp") === 10176 &&
    ledger.currentGraph.metrics?.largestMixedOwnerFileLines === 10176 &&
    ledger.currentGraph.sha256 !== ledger.completionGraph.sha256,
  "current graph is not independently bound to the current source");

  const currentLineDrift = structuredClone(currentGraph);
  currentLineDrift.mixedOwnershipDebt.find(item =>
    item.file === "src/ingress/product_ui_page_scripts.cpp").lineCount = 10156;
  assert(validateCurrentGraphBinding(ledger, currentLineDrift, policy)
    .some(error => error.includes("line-count")), "current graph line-count drift was accepted");

  const currentOwnerDrift = structuredClone(currentGraph);
  currentOwnerDrift.moduleClassifiers.find(item => item.id === "product-ui-workspaces")
    .expectedFileCount += 1;
  assert(validateCurrentGraphBinding(ledger, currentOwnerDrift, policy)
    .some(error => error.includes("owner")), "current owner drift was accepted");

  const currentIncludeDrift = structuredClone(currentGraph);
  currentIncludeDrift.observedModuleEdges[0].witnessCount += 1;
  assert(validateCurrentGraphBinding(ledger, currentIncludeDrift, policy)
    .some(error => error.includes("include")), "current include edge drift was accepted");

  const currentTargetDrift = structuredClone(currentGraph);
  currentTargetDrift.cmake.targets[0].declaredSourceCount += 1;
  assert(validateCurrentGraphBinding(ledger, currentTargetDrift, policy)
    .some(error => error.includes("target")), "current target drift was accepted");

  const currentSccDrift = structuredClone(currentGraph);
  currentSccDrift.stronglyConnectedComponents = [["analysis-services", "core-media-interfaces"]];
  assert(validateCurrentGraphBinding(ledger, currentSccDrift, policy)
    .some(error => error.includes("SCC")), "current SCC drift was accepted");

  const completionMutation = structuredClone(completionGraph);
  completionMutation.mixedOwnershipDebt.find(item =>
    item.file === "src/ingress/product_ui_page_scripts.cpp").lineCount = 10173;
  assert(validateCompletionGraphBinding(ledger, completionMutation)
    .some(error => error.includes("completion")), "completion graph mutation was accepted");

  const exchanged = structuredClone(ledger);
  [exchanged.completionGraph.sha256, exchanged.currentGraph.sha256] =
    [exchanged.currentGraph.sha256, exchanged.completionGraph.sha256];
  assert(validateCompletionGraphBinding(exchanged, completionGraph).length > 0 &&
    validateCurrentGraphBinding(exchanged, currentGraph, policy).length > 0,
  "completion/current graph hash exchange was accepted");

  const historicalMetricRewrite = structuredClone(ledger);
  historicalMetricRewrite.currentContinuation.orderedSlices[31]
    .after.largestMixedOwnerFileLines = 10176;
  assert(validateCompletionGraphBinding(historicalMetricRewrite, completionGraph)
    .some(error => error.includes("historical")), "historical Slice 32 metric rewrite was accepted");

  const currentAsHistorical = structuredClone(ledger);
  currentAsHistorical.currentContinuation.orderedSlices[31]
    .after.productionGraphSha256 = currentAsHistorical.currentGraph.sha256;
  assert(validateCompletionGraphBinding(currentAsHistorical, completionGraph)
    .some(error => error.includes("historical")), "current graph was accepted as historical evidence");

  const generatorSource = readText("scripts/internal/verify_v390_structure_stabilization_execution.mjs");
  assert([...generatorSource.matchAll(/^\s*fs\.writeFileSync\(/gm)].length === 1 &&
    generatorSource.includes("fs.writeFileSync(currentGraphAbsolutePath") &&
    generatorSource.includes("current graph generator modified the historical execution ledger") &&
    generatorSource.includes("current graph generator modified the immutable Slice 32 completion graph"),
  "current graph generator write boundary is not limited to the current graph artifact");
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
    "analysis::AnalysisSessionService analysis_sessions(session_manager);",
    "ingress::MakeAnalysisSessionLifecycleApplicationAdapter(analysis_sessions)",
    "ingress::MakeAnalysisSessionReadApplicationAdapter(analysis_sessions)",
    "session_manager.SetAuxiliaryStreamRuntimeProvider(",
    "ingress::GStreamerRtspServer gst_rtsp_server(session_manager, analysis_sessions);",
    "const auto webrtc_http_runtime_config = BuildWebRtcHttpRuntimeConfig(config);",
    "*analysis_session_lifecycle,",
    "*analysis_session_reads,",
    "webrtc_http_runtime_config);",
    "gst_rtsp_server.Start(rtsp_port, &server_error)",
    "webrtc_http_server.Start(http_address, http_port, &http_error)",
    "webrtc_http_server.Stop();",
    "gst_rtsp_server.Stop();",
    "session_manager.SetAuxiliaryStreamRuntimeProvider({});",
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

check("route/API Slice owns exact action deferral response behind the outer auth guard", () => {
  const slice = ledger.orderedSlices[1];
  if (slice.status === "not-started") return;
  const server = readWebRtcHttpServerBundle(readText);
  const header = readText("include/ingress/ops_action_execution_deferral.h");
  const owner = readText("src/ingress/ops_action_execution_deferral.cpp");
  const cmake = readText("CMakeLists.txt");
  assert(header.includes("struct ActionExecutionDeferralDecisionResponse") &&
    header.includes("TryHandleActionExecutionDeferralDecision"),
  "transport-neutral action route contract missing");
  for (const snippet of [
    "std::string OpsV390ActionExecutionDeferralDecisionJson()",
    "path != kActionExecutionDeferralDecisionRoute || method != \"GET\"",
    "response.status = 200",
    "response.reason = \"OK\"",
    "response.cache_control = \"no-store\"",
  ]) assert(owner.includes(snippet), `action route owner missing: ${snippet}`);
  assert(!owner.includes("require_ops_principal") && !owner.includes("HttpResponse"),
    "route owner depends on outer auth/transport types");
  assert(!server.includes("std::string OpsV390ActionExecutionDeferralDecisionJson()"),
    "legacy action JSON owner remains in transport source");
  const routeStart = server.indexOf('request.path == "/ops/api/actions/execution-deferral-decision"');
  const routeEnd = server.indexOf("\n                        if (request.path == ", routeStart + 1);
  const routeBlock = server.slice(routeStart, routeEnd);
  const authIndex = routeBlock.indexOf("require_ops_principal()");
  const handlerIndex = routeBlock.indexOf("TryHandleActionExecutionDeferralDecision");
  assert(routeStart >= 0 && authIndex >= 0 && handlerIndex > authIndex,
    "outer principal guard must precede action route dispatch");
  assert(routeBlock.includes("request.method") && routeBlock.includes("request.path") &&
    routeBlock.includes('ok.headers["Cache-Control"] = handled->cache_control'),
  "route method/path/cache adapter drift");
  assert(cmake.split("src/ingress/ops_action_execution_deferral.cpp").length === 2,
    "action route owner must appear in CMake exactly once");
});

check("registry/domain Slice consumes injected read authorization without transport dependency", () => {
  const slice = ledger.orderedSlices[2];
  if (slice.status === "not-started") return;
  const header = readText("include/ingress/source_view_registry.h");
  const registry = readText("src/ingress/source_view_registry.cpp");
  const server = readWebRtcHttpServerBundle(readText);
  assert(header.includes("using ClientViewAccessAuthorizer =") &&
    header.includes("std::function<bool(const std::string& view_id,"),
  "transport-neutral client view authorizer contract missing");
  assert(!header.includes('"ingress/http_auth.h"') &&
    !registry.includes("auth::Principal") && !registry.includes("auth::Require"),
  "registry/domain owner retains transport auth dependency");
  assert(server.includes("MakeClientViewAccessAuthorizer") &&
    server.includes('auth::RequireRole(principal, {"operator"})') &&
    server.includes('auth::RequireScope(principal, required_scope_prefix + ":" + view_id)'),
  "transport adapter does not preserve exact role/scope authorization");
  for (const snippet of [
    "ClientViewsJson(const ClientViewAccessAuthorizer& authorizer)",
    "ClientViewJson(const std::string& view_id,",
    "ResolveClientViewAccess(const std::string& view_id,",
    "authorizer(view.view_id, \"view:read\")",
    "authorizer(view_it->view_id, required_scope_prefix)",
  ]) assert(registry.includes(snippet), `registry read-model authorizer anchor missing: ${snippet}`);
  for (const unchangedWriteAnchor of [
    "RegistryResult SourceViewRegistry::CreateSource(const std::string& body)",
    "RegistryResult SourceViewRegistry::UpsertOnvifSourceView(",
    "bool SourceViewRegistry::SaveSourcesLocked(",
    "bool SourceViewRegistry::SaveViewsLocked(",
  ]) assert(registry.includes(unchangedWriteAnchor), `registry write/persistence owner drift: ${unchangedWriteAnchor}`);
});

check("UI Slice owns the exact action deferral workspace outside mixed server/page units", () => {
  const slice = ledger.orderedSlices[3];
  if (slice.status === "not-started") return;
  const header = readText("include/ingress/product_ui_action_execution_deferral.h");
  const owner = readText("src/ingress/product_ui_action_execution_deferral.cpp");
  const pageScripts = readText("src/ingress/product_ui_page_scripts.cpp");
  const server = readWebRtcHttpServerBundle(readText);
  const serverPagesPath = "src/ingress/product_ui_server_pages.cpp";
  const serverPages = fs.existsSync(path.join(rootDir, serverPagesPath)) ? readText(serverPagesPath) : "";
  const css = readText("src/ingress/product_ui_css.cpp");
  const cmake = readText("CMakeLists.txt");
  assert(header.includes("std::string OpsActionExecutionDeferralWorkspaceHtml();") &&
    header.includes("void AppendOpsActionExecutionDeferralWorkspaceScript(std::ostringstream& out);"),
  "action deferral workspace owner API missing");
  const html = rawLiteralPayload(owner, "R\"DEFERRALHTML(", ")DEFERRALHTML\"");
  const script = rawLiteralPayload(owner, "R\"DEFERRALSCRIPT(", ")DEFERRALSCRIPT\"");
  assert(sha256Text(html) === slice.baselineDigests.workspaceHtmlSha256,
    "action deferral workspace HTML byte drift");
  assert(sha256Text(script) === slice.baselineDigests.workspaceScriptSha256,
    "action deferral workspace script byte drift");
  assert(sha256Text(css) === slice.baselineDigests.sharedCssFileSha256,
    "shared action-control CSS ownership/content drift");
  for (const snippet of [
    'data-testid="ops-action-execution-deferral-decision"',
    "dashActionExecutionDeferralBadges",
    "dashActionExecutionDeferralText",
    "dashActionExecutionDeferralList",
    "dashActionExecutionDeferralBoundary",
    "refreshV390ActionExecutionDeferralDecision",
    "/ops/api/actions/execution-deferral-decision",
    "requestJson(actionExecutionDeferralRoute)",
  ]) assert(owner.includes(snippet), `action deferral workspace owner missing: ${snippet}`);
  assert(pageScripts.includes('#include "ingress/product_ui_action_execution_deferral.h"') &&
    pageScripts.includes("AppendOpsActionExecutionDeferralWorkspaceScript(out);") &&
    !pageScripts.includes("const renderV390ActionExecutionDeferralDecision ="),
  "mixed page script unit still owns action deferral renderer");
  assert((server.includes('#include "ingress/product_ui_action_execution_deferral.h"') &&
      server.includes("OpsActionExecutionDeferralWorkspaceHtml()") ||
      server.includes('#include "ingress/product_ui_server_pages.h"') &&
      serverPages.includes('#include "ingress/product_ui_action_execution_deferral.h"') &&
      serverPages.includes("OpsActionExecutionDeferralWorkspaceHtml()")) &&
    !server.includes('data-testid="ops-action-execution-deferral-decision"'),
  "action deferral HTML shell lost its focused owner or returned to mixed transport");
  assert(cmake.split("src/ingress/product_ui_action_execution_deferral.cpp").length === 2,
    "action deferral UI owner must appear in CMake exactly once");
  assert(!/\bmethod\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i.test(script),
    "action deferral UI renderer introduced a write request");
  const publicOwnerSlice = ledger.currentContinuation?.orderedSlices?.find(item =>
    item.id === "public-contract-interface-owner-realignment");
  assert(policy.temporaryDebtExceptions.some(item =>
    item.direction === "transport-and-auth-adapter -> product-ui-workspaces" &&
      item.countsAsTargetViolation === true) &&
    (publicOwnerSlice?.status === "completed"
      ? !graph.observedModuleEdges.some(item =>
        item.direction === "transport-and-auth-adapter -> product-ui-workspaces")
      : graph.observedModuleEdges.some(item =>
        item.direction === "transport-and-auth-adapter -> product-ui-workspaces" &&
          item.allowedByTarget === false)),
  "transport-to-product-UI composition debt was hidden from the target violation count");
});

check("VLM parser Slice owns provenance validation and generic strict JSON outside transport", () => {
  const slice = ledger.orderedSlices[4];
  if (slice.status === "not-started") return;
  const publicOwnerSlice = ledger.currentContinuation?.orderedSlices?.find(item =>
    item.id === "public-contract-interface-owner-realignment");
  const strictJsonPromoted = publicOwnerSlice?.status === "completed";
  const strictHeaderPath = strictJsonPromoted ? "include/domain/strict_json.h" : "include/core/strict_json.h";
  const strictSourcePath = strictJsonPromoted ? "src/domain/strict_json.cpp" : "src/core/strict_json.cpp";
  const strictInclude = strictJsonPromoted ? "domain/strict_json.h" : "core/strict_json.h";
  const strictHeader = readText(strictHeaderPath);
  const strictSource = readText(strictSourcePath);
  const validatorHeader = readText("include/ingress/vlm_incident_rule_provenance.h");
  const validatorSource = readText("src/ingress/vlm_incident_rule_provenance.cpp");
  const server = readWebRtcHttpServerBundle(readText);
  const cmake = readText("CMakeLists.txt");
  assert(!fs.existsSync(path.join(rootDir, "include/ingress/strict_json.h")) &&
    !fs.existsSync(path.join(rootDir, "src/ingress/strict_json.cpp")) &&
    (!strictJsonPromoted ||
      !fs.existsSync(path.join(rootDir, "include/core/strict_json.h")) &&
      !fs.existsSync(path.join(rootDir, "src/core/strict_json.cpp"))),
  "strict JSON remains transport-owned");
  assert(sha256Text(strictHeader) === slice.baselineDigests.strictJsonHeaderSha256,
    "strict JSON header behavior/API drift");
  assert(sha256Text(strictSource.replace(`#include "${strictInclude}"`, '#include "ingress/strict_json.h"')) ===
    slice.baselineDigests.strictJsonSourceSha256,
  "strict JSON parser implementation drift");
  assert(validatorHeader.includes("bool ValidateVlmIncidentRuleProvenanceContract(") &&
    validatorSource.includes(`#include "${strictInclude}"`) &&
    validatorSource.includes('#include "analysis/vlm_observation_store.h"'),
  "VLM provenance application-service API/dependencies missing");
  for (const snippet of [
    "rule vlmProvenance must be top-level",
    "rule vlmProvenance candidate must remain manual-review and no-auto-apply",
    "rule vlmProvenance must not claim an unverified evaluation execution",
    "generated rule id must match provenance",
    "generated rule save API route must match rule id",
    "generated rule provenance requires manual PUT save",
    "ValidateVlmIncidentRuleProvenanceServerRecords",
  ]) assert(validatorSource.includes(snippet), `VLM provenance contract drift: ${snippet}`);
  assert(!validatorSource.includes("HttpResponse") && !validatorSource.includes("http_auth") &&
    !validatorSource.includes("providerCall") && !validatorSource.includes("runtimeCall"),
  "VLM provenance validator gained transport/provider/runtime ownership");
  assert(server.includes('#include "ingress/vlm_incident_rule_provenance.h"') &&
    !server.includes("bool ValidateVlmIncidentRuleProvenanceContract(") &&
    server.includes("ValidateVlmIncidentRuleProvenanceContract(body, *id, error_message)"),
  "mixed transport source still owns or lost VLM provenance validation");
  assert(cmake.split(strictSourcePath).length === 2 &&
    cmake.split("src/ingress/vlm_incident_rule_provenance.cpp").length === 2 &&
    !cmake.includes("src/ingress/strict_json.cpp") &&
    (!strictJsonPromoted || !cmake.includes("src/core/strict_json.cpp")),
  "CMake strict JSON/VLM provenance ownership drift");
  const applicationOwner = graph.moduleClassifiers.find(item => item.id === "application-service-interfaces");
  assert(applicationOwner?.exactFiles?.includes("include/ingress/vlm_incident_rule_provenance.h") &&
    applicationOwner.exactFiles.includes("src/ingress/vlm_incident_rule_provenance.cpp"),
  "VLM provenance validator graph owner missing");
  assert(policy.temporaryDebtExceptions.some(item =>
    item.direction === "application-service-interfaces -> core-utilities" &&
      item.countsAsTargetViolation === true) &&
    (publicOwnerSlice?.status === "completed"
      ? !graph.observedModuleEdges.some(item =>
        item.direction === "application-service-interfaces -> core-utilities")
      : graph.observedModuleEdges.some(item =>
        item.direction === "application-service-interfaces -> core-utilities" &&
          item.allowedByTarget === false)),
  "application-to-core strict JSON dependency debt was hidden from the target violation count");
});

check("verifier/docs Slice separates current evidence from historical and conditional contracts", () => {
  const slice = ledger.orderedSlices[5];
  if (slice.status === "not-started") return;
  const template = readText("docs/manual-ui-result-template.md");
  const archive = readText("docs/manual-ui-historical-release-archive.md");
  const vlmIndex = readText("docs/vlm-contract-index.md");
  const implementation = readJson("test/fixtures/project_feature_implementation_evidence.json");
  const audit = readJson("test/fixtures/v390_review4_feature_semantic_source_audit.json");
  const approvals = readJson("test/fixtures/v390_review4_feature_semantic_source_approvals.json");
  assert(template.includes("manual-ui-historical-release-archive.md") &&
    !/^## v2\.[0-9]+\.[0-9]+/m.test(template),
  "current manual UI template still embeds historical release sections");
  for (const heading of ["v2.2.0", "v2.4.0", "v2.7.0", "v2.9.0"]) {
    assert(archive.includes(heading), `manual UI historical archive missing ${heading}`);
  }
  for (const link of [
    "vlm-runtime-opt-in-contract.md",
    "vlm-profile-storage.md",
    "vlm-privacy-transfer-guard.md",
    "vlm-install-connection-dry-run.md",
    "vlm-cloud-provider-field-smoke-gate.md",
  ]) assert(vlmIndex.includes(link), `VLM contract index missing ${link}`);
  for (const boundary of [
    "default-off",
    "provider-not-PASS",
    "field smoke",
    "raw prompt",
    "raw provider response",
  ]) assert(vlmIndex.includes(boundary), `VLM contract index boundary missing: ${boundary}`);
  assert(Array.isArray(implementation.items) && implementation.items.length === 986 &&
    implementation.semanticClosureSummary?.review4ApprovedSourceFlows === 986,
  "current implementation evidence is not REVIEW4-approved 986-row evidence");
  assert(Array.isArray(audit.items) && audit.items.length === 986 &&
    audit.items.every(item => item.status === "source-resolved-candidate"),
  "current source audit is not fully resolved");
  assert(Array.isArray(approvals.approvals) && approvals.approvals.length === 986 &&
    approvals.approvals.every(item => item.decision === "approved-source-flow"),
  "current independent source approvals are incomplete");
  if (slice.status === "completed") {
    assert((slice.entryBlockers || []).every(item => item.status === "resolved"),
      "completed verifier/docs Slice retains unresolved entry blockers");
  }
});

check("historical non-production Slice remains separate and REVIEW4-65 evidence stays non-final", () => {
  const slice = ledger.orderedSlices[5];
  if (slice.status === "not-started") return;
  assert(slice.nonProductionSlice === true, "verifier/docs Slice lost non-production boundary");
  assert(slice.before?.productionGraphSha256 === ledger.currentGraph.sha256 &&
    slice.before.productionGraphSha256 === sha256File(ledger.currentGraph.path),
  "non-production Slice changed the bound production graph");
  for (const [key, expected] of [
    ["productionFiles", ledger.currentGraph.metrics.productionFiles],
    ["cppSources", ledger.currentGraph.metrics.cppSources],
    ["moduleOwners", ledger.currentGraph.metrics.moduleOwners],
    ["cmakeTargets", ledger.currentGraph.metrics.cmakeTargets],
    ["targetViolationDirections", ledger.currentGraph.metrics.targetViolationDirections],
    ["largestSccOwners", ledger.currentGraph.metrics.largestSccOwners],
    ["internalTargetSeparation", ledger.currentGraph.metrics.internalTargetSeparation],
  ]) assert(slice.before[key] === expected, `non-production Slice entry graph metric drift: ${key}`);
  if (slice.status === "completed") {
    for (const key of [
      "productionGraphSha256", "productionFiles", "cppSources", "moduleOwners", "cmakeTargets",
      "targetViolationDirections", "largestSccOwners", "internalTargetSeparation",
    ]) assert(slice.after?.[key] === slice.before[key], `completed non-production Slice changed graph: ${key}`);
  }
  const parked = ledger.parkedGeneratedEvidenceArtifacts;
  assert(Array.isArray(parked.paths) && parked.paths.length > 0 &&
    parked.paths.every(file => ledger.orderedSlices[5].allowedFiles.includes(file)),
  "parked generated evidence artifact escaped the non-production Slice allowlist");
  if (parked.status === "allowed-until-final-evidence") {
    assert(parked.completionEvidence === false && parked.ownerIssue === "V390-REVIEW4-65" &&
      parked.excludedFromReview4Completion === true,
    "pending REVIEW4-65 generated artifacts were used as REVIEW4-64 completion evidence");
  }
});

check("current continuation binds the exact completed Slice 1-32 frontier", () => {
  const slices = ledger.currentContinuation?.orderedSlices || [];
  assert(validateContinuationFrontier(ledger).length === 0,
    `current continuation frontier invalid: ${validateContinuationFrontier(ledger).join(",")}`);
  assert(slices.length === 32 && slices[0].order === 1 && slices[1].order === 2 && slices[2].order === 3 &&
    slices[3].order === 4 && slices[4].order === 5 && slices[5].order === 6 && slices[6].order === 7 &&
    slices[7].order === 8 && slices[8].order === 9 && slices[9].order === 10 && slices[10].order === 11 &&
    slices[11].order === 12 && slices[12].order === 13 && slices[13].order === 14 && slices[14].order === 15 &&
    slices[15].order === 16 && slices[16].order === 17 && slices[17].order === 18 && slices[18].order === 19 &&
    slices[19].order === 20 && slices[20].order === 21 && slices[21].order === 22 && slices[22].order === 23 &&
    slices[23].order === 24 && slices[24].order === 25 && slices[25].order === 26 && slices[26].order === 27 &&
    slices[27].order === 28 && slices[28].order === 29 && slices[29].order === 30 &&
    slices[30].order === 31 && slices[31].order === 32 &&
    slices[0].id === "completion-oracle-and-ops-ui-renderer" && slices[0].status === "completed" &&
    slices[1].id === "product-ui-principal-view-boundary" && slices[1].status === "completed" &&
    slices[2].id === "source-request-parser-owner-boundary" && slices[2].status === "completed" &&
    slices[3].id === "cmake-internal-target-separation" && slices[3].status === "completed" &&
    slices[4].id === "stable-contract-leaf-boundary" && slices[4].status === "completed" &&
    slices[5].id === "analysis-query-owner-boundary" && slices[5].status === "completed" &&
    slices[6].id === "core-media-analysis-port-inversion" &&
    slices[6].status === "completed" &&
    slices[7].id === "stable-contract-owner-realignment" && slices[7].status === "completed" &&
    slices[8].id === "public-contract-interface-owner-realignment" && slices[8].status === "completed" &&
    slices[9].id === "core-media-registry-rule-port" && slices[9].status === "completed" &&
    slices[10].id === "webrtc-http-server-source-bundle" && slices[10].status === "completed" &&
    slices[11].id === "webrtc-http-server-physical-split" &&
    slices[11].status === "completed" &&
    slices[12].id === "analysis-runtime-port-boundary" && slices[12].status === "completed" &&
    slices[13].id === "transport-runtime-config-boundary" && slices[13].status === "completed" &&
    slices[14].id === "vlm-profile-json-document-boundary" && slices[14].status === "completed" &&
    slices[15].id === "source-view-application-boundary" && slices[15].status === "completed" &&
    slices[16].id === "appearance-readiness-application-boundary" && slices[16].status === "completed" &&
    slices[17].id === "category-catalog-application-boundary" && slices[17].status === "completed" &&
    slices[18].id === "vlm-observation-application-boundary" && slices[18].status === "completed" &&
    slices[19].id === "incident-memory-application-boundary" && slices[19].status === "completed" &&
    slices[20].id === "event-post-application-boundary" && slices[20].status === "completed" &&
    slices[21].id === "image-codec-application-boundary" && slices[21].status === "completed" &&
    slices[22].id === "analysis-rule-private-declaration-boundary" && slices[22].status === "completed" &&
    slices[23].id === "analysis-frame-application-boundary" && slices[23].status === "completed" &&
    slices[24].id === "va-metadata-application-boundary" && slices[24].status === "completed" &&
    slices[25].id === "analysis-query-overlay-application-boundary" && slices[25].status === "completed" &&
    slices[26].id === "event-feature-search-application-boundary" && slices[26].status === "completed" &&
    slices[27].id === "event-storage-application-boundary" && slices[27].status === "completed" &&
    slices[28].id === "event-rule-application-boundary" && slices[28].status === "completed" &&
    slices[29].id === "analysis-session-read-application-boundary" && slices[29].status === "completed" &&
    slices[30].id === "analysis-session-lifecycle-application-boundary" && slices[30].status === "completed" &&
    slices[31].id === "webrtc-media-application-boundary" &&
    ["in-progress", "completed"].includes(slices[31].status),
  "current continuation slice identity/frontier mismatch");
  const slice1 = slices[0];
  const slice2 = slices[1];
  const slice3 = slices[2];
  const slice4 = slices[3];
  const slice5 = slices[4];
  const slice6 = slices[5];
  const slice7 = slices[6];
  const slice8 = slices[7];
  const slice9 = slices[8];
  const slice10 = slices[9];
  const slice11 = slices[10];
  const slice12 = slices[11];
  const slice13 = slices[12];
  const slice14 = slices[13];
  const slice15 = slices[14];
  assert(slice1.rollbackCommit === ledger.orderedSlices[5].rollbackCommit &&
    slice1.nonProductionSlice === false && slice1.contractAssertions.length >= 5 && slice1.tests.length >= 5 &&
    slice1.tests.every(test => test.status === "pass"),
  "current continuation Slice 1 rollback/contract/test boundary mismatch");
  assert(JSON.stringify(slice1.after) === JSON.stringify({
    productionGraphSha256: "32cca3ef3446ff2c14377b956a119990f34251c2a504af7c57c8b91e3482a109",
    productionFiles: 158,
    cppSources: 79,
    targetViolationDirectionsUnderPolicyV1: 21,
    webrtcHttpServerLines: 40814,
    cmakeTargets: 1,
    internalTargetSeparation: false,
  }), "current continuation Slice 1 completed after-state drift");
  assert(slice1.after.targetViolationDirectionsUnderPolicyV1 ===
      slice1.before.targetViolationDirectionsUnderPolicyV1 &&
    !graph.observedModuleEdges.some(item => item.direction === "product-ui-workspaces -> core-utilities"),
  "Ops renderer introduced or hid a target-direction dependency regression");

  assert(slice2.rollbackCommit === "e89755e380d59785dd987f0106f39b4509a9b49a" &&
    slice2.rollbackCommit !== slice1.rollbackCommit &&
    exec("git", ["merge-base", "--is-ancestor", slice2.rollbackCommit, "HEAD"], true).status === 0 &&
    slice2.nonProductionSlice === false && slice2.contractAssertions.length >= 6 && slice2.tests.length >= 10,
  "current continuation Slice 2 rollback/contract/test boundary mismatch");
  assert(slice2.before?.productionGraphSha256 === slice1.after.productionGraphSha256 &&
    slice2.before.productionFiles === slice1.after.productionFiles &&
    slice2.before.cppSources === slice1.after.cppSources &&
    slice2.before.targetViolationDirectionsUnderPolicyV1 ===
      slice1.after.targetViolationDirectionsUnderPolicyV1 &&
    slice2.before.webrtcHttpServerLines === slice1.after.webrtcHttpServerLines &&
    slice2.before.cmakeTargets === slice1.after.cmakeTargets &&
    slice2.before.internalTargetSeparation === slice1.after.internalTargetSeparation &&
    slice2.before.largestSccOwners === 8,
  "current continuation Slice 2 before-state is not bound to Slice 1 frontier");

  assert(slice2.tests.every(test => test.status === "pass") &&
    JSON.stringify(slice2.after) === JSON.stringify({
      productionGraphSha256: "084ae9b9a7017fbecc223b706e89d01dc2a72a299e4aebaee017daf2ffc24fb5",
      productionFiles: 159,
      cppSources: 79,
      targetViolationDirectionsUnderPolicyV1: 20,
      largestSccOwners: 8,
      webrtcHttpServerLines: 40833,
      cmakeTargets: 1,
      internalTargetSeparation: false,
    }) && !graph.observedModuleEdges.some(item =>
      item.direction === "product-ui-workspaces -> transport-and-auth-adapter"),
  "completed Slice 2 snapshot or product-UI dependency boundary drift");

  assert(slice3.rollbackCommit === "6b13a176d3552cbfc9f7e0933ca9fe7859e944c6" &&
    slice3.rollbackCommit !== slice2.rollbackCommit &&
    exec("git", ["merge-base", "--is-ancestor", slice3.rollbackCommit, "HEAD"], true).status === 0 &&
    slice3.nonProductionSlice === false && slice3.contractAssertions.length >= 8 && slice3.tests.length === 15,
  "current continuation Slice 3 rollback/contract/test boundary mismatch");
  assert(JSON.stringify(slice3.before) === JSON.stringify(slice2.after),
    "current continuation Slice 3 before-state is not bound to Slice 2 frontier");
  const slice3Commands = [
    "./server.sh verify-v390-source-request-parser-owner",
    "./server.sh build",
    "./server.sh verify-codecs",
    "./server.sh verify-route-profiles",
    "./server.sh verify-analysis-state",
    "./server.sh verify-v290-final-contract-freeze",
    "./server.sh verify-event-post --mode schema",
    "./server.sh verify-webrtc-va-metadata",
    "./server.sh verify-sse-metadata",
    "./server.sh verify-ws-metadata",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory",
    "./server.sh verify-docs-links",
    "git diff --check",
    "listener/temp cleanup",
  ];
  assert(slice3Commands.every(command => slice3.tests.filter(test => test.command === command).length === 1),
    "current continuation Slice 3 test inventory command drift");
  assert(slice3.after !== null && slice3.tests.every(test => test.status === "pass"),
    "completed Slice 3 frontier/test state mismatch");
  {
    assert(JSON.stringify(slice3.after) === JSON.stringify({
      productionGraphSha256: "2f781dd262298a496e3afda5bce87622b55bc9e9ed5bb4a42b4e2da703f87d8c",
      productionFiles: 159,
      cppSources: 79,
      targetViolationDirectionsUnderPolicyV1: 19,
      largestSccOwners: 6,
      webrtcHttpServerLines: 40832,
      cmakeTargets: 1,
      internalTargetSeparation: false,
    }), "completed Slice 3 after-state snapshot drift");
    assert(slice3.after.productionFiles === slice3.before.productionFiles &&
      slice3.after.cppSources === slice3.before.cppSources &&
      slice3.after.targetViolationDirectionsUnderPolicyV1 <
        slice3.before.targetViolationDirectionsUnderPolicyV1 &&
      slice3.after.largestSccOwners < slice3.before.largestSccOwners &&
      slice3.after.webrtcHttpServerLines === slice3.before.webrtcHttpServerLines - 1 &&
      !fs.existsSync(path.join(rootDir, "include/ingress/request_parser.h")) &&
      !fs.existsSync(path.join(rootDir, "src/ingress/request_parser.cpp")) &&
      !graph.observedModuleEdges.some(item =>
        item.direction === "core-media-interfaces -> transport-and-auth-adapter") &&
      (ledger.currentContinuation.latestCompletedSlice >= 8
        ? !graph.observedModuleEdges.some(item =>
          item.direction === "core-utilities -> stable-contract-dtos")
        : graph.observedModuleEdges.some(item =>
          item.direction === "core-utilities -> stable-contract-dtos" && item.allowedByTarget === false)),
    "completed Slice 3 did not remove only the intended core-media request-parser dependency");
    if (ledger.currentContinuation.orderedSlices.at(-1)?.id === slice3.id) {
      assert(Array.isArray(slice3.parkedArtifactInvariants) && slice3.parkedArtifactInvariants.length === 2,
        "completed Slice 3 parked artifact invariant inventory drift");
      for (const invariant of slice3.parkedArtifactInvariants) {
        const numstat = exec("git", ["diff", "--numstat", "--", invariant.path])
          .trim().split(/\s+/).slice(0, 2).join("/");
        assert(invariant.beforeSha256 === invariant.afterSha256 &&
          invariant.beforeNumstat === invariant.afterNumstat &&
          invariant.stagedBySlice === false &&
          sha256File(invariant.path) === invariant.afterSha256 &&
          numstat === invariant.afterNumstat &&
          exec("git", ["diff", "--cached", "--name-only", "--", invariant.path]) === "",
        `completed Slice 3 parked artifact changed or was staged: ${invariant.path}`);
      }
    }
  }

  assert(slice4.rollbackCommit === "d5af1d686be051f5972e3078092e80922f88b09a" &&
    slice4.rollbackCommit !== slice3.rollbackCommit &&
    exec("git", ["merge-base", "--is-ancestor", slice4.rollbackCommit, "HEAD"], true).status === 0 &&
    slice4.nonProductionSlice === false && slice4.contractAssertions.length >= 7 && slice4.tests.length === 11,
  "current continuation Slice 4 rollback/contract/test boundary mismatch");
  assert(JSON.stringify(slice4.before) === JSON.stringify(slice3.after),
    "current continuation Slice 4 before-state is not bound to Slice 3 frontier");
  const slice4Commands = [
    "./server.sh verify-v390-cmake-internal-target-separation",
    "./server.sh build",
    "./server.sh verify-server-start-modes",
    "./server.sh verify-codecs",
    "./server.sh verify-route-profiles",
    "./server.sh verify-analysis-state",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory",
    "./server.sh verify-docs-links",
    "git diff --check",
    "listener/temp cleanup",
  ];
  assert(slice4Commands.every(command => slice4.tests.filter(test => test.command === command).length === 1),
    "current continuation Slice 4 test inventory command drift");
  if (slice4.status === "in-progress") {
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice === 3 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial" && slice4.after === null,
    "in-progress Slice 4 frontier/after-state overclaim");
    assert(["registered", "expected-red"].includes(sliceTest(slice4, slice4Commands[0]).status) &&
      slice4.tests.slice(1).every(test => test.status === "registered"),
    "in-progress Slice 4 test registration/RED state drift");
    assert(ledger.currentGraph.sha256 === slice4.before.productionGraphSha256 &&
      ledger.currentGraph.metrics.productionFiles === slice4.before.productionFiles &&
      ledger.currentGraph.metrics.cppSources === slice4.before.cppSources &&
      ledger.currentGraph.metrics.cmakeTargets === slice4.before.cmakeTargets &&
      ledger.currentGraph.metrics.internalTargetSeparation === slice4.before.internalTargetSeparation,
    "in-progress Slice 4 rewrote graph/after evidence before production verification completed");
  } else {
    assert(completedContinuationFrontierAtLeast(ledger, 4) && slice4.after !== null &&
      slice4.tests.every(test => test.status === "pass"),
    "completed Slice 4 frontier/test state mismatch");
    assert(JSON.stringify(slice4.after) === JSON.stringify({
      productionGraphSha256: "2309e3caf072c7c18b07452f988fbe6aadf7589a92095e30b793c6298fde8cba",
      productionFiles: 159,
      cppSources: 79,
      targetViolationDirectionsUnderPolicyV1: 19,
      largestSccOwners: 6,
      webrtcHttpServerLines: 40832,
      cmakeTargets: 2,
      internalTargetSeparation: true,
    }), "completed Slice 4 target topology snapshot drift");
    if (slice5.status === "in-progress") {
      assert(slice4.after.productionGraphSha256 === ledger.currentGraph.sha256 &&
        slice4.after.targetViolationDirectionsUnderPolicyV1 === ledger.currentGraph.metrics.targetViolationDirections &&
        slice4.after.largestSccOwners === ledger.currentGraph.metrics.largestSccOwners &&
        ledger.currentGraph.metrics.cmakeTargets === 2 &&
        ledger.currentGraph.metrics.internalTargetSeparation === true,
      "in-progress Slice 5 is not based on the completed Slice 4 graph");
    }
    assert(slice4.after.productionFiles === slice4.before.productionFiles &&
      slice4.after.cppSources === slice4.before.cppSources &&
      slice4.after.targetViolationDirectionsUnderPolicyV1 ===
        slice4.before.targetViolationDirectionsUnderPolicyV1 &&
      slice4.after.largestSccOwners === slice4.before.largestSccOwners &&
      slice4.after.webrtcHttpServerLines === slice4.before.webrtcHttpServerLines &&
      slice4.before.cmakeTargets === 1 && slice4.before.internalTargetSeparation === false,
    "completed Slice 4 changed source graph metrics or failed to add only target separation");
  }

  assert(slice5.rollbackCommit === "e6632942c1057cdd80df83280c8b9405e9eacc8e" &&
    slice5.rollbackCommit !== slice4.rollbackCommit &&
    exec("git", ["merge-base", "--is-ancestor", slice5.rollbackCommit, "HEAD"], true).status === 0 &&
    slice5.nonProductionSlice === false && slice5.contractAssertions.length >= 8 && slice5.tests.length === 12,
  "current continuation Slice 5 rollback/contract/test boundary mismatch");
  assert(JSON.stringify(slice5.before) === JSON.stringify(slice4.after),
    "current continuation Slice 5 before-state is not bound to Slice 4 frontier");
  const slice5Commands = [
    "./server.sh verify-v390-stable-contract-leaf-boundary",
    "./server.sh build",
    "./server.sh verify-analysis-state",
    "./server.sh verify-event-post --mode schema",
    "./server.sh verify-webrtc-va-metadata",
    "./server.sh verify-sse-metadata",
    "./server.sh verify-ws-metadata",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory",
    "./server.sh verify-docs-links",
    "git diff --check",
    "listener/temp cleanup",
  ];
  assert(slice5Commands.every(command => slice5.tests.filter(test => test.command === command).length === 1),
    "current continuation Slice 5 test inventory command drift");
  if (slice5.status === "in-progress") {
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice === 4 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial" && slice5.after === null,
    "in-progress Slice 5 frontier/after-state overclaim");
    assert(["registered", "expected-red"].includes(sliceTest(slice5, slice5Commands[0]).status) &&
      slice5.tests.slice(1).every(test => test.status === "registered"),
    "in-progress Slice 5 test registration/RED state drift");
    assert(ledger.currentGraph.sha256 === slice5.before.productionGraphSha256 &&
      ledger.currentGraph.metrics.productionFiles === slice5.before.productionFiles &&
      ledger.currentGraph.metrics.cppSources === slice5.before.cppSources &&
      ledger.currentGraph.metrics.targetViolationDirections ===
        slice5.before.targetViolationDirectionsUnderPolicyV1 &&
      ledger.currentGraph.metrics.largestSccOwners === slice5.before.largestSccOwners,
    "in-progress Slice 5 rewrote graph/after evidence before production verification completed");
  } else {
    assert(completedContinuationFrontierAtLeast(ledger, 5) && slice5.after !== null &&
      slice5.tests.every(test => test.status === "pass"),
    "completed Slice 5 frontier/test state mismatch");
    assert(slice5.after.productionGraphSha256 === "14f44d7d41f804de38d688787baaf65f3bd84da37ac856a4318b8c7c8cbc8117" &&
      slice5.after.productionFiles === 159 && slice5.after.cppSources === 79 &&
      slice5.after.targetViolationDirectionsUnderPolicyV1 === 17 &&
      slice5.after.largestSccOwners === 3 && slice5.after.webrtcHttpServerLines === 40832 &&
      slice5.after.cmakeTargets === 2 && slice5.after.internalTargetSeparation === true,
    "completed Slice 5 graph metrics drift");
    assert(!graph.observedModuleEdges.some(item =>
      item.direction === "stable-contract-dtos -> analysis-services" ||
      item.direction === "stable-contract-dtos -> core-utilities") &&
      (slice6.status === "completed" ||
        (graph.observedModuleEdges.length === 29 &&
          JSON.stringify(graph.stronglyConnectedComponents) === JSON.stringify([[
            "analysis-services", "application-service-interfaces", "core-media-interfaces",
          ]]))),
    "completed Slice 5 did not make stable contracts dependency leaves");
  }

  assert(slice6.rollbackCommit === "d23db847da8583d35a4c1e3e54d95117f8b44602" &&
    slice6.rollbackCommit !== slice5.rollbackCommit &&
    exec("git", ["merge-base", "--is-ancestor", slice6.rollbackCommit, "HEAD"], true).status === 0 &&
    slice6.nonProductionSlice === false && slice6.contractAssertions.length >= 8 && slice6.tests.length === 14,
  "current continuation Slice 6 rollback/contract/test boundary mismatch");
  assert(JSON.stringify(slice6.before) === JSON.stringify(slice5.after),
    "current continuation Slice 6 before-state is not bound to Slice 5 frontier");
  const slice6Commands = [
    "./server.sh verify-v390-analysis-query-owner-boundary",
    "./server.sh build",
    "./server.sh verify-analysis-state",
    "./server.sh verify-route-profiles",
    "./server.sh verify-rtsp-va-overlay-policy",
    "./server.sh verify-webrtc-va-metadata",
    "./server.sh verify-bot-sort-deepsort-research-boundary",
    "./server.sh verify-oc-sort-benchmark-boundary",
    "./server.sh verify-v390-review3-discovery-ledger",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory",
    "./server.sh verify-docs-links",
    "git diff --check",
    "listener/temp cleanup",
  ];
  assert(slice6Commands.every(command => slice6.tests.filter(test => test.command === command).length === 1),
    "current continuation Slice 6 test inventory command drift");
  if (slice6.status === "in-progress") {
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice === 5 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial" && slice6.after === null,
    "in-progress Slice 6 frontier/after-state overclaim");
    assert(["registered", "expected-red"].includes(sliceTest(slice6, slice6Commands[0]).status) &&
      slice6.tests.slice(1).every(test => test.status === "registered"),
    "in-progress Slice 6 test registration/RED state drift");
    assert(ledger.currentGraph.sha256 === slice6.before.productionGraphSha256 &&
      ledger.currentGraph.metrics.productionFiles === slice6.before.productionFiles &&
      ledger.currentGraph.metrics.cppSources === slice6.before.cppSources &&
      ledger.currentGraph.metrics.targetViolationDirections ===
        slice6.before.targetViolationDirectionsUnderPolicyV1 &&
      ledger.currentGraph.metrics.largestSccOwners === slice6.before.largestSccOwners,
    "in-progress Slice 6 rewrote graph/after evidence before production verification completed");
  } else {
    assert(completedContinuationFrontierAtLeast(ledger, 6) && slice6.after !== null &&
      slice6.tests.every(test => test.status === "pass"),
    "completed Slice 6 frontier/test state mismatch");
    const slice6ExpectedGraphSha = slice7.status === "completed"
      ? slice7.before.productionGraphSha256
      : ledger.currentGraph.sha256;
    assert(slice6.after.productionGraphSha256 === slice6ExpectedGraphSha &&
      slice6.after.productionFiles === 159 && slice6.after.cppSources === 79 &&
      slice6.after.targetViolationDirectionsUnderPolicyV1 === 15 &&
      slice6.after.largestSccOwners === 2 && slice6.after.webrtcHttpServerLines === 40832 &&
      slice6.after.cmakeTargets === 2 && slice6.after.internalTargetSeparation === true,
    "completed Slice 6 graph metrics drift");
    assert(!graph.observedModuleEdges.some(item =>
        item.direction === "core-media-interfaces -> application-service-interfaces" ||
        item.direction === "application-service-interfaces -> stable-contract-dtos") &&
      (slice7.status === "completed" ||
        (graph.observedModuleEdges.length === 28 &&
          JSON.stringify(graph.stronglyConnectedComponents) === JSON.stringify([[
            "analysis-services", "core-media-interfaces",
          ]]))) &&
      !fs.existsSync(path.join(rootDir, "include/ingress/analysis_query.h")) &&
      !fs.existsSync(path.join(rootDir, "src/ingress/analysis_query.cpp")),
    "completed Slice 6 did not move the query owner or preserve the explicit intermediate SCC");
  }

  assert(slice7.rollbackCommit === "c45cef9ae09e6dfde2dc6e6234f1a0146ecb9b10" &&
    slice7.rollbackCommit !== slice6.rollbackCommit &&
    exec("git", ["merge-base", "--is-ancestor", slice7.rollbackCommit, "HEAD"], true).status === 0 &&
    slice7.nonProductionSlice === false && slice7.contractAssertions.length >= 10 && slice7.tests.length === 21,
  "current continuation Slice 7 rollback/contract/test boundary mismatch");
  assert(JSON.stringify(slice7.before) === JSON.stringify(slice6.after),
    "current continuation Slice 7 before-state is not bound to Slice 6 frontier");
  const slice7Commands = [
    "./server.sh verify-v390-core-media-analysis-port-inversion",
    "./server.sh build",
    "./server.sh verify-server-start-modes",
    "./server.sh verify-v390-source-request-parser-owner",
    "./server.sh verify-v390-analysis-query-owner-boundary",
    "./server.sh verify-v390-review4-lab-core-api",
    "./server.sh verify-ops-source-lifecycle",
    "./server.sh verify-codecs",
    "./server.sh verify-route-profiles",
    "./server.sh verify-analysis-state",
    "./server.sh verify-event-post --mode schema",
    "./server.sh verify-rtsp-va-overlay-policy",
    "./server.sh verify-webrtc-va-metadata",
    "./server.sh verify-sse-metadata",
    "./server.sh verify-ws-metadata",
    "./server.sh verify-v390-cmake-internal-target-separation",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory",
    "./server.sh verify-docs-links",
    "git diff --check",
    "listener/temp cleanup",
  ];
  assert(slice7Commands.every(command => slice7.tests.filter(test => test.command === command).length === 1),
    "current continuation Slice 7 test inventory command drift");
  if (slice7.status === "in-progress") {
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice === 6 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial" && slice7.after === null,
    "in-progress Slice 7 frontier/after-state overclaim");
    assert(["registered", "expected-red"].includes(sliceTest(slice7, slice7Commands[0]).status) &&
      slice7.tests.slice(1).every(test => test.status === "registered"),
    "in-progress Slice 7 test registration/RED state drift");
    assert(ledger.currentGraph.sha256 === slice7.before.productionGraphSha256 &&
      ledger.currentGraph.metrics.productionFiles === slice7.before.productionFiles &&
      ledger.currentGraph.metrics.cppSources === slice7.before.cppSources &&
      ledger.currentGraph.metrics.targetViolationDirections ===
        slice7.before.targetViolationDirectionsUnderPolicyV1 &&
      ledger.currentGraph.metrics.largestSccOwners === slice7.before.largestSccOwners,
    "in-progress Slice 7 rewrote graph/after evidence before production verification completed");
  } else {
    assert(completedContinuationFrontierAtLeast(ledger, 7) && slice7.after !== null &&
      slice7.tests.every(test => test.status === "pass"),
    "completed Slice 7 frontier/test state mismatch");
    assert((slice8.status === "completed"
      ? JSON.stringify(slice7.after) === JSON.stringify(slice8.before)
      : slice7.after.productionGraphSha256 === ledger.currentGraph.sha256) &&
      slice7.after.productionFiles === 162 && slice7.after.cppSources === 80 &&
      slice7.after.targetViolationDirectionsUnderPolicyV1 === 14 &&
      slice7.after.largestSccOwners === 0 &&
      slice7.after.webrtcHttpServerLines === 40840 &&
      slice7.after.webrtcHttpServerLines <= slice7.before.webrtcHttpServerLines + 10 &&
      slice7.after.cmakeTargets === 2 && slice7.after.internalTargetSeparation === true,
    "completed Slice 7 graph metrics drift");
    assert((slice8.status === "completed" || graph.observedModuleEdges.length === 27) &&
      graph.stronglyConnectedComponents.length === 0 &&
      !graph.observedModuleEdges.some(item =>
        item.direction === "core-media-interfaces -> analysis-services" ||
        item.direction === "core-media-interfaces -> application-service-interfaces") &&
      fs.existsSync(path.join(rootDir, "include/core/media_analysis_port.h")) &&
      fs.existsSync(path.join(rootDir, "include/analysis/analysis_session_service.h")) &&
      fs.existsSync(path.join(rootDir, "src/analysis/analysis_session_service.cpp")),
    "completed Slice 7 did not remove core-media outer-owner edges or close the SCC");
    assert(Array.isArray(slice7.parkedArtifactInvariants) &&
      slice7.parkedArtifactInvariants.length === 2,
    "completed Slice 7 parked artifact invariant inventory drift");
    for (const invariant of slice7.parkedArtifactInvariants) {
      assert(/^[a-f0-9]{64}$/.test(invariant.sha256) &&
        Number.isInteger(invariant.addedLines) && Number.isInteger(invariant.deletedLines) &&
        invariant.staged === false,
      `completed Slice 7 historical parked artifact invariant malformed: ${invariant.path}`);
      if (ledger.parkedGeneratedEvidenceArtifacts?.ownerIssue === "V390-REVIEW4-65" &&
          ledger.parkedGeneratedEvidenceArtifacts?.excludedFromReview4Completion === true) continue;
      const numstat = exec("git", ["diff", "--numstat", "--", invariant.path])
        .trim().split(/\s+/).slice(0, 2).join("/");
      assert(sha256File(invariant.path) === invariant.sha256 &&
        numstat === `${invariant.addedLines}/${invariant.deletedLines}` &&
        invariant.staged === false &&
        exec("git", ["diff", "--cached", "--name-only", "--", invariant.path]) === "",
      `completed Slice 7 parked artifact changed or was staged: ${invariant.path}`);
    }
  }
  const slice8Commands = [
    "./server.sh verify-v390-stable-contract-owner-realignment",
    "./server.sh build",
    "./server.sh verify-v390-stable-contract-leaf-boundary",
    "./server.sh verify-v390-core-media-analysis-port-inversion",
    "./server.sh verify-analysis-state",
    "./server.sh verify-v290-final-contract-freeze",
    "./server.sh verify-event-post --mode schema",
    "./server.sh verify-rtsp-va-overlay-policy",
    "./server.sh verify-webrtc-va-metadata",
    "./server.sh verify-sse-metadata",
    "./server.sh verify-ws-metadata",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory",
    "./server.sh verify-docs-links",
    "git diff --check",
    "listener/temp cleanup",
  ];
  assert(slice8.rollbackCommit === "5c45e3000f86711102c3a01eeecbcbb05d0678a6" &&
    slice8.nonProductionSlice === false && slice8.contractAssertions.length >= 7 &&
    slice8.tests.length === slice8Commands.length &&
    slice8Commands.every(command => slice8.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 8 rollback/contract/test inventory drift");
  assert(JSON.stringify(slice8.before) === JSON.stringify(slice7.after),
    "current continuation Slice 8 before-state is not bound to Slice 7 frontier");
  if (slice8.status === "in-progress") {
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice === 7 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial" && slice8.after === null,
    "in-progress Slice 8 frontier/after-state overclaim");
    assert(sliceTest(slice8, slice8Commands[0]).status === "expected-red" &&
      slice8.tests.slice(1).every(test => test.status === "registered"),
    "in-progress Slice 8 test registration/RED state drift");
    assert(ledger.currentGraph.sha256 === slice8.before.productionGraphSha256 &&
      ledger.currentGraph.metrics.productionFiles === slice8.before.productionFiles &&
      ledger.currentGraph.metrics.cppSources === slice8.before.cppSources &&
      ledger.currentGraph.metrics.targetViolationDirections ===
        slice8.before.targetViolationDirectionsUnderPolicyV1,
    "in-progress Slice 8 rewrote graph evidence before production verification completed");
  } else {
    assert(ledger.currentContinuation.latestCompletedSlice >= 8 && slice8.after !== null &&
      slice8.tests.every(test => test.status === "pass"),
    "completed Slice 8 frontier/test state mismatch");
    assert((slice9.status === "completed"
      ? JSON.stringify(slice8.after) === JSON.stringify(slice9.before)
      : slice8.after.productionGraphSha256 === ledger.currentGraph.sha256) &&
      slice8.after.productionFiles === 163 && slice8.after.cppSources === 80 &&
      slice8.after.targetViolationDirectionsUnderPolicyV1 === 10 &&
      slice8.after.largestSccOwners === 0 && slice8.after.webrtcHttpServerLines === 40840 &&
      slice8.after.cmakeTargets === 2 && slice8.after.internalTargetSeparation === true &&
      (slice9.status === "completed" || graph.observedModuleEdges.length === 22) &&
      !graph.observedModuleEdges.some(item => [
        "analysis-services -> stable-contract-dtos",
        "core-media-interfaces -> stable-contract-dtos",
        "core-utilities -> stable-contract-dtos",
        "domain-and-registry-owners -> stable-contract-dtos",
      ].includes(item.direction)),
    "completed Slice 8 stable-contract owner graph delta drift");
  }
  const slice9Commands = [
    "./server.sh verify-v390-public-contract-interface-owner",
    "./server.sh build",
    "./server.sh verify-v390-stable-contract-owner-realignment",
    "./server.sh verify-v390-stable-contract-leaf-boundary",
    "./server.sh verify-v390-analysis-query-owner-boundary",
    "./server.sh verify-v390-vlm-promotion-trust-boundary",
    "./server.sh verify-vlm-profile-storage",
    "./server.sh verify-v390-vlm-incident-rule-provenance",
    "./server.sh verify-onvif-auth-injection-design",
    "./server.sh verify-v390-action-execution-deferral-decision",
    "./server.sh verify-v240-ops-event-route-owner-decomposition",
    "./server.sh verify-v390-ops-product-ui-renderer-owner",
    "./server.sh verify-v390-product-ui-principal-view-boundary",
    "./server.sh verify-v230-ui-renderer-module-decomposition",
    "./server.sh verify-v290-final-contract-freeze",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory",
    "./server.sh verify-docs-links",
    "git diff --check",
    "listener/temp cleanup",
  ];
  assert(slice9.rollbackCommit === "a771408e40c7e086e6d377b00839d31d77be2ef2" &&
    slice9.nonProductionSlice === false && slice9.contractAssertions.length >= 7 &&
    slice9.tests.length === slice9Commands.length &&
    slice9Commands.every(command => slice9.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 9 rollback/contract/test inventory drift");
  assert(JSON.stringify(slice9.before) === JSON.stringify(slice8.after),
    "current continuation Slice 9 before-state is not bound to Slice 8 frontier");
  if (slice9.status === "in-progress") {
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice === 8 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial" && slice9.after === null,
    "in-progress Slice 9 frontier/after-state overclaim");
    assert(sliceTest(slice9, slice9Commands[0]).status === "expected-red" &&
      slice9.tests.slice(1).every(test => test.status === "registered"),
    "in-progress Slice 9 test registration/RED state drift");
    assert(ledger.currentGraph.sha256 === slice9.before.productionGraphSha256 &&
      ledger.currentGraph.metrics.productionFiles === slice9.before.productionFiles &&
      ledger.currentGraph.metrics.cppSources === slice9.before.cppSources &&
      ledger.currentGraph.metrics.targetViolationDirections ===
        slice9.before.targetViolationDirectionsUnderPolicyV1,
    "in-progress Slice 9 rewrote graph evidence before owner verification completed");
  } else {
    const selfCheck = sliceTest(slice9,
      "./server.sh verify-v390-review4-structure-stabilization-execution");
    const testsFinal = slice9.tests.every(test => test.status === "pass") ||
      selfCheck.status === "self-check" && slice9.tests.every(test =>
        test === selfCheck || test.status === "pass");
    assert(ledger.currentContinuation.latestCompletedSlice >= 9 && slice9.after !== null && testsFinal,
    "completed Slice 9 frontier/test state mismatch");
    assert((slice10.status === "completed"
      ? JSON.stringify(slice9.after) === JSON.stringify(slice10.before)
      : slice9.after.productionGraphSha256 === ledger.currentGraph.sha256) &&
      slice9.after.productionFiles === 163 && slice9.after.cppSources === 80 &&
      slice9.after.targetViolationDirectionsUnderPolicyV1 === 6 &&
      slice9.after.largestSccOwners === 0 && slice9.after.webrtcHttpServerLines === 40840 &&
      slice9.after.cmakeTargets === 2 && slice9.after.internalTargetSeparation === true &&
      (slice10.status === "completed" || graph.observedModuleEdges.length === 20) &&
      !graph.observedModuleEdges.some(item => [
        "application-service-interfaces -> core-utilities",
        "application-service-interfaces -> ops-route-groups",
        "transport-and-auth-adapter -> ops-route-groups",
        "transport-and-auth-adapter -> product-ui-workspaces",
      ].includes(item.direction)),
    "completed Slice 9 public contract/interface graph delta drift");
  }
  const slice10Commands = [
    "./server.sh verify-v390-core-media-registry-rule-port",
    "./server.sh build",
    "./server.sh verify-v390-core-media-analysis-port-inversion",
    "./server.sh verify-v390-public-contract-interface-owner",
    "./server.sh verify-analysis-state",
    "./server.sh verify-codecs",
    "./server.sh verify-route-profiles",
    "./server.sh verify-rtsp-va-overlay-policy",
    "./server.sh verify-webrtc-va-metadata",
    "./server.sh verify-v290-final-contract-freeze",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory",
    "./server.sh verify-docs-links",
    "git diff --check",
    "listener/temp cleanup",
  ];
  assert(slice10.rollbackCommit === "26f4ca09ba0cb004cfb85ea1ae28ee3fe0718582" &&
    slice10.nonProductionSlice === false && slice10.contractAssertions.length >= 7 &&
    slice10.tests.length === slice10Commands.length &&
    slice10Commands.every(command => slice10.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 10 rollback/contract/test inventory drift");
  assert(JSON.stringify(slice10.before) === JSON.stringify(slice9.after),
    "current continuation Slice 10 before-state is not bound to Slice 9 frontier");
  if (slice10.status === "in-progress") {
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice === 9 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial" && slice10.after === null,
    "in-progress Slice 10 frontier/after-state overclaim");
    assert(["registered", "expected-red"].includes(sliceTest(slice10, slice10Commands[0]).status) &&
      slice10.tests.slice(1).every(test => test.status === "registered"),
    "in-progress Slice 10 test registration/RED state drift");
    assert(ledger.currentGraph.sha256 === slice10.before.productionGraphSha256 &&
      ledger.currentGraph.metrics.productionFiles === slice10.before.productionFiles &&
      ledger.currentGraph.metrics.cppSources === slice10.before.cppSources &&
      ledger.currentGraph.metrics.targetViolationDirections ===
        slice10.before.targetViolationDirectionsUnderPolicyV1,
    "in-progress Slice 10 rewrote graph evidence before production verification completed");
  } else {
    const selfCheck = sliceTest(slice10,
      "./server.sh verify-v390-review4-structure-stabilization-execution");
    const testsFinal = slice10.tests.every(test => test.status === "pass") ||
      selfCheck.status === "self-check" && slice10.tests.every(test =>
        test === selfCheck || test.status === "pass");
    assert(ledger.currentContinuation.latestCompletedSlice >= 10 && slice10.after !== null && testsFinal,
    "completed Slice 10 frontier/test state mismatch");
    assert(slice10.after.productionGraphSha256 === slice11.before.productionGraphSha256 &&
      slice10.after.productionFiles === 163 && slice10.after.cppSources === 80 &&
      slice10.after.targetViolationDirectionsUnderPolicyV1 === 5 &&
      slice10.after.largestSccOwners === 0 && slice10.after.webrtcHttpServerLines === 40840 &&
      slice10.after.cmakeTargets === 2 && slice10.after.internalTargetSeparation === true &&
      !graph.observedModuleEdges.some(item =>
        item.direction === "core-media-interfaces -> domain-and-registry-owners"),
    "completed Slice 10 core-media registry/rule graph delta drift");
  }
  const slice11Commands = [
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "source bundle consumer syntax check",
    "./server.sh build",
    "./server.sh verify-v390-public-contract-interface-owner",
    "./server.sh verify-v390-core-media-analysis-port-inversion",
    "./server.sh verify-v390-action-execution-deferral-decision",
    "./server.sh verify-v220-ops-workspace-redesign",
    "./server.sh verify-v300-ops-events-ui",
    "./server.sh verify-v350-live-operations-graph-contract",
    "./server.sh verify-v380-action-capability-contract",
    "./server.sh verify-vlm-profile-storage",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory",
    "./server.sh verify-docs-links",
    "git diff --check",
    "listener/temp cleanup",
  ];
  assert(slice11.rollbackCommit === "e5df05f3945e43e89ae13e3fdd21d0c83ab78ac8" &&
    slice11.nonProductionSlice === true && slice11.contractAssertions.length >= 7 &&
    slice11.tests.length === slice11Commands.length &&
    slice11Commands.every(command => slice11.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 11 rollback/contract/test inventory drift");
  assert(JSON.stringify(slice11.before) === JSON.stringify(slice10.after),
    "current continuation Slice 11 before-state is not bound to Slice 10 frontier");
  if (slice11.status === "in-progress") {
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice === 10 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial" && slice11.after === null,
    "in-progress Slice 11 frontier/after-state overclaim");
    assert(["registered", "expected-red"].includes(sliceTest(slice11, slice11Commands[0]).status) &&
      slice11.tests.slice(1).every(test => test.status === "registered"),
    "in-progress Slice 11 test registration/RED state drift");
    assert(ledger.currentGraph.sha256 === slice11.before.productionGraphSha256 &&
      ledger.currentGraph.metrics.productionFiles === slice11.before.productionFiles &&
      ledger.currentGraph.metrics.cppSources === slice11.before.cppSources &&
      ledger.currentGraph.metrics.targetViolationDirections ===
        slice11.before.targetViolationDirectionsUnderPolicyV1,
    "in-progress Slice 11 rewrote graph evidence during a non-production migration");
  } else {
    const selfCheck = sliceTest(slice11,
      "./server.sh verify-v390-review4-structure-stabilization-execution");
    const testsFinal = slice11.tests.every(test => test.status === "pass") ||
      selfCheck.status === "self-check" && slice11.tests.every(test =>
        test === selfCheck || test.status === "pass");
    assert(ledger.currentContinuation.latestCompletedSlice >= 11 && slice11.after !== null && testsFinal,
    "completed Slice 11 frontier/test state mismatch");
    assert(JSON.stringify(slice11.after) === JSON.stringify(slice11.before) &&
      slice11.after.productionGraphSha256 === slice12.before.productionGraphSha256 &&
      fs.existsSync(path.join(rootDir, "scripts/internal/webrtc_http_server_source_bundle.mjs")),
    "completed Slice 11 changed production graph or lacks its source bundle helper");
  }
  const slice12Commands = [
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh build",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-public-contract-interface-owner",
    "./server.sh verify-v390-core-media-analysis-port-inversion",
    "./server.sh verify-v390-action-execution-deferral-decision",
    "./server.sh verify-v220-ops-workspace-redesign",
    "./server.sh verify-v300-ops-events-ui",
    "./server.sh verify-v350-live-operations-graph-contract",
    "./server.sh verify-v380-action-capability-contract",
    "./server.sh verify-vlm-profile-storage",
    "./server.sh verify-analysis-state",
    "./server.sh verify-codecs",
    "./server.sh verify-route-profiles",
    "./server.sh verify-rtsp-va-overlay-policy",
    "./server.sh verify-webrtc-va-metadata",
    "./server.sh verify-v290-final-contract-freeze",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory",
    "./server.sh verify-docs-links",
    "git diff --check",
    "listener/temp cleanup",
  ];
  assert(slice12.rollbackCommit === "2e4a4d7ec0305b394ad623d88e7a454811b9f33b" &&
    slice12.nonProductionSlice === false && slice12.contractAssertions.length >= 8 &&
    slice12.tests.length === slice12Commands.length &&
    slice12Commands.every(command => slice12.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 12 rollback/contract/test inventory drift");
  for (const key of [
    "productionGraphSha256", "productionFiles", "cppSources",
    "targetViolationDirectionsUnderPolicyV1", "largestSccOwners", "webrtcHttpServerLines",
    "cmakeTargets", "internalTargetSeparation",
  ]) {
    assert(slice12.before[key] === slice11.after[key],
      `current continuation Slice 12 before-state drift: ${key}`);
  }
  assert(slice12.before.largestMixedOwnerFileLines === 40840,
    "current continuation Slice 12 mixed-owner baseline drift");
  if (slice12.status === "in-progress") {
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice === 11 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial" && slice12.after === null,
    "in-progress Slice 12 frontier/after-state overclaim");
    assert(["registered", "expected-red"].includes(sliceTest(slice12, slice12Commands[0]).status) &&
      slice12.tests.slice(1).every(test => test.status === "registered"),
    "in-progress Slice 12 test registration/RED state drift");
    assert(ledger.currentGraph.sha256 === slice12.before.productionGraphSha256 &&
      ledger.currentGraph.metrics.productionFiles === slice12.before.productionFiles &&
      ledger.currentGraph.metrics.cppSources === slice12.before.cppSources &&
      ledger.currentGraph.metrics.targetViolationDirections ===
        slice12.before.targetViolationDirectionsUnderPolicyV1,
    "in-progress Slice 12 rewrote graph evidence before physical split verification completed");
  } else {
    const selfCheck = sliceTest(slice12,
      "./server.sh verify-v390-review4-structure-stabilization-execution");
    const testsFinal = slice12.tests.every(test => test.status === "pass") ||
      selfCheck.status === "self-check" && slice12.tests.every(test =>
        test === selfCheck || test.status === "pass");
    assert(ledger.currentContinuation.latestCompletedSlice >= 12 && slice12.after !== null && testsFinal,
    "completed Slice 12 frontier/test state mismatch");
    assert(slice12.after.productionGraphSha256 === slice13.before.productionGraphSha256 &&
      slice12.after.productionFiles === 168 && slice12.after.cppSources === 84 &&
      slice12.after.targetViolationDirectionsUnderPolicyV1 === 5 &&
      slice12.after.largestSccOwners === 0 && slice12.after.largestMixedOwnerFileLines <= 15000 &&
      slice12.after.cmakeTargets === 2 && slice12.after.internalTargetSeparation === true,
    "completed Slice 12 physical split graph delta drift");
  }
  const slice13Commands = [
    "./server.sh verify-v390-analysis-runtime-port-boundary",
    "./server.sh build",
    "./server.sh verify-v390-core-media-analysis-port-inversion",
    "./server.sh verify-v390-public-contract-interface-owner",
    "./server.sh verify-analysis-state",
    "./server.sh verify-v390-reid-readiness-consistency",
    "./server.sh verify-reid-advanced-tracking",
    "./server.sh verify-va-events",
    "./server.sh verify-va-replay",
    "./server.sh verify-v290-final-contract-freeze",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory",
    "./server.sh verify-docs-links",
    "git diff --check",
    "listener/temp cleanup",
  ];
  assert(slice13.rollbackCommit === "20a36cb040d02494b0feab2b5c78608dd3bb41b3" &&
    slice13.nonProductionSlice === false && slice13.contractAssertions.length >= 7 &&
    slice13.tests.length === slice13Commands.length &&
    slice13Commands.every(command => slice13.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 13 rollback/contract/test inventory drift");
  assert(JSON.stringify(slice13.before) === JSON.stringify(slice12.after),
    "current continuation Slice 13 before-state is not bound to Slice 12 frontier");
  assert(slice13.after?.productionGraphSha256 === slice14.before.productionGraphSha256 &&
    slice13.after.productionFiles === 172 && slice13.after.cppSources === 85 &&
    slice13.after.targetViolationDirectionsUnderPolicyV1 === 4 &&
    slice13.after.largestSccOwners === 0 && slice13.after.largestMixedOwnerFileLines === 10156 &&
    slice13.after.cmakeTargets === 2 && slice13.after.internalTargetSeparation === true,
  "Slice 13 analysis runtime port graph delta drift");
  if (slice13.status === "in-progress") {
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice === 12 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial",
    "in-progress Slice 13 frontier overclaim");
    assert(sliceTest(slice13, slice13Commands[0]).status === "pass" &&
      sliceTest(slice13, slice13Commands[1]).status === "pass" &&
      slice13.tests.slice(2).every(test => test.status === "registered"),
    "in-progress Slice 13 verified/registered test state drift");
  } else {
    const selfCheck = sliceTest(slice13,
      "./server.sh verify-v390-review4-structure-stabilization-execution");
    const testsFinal = slice13.tests.every(test => test.status === "pass") ||
      selfCheck.status === "self-check" && slice13.tests.every(test =>
        test === selfCheck || test.status === "pass");
    assert(ledger.currentContinuation.latestCompletedSlice >= 13 && testsFinal,
    "completed Slice 13 frontier/test state mismatch");
  }
  const slice14Commands = [
    "./server.sh verify-v390-transport-runtime-config-boundary",
    "./server.sh build",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-auth-routes",
    "./server.sh verify-v390-reid-readiness-consistency",
    "./server.sh verify-reid-advanced-tracking",
    "./server.sh verify-analysis-state",
    "./server.sh verify-v290-final-contract-freeze",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory",
    "./server.sh verify-docs-links",
    "git diff --check",
    "listener/temp cleanup",
  ];
  assert(slice14.rollbackCommit === "fadc606032f511a7efcfb3b2fc7d6881751a8fbe" &&
    slice14.nonProductionSlice === false && slice14.contractAssertions.length >= 7 &&
    slice14.tests.length === slice14Commands.length &&
    slice14Commands.every(command => slice14.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 14 rollback/contract/test inventory drift");
  assert(JSON.stringify(slice14.before) === JSON.stringify(slice13.after),
    "current continuation Slice 14 before-state is not bound to Slice 13 frontier");
  assert(slice14.after?.productionGraphSha256 === slice15.before.productionGraphSha256 &&
    slice14.after.productionFiles === 173 && slice14.after.cppSources === 85 &&
    slice14.after.targetViolationDirectionsUnderPolicyV1 === 3 &&
    slice14.after.largestSccOwners === 0 && slice14.after.largestMixedOwnerFileLines === 10160 &&
    slice14.after.cmakeTargets === 2 && slice14.after.internalTargetSeparation === true,
  "Slice 14 transport runtime config graph delta drift");
  const slice14SelfCheck = sliceTest(slice14,
    "./server.sh verify-v390-review4-structure-stabilization-execution");
  assert((slice14.tests.every(test => test.status === "pass") ||
      slice14SelfCheck.status === "self-check" && slice14.tests.every(test =>
        test === slice14SelfCheck || test.status === "pass")),
  "completed Slice 14 frontier/test state mismatch");
  const slice15Commands = [
    "./server.sh verify-v390-strict-json-service-boundary",
    "./server.sh build",
    "./server.sh verify-vlm-profile-storage",
    "./server.sh verify-vlm-privacy-transfer-guard",
    "./server.sh verify-v390-public-contract-interface-owner",
    "./server.sh verify-v390-vlm-promotion-trust-boundary",
    "./server.sh verify-v390-transport-runtime-config-boundary",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-v390-vlm-evaluation-promotion-guard",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory",
    "./server.sh verify-docs-links",
    "git diff --check",
    "listener/temp cleanup",
  ];
  assert(slice15.rollbackCommit === "476b98be8c084792a74c7cd87059dcd51d9f5c4b" &&
    slice15.nonProductionSlice === false && slice15.contractAssertions.length >= 7 &&
    slice15.tests.length === slice15Commands.length &&
    slice15Commands.every(command => slice15.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 15 rollback/contract/test inventory drift");
  assert(slice15.before.productionGraphSha256 === slice14.after.productionGraphSha256 &&
    slice15.before.productionFiles === slice14.after.productionFiles &&
    slice15.before.cppSources === slice14.after.cppSources &&
    slice15.before.targetViolationDirectionsUnderPolicyV1 ===
      slice14.after.targetViolationDirectionsUnderPolicyV1 &&
    slice15.before.transportDomainWitnessCount === 3 &&
    slice15.before.largestSccOwners === slice14.after.largestSccOwners &&
    slice15.before.largestMixedOwnerFileLines === slice14.after.largestMixedOwnerFileLines &&
    slice15.before.cmakeTargets === slice14.after.cmakeTargets &&
    slice15.before.internalTargetSeparation === slice14.after.internalTargetSeparation,
  "current continuation Slice 15 before-state is not bound to Slice 14 frontier");
  const slice16 = slices[15];
  const slice17 = slices[16];
  const slice18 = slices[17];
  const slice19 = slices[18];
  const slice20 = slices[19];
  const slice21 = slices[20];
  const slice22 = slices[21];
  const slice23 = slices[22];
  const slice24 = slices[23];
  const slice25 = slices[24];
  const slice26 = slices[25];
  const slice27 = slices[26];
  const slice28 = slices[27];
  const slice29 = slices[28];
  const slice30 = slices[29];
  const slice31 = slices[30];
  const slice32 = slices[31];
  assert(slice15.after?.productionGraphSha256 === slice16?.before?.productionGraphSha256 &&
    slice15.after.productionFiles === 175 && slice15.after.cppSources === 86 &&
    slice15.after.targetViolationDirectionsUnderPolicyV1 === 3 &&
    slice15.after.transportDomainWitnessCount === 2 &&
    slice15.after.largestSccOwners === 0 && slice15.after.largestMixedOwnerFileLines === 10160 &&
    slice15.after.cmakeTargets === 2 && slice15.after.internalTargetSeparation === true,
  "Slice 15 VLM profile JSON document graph delta drift");
  if (slice15.status === "in-progress") {
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice === 14 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial",
    "in-progress Slice 15 frontier overclaim");
  } else {
    const selfCheck = sliceTest(slice15,
      "./server.sh verify-v390-review4-structure-stabilization-execution");
    const testsFinal = slice15.tests.every(test => test.status === "pass") ||
      selfCheck.status === "self-check" && slice15.tests.every(test =>
        test === selfCheck || test.status === "pass");
    assert(ledger.currentContinuation.latestCompletedSlice >= 15 && testsFinal,
    "completed Slice 15 frontier/test state mismatch");
  }
  const slice16Commands = [
    "./server.sh verify-v390-source-view-application-boundary",
    "./server.sh build",
    "./server.sh verify-ops-source-registry-api",
    "./server.sh verify-v390-onvif-source-view-atomicity",
    "./server.sh verify-ops-source-lifecycle",
    "./server.sh verify-webrtc-va-metadata --help",
    "./server.sh verify-v390-public-contract-interface-owner",
    "./server.sh verify-v390-transport-runtime-config-boundary",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory",
    "./server.sh verify-docs-links",
    "git diff --check",
    "listener/temp cleanup",
  ];
  assert(slice16 && slice16.rollbackCommit === "7c5130a16c70010cabbf470f8c21c62e3729f05b" &&
    slice16.nonProductionSlice === false && slice16.contractAssertions.length >= 7 &&
    slice16.tests.length === slice16Commands.length &&
    slice16Commands.every(command => slice16.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 16 rollback/contract/test inventory drift");
  assert(JSON.stringify(slice16.before) === JSON.stringify(slice15.after),
    "current continuation Slice 16 before-state is not bound to Slice 15 frontier");
  if (slice16.status === "in-progress") {
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice === 15 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial" &&
      slice16.after === null &&
      sliceTest(slice16, slice16Commands[0]).status === "pass" &&
      sliceTest(slice16, slice16Commands[1]).status === "pass" &&
      slice16.tests.slice(2).every(test => test.status === "registered"),
    "in-progress Slice 16 frontier/test state mismatch");
  } else {
    assert(slice16.after?.productionGraphSha256 === slice17?.before?.productionGraphSha256 &&
      slice16.after.productionFiles === 178 && slice16.after.cppSources === 87 &&
      slice16.after.targetViolationDirectionsUnderPolicyV1 === 3 &&
      slice16.after.transportAnalysisWitnessCount === 18 &&
      slice16.after.transportDomainWitnessCount === 1 &&
      slice16.after.largestSccOwners === 0 &&
      slice16.after.largestMixedOwnerFileLines === 10160 &&
      slice16.after.cmakeTargets === 2 && slice16.after.internalTargetSeparation === true,
    "Slice 16 source/view application boundary graph delta drift");
    const selfCheck = sliceTest(slice16,
      "./server.sh verify-v390-review4-structure-stabilization-execution");
    const testsFinal = slice16.tests.every(test => test.status === "pass") ||
      selfCheck.status === "self-check" && slice16.tests.every(test =>
        test === selfCheck || test.status === "pass");
    assert(ledger.currentContinuation.latestCompletedSlice >= 16 && testsFinal,
    "completed Slice 16 frontier/test state mismatch");
  }
  const slice17Commands = [
    "./server.sh verify-v390-appearance-readiness-application-boundary",
    "./server.sh build",
    "./server.sh verify-v390-reid-readiness-consistency",
    "./server.sh verify-v390-conditional-field-ai-decisions",
    "./server.sh verify-reid-advanced-tracking",
    "./server.sh verify-analysis-state",
    "./server.sh verify-v390-transport-runtime-config-boundary",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-v290-final-contract-freeze",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory",
    "./server.sh verify-docs-links",
    "git diff --check",
  ];
  assert(slice17 && slice17.rollbackCommit === "45b423a921f77c7ef25c55ba406bf10a42e88ce2" &&
    slice17.nonProductionSlice === false && slice17.contractAssertions.length >= 7 &&
    slice17.tests.length === slice17Commands.length &&
    slice17Commands.every(command => slice17.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 17 rollback/contract/test inventory drift");
  assert(JSON.stringify(slice17.before) === JSON.stringify(slice16.after),
    "current continuation Slice 17 before-state is not bound to Slice 16 frontier");
  if (slice17.status === "in-progress") {
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice === 16 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial" && slice17.after === null,
    "in-progress Slice 17 frontier state mismatch");
  } else {
    const transportAnalysisEdge = graph.observedModuleEdges.find(item =>
      item.direction === "transport-and-auth-adapter -> analysis-services");
    const applicationAnalysisEdge = graph.observedModuleEdges.find(item =>
      item.direction === "application-service-interfaces -> analysis-services");
    const transportApplicationEdge = graph.observedModuleEdges.find(item =>
      item.direction === "transport-and-auth-adapter -> application-service-interfaces");
    assert(JSON.stringify(slice17.after) === JSON.stringify(slice18.before) &&
      slice17.after.productionFiles === 180 && slice17.after.cppSources === 88 &&
      slice17.after.targetViolationDirectionsUnderPolicyV1 === 3 &&
      slice17.after.transportAnalysisWitnessCount === 17 &&
      slice17.after.transportDomainWitnessCount === 1 &&
      slice17.after.largestSccOwners === 0 &&
      slice17.after.largestMixedOwnerFileLines === 10156 &&
      slice17.after.cmakeTargets === 2 && slice17.after.internalTargetSeparation === true,
    "Slice 17 appearance readiness application boundary graph delta drift");
    const selfCheck = sliceTest(slice17,
      "./server.sh verify-v390-review4-structure-stabilization-execution");
    const testsFinal = slice17.tests.every(test => test.status === "pass") ||
      selfCheck.status === "self-check" && slice17.tests.every(test =>
        test === selfCheck || test.status === "pass");
    assert(ledger.currentContinuation.latestCompletedSlice >= 17 && testsFinal,
    "completed Slice 17 frontier/test state mismatch");
  }
  const slice18Commands = [
    "./server.sh verify-v390-category-catalog-application-boundary",
    "./server.sh build",
    "./server.sh verify-v390-review4-lab-core-api",
    "./server.sh verify-analysis-state",
    "./server.sh verify-v390-appearance-readiness-application-boundary",
    "./server.sh verify-v390-transport-runtime-config-boundary",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory",
    "./server.sh verify-docs-links",
    "git diff --check",
  ];
  assert(slice18 && slice18.rollbackCommit === "416583b8f01c7ea8c0fda38c93b715a4f0841b0a" &&
    slice18.nonProductionSlice === false && slice18.contractAssertions.length >= 7 &&
    slice18.tests.length === slice18Commands.length &&
    slice18Commands.every(command => slice18.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 18 rollback/contract/test inventory drift");
  assert(JSON.stringify(slice18.before) === JSON.stringify(slice17.after),
    "current continuation Slice 18 before-state is not bound to Slice 17 frontier");
  if (slice18.status === "in-progress") {
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice === 17 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial" && slice18.after === null,
    "in-progress Slice 18 frontier state mismatch");
  } else {
    const transportAnalysisEdge = graph.observedModuleEdges.find(item =>
      item.direction === "transport-and-auth-adapter -> analysis-services");
    const applicationAnalysisEdge = graph.observedModuleEdges.find(item =>
      item.direction === "application-service-interfaces -> analysis-services");
    const transportApplicationEdge = graph.observedModuleEdges.find(item =>
      item.direction === "transport-and-auth-adapter -> application-service-interfaces");
    assert(JSON.stringify(slice18.after) === JSON.stringify(slice19.before) &&
      slice18.after.productionFiles === 182 && slice18.after.cppSources === 89 &&
      slice18.after.targetViolationDirectionsUnderPolicyV1 === 3 &&
      slice18.after.transportAnalysisWitnessCount === 16 &&
      slice18.after.transportDomainWitnessCount === 1 &&
      slice18.after.largestSccOwners === 0 &&
      slice18.after.largestMixedOwnerFileLines === 10156 &&
      slice18.after.cmakeTargets === 2 && slice18.after.internalTargetSeparation === true,
    "Slice 18 category catalog application boundary graph delta drift");
    const selfCheck = sliceTest(slice18,
      "./server.sh verify-v390-review4-structure-stabilization-execution");
    const testsFinal = slice18.tests.every(test => test.status === "pass") ||
      selfCheck.status === "self-check" && slice18.tests.every(test =>
        test === selfCheck || test.status === "pass");
    assert(ledger.currentContinuation.latestCompletedSlice >= 18 && testsFinal,
    "completed Slice 18 frontier/test state mismatch");
  }
  const slice19Commands = [
    "./server.sh verify-v390-vlm-observation-application-boundary", "./server.sh build",
    "./server.sh verify-v390-review4-lab-core-api", "./server.sh verify-v390-vlm-incident-rule-provenance",
    "./server.sh verify-analysis-state", "./server.sh verify-vlm-observation-sidecar",
    "./server.sh verify-vlm-ops-event-review-ui", "./server.sh verify-vlm-rule-suggestion-draft-workflow",
    "./server.sh verify-v260-rule-suggestion-review", "./server.sh verify-v390-transport-runtime-config-boundary",
    "./server.sh verify-v390-appearance-readiness-application-boundary",
    "./server.sh verify-v390-category-catalog-application-boundary",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory", "./server.sh verify-docs-links", "git diff --check",
  ];
  assert(slice19 && slice19.rollbackCommit === "ec04c96c754ddb4243d1458b6cae6af82fc6e8d8" &&
    slice19.nonProductionSlice === false && slice19.contractAssertions.length >= 7 &&
    slice19.tests.length === slice19Commands.length &&
    slice19Commands.every(command => slice19.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 19 rollback/contract/test inventory drift");
  assert(JSON.stringify(slice19.before) === JSON.stringify(slice18.after),
    "current continuation Slice 19 before-state is not bound to Slice 18 frontier");
  assert(JSON.stringify(slice19.after) === JSON.stringify(slice20.before) &&
    slice19.after.productionFiles === 184 && slice19.after.cppSources === 90 &&
    slice19.after.targetViolationDirectionsUnderPolicyV1 === 3 &&
    slice19.after.transportAnalysisWitnessCount === 15 && slice19.after.transportDomainWitnessCount === 1 &&
    slice19.after.largestSccOwners === 0 && slice19.after.largestMixedOwnerFileLines === 10156 &&
    slice19.after.cmakeTargets === 2 && slice19.after.internalTargetSeparation === true,
  "Slice 19 VLM observation application boundary graph delta drift");
  const slice19SelfCheck = sliceTest(slice19,
    "./server.sh verify-v390-review4-structure-stabilization-execution");
  assert(ledger.currentContinuation.latestCompletedSlice >= 19 &&
    slice19.tests.every(test => test === slice19SelfCheck ? test.status === "self-check" : test.status === "pass"),
  "completed Slice 19 frontier/test state mismatch");
  const slice20Commands = [
    "./server.sh verify-v390-incident-memory-application-boundary", "./server.sh build",
    "./server.sh verify-analysis-state",
    "./server.sh verify-v250-incident-text-projection", "./server.sh verify-v250-incident-memory-index",
    "./server.sh verify-v250-ops-events-semantic-search-ui", "./server.sh verify-v250-similar-incident-lookup",
    "./server.sh verify-v250-owner-release-readiness", "./server.sh verify-v260-incident-memory-productization",
    "./server.sh verify-v390-vlm-observation-application-boundary",
    "./server.sh verify-v390-category-catalog-application-boundary",
    "./server.sh verify-v390-appearance-readiness-application-boundary",
    "./server.sh verify-v390-transport-runtime-config-boundary",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory", "./server.sh verify-docs-links", "git diff --check",
  ];
  assert(slice20 && slice20.rollbackCommit === "eb9e64e9a550e32bb33bb3ff3217fceede65045e" &&
    slice20.nonProductionSlice === false && slice20.contractAssertions.length >= 7 &&
    slice20.tests.length === slice20Commands.length &&
    slice20Commands.every(command => slice20.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 20 rollback/contract/test inventory drift");
  assert(JSON.stringify(slice20.before) === JSON.stringify(slice19.after),
    "current continuation Slice 20 before-state is not bound to Slice 19 frontier");
  assert(JSON.stringify(slice20.after) === JSON.stringify(slice21.before) &&
    slice20.after.productionFiles === 186 && slice20.after.cppSources === 91 &&
    slice20.after.targetViolationDirectionsUnderPolicyV1 === 3 &&
    slice20.after.transportAnalysisWitnessCount === 14 && slice20.after.transportDomainWitnessCount === 1 &&
    slice20.after.largestSccOwners === 0 && slice20.after.largestMixedOwnerFileLines === 10156 &&
    slice20.after.cmakeTargets === 2 && slice20.after.internalTargetSeparation === true,
  "Slice 20 incident-memory application boundary graph delta drift");
  const slice20SelfCheck = sliceTest(slice20,
    "./server.sh verify-v390-review4-structure-stabilization-execution");
  assert(ledger.currentContinuation.latestCompletedSlice >= 20 &&
    slice20.tests.every(test => test === slice20SelfCheck ? test.status === "self-check" : test.status === "pass"),
  "completed Slice 20 frontier/test state mismatch");
  const slice21Commands = [
    "./server.sh verify-v390-event-post-application-boundary", "./server.sh build",
    "./server.sh verify-analysis-state", "./server.sh verify-event-post --mode disabled",
    "./server.sh verify-event-post --mode schema", "./server.sh verify-event-post --mode queue",
    "./server.sh verify-event-post --mode recovery",
    "./server.sh verify-v390-core-media-analysis-port-inversion",
    "./server.sh verify-webrtc-va-metadata", "./server.sh verify-rtsp-va-overlay-policy",
    "./server.sh verify-v290-final-contract-freeze", "./server.sh verify-vlm-runtime-status-ui",
    "./server.sh verify-vlm-evaluation-result-workflow",
    "./server.sh verify-v390-incident-memory-application-boundary",
    "./server.sh verify-v390-vlm-observation-application-boundary",
    "./server.sh verify-v390-category-catalog-application-boundary",
    "./server.sh verify-v390-appearance-readiness-application-boundary",
    "./server.sh verify-v390-transport-runtime-config-boundary",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory", "./server.sh verify-docs-links", "git diff --check",
  ];
  assert(slice21 && slice21.rollbackCommit === "cb9c6950f43df1b489175b9e85c638e042ab6e4c" &&
    slice21.nonProductionSlice === false && slice21.contractAssertions.length >= 8 &&
    slice21.tests.length === slice21Commands.length &&
    slice21Commands.every(command => slice21.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 21 rollback/contract/test inventory drift");
  const transportAnalysisEdge = graph.observedModuleEdges.find(item =>
    item.direction === "transport-and-auth-adapter -> analysis-services");
  const applicationAnalysisEdge = graph.observedModuleEdges.find(item =>
    item.direction === "application-service-interfaces -> analysis-services");
  const transportApplicationEdge = graph.observedModuleEdges.find(item =>
    item.direction === "transport-and-auth-adapter -> application-service-interfaces");
  assert(JSON.stringify(slice21.after) === JSON.stringify(slice22.before) &&
    slice21.after.productionFiles === 188 && slice21.after.cppSources === 92 &&
    slice21.after.targetViolationDirectionsUnderPolicyV1 === 3 &&
    slice21.after.transportAnalysisWitnessCount === 13 && slice21.after.transportDomainWitnessCount === 1 &&
    slice21.after.largestSccOwners === 0 && slice21.after.largestMixedOwnerFileLines === 10156 &&
    slice21.after.cmakeTargets === 2 && slice21.after.internalTargetSeparation === true,
  "Slice 21 Event POST application boundary graph delta drift");
  const slice21SelfCheck = sliceTest(slice21,
    "./server.sh verify-v390-review4-structure-stabilization-execution");
  assert(ledger.currentContinuation.latestCompletedSlice >= 21 &&
    slice21.tests.every(test => test === slice21SelfCheck ? test.status === "self-check" : test.status === "pass"),
  "completed Slice 21 frontier/test state mismatch");
  const slice22Commands = [
    "./server.sh verify-v390-image-codec-application-boundary", "./server.sh build",
    "MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_BUILD_DIR=build-gst-onnx MEDIA_SERVER_SKIP_BUILD=1 MEDIA_SERVER_AUTH_MODE=off MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 ./server.sh foreground",
    "MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 ./server.sh verify-image-analysis",
    "MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 ./server.sh verify-v390-review4-lab-core-api",
    "MEDIA_SERVER_SKIP_LOCAL_ENV=1 MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 ./server.sh verify-redaction", "./server.sh verify-analysis-state",
    "./server.sh verify-v290-final-contract-freeze",
    "./server.sh verify-v390-event-post-application-boundary",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory", "./server.sh verify-docs-links",
    "git diff --check",
    "cleanup targets: /private/tmp/media_server_image-analysis-1784081998-9203* /private/tmp/media_server_redaction-1784082025-9662* /private/tmp/media_server_redaction-1784082066-10425*",
    "lsof -nP -iTCP:8081 -iTCP:8555 -sTCP:LISTEN",
  ];
  assert(slice22 && slice22.rollbackCommit === "16d6ffaa64290db3a74ae189102881572ae5b96c" &&
    slice22.nonProductionSlice === false && slice22.contractAssertions.length >= 8 &&
    slice22.tests.length === slice22Commands.length &&
    slice22Commands.every(command => slice22.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 22 rollback/contract/test inventory drift");
  assert(JSON.stringify(slice22.after) === JSON.stringify(slice23.before) &&
    slice22.after.productionFiles === 190 && slice22.after.cppSources === 93 &&
    slice22.after.targetViolationDirectionsUnderPolicyV1 === 3 &&
    slice22.after.transportAnalysisWitnessCount === 11 && slice22.after.transportDomainWitnessCount === 1 &&
    slice22.after.largestSccOwners === 0 && slice22.after.largestMixedOwnerFileLines === 10156 &&
    slice22.after.cmakeTargets === 2 && slice22.after.internalTargetSeparation === true,
  "Slice 22 image codec application boundary graph delta drift");
  const slice22SelfCheck = sliceTest(slice22,
    "./server.sh verify-v390-review4-structure-stabilization-execution");
  assert(ledger.currentContinuation.latestCompletedSlice >= 22 &&
    slice22.tests.every(test => test === slice22SelfCheck ? test.status === "self-check" : test.status === "pass"),
  "completed Slice 22 frontier/test state mismatch");
  const slice23Commands = [
    "./server.sh verify-v390-analysis-rule-private-declaration-boundary", "./server.sh build",
    "./server.sh verify-v390-analysis-registry-durable-write", "./server.sh verify-analysis-state",
    "./server.sh verify-v390-public-contract-interface-owner",
    "./server.sh verify-v390-source-view-application-boundary",
    "./server.sh verify-v290-final-contract-freeze",
    "./server.sh verify-v390-image-codec-application-boundary",
    "./server.sh verify-v390-event-post-application-boundary",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory", "./server.sh verify-docs-links", "git diff --check",
    "cleanup targets: /private/tmp/media_server_analysis_state_smoke-{19397,24088,88152,85104,10939,81114,50722,68177} /private/tmp/media_server_analysis_state_dep_scan.txt",
    "lsof -nP -iTCP:8081 -iTCP:8555 -sTCP:LISTEN",
  ];
  assert(slice23 && slice23.rollbackCommit === "d79b75bc" &&
    slice23.nonProductionSlice === false && slice23.contractAssertions.length >= 8 &&
    slice23.tests.length === slice23Commands.length &&
    slice23Commands.every(command => slice23.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 23 rollback/contract/test inventory drift");
  const transportDomainEdge = graph.observedModuleEdges.find(item =>
    item.direction === "transport-and-auth-adapter -> domain-and-registry-owners");
  const transportCoreEdge = graph.observedModuleEdges.find(item =>
    item.direction === "transport-and-auth-adapter -> core-media-interfaces");
  assert(slice23.after?.productionGraphSha256 === slice24?.before?.productionGraphSha256 &&
    slice23.after.productionFiles === 194 && slice23.after.cppSources === 95 &&
    slice23.after.targetViolationDirectionsUnderPolicyV1 === 2 &&
    slice23.after.transportAnalysisWitnessCount === 11 && slice23.after.transportDomainWitnessCount === 0 &&
    slice23.after.largestSccOwners === 0 && slice23.after.largestMixedOwnerFileLines === 10156 &&
    slice23.after.cmakeTargets === 2 && slice23.after.internalTargetSeparation === true,
  "Slice 23 analysis rule port/adapter/backend graph delta drift");
  const slice23SelfCheck = sliceTest(slice23,
    "./server.sh verify-v390-review4-structure-stabilization-execution");
  assert(ledger.currentContinuation.latestCompletedSlice >= 23 &&
    slice23.tests.every(test => test === slice23SelfCheck ? test.status === "self-check" : test.status === "pass"),
  "completed Slice 23 frontier/test state mismatch");
  const slice24Commands = [
    "./server.sh verify-v390-analysis-frame-application-boundary", "./server.sh build",
    "./server.sh verify-image-analysis", "./server.sh verify-redaction",
    "./server.sh verify-tracker-stability", "./server.sh verify-analysis-state",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory", "./server.sh verify-docs-links", "git diff --check",
    "cleanup targets: image-analysis-1784087934-3228, redaction-1784087950-3470, tracker-stability-1784087997-3865, close_object_tracker_1784087871_2454, analysis_state_smoke-2461 and dep scan",
    "lsof -nP -iTCP:8081 -iTCP:8555 -sTCP:LISTEN",
  ];
  assert(slice24 && slice24.rollbackCommit === "524e90df" &&
    slice24.nonProductionSlice === false && slice24.contractAssertions.length >= 8 &&
    slice24.tests.length === slice24Commands.length &&
    slice24Commands.every(command => slice24.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 24 rollback/contract/test inventory drift");
  assert(slice24.after?.productionGraphSha256 === slice25?.before?.productionGraphSha256 &&
    slice24.after.productionFiles === 196 && slice24.after.cppSources === 96 &&
    slice24.after.targetViolationDirectionsUnderPolicyV1 === 2 &&
    slice24.after.transportAnalysisWitnessCount === 8 && slice24.after.transportCoreMediaWitnessCount === 4 &&
    slice24.after.largestSccOwners === 0 && slice24.after.largestMixedOwnerFileLines === 10156 &&
    slice24.after.cmakeTargets === 2 && slice24.after.internalTargetSeparation === true,
  "Slice 24 analysis frame application graph delta drift");
  const slice24SelfCheck = sliceTest(slice24,
    "./server.sh verify-v390-review4-structure-stabilization-execution");
  assert(ledger.currentContinuation.latestCompletedSlice >= 24 &&
    slice24.tests.every(test => test === slice24SelfCheck ? test.status === "self-check" : test.status === "pass"),
  "completed Slice 24 frontier/test state mismatch");
  const slice25Commands = [
    "./server.sh verify-v390-va-metadata-application-boundary", "./server.sh build",
    "./server.sh verify-webrtc-va-metadata", "./server.sh verify-va-metadata-sidechannel",
    "./server.sh verify-sse-metadata", "./server.sh verify-ws-metadata",
    "./server.sh verify-analysis-state",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory", "./server.sh verify-docs-links", "git diff --check",
    "cleanup Slice 25 metadata/analysis temporary artifacts",
    "lsof -nP -iTCP:8081 -iTCP:8555 -sTCP:LISTEN",
  ];
  assert(slice25 && slice25.rollbackCommit === "f88098a7d1586006d0d64e934b0db25655ceb814" &&
    slice25.nonProductionSlice === false && slice25.contractAssertions.length >= 8 &&
    slice25.tests.length === slice25Commands.length &&
    slice25Commands.every(command => slice25.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 25 rollback/contract/test inventory drift");
  assert(slice25.after?.productionGraphSha256 === slice26?.before?.productionGraphSha256 &&
    slice25.after.productionFiles === 198 && slice25.after.cppSources === 97 &&
    slice25.after.targetViolationDirectionsUnderPolicyV1 === 2 &&
    slice25.after.transportAnalysisWitnessCount === 6 && slice25.after.transportCoreMediaWitnessCount === 4 &&
    slice25.after.largestSccOwners === 0 && slice25.after.largestMixedOwnerFileLines === 10156 &&
    slice25.after.cmakeTargets === 2 && slice25.after.internalTargetSeparation === true &&
    slice25.after.cmakeTargets === 2 && slice25.after.internalTargetSeparation === true,
  "Slice 25 VA metadata application graph delta drift");
  const slice25SelfCheck = sliceTest(slice25,
    "./server.sh verify-v390-review4-structure-stabilization-execution");
  if (slice25.status === "in-progress") {
    assert(ledger.currentContinuation.latestCompletedSlice === 24 &&
      ledger.currentContinuation.status === "in-progress" &&
      slice25SelfCheck.status === "self-check",
    "in-progress Slice 25 frontier overclaim");
  } else {
    assert(ledger.currentContinuation.latestCompletedSlice >= 25 &&
      slice25.tests.every(test => test === slice25SelfCheck ? test.status === "self-check" : test.status === "pass"),
    "completed Slice 25 frontier/test state mismatch");
  }
  const slice26Commands = [
    "./server.sh verify-v390-analysis-frame-application-boundary", "./server.sh build",
    "./server.sh verify-v390-analysis-query-owner-boundary",
    "./server.sh verify-v390-core-media-analysis-port-inversion",
    "./server.sh verify-v390-analysis-runtime-port-boundary",
    "./server.sh verify-webrtc-va-metadata", "./server.sh verify-rtsp-va-overlay-policy",
    "./server.sh verify-analysis-state",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory", "./server.sh verify-docs-links", "git diff --check",
    "cleanup Slice 26 analysis/overlay temporary artifacts",
    "lsof -nP -iTCP:8081 -iTCP:8555 -sTCP:LISTEN",
  ];
  assert(slice26 && slice26.rollbackCommit === "708c3a64" &&
    slice26.nonProductionSlice === false && slice26.contractAssertions.length >= 8 &&
    slice26.tests.length === slice26Commands.length &&
    slice26Commands.every(command => slice26.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 26 rollback/contract/test inventory drift");
  assert(slice26.after?.productionGraphSha256 === slice27?.before?.productionGraphSha256 &&
    slice26.after.productionFiles === 198 && slice26.after.cppSources === 97 &&
    slice26.after.targetViolationDirectionsUnderPolicyV1 === 2 &&
    slice26.after.transportAnalysisWitnessCount === 4 && slice26.after.transportCoreMediaWitnessCount === 4 &&
    slice26.after.largestSccOwners === 0 && slice26.after.largestMixedOwnerFileLines === 10156 &&
    slice26.after.cmakeTargets === 2 && slice26.after.internalTargetSeparation === true,
  "Slice 26 analysis query and overlay application graph delta drift");
  const slice26SelfCheck = sliceTest(slice26,
    "./server.sh verify-v390-review4-structure-stabilization-execution");
  if (slice26.status === "in-progress") {
    assert(ledger.currentContinuation.latestCompletedSlice === 25 &&
      ledger.currentContinuation.status === "in-progress" && slice26SelfCheck.status === "self-check",
    "in-progress Slice 26 frontier overclaim");
  } else {
    assert(ledger.currentContinuation.latestCompletedSlice >= 26 &&
      slice26.tests.every(test => test === slice26SelfCheck ? test.status === "self-check" : test.status === "pass"),
    "completed Slice 26 frontier/test state mismatch");
  }
  const slice27Commands = [
    "./server.sh verify-v390-event-feature-search-application-boundary", "./server.sh build",
    "./server.sh verify-v300-feature-search-index",
    "./server.sh verify-v300-search-dsl-query-convert",
    "./server.sh verify-v310-scoped-integrator-search-api",
    "./server.sh verify-analysis-state",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory", "./server.sh verify-docs-links", "git diff --check",
    "cleanup Slice 27 feature-search temporary artifacts",
    "lsof -nP -iTCP:8081 -iTCP:8555 -sTCP:LISTEN",
  ];
  assert(slice27 && slice27.rollbackCommit === "3e772bfe" &&
    slice27.nonProductionSlice === false && slice27.contractAssertions.length >= 8 &&
    slice27.tests.length === slice27Commands.length &&
    slice27Commands.every(command => slice27.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 27 rollback/contract/test inventory drift");
  assert(slice27.after?.productionGraphSha256 === slice28?.before?.productionGraphSha256 &&
    slice27.after.productionFiles === 200 && slice27.after.cppSources === 98 &&
    slice27.after.targetViolationDirectionsUnderPolicyV1 === 2 &&
    slice27.after.transportAnalysisWitnessCount === 3 && slice27.after.transportCoreMediaWitnessCount === 4 &&
    slice27.after.largestSccOwners === 0 && slice27.after.largestMixedOwnerFileLines === 10156 &&
    slice27.after.cmakeTargets === 2 && slice27.after.internalTargetSeparation === true,
  "Slice 27 event feature search application graph delta drift");
  const slice27SelfCheck = sliceTest(slice27,
    "./server.sh verify-v390-review4-structure-stabilization-execution");
  if (slice27.status === "in-progress") {
    assert(ledger.currentContinuation.latestCompletedSlice === 26 &&
      ledger.currentContinuation.status === "in-progress" && slice27SelfCheck.status === "self-check",
    "in-progress Slice 27 frontier overclaim");
  } else {
    assert(ledger.currentContinuation.latestCompletedSlice >= 27 &&
      slice27.tests.every(test => test === slice27SelfCheck ? test.status === "self-check" : test.status === "pass"),
    "completed Slice 27 frontier/test state mismatch");
  }
  const slice28Commands = [
    "./server.sh verify-v390-event-storage-application-boundary", "./server.sh build",
    "./server.sh verify-ops-event-records-scope",
    "./server.sh verify-v300-event-evidence-contract",
    "./server.sh verify-v310-event-clip-contract",
    "./server.sh verify-v310-scoped-integrator-search-api",
    "./server.sh verify-analysis-state",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory", "./server.sh verify-docs-links", "git diff --check",
    "cleanup Slice 28 event-storage temporary artifacts",
    "lsof -nP -iTCP:8081 -iTCP:8555 -sTCP:LISTEN",
  ];
  assert(slice28 && slice28.rollbackCommit === "d1b26d1b" &&
    slice28.nonProductionSlice === false && slice28.contractAssertions.length >= 9 &&
    slice28.tests.length === slice28Commands.length &&
    slice28Commands.every(command => slice28.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 28 rollback/contract/test inventory drift");
  assert(JSON.stringify(slice28.after) === JSON.stringify(slice29?.before) &&
    slice28.after.productionFiles === 202 && slice28.after.cppSources === 99 &&
    slice28.after.targetViolationDirectionsUnderPolicyV1 === 2 &&
    slice28.after.transportAnalysisWitnessCount === 2 && slice28.after.transportCoreMediaWitnessCount === 4 &&
    slice28.after.largestSccOwners === 0 && slice28.after.largestMixedOwnerFileLines === 10156 &&
    slice28.after.cmakeTargets === 2 && slice28.after.internalTargetSeparation === true,
  "Slice 28 event storage application graph delta drift");
  const slice28SelfCheck = sliceTest(slice28,
    "./server.sh verify-v390-review4-structure-stabilization-execution");
  if (slice28.status === "in-progress") {
    assert(ledger.currentContinuation.latestCompletedSlice === 27 &&
      ledger.currentContinuation.status === "in-progress" && slice28SelfCheck.status === "self-check",
    "in-progress Slice 28 frontier overclaim");
  } else {
    assert(ledger.currentContinuation.latestCompletedSlice >= 28 &&
      slice28.tests.every(test => test === slice28SelfCheck ? test.status === "self-check" : test.status === "pass"),
    "completed Slice 28 frontier/test state mismatch");
  }
  const slice29Commands = [
    "./server.sh verify-v390-event-rule-application-boundary", "./server.sh build",
    "./server.sh verify-analysis-state", "./server.sh verify-sse-metadata",
    "./server.sh verify-ws-metadata", "./server.sh verify-webrtc-va-metadata",
    "./server.sh verify-rtsp-va-overlay-policy",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory", "./server.sh verify-docs-links", "git diff --check",
    "cleanup Slice 29 event-rule temporary artifacts",
    "lsof -nP -iTCP:8081 -iTCP:8555 -sTCP:LISTEN",
  ];
  assert(slice29 && slice29.rollbackCommit === "dcdd0ee8" &&
    slice29.nonProductionSlice === false && slice29.contractAssertions.length >= 9 &&
    slice29.tests.length === slice29Commands.length &&
    slice29Commands.every(command => slice29.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 29 rollback/contract/test inventory drift");
  assert(JSON.stringify(slice29.after) === JSON.stringify(slice30?.before) &&
    slice29.after?.productionGraphSha256 === "1acac0820b29a0292d4ad6051c4a76201595632d7d60d5a80a794cd2602ce461" &&
    slice29.after.productionFiles === 204 && slice29.after.cppSources === 100 &&
    slice29.after.targetViolationDirectionsUnderPolicyV1 === 2 &&
    slice29.after.transportAnalysisWitnessCount === 1 && slice29.after.transportCoreMediaWitnessCount === 4 &&
    slice29.after.largestSccOwners === 0 && slice29.after.largestMixedOwnerFileLines === 10156 &&
    slice29.after.cmakeTargets === 2 && slice29.after.internalTargetSeparation === true,
  "Slice 29 event rule application graph delta drift");
  const slice29SelfCheck = sliceTest(slice29,
    "./server.sh verify-v390-review4-structure-stabilization-execution");
  if (slice29.status === "in-progress") {
    assert(ledger.currentContinuation.latestCompletedSlice === 28 &&
      ledger.currentContinuation.status === "in-progress" && slice29SelfCheck.status === "self-check" &&
      slice29.tests.every(test => ["registered", "pass", "self-check"].includes(test.status)),
    "in-progress Slice 29 frontier false-PASS");
  } else {
    assert(ledger.currentContinuation.latestCompletedSlice >= 29 &&
      slice29.tests.every(test => test === slice29SelfCheck ? test.status === "self-check" : test.status === "pass"),
    "completed Slice 29 frontier/test state mismatch");
  }
  assert(validateSlice29Binding(ledger, graph).length === 0,
    `Slice 29 named binding mismatch: ${validateSlice29Binding(ledger, graph).join(",")}`);
  const slice30Commands = [
    "./server.sh verify-v390-analysis-session-read-application-boundary", "./server.sh build",
    "standalone C++17 read service header and adapter syntax compile", "./server.sh verify-analysis-state",
    "./server.sh verify-sse-metadata", "./server.sh verify-ws-metadata",
    "./server.sh verify-webrtc-va-metadata", "./server.sh verify-rtsp-va-overlay-policy",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory", "./server.sh verify-docs-links", "git diff --check",
    "cleanup Slice 30A analysis-session-read temporary artifacts",
    "lsof -nP -iTCP:8081 -iTCP:8555 -sTCP:LISTEN",
  ];
  const slice30Contracts = [
    "the read service public contract contains no canonical analysis, core, unsafe pointer, any, or variant dependency and reuses only the approved application frame DTO leaf",
    "the canonical adapter maps every scalar, optional, vector, nested result, tracking, adaptive, debug, metrics, frame, and snapshot field without reordering or default drift",
    "Snapshot eleven, Snapshots fifty-four, WaitResultNearPts two, LatestFrame one, LatestFrameAndResult one, and ActiveTapCount two transport reads use the injected application port",
    "wait timeout remains milliseconds and null optionals, list order, exceptions, and active-count values propagate unchanged",
    "Event Rule evaluation, VA metadata serialization, overlay rendering, JSON helpers, Ops health, SSE, WebSocket, WebRTC, and runtime read consumers preserve output and ordering through standard DTO overloads",
    "composition root creates the canonical adapter before HTTP construction and owns it longer than the injected HTTP server reference",
    "Attach, DetachAnalysisTapRef, create, provider, RTSP, and overlay attachment lifecycle remains canonical and explicitly open for Slice 30B",
    "the policy explicitly permits composition-root to application-service dependency while immutable historical policy evidence remains unchanged",
    "the graph keeps transport-to-analysis one and core-media four with two violation directions and zero SCC because lifecycle and core-media closure are not claimed",
    "no API/schema/status/error/event payload/WebRTC/SSE/WS/RTSP media behavior changes and parked evidence remains non-final",
  ];
  assert(slice30 && slice30.rollbackCommit === "81d3be9d" && slice30.nonProductionSlice === false &&
    JSON.stringify(slice30.contractAssertions) === JSON.stringify(slice30Contracts) &&
    slice30.tests.length === slice30Commands.length &&
    slice30Commands.every(command => slice30.tests.filter(test => test.command === command).length === 1),
  "current continuation Slice 30A rollback/contract/test inventory drift");
  assert(validateSlice30Binding(ledger, graph, policy).length === 0,
    `Slice 30A named binding mismatch: ${validateSlice30Binding(ledger, graph, policy).join(",")}`);
  const slice31Commands = [
    "./server.sh verify-v390-analysis-session-lifecycle-application-boundary",
    "./server.sh build", "./server.sh verify-analysis-state",
    "./server.sh verify-sse-metadata and verify-va-metadata-sidechannel",
    "./server.sh verify-ws-metadata", "./server.sh verify-webrtc-va-metadata",
    "./server.sh verify-rtsp-va-overlay-policy", "affected predecessor boundary verifier matrix",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory", "./server.sh verify-docs-links", "git diff --check",
    "cleanup Slice 30B lifecycle temporary artifacts",
    "lsof -nP -iTCP:8081 -iTCP:8555 -sTCP:LISTEN",
  ];
  const slice31Contracts = [
    "the lifecycle service contract is standard-only and maps protocol, path, query, and client_id without defaults or loss",
    "the canonical adapter explicitly maps all eight attach result fields and all five detach result fields without positional aggregate ambiguity",
    "exactly four HTTP attach sites use the injected lifecycle port and transport has zero canonical AnalysisSessionService include, type, AttachAnalysisTap, or DetachAnalysisTapRef access",
    "detach releases exactly five Event Rule runtime keys only when removed is true and preserves the canonical ok result",
    "composition constructs canonical service then lifecycle and read adapters before HTTP and shares the same canonical identity with RTSP and runtime provider",
    "the compatibility value-type facade exposes analysis DTO values only and never exposes canonical lifecycle service access",
    "RTSP remains behind the existing core MediaAnalysisPort and overlay provider preserves near-result to latest fallback then Record to Post to metadata order",
    "tap create JSON status, message, tapId, streamKey, streamCreated, reused, reuseKey, refCount, and activeTaps bytes remain unchanged",
    "the graph removes transport-to-analysis while keeping core-media four explicit with one remaining violation direction and zero SCC",
    "no API/schema/status/error/event payload/WebRTC/SSE/WS/RTSP media behavior changes and REVIEW4-64 remains open for the core-media slice",
  ];
  const slice31RequiredAllowed = [
    "CMakeLists.txt", "server.sh", "include/ingress/analysis_legacy_application_types.h",
    "include/ingress/analysis_session_lifecycle_application_service.h",
    "include/ingress/analysis_session_lifecycle_application_adapter.h",
    "src/ingress/analysis_session_lifecycle_application_adapter.cpp",
    "include/ingress/webrtc_http_server.h", "src/application/media_server_application.cpp",
    "src/ingress/webrtc_http_server.cpp", "src/ingress/webrtc_http_server_detail.h",
    "src/ingress/webrtc_http_server_ops_incidents.cpp", "src/ingress/webrtc_http_server_runtime.cpp",
    "scripts/internal/verify_v390_analysis_session_lifecycle_application_boundary.mjs",
    "scripts/internal/verify_v390_structure_stabilization_execution.mjs",
    "test/fixtures/v390_structure_stabilization_current_graph.json",
    "test/fixtures/v390_structure_stabilization_execution.json",
  ];
  assert(slice31 && slice31.rollbackCommit === "758b09b4" && slice31.nonProductionSlice === false &&
    JSON.stringify(slice31.contractAssertions) === JSON.stringify(slice31Contracts) &&
    slice31.tests.length === slice31Commands.length &&
    slice31Commands.every(command => slice31.tests.filter(test => test.command === command).length === 1) &&
    slice31RequiredAllowed.every(file => slice31.allowedFiles.includes(file) && slice31.changedFiles.includes(file)),
  "current continuation Slice 31 rollback/contract/test/file inventory drift");
  assert(JSON.stringify(slice30.after) === JSON.stringify(slice31.before) &&
    slice31.before.productionGraphSha256 === "7b589b4df78580e71edbf7e49a5d5953e454a475c50c98a5e1a33db23ebd1f8c" &&
    slice31.after.productionGraphSha256 === "dc68a9bacd49888a89f5689eff85fff8a48a3244596a2aafbd765a3e812017e9" &&
    slice31.after.productionFiles === 212 && slice31.after.cppSources === 102 &&
    slice31.after.targetViolationDirectionsUnderPolicyV1 === 1 &&
    slice31.after.transportAnalysisWitnessCount === 0 &&
    slice31.after.transportCoreMediaWitnessCount === 4 && slice31.after.largestSccOwners === 0 &&
    slice31.after.largestMixedOwnerFileLines === 10156 && slice31.after.cmakeTargets === 2 &&
    slice31.after.internalTargetSeparation === true,
  "Slice 31 Analysis Session lifecycle graph delta drift");
  assert(validateSlice31Binding(ledger, graph, policy).length === 0,
    `Slice 31 named binding mismatch: ${validateSlice31Binding(ledger, graph, policy).join(",")}`);
  const slice32Commands = [
    "./server.sh verify-v390-webrtc-media-application-boundary", "./server.sh build",
    "affected predecessor boundary verifier matrix", "./server.sh verify-analysis-state",
    "./server.sh verify-webrtc-ice", "./server.sh verify-codecs",
    "./server.sh verify-sse-metadata and verify-va-metadata-sidechannel",
    "./server.sh verify-ws-metadata", "./server.sh verify-webrtc-va-metadata",
    "./server.sh verify-rtsp-va-overlay-policy", "./server.sh verify-ops-source-lifecycle",
    "./server.sh verify-ops-source-health-bulk", "./server.sh verify-v390-review4-lab-core-api",
    "./server.sh verify-v390-webrtc-http-server-source-bundle",
    "./server.sh verify-v390-webrtc-http-server-physical-split",
    "./server.sh verify-v390-review4-structure-stabilization-execution",
    "./server.sh verify-script-inventory", "./server.sh verify-docs-links", "git diff --check",
    "cleanup Slice 32 temporary artifacts",
    "lsof -nP -iTCP:8081 -iTCP:8555 -sTCP:LISTEN",
  ];
  const slice32Contracts = [
    "the public media application service is standard-only and exposes deep request, source, descriptor, ICE, metadata, and runtime DTOs plus opaque egress and source session ports",
    "the canonical adapter source alone includes SessionManager, WebRtcEgressSession, WebRtcSourceRegistry, and WebRtcSourceSession and explicitly maps every field",
    "all eleven transport files have zero direct or transitive canonical core-media include and zero core::, media::, or concrete WebRTC session/registry symbol access",
    "SessionManager CreateSession and packet callback ownership move behind egress Start while the result preserves create-failure versus bridge-start-failure status selection",
    "server-offer, WHEP, WHIP, answer, ICE, DELETE, server Stop, overlay, metadata, and runtime/source-health ordering and bytes remain unchanged",
    "analysis rule application projection is query-only so transport no longer requires the canonical media request merely for rule mutation",
    "descriptor track kind and codec are deep-copied as canonical string values while track order, caps, clock rate, channels, live flag, and optional descriptor state remain exact",
    "the current policy explicitly allows application-to-core-media adapter ownership while transport-to-core-media and transport-to-core-utilities are absent",
    "the graph meets zero violation directions, zero SCC, mixed-owner budget, and actual CMake separation without reclassifying any canonical core owner",
    "no API/schema/status/error/event payload/WebRTC/SSE/WS/RTSP media behavior changes and parked evidence remains non-final until independent acceptance",
  ];
  const slice32RequiredAllowed = [
    "CMakeLists.txt", "server.sh", "include/ingress/webrtc_media_application_service.h",
    "include/ingress/webrtc_media_application_adapter.h",
    "src/ingress/webrtc_media_application_adapter.cpp",
    "include/ingress/analysis_rule_application_service.h",
    "src/ingress/analysis_rule_application_service.cpp",
    "include/ingress/webrtc_http_analysis_rule_declarations.h",
    "include/ingress/webrtc_http_server.h", "src/application/media_server_application.cpp",
    "src/ingress/webrtc_http_server.cpp", "src/ingress/webrtc_http_server_detail.h",
    "src/ingress/webrtc_http_server_ops_foundation.cpp",
    "src/ingress/webrtc_http_server_ops_incidents.cpp",
    "src/ingress/webrtc_http_server_runtime.cpp",
    "scripts/internal/verify_v390_webrtc_media_application_boundary.mjs",
    "scripts/internal/verify_codec_matrix.sh",
    "scripts/internal/verify_v390_structure_stabilization_execution.mjs",
    "test/fixtures/v390_structure_stabilization_current_architecture_policy.json",
    "test/fixtures/v390_structure_stabilization_current_graph.json",
    "test/fixtures/v390_structure_stabilization_execution.json",
  ];
  assert(slice32 && slice32.rollbackCommit === "0d476d8f" && slice32.nonProductionSlice === false &&
    JSON.stringify(slice32.contractAssertions) === JSON.stringify(slice32Contracts) &&
    slice32.tests.length === slice32Commands.length &&
    slice32Commands.every(command => slice32.tests.filter(test => test.command === command).length === 1) &&
    slice32RequiredAllowed.every(file => slice32.allowedFiles.includes(file) && slice32.changedFiles.includes(file)),
  "current continuation Slice 32 rollback/contract/test/file inventory drift");
  assert(JSON.stringify(slice31.after) === JSON.stringify(slice32.before) &&
    slice32.after.productionGraphSha256 === "215ce9282593945dc820171348eabc2f06814ce2be4b2abe1dbd632919dd820a" &&
    slice32.after.productionFiles === 215 && slice32.after.cppSources === 103 &&
    slice32.after.targetViolationDirectionsUnderPolicyV1 === 0 &&
    slice32.after.transportCoreMediaWitnessCount === 0 &&
    slice32.after.applicationCoreMediaWitnessCount === 4 && slice32.after.largestSccOwners === 0 &&
    slice32.after.largestMixedOwnerFileLines === 10156 && slice32.after.cmakeTargets === 2 &&
    slice32.after.internalTargetSeparation === true,
  "Slice 32 WebRTC media application graph delta drift");
  assert(validateSlice32Binding(ledger, graph, policy).length === 0,
    `Slice 32 named binding mismatch: ${validateSlice32Binding(ledger, graph, policy).join(",")}`);
  assert(ledger.currentContinuation.status === "completed" &&
    ledger.currentContinuation.sliceSequenceStatus === "completed" &&
    ledger.currentContinuation.architectureStatus === "final-targets-satisfied" &&
    ledger.currentContinuation.finalEvidenceStatus === "review4-64-completed-review4-65-acceptance-pending" &&
    ledger.currentContinuation.finalCompletionClaimAllowed === true &&
    ledger.refactorComplete === true && ledger.completionClaimed === true,
  "current continuation REVIEW4-64 completion oracle mismatch");
});

check("dirty worktree paths stay inside the active slice declaration", () => {
  if (ledger.status === "completed" &&
      ledger.parkedGeneratedEvidenceArtifacts?.ownerIssue === "V390-REVIEW4-65" &&
      ledger.parkedGeneratedEvidenceArtifacts?.excludedFromReview4Completion === true) return;
  const active = ledger.orderedSlices.find(item => item.status === "in-progress") ||
    ledger.orderedSlices[Math.max(0, ledger.latestCompletedSlice - 1)];
  const continuationActive = ledger.currentContinuation?.orderedSlices?.find(item => item.status === "in-progress") ||
    ledger.currentContinuation?.orderedSlices?.at(-1);
  const allowed = new Set([
    ...active.allowedFiles,
    ...(continuationActive?.allowedFiles || []),
    ...(ledger.parkedGeneratedEvidenceArtifacts?.status === "allowed-until-final-evidence"
      ? ledger.parkedGeneratedEvidenceArtifacts.paths : []),
  ]);
  for (const declaration of continuationActive?.allowedFileSets || []) {
    for (const file of rollbackDirectReaders(declaration)) allowed.add(file);
  }
  const changed = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    cwd: rootDir,
    encoding: "utf8",
  }).trimEnd()
    .split("\n")
    .filter(Boolean)
    .map(line => line.slice(3))
    .flatMap(file => file.includes(" -> ") ? file.split(" -> ") : [file]);
  const outside = changed.filter(file => !allowed.has(file));
  assert(outside.length === 0, `active slice changed undeclared path(s): ${outside.join(",")}`);
  const committed = execFileSync("git", ["diff", "--name-status", `${active.rollbackCommit}..HEAD`], {
    cwd: rootDir,
    encoding: "utf8",
  }).trim().split("\n").filter(Boolean).flatMap(line => line.split("\t").slice(1));
  const committedHistory = execFileSync("git", [
    "log", "--format=", "--name-only", `${active.rollbackCommit}..HEAD`,
  ], { cwd: rootDir, encoding: "utf8" }).trim().split("\n").filter(Boolean);
  const observed = new Set([...changed, ...committed, ...committedHistory]);
  for (const file of active.changedFiles) assert(observed.has(file), `declared production change missing: ${file}`);
  for (const file of continuationActive?.changedFiles || []) {
    assert(observed.has(file), `declared continuation change missing: ${file}`);
  }
  if (continuationActive?.status === "completed") {
    for (const declaration of continuationActive.changedFileSets || []) {
      for (const file of rollbackDirectReaders({
        ...declaration,
        rollbackCommit: declaration.rollbackCommit || continuationActive.rollbackCommit,
        root: declaration.root || "scripts/internal",
      })) assert(observed.has(file), `declared continuation file-set change missing: ${file}`);
    }
  }
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
    ["completion gap", value => { value.orderedSlices[value.latestCompletedSlice].status = "completed"; }, "frontier"],
    ["path escape", value => { value.orderedSlices[0].allowedFiles.push("../outside"); }, "path"],
    ["behavior change", value => { value.orderedSlices[0].contractAssertions = []; }, "contract"],
    ["false complete", value => { value.review4Completion.status = "pending"; }, "completion"],
    ["debt regression", value => { value.orderedSlices[0].after.targetViolationDirections = 25; }, "debt"],
  ]) {
    const copy = structuredClone(ledger);
    mutate(copy);
    assert(validateLedger(copy).some(error => error.includes(expected)), `${label} negative was accepted`);
  }
  const historicalSliceMutation = structuredClone(ledger);
  historicalSliceMutation.latestCompletedSlice = expectedSlices.length;
  historicalSliceMutation.orderedSlices[5].status = "completed";
  historicalSliceMutation.orderedSlices[5].after = structuredClone(historicalSliceMutation.orderedSlices[5].before);
  historicalSliceMutation.orderedSlices[5].tests.forEach(test => { test.status = "pass"; });
  assert(validateLedger(historicalSliceMutation, { finalTargetsSatisfied: true })
    .includes("historical-six-slice"),
  "historical Slice 6 was rewritten as current REVIEW4-64 completion evidence");

  const nonProductionMutation = structuredClone(historicalSliceMutation);
  nonProductionMutation.orderedSlices[5].after.productionGraphSha256 = "0".repeat(64);
  assert(validateLedger(nonProductionMutation, { finalTargetsSatisfied: false })
    .some(error => error.includes("non-production-graph")),
  "non-production graph mutation was accepted");

  const continuationOverclaim = structuredClone(ledger);
  continuationOverclaim.currentContinuation.latestCompletedSlice =
    continuationOverclaim.currentContinuation.orderedSlices.length + 1;
  assert(validateContinuationFrontier(continuationOverclaim).includes("frontier"),
    "continuation latest-completed overclaim was accepted");

  for (const [label, mutate, expected] of [
    ["Slice 29 identity RED", value => { value.currentContinuation.orderedSlices[28].id = "event-rule-alias"; },
      "slice29:identity"],
    ["Slice 29 rollback RED", value => { value.currentContinuation.orderedSlices[28].rollbackCommit = "deadbeef"; },
      "slice29:rollback-before"],
    ["Slice 29 registered-test false PASS", value => {
      value.currentContinuation.orderedSlices[28].status = "completed";
      value.currentContinuation.latestCompletedSlice = 29;
      value.currentContinuation.orderedSlices[28].tests[0].status = "registered";
    }, "slice29:false-pass"],
  ]) {
    const copy = structuredClone(ledger);
    mutate(copy);
    assert(validateSlice29Binding(copy, graph).includes(expected), `${label} was accepted`);
  }
  const slice29GraphRed = structuredClone(ledger);
  slice29GraphRed.currentContinuation.orderedSlices[28].after.productionGraphSha256 = "0".repeat(64);
  assert(validateSlice29Binding(slice29GraphRed, graph).includes("slice29:graph"),
    "Slice 29 graph witness RED was accepted");

  for (const [label, mutate, expected] of [
    ["Slice 30A identity RED", value => {
      value.currentContinuation.orderedSlices[29].id = "analysis-session-read-alias";
    }, "slice30:identity"],
    ["Slice 30A rollback RED", value => {
      value.currentContinuation.orderedSlices[29].rollbackCommit = "deadbeef";
    }, "slice30:rollback-before"],
    ["Slice 30A registered-test false PASS", value => {
      value.currentContinuation.orderedSlices[29].status = "completed";
      value.currentContinuation.latestCompletedSlice = 30;
      value.currentContinuation.orderedSlices[29].tests[0].status = "registered";
    }, "slice30:false-pass"],
    ["Slice 30A graph hash RED", value => {
      value.currentContinuation.orderedSlices[29].after.productionGraphSha256 = "0".repeat(64);
    }, "slice30:graph"],
  ]) {
    const copy = structuredClone(ledger);
    mutate(copy);
    assert(validateSlice30Binding(copy, graph, policy).includes(expected), `${label} was accepted`);
  }
  const slice30PolicyRed = structuredClone(policy);
  slice30PolicyRed.allowedDependencyDirections = slice30PolicyRed.allowedDependencyDirections.filter(direction =>
    direction !== "composition-root -> application-service-interfaces");
  assert(validateSlice30Binding(ledger, graph, slice30PolicyRed).includes("slice30:policy"),
    "Slice 30A policy edge RED was accepted");
  for (const [label, mutate, expected] of [
    ["Slice 31 identity RED", value => {
      value.currentContinuation.orderedSlices[30].id = "analysis-session-lifecycle-alias";
    }, "slice31:identity"],
    ["Slice 31 rollback RED", value => {
      value.currentContinuation.orderedSlices[30].rollbackCommit = "deadbeef";
    }, "slice31:rollback-before"],
    ["Slice 31 registered-test false PASS", value => {
      value.currentContinuation.orderedSlices[30].status = "completed";
      value.currentContinuation.latestCompletedSlice = 31;
      value.currentContinuation.orderedSlices[30].tests[2].status = "registered";
    }, "slice31:false-pass"],
    ["Slice 31 graph hash RED", value => {
      value.currentContinuation.orderedSlices[30].after.productionGraphSha256 = "0".repeat(64);
    }, "slice31:graph"],
    ["Slice 31 dirty allowlist RED", value => {
      value.currentContinuation.orderedSlices[30].allowedFiles =
        value.currentContinuation.orderedSlices[30].allowedFiles.filter(file =>
          file !== "scripts/internal/verify_v390_structure_stabilization_execution.mjs");
    }, "slice31:files"],
  ]) {
    const copy = structuredClone(ledger);
    mutate(copy);
    assert(validateSlice31Binding(copy, graph, policy).includes(expected), `${label} was accepted`);
  }
  const slice31TransportAnalysisRed = structuredClone(ledger);
  slice31TransportAnalysisRed.currentContinuation.orderedSlices[30]
    .after.transportAnalysisWitnessCount = 1;
  assert(validateSlice31Binding(slice31TransportAnalysisRed, graph, policy).includes("slice31:graph"),
    "Slice 31 transport-to-analysis RED was accepted");
  const slice31OwnerRed = structuredClone(graph);
  slice31OwnerRed.moduleClassifiers.find(item =>
    item.id === "application-service-interfaces").exactFiles =
      slice31OwnerRed.moduleClassifiers.find(item =>
        item.id === "application-service-interfaces").exactFiles.filter(file =>
          file !== "include/ingress/analysis_legacy_application_types.h");
  assert(validateSlice32Binding(ledger, slice31OwnerRed, policy).includes("slice32:graph"),
    "Slice 31 lifecycle owner RED was accepted");

  for (const [label, mutate, expected] of [
    ["Slice 32 identity RED", value => {
      value.currentContinuation.orderedSlices[31].id = "webrtc-media-alias";
    }, "slice32:identity"],
    ["Slice 32 rollback RED", value => {
      value.currentContinuation.orderedSlices[31].rollbackCommit = "deadbeef";
    }, "slice32:rollback-before"],
    ["Slice 32 registered-test false PASS", value => {
      value.currentContinuation.orderedSlices[31].status = "completed";
      value.currentContinuation.latestCompletedSlice = 32;
      value.currentContinuation.orderedSlices[31].tests[0].status = "registered";
    }, "slice32:false-pass"],
    ["Slice 32 graph hash RED", value => {
      value.completionGraph.sha256 = "0".repeat(64);
    }, "slice32:graph"],
    ["Slice 32 dirty allowlist RED", value => {
      value.currentContinuation.orderedSlices[31].allowedFiles =
        value.currentContinuation.orderedSlices[31].allowedFiles.filter(file =>
          file !== "scripts/internal/verify_v390_webrtc_media_application_boundary.mjs");
    }, "slice32:files"],
  ]) {
    const copy = structuredClone(ledger);
    mutate(copy);
    assert(validateSlice32Binding(copy, graph, policy).includes(expected), `${label} was accepted`);
  }
  const slice32PolicyRed = structuredClone(policy);
  slice32PolicyRed.allowedDependencyDirections = slice32PolicyRed.allowedDependencyDirections.filter(direction =>
    direction !== "application-service-interfaces -> core-media-interfaces");
  assert(validateSlice32Binding(ledger, graph, slice32PolicyRed).includes("slice32:policy"),
    "Slice 32 application-to-core-media policy RED was accepted");
  const slice32TransportCoreRed = structuredClone(graph);
  slice32TransportCoreRed.observedModuleEdges.push({
    direction: "transport-and-auth-adapter -> core-media-interfaces", witnessCount: 1,
    witnessSha256: "0".repeat(64), allowedByTarget: false,
  });
  assert(validateSlice32Binding(ledger, slice32TransportCoreRed, policy).includes("slice32:graph"),
    "Slice 32 transport-to-core-media RED was accepted");
  const slice32OwnerRed = structuredClone(graph);
  slice32OwnerRed.moduleClassifiers.find(item => item.id === "core-media-interfaces").prefixes =
    slice32OwnerRed.moduleClassifiers.find(item => item.id === "core-media-interfaces").prefixes.filter(prefix =>
      prefix !== "include/ingress/webrtc_egress_session.h");
  assert(validateSlice32Binding(ledger, slice32OwnerRed, policy).includes("slice32:graph"),
    "Slice 32 canonical core owner RED was accepted");

  const graphCopy = structuredClone(currentGraph);
  graphCopy.mixedOwnershipDebt = [];
  const actual = collectCurrentGraph(graphCopy, policy);
  assert(validateGraphPolicy(graphCopy, policy, actual).some(error => error.includes("required-entry-missing")),
    "mixed ownership debt deletion was accepted");
  const policyCopy = structuredClone(policy);
  policyCopy.allowedDependencyDirections.push(policyCopy.temporaryDebtExceptions[0].direction);
  assert(validateGraphPolicy(currentGraph, policyCopy, collectCurrentGraph(currentGraph, policyCopy))
    .some(error => error.includes("temporary-debt-hidden")),
  "temporary debt exception was hidden in the allowlist");
  const duplicateCmake = parseCmakeBuildGraph(
    `${readText(policy.cmakePolicy.file)}\ntarget_sources(media_server PRIVATE src/main.cpp)\n`,
    collectCurrentGraph(currentGraph, policy).productionFiles,
    currentGraph.moduleClassifiers,
    policy.cmakePolicy,
  );
  assert(duplicateCmake.duplicateSources.some(item => item.startsWith("src/main.cpp:")),
    "duplicate CMake production source was accepted");
  const targetSourceMutation = structuredClone(currentGraph);
  const storedRuntimeTarget = targetSourceMutation.cmake.targets
    .find(item => item.id === "media_server_runtime");
  storedRuntimeTarget.productionSources = storedRuntimeTarget.productionSources
    .filter(file => file !== "src/ingress/webrtc_http_server_ops_workflows.cpp");
  assert(validateGraphPolicy(targetSourceMutation, policy,
    collectCurrentGraph(targetSourceMutation, policy)).some(error => error.includes("stored-target-source-drift")),
  "stored CMake target source mutation was accepted");
});

for (const item of checks) console.log(`- ${item.status}: ${item.name}`);
console.log(`- summary: pass=${checks.filter(item => item.status === "PASS").length} fail=${checks.filter(item => item.status === "FAIL").length}`);
if (checks.some(item => item.status === "FAIL")) process.exit(1);

function validateLedger(value, evaluation = { finalTargetsSatisfied: false }) {
  const errors = [];
  const slices = value.orderedSlices || [];
  if (JSON.stringify(slices.map(item => item.id)) !== JSON.stringify(expectedSlices) ||
      slices.some((item, index) => item.order !== index + 1)) errors.push("order");
  const completed = slices.filter(item => item.status === "completed");
  if (completed.length !== value.latestCompletedSlice ||
      slices.some((item, index) => item.status === "completed" !== (index < value.latestCompletedSlice))) {
    errors.push("frontier");
  }
  if (value.latestCompletedSlice !== 5 || slices[5]?.id !== "verifier-docs" ||
      slices[5]?.status !== "not-started" ||
      value.historicalSixSliceDecision?.executionOrCompletionEvidence !== false) {
    errors.push("historical-six-slice");
  }
  const inProgress = slices.filter(item => item.status === "in-progress");
  if (inProgress.length > 1 || (inProgress.length === 1 && inProgress[0].order !== value.latestCompletedSlice + 1)) {
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
    if (slice.nonProductionSlice === true) {
      for (const key of [
        "productionGraphSha256", "productionFiles", "cppSources", "moduleOwners", "cmakeTargets",
        "targetViolationDirections", "largestSccOwners", "internalTargetSeparation",
      ]) {
        if (slice.after?.[key] !== slice.before?.[key]) errors.push(`non-production-graph:${slice.id}:${key}`);
      }
    } else if (slice.after?.targetViolationDirections >= slice.before?.targetViolationDirections) {
      errors.push(`debt:${slice.id}`);
    }
  }
  const continuationSlices = value.currentContinuation?.orderedSlices || [];
  const continuationCompleted = continuationSlices.length > 0 &&
    continuationSlices.every(item => item.status === "completed");
  const review4EvidenceComplete = value.review4Completion?.status === "completed" &&
    value.review4Completion?.completionBasis === "current-continuation-slice32-targets-tests-cleanup" &&
    value.review4Completion?.review4AcceptanceRequired === false &&
    value.parkedGeneratedEvidenceArtifacts?.ownerIssue === "V390-REVIEW4-65" &&
    value.parkedGeneratedEvidenceArtifacts?.completionEvidence === false &&
    value.parkedGeneratedEvidenceArtifacts?.excludedFromReview4Completion === true;
  const finalEligible = continuationCompleted && evaluation.finalTargetsSatisfied === true &&
    review4EvidenceComplete && value.currentContinuation?.finalEvidenceStatus ===
      "review4-64-completed-review4-65-acceptance-pending";
  if (finalEligible) {
    if (value.status !== "completed" || value.refactorComplete !== true || value.completionClaimed !== true ||
        value.currentContinuation?.status !== "completed" ||
        value.currentContinuation?.sliceSequenceStatus !== "completed" ||
        value.currentContinuation?.architectureStatus !== "final-targets-satisfied" ||
        value.currentContinuation?.finalCompletionClaimAllowed !== true) errors.push("completion");
  } else {
    if (value.status !== "in-progress" || value.refactorComplete !== false || value.completionClaimed !== false ||
        value.currentContinuation?.status !== "in-progress" ||
        value.currentContinuation?.finalCompletionClaimAllowed !== false) errors.push("completion");
    const allHistoricalSlicesCompleted = completed.length === expectedSlices.length;
    const expectedSequenceStatus = allHistoricalSlicesCompleted ? "completed-continuation-required" : "partial";
    if (value.currentContinuation?.sliceSequenceStatus !== expectedSequenceStatus) errors.push("continuation");
    if (evaluation.finalTargetsSatisfied === false &&
        value.currentContinuation?.architectureStatus !== "final-targets-unmet") errors.push("continuation");
  }
  return errors;
}

function validateContinuationFrontier(value) {
  const errors = [];
  const continuation = value.currentContinuation || {};
  const slices = continuation.orderedSlices || [];
  const completed = slices.filter(item => item.status === "completed").length;
  if (!Number.isInteger(continuation.latestCompletedSlice) ||
      continuation.latestCompletedSlice < 0 || continuation.latestCompletedSlice > slices.length ||
      completed !== continuation.latestCompletedSlice ||
      slices.some((item, index) => item.status === "completed" !==
        (index < continuation.latestCompletedSlice))) errors.push("frontier");
  const inProgress = slices.filter(item => item.status === "in-progress");
  if (inProgress.length > 1 ||
      (inProgress.length === 1 && inProgress[0].order !== continuation.latestCompletedSlice + 1)) {
    errors.push("frontier");
  }
  return errors;
}

function validateSlice29Binding(value, graphValue) {
  const errors = [];
  const continuation = value.currentContinuation || {};
  const slices = continuation.orderedSlices || [];
  const slice28 = slices[27];
  const slice29 = slices[28];
  const slice30 = slices[29];
  if (slices.length < 30 || slice28?.order !== 28 || slice28?.status !== "completed" ||
      slice29?.order !== 29 || slice29?.id !== "event-rule-application-boundary") {
    errors.push("slice29:identity");
    return errors;
  }
  if (slice29.rollbackCommit !== "dcdd0ee8" || JSON.stringify(slice28.after) !== JSON.stringify(slice29.before)) {
    errors.push("slice29:rollback-before");
  }
  const selfCheck = (slice29.tests || []).find(test =>
    test.command === "./server.sh verify-v390-review4-structure-stabilization-execution");
  if (slice29.status === "in-progress") {
    if (continuation.latestCompletedSlice !== 28 || selfCheck?.status !== "self-check" ||
        slice29.tests.some(test => !["registered", "pass", "self-check"].includes(test.status))) {
      errors.push("slice29:frontier");
    }
  } else if (slice29.status === "completed") {
    if (continuation.latestCompletedSlice < 29 ||
        slice29.tests.some(test => test === selfCheck ? test.status !== "self-check" : test.status !== "pass")) {
      errors.push("slice29:false-pass");
    }
  } else {
    errors.push("slice29:status");
  }
  if (slice29.after?.productionGraphSha256 !== "1acac0820b29a0292d4ad6051c4a76201595632d7d60d5a80a794cd2602ce461" ||
      JSON.stringify(slice29.after) !== JSON.stringify(slice30?.before)) {
    errors.push("slice29:graph");
  }
  return errors;
}

function validateSlice30Binding(value, graphValue, policyValue) {
  const errors = [];
  const continuation = value.currentContinuation || {};
  const slices = continuation.orderedSlices || [];
  const slice29 = slices[28];
  const slice30 = slices[29];
  const slice31 = slices[30];
  if (slices.length < 30 || slice29?.order !== 29 || slice29?.status !== "completed" ||
      slice30?.order !== 30 || slice30?.id !== "analysis-session-read-application-boundary") {
    errors.push("slice30:identity");
    return errors;
  }
  if (slice30.rollbackCommit !== "81d3be9d" ||
      JSON.stringify(slice29.after) !== JSON.stringify(slice30.before)) {
    errors.push("slice30:rollback-before");
  }
  const selfCheck = (slice30.tests || []).find(test =>
    test.command === "./server.sh verify-v390-review4-structure-stabilization-execution");
  if (slice30.status === "completed") {
    if (continuation.latestCompletedSlice < 30 ||
        slice30.tests.some(test => test === selfCheck ? test.status !== "self-check" : test.status !== "pass")) {
      errors.push("slice30:false-pass");
    }
  } else {
    errors.push("slice30:status");
  }
  if (!policyValue.allowedDependencyDirections?.includes("composition-root -> application-service-interfaces")) {
    errors.push("slice30:policy");
  }
  if (slice30.after?.productionGraphSha256 !==
        "7b589b4df78580e71edbf7e49a5d5953e454a475c50c98a5e1a33db23ebd1f8c" ||
      slice30.after.productionFiles !== 208 || slice30.after.cppSources !== 101 ||
      slice30.after.targetViolationDirectionsUnderPolicyV1 !== 2 ||
      slice30.after.transportAnalysisWitnessCount !== 1 ||
      slice30.after.transportCoreMediaWitnessCount !== 4 || slice30.after.largestSccOwners !== 0 ||
      slice30.after.largestMixedOwnerFileLines !== 10156 || slice30.after.cmakeTargets !== 2 ||
      slice30.after.internalTargetSeparation !== true ||
      (slice31 && JSON.stringify(slice30.after) !== JSON.stringify(slice31.before))) {
    errors.push("slice30:graph");
  }
  return errors;
}

function validateSlice31Binding(value, graphValue, policyValue) {
  const errors = [];
  const continuation = value.currentContinuation || {};
  const slices = continuation.orderedSlices || [];
  const slice30 = slices[29];
  const slice31 = slices[30];
  const slice32 = slices[31];
  if (slices.length < 31 || slice30?.order !== 30 || slice30?.status !== "completed" ||
      slice31?.order !== 31 || slice31?.id !== "analysis-session-lifecycle-application-boundary") {
    errors.push("slice31:identity");
    return errors;
  }
  if (slice31.rollbackCommit !== "758b09b4" ||
      JSON.stringify(slice30.after) !== JSON.stringify(slice31.before)) {
    errors.push("slice31:rollback-before");
  }
  const requiredFiles = [
    "include/ingress/analysis_legacy_application_types.h",
    "include/ingress/analysis_session_lifecycle_application_service.h",
    "include/ingress/analysis_session_lifecycle_application_adapter.h",
    "src/ingress/analysis_session_lifecycle_application_adapter.cpp",
    "scripts/internal/verify_v390_analysis_session_lifecycle_application_boundary.mjs",
    "scripts/internal/verify_v390_structure_stabilization_execution.mjs",
    "test/fixtures/v390_structure_stabilization_current_graph.json",
    "test/fixtures/v390_structure_stabilization_execution.json",
  ];
  if (requiredFiles.some(file =>
      !slice31.allowedFiles?.includes(file) || !slice31.changedFiles?.includes(file))) {
    errors.push("slice31:files");
  }
  const selfCheck = (slice31.tests || []).find(test =>
    test.command === "./server.sh verify-v390-review4-structure-stabilization-execution");
  if (slice31.status === "in-progress") {
    if (continuation.latestCompletedSlice !== 30 || selfCheck?.status !== "self-check" ||
        slice31.tests.some(test => !["registered", "pass", "self-check"].includes(test.status))) {
      errors.push("slice31:frontier");
    }
  } else if (slice31.status === "completed") {
    if (continuation.latestCompletedSlice < 31 ||
        slice31.tests.some(test => test === selfCheck ? test.status !== "self-check" : test.status !== "pass")) {
      errors.push("slice31:false-pass");
    }
  } else {
    errors.push("slice31:status");
  }

  const applicationOwner = graphValue.moduleClassifiers?.find(item =>
    item.id === "application-service-interfaces");
  const runtimeTarget = graphValue.cmake?.targets?.find(item => item.id === "media_server_runtime");
  const edge = direction => graphValue.observedModuleEdges?.find(item => item.direction === direction);
  const applicationAnalysis = edge("application-service-interfaces -> analysis-services");
  const compositionApplication = edge("composition-root -> application-service-interfaces");
  const transportApplication = edge("transport-and-auth-adapter -> application-service-interfaces");
  const transportAnalysis = edge("transport-and-auth-adapter -> analysis-services");
  const transportCore = edge("transport-and-auth-adapter -> core-media-interfaces");
  const debtLines = new Map((graphValue.mixedOwnershipDebt || []).map(item => [item.file, item.lineCount]));
  if (!policyValue.allowedDependencyDirections?.includes("composition-root -> application-service-interfaces")) {
    errors.push("slice31:policy");
  }
  if (slice32) {
    if (JSON.stringify(slice31.after) !== JSON.stringify(slice32.before)) {
      errors.push("slice31:graph");
    }
    return errors;
  }
  if (value.currentGraph?.sha256 !==
        "dc68a9bacd49888a89f5689eff85fff8a48a3244596a2aafbd765a3e812017e9" ||
      slice31.after?.productionGraphSha256 !== value.currentGraph.sha256 ||
      graphValue.expectedProductionFiles !== 212 || graphValue.expectedCppFiles !== 102 ||
      graphValue.expectedFileOwnershipSha256 !==
        "1cd142a923ec121e289d997b3c57d9743a43c0f7f147c3047865fe8e152d0010" ||
      applicationOwner?.expectedFileCount !== 45 || applicationOwner.expectedCppCount !== 18 ||
      !requiredFiles.slice(0, 4).every(file => applicationOwner.exactFiles?.includes(file)) ||
      runtimeTarget?.productionSourceSha256 !==
        "e91a80360065cfc0cae57c5094818e730d252b37bfe53522e1bcd1ef2458237a" ||
      runtimeTarget.declaredSourceCount !== 100 || runtimeTarget.defaultActiveSourceCount !== 99 ||
      graphValue.observedModuleEdges?.length !== 16 ||
      applicationAnalysis?.witnessCount !== 23 ||
      applicationAnalysis.witnessSha256 !==
        "4b3cbd1800bf8771eef67752edae8b604e8aefc1574e44d7890847c76d681cee" ||
      compositionApplication?.witnessCount !== 2 ||
      compositionApplication.witnessSha256 !==
        "fc7b3895f0b81d59e40e4e8767f34518412a866cedd7c088b3dc9d58a7c90b48" ||
      transportApplication?.witnessCount !== 23 ||
      transportApplication.witnessSha256 !==
        "8cd647e97e04ebdc976ba2e64448fcc582a66ed114b75f91b7fb683fa5fba38d" ||
      transportAnalysis !== undefined || transportCore?.witnessCount !== 4 ||
      transportCore.witnessSha256 !==
        "adf4172d0e83de59df510ceeb38c88cd36aaf78b157e7022b6480d8e0793cab3" ||
      graphValue.observedModuleEdges.filter(item => !item.allowedByTarget).length !== 1 ||
      graphValue.stronglyConnectedComponents?.length !== 0 ||
      debtLines.get("src/ingress/webrtc_http_server.cpp") !== 7767 ||
      debtLines.get("src/ingress/webrtc_http_server_ops_foundation.cpp") !== 7845 ||
      debtLines.get("src/ingress/webrtc_http_server_ops_workflows.cpp") !== 10150 ||
      debtLines.get("src/ingress/webrtc_http_server_ops_incidents.cpp") !== 7889 ||
      debtLines.get("src/ingress/webrtc_http_server_runtime.cpp") !== 5202 ||
      debtLines.get("src/ingress/webrtc_http_server_detail.h") !== 7992 ||
      debtLines.get("src/ingress/product_ui_page_scripts.cpp") !== 10156 ||
      !graphValue.boundary?.includes("Analysis Session lifecycle application boundary")) {
    errors.push("slice31:graph");
  }
  return errors;
}

function validateSlice32Binding(value, graphValue, policyValue) {
  const errors = [];
  const continuation = value.currentContinuation || {};
  const slices = continuation.orderedSlices || [];
  const slice31 = slices[30];
  const slice32 = slices[31];
  if (slices.length < 32 || slice31?.order !== 31 || slice31?.status !== "completed" ||
      slice32?.order !== 32 || slice32?.id !== "webrtc-media-application-boundary") {
    errors.push("slice32:identity");
    return errors;
  }
  if (slice32.rollbackCommit !== "0d476d8f" ||
      JSON.stringify(slice31.after) !== JSON.stringify(slice32.before)) {
    errors.push("slice32:rollback-before");
  }
  const requiredFiles = [
    "include/ingress/webrtc_media_application_service.h",
    "include/ingress/webrtc_media_application_adapter.h",
    "src/ingress/webrtc_media_application_adapter.cpp",
    "scripts/internal/verify_v390_webrtc_media_application_boundary.mjs",
    "scripts/internal/verify_codec_matrix.sh",
    "scripts/internal/verify_v390_structure_stabilization_execution.mjs",
    "test/fixtures/v390_structure_stabilization_current_architecture_policy.json",
    "test/fixtures/v390_structure_stabilization_current_graph.json",
    "test/fixtures/v390_structure_stabilization_execution.json",
  ];
  if (requiredFiles.some(file =>
      !slice32.allowedFiles?.includes(file) || !slice32.changedFiles?.includes(file))) {
    errors.push("slice32:files");
  }
  const selfCheck = (slice32.tests || []).find(test =>
    test.command === "./server.sh verify-v390-review4-structure-stabilization-execution");
  if (slice32.status === "in-progress") {
    if (continuation.latestCompletedSlice !== 31 || selfCheck?.status !== "self-check" ||
        slice32.tests.some(test => !["registered", "pass", "self-check"].includes(test.status))) {
      errors.push("slice32:frontier");
    }
  } else if (slice32.status === "completed") {
    if (continuation.latestCompletedSlice < 32 ||
        slice32.tests.some(test => test === selfCheck ? test.status !== "self-check" : test.status !== "pass")) {
      errors.push("slice32:false-pass");
    }
  } else {
    errors.push("slice32:status");
  }

  const applicationOwner = graphValue.moduleClassifiers?.find(item =>
    item.id === "application-service-interfaces");
  const coreOwner = graphValue.moduleClassifiers?.find(item => item.id === "core-media-interfaces");
  const runtimeTarget = graphValue.cmake?.targets?.find(item => item.id === "media_server_runtime");
  const edge = direction => graphValue.observedModuleEdges?.find(item => item.direction === direction);
  const applicationCore = edge("application-service-interfaces -> core-media-interfaces");
  const compositionApplication = edge("composition-root -> application-service-interfaces");
  const transportApplication = edge("transport-and-auth-adapter -> application-service-interfaces");
  const transportCore = edge("transport-and-auth-adapter -> core-media-interfaces");
  const transportUtilities = edge("transport-and-auth-adapter -> core-utilities");
  const debtLines = new Map((graphValue.mixedOwnershipDebt || []).map(item => [item.file, item.lineCount]));
  const owns = (owner, file) => owner?.exactFiles?.includes(file) ||
    owner?.prefixes?.some(prefix => file.startsWith(prefix));
  if (value.currentArchitecturePolicy?.sha256 !==
        "f65d07504ad94d17c8026f151b7d3de4576f8b8757639c53835f8424e57c5970" ||
      !policyValue.allowedDependencyDirections?.includes("application-service-interfaces -> core-media-interfaces") ||
      !policyValue.allowedDependencyDirections?.includes("composition-root -> application-service-interfaces")) {
    errors.push("slice32:policy");
  }
  const applicationFiles = [
    "include/ingress/analysis_legacy_application_types.h",
    "include/ingress/analysis_session_lifecycle_application_service.h",
    "include/ingress/analysis_session_lifecycle_application_adapter.h",
    "src/ingress/analysis_session_lifecycle_application_adapter.cpp",
    "include/ingress/webrtc_media_application_service.h",
    "include/ingress/webrtc_media_application_adapter.h",
    "src/ingress/webrtc_media_application_adapter.cpp",
  ];
  const canonicalCoreFiles = [
    "include/core/session_manager.h",
    "include/ingress/webrtc_egress_session.h",
    "include/core/webrtc_source_registry.h",
    "include/ingress/webrtc_source_session.h",
  ];
  if (value.completionGraph?.sha256 !==
        "215ce9282593945dc820171348eabc2f06814ce2be4b2abe1dbd632919dd820a" ||
      slice32.after?.productionGraphSha256 !== value.completionGraph.sha256 ||
      graphValue.expectedProductionFiles !== 215 || graphValue.expectedCppFiles !== 103 ||
      graphValue.expectedFileOwnershipSha256 !==
        "f9f4725ef087a680719f56d2b8f42ae73e6d00bfae45d86ca0aae6f3bedf896e" ||
      applicationOwner?.expectedFileCount !== 48 || applicationOwner.expectedCppCount !== 19 ||
      !applicationFiles.every(file => applicationOwner.exactFiles?.includes(file)) ||
      !canonicalCoreFiles.every(file => owns(coreOwner, file)) ||
      runtimeTarget?.productionSourceSha256 !==
        "f80b850eb3258964222d860fc2111c6e3fb014a19f76450c59f89f05fdaf8e85" ||
      runtimeTarget.declaredSourceCount !== 101 || runtimeTarget.defaultActiveSourceCount !== 100 ||
      graphValue.observedModuleEdges?.length !== 16 ||
      applicationCore?.witnessCount !== 4 ||
      applicationCore.witnessSha256 !==
        "9b012c5785ae13606c5cf056c7835123a767e53df641dbcd556b04a38258ae93" ||
      compositionApplication?.witnessCount !== 3 ||
      compositionApplication.witnessSha256 !==
        "a8e2b7fe386fb488bf5cd84f2218ce8bb3f299fb1ddcab9075e3c491c8a68c2f" ||
      transportApplication?.witnessCount !== 25 ||
      transportApplication.witnessSha256 !==
        "89cde5c1a3dd580514f150040686b1feb22470b684fc4ace242f75a6aff8b9c7" ||
      transportCore !== undefined || transportUtilities !== undefined ||
      graphValue.observedModuleEdges.filter(item => !item.allowedByTarget).length !== 0 ||
      graphValue.stronglyConnectedComponents?.length !== 0 ||
      debtLines.get("src/ingress/webrtc_http_server.cpp") !== 7777 ||
      debtLines.get("src/ingress/webrtc_http_server_ops_foundation.cpp") !== 7849 ||
      debtLines.get("src/ingress/webrtc_http_server_ops_workflows.cpp") !== 10150 ||
      debtLines.get("src/ingress/webrtc_http_server_ops_incidents.cpp") !== 7888 ||
      debtLines.get("src/ingress/webrtc_http_server_runtime.cpp") !== 5193 ||
      debtLines.get("src/ingress/webrtc_http_server_detail.h") !== 7996 ||
      debtLines.get("src/ingress/product_ui_page_scripts.cpp") !== 10156 ||
      !graphValue.boundary?.includes("WebRTC media application boundary")) {
    errors.push("slice32:graph");
  }
  return errors;
}

function collectCurrentGraph(value, architecturePolicy) {
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
  const allowedDirections = new Set(architecturePolicy.allowedDependencyDirections);
  const observedModuleEdges = [...grouped.entries()].sort(([lhs], [rhs]) => lhs.localeCompare(rhs))
    .map(([direction, witnesses]) => {
      const sorted = [...witnesses].sort();
      return {
        direction,
        witnessCount: sorted.length,
        witnessSha256: sha256Text(sorted.join("\n")),
        allowedByTarget: allowedDirections.has(direction),
      };
    });
  const moduleEdges = observedModuleEdges.map(item => {
    const [from, to] = item.direction.split(" -> ");
    return { from, to };
  });
  const cmake = parseCmakeBuildGraph(
    readText(value.cmake.file), productionFiles, value.moduleClassifiers, architecturePolicy.cmakePolicy,
  );
  return {
    productionFiles,
    ownership,
    cppFiles: productionFiles.filter(file => file.endsWith(".cpp")),
    ownershipSha256: sha256Text(ownership.map(item => `${item.file}\t${item.owner}`).join("\n")),
    observedModuleEdges,
    stronglyConnectedComponents: findCycleComponents(value.moduleClassifiers.map(item => item.id), moduleEdges),
    cmake,
  };
}

function parseCmakeBuildGraph(textValue, productionFiles, classifiers, cmakePolicy) {
  const productionCpp = new Set(productionFiles.filter(file => file.endsWith(".cpp")));
  const definitions = new Map();
  const occurrences = new Map([...productionCpp].map(source => [source, []]));
  const unknownSources = [];
  for (const call of cmakeCalls(textValue, ["add_executable", "add_library", "target_sources"])) {
    const tokens = call.body.match(/"[^"]*"|[^\s]+/g)?.map(token => token.replace(/^"|"$/g, "")) || [];
    if (tokens.length === 0) continue;
    const targetId = tokens[0];
    if (call.name !== "target_sources" && !definitions.has(targetId)) {
      definitions.set(targetId, {
        id: targetId,
        type: call.name === "add_executable" ? "executable" : "library",
        productionSources: [],
      });
    }
    const target = definitions.get(targetId);
    if (!target) continue;
    for (const token of tokens.slice(1)) {
      if (!/^src\/[A-Za-z0-9_./-]+\.cpp$/.test(token)) continue;
      if (!productionCpp.has(token)) {
        unknownSources.push(`${targetId}:${token}`);
        continue;
      }
      target.productionSources.push(token);
      occurrences.get(token).push(targetId);
    }
  }
  const targets = [...definitions.values()].filter(target => target.productionSources.length > 0)
    .map(target => ({
      ...target,
      moduleOwners: [...new Set(target.productionSources.map(source => classifyModule(source, classifiers)))],
    }));
  const productionSources = targets.flatMap(target => target.productionSources);
  const duplicateSources = [...occurrences.entries()]
    .filter(([, targetIds]) => targetIds.length > 1)
    .map(([source, targetIds]) => `${source}:${targetIds.join(",")}`);
  const missingSources = [...occurrences.entries()]
    .filter(([, targetIds]) => targetIds.length === 0)
    .map(([source]) => source);
  const internalLibraryTargets = targets.filter(target => target.type === "library");
  return {
    targetIds: targets.map(target => target.id),
    targets,
    productionSources,
    duplicateSources,
    missingSources,
    unknownSources,
    internalLibraryTargetIds: internalLibraryTargets.map(target => target.id),
    internalTargetSeparation:
      targets.length >= cmakePolicy.finalSeparation.minimumProductionTargets &&
      internalLibraryTargets.length >= cmakePolicy.finalSeparation.minimumInternalLibraryTargets &&
      duplicateSources.length === 0 && missingSources.length === 0 && unknownSources.length === 0,
  };
}

function cmakeCalls(textValue, names) {
  const calls = [];
  const pattern = new RegExp(`\\b(${names.join("|")})\\s*\\(`, "g");
  for (const match of textValue.matchAll(pattern)) {
    let depth = 1;
    let cursor = match.index + match[0].length;
    let quote = false;
    for (; cursor < textValue.length && depth > 0; cursor += 1) {
      const character = textValue[cursor];
      if (character === '"' && textValue[cursor - 1] !== "\\") quote = !quote;
      if (quote) continue;
      if (character === "(") depth += 1;
      if (character === ")") depth -= 1;
    }
    if (depth !== 0) throw new Error(`unterminated CMake command: ${match[1]}`);
    calls.push({
      name: match[1],
      body: textValue.slice(match.index + match[0].length, cursor - 1).replace(/#[^\n]*/g, " "),
    });
  }
  return calls;
}

function validateCurrentGraphBinding(ledgerValue, graphValue, policyValue) {
  const errors = [];
  const actual = collectCurrentGraph(graphValue, policyValue);
  const serializedSha256 = sha256Text(`${JSON.stringify(graphValue, null, 2)}\n`);
  if (ledgerValue.currentGraph?.sha256 !== serializedSha256) errors.push("current:hash");
  if (actual.productionFiles.length !== graphValue.expectedProductionFiles ||
      actual.cppFiles.length !== graphValue.expectedCppFiles ||
      actual.ownershipSha256 !== graphValue.expectedFileOwnershipSha256) errors.push("current:owner-inventory");
  for (const classifier of graphValue.moduleClassifiers || []) {
    const owned = actual.ownership.filter(item => item.owner === classifier.id);
    if (classifier.expectedFileCount !== owned.length ||
        classifier.expectedCppCount !== owned.filter(item => item.file.endsWith(".cpp")).length) {
      errors.push(`current:owner:${classifier.id}`);
    }
  }
  if (JSON.stringify(stripAllowedFlags(actual.observedModuleEdges)) !==
      JSON.stringify(stripAllowedFlags(graphValue.observedModuleEdges || []))) errors.push("current:include-edge");
  if (JSON.stringify(actual.stronglyConnectedComponents) !==
      JSON.stringify(graphValue.stronglyConnectedComponents || [])) errors.push("current:SCC");
  if (JSON.stringify(actual.cmake.targetIds) !==
      JSON.stringify((graphValue.cmake?.targets || []).map(item => item.id))) errors.push("current:target-set");
  for (const target of graphValue.cmake?.targets || []) {
    const actualTarget = actual.cmake.targets.find(item => item.id === target.id);
    if (!actualTarget || target.declaredSourceCount !== target.productionSources.length ||
        JSON.stringify(target.productionSources) !== JSON.stringify(actualTarget.productionSources) ||
        target.productionSourceSha256 !== sha256Text(target.productionSources.join("\n"))) {
      errors.push(`current:target:${target.id}`);
    }
  }
  errors.push(...validateGraphPolicy(graphValue, policyValue, actual));
  if (JSON.stringify(graphMetrics(graphValue, actual)) !== JSON.stringify(ledgerValue.currentGraph?.metrics)) {
    errors.push("current:metrics");
  }
  return [...new Set(errors)];
}

function validateCompletionGraphBinding(ledgerValue, graphValue) {
  const errors = [];
  const expectedSha256 = "215ce9282593945dc820171348eabc2f06814ce2be4b2abe1dbd632919dd820a";
  const serializedSha256 = sha256Text(`${JSON.stringify(graphValue, null, 2)}\n`);
  const slice32 = ledgerValue.currentContinuation?.orderedSlices?.[31];
  const debt = new Map((graphValue.mixedOwnershipDebt || []).map(item => [item.file, item.lineCount]));
  const resolved = (graphValue.resolvedDebt || []).find(item =>
    item.file === "src/ingress/product_ui_page_scripts.cpp" &&
    item.resolvedResponsibility === "action-execution-deferral-renderer-and-refresh");
  if (serializedSha256 !== expectedSha256 || ledgerValue.completionGraph?.sha256 !== expectedSha256) {
    errors.push("completion:hash");
  }
  if (ledgerValue.completionGraph?.path !==
      "test/fixtures/v390_structure_stabilization_slice32_completion_graph.json") {
    errors.push("completion:path");
  }
  if (slice32?.after?.productionGraphSha256 !== expectedSha256 ||
      slice32?.after?.largestMixedOwnerFileLines !== 10156 ||
      debt.get("src/ingress/product_ui_page_scripts.cpp") !== 10156 ||
      resolved?.beforeLineCount !== 10217 || resolved?.afterLineCount !== 10156) {
    errors.push("completion:historical-slice32");
  }
  if (ledgerValue.review4Completion?.completionGraphPath !== ledgerValue.completionGraph?.path ||
      ledgerValue.review4Completion?.completionGraphSha256 !== expectedSha256) {
    errors.push("completion:review4-binding");
  }
  return errors;
}

function validateGraphPolicy(graphValue, policyValue, actual) {
  const errors = [];
  for (const binding of policyValue.immutableHistoricalBindings || []) {
    if (sha256File(binding.path) !== binding.sha256) errors.push(`policy:historical-binding-drift:${binding.path}`);
  }
  const ownerIds = new Set(policyValue.ownerIds || []);
  const directions = policyValue.allowedDependencyDirections || [];
  if (new Set(directions).size !== directions.length) errors.push("policy:duplicate-allowed-direction");
  for (const direction of directions) {
    const [from, to, ...rest] = direction.split(" -> ");
    if (rest.length > 0 || !ownerIds.has(from) || !ownerIds.has(to) || from === to) {
      errors.push(`policy:invalid-allowed-direction:${direction}`);
    }
  }
  const expectedAllowed = new Set(directions);
  for (const exception of policyValue.temporaryDebtExceptions || []) {
    if (expectedAllowed.has(exception.direction) || exception.countsAsTargetViolation !== true) {
      errors.push(`policy:temporary-debt-hidden:${exception.direction}`);
    }
  }
  for (const edge of graphValue.observedModuleEdges || []) {
    if (edge.allowedByTarget !== expectedAllowed.has(edge.direction)) {
      errors.push(`policy:stored-allowed-direction-drift:${edge.direction}`);
    }
  }
  const debtByFile = new Map((graphValue.mixedOwnershipDebt || []).map(item => [item.file, item]));
  if (debtByFile.size !== (graphValue.mixedOwnershipDebt || []).length) errors.push("debt:duplicate-entry");
  for (const required of policyValue.mixedOwnershipTracking?.requiredEntries || []) {
    const debt = debtByFile.get(required.file);
    if (!debt) {
      errors.push(`debt:required-entry-missing:${required.file}`);
      continue;
    }
    if (debt.primaryOwner !== required.primaryOwner ||
        JSON.stringify(debt.embeddedResponsibilities) !== JSON.stringify(required.requiredEmbeddedResponsibilities)) {
      errors.push(`debt:required-entry-boundary-drift:${required.file}`);
    }
  }
  for (const debt of graphValue.mixedOwnershipDebt || []) {
    if (!fs.existsSync(path.join(rootDir, debt.file))) errors.push(`debt:tracked-file-missing:${debt.file}`);
    else if (lineCount(debt.file) !== debt.lineCount) errors.push(`debt:line-count-drift:${debt.file}`);
  }
  if (actual.cmake.duplicateSources.length > 0) {
    errors.push(`cmake:duplicate-production-source:${actual.cmake.duplicateSources.join(",")}`);
  }
  if (actual.cmake.missingSources.length > 0) {
    errors.push(`cmake:missing-production-source:${actual.cmake.missingSources.join(",")}`);
  }
  if (actual.cmake.unknownSources.length > 0) {
    errors.push(`cmake:unknown-production-source:${actual.cmake.unknownSources.join(",")}`);
  }
  for (const target of actual.cmake.targets) {
    const stored = graphValue.cmake.targets.find(item => item.id === target.id);
    if (!stored || JSON.stringify(stored.productionSources) !== JSON.stringify(target.productionSources) ||
        stored.productionSourceSha256 !== sha256Text(target.productionSources.join("\n"))) {
      errors.push(`cmake:stored-target-source-drift:${target.id}`);
    }
  }
  if (graphValue.cmake.internalTargetSeparation !== actual.cmake.internalTargetSeparation) {
    errors.push("cmake:stored-target-separation-drift");
  }
  return errors;
}

function stripAllowedFlags(edges) {
  return edges.map(({ allowedByTarget: _allowedByTarget, ...edge }) => edge);
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

function graphMetrics(value, actual) {
  const violations = actual.observedModuleEdges.filter(item => item.allowedByTarget === false).length;
  const largestScc = Math.max(0, ...actual.stronglyConnectedComponents.map(item => item.length));
  const largestMixed = Math.max(0, ...value.mixedOwnershipDebt.map(item => item.lineCount));
  return {
    productionFiles: value.expectedProductionFiles,
    cppSources: value.expectedCppFiles,
    moduleOwners: value.moduleClassifiers.length,
    cmakeTargets: actual.cmake.targets.length,
    targetViolationDirections: violations,
    largestSccOwners: largestScc,
    largestMixedOwnerFileLines: largestMixed,
    internalTargetSeparation: actual.cmake.internalTargetSeparation,
  };
}

function finalTargetsSatisfied(targets, metrics) {
  return metrics.targetViolationDirections <= targets.maxTargetViolationDirections &&
    metrics.largestSccOwners <= targets.maxSccOwners &&
    metrics.largestMixedOwnerFileLines <= targets.maxMixedOwnerFileLines &&
    (!targets.requireSeparatedInternalTargets || metrics.internalTargetSeparation === true);
}

function completedContinuationFrontierAtLeast(value, minimumSlice) {
  const continuation = value.currentContinuation || {};
  const stateMatches = continuation.status === "completed"
    ? continuation.sliceSequenceStatus === "completed"
    : continuation.status === "in-progress" && continuation.sliceSequenceStatus === "partial";
  return stateMatches && continuation.latestCompletedSlice >= minimumSlice;
}

function sliceTest(slice, command) {
  const matches = slice.tests.filter(test => test.command === command);
  assert(matches.length === 1, `Slice test must occur exactly once: ${command}`);
  return matches[0];
}

function check(name, fn) {
  if (graphOnly && ![
    "versioned current architecture policy and continuation are explicit",
    "current graph hash and metrics are exact",
    "current graph negative mutations reject forbidden edge and cycle",
    "Slice 32 completion and current graph separation is fail-closed",
  ].includes(name)) return;
  try { fn(); checks.push({ name, status: "PASS" }); }
  catch (error) { checks.push({ name, status: "FAIL" }); console.error(`[FAIL] ${name}: ${error.message}`); }
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function readText(file) { return fs.readFileSync(path.join(rootDir, file), "utf8"); }
function readJson(file) { return JSON.parse(readText(file)); }
function rawLiteralPayload(textValue, startMarker, endMarker) {
  const start = textValue.indexOf(startMarker);
  assert(start >= 0, `missing raw literal start: ${startMarker}`);
  const payloadStart = start + startMarker.length;
  const end = textValue.indexOf(endMarker, payloadStart);
  assert(end >= 0, `missing raw literal end: ${endMarker}`);
  return textValue.slice(payloadStart, end);
}
function sha256File(file) { return crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, file))).digest("hex"); }
function sha256Text(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function lineCount(file) { return readText(file).split(/\r?\n/).length - 1; }

function rollbackDirectReaders(declaration) {
  assert(declaration?.kind === "rollback-direct-webrtc-http-server-readers",
    `unsupported declared file set: ${declaration?.kind || "missing"}`);
  const root = declaration.root || "scripts/internal";
  const files = execFileSync("git", ["ls-tree", "-r", "--name-only", declaration.rollbackCommit, root], {
    cwd: rootDir,
    encoding: "utf8",
  }).trim().split("\n").filter(file => file.endsWith(".mjs")).sort();
  const patterns = [
    /\breadText\(\s*["']src\/ingress\/webrtc_http_server\.cpp["']\s*\)/g,
    /\bread\(\s*["']src\/ingress\/webrtc_http_server\.cpp["']\s*\)/g,
    /\b(?:fs\.)?readFileSync\(\s*["']src\/ingress\/webrtc_http_server\.cpp["']\s*,\s*["']utf8["']\s*\)/g,
  ];
  const readers = files.map(file => {
    const text = execFileSync("git", ["show", `${declaration.rollbackCommit}:${file}`], {
      cwd: rootDir,
      encoding: "utf8",
    });
    return {
      file,
      expressions: patterns.reduce((total, pattern) => total + [...text.matchAll(pattern)].length, 0),
    };
  }).filter(item => item.expressions > 0);
  assert(readers.length === declaration.expectedFileCount &&
    readers.reduce((sum, item) => sum + item.expressions, 0) === declaration.expectedExpressionCount &&
    sha256Text(readers.map(item => item.file).join("\n")) === declaration.sortedPathSha256,
  "rollback direct-reader declared file set drift");
  return readers.map(item => item.file);
}

function exec(command, args, statusOnly = false) {
  if (statusOnly) return spawnSync(command, args, { cwd: rootDir, encoding: "utf8" });
  return execFileSync(command, args, { cwd: rootDir, encoding: "utf8" }).trim();
}
