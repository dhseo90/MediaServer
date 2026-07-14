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
assertKnownOptions(rawArgs, ["h", "help", "write-current-graph"]);

const ledgerPath = "test/fixtures/v390_structure_stabilization_execution.json";
const ledger = readJson(ledgerPath);
const decision = readJson(ledger.approvalDecision.path);
const graph = readJson(ledger.currentGraph.path);
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
  }
});

if (rawArgs.includes("--write-current-graph")) {
  const current = collectCurrentGraph(graph, policy);
  graph.expectedProductionFiles = current.productionFiles.length;
  graph.expectedCppFiles = current.cppFiles.length;
  graph.expectedFileOwnershipSha256 = current.ownershipSha256;
  for (const classifier of graph.moduleClassifiers) {
    const owned = current.ownership.filter(item => item.owner === classifier.id);
    classifier.expectedFileCount = owned.length;
    classifier.expectedCppCount = owned.filter(item => item.file.endsWith(".cpp")).length;
  }
  const conditionalByPath = new Map(graph.cmake.targets
    .flatMap(target => target.conditionalSources || [])
    .map(conditional => [conditional.path, conditional]));
  graph.cmake.targets = current.cmake.targets.map(target => {
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
  graph.cmake.internalTargetSeparation = current.cmake.internalTargetSeparation;
  graph.observedModuleEdges = current.observedModuleEdges;
  graph.stronglyConnectedComponents = current.stronglyConnectedComponents;
  for (const debt of graph.mixedOwnershipDebt) debt.lineCount = lineCount(debt.file);
  fs.writeFileSync(path.join(rootDir, ledger.currentGraph.path), `${JSON.stringify(graph, null, 2)}\n`);
  console.log(`wrote ${ledger.currentGraph.path}: files=${current.productionFiles.length} cpp=${current.cppFiles.length} edges=${current.observedModuleEdges.length}`);
  process.exit(0);
}

check("historical approval is separate from actual execution", () => {
  assert(ledger.schema === "media-server.v390-structure-stabilization-execution.v3", "execution schema mismatch");
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
  const current = collectCurrentGraph(graph, policy);
  const errors = validateLedger(ledger, {
    finalTargetsSatisfied: finalTargetsSatisfied(ledger.finalTargets, graphMetrics(graph, current)),
  });
  assert(errors.length === 0, errors.join("; "));
  assert(JSON.stringify(ledger.orderedSlices.map(item => item.id)) === JSON.stringify(expectedSlices),
    "slice order mismatch");
  assert(JSON.stringify(ledger.preservedContracts) === JSON.stringify(expectedContracts),
    "preserved contract set/order mismatch");
});

check("current graph hash and metrics are exact", () => {
  assert(ledger.currentGraph.schema === graph.schema, "current graph schema mismatch");
  assert(ledger.currentGraph.sha256 === sha256File(ledger.currentGraph.path), "current graph hash drift");
  assert(JSON.stringify(policy.ownerIds) === JSON.stringify(graph.moduleClassifiers.map(item => item.id)),
    "versioned policy owner order does not match current graph classifiers");
  const actual = collectCurrentGraph(graph, policy);
  assert(actual.productionFiles.length === graph.expectedProductionFiles, "current production file count drift");
  assert(actual.cppFiles.length === graph.expectedCppFiles, "current cpp count drift");
  assert(actual.ownershipSha256 === graph.expectedFileOwnershipSha256, "current ownership digest drift");
  assert(JSON.stringify(stripAllowedFlags(actual.observedModuleEdges)) ===
    JSON.stringify(stripAllowedFlags(graph.observedModuleEdges)),
    "current include edge/witness graph drift");
  assert(JSON.stringify(actual.stronglyConnectedComponents) === JSON.stringify(graph.stronglyConnectedComponents),
    "current SCC graph drift");
  assert(JSON.stringify(actual.cmake.targetIds) === JSON.stringify(graph.cmake.targets.map(item => item.id)),
    "current CMake target drift");
  for (const target of actual.cmake.targets) {
    const stored = graph.cmake.targets.find(item => item.id === target.id);
    assert(stored && JSON.stringify(stored.productionSources) === JSON.stringify(target.productionSources) &&
      stored.productionSourceSha256 === sha256Text(target.productionSources.join("\n")),
    `current CMake target source digest drift: ${target.id}`);
  }
  const declaredSourceCount = graph.cmake.targets
    .reduce((sum, target) => sum + target.declaredSourceCount, 0);
  const defaultActiveSourceCount = graph.cmake.targets
    .reduce((sum, target) => sum + target.defaultActiveSourceCount, 0);
  const conditionalSourceCount = graph.cmake.targets
    .reduce((sum, target) => sum + target.conditionalSources.length, 0);
  assert(actual.cmake.productionSources.length === declaredSourceCount &&
    actual.cmake.productionSources.length - conditionalSourceCount === defaultActiveSourceCount,
  "current CMake source count drift");
  const graphPolicyErrors = validateGraphPolicy(graph, policy, actual);
  assert(graphPolicyErrors.length === 0, graphPolicyErrors.join("; "));
  const metrics = graphMetrics(graph, actual);
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
    "session_manager.SetAuxiliaryStreamRuntimeProvider(",
    "ingress::GStreamerRtspServer gst_rtsp_server(session_manager, analysis_sessions);",
    "const auto webrtc_http_runtime_config = BuildWebRtcHttpRuntimeConfig(config);",
    "session_manager, analysis_sessions, webrtc_http_runtime_config);",
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

check("non-production Slice preserves production graph and parked evidence stays non-final", () => {
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
    assert(parked.completionEvidence === false && ledger.completionClaimed === false,
      "parked generated artifacts were used as completion evidence");
  }
});

check("current continuation binds the exact Slice 1-16 frontier without a final claim", () => {
  const slices = ledger.currentContinuation?.orderedSlices || [];
  assert(validateContinuationFrontier(ledger).length === 0,
    `current continuation frontier invalid: ${validateContinuationFrontier(ledger).join(",")}`);
  assert(slices.length === 16 && slices[0].order === 1 && slices[1].order === 2 && slices[2].order === 3 &&
    slices[3].order === 4 && slices[4].order === 5 && slices[5].order === 6 && slices[6].order === 7 &&
    slices[7].order === 8 && slices[8].order === 9 && slices[9].order === 10 && slices[10].order === 11 &&
    slices[11].order === 12 && slices[12].order === 13 && slices[13].order === 14 && slices[14].order === 15 &&
    slices[15].order === 16 &&
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
    slices[15].id === "source-view-application-boundary" &&
    ["in-progress", "completed"].includes(slices[15].status),
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
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice >= 4 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial" && slice4.after !== null &&
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
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice >= 5 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial" && slice5.after !== null &&
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
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice >= 6 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial" && slice6.after !== null &&
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
    assert(ledger.currentContinuation.status === "in-progress" &&
      ledger.currentContinuation.latestCompletedSlice >= 7 &&
      ledger.currentContinuation.sliceSequenceStatus === "partial" && slice7.after !== null &&
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
    slice14.after.cmakeTargets === 2 && slice14.after.internalTargetSeparation === true &&
    graph.observedModuleEdges.length === 17 &&
    !graph.observedModuleEdges.some(item => item.direction === "transport-and-auth-adapter -> core-utilities") &&
    !graph.observedModuleEdges.some(item => item.direction === "analysis-services -> core-utilities"),
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
    assert(slice16.after?.productionGraphSha256 === ledger.currentGraph.sha256 &&
      slice16.after.productionFiles === 178 && slice16.after.cppSources === 87 &&
      slice16.after.targetViolationDirectionsUnderPolicyV1 === 3 &&
      slice16.after.transportDomainWitnessCount === 1 &&
      slice16.after.largestSccOwners === 0 &&
      slice16.after.largestMixedOwnerFileLines === 10160 &&
      slice16.after.cmakeTargets === 2 && slice16.after.internalTargetSeparation === true &&
      graph.observedModuleEdges.length === 17 &&
      graph.observedModuleEdges.some(item =>
        item.direction === "transport-and-auth-adapter -> domain-and-registry-owners" &&
        item.witnessCount === 1),
    "Slice 16 source/view application boundary graph delta drift");
    const selfCheck = sliceTest(slice16,
      "./server.sh verify-v390-review4-structure-stabilization-execution");
    const testsFinal = slice16.tests.every(test => test.status === "pass") ||
      selfCheck.status === "self-check" && slice16.tests.every(test =>
        test === selfCheck || test.status === "pass");
    assert(ledger.currentContinuation.latestCompletedSlice >= 16 && testsFinal,
    "completed Slice 16 frontier/test state mismatch");
  }
  assert(ledger.currentContinuation.finalCompletionClaimAllowed === false &&
    ledger.refactorComplete === false && ledger.completionClaimed === false,
  "current continuation overclaims final completion");
});

check("dirty worktree paths stay inside the active slice declaration", () => {
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
    ["false complete", value => { value.status = "completed"; }, "completion"],
    ["debt regression", value => { value.orderedSlices[0].after.targetViolationDirections = 25; }, "debt"],
  ]) {
    const copy = structuredClone(ledger);
    mutate(copy);
    assert(validateLedger(copy).some(error => error.includes(expected)), `${label} negative was accepted`);
  }
  const completedSixSlice = structuredClone(ledger);
  completedSixSlice.latestCompletedSlice = expectedSlices.length;
  completedSixSlice.orderedSlices[5].status = "completed";
  completedSixSlice.orderedSlices[5].after = structuredClone(completedSixSlice.orderedSlices[5].before);
  completedSixSlice.orderedSlices[5].tests.forEach(test => { test.status = "pass"; });
  completedSixSlice.currentContinuation.sliceSequenceStatus = "completed-continuation-required";
  const continuationErrors = validateLedger(completedSixSlice, { finalTargetsSatisfied: false });
  assert(continuationErrors.length === 0,
    `six-slice completion cannot remain an honest continuation: ${continuationErrors.join(",")}`);
  completedSixSlice.status = "completed";
  completedSixSlice.refactorComplete = true;
  completedSixSlice.completionClaimed = true;
  assert(validateLedger(completedSixSlice, { finalTargetsSatisfied: false }).includes("completion"),
    "six-slice completion bypassed unmet architecture/final evidence");

  const nonProductionMutation = structuredClone(completedSixSlice);
  nonProductionMutation.status = "in-progress";
  nonProductionMutation.refactorComplete = false;
  nonProductionMutation.completionClaimed = false;
  nonProductionMutation.orderedSlices[5].after.productionGraphSha256 = "0".repeat(64);
  assert(validateLedger(nonProductionMutation, { finalTargetsSatisfied: false })
    .some(error => error.includes("non-production-graph")),
  "non-production graph mutation was accepted");

  const continuationOverclaim = structuredClone(ledger);
  continuationOverclaim.currentContinuation.latestCompletedSlice =
    continuationOverclaim.currentContinuation.orderedSlices.length + 1;
  assert(validateContinuationFrontier(continuationOverclaim).includes("frontier"),
    "continuation latest-completed overclaim was accepted");

  const graphCopy = structuredClone(graph);
  graphCopy.mixedOwnershipDebt = [];
  const actual = collectCurrentGraph(graphCopy, policy);
  assert(validateGraphPolicy(graphCopy, policy, actual).some(error => error.includes("required-entry-missing")),
    "mixed ownership debt deletion was accepted");
  const policyCopy = structuredClone(policy);
  policyCopy.allowedDependencyDirections.push(policyCopy.temporaryDebtExceptions[0].direction);
  assert(validateGraphPolicy(graph, policyCopy, collectCurrentGraph(graph, policyCopy))
    .some(error => error.includes("temporary-debt-hidden")),
  "temporary debt exception was hidden in the allowlist");
  const duplicateCmake = parseCmakeBuildGraph(
    `${readText(policy.cmakePolicy.file)}\ntarget_sources(media_server PRIVATE src/main.cpp)\n`,
    collectCurrentGraph(graph, policy).productionFiles,
    graph.moduleClassifiers,
    policy.cmakePolicy,
  );
  assert(duplicateCmake.duplicateSources.some(item => item.startsWith("src/main.cpp:")),
    "duplicate CMake production source was accepted");
  const targetSourceMutation = structuredClone(graph);
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
  const allCompleted = completed.length === expectedSlices.length;
  const parkedFinal = value.parkedGeneratedEvidenceArtifacts?.status === "finalized" &&
    value.parkedGeneratedEvidenceArtifacts?.completionEvidence === true;
  const continuationSlices = value.currentContinuation?.orderedSlices || [];
  const continuationCompleted = continuationSlices.length > 0 &&
    continuationSlices.every(item => item.status === "completed");
  const finalEligible = allCompleted && continuationCompleted && evaluation.finalTargetsSatisfied === true && parkedFinal &&
    value.currentContinuation?.finalEvidenceStatus === "completed";
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
    const expectedSequenceStatus = allCompleted ? "completed-continuation-required" : "partial";
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

function sliceTest(slice, command) {
  const matches = slice.tests.filter(test => test.command === command);
  assert(matches.length === 1, `Slice test must occur exactly once: ${command}`);
  return matches[0];
}

function check(name, fn) {
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
