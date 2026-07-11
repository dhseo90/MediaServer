#!/usr/bin/env node
// 파일 용도: v3.9.0 (17) Development 18 외부 환경 부재 field smoke를 not-run closure로 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 external field smoke no-device closure verification

Usage:
  ./server.sh verify-v390-external-field-smoke-no-device-closure

Checks:
  - external TURN/WHEP, ONVIF device, external VLM/provider are explicit not-run
  - no endpoint, credential, device, provider or external network contact was attempted
  - no raw URL/secret material is stored
  - not-run is not field or release PASS and reopen conditions are explicit
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-external-field-smoke-no-device-closure";
const targetScript = "verify_v390_external_field_smoke_no_device_closure.mjs";
const fixturePath = "test/fixtures/v390_external_field_smoke_no_device_closure.json";
const expectedTargets = ["external-turn-whep", "onvif-real-device", "external-vlm-provider"];
const checks = [];

check("closure fixture records exact no-device not-run state", () => {
  const raw = read(fixturePath);
  const fixture = JSON.parse(raw);
  assert(fixture.schema === "media-server.v390-external-field-smoke-no-device-closure.v1", "unexpected closure schema");
  assert(fixture.release === "v3.9.0", "release must be v3.9.0");
  assert(fixture.developmentItem === 18, "development item must be 18");
  assert(fixture.approvalSource === "/goal v3.9.0 (17) Development 18", "approval source mismatch");
  assert(fixture.recordKind === "conditional-execution-record", "record kind mismatch");
  assert(fixture.executionStatus === "conditional-not-run", "execution status must be conditional-not-run");
  assert(fixture.evidenceStatus === "condition-record-not-field-pass", "evidence status mismatch");
  for (const flag of [
    "externalNetworkAttempted",
    "endpointProbeAttempted",
    "credentialAccessAttempted",
    "deviceContactAttempted",
    "providerCallAttempted",
    "artifactCreated",
    "fieldPassClaimed",
    "releasePassClaimed",
  ]) {
    assert(fixture[flag] === false, `${flag} must be false`);
  }
  assert(Array.isArray(fixture.targets) && fixture.targets.length === expectedTargets.length, "exactly three targets are required");
  assert(JSON.stringify(fixture.targets.map(item => item.id)) === JSON.stringify(expectedTargets), "target order/set mismatch");
  for (const target of fixture.targets) {
    assert(target.status === "conditional-not-run", `${target.id}: status must be conditional-not-run`);
    assert(target.reason === "missing-device-credential-endpoint-and-execution-approval", `${target.id}: reason mismatch`);
    assert(Array.isArray(target.requiredConditions) && target.requiredConditions.length >= 3, `${target.id}: required conditions incomplete`);
    assert(Array.isArray(target.missingConditions) && target.missingConditions.length === target.requiredConditions.length, `${target.id}: missing conditions must match requirements`);
    assert(Array.isArray(target.reopenConditions) && target.reopenConditions.length >= 3, `${target.id}: reopen conditions incomplete`);
    assert(target.fieldPassClaimed === false && target.releasePassClaimed === false, `${target.id}: false PASS boundary missing`);
  }
  for (const forbidden of ["http://", "https://", "rtsp://", '"password"', '"token"', '"apiKey"', '"authorization"']) {
    assert(!raw.toLowerCase().includes(forbidden.toLowerCase()), `closure fixture contains raw endpoint/secret marker: ${forbidden}`);
  }
});

check("feature inventory records Development 18 no-device closure", () => {
  const inventory = read("docs/v390-feature-completion-inventory.md");
  for (const snippet of [
    "## Development 18 External Field Smoke No-Device Closure",
    "/goal v3.9.0 (17) Development 18",
    ...expectedTargets,
    "externalNetworkAttempted=false",
    "fieldPassClaimed=false",
    "releasePassClaimed=false",
    "not-run은 PASS가 아닙니다",
  ]) {
    assert(inventory.includes(snippet), `feature inventory missing closure snippet: ${snippet}`);
  }
});

check("roadmap and release evidence close the step as not-run, not PASS", () => {
  const backlog = read("docs/development-backlog.md");
  const projectInventory = read("docs/project-feature-test-inventory.md");
  const records = read("docs/release-test-records.md");
  const evidence = read("docs/release-evidence-index.md");
  const stream = read("docs/stream-verification.md");
  for (const [label, text, snippets] of [
    ["backlog", backlog, ["real external field smoke gate", "조건부 미실행", "외부 환경 검증", "조건부 미실행/커밋 `6575e3b9`"]],
    ["project inventory", projectInventory, ["SAFE-216", "OPS-183", command]],
    ["records", records, ["V390 External Field Smoke No-Device Closure", "Development 18 no-device closure final", "Development 18 external field smoke not-run"]],
    ["evidence", evidence, ["Development 18 external field smoke no-device closure", "SAFE-216", "OPS-183"]],
    ["stream", stream, ["Development 18", command, "conditional-not-run", "condition-record-not-field-pass"]],
  ]) {
    for (const snippet of snippets) assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
  }
});

check("server dispatch exposes the closure verifier", () => {
  const server = read("server.sh");
  assert(server.includes(command), `server.sh missing ${command}`);
  assert(server.includes(targetScript), `server.sh missing ${targetScript}`);
});

const failed = checks.filter(item => !item.ok);
for (const item of checks) console.log(`[${item.ok ? "pass" : "fail"}] ${item.name}${item.error ? `: ${item.error}` : ""}`);
console.log("\n== v3.9.0 external field smoke no-device closure ==");
console.log("- targets: 3");
console.log("- executionStatus: conditional-not-run");
console.log("- externalNetworkAttempted: false");
console.log("- fieldPassClaimed: false");
console.log("- releasePassClaimed: false");
console.log(`- pass: ${checks.length - failed.length}`);
console.log(`- fail: ${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
