#!/usr/bin/env node
// 파일 용도: v4.0.0 Incident OS 정책화(/ops/events 검색·timeline·resolution, 새 event type 금지)를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v4.0.0 Incident OS policy verification

Usage:
  ./server.sh verify-v400-incident-os-policy

Checks:
  - /ops/events stays an Ops-only diagnostic/direct route, not primary nav
  - existing search/timeline/resolution surfaces remain the 4.0 policy set
  - no new event type or Event POST schema change is claimed
  - inventory, stream-verification, records, fixture, and server.sh dispatch are wired

Not run by this command:
  - v4.1.0 Incident OS product promotion
  - new event type implementation
  - UI fulltest
  - 30/120 minute longrun
  - published metadata verification
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v400-incident-os-policy";
const targetScript = "verify_v400_incident_os_policy.mjs";
const fixturePath = "test/fixtures/v400_incident_os_policy.json";
const expectedSurfaces = ["search", "timeline", "resolution"];

const files = {
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  serverSh: readText("server.sh"),
};
const fixture = JSON.parse(readText(fixturePath));
const checks = [];

check("incident-os policy fixture keeps existing surfaces and blocks promotion/new types", () => {
  assert(fixture.schema === "media-server.v400-incident-os-policy.v1", "fixture schema mismatch");
  assert(fixture.decisionId === "V400-INCIDENT-OS-POLICY-05", "fixture decisionId mismatch");
  assert(fixture.sourceRelease === "v4.0.0", "fixture sourceRelease mismatch");
  assert(fixture.latestPublished === "v3.9.1", "fixture latestPublished mismatch");
  assert(fixture.status === "policy-frozen", "fixture status mismatch");
  assert(fixture.implementationStatus === "existing-surfaces-policy-only",
    "fixture must not claim product promotion");
  assert(fixture.iaPolicy.eventsRoute === "/ops/events", "eventsRoute drifted");
  assert(fixture.iaPolicy.eventsNavRole === "diagnostic-direct-route-not-primary-nav",
    "events nav role drifted");
  assert(fixture.iaPolicy.productPromotion === "deferred-to-v4.1.0", "product promotion must stay v4.1.0");
  assertEqualList(fixture.surfaces.map((item) => item.id), expectedSurfaces, "surfaces.id");
  assert(fixture.unchangedContracts.eventPostSchema === "unchanged", "Event POST schema constraint drifted");
  assert(fixture.unchangedContracts.newEventTypes === "forbidden-in-v4.0.0", "new event type constraint drifted");
  assert(fixture.inheritedFeatureIds.includes("UI-062"), "missing inherited UI-062");
  assert(fixture.inheritedFeatureIds.includes("OPS-071"), "missing inherited OPS-071");
});

check("Ops primary nav excludes /ops/events and keeps the existing six destinations", () => {
  const shell = readText(fixture.sourceAnchors.opsShell);
  for (const snippet of fixture.sourceAnchors.requiredNavSnippets) {
    assert(shell.includes(snippet), `${fixture.sourceAnchors.opsShell} missing ${snippet}`);
  }
  assert(!shell.includes(fixture.sourceAnchors.forbiddenNavSnippet),
    "/ops/events must not be added to Ops primary nav");
  for (const snippet of fixture.sourceAnchors.workspaceSnippets) {
    assert(shell.includes(snippet), `${fixture.sourceAnchors.opsShell} missing workspace ${snippet}`);
  }
  const eventPost = readText(fixture.sourceAnchors.eventPostBoundaryFile);
  for (const snippet of fixture.sourceAnchors.eventPostBoundarySnippets) {
    assert(eventPost.includes(snippet), `${fixture.sourceAnchors.eventPostBoundaryFile} missing ${snippet}`);
  }
});

check("inherited incident/search/timeline/resolution commands still dispatch", () => {
  for (const name of fixture.inheritedCommands) {
    assertIncludes(files.serverSh, name, "server.sh inherited dispatch");
  }
  assertIncludes(files.serverSh, command, "server.sh");
  assertIncludes(files.serverSh, targetScript, "server.sh");
});

check("backlog records v4.0.0 (5) Incident OS policy complete and keeps (6) not implemented", () => {
  for (const snippet of [
    "### v4.0.0 Incident OS 정책화",
    "정책 상태: `policy-frozen`",
    "구현 상태: `existing-surfaces-policy-only`",
    "diagnostic-direct-route-not-primary-nav",
    "새 event type",
    "`scripts/internal/verify_v400_incident_os_policy.mjs`",
    "`./server.sh verify-v400-incident-os-policy`",
    fixturePath,
    "| 5 | v4.0.0 (5) Incident OS 정책화 | P0 | 완료 |",
    "| 6 | v4.0.0 (6) Evidence 운영 정책화 | P0 | 미완료 |",
  ]) {
    assertIncludes(files.backlog, snippet, "development backlog");
  }
});

check("stream verification, inventory, and records wire v4.0.0 (5)", () => {
  for (const snippet of [
    "v4.0.0 (5)",
    "./server.sh verify-v400-incident-os-policy",
    "policy-frozen",
    "primary nav",
    "UI 풀테스트, 30분/120분, published metadata, release action evidence가 아닙니다",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification");
  }
  for (const snippet of [
    "v4.0.0 (5) Incident OS 정책화",
    "`UI-062`, `EVT-064`, `SAFE-104`, `OPS-071` inherited scope",
    "verify-v400-incident-os-policy",
  ]) {
    assertIncludes(files.projectInventory, snippet, "project inventory");
  }
  for (const snippet of [
    "V400 incident OS policy",
    "./server.sh verify-v400-incident-os-policy",
    fixturePath,
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release test records");
  }
  for (const snippet of [
    "v4.0.0 incident OS policy",
    "verify-v400-incident-os-policy",
    "V400-INCIDENT-OS-POLICY-05",
  ]) {
    assertIncludes(files.releaseEvidence, snippet, "release evidence index");
  }
});

check("incident-os policy does not claim product promotion or execution PASS", () => {
  assert(fixture.notEvidence.includes("Incident OS product promotion to primary nav"),
    "fixture must record product promotion as not evidence");
  assert(fixture.notEvidence.includes("new event type"), "fixture must record new event type as not evidence");
  const noExecutionPass = files.releaseRecords.includes("published metadata PASS가 아님") ||
    files.streamVerification.includes("published metadata, release action evidence가 아닙니다");
  assert(noExecutionPass, "v4.0.0 (5) must not claim UI/longrun/published metadata PASS");
});

const results = runChecks();
console.log("");
console.log("== v4.0.0 Incident OS policy summary ==");
console.log("- schema: media-server.v400-incident-os-policy.v1");
console.log(`- command: ${command}`);
console.log(`- decisionId: ${fixture.decisionId}`);
console.log(`- status: ${fixture.status}`);
console.log(`- implementationStatus: ${fixture.implementationStatus}`);
console.log(`- surfaces: ${fixture.surfaces.map((item) => item.id).join(",")}`);
console.log(`- eventsNavRole: ${fixture.iaPolicy.eventsNavRole}`);
console.log("- productPromotion: deferred-to-v4.1.0");
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

function assertEqualList(actual, expected, label) {
  assert(Array.isArray(actual), `${label} must be an array`);
  assert(actual.length === expected.length, `${label} length ${actual.length} != ${expected.length}`);
  for (let index = 0; index < expected.length; index += 1) {
    assert(actual[index] === expected[index], `${label}[${index}] ${actual[index]} != ${expected[index]}`);
  }
}
