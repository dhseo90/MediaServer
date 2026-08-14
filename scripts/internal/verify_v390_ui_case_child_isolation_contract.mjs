#!/usr/bin/env node
// 파일 용도: v3.9.0 UI case child와 suite finalizer의 격리·요약·secret cleanup 계약을 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const runnerPath = path.join(scriptDir, "run_v390_ui_native_exact_cases.mjs");
const implementationPaths = Object.freeze({
  runner: runnerPath,
  library: path.join(scriptDir, "v390_ui_native_exact_cases_lib.mjs"),
  adapter: path.join(scriptDir, "v390_ui_native_adapter.mjs"),
  recorder: path.join(scriptDir, "v390_ui_request_event_recorder.mjs"),
  evaluator: path.join(scriptDir, "v390_ui_request_lifecycle_evaluator.mjs"),
});
const secretCanaries = Object.freeze([
  "review-json-password-value",
  "review-bearer-token-value",
  "review-cookie-value",
  "review-query-token-value",
  "review-registered-runtime-value",
]);
const ordinaryModes = Object.freeze([
  ["callback-capture-error", "REQUEST_LIFECYCLE_FAILED", "CAPTURE_ERROR"],
  ["lifecycle-duplicate-response", "REQUEST_LIFECYCLE_FAILED", "RESPONSE_DUPLICATE"],
  ["dom-assertion-error", "DOM_ASSERTION_FAILED", "DOM_ASSERTION_FAILED"],
  ["api-assertion-error", "API_ASSERTION_FAILED", "API_ASSERTION_FAILED"],
  ["rejected-promise", "CHILD_PROMISE_REJECTED", "CHILD_PROMISE_REJECTED"],
  ["timeout-like", "CHILD_TIMEOUT", "CHILD_TIMEOUT"],
  ["cleanup-error-after-assertion", "DOM_ASSERTION_FAILED", "CASE_RUNTIME_CLEANUP_FAILED"],
]);
const checks = [];
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "v390-case-child-contract-"));

check("completed actual case child bypasses the Node worker shutdown deadlock", () => {
  const source = fs.readFileSync(runnerPath, "utf8");
  const dispatchStart = source.indexOf("if (options.caseChild) {", source.indexOf("process.on(\"exit\""));
  const dispatchEnd = source.indexOf("if (suiteFinalizerChild)", dispatchStart);
  const dispatch = source.slice(dispatchStart, dispatchEnd);
  const helperStart = source.indexOf("function exitFinalizedCaseChild(");
  const helperEnd = source.indexOf("\n}", helperStart) + 2;
  const helper = source.slice(helperStart, helperEnd);
  assert(dispatch.includes("exitFinalizedCaseChild(exitCode)") &&
    !dispatch.includes("process.exit(exitCode)"),
  "completed actual case child still enters the blocking process.exit shutdown path");
  assert(helper.includes("process.reallyExit(exitCode)"),
    "completed actual case child does not use the immediate post-finalization exit primitive");
});

check("canonical browser children disable concurrent Maglev shutdown work", () => {
  const source = fs.readFileSync(runnerPath, "utf8");
  assert(source.includes('function canonicalChildProcessArgs(args)') &&
    source.includes('return ["--no-maglev", ...args];'),
  "canonical child argv does not disable the Node Maglev compiler");
  const callsites = source.match(
    /runCanonicalChildProcess\(process\.execPath, canonicalChildProcessArgs\(args\)\)/g,
  ) || [];
  assert(callsites.length === 2,
    `case and suite-finalizer child argv bindings are incomplete: ${callsites.length}`);
});

check("suite finalizer scans success and failure artifacts before secret release", () => {
  const source = fs.readFileSync(runnerPath, "utf8");
  const start = source.indexOf("async function runCanonicalSuiteFinalizerChild()");
  const end = source.indexOf("async function runCanonicalCaseChild(", start);
  const body = source.slice(start, end);
  assert(body.includes("suite-finalizer-secret-artifact-integrity"),
    "suite finalizer has no typed retained-secret scan evidence");
  assert(body.includes("finally"), "suite finalizer does not scan/release through finally");
  assert(body.indexOf("assertSecretsAbsentFromArtifacts") < body.lastIndexOf("releaseSecrets"),
    "suite finalizer releases secrets before its final artifact-tree scan");
  assert(body.includes('result: "FAIL"'), "suite finalizer failure does not materialize a safe summary");
});

check("production suite-finalizer child writes one attested PASS summary", () => {
  const child = runProductionSuiteFinalizer("pass");
  assert(child.exitCode === 0,
    `suite-finalizer PASS exit mismatch: ${child.exitCode}\n${child.stderr}`);
  assertSuiteFinalizerSummary(child.summary, "PASS");
  assert(child.summary.visualMatrixProbes.length === 1,
    "suite-finalizer PASS did not preserve its injected matrix probe");
});

check("production suite-finalizer child writes one safe attested FAIL summary", () => {
  const child = runProductionSuiteFinalizer("matrix-failure");
  assert(child.exitCode === 1,
    `suite-finalizer FAIL exit mismatch: ${child.exitCode}\n${child.stderr}`);
  assertSuiteFinalizerSummary(child.summary, "FAIL");
  assert(child.summary.failure?.code === "SUITE_FINALIZER_FAILED",
    "suite-finalizer FAIL did not preserve its safe failure code");
  assert(child.summary.failure?.detail === "contract suite finalizer matrix failure" &&
    /^[a-f0-9]{64}$/.test(child.summary.failure?.detailSha256 || ""),
  "suite-finalizer FAIL did not preserve its redacted diagnostic detail and digest");
  assert(child.summary.visualMatrixProbes.length === 0,
    "suite-finalizer FAIL invented visual matrix probes");
});

for (const mode of ["probe-secret", "adapter-secret"]) {
  check(`production suite-finalizer child drops tainted ${mode} payload`, () => {
    const child = runProductionSuiteFinalizer(mode);
    assert(child.exitCode === 1,
      `${mode} secret-scan exit mismatch: ${child.exitCode}\n${child.stderr}`);
    assert(child.summary?.schema === "media-server.v390-ui-suite-finalizer.v1" &&
      child.summary.result === "FAIL",
    `${mode} did not write a safe finalizer FAIL summary`);
    assert(child.summary.selectedAdapter === null &&
      Array.isArray(child.summary.visualMatrixProbes) &&
      child.summary.visualMatrixProbes.length === 0,
    `${mode} retained a tainted adapter/probe projection`);
    assert(child.summary.secretArtifactIntegrity?.status === "FAIL" &&
      child.summary.secretArtifactIntegrity?.failureClass ===
        "retained-secret-summary-scan-failed",
    `${mode} did not preserve typed secret-scan failure evidence`);
    assert(!JSON.stringify(child.summary).includes("round2-finalizer-secret-canary"),
      `${mode} safe failure summary retained the canary`);
  });
}

check("production suite-finalizer child removes a secret-bearing disk artifact before release", () => {
  const child = runProductionSuiteFinalizer("disk-secret");
  assert(child.exitCode === 1,
    `disk-secret scan exit mismatch: ${child.exitCode}\n${child.stderr}`);
  assert(child.summary?.result === "FAIL" &&
    child.summary?.secretArtifactIntegrity?.status === "FAIL",
  "disk-secret did not write a safe typed FAIL summary");
  assert(child.secretArtifactExists === false,
    "suite-finalizer retained the secret-bearing disk artifact");
  assert(child.treeContainsCanary === false,
    "suite-finalizer output tree retained the disk canary");
});

try {
  check("pass child writes one attempted PASS summary", () => {
    const child = runContractChild("pass");
    assert(child.exitCode === 0, `pass child exit mismatch: ${child.exitCode}\n${child.stderr}`);
    assertCommonSummary(child.summary, "PASS");
    assert(child.summary.counts.pass === 1 && child.summary.counts.fail === 0,
      "pass child count mismatch");
    assert(child.summary.case.failureCensus.length === 0,
      "pass child unexpectedly recorded a failure");
    assert(child.summary.case.requestLifecycleEvaluation?.status === "PASS",
      "pass child lifecycle evaluation mismatch");
  });

  check("production case child removes a secret-bearing disk artifact before release", () => {
    const child = runContractChild("disk-secret");
    assert(child.exitCode === 1,
      `disk-secret case-child exit mismatch: ${child.exitCode}\n${child.stderr}`);
    assertCommonSummary(child.summary, "FAIL");
    assert(child.summary.case.failureCensus.some(item =>
      item.code === "SECRET_ARTIFACT_INTEGRITY_FAILED"),
    "disk-secret case-child did not retain typed scan failure evidence");
    assert(child.secretArtifactExists === false,
      "case child retained the secret-bearing disk artifact");
    assert(child.unrelatedArtifactExists === true,
      "case child removed an unrelated artifact");
    assert(child.treeContainsCanary === false,
      "case child output tree retained the disk canary");
  });

  for (const [mode, primaryCode, requiredCensusCode] of ordinaryModes) {
    check(`${mode} writes a valid one-attempt FAIL summary`, () => {
      const child = runContractChild(mode);
      assert(child.exitCode === 1,
        `${mode} ordinary failure exit mismatch: ${child.exitCode}\n${child.stderr}`);
      assertCommonSummary(child.summary, "FAIL");
      assert(child.summary.counts.pass === 0 && child.summary.counts.fail === 1,
        `${mode} failure count mismatch`);
      assert(child.summary.case.failureCode === primaryCode,
        `${mode} primary failure code mismatch`);
      assert(child.summary.case.failureCensus.some(item => item.code === requiredCensusCode),
        `${mode} required failure census code missing`);
      assert(!child.stderr.includes("V390_UI_CASE_CHILD_INFRA_FATAL"),
        `${mode} ordinary failure emitted infra-fatal marker`);
      assertJsonSafe(child.summary, mode);
    });
  }

  check("cleanup failure is appended without erasing the primary assertion", () => {
    const child = runContractChild("cleanup-error-after-assertion");
    const codes = child.summary.case.failureCensus.map(item => item.code);
    assert(JSON.stringify(codes) === JSON.stringify([
      "DOM_ASSERTION_FAILED",
      "CASE_RUNTIME_CLEANUP_FAILED",
    ]), `cleanup failure census ordering mismatch: ${codes.join(",")}`);
    assert(child.summary.case.cleanupAttestation?.pass === false &&
      child.summary.case.cleanupAttestation?.failureCode === "CASE_RUNTIME_CLEANUP_FAILED",
    "cleanup failure attestation mismatch");
  });

  for (const [mode, primaryCode] of [
    ["dom-multi-lifecycle-secret-error", "DOM_ASSERTION_FAILED"],
    ["api-multi-lifecycle-secret-error", "API_ASSERTION_FAILED"],
  ]) {
    check(`${mode} preserves the primary and every lifecycle failure in deterministic order`, () => {
      const child = runContractChild(mode);
      assert(child.exitCode === 1, `multi-lifecycle exit mismatch: ${child.exitCode}\n${child.stderr}`);
      assertCommonSummary(child.summary, "FAIL");
      const codes = child.summary.case.failureCensus.map(item => item.code);
      assert(JSON.stringify(codes) === JSON.stringify([
        primaryCode,
        "CAPTURE_ERROR",
        "RESPONSE_DUPLICATE",
      ]), `multi-lifecycle failure census ordering mismatch: ${codes.join(",")}`);
      assert(child.summary.case.requestLifecycleEvaluation?.failures?.length === 2,
        "multi-lifecycle safe projection was truncated");
      assertJsonSafe(child.summary, mode);
      const serialized = JSON.stringify(child.summary);
      for (const forbidden of [
        ...secretCanaries,
        "password",
        "Authorization",
        "cookie",
        "token",
      ]) {
        assert(!serialized.includes(forbidden),
          `multi-lifecycle summary retained forbidden secret material: ${forbidden}`);
      }
    });
  }

  for (const [mode, requiredCode] of [
    ["subdir-preflight-error", "CASE_CHILD_PREFLIGHT_FAILED"],
    ["adapter-bootstrap-error", "CASE_CHILD_ADAPTER_BOOTSTRAP_FAILED"],
    ["runtime-bootstrap-error", "CASE_CHILD_RUNTIME_BOOTSTRAP_FAILED"],
    ["source-binding-error", "CASE_CHILD_RUNNER_PROVENANCE_FAILED"],
    ["summary-build-error", "CASE_CHILD_SUMMARY_BUILD_FAILED"],
    ["summary-serialize-error", "CASE_CHILD_SUMMARY_SERIALIZE_FAILED"],
    ["release-secrets-error", "CASE_CHILD_SECRET_RELEASE_FAILED"],
  ]) {
    check(`${mode} still attempts one case and writes a valid FAIL summary`, () => {
      const child = runContractChild(mode);
      assert(child.exitCode === 1,
        `${mode} ordinary finalization exit mismatch: ${child.exitCode}\n${child.stderr}`);
      assertCommonSummary(child.summary, "FAIL", { allowIncompleteSourceBinding: mode === "source-binding-error" });
      assert(child.summary.case.failureCensus.some(item => item.code === requiredCode),
        `${mode} failure census missing ${requiredCode}`);
      assert(!child.stderr.includes("V390_UI_CASE_CHILD_INFRA_FATAL"),
        `${mode} incorrectly emitted infra-fatal marker`);
    });
  }

  check("retained-secret fallback discards a tainted lifecycle projection and scans final bytes", () => {
    const child = runContractChild("serialized-secret-lifecycle-fallback");
    assert(child.exitCode === 1,
      `serialized-secret fallback exit mismatch: ${child.exitCode}\n${child.stderr}`);
    assertCommonSummary(child.summary, "FAIL");
    const serialized = JSON.stringify(child.summary);
    assert(!secretCanaries.some(secret => serialized.includes(secret)),
      "serialized-secret fallback wrote a retained exact secret value");
    assert(child.summary.case.requestLifecycleEvaluation === null,
      "serialized-secret fallback reused the tainted lifecycle projection");
    assert(child.summary.case.failureCensus.some(item =>
      item.code === "CASE_CHILD_SUMMARY_SERIALIZE_FAILED"),
    "serialized-secret fallback failure was not censused");
  });

  check("a throwing retained-secret scanner cannot block or leak the independent summary", () => {
    const child = runContractChild("serialized-secret-scanner-throws");
    assert(child.exitCode === 1,
      `throwing secret scanner exit mismatch: ${child.exitCode}\n${child.stderr}`);
    assertCommonSummary(child.summary, "FAIL");
    const serialized = JSON.stringify(child.summary);
    assert(!secretCanaries.some(secret => serialized.includes(secret)),
      "throwing secret scanner wrote tainted lifecycle bytes");
    assert(child.summary.case.requestLifecycleEvaluation === null,
      "throwing secret scanner retained a lifecycle projection");
    assert(child.summary.case.failureCensus.some(item =>
      item.code === "CASE_CHILD_SUMMARY_SERIALIZE_FAILED"),
    "throwing secret scanner failure was not censused");
  });

  check("evaluator throw is exhaustively censused with primary and finalization failures", () => {
    const child = runContractChild("evaluator-throw-composite-error");
    assert(child.exitCode === 1,
      `evaluator throw exit mismatch: ${child.exitCode}\n${child.stderr}`);
    assertCommonSummary(child.summary, "FAIL");
    const codes = child.summary.case.failureCensus.map(item => item.code);
    assert(JSON.stringify(codes) === JSON.stringify([
      "DOM_ASSERTION_FAILED",
      "REQUEST_LIFECYCLE_EVALUATOR_FAILED",
      "CASE_RUNTIME_CLEANUP_FAILED",
      "BROWSER_CLOSE_FAILED",
      "LIFECYCLE_FINALIZATION_FAILED",
    ]), `evaluator throw exhaustive census ordering mismatch: ${codes.join(",")}`);
    assert(child.summary.case.requestLifecycleEvaluation === null,
      "evaluator throw invented a lifecycle projection");
  });

  for (const [mode, expectedPhase, expectedCode] of [
    ["subdir-preflight-error", "case-child-preflight", "CASE_CHILD_PREFLIGHT_FAILED"],
    ["adapter-bootstrap-error", "adapter-bootstrap", "CASE_CHILD_ADAPTER_BOOTSTRAP_FAILED"],
    ["runtime-bootstrap-error", "runtime-bootstrap", "CASE_CHILD_RUNTIME_BOOTSTRAP_FAILED"],
  ]) {
    check(`${mode} injection traverses and proves the production catch boundary`, () => {
      const child = runProductionPathChild(mode);
      assert(child.exitCode === 1,
        `${mode} production-path exit mismatch: ${child.exitCode}\n${child.stderr}`);
      assertCommonSummary(child.summary, "FAIL", {
        allowBuildSha: mode !== "subdir-preflight-error",
      });
      assert(child.summary.case.failurePhase === expectedPhase,
        `${mode} production-path failure phase mismatch: ${child.summary.case.failurePhase}`);
      assert(child.summary.case.failureCensus.some(item =>
        item.phase === expectedPhase && item.code === expectedCode),
      `${mode} production catch census mismatch`);
      assert(child.stdout.includes("case-child-"),
        `${mode} did not emit the production child summary output`);
    });
  }

  check("a failed child does not contaminate the next process", () => {
    const failed = runContractChild("api-assertion-error");
    const passed = runContractChild("pass");
    assert(failed.exitCode === 1 && failed.summary.case.status === "FAIL",
      "isolation setup failure did not fail locally");
    assert(passed.exitCode === 0 && passed.summary.case.status === "PASS" &&
      passed.summary.counts.attempted === 1,
    "next child process inherited prior failure state");
  });

  check("only summary write failure uses the dedicated infra-fatal marker", () => {
    const child = runContractChild("summary-write-failure", { blockSummaryTarget: true });
    assert(child.exitCode === 70,
      `summary-write failure exit mismatch: ${child.exitCode}\n${child.stderr}`);
    assert(child.summary === null, "summary-write failure unexpectedly produced a valid final summary");
    assert(child.stderr.trim() ===
      "V390_UI_CASE_CHILD_INFRA_FATAL:SUMMARY_WRITE_FAILED",
    "summary-write failure marker mismatch");
  });

  check("an unusable output root is the same dedicated summary-write infrastructure failure", () => {
    const outputRootFile = path.join(temporaryRoot, "output-root-is-file");
    fs.writeFileSync(outputRootFile, "blocked\n");
    const child = spawnSync(process.execPath, [
      runnerPath,
      "--case-child",
      "--case-id", "UI-001",
      "--output-dir", outputRootFile,
      "--contract-case-child-fixture", "pass",
    ], { cwd: rootDir, encoding: "utf8" });
    assert(child.status === 70, `unusable output root exit mismatch: ${child.status}\n${child.stderr}`);
    assert(child.stderr.trim() === "V390_UI_CASE_CHILD_INFRA_FATAL:SUMMARY_WRITE_FAILED",
      "unusable output root marker mismatch");
  });

  check("selection cardinality failure is not reported as an attempted case", () => {
    const variants = [
      [],
      ["--case-id", "UI-001", "--case-id", "UI-002"],
    ];
    for (const [index, caseArgs] of variants.entries()) {
      const outputDir = path.join(temporaryRoot, `selection-cardinality-${index}`);
      fs.mkdirSync(outputDir, { recursive: true });
      const child = spawnSync(process.execPath, [
        runnerPath,
        "--case-child",
        ...caseArgs,
        "--output-dir", outputDir,
        "--contract-case-child-fixture", "pass",
      ], { cwd: rootDir, encoding: "utf8" });
      assert(child.status === 2, `selection cardinality exit mismatch: ${child.status}`);
      assert(!fs.existsSync(path.join(outputDir, "summary.json")),
        "selection cardinality failure emitted a fake case summary");
    }
  });
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

const failedChecks = checks.filter(item => item.status === "FAIL");
for (const item of checks) console.log(`${item.status}: ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
console.log(`v3.9.0 case child isolation contract: ${checks.length - failedChecks.length}/${checks.length}`);
if (failedChecks.length > 0) process.exit(1);

function runContractChild(mode, { blockSummaryTarget = false } = {}) {
  const outputDir = path.join(temporaryRoot, `${mode}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const summaryPath = path.join(outputDir, "summary.json");
  if (blockSummaryTarget) fs.mkdirSync(summaryPath);
  const child = spawnSync(process.execPath, [
    runnerPath,
    "--case-child",
    "--case-id", "UI-001",
    "--output-dir", outputDir,
    "--contract-case-child-fixture", mode,
  ], { cwd: rootDir, encoding: "utf8" });
  let summary = null;
  try {
    summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  } catch {
    summary = null;
  }
  return {
    exitCode: Number.isInteger(child.status) ? child.status : 255,
    stdout: child.stdout || "",
    stderr: child.stderr || "",
    summary,
    secretArtifactExists: fs.existsSync(path.join(outputDir, "retained-secret.txt")),
    unrelatedArtifactExists: fs.existsSync(path.join(outputDir, "unrelated.txt")),
    treeContainsCanary: listRegularFiles(outputDir).some(filePath =>
      fs.readFileSync(filePath).includes("round5-case-child-secret-canary")),
  };
}

function runProductionPathChild(mode) {
  const outputDir = fs.mkdtempSync(path.join(rootDir, ".v390-case-child-path-contract-"));
  const buildPath = path.join(outputDir, "build-placeholder");
  const serverLogPath = path.join(outputDir, "server.log");
  fs.writeFileSync(buildPath, "contract build placeholder\n");
  fs.writeFileSync(serverLogPath, "contract server log\n");
  const summaryPath = path.join(outputDir, "summary.json");
  try {
    const child = spawnSync(process.execPath, [
      runnerPath,
      "--case-child",
      "--case-id", "UI-001",
      "--output-dir", outputDir,
      "--http-base", "http://127.0.0.1:1",
      "--server-log", serverLogPath,
      "--build-path", buildPath,
      "--contract-case-child-path-fixture", mode,
    ], { cwd: rootDir, encoding: "utf8" });
    let summary = null;
    try {
      summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    } catch {
      summary = null;
    }
    return {
      exitCode: Number.isInteger(child.status) ? child.status : 255,
      stdout: child.stdout || "",
      stderr: child.stderr || "",
      summary,
    };
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
}

function listRegularFiles(rootPath) {
  if (!fs.existsSync(rootPath)) return [];
  const files = [];
  const visit = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const candidate = path.join(current, entry.name);
      if (entry.isDirectory()) visit(candidate);
      else if (entry.isFile()) files.push(candidate);
    }
  };
  visit(rootPath);
  return files;
}

function runProductionSuiteFinalizer(mode) {
  const outputDir = fs.mkdtempSync(path.join(rootDir, ".v390-suite-finalizer-contract-"));
  const buildPath = path.join(outputDir, "build-placeholder");
  const serverLogPath = path.join(outputDir, "server.log");
  fs.writeFileSync(buildPath, "contract build placeholder\n");
  fs.writeFileSync(serverLogPath, "contract server log\n");
  const summaryPath = path.join(outputDir, "summary.json");
  try {
    const child = spawnSync(process.execPath, [
      runnerPath,
      "--suite-finalizer-child",
      "--parent-run-id", "contract-suite-finalizer-run",
      "--output-dir", outputDir,
      "--http-base", "http://127.0.0.1:1",
      "--server-log", serverLogPath,
      "--build-path", buildPath,
      "--contract-suite-finalizer-fixture", mode,
    ], {
      cwd: rootDir,
      encoding: "utf8",
      env: {
        ...process.env,
        MEDIA_SERVER_V390_UI_ROLE_SECRETS: JSON.stringify({
          roles: { operator: "round2-finalizer-secret-canary" },
          refs: {},
        }),
      },
    });
    let summary = null;
    try {
      summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    } catch {
      summary = null;
    }
    return {
      exitCode: Number.isInteger(child.status) ? child.status : 255,
      stdout: child.stdout || "",
      stderr: child.stderr || "",
      summary,
      secretArtifactExists: fs.existsSync(path.join(outputDir, "retained-secret.txt")),
      treeContainsCanary: listRegularFiles(outputDir).some(filePath =>
        fs.readFileSync(filePath).includes("round2-finalizer-secret-canary")),
    };
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
}

function assertSuiteFinalizerSummary(summary, expectedResult) {
  assert(summary?.schema === "media-server.v390-ui-suite-finalizer.v1",
    "suite-finalizer summary schema mismatch");
  assert(summary.result === expectedResult,
    `suite-finalizer result mismatch: ${summary?.result}`);
  assert(summary.runId === "contract-suite-finalizer-run",
    "suite-finalizer run binding mismatch");
  assert(summary.actualBrowserExecution === true && summary.automaticRetryCount === 0,
    "suite-finalizer execution/retry binding mismatch");
  assert(Array.isArray(summary.visualMatrixProbes),
    "suite-finalizer visual probe census is missing");
  assert(summary.secretArtifactIntegrity?.status === "PASS" &&
    summary.secretArtifactIntegrity?.verificationStage ===
      "suite-finalizer-secret-artifact-integrity" &&
    summary.secretArtifactIntegrity?.serializedSummaryScan?.status === "PASS" &&
    summary.secretArtifactIntegrity?.treeScan?.status === "PASS",
  "suite-finalizer final serialized/tree secret attestation is missing");
  const serialized = JSON.stringify(summary);
  assert(!serialized.includes("round2-finalizer-secret-canary"),
    "suite-finalizer summary retained the injected secret");
}

function assertCommonSummary(summary, expectedStatus, {
  allowIncompleteSourceBinding = false,
  allowBuildSha = false,
} = {}) {
  assert(summary?.schema === "media-server.v390-ui-case-child.v1", "child summary schema mismatch");
  assert(summary.result === expectedStatus && summary.case?.status === expectedStatus,
    "child summary status mismatch");
  assert(summary.selection?.caseId === "UI-001" &&
    JSON.stringify(summary.selection?.selectedIds) === JSON.stringify(["UI-001"]),
  "child exact-one selection mismatch");
  assert(JSON.stringify(summary.counts) === JSON.stringify({
    selected: 1,
    attempted: 1,
    pass: expectedStatus === "PASS" ? 1 : 0,
    fail: expectedStatus === "FAIL" ? 1 : 0,
    notRun: 0,
    unsupported: 0,
    runnerAbort: 0,
  }), "child count invariant mismatch");
  assert(summary.releaseEvidenceEligible === false && summary.uiFulltestPass === false,
    "child summary exceeded its evidence authority");
  assert(summary.case.cleanupAttestation &&
    typeof summary.case.cleanupAttestation.pass === "boolean",
  "child cleanup attestation missing");
  assert(Number.isInteger(summary.timing?.startedAtMs) &&
    Number.isInteger(summary.timing?.finishedAtMs) &&
    Number.isInteger(summary.timing?.durationMs) &&
    summary.timing.finishedAtMs >= summary.timing.startedAtMs,
  "child timing evidence invalid");
  assert(summary.sourceBinding?.baselineSourceCommitSha ===
    "327afe0d4b3282400f1925252c59a53b87827224",
  "child baseline source commit binding mismatch");
  assert(/^[0-9a-f]{40}$/.test(String(summary.sourceBinding?.verificationCommitSha || "")),
    "child verification commit binding missing");
  assert(summary.sourceBinding.verificationCommitSha === currentHeadSha(),
    "child verification commit binding drifted from HEAD");
  assert(/^[0-9a-f]{64}$/.test(String(summary.sourceBinding?.manifestSha256 || "")),
    "child manifest source binding missing");
  const manifest = JSON.parse(fs.readFileSync(
    path.join(rootDir, "test/fixtures/v390_ui_native_exact_cases.json"),
    "utf8",
  ));
  assert(summary.sourceBinding.manifestSha256 === sha256Text(stableJson(manifest)),
    "child manifest source binding drifted");
  assert(allowBuildSha
    ? /^[0-9a-f]{64}$/.test(String(summary.sourceBinding.buildSha256 || ""))
    : summary.sourceBinding.buildSha256 === "",
  "contract child build source binding mismatch");
  if (!allowIncompleteSourceBinding) {
    const expectedFiles = Object.fromEntries(Object.entries(implementationPaths).map(([key, filePath]) => [
      key,
      { path: path.relative(rootDir, filePath), sha256: sha256File(filePath) },
    ]));
    assert(JSON.stringify(summary.sourceBinding?.implementationFiles) === JSON.stringify(expectedFiles),
      "child implementation file source bindings drifted");
    assert(summary.sourceBinding?.implementationSha256 === sha256Text(stableJson(expectedFiles)),
      "child composite implementation source binding drifted");
  }
}

function assertJsonSafe(summary, mode) {
  const serialized = JSON.stringify(summary);
  assert(!serialized.includes("correlationId") &&
    !serialized.includes("raw-request-object") &&
    !serialized.includes("raw-response-object") &&
    !/password|authorization|cookie/i.test(serialized),
  `${mode} summary exposed raw or sensitive material`);
}

function check(name, fn) {
  try {
    fn();
    checks.push({ name, status: "PASS", detail: "" });
  } catch (error) {
    checks.push({ name, status: "FAIL", detail: error instanceof Error ? error.message : String(error) });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function currentHeadSha() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: rootDir, encoding: "utf8" });
  assert(result.status === 0, `cannot resolve current HEAD: ${result.stderr || result.stdout}`);
  return String(result.stdout || "").trim();
}

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function sha256Text(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
