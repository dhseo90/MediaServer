#!/usr/bin/env node
// 파일 용도: v3.7.0 Step 4 Site Health Rollup 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.7.0 Site Health Rollup verification

Usage:
  ./server.sh verify-v370-site-health-rollup

Checks:
  - /ops/api/site-operations/health-rollup groups source health by site/source group
  - offline, degraded, recovering, and field-needed rollup states are represented
  - health rollup remains Ops-only and read-only
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v370-site-health-rollup";
const schema = "media-server.ops.v370-site-health-rollup.v1";
const route = "/ops/api/site-operations/health-rollup";
const files = loadFiles();
const checks = [];

check("Ops server builds the v3.7 site health rollup model", () => {
  for (const snippet of [
    "struct OpsV370SiteHealthRollupItem",
    "struct OpsV370SiteHealthRollupSummary",
    "BuildV370SiteHealthRollupItems",
    "BuildV370SiteHealthRollupSummary",
    "AppendV370SiteHealthRollupItemJson",
    "OpsV370SiteHealthRollupJson",
    schema,
    "siteHealthRollupSummary",
    "siteHealthRollup",
    "offline",
    "degraded",
    "recovering",
    "field-needed",
  ]) assertIncludes(files.server, snippet, "v370 site health rollup server model");
});

check("site health rollup derives from source health snapshot and site projection", () => {
  const block = extractBlock(files.server, "struct OpsV370SiteHealthRollupItem", "std::string OpsV370SiteHealthRollupJson");
  for (const snippet of [
    "OpsSourceHealthSnapshot",
    "OpsSourceHealthItem",
    "BuildV370SiteAwareSourceRegistryProjectionItems",
    "V370HealthForSource",
    "V370SiteHealthRollupState",
    "fieldNeededSourceCount",
    "recoveringSourceCount",
    "degradedSourceCount",
    "offlineSourceCount",
  ]) assertIncludes(block, snippet, "v370 site health derivation");
});

check("site health rollup preserves read-only boundaries", () => {
  const block = extractBlock(files.server, "std::string OpsV370SiteHealthRollupJson", "void AppendOpsSourceHealthAuditChanges");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "rollupOnly",
    "sourceHealthPersisted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "automaticRecoveryPerformed",
    "fieldSmokeExecuted",
    "viewerClientExposureAdded",
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) assertIncludes(block, snippet, "v370 site health boundary flags");
  for (const flag of [
    "sourceHealthPersisted",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "automaticRecoveryPerformed",
    "fieldSmokeExecuted",
    "viewerClientExposureAdded",
    "rawLocatorIncluded",
    "credentialMaterialIncluded",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) assertFlagFalse(block, flag);
});

check("Ops API exposes the health rollup route as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "site health rollup route");
  assertIncludes(block, "request.method == \"GET\"", "site health rollup route");
  assertIncludes(block, "require_ops_principal()", "site health rollup route");
  assertIncludes(block, "BuildOpsSourceHealthSnapshot", "site health rollup route");
  assertIncludes(block, "OpsV370SiteHealthRollupJson(", "site health rollup route");
  assertIncludes(block, "Cache-Control", "site health rollup route");
  assertIncludes(block, "no-store", "site health rollup route");
});

check("docs, inventory, and dispatch map v3.7 Step 4", () => {
  assertStepDocs("4", "Site Health Rollup", "SRC-056", "SAFE-165", "OPS-132");
  for (const id of ["SRC-056", "SAFE-165", "OPS-132"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v370_site_health_rollup.mjs", "server.sh dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  assertIncludes(files.scriptInventory, "verify_v370_site_health_rollup.mjs", "script inventory");
});

finish("== v3.7.0 site health rollup summary ==", { schema, step: "v3.7.0 (4)", route });

function assertStepDocs(step, title, ...ids) {
  for (const snippet of [
    `| ${step} | v3.7.0 (${step}) ${title} | P0 | 완료 |`,
    `## v3.7.0 Step ${step} 개발 기록`,
    route,
    `\`./server.sh ${command}\``,
  ]) assertIncludes(files.backlog, snippet, `backlog v3.7 Step ${step}`);
  assertIncludes(files.streamVerification, `| v3.7.0 (${step}) | \`./server.sh ${command}\` | ${title}.`, `stream verification v3.7 Step ${step}`);
  assertIncludes(files.featureInventory, `v3.7.0 (${step}) ${title}`, `feature inventory v3.7 Step ${step}`);
  for (const id of ids) assertIncludes(files.featureInventory, `\`${id}\``, `feature inventory ${id}`);
  assertIncludes(files.releaseRecords, "V370 Site Health Rollup", "release records v3.7 Step 4");
  assertIncludes(files.releaseRecords, `\`./server.sh ${command}\``, "release records v3.7 Step 4");
}

function loadFiles() {
  return {
    server: readText("src/ingress/webrtc_http_server.cpp"),
    backlog: readText("docs/development-backlog.md"),
    streamVerification: readText("docs/stream-verification.md"),
    featureInventory: readText("docs/project-feature-test-inventory.md"),
    featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
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
  assert(text.slice(index, index + 128).includes("false"), `boundary flag must be false: ${flag}`);
}
function finish(title, summary) {
  const results = runChecks();
  console.log("");
  console.log(title);
  for (const [key, value] of Object.entries(summary)) console.log(`- ${key}: ${value}`);
  console.log("- writes: no source/view/health/client/media mutation performed");
  console.log("- uiFulltest: not-run-by-this-command");
  console.log("- longrun30Or120: not-run-by-this-command");
  console.log(`- pass: ${results.pass}`);
  console.log(`- fail: ${results.fail}`);
  if (results.fail > 0) process.exit(1);
}
function runChecks() {
  let pass = 0, fail = 0;
  for (const item of checks) {
    try { item.fn(); pass += 1; console.log(`[pass] ${item.name}`); }
    catch (error) { fail += 1; console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  return { pass, fail };
}
function check(name, fn) { checks.push({ name, fn }); }
function readText(relativePath) { return fs.readFileSync(path.join(rootDir, relativePath), "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function assertIncludes(text, snippet, label) { assert(text.includes(snippet), `${label} missing snippet: ${snippet}`); }
