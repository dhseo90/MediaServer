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
const completionOracleSource = readText("scripts/internal/v390_ui_completion_oracle_lib.mjs");
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
  for (const snippet of [
    "primaryCompletionEvents.length === 1",
    "browser.networkEntries().slice(networkStart)",
    "await browser.setCorrelationId(action.semanticCompletion.correlationId)",
  ]) {
    assert(exactRunnerSource.includes(snippet), `exact runner action binding missing ${snippet}`);
  }
  assert(!exactRunnerSource.includes("completionEvents.some(event => event.pass"),
    "exact runner still accepts any PASS completion event");
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
    assert(result?.completion?.schema === "media-server.v390-ui-action-completion.v2",
      `${item.caseId} semantic completion plan missing`);
    assert(result.completion.readbackIdentity === item.workflow.independentReadback.identity,
      `${item.caseId} readback identity mismatch`);
    assert(!item.oracle.allowedCompletionSources.includes("dom-transition"),
      `${item.caseId} arbitrary DOM completion source remains allowed`);
    assert(!item.oracle.allowedCompletionSources.includes("network-dom"),
      `${item.caseId} legacy network-dom completion source remains allowed`);
    for (const actionItem of item.workflow.controlSequence.filter(actionItem => actionItem.kind !== "wait-visible")) {
      assert(actionItem.semanticCompletion?.schema === "media-server.v390-ui-action-completion.v2",
        `${item.caseId} ${actionItem.kind} semantic action plan missing`);
      if (actionItem.semanticCompletion.request) {
        assert(actionItem.semanticCompletion.request.correlationSource === "request-header",
          `${item.caseId} ${actionItem.kind} request correlation source drift`);
      } else {
        assert(actionItem.semanticCompletion.localTransition ||
          actionItem.semanticCompletion.phase === "independent-readback",
        `${item.caseId} ${actionItem.kind} request/local/readback binding missing`);
      }
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
  let semanticActions = 0;
  let evaluatedActions = 0;
  let independentReadbacks = 0;
  let primarySelfComparisonsRejected = 0;
  for (const item of manifest.cases) {
    for (const actionItem of item.workflow.controlSequence.filter(candidate => candidate.kind !== "wait-visible")) {
      const completion = actionItem.semanticCompletion;
      semanticActions += 1;
      if (completion.phase === "independent-readback") {
        assert(completion.linkedPrimaryActionId === item.oracle.primaryActionId,
          `${item.caseId} independent readback primary link mismatch`);
        assert(completion.readback.staticLocatorIsNotRuntimePass === true,
          `${item.caseId} static readback locator became runtime PASS`);
        independentReadbacks += 1;
        continue;
      }
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
        completionPhase: completion.phase,
        actionId: completion.actionId,
        controlSelector: completion.controlSelector,
        semanticCompletionRequired: true,
        expectedReadbackIdentity: completion.readbackIdentity,
        expectedEndpoint: completion.request ? {
          correlationId: completion.request.correlationId,
          method: completion.request.method,
          urlPath: completion.request.urlPath,
          allowedStatuses: completion.request.allowedStatuses,
        } : null,
        expectedLocalTransition: completion.localTransition,
        allowedCompletionSources: [completion.requiredSource, ...completion.attestedAlternatives],
      };
      const semanticReadback = {
        schema: "media-server.v390-ui-semantic-readback.v1",
        identity: completion.readbackIdentity,
        correlationId: completion.correlationId,
        actionId: completion.actionId,
        observationSource: "browser-dom",
        selector: completion.controlSelector,
        expected: structuredClone(completion.readbackExpectation),
        observed: structuredClone(completion.readbackExpectation),
      };
      const status = completion.request?.allowedStatuses?.[0] || 0;
      const networkResponses = completion.request ? [{
        requestId: `${item.caseId}:${evaluatedActions}`,
        correlationId: completion.request.correlationId,
        correlationSource: "request-header",
        method: completion.request.method,
        status,
        url: `http://127.0.0.1${completion.request.urlPath.replace(/\{[^/{}]+\}/g, "contract-fixture")}`,
      }] : [];
      const before = { ...snapshot("idle", "before"), selector: completion.controlSelector };
      const after = { ...snapshot("ready", "after"), selector: completion.controlSelector };
      if (completion.localTransition) {
        const property = completion.localTransition.property;
        before[property] = property === "selectedValues" ? ["before"] : (property === "checked" || property === "open" ? false : "before");
        after[property] = property === "selectedValues" ? ["after"] : (property === "checked" || property === "open" ? true : "after");
      }
      if (completion.phase === "primary-action" && !negative) {
        const rejected = evaluateCompletionOracle({
          action: evidenceAction,
          before,
          after,
          networkResponses,
          semanticReadback,
        });
        assert(rejected.pass === false,
          `${item.caseId} manifest expected/observed self-comparison passed: ${rejected.reason}`);
        primarySelfComparisonsRejected += 1;
        continue;
      }
      const evaluated = evaluateCompletionOracle({
        action: evidenceAction,
        before,
        after,
        navigation: ["navigate", "navigate-negative"].includes(evidenceAction.kind)
          ? { status, url: networkResponses[0]?.url || `http://127.0.0.1${item.screenRoute}` }
          : null,
        allowedStatuses: completion.request?.allowedStatuses || [],
        networkResponses,
        semanticReadback,
      });
      assert(evaluated.pass && evaluated.source === completion.requiredSource,
        `${item.caseId} ${actionItem.kind} semantic plan failed: ${evaluated.reason}`);
      evaluatedActions += 1;
    }
  }
  assert(semanticActions === 1277, `semantic action plan count drift: ${semanticActions}`);
  assert(evaluatedActions > 0, "non-primary semantic plan evaluation disappeared");
  assert(primarySelfComparisonsRejected === 422,
    `primary self-comparison rejection count drift: ${primarySelfComparisonsRejected}`);
  assert(independentReadbacks === 422, `independent readback plan count drift: ${independentReadbacks}`);
});

check("REVIEW4-58 rejects initial navigation reuse for a primary action", () => {
  const primaryAction = {
    ...action("click"),
    actionId: "CASE-1:click",
    completionPhase: "primary-action",
    controlSelector: "#target",
    correlationId: "CASE-1:click:completion",
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "CASE-1:independent-readback",
    expectedBehaviorSha256: "b".repeat(64),
    expectedReadbackExpectation: { property: "text", value: "after" },
    expectedEndpoint: {
      correlationId: "CASE-1:navigation",
      method: "GET",
      urlPath: "/ops",
      allowedStatuses: [200],
    },
    allowedCompletionSources: ["endpoint-dom"],
  };
  const reusedNavigation = evaluateCompletionOracle({
    action: primaryAction,
    before: snapshot("idle", "before"),
    after: snapshot("ready", "after"),
    networkResponses: [{
      requestId: "initial-navigation-request",
      correlationId: "CASE-1:navigation",
      correlationSource: "request-header",
      method: "GET",
      status: 200,
      url: "http://127.0.0.1/ops",
    }],
    semanticReadback: {
      schema: "media-server.v390-ui-semantic-readback.v1",
      identity: "CASE-1:independent-readback",
      correlationId: "CASE-1:click:completion",
      actionId: "CASE-1:click",
      observationSource: "browser-dom",
      selector: "#target",
      expected: { property: "text", value: "after" },
      observed: { property: "text", value: "after" },
    },
  });
  assert(reusedNavigation.pass === false && reusedNavigation.reason === "action-request-correlation-mismatch",
    `initial navigation became primary completion: ${reusedNavigation.reason}`);
});

check("REVIEW4-58 requires exact-selector runtime readback and rejects manifest self-comparison", () => {
  const baseAction = {
    ...action("click"),
    actionId: "CASE-1:click",
    completionPhase: "primary-action",
    controlSelector: "#target",
    correlationId: "CASE-1:click:completion",
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "CASE-1:independent-readback",
    expectedBehaviorSha256: "b".repeat(64),
    expectedReadbackExpectation: { property: "text", value: "after" },
    expectedEndpoint: {
      correlationId: "CASE-1:click:completion",
      method: "POST",
      urlPath: "/ops/api/action",
      allowedStatuses: [200],
    },
    allowedCompletionSources: ["endpoint-dom"],
  };
  const networkResponses = [{
    requestId: "primary-action-request",
    correlationId: "CASE-1:click:completion",
    correlationSource: "request-header",
    method: "POST",
    status: 200,
    url: "http://127.0.0.1/ops/api/action",
  }];
  const forged = evaluateCompletionOracle({
    action: baseAction,
    before: snapshot("idle", "before"),
    after: snapshot("ready", "after"),
    networkResponses,
    semanticReadback: semanticV2({
      identity: "CASE-1:independent-readback",
      correlationId: "CASE-1:click:completion",
      actionId: "CASE-1:click",
      expectedBehaviorSha256: "b".repeat(64),
      observationSource: "manifest-projection",
      selector: "#target",
      observation: { before: snapshot("idle", "before"), after: snapshot("ready", "after") },
    }),
  });
  assert(forged.pass === false && forged.reason === "untrusted-readback-observation-source",
    `manifest self-comparison became completion: ${forged.reason}`);

  const wrongSelector = evaluateCompletionOracle({
    action: baseAction,
    before: snapshot("idle", "before"),
    after: snapshot("ready", "after"),
    networkResponses,
    semanticReadback: semanticV2({
      identity: "CASE-1:independent-readback",
      correlationId: "CASE-1:click:completion",
      actionId: "CASE-1:click",
      expectedBehaviorSha256: baseAction.expectedBehaviorSha256,
      observationSource: "browser-dom",
      selector: "#other",
      observation: { before: snapshot("idle", "before"), after: snapshot("ready", "after") },
    }),
  });
  assert(wrongSelector.pass === false && wrongSelector.reason === "readback-control-selector-mismatch",
    `wrong selector became completion: ${wrongSelector.reason}`);
});

check("REVIEW4-58 accepts only an action-bound local transition plus runtime readback", () => {
  const result = evaluateCompletionOracle({
    action: {
      ...action("select"),
      actionId: "CASE-1:select",
      completionPhase: "primary-action",
      controlSelector: "#target",
      correlationId: "CASE-1:select:completion",
      semanticCompletionRequired: true,
      expectedReadbackIdentity: "CASE-1:independent-readback",
      expectedBehaviorSha256: "a".repeat(64),
      expectedReadbackExpectation: { property: "selectedValues", value: ["beta"] },
      expectedEndpoint: null,
      expectedLocalTransition: {
        selector: "#target",
        property: "selectedValues",
      },
      allowedCompletionSources: ["local-transition-readback"],
    },
    before: { ...snapshot("ready", "before"), selectedValues: ["alpha"] },
    after: { ...snapshot("ready", "after"), selectedValues: ["beta"] },
    semanticReadback: semanticV2({
      identity: "CASE-1:independent-readback",
      correlationId: "CASE-1:select:completion",
      actionId: "CASE-1:select",
      expectedBehaviorSha256: "a".repeat(64),
      observationSource: "browser-dom",
      selector: "#target",
      observation: {
        before: { ...snapshot("ready", "before"), selectedValues: ["alpha"] },
        after: { ...snapshot("ready", "after"), selectedValues: ["beta"] },
      },
    }),
  });
  assert(result.pass && result.source === "local-transition-readback",
    `action-bound local transition failed: ${result.reason}`);
  assert(result.completionPhase === "primary-action" && result.actionId === "CASE-1:select" &&
    result.controlSelector === "#target", "action completion identity missing");
});

check("REVIEW4-58 locks one exact request and rejects another fixture or duplicate request", () => {
  const completionAction = {
    ...action("click"),
    actionId: "CASE-1:save",
    actionKind: "execute-persisted-action",
    completionPhase: "primary-action",
    controlSelector: "#save",
    correlationId: "CASE-1:save:completion",
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "CASE-1:readback",
    expectedBehaviorSha256: "c".repeat(64),
    expectedReadbackExpectation: { exists: true, visible: true },
    expectedEndpoint: {
      correlationId: "CASE-1:save:completion",
      method: "PUT",
      urlPathTemplate: "/ops/api/sources/{fixtureId}",
      urlPath: "/ops/api/sources/case-1-fixture",
      allowedStatuses: [200],
    },
    allowedCompletionSources: ["endpoint-dom"],
  };
  const readback = semanticV2({
    identity: "CASE-1:readback",
    correlationId: completionAction.correlationId,
    actionId: completionAction.actionId,
    expectedBehaviorSha256: completionAction.expectedBehaviorSha256,
    observationSource: "browser-dom",
    selector: "#save",
    observation: {
      before: { ...snapshot("idle", "before"), selector: "#save" },
      after: { ...snapshot("ready", "after"), selector: "#save" },
    },
  });
  const wrongSameCorrelation = {
    requestId: "poll-request",
    correlationId: completionAction.correlationId,
    correlationSource: "request-header",
    method: "GET",
    status: 200,
    url: "http://127.0.0.1/ops/api/poll",
  };
  const exact = {
    requestId: "save-request",
    correlationId: completionAction.correlationId,
    correlationSource: "request-header",
    method: "PUT",
    status: 200,
    url: "http://127.0.0.1/ops/api/sources/case-1-fixture",
  };
  const accepted = evaluateCompletionOracle({
    action: completionAction,
    before: readback.observation.before,
    after: readback.observation.after,
    networkResponses: [wrongSameCorrelation, exact],
    semanticReadback: readback,
  });
  assert(accepted.pass && accepted.completionRequest?.requestId === "save-request" &&
    accepted.networkResponses.length === 1 && accepted.networkResponses[0].requestId === "save-request",
  "exact completion request was not locked");

  const wrongFixture = structuredClone(exact);
  wrongFixture.url = "http://127.0.0.1/ops/api/sources/other-fixture";
  const rejectedFixture = evaluateCompletionOracle({
    action: completionAction,
    before: readback.observation.before,
    after: readback.observation.after,
    networkResponses: [wrongFixture],
    semanticReadback: readback,
  });
  assert(!rejectedFixture.pass && rejectedFixture.reason === "request-correlation-missing",
    "another workflow fixture satisfied the exact request");

  const duplicate = evaluateCompletionOracle({
    action: completionAction,
    before: readback.observation.before,
    after: readback.observation.after,
    networkResponses: [exact, { ...exact, requestId: "save-request-duplicate" }],
    semanticReadback: readback,
  });
  assert(!duplicate.pass && duplicate.reason === "ambiguous-exact-request",
    "duplicate exact requests satisfied a single-action completion");
});

check("REVIEW4-58 exact 424 primary completion contracts bind product action and independent readback", () => {
  for (const item of manifest.cases) {
    const completion = item.workflow.expectedResults[0]?.completion;
    assert(completion?.schema === "media-server.v390-ui-action-completion.v2",
      `${item.caseId} action completion v2 missing`);
    assert(completion.phase === "primary-action", `${item.caseId} primary completion phase mismatch`);
    assert(completion.actionId === item.oracle.primaryActionId, `${item.caseId} primary action ID mismatch`);
    assert(completion.correlationId === item.oracle.primaryActionCorrelationId,
      `${item.caseId} primary correlation mismatch`);
    assert(completion.controlSelector === item.workflow.primaryControl.selector,
      `${item.caseId} exact control selector mismatch`);
    assert(completion.expectedBehaviorSha256 === item.workflow.expectedProductState.expectedBehaviorSha256,
      `${item.caseId} expected behavior digest mismatch`);
    assert(completion.readback.identity === item.workflow.independentReadback.identity,
      `${item.caseId} independent readback identity mismatch`);
    assert(completion.readback.staticLocatorIsNotRuntimePass === true,
      `${item.caseId} static readback locator became runtime evidence`);
    const endpoint = item.workflow.productAction.endpoint;
    const localAction = item.workflow.productAction.localAction;
    assert(Boolean(completion.request) !== Boolean(completion.localTransition),
      `${item.caseId} action binding must be exclusive`);
    if (endpoint) {
      assert(completion.request.correlationId === completion.correlationId,
        `${item.caseId} request is not action-correlated`);
      assert(completion.request.correlationId !== `${item.caseId}:navigation`,
        `${item.caseId} reuses initial navigation correlation`);
      assert(completion.request.method === endpoint.method && completion.request.urlPathTemplate === endpoint.path &&
        !completion.request.urlPath.includes("{") &&
        JSON.stringify(completion.request.allowedStatuses) === JSON.stringify(endpoint.allowedStatuses),
      `${item.caseId} product endpoint completion mismatch`);
    } else {
      assert(completion.localTransition.selector === item.workflow.primaryControl.selector &&
        completion.localTransition.type === localAction.type && completion.localTransition.effect === localAction.effect,
      `${item.caseId} local transition completion mismatch`);
    }
  }
  for (const snippet of [
    "executeIndependentReadback",
    "__pendingPrimaryCompletion",
    "__completedPrimaryReadback",
    "linked independent runtime readback completion missing",
  ]) {
    assert(exactRunnerSource.includes(snippet), `exact runner linked readback flow missing ${snippet}`);
  }
  assert(!exactRunnerSource.includes("source locator metadata is not execution evidence"),
    "independent runtime readback remains an unconditional throw");
});

check("REVIEW4-58 corrected all activate-control handlers with exact transaction or postcondition oracles", () => {
  for (const caseId of ["RULE-016", "RULE-073", "RULE-075"]) {
    const item = manifest.cases.find(candidate => candidate.caseId === caseId);
    const completion = item.workflow.expectedResults[0].completion;
    assert(item.workflow.workflowClass === "persisted-mutation" &&
      item.workflow.controlSequence.some(actionItem => actionItem.kind === "execute-persisted-action") &&
      completion.request?.method === "PUT" && !completion.request.urlPath.includes("{") &&
      completion.request.allowedStatuses.length === 1 && completion.request.allowedStatuses[0] === 200,
    `${caseId} save transaction is not exact`);
  }
  for (const caseId of ["UI-036", "SRC-024", "RULE-101", "RULE-102", "CLIENT-002", "CLIENT-005", "SAFE-038"]) {
    const item = manifest.cases.find(candidate => candidate.caseId === caseId);
    const completion = item.workflow.expectedResults[0].completion;
    assert(completion.localTransition?.property === null &&
      Array.isArray(completion.localTransition.postconditions) &&
      completion.localTransition.postconditions.length >= 2,
    `${caseId} still uses the generic url/activated completion`);
    assert(completion.readbackExpectation.postconditions.length === completion.localTransition.postconditions.length,
      `${caseId} runtime postcondition readback drift`);
  }
  const rule101 = manifest.cases.find(item => item.caseId === "RULE-101");
  assert(rule101.workflow.expectedResults[0].completion.localTransition.forbiddenRequests.some(request =>
    request.methods.includes("PUT") && request.pathPrefix === "/lab/analysis/va-rules/"),
  "RULE-101 UI no-dispatch oracle missing");
  const rule102 = manifest.cases.find(item => item.caseId === "RULE-102");
  assert(rule102.workflow.primaryControl.selector === "#opsEventRuleTypeSelect" &&
    rule102.workflow.expectedResults[0].completion.actionKind === "select-control",
  "RULE-102 review-loop cause remains bound to save click");
  for (const caseId of ["CLIENT-002", "CLIENT-005"]) {
    const completion = manifest.cases.find(item => item.caseId === caseId).workflow.expectedResults[0].completion;
    assert(completion.localTransition.seedRequirements?.length === 1 &&
      completion.localTransition.requiredRequests?.length >= 1,
    `${caseId} live session seed/request completion missing`);
  }
});

check("REVIEW4-58 form readback snapshots the exact submit control and never relabels the form", () => {
  for (const item of manifest.cases.filter(candidate => candidate.workflow.workflowClass === "form-submit")) {
    const actionItem = item.workflow.controlSequence.find(candidate => candidate.kind === "submit-form");
    const completion = item.workflow.expectedResults[0].completion;
    assert(actionItem?.submitSelector === completion.controlSelector &&
      actionItem.selector !== completion.controlSelector,
    `${item.caseId} form/submit selector distinction missing`);
  }
  assert(exactRunnerSource.includes("action.submitSelector || action.selector"),
    "runner snapshots the form while labeling the submit selector");
  assert(completionOracleSource.includes("snapshot => snapshot.selector !== action.controlSelector"),
    "runtime v2 readback does not verify raw snapshot selectors");
});

check("REVIEW4-58 rejects pre-existing postconditions and in-flight forbidden dispatch", () => {
  const postconditions = [
    { selector: "#panel", property: "hidden", operator: "equals", value: false },
    { selector: "#status", property: "text", operator: "includes", value: "저장 전 검증 실패" },
  ];
  const completionAction = {
    ...action("click"),
    actionId: "CASE-1:local-action",
    completionPhase: "primary-action",
    controlSelector: "#target",
    correlationId: "CASE-1:local-action:completion",
    semanticCompletionRequired: true,
    expectedReadbackIdentity: "CASE-1:readback",
    expectedBehaviorSha256: "d".repeat(64),
    expectedReadbackExpectation: { postconditions },
    expectedLocalTransition: {
      selector: "#target",
      property: null,
      postconditions,
      forbiddenRequests: [{ methods: ["PUT"], pathPrefix: "/lab/analysis/va-rules/" }],
    },
    allowedCompletionSources: ["local-transition-readback"],
  };
  const panelExpected = { ...snapshot("ready", "panel"), selector: "#panel", hidden: false };
  const statusExpected = {
    ...snapshot("ready", "저장 전 검증 실패: class conflict"),
    selector: "#status",
  };
  const readback = beforeSnapshots => semanticV2({
    identity: completionAction.expectedReadbackIdentity,
    correlationId: completionAction.correlationId,
    actionId: completionAction.actionId,
    expectedBehaviorSha256: completionAction.expectedBehaviorSha256,
    observationSource: "browser-dom",
    selector: completionAction.controlSelector,
    observation: {
      before: { ...snapshot("ready", "before"), selector: "#target" },
      after: { ...snapshot("ready", "after"), selector: "#target" },
      beforeSnapshots,
      snapshots: { "#panel": panelExpected, "#status": statusExpected },
    },
  });
  const noOp = evaluateCompletionOracle({
    action: completionAction,
    before: { ...snapshot("ready", "before"), selector: "#target" },
    after: { ...snapshot("ready", "after"), selector: "#target" },
    semanticReadback: readback({ "#panel": panelExpected, "#status": statusExpected }),
  });
  assert(!noOp.pass && noOp.reason === "semantic-readback-observation-mismatch",
    "pre-existing postconditions satisfied a no-op action");

  const transitionedReadback = readback({
    "#panel": { ...panelExpected, hidden: true },
    "#status": { ...statusExpected, text: "편집 중" },
  });
  const inFlightForbidden = evaluateCompletionOracle({
    action: completionAction,
    before: transitionedReadback.observation.before,
    after: transitionedReadback.observation.after,
    semanticReadback: transitionedReadback,
    networkResponses: [{
      phase: "request-start",
      requestId: "forbidden-put-start",
      correlationId: completionAction.correlationId,
      correlationSource: "request-header",
      method: "PUT",
      status: 0,
      url: "http://127.0.0.1/lab/analysis/va-rules/rule-101-review4-fixture",
    }],
  });
  assert(!inFlightForbidden.pass && inFlightForbidden.reason === "forbidden-action-request-observed",
    "in-flight forbidden request escaped the no-dispatch oracle");

  const unrelatedPriorResponse = evaluateCompletionOracle({
    action: completionAction,
    before: transitionedReadback.observation.before,
    after: transitionedReadback.observation.after,
    semanticReadback: transitionedReadback,
    networkResponses: [{
      phase: "response",
      requestId: "prior-request-response",
      correlationId: "CASE-1:navigation",
      correlationSource: "request-header",
      method: "PUT",
      status: 200,
      url: "http://127.0.0.1/lab/analysis/va-rules/prior-request",
    }],
  });
  assert(unrelatedPriorResponse.pass && unrelatedPriorResponse.source === "local-transition-readback",
    `pre-action response caused forbidden-request false fail: ${unrelatedPriorResponse.reason}`);

  const accepted = evaluateCompletionOracle({
    action: completionAction,
    before: transitionedReadback.observation.before,
    after: transitionedReadback.observation.after,
    semanticReadback: transitionedReadback,
  });
  assert(accepted.pass && accepted.source === "local-transition-readback",
    `postcondition transition failed: ${accepted.reason}`);
  for (const snippet of ["page.on(\"request\"", "phase: \"request-start\"", "waitForNetworkQuiet"] ) {
    assert(adapterSource.includes(snippet), `adapter no-dispatch boundary missing ${snippet}`);
  }
  assert(completionOracleSource.includes('entry?.phase !== "request-start"'),
    "forbidden requests are not bound to request-start events");
  assert(exactRunnerSource.indexOf("waitForNetworkQuiet") < exactRunnerSource.indexOf("setCorrelationId(`${item.caseId}:navigation`)",
    exactRunnerSource.indexOf("waitForNetworkQuiet")),
  "runner restores action correlation before the settle/quiet boundary");
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

function semanticV2(value) {
  return {
    schema: "media-server.v390-ui-semantic-readback.v2",
    ...value,
    observationSha256: domSnapshotDigest(value.observation),
  };
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
