#!/usr/bin/env node
// 파일 용도: 대형 generated fixture가 semantic JSON을 유지하면서 compact 직렬화되는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Generated fixture serialization contract

Usage:
  ./server.sh verify-generated-fixture-serialization-contract

Checks the shared compact serializer, all three producer call sites, JSON schema/cardinality,
single-line encoding, and bounded tracked sizes. This is not product execution evidence.
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
let serializer = null;
try {
  serializer = await import("./json_artifact_serialization_lib.mjs");
} catch {
  serializer = null;
}

check("shared serializer emits parse-equivalent compact JSON with one trailing newline", () => {
  assert(typeof serializer?.serializeCompactJsonArtifact === "function", "compact serializer export missing");
  const value = { alpha: [1, { beta: "line\nvalue" }], enabled: false };
  const output = serializer.serializeCompactJsonArtifact(value);
  assert(output === `${JSON.stringify(value)}\n`, "serializer output is not canonical compact JSON plus newline");
  assert(JSON.stringify(JSON.parse(output)) === JSON.stringify(value), "serializer changed parsed JSON semantics");
});

check("all large-fixture producers use the shared compact serializer", () => {
  const producers = [
    "scripts/internal/feature_implementation_manifest_lib.mjs",
    "scripts/internal/v390_ui_native_exact_cases_lib.mjs",
    "scripts/internal/verify_v390_review4_feature_semantic_source_audit.mjs",
  ];
  for (const file of producers) {
    const text = fs.readFileSync(path.join(rootDir, file), "utf8");
    assert(text.includes("serializeCompactJsonArtifact"), `${file}: shared serializer is not used`);
  }
});

check("tracked generated fixtures stay compact, bounded, and structurally complete", () => {
  const fixtures = [
    {
      file: "test/fixtures/project_feature_implementation_evidence.json",
      maxBytes: 20 * 1024 * 1024,
      schema: "media-server.feature-implementation-evidence.v2",
      count: (value) => value.items?.length,
      expectedCount: 986,
    },
    {
      file: "test/fixtures/v390_ui_native_exact_cases.json",
      maxBytes: 11 * 1024 * 1024,
      schema: "media-server.v390-ui-native-exact-cases.v2",
      count: (value) => value.cases?.length,
      expectedCount: 424,
    },
    {
      file: "test/fixtures/v390_review4_feature_semantic_source_audit.json",
      maxBytes: 9 * 1024 * 1024,
      schema: "media-server.v390-review4-feature-semantic-source-audit.v1",
      count: (value) => value.items?.length,
      expectedCount: 986,
    },
  ];
  for (const fixture of fixtures) {
    const absolute = path.join(rootDir, fixture.file);
    const bytes = fs.readFileSync(absolute, "utf8");
    const value = JSON.parse(bytes);
    assert(value.schema === fixture.schema, `${fixture.file}: schema drift`);
    assert(fixture.count(value) === fixture.expectedCount, `${fixture.file}: cardinality drift`);
    assert(Buffer.byteLength(bytes) < fixture.maxBytes, `${fixture.file}: compact size ceiling exceeded`);
    assert((bytes.match(/\n/g) || []).length === 1 && bytes.endsWith("\n"),
      `${fixture.file}: fixture is not single-line compact JSON`);
  }
});

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
console.log("\n== Generated fixture serialization contract summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) { checks.push({ name, fn }); }
function assert(condition, message) { if (!condition) throw new Error(message); }
