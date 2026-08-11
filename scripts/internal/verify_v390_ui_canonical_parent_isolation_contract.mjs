#!/usr/bin/env node
// 파일 용도: canonical parent가 case child를 exact-once로 실행하고 ordinary FAIL을 전수 집계하는 계약을 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  canonicalParentInfraFatalCodes,
  runCanonicalParentOrchestration,
  selectCanonicalParentCases,
  writeCanonicalParentSummaryAtomic,
} from "./v390_ui_native_exact_cases_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const canonical = readJson("test/fixtures/ui_fulltest_case_manifest_policy_v4.json");
const manifest = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const canonicalIds = canonical.cases.map(item => item.testId);
const implementationFiles = Object.freeze({
  runner: Object.freeze({ path: "scripts/internal/run_v390_ui_native_exact_cases.mjs", sha256: "3".repeat(64) }),
  library: Object.freeze({ path: "scripts/internal/v390_ui_native_exact_cases_lib.mjs", sha256: "5".repeat(64) }),
  adapter: Object.freeze({ path: "scripts/internal/v390_ui_native_adapter.mjs", sha256: "6".repeat(64) }),
  recorder: Object.freeze({ path: "scripts/internal/v390_ui_request_event_recorder.mjs", sha256: "7".repeat(64) }),
  evaluator: Object.freeze({ path: "scripts/internal/v390_ui_request_lifecycle_evaluator.mjs", sha256: "8".repeat(64) }),
});
const sourceBinding = Object.freeze({
  baselineSourceCommitSha: "327afe0d4b3282400f1925252c59a53b87827224",
  verificationCommitSha: "1".repeat(40),
  verificationBranch: "v3.9.0-verification-rebase",
  runnerSchema: "media-server.v390-ui-canonical-parent.v1",
  manifestSha256: sha256(stableJson(manifest)),
  buildSha256: "2".repeat(64),
  implementationFiles,
  implementationSha256: sha256(stableJson(implementationFiles)),
});
const checks = [];
let temporaryRoot = "";

try {
  temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "v390-canonical-parent-contract-"));

  await check("infra fatal allowset is exact", async () => {
    assert(JSON.stringify([...canonicalParentInfraFatalCodes]) === JSON.stringify([
      "SERVER_BOOTSTRAP_FAILED",
      "PORT_RUNTIME_CONTAMINATION",
      "SUMMARY_WRITE_FAILED",
    ]), "canonical parent infra allowset drifted");
  });

  await check("canonical selection preserves manifest exact order and uniqueness", async () => {
    const selected = selectCanonicalParentCases({
      manifestCases: manifest.cases,
      canonicalCases: canonical.cases,
      requireFullCanonical: true,
    });
    assert(selected.length === 424, `canonical selection count mismatch: ${selected.length}`);
    assert(new Set(selected.map(item => item.caseId)).size === 424,
      "canonical selection contains duplicates");
    assert(JSON.stringify(selected.map(item => item.caseId)) === JSON.stringify(canonicalIds),
      "canonical selection order drifted");
  });

  await check("PASS FAIL PASS FAIL continues and preserves exhaustive census", async () => {
    const result = await runFixture({
      ids: canonicalIds.slice(0, 4),
      outcomes: ["PASS", "FAIL", "PASS", "FAIL"],
    });
    assertCounts(result.summary, {
      selected: 4, attempted: 4, pass: 2, fail: 2,
      notRun: 0, unsupported: 0, runnerAbort: 0,
    });
    assert(JSON.stringify(result.summary.failureCensus.map(item => item.caseId)) ===
      JSON.stringify([canonicalIds[1], canonicalIds[3]]),
    "ordinary failure census is not exhaustive manifest order");
    assert(result.summary.firstFailure?.caseId === canonicalIds[1],
      "first failure does not preserve the first census row");
    assertExactOnce(result, 4);
  });

  await check("first FAIL then 423 PASS attempts canonical 424 once", async () => {
    const result = await runFixture({
      ids: canonicalIds,
      outcomes: canonicalIds.map((_, index) => index === 0 ? "FAIL" : "PASS"),
      fullCanonical: true,
    });
    assertCounts(result.summary, {
      selected: 424, attempted: 424, pass: 423, fail: 1,
      notRun: 0, unsupported: 0, runnerAbort: 0,
    });
    assert(result.summary.failureCensus.length === 1 &&
      result.summary.failureCensus[0].caseId === canonicalIds[0],
    "first ordinary failure census mismatch");
    assert(result.summary.runBinding?.schema === "media-server.v390-ui-canonical-parent-run.v1" &&
      result.summary.runBinding?.childSummarySchema === "media-server.v390-ui-case-child.v1" &&
      result.summary.cases.every(item => item.runId === result.summary.runBinding.runId &&
        /^[a-f0-9]{64}$/.test(String(item.summarySha256 || ""))),
    "canonical parent run/child digest binding missing");
    assertExactOnce(result, 424);
  });

  await check("all canonical 424 FAIL still attempts every child", async () => {
    const result = await runFixture({
      ids: canonicalIds,
      outcomes: canonicalIds.map(() => "FAIL"),
      fullCanonical: true,
    });
    assertCounts(result.summary, {
      selected: 424, attempted: 424, pass: 0, fail: 424,
      notRun: 0, unsupported: 0, runnerAbort: 0,
    });
    assert(result.summary.failureCensus.length === 424,
      "all-fail census was truncated");
    assert(JSON.stringify(result.summary.failureCensus.map(item => item.caseId)) ===
      JSON.stringify(canonicalIds), "all-fail census order drifted");
    assertExactOnce(result, 424);
  });

  await check("exit 1 with valid FAIL summary continues", async () => {
    const result = await runFixture({
      ids: canonicalIds.slice(0, 3),
      outcomes: ["FAIL", "PASS", "PASS"],
    });
    assertCounts(result.summary, {
      selected: 3, attempted: 3, pass: 2, fail: 1,
      notRun: 0, unsupported: 0, runnerAbort: 0,
    });
    assertExactOnce(result, 3);
  });

  await check("unsupported-shaped child cannot become unsupported or PASS", async () => {
    const result = await runFixture({
      ids: canonicalIds.slice(0, 2),
      outcomes: ["UNSUPPORTED_SHAPE", "PASS"],
    });
    assert(result.summary.infraFatal?.code === "SUMMARY_WRITE_FAILED",
      "unsupported-shaped child was not rejected as invalid summary");
    assertCounts(result.summary, {
      selected: 2, attempted: 0, pass: 0, fail: 0,
      notRun: 2, unsupported: 0, runnerAbort: 1,
    });
    assertExactOnce(result, 1);
  });

  for (const [code, position] of [
    ["SERVER_BOOTSTRAP_FAILED", 0],
    ["PORT_RUNTIME_CONTAMINATION", 2],
    ["SUMMARY_WRITE_FAILED", 3],
  ]) {
    await check(`${code} stops at exact triggering position`, async () => {
      const ids = canonicalIds.slice(0, 5);
      const result = await runFixture({
        ids,
        outcomes: ids.map(() => "PASS"),
        infra: { code, position },
      });
      const expectedAttempted = code === "SERVER_BOOTSTRAP_FAILED" ? 0 : position;
      const expectedSpawned = code === "SUMMARY_WRITE_FAILED"
        ? expectedAttempted + 1
        : expectedAttempted;
      assert(result.summary.infraFatal?.code === code, `${code} infra code missing`);
      assertCounts(result.summary, {
        selected: 5,
        attempted: expectedAttempted,
        pass: expectedAttempted,
        fail: 0,
        notRun: 5 - expectedAttempted,
        unsupported: 0,
        runnerAbort: 1,
      });
      assert(result.summary.cases.slice(expectedAttempted)
        .every(item => item.status === "not-run" && item.infraCode === code),
      `${code} later not-run reason drifted`);
      assertExactOnce(result, expectedSpawned);
    });
  }

  await check("infra at the last case leaves no later spawn", async () => {
    const ids = canonicalIds.slice(0, 4);
    const result = await runFixture({
      ids,
      outcomes: ids.map(() => "PASS"),
      infra: { code: "SUMMARY_WRITE_FAILED", position: 3 },
    });
    assertCounts(result.summary, {
      selected: 4, attempted: 3, pass: 3, fail: 0,
      notRun: 1, unsupported: 0, runnerAbort: 1,
    });
    assertExactOnce(result, 4);
  });

  for (const mismatch of [
    "EXIT_ZERO_FAIL", "EXIT_ONE_PASS", "MISSING", "MALFORMED", "CASE_MISMATCH",
    "SOURCE_MISMATCH", "SIGNAL", "SPAWN_ERROR", "SYMLINK", "MODE_MISMATCH",
    "CLEANUP_MISMATCH", "PASS_CLEANUP_FALSE", "FILE_CONTENT_MISMATCH",
    "PASS_CENSUS_NON_ARRAY", "FAIL_CENSUS_NON_ARRAY", "FAIL_CENSUS_MALFORMED_ENTRY",
  ]) {
    await check(`${mismatch} child summary fails closed`, async () => {
      const result = await runFixture({
        ids: canonicalIds.slice(0, 3),
        outcomes: [mismatch, "PASS", "PASS"],
      });
      assert(result.summary.infraFatal?.code === "SUMMARY_WRITE_FAILED",
        `${mismatch} did not fail closed as SUMMARY_WRITE_FAILED`);
      assertCounts(result.summary, {
        selected: 3, attempted: 0, pass: 0, fail: 0,
        notRun: 3, unsupported: 0, runnerAbort: 1,
      });
      assertExactOnce(result, 1);
    });
  }

  for (const contamination of ["PRE_SPAWN_DIR_SYMLINK", "POST_SPAWN_DIR_SYMLINK"]) {
    await check(`${contamination} child artifact root fails closed`, async () => {
      const result = await runFixture({
        ids: canonicalIds.slice(0, 3),
        outcomes: ["PASS", "PASS", "PASS"],
        contamination,
      });
      assert(result.summary.infraFatal?.code === "SUMMARY_WRITE_FAILED",
        `${contamination} did not fail closed as SUMMARY_WRITE_FAILED`);
      assertCounts(result.summary, {
        selected: 3, attempted: 0, pass: 0, fail: 0,
        notRun: 3, unsupported: 0, runnerAbort: 1,
      });
      assertExactOnce(result, contamination === "PRE_SPAWN_DIR_SYMLINK" ? 0 : 1);
    });
  }

  for (const contamination of ["DUPLICATE_CASE", "DUPLICATE_TOKEN", "REUSED_SUMMARY_PATH"]) {
    await check(`${contamination} is rejected`, async () => {
      if (contamination === "DUPLICATE_CASE") {
        let failed = false;
        try {
          selectCanonicalParentCases({
            manifestCases: [manifest.cases[0], manifest.cases[0]],
            canonicalCases: canonical.cases,
          });
        } catch {
          failed = true;
        }
        assert(failed, `${contamination} was silently accepted`);
        return;
      }
      const result = await runFixture({
        ids: canonicalIds.slice(0, 2),
        outcomes: ["PASS", "PASS"],
        contamination,
      });
      assert(result.summary.infraFatal?.code === "SUMMARY_WRITE_FAILED",
        `${contamination} did not fail closed in its aggregate`);
      assertCounts(result.summary, {
        selected: 2, attempted: 1, pass: 1, fail: 0,
        notRun: 1, unsupported: 0, runnerAbort: 1,
      });
    });
  }

  await check("orchestration exception preserves prior PASS FAIL and complete census", async () => {
    const result = await runFixture({
      ids: canonicalIds.slice(0, 4),
      outcomes: ["PASS", "FAIL", "PASS", "PASS"],
      contamination: "THROW_AFTER_PRIOR",
    });
    assert(result.summary.infraFatal?.code === "SUMMARY_WRITE_FAILED",
      "orchestration exception did not fail closed");
    assertCounts(result.summary, {
      selected: 4, attempted: 2, pass: 1, fail: 1,
      notRun: 2, unsupported: 0, runnerAbort: 1,
    });
    assert(result.summary.failureCensus.length === 1 &&
      result.summary.failureCensus[0].caseId === canonicalIds[1] &&
      result.summary.firstFailure?.caseId === canonicalIds[1],
    "orchestration exception discarded the prior ordinary failure census");
    assertExactOnce(result, 3);
  });

  await check("ordinary failure projection is safe and cleanup-bound", async () => {
    const result = await runFixture({ ids: canonicalIds.slice(0, 1), outcomes: ["FAIL"] });
    const row = result.summary.failureCensus[0];
    const serialized = JSON.stringify(row);
    assert(row.failureClass === "dom-assertion-failure" &&
      row.failurePhase === "dom-assertion" && row.failureCode === "DOM_ASSERTION_FAILED",
    "failure class/phase/code projection mismatch");
    assert(row.lifecycleCensus?.failureCount === 1 &&
      row.cleanupAttestation?.pass === true && row.childExitCode === 1,
    "failure lifecycle/count/cleanup/exit projection mismatch");
    assert(row.summaryPath.endsWith("summary.json") &&
      !/password|authorization|cookie|rawError|failureMessage/i.test(serialized),
    "failure projection exposed unsafe child detail");
  });

  await check("aggregate summary writer is atomic and no-overwrite", async () => {
    const targetDir = path.join(temporaryRoot, "atomic-writer");
    fs.mkdirSync(targetDir, { recursive: true });
    const target = path.join(targetDir, "summary.json");
    const value = { schema: "media-server.v390-ui-canonical-parent.v1", result: "FAIL" };
    writeCanonicalParentSummaryAtomic(target, value);
    assert(JSON.stringify(JSON.parse(fs.readFileSync(target, "utf8"))) === JSON.stringify(value),
      "atomic aggregate summary bytes mismatch");
    assert(fs.readdirSync(targetDir).sort().join("\n") === "summary.json",
      "atomic aggregate summary left a temp file");
    assert((fs.statSync(target).mode & 0o777) === 0o600,
      "atomic aggregate summary mode is not 0600");
    let failed = false;
    try {
      writeCanonicalParentSummaryAtomic(target, { result: "PASS" });
    } catch {
      failed = true;
    }
    assert(failed, "aggregate summary writer overwrote an existing summary");
    assert(JSON.parse(fs.readFileSync(target, "utf8")).result === "FAIL",
      "aggregate summary changed after rejected overwrite");
  });

  for (const fixture of ["selection-error", "source-binding-error", "runtime-inspector-error"]) {
    await check(`actual parent ${fixture} is summarized inside the finally boundary`, async () => {
      const result = runActualParent({
        fixtureArgs: ["--contract-canonical-parent-preflight-fixture", fixture],
      });
      try {
        assert(result.run.status === 1,
          `${fixture} exit mismatch: ${result.run.status}/${result.run.stderr || result.run.stdout}`);
        assert(fs.existsSync(result.summaryPath), `${fixture} aggregate summary is missing`);
        const summary = JSON.parse(fs.readFileSync(result.summaryPath, "utf8"));
        assert(summary.infraFatal?.code === "SUMMARY_WRITE_FAILED",
          `${fixture} infra classification mismatch`);
        assertCounts(summary, {
          selected: 424, attempted: 0, pass: 0, fail: 0,
          notRun: 424, unsupported: 0, runnerAbort: 1,
        });
        assert(summary.cases.length === 424 &&
          summary.cases.every(item => item.status === "not-run"),
        `${fixture} later not-run census mismatch`);
        assert(String(result.run.stderr || "") === "",
          `${fixture} emitted the writer-only infra marker or raw error`);
        const stdout = String(result.run.stdout || "");
        for (const line of [
          "- exactCases: 424", "- attempted: 0", "- pass: 0", "- fail: 0",
          "- notRun: 424", "- failureCensus: 0",
        ]) assert(stdout.includes(line), `${fixture} parent console count missing: ${line}`);
      } finally {
        fs.rmSync(result.outputDir, { recursive: true, force: true });
      }
    });
  }

  await check("actual CLI parent spawns PASS FAIL PASS children and prints aggregate counts", async () => {
    const secretCanary = "canonical-parent-secret-copy-canary";
    const runtimeCanary = "canonical-parent-runtime-copy-canary";
    const result = runActualParent({
      fixtureArgs: ["--contract-canonical-parent-fixture", "pass-fail-pass"],
      env: {
        MEDIA_SERVER_V390_UI_ROLE_SECRETS: secretCanary,
        MEDIA_SERVER_V390_PARENT_RUNTIME_CANARY: runtimeCanary,
      },
    });
    try {
      assert(result.run.status === 1,
        `actual parent mixed result exit mismatch: ${result.run.status}/${result.run.stderr || result.run.stdout}`);
      assert(String(result.run.stderr || "") === "", "actual mixed parent leaked stderr detail");
      const summary = JSON.parse(fs.readFileSync(result.summaryPath, "utf8"));
      assertCounts(summary, {
        selected: 3, attempted: 3, pass: 2, fail: 1,
        notRun: 0, unsupported: 0, runnerAbort: 0,
      });
      assert(summary.failureCensus.length === 1 &&
        summary.failureCensus[0].caseId === canonicalIds[1] &&
        summary.firstFailure?.caseId === canonicalIds[1],
      "actual mixed parent failure census mismatch");
      assert(summary.selection.spawnTokenCount === 3,
        "actual mixed parent did not spawn each child exactly once");
      assert(!JSON.stringify(summary).includes(secretCanary) &&
        !JSON.stringify(summary).includes(runtimeCanary),
      "actual mixed parent aggregate retained shared env material");
      const stdout = String(result.run.stdout || "");
      for (const line of [
        "- exactCases: 3", "- attempted: 3", "- pass: 2", "- fail: 1",
        "- notRun: 0", "- failureCensus: 1",
      ]) assert(stdout.includes(line), `actual parent console count missing: ${line}`);
      for (const [index, item] of summary.cases.entries()) {
        const childRoot = path.dirname(item.summaryPath);
        const invocation = JSON.parse(fs.readFileSync(
          path.join(childRoot, "parent-invocation.json"), "utf8",
        ));
        assert(invocation.caseId === canonicalIds[index] &&
          invocation.argv.caseChildCount === 1 &&
          JSON.stringify(invocation.argv.caseIds) === JSON.stringify([canonicalIds[index]]),
        `actual child argv selection mismatch at ${index}`);
        assert(invocation.argv.httpBase === "http://127.0.0.1:18424" &&
          invocation.argv.runtimeDescriptor.endsWith("/VERSION") &&
          invocation.argv.roleStateMap.endsWith("/VERSION") &&
          invocation.argv.serverLog.endsWith("/VERSION") &&
          invocation.argv.buildPath.endsWith("/VERSION"),
        `actual child shared runtime argv mismatch at ${index}`);
        assert(invocation.env.roleSecretsSha256 === sha256(secretCanary) &&
          invocation.env.runtimeCanarySha256 === sha256(runtimeCanary),
        `actual child did not receive copied parent runtime env at ${index}`);
      }
    } finally {
      fs.rmSync(result.outputDir, { recursive: true, force: true });
    }
  });

  await check("actual parent aggregate write failure emits the exact infra marker", async () => {
    const outputDir = fs.mkdtempSync(path.join(rootDir, ".v390-parent-writer-contract-"));
    try {
      const existing = path.join(outputDir, "summary.json");
      fs.writeFileSync(existing, "{\"sentinel\":true}\n", { mode: 0o600 });
      const run = spawnSync(path.join(rootDir, "server.sh"), [
        "run-v390-ui-native-exact-cases",
        "--output-dir", outputDir,
        "--http-base", "http://127.0.0.1:1",
        "--role-state-map", path.join(rootDir, "VERSION"),
        "--server-log", path.join(rootDir, "VERSION"),
        "--runtime-descriptor", path.join(outputDir, "missing-runtime.json"),
        "--build-path", path.join(rootDir, "VERSION"),
      ], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      assert(run.status === 70,
        `aggregate writer failure exit mismatch: ${run.status}/${run.stderr || run.stdout}`);
      assert(String(run.stderr || "").trim() ===
        "V390_UI_CANONICAL_PARENT_INFRA_FATAL:SUMMARY_WRITE_FAILED",
      "aggregate writer failure marker mismatch or raw detail leak");
      assert(fs.readFileSync(existing, "utf8") === "{\"sentinel\":true}\n",
        "aggregate writer overwrote the pre-existing summary");
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  const failures = checks.filter(item => item.status === "FAIL");
  console.log("== v3.9.0 canonical parent isolation contract ==");
  for (const item of checks) {
    console.log(`- ${item.status}: ${item.name}${item.detail ? ` (${item.detail})` : ""}`);
  }
  console.log(`result: ${failures.length === 0 ? "PASS" : "FAIL"} (${checks.length - failures.length}/${checks.length})`);
  process.exit(failures.length === 0 ? 0 : 1);
} finally {
  if (temporaryRoot) fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

async function runFixture({ ids, outcomes, infra = null, contamination = "", fullCanonical = false }) {
  const caseOutputRoot = fs.mkdtempSync(path.join(temporaryRoot, "fixture-"));
  const selectedCases = ids.map(caseId => {
    const item = manifest.cases.find(candidate => candidate.caseId === caseId);
    assert(item, `fixture manifest case missing: ${caseId}`);
    return item;
  });
  const spawns = [];
  let firstToken = "";
  let firstSummaryPath = "";
  let runtimeChecks = 0;
  if (contamination === "PRE_SPAWN_DIR_SYMLINK") {
    const escaped = fs.mkdtempSync(path.join(temporaryRoot, "escaped-pre-spawn-"));
    fs.symlinkSync(escaped, path.join(caseOutputRoot, `001-${selectedCases[0].caseId}`));
  }
  const summary = await runCanonicalParentOrchestration({
    selectedCases,
    caseOutputRoot,
    expectedSourceBinding: sourceBinding,
    requireFullCanonical: fullCanonical,
    expectedCanonicalCount: 424,
    inspectRuntime: async ({ phase, caseIndex }) => {
      runtimeChecks += 1;
      if (infra?.code === "SERVER_BOOTSTRAP_FAILED" && phase === "before-batch") {
        return { status: "FAIL", code: infra.code, ownership: runtimeOwnership() };
      }
      if (infra?.code === "PORT_RUNTIME_CONTAMINATION" &&
          phase === "before-case" && caseIndex === infra.position) {
        return { status: "FAIL", code: infra.code, ownership: runtimeOwnership() };
      }
      return { status: "PASS", ownership: runtimeOwnership() };
    },
    spawnChild: async context => {
      spawns.push({ ...context });
      if (!firstToken) firstToken = context.spawnToken;
      if (!firstSummaryPath) firstSummaryPath = context.summaryPath;
      if (contamination === "DUPLICATE_TOKEN" && context.index === 1) {
        return childProcessResult(context, outcomes[context.index], { spawnToken: firstToken });
      }
      if (contamination === "REUSED_SUMMARY_PATH" && context.index === 1) {
        return childProcessResult(context, outcomes[context.index], { summaryPath: firstSummaryPath });
      }
      if (contamination === "THROW_AFTER_PRIOR" && context.index === 2) {
        return childProcessResult(context, outcomes[context.index], { spawnToken: firstToken });
      }
      if (infra?.code === "SUMMARY_WRITE_FAILED" && context.index === infra.position) {
        return {
          exitCode: 70,
          stderr: "V390_UI_CASE_CHILD_INFRA_FATAL:SUMMARY_WRITE_FAILED\n",
          stdout: "",
          summary: null,
          spawnToken: context.spawnToken,
          summaryPath: context.summaryPath,
          outputDir: context.outputDir,
        };
      }
      if (contamination === "POST_SPAWN_DIR_SYMLINK" && context.index === 0) {
        const escaped = fs.mkdtempSync(path.join(temporaryRoot, "escaped-post-spawn-"));
        const escapedContext = {
          ...context,
          outputDir: escaped,
          summaryPath: path.join(escaped, "summary.json"),
        };
        const child = childProcessResult(escapedContext, outcomes[context.index]);
        fs.rmSync(context.outputDir, { recursive: true, force: true });
        fs.symlinkSync(escaped, context.outputDir);
        return {
          ...child,
          outputDir: context.outputDir,
          summaryPath: context.summaryPath,
        };
      }
      return childProcessResult(context, outcomes[context.index]);
    },
  });
  return { summary, spawns, runtimeChecks };
}

function childProcessResult(context, outcome, override = {}) {
  const specialPass = new Set([
    "MISSING", "MALFORMED", "CASE_MISMATCH", "SOURCE_MISMATCH", "SIGNAL",
    "SPAWN_ERROR", "SYMLINK", "MODE_MISMATCH", "CLEANUP_MISMATCH",
    "PASS_CLEANUP_FALSE", "PASS_CENSUS_NON_ARRAY", "FILE_CONTENT_MISMATCH",
    "UNSUPPORTED_SHAPE",
  ]);
  const status = outcome === "EXIT_ZERO_FAIL" || outcome.startsWith("FAIL_CENSUS_") ? "FAIL"
    : (outcome === "EXIT_ONE_PASS" || specialPass.has(outcome) ? "PASS" : outcome);
  const summary = ["MISSING", "MALFORMED"].includes(outcome)
    ? (outcome === "MISSING" ? null : { schema: "wrong" })
    : childSummary(context.item, status === "UNSUPPORTED_SHAPE" ? "PASS" : status,
      outcome === "CASE_MISMATCH" ? canonicalIds.at(-1) : context.item.caseId);
  if (outcome === "UNSUPPORTED_SHAPE" && summary) summary.counts.unsupported = 1;
  if (outcome === "SOURCE_MISMATCH" && summary) {
    summary.sourceBinding.manifestSha256 = "0".repeat(64);
  }
  if (outcome === "CLEANUP_MISMATCH" && summary) {
    summary.case.cleanupAttestation.cleanupEntryCount = 0;
  }
  if (outcome === "PASS_CLEANUP_FALSE" && summary) {
    summary.case.cleanupAttestation.pass = false;
    summary.case.cleanupAttestation.caseRuntimeRestored = false;
    summary.case.cleanupAttestation.failureCode = "CASE_RUNTIME_CLEANUP_FAILED";
  }
  if (outcome === "PASS_CENSUS_NON_ARRAY" && summary) {
    summary.case.failureCensus = "";
  }
  if (outcome === "FAIL_CENSUS_NON_ARRAY" && summary) {
    summary.case.failureCensus = "not-an-array";
  }
  if (outcome === "FAIL_CENSUS_MALFORMED_ENTRY" && summary) {
    summary.case.failureCensus = [{ code: "DOM_ASSERTION_FAILED" }];
  }
  fs.mkdirSync(context.outputDir, { recursive: true, mode: 0o700 });
  if (outcome === "SYMLINK") {
    const target = path.join(context.outputDir, "summary-target.json");
    fs.writeFileSync(target, `${JSON.stringify(summary)}\n`, { mode: 0o600 });
    fs.symlinkSync(target, context.summaryPath);
  } else if (summary !== null) {
    fs.writeFileSync(
      context.summaryPath,
      outcome === "MALFORMED" ? "{malformed\n"
        : (outcome === "FILE_CONTENT_MISMATCH" ? `${JSON.stringify({ schema: "other" })}\n`
            : `${JSON.stringify(summary)}\n`),
      { mode: outcome === "MODE_MISMATCH" ? 0o644 : 0o600 },
    );
  }
  return {
    exitCode: outcome === "EXIT_ZERO_FAIL" ? 0
      : (outcome === "EXIT_ONE_PASS" ? 1 : (status === "FAIL" ? 1 : 0)),
    stderr: "",
    stdout: "",
    summary,
    signal: outcome === "SIGNAL" ? "SIGTERM" : "",
    spawnError: outcome === "SPAWN_ERROR",
    spawnToken: context.spawnToken,
    summaryPath: context.summaryPath,
    outputDir: context.outputDir,
    ...override,
  };
}

function runActualParent({ fixtureArgs, env = {} }) {
  const outputDir = fs.mkdtempSync(path.join(rootDir, ".v390-parent-round1-contract-"));
  const summaryPath = path.join(outputDir, "summary.json");
  const run = spawnSync(path.join(rootDir, "server.sh"), [
    "run-v390-ui-native-exact-cases",
    "--output-dir", outputDir,
    "--http-base", "http://127.0.0.1:18424",
    "--role-state-map", path.join(rootDir, "VERSION"),
    "--server-log", path.join(rootDir, "VERSION"),
    "--runtime-descriptor", path.join(rootDir, "VERSION"),
    "--build-path", path.join(rootDir, "VERSION"),
    ...fixtureArgs,
  ], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...env },
  });
  return { outputDir, summaryPath, run };
}

function childSummary(item, status, caseId = item.caseId) {
  const failed = status === "FAIL";
  return {
    schema: "media-server.v390-ui-case-child.v1",
    result: status,
    executionStatus: "case-child-contract-fixture-not-browser-evidence",
    releaseEvidenceEligible: false,
    policyV4Qualification: "not-eligible-single-case-child",
    uiFulltestPass: false,
    actualBrowserExecution: false,
    sourceBinding: structuredClone(sourceBinding),
    selection: { caseId, selectedIds: [caseId], selected: 1 },
    counts: {
      selected: 1, attempted: 1,
      pass: failed ? 0 : 1, fail: failed ? 1 : 0,
      notRun: 0, unsupported: 0, runnerAbort: 0,
    },
    case: {
      caseId,
      featureId: String(item.featureId || ""),
      status,
      failureClass: failed ? "dom-assertion-failure" : "",
      failurePhase: failed ? "dom-assertion" : "",
      failureCode: failed ? "DOM_ASSERTION_FAILED" : "",
      failureMessage: failed ? "must never be copied to parent census" : "",
      failureCensus: failed ? [{
        failureClass: "dom-assertion-failure",
        phase: "dom-assertion",
        code: "DOM_ASSERTION_FAILED",
        message: "must-not-copy-child-detail",
        requestIdentity: `${caseId}:request-object-1`,
        responseIdentity: `${caseId}:response-object-1`,
      }] : [],
      requestLifecycleEvaluation: failed ? {
        status: "FAIL",
        census: { requestCount: 1, responseCount: 1, failureCount: 1 },
        failures: [{ code: "DOM_ASSERTION_FAILED", message: "must-not-copy-lifecycle-detail" }],
      } : null,
      cleanupAttestation: {
        schema: "media-server.v390-ui-case-cleanup-attestation.v1",
        pass: true,
        primaryFailurePresent: failed,
        primaryFailurePreserved: failed,
        caseRuntimeRestoreAttempted: true,
        caseRuntimeRestored: true,
        browserCloseAttempted: true,
        browserContextClosed: true,
        cleanupEntryCount: 1,
        failureCode: "",
      },
    },
    timing: {
      startedAtMs: 1000,
      finishedAtMs: 1001,
      durationMs: 1,
      startedAt: new Date(1000).toISOString(),
      finishedAt: new Date(1001).toISOString(),
    },
  };
}

function runtimeOwnership() {
  return {
    pid: 4242,
    httpPort: 18424,
    rtspPort: 19424,
    runtimeRoot: "/tmp/v390-parent-owned-runtime",
    runtimeRootSha256: sha256("/tmp/v390-parent-owned-runtime"),
  };
}

function assertCounts(summary, expected) {
  assert(JSON.stringify(summary.counts) === JSON.stringify(expected),
    `parent counts mismatch: ${JSON.stringify(summary.counts)} != ${JSON.stringify(expected)}`);
}

function assertExactOnce(result, expectedSpawnCount) {
  assert(result.spawns.length === expectedSpawnCount,
    `spawn count mismatch: ${result.spawns.length}/${expectedSpawnCount}`);
  const tokens = result.spawns.map(item => item.spawnToken);
  const summaryPaths = result.spawns.map(item => item.summaryPath);
  const outputDirs = result.spawns.map(item => item.outputDir);
  assert(new Set(tokens).size === tokens.length, "spawn token was reused");
  assert(new Set(summaryPaths).size === summaryPaths.length, "child summary path was reused");
  assert(new Set(outputDirs).size === outputDirs.length, "child artifact directory was reused");
  assert(result.spawns.every((item, index) => item.index === index),
    "child spawn order drifted");
}

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, status: "PASS", detail: "" });
  } catch (error) {
    checks.push({ name, status: "FAIL", detail: error instanceof Error ? error.message : String(error) });
  }
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
