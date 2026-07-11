#!/usr/bin/env node
// 파일 용도: 986행 semantic implementation closure의 false-positive negative contract를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { parseFeatureRows } from "./feature_implementation_manifest_lib.mjs";
import {
  runSemanticClosureContract,
  summarizeSemanticClosure,
} from "./feature_semantic_evidence_lib.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Feature semantic implementation closure contract

Usage:
  ./server.sh verify-feature-semantic-closure-contract

Checks:
  - all 986 rows are reviewer-approved semantic closures
  - UI-002 maps /setup to its exact handler rather than /password
  - wrong handler, unrelated same-file anchor, route/action/state drift,
    generic anchor, ID-only assertion, and unapproved review fixtures fail
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const inventoryText = fs.readFileSync(
  path.join(rootDir, "docs/project-feature-test-inventory.md"),
  "utf8",
);
const rows = parseFeatureRows(inventoryText);
const manifest = JSON.parse(fs.readFileSync(
  path.join(rootDir, "test/fixtures/project_feature_implementation_evidence.json"),
  "utf8",
));

const summary = summarizeSemanticClosure({ rows, manifest });
const cases = runSemanticClosureContract({ rootDir, inventoryText, rows, manifest });
for (const testCase of cases) {
  console.log(`[${testCase.pass ? "pass" : "fail"}] ${testCase.name}${testCase.detail ? `: ${testCase.detail}` : ""}`);
}

console.log("");
console.log("== Feature semantic closure contract summary ==");
console.log(`- inventoryRows: ${summary.inventoryRows}`);
console.log(`- semanticReviewedRows: ${summary.semanticReviewedRows}`);
console.log(`- uniqueSemanticDigests: ${summary.uniqueSemanticDigests}`);
console.log(`- pass: ${cases.filter(item => item.pass).length}`);
console.log(`- fail: ${cases.filter(item => !item.pass).length}`);
if (cases.some(item => !item.pass)) process.exit(1);
