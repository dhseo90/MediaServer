#!/usr/bin/env node
// 파일 용도: Policy v4 producer가 raw artifact만 수집하고 자격 PASS를 만들지 않는지 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { evaluateEvidence } from "./ui_fulltest_evidence_policy_v4_lib.mjs";
import { qualifyRawCase } from "./v390_ui_policy_v4_independent_qualifier.mjs";
import { producePolicyV4Evidence } from "./v390_ui_policy_v4_evidence_producer.mjs";

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
const item = manifestSource.cases.find(value => value.caseId === "UI-002");
const canonicalCase = canonicalSource.cases.find(value => value.testId === item.caseId);
const canonical = { ...canonicalSource, cases: [canonicalCase] };
const manifest = { ...manifestSource, cases: [item] };
const completion = item.workflow.expectedResults[0].completion;
const screenshotPath = path.join(outputDir, "screenshots", `${item.caseId}.png`);
const tracePath = path.join(outputDir, "traces", `${item.caseId}.json`);
const consolePath = path.join(outputDir, "logs", `${item.caseId}.json`);
const serverLogPath = path.join(outputDir, "server.log");
fs.writeFileSync(screenshotPath, png1x1());
writeJson(tracePath, makeRawTrace(item));
writeJson(consolePath, { schema: "media-server.v390-ui-native-browser-console.v1", caseId: item.caseId, entries: [] });
fs.writeFileSync(serverLogPath, "unrelated server line\n", "utf8");
const now = Date.now();

const produced = produce(makeResult());

check("producer emits captured raw envelope without qualification claims", () => {
  const summary = produced.summary;
  const value = summary.cases[0];
  assert(summary.result === "CAPTURED" && summary.uiFulltestPass === false, "raw suite boundary missing");
  assert(summary.sourceBinding.sourceFingerprintOnly === true && summary.sourceBinding.currentSourceVerified === undefined,
    "producer source verification self-claim remains");
  assert(value.rawOutcome === "completed", "raw outcome missing");
  for (const forbidden of ["status", "evidenceStatus", "interaction", "completionOracle", "visibleAssertions", "manualIntervention"]) {
    assert(!Object.hasOwn(value, forbidden), `producer emitted qualification field: ${forbidden}`);
  }
  assert(value.rawEvidence.actionId === completion.actionId && value.rawEvidence.correlationId === completion.correlationId,
    "raw primary reference binding missing");
});

check("producer preserves the native trace byte-for-byte", () => {
  const value = produced.summary.cases[0];
  const copied = path.join(outputDir, value.artifacts.trace.path);
  assert(fs.readFileSync(copied).equals(fs.readFileSync(tracePath)), "raw native trace was rewritten");
  assert(readJson(copied).schema === "media-server.v390-ui-native-interaction-trace.v2", "raw trace schema drift");
});

check("producer visual and cross-cutting artifacts remain unqualified", () => {
  const summary = produced.summary;
  const value = summary.cases[0];
  assert(value.visualEvidence.schema === "media-server.ui-raw-visual-capture.v1" &&
    value.visualEvidence.qualificationStatus === "unqualified-raw-capture", "raw visual boundary missing");
  const visual = readJson(path.join(outputDir, value.artifacts.visualDiff.path));
  assert(visual.qualificationStatus === "unqualified-raw-capture" && visual.status === undefined,
    "producer emitted visual status");
  assert(summary.crossCuttingObligations.every(entry => entry.qualificationStatus === "unqualified-raw-capture" && entry.status === undefined),
    "producer emitted cross-cutting status");
});

check("producer cannot repair a wrong raw request with runner PASS", () => {
  const trace = makeRawTrace(item);
  trace.rawPrimaryObservations[0].networkEntries[1].method = "DELETE";
  const result = qualifyRawCase({
    trace,
    requested: item.requestedProjection,
    observed: item.observedProjection,
    canonicalCase,
    nativeCase: item,
  });
  assert(result.qualified === false && result.reasons.includes("raw-primary-request-method-mismatch"),
    "wrong raw request became qualified");
});

check("producer rejects legacy or missing raw trace structure", () => {
  for (const mutation of [
    value => { value.schema = "media-server.v390-ui-native-interaction-trace.v1"; },
    value => { value.rawPrimaryObservations = []; },
    value => { value.observed.accountRole = "operator"; },
  ]) {
    const trace = makeRawTrace(item);
    mutation(trace);
    writeJson(tracePath, trace);
    let failed = false;
    try {
      produce(makeResult());
    } catch (error) {
      failed = /raw native|raw primary/.test(String(error.message));
    }
    assert(failed, "malformed raw trace was collected");
  }
  writeJson(tracePath, makeRawTrace(item));
});

check("producer creates contained attested raw artifacts", () => {
  const value = produced.summary.cases[0];
  for (const name of ["screenshot", "trace", "browserConsole", "serverLog", "visualMeasurement", "visualDiff", "redactionScan"]) {
    const artifact = value.artifacts[name];
    const resolved = path.resolve(outputDir, artifact.path);
    assert(isInside(outputDir, resolved) && fs.existsSync(resolved), `${name} escaped or is missing`);
    assert(artifact.caseId === item.caseId && artifact.correlationId === completion.correlationId,
      `${name} raw binding mismatch`);
  }
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
  assert(evaluation.uiFulltestPass === false && evaluation.reasons.includes("contract-fixture-is-not-execution-evidence"),
    "contract fixture became execution evidence");
});

check("producer rejects artifact path escape", () => {
  const result = makeResult();
  result.screenshotPath = path.join(os.tmpdir(), "escape.png");
  let failed = false;
  try {
    produce(result);
  } catch (error) {
    failed = String(error.message).includes("escapes artifact root");
  }
  assert(failed, "artifact path escape was accepted");
});

const failed = checks.filter(value => !value.ok);
for (const value of checks) console.log(`[${value.ok ? "pass" : "fail"}] ${value.name}${value.error ? `: ${value.error}` : ""}`);
console.log("\n== v3.9.0 Policy v4 producer contract ==");
console.log(`- pass: ${checks.length - failed.length}`);
console.log(`- fail: ${failed.length}`);
console.log("- actualExact424BrowserExecution: not-run-by-this-contract");
cleanup();
process.exit(failed.length === 0 ? 0 : 1);

function produce(result) {
  return producePolicyV4Evidence({
    rootDir,
    outputDir,
    manifest,
    canonical,
    results: [result],
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
}

function makeResult() {
  return {
    caseId: item.caseId,
    featureId: item.featureId,
    status: "PASS",
    requested: structuredClone(item.requestedProjection),
    observed: structuredClone(item.observedProjection),
    visibleAssertion: { selector: completion.controlSelector },
    visualMeasurement: makeMeasurement(item),
    screenshotPath,
    tracePath,
    browserConsolePath: consolePath,
  };
}

function makeRawTrace(value) {
  const expected = value.workflow.expectedResults[0].completion;
  const requestId = `${value.caseId}:raw-request-1`;
  const selector = expected.controlSelector;
  return {
    schema: "media-server.v390-ui-native-interaction-trace.v2",
    caseId: value.caseId,
    featureId: value.featureId,
    dispatch: "playwright-native",
    requested: structuredClone(value.requestedProjection),
    observed: structuredClone(value.observedProjection),
    actions: [
      { actionId: expected.actionId, kind: expected.actionKind, controlSelector: selector, dispatch: "playwright-native" },
      { actionId: `${value.caseId}:verify-independent-readback`, kind: "verify-independent-readback", linkedPrimaryActionId: expected.actionId, dispatch: "playwright-native" },
    ],
    rawPrimaryObservations: [{
      schema: "media-server.v390-ui-raw-primary-observation.v1",
      action: { actionId: expected.actionId, actionKind: expected.actionKind, executedKind: "submit", controlSelector: selector, correlationId: expected.correlationId, dispatch: "playwright-native" },
      before: { selector, exists: true, visible: true, disabled: false },
      after: { selector, exists: true, visible: true, disabled: false },
      navigation: null,
      networkEntries: [
        { phase: "request-start", requestId, correlationId: expected.correlationId, correlationSource: "request-header", method: expected.request.method, status: 0, url: `http://localhost${expected.request.urlPath}` },
        { phase: "response", requestId, correlationId: expected.correlationId, correlationSource: "request-header", method: expected.request.method, status: expected.request.allowedStatuses[0], url: `http://localhost${expected.request.urlPath}` },
      ],
      semanticReadback: {
        schema: "media-server.v390-ui-semantic-readback.v2",
        identity: expected.readbackIdentity,
        actionId: expected.actionId,
        correlationId: expected.correlationId,
        expectedBehaviorSha256: expected.expectedBehaviorSha256,
        observationSource: "browser-dom",
        selector,
        observation: { actual: structuredClone(expected.readbackExpectation) },
      },
    }],
  };
}

function makeMeasurement(value) {
  const targetSelector = value.controlAction.targetSelector || "body";
  return {
    schema: "media-server.ui-browser-visual-measurement.v2",
    caseBinding: { canonicalCaseId: value.caseId, featureId: value.featureId, screenId: value.caseId, screenRoute: value.screenRoute, accountRole: value.accountRole, targetSelector },
    route: value.screenRoute,
    accountRole: value.accountRole,
    requestedTheme: value.theme,
    appliedTheme: value.theme,
    mediaTheme: value.theme,
    viewport: { ...value.viewport, devicePixelRatio: 1 },
    document: { scrollWidth: value.viewport.width, scrollHeight: value.viewport.height, clientWidth: value.viewport.width, clientHeight: value.viewport.height },
    target: { selector: targetSelector, visible: true, rect: { left: 0, top: 0, right: value.viewport.width, bottom: 100, width: value.viewport.width, height: 100 } },
    textSamples: [],
    focusSamples: [],
    liveVideo: null,
  };
}

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
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
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
