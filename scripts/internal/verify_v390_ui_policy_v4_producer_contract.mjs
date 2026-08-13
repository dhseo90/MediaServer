#!/usr/bin/env node
// 파일 용도: Policy v4 producer가 raw artifact만 수집하고 자격 PASS를 만들지 않는지 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { evaluateEvidence } from "./ui_fulltest_evidence_policy_v4_lib.mjs";
import { qualifyRawCase } from "./v390_ui_policy_v4_independent_qualifier.mjs";
import {
  assertPolicyV4ArtifactRoot,
  evaluateCanonicalParentPolicyV4,
  producePolicyV4Evidence,
} from "./v390_ui_policy_v4_evidence_producer.mjs";
import {
  buildEventMarkerFlowEvidence,
  buildEvt004MarkerStageEvidence,
} from "./v390_ui_exact_oracle_runtime.mjs";
import { buildDiagnosticMarkerFileStageEvidence } from "./v390_ui_case_runtime.mjs";
import { buildDiagnosticMarkerResponseStageEvidence } from "./v390_ui_native_adapter.mjs";
import { qualifyBrowserConsoleMessages } from "./v390_ui_console_evidence.mjs";

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
const evt004Item = manifestSource.cases.find(value => value.caseId === "EVT-004");
const evt004CanonicalCase =
  canonicalSource.cases.find(value => value.testId === evt004Item.caseId);
const evt004Canonical = { ...canonicalSource, cases: [evt004CanonicalCase] };
const evt004Manifest = { ...manifestSource, cases: [evt004Item] };
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

check("canonical parent Policy qualification requires validated complete census and exact rows", () => {
  const ids = canonicalSource.cases.map(value => value.testId);
  const rows = ids.map(testId => ({ testId, qualified: true }));
  const missingCensus = evaluateCanonicalParentPolicyV4({
    canonicalParentValidation: { eligible: true, reasons: [] },
    canonicalCaseIds: ids,
    policyRows: rows,
  });
  assert(missingCensus.policyQualified === false && missingCensus.uiFulltestPass === false,
    "Policy qualification accepted a fabricated eligible flag without censusComplete");
  const eligible = { censusComplete: true, eligible: true, reasons: [] };
  const qualified = evaluateCanonicalParentPolicyV4({
    canonicalParentValidation: eligible,
    canonicalCaseIds: ids,
    policyRows: rows,
  });
  assert(qualified.policyEligible === true && qualified.policyQualified === true &&
    qualified.qualifiedCaseCount === 424 && qualified.uiFulltestPass === true,
  "exact eligible canonical parent with 424 qualified rows did not qualify");
  for (const candidate of [
    rows.slice(0, 423),
    [...rows.slice(0, 423), structuredClone(rows[0])],
    [rows[1], rows[0], ...rows.slice(2)],
    rows.map((row, index) => index === 17 ? { ...row, qualified: false } : row),
  ]) {
    const rejected = evaluateCanonicalParentPolicyV4({
      canonicalParentValidation: eligible,
      canonicalCaseIds: ids,
      policyRows: candidate,
    });
    assert(rejected.policyQualified === false && rejected.uiFulltestPass === false,
      "partial/duplicate/reordered/unqualified Policy rows were accepted");
  }
  const failedBatch = evaluateCanonicalParentPolicyV4({
    canonicalParentValidation: { censusComplete: true, eligible: false, reasons: [] },
    canonicalCaseIds: ids,
    policyRows: rows,
  });
  assert(failedBatch.policyEligible === false && failedBatch.policyQualified === false &&
    failedBatch.uiFulltestPass === false,
  "complete failure census became Policy eligible or fulltest PASS");
});

check("producer emits captured raw envelope without qualification claims", () => {
  const summary = produced.summary;
  const value = summary.cases[0];
  assert(summary.result === "CAPTURED" && summary.uiFulltestPass === false, "raw suite boundary missing");
  assert(summary.sourceBinding.sourceFingerprintOnly === true && summary.sourceBinding.currentSourceVerified === undefined,
    "producer source verification self-claim remains");
  const nativeManifestPath = path.join(rootDir, "test/fixtures/v390_ui_native_exact_cases.json");
  const expectedFileSha256 = createHash("sha256").update(fs.readFileSync(nativeManifestPath)).digest("hex");
  const expectedStableSha256 = createHash("sha256")
    .update(canonicalStableJson(readJson(nativeManifestPath))).digest("hex");
  assert(summary.sourceBinding.nativeExactManifestSha256 === expectedFileSha256,
    "producer native manifest file digest drifted");
  assert(summary.sourceBinding.nativeExactManifestStableSha256 === expectedStableSha256,
    "producer canonical native manifest digest is missing or incorrect");
  assert(value.rawOutcome === "completed", "raw outcome missing");
  for (const forbidden of ["status", "evidenceStatus", "interaction", "completionOracle", "visibleAssertions", "manualIntervention"]) {
    assert(!Object.hasOwn(value, forbidden), `producer emitted qualification field: ${forbidden}`);
  }
  assert(value.rawEvidence.actionId === completion.actionId && value.rawEvidence.correlationId === completion.correlationId,
    "raw primary reference binding missing");
});

check("core Policy evaluator rejects actual full-suite evidence without canonical parent binding", () => {
  const policy = readJson(path.join(rootDir, "test/fixtures/ui_fulltest_evidence_policy_v4.json"));
  const candidate = structuredClone(produced.summary);
  candidate.contractFixture = false;
  candidate.canonicalParentBinding = null;
  const evaluation = evaluateEvidence(policy, candidate, {
    rootDir,
    verifyArtifacts: false,
    contractMode: false,
    verifyCurrentSource: false,
    now: new Date(),
  });
  assert(evaluation.evidenceEligibility === "ineligible" &&
    evaluation.reasons.includes("canonical-parent-binding-missing"),
  "general producer evidence without canonical parent binding became Policy eligible");
});

check("core Policy evaluator rejects a hash-valid synthetic canonical parent without child refs", () => {
  const policy = readJson(path.join(rootDir, "test/fixtures/ui_fulltest_evidence_policy_v4.json"));
  const candidate = structuredClone(produced.summary);
  candidate.contractFixture = false;
  candidate.fixture = false;
  candidate.actualBrowserExecution = true;
  candidate.coverage = {
    targetCount: 424, attempted: 424, pass: 424, captured: 424,
    fail: 0, notRun: 0, unsupported: 0, unapprovedExclusions: 0,
    manualIntervention: 0, obligationIds: canonicalSource.cases.map(value => value.testId),
  };
  const runId = "round2-synthetic-parent";
  const sourceBinding = {
    verificationCommitSha: candidate.sourceBinding.gitCommit,
    manifestSha256: candidate.sourceBinding.nativeExactManifestStableSha256,
    buildSha256: candidate.sourceBinding.buildSha256,
    implementationFiles: {
      runner: {
        path: "scripts/internal/run_v390_ui_native_exact_cases.mjs",
        sha256: candidate.sourceBinding.runnerSha256,
      },
    },
  };
  const counts = { selected: 424, attempted: 424, pass: 424, fail: 0,
    notRun: 0, unsupported: 0, runnerAbort: 0 };
  const parentPath = path.join(outputDir, "synthetic-parent.json");
  const parent = {
    schema: "media-server.v390-ui-canonical-parent.v1",
    result: "PASS",
    firstFailure: null,
    actualBrowserExecution: true,
    runBinding: { runId },
    sourceBinding,
    counts,
    suiteFinalizer: { status: "PASS" },
    cases: canonicalSource.cases.map(value => ({ caseId: value.testId, status: "PASS" })),
  };
  const serialized = `${JSON.stringify(parent, null, 2)}\n`;
  fs.writeFileSync(parentPath, serialized, { mode: 0o600 });
  candidate.canonicalParentBinding = {
    schema: parent.schema,
    runId,
    counts,
    sourceBinding,
    parentSummaryPath: path.relative(rootDir, parentPath),
    parentSummarySha256: createHash("sha256").update(serialized).digest("hex"),
  };
  const evaluation = evaluateEvidence(policy, candidate, {
    rootDir,
    verifyArtifacts: false,
    contractMode: false,
    verifyCurrentSource: false,
    now: new Date(),
  });
  assert(evaluation.reasons.includes("canonical-parent-binding-strict-validation-failed"),
    "hash-valid synthetic parent bypassed core strict child/ref validation");
  assert(!evaluation.reasons.includes("canonical-parent-binding-source-digest-mismatch"),
    "current canonical parent implementationFiles runner digest was rejected");
  assert(evaluation.reasons.includes("canonical-parent-binding-expected-branch-missing"),
    "core Policy silently trusted the parent-claimed verification branch");
  candidate.canonicalParentBinding.sourceBinding.verificationBranch = "forged-self-consistent-branch";
  parent.sourceBinding.verificationBranch = "forged-self-consistent-branch";
  fs.writeFileSync(parentPath, `${JSON.stringify(parent, null, 2)}\n`, { mode: 0o600 });
  candidate.canonicalParentBinding.parentSummarySha256 = createHash("sha256")
    .update(fs.readFileSync(parentPath)).digest("hex");
  const wrongBranch = evaluateEvidence(policy, candidate, {
    rootDir,
    verifyArtifacts: false,
    contractMode: false,
    verifyCurrentSource: false,
    expectedVerificationBranch: "independent-current-branch",
    now: new Date(),
  });
  assert(wrongBranch.reasons.includes("canonical-parent-binding-verification-branch-mismatch"),
    "self-consistent forged parent branch bypassed the independent expected branch");
});

check("core Policy binds parent manifest to canonical digest while retaining file integrity", () => {
  const policy = readJson(path.join(rootDir, "test/fixtures/ui_fulltest_evidence_policy_v4.json"));
  const candidate = structuredClone(produced.summary);
  const fileDigest = candidate.sourceBinding.nativeExactManifestSha256;
  const stableDigest = candidate.sourceBinding.nativeExactManifestStableSha256;
  assert(/^[a-f0-9]{64}$/.test(fileDigest) && /^[a-f0-9]{64}$/.test(stableDigest),
    "native manifest dual digest was not produced");
  const evaluation = evaluateEvidence(policy, candidate, {
    rootDir,
    verifyArtifacts: false,
    contractMode: true,
    verifyCurrentSource: false,
    now: new Date(),
  });
  assert(!evaluation.reasons.includes("source-binding-nativeExactManifestStableSha256-missing") &&
    !evaluation.reasons.includes("source-binding-nativeExactManifestStableSha256-drift"),
  "canonical native manifest digest was rejected");
  candidate.sourceBinding.nativeExactManifestStableSha256 = "0".repeat(64);
  const drifted = evaluateEvidence(policy, candidate, {
    rootDir,
    verifyArtifacts: false,
    contractMode: true,
    verifyCurrentSource: false,
    now: new Date(),
  });
  assert(drifted.reasons.includes("source-binding-nativeExactManifestStableSha256-drift"),
    "canonical native manifest digest drift was accepted");
});

check("canonical failed-case envelope preserves typed EVT-004 lifecycle failures", () => {
  const marker = "REVIEW4-EVT-004-LOG-MARKER";
  const goodFile = buildDiagnosticMarkerFileStageEvidence({
    invocationCount: 1,
    ownedLogPath: "/tmp/owned/.media_server.log",
    productLogPath: "/tmp/owned/.media_server.log",
    marker,
    lines: [`[review4] auth incident ${marker} password=redacted`],
  });
  const goodResponse = buildDiagnosticMarkerResponseStageEvidence({
    marker,
    method: "GET",
    urlPath: "/ops/api/diagnostics/log-tail?limit=80",
    captures: [{
      requestId: "request-1",
      caseRequestIdentity: "EVT-004:request-1",
      caseRequestSequence: 1,
      responseRequestObjectObserved: true,
      status: 200,
      lines: [marker],
      markerCount: 1,
    }],
  });
  const goodStage = buildEvt004MarkerStageEvidence({
    fileStageEvidence: goodFile,
    dashboardResponseEvidence: goodResponse,
  });
  const cases = [
    ["hook-missing", {
      markerStageEvidence: buildEvt004MarkerStageEvidence({
        fileStageEvidence: buildDiagnosticMarkerFileStageEvidence({
          invocationCount: 0,
          ownedLogPath: "/tmp/owned/.media_server.log",
          productLogPath: "/tmp/owned/.media_server.log",
          marker,
          lines: [marker],
        }),
      }),
    }, "MARKER_RELOCATION_HOOK_INVOCATION_MISMATCH"],
    ["wrong-file", {
      markerStageEvidence: buildEvt004MarkerStageEvidence({
        fileStageEvidence: buildDiagnosticMarkerFileStageEvidence({
          invocationCount: 1,
          ownedLogPath: "/tmp/owned/.media_server.log",
          productLogPath: "/tmp/wrong/.media_server.log",
          marker,
          lines: [marker],
        }),
      }),
    }, "MARKER_LOG_FILE_IDENTITY_MISMATCH"],
    ["response-missing", {
      markerStageEvidence: buildEvt004MarkerStageEvidence({
        fileStageEvidence: goodFile,
        dashboardResponseEvidence: buildDiagnosticMarkerResponseStageEvidence({
          marker,
          method: "GET",
          urlPath: "/ops/api/diagnostics/log-tail?limit=80",
          captures: [],
        }),
      }),
    }, "DASHBOARD_MARKER_RESPONSE_MISSING"],
    ["timeline-missing", {
      markerStageEvidence: goodStage,
      markerEvidence: buildEventMarkerFlowEvidence({
        marker,
        responseBodies: [{ lines: [marker] }],
        observed: {
          semanticNodeTexts: [],
          visibleSemanticNodeTexts: [],
        },
      }),
    }, "TIMELINE_MARKER_NOT_PROJECTED"],
    ["dom-missing", {
      markerStageEvidence: goodStage,
      markerEvidence: buildEventMarkerFlowEvidence({
        marker,
        responseBodies: [{ lines: [marker] }],
        observed: {
          semanticNodeTexts: [marker],
          visibleSemanticNodeTexts: [],
        },
      }),
    }, "DOM_MARKER_NOT_OBSERVED"],
  ];
  for (const [label, evidence, expectedCode] of cases) {
    const result = {
      caseId: evt004Item.caseId,
      featureId: evt004Item.featureId,
      status: "FAIL",
      reason: `contract-${label}`,
      cleanupAttestation: {
        schema: "media-server.v390-ui-case-cleanup-attestation.v1",
        pass: true,
      },
      ...evidence,
    };
    const value = produce(result, evt004Manifest, evt004Canonical).summary.cases[0];
    assert(value.rawOutcome === "runner-error",
      `${label} did not traverse the canonical failed-case path`);
    assert(value.failureLifecycleEvidence?.schema ===
      "media-server.v390-ui-failure-lifecycle-evidence.v1",
    `${label} lifecycle schema missing`);
    assert(value.failureLifecycleEvidence.failureCode === expectedCode,
      `${label} failure code drift: ${value.failureLifecycleEvidence.failureCode}`);
    assert(JSON.stringify(value.markerStageEvidence) ===
      JSON.stringify(value.failureLifecycleEvidence.markerStageEvidence) &&
      JSON.stringify(value.markerEvidence) ===
      JSON.stringify(value.failureLifecycleEvidence.markerEvidence),
    `${label} canonical/focused lifecycle serialization drift`);
    const serialized = JSON.stringify(value.failureLifecycleEvidence);
    assert(!serialized.includes(marker) &&
      !serialized.includes("/tmp/owned") &&
      !serialized.includes("/tmp/wrong"),
    `${label} lifecycle evidence exposed raw marker or file paths`);
  }
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

check("producer approves only an exact trace-bound source contract console response", () => {
  const trace = makeRawTrace(item);
  const response = {
    phase: "response",
    requestId: "console-request-1",
    caseRequestIdentity: `${item.caseId}:console-request-1`,
    caseRequestSequence: 91,
    responseRequestObjectObserved: true,
    requestIdentitySource: "playwright-response-request",
    requestKind: "application-fetch",
    sameOrigin: true,
    requestOwnershipKind: "bootstrap",
    initiatorActionId: "",
    method: "GET",
    status: 401,
    url: "http://localhost/auth/whoami",
  };
  trace.pageOwnedRequestLedger = [response];
  writeJson(tracePath, trace);
  writeJson(consolePath, {
    schema: "media-server.v390-ui-native-browser-console.v1",
    caseId: item.caseId,
    entries: [{
      kind: "console",
      level: "error",
      text: "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
      location: { url: response.url, lineNumber: 0, columnNumber: 0 },
      responseBinding: {
        schema: "media-server.v390-ui-console-response-binding.v1",
        ...response,
        path: "/auth/whoami",
      },
      responseBindingCandidateCount: 1,
      caseId: item.caseId,
      actionId: "",
      phase: "unowned",
      secretBearing: false,
    }],
  });
  const approved = produce(makeResult()).summary.cases[0];
  assert(approved.security.unapprovedConsoleMessages === 0,
    "exact anonymous whoami response binding was not approved");
  const approvedConsole = readJson(path.join(outputDir, approved.artifacts.browserConsole.path));
  assert(approvedConsole.messages[0].approval?.contractKind === "anonymous-whoami-unauthorized",
    "source contract approval attestation missing");

  const wrongTrace = structuredClone(trace);
  wrongTrace.pageOwnedRequestLedger[0].url = "http://localhost/unrelated";
  writeJson(tracePath, wrongTrace);
  const rejected = produce(makeResult()).summary.cases[0];
  assert(rejected.security.unapprovedConsoleMessages === 1,
    "wrong trace response identity was approved");
  writeJson(tracePath, makeRawTrace(item));
  writeJson(consolePath, { schema: "media-server.v390-ui-native-browser-console.v1", caseId: item.caseId, entries: [] });
});

check("console approvals use exact page-owned lifecycle contracts for bootstrap, negative navigation, and readback", () => {
  const scenarios = [
    {
      caseId: "AUTH-007",
      response: { requestKind: "application-fetch", requestOwnershipKind: "bootstrap",
        initiatorActionId: "", method: "GET", status: 401, path: "/auth/whoami" },
      contractKind: "anonymous-whoami-unauthorized",
    },
    {
      caseId: "SAFE-016",
      response: { requestKind: "document-navigation", requestOwnershipKind: "initial-page-load",
        initiatorActionId: "", method: "GET", status: 404, path: "/__v390-undefined-route__" },
      contractKind: "canonical-document-navigation-response",
    },
    {
      caseId: "CLIENT-011",
      response: { requestKind: "application-fetch", requestOwnershipKind: "independent-readback",
        initiatorActionId: "CLIENT-011:assert-product-state", method: "GET", status: 404,
        path: "/client/api/views/99002" },
      contractKind: "exact-runtime-independent-readback-response",
    },
  ];
  for (const [index, scenario] of scenarios.entries()) {
    const nativeCase = manifestSource.cases.find(value => value.caseId === scenario.caseId);
    const response = {
      phase: "response",
      requestId: `console-lifecycle-${index}`,
      caseRequestIdentity: `${scenario.caseId}:request-${index + 1}`,
      caseRequestSequence: index + 1,
      responseRequestObjectObserved: true,
      requestIdentitySource: "playwright-response-request",
      sameOrigin: true,
      url: `http://localhost${scenario.response.path}`,
      ...scenario.response,
    };
    const message = {
      kind: "console",
      level: "error",
      text: `Failed to load resource: the server responded with a status of ${response.status} (Expected)`,
      location: { url: response.url },
      responseBindingCandidateCount: 1,
      responseBinding: {
        schema: "media-server.v390-ui-console-response-binding.v1",
        ...response,
      },
      caseId: scenario.caseId,
      actionId: "asynchronous-console-context",
      phase: "unowned",
      secretBearing: false,
    };
    const result = qualifyBrowserConsoleMessages({
      messages: [message],
      trace: { pageOwnedRequestLedger: [response] },
      nativeCase,
    });
    assert(result.unapprovedConsoleMessages === 0 &&
      result.messages[0].approval?.contractKind === scenario.contractKind,
    `${scenario.caseId} page-owned console lifecycle was not approved exactly`);

    const wrong = structuredClone(message);
    wrong.responseBinding.status = 500;
    const rejected = qualifyBrowserConsoleMessages({
      messages: [wrong],
      trace: { pageOwnedRequestLedger: [response] },
      nativeCase,
    });
    assert(rejected.unapprovedConsoleMessages === 1,
      `${scenario.caseId} wrong console response status was approved`);
  }
});

check("console approvals bind expected 401 and 403 responses to validated post-action roles", () => {
  const scenarios = [
    { caseId: "UI-004", role: "anonymous", path: "/auth/whoami", status: 401,
      contractKind: "anonymous-whoami-unauthorized" },
    { caseId: "UI-003", role: "viewer", path: "/ops/api/users", status: 403,
      contractKind: "operator-users-page-load-forbidden" },
  ];
  for (const [index, scenario] of scenarios.entries()) {
    const nativeCase = manifestSource.cases.find(value => value.caseId === scenario.caseId);
    const completion = nativeCase.workflow.expectedResults[0].completion;
    const response = {
      phase: "response",
      requestId: `post-role-console-${index}`,
      caseRequestIdentity: `${scenario.caseId}:request-${index + 1}`,
      caseRequestSequence: index + 41,
      responseRequestObjectObserved: true,
      requestIdentitySource: "playwright-response-request",
      requestKind: "application-fetch",
      requestOwnershipKind: "background-refresh",
      initiatorActionId: "",
      sameOrigin: true,
      method: "GET",
      status: scenario.status,
      url: `http://localhost${scenario.path}`,
      path: scenario.path,
    };
    const trace = {
      pageOwnedRequestLedger: [response],
      postActionVisualTargetEvidence: {
        schema: "media-server.v390-ui-post-action-visual-target.v1",
        caseId: scenario.caseId,
        actionId: completion.actionId,
        observedRoute: scenario.role === "anonymous" ? "/login" : "/client/live",
        ownerCandidateCount: 1,
        bindingKind: "post-action-visible-destination-owner",
      },
      postActionVisualRoleEvidence: {
        schema: "media-server.v390-ui-post-action-visual-role.v1",
        caseId: scenario.caseId,
        actionId: completion.actionId,
        route: scenario.role === "anonymous" ? "/login" : "/client/live",
        accountRole: scenario.role,
        source: "browser-auth-whoami",
      },
    };
    const message = {
      kind: "console",
      level: "error",
      text: `Failed to load resource: the server responded with a status of ${scenario.status} (Expected)`,
      location: { url: response.url },
      responseBindingCandidateCount: 1,
      responseBinding: { schema: "media-server.v390-ui-console-response-binding.v1", ...response },
      caseId: scenario.caseId,
      actionId: "",
      phase: "unowned",
      secretBearing: false,
    };
    const approved = qualifyBrowserConsoleMessages({ messages: [message], trace, nativeCase });
    assert(approved.unapprovedConsoleMessages === 0 &&
      approved.messages[0].approval?.contractKind === scenario.contractKind,
    `${scenario.caseId} validated post-action role response was not approved`);

    delete trace.postActionVisualRoleEvidence;
    const rejected = qualifyBrowserConsoleMessages({ messages: [message], trace, nativeCase });
    assert(rejected.unapprovedConsoleMessages === 1,
      `${scenario.caseId} response passed without post-action role evidence`);
  }
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

check("Policy v4 rejects missing zero-count fields instead of defaulting them", () => {
  const policy = readJson(path.join(rootDir, "test/fixtures/ui_fulltest_evidence_policy_v4.json"));
  const freshSummary = produce(makeResult()).summary;
  for (const field of ["unapprovedExclusions", "manualIntervention"]) {
    const missing = structuredClone(freshSummary);
    delete missing.coverage[field];
    const evaluation = evaluateEvidence(policy, missing, {
      rootDir,
      verifyArtifacts: true,
      contractMode: false,
      verifyCurrentSource: false,
      now: new Date(),
    });
    assert(evaluation.uiFulltestPass === false &&
      evaluation.reasons.includes(`coverage-${field}-must-be-integer`),
    `missing ${field} was defaulted instead of rejected with an exact type reason`);
  }
  const missingCaseCount = structuredClone(freshSummary);
  delete missingCaseCount.cases[0].security.unapprovedConsoleMessages;
  const caseEvaluation = evaluateEvidence(policy, missingCaseCount, {
    rootDir,
    verifyArtifacts: true,
    contractMode: false,
    verifyCurrentSource: false,
    now: new Date(),
  });
  assert(caseEvaluation.reasons.some(reason =>
    reason.endsWith(":case-console-unapproved-message-count-mismatch")),
    `missing case console count was defaulted instead of rejected: ${caseEvaluation.reasons.join(",")}`);
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

check("producer rejects an artifact root outside the repository before capture", () => {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "media_server_v390_policy_root_"));
  let failed = false;
  try {
    assertPolicyV4ArtifactRoot({ rootDir, outputDir: outside });
  } catch (error) {
    failed = String(error.message).includes("inside the repository root");
  } finally {
    fs.rmSync(outside, { recursive: true, force: true });
  }
  assert(failed, "outside-repository artifact root was accepted");
  assert(assertPolicyV4ArtifactRoot({ rootDir, outputDir }).artifactRoot === path.relative(rootDir, outputDir),
    "repository-contained artifact root was not normalized");
});

const failed = checks.filter(value => !value.ok);
for (const value of checks) console.log(`[${value.ok ? "pass" : "fail"}] ${value.name}${value.error ? `: ${value.error}` : ""}`);
console.log("\n== v3.9.0 Policy v4 producer contract ==");
console.log(`- pass: ${checks.length - failed.length}`);
console.log(`- fail: ${failed.length}`);
console.log("- actualExact424BrowserExecution: not-run-by-this-contract");
cleanup();
process.exit(failed.length === 0 ? 0 : 1);

function produce(result, manifestValue = manifest, canonicalValue = canonical) {
  return producePolicyV4Evidence({
    rootDir,
    outputDir,
    manifest: manifestValue,
    canonical: canonicalValue,
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
    postActionVisualTargetEvidence: {
      schema: "media-server.v390-ui-post-action-visual-target.v1",
      caseId: value.caseId,
      actionId: expected.actionId,
      completionMode: expected.completionMode,
      sourceSelectorSha256: "contract-source",
      requestedState: "visible",
      selector: value.controlAction.targetSelector || "body",
      bindingKind: value.controlAction.targetSelector
        ? "post-action-visible-source-owner"
        : "post-action-visible-document-owner",
      sourceDetached: false,
      sourceHidden: false,
      observedRoute: value.screenRoute,
      navigationEpoch: 1,
      ownerCandidateCount: 1,
      sourceSelectorRewaited: false,
    },
    postActionVisualRoleEvidence: {
      schema: "media-server.v390-ui-post-action-visual-role.v1",
      caseId: value.caseId,
      actionId: expected.actionId,
      route: value.screenRoute,
      accountRole: value.accountRole,
      source: "browser-auth-whoami",
    },
    actions: [
      { actionId: expected.actionId, kind: expected.actionKind, controlSelector: selector, dispatch: "playwright-native" },
      { actionId: `${value.caseId}:verify-independent-readback`, kind: "verify-independent-readback", linkedPrimaryActionId: expected.actionId, dispatch: "playwright-native" },
    ],
    rawPrimaryObservations: [{
      schema: "media-server.v390-ui-raw-primary-observation.v1",
      action: {
        actionId: expected.actionId,
        actionKind: expected.actionKind,
        executedKind: "submit",
        controlSelector: selector,
        correlationId: expected.correlationId,
        dispatch: "playwright-native",
        completionMode: expected.completionMode,
        declaredRequest: {
          correlationId: expected.correlationId,
          method: expected.request.method,
          urlPath: expected.request.urlPath,
          urlPathTemplate: expected.request.urlPathTemplate,
          allowedStatuses: structuredClone(expected.request.allowedStatuses),
          initiatorActionId: expected.actionId,
          requestOwnershipKind: "primary-action",
          runtimeBindingSource: "native-completion-contract",
        },
      },
      before: { selector, exists: true, visible: true, disabled: false },
      after: { selector, exists: true, visible: true, disabled: false },
      navigation: null,
      networkEntries: [
        { phase: "request-start", requestId, caseRequestIdentity: requestId, caseRequestSequence: 1, initiatorActionId: expected.actionId, requestOwnershipKind: "primary-action", correlationId: expected.correlationId, correlationSource: "request-header", method: expected.request.method, status: 0, url: `http://localhost${expected.request.urlPath}` },
        { phase: "response", requestId, caseRequestIdentity: requestId, caseRequestSequence: 1, initiatorActionId: expected.actionId, requestOwnershipKind: "primary-action", responseRequestObjectObserved: true, requestIdentitySource: "playwright-response-request", correlationId: expected.correlationId, correlationSource: "request-header", method: expected.request.method, status: expected.request.allowedStatuses[0], url: `http://localhost${expected.request.urlPath}` },
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
    target: { selector: targetSelector, visible: true, documentTarget: targetSelector === "body", rect: { left: 0, top: 0, right: value.viewport.width, bottom: 100, width: value.viewport.width, height: 100 } },
    textSamples: [],
    focus: { applicable: false, focusableCount: 0 },
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

function canonicalStableJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalStableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort()
      .map(key => `${JSON.stringify(key)}:${canonicalStableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
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
