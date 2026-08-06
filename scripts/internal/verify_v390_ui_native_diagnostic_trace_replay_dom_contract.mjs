#!/usr/bin/env node

// 파일 용도: 831e7b48 actual native diagnostic의 DOM 실패 21건을 고정 evidence에서 replay한다.
// actual trace는 raw response/DOM 값을 보존하지 않으므로 SHA/실패 tuple/fixture identity를 고정하고,
// 현재 renderer의 case-local semantic field와 계약 path로 독립 input을 재구성해 실제 evaluator를 호출한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  evaluateEventExactDomAssertion,
  evaluateResponseDerivedDomFieldProjection,
  eventExactSemanticEvidenceKey,
  responseDerivedDomProjectionContractFor,
} from "./v390_ui_exact_event_oracle_evaluator.mjs";
import { eventExactOracleFor } from "./v390_ui_exact_event_oracles.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runId = "v390-ui-diagnostic-20260806080136-31158";
const runRoot = path.join(rootDir, ".media_server.test/v3.9.0/ui-diagnostic-sweep", runId);
const rootSummarySha256 = "7b8ea1763d370d40750994e0a9b32ba7d5f1244ce8f75076a40dc254d0c01397";
const sourceCommit = "831e7b4867c53a4657f4fa0860d673a0ac41af54";

const cases = Object.freeze([
  ["EVT-043", "3930a71d7855d5922726621c99842c076ff0ddf1256854bff2990b61b21a0830", "0f2dba5a93862a1b0c68ebb38b02f02fc1acab00d6125fbfcb0b01675d7d1ed7", "#opsIncidentBriefRows [data-incident-brief-card=evt-043-review4-fixture]", "slot-count-equals", "[data-incident-brief-slot]", "RESPONSE_BASELINE_MISSING"],
  ["EVT-044", "458ec4ff216898b99a9cf686d743e18ffaa8fff450dbc8bc89484b46e5949a4d", "953306abba074c0af39326689ec984533ce1b38585981966f21eafb6547802ff", "#opsSimilarIncidentRows [data-similar-incident-group=evt-044-review4-fixture]", "explanation-terms-equal-response", "explanationTerms", "RESPONSE_FIELD_OWNER_AMBIGUOUS"],
  ["EVT-046", "56c8ab50458672ab88e75d32daa680917e03040e792f7c246ad3212c74cc2a03", "cc1cde2528ff2177800618a246f1bfb5572551159022cdefd8ef8c54a9cbfbac", "#opsVlmSummaryCandidateRows [data-vlm-summary-candidate-event=evt-046-review4-fixture]", "candidate-fields-equal-response", "eventId/score/matchedTerms", "DOM_PROJECTION_OWNER_MISSING"],
  ["EVT-047", "7e6826f9991031c3d3cff8c3a91a8b07875698e51cfb5db73af31ee7ca735949", "3d786153773c0bda645adda72433a12a0a6d9ab3c620ed329fd87f4e049dfaf3", "[data-event-review-row][data-event-id=evt-047-review4-fixture] [data-testid=ops-incident-rule-suggestion-review]", "manual-only", "no-auto-apply", "RESPONSE_BASELINE_MISSING"],
  ["EVT-049", "c04c79c357a9922b1290e790b2dd436c7abae9f889b35b7759c5bb6734c1a4de", "e58cd002da2f7147be22039563ad5ac293a9b8de0446be45b0472bd6167c9207", "#eventRecordRows [data-event-semantic-event-id=evt-049-review4-fixture]", "fields-equal-response", "eventType/scenario/evidence", "RESPONSE_FIELD_OWNER_AMBIGUOUS"],
  ["EVT-050", "a5cd6556cb00f23378930a29631b2858ae1a2ea69f5db09183f30a6a99138a1b", "4405a35bf1f3f7d354456f3a329a12e6d44145d58ba377dd1a69f0bda0bc2a7d", "#opsIncidentTriageBoardRows [data-incident-triage-card=evt-050-review4-fixture]", "filter-result-exact", "lane/priority/sort", "RESPONSE_BASELINE_MISSING"],
  ["EVT-051", "c3cfef3e7237f3a131fc1add9ce2eb61ec86105c25f5cc0fc9c36588bf0e0454", "210f849e13790133c731bd8af5b45a02ccd00569ccbf631c6967cfaad6fe5383", "#opsIncidentDecisionScorecardRows [data-incident-decision-scorecard-event=evt-051-review4-fixture]", "reasons-equal-response", "priorityReasons", "RENDERER_PROJECTION_VALUE_MISMATCH"],
  ["EVT-052", "a6ce8a836d1611ed7fb3d7e030c42618171077f2b23b79df72dd25277c7c9016", "7d9c718faa81cc632b9895b073e843c749cfd70d50b0f03ae5183c0968ebcf2d", "#opsOperationalActionPackRows [data-operational-action-pack-event=evt-052-review4-fixture]", "manual-only", "all-actions", "RESPONSE_BASELINE_MISSING"],
  ["EVT-053", "776b02d74dfe4cc6e90864a3f7cbcaf8a6240fd7dbf941ceb2c898562908de8a", "96af1558739571e4067314868653b1b7b56a675fda79bce64fc58599fd8d9d92", "#opsRuleWhatIfPreviewRows [data-rule-what-if-preview-event=evt-053-review4-fixture]", "manual-only", "no-auto-save-apply", "RESPONSE_BASELINE_MISSING"],
  ["EVT-054", "0325c489d918dd72f804ee08d6605d75fe2c150db493daecd727049ab7c7c3ea", "0d3ff145ca0c16e779a9cf1ff18e20c19fba473b6e123990a02967c2f6b22228", "#opsOperatorOutcomeMemoryRows [data-operator-outcome-memory-event=evt-054-review4-fixture]", "history-hint-equals-response", "deterministicHistoryHint", "RESPONSE_FIELD_OWNER_AMBIGUOUS"],
  ["EVT-055", "da22207a875dac4b2b5d649fbfab19ebf28c6383d8e38f6a09b9f0afa1f7b58a", "f10781d27727e6e942e8595d874f79affd305d7b78e13218d8d5615ac8d9fbb0", "#opsIncidentActionReadinessQueueRows [data-incident-action-readiness-event=evt-055-review4-fixture]", "not-run-not-styled-pass", "not-run", "RESPONSE_BASELINE_MISSING"],
  ["EVT-057", "e36a2d6f9c681a0dcd976f0ff607911a5f024a51f591c589f0a532994fae5f76", "a51746110d44466c715819ddd01af1a68a2a9f26ed2ef84c0e6408ffe140e9f5", "#opsEvidenceIntakeFieldReadinessRows [data-evidence-intake-field-event=evt-057-review4-fixture]", "not-contains-seed-credential-canary", "credentialCanary", "RESPONSE_BASELINE_MISSING"],
  ["EVT-058", "b7effa93a4230d845923a3e0bfae92db3cb3f86f1981c645c27455922dcbda4e", "923aea3d453258c82ea89689873f9f7adbfe34e3a084a8ae282f6a7bdb5503af", "#opsRuntimeEvidenceWindowRows [data-runtime-evidence-event=evt-058-review4-fixture]", "history-bounded", "sampleLimit", "RESPONSE_BASELINE_MISMATCH"],
  ["EVT-064", "02038187b6bbd12e11aa00fcb9d33d4dbd9587339ed51d5f0fa25598fb1cbe5f", "c7d9442d6ad23cdc739794e2e946e4a7f91efc05ec0a960b416b254ce3f5e444", "#opsV320ResolutionDetail [data-v320-resolution-detail=evt-064-review4-fixture]", "detail-sections-equal-response", "detailSections", "RESPONSE_FIELD_OWNER_AMBIGUOUS"],
  ["EVT-065", "8e5ed02a9d7c6716e3125ab5f1687585517d5761017259bea4c5ed80a7de099b", "97f9b45da15d61abc5bad705818b80d9170fc42dda2bb78351186e71c8941c5d", "[data-v320-resolution-detail=evt-065-review4-fixture] #v320EvidenceQualityGrid", "selected-event-equals", "evt-065-review4-fixture", "DOM_FIXTURE_IDENTITY_NOT_OBSERVED"],
  ["EVT-066", "a34f5a5cd90e5ccbc70135fd3335e61a643cb9a05b1ebde3db8d6f82be6be5c1", "57d25b8d0c3b50f789e3d2020757d71814d15e33657c0b45218b410f1ddb1f7a", "[data-v320-resolution-detail=evt-066-review4-fixture] #v320SourceReliabilityGrid", "fields-equal-item-readback", "health/failureContext/recheckHint", "RESPONSE_FIELD_OWNER_AMBIGUOUS"],
  ["EVT-067", "d82b8cc00de5188bb13df6ba082d868be40505c6b040a784c6a0d8173728117b", "eb94422491f15d1cf4de74bd9cdb36df732577ab679ea63fda4cb061539ba80f", "[data-v320-resolution-detail=evt-067-review4-fixture] #v320AiReviewQualityGrid", "selected-event-equals", "evt-067-review4-fixture", "DOM_FIXTURE_IDENTITY_NOT_OBSERVED"],
  ["EVT-069", "bb27af1825e72e4aa066e23fc4e5eb8c05682150c1a36c50e8167336193f0e67", "d31e181683dd7e4553639241a82806fe65d8f2588cbb0738848e9d70723aeac0", "[data-v320-resolution-detail=evt-069-review4-fixture] #v320ActionReadinessChecklistGrid", "selected-event-equals", "evt-069-review4-fixture", "DOM_FIXTURE_IDENTITY_NOT_OBSERVED"],
  ["EVT-071", "d1c73cf5316342baf9e342a57963187a2a386cd2d45c565a50cad45d328f294f", "b6aef401d6d7ca8a66283521acec543bdf2effa56286258be2adc74b53beeef0", "[data-v320-resolution-detail=evt-071-review4-fixture] #v330IncidentSourceCorrelationGrid", "selected-event-equals", "evt-071-review4-fixture", "DOM_FIXTURE_IDENTITY_NOT_OBSERVED"],
  ["EVT-072", "b3f643b617ee02b415dae0b058540328b6821a8d19cb8b7d08b5f32c0d088b83", "bf7a177fdf73611b4fab8b8773eeda999d251c37a76114b104daebe786eaa506", "[data-v320-resolution-detail=evt-072-review4-fixture] #v330OperatorRecheckRecoveryQueueGrid", "healthy-source-absent", "healthySource", "RESPONSE_BASELINE_MISSING"],
  ["EVT-075", "3bbddf658b03c4d6724ae1a9956e9250d63db7759eb8984f24e5a277f3b223cf", "7e07897eee8a17972c56c6bdde6eb4f903721405307cdbdc7d30ee346b11e00e", "[data-v320-resolution-detail=evt-075-review4-fixture] #v350IncidentCommandHandoffGrid", "read-only", "no-action-control", "RESPONSE_BASELINE_MISSING"],
]);

const closureValues = Object.freeze({
  "EVT-043": { action: "enter" },
  "EVT-044": { explanationTerms: "same-source" },
  "EVT-046": { eventId: "$identity", score: "0.95", matchedTerms: "review4" },
  "EVT-047": { autoRuleApplied: false, ruleRegistryWritePerformed: false },
  "EVT-049": { eventType: "re-entry", scenario: "zone-b-entry",
    evidenceState: { snapshotPath: "snapshot.jpg", clipPath: "clip.json" } },
  "EVT-050": { lane: "needs-triage", priority: "urgent", sortRank: 90 },
  "EVT-051": { priorityReasons: "event-record:active" },
  "EVT-052": { ruleRegistryWritePerformed: false, externalDeliveryPerformed: false,
    sourceHealthWritePerformed: false },
  "EVT-053": { manualSaveRequired: true, ruleRegistryWritePerformed: false },
  "EVT-054": { deterministicHistoryHint: "review-needed-after-dismiss" },
  "EVT-055": { readinessStatus: "not-run", passStyled: "not-run" },
  "EVT-057": { evidenceIntakeStatus: "blocked" },
  "EVT-058": { sampleCount: 1, sampleLimit: 12 },
  "EVT-064": { detailSections: "event-record" },
  "EVT-065": { completeness: "complete" },
  "EVT-066": { health: "failed", failureContext: "connect-timeout", recheckHint: "run-source-recheck" },
  "EVT-067": { qualityBadge: "operator-checked" },
  "EVT-069": { ruleDraft: "manual-draft-required" },
  "EVT-071": { sourceCause: "source-connectivity" },
  "EVT-072": { failedOnlyRecheck: true },
  "EVT-075": { commandPlanExecuted: false },
});

const rendererFunctionByCase = Object.freeze({
  "EVT-043": "renderExplainableIncidentBrief", "EVT-044": "renderSimilarIncidentLookup",
  "EVT-046": "renderVlmSummaryCandidateReview", "EVT-047": "renderIncidentRuleSuggestionReview",
  "EVT-049": "renderEventRows", "EVT-050": "renderIncidentTriageBoard",
  "EVT-051": "renderIncidentDecisionScorecard", "EVT-052": "renderOperationalActionPack",
  "EVT-053": "renderRuleWhatIfPreview", "EVT-054": "renderOperatorOutcomeMemory",
  "EVT-055": "renderIncidentActionReadinessQueue", "EVT-057": "renderEvidenceIntakeFieldReadiness",
  "EVT-058": "renderRuntimeEvidenceWindow", "EVT-064": "renderV320UnifiedOpsEventsWorkspace",
  "EVT-065": "renderV320EvidenceQualityLayer", "EVT-066": "renderV320SourceReliabilityContext",
  "EVT-067": "renderV320AiReviewQualityContext", "EVT-069": "renderV320ActionReadinessChecklist",
  "EVT-071": "renderV330IncidentSourceCorrelationLayer", "EVT-072": "renderV330OperatorRecheckRecoveryQueue",
  "EVT-075": "renderV350IncidentCommandHandoff",
});

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function setProjectionPath(root, projectionPath, value) {
  const segments = String(projectionPath).split(".").filter(Boolean);
  let owner = root;
  segments.forEach((segment, index) => {
    const array = segment.endsWith("[]");
    const key = array ? segment.slice(0, -2) : segment;
    const last = index === segments.length - 1;
    if (last) {
      owner[key] = array ? [value] : value;
      return;
    }
    if (array) {
      if (!Array.isArray(owner[key])) owner[key] = [{}];
      owner = owner[key][0];
    } else {
      if (!owner[key] || typeof owner[key] !== "object" || Array.isArray(owner[key])) owner[key] = {};
      owner = owner[key];
    }
  });
}

function materializedFixtureId(caseId) {
  return `evt-${caseId.slice(4).toLowerCase()}-review4-fixture`;
}

function responseAndObservationFor(caseId, contract, fixtureId, valueDrift = false) {
  const row = {};
  for (const identityPath of contract.identityPaths) setProjectionPath(row, identityPath, fixtureId);
  const attributes = {};
  const fields = {};
  for (const [
    responsePath, domKey, source = "attribute", transform = "identity", options = {},
  ] of contract.fields) {
    const configured = closureValues[caseId]?.[domKey];
    const responseValue = responsePath === "$identity"
      ? fixtureId
      : (configured === undefined ? `${caseId.toLowerCase()}-${domKey}` : configured);
    if (!responsePath.startsWith("$")) {
      if (transform === "evidence-state") {
        for (const path of responsePath.split("|")) {
          setProjectionPath(row, path, responseValue?.[path] || "");
        }
      } else {
        setProjectionPath(row, responsePath, responseValue);
      }
    }
    const projected = transform === "bounded-collection-count"
      ? "1"
      : (transform === "limit"
        ? String(options.limit)
        : (transform === "pass-style"
      ? (String(responseValue) === "ready" ? "true" : "false")
      : (transform === "evidence-state"
        ? (responseValue?.snapshotPath && responseValue?.clipPath
          ? "snapshot+clip"
          : (responseValue?.snapshotPath ? "snapshot-only" : (responseValue?.clipPath ? "clip-only" : "none")))
        : String(responseValue))));
    const actual = valueDrift ? `${projected}-drift` : projected;
    if (source === "field-text") fields[domKey] = [actual];
    else if (source !== "identity") attributes[domKey] = actual;
  }
  const responseBody = {};
  setProjectionPath(responseBody, contract.collectionPath, row);
  // collectionPath 자체는 collection이므로 마지막 owner를 배열로 감싼다.
  const collectionSegments = contract.collectionPath.split(".");
  let collectionOwner = responseBody;
  for (let index = 0; index < collectionSegments.length - 1; index += 1) {
    collectionOwner = collectionOwner[collectionSegments[index]];
  }
  const collectionKey = collectionSegments.at(-1);
  collectionOwner[collectionKey] = [collectionOwner[collectionKey]];
  return {
    responseBody,
    observation: {
      count: 1,
      visibleCount: 1,
      semanticNodes: [{ eventId: fixtureId, attributes, fields }],
    },
  };
}

function rendererAttributeName(domKey) {
  return `data-event-semantic-${String(domKey).replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;
}

function driftOneProjectedField(observation, [responsePath, domKey, source = "attribute"]) {
  const drifted = structuredClone(observation);
  const node = drifted.semanticNodes[0];
  if (source === "identity" || responsePath === "$identity") {
    node.eventId = `${node.eventId}-drift`;
  } else if (source === "field-text") {
    node.fields[domKey][0] = `${node.fields[domKey][0]}-drift`;
  } else {
    node.attributes[domKey] = `${node.attributes[domKey]}-drift`;
  }
  return drifted;
}

function rendererFunctionSource(functionName) {
  const start = rendererSource.indexOf(`function ${functionName}(`);
  assert(start >= 0, `renderer function is missing: ${functionName}`);
  const end = rendererSource.indexOf("\n      function ", start + 1);
  return rendererSource.slice(start, end >= 0 ? end : rendererSource.length);
}

const rootSummaryPath = path.join(runRoot, "summary.json");
assert(sha256File(rootSummaryPath) === rootSummarySha256, "actual root summary SHA-256 drifted");
const rootSummary = readJson(rootSummaryPath);
assert(rootSummary.schema === "media-server.v390-ui-diagnostic-sweep.v1", "actual root summary schema drifted");
assert(rootSummary.result === "FAIL" && rootSummary.counts?.fail === 33, "actual root failure baseline drifted");
assert(rootSummary.sourceBinding?.gitCommit === sourceCommit, "actual root source commit drifted");
assert(rootSummary.sourceBinding?.runId === runId, "actual root run identity drifted");
const rendererSource = fs.readFileSync(
  path.join(rootDir, "src/ingress/product_ui_page_scripts.cpp"), "utf8");
for (const gridId of [
  "v320EvidenceQualityGrid", "v320AiReviewQualityGrid",
  "v320ActionReadinessChecklistGrid", "v330IncidentSourceCorrelationGrid",
]) {
  assert(new RegExp(`id=\\"${gridId}\\"[^>]+data-event-semantic-event-id`).test(rendererSource),
    `${gridId} does not share the selected detail event identity`);
}
assert(rendererSource.includes("if (!q && candidates.length === 0)"),
  "query-less VLM response candidates are still suppressed by the renderer");
assert(rendererSource.includes("dashboardRuntimeTrendSamples = items.slice(-12)"),
  "runtime evidence window does not expose its bounded page-session samples");

const failures = [];
let actualRedCount = 0;
let evaluatorGreenCount = 0;
const negativeCounts = { zero: 0, duplicate: 0, wrongFixture: 0, split: 0, fieldDrift: 0, ownerOnly: 0 };
for (const [caseId, summarySha, traceSha, selector, operator, target, failureCode] of cases) {
  const summaryPath = path.join(runRoot, "cases", caseId, "summary.json");
  const tracePath = path.join(runRoot, "cases", caseId, "traces", `${caseId}.trace.json`);
  try {
    assert(sha256File(summaryPath) === summarySha, `${caseId} actual case summary SHA-256 drifted`);
    assert(sha256File(tracePath) === traceSha, `${caseId} actual trace SHA-256 drifted`);
    const summary = readJson(summaryPath);
    const trace = readJson(tracePath);
    assert(summary.case?.caseId === caseId && summary.case?.status === "FAIL", `${caseId} actual case status drifted`);
    assert(summary.case?.failureClass === "dom-semantic-assertion-failed", `${caseId} actual failure class drifted`);
    assert(summary.case?.actualBrowserExecution === true, `${caseId} is not actual browser evidence`);
    assert(trace.schema === "media-server.v390-ui-native-interaction-trace.v2", `${caseId} trace schema drifted`);
    assert(trace.caseId === caseId && trace.featureId === caseId, `${caseId} trace identity drifted`);
    assert(trace.dispatch === "playwright-native", `${caseId} trace dispatch drifted`);
    assert(trace.expectedResults?.length === 1, `${caseId} trace expected-result cardinality drifted`);
    assert(Array.isArray(trace.rawPrimaryObservations) && trace.rawPrimaryObservations.length === 0,
      `${caseId} raw observation retention contract drifted`);
    assert(!Object.prototype.hasOwnProperty.call(trace, "responseBodies"),
      `${caseId} unexpectedly retained raw response bodies`);
    assert(summary.case?.diagnosticArtifacts?.trace?.sha256 === traceSha, `${caseId} trace attestation drifted`);
    assert(summary.case?.failureDetail?.startsWith(
      `${caseId} exact DOM semantic assertion failed ${selector}: ${operator}/${target}`,
    ), `${caseId} actual selector/operator/target drifted`);
    assert(summary.case?.eventDomSemanticEvidence?.causeCodes?.includes(failureCode),
      `${caseId} actual failure code drifted`);
    assert(summary.case?.eventDomSemanticEvidence?.pass === false,
      `${caseId} actual evaluator RED evidence drifted`);
    actualRedCount += 1;
    const spec = eventExactOracleFor(caseId);
    const assertion = spec.dom.flatMap(item => item.assertions.map(value => ({ selector: item.selector, value })))
      .find(item => item.value.operator === operator &&
        String(item.value.target).replaceAll("{fixtureId}", `evt-${caseId.slice(4).toLowerCase()}-review4-fixture`) === target);
    assert(assertion, `${caseId} actual final operator is absent from the current oracle`);
    const contract = responseDerivedDomProjectionContractFor({ caseId, operator, target });
    assert(contract, `${caseId} actual final operator closure is missing`);
    const materializedContractSelector = String(contract.selector || "").replaceAll(
      "{fixtureId}", `evt-${caseId.slice(4).toLowerCase()}-review4-fixture`);
    assert(materializedContractSelector === selector, `${caseId} actual final operator selector drifted`);
    assert(Array.isArray(contract.fields) && contract.fields.length > 0 &&
      contract.fields.some(([responsePath]) => responsePath !== "$identity"),
    `${caseId} owner-only closure has no response-derived final value`);
    if (caseId === "EVT-049") {
      assert(contract.fields.length === 3 &&
        contract.fields.map(([, domKey]) => domKey).join("/") === "eventType/scenario/evidenceState",
      "EVT-049 final target does not bind eventType/scenario/evidence on one owner");
    }
    const rendererFunction = rendererFunctionSource(rendererFunctionByCase[caseId]);
    for (const [, domKey, source = "attribute"] of contract.fields) {
      if (source === "identity") continue;
      const rendererToken = source === "field-text"
        ? `data-event-semantic-field="${domKey}"`
        : rendererAttributeName(domKey);
      const dynamicIncidentBriefSlot = caseId === "EVT-043" && domKey === "action" &&
        rendererFunction.includes("data-event-semantic-field=\"${escapeHtml(slot?.key || '')}\"") &&
        rendererFunction.includes("const slotKeys = ['actionSlot', 'objectSlot', 'contextSlot', 'environmentSlot']");
      assert(rendererFunction.includes(rendererToken) || dynamicIncidentBriefSlot,
        `${caseId} renderer field is missing: ${rendererToken}`);
    }

    const fixtureId = materializedFixtureId(caseId);
    const replay = responseAndObservationFor(caseId, contract, fixtureId);
    const responseBodies = contract.responseBodySelection === "last"
      ? [responseAndObservationFor(caseId, contract, fixtureId, true).responseBody, replay.responseBody]
      : [replay.responseBody];
    const evaluationArgs = {
      caseId, operator, target, responseBodies,
      observation: replay.observation,
      fixtureCandidates: [fixtureId], fixtureIdentity: fixtureId,
    };
    const projection = evaluateResponseDerivedDomFieldProjection(evaluationArgs);
    assert(projection.pass === true && projection.matchedFieldCount === contract.fields.length,
      `${caseId} response-derived final projection did not PASS: ${projection.failureCode}`);

    const semanticObservation = {
      selector, exists: true, visible: true,
      text: `${fixtureId} redacted renderer projection`,
      attributes: [{
        "data-event-semantic-event-id": fixtureId,
        "data-event-semantic-slot-count": "4",
        ...Object.fromEntries(Object.entries(replay.observation.semanticNodes[0].attributes)
          .map(([key, value]) => [rendererAttributeName(key), value])),
      }],
      rootCount: 1, visibleRootCount: 1,
    };
    const evidenceKey = eventExactSemanticEvidenceKey({ scope: "dom", caseId, operator, subject: target });
    const finalOperator = evaluateEventExactDomAssertion({
      caseId,
      assertion: { ...assertion.value, target },
      observation: semanticObservation,
      context: {
        fixtureId,
        templateValues: { fixtureId },
        seed: { credentialCanary: "credential-canary-must-not-render" },
        sensitiveCanaries: ["credential-canary-must-not-render"],
        semanticEvidence: {
          [evidenceKey]: { pass: projection.pass, actual: semanticObservation },
        },
      },
    });
    assert(finalOperator.pass === true,
      `${caseId} final assertion operator did not PASS: ${finalOperator.reason}`);
    evaluatorGreenCount += 1;

    const assertNegative = (name, result) => {
      assert(result.pass === false, `${caseId} ${name} negative mutation passed`);
      negativeCounts[name] += 1;
    };
    assertNegative("zero", evaluateResponseDerivedDomFieldProjection({
      ...evaluationArgs, observation: { count: 0, visibleCount: 0, semanticNodes: [] },
    }));
    const duplicateBody = structuredClone(replay.responseBody);
    let duplicateCollection = duplicateBody;
    for (const segment of contract.collectionPath.split(".")) duplicateCollection = duplicateCollection[segment];
    duplicateCollection.push(structuredClone(duplicateCollection[0]));
    assertNegative("duplicate", evaluateResponseDerivedDomFieldProjection({
      ...evaluationArgs,
      responseBodies: contract.responseBodySelection === "last"
        ? [responseBodies[0], duplicateBody] : [duplicateBody],
    }));
    assertNegative("wrongFixture", evaluateResponseDerivedDomFieldProjection({
      ...evaluationArgs,
      observation: { ...replay.observation, semanticNodes: [{
        ...replay.observation.semanticNodes[0], eventId: `${fixtureId}-wrong`,
      }] },
    }));
    assertNegative("split", evaluateResponseDerivedDomFieldProjection({
      ...evaluationArgs,
      observation: { count: 2, visibleCount: 2, semanticNodes: [
        replay.observation.semanticNodes[0], structuredClone(replay.observation.semanticNodes[0]),
      ] },
    }));
    for (const field of contract.fields) {
      const drift = evaluateResponseDerivedDomFieldProjection({
        ...evaluationArgs,
        observation: driftOneProjectedField(replay.observation, field),
      });
      assert(drift.pass === false,
        `${caseId} isolated ${field[1]} field drift passed`);
    }
    negativeCounts.fieldDrift += 1;
    if (caseId === "EVT-058") {
      const limitExceededObservation = structuredClone(replay.observation);
      limitExceededObservation.semanticNodes[0].attributes.sampleCount = "13";
      const limitExceededProjection = evaluateResponseDerivedDomFieldProjection({
        ...evaluationArgs, observation: limitExceededObservation,
      });
      assert(limitExceededProjection.pass === false,
        "EVT-058 sample count above the declared limit passed projection");
      const limitExceededOperator = evaluateEventExactDomAssertion({
        caseId,
        assertion: { ...assertion.value, target },
        observation: {
          ...semanticObservation,
          attributes: [{
            ...semanticObservation.attributes[0],
            "data-event-semantic-sample-count": "13",
          }],
        },
        context: { fixtureId, templateValues: { fixtureId } },
      });
      assert(limitExceededOperator.pass === false,
        "EVT-058 history-bounded operator accepted count 13 over limit 12");
    }
    assertNegative("ownerOnly", evaluateResponseDerivedDomFieldProjection({
      ...evaluationArgs,
      observation: { count: 1, visibleCount: 1,
        semanticNodes: [{ eventId: fixtureId, attributes: {}, fields: {} }] },
    }));
  } catch (error) {
    failures.push(`${caseId}: ${String(error?.message || error)}`);
  }
}

if (failures.length > 0) {
  console.error(`v390 UI native diagnostic DOM trace replay: FAIL (${evaluatorGreenCount}/${cases.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

assert(actualRedCount === cases.length, "actual evaluator RED evidence did not cover all 21 cases");
assert(evaluatorGreenCount === cases.length, "current evaluator GREEN did not cover all 21 cases");
assert(Object.values(negativeCounts).every(count => count === cases.length),
  `negative evaluator replay incomplete: ${JSON.stringify(negativeCounts)}`);
console.log(`v390 UI native diagnostic DOM trace replay: actual RED 0/${actualRedCount}; evaluator GREEN ${evaluatorGreenCount}/${cases.length}`);
console.log(`v390 UI native diagnostic DOM negative replay: PASS ${Object.entries(negativeCounts).map(([key, count]) => `${key}=${count}/${cases.length}`).join(" ")}`);
