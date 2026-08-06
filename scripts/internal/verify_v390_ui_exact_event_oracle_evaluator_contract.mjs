#!/usr/bin/env node
// 파일 용도: exact EVT runtime evaluator가 response/DOM/network/state assertion을 실제 평가하고 미지원 의미를 fail-closed 처리하는지 검증한다.

import crypto from "node:crypto";

import {
  assertEventExactRuntimeBindings,
  createEventExactOracleEvaluationPlan,
  evaluateEventExactDomAssertion,
  evaluateEventExactForbiddenNetwork,
  evaluateEventExactOracle,
  evaluateEventExactRequests,
  evaluateEventExactResponseAssertion,
  evaluateEventExactStateAndCleanup,
  evaluateEventExactVisibleControl,
  evaluateResponseDerivedDomFieldProjection,
  eventExactOracleEvaluatorCapabilities,
  eventExactSemanticEvidenceKey,
  eventExactValuesAtPath,
  materializeEventExactTemplate,
  responseDerivedDomProjectionContractFor,
} from "./v390_ui_exact_event_oracle_evaluator.mjs";
import {
  eventExactOracleCaseIds,
  eventExactOracleFor,
} from "./v390_ui_exact_event_oracles.mjs";

const checks = [];
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function check(name, callback) {
  try {
    callback();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", detail: String(error?.message || error) });
  }
}

check("path resolver expands array projections without inventing missing values", () => {
  const value = { records: [{ eventId: "a" }, { eventId: "b" }] };
  assert(JSON.stringify(eventExactValuesAtPath(value, "records[].eventId")) === JSON.stringify(["a", "b"]), "array path projection mismatch");
  assert(eventExactValuesAtPath(value, "records[].missing").length === 0, "missing path was invented");
});

check("template materialization requires every dynamic value and URL-encodes it", () => {
  assert(materializeEventExactTemplate("/reviews/{fixtureId}", { fixtureId: "fixture a" }) === "/reviews/fixture%20a", "template encoding mismatch");
  let message = "";
  try { materializeEventExactTemplate("/reviews/{fixtureId}", {}); } catch (error) { message = String(error?.message || error); }
  assert(message.includes("missing exact oracle template value"), "missing template value did not fail closed");
});

check("response evaluator executes equals, number-gte, and forbidden path checks", () => {
  const base = { caseId: "EVT-001", responseJson: { ok: true, sessionManager: { activeSessions: 2 } }, context: { fixtureId: "fixture" } };
  assert(evaluateEventExactResponseAssertion({ ...base, assertion: { path: "ok", operator: "equals", expected: true } }).pass, "equals did not execute");
  assert(evaluateEventExactResponseAssertion({ ...base, assertion: { path: "sessionManager.activeSessions", operator: "number-gte", expected: 1 } }).pass, "number-gte did not execute");
  assert(!evaluateEventExactResponseAssertion({ ...base, assertion: { path: "sessionManager.activeSessions", operator: "number-gte", expected: 3 } }).pass, "number-gte false result passed");
  assert(!evaluateEventExactResponseAssertion({ ...base, assertion: { path: "sessionManager.missing", operator: "number", expected: true } }).pass, "missing response path passed");
});

check("array response assertions validate the selected collection without flattening it", () => {
  const base = { caseId: "EVT-025", context: { fixtureId: "fixture" } };
  assert(evaluateEventExactResponseAssertion({
    ...base,
    assertion: { path: "webrtcHttp.publishSources", operator: "array", expected: true },
    responseJson: { webrtcHttp: { publishSources: [] } },
  }).pass, "empty publishSources collection was not recognized as an array");
  assert(evaluateEventExactResponseAssertion({
    ...base,
    assertion: { path: "webrtcHttp.publishSources", operator: "array", expected: true },
    responseJson: { webrtcHttp: { publishSources: [{ sourceId: "one" }] } },
  }).pass, "non-empty publishSources collection was flattened before type validation");
  assert(!evaluateEventExactResponseAssertion({
    ...base,
    assertion: { path: "webrtcHttp.publishSources", operator: "array", expected: true },
    responseJson: { webrtcHttp: { publishSources: { sourceId: "one" } } },
  }).pass, "object publishSources value passed the array contract");
  assert(!evaluateEventExactResponseAssertion({
    ...base,
    assertion: { path: "groups[].publishSources", operator: "array", expected: true },
    responseJson: {
      groups: [
        { publishSources: [{ sourceId: "one" }] },
        { publishSources: [{ sourceId: "two" }] },
      ],
    },
  }).pass, "multiple resolved collections were combined into one array value");
});

check("request evaluator requires the correlated runtime exchange", () => {
  const spec = {
    caseId: "EVT-TEST",
    requests: [{
      method: "GET",
      path: "/fixture/{fixtureId}",
      allowedStatuses: [200],
      correlationRequired: true,
      forbiddenJsonKeys: ["password"],
      assertions: [{ path: "ok", operator: "equals", expected: true }],
    }],
  };
  const base = { spec, context: { fixtureId: "fixture", templateValues: { fixtureId: "fixture" } } };
  const missing = evaluateEventExactRequests({ ...base, exchanges: [{ method: "GET", path: "/fixture/fixture", status: 200, json: { ok: true } }] });
  assert(missing.some(item => item.kind === "request-correlation" && !item.pass), "missing correlation passed");
  const present = evaluateEventExactRequests({ ...base, exchanges: [{ method: "GET", path: "/fixture/fixture", status: 200, correlationId: "cid-1", json: { ok: true } }] });
  assert(present.every(item => item.pass), "valid correlated exchange failed");
  const forbidden = evaluateEventExactRequests({ ...base, exchanges: [{ method: "GET", path: "/fixture/fixture", status: 200, correlationId: "cid-1", json: { ok: true, password: "secret" } }] });
  assert(forbidden.some(item => item.kind === "forbidden-json-key" && !item.pass), "forbidden JSON key passed");
});

check("seed/request/readback equality operators require real expected values", () => {
  const assertion = { path: "review", operator: "equals-requested-fields", expected: true };
  const missing = evaluateEventExactResponseAssertion({ caseId: "EVT-021", assertion, responseJson: { review: { status: "confirmed" } }, context: { fixtureId: "fixture" } });
  assert(!missing.pass && missing.reason.includes("expected value missing"), "missing request evidence passed");
  const present = evaluateEventExactResponseAssertion({ caseId: "EVT-021", assertion, responseJson: { review: { status: "confirmed" } }, context: { fixtureId: "fixture", requestByPath: { review: { status: "confirmed" } } } });
  assert(present.pass, "request equality evidence did not pass");
});

check("domain-specific response operators require keyed semantic evidence and verify actual binding", () => {
  const assertion = { path: "records", operator: "contains-matching-and-missing", expected: true };
  const responseJson = { records: [{ eventId: "fixture" }] };
  const missing = evaluateEventExactResponseAssertion({ caseId: "EVT-030", assertion, responseJson, context: { fixtureId: "fixture" } });
  assert(!missing.pass && missing.reason.includes("semantic evidence missing"), "uninterpreted semantic operator passed");
  const key = "response:EVT-030:contains-matching-and-missing:records";
  const pass = evaluateEventExactResponseAssertion({ caseId: "EVT-030", assertion, responseJson, context: { fixtureId: "fixture", semanticEvidence: { [key]: { pass: true, actual: responseJson.records } } } });
  assert(pass.pass, "keyed response semantic evidence did not execute");
  const mismatch = evaluateEventExactResponseAssertion({ caseId: "EVT-030", assertion, responseJson, context: { fixtureId: "fixture", semanticEvidence: { [key]: { pass: true, actual: [] } } } });
  assert(!mismatch.pass, "semantic evidence detached from actual response passed");
});

check("DOM evaluator executes number-equals-response and fails without response evidence", () => {
  const assertion = { operator: "number-equals-response", target: "sessionManager.activeSessions", expected: true };
  const observation = { selector: "#dashActiveSessions", exists: true, visible: true, text: "2", number: 2 };
  assert(evaluateEventExactDomAssertion({ caseId: "EVT-001", assertion, observation, context: { fixtureId: "fixture", responseValues: { "sessionManager.activeSessions": 2 } } }).pass, "DOM number/response comparison failed");
  assert(!evaluateEventExactDomAssertion({ caseId: "EVT-001", assertion, observation, context: { fixtureId: "fixture", responseValues: {} } }).pass, "DOM number comparison passed without response evidence");
  assert(!evaluateEventExactDomAssertion({ caseId: "EVT-001", assertion, observation, context: { fixtureId: "fixture", responseValues: { "sessionManager.activeSessions": 3 } } }).pass, "wrong DOM number passed");
});

check("review note seed equality uses presence and digest without retaining raw note", () => {
  const note = "review4 safe operator note";
  const assertion = {
    path: "records[].review.note",
    operator: "equals-seed",
    required: true,
  };
  const digest = crypto.createHash("sha256").update(note).digest("hex");
  const context = {
    seedByPath: {
      "records[].review.note": { present: true, sha256: digest },
    },
  };
  const pass = evaluateEventExactResponseAssertion({
    caseId: "EVT-020",
    assertion,
    responseJson: { records: [{ review: { note } }] },
    context,
  });
  assert(pass.pass === true && pass.reason === "equals-seed-digest",
    "review note digest seed did not pass");
  assert(!JSON.stringify(pass).includes(note),
    "review note digest evidence retained raw note");

  const drift = evaluateEventExactResponseAssertion({
    caseId: "EVT-020",
    assertion,
    responseJson: { records: [{ review: { note: "different" } }] },
    context,
  });
  assert(drift.pass === false, "review note digest drift did not fail closed");

  const missing = evaluateEventExactResponseAssertion({
    caseId: "EVT-020",
    assertion,
    responseJson: { records: [{ review: {} }] },
    context,
  });
  assert(missing.pass === false, "missing review note path did not fail closed");
});

check("domain-specific DOM operators require keyed semantic evidence", () => {
  const assertion = { operator: "fields-equal-response", target: "event/review", expected: true };
  const observation = { selector: "[data-event-review-row]", exists: true, visible: true, text: "fixture" };
  const missing = evaluateEventExactDomAssertion({ caseId: "EVT-019", assertion, observation, context: { fixtureId: "fixture" } });
  assert(!missing.pass && missing.reason.includes("semantic evidence missing"), "uninterpreted DOM operator passed");
  const key = "dom:EVT-019:fields-equal-response:event/review";
  assert(evaluateEventExactDomAssertion({ caseId: "EVT-019", assertion, observation, context: { fixtureId: "fixture", semanticEvidence: { [key]: { pass: true, actual: observation } } } }).pass, "DOM semantic evidence did not execute");
});

check("response-derived DOM projection normalizes field ownership without selector-only PASS", () => {
  const fixtureId = "evt-focused-fixture";
  const responseBodies = [{ readiness: { items: [{
    eventId: fixtureId,
    approvalState: "operator-approved",
    validationSummary: "schema valid",
    notRun: 2,
    dryRunStatus: "blocked-not-run",
  }, {
    eventId: "unrelated-event",
    sourceId: "9001",
    approvalState: "wrong-owner",
    validationSummary: "wrong-summary",
    notRun: 99,
    dryRunStatus: "wrong-dry-run",
  }] } }];
  const base = {
    caseId: "EVT-FOCUSED",
    operator: "fields-equal-response",
    target: "approvalState/validationSummary/not-run/dry-run",
    responseBodies,
    fixtureCandidates: [fixtureId, "9001"],
  };
  const pass = evaluateResponseDerivedDomFieldProjection({
    ...base,
    observation: {
      count: 1,
      visibleCount: 1,
      text: "operator approved · schema valid · not-run 2 · blocked-not-run",
      nodeTexts: ["operator approved · schema valid · not-run 2 · blocked-not-run"],
      attributes: [{ "data-event-id": fixtureId }],
      values: [],
    },
  });
  assert(pass.pass && pass.matchedFieldCount === 4,
    "camel/kebab renderer projection normalization did not pass");
  assert(!JSON.stringify(pass).includes(fixtureId) &&
    !JSON.stringify(pass).includes("operator-approved"),
  "response-derived projection evidence retained raw identity or values");

  const selectorOnly = evaluateResponseDerivedDomFieldProjection({
    ...base,
    observation: { count: 1, visibleCount: 1, text: "readiness card", nodeTexts: ["readiness card"] },
  });
  assert(!selectorOnly.pass && selectorOnly.failureCode ===
    "RENDERER_PROJECTION_VALUE_MISMATCH",
  "selector-only DOM observation passed response-derived field projection");

  const unrelated = evaluateResponseDerivedDomFieldProjection({
    ...base,
    responseBodies: [{ readiness: { items: [{
      eventId: "other",
      approvalState: "operator-approved",
      validationSummary: "schema-valid",
      notRun: 2,
      dryRunStatus: "blocked-not-run",
    }] } }],
    observation: { count: 1, visibleCount: 1, text: "operator approved schema valid 2 blocked-not-run" },
  });
  assert(!unrelated.pass && unrelated.failureCode === "RESPONSE_FIELD_OWNER_MISSING",
    "unrelated response object supplied projected field ownership");

  const duplicate = evaluateResponseDerivedDomFieldProjection({
    ...base,
    responseBodies: [{ readiness: { items: [
      responseBodies[0].readiness.items[0],
      structuredClone(responseBodies[0].readiness.items[0]),
    ] } }],
    observation: { count: 1, visibleCount: 1, text: "operator approved schema valid 2 blocked-not-run" },
  });
  assert(!duplicate.pass && duplicate.matchedFieldCount === 0 &&
    duplicate.failureCode === "RESPONSE_FIELD_OWNER_AMBIGUOUS",
    "duplicate fixture response owners produced a DOM projection PASS");
});

check("EVT-041 highlight fragments bind the renderer-visible whitespace projection by exact index", () => {
  const fixtureId = "evt-041-review4-fixture";
  const documentId = `event-record:${fixtureId}`;
  const responseFragments = [
    "fixture fragment\nzero",
    "fixture\tfragment one",
    "fixture  fragment two",
  ];
  const visibleFragments = responseFragments.map(value => value.replace(/\s+/gu, " ").trim());
  const base = {
    caseId: "EVT-041",
    operator: "highlight-fragments-equal-response",
    target: "highlightFragments",
    responseBodies: [{ memorySearch: { hits: [{
      documentId,
      highlightFragments: responseFragments,
    }] } }],
    fixtureCandidates: [fixtureId],
    fixtureIdentity: fixtureId,
  };
  const observation = fragments => ({
    count: 1,
    visibleCount: 1,
    semanticNodes: [{
      eventId: documentId,
      attributes: {},
      fields: { highlightFragments: fragments },
    }],
  });
  const contract = responseDerivedDomProjectionContractFor(base);
  assert(contract?.fields?.[0]?.[3] === "collapse-whitespace-text",
    "EVT-041 highlightFragments renderer transform is not explicit");
  const pass = evaluateResponseDerivedDomFieldProjection({
    ...base,
    observation: observation(visibleFragments),
  });
  assert(pass.pass && pass.fieldEvidence[0].projectedValueCount === 3 &&
    pass.fieldEvidence[0].matchedValueCount === 3 && pass.fieldEvidence[0].orderPass,
  "EVT-041 whitespace-only renderer projection did not preserve exact 3/3 index binding");
  for (const [label, fragments] of [
    ["missing", visibleFragments.slice(0, 2)],
    ["duplicate", [visibleFragments[0], visibleFragments[1], visibleFragments[1]]],
    ["reordered", [visibleFragments[1], visibleFragments[0], visibleFragments[2]]],
    ["semantic-change", [visibleFragments[0], `${visibleFragments[1]} changed`, visibleFragments[2]]],
  ]) {
    const result = evaluateResponseDerivedDomFieldProjection({
      ...base,
      observation: observation(fragments),
    });
    assert(!result.pass && result.failureCode === "RENDERER_PROJECTION_VALUE_MISMATCH",
      `EVT-041 ${label} fragment mutation unexpectedly passed`);
  }
  const wrongOwner = evaluateResponseDerivedDomFieldProjection({
    ...base,
    observation: {
      ...observation(visibleFragments),
      semanticNodes: [{
        eventId: "event-record:wrong-fixture",
        attributes: {},
        fields: { highlightFragments: visibleFragments },
      }],
    },
  });
  assert(!wrongOwner.pass && wrongOwner.failureCode === "DOM_PROJECTION_OWNER_MISSING",
    "EVT-041 wrong fixture DOM owner unexpectedly passed");
  const splitOwner = evaluateResponseDerivedDomFieldProjection({
    ...base,
    observation: {
      count: 2,
      visibleCount: 2,
      semanticNodes: [
        { eventId: documentId, attributes: {}, fields: { highlightFragments: visibleFragments.slice(0, 1) } },
        { eventId: documentId, attributes: {}, fields: { highlightFragments: visibleFragments.slice(1) } },
      ],
    },
  });
  assert(!splitOwner.pass && splitOwner.failureCode === "DOM_PROJECTION_OWNER_AMBIGUOUS",
    "EVT-041 split DOM owner unexpectedly passed");
});

check("response-derived ordered collection projection fails on renderer order drift", () => {
  const fixtureId = "evt-order-fixture";
  const base = {
    caseId: "EVT-ORDER",
    operator: "stage-order-equals-response",
    target: "nodes",
    responseBodies: [{ timelineGraph: { nodes: [
      { stage: "source-state", eventId: fixtureId },
      { stage: "event-record", eventId: fixtureId },
      { stage: "close-state", eventId: fixtureId },
    ] } }],
    fixtureCandidates: [fixtureId],
  };
  const pass = evaluateResponseDerivedDomFieldProjection({
    ...base,
    observation: { count: 3, visibleCount: 3, text: "Source Event Close" },
  });
  assert(pass.pass, "ordered response stages did not project to DOM");
  const drift = evaluateResponseDerivedDomFieldProjection({
    ...base,
    observation: { count: 3, visibleCount: 3, text: "Event Source Close" },
  });
  assert(!drift.pass && drift.failureCode === "RENDERER_PROJECTION_ORDER_MISMATCH",
    "renderer order drift passed response order ownership");
});

check("fixed remaining response-derived contracts bind one fixture row to one DOM owner", () => {
  const fixtureId = "evt-043-review4-fixture";
  const args = {
    caseId: "EVT-043",
    operator: "slot-values-equal-response",
    target: "action/object/context/environment",
    fixtureIdentity: fixtureId,
    fixtureCandidates: [fixtureId, "9001"],
    responseBodies: [{
      aggregate: { actionSlot: { value: "aggregate-must-not-own" } },
      incidentBrief: { briefs: [{
        eventId: fixtureId,
        actionSlot: { value: "enter" }, objectSlot: { value: "zone-a" },
        contextSlot: { value: "after-exit" }, environmentSlot: { value: "camera-1" },
      }] },
    }],
    observation: {
      count: 1, visibleCount: 1,
      semanticNodes: [{
        eventId: fixtureId, attributes: {}, fields: {
          action: ["enter"], object: ["zone-a"],
          context: ["after-exit"], environment: ["camera-1"],
        },
      }],
    },
  };
  const passing = evaluateResponseDerivedDomFieldProjection(args);
  assert(passing.pass && passing.matchedFieldCount === 4,
    "fixture-owned row and same-node DOM projection did not pass");
  const duplicate = evaluateResponseDerivedDomFieldProjection({
    ...args,
    responseBodies: [{ incidentBrief: { briefs: [
      args.responseBodies[0].incidentBrief.briefs[0],
      structuredClone(args.responseBodies[0].incidentBrief.briefs[0]),
    ] } }],
  });
  assert(!duplicate.pass && duplicate.failureCode === "RESPONSE_FIELD_OWNER_AMBIGUOUS",
    "duplicate authoritative response rows did not fail closed");
  const wrongFixture = evaluateResponseDerivedDomFieldProjection({
    ...args,
    observation: { count: 1, visibleCount: 1, semanticNodes: [{
      ...args.observation.semanticNodes[0], eventId: "wrong-fixture",
    }] },
  });
  assert(!wrongFixture.pass && wrongFixture.failureCode === "DOM_PROJECTION_OWNER_MISSING",
    "wrong DOM fixture identity did not fail closed");
  const splitNode = evaluateResponseDerivedDomFieldProjection({
    ...args,
    observation: { count: 2, visibleCount: 2, semanticNodes: [
      { eventId: fixtureId, attributes: {}, fields: { action: ["enter"], object: ["zone-a"] } },
      { eventId: fixtureId, attributes: {}, fields: { context: ["after-exit"], environment: ["camera-1"] } },
    ] },
  });
  assert(!splitNode.pass && splitNode.failureCode === "DOM_PROJECTION_OWNER_AMBIGUOUS",
    "split or duplicate DOM owners did not fail closed");
  const drift = evaluateResponseDerivedDomFieldProjection({
    ...args,
    observation: { ...args.observation, semanticNodes: [{
      ...args.observation.semanticNodes[0],
      fields: { ...args.observation.semanticNodes[0].fields, action: ["leave"] },
    }] },
  });
  assert(!drift.pass && drift.failureCode === "RENDERER_PROJECTION_VALUE_MISMATCH",
    "renderer field drift did not fail closed");
});

check("fixed remaining contracts cover all 22 diagnosed response DOM owners", () => {
  const keys = [
    ["EVT-043", "slot-values-equal-response", "action/object/context/environment"],
    ["EVT-044", "related-order-equals-response", "score"],
    ["EVT-046", "candidate-fields-equal-response", "eventId/score/matchedTerms"],
    ["EVT-047", "fields-equal-response", "suggestion/candidates/manualDraftRoute"],
    ["EVT-049", "contains-fixture-event", "eventId"],
    ["EVT-050", "card-fields-equal-response", "lane/priority/status"],
    ["EVT-051", "score-equals-response", "score"],
    ["EVT-052", "links-equal-response", "bundle/draft/dry-run/recheck"],
    ["EVT-053", "fields-equal-response", "draftComparison/conditionPreview/manualDraftRoute"],
    ["EVT-054", "counts-equal-response", "accepted/dismissed/reviewNeeded"],
    ["EVT-055", "states-equal-response", "ready/blocked/field-smoke-needed/not-run"],
    ["EVT-056", "flags-equal", "noAutoSave/noAutoApply/ruleRegistryWritePerformed"],
    ["EVT-057", "states-equal-response", "passed/failed/blocked/not-run"],
    ["EVT-058", "window-fields-equal-response", "eventId/sourceId/samples/window"],
    ["EVT-064", "queue-fields-equal-response", "status/reason"],
    ["EVT-065", "fields-equal-response", "completeness/confidence/replayCoverageHint"],
    ["EVT-066", "fields-equal-item-readback", "health/failureContext/recheckHint"],
    ["EVT-067", "fields-equal-response", "correctionSignal/reviewSignal/uncertaintyReason/qualityBadge"],
    ["EVT-069", "fields-equal-response", "ruleDraft/evidenceBundle/notification/blockers"],
    ["EVT-071", "fields-equal-response", "sourceCause/closureImpact/correlationSignal"],
    ["EVT-072", "fields-equal-response", "retryCandidate/recoveryChecklist/dryRunStatus/operatorNoteLink"],
    ["EVT-075", "fields-equal-response", "sourceCause/continuityDrillCandidate/commandPlanDraft"],
  ];
  assert(keys.every(([caseId, operator, target]) =>
    responseDerivedDomProjectionContractFor({ caseId, operator, target })),
  "one or more fixed remaining owner contracts are missing");
});

check("diagnostic final operator requires exact response values on one selected-event DOM owner", () => {
  const fixtureId = "evt-065-review4-fixture";
  const base = {
    caseId: "EVT-065",
    operator: "selected-event-equals",
    target: fixtureId,
    fixtureIdentity: fixtureId,
    fixtureCandidates: [fixtureId],
    responseBodies: [{ unifiedResolutionWorkspace: { resolutionQueue: [{
      eventId: fixtureId,
      evidenceQuality: { evidenceCompleteness: "complete" },
    }] } }],
    observation: { count: 1, visibleCount: 1, semanticNodes: [{
      eventId: fixtureId,
      attributes: { completeness: "complete" },
      fields: {},
    }] },
  };
  assert(evaluateResponseDerivedDomFieldProjection(base).pass,
    "selected-event final operator did not compare its response value");
  const ownerOnly = evaluateResponseDerivedDomFieldProjection({
    ...base,
    observation: { count: 1, visibleCount: 1, semanticNodes: [{
      eventId: fixtureId, attributes: {}, fields: {},
    }] },
  });
  assert(!ownerOnly.pass && ownerOnly.failureCode === "RENDERER_PROJECTION_VALUE_MISMATCH",
    "selected-event owner identity passed without the projected value");
  const zero = evaluateResponseDerivedDomFieldProjection({
    ...base, observation: { count: 0, visibleCount: 0, semanticNodes: [] },
  });
  assert(!zero.pass && zero.failureCode === "DOM_PROJECTION_OWNER_MISSING",
    "zero selected-event DOM owners passed");
  const wrongFixture = evaluateResponseDerivedDomFieldProjection({
    ...base,
    observation: { count: 1, visibleCount: 1, semanticNodes: [{
      eventId: "evt-wrong", attributes: { completeness: "complete" }, fields: {},
    }] },
  });
  assert(!wrongFixture.pass && wrongFixture.failureCode === "DOM_PROJECTION_OWNER_MISSING",
    "wrong selected-event DOM fixture passed");
  const split = evaluateResponseDerivedDomFieldProjection({
    ...base,
    observation: { count: 2, visibleCount: 2, semanticNodes: [
      base.observation.semanticNodes[0], structuredClone(base.observation.semanticNodes[0]),
    ] },
  });
  assert(!split.pass && split.failureCode === "DOM_PROJECTION_OWNER_AMBIGUOUS",
    "split selected-event DOM owners passed");
  const drift = evaluateResponseDerivedDomFieldProjection({
    ...base,
    observation: { count: 1, visibleCount: 1, semanticNodes: [{
      eventId: fixtureId, attributes: { completeness: "partial" }, fields: {},
    }] },
  });
  assert(!drift.pass && drift.failureCode === "RENDERER_PROJECTION_VALUE_MISMATCH",
    "selected-event projected value drift passed");
});

check("item readback selection ignores collection duplication but rejects duplicate rows in the authoritative body", () => {
  const fixtureId = "evt-066-review4-fixture";
  const row = {
    eventId: fixtureId,
    sourceReliability: {
      sourceHealthStatus: "failed",
      recentFailureContext: "connect-timeout",
      operatorRecheckHint: "run-source-recheck",
    },
  };
  const observation = { count: 1, visibleCount: 1, semanticNodes: [{
    eventId: fixtureId,
    attributes: {
      health: "failed", failureContext: "connect-timeout", recheckHint: "run-source-recheck",
    },
    fields: {},
  }] };
  const base = {
    caseId: "EVT-066", operator: "fields-equal-item-readback",
    target: "health/failureContext/recheckHint",
    fixtureIdentity: fixtureId, fixtureCandidates: [fixtureId], observation,
  };
  const body = rows => ({ unifiedResolutionWorkspace: { resolutionQueue: rows } });
  assert(evaluateResponseDerivedDomFieldProjection({
    ...base, responseBodies: [body([row]), body([structuredClone(row)])],
  }).pass, "authoritative item readback was ambiguous with the earlier collection response");
  const duplicate = evaluateResponseDerivedDomFieldProjection({
    ...base, responseBodies: [body([row]), body([row, structuredClone(row)])],
  });
  assert(!duplicate.pass && duplicate.failureCode === "RESPONSE_FIELD_OWNER_AMBIGUOUS",
    "duplicate fixture rows inside the authoritative item response passed");
});

check("event review descendant binding requires one visible identity row and one canonical card", () => {
  const assertion = {
    operator: "contains-descendant",
    target: "[data-testid=ops-vlm-event-review-card]",
    expected: true,
  };
  const selector = assertion.target;
  const valid = {
    rootCount: 1,
    visibleRootCount: 1,
    descendants: [selector],
    descendantMatches: [{ selector, count: 1, visibleCount: 1, ownerNodeCount: 1 }],
  };
  assert(evaluateEventExactDomAssertion({
    caseId: "EVT-019",
    assertion,
    observation: valid,
    context: {},
  }).pass, "canonical event review row/card binding failed");

  for (const [label, observation] of [
    ["stale-wrapper", { ...valid, descendants: [], descendantMatches: [] }],
    ["row-without-identity", { ...valid, rootCount: 0, visibleRootCount: 0 }],
    ["duplicate-row", { ...valid, rootCount: 2, visibleRootCount: 2,
      descendantMatches: [{ selector, count: 2, visibleCount: 2, ownerNodeCount: 2 }] }],
    ["duplicate-card", { ...valid,
      descendantMatches: [{ selector, count: 2, visibleCount: 2, ownerNodeCount: 1 }] }],
    ["hidden-card", { ...valid,
      descendantMatches: [{ selector, count: 1, visibleCount: 0, ownerNodeCount: 1 }] }],
  ]) {
    assert(!evaluateEventExactDomAssertion({
      caseId: "EVT-019",
      assertion,
      observation,
      context: {},
    }).pass, `${label} event review descendant passed`);
  }
});

check("visible control evaluator binds both selector presence and semantic action", () => {
  const spec = eventExactOracleFor("EVT-021");
  const selector = "[data-event-review-row][data-event-id=fixture] [data-event-review-save]";
  const pass = evaluateEventExactVisibleControl({ spec, observations: [{ selector, exists: true, visible: true, action: "persisted-mutation" }], context: { fixtureId: "fixture", templateValues: { fixtureId: "fixture" } } });
  assert(pass.every(item => item.pass), "valid visible control/action failed");
  const wrong = evaluateEventExactVisibleControl({ spec, observations: [{ selector, exists: true, visible: true, action: "read-only-state" }], context: { fixtureId: "fixture", templateValues: { fixtureId: "fixture" } } });
  assert(wrong.some(item => item.kind === "visible-control-action" && !item.pass), "wrong visible control action passed");
});

check("forbidden network evaluator rejects matching mutations", () => {
  const spec = eventExactOracleFor("EVT-021");
  assert(evaluateEventExactForbiddenNetwork({ spec, network: [] }).every(item => item.pass), "empty network was rejected");
  const results = evaluateEventExactForbiddenNetwork({ spec, network: [{ method: "POST", path: "/client/api/views" }] });
  assert(results.some(item => !item.pass && item.actual?.path === "/client/api/views"), "forbidden client mutation passed");
});

check("state and cleanup evaluator requires byte hashes and named cleanup evidence", () => {
  const spec = {
    stateSnapshots: [{ scope: "ops-review", policy: "restore", before: true, after: true }],
    cleanup: { assertions: ["review-jsonl-restored"] },
  };
  const pass = evaluateEventExactStateAndCleanup({ spec, snapshots: { "ops-review": { beforeHash: "a", afterHash: "b", restoredHash: "a" } }, cleanupEvidence: { "review-jsonl-restored": true } });
  assert(pass.every(item => item.pass), "valid restore evidence failed");
  const fail = evaluateEventExactStateAndCleanup({ spec, snapshots: { "ops-review": { beforeHash: "a", restoredHash: "b" } }, cleanupEvidence: {} });
  assert(fail.filter(item => !item.pass).length === 2, "missing restore/cleanup evidence passed");
});

check("all 49 plans account for every declared response and DOM assertion", () => {
  for (const id of eventExactOracleCaseIds()) {
    const spec = eventExactOracleFor(id);
    const plan = createEventExactOracleEvaluationPlan(id);
    assert(plan.responseAssertionCount === spec.requests.flatMap(item => item.assertions).length, `${id} response assertion omitted from plan`);
    assert(plan.domAssertionCount === spec.dom.flatMap(item => item.assertions).length, `${id} DOM assertion omitted from plan`);
    assert(plan.requestCount === spec.requests.length && plan.domTargetCount === spec.dom.length, `${id} target count drift`);
    assert(new Set(plan.semanticEvidenceKeys).size === plan.semanticEvidenceKeys.length, `${id} duplicate semantic evidence key`);
  }
});

check("semantic evidence keys are deterministic and reject incomplete identities", () => {
  assert(eventExactSemanticEvidenceKey({ scope: "response", caseId: "EVT-030", operator: "contains-matching-and-missing", subject: "records" }) ===
    "response:EVT-030:contains-matching-and-missing:records", "semantic key mismatch");
  let message = "";
  try { eventExactSemanticEvidenceKey({ scope: "runtime", caseId: "EVT-030", operator: "x", subject: "y" }); } catch (error) { message = String(error?.message || error); }
  assert(message.includes("unsupported semantic evidence scope"), "invalid semantic key scope passed");
});

check("runtime binding contract accepts a complete representative EVT context", () => {
  const caseId = "EVT-019";
  const semanticEvidence = Object.fromEntries(
    createEventExactOracleEvaluationPlan(caseId).semanticEvidenceKeys.map(key =>
      [key, { pass: true, actual: key.startsWith("response:") ? [] : {
        selector: "[data-event-review-row]",
        exists: true,
        visible: true,
        text: "fixture",
      } }]),
  );
  const requirements = assertEventExactRuntimeBindings(caseId, {
    seedByPath: {
      "records[].review.reviewStatus": "reviewing",
      "records[].review.classification": "needs-review",
    },
    requestByPath: {},
    semanticEvidence,
  });
  assert(requirements.seedPaths.includes("records[].review.reviewStatus") &&
    requirements.seedPaths.includes("records[].review.classification") &&
    requirements.semanticEvidenceKeys.length === 1,
  "representative EVT runtime binding requirements drifted");
});

check("runtime binding contract rejects missing seed, request, semantic, and canary evidence", () => {
  for (const [caseId, expected] of [
    ["EVT-019", "seedByPath:records[].review.reviewStatus"],
    ["EVT-070", "requestByPath:unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters"],
    ["EVT-030", "semanticEvidence:response:EVT-030:contains-matching-and-missing:records"],
    ["EVT-031", "sensitiveCanaries"],
  ]) {
    let message = "";
    try {
      assertEventExactRuntimeBindings(caseId, {}, { requireSemanticEvidence: true });
    } catch (error) {
      message = String(error?.message || error);
    }
    assert(message.includes(expected), `${caseId} missing binding did not fail closed: ${expected}`);
  }
});

check("full evaluator fails closed when runtime evidence is incomplete", () => {
  const report = evaluateEventExactOracle({
    caseId: "EVT-001",
    actualRoute: "/ops/dashboard",
    actualRole: "operator",
    exchanges: [],
    domObservations: [],
    network: [],
    snapshots: {},
    cleanupEvidence: {},
    context: { fixtureId: "fixture" },
  });
  assert(!report.pass && report.failureCount > 0, "empty runtime evidence produced PASS");
  let message = "";
  try {
    evaluateEventExactOracle({ caseId: "EVT-001", actualRoute: "/ops/dashboard", actualRole: "operator", context: { fixtureId: "fixture" }, throwOnFailure: true });
  } catch (error) { message = String(error?.message || error); }
  assert(message.includes("exact event oracle failed"), "throwOnFailure did not fail closed");
});

check("capabilities advertise direct evaluation and keyed semantic fail-closed fallback", () => {
  const capabilities = eventExactOracleEvaluatorCapabilities();
  assert(capabilities.directResponseOperators.includes("equals") && capabilities.directResponseOperators.includes("number-gte"), "response capability missing");
  assert(capabilities.directDomOperators.includes("number-equals-response"), "DOM capability missing");
  assert(capabilities.semanticFallback === "required-keyed-evidence-fail-closed", "semantic fallback is not fail-closed");
});

const failures = checks.filter(item => item.status === "FAIL");
for (const item of checks) console.log(`[${item.status.toLowerCase()}] ${item.name}${item.detail ? `: ${item.detail}` : ""}`);
if (failures.length) {
  console.error(`\nV390 exact event oracle evaluator contract FAIL: ${failures.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nV390 exact event oracle evaluator contract PASS: ${checks.length}/${checks.length}`);
