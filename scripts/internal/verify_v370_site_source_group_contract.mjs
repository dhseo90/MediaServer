#!/usr/bin/env node
// 파일 용도: v3.7.0 Step 2 Site / Source Group Contract 구현, 문서, inventory 연결을 검증한다.

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
  printUsageAndExit(`v3.7.0 Site / Source Group Contract verification

Usage:
  ./server.sh verify-v370-site-source-group-contract

Checks:
  - /ops/api/site-operations/source-group-contract exposes the Ops-only site/source group contract
  - site, sourceGroup, zone, and viewGroup read model fields are defined
  - SourceRegistry/PublishedView writes, client exposure, event/schema/media changes are not introduced
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v370-site-source-group-contract";
const schema = "media-server.ops.v370-site-source-group-contract.v1";
const route = "/ops/api/site-operations/source-group-contract";
const files = loadFiles();
const checks = [];

check("Ops server builds the v3.7 site/source group contract model", () => {
  for (const snippet of [
    "struct OpsV370SiteSourceGroupContractItem",
    "BuildV370SiteSourceGroupContractItems",
    "AppendV370SiteSourceGroupContractItemJson",
    "OpsV370SiteSourceGroupContractJson",
    schema,
    "siteSourceGroupContract",
    "siteId",
    "sourceGroup",
    "zone",
    "viewGroup",
    "noAutoWriteBoundary",
    "readModelOnly",
  ]) {
    assertIncludes(files.server, snippet, "v370 site/source group contract server model");
  }
});

check("site/source group contract preserves no-write and no-exposure boundaries", () => {
  const block = extractBlock(files.server, "std::string OpsV370SiteSourceGroupContractJson", "struct OpsV370SiteAwareSourceRegistryProjectionItem");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "siteSourceGroupContractOnly",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) assertIncludes(block, snippet, "v370 site/source group contract boundary flags");
  for (const flag of [
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "viewerClientExposureAdded",
    "rawLocatorExposedToClient",
    "credentialMaterialExposed",
    "eventRecordSchemaChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
    "ruleProfilePayloadChanged",
  ]) assertFlagFalse(block, flag);
});

check("Ops API exposes the contract route as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "site/source group contract route");
  assertIncludes(block, "request.method == \"GET\"", "site/source group contract route");
  assertIncludes(block, "require_ops_principal()", "site/source group contract route");
  assertIncludes(block, "OpsV370SiteSourceGroupContractJson(", "site/source group contract route");
  assertIncludes(block, "Cache-Control", "site/source group contract route");
  assertIncludes(block, "no-store", "site/source group contract route");
  assert(!block.includes("require_source_write_principal"), "site/source group contract route must not require source writes");
});

check("docs, inventory, and dispatch map v3.7 Step 2", () => {
  assertStepDocs("2", "Site / Source Group Contract", "SRC-054", "SAFE-163", "OPS-130");
  for (const id of ["SRC-054", "SAFE-163", "OPS-130"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v370_site_source_group_contract.mjs", "server.sh dispatch");
  assertIncludes(files.featureCoverageVerifier, "validateImplementationManifest", "feature coverage manifest validation");
  assertIncludes(files.scriptInventory, "verify_v370_site_source_group_contract.mjs", "script inventory");
});

check("SAFE-163 canonical bounded no-execution boundary", () => {
  const block = extractCppFunctionBlock(files.server, "std::string OpsV370SiteSourceGroupContractJson(");
  const routeObserved = files.server.includes("/ops/api/site-operations/source-group-contract");
  const safe163BoundaryObserved = block.includes("BuildV370SiteSourceGroupContractItems") && block.includes("siteSourceGroupContractOnly");
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
  assert(routeObserved && safe163BoundaryObserved && writePerformed === false && mutationPerformed === false && executionPerformed === false && automaticApplyPerformed === false && clientNoticeSent === false && fieldSmokeExecuted === false && providerCallPerformed === false && rawMaterialExposed === false && sourceUrlExposed === false && credentialMaterialExposed === false && debugMaterialExposed === false && viewerClientExposureAdded === false && mediaPathChanged === false,
    "SAFE-163 siteSourceGroupContractOnly must remain bounded no-execution no-write redacted and client/provider isolated");
});

finish("== v3.7.0 site/source group contract summary ==", { schema, step: "v3.7.0 (2)", route });

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
  assertIncludes(files.releaseRecords, "V370 Site / Source Group Contract", "release records v3.7 Step 2");
  assertIncludes(files.releaseRecords, `\`./server.sh ${command}\``, "release records v3.7 Step 2");
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
  console.log("- writes: no source/view/EventRecord/client/media mutation performed");
  console.log("- uiFulltest: not-run-by-this-command");
  console.log("- longrun30Or120: not-run-by-this-command");
  console.log(`- pass: ${results.pass}`);
  console.log(`- fail: ${results.fail}`);
  if (results.fail > 0) process.exit(1);
}

function runChecks() {
  let pass = 0, fail = 0;
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

function check(name, fn) { checks.push({ name, fn }); }
function readText(relativePath) { return fs.readFileSync(path.join(rootDir, relativePath), "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function assertIncludes(text, snippet, label) { assert(text.includes(snippet), `${label} missing snippet: ${snippet}`); }
