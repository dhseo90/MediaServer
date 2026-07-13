#!/usr/bin/env node
// 파일 용도: Policy v4 producer의 actual schema/attestation과 fixture 비승격 경계를 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { evaluateEvidence } from "./ui_fulltest_evidence_policy_v4_lib.mjs";
import { producePolicyV4Evidence } from "./v390_ui_policy_v4_evidence_producer.mjs";
import {
  canonicalRequestedProjection,
  expectedRuntimeObservation,
} from "./v390_ui_requested_observed_schema.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tempParent = path.join(rootDir, ".tmp-v390-policy-producer-contract");
const outputDir = path.join(tempParent, "run");
const checks = [];
fs.rmSync(tempParent, { recursive: true, force: true });
fs.mkdirSync(path.join(outputDir, "screenshots"), { recursive: true });
fs.mkdirSync(path.join(outputDir, "traces"), { recursive: true });
fs.mkdirSync(path.join(outputDir, "logs"), { recursive: true });
const cleanup = () => fs.rmSync(tempParent, { recursive: true, force: true });
process.on("exit", cleanup);

const canonicalSource = readJson(path.join(rootDir, "test/fixtures/ui_fulltest_case_manifest_policy_v4.json"));
const manifestSource = readJson(path.join(rootDir, "test/fixtures/v390_ui_native_exact_cases.json"));
const canonical = { ...canonicalSource, cases: canonicalSource.cases.slice(0, 1) };
const manifest = { ...manifestSource, cases: manifestSource.cases.slice(0, 1) };
const item = manifest.cases[0];
const screenshotPath = path.join(outputDir, "screenshots", `${item.caseId}.png`);
const tracePath = path.join(outputDir, "traces", `${item.caseId}.json`);
const consolePath = path.join(outputDir, "logs", `${item.caseId}.json`);
const serverLogPath = path.join(outputDir, "server.log");
fs.writeFileSync(screenshotPath, png1x1());
writeJson(tracePath, { schema: "media-server.v390-ui-native-interaction-trace.v1", caseId: item.caseId });
writeJson(consolePath, { schema: "media-server.v390-ui-native-browser-console.v1", caseId: item.caseId, entries: [] });
fs.writeFileSync(serverLogPath, `${item.caseId}:navigation GET ${item.screenRoute} 200\n`, "utf8");
const now = Date.now();
const produced = producePolicyV4Evidence({
  rootDir,
  outputDir,
  manifest,
  canonical,
  results: [{
    caseId: item.caseId,
    featureId: item.featureId,
    status: "PASS",
    requested: canonicalRequestedProjection(item),
    observed: expectedRuntimeObservation(item),
    navigation: { status: 200 },
    completionOracle: [{
      pass: true,
      source: "endpoint-dom",
      correlationId: `${item.caseId}:navigation`,
      beforeDigest: "a".repeat(64),
      afterDigest: "b".repeat(64),
      networkResponses: [{
        requestId: "contract-request-1",
        correlationId: `${item.caseId}:navigation`,
        method: "GET",
        status: 200,
        url: `http://127.0.0.1${item.screenRoute}`,
      }],
    }],
    visibleAssertion: { pass: true, visible: true, selector: "body" },
    screenshotPath,
    tracePath,
    browserConsolePath: consolePath,
  }],
  selectedAdapter: {
    tool: "playwright",
    engine: "playwright-native",
    fallbackUsed: false,
    capabilities: ["wait", "query", "assert", "click", "type", "select", "evaluate", "screenshot"],
  },
  startedAt: new Date(now - 1000).toISOString(),
  finishedAt: new Date(now).toISOString(),
  buildPath: path.join(rootDir, "VERSION"),
  runnerPath: path.join(rootDir, "scripts/internal/run_v390_ui_native_exact_cases.mjs"),
  serverLogPath,
  contractFixture: true,
});

check("producer writes v4 actual schema and direct source binding", () => {
  const summary = produced.summary;
  assert(summary.schema === "media-server.ui-automation-evidence.v4", "v4 summary schema missing");
  assert(summary.fixture === false && summary.contractFixture === true, "contract fixture boundary missing");
  assert(summary.executionKind === "actual-native-visible-dom", "actual execution kind missing");
  assert(summary.sourceBinding.runnerPath === "scripts/internal/run_v390_ui_native_exact_cases.mjs", "runner source binding missing");
  assert(summary.sourceBinding.nativeExactManifestPath === "test/fixtures/v390_ui_native_exact_cases.json",
    "native manifest source binding missing");
  assert(summary.coverage.targetCount === 1 && summary.cases.length === 1, "contract scoped count mismatch");
  assert(summary.cases[0].requestedObservedSchema === "media-server.v390-ui-requested-observed-envelope.v1",
    "typed requested/observed envelope missing");
});

check("producer rejects missing observed and legacy aliases", () => {
  for (const mutation of [
    result => { delete result.observed; },
    result => { result.requested.role = result.requested.accountRole; },
    result => { result.observed.route = result.observed.screenRoute; },
  ]) {
    const source = produced.summary.cases[0];
    const result = {
      caseId: item.caseId,
      featureId: item.featureId,
      status: "PASS",
      requested: structuredClone(source.requested),
      observed: structuredClone(source.observed),
    };
    mutation(result);
    let failed = false;
    try {
      producePolicyV4Evidence({
        rootDir,
        outputDir,
        manifest,
        canonical,
        results: [result],
        selectedAdapter: produced.summary.selectedAdapter,
        startedAt: new Date(now - 1000).toISOString(),
        finishedAt: new Date(now).toISOString(),
        buildPath: path.join(rootDir, "VERSION"),
        runnerPath: path.join(rootDir, "scripts/internal/run_v390_ui_native_exact_cases.mjs"),
        serverLogPath,
        contractFixture: true,
      });
    } catch (error) {
      failed = /requested|observed/.test(String(error.message));
    }
    assert(failed, "producer accepted a missing/aliased requested-observed projection");
  }
});

check("producer creates attested case and suite artifacts inside the run root", () => {
  const summary = produced.summary;
  const caseItem = summary.cases[0];
  for (const name of ["screenshot", "trace", "browserConsole", "serverLog", "visualDiff", "redactionScan"]) {
    const ref = caseItem.artifacts[name];
    assert(ref?.schema === undefined, `${name} artifact metadata must not masquerade as evidence ref`);
    const resolved = path.resolve(outputDir, ref.path);
    assert(isInside(outputDir, resolved) && fs.existsSync(resolved), `${name} escaped or is missing`);
    assert(caseItem[name === "visualDiff" ? "visualEvidence" : name === "redactionScan" ? "security" : "completionOracle"] !== undefined,
      `${name} consumer field missing`);
  }
  assert(summary.crossCuttingObligations.length === 7, "cross-cutting artifact count mismatch");
  assert(summary.crossCuttingObligations.every(value => value.evidenceRef?.schema === "media-server.ui-evidence-ref.v1"),
    "cross-cutting evidence refs are not attested");
  assert(summary.security.evidenceRef?.schema === "media-server.ui-evidence-ref.v1", "suite redaction ref is not attested");
});

check("step 43 keeps visual and acceptance cleanup unqualified", () => {
  const summary = produced.summary;
  assert(summary.cases[0].visualEvidence.status === "FAIL" && summary.cases[0].visualEvidence.reviewRequired === true,
    "visual evidence was self-declared PASS before REVIEW3-44");
  assert(summary.crossCuttingObligations.every(value => value.status === "FAIL" && value.reviewRequired === true),
    "cross-cutting evidence was self-declared PASS before REVIEW3-44");
  assert(summary.cleanup.serversStopped === false && summary.cleanup.portsClean === false,
    "standalone runner claimed acceptance-owned cleanup");
  assert(summary.uiFulltestPass === false, "producer contract became UI fulltest PASS");
});

check("contract fixture cannot become execution evidence", () => {
  const policy = readJson(path.join(rootDir, "test/fixtures/ui_fulltest_evidence_policy_v4.json"));
  const evaluation = evaluateEvidence(policy, produced.summary, {
    rootDir,
    verifyArtifacts: true,
    contractMode: false,
    verifyCurrentSource: false,
    now: new Date(),
  });
  assert(evaluation.uiFulltestPass === false, "contract fixture became UI fulltest PASS");
  assert(evaluation.reasons.includes("contract-fixture-is-not-execution-evidence"), "contract fixture rejection missing");
});

check("producer rejects artifact path escape", () => {
  let failed = false;
  try {
    producePolicyV4Evidence({
      rootDir,
      outputDir,
      manifest,
      canonical,
      results: [{
        caseId: item.caseId,
        featureId: item.featureId,
        status: "PASS",
        requested: produced.summary.cases[0].requested,
        observed: produced.summary.cases[0].observed,
        completionOracle: [{ pass: true, source: "endpoint-dom", correlationId: `${item.caseId}:navigation`, networkResponses: [] }],
        visibleAssertion: { pass: true, visible: true, selector: "body" },
        screenshotPath: path.join(os.tmpdir(), "escape.png"),
        tracePath,
        browserConsolePath: consolePath,
      }],
      selectedAdapter: produced.summary.selectedAdapter,
      startedAt: new Date(now - 1000).toISOString(),
      finishedAt: new Date(now).toISOString(),
      buildPath: path.join(rootDir, "VERSION"),
      runnerPath: path.join(rootDir, "scripts/internal/run_v390_ui_native_exact_cases.mjs"),
      serverLogPath,
      contractFixture: true,
    });
  } catch (error) {
    failed = String(error.message).includes("escapes artifact root");
  }
  assert(failed, "artifact path escape was accepted");
});

const failed = checks.filter(item => !item.ok);
for (const item of checks) console.log(`[${item.ok ? "pass" : "fail"}] ${item.name}${item.error ? `: ${item.error}` : ""}`);
console.log("\n== v3.9.0 Policy v4 producer contract ==");
console.log(`- pass: ${checks.length - failed.length}`);
console.log(`- fail: ${failed.length}`);
console.log("- actualExact424BrowserExecution: not-run-by-this-contract");
cleanup();
process.exit(failed.length === 0 ? 0 : 1);

function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function isInside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function png1x1() {
  return Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHnOcQAAAAABJRU5ErkJggg==", "base64");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
