#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v3.4.0 Step 2 Continuity Drill Contract 구현, 문서, inventory 연결을 검증한다.
import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";

import { validateFeatureDocumentation } from "./documentation_contract_lib.mjs";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.4.0 Continuity Drill Contract verification

Usage:
  ./server.sh verify-v340-continuity-drill-contract

Checks:
  - /ops/api/source-registry/continuity-drill/contract exposes an Ops-only read-only recovery drill contract
  - the contract links v3.3 backup/recovery handoff inputs without writing SourceRegistry, PublishedView, EventRecord, or media paths
  - current feature definitions, contract identifiers, verification guide, and server dispatch are wired
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v340-continuity-drill-contract";
const schema = "media-server.ops.v340-continuity-drill-contract.v1";
const route = "/ops/api/source-registry/continuity-drill/contract";
const files = {
  server: readWebRtcHttpServerBundle(readText),
  documentationImplementation: JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json")),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  serverSh: readText("server.sh"),
};

const checks = [];

check("Ops server builds the v3.4 continuity drill contract", () => {
  assert(route === "/ops/api/source-registry/continuity-drill/contract", "OPS-092 canonical route drift");
  for (const snippet of [
    "struct OpsV340ContinuityDrillContractInput",
    "BuildV340ContinuityDrillContractInputs",
    "AppendV340ContinuityDrillContractInputJson",
    "OpsV340ContinuityDrillContractJson",
    schema,
    "recoveryDrillSchema",
    "v330HandoffInputs",
    "sourceRegistrySnapshot",
    "publishedViewRegistry",
    "sourceHealthSnapshot",
    "eventRecordAuditContext",
    "stagingRestoreValidation",
    "drillBoundaries",
  ]) {
    assertIncludes(files.server, snippet, "v340 continuity drill contract server model");
  }
});

check("continuity drill contract preserves read-only/no-write/no-secret/no-media-path-change boundaries", () => {
  const block = extractBlock(files.server, "std::string OpsV340ContinuityDrillContractJson", "struct OpsV340RecoveryCandidateContext");
  for (const snippet of [
    "opsOnly",
    "readOnly",
    "noWrite",
    "noSecret",
    "noMediaPathChange",
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "productionRestorePerformed",
    "automaticRecoveryPerformed",
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
  ]) {
    assertIncludes(block, snippet, "v340 continuity drill boundary flags");
  }
  for (const flag of [
    "sourceRegistryWritePerformed",
    "publishedViewWritePerformed",
    "eventRecordWritePerformed",
    "opsAuditWritePerformed",
    "productionRestorePerformed",
    "automaticRecoveryPerformed",
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
  ]) {
    const index = block.indexOf(flag);
    const nearby = block.slice(index, index + 128);
    assert(nearby.includes("false"), `boundary flag must be false: ${flag}`);
  }
  for (const forbidden of [
    "CreateSource(",
    "UpsertSource(",
    "DisableSource(",
    "CreateView(",
    "UpsertView(",
    "DisableView(",
    "AppendOpsAuditRecord(",
    "\"rtspUrl\"",
    "\"whepUrl\"",
    "\"httpUrl\"",
    "\"webrtcSourceId\"",
    "credentialRef",
    "password",
    "Authorization",
  ]) {
    assert(!block.includes(forbidden), `continuity drill contract must not expose or mutate restricted material: ${forbidden}`);
  }
});

check("Ops API exposes the continuity drill contract route as guarded no-store JSON", () => {
  const block = extractBlock(files.server, `request.path == "${route}"`, "if (request.path == \"/ops/api/source-registry/recovery-candidate-package\")");
  assertIncludes(block, route, "continuity drill contract route");
  assertIncludes(block, "request.method == \"GET\"", "continuity drill contract route");
  assertIncludes(block, "require_ops_principal()", "continuity drill contract route");
  assertIncludes(block, "OpsV340ContinuityDrillContractJson()", "continuity drill contract route");
  assertIncludes(block, "Cache-Control", "continuity drill contract route");
  assertIncludes(block, "no-store", "continuity drill contract route");
  assert(!block.includes("require_source_write_principal"), "continuity drill contract route must not require source writes");
});

check("현재 기능 정의·계약·검증 명령·dispatch 연결", () => {
  const featureIds = ["SAFE-125","OPS-092"];
  const currentDefinitions = files.featureInventory.split(/\r?\n/).filter(line => featureIds.includes(line.split("|")[1]?.trim())).join("\n");
  const errors = validateFeatureDocumentation({
    document: currentDefinitions, identifiers: ["/ops/api/source-registry/continuity-drill/contract"],
    command, script: "verify_v340_continuity_drill_contract.mjs", featureIds,
    inventory: files.featureInventory, implementation: files.documentationImplementation,
    verification: files.streamVerification, server: files.serverSh,
  });
  assert(errors.length === 0, errors.join("; "));
});



check("server entrypoint and inventory verifiers include v3.4 Step 2 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v340_continuity_drill_contract.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["SAFE-125", "OPS-092"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v340_continuity_drill_contract.mjs", "script inventory");
});

check("SAFE-125 canonical continuity drill contract boundary", () => {
  const contractBlock = extractCppFunctionBlock(files.server, "std::string OpsV340ContinuityDrillContractJson()");
  const continuityDrillContractRouteObserved = route === "/ops/api/source-registry/continuity-drill/contract";
  const safe125BoundaryObserved = continuityDrillContractRouteObserved && contractBlock.includes("BuildV340ContinuityDrillContractInputs()") && contractBlock.includes("media-server.ops.v340-continuity-drill-contract.v1") && contractBlock.includes("AppendV340ContinuityDrillContractInputJson");
  const persistencePerformed = /\b(?:Write|Persist|AppendFile|SavePlan)[A-Za-z0-9_:]*\s*\(/.test(contractBlock);
  const sourceOrEventWritePerformed = /\b(?:CreateSource|UpdateSource|DeleteSource|DispatchEventRecords)[A-Za-z0-9_:]*\s*\(/.test(contractBlock);
  const rawMaterialExposed = contractBlock.includes("\\\"rawJsonExposed\\\":true");
  const rawLocatorExposed = contractBlock.includes("\\\"rawLocatorExposed\\\":true");
  const sourceUrlExposed = contractBlock.includes("\\\"sourceUrlExposed\\\":true");
  const debugMaterialExposed = contractBlock.includes("\\\"debugMaterialExposed\\\":true");
  const credentialMaterialExposed = contractBlock.includes("\\\"credentialMaterialExposed\\\":true");
  const secretMaterialExposed = contractBlock.includes("\\\"secretMaterialExposed\\\":true");
  const automaticRecoveryPerformed = /\b(?:Restore|Recover|Execute)[A-Za-z0-9_:]*\s*\(/.test(contractBlock);
  const viewerClientExposureAdded = /AppendClient|ClientEventSummary|PublishedViewJson/.test(contractBlock);
  assert(safe125BoundaryObserved && (continuityDrillContractRouteObserved && contractBlock.includes("BuildV340ContinuityDrillContractInputs()") && contractBlock.includes("media-server.ops.v340-continuity-drill-contract.v1") && contractBlock.includes("AppendV340ContinuityDrillContractInputJson")) && persistencePerformed === false && sourceOrEventWritePerformed === false && rawMaterialExposed === false && rawLocatorExposed === false && sourceUrlExposed === false && debugMaterialExposed === false && credentialMaterialExposed === false && secretMaterialExposed === false && automaticRecoveryPerformed === false && viewerClientExposureAdded === false,
    "SAFE-125 continuity-drill-contract must remain Ops-only read-only/no-secret/no-media-path-change without recovery or client mutation");
});

const results = runChecks();
console.log("");
console.log("== v3.4.0 continuity drill contract summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.4.0 (2)");
console.log(`- route: ${route}`);
console.log("- boundaries: read-only, no-write, no-secret, no-media-path-change");
console.log("- recoveryCandidatePackage: not-run-by-this-command");
console.log("- stagingRestoreValidation: not-run-by-this-command");
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
