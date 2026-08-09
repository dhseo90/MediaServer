#!/usr/bin/env node
// 파일 용도: REVIEW4-60 raw native evidence와 Policy qualifier의 순환 신뢰 방지 계약을 검증한다.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const checks = [];
const native = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const canonical = readJson("test/fixtures/ui_fulltest_case_manifest_policy_v4.json");
const nativeCase = native.cases.find(item => item.caseId === "UI-002");
const canonicalCase = canonical.cases.find(item => item.testId === nativeCase.caseId);
let qualifier = null;
try {
  qualifier = await import("./v390_ui_policy_v4_independent_qualifier.mjs");
} catch (error) {
  checks.push({ name: "independent qualifier module exists", ok: false, error: String(error.message || error) });
}

check("producer is a raw collector, not a qualification oracle", () => {
  const source = readText("scripts/internal/v390_ui_policy_v4_evidence_producer.mjs");
  for (const forbidden of [
    "evaluateVisualArtifact",
    "evaluateVisualMatrix",
    'type: "trusted-interaction"',
    'trusted: true',
    'type: "completion"',
    'evidenceStatus: "automation-equivalent-pass"',
  ]) assert(!source.includes(forbidden), `producer still contains qualification claim: ${forbidden}`);
  assert(source.includes("rawPrimaryObservations"), "producer does not require raw primary observations");
});

check("runner persists a v2 raw primary observation ledger", () => {
  const source = readText("scripts/internal/run_v390_ui_native_exact_cases.mjs");
  for (const required of [
    "media-server.v390-ui-native-interaction-trace.v2",
    "rawPrimaryObservations",
    "networkEntries",
    "semanticReadback",
    "linkedPrimaryActionId",
  ]) assert(source.includes(required), `runner raw ledger field missing: ${required}`);
});

check("primary completion declares one exact action mode", () => {
  for (const item of native.cases) {
    const completion = item.workflow.expectedResults[0].completion;
    assert(["request", "local", "navigation", "readback"].includes(completion.completionMode),
      `${item.caseId} completion mode missing`);
    const activeModes = [
      Boolean(completion.request),
      Boolean(completion.localTransition),
      Boolean(completion.navigationBinding),
      completion.completionMode === "readback",
    ].filter(Boolean).length;
    assert(activeModes === 1, `${item.caseId} completion mode is not exact-one`);
  }
});

check("current consumers independently qualify raw capture and source fingerprints", () => {
  const coverageSource = readText("scripts/internal/verify_v390_ui_automation_coverage.mjs");
  const policySource = readText("scripts/internal/verify_ui_fulltest_evidence_policy_v4.mjs");
  for (const required of [
    'import { evaluateEvidence } from "./ui_fulltest_evidence_policy_v4_lib.mjs"',
    "independentQualification.uiFulltestPass === true",
    'value.result === "CAPTURED"',
    "value.sourceBinding?.currentSourceVerified !== true",
  ]) assert(coverageSource.includes(required), `coverage consumer independence missing: ${required}`);
  for (const required of [
    "summary.sourceBinding?.currentSourceVerified !== true",
    "summary.sourceBinding?.sourceFingerprintOnly === true",
    "summary.sourceBinding?.worktreePatchSha256 === currentSource.worktreePatchSha256",
  ]) assert(policySource.includes(required), `Policy CLI source verification independence missing: ${required}`);
});

if (qualifier) {
  const base = makeRawCase(nativeCase);
  check("independent qualifier accepts one exact raw primary action", () => {
    const result = evaluate(base);
    assert(result.qualified === true, result.reasons.join("; "));
  });

  check("REVIEW4-56 empty raw workflow cannot be repaired by outer PASS claims", () => {
    const value = clone(base);
    value.trace.actions = [];
    value.trace.rawPrimaryObservations = [];
    value.outerClaims = forgedClaims();
    expectReason(value, "raw-primary-observation-count-mismatch");
  });

  check("REVIEW4-56 body visibility cannot replace the exact primary selector", () => {
    const value = clone(base);
    value.trace.rawPrimaryObservations[0].action.controlSelector = "body";
    value.trace.rawPrimaryObservations[0].before.selector = "body";
    value.trace.rawPrimaryObservations[0].after.selector = "body";
    value.trace.rawPrimaryObservations[0].semanticReadback.selector = "body";
    expectReason(value, "raw-primary-control-selector-mismatch");
  });

  check("REVIEW4-57 requested and observed must match the raw native trace", () => {
    for (const [field, mutate, reason] of [
      ["requested", value => { value.trace.requested.route = "/forged"; }, "raw-requested-summary-mismatch"],
      ["observed-role", value => { value.trace.observed.accountRole = "operator"; }, "raw-observed-summary-mismatch"],
      ["observed-theme", value => { value.trace.observed.theme = "dark"; }, "raw-observed-summary-mismatch"],
      ["observed-viewport", value => { value.trace.observed.viewport.width = 1180; }, "raw-observed-summary-mismatch"],
    ]) {
      const value = clone(base);
      mutate(value);
      const result = evaluate(value);
      assert(result.reasons.includes(reason), `${field} drift passed: ${result.reasons.join("; ")}`);
    }
  });

  check("REVIEW4-58 exact request start/response pair is independently recomputed", () => {
    const mutations = [
      ["method", value => { value.trace.rawPrimaryObservations[0].networkEntries[1].method = "DELETE"; }],
      ["path", value => { value.trace.rawPrimaryObservations[0].networkEntries[1].url = "http://localhost/other"; }],
      ["status", value => { value.trace.rawPrimaryObservations[0].networkEntries[1].status = 599; }],
      ["correlation-source", value => { value.trace.rawPrimaryObservations[0].networkEntries[1].correlationSource = "none"; }],
      ["wrong-action", value => { value.trace.rawPrimaryObservations[0].networkEntries[1].initiatorActionId = "OTHER:action"; }],
      ["stale-owner", value => { value.trace.rawPrimaryObservations[0].networkEntries[0].requestOwnershipKind = "initial-page-load"; }],
      ["duplicate", value => { value.trace.rawPrimaryObservations[0].networkEntries.push(clone(value.trace.rawPrimaryObservations[0].networkEntries[1])); }],
    ];
    for (const [label, mutate] of mutations) {
      const value = clone(base);
      mutate(value);
      const result = evaluate(value);
      assert(result.qualified === false && result.reasons.some(reason => reason.startsWith("raw-primary-request-")),
        `${label} request drift passed: ${result.reasons.join("; ")}`);
    }
  });

  check("REVIEW4-58 fresh readback identity selector and observation are independently recomputed", () => {
    const mutations = [
      ["missing", value => { value.trace.rawPrimaryObservations[0].semanticReadback = null; }],
      ["wrong-selector", value => { value.trace.rawPrimaryObservations[0].semanticReadback.selector = "body"; }],
      ["stale", value => { value.trace.rawPrimaryObservations[0].semanticReadback.observation = { actual: { submitted: false } }; }],
      ["wrong-identity", value => { value.trace.rawPrimaryObservations[0].semanticReadback.identity = "forged"; }],
    ];
    for (const [label, mutate] of mutations) {
      const value = clone(base);
      mutate(value);
      const result = evaluate(value);
      assert(result.qualified === false && result.reasons.some(reason => reason.startsWith("raw-primary-readback-")),
        `${label} readback drift passed: ${result.reasons.join("; ")}`);
    }
  });

  check("REVIEW4-59 producer visual PASS cannot be a qualifier input", () => {
    const source = readText("scripts/internal/ui_fulltest_evidence_policy_v4_lib.mjs");
    for (const forbidden of [
      "item?.visualEvidence?.status",
      "payload?.metrics?.videoOverlay?.required",
      "item?.interaction?.trusted",
      "item?.completionOracle",
    ]) assert(!source.includes(forbidden), `qualifier still trusts producer field: ${forbidden}`);
  });
}

const failed = checks.filter(item => !item.ok);
for (const item of checks) console.log(`[${item.ok ? "pass" : "fail"}] ${item.name}${item.error ? `: ${item.error}` : ""}`);
console.log("\n== v3.9.0 Policy v4 independence contract ==");
console.log(`- pass: ${checks.length - failed.length}`);
console.log(`- fail: ${failed.length}`);
console.log("- actualExact424BrowserExecution: not-run-by-this-contract");
process.exit(failed.length === 0 ? 0 : 1);

function evaluate(value) {
  return qualifier.qualifyRawCase({
    trace: value.trace,
    requested: value.requested,
    observed: value.observed,
    canonicalCase,
    nativeCase,
  });
}

function expectReason(value, reason) {
  const result = evaluate(value);
  assert(result.qualified === false && result.reasons.includes(reason), `${reason} missing: ${result.reasons.join("; ")}`);
}

function makeRawCase(item) {
  const completion = item.workflow.expectedResults[0].completion;
  const selector = completion.controlSelector;
  const before = { selector, exists: true, visible: true, disabled: false };
  const after = { selector, exists: true, visible: true, disabled: false };
  const requestId = `${item.caseId}:raw-request-1`;
  const caseRequestIdentity = `${item.caseId}:request:1`;
  const actual = clone(completion.readbackExpectation);
  return {
    requested: clone(item.requestedProjection),
    observed: clone(item.observedProjection),
    trace: {
      schema: "media-server.v390-ui-native-interaction-trace.v2",
      caseId: item.caseId,
      featureId: item.featureId,
      dispatch: "playwright-native",
      requested: clone(item.requestedProjection),
      observed: clone(item.observedProjection),
      actions: [
        { actionId: completion.actionId, kind: completion.actionKind, controlSelector: selector, dispatch: "playwright-native" },
        { actionId: `${item.caseId}:verify-independent-readback`, kind: "verify-independent-readback", linkedPrimaryActionId: completion.actionId, dispatch: "playwright-native" },
      ],
      rawPrimaryObservations: [{
        schema: "media-server.v390-ui-raw-primary-observation.v1",
        action: {
          actionId: completion.actionId,
          actionKind: completion.actionKind,
          executedKind: "submit",
          controlSelector: selector,
          correlationId: completion.correlationId,
          dispatch: "playwright-native",
          completionMode: completion.completionMode,
          declaredRequest: {
            correlationId: completion.correlationId,
            method: completion.request.method,
            urlPath: completion.request.urlPath,
            urlPathTemplate: completion.request.urlPathTemplate,
            allowedStatuses: clone(completion.request.allowedStatuses),
            initiatorActionId: completion.actionId,
            requestOwnershipKind: "primary-action",
            runtimeBindingSource: "native-completion-contract",
          },
        },
        before,
        after,
        navigation: null,
        networkEntries: [
          { phase: "request-start", requestId, caseRequestIdentity, caseRequestSequence: 1, initiatorActionId: completion.actionId, requestOwnershipKind: "primary-action", correlationId: completion.correlationId, correlationSource: "request-header", method: completion.request.method, status: 0, url: `http://localhost${completion.request.urlPath}` },
          { phase: "response", requestId, caseRequestIdentity, caseRequestSequence: 1, initiatorActionId: completion.actionId, requestOwnershipKind: "primary-action", responseRequestObjectObserved: true, requestIdentitySource: "playwright-response-request", correlationId: completion.correlationId, correlationSource: "request-header", method: completion.request.method, status: completion.request.allowedStatuses[0], url: `http://localhost${completion.request.urlPath}` },
        ],
        semanticReadback: {
          schema: "media-server.v390-ui-semantic-readback.v2",
          identity: completion.readbackIdentity,
          actionId: completion.actionId,
          correlationId: completion.correlationId,
          expectedBehaviorSha256: completion.expectedBehaviorSha256,
          observationSource: "browser-dom",
          selector,
          observation: { actual },
        },
      }],
    },
  };
}

function forgedClaims() {
  return {
    result: "PASS",
    evidenceStatus: "automation-equivalent-pass",
    interaction: { executed: true, trusted: true },
    completionOracle: { status: "PASS" },
    visualEvidence: { status: "PASS" },
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

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function clone(value) {
  return structuredClone(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
