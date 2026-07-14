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
  const target = graph.cmake.targets.find(item => item.id === policy.cmakePolicy.productionExecutable);
  target.declaredSourceCount = current.cmake.productionSources.length;
  target.defaultActiveSourceCount = current.cmake.productionSources.length - target.conditionalSources.length;
  target.moduleOwners = [...new Set(current.cmake.productionSources
    .map(source => classifyModule(source, graph.moduleClassifiers)))];
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
  assert(actual.cmake.productionSources.length === graph.cmake.targets[0].declaredSourceCount &&
    actual.cmake.productionSources.length - graph.cmake.targets[0].conditionalSources.length ===
      graph.cmake.targets[0].defaultActiveSourceCount,
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

check("route/API Slice owns exact action deferral response behind the outer auth guard", () => {
  const slice = ledger.orderedSlices[1];
  if (slice.status === "not-started") return;
  const server = readText("src/ingress/webrtc_http_server.cpp");
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
  const server = readText("src/ingress/webrtc_http_server.cpp");
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
  const server = readText("src/ingress/webrtc_http_server.cpp");
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
  assert(policy.temporaryDebtExceptions.some(item =>
    item.direction === "transport-and-auth-adapter -> product-ui-workspaces" &&
      item.countsAsTargetViolation === true) &&
    graph.observedModuleEdges.some(item =>
      item.direction === "transport-and-auth-adapter -> product-ui-workspaces" &&
        item.allowedByTarget === false),
  "transport-to-product-UI composition debt was hidden from the target violation count");
});

check("VLM parser Slice owns provenance validation and generic strict JSON outside transport", () => {
  const slice = ledger.orderedSlices[4];
  if (slice.status === "not-started") return;
  const strictHeader = readText("include/core/strict_json.h");
  const strictSource = readText("src/core/strict_json.cpp");
  const validatorHeader = readText("include/ingress/vlm_incident_rule_provenance.h");
  const validatorSource = readText("src/ingress/vlm_incident_rule_provenance.cpp");
  const server = readText("src/ingress/webrtc_http_server.cpp");
  const cmake = readText("CMakeLists.txt");
  assert(!fs.existsSync(path.join(rootDir, "include/ingress/strict_json.h")) &&
    !fs.existsSync(path.join(rootDir, "src/ingress/strict_json.cpp")),
  "strict JSON remains transport-owned");
  assert(sha256Text(strictHeader) === slice.baselineDigests.strictJsonHeaderSha256,
    "strict JSON header behavior/API drift");
  assert(sha256Text(strictSource.replace('#include "core/strict_json.h"', '#include "ingress/strict_json.h"')) ===
    slice.baselineDigests.strictJsonSourceSha256,
  "strict JSON parser implementation drift");
  assert(validatorHeader.includes("bool ValidateVlmIncidentRuleProvenanceContract(") &&
    validatorSource.includes('#include "core/strict_json.h"') &&
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
  assert(cmake.split("src/core/strict_json.cpp").length === 2 &&
    cmake.split("src/ingress/vlm_incident_rule_provenance.cpp").length === 2 &&
    !cmake.includes("src/ingress/strict_json.cpp"),
  "CMake strict JSON/VLM provenance ownership drift");
  const applicationOwner = graph.moduleClassifiers.find(item => item.id === "application-service-interfaces");
  assert(applicationOwner?.exactFiles?.includes("include/ingress/vlm_incident_rule_provenance.h") &&
    applicationOwner.exactFiles.includes("src/ingress/vlm_incident_rule_provenance.cpp"),
  "VLM provenance validator graph owner missing");
  assert(policy.temporaryDebtExceptions.some(item =>
    item.direction === "application-service-interfaces -> core-utilities" &&
      item.countsAsTargetViolation === true) &&
    graph.observedModuleEdges.some(item =>
      item.direction === "application-service-interfaces -> core-utilities" &&
        item.allowedByTarget === false),
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

check("current continuation binds the completion oracle and Ops renderer without a final claim", () => {
  const slices = ledger.currentContinuation?.orderedSlices || [];
  assert(slices.length === 1 && slices[0].order === 1 &&
    slices[0].id === "completion-oracle-and-ops-ui-renderer" && slices[0].status === "completed" &&
    ledger.currentContinuation.latestCompletedSlice === 1,
  "current continuation slice identity/frontier mismatch");
  const slice = slices[0];
  assert(slice.rollbackCommit === ledger.orderedSlices[5].rollbackCommit &&
    slice.nonProductionSlice === false && slice.contractAssertions.length >= 5 && slice.tests.length >= 5 &&
    slice.tests.every(test => test.status === "pass"),
  "current continuation rollback/contract/test boundary mismatch");
  assert(slice.after?.productionGraphSha256 === ledger.currentGraph.sha256 &&
    slice.after.productionFiles === ledger.currentGraph.metrics.productionFiles &&
    slice.after.cppSources === ledger.currentGraph.metrics.cppSources &&
    slice.after.targetViolationDirectionsUnderPolicyV1 === ledger.currentGraph.metrics.targetViolationDirections &&
    slice.after.webrtcHttpServerLines === ledger.currentGraph.metrics.largestMixedOwnerFileLines &&
    slice.after.internalTargetSeparation === ledger.currentGraph.metrics.internalTargetSeparation,
  "current continuation after-state is not bound to the actual current graph");
  assert(slice.after.targetViolationDirectionsUnderPolicyV1 ===
      slice.before.targetViolationDirectionsUnderPolicyV1 &&
    !graph.observedModuleEdges.some(item => item.direction === "product-ui-workspaces -> core-utilities"),
  "Ops renderer introduced or hid a target-direction dependency regression");
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
  for (const file of continuationActive?.changedFiles || []) {
    assert(observed.has(file), `declared continuation change missing: ${file}`);
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
function exec(command, args, statusOnly = false) {
  if (statusOnly) return spawnSync(command, args, { cwd: rootDir, encoding: "utf8" });
  return execFileSync(command, args, { cwd: rootDir, encoding: "utf8" }).trim();
}
