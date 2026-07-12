#!/usr/bin/env node
// 파일 용도: V390-REVIEW2-24 exact 424 native 실행 manifest를 생성 또는 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { refreshCanonicalCaseManifest, sha256File } from "./ui_fulltest_evidence_policy_v4_lib.mjs";
import { buildNativeExactManifest, validateNativeExactManifest } from "./v390_ui_native_exact_cases_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 exact 424 native UI case manifest

Usage:
  ./server.sh verify-v390-ui-native-exact-cases [--update-manifest] [--update-canonical-binding]

Default mode validates the checked-in manifest. --update-manifest mechanically regenerates it
from the canonical Policy v4 binding and reviewed semantic implementation evidence.
--update-canonical-binding first refreshes the canonical implementation hash and exact
route/control bindings, then regenerates the native manifest.
This command does not execute the actual 424-case browser suite.
`);
}
assertKnownOptions(rawArgs, ["update-manifest", "update-canonical-binding", "h", "help"]);

const canonicalPath = path.join(rootDir, "test/fixtures/ui_fulltest_case_manifest_policy_v4.json");
const implementationPath = path.join(rootDir, "test/fixtures/project_feature_implementation_evidence.json");
const manifestPath = path.join(rootDir, "test/fixtures/v390_ui_native_exact_cases.json");
let canonical = readJson(canonicalPath);
const implementation = readJson(implementationPath);
if (rawArgs.includes("--update-canonical-binding")) {
  canonical = refreshCanonicalCaseManifest({
    canonical,
    implementation,
    implementationSha256: sha256File(implementationPath),
  });
  fs.writeFileSync(canonicalPath, `${JSON.stringify(canonical, null, 2)}\n`, "utf8");
}
const generated = buildNativeExactManifest({ canonical, implementation });

if (rawArgs.includes("--update-manifest") || rawArgs.includes("--update-canonical-binding")) {
  fs.writeFileSync(manifestPath, `${JSON.stringify(generated, null, 2)}\n`, "utf8");
}

assert(fs.existsSync(manifestPath), `exact native manifest missing: ${manifestPath}`);
const manifest = readJson(manifestPath);
const result = validateNativeExactManifest({ manifest, canonical, implementation });

console.log("");
console.log("== v3.9.0 exact native UI case manifest summary ==");
console.log(`- schema: ${manifest.schema}`);
console.log(`- caseCount: ${result.caseCount}`);
console.log(`- positiveNative: ${result.positiveNative}`);
console.log(`- negativeRoute: ${result.negativeRoute}`);
console.log(`- unsupported: ${result.unsupported}`);
console.log(`- manifest: ${manifestPath}`);
console.log("- actualBrowserExecution: not-run-by-this-command");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
