#!/usr/bin/env node
// 파일 용도: v3.9.0 Step 11 ONVIF credential/provider status summary 구현, 문서, inventory 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 ONVIF credential/provider status summary verification

Usage:
  ./server.sh verify-v390-onvif-credential-provider-status

Checks:
  - /ops/api/onvif/credential-provider-status exposes an Ops-only sanitized provider readiness summary
  - the summary records the Step 11 decision: primary provider none, fixture fallback only, persistent/external secret stores deferred
  - credential reference values and secret material are never exposed in route, UI, docs, or artifact wording
  - docs, inventory, release records, coverage verifier, script inventory, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-onvif-credential-provider-status";
const targetScript = "verify_v390_onvif_credential_provider_status.mjs";
const schema = "media-server.ops.v390-onvif-credential-provider-status.v1";
const route = "/ops/api/onvif/credential-provider-status";
const featureIds = ["UI-108", "SRC-065", "SAFE-203", "OPS-170"];
const files = loadFiles();
const checks = [];

check("Ops server builds the v3.9 ONVIF credential provider status summary", () => {
  for (const snippet of [
    "OpsV390OnvifCredentialProviderStatusSummaryJson",
    schema,
    route,
    "providerReadiness",
    "primarySelection",
    "fallbackSelection",
    "excludedProviders",
    "none",
    "in-memory-fixture",
    "local-encrypted",
    "external-secret-manager",
    "defer-product-persistent-store",
    "reference-status-only",
    "sanitizedCredentialProviderStatusSummary",
  ]) {
    assertIncludes(files.server, snippet, "v390 ONVIF credential provider status server model");
  }
});

check("ONVIF credential provider status preserves secret, reference, schema, and media boundaries", () => {
  const block = extractBlock(
    files.server,
    "std::string OpsV390OnvifCredentialProviderStatusSummaryJson",
    "struct OpsV380ActionCapabilityContractItem",
  );
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "statusSummaryOnly",
    "credentialLookupPerformed",
    "credentialReferenceValueIncluded",
    "credentialMaterialExposed",
    "secretMaterialStored",
    "productPersistentSecretStoreEnabled",
    "externalSecretManagerEnabled",
    "sourceRegistrySecretFields",
    "publishedViewSecretFields",
    "clientViewerExposureAdded",
    "authRoleScopeChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertIncludes(block, snippet, "v390 ONVIF credential provider status boundaries");
  }
  for (const flag of [
    "credentialLookupPerformed",
    "credentialReferenceValueIncluded",
    "credentialMaterialExposed",
    "secretMaterialStored",
    "productPersistentSecretStoreEnabled",
    "externalSecretManagerEnabled",
    "sourceRegistrySecretFields",
    "publishedViewSecretFields",
    "clientViewerExposureAdded",
    "authRoleScopeChanged",
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ]) {
    assertFlagFalse(block, flag);
  }
  for (const forbidden of [
    "Lookup(",
    "UpsertHttpBasic",
    "credentialRef\":\"",
    "password",
    "Authorization",
    "SOAP-ENV",
    "\"rtspUrl\"",
    "\"whepUrl\"",
  ]) {
    assert(!block.includes(forbidden), `status summary must not lookup, store, expose, or include restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the status summary as guarded no-store JSON", () => {
  const block = extractRouteBlock(files.server, route);
  assertIncludes(block, route, "v390 ONVIF credential provider status route");
  assertIncludes(block, "request.method == \"GET\"", "v390 ONVIF credential provider status route");
  assertIncludes(block, "require_ops_principal()", "v390 ONVIF credential provider status route");
  assertIncludes(block, "OpsV390OnvifCredentialProviderStatusSummaryJson()", "v390 ONVIF credential provider status route");
  assertIncludes(block, "Cache-Control", "v390 ONVIF credential provider status route");
  assertIncludes(block, "no-store", "v390 ONVIF credential provider status route");
  assert(!block.includes("require_source_write_principal"), "status summary is read-only and must not require source write principal");
});

check("Ops sources UI renders the sanitized provider summary without secret/reference values", () => {
  for (const snippet of [
    route,
    "loadOnvifCredentialProviderStatus",
    "renderOnvifCredentialProviderStatus",
    "providerReadiness",
    "primarySelection",
    "referenceValueExposed",
    "credentialMaterialExposed",
    "persistent store deferred",
  ]) {
    assertIncludes(files.opsSourcesScript, snippet, "v390 ONVIF provider status UI script");
  }
});

check("roadmap, stream verification, inventory, and release records map v3.9 Step 11", () => {
  for (const snippet of [
    "| 11 | v3.9.0 (11) ONVIF credential/provider status summary | P1 | 완료 |",
    "## v3.9.0 Product Completion 개발 기록",
    "V390-CAND-001",
    route,
    "OpsV390OnvifCredentialProviderStatusSummaryJson",
    `\`./server.sh ${command}\``,
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.9 Step 11");
  }
  for (const snippet of [
    `| v3.9.0 (11) | \`./server.sh ${command}\` | ONVIF credential/provider status summary.`,
    "primary provider `none`",
    "fallback `in-memory-fixture`",
    "secret/reference value 비노출",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.9 Step 11");
  }
  for (const snippet of [
    `v3.9.0 (11) ONVIF credential/provider status summary | \`UI-108\`, \`SRC-065\`, \`SAFE-203\`, \`OPS-170\` | \`${command}\`, \`verify-ops-client-ui\``,
    "UI-108 | V390 Step 11 ONVIF credential/provider status UI",
    "SRC-065 | V390 Step 11 ONVIF provider readiness status summary",
    "SAFE-203 | V390 Step 11 ONVIF credential provider redaction boundary",
    "OPS-170 | V390 Step 11 ONVIF provider status gate",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.9 Step 11");
  }
  for (const snippet of [
    "V390 ONVIF Credential Provider Status Summary",
    `\`./server.sh ${command}\``,
    "v390 Step 11 RED ONVIF credential/provider status gate",
    "v390 Step 11 ONVIF credential/provider status final",
    "v390 Step 11 UI 풀테스트",
    "v390 Step 11 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.9 Step 11");
  }
});

check("v3.9 feature completion inventory closes V390-CAND-001 with Step 11 evidence", () => {
  const row = markdownTableRow(files.v390Inventory, "V390-CAND-001");
  for (const snippet of [
    "/ops/api/onvif/credential-provider-status",
    "/ops/sources",
    "Ops-only sanitized credential provider status summary exists",
    "Closed with `sanitized-credential-provider-status-summary`",
    "primary provider `none`",
    "fallback `in-memory-fixture`",
    "persistent/external stores deferred",
    `\`${command}\` proves route/UI/artifact docs`,
    "provider readiness/redaction state",
    "no secret/reference leakage",
    "required | not-run | not-run | conditional | closed-with-evidence",
    "UI-108",
    "SRC-065",
    "SAFE-203",
    "OPS-170",
    "Credential lookup, source/view write, persistent secret store, external secret manager, UI fulltest, 30-minute/120-minute longrun, and field credential success were not run",
  ]) {
    assertIncludes(row, snippet, "v390 feature completion inventory V390-CAND-001 row");
  }
  assert(!row.includes("candidate-development"), "V390-CAND-001 row must not remain candidate-development");
  assert(!row.includes("Decide whether"), "V390-CAND-001 row must not remain an undecided candidate");
});

check("v3.9 feature completion inventory separates original review candidates from current active candidates", () => {
  const section = extractBlock(files.v390Inventory, "## User Review Output", "## Required Closeout Output");
  assertIncludes(section, "Original candidate development review list:", "v390 user review output");
  assertIncludes(section, "Current active candidate development list: `없음`", "v390 user review output");
  assertIncludes(section, "Closed candidate development list:", "v390 user review output");
  const activeLine = lineStartingWith(section, "Current active candidate development list:");
  assert(!activeLine.includes("V390-CAND-001"), "V390-CAND-001 must not be listed as an active candidate");
  const closedLine = lineStartingWith(section, "Closed candidate development list:");
  assertIncludes(closedLine, "V390-CAND-001", "closed candidate list");
  assertIncludes(closedLine, "V390-CAND-010", "closed candidate list");
});

check("server entrypoint and inventory verifiers include v3.9 Step 11 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, targetScript, "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of featureIds) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, targetScript, "script inventory");
});

finish("== v3.9.0 ONVIF credential/provider status summary ==", {
  schema,
  step: "v3.9.0 (11)",
  route,
});

function loadFiles() {
  return {
    server: readText("src/ingress/webrtc_http_server.cpp"),
    opsSourcesScript: readText("src/ingress/product_ui_ops_sources_script.cpp"),
    backlog: readText("docs/development-backlog.md"),
    streamVerification: readText("docs/stream-verification.md"),
    v390Inventory: readText("docs/v390-feature-completion-inventory.md"),
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
  const next = text.indexOf("\n                        if (request.path", start + 1);
  return text.slice(start, next >= 0 ? next : start + 2400);
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
  assert(text.slice(index, index + 160).includes("false"), `boundary flag must be false: ${flag}`);
}

function markdownTableRow(text, firstCell) {
  const prefix = `| ${firstCell} |`;
  const row = text.split(/\r?\n/).find(line => line.startsWith(prefix));
  assert(row, `missing markdown table row: ${firstCell}`);
  return row;
}

function lineStartingWith(text, prefix) {
  const line = text.split(/\r?\n/).find(item => item.startsWith(prefix));
  assert(line, `missing line starting with: ${prefix}`);
  return line;
}

function finish(title, summary) {
  const results = runChecks();
  console.log("");
  console.log(title);
  for (const [key, value] of Object.entries(summary)) {
    console.log(`- ${key}: ${value}`);
  }
  console.log("- decision: primary provider none; fallback in-memory-fixture; persistent/external secret store deferred");
  console.log("- writes: no credential lookup, source/view write, client/viewer exposure, schema, or media mutation");
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

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
