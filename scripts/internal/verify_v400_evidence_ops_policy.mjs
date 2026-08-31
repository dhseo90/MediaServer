#!/usr/bin/env node
// 파일 용도: v4.0.0 Evidence 운영 정책화(opt-in, 비-VMS, 삭제 금지, default-on은 4.1.0)를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v4.0.0 Evidence operations policy verification

Usage:
  ./server.sh verify-v400-evidence-ops-policy

Checks:
  - EventRecord/clip/retention stay opt-in and non-VMS in 4.0
  - default-on storage remains deferred to v4.1.0
  - pin/dry-run cleanup and raw prompt non-retention boundaries remain
  - inventory, stream-verification, records, fixture, and server.sh dispatch are wired

Not run by this command:
  - v4.1.0 Evidence default-on productization
  - VMS/NVR archive API
  - UI fulltest
  - 30/120 minute longrun
  - published metadata verification
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v400-evidence-ops-policy";
const targetScript = "verify_v400_evidence_ops_policy.mjs";
const fixturePath = "test/fixtures/v400_evidence_ops_policy.json";

const files = {
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  serverSh: readText("server.sh"),
  userReviewGate: JSON.parse(readText("test/fixtures/v400_user_review_gate.json")),
};
const fixture = JSON.parse(readText(fixturePath));
const checks = [];

check("evidence-ops policy fixture keeps opt-in/non-VMS and defers default-on", () => {
  assert(fixture.schema === "media-server.v400-evidence-ops-policy.v1", "fixture schema mismatch");
  assert(fixture.decisionId === "V400-EVIDENCE-OPS-POLICY-06", "fixture decisionId mismatch");
  assert(fixture.sourceRelease === "v4.0.0", "fixture sourceRelease mismatch");
  assert(fixture.latestPublished === "v3.9.1", "fixture latestPublished mismatch");
  assert(fixture.status === "policy-frozen", "fixture status mismatch");
  assert(fixture.implementationStatus === "opt-in-non-vms-not-default-on",
    "fixture must not claim default-on storage");
  assert(fixture.storagePolicy.mode === "opt-in", "storage mode drifted");
  assert(fixture.storagePolicy.defaultOn === "deferred-to-v4.1.0", "default-on must stay v4.1.0");
  assert(fixture.storagePolicy.vmsNvr === "forbidden", "VMS/NVR must stay forbidden");
  assert(fixture.storagePolicy.continuousRecording === "forbidden", "24/7 recording must stay forbidden");
  assert(fixture.storagePolicy.destructiveCleanup === "dry-run-required", "cleanup dry-run boundary drifted");
  assert(fixture.storagePolicy.pinnedExcludedFromAutoCleanup === true, "pin exclusion drifted");
  assert(files.userReviewGate.constraints?.evidenceDefaultOn === "deferred-to-v4.1.0",
    "user-review-gate evidenceDefaultOn drifted");
  assert(fixture.inheritedFeatureIds.includes("OPS-052"), "missing inherited OPS-052");
  assert(fixture.inheritedFeatureIds.includes("SAFE-082"), "missing inherited SAFE-082");
});

check("event evidence contract and storage keep non-VMS and pin/cleanup boundaries", () => {
  const contract = readText(fixture.contractDocument);
  for (const snippet of fixture.requiredContractSnippets) {
    assert(contract.includes(snippet), `${fixture.contractDocument} missing ${snippet}`);
  }
  const storage = readText(fixture.sourceAnchors.eventStorage);
  for (const snippet of fixture.sourceAnchors.requiredSnippets) {
    assert(storage.includes(snippet), `${fixture.sourceAnchors.eventStorage} missing ${snippet}`);
  }
});

check("inherited evidence/retention commands still dispatch and this command is wired", () => {
  for (const name of fixture.inheritedCommands) {
    assertIncludes(files.serverSh, name, "server.sh inherited dispatch");
  }
  assertIncludes(files.serverSh, command, "server.sh");
  assertIncludes(files.serverSh, targetScript, "server.sh");
});

check("backlog records v4.0.0 (6) Evidence ops policy complete and step 8 readiness recorded", () => {
  for (const snippet of [
    "### v4.0.0 Evidence 운영 정책화",
    "정책 상태: `policy-frozen`",
    "구현 상태: `opt-in-non-vms-not-default-on`",
    "default-on",
    "비-VMS",
    "`scripts/internal/verify_v400_evidence_ops_policy.mjs`",
    "`./server.sh verify-v400-evidence-ops-policy`",
    fixturePath,
    "| 6 | v4.0.0 (6) Evidence 운영 정책화 | P0 | 완료 |",
    "| 7 | v4.0.0 (7) 로컬 운영 안정화 | P0 | 완료 |",
    "| 8 | v4.0.0 (8) stabilization and release readiness | P0 | 완료 |",
  ]) {
    assertIncludes(files.backlog, snippet, "development backlog");
  }
});

check("stream verification, inventory, and records wire v4.0.0 (6)", () => {
  for (const snippet of [
    "v4.0.0 (6)",
    "./server.sh verify-v400-evidence-ops-policy",
    "policy-frozen",
    "opt-in",
    "UI 풀테스트, 30분/120분, published metadata, release action evidence가 아닙니다",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification");
  }
  for (const snippet of [
    "v4.0.0 (6) Evidence 운영 정책화",
    "`OPS-052`, `SAFE-082` inherited scope",
    "verify-v400-evidence-ops-policy",
  ]) {
    assertIncludes(files.projectInventory, snippet, "project inventory");
  }
  for (const snippet of [
    "V400 evidence ops policy",
    "./server.sh verify-v400-evidence-ops-policy",
    fixturePath,
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release test records");
  }
  for (const snippet of [
    "v4.0.0 evidence ops policy",
    "verify-v400-evidence-ops-policy",
    "V400-EVIDENCE-OPS-POLICY-06",
  ]) {
    assertIncludes(files.releaseEvidence, snippet, "release evidence index");
  }
});

check("evidence-ops policy does not claim default-on or execution PASS", () => {
  assert(fixture.notEvidence.includes("Evidence default-on productization"),
    "fixture must record default-on as not evidence");
  assert(fixture.notEvidence.includes("VMS/NVR archive API"),
    "fixture must record VMS/NVR as not evidence");
  const noExecutionPass = files.releaseRecords.includes("published metadata PASS가 아님") ||
    files.streamVerification.includes("published metadata, release action evidence가 아닙니다");
  assert(noExecutionPass, "v4.0.0 (6) must not claim UI/longrun/published metadata PASS");
});

const results = runChecks();
console.log("");
console.log("== v4.0.0 Evidence ops policy summary ==");
console.log("- schema: media-server.v400-evidence-ops-policy.v1");
console.log(`- command: ${command}`);
console.log(`- decisionId: ${fixture.decisionId}`);
console.log(`- status: ${fixture.status}`);
console.log(`- implementationStatus: ${fixture.implementationStatus}`);
console.log(`- storageMode: ${fixture.storagePolicy.mode}`);
console.log(`- defaultOn: ${fixture.storagePolicy.defaultOn}`);
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
