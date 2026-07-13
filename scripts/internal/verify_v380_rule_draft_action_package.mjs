#!/usr/bin/env node
// 파일 용도: v3.8.0 Step 9 Rule Draft Action Package 구현, 문서, inventory 연결을 검증한다.

import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.8.0 Rule Draft Action Package verification

Usage:
  ./server.sh verify-v380-rule-draft-action-package

Checks:
  - /ops/api/actions/rule-draft-package exposes the v3.8 rule draft action package contract
  - rule threshold candidate, scenario candidate, draft package, review checklist, and apply blocker are explicit
  - rule draft action package is Ops-only/read-only and does not apply rules, persist drafts, write registries, or mutate media/event/client schemas
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v380-rule-draft-action-package";
const schema = "media-server.ops.v380-rule-draft-action-package.v1";
const route = "/ops/api/actions/rule-draft-package";
const readinessRoute = "/ops/api/actions/readiness-preflight";
const capabilityRoute = "/ops/api/actions/capability-contract";
const approvalRoute = "/ops/api/actions/approval-decision-gate";
const ledgerRoute = "/ops/api/actions/request-ledger";
const noticeRoute = "/ops/api/actions/client-notice-draft-queue";
const featureIds = ["LAB-118", "SAFE-188", "OPS-155"];
const files = loadFiles();
const checks = [];

check("Ops server builds the v3.8 rule draft action package model", () => {
  for (const snippet of [
    "struct OpsV380RuleDraftActionPackageItem",
    "BuildV380RuleDraftActionPackageItems",
    "AppendV380RuleDraftActionPackageItemJson",
    "OpsV380RuleDraftActionPackageJson",
    schema,
    "ruleDraftActionPackage",
    "draftPackage",
    "ruleThresholdCandidate",
    "scenarioCandidate",
    "reviewChecklist",
    "applyBlocker",
    "readinessRef",
    "noticeDraftRef",
    "draft",
    "review-needed",
    "blocked",
    "apply-blocked",
    "not-run",
    readinessRoute,
    capabilityRoute,
    approvalRoute,
    ledgerRoute,
    noticeRoute,
  ]) {
    assertIncludes(files.server, snippet, "v380 rule draft action package server model");
  }
});

check("rule draft action package preserves no-apply, no-persist, and no-schema-change boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV380RuleDraftActionPackageJson",
    "struct OpsV370SiteSourceGroupContractItem",
  );
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "ruleDraftActionPackageContractOnly",
    "ruleThresholdCandidate",
    "scenarioCandidate",
    "draftPackage",
    "reviewChecklist",
    "applyBlocker",
    "ruleDraftPersisted",
    "ruleApplyPerformed",
    "scenarioApplyPerformed",
    "ruleRegistryWritePerformed",
    "profileRegistryWritePerformed",
    "actionExecutionPerformed",
    "actionRequestPersisted",
    "approvalDecisionPersisted",
    "readinessResultPersisted",
    "sourceRecheckExecuted",
    "sourceHealthWritePerformed",
    "clientNoticeSent",
    "noticeQueueWritePerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "runbookInstancePersisted",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientPayloadChanged",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "v380 rule draft action package flags");
  }
  for (const flag of [
    "ruleDraftPersisted",
    "ruleApplyPerformed",
    "scenarioApplyPerformed",
    "ruleRegistryWritePerformed",
    "profileRegistryWritePerformed",
    "actionExecutionPerformed",
    "actionRequestPersisted",
    "approvalDecisionPersisted",
    "readinessResultPersisted",
    "sourceRecheckExecuted",
    "sourceHealthWritePerformed",
    "clientNoticeSent",
    "noticeQueueWritePerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "runbookInstancePersisted",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "viewerClientPayloadChanged",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertFlagFalse(block, flag);
  }
  for (const forbidden of [
    "ApplyRule",
    "ApplyScenario",
    "PersistRuleDraft",
    "PersistScenarioDraft",
    "WriteRuleRegistry",
    "WriteProfileRegistry",
    "AppendEventRecord(",
    "AppendOpsAuditRecord(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `rule draft action package must not apply, persist, write, or expose restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the rule draft action package as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "v380 rule draft action package route");
  assertIncludes(block, "request.method == \"GET\"", "v380 rule draft action package route");
  assertIncludes(block, "require_ops_principal()", "v380 rule draft action package route");
  assertIncludes(block, "OpsV380RuleDraftActionPackageJson()", "v380 rule draft action package route");
  assertIncludes(block, "Cache-Control", "v380 rule draft action package route");
  assertIncludes(block, "no-store", "v380 rule draft action package route");
  assert(!block.includes("require_client_write_principal"), "rule draft action package must not require client write principal");
});

check("docs, inventory, and dispatch map v3.8 Step 9", () => {
  for (const snippet of [
    "| 9 | v3.8.0 (9) Rule Draft Action Package | P1 | 완료 |",
    "## v3.8.0 Step 9 개발 기록",
    route,
    `\`./server.sh ${command}\``,
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.8 Step 9");
  }
  assertIncludes(
    files.streamVerification,
    `| v3.8.0 (9) | \`./server.sh ${command}\` | Rule Draft Action Package.`,
    "stream verification v3.8 Step 9",
  );
  assertIncludes(files.featureInventory, "v3.8.0 (9) Rule Draft Action Package", "feature inventory v3.8 Step 9");
  for (const id of featureIds) {
    assertIncludes(files.featureInventory, `\`${id}\``, `feature inventory ${id}`);
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.releaseRecords, "V380 Rule Draft Action Package", "release records v3.8 Step 9");
  assertIncludes(files.releaseRecords, `\`./server.sh ${command}\``, "release records v3.8 Step 9");
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v380_rule_draft_action_package.mjs", "server.sh dispatch");
  for (const id of ["LAB-118", "SAFE-188", "OPS-155"]) assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  assertIncludes(files.scriptInventory, "verify_v380_rule_draft_action_package.mjs", "script inventory");
});

check("SAFE-188 canonical bounded product boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV380RuleDraftActionPackageJson(");
  const routeObserved = files.server.includes("/ops/api/actions/rule-draft-package");
  const safe188BoundaryObserved = block.includes("BuildV380RuleDraftActionPackageItems") && block.includes("ruleApplyPerformed");
  const writePerformed = /\b(?:Write|Persist|AppendFile|UpdateSource|CreateVaRule|UpdateVaRule|AssignReviewer|RecheckSource)[A-Za-z0-9_:]*\s*\(/.test(block);
  const mutationPerformed = writePerformed || /\b(?:Apply|AutomaticApply|SafeApply|SendClientNotice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const executionPerformed = /\b(?:Execute|RunSimulation|Probe|Contact|ProviderCall|ProviderClient|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const sendPerformed = /\bSendClientNotice[A-Za-z0-9_:]*\s*\(/.test(block);
  const automaticApplyPerformed = /\b(?:AutomaticApply|SafeApply|ApplyRule|ApplySource)[A-Za-z0-9_:]*\s*\(/.test(block);
  const fieldSmokeExecuted = /\b(?:ExecuteFieldSmoke|ProbeEndpoint|ContactDevice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const providerCallPerformed = /\b(?:ProviderCall|ProviderClient|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const rawMaterialExposed = /\\"(?:rawLocator|rawJson|rawProviderResponse|rawEndpoint|rawMaterial|rawDiagnosticJson)\\":true/.test(block);
  const sourceUrlExposed = /\\"(?:sourceUrlIncluded|sourceUrlExposed)\\":true/.test(block);
  const credentialMaterialExposed = /\\"(?:credentialMaterialIncluded|credentialMaterialExposed)\\":true/.test(block);
  const debugMaterialExposed = /\\"(?:debugMaterialIncluded|debugMaterialExposed)\\":true/.test(block);
  const viewerClientExposureAdded = /\\"(?:viewerClientExposureAdded|viewerClientPayloadChanged)\\":true/.test(block);
  const mediaPathChanged = /\\"rtspOrWebrtcMediaPathChanged\\":true/.test(block);
  assert(routeObserved && writePerformed === false && mutationPerformed === false && executionPerformed === false && sendPerformed === false && providerCallPerformed === false, "OPS-155 canonical bounded absence oracle");
  assert(safe188BoundaryObserved && block.includes("media-server.ops.v380-rule-draft-action-package.v1") && writePerformed === false && mutationPerformed === false && executionPerformed === false && sendPerformed === false && automaticApplyPerformed === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-188 ruleApplyPerformed must remain no-execution no-write redacted and client/provider isolated");
});

finish("== v3.8.0 Rule Draft Action Package summary ==", { schema, step: "v3.8.0 (9)", route });

function loadFiles() {
  return {
    server: readText("src/ingress/webrtc_http_server.cpp"),
    backlog: readText("docs/development-backlog.md"),
    streamVerification: readText("docs/stream-verification.md"),
    featureInventory: readText("docs/project-feature-test-inventory.md"),
    featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
    implementationManifest: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
    projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
    scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
    releaseRecords: readText("docs/release-test-records.md"),
    serverSh: readText("server.sh"),
  };
}

function extractRouteBlock(text, routeNeedle) {
  const start = text.indexOf(`request.path == "${routeNeedle}"`);
  assert(start >= 0, `missing route: ${routeNeedle}`);
  const next = text.indexOf("\n                        if (request.path == ", start + 1);
  return text.slice(start, next >= 0 ? next : start + 2200);
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `missing block start: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `missing block end after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}

function assertFlagFalse(text, flag) {
  const index = text.indexOf(flag);
  assert(index >= 0, `missing boundary flag: ${flag}`);
  assert(text.slice(index, index + 144).includes("false"), `boundary flag must be false: ${flag}`);
}

function finish(title, summary) {
  const results = runChecks();
  console.log("");
  console.log(title);
  for (const [key, value] of Object.entries(summary)) {
    console.log(`- ${key}: ${value}`);
  }
  console.log("- writes: no rule apply/draft persist/registry/EventRecord/client/media mutation performed");
  console.log("- uiFulltest: not-run-by-this-command");
  console.log("- longrun30Or120: not-run-by-this-command");
  console.log(`- pass: ${results.pass}`);
  console.log(`- fail: ${results.fail}`);
  if (results.fail > 0) {
    process.exit(1);
  }
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

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing ${JSON.stringify(needle)}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
