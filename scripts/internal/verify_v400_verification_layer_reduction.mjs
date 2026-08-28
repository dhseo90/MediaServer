#!/usr/bin/env node
// 파일 용도: v4.0.0 검증 계층 축소 규칙(986/424 유지, verifier 남발 금지, wrapper/실행 PASS 분리)을 검증한다.

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
  printUsageAndExit(`v4.0.0 verification-layer reduction verification

Usage:
  ./server.sh verify-v400-verification-layer-reduction

Checks:
  - inventory keeps 986 feature rows and 424 UI exact cases
  - v390 verifier/contract/fixture counts do not grow
  - new verify-v400-* commands stay on the allowlist
  - wrapper PASS remains separated from UI/30/120 execution PASS
  - REVIEW4-bound verifier files stay frozen unless the fixture hash is updated

Not run by this command:
  - deleting historical v390 verifiers
  - UI fulltest
  - 30/120 minute longrun
  - published metadata verification
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v400-verification-layer-reduction";
const targetScript = "verify_v400_verification_layer_reduction.mjs";
const fixturePath = "test/fixtures/v400_verification_layer.json";
const fixture = JSON.parse(readText(fixturePath));
const inventory = readText("docs/project-feature-test-inventory.md");
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const records = readText("docs/release-test-records.md");
const evidence = readText("docs/release-evidence-index.md");
const serverSh = readText("server.sh");
const wrapper = readText("scripts/internal/verify_ui_fulltest_one_shot.mjs");
const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const manifestLib = readText("scripts/internal/feature_implementation_manifest_lib.mjs");
const checks = [];

check("fixture pins 986/424 cardinality and verifier ceilings", () => {
  assert(fixture.schema === "media-server.v400-verification-layer.v1", "fixture schema mismatch");
  assert(fixture.decisionId === "V400-VERIFICATION-LAYER-03", "fixture decisionId mismatch");
  assert(fixture.status === "rule-in-force", "fixture status mismatch");
  assert(fixture.implementationStatus === "not-executed-reduction",
    "fixture must not claim historical verifier deletion");
  assert(fixture.cardinality.featureRows === 986, "featureRows pin drifted");
  assert(fixture.cardinality.uiExactCases === 424, "uiExactCases pin drifted");
  assert(fixture.cardinality.soak30Targets === 50, "soak30 pin drifted");
  assert(fixture.cardinality.soak120Targets === 7, "soak120 pin drifted");
  assert(fixture.ceilings.v390VerifierScripts === 118, "v390 ceiling drifted");
  assert(fixture.ceilings.contractVerifierScripts === 72, "contract ceiling drifted");
  assert(fixture.ceilings.nonV400JsonFixtures === 79, "non-v400 fixture ceiling drifted");
  assert(fixture.allowedV400Commands.includes(command), "this command missing from allowlist");
});

check("inventory summary stays at 986 feature rows and 424 UI exact cases", () => {
  assert(summaryCount(inventory, "전체 기능 항목") === fixture.cardinality.featureRows,
    "inventory 전체 기능 항목 drifted");
  assert(summaryCount(inventory, "UI 풀테스트 대상") === fixture.cardinality.uiExactCases,
    "inventory UI 풀테스트 대상 drifted");
  assert(summaryCount(inventory, "30분 soak 대상") === fixture.cardinality.soak30Targets,
    "inventory 30분 soak 대상 drifted");
  assert(summaryCount(inventory, "120분 대상") === fixture.cardinality.soak120Targets,
    "inventory 120분 대상 drifted");
  assert(manifestLib.includes("export const EXPECTED_FEATURE_ROWS = 986;"),
    "implementation manifest EXPECTED_FEATURE_ROWS drifted");
});

check("v390 verifier, contract, and non-v400 fixture counts do not grow", () => {
  const verifyScripts = listFiles("scripts/internal", /^verify_.*\.mjs$/);
  const v390 = verifyScripts.filter((name) => name.startsWith("verify_v390_"));
  const contracts = verifyScripts.filter((name) => name.includes("contract"));
  const fixtures = listFiles("test/fixtures", /\.json$/);
  const v400Fixtures = fixtures.filter((name) => name.startsWith("v400_"));
  const nonV400Fixtures = fixtures.filter((name) => !name.startsWith("v400_"));
  assert(v390.length <= fixture.ceilings.v390VerifierScripts,
    `v390 verifier growth: ${v390.length} > ${fixture.ceilings.v390VerifierScripts}`);
  assert(contracts.length <= fixture.ceilings.contractVerifierScripts,
    `contract verifier growth: ${contracts.length} > ${fixture.ceilings.contractVerifierScripts}`);
  assert(nonV400Fixtures.length <= fixture.ceilings.nonV400JsonFixtures,
    `non-v400 fixture growth: ${nonV400Fixtures.length} > ${fixture.ceilings.nonV400JsonFixtures}`);
  const allowedFixtures = new Set([
    ...fixture.allowedV400Fixtures,
    ...fixture.reservedV400Fixtures,
  ]);
  const extraFixtures = v400Fixtures.filter((name) => !allowedFixtures.has(name));
  assert(extraFixtures.length === 0, `unallowlisted v400 fixture(s): ${extraFixtures.join(", ")}`);
  const missingRequired = fixture.allowedV400Fixtures.filter((name) => !v400Fixtures.includes(name));
  assert(missingRequired.length === 0, `required v400 fixture(s) missing: ${missingRequired.join(", ")}`);
});

check("verify-v400 commands stay on the implemented or reserved allowlist", () => {
  const dispatched = [...serverSh.matchAll(/^  (verify-v400-[a-z0-9-]+)\)/gm)].map((match) => match[1]);
  const helped = [...serverSh.matchAll(/^  (verify-v400-[a-z0-9-]+)$/gm)].map((match) => match[1]);
  const observed = [...new Set([...dispatched, ...helped])];
  const allowed = new Set(fixture.allowedV400Commands);
  const reserved = new Set(fixture.reservedV400Commands);
  const extra = observed.filter((name) => !allowed.has(name) && !reserved.has(name));
  assert(extra.length === 0, `unallowlisted v400 command(s): ${extra.join(", ")}`);
  const missingImplemented = fixture.allowedV400Commands.filter((name) => !observed.includes(name));
  assert(missingImplemented.length === 0, `allowed v400 command(s) missing from server.sh: ${missingImplemented.join(", ")}`);
  const reservedPresent = fixture.reservedV400Commands.filter((name) => observed.includes(name));
  assert(reservedPresent.length === 0,
    `reserved future v400 command(s) already dispatched: ${reservedPresent.join(", ")}`);
});

check("wrapper PASS remains separated from UI/30/120 execution PASS", () => {
  for (const snippet of fixture.wrapperExecutionSeparation.wrapperMustInclude) {
    assert(wrapper.includes(snippet), `UI wrapper missing: ${snippet}`);
  }
  for (const snippet of fixture.wrapperExecutionSeparation.coverageMustInclude) {
    assert(coverage.includes(snippet), `coverage verifier missing: ${snippet}`);
  }
  for (const snippet of fixture.wrapperExecutionSeparation.forbiddenOverclaims) {
    assert(!wrapper.includes(snippet), `UI wrapper overclaim: ${snippet}`);
    assert(!coverage.includes(snippet), `coverage verifier overclaim: ${snippet}`);
    assert(!backlog.includes(snippet), `backlog overclaim: ${snippet}`);
  }
  assert(inventory.includes("covered는 mapping coverage이며 실행 PASS가 아님"),
    "inventory lost coverage/execution wording");
  assert(inventory.includes("wrapper PASS를 UI 풀테스트 직접 조작"),
    "inventory lost wrapper PASS boundary");
});

check("REVIEW4-bound verifier files stay frozen at fixture hashes", () => {
  for (const item of fixture.boundVerifierFreeze) {
    const actual = sha256File(item.path);
    assert(actual === item.sha256, `${item.path} hash drifted: ${actual} != ${item.sha256}`);
  }
});

check("backlog, stream verification, inventory, and records wire v4.0.0 (3)", () => {
  for (const snippet of [
    "### v4.0.0 검증 계층 축소 규칙",
    "986개 feature row와 424개 UI exact case를 유지",
    "새 `verify-v390_*` 스크립트 추가 금지",
    "wrapper PASS와 실행 PASS 분리",
    "`scripts/internal/verify_v400_verification_layer_reduction.mjs`",
    "`./server.sh verify-v400-verification-layer-reduction`",
    fixturePath,
    "| 3 | v4.0.0 (3) 검증 계층 축소 규칙 | P0 | 완료 |",
    "| 4 | v4.0.0 (4) 로컬 운영 정책 freeze | P0 | 완료 |",
    "| 5 | v4.0.0 (5) Incident OS 정책화 | P0 | 완료 |",
    "| 6 | v4.0.0 (6) Evidence 운영 정책화 | P0 | 완료 |",
    "| 7 | v4.0.0 (7) 로컬 운영 안정화 | P0 | 미완료 |",
  ]) {
    assertIncludes(backlog, snippet, "development backlog");
  }
  for (const snippet of [
    "v4.0.0 (3)",
    "./server.sh verify-v400-verification-layer-reduction",
    "986/424",
    "wrapper PASS",
    "UI 풀테스트, 30분/120분, published metadata, release action evidence가 아닙니다",
  ]) {
    assertIncludes(streamVerification, snippet, "stream verification");
  }
  for (const snippet of [
    "v4.0.0 (3) 검증 계층 축소 규칙",
    "`OPS-166`, `SAFE-199`, `OPS-167`, `SAFE-200` inherited scope",
    "verify-v400-verification-layer-reduction",
  ]) {
    assertIncludes(inventory, snippet, "project inventory");
  }
  for (const snippet of [
    "V400 verification layer reduction",
    "./server.sh verify-v400-verification-layer-reduction",
    fixturePath,
  ]) {
    assertIncludes(records, snippet, "release test records");
  }
  for (const snippet of [
    "v4.0.0 verification layer reduction",
    "verify-v400-verification-layer-reduction",
    "V400-VERIFICATION-LAYER-03",
  ]) {
    assertIncludes(evidence, snippet, "release evidence index");
  }
  assertIncludes(serverSh, command, "server.sh");
  assertIncludes(serverSh, targetScript, "server.sh");
});

const results = runChecks();
console.log("");
console.log("== v4.0.0 verification-layer reduction summary ==");
console.log("- schema: media-server.v400-verification-layer.v1");
console.log(`- command: ${command}`);
console.log(`- decisionId: ${fixture.decisionId}`);
console.log(`- featureRows: ${fixture.cardinality.featureRows}`);
console.log(`- uiExactCases: ${fixture.cardinality.uiExactCases}`);
console.log(`- v390Ceiling: ${fixture.ceilings.v390VerifierScripts}`);
console.log(`- allowedV400Commands: ${fixture.allowedV400Commands.length}`);
console.log("- historicalVerifierDeletion: not-run-by-this-command");
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

function listFiles(relativeDir, pattern) {
  return fs.readdirSync(path.join(rootDir, relativeDir)).filter((name) => pattern.test(name)).sort();
}

function summaryCount(text, label) {
  const match = text.match(new RegExp(`\\| ${escapeRegExp(label)} \\| ([0-9]+) \\|`));
  assert(match, `inventory summary missing ${label}`);
  return Number(match[1]);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
