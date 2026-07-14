#!/usr/bin/env node
// 파일 용도: REVIEW4-61 duration·iteration·120분 판정·cleanup 실측의 false-PASS 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

import {
  buildMonotonicDurationEvidence,
  evaluateLongrun120Decision,
  validateCleanupMeasurement,
  validateIterationLedger,
  validateMonotonicDurationEvidence,
} from "./v390_longrun_evidence_measurement_lib.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390-REVIEW4-61 longrun evidence measurement contract

Usage:
  ./server.sh verify-v390-longrun-evidence-measurement-contract

Checks monotonic duration, explicit iteration ledger, AGENTS 7.6.2 120-minute decisions,
and PID/port/artifact before-after cleanup measurement without running 30/120 minutes.
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);
const checks = [];

check("actual duration requires independent monotonic start end and elapsed", () => {
  const evidence = buildMonotonicDurationEvidence({
    requestedMinutes: 30,
    fixtureMode: false,
    runnerStartedNs: "1000000000",
    runnerEndedNs: "1802000000000",
    delegated: delegatedDuration(1801),
  });
  assert(validateMonotonicDurationEvidence(evidence).length === 0, "valid monotonic evidence rejected");
  assert(evidence.eligibleRealDuration === true, "valid duration did not qualify");
});

check("requested minutes and observed max iteration cannot replace elapsed time", () => {
  const evidence = buildMonotonicDurationEvidence({
    requestedMinutes: 30,
    fixtureMode: false,
    runnerStartedNs: "1000000000",
    runnerEndedNs: "61000000000",
    delegated: delegatedDuration(60),
  });
  assert(validateMonotonicDurationEvidence(evidence).some(error => error.includes("requested elapsed")),
    "short elapsed duration became eligible");
  assert(evidence.eligibleRealDuration === false, "short elapsed duration was qualified");
});

check("monotonic arithmetic and delegated duration must agree", () => {
  const evidence = buildMonotonicDurationEvidence({
    requestedMinutes: 30,
    fixtureMode: false,
    runnerStartedNs: "1000000000",
    runnerEndedNs: "1802000000000",
    delegated: { ...delegatedDuration(1801), endedSeconds: 1812 },
  });
  assert(validateMonotonicDurationEvidence(evidence).some(error => error.includes("delegated monotonic")),
    "inconsistent delegated clock passed");
});

check("iteration ledger is explicit exact ordered and independent from maximum ID", () => {
  const steps = soakSteps(2);
  const ledger = iterationLedger(2);
  assert(validateIterationLedger(ledger, steps).length === 0, "valid iteration ledger rejected");
  const maxOnly = structuredClone(ledger);
  maxOnly.iterations = [maxOnly.iterations[1]];
  maxOnly.observedIterations = 2;
  assert(validateIterationLedger(maxOnly, steps).some(error => error.includes("exact iteration sequence")),
    "maximum observed iteration replaced the explicit ledger");
});

check("iteration ledger rejects duplicate reorder and case/result drift", () => {
  const steps = soakSteps(2);
  const duplicate = iterationLedger(2);
  duplicate.iterations.push(structuredClone(duplicate.iterations[1]));
  assert(validateIterationLedger(duplicate, steps).length > 0, "duplicate iteration passed");
  const reordered = iterationLedger(2);
  [reordered.iterations[0], reordered.iterations[1]] = [reordered.iterations[1], reordered.iterations[0]];
  assert(validateIterationLedger(reordered, steps).length > 0, "reordered iteration passed");
  const drift = iterationLedger(2);
  drift.iterations[0].cases[0].result = "not-run";
  assert(validateIterationLedger(drift, steps).length > 0, "case result drift passed");
});

check("AGENTS 7.6.2 change scope drives 120-minute need independently of run selection", () => {
  const hold = evaluateLongrun120Decision({
    scope: scopeEvidence("cleanup-port-lifecycle"),
    runRequested: false,
  });
  const run = evaluateLongrun120Decision({
    scope: scopeEvidence("cleanup-port-lifecycle"),
    runRequested: true,
  });
  assert(hold.policyDecision === "조건부 진행" && hold.executionDecision === "hold-awaiting-approval",
    "cleanup trigger without selection became not-required");
  assert(run.policyDecision === hold.policyDecision && run.executionDecision === "run",
    "run selection changed the policy need decision");
});

check("run flag alone is not direct 120-minute evidence", () => {
  const decision = evaluateLongrun120Decision({ scope: scopeEvidence("none"), runRequested: true });
  assert(decision.policyDecision === "미진행", "run flag invented a policy trigger");
  assert(decision.valid === false && decision.executionDecision === "invalid-run-without-trigger",
    "run flag without direct evidence was accepted");
});

check("explicit user directive is a policy trigger independently from execution selection", () => {
  const scope = { ...scopeEvidence("none"), userDirective: true };
  const hold = evaluateLongrun120Decision({ scope, runRequested: false });
  const run = evaluateLongrun120Decision({ scope, runRequested: true });
  assert(hold.triggerReasons.includes("user-directive") && hold.executionDecision === "hold-awaiting-approval",
    "explicit user directive trigger was not recorded");
  assert(run.policyDecision === hold.policyDecision && run.executionDecision === "run",
    "execution selection changed the user-directive policy result");
});

check("upstream cleanup or runtime drift independently triggers 120 minutes", () => {
  const decision = evaluateLongrun120Decision({
    scope: { ...scopeEvidence("none"), upstreamSignals: [{ id: "cleanup-drift", status: "trigger" }] },
    runRequested: false,
  });
  assert(decision.policyDecision === "조건부 진행" && decision.triggerReasons.includes("upstream-signal:cleanup-drift"),
    "upstream drift did not trigger a conditional 120-minute decision");
});

check("cleanup requires PID port ownership and artifact before after bytes", () => {
  const evidence = cleanupEvidence();
  assert(validateCleanupMeasurement(evidence).length === 0, "valid cleanup measurement rejected");
});

check("cleanup rejects missing PID foreign port unsafe path and byte drift", () => {
  const missingPid = cleanupEvidence();
  missingPid.processes = [];
  assert(validateCleanupMeasurement(missingPid).length > 0, "missing PID lifecycle passed");
  const foreignPort = cleanupEvidence();
  foreignPort.ports[0].listenerPidsAfter = [99999];
  foreignPort.ports[0].bindableAfter = false;
  assert(validateCleanupMeasurement(foreignPort).length > 0, "foreign listener passed");
  const unsafePath = cleanupEvidence();
  unsafePath.artifacts[0].path = "/var/tmp/media_server_predev-123";
  assert(validateCleanupMeasurement(unsafePath).length > 0, "self-declared contained path outside allowed roots passed");
  const unsafeName = cleanupEvidence();
  unsafeName.artifacts[0].path = "/tmp/unrelated-artifact-root";
  assert(validateCleanupMeasurement(unsafeName).length > 0, "self-declared contained path with an unrelated basename passed");
  const falseContainment = cleanupEvidence();
  falseContainment.artifacts[0].contained = false;
  assert(validateCleanupMeasurement(falseContainment).length > 0, "producer false containment flag passed");
  const byteDrift = cleanupEvidence();
  byteDrift.artifacts[0].bytesAfter = 1;
  assert(validateCleanupMeasurement(byteDrift).length > 0, "artifact bytes-after drift passed");
});

check("runner acceptance and docs consume REVIEW4-61 measurement schemas", () => {
  for (const [file, snippets] of [
    ["scripts/internal/verify_predev_stability.sh", ["media-server.predev-monotonic-duration.v1", "media-server.predev-soak-iteration-ledger.v1", "serverProcessLedger"]],
    ["scripts/internal/v390_longrun_evidence_measurement_lib.mjs", ["media-server.v390-monotonic-duration-evidence.v1", "media-server.v390-longrun-120-decision.v1", "media-server.v390-cleanup-measurement.v1"]],
    ["scripts/internal/verify_v390_server_longrun.mjs", ["buildMonotonicDurationEvidence", "validateCleanupMeasurement", "validateIterationLedger", "delegatedSteps"]],
    ["scripts/internal/verify_v390_test_acceptance_bundle.mjs", ["evaluateLongrun120Decision", "hold-awaiting-approval", "validateCleanupMeasurement", "uiTemporaryRoot"]],
    ["scripts/internal/verify_v390_final_evidence_integrity.mjs", ["validateMonotonicDurationEvidence", "validateIterationLedger", "validateCleanupMeasurement", "remeasureCleanupAfter", "listListenerPids"]],
    ["docs/stream-verification.md", ["V390-REVIEW4-61", "monotonic", "bytesAfter"]],
  ]) {
    const text = fs.readFileSync(path.join(rootDir, file), "utf8");
    for (const snippet of snippets) assert(text.includes(snippet), `${file} missing ${snippet}`);
  }
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try { item.fn(); pass += 1; console.log(`[pass] ${item.name}`); }
  catch (error) { fail += 1; console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`); }
}
console.log("\n== V390-REVIEW4-61 longrun evidence measurement contract ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log("- actual30MinuteExecution: not-run-by-this-contract");
console.log("- actual120MinuteExecution: not-run-by-this-contract");
if (fail > 0) process.exit(1);

function delegatedDuration(elapsedSeconds) {
  return {
    schema: "media-server.predev-monotonic-duration.v1",
    clockSource: "bash-SECONDS-monotonic",
    startedSeconds: 10,
    endedSeconds: 10 + elapsedSeconds,
    elapsedSeconds,
    requestedSoakSeconds: 1800,
    durationSec: elapsedSeconds,
  };
}

function soakSteps(count) {
  return iterationLedger(count).iterations.flatMap(item => item.cases.map(entry => ({
    name: entry.caseId,
    result: entry.result,
  })));
}

function iterationLedger(count) {
  const suffixes = ["va-events", "event-post-schema", "event-post-recovery", "redaction", "runtime-idle"];
  return {
    schema: "media-server.predev-soak-iteration-ledger.v1",
    source: "explicit-step-ledger-not-max-inference",
    observedIterations: count,
    iterations: Array.from({ length: count }, (_, index) => ({
      iteration: index + 1,
      cases: suffixes.map(suffix => ({ caseId: `soak-${index + 1}-${suffix}`, result: suffix === "redaction" ? "skip" : "pass" })),
    })),
  };
}

function scopeEvidence(category) {
  return {
    schema: "media-server.v390-longrun-120-scope.v1",
    sourceComplete: true,
    userDirective: false,
    releaseGate: false,
    mappedFeatureIds: [],
    changedAreas: category === "none" ? [] : [{
      category,
      featureIds: ["OPS-168", "SAFE-201", "SAFE-212"],
      files: ["scripts/internal/verify_v390_server_longrun.mjs"],
      modules: ["longrun-cleanup"],
    }],
    upstreamSignals: [],
  };
}

function cleanupEvidence() {
  return {
    schema: "media-server.v390-cleanup-measurement.v1",
    processes: [{ pid: 12345, commandIdentity: "media_server", aliveBefore: true, aliveAfter: false, ownedPorts: [8081, 8555] }],
    ports: [
      { port: 8081, ownerPid: 12345, listenerPidsBefore: [12345], listenerPidsAfter: [], bindableAfter: true },
      { port: 8555, ownerPid: 12345, listenerPidsBefore: [12345], listenerPidsAfter: [], bindableAfter: true },
    ],
    artifacts: [{ path: "/tmp/media_server_predev-123", contained: true, existedBefore: true, bytesBefore: 4096, existsAfter: false, bytesAfter: 0, removedBytes: 4096 }],
  };
}

function check(name, fn) { checks.push({ name, fn }); }
function assert(condition, message) { if (!condition) throw new Error(message); }
