#!/usr/bin/env node
// 파일 용도: v3.5.0 Step 4 Incident-to-Command Handoff 구현, 문서, inventory 연결을 검증한다.
import { extractCppFunctionBlock, extractNamedFunctionBlock } from "./source_block_assertion_utils.mjs";


import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.5.0 Incident-to-Command Handoff verification

Usage:
  ./server.sh verify-v350-incident-to-command-handoff

Checks:
  - /ops/api/events/reviews selected event detail includes an incident-to-command handoff
  - handoff links source cause, continuity drill candidate, and command plan draft references
  - the handoff is read-only and does not mutate source, view, rule, EventRecord, Ops audit, client, or media/schema contracts
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v350-incident-to-command-handoff";
const schema = "media-server.ops.v350-incident-command-handoff.v1";
const reviewRoute = "/ops/api/events/reviews";
const commandPlanRoute = "/ops/api/live-operations/command-plan";
const graphRoute = "/ops/api/live-operations/graph";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  uiScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  implementationEvidence: readJson("test/fixtures/project_feature_implementation_evidence.json"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  serverSh: readText("server.sh"),
};

const checks = [];

check("Ops server builds the v3.5 incident-to-command handoff model", () => {
  for (const snippet of [
    "struct OpsV350IncidentCommandHandoff",
    "BuildV350IncidentCommandHandoff",
    "AppendV350IncidentCommandHandoffJson",
    schema,
    "incidentCommandHandoff",
    "incidentCommandHandoffSummary",
    "sourceCause",
    "sourceCauseEvidence",
    "continuityDrillCandidate",
    "commandPlanDraft",
    "commandPlanCandidateIds",
    "handoffReadiness",
    "operatorNextAction",
    graphRoute,
    commandPlanRoute,
  ]) {
    assertIncludes(files.server, snippet, "v350 incident handoff server model");
  }
});

check("incident detail handoff derives from event detail, source correlation, drill, and command plan context", () => {
  const block = extractBlock(files.server, "struct OpsV350IncidentCommandHandoff", "struct OpsV350StagedChangePlan");
  for (const snippet of [
    "OpsV350CommandPlanCandidate",
    "BuildV350IncidentCommandHandoff(",
    "sourceCause",
    "continuityDrillCandidate",
    "commandPlanDraft",
    "sourceRecheck",
    "recovery",
    "maintenance",
    "clientNotice",
    "ruleFollowUp",
  ]) {
    assertIncludes(block, snippet, "v350 incident handoff derivation");
  }
  for (const snippet of [
    "OpsV320UnifiedResolutionWorkspaceItemJson(",
    "OpsV330IncidentSourceCorrelationInfo",
    "BuildV350CommandPlanCandidates",
    "BuildV340RecoveryCandidateContext",
    "BuildV340RecoveryCandidatePackages",
    "incidentSourceCorrelation",
  ]) {
    assertIncludes(files.server, snippet, "v350 incident handoff upstream integration");
  }
});

check("event reviews response embeds handoff in selected detail, summaries, and detail sections", () => {
  const start = files.server.indexOf("void AppendV350IncidentCommandHandoffJson(");
  const end = files.server.indexOf("std::string OpsV350IncidentCommandHandoffSummaryJson(", start);
  assert(start >= 0 && end > start, "EVT-075 incident handoff projection block missing");
  const evt075HandoffBlock = files.server.slice(start, end);
  assertIncludes(evt075HandoffBlock, "media-server.ops.v350-incident-command-handoff.v1", "EVT-075 block-scoped canonical handoff projection");
  assert(!evt075HandoffBlock.includes("\\\"eventRecordWritePerformed\\\":true") && evt075HandoffBlock.includes("\\\"eventRecordWritePerformed\\\":false"), "EVT-075 handoff must not write EventRecord state");
  assert(!evt075HandoffBlock.includes("\\\"viewerClientExposureAdded\\\":true") && evt075HandoffBlock.includes("\\\"viewerClientExposureAdded\\\":false"), "EVT-075 handoff must remain hidden from client/viewer");
  const routeOwnerSource = readText("src/ingress/ops_event_route_owner.cpp");
  const routeBlock = routeOwnerSource.slice(routeOwnerSource.indexOf("constexpr const char* kOpsEventsPagePath"), routeOwnerSource.indexOf("bool HasPrefix("));
  assertIncludes(routeBlock, "/ops/api/events/reviews", "EVT-075 canonical review route");
  const block = extractBlock(files.server, "std::string OpsV320DetailSectionsJson", "std::string OpsV310ReplayTimelineItemJson");
  for (const snippet of [
    "incidentCommandHandoffSummary",
    "incidentCommandHandoff",
    "incident-command-handoff",
    "AppendV350IncidentCommandHandoffJson",
    "BuildV350IncidentCommandHandoff",
    commandPlanRoute,
  ]) {
    assertIncludes(block, snippet, "v350 incident handoff event review json");
  }
});

check("incident handoff preserves read-only no-execution boundaries", () => {
  const block = extractBlock(files.server, "void AppendV350IncidentCommandHandoffJson", "struct OpsV350StagedChangePlan");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "draftOnly",
    "operatorApprovalRequired",
    "commandPlanExecuted",
    "sourceRecheckExecuted",
    "recoveryExecuted",
    "clientNoticeSent",
    "ruleFollowUpApplied",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "rawDiagnosticJsonIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    assertIncludes(block, snippet, "v350 incident handoff boundary flags");
  }
  for (const flag of [
    "commandPlanExecuted",
    "sourceRecheckExecuted",
    "recoveryExecuted",
    "clientNoticeSent",
    "ruleFollowUpApplied",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "ruleRegistryWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "rawDiagnosticJsonIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) {
    const index = block.indexOf(flag);
    const nearby = block.slice(index, index + 128);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
});

check("Ops UI renderer has a stable handoff detail marker without client exposure", () => {
  const block = extractBlock(files.uiScript, "function renderV350IncidentCommandHandoff", "function renderV320AiReviewQuality");
  for (const snippet of [
    "incidentCommandHandoff",
    "incident-command-handoff",
    "sourceCause",
    "commandPlanDraft",
  ]) {
    assertIncludes(block, snippet, "ops events UI handoff renderer");
    assertIncludes(extractNamedFunctionBlock(files.uiScript, "renderV350IncidentCommandHandoff"), "incidentCommandHandoff", "UI-080 block-scoped canonical product state");
    assert(!["requestJson(","fetch(","method: 'POST'","method: 'PUT'","method: 'DELETE'"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV350IncidentCommandHandoff").includes(marker)), "UI-080 no-write explicit absence oracle");
    assert(!["send(","sendClientNotice","deliveryQueueWritePerformed: true"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV350IncidentCommandHandoff").includes(marker)), "UI-080 no-send explicit absence oracle");
    assert(!["method: 'POST'","method: 'PUT'","method: 'PATCH'","method: 'DELETE'"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV350IncidentCommandHandoff").includes(marker)), "UI-080 no-mutation explicit absence oracle");
    const mediaPathChanged = ["method: 'POST'", "method: 'PUT'", "method: 'PATCH'", "method: 'DELETE'"].some(marker => extractNamedFunctionBlock(files.uiScript, "renderV350IncidentCommandHandoff").includes(marker));
    assert(mediaPathChanged === false, "UI-080 command handoff renderer must not mutate EventRecord or media paths");
    assertIncludes(files.uiScript, "/ops/events", "UI-080 canonical route obligation");
    assertIncludes(files.uiScript, "media-server.ops.v350-incident-command-handoff.v1", "UI-080 canonical schema obligation");
  }
  assert(!block.includes("credentialMaterialExposed"), "UI must not render credential material markers as data");
});

check("roadmap records v3.5 Step 4 without overclaiming staging changes", () => {
  for (const snippet of [
    "| 4 | v3.5.0 (4) Incident-to-Command Handoff | P0 | 완료 |",
    "/ops/events 사건 detail에서 source 원인, drill 후보, command plan 초안으로 이어지는 handoff",
    "## v3.5.0 Step 4 개발 기록",
    reviewRoute,
    "OpsV350IncidentCommandHandoff",
    "`./server.sh verify-v350-incident-to-command-handoff`",
    "Staged Change Plan and Impact Preview 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.5 Step 4");
  }
});

check("stream verification exposes v3.5 Step 4 command and boundary", () => {
  for (const snippet of [
    `| v3.5.0 (4) | \`./server.sh ${command}\` | Incident-to-Command Handoff.`,
    reviewRoute,
    "source 원인, continuity drill 후보, command plan 초안",
    "selected detail handoff",
    "source/view/rule/EventRecord/Ops audit/client/media mutation 미수행",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.5 Step 4");
  }
});

check("feature inventory and release records map v3.5 Step 4", () => {
  for (const snippet of [
    `v3.5.0 (4) Incident-to-Command Handoff | \`UI-080\`, \`EVT-075\`, \`SAFE-138\`, \`OPS-105\` | \`${command}\``,
    "UI-080 | V350 Step 4 incident command handoff detail",
    "EVT-075 | V350 Step 4 EventRecord to command handoff projection",
    "SAFE-138 | V350 Step 4 handoff read-only boundary",
    "OPS-105 | V350 Step 4 Incident-to-Command Handoff 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.5 Step 4");
  }
  for (const snippet of [
    "V350 Incident-to-Command Handoff",
    `\`./server.sh ${command}\``,
    "v350 Step 4 RED incident command handoff gate",
    "v350 Step 4 incident command handoff final",
    "v350 Step 4 UI 풀테스트",
    "v350 Step 4 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.5 Step 4");
  }
});

check("server entrypoint and inventory verifiers include v3.5 Step 4 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v350_incident_to_command_handoff.mjs", "server.sh script dispatch");
  assertExactVerifierMapping(
    files.implementationEvidence,
    "UI-080",
    command,
    "scripts/internal/verify_v350_incident_to_command_handoff.mjs",
  );
  for (const id of ["UI-080", "EVT-075", "SAFE-138", "OPS-105"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v350_incident_to_command_handoff.mjs", "script inventory");
});

check("SAFE-138 canonical incident handoff read-only boundary", () => {
  const block = extractCppFunctionBlock(files.server, "OpsV350IncidentCommandHandoff BuildV350IncidentCommandHandoff(");
  const safe138BoundaryObserved = block.includes("handoff.source_cause") && block.includes("handoff.command_plan_draft");
  const commandExecutionPerformed = /\b(?:Execute|Apply|Write|Persist|Recover)[A-Za-z0-9_:]*\s*\(/.test(block);
  const rawMaterialExposed = /sourceUrl|rawLocator|credentialMaterial/.test(block);
  const mutationPerformed = commandExecutionPerformed;
  const sourceUrlExposed = /sourceUrl/.test(block);
  const credentialMaterialExposed = /credentialMaterial/.test(block);
  assert(safe138BoundaryObserved && commandExecutionPerformed === false && mutationPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false,
    "SAFE-138 handoff.source_cause /ops/events selected detail must remain draft-only without command execution mutation raw locator credential");
});

const results = runChecks();
console.log("");
console.log("== v3.5.0 incident-to-command handoff summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.5.0 (4)");
console.log(`- reviewRoute: ${reviewRoute}`);
console.log("- handoff: source cause, continuity drill candidate, command plan draft");
console.log("- writes: no source/view/rule/client/EventRecord/Ops audit/media mutation performed");
console.log("- stagedChangePlan: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}

function runChecks() {
  let pass = 0;
  let fail = 0;
  for (const item of checks) {
    try {
      item.fn();
      pass += 1;
      console.log(`[pass] ${item.name}`);
    } catch (error) {
      fail += 1;
      console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { pass, fail };
}

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function assertExactVerifierMapping(manifest, featureId, expectedCommand, expectedFile) {
  const item = manifest.items?.find(entry => entry.id === featureId);
  assert(item?.verifierEvidence?.command === expectedCommand,
    `${featureId} exact verifier command mismatch: ${item?.verifierEvidence?.command}`);
  assert(item?.verifierEvidence?.file === expectedFile,
    `${featureId} exact verifier file mismatch: ${item?.verifierEvidence?.file}`);
  assert(item?.verifierEvidence?.anchor === featureId,
    `${featureId} exact verifier assertion anchor mismatch: ${item?.verifierEvidence?.anchor}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
