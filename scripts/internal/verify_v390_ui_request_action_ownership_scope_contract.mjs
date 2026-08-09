#!/usr/bin/env node
// 파일 용도: canonical 424 request-action ownership phase/census와 fail-closed lifecycle을 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCanonicalRequestActionOwnershipCensus,
  createRequestActionOwnershipRegistry,
  requestActionOwnershipPhases,
} from "./v390_ui_request_action_ownership.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const manifest = JSON.parse(fs.readFileSync(
  path.join(rootDir, "test/fixtures/v390_ui_native_exact_cases.json"),
  "utf8",
));
const red = JSON.parse(fs.readFileSync(path.join(rootDir,
  "test/fixtures/v390_ui_request_action_ownership_red_20260810.json"), "utf8"));
const sourceFiles = Object.fromEntries([
  "runner",
  "runtime",
  "adapter",
].map(name => [name, fs.readFileSync(path.join(rootDir, ({
  runner: "scripts/internal/run_v390_ui_native_exact_cases.mjs",
  runtime: "scripts/internal/v390_ui_exact_oracle_runtime.mjs",
  adapter: "scripts/internal/v390_ui_native_adapter.mjs",
})[name]), "utf8")]));

const checks = [];
const check = async (name, fn) => {
  await fn();
  checks.push(name);
};
const expectReject = async (fn, pattern) => {
  let error = null;
  try { await fn(); } catch (caught) { error = caught; }
  assert(error instanceof Error, `expected rejection: ${pattern}`);
  assert(pattern.test(error.message),
    `rejection mismatch: ${error.message}/${pattern}`);
};

await check("latest SHA-bound UI-009 actual remains the focused RED", () => {
  assert(red.schema === "media-server.v390-ui-request-action-ownership-red.v1",
    "request-action ownership RED schema drift");
  assert(red.sourceCommitSha === "b7391b003f85e77ba5aa86a3c68c9358b593d6e7" &&
    red.sourceBranch === "v3.9.0" && red.sourceWorktreeClean === true,
  "request-action ownership RED source binding drift");
  assert(JSON.stringify(red.coverage) === JSON.stringify({
    target: 424, attempted: 8, pass: 7, fail: 1, notRun: 416, unsupported: 0,
  }), "request-action ownership RED coverage drift");
  assert(red.firstFailure.caseId === "UI-009" &&
    red.firstFailure.error === "nested request action ownership is forbidden",
  "request-action ownership RED first failure drift");
  assert(red.cleanup.status === "PASS" &&
    red.cleanup.primaryFailurePreserved === true,
  "request-action ownership RED cleanup drift");
  for (const artifact of Object.values(red.artifacts)) {
    assert(/^[0-9a-f]{64}$/.test(artifact.sha256),
      `request-action ownership RED artifact hash invalid: ${artifact.path}`);
    const artifactPath = path.join(rootDir, artifact.path);
    if (artifact.path.includes("/runs/") && fs.existsSync(artifactPath)) {
      assert(crypto.createHash("sha256").update(fs.readFileSync(artifactPath)).digest("hex") ===
        artifact.sha256,
      `request-action ownership RED artifact hash drift: ${artifact.path}`);
    }
  }
});

await check("canonical 424 cases have one exact non-nested ownership sequence", () => {
  const census = buildCanonicalRequestActionOwnershipCensus(manifest);
  assert(census.canonicalCaseCount === 424, "canonical ownership census count drift");
  assert(census.classifications["request-primary"] === 391,
    "request-primary census drift");
  assert(census.classifications["local-primary"] === 28,
    "local-primary census drift");
  assert(census.classifications["navigation-primary"] === 5,
    "navigation-primary census drift");
  assert(census.readbackApplicability.required === 421 &&
    census.readbackApplicability.notApplicable === 3,
  "independent readback applicability census drift");
  assert(census.sequenceCount === 424 && census.invalidSequenceCount === 0,
    "canonical ownership sequence coverage drift");
  assert(census.cases.every(item =>
    JSON.stringify(item.phases) === JSON.stringify(requestActionOwnershipPhases)),
  "canonical ownership phase order drift");
});

await check("missing, duplicate, nested, stale, wrong binding, and cleanup fail closed", async () => {
  const registry = createRequestActionOwnershipRegistry({ caseId: "UI-009" });
  await expectReject(() => registry.begin(), /missing/i);
  registry.attest({ phase: "bootstrap-settling", actionId: "UI-009:navigate" });
  await expectReject(() => registry.attest({
    phase: "bootstrap-settling",
    actionId: "UI-009:navigate",
  }), /phase|duplicate/i);
  await expectReject(() => registry.begin({
    caseId: "UI-009",
    phase: "independent-readback",
    actionId: "UI-009:verify-independent-readback",
    correlationId: "UI-009:readback",
    ownershipKind: "independent-readback",
  }), /phase/i);
  registry.attest({
    phase: "source-before-frozen",
    actionId: "UI-009:assert-visible-read-model",
  });
  const primary = registry.begin({
    caseId: "UI-009",
    phase: "primary-action",
    actionId: "UI-009:assert-visible-read-model",
    correlationId: "UI-009:primary",
    ownershipKind: "primary-action",
  });
  await expectReject(() => registry.validate(primary, { caseId: "UI-010" }), /case/i);
  await expectReject(() => registry.validate(primary, {
    actionId: "UI-009:wrong-action",
  }), /action/i);
  await expectReject(() => registry.validate(primary, {
    phase: "independent-readback",
  }), /phase/i);
  await expectReject(() => registry.begin({
    caseId: "UI-009",
    phase: "primary-action",
    actionId: "UI-009:assert-visible-read-model",
    correlationId: "UI-009:nested",
    ownershipKind: "primary-action",
  }), /nested/i);
  await expectReject(() => registry.register(primary, {
    requestId: "request-1",
    caseId: "UI-010",
    actionId: primary.actionId,
    phase: primary.phase,
  }), /case/i);
  registry.register(primary, {
    requestId: "request-1",
    caseId: primary.caseId,
    actionId: primary.actionId,
    phase: primary.phase,
  });
  await expectReject(() => registry.register(primary, {
    requestId: "request-1",
    caseId: primary.caseId,
    actionId: primary.actionId,
    phase: primary.phase,
  }), /duplicate/i);
  await expectReject(() => registry.end({ ...primary, actionId: "UI-009:wrong" }),
    /action|context/i);
  registry.completeRequest(primary, "request-1");
  registry.end(primary);
  await expectReject(() => registry.end(primary), /stale|active/i);
  registry.attest({
    phase: "primary-action",
    actionId: "UI-009:assert-visible-read-model",
    ownershipMode: "explicit-scope-ended-and-attested",
  });

  const readback = registry.begin({
    caseId: "UI-009",
    phase: "independent-readback",
    actionId: "UI-009:verify-independent-readback",
    correlationId: "UI-009:readback",
    ownershipKind: "independent-readback",
  });
  registry.register(readback, {
    requestId: "request-2",
    caseId: readback.caseId,
    actionId: readback.actionId,
    phase: readback.phase,
  });
  const cleanup = registry.cleanup({ failure: new Error("primary failure") });
  assert(cleanup.clearedActiveOwner === true && cleanup.clearedRequestCount === 1,
    "cleanup did not clear exact active owner/registry");
  assert(cleanup.primaryFailurePreserved === true,
    "cleanup did not preserve the primary failure");
  await expectReject(() => registry.end(readback), /stale|active/i);

  const timeoutRegistry = createRequestActionOwnershipRegistry({ caseId: "UI-010" });
  timeoutRegistry.attest({ phase: "bootstrap-settling", actionId: "UI-010:navigate" });
  timeoutRegistry.attest({ phase: "source-before-frozen", actionId: "UI-010:primary" });
  const timeoutContext = timeoutRegistry.begin({
    caseId: "UI-010",
    phase: "primary-action",
    actionId: "UI-010:primary",
    correlationId: "UI-010:primary",
    ownershipKind: "primary-action",
  });
  timeoutRegistry.register(timeoutContext, {
    requestId: "timeout-request",
    caseId: "UI-010",
    actionId: "UI-010:primary",
    phase: "primary-action",
  });
  const timeout = new Error("request timeout");
  timeout.name = "TimeoutError";
  const timeoutCleanup = timeoutRegistry.cleanup({ failure: timeout });
  assert(timeoutCleanup.clearedActiveOwner && timeoutCleanup.clearedRequestCount === 1 &&
    timeoutCleanup.primaryFailurePreserved,
  "timeout cleanup did not clear exact ownership while preserving failure");
});

await check("runner/runtime/adapter callsites use explicit begin-register-end-cleanup ownership", () => {
  const callsiteCensus = {
    runner: {
      begin: count(sourceFiles.runner, /beginRequestActionOwnership\(/g),
      end: count(sourceFiles.runner, /endRequestActionOwnership\(/g),
      attest: count(sourceFiles.runner, /attestRequestActionOwnershipPhase\(/g),
      cleanup: count(sourceFiles.runner, /cleanupRequestActionOwnership\(/g),
    },
    runtime: {
      begin: count(sourceFiles.runtime, /beginRequestActionOwnership\(/g),
      end: count(sourceFiles.runtime, /endRequestActionOwnership\(/g),
      contextPass: count(sourceFiles.runtime, /actionContext/g),
      cleanup: count(sourceFiles.runtime, /cleanupRequestActionOwnership\(/g),
    },
    adapter: {
      begin: count(sourceFiles.adapter, /beginRequestActionOwnership:/g),
      register: count(sourceFiles.adapter, /requestActionOwnershipRegistry\.register\(/g),
      requestComplete: count(sourceFiles.adapter, /requestActionOwnershipRegistry\.completeRequest\(/g),
      end: count(sourceFiles.adapter, /endRequestActionOwnership:/g),
      cleanup: count(sourceFiles.adapter, /cleanupRequestActionOwnership:/g),
    },
  };
  assert(callsiteCensus.runner.begin >= 5 && callsiteCensus.runner.end >= 2 &&
    callsiteCensus.runner.attest >= 5 && callsiteCensus.runner.cleanup >= 1,
  "runner explicit ownership callsite census is incomplete");
  assert(callsiteCensus.runtime.begin >= 1 && callsiteCensus.runtime.end >= 1 &&
    callsiteCensus.runtime.contextPass >= 2 && callsiteCensus.runtime.cleanup === 1,
  "runtime explicit ownership callsite census is incomplete");
  assert(Object.values(callsiteCensus.adapter).every(value => value === 1),
    `adapter ownership callsite census is incomplete: ${JSON.stringify(callsiteCensus.adapter)}`);
  assert(!sourceFiles.adapter.includes("ownershipStack") &&
    !sourceFiles.runtime.includes("ownershipStack") &&
    !sourceFiles.runner.includes("ownershipStack"),
  "global request ownership stack is forbidden");
  assert(!fs.readFileSync(path.join(rootDir,
    "scripts/internal/v390_ui_request_action_ownership.mjs"), "utf8").includes("UI-009"),
  "case-specific ownership exception is forbidden");
});

console.log("== v3.9.0 UI request-action ownership scope contract ==");
for (const name of checks) console.log(`PASS ${name}`);
console.log(`PASS checks=${checks.length}`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function count(source, pattern) {
  return [...source.matchAll(pattern)].length;
}
