#!/usr/bin/env node
// 파일 용도: v4.0.0 로컬 운영 정책 freeze(3.9 defer 5개 비구현 유지, field smoke 조건부 미실행)를 검증한다.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v4.0.0 local operations policy freeze verification

Usage:
  ./server.sh verify-v400-local-ops-policy-freeze

Checks:
  - v3.9 deferred 5 items remain unimplemented write paths in 4.0
  - existing v390 deferral/signoff commands still dispatch and are not edited
  - field smoke stays separate conditional-not-run
  - inventory, stream-verification, records, fixture, and server.sh dispatch are wired

Not run by this command:
  - action write, persistent credential store, production restore, VLM call, Re-ID promotion
  - UI fulltest
  - 30/120 minute longrun
  - published metadata verification
  - tag, push, GitHub Release
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v400-local-ops-policy-freeze";
const targetScript = "verify_v400_local_ops_policy_freeze.mjs";
const fixturePath = "test/fixtures/v400_local_ops_policy_freeze.json";
const expectedIds = [
  "action-execution",
  "persistent-credential-store",
  "production-restore",
  "external-vlm-provider-call",
  "model-backed-reid-session",
];

const files = {
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  serverSh: readText("server.sh"),
};
const fixture = JSON.parse(readText(fixturePath));
const signoff = JSON.parse(readText(fixture.inheritedSignoff.fixture));
const checks = [];

check("freeze fixture locks the five deferred items as 4.0 unimplemented policy", () => {
  assert(fixture.schema === "media-server.v400-local-ops-policy-freeze.v1", "fixture schema mismatch");
  assert(fixture.decisionId === "V400-LOCAL-OPS-POLICY-FREEZE-04", "fixture decisionId mismatch");
  assert(fixture.sourceRelease === "v4.0.0", "fixture sourceRelease mismatch");
  assert(fixture.latestPublished === "v3.9.1", "fixture latestPublished mismatch");
  assert(fixture.status === "policy-frozen", "fixture status mismatch");
  assert(fixture.implementationStatus === "not-implemented-write-paths",
    "fixture must not claim write-path implementation");
  assertEqualList(fixture.frozenDecisions.map((item) => item.id), expectedIds, "frozenDecisions.id");
  assert(fixture.fieldSmoke.status === "conditional-not-run", "field smoke must stay conditional-not-run");
  assert(fixture.fieldSmoke.includedInDeferredDecisionSet === false,
    "field smoke must stay outside the exact 5");
  assert(fixture.inheritedSignoff.editPolicy === "reuse-do-not-edit", "signoff editPolicy drifted");
  assert(fixture.inheritedFeatureIds.includes("OPS-181"), "missing inherited OPS-181");
  assert(fixture.inheritedFeatureIds.includes("SAFE-214"), "missing inherited SAFE-214");
  for (const snippet of fixture.notEvidence) {
    assert(typeof snippet === "string" && snippet.length > 0, "empty notEvidence item");
  }
});

check("inherited v390 signoff fixture stays unmodified and still records the exact five", () => {
  assert(sha256File(fixture.inheritedSignoff.fixture) === fixture.inheritedSignoff.sha256,
    `${fixture.inheritedSignoff.fixture} hash drifted; reuse, do not edit`);
  assert(signoff.schema === "media-server.v390-deferred-product-owner-signoff.v3",
    "inherited signoff schema drifted");
  const byId = new Map((signoff.decisions || []).map((item) => [item.id, item]));
  assertEqualList([...byId.keys()], expectedIds, "inherited signoff decision ids");
  for (const frozen of fixture.frozenDecisions) {
    const actual = byId.get(frozen.id);
    assert(actual, `inherited signoff missing ${frozen.id}`);
    assert(actual.implementationStatus === frozen.implementationStatus,
      `${frozen.id} implementationStatus drifted`);
    assert(actual.capabilityStatus?.[frozen.writeStatusField] === frozen.writeStatus,
      `${frozen.id} ${frozen.writeStatusField} drifted from ${frozen.writeStatus}`);
    assert(actual.fieldPassClaimed === false, `${frozen.id} claimed field PASS`);
    assert(actual.releasePassClaimed === false, `${frozen.id} claimed release PASS`);
    assert(actual.uiFulltestPassClaimed === false, `${frozen.id} claimed UI PASS`);
    assert(actual.longrunPassClaimed === false, `${frozen.id} claimed longrun PASS`);
    assert(actual.evidence?.method === frozen.method, `${frozen.id} method drifted`);
    assert(actual.evidence?.route === frozen.route, `${frozen.id} route drifted`);
  }
  assert(signoff.externalFieldSmoke?.status === "conditional-not-run",
    "inherited field smoke status drifted");
  assert(signoff.externalFieldSmoke?.includedInDeferredDecisionSet === false,
    "inherited field smoke must stay outside the exact 5");
});

check("field-smoke closure fixture stays unmodified and conditional-not-run", () => {
  assert(sha256File(fixture.fieldSmoke.fixture) === fixture.fieldSmoke.sha256,
    `${fixture.fieldSmoke.fixture} hash drifted; reuse, do not edit`);
  const fieldSmoke = JSON.parse(readText(fixture.fieldSmoke.fixture));
  assert(fieldSmoke.executionStatus === "conditional-not-run",
    "field-smoke fixture executionStatus drifted");
  assert(fieldSmoke.fieldPassClaimed === false, "field-smoke fixture claimed field PASS");
  assert(fieldSmoke.releasePassClaimed === false, "field-smoke fixture claimed release PASS");
});

check("product write paths still emit the unimplemented false tokens", () => {
  for (const frozen of fixture.frozenDecisions) {
    const source = readText(frozen.sourceFile);
    for (const snippet of frozen.requiredSnippets) {
      assert(source.includes(snippet), `${frozen.sourceFile} missing ${snippet}`);
    }
  }
});

check("inherited v390 deferral/signoff commands still dispatch and this command is wired", () => {
  const inherited = [
    fixture.inheritedSignoff.command,
    fixture.fieldSmoke.command,
    ...fixture.frozenDecisions.map((item) => item.inheritedCommand),
  ];
  for (const name of inherited) {
    assertIncludes(files.serverSh, name, "server.sh inherited dispatch");
  }
  assertIncludes(files.serverSh, command, "server.sh");
  assertIncludes(files.serverSh, targetScript, "server.sh");
  assertIncludes(files.serverSh, fixture.inheritedSignoff.script.replace("scripts/internal/", ""),
    "server.sh inherited signoff script");
});

check("backlog records v4.0.0 (4) freeze complete and keeps (5) not implemented", () => {
  for (const snippet of [
    "### v4.0.0 로컬 운영 정책 freeze",
    "정책 상태: `policy-frozen`",
    "구현 상태: `not-implemented-write-paths`",
    "action-execution",
    "persistent-credential-store",
    "production-restore",
    "external-vlm-provider-call",
    "model-backed-reid-session",
    "conditional-not-run",
    "`scripts/internal/verify_v400_local_ops_policy_freeze.mjs`",
    "`./server.sh verify-v400-local-ops-policy-freeze`",
    fixturePath,
    "| 4 | v4.0.0 (4) 로컬 운영 정책 freeze | P0 | 완료 |",
    "| 5 | v4.0.0 (5) Incident OS 정책화 | P0 | 미완료 |",
  ]) {
    assertIncludes(files.backlog, snippet, "development backlog");
  }
});

check("stream verification, inventory, and records wire v4.0.0 (4)", () => {
  for (const snippet of [
    "v4.0.0 (4)",
    "./server.sh verify-v400-local-ops-policy-freeze",
    "policy-frozen",
    "conditional-not-run",
    "UI 풀테스트, 30분/120분, published metadata, release action evidence가 아닙니다",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification");
  }
  for (const snippet of [
    "v4.0.0 (4) 로컬 운영 정책 freeze",
    "`OPS-181`, `SAFE-214` inherited scope",
    "verify-v400-local-ops-policy-freeze",
  ]) {
    assertIncludes(files.projectInventory, snippet, "project inventory");
  }
  for (const snippet of [
    "V400 local ops policy freeze",
    "./server.sh verify-v400-local-ops-policy-freeze",
    fixturePath,
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release test records");
  }
  for (const snippet of [
    "v4.0.0 local ops policy freeze",
    "verify-v400-local-ops-policy-freeze",
    "V400-LOCAL-OPS-POLICY-FREEZE-04",
  ]) {
    assertIncludes(files.releaseEvidence, snippet, "release evidence index");
  }
});

check("freeze does not claim write implementation or execution PASS", () => {
  assert(fixture.notEvidence.includes("action write implementation"),
    "fixture must record action write as not evidence");
  assert(fixture.notEvidence.includes("UI fulltest"), "fixture must record UI fulltest as not evidence");
  const noExecutionPass = files.releaseRecords.includes("published metadata PASS가 아님") ||
    files.streamVerification.includes("published metadata, release action evidence가 아닙니다");
  assert(noExecutionPass, "v4.0.0 (4) must not claim UI/longrun/published metadata PASS");
});

const results = runChecks();
console.log("");
console.log("== v4.0.0 local ops policy freeze summary ==");
console.log("- schema: media-server.v400-local-ops-policy-freeze.v1");
console.log(`- command: ${command}`);
console.log(`- decisionId: ${fixture.decisionId}`);
console.log(`- status: ${fixture.status}`);
console.log(`- implementationStatus: ${fixture.implementationStatus}`);
console.log(`- frozenDecisions: ${fixture.frozenDecisions.length}`);
console.log(`- fieldSmoke: ${fixture.fieldSmoke.status}`);
console.log("- writePathImplementation: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
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

function sha256File(relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, relativePath))).digest("hex");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function assertEqualList(actual, expected, label) {
  assert(Array.isArray(actual), `${label} must be an array`);
  assert(actual.length === expected.length, `${label} length ${actual.length} != ${expected.length}`);
  for (let index = 0; index < expected.length; index += 1) {
    assert(actual[index] === expected[index], `${label}[${index}] ${actual[index]} != ${expected[index]}`);
  }
}
