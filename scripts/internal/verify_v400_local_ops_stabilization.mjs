#!/usr/bin/env node
// 파일 용도: v4.0.0 로컬 운영 안정화(역사적 verifier 유지, 문서 현재소스 구분, v320 drift 기록)를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v4.0.0 local operations stabilization verification

Usage:
  ./server.sh verify-v400-local-ops-stabilization

Checks:
  - historical v390 verifiers stay at the 118 ceiling and are not deleted
  - stream-verification distinguishes current 4.0.0 from inherited 3.9.1/3.9.0 rows
  - v320 page-owner drift is recorded, not silently rewritten
  - inventory, records, fixture, and server.sh dispatch are wired

Not run by this command:
  - deleting historical v390 verifiers
  - rewriting REVIEW4-bound v320 verifier
  - UI fulltest
  - 30/120 minute longrun
  - published metadata verification
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v400-local-ops-stabilization";
const targetScript = "verify_v400_local_ops_stabilization.mjs";
const fixturePath = "test/fixtures/v400_local_ops_stabilization.json";
const layer = JSON.parse(readText("test/fixtures/v400_verification_layer.json"));
const fixture = JSON.parse(readText(fixturePath));
const files = {
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  serverSh: readText("server.sh"),
};
const checks = [];

check("stabilization fixture keeps historical verifiers and records known drift", () => {
  assert(fixture.schema === "media-server.v400-local-ops-stabilization.v1", "fixture schema mismatch");
  assert(fixture.decisionId === "V400-LOCAL-OPS-STABILIZATION-07", "fixture decisionId mismatch");
  assert(fixture.sourceRelease === "v4.0.0", "fixture sourceRelease mismatch");
  assert(fixture.latestPublished === "v3.9.1", "fixture latestPublished mismatch");
  assert(fixture.status === "stabilization-recorded", "fixture status mismatch");
  assert(fixture.implementationStatus === "local-consistency-recorded-no-cull",
    "fixture must not claim historical verifier deletion");
  assert(fixture.historicalVerifierCull.decision === "keep-118-not-deleted", "cull decision drifted");
  assert(fixture.historicalVerifierCull.deletionStatus === "not-executed", "cull must stay not-executed");
  assert(fixture.historicalVerifierCull.v390Ceiling === layer.ceilings.v390VerifierScripts,
    "cull ceiling drifted from verification-layer fixture");
  const drift = fixture.knownInconsistencies.find((item) => item.id === "v320-unified-workspace-page-owner-vs-bundle");
  assert(drift && drift.status === "recorded-not-fixed", "v320 drift must stay recorded-not-fixed");
});

check("v390 verifier count stays at the freeze ceiling and v320 page owner still has the marker", () => {
  const v390 = fs.readdirSync(path.join(rootDir, "scripts/internal"))
    .filter((name) => /^verify_v390_.*\.mjs$/.test(name));
  assert(v390.length <= fixture.historicalVerifierCull.v390Ceiling,
    `v390 verifier growth: ${v390.length} > ${fixture.historicalVerifierCull.v390Ceiling}`);
  assert(v390.length === fixture.historicalVerifierCull.v390Ceiling,
    `v390 verifier count ${v390.length} != kept ceiling ${fixture.historicalVerifierCull.v390Ceiling}`);
  const page = readText(fixture.knownInconsistencies[0].pageOwner);
  assert(page.includes(fixture.knownInconsistencies[0].pageOwnerSnippet),
    "page owner lost v320 workspace testid");
  const v320 = readText("scripts/internal/verify_v320_unified_ops_events_workspace.mjs");
  assert(v320.includes("readWebRtcHttpServerBundle"),
    "historical v320 verifier no longer uses the webrtc bundle; do not silently rewrite it");
});

check("stream verification distinguishes current 4.0.0 from inherited 3.9 rows", () => {
  const stream = files.streamVerification;
  assertIncludes(stream, fixture.streamVerification.currentSourceHeading, "stream verification");
  assertIncludes(stream, fixture.streamVerification.inheritedHeadingRequiredByV390, "stream verification");
  assertIncludes(stream, fixture.streamVerification.currentSourceSnippet, "stream verification");
  assertIncludes(stream, fixture.streamVerification.historicalV391RowMustInclude, "stream verification");
  assertIncludes(stream, "v4.0.0 (7)", "stream verification");
});

check("inherited local-ops commands still dispatch and this command is wired", () => {
  for (const name of fixture.inheritedCommands) {
    assertIncludes(files.serverSh, name, "server.sh inherited dispatch");
  }
  assertIncludes(files.serverSh, command, "server.sh");
  assertIncludes(files.serverSh, targetScript, "server.sh");
});

check("backlog records v4.0.0 (7) stabilization complete and step 8 readiness recorded", () => {
  for (const snippet of [
    "### v4.0.0 로컬 운영 안정화",
    "상태: `stabilization-recorded`",
    "구현 상태: `local-consistency-recorded-no-cull`",
    "keep-118-not-deleted",
    "recorded-not-fixed",
    "`scripts/internal/verify_v400_local_ops_stabilization.mjs`",
    "`./server.sh verify-v400-local-ops-stabilization`",
    fixturePath,
    "| 7 | v4.0.0 (7) 로컬 운영 안정화 | P0 | 완료 |",
    "| 8 | v4.0.0 (8) stabilization and release readiness | P0 | 완료 |",
  ]) {
    assertIncludes(files.backlog, snippet, "development backlog");
  }
});

check("stream verification, inventory, and records wire v4.0.0 (7)", () => {
  for (const snippet of [
    "v4.0.0 (7)",
    "./server.sh verify-v400-local-ops-stabilization",
    "keep-118-not-deleted",
    "UI 풀테스트, 30분/120분, published metadata, release action evidence가 아닙니다",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification");
  }
  for (const snippet of [
    "v4.0.0 (7) 로컬 운영 안정화",
    "`OPS-166`, `SAFE-199` inherited scope",
    "verify-v400-local-ops-stabilization",
  ]) {
    assertIncludes(files.projectInventory, snippet, "project inventory");
  }
  for (const snippet of [
    "V400 local ops stabilization",
    "./server.sh verify-v400-local-ops-stabilization",
    fixturePath,
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release test records");
  }
  for (const snippet of [
    "v4.0.0 local ops stabilization",
    "verify-v400-local-ops-stabilization",
    "V400-LOCAL-OPS-STABILIZATION-07",
  ]) {
    assertIncludes(files.releaseEvidence, snippet, "release evidence index");
  }
});

check("stabilization does not claim cull, v320 rewrite, or execution PASS", () => {
  assert(fixture.notEvidence.includes("historical v390 verifier deletion"),
    "fixture must record cull as not evidence");
  assert(fixture.notEvidence.includes("v320 REVIEW4 verifier rewrite"),
    "fixture must record v320 rewrite as not evidence");
  const noExecutionPass = files.releaseRecords.includes("published metadata PASS가 아님") ||
    files.streamVerification.includes("published metadata, release action evidence가 아닙니다");
  assert(noExecutionPass, "v4.0.0 (7) must not claim UI/longrun/published metadata PASS");
});

const results = runChecks();
console.log("");
console.log("== v4.0.0 local ops stabilization summary ==");
console.log("- schema: media-server.v400-local-ops-stabilization.v1");
console.log(`- command: ${command}`);
console.log(`- decisionId: ${fixture.decisionId}`);
console.log(`- cull: ${fixture.historicalVerifierCull.decision}`);
console.log(`- v320Drift: ${fixture.knownInconsistencies[0].status}`);
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
