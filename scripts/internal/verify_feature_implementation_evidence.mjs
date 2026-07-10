#!/usr/bin/env node
// 파일 용도: 980개 feature ID의 exact implementation/UI/verifier manifest를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  EXPECTED_FEATURE_ROWS,
  IMPLEMENTATION_MANIFEST_PATH,
  generateImplementationManifest,
  loadImplementationManifest,
  parseFeatureRows,
  validateImplementationManifest,
  writeImplementationManifest,
} from "./feature_implementation_manifest_lib.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Feature implementation evidence verification

Usage:
  ./server.sh verify-feature-implementation-evidence [options]

Options:
  --refresh-manifest  Explicitly rebuild the reviewed 980-row manifest.
  --json-report PATH  Write the validation report.
  -h, --help          Show help.

The default command is read-only. --refresh-manifest is an explicit source update and
must be reviewed before commit. This verifier does not execute product tests.`);
}

assertKnownOptions(rawArgs, ["refresh-manifest", "json-report", "h", "help"]);
const args = parseArgs(rawArgs);
const inventoryText = fs.readFileSync(
  path.join(rootDir, "docs/project-feature-test-inventory.md"),
  "utf8",
);
const rows = parseFeatureRows(inventoryText);

if (args.refreshManifest) {
  const generated = generateImplementationManifest({ rootDir, inventoryText, rows });
  writeImplementationManifest(rootDir, generated);
  console.log(`[pass] refreshed ${IMPLEMENTATION_MANIFEST_PATH}`);
}

const manifest = loadImplementationManifest(rootDir);
const result = validateImplementationManifest({ rootDir, inventoryText, rows, manifest });
const negativeChecks = runNegativeFixtures({ rootDir, inventoryText, rows, manifest });

if (args.jsonReport) {
  const target = path.resolve(rootDir, args.jsonReport);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify({
    schema: "media-server.feature-implementation-evidence-validation.v1",
    executionEvidenceStatus: "not-execution-evidence",
    result,
    negativeChecks,
  }, null, 2)}\n`);
}

for (const error of result.errors) console.log(`[fail] ${error}`);
for (const check of negativeChecks) {
  console.log(`[${check.pass ? "pass" : "fail"}] negative fixture ${check.name}`);
}

console.log("");
console.log("== Feature implementation evidence summary ==");
console.log(`- expectedFeatureRows: ${EXPECTED_FEATURE_ROWS}`);
console.log(`- inventoryRows: ${result.summary.inventoryRows}`);
console.log(`- manifestRows: ${result.summary.manifestRows}`);
console.log(`- sourceEvidenceRows: ${result.summary.sourceEvidenceRows}`);
console.log(`- uiEvidenceRows: ${result.summary.uiEvidenceRows}`);
console.log(`- verifierEvidenceRows: ${result.summary.verifierEvidenceRows}`);
console.log(`- manualUiCaseRows: ${result.summary.manualUiCaseRows}`);
console.log(`- validationErrors: ${result.summary.errors}`);
console.log(`- negativeFixtures: ${negativeChecks.filter(check => check.pass).length}/${negativeChecks.length}`);
console.log("- executionEvidenceStatus: not-execution-evidence");

if (!result.ok || negativeChecks.some(check => !check.pass)) process.exit(1);

function runNegativeFixtures({ rootDir, inventoryText, rows, manifest }) {
  const cases = [
    {
      name: "missing-id",
      mutate(copy) { copy.items = copy.items.filter(item => item.id !== "UI-019"); },
      expect: "manifest missing feature ID UI-019",
    },
    {
      name: "duplicate-id",
      mutate(copy) { copy.items[1].id = copy.items[0].id; },
      expect: "manifest contains duplicate feature IDs",
    },
    {
      name: "wrong-section-prefix",
      mutate(copy) { copy.items[0].section = "J"; },
      expect: "section mismatch",
    },
    {
      name: "missing-source-file",
      mutate(copy) { copy.items[0].sourceEvidence.file = "src/missing.cpp"; },
      expect: "file is not tracked",
    },
    {
      name: "missing-source-anchor",
      mutate(copy) { copy.items[0].sourceEvidence.anchor = "__missing_feature_anchor__"; },
      expect: "anchor missing",
    },
    {
      name: "missing-ui-control-anchor",
      mutate(copy) {
        const item = copy.items.find(entry => entry.uiEvidence);
        item.uiEvidence.anchor = "__missing_ui_control__";
      },
      expect: "anchor missing",
    },
    {
      name: "missing-ui-screen-route",
      mutate(copy) {
        const item = copy.items.find(entry => entry.uiEvidence);
        item.uiEvidence.screenRoute = "/missing-product-screen";
      },
      expect: "UI screenRoute missing from product source",
    },
    {
      name: "unknown-verifier-command",
      mutate(copy) {
        const item = copy.items.find(entry => entry.verifierEvidence?.command);
        item.verifierEvidence.command = "verify-does-not-exist";
      },
      expect: "verifier command not dispatched",
    },
    {
      name: "missing-verifier-assertion",
      mutate(copy) { copy.items[0].verifierEvidence.anchor = "__missing_assertion__"; },
      expect: "anchor missing",
    },
    {
      name: "legacy-longrun-command",
      mutate(copy) {
        const item = copy.items.find(entry => entry.longrunEvidence?.soak30);
        item.longrunEvidence.soak30 = "./server.sh verify-predev --soak-minutes 30";
      },
      expect: "30분 mapping must use the v3.9 canonical runner",
    },
    {
      name: "inventory-hash-drift",
      mutate(copy) { copy.inventorySha256 = "0".repeat(64); },
      expect: "inventorySha256 drift",
    },
  ];
  return cases.map(testCase => {
    const copy = structuredClone(manifest);
    testCase.mutate(copy);
    const result = validateImplementationManifest({ rootDir, inventoryText, rows, manifest: copy });
    return {
      name: testCase.name,
      pass: !result.ok && result.errors.some(error => error.includes(testCase.expect)),
    };
  });
}

function parseArgs(argsList) {
  const parsed = { refreshManifest: false, jsonReport: "" };
  for (let index = 0; index < argsList.length; index += 1) {
    const token = argsList[index];
    if (token === "--refresh-manifest") parsed.refreshManifest = true;
    else if (token.startsWith("--json-report=")) parsed.jsonReport = token.slice("--json-report=".length);
    else if (token === "--json-report") parsed.jsonReport = argsList[++index];
  }
  return parsed;
}
