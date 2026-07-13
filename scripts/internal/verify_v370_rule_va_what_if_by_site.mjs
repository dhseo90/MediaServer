#!/usr/bin/env node
// 파일 용도: v3.7.0 Step 13 Rule/VA What-if by Site 연결, 문서, 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { exactBooleanFlagValue, extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.7.0 Rule/VA What-if by Site verification

Usage:
  ./server.sh verify-v370-rule-va-what-if-by-site

Checks:
  - /ops/api/site-operations/rule-va-what-if-by-site exposes site-scoped rule/VA what-if candidates
  - EventRecord and VA fixture inputs are read-only and rule threshold/scenario candidates are not applied
  - /ops dashboard renders site impact, EventRecord/VA fixture refs, and what-if delta without client/viewer injection
  - backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v370-rule-va-what-if-by-site";
const schema = "media-server.ops.v370-rule-va-what-if-by-site.v1";
const route = "/ops/api/site-operations/rule-va-what-if-by-site";
const projectionRoute = "/ops/api/site-operations/source-registry-projection";
const healthRoute = "/ops/api/site-operations/health-rollup";
const impactRoute = "/ops/api/site-operations/impact-graph";
const simulationInputRoute = "/ops/api/site-operations/simulation-input-pack";
const crossSiteReadinessRoute = "/ops/api/site-operations/cross-site-safe-apply-readiness";
const eventRecordRoute = "/ops/api/events/reviews";
const ruleVaReplayRoute = "/ops/api/live-operations/simulation/rule-va-what-if-replay-pack";
const featureIds = ["UI-097", "RULE-110", "EVT-082", "LAB-106", "SAFE-174", "OPS-141"];

const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  uiScript: readText("src/ingress/product_ui_page_scripts.cpp"),
  clientScripts: readText("src/ingress/product_ui_client_scripts.cpp"),
  css: readText("src/ingress/product_ui_css.cpp"),
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

const checks = [];

check("Ops server builds the v3.7 Rule/VA what-if by site model", () => {
  for (const snippet of [
    "struct OpsV370RuleVaWhatIfBySiteItem",
    "struct OpsV370RuleVaWhatIfBySiteSummary",
    "BuildV370RuleVaWhatIfBySiteItems",
    "BuildV370RuleVaWhatIfBySiteSummary",
    "AppendV370RuleVaWhatIfBySiteItemJson",
    "AppendV370RuleVaWhatIfBySiteSummaryJson",
    "OpsV370RuleVaWhatIfBySiteJson",
    schema,
    "whatIfBySiteId",
    "siteId",
    "sourceGroup",
    "sourceId",
    "ruleCandidateId",
    "eventRecordRef",
    "vaFixtureRef",
    "ruleThresholdCandidate",
    "scenarioCandidate",
    "siteImpactSummary",
    "whatIfResultDelta",
    "readOnly",
  ]) {
    assertIncludes(files.server, snippet, "v370 rule/VA what-if by site server model");
  }
  const producerBlock = extractCppFunctionBlock(files.server, "std::string OpsV370RuleVaWhatIfBySiteJson(");
  assertIncludes(producerBlock, "media-server.ops.v370-rule-va-what-if-by-site.v1", "v370 rule/VA what-if by site schema");
});

check("Rule/VA what-if by site derives from site projection, impact, EventRecord, and VA fixture refs", () => {
  const block = extractBlock(
    files.server,
    "struct OpsV370RuleVaWhatIfBySiteItem",
    "struct OpsV370ClientNoticeBySiteViewGroupItem",
  );
  for (const snippet of [
    "BuildV370SiteAwareSourceRegistryProjectionItems",
    "BuildV370SiteHealthRollupItems",
    "BuildV370SiteImpactGraphNodes",
    "BuildV370SiteSimulationInputPackItems",
    "BuildV370CrossSiteSafeApplyReadinessItems",
    "BuildV360RuleVaWhatIfReplayCandidates",
    "manual_ui_fulltest_va_seed_matrix",
    "EventRecord:aggregate",
    "siteRuleVaWhatIfBySite",
    projectionRoute,
    healthRoute,
    impactRoute,
    simulationInputRoute,
    crossSiteReadinessRoute,
    eventRecordRoute,
    ruleVaReplayRoute,
  ]) {
    assertIncludes(block, snippet, "v370 rule/VA what-if by site derivation");
  }
});

check("Rule/VA what-if by site preserves no-apply and no-mutation boundaries", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370RuleVaWhatIfBySiteJson(");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "whatIfOnly",
    "siteScoped",
    "eventRecordReadOnly",
    "vaFixtureReadOnly",
    "ruleRegistryWritePerformed",
    "ruleThresholdApplied",
    "presetApplied",
    "scenarioApplied",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "simulationRunExecuted",
    "safeApplyPerformed",
    "clientNoticeSent",
    "viewerClientPayloadChanged",
    "sourceUrlIncluded",
    "rawLocatorIncluded",
    "rawJsonIncluded",
    "debugMaterialIncluded",
    "credentialMaterialIncluded",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "v370 rule/VA what-if boundary");
  }
  for (const flag of [
    "ruleRegistryWritePerformed",
    "ruleThresholdApplied",
    "presetApplied",
    "scenarioApplied",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "simulationRunExecuted",
    "safeApplyPerformed",
    "clientNoticeSent",
    "viewerClientPayloadChanged",
    "sourceUrlIncluded",
    "rawLocatorIncluded",
    "rawJsonIncluded",
    "debugMaterialIncluded",
    "credentialMaterialIncluded",
    "eventPostPayloadChanged",
    "eventRecordSchemaChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    const index = block.indexOf(flag);
    assert(index >= 0, `boundary flag missing: ${flag}`);
    const nearby = block.slice(index, index + 144);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  assert(exactBooleanFlagValue(block, "eventRecordWritePerformed") === false, "eventRecordWritePerformed must remain false");
  const ruleRegistryWritePerformed = block.includes('\\"ruleRegistryWritePerformed\\":true');
  const scenarioApplied = block.includes('\\"scenarioApplied\\":true');
  const eventPostPayloadChanged = block.includes('\\"eventPostPayloadChanged\\":true');
  assert(ruleRegistryWritePerformed === false && scenarioApplied === false && eventPostPayloadChanged === false, "RULE-110 OpsV370RuleVaWhatIfBySiteJson site calculation-only registryWrite/scenario apply/mutation Changed absence");
  for (const forbidden of [
    "ApplyRule",
    "PersistRule",
    "AppendEventRecord(",
    "AppendOpsAuditRecord(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `rule/VA what-if by site must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the Rule/VA what-if by site route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/");
  assertIncludes(block, route, "v370 rule/VA what-if by site route");
  assertIncludes(block, "request.method == \"GET\"", "v370 rule/VA what-if by site route");
  assertIncludes(block, "require_ops_principal()", "v370 rule/VA what-if by site route");
  assertIncludes(block, "OpsV370RuleVaWhatIfBySiteJson(", "v370 rule/VA what-if by site route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "v370 rule/VA what-if by site route");
  assertIncludes(block, "Cache-Control", "v370 rule/VA what-if by site route");
  assertIncludes(block, "no-store", "v370 rule/VA what-if by site route");
});

check("/ops dashboard declares and renders Rule/VA what-if by site workspace", () => {
  const serverBlock = extractBlock(files.server, "void AppendOpsDashboardPage", "void AppendOpsRulesPage");
  for (const snippet of [
    "ops-site-rule-va-what-if-workspace",
    "data-testid=\"ops-site-rule-va-what-if-workspace\"",
    "data-v370-rule-va-what-if-by-site",
    schema,
    "Rule/VA What-if by Site",
    "dashSiteRuleVaWhatIfBadges",
    "dashSiteRuleVaWhatIfText",
    "dashSiteRuleVaWhatIfCandidateList",
    "dashSiteRuleVaWhatIfImpactList",
    "dashSiteRuleVaWhatIfFixtureList",
    "dashSiteRuleVaWhatIfBoundary",
  ]) {
    assertIncludes(serverBlock, snippet, "v370 rule/VA what-if dashboard shell");
  }
  const scriptBlock = extractBlock(
    files.uiScript,
    "const renderV370RuleVaWhatIfBySite",
    "const renderV370ClientNoticeBySiteViewGroup",
  );
  assertIncludes(scriptBlock, "dashSiteRuleVaWhatIfBoundary", "v370 Rule/VA what-if product UI state");
  assertIncludes(files.uiScript, "/ops/dashboard", "UI-097 canonical route obligation");
  assertIncludes(files.server, "media-server.ops.v370-rule-va-what-if-by-site.v1", "UI-097 canonical schema obligation");
  for (const snippet of [
    "refreshV370RuleVaWhatIfBySite",
    route,
    "ruleVaWhatIfBySiteItems",
    "ruleVaWhatIfBySiteSummary",
    "ruleThresholdCandidate",
    "scenarioCandidate",
    "eventRecordRef",
    "vaFixtureRef",
    "siteImpactSummary",
    "whatIfResultDelta",
    "dashSiteRuleVaWhatIfCandidateList",
    "dashSiteRuleVaWhatIfImpactList",
    "dashSiteRuleVaWhatIfFixtureList",
    "requestJson(whatIfRoute)",
  ]) {
    assertIncludes(scriptBlock, snippet, "v370 rule/VA what-if dashboard renderer");
  }
  const refreshBlock = extractBlock(files.uiScript, "async function refreshDashboard()", "async function refreshEvents()");
  assertIncludes(refreshBlock, "refreshV370RuleVaWhatIfBySite", "dashboard refresh");
  assertIncludes(refreshBlock, route, "dashboard refresh");
});

check("Rule/VA what-if by site styling is responsive and stable", () => {
  for (const snippet of [
    ".ops-site-rule-va-what-if-workspace",
    ".ops-site-rule-va-what-if-grid",
    ".ops-site-rule-va-what-if-list",
    ".ops-site-rule-va-what-if-entry",
    ".ops-site-rule-va-what-if-boundary",
    "body.ops-shell .ops-site-rule-va-what-if-workspace",
  ]) {
    assertIncludes(files.css, snippet, "v370 rule/VA what-if CSS");
  }
});

check("client/viewer scripts do not receive v3.7 Rule/VA what-if by site material", () => {
  for (const forbidden of [
    schema,
    route,
    "ruleVaWhatIfBySiteItems",
    "whatIfBySiteId",
    "ruleThresholdCandidate",
    "siteImpactSummary",
    "whatIfResultDelta",
  ]) {
    assert(!files.clientScripts.includes(forbidden), `client scripts must not expose v3.7 Rule/VA what-if material: ${forbidden}`);
  }
});

check("roadmap, stream verification, inventory, and release records map v3.7 Step 13", () => {
  for (const snippet of [
    "| 13 | v3.7.0 (13) Rule/VA What-if by Site | P1 | 완료 |",
    "## v3.7.0 Step 13 개발 기록",
    route,
    "OpsV370RuleVaWhatIfBySiteJson",
    `\`./server.sh ${command}\``,
    "Stabilization and Release Readiness 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.7 Step 13");
  }
  for (const snippet of [
    `| v3.7.0 (13) | \`./server.sh ${command}\` | Rule/VA What-if by Site.`,
    "site 영향과 EventRecord/VA fixture 기반",
    "rule apply 없이",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.7 Step 13");
  }
  for (const snippet of [
    `v3.7.0 (13) Rule/VA What-if by Site | \`UI-097\`, \`RULE-110\`, \`EVT-082\`, \`LAB-106\`, \`SAFE-174\`, \`OPS-141\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-097 | V370 Step 13 Rule/VA What-if by Site UI",
    "RULE-110 | V370 Step 13 site-scoped Rule/VA what-if candidates",
    "EVT-082 | V370 Step 13 EventRecord what-if by site aggregate",
    "LAB-106 | V370 Step 13 Rule/VA what-if by site harness",
    "SAFE-174 | V370 Step 13 Rule/VA what-if by site boundary",
    "OPS-141 | V370 Step 13 Rule/VA What-if by Site 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.7 Step 13");
  }
  for (const snippet of [
    "V370 Rule/VA What-if by Site",
    `\`./server.sh ${command}\``,
    "v370 Step 13 RED Rule/VA what-if by site gate",
    "v370 Step 13 Rule/VA what-if by site final",
    "v370 Step 13 UI 풀테스트",
    "v370 Step 13 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.7 Step 13");
  }
});

check("server entrypoint and inventory verifiers include v3.7 Step 13 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v370_rule_va_what_if_by_site.mjs", "server.sh script dispatch");
  for (const id of ["UI-097", "RULE-110", "EVT-082", "LAB-106", "SAFE-174", "OPS-141"]) assert(files.implementationManifest.items.find(item => item.id === id)?.verifierEvidence?.command === command, `${id} manifest verifier command drift`);
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.featureCoverageVerifier, "verifierEvidenceRows", "feature coverage verifier evidence summary");
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v370_rule_va_what_if_by_site.mjs", "script inventory");
});

check("SAFE-174 canonical bounded no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370RuleVaWhatIfBySiteJson(");
  const routeObserved = files.server.includes("/ops/api/site-operations/rule-va-what-if-by-site");
  const safe174BoundaryObserved = block.includes("BuildV370RuleVaWhatIfBySiteItems");
  const writePerformed = /\b(?:Write|Persist|AppendFile|UpdateSource|CreateVaRule|UpdateVaRule|AssignReviewer)[A-Za-z0-9_:]*\s*\(/.test(block);
  const mutationPerformed = writePerformed || /\b(?:Apply|AutomaticApply|SafeApply|SendClientNotice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const executionPerformed = /\b(?:Execute|RunSimulation|Probe|Contact|ProviderCall|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const automaticApplyPerformed = /\b(?:AutomaticApply|SafeApply|ApplyRule|ApplySource)[A-Za-z0-9_:]*\s*\(/.test(block);
  const clientNoticeSent = /\bSendClientNotice[A-Za-z0-9_:]*\s*\(/.test(block);
  const fieldSmokeExecuted = /\b(?:ExecuteFieldSmoke|ProbeEndpoint|ContactDevice)[A-Za-z0-9_:]*\s*\(/.test(block);
  const providerCallPerformed = /\b(?:ProviderCall|ProviderClient|Infer|HttpPost)[A-Za-z0-9_:]*\s*\(/.test(block);
  const rawMaterialExposed = /\\"(?:rawLocator|rawJson|rawProviderResponse|rawEndpoint|rawMaterial)\\":true/.test(block);
  const sourceUrlExposed = block.includes("\\\"sourceUrlIncluded\\\":true") || block.includes("\\\"sourceUrlExposed\\\":true");
  const credentialMaterialExposed = block.includes("\\\"credentialMaterialIncluded\\\":true") || block.includes("\\\"credentialMaterialExposed\\\":true");
  const debugMaterialExposed = block.includes("\\\"debugMaterialIncluded\\\":true") || block.includes("\\\"debugMaterialExposed\\\":true");
  const viewerClientExposureAdded = block.includes("\\\"viewerClientExposureAdded\\\":true");
  const mediaPathChanged = block.includes("\\\"rtspOrWebrtcMediaPathChanged\\\":true");
  assert(routeObserved && safe174BoundaryObserved && block.includes("media-server.ops.v370-rule-va-what-if-by-site.v1") && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-174 BuildV370RuleVaWhatIfBySiteItems must remain bounded no-execution no-write redacted and client/provider isolated");
});

const results = runChecks();
console.log("");
console.log("== v3.7.0 Rule/VA what-if by site summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.7.0 (13)");
console.log(`- route: ${route}`);
console.log("- scope: site-scoped Rule/VA what-if comparison");
console.log("- apply: what-if-only; no rule/EventRecord mutation");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

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
      console.log(`[fail] ${item.name}: ${error.message}`);
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing ${needle}`);
}

function extractBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert(start >= 0, `block start missing: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert(end >= 0, `block end missing after ${startNeedle}: ${endNeedle}`);
  return text.slice(start, end);
}
