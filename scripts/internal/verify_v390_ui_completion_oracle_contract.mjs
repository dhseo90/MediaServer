#!/usr/bin/env node
// 파일 용도: V390-REVIEW2-25 no-op action과 pre-existing visible state false-PASS를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  allowedCompletionSources,
  domSnapshotDigest,
  evaluateCompletionOracle,
} from "./v390_ui_completion_oracle_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const manifest = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const exactRunnerSource = readText("scripts/internal/run_v390_ui_native_exact_cases.mjs");
const legacyRunnerSource = readText("scripts/internal/verify_v390_ui_automation.mjs");
const adapterSource = readText("scripts/internal/v390_ui_native_adapter.mjs");
const checks = [];

check("DOM snapshot digest is stable and state-sensitive", () => {
  const before = snapshot("ready", "alpha");
  const same = structuredClone(before);
  const changed = snapshot("ready", "beta");
  assert(domSnapshotDigest(before) === domSnapshotDigest(same), "identical snapshots must have identical digest");
  assert(domSnapshotDigest(before) !== domSnapshotDigest(changed), "changed state must change digest");
});

check("navigation response plus visible DOM is a completion oracle", () => {
  const result = evaluateCompletionOracle({
    action: action("navigate"),
    before: null,
    after: snapshot("loaded", "dashboard"),
    navigation: { status: 200, url: "http://127.0.0.1/ops" },
    allowedStatuses: [200],
  });
  assert(result.pass && result.source === "navigation-network-dom", `navigation oracle failed: ${result.reason}`);
});

check("explicit negative route status is a completion oracle", () => {
  const result = evaluateCompletionOracle({
    action: action("navigate-negative"),
    after: snapshot("not-found", "404"),
    navigation: { status: 404, url: "http://127.0.0.1/lab" },
    allowedStatuses: [404],
  });
  assert(result.pass && result.source === "negative-route-status", `negative route oracle failed: ${result.reason}`);
});

check("trusted action accepts DOM transition or correlated network plus DOM", () => {
  const dom = evaluateCompletionOracle({
    action: action("click"),
    before: snapshot("idle", "before"),
    after: snapshot("ready", "after"),
  });
  assert(dom.pass && dom.source === "dom-transition", `DOM transition failed: ${dom.reason}`);

  const network = evaluateCompletionOracle({
    action: { ...action("click"), expectedNetworkUrlIncludes: ["/ops/api/state"] },
    before: snapshot("ready", "same"),
    after: snapshot("ready", "same"),
    networkResponses: [{ correlationId: "CASE-1:primary", status: 200, method: "GET", url: "/ops/api/state" }],
  });
  assert(network.pass && network.source === "network-dom", `network+DOM failed: ${network.reason}`);
});

check("persisted readback EventRecord and server log correlations are accepted", () => {
  const base = {
    action: action("click"),
    before: snapshot("ready", "same"),
    after: snapshot("ready", "same"),
  };
  const persisted = evaluateCompletionOracle({
    ...base,
    persistedReadback: { correlationId: "CASE-1:primary", beforeDigest: "a", afterDigest: "b" },
  });
  const eventRecord = evaluateCompletionOracle({
    ...base,
    eventRecord: { correlationId: "CASE-1:primary", observed: true, eventId: "event-1" },
  });
  const serverLog = evaluateCompletionOracle({
    ...base,
    serverLog: { correlationId: "CASE-1:primary", matched: true, lineSha256: "f".repeat(64) },
  });
  assert(persisted.pass && persisted.source === "persisted-readback", "persisted readback not accepted");
  assert(eventRecord.pass && eventRecord.source === "event-record", "EventRecord not accepted");
  assert(serverLog.pass && serverLog.source === "server-log", "server log not accepted");
});

check("pre-existing visible text with identical before/after is rejected", () => {
  const state = snapshot("ready", "pre-existing expected marker");
  const result = evaluateCompletionOracle({
    action: action("click"),
    before: state,
    after: structuredClone(state),
  });
  assert(result.pass === false, "no-op click passed from pre-existing visible text");
  assert(result.reason === "no-correlated-completion", `unexpected no-op reason: ${result.reason}`);
});

check("unrelated evidence and unexecuted actions are rejected", () => {
  const state = snapshot("ready", "same");
  const unrelated = evaluateCompletionOracle({
    action: { ...action("select"), expectedNetworkUrlIncludes: ["/ops/api/expected"] },
    before: state,
    after: structuredClone(state),
    networkResponses: [{ correlationId: "OTHER", status: 200, method: "GET", url: "/health" }],
    persistedReadback: { correlationId: "OTHER", beforeDigest: "a", afterDigest: "b" },
    eventRecord: { correlationId: "OTHER", observed: true },
    serverLog: { correlationId: "OTHER", matched: true },
  });
  assert(unrelated.pass === false && unrelated.reason === "no-correlated-completion", "unrelated evidence passed");
  const sameCorrelationWrongUrl = evaluateCompletionOracle({
    action: { ...action("click"), expectedNetworkUrlIncludes: ["/ops/api/expected"] },
    before: state,
    after: structuredClone(state),
    networkResponses: [{ correlationId: "CASE-1:primary", status: 200, method: "GET", url: "/health" }],
  });
  assert(sameCorrelationWrongUrl.pass === false, "same-window unrelated URL passed network oracle");
  const notExecuted = evaluateCompletionOracle({
    action: { ...action("fill"), executed: false },
    before: state,
    after: snapshot("ready", "changed"),
  });
  assert(notExecuted.pass === false && notExecuted.reason === "action-not-executed", "unexecuted action passed");
});

check("exact 424 manifest requires explicit completion sources without pending oracle", () => {
  assert(manifest.cases.length === 424, "exact manifest case count drift");
  for (const item of manifest.cases) {
    assert(item.oracle?.completionRequired === true, `${item.caseId} completionRequired must be true`);
    assert(Array.isArray(item.oracle.allowedCompletionSources) && item.oracle.allowedCompletionSources.length > 0,
      `${item.caseId} allowed completion sources missing`);
    assert(!item.oracle.kind.includes("pending"), `${item.caseId} retains pending oracle`);
    assert(item.oracle.allowedCompletionSources.every(source => allowedCompletionSources.includes(source)),
      `${item.caseId} unknown completion source`);
  }
});

check("exact and legacy runners capture before/after network and completion result", () => {
  for (const snippet of [
    "evaluateCompletionOracle",
    "beforeDigest",
    "afterDigest",
    "networkResponses",
    "completionOracle",
  ]) {
    assert(exactRunnerSource.includes(snippet), `exact runner missing ${snippet}`);
    assert(legacyRunnerSource.includes(snippet), `legacy runner missing ${snippet}`);
  }
  for (const snippet of ["page.on(\"response\"", "networkEntries", "snapshot"]) {
    assert(adapterSource.includes(snippet), `native adapter missing ${snippet}`);
  }
});

check("REVIEW3-42 rejects DOM-only completion and requires observed request correlation plus exact readback identity", () => {
  const domOnly = evaluateCompletionOracle({
    action: {
      ...action("click"),
      semanticCompletionRequired: true,
      expectedReadbackIdentity: "CASE-1:expected-result",
    },
    before: snapshot("idle", "before"),
    after: snapshot("ready", "after"),
  });
  assert(domOnly.pass === false, "semantic action passed from arbitrary DOM digest change");

  for (const item of manifest.cases) {
    const result = item.workflow?.expectedResults?.[0];
    assert(result?.completion?.schema === "media-server.v390-ui-semantic-completion.v1",
      `${item.caseId} semantic completion plan missing`);
    const expectedIdentity = item.disposition === "negative-route"
      ? `${item.caseId}:navigation`
      : `${item.caseId}:semantic-result`;
    assert(result.completion.readbackIdentity === expectedIdentity,
      `${item.caseId} readback identity mismatch`);
    assert(!item.oracle.allowedCompletionSources.includes("dom-transition"),
      `${item.caseId} arbitrary DOM completion source remains allowed`);
    assert(!item.oracle.allowedCompletionSources.includes("network-dom"),
      `${item.caseId} legacy network-dom completion source remains allowed`);
    for (const actionItem of item.workflow.controlSequence.filter(actionItem => actionItem.kind !== "wait-visible")) {
      assert(actionItem.semanticCompletion?.schema === "media-server.v390-ui-semantic-completion.v1",
        `${item.caseId} ${actionItem.kind} semantic action plan missing`);
      assert(actionItem.semanticCompletion.request.correlationSource === "request-header",
        `${item.caseId} ${actionItem.kind} request correlation source drift`);
    }
  }
  assert(adapterSource.includes("x-media-server-correlation-id"), "adapter does not emit request correlation header");
  assert(adapterSource.includes("correlationSource: correlationId ? 'request-header' : 'none'"),
    "adapter does not attest header correlation source");
  assert(exactRunnerSource.includes("semanticReadback"), "exact runner does not collect semantic readback evidence");
  for (const snippet of ["semanticCompletionRequired", "semanticReadback", "setCorrelationId(correlationId)"]) {
    assert(legacyRunnerSource.includes(snippet), `targeted runner semantic completion missing ${snippet}`);
  }
  assert(!exactRunnerSource.includes("map(entry => ({ ...entry, correlationId }))"),
    "exact runner still forges correlation IDs after network collection");
  assert(!legacyRunnerSource.includes("networkStartIndex).map(entry =>"),
    "targeted runner still forges correlation IDs after network collection");
});

check("REVIEW3-42 accepts only header-correlated endpoint plus exact semantic readback", () => {
  const semanticAction = {
    ...action("click"),
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "CASE-1:semantic-result",
    expectedEndpoint: {
      correlationId: "CASE-1:navigation",
      method: "GET",
      urlPath: "/ops",
      allowedStatuses: [200],
    },
    allowedCompletionSources: ["endpoint-dom"],
  };
  const semanticReadback = {
    schema: "media-server.v390-ui-semantic-readback.v1",
    identity: "CASE-1:semantic-result",
    correlationId: "CASE-1:primary",
    expected: { property: "value", value: "reviewed" },
    observed: { property: "value", value: "reviewed" },
  };
  const endpoint = {
    requestId: "native-request-1",
    correlationId: "CASE-1:navigation",
    correlationSource: "request-header",
    method: "GET",
    status: 200,
    url: "http://127.0.0.1/ops",
  };
  const pass = evaluateCompletionOracle({
    action: semanticAction,
    before: snapshot("idle", "before"),
    after: snapshot("ready", "after"),
    networkResponses: [endpoint],
    semanticReadback,
  });
  assert(pass.pass && pass.source === "endpoint-dom", `semantic endpoint failed: ${pass.reason}`);

  for (const [label, mutateEvidence] of [
    ["synthetic-correlation", value => { value.networkResponses[0].correlationSource = "post-hoc"; }],
    ["wrong-request-id", value => { value.networkResponses[0].requestId = ""; }],
    ["wrong-method", value => { value.networkResponses[0].method = "POST"; }],
    ["wrong-path", value => { value.networkResponses[0].url = "http://127.0.0.1/health"; }],
    ["wrong-readback-id", value => { value.semanticReadback.identity = "OTHER"; }],
    ["wrong-readback-value", value => { value.semanticReadback.observed.value = "forged"; }],
  ]) {
    const evidence = { networkResponses: [structuredClone(endpoint)], semanticReadback: structuredClone(semanticReadback) };
    mutateEvidence(evidence);
    const rejected = evaluateCompletionOracle({
      action: semanticAction,
      before: snapshot("idle", "before"),
      after: snapshot("ready", "after"),
      ...evidence,
    });
    assert(rejected.pass === false, `${label} semantic evidence passed`);
  }
});

check("REVIEW3-42 attested persisted EventRecord and server-log alternatives reject weak evidence", () => {
  const semanticAction = {
    ...action("click"),
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "CASE-1:semantic-result",
    expectedEndpoint: { correlationId: "missing", method: "GET", urlPath: "/missing", allowedStatuses: [200] },
    allowedCompletionSources: ["persisted-readback", "event-record", "server-log"],
  };
  const semanticReadback = {
    schema: "media-server.v390-ui-semantic-readback.v1",
    identity: "CASE-1:semantic-result",
    correlationId: "CASE-1:primary",
    expected: { state: "saved" },
    observed: { state: "saved" },
  };
  const persistedReadback = {
    schema: "media-server.v390-ui-persisted-readback.v1",
    correlationSource: "readback-request",
    correlationId: "CASE-1:primary",
    identity: "CASE-1:semantic-result",
    readbackRequestId: "readback-1",
    beforeDigest: "a",
    afterDigest: "b",
  };
  const eventRecord = {
    schema: "media-server.v390-ui-event-record-completion.v1",
    correlationSource: "event-record-field",
    correlationId: "CASE-1:primary",
    identity: "CASE-1:semantic-result",
    observed: true,
    eventId: "event-1",
    recordSha256: "e".repeat(64),
  };
  const serverLog = {
    schema: "media-server.v390-ui-server-log-completion.v1",
    correlationSource: "server-log-field",
    correlationId: "CASE-1:primary",
    identity: "CASE-1:semantic-result",
    matched: true,
    byteStart: 10,
    byteEnd: 40,
    lineSha256: "f".repeat(64),
  };
  for (const [field, evidence, source] of [
    ["persistedReadback", persistedReadback, "persisted-readback"],
    ["eventRecord", eventRecord, "event-record"],
    ["serverLog", serverLog, "server-log"],
  ]) {
    const accepted = evaluateCompletionOracle({
      action: semanticAction,
      before: snapshot("ready", "same"),
      after: snapshot("ready", "same"),
      semanticReadback,
      [field]: evidence,
    });
    assert(accepted.pass && accepted.source === source, `${source} attestation not accepted: ${accepted.reason}`);
    const weak = structuredClone(evidence);
    delete weak.schema;
    const rejected = evaluateCompletionOracle({
      action: semanticAction,
      before: snapshot("ready", "same"),
      after: snapshot("ready", "same"),
      semanticReadback,
      [field]: weak,
    });
    assert(rejected.pass === false, `${source} weak evidence passed`);
  }
});

check("REVIEW3-42 all 424 action plans close only with their exact endpoint and readback identity", () => {
  let evaluatedActions = 0;
  for (const item of manifest.cases) {
    for (const actionItem of item.workflow.controlSequence.filter(candidate => candidate.kind !== "wait-visible")) {
      const completion = actionItem.semanticCompletion;
      const negative = completion.requiredSource === "negative-route-status";
      const evidenceAction = {
        ...actionItem,
        kind: negative ? "navigate-negative" : actionItem.kind,
        executed: true,
        executedKind: actionItem.kind === "fill-control"
          ? "fill"
          : (actionItem.kind === "select-control" ? "select" : "click"),
        correlationId: completion.correlationId,
        dispatch: "playwright-native",
        semanticCompletionRequired: true,
        expectedReadbackIdentity: completion.readbackIdentity,
        expectedEndpoint: {
          correlationId: completion.request.correlationId,
          method: completion.request.method,
          urlPath: completion.request.urlPath,
          allowedStatuses: completion.request.allowedStatuses,
        },
        allowedCompletionSources: item.oracle.allowedCompletionSources,
      };
      const semanticReadback = {
        schema: "media-server.v390-ui-semantic-readback.v1",
        identity: completion.readbackIdentity,
        correlationId: completion.correlationId,
        expected: structuredClone(completion.readbackExpectation),
        observed: structuredClone(completion.readbackExpectation),
      };
      const status = completion.request.allowedStatuses[0];
      const networkResponses = [{
        requestId: `${item.caseId}:${evaluatedActions}`,
        correlationId: completion.request.correlationId,
        correlationSource: "request-header",
        method: completion.request.method,
        status,
        url: `http://127.0.0.1${completion.request.urlPath}`,
      }];
      const evaluated = evaluateCompletionOracle({
        action: evidenceAction,
        before: snapshot("idle", "before"),
        after: snapshot("ready", "after"),
        navigation: ["navigate", "navigate-negative"].includes(evidenceAction.kind)
          ? { status, url: networkResponses[0].url }
          : null,
        allowedStatuses: completion.request.allowedStatuses,
        networkResponses,
        semanticReadback,
      });
      assert(evaluated.pass && evaluated.source === completion.requiredSource,
        `${item.caseId} ${actionItem.kind} semantic plan failed: ${evaluated.reason}`);
      evaluatedActions += 1;
    }
  }
  assert(evaluatedActions === 848, `semantic action plan count drift: ${evaluatedActions}`);
});

const result = runChecks();
console.log("");
console.log("== v3.9.0 UI completion oracle contract summary ==");
console.log(`- allowedSources: ${allowedCompletionSources.join(",")}`);
console.log(`- pass: ${result.pass}`);
console.log(`- fail: ${result.fail}`);
console.log("- actualBrowserExecution: not-run-by-this-contract");
if (result.fail > 0) process.exit(1);

function snapshot(state, text) {
  return {
    selector: "#target",
    exists: true,
    visible: true,
    state,
    text,
    value: "",
    checked: false,
    selectedValues: [],
    url: "http://127.0.0.1/ops",
  };
}

function action(kind) {
  return { kind, executed: true, correlationId: "CASE-1:primary", dispatch: "playwright-native" };
}

function check(name, fn) {
  checks.push({ name, fn });
}

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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
